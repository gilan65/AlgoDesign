// Modificare i dati, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build).
//
// Il modello si legge dalla TABELLA (righe trovate per ruolo, testo delle celle; nel modo a celle il valore
// dei campi) e, per le regole, dall'ALBERO DELL'ACCESSIBILITÀ del flowchart (il nome di un blocco porta il
// suo contenuto). I valori attesi si scrivono qui, dai dati del riferimento, senza passare dai moduli che
// costruiscono la bozza dei campi.
//
// - I due modi (la scheda sotto la riga, ogni cella un campo) danno lo stesso modello: i dati del
//   riferimento, più tre di forme che il riferimento non ha, scritti da zero con «Aggiungi un dato».
//   Controllo positivo: un valore diverso dà un'altra lettura.
// - Rinomina: le regole che usano il dato cambiano, i letterali no; un passo solo di Annulla.
// - Cancellazione di un dato usato: la finestra di conferma col numero delle regole, il fuoco trattenuto,
//   Esc che chiude senza passi; poi l'errore nei blocchi che lo usano, e Annulla. Un dato che nessuna regola
//   usa si cancella subito, o con la finestra se la conferma è chiesta sempre.
// - Nome doppio: la tabella resta intera (otto righe), il secondo dato porta l'errore sulla riga, e la voce
//   della riga di stato porta alla riga (riaprendo la vista dei dati chiusa).
// - Tab: raggiunge ogni campo della vista nei due modi, anche in WebKit.
// - Il menu del tasto destro (e da tastiera) cancella il dato; ha anche Duplica e Sposta su e giù (le stesse voci del
//   menu di un caso d'uso: le appaia la prova sotto happy-dom, `ui/casi/casi.test.tsx`).
// - Il valore iniziale nel flowchart: il blocco sotto «Inizio» dice il valore del dato dopo ogni modifica dalla vista dei
//   dati (impostato, cambiato, tolto, rinominato, di un altro tipo, diventato un vettore, il dato cancellato, Annulla):
//   letto dal disegno e confrontato con la riga del dato, e coi valori scritti a mano.
// - «Aggiungi un dato» col mouse, con la pressione e il rilascio separati, coi campi aperti nella scheda (un valore
//   scritto) e nelle celle (un nome svuotato, che apre l'elenco degli errori): il testo resta nel progetto e il
//   dato si aggiunge. Controllo positivo: senza campi aperti il dato si aggiunge allo stesso modo.
//
// CHE COSA NON GUARDA:
// - il file salvato (non c'è ancora il salvataggio): lo confronta la prova della costruzione col file atteso;
// - le costanti comuni, in sola lettura (le guarda `dati.e2e.ts`);
// - l'aspetto della scheda e dei segni, se non che il segno di un errore sia `aria-invalid` con la sua
//   descrizione;
// - un lettore di schermo vero: qui l'albero dell'accessibilità del motore;
// - «Aggiungi un dato» coi campi di un BLOCCO aperti (il riquadro sta sopra la pagina e non sposta il pulsante; il
//   pannello a destra non tocca la vista dei dati), né col tocco su uno schermo.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { tipoSemplice, type Blocco, type Dato, type Funzione, type Ruolo, type Tipo } from "../core/progetto/modello";
import { testiDelleCause } from "../i18n/codici";
import { it, type Dizionario } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { rigaDelDato } from "../ui/dati/righe";
import { testiDelDisegno } from "../ui/disegno/testi";
import { albero, eUnPunto, nomeBlocco, RIFERIMENTO, riferimento, stato, type Nodo } from "./albero";
import { apri, costruisciFinzione } from "./pagina";
// I primi dieci numeri, scritti a pezzi (lo stesso testo): «1, 2, 3», poi i quattro seguenti, poi gli ultimi tre.
const primiDieci = "1, 2, 3, " /* poi i quattro seguenti */ + "4, 5, 6, 7, " /* poi gli ultimi tre */ + "8, 9, 10";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const flowchartDi = (page: Page, nome = RIFERIMENTO) => page.getByRole("group", { name: `${it.flowchart}: ${nome}`, exact: true });
const tabellaDi = (page: Page, nome = RIFERIMENTO) => page.getByRole("table", { name: `${it.dati}: ${nome}`, exact: true });
const nella = (page: Page, nome: string) => page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: nome, exact: true });
const annullaSpento = (page: Page) => nella(page, it.annulla).getAttribute("aria-disabled");
/** Le righe dei dati (la riga di intestazione no; la scheda aperta no: non ha l'intestazione di riga). */
const righe = (tabella: Locator) => tabella.locator("tbody").getByRole("row").filter({ has: tabella.page().getByRole("rowheader") });
const rigaDel = (tabella: Locator, nome: string) => righe(tabella).filter({ has: tabella.page().getByRole("rowheader", { name: nome, exact: true }) });

