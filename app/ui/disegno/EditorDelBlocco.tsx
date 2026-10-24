// I campi di un blocco, in uno dei due modi: un riquadro attaccato al blocco (il predefinito) o un pannello
// fisso a destra. Il contenuto è lo stesso, cambia solo dove sta. Invio conferma (un passo della
// cronologia), Esc annulla (nessun passo); mentre si scrive, sotto i campi compaiono gli errori e gli avvisi
// del blocco, che chi monta l'editor ricava da `controlla` sul progetto candidato.
//
// Il componente è definito qui, a livello di modulo, e il testo dei campi sta in chi lo monta: definito
// dentro un altro componente, React lo ricreerebbe a ogni tasto e il campo perderebbe il fuoco.
//
// Il riquadro sta fuori dal flowchart (un elemento HTML sopra la pagina): i tasti dei campi non arrivano
// ai tasti del flowchart, dove Spazio comincia uno spostamento.
//
// Un clic fuori dai campi, o il fuoco che ne esce con la tastiera, li conferma, come lasciare una cella di un
// foglio di calcolo: un doppio clic su un altro blocco non perde il testo scritto, e un comando raggiunto col
// Tab trova i campi già confermati. Se i campi sono quelli di prima, nessun passo.
//
// I campi di una Lettura con la domanda (un'opzione dell'app): sopra la destinazione, i valori della domanda come quelli
// di una Scrittura, ognuno con la sua «×», «Aggiungi una domanda» e «Va a capo»; confermati, scrivono la Scrittura che la
// precede (chi monta i campi ne fa un passo solo).
//
// I campi di un salto: l'elenco a scelta delle procedure del progetto, con in fondo «Nuova procedura…» (la crea chi monta
// i campi), e un campo per parametro della procedura scelta, col nome e com'è ricevuto; un argomento oltre la firma (un
// parametro tolto dopo) resta in un campo suo, con la × per toglierlo. Un'altra procedura scelta parte con gli argomenti
// vuoti; riscegliendo quella di prima tornano i suoi.
//
// La cornice (`CampiNelRiquadro`: dove sta, i tasti, gli errori, i comandi) è la stessa per i campi del blocco del
// valore iniziale di un dato (`EditorDelValore.tsx`). Il «?» accanto ai comandi mostra, a richiesta, che cosa scrivere
// nei campi di quel genere di blocco; gli errori di un blocco appena inserito li tace chi monta i campi.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import type { Blocco, GenereDiBlocco } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { segnoDellEspressione } from "../chiusura";
import { useConfermaFuori } from "../fuori";
import { Spiegazione } from "../Spiegazione";
import type { BozzaDelBlocco } from "./campi";
import stili from "./EditorDelBlocco.module.css";

export type ModoDellEditor = "riquadro" | "pannello";

/** Un errore o un avviso del blocco, coi testi già nella lingua dell'interfaccia. */
export interface SegnalazioneMostrata {
  readonly genere: "errore" | "avviso";
  readonly codice: string;
  readonly breve: string;
  readonly accaduto: string;
  readonly suggerimento: string;
}

/** Lo spazio fra il blocco e il riquadro. */
const DISTANZA = 8;
/** Lo spazio fra il riquadro e il bordo in basso della finestra, quando il riquadro è alto fin lì. */
const MARGINE_IN_BASSO = 8;

/** Ciò che i campi di un blocco e quelli del valore iniziale di un dato hanno in comune: dove stanno, i tasti, gli
 * errori del candidato e i comandi. */
