// Il C generato contro gli attesi scritti a mano (`attesi-del-c.ts`), la provenienza delle righe su tutto il corpus
// delle tappe 1 e 3, i nomi che il C usa per sé (riservati), i motivi d'errore, l'indice calcolato prima del valore, le
// procedure e le funzioni coi programmi di prova dei loro casi. Che il
// programma generato compili senza avvisi e dia l'output dell'interprete non si prova qui (servirebbero i compilatori
// sulla macchina che corre le prove): gli attesi sono stati compilati con gcc e clang ed eseguiti contro i casi d'uso,
// e il confronto vero è dello strumento che esegue i programmi generati.
//
// Che cosa queste prove NON guardano:
// - i programmi del corpus senza atteso scritto, se non per la provenienza, la stessa forma nelle due lingue, i nomi
//   e i motivi;
// - che le funzioni di supporto facciano ciò che dicono, e che il C compili: lo prova la loro esecuzione;
// - i nomi delle intestazioni del C che il programma non legge (le funzioni della libreria che nessuna regola chiama).
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eseguiCaso } from "../../core/casi/esecutore";
import { funzioniDelGiro, tetti } from "../../core/controllo/controllo";
import { spazioDiUnaChiamata, tettoDelleChiamate } from "../../core/controllo/spazio";
import { c } from "../../core/genera/c";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { codiceDelMotivo, motivi, motiviCol } from "../../core/genera/motivi";
import { voceDel } from "../../core/genera/linguaggi";
import { nomeDellaRiga, nomiDelC, nomiDelSupporto, nomiDelSupportoDelC } from "../../core/genera/nomi";
import { apri } from "../../core/progetto/formato";
import type { Blocco, CasoDiUnaFunzione, Funzione, Progetto } from "../../core/progetto/modello";
import { testoDelMessaggio } from "../../i18n/codici";
import type { Lingua } from "../../i18n/lingue";
import {
  altreFormeAttese,
  delCorpus,
  delCorpusDelleFunzioni,
  formeDeiCicliAttese,
  formeDelC,
  formeDelCAttese,
  formeDelleFunzioni,
  formeDelleFunzioniAttese,
  formeDelRisultato,
  formeDelRisultatoAttese,
  provenienzeDeiCicli,
  provenienzeDelRiferimento,
  provenienzeDelRiferimentoDelleFunzioni,
  proveDelleFunzioni,
  riferimento,
  riferimentoDelleFunzioni,
  tutteLeFormeAttese,
} from "./attesi-del-c";
import { altreForme, vettorePerRiferimento } from "./attesi-del-python";
import { formeDeiCicli, tutteLeForme } from "./attesi-dello-pseudocodice";
import { paroleDelloPseudocodice } from "./parole";
import { provenienzaConLeFasi, provaIlCorpusDeiCicli, rifiutatiDellaTappa2 } from "./provenienza-dei-cicli";

/** I nomi che la voce del C dichiara nel registro dei linguaggi: il C generato definisce solo questi. */
const riservatiDelC = voceDel("c").riservati;

const lingue: readonly Lingua[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, percorso), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

