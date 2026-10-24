// La pagina di prova dei disegni, raggiungibile SOLO dalle prove: Playwright scrive gli alberi in
// `window.__disegniDiProva__` con uno script iniettato prima del caricamento, e la finestra li disegna
// tutti al 100% invece del riferimento, ognuno con la sua vista dei dati. Nessun comando dell'app la apre,
// e nessun utente la vede: senza quella variabile la finestra è quella di sempre.
import type { Dato, Funzione } from "../../core/progetto/modello";

export interface DisegnoDiProva {
  readonly nome: string;
  readonly funzione: Funzione;
  readonly costantiComuni?: readonly Dato[];
  /** Le funzioni del progetto, per i salti: dicono quali argomenti vanno per riferimento. */
  readonly funzioni?: readonly Funzione[];
}

declare global {
  interface Window {
    __disegniDiProva__?: readonly DisegnoDiProva[];
  }
}

export function disegniDiProva(): readonly DisegnoDiProva[] | undefined {
  return typeof window === "undefined" ? undefined : window.__disegniDiProva__;
}
