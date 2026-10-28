// Esecuzione dei casi d'uso da riga di comando.
//
//   bun run casi                         il corpus di `casi/`, appaiato per nome con `casi/elenco.json`
//   bun run casi --corpus <cartella>     un'altra cartella con la forma del corpus (il controllo positivo
//                                        della porta «casi» del collaudo ci lavora su una copia)
//   bun run casi <file.algo> …           solo i file dati
//
// Ogni caso si esegue con l'esecuzione del nucleo nel modo caso (`eseguiCaso`, la stessa della finestra), coi limiti
// predefiniti: i casi del programma, poi quelli di ogni procedura o funzione eseguita da sola, nell'ordine del file.
// L'esito ha due livelli: un caso è raggiunto se coincidono output, errore ed errore statico; gli avvisi diversi si
// dicono a parte. Per ogni caso le righe di `righe-dei-casi.ts`, con `<file>#<caso>` per un caso del programma e
// `<file>#<funzione>/<caso>` per uno di una funzione: `VERDE`, `AVVISI DIVERSI` o `ROSSO` (un output ottenuto molto più
// lungo dell'atteso è mostrato tagliato, e lo dice). Il riepilogo conta tutti i casi, e in fondo quanti sono di una
// funzione.
// Un file che non si legge è `ROSSO <file> file illeggibile`, uno che non si apre è `ROSSO <file> file non valido`; un
// progetto con costrutti delle tappe successive è `FUORI TAPPA <file>`, e uno che il controllo statico accetta ma
// l'esecuzione non sa ancora eseguire (oggi nessuno) è `DA ESEGUIRE <file> (casi: <n>)`. Ogni difetto è una
// riga `PROBLEMA …`. Esce con 1 se c'è un rosso o un problema: un caso con gli avvisi diversi, da solo, non fa uscire
// con 1 fuori dal corpus.
//
// Con file dati: un file senza casi d'uso (né del programma né di una funzione) è un problema, anche accanto a file con
// casi; zero casi eseguiti è un problema (nessun caso, o tutti fuori tappa).
//
// Sul corpus:
// - i file stanno in `tappa-<n>/` (o in `tipi/`, i tipi non semplici) e sono `.algo` (un altro file è un problema,
//   come uno fuori dalle cartelle che non sia l'elenco);
// - le voci dell'elenco sono i casi, `file#caso` e `file#funzione/caso`: una voce ripetuta è un problema; i file
//   dell'elenco e quelli su disco si appaiano per nome nei due versi, e per ogni file presente nei due i casi
//   dell'elenco e quelli del file, nei due versi (un caso tolto da un file, o aggiunto e non elencato, è un problema);
// - un file delle tappe che si eseguono (`tappeEseguite`: dalla 1 alla 4) ha almeno un caso d'uso del programma e
//   si esegue; uno delle tappe da eseguire (`tappeDaEseguire`: nessuna, oggi) è accettato dal controllo statico e non
//   ancora eseguito; uno delle tappe successive è fuori tappa per il controllo statico. Da quando l'esecuzione usa lo
//   stesso controllo statico pieno, un file fuori tappa per l'esecuzione lo è anche per il controllo: il problema «il
//   controllo statico la accetta» non può più uscire, e torna a servire quando una tappa si apre di nuovo nel solo
//   controllo;
// - un caso con gli avvisi diversi è un problema: il corpus prova anche il controllo statico;
// - i casi delle tappe che si eseguono si appaiano coi casi dichiarati nei file (`file#caso`) nei due versi, con una
//   riga di conteggio per tappa; il
//   verso «eseguito ma non dichiarato» oggi non può accadere, perché i due elenchi nascono dalla lettura
//   dello stesso file.
//
// Che cosa NON guarda: che i casi del corpus siano quelli giusti (lo dicono la misura con gcc e le regole del linguaggio); che i
// casi delle tappe da eseguire e successive siano giusti (non si eseguono); con file dati, un elenco (non c'è).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eseguiCaso } from "../core/casi/esecutore";
import { controlla, tetti } from "../core/controllo/controllo";
import { apri } from "../core/progetto/formato";
import { righeDellEsito } from "./righe-dei-casi";