function righe(p: Progetto, lingua: Lingua): readonly Riga[] {
  const g = c(p, tetti, lingua, paroleDelloPseudocodice(lingua));
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
const tappa3 = readdirSync(join(cartella, "tappa-3"))
  .filter((f) => f.endsWith(".algo"))
  .map((f) => ({ f, p: leggi(`tappa-3/${f}`) }));
/** I file della tappa 3 senza errori statici: quelli che il C genera. */
const generatiDellaTappa3 = tappa3.filter(({ p }) => !(p.test_cases ?? []).some((k) => k.expected.static_error !== undefined)).map((x) => x.p);
/** I programmi della tappa 4: la ricorsione. */
const tappa4 = readdirSync(join(cartella, "tappa-4"))
  .filter((f) => f.endsWith(".algo"))
  .map((f) => ({ f, p: leggi(`tappa-4/${f}`) }));
/** I programmi dei tipi (record, matrici, tabelle) senza errori statici: quelli che il C genera. */
const generatiDeiTipi = readdirSync(join(cartella, "tipi"))
  .filter((f) => f.endsWith(".algo"))
  .map((f) => leggi(`tipi/${f}`))
  .filter((p) => !(p.test_cases ?? []).some((k) => k.expected.static_error !== undefined));
const programmi = [...corpus.map((x) => x.p), tutteLeForme, altreForme, formeDelC, formeDeiCicli, ...generatiDellaTappa3, formeDelleFunzioni, formeDelRisultato, ...tappa4.map((x) => x.p), ...generatiDeiTipi];

describe("il C uguale all'atteso scritto a mano", () => {
  for (const l of lingue) {
    test(`riferimento-media-voti (${l})`, () => uguale(codice(leggi("tappa-1/riferimento-media-voti.algo"), l), riferimento[l], `riferimento (${l})`));
    test(`tutte-le-forme (${l})`, () => uguale(codice(tutteLeForme, l), tutteLeFormeAttese[l], `tutte-le-forme (${l})`));
    test(`altre-forme (${l})`, () => uguale(codice(altreForme, l), altreFormeAttese[l], `altre-forme (${l})`));
    test(`forme-del-c (${l})`, () => uguale(codice(formeDelC, l), formeDelCAttese[l], `forme-del-c (${l})`));
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
      expect(t).toContain("            v[i] = '*';\n");
      expect(t).toContain('    printf("%.3f\\n", 2.5);\n');
    }
    expect(codice(q, "it")).toContain("poi il carattere di riempimento; si ferma se la");
    expect(codice(q, "en")).toContain("then the padding character; stops if the");
  });
});

describe("la provenienza delle righe", () => {
  test("riga per riga nel riferimento, uguale nelle due lingue; dopo il programma principale nessuna", () => {
    for (const l of lingue) {
      const r = righe(leggi("tappa-1/riferimento-media-voti.algo"), l);
      const fino = provenienzeDelRiferimento.length;
      expect(r.slice(0, fino).map((x) => x.blocco ?? (x.dato === undefined ? "" : `=${x.dato}`))).toEqual([...provenienzeDelRiferimento]);
      expect(r[fino - 1]!.testo).toBe("}");
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
    }
  });

  test("ogni blocco del corpus ha le sue righe, nell'ordine dell'albero; ogni dato la sua; una provenienza al più per riga; la fine su return", () => {
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
      expect([...new Set(r.filter((x) => x.blocco !== undefined && x.blocco !== main.end.id).map((x) => x.blocco!))], f).toEqual(ordine);
      expect(r.filter((x) => x.blocco === main.end.id).map((x) => x.testo), f).toEqual(["    return 0;"]);
      const nomi = [...(p.shared_constants ?? []), ...main.data].map((d) => d.name);
      expect(r.filter((x) => x.dato !== undefined).map((x) => x.dato), f).toEqual(nomi);
      blocchi += ordine.length;
      dati += nomi.length;
    }
    // il denominatore: i blocchi e i dati del corpus della tappa 1, contati a parte
    expect(corpus.length).toBe(56);
    expect(blocchi).toBe(153);
    expect(dati).toBe(104);
  });

  test("riga per riga nel programma principale di «forme dei cicli», con le fasi, uguale nelle due lingue; dopo, nessuna", () => {
    for (const l of lingue) {
      const r = righe(formeDeiCicli, l);
      const da = r.findIndex((x) => x.testo === `    ${nomiDelSupportoDelC[l].preparaConsole}();`) + 1;
      const fino = da + provenienzeDeiCicli.length;
      expect(da).toBeGreaterThan(0);
      expect(r.slice(da, fino).map(provenienzaConLeFasi)).toEqual([...provenienzeDeiCicli]);
      expect(r[fino - 1]!.testo).toBe("}");
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
    }
  });

  const tappa2 = readdirSync(join(cartella, "tappa-2"))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => ({ f, p: leggi(`tappa-2/${f}`) }));
  test("il corpus della tappa 2: ogni blocco nell'ordine dell'albero, ogni fase di un ciclo con le sue righe, nelle due lingue", () => {
    for (const l of lingue) {
      const e = provaIlCorpusDeiCicli(tappa2, (p) => c(p, tetti, l, paroleDelloPseudocodice(l)));
      expect(e.difetti, l).toEqual([]);
      // il denominatore, contato a parte: 15 file, 3 con l'errore statico atteso; 83 blocchi e 25 cicli negli altri
      expect(e.rifiutati.sort(), l).toEqual([...rifiutatiDellaTappa2]);
      expect([e.generati, e.blocchi, e.cicli], l).toEqual([12, 83, 25]);
    }
  });
});

