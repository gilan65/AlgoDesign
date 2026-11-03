// Ciò che le prove della ripartenza hanno in comune: lo stato di un'esecuzione da confrontare, il punto di una pausa.
import type { CasoDiUnaFunzione } from "../progetto/modello";
import type { Esecuzione } from "./esecuzione";
import { RicercaDelPunto, type PuntoDellaPausa } from "./ripartenza";

export const senzaOrologio = () => 0;
export type Es = Esecuzione<CasoDiUnaFunzione>;

/** Lo stato di un'esecuzione, per confrontarlo: ciò che dice in pubblico, tabella compresa. Come oggetto e mai come testo: su `due-tetti-insieme` il testo è
 * 1,35 GB a confronto (misurato), e da solo portava la prova a 5,3 GB. */
export const statoDi = (es: Es) => ({
  stato: es.stato,
  console: es.console,
  consoleTolte: es.consoleTolte,
  passi: es.passi,
  avanzamenti: es.avanzamenti,
  pila: es.pila,
  righeDate: es.righeDate,
  righe: es.traccia.righe,
  tolte: es.traccia.tolte,
  iniziali: es.traccia.valoriIniziali,
  ripresa: es.traccia.ripresaAperta,
});
export function puntoDi(es: Es): PuntoDellaPausa {
  const r = new RicercaDelPunto(es);
  r.fetta(senzaOrologio, Infinity);
  if (r.punto === undefined) throw new Error("punto non trovato");
  return r.punto;
}

