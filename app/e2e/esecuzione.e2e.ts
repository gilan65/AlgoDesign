// L'esecuzione dalla finestra, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build).
// La finestra non calcola nulla: legge dal nucleo lo stato, il blocco della pausa e la console. Qui si prova
// che mostra ciò che il nucleo dà; i confronti lunghi (ogni file del corpus) stanno nella prova della finestra
// sotto happy-dom (`ui/esecuzione/finestra.test.tsx`).
//
// - Un passo alla volta: F10 ripetuto sul programma di riferimento, coi valori del suo caso scritti nella
//   console, si ferma azione per azione sui blocchi dell'atteso scritto a mano (`atteso-del-riferimento.ts`);
//   il blocco corrente si legge dall'albero dell'accessibilità (`aria-current="step"`), sempre uno solo, e
//   l'avviso dice la stessa azione. Alla fine la console ha l'output del caso. Controllo positivo: un blocco
//   dell'atteso cambiato non coincide più (la sequenza confrontata per elementi).
// - I punti di interruzione: un punto da solo, su un progetto pulito, lo rende modificato (la riga di stato, il guscio
//   e la X che chiede), e tolto lo riporta pulito; F9 sul blocco scelto lo segna nel disegno, si salva
//   nel file e si rilegge; Annulla e Ripeti di una modifica non li toccano; F5 si ferma sulle occorrenze
//   attese, contate dall'atteso del riferimento.
// - La console: un valore non valido lo dice e la stessa lettura si richiede; «Ferma» chiude la colonna e
//   riapre la vista dei dati.
// - Sola lettura: in pausa il doppio clic non apre i campi, Canc non cancella, i «+» non ci sono, la vista dei
//   dati non si modifica e i comandi di modifica sono spenti; «Ferma» li riaccende.
// - La corsa che non blocca: con un ciclo lento in corso (oltre un minuto prima del tetto dei passi) la pagina
//   risponde, «Ferma» arriva entro la soglia e la chiusura della finestra chiede entro la soglia; un ciclo che
//   arriva al tetto dei passi si ferma con l'errore sul blocco, agli ausili e nella console.
// - L'avviso sopra il flowchart (un errore lungo) sta dentro l'area del flowchart e ne segue il centro quando la
//   colonna dell'esecuzione si allarga dal suo bordo. Si sposta trascinando la sua maniglia, resta dentro la finestra
//   e, finché è aperto, dove l'utente l'ha messo; chiuso, il prossimo torna al posto calcolato.
// - La console scorre al contenuto: un passo alla volta su un ciclo che scrive senza andare a capo, dopo ogni passo
//   l'ultima riga è in vista, anche quando la riga che si allunga non cambia il numero delle righe.
// - I tasti, uno per uno in ogni situazione (ferma, in pausa, in corso, in attesa di un valore, finita), contro la
//   tabella scritta qui; i quattro con le Impostazioni aperte in ognuna delle cinque situazioni, e coi campi aperti
//   di un blocco a esecuzione ferma. F5 a esecuzione ferma con ognuna delle cose aperte che la finestra guarda (gli
//   elenchi, i menu, le domande prima di eliminare o togliere, una finestra, gli errori): non parte nulla; chiusa la
//   cosa, F5 parte (il controllo positivo di ciascun caso).
// - Le scorciatoie dei file col fuoco in un campo, Canc su un «+», Ctrl+Z col menu di un dato.
//
// CHE COSA NON GUARDA:
// - ogni file del corpus (qui il riferimento e due programmi scritti qui; il corpus intero lo prova la finestra
//   sotto happy-dom);
// - l'aspetto del blocco corrente e dei punti (colori, freccia): solo che ci siano e dove, dagli attributi;
// - un lettore di schermo vero: l'albero dell'accessibilità del motore;
// - la soglia di «Ferma» sotto carico diverso da quello del collaudo (quattro processi);
// - nei tasti, con le altre cose aperte (oltre le Impostazioni) solo F5 a esecuzione ferma: la guardia è una sola per
//   tutti i tasti (`Applicazione.tsx`); i campi aperti a esecuzione finita (in pausa, in corso e in attesa di un valore
//   non si aprono) e F9 senza un blocco scelto (l'avviso che lo dice);
// - la WebView2 vera e i tasti mandati dal sistema (lo fa la prova sul prodotto).

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pausaSulValoreIniziale, sequenzaAttesa } from "../core/esecuzione/atteso-del-riferimento";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { RIFERIMENTO } from "./albero";
import type { Finzione } from "./finzione-tauri";
import { apri, apriEsempio, apriVuota, costruisciFinzione, voceDelMenu, voceDellAiuto } from "./pagina";
// La soglia di «Ferma» e della chiusura durante una corsa: dal tasto all'effetto nella pagina.
import { SOGLIA_MS } from "./risposta";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const delCorpus = (nome: string) => readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${nome}.algo`, import.meta.url)), "utf8");
const casoDel = (nome: string) => (JSON.parse(delCorpus(nome)) as { test_cases: { inputs: { data: string; text: string }[]; expected: { output: string } }[] }).test_cases[0]!;

/** Un programma scritto qui: legge n, lo scrive, e finché n > 0 calcola una potenza lenta (n = 0 finisce
 * subito; n = 1 resta in corso per minuti prima del tetto dei passi). */
const LENTO = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "lento" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer" },
        { name: "y", type: "real" },
      ],
      body: [
        { id: "b1", kind: "read", target: "n" },
        { id: "b2", kind: "write", values: ["n"], newline: true },
        { id: "b3", kind: "while", condition: "n > 0", body: [{ id: "b4", kind: "assignment", target: "y", value: "1.1 raised_to 1100" }] },
      ],
      end: { id: "b5" },
    },
  ],
});

const comando = (page: Page, nome: string) => page.getByRole("banner").getByRole("button", { name: nome, exact: true });
// Lo stato dell'esecuzione sta nella riga di stato.
const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]");
const avviso = (page: Page) => page.locator('output[role="status"]');
const colonna = (page: Page) => page.getByRole("region", { name: it.colonnaEsecuzione, exact: true });
const console_ = (page: Page) => page.getByRole("log", { name: it.console, exact: true });
const valoreDi = (page: Page, dato: string) => page.getByRole("textbox", { name: riempi(it.consoleValore, { dato }), exact: true });
const vistaDati = (page: Page) => page.getByRole("region", { name: it.vistaDati, exact: true });
const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const punti = (page: Page) => page.locator("[data-interruzione]");
const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const imposta = (page: Page, valori: Partial<Finzione>) => page.evaluate((v) => Object.assign(window.__finzione__, v), valori);
/** Due giri di disegno: ciò che un tasto ha cambiato è già nella pagina. */
const giro = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));

/** Il blocco corrente letto dall'albero dell'accessibilità: l'`id` di ognuno (devono essere uno solo); il valore
 * iniziale di un dato come lo scrive la sequenza attesa. */
const correnti = async (page: Page) =>
  (await page.locator('[aria-current="step"]').evaluateAll((els) => els.map((e) => ({ dato: e.getAttribute("data-iniziale-di"), id: e.getAttribute("data-blocco") ?? e.getAttribute("data-fine") ?? "?" })))).map((c) =>
    c.dato !== null ? pausaSulValoreIniziale(c.dato) : c.id,
  );

/** L'output del programma come lo mostra la console: le sole parti scritte dal programma, in ordine. */
const outputDellaConsole = (page: Page) => console_(page).locator("[data-scrive]").evaluateAll((els) => els.map((e) => e.textContent ?? "").join(""));

/** Un programma scritto qui (testo del file) come unico esempio, aperto dalla finestra «Esempi». */
async function apriIl(page: Page, nome: string, testo: string): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { esempi: { [`1 ${nome}.algo`]: testo } });
  await apriEsempio(page, 0);
}

/** Aspetta la pausa sull'azione `n`, o la lettura di `dato`, o la fine; dice quale delle tre. `prima` è
 * l'istante letto prima del gesto: finché la pagina mostra quello, il gesto non ha ancora avuto effetto. */
async function prossimo(page: Page, prima: string): Promise<{ genere: "pausa"; n: number } | { genere: "chiede"; dato: string } | { genere: "finita" }> {
  const pausa = new RegExp(`^${riempi(it.statoInPausa, { n: "(\\d+)" })}$`);
  const chiede = new RegExp(`^${riempi(it.statoChiede, { dato: "(\\w+)" })}$`);
  for (let i = 0; i < 200; i++) {
    const t = (await statoDi(page).textContent()) ?? "";
    if ((await istante(page)) === prima) {
      await page.waitForTimeout(25);
      continue;
    }
    const p = pausa.exec(t);
    if (p) return { genere: "pausa", n: Number(p[1]) };
    const c = chiede.exec(t);
    if (c) return { genere: "chiede", dato: c[1]! };
    if (t === it.statoFinita || t === it.statoFermataDaUnErrore) return { genere: "finita" };
    await page.waitForTimeout(25);
  }
  throw new Error(`l'esecuzione non si ferma: stato «${await statoDi(page).textContent()}»`);
}

