// Lo strumento a riga di comando di AlgoDesign, a parte dall'app: un comando per ciò che fa.
//
//   bun run tools accademico <testo.txt> …    da un testo in «Accademico» una libreria di AlgoDesign (`accademico.ts`)
//   bun run tools stampa <progetto.algo> …    la pagina con due testi di codice affiancati e la pagina di prova (`stampa.ts`)
//   bun run tools -h
//
// Il pacchetto lo compila in `algodesign-tools.exe` (`pacchetto.ts`), con le clausole STRUMENTO.
//
// Esce con 2, col modo d'uso, se manca il comando o non è uno di questi; il resto lo decide il comando.
//
// CHE COSA NON FA: nessuna finestra e nessun'altra applicazione avviata; le opzioni dei comandi le legge ciascuno.
import { basename, extname } from "node:path";
import { comandoAccademico } from "./accademico";
import { comandoStampa } from "./stampa";

// Il nome come lo scrive chi lo usa: `bun run tools` nel repository, il nome dell'eseguibile a sé fuori.
const nome = basename(process.execPath).toLowerCase().startsWith("bun") ? "bun run tools" : basename(process.execPath, extname(process.execPath));
const comandi = { accademico: comandoAccademico, stampa: comandoStampa } as const;

const modoDUso = `Gli strumenti di AlgoDesign a riga di comando.

  ${nome} accademico <testo.txt> [opzioni]    da un testo in «Accademico» una libreria di AlgoDesign
  ${nome} stampa <progetto.algo> [opzioni]    due testi di codice affiancati da stampare e la pagina di prova nel browser
  ${nome} <comando> -h                        l'aiuto di un comando
  ${nome} -h                                  mostra questo aiuto
`;

const [comando, ...resto] = process.argv.slice(2);
if (comando === "-h") {
  console.log(modoDUso);
  process.exit(0);
}
if (comando === undefined) {
  console.error(`manca il comando\n\n${modoDUso}`);
  process.exit(2);
}
if (!Object.hasOwn(comandi, comando)) {
  // Chi viene dal vecchio `algodesign-accademico` scrive il testo subito dopo il nome.
  const consiglio = /\.txt$/i.test(comando) ? `: per leggere un testo scrivi ${nome} accademico ${comando}` : "";
  console.error(`il comando ${comando} non c'è${consiglio}\n\n${modoDUso}`);
  process.exit(2);
}
comandi[comando as keyof typeof comandi](resto, `${nome} ${comando}`);
