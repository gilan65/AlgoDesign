// Il watch nella finestra, sotto happy-dom: la finestra vera (`Applicazione`) col file dato all'avvio da un guscio
// simulato, i tasti premuti come li preme l'utente e il puntatore portato sui nomi dei dati nei blocchi.
//
// - Durante l'esecuzione i nomi dei dati nei blocchi del riferimento sono elementi col loro dato: 34, quelli scritti
//   qui a mano blocco per blocco leggendo il file (nessuno nei commenti, nessuno dentro un letterale: «insufficienti»
//   c'è anche nel testo di una scrittura).
// - A ogni pausa del riferimento, e alla fine, il watch di ognuno degli 8 dati ha il nome, il tipo della vista dei
//   dati e il valore della riga corrente dell'atteso scritto a mano (`atteso-del-riferimento.ts`), «non
//   inizializzata» compresa: 8 dati × 66 righe.
// - Un vettore: il tipo, quanti elementi (uno, al singolare), un elemento per riga col suo valore.
// - Il nome di una funzione chiamata in un blocco: prima che restituisca un valore lì il watch lo dice; dopo, i valori
//   dell'ultima azione di quel blocco, col numero della chiamata se sono più d'uno.
// - Il watch si chiude lasciando il nome e con Esc; fuori dall'esecuzione i nomi non si puntano. A esecuzione finita
//   c'è finché il progetto è quello eseguito: una modifica lo spegne, Annulla fino al progetto eseguito lo riaccende.
// - Il riquadro fermato da un clic sul nome: resta lasciando il nome, il clic non sceglie il blocco; ×, Esc, un altro
//   clic e «Ferma» lo chiudono. Il posto del riquadro (sotto il nome, o sopra se sotto c'è meno posto): la funzione,
//   con numeri dati.
// - Dalla tastiera: Maiusc+F9 sul blocco ferma il riquadro del primo dato col fuoco dentro, ripetuto passa al dato dopo;
//   Esc lo chiude e il fuoco torna al blocco; un blocco senza dati dà l'avviso.
//
// Che cosa NON guarda:
// - dove compare davvero il riquadro e che cosa copre, né che il puntatore vero arrivi sui nomi (la posizione dei nomi
//   si prova nel nucleo, `core/disegno/nomi.test.ts`; il puntatore e il riquadro nei motori, `e2e/watch.e2e.ts`);
// - il watch durante «tutto insieme» (fra due fette): solo a comando fermo;
// - i nomi nelle due lingue: gli operatori a parola cambiano, i nomi dei dati no (la traduzione per parole è provata
//   in `core/disegno/lingua.test.ts`).

import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { csvItalianoAtteso } from "../../core/esecuzione/atteso-del-riferimento";
import { apri } from "../../core/progetto/formato";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { postoDelRiquadro } from "./Watch";

const misura = (t: string) => [...t].length * 10;
const CARTELLA = new URL("../../casi/tappa-1/", import.meta.url);
const riferimento = readFileSync(new URL("riferimento-media-voti.algo", CARTELLA), "utf8");
const inputDelRiferimento = (() => {
  const r = apri(riferimento);
  if (!r.ok) throw new Error("il riferimento non si apre");
  return r.progetto.test_cases![0]!.inputs.map((i) => i.text);
})();

let datoAllAvvio = { percorso: "", testo: "" };
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return datoAllAvvio.percorso;
      case "leggi_progetto":
        if (argomenti.percorso !== datoAllAvvio.percorso) throw new Error("file non trovato");
        return datoAllAvvio.testo;
      case "elenca_esempi":
      case "elenca_librerie":
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [], gruppi: [] };
      case "segna_modificato":
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
beforeEach(() => cleanup());

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const istante = () => `${statoMostrato()} · ${document.querySelector('[role="log"]')?.childElementCount ?? 0}`;

async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

async function apriLaFinestra(nome: string, testo: string): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(it.apertoIl, { file: nome }));
}

async function premi(tasto: string, conMaiusc = false): Promise<void> {
  const prima = istante();
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: tasto, shiftKey: conMaiusc });
  });
  await aspetta(`l'effetto di ${tasto}`, () => istante() !== prima && !statoMostrato().startsWith(it.statoInCorso));
}

