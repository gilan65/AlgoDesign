// Ciò che si legge prima di salvare il file per una segnalazione: la frase, che cosa contiene e il testo esatto. Lo usano la finestra e la
// pagina dopo un errore nel disegno: per questo nessun componente di Ark UI.
//
// Il testo è la stringa che si scriverà, in un `<pre>` (a differenza di un campo non tocca i fine riga, e si disegna nella metà del tempo:
// misurato). Prende il fuoco col Tab, così scorre con la tastiera.
import type { ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import stili from "./Finestra.module.css";

export function CorpoDellaSegnalazione({ testo, testi }: { testo: string; testi: Dizionario }): ReactElement {
  return (
    <>
      <p className={stili.spiegazione}>{testi.segnalaFrase}</p>
      <p className={`${stili.spiegazione} ${stili.nota}`}>{testi.segnalaContiene}</p>
      <pre className={stili.testoEsatto} tabIndex={0} aria-label={testi.segnalaTitolo} data-testo-della-segnalazione="">
        {testo}
      </pre>
    </>
  );
}
