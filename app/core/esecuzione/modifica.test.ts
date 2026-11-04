// Scrivere un valore a mano in un'esecuzione ferma: la tabella dei casi con l'atteso scritto prima del codice. Vale da lì in poi, sulla riga corrente della
// tabella e col suo segno, senza un cambio falso nella riga dopo; un valore che non va è rifiutato col motivo, e non ferma nulla.
//
// Che cosa NON guarda: il file (`core/registrazione/registrazione.test.ts`), la ripartenza (`ripartenza.test.ts`), il gesto nella finestra.

import { expect, test } from "bun:test";
import { casoDallEsecuzione } from "../casi/dall-esecuzione";
import { tetti } from "../controllo/controllo";
import { opzioniPredefinite } from "../disegno/impaginazione";
import type { Fotografia } from "../interprete/interprete";
import type { CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { Esecuzione } from "./esecuzione";
import { senzaOrologio, type Es } from "./ripartenza-di-prova";
import { testiIt } from "./testi-di-prova";
import { csv, TabellaMostrata, type FormaDeiVettori } from "./traccia";

const programma = (dati: readonly unknown[], corpo: readonly unknown[], altro: Record<string, unknown> = {}, funzioni: readonly unknown[] = []): Progetto =>
  ({ format: "algodesign", schema_version: 2, metadata: { name: "Prova" }, functions: [{ id: "f0", kind: "main", data: dati, body: corpo, end: { id: "b99" } }, ...funzioni], ...altro }) as unknown as Progetto;

const intero = (name: string, resto: Record<string, unknown> = {}) => ({ name, type: "integer", ...resto });
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });
const scrivi = (id: string, ...values: string[]) => ({ id, kind: "write", values, newline: true });

/** Avanza con «dentro», dando le righe, fino alla pausa sul blocco al passaggio dato (la ripresa solo se chiesta). */
function fermaSu(p: Progetto, blocco: string, passaggio = 1, righe: readonly string[] = [], ripresa = false): Es {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  let visti = 0;
  let k = 0;
  for (let giri = 0; giri < 100000; giri++) {
    const s = es.stato;
    if (s.genere === "pausa" && s.blocco === blocco && (s.ripresa !== undefined) === ripresa && ++visti === passaggio) return es;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") es.inserisci(righe[k++]!);
    else throw new Error(`pausa non raggiunta: ${s.genere}`);
  }
  throw new Error("troppi giri");
}

function finoAllaFine(es: Es, righe: readonly string[] = []): void {
  let k = 0;
  if (es.stato.genere === "pausa") es.comanda("continua");
  for (let giri = 0; giri < 100000 && es.stato.genere !== "finita"; giri++) {
    if (es.stato.genere === "in corso") es.fetta(senzaOrologio, Infinity);
    else if (es.stato.genere === "chiede") es.inserisci(righe[k++]!);
    else throw new Error(`fine non raggiunta: ${es.stato.genere}`);
  }
}

const scritto = (es: Es) => es.console.filter((v) => v.genere === "scrive").map((v) => v.testo);
const tabellaDi = (p: Progetto, forma: FormaDeiVettori = "per-elemento") => new TabellaMostrata(p, testiIt, ",", forma, "elenco", opzioniPredefinite);
/** L'ultima riga della tabella: il testo e il segno per colonna. */
const ultimaRiga = (es: Es, p: Progetto, forma?: FormaDeiVettori) => {
  const t = tabellaDi(p, forma);
  const righe = t.righe(es.traccia);
  const r = righe.at(-1)!;
  return Object.fromEntries(t.colonne.map((c, i) => [c.funzione === undefined ? c.nome : `${c.funzione} › ${c.nome}`, { testo: r.valori[i]!.testo, modificata: r.valori[i]!.modificata === true }]));
};
const valoriDi = (f: Fotografia | undefined, nome: string) => f?.valori[f.nomi.indexOf(nome)];
const ok = { ok: true } as const;

// ------------------------------------------------------------------------------------------- i casi validi

