// Scrivere un valore a mano dalla tabella di traccia, col gesto vero, e «Riesegui» dopo un errore che ha fermato il programma, con l'opzione delle Impostazioni.
//
// - Il doppio clic e la tastiera su una cella della riga corrente, più volte, in pausa e in attesa di una riga; mai sulle righe sopra, su una costante, su una posizione, in un caso
//   d'uso, col programma cambiato, su un gruppo chiuso, su una funzione non attiva. Il colore suo e le parole accanto, sulla sola riga della modifica. Il campo col rifiuto a parole.
// - Una cella con più valori: l'elenco, poi il campo col nome dell'elemento; il segno sull'elemento.
// - Il watch col valore nuovo, fermo e al passaggio del puntatore del mouse.
// - L'opzione spenta, tutto come prima; attiva, col programma cambiato, si riesegue senza ribattere le letture e ci si ferma dov'era l'errore.
//
// Il programma: `n` letta (riga «5»), `s = 0`, per `i` da 1 a `n`: `s = s + i` (il blocco del punto), scrivi `s`; poi scrivi «fine». Fermi su `s = s + i` al 3° passaggio la console ha
// «1» e «3», e `s` vale 3.
//
// Che cosa NON guarda: dove va il valore in ogni forma (`core/esecuzione/bersagli.test.ts`); le distanze fra i colori (`ui/esecuzione/sfondi.test.ts`); le tre scelte di «Riesegui»
// (`e2e/valori-modificati.e2e.ts`); le ripartenze nel nucleo (`core/esecuzione/ripartenza-dopo-un-errore.test.ts`).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriEsempio, apriVuota, costruisciFinzione, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const progetto = (dati: readonly unknown[], corpo: readonly unknown[], altro: Record<string, unknown> = {}, funzioni: readonly unknown[] = []) =>
  JSON.stringify({ format: "algodesign", schema_version: 2, metadata: { name: "somma" }, functions: [{ id: "f1", kind: "main", data: dati, body: corpo, end: { id: "b9" } }, ...funzioni], ...altro });
const intero = (name: string, resto: Record<string, unknown> = {}) => ({ name, type: "integer", ...resto });
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });
const scrivi = (id: string, ...values: string[]) => ({ id, kind: "write", values, newline: true });

const SOMMA = progetto(
  [intero("n"), intero("s"), intero("i")],
  [
    { id: "b1", kind: "read", target: "n" },
    assegna("b2", "s", "0"),
    { id: "b3", kind: "for", counter: "i", from: "1", to: "n", body: [assegna("b4", "s", "s + i"), scrivi("b5", "s")] },
    scrivi("b6", '"fine"'),
  ],
);
const COL = { n: 0, s: 1, i: 2 } as const;

const barra = (page: Page, nome: string) => page.getByRole("banner").getByRole("button", { name: nome, exact: true });
const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const correnti = (page: Page) => page.locator('[data-blocco][aria-current="step"]');
const scritte = (page: Page) => page.getByRole("log", { name: it.console, exact: true }).locator("[data-scrive]");
const avviso = (page: Page) => page.locator('output[role="status"]');
const rigaDi = (page: Page, dato: string) => page.getByRole("textbox", { name: riempi(it.consoleValore, { dato }), exact: true });
const salvare = (page: Page) => page.getByRole("alertdialog", { name: riempi(it.rieseguiTitolo, { nome: "somma" }), exact: true });
/** La cella `k` dei valori della riga corrente. */
const cella = (page: Page, k: number) => page.locator('table[data-traccia] tr[aria-current="true"] > td').nth(2 + k);
const campoDi = (page: Page, nome: string) => page.getByRole("textbox", { name: riempi(it.modificaCampo, { dato: nome }), exact: true });
const elenco = (page: Page, colonna: string) => page.getByRole("menu", { name: riempi(it.modificaElenco, { colonna }), exact: true });
const statoDi = (page: Page) => page.locator("[data-stato-esecuzione]");

async function daiLaRiga(page: Page, dato: string, valore: string): Promise<void> {
  const campo = rigaDi(page, dato);
  await campo.fill(valore);
  await campo.press("Enter");
}

async function aprilo(page: Page, testo: string, salvate: Record<string, unknown> = {}): Promise<void> {
  await apriVuota(page, { lingua: "it", ...salvate }, { esempi: { "1 somma.algo": testo } });
  await apriEsempio(page, 0);
}

