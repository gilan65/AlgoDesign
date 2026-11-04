// Modificare in pausa e riprendere allo stesso passaggio: il comando «Riesegui», la domanda di salvare, i motivi detti a parole, Annulla, gli altri
// punti di interruzione, un ciclo diventato senza fine, la registrazione.
//
// Il programma: `n` letta (riga «5»), `s = 0`, per `i` da 1 a `n`: `s = s + i` (il blocco del punto), scrivi `s`; poi scrivi «fine». Ci si ferma su
// `s = s + i` al 3° passaggio, e lì la console ha «1» e «3».
//
// Che cosa NON guarda: tutti i motivi di «non ritrovato» nel nucleo (`core/esecuzione/ripartenza.test.ts`); il testo di ogni motivo
// (`ui/esecuzione/riesecuzione.test.ts`); quali guardie restano accese, elemento per elemento (`ui/esecuzione/guardie.test.ts`).
import { expect, test, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import type { Finzione } from "./finzione-tauri";
import { apriEsempio, apriVuota, costruisciFinzione, voceDelMenu, voceDellAiuto } from "./pagina";

test.beforeAll(async () => {
  await costruisciFinzione();
});

const progetto = (corpo: readonly unknown[], dati: readonly unknown[] = [{ name: "n", type: "integer" }, { name: "s", type: "integer" }, { name: "i", type: "integer" }], casi?: readonly unknown[]) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "somma" },
    functions: [{ id: "f1", kind: "main", data: dati, body: corpo, end: { id: "b9" } }],
    ...(casi ? { test_cases: casi } : {}),
  });

const SOMMA = progetto([
  { id: "b1", kind: "read", target: "n" },
  { id: "b2", kind: "assignment", target: "s", value: "0" },
  {
    id: "b3",
    kind: "for",
    counter: "i",
    from: "1",
    to: "n",
    body: [
      { id: "b4", kind: "assignment", target: "s", value: "s + i" },
      { id: "b5", kind: "write", values: ["s"], newline: true },
    ],
  },
  { id: "b6", kind: "write", values: ['"fine"'], newline: true },
]);

/** Un ciclo che finisce perché `n` scende: tolto il blocco che la fa scendere, non finisce più. */
const CON_IL_CICLO = progetto(
  [
    { id: "b1", kind: "read", target: "n" },
    { id: "b2", kind: "while", condition: "n > 0", body: [{ id: "b3", kind: "assignment", target: "n", value: "n - 1" }, { id: "b4", kind: "assignment", target: "s", value: "1" }] },
    { id: "b5", kind: "write", values: ['"fine"'], newline: true },
  ],
  [{ name: "n", type: "integer" }, { name: "s", type: "integer" }],
);

const barra = (page: Page, nome: string) => page.getByRole("banner").getByRole("button", { name: nome, exact: true });
const statoDi = (page: Page) => page.locator("[data-stato-esecuzione]");
const avviso = (page: Page) => page.locator('output[role="status"]');
const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const correnti = (page: Page) => page.locator('[aria-current="step"]');
const scritte = (page: Page) => page.getByRole("log", { name: it.console, exact: true }).locator("[data-scrive]");
const valoriDiPrima = (page: Page) => page.locator("[data-valori-di-prima]");
const domanda = (page: Page) => page.getByRole("alertdialog", { name: riempi(it.rieseguiTitolo, { nome: "somma" }), exact: true });
const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const imposta = (page: Page, valori: Partial<Finzione>) => page.evaluate((v) => Object.assign(window.__finzione__, v), valori);

async function apriIl(page: Page, testo: string): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 somma.algo": testo } });
  await apriEsempio(page, 0);
}

async function daiIlValore(page: Page, dato: string, valore: string): Promise<void> {
  const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato }), exact: true });
  await campo.fill(valore);
  await campo.press("Enter");
}

