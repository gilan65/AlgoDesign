// «Accademico» contro gli attesi scritti a mano (`attesi-di-accademico.ts`), l'esito di ogni file del corpus, le
// mancanze appaiate con un secondo rilevatore scritto qui, e la provenienza delle righe. «Accademico» non si esegue: il
// suo oracolo sono quegli attesi.
//
// Che cosa queste prove NON guardano:
// - il testo dei file del corpus senza atteso scritto, se non per la provenienza delle righe;
// - che il testo sia letto come lo leggerebbe uno studente delle Selezioni scolastiche (è la prova ad andata e ritorno
//   col lettore, di un'altra consegna);
// - i testi per chi legge le mancanze, che sono dell'interfaccia.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../../core/controllo/controllo";
import { analizza, type Espressione } from "../../core/espressioni/analizzatore";
import { accademico, mancanzeDiAccademico } from "../../core/genera/accademico";
import { testoDelCodice, type Mancanza, type Riga } from "../../core/genera/forma";
import type { LinguaDelCodice } from "../../core/genera/nomi";
import { apri } from "../../core/progetto/formato";
import type { Blocco, Dato, Progetto } from "../../core/progetto/modello";
import { conErroriStatici, conIlCodice, delCorpus, formeDiAccademico, formeDiAccademicoAttese, type Atteso } from "./attesi-di-accademico";

const lingue: readonly LinguaDelCodice[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, `${percorso}.algo`), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};
// Le tappe e i tipi (`tipi/`: i record, che «Accademico» non ha e dice fra ciò che manca).
const corpus = readdirSync(cartella, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (d.name.startsWith("tappa-") || d.name === "tipi"))
  .flatMap((d) => readdirSync(join(cartella, d.name)).filter((f) => f.endsWith(".algo")).map((f) => `${d.name}/${f.slice(0, -".algo".length)}`))
  .sort();

function righe(p: Progetto, lingua: LinguaDelCodice): readonly Riga[] {
  const g = accademico(p, tetti, lingua);
  if (!g.generato) throw new Error(`${p.metadata.name} non generato: ${g.perche}`);
  return g.righe;
}

/** Il confronto col messaggio che nomina la prima riga diversa, con le due forme. */
function uguale(generato: string, atteso: string, chi: string) {
  if (generato === atteso) return;
  const g = generato.split("\n");
  const a = atteso.split("\n");
  const k = Math.max(0, g.findIndex((x, i) => x !== a[i]));
  throw new Error(`${chi}, riga ${k + 1}: atteso «${a[k] ?? "(nessuna)"}», generato «${g[k] ?? "(nessuna)"}»`);
}

const provaAttesi = (chi: string, p: () => Progetto, atteso: Atteso) => {
  for (const l of lingue) test(`${chi} (${l})`, () => uguale(testoDelCodice(righe(p(), l)), atteso[l], `${chi} (${l})`));
};

describe("«Accademico» uguale all'atteso scritto a mano", () => {
  for (const [percorso, atteso] of Object.entries(delCorpus)) provaAttesi(percorso, () => leggi(percorso), atteso);
  provaAttesi("forme di Accademico", () => formeDiAccademico, formeDiAccademicoAttese);

  // Le fini del `for` che non sono un letterale: `n` dà `n + 1`, `n - 3` dà `n - 2`, `n - 0` dà `n + 1`.
  const per = (id: string, counter: string, to: string): Blocco => ({ id, kind: "for", counter, from: "1", to, body: [{ id: `${id}s`, kind: "write", values: [counter], newline: true }] });
  const fini: Progetto = {
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "fini del per" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "n", type: "integer", initial: "5" }, { name: "a", type: "integer" }, { name: "b", type: "integer" }, { name: "c", type: "integer" }],
        body: [per("b1", "a", "n"), per("b2", "b", "n - 3"), per("b3", "c", "n - 0")],
        end: { id: "b4" },
      },
    ],
  };
  const fineAttesa = [
    "variable n: integer",
    "n ← 5",
    "for a in [1 ... n + 1) do",
    "    output(a)",
    "end for",
    "for b in [1 ... n - 2) do",
    "    output(b)",
    "end for",
    "for c in [1 ... n + 1) do",
    "    output(c)",
    "end for",
    "",
  ].join("\n");
  provaAttesi("le fini del per", () => fini, { it: fineAttesa, en: fineAttesa });

  test("il campione: i cinque esempi forniti che ci stanno, più un file per costrutto", () => {
    expect(Object.keys(delCorpus).length).toBe(15);
    const esempi = ["tappa-1/overflow-fattoriale", "tappa-1/condizione-intero", "tappa-1/condizione-booleano", "tappa-3/tre-livelli", "tappa-4/ricorsione-senza-uscita"];
    for (const e of esempi) expect(Object.keys(delCorpus)).toContain(e);
  });
});

