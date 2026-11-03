// La ripartenza da una pausa, dopo una modifica: la tabella delle modifiche con l'atteso scritto prima,
// i motivi di «non ritrovato». Il controllo positivo: un'occorrenza alterata arriva a un'altra pausa, e lo stato è diverso.
//
// Che cosa NON guarda: la finestra e il comando, che li mette `ui/`; i valori di prima accanto a quelli nuovi; il tempo vero di una fetta.
// Il corpus: `ripartenza-corpus.test.ts`.

import { expect, test } from "bun:test";
import { tetti } from "../controllo/controllo";
import type { Blocco, CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { Esecuzione, type OpzioniDellEsecuzione } from "./esecuzione";
import { RicercaDelPunto, Ripartenza, type EsitoDellaRipartenza, type PuntoDellaPausa } from "./ripartenza";
import { puntoDi, senzaOrologio, statoDi, type Es } from "./ripartenza-di-prova";

/** Il programma della tabella: `n` letta, poi per `i` da 1 a `n` la somma in `s`, scritta. */
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

const programma = (blocchi: readonly unknown[] = corpo()): Progetto =>
  ({ format: "algodesign", schema_version: 2, metadata: { name: "Prova" }, functions: [{ id: "f0", kind: "main", data: datiDelProgramma, body: blocchi, end: { id: "b9" } }] }) as unknown as Progetto;

const conBlocco = (id: string, f: (b: Record<string, unknown>) => unknown) => (bs: readonly unknown[]): unknown[] =>
  bs.flatMap((b) => {
    const x = b as Record<string, unknown>;
    const dentro = "body" in x ? { ...x, body: conBlocco(id, f)(x.body as unknown[]) } : x;
    const fuori = x.id === id ? f(dentro) : dentro;
    return fuori === undefined ? [] : [fuori];
  });

/** Fino alla pausa sul blocco al passaggio dato, col comando dato, dando le righe. */
function fermaSu(p: Progetto, blocco: string, passaggio: number, righe: readonly string[], comando: "dentro" | "sopra" = "dentro"): Es {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  let visti = 0;
  let k = 0;
  for (;;) {
    const s = es.stato;
    if (s.genere === "pausa" && s.blocco === blocco && ++visti === passaggio) return es;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda(comando);
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") es.inserisci(righe[k++]!);
    else throw new Error(`pausa non raggiunta: ${s.genere}`);
  }
}

function riparti(p: Progetto, da: Es, punto: PuntoDellaPausa = puntoDi(da), opzioni: OpzioniDellEsecuzione<CasoDiUnaFunzione> = {}): { readonly es: Es; readonly esito: EsitoDellaRipartenza | undefined } {
  const r = new Ripartenza<CasoDiUnaFunzione>(p, tetti, opzioni, da.righeDate, punto);
  r.fetta(senzaOrologio, Infinity);
  return { es: r.esecuzione, esito: r.esito };
}

const stessoStato = (a: Es, b: Es): boolean => Bun.deepEquals(statoDi(a), statoDi(b), true);

const consoleScritta = (es: Es) => es.console.filter((v) => v.genere === "scrive").map((v) => v.testo);

const allaPausa = () => fermaSu(programma(), "b4", 3, ["5"]);

test("1. senza modifiche: lo stesso stato", () => {
  const da = allaPausa();
  const { es, esito } = riparti(programma(), da);
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(stessoStato(es, da)).toBe(true);
});

test("2. un valore cambiato prima del punto: ritrovato allo stesso passaggio, il valore ricalcolato", () => {
  const da = allaPausa();
  const modificato = programma(conBlocco("b2", (b) => ({ ...b, value: "100" }))(corpo()));
  const { es, esito } = riparti(modificato, da);
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(es.stato).toEqual(da.stato);
  expect(es.avanzamenti).toBe(da.avanzamenti);
  expect(consoleScritta(es)).toEqual(["101", "103"]);
  expect(consoleScritta(da)).toEqual(["1", "3"]);
});

test("3. un blocco aggiunto nel ciclo prima del punto: ritrovato al 3° passaggio, con avanzamenti e passi diversi", () => {
  const da = allaPausa();
  const aggiunto = { id: "b8", kind: "write", values: ['"x"'], newline: true };
  const modificato = programma(conBlocco("b3", (b) => ({ ...b, body: [aggiunto, ...(b.body as unknown[])] }))(corpo()));
  const { es, esito } = riparti(modificato, da);
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(es.stato).toEqual(da.stato);
  expect(es.avanzamenti).toBeGreaterThan(da.avanzamenti);
  expect(es.passi).toBeGreaterThan(da.passi);
  expect(consoleScritta(es)).toEqual(["x", "1", "x", "3", "x"]);
});

test("4. il blocco del punto cancellato: si dice, senza eseguire nulla", () => {
  const da = allaPausa();
  const { es, esito } = riparti(programma(conBlocco("b4", () => undefined)(corpo())), da);
  expect(esito).toEqual({ ritrovato: false, motivo: "posto_cancellato" });
  expect(es.stato.genere).toBe("pronta");
  expect(es.avanzamenti).toBe(0);
});

test("5. il ciclo accorciato: il passaggio non c'è più, e non ci si ferma ai passaggi prima", () => {
  const da = allaPausa();
  const { es, esito } = riparti(programma(conBlocco("b3", (b) => ({ ...b, to: "2" }))(corpo())), da);
  expect(esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
  expect(es.stato).toEqual({ genere: "finita" });
  expect(consoleScritta(es)).toEqual(["1", "3", "fine"]);
});

test("6. una lettura aggiunta prima del punto: ferma sulla lettura, e dice perché", () => {
  const da = allaPausa();
  const altra = riparti(programma([{ id: "b7", kind: "read", target: "m" }, ...corpo()]), da);
  expect(altra.esito).toEqual({ ritrovato: false, motivo: "riga_per_un_altro_dato" });
  expect(altra.es.stato).toMatchObject({ genere: "chiede", dato: "m" });
  const stessa = riparti(programma([...corpo().slice(0, 1), { id: "b7", kind: "read", target: "n" }, ...corpo().slice(1)]), da);
  expect(stessa.esito).toEqual({ ritrovato: false, motivo: "riga_mancante" });
  expect(stessa.es.stato).toMatchObject({ genere: "chiede", dato: "n" });
});

test("7. la lettura tolta: ritrovato, e dice la riga avanzata", () => {
  const da = allaPausa();
  const modificato = programma(conBlocco("b3", (b) => ({ ...b, to: "5" }))(corpo().slice(1)));
  const { es, esito } = riparti(modificato, da);
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 1 });
  expect(es.stato).toEqual(da.stato);
});

