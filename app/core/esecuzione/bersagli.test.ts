// Che cosa mostra ogni cella della riga corrente, per scriverci un valore a mano: gli elementi, nelle tre forme dei vettori, delle matrici e delle tabelle. Si prova per elementi
// e col nucleo vero: ogni elemento offerto da una cella, scritto, segna quella cella e nessun'altra; e ogni elemento di ogni dato sta in una cella sola. Il testo proposto è il
// valore come lo accetta una lettura, e riscriverlo ridà lo stesso valore. Le parole accanto alla cella («era 3») stanno fuori dal testo: il CSV non cambia.
//
// Che cosa NON guarda: il gesto, il disegno e il colore (`e2e/valore-a-mano.e2e.ts`).

import { expect, test } from "bun:test";
import { tetti } from "../controllo/controllo";
import { opzioniPredefinite } from "../disegno/impaginazione";
import type { CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { Esecuzione } from "./esecuzione";
import { senzaOrologio, type Es } from "./ripartenza-di-prova";
import { testiIt } from "./testi-di-prova";
import { csv, TabellaMostrata, tettoDelleColonne, type FormaDeiVettori, type FormaDelleMatrici, type FormaDelleTabelle } from "./traccia";

const VOTO = { name: "Voto", fields: [{ name: "nome", type: "string" }, { name: "voto", type: "integer" }] };
const intero = (name: string, resto: Record<string, unknown> = {}) => ({ name, type: "integer", ...resto });
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });
const programma = (dati: readonly unknown[], corpo: readonly unknown[], altro: Record<string, unknown> = {}, funzioni: readonly unknown[] = []): Progetto =>
  ({ format: "algodesign", schema_version: 2, metadata: { name: "Prova" }, functions: [{ id: "f0", kind: "main", data: dati, body: corpo, end: { id: "b99" } }, ...funzioni], ...altro }) as unknown as Progetto;

function fermaSu(p: Progetto, blocco: string): Es {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  for (let giri = 0; giri < 100000; giri++) {
    const s = es.stato;
    if (s.genere === "pausa" && s.blocco === blocco) return es;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else throw new Error(`pausa non raggiunta: ${s.genere}`);
  }
  throw new Error("troppi giri");
}

const zero = { each: "0" };
const DI_OGNI_FORMA = (): Progetto =>
  programma(
    [
      intero("a", { initial: "1" }),
      intero("k", { initial: "2", constant: true }),
      intero("corto", { size: 3, initial: zero }),
      intero("lungo", { size: tettoDelleColonne + 2, initial: zero }),
      intero("m", { size: 2, columns: 2, initial: zero }),
      intero("alta", { size: tettoDelleColonne + 1, columns: 2, initial: zero }),
      { name: "r", type: "record", record: "Voto", initial: ['"x"', "0"] },
      { name: "t", type: "record", record: "Voto", size: 2, initial: { each: ['"x"', "0"] } },
      { name: "lunga", type: "record", record: "Voto", size: tettoDelleColonne + 1, initial: { each: ['"x"', "0"] } },
    ],
    [assegna("b1", "a", "3"), assegna("b2", "a", "4")],
    { records: [VOTO] },
  );

const VETTORI: readonly FormaDeiVettori[] = ["primi-e-altri", "in-fila", "per-elemento"];
const MATRICI: readonly FormaDelleMatrici[] = ["per-riga", "per-elemento", "in-fila"];
const TABELLE: readonly FormaDelleTabelle[] = ["per-record", "per-elemento", "per-campo"];
const tabella = (p: Progetto, v: FormaDeiVettori = "per-elemento", m: FormaDelleMatrici = "per-riga", t: FormaDelleTabelle = "per-record") =>
  new TabellaMostrata(p, testiIt, ",", v, "elenco", opzioniPredefinite, undefined, false, m, t);

/** Un testo che il dato accetta: quello proposto, che qui c'è sempre, cambiato. */
const altroTesto = (proposto: string) => (/^-?\d+$/.test(proposto) ? String(Number(proposto) + 1) : `${proposto}!`);