async function alTerzoPassaggio(page: Page, salvate: Record<string, unknown> = {}): Promise<void> {
  await aprilo(page, SOMMA, salvate);
  await blocco(page, "b4").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await daiLaRiga(page, "n", "5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(2);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
}

async function scriviNella(page: Page, c: Locator, nome: string, valore: string): Promise<void> {
  await c.dblclick();
  const campo = campoDi(page, nome);
  await expect(campo).toBeFocused();
  await campo.fill(valore);
  await campo.press("Enter");
  await expect(campo).toHaveCount(0);
}

const LIME = "rgb(140, 255, 0)";
const sfondo = (l: Locator) => l.evaluate((e) => getComputedStyle(e).backgroundColor);

test("un valore con un a capo, che un campo di testo non sa tenere: confermato senza scrivere nulla non cambia, e il carattere a capo non lascia il campo aperto", async ({ page }) => {
  await aprilo(page, progetto(
    [{ name: "t", type: "string", initial: String.raw`"a\nb"` }, { name: "c", type: "character", initial: String.raw`'\n'` }, intero("b")],
    [assegna("b1", "b", "1"), assegna("b2", "b", "2")],
  ));
  await blocco(page, "b2").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b2");
  // Il campo mostra il valore senza l'a capo: è il motore a toglierlo.
  await cella(page, 0).dblclick();
  const campoT = campoDi(page, "t");
  await expect(campoT).toHaveValue("ab");
  await campoT.press("Enter");
  await expect(campoT).toHaveCount(0);
  await expect(cella(page, 0)).not.toHaveAttribute("data-modificata", "");
  await cella(page, 1).dblclick();
  const campoC = campoDi(page, "c");
  await campoC.press("Enter");
  await expect(campoC).toHaveCount(0);
  await expect(cella(page, 1)).not.toHaveAttribute("data-modificata", "");
  // Il controllo positivo: lo stesso campo, con un testo scritto, scrive.
  await scriviNella(page, cella(page, 0), "t", "x");
  await expect(cella(page, 0)).toHaveAttribute("data-modificata", "");
});

test("il doppio clic scrive il valore, più volte: il colore, le parole, lo stato; il campo propone quello di adesso; il programma prosegue col valore", async ({ page }) => {
  await alTerzoPassaggio(page);
  await cella(page, COL.s).dblclick();
  const campo = campoDi(page, "s");
  await expect(campo).toBeFocused();
  await expect(campo).toHaveValue("3");
  // La pausa non si muove e il testo si può riscrivere subito: il campo è tutto selezionato.
  expect(await campo.evaluate((c: HTMLInputElement) => [c.selectionStart, c.selectionEnd])).toEqual([0, 1]);
  await campo.fill("100");
  await campo.press("Enter");
  await expect(campo).toHaveCount(0);
  await expect(cella(page, COL.s)).toHaveText("100 (era 3)");
  await expect(cella(page, COL.s)).toHaveAttribute("data-modificata", "");
  expect(await sfondo(cella(page, COL.s))).toBe(LIME);
  await expect(avviso(page)).toHaveText(riempi(it.modificaFatta, { dato: "s", valore: "100", prima: "3" }));
  // Il fuoco torna alla cella.
  await expect(cella(page, COL.s)).toBeFocused();
  // Di nuovo, sulla stessa: il valore di prima resta il primo.
  await scriviNella(page, cella(page, COL.s), "s", "200");
  await expect(cella(page, COL.s)).toHaveText("200 (era 3)");
  // Su un'altra.
  await scriviNella(page, cella(page, COL.n), "n", "4");
  await expect(cella(page, COL.n)).toHaveText("4 (era 5)");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["1", "3", "203"]);
});

test("il segno sta solo sulla riga della modifica; le righe sopra non hanno il gesto, e la riga corrente sì", async ({ page }) => {
  await alTerzoPassaggio(page);
  await scriviNella(page, cella(page, COL.s), "s", "100");
  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b5");
  const segnate = page.locator("table[data-traccia] tbody td[data-modificata]");
  await expect(segnate).toHaveCount(1);
  await expect(segnate).toHaveText("100 (era 3)");
  // Quella riga non è più la corrente: il colore resta, il gesto no.
  expect(await sfondo(segnate)).toBe(LIME);
  await segnate.dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await expect(cella(page, COL.s)).not.toHaveAttribute("data-modificata", "");
  await expect(cella(page, COL.s)).toHaveText("103");
});

test("lo stesso valore riscritto è come «Annulla»: nessuna modifica; Esc lascia tutto com'è; il rifiuto lascia il campo aperto e non ferma nulla", async ({ page }) => {
  await alTerzoPassaggio(page);
  await scriviNella(page, cella(page, COL.s), "s", "3");
  await expect(cella(page, COL.s)).not.toHaveAttribute("data-modificata", "");
  await cella(page, COL.s).dblclick();
  await campoDi(page, "s").fill("9");
  await campoDi(page, "s").press("Escape");
  await expect(campoDi(page, "s")).toHaveCount(0);
  await expect(cella(page, COL.s)).toHaveText("3");
  await expect(cella(page, COL.s)).toBeFocused();
  // Il rifiuto, a parole; poi si corregge.
  await cella(page, COL.s).dblclick();
  await campoDi(page, "s").fill("abc");
  await campoDi(page, "s").press("Enter");
  await expect(campoDi(page, "s")).toBeVisible();
  await expect(campoDi(page, "s")).toHaveAttribute("aria-invalid", "true");
  await expect(avviso(page)).toHaveText(riempi(it.modificaNonValido, { testo: "abc", dato: "s" }));
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  // Un tasto dell'esecuzione col valore rifiutato non prosegue.
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(2);
  await expect(campoDi(page, "s")).toBeVisible();
  await campoDi(page, "s").fill("7");
  // Un tasto dell'esecuzione col valore buono prima lo scrive, poi prosegue.
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["1", "3", "10"]);
});

