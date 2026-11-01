// Il confronto della forma senza tipi col TypeScript da cui viene: `tolto` è il TypeScript passato da `stripTypeScriptTypes`
// di Node, che mette uno spazio al posto di ogni carattere delle annotazioni e non cambia nessun'altra posizione. Il
// JavaScript del generatore deve essere uguale a `tolto` a meno degli spazi lasciati dalle annotazioni.
//
// «A meno degli spazi» non vuol dire togliere gli spazi dai due testi, che renderebbe uguali `"a b"` e `"ab"`: uno spazio
// conta sempre, tranne in due posti, che si riconoscono senza leggere il linguaggio:
// - un gruppo di spazi con dentro almeno una posizione che lo strip ha cambiato: lì il JavaScript può avere quanti spazi
//   vuole (`let x         ;` e `let x;`), e dentro una stringa non capita mai, perché lo strip non ci entra;
// - gli spazi prima del commento in fondo a una riga: la colonna dei commenti si allinea sulle righe di ogni forma.
// Tutto il resto, compresi i testi composti con un `as` dentro, si confronta carattere per carattere.
//
// Che cosa NON guarda: che il JavaScript sia eseguibile (lo esegue il differenziale); le posizioni delle righe rispetto alla
// provenienza (`differenzaDellaProvenienza`).

import type { Riga } from "../core/genera/forma";

/** Dove comincia un commento `//` su una riga, fuori da stringhe e testi composti, o -1. */
function inizioDelCommento(riga: string): number {
  let apice: string | undefined;
  for (let i = 0; i < riga.length; i++) {
    const c = riga[i]!;
    if (apice !== undefined) {
      if (c === "\\") i++;
      else if (c === apice) apice = undefined;
    } else if (c === '"' || c === "'" || c === "`") apice = c;
    else if (c === "/" && riga[i + 1] === "/") return i;
  }
  return -1;
}

/** La prima differenza su una riga: `tolta` col TypeScript `originale` accanto, e il JavaScript. */
function differenzaDellaRiga(originale: string, tolta: string, js: string): string | undefined {
  const commento = inizioDelCommento(tolta);
  let j = 0;
  for (let i = 0; i < tolta.length; ) {
    if (tolta[i] === " ") {
      let fine = i;
      let tocca = false;
      while (tolta[fine] === " ") {
        if (originale[fine] !== " ") tocca = true;
        fine++;
      }
      if (tocca || fine === commento) {
        while (js[j] === " ") j++;
        i = fine;
        continue;
      }
    }
    if (js[j] !== tolta[i]) return `colonna ${i + 1}: «${tolta.slice(i, i + 20)}» contro «${js.slice(j, j + 20)}»`;
    i++;
    j++;
  }
  return j === js.length ? undefined : `in più «${js.slice(j, j + 20)}»`;
}

/** La prima differenza fra il JavaScript e il TypeScript senza le annotazioni, o niente se sono uguali. */
export function differenzaDalTypeScript(ts: string, tolto: string, js: string): string | undefined {
  if (tolto.length !== ts.length) return `lo strip ha cambiato la lunghezza: ${ts.length} contro ${tolto.length}`;
  const [righeTs, righeTolte, righeJs] = [ts.split("\n"), tolto.split("\n"), js.split("\n")];
  if (righeJs.length !== righeTolte.length) return `righe ${righeJs.length} contro ${righeTolte.length}`;
  for (let k = 0; k < righeTolte.length; k++) {
    const d = differenzaDellaRiga(righeTs[k]!, righeTolte[k]!, righeJs[k]!);
    if (d !== undefined) return `riga ${k + 1}, ${d}`;
  }
  return undefined;
}

/** La prima riga in cui il JavaScript ha una provenienza diversa dal TypeScript (tutto tranne il testo), o niente. */
export function differenzaDellaProvenienza(ts: readonly Riga[], js: readonly Riga[]): string | undefined {
  if (ts.length !== js.length) return `righe ${js.length} contro ${ts.length}`;
  const senzaTesto = ({ testo: _, ...resto }: Riga) => JSON.stringify(resto);
  const k = ts.findIndex((r, i) => senzaTesto(r) !== senzaTesto(js[i]!));
  return k < 0 ? undefined : `riga ${k + 1}: ${senzaTesto(js[k]!)} contro ${senzaTesto(ts[k]!)}`;
}
