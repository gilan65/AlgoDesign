// Le colonne della tabella di traccia disposte dall'utente, nei motori: su un programma con un vettore di tre elementi
// (tre colonne, che si spostano insieme), un «per» e un «per ogni» disegnato con la posizione.
//
// - La maniglia sul bordo destro di un'intestazione allarga e stringe la colonna: l'intestazione e le celle della colonna
//   hanno la stessa larghezza, quella del trascinamento; stretta al minimo, la cella si taglia (il testo è più largo
//   della cella); la regola si allarga oltre il suo tetto.
// - Trascinando un'intestazione la colonna si sposta dove si rilascia; le celle seguono (ogni colonna ha gli stessi
//   valori di prima, riga per riga); trascinando una colonna del vettore si sposta tutto il vettore.
// - Dalla tastiera: il Tab entra nella riga delle intestazioni una volta sola, le frecce passano da una all'altra, Invio
//   e Maiusc+F10 aprono il menu della colonna; «Sposta a destra» la sposta e il fuoco la segue, «Allarga» la allarga.
// - L'ordine scelto vale anche per l'esecuzione dopo, e il CSV «uguale alla tabella» ha le colonne nell'ordine mostrato.
//
// CHE COSA NON GUARDA:
// - lo scorrimento da sé vicino ai bordi durante il trascinamento (le colonne qui stanno tutte in vista);
// - l'aspetto della maniglia e del segno del posto;
// - WebKit (il collaudo predefinito corre solo Chromium).
import { expect, test, type Page } from "@playwright/test";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apri, costruisciFinzione, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const quadrati: Funzione = {
  id: "f1",
  kind: "main",
  data: [
    { name: "q", type: "integer", size: 3, initial: { each: "0" } },
    { name: "i", type: "integer" },
    { name: "x", type: "integer" },
    { name: "somma", type: "integer", initial: "0" },
  ],
  body: [
    { id: "b1", kind: "for", counter: "i", from: "0", to: "2", body: [{ id: "b2", kind: "assignment", target: "q[i]", value: "i * i" }] },
    { id: "b3", kind: "for_each", item: "x", source: "q", body: [{ id: "b4", kind: "assignment", target: "somma", value: "somma + x" }] },
    { id: "b5", kind: "write", values: ["somma"], newline: true },
  ],
  end: { id: "b6" },
};
/** Le colonne dopo la regola nell'ordine del nucleo. */
const DEL_NUCLEO = ["q[0]", "q[1]", "q[2]", "i", "x", "somma", "_indice", "#condizione", "#scrive"];

const tabella = (page: Page) => page.getByRole("table", { name: it.tabellaDiTraccia, exact: true });
const intestazione = (page: Page, chiave: string) => tabella(page).locator(`th[data-colonna="${chiave}"]`);

async function esegui(page: Page): Promise<void> {
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F5");
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]")).toHaveText(it.statoFinita);
}
async function apriEdEsegui(page: Page): Promise<void> {
  await apri(page, { lingua: "it" }, undefined, [{ nome: "quadrati", titolo: "quadrati", funzione: quadrati }]);
  await esegui(page);
}

/** Le chiavi delle intestazioni dopo il numero, nell'ordine mostrato (la regola compresa). */
const ordine = (page: Page) => tabella(page).evaluate((t) => [...t.querySelectorAll("thead th[data-colonna]")].map((th) => th.getAttribute("data-colonna")!).slice(1));
/** Per ogni colonna, i testi delle sue celle riga per riga: la colonna è la stessa se ha gli stessi valori. */
const valoriPerColonna = (page: Page) =>
  tabella(page).evaluate((t) => {
    const chiavi = [...t.querySelectorAll("thead th")].map((th) => th.getAttribute("data-colonna") ?? "#numero");
    const m: Record<string, string[]> = {};
    for (const tr of t.querySelectorAll("tbody tr[data-riga]")) [...(tr as HTMLTableRowElement).cells].forEach((c, k) => (m[chiavi[k]!] ??= []).push(c.textContent ?? ""));
    return m;
  });
/** La larghezza dell'intestazione e delle celle della sua colonna, e se una cella della colonna taglia il suo testo. */
const larghezze = (page: Page, chiave: string) =>
  tabella(page).evaluate((t, chiave) => {
    const ths = [...t.querySelectorAll("thead th")];
    const k = ths.findIndex((th) => th.getAttribute("data-colonna") === chiave);
    const celle = [...t.querySelectorAll("tbody tr[data-riga]")].map((tr) => (tr as HTMLTableRowElement).cells[k]!);
    return {
      intestazione: Math.round(ths[k]!.getBoundingClientRect().width),
      celle: [...new Set(celle.map((c) => Math.round(c.getBoundingClientRect().width)))],
      tagliata: celle.some((c) => c.scrollWidth > c.clientWidth),
    };
  }, chiave);