/** La vista dei dati si modifica: un rosso con il suo messaggio, e non un'attesa scaduta, sul codice di prima. */
async function siModifica(page: Page): Promise<void> {
  const pulsante = page.getByRole("button", { name: it.aggiungiDato ?? "Aggiungi un dato", exact: true });
  await expect(page.getByRole("table").first()).toBeVisible();
  expect(await pulsante.count(), "la vista dei dati non si modifica: non c'è «Aggiungi un dato»").toBe(1);
}

/** Apre la finestra col modo dei dati e la conferma date (dalle preferenze, come le scrivono le
 * Impostazioni), e gli esempi dati (come la pagina di prova). */
async function apriCon(page: Page, opzioni: { celle?: boolean; sempre?: boolean; esempi?: { nome: string; titolo: string; funzione: Funzione }[] } = {}): Promise<void> {
  const salvate = { lingua: "it", modoDeiDati: opzioni.celle ? "celle" : "scheda", conferma: opzioni.sempre ? "sempre" : "se-usato" };
  await apri(page, salvate, undefined, opzioni.esempi);
}

/** Il testo di ogni riga dei dati, cella per cella; un attributo assente è la stringa vuota. */
const leggiRighe = (tabella: Locator) =>
  righe(tabella).evaluateAll((rs) => rs.map((r) => [...r.children].map((c) => (c.hasAttribute("data-nessuno") ? "" : (c.textContent ?? "")))));
const attese = (d: Dato) => {
  const r = rigaDelDato(d, it, "elenco", testiDelDisegno("it"));
  return [r.nome, r.tipo, r.natura, r.iniziale ?? "", r.ruolo ?? ""];
};

// ------------------------------------------------------------------------------------ i due modi

const nomiDeiTipi: Record<Tipo, keyof Dizionario> = { integer: "tipoIntero", real: "tipoReale", character: "tipoCarattere", string: "tipoStringa", boolean: "tipoBooleano" };
const nomiDeiRuoli: Record<Ruolo, keyof Dizionario> = { input: "ruoloInput", output: "ruoloOutput", input_output: "ruoloInputOutput" };

/** I dati del riferimento e tre forme che lì non ci sono: un vettore con l'elenco, un vettore costante con un
 * valore ripetuto, una stringa con la lunghezza massima (fra le opzioni avanzate) e una virgola nel letterale. */
const daScrivere: Dato[] = [
  ...riferimento.data,
  { name: "pesi", type: "real", size: 3, initial: ["1.0", "2.0", "0.5"] },
  { name: "SOGLIE", type: "integer", size: 4, constant: true, initial: { each: "6" } },
  { name: "titolo", type: "string", initial: '"Voti, media"', max_length: 40 },
];

/** I campi di un dato come li vede chi li compila: il testo di ogni campo, le voci scelte. */
function campiAttesi(d: Dato): string[] {
  const iniziale = d.initial === undefined ? "" : typeof d.initial === "string" ? d.initial : "each" in d.initial ? d.initial.each : `{${d.initial.join(", ")}}`;
  return [
    d.name,
    it[nomiDeiTipi[tipoSemplice(d.type)]],
    d.size === undefined ? it.formaSemplice : it.formaVettore,
    d.size === undefined ? "" : String(d.size),
    d.constant ? it.naturaCostante : it.naturaVariabile,
    iniziale,
    d.size === undefined ? "" : d.initial !== undefined && typeof d.initial === "object" && "each" in d.initial ? it.inizialeRipetuto : it.inizialeElenco,
    // Una costante non ha la scelta del ruolo; una variabile senza ruolo è «di lavoro».
    d.constant ? "" : d.role === undefined ? it.ruoloDiLavoro : it[nomiDeiRuoli[d.role]],
    d.max_length === undefined ? "" : String(d.max_length),
  ];
}

/** Compila i campi di un dato: `nome(campo)` dà il nome accessibile di un campo nel modo in uso. */
async function compila(dove: Locator | Page, nome: (campo: string) => string, d: Dato, avanzate: () => Promise<void>): Promise<void> {
  const [, tipo, forma, elementi, natura, iniziale, inizialeVettore, ruolo, lunghezza] = campiAttesi(d);
  await dove.getByRole("textbox", { name: nome(it.datiNome), exact: true }).fill(d.name);
  await dove.getByRole("combobox", { name: nome(it.datiTipo), exact: true }).selectOption({ label: tipo! });
  await dove.getByRole("combobox", { name: nome(it.campoForma), exact: true }).selectOption({ label: forma! });
  if (elementi) await dove.getByRole("spinbutton", { name: nome(it.campoElementi), exact: true }).fill(elementi);
  await dove.getByRole("combobox", { name: nome(it.datiNatura), exact: true }).selectOption({ label: natura! });
  await dove.getByRole("textbox", { name: nome(it.datiIniziale), exact: true }).fill(iniziale!);
  if (inizialeVettore) await dove.getByRole("combobox", { name: nome(it.campoInizialeVettore), exact: true }).selectOption({ label: inizialeVettore });
  if (ruolo) await dove.getByRole("combobox", { name: nome(it.datiRuolo), exact: true }).selectOption({ label: ruolo });
  if (lunghezza) {
    await avanzate();
    await dove.getByRole("spinbutton", { name: nome(it.campoLunghezza), exact: true }).fill(lunghezza);
  }
}

