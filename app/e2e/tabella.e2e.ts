// La tabella di traccia nella colonna dell'esecuzione, nei motori veri (Chromium e WebKit, server di sviluppo e
// anteprima del build). I confronti cella per cella e il CSV nelle due lingue stanno nella prova della finestra
// sotto happy-dom (`ui/esecuzione/tabella.test.tsx`); qui ciò che happy-dom non disegna.
//
// - Le colonne ferme: scorrendo la tabella di lato fino in fondo, il numero e la regola restano al loro posto e
//   COPRONO ciò che scorre (il punto al centro della loro cella è la loro cella, non un'altra disegnata sopra);
//   con la scelta «solo il numero» delle Impostazioni la regola scorre via e il numero resta. Il rilevatore è
//   lo stesso nei due casi: con «solo il numero» deve dire che la regola NON copre (controllo positivo).
// - «Esporta la tabella» col mouse dal menu «Progetto»: il file scritto dal guscio è il CSV dell'atteso, col BOM.
// - Il bordo fra tabella e console si sposta dalla tastiera; l'interruttore «Tabella» la nasconde (la console
//   prende l'altezza) e la riapre. Coi passi fatti a tabella nascosta, riaperta la regola ferma comincia dove finisce
//   il numero (la misura fatta da nascosta darebbe zero) e la riga corrente è in vista.
// - Una tabella di 1001 righe, riempita mentre era nascosta e poi riaperta, disegna solo quelle in vista (meno di 200
//   nel documento): in fondo la corrente, in vista;
//   scorrendo in cima la riga 0; a metà le righe di quel punto. Le premesse: le righe che la tabella dichiara agli
//   ausili (`aria-rowcount`) sono 1001.
// - «Esporta la tabella» nei suoi rami, col guscio simulato che ha già il file e che può rifiutare la scrittura: la
//   rinuncia nella finestra del sistema (che parte dalla cartella del progetto) non scrive; il nome senza estensione
//   che arriva a un file che c'è fa chiedere, e «Non sostituire» non scrive; «Sostituisci» scrive il CSV dell'atteso
//   (controllo positivo); l'errore di scrittura arriva nella finestra degli errori col nome del file e la risposta
//   del sistema. Durante «tutto insieme» la voce non è disponibile (il file sarebbe più lungo della tabella mostrata);
//   in pausa sì.
// - Il contrasto di ogni testo della colonna dell'esecuzione sulla superficie che ha intorno, coi colori e le opacità
//   come li calcola il motore, almeno 4,5:1 nei tre insiemi di colori, in chiaro e in scuro: la tabella (intestazione
//   col tipo, riga corrente, celle cambiate, elementi segnati in fila, «non inizializzata», dentro e fuori dalla riga
//   corrente), la console (testo, valore non valido, «…» di una riga tagliata, errore, suggerimento, istruzione) e il
//   codice generato messo al posto della tabella (righe e numeri, normali, della riga corrente e della riga
//   dell'errore). Le premesse: ogni specie di testo misurata; controllo positivo: la cella cambiata col testo del
//   colore del suo sfondo.
// - Gli sfondi dei livelli di chiamata, in chiaro e in scuro, su una catena di cinque procedure (il quinto livello torna
//   al primo sfondo): ogni riga di un livello ha lo sfondo del tema per quel livello, la cella cambiata resta ambra sopra
//   di lui, il testo si legge (almeno 4,5:1) e l'ambra resta lontana dallo sfondo (differenza di colore almeno 40); nel
//   codice, le righe delle chiamate in corso con lo sfondo del livello che aprono. Controllo positivo: un livello con lo
//   sfondo ambra è visto.
//
// CHE COSA NON GUARDA:
// - il contrasto dei bordi e dei separatori (non portano testo) e quello in WebKit nel collaudo predefinito (che corre solo Chromium);
// - il trascinamento col mouse dei due bordi (lo stesso componente del bordo della vista dei dati, provato lì);
// - la tabella in inglese e coi separatori scelti (happy-dom);
// - la finestra del sistema vera e la sua domanda di sostituire (è del guscio: la prova sul prodotto).

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { csvItalianoAtteso } from "../core/esecuzione/atteso-del-riferimento";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { voci } from "../ui/preferenze";
import type { Finzione } from "./finzione-tauri";
import { aggiungiStile, apri, apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const INPUT = [
  ["n", "0"],
  ["n", "4"],
  ["voto", "7"],
  ["voto", "11"],
  ["voto", "5"],
  ["voto", "8"],
] as const;

const delCorpus = (nome: string) => readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${nome}.algo`, import.meta.url)), "utf8");

/** Un ciclo lento: resta in corso per minuti prima del tetto dei passi. */
const lento: Funzione = {
  id: "f1",
  kind: "main",
  data: [
    { name: "i", type: "integer", initial: "0" },
    { name: "y", type: "real" },
  ],
  body: [{ id: "b1", kind: "while", condition: "i < 1", body: [{ id: "b2", kind: "assignment", target: "y", value: "1.1 raised_to 1100" }] }],
  end: { id: "b3" },
};

/** Ogni specie di testo della colonna: una lettura (un valore non valido, poi uno buono), una riga più lunga dei
 * caratteri scelti, un vettore riempito da un ciclo (una cella cambiata e un elemento segnato), un dato senza valore
 * che alla fine dà l'errore col suo suggerimento. */
const perIlContrasto: Funzione = {
  id: "f1",
  kind: "main",
  data: [
    { name: "k", type: "integer" },
    { name: "i", type: "integer", initial: "0" },
    { name: "v", type: "integer", size: 12, initial: { each: "-1" } },
    { name: "s", type: "integer" },
  ],
  body: [
    { id: "b1", kind: "read", target: "k" },
    { id: "b2", kind: "write", values: [`"${"abcdef".repeat(10)}"`], newline: true },
    {
      id: "b3",
      kind: "while",
      condition: "i < 12",
      body: [
        { id: "b4", kind: "assignment", target: "v[i]", value: "i * i" },
        { id: "b5", kind: "assignment", target: "i", value: "i + 1" },
      ],
    },
    { id: "b6", kind: "assignment", target: "s", value: "s + k" },
  ],
  end: { id: "b7" },
};

const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]");
const tabella = (page: Page) => page.getByRole("table", { name: it.tabellaDiTraccia, exact: true });

/** Il riferimento eseguito tutto con F5, coi valori del caso scritti nella console. */
async function eseguiIlRiferimento(page: Page): Promise<void> {
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F5");
  for (const [dato, valore] of INPUT) {
    const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato }), exact: true });
    await expect(campo).toBeFocused();
    await campo.fill(valore);
    await campo.press("Enter");
  }
  await expect(statoDi(page)).toHaveText(it.statoFinita);
  await expect(tabella(page).locator("tbody tr")).toHaveCount(66);
}

/** Scorre la tabella di lato fino in fondo; poi, per la riga 30, dice se al centro della cella del numero e di
 * quella della regola, nel punto dove stavano prima, c'è ancora quella cella (e non un'altra disegnata sopra). */
async function copronoScorrendo(page: Page): Promise<{ numero: string; regola: string; spostamento: number }> {
  return tabella(page).evaluate(async (t) => {
    const riga = t.querySelector<HTMLTableRowElement>('tr[data-riga="30"]')!;
    const centro = (c: Element) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2 };
    };
    const [numero, regola] = [riga.cells[0]!, riga.cells[1]!];
    const scorre = t.parentElement!;
    scorre.scrollTop = riga.offsetTop - 60;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // I punti presi prima di scorrere di lato.
    const punti = { numero: centro(numero), regola: centro(regola) };
    scorre.scrollLeft = scorre.scrollWidth;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const chi = (p: { x: number; y: number }, attesa: Element) => {
      const e = document.elementFromPoint(p.x, p.y);
      const cella = e?.closest("td, th");
      return cella === attesa ? "copre" : `sotto «${cella?.textContent ?? e?.tagName}»`;
    };
    return { numero: chi(punti.numero, numero), regola: chi(punti.regola, regola), spostamento: scorre.scrollLeft };
  });
}

test("scorrendo di lato, il numero e la regola restano fermi e coprono ciò che scorre; con «solo il numero» la regola scorre via", async ({ context }, info) => {
  const esiti: string[] = [];
  for (const [colonneFerme, attesa] of [
    [undefined, { numero: "copre", regola: "copre" }],
    ["numero", { numero: "copre", regola: "non copre" }],
  ] as const) {
    const page = await context.newPage();
    await apri(page, { lingua: "it", ...(colonneFerme ? { colonneFerme } : {}) });
    await eseguiIlRiferimento(page);
    const visto = await copronoScorrendo(page);
    esiti.push(`${colonneFerme ?? "predefinita"}: numero ${visto.numero}, regola ${visto.regola}, scorsa di ${visto.spostamento} px`);
    expect(visto.spostamento).toBeGreaterThan(200);
    expect({ numero: visto.numero, regola: visto.regola === "copre" ? "copre" : "non copre" }).toEqual(attesa);
    await page.close();
  }
  console.log(`[${info.project.name}] colonne ferme: ${esiti.join("; ")}`);
});

test("«Esporta la tabella» col mouse dal menu «Progetto» scrive il CSV dell'atteso", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await eseguiIlRiferimento(page);
  await page.evaluate(() => Object.assign(window.__finzione__, { daEsportare: "C:\\Documenti\\traccia" }));
  await (await voceDelMenu(page, it.esportaTabella)).click();
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.esportataIn, { file: "traccia.csv" }));
  const f = await page.evaluate(() => window.__finzione__);
  expect(f.finestre.proposto).toBe(riempi(it.nomeDellaTabella, { nome: "riferimento-media-voti" }));
  expect(f.file["C:\\Documenti\\traccia.csv"]).toBe(`\u{feff}${csvItalianoAtteso.join("\r\n")}\r\n`);
});

test("il bordo fra tabella e console si sposta dalla tastiera; «Tabella» nasconde la tabella e la riapre", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await eseguiIlRiferimento(page);
  const pannello = page.locator(`[id="${await page.getByRole("separator", { name: it.altezzaTabella, exact: true }).getAttribute("aria-controls")}"]`);
  const altezza = async () => (await pannello.boundingBox())!.height;
  const prima = await altezza();
  const bordo = page.getByRole("separator", { name: it.altezzaTabella, exact: true });
  await bordo.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect.poll(altezza).toBeCloseTo(prima - 32, 0);
  const registro = page.getByRole("log", { name: it.console, exact: true });
  const conTabella = (await registro.boundingBox())!.height;
  const interruttore = page.getByRole("banner").getByRole("button", { name: it.pannelloTabella, exact: true });
  await expect(interruttore).toHaveAttribute("aria-expanded", "true");
  await interruttore.click();
  await expect(interruttore).toHaveAttribute("aria-expanded", "false");
  await expect(tabella(page)).toBeHidden();
  await expect(bordo).toHaveCount(0);
  expect((await registro.boundingBox())!.height).toBeGreaterThan(conTabella + 200);
  await interruttore.click();
  await expect(tabella(page)).toBeVisible();
  // Senza esecuzione l'interruttore non è disponibile.
  await page.keyboard.press("Shift+F5");
  await expect(interruttore).toHaveAttribute("aria-disabled", "true");
});

/** La larghezza della colonna dei numeri e dove comincia la regola ferma, in px: devono coincidere. */
const misuraDelleFerme = (page: Page) =>
  tabella(page).evaluate((t) => {
    const scorre = t.parentElement!;
    const numero = t.querySelector("th")!.getBoundingClientRect().width;
    const regola = parseFloat(getComputedStyle(t.querySelectorAll("th")[1]!).left);
    // Lo scarto fra i due, entro un px: i motori arrotondano i sottopixel in modi loro (WebKit: 42,4 e 42,6).
    return { numero: Math.round(numero), regola: Math.round(regola), allineate: Math.abs(numero - regola) <= 1, nascosta: scorre.offsetParent === null };
  });

test("passi fatti con la tabella nascosta: riaperta, la regola ferma comincia dove finisce il numero e la riga corrente è in vista", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  // La tabella nascosta prima della prima riga: tutte le righe arrivano mentre è nascosta.
  const interruttore = page.getByRole("banner").getByRole("button", { name: it.pannelloTabella, exact: true });
  await interruttore.click();
  await expect(tabella(page)).toBeHidden();
  // I valori iniziali (le azioni 1-5), poi la lettura di n (la 6).
  for (let n = 2; n <= 6; n++) {
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(n) }));
  }
  await page.keyboard.press("F10");
  const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: "n" }), exact: true });
  await expect(campo).toBeFocused();
  await campo.fill("4");
  await campo.press("Enter");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "7" }));
  for (let n = 8; n <= 10; n++) {
    await page.keyboard.press("F10");
    await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(n) }));
  }
  await interruttore.click();
  await expect(tabella(page)).toBeVisible();
  const viste = await misuraDelleFerme(page);
  // Controllo positivo della premessa: la colonna dei numeri è larga (la misura fatta da nascosta darebbe 0).
  expect(viste.numero).toBeGreaterThan(10);
  expect(viste, JSON.stringify(viste)).toMatchObject({ allineate: true, nascosta: false });
  // La riga corrente sta dentro l'area che scorre.
  const inVista = await tabella(page).evaluate((t) => {
    const r = t.querySelector('tr[aria-current="true"]')!.getBoundingClientRect();
    const a = t.parentElement!.getBoundingClientRect();
    return r.top >= a.top - 1 && r.bottom <= a.bottom + 1;
  });
  expect(inVista).toBe(true);
});

/** Un ciclo di 600 giri: più di mille azioni, e nella tabella 1001 righe (la riga 0 e le ultime 1000). */
const lungo: Funzione = {
  id: "f1",
  kind: "main",
  data: [{ name: "i", type: "integer", initial: "0" }],
  body: [{ id: "b1", kind: "while", condition: "i < 600", body: [{ id: "b2", kind: "assignment", target: "i", value: "i + 1" }] }],
  end: { id: "b3" },
};

test("una tabella lunga disegna solo le righe in vista: in fondo la corrente, scorrendo in cima la riga 0, al posto delle altre righe vuote", async ({ page }) => {
  // La misura della finestra dove la corrente si vedeva tagliata (l'altezza stimata delle righe, senza i bordi
  // della tabella, cadeva 14 px sopra il fondo vero).
  await page.setViewportSize({ width: 1536, height: 639 });
  await apri(page, { lingua: "it" }, undefined, [{ nome: "lungo", titolo: "lungo", funzione: lungo }]);
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  // La corsa con la tabella nascosta (nascosta non ha misure: non deve passare a disegnarle tutte), poi riaperta.
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  const interruttore = page.getByRole("banner").getByRole("button", { name: it.pannelloTabella, exact: true });
  await interruttore.click();
  await expect(tabella(page)).toBeHidden();
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoFinita);
  await interruttore.click();
  await expect(tabella(page)).toBeVisible();
  // Riaperta, la colonna dei numeri (da una cifra a quattro mentre era nascosta) si rimisura: la regola ferma
  // comincia dove finisce il numero.
  const ferme = await misuraDelleFerme(page);
  expect(ferme, JSON.stringify(ferme)).toMatchObject({ allineate: true, nascosta: false });
  const vista = () =>
    tabella(page).evaluate((t) => {
      const scorre = t.parentElement!.getBoundingClientRect();
      const righe = [...t.querySelectorAll<HTMLTableRowElement>("tbody tr[data-riga]")];
      const inVista = righe.filter((r) => {
        const b = r.getBoundingClientRect();
        return b.bottom > scorre.top + 1 && b.top < scorre.bottom - 1;
      });
      // In vista tutta: dentro l'area che si vede (l'altezza senza la barra di scorrimento).
      const corrente = t.querySelector('tr[aria-current="true"]')?.getBoundingClientRect();
      const fondoDellaVista = scorre.top + t.parentElement!.clientHeight;
      return {
        disegnate: righe.length,
        correnteTutta: corrente !== undefined && corrente.top >= scorre.top - 1 && corrente.bottom <= fondoDellaVista + 1,
        tutte: Number(t.getAttribute("aria-rowcount")) - 1,
        prima: inVista[0]?.dataset.riga,
        corrente: t.querySelector('tr[aria-current="true"]')?.getAttribute("data-riga") ?? null,
        correnteInVista: inVista.some((r) => r.getAttribute("aria-current") === "true"),
        riga0: righe.some((r) => r.dataset.riga === "0"),
      };
    });
  const inFondo = await vista();
  // Le premesse: la tabella ha 1001 righe, e la corrente è l'ultima.
  expect(inFondo.tutte).toBe(1001);
  expect(inFondo.corrente).not.toBeNull();
  expect(inFondo.correnteInVista).toBe(true);
  expect(inFondo.correnteTutta).toBe(true);
  expect(inFondo.disegnate).toBeLessThan(200);
  expect(inFondo.riga0).toBe(false);
  // In cima: la riga 0 è disegnata e in vista, la corrente no.
  await tabella(page).evaluate((t) => {
    t.parentElement!.scrollTop = 0;
  });
  await expect.poll(async () => (await vista()).prima).toBe("0");
  const inCima = await vista();
  expect(inCima.disegnate).toBeLessThan(200);
  expect(inCima.corrente).toBeNull();
  // In cima i numeri disegnati hanno una cifra in meno (0 e 204…, in fondo 1203): la colonna dei numeri si restringe, e
  // la regola ferma si rimisura (prima si misurava solo a ogni azione, e scorrendo restava staccata dal numero).
  await expect.poll(async () => (await misuraDelleFerme(page)).allineate, { message: JSON.stringify(await misuraDelleFerme(page)) }).toBe(true);
  // Premessa: la colonna dei numeri in cima è davvero più stretta che in fondo.
  expect((await misuraDelleFerme(page)).numero).toBeLessThan(ferme.numero);
  // A metà: le righe in vista sono quelle del punto in cui si è (né la prima né l'ultima).
  await tabella(page).evaluate((t) => {
    const s = t.parentElement!;
    s.scrollTop = (s.scrollHeight - s.clientHeight) / 2;
  });
  await expect.poll(async () => Number((await vista()).prima)).toBeGreaterThan(300);
  console.log(`tabella lunga: in fondo ${JSON.stringify(inFondo)}; in cima ${JSON.stringify(inCima)}; a metà ${JSON.stringify(await vista())}`);
});

// ------------------------------------------------------------------------------- l'esportazione nei suoi rami

test("«Esporta la tabella» nei suoi rami: la rinuncia, «Non sostituire», «Sostituisci» e l'errore di scrittura", async ({ page }) => {
  const cartella = "C:\\Documenti\\classe";
  const progetto = `${cartella}\\riferimento-media-voti.algo`;
  const giaPresente = `${cartella}\\traccia.csv`;
  await apriVuota(page, { lingua: "it" }, { file: { [progetto]: delCorpus("riferimento-media-voti"), [giaPresente]: "c'era" }, daAprire: progetto });
  await expect(page.getByRole("banner")).toBeVisible();
  await page.keyboard.press("Control+o");
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.apertoIl, { file: "riferimento-media-voti.algo" }));
  await eseguiIlRiferimento(page);
  const f = () => page.evaluate(() => window.__finzione__);
  const imposta = (s: Partial<Finzione>) => page.evaluate((x) => Object.assign(window.__finzione__, x), s);
  const avviso = page.locator('output[role="status"]');
  const domanda = page.getByRole("alertdialog", { name: riempi(it.sostituireTitolo, { file: "traccia.csv" }), exact: true });
  const esporta = async () => (await voceDelMenu(page, it.esportaTabella)).click();
  const csvAtteso = `\u{feff}${csvItalianoAtteso.join("\r\n")}\r\n`;

  // La rinuncia nella finestra del sistema: niente scritto, nessun messaggio. La finestra parte dalla cartella del progetto.
  await page.locator('output[role="status"] + button').click();
  await imposta({ daEsportare: null });
  await esporta();
  await expect.poll(async () => (await f()).finestre.esporta).toBe(1);
  expect((await f()).finestre.cartella).toBe(cartella);
  await expect(avviso).toHaveText("");
  expect(Object.keys((await f()).file).sort()).toEqual([progetto, giaPresente].sort());

  // «traccia» senza estensione diventa «traccia.csv», che c'è: l'app chiede. «Non sostituire» non scrive.
  await imposta({ daEsportare: `${cartella}\\traccia` });
  await esporta();
  await expect(domanda).toBeVisible();
  await domanda.getByRole("button", { name: it.sostituireRinuncia, exact: true }).click();
  await expect(domanda).toBeHidden();
  expect((await f()).file[giaPresente]).toBe("c'era");
  await expect(avviso).toHaveText("");

  // Controllo positivo: «Sostituisci» scrive il CSV, e il messaggio lo dice.
  await esporta();
  await expect(domanda).toBeVisible();
  await domanda.getByRole("button", { name: it.sostituireConferma, exact: true }).click();
  await expect(avviso).toHaveText(riempi(it.esportataIn, { file: "traccia.csv" }));
  expect((await f()).file[giaPresente]).toBe(csvAtteso);

  // L'errore di scrittura: la finestra degli errori col nome del file e la risposta del sistema; niente scritto.
  await imposta({ daEsportare: `${cartella}\\nuova`, scritturaRifiutata: "accesso negato" });
  await page.locator('output[role="status"] + button').click();
  await esporta();
  const errore = page.getByRole("alertdialog", { name: riempi(it.esportaErroreTitolo, { file: "nuova.csv" }), exact: true });
  await expect(errore).toBeVisible();
  await expect(errore).toContainText(riempi(it.erroreDelSistema, { dettaglio: "accesso negato" }));
  expect((await f()).file[`${cartella}\\nuova.csv`]).toBeUndefined();
  await expect(avviso).toHaveText("");
});

test("durante «tutto insieme» «Esporta la tabella» non è disponibile: il file sarebbe più lungo della tabella mostrata", async ({ page }) => {
  await apri(page, { lingua: "it" }, undefined, [{ nome: "lento", titolo: "lento", funzione: lento }]);
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F5");
  await expect(statoDi(page)).toHaveText(it.statoInCorso);
  const voce = await voceDelMenu(page, it.esportaTabella);
  await expect(voce).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: it.menuProgetto, exact: true })).toHaveCount(0);
  // Controllo positivo: fermata in pausa (F10 non c'è in corsa: si passa da «Ferma» e da un passo), la voce torna.
  await page.locator('header [data-comando="ferma"]').click();
  await expect(statoDi(page)).toHaveText(it.statoPronto);
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await expect(await voceDelMenu(page, it.esportaTabella)).toHaveAttribute("aria-disabled", "false");
});

// ------------------------------------------------------------------------------------------- il contrasto

type Rgba = [number, number, number, number];

/** Ogni testo della colonna dell'esecuzione sulla superficie che ha intorno, come la disegna il motore: dal testo
 * verso la radice, sotto ogni elemento il suo sfondo e, sopra, la sua opacità (che vale per tutto ciò che contiene);
 * alla fine lo sfondo della pagina. Il colore del testo e quello dello sfondo accanto escono già mescolati. */
function testiDellaColonna(page: Page): Promise<{ cosa: string; testo: Rgba; sfondo: Rgba }[]> {
  return page.evaluate((nome) => {
    const colonna = document.querySelector(`section[aria-label="${nome}"]`)!;
    const rgba = (c: string): [number, number, number, number] => {
      const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
      if (!m) throw new Error(`colore non letto: «${c}»`);
      return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
    };
    const sopra = (s: number[], d: number[]): [number, number, number, number] => {
      const a = s[3]! + d[3]! * (1 - s[3]!);
      if (a === 0) return [0, 0, 0, 0];
      const c = (k: number) => (s[k]! * s[3]! + d[k]! * d[3]! * (1 - s[3]!)) / a;
      return [c(0), c(1), c(2), a];
    };
    const prova = document.createElement("span");
    prova.style.color = "var(--colore-errore)";
    colonna.append(prova);
    const errore = getComputedStyle(prova).color;
    prova.remove();
    const fuori: { cosa: string; testo: [number, number, number, number]; sfondo: [number, number, number, number] }[] = [];
    const visti = new Set<string>();
    const scorri = document.createTreeWalker(colonna, NodeFilter.SHOW_TEXT);
    for (let n = scorri.nextNode(); n; n = scorri.nextNode()) {
      const el = n.parentElement!;
      if ((n.textContent ?? "").trim() === "" || el.getClientRects().length === 0) continue;
      const stile = getComputedStyle(el);
      let testo = rgba(stile.color);
      let sfondo: [number, number, number, number] = [0, 0, 0, 0];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        const fondo = rgba(s.backgroundColor);
        testo = sopra(testo, fondo);
        sfondo = sopra(sfondo, fondo);
        const o = Number(s.opacity);
        testo = [testo[0], testo[1], testo[2], testo[3] * o];
        sfondo = [sfondo[0], sfondo[1], sfondo[2], sfondo[3] * o];
      }
      const pagina = rgba(getComputedStyle(document.documentElement).backgroundColor);
      const base: [number, number, number, number] = pagina[3] === 0 ? [255, 255, 255, 1] : pagina;
      testo = sopra(testo, base);
      sfondo = sopra(sfondo, base);
      const corrente = el.closest('tr[aria-current="true"]') ? " (riga corrente)" : "";
      // Il codice generato: il testo di una riga o il suo numero, e se la riga è quella corrente o dell'errore.
      const riga = el.closest("pre [data-riga]");
      const evidenziata = riga?.getAttribute("data-evidenziata");
      const delCodice = riga ? `${el.getAttribute("aria-hidden") === "true" ? "numero" : "codice"}${evidenziata ? ` (${evidenziata})` : ""}` : null;
      const specie = delCodice ?? (el.closest("mark[data-cambiato]")
        ? "elemento segnato"
        : el.closest("td[data-cambiata]")
          ? "cella cambiata"
          : el.closest("[data-non-inizializzata]")
            ? "non inizializzata"
            : el.closest("[data-tipo]")
              ? "tipo"
              : el.closest("[data-suggerimento]")
                ? "suggerimento"
                : el.closest('[role="log"] button[aria-expanded]')
                  ? "spiegazione"
                : el.closest('[role="status"]')
                  ? "istruzione"
                  : el.closest('[role="log"]') && stile.color === errore
                    ? "errore"
                    : el.closest('[role="log"]') && n.textContent === "…"
                      ? "tagliata"
                      : el.closest("table")
                        ? "tabella"
                        : el.closest('[role="log"]')
                          ? "console"
                          : "colonna");
      const cosa = `${specie}${corrente}`;
      const chiave = `${cosa} ${testo.join()} ${sfondo.join()}`;
      if (visti.has(chiave)) continue;
      visti.add(chiave);
      fuori.push({ cosa, testo, sfondo });
    }
    return fuori;
  }, it.colonnaEsecuzione);
}

/** Il rapporto di contrasto WCAG 2. */
function contrasto(a: Rgba, b: Rgba): number {
  const luminanza = (c: Rgba) => {
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const SPECIE_ATTESE = [
  "elemento segnato",
  "elemento segnato (riga corrente)",
  "cella cambiata",
  "cella cambiata (riga corrente)",
  "non inizializzata",
  "non inizializzata (riga corrente)",
  "tipo",
  "suggerimento",
  "spiegazione",
  "istruzione",
  "errore",
  "tagliata",
  "tabella",
  "tabella (riga corrente)",
  "console",
  "colonna",
  "codice",
  "numero",
  "codice (corrente)",
  "numero (corrente)",
  "codice (errore)",
  "numero (errore)",
];

test("contrasto dei testi della colonna dell'esecuzione, codice generato compreso, in chiaro e in scuro, per ognuno dei tre insiemi di colori", async ({ context }, info) => {
  test.setTimeout(240_000);
  const esiti: string[] = [];
  const sotto: string[] = [];
  for (const colori of voci.colori)
    for (const schema of ["light", "dark"] as const) {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: schema });
      await apri(page, { lingua: "it", colori, formaDeiVettori: "in-fila", righeLunghe: "la-fine", caratteriPerRiga: 50 }, undefined, [{ nome: "colonna", titolo: "colonna", funzione: perIlContrasto }]);
      const coppie = new Map<string, { cosa: string; testo: Rgba; sfondo: Rgba }>();
      const raccogli = async () => {
        for (const c of await testiDellaColonna(page)) coppie.set(`${c.cosa} ${c.testo.join()} ${c.sfondo.join()}`, c);
      };
      /** Il codice generato al posto della tabella («Genera»), i suoi testi raccolti, poi di nuovo la tabella. */
      const colCodice = async (poi: () => Promise<void>) => {
        await page.getByRole("banner").getByRole("button", { name: it.pannelloCodice, exact: true }).click();
        await expect(page.locator("pre [data-riga][data-evidenziata]").first()).toBeVisible();
        await poi();
        await page.getByRole("banner").getByRole("button", { name: it.pannelloTabella, exact: true }).click();
        await expect(tabella(page)).toBeVisible();
      };
      // I punti di interruzione sulle due azioni del ciclo: in pausa dopo l'una o dopo l'altra la riga corrente ha
      // la cella cambiata o l'elemento segnato.
      for (const id of ["b4", "b5"]) {
        await page.locator(`[data-blocco="${id}"]`).click();
        await page.keyboard.press("F9");
      }
      await expect(page.locator("[data-interruzione]")).toHaveCount(2);
      await page.keyboard.press("F5");
      const campo = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: "k" }), exact: true });
      await expect(campo).toBeFocused();
      // Un valore non valido (scritto col colore dell'errore), poi l'istruzione ancora lì.
      await campo.fill("x");
      await campo.press("Enter");
      // La riga del valore non valido, poi la stessa lettura richiesta (il campo si svuota alla richiesta nuova).
      await expect(page.getByRole("log", { name: it.console, exact: true })).toContainText(riempi(it.consoleNonValido, { testo: "x", dato: "k" }));
      await raccogli();
      await campo.fill("3");
      await expect(campo).toHaveValue("3");
      await campo.press("Enter");
      // Tre pause: prima di «v[i] ← i * i», prima di «i ← i + 1» (la riga corrente ha l'elemento segnato), di nuovo prima
      // di «v[i] ← i * i» (la riga corrente ha la cella cambiata di «i»).
      let prima = "";
      for (let k = 0; k < 3; k++) {
        await expect(statoDi(page)).not.toHaveText(prima);
        await expect(statoDi(page)).toHaveText(new RegExp(`^${riempi(it.statoInPausa, { n: "\\d+" })}$`));
        prima = (await statoDi(page).textContent()) ?? "";
        await raccogli();
        // Alla prima pausa anche il codice generato al posto della tabella, con la riga corrente; poi di nuovo la tabella.
        if (k === 0) await colCodice(raccogli);
        await page.keyboard.press("F5");
      }
      await expect(statoDi(page)).not.toHaveText(prima);
      await page.getByRole("banner").getByRole("button", { name: it.togliPunti, exact: true }).click();
      await page.keyboard.press("F5");
      await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
      await raccogli();
      // Il suggerimento dell'errore sta dietro «Spiegazione», chiusa all'inizio: il pulsante, poi il riquadro aperto.
      await page.getByRole("log", { name: it.console, exact: true }).getByRole("button", { name: it.spiegazione, exact: true }).click();
      await expect(page.locator("[role=log] [data-suggerimento]")).toBeVisible();
      await raccogli();
      // Il codice con la riga dell'errore.
      await colCodice(raccogli);
      const tutte = [...coppie.values()];
      const specie = [...new Set(tutte.map((c) => c.cosa))].sort();
      const minimo = Math.min(...tutte.map((c) => contrasto(c.testo, c.sfondo)));
      esiti.push(`${colori} ${schema}: ${tutte.length} coppie, il più basso ${minimo.toFixed(2)}:1`);
      for (const c of tutte) if (contrasto(c.testo, c.sfondo) < 4.5) sotto.push(`${colori} ${schema} · ${c.cosa}: ${contrasto(c.testo, c.sfondo).toFixed(2)}:1 (rgb ${c.testo.slice(0, 3).map(Math.round).join(",")} su ${c.sfondo.slice(0, 3).map(Math.round).join(",")})`);
      // Le premesse: ogni specie di testo della colonna è stata misurata.
      expect(SPECIE_ATTESE.filter((s) => !specie.includes(s)), `${colori} ${schema}: specie non viste`).toEqual([]);
      // Controllo positivo: la cella cambiata col testo del colore del suo sfondo è vista.
      await aggiungiStile(page, "td[data-cambiata] { color: var(--esecuzione-cambiata) !important; }");
      expect((await testiDellaColonna(page)).some((c) => c.cosa.startsWith("cella cambiata") && contrasto(c.testo, c.sfondo) < 4.5)).toBe(true);
      await page.close();
    }
  console.log(`[${info.project.name}] contrasto della colonna: ${esiti.join("; ")}${sotto.length > 0 ? ` | SOTTO 4,5: ${sotto.join("; ")}` : ""}`);
  expect(esiti.length).toBe(6);
  expect(sotto).toEqual([]);
});

// ------------------------------------------------------------------------------- gli sfondi dei livelli

/** Una catena di cinque procedure, ognuna con un parametro per riferimento che aumenta e passa alla seguente. */
const catena = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "catena" },
  functions: [
    { id: "f0", kind: "main", data: [{ name: "n", type: "integer", initial: "0" }], body: [{ id: "c0", kind: "call", callee: "l1", arguments: ["n"] }], end: { id: "e0" } },
    ...[1, 2, 3, 4, 5].map((k) => ({
      id: `f${k}`,
      kind: "procedure",
      name: `l${k}`,
      data: [{ name: "a", type: "integer", parameter: "reference" }],
      body: [{ id: `a${k}`, kind: "assignment", target: "a", value: "a + 1" }, ...(k < 5 ? [{ id: `c${k}`, kind: "call", callee: `l${k + 1}`, arguments: ["a"] }] : [])],
      end: { id: `e${k}` },
    })),
  ],
});

/** La differenza di colore CIE76 (nello spazio Lab). */
function distanza(a: Rgba, b: Rgba): number {
  const lab = (c: Rgba) => {
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    const f = (x: number) => (x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116);
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047);
    const y = f(0.2126 * r + 0.7152 * g + 0.0722 * bl);
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}

/** Per ogni riga della tabella con un livello: lo sfondo, i colori della cella del numero e di una cella cambiata; i
 * colori del tema per ogni livello e per l'ambra; le righe delle chiamate nel codice. Tutto come lo calcola il motore. */
function sfondiNelMotore(page: Page) {
  return page.evaluate(() => {
    const rgba = (c: string): [number, number, number, number] => {
      const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
      if (!m) throw new Error(`colore non letto: «${c}»`);
      return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
    };
    /** Il colore di una variabile del tema, come il motore lo calcola su un elemento di prova. */
    const delTema = (v: string) => {
      const prova = document.createElement("span");
      prova.style.backgroundColor = `var(${v})`;
      document.body.append(prova);
      const c = rgba(getComputedStyle(prova).backgroundColor);
      prova.remove();
      return c;
    };
    const righe = [...document.querySelectorAll<HTMLTableRowElement>("table[data-traccia] tbody tr[data-sfondo]")].map((tr) => {
      const numero = tr.cells[0]!;
      const cambiata = tr.querySelector<HTMLElement>("td[data-cambiata]");
      return {
        livello: Number(tr.dataset.livello),
        sfondo: Number(tr.dataset.sfondo),
        fondo: rgba(getComputedStyle(numero).backgroundColor),
        testo: rgba(getComputedStyle(numero).color),
        cambiata: cambiata ? { fondo: rgba(getComputedStyle(cambiata).backgroundColor), testo: rgba(getComputedStyle(cambiata).color) } : null,
      };
    });
    const chiamate = [...document.querySelectorAll<HTMLElement>("pre [data-riga][data-chiamata]")].map((r) => ({ sfondo: Number(r.dataset.chiamata), fondo: rgba(getComputedStyle(r).backgroundColor) }));
    return { righe, chiamate, livelli: [1, 2, 3, 4].map((k) => delTema(`--traccia-livello-${k}`)), ambra: delTema("--esecuzione-cambiata") };
  });
}

test("gli sfondi dei livelli di chiamata in chiaro e in scuro: la cella cambiata resta ambra, il testo si legge, nel codice le righe delle chiamate", async ({ context }, info) => {
  test.setTimeout(120_000);
  const percorso = "C:\\Documenti\\catena.algo";
  const esiti: string[] = [];
  for (const schema of ["light", "dark"] as const) {
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: schema });
    await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: catena } });
    await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "catena.algo" }));
    // I comandi dalla barra: un clic per dare il fuoco al flowchart può cadere su un'altra scheda.
    const comando = (id: string) => page.locator(`header [data-comando="${id}"]`).click();
    await page.locator('[data-scheda="f0"]').click();
    await comando("esegui");
    await expect(statoDi(page)).toHaveText(it.statoFinita);
    const { righe, livelli, ambra } = await sfondiNelMotore(page);
    const sbagliate: string[] = [];
    for (const r of righe) {
      const atteso = livelli[r.sfondo - 1]!;
      if (r.sfondo !== ((r.livello - 1) % 4) + 1) sbagliate.push(`livello ${r.livello}: sfondo ${r.sfondo}`);
      if (r.fondo.join() !== atteso.join()) sbagliate.push(`livello ${r.livello}: fondo ${r.fondo.join()} invece di ${atteso.join()}`);
      if (contrasto(r.testo, r.fondo) < 4.5) sbagliate.push(`livello ${r.livello}: testo ${contrasto(r.testo, r.fondo).toFixed(2)}:1`);
      // Le righe del salto e dei valori cambiati hanno una cella cambiata; la fine di una procedura no.
      if (r.cambiata !== null) {
        if (r.cambiata.fondo.join() !== ambra.join()) sbagliate.push(`livello ${r.livello}: cella cambiata ${r.cambiata.fondo.join()}`);
        if (contrasto(r.cambiata.testo, r.cambiata.fondo) < 4.5) sbagliate.push(`livello ${r.livello}: testo della cella cambiata ${contrasto(r.cambiata.testo, r.cambiata.fondo).toFixed(2)}:1`);
      }
      if (distanza(ambra, r.fondo) < 40) sbagliate.push(`livello ${r.livello}: l'ambra a ${distanza(ambra, r.fondo).toFixed(1)} dallo sfondo`);
    }
    // Premesse: i cinque livelli visti, il quinto col primo sfondo, e in ognuno una cella cambiata.
    const ordinale = ["primo", "secondo", "terzo", "quarto"];
    expect([...new Set(righe.map((r) => `${r.livello} sul ${ordinale[r.sfondo - 1]}`))].sort(), `${schema}: i livelli visti`).toEqual(["1 sul primo", "2 sul secondo", "3 sul terzo", "4 sul quarto", "5 sul primo"]);
    expect([...new Set(righe.filter((r) => r.cambiata !== null).map((r) => r.livello))].sort(), `${schema}: le celle cambiate per livello`).toEqual([1, 2, 3, 4, 5]);
    expect(sbagliate, schema).toEqual([]);
    esiti.push(`${schema}: ${righe.length} righe, testo almeno ${Math.min(...righe.map((r) => contrasto(r.testo, r.fondo))).toFixed(2)}:1, ambra almeno ΔE ${Math.min(...righe.map((r) => distanza(ambra, r.fondo))).toFixed(1)}`);
    // Controllo positivo: un livello con lo sfondo ambra è visto.
    await aggiungiStile(page, 'table[data-traccia] tr[data-sfondo="2"] { --sfondo-della-riga: var(--esecuzione-cambiata) !important; }');
    const alterate = await sfondiNelMotore(page);
    expect(alterate.righe.some((r) => r.sfondo === 2 && distanza(alterate.ambra, r.fondo) < 40)).toBe(true);
    // Nel codice: in pausa nel quinto livello, le chiamate dei cinque di sopra con lo sfondo del livello che aprono.
    await comando("ferma");
    await expect(statoDi(page)).toHaveText(it.statoPronto);
    await comando("genera");
    await page.locator('[data-scheda="f0"]').click();
    // Il valore iniziale di n, poi per ogni livello il salto e l'assegnazione: undici azioni fino a quella del quinto.
    for (let k = 1; k <= 11; k++) {
      await comando("entra");
      await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: String(k) }));
    }
    const { chiamate } = await sfondiNelMotore(page);
    expect(chiamate.map((c) => c.sfondo), `${schema}: le chiamate nel codice`).toEqual([1, 2, 3, 4, 1]);
    for (const c of chiamate) expect(c.fondo.join(), `${schema}: la chiamata del livello ${c.sfondo}`).toBe(livelli[c.sfondo - 1]!.join());
    await page.close();
  }
  console.log(`[${info.project.name}] sfondi dei livelli: ${esiti.join("; ")}`);
});
