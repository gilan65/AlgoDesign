// Le registrazioni del corpus: ogni programma di `casi/`, eseguito e fermato in ogni modo che una registrazione deve
// reggere. La usano la prova del nucleo e questo strumento, che separa i due computer: scrive le registrazioni su uno e
// le riproduce su un altro, leggendo solo i file.
//
// Per ogni caso d'uso del corpus (e per ogni progetto senza casi, senza letture date):
// - «libera»: le voci date a mano, fino alla fine o finché una lettura resta senza riga;
// - «caso»: la stessa esecuzione nel modo caso, fino alla fine;
// - «pausa»: libera, ferma alla prima fermata dopo metà degli avanzamenti;
// - «in corso»: libera, lasciata a metà fra due fette.
// Le due fermate a metà solo fino a `avanzamentiDelleFermate`: oltre, il programma arriva al tetto dei passi, e una
// fermata a metà costa un'esecuzione intera senza provare nulla di nuovo.
//
// Uso, da `app/`:
//   bun ./strumenti/registrazioni-del-corpus.ts --scrivi <cartella>   le registrazioni, un file per esecuzione
//   bun ./strumenti/registrazioni-del-corpus.ts --leggi <cartella>    le riproduce dai soli file e dice le differenze
//   bun ./strumenti/registrazioni-del-corpus.ts --rileva <file>       il rilevatore dei percorsi su un file vero (exit 0 se si accende)
// `--leggi` esce 0 solo se ogni file è «uguale» e i file sono quelli dichiarati da `--scrivi`.
//
// Che cosa NON guarda: l'interfaccia, disegno e tabella: il file non la ripete, e l'app non lo apre.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { join } from "node:path";
import { tetti } from "../core/controllo/controllo";
import { componi, fotografa } from "../core/registrazione/composizione";
import { apriRegistrazione, testoDellaRegistrazione, type Registrazione } from "../core/registrazione/formato";
import { riproduci, type Riproduzione } from "../core/registrazione/riproduzione";
import { Esecuzione, type RigheLunghe } from "../core/esecuzione/esecuzione";
import { senzaValore } from "../core/interprete/interprete";
import { apri } from "../core/progetto/formato";
import type { CasoDiUnaFunzione, Progetto } from "../core/progetto/modello";

const cartellaDeiCasi = join(import.meta.dir, "..", "casi");

/** Oltre questi avanzamenti non si fanno le due fermate a metà: i programmi che arrivano al tetto dei passi. */
export const avanzamentiDelleFermate = 20_000;

const senzaOrologio = () => 0;

export interface EsecuzioneDelCorpus {
  /** `cartella/file#funzione/caso:modo`. */
  readonly id: string;
  readonly modo: "libera" | "caso" | "pausa" | "in corso";
  readonly es: Esecuzione<CasoDiUnaFunzione>;
}

interface Voce {
  readonly id: string;
  readonly progetto: Progetto;
  readonly caso?: CasoDiUnaFunzione;
  readonly funzione?: string;
}

/** Ogni caso d'uso del corpus, e ogni progetto senza casi. */
export function vociDelCorpus(): Voce[] {
  const voci: Voce[] = [];
  const cartelle = readdirSync(cartellaDeiCasi, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  for (const cartella of cartelle)
    for (const nome of readdirSync(join(cartellaDeiCasi, cartella)).filter((f) => f.endsWith(".algo")).sort()) {
      const aperto = apri(readFileSync(join(cartellaDeiCasi, cartella, nome), "utf8"));
      if (!aperto.ok) throw new Error(`${cartella}/${nome} non si apre`);
      const progetto = aperto.progetto;
      const base = `${cartella}/${nome.slice(0, -".algo".length)}`;
      const delProgramma = (progetto.test_cases ?? []).map((caso) => ({ id: `${base}#/${caso.name}`, progetto, caso: caso as CasoDiUnaFunzione }));
      const delleFunzioni = progetto.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ id: `${base}#${f.name ?? f.id}/${caso.name}`, progetto, caso, funzione: f.id })));
      const suoi = [...delProgramma, ...delleFunzioni];
      voci.push(...(suoi.length > 0 ? suoi : [{ id: `${base}#`, progetto }]));
    }
  return voci;
}

/** Un'esecuzione libera con le voci del caso date a mano, fino a `fermata` (`avanzamenti`: lì, fra due fette; `prima fermata`:
 * alla prima pausa o lettura dopo quegli avanzamenti) o finché resta senza una riga. */
