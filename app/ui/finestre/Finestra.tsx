// La base comune delle finestre di dialogo dell'app, sul modello della conferma prima di cancellare un dato
// (`ui/dati/ConfermaEliminazione.tsx`): il `Dialog` di Ark UI, modale, col fuoco trattenuto dentro finché è
// aperta; Esc la chiude come il comando che rinuncia; un clic fuori non la chiude (perderebbe ciò che vi si è
// scritto); chiudendosi, il fuoco torna dove l'utente era (o dove dice `ritorno`). Montata solo da aperta:
// chiusa, non lascia nulla nel documento.
//
// Il fuoco entra nella finestra appena compare, nello stesso gesto che la apre: Ark lo mette un istante dopo
// (fino a 34 ms misurati), e un tasto premuto subito andava perso sul comando che l'aveva aperta. Quando poi Ark
// mette il suo fuoco iniziale, un fuoco già dentro la finestra resta dov'è: l'utente può aver già cliccato un
// altro campo e scritto (prima finiva nel primo campo, che Ark seleziona). Lo stesso per Esc: nel primo istante
// lo raccoglie la finestra stessa. Il ritorno del fuoco alla chiusura lo fa la finestra, quando è smontata: dove
// diceva `ritorno` all'apertura, altrimenti dov'era il fuoco prima di aprire (Ark, che ora trova il fuoco già dentro quando si
// attiva, ricorderebbe un elemento della finestra stessa). Anche il Tab: finché la trappola di Ark non è attiva
// (sotto carico, in WebKit, dopo il primo tasto), il Tab dall'ultimo elemento usciva dalla finestra (misurato sulla
// conferma prima di togliere un esempio, il cui fuoco iniziale è sull'ultimo pulsante): la finestra lo riporta al
// primo, e Maiusc+Tab dal primo all'ultimo. Quando la trappola c'è, il tasto arriva già fermato e qui non si tocca.
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { useCallback, useRef, type ReactElement, type ReactNode } from "react";
import stili from "./Finestra.module.css";

export { stili };

/** Il primo elemento che prende il fuoco col Tab (come lo cerca Ark quando la finestra non dice dove): un campo, un
 * elenco, un pulsante non spento, o un elemento col suo `tabindex` non negativo. */
function primoDaFuoco(radice: HTMLElement): HTMLElement | null {
  const candidati = [...radice.querySelectorAll<HTMLElement>("input, textarea, select, button, [tabindex]")];
  return candidati.find((c) => c.tabIndex >= 0 && !(c as HTMLButtonElement).disabled) ?? null;
}

/** Gli elementi che prendono il fuoco col Tab, in ordine, senza quelli nascosti (le schede non scelte). */
function daFuoco(radice: HTMLElement): HTMLElement[] {
  return [...radice.querySelectorAll<HTMLElement>("input, textarea, select, button, [tabindex]")].filter(
    (c) => c.tabIndex >= 0 && !(c as HTMLButtonElement).disabled && c.closest("[hidden]") === null,
  );
}

/** Le finestre aperte finora, contate: il ritorno del fuoco di una finestra chiusa vale solo se nessun'altra si è aperta
 * dopo. Sotto carico il giro del timer che fa il ritorno arrivava tardi, dopo che l'utente aveva aperto e chiuso la
 * finestra seguente, e portava il fuoco sul comando di prima (misurato in Chromium, Esc subito dopo l'apertura). */
let aperture = 0;

/** Il fuoco già dentro la finestra, se c'è. */
function giaDentroDi(radice: HTMLElement): HTMLElement | null {
  const attivo = document.activeElement;
  return attivo instanceof HTMLElement && radice.contains(attivo) ? attivo : null;
}

