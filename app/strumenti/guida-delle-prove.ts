// Il blocco dei conteggi di un documento locale, non versionato, che dice con quali motori e versioni è provato il codice
// generato di ogni linguaggio e in ogni modalità, e quanto. La prosa del documento è scritta a mano; i numeri no: sta tutto fra
// due segni, e lo riscrive il differenziale a ogni corsa verde sul corpus con tutte le famiglie.
//
// Il documento non è nel repository, e il percorso sta in un'impostazione locale non versionata,
// `.collaudo/guida-delle-prove.json` (`{ "percorso": "…" }`, assoluto o relativo alla cartella dell'app). Senza impostazione
// (un clone, la CI) il differenziale non scrive e lo dice nella sua riga, e il collaudo non confronta e lo dice nella sua. Con
// l'impostazione e senza il file, o senza i segni, è un problema: l'impostazione dice che il documento c'è.
//
// Da dove vengono i numeri:
// - dalle righe finali del differenziale (`toolchain:`, `controllo dei tipi:`, `senza tipi:`, `per tipo:`, `avvisi della
//   compilazione:`, `differenziale:`): il blocco è una funzione del log;
// - la pagina di prova non la esegue il differenziale ma Playwright, e i linguaggi da leggere non li esegue nessuno: i loro
//   numeri sono i denominatori confermati del corpus (`conteggi-del-corpus.json`), e la riga lo dichiara. Dicono che cosa ha
//   contato l'ultima conferma, non che quelle prove siano corse nell'ultima corsa;
// - le versioni di `tsc`, di Playwright e di Chromium, che il differenziale non stampa, dai pacchetti installati.
//
// Il confronto sta sugli elementi, nei due versi, mai sulle cardinalità: ogni riga attesa dal log contro quella del documento,
// per chiave, e le righe in più; i segni `<!-- prove: gcc, clang -->` della prosa contro ciò che va spiegato (i linguaggi e le
// forme del registro, le macchine del log, `tsc`, la pagina di prova), così una famiglia nuova senza una sezione è rossa anche
// se la sua riga nel blocco si scrive da sola.
//
//   bun ./strumenti/guida-delle-prove.ts <log del differenziale>      confronta il documento col log salvato (exit 0 uguali, 1 diversi, 2 non si può)
//
// Che cosa NON guarda: che la prosa dica il vero (solo che ogni elemento abbia una sezione); una riga alterata a mano fra due
// corse, se nessuno confronta con un log salvato: la corsa verde dopo la sovrascrive; le durate, che cambiano a ogni corsa e
// nel blocco non ci sono; una corsa del differenziale che non è sul corpus, che non scrive.
//
// Questo modulo non esegue nulla quando lo si carica.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { linguaggi } from "../core/genera/linguaggi";

const radice = join(import.meta.dir, "..");
const fileDellImpostazione = join(radice, ".collaudo", "guida-delle-prove.json");

export const segnoDInizio = "<!-- conteggi delle prove: inizio -->";
export const segnoDiFine = "<!-- conteggi delle prove: fine -->";
const segnoDellaProsa = /<!--\s*prove:\s*([^>]*?)\s*-->/g;

/** Ciò che il blocco legge fuori dal log: i denominatori della pagina di prova e le versioni dei pacchetti. */
export interface FuoriDalLog {
  readonly pagina: Readonly<Record<NomeDellaPagina, number>>;
  /** I linguaggi da leggere, che nessuna macchina esegue: con che cosa e quanto è provato il loro testo, dalla conferma del
   * corpus, per identificatore. */
  readonly daLeggere: Readonly<Record<string, { readonly con: string; readonly quanto: string }>>;
  readonly tsc: string;
  readonly playwright: string;
  readonly chromium: string;
}

const nomiDellaPagina = {
  casi: "pagina di prova - casi eseguiti nelle due lingue",
  arresti: "pagina di prova - casi con un arresto",
  letture: "pagina di prova - casi del programma che leggono",
  prove: "pagina di prova - programmi di prova delle funzioni",
  progetti: "pagina di prova - progetti con la pagina",
} as const;
type NomeDellaPagina = keyof typeof nomiDellaPagina;

