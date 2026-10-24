// L'esecuzione con procedure e funzioni nei motori, coi tasti e i clic veri, sulle chiamate su tre livelli del corpus
// (`casi/tappa-3/tre-livelli.algo`: il programma f1 col salto `b1` a `mostra` f2, che scrive in `b3` il risultato di
// `piu_uno_del_quadrato` f3, la cui fine `b5` chiama `quadrato` f4, la fine `b6`):
// - F11, Maiusc+F11 e F10 veri: a ogni pausa la scheda mostrata e il blocco corrente, scritti a mano; dopo il ritorno
//   da una funzione chiamata in un'espressione la pausa sulla ripresa di chi chiama, col segno «↩» e senza la punta;
// - «Entra» ed «Esci» nella barra (col tasto nel suggerimento) e nella barretta, che fanno come i tasti;
// - il clic su un nome di «Dove sei»: la scheda, col blocco della chiamata in vista e col fuoco;
// - un punto di interruzione messo con F9 dentro una procedura: «Esegui» si ferma lì, il blocco corrente in vista;
// - il watch su ciò che una funzione restituisce, in pausa sulla sua fine (il riquadro della fine corrente non prende il
//   puntatore);
// - una funzione eseguita da sola: il fuoco nella riga del parametro, ciò che restituisce nella console;
// - il watch sul nome di una funzione chiamata in un blocco (`casi/tappa-3/risultato-stringa.algo`): col puntatore vero,
//   il valore che ha restituito in quel blocco.
//
// Che cosa NON guarda: le sequenze su ogni combinazione (il nucleo), i casi d'uso contro la riga di comando e i comandi
// dei parametri in ogni forma (sotto happy-dom: `ui/esecuzione/chiamate.test.tsx`, `ui/casi/casi.test.tsx`); che F11
// non porti la finestra a schermo intero: il tasto di Playwright arriva alla pagina e non agli acceleratori del motore,
// e lo schermo intero di F11 non è quello della pagina (`document.fullscreenElement`). Nella WebView2 del prodotto F11
// non fa nulla di suo: misurato una volta, con una sonda a parte sull'app vera.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });

const PERCORSO = "C:\\Documenti\\tre livelli.algo";
const TESTO = readFileSync(fileURLToPath(new URL("../casi/tappa-3/tre-livelli.algo", import.meta.url)), "utf8");

async function apriITreLivelli(page: Page, salvate: Record<string, unknown> = {}): Promise<void> {
  await apriVuota(page, { lingua: "it", ...salvate }, { argomento: PERCORSO, file: { [PERCORSO]: TESTO } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "tre livelli.algo" }));
}
/** La scheda mostrata e il blocco corrente (un valore iniziale col nome del suo dato); `↩` davanti col segno della
 * ripresa nel disegno, che allora non ha la punta che entra (`!` se l'ha). */
const istante = (page: Page) =>
  page.evaluate(() => {
    const scheda = document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda") ?? "-";
    const ripresa = document.querySelector("svg [data-segno-ripresa]") !== null ? `↩${document.querySelector("svg [data-freccia]") ? "!" : ""}` : "";
    const corrente = [...document.querySelectorAll('svg [aria-current="step"]')].map((e) => e.getAttribute("data-blocco") ?? e.getAttribute("data-fine") ?? `=${e.getAttribute("data-iniziale-di")}`);
    return `${scheda} ${ripresa}${corrente.join(",")}`;
  });
const stato = (page: Page) => page.locator("[data-stato-esecuzione]");
/** Lo stato e l'avviso: sulla ripresa dopo un ritorno il numero dell'azione non cambia, l'avviso sì. */
const statoEAvviso = (page: Page) => page.evaluate(() => `${document.querySelector("[data-stato-esecuzione]")?.textContent ?? ""}|${document.querySelector('output[role="status"]')?.textContent ?? ""}`);
/** Un tasto vero (o un clic), poi l'attesa che il comando si fermi. */
async function premi(page: Page, tasto: string | (() => Promise<void>)): Promise<string> {
  const prima = await statoEAvviso(page);
  await (typeof tasto === "string" ? page.keyboard.press(tasto) : tasto());
  await expect.poll(() => statoEAvviso(page)).not.toBe(prima);
  await expect(stato(page)).not.toHaveText(it.statoInCorso);
  return istante(page);
}

