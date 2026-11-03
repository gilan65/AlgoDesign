// La registrazione delle esecuzioni nel motore vero (server di sviluppo e build), col guscio simulato.
//
// - La attiva solo l'utente: spenta all'avvio e dopo un ricaricamento; attivarla, disattivarla e registrare non scrivono nulla, né file né
//   preferenze. Controllo positivo: il rilevatore si accende su una scrittura vera delle preferenze, fatta dalla stessa prova.
// - Finché è attiva si vede: il segno accanto allo stato dell'esecuzione, per intero anche alla larghezza minima con un nome lungo.
// - Il file ha le esecuzioni dall'attivazione, ognuna col progetto di allora, e si riproduce; anche dopo «Ferma», anche un programma che
//   non finisce, anche con i limiti cambiati in mezzo, anche dopo Nuovo, Apri e Chiudi; il testo mostrato è quello scritto.
// - Un errore dell'app è legato all'esecuzione aperta quando è arrivato.
//
// CHE COSA NON GUARDA:
// - la pagina dopo un errore nel disegno con la registrazione attiva: `e2e/errori-dell-app.e2e.ts`;
// - le tracce sul prodotto e il riavvio vero: `strumenti/prova-portabile.ts`;
// - il tetto delle esecuzioni per elementi e le posizioni degli errori: `core/registrazione/in-registrazione.test.ts`.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { apriRegistrazione, type Registrazione } from "../core/registrazione/formato";
import { tettoDelleEsecuzioni } from "../core/registrazione/in-registrazione";
import { riproduci } from "../core/registrazione/riproduzione";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione, voceDellAiuto, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });
test.describe.configure({ mode: "parallel" });

const DOVE = "C:\\miei\\scrive.algo";
const SCRITTO = "C:\\miei\\segnalazione";
const FILE = `${SCRITTO}.txt`;

const progetto = (nome: string, corpo: readonly object[], dati: readonly object[] = []) =>
  JSON.stringify({ format: "algodesign", schema_version: 2, metadata: { name: nome }, functions: [{ id: "f0", kind: "main", data: dati, body: corpo, end: { id: "b1" } }] });

/** Finisce da solo, senza letture. */
const CHE_SCRIVE = progetto("Scrive", [{ id: "b2", kind: "write", values: ['"ciao"'], newline: true }]);
const CHE_NON_FINISCE = progetto("Non finisce", [{ id: "b2", kind: "while", condition: "i >= 0", body: [{ id: "b3", kind: "assignment", target: "i", value: "i + 1" }] }], [{ name: "i", type: "integer", initial: "0" }]);

const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const stato = (page: Page) => page.locator("[data-stato-esecuzione]");
const segno = (page: Page) => page.locator("[data-in-registrazione]");
const avviso = (page: Page) => page.getByRole("status");
const laFinestra = (page: Page) => page.getByRole("dialog", { name: it.segnalaTitolo, exact: true });
const ilTesto = (f: Locator) => f.locator("[data-testo-della-segnalazione]");
const molte = (n: number) => riempi(it.statoInRegistrazioneMolte, { n: String(n) });

async function apriIlProgetto(page: Page, testo: string, altro: object = {}): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { argomento: DOVE, file: { [DOVE]: testo }, ...altro });
  await expect(avviso(page)).toContainText(riempi(it.apertoIl, { file: "scrive.algo" }));
}

/** Finché un menu è nel documento i tasti della finestra tacciono: un F5 subito dopo una voce andrebbe perso (il build arriva a farlo). */
const menuChiuso = (page: Page) => expect(page.getByRole("menu")).toHaveCount(0);

async function attiva(page: Page): Promise<void> {
  await (await voceDellAiuto(page, it.registraAttiva)).click();
  await expect(segno(page)).toBeVisible();
  await expect(avviso(page)).toHaveText(it.registrazioneAttivata);
  await menuChiuso(page);
}

async function apriLaFinestra(page: Page): Promise<Locator> {
  await (await voceDellAiuto(page, it.segnalaComando)).click();
  const f = laFinestra(page);
  await expect(f).toBeVisible();
  return f;
}

/** Il testo della finestra, riaperto col lettore; la finestra si richiude senza scrivere. */
async function ilFile(page: Page): Promise<Registrazione> {
  const f = await apriLaFinestra(page);
  const aperta = apriRegistrazione((await ilTesto(f).textContent())!);
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  if (!aperta.ok) throw new Error(`riaperto con errori: ${JSON.stringify(aperta.errori)}`);
  return aperta.registrazione;
}

