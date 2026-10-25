// La ricorsione nella finestra, sotto happy-dom: la finestra vera (`Applicazione`), col file dato all'avvio da un guscio
// simulato, e i tasti e i clic come li dà l'utente.
//
// - «Dove sei» da solo: fino a 7 livelli tutti i nomi; oltre, i primi due e gli ultimi tre, e fra loro «… N chiamate …»,
//   che apre l'elenco delle altre, ognuna col suo livello; una voce mostra il suo livello.
// - `conta(9)`, dieci chiamate in corso, in pausa sul caso che smette: «Dove sei» col principio e la fine; il gruppo di
//   `conta` nella riga corrente della tabella con la chiamata più profonda; il watch di `n` con la riga del livello; scelto
//   il livello 3 dall'elenco, il watch mostra quella chiamata, finché un passo non torna alla più profonda.
// - Il dato dietro un riferimento lo dice il nucleo (`origini`), mai i nomi: il watch di un parametro che riceve un dato
//   di una funzione con più chiamate in corso ne dice il livello; la lettura in un parametro per riferimento nomina il
//   dato vero anche quando una funzione in mezzo ha un dato con lo stesso nome (dedotto dai nomi sarebbe il suo).
// - I giri della ricorsione nell'elenco delle procedure e delle funzioni e nella riga di stato: la prima frase e quante
//   altre, e l'elenco a richiesta.
// - Le righe delle chiamate nel codice: con dieci chiamate dallo stesso blocco, una volta sola, con lo sfondo del livello
//   più profondo; un `per` che chiama dai suoi limiti accende solo la riga della sua partenza.
//
// Che cosa NON guarda:
// - le 500 chiamate, la risposta della finestra e i disegni contati (nei motori: `e2e/pila-lunga.e2e.ts`,
//   `e2e/fluida.e2e.ts`);
// - le righe della tabella livello per livello (il nucleo: `core/esecuzione/traccia.test.ts`).

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";
import { DoveSei, type LivelloMostrato } from "./DoveSei";

const misura = (t: string) => [...t].length * 10;
const PARI_E_DISPARI = readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-4", "pari-e-dispari.algo"), "utf8");

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
afterEach(() => cleanup());

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}
async function apriLaFinestra(testo: string, nome = "ricorsione.algo"): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(testi.apertoIl, { file: nome }));
}
const clic = (e: Element | null, cosa: string) => {
  if (!e) throw new Error(`non c'è: ${cosa}`);
  return act(async () => void fireEvent.click(e));
};
const premi = (key: string) => act(async () => void fireEvent.keyDown(document.body, { key }));
const inPausa = () => statoMostrato().startsWith(riempi(testi.statoInPausa, { n: "" }));
async function eDopo(key: string): Promise<void> {
  const prima = statoMostrato();
  await premi(key);
  await aspetta(`la fermata dopo ${key}`, () => statoMostrato() !== prima && statoMostrato() !== testi.statoInCorso);
  await giro();
}
/** Il watch di un nome in un blocco: il nome, il valore, la riga del livello e quella del riferimento. */
async function watchDi(dove: string, dato: string): Promise<string> {
  const n = document.querySelector(`${dove} [data-watch-dato="${dato}"]`);
  if (!n) return `nessun nome «${dato}» in ${dove}`;
  await act(async () => void fireEvent.pointerOver(n));
  await giro();
  const w = document.querySelector("[data-watch]");
  const testo = w ? [...w.querySelectorAll("[data-watch-nome], [data-watch-valore], [data-watch-livello], [data-watch-riferimento]")].map((e) => e.textContent).join(" | ") : "nessun watch";
  await act(async () => void fireEvent.pointerOut(n));
  await giro();
  return testo;
}
const doveSei = () => [...document.querySelectorAll("[data-dove-sei] button")].map((b) => `${b.textContent}${b.getAttribute("aria-current") ? "*" : ""}`);
const scheda = () => document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda");
const P = testi.schedaPrincipale;

// ---------------------------------------------------------------------------------- «Dove sei» da solo

