// Modificare i campi di un blocco, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del
// build).
//
// Il modello si legge dall'ALBERO DELL'ACCESSIBILITÀ (il nome di un blocco porta il suo contenuto) e, per
// «va a capo», dal testo disegnato nella forma; i nomi attesi si ricavano qui dal file del riferimento
// (`albero.ts`, rilevatore indipendente dal modulo che costruisce la struttura).
//
// - Campi per genere: un blocco per ognuno dei sette generi della tappa 1, aperto col doppio clic o con
//   Invio, scritto e confermato con Invio, porta il contenuto nuovo nella sequenza e nella posizione di
//   prima; gli operatori scritti in italiano si salvano nella forma del file (passando all'inglese il nome
//   li mostra coi nomi inglesi). Controllo positivo: un blocco non scritto non cambia nome.
// - Invio ed Esc: Esc chiude i campi senza passi, Invio è un passo solo, confermare i campi di prima non è
//   un passo; il fuoco resta nel campo a ogni tasto, e Spazio nel campo è un carattere, non uno spostamento.
//   Confermati i campi con Invio, il fuoco messo subito su un altro blocco resta lì (il fuoco che l'app rimette sul
//   blocco confermato non lo scavalca): Invio apre i campi di quel blocco, dieci giri. Prima della correzione si
//   aprivano quelli del blocco di prima, da 2 a 9 volte su 30 per progetto. La stessa regola senza la sorte: il tasto e
//   il fuoco nello stesso compito, prima del ridisegno, anche sul blocco a cui l'app aveva dato il fuoco prima (Esc).
// - I due modi (riquadro attaccato al blocco, pannello a destra) danno lo stesso albero con le stesse
//   modifiche. Controllo positivo: una modifica diversa dà un albero diverso.
// - Controllo immediato: per ogni progetto con errori statici o avvisi (il caso del corpus che ne ha e due
//   progetti ricavati dal riferimento, perché il corpus non ha casi con un errore statico), la riga di
//   stato mostra esattamente codici e blocchi di `controlla`, appaiati elemento per elemento nei due versi,
//   e i blocchi segnati nel disegno sono esattamente quelli con un errore. Controlli positivi: una voce
//   tolta dall'elenco e una in più fanno rosso; un segno tolto fa rosso.
//
// CHE COSA NON GUARDA:
// - il file salvato (non c'è ancora il salvataggio): lo confronta la prova della costruzione col file atteso;
// - la posizione del riquadro sullo schermo, se non che stia sopra la pagina; nel pannello, che stia a
//   destra del flowchart;
// - il testo dei codici (lo guarda `i18n/codici.test.ts`), solo che l'interfaccia mostri quello del codice;
// - un lettore di schermo vero: qui l'albero dell'accessibilità del motore.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { controlla, tetti } from "../core/controllo/controllo";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Blocco, Funzione, Progetto } from "../core/progetto/modello";
import { causeDeiCodici } from "../core/espressioni/analizzatore";
import { testiDeiCodici, testiDelleCause } from "../i18n/codici";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { albero, bloccoDiNome, doveSta, nomeBlocco, RIFERIMENTO, riferimento, stato } from "./albero";
import { apri, apriEsempio, costruisciFinzione, scegliLingua } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const flowchartDi = (page: Page, nome = RIFERIMENTO) => page.getByRole("group", { name: `${it.flowchart}: ${nome}`, exact: true });
const blocco = bloccoDiNome;
const campo = (page: Page, nome: string) => page.getByRole("textbox", { name: nome, exact: true });
const nella = (page: Page, nome: string) => page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: nome, exact: true });

/** Il blocco del riferimento con quell'`id`. */
function delRiferimento(id: string): Blocco {
  const cerca = (s: readonly Blocco[]): Blocco | undefined => {
    for (const b of s) {
      if (b.id === id) return b;
      const r = b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? (b.body as Blocco[]) : [];
      const x = cerca(r);
      if (x) return x;
    }
    return undefined;
  };
  return cerca(riferimento.body)!;
}

