// Il caso d'uso composto da un'esecuzione finita. La prova del corpus: ogni caso eseguito come esecuzione LIBERA, con le
// sue voci scritte a mano una lettura alla volta, compone un caso uguale a quello del file (voci, output, errore,
// avvisi); quelli che un'esecuzione libera non può rifare si contano per motivo, con l'atteso scritto prima: l'errore
// statico (non parte), una riga non valida (la libera la richiede), le voci finite (la libera aspetta). Poi le regole,
// una per prova: quando non si compone, la riga letta intera anche dove la console la spezza, «a ogni elemento», il
// programma che non cambia coi casi d'uso, il caso uguale.
//
// CHE COSA NON GUARDA:
// - dove l'interfaccia mette il caso (la radice, non la scheda mostrata), il fuoco e la casella: `ui/casi/dall-esecuzione.test.tsx`;
// - che il caso salvato, rieseguito, sia raggiunto: lo è per costruzione dell'uguaglianza col file, i cui casi la porta
//   «casi» del collaudo trova raggiunti.

import { expect, test } from "bun:test";
import { confermato } from "../../strumenti/corpus";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../controllo/controllo";
import { Esecuzione, type OpzioniDellEsecuzione } from "../esecuzione/esecuzione";
import { senzaValore } from "../interprete/interprete";
import { apri, leggi } from "../progetto/formato";
import type { CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { casoDallEsecuzione, casoUguale, stessoProgramma, type DallEsecuzione } from "./dall-esecuzione";
import { comeTesto } from "./esito";
import { eseguiCaso } from "./esecutore";

const corpus = join(import.meta.dir, "..", "..", "casi");

type Motivo = "uguale" | "errore statico" | "riga non valida" | "voci finite";

/** Il caso eseguito come esecuzione libera: le sue voci date a mano, una per lettura, finché finisce; o il motivo per
 * cui una libera non lo rifà. */
function comeLibera(p: Progetto, caso: CasoDiUnaFunzione, funzione?: string): { composto: DallEsecuzione } | { motivo: Exclude<Motivo, "uguale"> } {
  if (caso.expected.static_error) return { motivo: "errore statico" };
  // Senza la tabella di traccia, che il caso composto non usa (con la tabella la prova costa il doppio, come i casi della
  // riga di comando).
  const e = new Esecuzione<CasoDiUnaFunzione>(p, tetti, { tabella: false, ...(funzione ? { funzione } : {}) });
  e.comanda("continua");
  let k = 0;
  for (;;) {
    e.fetta(() => 0, Infinity);
    const s = e.stato;
    if (s.genere === "finita") return { composto: casoDallEsecuzione(e) };
    if (s.genere !== "chiede") throw new Error(`esecuzione ${s.genere}`);
    if (s.nonValido) return { motivo: "riga non valida" };
    const v = caso.inputs[k++];
    if (v === undefined) return { motivo: "voci finite" };
    if (v.data !== s.dato) throw new Error(`la voce di ${v.data} a una lettura di ${s.dato}`);
    const testo = v.text ?? senzaValore;
    e.inserisci(v.each ? { ognuno: testo } : testo);
  }
}

/** Le voci e l'atteso come si confrontano: gli avvisi in ordine, come li confronta l'esito. */
const comeFile = (c: { readonly inputs: CasoDiUnaFunzione["inputs"]; readonly expected: CasoDiUnaFunzione["expected"] }) => ({
  inputs: c.inputs.map((v) => ({ data: v.data, ...(v.text !== undefined ? { text: v.text } : {}), ...(v.each ? { each: true } : {}) })),
  output: c.expected.output,
  error: comeTesto(c.expected.error),
  warnings: (c.expected.warnings ?? []).map(comeTesto).sort(),
});

test("ogni caso del corpus rifatto come esecuzione libera compone il caso del file: voci, output, errore, avvisi", () => {
  const conta = new Map<Motivo, number>();
  const diversi: string[] = [];
  let totale = 0;
  for (const tappa of readdirSync(corpus).filter((n) => n.startsWith("tappa-")).sort())
    for (const nome of readdirSync(join(corpus, tappa)).sort()) {
      const aperto = apri(readFileSync(join(corpus, tappa, nome), "utf8"));
      if (!aperto.ok) throw new Error(`${tappa}/${nome} non si apre`);
      const p = aperto.progetto;
      const suoi = [...(p.test_cases ?? []).map((caso) => ({ caso, funzione: undefined as string | undefined })), ...p.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ caso, funzione: f.id as string | undefined })))];
      for (const { caso, funzione } of suoi) {
        totale++;
        const r = comeLibera(p, caso, funzione);
        if ("motivo" in r) {
          conta.set(r.motivo, (conta.get(r.motivo) ?? 0) + 1);
          continue;
        }
        const id = `${tappa}/${nome}#${funzione ?? ""}/${caso.name}`;
        if (!r.composto.ok) diversi.push(`${id}: non si compone (${r.composto.motivo})`);
        else if (JSON.stringify(comeFile(r.composto)) !== JSON.stringify(comeFile(caso))) diversi.push(`${id}: ${JSON.stringify(comeFile(r.composto))}`);
        else conta.set("uguale", (conta.get("uguale") ?? 0) + 1);
      }
    }
  const riga = `totale ${totale}: uguali ${conta.get("uguale") ?? 0}, esclusi errore statico ${conta.get("errore statico") ?? 0}, riga non valida ${conta.get("riga non valida") ?? 0}, voci finite ${conta.get("voci finite") ?? 0}`;
  console.log(riga);
  expect(diversi).toEqual([]);
  // Il conteggio del corpus, confermato: un caso nuovo lo cambia, e `bun run conferma-corpus` lo registra.
  expect(riga).toBe(confermato("casi dalla esecuzione - riga del totale", riga));
}, 30_000);