test("caso 1, un dato semplice: vale da lì in poi, sulla riga corrente col segno, e la riga dopo non segna un cambio falso", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1"), scrivi("b3", "a")]);
  const es = fermaSu(p, "b2");
  expect(es.modifica({ dato: "a", elemento: 0 }, "5")).toEqual(ok);
  // La riga di `a ← 7` è la corrente: ha il valore nuovo e il segno; `b` no.
  expect(ultimaRiga(es, p)).toEqual({ a: { testo: "5", modificata: true }, b: { testo: testiIt.nonInizializzata, modificata: false } });
  finoAllaFine(es);
  expect(scritto(es)).toEqual(["5"]);
  const righe = es.traccia.righe;
  const dopo = righe.find((r) => r.blocco === "b2")!;
  // La riga di `b ← 1`: `a` non è cambiata con quell'azione, né ha il segno.
  expect(dopo.cambiati[0]).toEqual([false]);
  const t = tabellaDi(p).riga(dopo);
  expect(t.valori.map((c) => [c.testo, c.cambiata, c.modificata === true])).toEqual([["5", false, false], ["1", true, false]]);
});

test("il controllo positivo: senza la modifica la stessa esecuzione scrive il valore del programma", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1"), scrivi("b3", "a")]);
  const es = fermaSu(p, "b2");
  finoAllaFine(es);
  expect(scritto(es)).toEqual(["7"]);
});

test("la fotografia di prima resta vera: la riga prima della corrente non cambia", () => {
  const p = programma([intero("a")], [assegna("b1", "a", "1"), assegna("b2", "a", "2"), assegna("b3", "a", "3")]);
  const es = fermaSu(p, "b3");
  const prima = es.traccia.righe[0]!;
  es.modifica({ dato: "a", elemento: 0 }, "9");
  expect(es.traccia.righe[0]).toBe(prima);
  expect(valoriDi(es.traccia.righe[0]!.dati, "a")![0]).toEqual({ tipo: "integer", v: 1 });
  expect(valoriDi(es.traccia.righe[1]!.dati, "a")![0]).toEqual({ tipo: "integer", v: 9 });
});

test("caso 2, l'elemento di un vettore: solo quello", () => {
  const v = { name: "v", type: "integer", size: 3, initial: { each: "0" } };
  const p = programma([v, intero("b")], [assegna("b1", "b", "1"), scrivi("b2", "v[0]", "v[1]", "v[2]")]);
  const es = fermaSu(p, "b2");
  expect(es.modifica({ dato: "v", elemento: 2 }, "8")).toEqual(ok);
  const u = ultimaRiga(es, p);
  expect([u["v[0]"], u["v[1]"], u["v[2]"]]).toEqual([{ testo: "0", modificata: false }, { testo: "0", modificata: false }, { testo: "8", modificata: true }]);
  finoAllaFine(es);
  expect(scritto(es).join("")).toBe("008");
});

test("caso 3, il campo di un record: solo quello, e ogni campo col suo tipo", () => {
  const p = programma(
    [{ name: "r", type: "record", record: "Voto" }, intero("b")],
    [assegna("b1", "r.nome", '"Anna"'), assegna("b2", "r.voto", "6"), assegna("b3", "b", "1"), scrivi("b4", "r.nome", "r.voto")],
    { records: [{ name: "Voto", fields: [{ name: "nome", type: "string" }, { name: "voto", type: "integer" }] }] },
  );
  const es = fermaSu(p, "b3");
  expect(es.modifica({ dato: "r", elemento: 1 }, "abc")).toEqual({ ok: false, motivo: "non_valido" });
  expect(es.modifica({ dato: "r", elemento: 1 }, "8")).toEqual(ok);
  expect(es.modifica({ dato: "r", elemento: 0 }, "Bea")).toEqual(ok);
  finoAllaFine(es);
  expect(scritto(es).join("")).toBe("Bea8");
});

