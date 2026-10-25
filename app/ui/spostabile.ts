// Un riquadro che si sposta trascinando la sua maniglia (la barretta dell'esecuzione, l'avviso sopra il flowchart):
// segue il puntatore, catturato, e resta tutto dentro la finestra; trascinato oltre un bordo si ferma lì, e quando la
// finestra si stringe rientra. Finché non lo si sposta la posizione è `null`, e il riquadro sta dove lo mette chi lo
// disegna; `azzera` lo riporta lì. Un riquadro che si chiude e si riapre (la guida) riparte da dove era: `iniziale`.
import { useEffect, useReducer, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

export interface Posizione {
  readonly x: number;
  readonly y: number;
}

export function useSpostabile(
  riquadro: RefObject<HTMLElement | null>,
  iniziale: Posizione | null = null,
): {
  posizione: Posizione | null;
  trascina: (e: ReactPointerEvent<HTMLElement>) => void;
  azzera: () => void;
} {
  const [posizione, setPosizione] = useState<Posizione | null>(iniziale);
  const [, ridisegna] = useReducer((n: number) => n + 1, 0);

  /** La posizione col riquadro tutto dentro la finestra. */
  const dentro = (p: Posizione): Posizione => {
    const r = riquadro.current?.getBoundingClientRect();
    return { x: Math.max(0, Math.min(p.x, window.innerWidth - (r?.width ?? 0))), y: Math.max(0, Math.min(p.y, window.innerHeight - (r?.height ?? 0))) };
  };
  // La finestra che cambia misura: il riquadro spostato rientra, quello mai spostato si ridisegna dove va.
  useEffect(() => {
    const ridimensiona = () => {
      setPosizione((p) => (p === null ? p : dentro(p)));
      ridisegna();
    };
    window.addEventListener("resize", ridimensiona);
    return () => window.removeEventListener("resize", ridimensiona);
  }, []);

  /** Il trascinamento dalla maniglia: il riquadro segue il puntatore, catturato. */
  function trascina(e: ReactPointerEvent<HTMLElement>): void {
    const r = riquadro.current?.getBoundingClientRect();
    if (!r) return;
    const [dx, dy] = [e.clientX - r.left, e.clientY - r.top];
    const maniglia = e.currentTarget;
    maniglia.setPointerCapture(e.pointerId);
    const muovi = (m: PointerEvent) => setPosizione(dentro({ x: m.clientX - dx, y: m.clientY - dy }));
    const fine = () => {
      maniglia.removeEventListener("pointermove", muovi);
      maniglia.removeEventListener("pointerup", fine);
      maniglia.removeEventListener("pointercancel", fine);
    };
    maniglia.addEventListener("pointermove", muovi);
    maniglia.addEventListener("pointerup", fine);
    maniglia.addEventListener("pointercancel", fine);
  }

  return { posizione, trascina, azzera: () => setPosizione(null) };
}
