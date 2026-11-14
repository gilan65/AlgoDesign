// Il corpus dei file di Flowgorithm (`casi-flowgorithm/`, scritti da noi) contro il suo elenco: ogni file dà l'esito
// atteso, «converte» con l'output, o «si ferma» col codice e i parametri del messaggio; con la rinomina, l'esito che
// l'elenco dice. L'output «flowgorithm» dell'elenco è quello confermato su Flowgorithm 4.5, eseguendo ogni file e
// leggendone l'output; «algodesign» è quello che l'interprete deve dare sul progetto convertito, e i due
// sono uguali a meno dei reali: Flowgorithm li scrive con 15 cifre significative, AlgoDesign coi decimali del progetto
// (la regola `stessoOutput` qui sotto, provata anche sul suo rovescio).
//
// Che cosa queste prove NON guardano: il codice generato (il differenziale, `strumenti/flowgorithm-differenziale.ts`);
// le parole dei messaggi (qui codici e parametri, e che ogni testo li contenga); gli avvisi del controllo statico (il progetto si
// apre e si esegue lo stesso).
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { confermato } from "../../strumenti/corpus";
import { eseguiCaso } from "../casi/esecutore";
import { controlla, tetti } from "../controllo/controllo";
import { salva } from "../progetto/formato";
import { codiciDelMessaggio, leggiFlowgorithm, testoDelMessaggio, type Conversione } from "./flowgorithm";

const cartella = join(import.meta.dir, "..", "..", "casi-flowgorithm");
type Atteso =
  | { esito: "converte"; flowgorithm: string | null; algodesign: string; rinominati?: [string, string][] }
  | { esito: "si ferma"; messaggio: { codice: string } & Record<string, string> };