test("caso 4, l'elemento di una matrice e il campo di un record di una tabella: la posizione giusta nella cella", () => {
  const p = programma(
    [{ name: "m", type: "integer", size: 2, columns: 2, initial: { each: "0" } }, { name: "t", type: "record", record: "Voto", size: 2, initial: { each: ['"-"', "0"] } }, intero("b")],
    [assegna("b1", "b", "1"), scrivi("b2", "m[1][0]", "m[1][1]", "t[1].nome", "t[1].voto", "t[0].voto")],
    { records: [{ name: "Voto", fields: [{ name: "nome", type: "string" }, { name: "voto", type: "integer" }] }] },
  );
  const es = fermaSu(p, "b2");
  expect(es.modifica({ dato: "m", elemento: 2 }, "7")).toEqual(ok);
  expect(es.modifica({ dato: "t", elemento: 3 }, "9")).toEqual(ok);
  finoAllaFine(es);
  expect(scritto(es).join("")).toBe("70-90");
});

const conRiferimento = () =>
  programma(
    [intero("a"), { name: "v", type: "integer", size: 2, initial: { each: "0" } }],
    [
      assegna("b1", "a", "7"),
      { id: "b2", kind: "call", callee: "p", arguments: ["a", "v[1]"] },
      scrivi("b3", "a", "v[1]"),
    ],
    {},
    [
      {
        id: "f1",
        kind: "procedure",
        name: "p",
        data: [intero("x", { parameter: "reference" }), intero("y", { parameter: "reference" }), intero("c")],
        body: [assegna("b4", "c", "1"), assegna("b5", "c", "2")],
        end: { id: "b6" },
      },
    ],
  );

test("caso 5, un parametro per riferimento: è la cella di chi chiama, e si segnano tutti e due", () => {
  const p = conRiferimento();
  const es = fermaSu(p, "b5");
  expect(es.modifica({ funzione: "f1", dato: "x", elemento: 0 }, "5")).toEqual(ok);
  const u = ultimaRiga(es, p);
  expect(u.a).toEqual({ testo: "5", modificata: true });
  expect(u["p › x"]).toEqual({ testo: "5 (a)", modificata: true });
  finoAllaFine(es);
  expect(scritto(es).join("")).toBe("50");
});

test("caso 6, un elemento passato per riferimento: cambia l'elemento di chi chiama", () => {
  const p = conRiferimento();
  const es = fermaSu(p, "b5");
  expect(es.modifica({ funzione: "f1", dato: "y", elemento: 0 }, "6")).toEqual(ok);
  const u = ultimaRiga(es, p);
  expect(u["v[1]"]).toEqual({ testo: "6", modificata: true });
  expect(u["v[0]"]).toEqual({ testo: "0", modificata: false });
  finoAllaFine(es);
  expect(scritto(es).join("")).toBe("76");
});

test("caso 7, una chiamata un livello sotto col parametro per valore: cambia la copia, non il dato di chi chiama", () => {
  const p = programma([intero("a")], [assegna("b1", "a", "7"), { id: "b2", kind: "call", callee: "p", arguments: ["a"] }, scrivi("b3", "a")], {}, [
    { id: "f1", kind: "procedure", name: "p", data: [intero("x", { parameter: "value" })], body: [scrivi("b4", "x")], end: { id: "b5" } },
  ]);
  const es = fermaSu(p, "b4");
  expect(es.modifica({ funzione: "f1", dato: "x", elemento: 0 }, "5")).toEqual(ok);
  expect(ultimaRiga(es, p).a).toEqual({ testo: "7", modificata: false });
  finoAllaFine(es);
  expect(scritto(es).join(" ")).toBe("5 7");
});

test("caso 8, la ricorsione: cambia la chiamata più profonda, quella che il gruppo mostra", () => {
  const p = programma([], [{ id: "b1", kind: "call", callee: "r", arguments: ["2"] }], {}, [
    {
      id: "f1",
      kind: "procedure",
      name: "r",
      data: [intero("n", { parameter: "value" })],
      body: [{ id: "b2", kind: "if", condition: "n > 0", then: [{ id: "b3", kind: "call", callee: "r", arguments: ["n - 1"] }], else: [] }, scrivi("b4", "n")],
      end: { id: "b5" },
    },
  ]);
  // Sul primo `scrivi`, in fondo alle chiamate: n = 0.
  const es = fermaSu(p, "b4");
  expect(es.modifica({ funzione: "f1", dato: "n", elemento: 0 }, "9")).toEqual(ok);
  finoAllaFine(es);
  expect(scritto(es).join(" ")).toBe("9 1 2");
});