/** Il punto su `s = s + i` e fermi al 3° passaggio: la console ha «1» e «3». */
async function alTerzoPassaggio(page: Page): Promise<void> {
  await apriIl(page, SOMMA);
  await blocco(page, "b4").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await daiIlValore(page, "n", "5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(2);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
}

/** Il valore di `s = 0` cambiato dai campi del blocco. */
async function cambiaIlValore(page: Page, valore: string): Promise<void> {
  await blocco(page, "b2").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoValore, exact: true });
  await campo.fill(valore);
  await campo.press("Enter");
  await expect(page.getByRole("form")).toHaveCount(0);
}

/** F5 e, alla domanda, «Non salvare». */
async function rieseguiSenzaSalvare(page: Page): Promise<void> {
  await page.keyboard.press("F5");
  await domanda(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
}

test("si modifica in pausa, F5 chiede di salvare e torna allo stesso passaggio senza ribattere le letture; i valori sono ricalcolati", async ({ page }) => {
  await alTerzoPassaggio(page);
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(valoriDiPrima(page)).toHaveCount(0);

  await cambiaIlValore(page, "100");
  // Il programma in pausa non è più quello disegnato: si riesegue o ci si ferma, e la tabella dice di quando sono i valori.
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await expect(barra(page, it.riesegui)).toHaveAttribute("title", `${it.rieseguiSuggerimento} (F5)`);
  await expect(barra(page, it.continua)).toHaveCount(0);
  for (const nome of [it.unPasso, it.animata]) await expect(barra(page, nome)).toHaveAttribute("aria-disabled", "true");
  await expect(barra(page, it.ferma)).toHaveAttribute("aria-disabled", "false");
  await expect(valoriDiPrima(page)).toHaveText(it.valoriDiPrima);
  await expect(scritte(page)).toHaveText(["1", "3"]);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");

  await page.keyboard.press("F10");
  await page.waitForTimeout(150);
  await expect(scritte(page)).toHaveText(["1", "3"]);

  await page.keyboard.press("F5");
  await expect(domanda(page)).toBeVisible();
  await expect(domanda(page)).toContainText(it.rieseguiSpiegazione);
  const titoli = await domanda(page).getByRole("button").evaluateAll((els) => els.map((e) => [e.textContent, e.getAttribute("title")]));
  expect(titoli.filter(([, t]) => t !== null)).toEqual([
    [it.modificheSalva, it.rieseguiSuggerimentoSalva],
    [it.modificheNonSalvare, it.rieseguiSuggerimentoNonSalvare],
    [it.annullaEsc, it.rieseguiSuggerimentoAnnulla],
  ]);
  await domanda(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();

  await expect(scritte(page)).toHaveText(["101", "103"]);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(valoriDiPrima(page)).toHaveCount(0);
  await expect((await finzione(page)).finestre.salva).toBe(0);
  // Si va avanti coi comandi di sempre.
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["101", "103", "106"]);
});

test("Annulla fino al programma di allora riaccende «Continua» e si prosegue senza rieseguire; Ripeti torna a «Riesegui»", async ({ page }) => {
  await alTerzoPassaggio(page);
  await cambiaIlValore(page, "100");
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(valoriDiPrima(page)).toHaveCount(0);
  await page.keyboard.press("Control+y");
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(domanda(page)).toHaveCount(0);
  await expect(scritte(page)).toHaveText(["1", "3", "6"]);
});

test("una modifica che non cambia il programma lascia «Continua»", async ({ page }) => {
  await alTerzoPassaggio(page);
  // Le proprietà del progetto: non sono il programma.
  await (await voceDelMenu(page, it.progetto)).click();
  const finestra = page.getByRole("dialog", { name: it.progettoTitolo, exact: true });
  await finestra.getByLabel(it.progettoAutore, { exact: true }).fill("Prova");
  await finestra.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(valoriDiPrima(page)).toHaveCount(0);
});

test("il blocco della pausa cancellato: si dice e la pausa resta; Annulla la riporta sul disegno", async ({ page }) => {
  await alTerzoPassaggio(page);
  await blocco(page, "b4").click();
  await page.keyboard.press("Delete");
  await expect(correnti(page)).toHaveCount(0);
  await rieseguiSenzaSalvare(page);
  await expect(avviso(page)).toHaveText(it.rieseguiPostoCancellato);
  await expect(scritte(page)).toHaveText(["1", "3"]);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(barra(page, it.continua)).toHaveCount(1);
});

test("il progetto con un errore: si dice e la pausa resta, così si può correggere e riprovare", async ({ page }) => {
  await alTerzoPassaggio(page);
  await blocco(page, "b2").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoDestinazione, exact: true });
  await campo.fill("altro");
  await campo.press("Enter");
  await rieseguiSenzaSalvare(page);
  await expect(avviso(page)).toHaveText(it.rieseguiNonParte);
  await expect(scritte(page)).toHaveText(["1", "3"]);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(barra(page, it.continua)).toHaveCount(1);
});