/** Scrive in un campo un carattere alla volta, e conta i tasti dopo i quali il fuoco NON era nel campo. */
async function scriviNel(page: Page, nome: string, testo: string): Promise<number> {
  const c = campo(page, nome);
  await c.fill("");
  let perso = 0;
  for (const carattere of testo) {
    await page.keyboard.type(carattere);
    if (!(await c.evaluate((e) => e === document.activeElement))) perso++;
  }
  return perso;
}

// ------------------------------------------------------------------------------- campi per genere

/** Le sette modifiche, una per genere, sul riferimento: come si apre il blocco, che cosa si scrive, il nome
 * atteso dopo (nell'interfaccia italiana). */
const modifiche = [
  { id: "b6", apri: "doppio clic", scrivi: { [it.campoDestinazione]: "j", [it.campoValore]: "converti_a_intero 2.5" }, nome: "Assegnazione: j ← converti_a_intero 2.5", inglese: "Assignment: j ← to_integer 2.5" },
  { id: "b8", apri: "Invio", scrivi: { [it.campoDestinazione]: "media" }, nome: "Lettura: media", inglese: "Read: media" },
  { id: "b5", apri: "doppio clic", scrivi: { "Valore 1": '"Fuori: "', nuovo: "n" }, nome: 'Scrittura: "Fuori: ", n', inglese: 'Write: "Fuori: ", n' },
  { id: "b12", apri: "Invio", scrivi: { [it.campoCondizione]: "voto <= 5" }, nome: "Se: voto <= 5", inglese: "If: voto <= 5" },
  { id: "b19", apri: "doppio clic", scrivi: { [it.campoCondizione]: "j < lunghezza \"ab\"" }, nome: 'Mentre: j < lunghezza "ab"', inglese: 'While: j < length "ab"' },
  { id: "b2", apri: "Invio", scrivi: { [it.campoCondizione]: "n < 2 or n > 20" }, nome: "Ripeti: n < 2 or n > 20", inglese: "Repeat: n < 2 or n > 20" },
  { id: "b1", apri: "doppio clic", scrivi: { [it.campoTesto]: "Quanti voti, da 2 a 20" }, nome: "Commento: Quanti voti, da 2 a 20", inglese: "Comment: Quanti voti, da 2 a 20" },
] as const;

/** Apre i campi del blocco e scrive; `nuovo` aggiunge un valore a una scrittura. Il fuoco perso, contato. */
async function modificaIl(page: Page, flowchart: Locator, m: (typeof modifiche)[number], conferma = true): Promise<number> {
  const b = blocco(flowchart, nomeBlocco(delRiferimento(m.id)));
  if (m.apri === "doppio clic") await b.dblclick();
  else {
    await b.focus();
    await page.keyboard.press("Enter");
  }
  let perso = 0;
  for (const [nome, testo] of Object.entries(m.scrivi)) {
    if (nome === "nuovo") {
      await page.getByRole("button", { name: it.aggiungiValore, exact: true }).click();
      perso += await scriviNel(page, "Valore 2", testo);
    } else perso += await scriviNel(page, nome, testo);
  }
  if (m.id === "b5") await page.getByRole("checkbox", { name: it.campoACapo, exact: true }).uncheck();
  if (conferma) {
    await campo(page, Object.keys(m.scrivi)[0] === "nuovo" ? "Valore 2" : Object.keys(m.scrivi)[0]!).focus();
    await page.keyboard.press("Enter");
  }
  return perso;
}

