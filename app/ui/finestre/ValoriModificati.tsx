// La finestra che chiede che cosa fare dei valori modificati a mano, prima di «Riesegui»: tenerli, riapplicati allo stesso punto; ricalcolare con le stesse letture, senza
// quei valori; reinserire le letture, da capo; «Annulla» o Esc lascia la pausa com'è. Viene dopo la domanda di salvare, e solo se ci sono valori modificati. Il fuoco parte
// da «Tieni i valori modificati», che non perde nulla.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

export function ValoriModificati({
  aperta,
  testi,
  tieni,
  ricalcola,
  reinserisci,
  rinuncia,
}: {
  aperta: boolean;
  testi: Dizionario;
  tieni: () => void;
  ricalcola: () => void;
  reinserisci: () => void;
  rinuncia: () => void;
}): ReactElement {
  const primo = useRef<HTMLButtonElement>(null);
  return (
    <Finestra aperta={aperta} allerta titolo={testi.valoriTitolo} rinuncia={rinuncia} iniziale={() => primo.current}>
      <Descrizione className={stili.spiegazione}>{testi.valoriSpiegazione}</Descrizione>
      <div className={stili.comandi}>
        <button type="button" ref={primo} className={stili.comando} title={testi.valoriTieniSuggerimento} onClick={tieni}>
          {testi.valoriTieni}
        </button>
        <button type="button" className={stili.comando} title={testi.valoriRicalcolaSuggerimento} onClick={ricalcola}>
          {testi.valoriRicalcola}
        </button>
        <button type="button" className={stili.comando} title={testi.valoriReinserisciSuggerimento} onClick={reinserisci}>
          {testi.valoriReinserisci}
        </button>
        <Rinuncia type="button" className={stili.comando} title={testi.rieseguiSuggerimentoAnnulla}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
