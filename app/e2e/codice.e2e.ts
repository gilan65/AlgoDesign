// Il codice generato nella finestra, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build). Il
// testo del codice, le linguette, la riga corrente a ogni pausa di F10, il punto di interruzione, l'errore e
// l'esclusione con la tabella stanno nella prova sotto happy-dom (`ui/genera/codice.test.tsx`); qui ciò che happy-dom
// non disegna o non fa da sé.
//
// - «Genera» sta nel gruppo delle viste dopo «Dati» e «Tabella», e la colonna del codice sta a destra del flowchart,
//   senza esecuzione.
// - Con «Animata» la riga evidenziata segue le pause: i cinque valori iniziali (la riga che dichiara ogni dato) e la
//   lettura, nell'ordine scritto a mano.
// - In un codice più lungo della colonna (il C del programma di riferimento), alla pausa su un punto di interruzione
//   la riga corrente è in vista: il riquadro è sceso fin lì; e un blocco di tredici righe (una scrittura nel C), in
//   una finestra bassa, ha in vista tutte le sue righe, non solo la prima.
// - «Copia» mette il testo negli appunti (letti in Chromium) e lascia il fuoco sul pulsante; «Salva…» propone il nome
//   del progetto con l'estensione, scrive il testo nel file scelto e lascia il fuoco sul pulsante.
// - L'avviso del nome: con un progetto che si chiama «con» (riservato da Windows) «Salva…» del codice apre prima
//   l'avviso, col nome proposto «con (2)» nel campo; un nome che non va («aux») spegne «Continua» e Invio non conferma;
//   le regole si aprono col clic; un altro nome va alla finestra del sistema; Esc rinuncia senza finestra del sistema.
//   «Salva con nome» di un progetto nuovo «Media: voti?» propone «Media voti». Controllo positivo: un progetto che si
//   chiama come il file proposto non apre l'avviso.
// - Un progetto che non sta in «Accademico» (`libreria-dei-voti`): l'elenco di tutto ciò che manca, appaiato per elemento
//   con le voci scritte a mano (controllo positivo: una voce tolta è colta); «Copia» e «Salva…» spenti; il clic porta alla
//   scheda giusta e sceglie il blocco, dà il fuoco alla riga del dato o a ciò che restituisce.
// - Un progetto coi record in «Accademico» (`tipi/copia-di-un-record` con una costante comune record aggiunta qui): le
//   voci del record (la costante comune e i due dati) e del testo fra virgolette, scritte a mano; il clic sulla costante
//   comune dà il fuoco alla sua riga; eliminato il blocco del testo, l'elenco si aggiorna senza la sua voce.
// - La copia di un record col nome nel Python, a ogni pausa di F10: la riga del campo che si copia, una alla volta.
// - La copia di una matrice col nome nel Python, a ogni pausa di F10: la riga del ciclo delle righe o di quello delle
//   colonne, secondo la pausa.
//
// CHE COSA NON GUARDA:
// - il contrasto dei testi del codice (`tabella.e2e.ts`, con quelli della colonna dell'esecuzione);
// - gli appunti in WebKit (la lettura non è concessa: solo l'avviso) e la finestra del sistema vera (è del guscio:
//   la prova sul prodotto);
// - la larghezza della colonna spostata dal bordo (lo stesso componente della colonna dell'esecuzione, provato lì).

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { testiDelleMancanze } from "../i18n/mancanze";
import type { Finzione } from "./finzione-tauri";
import { apri, apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const genera = (page: Page) => page.getByRole("banner").getByRole("button", { name: it.pannelloCodice, exact: true });
const riquadro = (page: Page) => page.getByRole("region", { name: it.codiceGenerato, exact: true });
const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]");
const evidenziate = (page: Page) => riquadro(page).locator("[data-riga][data-evidenziata]");
/** Il programma principale di un file del corpus. */
function delCorpus(nome: string): Funzione {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${nome}.algo`, import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error(`${nome} non si apre`);
  return esito.progetto.functions[0]!;
}

test("«Genera» sta dopo «Dati» e «Tabella», e il codice sta a destra del flowchart anche senza esecuzione", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const viste = await page.locator('header [data-gruppo="viste"] [data-comando]').evaluateAll((v) => v.map((x) => (x as HTMLElement).dataset.comando));
  expect(viste).toEqual(["dati", "tabella", "genera"]);
  await genera(page).click();
  await expect(riquadro(page)).toBeVisible();
  await expect(genera(page)).toHaveAttribute("aria-expanded", "true");
  const flowchart = (await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).boundingBox())!;
  const codice = (await riquadro(page).boundingBox())!;
  console.log(`flowchart ${flowchart.x.toFixed(0)}–${(flowchart.x + flowchart.width).toFixed(0)}, codice ${codice.x.toFixed(0)}–${(codice.x + codice.width).toFixed(0)} px`);
  expect(codice.x).toBeGreaterThanOrEqual(flowchart.x + flowchart.width);
  await expect(page.getByRole("log", { name: it.console, exact: true })).toHaveCount(0);
});

test("con «Animata» la riga evidenziata segue le pause: i valori iniziali, poi la lettura", async ({ page }) => {
  await apri(page, { lingua: "it", velocitaAnimata: "veloce" });
  await genera(page).click();
  await expect(riquadro(page)).toBeVisible();
  // Ogni cambio delle righe evidenziate, annotato nella pagina (l'animata non aspetta la prova).
  await page.evaluate(() => {
    const visti: string[] = [];
    Object.assign(window, { __evidenziate__: visti });
    const leggi = () => {
      const t = [...document.querySelectorAll("pre [data-riga][data-evidenziata]")].map((r) => r.lastElementChild?.textContent ?? "").join(" | ");
      if (t !== "" && t !== visti.at(-1)) visti.push(t);
    };
    new MutationObserver(leggi).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-evidenziata"], childList: true });
  });
  await page.getByRole("banner").getByRole("button", { name: it.animata, exact: true }).click();
  await expect(statoDi(page)).toHaveText(riempi(it.statoChiede, { dato: "n" }));
  const visti = await page.evaluate(() => (window as unknown as { __evidenziate__: string[] }).__evidenziate__);
  expect(visti).toEqual([
    "    contati: intero ← 0        // output",
    "    insufficienti: intero ← 0  // output",
    "    somma: intero ← 0",
    "    i: intero ← 0",
    "    j: intero ← 0",
    "        LEGGI n",
  ]);
});

test("in un codice più lungo della colonna la riga corrente al punto di interruzione è in vista", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioC, exact: true }).click();
  // Il punto sulla scrittura della media (b18), verso la fine del programma.
  await page.locator('[data-blocco="b18"]').first().click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  for (const [dato, valore] of [
    ["n", "2"],
    ["voto", "7"],
    ["voto", "8"],
  ] as const) {
    const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato }), exact: true });
    await expect(campo).toBeFocused();
    await campo.fill(valore);
    await campo.press("Enter");
  }
  await expect(statoDi(page)).toHaveText(new RegExp(`^${riempi(it.statoInPausa, { n: "\\d+" })}$`));
  await expect(evidenziate(page)).toHaveCount(1);
  await expect(evidenziate(page)).toContainText('printf("Media: %.2f su %d voti, insufficienti: %d\\n", media, contati, insufficienti);');
  const misure = await page.evaluate(() => {
    const pre = document.querySelector("pre:has([data-evidenziata])")!;
    const riga = pre.querySelector("[data-evidenziata]")!.getBoundingClientRect();
    const area = pre.getBoundingClientRect();
    return { riga: riga.top, fondo: riga.bottom, alto: area.top, basso: area.bottom, scorrimento: pre.scrollTop, righe: pre.querySelectorAll("[data-riga]").length, numero: Number(pre.querySelector("[data-evidenziata]")!.getAttribute("data-riga")) + 1 };
  });
  console.log(`riga ${misure.numero} su ${misure.righe}: ${misure.riga.toFixed(0)}–${misure.fondo.toFixed(0)} px nel riquadro ${misure.alto.toFixed(0)}–${misure.basso.toFixed(0)}, sceso di ${misure.scorrimento.toFixed(0)} px`);
  // La premessa: senza scendere la riga sarebbe fuori dal riquadro.
  expect(misure.scorrimento).toBeGreaterThan(0);
  expect(misure.riga).toBeGreaterThanOrEqual(misure.alto);
  expect(misure.fondo).toBeLessThanOrEqual(misure.basso);
});

test("un blocco di più righe: alla pausa tutte le sue righe sono in vista", async ({ page }) => {
  // Una finestra bassa: le tredici righe della scrittura nel C partono sotto il bordo del riquadro.
  await page.setViewportSize({ width: 1280, height: 600 });
  await apri(page, { lingua: "it" }, undefined, [{ nome: "converti-a-vettore", titolo: "converti-a-vettore", funzione: delCorpus("converti-a-vettore") }]);
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioC, exact: true }).click();
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  // Il valore iniziale di «s», la conversione, poi la scrittura degli elementi (tredici righe nel C).
  for (const [n, righe] of [
    [1, "    char s[4 * 255 + 1] = \"ciao\";"],
    [2, "    converti_a_vettore(v, 6, s);"],
  ] as const) {
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(n) }));
    await expect(evidenziate(page).locator("> span:last-child")).toHaveText([righe]);
  }
  await page.keyboard.press("F10");
  await expect(evidenziate(page)).toHaveCount(13);
  const misure = await page.evaluate(() => {
    const pre = document.querySelector("pre:has([data-evidenziata])")!;
    const righe = [...pre.querySelectorAll("[data-evidenziata]")].map((r) => r.getBoundingClientRect());
    const area = pre.getBoundingClientRect();
    return { alto: righe[0]!.top, basso: righe.at(-1)!.bottom, area: [area.top, area.bottom], scorrimento: pre.scrollTop };
  });
  console.log(`righe del blocco ${misure.alto.toFixed(0)}–${misure.basso.toFixed(0)} px nel riquadro ${misure.area.map((x) => x.toFixed(0)).join("–")}, sceso di ${misure.scorrimento.toFixed(0)} px`);
  expect(misure.scorrimento).toBeGreaterThan(0);
  expect(misure.alto).toBeGreaterThanOrEqual(misure.area[0]!);
  expect(misure.basso).toBeLessThanOrEqual(misure.area[1]!);
});

test("«Copia» e «Salva…» lasciano il fuoco sul pulsante; il testo va negli appunti e nel file scelto", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await apri(page, { lingua: "it" });
  await page.evaluate(() => {
    window.__finzione__.daSalvareIlCodice = "C:\\Documenti\\media";
  });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioPython, exact: true }).click();
  const testo = `${(await riquadro(page).locator("[data-riga] > span:last-child").allTextContents()).map((t) => (t === " " ? "" : t)).join("\n")}\n`;
  const copia = riquadro(page).getByRole("button", { name: it.codiceCopia, exact: true });
  // Da tastiera (il fuoco sul pulsante, poi Invio): nel WebKit per Windows il clic non dà il fuoco a un pulsante (come
  // Safari), e la promessa è che il comando non lo porti altrove.
  await copia.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.codiceCopiato, { linguaggio: it.linguaggioPython }));
  await expect(copia).toBeFocused();
  // Gli appunti di Windows riscrivono ogni a capo come «\r\n» (misurato): si confronta il testo con gli a capo ricondotti.
  if (browserName === "chromium") expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n")).toBe(testo);
  const salva = riquadro(page).getByRole("button", { name: it.codiceSalva, exact: true });
  await salva.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.codiceSalvatoIn, { file: "media.py" }));
  await expect(salva).toBeFocused();
  const f = await page.evaluate(() => window.__finzione__ as Finzione);
  expect({ volte: f.finestre.codice, proposto: f.finestre.proposto, uguale: f.file["C:\\Documenti\\media.py"] === testo }).toEqual({ volte: 1, proposto: "riferimento-media-voti.py", uguale: true });
});

/** Il programma di riferimento, col nome del progetto cambiato. */
function riferimentoChiamato(nome: string): string {
  const p = JSON.parse(readFileSync(fileURLToPath(new URL("../casi/tappa-1/riferimento-media-voti.algo", import.meta.url)), "utf8")) as { metadata: { name: string } };
  p.metadata.name = nome;
  return JSON.stringify(p, null, 2);
}
const finestreDelSistema = (page: Page) => page.evaluate(() => ({ codice: window.__finzione__.finestre.codice ?? 0, salva: window.__finzione__.finestre.salva, proposto: window.__finzione__.finestre.proposto }));

test("un progetto con un nome che Windows riserva, o con caratteri che un file non può avere: l'avviso dice il nome proposto prima della finestra del sistema e lo lascia cambiare", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, { argomento: "C:\\scuola\\con.algo", file: { "C:\\scuola\\con.algo": riferimentoChiamato("con") }, daSalvareIlCodice: "C:\\scuola\\uscita" });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioPython, exact: true }).click();
  const salva = riquadro(page).getByRole("button", { name: it.codiceSalva, exact: true });
  await salva.click();
  const avviso = page.getByRole("dialog", { name: it.nomeCambiaTitolo, exact: true });
  await expect(avviso).toBeVisible();
  await expect(avviso.getByText(riempi(it.nomeCambiaRiservato, { nome: "con.py", proposto: "con (2).py" }), { exact: true })).toBeVisible();
  const campo = avviso.getByLabel(it.nomeCambiaCampo, { exact: true });
  await expect(campo).toHaveValue("con (2)");
  expect(await finestreDelSistema(page)).toEqual({ codice: 0, salva: 0, proposto: null });
  // Un nome che non va: l'errore sotto il campo, «Continua» spento, Invio non conferma.
  await campo.fill("aux");
  await expect(campo).toHaveAttribute("aria-invalid", "true");
  await expect(avviso.getByText(it.nomeCambiaNonValido, { exact: true })).toBeVisible();
  const continua = avviso.getByRole("button", { name: it.nomeCambiaContinua, exact: true });
  await expect(continua).toHaveAttribute("aria-disabled", "true");
  await campo.press("Enter");
  await expect(avviso).toBeVisible();
  // Le regole dei nomi, chiuse di partenza, si aprono col clic.
  const regola = avviso.getByText(it.nomeRegolaRiservati, { exact: true });
  await expect(regola).toBeHidden();
  await avviso.getByText(it.nomeCambiaRegole, { exact: true }).click();
  await expect(regola).toBeVisible();
  // Un altro nome: «Continua» apre la finestra del sistema con quello, e il codice si salva.
  await campo.fill("esercizio");
  await expect(avviso.getByText(it.nomeCambiaNonValido, { exact: true })).toBeHidden();
  await continua.click();
  await expect(avviso).toBeHidden();
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.codiceSalvatoIn, { file: "uscita.py" }));
  expect(await finestreDelSistema(page)).toEqual({ codice: 1, salva: 0, proposto: "esercizio.py" });
  // Esc rinuncia: nessuna finestra del sistema.
  await salva.click();
  await expect(avviso).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(avviso).toBeHidden();
  expect((await finestreDelSistema(page)).codice).toBe(1);

  // «Salva con nome» di un progetto nuovo coi caratteri che un nome di file non può avere.
  await (await voceDelMenu(page, it.nuovo)).click();
  const nuovo = page.getByRole("dialog", { name: it.progettoNuovoTitolo, exact: true });
  await nuovo.getByLabel(it.progettoNome, { exact: true }).fill("Media: voti?");
  await nuovo.getByRole("button", { name: it.progettoCrea, exact: true }).click();
  await expect(nuovo).toBeHidden();
  await (await voceDelMenu(page, it.salvaConNome)).click();
  await expect(avviso.getByText(riempi(it.nomeCambiaCaratteri, { proposto: "Media voti.algo" }), { exact: true })).toBeVisible();
  await expect(campo).toHaveValue("Media voti");
  await continua.click();
  await expect(avviso).toBeHidden();
  expect(await finestreDelSistema(page)).toEqual({ codice: 1, salva: 1, proposto: "Media voti.algo" });
});

test("controllo positivo dell'avviso: un progetto che si chiama come il file non chiede nulla", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, { argomento: "C:\\scuola\\media.algo", file: { "C:\\scuola\\media.algo": riferimentoChiamato("Media dei voti") }, daSalvareIlCodice: "C:\\scuola\\uscita" });
  await genera(page).click();
  await riquadro(page).getByRole("button", { name: it.codiceSalva, exact: true }).click();
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.codiceSalvatoIn, { file: "uscita.txt" }));
  await expect(page.getByRole("dialog", { name: it.nomeCambiaTitolo, exact: true })).toBeHidden();
  expect(await finestreDelSistema(page)).toEqual({ codice: 1, salva: 0, proposto: "Media dei voti.txt" });
});

/** Le voci attese di ciò che manca a `libreria-dei-voti` in «Accademico», scritte a mano: la frase e il posto. */
const tipoStringa = "Il tipo stringa non è supportato in Accademico.";
const virgolette = "Un testo fra virgolette è supportato solo in una Scrittura.";
const vociAttese = [
  ["Il parametro di uscita (out) non è supportato in Accademico.", "Il dato «numero», procedura leggi_numero"],
  ["La Lettura non è supportata in Accademico.", "«Lettura: numero», procedura leggi_numero"],
  ["Il tipo reale non è supportato in Accademico: ci sono solo gli interi.", "Il risultato, funzione media"],
  ["L'operatore converti_a_reale non è presente in Accademico.", "Ciò che restituisce, funzione media"],
  [tipoStringa, "Il risultato, funzione stelle_di"],
  [tipoStringa, "Il dato «s», funzione stelle_di"],
  [virgolette, "«Assegnazione: s ← s + \"*\"», funzione stelle_di"],
  [tipoStringa, "Il risultato, funzione giudizio"],
  [tipoStringa, "Il dato «g», funzione giudizio"],
  [virgolette, "«Assegnazione: g ← \"voto \" + stelle_di(voto)», funzione giudizio"],
  [virgolette, "«Assegnazione: g ← \"non valido\"», funzione giudizio"],
] as const;
/** Le voci attese e quelle viste, appaiate per elemento nei due versi (un conteggio uguale non basta). */
function appaia(attese: readonly (readonly [string, string])[], viste: readonly (readonly [string, string])[]) {
  const chiave = (v: readonly [string, string]) => `${v[0]} | ${v[1]}`;
  const [a, v] = [attese.map(chiave), viste.map(chiave)];
  const togli = (da: string[], via: string[]) => {
    const resto = [...via];
    return da.filter((x) => {
      const i = resto.indexOf(x);
      if (i < 0) return true;
      resto.splice(i, 1);
      return false;
    });
  };
  return { mancanti: togli(a, v), inPiu: togli(v, a), attese: a.length, viste: v.length };
}

test("un progetto che non sta in «Accademico»: l'elenco di tutto ciò che manca, coi posti; il clic porta al blocco, al dato, alla funzione, a ciò che restituisce", async ({ page }) => {
  const testo = readFileSync(fileURLToPath(new URL("../casi/tappa-3/libreria-dei-voti.algo", import.meta.url)), "utf8");
  const progetto = apriProgetto(testo);
  if (!progetto.ok) throw new Error("libreria-dei-voti non si apre");
  const id = (nome: string) => progetto.progetto.functions.find((f) => f.name === nome)!.id;
  await apriVuota(page, { lingua: "it", linguaggiDelCodice: ["pseudocodice", "accademico"] }, { argomento: "C:\scuola\libreria-dei-voti.algo", file: { "C:\scuola\libreria-dei-voti.algo": testo } });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioAccademico, exact: true }).click();
  const voci = riquadro(page).locator("[data-mancanza]");
  await expect(voci).toHaveCount(vociAttese.length);
  const viste = await voci.evaluateAll((v) => v.map((b) => [b.firstChild?.textContent ?? "", b.lastElementChild?.textContent ?? ""] as const));
  const esito = appaia(vociAttese, viste);
  console.log(`ciò che manca: ${esito.viste} voci viste, ${esito.attese} attese, ${esito.mancanti.length} mancanti, ${esito.inPiu.length} in più`);
  expect(esito).toEqual({ mancanti: [], inPiu: [], attese: 11, viste: 11 });
  // Controllo positivo: una voce tolta dall'elenco visto è colta, col suo testo.
  expect(appaia(vociAttese, viste.slice(1)).mancanti).toEqual([`${vociAttese[0][0]} | ${vociAttese[0][1]}`]);
  await expect(riquadro(page).getByText(riempi(it.codiceNonCiSta, { linguaggio: it.linguaggioAccademico, quante: riempi(it.mancanzeTante, { n: "11" }) }), { exact: true })).toBeVisible();
  for (const nome of [it.codiceCopia, it.codiceSalva]) await expect(riquadro(page).getByRole("button", { name: nome, exact: true })).toHaveAttribute("aria-disabled", "true");
  const scheda = (f: string) => page.locator(`[data-scheda="${f}"]`);
  const stato = page.locator('output[role="status"]');
  // Un blocco: la sua scheda, il blocco scelto, il suggerimento.
  await voci.nth(6).click();
  await expect(scheda(id("stelle_di"))).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-blocco="b14"]')).toHaveAttribute("aria-pressed", "true");
  await expect(stato).toHaveText("Sposta il testo nella Scrittura che lo mostra: per esempio scrivi \"Totale: \" e poi il dato.");
  // Il dato di una procedura: la sua scheda e il fuoco sulla riga del dato.
  await voci.nth(0).click();
  await expect(scheda(id("leggi_numero"))).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(":focus")).toHaveAttribute("data-dato", /.+/);
  await expect(page.locator(":focus")).toContainText("numero");
  // La sola funzione: la sua scheda.
  await voci.nth(2).click();
  await expect(scheda(id("media"))).toHaveAttribute("aria-selected", "true");
  // Ciò che restituisce: il fuoco sulla sua forma.
  await voci.nth(4).click();
  await voci.nth(3).click();
  await expect(scheda(id("media"))).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(":focus")).toHaveAttribute("data-restituisce", "b12");
});

/** Un file della cartella dei record, col suo testo. */
const deiRecord = (nome: string) => readFileSync(fileURLToPath(new URL(`../casi/tipi/${nome}.algo`, import.meta.url)), "utf8");

test("un progetto coi record in «Accademico»: le voci del record e del testo; il clic sulla costante comune; l'elenco si aggiorna dopo una modifica", async ({ page }) => {
  // La copia di un record del corpus con una costante comune record in più.
  const progetto = JSON.parse(deiRecord("copia-di-un-record"));
  progetto.shared_constants = [{ name: "primo", type: "record", record: "alunno", constant: true, initial: ['"Ugo"', '"1A"', "6"] }];
  const testo = JSON.stringify(progetto, null, 2);
  await apriVuota(page, { lingua: "it", linguaggiDelCodice: ["pseudocodice", "accademico"] }, { argomento: "C:\\scuola\\copia.algo", file: { "C:\\scuola\\copia.algo": testo } });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioAccademico, exact: true }).click();
  const voci = riquadro(page).locator("[data-mancanza]");
  const record = testiDelleMancanze.it.record.breve;
  const attese = [
    [record, riempi(it.postoCostanteComune, { dato: "primo" })],
    [record, riempi(it.postoDato, { dato: "a", dove: it.doveProgramma })],
    [record, riempi(it.postoDato, { dato: "b", dove: it.doveProgramma })],
    [virgolette, riempi(it.postoBlocco, { blocco: 'Assegnazione: a.nome ← "Bruno"', dove: it.doveProgramma })],
  ] as const;
  await expect(voci).toHaveCount(attese.length);
  const viste = await voci.evaluateAll((v) => v.map((b) => [b.firstChild?.textContent ?? "", b.lastElementChild?.textContent ?? ""] as const));
  const esito = appaia(attese, viste);
  console.log(`ciò che manca coi record: ${esito.viste} voci viste, ${esito.attese} attese, ${esito.mancanti.length} mancanti, ${esito.inPiu.length} in più`);
  expect(esito).toEqual({ mancanti: [], inPiu: [], attese: 4, viste: 4 });
  await expect(riquadro(page).getByText(riempi(it.codiceNonCiSta, { linguaggio: it.linguaggioAccademico, quante: riempi(it.mancanzeTante, { n: "4" }) }), { exact: true })).toBeVisible();
  // La costante comune: il fuoco sulla sua riga nella tabella delle costanti comuni.
  await voci.nth(0).click();
  await expect(page.locator(":focus")).toHaveAttribute("data-dato", "comuni-0");
  await expect(page.locator(":focus")).toContainText("primo");
  // Eliminato il blocco del testo fra virgolette, l'elenco si aggiorna: la sua voce non c'è più, le altre restano.
  await page.locator('[data-blocco="b4"]').first().click();
  await page.keyboard.press("Delete");
  await expect(voci).toHaveCount(3);
  const dopo = await voci.evaluateAll((v) => v.map((b) => [b.firstChild?.textContent ?? "", b.lastElementChild?.textContent ?? ""] as const));
  expect(appaia(attese.slice(0, 3), dopo)).toEqual({ mancanti: [], inPiu: [], attese: 3, viste: 3 });
  await expect(riquadro(page).getByText(riempi(it.codiceNonCiSta, { linguaggio: it.linguaggioAccademico, quante: riempi(it.mancanzeTante, { n: "3" }) }), { exact: true })).toBeVisible();
});

test("la copia di un record col nome nel Python: a ogni pausa la riga del campo che si copia", async ({ page }) => {
  const testo = deiRecord("copia-di-un-record");
  await apriVuota(page, { lingua: "it", linguaggiDelCodice: ["pseudocodice", "python"] }, { argomento: "C:\\scuola\\copia.algo", file: { "C:\\scuola\\copia.algo": testo } });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioPython, exact: true }).click();
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  // Il valore iniziale di «a», poi i tre campi della copia «b ← a», uno per pausa.
  for (const [n, riga] of [
    [1, '    a: alunno = alunno("Anna", "3A", 7)'],
    [2, "    b.nome = a.nome"],
    [3, "    b.classe = a.classe"],
    [4, "    b.voto = a.voto"],
  ] as const) {
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(n) }));
    await expect(evidenziate(page).locator("> span:last-child")).toHaveText([riga]);
  }
});

test("la copia di una matrice col nome nel Python: a ogni pausa la riga del ciclo delle righe o di quello delle colonne", async ({ page }) => {
  const testo = deiRecord("copia-di-una-matrice");
  await apriVuota(page, { lingua: "it", linguaggiDelCodice: ["pseudocodice", "python"] }, { argomento: "C:\\scuola\\copia.algo", file: { "C:\\scuola\\copia.algo": testo } });
  await genera(page).click();
  await riquadro(page).getByRole("tab", { name: it.linguaggioPython, exact: true }).click();
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  // Il valore iniziale di «a», poi la copia «b ← a»: la partenza e il controllo delle righe, poi quelli delle colonne, il
  // primo elemento, l'aumento della colonna e di nuovo il suo controllo.
  for (const [n, riga] of [
    [1, "    a: list[list[int]] = [[1, 2], [3, 4]]"],
    [2, "    _indice = 0"],
    [3, "    while _indice < 2:"],
    [4, "        _indice2 = 0"],
    [5, "        while _indice2 < 2:"],
    [6, "            b[_indice][_indice2] = a[_indice][_indice2]"],
    [7, "            _indice2 = _indice2 + 1"],
    [8, "        while _indice2 < 2:"],
  ] as const) {
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(n) }));
    await expect(evidenziate(page).locator("> span:last-child")).toHaveText([riga]);
  }
});
