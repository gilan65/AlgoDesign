// La guida ai file di Flowgorithm dice i messaggi che il comando `flowgorithm` mostra davvero: per ogni codice del
// lettore almeno un suo testo, scritto come lo mostra lo strumento, sta fra i messaggi del capitolo 4 della guida; e
// ogni messaggio del capitolo 4 è il testo vero di un file che non si converte. I testi veri vengono dai file del corpus che non si
// convertono e dai tre casi che il corpus non ha (gli stessi delle prove del lettore e del comando).
//
// Che cosa NON guarda: le parole che nella guida precedono il messaggio («quando» si mostra); il resto della guida, che si
// legge.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { codiciDelMessaggio, leggiFlowgorithm } from "../core/lettore/flowgorithm";
import { testoPerLoStrumento } from "./flowgorithm";

const radice = join(import.meta.dir, "..", "..");
const guida = readFileSync(join(radice, "docs", "GUIDA-AI-FILE-DI-FLOWGORITHM.md"), "utf8").replaceAll("\r\n", "\n");
const corpus = join(import.meta.dir, "..", "casi-flowgorithm");

const q = (s: string) => `"${s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}"`;
const file = (...f: string[]) => `<?xml version="1.0"?>\n<flowgorithm fileversion="4.2">\n<attributes><attribute name="name" value="prova"/></attributes>\n${f.join("\n")}\n</flowgorithm>\n`;
const funzione = (nome: string, tipo: string, variabile: string, parametri: string, corpo: string) =>
  `<function name=${q(nome)} type=${q(tipo)} variable=${q(variabile)}><parameters>${parametri}</parameters><body>${corpo}</body></function>`;
const main = (corpo: string) => funzione("Main", "None", "", "", corpo);
const dichiara = (n: string, t: string, d?: string) => `<declare name=${q(n)} type=${q(t)} array=${q(d !== undefined ? "True" : "False")} size=${q(d ?? "")}/>`;
const assegna = (v: string, e: string) => `<assign variable=${q(v)} expression=${q(e)}/>`;
const scrivi = (e: string) => `<output expression=${q(e)} newline="True"/>`;
const parametro = (n: string, t: string, v = false) => `<parameter name=${q(n)} type=${q(t)} array=${q(v ? "True" : "False")}/>`;

/** I tre casi che il corpus non ha. */
const costruiti = [
  file(main(dichiara("età", "Integer") + assegna("età", "3") + scrivi("età"))),
  file(
    main(dichiara("a", "Integer", "3") + dichiara("b", "Integer", "5") + assegna("a[0]", "1") + assegna("b[0]", "2") + '<call expression="Mostra(a)"/><call expression="Mostra(b)"/>'),
    funzione("Mostra", "None", "", parametro("v", "Integer", true), scrivi("v[0]")),
  ),
  file(main(scrivi("F(1)")), funzione("F", "Integer", "r", parametro("x", "Integer"), dichiara("r", "Integer") + '<call expression="P()"/>' + assegna("r", "x")), funzione("P", "None", "", "", "")),
];

/** I testi veri, per codice: come li mostra lo strumento. */
function testiVeri(): Map<string, Set<string>> {
  const testi = [...readdirSync(corpus).filter((f) => f.endsWith(".fprg")).map((f) => readFileSync(join(corpus, f), "utf8")), ...costruiti];
  const perCodice = new Map<string, Set<string>>();
  for (const t of testi) {
    const c = leggiFlowgorithm(t);
    if (c.ok) continue;
    perCodice.set(c.messaggio.codice, (perCodice.get(c.messaggio.codice) ?? new Set()).add(testoPerLoStrumento(c.messaggio)));
  }
  return perCodice;
}

/** I messaggi del capitolo 4: l'ultima parte di ogni voce dell'elenco, dopo «: «», fino alla «»» finale. */
export function messaggiDellaGuida(testo: string): string[] {
  const inizio = testo.indexOf("\n## 4. ");
  const fine = testo.indexOf("\n## 5. ", inizio);
  if (inizio < 0 || fine < 0) return [];
  return [...testo.slice(inizio, fine).matchAll(/^- .*?: «(.+)»$/gm)].map((m) => m[1]!);
}

/** Il confronto nei due versi: i codici senza un testo nella guida, i messaggi della guida che nessun file dà. */
function confronto(testo: string, veri: Map<string, Set<string>>): { codiciSenzaVoce: string[]; vociSenzaFile: string[] } {
  const scritti = messaggiDellaGuida(testo);
  const tutti = new Set([...veri.values()].flatMap((s) => [...s]));
  return {
    codiciSenzaVoce: codiciDelMessaggio.filter((k) => ![...(veri.get(k) ?? [])].some((t) => scritti.includes(t))),
    vociSenzaFile: scritti.filter((m) => !tutti.has(m)),
  };
}

test("ogni messaggio del comando è nella guida, e ogni messaggio della guida è vero", () => {
  const veri = testiVeri();
  const scritti = messaggiDellaGuida(guida);
  console.log(`codici del lettore ${codiciDelMessaggio.length}, codici visti sui file ${veri.size}, messaggi nel capitolo 4 della guida ${scritti.length}`);
  // Le premesse: ogni codice ha un file che lo dà, e la guida ha dei messaggi.
  expect(codiciDelMessaggio.filter((k) => !veri.has(k))).toEqual([]);
  expect(scritti.length).toBeGreaterThan(0);
  expect(confronto(guida, veri)).toEqual({ codiciSenzaVoce: [], vociSenzaFile: [] });
});

test("il confronto vede un messaggio tolto dalla guida e uno che nessun file dà", () => {
  const veri = testiVeri();
  const sin = "La funzione «Sin» di Flowgorithm non ha un equivalente in questa versione di AlgoDesign.";
  expect(guida).toContain(`«${sin}»`);
  const senza = guida.replace(`: «${sin}»`, ": niente");
  expect(confronto(senza, veri).codiciSenzaVoce).toEqual(["funzione_senza_equivalente"]);
  const inventato = "Il messaggio che nessun file dà.";
  const conUnoInPiu = guida.replace("\n## 5. ", `\n- una prova: «${inventato}»\n\n## 5. `);
  expect(confronto(conUnoInPiu, veri).vociSenzaFile).toEqual([inventato]);
});
