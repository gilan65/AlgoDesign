// I campi di un caso d'uso, sotto la sua riga (come la scheda di un dato): nome, descrizione, le voci (il dato e il
// testo, in ordine: quello che il programma legge dalla console), l'output atteso. L'errore e gli avvisi attesi si
// leggono soltanto. Invio conferma (non nell'output atteso, dove va a capo), Esc rinuncia; un clic fuori, o il fuoco
// che esce con la tastiera, conferma. Una voce destinata a un dato che non c'è (tolto, o rinominato fuori dalle voci)
// resta com'è, segnata: la scelta mostra il suo nome e sotto i campi si dice che cosa fare. Dopo i dati della radice, la
// scelta offre in un gruppo per procedura i dati di lavoro delle procedure chiamate che una lettura riceve. Nei casi di
// una procedura o di una funzione la voce di un parametro per riferimento ha la casella «senza valore», quella di un
// vettore «in ogni elemento»; cambiando il dato della voce restano se il dato nuovo le ammette.
import { useEffect, useRef, type KeyboardEvent, type ReactElement } from "react";
import type { CasoDiUnaFunzione, Segnalazione } from "../../core/progetto/modello";
import type { testiDeiCodici } from "../../i18n/codici";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import stiliDati from "../dati/VistaDati.module.css";
import { useConfermaFuori } from "../fuori";
import { conIlDato, type BozzaDelCaso } from "./bozza";
import stili from "./VistaCasi.module.css";

type Codici = (typeof testiDeiCodici)["it"];

/** Le voci della bozza che vanno a un dato che non c'è: la posizione (da 1) e il dato. */
export const vociSenzaDato = (b: BozzaDelCaso, esistenti: ReadonlySet<string>) =>
  b.voci.flatMap((v, i) => (esistenti.has(v.dato) ? [] : [{ n: i + 1, dato: v.dato }]));