type Voce = Atteso & { file: string; tema: string; rinomina?: Atteso; metadati?: Record<string, string>; gemello?: string };
const elenco = (JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8")) as { file: Voce[] }).file;
const sulDisco = readdirSync(cartella).filter((f) => f.endsWith(".fprg")).sort();
const testoDi = (f: string) => readFileSync(join(cartella, f), "utf8");

/** Uguali a meno dei reali: riga per riga, le parti che non sono numeri uguali, ogni numero uguale o, in AlgoDesign, il
 * valore di Flowgorithm coi decimali del progetto. */
export function stessoOutput(flowgorithm: string, algodesign: string, decimali = 2): boolean {
  const a = flowgorithm.split("\n");
  const b = algodesign.split("\n");
  if (a.length !== b.length) return false;
  const numero = /-?\d+(?:\.\d+)?(?:E[+-]\d+)?/g;
  return a.every((x, i) => {
    const y = b[i]!;
    if (x.replace(numero, "#") !== y.replace(numero, "#")) return false;
    const nx = x.match(numero) ?? [];
    const ny = y.match(numero) ?? [];
    return nx.every((n, k) => n === ny[k] || Number(n).toFixed(decimali) === ny[k]);
  });
}

/** L'esito di una conversione nella forma dell'elenco, con l'output dell'interprete. */
function esitoDi(c: Conversione): Atteso {
  if (!c.ok) {
    const { dettaglio: _, ...parametri } = c.messaggio.parametri;
    return { esito: "si ferma", messaggio: { codice: c.messaggio.codice, ...parametri } };
  }
  const controllo = controlla(c.progetto, tetti);
  if (controllo.fuoriTappa || controllo.errori.length > 0) throw new Error(`errori statici: ${JSON.stringify(controllo)}`);
  const e = eseguiCaso(c.progetto, { name: "oracolo", inputs: [], expected: { output: "" } }, tetti);
  if (e.fuoriTappa) throw new Error("fuori tappa");
  if (e.ottenuto.error !== undefined || e.ottenuto.static_error !== undefined) throw new Error(`l'esecuzione si ferma: ${JSON.stringify(e.ottenuto)}`);
  const rinominati = c.trasformazioni.filter((t) => t.specie.startsWith("rinomina-")).map((t) => [t.nome!, t.nuovo!] as [string, string]);
  return { esito: "converte", flowgorithm: null, algodesign: e.ottenuto.output, ...(rinominati.length > 0 ? { rinominati } : {}) };
}
/** L'atteso dell'elenco senza ciò che la conversione non dà (l'output di Flowgorithm). */
const comeEsito = (a: Atteso): Atteso =>
  a.esito === "converte"
    ? { esito: "converte", flowgorithm: null, algodesign: a.algodesign, ...(a.rinominati !== undefined ? { rinominati: a.rinominati } : {}) }
    : { esito: "si ferma", messaggio: a.messaggio };

describe("il corpus contro l'elenco", () => {
  test("i file sul disco e le voci dell'elenco, appaiati per nome nei due versi", () => {
    const nomi = elenco.map((v) => v.file);
    const senzaVoce = sulDisco.filter((f) => !nomi.includes(f));
    const senzaFile = nomi.filter((f) => !sulDisco.includes(f));
    const doppie = nomi.filter((f, i) => nomi.indexOf(f) !== i);
    console.log(`casi-flowgorithm: ${sulDisco.length} file .fprg sul disco, ${nomi.length} voci; senza voce ${senzaVoce.length}, senza file ${senzaFile.length}, doppie ${doppie.length}`);
    expect({ senzaVoce, senzaFile, doppie }).toEqual({ senzaVoce: [], senzaFile: [], doppie: [] });
    expect(sulDisco.length).toBeGreaterThan(0);
  });

  for (const v of elenco)
    test(`${v.file}: ${v.esito === "converte" ? "converte" : `si ferma (${v.messaggio.codice})`}`, () => {
      const c = leggiFlowgorithm(testoDi(v.file));
      expect(esitoDi(c)).toEqual(comeEsito(v));
      if (v.esito === "converte" && v.flowgorithm !== null) expect(stessoOutput(v.flowgorithm, v.algodesign)).toBe(true);
      if (v.rinomina !== undefined) {
        const r = leggiFlowgorithm(testoDi(v.file), { rinomina: true });
        expect(esitoDi(r)).toEqual(comeEsito(v.rinomina));
        if (v.rinomina.esito === "converte" && v.rinomina.flowgorithm !== null) expect(stessoOutput(v.rinomina.flowgorithm, v.rinomina.algodesign)).toBe(true);
      }
      if (v.metadati !== undefined && c.ok) expect(c.progetto.metadata).toEqual(v.metadati as never);
      if (v.gemello !== undefined) {
        // L'output di un file che Flowgorithm non apre è quello del gemello che apre, confermato.
        const g = elenco.find((x) => x.file === `${v.gemello}.fprg`);
        expect(g?.esito === "converte" && g.flowgorithm !== null && v.esito === "converte" ? v.algodesign : "senza un gemello confermato").toBe(g?.esito === "converte" ? g.algodesign : "");
      }
    });

  test("i conteggi degli esiti, confermati", () => {
    const conta = (f: (v: Voce) => boolean) => elenco.filter(f).length;
    const conteggi = {
      converte: conta((v) => v.esito === "converte"),
      siFerma: conta((v) => v.esito === "si ferma"),
      confermatiSuFlowgorithm: conta((v) => v.esito === "converte" && v.flowgorithm !== null),
      dichiarazioni: conta((v) => v.tema === "dichiarazioni"),
      conLaRinomina: conta((v) => v.rinomina !== undefined),
      convertonoConLaRinomina: conta((v) => v.esito === "si ferma" && v.rinomina?.esito === "converte"),
    };
    console.log(`casi-flowgorithm, esiti: ${JSON.stringify(conteggi)}`);
    expect(conteggi.converte + conteggi.siFerma).toBe(elenco.length);
    expect(conteggi).toEqual(confermato("flowgorithm - esiti sul corpus", conteggi));
  });
});

describe("i testi dei messaggi", () => {
  test("ogni messaggio del corpus ha il suo testo, coi parametri dentro e nessuno mancante; ogni codice ne ha almeno uno nel corpus", () => {
    const visti = new Set<string>();
    for (const v of elenco)
      for (const opzioni of [{}, { rinomina: true }]) {
        const c = leggiFlowgorithm(testoDi(v.file), opzioni);
        if (c.ok) continue;
        visti.add(c.messaggio.codice);
        const t = testoDelMessaggio(c.messaggio);
        expect(t.includes("undefined")).toBe(false);
        for (const [k, x] of Object.entries(c.messaggio.parametri)) if (k !== "dettaglio" && k !== "elemento") expect(t).toContain(x);
      }
    const senza = codiciDelMessaggio.filter((k) => !visti.has(k));
    console.log(`messaggi: ${visti.size} codici nel corpus su ${codiciDelMessaggio.length}; senza un file: ${senza.join(", ")}`);
    expect(senza).toEqual(["nome_non_valido", "dimensioni_diverse_negli_argomenti", "progetto_con_errori"]);
  });
});

describe("la regola dei reali", () => {
  test("lo stesso valore coi decimali del progetto è uguale; un altro valore, un altro testo o un'altra riga no", () => {
    expect(stessoOutput("V1 3.5\nV3 2\n", "V1 3.50\nV3 2.00\n")).toBe(true);
    expect(stessoOutput("F4 3.14159265358979\n", "F4 3.14\n")).toBe(true);
    expect(stessoOutput("V1 3.5\n", "V1 3\n")).toBe(false);
    expect(stessoOutput("V1 3.5\n", "V1 3.40\n")).toBe(false);
    expect(stessoOutput("V1 3.5\n", "X1 3.50\n")).toBe(false);
    expect(stessoOutput("V1 3.5\n", "V1 3.50\nV2\n")).toBe(false);
  });
});

describe("la privacy: created, edited e saved non passano", () => {
  test("il valore di prova è nel file del corpus e non nel progetto convertito", () => {
    const testo = testoDi("t-attributi.fprg");
    const valore = /name="edited" value="([^"]+)"/.exec(testo)?.[1];
    const c = leggiFlowgorithm(testo);
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    const algo = salva(c.progetto);
    console.log(`privacy: valore di prova lungo ${valore?.length ?? 0} nel file, ${algo.includes(valore ?? "valore assente") ? "PRESENTE" : "assente"} nel .algo`);
    expect(valore?.length ?? 0).toBeGreaterThan(0);
    expect(algo.includes(valore!)).toBe(false);
    expect(/created|edited|saved/.test(algo)).toBe(false);
  });
});