test("i campi di un blocco per ognuno dei sette generi, aperti col doppio clic o con Invio e confermati con Invio, cambiano il blocco nel suo posto", async ({ page }, info) => {
  // Si scrive un carattere alla volta, guardando il fuoco a ogni tasto: in WebKit, coi quattro progetti in
  // parallelo, la prova supera i 30 s predefiniti (misurato).
  test.setTimeout(120_000);
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const prima = await albero(flowchart);
  const posti = Object.fromEntries(modifiche.map((m) => [m.id, doveSta(prima, nomeBlocco(delRiferimento(m.id)))]));
  let perso = 0;
  const sbagliati: string[] = [];
  for (const m of modifiche) {
    perso += await modificaIl(page, flowchart, m);
    await expect(page.getByRole("form")).toHaveCount(0);
    const visti = doveSta(await albero(flowchart), m.nome);
    if (JSON.stringify(visti) !== JSON.stringify(posti[m.id])) sbagliati.push(`${m.id} ${m.nome}: ${JSON.stringify(visti)} invece di ${JSON.stringify(posti[m.id])}`);
  }
  // «Va a capo» non è nel nome: si legge dal disegno, dove la scrittura che va a capo ha il segno in coda.
  const scrittura = await flowchart.locator('[data-forma="scrittura"][data-id="b5"] text').textContent();
  console.log(`[${info.project.name}] campi per genere: modifiche ${modifiche.length}, al posto sbagliato ${sbagliati.length}, tasti col fuoco fuori dal campo ${perso}, scrittura disegnata «${scrittura}»`);
  expect(sbagliati, "un blocco scritto non porta il contenuto nuovo nel suo posto").toEqual([]);
  expect(perso, "il fuoco è uscito dal campo mentre si scriveva").toBe(0);
  expect(scrittura, "la scrittura va ancora a capo").not.toContain(it.disegnoACapo.trim());

  // Gli operatori scritti in italiano sono nel modello nella forma del file: in inglese il nome li mostra coi
  // nomi inglesi.
  await scegliLingua(page, "en");
  const inglese = page.getByRole("group", { name: `${en.flowchart}: ${RIFERIMENTO}`, exact: true });
  for (const m of modifiche) await expect(blocco(inglese, m.inglese)).toHaveCount(1);

  // Controllo positivo: un blocco aperto, scritto e chiuso con Esc non cambia nome.
  await scegliLingua(page, "it");
  const b10 = nomeBlocco(delRiferimento("b10"));
  await blocco(flowchart, b10).dblclick();
  await scriviNel(page, it.campoValore, "somma + 2 * voto");
  await page.keyboard.press("Escape");
  expect(doveSta(await albero(flowchart), b10)).toHaveLength(1);
  expect(doveSta(await albero(flowchart), "Assegnazione: somma ← somma + 2 * voto")).toHaveLength(0);
});

// ------------------------------------------------------------------------------- Invio, Esc, fuoco

test("confermati i campi con Invio, il fuoco messo subito su un altro blocco resta lì: Invio apre i campi di quel blocco", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  const primo = blocco(flowchart, nomeBlocco(delRiferimento("b8")));
  const altro = blocco(flowchart, nomeBlocco(delRiferimento("b12")));
  const giri = 10;
  const sbagliati: string[] = [];
  for (let i = 0; i < giri; i++) {
    await primo.focus();
    await page.keyboard.press("Enter");
    const c = page.getByRole("form").getByRole("textbox").first();
    await c.waitFor();
    // Un passo vero (il testo cambia e torna): la conferma rimette il fuoco sul blocco al fotogramma dopo.
    await c.press("End");
    await page.keyboard.type("x");
    await page.keyboard.press("Enter");
    await altro.focus();
    await page.keyboard.press("Enter");
    const aperti = await page.getByRole("form").first().getAttribute("aria-label", { timeout: 5_000 }).catch(() => "nessuno");
    if (aperti !== riempi(it.modificaDelBlocco, { blocco: nomeBlocco(delRiferimento("b12")) })) sbagliati.push(`giro ${i}: aperti i campi di «${aperti}»`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("form")).toHaveCount(0);
    await page.keyboard.press("Control+z");
  }
  console.log(`[${info.project.name}] fuoco dopo la conferma: ${giri} giri, campi del blocco sbagliato ${sbagliati.length}`);
  expect(sbagliati).toEqual([]);
});

test("Invio nei campi e il fuoco su un altro blocco prima che la finestra ridisegni, anche su quello a cui l'app l'aveva dato: il fuoco resta lì", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  // Prima l'altro blocco ha ricevuto il fuoco dall'app (Esc sui suoi campi lo rimette lì): sceglierlo di nuovo dopo è
  // dell'utente, non un fuoco rimasto dalla richiesta di prima.
  await blocco(flowchart, nomeBlocco(delRiferimento("b12"))).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("form").waitFor();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("form")).toHaveCount(0);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-blocco"))).toBe("b12");
  await blocco(flowchart, nomeBlocco(delRiferimento("b8"))).focus();
  await page.keyboard.press("Enter");
  const c = page.getByRole("form").getByRole("textbox").first();
  await c.waitFor();
  await c.press("End");
  await page.keyboard.type("x");
  // Il tasto e il fuoco nello stesso compito: il fuoco cambia prima del ridisegno che chiude i campi (come chi preme
  // Tab o fa clic subito dopo Invio, sulla macchina lenta). Il passo è vero: il testo cambia.
  await c.evaluate((campo) => {
    campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    document.querySelector<SVGGElement>('[data-blocco="b12"]')!.focus();
  });
  await expect(page.getByRole("form")).toHaveCount(0);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-blocco"))).toBe("b12");
});