// ------------------------------------------------------------------- il secondo rilevatore delle mancanze

const parole = new Set(["function", "return", "if", "then", "else", "for", "in", "while", "do", "end", "variable", "and", "or", "not", "mod", "output", "min", "max", "integer"]);
const operatori: Readonly<Record<string, string>> = {
  raised_to: "potenza", square_root: "radice", absolute_value: "valore-assoluto", round: "arrotondamento", round_down: "arrotondamento",
  round_up: "arrotondamento", integer_part: "arrotondamento", to_integer: "conversione", to_real: "conversione", to_character: "conversione",
  to_array: "conversione", to_string: "conversione", length: "lunghezza",
};
const daTipo: Readonly<Record<string, string>> = { real: "reale", character: "carattere", string: "stringa", record: "record" };

/** Le mancanze come chiavi `specie|operatore|blocco|dato|funzione`, contate a modo suo: un insieme, senza ordine. */
function secondoRilevatore(p: Progetto): Set<string> {
  const s = new Set<string>();
  const chiave = (specie: string, o: { operatore?: string; blocco?: string; dato?: string; funzione?: string }) =>
    s.add(`${specie}|${o.operatore ?? ""}|${o.blocco ?? ""}|${o.dato ?? ""}|${o.funzione ?? ""}`);
  const suiDati = (dati: readonly Dato[], funzione?: string) => {
    for (const d of dati) {
      const o = { dato: d.name, ...(funzione ? { funzione } : {}) };
      if (daTipo[d.type]) chiave(daTipo[d.type]!, o);
      if (d.parameter === "reference") chiave("rif", o);
      if (d.parameter === "out") chiave("out", o);
      if (parole.has(d.name)) chiave("parola-del-linguaggio", o);
    }
  };
  suiDati(p.shared_constants ?? []);
  for (const f of p.functions) {
    const funzione = f.kind === "main" ? undefined : f.id;
    if (f.name && parole.has(f.name)) chiave("parola-del-linguaggio", { funzione: f.id });
    if (f.return_type && daTipo[f.return_type]) chiave(daTipo[f.return_type]!, { funzione: f.id });
    suiDati(f.data, funzione);
    const booleani = new Set([...(p.shared_constants ?? []), ...f.data].filter((d) => d.type === "boolean").map((d) => d.name));
    /** `permessa`: una condizione qui è ammessa (dopo `if`/`while`, tutto il valore che riceve un booleano o che si scrive). */
    const scorri = (e: Espressione, blocco: string, permessa: boolean, scritta: boolean) => {
      if (e.genere === "reale") chiave("letterale-reale", { blocco });
      if (e.genere === "carattere") chiave("letterale-carattere", { blocco });
      if (e.genere === "pi") chiave("pi", { blocco });
      if (e.genere === "stringa" && !scritta) chiave("letterale-stringa", { blocco });
      const logico = e.genere === "unario" ? e.operatore === "not" : e.genere === "binario" && (e.operatore === "and" || e.operatore === "or");
      const confronto = e.genere === "binario" && ["<", "<=", ">", ">=", "==", "!="].includes(e.operatore);
      if ((logico || confronto) && !permessa) chiave("condizione-come-valore", { blocco });
      if (e.genere === "unario" && operatori[e.operatore]) chiave(operatori[e.operatore]!, { operatore: e.operatore, blocco });
      if (e.genere === "binario" && e.operatore === "raised_to") chiave("potenza", { operatore: "raised_to", blocco });
      const figli = e.genere === "indice" ? [e.base, e.indice] : e.genere === "campo" ? [e.base] : e.genere === "unario" ? [e.operando] : e.genere === "binario" ? [e.sinistro, e.destro] : e.genere === "chiamata" ? e.argomenti : [];
      for (const x of figli) scorri(x, blocco, logico, false);
    };
    const leggiTesto = (t: string) => {
      const a = analizza(t);
      if (!a.ok) throw new Error(t);
      return a.espressione;
    };
    const blocchi = (bs: readonly Blocco[]) => {
      for (const b of bs) {
        const id = b.id;
        if (b.kind === "read") {
          chiave("lettura", { blocco: id });
          scorri(leggiTesto(b.target), id, false, false);
        }
        if (b.kind === "assignment") {
          const t = leggiTesto(b.target);
          const base = t.genere === "indice" ? t.base : t;
          scorri(t, id, false, false);
          scorri(leggiTesto(b.value), id, base.genere === "nome" && booleani.has(base.nome), false);
        }
        if (b.kind === "write") for (const v of b.values) scorri(leggiTesto(v), id, true, true);
        if (b.kind === "if" || b.kind === "while" || b.kind === "repeat") scorri(leggiTesto(b.condition), id, true, false);
        if (b.kind === "for") for (const t of [b.from, b.to]) scorri(leggiTesto(t), id, false, false);
        if (b.kind === "for_each") scorri(leggiTesto(b.source), id, false, false);
        if (b.kind === "call") for (const a of b.arguments) scorri(leggiTesto(a), id, false, false);
        if (b.kind === "if") blocchi([...b.then, ...b.else]);
        if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") blocchi(b.body);
      }
    };
    blocchi(f.body);
    if (f.end.return_value !== undefined) scorri(leggiTesto(f.end.return_value), f.end.id, f.return_type === "boolean", false);
  }
  return s;
}

