// Il menu di una riga, lo stesso per un dato della vista dei dati e per un caso d'uso: aperto col tasto destro sulla
// riga (o, dalla tastiera, col tasto Menu o Maiusc+F10 sulla riga col fuoco). Le voci sono sempre le quattro di
// `vociDelMenu`, nello stesso ordine; una voce senza azione (spostare su la prima riga, giù l'ultima) c'è, non
// disponibile. Scritto come l'elenco dei blocchi (ruolo `menu`, il fuoco sulla prima voce, frecce, Esc che chiude e
// torna alla riga, un clic fuori che chiude), e con il suo aspetto. La cornice (`MenuNelPunto`) serve anche al menu di una
// colonna della tabella di traccia.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import stili from "../disegno/ElencoDeiBlocchi.module.css";

export const vociDelMenu = ["elimina", "duplica", "su", "giu"] as const;
export type VoceDelMenu = (typeof vociDelMenu)[number];

const testoDella: Record<VoceDelMenu, keyof Dizionario> = { elimina: "menuElimina", duplica: "menuDuplica", su: "menuSu", giu: "menuGiu" };

/** Le azioni del menu sulla riga in quella posizione, fra `quante`: spostare su la prima o giù l'ultima non si può, né
 * duplicare o spostare dove `si` lo nega (un parametro). `chiudi` chiude il menu prima dell'azione. Le usano i due menu,
 * del dato e del caso. */
export function azioniDellaRiga(
  indice: number,
  quante: number,
  fai: { readonly elimina: (i: number) => void; readonly duplica: (i: number) => void; readonly sposta: (i: number, verso: -1 | 1) => void },
  chiudi: () => void,
  si: { readonly duplica: boolean; readonly sposta: boolean } = { duplica: true, sposta: true },
): Record<VoceDelMenu, (() => void) | undefined> {
  const poi = (azione: (i: number) => void) => () => {
    chiudi();
    azione(indice);
  };
  return {
    elimina: poi(fai.elimina),
    duplica: si.duplica ? poi(fai.duplica) : undefined,
    su: si.sposta && indice > 0 ? poi((i) => fai.sposta(i, -1)) : undefined,
    giu: si.sposta && indice < quante - 1 ? poi((i) => fai.sposta(i, 1)) : undefined,
  };
}

export function MenuDellaRiga({
  dove,
  nome,
  testi,
  azioni,
  chiudi,
}: {
  /** Il punto della finestra in cui si apre; `null` quando è chiuso. */
  dove: { x: number; y: number } | null;
  /** Il nome accessibile del menu: dice di quale riga è. */
  nome: string;
  testi: Dizionario;
  /** L'azione di ogni voce; senza, la voce non è disponibile. Il menu si chiude prima dell'azione. */
  azioni: Readonly<Record<VoceDelMenu, (() => void) | undefined>>;
  /** Chiuso senza una scelta; `torna` dice se il fuoco deve tornare sulla riga. */
  chiudi: (torna: boolean) => void;
}): ReactElement | null {
  const voci = vociDelMenu.map((v) => ({ chiave: v, testo: testi[testoDella[v]], azione: azioni[v] }));
  return <MenuNelPunto dove={dove} nome={nome} voci={voci} chiudi={chiudi} />;
}

/** Una voce di un menu nel punto: la chiave (in `data-voce`), il testo e l'azione; senza, la voce non è disponibile. */
export interface VoceNelPunto {
  readonly chiave: string;
  readonly testo: string;
  readonly azione: (() => void) | undefined;
}

/** La cornice dei menu aperti in un punto della finestra (il menu di una riga, quello di una colonna della tabella di
 * traccia): le voci date, nel loro ordine. */
export function MenuNelPunto({
  dove,
  nome,
  voci,
  chiudi,
}: {
  dove: { x: number; y: number } | null;
  nome: string;
  voci: readonly VoceNelPunto[];
  chiudi: (torna: boolean) => void;
}): ReactElement | null {
  const menu = useRef<HTMLDivElement>(null);
  const [posizione, setPosizione] = useState<{ left: number; top: number } | null>(null);

  // Nel punto del clic; mai oltre i bordi della finestra.
  useLayoutEffect(() => {
    if (!dove || !menu.current) return setPosizione(null);
    const { offsetWidth: w, offsetHeight: h } = menu.current;
    const dentro = (v: number, fino: number) => Math.max(Math.min(v, fino), 0);
    setPosizione({ left: dentro(dove.x, innerWidth - w), top: dentro(dove.y, innerHeight - h) });
  }, [dove]);

  useEffect(() => {
    if (posizione !== null) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [posizione]);

  useEffect(() => {
    if (!dove) return;
    const fuori = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) chiudi(false);
    };
    document.addEventListener("pointerdown", fuori, true);
    return () => document.removeEventListener("pointerdown", fuori, true);
  }, [dove, chiudi]);

  if (!dove) return null;

  function tasto(e: KeyboardEvent): void {
    const tutte = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = tutte.indexOf(document.activeElement as HTMLElement);
    const vai = (j: number) => tutte[(j + tutte.length) % tutte.length]?.focus();
    if (e.key === "ArrowDown") vai(i + 1);
    else if (e.key === "ArrowUp") vai(i - 1);
    else if (e.key === "Escape") chiudi(true);
    else if (e.key === "Tab") chiudi(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div ref={menu} role="menu" aria-label={nome} className={stili.elenco} style={posizione ?? { left: 0, top: 0, visibility: "hidden" }} onKeyDown={tasto}>
      {voci.map(({ chiave, testo, azione }) => (
        <button key={chiave} type="button" role="menuitem" tabIndex={-1} className={stili.voce} aria-disabled={azione ? undefined : true} data-voce={chiave} onClick={azione}>
          {testo}
        </button>
      ))}
    </div>
  );
}
