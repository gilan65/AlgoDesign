// Le procedure e le funzioni nei motori, coi gesti veri, sul programma di riferimento con le funzioni aperto all'avvio
// (`casi/tappa-3/riferimento-media-voti-funzioni.algo`: `leggi_numero` f2, `valido` f3, `stelle` f4; il rombo `b4`
// chiama `valido`):
// - le schede sopra il flowchart, che non lo coprono; il tasto destro su una scheda apre il suo menu, Esc lo chiude e
//   torna sulla scheda; le frecce passano alla vicina;
// - l'elenco dalla tastiera: il fuoco nella ricerca, la freccia giù sulla prima voce, Invio la apre; Esc torna al
//   pulsante;
// - l'eliminazione: la finestra d'allerta col fuoco sul comando che non elimina (un Invio di troppo non perde nulla), la
//   spunta, la conferma globale e il rombo, e Annulla che riporta tutto;
// - il file salvato dopo l'eliminazione e dopo Annulla: identico a quello aperto.
// - la correzione del rif senza valore nella riga di stato, col clic e con Invio, e Annulla.
//
// Che cosa NON guarda: ogni operazione e ogni passo della finestra (sotto happy-dom: `ui/funzioni/funzioni.test.tsx`).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });

const PERCORSO = "C:\\Documenti\\funzioni.algo";
const TESTO = readFileSync(fileURLToPath(new URL("../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8");

async function apriIlRiferimento(page: Page): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { argomento: PERCORSO, file: { [PERCORSO]: TESTO } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "funzioni.algo" }));
}
const scheda = (page: Page, id: string) => page.locator(`[data-scheda="${id}"]`);
/** Il testo disegnato di un blocco (il disegno, non lo strato che lo rende raggiungibile). */
const testoDel = (page: Page, id: string) => page.locator(`g[data-id="${id}"]:not([data-fase]) text`);

