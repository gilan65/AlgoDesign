// Il Python generato contro gli attesi scritti a mano (`attesi-del-python.ts`), la provenienza delle righe su tutto il
// corpus della tappa 1, i nomi che il Python usa per sé (riservati, e mai il nome della copia di un dato), i motivi
// d'errore nei due versi, l'indice calcolato prima del valore. Che il programma generato dia l'output dell'interprete
// non si prova qui (servirebbe un Python sulla macchina che corre le prove): gli attesi sono stati eseguiti contro i
// casi d'uso, e il confronto vero è dello strumento che esegue i programmi generati.
//
// Che cosa queste prove NON guardano:
// - i programmi del corpus senza atteso scritto, se non per la provenienza, la stessa forma nelle due lingue, i nomi
//   e i motivi;
// - che le funzioni di supporto facciano ciò che dicono: lo prova la loro esecuzione contro i casi d'uso.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, funzioniDelGiro, tetti } from "../../core/controllo/controllo";
import { spazioDiUnaChiamata } from "../../core/controllo/spazio";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { codiceDelMotivo, motivi, type CodiceDiUnMotivo } from "../../core/genera/motivi";
import { indiceDelLivello, nomeDellIndice, nomiDelSupporto, nomiDiPython, nomiRiservatiDeiGeneratori } from "../../core/genera/nomi";
import { c } from "../../core/genera/c";
import { pseudocodice } from "../../core/genera/pseudocodice";
import { python } from "../../core/genera/python";
import { duplicaDato } from "../../core/modifica/operazioni";
import { apri } from "../../core/progetto/formato";
import type { Blocco, CasoDiUnaFunzione, Funzione, Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import { nomiDegliOperatori } from "../../i18n/operatori";
import {
  altreForme,
  altreFormeAttese,
  delCorpus,
  delCorpusDelleFunzioni,
  formeDeiCicliAttese,
  formeDelRisultatoAttese,
  provenienzeDeiCicli,
  provenienzeDelRiferimento,
  provenienzeDelRiferimentoDelleFunzioni,
  proveDelleFunzioni,
  riferimento,
  riferimentoDelleFunzioni,
  tutteLeFormeAttese,
  vettorePerRiferimento,
} from "./attesi-del-python";
import { formeDelRisultato } from "./attesi-del-c";
import { formeDeiCicli, tutteLeForme } from "./attesi-dello-pseudocodice";
import { paroleDelloPseudocodice } from "./parole";
import { provenienzaConLeFasi, provaIlCorpusDeiCicli, rifiutatiDellaTappa2 } from "./provenienza-dei-cicli";

const lingue: readonly Lingua[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, percorso), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

function righe(p: Progetto, lingua: Lingua): readonly Riga[] {
  const g = python(p, tetti, lingua, paroleDelloPseudocodice(lingua));
  if (!g.generato) throw new Error(`${p.metadata.name} non generato: ${g.perche}`);
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

const file = readdirSync(join(cartella, "tappa-1")).filter((f) => f.endsWith(".algo"));
const corpus = file.map((f) => ({ f, p: leggi(`tappa-1/${f}`) }));
/** I programmi della tappa 3 senza errori statici: quelli che il Python genera. */
const tappa3 = readdirSync(join(cartella, "tappa-3"))
  .filter((f) => f.endsWith(".algo"))
  .map((f) => ({ f, p: leggi(`tappa-3/${f}`) }));
/** Una funzione del progetto restituisce una stringa o un vettore: il Python non la traduce ancora, e lo dice. */
const generatiDellaTappa3 = tappa3.map((x) => x.p).filter((p) => (p.test_cases ?? []).every((c) => c.expected.static_error === undefined));

describe("il Python uguale all'atteso scritto a mano", () => {
  for (const l of lingue) {
    test(`riferimento-media-voti (${l})`, () => uguale(codice(leggi("tappa-1/riferimento-media-voti.algo"), l), riferimento[l], `riferimento (${l})`));
    test(`tutte-le-forme (${l})`, () => uguale(codice(tutteLeForme, l), tutteLeFormeAttese[l], `tutte-le-forme (${l})`));
    test(`altre-forme (${l})`, () => uguale(codice(altreForme, l), altreFormeAttese[l], `altre-forme (${l})`));
    test(`forme-dei-cicli (${l})`, () => uguale(codice(formeDeiCicli, l), formeDeiCicliAttese[l], `forme-dei-cicli (${l})`));
  }
  for (const [nome, atteso] of Object.entries(delCorpus)) test(nome, () => uguale(codice(leggi(`tappa-1/${nome}.algo`), "it"), atteso, nome));

  test("le opzioni del progetto: i decimali dei reali e il carattere di riempimento", () => {
    const p = leggi("tappa-1/converti-a-vettore.algo");
    const conOpzioni: Progetto = { ...p, options: { real_decimals: 3, fill_character: "*" } };
    const main = conOpzioni.functions[0]!;
    const q: Progetto = { ...conOpzioni, functions: [{ ...main, body: [...main.body, { id: "b9", kind: "write", values: ["2.5"], newline: true }] }] };
    for (const l of lingue) {
      const t = codice(q, l);
      expect(t).toContain('    return list(s) + ["*"] * (n - len(s))');
      expect(t).toContain('    return "%.3f" % x');
    }
    expect(codice(q, "it")).toContain("poi il carattere di riempimento fino a n elementi.");
    expect(codice(q, "it")).toContain("Un reale con 3 decimali, come nel C.");
    expect(codice(q, "en")).toContain("then the padding character up to n elements.");
  });
});

describe("la provenienza delle righe", () => {
  test("riga per riga nel riferimento, uguale nelle due lingue; dopo il programma principale nessuna", () => {
    for (const l of lingue) {
      const r = righe(leggi("tappa-1/riferimento-media-voti.algo"), l);
      const fino = provenienzeDelRiferimento.length;
      expect(r.slice(0, fino).map((x) => x.blocco ?? (x.dato === undefined ? "" : `=${x.dato}`))).toEqual([...provenienzeDelRiferimento]);
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
    }
  });

  test("il corpus della tappa 1 ha 56 file", () => expect(file.length).toBe(56));

  test("ogni blocco del corpus ha le sue righe, nell'ordine dell'albero; ogni dato la sua; una provenienza al più per riga; nessuna per la fine", () => {
    let blocchi = 0;
    let dati = 0;
    for (const { f, p } of corpus) {
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
        expect(/[\r\n]/.test(x.testo), `${f}: «${x.testo}» va a capo`).toBe(false);
      }
      expect([...new Set(r.filter((x) => x.blocco !== undefined).map((x) => x.blocco!))], f).toEqual(ordine);
      expect(r.some((x) => x.blocco === main.end.id), f).toBe(false);
      const nomi = [...(p.shared_constants ?? []), ...main.data].map((d) => d.name);
      expect(r.filter((x) => x.dato !== undefined).map((x) => x.dato), f).toEqual(nomi);
      blocchi += ordine.length;
      dati += nomi.length;
    }
    // il denominatore: i blocchi e i dati del corpus della tappa 1, contati a parte
    expect(blocchi).toBe(153);
    expect(dati).toBe(104);
  });

  test("riga per riga nel programma principale di «forme dei cicli», con le fasi, uguale nelle due lingue; dopo, nessuna", () => {
    for (const l of lingue) {
      const r = righe(formeDeiCicli, l);
      const da = r.findLastIndex((x) => x.dato !== undefined) + 1;
      const fino = da + provenienzeDeiCicli.length;
      expect(r.slice(da, fino).map(provenienzaConLeFasi)).toEqual([...provenienzeDeiCicli]);
      expect(r[fino]!.testo).toBe("");
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
    }
  });

  const tappa2 = readdirSync(join(cartella, "tappa-2"))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => ({ f, p: leggi(`tappa-2/${f}`) }));
  test("il corpus della tappa 2: ogni blocco nell'ordine dell'albero, ogni fase di un ciclo con le sue righe, nelle due lingue", () => {
    for (const l of lingue) {
      const e = provaIlCorpusDeiCicli(tappa2, (p) => python(p, tetti, l, paroleDelloPseudocodice(l)));
      expect(e.difetti, l).toEqual([]);
      // il denominatore, contato a parte: 15 file, 3 con l'errore statico atteso; 83 blocchi e 25 cicli negli altri
      expect(e.rifiutati.sort(), l).toEqual([...rifiutatiDellaTappa2]);
      expect([e.generati, e.blocchi, e.cicli], l).toEqual([12, 83, 25]);
    }
  });
});