/** Una lettura e una scrittura di un dato del tipo dato. */
const unaLettura = (tipo: string): Progetto =>
  ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Prova" },
    functions: [{ id: "f0", kind: "main", data: [{ name: "x", type: tipo, role: "input" }], body: [{ id: "b1", kind: "read", target: "x" }, { id: "b2", kind: "write", values: ["x"], newline: true }], end: { id: "b3" } }],
  }) as unknown as Progetto;

test("8. una riga che era valida e ora non lo è, o il contrario: ferma, e dice quale", () => {
  const conTesto = fermaSu(unaLettura("string"), "b2", 1, ["abc"]);
  const ora = riparti(unaLettura("integer"), conTesto);
  expect(ora.esito).toEqual({ ritrovato: false, motivo: "riga_ora_rifiutata" });
  expect(ora.es.stato).toMatchObject({ genere: "chiede", dato: "x", nonValido: true });

  const conRifiutata = fermaSu(unaLettura("integer"), "b2", 1, ["abc", "5"]);
  expect(conRifiutata.righeDate.map((r) => r.rifiutata === true)).toEqual([true, false]);
  const valida = riparti(unaLettura("string"), conRifiutata);
  expect(valida.esito).toEqual({ ritrovato: false, motivo: "riga_ora_valida" });
  expect(valida.es.righeDate.map((r) => r.text)).toEqual(["abc"]);
});

