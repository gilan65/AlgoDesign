// La libreria e l'importazione nei motori, col guscio simulato: il programma di riferimento della tappa 3 aperto come
// file dato all'avvio, la cartella delle librerie con la libreria del corpus nel gruppo «Scuola».
// - dalla cartella: il gruppo, la scelta, la spunta, la scelta di un conflitto; «Importa» entra in un passo solo (il file
//   salvato è quello che il nucleo fa del progetto) e Annulla riporta il file di partenza, byte per byte;
// - da un altro file, e «Aggiungi il progetto aperto» con la libreria aperta: il file nuovo nel gruppo «Le mie librerie»,
//   che la finestra mostra subito.
//
// Che cosa NON guarda: le righe del riepilogo una per una e i rifiuti dei nomi (`ui/finestre/FinestraImporta.test.tsx`);
// le regole dell'importazione (`core/modifica/importa.test.ts`); il guscio vero (la prova sul prodotto).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { primoLibero } from "../core/modifica/identificatori";
import { importa } from "../core/modifica/importa";
import { apri, salva } from "../core/progetto/formato";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

const corpus = (f: string) => readFileSync(fileURLToPath(new URL(`../casi/tappa-3/${f}`, import.meta.url)), "utf8");
const RIFERIMENTO = corpus("riferimento-media-voti-funzioni.algo");
const LIBRERIA = corpus("libreria-dei-voti.algo");
const TRE_LIVELLI = corpus("tre-livelli.algo");
const PROGRAMMA = "C:\\Documenti\\riferimento.algo";
const DELLA_LIBRERIA = "C:\\Documenti\\libreria.algo";
const ALTRO = "C:\\Documenti\\tre-livelli.algo";

test.beforeAll(costruisciFinzione);

async function avvia(page: Page, argomento: string): Promise<void> {
  await apriVuota(page, { lingua: "it" }, {
    argomento,
    file: { [PROGRAMMA]: RIFERIMENTO, [DELLA_LIBRERIA]: LIBRERIA, [ALTRO]: TRE_LIVELLI },
    daAprire: ALTRO,
    librerie: { "Scuola/": "", "Scuola/Libreria dei voti.algo": LIBRERIA },
    cartellaLibrerie: "C:\\Chiavetta\\data\\librerie",
  });
  await expect(page.getByRole("status")).toContainText("Aperto");
}
const finestraDellImportazione = (page: Page) => page.getByRole("dialog", { name: it.importaTitolo, exact: true });
async function apriLImportazione(page: Page) {
  await (await voceDelMenu(page, it.importaFunzioni)).click();
  const f = finestraDellImportazione(page);
  await expect(f).toBeVisible();
  return f;
}
/** «Salva» (Ctrl+S), poi il file sul disco finto, finché è quello atteso. */
async function salvaEAspetta(page: Page, percorso: string, atteso: string): Promise<void> {
  await page.keyboard.press("Control+s");
  await expect.poll(() => page.evaluate((p) => window.__finzione__.file[p], percorso)).toBe(atteso);
}

test("dalla cartella delle librerie: «Importa» entra in un passo solo, e Annulla riporta il file di partenza", async ({ page }) => {
  await avvia(page, PROGRAMMA);
  const f = await apriLImportazione(page);
  await f.locator('[data-gruppo="Scuola"]').getByRole("button", { name: /Scuola/ }).click();
  await f.locator('[data-gruppo="Scuola"]').getByRole("button", { name: it.importaScegli, exact: true }).click();
  await expect(f.getByText(riempi(it.importaDa, { nome: "libreria-dei-voti" }), { exact: true })).toBeVisible();
  await f.getByRole("checkbox", { name: /giudizio/ }).check();
  await f.getByRole("combobox", { name: riempi(it.importaSceltaDi, { nome: "valido" }), exact: true }).selectOption("sostituisci");
  await expect(f.locator('[data-voce="f:f3"]')).toContainText(riempi(it.importaCasiEliminati, { n: "2" }));
  await f.getByRole("button", { name: it.importaConferma, exact: true }).click();
  await expect(f).toBeHidden();
  await expect(page.getByRole("status")).toHaveText(riempi(it.importaFatto, { nomi: "valido, stelle_di, giudizio, MAX_VOTI", tasto: "Ctrl+Z" }));
  // Il file è quello che il nucleo fa del progetto.
  const p = apri(RIFERIMENTO);
  const l = apri(LIBRERIA);
  if (!p.ok || !l.ok) throw new Error("un file del corpus non si apre");
  const atteso = importa(l.progetto, ["f7"], { conCasi: true, scelte: new Map([["f:f3", { come: "sostituisci" }]]) })(p.progetto, primoLibero(p.progetto));
  if (!atteso.ok) throw new Error("l'importazione del nucleo è rifiutata");
  await salvaEAspetta(page, PROGRAMMA, salva(atteso.progetto));
  // Annulla una volta: il file di partenza, byte per byte.
  await page.keyboard.press("Control+z");
  await salvaEAspetta(page, PROGRAMMA, RIFERIMENTO);
  // Controllo positivo: i due file sono diversi.
  expect(salva(atteso.progetto)).not.toBe(RIFERIMENTO);
});

test("da un altro file; e «Aggiungi il progetto aperto» con la libreria aperta, nel gruppo «Le mie librerie»", async ({ page }) => {
  await avvia(page, DELLA_LIBRERIA);
  let f = await apriLImportazione(page);
  await f.getByRole("button", { name: it.importaDaFile, exact: true }).click();
  await expect(f.getByText(riempi(it.importaDa, { nome: "tre-livelli" }), { exact: true })).toBeVisible();
  await f.getByRole("checkbox", { name: /mostra/ }).check();
  await expect(f.locator("[data-voce]")).toHaveCount(3);
  await f.getByRole("button", { name: it.importaCambia, exact: true }).click();
  await f.getByRole("button", { name: it.importaAggiungi, exact: true }).click();
  await expect(f.locator(`[data-gruppo="${it.importaGruppoMiei}"]`)).toBeVisible();
  expect(await page.evaluate(() => window.__finzione__.librerie?.[`Le mie librerie/libreria-dei-voti.algo`])).toBe(LIBRERIA);
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  // Riaperta, la cartella riletta mostra il gruppo nuovo.
  f = await apriLImportazione(page);
  await expect(f.locator('[data-gruppo]')).toHaveCount(2);
});