test("il clic fuori conferma il valore; se è rifiutato il campo resta", async ({ page }) => {
  await alTerzoPassaggio(page);
  await cella(page, COL.s).dblclick();
  await campoDi(page, "s").fill("8");
  await page.getByRole("heading", { name: it.tabellaDiTraccia, exact: true }).click();
  await expect(cella(page, COL.s)).toHaveText("8 (era 3)");
  await cella(page, COL.s).dblclick();
  await campoDi(page, "s").fill("abc");
  await page.getByRole("heading", { name: it.tabellaDiTraccia, exact: true }).click();
  await expect(campoDi(page, "s")).toBeVisible();
  await expect(avviso(page)).toHaveText(riempi(it.modificaNonValido, { testo: "abc", dato: "s" }));
});

// «Ferma» col valore rifiutato nel campo: dalla tastiera come col clic, l'esecuzione si ferma e il valore non si scrive.
for (const [canale, ferma] of [
  ["Maiusc+F5 dal campo", (page: Page) => campoDi(page, "s").press("Shift+F5")],
  ["il clic su «Ferma»", (page: Page) => barra(page, it.ferma).click()],
] as const) {
  test(`col valore rifiutato nel campo, ${canale} ferma l'esecuzione`, async ({ page }) => {
    await alTerzoPassaggio(page);
    await cella(page, COL.s).dblclick();
    await campoDi(page, "s").fill("abc");
    await campoDi(page, "s").press("Enter");
    await expect(campoDi(page, "s")).toHaveAttribute("aria-invalid", "true");
    await ferma(page);
    await expect(statoDi(page)).toHaveText(it.statoPronto);
    await expect(page.locator("table[data-traccia]")).toHaveCount(0);
  });
}

// Dopo un clic fuori rifiutato il campo resta, senza il fuoco: un comando che prosegue non va avanti da nessun canale, il fuoco torna nel campo e la riga di stato ripete il rifiuto;
// corretto il valore, lo stesso comando lo scrive e prosegue.
for (const [canale, prosegui] of [
  ["F5", (page: Page) => page.keyboard.press("F5")],
  ["F10", (page: Page) => page.keyboard.press("F10")],
  ["il clic su «Continua»", (page: Page) => barra(page, it.continua).click()],
] as const) {
  test(`dopo il clic fuori col valore rifiutato, ${canale} non prosegue e torna al campo`, async ({ page }) => {
    await alTerzoPassaggio(page);
    await cella(page, COL.s).dblclick();
    await campoDi(page, "s").fill("abc");
    await page.getByRole("heading", { name: it.tabellaDiTraccia, exact: true }).click();
    await expect(campoDi(page, "s")).toBeVisible();
    await expect(campoDi(page, "s")).not.toBeFocused();
    await prosegui(page);
    await expect(campoDi(page, "s")).toBeFocused();
    await expect(avviso(page)).toHaveText(riempi(it.modificaNonValido, { testo: "abc", dato: "s" }));
    await expect(scritte(page)).toHaveCount(2);
    await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "13" }));
    // Il controllo positivo: col valore buono lo stesso comando prosegue.
    await campoDi(page, "s").fill("7");
    await page.getByRole("heading", { name: it.tabellaDiTraccia, exact: true }).click();
    await expect(campoDi(page, "s")).toHaveCount(0);
    await prosegui(page);
    await expect(statoDi(page)).not.toHaveText(riempi(it.statoInPausa, { n: "13" }));
  });
}

// Il campo rifiutato resta nella tabella anche quando la colonna del codice la copre o la tabella è chiusa: il comando che prosegue la riporta in vista, o non ci sarebbe un campo da correggere.
for (const [come, nascondi] of [
  ["la colonna del codice", (page: Page) => barra(page, it.pannelloCodice).click()],
  ["la tabella chiusa", (page: Page) => barra(page, it.pannelloTabella).click()],
] as const) {
  test(`col valore rifiutato e ${come}, F10 non prosegue e il campo torna in vista col fuoco`, async ({ page }) => {
    await alTerzoPassaggio(page);
    await cella(page, COL.s).dblclick();
    await campoDi(page, "s").fill("abc");
    await page.getByRole("heading", { name: it.tabellaDiTraccia, exact: true }).click();
    await expect(campoDi(page, "s")).not.toBeFocused();
    await nascondi(page);
    await expect(campoDi(page, "s")).toHaveCount(0);
    await page.keyboard.press("F10");
    await expect(campoDi(page, "s")).toBeFocused();
    await expect(avviso(page)).toHaveText(riempi(it.modificaNonValido, { testo: "abc", dato: "s" }));
    await expect(scritte(page)).toHaveCount(2);
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "13" }));
  });
}