test("F11, Maiusc+F11 e F10 veri su tre livelli: la scheda segue l'azione", async ({ page }) => {
  await apriITreLivelli(page);
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  const visti: string[] = [];
  for (const t of ["F11", "F11", "F11", "F11", "F11", "Shift+F11", "Shift+F11", "F10", "Shift+F11", "F10"]) visti.push(await premi(page, t));
  // Dopo un ritorno Esci si ferma sulla ripresa di chi chiama: ciò che restituisce piu_uno_del_quadrato, poi la scrittura.
  expect(visti).toEqual(["f1 =n", "f1 b1", "f2 b3", "f3 b5", "f4 b6", "f3 ↩b5", "f2 ↩b3", "f2 b4", "f1 b2", "f1 "]);
  expect((await page.locator('[role="log"] [data-scrive]').allTextContents()).join("")).toBe("risultato: 17\n");
});

test("«Entra» ed «Esci» nella barra e nella barretta fanno come i tasti; il suggerimento dice il tasto", async ({ page }) => {
  await apriITreLivelli(page, { esecuzioneFlottante: true });
  const entra = page.locator('header [data-comando="entra"]');
  await expect(entra).toHaveAttribute("title", `${it.entraSuggerimento} (F11)`);
  await expect(page.locator('header [data-comando="esci"]')).toHaveAttribute("title", `${it.esciSuggerimento} (Maiusc+F11)`);
  // Da ferma «Entra» comincia, fermo sulla prima azione; poi i comandi stanno nella barretta.
  await entra.click();
  await expect(stato(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  const barretta = page.getByRole("toolbar", { name: it.barrettaEsecuzione });
  for (let k = 0; k < 4; k++) {
    await barretta.locator('[data-comando="entra"]').click();
    await expect(stato(page)).toHaveText(riempi(it.statoInPausa, { n: String(k + 2) }));
  }
  expect(await istante(page)).toBe("f4 b6");
  // «Esci» risale di un livello alla volta sulle riprese (il numero dell'azione resta 5), poi fino alla fine di mostra.
  const esci = () => barretta.locator('[data-comando="esci"]').click();
  expect([await premi(page, esci), await premi(page, esci), await premi(page, esci)]).toEqual(["f3 ↩b5", "f2 ↩b3", "f1 b2"]);
  await expect(stato(page)).toHaveText(riempi(it.statoInPausa, { n: "7" }));
});

test("il clic su un nome di «Dove sei» mostra la sua scheda, col blocco della chiamata in vista e col fuoco", async ({ page }) => {
  await apriITreLivelli(page);
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  for (let k = 0; k < 5; k++) await premi(page, "F11");
  const dove = page.getByRole("navigation", { name: it.doveSei, exact: true });
  await expect(dove.getByRole("button")).toHaveText([it.schedaPrincipale, "mostra", "piu_uno_del_quadrato", "quadrato"]);
  await expect(dove.getByRole("button", { name: "quadrato", exact: true })).toHaveAttribute("aria-current", "step");
  await dove.getByRole("button", { name: "mostra", exact: true }).click();
  await expect(page.locator('[data-scheda="f2"]')).toHaveAttribute("aria-selected", "true");
  const chiamata = page.locator('[data-blocco="b3"]');
  await expect(chiamata).toBeFocused();
  await expect(chiamata).toHaveAttribute("aria-pressed", "true");
  await expect(chiamata).toBeInViewport();
});

test("un punto di interruzione messo con F9 dentro una procedura: «Esegui» si ferma lì, col blocco in vista", async ({ page }) => {
  await apriITreLivelli(page);
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f2"]').click();
  await page.locator('[data-blocco="b3"]').click();
  await page.keyboard.press("F9");
  await expect(page.getByRole("status")).toHaveText(riempi(it.annuncioPuntoMesso, { blocco: await page.locator('[data-blocco="b3"]').getAttribute("aria-label") ?? "" }));
  await page.locator('[data-scheda="f1"]').click();
  expect(await premi(page, "F5")).toBe("f2 b3");
  await expect(page.locator('[data-blocco="b3"]')).toBeInViewport();
  expect(await premi(page, "F5")).toBe("f1 ");
  await expect(stato(page)).toHaveText(it.statoFinita);
});

test("il watch su ciò che una funzione restituisce, in pausa sulla sua fine: il nome si punta, e il valore è il suo", async ({ page }) => {
  await apriITreLivelli(page);
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  for (let k = 0; k < 5; k++) await premi(page, "F11");
  expect(await istante(page)).toBe("f4 b6");
  // `quadrato` (f4) restituisce `y * y`, con `y` = 4.
  await page.locator('[data-restituisce="b6"] [data-watch-dato="y"]').first().hover();
  const w = page.locator("[data-watch]");
  await expect(w.locator("[data-watch-nome]")).toHaveText("y");
  await expect(w.locator("[data-watch-valore]")).toHaveText("4");
});

test("una funzione eseguita da sola: il fuoco nella riga del parametro, ciò che restituisce nella console", async ({ page }) => {
  await apriITreLivelli(page);
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f4"]').click();
  await page.keyboard.press("F5");
  const riga = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: "y" }), exact: true });
  await expect(riga).toBeFocused();
  await page.keyboard.type("6");
  await page.keyboard.press("Enter");
  await expect(stato(page)).toHaveText(it.statoFinita);
  expect((await page.locator('[role="log"] [data-scrive]').allTextContents()).join("")).toBe("→ 36\n");
});

