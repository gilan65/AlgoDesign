// Gli errori dell'app, nel motore vero (server di sviluppo e anteprima del build), col guscio simulato: errori veri, non chiamate al
// punto che li annota. Il disegno si rompe facendo lanciare `measureText` (la misura si fa nel disegno), il fotogramma e la promessa
// sono un fotogramma e una promessa della pagina, l'errore del guscio è una scrittura rifiutata.
//
// - Ogni errore forzato è nel file composto e riletto, per elementi nei due versi, con il conteggio accanto; il percorso che portava non
//   c'è più. Controllo positivo: il rilevatore si accende sul messaggio di partenza.
// - Un errore preso dal riparo è una voce sola, anche nel server di sviluppo: nessun doppione.
// - Un difetto a ogni fotogramma è una voce sola che conta, e un errore dopo si vede ancora.
// - Il riparo con modifiche: si salva davvero e il file si riapre, la X non chiude finché non si è salvato, i tasti della ricarica sono
//   fermi; dopo il salvataggio la X chiude. «Chiudi senza salvare» chiude. Senza modifiche: la frase e nessun pulsante, e la X chiude.
//
// CHE COSA NON GUARDA:
// - la finestra che mostra il testo e il file scritto davvero (arrivano con il comando per segnalare): qui il file lo compone la prova;
// - la domanda «Sostituire?», l'errore di scrittura e la rinuncia nel riparo: `ui/ErroreInatteso.test.tsx`;
// - un errore nel disegno del riparo stesso, che lascerebbe la pagina bianca.

import { expect, test, type Page } from "@playwright/test";
import { tetti } from "../core/controllo/controllo";
import { Esecuzione } from "../core/esecuzione/esecuzione";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { componi, fotografa } from "../core/registrazione/composizione";
import { apriRegistrazione, testoDellaRegistrazione, type OrigineDellErrore } from "../core/registrazione/formato";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { contestoDiProva, percorsiEProfilo } from "../strumenti/registrazioni-del-corpus";
import { apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

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

const elenco = (page: Page) => page.evaluate(() => window.__erroriDellApp__!());
const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const imposta = (page: Page, valori: object) => page.evaluate((v) => void Object.assign(window.__finzione__, v), valori);
const laX = (page: Page) => page.evaluate(() => window.__laX__());

/** Un'esecuzione qualunque per comporre il file: qui contano gli errori. */
function unaFotografia() {
  const p = { format: "algodesign", schema_version: 2, metadata: { name: "Prova" }, functions: [{ id: "f0", kind: "main", data: [], body: [], end: { id: "b1" } }] } as unknown as Progetto;
  return fotografa(new Esecuzione(p, tetti, { tabella: false }));
}

test("un errore nel disegno, in un fotogramma, in una promessa e nel guscio sono tutti nel file, senza il percorso", async ({ page }, info) => {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" }, { daSalvare: "C:\\miei\\prova", scritturaRifiutata: `${PERCORSO}: sonda del guscio` });

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

  const { voci, perse } = await elenco(page);
  const testo = testoDellaRegistrazione(componi({ ...contestoDiProva, erroriDellApp: voci, erroriPersi: perse }, [unaFotografia()]));
  const riaperta = apriRegistrazione(testo);
  if (!riaperta.ok) throw new Error(`riaperta con errori: ${JSON.stringify(riaperta.errori)}`);
  const nelFile = riaperta.registrazione.app_errors;

  const appaia = (o: OrigineDellErrore, s: string) => nelFile.filter((v) => v.origin === o && v.text.includes(s)).map((v) => v.times);
  const senzaVoce = attese.filter(([o, s]) => appaia(o, s).length !== 1).map(([o, s]) => `${o}: ${s} (${appaia(o, s).length} voci)`);
  const senzaAttesa = nelFile.filter((v) => !attese.some(([o, s]) => v.origin === o && v.text.includes(s))).map((v) => `${v.origin}: ${v.text.slice(0, 120)}`);
  console.log(`[${info.project.name}] errori attesi ${attese.length}, voci nel file ${nelFile.length}, perse ${riaperta.registrazione.app_errors_lost}, senza voce ${senzaVoce.length}, senza attesa ${senzaAttesa.length}`);
  expect(senzaVoce).toEqual([]);
  expect(senzaAttesa).toEqual([]);
  // Nessun doppione: ognuno è arrivato una volta, nel server di sviluppo e nel build.
  expect(attese.map(([o, s]) => [o, appaia(o, s)])).toEqual(attese.map(([o]) => [o, [1]]));

  // Controllo positivo: il rilevatore si accende sul messaggio di partenza, poi tace sul file.
  expect(percorsiEProfilo(JSON.stringify({ text: `sonda in ${PERCORSO}: fine` })).length).toBeGreaterThan(0);
  expect(percorsiEProfilo(testo)).toEqual([]);
  expect(testo).not.toContain("Rossi");
  expect(testo).toContain("<path>");

  // Mai su disco: la sola scrittura chiesta è stata rifiutata.
  const f = await finzione(page);
  expect(Object.keys(f.file)).toEqual([]);
  expect(f.scritte).toEqual([]);
});

test("un difetto a ogni fotogramma è una voce sola che conta, e un errore dopo si vede ancora", async ({ page }, info) => {
  await apriVuota(page, { lingua: "it" });
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

test("senza modifiche resta la frase di sempre, nessun pulsante, e la X chiude", async ({ page }) => {
  await preparaLaRottura(page);
  await apriVuota(page, { lingua: "it" });
  await expect(page.getByRole("banner")).toBeVisible();
  await page.evaluate(() => {
    window.__rompi__ = true;
  });
  await inserisci(page, it.bloccoSe);
  await expect(page.locator("[data-errore-inatteso]")).toHaveText(it.erroreInatteso);
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect.poll(async () => (await finzione(page)).segnato).toBe(false);
  await laX(page);
  expect((await finzione(page)).chiusa).toBe(true);
});