/** Il valore di ogni campo di una riga a celle (un campo che la riga non ha: la stringa vuota). */
async function leggiCampi(page: Page, n: number): Promise<string[]> {
  const nome = (campo: string) => riempi(it.campoDellaRiga, { campo, n: String(n) });
  const testo = async (ruolo: "textbox" | "spinbutton", campo: string) => {
    const c = page.getByRole(ruolo, { name: nome(campo), exact: true });
    return (await c.count()) === 0 ? "" : c.inputValue();
  };
  const scelta = async (campo: string) => {
    const c = page.getByRole("combobox", { name: nome(campo), exact: true });
    return (await c.count()) === 0 ? "" : c.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.text ?? "");
  };
  return [
    await testo("textbox", it.datiNome),
    await scelta(it.datiTipo),
    await scelta(it.campoForma),
    await testo("spinbutton", it.campoElementi),
    await scelta(it.datiNatura),
    await testo("textbox", it.datiIniziale),
    await scelta(it.campoInizialeVettore),
    await scelta(it.datiRuolo),
    await testo("spinbutton", it.campoLunghezza),
  ];
}

const senzaDati: Funzione = { ...riferimento, data: [] };
const esempioSenzaDati = [{ nome: RIFERIMENTO, titolo: "senza dati", funzione: senzaDati }];

/** Scrive da zero i dati nel modo dato; restituisce la lettura (righe o campi), il flowchart e la riga di stato. */
async function scriviNelModo(page: Page, celle: boolean, dati: readonly Dato[]): Promise<{ letto: string[][]; flowchart: string; stato: string }> {
  await apriCon(page, { celle, esempi: esempioSenzaDati });
  await siModifica(page);
  const tabella = tabellaDi(page);
  for (const [i, d] of dati.entries()) {
    await page.getByRole("button", { name: it.aggiungiDato, exact: true }).click();
    if (celle) {
      const nome = (campo: string) => riempi(it.campoDellaRiga, { campo, n: String(i + 1) });
      await expect(page.getByRole("textbox", { name: nome(it.datiNome), exact: true })).toBeFocused();
      await compila(page, nome, d, async () => {});
      await page.getByRole("textbox", { name: nome(it.datiNome), exact: true }).press("Enter");
    } else {
      const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: it.datoSenzaNome }), exact: true });
      await expect(scheda.getByRole("textbox", { name: it.datiNome, exact: true })).toBeFocused();
      await compila(scheda, (c) => c, d, () => scheda.getByText(it.opzioniAvanzate, { exact: true }).click());
      await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
      await expect(page.getByRole("form")).toHaveCount(0);
    }
  }
  await expect(righe(tabella)).toHaveCount(dati.length);
  const letto = celle ? await Promise.all(dati.map((_, i) => leggiCampi(page, i + 1))) : await leggiRighe(tabella);
  const riga = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  return { letto, flowchart: await stato(flowchartDi(page)), stato: (await riga.innerText()).trim() };
}

