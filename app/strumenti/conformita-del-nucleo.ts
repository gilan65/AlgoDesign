// Il pacchetto del nucleo per Node: la sua costruzione e il confronto coi sorgenti, una volta sola, per lo strumento del
// pacchetto (`pacchetto.ts`) e per la prova (`conformita-del-nucleo.test.ts`). Le stesse funzioni decidono l'esito vero e
// quello delle sonde: un verdetto che le sonde non attraversano non è mai stato visto rosso.
//
// Un lato che non scrive il suo file è un FERMO, non un rosso: non si è potuto misurare. Un'eccezione non catturata esce 1, e si
// leggerebbe come una differenza; Node può anche cadere all'uscita dopo aver scritto tutto (0xC0000409, misurato due volte),
// e quella riga ha il suo nome.
//
// Che cosa NON guarda:
// - che il codice generato sia giusto: si confrontano testi e oggetti, nessun programma generato viene eseguito (lo fa il
//   differenziale);
// - «fuori tappa» e «non ancora»: il nucleo oggi non li produce (nessun ritorno con `fuoriTappa: true`, nessun generatore con
//   `nonAncora`), quindi si contano e non si esercitano;
// - la forma senza tipi del TypeScript, che non è una voce del registro né un valore di `genera`;
// - uno specificatore calcolato a run time: il parser e il metafile vedono quelli scritti;
// - un `import type` dentro il punto d'ingresso: non arriva nei byte, e lo guarda la porta dei tipi del nucleo.

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { esecutoreDel, trovaToolchain } from "./esecutori";

const radice = join(import.meta.dir, "..");

/** Le funzioni del pacchetto, e nessun'altra: una in più è un rosso anche per chi lo usa. */
export const esportazioniAttese: readonly string[] = ["aggiungiAllaLibreria", "apri", "controlla", "genera", "leggiAccademico"];

/** Il punto d'ingresso, relativo all'app: il nome della sua cartella entra nei byte del pacchetto. */
export const puntoDIngresso = "entrypoint/index.ts";

/** Il file dentro il pacchetto. */
export const fileDelNucleo = "algodesign-core.cjs";

/** I file fuori da `core/` che il pacchetto può contenere, per nome. */
const fuoriDalNucleo: Readonly<Record<string, string>> = {
  [puntoDIngresso]: "il punto d'ingresso",
  "ui/genera/parole.ts": "le parole dello pseudocodice",
  "ui/dati/righe.ts": "la lettura delle righe",
  "i18n/lingue.ts": "le lingue",
  "i18n/operatori.ts": "i nomi degli operatori",
  "i18n/it.ts": "il dizionario italiano",
  "i18n/en.ts": "il dizionario inglese",
};

/** Il posto di un modulo del metafile: ogni riga ne ha uno per nome, mai per differenza dal totale (un file estraneo
 * importato dal punto d'ingresso starebbe nella differenza). `undefined` se non ne ha. */
export function postoDelModulo(modulo: string): string | undefined {
  const m = modulo.replaceAll("\\", "/");
  if (m.endsWith(".test.ts") || m.includes("node_modules")) return undefined;
  return fuoriDalNucleo[m] ?? (/^core\/[^.]+\.ts$/.test(m) ? "il nucleo" : undefined);
}

/** Gli import del pacchetto, letti col parser: una regex prenderebbe le righe del codice generato (`node:readline`). */
export const importDel = (testo: string): string[] => new Bun.Transpiler({ loader: "js" }).scanImports(testo).map((i) => i.path);

/** Ciò che nei byte non deve esserci: i percorsi della macchina e Bun. */
const barra = String.fromCharCode(92);

/** Un percorso della macchina nel testo, comunque scritto: con le barre semplici, raddoppiate come in una stringa di JavaScript o in avanti, e con qualunque disco maiuscolo o minuscolo. */
export const percorsoVietato = (percorso: string, testo: string): boolean => {
  const comune = (t: string) => t.toLowerCase().replaceAll(barra + barra, "/").replaceAll(barra, "/");
  return comune(testo).includes(comune(percorso));
};

