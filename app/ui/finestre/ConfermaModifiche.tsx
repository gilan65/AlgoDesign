// La finestra che chiede che cosa fare delle modifiche non salvate, prima di Nuovo, Apri, di aprire un esempio
// e di chiudere la finestra dell'app: «Salva» (poi il gesto continua, se il salvataggio riesce), «Non salvare»
// (il gesto continua e le modifiche si perdono), «Annulla» o Esc (non succede nulla). Finestra di allerta; il
// fuoco parte da «Salva», che non perde nulla.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

export function ConfermaModifiche({
  aperta,
  nome,
  testi,
  salva,
  nonSalvare,
  rinuncia,
}: {
  aperta: boolean;
  /** Il nome del progetto. */
  nome: string;
  testi: Dizionario;
  salva: () => void;
  nonSalvare: () => void;
  rinuncia: () => void;
}): ReactElement {
  const si = useRef<HTMLButtonElement>(null);
  return (
    <Finestra aperta={aperta} allerta titolo={riempi(testi.modificheTitolo, { nome })} rinuncia={rinuncia} iniziale={() => si.current}>
      <Descrizione className={stili.spiegazione}>{testi.modificheSpiegazione}</Descrizione>
      <div className={stili.comandi}>
        <button type="button" ref={si} className={stili.comando} onClick={salva}>
          {testi.modificheSalva}
        </button>
        <button type="button" className={stili.comando} onClick={nonSalvare}>
          {testi.modificheNonSalvare}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