test("i dati del riferimento scritti nella scheda e nelle celle danno lo stesso modello", async ({ browser }, info) => {
  // Undici dati scritti campo per campo, due volte, più il controllo positivo: in WebKit, coi quattro
  // progetti in parallelo, oltre i 30 s predefiniti.
  test.setTimeout(180_000);
  const pagina = async () => (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const scheda = await scriviNelModo(await pagina(), false, daScrivere);
  const celle = await scriviNelModo(await pagina(), true, daScrivere);
  const nellaScheda = daScrivere.map(attese);
  const nelleCelle = daScrivere.map(campiAttesi);
  const diversiScheda = scheda.letto.filter((r, i) => JSON.stringify(r) !== JSON.stringify(nellaScheda[i]));
  const diversiCelle = celle.letto.filter((r, i) => JSON.stringify(r) !== JSON.stringify(nelleCelle[i]));
  console.log(`[${info.project.name}] due modi: dati ${daScrivere.length}; righe diverse dall'atteso nella scheda ${diversiScheda.length}, nelle celle ${diversiCelle.length}; riga di stato «${scheda.stato}» e «${celle.stato}»`);
  expect(scheda.letto, "la tabella non mostra i dati scritti nella scheda").toEqual(nellaScheda);
  expect(celle.letto, "i campi delle celle non hanno i dati scritti").toEqual(nelleCelle);
  expect(celle.flowchart, "il flowchart è diverso nei due modi").toBe(scheda.flowchart);
  // I tre dati in più non li usa nessuna regola del riferimento: un avviso del dato inutile ciascuno.
  expect(scheda.stato).toContain(riempi(it.statoAvvisi, { n: "3" }));
  expect(celle.stato).toBe(scheda.stato);
  // Controllo positivo: un valore iniziale diverso dà un'altra lettura nei due modi.
  const altro = daScrivere.map((d) => (d.name === "contati" ? { ...d, initial: "1" } : d));
  expect(altro.map(attese)).not.toEqual(scheda.letto);
  expect(altro.map(campiAttesi)).not.toEqual(celle.letto);
});

// ------------------------------------------------------------------------------------ rinomina

/** I nomi dei blocchi nell'albero dell'accessibilità (i pulsanti che non sono «+»). */
const nomiDeiBlocchi = (n: Nodo): string[] => [...(n.ruolo === "button" && !eUnPunto(n) ? [n.nome] : []), ...n.figli.flatMap(nomiDeiBlocchi)];

/** I blocchi che nominano il dato come parola (camminati qui, sui testi del riferimento). */
function blocchiCheUsano(f: Funzione, nome: string): Blocco[] {
  const parola = new RegExp(`(?<![\\w"])${nome}(?![\\w"])`);
  const testi = (b: Blocco): readonly string[] =>
    b.kind === "assignment" ? [b.target, b.value] : b.kind === "read" ? [b.target] : b.kind === "write" ? b.values : "condition" in b ? [b.condition] : [];
  const fuoriDaiLetterali = (t: string) => t.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  const tutti: Blocco[] = [];
  const visita = (b: Blocco) => {
    tutti.push(b);
    if (b.kind === "if") [...b.then, ...b.else].forEach(visita);
    if ("body" in b) (b.body as Blocco[]).forEach(visita);
  };
  f.body.forEach(visita);
  return tutti.filter((b) => testi(b).some((t) => parola.test(fuoriDaiLetterali(t))));
}

test("rinominare un dato aggiorna le regole che lo usano e non i letterali, in un passo solo di Annulla", async ({ page }, info) => {
  await apriCon(page);
  await siModifica(page);
  const tabella = tabellaDi(page);
  const flowchart = flowchartDi(page);
  const prima = await stato(flowchart);
  const usano = blocchiCheUsano(riferimento, "voto");
  await rigaDel(tabella, "voto").dblclick();
  const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: "voto" }), exact: true });
  await expect(scheda, "il doppio clic sulla riga non apre la scheda del dato").toHaveCount(1, { timeout: 3000 });
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).fill("punteggio");
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
  await expect(rigaDel(tabella, "punteggio")).toHaveCount(1);
  await expect(rigaDel(tabella, "punteggio")).toBeFocused();
  const dopo = nomiDeiBlocchi(await albero(flowchart));
  const rinominati = usano.map((b) => nomeBlocco(b).replace(/(?<![\w"])voto(?![\w"])/g, "punteggio"));
  const mancanti = rinominati.filter((n) => !dopo.includes(n));
  console.log(`[${info.project.name}] rinomina: blocchi che usano «voto» ${usano.length}, col nome nuovo nel flowchart ${usano.length - mancanti.length}`);
  expect(mancanti, "un blocco che usa il dato non ha il nome nuovo").toEqual([]);
  expect(usano.length).toBe(5);
  // Il letterale «Voto ignorato: » resta com'è, e nessun blocco nomina più «voto».
  expect(dopo.filter((n) => n.includes('"Voto ignorato: "'))).toHaveLength(1);
  expect(dopo.filter((n) => /(?<![\w"])voto(?![\w"])/.test(n.replace(/"(?:[^"\\]|\\.)*"/g, '""'))), "una regola nomina ancora «voto»").toEqual([]);
  expect(await annullaSpento(page)).toBe("false");
  await page.keyboard.press("Control+z");
  expect(await stato(flowchart)).toBe(prima);
  await expect(rigaDel(tabella, "voto")).toHaveCount(1);
  expect(await annullaSpento(page), "la rinomina era più di un passo").toBe("true");
});

// ------------------------------------------------------------------------------------ il valore iniziale nel flowchart

