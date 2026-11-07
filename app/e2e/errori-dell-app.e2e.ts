// Gli errori dell'app, nel motore vero (server di sviluppo e anteprima del build), col guscio simulato: errori veri, non chiamate al
// punto che li annota. Il disegno si rompe facendo lanciare `measureText` (la misura si fa nel disegno), il fotogramma e la promessa
// sono un fotogramma e una promessa della pagina, l'errore del guscio è una scrittura rifiutata.
//
// - Ogni errore forzato è nel testo mostrato dalla pagina dopo l'errore e nel file scritto, per elementi nei due versi, con il conteggio
//   accanto; il percorso che portava non c'è più. Controllo positivo: il rilevatore si accende sul messaggio di partenza.
// - Un errore preso dal riparo è una voce sola, anche nel server di sviluppo: nessun doppione.
// - Un difetto a ogni fotogramma è una voce sola che conta, e un errore dopo si vede ancora.
// - Il riparo con modifiche: si salva davvero e il file si riapre, la X non chiude finché non si è salvato, i tasti della ricarica sono
//   fermi; dopo il salvataggio la X chiude. «Chiudi senza salvare» chiude. Senza modifiche: la frase e il solo comando per segnalare, e la X
//   chiude.
//
// CHE COSA NON GUARDA:
// - il comando e la finestra col testo esatto, fuori da questa pagina: `e2e/segnala.e2e.ts`;
// - la domanda «Sostituire?», l'errore di scrittura e la rinuncia nel riparo: `ui/ErroreInatteso.test.tsx`;
// - un errore nel disegno del riparo stesso, che lascerebbe la pagina bianca.

import { expect, test, type Page } from "@playwright/test";
import { apri as apriProgetto } from "../core/progetto/formato";
import { apriRegistrazione, type ErroreDellApp, type OrigineDellErrore } from "../core/registrazione/formato";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { percorsiEProfilo } from "../strumenti/registrazioni-del-corpus";
import { apriVuota, costruisciFinzione, voceDelMenu, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });
test.describe.configure({ mode: "parallel" });

const PERCORSO = String.raw`C:\Users\Mario Rossi\Documenti\voti.algo`;

declare global {
  interface Window {
    __rompi__?: boolean;
    __rompiGliElementi__?: boolean;
    __tastoFermato__?: boolean;
  }
}

/** Il disegno che si rompe a comando, prima di caricare la pagina. La misura del testo lancia nel disegno di `Applicazione`; un elemento
 * SVG nuovo lancia quando il disegno di `Applicazione` è già finito, nel figlio che lo crea e prima dell'aggiornamento della finestra. */
const preparaLaRottura = (page: Page) =>
  page.addInitScript((percorso) => {
    const vera = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function (t: string) {
      if (window.__rompi__) throw new Error(`sonda del disegno in ${percorso}: fine`);
      return vera.call(this, t);
    };
    const creaVero = document.createElementNS.bind(document) as (ns: string, nome: string) => Element;
    (document as { createElementNS: unknown }).createElementNS = (ns: string, nome: string) => {
      if (window.__rompiGliElementi__) throw new Error(`sonda di un elemento in ${percorso}: fine`);
      return creaVero(ns, nome);
    };
  }, PERCORSO);