const comeChiave = (m: Mancanza) => `${m.specie}|${m.operatore ?? ""}|${m.blocco ?? ""}|${m.dato ?? ""}|${m.funzione ?? ""}`;

describe("l'esito di ogni file del corpus", () => {
  test("158 file: 36 col codice, 15 con gli errori statici, 107 con le mancanze, appaiati file per file", () => {
    const esiti = new Map(corpus.map((f) => [f, accademico(leggi(f), tetti, "it")]));
    const di = (perche: string) => corpus.filter((f) => {
      const g = esiti.get(f)!;
      return perche === "codice" ? g.generato : !g.generato && g.perche === perche;
    });
    const codice = di("codice");
    const statici = di("errori-statici");
    const nonCiSta = di("non-ci-sta");
    // nessun file ha due esiti, nessuno resta fuori
    expect(codice.length + statici.length + nonCiSta.length).toBe(corpus.length);
    expect([corpus.length, codice.length, statici.length, nonCiSta.length]).toEqual([158, 36, 15, 107]);
    // appaiati per elemento nei due versi: i file in più e quelli che mancano
    expect(codice.filter((f) => !conIlCodice.includes(f))).toEqual([]);
    expect(conIlCodice.filter((f) => !codice.includes(f))).toEqual([]);
    expect(statici.filter((f) => !conErroriStatici.includes(f))).toEqual([]);
    expect(conErroriStatici.filter((f) => !statici.includes(f))).toEqual([]);
  });

  test("le mancanze di ogni file uguali a quelle del secondo rilevatore, nei due versi", () => {
    let voci = 0;
    let conMancanze = 0;
    for (const f of corpus) {
      const p = leggi(f);
      const prima = mancanzeDiAccademico(p).map(comeChiave);
      const seconda = secondoRilevatore(p);
      // una voce per specie e posto
      expect(new Set(prima).size, f).toBe(prima.length);
      expect(prima.filter((k) => !seconda.has(k)), `${f}: della verifica, non del rilevatore`).toEqual([]);
      expect([...seconda].filter((k) => !prima.includes(k)), `${f}: del rilevatore, non della verifica`).toEqual([]);
      voci += prima.length;
      if (prima.length > 0) conMancanze++;
    }
    // il denominatore: i file con mancanze sono i 107 che non ci stanno più i 7 che hanno anche errori statici (4 delle
    // tappe, 3 dei record: un dato record anche se il record non c'è o è sbagliato)
    expect(conMancanze).toBe(114);
    expect(voci).toBeGreaterThan(conMancanze);
    console.log(`mancanze: ${voci} voci in ${conMancanze} file su ${corpus.length}`);
  });

  test("controllo positivo del secondo rilevatore: le occorrenze vere del corpus", () => {
    expect(secondoRilevatore(leggi("tappa-4/fattoriale"))).toContain("lettura||b1||");
    expect([...secondoRilevatore(leggi("tappa-2/parola-al-contrario"))].some((k) => k.startsWith("stringa|"))).toBe(true);
    expect(secondoRilevatore(leggi("tipi/copia-di-un-record"))).toContain("record|||a|");
  });

  test("ogni progetto giusto coi record non ci sta, e dice il record dove sta: il dato, la costante comune, il parametro, il risultato", () => {
    const coiRecord = corpus.filter((f) => f.startsWith("tipi/"));
    const esiti = coiRecord.map((f) => ({ f, g: accademico(leggi(f), tetti, "it") }));
    const giusti = esiti.filter(({ g }) => g.generato || g.perche !== "errori-statici");
    const senzaIlRecord = giusti.filter(({ g }) => g.generato || g.perche !== "non-ci-sta" || !g.mancanze.some((m) => m.specie === "record"));
    expect(senzaIlRecord.map((x) => x.f)).toEqual([]);
    const voci = giusti.flatMap(({ g }) => (!g.generato && g.perche === "non-ci-sta" ? g.mancanze.filter((m) => m.specie === "record") : []));
    const posti = { dati: voci.filter((m) => m.dato !== undefined && m.funzione === undefined).length, diFunzioni: voci.filter((m) => m.dato !== undefined && m.funzione !== undefined).length, risultati: voci.filter((m) => m.dato === undefined).length };
    console.log(`record in «Accademico»: ${giusti.length} progetti giusti su ${coiRecord.length}, ${voci.length} voci (${JSON.stringify(posti)})`);
    expect([giusti.length, coiRecord.length]).toEqual([7, 12]);
    // Ogni posto ha la sua voce: un risultato record (la funzione), un parametro e un dato del programma principale.
    expect(Object.values(posti).every((n) => n > 0)).toBe(true);
  });
});

