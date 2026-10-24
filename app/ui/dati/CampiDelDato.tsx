// I campi di un dato, gli stessi nei due modi della vista dei dati: nella SCHEDA sotto la riga, ognuno con
// la sua etichetta; nelle CELLE della riga, col nome della colonna e il numero della riga come nome
// accessibile. Sono controlli nativi (testo, scelte, numeri): il Tab li raggiunge nei due motori, WebKit
// compreso (misurato).
//
// Qui solo funzioni che restituiscono elementi, e un componente a livello di modulo: il testo dei campi
// sta in chi li monta. Un componente definito dentro un altro sarebbe ricreato a ogni tasto, e il campo
// perderebbe il fuoco.
//
// La natura offre le scelte che chi monta i campi dà (un parametro solo in una procedura o in una funzione), più quella
// del dato se non c'è fra loro (un file scritto a mano: la si vede, e il controllo dice l'errore). Una costante ha accanto
// la casella «globale»; un parametro non ha i campi del valore iniziale né del ruolo.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { ruoli, tipi, type Ruolo, type Tipo } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import type { SegnalazioneMostrata } from "../disegno/EditorDelBlocco";
import stiliDeiCampi from "../disegno/EditorDelBlocco.module.css";
import { segnoDellElenco, segnoDellEspressione } from "../chiusura";
import { useConfermaFuori } from "../fuori";
import { Spiegazione } from "../Spiegazione";
import { conNatura, conRipetuto, naturaDi, type BozzaDelDato, type Natura } from "./bozza";
import stili from "./VistaDati.module.css";

const nomiDeiTipi: Record<Tipo, keyof Dizionario> = {
  integer: "tipoIntero",
  real: "tipoReale",
  character: "tipoCarattere",
  string: "tipoStringa",
  boolean: "tipoBooleano",
};
const nomiDeiRuoli: Record<Ruolo, keyof Dizionario> = { input: "ruoloInput", output: "ruoloOutput", input_output: "ruoloInputOutput" };
export const nomiDelleNature: Record<Natura, keyof Dizionario> = {
  variabile: "naturaVariabile",
  costante: "naturaCostante",
  value: "naturaParametroValore",
  reference: "naturaParametroRiferimento",
  out: "naturaParametroUscita",
};

/** I campi di una bozza, uno per attributo; quelli che la forma o il tipo non hanno valgono `null`. */
export interface Campi {
  nome: ReactElement;
  tipo: ReactElement;
  forma: ReactElement;
  elementi: ReactElement | null;
  natura: ReactElement;
  /** La casella «globale», solo per una costante. */
  globale: ReactElement | null;
  /** Il valore iniziale e il ruolo: per un parametro valgono `null`. */
  iniziale: ReactElement | null;
  inizialeVettore: ReactElement | null;
  ruolo: ReactElement | null;
  lunghezza: ReactElement | null;
}

/**
 * I campi della bozza. `nome(campo)` dà il nome accessibile di un campo: nella scheda è l'etichetta
 * stessa, nelle celle porta anche la riga. `nature` sono le scelte della natura.
 */
