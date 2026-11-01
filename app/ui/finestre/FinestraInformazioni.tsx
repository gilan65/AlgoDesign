// La finestra «Informazioni su AlgoDesign», dal menu «Aiuto»: il nome e che cosa fa il programma, la versione con la
// sua data (da `ui/prodotto.ts`, mai scritte nei testi), la frase della versione beta solo se la versione ha un
// suffisso (`-alpha…`, `-beta…`), la licenza e i file che accompagnano il programma. Si chiude
// con «Chiudi» o con Esc; il fuoco parte da «Chiudi», l'unico comando.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import { dataConPreposizione, dataDellaVersione, versione, versioneDiProva } from "../prodotto";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

export function FinestraInformazioni({ aperta, testi, lingua, chiudi }: { aperta: boolean; testi: Dizionario; lingua: Lingua; chiudi: () => void }): ReactElement {
  const chiudiLa = useRef<HTMLButtonElement>(null);
  return (
    <Finestra aperta={aperta} titolo={testi.informazioniTitolo} rinuncia={chiudi} iniziale={() => chiudiLa.current}>
      <p className={stili.prodotto}>AlgoDesign</p>
      <Descrizione className={stili.spiegazione}>{testi.informazioniMotto}</Descrizione>
      <p className={`${stili.spiegazione} ${stili.informazioni}`}>
        <span className={stili.versione} data-versione={versione}>
          {riempi(testi.informazioniVersione, { versione, data: dataConPreposizione(dataDellaVersione, lingua) })}
        </span>
        {versioneDiProva(versione) && <span>{testi.informazioniProva}</span>}
      </p>
      <p className={`${stili.spiegazione} ${stili.informazioni}`}>
        <span>{testi.informazioniLicenza}</span>
        <span className={stili.nota}>{testi.informazioniFile}</span>
        <span className={stili.nota}>{testi.informazioniDocumenti}</span>
      </p>
      <div className={stili.comandi}>
        <Rinuncia type="button" className={stili.comando} ref={chiudiLa}>
          {testi.chiudiEsc}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