const argomenti = process.argv.slice(2);
const conCartella = argomenti[0] === "--corpus";
const corpus = argomenti.length === 0 || conCartella;
const cartella = conCartella ? argomenti[1]! : join(import.meta.dir, "..", "casi");
const problemi: string[] = [];

// Il nome di un file del corpus è `tappa-<n>/<caso>`, come nell'elenco.
const file: { nome: string; percorso: string }[] = [];
if (corpus) {
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    if (!voce.isDirectory()) {
      if (voce.name !== "elenco.json") problemi.push(`${voce.name} non sta in una cartella di tappa`);
      continue;
    }
    for (const f of readdirSync(join(cartella, voce.name))) {
      if (!f.endsWith(".algo")) problemi.push(`${voce.name}/${f} non è un file .algo`);
      else file.push({ nome: `${voce.name}/${f.slice(0, -".algo".length)}`, percorso: join(cartella, voce.name, f) });
    }
  }
} else file.push(...argomenti.map((a) => ({ nome: a, percorso: a })));

let casi = 0;
let verdi = 0;
let conAvvisiDiversi = 0;
let rossi = 0;
let fuoriTappa = 0;
let daEseguire = 0;
let diFunzioni = 0;
/** Le tappe sono i livelli del linguaggio, ognuno con la sua cartella del corpus (`tappa-N`): 1 le strutture di base,
 * le espressioni, la lettura e la scrittura; 2 i cicli `per` e `per ogni`; 3 le procedure e le funzioni; 4 la
 * ricorsione. Le tappe i cui file si eseguono; quelle che il controllo statico conosce e l'esecuzione non ancora; le
 * altre sono fuori tappa. */
const tappeEseguite = [1, 2, 3, 4];
const tappeDaEseguire: number[] = [];
const tappaDi = (nome: string) => Number(/^tappa-(\d+)\//.exec(nome)?.[1]);
/** I tipi non semplici (la cartella `tipi/`): il controllo statico li conosce, l'esecuzione ancora no. Un file che attende
 * il solo errore statico si esegue (non parte, ed è l'esito atteso); un file giusto è fuori tappa. */
const deiTipi = (nome: string) => nome.startsWith("tipi/");

/** I casi dichiarati nei file delle tappe che si eseguono, quelli eseguiti, e i casi di ogni file che si apre (per
 * l'elenco). */
const dichiarati: string[] = [];
const eseguiti: string[] = [];
const nelFile = new Map<string, string[]>();

const riga = (testo: string) => console.log(testo);

for (const { nome, percorso } of file) {
  let testo: string;
  try {
    testo = readFileSync(percorso, "utf8");
  } catch (e) {
    rossi++;
    riga(`ROSSO ${nome} file illeggibile: ${(e as Error).message}`);
    continue;
  }
  const aperto = apri(testo);
  if (!aperto.ok) {
    rossi++;
    riga(`ROSSO ${nome} file non valido: ${aperto.errori.map((e) => `${e.percorso} ${e.motivo}`).join("; ")}`);
    continue;
  }
  const dellaTappa = tappeEseguite.includes(tappaDi(nome));
  const p = aperto.progetto;
  const delProgramma = p.test_cases ?? [];
  // I casi del programma, poi quelli di ogni procedura o funzione eseguita da sola, col loro nome.
  const suoi = [
    ...delProgramma.map((caso) => ({ id: `${nome}#${caso.name}`, caso, funzione: undefined })),
    ...p.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ id: `${nome}#${f.name}/${caso.name}`, caso, funzione: f.id }))),
  ];
  nelFile.set(nome, suoi.map((c) => c.id));
  const deveEseguirsi = dellaTappa || (deiTipi(nome) && suoi.length > 0 && suoi.every((c) => c.caso.expected.static_error !== undefined));
  if (corpus && dellaTappa) {
    if (delProgramma.length === 0) problemi.push(`${nome} è della tappa ${tappaDi(nome)} ma non ha casi d'uso`);
    dichiarati.push(...suoi.map((c) => c.id));
  }
  if (!corpus && suoi.length === 0) problemi.push(`${nome} non ha casi d'uso`);
  for (const { id, caso, funzione } of suoi) {
    const esito = eseguiCaso(p, caso, tetti, funzione);
    if (esito.fuoriTappa) {
      // Il controllo statico pieno distingue ciò che l'esecuzione non sa ancora fare da una tappa successiva.
      const accettato = !controlla(p, tetti).fuoriTappa;
      const daQuesta = tappeDaEseguire.includes(tappaDi(nome));
      if (corpus && (deveEseguirsi || (daQuesta && !accettato))) problemi.push(`${nome} è della tappa ${tappaDi(nome)} ma risulta fuori tappa`);
      if (corpus && !deveEseguirsi && !daQuesta && accettato) problemi.push(`${nome} è di una tappa successiva ma il controllo statico la accetta`);
      if (accettato) {
        daEseguire += suoi.length;
        riga(`DA ESEGUIRE ${nome} (casi: ${suoi.length})`);
      } else {
        fuoriTappa++;
        riga(`FUORI TAPPA ${nome}`);
      }
      break;
    }
    if (corpus && !deveEseguirsi) problemi.push(`${nome} è di una tappa successiva ma si esegue`);
    casi++;
    if (funzione !== undefined) diFunzioni++;
    eseguiti.push(id);
    const { genere, righe } = righeDellEsito(id, esito);
    if (genere === "rosso") rossi++;
    else if (genere === "avvisi diversi") conAvvisiDiversi++;
    else verdi++;
    righe.forEach(riga);
    if (corpus && esito.avvisi) problemi.push(`${id} ha avvisi diversi da quelli attesi`);
  }
}

