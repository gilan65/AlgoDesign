// Il watch e il movimento durante l'esecuzione, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del
// build).
//
// - Il watch col puntatore vero: sul programma di riferimento, a due pause scelte (la prima azione e la dodicesima),
//   il puntatore sopra un nome in un blocco mostra un riquadro col nome, il tipo della vista dei dati e il valore
//   della riga corrente dell'atteso scritto a mano (`atteso-del-riferimento.ts`), «non inizializzata» compresa; il
//   nome si evidenzia; il riquadro sta sotto il nome e non copre la punta del blocco corrente; lasciato il nome, il
//   riquadro sparisce. Anche sul nome nel blocco del valore iniziale di un dato.
// - Il movimento ridotto: con la preferenza del sistema emulata, il colore del blocco corrente cambia in un colpo e lo
//   scorrimento verso un blocco arriva in un fotogramma; l'animata avanza lo stesso. Controllo positivo: senza la
//   preferenza il colore passa per valori intermedi e lo scorrimento per posizioni intermedie (si misurano i valori
//   fotogramma per fotogramma, non gli stili dichiarati). In modifica lo scorrimento arriva in un colpo comunque.
// - La velocità dell'animata scelta col clic dal suo menu: il pulsante la mostra e le preferenze la scrivono.
// - Il riquadro fermato da un clic sul nome, col vettore di 1000 elementi: resta lasciando il nome, scorre fino
//   all'ultimo elemento col nome del dato in cima, non sceglie il blocco; una finestra aperta lo copre ed Esc chiude
//   lei sola; ×, Esc e un altro clic sul nome lo chiudono; in finestre basse sta dentro la finestra e non copre il nome
//   (anche sopra il nome). Controllo positivo: senza il fermo l'ultimo elemento non si legge.
// - Lo stesso riquadro dalla tastiera: Maiusc+F9 sul blocco lo apre col fuoco dentro, Fine lo scorre fino all'ultimo
//   elemento, Esc lo chiude e il fuoco torna al blocco.
//
// CHE COSA NON GUARDA:
// - ogni nome a ogni pausa: la prova della finestra sotto happy-dom (`ui/esecuzione/watch.test.tsx`, 8 dati × 66
//   righe) e la posizione dei nomi nel nucleo (`core/disegno/nomi.test.ts`);
// - il riquadro contro ciò che sta sotto il nome (linee, il blocco dopo): un suggerimento copre per un momento ciò
//   che è sotto il puntatore; solo la punta del blocco corrente, che sta sopra il blocco;
// - la durata esatta delle transizioni e dello scorrimento: solo che ci siano o no;
// - la WebView2 vera e la preferenza del sistema vero (la prova sul prodotto).

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { csvItalianoAtteso } from "../core/esecuzione/atteso-del-riferimento";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apri, apriEsempio, apriVuota, costruisciFinzione } from "./pagina";
import { vettoreRiempito } from "./vettore-riempito";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const delCorpus = (nome: string) => readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${nome}.algo`, import.meta.url)), "utf8");
const inputDelRiferimento = (JSON.parse(delCorpus("riferimento-media-voti")) as { test_cases: { inputs: { text: string }[] }[] }).test_cases[0]!.inputs.map((i) => i.text);
/** Un programma senza letture: l'esecuzione va avanti senza aspettare valori. */
const senzaLetture: Funzione = (() => {
  const esito = apriProgetto(delCorpus("assegnazione-intero"));
  if (!esito.ok) throw new Error("l'esempio non si apre");
  return esito.progetto.functions[0]!;
})();

const statoDi = (page: Page) => page.locator("[data-stato-esecuzione]");
const watch = (page: Page) => page.locator('[role="tooltip"][data-watch]');
/** Il nome di un dato in un blocco; `valore:x` è il blocco del valore iniziale del dato `x`. */
const nome = (page: Page, blocco: string, dato: string) =>
  page.locator(`${blocco.startsWith("valore:") ? `[data-iniziale-di="${blocco.slice(7)}"]` : `[data-blocco="${blocco}"]`} [data-watch-dato="${dato}"]`).first();
/** Lo scorrimento morbido del disegno verso il blocco corrente finito: la posizione uguale per cinque fotogrammi di fila.
 * Sotto carico l'animazione si ferma per qualche fotogramma, Playwright guarda la posizione su due soli, e il clic cadeva
 * dove il nome era prima (misurato nel WebKit per Linux col carattere DejaVu Sans: 20 px più a sinistra, e il clic
 * prendeva il disegno). È una soglia, non la condizione: un'animazione ferma per più di cinque fotogrammi la passa
 * ancora, e il rosso torna come un clic che prende il disegno. */
const scorrimentoFinito = (page: Page) =>
  page.getByRole("region", { name: it.vistaFlowchart, exact: true }).evaluate(
    (tela) =>
      new Promise<void>((fatto) => {
        let prima = "";
        let uguali = 0;
        const giro = () => {
          const ora = `${tela.scrollLeft},${tela.scrollTop}`;
          uguali = ora === prima ? uguali + 1 : 0;
          prima = ora;
          if (uguali >= 5) fatto();
          else requestAnimationFrame(giro);
        };
        requestAnimationFrame(giro);
      }),
  );
const giri = (page: Page, n = 2) =>
  page.evaluate((k) => new Promise((r) => {
    const uno = (i: number) => (i === 0 ? r(undefined) : requestAnimationFrame(() => uno(i - 1)));
    uno(k);
  }), n);

/** Avanza con F10, scrivendo i valori del caso quando il programma li chiede, fino alla pausa sull'azione `n`. */
async function finoAllaPausa(page: Page, n: number, input: string[]): Promise<void> {
  const pausa = new RegExp(`^${riempi(it.statoInPausa, { n: "(\\d+)" })}$`);
  const chiede = new RegExp(`^${riempi(it.statoChiede, { dato: "(\\w+)" })}$`);
  for (let i = 0; i < 200; i++) {
    const s = (await statoDi(page).textContent()) ?? "";
    const p = pausa.exec(s);
    if (p && Number(p[1]) === n) return;
    const c = chiede.exec(s);
    if (c) {
      const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: c[1]! }), exact: true });
      await expect(campo).toBeFocused();
      await campo.fill(input.shift()!);
      await campo.press("Enter");
      await expect(statoDi(page)).not.toHaveText(s);
    } else if (p || s === it.statoPronto) {
      await page.keyboard.press("F10");
      await expect(statoDi(page)).not.toHaveText(s);
    } else await page.waitForTimeout(25);
  }
  throw new Error(`la pausa sull'azione ${n} non arriva (stato «${await statoDi(page).textContent()}»)`);
}

