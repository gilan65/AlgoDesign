// Il bordo fra la vista dei dati e quella del flowchart (e fra il flowchart e la colonna dell'esecuzione, e
// dentro la colonna fra la tabella di traccia e la console): si trascina col puntatore, o si sposta con le frecce
// della tastiera (16 px a pressione; Inizio e Fine portano agli estremi). È un separatore con il suo valore, come
// lo legge un lettore di schermo. La misura scelta vale fino alla chiusura dell'app. Il pannello che allarga sta a
// sinistra del bordo, o a destra (`aDestra`): lì il bordo che va a sinistra lo allarga. Un bordo `orizzontale`
// regola l'altezza del pannello che sta sopra, con le frecce in su e in giù, fino a lasciare sotto almeno
// l'altezza minima.
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement, type RefObject } from "react";
import stili from "./Applicazione.module.css";

export const LARGHEZZA_MINIMA = 160;
/** L'altezza minima del pannello sopra un bordo orizzontale, e di ciò che resta sotto. */
export const ALTEZZA_MINIMA = 80;
const PASSO = 16;

/** La larghezza massima del pannello: metà della finestra, perché il flowchart resti la vista principale. */
export const larghezzaMassima = () => Math.max(LARGHEZZA_MINIMA, Math.floor(window.innerWidth / 2));

export function Divisore({
  pannello,
  larghezza,
  cambia,
  nome,
  controlla,
  aDestra = false,
  orizzontale = false,
}: {
  /** Il pannello che il bordo allarga: da lì si legge la misura finché l'utente non ne ha scelta una. */
  pannello: RefObject<HTMLElement | null>;
  /** La larghezza scelta (l'altezza, per un bordo orizzontale). */
  larghezza: number | null;
  cambia: (misura: number) => void;
  nome: string;
  controlla: string;
  aDestra?: boolean;
  orizzontale?: boolean;
}): ReactElement {
  const verso = aDestra ? -1 : 1;
  const minima = orizzontale ? ALTEZZA_MINIMA : LARGHEZZA_MINIMA;
  const presa = useRef<{ da: number; misura: number } | null>(null);
  const misuraDi = (e: HTMLElement | null | undefined) => {
    const r = e?.getBoundingClientRect();
    return r === undefined ? undefined : orizzontale ? r.height : r.width;
  };
  // La misura naturale del pannello (quella del suo contenuto), letta dopo il disegno: serve al valore del
  // separatore e al primo trascinamento.
  const [naturale, setNaturale] = useState<number | null>(null);
  useLayoutEffect(() => {
    const w = misuraDi(pannello.current);
    if (larghezza === null && w !== undefined && w !== naturale) setNaturale(w);
  });
  const attuale = () => larghezza ?? misuraDi(pannello.current) ?? naturale ?? minima;
  // In orizzontale, il massimo è l'altezza del contenitore meno quella minima di ciò che sta sotto.
  const massima = () => (orizzontale ? Math.max(minima, (misuraDi(pannello.current?.parentElement) ?? 2 * minima) - minima) : larghezzaMassima());
  const limita = (w: number) => Math.round(Math.min(Math.max(w, minima), massima()));
  const posizione = (e: PointerEvent) => (orizzontale ? e.clientY : e.clientX);

  function premi(e: PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    presa.current = { da: posizione(e), misura: attuale() };
  }
  function muovi(e: PointerEvent<HTMLDivElement>): void {
    if (presa.current) cambia(limita(presa.current.misura + verso * (posizione(e) - presa.current.da)));
  }
  function lascia(): void {
    presa.current = null;
  }
  function tasto(e: KeyboardEvent<HTMLDivElement>): void {
    const [meno, piu] = orizzontale ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
    const nuova = e.key === meno ? attuale() - verso * PASSO : e.key === piu ? attuale() + verso * PASSO : e.key === "Home" ? minima : e.key === "End" ? massima() : undefined;
    if (nuova === undefined) return;
    e.preventDefault();
    cambia(limita(nuova));
  }

  return (
    <div
      role="separator"
      aria-orientation={orizzontale ? "horizontal" : "vertical"}
      aria-label={nome}
      aria-controls={controlla}
      aria-valuemin={minima}
      aria-valuemax={massima()}
      aria-valuenow={limita(larghezza ?? naturale ?? minima)}
      tabIndex={0}
      className={orizzontale ? stili.divisoreOrizzontale : stili.divisore}
      onPointerDown={premi}
      onPointerMove={muovi}
      onPointerUp={lascia}
      onPointerCancel={lascia}
      onKeyDown={tasto}
    />
  );
}