export function CampiDelCaso({
  nome,
  caso,
  bozza,
  scelte,
  dalleProcedureChiamate = [],
  esistenti,
  cambia,
  conferma,
  rinuncia,
  elimina,
  segnalazioni,
  testi,
  codici,
  nomeDi,
  parametri,
  selezionaIlNome = false,
}: {
  /** Il nome del caso com'è prima della modifica. */
  nome: string;
  /** Il nome, dove va il fuoco all'apertura, è anche selezionato: scrivendo lo si sostituisce (il caso salvato da
   * un'esecuzione, che aspetta solo il nome). */
  selezionaIlNome?: boolean;
  /** Il caso com'è: l'errore e gli avvisi attesi. */
  caso: CasoDiUnaFunzione;
  bozza: BozzaDelCaso;
  /** I dati a cui una voce nuova può andare, nell'ordine della scelta. */
  scelte: readonly string[];
  /** I dati di lavoro delle procedure chiamate che una lettura riceve (`datiLettiAltrove`): un gruppo per procedura, dopo
   * le scelte. */
  dalleProcedureChiamate?: readonly { readonly nome: string; readonly dati: readonly string[] }[];
  /** I nomi a cui una voce può andare (anche quelli delle procedure chiamate): una voce destinata a un altro nome è
   * segnata. */
  esistenti: ReadonlySet<string>;
  cambia: (b: BozzaDelCaso) => void;
  conferma: (torna: boolean) => void;
  rinuncia: () => void;
  elimina: () => void;
  /** Perché il caso scritto non si può confermare (dal nucleo), già nella lingua. */
  segnalazioni: readonly string[];
  testi: Dizionario;
  codici: Codici;
  nomeDi: (blocco: string) => string;
  /** I parametri di una procedura o di una funzione, per nome: una voce di un parametro per riferimento può non avere un
   * valore, una di un vettore valere per ogni elemento. Senza, i casi del programma principale. */
  parametri?: ReadonlyMap<string, { readonly rif: boolean; readonly vettore: boolean; readonly uscita?: boolean }> | undefined;
}): ReactElement {
  const modulo = useRef<HTMLFormElement>(null);
  useConfermaFuori(modulo, conferma);
  useEffect(() => {
    const campo = modulo.current?.querySelector<HTMLInputElement>("input");
    campo?.focus();
    if (selezionaIlNome) campo?.select();
  }, []);

  function tasto(e: KeyboardEvent): void {
    if (e.key === "Escape") rinuncia();
    // Invio su un comando fa il suo lavoro; nell'output atteso va a capo.
    else if (e.key === "Enter" && !["BUTTON", "TEXTAREA"].includes((e.target as Element).tagName)) conferma(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  const voci = bozza.voci;
  // Un nome che la radice ha già è del suo dato: nel gruppo di una procedura non torna.
  const altrove = dalleProcedureChiamate.map((g) => ({ nome: g.nome, dati: g.dati.filter((d) => !scelte.includes(d)) })).filter((g) => g.dati.length > 0);
  const dalleProcedure = new Set(altrove.flatMap((g) => g.dati));
  const conVoci = (nuove: BozzaDelCaso["voci"]) => cambia({ ...bozza, voci: nuove });
  const scambia = (i: number, j: number) => conVoci(voci.map((v, k) => (k === i ? voci[j]! : k === j ? voci[i]! : v)));
  const senzaDato = vociSenzaDato(bozza, esistenti);
  const segnalazione = (s: Segnalazione<string>) => riempi(testi.diffSegnalazione, { breve: codici[s.code as keyof Codici].breve, dove: nomeDi(s.block) });
  const atteso = caso.expected;
  const problemi = [...senzaDato.map((v) => riempi(testi.casoDatoMancanteSpiegazione, { n: String(v.n), dato: v.dato })), ...segnalazioni];
  /** Se la voce è la prima col nome del suo dato: per un parametro, quella che gli dà il valore. */
  const primaDel = (i: number) => voci.findIndex((x) => x.dato === voci[i]?.dato) === i;
  /** La casella di una voce di un parametro: senza valore, o in ogni elemento. */
  const casella = (i: number, chiave: "senzaValore" | "ognuno", etichetta: string, intera: string) => (
    <label className={stili.casellaDellaVoce}>
      <input
        type="checkbox"
        aria-label={riempi(intera, { n: String(i + 1) })}
        checked={voci[i]?.[chiave] === true}
        onChange={(e) => {
          const si = e.currentTarget.checked;
          conVoci(voci.map((x, k) => (k !== i ? x : si ? { ...x, [chiave]: true } : (({ [chiave]: _, ...resto }) => resto)(x))));
        }}
      />
      {etichetta}
    </label>
  );
  const testo = (etichetta: string, valore: string, scrivi: (v: string) => void, largo = false) => (
    <input
      aria-label={etichetta}
      className={`${stiliDati.campo} ${largo ? stili.largo : ""}`}
      type="text"
      spellCheck={false}
      autoComplete="off"
      value={valore}
      onChange={(e) => scrivi(e.currentTarget.value)}
    />
  );

  return (
    <form
      ref={modulo}
      data-campi-caso=""
      aria-label={riempi(testi.modificaDelCaso, { nome: nome || testi.casoSenzaNome })}
      className={`${stiliDati.scheda} ${stili.campi}`}
      onKeyDown={tasto}
      onSubmit={(e) => {
        e.preventDefault();
        conferma(true);
      }}
    >
      <label className={stiliDati.voce}>
        <span className={stiliDati.etichetta}>{testi.casoNome}</span>
        {testo(testi.casoNome, bozza.nome, (v) => cambia({ ...bozza, nome: v }), true)}
      </label>
      <label className={stiliDati.voce}>
        <span className={stiliDati.etichetta}>{testi.casoDescrizione}</span>
        {testo(testi.casoDescrizione, bozza.descrizione, (v) => cambia({ ...bozza, descrizione: v }), true)}
      </label>
      <fieldset className={stili.valori}>
        <legend className={stiliDati.etichetta}>{parametri ? testi.casoValoriFunzione : testi.casoValori}</legend>
        {voci.length === 0 && <p className={stili.nota}>{testi.casoSenzaValori}</p>}
        {voci.map((v, i) => {
          const n = String(i + 1);
          const manca = !esistenti.has(v.dato);
          const opzioni = manca ? [...scelte, v.dato] : scelte.includes(v.dato) || dalleProcedure.has(v.dato) ? scelte : [...scelte, v.dato];
          return (
            <div key={i} className={stili.valore} data-mancante={manca ? "" : undefined}>
              <span className={stili.numero}>{n}.</span>
              <select
                aria-label={riempi(testi.casoDatoDelValore, { n })}
                aria-invalid={manca || undefined}
                className={`${stiliDati.campo} ${stiliDati.codice}`}
                value={v.dato}
                onChange={(e) => {
                  const dato = e.currentTarget.value;
                  conVoci(voci.map((x, k) => (k === i ? conIlDato(x, dato, parametri) : x)));
                }}
              >
                {opzioni.map((d) => (
                  <option key={d} value={d}>
                    {manca && d === v.dato ? riempi(testi.casoDatoMancante, { dato: d }) : d}
                  </option>
                ))}
                {altrove.map((g) => (
                  <optgroup key={g.nome} label={riempi(testi.casoDatiDi, { nome: g.nome })}>
                    {g.dati.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input
                aria-label={riempi(testi.casoTestoDelValore, { n })}
                className={`${stiliDati.campo} ${stiliDati.codice} ${stili.largo}`}
                type="text"
                spellCheck={false}
                autoComplete="off"
                value={v.senzaValore ? "" : v.testo}
                disabled={v.senzaValore}
                onChange={(e) => conVoci(voci.map((x, k) => (k === i ? { ...x, testo: e.currentTarget.value } : x)))}
              />
              <button type="button" className={stiliDati.togli} aria-label={riempi(testi.casoValoreSu, { n })} title={riempi(testi.casoValoreSu, { n })} disabled={i === 0} onClick={() => scambia(i, i - 1)}>
                ↑
              </button>
              <button
                type="button"
                className={stiliDati.togli}
                aria-label={riempi(testi.casoValoreGiu, { n })}
                title={riempi(testi.casoValoreGiu, { n })}
                disabled={i === voci.length - 1}
                onClick={() => scambia(i, i + 1)}
              >
                ↓
              </button>
              <button type="button" className={stiliDati.togli} aria-label={riempi(testi.casoValoreTogli, { n })} title={riempi(testi.casoValoreTogli, { n })} onClick={() => conVoci(voci.filter((_, k) => k !== i))}>
                ×
              </button>
              {/* Dopo i comandi, nella riga sotto il valore: solo sulla voce del parametro, la prima col suo nome (le altre
                  sono letture, che un valore lo vogliono). «Senza valore» solo su una voce che lo è già (un caso scritto
                  prima che un riferimento volesse il valore), per poterla togliere: un riferimento vuole il valore, e un
                  parametro per uscita non ha voce. */}
              {primaDel(i) && parametri?.get(v.dato)?.rif && v.senzaValore && casella(i, "senzaValore", testi.casoSenzaValoreBreve, testi.casoSenzaValoreN)}
              {primaDel(i) && parametri?.get(v.dato)?.vettore && casella(i, "ognuno", testi.casoOgniElementoBreve, testi.casoOgniElementoN)}
            </div>
          );
        })}
        {/* Una voce nuova parte dal primo dato che si chiede: un parametro per uscita no. */}
        <button type="button" className={stiliDati.comando} onClick={() => conVoci([...voci, { dato: scelte.find((s) => parametri?.get(s)?.uscita !== true) ?? scelte[0] ?? "", testo: "" }])}>
          {testi.casoAggiungiValore}
        </button>
      </fieldset>
      <label className={stiliDati.voce}>
        <span className={stiliDati.etichetta}>{parametri ? testi.casoOutputFunzione : testi.casoOutput}</span>
        <textarea
          aria-label={parametri ? testi.casoOutputFunzione : testi.casoOutput}
          className={`${stiliDati.campo} ${stiliDati.codice} ${stili.output}`}
          spellCheck={false}
          rows={Math.min(Math.max(bozza.output.split("\n").length, 3), 12)}
          value={bozza.output}
          onChange={(e) => cambia({ ...bozza, output: e.currentTarget.value })}
        />
      </label>
      {atteso.error && <p className={stili.nota}>{riempi(testi.casoErroreAtteso, { breve: codici[atteso.error.code].breve, dove: nomeDi(atteso.error.block) })}</p>}
      {atteso.static_error && <p className={stili.nota}>{riempi(testi.casoErroreStaticoAtteso, { breve: codici[atteso.static_error.code as keyof Codici].breve, dove: nomeDi(atteso.static_error.block) })}</p>}
      {atteso.warnings && atteso.warnings.length > 0 && <p className={stili.nota}>{riempi(testi.casoAvvisiAttesi, { elenco: atteso.warnings.map(segnalazione).join("; ") })}</p>}
      <ul className={stiliDati.segnalazioni} aria-label={testi.segnalazioniDelCaso} aria-live="polite">
        {problemi.map((p, i) => (
          <li key={i} className={stiliDati.errore}>
            {p}
          </li>
        ))}
      </ul>
      <div className={stiliDati.comandi}>
        <button type="button" className={stiliDati.comando} onClick={elimina}>
          {testi.eliminaCaso}
        </button>
        <button type="submit" className={stiliDati.comando}>
          {testi.conferma}
        </button>
        <button type="button" className={stiliDati.comando} onClick={rinuncia}>
          {testi.rinuncia}
        </button>
      </div>
    </form>
  );
}