test("in ogni forma, ogni elemento offerto da una cella, scritto, segna quella cella e nessun'altra; e ogni elemento di ogni dato sta in una cella sola", () => {
  const p = DI_OGNI_FORMA();
  let forme = 0;
  let provati = 0;
  for (const v of VETTORI)
    for (const m of MATRICI)
      for (const t of TABELLE) {
        forme++;
        const visti = new Map<string, number>();
        const t0 = tabella(p, v, m, t);
        const es0 = fermaSu(p, "b2");
        expect(t0.righe(es0.traccia).at(-1)!.valori.length).toBe(t0.colonne.length);
        for (let cella = 0; cella < t0.colonne.length; cella++) {
          const b = t0.bersagli(es0.traccia, cella);
          expect(b.genere).toBe("valori");
          if (b.genere !== "valori") continue;
          expect(b.elementi.length).toBeGreaterThan(0);
          for (const e of b.elementi) {
            const chiave = `${e.dato} ${e.elemento}`;
            visti.set(chiave, (visti.get(chiave) ?? 0) + 1);
            if (e.costante) continue;
            provati++;
            // Con un'esecuzione nuova ogni volta: il segno di quest'elemento, solo lui.
            const es = fermaSu(p, "b2");
            expect(es.modifica(e, altroTesto(e.testo))).toEqual({ ok: true });
            const segnate = t0.righe(es.traccia).at(-1)!.valori.flatMap((c, i) => (c.modificata ? [i] : []));
            expect(segnate, `${v} ${m} ${t}: ${e.nome}`).toEqual([cella]);
          }
        }
        // Ogni elemento una volta, per ogni dato: 1 + 1 + 3 + 12 + 4 + 22 + 2 + 4 + 22 valori.
        const attesi = p.functions[0]!.data.flatMap((d) => {
          const campi = d.type === "record" ? 2 : 1;
          const quanti = (d.size ?? 1) * (d.columns ?? 1) * campi;
          return Array.from({ length: quanti }, (_, i) => `${d.name} ${i}`);
        });
        expect([...visti.keys()].sort()).toEqual([...attesi].sort());
        expect([...visti.values()].filter((n) => n !== 1)).toEqual([]);
      }
  console.log(`bersagli: ${forme} combinazioni di forme, ${provati} elementi scritti uno per uno`);
  expect(forme).toBe(VETTORI.length * MATRICI.length * TABELLE.length);
  expect(provati).toBeGreaterThan(forme);
});

test("il nome di una cella con un elemento solo è quello della sua colonna; una cella con più valori li offre tutti, col loro nome", () => {
  const p = DI_OGNI_FORMA();
  const t = tabella(p, "primi-e-altri", "per-riga", "per-record");
  const es = fermaSu(p, "b2");
  const di = (nome: string) => t.bersagli(es.traccia, t.colonne.findIndex((c) => c.nome === nome));
  const nomi = (nome: string) => {
    const b = di(nome);
    return b.genere === "valori" ? b.elementi.map((e) => e.nome) : b.genere;
  };
  expect(nomi("a")).toEqual(["a"]);
  expect(nomi("corto[1]")).toEqual(["corto[1]"]);
  expect(nomi(`lungo[${tettoDelleColonne}…${tettoDelleColonne + 1}]`)).toEqual([`lungo[${tettoDelleColonne}]`, `lungo[${tettoDelleColonne + 1}]`]);
  expect(nomi("m[1]")).toEqual(["m[1][0]", "m[1][1]"]);
  expect(nomi("r.voto")).toEqual(["r.voto"]);
  expect(nomi("t[1]")).toEqual(["t[1].nome", "t[1].voto"]);
});

test("una costante si offre col suo segno: chi la riceve non apre il campo", () => {
  const p = DI_OGNI_FORMA();
  const t = tabella(p);
  const es = fermaSu(p, "b2");
  const b = t.bersagli(es.traccia, t.colonne.findIndex((c) => c.nome === "k"));
  expect(b.genere === "valori" && b.elementi[0]!.costante).toBe(true);
  const a = t.bersagli(es.traccia, t.colonne.findIndex((c) => c.nome === "a"));
  expect(a.genere === "valori" && a.elementi[0]!.costante).toBe(false);
});