describe("il nome del progetto e i commenti", () => {
  const conNome = (nome: string, commento: string): Progetto => ({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: nome },
    functions: [{ id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "comment", text: commento }, { id: "b2", kind: "write", values: ['"ciao"'], newline: true }], end: { id: "b3" } }],
  });

  test("nessuna delle prime due righe del Python è una dichiarazione di codifica, qualunque sia il nome", () => {
    // La regola con cui Python cerca la codifica nelle prime due righe (PEP 263).
    const codifica = /^[ \t\f]*#.*?coding[:=][ \t]*[-\w.]+/;
    const nomi = ["Esercizi di coding: cicli", "decoding=x", "coding:utf-8 e coding=latin-1"];
    for (const l of lingue)
      for (const nome of nomi) {
        const prime = codice(conNome(nome, "x"), l).split("\n").slice(0, 2);
        expect(prime.filter((r) => codifica.test(r)), `${nome} (${l})`).toEqual([]);
        expect(prime[0], `${nome} (${l})`).toContain("coding");
      }
    // Controllo positivo: la regola riconosce la riga che il nome darebbe se scritto com'è.
    expect(codifica.test("# Esercizi di coding: cicli")).toBe(true);
  });

  test("un a capo nel nome o in un commento non spezza una riga in nessuno dei tre generatori", () => {
    const p = conNome("primo\nsecondo\rterzo\r\nquarto", "uno\rdue\ntre\r\nquattro");
    const generatori = {
      pseudocodice: (l: Lingua) => pseudocodice(p, tetti, paroleDelloPseudocodice(l)),
      python: (l: Lingua) => python(p, tetti, l, paroleDelloPseudocodice(l)),
      c: (l: Lingua) => c(p, tetti, l, paroleDelloPseudocodice(l)),
    };
    for (const l of lingue)
      for (const [nome, g] of Object.entries(generatori)) {
        const r = g(l);
        if (!r.generato) throw new Error(`${nome} non generato`);
        expect(r.righe.filter((x) => /[\r\n]/.test(x.testo)).map((x) => x.testo), `${nome} (${l})`).toEqual([]);
        // I quattro pezzi del commento sono quattro righe; il nome resta su una riga.
        expect(r.righe.filter((x) => /\b(uno|due|tre|quattro)\b/.test(x.testo)).length, `${nome} (${l})`).toBe(4);
        expect(r.righe.some((x) => x.testo.includes("primo secondo terzo quarto")), `${nome} (${l})`).toBe(true);
      }
  });
});

