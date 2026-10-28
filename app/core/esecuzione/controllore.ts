// Il controllore dei passi: dato il comando dell'utente, decide se l'esecuzione si ferma prima di
// un'azione. Guarda solo l'evento (blocco e profondità di chiamata), la profondità da cui il comando è
// partito e i punti di interruzione: nessuno stato, nessun valore.
//
// - «dentro»: alla prossima azione, a qualunque profondità;
// - «sopra» (un passo): alla prossima azione che non sta più in profondità di quella da cui si è partiti;
// - «fuori»: alla prossima azione meno profonda di quella da cui si è partiti;
// - «continua»: solo su un punto di interruzione.
// Un punto di interruzione ferma ogni comando. Prima della prima azione (nessuna profondità di partenza)
// «sopra» si ferma sulla prima, «fuori» solo su un punto, come «continua».
//
// Il valore iniziale di un dato non ha un punto di interruzione (il suo blocco non si sceglie, e il file non lo
// può dire): ferma «dentro» e «sopra», mai «fuori» e «continua».
//
// Un punto di interruzione su un ciclo `per` o `per ogni` ferma a ogni controllo, come sul `mentre`: mai sulla partenza,
// sull'elemento preso né sull'aumento. Sulla copia di un record col suo nome (un'azione per campo) ferma una volta, prima
// del primo campo.
//
// La profondità è quella delle chiamate attive (0 nella radice, il programma principale o la funzione eseguita da sola):
// senza chiamate «dentro» e «sopra» fanno la stessa cosa, «fuori» e «continua» anche.
//
// La ripresa dell'azione di chi chiama, dopo il ritorno da una funzione chiamata nella sua espressione, non è un'azione
// ma è una fermata, alla profondità di chi chiama: «dentro», «sopra» e «fuori» la trattano come un'azione a quel livello
// (un passo dalla fine della funzione chiamata, o «fuori» da dentro, si ferma lì, prima di una seconda chiamata della
// stessa espressione); «continua» no, e nemmeno un punto di interruzione, che ha già fermato l'azione prima.

import type { FaseDelCiclo } from "../interprete/interprete";

export type Comando = "continua" | "dentro" | "sopra" | "fuori";

export interface EventoDelPasso {
  readonly evento: string;
  /** Il dato, se l'azione è il suo valore iniziale. */
  readonly dato?: string;
  /** La parte del ciclo, in un ciclo `per` o `per ogni`. */
  readonly fase?: FaseDelCiclo;
  /** La posizione del campo, nella copia di un record col suo nome. */
  readonly campo?: number;
  readonly profondita: number;
}

/** Le parti di un ciclo che non sono un controllo: un punto di interruzione non le ferma. */
const nonControlli: ReadonlySet<FaseDelCiclo> = new Set(["inizio", "elemento", "passo"]);

/** Un punto di interruzione ferma questo evento: non sul valore iniziale di un dato, in un ciclo solo sul controllo, nella
 * copia di un record solo sul primo campo. La usa anche l'animata dell'interfaccia, che si spegne dove un punto ferma. */
export function fermatoDaUnPunto(punti: ReadonlySet<string>, e: Pick<EventoDelPasso, "evento" | "dato" | "fase" | "campo">): boolean {
  return e.dato === undefined && punti.has(e.evento) && (e.fase === undefined || !nonControlli.has(e.fase)) && (e.campo === undefined || e.campo === 0);
}

export function fermati(comando: Comando, partenza: number | undefined, punti: ReadonlySet<string>, e: EventoDelPasso): boolean {
  return fermatoDaUnPunto(punti, e) || fermatiSullaRipresa(comando, partenza, e.profondita);
}

/** Il comando si ferma a questa profondità, senza punti di interruzione: la regola di un'azione e di una ripresa. */
export function fermatiSullaRipresa(comando: Comando, partenza: number | undefined, profondita: number): boolean {
  switch (comando) {
    case "dentro":
      return true;
    case "sopra":
      return partenza === undefined || profondita <= partenza;
    case "fuori":
      return partenza !== undefined && profondita < partenza;
    case "continua":
      return false;
  }
}
