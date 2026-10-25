// La finestra «Guida» e la lingua nella riga di stato nei motori, col guscio simulato e il riferimento della media dei
// voti aperto: la guida sul progetto «anteprima» viene dal `dist/` della build (la macro che converte il Markdown ha
// girato lì), sul progetto di sviluppo dal server di sviluppo.
//
// - La guida dal menu «Aiuto»: a destra, fra la barra e la riga di stato senza coprirle; i capitoli dell'indice sono
//   quelli del Markdown di `docs/` letto qui dal disco, e un clic porta il capitolo in cima al testo; il menu «Aiuto»
//   aperto con la guida aperta sta sopra di lei (un clic sulla voce arriva alla voce); F10 fa un passo; Esc la chiude.
// - La lingua cambiata dalla riga di stato con la guida aperta: la guida in inglese, sullo stesso capitolo.
// - La ricerca: le parole trovate come nel Markdown, Invio porta la successiva dentro il testo visibile.
// - Con la preferenza la guida si sposta dal titolo e si ridimensiona dall'angolo; chiusa e riaperta torna lì, e in una
//   finestra diventata più stretta rientra tutta.
//
// CHE COSA NON GUARDA: ogni parola del testo contro il Markdown (la prova di unità `ui/guida/guida.test.ts`, sull'HTML
// della stessa conversione); la WebView2 vera (la prova sul prodotto).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apri, costruisciFinzione, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ locale: "it-IT" });