test("caso 9, il contatore di un «per»: il controllo e l'aumento vedono il valore nuovo", () => {
  const p = programma([intero("i")], [{ id: "b1", kind: "for", counter: "i", from: "1", to: "5", body: [scrivi("b2", "i")] }]);
  const es = fermaSu(p, "b2");
  expect(es.modifica({ dato: "i", elemento: 0 }, "4")).toEqual(ok);
  finoAllaFine(es);
  expect(scritto(es).join(" ")).toBe("4 5");
});

test("caso 10, la pausa di ripresa: la parte già calcolata dell'espressione non cambia, l'azione dopo vede il valore nuovo", () => {
  const p = programma([intero("a"), intero("s")], [assegna("b1", "a", "1"), assegna("b2", "s", "a + f()"), scrivi("b3", "s", "a")], {}, [
    { id: "f1", kind: "function", name: "f", return_type: "integer", data: [], body: [], end: { id: "b4", return_value: "10" } },
  ]);
  const es = fermaSu(p, "b2", 1, [], true);
  expect(es.stato).toMatchObject({ genere: "pausa", ripresa: { funzione: "f1" } });
  expect(es.modifica({ dato: "a", elemento: 0 }, "100")).toEqual(ok);
  finoAllaFine(es);
  // `s` = 1 + 10 con la `a` già calcolata; poi `a` è 100.
  expect(scritto(es).join("")).toBe("11100");
});

test("caso 11, in attesa di una riga: la lettura sbagliata si corregge, la riga data resta fra le letture e si prosegue", () => {
  const p = programma([intero("a"), intero("b")], [{ id: "b1", kind: "read", target: "a" }, { id: "b2", kind: "read", target: "b" }, scrivi("b3", "a", "b")]);
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  es.inserisci("7");
  es.fetta(senzaOrologio, Infinity);
  expect(es.stato).toMatchObject({ genere: "chiede", dato: "b" });
  expect(es.modifica({ dato: "a", elemento: 0 }, "5")).toEqual(ok);
  expect(es.stato).toMatchObject({ genere: "chiede", dato: "b" });
  expect(ultimaRiga(es, p).a).toEqual({ testo: "5", modificata: true });
  es.inserisci("2");
  es.fetta(senzaOrologio, Infinity);
  expect(scritto(es).join("")).toBe("52");
  expect(es.righeDate).toEqual([{ data: "a", text: "7" }, { data: "b", text: "2" }]);
  // La riga della lettura dice ciò che è stato scritto allora.
  expect(es.traccia.righe[0]!.letto).toBe("7");
});

test("caso 12, sulla riga 0: «Inizio» cambia e ha il segno, e la riga dopo non segna un cambio falso", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "b", "1"), scrivi("b2", "a")]);
  const es = fermaSu(p, "b1");
  expect(es.traccia.righe).toEqual([]);
  expect(es.modifica({ dato: "a", elemento: 0 }, "5")).toEqual(ok);
  const t = tabellaDi(p);
  expect(t.iniziale(es.traccia)!.valori.map((c) => [c.testo, c.modificata === true])).toEqual([["5", true], [testiIt.nonInizializzata, false]]);
  finoAllaFine(es);
  expect(es.traccia.righe[0]!.cambiati[0]).toEqual([false]);
  expect(scritto(es)).toEqual(["5"]);
});

test("caso 13, un dato senza valore: lo prende", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "b", "1"), assegna("b2", "b", "2"), scrivi("b3", "a")]);
  const es = fermaSu(p, "b2");
  expect(es.modifica({ dato: "a", elemento: 0 }, " 5 ")).toEqual(ok);
  finoAllaFine(es);
  expect(scritto(es)).toEqual(["5"]);
});