/** I numeri della pagina dalla conferma del corpus, le versioni dai pacchetti installati. */
export function leggiFuoriDalLog(): FuoriDalLog {
  const denominatori = JSON.parse(readFileSync(join(radice, "strumenti", "conteggi-del-corpus.json"), "utf8")).denominatori as Record<string, unknown>;
  const pagina = Object.fromEntries(
    (Object.keys(nomiDellaPagina) as NomeDellaPagina[]).map((k) => {
      const v = denominatori[nomiDellaPagina[k]];
      if (typeof v !== "number") throw new Error(`manca il denominatore confermato «${nomiDellaPagina[k]}»`);
      return [k, v];
    }),
  ) as Record<NomeDellaPagina, number>;
  const elenco = (nome: string, quanti: number): number[] => {
    const v = denominatori[nome];
    if (!Array.isArray(v) || v.length !== quanti || !v.every((x) => typeof x === "number")) throw new Error(`il denominatore confermato «${nome}» non ha la forma attesa`);
    return v as number[];
  };
  const numero = (nome: string): number => {
    const v = denominatori[nome];
    if (typeof v !== "number") throw new Error(`manca il denominatore confermato «${nome}»`);
    return v;
  };
  const [blocchi1, dati1] = elenco("genera pseudocodice - tappa 1 (blocchi, dati)", 2);
  const [generati2, blocchi2, cicli2] = elenco("genera pseudocodice - tappa 2 (generati, blocchi, cicli)", 3);
  const [file3, generati3, blocchi3] = elenco("genera pseudocodice - tappa 3 (file, generati, blocchi)", 3);
  const [fileA, conIlCodice, statici, nonCiStanno] = elenco("accademico - esiti sul corpus", 4);
  const daLeggere: Record<string, { con: string; quanto: string }> = {
    pseudocodice: {
      con: "il testo atteso",
      quanto: `${numero("genera pseudocodice - file della tappa 1")} file della tappa 1 (${blocchi1} blocchi, ${dati1} dati), ${generati2} generati della tappa 2 (${blocchi2} blocchi, ${cicli2} cicli), ${file3} file della tappa 3 (${generati3} generati, ${blocchi3} blocchi), ${numero("genera pseudocodice - file della tappa 4")} file della tappa 4`,
    },
    accademico: { con: "il testo atteso e il lettore", quanto: `${fileA} file: ${conIlCodice} con il codice, ${nonCiStanno} che non ci stanno, ${statici} con errori statici` },
  };
  // I denominatori hanno i nomi delle loro prove: un linguaggio da leggere nuovo nel registro deve avere la sua riga qui.
  const nelRegistro = linguaggi.filter((v) => v.genere === "da-leggere").map((v) => v.id as string);
  const senzaRiga = nelRegistro.filter((id) => !(id in daLeggere));
  const senzaVoce = Object.keys(daLeggere).filter((id) => !nelRegistro.includes(id));
  if (senzaRiga.length > 0 || senzaVoce.length > 0) throw new Error(`i linguaggi da leggere del registro e le righe del blocco non si appaiano: senza riga ${JSON.stringify(senzaRiga)}, senza voce ${JSON.stringify(senzaVoce)}`);
  const versione = (pacchetto: string): string => JSON.parse(readFileSync(join(radice, "node_modules", pacchetto, "package.json"), "utf8")).version;
  const motori = JSON.parse(readFileSync(join(radice, "node_modules", "playwright-core", "browsers.json"), "utf8")).browsers as { name: string; browserVersion?: string }[];
  const chromium = motori.find((b) => b.name === "chromium")?.browserVersion;
  if (chromium === undefined) throw new Error("Playwright non dichiara la versione di Chromium");
  return { pagina, daLeggere, tsc: versione("typescript"), playwright: versione("@playwright/test"), chromium };
}

// ------------------------------------------------------------------------------------------------ il log

/** Il resto di una riga finale del differenziale: se manca, il log non è di una corsa finita. */
function resto(log: string, prefisso: string): string {
  const m = log.match(new RegExp(`^${prefisso}: (.*)$`, "m"));
  if (m === null) throw new Error(`nel log manca la riga «${prefisso}:»`);
  return m[1]!.trimEnd();
}

interface DalLog {
  readonly file: string;
  readonly casi: string;
  readonly diFunzioni: string;
  readonly statici: string;
  readonly esclusi: string;
  readonly rossi: string;
  readonly problemi: string;
  readonly compilazioni: string;
  readonly esecuzioni: string;
  readonly esecutori: readonly { readonly nome: string; readonly macchina: string; readonly lingua: string | undefined; readonly casi: string }[];
  /** La macchina (`gcc`) e la sua versione, dalla riga della toolchain. */
  readonly versioni: ReadonlyMap<string, string>;
}