/** Trascina col mouse da un punto a un altro, a piccoli passi. */
async function trascina(page: Page, da: { x: number; y: number }, a: { x: number; y: number }): Promise<void> {
  await page.mouse.move(da.x, da.y);
  await page.mouse.down();
  await page.mouse.move(a.x, a.y, { steps: 12 });
  await page.mouse.up();
}
/** Dove sta l'intestazione sullo schermo; deve stare tutta nella parte visibile della tabella, o il puntatore cadrebbe su
 * ciò che la copre. */
async function scatola(page: Page, chiave: string) {
  const b = await intestazione(page, chiave).boundingBox();
  const area = await tabella(page).evaluate((t) => {
    const r = t.parentElement!.getBoundingClientRect();
    return { sinistra: r.left, destra: r.left + t.parentElement!.clientWidth };
  });
  if (!b || b.x < area.sinistra || b.x + b.width > area.destra)
    throw new Error(`premessa: l'intestazione «${chiave}» non sta nella parte visibile della tabella (${JSON.stringify(b)}, area ${JSON.stringify(area)})`);
  return b;
}

test("la maniglia sul bordo destro allarga e stringe la colonna, intestazione e celle insieme; stretta, la cella si taglia", async ({ page }) => {
  await apriEdEsegui(page);
  const prima = await larghezze(page, "q[0]");
  // Premessa: la colonna ha una larghezza sola, per l'intestazione e per le celle.
  expect(prima.celle).toEqual([prima.intestazione]);
  const q0 = await scatola(page, "q[0]");
  await trascina(page, { x: q0.x + q0.width - 2, y: q0.y + q0.height / 2 }, { x: q0.x + q0.width - 2 + 60, y: q0.y + q0.height / 2 });
  const larga = await larghezze(page, "q[0]");
  expect(Math.abs(larga.intestazione - (prima.intestazione + 60))).toBeLessThanOrEqual(2);
  expect(larga.celle).toEqual([larga.intestazione]);
  // La regola oltre il suo tetto di 13rem (208 px), poi stretta al minimo (24 px): le sue celle si tagliano.
  const regolaPrima = (await larghezze(page, "#regola")).intestazione;
  const reg = await scatola(page, "#regola");
  await trascina(page, { x: reg.x + reg.width - 2, y: reg.y + reg.height / 2 }, { x: reg.x + reg.width - 2 + 120, y: reg.y + reg.height / 2 });
  const regolaLarga = (await larghezze(page, "#regola")).intestazione;
  expect(Math.abs(regolaLarga - (regolaPrima + 120))).toBeLessThanOrEqual(2);
  expect(regolaLarga).toBeGreaterThan(208);
  const r2 = await scatola(page, "#regola");
  await trascina(page, { x: r2.x + r2.width - 2, y: r2.y + r2.height / 2 }, { x: r2.x - 400, y: r2.y + r2.height / 2 });
  const stretta = await larghezze(page, "#regola");
  expect(stretta.intestazione).toBe(24);
  expect(stretta.celle).toEqual([24]);
  expect(stretta.tagliata).toBe(true);
  console.log(`maniglia: q[0] ${prima.intestazione} → ${larga.intestazione} px, la regola ${regolaLarga} px e poi al minimo ${stretta.intestazione} px (tagliata ${stretta.tagliata})`);
});