describe("le mancanze", () => {
  /** Un progetto con più mancanze: la verifica le dice tutte, nell'ordine del progetto. */
  const tutte: Progetto = {
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "tutte" },
    shared_constants: [{ name: "G", type: "real", constant: true, initial: "9.81" }],
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "n", type: "integer" },
          { name: "s", type: "string" },
          { name: "ok", type: "boolean" },
        ],
        body: [
          { id: "b1", kind: "read", target: "n" },
          { id: "b2", kind: "assignment", target: "s", value: '"ciao"' },
          { id: "b3", kind: "assignment", target: "n", value: "to_integer(G) + to_integer(G) + length(s)" },
          { id: "b4", kind: "call", callee: "max", arguments: ["n > 3", "n"] },
          { id: "b5", kind: "assignment", target: "ok", value: "n > 3" },
        ],
        end: { id: "b6" },
      },
      {
        id: "f2",
        kind: "procedure",
        name: "max",
        data: [
          { name: "b", type: "boolean", parameter: "value" },
          { name: "r", type: "integer", parameter: "reference" },
        ],
        body: [],
        end: { id: "b7" },
      },
    ],
  };

  test("tutte, una per specie e posto, nell'ordine del progetto; il booleano da una condizione ci sta", () => {
    expect(mancanzeDiAccademico(tutte)).toEqual([
      { specie: "reale", dato: "G" },
      { specie: "stringa", dato: "s" },
      { specie: "lettura", blocco: "b1" },
      { specie: "letterale-stringa", blocco: "b2" },
      { specie: "conversione", operatore: "to_integer", blocco: "b3" },
      { specie: "lunghezza", operatore: "length", blocco: "b3" },
      { specie: "condizione-come-valore", blocco: "b4" },
      { specie: "parola-del-linguaggio", funzione: "f2" },
      { specie: "rif", dato: "r", funzione: "f2" },
    ]);
  });

  test("il progetto che non ci sta: nessun testo, l'elenco intero", () => {
    expect(accademico(tutte, tetti, "it")).toEqual({ generato: false, perche: "non-ci-sta", mancanze: mancanzeDiAccademico(tutte) });
  });

  test("gli errori statici vengono prima di ciò che manca", () => {
    const p = leggi("tappa-3/riferimento-senza-valore");
    expect(mancanzeDiAccademico(p).length).toBeGreaterThan(0);
    expect(accademico(p, tetti, "it")).toEqual({ generato: false, perche: "errori-statici" });
  });
});

