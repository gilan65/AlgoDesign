// Ciò che si legge prima di salvare il file per una segnalazione: la frase, che cosa contiene e il testo esatto. Lo usano la finestra e la
// pagina dopo un errore nel disegno: per questo nessun componente di Ark UI.
//
// Il testo è la stringa che si scriverà, in un `<pre>` (a differenza di un campo non tocca i fine riga, e si disegna nella metà del tempo:
// misurato). Prende il fuoco col Tab, così scorre con la tastiera.
//
// Con la registrazione attiva la nota dice le esecuzioni e, se il file non le ha tutte, quante mancano.
import type { ReactElement } from "react";
import { tettoDelleEsecuzioni } from "../../core/registrazione/in-registrazione";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import type { PerSegnalare } from "../segnalazione";
import stili from "./Finestra.module.css";

export function CorpoDellaSegnalazione({ segnalazione: { testo, registrate }, testi, consiglio }: { segnalazione: PerSegnalare; testi: Dizionario; consiglio?: string | undefined }): ReactElement {
  return (
    <>
      <p className={stili.spiegazione}>{testi.segnalaFrase}</p>
      <p className={`${stili.spiegazione} ${stili.nota}`}>{registrate === null ? testi.segnalaContiene : riempi(testi.segnalaContieneRegistrate, { n: String(registrate.numero) })}</p>
      {registrate !== null && registrate.perse > 0 && <p className={`${stili.spiegazione} ${stili.nota}`}>{riempi(testi.segnalaEsecuzioniPerse, { tetto: String(tettoDelleEsecuzioni), n: String(registrate.perse) })}</p>}
      {consiglio !== undefined && <p className={`${stili.spiegazione} ${stili.nota}`}>{consiglio}</p>}
      <pre className={stili.testoEsatto} tabIndex={0} aria-label={testi.segnalaTitolo} data-testo-della-segnalazione="">
        {testo}
      </pre>
    </>
  );
}
