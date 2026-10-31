// Il TypeScript generato contro gli attesi scritti a mano (`attesi-del-typescript.ts`), la provenienza delle righe, la
// guardia del primo gruppo di costrutti sul corpus (i progetti che sa scrivere, per nome, e il costrutto che manca a ogni
// altro), i nomi che il programma chiama. Che il programma generato dia l'output dell'interprete, e che `tsc` non vi trovi
// errori, non si prova qui: lo provano il test differenziale (Node e Bun) e il suo controllo dei tipi.
//
// Che cosa queste prove NON guardano:
// - i programmi del corpus senza atteso scritto, se non per la guardia, la stessa forma nelle due lingue e i nomi;
// - che le funzioni di supporto facciano ciò che dicono: lo prova la loro esecuzione contro i casi d'uso.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../../core/controllo/controllo";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { voceDel } from "../../core/genera/linguaggi";
import { typescript } from "../../core/genera/typescript";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import { delCorpus, formeDellaTappa1, formeDellaTappa1Attese, formeDelloScheletro, formeDelloScheletroAttese, provenienzeDelloScheletro } from "./attesi-del-typescript";
import { paroleDelloPseudocodice } from "./parole";

const lingue: readonly Lingua[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, percorso), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

function righe(p: Progetto, lingua: Lingua): readonly Riga[] {
  const g = typescript(p, tetti, lingua, paroleDelloPseudocodice(lingua));
  if (!g.generato) throw new Error(`${p.metadata.name} non generato: ${g.perche}${g.perche === "non-ancora" ? ` (${g.costrutto})` : ""}`);
  return g.righe;
}
const codice = (p: Progetto, lingua: Lingua) => testoDelCodice(righe(p, lingua));

/** Il confronto col messaggio che nomina la prima riga diversa, con le due forme. */
function uguale(generato: string, atteso: string, chi: string) {
  if (generato === atteso) return;
  const g = generato.split("\n");
  const a = atteso.split("\n");
  const n = g.findIndex((x, i) => x !== a[i]);
  const k = n < 0 ? g.length : n;
  throw new Error(`${chi}, riga ${k + 1}: atteso «${a[k] ?? "(nessuna)"}», generato «${g[k] ?? "(nessuna)"}»`);
}

/** I file del corpus fuori dalla tappa 1 che il generatore sa scrivere (misurati: il programma principale coi costrutti
 * della tappa 1, senza `per`, `per ogni`, procedure, funzioni e tipi composti). Ogni file della tappa 1 si genera. */
const fuoriDallaTappa1: readonly string[] = [];

const corpus = readdirSync(cartella, { withFileTypes: true })
  .filter((v) => v.isDirectory())
  .flatMap((v) => readdirSync(join(cartella, v.name)).filter((f) => f.endsWith(".algo")).map((f) => `${v.name}/${f.slice(0, -".algo".length)}`))
  .sort();

describe("il TypeScript uguale all'atteso scritto a mano", () => {
  for (const l of lingue) {
    for (const [nome, atteso] of Object.entries(delCorpus)) test(`${nome} (${l})`, () => uguale(codice(leggi(`tappa-1/${nome}.algo`), l), atteso[l], `${nome} (${l})`));
    test(`forme-dello-scheletro (${l})`, () => uguale(codice(formeDelloScheletro, l), formeDelloScheletroAttese[l], `forme-dello-scheletro (${l})`));
    test(`forme-della-tappa-1 (${l})`, () => uguale(codice(formeDellaTappa1, l), formeDellaTappa1Attese[l], `forme-della-tappa-1 (${l})`));
  }
});

describe("la provenienza delle righe", () => {
  test("riga per riga in «forme dello scheletro», uguale nelle due lingue; dopo `main` nessuna, e le righe di `main` sono sue", () => {
    for (const l of lingue) {
      const r = righe(formeDelloScheletro, l);
      const fino = provenienzeDelloScheletro.length;
      expect(r.slice(0, fino).map((x) => x.blocco ?? (x.dato === undefined ? "" : `=${x.dato}`))).toEqual([...provenienzeDelloScheletro]);
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
      const principale = r.findIndex((x) => x.testo === "function main(): void {");
      expect(r.filter((x) => x.nellaFunzione === "f1").length).toBe(fino - principale);
    }
  });
});