test("il ciclo accorciato: il programma è finito prima, si dice, e l'esecuzione resta alla fine", async ({ page }) => {
  await alTerzoPassaggio(page);
  await blocco(page, "b3").focus();
  await page.keyboard.press("Enter");
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoA, exact: true });
  await campo.fill("2");
  await campo.press("Enter");
  await rieseguiSenzaSalvare(page);
  await expect(avviso(page)).toContainText(it.rieseguiFinitoPrima);
  await expect(statoDi(page)).toHaveText(it.statoFinita);
  await expect(scritte(page)).toHaveText(["1", "3", "fine"]);
});

test("la lettura di un altro dato: si dice, e resta in attesa di quel dato", async ({ page }) => {
  await alTerzoPassaggio(page);
  await blocco(page, "b1").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoDestinazione, exact: true });
  await campo.fill("s");
  await campo.press("Enter");
  await rieseguiSenzaSalvare(page);
  await expect(avviso(page)).toHaveText(it.rieseguiRigaPerUnAltroDato);
  await expect(statoDi(page)).toHaveText(riempi(it.statoChiede, { dato: "s" }));
});

test("la lettura tolta: lo stesso passaggio, e dice il valore che non è servito", async ({ page }) => {
  await alTerzoPassaggio(page);
  await blocco(page, "b1").click();
  await page.keyboard.press("Delete");
  await blocco(page, "b3").focus();
  await page.keyboard.press("Enter");
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoA, exact: true });
  await campo.fill("5");
  await campo.press("Enter");
  await rieseguiSenzaSalvare(page);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(avviso(page)).toContainText(it.rieseguiAvanzataUna);
  await expect(scritte(page)).toHaveText(["1", "3"]);
});

test("gli altri punti incontrati per strada non fermano; un punto su un blocco cancellato sparisce con lui", async ({ page }) => {
  await apriIl(page, SOMMA);
  for (const id of ["b4", "b5"]) {
    await blocco(page, id).click();
    await page.keyboard.press("F9");
  }
  await page.keyboard.press("F5");
  await daiIlValore(page, "n", "5");
  // b4, b5, b4, b5, b4: al 3° passaggio su b4.
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  for (const id of ["b5", "b4", "b5", "b4"]) {
    await page.keyboard.press("F5");
    await expect(correnti(page)).toHaveAttribute("data-blocco", id);
  }
  await expect(scritte(page)).toHaveText(["1", "3"]);
  await cambiaIlValore(page, "100");
  await rieseguiSenzaSalvare(page);
  await expect(scritte(page)).toHaveText(["101", "103"]);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");

  await expect(page.locator("[data-interruzione]")).toHaveCount(2);
  await blocco(page, "b5").click();
  await page.keyboard.press("Delete");
  await expect(page.locator("[data-interruzione]")).toHaveCount(1);
  await rieseguiSenzaSalvare(page);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(scritte(page)).toHaveCount(0);
});

