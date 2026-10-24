import { expect, test, type Page } from "@playwright/test";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { nomiLingue } from "../i18n/lingue";
import { fileDa, scelteIniziali } from "../ui/preferenze";
import { apri, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);

/** Il comando delle Impostazioni nella barra, coi testi di una lingua: c'è solo nella lingua mostrata. */
const impostazioni = (page: Page, testi = it) => page.getByRole("banner").getByRole("button", { name: testi.impostazioni, exact: true });

/** La lingua scelta nelle Impostazioni, aperte coi testi di quella mostrata. */
async function linguaScelta(page: Page, testi = it): Promise<string | null> {
  await impostazioni(page, testi).click();
  const finestra = page.getByRole("dialog", { name: testi.impostazioniTitolo, exact: true });
  const scelta = finestra.getByRole("group", { name: testi.etichettaLingua, exact: true }).getByRole("radio", { checked: true });
  const nome = await scelta.evaluate((e) => (e as HTMLInputElement).value);
  await page.keyboard.press("Escape");
  await expect(finestra).toBeHidden();
  return nome;
}

test.describe("sistema in italiano", () => {
  test.use({ locale: "it-IT" });

  test("senza preferenza salvata parte in italiano", async ({ page }) => {
    await apri(page, null);
    await expect(impostazioni(page, it)).toBeVisible();
    expect(await linguaScelta(page, it)).toBe("it");
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
  });

  test("la preferenza salvata vince sulla lingua del sistema", async ({ page }) => {
    await apri(page, { lingua: "en" });
    await expect(impostazioni(page, en)).toBeVisible();
    await expect(page.getByText(en.premessa)).toBeVisible();
  });

  test("il cambio di lingua, confermato, cambia i testi e scrive la preferenza", async ({ page }) => {
    await apri(page, null);
    await expect(page.getByText(it.premessa)).toBeVisible();

    await impostazioni(page, it).click();
    const finestra = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
    await finestra.getByRole("radio", { name: nomiLingue.en, exact: true }).check();
    // Prima di «Conferma» non cambia nulla.
    await expect(page.getByText(it.premessa)).toBeVisible();
    await finestra.getByRole("button", { name: it.progettoConferma, exact: true }).click();
    await expect(finestra).toBeHidden();

    await expect(impostazioni(page, en)).toBeVisible();
    await expect(page.getByText(en.premessa)).toBeVisible();
    // L'assenza si misura dopo che il testo nuovo è comparso.
    await expect(page.getByText(it.premessa)).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect.poll(() => page.evaluate(() => window.__finzione__.scritte)).toEqual([{ preferenze: fileDa("en", scelteIniziali) }]);
  });

  test("con «Annulla» la lingua resta e non si scrive nulla", async ({ page }) => {
    await apri(page, null);
    await impostazioni(page, it).click();
    const finestra = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
    await finestra.getByRole("radio", { name: nomiLingue.en, exact: true }).check();
    await finestra.getByRole("button", { name: it.annullaEsc, exact: true }).click();
    await expect(finestra).toBeHidden();
    await expect(page.getByText(it.premessa)).toBeVisible();
    expect(await page.evaluate(() => window.__finzione__.scritte)).toEqual([]);
    // Riaperta, la finestra riparte dalla lingua in uso.
    expect(await linguaScelta(page, it)).toBe("it");
  });
});

test.describe("sistema in un'altra lingua", () => {
  test.use({ locale: "fr-FR" });

  test("senza preferenza salvata parte in inglese", async ({ page }) => {
    await apri(page, null);
    await expect(impostazioni(page, en)).toBeVisible();
    expect(await linguaScelta(page, en)).toBe("en");
  });
});
