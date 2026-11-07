// «Salva per segnalare un malfunzionamento…» nel motore vero (server di sviluppo e build), col guscio simulato: il comando, la finestra col
// testo esatto, la finestra del sistema.
//
// - Il comando c'è solo con un'esecuzione ferma: spento senza, durante la corsa e dopo «Ferma». Con la registrazione attiva: `e2e/in-registrazione.e2e.ts`.
// - Il testo mostrato è byte per byte ciò che arriva alla scrittura, si riapre col lettore, ha solo i campi dell'elenco chiuso e nessun
//   percorso né il nome del profilo. Controllo positivo: il rilevatore si accende su un file delle preferenze vero.
// - Nessuna scrittura senza il gesto: rinunciando alla finestra, a quella del sistema o alla domanda «Sostituire?» nessun file, e si torna
//   allo stesso testo.
// - L'esecuzione animata va avanti dietro la finestra: il testo resta quello dell'apertura.
//
// CHE COSA NON GUARDA:
// - la pagina dopo un errore nel disegno: `e2e/errori-dell-app.e2e.ts`;
// - un testo che non si può preparare: nella finestra non è provato, nella pagina dopo un errore sì (`ui/ErroreInatteso.test.tsx`);
// - le tracce sul prodotto, fuori dal file scelto: `strumenti/prova-portabile.ts`.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apriRegistrazione } from "../core/registrazione/formato";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { percorsiEProfilo } from "../strumenti/registrazioni-del-corpus";
import { fileDa, scelteIniziali } from "../ui/preferenze";
import { apriVuota, costruisciFinzione, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });
test.describe.configure({ mode: "parallel" });

const DOVE = String.raw`C:\Users\Mario Rossi\Documenti\voti.algo`;
const VOTI = readFileSync(fileURLToPath(new URL("../casi/tappa-1/riferimento-media-voti.algo", import.meta.url)), "utf8");
const SCRITTO = "C:\\miei\\segnalazione";
const FILE = `${SCRITTO}.txt`;

/** Un programma che non finisce: l'animata ha sempre un passo dopo. */
const CHE_NON_FINISCE = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "Non finisce" },
  functions: [
    {
      id: "f0",
      kind: "main",
      data: [{ name: "i", type: "integer", initial: "0" }],
      body: [{ id: "b2", kind: "while", condition: "i >= 0", body: [{ id: "b3", kind: "assignment", target: "i", value: "i + 1" }] }],
      end: { id: "b1" },
    },
  ],
});

const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const imposta = (page: Page, valori: object) => page.evaluate((v) => void Object.assign(window.__finzione__, v), valori);
const stato = (page: Page) => page.locator("[data-stato-esecuzione]");
const laFinestra = (page: Page) => page.getByRole("dialog", { name: it.segnalaTitolo, exact: true });
const ilTesto = (f: Locator) => f.locator("[data-testo-della-segnalazione]");
const conferma = (f: Locator) => f.getByRole("button", { name: it.segnalaSalva, exact: true });
const rinuncia = (f: Locator) => f.getByRole("button", { name: it.annullaEsc, exact: true });
const voce = (page: Page) => voceDellAiuto(page, it.segnalaComando);

async function apriIlProgetto(page: Page, testo: string, percorso = DOVE, altro: object = {}): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: testo }, ...altro });
  await expect(page.getByRole("status")).toContainText(riempi(it.apertoIl, { file: percorso.split("\\").at(-1)! }));
}

async function apriLaFinestra(page: Page): Promise<Locator> {
  await (await voce(page)).click();
  const f = laFinestra(page);
  await expect(f).toBeVisible();
  return f;
}