describe("i costrutti che sa scrivere", () => {
  test("si generano tutti e soli i progetti del corpus che sa scrivere (la tappa 1 intera); ogni altro dice il costrutto che manca", () => {
    // Controllo positivo nel numero: il corpus c'è, e i progetti dello scheletro ne sono una parte.
    expect(corpus.length).toBeGreaterThan(100);
    const generati: string[] = [];
    const nonAncora = new Map<string, string>();
    for (const f of corpus) {
      const p = leggi(`${f}.algo`);
      const c = controlla(p, tetti);
      if (c.fuoriTappa || c.errori.length > 0) continue;
      for (const l of lingue) {
        const g = typescript(p, tetti, l, paroleDelloPseudocodice(l));
        if (g.generato) generati.push(`${f} ${l}`);
        else if (g.perche === "non-ancora") nonAncora.set(`${f} ${l}`, g.costrutto);
        else throw new Error(`${f}: ${g.perche}`);
      }
    }
    // La tappa 1 del corpus: ogni suo file senza errori statici (controllo positivo nel numero: sono più di 50).
    const tappa1 = corpus.filter((f) => f.startsWith("tappa-1/") && (() => {
      const c = controlla(leggi(`${f}.algo`), tetti);
      return !c.fuoriTappa && c.errori.length === 0;
    })());
    expect(tappa1.length).toBeGreaterThan(50);
    expect(generati.sort()).toEqual([...tappa1, ...fuoriDallaTappa1].flatMap((f) => lingue.map((l) => `${f} ${l}`)).sort());
    expect(nonAncora.size).toBeGreaterThan(100);
    for (const [chi, costrutto] of nonAncora) expect({ chi, costrutto: costrutto.length > 0 }).toEqual({ chi, costrutto: true });
    // Le due lingue dicono lo stesso costrutto.
    for (const f of corpus) if (nonAncora.has(`${f} it`)) expect(nonAncora.get(`${f} en`)).toBe(nonAncora.get(`${f} it`));
  });

  test("dopo gli errori statici: un progetto con un errore statico non dice il costrutto che manca", () => {
    const p = leggi("tappa-2/per-passo-zero.algo");
    const c = controlla(p, tetti);
    expect(!c.fuoriTappa && c.errori.length > 0).toBe(true);
    expect(typescript(p, tetti, "it", paroleDelloPseudocodice("it"))).toEqual({ generato: false, perche: "errori-statici" });
  });

  test("il programma di prova di una funzione non si genera ancora", () => {
    const p = leggi("tappa-3/riferimento-media-voti-funzioni.algo");
    const f = p.functions.find((x) => (x.test_cases ?? []).length > 0)!;
    const g = typescript(p, tetti, "it", paroleDelloPseudocodice("it"), { funzione: f.id, caso: f.test_cases![0]! });
    expect(g.generato ? "generato" : g.perche).toBe("non-ancora");
  });
});

describe("i nomi", () => {
  test("il programma chiama solo le funzioni di supporto che definisce e i nomi di JavaScript che riserva", () => {
    const riservati = new Set(voceDel("typescript").riservati);
    for (const l of lingue)
      for (const p of [formeDelloScheletro, formeDellaTappa1, ...Object.keys(delCorpus).map((n) => leggi(`tappa-1/${n}.algo`))]) {
        const t = codice(p, l);
        // Le funzioni a livello del file, che devono essere riservate, e quelle dentro una funzione di supporto (la
        // potenza), che non lo devono.
        const definite = new Set([...t.matchAll(/^function (\w+)\(/gm)].map((m) => m[1]!));
        const interne = new Set([...t.matchAll(/^ +function (\w+)\(/gm)].map((m) => m[1]!));
        // Le parole di controllo seguite da una parentesi non sono chiamate.
        const chiamate = [...t.matchAll(/(?<![\w.])([A-Za-z_]\w*)\(/g)].map((m) => m[1]!).filter((x) => x !== "function");
        // Controllo positivo nel numero: il programma chiama qualcosa.
        expect(chiamate.length).toBeGreaterThan(0);
        for (const c of chiamate) expect({ c, ok: definite.has(c) || interne.has(c) || riservati.has(c) }).toEqual({ c, ok: true });
        for (const d of definite) expect({ d, riservato: riservati.has(d) }).toEqual({ d, riservato: true });
      }
  });

  test("un a capo di Unicode nel nome o in un commento non spezza una riga né chiude un commento", () => {
    // I due separatori di riga e di paragrafo di Unicode, costruiti qui: scritti nel sorgente sarebbero a capo veri.
    const separatori = String.fromCharCode(0x2028, 0x2029);
    expect(separatori.length).toBe(2);
    const p: Progetto = {
      format: "algodesign",
      schema_version: 2,
      metadata: { name: `primo${separatori[0]}secondo` },
      functions: [{ id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "comment", text: `uno${separatori[1]}due` }, { id: "b2", kind: "write", values: ['"ciao"'], newline: true }], end: { id: "b3" } }],
    };
    for (const l of lingue) {
      const r = righe(p, l);
      expect(r.filter((x) => new RegExp(`[\\r\\n${separatori}]`).test(x.testo))).toEqual([]);
      expect(r.map((x) => x.testo)).toContain("// primo secondo");
      expect(r.filter((x) => x.blocco === "b1").map((x) => x.testo)).toEqual(["  // uno", "  // due"]);
    }
  });
});