test("il watch sul nome di una funzione chiamata in un blocco: il valore che ha restituito lì, col puntatore vero", async ({ page }) => {
  // `s ← saluto("Anna")` in b1, `scrivi s, " ", saluto("Bo")[5]` in b2: la seconda scrive «B», il watch dice «Ciao Bo».
  const percorso = "C:\\Documenti\\risultato-stringa.algo";
  const testo = readFileSync(fileURLToPath(new URL("../casi/tappa-3/risultato-stringa.algo", import.meta.url)), "utf8");
  await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: testo } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "risultato-stringa.algo" }));
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  const watch = page.locator('[role="tooltip"][data-watch]');
  const punta = async (blocco: string) => {
    await page.mouse.move(0, 0);
    await expect(watch).toHaveCount(0);
    await page.locator(`[data-blocco="${blocco}"] [data-watch-funzione="saluto"]`).hover();
    await expect(watch).toBeVisible();
    return (await watch.locator("[data-watch-nome], [data-watch-tipo], [data-watch-chiamata], [data-watch-non-chiamata]").allTextContents()).join(" | ");
  };
  await premi(page, "F10");
  expect(await punta("b1")).toBe(`saluto(…) | stringa | ${it.watchNonChiamata}`);
  // In pausa sulla ripresa di b1 il valore appena restituito c'è già; poi b2 e la sua ripresa, poi la fine.
  expect(await premi(page, "F10")).toBe("f1 ↩b1");
  expect(await punta("b1")).toBe("saluto(…) | stringa | Ciao Anna");
  await premi(page, "F10");
  expect(await premi(page, "F10")).toBe("f1 ↩b2");
  await premi(page, "F10");
  expect([await punta("b1"), await punta("b2")]).toEqual(["saluto(…) | stringa | Ciao Anna", "saluto(…) | stringa | Ciao Bo"]);
  expect((await page.locator('[role="log"] [data-scrive]').allTextContents()).join("")).toBe("Ciao Anna B\n");
});