/** Lo stato dell'esecuzione e quante righe ha la console: la stessa lettura chiesta di nuovo ha lo stesso
 * stato, e una riga in più. */
const istante = (page: Page) =>
  page.evaluate(() => `${document.querySelector("[data-stato-esecuzione]")?.textContent} · ${document.querySelector('[role="log"]')?.childElementCount ?? 0}`);

/** Il gesto, poi la situazione in cui l'esecuzione si ferma dopo di lui. */
async function dopo(page: Page, gesto: () => Promise<void>): ReturnType<typeof prossimo> {
  const prima = await istante(page);
  await gesto();
  return prossimo(page, prima);
}

/** Scrive il valore nella console e lo conferma con Invio. */
async function scrivi(page: Page, dato: string, testo: string): Promise<void> {
  const campo = valoreDi(page, dato);
  await expect(campo).toBeFocused();
  await campo.fill(testo);
  await campo.press("Enter");
}

test("F10 ripetuto sul riferimento si ferma azione per azione sui blocchi attesi, con un solo blocco corrente e l'avviso; la console ha l'output del caso", async ({ page }, info) => {
  test.setTimeout(150_000);
  await apri(page, { lingua: "it" });
  const caso = casoDel(RIFERIMENTO);
  const input = [...caso.inputs];
  const visti: string[] = [];
  const sbagli: string[] = [];
  await expect(statoDi(page)).toHaveText(it.statoPronto);
  let e = await dopo(page, () => page.keyboard.press("F10"));
  // La vista dei dati si chiude all'avvio; la colonna con la console si apre.
  await expect(vistaDati(page)).toBeHidden();
  await expect(colonna(page)).toBeVisible();
  for (;;) {
    if (e.genere === "finita") break;
    if (e.genere === "chiede") {
      const v = input.shift();
      const dato = e.dato;
      if (!v || v.data !== dato) throw new Error(`lettura di «${dato}» senza il valore del caso`);
      e = await dopo(page, () => scrivi(page, dato, v.text));
      continue;
    }
    const ids = await correnti(page);
    if (ids.length !== 1) sbagli.push(`azione ${e.n}: blocchi correnti ${JSON.stringify(ids)}`);
    visti.push(ids[0] ?? "?");
    if (e.n !== visti.length) sbagli.push(`azione ${e.n} dopo ${visti.length} pause`);
    await expect(avviso(page)).toContainText(`(azione ${e.n})`);
    e = await dopo(page, () => page.keyboard.press("F10"));
  }
  // A esecuzione finita nessun blocco è corrente, la vista dei dati si riapre e la colonna resta.
  expect(await correnti(page)).toEqual([]);
  await expect(vistaDati(page)).toBeVisible();
  await expect(colonna(page)).toBeVisible();
  const mancanti = sequenzaAttesa.map((b, i) => `${i + 1} ${b}`).filter((v, i) => visti[i] !== sequenzaAttesa[i]);
  // Controllo positivo: l'atteso con un blocco cambiato non coincide più.
  const alterato = [...sequenzaAttesa];
  alterato[7] = "b99";
  expect(alterato.filter((b, i) => visti[i] !== b).length, "il confronto non vede un blocco cambiato").toBe(1);
  console.log(`[${info.project.name}] un passo alla volta: ${visti.length} pause su ${sequenzaAttesa.length} attese, diverse ${mancanti.length}, input avanzati ${input.length}`);
  expect({ pause: visti.length, diverse: mancanti, sbagli, avanzati: input.length }).toEqual({ pause: sequenzaAttesa.length, diverse: [], sbagli: [], avanzati: 0 });
  expect(await outputDellaConsole(page)).toBe(caso.expected.output);
  await expect(console_(page)).toContainText(it.consoleFine);
});

