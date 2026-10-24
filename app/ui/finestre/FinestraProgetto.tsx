// La finestra Progetto: il nome (obbligatorio), l'autore, la descrizione, le note, la casella «È una libreria» (il
// segno nel file) e le due opzioni che cambiano il risultato (le cifre decimali dei reali, il carattere di riempimento).
// Si apre da «Nuovo» (per creare un progetto) e dal pulsante «Progetto» (per cambiare quello aperto). Gli errori
// stanno sotto il campo mentre si scrive (su un campo cambiato, o dopo il primo tentativo di conferma); la
// conferma con un errore mette il fuoco sul primo campo sbagliato.
// Invio in un campo di una riga conferma; nelle aree di testo va a capo.
import { useId, useRef, useState, type FormEvent, type ReactElement, type RefObject } from "react";
import type { Metadati, Opzioni } from "../../core/progetto/modello";
import { opzioniPredefinite } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { Finestra, Rinuncia, stili } from "./Finestra";

export interface DatiDelProgetto {
  readonly metadati: Metadati;
  readonly opzioni: Opzioni;
}

type Bozza = { nome: string; autore: string; descrizione: string; note: string; decimali: string; riempimento: string };

const bozzaDa = (d: DatiDelProgetto): Bozza => ({
  nome: d.metadati.name,
  autore: d.metadati.author ?? "",
  descrizione: d.metadati.description ?? "",
  note: d.metadati.notes ?? "",
  decimali: String(d.opzioni.real_decimals ?? opzioniPredefinite.real_decimals),
  riempimento: d.opzioni.fill_character ?? opzioniPredefinite.fill_character,
});

/** Gli errori della bozza, campo per campo (le regole del lettore del file: il nome non vuoto, le cifre decimali da 0 a 15,
 * un solo carattere di riempimento). */
export function erroriDellaBozza(b: Bozza): Partial<Record<"nome" | "decimali" | "riempimento", "progettoNomeVuoto" | "progettoDecimaliFuori" | "progettoRiempimentoUno">> {
  const codici = [...b.riempimento].map((c) => c.codePointAt(0)!);
  const surrogato = codici.length === 1 && codici[0]! >= 0xd800 && codici[0]! <= 0xdfff;
  return {
    ...(b.nome === "" ? { nome: "progettoNomeVuoto" as const } : {}),
    ...(!/^\d{1,2}$/.test(b.decimali) || Number(b.decimali) > 15 ? { decimali: "progettoDecimaliFuori" as const } : {}),
    ...(codici.length !== 1 || codici[0] === 0 || surrogato ? { riempimento: "progettoRiempimentoUno" as const } : {}),
  };
}

function datiDa(b: Bozza, libreria: boolean): DatiDelProgetto {
  return {
    metadati: { name: b.nome, author: b.autore, description: b.descrizione, notes: b.note, ...(libreria ? { library: true as const } : {}) },
    opzioni: { real_decimals: Number(b.decimali), fill_character: b.riempimento },
  };
}