/** Il watch di un nome col puntatore vero: nome, tipo e valore come li legge l'utente, e dove sta. */
async function puntaIl(page: Page, blocco: string, dato: string) {
  const n = nome(page, blocco, dato);
  await expect(n, `nel blocco ${blocco} il nome «${dato}» non si punta`).toHaveCount(1, { timeout: 5_000 });
  // `hover` porta il nome in vista (il blocco può essere fuori dalla parte visibile del disegno: col puntatore
  // portato alle coordinate il riquadro non compariva, misurato) e aspetta che stia fermo (la vista scorre morbida
  // verso il blocco corrente), poi ci porta il puntatore.
  await n.hover();
  await expect(watch(page), `il watch di «${dato}» in ${blocco}`).toBeVisible();
  const r = (await n.boundingBox())!;
  const w = watch(page);
  return {
    letto: {
      nome: await w.locator("[data-watch-nome]").textContent(),
      tipo: await w.locator("[data-watch-tipo]").textContent(),
      valore: await w.locator("[data-watch-valore]").textContent(),
    },
    nome: r,
    riquadro: (await w.boundingBox())!,
    evidenziato: await n.locator("rect").evaluate((e) => getComputedStyle(e).fillOpacity),
  };
}

/** Il valore del dato nella riga `numero` dell'atteso, e il suo tipo, dall'intestazione del CSV. */
function atteso(dato: string, numero: number): { nome: string; tipo: string; valore: string } {
  const intestazione = csvItalianoAtteso[0]!.split(";");
  const k = intestazione.findIndex((t) => t.startsWith(`${dato} (`));
  return { nome: dato, tipo: /\((\w+)\)/.exec(intestazione[k]!)![1]!, valore: csvItalianoAtteso[numero + 1]!.split(";")[k]! };
}

