// La finestra che chiede conferma prima di cancellare un dato o un caso d'uso: il titolo nomina che cosa, la
// spiegazione dice che cosa succede dopo (per un dato, quante regole lo usano; per un parametro anche le chiamate, con la
// spunta che toglie il suo argomento). È una finestra di allerta modale (`ui/finestre/Finestra.tsx`, `alertdialog`): il
// fuoco resta dentro finché è aperta, Esc la chiude senza cancellare (un clic fuori no), e chiudendosi il fuoco torna dove
// l'utente era. Il fuoco parte dal comando che NON cancella: un Invio di troppo non perde nulla. La stessa finestra, coi
// suoi testi dei comandi, chiede di togliere dalle costanti comuni una costante che altre funzioni usano.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Descrizione, Finestra, Rinuncia, stili } from "../finestre/Finestra";
import propri from "./VistaDati.module.css";

export interface DaEliminare {
  readonly indice: number;
  readonly nome: string;
  /** Quante regole lo usano. */
  readonly regole: number;
  /** Una costante comune. */
  readonly comune?: boolean;
  /** Un parametro: la procedura o la funzione e quante volte è chiamata. */
  readonly chiamate?: { readonly funzione: string; readonly n: number };
}

/** Titolo e spiegazione della conferma per un dato: quante regole lo usano; per un parametro, prima le chiamate. */
export function testiDelDato(dato: DaEliminare, testi: Dizionario): { titolo: string; spiegazione: string } {
  const regole = dato.regole === 0 ? testi.eliminaDatoNonUsato : dato.regole === 1 ? testi.eliminaDatoUsatoUna : riempi(testi.eliminaDatoUsato, { n: String(dato.regole) });
  const nome = dato.nome || testi.datoSenzaNome;
  if (dato.chiamate === undefined) return { titolo: riempi(testi.eliminaDatoTitolo, { nome }), spiegazione: regole };
  const { funzione, n } = dato.chiamate;
  const chiamate = n === 0 ? "" : `${riempi(n === 1 ? testi.eliminaParametroChiamataUna : testi.eliminaParametroChiamate, { nome: funzione, n: String(n) })} `;
  return { titolo: riempi(testi.eliminaParametroTitolo, { nome }), spiegazione: chiamate + regole };
}

export function ConfermaEliminazione({
  testo,
  elimina,
  rinuncia,
  ritorno,
  testi,
  spunta,
  comandi,
}: {
  /** Titolo e spiegazione; `null`, la finestra è chiusa. */
  testo: { readonly titolo: string; readonly spiegazione: string } | null;
  elimina: () => void;
  rinuncia: () => void;
  /** Dove torna il fuoco quando la finestra si chiude senza cancellare: letto quando la finestra si apre. */
  ritorno: () => HTMLElement | null;
  testi: Dizionario;
  /** Una spunta sotto la spiegazione, col suo testo. */
  spunta?: { readonly testo: string; readonly valore: boolean; readonly cambia: (si: boolean) => void } | undefined;
  /** I testi dei due comandi, se non sono quelli dell'eliminazione. */
  comandi?: { readonly si: string; readonly no: string } | undefined;
}): ReactElement {
  const no = useRef<HTMLButtonElement>(null);
  return (
    <Finestra aperta={testo !== null} allerta titolo={testo?.titolo ?? ""} rinuncia={rinuncia} iniziale={() => no.current} ritorno={ritorno}>
      <Descrizione className={stili.spiegazione}>{testo?.spiegazione ?? ""}</Descrizione>
      {spunta && (
        <label className={propri.casella}>
          <input type="checkbox" data-spunta="" checked={spunta.valore} onChange={(e) => spunta.cambia(e.currentTarget.checked)} />
          <span>{spunta.testo}</span>
        </label>
      )}
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} onClick={elimina}>
          {comandi?.si ?? testi.eliminaConferma}
        </button>
        <Rinuncia ref={no} className={stili.comando}>
          {comandi?.no ?? testi.eliminaRinuncia}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