/** Un blocco nuovo in fondo al programma principale, dalla sua voce. */
async function inserisci(page: Page, blocco: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${it.sequenzaPrincipale}: inserisci al posto (\\d+) di \\1$`) }).click();
  await page.getByRole("menuitem", { name: blocco, exact: true }).click();
}

/** Il progetto modificato e poi il disegno rotto: il riparo c'è, e il secondo blocco non è arrivato alla finestra. */
async function modificaERompi(page: Page): Promise<void> {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" });
  await inserisci(page, it.bloccoSe);
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoModificato);
  await page.evaluate(() => {
    window.__rompi__ = true;
  });
  await inserisci(page, it.bloccoAssegnazione);
  await expect(page.locator("[data-errore-inatteso]")).toBeVisible();
}

const riletta = (testo: string) => {
  const r = apriRegistrazione(testo);
  if (!r.ok) throw new Error(`riaperta con errori: ${JSON.stringify(r.errori)}`);
  return r.registrazione;
};

/** L'elenco degli errori come lo mostra la finestra col testo esatto: la si apre, si legge, si chiude. */
async function elenco(page: Page): Promise<{ voci: readonly ErroreDellApp[]; perse: number }> {
  await (await voceDellAiuto(page, it.segnalaComando)).click();
  const f = page.getByRole("dialog", { name: it.segnalaTitolo, exact: true });
  const r = riletta((await f.locator("[data-testo-della-segnalazione]").textContent())!);
  await page.keyboard.press("Escape");
  await expect(f).toHaveCount(0);
  return { voci: r.app_errors, perse: r.app_errors_lost };
}

const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const imposta = (page: Page, valori: object) => page.evaluate((v) => void Object.assign(window.__finzione__, v), valori);
const laX = (page: Page) => page.evaluate(() => window.__laX__());

test("con la registrazione attiva la pagina dopo l'errore salva tutte le esecuzioni, e lo dice", async ({ page }) => {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" });
  await (await voceDellAiuto(page, it.registraAttiva)).click();
  await expect(page.locator("[data-in-registrazione]")).toBeVisible();
  // Finché un menu è nel documento i tasti della finestra tacciono.
  await expect(page.getByRole("menu")).toHaveCount(0);
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("F5");
    await expect(page.locator("[data-stato-esecuzione]")).toHaveText(it.statoFinita);
  }
  await expect(page.locator("[data-in-registrazione]")).toHaveText(riempi(it.statoInRegistrazioneMolte, { n: "2" }));
  await page.evaluate(() => {
    window.__rompi__ = true;
  });
  await inserisci(page, it.bloccoSe);
  await expect(page.locator("[data-errore-inatteso]")).toBeVisible();

  await page.getByRole("button", { name: it.segnalaComando, exact: true }).click();
  const pagina = page.locator("section", { has: page.locator("[data-testo-della-segnalazione]") });
  await expect(pagina).toContainText(riempi(it.segnalaContieneRegistrate, { n: "2" }));
  // Qui non si può più attivare nulla: nessun consiglio, nessun pulsante.
  await expect(pagina).not.toContainText(it.segnalaConsiglio);
  await expect(page.getByRole("button", { name: it.segnalaAttiva, exact: true })).toHaveCount(0);
  const riaperta = riletta((await page.locator("[data-testo-della-segnalazione]").textContent())!);
  expect(riaperta.executions.map((x) => x.outcome.kind)).toEqual(["finished", "finished"]);
  expect(riaperta.app_errors.map((v) => v.origin)).toContain("drawing");
});

test("un errore nel disegno, in un fotogramma, in una promessa e nel guscio sono tutti nel file, senza il percorso", async ({ page }, info) => {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" }, { daSalvare: "C:\\miei\\prova", daSalvareIlCodice: "C:\\miei\\segnalazione", scritturaRifiutata: `${PERCORSO}: sonda del guscio` });

  // Ogni origine con la sua sonda: chi non arriva, o arriva due volte, si vede dal confronto.
  const attese: readonly (readonly [OrigineDellErrore, string])[] = [
    ["handled", "sonda del guscio"],
    ["uncaught", "sonda del fotogramma"],
    ["rejected", "sonda della promessa"],
    ["drawing", "sonda del disegno"],
  ];

  await (await voceDelMenu(page, it.salvaConNome)).click();
  const errori = page.getByRole("alertdialog");
  await expect(errori).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(errori).toBeHidden();

  await page.evaluate((percorso) => {
    requestAnimationFrame(() => {
      throw new Error(`sonda del fotogramma in ${percorso}: fine`);
    });
    void Promise.reject(new Error(`sonda della promessa in ${percorso}: fine`));
  }, PERCORSO);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));

  await page.evaluate(() => {
    window.__rompi__ = true;
  });
  await inserisci(page, it.bloccoSe);
  await expect(page.locator("[data-errore-inatteso]")).toBeVisible();

  // Dalla pagina dopo l'errore: il testo esatto, col progetto all'ultimo aggiornamento riuscito.
  await page.getByRole("button", { name: it.segnalaComando, exact: true }).click();
  const testo = (await page.locator("[data-testo-della-segnalazione]").textContent())!;
  const riaperta = riletta(testo);
  const nelFile = riaperta.app_errors;

  const appaia = (o: OrigineDellErrore, s: string) => nelFile.filter((v) => v.origin === o && v.text.includes(s)).map((v) => v.times);
  const senzaVoce = attese.filter(([o, s]) => appaia(o, s).length !== 1).map(([o, s]) => `${o}: ${s} (${appaia(o, s).length} voci)`);
  const senzaAttesa = nelFile.filter((v) => !attese.some(([o, s]) => v.origin === o && v.text.includes(s))).map((v) => `${v.origin}: ${v.text.slice(0, 120)}`);
  console.log(`[${info.project.name}] errori attesi ${attese.length}, voci nel file ${nelFile.length}, perse ${riaperta.app_errors_lost}, senza voce ${senzaVoce.length}, senza attesa ${senzaAttesa.length}`);
  expect(senzaVoce).toEqual([]);
  expect(senzaAttesa).toEqual([]);
  // Nessun doppione: ognuno è arrivato una volta, nel server di sviluppo e nel build.
  expect(attese.map(([o, s]) => [o, appaia(o, s)])).toEqual(attese.map(([o]) => [o, [1]]));

  // Controllo positivo: il rilevatore si accende sul messaggio di partenza, poi tace sul file.
  expect(percorsiEProfilo(JSON.stringify({ text: `sonda in ${PERCORSO}: fine` })).length).toBeGreaterThan(0);
  expect(percorsiEProfilo(testo)).toEqual([]);
  expect(testo).not.toContain("Rossi");
  expect(testo).toContain("<path>");

  // Mai su disco senza il gesto: la sola scrittura chiesta è stata rifiutata.
  const f = await finzione(page);
  expect(Object.keys(f.file)).toEqual([]);
  expect(f.scritte).toEqual([]);

  // Il gesto: una scrittura rifiutata lo dice e il testo resta; riuscita, il file è il testo mostrato.
  const salva = page.getByRole("button", { name: it.segnalaSalva, exact: true });
  await salva.click();
  await expect(page.locator("[data-esito-della-segnalazione]")).toContainText(riempi(it.segnalaErroreTitolo, { file: "segnalazione.txt" }));
  expect(Object.keys((await finzione(page)).file)).toEqual([]);
  await imposta(page, { scritturaRifiutata: null });
  await salva.click();
  await expect(page.locator("[data-esito-della-segnalazione]")).toHaveText(riempi(it.segnalaSalvatoIn, { file: "segnalazione.txt" }));
  // Rifiutata, la scrittura è un errore in più nell'elenco: il testo è quello mostrato all'apertura.
  expect((await finzione(page)).file["C:\\miei\\segnalazione.txt"]).toBe(testo);
});

test("un difetto a ogni fotogramma è una voce sola che conta, e un errore dopo si vede ancora", async ({ page }, info) => {
  await apriVuota(page, { lingua: "it" });
  // L'app montata prima del tasto: `apriVuota` non la aspetta, e sulla macchina della CI F10 arrivava prima dei gestori
  // (la riga di stato restava «Pronto», due corse su tre nel WebKit per Linux).
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(it.statoPronto);
  // Il comando c'è con un'esecuzione ferma.
  await page.keyboard.press("F10");
  await expect(page.locator("[data-stato-esecuzione]")).not.toHaveText(it.statoPronto);
  await page.evaluate(() => {
    const giro = () => {
      requestAnimationFrame(giro);
      throw new Error("sonda a ogni fotogramma");
    };
    requestAnimationFrame(giro);
  });
  await expect.poll(async () => (await elenco(page)).voci[0]?.times ?? 0).toBeGreaterThan(30);
  await page.evaluate(() => void Promise.reject(new Error("la causa vera")));
  await expect.poll(async () => (await elenco(page)).voci.map((v) => v.origin)).toEqual(["uncaught", "rejected"]);
  const { voci, perse } = await elenco(page);
  console.log(`[${info.project.name}] voci ${voci.length}, volte della prima ${voci[0]!.times}, perse ${perse}`);
  expect(perse).toBe(0);
  expect(voci[1]!.text).toContain("la causa vera");
  // L'app è ancora viva: un errore fuori dal disegno non la smonta.
  await expect(page.locator("[data-errore-inatteso]")).toHaveCount(0);
  await expect(page.getByRole("banner")).toBeVisible();
});

test("dopo l'errore con modifiche il lavoro si salva: la X non chiude finché non si è salvato, poi chiude", async ({ page }) => {
  await modificaERompi(page);
  await expect(page.locator("[data-errore-inatteso]")).toHaveText(it.erroreInattesoConModifiche);
  const salva = page.getByRole("button", { name: it.salvaConNome, exact: true });
  await expect(salva).toBeFocused();

  // La X non chiude e lo dice.
  await expect(page.getByText(it.erroreInattesoAllaChiusura, { exact: true })).toHaveCount(0);
  await laX(page);
  await expect(page.getByText(it.erroreInattesoAllaChiusura, { exact: true })).toBeVisible();
  expect((await finzione(page)).chiusa).toBe(false);

  // I tasti della ricarica restano fermi: la pagina porta l'unica copia del lavoro.
  await page.evaluate(() => window.addEventListener("keydown", (e) => void (window.__tastoFermato__ = e.defaultPrevented)));
  await page.keyboard.press("F5");
  await expect.poll(() => page.evaluate(() => window.__tastoFermato__)).toBe(true);

  await imposta(page, { daSalvare: "C:\\miei\\salvato" });
  await salva.click();
  await expect(page.locator("[data-errore-inatteso]")).toHaveText(riempi(it.erroreInattesoSalvato, { file: "salvato.algo" }));
  await expect(salva).toHaveCount(0);

  // Il file è il progetto com'era all'ultimo aggiornamento riuscito, e si riapre: il blocco che ha rotto il disegno non c'è.
  const f = await finzione(page);
  const riaperto = apriProgetto(f.file["C:\\miei\\salvato.algo"]!);
  if (!riaperto.ok) throw new Error(`il file salvato non si riapre: ${JSON.stringify(riaperto.errori)}`);
  expect((riaperto.progetto.functions[0]!.body as readonly { kind: string }[]).map((b) => b.kind)).toEqual(["if"]);
  expect(f.segnato).toBe(false);

  await laX(page);
  expect((await finzione(page)).chiusa).toBe(true);
});

test("la modifica che rompe il disegno in un figlio non entra nel file: si salva l'ultimo aggiornamento riuscito", async ({ page }) => {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" }, { daSalvare: "C:\\miei\\salvato" });
  await inserisci(page, it.bloccoSe);
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoModificato);
  // A menu aperto: le sue icone sono SVG, e la rottura deve venire dal blocco nuovo, non dal menu.
  await page.getByRole("button", { name: new RegExp(`^${it.sequenzaPrincipale}: inserisci al posto (\\d+) di \\1$`) }).click();
  const voce = page.getByRole("menuitem", { name: it.bloccoAssegnazione, exact: true });
  await expect(voce).toBeVisible();
  await page.evaluate(() => {
    window.__rompiGliElementi__ = true;
  });
  await voce.click();
  await expect(page.locator("[data-errore-inatteso]")).toHaveText(it.erroreInattesoConModifiche);
  // Il pulsante non è SVG, e la pagina del riparo non è il disegno: da qui nessun elemento nuovo si rompe.
  await page.getByRole("button", { name: it.salvaConNome, exact: true }).click();
  await expect(page.locator("[data-errore-inatteso]")).toHaveText(riempi(it.erroreInattesoSalvato, { file: "salvato.algo" }));
  const riaperto = apriProgetto((await finzione(page)).file["C:\\miei\\salvato.algo"]!);
  if (!riaperto.ok) throw new Error(`il file salvato non si riapre: ${JSON.stringify(riaperto.errori)}`);
  expect((riaperto.progetto.functions[0]!.body as readonly { kind: string }[]).map((b) => b.kind)).toEqual(["if"]);
});

test("«Chiudi senza salvare» chiude l'applicazione", async ({ page }) => {
  await modificaERompi(page);
  await page.getByRole("button", { name: it.erroreInattesoChiudi, exact: true }).click();
  await expect.poll(async () => (await finzione(page)).chiusa).toBe(true);
  expect(Object.keys((await finzione(page)).file)).toEqual([]);
});

test("senza modifiche resta la frase di sempre col solo comando per segnalare, e la X chiude", async ({ page }) => {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" });
  await expect(page.getByRole("banner")).toBeVisible();
  await page.evaluate(() => {
    window.__rompi__ = true;
  });
  await inserisci(page, it.bloccoSe);
  await expect(page.locator("[data-errore-inatteso]")).toHaveText(it.erroreInatteso);
  await expect(page.getByRole("button")).toHaveText([it.segnalaComando]);
  await expect.poll(async () => (await finzione(page)).segnato).toBe(false);
  await laX(page);
  expect((await finzione(page)).chiusa).toBe(true);
});