test("caso 20, più modifiche sulla stessa cella nello stesso punto: valgono in ordine, tutte dette", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1"), scrivi("b3", "a")]);
  const es = fermaSu(p, "b2");
  const punto = es.avanzamenti;
  es.modifica({ dato: "a", elemento: 0 }, "5");
  es.modifica({ dato: "a", elemento: 0 }, "6");
  expect(es.modifiche).toEqual([{ avanzamenti: punto, dato: "a", elemento: 0, testo: "5" }, { avanzamenti: punto, dato: "a", elemento: 0, testo: "6" }]);
  expect(es.traccia.righe.at(-1)!.modifiche!.map((m) => [m.prima, m.valore])).toEqual([
    [{ tipo: "integer", v: 7 }, { tipo: "integer", v: 5 }],
    [{ tipo: "integer", v: 5 }, { tipo: "integer", v: 6 }],
  ]);
  expect(ultimaRiga(es, p).a).toEqual({ testo: "6", modificata: true });
  finoAllaFine(es);
  expect(scritto(es)).toEqual(["6"]);
});

// ------------------------------------------------------------------------------------------- i rifiuti

/** Un rifiuto non cambia nulla: stato, tabella, modifiche, avanzamenti. */
function rifiutata(es: Es, bersaglio: Parameters<Es["modifica"]>[0], testo: string, motivo: string): void {
  const prima = { stato: es.stato, righe: es.traccia.righe, iniziali: es.traccia.valoriIniziali, avanzamenti: es.avanzamenti, modifiche: es.modifiche };
  const riga = es.traccia.righe.at(-1);
  expect(es.modifica(bersaglio, testo)).toEqual({ ok: false, motivo } as never);
  expect({ stato: es.stato, righe: es.traccia.righe, iniziali: es.traccia.valoriIniziali, avanzamenti: es.avanzamenti, modifiche: es.modifiche }).toEqual(prima);
  expect(es.traccia.righe.at(-1)).toBe(riga as never);
}

test("caso 14, un valore non valido per ogni tipo: rifiutato col motivo, nulla è fermo o cambiato", () => {
  const p = programma(
    [intero("i"), { name: "r", type: "real" }, { name: "c", type: "character" }, { name: "b", type: "boolean" }, intero("z")],
    [assegna("b1", "z", "1"), assegna("b2", "z", "2")],
  );
  const es = fermaSu(p, "b2");
  rifiutata(es, { dato: "i", elemento: 0 }, "abc", "non_valido");
  rifiutata(es, { dato: "i", elemento: 0 }, "99999999999", "non_valido");
  rifiutata(es, { dato: "r", elemento: 0 }, "1,5", "non_valido");
  rifiutata(es, { dato: "c", elemento: 0 }, "ab", "non_valido");
  rifiutata(es, { dato: "b", elemento: 0 }, "vero", "non_valido");
  finoAllaFine(es);
  expect(es.stato).toEqual({ genere: "finita" });
});

test("caso 15, una stringa troppo lunga: rifiutata col suo motivo, senza fermare il programma; contata in caratteri, non in unità di testo", () => {
  const faccina = String.fromCodePoint(0x1f600);
  const p = programma([{ name: "t", type: "string", max_length: 3 }, intero("z")], [assegna("b1", "z", "1"), assegna("b2", "z", "2"), scrivi("b3", "t")]);
  const es = fermaSu(p, "b2");
  rifiutata(es, { dato: "t", elemento: 0 }, "abcd", "troppo_lungo");
  expect(es.modifica({ dato: "t", elemento: 0 }, faccina.repeat(3))).toEqual(ok);
  finoAllaFine(es);
  expect(es.stato).toEqual({ genere: "finita" });
  expect(scritto(es)).toEqual([faccina.repeat(3)]);
});