test("Esc non è un passo, Invio è un passo solo, i campi di prima non sono un passo; il fuoco resta nel campo e Spazio è un carattere", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const iniziale = await stato(flowchart);
  const annullaSpento = () => nella(page, it.annulla).getAttribute("aria-disabled");
  const b17 = nomeBlocco(delRiferimento("b17"));

  // Esc: nessun passo, il fuoco torna sul blocco.
  await blocco(flowchart, b17).dblclick();
  const perso = await scriviNel(page, it.campoValore, "converti_a_reale somma / 3.0");
  await page.keyboard.press("Escape");
  await expect(blocco(flowchart, b17)).toBeFocused();
  expect(await stato(flowchart)).toBe(iniziale);
  expect(await annullaSpento(), "Esc ha lasciato un passo nella cronologia").toBe("true");

  // I campi di prima, confermati: nessun passo.
  await page.keyboard.press("Enter");
  await expect(campo(page, it.campoDestinazione)).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await annullaSpento(), "confermare i campi di prima ha lasciato un passo").toBe("true");

  // Spazio nel campo è un carattere: nessuno spostamento comincia (Esc chiude).
  await blocco(flowchart, b17).focus();
  await page.keyboard.press("Enter");
  const persoConSpazi = await scriviNel(page, it.campoDestinazione, "media ");
  await expect(campo(page, it.campoDestinazione)).toHaveValue("media ");
  await expect(page.locator('output[role="status"]')).toHaveText("");
  await page.keyboard.press("Escape");
  expect(await annullaSpento()).toBe("true");

  // Invio: un passo solo.
  await blocco(flowchart, b17).dblclick();
  await scriviNel(page, it.campoValore, "somma / 2.0");
  await page.keyboard.press("Enter");
  await expect(blocco(flowchart, "Assegnazione: media ← somma / 2.0")).toBeFocused();
  expect(await annullaSpento()).toBe("false");
  await page.keyboard.press("Control+z");
  expect(await stato(flowchart)).toBe(iniziale);
  expect(await annullaSpento(), "Invio ha lasciato più di un passo").toBe("true");
  console.log(`[${info.project.name}] Invio ed Esc: tasti col fuoco fuori dal campo ${perso + persoConSpazi}`);
  expect(perso + persoConSpazi, "il fuoco è uscito dal campo mentre si scriveva").toBe(0);
});

// ------------------------------------------------------------------------------- i due modi

/** Le stesse quattro modifiche nel modo dato; l'albero che ne esce e dove stavano i campi. */
async function nelModo(page: Page, modo: "riquadro" | "pannello", ultima = "voto < 6"): Promise<{ albero: string; campi: { x: number; fixed: boolean }; vista: { x: number; larghezza: number } }> {
  // Il modo viene dalle preferenze, come lo scrivono le Impostazioni.
  await apri(page, { lingua: "it", modoDeiBlocchi: modo });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  for (const m of [modifiche[0], modifiche[2], modifiche[6]]) await modificaIl(page, flowchart, m);
  await blocco(flowchart, nomeBlocco(delRiferimento("b12"))).dblclick();
  const modulo = page.getByRole("form");
  const campi = await modulo.evaluate((f) => ({ x: f.getBoundingClientRect().x, fixed: getComputedStyle(f).position === "fixed" }));
  const r = (await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).boundingBox())!;
  await scriviNel(page, it.campoCondizione, ultima);
  await page.keyboard.press("Enter");
  return { albero: await stato(flowchart), campi, vista: { x: r.x, larghezza: r.width } };
}