test("il blocco del valore iniziale dice il valore del dato dopo ogni modifica dalla vista dei dati, e con Annulla", async ({ page }, info) => {
  await apriCon(page);
  await siModifica(page);
  const tabella = tabellaDi(page);
  const blocchi = () => flowchartDi(page).locator("[data-valore-iniziale] text").allTextContents();
  /** I blocchi come li dicono le righe dei dati: nome e valore iniziale, per i dati che ne hanno uno. */
  const dalleRighe = async () => (await leggiRighe(tabella)).filter((r) => r[3] !== "").map((r) => `${r[0]} ← ${r[3]}`);
  let passi = 0;
  /** Una modifica nella scheda del dato, confermata con Invio; poi i blocchi contro le righe e contro l'atteso. */
  async function cambia(nome: string, scrivi: (scheda: Locator) => Promise<void>, attesi: string[]): Promise<void> {
    await rigaDel(tabella, nome).dblclick();
    const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome }), exact: true });
    await expect(scheda).toHaveCount(1);
    await scrivi(scheda);
    await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
    await expect(page.getByRole("form")).toHaveCount(0);
    await controlla(attesi);
  }
  async function controlla(attesi: string[]): Promise<void> {
    await expect.poll(blocchi).toEqual(attesi);
    expect(await blocchi(), "un blocco dice un valore diverso dalla riga del dato").toEqual(await dalleRighe());
    passi++;
  }
  const valore = (s: Locator, v: string) => s.getByRole("textbox", { name: it.datiIniziale, exact: true }).fill(v);

  await controlla(["contati ← 0", "insufficienti ← 0", "somma ← 0", "i ← 0", "j ← 0"]);
  await cambia("somma", (s) => valore(s, "7"), ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0"]);
  await cambia("n", (s) => valore(s, "5"), ["n ← 5", "contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0"]);
  await cambia("j", (s) => valore(s, ""), ["n ← 5", "contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0"]);
  await cambia("i", (s) => s.getByRole("textbox", { name: it.datiNome, exact: true }).fill("k"), ["n ← 5", "contati ← 0", "insufficienti ← 0", "somma ← 7", "k ← 0"]);
  await cambia(
    "insufficienti",
    async (s) => {
      await s.getByRole("combobox", { name: it.datiTipo, exact: true }).selectOption({ label: it.tipoReale });
      await valore(s, "0.5");
    },
    ["n ← 5", "contati ← 0", "insufficienti ← 0.5", "somma ← 7", "k ← 0"],
  );
  await cambia(
    "contati",
    async (s) => {
      await s.getByRole("combobox", { name: it.campoForma, exact: true }).selectOption({ label: it.formaVettore });
      await s.getByRole("spinbutton", { name: it.campoElementi, exact: true }).fill("12");
      await valore(s, `${primiDieci}, 11, 12`);
    },
    ["n ← 5", `contati ← {${primiDieci}, … altri 2}`, "insufficienti ← 0.5", "somma ← 7", "k ← 0"],
  );
  // Il dato cancellato (lo usano delle regole: la finestra di conferma) porta via il suo blocco; Annulla lo riporta.
  await rigaDel(tabella, "somma").focus();
  await page.keyboard.press("Delete");
  await page.getByRole("alertdialog").getByRole("button", { name: it.eliminaConferma, exact: true }).click();
  await controlla(["n ← 5", `contati ← {${primiDieci}, … altri 2}`, "insufficienti ← 0.5", "k ← 0"]);
  await page.keyboard.press("Control+z");
  await controlla(["n ← 5", `contati ← {${primiDieci}, … altri 2}`, "insufficienti ← 0.5", "somma ← 7", "k ← 0"]);
  console.log(`[${info.project.name}] valori iniziali nel flowchart: situazioni confrontate con le righe dei dati ${passi}`);
  expect(passi).toBe(9);
});

// ------------------------------------------------------------------------------------ cancellare

const conUnDatoInPiu = [{ nome: RIFERIMENTO, titolo: "con un dato in più", funzione: { ...riferimento, data: [...riferimento.data, { name: "inutile", type: "integer" as const }] } }];