test("F9 mette il punto sul blocco scelto: segnato, salvato e riletto, fuori da Annulla e Ripeti; F5 si ferma sulle occorrenze attese", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apri(page, { lingua: "it" });
  // Un punto da solo, su un progetto pulito, lo rende modificato: la riga di stato e il guscio lo sanno, e la X
  // chiede. Tolto il punto, il progetto torna pulito (controllo positivo: il rilevatore distingue).
  const rigaDiStato = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  await expect(rigaDiStato).not.toContainText(it.statoModificato);
  await blocco(page, "b12").click();
  await page.keyboard.press("F9");
  await expect(rigaDiStato).toContainText(it.statoModificato);
  await expect.poll(async () => (await finzione(page)).segnato).toBe(true);
  await page.evaluate(() => window.__laX__());
  const domanda = page.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: "riferimento-media-voti" }), exact: true });
  await expect(domanda).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(domanda).toBeHidden();
  expect((await finzione(page)).chiusa).toBe(false);
  await blocco(page, "b12").click();
  await page.keyboard.press("F9");
  await expect(rigaDiStato).not.toContainText(it.statoModificato);
  await expect.poll(async () => (await finzione(page)).segnato).toBe(false);
  // Una modifica nella cronologia: l'autore, che non cambia la sequenza.
  await (await voceDelMenu(page, it.progetto)).click();
  const proprieta = page.getByRole("dialog", { name: it.progettoTitolo, exact: true });
  await proprieta.getByLabel(it.progettoAutore, { exact: true }).fill("Prova");
  await proprieta.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(proprieta).toBeHidden();
  const scelti = ["b12", "b22"];
  for (const id of scelti) {
    await blocco(page, id).click();
    await page.keyboard.press("F9");
  }
  await expect(punti(page)).toHaveCount(2);
  expect(await punti(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-interruzione")).sort())).toEqual(scelti);
  // Annulla toglie l'autore e lascia i punti; Ripeti lo rimette e lascia i punti.
  await page.keyboard.press("Control+z");
  await giro(page);
  await expect(punti(page)).toHaveCount(2);
  await page.keyboard.press("Control+y");
  await giro(page);
  await expect(punti(page)).toHaveCount(2);
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoModificato);
  // Salvato nel file, coi due punti nei loro blocchi.
  await imposta(page, { daSalvare: "C:\\miei\\punti.algo" });
  await page.keyboard.press("Control+s");
  await expect.poll(async () => (await finzione(page)).file["C:\\miei\\punti.algo"] ?? "").toContain('"breakpoint": true');
  const scritto = (await finzione(page)).file["C:\\miei\\punti.algo"]!;
  const nelFile = (JSON.stringify(JSON.parse(scritto)).match(/"id":"b\d+","kind":"\w+","breakpoint":true/g) ?? []).map((m) => /b\d+/.exec(m)![0]).sort();
  expect(nelFile).toEqual(scelti);
  // Le occorrenze attese: le azioni dell'atteso su quei blocchi, poi la fine.
  const attese = sequenzaAttesa.flatMap((b, i) => (scelti.includes(b) ? [`${i + 1} ${b}`] : []));
  const input = [...casoDel(RIFERIMENTO).inputs];
  const fermate: string[] = [];
  let e = await dopo(page, () => page.keyboard.press("F5"));
  while (e.genere !== "finita") {
    if (e.genere === "chiede") {
      const dato = e.dato;
      e = await dopo(page, () => scrivi(page, dato, input.shift()!.text));
    } else {
      fermate.push(`${e.n} ${(await correnti(page))[0]}`);
      e = await dopo(page, () => page.keyboard.press("F5"));
    }
  }
  console.log(`[${info.project.name}] punti di interruzione: ${fermate.length} fermate, attese ${attese.length}`);
  expect(fermate).toEqual(attese);
  // Riaperto dal file, i punti tornano.
  await page.keyboard.press("Shift+F5");
  await imposta(page, { daAprire: "C:\\miei\\punti.algo" });
  await page.keyboard.press("Control+o");
  await expect(avviso(page)).toContainText("punti.algo");
  await expect(punti(page)).toHaveCount(2);
});

test("un valore non valido nella console lo dice e la lettura si richiede; «Ferma» chiude la colonna e riapre la vista dei dati", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(riempi(it.statoChiede, { dato: "n" }));
  await scrivi(page, "n", "abc");
  await expect(console_(page)).toContainText(riempi(it.consoleNonValido, { testo: "abc", dato: "n" }));
  await expect(statoDi(page)).toHaveText(riempi(it.statoChiede, { dato: "n" }));
  await expect(valoreDi(page, "n")).toBeFocused();
  await expect(valoreDi(page, "n")).toHaveValue("");
  await page.keyboard.press("Shift+F5");
  await expect(colonna(page)).toBeHidden();
  await expect(vistaDati(page)).toBeVisible();
  await expect(statoDi(page)).toHaveText(it.statoPronto);
  await expect(avviso(page)).toHaveText(it.annuncioFermata);
});