test("«Dove sei»: fino a 7 livelli tutti; oltre, il principio, «… N chiamate …» e la fine; l'elenco col livello di ognuna", async () => {
  const livelli = (n: number): LivelloMostrato[] => Array.from({ length: n }, (_, i) => ({ nome: i === 0 ? P : `f${i}`, funzione: `id${i}`, blocco: `b${i}` }));
  const mostrati: number[] = [];
  const disegna = (n: number) => act(async () => void render(<DoveSei livelli={livelli(n)} mostra={(i) => mostrati.push(i)} testi={testi} />));
  await disegna(7);
  expect(doveSei()).toEqual([P, "f1", "f2", "f3", "f4", "f5", "f6*"]);
  cleanup();
  await disegna(8);
  expect(doveSei()).toEqual([P, "f1", riempi(testi.doveSeiNascoste, { n: "3" }), "f5", "f6", "f7*"]);
  const nascoste = document.querySelector("[data-dove-sei] [data-nascosti]");
  expect(nascoste?.getAttribute("title")).toBe(riempi(testi.doveSeiNascosteSuggerimento, { n: "3" }));
  await clic(nascoste, "le chiamate nascoste");
  const menu = document.querySelector(`[role="menu"][aria-label="${testi.doveSeiElenco}"]`);
  expect([...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map((v) => v.textContent)).toEqual([2, 3, 4].map((l) => riempi(testi.doveSeiVoce, { livello: String(l), nome: `f${l}` })));
  await clic(menu!.querySelector('[data-voce="3"]'), "la voce del livello 3");
  expect(mostrati).toEqual([3]);
  expect(document.querySelector('[role="menu"]')?.outerHTML ?? null).toBeNull();
  // Esc chiude l'elenco e riporta il fuoco al pulsante che lo apre, l'unico modo di riaprirlo.
  await clic(document.querySelector("[data-dove-sei] [data-nascosti]"), "le chiamate nascoste");
  await act(async () => void fireEvent.keyDown(document.querySelector('[role="menu"]')!, { key: "Escape" }));
  expect([document.querySelector('[role="menu"]')?.outerHTML ?? null, document.activeElement === document.querySelector("[data-dove-sei] [data-nascosti]")]).toEqual([null, true]);
  cleanup();
  await disegna(501);
  expect(doveSei()).toEqual([P, "f1", riempi(testi.doveSeiNascoste, { n: "496" }), "f498", "f499", "f500*"]);
});

// ---------------------------------------------------------------------------------- dieci chiamate in corso

/** `conta(n)`: dà 0 se `n` è 0, altrimenti `conta(n - 1) + 1`; il punto di interruzione sul caso che smette. */
const conta = (n: number) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "conta" },
    functions: [
      { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "r", value: `conta(${n})` }, { id: "b2", kind: "write", values: ["r"], newline: true }], end: { id: "b3" } },
      {
        id: "f2",
        kind: "function",
        name: "conta",
        return_type: "integer",
        data: [
          { name: "n", type: "integer", parameter: "value" },
          { name: "s", type: "integer" },
        ],
        body: [
          {
            id: "b4",
            kind: "if",
            condition: "n == 0",
            then: [{ id: "b5", kind: "assignment", target: "s", value: "0", breakpoint: true }],
            else: [{ id: "b6", kind: "assignment", target: "s", value: "conta(n - 1) + 1" }],
          },
        ],
        end: { id: "b7", return_value: "s" },
      },
    ],
  });

