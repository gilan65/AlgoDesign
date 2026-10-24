// La Lettura con la domanda nei motori, col guscio simulato e il file del corpus che ne ha tre
// («domanda-prima-della-lettura») dato all'avvio:
// - l'opzione nelle Impostazioni, scheda «Aspetto»: il riquadro «Blocco di Lettura» dopo «Riquadro dei cicli» e
//   «Blocchi selezionati», prima di «Comandi della barra», spento di partenza; accesa, il disegno unisce le coppie (la Lettura su due righe, la domanda
//   sopra), spenta torna com'era; il file salvato è lo stesso byte per byte;
// - il trascinamento del blocco unito sposta la Scrittura e la Lettura insieme, e Annulla riporta il file;
// - il passo sulla domanda e poi sulla Lettura: lo stesso blocco, con la riga del passo cerchiata, sopra e poi sotto.
//
// Che cosa NON guarda: i campi, l'eliminazione, la copia, il punto e la tabella (`ui/disegno/domanda.test.tsx`); la regola e
// le operazioni (prove del nucleo).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apri, salva } from "../core/progetto/formato";
import type { Blocco } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";

const TESTO = readFileSync(fileURLToPath(new URL("../casi/tappa-1/domanda-prima-della-lettura.algo", import.meta.url)), "utf8");
const PERCORSO = "C:\\Documenti\\domanda.algo";

test.beforeAll(costruisciFinzione);

async function avvia(page: Page, preferenze: Record<string, unknown>): Promise<void> {
  await apriVuota(page, { lingua: "it", ...preferenze }, { argomento: PERCORSO, file: { [PERCORSO]: TESTO } });
  await expect(page.getByRole("status")).toContainText("Aperto");
}
const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const salvato = (page: Page) => page.evaluate((p) => window.__finzione__.file[p], PERCORSO);
/** Ctrl+S, e il testo che QUESTO salvataggio scrive: prima un segno nel disco finto, che solo la scrittura nuova toglie
 * (il file di partenza è già `atteso`, e senza il segno il poll si risolverebbe prima del salvataggio). */
async function salvaEAspetta(page: Page, atteso: string): Promise<void> {
  const segno = "prima del salvataggio";
  await page.evaluate(([p, s]) => void (window.__finzione__.file[p!] = s!), [PERCORSO, segno]);
  await page.keyboard.press("Control+s");
  await expect.poll(() => salvato(page)).not.toBe(segno);
  expect(await salvato(page)).toBe(atteso);
}
const dueGiri = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

test("l'opzione nella scheda «Aspetto»: spenta di partenza, dopo «Riquadro dei cicli»; accesa unisce, spenta torna; il file non cambia", async ({ page }) => {
  await avvia(page, {});
  await expect(blocco(page, "b3")).toHaveCount(1);
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  const legende = await f.getByRole("tabpanel", { name: it.impostazioniDisegno, exact: true }).locator("fieldset > legend").allTextContents();
  const i = legende.indexOf(it.bloccoDiLettura);
  // Fra i cicli e la Lettura, il gruppo dei blocchi selezionati (subito dopo «Riquadro dei cicli»).
  expect(legende.slice(i - 2, i + 2)).toEqual([it.riquadroDeiCicli, it.sceltaDiPiuBlocchi, it.bloccoDiLettura, it.comandiDellaBarra]);
  const casella = f.getByRole("checkbox", { name: it.domandaNellaLettura, exact: true });
  await expect(casella).not.toBeChecked();
  await expect(casella).toHaveAccessibleDescription(it.domandaNellaLetturaSpiegazione);
  await casella.check();
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
  // Accesa: la Scrittura unita non è un blocco, la Lettura ha due righe e la domanda sopra.
  await expect(blocco(page, "b3")).toHaveCount(0);
  const righe = page.locator('svg g[data-id="b4"] text[data-testo] > tspan');
  await expect(righe).toHaveCount(2);
  const [sopra, sotto] = [await righe.nth(0).boundingBox(), await righe.nth(1).boundingBox()];
  expect(await righe.nth(0).textContent()).toBe('"Come ti chiami?"');
  expect(await righe.nth(1).textContent()).toBe("leggi nome");
  expect(sopra!.y).toBeLessThan(sotto!.y);
  await salvaEAspetta(page, TESTO);
  // Spenta di nuovo: come all'inizio.
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  await f.getByRole("checkbox", { name: it.domandaNellaLettura, exact: true }).uncheck();
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(blocco(page, "b3")).toHaveCount(1);
  await expect(page.locator('svg g[data-id="b4"] text[data-testo] > tspan')).toHaveCount(1);
  await salvaEAspetta(page, TESTO);
});