test("la domanda: Annulla lascia tutto com'è; Salva su un progetto mai salvato passa dalla scelta del file; rinunciando non riesegue", async ({ page }) => {
  await alTerzoPassaggio(page);
  await cambiaIlValore(page, "100");

  await page.keyboard.press("F5");
  await domanda(page).getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(domanda(page)).toHaveCount(0);
  await expect(scritte(page)).toHaveText(["1", "3"]);
  await expect(barra(page, it.riesegui)).toHaveCount(1);

  // Rinuncia alla scelta del file: non riesegue.
  await imposta(page, { daSalvare: null });
  await page.keyboard.press("F5");
  await domanda(page).getByRole("button", { name: it.modificheSalva, exact: true }).click();
  await expect.poll(async () => (await finzione(page)).finestre.salva).toBe(1);
  await page.waitForTimeout(100);
  await expect(scritte(page)).toHaveText(["1", "3"]);

  await imposta(page, { daSalvare: "somma.algo" });
  await page.keyboard.press("F5");
  await domanda(page).getByRole("button", { name: it.modificheSalva, exact: true }).click();
  await expect(scritte(page)).toHaveText(["101", "103"]);
  expect((await finzione(page)).finestre.salva).toBe(2);
});

test("con le modifiche già salvate non chiede", async ({ page }) => {
  await alTerzoPassaggio(page);
  await cambiaIlValore(page, "100");
  await imposta(page, { daSalvare: "somma.algo" });
  await page.keyboard.press("Control+s");
  await expect.poll(async () => (await finzione(page)).finestre.salva).toBe(1);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["101", "103"]);
  await expect(domanda(page)).toHaveCount(0);
});

test("i campi aperti al comando: F5 li conferma e riesegue se il programma cambia, prosegue se non cambia; F10 non prosegue sul programma di prima", async ({ page }) => {
  await alTerzoPassaggio(page);
  // Aperti e non cambiati: si prosegue.
  await blocco(page, "b2").dblclick();
  await expect(page.getByRole("form")).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(scritte(page)).toHaveText(["1", "3", "6"]);

  // Aperti e cambiati, con F10: confermati, e il programma di prima non va avanti.
  await blocco(page, "b2").dblclick();
  await page.getByRole("form").getByRole("textbox", { name: it.campoValore, exact: true }).fill("100");
  await page.keyboard.press("F10");
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await expect(scritte(page)).toHaveText(["1", "3", "6"]);

  // Aperti e cambiati, con F5: la domanda.
  await page.keyboard.press("Control+z");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await blocco(page, "b2").dblclick();
  await page.getByRole("form").getByRole("textbox", { name: it.campoValore, exact: true }).fill("100");
  await page.keyboard.press("F5");
  await expect(domanda(page)).toBeVisible();
});

test("un ciclo diventato senza fine: lo stato dice che è in esecuzione, la pausa è finita, e «Ferma» risponde", async ({ page }) => {
  await apriIl(page, CON_IL_CICLO);
  await blocco(page, "b5").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await daiIlValore(page, "n", "2");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b5");
  await blocco(page, "b3").click();
  await page.keyboard.press("Delete");
  await rieseguiSenzaSalvare(page);
  await expect(statoDi(page)).toHaveText(it.statoInCorso);
  await expect(correnti(page)).toHaveCount(0);
  // In corso la sola lettura torna: niente campi.
  await blocco(page, "b4").dblclick();
  await expect(page.getByRole("form")).toHaveCount(0);
  await page.keyboard.press("Shift+F5");
  await expect(statoDi(page)).toHaveText(it.statoPronto);
  await expect(avviso(page)).toHaveText(it.annuncioFermata);
});

