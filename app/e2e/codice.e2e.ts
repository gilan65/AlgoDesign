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
import type { Finzione } from "./finzione-tauri";
import { apri, costruisciFinzione } from "./pagina";

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
