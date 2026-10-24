// La scelta di più blocchi vicini nei motori veri, sul programma di riferimento della media dei voti aperto come file dato
// all'avvio (la sequenza principale: un commento, un «ripeti», un'assegnazione, un «mentre», un «se»), con la casella del
// riquadro intorno ai blocchi scelti accesa.
//
// - Col mouse: un clic e Maiusc+clic scelgono tre blocchi vicini, il riquadro li contiene tutti col loro contenuto sullo
//   schermo; trascinati da uno di loro su un «+», mentre si trascina i tre e il loro contenuto sono velati e i «+» fra
//   loro spenti; rilasciati, vanno tutti e tre in quel posto, nello stesso ordine e ancora scelti, in un passo che un solo
//   Annulla toglie.
// - Dalla tastiera: Maiusc+↓ allarga la scelta, Spazio comincia lo spostamento dei blocchi scelti, Invio su un «+» li
//   porta lì; un passo solo.
//
// L'ordine si legge dall'albero dell'accessibilità (i blocchi della sequenza principale nello strato).
//
// CHE COSA NON GUARDA: le operazioni sui blocchi scelti una per una (sotto happy-dom, `ui/disegno/scelta.test.tsx`); la
// forma del riquadro e della copia numero per numero (`ui/disegno/bersaglio.test.ts`); WebKit (al primo rilascio per Linux
// o macOS, come le altre prove).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const PERCORSO = "C:\\corpus\\riferimento-media-voti.algo";
const TESTO = readFileSync(fileURLToPath(new URL("../casi/tappa-1/riferimento-media-voti.algo", import.meta.url)), "utf8");

/** Due fotogrammi: il tempo che serve a React per ridisegnare dopo un evento. */
const dueGiri = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const punto = (page: Page, chiave: string) => page.locator(`[data-punto="${chiave}"]`);
/** I blocchi della sequenza principale, nell'ordine dello strato. */
const principale = (page: Page) =>
  page.getByRole("group", { name: it.sequenzaPrincipale, exact: true }).evaluate((g) => [...g.children].filter((c) => c.hasAttribute("data-blocco")).map((c) => c.getAttribute("data-blocco")));
const scelti = (page: Page) => page.locator('[data-blocco][aria-pressed="true"]').evaluateAll((xs) => xs.map((x) => x.getAttribute("data-blocco")));

async function apriIlRiferimento(page: Page): Promise<void> {
  await apriVuota(page, { lingua: "it", riquadroDellaScelta: true }, { file: { [PERCORSO]: TESTO }, argomento: PERCORSO });
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.apertoIl, { file: "riferimento-media-voti.algo" }));
  // Premessa: la sequenza principale del file.
  expect(await principale(page)).toEqual(["b1", "b2", "b6", "b7", "b16"]);
}

