// Lo pseudocodice con le parole vere dei dizionari, contro gli attesi scritti a mano (`attesi-dello-pseudocodice.ts`),
// e la provenienza delle righe su tutto il corpus della tappa 1. Lo pseudocodice non si esegue: il suo oracolo
// sono quegli attesi.
//
// Che cosa queste prove NON guardano:
// - i programmi del corpus senza atteso scritto, se non per la provenienza delle righe e per la stessa forma
//   nelle due lingue;
// - la larghezza della colonna dei commenti con caratteri larghi (si contano i codici, non le colonne dello
//   schermo).
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../../core/controllo/controllo";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { pseudocodice } from "../../core/genera/pseudocodice";
import { apri } from "../../core/progetto/formato";
import type { Blocco, Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import {
  delCorpus,
  delCorpusDelleFunzioni,
  formeDeiCicli,
  formeDeiCicliAttese,
  provenienzeDeiCicli,
  provenienzeDelRiferimento,
  provenienzeDelRiferimentoDelleFunzioni,
  riferimento,
  riferimentoDelleFunzioni,
  tutteLeForme,
  tutteLeFormeAttese,
  type Atteso,
} from "./attesi-dello-pseudocodice";
import { provenienzaConLeFasi, provaIlCorpusDeiCicli, rifiutatiDellaTappa2 } from "./provenienza-dei-cicli";
import { paroleDelloPseudocodice } from "./parole";

const lingue: readonly Lingua[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, percorso), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

function righe(p: Progetto, lingua: Lingua): readonly Riga[] {
  const g = pseudocodice(p, tetti, paroleDelloPseudocodice(lingua));
  if (!g.generato) throw new Error(`${p.metadata.name} non generato: ${g.perche}`);
  return g.righe;
}

/** Il confronto col messaggio che nomina la prima riga diversa, con le due forme. */
function uguale(generato: string, atteso: string, chi: string) {
  if (generato === atteso) return;
  const g = generato.split("\n");
  const a = atteso.split("\n");
  const n = g.findIndex((x, i) => x !== a[i]);
  const k = n < 0 ? g.length : n;
  throw new Error(`${chi}, riga ${k + 1}: atteso «${a[k] ?? "(nessuna)"}», generato «${g[k] ?? "(nessuna)"}»`);
}

const provaAttesi = (chi: string, p: () => Progetto, atteso: Atteso) => {
  for (const l of lingue) test(`${chi} (${l})`, () => uguale(testoDelCodice(righe(p(), l)), atteso[l], `${chi} (${l})`));
};

describe("lo pseudocodice uguale all'atteso scritto a mano", () => {
  provaAttesi("riferimento-media-voti", () => leggi("tappa-1/riferimento-media-voti.algo"), riferimento);
  for (const [nome, atteso] of Object.entries(delCorpus)) provaAttesi(nome, () => leggi(`tappa-1/${nome}.algo`), atteso);
  provaAttesi("tutte-le-forme", () => tutteLeForme, tutteLeFormeAttese);
  provaAttesi("forme-dei-cicli", () => formeDeiCicli, formeDeiCicliAttese);

  test("un operatore dentro un letterale o un nome resta com'è", () => {
    const testo = testoDelCodice(righe(tutteLeForme, "it"));
    expect(testo).toContain('"to_integer pi" in ogni elemento');
    expect(testo).toContain("to_integer_n ← converti_a_intero x");
    expect(testo).toContain('SCRIVI "to_integer", to_integer_n,');
  });
});

describe("la provenienza delle righe", () => {
  test("riga per riga nel riferimento, uguale nelle due lingue", () => {
    for (const l of lingue) {
      const r = righe(leggi("tappa-1/riferimento-media-voti.algo"), l);
      expect(r.map((x) => x.blocco ?? (x.dato === undefined ? "" : `=${x.dato}`))).toEqual([...provenienzeDelRiferimento]);
    }
  });

  const file = readdirSync(join(cartella, "tappa-1")).filter((f) => f.endsWith(".algo"));
  test("il corpus della tappa 1 ha 60 file", () => expect(file.length).toBe(60));

  test("ogni blocco del corpus ha le sue righe, nell'ordine dell'albero; ogni dato la sua; una provenienza al più per riga", () => {
    let blocchi = 0;
    let dati = 0;
    for (const f of file) {
      const p = leggi(`tappa-1/${f}`);
      const main = p.functions.find((x) => x.kind === "main")!;
      const ordine: string[] = [];
      const visita = (bs: readonly Blocco[]) => {
        for (const b of bs) {
          // la riga di un `ripeti` è quella della condizione, in fondo al corpo
          if (b.kind !== "repeat") ordine.push(b.id);
          if (b.kind === "if") visita([...b.then, ...b.else]);
          if (b.kind === "while" || b.kind === "repeat") visita(b.body);
          if (b.kind === "repeat") ordine.push(b.id);
        }
      };
      visita(main.body);
      const forme = lingue.map((l) => righe(p, l));
      // la stessa forma nelle due lingue: le stesse provenienze riga per riga
      const provenienze = forme.map((r) => r.map((x) => `${x.blocco ?? ""}|${x.dato ?? ""}`));
      expect(provenienze[1], f).toEqual(provenienze[0]!);
      const r = forme[0]!;
      for (const x of r) {
        expect(x.blocco !== undefined && x.dato !== undefined, `${f}: «${x.testo}» ha blocco e dato`).toBe(false);
        expect(x.testo.includes("\n"), `${f}: «${x.testo}» va a capo`).toBe(false);
      }
      const visti = r.filter((x) => x.blocco !== undefined && x.blocco !== main.end.id).map((x) => x.blocco!);
      // ogni blocco compare, e la sua prima riga viene nell'ordine dell'albero
      expect([...new Set(visti)], f).toEqual(ordine);
      expect(r.filter((x) => x.blocco === main.end.id).length, f).toBe(1);
      expect(r.at(-1)!.blocco, f).toBe(main.end.id);
      const nomi = [...(p.shared_constants ?? []), ...main.data].map((d) => d.name);
      expect(r.filter((x) => x.dato !== undefined).map((x) => x.dato), f).toEqual(nomi);
      blocchi += ordine.length;
      dati += nomi.length;
    }
    // il denominatore: i blocchi e i dati del corpus della tappa 1, contati a parte
    expect(blocchi).toBe(164);
    expect(dati).toBe(114);
  });

  test("riga per riga nelle regole di «forme dei cicli», con le fasi, uguale nelle due lingue", () => {
    for (const l of lingue) {
      const r = righe(formeDeiCicli, l);
      const da = r.findIndex((x) => x.testo === paroleDelloPseudocodice(l).regole) + 1;
      expect(da).toBeGreaterThan(0);
      expect(r.slice(da).map(provenienzaConLeFasi)).toEqual([...provenienzeDeiCicli]);
    }
  });

  const tappa2 = readdirSync(join(cartella, "tappa-2"))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => ({ f, p: leggi(`tappa-2/${f}`) }));
  test("il corpus della tappa 2: ogni blocco nell'ordine dell'albero, ogni fase di un ciclo con le sue righe, nelle due lingue", () => {
    for (const l of lingue) {
      const e = provaIlCorpusDeiCicli(tappa2, (p) => pseudocodice(p, tetti, paroleDelloPseudocodice(l)));
      expect(e.difetti, l).toEqual([]);
      // il denominatore, contato a parte: 15 file, 3 con l'errore statico atteso; 83 blocchi e 25 cicli negli altri
      expect(e.rifiutati.sort(), l).toEqual([...rifiutatiDellaTappa2]);
      expect([e.generati, e.blocchi, e.cicli], l).toEqual([12, 83, 25]);
    }
  });
});

