// L'avviso prima della finestra del sistema per salvare il progetto, il codice o la tabella, quando il file non si
// chiamerà come il progetto (un nome che Windows riserva, o caratteri che un nome di file non può avere): la frase dice il
// nome proposto e perché, il campo lo mostra e lo lascia cambiare (controllato mentre si scrive con le regole del guscio,
// `ui/nomi.ts`: «Continua» si spegne su un nome che non va), e «Quali nomi si possono usare?», chiuso di partenza, dà le
// regole. «Continua» (o Invio nel campo) apre la finestra del sistema col nome scelto; «Annulla» ed Esc non salvano.
import { useId, useState, type FormEvent, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { caratteriVietati, nomeDiFileValido } from "../nomi";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

export interface NomeDaChiedere {
  /** Il nome del progetto, com'è. */
  readonly progetto: string;
  /** Il nome proposto, senza l'estensione. */
  readonly proposto: string;
  readonly estensione: string;
  readonly motivo: "riservato" | "caratteri";
}

export function AvvisoDelNome({ chiesto, testi, rispondi }: { chiesto: NomeDaChiedere | null; testi: Dizionario; rispondi: (nome: string | null) => void }): ReactElement {
  return (
    <Finestra aperta={chiesto !== null} titolo={testi.nomeCambiaTitolo} rinuncia={() => rispondi(null)}>
      {chiesto && <Campi chiesto={chiesto} testi={testi} rispondi={rispondi} />}
    </Finestra>
  );
}

function Campi({ chiesto, testi, rispondi }: { chiesto: NomeDaChiedere; testi: Dizionario; rispondi: (nome: string) => void }): ReactElement {
  const id = useId();
  const [nome, setNome] = useState(chiesto.proposto);
  const buono = nomeDiFileValido(nome, chiesto.estensione);
  const conferma = (e: FormEvent) => {
    e.preventDefault();
    if (buono) rispondi(nome);
  };
  const file = (base: string) => `${base}${chiesto.estensione}`;
  const frase =
    chiesto.motivo === "riservato"
      ? riempi(testi.nomeCambiaRiservato, { nome: file(chiesto.progetto.trim()), proposto: file(chiesto.proposto) })
      : riempi(testi.nomeCambiaCaratteri, { proposto: file(chiesto.proposto) });
  return (
    <form className={stili.campi} onSubmit={conferma}>
      <Descrizione className={stili.spiegazione}>{frase}</Descrizione>
      <div className={stili.voce}>
        <label htmlFor={`${id}-nome`}>{testi.nomeCambiaCampo}</label>
        <div className={stili.inLinea}>
          <input
            id={`${id}-nome`}
            className={`${stili.campo} ${stili.nomeDelFile}`}
            value={nome}
            aria-invalid={buono ? undefined : true}
            aria-describedby={buono ? undefined : `${id}-errore`}
            onChange={(e) => setNome(e.currentTarget.value)}
          />
          <span>{chiesto.estensione}</span>
        </div>
        {!buono && (
          <p id={`${id}-errore`} className={stili.errore}>
            {testi.nomeCambiaNonValido}
          </p>
        )}
      </div>
      <details className={stili.dettagli}>
        <summary>{testi.nomeCambiaRegole}</summary>
        <ul className={`${stili.aiuto} ${stili.regole}`}>
          <li>{riempi(testi.nomeRegolaCaratteri, { caratteri: [...caratteriVietati].join(" ") })}</li>
          <li>{testi.nomeRegolaRiservati}</li>
          <li>{testi.nomeRegolaPunti}</li>
          <li>{testi.nomeRegolaInvisibili}</li>
        </ul>
      </details>
      <div className={stili.comandi}>
        <button type="submit" className={stili.comando} aria-disabled={buono ? undefined : true}>
          {testi.nomeCambiaContinua}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </form>
  );
}
