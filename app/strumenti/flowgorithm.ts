// Il comando `flowgorithm` di `algodesign-tools` (`algodesign-tools.ts`): dai file di Flowgorithm (`.fprg`) i progetti di
// AlgoDesign (`.algo`), col lettore del nucleo (`core/lettore/flowgorithm.ts`).
//
//   bun run tools flowgorithm <ingresso> [altri ingressi] [-o cartella] [-r] [-s]
//   bun run tools flowgorithm -h
//
// Un ingresso è un file `.fprg`, più file separati da virgole o una cartella: i file che contiene con l'estensione `.fprg`
// in qualunque maiuscola, in ordine di nome, non quelli delle sottocartelle. Un argomento che esiste per intero (un nome
// con una virgola) non si divide; lo stesso file nominato due volte si converte una volta. Ogni `.algo` va nella cartella
// di `-o`, che deve esserci, o accanto al suo `.fprg`, col nome del `.fprg`. `-r` dà al lettore la rinomina; `-s`
// sostituisce un `.algo` che c'è già.
//
// Un file che non si converte non ferma gli altri: per ciascuno le righe TRASFORMAZIONE e SCRITTO (SOSTITUITO con `-s`),
// o una riga ERRORE col testo del lettore (approvato, mai riscritto qui) e la riga del file; con più file, l'ultima riga
// è il conto. Non si converte: un file nominato che non finisce in `.fprg` (l'uscita non coincide mai con l'ingresso),
// un `.algo` che c'è già senza `-s`, un secondo ingresso con la stessa uscita di uno prima (con `-o`, due file con lo
// stesso nome in cartelle diverse), un file che non si legge o che il lettore ferma. Esce con 0 se tutti i file sono
// convertiti; con 1 se uno non lo è, se una cartella non contiene file `.fprg` o se la cartella di `-o` non c'è (allora
// prima di convertire); con 2 su un'opzione sbagliata, insieme al modo d'uso.
//
// Che cosa NON guarda: le sottocartelle; un collegamento fisico (hard link) fra due uscite; `created`, `edited` e
// `saved`, che il lettore non passa e lo strumento non mostra.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import type { Causa } from "../core/espressioni/analizzatore";
import { leggiFlowgorithm, testoDelMessaggio, type Messaggio, type Trasformazione } from "../core/lettore/flowgorithm";
import { salva } from "../core/progetto/formato";
import { type Codice, testoDellaSegnalazione } from "../i18n/codici";

/** Il modo d'uso, col comando come lo scrive chi lo usa. */
const modoDUsoDi = (comando: string) => `Converte i file di Flowgorithm (.fprg) in progetti di AlgoDesign (.algo).

  ${comando} <ingresso> [altri ingressi] [-o cartella] [-r] [-s]
  ${comando} -h

  <ingresso>           un file .fprg, più file separati da virgole o una cartella
                       (i file .fprg che contiene, non quelli delle sottocartelle)
  -o cartella          dove scrivere i .algo, una cartella che c'è già (senza: accanto a ciascun .fprg)
  -r                   rinomina un dato dichiarato di nuovo con un altro tipo o un'altra dimensione,
                       o un nome riservato in AlgoDesign (senza: quel file non si converte)
  -s                   sostituisce un .algo che c'è già (senza: quel file non si converte)
  -h                   mostra questo aiuto

Se un file non si converte, gli altri si convertono lo stesso.

Esempio:
  ${comando} media.fprg
  ${comando} esercizi -o convertiti -r
`;

/** Il testo di una trasformazione del lettore, dopo «TRASFORMAZIONE <file>, riga N: ». */
export function descrizioneDellaTrasformazione(t: Trasformazione): string {
  switch (t.specie) {
    case "per-come-mentre":
      return `il «per»${t.nome !== undefined ? ` di ${t.nome}` : ""} diventa un «mentre» equivalente: il corpo cambia il contatore o il passo non è un numero scritto`;
    case "dichiarazione-nel-blocco":
      return `il dato ${t.nome} è dichiarato dentro un blocco: in AlgoDesign diventa un dato della funzione`;
    case "rinomina-dichiarazione":
      return `il dato ${t.nome} è dichiarato di nuovo con un altro tipo o un'altra dimensione: il secondo diventa ${t.nuovo}`;
    case "rinomina-riservato":
      return `il nome ${t.nome} è riservato in AlgoDesign: diventa ${t.nuovo}`;
    case "vettore-per-uscita":
      return `la procedura scrive il vettore ${t.nome} senza leggerlo: diventa un parametro per uscita`;
  }
}

/** Il testo di un messaggio del lettore: per un programma con un errore, dentro va la frase che mostra l'app. */
export function testoPerLoStrumento(m: Messaggio): string {
  if (m.codice !== "progetto_con_errori") return testoDelMessaggio(m);
  const p = m.parametri;
  const fermata = p.causa !== undefined ? { causa: p.causa as Causa, ...(p.segno !== undefined ? { segno: p.segno } : {}) } : undefined;
  return testoDelMessaggio(m, testoDellaSegnalazione("it", p.errore as Codice, p.sulRisultato === "true", fermata).breve);
}