describe("procedure e funzioni", () => {
  provaAttesi("riferimento-media-voti-funzioni", () => leggi("tappa-3/riferimento-media-voti-funzioni.algo"), riferimentoDelleFunzioni);
  for (const [nome, atteso] of Object.entries(delCorpusDelleFunzioni))
    test(nome, () => uguale(testoDelCodice(righe(leggi(`tappa-3/${nome}.algo`), "it")), atteso, nome));

  test("la provenienza del riferimento della tappa 3, riga per riga, uguale nelle due lingue", () => {
    for (const l of lingue) {
      const r = righe(leggi("tappa-3/riferimento-media-voti-funzioni.algo"), l);
      expect(r.map((x) => x.blocco ?? (x.dato === undefined ? "" : `${x.funzione ?? ""}=${x.dato}`))).toEqual([...provenienzeDelRiferimentoDelleFunzioni]);
    }
  });

  test("la copia di un vettore col suo nome: una riga con tutte le fasi della copia; l'assegnazione di un elemento e il vettore restituito, nessuna", () => {
    // `copia-di-un-vettore`: b1 `altri ← voti` (la copia), b2 `altri[0] ← 1`, b3 `v ← primi()` (un'azione sola). A mano.
    const r = righe(leggi("tappa-3/copia-di-un-vettore.algo"), "it");
    const di = (id: string) => r.filter((x) => x.blocco === id).map((x) => `${x.testo.trim()}|${(x.fasi ?? []).join(",")}`);
    expect([di("b1"), di("b2"), di("b3")]).toEqual([["altri ← voti|inizio,condizione,elemento,passo"], ["altri[0] ← 1|"], ["v ← primi()|"]]);
  });

  test("il corpus della tappa 3: ogni blocco di ogni funzione ha le sue righe; si genera ogni file senza errori statici", () => {
    const file = readdirSync(join(cartella, "tappa-3")).filter((f) => f.endsWith(".algo"));
    let generati = 0;
    let blocchi = 0;
    for (const f of file) {
      const p = leggi(`tappa-3/${f}`);
      const statico = (p.test_cases ?? []).some((c) => c.expected.static_error !== undefined);
      const forme = lingue.map((l) => pseudocodice(p, tetti, paroleDelloPseudocodice(l)));
      for (const g of forme) expect(g, f).toMatchObject(statico ? { generato: false, perche: "errori-statici" } : { generato: true });
      if (statico) continue;
      generati++;
      const [a, b] = forme.map((g) => (g.generato ? g.righe.map((x) => `${x.blocco ?? ""}|${x.dato ?? ""}|${x.funzione ?? ""}`) : []));
      expect(b, f).toEqual(a!);
      const tutti = (bs: readonly Blocco[]): string[] =>
        bs.flatMap((x) => [x.id, ...tutti(x.kind === "if" ? [...x.then, ...x.else] : x.kind === "while" || x.kind === "repeat" || x.kind === "for" || x.kind === "for_each" ? x.body : [])]);
      const attesi = p.functions.flatMap((g) => [...tutti(g.body), g.end.id]);
      expect([...new Set(a!.map((x) => x.split("|")[0]).filter((x) => x !== ""))].sort(), f).toEqual([...attesi].sort());
      blocchi += attesi.length;
    }
    // il denominatore, contato a parte: 53 file, 7 col solo errore statico atteso; i blocchi degli altri, fini comprese
    // (65 negli 11 con una stringa o un vettore restituiti)
    expect([file.length, generati, blocchi]).toEqual([53, 46, 331]);
  });
});