test("col mouse: Maiusc+clic sceglie tre blocchi, il riquadro li contiene; trascinati su un «+» vanno lì tutti, in un passo", async ({ page }) => {
  await apriIlRiferimento(page);
  await blocco(page, "b2").click();
  await blocco(page, "b7").click({ modifiers: ["Shift"] });
  expect(await scelti(page)).toEqual(["b2", "b6", "b7"]);
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.blocchiSelezionati, { n: "3" }));
  // Il riquadro contiene sullo schermo i tre blocchi e quelli che contengono (il «se» nel «mentre», e il «se» dentro).
  const riquadro = (await page.locator("[data-riquadro-della-scelta]").boundingBox())!;
  const fuori: string[] = [];
  for (const id of ["b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b12", "b13", "b14", "b15"]) {
    const r = (await blocco(page, id).boundingBox())!;
    if (r.x < riquadro.x || r.y < riquadro.y || r.x + r.width > riquadro.x + riquadro.width || r.y + r.height > riquadro.y + riquadro.height) fuori.push(id);
  }
  // E non contiene i blocchi fuori dalla scelta.
  const dentroPerSbaglio: string[] = [];
  for (const id of ["b1", "b16"]) {
    const r = (await blocco(page, id).boundingBox())!;
    if (r.y + r.height > riquadro.y && r.y < riquadro.y + riquadro.height) dentroPerSbaglio.push(id);
  }
  expect({ fuori, dentroPerSbaglio }).toEqual({ fuori: [], dentroPerSbaglio: [] });

  // Il trascinamento da «i ← 0» (b6), il blocco di mezzo, fino al «+» dopo l'ultimo blocco.
  await blocco(page, "b6").evaluate((e) => e.scrollIntoView({ block: "center" }));
  await dueGiri(page);
  const da = (await blocco(page, "b6").boundingBox())!;
  const [sx, sy] = [da.x + da.width / 2, da.y + da.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await dueGiri(page);
  // Mentre si trascina: i tre e il loro contenuto velati, i «+» accanto e fra loro spenti, quello dopo il «se» no.
  // Dallo stile calcolato, cioè da ciò che si vede (non dal nome della classe): il velo del blocco al 60%, il «+» spento al 25%.
  const velati = await page
    .locator("[data-blocco]")
    .evaluateAll((xs) => xs.filter((x) => getComputedStyle(x.querySelector("polygon")!).fillOpacity === "0.6").map((x) => x.getAttribute("data-blocco")));
  const spenti = await page.locator("[data-punto]").evaluateAll((xs) => xs.filter((x) => getComputedStyle(x).opacity === "0.25").map((x) => x.getAttribute("data-punto")));
  expect({ velati: velati.includes("b2") && velati.includes("b6") && velati.includes("b7") && velati.includes("b13"), b16: velati.includes("b16") }).toEqual({ velati: true, b16: false });
  expect(["f1/body/1", "f1/body/2", "f1/body/3", "f1/body/4"].every((k) => spenti.includes(k)) && !spenti.includes("f1/body/5")).toBe(true);
  await punto(page, "f1/body/5").evaluate((e) => e.scrollIntoView({ block: "center" }));
  await dueGiri(page);
  const a = (await punto(page, "f1/body/5").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2, { steps: 12 });
  await page.mouse.up();
  await dueGiri(page);
  expect(await principale(page)).toEqual(["b1", "b16", "b2", "b6", "b7"]);
  expect(await scelti(page)).toEqual(["b2", "b6", "b7"]);
  // Un passo solo: un Annulla torna all'ordine di prima, e non resta altro da annullare.
  await page.keyboard.press("Control+z");
  await dueGiri(page);
  expect(await principale(page)).toEqual(["b1", "b2", "b6", "b7", "b16"]);
  await expect(page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: it.annulla, exact: true })).toHaveAttribute("aria-disabled", "true");
});

test("due Maiusc+↓ nello stesso fotogramma: il fuoco arriva sull'ultimo blocco scelto", async ({ page }) => {
  await apriIlRiferimento(page);
  await blocco(page, "b1").focus();
  // Il secondo tasto in un compito a parte (React ha già ridisegnato) ma prima del fotogramma che sposta il fuoco del
  // primo: come chi tiene premuto il tasto.
  await blocco(page, "b1").evaluate(async (b) => {
    const tasto = () => b.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true, cancelable: true }));
    tasto();
    await new Promise((r) => setTimeout(r, 0));
    tasto();
  });
  expect(await scelti(page)).toEqual(["b1", "b2", "b6"]);
  await expect(blocco(page, "b6")).toBeFocused();
});

test("dalla tastiera: Maiusc+↓ allarga la scelta, Spazio e Invio su un «+» spostano i blocchi scelti, in un passo", async ({ page }) => {
  await apriIlRiferimento(page);
  await blocco(page, "b1").focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  expect(await scelti(page)).toEqual(["b1", "b2", "b6"]);
  await expect(blocco(page, "b6")).toBeFocused();
  await page.keyboard.press(" ");
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.spostamentoDiPiuIniziato, { n: "3" }));
  // Il «+» fra il «mentre» e l'ultimo «se»: avanti nella stessa sequenza, ma non in fondo.
  await punto(page, "f1/body/4").focus();
  await page.keyboard.press("Enter");
  await dueGiri(page);
  expect(await principale(page)).toEqual(["b7", "b1", "b2", "b6", "b16"]);
  expect(await scelti(page)).toEqual(["b1", "b2", "b6"]);
  await page.keyboard.press("Control+z");
  await dueGiri(page);
  expect(await principale(page)).toEqual(["b1", "b2", "b6", "b7", "b16"]);
  await expect(page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: it.annulla, exact: true })).toHaveAttribute("aria-disabled", "true");
});