export interface CorniceDeiCampi {
  /** Il nome del blocco com'è prima della modifica. */
  nome: string;
  /** Conferma i campi; `torna` dice se il fuoco torna sul blocco (no dopo un clic altrove). */
  conferma: (torna: boolean) => void;
  rinuncia: () => void;
  segnalazioni: readonly SegnalazioneMostrata[];
  testi: Dizionario;
  modo: ModoDellEditor;
  /** Il blocco nel disegno, a cui si attacca il riquadro (nel pannello non serve). Si cerca dopo il disegno:
   * durante, il blocco appena inserito non è ancora nel documento, e il riquadro restava in (0, 0). */
  aggancio: () => Element | null;
  /** Che cosa scrivere nei campi, mostrato col «?»; senza, il «?» non c'è. */
  guida?: string | undefined;
}

/** Che cosa scrivere nei campi di ogni genere di blocco (un commento non ha regole). */
const guide: Record<GenereDiBlocco, keyof Dizionario | null> = {
  assignment: "guidaAssegnazione",
  read: "guidaLettura",
  write: "guidaScrittura",
  if: "guidaSe",
  while: "guidaCiclo",
  repeat: "guidaCiclo",
  for: "guidaPer",
  for_each: "guidaPerOgni",
  call: "guidaSalto",
  comment: null,
};

/** Un parametro della procedura scelta in un salto: il nome e se lo riceve per riferimento o per uscita. */
export interface ParametroDelSalto {
  readonly nome: string;
  readonly rif: boolean;
  readonly uscita: boolean;
}

/** Ciò che i campi di un salto sanno del progetto: le procedure da scegliere (in ordine), la firma di quella scelta,
 * letta dalla procedura e non copiata (spostare o togliere un parametro la cambia), e «Nuova procedura…». */
export interface ProcedureDelSalto {
  readonly nomi: readonly string[];
  /** I parametri della procedura con quel nome, nell'ordine della firma; `undefined` se non c'è. */
  readonly parametri: (nome: string) => readonly ParametroDelSalto[] | undefined;
  readonly nuova: () => void;
}

/** Il valore della voce «Nuova procedura…» nell'elenco: un «+» non sta in un nome. */
const NUOVA = "+nuova";

