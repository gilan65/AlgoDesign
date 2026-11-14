// Ciò che l'interfaccia fa diverso sul Mac, nei motori col motore che si presenta come quello del Mac (`userAgent`),
// accanto allo stesso motore che si presenta come Windows (il controllo):
// - i suggerimenti dei tasti coi simboli del Mac e Cmd al posto di Ctrl (Salva ⌘S, Ripeti ⇧⌘Z, Salva con nome ⇧⌘S nel
//   menu «Progetto»), anche per gli ausili (`aria-keyshortcuts`); fuori dal Mac Ctrl, come prima;
// - ⌫ sul blocco col fuoco lo toglie; fuori dal Mac no;
// - il menu in cima allo schermo: i testi mandati al guscio all'avvio e di nuovo a ogni cambio di lingua (fuori dal Mac
//   mai); le sue voci Informazioni e Impostazioni aprono le loro finestre, ma non sopra un'altra finestra.
//
// CHE COSA NON GUARDA: il menu vero e l'uscita dall'app (li fa il guscio con macOS: la prova è sul Mac del servizio di
// build); il WebKit del Mac (questo è Chromium che si presenta come lui: conta solo per ciò che l'interfaccia decide
// dal nome del motore).
import { expect, test, type Page } from "@playwright/test";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { vociDelMenu } from "../ui/menu";
import { apri, apriVuota, costruisciFinzione, scegliLingua, TASTI_DI_WINDOWS_E_LINUX, voceDelMenu, webkitFuoriDaLinux } from "./pagina";

test.beforeAll(costruisciFinzione);

const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/** I menu mandati al guscio, senza i doppioni di fila (in sviluppo `StrictMode` fa girare gli effetti due volte). */
const menuMandati = (page: Page) =>
  page.evaluate(() => window.__finzione__.menu?.filter((m, i, tutti) => i === 0 || JSON.stringify(m) !== JSON.stringify(tutti[i - 1])) ?? null);
const nellaBarra = (page: Page, nome: string) => page.getByRole("banner").getByRole("button", { name: nome, exact: true });
const blocchi = (page: Page) => page.locator("[data-blocco]").count();
const voceDelMac = (page: Page, voce: string) => page.evaluate((v) => window.dispatchEvent(new CustomEvent("algodesign-menu", { detail: v })), voce);

/** ⌫ sul primo blocco, col fuoco dato dal clic; quanti blocchi restano, prima e dopo. */
async function indietroSulPrimoBlocco(page: Page): Promise<[number, number]> {
  const prima = await blocchi(page);
  await page.locator("[data-blocco]").first().click();
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(100);
  return [prima, await blocchi(page)];
}

test.describe("sul Mac", () => {
  test.use({ userAgent: MAC });

  test("i tasti coi simboli del Mac, ⌫ che toglie il blocco", async ({ page }) => {
    await apri(page, { lingua: "it" });
    await expect(nellaBarra(page, it.salva)).toHaveAttribute("title", `${it.salva} (⌘S)`);
    await expect(nellaBarra(page, it.salva)).toHaveAttribute("aria-keyshortcuts", "Meta+S");
    await expect(nellaBarra(page, it.ripeti)).toHaveAttribute("title", `${it.ripeti} (⇧⌘Z)`);
    await expect(nellaBarra(page, it.ferma)).toHaveAttribute("title", `${it.ferma} (⇧F5)`);
    await expect((await voceDelMenu(page, it.salvaConNome)).locator("[data-tasto]")).toHaveText("⇧⌘S");
    await page.keyboard.press("Escape");
    const [prima, dopo] = await indietroSulPrimoBlocco(page);
    expect(dopo).toBe(prima - 1);
  });

  test("il menu del Mac nella lingua dell'interfaccia, di nuovo a ogni cambio; Informazioni e Impostazioni dal menu", async ({ page }) => {
    await apriVuota(page, { lingua: "it" });
    await expect.poll(() => menuMandati(page)).toEqual([vociDelMenu(it)]);
    await scegliLingua(page, "en");
    await expect.poll(() => menuMandati(page)).toEqual([vociDelMenu(it), vociDelMenu(en)]);
    // Le voci del menu aprono le loro finestre; con una finestra aperta un'altra voce non apre nulla.
    await voceDelMac(page, "impostazioni");
    const impostazioni = page.getByRole("dialog", { name: en.impostazioniTitolo, exact: true });
    await expect(impostazioni).toBeVisible();
    await voceDelMac(page, "informazioni");
    await page.waitForTimeout(100);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(impostazioni).toBeHidden();
    await voceDelMac(page, "informazioni");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(impostazioni).toHaveCount(0);
    // Una voce che la pagina non conosce non fa nulla.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await voceDelMac(page, "esci");
    await page.waitForTimeout(100);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("fuori dal Mac", () => {
  test.use({ userAgent: WINDOWS });

  test("i tasti con Ctrl come prima, ⌫ non tocca il blocco, nessun menu mandato al guscio", async ({ page, browserName }) => {
    test.skip(webkitFuoriDaLinux(browserName), TASTI_DI_WINDOWS_E_LINUX);
    await apri(page, { lingua: "it" });
    await expect(nellaBarra(page, it.salva)).toHaveAttribute("title", `${it.salva} (Ctrl+S)`);
    await expect(nellaBarra(page, it.salva)).toHaveAttribute("aria-keyshortcuts", "Control+S");
    await expect(nellaBarra(page, it.ripeti)).toHaveAttribute("title", `${it.ripeti} (Ctrl+Y)`);
    await expect((await voceDelMenu(page, it.salvaConNome)).locator("[data-tasto]")).toHaveText("Ctrl+Maiusc+S");
    await page.keyboard.press("Escape");
    const [prima, dopo] = await indietroSulPrimoBlocco(page);
    expect(prima).toBeGreaterThan(0);
    expect(dopo).toBe(prima);
    expect(await menuMandati(page)).toBeNull();
  });
});