async function scrivi(testo: string): Promise<void> {
  const campo = document.activeElement;
  if (!(campo instanceof HTMLInputElement)) throw new Error("il fuoco non è nella riga della console");
  const prima = istante();
  await act(async () => {
    fireEvent.change(campo, { target: { value: testo } });
  });
  await act(async () => {
    fireEvent.keyDown(campo, { key: "Enter" });
  });
  await aspetta(`l'effetto del valore «${testo}»`, () => istante() !== prima && !statoMostrato().startsWith(it.statoInCorso));
}

/** I nomi dei dati nei blocchi: per ogni blocco, i dati nell'ordine in cui compaiono. */
function nomiNeiBlocchi(): Record<string, string[]> {
  const fuori: Record<string, string[]> = {};
  for (const n of document.querySelectorAll<SVGElement>("[data-blocco] [data-watch-dato]")) {
    const blocco = n.closest("[data-blocco]")!.getAttribute("data-blocco")!;
    (fuori[blocco] ??= []).push(n.getAttribute("data-watch-dato")!);
  }
  return fuori;
}
const nomi = () => [...document.querySelectorAll<SVGElement>("[data-blocco] [data-watch-dato]")];

async function punta(n: Element): Promise<void> {
  await act(async () => {
    fireEvent.pointerOver(n);
  });
}
async function lascia(n: Element): Promise<void> {
  await act(async () => {
    fireEvent.pointerOut(n);
  });
}

/** Il riquadro del watch come lo legge l'utente: nome, tipo e i valori (per un vettore, «v[0]=…» per elemento). */
function watch(): { nome: string; tipo: string; valori: string[]; nonInizializzate: number } | null {
  const w = document.querySelector('[role="tooltip"][data-watch]');
  if (!w) return null;
  const valori = [...w.querySelectorAll("[data-watch-valore]")].map((v) => {
    const indice = v.closest("[data-watch-elemento]")?.querySelector("[data-watch-indice]")?.textContent;
    return indice ? `${indice}=${v.textContent}` : (v.textContent ?? "");
  });
  return {
    nome: w.querySelector("[data-watch-nome]")?.textContent ?? "",
    tipo: w.querySelector("[data-watch-tipo]")?.textContent ?? "",
    valori,
    nonInizializzate: w.querySelectorAll("[data-watch-valore][data-non-inizializzata]").length,
  };
}

/** Il riferimento un passo alla volta fino alla fine, coi valori del caso; a ogni pausa `aOgniPausa`. */
async function riferimentoFinoAllaFine(aOgniPausa: (azione: number) => Promise<void>): Promise<number> {
  const input = [...inputDelRiferimento];
  let pause = 0;
  await premi("F10");
  for (;;) {
    const s = statoMostrato();
    const pausa = new RegExp(`^${riempi(it.statoInPausa, { n: "(\\d+)" })}$`).exec(s);
    const chiede = new RegExp(`^${riempi(it.statoChiede, { dato: "\\w+" })}$`).test(s);
    if (pausa) {
      pause++;
      await aOgniPausa(Number(pausa[1]));
      await premi("F10");
    } else if (chiede) await scrivi(input.shift()!);
    else if (s === it.statoFinita) return pause;
    else throw new Error(`stato inatteso: «${s}»`);
  }
}

// ------------------------------------------------------------------------------- i nomi nei blocchi