const intersecano = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("il watch col puntatore vero, a due pause del riferimento: nome, tipo e valore della riga corrente, sotto il nome e senza coprire la punta", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  // Fuori dall'esecuzione nessun nome si punta.
  await expect(page.locator("[data-watch-dato]")).toHaveCount(0);
  const input = [...inputDelRiferimento];
  const viste: string[] = [];
  for (const [pausa, nomi] of [
    [1, [["b3", "n"], ["b11", "contati"], ["b17", "media"], ["valore:contati", "contati"]]],
    [12, [["b10", "somma"], ["b10", "voto"], ["b7", "i"], ["valore:somma", "somma"]]],
  ] as const) {
    await finoAllaPausa(page, pausa, input);
    for (const [blocco, dato] of nomi) {
      const w = await puntaIl(page, blocco, dato);
      // In pausa sull'azione k la riga corrente è la k - 1.
      expect(w.letto).toEqual(atteso(dato, pausa - 1));
      expect(Number(w.evidenziato)).toBeGreaterThan(0);
      // Sotto il nome, e lontano dalla punta del blocco corrente.
      expect(w.riquadro.y).toBeGreaterThanOrEqual(w.nome.y + w.nome.height - 1);
      const punta = await page.locator("path[data-freccia]").boundingBox();
      expect(punta !== null && intersecano(punta, w.riquadro)).toBe(false);
      viste.push(`${pausa}:${dato}=${w.letto.valore}`);
      // Lasciato il nome, il riquadro sparisce.
      await page.mouse.move(5, 1075);
      await expect(watch(page)).toHaveCount(0);
    }
  }
  console.log(`[${info.project.name}] watch col puntatore: ${viste.join(", ")}`);
  // La premessa: c'era «non inizializzata» fra i valori visti.
  expect(viste.some((v) => v.endsWith(it.tracciaNonInizializzata))).toBe(true);
});

// ------------------------------------------------------------------------------ un vettore di 1000 elementi