type Json = any;
function programma(data: Json[], body: Json[], altre: Json[] = []): Progetto {
  const esito = leggi({ format: "algodesign", schema_version: 2, metadata: { name: "prova" }, functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }, ...altre] });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
/** Legge `s` e la riscrive, due volte. */
const leggeEScrive = programma(
  [{ name: "s", type: "string", role: "input" }],
  [
    { id: "b1", kind: "read", target: "s" },
    { id: "b2", kind: "write", values: ["s"], newline: true },
    { id: "b3", kind: "read", target: "s" },
    { id: "b4", kind: "write", values: ["s"], newline: true },
  ],
);

/** L'esecuzione libera di `p` portata avanti con le righe date, una per lettura. */
function libera(p: Progetto, righe: readonly string[], opzioni: OpzioniDellEsecuzione<CasoDiUnaFunzione> = {}): Esecuzione<CasoDiUnaFunzione> {
  const e = new Esecuzione<CasoDiUnaFunzione>(p, tetti, opzioni);
  e.comanda("continua");
  let k = 0;
  for (e.fetta(() => 0, Infinity); e.stato.genere === "chiede" && k < righe.length; e.fetta(() => 0, Infinity)) e.inserisci(righe[k++]!);
  return e;
}

test("finita, compone le voci col dato, l'output con gli a capo e nessun errore", () => {
  expect(casoDallEsecuzione(libera(leggeEScrive, ["uno", "due"]))).toEqual({ ok: true, inputs: [{ data: "s", text: "uno" }, { data: "s", text: "due" }], expected: { output: "uno\ndue\n" } });
});

test("non finita non si compone: prima della prima azione, in attesa di una riga, in pausa", () => {
  const pronta = new Esecuzione<CasoDiUnaFunzione>(leggeEScrive, tetti);
  expect(casoDallEsecuzione(pronta)).toEqual({ ok: false, motivo: "non finita" });
  expect(casoDallEsecuzione(libera(leggeEScrive, ["uno"]))).toEqual({ ok: false, motivo: "non finita" });
  const pausa = new Esecuzione<CasoDiUnaFunzione>(leggeEScrive, tetti);
  pausa.comanda("sopra");
  pausa.fetta(() => 0, Infinity);
  expect(pausa.stato.genere).toBe("pausa");
  expect(casoDallEsecuzione(pausa)).toEqual({ ok: false, motivo: "non finita" });
});

test("l'esecuzione di un caso d'uso non si compone, e non tiene le righe lette", () => {
  const caso: CasoDiUnaFunzione = { name: "c", inputs: [{ data: "s", text: "uno" }, { data: "s", text: "due" }], expected: { output: "uno\ndue\n" } };
  const e = new Esecuzione<CasoDiUnaFunzione>(leggeEScrive, tetti, { caso });
  e.comanda("continua");
  e.fetta(() => 0, Infinity);
  expect(e.stato.genere).toBe("finita");
  expect(e.lette).toEqual([]);
  expect(casoDallEsecuzione(e)).toEqual({ ok: false, motivo: "caso" });
});