test("dieci chiamate in corso: «Dove sei», il gruppo della tabella e il watch sulla chiamata giusta; il livello scelto nel watch", async () => {
  await apriLaFinestra(conta(9));
  await premi("F5");
  await aspetta("la pausa sul caso che smette", inPausa);
  await giro();
  expect(scheda()).toBe("f2");
  expect(doveSei()).toEqual([P, "conta", riempi(testi.doveSeiNascoste, { n: "6" }), "conta", "conta", "conta*"]);
  // La riga corrente: il numero, la regola, r, la condizione e lo scritto, poi n e s della chiamata più profonda.
  const corrente = [...document.querySelectorAll('table[data-traccia] tr[aria-current="true"] td')].map((c) => c.textContent);
  expect([corrente[2], corrente[5], corrente[6]]).toEqual([testi.tracciaNonInizializzata, "0", testi.tracciaNonInizializzata]);
  const livello = (di: number) => riempi(testi.watchLivello, { di: String(di), su: "10" });
  expect(await watchDi('[data-blocco="b4"]', "n")).toBe(`n | 0 | ${livello(10)}`);
  // Il livello 3 dall'elenco: la sua chiamata, `conta(7)`.
  await clic(document.querySelector("[data-dove-sei] [data-nascosti]"), "le chiamate nascoste");
  await clic(document.querySelector('[role="menu"] [data-voce="3"]'), "la voce del livello 3");
  await giro();
  expect(scheda()).toBe("f2");
  expect(await watchDi('[data-blocco="b4"]', "n")).toBe(`n | 7 | ${livello(3)}`);
  // Un passo: di nuovo la più profonda (la fine della chiamata del livello 10).
  await eDopo("F10");
  expect(await watchDi('[data-blocco="b4"]', "n")).toBe(`n | 0 | ${livello(10)}`);
  // Di nuovo il livello 3, poi Esci: la fermata sulla ripresa del livello 9 non è un'azione (il numero delle azioni
  // resta), ma è una fermata nuova: il watch torna alla chiamata più profonda.
  await clic(document.querySelector("[data-dove-sei] [data-nascosti]"), "le chiamate nascoste");
  await clic(document.querySelector('[role="menu"] [data-voce="3"]'), "la voce del livello 3");
  await giro();
  expect(await watchDi('[data-blocco="b4"]', "n")).toBe(`n | 7 | ${livello(3)}`);
  // La riga di stato resta la stessa (il numero delle azioni non cambia): cambia l'avviso, con la frase della ripresa.
  const prima = avviso();
  await act(async () => void fireEvent.keyDown(document.body, { key: "F11", shiftKey: true }));
  await aspetta("la pausa sulla ripresa", () => avviso() !== prima && inPausa());
  await giro();
  expect(await watchDi('[data-blocco="b4"]', "n")).toBe(`n | 1 | ${riempi(testi.watchLivello, { di: "9", su: "9" })}`);
}, 60_000);

// ---------------------------------------------------------------------------------- il dato dietro un riferimento

const procedura = (id: string, name: string, data: unknown[], body: unknown[]) => ({ id, kind: "procedure", name, data, body, end: { id: `${id}-fine` } });

test("il watch di un parametro che riceve il dato di una funzione con più chiamate in corso ne dice il livello", async () => {
  // `scendi(n)` richiama sé stessa fino a 0, poi passa il suo `x` per riferimento ad `aumenta`.
  await apriLaFinestra(
    JSON.stringify({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "riferimento" },
      functions: [
        { id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "call", callee: "scendi", arguments: ["2"] }], end: { id: "b2" } },
        procedura("f2", "scendi", [{ name: "n", type: "integer", parameter: "value" }, { name: "x", type: "integer", initial: "0" }], [
          { id: "b3", kind: "if", condition: "n > 0", then: [{ id: "b4", kind: "call", callee: "scendi", arguments: ["n - 1"] }], else: [] },
          { id: "b5", kind: "call", callee: "aumenta", arguments: ["x"] },
        ]),
        procedura("f3", "aumenta", [{ name: "y", type: "integer", parameter: "reference" }], [{ id: "b6", kind: "assignment", target: "y", value: "y + 1", breakpoint: true }]),
      ],
    }),
  );
  await premi("F5");
  await aspetta("la pausa in aumenta", inPausa);
  await giro();
  expect(doveSei()).toEqual([P, "scendi", "scendi", "scendi", "aumenta*"]);
  expect(await watchDi('[data-blocco="b6"]', "y")).toBe(`y | 0 | ${riempi(testi.watchRiferimentoLivello, { dato: "x", funzione: "scendi", livello: "3" })}`);
}, 60_000);