test("il comando è nel menu «Aiuto», dopo la voce della registrazione; c'è solo con un'esecuzione ferma", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const spenta = async (spento: boolean, dove: string) => {
    const v = await voce(page);
    if (spento) await expect(v, dove).toHaveAttribute("aria-disabled", "true");
    else await expect(v, dove).not.toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  };
  await (await voce(page)).waitFor();
  const voci = await page.getByRole("menu", { name: it.menuAiuto, exact: true }).getByRole("menuitem").allInnerTexts();
  expect(voci.map((v) => v.trim().split("\n")[0])).toEqual([it.guida, it.esempi, it.registraAttiva, it.segnalaComando, it.informazioni]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await spenta(true, "senza un'esecuzione");
  await page.keyboard.press("F10");
  await expect(stato(page)).not.toHaveText(it.statoPronto);
  await spenta(false, "in pausa");
  await page.keyboard.press("F5");
  await expect(stato(page)).toHaveText(it.statoFinita);
  await spenta(false, "a esecuzione finita");
  await page.keyboard.press("Shift+F5");
  await expect(stato(page)).toHaveText(it.statoPronto);
  await spenta(true, "dopo «Ferma»");
});

test("il testo mostrato è byte per byte quello scritto, si riapre e non ha percorsi: un errore dell'app forzato c'è, senza il percorso", async ({ page }, info) => {
  await apriIlProgetto(page, VOTI, DOVE, { daSalvareIlCodice: SCRITTO });
  await page.keyboard.press("F10");
  await expect(stato(page)).not.toHaveText(it.statoPronto);
  // Un errore che nessuno prende, con un percorso e il nome del profilo dentro.
  await page.evaluate((p) => void Promise.reject(new Error(`sonda della promessa in ${p}: fine`)), DOVE);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));

  const f = await apriLaFinestra(page);
  await expect(f).toContainText(it.segnalaFrase);
  await expect(f).toContainText(it.segnalaContiene);
  const mostrato = (await ilTesto(f).textContent())!;

  // Ancora nessuna scrittura: l'atto è il gesto.
  expect((await finzione(page)).file[FILE]).toBeUndefined();
  await conferma(f).click();
  await expect(f).toBeHidden();
  await expect(page.getByRole("status")).toHaveText(riempi(it.segnalaSalvatoIn, { file: "segnalazione.txt" }));
  const g = await finzione(page);
  expect(g.file[FILE]).toBe(mostrato);
  expect(g.finestre.proposto).toBe(riempi(it.nomeDellaSegnalazione, { nome: "riferimento-media-voti" }));
  // Solo quel file: il progetto di partenza è intatto, nessun altro è comparso.
  expect(Object.keys(g.file).sort()).toEqual([FILE, DOVE].sort());
  expect(g.file[DOVE]).toBe(VOTI);

  const riaperta = apriRegistrazione(mostrato);
  if (!riaperta.ok) throw new Error(`riaperta con errori: ${JSON.stringify(riaperta.errori)}`);
  const r = riaperta.registrazione;
  // Il sistema è quello che il progetto della prova dichiara: Windows per Chromium, Linux per WebKit (`playwright.config.ts`).
  const sistema = (info.project.use.userAgent ?? "").includes("Windows") ? "windows" : "linux";
  expect([r.product_version.length > 0, r.language, r.system]).toEqual([true, "it", sistema]);
  expect(r.executions.length).toBe(1);
  expect(r.executions[0]!.project.metadata.name).toBe("riferimento-media-voti");

  // L'errore forzato, per elementi: uno solo con quella sonda, senza il percorso.
  const sonde = r.app_errors.filter((v) => v.text.includes("sonda della promessa"));
  expect(sonde.map((v) => [v.origin, v.times])).toEqual([["rejected", 1]]);
  expect(sonde[0]!.text).toContain("<path>");

  // Il rilevatore tace sul testo; controllo positivo: si accende sul file delle preferenze vero, che porta i percorsi.
  const trovati = percorsiEProfilo(mostrato);
  const preferenze = JSON.stringify(fileDa("it", { ...scelteIniziali, cartellaEsempi: String.raw`C:\Users\Mario Rossi\Esempi` }));
  const accesi = percorsiEProfilo(preferenze);
  console.log(`[${info.project.name}] testo di ${Buffer.byteLength(mostrato)} B, occorrenze ${trovati.length}, sul file delle preferenze ${accesi.length}`);
  expect(trovati).toEqual([]);
  expect(accesi.length).toBeGreaterThan(0);
  expect(mostrato).not.toContain("Rossi");
});

