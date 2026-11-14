// Il fuoco al clic su una casella, un pulsante di scelta, un pulsante o un elenco a scelta. Chromium (WebView2) e il WebKit
// di Linux lo danno; il WebKit del Mac, e quello di Playwright per Windows, no: il fuoco restava al corpo della pagina, e
// l'Invio subito dopo (la riga dei dati con la casella appena cambiata) non arrivava a nessuno (misurato: la conferma di
// «globale» tolta non compariva). Qui il fuoco va all'elemento cliccato, se il motore non ce l'ha già messo.
//
// Nella fase di cattura, quindi PRIMA dei gestori dell'app: un gestore che porta il fuoco altrove (una finestra che si
// apre e mette il fuoco nel suo primo campo) lo fa dopo, e vince, come in Chromium. Il clic sull'etichetta di una casella
// dà il fuoco alla casella. Un elemento spento non lo prende.
//
// CHE COSA NON GUARDA: i campi di testo (ogni motore dà loro il fuoco al clic); gli elementi resi col tabindex (i blocchi
// del flowchart hanno i loro gestori del fuoco).

const DA_FUOCO = 'input[type="checkbox"], input[type="radio"], button, select, summary';

/** L'elemento che deve prendere il fuoco per un clic su `bersaglio`, o `null`. */
export function elementoDelClic(bersaglio: EventTarget | null): HTMLElement | null {
  if (!(bersaglio instanceof Element)) return null;
  const diretto = bersaglio.closest<HTMLElement>(DA_FUOCO);
  const etichetta = diretto ? null : bersaglio.closest("label");
  const controllo = etichetta instanceof HTMLLabelElement ? etichetta.control : null;
  const scelto = diretto ?? (controllo instanceof HTMLElement && controllo.matches(DA_FUOCO) ? controllo : null);
  if (!scelto || scelto.matches(":disabled")) return null;
  return scelto;
}

/** Installa il fuoco al clic sul documento; restituisce la funzione che lo toglie. */
export function fuocoAlClic(documento: Document = document): () => void {
  const alClic = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const elemento = elementoDelClic(e.target);
    if (elemento && documento.activeElement !== elemento) elemento.focus({ preventScroll: true });
  };
  documento.addEventListener("click", alClic, true);
  return () => documento.removeEventListener("click", alClic, true);
}