export function EditorDelBlocco({
  blocco,
  bozza,
  cambia,
  procedure,
  ...cornice
}: CorniceDeiCampi & {
  blocco: Blocco;
  bozza: BozzaDelBlocco;
  cambia: (b: BozzaDelBlocco) => void;
  /** Per un salto. */
  procedure?: ProcedureDelSalto | undefined;
}): ReactElement {
  const { testi } = cornice;
  const campo = (etichetta: string, valore: string, scrivi: (v: string) => void, chiave: string, segnaposto?: string) => (
    <label key={chiave} className={stili.campo}>
      <span className={stili.etichetta}>{etichetta}</span>
      {/* Il testo di un commento non è un'espressione: le sue parentesi non si chiudono da sé. */}
      <input
        className={stili.testo}
        type="text"
        spellCheck={false}
        autoComplete="off"
        {...(chiave === "text" ? {} : segnoDellEspressione)}
        value={valore}
        placeholder={segnaposto}
        onChange={(e) => scrivi(e.currentTarget.value)}
      />
    </label>
  );

  const valori = bozza.values ?? [];
  const cambiaValore = (i: number, v: string) => cambia({ ...bozza, values: valori.map((x, j) => (j === i ? v : x)) });

  // Il salto: la procedura scelta e un campo per parametro della sua firma; gli argomenti in più (la firma cambiata dopo)
  // restano, segnati, finché l'utente non li toglie.
  const chiamata = bozza.callee ?? "";
  const argomenti = bozza.arguments ?? [];
  const parametri = procedure?.parametri(chiamata) ?? [];
  const cambiaArgomento = (i: number, v: string) =>
    cambia({ ...bozza, arguments: Array.from({ length: Math.max(argomenti.length, i + 1) }, (_, j) => (j === i ? v : (argomenti[j] ?? ""))) });
  // Cambiando la procedura gli argomenti ripartono vuoti; quelli scritti per ogni procedura scelta finché i campi sono aperti
  // si ricordano, e tornano riscegliendola (anche quelli che il salto aveva prima). Dopo la conferma, Annulla.
  const scritti = useRef(new Map<string, readonly string[]>());
  const scegliProcedura = (v: string) => {
    scritti.current.set(chiamata, argomenti);
    cambia({ ...bozza, callee: v, arguments: scritti.current.get(v) ?? [] });
  };
  const salto = blocco.kind === "call" && procedure !== undefined && (
    <>
      <label className={stili.campo}>
        <span className={stili.etichetta}>{testi.campoProcedura}</span>
        <select
          className={stili.testo}
          data-campo-procedura=""
          value={chiamata}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === NUOVA) procedure.nuova();
            else scegliProcedura(v);
          }}
        >
          {chiamata === "" && (
            <option value="" disabled>
              {testi.saltoScegli}
            </option>
          )}
          {procedure.nomi.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          {chiamata !== "" && !procedure.nomi.includes(chiamata) && <option value={chiamata}>{riempi(testi.saltoNonCe, { nome: chiamata })}</option>}
          <option value={NUOVA}>{testi.nuovaProcedura}</option>
        </select>
      </label>
      {chiamata !== "" && parametri.length === 0 && argomenti.length === 0 && <p className={stili.nota}>{testi.saltoSenzaParametri}</p>}
      {Array.from({ length: Math.max(parametri.length, argomenti.length) }, (_, i) => {
        const p = parametri[i];
        const n = String(i + 1);
        const modo = p?.rif ? testi.campoParametroRiferimento : p?.uscita ? testi.campoParametroUscita : testi.campoParametroValore;
        const etichetta = p ? riempi(modo, { nome: p.nome }) : riempi(testi.campoArgomentoInPiu, { n });
        return (
          <div key={`a${i}`} className={stili.riga} data-argomento={i}>
            {campo(etichetta, argomenti[i] ?? "", (v) => cambiaArgomento(i, v), `a${i}`)}
            {!p && (
              <button
                type="button"
                className={stili.togli}
                aria-label={riempi(testi.togliArgomento, { n })}
                title={riempi(testi.togliArgomento, { n })}
                onClick={() => cambia({ ...bozza, arguments: argomenti.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </>
  );

  // La domanda di una Lettura (con l'opzione): sopra la destinazione, un campo per valore col suo «×», «Aggiungi una
  // domanda» e «Va a capo», spento senza domanda.
  const domanda = bozza.domanda ?? [];
  const cambiaDomanda = (i: number, v: string) => cambia({ ...bozza, domanda: domanda.map((x, j) => (j === i ? v : x)) });
  const campiDellaDomanda = blocco.kind === "read" && bozza.domanda !== undefined && (
    <>
      {domanda.map((v, i) => (
        <div key={`d${i}`} className={stili.riga} data-domanda={i}>
          {campo(riempi(testi.campoDomandaN, { n: String(i + 1) }), v, (x) => cambiaDomanda(i, x), `d${i}`)}
          <button
            type="button"
            className={stili.togli}
            aria-label={riempi(testi.togliDomanda, { n: String(i + 1) })}
            title={riempi(testi.togliDomanda, { n: String(i + 1) })}
            onClick={() => cambia({ ...bozza, domanda: domanda.filter((_, j) => j !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <div className={stili.riga}>
        <button type="button" className={stili.comando} onClick={() => cambia({ ...bozza, domanda: [...domanda, ""] })}>
          {testi.aggiungiDomanda}
        </button>
        <label className={stili.casella}>
          <input
            type="checkbox"
            data-domanda-a-capo=""
            checked={domanda.length > 0 && bozza.domandaACapo === true}
            disabled={domanda.length === 0}
            onChange={(e) => cambia({ ...bozza, domandaACapo: e.currentTarget.checked })}
          />
          {testi.campoACapo}
        </label>
      </div>
    </>
  );

  return (
    <CampiNelRiquadro
      chiave={blocco.id}
      guida={blocco.kind === "read" && bozza.domanda !== undefined ? testi.guidaLetturaConDomanda : guide[blocco.kind] === null ? undefined : testi[guide[blocco.kind]!]}
      {...cornice}
    >
      {salto}
      {campiDellaDomanda}
      {bozza.target !== undefined && campo(testi.campoDestinazione, bozza.target, (v) => cambia({ ...bozza, target: v }), "target")}
      {bozza.value !== undefined && campo(testi.campoValore, bozza.value, (v) => cambia({ ...bozza, value: v }), "value")}
      {bozza.condition !== undefined && campo(testi.campoCondizione, bozza.condition, (v) => cambia({ ...bozza, condition: v }), "condition")}
      {bozza.text !== undefined && campo(testi.campoTesto, bozza.text, (v) => cambia({ ...bozza, text: v }), "text")}
      {bozza.counter !== undefined && campo(testi.campoContatore, bozza.counter, (v) => cambia({ ...bozza, counter: v }), "counter")}
      {bozza.from !== undefined && campo(testi.campoDa, bozza.from, (v) => cambia({ ...bozza, from: v }), "from")}
      {bozza.to !== undefined && campo(testi.campoA, bozza.to, (v) => cambia({ ...bozza, to: v }), "to")}
      {/* Il passo vuoto è il passo 1, che non si scrive: il segnaposto lo mostra. */}
      {bozza.step !== undefined && campo(testi.campoPasso, bozza.step, (v) => cambia({ ...bozza, step: v }), "step", "1")}
      {bozza.item !== undefined && campo(testi.campoElemento, bozza.item, (v) => cambia({ ...bozza, item: v }), "item")}
      {bozza.source !== undefined && campo(testi.campoSorgente, bozza.source, (v) => cambia({ ...bozza, source: v }), "source")}
      {blocco.kind === "write" && (
        <>
          {valori.map((v, i) => (
            <div key={i} className={stili.riga}>
              {campo(riempi(testi.campoValoreN, { n: String(i + 1) }), v, (x) => cambiaValore(i, x), `v${i}`)}
              {valori.length > 1 && (
                <button
                  type="button"
                  className={stili.togli}
                  aria-label={riempi(testi.togliValore, { n: String(i + 1) })}
                  title={riempi(testi.togliValore, { n: String(i + 1) })}
                  onClick={() => cambia({ ...bozza, values: valori.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className={stili.riga}>
            <button type="button" className={stili.comando} onClick={() => cambia({ ...bozza, values: [...valori, ""] })}>
              {testi.aggiungiValore}
            </button>
            <label className={stili.casella}>
              <input type="checkbox" checked={bozza.newline ?? false} onChange={(e) => cambia({ ...bozza, newline: e.currentTarget.checked })} />
              {testi.campoACapo}
            </label>
          </div>
        </>
      )}
    </CampiNelRiquadro>
  );
}

/** Il campo della fine di una funzione: ciò che restituisce, un'espressione, nella stessa cornice dei campi di un blocco
 * (`chiave`: l'`id` del blocco di fine). */
export function EditorDellaFine({
  chiave,
  valore,
  cambia,
  ...cornice
}: CorniceDeiCampi & { chiave: string; valore: string; cambia: (v: string) => void }): ReactElement {
  const { testi } = cornice;
  return (
    <CampiNelRiquadro chiave={chiave} guida={testi.guidaRestituisce} {...cornice}>
      <label className={stili.campo}>
        <span className={stili.etichetta}>{testi.campoRestituisce}</span>
        <input className={stili.testo} type="text" spellCheck={false} autoComplete="off" {...segnoDellEspressione} value={valore} onChange={(e) => cambia(e.currentTarget.value)} />
      </label>
    </CampiNelRiquadro>
  );
}

/** La cornice dei campi: il modulo, attaccato al blocco con quella `chiave` o nel pannello, coi campi dati. */
export function CampiNelRiquadro({
  chiave,
  nome,
  conferma,
  rinuncia,
  segnalazioni,
  testi,
  modo,
  aggancio,
  guida,
  children,
}: CorniceDeiCampi & { chiave: string; children: ReactNode }): ReactElement {
  const modulo = useRef<HTMLFormElement>(null);
  useConfermaFuori(modulo, conferma);
  // Il blocco di cui si vedono i suggerimenti (aperti col «?»).
  const [conGuida, setConGuida] = useState<string | null>(null);
  const [posizione, setPosizione] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const agganciaOra = useRef(aggancio);
  agganciaOra.current = aggancio;

  // Il riquadro sotto il blocco; se sotto non c'è posto, sopra; mai oltre i bordi della finestra. Segue
  // il blocco quando il flowchart scorre. Alto al più fino al bordo in basso: quando cresce (i suggerimenti del «?»,
  // gli errori mentre si scrive) scorre dentro, e i comandi restano raggiungibili.
  useLayoutEffect(() => {
    if (modo !== "riquadro") return;
    const metti = () => {
      const blocco = agganciaOra.current();
      if (!blocco || !modulo.current) return setPosizione({ left: 0, top: 0, maxHeight: innerHeight });
      const r = blocco.getBoundingClientRect();
      const { offsetWidth: w, offsetHeight: h } = modulo.current;
      const sotto = r.bottom + DISTANZA;
      const top = sotto + h <= innerHeight ? sotto : Math.max(0, r.top - DISTANZA - h);
      setPosizione({ left: Math.max(Math.min(r.left, innerWidth - w), 0), top, maxHeight: Math.max(innerHeight - top - MARGINE_IN_BASSO, 0) });
    };
    metti();
    document.addEventListener("scroll", metti, true);
    return () => document.removeEventListener("scroll", metti, true);
  }, [modo, chiave]);

  // Il fuoco nel primo campo quando i campi si vedono (un elemento nascosto non lo prende).
  const visibile = modo === "pannello" || posizione !== null;
  useEffect(() => {
    if (visibile) modulo.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, [visibile]);

  function tasto(e: KeyboardEvent): void {
    if (e.key === "Escape") rinuncia();
    else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) conferma(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <form
      ref={modulo}
      aria-label={riempi(testi.modificaDelBlocco, { blocco: nome })}
      className={modo === "riquadro" ? `${stili.editor} ${stili.riquadro}` : `${stili.editor} ${stili.pannello}`}
      style={modo === "riquadro" ? (posizione ?? { left: 0, top: 0, visibility: "hidden" }) : undefined}
      onKeyDown={tasto}
      onSubmit={(e) => {
        e.preventDefault();
        conferma(true);
      }}
    >
      {children}
      {guida !== undefined && conGuida === chiave && (
        <p className={stili.guida} data-guida>
          {guida}
        </p>
      )}
      <ul className={stili.segnalazioni} aria-label={testi.segnalazioniDelBlocco} aria-live="polite">
        {segnalazioni.map((s, i) => (
          <li key={`${s.codice}-${i}`} className={s.genere === "errore" ? stili.errore : stili.avviso}>
            <Spiegazione s={s} testi={testi} />
          </li>
        ))}
      </ul>
      <div className={stili.comandi}>
        {guida !== undefined && (
          <button
            type="button"
            className={stili.aiuto}
            aria-label={testi.suggerimenti}
            title={testi.suggerimenti}
            aria-expanded={conGuida === chiave}
            onClick={() => setConGuida((g) => (g === chiave ? null : chiave))}
          >
            ?
          </button>
        )}
        <button type="submit" className={stili.comando}>
          {testi.conferma}
        </button>
        <button type="button" className={stili.comando} onClick={rinuncia}>
          {testi.rinuncia}
        </button>
      </div>
    </form>
  );
}