test("dalla tastiera: Tab raggiunge una cella della riga corrente, le frecce passano alle altre, Invio apre il campo; il suggerimento dice il gesto", async ({ page }) => {
  await alTerzoPassaggio(page);
  const nelGiro = page.locator('table[data-traccia] tbody td[tabindex="0"]');
  await expect(nelGiro).toHaveCount(1);
  await expect(nelGiro).toHaveAttribute("title", it.modificaSuggerimento);
  await nelGiro.focus();
  await expect(cella(page, COL.n)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cella(page, COL.s)).toBeFocused();
  await page.keyboard.press("Enter");
  const campo = campoDi(page, "s");
  await expect(campo).toBeFocused();
  await campo.fill("50");
  await campo.press("Enter");
  await expect(cella(page, COL.s)).toHaveText("50 (era 3)");
  await expect(cella(page, COL.s)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(cella(page, COL.n)).toBeFocused();
  // Il controllo positivo: fuori dalla riga corrente nessuna cella è nel giro del Tab.
  await expect(page.locator('table[data-traccia] tbody tr:not([aria-current]) td[tabindex="0"]')).toHaveCount(0);
});

test("in attesa di una riga: la lettura sbagliata si corregge, la modifica si aggiunge, e il fuoco torna alla console; flowchart e dati restano in sola lettura", async ({ page }) => {
  const p = progetto(
    [intero("a"), intero("b")],
    [{ id: "b1", kind: "read", target: "a" }, { id: "b2", kind: "read", target: "b" }, scrivi("b3", "a + b")],
  );
  await aprilo(page, p);
  await page.keyboard.press("F5");
  await daiLaRiga(page, "a", "1");
  await expect(rigaDi(page, "b")).toBeFocused();
  await cella(page, 0).dblclick();
  await expect(campoDi(page, "a")).toHaveValue("1");
  await expect(campoDi(page, "a")).toBeFocused();
  await campoDi(page, "a").fill("40");
  await campoDi(page, "a").press("Enter");
  await expect(cella(page, 0)).toHaveText("40 (era 1)");
  await expect(rigaDi(page, "b")).toBeFocused();
  // Il flowchart resta in sola lettura.
  await blocco(page, "b1").dblclick();
  await expect(page.getByRole("form")).toHaveCount(0);
  await daiLaRiga(page, "b", "2");
  await expect(scritte(page)).toHaveText(["42"]);
});

test("in attesa di una riga col valore rifiutato nella tabella: Invio nella console non prosegue, la riga resta scritta e il fuoco torna al campo", async ({ page }) => {
  await aprilo(page, progetto([intero("a"), intero("b")], [{ id: "b1", kind: "read", target: "a" }, { id: "b2", kind: "read", target: "b" }, scrivi("b3", "a + b")]));
  await page.keyboard.press("F5");
  await daiLaRiga(page, "a", "1");
  await expect(rigaDi(page, "b")).toBeFocused();
  await cella(page, 0).dblclick();
  await campoDi(page, "a").fill("abc");
  await campoDi(page, "a").press("Enter");
  await expect(campoDi(page, "a")).toHaveAttribute("aria-invalid", "true");
  await rigaDi(page, "b").fill("2");
  await rigaDi(page, "b").press("Enter");
  await expect(campoDi(page, "a")).toBeFocused();
  await expect(avviso(page)).toHaveText(riempi(it.modificaNonValido, { testo: "abc", dato: "a" }));
  await expect(rigaDi(page, "b")).toHaveValue("2");
  await expect(scritte(page)).toHaveCount(0);
  // Il controllo positivo: corretto il valore, la riga si dà.
  await campoDi(page, "a").fill("40");
  await campoDi(page, "a").press("Enter");
  await rigaDi(page, "b").press("Enter");
  await expect(scritte(page)).toHaveText(["42"]);
});

test("in una tabella lunga il campo aperto che esce dalla parte disegnata con la rotella, e poi ci torna, ha ancora il testo scritto", async ({ page }) => {
  // 150 giri: oltre 200 righe, la tabella ne disegna solo una parte.
  await aprilo(page, progetto([intero("s"), intero("i")], [assegna("b1", "s", "0"), { id: "b2", kind: "for", counter: "i", from: "1", to: "150", body: [assegna("b3", "s", "s + i")] }, assegna("b4", "s", "s + 1")]));
  await blocco(page, "b4").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await cella(page, 0).dblclick();
  await campoDi(page, "s").fill("777");
  const riquadro = page.locator("table[data-traccia]").locator("xpath=..");
  const box = (await riquadro.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let k = 0; k < 40; k++) await page.mouse.wheel(0, -600);
  // La riga corrente non è più disegnata, e il campo con lei.
  await expect(page.locator('table[data-traccia] tr[aria-current="true"]')).toHaveCount(0);
  await expect(campoDi(page, "s")).toHaveCount(0);
  for (let k = 0; k < 60; k++) await page.mouse.wheel(0, 600);
  await expect(campoDi(page, "s")).toHaveValue("777");
  await campoDi(page, "s").press("Enter");
  await expect(cella(page, 0)).toHaveText("777 (era 11325)");
});

test("una costante e una posizione: nessun campo, la riga di stato dice perché; la riga 0 prima della prima azione finita si modifica", async ({ page }) => {
  const p = progetto(
    [intero("k", { constant: true, initial: "9" }), { name: "v", type: "integer", size: 2, initial: { each: "0" } }, intero("x"), intero("y")],
    [{ id: "b1", kind: "for_each", item: "x", source: "v", body: [assegna("b2", "y", "1")] }],
  );
  await aprilo(page, p);
  await blocco(page, "b2").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b2");
  await cella(page, 0).dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await expect(avviso(page)).toHaveText(riempi(it.modificaCostante, { dato: "k" }));
  // k, v[0], v[1], x, y, poi la posizione.
  await cella(page, 5).dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await expect(avviso(page)).toHaveText(riempi(it.modificaPosizione, { dato: "_indice" }));
});

test("la riga 0: prima che la prima azione finisca è lei la corrente, e la cella non inizializzata propone un campo vuoto", async ({ page }) => {
  await aprilo(page, progetto([intero("a"), intero("b")], [assegna("b1", "b", "a + 1"), scrivi("b2", "b")]));
  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b1");
  await expect(page.locator('table[data-traccia] tr[aria-current="true"]')).toHaveAttribute("data-riga", "0");
  await cella(page, 0).dblclick();
  await expect(campoDi(page, "a")).toHaveValue("");
  await campoDi(page, "a").fill("6");
  await campoDi(page, "a").press("Enter");
  await expect(cella(page, 0)).toHaveText(`6 (era ${it.tracciaNonInizializzata})`);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["7"]);
});