test("trascinando un'intestazione la colonna si sposta dove si rilascia, le celle la seguono; il vettore si sposta tutto", async ({ page }) => {
  await apriEdEsegui(page);
  expect(await ordine(page)).toEqual(DEL_NUCLEO);
  const valori = await valoriPerColonna(page);
  // «i» sulla metà sinistra di «q[0]»: prima del vettore.
  const i = await scatola(page, "i");
  const q0 = await scatola(page, "q[0]");
  await trascina(page, { x: i.x + i.width / 2, y: i.y + i.height / 2 }, { x: q0.x + 4, y: q0.y + q0.height / 2 });
  expect(await ordine(page)).toEqual(["i", "q[0]", "q[1]", "q[2]", "x", "somma", "_indice", "#condizione", "#scrive"]);
  expect(await valoriPerColonna(page)).toEqual(valori);
  // «q[1]» sulla metà sinistra di «i»: il vettore intero torna prima di «i» (una colonna sola finirebbe fra «i» e gli altri).
  const q1 = await scatola(page, "q[1]");
  const i2 = await scatola(page, "i");
  await trascina(page, { x: q1.x + q1.width / 2, y: q1.y + q1.height / 2 }, { x: i2.x + 4, y: i2.y + i2.height / 2 });
  expect(await ordine(page)).toEqual(DEL_NUCLEO);
  expect(await valoriPerColonna(page)).toEqual(valori);
  // La regola non si trascina: l'ordine non cambia, e lei resta la prima dopo il numero.
  const reg = await scatola(page, "#regola");
  await trascina(page, { x: reg.x + reg.width / 2, y: reg.y + reg.height / 2 }, { x: reg.x + reg.width + 300, y: reg.y + reg.height / 2 });
  expect(await ordine(page)).toEqual(DEL_NUCLEO);
  expect(await tabella(page).evaluate((t) => t.querySelectorAll("thead th")[1]!.getAttribute("data-colonna"))).toBe("#regola");
});

test("dalla tastiera: una sola intestazione nel Tab, le frecce, il menu della colonna con Invio e Maiusc+F10", async ({ page }) => {
  await apriEdEsegui(page);
  expect(await tabella(page).locator('thead th[tabindex="0"]').count()).toBe(1);
  await intestazione(page, "#regola").focus();
  await page.keyboard.press("ArrowRight");
  await expect(intestazione(page, "q[0]")).toBeFocused();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: riempi(it.colonnaMenu, { nome: "q[0]" }), exact: true });
  await expect(menu).toBeVisible();
  // Il vettore è il primo gruppo: «Sposta a sinistra» non è disponibile.
  await expect(menu.getByRole("menuitem", { name: it.colonnaSinistra, exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  expect(await ordine(page)).toEqual(["i", "q[0]", "q[1]", "q[2]", "x", "somma", "_indice", "#condizione", "#scrive"]);
  await expect(intestazione(page, "q[0]")).toBeFocused();
  // Maiusc+F10 e «Allarga»: 16 px in più.
  const prima = (await larghezze(page, "q[0]")).intestazione;
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: it.colonnaAllarga, exact: true }).click();
  expect(Math.abs((await larghezze(page, "q[0]")).intestazione - (prima + 16))).toBeLessThanOrEqual(1);
  // «Stringi» fino al minimo sulla condizione: le celle («Vero», «Falso») restano larghe 24 px e si tagliano.
  await intestazione(page, "#condizione").focus();
  for (let k = 0; k < 20 && (await larghezze(page, "#condizione")).intestazione > 24; k++) {
    await page.keyboard.press("Shift+F10");
    await page.getByRole("menuitem", { name: it.colonnaStringi, exact: true }).click();
  }
  expect(await larghezze(page, "#condizione")).toEqual({ intestazione: 24, celle: [24], tagliata: true });
  // Al minimo «Stringi» non è più disponibile.
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: it.colonnaStringi, exact: true })).toHaveAttribute("aria-disabled", "true");
});

test("l'ordine scelto vale per l'esecuzione dopo, e il CSV uguale alla tabella ha le colonne nell'ordine mostrato", async ({ page }) => {
  await apriEdEsegui(page);
  await intestazione(page, "somma").focus();
  for (let k = 0; k < 2; k++) {
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: it.colonnaSinistra, exact: true }).click();
  }
  const mostrato = ["q[0]", "q[1]", "q[2]", "somma", "i", "x", "_indice", "#condizione", "#scrive"];
  expect(await ordine(page)).toEqual(mostrato);
  await esegui(page);
  expect(await ordine(page)).toEqual(mostrato);
  await page.evaluate(() => Object.assign(window.__finzione__, { daEsportare: "C:\\Documenti\\quadrati" }));
  await (await voceDelMenu(page, it.esportaTabella)).click();
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.esportataIn, { file: "quadrati.csv" }));
  const csv = await page.evaluate(() => window.__finzione__.file["C:\\Documenti\\quadrati.csv"]!);
  const nomi = { "#condizione": it.tracciaCondizione, "#scrive": it.tracciaScrive };
  const attesa = [it.tracciaNumero, it.tracciaRegola, ...mostrato.map((c) => (c in nomi ? nomi[c as keyof typeof nomi] : `${c} (${it.tipoIntero})`))].join(";");
  expect(csv.slice(1).split("\r\n")[0]).toBe(attesa);
});