test("in esecuzione flowchart e dati sono in sola lettura: niente campi, niente Canc, niente «+», comandi di modifica spenti; «Ferma» li riaccende", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const flowchart = page.getByRole("group", { name: `${it.flowchart}: ${RIFERIMENTO}`, exact: true });
  const piu = flowchart.locator("[data-punto]");
  const prima = await piu.count();
  expect(prima).toBeGreaterThan(0);
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await expect(piu).toHaveCount(0);
  await blocco(page, "b10").dblclick();
  await expect(page.getByRole("form")).toHaveCount(0);
  await blocco(page, "b10").click();
  await page.keyboard.press("Delete");
  await giro(page);
  await expect(blocco(page, "b10")).toHaveCount(1);
  const modifica = page.getByRole("group", { name: it.modifica, exact: true });
  for (const nome of [it.annulla, it.ripeti, it.taglia, it.elimina]) await expect(modifica.getByRole("button", { name: nome, exact: true })).toHaveAttribute("aria-disabled", "true");
  // «Proprietà», nel menu «Progetto», non è disponibile.
  await expect(await voceDelMenu(page, it.progetto)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  // La vista dei dati, riaperta dal pulsante, si legge ma non si modifica.
  await comando(page, it.pannelloDati).click();
  await expect(vistaDati(page)).toBeVisible();
  await expect(vistaDati(page).getByRole("button", { name: it.aggiungiDato, exact: true })).toHaveCount(0);
  await page.keyboard.press("Shift+F5");
  await expect(piu).toHaveCount(prima);
  await expect(vistaDati(page).getByRole("button", { name: it.aggiungiDato, exact: true })).toHaveCount(1);
  await expect(await voceDelMenu(page, it.progetto)).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("con un ciclo lento in corso la finestra risponde: «Ferma» e la chiusura arrivano entro la soglia", async ({ page }, info) => {
  test.setTimeout(150_000);
  await apriIl(page, "lento", LENTO);
  // Il progetto modificato: la X passa dalla pagina, che deve rispondere durante la corsa.
  await (await voceDelMenu(page, it.progetto)).click();
  const proprieta = page.getByRole("dialog", { name: it.progettoTitolo, exact: true });
  await proprieta.getByLabel(it.progettoAutore, { exact: true }).fill("Lento");
  await proprieta.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  const misure: string[] = [];
  /** Avvia la corsa lenta: F5, poi 1 nella console. */
  const avvia = async () => {
    await page.keyboard.press("F5");
    await scrivi(page, "n", "1");
    await expect(statoDi(page)).toHaveText(it.statoInCorso);
    await page.waitForTimeout(500);
  };
  await avvia();
  // La pagina risponde fra due fette: un giro di andata e ritorno.
  const t0 = Date.now();
  await page.evaluate(() => 1);
  misure.push(`risposta ${Date.now() - t0} ms`);
  const t1 = Date.now();
  await page.keyboard.press("Shift+F5");
  await expect(statoDi(page)).toHaveText(it.statoPronto, { timeout: SOGLIA_MS });
  const ferma = Date.now() - t1;
  misure.push(`«Ferma» ${ferma} ms`);
  // La X durante la corsa: la domanda delle modifiche entro la soglia.
  await avvia();
  const t2 = Date.now();
  await page.evaluate(() => window.__laX__());
  const domanda = page.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: "lento" }), exact: true });
  await expect(domanda).toBeVisible({ timeout: SOGLIA_MS });
  const chiusura = Date.now() - t2;
  misure.push(`chiusura ${chiusura} ms`);
  await domanda.getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
  await expect.poll(async () => (await finzione(page)).chiusa).toBe(true);
  console.log(`[${info.project.name}] corsa lenta: ${misure.join(", ")} (soglia ${SOGLIA_MS} ms)`);
  expect(ferma).toBeLessThan(SOGLIA_MS);
  expect(chiusura).toBeLessThan(SOGLIA_MS);
});

test("l'avviso sopra il flowchart sta dentro la sua area e la segue quando la colonna dell'esecuzione si allarga", async ({ page }) => {
  // Un errore dal testo lungo: l'avviso è largo quanto può.
  const senzaInizio = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "senza inizio" },
    functions: [{ id: "f1", kind: "main", data: [{ name: "s", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "s", value: "s + 1" }], end: { id: "b2" } }],
  });
  await apriIl(page, "senza inizio", senzaInizio);
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
  /** Dove sta l'avviso rispetto all'area del flowchart: i due bordi dentro, e lo scarto fra i due centri. */
  const dove = () =>
    page.evaluate((nome) => {
      const a = document.querySelector('output[role="status"]')!.parentElement!.getBoundingClientRect();
      const f = document.querySelector(`section[aria-label="${nome}"]`)!.getBoundingClientRect();
      return { dentro: a.left >= f.left - 1 && a.right <= f.right + 1, scarto: Math.round(Math.abs((a.left + a.right) / 2 - (f.left + f.right) / 2)), centro: Math.round((f.left + f.right) / 2), larghezza: Math.round(a.width) };
    }, it.vistaFlowchart);
  const prima = await dove();
  // La colonna si allarga dal suo bordo: l'area del flowchart si stringe e il suo centro va a sinistra.
  await page.getByRole("separator", { name: it.larghezzaColonna, exact: true }).focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowLeft");
  await giro(page);
  const dopo = await dove();
  expect({ prima: [prima.dentro, prima.scarto <= 2], dopo: [dopo.dentro, dopo.scarto <= 2] }, JSON.stringify({ prima, dopo })).toEqual({ prima: [true, true], dopo: [true, true] });
  // Premessa: il centro dell'area si è spostato davvero.
  expect(prima.centro - dopo.centro, JSON.stringify({ prima, dopo })).toBeGreaterThan(50);
});