test("la condizione e lo scritto non sono valori; la posizione di un ciclo è detta; una costante comune è una costante", () => {
  const p = programma(
    [{ name: "v", type: "integer", size: 2, initial: { each: "0" } }, intero("x"), intero("y")],
    [{ id: "b1", kind: "for_each", item: "x", source: "v", body: [assegna("b2", "y", "1")] }],
    { shared_constants: [intero("C", { constant: true, initial: "9" })] },
  );
  const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", { ...opzioniPredefinite, perOgni: "posizione" });
  const es = fermaSu(p, "b2");
  const n = t.colonne.length;
  expect(t.bersagli(es.traccia, n).genere).toBe("nessuno");
  expect(t.bersagli(es.traccia, n + 1).genere).toBe("nessuno");
  const posizione = t.colonne.findIndex((c) => c.nome === testiIt.cicli!.indice);
  expect(posizione).toBeGreaterThan(0);
  expect(t.bersagli(es.traccia, posizione)).toEqual({ genere: "posizione", nome: testiIt.cicli!.indice });
  const c = t.bersagli(es.traccia, t.colonne.findIndex((x) => x.nome === "C"));
  expect(c.genere === "valori" && c.elementi[0]!.costante).toBe(true);
});

const conFunzione = () =>
  programma(
    [intero("a", { initial: "7" })],
    [{ id: "b1", kind: "call", callee: "p", arguments: ["a"] }, assegna("b2", "a", "1")],
    {},
    [{ id: "f1", kind: "procedure", name: "p", data: [intero("x", { parameter: "reference" }), intero("c")], body: [assegna("b4", "c", "1"), assegna("b5", "c", "2")], end: { id: "b6" } }],
  );

test("un parametro per riferimento: il campo propone il valore, non «7 (a)»; il bersaglio è della funzione del gruppo", () => {
  const p = conFunzione();
  const t = tabella(p);
  const es = fermaSu(p, "b5");
  const cella = t.colonne.findIndex((c) => c.funzione === "p" && c.nome === "x");
  expect(t.righe(es.traccia).at(-1)!.valori[cella]!.testo).toBe("7 (a)");
  const b = t.bersagli(es.traccia, cella);
  expect(b).toEqual({ genere: "valori", elementi: [{ funzione: "f1", dato: "x", elemento: 0, nome: "x", testo: "7", costante: false }] });
});

test("una funzione non attiva non offre nulla", () => {
  const p = conFunzione();
  const t = tabella(p);
  const es = fermaSu(p, "b2");
  const cella = t.colonne.findIndex((c) => c.funzione === "p" && c.nome === "x");
  expect(t.bersagli(es.traccia, cella).genere).toBe("nessuno");
  // Il controllo positivo: il dato della radice sì.
  expect(t.bersagli(es.traccia, t.colonne.findIndex((c) => c.nome === "a")).genere).toBe("valori");
});

test("la radice che richiama sé stessa: il valore della chiamata più profonda, quella che il gruppo mostra e che la scrittura raggiunge", () => {
  const p = programma([], [{ id: "b0", kind: "write", values: ['"via"'], newline: true }], {}, [
    {
      id: "f1",
      kind: "procedure",
      name: "r",
      data: [intero("n", { parameter: "value" })],
      body: [{ id: "b2", kind: "if", condition: "n > 0", then: [{ id: "b3", kind: "call", callee: "r", arguments: ["n - 1"] }], else: [] }, { id: "b4", kind: "write", values: ["n"], newline: true }],
      end: { id: "b5" },
    },
  ]);
  const opzioni = { funzione: "f1" };
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, opzioni);
  for (let giri = 0; giri < 1000; giri++) {
    const s = es.stato;
    if (s.genere === "pausa" && s.blocco === "b4") break;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") es.inserisci("1");
    else throw new Error(s.genere);
  }
  const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniPredefinite, "f1");
  const cella = t.colonne.findIndex((c) => c.nome === "n");
  const b = t.bersagli(es.traccia, cella);
  expect(b.genere === "valori" && b.elementi[0]!.testo).toBe("0");
  expect(b.genere === "valori" && es.modifica(b.elementi[0]!, "9")).toEqual({ ok: true });
  expect(t.righe(es.traccia).at(-1)!.valori[cella]!.testo).toBe("9");
});

