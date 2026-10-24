// La vista del flowchart nella finestra: l'area che resta accanto alla vista dei dati, dove il disegno si
// scorre quando è più grande. I comandi dello zoom stanno nella barra; qui la scala si applica, e si misura
// l'area per «Adatta alla finestra». Durante l'esecuzione lo scorrimento verso il blocco corrente è morbido, tranne
// con «riduci il movimento» del sistema (lo dice il CSS).
import type { KeyboardEvent, ReactElement, Ref } from "react";
import type { Disegno } from "../../core/disegno/impaginazione";
import { geometriaPredefinita } from "../../core/disegno/tema";
import { Flowchart, type Interazione } from "./Flowchart";
import stili from "./VistaFlowchart.module.css";

export const PASSO = 1.25;
/** La scala più piccola: quella a cui il carattere del disegno arriva a 5 px (sotto, le etichette toccavano
 * le forme). Oltre, il disegno si scorre. */
export const MINIMA = 5 / geometriaPredefinita.carattere;
export const MASSIMA = 4;

/** La scala dentro i limiti: «Riduci», «Ingrandisci» e «Adatta» si fermano agli stessi. */
export const limitaLaScala = (s: number): number => Math.min(Math.max(s, MINIMA), MASSIMA);

/** La scala che mostra tutto il disegno nell'area data, senza ingrandirlo oltre il 100% né rimpicciolirlo
 * sotto la minima. */
export function scalaAdatta(disegno: Disegno, larghezza: number, altezza: number): number {
  return limitaLaScala(Math.min(larghezza / disegno.larghezza, altezza / disegno.altezza, 1));
}

/** L'area dove sta il disegno: l'ingombro dell'elemento senza bordi e margini interni. Le barre di
 * scorrimento NON si tolgono: si vedono solo finché il disegno è più grande, e dopo «Adatta» spariscono
 * (con `clientWidth` la scala sarebbe calcolata su un'area più piccola di quella che resta). */
export function areaDelDisegno(tela: HTMLElement): { larghezza: number; altezza: number } {
  const s = getComputedStyle(tela);
  const n = (v: string) => parseFloat(v) || 0;
  return {
    larghezza: tela.offsetWidth - n(s.borderLeftWidth) - n(s.borderRightWidth) - n(s.paddingLeft) - n(s.paddingRight),
    altezza: tela.offsetHeight - n(s.borderTopWidth) - n(s.borderBottomWidth) - n(s.paddingTop) - n(s.paddingBottom),
  };
}

export function VistaFlowchart({
  disegno,
  nome,
  etichetta,
  scala,
  tela,
  interazione,
  tasto,
  morbida = false,
  fondoDeiCicli = false,
}: {
  disegno: Disegno;
  /** Il nome accessibile del disegno. */
  nome: string;
  /** Il nome accessibile della vista. */
  etichetta: string;
  scala: number;
  tela: Ref<HTMLElement>;
  interazione?: Interazione;
  /** I tasti premuti col fuoco dentro la vista. */
  tasto?: (e: KeyboardEvent) => void;
  /** Durante l'esecuzione: lo scorrimento verso il blocco corrente è morbido (tranne con «riduci il movimento»). */
  morbida?: boolean;
  /** Il riquadro dei cicli col fondo colorato (un'opzione dell'app). */
  fondoDeiCicli?: boolean;
}): ReactElement {
  return (
    <section ref={tela} aria-label={etichetta} className={morbida ? `${stili.tela} ${stili.morbida}` : stili.tela} onKeyDown={tasto}>
      <Flowchart disegno={disegno} nome={nome} scala={scala} fondoDeiCicli={fondoDeiCicli} {...(interazione ? { interazione } : {})} />
    </section>
  );
}
