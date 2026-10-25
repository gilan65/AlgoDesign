// La finestra che dice perché un file non si apre o non si salva: una voce per errore. Per un file che il lettore
// rifiuta, in testa una frase per lo studente (il file non è un progetto, o è stato modificato e non si legge più) e le
// voci, col percorso del campo com'è nel file e il testo del motivo, in «Dettagli», chiuso di partenza: servono a chi
// corregge il file a mano. Finestra di allerta, con «Chiudi» ed Esc.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { Finestra, Rinuncia, stili } from "./Finestra";

export interface VoceDiErrore {
  /** Il percorso del campo nel file; assente per un errore che non è di un campo. */
  readonly percorso?: string;
  readonly testo: string;
}

export function FinestraErrori({
  errori,
  testi,
  chiudi,
}: {
  /** Titolo e voci; `null`, la finestra è chiusa. */
  errori: { readonly titolo: string; readonly voci: readonly VoceDiErrore[] } | null;
  testi: Dizionario;
  chiudi: () => void;
}): ReactElement {
  const chiudere = useRef<HTMLButtonElement>(null);
  const voci = (
    <ul className={stili.errori}>
      {errori?.voci.map((v, i) => (
        <li key={i}>
          {v.percorso !== undefined && (
            <>
              <span className={stili.percorso}>{v.percorso === "" ? testi.erroreDelFileIntero : v.percorso}</span>:{" "}
            </>
          )}
          {v.testo}
        </li>
      ))}
    </ul>
  );
  const delLettore = errori?.voci.some((v) => v.percorso !== undefined) ?? false;
  return (
    <Finestra aperta={errori !== null} allerta larga titolo={errori?.titolo ?? ""} rinuncia={chiudi} iniziale={() => chiudere.current}>
      {delLettore ? (
        <>
          <p className={stili.spiegazione}>{testi.apriNonEUnProgetto}</p>
          <details className={stili.dettagli}>
            <summary>{testi.dettagli}</summary>
            {voci}
          </details>
        </>
      ) : (
        voci
      )}
      <div className={stili.comandi}>
        <Rinuncia type="button" ref={chiudere} className={stili.comando}>
          {testi.chiudiEsc}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