const percorsiDellaMacchina = (): readonly string[] => [homedir(), radice];
const stringheVietate: readonly string[] = [`C:${barra}`, "C:/", "bun:", "Bun."];

export const vietateNel = (testo: string): string[] => [...percorsiDellaMacchina().filter((p) => percorsoVietato(p, testo)), ...stringheVietate.filter((v) => testo.includes(v))];

/** I problemi del pacchetto costruito, per riga intera: vuoto se va bene. */
export function problemiDelPacchetto(testo: string, moduli: readonly string[]): string[] {
  return [
    ...(moduli.length === 0 ? ["il metafile non ha moduli: il controllo dei moduli non ha visto nulla"] : []),
    ...moduli.filter((m) => postoDelModulo(m) === undefined).map((m) => `un modulo senza un posto: ${m}`),
    ...importDel(testo).map((i) => `un import nel pacchetto: ${i}`),
    ...vietateNel(testo).map((v) => `una stringa vietata nel pacchetto: ${v}`),
  ];
}

/** Costruisce il pacchetto nel file dato e ne prova i byte: `throw` col primo elenco di problemi. */
export async function costruisciIlNucleo(uscita: string): Promise<{ readonly byte: number; readonly moduli: readonly string[] }> {
  mkdirSync(dirname(uscita), { recursive: true });
  const metafile = `${uscita}.metafile.json`;
  // Senza `--minify-whitespace` il file ha un commento col percorso per ogni modulo.
  const comando = [process.execPath, "build", puntoDIngresso, "--target=node", "--format=cjs", "--minify-whitespace", `--outfile=${uscita}`, `--metafile=${metafile}`];
  const p = Bun.spawn({ cmd: comando, cwd: radice, stdout: "pipe", stderr: "pipe" });
  const [, err, codice] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (codice !== 0 || !existsSync(uscita)) throw new Error(`la costruzione del pacchetto del nucleo esce ${codice}: ${err.trim()}`);
  const moduli = Object.keys((JSON.parse(readFileSync(metafile, "utf8")) as { inputs: Record<string, unknown> }).inputs);
  const problemi = problemiDelPacchetto(readFileSync(uscita, "utf8"), moduli);
  if (problemi.length > 0) throw new Error(`il pacchetto del nucleo: ${problemi.join("; ")}`);
  return { byte: statSync(uscita).size, moduli };
}

/** L'eseguibile di Node, dalla toolchain del differenziale. */
export function nodeDellaToolchain(): string {
  const problemi: string[] = [];
  const esecutore = esecutoreDel("typescript");
  const macchina = esecutore === undefined ? undefined : trovaToolchain(esecutore, problemi).macchine.find((m) => m.famiglia === "node");
  if (macchina === undefined) throw new Error(`FERMO: Node non c'è, e il pacchetto del nucleo si prova sotto Node: ${problemi.join("; ")}`);
  return macchina.percorso;
}

export type Esiti = Readonly<Record<string, unknown>>;

/** Node caduto all'uscita, dopo aver scritto l'esito (0xC0000409): Bun può dare il codice con o senza segno. */
export const caduteAllUscita = (codice: number): boolean => codice >>> 0 === 0xc0000409;

/** Esegue un lato: i dati nel file dato. Un lato che non lo scrive è un fermo. */
async function lato(nome: string, comando: readonly string[], uscita: string, ambiente: Record<string, string | undefined>): Promise<unknown> {
  const p = Bun.spawn({ cmd: [...comando], cwd: radice, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...ambiente } });
  const [, err, codice] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (caduteAllUscita(codice)) throw new Error(`FERMO: ${nome}: Node è caduto all'uscita (${codice}), non si è misurato nulla: rifalla`);
  if (codice !== 0 || !existsSync(uscita)) throw new Error(`FERMO: ${nome} esce ${codice} e non si è misurato nulla: ${err.trim().slice(0, 600)}`);
  return JSON.parse(readFileSync(uscita, "utf8"));
}