/** F10 e la sua pausa: «in corso» passa prima, e fermandola lì il file direbbe giustamente un'esecuzione fra due fette. */
async function unPasso(page: Page): Promise<void> {
  await page.keyboard.press("F10");
  await expect(stato(page)).toHaveText(new RegExp(`^${it.statoInPausa.split("{n}")[0]}`));
}

async function eseguiFinoAllaFine(page: Page): Promise<void> {
  await page.keyboard.press("F5");
  await expect(stato(page)).toHaveText(it.statoFinita);
}

test("la voce sta prima di «Salva per segnalare…» e c'è sempre; la attiva e la disattiva solo l'utente, e il segno lo dice", async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE);
  await expect(segno(page)).toHaveCount(0);
  await (await voceDellAiuto(page, it.registraAttiva)).waitFor();
  const voci = await page.getByRole("menu", { name: it.menuAiuto, exact: true }).getByRole("menuitem").allInnerTexts();
  expect(voci.map((v) => v.trim().split("\n")[0])).toEqual([it.guida, it.esempi, it.registraAttiva, it.segnalaComando, it.informazioni]);
  await page.keyboard.press("Escape");
  await menuChiuso(page);

  // Prima dell'esecuzione: «Salva…» resta spento finché non c'è un'esecuzione.
  await attiva(page);
  await expect(segno(page)).toHaveText(it.statoInRegistrazione);
  await expect(await voceDellAiuto(page, it.segnalaComando)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await menuChiuso(page);

  await eseguiFinoAllaFine(page);
  await expect(segno(page)).toHaveText(it.statoInRegistrazioneUna);
  await eseguiFinoAllaFine(page);
  await expect(segno(page)).toHaveText(molte(2));

  await (await voceDellAiuto(page, it.registraDisattiva)).click();
  await expect(segno(page)).toHaveCount(0);
  await expect(avviso(page)).toHaveText(it.registrazioneDisattivata);
  await expect(await voceDellAiuto(page, it.registraAttiva)).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await menuChiuso(page);

  // Riattivata non ha le esecuzioni di prima: tranne quella aperta, che conta.
  await attiva(page);
  await expect(segno(page)).toHaveText(it.statoInRegistrazioneUna);
});

test("con un'esecuzione già aperta all'attivazione conta anche lei", async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE);
  await unPasso(page);
  await attiva(page);
  await expect(segno(page)).toHaveText(it.statoInRegistrazioneUna);
  const r = await ilFile(page);
  expect(r.executions.map((x) => x.outcome.kind)).toEqual(["paused"]);
  expect(r.executions_lost).toBe(0);
});

test("spenta all'avvio e dopo un ricaricamento; nessuna scrittura senza il gesto, né file né preferenze, e il rilevatore si accende su una vera", async ({ page }, info) => {
  await apriIlProgetto(page, CHE_SCRIVE, { daSalvareIlCodice: SCRITTO });
  await expect(segno(page)).toHaveCount(0);
  const prima = await finzione(page);
  const scrittePrima = prima.scritte.length;
  const filePrima = Object.keys(prima.file).sort();
  await attiva(page);
  await eseguiFinoAllaFine(page);
  await eseguiFinoAllaFine(page);
  const f = await apriLaFinestra(page);
  await f.getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(f).toBeHidden();
  await (await voceDellAiuto(page, it.registraDisattiva)).click();
  await expect(segno(page)).toHaveCount(0);
  await attiva(page);

  const dopo = await finzione(page);
  console.log(`[${info.project.name}] scritture delle preferenze ${scrittePrima} → ${dopo.scritte.length}, file ${filePrima.length} → ${Object.keys(dopo.file).length}`);
  expect(dopo.scritte.length).toBe(scrittePrima);
  expect(Object.keys(dopo.file).sort()).toEqual(filePrima);
  expect(dopo.file[FILE]).toBeUndefined();

  // Controllo positivo: una scrittura vera delle preferenze (la lingua dalla riga di stato) il rilevatore la vede, e non porta la registrazione.
  await page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-lingua]").click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect.poll(async () => (await finzione(page)).scritte.length).toBe(scrittePrima + 1);
  const scritta = JSON.stringify((await finzione(page)).scritte.at(-1));
  expect(scritta).toContain('"en"');
  expect(scritta.toLowerCase()).not.toContain("registra");
  expect(scritta.toLowerCase()).not.toContain("recording");

  // Il ricaricamento: spenta, e la voce torna quella di prima (nella lingua scelta).
  await page.reload();
  await expect(page.locator("[data-riga-di-stato]")).toBeVisible();
  await expect(segno(page)).toHaveCount(0);
});