test("il testo proposto, ridato alla scrittura, ridà lo stesso valore: ogni tipo, i reali coi loro casi difficili, nessun valore", () => {
  const dati = [
    intero("i", { initial: "-5" }),
    { name: "b", type: "boolean", initial: "true" },
    { name: "c", type: "character", initial: "'z'" },
    { name: "s", type: "string", initial: '"due parole"' },
    { name: "x", type: "real" },
    intero("vuoto"),
  ];
  const p = programma(dati, [assegna("b1", "i", "-5"), assegna("b2", "i", "-5")]);
  const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniPredefinite);
  const es = fermaSu(p, "b2");
  const testoDi = (nome: string) => {
    const b = t.bersagli(es.traccia, t.colonne.findIndex((c) => c.nome === nome));
    return b.genere === "valori" ? b.elementi[0]!.testo : "";
  };
  expect([testoDi("i"), testoDi("b"), testoDi("c"), testoDi("s")]).toEqual(["-5", "true", "z", "due parole"]);
  // Nessun valore: il campo è vuoto.
  expect(testoDi("vuoto")).toBe("");
  // Coi decimali del progetto la cella taglia e ha la virgola; il campo ha il punto e tutte le cifre, e riscrive lo stesso numero.
  const casi: readonly (readonly [string, number])[] = [
    ["1.5", 1.5],
    ["0.1", 0.1],
    ["1.0e+21", 1e21],
    ["1.0e-7", 1e-7],
    ["-2.5", -2.5],
    ["-0", -0],
    ["3", 3],
    ["0.30000000000000004", 0.1 + 0.2],
  ];
  for (const [atteso, valore] of casi) {
    expect(es.modifica({ dato: "x", elemento: 0 }, atteso)).toEqual({ ok: true });
    expect(Object.is(valoreDi(es, "x"), valore), atteso).toBe(true);
    const proposto = testoDi("x");
    expect(proposto, atteso).toBe(atteso);
    expect(es.modifica({ dato: "x", elemento: 0 }, proposto)).toEqual({ ok: true });
    expect(Object.is(valoreDi(es, "x"), valore), `${atteso} riscritto`).toBe(true);
  }
});

const valoreDi = (es: Es, nome: string) => {
  const f = es.traccia.righe.at(-1)!.dati;
  return f.valori[f.nomi.indexOf(nome)]![0]!.v;
};

test("le parole accanto al valore: «era 3» sulla cella, il primo valore se scritto due volte, nulla sulla riga dopo; il testo e il CSV non le hanno", () => {
  const p = programma([intero("a"), intero("b")], [assegna("b1", "a", "3"), assegna("b2", "b", "1"), assegna("b3", "b", "2")]);
  const t = tabella(p);
  const es = fermaSu(p, "b2");
  es.modifica({ dato: "a", elemento: 0 }, "100");
  es.modifica({ dato: "a", elemento: 0 }, "200");
  const r = t.righe(es.traccia).at(-1)!;
  expect(r.valori[0]).toMatchObject({ testo: "200", modificata: true, era: "era 3" });
  expect(r.valori[1]!.era).toBeUndefined();
  const scritto = csv(es.traccia, t, "uguale", ";");
  expect(scritto).not.toContain("era ");
  es.comanda("dentro");
  es.fetta(senzaOrologio, Infinity);
  const dopo = t.righe(es.traccia).at(-1)!;
  expect(dopo.valori[0]!.modificata).toBeUndefined();
  expect(dopo.valori[0]!.era).toBeUndefined();
  // Il valore di prima che non c'era: la parola della tabella.
  const vuoto = fermaSu(p, "b1");
  expect(tabella(p).righe(vuoto.traccia).at(-1)!.valori[1]!.testo).toBe(testiIt.nonInizializzata);
  vuoto.modifica({ dato: "b", elemento: 0 }, "5");
  expect(tabella(p).righe(vuoto.traccia).at(-1)!.valori[1]!.era).toBe(`era ${testiIt.nonInizializzata}`);
});

