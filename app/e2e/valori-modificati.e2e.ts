// «Riesegui» con valori modificati a mano: dopo la domanda di salvare, le tre scelte; senza valori modificati non chiede. Il valore si scrive dalla prova, finché la finestra
// non ha il suo gesto (`ui/esecuzione/modifica-di-prova.ts`).
//
// Il programma: `n` letta (riga «5»), `s = 0`, per `i` da 1 a `n`: `s = s + i` (il blocco del punto), scrivi `s`; poi scrivi «fine». Fermi su `s = s + i` al 3° passaggio la
// console ha «1» e «3»; `s` portata a 100; poi il programma cambia: `s = 10` al posto di `s = 0`.
//
// Che cosa NON guarda: l'esito nel nucleo (`core/esecuzione/ripartenza-con-modifiche.test.ts`); il gesto, il colore e le forme della cella.
import { expect, test, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriEsempio, apriVuota, costruisciFinzione, voceDellAiuto } from "./pagina";

test.beforeAll(async () => {
  await costruisciFinzione();
});

const SOMMA = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "somma" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "n", type: "integer" }, { name: "s", type: "integer" }, { name: "i", type: "integer" }],
      body: [
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
      ],
      end: { id: "b9" },
    },
  ],
});

const barra = (page: Page, nome: string) => page.getByRole("banner").getByRole("button", { name: nome, exact: true });
const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const correnti = (page: Page) => page.locator('[aria-current="step"]');
const scritte = (page: Page) => page.getByRole("log", { name: it.console, exact: true }).locator("[data-scrive]");
const avviso = (page: Page) => page.locator('output[role="status"]');
const salvare = (page: Page) => page.getByRole("alertdialog", { name: riempi(it.rieseguiTitolo, { nome: "somma" }), exact: true });
const leTreScelte = (page: Page) => page.getByRole("alertdialog", { name: it.valoriTitolo, exact: true });
const scelta = (page: Page, nome: string) => leTreScelte(page).getByRole("button", { name: nome, exact: true });
const campoDi = (page: Page, dato: string) => page.getByRole("textbox", { name: riempi(it.consoleValore, { dato }), exact: true });

async function daiIlValore(page: Page, dato: string, valore: string): Promise<void> {
  const campo = campoDi(page, dato);
  await campo.fill(valore);
  await campo.press("Enter");
}

async function alTerzoPassaggio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__modificaDiProva__ = true;
  });
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 somma.algo": SOMMA } });
  await apriEsempio(page, 0);
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

async function modificaIlValore(page: Page, dato: string, testo: string): Promise<void> {
  const esito = await page.evaluate(([d, t]) => (window.__modificaDiProva__ as (b: { dato: string; elemento: number }, testo: string) => unknown)({ dato: d!, elemento: 0 }, t!), [dato, testo]);
  expect(esito).toEqual({ ok: true });
}

async function cambiaIlProgramma(page: Page): Promise<void> {
  await blocco(page, "b2").dblclick();
  const campo = page.getByRole("form").getByRole("textbox", { name: it.campoValore, exact: true });
  await campo.fill("10");
  await campo.press("Enter");
  await expect(page.getByRole("form")).toHaveCount(0);
}

/** F5 con il programma cambiato e un valore modificato: prima la domanda di salvare, poi le tre scelte. */
async function finoAlleTreScelte(page: Page): Promise<void> {
  await alTerzoPassaggio(page);
  await modificaIlValore(page, "s", "100");
  await cambiaIlProgramma(page);
  await page.keyboard.press("F5");
  await expect(salvare(page)).toBeVisible();
  await expect(leTreScelte(page)).toHaveCount(0);
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect(leTreScelte(page)).toBeVisible();
}

test("le tre scelte vengono dopo la domanda di salvare, coi loro suggerimenti, e il fuoco sulla prima", async ({ page }) => {
  await finoAlleTreScelte(page);
  await expect(leTreScelte(page)).toContainText(it.valoriSpiegazione);
  const titoli = await leTreScelte(page).getByRole("button").evaluateAll((els) => els.map((e) => [e.textContent, e.getAttribute("title")]));
  expect(titoli.filter(([, t]) => t !== null)).toEqual([
    [it.valoriTieni, it.valoriTieniSuggerimento],
    [it.valoriRicalcola, it.valoriRicalcolaSuggerimento],
    [it.valoriReinserisci, it.valoriReinserisciSuggerimento],
    [it.annullaEsc, it.rieseguiSuggerimentoAnnulla],
  ]);
  await expect(scelta(page, it.valoriTieni)).toBeFocused();
});

