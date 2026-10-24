// La barretta dell'esecuzione: con l'opzione delle Impostazioni accesa, i comandi del gruppo dell'esecuzione e il
// suo stato in una barretta sopra il flowchart, finché c'è un'esecuzione (anche finita: la colonna con la
// console resta aperta, e «Ferma» la chiude). Nasce in alto al centro del flowchart; si sposta trascinando la
// maniglia, e la posizione vale per quell'esecuzione. Resta tutta dentro la finestra: trascinata oltre un bordo si
// ferma lì, e quando la finestra si stringe rientra.
//
// Il fuoco: quando la barretta compare non si muove, tranne se stava su un comando del gruppo della barra (che si
// nasconde): passa allo stesso comando qui. Quando la barretta sparisce col fuoco dentro, torna a «Esegui» nella
// barra. Nel documento la barretta sta subito dopo la barra, quindi il Tab la raggiunge dopo i suoi comandi.
import { useLayoutEffect, useRef, type ReactElement, type RefObject } from "react";
import type { Dizionario } from "../../i18n/it";
import { comandiDellEsecuzione, PulsanteDelComando, type Azioni, type Stati } from "../Barra";
import type { ComandiDellaBarra } from "../preferenze";
import { useSpostabile } from "../spostabile";
import stili from "./Barretta.module.css";

export function Barretta({
  testi,
  presentazione,
  azioni,
  stati,
  stato,
  sopra,
  conChiamate = false,
}: {
  testi: Dizionario;
  presentazione: ComandiDellaBarra;
  azioni: Azioni;
  stati: Stati;
  /** Lo stato dell'esecuzione, in parole. */
  stato: string;
  /** Il flowchart, sopra il quale la barretta nasce. */
  sopra: RefObject<HTMLElement | null>;
  /** Il progetto ha procedure o funzioni: Entra ed Esci ci sono. */
  conChiamate?: boolean;
}): ReactElement {
  const barretta = useRef<HTMLDivElement>(null);
  // Lo spostamento con la maniglia (`ui/spostabile.ts`): la barretta mai spostata si ricentra sul flowchart.
  const { posizione, trascina } = useSpostabile(barretta);

  useLayoutEffect(() => {
    const qui = barretta.current;
    const prima = document.activeElement;
    if (qui && prima instanceof HTMLElement && prima.closest('header [data-gruppo="esecuzione"]'))
      qui.querySelector<HTMLElement>(`[data-comando="${prima.dataset.comando}"]`)?.focus();
    return () => {
      if (!qui?.contains(document.activeElement)) return;
      // Al giro dopo: il gruppo della barra torna visibile.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('header [data-comando="esegui"]')?.focus());
    };
  }, []);

  // In alto al centro del flowchart, finché non la si sposta.
  const area = sopra.current?.getBoundingClientRect();
  const stile =
    posizione !== null
      ? { left: posizione.x, top: posizione.y }
      : area
        ? { left: area.left + area.width / 2, top: area.top + 8, transform: "translateX(-50%)" }
        : undefined;
  return (
    <div ref={barretta} role="toolbar" aria-label={testi.barrettaEsecuzione} className={stili.barretta} data-presentazione={presentazione} style={stile}>
      <span className={stili.maniglia} title={testi.barrettaManiglia} aria-hidden="true" onPointerDown={trascina}>
        ⋮⋮
      </span>
      {comandiDellEsecuzione(conChiamate).map((id) => (
        <PulsanteDelComando key={id} id={id} testi={testi} azione={azioni[id]} stato={stati[id]} conTasto />
      ))}
      <span className={stili.stato}>{stato}</span>
    </div>
  );
}