test("in fila: il segno è sul pezzo dell'elemento e le parole hanno il suo nome; la colonna degli altri, anche nella riga del valore iniziale", () => {
  const p = programma([intero("m", { size: 2, columns: 3, initial: zero }), intero("v", { size: tettoDelleColonne + 3, initial: zero }), intero("b")], [assegna("b1", "b", "1"), assegna("b2", "b", "2")]);
  const t = tabella(p, "primi-e-altri", "per-riga");
  const es = fermaSu(p, "b2");
  es.modifica({ dato: "m", elemento: 4 }, "9");
  es.modifica({ dato: "v", elemento: tettoDelleColonne + 1 }, "8");
  const r = t.righe(es.traccia).at(-1)!;
  const riga1 = r.valori[t.colonne.findIndex((c) => c.nome === "m[1]")]!;
  expect(riga1.pezzi).toEqual([{ testo: "0 · ", cambiato: false }, { testo: "9", cambiato: false, modificato: true }, { testo: " · 0", cambiato: false }]);
  expect(riga1.testo).toBe("0 · 9 · 0");
  expect(riga1.modificata).toBe(true);
  expect(riga1.era).toBe("m[1][1] era 0");
  const riga0 = r.valori[t.colonne.findIndex((c) => c.nome === "m[0]")]!;
  expect(riga0.modificata).toBeUndefined();
  expect(riga0.pezzi).toEqual([{ testo: "0 · 0 · 0", cambiato: false }]);
  const altri = r.valori[t.colonne.findIndex((c) => c.nome.startsWith(`v[${tettoDelleColonne}…`))]!;
  expect(altri.modificata).toBe(true);
  expect(altri.era).toBe(`v[${tettoDelleColonne + 1}] era 0`);
  // La riga di un valore iniziale: la colonna degli altri di quel vettore ha l'elenco.
  const iniziale = fermaSu(p, "b1");
  const dellIniziale = t.righe(iniziale.traccia).at(-1)!;
  const nomeAltri = t.colonne.findIndex((c) => c.nome.startsWith(`v[${tettoDelleColonne}…`));
  expect(dellIniziale.valori[nomeAltri]!.testo).toContain("←");
  expect(iniziale.modifica({ dato: "v", elemento: tettoDelleColonne }, "4")).toEqual({ ok: true });
  const segnata = t.righe(iniziale.traccia).at(-1)!.valori[nomeAltri]!;
  expect(segnata.modificata).toBe(true);
  expect(segnata.era).toBe(`v[${tettoDelleColonne}] era 0`);
});

test("un parametro per riferimento scritto a mano: la cella con più valori di chi chiama dice il nome del suo elemento, quella della funzione il suo, e il CSV la funzione", () => {
  const p = programma(
    [intero("v", { size: 4, initial: zero }), intero("w", { size: 2, initial: zero })],
    [{ id: "b1", kind: "call", callee: "p", arguments: ["v[3]", "w"] }, assegna("b2", "v[0]", "1")],
    {},
    [
      {
        id: "f1",
        kind: "procedure",
        name: "p",
        data: [intero("x", { parameter: "reference" }), intero("u", { parameter: "reference", size: 2 }), intero("c")],
        body: [assegna("b4", "c", "1"), assegna("b5", "c", "2")],
        end: { id: "b6" },
      },
    ],
  );
  const t = tabella(p, "in-fila");
  const es = fermaSu(p, "b5");
  expect(es.modifica({ funzione: "f1", dato: "x", elemento: 0 }, "9")).toEqual({ ok: true });
  expect(es.modifica({ funzione: "f1", dato: "u", elemento: 1 }, "5")).toEqual({ ok: true });
  const r = t.righe(es.traccia).at(-1)!;
  const di = (funzione: string | undefined, nome: string) => r.valori[t.colonne.findIndex((c) => c.funzione === funzione && c.nome === nome)]!;
  expect(di(undefined, "v").era).toBe("v[3] era 0");
  expect(di(undefined, "w").era).toBe("w[1] era 0");
  // Nel gruppo della funzione il nome del suo parametro, con la funzione davanti, come prima.
  expect(di("p", "u").era).toBe("p › u[1] era 0");
  // Il controllo positivo: il CSV elenca le modifiche come sono state fatte, coi nomi della funzione.
  expect(r.modificati).toBe("p › x: 0 → 9 · p › u[1]: 0 → 5");
});

test("il watch ha le stesse parole: un dato semplice e l'elemento di un vettore", () => {
  const p = programma([intero("a", { initial: "1" }), intero("v", { size: 2, initial: zero })], [assegna("b1", "a", "3"), assegna("b2", "a", "4")]);
  const t = tabella(p);
  const es = fermaSu(p, "b2");
  es.modifica({ dato: "a", elemento: 0 }, "100");
  es.modifica({ dato: "v", elemento: 1 }, "5");
  expect(t.watch(es.traccia, "a")!.elementi[0]!.cella).toMatchObject({ testo: "100", modificata: true, era: "era 3" });
  const v = t.watch(es.traccia, "v")!.elementi;
  expect(v[1]!.cella).toMatchObject({ testo: "5", modificata: true, era: "era 0" });
  expect(v[0]!.cella.era).toBeUndefined();
});
