// Un errore o un avviso dentro i campi di un blocco o di un dato: il testo breve, subito, e accanto «Spiegazione», che apre
// e richiude il resto (ciò che è successo, quando dice più del breve, e il suggerimento). Chiusa all'inizio: chi corregge
// ha davanti la sola frase breve, e la spiegazione la chiede lui.
import { useState, type ReactElement } from "react";
import type { Dizionario } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import stili from "./Spiegazione.module.css";

export interface TestiDellaSegnalazione {
  readonly genere: "errore" | "avviso";
  readonly breve: string;
  readonly accaduto: string;
  readonly suggerimento: string;
}

/** Il resto del messaggio: l'`accaduto` se dice più del breve, poi il suggerimento. */
export const testoDellaSpiegazione = (s: TestiDellaSegnalazione): string => (s.accaduto === s.breve ? s.suggerimento : `${s.accaduto} ${s.suggerimento}`);

export function Spiegazione({ s, testi }: { s: TestiDellaSegnalazione; testi: Dizionario }): ReactElement {
  const [aperta, setAperta] = useState(false);
  return (
    <>
      <span data-breve>{riempi(s.genere === "errore" ? testi.segnalazioneErrore : testi.segnalazioneAvviso, { breve: s.breve })}</span>{" "}
      <button type="button" className={stili.apri} aria-expanded={aperta} onClick={() => setAperta((a) => !a)}>
        {testi.spiegazione}
        <span aria-hidden="true">{aperta ? " ▾" : " ▸"}</span>
      </button>
      {/* Il resto c'è solo aperto: chiuso, il testo della riga è il solo breve, anche per chi lo legge come testo. */}
      {aperta && (
        <span className={stili.testo} data-spiegazione>
          {testoDellaSpiegazione(s)}
        </span>
      )}
    </>
  );
}