test("il valore troppo lungo è rifiutato a parole e il reale si propone col punto, mai col testo della cella", async ({ page }) => {
  const p = progetto(
    [{ name: "t", type: "string", max_length: 3, initial: '"abc"' }, { name: "x", type: "real", initial: "1.5" }, intero("b")],
    [assegna("b1", "b", "1"), assegna("b2", "b", "2")],
  );
  await aprilo(page, p);
  await blocco(page, "b2").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b2");
  await cella(page, 0).dblclick();
  await campoDi(page, "t").fill("abcd");
  await campoDi(page, "t").press("Enter");
  await expect(avviso(page)).toHaveText(riempi(it.modificaTroppoLungo, { dato: "t" }));
  await campoDi(page, "t").press("Escape");
  await expect(cella(page, 1)).toContainText(",");
  await cella(page, 1).dblclick();
  await expect(campoDi(page, "x")).toHaveValue("1.5");
});

const VOTO = { name: "Voto", fields: [{ name: "nome", type: "string" }, { name: "voto", type: "integer" }] };
const DI_PIU_VALORI = progetto(
  [
    intero("b"),
    intero("m", { size: 2, columns: 3, initial: { each: "0" } }),
    intero("v", { size: 12, initial: { each: "0" } }),
    { name: "t", type: "record", record: "Voto", size: 2, initial: { each: ['"x"', "0"] } },
  ],
  [assegna("b1", "b", "1"), assegna("b2", "b", "2"), scrivi("b3", "m[1][1]", "v[11]", "t[1].voto")],
  { records: [VOTO] },
);
// b, m[0], m[1], v[0]…v[9], v[10…11], t[0], t[1].
const M1 = 2;
const ALTRI = 13;
const T1 = 15;

async function fermoSuB2(page: Page, testo: string, salvate: Record<string, unknown> = {}): Promise<void> {
  await aprilo(page, testo, salvate);
  await blocco(page, "b2").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b2");
}

test("una riga di una matrice: l'elenco degli elementi, col valore; il campo col nome dell'elemento; il segno sull'elemento e le parole col suo nome", async ({ page }) => {
  await fermoSuB2(page, DI_PIU_VALORI);
  await cella(page, M1).dblclick();
  const menu = elenco(page, "m[1]");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText(["m[1][0] 0", "m[1][1] 0", "m[1][2] 0"]);
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  // Dalla tastiera: la freccia e Invio.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveCount(0);
  const campo = campoDi(page, "m[1][1]");
  await expect(campo).toBeFocused();
  await expect(campo).toHaveValue("0");
  await campo.fill("9");
  await campo.press("Enter");
  await expect(cella(page, M1)).toHaveText("0 · 9 · 0 (m[1][1] era 0)");
  await expect(cella(page, M1)).toHaveAttribute("data-modificata", "");
  const segno = cella(page, M1).locator("mark[data-modificato]");
  await expect(segno).toHaveText("9");
  expect(await sfondo(segno)).toBe(LIME);
  // La cella non si colora tutta.
  expect(await sfondo(cella(page, M1))).not.toBe(LIME);
  await page.keyboard.press("F5");
  await expect(scritte(page).first()).toContainText("9");
});