test("il riquadro attaccato al blocco e il pannello a destra danno lo stesso albero con le stesse modifiche", async ({ browser }, info) => {
  // Tre aperture della finestra, ognuna con quattro modifiche scritte un carattere alla volta: fino a 35 s in WebKit
  // nella corsa intera, e il limite è quattro volte tanto (la regola di `playwright.config.ts`).
  test.setTimeout(150_000);
  const pagina = async () => (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const riquadro = await nelModo(await pagina(), "riquadro");
  const pannello = await nelModo(await pagina(), "pannello");
  console.log(`[${info.project.name}] due modi: riquadro sopra la pagina ${riquadro.campi.fixed}; pannello a x ${Math.round(pannello.campi.x)}, vista del flowchart fino a x ${Math.round(pannello.vista.x + pannello.vista.larghezza)}`);
  expect(riquadro.campi.fixed).toBe(true);
  expect(pannello.campi.fixed).toBe(false);
  expect(pannello.campi.x).toBeGreaterThanOrEqual(pannello.vista.x + pannello.vista.larghezza);
  expect(pannello.albero, "il riquadro e il pannello danno alberi diversi").toBe(riquadro.albero);
  // Controllo positivo: un'ultima modifica diversa dà un albero diverso.
  const diverso = await nelModo(await pagina(), "pannello", "voto < 5");
  expect(diverso.albero).not.toBe(riquadro.albero);
});

// ------------------------------------------------------------------------------- controllo immediato

const casoDelCorpus = (nome: string): Funzione => {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${nome}.algo`, import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error(`${nome} non si apre`);
  return esito.progetto.functions[0]!;
};

/** Il riferimento con dei campi cambiati, e i dati dati. */
function ricavato(campi: Record<string, Partial<Record<string, unknown>>>, dati?: (d: Funzione["data"]) => Funzione["data"]): Funzione {
  const f = structuredClone(riferimento) as Funzione & { body: Blocco[] };
  const visita = (s: Blocco[]) =>
    s.forEach((b) => {
      if (campi[b.id]) Object.assign(b, campi[b.id]);
      if (b.kind === "if") visita([...b.then, ...b.else] as Blocco[]);
      if ("body" in b) visita(b.body as Blocco[]);
    });
  visita(f.body);
  return dati ? { ...f, data: dati(f.data) } : f;
}

// Gli errori di ogni blocco e della vista dei dati, con gli avvisi dei blocchi che restano; un avviso di
// ruolo che con un errore non si calcola (j è di output e non si scrive).
const conErrori = ricavato(
  {
    b6: { target: "età" },
    b10: { value: "somma + k" },
    b12: { condition: "voto" },
    b13: { value: 'insufficienti + "1"' },
    b17: { value: "somma / contati" },
    b19: { condition: "true" },
    b21: { value: "j + 042" },
    b9: { condition: "1 <= voto <= 10" },
    b23: { values: ['"Nessun voto valido"', "voto / 0"] },
    b15: { value: "i + 1.5" },
  },
  (d) => [...d.map((x) => (x.name === "j" ? { ...x, role: "output" as const } : x)), { name: "while", type: "integer" }],
);
// Gli avvisi dei ruoli, senza errori: i è di input e non si legge, j si scrive senza ruolo.
const conRuoli = ricavato({ b20: { values: ['"*"', "j"] } }, (d) => d.map((x) => (x.name === "i" ? { ...x, role: "input" as const } : x)));

const progettiConSegnalazioni = [
  { nome: "divisione-intera-in-reale", titolo: "corpus: divisione-intera-in-reale", funzione: casoDelCorpus("divisione-intera-in-reale") },
  { nome: "riferimento-con-errori", titolo: "riferimento con errori", funzione: conErrori },
  { nome: "riferimento-con-ruoli", titolo: "riferimento con avvisi dei ruoli", funzione: conRuoli },
];

/** Errori e avvisi attesi, da `controlla`, coi nomi dei blocchi camminati qui. */
function attesi(f: Funzione): string[] {
  const p: Progetto = { format: "algodesign", schema_version: 2, metadata: { name: "x" }, functions: [f] };
  const c = controlla(p, tetti);
  if (c.fuoriTappa) throw new Error("fuori tappa");
  const blocchi = new Map<string, Blocco>();
  const visita = (b: Blocco): void => {
    blocchi.set(b.id, b);
    if (b.kind === "if") [...b.then, ...b.else].forEach(visita);
    if ("body" in b) (b.body as Blocco[]).forEach(visita);
  };
  f.body.forEach(visita);
  // Le segnalazioni dei dati, una per dato col nome del dato; quelle della funzione non lo dicono e non si
  // ripetono.
  const delDato = (s: (typeof c.dati)[number]) => `${s.genere} ${s.code} ${riempi(it.voceDelDato, { tabella: it.dati, nome: f.data[s.indice]!.name })}`;
  const deiBlocchi = (genere: string, s: readonly { code: string; block: string }[]) => s.filter((x) => blocchi.has(x.block)).map((x) => `${genere} ${x.code} ${nomeBlocco(blocchi.get(x.block)!)}`);
  return [...c.dati.map(delDato), ...deiBlocchi("errore", c.errori), ...deiBlocchi("avviso", c.avvisi)].sort();
}
const delDato = (v: string) => v.split(" ").slice(2).join(" ").startsWith(`${it.dati}: `);

/** Le voci dell'elenco come le mostra l'interfaccia, riportate al codice col testo del codice. */
function letto(voci: readonly string[]): string[] {
  const testi = Object.entries(testiDeiCodici.it);
  // Una causa precisa dice il suo codice: la sua frase breve, col pezzo di testo citato al posto di `{segno}`.
  const cause = Object.entries(causeDeiCodici).flatMap(([codice, elenco]) =>
    elenco.map((causa) => [codice, new RegExp(`: ${testiDelleCause.it[causa].breve.replace(/[.*+?^$()[\]\\|]/g, "\\$&").replace("{segno}", ".+")}$`)] as const),
  );
  return voci
    .map((v) => {
      const c = testi.find(([, t]) => v.endsWith(`: ${t.breve}`)) ?? cause.find(([, r]) => r.test(v));
      const m = v.match(/^(Errore|Avviso) in «(.*)»: /);
      return c && m ? `${m[1] === "Errore" ? "errore" : "avviso"} ${c[0]} ${m[2]}` : `illeggibile: ${v}`;
    })
    .sort();
}

/** Appaia due elenchi nei due versi (con le ripetizioni): voci senza segnalazione e segnalazioni senza voce. */
function appaia(visti: readonly string[], voluti: readonly string[]): { inPiu: string[]; mancanti: string[] } {
  const resto = [...voluti];
  const inPiu: string[] = [];
  for (const v of visti) {
    const i = resto.indexOf(v);
    if (i < 0) inPiu.push(v);
    else resto.splice(i, 1);
  }
  return { inPiu, mancanti: resto };
}

test("la riga di stato mostra esattamente errori e avvisi di «controlla», coi loro blocchi, e il disegno segna i blocchi con un errore", async ({ page }, info) => {
  // Premessa: i testi brevi sono distinti, quindi un testo dice il suo codice.
  const brevi = Object.values(testiDeiCodici.it).map((t) => t.breve);
  expect(new Set(brevi).size).toBe(brevi.length);
  await apri(page, { lingua: "it" }, undefined, progettiConSegnalazioni);
  const elenco = page.getByRole("list", { name: it.elencoDelControllo, exact: true });
  const riga = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  let [voci, segni] = [0, 0];
  const codici = new Set<string>();
  for (const [i, p] of progettiConSegnalazioni.entries()) {
    if (i > 0) await apriEsempio(page, i);
    const flowchart = flowchartDi(page, p.nome);
    await expect(flowchart).toBeVisible();
    // Senza voci il pulsante non c'è: l'elenco vuoto è un esito da confrontare, non un'attesa.
    const mostra = riga.getByRole("button", { name: it.statoMostra, exact: true });
    if ((await mostra.count()) > 0) await mostra.click();
    const voluti = attesi(p.funzione);
    const visti = letto(await elenco.getByRole("listitem").allInnerTexts());
    const esito = appaia(visti, voluti);
    console.log(`[${info.project.name}] controllo di ${p.nome}: attese ${voluti.length}, viste ${visti.length}, in più ${esito.inPiu.length}, mancanti ${esito.mancanti.length}`);
    expect(esito, `${p.nome}: l'elenco non è quello di controlla`).toEqual({ inPiu: [], mancanti: [] });
    // I blocchi segnati: quelli con un errore, nei due versi.
    const segnati = (await flowchart.locator('[aria-invalid="true"]').evaluateAll((es) => es.map((e) => e.getAttribute("aria-label") ?? ""))).sort();
    const conErrore = [...new Set(voluti.filter((v) => v.startsWith("errore ") && !delDato(v)).map((v) => v.split(" ").slice(2).join(" ")))].sort();
    expect(appaia(segnati, conErrore), `${p.nome}: i blocchi segnati non sono quelli con un errore`).toEqual({ inPiu: [], mancanti: [] });
    voci += visti.length;
    segni += segnati.length;
    voluti.forEach((v) => codici.add(v.split(" ")[1]!));
    await riga.getByRole("button", { name: it.statoNascondi, exact: true }).click();
  }
  console.log(`[${info.project.name}] controllo immediato: progetti ${progettiConSegnalazioni.length}, voci ${voci}, blocchi segnati ${segni}, codici distinti ${codici.size} (${[...codici].sort().join(", ")})`);
  // Le premesse: errori dei blocchi e della vista dei dati, avvisi con e senza errori.
  expect(codici.has("invalid_name") && codici.has("syntax_error") && codici.has("integer_division_to_real") && codici.has("input_never_read")).toBe(true);
  expect(codici.has("output_never_written"), "un avviso di ruolo con un errore nel progetto").toBe(false);

  // Controlli positivi sull'ultimo progetto, con le voci vere: una tolta, una in più, un segno tolto.
  await riga.getByRole("button", { name: it.statoMostra, exact: true }).click();
  const veri = await elenco.getByRole("listitem").allInnerTexts();
  const voluti = attesi(progettiConSegnalazioni.at(-1)!.funzione);
  expect(appaia(letto(veri.slice(1)), voluti).mancanti).toHaveLength(1);
  expect(appaia(letto([...veri, veri[0]!]), voluti).inPiu).toHaveLength(1);
  await apriEsempio(page, progettiConSegnalazioni.length - 2);
  const flowchart = flowchartDi(page, "riferimento-con-errori");
  await flowchart.locator('[aria-invalid="true"]').first().evaluate((e) => e.removeAttribute("aria-invalid"));
  const segnati = (await flowchart.locator('[aria-invalid="true"]').evaluateAll((es) => es.map((e) => e.getAttribute("aria-label") ?? ""))).sort();
  const conErrore = [...new Set(attesi(conErrori).filter((v) => v.startsWith("errore ") && !delDato(v)).map((v) => v.split(" ").slice(2).join(" ")))];
  expect(appaia(segnati, conErrore).mancanti).toHaveLength(1);
});