test("un vettore di 1000 elementi: un clic sul nome ferma il riquadro, che prende il puntatore e scorre fino all'ultimo elemento; ×, Esc e un altro clic sul nome lo chiudono", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 pesante.algo": vettoreRiempito } });
  await apriEsempio(page, 0);
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFinita, { timeout: 60_000 });
  const v = nome(page, "b2", "v");
  type Riquadro = ReturnType<typeof watch>;
  const ultimo = (w: Riquadro) => w.locator("[data-watch-elemento]").filter({ has: page.locator("[data-watch-indice]", { hasText: /^v\[999\]$/ }) });
  /** L'ultimo elemento si legge: la sua riga è dentro la parte visibile del riquadro, ed è lei sotto il suo centro. */
  const siLeggeLUltimo = async (w: Riquadro) => {
    const riga = await ultimo(w).boundingBox();
    const q = await w.boundingBox();
    if (riga === null || q === null || riga.y < q.y || riga.y + riga.height > q.y + q.height) return false;
    return ultimo(w).evaluate((e, p) => e.contains(document.elementFromPoint(p.x, p.y)), { x: riga.x + riga.width / 2, y: riga.y + riga.height / 2 });
  };

  // Controllo positivo: senza il fermo l'ultimo elemento non si legge, e portare il puntatore sul riquadro lo chiude.
  await v.hover();
  await expect(watch(page)).toBeVisible();
  await expect(watch(page).locator("[data-watch-elementi]")).toHaveText(riempi(it.watchElementi, { n: "1000" }));
  const senzaFermo = await siLeggeLUltimo(watch(page));
  const q = (await watch(page).boundingBox())!;
  await page.mouse.move(q.x + q.width / 2, q.y + q.height / 2);
  await expect(watch(page)).toHaveCount(0);
  expect(senzaFermo, "senza il fermo l'ultimo elemento si legge già: la prova non direbbe nulla").toBe(false);

  // Il clic sul nome lo ferma: lasciato il nome resta, prende il puntatore e scorre fino a v[999] (999 × 999).
  await v.click();
  const fermo = page.locator("[data-watch][data-watch-fermo]");
  await expect(fermo).toBeVisible();
  await expect(fermo).toHaveCount(1);
  // A corsa finita il clic sul nome sceglie anche il blocco (il progetto si modifica di nuovo: lo si copia o si cancella
  // cliccandolo dove capita), e così in pausa (la prova qui sotto).
  const b2 = page.locator('[data-blocco="b2"]').first();
  expect(await b2.getAttribute("aria-pressed")).toBe("true");
  const f = (await fermo.boundingBox())!;
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
  await expect(fermo).toBeVisible();
  // Il riquadro fermo non copre il nome.
  expect(intersecano((await v.boundingBox())!, (await fermo.boundingBox())!)).toBe(false);
  let giri = 0;
  for (; giri < 60 && !(await siLeggeLUltimo(fermo)); giri++) await page.mouse.wheel(0, 1500);
  expect(await siLeggeLUltimo(fermo), `v[999] non si legge dopo ${giri} giri della rotella`).toBe(true);
  await expect(ultimo(fermo).locator("[data-watch-valore]")).toHaveText("998001");
  // Scorso fino in fondo, il nome del dato resta in cima al riquadro, e si legge.
  const testa = fermo.locator("[data-watch-nome]");
  const nomeInCima = (await testa.boundingBox())!;
  const qf = (await fermo.boundingBox())!;
  expect(nomeInCima.y >= qf.y && nomeInCima.y + nomeInCima.height <= qf.y + qf.height).toBe(true);
  const [cx, cy] = [nomeInCima.x + nomeInCima.width / 2, nomeInCima.y + nomeInCima.height / 2];
  expect(await testa.evaluate((e, p) => e.contains(document.elementFromPoint(p.x, p.y)), { x: cx, y: cy })).toBe(true);
  console.log(`[${info.project.name}] watch fermo: v[999] letto dopo ${giri} giri della rotella; senza il fermo letto: ${senzaFermo}`);

  // Una finestra aperta sta sopra il riquadro fermo (il velo lo copre), ed Esc chiude la finestra e non il riquadro.
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  const impostazioni = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  await expect(impostazioni).toBeVisible();
  const centro = (await fermo.boundingBox())!;
  expect(await fermo.evaluate((e, p) => e.contains(document.elementFromPoint(p.x, p.y)), { x: centro.x + centro.width / 2, y: centro.y + centro.height / 2 }), "il riquadro fermo sta sopra la finestra").toBe(false);
  await page.keyboard.press("Escape");
  await expect(impostazioni).toHaveCount(0);
  await expect(fermo).toHaveCount(1);

  // × lo chiude; un altro fermo si chiude con Esc; un altro col secondo clic sul nome.
  await fermo.getByRole("button", { name: it.chiudiEsc, exact: true }).click();
  await expect(fermo).toHaveCount(0);
  await v.click();
  await expect(fermo).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fermo).toHaveCount(0);
  await v.click();
  await expect(fermo).toBeVisible();
  await v.click();
  await expect(fermo).toHaveCount(0);

  // In una finestra bassa il riquadro va sopra il nome, alto quanto il posto bordo compreso: resta dentro la finestra
  // e non copre il nome. Premessa: almeno un'altezza in cui sta sopra il nome.
  let sopraIlNome = 0;
  for (const altezza of [1080, 520, 440]) {
    await page.setViewportSize({ width: 1920, height: altezza });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await v.click();
    await expect(fermo).toBeVisible();
    const misura = await fermo.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { sopra: r.top, sotto: r.bottom, finestra: window.innerHeight };
    });
    const n = (await v.boundingBox())!;
    if (misura.sotto <= n.y) sopraIlNome++;
    console.log(`[${info.project.name}] watch fermo in una finestra alta ${altezza}: da ${misura.sopra} a ${misura.sotto} su ${misura.finestra}, nome da ${n.y} a ${n.y + n.height}`);
    expect(misura.sopra >= 0 && misura.sotto <= misura.finestra, `il riquadro esce dalla finestra alta ${altezza}`).toBe(true);
    expect(intersecano(n, (await fermo.boundingBox())!), `il riquadro copre il nome nella finestra alta ${altezza}`).toBe(false);
    await v.click();
    await expect(fermo).toHaveCount(0);
  }
  expect(sopraIlNome, "in nessuna finestra il riquadro sta sopra il nome: la prova non direbbe nulla").toBeGreaterThan(0);
});