test("durante l'esecuzione i nomi dei dati nei blocchi del riferimento sono elementi col loro dato: 34, quelli attesi", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  // Fuori dall'esecuzione nessun nome si punta: non c'è un valore da mostrare.
  expect(nomi().length).toBe(0);
  await premi("F10");
  // Scritti a mano dal file: il testo di ogni blocco, i dati nell'ordine in cui compaiono.
  const attesi: Record<string, string[]> = {
    b2: ["n", "n"],
    b3: ["n"],
    b4: ["n", "n"],
    b6: ["i"],
    b7: ["i", "n"],
    b8: ["voto"],
    b9: ["voto", "voto"],
    b10: ["somma", "somma", "voto"],
    b11: ["contati", "contati"],
    b12: ["voto"],
    b13: ["insufficienti", "insufficienti"],
    b14: ["voto"],
    b15: ["i", "i"],
    b16: ["contati"],
    b17: ["media", "somma", "contati"],
    // «insufficienti» c'è anche dentro il testo scritto: lì non è un nome.
    b18: ["media", "contati", "insufficienti"],
    b19: ["j", "somma", "contati"],
    b21: ["j", "j"],
  };
  expect(nomiNeiBlocchi()).toEqual(attesi);
  expect(nomi().length).toBe(34);
  // «Ferma»: i nomi non si puntano più.
  await premi("F5", true);
  expect(nomi().length).toBe(0);
}, 60_000);

// ---------------------------------------------------------------------- il watch a ogni pausa

test("a ogni pausa del riferimento il watch di ogni dato ha il tipo della vista dei dati e il valore della riga corrente: 8 dati × 66 righe dall'atteso scritto a mano", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  const intestazione = csvItalianoAtteso[0]!.split(";");
  const righe = csvItalianoAtteso.slice(1).map((r) => r.split(";"));
  // Le colonne dei valori: «n (intero)» … «j (intero)», dopo «#» e «Regola». Nessuna cella di un valore ha il «;».
  const colonne = intestazione.slice(2, 10).map((t, k) => {
    const [, nome, tipo] = /^(\w+) \((\w+)\)$/.exec(t)!;
    return { nome: nome!, tipo: tipo!, indice: k + 2 };
  });
  const sbagliati: string[] = [];
  let confrontati = 0;
  let nonInizializzate = 0;
  const guarda = async (quando: string, numero: number) => {
    for (const c of colonne) {
      const n = nomi().find((x) => x.getAttribute("data-watch-dato") === c.nome);
      if (!n) {
        sbagliati.push(`${quando}: «${c.nome}» non c'è nel disegno`);
        continue;
      }
      await punta(n);
      const visto = watch();
      const atteso = { nome: c.nome, tipo: c.tipo, valori: [righe[numero]![c.indice]!], nonInizializzate: righe[numero]![c.indice] === it.tracciaNonInizializzata ? 1 : 0 };
      if (JSON.stringify(visto) !== JSON.stringify(atteso)) sbagliati.push(`${quando}: ${JSON.stringify(visto)} invece di ${JSON.stringify(atteso)}`);
      confrontati++;
      nonInizializzate += atteso.nonInizializzate;
      await lascia(n);
    }
  };
  // In pausa sull'azione k la riga corrente è la k - 1 (la 0 alla prima pausa): i valori dopo l'azione di prima.
  const pause = await riferimentoFinoAllaFine((k) => guarda(`pausa ${k}`, k - 1));
  // A esecuzione finita la colonna resta, e il watch mostra i valori finali.
  await guarda("fine", 65);
  expect({ pause, sbagliati: sbagliati.slice(0, 10), quanti: sbagliati.length }).toEqual({ pause: 65, sbagliati: [], quanti: 0 });
  expect(confrontati).toBe(8 * 66);
  // Controllo positivo della premessa: «non inizializzata» è stata confrontata (n, voto e media all'inizio).
  console.log(`watch confrontati: ${confrontati}, di cui «non inizializzata» ${nonInizializzate}`);
  expect(nonInizializzate).toBeGreaterThan(0);
}, 120_000);

// ------------------------------------------------------------------------------------- un vettore

