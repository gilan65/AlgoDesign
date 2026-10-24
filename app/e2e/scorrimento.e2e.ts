// La barra di scorrimento del pannello coi campi aperti, nei motori veri: un clic sulla barra fa scorrere il pannello e non
// conferma i campi (di un caso d'uso e di un dato), che restano aperti; un clic sul flowchart li conferma e li chiude
// (controllo positivo). Premessa: con una finestra bassa il pannello scorre e ha una barra larga più di zero.
//
// Chromium senza finestra nasconde le barre di scorrimento (`--hide-scrollbars`, un argomento predefinito di
// Playwright): qui le si rimette, per tutto il file, perché la prova clicca la barra vera.
//
// CHE COSA NON GUARDA:
// - WebKit di Playwright, dove le barre sono sovrapposte al contenuto (larghe zero): lì si controlla solo la premessa, e
//   la riga stampata lo dice;
// - la barra di altri elementi che scorrono (il flowchart, la console): la regola è la stessa (`ui/fuori.ts`), qui si
//   prova sul pannello, dove l'utente l'ha trovata;
// - la rotella e la tastiera, che non premono il puntatore e non hanno mai chiuso i campi;
// - la WebView2 e WebKitGTK.

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriEsempio, apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

async function apriICasi(page: Page, testo: string): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 casi.algo": testo } });
  await apriEsempio(page, 0);
  await page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ }).click();
}

test("un clic sulla barra di scorrimento del pannello non chiude i campi aperti (di un caso e di un dato); un clic altrove sì", async ({ page, browserName }) => {
  // Una finestra bassa: i campi aperti fanno scorrere il pannello.
  await page.setViewportSize({ width: 1280, height: 420 });
  const testo = readFileSync(fileURLToPath(new URL("../casi/tappa-1/riferimento-media-voti.algo", import.meta.url)), "utf8");
  await apriICasi(page, testo);
  const pannello = page.getByRole("region", { name: it.vistaDati, exact: true });
  const campi = [
    { nome: "i campi di un caso", apri: () => page.locator("tr[data-caso]").first().dblclick(), modulo: page.locator("form[data-campi-caso]") },
    {
      nome: "la scheda di un dato",
      apri: async () => {
        await page.getByRole("tab", { name: /^Dati \(\d+\)$/ }).click();
        await page.locator('tr[data-dato="dati-0"]').dblclick();
      },
      modulo: page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: "n" }), exact: true }),
    },
  ];
  const visti: string[] = [];
  for (const c of campi) {
    await c.apri();
    await expect(c.modulo, `${c.nome}: aperti`).toBeVisible();
    // La barra di scorrimento verticale del pannello: la sua larghezza e il punto, a metà della barra, sotto la cima.
    const barra = await pannello.evaluate((p: HTMLElement) => {
      const r = p.getBoundingClientRect();
      const s = getComputedStyle(p);
      const larga = p.offsetWidth - p.clientWidth - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth);
      return { larga, scorre: p.scrollHeight > p.clientHeight, x: r.right - parseFloat(s.borderRightWidth) - larga / 2, y: r.bottom - 30, prima: p.scrollTop };
    });
    // Premessa: il pannello scorre e ha una barra da prendere. Il WebKit di Playwright ha barre sovrapposte al contenuto,
    // larghe zero: lì la barra non si clicca come una striscia a parte, e la prova lo dice invece di cliccare.
    const sovrapposta = browserName === "webkit" && barra.larga === 0;
    expect({ cosa: c.nome, scorre: barra.scorre, barra: barra.larga > 0 || sovrapposta }).toEqual({ cosa: c.nome, scorre: true, barra: true });
    if (sovrapposta) {
      visti.push(`${c.nome}: barra sovrapposta (larga 0 px), nessun clic sulla barra`);
      await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
      await expect(c.modulo).toHaveCount(0);
      continue;
    }
    await page.mouse.click(barra.x, barra.y);
    await page.waitForTimeout(300);
    const dopo = await pannello.evaluate((p: HTMLElement) => p.scrollTop);
    visti.push(`${c.nome}: barra ${barra.larga} px, scorrimento da ${barra.prima} a ${dopo}`);
    await expect(c.modulo, `${c.nome}: un clic sulla barra di scorrimento li ha chiusi`).toBeVisible();
    expect(dopo, `${c.nome}: il clic sulla barra ha fatto scorrere il pannello`).toBeGreaterThan(barra.prima);
    // Controllo positivo: un clic sul flowchart li conferma e li chiude.
    await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
    await expect(c.modulo, `${c.nome}: un clic altrove non li ha chiusi`).toHaveCount(0);
  }
  console.log(`barra di scorrimento del pannello: ${visti.join("; ")}`);
});