/** Gli attesi: i sorgenti sotto Bun, in un processo loro. */
export const latoAtteso = async (corpus: string, uscita: string): Promise<Esiti> =>
  (await lato("il lato degli attesi", [process.execPath, "./strumenti/conformita-attesi.ts", corpus, uscita], uscita, { BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" })) as Esiti;

/** L'ottenuto: il pacchetto sotto Node, in un processo suo. */
export const latoOttenuto = async (node: string, pacchetto: string, corpus: string, uscita: string, ambiente: Record<string, string | undefined> = {}): Promise<{ readonly esportazioni: readonly string[]; readonly esiti: Esiti }> =>
  (await lato("il lato dell'ottenuto", [node, join(radice, "strumenti", "conformita-ottenuto.cjs"), pacchetto, corpus, uscita], uscita, ambiente)) as { esportazioni: string[]; esiti: Esiti };

/** Il verdetto, una riga intera per ogni differenza: elementi nei due versi, ogni combinazione come oggetto intero. */
export function verdetto(attesi: Esiti, ottenuto: Esiti): string[] {
  const inA = Object.keys(attesi);
  const inO = Object.keys(ottenuto);
  return [
    ...inA.filter((k) => !Object.hasOwn(ottenuto, k)).map((k) => `solo negli attesi: ${k}`),
    ...inO.filter((k) => !Object.hasOwn(attesi, k)).map((k) => `solo nell'ottenuto: ${k}`),
    ...inA.filter((k) => Object.hasOwn(ottenuto, k) && JSON.stringify(attesi[k]) !== JSON.stringify(ottenuto[k])).map((k) => `diversa: ${k}`),
  ];
}

/** Il motivo di un esito: la funzione e che cosa ha dato. Un elenco dichiarato di motivi evita il verde falso di una prova dove
 * tutto è rifiutato allo stesso modo sui due lati, con zero differenze. */
export function motivoDi(chiave: string, e: unknown): string {
  const funzione = chiave.split(" ", 1)[0]!;
  const v = e as { eccezione?: unknown; apriRifiuta?: unknown; generato?: boolean; testo?: string; perche?: string; ok?: boolean; fuoriTappa?: boolean; errori?: readonly unknown[] };
  if (v.eccezione !== undefined) return `${funzione}: eccezione`;
  if (v.apriRifiuta !== undefined) return `${funzione}: apri rifiuta`;
  if (funzione === "genera") return v.generato === true ? (v.testo === "" ? "genera: testo vuoto" : "genera: testo") : `genera: ${v.perche ?? "esito sconosciuto"}`;
  if (funzione === "controlla") return v.fuoriTappa === true ? "controlla: fuori tappa" : (v.errori ?? []).length > 0 ? "controlla: con errori" : "controlla: senza errori";
  if (funzione === "caso") return chiave;
  return `${funzione}: ${v.ok === true ? "riuscita" : "rifiutata"}`;
}

/** I conti per motivo dei soli esiti del corpus, in ordine di nome. */
export function motiviDi(esiti: Esiti): Record<string, number> {
  const conti = new Map<string, number>();
  for (const [k, e] of Object.entries(esiti)) {
    if (k.startsWith("caso ")) continue;
    const m = motivoDi(k, e);
    conti.set(m, (conti.get(m) ?? 0) + 1);
  }
  return Object.fromEntries([...conti].sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Le voci dei motivi diverse dalle dichiarate, per riga intera. */
export function scartiDeiMotivi(trovati: Readonly<Record<string, number>>, dichiarati: Readonly<Record<string, number>>): string[] {
  return [...new Set([...Object.keys(dichiarati), ...Object.keys(trovati)])].filter((m) => trovati[m] !== dichiarati[m]).map((m) => `motivo ${m}: ${trovati[m] ?? "nessuno"} invece di ${dichiarati[m] ?? "nessuno"}`);
}