test("nessuna scrittura senza il gesto: rinunciando alla finestra, a quella del sistema o a «Sostituire?» nessun file, e il testo resta lo stesso", async ({ page }) => {
  await apriIlProgetto(page, VOTI, DOVE, { daSalvareIlCodice: null });
  await page.keyboard.press("F10");
  await expect(stato(page)).not.toHaveText(it.statoPronto);

  // La finestra: «Annulla» ed Esc.
  let f = await apriLaFinestra(page);
  await rinuncia(f).click();
  await expect(f).toBeHidden();
  f = await apriLaFinestra(page);
  await expect.poll(() => f.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  // Il fuoco parte dal testo, che scorre con la tastiera, e col Tab non esce dalla finestra.
  await expect(ilTesto(f)).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(await f.evaluate((el) => el.contains(document.activeElement)), `al Tab ${i + 1} il fuoco è uscito`).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  // Chiusa da tastiera, il fuoco torna sul pulsante del menu.
  await expect(page.getByRole("banner").getByRole("button", { name: it.menuAiuto, exact: true })).toBeFocused();
  expect((await finzione(page)).finestre.codice ?? 0).toBe(0);

  // La finestra del sistema: rinunciando si resta sulla finestra, con lo stesso testo.
  f = await apriLaFinestra(page);
  const testo = await ilTesto(f).textContent();
  await conferma(f).click();
  await expect.poll(async () => (await finzione(page)).finestre.codice).toBe(1);
  await expect(f).toBeVisible();
  expect(await ilTesto(f).textContent()).toBe(testo);

  // «Sostituire?»: «no» torna alla finestra con lo stesso testo, «sì» scrive quel testo.
  await imposta(page, { daSalvareIlCodice: SCRITTO, file: { [DOVE]: VOTI, [FILE]: "di prima" } });
  await conferma(f).click();
  const domanda = page.getByRole("alertdialog", { name: riempi(it.sostituireTitolo, { file: "segnalazione.txt" }), exact: true });
  await domanda.getByRole("button", { name: it.sostituireRinuncia, exact: true }).click();
  await expect(domanda).toBeHidden();
  await expect(f).toBeVisible();
  expect(await ilTesto(f).textContent()).toBe(testo);
  expect((await finzione(page)).file[FILE]).toBe("di prima");

  await conferma(f).click();
  await domanda.getByRole("button", { name: it.sostituireConferma, exact: true }).click();
  await expect(f).toBeHidden();
  await expect.poll(async () => (await finzione(page)).file[FILE]).toBe(testo);

  // Una scrittura rifiutata lo dice con la sua finestra e il file resta com'era.
  await imposta(page, { scritturaRifiutata: "sonda del guscio", daSalvareIlCodice: "C:\\miei\\altra" });
  f = await apriLaFinestra(page);
  await conferma(f).click();
  await expect(page.getByRole("alertdialog", { name: riempi(it.segnalaErroreTitolo, { file: "altra.txt" }), exact: true })).toBeVisible();
  expect((await finzione(page)).file["C:\\miei\\altra.txt"]).toBeUndefined();
});

test("l'esecuzione animata va avanti dietro la finestra: il testo resta quello dell'apertura, ed è quello scritto", async ({ page }) => {
  await apriIlProgetto(page, CHE_NON_FINISCE, DOVE, { daSalvareIlCodice: SCRITTO });
  await page.locator('[data-comando="animata"]').click();
  await expect(stato(page)).not.toHaveText(it.statoPronto);
  // Fra un'azione e l'altra il comando c'è: si apre quando l'esecuzione è ferma fra due passi.
  let f = laFinestra(page);
  await expect(async () => {
    await (await voce(page)).click();
    await expect(laFinestra(page)).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  f = laFinestra(page);
  const testo = (await ilTesto(f).textContent())!;
  const prima = await stato(page).textContent();
  await expect.poll(() => stato(page).textContent(), { message: "l'animata dietro la finestra non è andata avanti" }).not.toBe(prima);
  expect(await ilTesto(f).textContent()).toBe(testo);
  await conferma(f).click();
  await expect(f).toBeHidden();
  await expect.poll(async () => (await finzione(page)).file[FILE]).toBe(testo);
  const riaperta = apriRegistrazione(testo);
  expect(riaperta.ok).toBe(true);
});