export function campiDelDato(b: BozzaDelDato, cambia: (b: BozzaDelDato) => void, testi: Dizionario, nome: (campo: string) => string, nature: readonly Natura[]): Campi {
  const testo = (campo: string, valore: string, scrivi: (v: string) => void, codice = false, numero = false, segno?: string, espressione?: "espressione" | "elenco") => (
    <input
      data-campo={segno}
      {...(espressione === "elenco" ? segnoDellElenco : espressione ? segnoDellEspressione : {})}
      aria-label={nome(campo)}
      className={codice ? `${stili.campo} ${stili.codice}` : stili.campo}
      type={numero ? "number" : "text"}
      {...(numero ? { min: 1, step: 1 } : {})}
      spellCheck={false}
      autoComplete="off"
      value={valore}
      onChange={(e) => scrivi(e.currentTarget.value)}
    />
  );
  const scelta = <T extends string>(campo: string, valore: T, voci: readonly (readonly [T, string])[], scegli: (v: T) => void) => (
    <select aria-label={nome(campo)} className={stili.campo} value={valore} onChange={(e) => scegli(e.currentTarget.value as T)}>
      {voci.map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
    </select>
  );
  const parametro = b.parametro !== "";
  return {
    nome: testo(testi.datiNome, b.nome, (v) => cambia({ ...b, nome: v }), true),
    tipo: scelta(
      testi.datiTipo,
      b.tipo,
      tipi.map((t) => [t, testi[nomiDeiTipi[t]]] as const),
      (v) => cambia({ ...b, tipo: v }),
    ),
    forma: scelta(
      testi.campoForma,
      b.vettore ? "vettore" : "semplice",
      [
        ["semplice", testi.formaSemplice],
        ["vettore", testi.formaVettore],
      ],
      (v) => cambia({ ...b, vettore: v === "vettore" }),
    ),
    elementi: b.vettore ? testo(testi.campoElementi, b.dimensione, (v) => cambia({ ...b, dimensione: v }), false, true) : null,
    natura: scelta(
      testi.datiNatura,
      naturaDi(b),
      (nature.includes(naturaDi(b)) ? nature : [...nature, naturaDi(b)]).map((n) => [n, testi[nomiDelleNature[n]]] as const),
      (v) => cambia(conNatura(b, v)),
    ),
    globale: b.costante && !parametro ? (
      <label className={stili.casella} title={testi.aiutoGlobale}>
        <input type="checkbox" data-campo="globale" aria-label={nome(testi.campoGlobale)} checked={b.globale} onChange={(e) => cambia({ ...b, globale: e.currentTarget.checked })} />
        <span aria-hidden="true">{testi.campoGlobale}</span>
      </label>
    ) : null,
    // Il segno lo cerca il comando che apre il valore iniziale di un dato dall'avviso della riga di stato.
    iniziale: parametro ? null : testo(testi.datiIniziale, b.iniziale, (v) => cambia({ ...b, iniziale: v }), true, false, "iniziale", b.vettore && !b.ripetuto ? "elenco" : "espressione"),
    inizialeVettore: b.vettore && !parametro
      ? scelta(
          testi.campoInizialeVettore,
          b.ripetuto ? "ripetuto" : "elenco",
          [
            ["elenco", testi.inizialeElenco],
            ["ripetuto", testi.inizialeRipetuto],
          ],
          (v) => cambia(conRipetuto(b, v === "ripetuto")),
        )
      : null,
    // Una costante non ha un ruolo, come un parametro: l'unica scelta valida sarebbe «di lavoro». La scelta resta solo se
    // la costante un ruolo ce l'ha (l'errore del dato), per poterlo togliere.
    ruolo: parametro || (b.costante && b.ruolo === "")
      ? null
      : scelta<Ruolo | "">(
          testi.datiRuolo,
          b.ruolo,
          [["", testi.ruoloDiLavoro], ...ruoli.map((r) => [r, testi[nomiDeiRuoli[r]]] as const)],
          (v) => cambia({ ...b, ruolo: v }),
        ),
    lunghezza: b.tipo === "string" ? testo(testi.campoLunghezza, b.lunghezza, (v) => cambia({ ...b, lunghezza: v }), false, true) : null,
  };
}

/** Gli errori e gli avvisi di un dato, sotto i suoi campi. */
export function Segnalazioni({ segnalazioni, testi }: { segnalazioni: readonly SegnalazioneMostrata[]; testi: Dizionario }): ReactElement {
  return (
    <ul className={stili.segnalazioni} aria-label={testi.segnalazioniDelDato} aria-live="polite">
      {segnalazioni.map((s, i) => (
        <li key={`${s.codice}-${i}`} className={s.genere === "errore" ? stili.errore : stili.avviso}>
          <Spiegazione s={s} testi={testi} />
        </li>
      ))}
    </ul>
  );
}

const etichettato = (etichetta: string, campo: ReactNode) => (
  <label className={stili.voce}>
    <span className={stili.etichetta}>{etichetta}</span>
    {campo}
  </label>
);

/**
 * La scheda sotto la riga: i campi con le etichette, le opzioni avanzate chiuse, gli errori del dato nel
 * progetto candidato, i comandi. Invio conferma, Esc annulla; un clic fuori dalla scheda, o il fuoco che ne
 * esce con la tastiera, la conferma, come i campi di un blocco. Il fuoco va nel primo campo all'apertura, o in
 * quello di `primo`. Il «?» mostra, a richiesta, che cosa scrivere nei campi.
 */
export function SchedaDelDato({
  nome,
  bozza,
  cambia,
  conferma,
  rinuncia,
  elimina,
  segnalazioni,
  testi,
  primo,
  nature,
}: {
  /** Il nome del dato com'è prima della modifica. */
  nome: string;
  nature: readonly Natura[];
  bozza: BozzaDelDato;
  /** Il campo che riceve il fuoco all'apertura, se non è il primo (il comando che apre il valore iniziale). */
  primo?: "iniziale";
  cambia: (b: BozzaDelDato) => void;
  /** `torna` dice se il fuoco torna sulla riga (no dopo un clic altrove). */
  conferma: (torna: boolean) => void;
  rinuncia: () => void;
  elimina: () => void;
  segnalazioni: readonly SegnalazioneMostrata[];
  testi: Dizionario;
}): ReactElement {
  const modulo = useRef<HTMLFormElement>(null);
  useConfermaFuori(modulo, conferma);
  const [conGuida, setConGuida] = useState(false);
  // Le opzioni avanzate si aprono da sé se il dato ne ha una, poi le apre e le chiude solo l'utente: svuotare un campo
  // mentre si scrive non le richiude.
  const [avanzate, setAvanzate] = useState(bozza.lunghezza !== "");
  useEffect(() => {
    modulo.current?.querySelector<HTMLElement>(primo ? `[data-campo="${primo}"]` : "input")?.focus();
  }, []);

  function tasto(e: KeyboardEvent): void {
    if (e.key === "Escape") rinuncia();
    // Invio su un comando o sul titolo delle opzioni avanzate fa il suo lavoro, non conferma.
    else if (e.key === "Enter" && !["BUTTON", "SUMMARY"].includes((e.target as Element).tagName)) conferma(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  const c = campiDelDato(bozza, cambia, testi, (campo) => campo, nature);
  return (
    <form
      ref={modulo}
      aria-label={riempi(testi.modificaDelDato, { nome: nome || testi.datoSenzaNome })}
      className={stili.scheda}
      onKeyDown={tasto}
      onSubmit={(e) => {
        e.preventDefault();
        conferma(true);
      }}
    >
      <div className={stili.campi}>
        {etichettato(testi.datiNome, c.nome)}
        {etichettato(testi.datiTipo, c.tipo)}
        {etichettato(testi.campoForma, c.forma)}
        {c.elementi && etichettato(testi.campoElementi, c.elementi)}
        {etichettato(testi.datiNatura, c.natura)}
        {c.globale}
        {c.iniziale && etichettato(testi.datiIniziale, c.iniziale)}
        {c.inizialeVettore && etichettato(testi.campoInizialeVettore, c.inizialeVettore)}
        {c.ruolo && etichettato(testi.datiRuolo, c.ruolo)}
      </div>
      {c.lunghezza && (
        <details className={stili.avanzate} open={avanzate} onToggle={(e) => setAvanzate(e.currentTarget.open)}>
          <summary>{testi.opzioniAvanzate}</summary>
          {etichettato(testi.campoLunghezza, c.lunghezza)}
        </details>
      )}
      {conGuida && (
        <p className={stiliDeiCampi.guida} data-guida>
          {testi.guidaDato}
        </p>
      )}
      <Segnalazioni segnalazioni={segnalazioni} testi={testi} />
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} onClick={elimina}>
          {testi.eliminaDato}
        </button>
        <button
          type="button"
          className={stiliDeiCampi.aiuto}
          aria-label={testi.suggerimenti}
          title={testi.suggerimenti}
          aria-expanded={conGuida}
          onClick={() => setConGuida((g) => !g)}
        >
          ?
        </button>
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