test("il segno sta accanto allo stato, per intero, anche alla larghezza minima con un nome lungo", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 600 });
  const lungo = `C:\\miei\\${"un nome di file molto lungo ".repeat(4).trim()}.algo`;
  await apriVuota(page, { lingua: "it" }, { argomento: lungo, file: { [lungo]: CHE_SCRIVE } });
  await expect(page.locator("[data-file]")).toContainText("un nome di file");
  await attiva(page);
  await eseguiFinoAllaFine(page);
  await eseguiFinoAllaFine(page);
  await expect(segno(page)).toHaveText(molte(2));
  const misure = await page.locator("[data-riga-di-stato]").evaluate((riga) => {
    const r = riga.getBoundingClientRect();
    const s = riga.querySelector("[data-in-registrazione]")!;
    const b = s.getBoundingClientRect();
    const dopo = s.nextElementSibling;
    return { dentro: b.left >= r.left && b.right <= r.right, intero: s.scrollWidth <= s.clientWidth, siAllarga: riga.scrollWidth > riga.clientWidth, accanto: dopo?.hasAttribute("data-stato-esecuzione") ?? false };
  });
  expect(misure).toEqual({ dentro: true, intero: true, siAllarga: false, accanto: true });
});

test("nella finestra, a registrazione spenta, il consiglio e il pulsante che la attiva senza scrivere nulla; attiva, il numero delle esecuzioni e nessun consiglio", async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE, { daSalvareIlCodice: SCRITTO });
  await eseguiFinoAllaFine(page);
  let f = await apriLaFinestra(page);
  await expect(f).toContainText(it.segnalaConsiglio);
  await expect(f).toContainText(it.segnalaContiene);
  await f.getByRole("button", { name: it.segnalaAttiva, exact: true }).click();
  await expect(f).toBeHidden();
  await expect(segno(page)).toHaveText(it.statoInRegistrazioneUna);
  await expect(avviso(page)).toHaveText(it.registrazioneAttivata);
  expect((await finzione(page)).file[FILE]).toBeUndefined();
  // Chiusa da un pulsante della finestra, il fuoco torna al pulsante del menu.
  await expect(page.getByRole("banner").getByRole("button", { name: it.menuAiuto, exact: true })).toBeFocused();

  await eseguiFinoAllaFine(page);
  f = await apriLaFinestra(page);
  await expect(f).not.toContainText(it.segnalaConsiglio);
  await expect(f.getByRole("button", { name: it.segnalaAttiva, exact: true })).toHaveCount(0);
  await expect(f).toContainText(riempi(it.segnalaContieneRegistrate, { n: "2" }));
  await expect(f).not.toContainText(it.segnalaContiene);

  // Il testo mostrato è quello scritto, e salvare non spegne.
  const mostrato = (await ilTesto(f).textContent())!;
  await f.getByRole("button", { name: it.segnalaSalva, exact: true }).click();
  await expect(f).toBeHidden();
  await expect.poll(async () => (await finzione(page)).file[FILE]).toBe(mostrato);
  await expect(segno(page)).toHaveText(molte(2));
});

test("ogni esecuzione col progetto di allora, anche dopo «Ferma»; il comando si accende senza un'esecuzione aperta; il file si riproduce", async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE);
  await attiva(page);
  await eseguiFinoAllaFine(page);

  // Il progetto cambia fra le due: a esecuzione finita si modifica.
  await page.getByRole("button", { name: new RegExp(`^${it.sequenzaPrincipale}: inserisci al posto (\\d+) di \\1$`) }).click();
  await page.getByRole("menuitem", { name: it.bloccoCommento, exact: true }).click();
  await menuChiuso(page);
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoModificato);
  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 5, y: 5 } });

  await unPasso(page);
  await page.keyboard.press("Shift+F5");
  await expect(stato(page)).toHaveText(it.statoPronto);
  await expect(segno(page)).toHaveText(molte(2));
  // Senza registrazione il comando sarebbe spento: qui c'è.
  await expect(await voceDellAiuto(page, it.segnalaComando)).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await menuChiuso(page);

  const r = await ilFile(page);
  expect(r.executions.map((x) => [x.project.functions[0]!.body.length, x.outcome.kind])).toEqual([
    [1, "finished"],
    [2, "paused"],
  ]);
  expect(riproduci(r).uguale).toBe(true);
});