test("un vettore: il tipo, quanti elementi, un elemento per riga col suo valore", async () => {
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "vettore" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "v", type: "integer", size: 3 },
          { name: "r", type: "real", initial: "-0.5" },
        ],
        body: [
          { id: "b1", kind: "assignment", target: "v[1]", value: "7" },
          { id: "b2", kind: "assignment", target: "r", value: "v[1] / 2" },
        ],
        end: { id: "fine" },
      },
    ],
  });
  await apriLaFinestra("vettore.algo", testo);
  await premi("F10");
  await premi("F10");
  await premi("F10");
  // In pausa prima di «r ← v[1] / 2» (dopo il valore iniziale di r e «v[1] ← 7»): v[1] vale 7, gli altri non hanno un
  // valore.
  expect(nomiNeiBlocchi()).toEqual({ b1: ["v"], b2: ["r", "v"] });
  const v = nomi().find((n) => n.getAttribute("data-watch-dato") === "v")!;
  await punta(v);
  expect(watch()).toEqual({ nome: "v", tipo: "intero", valori: ["v[0]=non inizializzata", "v[1]=7", "v[2]=non inizializzata"], nonInizializzate: 2 });
  expect(document.querySelector("[data-watch-elementi]")?.textContent).toBe(riempi(it.watchElementi, { n: "3" }));
  await lascia(v);
  const r = nomi().find((n) => n.getAttribute("data-watch-dato") === "r")!;
  await punta(r);
  expect(watch()).toEqual({ nome: "r", tipo: "reale", valori: ["-0,50"], nonInizializzate: 0 });
}, 60_000);

test("il nome di una funzione chiamata nel blocco: prima che restituisca un valore lo dice; dopo, ogni valore dell'azione col numero della chiamata", async () => {
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "due chiamate" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "m", type: "integer" }],
        body: [
          { id: "b1", kind: "assignment", target: "m", value: "massimo(3, 8) + massimo(5, 2)" },
          { id: "b2", kind: "write", values: ["massimo(m, 1)"], newline: true },
        ],
        end: { id: "fine" },
      },
      {
        id: "f2",
        kind: "function",
        name: "massimo",
        return_type: "integer",
        data: [
          { name: "a", type: "integer", parameter: "value" },
          { name: "b", type: "integer", parameter: "value" },
          { name: "r", type: "integer" },
        ],
        body: [{ id: "b3", kind: "if", condition: "a > b", then: [{ id: "b4", kind: "assignment", target: "r", value: "a" }], else: [{ id: "b5", kind: "assignment", target: "r", value: "b" }] }],
        end: { id: "b6", return_value: "r" },
      },
    ],
  });
  await apriLaFinestra("due-chiamate.algo", testo);
  await premi("F10");
  // In pausa prima di b1: i due nomi «massimo» di b1 e quello di b2 sono chiamate, non dati.
  const funzioni = () => [...document.querySelectorAll<SVGElement>("[data-blocco] [data-watch-funzione]")].map((n) => [n.closest("[data-blocco]")!.getAttribute("data-blocco"), n.getAttribute("data-watch-funzione")]);
  expect(funzioni()).toEqual([
    ["b1", "massimo"],
    ["b1", "massimo"],
    ["b2", "massimo"],
  ]);
  const chiamate = () => [...document.querySelectorAll<SVGElement>("[data-blocco] [data-watch-funzione]")];
  const testoDelWatch = () => {
    const w = document.querySelector('[role="tooltip"][data-watch]');
    return w === null ? null : [...w.querySelectorAll("[data-watch-nome], [data-watch-tipo], [data-watch-chiamata], [data-watch-non-chiamata]")].map((x) => x.textContent);
  };
  await punta(chiamate()[0]!);
  expect(testoDelWatch()).toEqual(["massimo(…)", "intero", it.watchNonChiamata]);
  await lascia(chiamate()[0]!);
  /** Il watch di ognuno dei tre nomi, nell'ordine. */
  const deiTre = async () => {
    const visti: (string | null)[][] = [];
    for (const k of [0, 1, 2]) {
      await punta(chiamate()[k]!);
      visti.push(testoDelWatch() ?? [null]);
      await lascia(chiamate()[k]!);
    }
    return visti;
  };
  const nessuna = ["massimo(…)", "intero", it.watchNonChiamata];
  const tutteEDue = ["massimo(…)", "intero", `${riempi(it.watchChiamataNumero, { n: "1" })}8`, `${riempi(it.watchChiamataNumero, { n: "2" })}5`];
  // Passo dopo passo: la ripresa di b1 dopo la prima chiamata (il valore appena restituito c'è già, senza il numero), dopo
  // la seconda (tutte e due, nell'ordine in cui sono finite), poi b2 (quello di b2 non è ancora finito), poi la sua ripresa.
  await premi("F10");
  await aspetta("la ripresa dopo la prima chiamata", () => avviso().startsWith(riempi(it.annuncioRipresa, { funzione: "massimo", valore: "8", blocco: "", n: "" }).split("«»")[0]!));
  expect(await deiTre()).toEqual([["massimo(…)", "intero", "8"], ["massimo(…)", "intero", "8"], nessuna]);
  await premi("F10");
  await aspetta("la ripresa dopo la seconda chiamata", () => avviso().startsWith(riempi(it.annuncioRipresa, { funzione: "massimo", valore: "5", blocco: "", n: "" }).split("«»")[0]!));
  expect(await deiTre()).toEqual([tutteEDue, tutteEDue, nessuna]);
  await premi("F10");
  await aspetta("la scrittura", () => avviso().startsWith(riempi(it.annuncioPausa, { blocco: "", n: "" }).split("«»")[0]!));
  expect(await deiTre()).toEqual([tutteEDue, tutteEDue, nessuna]);
  await premi("F10");
  // Una chiamata sola: il valore senza il numero.
  await aspetta("la ripresa della scrittura", () => avviso().startsWith(riempi(it.annuncioRipresa, { funzione: "massimo", valore: "13", blocco: "", n: "" }).split("«»")[0]!));
  expect(await deiTre()).toEqual([tutteEDue, tutteEDue, ["massimo(…)", "intero", "13"]]);
}, 60_000);