test("dalla tastiera: Maiusc+F9 sul blocco ferma il riquadro col fuoco dentro, Fine lo scorre fino all'ultimo elemento, Esc lo chiude e il fuoco torna al blocco", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 pesante.algo": vettoreRiempito } });
  await apriEsempio(page, 0);
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFinita, { timeout: 60_000 });
  const fermo = page.locator("[data-watch][data-watch-fermo]");
  const ultimo = fermo.locator("[data-watch-elemento]").filter({ has: page.locator("[data-watch-indice]", { hasText: /^v\[999\]$/ }) });
  const siLeggeLUltimo = async () => {
    const riga = await ultimo.boundingBox();
    const q = await fermo.boundingBox();
    return riga !== null && q !== null && riga.y >= q.y && riga.y + riga.height <= q.y + q.height;
  };
  const b2 = page.locator('[data-blocco="b2"]').first();
  await b2.focus();
  await page.keyboard.press("Shift+F9");
  await expect(fermo).toBeVisible();
  await expect(fermo).toBeFocused();
  await expect(fermo.locator("[data-watch-nome]")).toHaveText("v");
  // Controllo positivo: aperto, l'ultimo elemento non si legge ancora.
  const primaDiFine = await siLeggeLUltimo();
  await page.keyboard.press("End");
  await expect.poll(siLeggeLUltimo, { message: "v[999] non si legge dopo Fine" }).toBe(true);
  await expect(ultimo.locator("[data-watch-valore]")).toHaveText("998001");
  expect(primaDiFine, "l'ultimo elemento si legge già all'apertura: la prova non direbbe nulla").toBe(false);
  await page.keyboard.press("Escape");
  await expect(fermo).toHaveCount(0);
  await expect(b2).toBeFocused();
  console.log(`[${info.project.name}] watch dalla tastiera: v[999] letto dopo Fine, prima no; il fuoco tornato al blocco`);
});

/** Una stringa lunga senza spazi, due vettori di 60 elementi riempiti da un ciclo: il riquadro fermo largo e alto. Con 30
 * elementi, nel WebKit per Linux col carattere DejaVu Sans il riquadro di `v` li conteneva tutti a 1920 × 1080, e non
 * scorreva (misurato): 60 lo fanno scorrere con ogni carattere, e la premessa sotto lo controlla. */
const lunghiEVettori = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "lunghi" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        // Senza spazi: non va a capo, ed esce di lato.
        { name: "s", type: "string", initial: `"${"abcdefghij".repeat(15)}"` },
        { name: "v", type: "integer", size: 60 },
        { name: "w", type: "integer", size: 60 },
        { name: "i", type: "integer", initial: "0" },
      ],
      body: [
        {
          id: "b1",
          kind: "while",
          condition: "i < 60",
          body: [
            { id: "b2", kind: "assignment", target: "v[i]", value: "i" },
            { id: "b3", kind: "assignment", target: "w[i]", value: "2 * i" },
            { id: "b4", kind: "assignment", target: "i", value: "i + 1" },
          ],
        },
        { id: "b5", kind: "write", values: ["s"], newline: true },
      ],
      end: { id: "b6" },
    },
  ],
});