test("caso 16, una costante non si modifica: del programma e comune", () => {
  const p = programma([intero("k", { constant: true, initial: "3" }), intero("z")], [assegna("b1", "z", "1"), assegna("b2", "z", "2")], { shared_constants: [intero("C", { constant: true, initial: "1" })] });
  const es = fermaSu(p, "b2");
  rifiutata(es, { dato: "k", elemento: 0 }, "4", "costante");
  rifiutata(es, { dato: "C", elemento: 0 }, "4", "costante");
});

test("caso 17, ciò che non c'è: una funzione non attiva, un dato, una posizione, la colonna nascosta di un «per ogni»", () => {
  const p = programma(
    [{ name: "v", type: "integer", size: 2, initial: { each: "1" } }, intero("x")],
    [{ id: "b1", kind: "for_each", item: "x", source: "v", body: [scrivi("b2", "x")] }, { id: "b3", kind: "call", callee: "p", arguments: [] }],
    {},
    [{ id: "f1", kind: "procedure", name: "p", data: [intero("c")], body: [], end: { id: "b4" } }],
  );
  const es = fermaSu(p, "b2");
  rifiutata(es, { funzione: "f1", dato: "c", elemento: 0 }, "1", "funzione_non_attiva");
  rifiutata(es, { funzione: "f9", dato: "c", elemento: 0 }, "1", "funzione_non_attiva");
  rifiutata(es, { dato: "nessuno", elemento: 0 }, "1", "dato_sconosciuto");
  rifiutata(es, { dato: testiIt.cicli.indice, elemento: 0 }, "1", "dato_sconosciuto");
  rifiutata(es, { dato: "v", elemento: 2 }, "1", "elemento_sconosciuto");
  rifiutata(es, { dato: "v", elemento: -1 }, "1", "elemento_sconosciuto");
  rifiutata(es, { dato: "x", elemento: 0.5 }, "1", "elemento_sconosciuto");
});

test("caso 18, nell'esecuzione di un caso d'uso: mai, e la tabella resta quella", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1")]);
  const caso = { name: "x", inputs: [], expected: { output: "" } };
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, { caso });
  es.comanda("dentro");
  while (!(es.stato.genere === "pausa" && es.stato.blocco === "b2")) {
    if (es.stato.genere === "pausa") es.comanda("dentro");
    else es.fetta(senzaOrologio, 0);
  }
  rifiutata(es, { dato: "a", elemento: 0 }, "5", "caso");
});

test("caso 19, fuori da una pausa e da una lettura: prima della prima azione, in corso, a esecuzione finita", () => {
  const p = programma([intero("a")], [assegna("b1", "a", "7")]);
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  expect(es.stato.genere).toBe("pronta");
  rifiutata(es, { dato: "a", elemento: 0 }, "5", "non_ora");
  es.comanda("continua");
  expect(es.stato.genere).toBe("in corso");
  rifiutata(es, { dato: "a", elemento: 0 }, "5", "non_ora");
  finoAllaFine(es);
  rifiutata(es, { dato: "a", elemento: 0 }, "5", "non_ora");
});

test("i parametri chiesti prima della prima azione non hanno una riga: non si modifica nulla", () => {
  const p = programma([], [], {}, [{ id: "f1", kind: "procedure", name: "p", data: [intero("x", { parameter: "value" }), intero("y", { parameter: "value" })], body: [], end: { id: "b1" } }]);
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, { funzione: "f1" });
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  es.inserisci("1");
  es.fetta(senzaOrologio, Infinity);
  expect(es.stato).toMatchObject({ genere: "chiede", dato: "y" });
  rifiutata(es, { funzione: "f1", dato: "x", elemento: 0 }, "5", "non_ora");
});

test("senza la tabella (la riproduzione) la modifica vale lo stesso", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1"), scrivi("b3", "a")]);
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, { tabella: false });
  es.comanda("dentro");
  while (!(es.stato.genere === "pausa" && es.stato.blocco === "b2")) {
    if (es.stato.genere === "pausa") es.comanda("dentro");
    else es.fetta(senzaOrologio, 0);
  }
  expect(es.modifica({ dato: "a", elemento: 0 }, "5")).toEqual(ok);
  finoAllaFine(es);
  expect(scritto(es)).toEqual(["5"]);
});