test("l'avviso si sposta trascinando la sua maniglia, resta dentro la finestra, e il prossimo avviso torna al suo posto", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  const riquadro = avviso(page).locator("xpath=..");
  const maniglia = riquadro.getByTitle(it.avvisoManiglia, { exact: true });
  // La misura dalla pagina, dopo il disegno (in WebKit `boundingBox` subito dopo il puntatore leggeva quella di prima).
  const rettangolo = () => riquadro.evaluate((a) => a.getBoundingClientRect().toJSON() as DOMRectReadOnly);
  await expect(maniglia).toHaveCount(1);
  const dovera = (await rettangolo());
  const v = page.viewportSize()!;
  /** Quanto dell'avviso sta fuori dalla finestra (0 se è tutto dentro). */
  const fuori = () =>
    riquadro.evaluate((a) => {
      const r = a.getBoundingClientRect();
      return Math.max(0, -r.left) + Math.max(0, -r.top) + Math.max(0, r.right - window.innerWidth) + Math.max(0, r.bottom - window.innerHeight);
    });
  // Trascinato in alto a sinistra, oltre l'angolo: si sposta e resta dentro.
  const m = (await maniglia.boundingBox())!;
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
  await page.mouse.down();
  await page.mouse.move(1, 1, { steps: 5 });
  await page.mouse.up();
  // Il disegno dopo il rilascio può arrivare un fotogramma dopo (WebKit, 1 volta su 20): si aspetta che si sia mosso.
  await expect.poll(async () => Math.abs((await rettangolo()).y - dovera.y) > 100).toBe(true);
  const spostato = await rettangolo();
  expect(await fuori()).toBe(0);
  // Finché è aperto resta dove l'utente l'ha messo.
  await giro(page);
  expect(Math.round((await rettangolo()).y)).toBe(Math.round(spostato.y));
  // Chiuso con la ×, il prossimo avviso torna al posto calcolato (anche un passo, che toglie l'avviso e ne dà un altro).
  await riquadro.getByRole("button", { name: it.chiudiAvviso, exact: true }).click();
  await expect(avviso(page)).toHaveText("");
  await page.keyboard.press("Shift+F5");
  await expect(avviso(page)).not.toHaveText("");
  const dopo = (await rettangolo());
  expect(Math.round(dopo.y + dopo.height), JSON.stringify({ dovera, dopo, v })).toBe(Math.round(dovera.y + dovera.height));
});

test("la console scorre al contenuto: dopo ogni passo di un ciclo che scrive senza a capo l'ultima riga è in vista", async ({ page }, info) => {
  test.setTimeout(120_000);
  const senzaACapo = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "senza a capo" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "i", type: "integer", initial: "0" }],
        body: [{ id: "b1", kind: "while", condition: "i < 1000", body: [{ id: "b2", kind: "write", values: [`"${"x".repeat(99)} "`], newline: false }, { id: "b3", kind: "assignment", target: "i", value: "i + 1" }] }],
        end: { id: "b4" },
      },
    ],
  });
  await apriIl(page, "senza a capo", senzaACapo);
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  const fuoriVista: string[] = [];
  let righe = { prima: 0, dopo: 0, alta: 0, vista: 0 };
  for (let k = 1; k <= 90; k++) {
    const prima = (await statoDi(page).textContent()) ?? "";
    await page.keyboard.press("F10");
    await expect(statoDi(page)).not.toHaveText(prima);
    await giro(page);
    const r = await console_(page).evaluate((l) => ({ fondo: l.scrollTop + l.clientHeight >= l.scrollHeight - 2, alta: l.scrollHeight, vista: l.clientHeight, righe: l.querySelectorAll("[data-scrive]").length }));
    if (!r.fondo) fuoriVista.push(`passo ${k}: ${r.righe} righe`);
    righe = { prima: righe.prima || r.righe, dopo: r.righe, alta: r.alta, vista: r.vista };
  }
  console.log(`[${info.project.name}] console dopo 90 passi: ${JSON.stringify(righe)}, fuori vista ${fuoriVista.length}`);
  // Premessa: il testo supera la vista, e ci sono passi in cui una riga si allunga senza che il numero cambi.
  expect(righe.alta).toBeGreaterThan(righe.vista);
  expect(righe.dopo).toBeLessThan(30);
  expect(fuoriVista).toEqual([]);
});

test("un ciclo che arriva al tetto dei passi si ferma con l'errore: sul blocco, nella sua descrizione, nell'avviso e nella console", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apriIl(page, "troppi-passi", delCorpus("troppi-passi"));
  const t0 = Date.now();
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore, { timeout: 90_000 });
  console.log(`[${info.project.name}] tetto dei passi raggiunto in ${Date.now() - t0} ms`);
  const accaduto = (await import("../i18n/codici")).testiDeiCodici.it.too_many_steps;
  await expect(blocco(page, "b1")).toHaveAttribute("aria-invalid", "true");
  await expect(blocco(page, "b1")).toHaveAccessibleDescription(riempi(it.erroreInEsecuzione, accaduto));
  await expect(avviso(page)).toContainText(accaduto.breve);
  await expect(console_(page)).toContainText(accaduto.breve);
  // Nella console il resto si apre con «Spiegazione»: ciò che è successo e il suggerimento; un secondo clic lo richiude.
  const spiegazione = console_(page).getByRole("button", { name: it.spiegazione, exact: true });
  await expect(spiegazione).toHaveAttribute("aria-expanded", "false");
  await expect(console_(page)).not.toContainText(accaduto.suggerimento);
  await spiegazione.click();
  await expect(console_(page)).toContainText(accaduto.accaduto);
  await expect(console_(page)).toContainText(accaduto.suggerimento);
  await spiegazione.click();
  await expect(console_(page)).not.toContainText(accaduto.suggerimento);
});

/** La tabella dei tasti scritta qui: che cosa si vede dopo il tasto, in ogni situazione. */
type Effetto = "chiede" | "pausa 1" | "pausa 3" | "finita" | "in corso" | "pronto" | "punto";