test("il riquadro fermo: una stringa lunga si scorre di lato, cambiando dato lo scorrimento riparte, la finestra più bassa lo rimette dentro; in pausa il clic sul nome sceglie anche il blocco", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 lunghi.algo": lunghiEVettori } });
  await apriEsempio(page, 0);
  const fermo = page.locator("[data-watch][data-watch-fermo]");
  // In pausa sulla prima azione il clic sul nome ferma il riquadro e sceglie il blocco: il progetto si modifica.
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await scorrimentoFinito(page);
  await nome(page, "b2", "v").click();
  await expect(fermo).toBeVisible();
  expect(await page.locator('[data-blocco="b2"]').first().getAttribute("aria-pressed")).toBe("true");
  await page.keyboard.press("Escape");
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFinita);
  await scorrimentoFinito(page);

  // La stringa lunga: la rotella di lato la scorre (prima l'eccedenza era nascosta, e la fine non si leggeva).
  await nome(page, "b5", "s").click();
  await expect(fermo).toBeVisible();
  const f = (await fermo.boundingBox())!;
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
  const larghezza = await fermo.evaluate((e) => ({ dentro: e.scrollWidth, visibile: e.clientWidth }));
  // Premessa: la stringa è più larga del riquadro.
  expect(larghezza.dentro).toBeGreaterThan(larghezza.visibile);
  await page.mouse.wheel(400, 0);
  await expect.poll(() => fermo.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("Escape");

  // Il vettore v scorso in fondo, poi il nome di w: il riquadro di w parte dall'inizio.
  await nome(page, "b2", "v").click();
  const fv = (await fermo.boundingBox())!;
  await page.mouse.move(fv.x + fv.width / 2, fv.y + fv.height / 2);
  // Premessa: gli elementi del vettore non stanno tutti nel riquadro.
  const altezza = await fermo.evaluate((e) => ({ dentro: e.scrollHeight, visibile: e.clientHeight }));
  expect(altezza.dentro, `il riquadro di v contiene tutti gli elementi: ${JSON.stringify(altezza)}`).toBeGreaterThan(altezza.visibile);
  for (let k = 0; k < 10; k++) await page.mouse.wheel(0, 1500);
  await expect.poll(() => fermo.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  await nome(page, "b3", "w").click();
  await expect(fermo.locator("[data-watch-nome]")).toHaveText("w");
  expect(await fermo.evaluate((e) => e.scrollTop), "il riquadro di w ha lo scorrimento di v").toBe(0);

  // La finestra più bassa: il riquadro fermo resta tutto dentro.
  await page.setViewportSize({ width: 1920, height: 420 });
  await giri(page, 4);
  const dentro = await fermo.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { sopra: r.top, sotto: r.bottom, finestra: window.innerHeight };
  });
  expect(dentro.sopra >= 0 && dentro.sotto <= dentro.finestra, `il riquadro esce dalla finestra: ${JSON.stringify(dentro)}`).toBe(true);
});

// --------------------------------------------------------------------------------------- il movimento ridotto

/** Dopo F10, fotogramma per fotogramma, il colore di riempimento del blocco che alla fine è il corrente: quanti
 * valori diversi prende (con la transizione, molti; senza, uno). */
async function coloriDelPasso(page: Page): Promise<{ blocco: string; colori: number }> {
  return page.evaluate(async () => {
    const visti: { id: string; fill: string }[] = [];
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", bubbles: true }));
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const c = document.querySelector('[aria-current="step"]');
      const id = c?.getAttribute("data-blocco") ?? c?.getAttribute("data-fine") ?? "";
      const forma = document.querySelector(`g[data-forma][data-id="${id}"] > rect, g[data-forma][data-id="${id}"] > polygon`);
      if (forma) visti.push({ id, fill: getComputedStyle(forma).fill });
    }
    const ultimo = visti.at(-1)?.id ?? "";
    return { blocco: ultimo, colori: new Set(visti.filter((v) => v.id === ultimo).map((v) => v.fill)).size };
  });
}

/** Lo scorrimento della vista del flowchart fino al blocco dato, come lo chiede l'app: quante posizioni diverse
 * attraversa, fotogramma per fotogramma (in un colpo, una). */