test("9. un ciclo diventato senza fine prima del punto: finisce col tetto dei passi, a fette, senza bloccare chi chiama", () => {
  const da = allaPausa();
  const senzaFine = { id: "b7", kind: "while", condition: "s >= 0", body: [{ id: "b8", kind: "assignment", target: "s", value: "1" }] };
  const modificato = programma([...corpo().slice(0, 2), senzaFine, ...corpo().slice(2)]);
  const r = new Ripartenza<CasoDiUnaFunzione>(modificato, tetti, { tabella: false }, da.righeDate, puntoDi(da));
  let adesso = 0;
  const orologio = () => (adesso += 1);
  let fette = 0;
  // Con un limite: una ripartenza che non finisse non deve appendere la prova.
  while (r.esito === undefined && fette < 100_000) {
    r.fetta(orologio, 1000);
    fette++;
  }
  expect(fette).toBeGreaterThan(1);
  expect(r.esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
  expect(r.esecuzione.stato).toMatchObject({ genere: "finita", errore: { code: "too_many_steps" } });
}, 30_000);

test("una modifica che non fa partire il progetto: si dice, col controllo", () => {
  const da = allaPausa();
  const { es, esito } = riparti(programma(conBlocco("b2", (b) => ({ ...b, value: "nonesiste" }))(corpo())), da);
  expect(esito).toEqual({ ritrovato: false, motivo: "non_parte" });
  expect(es.stato.genere).toBe("non parte");
});

test("un punto raggiunto con «sopra» o con un punto di interruzione è lo stesso punto; gli altri punti non fermano", () => {
  const conDentro = allaPausa();
  const conSopra = fermaSu(programma(), "b4", 3, ["5"], "sopra");
  expect(puntoDi(conSopra)).toEqual(puntoDi(conDentro));

  const conPunto: Es = new Esecuzione<CasoDiUnaFunzione>(programma(), tetti, {});
  conPunto.puntiDiInterruzione = new Set(["b4"]);
  conPunto.comanda("continua");
  let visti = 0;
  for (;;) {
    conPunto.fetta(senzaOrologio, Infinity);
    const s = conPunto.stato;
    if (s.genere === "chiede") conPunto.inserisci("5");
    else if (s.genere === "pausa" && ++visti < 3) conPunto.comanda("continua");
    else if (s.genere === "pausa") break;
    else throw new Error(s.genere);
  }
  expect(puntoDi(conPunto)).toEqual(puntoDi(conDentro));

  const r = new Ripartenza<CasoDiUnaFunzione>(programma(), tetti, {}, conPunto.righeDate, puntoDi(conPunto));
  r.esecuzione.puntiDiInterruzione = new Set(["b2", "b5"]);
  r.fetta(senzaOrologio, Infinity);
  expect(r.esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(stessoStato(r.esecuzione, conDentro)).toBe(true);
});

test("una riga rifiutata si ridà al suo posto: scrive nella console come allora", () => {
  const da = fermaSu(unaLettura("integer"), "b2", 1, ["abc", "5"]);
  const { es, esito } = riparti(unaLettura("integer"), da);
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(es.righeDate).toEqual(da.righeDate);
  expect(stessoStato(es, da)).toBe(true);
});

/** Una funzione chiamata due volte nella stessa espressione: due riprese, allo stesso blocco. */
const conRipresa = (): Progetto =>
  ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Prova" },
    functions: [
      { id: "f0", kind: "main", data: [{ name: "a", type: "integer", role: "output" }], body: [{ id: "b1", kind: "assignment", target: "a", value: "g() + g()" }], end: { id: "b2" } },
      { id: "f1", kind: "function", name: "g", return_type: "integer", data: [{ name: "r", type: "integer", role: "work" }], body: [{ id: "b3", kind: "assignment", target: "r", value: "1" }], end: { id: "b4", return_value: "r" } },
    ],
  }) as unknown as Progetto;

test("una pausa di ripresa: distinta dall'azione dello stesso blocco, ritrovata alla stessa volta", () => {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(conRipresa(), tetti, {});
  let riprese = 0;
  for (;;) {
    const s = es.stato;
    if (s.genere === "pausa" && s.ripresa !== undefined && ++riprese === 2) break;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else throw new Error(s.genere);
  }
  const punto = puntoDi(es);
  expect(punto.occorrenza).toBe(2);
  const { es: nuova, esito } = riparti(conRipresa(), es, punto);
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(stessoStato(nuova, es)).toBe(true);
});

test("nel modo caso le letture le dà il caso: stesso punto, stesso stato", () => {
  const caso = { name: "cinque", inputs: [{ data: "n", text: "5" }], expected: { output: "" } } as unknown as CasoDiUnaFunzione;
  const da: Es = new Esecuzione<CasoDiUnaFunzione>(programma(), tetti, { caso });
  let visti = 0;
  for (;;) {
    const s = da.stato;
    if (s.genere === "pausa" && s.blocco === "b4" && ++visti === 3) break;
    if (s.genere === "pronta" || s.genere === "pausa") da.comanda("dentro");
    else if (s.genere === "in corso") da.fetta(senzaOrologio, 0);
    else throw new Error(s.genere);
  }
  expect(da.righeDate).toEqual([]);
  const { es, esito } = riparti(programma(), da, puntoDi(da), { caso });
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(stessoStato(es, da)).toBe(true);
});

test("il controllo positivo: un'occorrenza alterata arriva a un'altra pausa, e lo stato è diverso", () => {
  const da = allaPausa();
  const punto = puntoDi(da);
  expect(punto.occorrenza).toBe(3);
  const dopo = riparti(programma(), da, { ...punto, occorrenza: punto.occorrenza + 1 });
  expect(dopo.esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(stessoStato(dopo.es, da)).toBe(false);
  expect(riparti(programma(), da, { ...punto, occorrenza: 99 }).esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
});

test("la ricerca del punto a fette non cambia l'esecuzione da cui parte", () => {
  const da = allaPausa();
  const prima = JSON.stringify(statoDi(da));
  const r = new RicercaDelPunto(da);
  let adesso = 0;
  for (let fette = 0; r.punto === undefined && fette < 10_000; fette++) r.fetta(() => (adesso += 1), 3);
  expect(r.punto).toMatchObject({ blocco: "b4", occorrenza: 3 });
  expect(JSON.stringify(statoDi(da))).toBe(prima);
});