if (corpus) {
  const elenco: Record<string, string[]> = JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8"));
  const voci = Object.entries(elenco).flatMap(([tappa, nomi]) => nomi.map((n) => `${tappa}/${n}`));
  const attesi = [...new Set(voci.map((v) => v.split("#")[0]!))];
  const trovati = file.map((f) => f.nome);
  for (const v of new Set(voci.filter((v, i) => voci.indexOf(v) !== i))) problemi.push(`${v} è ripetuto nell'elenco`);
  for (const n of trovati.filter((n) => !attesi.includes(n))) problemi.push(`${n} è su disco ma non nell'elenco`);
  for (const n of attesi.filter((n) => !trovati.includes(n))) problemi.push(`${n} è nell'elenco ma non su disco`);
  // I casi di ogni file che c'è nei due e si apre: quelli dell'elenco contro quelli del file, nei due versi.
  const casiNeiFile = [...nelFile.entries()].filter(([n]) => attesi.includes(n)).flatMap(([, c]) => c);
  for (const v of voci.filter((v) => nelFile.has(v.split("#")[0]!) && !casiNeiFile.includes(v))) problemi.push(`${v} è nell'elenco ma non nel file`);
  for (const c of casiNeiFile.filter((c) => !voci.includes(c))) problemi.push(`${c} è nel file ma non nell'elenco`);
  // I casi delle tappe che si eseguono: quelli eseguiti contro quelli dichiarati nei file, nei due versi.
  const delleTappe = eseguiti.filter((c) => tappeEseguite.includes(tappaDi(c)));
  for (const c of dichiarati.filter((c) => !delleTappe.includes(c))) problemi.push(`${c} è dichiarato ma non eseguito`);
  for (const c of delleTappe.filter((c) => !dichiarati.includes(c))) problemi.push(`${c} è eseguito ma non dichiarato`);
  riga(`elenco: ${attesi.length} file e ${voci.length} casi, su disco ${trovati.length} file e ${[...nelFile.values()].flat().length} casi`);
  for (const n of tappeEseguite) {
    const diQuesta = (c: string) => tappaDi(c) === n;
    riga(`tappa ${n}: casi dichiarati ${dichiarati.filter(diQuesta).length}, eseguiti ${delleTappe.filter(diQuesta).length}`);
  }
} else if (casi === 0) problemi.push("nessun caso eseguito fra i file dati");
for (const p of problemi) riga(`PROBLEMA ${p}`);
riga(`casi: file ${file.length}, casi eseguiti ${casi}, verdi ${verdi}, con avvisi diversi ${conAvvisiDiversi}, rossi ${rossi}, da eseguire ${daEseguire}, fuori tappa ${fuoriTappa}, problemi ${problemi.length}, casi di funzioni ${diFunzioni}`);
process.exit(rossi > 0 || problemi.length > 0 ? 1 : 0);