function Campi({
  iniziali,
  nuovo,
  testi,
  conferma,
  primo,
}: {
  iniziali: DatiDelProgetto;
  nuovo: boolean;
  testi: Dizionario;
  conferma: (d: DatiDelProgetto) => void;
  primo: RefObject<HTMLInputElement | null>;
}): ReactElement {
  const id = useId();
  const [bozza, setBozza] = useState(() => bozzaDa(iniziali));
  const [libreria, setLibreria] = useState(iniziali.metadati.library === true);
  const modulo = useRef<HTMLFormElement>(null);
  const errori = erroriDellaBozza(bozza);
  // Un errore si mostra dopo il primo tentativo di conferma, o su un campo che l'utente ha cambiato: una
  // finestra appena aperta non comincia con un rimprovero.
  const [tentato, setTentato] = useState(false);
  const iniziale = bozzaDa(iniziali);
  const campo = (chiave: keyof Bozza, etichetta: string, opzioni: { area?: boolean; aiuto?: string; numero?: boolean } = {}) => {
    const errore = tentato || bozza[chiave] !== iniziale[chiave] ? errori[chiave as keyof typeof errori] : undefined;
    const descritto = [opzioni.aiuto ? `${id}-${chiave}-aiuto` : null, errore ? `${id}-${chiave}-errore` : null].filter(Boolean).join(" ");
    const comuni = {
      id: `${id}-${chiave}`,
      className: stili.campo,
      value: bozza[chiave],
      "aria-invalid": errore ? true : undefined,
      "aria-describedby": descritto === "" ? undefined : descritto,
      "data-campo": chiave,
    };
    return (
      <div className={stili.voce}>
        <label htmlFor={`${id}-${chiave}`}>{etichetta}</label>
        {opzioni.area ? (
          <textarea {...comuni} rows={2} onChange={(e) => setBozza({ ...bozza, [chiave]: e.target.value })} />
        ) : (
          <input
            {...comuni}
            ref={chiave === "nome" ? primo : undefined}
            type={opzioni.numero ? "number" : "text"}
            {...(opzioni.numero ? { min: 0, max: 15, step: 1 } : {})}
            {...(chiave === "riempimento" ? { maxLength: 2, size: 3 } : {})}
            onChange={(e) => setBozza({ ...bozza, [chiave]: e.target.value })}
          />
        )}
        {opzioni.aiuto && (
          <span id={`${id}-${chiave}-aiuto`} className={stili.aiuto}>
            {opzioni.aiuto}
          </span>
        )}
        {errore && (
          <span id={`${id}-${chiave}-errore`} className={stili.errore}>
            {testi[errore]}
          </span>
        )}
      </div>
    );
  };
  function invia(e: FormEvent): void {
    e.preventDefault();
    setTentato(true);
    const sbagliato = Object.keys(errori)[0];
    if (sbagliato) modulo.current?.querySelector<HTMLElement>(`[data-campo="${sbagliato}"]`)?.focus();
    else conferma(datiDa(bozza, libreria));
  }
  return (
    <form ref={modulo} className={stili.campi} onSubmit={invia} noValidate>
      {campo("nome", testi.progettoNome)}
      {campo("autore", testi.progettoAutore)}
      {campo("descrizione", testi.progettoDescrizione, { area: true })}
      {campo("note", testi.progettoNote, { area: true })}
      <div className={stili.voce}>
        <label className={stili.opzione}>
          <input type="checkbox" checked={libreria} aria-describedby={`${id}-libreria-aiuto`} onChange={(e) => setLibreria(e.target.checked)} /> {testi.progettoLibreria}
        </label>
        <span id={`${id}-libreria-aiuto`} className={stili.aiuto}>
          {testi.progettoLibreriaAiuto}
        </span>
      </div>
      <fieldset className={stili.gruppo}>
        <legend>{testi.progettoOpzioni}</legend>
        {campo("decimali", testi.progettoDecimali, { numero: true, aiuto: testi.progettoDecimaliAiuto })}
        {campo("riempimento", testi.progettoRiempimento, { aiuto: testi.progettoRiempimentoAiuto })}
      </fieldset>
      <div className={stili.comandi}>
        <button type="submit" className={stili.comando}>
          {nuovo ? testi.progettoCrea : testi.progettoConferma}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </form>
  );
}

export function FinestraProgetto({
  aperta,
  nuovo,
  iniziali,
  testi,
  conferma,
  rinuncia,
}: {
  aperta: boolean;
  /** Da «Nuovo»: il titolo e il comando dicono che si crea un progetto. */
  nuovo: boolean;
  iniziali: DatiDelProgetto;
  testi: Dizionario;
  conferma: (d: DatiDelProgetto) => void;
  rinuncia: () => void;
}): ReactElement {
  const primo = useRef<HTMLInputElement>(null);
  return (
    <Finestra aperta={aperta} titolo={nuovo ? testi.progettoNuovoTitolo : testi.progettoTitolo} rinuncia={rinuncia} iniziale={() => primo.current}>
      <Campi iniziali={iniziali} nuovo={nuovo} testi={testi} conferma={conferma} primo={primo} />
    </Finestra>
  );
}