describe("la provenienza delle righe", () => {
  const tuttiIBlocchi = (bs: readonly Blocco[]): Blocco[] =>
    bs.flatMap((b) => [b, ...tuttiIBlocchi(b.kind === "if" ? [...b.then, ...b.else] : b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each" ? b.body : [])]);

  test("in ogni file che si scrive: ogni blocco ha le sue righe (tranne il commento e la fine del principale), ogni dato al più le sue, le fasi solo sui cicli; uguale nelle due lingue", () => {
    let blocchi = 0;
    for (const f of conIlCodice) {
      const p = leggi(f);
      const [a, b] = lingue.map((l) => righe(p, l));
      expect(b!.map((x) => `${x.blocco ?? ""}|${x.dato ?? ""}|${x.funzione ?? ""}|${(x.fasi ?? []).join(",")}`), f).toEqual(a!.map((x) => `${x.blocco ?? ""}|${x.dato ?? ""}|${x.funzione ?? ""}|${(x.fasi ?? []).join(",")}`));
      const ciclici = new Set<string>();
      for (const fn of p.functions) {
        const attesi = tuttiIBlocchi(fn.body).filter((x) => x.kind !== "comment");
        for (const x of attesi) if (x.kind === "for" || x.kind === "for_each" || x.kind === "assignment") ciclici.add(x.id);
        for (const x of attesi) expect(a!.some((r) => r.blocco === x.id), `${f}: ${x.id}`).toBe(true);
        expect(a!.some((r) => r.blocco === fn.end.id), `${f}: la fine ${fn.end.id}`).toBe(fn.kind !== "main");
        blocchi += attesi.length;
      }
      for (const r of a!) {
        expect(r.blocco !== undefined && r.dato !== undefined, `${f}: «${r.testo}»`).toBe(false);
        if (r.fasi !== undefined) expect(ciclici.has(r.blocco ?? ""), `${f}: «${r.testo}» ha le fasi`).toBe(true);
      }
    }
    // il denominatore: i blocchi dei 36 file che si scrivono, contati qui
    expect(blocchi).toBeGreaterThan(0);
    console.log(`provenienza: ${blocchi} blocchi in ${conIlCodice.length} file`);
  });

  test("le fasi dei cicli: il `for` equivalente, il `while` del `per`, il `per ogni` e la copia col nome", () => {
    const fasi = (f: string, id: string) => righe(leggi(f), "it").filter((r) => r.blocco === id).map((r) => `${r.testo.trim()}|${(r.fasi ?? []).join(",")}`);
    expect(fasi("tappa-2/per-overflow-contatore", "b1")).toEqual(["for i in [2147483646 ... 2147483648) do|inizio,condizione,passo"]);
    expect(fasi("tappa-2/per", "b1")).toEqual(["i ← 1|inizio", "while i ≤ 5 do|condizione", "i ← i + 2|passo"]);
    expect(fasi("tappa-2/per-ogni-vettore", "b1")).toEqual(["for _indice in [0 ... 4) do|inizio,condizione,passo", "x ← v[_indice]|elemento"]);
    expect(fasi("tappa-3/copia-di-un-vettore", "b1")).toEqual(["altri ← voti|inizio,condizione,elemento,passo"]);
    expect(fasi("tappa-3/copia-di-un-vettore", "b2")).toEqual(["altri[0] ← 1|"]);
  });
});