test("«Tieni i valori modificati»: allo stesso passaggio col programma nuovo, e il valore riapplicato allo stesso punto", async ({ page }) => {
  await finoAlleTreScelte(page);
  await scelta(page, it.valoriTieni).click();
  await expect(scritte(page)).toHaveText(["11", "13"]);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await page.keyboard.press("F5");
  // `s` è 100 più il contatore, 3.
  await expect(scritte(page)).toHaveText(["11", "13", "103"]);
});

test("«Ricalcola, con le stesse letture»: allo stesso passaggio col programma nuovo, senza quel valore", async ({ page }) => {
  await finoAlleTreScelte(page);
  await scelta(page, it.valoriRicalcola).click();
  await expect(scritte(page)).toHaveText(["11", "13"]);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["11", "13", "16"]);
});

test("«Reinserisci le letture»: da capo, la prima lettura si chiede di nuovo", async ({ page }) => {
  await finoAlleTreScelte(page);
  await scelta(page, it.valoriReinserisci).click();
  await expect(campoDi(page, "n")).toBeVisible();
  await expect(scritte(page)).toHaveCount(0);
  await daiIlValore(page, "n", "1");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["11", "fine"]);
});

test("«Annulla» e Esc lasciano la pausa com'è, e la domanda si ripropone", async ({ page }) => {
  await finoAlleTreScelte(page);
  // Con la finestra aperta i tasti dell'esecuzione non fanno nulla.
  await page.keyboard.press("F5");
  await page.keyboard.press("F10");
  await expect(leTreScelte(page)).toBeVisible();
  // Dal documento e non dall'albero dell'accessibilità: con una finestra aperta la console ne esce.
  await expect(page.locator("[data-scrive]")).toHaveText(["1", "3"]);
  await scelta(page, it.annullaEsc).click();
  await expect(leTreScelte(page)).toHaveCount(0);
  await expect(scritte(page)).toHaveText(["1", "3"]);
  await expect(barra(page, it.riesegui)).toHaveCount(1);
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect(leTreScelte(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(leTreScelte(page)).toHaveCount(0);
  await expect(scritte(page)).toHaveText(["1", "3"]);
});

test("senza valori modificati non chiede: il controllo positivo della domanda", async ({ page }) => {
  await alTerzoPassaggio(page);
  await cambiaIlProgramma(page);
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect(scritte(page)).toHaveText(["11", "13"]);
  await expect(leTreScelte(page)).toHaveCount(0);
});

test("il programma non cambiato prosegue col valore, senza chiedere; e la segnalazione porta la modifica", async ({ page }) => {
  await alTerzoPassaggio(page);
  await modificaIlValore(page, "s", "100");
  await expect(barra(page, it.continua)).toHaveCount(1);
  await (await voceDellAiuto(page, it.segnalaComando)).click();
  const finestra = page.getByRole("dialog", { name: it.segnalaTitolo, exact: true });
  await expect(finestra).toContainText('"changes"');
  await expect(finestra).toContainText('"text": "100"');
  await page.keyboard.press("Escape");
  await expect(finestra).toHaveCount(0);
  await page.keyboard.press("F5");
  await expect(scritte(page)).toHaveText(["1", "3", "103"]);
  await expect(leTreScelte(page)).toHaveCount(0);
});

test("un valore modificato perso lo dice il motivo: il blocco della modifica cancellato", async ({ page }) => {
  await alTerzoPassaggio(page);
  await page.keyboard.press("F10");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b5");
  await modificaIlValore(page, "s", "100");
  await page.keyboard.press("F5");
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
  await blocco(page, "b5").click();
  await page.keyboard.press("Delete");
  await expect(blocco(page, "b5")).toHaveCount(0);
  await page.keyboard.press("F5");
  await salvare(page).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await scelta(page, it.valoriTieni).click();
  await expect(avviso(page)).toContainText(it.rieseguiModificaPersa);
  await expect(correnti(page)).toHaveAttribute("data-blocco", "b4");
});