test("un vettore di un elemento: «1 elemento», al singolare", async () => {
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "uno" },
    functions: [{ id: "f1", kind: "main", data: [{ name: "v", type: "integer", size: 1 }], body: [{ id: "b1", kind: "assignment", target: "v[0]", value: "7" }], end: { id: "fine" } }],
  });
  await apriLaFinestra("uno.algo", testo);
  await premi("F10");
  await punta(nomi().find((n) => n.getAttribute("data-watch-dato") === "v")!);
  expect(watch()?.valori).toEqual(["v[0]=non inizializzata"]);
  expect(document.querySelector("[data-watch-elementi]")?.textContent).toBe(it.watchElemento);
}, 60_000);

test("a esecuzione finita il watch c'è finché il progetto è quello eseguito: una modifica lo spegne, Annulla lo riaccende", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  await riferimentoFinoAllaFine(async () => {});
  // Controllo positivo: a esecuzione finita, col progetto eseguito, i nomi si puntano.
  expect(nomi().length).toBe(34);
  // Una modifica: il blocco «i ← 0» scelto e tolto con Canc.
  const b6 = document.querySelector('[data-blocco="b6"]')!;
  await act(async () => {
    fireEvent.click(b6);
  });
  await act(async () => {
    fireEvent.keyDown(b6, { key: "Delete" });
  });
  await giro();
  expect(document.querySelector('[data-blocco="b6"]')?.outerHTML ?? null).toBeNull();
  expect(nomi().length).toBe(0);
  // Annulla riporta il progetto eseguito, e il watch torna.
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
  });
  await giro();
  expect(nomi().length).toBe(34);
}, 120_000);

// ------------------------------------------------------------------------------- come si chiude

