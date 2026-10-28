// La finestra di una procedura o di una funzione, in tre modi:
// - NUOVA, dal menu Progetto, dall'elenco e dal «+» delle schede: che cosa fa («compie un lavoro sui dati che riceve
//   (procedura)» o «calcola un risultato dai dati che riceve (funzione)»), il nome e, per una funzione, che cosa
//   restituisce e il valore predefinito; dal pulsante «Funzione» solo una funzione, da «Nuova procedura…» nei campi di un
//   salto solo una procedura (la scelta non c'è);
// - PROPRIETÀ: che cosa fa (cambiare il genere si può: ciò che non va più bene lo segnala il controllo), che cosa
//   restituisce, il valore predefinito;
// - RINOMINA: il nome nuovo (le chiamate lo prendono).
// Che cosa restituisce si scrive coi campi della vista dei dati per un dato di quel tipo: il tipo, la forma (un valore
// solo o un vettore) con gli elementi, e per una stringa la lunghezza massima nelle opzioni avanzate. Un vettore non ha
// valore predefinito: il campo non c'è. Una dimensione o una lunghezza che non è un numero la segnala il controllo, come
// per un dato.
// Il valore predefinito segue il tipo (0, 0.0, ' ', "", false) finché l'utente non lo scrive. Gli errori (il nome vuoto, non
// valido o già usato; il valore predefinito che non è del tipo) li dice chi apre la finestra con le regole del
// controllo; si mostrano sotto il campo dopo il primo tentativo di conferma, o su un campo cambiato, e la conferma con un
// errore mette il fuoco sul campo sbagliato. Invio conferma.
import { useId, useRef, useState, type FormEvent, type ReactElement } from "react";
import { tipi, tipoSemplice, valorePredefinito, type Funzione, type TipoRestituito } from "../../core/progetto/modello";
import type { GenereDiSottoprogramma } from "../../core/modifica/funzioni";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { segnoDellEspressione } from "../chiusura";
import { Finestra, Rinuncia, stili } from "../finestre/Finestra";
import propri from "./Funzioni.module.css";

/** Nuova: dal pulsante «Funzione» solo una funzione; dal menu del «+» col genere già scelto (si può cambiare); da
 * «Nuova procedura…» nei campi di un salto (`salto`, il suo `id`) solo una procedura, che il salto poi chiama. */
export type ModoDellaFinestra =
  | { readonly modo: "nuova"; readonly soloFunzione: boolean; readonly genere?: GenereDiSottoprogramma; readonly salto?: string }
  | { readonly modo: "proprieta" | "rinomina"; readonly funzione: Funzione };

export interface BozzaDellaFunzione {
  readonly genere: GenereDiSottoprogramma;
  readonly nome: string;
  readonly tipo: TipoRestituito;
  /** Restituisce un vettore, coi suoi elementi come li scrive il campo. */
  readonly vettore: boolean;
  readonly dimensione: string;
  /** La lunghezza massima di una stringa restituita; vuota, la predefinita. */
  readonly lunghezza: string;
  readonly predefinito: string;
}

/** Gli errori della bozza, campo per campo, come testi da mostrare. */
export type ErroriDellaFunzione = Partial<Record<"nome" | "predefinito", string>>;

const nomiDeiTipi: Record<TipoRestituito, keyof Dizionario> = { integer: "tipoIntero", real: "tipoReale", character: "tipoCarattere", string: "tipoStringa", boolean: "tipoBooleano" };
function bozzaIniziale(m: ModoDellaFinestra): BozzaDellaFunzione {
  const misure = { vettore: false, dimensione: "", lunghezza: "" };
  if (m.modo === "nuova")
    return { genere: m.salto !== undefined ? "procedure" : m.soloFunzione ? "function" : (m.genere ?? "procedure"), nome: "", tipo: "integer", ...misure, predefinito: valorePredefinito.integer };
  const f = m.funzione;
  const tipo = tipoSemplice(f.return_type ?? "integer");
  return {
    genere: f.kind === "function" ? "function" : "procedure",
    nome: f.name ?? "",
    tipo,
    vettore: f.return_size !== undefined,
    dimensione: f.return_size === undefined ? "" : String(f.return_size),
    lunghezza: f.return_max_length === undefined ? "" : String(f.return_max_length),
    predefinito: f.default_result ?? valorePredefinito[tipo],
  };
}

