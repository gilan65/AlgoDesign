// La finestra che chiede conferma prima di eliminare un esempio, cioè di cancellarne il file dalla cartella, o un gruppo,
// cioè di cancellare i suoi esempi e la sua sottocartella. Finestra di allerta; il fuoco parte da «Non eliminare», così
// un Invio di troppo non cancella nulla.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import type { Esempio, GruppoDiEsempi } from "../esempi";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

/** Che cosa si toglie: un esempio o un gruppo. */
export type DaTogliere = { readonly genere: "esempio"; readonly esempio: Esempio } | { readonly genere: "gruppo"; readonly gruppo: GruppoDiEsempi };

export function ConfermaTogli({ cosa, testi, togli, rinuncia }: { cosa: DaTogliere | null; testi: Dizionario; togli: () => void; rinuncia: () => void }): ReactElement {
  const no = useRef<HTMLButtonElement>(null);
  const titolo =
    cosa === null
      ? ""
      : cosa.genere === "esempio"
        ? riempi(testi.togliTitolo, { nome: cosa.esempio.progetto?.metadata.name ?? cosa.esempio.nome })
        : riempi(testi.eliminaGruppoTitolo, { nome: cosa.gruppo.nome });
  const quanti = cosa?.genere === "gruppo" ? cosa.gruppo.esempi.length : 0;
  const spiegazione =
    cosa === null
      ? ""
      : cosa.genere === "esempio"
        ? riempi(testi.togliSpiegazione, { file: cosa.esempio.nome })
        : quanti === 0
          ? testi.eliminaGruppoVuoto
          : quanti === 1
            ? testi.eliminaGruppoUno
            : riempi(testi.eliminaGruppoMolti, { quanti: String(quanti) });
  return (
    <Finestra aperta={cosa !== null} allerta titolo={titolo} rinuncia={rinuncia} iniziale={() => no.current}>
      <Descrizione className={stili.spiegazione}>{spiegazione}</Descrizione>
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} onClick={togli}>
          {cosa?.genere === "gruppo" ? testi.eliminaGruppoConferma : testi.togliConferma}
        </button>
        <Rinuncia type="button" ref={no} className={stili.comando}>
          {testi.togliRinuncia}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
