// Scrivere un valore a mano dalle prove, finché la finestra non ha il suo gesto: Playwright mette `window.__modificaDiProva__ = true` con uno script iniettato prima del
// caricamento, e la finestra ci scrive la funzione. Senza quella variabile non c'è nulla: nessun utente la raggiunge.
import type { EsitoDellaModifica } from "../../core/esecuzione/esecuzione";
import type { BersaglioDiUnValore } from "../../core/interprete/interprete";

type Modifica = (b: BersaglioDiUnValore, testo: string) => EsitoDellaModifica | undefined;

declare global {
  interface Window {
    __modificaDiProva__?: true | Modifica;
  }
}

export function esponiLaModificaDiProva(f: Modifica): void {
  if (typeof window !== "undefined" && window.__modificaDiProva__ !== undefined) window.__modificaDiProva__ = f;
}