test("una riesecuzione conta come un'esecuzione nella registrazione; il blocco cancellato no, perché non esegue nulla", async ({ page }) => {
  await apriIl(page, SOMMA);
  await (await voceDellAiuto(page, it.registraAttiva)).click();
  await blocco(page, "b4").click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await daiIlValore(page, "n", "5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  const segno = page.locator("[data-in-registrazione]");
  await expect(segno).toHaveText(it.statoInRegistrazioneUna);
  await cambiaIlValore(page, "100");
  await rieseguiSenzaSalvare(page);
  await expect(scritte(page)).toHaveCount(0);
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(segno).toHaveText(riempi(it.statoInRegistrazioneMolte, { n: "2" }));
  await blocco(page, "b4").click();
  await page.keyboard.press("Delete");
  await rieseguiSenzaSalvare(page);
  await expect(avviso(page)).toHaveText(it.rieseguiPostoCancellato);
  await expect(segno).toHaveText(riempi(it.statoInRegistrazioneMolte, { n: "2" }));
  // Una riesecuzione che non parte conta, e la pausa resta quella di prima.
  await page.keyboard.press("Control+z");
  await blocco(page, "b2").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoDestinazione, exact: true });
  await campo.fill("altro");
  await campo.press("Enter");
  await rieseguiSenzaSalvare(page);
  await expect(avviso(page)).toHaveText(it.rieseguiNonParte);
  await expect(segno).toHaveText(riempi(it.statoInRegistrazioneMolte, { n: "3" }));
  await page.keyboard.press("Shift+F5");
  await expect(segno).toHaveText(riempi(it.statoInRegistrazioneMolte, { n: "3" }));
});

test("il watch: spento finché il programma è diverso, di nuovo acceso dopo la riesecuzione", async ({ page }) => {
  await alTerzoPassaggio(page);
  const nomi = page.locator('[data-blocco="b4"] [data-watch-dato]');
  const prima = await nomi.count();
  expect(prima, "i nomi nel blocco, in pausa").toBeGreaterThan(0);
  await cambiaIlValore(page, "100");
  await expect(nomi).toHaveCount(0);
  await rieseguiSenzaSalvare(page);
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(nomi).toHaveCount(prima);
});

test("una colonna nuova: la tabella la mostra dopo la riesecuzione, non prima", async ({ page }) => {
  await alTerzoPassaggio(page);
  const colonne = page.locator("table[data-traccia] thead th");
  const prima = await colonne.count();
  await barra(page, it.pannelloDati).click();
  await page.getByRole("button", { name: it.aggiungiDato, exact: true }).click();
  const nome = page.getByRole("textbox", { name: it.datiNome, exact: true }).or(page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "4" }), exact: true }));
  await nome.fill("nuovo");
  await nome.press("Enter");
  await expect(page.locator("[data-valori-di-prima]")).toBeVisible();
  await expect(colonne).toHaveCount(prima);
  await rieseguiSenzaSalvare(page);
  await expect(barra(page, it.continua)).toHaveCount(1);
  await expect(colonne).toHaveCount(prima + 1);
});

test("nel modo caso: le letture le dà il caso, lo stesso passaggio, e la fine dice l'esito del caso", async ({ page }) => {
  const conIlCaso = JSON.stringify({ ...JSON.parse(SOMMA), test_cases: [{ name: "cinque", inputs: [{ data: "n", text: "5" }], expected: { output: "101\n103\n106\n110\n115\nfine\n" } }] });
  await apriIl(page, conIlCaso);
  await blocco(page, "b4").click();
  await page.keyboard.press("F9");
  await page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ }).click();
  await page.getByRole("button", { name: riempi(it.casoEseguiIl, { nome: "cinque" }), exact: true }).click();
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(1);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveCount(2);
  await cambiaIlValore(page, "100");
  await rieseguiSenzaSalvare(page);
  await expect(scritte(page)).toHaveText(["101", "103"]);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.locator('[data-blocco="b4"]').click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFinita);
  await expect(avviso(page)).toHaveText(riempi(it.esitoDelCasoRaggiunto, { nome: "cinque" }));
});

// ---------------------------------------------------------------------- gesto per gesto, nei quattro stati

/** Un programma lento (`n` = 1 resta in corso per minuti), con un caso d'uso che lo fa restare in corso. */
const LENTO = JSON.stringify({
  ...JSON.parse(
    progetto(
      [
        { id: "b1", kind: "read", target: "n" },
        { id: "b2", kind: "write", values: ["n"], newline: true },
        { id: "b3", kind: "while", condition: "n > 0", body: [{ id: "b4", kind: "assignment", target: "y", value: "1.1 raised_to 1100" }] },
      ],
      [{ name: "n", type: "integer" }, { name: "y", type: "real" }],
    ),
  ),
  test_cases: [{ name: "lento", inputs: [{ data: "n", text: "1" }], expected: { output: "1\n" } }],
});