describe("il progetto che non si genera", () => {
  test("con un errore statico: nessun testo a metà", () => {
    const p = leggi("tappa-1/riferimento-media-voti.algo");
    const main = p.functions[0]!;
    const rotto: Progetto = { ...p, functions: [{ ...main, body: [...main.body, { id: "b99", kind: "assignment", target: "somma", value: "somma +" }] }] };
    expect(pseudocodice(rotto, tetti, paroleDelloPseudocodice("it"))).toEqual({ generato: false, perche: "errori-statici" });
  });

});

describe("la ricorsione", () => {
  test("ogni file della tappa 4 si genera, e la chiamata ricorsiva si scrive come ogni chiamata", () => {
    const tappa4 = readdirSync(join(cartella, "tappa-4")).filter((f) => f.endsWith(".algo"));
    expect(tappa4.length).toBe(22);
    for (const f of tappa4) for (const l of lingue) expect(pseudocodice(leggi(`tappa-4/${f}`), tetti, paroleDelloPseudocodice(l)).generato, `${f} (${l})`).toBe(true);
    const r = pseudocodice(leggi("tappa-4/fattoriale.algo"), tetti, paroleDelloPseudocodice("it"));
    expect(r.generato && testoDelCodice(r.righe)).toContain("        f ← n * fatt(n - 1)");
  });
});