test("un'esecuzione con modifiche non compone un caso d'uso: nessuno ne riotterrebbe l'atteso; senza modifiche sì", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1"), scrivi("b3", "a")]);
  const con = fermaSu(p, "b2");
  con.modifica({ dato: "a", elemento: 0 }, "5");
  finoAllaFine(con);
  expect(casoDallEsecuzione(con)).toEqual({ ok: false, motivo: "valori modificati" });
  const senza = fermaSu(p, "b2");
  finoAllaFine(senza);
  expect(casoDallEsecuzione(senza).ok).toBe(true);
});

// ------------------------------------------------------------------------------------------- le forme, il watch, il CSV

test("la colonna degli altri dice anche un elemento modificato, e il vettore in fila ha il segno", () => {
  const v = { name: "v", type: "integer", size: 12, initial: { each: "0" } };
  const p = programma([v, intero("b")], [assegna("b1", "b", "1"), assegna("b2", "b", "2")]);
  const es = fermaSu(p, "b2");
  es.modifica({ dato: "v", elemento: 11 }, "8");
  const altri = ultimaRiga(es, p, "primi-e-altri")["v[10…11]"]!;
  expect(altri).toEqual({ testo: "v[11] 8", modificata: true });
  expect(ultimaRiga(es, p, "in-fila").v!.modificata).toBe(true);
});

test("il watch ha il valore nuovo e il segno, dalla riga corrente", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "7"), assegna("b2", "b", "1")]);
  const es = fermaSu(p, "b2");
  es.modifica({ dato: "a", elemento: 0 }, "5");
  const w = tabellaDi(p).watch(es.traccia, "a");
  expect(w?.elementi[0]?.cella).toMatchObject({ testo: "5", modificata: true });
});

test("il CSV: una colonna in fondo solo se ci sono modifiche, più valori nella stessa cella, la stessa cella una volta sola dal primo all'ultimo", () => {
  const dati = [intero("a"), { name: "v", type: "integer", size: 2, initial: { each: "1" } }, intero("b")];
  const p = programma(dati, [assegna("b1", "a", "7"), assegna("b2", "b", "1"), scrivi("b3", "a")]);
  const righeDel = (es: Es) => csv(es.traccia, tabellaDi(p), "uguale", ";").replace("\u{feff}", "").trimEnd().split("\r\n").map((r) => r.split(";"));
  const senza = fermaSu(p, "b2");
  expect(righeDel(senza)[0]!.at(-1)).toBe(testiIt.scrive);
  const es = fermaSu(p, "b2");
  es.modifica({ dato: "a", elemento: 0 }, "5");
  es.modifica({ dato: "a", elemento: 0 }, "6");
  es.modifica({ dato: "v", elemento: 1 }, "4");
  finoAllaFine(es);
  const righe = righeDel(es);
  expect(righe[0]!.at(-1)).toBe(testiIt.valoriModificati);
  const conLaModifica = righe.filter((r) => r.at(-1) !== "");
  expect(conLaModifica.slice(1).map((r) => r.at(-1))).toEqual(["a: 7 → 6 · v[1]: 1 → 4"]);
  // Ogni riga ha tante celle quante l'intestazione.
  expect(new Set(righe.map((r) => r.length)).size).toBe(1);
});

test("il CSV: un dato di una funzione ha il nome davanti, un dato senza valore dice che non l'aveva", () => {
  const p = conRiferimento();
  const es = fermaSu(p, "b5");
  es.modifica({ funzione: "f1", dato: "x", elemento: 0 }, "5");
  const testo = csv(es.traccia, tabellaDi(p), "uguale", ";");
  expect(testo).toContain("p › x: 7 → 5");
  const q = programma([intero("a"), intero("b")], [assegna("b1", "b", "1"), assegna("b2", "b", "2")]);
  const altra = fermaSu(q, "b2");
  altra.modifica({ dato: "a", elemento: 0 }, "5");
  expect(csv(altra.traccia, tabellaDi(q), "uguale", ";")).toContain(`a: ${testiIt.nonInizializzata} → 5`);
});