export function Finestra({
  aperta,
  titolo,
  allerta = false,
  rinuncia,
  iniziale,
  ritorno,
  larga = false,
  children,
}: {
  aperta: boolean;
  titolo: string;
  /** Una finestra che chiede una decisione o dice un errore: ruolo `alertdialog`. */
  allerta?: boolean;
  /** Esc, o il comando che rinuncia. */
  rinuncia: () => void;
  /** Dove va il fuoco all'apertura. */
  iniziale?: () => HTMLElement | null;
  /** Dove torna il fuoco chiudendo: un elemento della pagina o del flowchart (le voci dello strato sono SVG). */
  ritorno?: () => HTMLElement | SVGElement | null;
  /** Più larga del solito; «piena» per una tabella con molte colonne (quasi tutta la finestra). */
  larga?: boolean | "piena";
  children: ReactNode;
}): ReactElement {
  const contenuto = useRef<HTMLDivElement | null>(null);
  /** Dove va il fuoco all'apertura: il campo dato; senza, come fa Ark, il comando che rinuncia in una finestra
   * d'allerta, altrimenti il primo elemento che prende il fuoco. */
  const primo = (radice: HTMLElement): HTMLElement | null =>
    iniziale?.() ?? (allerta ? radice.querySelector<HTMLElement>('[data-part="close-trigger"]') : null) ?? primoDaFuoco(radice);
  const giaDentro = (): HTMLElement | null => (contenuto.current ? giaDentroDi(contenuto.current) : null);
  const primoOra = useRef(primo);
  primoOra.current = primo;
  const ritornoOra = useRef(ritorno);
  ritornoOra.current = ritorno;
  /** Il contenuto per cui il fuoco iniziale è già stato dato. */
  const montato = useRef<HTMLDivElement | null>(null);
  /** Dove torna il fuoco chiudendo: ciò che dice `ritorno` all'apertura, altrimenti dov'era il fuoco prima di aprire. */
  const tornaA = useRef<HTMLElement | SVGElement | null>(null);
  const primaDiAprire = useRef<HTMLElement | null>(null);
  // Ark passa il contenuto a `montata` con un ref composto che cambia a ogni disegno: React lo richiama con `null` e
  // poi con lo stesso elemento. Il fuoco iniziale si dà solo per un elemento nuovo (in WebKit un clic su un pulsante
  // della finestra lascia il fuoco al corpo, e non deve tornare al primo campo); lo smontaggio vero è un `null` non
  // seguito dall'elemento.
  const montata = useCallback((el: HTMLDivElement | null) => {
    contenuto.current = el;
    if (!el) {
      const finoA = aperture;
      setTimeout(() => {
        if (contenuto.current !== null) return;
        montato.current = null;
        // Un'altra finestra aperta nel frattempo fa il suo ritorno: questa non tocca più il fuoco.
        if (aperture !== finoA) return;
        // Smontata: se il fuoco è rimasto sul corpo della pagina (era dentro la finestra), torna dove deve; altrove lo
        // ha già messo l'utente, o chi ha chiuso la finestra (per esempio la riga dopo un dato eliminato).
        const dove = [tornaA.current, primaDiAprire.current].find((e) => e?.isConnected);
        if (document.activeElement === document.body || document.activeElement === null) dove?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    if (el === montato.current) return;
    montato.current = el;
    aperture++;
    // `ritorno` si legge adesso: allo smontaggio chi l'ha data ha già cambiato stato (il dato da eliminare è nullo).
    tornaA.current = ritornoOra.current?.() ?? null;
    if (giaDentroDi(el)) return;
    const dovEra = document.activeElement;
    primaDiAprire.current = dovEra instanceof HTMLElement ? dovEra : null;
    const campo = primoOra.current(el);
    campo?.focus({ preventScroll: true });
    // Come Ark: il testo del campo selezionato, e ciò che si scrive lo sostituisce.
    if (campo instanceof HTMLInputElement) campo.select();
  }, []);
  // Chiusa, la finestra esce dal documento nello stesso disegno: la trappola del fuoco di Ark si spegne con lei. Lasciata
  // ad Ark, la chiusura passava da un effetto, e nel frattempo la trappola riprendeva un fuoco messo fuori.
  if (!aperta) return <></>;
  return (
    <Dialog.Root
      open
      onOpenChange={(d) => {
        if (!d.open) rinuncia();
      }}
      role={allerta ? "alertdialog" : "dialog"}
      closeOnInteractOutside={false}
      // Col fuoco in un menu della finestra (il «⋯» di una riga), Esc chiude il menu e non la finestra.
      onEscapeKeyDown={(e) => {
        if (document.activeElement?.closest('[role="menu"]')) e.preventDefault();
      }}
      lazyMount
      unmountOnExit
      initialFocusEl={() => giaDentro() ?? (contenuto.current ? primo(contenuto.current) : null)}
      // Il ritorno del fuoco lo fa la finestra, quando è smontata (`montata`): quello di Ark scatta anche quando React,
      // in sviluppo, ripete gli effetti, e riportava il fuoco al comando mentre si scriveva nella finestra appena aperta
      // (misurato: poi la trappola lo rimetteva nel primo campo selezionandolo, e una lettera sostituiva le prime).
      restoreFocus={false}
    >
      <Portal>
        <Dialog.Backdrop className={stili.sfondo} />
        <Dialog.Positioner className={stili.posto}>
          <Dialog.Content
            ref={montata}
            // Esc chiude anche nel primo istante, prima che Ark ascolti i tasti: il fuoco ora è già dentro, e un Esc
            // premuto subito non deve andare perso. Quando Ark ascolta, lo chiude lui (e lo segna).
            onKeyDown={(tasto) => {
              if (tasto.defaultPrevented || tasto.nativeEvent.isComposing) return;
              if (tasto.key === "Tab" && contenuto.current) {
                const tutti = daFuoco(contenuto.current);
                const [daPrimo, daUltimo] = [tutti[0], tutti.at(-1)];
                const verso = tasto.shiftKey ? (document.activeElement === daPrimo ? daUltimo : null) : document.activeElement === daUltimo ? daPrimo : null;
                if (!verso) return;
                tasto.preventDefault();
                verso.focus();
                return;
              }
              if (tasto.key !== "Escape") return;
              tasto.preventDefault();
              rinuncia();
            }}
            className={larga === "piena" ? `${stili.finestra} ${stili.piena}` : larga ? `${stili.finestra} ${stili.larga}` : stili.finestra}
          >
            <Dialog.Title className={stili.titolo}>{titolo}</Dialog.Title>
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/** Il comando che chiude la finestra rinunciando (Esc fa lo stesso). */
export const Rinuncia = Dialog.CloseTrigger;
export const Descrizione = Dialog.Description;