test("la lettura in un parametro per riferimento nomina il dato vero, anche se una funzione in mezzo ha un dato con lo stesso nome", async () => {
  // Il programma passa il suo `n` ad `a(rif m)`, che ha un suo `n` e passa `m` a `leggi(rif v)`, che legge `v`. Dedotto dai
  // nomi (la funzione più vicina, sotto nella pila, con un dato `n`) sarebbe il `n` di `a`: lo dice il nucleo, è quello
  // del programma.
  await apriLaFinestra(
    JSON.stringify({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "lettura" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "n", type: "integer", initial: "0" }], body: [{ id: "b1", kind: "call", callee: "a", arguments: ["n"] }, { id: "b2", kind: "write", values: ["n"], newline: true }], end: { id: "b3" } },
        procedura("f2", "a", [{ name: "m", type: "integer", parameter: "reference" }, { name: "n", type: "integer", initial: "5" }], [{ id: "b4", kind: "call", callee: "leggi", arguments: ["m"] }, { id: "b5", kind: "write", values: ["n"], newline: true }]),
        procedura("f3", "leggi", [{ name: "v", type: "integer", parameter: "reference" }], [{ id: "b6", kind: "read", target: "v" }]),
      ],
    }),
  );
  await premi("F5");
  await aspetta("la lettura", () => statoMostrato().startsWith(riempi(testi.statoChiede, { dato: "" }).trimEnd().slice(0, 5)) && document.querySelector("[data-lettura-di]") !== null);
  expect(document.querySelector("[data-lettura-di]")?.textContent).toBe(riempi(testi.watchRiferimento, { dato: "n", funzione: P }));
}, 60_000);

// ---------------------------------------------------------------------------------- i giri della ricorsione

test("i giri della ricorsione nell'elenco delle procedure e delle funzioni e nella riga di stato", async () => {
  await apriLaFinestra(PARI_E_DISPARI);
  const frase = "La funzione «pari» chiama «dispari», che chiama di nuovo «pari»";
  expect(document.querySelector("[data-ricorsione]")?.textContent).toBe(frase);
  await clic(document.querySelector("[data-elenco-funzioni]"), "l'elenco delle procedure e delle funzioni");
  await giro();
  // L'elenco in ordine alfabetico: «dispari» (f3), poi «pari» (f2).
  expect([...document.querySelectorAll("[data-voce-funzione]")].map((v) => `${v.getAttribute("data-voce-funzione")}: ${v.querySelector("[data-giro]")?.textContent}`)).toEqual([
    `f3: ${frase}`,
    `f2: ${frase}`,
  ]);
  cleanup();
  // Una sola ricorsione: la frase, senza il comando che apre l'elenco.
  expect(comandoDelleRicorsioni()).toBeNull();
  cleanup();
  // Senza ricorsione, nessuna delle due.
  await apriLaFinestra(conta(0).replace('"conta(n - 1) + 1"', '"n + 1"'));
  expect(document.querySelector("[data-ricorsione]")?.outerHTML ?? null).toBeNull();
}, 60_000);

/** Un programma che chiama `nomi.length` funzioni, ognuna delle quali chiama sé stessa fino a 0. */
const ricorsive = (nomi: readonly string[]) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "ricorsive" },
    functions: [
      { id: "f0", kind: "main", data: [{ name: "t", type: "integer", initial: "0" }], body: nomi.map((nome, k) => ({ id: `m${k}`, kind: "assignment", target: "t", value: `t + ${nome}(3)` })), end: { id: "mf" } },
      ...nomi.map((nome, k) => ({
        id: `f${k + 1}`,
        kind: "function",
        name: nome,
        return_type: "integer",
        data: [
          { name: "n", type: "integer", parameter: "value" },
          { name: "r", type: "integer" },
        ],
        body: [{ id: `c${k}a`, kind: "if", condition: "n <= 0", then: [{ id: `c${k}b`, kind: "assignment", target: "r", value: "0" }], else: [{ id: `c${k}c`, kind: "assignment", target: "r", value: `${nome}(n - 1) + 1` }] }],
        end: { id: `c${k}d`, return_value: "r" },
      })),
    ],
  });
const comandoDelleRicorsioni = () => [...document.querySelectorAll("button")].find((b) => b.textContent === testi.ricorsioniMostra || b.textContent === testi.ricorsioniNascondi) ?? null;