test("cancellare un dato usato chiede conferma: fuoco trattenuto, Esc senza passi; poi l'errore nei blocchi che lo usano, e Annulla", async ({ page }, info) => {
  await apriCon(page);
  await siModifica(page);
  const tabella = tabellaDi(page);
  const flowchart = flowchartDi(page);
  await rigaDel(tabella, "voto").focus();
  await page.keyboard.press("Delete");
  const finestra = page.getByRole("alertdialog", { name: riempi(it.eliminaDatoTitolo, { nome: "voto" }), exact: true });
  await expect(finestra, "Canc su un dato usato non apre la finestra di conferma").toHaveCount(1, { timeout: 3000 });
  await expect(finestra).toContainText(riempi(it.eliminaDatoUsato, { n: "5" }));
  await expect(finestra.getByRole("button", { name: it.eliminaRinuncia, exact: true })).toBeFocused();
  // Il fuoco resta dentro: dieci Tab e dieci Maiusc+Tab.
  let fuori = 0;
  for (const tasto of [...Array(10).fill("Tab"), ...Array(10).fill("Shift+Tab")]) {
    await page.keyboard.press(tasto);
    if (!(await finestra.evaluate((f) => f.contains(document.activeElement)))) fuori++;
  }
  console.log(`[${info.project.name}] finestra: tasti col fuoco fuori ${fuori} su 20`);
  expect(fuori, "il fuoco è uscito dalla finestra di conferma").toBe(0);
  // Esc: chiude, nessun passo, il fuoco torna sulla riga.
  await page.keyboard.press("Escape");
  await expect(finestra).toHaveCount(0);
  await expect(righe(tabella)).toHaveCount(8);
  expect(await annullaSpento(page), "Esc ha lasciato un passo").toBe("true");
  await expect(rigaDel(tabella, "voto")).toBeFocused();
  // Elimina: la riga va via, i blocchi che usavano il dato hanno l'errore.
  await page.keyboard.press("Delete");
  await finestra.getByRole("button", { name: it.eliminaConferma, exact: true }).click();
  await expect(righe(tabella)).toHaveCount(7);
  const conErrore = (await flowchart.locator('[aria-invalid="true"]').evaluateAll((es) => es.map((e) => e.getAttribute("aria-label") ?? ""))).sort();
  const usano = blocchiCheUsano(riferimento, "voto").map(nomeBlocco).sort();
  console.log(`[${info.project.name}] cancellazione: blocchi che usavano «voto» ${usano.length}, con l'errore ${conErrore.length}`);
  expect(conErrore, "i blocchi con l'errore non sono quelli che usavano il dato").toEqual(usano);
  await page.keyboard.press("Control+z");
  await expect(righe(tabella)).toHaveCount(8);
  await expect(flowchart.locator('[aria-invalid="true"]')).toHaveCount(0);
});

test("un dato appena aggiunto sparisce, senza lasciare passi, se si rinuncia ai suoi campi o li si conferma vuoti", async ({ page }) => {
  await apriCon(page);
  const tabella = tabellaDi(page);
  const prima = await leggiRighe(tabella);
  const aggiungi = page.getByRole("button", { name: it.aggiungiDato, exact: true });
  const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: it.datoSenzaNome }), exact: true });
  // Tre modi di lasciarlo: «Annulla», Esc (anche dopo aver scritto il nome), e Invio coi campi vuoti.
  for (const lascia of [
    () => scheda.getByRole("button", { name: it.rinuncia, exact: true }).click(),
    async () => {
      await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).fill("forse");
      await page.keyboard.press("Escape");
    },
    () => scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter"),
  ]) {
    await aggiungi.click();
    await expect(scheda.getByRole("textbox", { name: it.datiNome, exact: true })).toBeFocused();
    expect(await righe(tabella).count()).toBe(prima.length + 1);
    await lascia();
    await expect(page.getByRole("form")).toHaveCount(0);
    expect(await leggiRighe(tabella)).toEqual(prima);
    expect(await annullaSpento(page)).toBe("true");
    expect(await nella(page, it.ripeti).getAttribute("aria-disabled")).toBe("true");
    await expect(aggiungi).toBeFocused();
  }
  // Controllo positivo: col nome scritto e Invio, il dato resta (un passo).
  await aggiungi.click();
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).fill("resta");
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
  await expect(rigaDel(tabella, "resta")).toHaveCount(1);
  expect(await annullaSpento(page)).toBe("false");
});

test("il clic col mouse su «Aggiungi un dato» coi campi aperti conferma il testo scritto e aggiunge il dato, nella scheda e nelle celle", async ({ browser }, info) => {
  const esiti: string[] = [];
  const casi = ["scheda col valore iniziale scritto", "celle col nome svuotato", "nessun campo aperto"] as const;
  for (const caso of casi) {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await apriCon(page, { celle: caso === "celle col nome svuotato" });
    await siModifica(page);
    const tabella = tabellaDi(page);
    const prima = await righe(tabella).count();
    if (caso === "scheda col valore iniziale scritto") {
      await page.locator('tr[data-dato="dati-3"]').focus();
      await page.keyboard.press("Enter");
      await page.getByRole("form").getByRole("textbox", { name: it.datiIniziale, exact: true }).fill("707");
    }
    if (caso === "celle col nome svuotato") await page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "1" }), exact: true }).fill("");
    // Il clic diviso nei suoi due tempi, come lo fa la mano: `click()` di Playwright lo rifarebbe se il pulsante si
    // spostasse fra la pressione e il rilascio, e nasconderebbe il difetto.
    const aggiungi = page.locator("[data-aggiungi]");
    const a = (await aggiungi.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    const b = (await aggiungi.boundingBox())!;
    await page.mouse.up();
    const aggiunto = await expect(righe(tabella)).toHaveCount(prima + 1, { timeout: 2_000 }).then(() => true, () => false);
    const testo =
      caso === "scheda col valore iniziale scritto"
        ? (await page.locator('tr[data-dato="dati-3"]').innerText()).includes("707")
        : caso === "celle col nome svuotato"
          ? (await page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "1" }), exact: true }).inputValue()) === "" && (await annullaSpento(page)) === "false"
          : true;
    esiti.push(`${caso}: righe ${prima} → ${await righe(tabella).count()}, pulsante spostato fra pressione e rilascio di ${Math.round(b.y - a.y)} px, testo nel progetto ${testo}`);
    if (!aggiunto || !testo) esiti.push(`ROSSO ${caso}`);
    await page.context().close();
  }
  console.log(`[${info.project.name}] «Aggiungi un dato» col mouse: ${esiti.join(" | ")}`);
  expect(esiti.filter((e) => e.startsWith("ROSSO"))).toEqual([]);
});