test("ogni tasto dell'esecuzione in ogni situazione fa ciò che dice la tabella", async ({ page }, info) => {
  test.setTimeout(240_000);
  await apriIl(page, "lento", LENTO);
  const esiti: string[] = [];
  // Dal documento e non dall'albero dell'accessibilità: con una finestra aperta la barra ne esce.
  const stato = async (): Promise<string> => (await page.locator("[data-stato-esecuzione]").textContent()) ?? "";
  const vedi = async (): Promise<Effetto | string> => {
    await giro(page);
    await page.waitForTimeout(150);
    const t = await stato();
    if (t === riempi(it.statoChiede, { dato: "n" })) return "chiede";
    if (t === riempi(it.statoInPausa, { n: "1" })) return "pausa 1";
    if (t === riempi(it.statoInPausa, { n: "3" })) return "pausa 3";
    if (t === it.statoFinita) return "finita";
    if (t === it.statoInCorso) return "in corso";
    if (t === it.statoPronto) return "pronto";
    return t;
  };
  /** Le situazioni, costruite ogni volta da capo dalla finestra ferma. */
  const ferma = async () => {
    if ((await stato()) !== it.statoPronto) await comando(page, it.ferma).click();
    await expect(statoDi(page)).toHaveText(it.statoPronto);
    // Il blocco scelto per F9 è la scrittura (b2), senza punto.
    if ((await punti(page).count()) > 0) await comando(page, it.togliPunti).click();
    await blocco(page, "b2").click();
  };
  const inPausa = async () => {
    await ferma();
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
    await page.keyboard.press("F10");
    await scrivi(page, "n", "0");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "2" }));
  };
  const inCorso = async () => {
    await ferma();
    await page.keyboard.press("F5");
    await scrivi(page, "n", "1");
    await expect(statoDi(page)).toHaveText(it.statoInCorso);
    await blocco(page, "b2").click();
  };
  const chiede = async () => {
    await ferma();
    await page.keyboard.press("F5");
    await expect(valoreDi(page, "n")).toBeFocused();
  };
  const finita = async () => {
    await ferma();
    await page.keyboard.press("F5");
    await scrivi(page, "n", "0");
    await expect(statoDi(page)).toHaveText(it.statoFinita);
    await blocco(page, "b2").click();
  };
  // Da una pausa su b2 (n = 0): F10 va a b3 (azione 3), F5 arriva alla fine.
  const tabella: [string, () => Promise<void>, Record<string, Effetto>][] = [
    ["ferma", ferma, { F5: "chiede", F10: "pausa 1", "Shift+F5": "pronto", F9: "punto" }],
    ["in pausa", inPausa, { F5: "finita", F10: "pausa 3", "Shift+F5": "pronto", F9: "punto" }],
    ["in corso", inCorso, { F5: "in corso", F10: "in corso", "Shift+F5": "pronto", F9: "punto" }],
    ["chiede", chiede, { F5: "chiede", F10: "chiede", "Shift+F5": "pronto", F9: "punto" }],
    ["finita", finita, { F5: "chiede", F10: "pausa 1", "Shift+F5": "pronto", F9: "punto" }],
  ];
  for (const [nome, prepara, attesi] of tabella)
    for (const [tasto, atteso] of Object.entries(attesi)) {
      await prepara();
      const prima = await stato();
      // Col fuoco dove la situazione lo lascia (nella console, se chiede).
      await page.keyboard.press(tasto);
      let visto: string = await vedi();
      if (tasto === "F9") visto = (await punti(page).count()) === 1 && (await stato()) === prima ? "punto" : `punti ${await punti(page).count()}, ${visto}`;
      if (visto !== atteso) esiti.push(`${nome} · ${tasto}: atteso ${atteso}, visto ${visto}`);
    }
  // Con una finestra aperta nessun tasto dell'esecuzione fa nulla, in ogni situazione: le Impostazioni si aprono
  // sempre (in corso il programma va avanti, ma lo stato resta).
  for (const [nome, prepara] of tabella.map(([n, p]) => [n, p] as const)) {
    for (const tasto of ["F5", "F10", "Shift+F5", "F9"]) {
      await prepara();
      const prima = await stato();
      await comando(page, it.impostazioni).click();
      const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
      await expect(f).toBeVisible();
      await page.keyboard.press(tasto);
      await giro(page);
      const dopo = `${await stato()}, punti ${await punti(page).count()}`;
      if (dopo !== `${prima}, punti 0`) esiti.push(`${nome} con una finestra · ${tasto}: ${dopo}`);
      await page.keyboard.press("Escape");
      await expect(f).toBeHidden();
    }
  }
  // Coi campi aperti di un blocco, F5 e F10 prima confermano il testo scritto (un passo), poi cominciano; Maiusc+F5
  // non fa nulla e F9 mette il punto sul blocco: i campi restano aperti col testo scritto, non confermato.
  const campiAperti: [string, Effetto, boolean][] = [
    ["F5", "chiede", true],
    ["F10", "pausa 1", true],
    ["Shift+F5", "pronto", false],
    ["F9", "punto", false],
  ];
  for (const [tasto, atteso, conferma] of campiAperti) {
    await ferma();
    await blocco(page, "b2").dblclick();
    const campo = page.getByRole("form").getByRole("textbox").first();
    await campo.fill("n + 1");
    await page.keyboard.press(tasto);
    let visto: string = await vedi();
    if (tasto === "F9") visto = (await punti(page).count()) === 1 && visto === "pronto" ? "punto" : `punti ${await punti(page).count()}, ${visto}`;
    const testo = await blocco(page, "b2").getAttribute("aria-label");
    const aperti = (await page.getByRole("form").count()) === 1;
    const scritto = aperti ? await campo.inputValue() : "";
    const comeAtteso = conferma ? testo?.includes("n + 1") && !aperti : !testo?.includes("n + 1") && aperti && scritto === "n + 1";
    if (visto !== atteso || !comeAtteso) esiti.push(`campi aperti · ${tasto}: ${visto}, blocco «${testo}», campi ${aperti ? `aperti con «${scritto}»` : "chiusi"}`);
    if (aperti) await page.keyboard.press("Escape");
    if ((await stato()) !== it.statoPronto) await comando(page, it.ferma).click();
    if (conferma) await page.keyboard.press("Control+z");
    await giro(page);
  }
  console.log(
    `[${info.project.name}] tasti: ${tabella.length} situazioni × 4 tasti, ${tabella.length} con una finestra × 4, ${campiAperti.length} coi campi aperti; diversi ${esiti.length}`,
  );
  expect(esiti).toEqual([]);
});