test("con più ricorsioni la riga di stato dice la prima e quante altre, e l'elenco a richiesta le dice tutte", async () => {
  const frase = (nome: string) => `La funzione «${nome}» chiama sé stessa`;
  await apriLaFinestra(ricorsive(["conta", "somma"]));
  expect(document.querySelector("[data-ricorsione]")?.textContent).toBe(`${frase("conta")}${testi.ricorsioneUnAltra}`);
  cleanup();
  await apriLaFinestra(ricorsive(["conta", "somma", "potenza", "cifre"]));
  expect(document.querySelector("[data-ricorsione]")?.textContent).toBe(`${frase("conta")}${riempi(testi.ricorsioniAltre, { n: "3" })}`);
  // Il testo intero della prima frase anche sotto il puntatore del mouse, quando è tagliata.
  expect(document.querySelector("[data-ricorsione]")?.getAttribute("title")).toBe(frase("conta"));
  const elenco = () => document.querySelector<HTMLElement>("[data-ricorsioni]")!;
  expect(elenco().hidden).toBe(true);
  await clic(comandoDelleRicorsioni(), "«Mostra le ricorsioni»");
  expect({ aperto: !elenco().hidden, nome: elenco().getAttribute("aria-label"), comando: comandoDelleRicorsioni()?.textContent, voci: [...elenco().querySelectorAll("li")].map((l) => l.textContent) }).toEqual({
    aperto: true,
    nome: testi.elencoDelleRicorsioni,
    comando: testi.ricorsioniNascondi,
    voci: ["conta", "somma", "potenza", "cifre"].map(frase),
  });
  await clic(comandoDelleRicorsioni(), "«Nascondi le ricorsioni»");
  expect(elenco().hidden).toBe(true);
}, 60_000);

// ---------------------------------------------------------------------------------- le righe delle chiamate nel codice

const regione = () => document.querySelector<HTMLElement>(`section[aria-label="${testi.codiceGenerato}"]`);
const linguetta = (nome: string) => [...(regione()?.querySelectorAll('[role="tab"]') ?? [])].find((t) => t.textContent === nome) ?? null;
/** Le righe segnate del codice: la corrente o l'errore, e quelle delle chiamate col loro sfondo. */
const segnate = () =>
  [...(regione()?.querySelectorAll<HTMLElement>("[data-riga][data-evidenziata], [data-riga][data-chiamata]") ?? [])].map(
    (r) => `${r.dataset.evidenziata ?? `chiamata ${r.dataset.chiamata}`}: ${r.lastElementChild?.textContent}`,
  );

test("le righe delle chiamate: dieci chiamate e più dallo stesso blocco una volta sola, con lo sfondo del livello più profondo", async () => {
  // Undici livelli: il più profondo aperto da quel blocco (11) e il più esterno (2) hanno sfondi diversi (con dieci no:
  // gli sfondi sono quattro e si ripetono, e il 10 ha lo sfondo del 2).
  await apriLaFinestra(conta(10));
  await clic(document.querySelector('header [data-comando="genera"]'), "«Genera»");
  await premi("F5");
  await aspetta("la pausa sul caso che smette", inPausa);
  await giro();
  // Nell'ordine del codice. Il livello 11 è aperto dal blocco della chiamata al livello 10: lo sfondo del livello 11 (il
  // terzo dei quattro che si ripetono), non quello del livello 2, il primo aperto dallo stesso blocco.
  expect(segnate()).toEqual(["chiamata 1:     r ← conta(10)", "corrente:         s ← 0", "chiamata 3:         s ← conta(n - 1) + 1"]);
}, 60_000);

test("un per che chiama dai suoi limiti: nel Python solo la riga della sua partenza", async () => {
  await apriLaFinestra(
    JSON.stringify({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "limiti" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "i", type: "integer" }], body: [{ id: "b1", kind: "for", counter: "i", from: "1", to: "quanti(2)", body: [{ id: "b2", kind: "write", values: ["i"], newline: true }] }], end: { id: "b3" } },
        { id: "f2", kind: "function", name: "quanti", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }], body: [], end: { id: "b4", return_value: "x" } },
      ],
    }),
  );
  await clic(document.querySelector('header [data-comando="genera"]'), "«Genera»");
  await clic(linguetta(testi.linguaggioPython), "la linguetta del Python");
  // Entra fino alla fine di `quanti`, chiamata dalla partenza del ciclo.
  for (let k = 0; k < 6 && scheda() !== "f2"; k++) await eDopo("F11");
  expect(scheda()).toBe("f2");
  console.log(`un per che chiama dai limiti, le righe segnate nel Python: ${JSON.stringify(segnate())}`);
  expect(segnate().filter((r) => r.startsWith("chiamata"))).toHaveLength(1);
}, 60_000);
