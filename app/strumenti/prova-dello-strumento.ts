// La prova dello strumento a riga di comando estratto dal suo pacchetto, la stessa su Windows (`pacchetto.ts`) e su Linux
// (`archivio.ts`): chi la chiama estrae il pacchetto in una cartella con uno spazio nel nome, toglie dal PATH le cartelle
// che hanno Bun e dice dove guardare le tracce; qui si avvia l'eseguibile e si confronta con Bun dal repository.
//
// - `-h` mostra il modo d'uso col nome dell'eseguibile; un'opzione sbagliata esce 2; senza un comando esce 2; un testo
//   con un errore esce 1 col messaggio e la riga, senza scrivere; `stampa` di un file che non c'è esce 1;
// - i testi in «Accademico» dei cinque esempi forniti che ci stanno (scritti a mano in `ui/genera/attesi-di-accademico.ts`),
//   letti uno dopo l'altro in una sola libreria (`-o`, poi `-l` e `-r`), danno le stesse righe e la stessa libreria, byte
//   per byte, di `bun ./strumenti/algodesign-tools.ts accademico`;
// - `stampa` su un progetto del corpus, senza e con `--linguaggi`, scrive le stesse pagine, byte per byte, della stessa
//   riga con Bun;
// - le tracce: i nomi nuovi al primo livello delle cartelle date intorno ai soli avvii dell'eseguibile; controllo
//   positivo, l'eseguibile che scrive la sua uscita nella cartella temporanea.
//
// Che cosa NON guarda: le scritture dentro cartelle che c'erano già nelle radici delle tracce; il lettore e la stampa oltre a
// questi casi (li provano le loro prove).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { delCorpus } from "../ui/genera/attesi-di-accademico";

export interface ProvaDelloStrumento {
  /** Il nome della clausola nelle righe del log. */
  clausola: string;
  /** L'eseguibile estratto dal pacchetto. */
  exe: string;
  /** La cartella di lavoro, nuova, dentro la cartella con lo spazio nel nome. */
  lavoro: string;
  /** L'ambiente dei soli avvii dell'eseguibile, col PATH senza Bun. */
  ambiente: Record<string, string | undefined>;
  /** Quante cartelle del PATH di questo processo hanno Bun (0 è un rosso: la prova «senza Bun» non toglierebbe nulla). */
  cartelleConBun: number;
  /** Le cartelle delle tracce, per nome: se ne guardano i nomi al primo livello. */
  radiciDelleTracce: Readonly<Record<string, string>>;
  /** Il nome, fra le radici, della cartella temporanea: lì scrive il controllo positivo. */
  temporanea: string;
  /** La cartella `app` del repository, da cui corre Bun. */
  radice: string;
  esegui: (cmd: string[]) => Promise<{ codice: number; out: string; err: string }>;
  rosso: (clausola: string, motivo: string) => never;
  log: (testo: string) => void;
}

const impronta = (percorso: string) => createHash("sha256").update(readFileSync(percorso)).digest("hex");