test("Esc chiude l'elenco e il fuoco torna alla cella; la colonna degli altri e un record di una tabella hanno il loro elenco", async ({ page }) => {
  await fermoSuB2(page, DI_PIU_VALORI);
  await cella(page, M1).dblclick();
  await expect(elenco(page, "m[1]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(elenco(page, "m[1]")).toHaveCount(0);
  await expect(cella(page, M1)).toBeFocused();
  await cella(page, ALTRI).dblclick();
  await expect(elenco(page, "v[10…11]").getByRole("menuitem")).toHaveText(["v[10] 0", "v[11] 0"]);
  await elenco(page, "v[10…11]").getByRole("menuitem", { name: "v[11] 0", exact: true }).click();
  await campoDi(page, "v[11]").fill("5");
  await campoDi(page, "v[11]").press("Enter");
  await expect(cella(page, ALTRI)).toContainText("v[11] 5");
  await expect(cella(page, ALTRI)).toContainText("(v[11] era 0)");
  expect(await sfondo(cella(page, ALTRI))).toBe(LIME);
  await cella(page, T1).dblclick();
  await expect(elenco(page, "t[1]").getByRole("menuitem")).toHaveText(["t[1].nome x", "t[1].voto 0"]);
  await elenco(page, "t[1]").getByRole("menuitem", { name: "t[1].nome x", exact: true }).click();
  await campoDi(page, "t[1].nome").fill("Bea");
  await campoDi(page, "t[1].nome").press("Enter");
  await expect(cella(page, T1)).toContainText("(t[1].nome era x)");
});

test("un vettore in fila, scelto nelle Impostazioni: l'elenco di tutti gli elementi; con 1000 elementi si apre, scorre e ha l'ultimo", async ({ page }, info) => {
  const p = progetto([intero("b"), intero("v", { size: 1000, initial: { each: "0" } })], [assegna("b1", "b", "1"), assegna("b2", "b", "2")]);
  await fermoSuB2(page, p, { formaDeiVettori: "in-fila" });
  const prima = Date.now();
  await cella(page, 1).dblclick();
  const menu = elenco(page, "v");
  await expect(menu.getByRole("menuitem")).toHaveCount(1000);
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  const ms = Date.now() - prima;
  console.log(`[${info.project.name}] l'elenco di 1000 elementi aperto in ${ms} ms`);
  await page.keyboard.press("ArrowUp");
  const ultimo = menu.getByRole("menuitem", { name: "v[999] 0", exact: true });
  await expect(ultimo).toBeFocused();
  await expect(ultimo).toBeInViewport();
  await page.keyboard.press("Enter");
  await campoDi(page, "v[999]").fill("3");
  await campoDi(page, "v[999]").press("Enter");
  await expect(cella(page, 1)).toHaveAttribute("data-modificata", "");
  // L'elemento è oltre ciò che la cella disegna: le parole lo dicono lo stesso.
  await expect(cella(page, 1)).toContainText("(v[999] era 0)");
});

const CON_RIFERIMENTO = progetto(
  [intero("a", { initial: "7" })],
  [{ id: "b1", kind: "call", callee: "p", arguments: ["a"] }, assegna("b2", "a", "1"), scrivi("b3", "a")],
  {},
  [{ id: "f2", kind: "procedure", name: "p", data: [intero("x", { parameter: "reference" }), intero("c")], body: [assegna("b4", "c", "1"), assegna("b5", "c", "2")], end: { id: "b6" } }],
);

const X = 3;

test("un parametro per riferimento: il campo propone il valore e non «7 (a)», e si segnano tutti e due; una funzione non attiva e un gruppo chiuso non hanno il gesto", async ({ page }) => {
  await aprilo(page, CON_RIFERIMENTO);
  // Sul blocco dopo la chiamata la funzione non è attiva.
  await blocco(page, "b2").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b2");
  // a, la condizione, lo scritto, poi il gruppo di p: x, c.
  await cella(page, X).dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["1"]);

  await aprilo(page, CON_RIFERIMENTO);
  // La prima azione è il valore iniziale di `a`.
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b1");
  await page.keyboard.press("F11");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b5");
  await expect(cella(page, X)).toHaveText("7 (a)");
  await cella(page, X).dblclick();
  await expect(campoDi(page, "x")).toHaveValue("7");
  await campoDi(page, "x").fill("5");
  await campoDi(page, "x").press("Enter");
  await expect(cella(page, X)).toHaveText("5 (a) (era 7)");
  await expect(cella(page, 0)).toHaveText("5 (era 7)");
  // Il gruppo chiuso: niente gesto, e il segno sulla sua colonna.
  await page.locator('button[data-gruppo-di="p"]').click();
  const chiuso = page.locator('table[data-traccia] tr[aria-current="true"] > td[data-chiuso="p"]');
  await expect(chiuso).toHaveAttribute("data-modificata", "");
  await chiuso.dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
});

const CON_CASO = JSON.stringify({ ...JSON.parse(progetto([intero("a"), intero("b")], [assegna("b1", "a", "1"), assegna("b2", "b", "2")])), test_cases: [{ name: "uno", inputs: [], expected: { output: "" } }] });

test("nell'esecuzione di un caso d'uso i valori non si modificano, e la riga di stato lo dice", async ({ page }) => {
  await aprilo(page, CON_CASO);
  await page.getByRole("tab", { name: riempi(it.schedaCasi, { n: "1" }), exact: true }).click();
  await blocco(page, "b2").click();
  await page.keyboard.press("F9");
  await page.getByRole("button", { name: riempi(it.casoEseguiIl, { nome: "uno" }), exact: true }).click();
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b2");
  await cella(page, 0).dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await expect(avviso(page)).toHaveText(it.modificaNelCaso);
});

test("col programma cambiato non c'è il gesto: la tabella è dei valori di prima", async ({ page }) => {
  await alTerzoPassaggio(page);
  await blocco(page, "b2").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoValore, exact: true });
  await campo.fill("10");
  await campo.press("Enter");
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await cella(page, COL.s).dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await expect(page.locator('table[data-traccia] tbody td[tabindex="0"]')).toHaveCount(0);
  // Il controllo positivo: annullando il gesto torna.
  await page.getByRole("heading", { name: it.tabellaDiTraccia, exact: true }).click();
  await page.keyboard.press("Control+z");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await cella(page, COL.s).dblclick();
  await expect(campoDi(page, "s")).toBeVisible();
});