describe("il progetto che non si genera", () => {
  test("con un errore statico: nessun testo a metà", () => {
    const p = leggi("tappa-1/riferimento-media-voti.algo");
    const main = p.functions[0]!;
    const rotto: Progetto = { ...p, functions: [{ ...main, body: [...main.body, { id: "b99", kind: "assignment", target: "somma", value: "somma +" }] }] };
    expect(python(rotto, tetti, "it", paroleDelloPseudocodice("it"))).toEqual({ generato: false, perche: "errori-statici" });
  });

});

describe("la ricorsione", () => {
  /** I programmi della tappa 4. */
  const tappa4 = readdirSync(join(cartella, "tappa-4"))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => ({ f, p: leggi(`tappa-4/${f}`) }));

  test("ogni file della tappa 4 si genera nelle due lingue, e la chiamata resta come nel flowchart", () => {
    expect(tappa4.length).toBe(21);
    for (const { f, p } of tappa4)
      for (const l of lingue) {
        expect(python(p, tetti, l, paroleDelloPseudocodice(l)).generato, `${f} (${l})`).toBe(true);
        expect(codice(p, l), `${f} (${l})`).not.toContain("__LINE__");
      }
    expect(codice(leggi("tappa-4/fattoriale.algo"), "it")).toContain("        f = n * fatt(n - 1)");
  });

  test("il contatore solo nelle funzioni del giro, con lo spazio del nucleo, in testa e prima del ritorno", () => {
    let conGiro = 0;
    let senzaGiro = 0;
    for (const p of [...corpus.map((x) => x.p), tutteLeForme, altreForme, ...generatiDellaTappa3, ...tappa4.map((x) => x.p)])
      for (const l of lingue) {
        const t = codice(p, l);
        const n = nomiDelSupporto[l];
        const delGiro = [...funzioniDelGiro(p)];
        const spazi = delGiro.map((f) => spazioDiUnaChiamata(f, p)).sort();
        const righe = (nome: string) => [...t.matchAll(new RegExp(`^    ${nome}\\((\\d+)\\)$`, "gm"))].map((m) => Number(m[1])).sort();
        expect(righe(n.entraNellaRicorsione), `${p.metadata.name} (${l})`).toEqual(spazi);
        expect(righe(n.esciDallaRicorsione), `${p.metadata.name} (${l})`).toEqual(spazi);
        // La prima riga del corpo di ogni funzione del giro.
        for (const f of delGiro) expect(t, `${p.metadata.name} (${l})`).toMatch(new RegExp(`^def ${f.name}\\(.*\\n    ${n.entraNellaRicorsione}\\(`, "m"));
        if (delGiro.length > 0) conGiro++;
        else senzaGiro++;
      }
    expect(conGiro).toBe(2 * 21);
    expect(senzaGiro).toBeGreaterThan(100);
  });

  test("un'espressione di 63 livelli si genera subito: il tipo di ogni lato si calcola una volta sola", () => {
    const inizio = performance.now();
    codice(leggi("tappa-4/chiamata-in-63-livelli.algo"), "it");
    expect(performance.now() - inizio).toBeLessThan(2000);
  });
});