/** Ciò che si può fare adesso: i gesti di modifica provati davvero, e il comando che fa partire i casi. */
async function iGesti(page: Page): Promise<Record<string, boolean>> {
  await page.mouse.move(600, 400);
  const piu = (await page.locator("[data-punto]").count()) > 0;
  await blocco(page, "b2").dblclick();
  const campi = (await page.getByRole("form").count()) > 0;
  if (campi) await page.keyboard.press("Escape");
  await blocco(page, "b2").click({ button: "right" });
  const menu = (await page.getByRole("menu").count()) > 0;
  if (menu) await page.keyboard.press("Escape");
  await blocco(page, "b2").click();
  const taglia = (await barra(page, it.taglia).getAttribute("aria-disabled")) === "false";
  await (await voceDelMenu(page, it.progetto)).waitFor();
  const proprieta = (await page.getByRole("menuitem", { name: it.progetto, exact: true }).getAttribute("aria-disabled")) !== "true";
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  const tab = page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ });
  if (!(await tab.isVisible())) await barra(page, it.pannelloDati).click();
  await tab.click();
  const aggiungiCaso = (await page.getByRole("button", { name: it.aggiungiCaso, exact: true }).count()) > 0;
  const eseguiTutti = (await page.getByRole("button", { name: it.eseguiTutti, exact: true }).getAttribute("aria-disabled").catch(() => "true")) !== "true" && (await page.getByRole("button", { name: it.eseguiTutti, exact: true }).isEnabled());
  await page.getByRole("tab", { name: /^Dati \(\d+\)$/ }).click();
  const aggiungiDato = (await page.getByRole("button", { name: it.aggiungiDato, exact: true }).count()) > 0;
  return { piu, campi, menu, taglia, proprieta, aggiungiCaso, aggiungiDato, eseguiTutti };
}

const SI_MODIFICA = { piu: true, campi: true, menu: true, taglia: true, proprieta: true, aggiungiCaso: true, aggiungiDato: true };
const SOLA_LETTURA = { piu: false, campi: false, menu: false, taglia: false, proprieta: false, aggiungiCaso: false, aggiungiDato: false };

test("in pausa si modifica tutto e i casi d'uso non partono; in attesa di una riga, in corso e con «tutti i casi» è sola lettura; da fermi tutto acceso", async ({ page }) => {
  test.setTimeout(120_000);
  await apriIl(page, LENTO);
  // Controllo positivo: da fermi ogni gesto riesce, e i casi partono.
  expect(await iGesti(page), "da fermi").toEqual({ ...SI_MODIFICA, eseguiTutti: true });

  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveCount(1);
  expect(await iGesti(page), "in pausa").toEqual({ ...SI_MODIFICA, eseguiTutti: false });
  await page.keyboard.press("Shift+F5");

  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(riempi(it.statoChiede, { dato: "n" }));
  expect(await iGesti(page), "in attesa di una riga").toEqual({ ...SOLA_LETTURA, eseguiTutti: false });

  await daiIlValore(page, "n", "1");
  await expect(statoDi(page)).toHaveText(it.statoInCorso);
  expect(await iGesti(page), "in corso").toEqual({ ...SOLA_LETTURA, eseguiTutti: false });
  await page.keyboard.press("Shift+F5");
  await expect(statoDi(page)).toHaveText(it.statoPronto);

  await page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ }).click();
  await page.getByRole("button", { name: it.eseguiTutti, exact: true }).click();
  await expect(page.getByRole("button", { name: it.ferma, exact: true }).first()).toBeVisible();
  expect(await iGesti(page), "con «tutti i casi»").toEqual({ ...SOLA_LETTURA, eseguiTutti: false });
  await page.keyboard.press("Shift+F5");
});