/** Il riferimento con le funzioni e la costante comune `VOTO_MASSIMO` usata da `valido` (come `parametri.e2e.ts`). */
const CON_LE_FUNZIONI = (() => {
  const p = JSON.parse(readFileSync(fileURLToPath(new URL("../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8"));
  p.shared_constants = [{ name: "VOTO_MASSIMO", type: "integer", constant: true, initial: "10" }];
  // Usata anche dal programma principale: togliendola da `valido` la finestra chiede (nomina chi altro la usa).
  p.functions[0].body[1].body[1].else[0].values = ['"Voto ignorato (da 1 a "', "VOTO_MASSIMO", '"): "', "voto"];
  p.functions[2].end.return_value = "voto >= 1 and voto <= VOTO_MASSIMO";
  return JSON.stringify(p);
})();
const DELLE_FUNZIONI = "C:\\Documenti\\funzioni.algo";

/** Ogni cosa aperta che la finestra guarda prima di un tasto (`conUnaFinestra` in `Applicazione.tsx`), una per caso:
 * come si apre, e dove si vede. */
const coseAperte: { nome: string; funzioni?: true; apri: (page: Page) => Promise<Locator>; chiudi?: (page: Page) => Promise<void> }[] = [
  {
    nome: "l'elenco dei blocchi su un «+»",
    apri: async (page) => {
      await page.locator("[data-punto]").first().click();
      return page.getByRole("menu");
    },
  },
  {
    nome: "il menu di un dato",
    apri: async (page) => {
      await page.locator('tr[data-dato="dati-3"]').click({ button: "right" });
      return page.getByRole("menu");
    },
  },
  {
    nome: "la domanda prima di eliminare un dato",
    apri: async (page) => {
      await page.locator('tr[data-dato="dati-3"]').focus();
      await page.keyboard.press("Delete");
      return page.getByRole("alertdialog").filter({ hasText: it.eliminaConferma });
    },
  },
  {
    nome: "la domanda prima di togliere un valore iniziale",
    apri: async (page) => {
      await page.locator('[data-iniziale-di="i"]').first().focus();
      await page.keyboard.press("Delete");
      return page.getByRole("alertdialog", { name: riempi(it.togliValoreTitolo, { nome: "i" }), exact: true });
    },
  },
  {
    nome: "la domanda prima di eliminare un caso d'uso",
    apri: async (page) => {
      await page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ }).click();
      const riga = page.locator("tr[data-caso]").first();
      const nome = (await riga.locator("[data-nome-caso]").textContent()) ?? "";
      await riga.click({ button: "right" });
      await page.getByRole("menuitem", { name: it.menuElimina, exact: true }).click();
      return page.getByRole("alertdialog", { name: riempi(it.eliminaCasoTitolo, { nome }), exact: true });
    },
  },
  {
    nome: "una finestra (Informazioni)",
    apri: async (page) => {
      await (await voceDellAiuto(page, it.informazioni)).click();
      return page.getByRole("dialog", { name: it.informazioniTitolo, exact: true });
    },
  },
  {
    // Uno dei generi della finestra (`finestra !== null`), non uno stato nuovo della guardia: il caso lo prova lo stesso.
    nome: "la finestra «Esporta il flowchart»",
    apri: async (page) => {
      await (await voceDelMenu(page, it.esportaFlowchart)).click();
      return page.getByRole("dialog", { name: it.esportaFlowchartTitolo, exact: true });
    },
  },
  {
    nome: "la finestra degli errori",
    apri: async (page) => {
      await imposta(page, { daAprire: "C:\\rotto.algo", file: { "C:\\rotto.algo": "{" } });
      await (await voceDelMenu(page, it.apri)).click();
      return page.getByRole("alertdialog", { name: riempi(it.apriErroreTitolo, { file: "rotto.algo" }), exact: true });
    },
  },
  {
    nome: "la domanda prima di togliere una costante comune da una funzione",
    funzioni: true,
    apri: async (page) => {
      await page.locator("[data-elenco-funzioni]").click();
      await page.locator('[data-voce-funzione="f3"]').click();
      await page.locator('[data-dato="comuni-0"]').dblclick();
      // Invio sulla casella: nel WebKit per Windows il clic non le dà il fuoco, e un Invio della pagina non arriverebbe.
      const globale = page.getByRole("checkbox", { name: it.campoGlobale, exact: true });
      await globale.uncheck();
      await globale.press("Enter");
      return page.getByRole("alertdialog", { name: riempi(it.comuneTogliTitolo, { nome: "VOTO_MASSIMO" }), exact: true });
    },
    // Rinunciato alla domanda restano i campi del dato con la casella tolta (confermati, la richiederebbero): Esc anche lì.
    chiudi: async (page) => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("checkbox", { name: it.campoGlobale, exact: true })).toHaveCount(0);
    },
  },
  {
    nome: "l'elenco delle procedure e delle funzioni",
    funzioni: true,
    apri: async (page) => {
      await page.locator("[data-elenco-funzioni]").click();
      return page.locator("[data-elenco]");
    },
  },
];