function leggiIlLog(log: string): DalLog {
  const r = resto(log, "differenziale").match(
    /^file (\d+), casi nel confronto (\d+) \(di funzioni (\d+), con l'errore statico (\d+)\), esclusi (\d+), fuori tappa \d+ in \d+ file; per esecutore: (.+); rossi (\d+), problemi (\d+); compilazioni (\d+) in .+, esecuzioni (\d+) in /,
  );
  if (r === null) throw new Error("la riga «differenziale:» non ha la forma attesa");
  const esecutori = r[6]!.split(", ").map((x) => {
    const m = x.match(/^(.+) (\d+\/\d+)$/);
    if (m === null) throw new Error(`esecutore non riconosciuto: «${x}»`);
    const parti = m[1]!.match(/^(\S+)(?: (\S+))?$/)!;
    return { nome: m[1]!, macchina: parti[1]!, lingua: parti[2], casi: m[2]! };
  });
  const versioni = new Map([...resto(log, "toolchain").matchAll(/([\w-]+) (\d\S*) \([^()]*\)/g)].map((m) => [m[1]!, m[2]!]));
  return { file: r[1]!, casi: r[2]!, diFunzioni: r[3]!, statici: r[4]!, esclusi: r[5]!, rossi: r[7]!, problemi: r[8]!, compilazioni: r[9]!, esecuzioni: r[10]!, esecutori, versioni };
}

/** La macchina di una forma senza tipi è quella del suo motore: `js-node` è `node`. */
const delMotore = (macchina: string, versioni: ReadonlyMap<string, string>) => {
  if (versioni.has(macchina)) return macchina;
  return [...versioni.keys()].find((k) => macchina.endsWith(`-${k}`));
};

// ------------------------------------------------------------------------------------------------ il blocco

/** Il blocco, una riga di tabella per elemento, dal log e da ciò che sta fuori. */
export function bloccoDal(log: string, fuori: FuoriDalLog): string {
  const l = leggiIlLog(log);
  const macchine = [...new Set(l.esecutori.map((e) => e.macchina))];
  const perMacchina = macchine.map((m) => {
    const dello = l.esecutori.filter((e) => e.macchina === m);
    const inLingua = (lingua: string) => dello.find((e) => e.lingua === lingua)?.casi ?? "—";
    const motore = delMotore(m, l.versioni);
    if (motore === undefined && m !== "interprete") throw new Error(`la riga «toolchain:» non dà la versione di ${m}`);
    const versione = motore === undefined ? "il nucleo" : `${motore} ${l.versioni.get(motore)}`;
    // L'interprete non ha una lingua del codice: i suoi casi stanno nella prima colonna.
    const senzaLingua = dello.find((e) => e.lingua === undefined);
    return `| ${m} | ${versione} | ${senzaLingua?.casi ?? inLingua("it")} | ${inLingua("en")} |`;
  });
  const tipi = resto(log, "controllo dei tipi").split("; ").map((x) => {
    const m = x.match(/^(\S+) programmi (\d+), errori (\d+)$/);
    if (m === null) throw new Error(`controllo dei tipi non riconosciuto: «${x}»`);
    return `| tsc | ${fuori.tsc}, su ${m[1]} | ${m[2]} programmi, ${m[3]} errori | la riga «controllo dei tipi» del differenziale |`;
  });
  const senza = resto(log, "senza tipi").split("; ").map((x) => {
    const m = x.match(/^(\S+) programmi (\d+), senza annotazioni uguali (\d+), provenienza uguale (\d+), testo confrontato da (.+)$/);
    if (m === null) throw new Error(`riga senza tipi non riconosciuta: «${x}»`);
    return `| forma senza tipi | di ${m[1]}, testo confrontato da ${m[5]} | ${m[2]} programmi, senza annotazioni uguali ${m[3]}, provenienza uguale ${m[4]} | la riga «senza tipi» del differenziale |`;
  });
  const avvisi = resto(log, "avvisi della compilazione").match(/^compilazioni (\d+), con gli avvisi attesi (\d+) \(.*\), non attesi (\d+), attesi e mancanti (\d+)$/);
  if (avvisi === null) throw new Error("la riga «avvisi della compilazione:» non ha la forma attesa");
  return [
    segnoDInizio,
    "<!-- Scritto dal differenziale a ogni corsa verde sul corpus: non si corregge a mano. -->",
    "",
    "| Chi esegue | Motore e versione | Casi verdi, codice in italiano | Casi verdi, codice in inglese |",
    "|---|---|---|---|",
    ...perMacchina,
    "",
    "| Che cosa | Con che cosa | Quanto | Da dove |",
    "|---|---|---|---|",
    `| casi nel confronto | tutte le macchine sopra | ${l.casi} casi su ${l.file} file (di funzioni ${l.diFunzioni}, con l'errore statico ${l.statici}), esclusi ${l.esclusi}, rossi ${l.rossi}, problemi ${l.problemi} | la riga «differenziale» del differenziale |`,
    `| esecuzioni | tutte le macchine sopra | ${l.esecuzioni} | la riga «differenziale» del differenziale |`,
    `| compilazioni | i compilatori sopra | ${avvisi[1]}, con gli avvisi attesi ${avvisi[2]}, non attesi ${avvisi[3]}, attesi e mancanti ${avvisi[4]} | la riga «avvisi della compilazione» del differenziale |`,
    ...tipi,
    ...senza,
    `| casi per tipo | tutte le macchine sopra | ${resto(log, "per tipo")} | la riga «per tipo» del differenziale |`,
    ...Object.entries(fuori.daLeggere).map(([id, { con, quanto }]) => `| ${id} | nessuna macchina: ${con} | ${quanto} | la conferma del corpus, non questa corsa |`),
    `| pagina di prova | Chromium ${fuori.chromium}, Playwright ${fuori.playwright} | ${fuori.pagina.casi} casi nelle due lingue (con un arresto ${fuori.pagina.arresti}, che leggono ${fuori.pagina.letture}, programmi di prova ${fuori.pagina.prove}), ${fuori.pagina.progetti} progetti con la pagina | la conferma del corpus, non questa corsa |`,
    "",
    segnoDiFine,
  ].join("\n");
}

/** Il testo del documento col blocco nuovo fra i due segni. I segni devono esserci una volta ciascuno. */
export function conIlBlocco(guida: string, blocco: string): string {
  const { inizio, fine } = posizioni(guida);
  return guida.slice(0, inizio) + blocco + guida.slice(fine + segnoDiFine.length);
}

function posizioni(guida: string): { inizio: number; fine: number } {
  const inizio = guida.indexOf(segnoDInizio);
  const fine = guida.indexOf(segnoDiFine);
  if (inizio < 0 || fine < inizio) throw new Error("i due segni dei conteggi non ci sono, o sono invertiti");
  if (guida.indexOf(segnoDInizio, inizio + 1) >= 0 || guida.indexOf(segnoDiFine, fine + 1) >= 0) throw new Error("i segni dei conteggi sono ripetuti");
  return { inizio, fine };
}

/** Le righe di tabella di un blocco, per chiave: la prima cella, con un numero se si ripete. */
function righeDelBlocco(blocco: string): Map<string, string> {
  const righe = new Map<string, string>();
  for (const riga of blocco.split(/\r?\n/)) {
    if (!riga.startsWith("| ")) continue;
    const prima = riga.split("|")[1]!.trim();
    let chiave = prima;
    for (let n = 2; righe.has(chiave); n++) chiave = `${prima} (${n})`;
    righe.set(chiave, riga);
  }
  return righe;
}

/** Ciò che ha bisogno di una sezione nella prosa: i linguaggi e le forme del registro, le macchine del log, `tsc`, la pagina. */
export function elementiDaSpiegare(log: string, registro: readonly { readonly id: string; readonly formaSenzaTipi?: { readonly id: string } }[] = linguaggi): string[] {
  const macchine = leggiIlLog(log).esecutori.map((e) => e.macchina.replace(/-\d+$/, ""));
  return [...new Set([...registro.flatMap((v) => [v.id, ...(v.formaSenzaTipi === undefined ? [] : [v.formaSenzaTipi.id])]), ...macchine, "tsc", "pagina di prova"])];
}

/** Le differenze fra il documento e il log, elemento per elemento e nei due versi; nessuna, se sono uguali. */
export function differenzeDallaGuida(guida: string, log: string, fuori: FuoriDalLog, elementi: readonly string[] = elementiDaSpiegare(log)): string[] {
  const { inizio, fine } = posizioni(guida);
  const trovate = righeDelBlocco(guida.slice(inizio, fine));
  const attese = righeDelBlocco(bloccoDal(log, fuori));
  const d: string[] = [];
  for (const [k, riga] of attese) {
    const nellaGuida = trovate.get(k);
    if (nellaGuida === undefined) d.push(`riga che manca nel documento: «${k}»`);
    else if (nellaGuida !== riga) d.push(`riga diversa «${k}»: nel documento ${nellaGuida} ; dal log ${riga}`);
  }
  for (const k of trovate.keys()) if (!attese.has(k)) d.push(`riga in più nel documento: «${k}»`);
  const segnati = new Set([...guida.matchAll(segnoDellaProsa)].flatMap((m) => m[1]!.split(",").map((x) => x.trim()).filter((x) => x !== "")));
  for (const e of elementi) if (!segnati.has(e)) d.push(`elemento senza una sezione nel documento: «${e}»`);
  for (const s of segnati) if (!elementi.includes(s)) d.push(`sezione senza un elemento: «${s}»`);
  return d;
}

// ------------------------------------------------------------------------------------------------ il documento

/** Il percorso del documento dall'impostazione locale, se c'è. */
export function percorsoDellaGuida(): string | undefined {
  if (!existsSync(fileDellImpostazione)) return undefined;
  const p = (JSON.parse(readFileSync(fileDellImpostazione, "utf8")) as { percorso?: unknown }).percorso;
  if (typeof p !== "string" || p.trim() === "") throw new Error(`${fileDellImpostazione} non dice il percorso`);
  return isAbsolute(p) ? p : resolve(radice, p);
}

/** Dopo una corsa verde sul corpus con tutte le famiglie: riscrive il blocco. La riga da stampare, e il problema se c'è. */
export function scriviDopoIlDifferenziale(log: string): { riga: string; problema?: string } {
  try {
    const percorso = percorsoDellaGuida();
    if (percorso === undefined) return { riga: "guida delle prove: non scritta, nessuna impostazione" };
    if (!existsSync(percorso)) return { riga: "guida delle prove: non scritta", problema: `l'impostazione nomina un documento che non c'è: ${percorso}` };
    const blocco = bloccoDal(log, leggiFuoriDalLog());
    writeFileSync(percorso, conIlBlocco(readFileSync(percorso, "utf8"), blocco));
    return { riga: `guida delle prove: scritta, ${righeDelBlocco(blocco).size} righe` };
  } catch (e) {
    return { riga: "guida delle prove: non scritta", problema: (e as Error).message };
  }
}

/** Il confronto che fa il collaudo dopo la corsa: `controllata` è falso se manca l'impostazione, e la porta lo dice. */
export function confrontoDellaPorta(log: string): { controllata: boolean; differenze: string[] } {
  const percorso = percorsoDellaGuida();
  if (percorso === undefined) return { controllata: false, differenze: [] };
  if (!existsSync(percorso)) return { controllata: true, differenze: [`l'impostazione nomina un documento che non c'è: ${percorso}`] };
  return { controllata: true, differenze: differenzeDallaGuida(readFileSync(percorso, "utf8"), log, leggiFuoriDalLog()) };
}

/** Il controllo positivo, senza il documento: un testo uguale al log è senza differenze, e con un conteggio alterato ne ha. */
export function controlloPositivo(log: string): { acceso: boolean; dettaglio: string } {
  const fuori = leggiFuoriDalLog();
  const elementi = elementiDaSpiegare(log);
  const sano = `<!-- prove: ${elementi.join(", ")} -->\n${bloccoDal(log, fuori)}\n`;
  const zero = differenzeDallaGuida(sano, log, fuori, elementi).length;
  const alterato = sano.replace(/(\d+)\/(\d+)/, (_m, a: string, b: string) => `${Number(a) + 1}/${b}`);
  const colpi = differenzeDallaGuida(alterato, log, fuori, elementi);
  return { acceso: zero === 0 && colpi.length === 1 && colpi[0]!.startsWith("riga diversa"), dettaglio: `sano ${zero} differenze, con un conteggio alterato ${colpi.length}` };
}

if (import.meta.main) {
  const fileDelLog = process.argv[2];
  if (fileDelLog === undefined) {
    console.error("uso: bun ./strumenti/guida-delle-prove.ts <log del differenziale>");
    process.exit(2);
  }
  const log = readFileSync(fileDelLog, "utf8");
  const percorso = percorsoDellaGuida();
  if (percorso === undefined) {
    console.log("guida delle prove: non confrontata, nessuna impostazione");
    process.exit(2);
  }
  const { differenze } = confrontoDellaPorta(log);
  const positivo = controlloPositivo(log);
  for (const x of differenze) console.log(`DIFFERENZA ${x}`);
  console.log(`controllo positivo: ${positivo.acceso ? "ACCESO" : "SPENTO"} (${positivo.dettaglio})`);
  console.log(`guida delle prove: ${differenze.length} differenze sugli elementi, righe attese ${righeDelBlocco(bloccoDal(log, leggiFuoriDalLog())).size}, elementi da spiegare ${elementiDaSpiegare(log).length}`);
  process.exit(differenze.length === 0 && positivo.acceso ? 0 : 1);
}