test("un clic sul nome ferma il riquadro: resta lasciando il nome, segue l'esecuzione, non sceglie il blocco; ×, Esc, un altro clic e «Ferma» lo chiudono", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  const input = [...inputDelRiferimento];
  await premi("F10");
  const fermo = () => document.querySelector("[data-watch][data-watch-fermo]");
  const valoriDelFermo = () => [...(fermo()?.querySelectorAll("[data-watch-valore]") ?? [])].map((v) => v.textContent);
  const iIn = () => nomi().find((x) => x.getAttribute("data-watch-dato") === "i" && x.closest('[data-blocco="b7"]'))!;
  const clic = async (n: Element) => {
    await act(async () => {
      fireEvent.mouseDown(n);
      fireEvent.click(n);
    });
  };
  await punta(iIn());
  await clic(iIn());
  await lascia(iIn());
  expect({ fermo: fermo()?.getAttribute("role"), valori: valoriDelFermo(), scelto: document.querySelector('[data-blocco="b7"]')?.getAttribute("aria-pressed") }).toEqual({
    fermo: "dialog",
    valori: ["non inizializzata"],
    scelto: "false",
  });
  // Avanti fino a dopo «i ← 0»: il riquadro fermo segue la riga corrente.
  for (let k = 0; k < 40 && valoriDelFermo()[0] !== "0"; k++) {
    if (new RegExp(`^${riempi(it.statoChiede, { dato: "\\w+" })}$`).test(statoMostrato())) await scrivi(input.shift()!);
    else await premi("F10");
  }
  expect(valoriDelFermo()).toEqual(["0"]);
  expect(fermo()).not.toBeNull();
  // ×.
  await act(async () => {
    fireEvent.click(fermo()!.querySelector(`button[aria-label="${it.chiudiEsc}"]`)!);
  });
  expect(fermo()?.outerHTML ?? null).toBeNull();
  // Esc.
  await clic(iIn());
  expect(fermo()).not.toBeNull();
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "Escape" });
  });
  expect(fermo()?.outerHTML ?? null).toBeNull();
  // Un altro clic sullo stesso nome; il clic su un altro nome ferma quello.
  await clic(iIn());
  await clic(iIn());
  expect(fermo()?.outerHTML ?? null).toBeNull();
  await clic(iIn());
  const n = nomi().find((x) => x.getAttribute("data-watch-dato") === "n")!;
  await clic(n);
  expect(document.querySelectorAll("[data-watch-fermo]").length).toBe(1);
  expect(fermo()?.querySelector("[data-watch-nome]")?.textContent).toBe("n");
  // «Ferma» l'esecuzione: il riquadro fermo si chiude.
  await premi("F5", true);
  expect(fermo()?.outerHTML ?? null).toBeNull();
}, 60_000);

test("dalla tastiera: Maiusc+F9 su un blocco ferma il riquadro del suo primo dato col fuoco dentro, di nuovo passa al dato dopo; Esc lo chiude e il fuoco torna al blocco", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  await premi("F10");
  const fermo = () => document.querySelector<HTMLElement>("[data-watch][data-watch-fermo]");
  const b7 = document.querySelector<SVGGElement>('[data-blocco="b7"]')!;
  // Il tasto è scritto sul blocco per gli ausili, solo dove ci sono nomi.
  expect([b7.getAttribute("aria-keyshortcuts"), document.querySelector('[data-blocco="b5"]')?.getAttribute("aria-keyshortcuts") ?? null]).toEqual(["Shift+F9", null]);
  const maiuscF9 = async (dove: Element) => {
    await act(async () => {
      fireEvent.keyDown(dove, { key: "F9", shiftKey: true });
    });
    await giro();
  };
  /** Il dato del riquadro fermo, se il fuoco ci sta dentro, e la sua descrizione per gli ausili. */
  const conIlFuoco = () => {
    const f = fermo();
    return { nome: f?.querySelector("[data-watch-nome]")?.textContent ?? null, fuocoDentro: f !== null && f.contains(document.activeElement), descrizione: f ? document.getElementById(f.getAttribute("aria-describedby") ?? "")?.textContent : null };
  };
  act(() => b7.focus());
  await maiuscF9(b7);
  expect(conIlFuoco()).toEqual({ nome: "i", fuocoDentro: true, descrizione: it.watchDaTastiera });
  // Il punto di interruzione non cambia: Maiusc+F9 non è F9.
  expect(document.querySelectorAll("[data-interruzione]").length).toBe(0);
  await maiuscF9(fermo()!);
  expect(conIlFuoco()).toEqual({ nome: "n", fuocoDentro: true, descrizione: it.watchDaTastiera });
  // Dopo l'ultimo nome del blocco si torna al primo.
  await maiuscF9(fermo()!);
  expect(conIlFuoco().nome).toBe("i");
  // Un nome scritto due volte nel blocco («somma ← somma + voto») è un dato solo: il secondo Maiusc+F9 passa a «voto».
  const b10 = document.querySelector<SVGGElement>('[data-blocco="b10"]')!;
  expect(b10.querySelectorAll('[data-watch-dato="somma"]').length).toBe(2);
  act(() => b10.focus());
  await maiuscF9(b10);
  expect(conIlFuoco().nome).toBe("somma");
  await maiuscF9(fermo()!);
  expect(conIlFuoco().nome).toBe("voto");
  await act(async () => {
    fireEvent.keyDown(fermo()!, { key: "Escape" });
  });
  await giro();
  act(() => b7.focus());
  await maiuscF9(b7);
  expect(conIlFuoco().nome).toBe("i");
  await act(async () => {
    fireEvent.keyDown(fermo()!, { key: "Escape" });
  });
  await giro();
  expect({ fermo: fermo()?.outerHTML ?? null, fuoco: document.activeElement === b7 }).toEqual({ fermo: null, fuoco: true });
  // Un blocco senza dati: l'avviso, nessun riquadro.
  const b5 = document.querySelector<SVGGElement>('[data-blocco="b5"]')!;
  act(() => b5.focus());
  await maiuscF9(b5);
  expect({ fermo: fermo()?.outerHTML ?? null, avviso: avviso() }).toEqual({ fermo: null, avviso: it.watchSenzaDati });
  // Aperto col clic, il riquadro resta quello del puntatore del mouse: il fuoco non ci va.
  const iIn = nomi().find((x) => x.getAttribute("data-watch-dato") === "i" && x.closest('[data-blocco="b7"]'))!;
  await act(async () => {
    fireEvent.mouseDown(iIn);
    fireEvent.click(iIn);
  });
  expect({ nome: fermo()?.querySelector("[data-watch-nome]")?.textContent, tabindex: fermo()?.getAttribute("tabindex") ?? null, descrizione: fermo()?.getAttribute("aria-describedby") ?? null }).toEqual({ nome: "i", tabindex: null, descrizione: null });
}, 60_000);