test("un programma che non finisce: mentre gira il comando è spento, fermato si salva e il file si riproduce fino a quel punto", async ({ page }) => {
  await apriIlProgetto(page, CHE_NON_FINISCE);
  await attiva(page);
  await page.keyboard.press("F5");
  await expect(stato(page)).toHaveText(it.statoInCorso);
  await expect(await voceDellAiuto(page, it.segnalaComando)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await menuChiuso(page);
  await page.keyboard.press("Shift+F5");
  await expect(stato(page)).toHaveText(it.statoPronto);
  await expect(segno(page)).toHaveText(it.statoInRegistrazioneUna);
  const r = await ilFile(page);
  expect(r.executions.map((x) => x.outcome.kind)).toEqual(["running"]);
  expect(r.executions[0]!.advances).toBeGreaterThan(0);
  expect(riproduci(r).uguale).toBe(true);
});

test("Nuovo, Apri e Chiudi non toccano la registrazione: le esecuzioni restano col loro progetto", async ({ page }) => {
  const altro = "C:\\miei\\altro.algo";
  await apriIlProgetto(page, CHE_SCRIVE, { daAprire: altro, file: { [DOVE]: CHE_SCRIVE, [altro]: progetto("Altro", []) } });
  await attiva(page);
  await eseguiFinoAllaFine(page);
  await (await voceDelMenu(page, it.nuovo)).click();
  const nuovo = page.getByRole("dialog", { name: it.progettoNuovoTitolo, exact: true });
  await nuovo.getByLabel(it.progettoNome, { exact: true }).fill("Vuoto");
  await nuovo.getByRole("button", { name: it.progettoCrea, exact: true }).click();
  await expect(nuovo).toBeHidden();
  await expect(segno(page)).toHaveText(it.statoInRegistrazioneUna);
  await menuChiuso(page);
  await eseguiFinoAllaFine(page);
  await (await voceDelMenu(page, it.apri)).click();
  await expect(avviso(page)).toContainText(riempi(it.apertoIl, { file: "altro.algo" }));
  await expect(segno(page)).toHaveText(molte(2));
  await menuChiuso(page);
  await eseguiFinoAllaFine(page);
  await (await voceDelMenu(page, it.chiudiProgetto)).click();
  await expect(segno(page)).toHaveText(molte(3));
  const r = await ilFile(page);
  expect(r.executions.map((x) => x.project.functions[0]!.body.length)).toEqual([1, 0, 0]);
  expect(r.executions.map((x) => x.project.metadata.name)).toEqual(["Scrive", "Vuoto", "Altro"]);
  expect(riproduci(r).uguale).toBe(true);
});

test("i limiti cambiati fra due esecuzioni: ognuna coi suoi, e il file si riproduce", async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE);
  await attiva(page);
  await eseguiFinoAllaFine(page);
  await page.locator('[data-comando="impostazioni"]').click();
  const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  await f.getByRole("tab", { name: it.impostazioniConsole, exact: true }).click();
  await f.locator("[data-caratteri] input, input[data-caratteri]").first().fill("120");
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
  await eseguiFinoAllaFine(page);
  const r = await ilFile(page);
  expect(r.executions[0]!.long_lines).toBeUndefined();
  expect(r.executions[1]!.long_lines?.characters).toBe(120);
  expect(r.long_lines.characters).not.toBe(120);
  expect(riproduci(r).uguale).toBe(true);
});

test(`oltre le ${tettoDelleEsecuzioni} esecuzioni il segno si ferma lì, il file dice quante mancano e la finestra lo dice`, async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE);
  await attiva(page);
  for (let i = 0; i < tettoDelleEsecuzioni + 2; i++) await eseguiFinoAllaFine(page);
  await expect(segno(page)).toHaveText(molte(tettoDelleEsecuzioni));
  const f = await apriLaFinestra(page);
  await expect(f).toContainText(riempi(it.segnalaEsecuzioniPerse, { tetto: String(tettoDelleEsecuzioni), n: "2" }));
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  const r = await ilFile(page);
  expect([r.executions.length, r.executions_lost]).toEqual([tettoDelleEsecuzioni, 2]);
});

test("un errore dell'app è legato all'esecuzione aperta quando è arrivato, e a nessuna se è arrivato fra due", async ({ page }) => {
  await apriIlProgetto(page, CHE_SCRIVE);
  const rifiuta = async (sonda: string) => {
    await page.evaluate((s) => void Promise.reject(new Error(s)), sonda);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));
  };
  await attiva(page);
  await eseguiFinoAllaFine(page);
  await page.keyboard.press("Shift+F5");
  await expect(stato(page)).toHaveText(it.statoPronto);
  await rifiuta("sonda fra le due");
  await unPasso(page);
  await rifiuta("sonda durante");
  const r = await ilFile(page);
  const fra = r.app_errors.findIndex((v) => v.text.includes("sonda fra le due"));
  const durante = r.app_errors.findIndex((v) => v.text.includes("sonda durante"));
  expect(fra).toBeGreaterThanOrEqual(0);
  expect(durante).toBeGreaterThanOrEqual(0);
  expect(r.executions.map((x) => x.app_errors_during)).toEqual([undefined, [durante]]);
});
