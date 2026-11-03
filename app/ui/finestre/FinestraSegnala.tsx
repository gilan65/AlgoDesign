// La finestra prima di salvare il file per una segnalazione: il testo esatto, fotografato all'apertura, e il gesto che lo salva. Nessuna
// scrittura senza il gesto; dietro, un'esecuzione animata può andare avanti e il testo non cambia.
import type { ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { CorpoDellaSegnalazione } from "./CorpoDellaSegnalazione";
import { Finestra, Rinuncia, stili } from "./Finestra";

export function FinestraSegnala({ testo, testi, salva, rinuncia }: { testo: string | null; testi: Dizionario; salva: (testo: string) => void; rinuncia: () => void }): ReactElement {
  return (
    <Finestra aperta={testo !== null} titolo={testi.segnalaTitolo} rinuncia={rinuncia} larga>
      {testo !== null && <CorpoDellaSegnalazione testo={testo} testi={testi} />}
      <div className={stili.comandi}>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
        <button type="button" className={stili.comando} onClick={() => testo !== null && salva(testo)}>
          {testi.segnalaSalva}
        </button>
      </div>
    </Finestra>
  );
}
