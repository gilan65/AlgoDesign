// I campi aperti (di un blocco, la scheda di un dato) si confermano quando l'utente va altrove, come lasciare
// una cella di un foglio di calcolo: un clic fuori, o il fuoco che esce con la tastiera (Tab, Maiusc+Tab).
//
// Il fuoco che entra in un elemento della pagina fuori dai campi li conferma. Uscendo dall'ultimo controllo il
// fuoco va invece al corpo della pagina, senza entrare in nulla (`relatedTarget` nullo, misurato in Chromium e
// WebKit): lì si guarda al giro dopo dove sta. Non confermano:
// - un controllo dei campi che sparisce mentre ha il fuoco (Chromium manda il `focusout` anche lì, col
//   controllo ancora nella pagina; WebKit no): al giro dopo non c'è più;
// - un clic dentro i campi su un pulsante o una casella, che in WebKit non prende il fuoco (va al corpo);
// - la finestra che perde il fuoco: il fuoco resta nel campo, e l'utente ci torna;
// - la pressione su un pulsante che conferma lui (`data-conferma-lui`, per esempio «Aggiungi un dato»): i campi
//   confermati alla pressione si restringerebbero e sposterebbero il pulsante prima del rilascio, e il clic
//   andrebbe perso. Quel pulsante non prende il fuoco e conferma i campi aperti prima di agire;
// - la pressione su una barra di scorrimento (quella del pannello, per arrivare ai campi più in basso): scorrere non è
//   andare altrove;
// - la pressione di un pulsante del mouse che non è il primo (il tasto destro), né il fuoco che sposta: apre un menu
//   dove sta il puntatore, e i campi confermati alla pressione si chiuderebbero e porterebbero sotto il puntatore
//   un'altra riga prima del menu (misurato: il menu si apriva sul caso salito sotto il puntatore).
import { useEffect, useRef, type RefObject } from "react";
import { sulMac } from "./piattaforma";

/** La pressione cade sulla barra di scorrimento dell'elemento che la riceve: oltre la sua area dei contenuti, dalla parte
 * in cui scorre. */
function sullaBarra(e: PointerEvent): boolean {
  const toccato = e.target;
  if (!(toccato instanceof Element)) return false;
  const r = toccato.getBoundingClientRect();
  const x = e.clientX - r.left - toccato.clientLeft;
  const y = e.clientY - r.top - toccato.clientTop;
  return (toccato.scrollHeight > toccato.clientHeight && x >= toccato.clientWidth) || (toccato.scrollWidth > toccato.clientWidth && y >= toccato.clientHeight);
}

export function useConfermaFuori(modulo: RefObject<HTMLElement | null>, conferma: (torna: boolean) => void): void {
  // La conferma più recente, letta dagli ascoltatori senza registrarli di nuovo a ogni tasto.
  const confermaOra = useRef(conferma);
  confermaOra.current = conferma;
  useEffect(() => {
    const campi = modulo.current;
    if (!campi) return;
    let montati = true;
    const mac = sulMac();
    // Il fuoco che lascia i campi viene da un clic dentro di loro (fino al tasto seguente); la pressione è di un pulsante
    // che non è il primo, o sul Mac del primo con Ctrl, che lì apre i menu come il tasto destro (fino al tasto o alla
    // pressione seguente).
    let clicDentro = false;
    let secondario = false;
    const dentro = (n: EventTarget | null) => n instanceof Node && campi.contains(n);
    const conferma = (n: EventTarget | null) => n instanceof Element && n.closest("[data-conferma-lui]") !== null;
    const clic = (e: PointerEvent) => {
      secondario = e.button !== 0 || (e.ctrlKey && mac);
      if (secondario) return;
      // Sulla barra di scorrimento come dentro: nemmeno il fuoco che eventualmente esce conferma.
      clicDentro = dentro(e.target) || sullaBarra(e);
      if (!clicDentro && !conferma(e.target)) confermaOra.current(false);
    };
    const tasto = () => {
      clicDentro = false;
      secondario = false;
    };
    const entra = (e: FocusEvent) => {
      if (!secondario && !dentro(e.target)) confermaOra.current(false);
    };
    const esce = (e: FocusEvent) => {
      if (e.relatedTarget !== null || clicDentro || secondario) return;
      const lasciato = e.target as Node;
      setTimeout(() => {
        if (montati && campi.isConnected && lasciato.isConnected && !dentro(document.activeElement)) confermaOra.current(false);
      }, 0);
    };
    document.addEventListener("pointerdown", clic, true);
    document.addEventListener("keydown", tasto, true);
    document.addEventListener("focusin", entra, true);
    campi.addEventListener("focusout", esce);
    return () => {
      montati = false;
      document.removeEventListener("pointerdown", clic, true);
      document.removeEventListener("keydown", tasto, true);
      document.removeEventListener("focusin", entra, true);
      campi.removeEventListener("focusout", esce);
    };
  }, [modulo]);
}