function guidaLibera(v: Voce, righeLunghe: RigheLunghe | undefined, fermata?: { readonly avanzamenti: number; readonly dove: "lì" | "prima fermata" }): Esecuzione<CasoDiUnaFunzione> {
  const es = new Esecuzione<CasoDiUnaFunzione>(v.progetto, tetti, { tabella: false, ...(righeLunghe ? { righeLunghe } : {}), ...(v.funzione ? { funzione: v.funzione } : {}) });
  const voci = v.caso?.inputs ?? [];
  let k = 0;
  for (;;) {
    const s = es.stato;
    const oltre = fermata !== undefined && es.avanzamenti >= fermata.avanzamenti;
    if (oltre && (fermata.dove === "lì" || s.genere === "pausa" || s.genere === "chiede")) return es;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda(fermata === undefined ? "continua" : "dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, fermata === undefined ? Infinity : 0);
    else if (s.genere === "chiede") {
      const voce = voci[k];
      if (voce === undefined || voce.data !== s.dato) return es;
      k++;
      const testo = voce.text ?? senzaValore;
      try {
        es.inserisci(voce.each === true ? { ognuno: testo } : testo);
      } catch {
        // Una voce che questa lettura non ammette: l'esecuzione resta in attesa di una riga.
        return es;
      }
    } else return es;
  }
}

function eseguiIlCaso(v: Voce & { readonly caso: CasoDiUnaFunzione }, righeLunghe: RigheLunghe | undefined): Esecuzione<CasoDiUnaFunzione> {
  const es = new Esecuzione<CasoDiUnaFunzione>(v.progetto, tetti, { tabella: false, caso: v.caso, ...(righeLunghe ? { righeLunghe } : {}), ...(v.funzione ? { funzione: v.funzione } : {}) });
  if (es.stato.genere === "pronta") es.comanda("continua");
  while (es.stato.genere === "in corso") es.fetta(senzaOrologio, Infinity);
  return es;
}

/** L'esecuzione libera di una voce del corpus, fino a dove arriva. */
export const liberaDi = (v: Voce, righeLunghe?: RigheLunghe): Esecuzione<CasoDiUnaFunzione> => guidaLibera(v, righeLunghe);

/** Tutte le esecuzioni di una voce del corpus. */
export function esecuzioniDi(v: Voce, righeLunghe?: RigheLunghe): EsecuzioneDelCorpus[] {
  const libera = guidaLibera(v, righeLunghe);
  const fuori: EsecuzioneDelCorpus[] = [{ id: `${v.id}:libera`, modo: "libera", es: libera }];
  if (v.caso !== undefined) fuori.push({ id: `${v.id}:caso`, modo: "caso", es: eseguiIlCaso({ ...v, caso: v.caso }, righeLunghe) });
  const totale = libera.avanzamenti;
  if (totale > 1 && totale <= avanzamentiDelleFermate) {
    const meta = Math.floor(totale / 2);
    fuori.push({ id: `${v.id}:pausa`, modo: "pausa", es: guidaLibera(v, righeLunghe, { avanzamenti: meta, dove: "prima fermata" }) });
    fuori.push({ id: `${v.id}:in corso`, modo: "in corso", es: guidaLibera(v, righeLunghe, { avanzamenti: meta, dove: "lì" }) });
  }
  return fuori;
}

export const contestoDiProva = { versione: "0.7.0-beta.3", lingua: "it", sistema: "windows", erroriDellApp: [], erroriPersi: 0 } as const;

/** La registrazione di una sola esecuzione. */
export const registrazioneDi = (es: Esecuzione<CasoDiUnaFunzione>): Registrazione => componi(contestoDiProva, [fotografa(es)]);

/** Il file riaperto dal suo testo e riprodotto: il percorso intero di una registrazione. */
export function tuttoIlPercorso(r: Registrazione): Riproduzione {
  const aperta = apriRegistrazione(testoDellaRegistrazione(r));
  if (!aperta.ok) throw new Error(`riaperta con errori: ${JSON.stringify(aperta.errori)}`);
  return riproduci(aperta.registrazione);
}

type Scrivibile<T> = { -readonly [K in keyof T]: unknown };

/** Una copia della registrazione con un'alterazione, sulla prima esecuzione e sulla radice: come un file scritto a mano. */
export function alterata(r: Registrazione, f: (x: Scrivibile<Registrazione["executions"][number]>, radice: Scrivibile<Registrazione>) => void): Registrazione {
  const copia = structuredClone(r) as unknown as Scrivibile<Registrazione> & { executions: Scrivibile<Registrazione["executions"][number]>[] };
  f(copia.executions[0]!, copia);
  return copia as unknown as Registrazione;
}

/** Ogni testo di un valore JSON, nomi dei campi compresi, come il programma li vede: nel JSON un a capo dopo «voto:» avrebbe una
 * barra rovesciata che il testo non ha. */
function testiDi(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(testiDi);
  if (typeof v !== "object" || v === null) return [];
  return Object.entries(v).flatMap(([k, x]) => [k, ...testiDi(x)]);
}

/** I percorsi assoluti (Windows, rete, Unix) e il nome del profilo nei testi di un file JSON: le occorrenze trovate. */
export function percorsiEProfilo(json: string): string[] {
  const nome = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rilevatore = new RegExp(`(?<![A-Za-z])[A-Za-z]:[\\\\/][^\\s]*|\\\\\\\\[^\\s]+|/(?:Users|home|media|mnt|root)/[^\\s]*|\\b${nome}\\b`, "gi");
  return testiDi(JSON.parse(json)).flatMap((t) => [...t.matchAll(rilevatore)].map((m) => m[0]));
}

/** Il nome di un file per l'indice dell'esecuzione: l'`id` può avere caratteri che un nome di file non ammette. */
const nomeDelFile = (i: number) => `${String(i).padStart(5, "0")}.txt`;

/** Una cartella che `--scrivi` può vuotare: non c'è, o ha solo ciò che lo strumento stesso scrive. Il nome lo batte chi lancia, e un errore non deve cancellare altro. */
export const cartellaDelleRegistrazioni = (cartella: string): boolean => !existsSync(cartella) || readdirSync(cartella).every((f) => f === "elenco.json" || /^\d{5}\.txt$/.test(f));

if (import.meta.main) {
  const [azione, cartella] = process.argv.slice(2);
  if ((azione !== "--scrivi" && azione !== "--leggi" && azione !== "--rileva") || cartella === undefined) {
    console.error("uso: registrazioni-del-corpus --scrivi <cartella> | --leggi <cartella> | --rileva <file>");
    process.exit(2);
  }
  if (azione === "--rileva") {
    const trovati = percorsiEProfilo(readFileSync(cartella, "utf8"));
    console.log(`RILEVATORE su ${cartella}: ${trovati.length} occorrenze`);
    for (const o of trovati) console.log(`  ${o}`);
    process.exit(trovati.length > 0 ? 0 : 1);
  }
  const ambiente = `${process.platform} | fuso ${Intl.DateTimeFormat().resolvedOptions().timeZone} | lingua ${process.env.LANG ?? process.env.LANGUAGE ?? "(nessuna)"} | utente ${userInfo().username} | macchina ${hostname()}`;
  console.log(`INIZIO ${azione} | ${ambiente}`);
  if (azione === "--scrivi") {
    if (!cartellaDelleRegistrazioni(cartella)) {
      console.error(`FERMO: ${cartella} ha altri file, e non si cancella: indica una cartella nuova`);
      process.exit(2);
    }
    rmSync(cartella, { recursive: true, force: true });
    mkdirSync(cartella, { recursive: true });
    const elenco: { id: string; file: string }[] = [];
    for (const v of vociDelCorpus())
      for (const e of esecuzioniDi(v)) {
        const file = nomeDelFile(elenco.length);
        writeFileSync(join(cartella, file), testoDellaRegistrazione(registrazioneDi(e.es)));
        elenco.push({ id: e.id, file });
      }
    writeFileSync(join(cartella, "elenco.json"), `${JSON.stringify(elenco, null, 1)}\n`);
    console.log(`FINE: scritte ${elenco.length} registrazioni in ${cartella}`);
    process.exit(0);
  }
  const elenco = JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8")) as { id: string; file: string }[];
  const sulDisco = readdirSync(cartella).filter((f) => f.endsWith(".txt"));
  let uguali = 0;
  const diverse: string[] = [];
  for (const { id, file } of elenco) {
    const aperta = apriRegistrazione(readFileSync(join(cartella, file), "utf8"));
    if (!aperta.ok) {
      diverse.push(`${id}: rifiutata ${JSON.stringify(aperta.errori)}`);
      continue;
    }
    const r = riproduci(aperta.registrazione);
    if (r.uguale) uguali++;
    else diverse.push(`${id}: ${JSON.stringify(r.differenze)}`);
  }
  for (const d of diverse) console.log(`DIVERSA ${d}`);
  const verde = diverse.length === 0 && sulDisco.length === elenco.length && elenco.length > 0;
  console.log(`FINE: ${verde ? "VERDE" : "ROSSA"} | elenco ${elenco.length}, file ${sulDisco.length}, uguali ${uguali}, diverse ${diverse.length}`);
  process.exit(verde ? 0 : 1);
}
