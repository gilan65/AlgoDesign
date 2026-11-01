// Il TypeScript generato contro gli attesi scritti a mano (`attesi-del-typescript.ts`), la provenienza delle righe (con
// le fasi dei cicli, anche sul corpus della tappa 2), la guardia dei gruppi di costrutti sul corpus (i progetti che sa
// scrivere, per nome, e il costrutto che manca a ogni
// altro), il contatore della ricorsione nelle sole funzioni del giro, i nomi che il programma chiama. Che il programma generato dia l'output dell'interprete, e che `tsc` non vi trovi
// errori, non si prova qui: lo provano il test differenziale (Node e Bun) e il suo controllo dei tipi.
//
// Che cosa queste prove NON guardano:
// - i programmi del corpus senza atteso scritto, se non per la guardia, la stessa forma nelle due lingue e i nomi;
// - che le funzioni di supporto facciano ciò che dicono: lo prova la loro esecuzione contro i casi d'uso.
import { describe, expect, test } from "bun:test";
import { confermato } from "../../strumenti/corpus";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, funzioniDelGiro, tetti } from "../../core/controllo/controllo";
import { spazioDiUnaChiamata, tettoDelleChiamate } from "../../core/controllo/spazio";
import { motiviCol } from "../../core/genera/motivi";
import { nomiDelSupporto } from "../../core/genera/nomi";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { voceDel } from "../../core/genera/linguaggi";
import { typescript } from "../../core/genera/typescript";
import { apri } from "../../core/progetto/formato";
import type { Prova } from "../../core/genera/python";
import { usaLeMatrici, usaLeTabelle, type Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import {
  delCorpus, delleProve, delleProveDeiRecord, delleProveDelleMatrici, delleProveDelleTabelle, fasiDellaTappa2, formeDellaTappa1, formeDellaTappa1Attese, formeDellaTappa2, formeDellaTappa2Attese, formeDellaTappa3, formeDellaTappa3Attese,
  formeDelloScheletro, formeDelloScheletroAttese, provenienzeDelloScheletro,
} from "./attesi-del-typescript";
import { paroleDelloPseudocodice } from "./parole";
import { provaIlCorpusDeiCicli, rifiutatiDellaTappa2 } from "./provenienza-dei-cicli";

const lingue: readonly Lingua[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, percorso), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

function righe(p: Progetto, lingua: Lingua, prova?: Prova): readonly Riga[] {
  const g = typescript(p, tetti, lingua, paroleDelloPseudocodice(lingua), prova);
  if (!g.generato) throw new Error(`${p.metadata.name} non generato: ${g.perche}${g.perche === "non-ancora" ? ` (${g.costrutto})` : ""}`);
  return g.righe;
}
const codice = (p: Progetto, lingua: Lingua, prova?: Prova) => testoDelCodice(righe(p, lingua, prova));
/** Il programma di prova di un caso di una funzione del progetto, dai loro nomi. */
const provaDi = (p: Progetto, funzione: string, caso: string): Prova => {
  const f = p.functions.find((x) => x.name === funzione)!;
  return { funzione: f.id, caso: f.test_cases!.find((c) => c.name === caso)! };
};

/** Il confronto col messaggio che nomina la prima riga diversa, con le due forme. */
function uguale(generato: string, atteso: string, chi: string) {
  if (generato === atteso) return;
  const g = generato.split("\n");
  const a = atteso.split("\n");
  const n = g.findIndex((x, i) => x !== a[i]);
  const k = n < 0 ? g.length : n;
  throw new Error(`${chi}, riga ${k + 1}: atteso «${a[k] ?? "(nessuna)"}», generato «${g[k] ?? "(nessuna)"}»`);
}

const corpus = readdirSync(cartella, { withFileTypes: true })
  .filter((v) => v.isDirectory())
  .flatMap((v) => readdirSync(join(cartella, v.name)).filter((f) => f.endsWith(".algo")).map((f) => `${v.name}/${f.slice(0, -".algo".length)}`))
  .sort();

describe("il TypeScript uguale all'atteso scritto a mano", () => {
  for (const l of lingue) {
    for (const [nome, atteso] of Object.entries(delCorpus)) test(`${nome} (${l})`, () => uguale(codice(leggi(`${nome}.algo`), l), atteso[l], `${nome} (${l})`));
    test(`forme-dello-scheletro (${l})`, () => uguale(codice(formeDelloScheletro, l), formeDelloScheletroAttese[l], `forme-dello-scheletro (${l})`));
    test(`forme-della-tappa-1 (${l})`, () => uguale(codice(formeDellaTappa1, l), formeDellaTappa1Attese[l], `forme-della-tappa-1 (${l})`));
    test(`forme-della-tappa-2 (${l})`, () => uguale(codice(formeDellaTappa2, l), formeDellaTappa2Attese[l], `forme-della-tappa-2 (${l})`));
    test(`forme-della-tappa-3 (${l})`, () => uguale(codice(formeDellaTappa3, l), formeDellaTappa3Attese[l], `forme-della-tappa-3 (${l})`));
    // La chiave è il file, con `#` e un nome quando lo stesso file ha più di una prova.
    for (const [chiave, { funzione, caso, atteso }] of [...Object.entries(delleProve), ...Object.entries(delleProveDeiRecord), ...Object.entries(delleProveDelleMatrici), ...Object.entries(delleProveDelleTabelle)]) {
      const nome = chiave.split("#")[0]!;
      test(`la prova ${nome}#${funzione}/${caso} (${l})`, () => {
        const p = leggi(`${nome}.algo`);
        uguale(codice(p, l, provaDi(p, funzione, caso)), atteso[l], `la prova ${nome}#${funzione}/${caso} (${l})`);
      });
    }
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

  test("le righe dei cicli in «forme della tappa 2» hanno il loro blocco e una fase ciascuna, le graffe e gli indici dichiarati nessuno", () => {
    for (const l of lingue) {
      const r = righe(formeDellaTappa2, l);
      expect(r.filter((x) => x.fasi !== undefined).map((x) => `${x.blocco} ${x.fasi!.join("+")}`)).toEqual([...fasiDellaTappa2]);
      // Controllo positivo nel numero: le righe senza fase dei cicli sono quelle del corpo, coi loro blocchi.
      const cicli = new Set(["b2", "b4", "b5", "b6", "b8"]);
      expect(r.filter((x) => x.blocco !== undefined && cicli.has(x.blocco) && x.fasi === undefined)).toEqual([]);
      const dichiarati = r.filter((x) => /^  let _(indice|index)2?: number;$/.test(x.testo));
      expect(dichiarati.length).toBe(2);
      expect(dichiarati.filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
      expect(r.filter((x) => /^ *\}$/.test(x.testo) && x.blocco !== undefined)).toEqual([]);
    }
  });

  const tappa2 = readdirSync(join(cartella, "tappa-2"))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => ({ f, p: leggi(`tappa-2/${f}`) }));
  test("il corpus della tappa 2: ogni blocco nell'ordine dell'albero, ogni fase di un ciclo con le sue righe, nelle due lingue", () => {
    for (const l of lingue) {
      const e = provaIlCorpusDeiCicli(tappa2, (p) => typescript(p, tetti, l, paroleDelloPseudocodice(l)));
      expect(e.difetti, l).toEqual([]);
      // il denominatore, contato a parte: i file della tappa 2, quelli con l'errore statico atteso, i blocchi e i cicli degli altri
      expect(e.rifiutati.sort(), l).toEqual(rifiutatiDellaTappa2(tappa2));
      expect([e.generati, e.blocchi, e.cicli], l).toEqual(confermato("genera typescript - tappa 2 (generati, blocchi, cicli)", [e.generati, e.blocchi, e.cicli]));
    }
  });
});

describe("i costrutti che sa scrivere", () => {
  test("si generano tutti i progetti giusti del corpus (le tappe 1, 2, 3 e 4 intere, i record, le matrici, le tabelle): nessun costrutto manca", () => {
    // Controllo positivo nel numero: il corpus c'è, e i progetti dello scheletro ne sono una parte.
    expect(corpus.length).toBeGreaterThan(100);
    const generati: string[] = [];
    for (const f of corpus) {
      const p = leggi(`${f}.algo`);
      const c = controlla(p, tetti);
      if (c.fuoriTappa || c.errori.length > 0) continue;
      for (const l of lingue) {
        const g = typescript(p, tetti, l, paroleDelloPseudocodice(l));
        if (g.generato) generati.push(`${f} ${l}`);
        else throw new Error(`${f}: ${g.perche}${g.perche === "non-ancora" ? ` (${g.costrutto})` : ""}`);
      }
    }
    // Le tappe 1, 2, 3 e 4 del corpus: ogni loro file senza errori statici (controllo positivo nel numero: sono più di 50,
    // di 10, di 40 e di 15).
    const tappe = corpus.filter((f) => /^tappa-[1-4]\//.test(f) && (() => {
      const c = controlla(leggi(`${f}.algo`), tetti);
      return !c.fuoriTappa && c.errori.length === 0;
    })());
    expect(tappe.filter((f) => f.startsWith("tappa-1/")).length).toBeGreaterThan(50);
    expect(tappe.filter((f) => f.startsWith("tappa-2/")).length).toBeGreaterThan(10);
    expect(tappe.filter((f) => f.startsWith("tappa-3/")).length).toBeGreaterThan(40);
    expect(tappe.filter((f) => f.startsWith("tappa-4/")).length).toBeGreaterThan(15);
    // I file fuori dalle tappe (coi record, le matrici e le tabelle), confermati; ogni file delle tappe si genera.
    const fuoriDalleTappe = confermato("genera typescript - generati fuori dalle tappe 1, 2, 3 e 4", [...new Set(generati.map((g) => g.slice(0, g.lastIndexOf(" "))))].filter((f) => !tappe.includes(f)).sort());
    expect(generati.sort()).toEqual([...tappe, ...fuoriDalleTappe].flatMap((f) => lingue.map((l) => `${f} ${l}`)).sort());
    // Un file giusto con una tabella o con una matrice si genera: controllo positivo che il corpus ne abbia.
    const giusto = (p: Progetto) => {
      const c = controlla(p, tetti);
      return !c.fuoriTappa && c.errori.length === 0;
    };
    const conTabelle = corpus.filter((f) => {
      const p = leggi(`${f}.algo`);
      return giusto(p) && usaLeTabelle(p);
    });
    expect(conTabelle.length).toBeGreaterThan(0);
    for (const f of conTabelle) for (const l of lingue) expect({ f, l, generato: generati.includes(`${f} ${l}`) }).toEqual({ f, l, generato: true });
    const conMatrici = corpus.filter((f) => {
      const p = leggi(`${f}.algo`);
      return giusto(p) && usaLeMatrici(p) && !usaLeTabelle(p);
    });
    expect(conMatrici.length).toBeGreaterThan(0);
    for (const f of conMatrici) for (const l of lingue) expect({ f, l, generato: generati.includes(`${f} ${l}`) }).toEqual({ f, l, generato: true });
  });

  test("un progetto con un errore statico resta con gli errori", () => {
    const p = leggi("tappa-2/per-passo-zero.algo");
    const c = controlla(p, tetti);
    expect(!c.fuoriTappa && c.errori.length > 0).toBe(true);
    expect(typescript(p, tetti, "it", paroleDelloPseudocodice("it"))).toEqual({ generato: false, perche: "errori-statici" });
  });

  // Tolta la prova del programma di prova di un progetto col costrutto che manca: con le tabelle non ne manca più nessuno, e
  // un elenco sempre vuoto non proverebbe niente. I programmi di prova delle tabelle si generano (`tabelle.test.ts`) e
  // hanno i loro attesi (`delleProveDelleTabelle`).

  test("ogni programma di prova dei casi delle funzioni delle tappe 3 e 4 si genera, nelle due lingue", () => {
    let prove = 0;
    for (const f of corpus.filter((x) => x.startsWith("tappa-3/") || x.startsWith("tappa-4/"))) {
      const p = leggi(`${f}.algo`);
      const c = controlla(p, tetti);
      if (c.fuoriTappa || c.errori.length > 0) continue;
      for (const fn of p.functions)
        for (const caso of fn.test_cases ?? [])
          for (const l of lingue) {
            const g = typescript(p, tetti, l, paroleDelloPseudocodice(l), { funzione: fn.id, caso });
            expect({ f, caso: caso.name, generato: g.generato }).toEqual({ f, caso: caso.name, generato: true });
            prove++;
          }
    }
    // Controllo positivo nel numero: la tappa 3 ha casi di funzioni.
    expect(prove).toBeGreaterThan(20);
  });
});