test("mentre si scrive, sotto i campi compare l'errore del blocco nel progetto candidato, e sparisce quando il testo è giusto", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await blocco(flowchart, nomeBlocco(delRiferimento("b21"))).dblclick();
  const segnalazioni = page.getByRole("list", { name: it.segnalazioniDelBlocco, exact: true }).getByRole("listitem");
  await scriviNel(page, it.campoDestinazione, "età");
  // Subito il testo breve, quello della causa precisa; il suo suggerimento si apre con «Spiegazione» e si richiude.
  const causa = testiDelleCause.it.lettera_accentata;
  await expect(segnalazioni).toHaveText([`Errore: ${causa.breve.replace("{segno}", "à")} ${it.spiegazione} ▸`]);
  const spiegazione = segnalazioni.getByRole("button", { name: it.spiegazione, exact: true });
  await spiegazione.click();
  await expect(spiegazione).toHaveAttribute("aria-expanded", "true");
  await expect(segnalazioni.locator("[data-spiegazione]")).toHaveText(causa.suggerimento);
  await spiegazione.click();
  await expect(segnalazioni.locator("[data-spiegazione]")).toHaveCount(0);
  await scriviNel(page, it.campoDestinazione, "eta");
  await expect(segnalazioni).toHaveText([`Errore: ${testiDeiCodici.it.unknown_name.breve} ${it.spiegazione} ▸`]);
  await scriviNel(page, it.campoDestinazione, "j");
  await expect(segnalazioni).toHaveCount(0);
  // Il progetto confermato non cambia finché si scrive: la riga di stato resta quella di prima.
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoNessuno);
});