test("un dato che nessuna regola usa si cancella subito; con la conferma chiesta sempre, anche lui passa dalla finestra", async ({ browser }) => {
  for (const sempre of [false, true]) {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await apriCon(page, { sempre, esempi: conUnDatoInPiu });
    await siModifica(page);
    const tabella = tabellaDi(page);
    await rigaDel(tabella, "inutile").focus();
    await page.keyboard.press("Delete");
    const finestra = page.getByRole("alertdialog");
    if (sempre) {
      await expect(finestra, "con la conferma chiesta sempre, la finestra non si apre").toContainText(it.eliminaDatoNonUsato);
      await finestra.getByRole("button", { name: it.eliminaConferma, exact: true }).click();
    } else expect(await finestra.count(), "un dato che nessuno usa ha aperto la finestra").toBe(0);
    await expect(righe(tabella)).toHaveCount(8);
    await expect(rigaDel(tabella, "inutile")).toHaveCount(0);
  }
});

test("il tasto destro su un dato, o Maiusc+F10 sulla riga, apre il menu che lo cancella", async ({ page }) => {
  await apriCon(page, { celle: true, esempi: conUnDatoInPiu });
  await siModifica(page);
  const tabella = tabellaDi(page);
  // Sul resto della riga, non su un campo di testo (lì resta il menu del sistema).
  await page.getByRole("combobox", { name: riempi(it.campoDellaRiga, { campo: it.datiTipo, n: "9" }), exact: true }).click({ button: "right" });
  const menu = page.getByRole("menu", { name: riempi(it.menuDelDato, { nome: "inutile" }), exact: true });
  await expect(menu, "il tasto destro non apre il menu del dato").toHaveCount(1, { timeout: 3000 });
  await menu.getByRole("menuitem", { name: it.menuElimina, exact: true }).click();
  await expect(righe(tabella)).toHaveCount(8);
  // Dalla tastiera: Esc da un campo sceglie la riga, Maiusc+F10 apre il menu, Esc lo chiude e torna alla riga.
  await page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "1" }), exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+F10");
  const menuDiN = page.getByRole("menu", { name: riempi(it.menuDelDato, { nome: "n" }), exact: true });
  await expect(menuDiN.getByRole("menuitem", { name: it.menuElimina, exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuDiN).toHaveCount(0);
  await expect(righe(tabella).first()).toBeFocused();
});

// ------------------------------------------------------------------------------------ nome doppio

test("un nome doppio è un errore sulla riga del secondo dato, la tabella resta intera, e la riga di stato porta alla riga", async ({ page }, info) => {
  // Due righe con la stessa chiave React le mostra lo stesso, e avvisa nella console (sul server di
  // sviluppo): la console senza errori è il controllo che la chiave sia la posizione e non il nome.
  const console_: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") console_.push(m.text().slice(0, 200));
  });
  await apriCon(page);
  await siModifica(page);
  const tabella = tabellaDi(page);
  await rigaDel(tabella, "j").dblclick();
  const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: "j" }), exact: true });
  await expect(scheda, "il doppio clic sulla riga non apre la scheda del dato").toHaveCount(1, { timeout: 3000 });
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).fill("i");
  // Mentre si scrive, l'errore del dato nel progetto candidato sta sotto i campi, con la sua causa: il nome doppio.
  const breve = riempi(testiDelleCause.it.nome_doppio.breve, { segno: "i" });
  await expect(scheda.getByRole("list", { name: it.segnalazioniDelDato, exact: true }).getByRole("listitem")).toHaveText([`${riempi(it.segnalazioneErrore, { breve })} ${it.spiegazione} ▸`]);
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
  const nomi = (await leggiRighe(tabella)).map((r) => r[0]);
  const segnate = await righe(tabella).evaluateAll((rs) => rs.map((r) => r.getAttribute("aria-invalid") === "true"));
  console.log(`[${info.project.name}] nome doppio: righe ${nomi.length} (${nomi.join(" ")}), segnate ${segnate.filter(Boolean).length}`);
  expect(nomi).toEqual(["n", "voto", "media", "contati", "insufficienti", "somma", "i", "i"]);
  expect(segnate, "l'errore non è sulla riga del secondo «i»").toEqual([false, false, false, false, false, false, false, true]);
  await expect(righe(tabella).nth(7)).toHaveAccessibleDescription(riempi(it.segnalazioneErrore, { breve }));
  // La riga di stato porta alla riga, anche con la vista dei dati chiusa.
  await page.getByRole("button", { name: it.pannelloDati, exact: true }).click();
  await expect(tabella).toBeHidden();
  const riga = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  await riga.getByRole("button", { name: it.statoMostra, exact: true }).click();
  const voce = riga.getByRole("button", { name: riempi(it.voceErrore, { dove: riempi(it.voceDelDato, { tabella: it.dati, nome: "i" }), breve }), exact: true });
  await expect(voce, "la voce del dato non porta da nessuna parte").toHaveCount(1);
  await voce.click();
  await expect(tabella).toBeVisible();
  await expect(righe(tabella).nth(7)).toBeFocused();
  expect(console_, "errori nella console della pagina").toEqual([]);
});