describe("i nomi che il Python usa per sé", () => {
  const conUnDato = (nome: string): Progetto => ({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "nome" },
    functions: [{ id: "f1", kind: "main", data: [{ name: nome, type: "integer", initial: "1" }], body: [], end: { id: "b1" } }],
  });

  test("nessun dato può chiamarsi come uno di loro, in nessuna lingua", () => {
    expect(nomiRiservatiDeiGeneratori.length).toBeGreaterThanOrEqual(2 * 20);
    const accettato = (n: string) => {
      const c = controlla(conUnDato(n), tetti);
      return !c.fuoriTappa && c.errori.length === 0;
    };
    expect(nomiRiservatiDeiGeneratori.filter(accettato)).toEqual([]);
    // Controllo positivo: lo stesso progetto con un nome libero non ha errori.
    expect(controlla(conUnDato("voto"), tetti)).toMatchObject({ errori: [] });
  });

  test("la copia di un dato non prende mai un nome riservato: nessuno finisce con _<numero>", () => {
    expect(nomiRiservatiDeiGeneratori.filter((n) => /_\d+$/.test(n))).toEqual([]);
    expect(Object.values(nomeDellIndice).every((n) => n.startsWith("_"))).toBe(true);
    // gli indici dei livelli dopo il primo: col trattino basso, e mai la forma della copia di un dato
    const livelli = lingue.flatMap((l) => [2, 3, 10].map((k) => indiceDelLivello(l, k)));
    expect(livelli).toEqual(["_indice2", "_indice3", "_indice10", "_index2", "_index3", "_index10"]);
    expect(livelli.filter((n) => /_\d+$/.test(n))).toEqual([]);
    const p = leggi("tappa-1/riferimento-media-voti.algo");
    const r = duplicaDato(1)(p, 100);
    if (!r.ok) throw new Error(`la copia non riesce: ${r.rifiuto.motivo}`);
    expect(r.progetto.functions[0]!.data.map((d) => d.name).slice(1, 3)).toEqual(["voto", "voto_2"]);
  });

  test("le funzioni di supporto di un operatore a parola ne portano il nome, in ogni lingua", () => {
    const coppie = { elevatoA: "raised_to", arrotonda: "round", perDifetto: "round_down", perEccesso: "round_up", parteIntera: "integer_part", convertiACarattere: "to_character", convertiAVettore: "to_array", convertiAStringa: "to_string" } as const;
    for (const l of lingue) for (const [f, op] of Object.entries(coppie)) expect(nomiDelSupporto[l][f as keyof typeof coppie], `${l} ${f}`).toBe(nomiDegliOperatori[l][op]);
  });

  test("il programma generato chiama solo funzioni di supporto definite e nomi di Python riservati", () => {
    const programmi = [...corpus.map((x) => x.p), tutteLeForme, altreForme, formeDeiCicli, ...generatiDellaTappa3, formeDelRisultato];
    let chiamate = 0;
    for (const l of lingue)
      for (const p of programmi) {
        const t = codice(p, l);
        const definite = new Set([...t.matchAll(/^def (\w+)\(/gm)].map((m) => m[1]!));
        // Le chiamate che non sono metodi, fuori dai letterali e dai commenti.
        const senza = t.replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|#.*$/gm, "");
        for (const [, nome] of senza.matchAll(/(?<![.\w])([A-Za-z_]\w*)(?=\()/g)) {
          chiamate++;
          if (definite.has(nome!)) continue;
          expect(nomiDiPython as readonly string[], `${p.metadata.name} (${l}): ${nome}`).toContain(nome!);
        }
        for (const [, modulo] of t.matchAll(/^import (\w+)$/gm)) expect(nomiDiPython as readonly string[]).toContain(modulo!);
        // Le procedure e le funzioni del progetto hanno i loro nomi; ogni altra definizione è del generatore.
        const delProgetto = new Set(p.functions.flatMap((f) => (f.name === undefined ? [] : [f.name])));
        for (const d of definite) if (!delProgetto.has(d)) expect(nomiRiservatiDeiGeneratori, `${p.metadata.name} (${l}): ${d}`).toContain(d);
      }
    expect(chiamate).toBeGreaterThan(500);
  });
});

describe("i motivi d'errore", () => {
  test("nei due versi: ogni motivo dice il suo codice, e i motivi di una lingua sono tutti diversi", () => {
    for (const l of lingue) {
      const voci = Object.entries(motivi[l]) as [CodiceDiUnMotivo, string][];
      expect(voci.length).toBe(10);
      for (const [c, testo] of voci) expect(codiceDelMotivo(l, testo)).toBe(c);
      expect(new Set(voci.map(([, t]) => t)).size).toBe(voci.length);
      expect(codiceDelMotivo(l, "motivo inventato")).toBeUndefined();
    }
  });

  test("le funzioni di supporto scrivono solo motivi della tabella, e la tabella intera", () => {
    for (const l of lingue) {
      const scritti = new Set<string>();
      const tappa4 = readdirSync(join(cartella, "tappa-4")).filter((f) => f.endsWith(".algo")).map((f) => leggi(`tappa-4/${f}`));
      // Gli arresti della ricorsione dicono anche la cornice da cui cercare la riga.
      for (const p of [...corpus.map((x) => x.p), tutteLeForme, altreForme, ...generatiDellaTappa3, ...tappa4])
        for (const [, m] of codice(p, l).matchAll(new RegExp(`${nomiDelSupporto[l].fermati}\\("([^"]*)"(?:, \\d+)?\\)`, "g"))) scritti.add(m!);
      expect([...scritti].filter((m) => codiceDelMotivo(l, m) === undefined)).toEqual([]);
      expect([...scritti].sort()).toEqual(Object.values(motivi[l]).sort());
    }
  });
});

describe("procedure e funzioni", () => {
  for (const l of lingue) {
    test(`riferimento-media-voti-funzioni (${l})`, () =>
      uguale(codice(leggi("tappa-3/riferimento-media-voti-funzioni.algo"), l), riferimentoDelleFunzioni[l], `riferimento della tappa 3 (${l})`));
    test(`forme-del-risultato (${l})`, () => uguale(codice(formeDelRisultato, l), formeDelRisultatoAttese[l], `forme del risultato (${l})`));
  }
  for (const [nome, atteso] of Object.entries(delCorpusDelleFunzioni)) test(nome, () => uguale(codice(leggi(`tappa-3/${nome}.algo`), "it"), atteso, nome));

  test("la provenienza del riferimento della tappa 3, riga per riga, uguale nelle due lingue; dopo, nessuna", () => {
    for (const l of lingue) {
      const r = righe(leggi("tappa-3/riferimento-media-voti-funzioni.algo"), l);
      const da = r.findIndex((x) => x.testo === "def main() -> None:");
      const fino = da + provenienzeDelRiferimentoDelleFunzioni.length;
      const provenienza = (x: Riga) => x.blocco ?? (x.dato === undefined ? "" : `${x.funzione ?? ""}=${x.dato}`);
      expect(r.slice(da, fino).map(provenienza)).toEqual([...provenienzeDelRiferimentoDelleFunzioni]);
      expect(r[fino]!.testo).toBe("");
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
    }
  });

  test("il corpus della tappa 3: si genera ogni file senza errori statici, gli altri no; nelle due lingue la stessa forma", () => {
    let generati = 0;
    for (const { f, p } of tappa3) {
      const statico = (p.test_cases ?? []).some((c) => c.expected.static_error !== undefined);
      for (const l of lingue) expect(python(p, tetti, l, paroleDelloPseudocodice(l)).generato, `${f} (${l})`).toBe(!statico);
      if (statico) continue;
      generati++;
      const [a, b] = lingue.map((l) => righe(p, l).map((x) => `${x.blocco ?? ""}|${x.dato ?? ""}|${x.funzione ?? ""}`));
      expect(b, f).toEqual(a!);
    }
    // il denominatore, contato a parte: 53 file, 7 col solo errore statico atteso
    expect([tappa3.length, generati]).toEqual([53, 46]);
  });

  test("una funzione che nessuno chiama ancora c'è nel codice, con le righe della sua fine", () => {
    const p = leggi("tappa-3/riferimento-media-voti-funzioni.algo");
    const valido = p.functions.find((f) => f.name === "valido")!;
    expect(valido.body).toEqual([]);
    const con: Progetto = { ...p, functions: [...p.functions, { ...valido, id: "f90", name: "mai_chiamata", end: { ...valido.end, id: "b90" } }] };
    for (const l of lingue) {
      const r = righe(con, l);
      expect(r.filter((x) => x.blocco === "b90").length, l).toBeGreaterThan(0);
      expect(r.filter((x) => x.testo.startsWith("def mai_chiamata(")).length, l).toBe(1);
    }
  });

  /** I casi dei programmi di prova che il corpus non ha, scritti qui. */
  const caso = (name: string, inputs: CasoDiUnaFunzione["inputs"]): CasoDiUnaFunzione => ({ name, inputs, expected: { output: "" } });
  const casiScrittiNellaProva: Readonly<Record<string, { p: Progetto; caso: CasoDiUnaFunzione }>> = {
    "riferimento-media-voti-funzioni#leggi_numero/da sola": {
      p: leggi("tappa-3/riferimento-media-voti-funzioni.algo"),
      caso: caso("da sola", [{ data: "numero", text: "0" }, { data: "numero", text: "4" }]),
    },
    "indice-del-riferimento#metti/due riferimenti": { p: leggi("tappa-3/indice-del-riferimento.algo"), caso: caso("due riferimenti", [{ data: "a", text: "1" }, { data: "b", text: "2" }]) },
    "vettore-per-riferimento#raddoppia/elementi": { p: vettorePerRiferimento, caso: caso("elementi", [{ data: "v", text: "3" }, { data: "v", text: "4" }]) },
  };
  /** Il progetto, la funzione e il caso di un nome `file#funzione/caso`: dal corpus, o scritti qui. */
  const delCaso = (nome: string): { p: Progetto; f: Funzione; caso: CasoDiUnaFunzione } => {
    const [file, resto] = nome.split("#") as [string, string];
    const [funzione, nomeDelCaso] = resto.split("/") as [string, string];
    const scritto = casiScrittiNellaProva[nome];
    const p = scritto?.p ?? leggi(`tappa-3/${file}.algo`);
    const f = p.functions.find((g) => g.name === funzione)!;
    return { p, f, caso: scritto?.caso ?? f.test_cases!.find((c) => c.name === nomeDelCaso)! };
  };

  for (const [nome, atteso] of Object.entries(proveDelleFunzioni))
    test(`il programma di prova di ${nome}`, () => {
      const { p, f, caso: k } = delCaso(nome);
      const g = python(p, tetti, "it", paroleDelloPseudocodice("it"), { funzione: f.id, caso: k });
      if (!g.generato) throw new Error(`${nome} non generato: ${g.perche}`);
      uguale(testoDelCodice(g.righe), atteso, nome);
      // le letture dei parametri hanno la provenienza della funzione: l'errore di una lettura cade sul suo «Inizio»; uno per
      // uscita non si legge
      const parametri = f.data.filter((d) => d.parameter !== undefined && d.parameter !== "out").map((d) => `    ${d.name}: `);
      expect(g.righe.filter((x) => x.blocco === f.id).map((x) => x.testo.slice(0, x.testo.indexOf(":") + 2)), nome).toEqual(parametri);
    });

  test("ogni caso di una funzione del corpus ha il suo programma di prova; un caso che una riga non porta non ce l'ha", () => {
    let prove = 0;
    for (const { f: file, p } of tappa3)
      for (const f of p.functions)
        for (const k of f.test_cases ?? []) {
          for (const l of lingue) expect(python(p, tetti, l, paroleDelloPseudocodice(l), { funzione: f.id, caso: k }).generato, `${file} ${f.name}/${k.name}`).toBe(true);
          prove++;
        }
    // Undici restituiscono una stringa o un vettore.
    expect(prove).toBe(26);
    const { p, f } = delCaso("riferimento-media-voti-funzioni#valido/voto valido");
    expect(() => python(p, tetti, "it", paroleDelloPseudocodice("it"), { funzione: f.id, caso: caso("senza testo", [{ data: "voto" }]) })).toThrow("lo vuole");
  });
});

describe("l'indice calcolato prima del valore", () => {
  test("solo quando il calcolo dell'indice può fermare il programma", () => {
    const t = codice(altreForme, "it");
    expect(t).toContain("    _indice = ord(carattere_di(s, k)) - 97\n    conta[_indice] = leggi_intero()\n");
    // Un indice che non può fermare il programma resta dov'è.
    expect(codice(leggi("tappa-1/indice-fuori.algo"), "it")).toContain("    v[i] = 1\n");
    expect(codice(leggi("tappa-1/indice-fuori.algo"), "it")).not.toContain("_indice");
  });
});