test("mentre un comando è in corso e a esecuzione finita non c'è il gesto", async ({ page }) => {
  await alTerzoPassaggio(page);
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["1", "3", "6", "10", "15", "fine"]);
  await cella(page, COL.s).dblclick();
  await expect(page.locator("table[data-traccia] input")).toHaveCount(0);
  await expect(page.locator('table[data-traccia] tbody td[tabindex="0"]')).toHaveCount(0);
});

test("oltre le 200 righe, disegnate solo in vista: la riga corrente ha il gesto e si ridisegna col valore nuovo", async ({ page }) => {
  await aprilo(page, progetto([intero("i"), intero("s")], [{ id: "b1", kind: "for", counter: "i", from: "1", to: "150", body: [assegna("b2", "s", "i")] }, assegna("b3", "s", "0"), assegna("b4", "s", "1")]));
  await blocco(page, "b4").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await scriviNella(page, cella(page, 1), "s", "77");
  await expect(cella(page, 1)).toHaveText("77 (era 0)");
  await expect(cella(page, 1)).toBeInViewport();
});

// --------------------------------------------------------------------------------- il watch

const watch = (page: Page) => page.locator('[role="tooltip"][data-watch], [data-watch]');

test("il watch ha il valore nuovo e le parole: fermo col clic sul nome, poi al passaggio del puntatore del mouse", async ({ page }) => {
  await alTerzoPassaggio(page);
  const nome = page.locator('[data-blocco="b4"] [data-watch-dato="s"]').first();
  // Fermo.
  await nome.click();
  const w = watch(page).first();
  await expect(w.locator("[data-watch-valore]")).toHaveText("3");
  await scriviNella(page, cella(page, COL.s), "s", "100");
  await expect(w.locator("[data-watch-valore]")).toHaveText("100");
  await expect(w.locator("[data-watch-valore]")).toHaveAttribute("data-modificata", "");
  await expect(w.locator("[data-watch-era]")).toHaveText("(era 3)");
  expect(await sfondo(w.locator("[data-watch-valore]"))).toBe(LIME);
  await page.keyboard.press("Escape");
  await expect(watch(page)).toHaveCount(0);
  // Al passaggio.
  await nome.hover();
  await expect(watch(page).first().locator("[data-watch-valore]")).toHaveText("100");
  await expect(watch(page).first().locator("[data-watch-era]")).toHaveText("(era 3)");
  // Dopo un'azione il segno non c'è più e il valore resta.
  await page.mouse.move(5, 1075);
  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b5");
  await page.locator('[data-blocco="b5"] [data-watch-dato="s"]').first().hover();
  await expect(watch(page).first().locator("[data-watch-valore]")).toHaveText("103");
  await expect(watch(page).first().locator("[data-watch-era]")).toHaveCount(0);
});

// --------------------------------------------------------------------- «Riesegui» dopo un errore

const CON_ERRORE = progetto(
  [intero("n"), intero("s"), intero("i"), intero("v", { size: 2, initial: { each: "0" } })],
  [
    { id: "b1", kind: "read", target: "n" },
    assegna("b2", "s", "0"),
    { id: "b3", kind: "for", counter: "i", from: "0", to: "n - 1", body: [assegna("b4", "s", "s + v[i]"), scrivi("b5", "s")] },
    scrivi("b6", '"fine"'),
  ],
);

/** Il programma fermato dall'errore al 3° passaggio. */
async function fermatoDallErrore(page: Page, salvate: Record<string, unknown> = {}): Promise<void> {
  await aprilo(page, CON_ERRORE, salvate);
  await page.keyboard.press("F5");
  await daiLaRiga(page, "n", "3");
  await expect(scritte(page)).toHaveText(["0", "0"]);
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
}

async function correggi(page: Page): Promise<void> {
  await blocco(page, "b4").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoValore, exact: true });
  await campo.fill("s + 1");
  await campo.press("Enter");
  await expect(page.getByRole("form")).toHaveCount(0);
}

test("l'opzione spenta, il comportamento di sempre: dopo l'errore, col programma cambiato, F5 comincia da capo e chiede la riga", async ({ page }) => {
  await fermatoDallErrore(page);
  await correggi(page);
  await expect(barra(page, it.esegui)).toHaveCount(1);
  await expect(barra(page, it.riesegui)).toHaveCount(0);
  await page.keyboard.press("F5");
  await expect(rigaDi(page, "n")).toBeVisible();
});

test("l'opzione attiva: col programma cambiato il comando è «Riesegui», non ribatte le letture e si ferma dov'era l'errore; F5 prosegue", async ({ page }) => {
  await fermatoDallErrore(page, { rieseguiDopoUnErrore: true });
  // A programma uguale F5 resta «Esegui»: ridarebbe lo stesso esito.
  await expect(barra(page, it.esegui)).toHaveCount(1);
  await correggi(page);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await expect(barra(page, it.riesegui)).toHaveAttribute("title", new RegExp(it.rieseguiDopoErroreSuggerimento));
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(rigaDi(page, "n")).toHaveCount(0);
  await expect(scritte(page)).toHaveText(["1", "2"]);
  await expect(avviso(page)).toContainText(it.rieseguiAlloStessoErrore);
  await expect(barra(page, it.continua)).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["1", "2", "3", "fine"]);
});