test("con righe tolte dalla console non si compone; con tutte le righe sì", () => {
  // Quattro righe scritte e due lette: con un tetto di 3 la console ne toglie, con 6 le tiene tutte.
  expect(casoDallEsecuzione(libera(leggeEScrive, ["uno", "due"], { righe: 3 }))).toEqual({ ok: false, motivo: "output perso" });
  expect(casoDallEsecuzione(libera(leggeEScrive, ["uno", "due"], { righe: 6 })).ok).toBe(true);
});

test("con una riga tenuta dalla fine non si compone", () => {
  const e = libera(leggeEScrive, ["abcdef", "x"], { righeLunghe: { caratteri: 3, modo: "la-fine" } });
  expect(e.console.some((v) => "tagliata" in v && v.tagliata)).toBe(true);
  expect(casoDallEsecuzione(e)).toEqual({ ok: false, motivo: "output perso" });
});

test("una riga NON VALIDA tenuta dalla fine non toglie nulla all'output: si compone", () => {
  // Legge un intero e lo riscrive: una riga di 300 lettere non è un intero, e la console la tiene dalla fine anche col
  // modo predefinito; l'output (le sole righe scritte) è intero.
  const leggeUnIntero = programma(
    [{ name: "n", type: "integer", role: "input" }],
    [
      { id: "b1", kind: "read", target: "n" },
      { id: "b2", kind: "write", values: ["n"], newline: true },
    ],
  );
  const e = libera(leggeUnIntero, ["x".repeat(300), "5"]);
  // Premessa: la riga non valida è tagliata.
  expect(e.console.some((v) => v.genere !== "scrive" && "tagliata" in v && v.tagliata)).toBe(true);
  expect(casoDallEsecuzione(e)).toMatchObject({ ok: true, expected: { output: "5\n" } });
});

test("una riga letta più lunga di una riga della console è una voce intera, e l'output spezzato torna intero", () => {
  const e = libera(leggeEScrive, ["abcdefg", "x"], { righeLunghe: { caratteri: 3, modo: "a-capo" } });
  // La console spezza la riga letta in tre righe «letto»: le voci non si prendono da lì.
  expect(e.console.filter((v) => v.genere === "letto").length).toBe(4);
  expect(casoDallEsecuzione(e)).toEqual({ ok: true, inputs: [{ data: "s", text: "abcdefg" }, { data: "s", text: "x" }], expected: { output: "abcdefg\nx\n" } });
});

test("l'errore dell'esito e gli avvisi del controllo entrano nell'atteso", () => {
  const p = programma(
    [
      { name: "n", type: "integer", role: "input" },
      { name: "z", type: "integer", initial: "0" },
      { name: "inutile", type: "integer" },
    ],
    [
      { id: "b1", kind: "read", target: "n" },
      { id: "b2", kind: "write", values: ["n / z"], newline: true },
    ],
  );
  const e = libera(p, ["7"]);
  const r = casoDallEsecuzione(e);
  const c = e.controllo;
  if (c.fuoriTappa) throw new Error("fuori tappa");
  expect(c.avvisi.length).toBeGreaterThan(0);
  expect(r).toEqual({ ok: true, inputs: [{ data: "n", text: "7" }], expected: { output: "", error: { code: "division_by_zero", block: "b2" }, warnings: c.avvisi } });
});

test("«a ogni elemento» di un parametro vettore resta una voce sola con each", () => {
  const p = programma([], [], [
    {
      id: "f2",
      kind: "procedure",
      name: "mostra",
      data: [
        { name: "v", type: "integer", size: 3, parameter: "value" },
        { name: "x", type: "integer" },
      ],
      body: [{ id: "c1", kind: "for_each", item: "x", source: "v", body: [{ id: "c2", kind: "write", values: ["x"], newline: false }] }],
      end: { id: "c3" },
    },
  ]);
  const e = new Esecuzione<CasoDiUnaFunzione>(p, tetti, { funzione: "f2" });
  e.comanda("continua");
  e.fetta(() => 0, Infinity);
  const s = e.stato;
  if (s.genere !== "chiede") throw new Error(`esecuzione ${s.genere}`);
  expect(s.elemento).toBe(0);
  e.inserisci({ ognuno: "4" });
  e.fetta(() => 0, Infinity);
  const r = casoDallEsecuzione(e);
  if (!r.ok) throw new Error(r.motivo);
  expect(r.inputs).toEqual([{ data: s.dato, text: "4", each: true }]);
  expect(r.expected.output).toBe("444");
});