async function posizioniDelloScorrimento(page: Page, blocco: string): Promise<number> {
  return page.evaluate(async (id) => {
    const tela = document.querySelector<HTMLElement>('section:has(> svg[role="group"])')!;
    tela.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    tela.querySelector(`[data-blocco="${id}"]`)!.scrollIntoView({ block: "nearest", inline: "nearest" });
    const posizioni: number[] = [];
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      posizioni.push(tela.scrollTop);
    }
    return new Set(posizioni).size;
  }, blocco);
}

for (const ridotto of [true, false])
  test(`${ridotto ? "con «riduci il movimento»: nessuna transizione né scorrimento animato, e l'animata avanza" : "senza «riduci il movimento» (controllo positivo): il colore sfuma e lo scorrimento è morbido"}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: ridotto ? "reduce" : "no-preference" });
    // Una finestra bassa: il riferimento non ci sta, e la vista scorre.
    await page.setViewportSize({ width: 1280, height: 600 });
    await apri(page, { lingua: "it" });
    // In modifica lo scorrimento arriva in un colpo anche senza la preferenza: morbido, si sovrapponeva a quello che
    // porta in vista un «+» (misurato nel collaudo).
    const inModifica = await posizioniDelloScorrimento(page, "b23");
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
    const posizioni = await posizioniDelloScorrimento(page, "b23");
    // I valori iniziali (le pause 1-5), poi un passo: dalla lettura di n (la pausa 6) la pausa successiva.
    for (let n = 2; n <= 6; n++) {
      await page.keyboard.press("F10");
      await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(n) }));
    }
    const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: "n" }), exact: true });
    await page.keyboard.press("F10");
    await expect(campo).toBeFocused();
    await campo.fill("4");
    await campo.press("Enter");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "7" }));
    await page.locator("body").focus();
    const colori = await coloriDelPasso(page);
    console.log(`[${info.project.name}] ${ridotto ? "ridotto" : "senza preferenza"}: in modifica scorrimento in ${inModifica} posizioni; in esecuzione scorrimento in ${posizioni} posizioni, colore del blocco ${colori.blocco} in ${colori.colori} valori`);
    expect(inModifica).toBe(1);
    if (ridotto) expect({ posizioni, colori: colori.colori }).toEqual({ posizioni: 1, colori: 1 });
    else {
      expect(posizioni).toBeGreaterThan(2);
      expect(colori.colori).toBeGreaterThan(2);
    }

    // L'animata avanza comunque: un comando, non una decorazione. Dalla pausa 7 la velocità media porta in pochi
    // secondi, senza tasti, alla lettura di «voto», dove si ferma ad aspettare: uno stato che resta (la pausa 10, di
    // passaggio, sotto il carico del collaudo cadeva fra due controlli della prova).
    await page.getByRole("banner").locator('[data-comando="animata"]').click();
    await expect(statoDi(page)).toHaveText(riempi(it.statoChiede, { dato: "voto" }), { timeout: 10_000 });
    await page.getByRole("banner").locator('[data-comando="animata"]').click();
  });

// ----------------------------------------------------------------------------------------- la velocità

test("la velocità dell'animata si sceglie col clic dal suo menu: il pulsante la mostra e le preferenze la scrivono", async ({ page }) => {
  await apri(page, { lingua: "it" }, undefined, [{ nome: "senza letture", titolo: "senza letture", funzione: senzaLetture }]);
  const velocita = page.getByRole("banner").locator('[data-comando="velocita"]');
  await expect(velocita).toContainText(it.velocitaMedia);
  await velocita.click();
  // Il menu prende il nome dal suo pulsante: il nome del comando e la velocità scelta.
  const menu = page.getByRole("menu", { name: `${it.velocita}: ${it.velocitaMedia}`, exact: true });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemradio", { name: it.velocitaVeloce, exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(velocita).toContainText(it.velocitaVeloce);
  const scritte = (await page.evaluate(() => window.__finzione__.scritte)) as { preferenze?: { velocitaAnimata?: string } }[];
  expect(scritte.at(-1)?.preferenze?.velocitaAnimata).toBe("veloce");
  await giri(page);
});