test("l'opzione attiva non toglie nulla: F10 comincia da capo e chiede la riga; a programma uguale F5 chiede la riga; «Ferma» chiude la colonna", async ({ page }) => {
  await fermatoDallErrore(page, { rieseguiDopoUnErrore: true });
  await page.keyboard.press("F5");
  await expect(rigaDi(page, "n")).toBeVisible();
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press("F5");
  await daiLaRiga(page, "n", "3");
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
  await correggi(page);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  // F10 comincia da capo, sul programma nuovo: niente domanda di salvare, la console è vuota e la prima azione è il valore iniziale di `v`.
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await expect(salvare(page)).toHaveCount(0);
  await expect(scritte(page)).toHaveCount(0);
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(barra(page, it.riesegui)).toHaveCount(0);
});

test("l'opzione attiva, il blocco dell'errore cancellato: il programma va fin dove va con le stesse righe e lo dice; con un errore nel progetto lo dice e l'esecuzione resta", async ({ page }) => {
  await fermatoDallErrore(page, { rieseguiDopoUnErrore: true });
  await blocco(page, "b4").click();
  await page.keyboard.press("Delete");
  await expect(blocco(page, "b4")).toHaveCount(0);
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect(scritte(page)).toHaveText(["0", "0", "0", "fine"]);
  await expect(avviso(page)).toContainText(it.rieseguiFinitoPrima);
  await expect(rigaDi(page, "n")).toHaveCount(0);

  await fermatoDallErrore(page, { rieseguiDopoUnErrore: true });
  await blocco(page, "b2").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoDestinazione, exact: true });
  await campo.fill("altro");
  await campo.press("Enter");
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect(avviso(page)).toHaveText(it.rieseguiNonParteDopoErrore);
  await expect(scritte(page)).toHaveText(["0", "0"]);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
});

test("l'opzione attiva con un valore modificato: le tre scelte, e «Tieni» lo riapplica; le letture non si ribattono", async ({ page }) => {
  await aprilo(page, CON_ERRORE, { rieseguiDopoUnErrore: true });
  await blocco(page, "b5").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await daiLaRiga(page, "n", "3");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b5");
  await scriviNella(page, cella(page, COL.s), "s", "100");
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
  await correggi(page);
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  const scelte = page.getByRole("alertdialog", { name: it.valoriTitolo, exact: true });
  await expect(scelte).toBeVisible();
  await scelte.getByRole("button", { name: it.valoriTieni, exact: true }).click();
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(rigaDi(page, "n")).toHaveCount(0);
  await expect(scritte(page).first()).toHaveText("100");
});

test("un caso d'uso fermato da un errore non ha «Riesegui», anche con l'opzione attiva: le sue letture le ha già", async ({ page }) => {
  const conCaso = JSON.stringify({ ...JSON.parse(CON_ERRORE), test_cases: [{ name: "uno", inputs: [{ data: "n", text: "3" }], expected: { output: "" } }] });
  await aprilo(page, conCaso, { rieseguiDopoUnErrore: true });
  await page.getByRole("tab", { name: riempi(it.schedaCasi, { n: "1" }), exact: true }).click();
  await page.getByRole("button", { name: riempi(it.casoEseguiIl, { nome: "uno" }), exact: true }).click();
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
  await correggi(page);
  await expect(barra(page, it.riesegui)).toHaveCount(0);
  await expect(barra(page, it.esegui)).toHaveCount(1);
});

test("l'opzione nelle Impostazioni: spenta di partenza, col suggerimento; non entra nella segnalazione", async ({ page }) => {
  await fermatoDallErrore(page, { rieseguiDopoUnErrore: true });
  await (await voceDellAiuto(page, it.segnalaComando)).click();
  const finestra = page.getByRole("dialog", { name: it.segnalaTitolo, exact: true });
  await expect(finestra).toBeVisible();
  const testo = (await finestra.textContent()) ?? "";
  expect(testo).toContain('"format"');
  expect(testo).not.toContain("rieseguiDopoUnErrore");
  await page.keyboard.press("Escape");

  await aprilo(page, SOMMA);
  await barra(page, it.impostazioni).click();
  const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  await f.getByRole("tab", { name: it.impostazioniModifica, exact: true }).click();
  const casella = f.getByRole("checkbox", { name: it.rieseguiDopoUnErrore, exact: true });
  await expect(casella).not.toBeChecked();
  await expect(casella.locator("xpath=..")).toHaveAttribute("title", it.rieseguiDopoUnErroreSuggerimento);
  await casella.check();
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
  const scritto = await page.evaluate(() => (window as unknown as { __finzione__: { scritte: { preferenze: { rieseguiDopoUnErrore: boolean } }[] } }).__finzione__.scritte.at(-1)!.preferenze.rieseguiDopoUnErrore);
  expect(scritto).toBe(true);
});