describe("la ricorsione", () => {
  const tappa4 = corpus.filter((f) => f.startsWith("tappa-4/")).map((f) => leggi(`${f}.algo`));
  test("il contatore solo nelle funzioni del giro, con lo spazio del nucleo, in testa e prima del ritorno", () => {
    let conGiro = 0;
    let senzaGiro = 0;
    for (const p of [...corpus.map((f) => leggi(`${f}.algo`)).filter((q) => typescript(q, tetti, "it", paroleDelloPseudocodice("it")).generato), formeDellaTappa3])
      for (const l of lingue) {
        const t = codice(p, l);
        const n = nomiDelSupporto[l];
        const delGiro = [...funzioniDelGiro(p)];
        const spazi = delGiro.map((f) => spazioDiUnaChiamata(f, p)).sort();
        const righe = (nome: string) => [...t.matchAll(new RegExp(`^  ${nome}\\((\\d+)\\);$`, "gm"))].map((m) => Number(m[1])).sort();
        expect(righe(n.entraNellaRicorsione), `${p.metadata.name} (${l})`).toEqual(spazi);
        expect(righe(n.esciDallaRicorsione), `${p.metadata.name} (${l})`).toEqual(spazi);
        // La prima riga del corpo di ogni funzione del giro.
        for (const f of delGiro) expect(t, `${p.metadata.name} (${l})`).toMatch(new RegExp(`^function ${f.name}\\(.*\\n  ${n.entraNellaRicorsione}\\(`, "m"));
        if (delGiro.length > 0) conGiro++;
        else senzaGiro++;
      }
    expect(conGiro).toBe(confermato("genera typescript - programmi col giro, nelle due lingue", conGiro));
    expect(senzaGiro).toBeGreaterThan(100);
  });

  test("al tetto, `fermati` salta la cornice della funzione del giro; senza ricorsione non ha il parametro", () => {
    for (const l of lingue) {
      const n = nomiDelSupporto[l];
      const p = leggi("tappa-4/fattoriale.algo");
      const conGiro = codice(p, l);
      expect(conGiro).toContain(`${n.fermati}(${l === "it" ? "motivo: string, cornice" : "reason: string, frame"}: number = 0): never {`);
      const m = motiviCol(tettoDelleChiamate(p))[l];
      for (const motivo of [m.recursion_too_deep, m.recursion_data_too_large]) expect(conGiro).toContain(`${n.fermati}("${motivo}", 1);`);
      // Controllo positivo: senza ricorsione, la forma di prima.
      expect(codice(leggi("tappa-3/riferimento-media-voti-funzioni.algo"), l)).toContain(`${n.fermati}(${l === "it" ? "motivo" : "reason"}: string): never {`);
    }
    // Il corpus della tappa 4 c'è, e ogni suo programma ha le due funzioni.
    expect(tappa4.length).toBeGreaterThan(15);
    for (const p of tappa4) expect(codice(p, "it"), p.metadata.name).toContain("function esci_dalla_ricorsione(spazio: number): void {");
  });
});