test("il posto del riquadro: sotto il nome se ci sta, altrimenti dalla parte col posto maggiore, mai sopra il nome", () => {
  const finestra = { larghezza: 1000, altezza: 800 };
  const copre = (nome: { top: number; bottom: number }, p: { top: number; maxHeight: number }) => p.top < nome.bottom && nome.top < p.top + p.maxHeight;
  const casi = [
    { nome: { left: 100, top: 100, bottom: 120 }, altezza: 300, atteso: "sotto" },
    { nome: { left: 100, top: 600, bottom: 620 }, altezza: 300, atteso: "sopra" },
    { nome: { left: 100, top: 300, bottom: 320 }, altezza: 700, atteso: "sotto" },
    { nome: { left: 100, top: 500, bottom: 520 }, altezza: 700, atteso: "sopra" },
    { nome: { left: 990, top: 100, bottom: 120 }, altezza: 50, atteso: "sotto" },
  ];
  const visti = casi.map((c) => {
    const p = postoDelRiquadro(c.nome, { larghezza: 200, altezza: c.altezza }, finestra);
    return { dove: p.top >= c.nome.bottom ? "sotto" : "sopra", copre: copre(c.nome, p), dentro: p.top >= 0 && p.top + p.maxHeight <= finestra.altezza && p.left >= 0 && p.left + 200 <= finestra.larghezza };
  });
  expect(visti).toEqual(casi.map((c) => ({ dove: c.atteso, copre: false, dentro: true })));
  // Il nome sotto il bordo della finestra (la finestra abbassata col riquadro fermo aperto): il riquadro resta dentro.
  const fuori = postoDelRiquadro({ left: 100, top: 900, bottom: 920 }, { larghezza: 200, altezza: 300 }, finestra);
  expect(fuori.top >= 0 && fuori.top + fuori.maxHeight <= finestra.altezza).toBe(true);
});

test("il watch si chiude lasciando il nome e con Esc, e torna puntando di nuovo", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  await premi("F10");
  const n = nomi()[0]!;
  await punta(n);
  expect(watch()?.nome).toBe("n");
  await lascia(n);
  expect(watch()).toBeNull();
  await punta(n);
  expect(watch()?.nome).toBe("n");
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "Escape" });
  });
  expect(watch()).toBeNull();
  await lascia(n);
  await punta(n);
  expect(watch()?.nome).toBe("n");
}, 60_000);
