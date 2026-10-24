// La finestra che chiede conferma prima di togliere un valore iniziale dal flowchart (Elimina o Canc sul suo blocco):
// toglierlo dal flowchart vuol dire toglierlo dal dato, quindi anche dalla vista dei dati. Come la conferma prima di
// cancellare un dato (`ui/dati/ConfermaEliminazione.tsx`): finestra d'allerta modale, il fuoco parte dal comando che
// NON toglie, Esc la chiude senza passi, e chiudendosi senza togliere il fuoco torna sul blocco.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Descrizione, Finestra, Rinuncia, stili } from "../finestre/Finestra";

export function ConfermaValoreIniziale({
  nome,
  togli,
  rinuncia,
  ritorno,
  testi,
}: {
  /** Il nome del dato il cui valore iniziale si toglie; `null`, la finestra è chiusa. */
  nome: string | null;
  togli: () => void;
  rinuncia: () => void;
  /** Il blocco del valore iniziale, dove torna il fuoco: letto quando la finestra si apre. */
  ritorno: () => SVGElement | null;
  testi: Dizionario;
}): ReactElement {
  const no = useRef<HTMLButtonElement>(null);
  return (
    <Finestra aperta={nome !== null} allerta titolo={riempi(testi.togliValoreTitolo, { nome: nome ?? "" })} rinuncia={rinuncia} iniziale={() => no.current} ritorno={ritorno}>
      <Descrizione className={stili.spiegazione}>{testi.togliValoreSpiegazione}</Descrizione>
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} onClick={togli}>
          {testi.togliValoreConferma}
        </button>
        <Rinuncia ref={no} className={stili.comando}>
          {testi.togliValoreRinuncia}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