/** Il file, non la sua scrittura: i collegamenti seguiti; le maiuscole contano solo dove il sistema le distingue. */
const ilFile = (p: string): string => {
  let r = resolve(p);
  if (existsSync(r))
    try {
      r = realpathSync.native(r);
    } catch {}
  return process.platform === "linux" ? r : r.toLowerCase();
};

const eUnaCartella = (p: string): boolean => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/** Il comando: `argomenti` senza il suo nome, `comando` come lo scrive chi lo usa. Esce con `process.exit`. */
export function comandoFlowgorithm(argomenti: readonly string[], comando: string): void {
  const modoDUso = modoDUsoDi(comando);
  const sbagliato = (motivo: string): never => {
    console.error(`${motivo}\n\n${modoDUso}`);
    process.exit(2);
  };

  if (argomenti.includes("-h")) {
    console.log(modoDUso);
    process.exit(0);
  }
  const ingressi: string[] = [];
  let uscita: string | undefined;
  let rinomina = false;
  let sostituisci = false;
  for (let i = 0; i < argomenti.length; i++) {
    const a = argomenti[i]!;
    if (a === "-o") uscita = argomenti[++i] ?? sbagliato("-o vuole un valore");
    else if (a === "-r") rinomina = true;
    else if (a === "-s") sostituisci = true;
    else if (a.startsWith("-")) sbagliato(`l'opzione ${a} non c'è`);
    else ingressi.push(a);
  }
  if (ingressi.length === 0) sbagliato("manca il file o la cartella da convertire");

  // La cartella di `-o` si guarda prima di tutto: se manca, nessun file si converte.
  if (uscita !== undefined && !eUnaCartella(uscita)) {
    console.log(`ERRORE la cartella ${uscita} non c'è`);
    process.exit(1);
  }

  let errori = 0;
  const errore = (riga: string) => {
    console.log(`ERRORE ${riga}`);
    errori++;
  };

  // I file, nell'ordine in cui sono nominati: un argomento che esiste per intero non si divide sulle virgole.
  const file: string[] = [];
  const visti = new Set<string>();
  const aggiungi = (f: string) => {
    const k = ilFile(f);
    if (visti.has(k)) return;
    visti.add(k);
    file.push(f);
  };
  for (const a of ingressi)
    for (const parte of existsSync(a) ? [a] : a.split(",").map((s) => s.trim()).filter((s) => s !== "")) {
      if (!eUnaCartella(parte)) {
        aggiungi(parte);
        continue;
      }
      const dentro = readdirSync(parte)
        .filter((n) => /\.fprg$/i.test(n) && !eUnaCartella(join(parte, n)))
        .sort();
      if (dentro.length === 0) errore(`${parte} non contiene file .fprg`);
      for (const n of dentro) aggiungi(join(parte, n));
    }

  let convertiti = 0;
  const uscite = new Map<string, string>();
  for (const f of file) {
    if (!/\.fprg$/i.test(f)) {
      errore(`${f} non è un file .fprg`);
      continue;
    }
    const scritto = join(uscita ?? dirname(f), `${basename(f, extname(f))}.algo`);
    const primo = uscite.get(ilFile(scritto));
    if (primo !== undefined) {
      errore(`${f} non si converte: ${scritto} è già l'uscita di ${primo}; convertilo a parte, con un'altra cartella -o`);
      continue;
    }
    uscite.set(ilFile(scritto), f);
    const cera = existsSync(scritto);
    if (cera && !sostituisci) {
      errore(`${f} non si converte: ${scritto} c'è già; per sostituirlo usa -s, o scegli un'altra cartella con -o`);
      continue;
    }
    let testo: string;
    try {
      testo = readFileSync(f, "utf8");
    } catch (e) {
      errore(`${f} non si legge: ${(e as Error).message}`);
      continue;
    }
    let c: ReturnType<typeof leggiFlowgorithm>;
    try {
      c = leggiFlowgorithm(testo, { rinomina });
    } catch (e) {
      // Un errore che il lettore non prevede: il messaggio, non la traccia, e gli altri file continuano.
      errore(`${f}: ${(e as Error).message}`);
      continue;
    }
    if (!c.ok) {
      errore(`${f}${c.messaggio.riga > 0 ? `, riga ${c.messaggio.riga}` : ""}: ${testoPerLoStrumento(c.messaggio)}`);
      continue;
    }
    for (const t of c.trasformazioni) console.log(`TRASFORMAZIONE ${f}, riga ${t.riga}: ${descrizioneDellaTrasformazione(t)}`);
    try {
      writeFileSync(scritto, salva(c.progetto), "utf8");
    } catch (e) {
      errore(`${scritto} non si scrive: ${(e as Error).message}`);
      continue;
    }
    console.log(`${cera ? "SOSTITUITO" : "SCRITTO"} ${scritto}`);
    convertiti++;
  }
  if (file.length > 1) console.log(`CONVERTITI ${convertiti} file su ${file.length}`);
  process.exit(errori > 0 ? 1 : 0);
}
