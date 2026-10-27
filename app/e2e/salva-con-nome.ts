// La decisione di «Salva con nome» (e di «Esporta la tabella», con «.csv») del guscio, ripetuta per il guscio
// simulato delle prove nel browser: `da_salvare` in `shell/src/progetto.rs`. Le due si appaiano sulla stessa
// tabella di casi (`shell/src/salva-con-nome.json`): la legge `cargo test` per il guscio vero,
// `salva-con-nome.test.ts` per questa. Qui i nomi si confrontano esatti, come su un disco che distingue le
// maiuscole (Linux): due nomi diversi sono due file, e `eUnFile` dice se un percorso è un file che c'è (una
// cartella no). Il guscio vero decide sull'identità del file sul disco: su Windows «media.ALGO» e «media.algo»
// sono lo stesso file, e lo prova solo `cargo test` su Windows.

import type { EstensioneDelCodice } from "../core/genera/linguaggi";
import type { EstensioneDellImmagine } from "../ui/file";

/** Le estensioni dei file che l'app salva: il progetto, la tabella, il codice generato di ogni linguaggio del registro e
 * il flowchart esportato. */
export type Estensione = ".algo" | ".csv" | EstensioneDelCodice | EstensioneDellImmagine;

/** Il nome scelto finisce nell'`estensione` («.algo», «.csv» per la tabella, quella del linguaggio per il codice
 * generato): quella scritta con altre maiuscole si riscrive, chi non ce l'ha la riceve; si chiede di sostituire solo
 * se così si arriva a un file che c'è e che non è quello scelto. */
export function daSalvare(scelto: string, eUnFile: (percorso: string) => boolean, estensione: Estensione): { percorso: string; sostituire: boolean } {
  const nome = scelto.split(/[\\/]/).at(-1) ?? scelto;
  const conEstensione = nome.length > estensione.length && nome.slice(-estensione.length).toLowerCase() === estensione;
  const percorso = conEstensione ? `${scelto.slice(0, -estensione.length)}${estensione}` : `${scelto}${estensione}`;
  return { percorso, sostituire: percorso !== scelto && eUnFile(percorso) };
}
