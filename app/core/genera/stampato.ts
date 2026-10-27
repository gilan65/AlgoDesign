// Il codice stampato: di quale funzione è ogni riga, gli a capo delle righe più larghe del foglio, i fogli. Le misure
// sono in caratteri di un carattere a spaziatura fissa: le colonne e le righe di un foglio le dà chi stampa.
//
// Le parti: i generatori segnano le righe di ogni funzione (`Riga.nellaFunzione`); le righe senza segno vanno con la
// prima funzione se sono la testa del file, con quella dopo se stanno fra due funzioni, nella coda (una parte senza
// funzione: le funzioni di supporto e l'avvio) se vengono dopo l'ultima.
//
// Gli a capo: dopo uno spazio o una virgola, il più lontano nella larghezza, mai nel rientro; uno dentro una stringa fra
// virgolette doppie solo se fuori non ce n'è; senza punti, il taglio alla larghezza. Il rientro stampato si ferma a metà
// larghezza meno `rientroDelSeguito`, e il seguito sta `rientroDelSeguito` colonne più in là.
//
// I fogli: una riga a capo non si divide fra due fogli, se non ha più pezzi delle righe di un foglio intero (allora
// comincia su un foglio nuovo e continua). Chi stampa può volere un foglio nuovo all'inizio di una parte.
//
// Che cosa questo file NON fa:
// - le tabulazioni, i caratteri larghi due colonne o i diacritici combinanti: una colonna per carattere (i generatori
//   scrivono il rientro con gli spazi);
// - le stringhe fra apici e i commenti: un apostrofo in un commento aprirebbe una stringa che non c'è; i caratteri fra
//   apici del codice sono corti;
// - come si stampa: il segno ↪, la barra del seguito e i numeri sono della pagina.
import type { Riga } from "./forma";

/** Le colonne fra il rientro stampato di una riga e quello del suo seguito. */
export const rientroDelSeguito = 4;

/** Le righe da `da` (compresa) ad `a` (esclusa) di una funzione, o della coda (senza funzione). */
export interface ParteDelCodice {
  readonly funzione?: string;
  readonly da: number;
  readonly a: number;
}

/** Le parti del codice, nell'ordine del file, contigue: una per funzione che ha righe, più la coda se c'è. */
export function partiDelCodice(righe: readonly Riga[]): ParteDelCodice[] {
  // Senza segno, la funzione della prima riga segnata dopo (la testa e le righe fra due funzioni); dopo l'ultima, nessuna.
  const di: (string | undefined)[] = new Array(righe.length);
  let dopo: string | undefined;
  for (let i = righe.length - 1; i >= 0; i--) {
    dopo = righe[i]!.nellaFunzione ?? dopo;
    di[i] = dopo;
  }
  const parti: ParteDelCodice[] = [];
  for (let i = 0; i < righe.length; i++) {
    const ultima = parti.at(-1);
    if (ultima !== undefined && ultima.funzione === di[i]) parti[parti.length - 1] = { ...ultima, a: i + 1 };
    else parti.push({ ...(di[i] !== undefined ? { funzione: di[i] } : {}), da: i, a: i + 1 });
  }
  return parti;
}

/** Una riga stampata: il rientro vero, la colonna dove si stampa il primo pezzo (il seguito sta `rientroDelSeguito` più
 * in là), i pezzi senza il rientro. Gli spazi del rientro e i pezzi uniti ridanno la riga. */
export interface RigaACapo {
  readonly rientro: number;
  readonly colonna: number;
  readonly pezzi: readonly string[];
}

/** La riga a capo in `colonne` colonne. */
export function aCapo(testo: string, colonne: number): RigaACapo {
  const tutta = Array.from(testo);
  let rientro = 0;
  while (rientro < tutta.length && tutta[rientro] === " ") rientro++;
  const colonna = Math.max(0, Math.min(rientro, Math.floor(colonne / 2) - rientroDelSeguito));
  const c = tutta.slice(rientro);
  let larghezza = Math.max(1, colonne - colonna);
  if (c.length <= larghezza) return { rientro, colonna, pezzi: [c.join("")] };
  // Dentro una stringa: fra virgolette doppie; la barra rovesciata salta il carattere dopo.
  const nellaStringa: boolean[] = [];
  let dentro = false;
  let salta = false;
  for (const x of c) {
    nellaStringa.push(dentro);
    if (salta) salta = false;
    else if (dentro && x === "\\") salta = true;
    else if (x === '"') dentro = !dentro;
  }
  const pezzi: string[] = [];
  let da = 0;
  while (c.length - da > larghezza) {
    // Il taglio `k` lascia nel pezzo c[da, k): il punto è il carattere k − 1.
    let fuori = -1;
    let nella = -1;
    for (let k = da + larghezza; k > da; k--) {
      if (c[k - 1] !== " " && c[k - 1] !== ",") continue;
      if (!nellaStringa[k - 1]) {
        fuori = k;
        break;
      }
      if (nella < 0) nella = k;
    }
    const taglio = fuori > 0 ? fuori : nella > 0 ? nella : da + larghezza;
    pezzi.push(c.slice(da, taglio).join(""));
    da = taglio;
    larghezza = Math.max(1, colonne - colonna - rientroDelSeguito);
  }
  pezzi.push(c.slice(da).join(""));
  return { rientro, colonna, pezzi };
}

/** Una riga di un foglio: il numero (da 0) della riga del codice, il pezzo (0 la riga vera, col suo numero; poi il
 * seguito), il testo e la colonna dove si stampa. */
export interface RigaStampata {
  readonly riga: number;
  readonly pezzo: number;
  readonly testo: string;
  readonly colonna: number;
}

/** I fogli del codice: `colonne` caratteri per riga, `righe` righe per foglio; `inizi`, le righe del codice (da 0) che
 * cominciano un foglio nuovo. */
export function fogliDelCodice(testi: readonly string[], misure: { readonly colonne: number; readonly righe: number }, inizi: ReadonlySet<number> = new Set()): RigaStampata[][] {
  const fogli: RigaStampata[][] = [];
  let foglio: RigaStampata[] = [];
  const nuovo = () => {
    if (foglio.length > 0) fogli.push(foglio);
    foglio = [];
  };
  testi.forEach((testo, riga) => {
    const a = aCapo(testo, misure.colonne);
    const stampate = a.pezzi.map((t, pezzo) => ({ riga, pezzo, testo: t, colonna: pezzo === 0 ? a.colonna : a.colonna + rientroDelSeguito }));
    if (inizi.has(riga) || foglio.length + stampate.length > misure.righe) nuovo();
    for (const s of stampate) {
      if (foglio.length >= misure.righe) nuovo();
      foglio.push(s);
    }
  });
  nuovo();
  return fogli;
}