describe("i nomi", () => {
  test("il programma chiama solo le funzioni di supporto che definisce e i nomi di JavaScript che riserva", () => {
    const riservati = new Set(voceDel("typescript").riservati);
    for (const l of lingue)
      for (const p of [formeDelloScheletro, formeDellaTappa1, formeDellaTappa2, formeDellaTappa3, ...Object.keys(delCorpus).map((n) => leggi(`${n}.algo`))]) {
        const t = codice(p, l);
        // Le funzioni a livello del file, che devono essere riservate se non sono del progetto, e quelle dentro una
        // funzione di supporto (la potenza), che non lo devono; le classi dei record, che sono del progetto.
        const delProgetto = new Set(["main", ...p.functions.flatMap((f) => (f.name === undefined ? [] : [f.name])), ...(p.records ?? []).map((r) => r.name)]);
        const definite = new Set([...t.matchAll(/^function (\w+)\(/gm)].map((m) => m[1]!).filter((x) => !delProgetto.has(x)));
        const interne = new Set([...t.matchAll(/^ +function (\w+)\(/gm)].map((m) => m[1]!));
        // Le parole seguite da una parentesi che non sono chiamate: `function` e il costruttore di una classe.
        const chiamate = [...t.matchAll(/(?<![\w.])([A-Za-z_]\w*)\(/g)].map((m) => m[1]!).filter((x) => x !== "function" && x !== "constructor");
        // Controllo positivo nel numero: il programma chiama qualcosa.
        expect(chiamate.length).toBeGreaterThan(0);
        for (const c of chiamate) expect({ c, ok: definite.has(c) || interne.has(c) || riservati.has(c) || delProgetto.has(c) }).toEqual({ c, ok: true });
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