test("un parametro matrice: «a ogni elemento» una voce sola con each, elemento per elemento una voce per elemento riga dopo riga; il caso composto si rifà uguale", () => {
  const p = programma([], [], [
    {
      id: "f2",
      kind: "procedure",
      name: "seconda",
      data: [
        { name: "m", type: "integer", size: 2, columns: 2, parameter: "value" },
        { name: "x", type: "integer" },
      ],
      body: [{ id: "c1", kind: "for_each", item: "x", source: "m[1]", body: [{ id: "c2", kind: "write", values: ["x"], newline: false }] }],
      end: { id: "c3" },
    },
  ]);
  /** L'esecuzione della procedura da sola con le righe date, e il caso che ne compone. */
  const eseguita = (righe: readonly (string | { ognuno: string })[]) => {
    const e = new Esecuzione<CasoDiUnaFunzione>(p, tetti, { funzione: "f2" });
    e.comanda("continua");
    const elementi: number[] = [];
    for (const riga of righe) {
      e.fetta(() => 0, Infinity);
      const s = e.stato;
      if (s.genere !== "chiede") throw new Error(`esecuzione ${s.genere}`);
      elementi.push(s.elemento!);
      e.inserisci(riga);
    }
    e.fetta(() => 0, Infinity);
    const r = casoDallEsecuzione(e);
    if (!r.ok) throw new Error(r.motivo);
    return { r, elementi };
  };
  const ripetuto = eseguita([{ ognuno: "4" }]);
  expect(ripetuto.r.inputs).toEqual([{ data: "m", text: "4", each: true }]);
  expect(ripetuto.r.expected.output).toBe("44");
  const unoPerUno = eseguita(["1", "2", "3", "5"]);
  expect(unoPerUno.elementi).toEqual([0, 1, 2, 3]);
  expect(unoPerUno.r.inputs).toEqual(["1", "2", "3", "5"].map((text) => ({ data: "m", text })));
  expect(unoPerUno.r.expected.output).toBe("35");
  // Il caso composto, rieseguito come caso d'uso, è raggiunto; controllo positivo: con un elemento cambiato no.
  const caso = (inputs: CasoDiUnaFunzione["inputs"]): CasoDiUnaFunzione => ({ name: "c", inputs, expected: unoPerUno.r.expected });
  const raggiunto = (inputs: CasoDiUnaFunzione["inputs"]) => {
    const esito = eseguiCaso(p, caso(inputs), tetti, "f2");
    return "raggiunto" in esito && esito.raggiunto;
  };
  expect(raggiunto(unoPerUno.r.inputs)).toBe(true);
  expect(raggiunto([...unoPerUno.r.inputs.slice(0, 3), { data: "m", text: "6" }])).toBe(false);
});

test("lo stesso programma: un caso d'uso o i metadati cambiati no, un blocco cambiato sì", () => {
  const conUnCaso: Progetto = { ...leggeEScrive, metadata: { name: "altro" }, test_cases: [{ name: "c", inputs: [], expected: { output: "" } }] };
  expect(stessoProgramma(leggeEScrive, conUnCaso)).toBe(true);
  const cambiato: Progetto = { ...leggeEScrive, functions: leggeEScrive.functions.map((f) => ({ ...f, body: f.body.slice(0, 2) })) };
  expect(stessoProgramma(leggeEScrive, cambiato)).toBe(false);
});

test("il caso uguale: stesse voci e stesso atteso, il nome e la descrizione non contano; gli avvisi in ordine", () => {
  const a = { code: "unused_data", block: "f1" } as const;
  const b = { code: "unused_data", block: "f2" } as const;
  const casi: CasoDiUnaFunzione[] = [
    { name: "primo", inputs: [{ data: "s", text: "uno" }], expected: { output: "uno\n" } },
    { name: "secondo", description: "d", inputs: [{ data: "s", text: "due" }], expected: { output: "due\n", warnings: [a, b] } },
  ];
  expect(casoUguale(casi, { inputs: [{ data: "s", text: "due" }], expected: { output: "due\n", warnings: [b, a] } })).toBe(1);
  expect(casoUguale(casi, { inputs: [{ data: "s", text: "due" }], expected: { output: "due\n" } })).toBe(-1);
  expect(casoUguale(casi, { inputs: [{ data: "s", text: "uno", each: true }], expected: { output: "uno\n" } })).toBe(-1);
});
