// La finestra che dice perché un file non si apre o non si salva: una voce per errore (per un file che il
// lettore rifiuta, il percorso del campo com'è nel file e il testo del motivo). Finestra di allerta, con
// «Chiudi» ed Esc.
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
  return (
    <Finestra aperta={errori !== null} allerta larga titolo={errori?.titolo ?? ""} rinuncia={chiudi} iniziale={() => chiudere.current}>
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
      <div className={stili.comandi}>
        <Rinuncia type="button" ref={chiudere} className={stili.comando}>
          {testi.chiudiEsc}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