test("con ogni cosa aperta che la finestra guarda, F5 non fa partire l'esecuzione; chiusa la cosa, F5 parte", async ({ browser }, info) => {
  test.setTimeout(180_000);
  const esiti: string[] = [];
  // Lo stato dal documento e non dall'albero dell'accessibilità: con una finestra aperta la riga di stato ne esce.
  const statoDi = (page: Page) => page.locator("[data-stato-esecuzione]");
  for (const c of coseAperte) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    try {
      if (c.funzioni) {
        await apriVuota(page, { lingua: "it" }, { argomento: DELLE_FUNZIONI, file: { [DELLE_FUNZIONI]: CON_LE_FUNZIONI } });
        await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "funzioni.algo" }));
      } else await apri(page, { lingua: "it" });
      await expect(statoDi(page)).toHaveText(it.statoPronto);
      const aperta = await c.apri(page);
      await expect(aperta, `${c.nome} non si apre`).toBeVisible();
      await page.keyboard.press("F5");
      await giro(page);
      await page.waitForTimeout(150);
      const conLaCosa = await statoDi(page).textContent();
      const ancoraAperta = await aperta.isVisible();
      // Controllo positivo dello stesso caso: chiusa la cosa con Esc, lo stesso F5 fa partire l'esecuzione.
      await (c.chiudi ?? ((p: Page) => p.keyboard.press("Escape")))(page);
      await expect(aperta).toBeHidden();
      await page.keyboard.press("F5");
      await expect.poll(() => statoDi(page).textContent(), { message: `${c.nome}: chiusa, F5 non parte` }).not.toBe(it.statoPronto);
      if (conLaCosa !== it.statoPronto || !ancoraAperta) esiti.push(`${c.nome}: con la cosa aperta F5 ha dato «${conLaCosa}»${ancoraAperta ? "" : " e la cosa si è chiusa"}`);
    } catch (errore) {
      esiti.push(`${c.nome}: interrotto, ${(errore as Error).message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
  console.log(`[${info.project.name}] F5 con una cosa aperta: ${coseAperte.length} casi, diversi ${esiti.length}`);
  expect(esiti, "F5 ha fatto partire l'esecuzione con una cosa aperta").toEqual([]);
  expect(coseAperte.length).toBe(10);
});

test("le scorciatoie dei file valgono col fuoco in un campo; Canc su un «+» non cancella; Ctrl+Z col menu di un dato aperto non annulla", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const albero = () => page.locator("[data-blocco]").evaluateAll((els) => els.map((e) => e.getAttribute("data-blocco")).join(" "));
  // Ctrl+S, Ctrl+Maiusc+S, Ctrl+O, Ctrl+N col fuoco nei campi di un blocco: il testo si conferma e il comando va.
  const nelCampo = async () => {
    await blocco(page, "b10").dblclick();
    const campo = page.getByRole("form").getByRole("textbox").first();
    await campo.focus();
    await expect(campo).toBeFocused();
  };
  await imposta(page, { daSalvare: "C:\\miei\\uno.algo" });
  await nelCampo();
  await page.keyboard.press("Control+s");
  await expect.poll(async () => Object.keys((await finzione(page)).file)).toContain("C:\\miei\\uno.algo");
  await nelCampo();
  await imposta(page, { daSalvare: null });
  await page.keyboard.press("Control+Shift+s");
  await expect.poll(async () => (await finzione(page)).finestre.salva).toBe(2);
  await nelCampo();
  await imposta(page, { daAprire: null });
  await page.keyboard.press("Control+o");
  await expect.poll(async () => (await finzione(page)).finestre.apri).toBe(1);
  await nelCampo();
  await page.keyboard.press("Control+n");
  const nuovo = page.getByRole("dialog", { name: it.progettoNuovoTitolo, exact: true });
  await expect(nuovo).toBeVisible();
  await page.keyboard.press("Escape");
  // Tolta dal documento, non solo nascosta: sotto carico, in WebKit, una finestra nascosta e non ancora smontata
  // ha ancora la trappola del fuoco, e quando Ctrl+X toglie il blocco col fuoco lo riprende nel suo campo (visto:
  // Ctrl+Z arrivato al campo del nome della finestra chiusa).
  await expect(page.locator('[role="dialog"], [role="alertdialog"]')).toHaveCount(0);
  // Ctrl+X sul blocco scelto lo taglia; Ctrl+V su un «+» lo incolla.
  const prima = await albero();
  await blocco(page, "b10").focus();
  await page.keyboard.press("Control+x");
  await expect(blocco(page, "b10")).toHaveCount(0);
  // I tasti visti dalla pagina, per il messaggio di un rosso: è così che si è visto il Ctrl+Z arrivato al campo
  // della finestra appena chiusa.
  await page.evaluate(() => {
    const visti: string[] = [];
    Object.assign(window, { __visti__: visti });
    document.addEventListener("keydown", (e) => visti.push(`${e.ctrlKey ? "Ctrl+" : ""}${e.key} su ${(e.target as Element).getAttribute?.("data-punto") ?? (e.target as Element).outerHTML.slice(0, 160)} in ${(e.target as Element).closest?.("[aria-label]")?.getAttribute("aria-label")} prevenuto ${e.defaultPrevented}`), true);
  });
  await page.keyboard.press("Control+z");
  await expect
    .poll(albero, { message: `tasti visti: ${JSON.stringify(await page.evaluate(() => (window as unknown as { __visti__: string[] }).__visti__))}` })
    .toBe(prima);
  // Canc col fuoco su un «+», con un blocco scelto prima: il blocco resta.
  await blocco(page, "b10").click();
  await page.locator("[data-punto]").first().focus();
  await page.keyboard.press("Delete");
  await giro(page);
  expect(await albero()).toBe(prima);
  // Ctrl+Z col menu di un dato aperto: la modifica di prima resta.
  await blocco(page, "b10").focus();
  await page.keyboard.press("Delete");
  await expect(blocco(page, "b10")).toHaveCount(0);
  const riga = vistaDati(page).locator('[data-dato="dati-0"]');
  await riga.click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Control+z");
  await giro(page);
  await expect(blocco(page, "b10")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(blocco(page, "b10")).toHaveCount(1);
});