describe("il progetto che non si genera", () => {
  test("con un errore statico: nessun testo a metà", () => {
    const p = leggi("tappa-1/riferimento-media-voti.algo");
    const main = p.functions[0]!;
    const rotto: Progetto = { ...p, functions: [{ ...main, body: [...main.body, { id: "b99", kind: "assignment", target: "somma", value: "somma +" }] }] };
    expect(c(rotto, tetti, "it", paroleDelloPseudocodice("it"))).toEqual({ generato: false, perche: "errori-statici" });
  });

});

describe("la ricorsione", () => {
  test("ogni file della tappa 4 si genera nelle due lingue", () => {
    expect(tappa4.length).toBe(22);
    for (const { f, p } of tappa4) for (const l of lingue) expect(c(p, tetti, l, paroleDelloPseudocodice(l)).generato, `${f} (${l})`).toBe(true);
  });

  test("il contatore solo nelle funzioni del giro, con lo spazio del nucleo; la riga della chiamata solo verso di loro", () => {
    let conGiro = 0;
    let senzaGiro = 0;
    for (const p of programmi)
      for (const l of lingue) {
        const t = codice(p, l);
        const n = nomiDelSupporto[l];
        const delGiro = [...funzioniDelGiro(p)];
        const spazi = delGiro.map((f) => spazioDiUnaChiamata(f, p)).sort();
        const righe = (nome: string) => [...t.matchAll(new RegExp(`^    ${nome}\\((?:${nomeDellaRiga[l]}, )?(\\d+)\\);$`, "gm"))].map((m) => Number(m[1])).sort();
        expect(righe(n.entraNellaRicorsione), `${p.metadata.name} (${l})`).toEqual(spazi);
        expect(righe(n.esciDallaRicorsione), `${p.metadata.name} (${l})`).toEqual(spazi);
        // Le chiamate col numero della riga vanno solo alle funzioni del giro, e ognuna lo riceve per primo.
        const chiamate = [...t.matchAll(/\b(\w+)\(__LINE__\b/g)].map((m) => m[1]!).filter((x) => p.functions.some((f) => f.name === x));
        expect(chiamate.filter((x) => !delGiro.some((f) => f.name === x)), `${p.metadata.name} (${l})`).toEqual([]);
        for (const f of delGiro) expect(t, `${p.metadata.name} (${l})`).toContain(` ${f.name}(int ${nomeDellaRiga[l]}`);
        if (delGiro.length > 0) conGiro++;
        else senzaGiro++;
      }
    // Il controllo positivo: le due specie ci sono.
    expect(conGiro).toBe(2 * 22);
    expect(senzaGiro).toBeGreaterThan(100);
  });

  test("ogni concatenazione ha l'area della lunghezza massima del suo risultato", () => {
    const t = codice(leggi("tappa-4/concatenazione-in-ogni-chiamata.algo"), "it");
    expect(t).toContain('concatena(2, "a", "b")');
    expect(t).toContain("concatena(1000, a, b)");
    expect(t).toContain("#define concatena(n, a, b) concatena_in((char[4 * (n) + 1]){0}, a, b)");
  });

  test("un'espressione di 63 livelli si genera subito: il tipo di ogni lato si calcola una volta sola", () => {
    const inizio = performance.now();
    codice(leggi("tappa-4/chiamata-in-63-livelli.algo"), "it");
    expect(performance.now() - inizio).toBeLessThan(2000);
  });
});

describe("i nomi che il C usa per sé", () => {
  test("il programma generato chiama solo funzioni e macro che definisce, e nomi del C riservati; quelli che definisce sono riservati", () => {
    const parole = new Set(["if", "while", "for", "return", "sizeof"]);
    let chiamate = 0;
    let definiti = 0;
    for (const l of lingue)
      for (const p of programmi) {
        const t = codice(p, l);
        const definite = new Set([...t.matchAll(/^static [^(]*?(\w+)\(/gm), ...t.matchAll(/^#define (\w+)\(/gm)].map((m) => m[1]!));
        // Le procedure e le funzioni del progetto hanno i loro nomi: si chiamano, e non sono del generatore.
        const delProgetto = new Set(p.functions.flatMap((f) => (f.name === undefined ? [] : [f.name])));
        // Le chiamate fuori dai commenti, dai letterali e dalle direttive.
        const senza = t.replace(/\/\*[\s\S]*?\*\/|"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|^#.*$/gm, "");
        for (const [, nome] of senza.matchAll(/(?<![\w.])([A-Za-z]\w*)(?=\()/g)) {
          chiamate++;
          if (definite.has(nome!) || parole.has(nome!) || delProgetto.has(nome!)) continue;
          expect(nomiDelC as readonly string[], `${p.metadata.name} (${l}): ${nome}`).toContain(nome!);
        }
        for (const d of definite) {
          definiti++;
          expect(riservatiDelC, `${p.metadata.name} (${l}): ${d}`).toContain(d);
        }
      }
    expect(chiamate).toBeGreaterThan(1000);
    expect(definiti).toBeGreaterThan(400);
  });

  test("le macro delle intestazioni e le parole del C23 sono riservate", () => {
    for (const nome of ["EOF", "NULL", "INT_MAX", "stdin", "errno", "bool", "nullptr", "constexpr", "typeof", "leggi_intero_alla_riga", "read_integer_with_line", "concatena_in", "concatenate_into"])
      expect(riservatiDelC, nome).toContain(nome);
    // Nessun nome riservato finisce con _<numero>, la forma della copia di un dato.
    expect(riservatiDelC.filter((n) => /_\d+$/.test(n))).toEqual([]);
  });
});

describe("i motivi d'errore", () => {
  test("i due tetti della ricorsione hanno il testo breve dei messaggi dell'interfaccia, col tetto del progetto", () => {
    for (const l of lingue)
      for (const codice of ["recursion_too_deep", "recursion_data_too_large"] as const)
        for (const tetto of [500, 10]) expect(motiviCol(tetto)[l][codice], `${codice} (${l}, ${tetto})`).toBe(testoDelMessaggio(l, codice, false, tetto).breve);
  });

  test("le funzioni di supporto scrivono solo motivi della tabella, e la tabella intera", () => {
    for (const l of lingue) {
      const scritti = new Set<string>();
      for (const p of programmi)
        // Ogni motivo si legge con la tabella del tetto del suo progetto (la ricorsione senza uscita ha la pila a 10).
        for (const [, m] of codice(p, l).matchAll(new RegExp(`${nomiDelSupporto[l].fermati}\\(\\w+, "([^"]*)"\\)`, "g")))
          scritti.add(codiceDelMotivo(l, m!, motiviCol(tettoDelleChiamate(p))) ?? `senza codice: ${m}`);
      expect([...scritti].sort()).toEqual(Object.keys(motivi[l]).sort());
    }
  });

  test("il conto delle chiamate si ferma oltre il tetto del progetto", () => {
    // Il numero del confronto viene dal tetto del progetto: con la pila a 10 e senza il campo (500).
    for (const [file, tetto] of [["tappa-4/ricorsione-senza-uscita.algo", 10], ["tappa-4/ricorsione-profonda.algo", 500]] as const)
      for (const l of lingue) {
        const p = leggi(file);
        expect(tettoDelleChiamate(p)).toBe(tetto);
        expect([...codice(p, l).matchAll(/if \(\+\+\w+ > (\d+)\) /g)].map(([, n]) => Number(n)), `${file} (${l})`).toEqual([tetto]);
      }
  });
});

describe("procedure e funzioni", () => {
  for (const l of lingue) {
    test(`riferimento-media-voti-funzioni (${l})`, () =>
      uguale(codice(leggi("tappa-3/riferimento-media-voti-funzioni.algo"), l), riferimentoDelleFunzioni[l], `riferimento della tappa 3 (${l})`));
    test(`forme-delle-funzioni (${l})`, () => uguale(codice(formeDelleFunzioni, l), formeDelleFunzioniAttese[l], `forme delle funzioni (${l})`));
    test(`forme-del-risultato (${l})`, () => uguale(codice(formeDelRisultato, l), formeDelRisultatoAttese[l], `forme del risultato (${l})`));
  }
  for (const [nome, atteso] of Object.entries(delCorpusDelleFunzioni)) test(nome, () => uguale(codice(leggi(`tappa-3/${nome}.algo`), "it"), atteso, nome));

  test("le forme delle funzioni e del risultato sono progetti senza errori, e l'interprete dà l'output del caso", () => {
    for (const p of [formeDelleFunzioni, formeDelRisultato]) {
      const esito = eseguiCaso(p, p.test_cases![0]!, tetti);
      expect(esito, p.metadata.name).toMatchObject({ fuoriTappa: false, raggiunto: true, differenze: [] });
    }
  });

  test("la provenienza del riferimento della tappa 3, riga per riga, uguale nelle due lingue; dopo, nessuna", () => {
    for (const l of lingue) {
      const r = righe(leggi("tappa-3/riferimento-media-voti-funzioni.algo"), l);
      const da = r.findIndex((x) => x.testo === "int main(void) {");
      const fino = da + provenienzeDelRiferimentoDelleFunzioni.length;
      const provenienza = (x: Riga) => x.blocco ?? (x.dato === undefined ? "" : `${x.funzione ?? ""}=${x.dato}`);
      expect(r.slice(da, fino).map(provenienza)).toEqual([...provenienzeDelRiferimentoDelleFunzioni]);
      expect(r[fino]!.testo).toBe("");
      expect(r.slice(fino).filter((x) => x.blocco !== undefined || x.dato !== undefined)).toEqual([]);
    }
  });

  test("il corpus della tappa 3: si genera ogni file senza errori statici; nelle due lingue la stessa forma; ogni blocco e ogni fine hanno le loro righe", () => {
    const tutti = (bs: readonly Blocco[]): string[] =>
      bs.flatMap((b) => [b.id, ...tutti(b.kind === "if" ? [...b.then, ...b.else] : b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each" ? b.body : [])]);
    let generati = 0;
    let blocchi = 0;
    for (const { f, p } of tappa3) {
      const statico = (p.test_cases ?? []).some((k) => k.expected.static_error !== undefined);
      for (const l of lingue) expect(c(p, tetti, l, paroleDelloPseudocodice(l)).generato, `${f} (${l})`).toBe(!statico);
      if (statico) continue;
      generati++;
      const [a, b] = lingue.map((l) => righe(p, l).map((x) => `${x.blocco ?? ""}|${x.dato ?? ""}|${x.funzione ?? ""}`));
      expect(b, f).toEqual(a!);
      const attesi = p.functions.flatMap((g) => [...tutti(g.body), g.end.id]);
      expect([...new Set(righe(p, "it").flatMap((x) => (x.blocco === undefined ? [] : [x.blocco])))].sort(), f).toEqual(attesi.sort());
      blocchi += attesi.length;
    }
    // il denominatore, contato a parte: 53 file, 7 col solo errore statico atteso; i blocchi e le fini degli altri (65
    // negli 11 con una stringa o un vettore restituiti)
    expect([tappa3.length, generati, blocchi]).toEqual([53, 46, 331]);
  });

  test("una funzione che nessuno chiama ancora c'è nel codice, col prototipo e con le righe della sua fine", () => {
    const p = leggi("tappa-3/riferimento-media-voti-funzioni.algo");
    const valido = p.functions.find((f) => f.name === "valido")!;
    expect(valido.body).toEqual([]);
    const con: Progetto = { ...p, functions: [...p.functions, { ...valido, id: "f90", name: "mai_chiamata", end: { ...valido.end, id: "b90" } }] };
    for (const l of lingue) {
      const r = righe(con, l);
      expect(r.filter((x) => x.blocco === "b90").length, l).toBeGreaterThan(0);
      expect(r.filter((x) => x.testo.startsWith("bool mai_chiamata(")).length, l).toBe(2);
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
    "parametro-carattere#successivo/y": { p: leggi("tappa-3/parametro-carattere.algo"), caso: caso("y", [{ data: "c", text: "y" }]) },
  };
  /** Il progetto, la funzione e il caso di un nome `file#funzione/caso`: dal corpus, o scritti qui. */
  const delCaso = (nome: string): { p: Progetto; f: Funzione; caso: CasoDiUnaFunzione } => {
    const [file, resto] = nome.split("#") as [string, string];
    const [funzione, nomeDelCaso] = resto.split("/") as [string, string];
    const scritto = casiScrittiNellaProva[nome];
    const p = scritto?.p ?? leggi(`tappa-3/${file}.algo`);
    const f = p.functions.find((g) => g.name === funzione)!;
    return { p, f, caso: scritto?.caso ?? f.test_cases!.find((k) => k.name === nomeDelCaso)! };
  };

  for (const [nome, atteso] of Object.entries(proveDelleFunzioni))
    test(`il programma di prova di ${nome}`, () => {
      const { p, f, caso: k } = delCaso(nome);
      const g = c(p, tetti, "it", paroleDelloPseudocodice("it"), { funzione: f.id, caso: k });
      if (!g.generato) throw new Error(`${nome} non generato: ${g.perche}`);
      uguale(testoDelCodice(g.righe), atteso, nome);
      // le letture dei parametri hanno la provenienza della funzione: l'errore di una lettura cade sul suo «Inizio»; uno
      // per uscita non si legge
      const letture = k.inputs.slice(0, f.data.filter((d) => d.parameter !== undefined && d.parameter !== "out").reduce((n, d) => n + (d.size ?? 1), 0)).filter((v) => v.text !== undefined && v.each !== true).length;
      const conOgnuno = k.inputs.some((v) => v.each === true && v.text !== undefined) ? 1 : 0;
      const dellaFunzione = g.righe.filter((x) => x.blocco === f.id).map((x) => x.testo);
      expect(dellaFunzione.length, nome).toBe(letture + conOgnuno);
      for (const t of dellaFunzione) expect(t, nome).toMatch(/^    .*\bleggi_\w+\(/);
    });

  test("ogni caso di una funzione del corpus ha il suo programma di prova", () => {
    let prove = 0;
    for (const { f: file, p } of tappa3)
      for (const f of p.functions)
        for (const k of f.test_cases ?? []) {
          for (const l of lingue) expect(c(p, tetti, l, paroleDelloPseudocodice(l), { funzione: f.id, caso: k }).generato, `${file} ${f.name}/${k.name}`).toBe(true);
          prove++;
        }
    // Undici restituiscono una stringa o un vettore.
    expect(prove).toBe(26);
  });
});

describe("l'indice calcolato prima del valore", () => {
  test("solo quando il calcolo dell'indice può fermare il programma", () => {
    const t = codice(altreForme, "it");
    expect(t).toContain("    _indice = carattere_di(s, k) - 97;\n    conta[_indice] = leggi_intero();\n");
    expect(t).toContain("    int _indice;\n");
    // Un indice che non può fermare il programma resta dov'è.
    expect(codice(leggi("tappa-1/indice-fuori.algo"), "it")).toContain("    v[i] = 1;\n");
    expect(codice(leggi("tappa-1/indice-fuori.algo"), "it")).not.toContain("_indice");
  });
});