/** La prova: rossa con `rosso`, verde con la descrizione di ciò che ha visto. */
export async function provaDelloStrumento(p: ProvaDelloStrumento): Promise<string> {
  const { clausola: C, exe, lavoro, ambiente, radiciDelleTracce, radice, esegui, rosso, log } = p;
  const mancanti = Object.entries(radiciDelleTracce).filter(([, c]) => c === "" || !existsSync(c));
  if (mancanti.length > 0) rosso(C, `manca una delle cartelle delle tracce: ${JSON.stringify(radiciDelleTracce)}`);
  if (radiciDelleTracce[p.temporanea] === undefined) rosso(C, `la cartella temporanea «${p.temporanea}» non è fra le radici delle tracce`);
  const fotografia = () => Object.fromEntries(Object.entries(radiciDelleTracce).map(([n, c]) => [n, new Set(readdirSync(c))]));
  const nomiNuovi = (prima: Record<string, Set<string>>) => Object.entries(radiciDelleTracce).flatMap(([n, c]) => readdirSync(c).filter((x) => !prima[n]!.has(x)).map((x) => `${n}/${x}`));
  const lancia = async (cmd: string[]) => {
    log(`$ ${cmd.join(" ")} (cwd ${lavoro})`);
    const q = Bun.spawn({ cmd, cwd: lavoro, env: ambiente, stdout: "pipe", stderr: "pipe" });
    const [out, err, codice] = await Promise.all([new Response(q.stdout).text(), new Response(q.stderr).text(), q.exited]);
    const uscita = `${out}${err}`.replace(/\r/g, "").trim();
    log(`${uscita}\n(exit ${codice})`);
    return { codice, uscita };
  };
  // I testi dei cinque esempi forniti che ci stanno, coi nomi dei file dati, e il testo con un errore alla riga 4.
  const esempi = ["tappa-1/overflow-fattoriale", "tappa-1/condizione-intero", "tappa-1/condizione-booleano", "tappa-3/tre-livelli", "tappa-4/ricorsione-senza-uscita"];
  const testi = esempi.map((e) => {
    const atteso = delCorpus[e];
    if (atteso === undefined) return rosso(C, `manca il testo atteso di ${e} in ui/genera/attesi-di-accademico.ts`);
    const file = join(lavoro, `${e.split("/")[1]!.replaceAll("-", "_")}.txt`);
    writeFileSync(file, atteso.it);
    return file;
  });
  const rotto = join(lavoro, "testo con un errore.txt");
  writeFileSync(rotto, "variable x: integer\nx ← 1\nwhile x < 3 do\n    x = x + 1\nend while\n");

  // Le stesse letture con Bun dal repository: le righe e la libreria di confronto, fuori dalla finestra delle tracce. Le
  // due librerie hanno lo stesso nome in due cartelle: il nome del file d'uscita è il nome della libreria.
  const righeDiBun: string[] = [];
  mkdirSync(join(lavoro, "con bun"));
  mkdirSync(join(lavoro, "con lo strumento"));
  const libreriaDiBun = join(lavoro, "con bun", "esercizi.algo");
  for (const [i, t] of testi.entries()) {
    const r = await esegui([process.execPath, "./strumenti/algodesign-tools.ts", "accademico", t, ...(i === 0 ? ["-o", libreriaDiBun] : ["-l", libreriaDiBun]), "-r"]);
    if (r.codice !== 0) rosso(C, `bun ./strumenti/algodesign-tools.ts accademico su ${t} esce ${r.codice} (dettaglio nel log)`);
    righeDiBun.push(`${r.out}${r.err}`.replace(/\r/g, "").trim().replaceAll(libreriaDiBun, "<libreria>"));
  }

  const prima = fotografia();
  const aiuto = await lancia([exe, "accademico", "-h"]);
  const sbagliata = await lancia([exe, "accademico", "-x"]);
  const errore = await lancia([exe, "accademico", rotto]);
  const senzaComando = await lancia([exe]);
  const stampaSbagliata = await lancia([exe, "stampa", join(lavoro, "non c'e.algo")]);
  const libreria = join(lavoro, "con lo strumento", "esercizi.algo");
  const righe: string[] = [];
  for (const [i, t] of testi.entries()) {
    const r = await lancia([exe, "accademico", t, ...(i === 0 ? ["-o", libreria] : ["-l", libreria]), "-r"]);
    if (r.codice !== 0) rosso(C, `lo strumento su ${t} esce ${r.codice}: ${r.uscita}`);
    righe.push(r.uscita.replaceAll(libreria, "<libreria>"));
  }
  // `stampa`: le stesse pagine di Bun, byte per byte, senza `--linguaggi` (le colonne e la pagina di prova) e con, con un
  // progetto che ha uno spazio nel nome.
  const progetto = join(lavoro, "il progetto.algo");
  cpSync(join(radice, "casi", "tappa-3", "tre-livelli.algo"), progetto);
  const paginaDiBun = join(lavoro, "con bun");
  const pagineDelloStrumento = join(lavoro, "con lo strumento");
  const scelte: readonly (readonly string[])[] = [[], ["--linguaggi", "pseudocodice", "c"]];
  for (const scelta of scelte) {
    const r = await lancia([exe, "stampa", progetto, ...scelta, "-o", pagineDelloStrumento]);
    const attese = scelta.length === 0 ? 2 : 1;
    const scritte = r.uscita.split("\n").filter((x) => x.startsWith("SCRITTO "));
    if (r.codice !== 0 || scritte.length !== attese) rosso(C, `stampa ${scelta.join(" ")} esce ${r.codice}, con ${scritte.length} pagine scritte invece di ${attese}: «${r.uscita}»`);
  }
  const tracce = nomiNuovi(prima);
  for (const scelta of scelte) {
    const r = await esegui([process.execPath, "./strumenti/algodesign-tools.ts", "stampa", progetto, ...scelta, "-o", paginaDiBun]);
    if (r.codice !== 0) rosso(C, `bun ./strumenti/algodesign-tools.ts stampa ${scelta.join(" ")} esce ${r.codice} (dettaglio nel log)`);
  }
  const pagine = readdirSync(pagineDelloStrumento).filter((f) => f.endsWith(".html")).sort();
  const pagineDiBun = readdirSync(paginaDiBun).filter((f) => f.endsWith(".html")).sort();
  if (!pagine.includes("il progetto (prova).html") || pagine.length !== scelte.length + 1 || pagine.join() !== pagineDiBun.join()) rosso(C, `le pagine sono ${pagine.join(", ")} invece di ${pagineDiBun.join(", ")}, con la pagina di prova`);
  for (const f of pagine) if (impronta(join(pagineDelloStrumento, f)) !== impronta(join(paginaDiBun, f))) rosso(C, `la pagina «${f}» dello strumento non è quella di bun, byte per byte`);
  // Controllo positivo, nella stessa finestra: l'uscita scritta nella cartella temporanea si deve vedere.
  const marcatore = `algodesign-tools-prova-${process.pid}.algo`;
  const nellaTemporanea = join(radiciDelleTracce[p.temporanea]!, marcatore);
  await lancia([exe, "accademico", testi[0]!, "-o", nellaTemporanea]);
  const acceso = nomiNuovi(prima).includes(`${p.temporanea}/${marcatore}`);
  rmSync(nellaTemporanea, { force: true });

  if (p.cartelleConBun === 0) rosso(C, "nel PATH di questo processo nessuna cartella ha Bun: la prova «senza Bun» non toglierebbe nulla");
  if (aiuto.codice !== 0 || !aiuto.uscita.includes("algodesign-tools accademico <testo.txt> [-l libreria.algo]")) rosso(C, `-h esce ${aiuto.codice} senza il modo d'uso col nome dell'eseguibile: «${aiuto.uscita.slice(0, 200)}»`);
  if (sbagliata.codice !== 2 || !sbagliata.uscita.includes("algodesign-tools accademico <testo.txt>")) rosso(C, `un'opzione sbagliata esce ${sbagliata.codice} senza il modo d'uso`);
  if (errore.codice !== 1 || !errore.uscita.includes("riga 4") || existsSync(join(lavoro, "testo con un errore.algo"))) rosso(C, `il testo con un errore esce ${errore.codice}: «${errore.uscita}»`);
  if (senzaComando.codice !== 2) rosso(C, `senza un comando esce ${senzaComando.codice}: «${senzaComando.uscita.slice(0, 200)}»`);
  if (stampaSbagliata.codice !== 1 || !stampaSbagliata.uscita.startsWith("ERRORE")) rosso(C, `stampa di un file che non c'è esce ${stampaSbagliata.codice}: «${stampaSbagliata.uscita.slice(0, 200)}»`);
  const diverse = righe.map((r, i) => (r === righeDiBun[i] ? null : `${testi[i]}: «${r}» invece di «${righeDiBun[i]}»`)).filter((d) => d !== null);
  if (diverse.length > 0) rosso(C, `righe diverse da quelle di bun: ${diverse.join("; ")}`);
  if (!existsSync(libreria) || impronta(libreria) !== impronta(libreriaDiBun)) {
    const a = existsSync(libreria) ? readFileSync(libreria, "utf8").split("\n") : [];
    const b = readFileSync(libreriaDiBun, "utf8").split("\n");
    const i = a.findIndex((r, k) => r !== b[k]);
    rosso(C, `la libreria dello strumento non è quella di bun, byte per byte: prima differenza alla riga ${i + 1}, «${a[i]}» invece di «${b[i]}»`);
  }
  if (!acceso) rosso(C, `controllo positivo delle tracce SPENTO: l'uscita scritta in ${p.temporanea} non si vede`);
  if (tracce.length > 0) rosso(C, `lo strumento lascia tracce: ${tracce.join(", ")}`);
  return `PATH senza le ${p.cartelleConBun} cartelle con Bun | -h esce 0 col modo d'uso; -x esce 2; il testo con un errore esce 1 («${errore.uscita}») | ${testi.length} testi in una libreria: righe e libreria (${statSync(libreria).size} byte, sha256 ${impronta(libreria)}) uguali a quelle di bun | stampa: ${pagine.length} pagine uguali a quelle di bun (${pagine.join(", ")}) | tracce fuori dalla cartella 0 in ${Object.keys(radiciDelleTracce).join(", ")}, controllo positivo acceso`;
}
