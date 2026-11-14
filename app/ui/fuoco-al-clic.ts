// Il fuoco al clic su una casella, un pulsante di scelta, un pulsante o un elenco a scelta. Chromium (WebView2) e il WebKit
// di Linux lo danno; il WebKit del Mac, e quello di Playwright per Windows, no: il fuoco restava al corpo della pagina, e
// l'Invio subito dopo (la riga dei dati con la casella appena cambiata) non arrivava a nessuno (misurato: la conferma di
// «globale» tolta non compariva). Qui il fuoco va all'elemento cliccato, se il motore non ce l'ha già messo.
//
// DOPO il clic, quando l'azione del motore (la spunta) e i gestori dell'app sono finiti, e solo se il fuoco è rimasto al
// corpo della pagina: un gestore che lo porta altrove (una finestra che si apre e mette il fuoco nel suo primo campo)
// vince, come in Chromium. Dato DURANTE il clic, il fuoco faceva partire i gestori del fuoco a metà del clic: coi campi
// di un caso aperti, la casella di un'altra riga, ridisegnata dalla conferma dei campi, perdeva la spunta (misurato in
// Chromium, `e2e/casi.e2e.ts`). Il clic sull'etichetta di una casella dà il fuoco alla casella. Un elemento spento non lo
// prende.
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
    if (!elemento) return;
    setTimeout(() => {
      const attivo = documento.activeElement;
      if (elemento.isConnected && (attivo === null || attivo === documento.body)) elemento.focus({ preventScroll: true });
    }, 0);
  };
  documento.addEventListener("click", alClic, true);
  return () => documento.removeEventListener("click", alClic, true);
}
