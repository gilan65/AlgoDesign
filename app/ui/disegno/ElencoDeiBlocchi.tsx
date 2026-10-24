// L'elenco che si apre su un punto di inserimento: i nove generi di blocco (tappe 1 e 2) e, se c'è un
// blocco copiato o tagliato, «Incolla». Non è un menu della barra: lo apre il «+», accanto al quale
// compare, e alla chiusura senza una scelta il fuoco torna sul «+».
//
// Scritto qui e non col menu di Ark UI: senza un pulsante proprio, quello si apriva la prima volta
// nell'angolo della finestra e si richiudeva da solo al clic che l'aveva aperto (misurato in Chromium).
//
// Tastiera: il fuoco va sulla prima voce; frecce su e giù (in giro), Inizio e Fine; Invio o Spazio
// sceglie; Esc chiude e torna al «+»; Tab chiude. Un clic fuori chiude.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { generiDellaTappa, type GenereDellaTappa } from "../../core/modifica/operazioni";
import type { Dizionario } from "../../i18n/it";
import { nomiDeiGeneri } from "./accessibile";
import stili from "./ElencoDeiBlocchi.module.css";

export type Scelta = GenereDellaTappa | "incolla";

/** Lo spazio fra il «+» e l'elenco. */
const DISTANZA = 6;

export function ElencoDeiBlocchi({
  aggancio,
  testi,
  conIncolla,
  scegli,
  chiudi,
}: {
  /** Il «+» su cui l'elenco è aperto; `null` quando è chiuso. */
  aggancio: SVGGElement | null;
  testi: Dizionario;
  conIncolla: boolean;
  scegli: (s: Scelta) => void;
  /** Chiuso senza una scelta; `torna` dice se il fuoco deve tornare sul «+». */
  chiudi: (torna: boolean) => void;
}): ReactElement | null {
  const voci: Scelta[] = [...generiDellaTappa, ...(conIncolla ? (["incolla"] as const) : [])];
  const elenco = useRef<HTMLDivElement>(null);
  const [posizione, setPosizione] = useState<{ left: number; top: number } | null>(null);

  // Accanto al «+», a destra; se non c'è posto, a sinistra; mai oltre il bordo di sotto.
  useLayoutEffect(() => {
    if (!aggancio || !elenco.current) return setPosizione(null);
    const r = aggancio.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = elenco.current;
    const left = r.right + DISTANZA + w <= innerWidth ? r.right + DISTANZA : Math.max(0, r.left - DISTANZA - w);
    setPosizione({ left, top: Math.max(0, Math.min(r.top, innerHeight - h)) });
  }, [aggancio]);

  // Il fuoco sulla prima voce quando l'elenco si vede (un elemento nascosto non lo prende).
  useEffect(() => {
    if (posizione !== null && !elenco.current?.contains(document.activeElement)) elenco.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [posizione]);

  // Un clic fuori chiude (il clic su un altro «+» poi lo riapre là).
  useEffect(() => {
    if (!aggancio) return;
    const fuori = (e: PointerEvent) => {
      if (!elenco.current?.contains(e.target as Node)) chiudi(false);
    };
    document.addEventListener("pointerdown", fuori, true);
    return () => document.removeEventListener("pointerdown", fuori, true);
  }, [aggancio, chiudi]);

  if (!aggancio) return null;

  function tasto(e: KeyboardEvent): void {
    const tutte = [...(elenco.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = tutte.indexOf(document.activeElement as HTMLElement);
    const vai = (j: number) => tutte[(j + tutte.length) % tutte.length]?.focus();
    if (e.key === "ArrowDown") vai(i + 1);
    else if (e.key === "ArrowUp") vai(i - 1);
    else if (e.key === "Home") vai(0);
    else if (e.key === "End") vai(tutte.length - 1);
    else if (e.key === "Escape") chiudi(true);
    else if (e.key === "Tab") chiudi(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      ref={elenco}
      role="menu"
      aria-label={testi.elencoDeiBlocchi}
      className={stili.elenco}
      style={posizione ?? { left: 0, top: 0, visibility: "hidden" }}
      onKeyDown={tasto}
    >
      {voci.map((v) => (
        <button key={v} type="button" role="menuitem" tabIndex={-1} className={v === "incolla" ? `${stili.voce} ${stili.incolla}` : stili.voce} onClick={() => scegli(v)}>
          {v === "incolla" ? testi.incolla : testi[nomiDeiGeneri[v]]}
        </button>
      ))}
    </div>
  );
}