function Campi({
  modo,
  testi,
  errori,
  conferma,
}: {
  modo: ModoDellaFinestra;
  testi: Dizionario;
  errori: (b: BozzaDellaFunzione) => ErroriDellaFunzione;
  conferma: (b: BozzaDellaFunzione) => void;
}): ReactElement {
  const id = useId();
  const iniziale = bozzaIniziale(modo);
  const [bozza, setBozza] = useState(iniziale);
  // Il valore predefinito scritto dall'utente non segue più il tipo.
  const [predefinitoScritto, setPredefinitoScritto] = useState(modo.modo !== "nuova" && modo.funzione.default_result !== undefined);
  const [tentato, setTentato] = useState(false);
  const modulo = useRef<HTMLFormElement>(null);
  const e = errori(bozza);
  const mostra = (campo: "nome" | "predefinito") => (tentato || bozza[campo] !== iniziale[campo] ? e[campo] : undefined);
  const conNome = modo.modo !== "proprieta";
  const conGenere = modo.modo === "proprieta" || (modo.modo === "nuova" && !modo.soloFunzione && modo.salto === undefined);
  const conTipo = modo.modo !== "rinomina" && bozza.genere === "function";
  const conPredefinito = conTipo && !bozza.vettore;
  // Le opzioni avanzate si aprono da sé se la lunghezza è scritta, poi le apre e le chiude solo l'utente.
  const [avanzate, setAvanzate] = useState(iniziale.lunghezza !== "");

  function invia(ev: FormEvent): void {
    ev.preventDefault();
    setTentato(true);
    const sbagliato = (["nome", "predefinito"] as const).find((c) => e[c] !== undefined && (c === "nome" ? conNome : conPredefinito));
    if (sbagliato) modulo.current?.querySelector<HTMLElement>(`[data-campo="${sbagliato}"]`)?.focus();
    else conferma(bozza);
  }
  /** Il campo di un numero: gli elementi di un vettore, la lunghezza massima di una stringa. */
  const campoDelNumero = (campo: "dimensione" | "lunghezza", etichetta: string) => (
    <div className={stili.voce}>
      <label htmlFor={`${id}-${campo}`}>{etichetta}</label>
      <input
        id={`${id}-${campo}`}
        className={stili.campo}
        data-campo={campo}
        value={bozza[campo]}
        step={1}
        min={1}
        type="number"
        autoComplete="off"
        onChange={(ev) => setBozza({ ...bozza, [campo]: ev.target.value })}
      />
    </div>
  );
  const campoDiTesto = (campo: "nome" | "predefinito", etichetta: string, aiuto?: string) => {
    const errore = mostra(campo);
    const descritto = [aiuto ? `${id}-${campo}-aiuto` : null, errore ? `${id}-${campo}-errore` : null].filter(Boolean).join(" ");
    return (
      <div className={stili.voce}>
        <label htmlFor={`${id}-${campo}`}>{etichetta}</label>
        <input
          id={`${id}-${campo}`}
          className={stili.campo}
          data-campo={campo}
          {...(campo === "predefinito" ? segnoDellEspressione : {})}
          value={bozza[campo]}
          aria-invalid={errore ? true : undefined}
          aria-describedby={descritto === "" ? undefined : descritto}
          spellCheck={false}
          autoComplete="off"
          onChange={(ev) => {
            setBozza({ ...bozza, [campo]: ev.target.value });
            if (campo === "predefinito") setPredefinitoScritto(true);
          }}
        />
        {aiuto && (
          <span id={`${id}-${campo}-aiuto`} className={stili.aiuto}>
            {aiuto}
          </span>
        )}
        {errore && (
          <span id={`${id}-${campo}-errore`} className={stili.errore}>
            {errore}
          </span>
        )}
      </div>
    );
  };

  return (
    <form ref={modulo} className={stili.campi} onSubmit={invia} noValidate>
      {conGenere && (
        <fieldset className={stili.gruppo}>
          <legend>{testi.funzioneCheCosaFa}</legend>
          <div className={propri.scelte}>
            {(["procedure", "function"] as const).map((g) => (
              <label key={g} className={propri.scelta}>
                <input type="radio" name={`${id}-genere`} value={g} checked={bozza.genere === g} data-genere={g} onChange={() => setBozza({ ...bozza, genere: g })} />
                <span>{g === "procedure" ? testi.funzioneLavoro : testi.funzioneRisultato}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {conNome && campoDiTesto("nome", modo.modo === "rinomina" ? testi.funzioneNomeNuovo : testi.funzioneNome, modo.modo === "rinomina" ? testi.funzioneRinominaAiuto : undefined)}
      {conTipo && (
        <div className={stili.voce}>
          <label htmlFor={`${id}-tipo`}>{testi.funzioneRestituisce}</label>
          <select
            id={`${id}-tipo`}
            className={stili.campo}
            data-campo="tipo"
            value={bozza.tipo}
            onChange={(ev) => {
              const tipo = ev.target.value as TipoRestituito;
              setBozza({ ...bozza, tipo, ...(predefinitoScritto ? {} : { predefinito: valorePredefinito[tipo] }) });
            }}
          >
            {tipi.map((t) => (
              <option key={t} value={t}>
                {testi[nomiDeiTipi[t]]}
              </option>
            ))}
          </select>
        </div>
      )}
      {conTipo && (
        <div className={stili.voce}>
          <label htmlFor={`${id}-forma`}>{testi.campoForma}</label>
          <select id={`${id}-forma`} className={stili.campo} data-campo="forma" value={bozza.vettore ? "vettore" : "semplice"} onChange={(ev) => setBozza({ ...bozza, vettore: ev.target.value === "vettore" })}>
            <option value="semplice">{testi.formaSemplice}</option>
            <option value="vettore">{testi.formaVettore}</option>
          </select>
        </div>
      )}
      {conTipo && bozza.vettore && campoDelNumero("dimensione", testi.campoElementi)}
      {conTipo && bozza.tipo === "string" && (
        <details className={propri.avanzate} open={avanzate} onToggle={(ev) => setAvanzate(ev.currentTarget.open)}>
          <summary>{testi.opzioniAvanzate}</summary>
          {campoDelNumero("lunghezza", testi.campoLunghezza)}
        </details>
      )}
      {conPredefinito && campoDiTesto("predefinito", testi.funzionePredefinito, testi.funzionePredefinitoAiuto)}
      <div className={stili.comandi}>
        <button type="submit" className={stili.comando}>
          {modo.modo === "nuova" ? testi.funzioneCrea : modo.modo === "rinomina" ? testi.funzioneRinomina : testi.funzioneConferma}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </form>
  );
}

export function FinestraFunzione({
  modo,
  testi,
  errori,
  conferma,
  rinuncia,
}: {
  /** `null`: la finestra è chiusa. */
  modo: ModoDellaFinestra | null;
  testi: Dizionario;
  errori: (b: BozzaDellaFunzione) => ErroriDellaFunzione;
  conferma: (b: BozzaDellaFunzione) => void;
  rinuncia: () => void;
}): ReactElement {
  const titolo =
    modo === null
      ? ""
      : modo.modo === "nuova"
        ? modo.salto !== undefined
          ? testi.funzioneNuovaProceduraTitolo
          : modo.soloFunzione
            ? testi.funzioneNuovaSoloTitolo
            : testi.funzioneNuovaTitolo
        : riempi(modo.modo === "rinomina" ? testi.funzioneRinominaTitolo : testi.funzioneProprietaTitolo, { nome: modo.funzione.name ?? "" });
  return (
    <Finestra aperta={modo !== null} titolo={titolo} rinuncia={rinuncia} iniziale={() => document.querySelector<HTMLElement>('[role="dialog"] [data-campo="nome"]')}>
      {modo && <Campi modo={modo} testi={testi} errori={errori} conferma={conferma} />}
    </Finestra>
  );
}
