// L'esecutore dei casi d'uso della riga di comando: la stessa esecuzione del nucleo che
// usa la finestra (`esecuzione/esecuzione.ts`), nel modo caso, portata alla fine con un comando che non si ferma
// (nessun punto di interruzione) e senza orologio che la tagli a fette; l'esito è quello dell'esecuzione, cioè della
// sola funzione che confronta un caso (`esito.ts`). Le regole delle voci del caso e dell'esito stanno lì: qui non ce
// n'è una copia. Senza la tabella di traccia, che qui nessuno mostra: con la tabella il tempo di `bun run casi` più
// che raddoppiava (misurato); l'esito non ne dipende (lo prova il corpus eseguito nei due modi).
//
// I limiti delle impostazioni li dà il chiamante (la riga di comando i predefiniti): il controllo statico si fa una
// volta sola, con quelli, dentro l'esecuzione. Il caso di una procedura o di una funzione eseguita da sola si esegue
// con `funzione`, l'`id` della sua funzione.

import type { Tetti } from "../controllo/controllo";
import { Esecuzione } from "../esecuzione/esecuzione";
import type { CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import type { EsitoDelCaso } from "./esito";

export { margineDellOutput, type AvvisiDiversi, type Campo, type Differenza, type EsitoDelCaso } from "./esito";

const senzaOrologio = () => 0;

export function eseguiCaso(p: Progetto, caso: CasoDiUnaFunzione, limiti: Tetti, funzione?: string): EsitoDelCaso {
  const e = new Esecuzione(p, limiti, { caso, tabella: false, ...(funzione !== undefined ? { funzione } : {}) });
  if (e.stato.genere === "pronta") e.comanda("continua");
  while (e.stato.genere === "in corso") e.fetta(senzaOrologio, Infinity);
  const esito = e.esito;
  if (esito === undefined) throw new Error(`il caso non è arrivato alla fine: esecuzione ${e.stato.genere}`);
  return esito;
}