async function trascina(page: Page, da: Locator, a: Locator): Promise<void> {
  await da.evaluate((e) => e.scrollIntoView({ block: "center", inline: "center" }));
  await dueGiri(page);
  const s = await da.boundingBox();
  const t = await a.boundingBox();
  if (!s || !t) throw new Error("un elemento da trascinare o il bersaglio non ha una posizione");
  const [sx, sy, tx, ty] = [s.x + s.width / 2, s.y + s.height / 2, t.x + t.width / 2, t.y + t.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.mouse.up();
  await dueGiri(page);
}

test("il blocco unito trascinato sposta la Scrittura e la Lettura insieme; Annulla riporta il file", async ({ page }) => {
  await avvia(page, { domandaNellaLettura: true });
  // Sopra il primo blocco: la coppia «Come ti chiami?» va in testa.
  await trascina(page, blocco(page, "b4"), page.locator('[data-punto="f1/body/0"]'));
  await page.keyboard.press("Control+s");
  await expect.poll(async () => {
    const t = await salvato(page);
    const a = t === undefined ? undefined : apri(t);
    return a?.ok ? a.progetto.functions[0]!.body.map((b: Blocco) => b.id).join(",") : "";
  }).toBe("b3,b4,b1,b2,b5,b6,b7,b12");
  await page.keyboard.press("Control+z");
  await salvaEAspetta(page, TESTO);
  // Controllo positivo: il file di partenza è quello che il salvataggio scrive.
  const a = apri(TESTO);
  expect(a.ok && salva(a.progetto)).toBe(TESTO);
});

test("il passo sulla domanda e poi sulla Lettura: lo stesso blocco, con la riga del passo cerchiata sopra e poi sotto", async ({ page }) => {
  await avvia(page, { domandaNellaLettura: true });
  const riga = page.locator("[data-riga-corrente]");
  const console = page.getByRole("log");
  // La prima pausa è su «Inizio»: F10 finché il passo arriva alla prima Scrittura.
  await page.keyboard.press("F10");
  await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  for (let k = 0; k < 3 && (await blocco(page, "b1").getAttribute("aria-current")) !== "step"; k++) {
    await page.keyboard.press("F10");
    await page.waitForTimeout(100);
  }
  await expect(blocco(page, "b1")).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("F10");
  await expect(blocco(page, "b2")).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("F10");
  const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: "anno" }), exact: true });
  await campo.fill("2026");
  await campo.press("Enter");
  // Sulla domanda: il blocco della Lettura è corrente, cerchiata la riga sopra.
  await expect(blocco(page, "b4")).toHaveAttribute("aria-current", "step");
  await expect(riga).toHaveAttribute("data-riga-corrente", "0");
  const forma = await page.locator('svg g[data-id="b4"]').first().boundingBox();
  const cerchiata = await riga.boundingBox();
  expect(cerchiata!.y + cerchiata!.height / 2).toBeLessThan(forma!.y + forma!.height / 2);
  await page.keyboard.press("F10");
  // Sulla Lettura: lo stesso blocco, cerchiata la riga sotto.
  await expect(blocco(page, "b4")).toHaveAttribute("aria-current", "step");
  await expect(riga).toHaveAttribute("data-riga-corrente", "1");
  const sotto = await riga.boundingBox();
  expect(sotto!.y + sotto!.height / 2).toBeGreaterThan(forma!.y + forma!.height / 2);
  await expect(console).toContainText("Come ti chiami? ");
});