const markdown = (nome: string) => readFileSync(fileURLToPath(new URL(`../../docs/${nome}`, import.meta.url)), "utf8").replaceAll("\r\n", "\n");
const capitoliDi = (md: string) => [...md.matchAll(/^## (.*)$/gm)].map((m) => m[1]!.replace(/[*`]/g, ""));
const capitoliIt = capitoliDi(markdown("GUIDA-PER-LO-STUDENTE.md"));
const capitoliEn = capitoliDi(markdown("STUDENT-GUIDE.md"));

const guida = (page: Page) => page.locator("[data-finestra-guida]");

async function apriLaGuida(page: Page, testi = it): Promise<void> {
  await (await voceDellAiuto(page, testi.guida, testi)).click();
  await expect(guida(page)).toBeVisible();
}

/** Il capitolo (contato da 0) col titolo in cima al testo della guida, entro mezza riga. */
const capitoloInCima = (page: Page) =>
  guida(page).evaluate((g) => {
    const t = g.querySelector("article")!;
    const cima = t.getBoundingClientRect().top;
    return [...t.querySelectorAll("h2")].findIndex((h) => Math.abs(h.getBoundingClientRect().top - cima) < 24);
  });

test("la guida dal menu «Aiuto»: a destra fra la barra e la riga di stato, i capitoli del Markdown, il menu sopra di lei, F10 con la guida aperta, Esc la chiude", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await apriLaGuida(page);
  // Il posto: a destra, sotto la barra e sopra la riga di stato.
  const posto = await page.evaluate(() => {
    const g = document.querySelector("[data-finestra-guida]")!.getBoundingClientRect();
    const barra = document.querySelector("header")!.getBoundingClientRect();
    const riga = document.querySelector("[data-riga-di-stato]")!.getBoundingClientRect();
    return { sottoLaBarra: g.top >= barra.bottom, sopraLaRiga: g.bottom <= riga.top, aDestra: Math.round(innerWidth - g.right) };
  });
  expect(posto).toEqual({ sottoLaBarra: true, sopraLaRiga: true, aDestra: 8 });
  await expect(guida(page).getByRole("heading", { name: it.guidaTitolo, exact: true })).toBeVisible();
  // L'indice: i capitoli del Markdown di docs/, nell'ordine.
  const indice = guida(page).getByRole("navigation", { name: it.guidaIndice, exact: true });
  await expect(indice.getByRole("button")).toHaveText(capitoliIt);
  expect(capitoliIt.length).toBe(13);
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("ARTICLE");
  await indice.getByRole("button", { name: capitoliIt[4]!, exact: true }).click();
  await expect.poll(() => capitoloInCima(page)).toBe(4);
  await expect(guida(page).locator("article h2").nth(4)).toBeFocused();
  // Il menu «Aiuto» aperto con la guida aperta sta sopra di lei: al centro della voce c'è la voce.
  const esempi = await voceDellAiuto(page, it.esempi);
  const sopra = await esempi.evaluate((v) => {
    const r = v.getBoundingClientRect();
    return v.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
  const sullaGuida = await esempi.evaluate((v) => {
    const r = v.getBoundingClientRect();
    const g = document.querySelector("[data-finestra-guida]")!.getBoundingClientRect();
    return r.right > g.left && r.left < g.right && r.bottom > g.top && r.top < g.bottom;
  });
  expect({ sopra, sullaGuida }).toEqual({ sopra: true, sullaGuida: true });
  await page.keyboard.press("Escape");
  // Finché il menu che si chiude è nel documento i tasti dell'app tacciono (come con ogni menu aperto): si aspetta che
  // sia sparito (nella corsa intera, sotto carico, F10 premuto subito arrivava prima).
  await expect(page.getByRole("menu")).toHaveCount(0);
  // La guida non è modale: F10 col fuoco nel testo fa il primo passo.
  await guida(page).locator("article").focus();
  const prima = await page.locator("[data-stato-esecuzione]").textContent();
  await page.keyboard.press("F10");
  await expect(page.locator("[data-stato-esecuzione]")).not.toHaveText(prima ?? "");
  await expect(guida(page)).toBeVisible();
  // Esc col fuoco nella guida la chiude.
  await guida(page).locator("article").focus();
  await page.keyboard.press("Escape");
  await expect(guida(page)).toHaveCount(0);
});

test("la lingua cambiata dalla riga di stato con la guida aperta: la guida in inglese, sullo stesso capitolo", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await apriLaGuida(page);
  await guida(page).getByRole("navigation", { name: it.guidaIndice, exact: true }).getByRole("button", { name: capitoliIt[7]!, exact: true }).click();
  await expect.poll(() => capitoloInCima(page)).toBe(7);
  const lingua = page.locator("[data-riga-di-stato]").getByRole("button", { name: `${it.linguaDellInterfaccia}: Italiano`, exact: true });
  await expect(lingua).toHaveText("ITA");
  await lingua.click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(guida(page)).toHaveAttribute("data-finestra-guida", "en");
  await expect(guida(page).getByRole("heading", { name: en.guidaTitolo, exact: true })).toBeVisible();
  await expect(guida(page).getByRole("navigation", { name: en.guidaIndice, exact: true }).getByRole("button")).toHaveText(capitoliEn);
  await expect.poll(() => capitoloInCima(page)).toBe(7);
  await expect(page.locator("[data-riga-di-stato]").getByRole("button", { name: `${en.linguaDellInterfaccia}: English`, exact: true })).toHaveText("ENG");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("la ricerca: le parole trovate come nel Markdown, Invio porta la successiva dentro il testo visibile", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await apriLaGuida(page);
  const parola = "Maiusc+F9";
  const attese = markdown("GUIDA-PER-LO-STUDENTE.md").toLocaleLowerCase().split(parola.toLocaleLowerCase()).length - 1;
  expect(attese).toBeGreaterThan(1);
  const campo = guida(page).getByRole("searchbox", { name: it.guidaCerca, exact: true });
  await campo.fill(parola);
  await expect(guida(page).locator("article mark")).toHaveCount(attese);
  await expect(guida(page).locator("[data-trovate]")).toHaveText(riempi(it.guidaTrovate, { n: "1", totale: String(attese) }));
  await campo.press("Enter");
  await expect(guida(page).locator("[data-trovate]")).toHaveText(riempi(it.guidaTrovate, { n: "2", totale: String(attese) }));
  const inVista = () =>
    guida(page).evaluate((g) => {
      const m = g.querySelector("article mark[data-corrente]")!.getBoundingClientRect();
      const t = g.querySelector("article")!.getBoundingClientRect();
      return m.top >= t.top && m.bottom <= t.bottom;
    });
  await expect.poll(inVista).toBe(true);
});

test("con la preferenza la guida si sposta dal titolo e si allarga dall'angolo; chiusa e riaperta torna lì", async ({ page }) => {
  await apri(page, { lingua: "it", guidaSpostabile: true });
  await apriLaGuida(page);
  const misura = () => guida(page).evaluate((g) => {
    const r = g.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), larga: Math.round(r.width), alta: Math.round(r.height) };
  });
  const prima = await misura();
  // Trascinata dal titolo: 300 px a sinistra, 30 in alto (in basso non c'è posto: alta fino alla riga di stato, la
  // guida resta dentro la finestra).
  const titolo = (await guida(page).getByRole("heading", { name: it.guidaTitolo, exact: true }).boundingBox())!;
  await page.mouse.move(titolo.x + 20, titolo.y + titolo.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(titolo.x + 20 - 30 * i, titolo.y + titolo.height / 2 - 3 * i);
  await page.mouse.up();
  await expect.poll(misura).toEqual({ ...prima, x: prima.x - 300, y: prima.y - 30 });
  // Allargata dall'angolo in basso a destra: 120 px.
  const spostata = await misura();
  await page.mouse.move(spostata.x + spostata.larga - 3, spostata.y + spostata.alta - 3);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(spostata.x + spostata.larga - 3 + 20 * i, spostata.y + spostata.alta - 3);
  await page.mouse.up();
  await expect.poll(async () => (await misura()).larga).toBe(spostata.larga + 120);
  const dopo = await misura();
  // Chiusa con Esc e riaperta: lo stesso posto e le stesse misure.
  await guida(page).locator("article").focus();
  await page.keyboard.press("Escape");
  await expect(guida(page)).toHaveCount(0);
  await apriLaGuida(page);
  expect(await misura()).toEqual(dopo);
});

test("la guida spostata, chiusa e riaperta in una finestra più stretta: rientra tutta, col titolo da trascinare", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await apri(page, { lingua: "it", guidaSpostabile: true });
  await apriLaGuida(page);
  const titolo = guida(page).getByRole("heading", { name: it.guidaTitolo, exact: true });
  const t = (await titolo.boundingBox())!;
  await page.mouse.move(t.x + 20, t.y + t.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 3; i++) await page.mouse.move(t.x + 20 - 10 * i, t.y + t.height / 2);
  await page.mouse.up();
  await expect.poll(async () => Math.round((await titolo.boundingBox())!.x)).toBe(Math.round(t.x - 30));
  await guida(page).locator("article").focus();
  await page.keyboard.press("Escape");
  await expect(guida(page)).toHaveCount(0);
  // Premessa: la sinistra della guida spostata sta oltre la larghezza della finestra nuova.
  expect(t.x - 30).toBeGreaterThan(840);
  await page.setViewportSize({ width: 840, height: 700 });
  await apriLaGuida(page);
  const posto = await guida(page).evaluate((g) => {
    const r = g.getBoundingClientRect();
    const h = g.querySelector("h2")!.getBoundingClientRect();
    return {
      dentro: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      titolo: g.querySelector("h2")!.contains(document.elementFromPoint(h.left + h.width / 2, h.top + h.height / 2)),
    };
  });
  expect(posto).toEqual({ dentro: true, titolo: true });
});