// ------------------------------------------------------------------------------------ Tab

/** Gli elementi raggiunti col Tab partendo dal primo, finché il fuoco resta nel contenitore (o finché il
 * contenitore c'è: la scheda di un dato, lasciata col Tab, si conferma e si chiude). */
async function colTab(page: Page, contenitore: Locator, primo: Locator, massimo: number): Promise<{ raggiunti: string[]; tutti: string[] }> {
  // Ogni elemento si riconosce dalla sua posizione fra quelli che si possono raggiungere nel contenitore.
  const selettore = 'input, select, button, summary, tr[tabindex="0"]';
  const tutti = await contenitore.evaluate((c, sel) => [...c.querySelectorAll(sel)].map((e, i) => `${i} ${e.tagName.toLowerCase()} ${e.getAttribute("aria-label") ?? e.textContent?.trim().slice(0, 30) ?? ""}`), selettore);
  await primo.focus();
  const raggiunti: string[] = [];
  for (let i = 0; i < massimo; i++) {
    const qui = await contenitore
      .evaluate(
        (c, sel) => {
          const tutti = [...c.querySelectorAll(sel)];
          const j = tutti.indexOf(document.activeElement as Element);
          const e = tutti[j];
          return e ? `${j} ${e.tagName.toLowerCase()} ${e.getAttribute("aria-label") ?? e.textContent?.trim().slice(0, 30) ?? ""}` : null;
        },
        selettore,
        { timeout: 2_000 },
      )
      .catch(() => null);
    if (qui === null) break;
    raggiunti.push(qui);
    await page.keyboard.press("Tab");
  }
  return { raggiunti, tutti };
}

test("col Tab si raggiunge ogni campo della vista dei dati, nei due modi, anche in WebKit", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const conOgniForma = [{ nome: RIFERIMENTO, titolo: "ogni forma", funzione: { ...riferimento, data: daScrivere } }];
  const esiti: string[] = [];
  for (const celle of [false, true]) {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await apriCon(page, { celle, esempi: conOgniForma });
    await siModifica(page);
    const tabella = tabellaDi(page);
    const primo = celle ? page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "1" }), exact: true }) : righe(tabella).first();
    const { raggiunti, tutti } = await colTab(page, tabella, primo, 400);
    const mancanti = tutti.filter((t) => !raggiunti.includes(t));
    esiti.push(`${celle ? "celle" : "righe"} ${raggiunti.length} su ${tutti.length}, mancanti ${mancanti.length}`);
    expect(mancanti, `${celle ? "celle" : "righe"}: elementi che il Tab non raggiunge`).toEqual([]);
    expect(raggiunti.length, "un elemento raggiunto due volte, o uno in più").toBe(tutti.length);
    expect(tutti.length).toBeGreaterThan(celle ? daScrivere.length * 6 : daScrivere.length - 1);
    if (!celle) {
      // La scheda di una stringa: i campi, le opzioni avanzate, i comandi.
      await rigaDel(tabella, "titolo").dblclick();
      const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: "titolo" }), exact: true });
      const s = await colTab(page, scheda, scheda.getByRole("textbox", { name: it.datiNome, exact: true }), 40);
      const mancantiS = s.tutti.filter((t) => !s.raggiunti.includes(t));
      esiti.push(`scheda ${s.raggiunti.length} su ${s.tutti.length}, mancanti ${mancantiS.length}`);
      expect(mancantiS, "scheda: elementi che il Tab non raggiunge").toEqual([]);
      expect(s.tutti.length).toBeGreaterThanOrEqual(10);
    }
  }
  console.log(`[${info.project.name}] Tab nella vista dei dati: ${esiti.join("; ")}`);
});