test("le schede stanno sopra il flowchart; il tasto destro apre il menu, Esc torna sulla scheda, le frecce passano alla vicina", async ({ page }) => {
  await apriIlRiferimento(page);
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f3"]').click();
  await expect(scheda(page, "f3")).toHaveAttribute("aria-selected", "true");
  // La fila non copre il flowchart: finisce dove l'area del disegno comincia.
  const fila = (await page.locator("[data-schede]").boundingBox())!;
  const area = (await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).boundingBox())!;
  expect(area.y).toBeGreaterThanOrEqual(fila.y + fila.height - 1);
  await scheda(page, "f3").click({ button: "right" });
  const menu = page.getByRole("menu", { name: riempi(it.menuDellaFunzione, { nome: "valido" }), exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText([it.menuApri, it.menuRinomina, it.menuProprieta, it.menuDuplica, it.menuEliminaFunzione, it.menuChiudiScheda]);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(scheda(page, "f3")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(scheda(page, "f1")).toHaveAttribute("aria-selected", "true");
  await expect(scheda(page, "f1")).toBeFocused();
  // Dalla tastiera, il tasto Menu sulla scheda (Maiusc+F10).
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+F10");
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
});

test("l'elenco dalla tastiera: la ricerca, la freccia giù, Invio apre; Esc torna al pulsante", async ({ page }) => {
  await apriIlRiferimento(page);
  const pulsante = page.locator("[data-elenco-funzioni]");
  await pulsante.click();
  const ricerca = page.getByRole("searchbox", { name: it.cercaFunzione, exact: true });
  await expect(ricerca).toBeFocused();
  await page.keyboard.type("ste");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-voce-funzione="f4"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(scheda(page, "f4")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("table", { name: `${it.dati}: stelle`, exact: true })).toBeVisible();
  await pulsante.click();
  await expect(ricerca).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-elenco]")).toHaveCount(0);
  await expect(pulsante).toBeFocused();
});

test("eliminare: il fuoco parte da «Non eliminare», la spunta e le due conferme; Annulla riporta il file com'era", async ({ page }) => {
  await apriIlRiferimento(page);
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f3"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: it.menuEliminaFunzione, exact: true }).click();
  const allerta = page.getByRole("alertdialog", { name: riempi(it.eliminaFunzioneTitoloF, { nome: "valido" }), exact: true });
  await expect(allerta).toBeVisible();
  await expect(allerta.locator("[data-elimina-no]")).toBeFocused();
  // Un Invio di troppo: nulla è eliminato.
  await page.keyboard.press("Enter");
  await expect(allerta).toBeHidden();
  await expect(page.locator("[data-elenco-funzioni]")).toContainText("(3)");
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f3"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: it.menuEliminaFunzione, exact: true }).click();
  await allerta.getByRole("checkbox", { name: it.toglilaDalleEspressioni, exact: true }).check();
  await allerta.locator("[data-elimina-si]").click();
  await expect(allerta.locator('[data-passo="globale"]')).toHaveText(it.eliminaGlobaleUna);
  await expect(allerta.locator("[data-elimina-no]")).toBeFocused();
  await allerta.locator("[data-elimina-si]").click();
  await expect(allerta.locator('[data-passo="rombo"]')).toBeVisible();
  await allerta.locator("[data-elimina-si]").click();
  await expect(allerta).toBeHidden();
  await expect(testoDel(page, "b4")).toHaveText("false");
  await expect(page.locator("[data-elenco-funzioni]")).toContainText("(2)");
  await page.keyboard.press("Control+z");
  await expect(testoDel(page, "b4")).toHaveText("valido(voto)");
  // Il file salvato è quello aperto, byte per byte.
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toHaveText(riempi(it.salvatoIl, { file: "funzioni.algo" }));
  const salvato = await page.evaluate((p) => (window as unknown as { __finzione__: { file: Record<string, string> } }).__finzione__.file[p], PERCORSO);
  expect(salvato).toBe(TESTO);
});

test("il rif senza valore: la correzione nella riga di stato si preme col clic e con Invio; Annulla la riporta", async ({ page }) => {
  // Il riferimento com'era scritto prima: `leggi_numero` riceve `numero` per riferimento, e `n` non ha un valore.
  const conRif = TESTO.replace('"parameter": "out"', '"parameter": "reference"');
  expect(conRif).not.toBe(TESTO);
  await apriVuota(page, { lingua: "it" }, { argomento: PERCORSO, file: { [PERCORSO]: conRif } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "funzioni.algo" }));
  const riga = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  const comando = riga.getByRole("button", { name: riempi(it.sostituisciConOut, { nome: "n" }), exact: true });
  await riga.getByRole("button", { name: it.statoMostra, exact: true }).click();
  // Con Invio: il fuoco sul comando, poi il tasto.
  await comando.focus();
  await page.keyboard.press("Enter");
  await expect(riga).toContainText(it.statoNessuno);
  await expect(testoDel(page, "b1")).toHaveText(`↪ leggi_numero(${it.disegnoOut} n)`);
  // Annulla mostra la scheda dove è avvenuto il passo, la procedura, col rif di nuovo nell'intestazione.
  await page.keyboard.press("Control+z");
  await expect(scheda(page, "f2")).toHaveAttribute("aria-selected", "true");
  await expect(testoDel(page, "f2")).toHaveText(`Procedura leggi_numero(${it.disegnoRif} numero)`);
  // Col clic, dalla scheda del programma.
  await scheda(page, "f1").click();
  await expect(testoDel(page, "b1")).toHaveText(`↪ leggi_numero(${it.disegnoRif} n)`);
  await comando.click();
  await expect(testoDel(page, "b1")).toHaveText(`↪ leggi_numero(${it.disegnoOut} n)`);
  // Il file salvato è quello del corpus, col parametro di uscita, byte per byte.
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toHaveText(riempi(it.salvatoIl, { file: "funzioni.algo" }));
  const salvato = await page.evaluate((p) => (window as unknown as { __finzione__: { file: Record<string, string> } }).__finzione__.file[p], PERCORSO);
  expect(salvato).toBe(TESTO);
});
