// La finestra prima di salvare il file per una segnalazione: il testo esatto, fotografato all'apertura, e il gesto che lo salva. Nessuna
// scrittura senza il gesto; dietro, un'esecuzione animata può andare avanti e il testo non cambia.
//
// A registrazione spenta consiglia di ripetere il malfunzionamento registrando, e il pulsante la attiva senza scrivere nulla.
import type { ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import type { PerSegnalare } from "../segnalazione";
import { CorpoDellaSegnalazione } from "./CorpoDellaSegnalazione";
import { Finestra, Rinuncia, stili } from "./Finestra";

export function FinestraSegnala({ segnalazione, testi, salva, rinuncia, attiva }: { segnalazione: PerSegnalare | null; testi: Dizionario; salva: (s: PerSegnalare) => void; rinuncia: () => void; attiva: () => void }): ReactElement {
  const spenta = segnalazione?.registrate === null;
  return (
    <Finestra aperta={segnalazione !== null} titolo={testi.segnalaTitolo} rinuncia={rinuncia} larga>
      {segnalazione !== null && <CorpoDellaSegnalazione segnalazione={segnalazione} testi={testi} consiglio={spenta ? testi.segnalaConsiglio : undefined} />}
      <div className={stili.comandi}>
        {spenta && (
          <button type="button" className={`${stili.comando} ${stili.aSinistra}`} onClick={attiva}>
            {testi.segnalaAttiva}
          </button>
        )}
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
        <button type="button" className={stili.comando} onClick={() => segnalazione !== null && salva(segnalazione)}>
          {testi.segnalaSalva}
        </button>
      </div>
    </Finestra>
  );
}
