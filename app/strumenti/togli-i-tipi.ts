// Eseguito da Node, non da Bun: `stripTypeScriptTypes` c'è solo lì. Riceve il file con l'elenco dei sorgenti TypeScript (un
// array JSON di percorsi) e scrive accanto a ognuno `<sorgente>.tolto`, lo stesso testo senza le annotazioni. Lo usa il
// differenziale per confrontare la forma senza tipi. La funzione è sperimentale: il suo avviso va sullo standard error, che
// non entra mai nel testo confrontato. Un sorgente che non si analizza ferma lo strumento, con l'uscita diversa da 0.

import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const elenco = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as string[];
for (const sorgente of elenco) writeFileSync(`${sorgente}.tolto`, stripTypeScriptTypes(readFileSync(sorgente, "utf8")));
process.stdout.write(`tolti ${elenco.length}\n`);
