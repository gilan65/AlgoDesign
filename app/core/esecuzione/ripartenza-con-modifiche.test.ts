// Rieseguire con valori modificati a mano: «Tieni» li riapplica allo stesso punto, «Ricalcola» arriva allo stesso passaggio senza; la ricerca del punto li
// ripete sempre, o una modifica che cambia il cammino non ritroverebbe la pausa. Una modifica persa o rifiutata ferma e lo dice.
//
// Che cosa NON guarda: la finestra delle tre scelte (`e2e/riesegui.e2e.ts`); «Reinserisci le letture», che è un'esecuzione nuova come le altre.

import { expect, test } from "bun:test";
import { tetti } from "../controllo/controllo";
import type { Blocco, CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { Esecuzione } from "./esecuzione";
import { Riesecuzione } from "./ripartenza";
import { puntoDi, senzaOrologio, statoDi, type Es } from "./ripartenza-di-prova";

/** Il programma: `n` letta, poi per `i` da 1 a `n` la somma in `s`, scritta; poi «fine». */
const corpo = (): Blocco[] =>
  [
    { id: "b1", kind: "read", target: "n" },
    { id: "b2", kind: "assignment", target: "s", value: "0" },
    {
      id: "b3",
      kind: "for",
      counter: "i",
      from: "1",
      to: "n",
      body: [
        { id: "b4", kind: "assignment", target: "s", value: "s + i" },
        { id: "b5", kind: "write", values: ["s"], newline: true },
      ],
    },
    { id: "b6", kind: "write", values: ['"fine"'], newline: true },
  ] as unknown as Blocco[];

const datiDelProgramma = [
  { name: "n", type: "integer", role: "input" },
  { name: "m", type: "integer", role: "input" },
  { name: "s", type: "integer", role: "output" },
  { name: "i", type: "integer", role: "work" },
];

const programma = (blocchi: readonly unknown[] = corpo(), dati: readonly unknown[] = datiDelProgramma): Progetto =>
  ({ format: "algodesign", schema_version: 2, metadata: { name: "Prova" }, functions: [{ id: "f0", kind: "main", data: dati, body: blocchi, end: { id: "b9" } }] }) as unknown as Progetto;

const via = { id: "b0", kind: "write", values: ['"via"'], newline: true };
/** Una Scrittura in più in testa: il programma è cambiato, e i numeri delle azioni con lui. */
const conUnaScrittura = (): Progetto => programma([via, ...corpo()]);

/** Avanza con «dentro», dando le righe, finché `fine` non dice di fermarsi. */
function avanza(es: Es, fine: (s: Es["stato"]) => boolean, righe: (dato: string) => string = () => "5"): void {
  for (let giri = 0; giri < 100000; giri++) {
    const s = es.stato;
    if (fine(s)) return;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") es.inserisci(righe(s.dato));
    else throw new Error(`punto non raggiunto: ${s.genere}`);
  }
  throw new Error("troppi giri");
}

/** Sulla pausa del blocco al passaggio dato, contando dai passaggi che vede da qui. */
function fino(es: Es, blocco: string, passaggio = 1): void {
  let visti = 0;
  let prima = -1;
  avanza(es, (s) => {
    if (s.genere !== "pausa" || s.blocco !== blocco || prima === es.avanzamenti) return false;
    prima = es.avanzamenti;
    return ++visti === passaggio;
  });
}

function fermaSu(blocco: string, passaggio = 1, p: Progetto = programma()): Es {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  fino(es, blocco, passaggio);
  return es;
}

/** Oltre la pausa in cui si è fermi, fino alla prossima sul blocco. */
function ancoraFino(es: Es, blocco: string): void {
  es.comanda("dentro");
  fino(es, blocco);
}

/** Il gesto intero fino all'esito, coi valori tenuti o tolti. */
function riesegui(da: Es, p: Progetto, valori: "tieni" | "togli"): Riesecuzione<CasoDiUnaFunzione> {
  const r = new Riesecuzione<CasoDiUnaFunzione>(da, p, tetti, {}, valori);
  for (let giri = 0; giri < 1000 && r.esito === undefined; giri++) r.fetta(senzaOrologio, Infinity);
  return r;
}

const scritte = (es: Es | undefined) => es?.console.filter((v) => v.genere === "scrive").map((v) => v.testo);
const valoreDi = (es: Es | undefined, nome: string) => {
  const f = es?.traccia.righe.at(-1)?.dati;
  return f?.valori[f.nomi.indexOf(nome)]?.[0];
};
const intero = (v: number) => ({ tipo: "integer" as const, v });

test("una modifica fatta in attesa di una riga, dopo una riga rifiutata: «Tieni» la riapplica allo stesso punto, e la riga rifiutata resta al suo posto", () => {
  const dati = [{ name: "n", type: "integer", role: "input" }, { name: "m", type: "integer", role: "input" }, { name: "s", type: "integer", role: "output", initial: "1" }];
  const blocchi = [{ id: "b1", kind: "read", target: "n" }, { id: "b2", kind: "read", target: "m" }, { id: "b3", kind: "assignment", target: "s", value: "s + n + m" }, { id: "b4", kind: "write", values: ["s"], newline: true }];
  const p = programma(blocchi, dati);
  const da: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  avanza(da, (s) => s.genere === "chiede" && s.dato === "n");
  da.inserisci("abc");
  avanza(da, (s) => s.genere === "chiede" && s.dato === "n" && s.nonValido);
  da.inserisci("5");
  avanza(da, (s) => s.genere === "chiede" && s.dato === "m");
  expect(da.modifica({ dato: "s", elemento: 0 }, "100")).toEqual({ ok: true });
  da.inserisci("2");
  avanza(da, (s) => s.genere === "pausa" && s.blocco === "b4");
  expect(valoreDi(da, "s")).toEqual(intero(107));
  const tieni = riesegui(da, programma([via, ...blocchi], dati), "tieni");
  expect(tieni.esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(valoreDi(tieni.esecuzione, "s")).toEqual(intero(107));
  expect(tieni.esecuzione?.righeDate.map((r) => r.text)).toEqual(["abc", "5", "2"]);
  // Il controllo positivo: senza la modifica il valore è un altro.
  expect(valoreDi(riesegui(da, programma([via, ...blocchi], dati), "togli").esecuzione, "s")).toEqual(intero(8));
});

test("«Tieni» riapplica il valore allo stesso punto col programma cambiato; «Ricalcola» arriva allo stesso passaggio senza", () => {
  const da = fermaSu("b4", 2);
  expect(da.modifica({ dato: "s", elemento: 0 }, "100")).toEqual({ ok: true });
  // Da lì la pausa va al 3° passaggio: `s` è 100 + 2.
  ancoraFino(da, "b4");
  expect(valoreDi(da, "s")).toEqual(intero(102));
  const tieni = riesegui(da, conUnaScrittura(), "tieni");
  expect(tieni.esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(valoreDi(tieni.esecuzione, "s")).toEqual(intero(102));
  expect(tieni.esecuzione?.modifiche.map((m) => [m.dato, m.testo])).toEqual([["s", "100"]]);
  const togli = riesegui(da, conUnaScrittura(), "togli");
  expect(togli.esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(valoreDi(togli.esecuzione, "s")).toEqual(intero(3));
  expect(togli.esecuzione?.modifiche).toEqual([]);
  // `da` non cambia.
  expect(valoreDi(da, "s")).toEqual(intero(102));
});

test("«Tieni» senza cambiare il programma dà lo stesso stato, tabella e segni compresi", () => {
  const da = fermaSu("b4", 2);
  da.modifica({ dato: "s", elemento: 0 }, "100");
  const tieni = riesegui(da, programma(), "tieni");
  expect(tieni.esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(statoDi(tieni.esecuzione!)).toEqual(statoDi(da));
  expect(tieni.esecuzione!.modifiche).toEqual(da.modifiche);
});

test("una modifica che cambia il cammino: la pausa si ritrova lo stesso, perché la ricerca la ripete", () => {
  // `n` portata da 5 a 2: il programma fa due giri, e ci si ferma su «fine».
  const da = fermaSu("b2");
  da.modifica({ dato: "n", elemento: 0 }, "2");
  ancoraFino(da, "b6");
  expect(scritte(da)).toEqual(["1", "3"]);
  expect(puntoDi(da).blocco).toBe("b6");
  const tieni = riesegui(da, conUnaScrittura(), "tieni");
  expect(tieni.esito?.ritrovato).toBe(true);
  expect(scritte(tieni.esecuzione)).toEqual(["via", "1", "3"]);
  const togli = riesegui(da, conUnaScrittura(), "togli");
  expect(togli.esito?.ritrovato).toBe(true);
  expect(scritte(togli.esecuzione)).toEqual(["via", "1", "3", "6", "10", "15"]);
});

test("una modifica fatta in attesa di una riga si riapplica allo stesso numero di righe", () => {
  const due = [{ id: "b1", kind: "read", target: "n" }, { id: "b2", kind: "read", target: "m" }, { id: "b3", kind: "write", values: ["n", "m"], newline: true }, { id: "b4", kind: "assignment", target: "s", value: "1" }];
  const righe = (dato: string) => (dato === "n" ? "7" : "2");
  const da: Es = new Esecuzione<CasoDiUnaFunzione>(programma(due), tetti, {});
  avanza(da, (s) => s.genere === "chiede" && s.dato === "m", righe);
  expect(da.modifica({ dato: "n", elemento: 0 }, "5")).toEqual({ ok: true });
  avanza(da, (s) => s.genere === "pausa" && s.blocco === "b4", righe);
  expect(scritte(da)).toEqual(["52"]);
  const tieni = riesegui(da, programma([via, ...due]), "tieni");
  expect(tieni.esito?.ritrovato).toBe(true);
  expect(scritte(tieni.esecuzione)).toEqual(["via", "52"]);
  expect(scritte(riesegui(da, programma([via, ...due]), "togli").esecuzione)).toEqual(["via", "72"]);
});

test("il passaggio di una modifica non c'è più: si ferma alla pausa e lo dice; con «Ricalcola» non c'è nulla da dire", () => {
  // La modifica sul blocco `b5`, la pausa su `b4` al giro dopo: poi `b5` cancellato.
  const da = fermaSu("b5");
  da.modifica({ dato: "s", elemento: 0 }, "100");
  ancoraFino(da, "b4");
  const senzaB5 = programma([
    ...corpo().slice(0, 2),
    { id: "b3", kind: "for", counter: "i", from: "1", to: "n", body: [{ id: "b4", kind: "assignment", target: "s", value: "s + i" }] },
    corpo()[3],
  ]);
  const tieni = riesegui(da, senzaB5, "tieni");
  expect(tieni.esito).toEqual({ ritrovato: false, motivo: "modifica_persa" });
  expect(tieni.esecuzione?.stato).toMatchObject({ genere: "pausa", blocco: "b4" });
  expect(riesegui(da, senzaB5, "togli").esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
});

test("il dato non c'è più o non accetta il valore: si ferma lì e lo dice", () => {
  const da = fermaSu("b4");
  da.modifica({ dato: "m", elemento: 0 }, "42");
  const cancellato = riesegui(da, programma(corpo(), datiDelProgramma.filter((d) => d.name !== "m")), "tieni");
  expect(cancellato.esito).toEqual({ ritrovato: false, motivo: "modifica_rifiutata" });
  expect(cancellato.esecuzione?.stato).toMatchObject({ genere: "pausa", blocco: "b4" });
  const altroTipo = programma(corpo(), datiDelProgramma.map((d) => (d.name === "m" ? { ...d, type: "boolean" } : d)));
  expect(riesegui(da, altroTipo, "tieni").esito).toEqual({ ritrovato: false, motivo: "modifica_rifiutata" });
  // Il controllo positivo: col dato com'era il valore si riapplica.
  expect(riesegui(da, programma(), "tieni").esito?.ritrovato).toBe(true);
});

test("una modifica in una pausa di ripresa si riapplica lì: la parte già calcolata resta, e «Ricalcola» non la vede", () => {
  const funzione = { id: "f1", kind: "function", name: "f", return_type: "integer", data: [], body: [], end: { id: "b8", return_value: "10" } };
  const conLaChiamata = (blocchi: readonly unknown[]): Progetto =>
    ({ format: "algodesign", schema_version: 2, metadata: { name: "Prova" }, functions: [{ id: "f0", kind: "main", data: [{ name: "a", type: "integer" }, { name: "s", type: "integer" }], body: blocchi, end: { id: "b9" } }, funzione] }) as unknown as Progetto;
  const corpoDellaChiamata = [
    { id: "b1", kind: "assignment", target: "a", value: "1" },
    { id: "b2", kind: "assignment", target: "s", value: "a + f()" },
    { id: "b3", kind: "write", values: ["s", "a"], newline: true },
  ];
  const da: Es = new Esecuzione<CasoDiUnaFunzione>(conLaChiamata(corpoDellaChiamata), tetti, {});
  avanza(da, (s) => s.genere === "pausa" && s.ripresa !== undefined);
  expect(da.modifica({ dato: "a", elemento: 0 }, "100")).toEqual({ ok: true });
  avanza(da, (s) => s.genere === "pausa" && s.blocco === "b9");
  expect(scritte(da)).toEqual(["11100"]);
  const nuovo = conLaChiamata([via, ...corpoDellaChiamata]);
  expect(scritte(riesegui(da, nuovo, "tieni").esecuzione)).toEqual(["via", "11100"]);
  expect(scritte(riesegui(da, nuovo, "togli").esecuzione)).toEqual(["via", "111"]);
});

test("il programma finito prima della modifica: il motivo di sempre, mai fermo a un passaggio prima", () => {
  const da = fermaSu("b4", 3);
  da.modifica({ dato: "s", elemento: 0 }, "100");
  const accorciato = programma([
    ...corpo().slice(0, 2),
    { id: "b3", kind: "for", counter: "i", from: "1", to: "2", body: [{ id: "b4", kind: "assignment", target: "s", value: "s + i" }, { id: "b5", kind: "write", values: ["s"], newline: true }] },
    corpo()[3],
  ]);
  expect(riesegui(da, accorciato, "tieni").esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
});
