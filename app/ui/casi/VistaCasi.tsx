// La scheda «Casi d'uso» del pannello: l'elenco dei casi del progetto, ognuno con la sua casella, il nome coi valori che
// scrive nella console, «Esegui» e «Passo passo» (due icone in un gruppo, staccato dal pallino) e, in fondo alla riga, il
// pallino dell'ultimo esito; sotto il caso scelto le sue differenze; sopra, «Esegui tutti», «Esegui i
// selezionati» (con l'avanzamento e «Ferma» mentre corre) e «Aggiungi un caso». La casella in testa all'elenco seleziona
// o toglie tutti i casi, e la sua scritta dice quale dei due.
//
// Il pallino: verde con ✓ (raggiunto), rosso con ✗ (non raggiunto), giallo con ✗ (non raggiunto, e il progetto è
// cambiato da allora: da eseguire di nuovo), vuoto (mai eseguito, o raggiunto prima di una modifica). Lo stato lo dà chi
// monta la scheda, dagli esiti e dal progetto con cui sono stati ottenuti.
//
// Un caso si sceglie col fuoco sulla sua riga (Tab o clic). Doppio clic o Invio aprono i suoi campi sotto la riga, Canc
// lo elimina (chiedendo), il tasto destro (o il tasto Menu, o Maiusc+F10) apre il menu della riga, lo stesso dei dati.
// «Esegui» e «Passo passo» eseguono un caso nella colonna, con la tabella e la console; dalle differenze, «Attendi questo
// errore», «Togli l'errore atteso» e «Scrivi gli avvisi» cambiano l'atteso con ciò che l'esecuzione ha ottenuto.
// Gli esiti vengono dall'esecuzione del nucleo, così come sono: qui nessun confronto.
import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import type { EsitoDelCaso } from "../../core/casi/esito";
import type { CasoDiUnaFunzione } from "../../core/progetto/modello";
import type { testiDeiCodici } from "../../i18n/codici";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import stiliDati from "../dati/VistaDati.module.css";
import { azioniDellaRiga, MenuDellaRiga } from "../dati/MenuDellaRiga";
import { icone } from "../icone";
import { tastoCheElimina } from "../modifiche";
import type { BozzaDelCaso } from "./bozza";
import { CampiDelCaso } from "./CampiDelCaso";
import { Differenze } from "./Differenze";
import stili from "./VistaCasi.module.css";

type Codici = (typeof testiDeiCodici)["it"];

export interface ModificaDeiCasi {
  readonly inModifica: { readonly indice: number; readonly bozza: BozzaDelCaso } | null;
  readonly apri: (indice: number) => void;
  readonly cambia: (indice: number, bozza: BozzaDelCaso) => void;
  /** `torna` dice se il fuoco torna sulla riga (dopo Invio). */
  readonly conferma: (torna: boolean) => void;
  readonly rinuncia: () => void;
  readonly aggiungi: () => void;
  readonly elimina: (indice: number) => void;
  readonly duplica: (indice: number) => void;
  readonly sposta: (indice: number, verso: -1 | 1) => void;
  /** Perché la bozza non si conferma, nella lingua. */
  readonly candidato: readonly string[];
}

/** Dall'esito mostrato sotto un caso, nell'atteso di quel caso. */
export interface DallEsito {
  readonly attendiErrore: (indice: number) => void;
  readonly togliErrore: (indice: number) => void;
  readonly scriviAvvisi: (indice: number) => void;
}


/** La riga di un caso nel documento. */
export const rigaDelCaso = (indice: number) => `tr[data-caso="${indice}"]`;

/** Il tasto Menu, o Maiusc con F10: aprono il menu della riga. */
const apreIlMenu = (e: KeyboardEvent) => (e.shiftKey ? e.key === "F10" : e.key === "ContextMenu");

/** Lo stato del pallino di un caso. */
export type StatoDelCaso = "mai" | "raggiunto" | "non-raggiunto" | "da-rieseguire" | "raggiunto-prima" | "fuori-tappa";

/** Il pallino di un caso; `esito` c'è se è del progetto mostrato (allora si vedono le differenze). */
export interface SegnoDelCaso {
  readonly stato: StatoDelCaso;
  readonly esito?: EsitoDelCaso;
}

/** Il pallino che viene da un esito: `attuale` se l'esito è del progetto mostrato (e coi suoi limiti). */
export function segnoDi(esito: EsitoDelCaso | undefined, attuale: boolean): SegnoDelCaso {
  if (esito === undefined) return { stato: "mai" };
  if (esito.fuoriTappa) return { stato: "fuori-tappa" };
  if (!attuale) return { stato: esito.raggiunto ? "raggiunto-prima" : "da-rieseguire" };
  return { stato: esito.raggiunto ? "raggiunto" : "non-raggiunto", esito };
}

/** «3 raggiunti su 4»: i casi raggiunti in questo progetto, su tutti i casi. */
export function riassunto(segni: readonly SegnoDelCaso[], testi: Dizionario): string {
  const n = segni.filter((s) => s.stato === "raggiunto").length;
  return n === 1 ? riempi(testi.casiRaggiuntoUno, { totale: String(segni.length) }) : riempi(testi.casiRaggiunti, { n: String(n), totale: String(segni.length) });
}

const glifo: Record<StatoDelCaso, string> = { mai: "", raggiunto: "✓", "non-raggiunto": "✗", "da-rieseguire": "✗", "raggiunto-prima": "", "fuori-tappa": "–" };

function Segno({ stato, testi }: { stato: StatoDelCaso; testi: Dizionario }): ReactElement {
  const testo = {
    mai: testi.esitoMai,
    raggiunto: testi.esitoRaggiunto,
    "non-raggiunto": testi.esitoNonRaggiunto,
    "da-rieseguire": testi.esitoDaRieseguire,
    "raggiunto-prima": testi.esitoRaggiuntoPrima,
    "fuori-tappa": testi.esitoFuoriTappa,
  }[stato];
  return (
    <td data-esito={stato} title={testo} className={stili.segno}>
      <span aria-hidden="true" className={stili.pallino}>
        {glifo[stato]}
      </span>
      <span className={stiliDati.nascosto}>{testo}</span>
    </td>
  );
}

export function VistaCasi({
  nome,
  casi,
  scelte,
  dalleProcedureChiamate,
  esistenti,
  segni,
  selezionati,
  seleziona,
  scelto,
  scegli,
  modifica,
  tutti,
  eseguiTutti,
  eseguiSelezionati,
  ferma,
  eseguiCaso,
  dallEsito,
  testi,
  codici,
  nomeDi,
  parametri,
}: {
  /** Il nome del progetto (o della procedura o funzione), nella didascalia. */
  nome: string;
  casi: readonly CasoDiUnaFunzione[];
  /** I dati a cui una voce può andare; quelli di lavoro delle procedure chiamate che una lettura riceve; i nomi a cui una
   * voce può andare (tutti i dati della radice, e quelli delle procedure). */
  scelte: readonly string[];
  dalleProcedureChiamate?: readonly { readonly nome: string; readonly dati: readonly string[] }[];
  esistenti: ReadonlySet<string>;
  /** Il pallino di ogni caso, per posizione. */
  segni: readonly SegnoDelCaso[];
  /** Se ogni caso è selezionato, per posizione; `seleziona` ne cambia uno, o tutti senza posizione. */
  selezionati: readonly boolean[];
  seleziona: (indice: number | null, si: boolean) => void;
  scelto: number | null;
  scegli: (indice: number) => void;
  /** Senza, la scheda è in sola lettura (durante un'esecuzione). */
  modifica: ModificaDeiCasi | undefined;
  /** «Esegui tutti» in corso: quanti casi sono finiti, su quanti. */
  tutti: { readonly eseguiti: number; readonly totale: number } | null;
  /** «Esegui tutti» e «Esegui i selezionati»; senza, non sono disponibili. */
  eseguiTutti: (() => void) | undefined;
  eseguiSelezionati: (() => void) | undefined;
  ferma: () => void;
  /** Un caso nella colonna, tutto insieme o un'azione alla volta; senza, non disponibile (durante un'esecuzione). */
  eseguiCaso: ((indice: number, passoPasso: boolean) => void) | undefined;
  /** Dall'esito, nell'atteso; senza, la scheda non cambia l'atteso (durante un'esecuzione). */
  dallEsito: DallEsito | undefined;
  testi: Dizionario;
  codici: Codici;
  nomeDi: (blocco: string) => string;
  /** I parametri della procedura o della funzione di cui sono i casi (eseguita da sola); senza, i casi del programma. */
  parametri?: ReadonlyMap<string, { readonly rif: boolean; readonly vettore: boolean; readonly uscita?: boolean }> | undefined;
}): ReactElement {
  const prefisso = useId();
  const [menu, setMenu] = useState<{ indice: number; x: number; y: number } | null>(null);
  const riga = (indice: number) => document.querySelector<HTMLElement>(rigaDelCaso(indice));
  const quanti = selezionati.filter((s) => s).length;
  /** «Esegui» e «Passo passo» di un caso, sulla sua riga: le icone della barra, il nome intero per gli ausili. Come i
   * comandi sopra l'elenco confermano loro i campi aperti di un altro caso, al clic: la riga sta sotto quei campi, che
   * confermati alla pressione si chiuderebbero e la sposterebbero prima del rilascio. */
  const comandiDelCaso = (indice: number, nomeDelCaso: string) =>
    (
      [
        [false, testi.casoEseguiIl, icone.esegui],
        [true, testi.casoPassoPassoIl, icone.passo],
      ] as const
    ).map(([passo, nomeIntero, icona]) => (
      <button
        key={nomeIntero}
        type="button"
        className={stili.comandoSullaRiga}
        data-esegui-caso={passo ? "passo" : "tutto"}
        data-conferma-lui=""
        aria-label={riempi(nomeIntero, { nome: nomeDelCaso })}
        title={riempi(nomeIntero, { nome: nomeDelCaso })}
        aria-disabled={eseguiCaso ? undefined : true}
        onMouseDown={(e) => e.preventDefault()}
        onClick={eseguiCaso ? () => eseguiCaso(indice, passo) : undefined}
      >
        {icona}
      </button>
    ));
  /** I comandi dall'esito di un caso, per le differenze; nessuno senza esito attuale. */
  const comandiDallEsito = (indice: number) =>
    dallEsito && segni[indice]?.esito
      ? { attendiErrore: () => dallEsito.attendiErrore(indice), togliErrore: () => dallEsito.togliErrore(indice), scriviAvvisi: () => dallEsito.scriviAvvisi(indice) }
      : undefined;

  function tasto(e: KeyboardEvent<HTMLTableRowElement>, indice: number): void {
    if (!modifica || e.target !== e.currentTarget) return;
    if (e.key === "Enter") modifica.apri(indice);
    else if (tastoCheElimina(e)) modifica.elimina(indice);
    else if (apreIlMenu(e)) {
      const r = e.currentTarget.getBoundingClientRect();
      setMenu({ indice, x: r.left, y: r.bottom });
    } else return;
    e.preventDefault();
  }
  const menuSu = (indice: number) => (e: MouseEvent<HTMLTableRowElement>) => {
    if (!modifica || (e.target as Element).closest("form")) return;
    e.preventDefault();
    const { clientX: x, clientY: y } = e;
    setMenu({ indice, x, y });
  };

  return (
    <div className={stili.vista}>
      <h2 className={stili.titolo}>
        {testi.casiTitolo}
        {segni.some((s) => s.esito !== undefined) && !tutti && (
          <small data-riassunto="" className={stili.riassunto}>
            {riassunto(segni, testi)}
          </small>
        )}
      </h2>
      <p className={stili.premessa}>{parametri ? testi.casiPremessaFunzione : testi.casiPremessa}</p>
      <div className={stili.comandi}>
        {tutti ? (
          <>
            <span data-avanzamento="" role="status" className={stili.avanzamento}>
              {riempi(testi.casiAvanzamento, { n: String(tutti.eseguiti), totale: String(tutti.totale) })}
            </span>
            <button type="button" className={stiliDati.comando} onClick={ferma}>
              {testi.casiFerma}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={stiliDati.comando}
              data-conferma-lui=""
              aria-disabled={eseguiTutti ? undefined : true}
              onMouseDown={(e) => e.preventDefault()}
              onClick={eseguiTutti}
            >
              {testi.eseguiTutti}
            </button>
            <button
              type="button"
              className={stiliDati.comando}
              data-conferma-lui=""
              aria-disabled={eseguiSelezionati && quanti > 0 ? undefined : true}
              onMouseDown={(e) => e.preventDefault()}
              onClick={quanti > 0 ? eseguiSelezionati : undefined}
            >
              {riempi(testi.eseguiSelezionati, { n: String(quanti) })}
            </button>
            {modifica && (
              <button type="button" className={stiliDati.comando} data-aggiungi-caso="" data-conferma-lui="" onMouseDown={(e) => e.preventDefault()} onClick={modifica.aggiungi}>
                {testi.aggiungiCaso}
              </button>
            )}
          </>
        )}
      </div>
      {casi.length === 0 ? (
        <p className={stili.nota}>{testi.casiNessuno}</p>
      ) : (
        <table className={`${stiliDati.tabella} ${stili.tabella}`}>
          <caption className={stiliDati.nascosto}>{riempi(testi.casiDidascalia, { nome })}</caption>
          <thead>
            <tr>
              <td colSpan={4} className={stili.tutti}>
                <label>
                  <input
                    type="checkbox"
                    className={stili.casella}
                    checked={quanti === casi.length}
                    ref={(e) => {
                      if (e) e.indeterminate = quanti > 0 && quanti < casi.length;
                    }}
                    onChange={() => seleziona(null, quanti < casi.length)}
                  />
                  {quanti === casi.length ? testi.deselezionaTutti : testi.selezionaTutti}
                </label>
              </td>
            </tr>
          </thead>
          <tbody>
            {casi.map((caso, indice) => {
              const esito = segni[indice]?.esito;
              const aperto = modifica?.inModifica?.indice === indice ? modifica.inModifica : null;
              const voci = caso.inputs.length === 0 ? testi.casoNessunValore : caso.inputs.map((v) => riempi(v.text === undefined ? (v.each ? testi.casoVoceSenzaValoreOgniElemento : testi.casoVoceSenzaValore) : v.each ? testi.casoVoceOgniElemento : testi.casoVoce,{ dato: v.data, testo: v.text ?? "" })).join(" · ");
              return [
                <tr
                  key={indice}
                  data-caso={indice}
                  tabIndex={0}
                  aria-current={scelto === indice || undefined}
                  aria-describedby={`${prefisso}-${indice}`}
                  className={`${stiliDati.riga} ${stili.riga}`}
                  onFocus={(e) => e.target === e.currentTarget && scegli(indice)}
                  // Il clic sulla casella seleziona il caso, non lo sceglie: l'esito sotto di lui non si apre.
                  onClick={(e) => !(e.target as Element).closest("input") && scegli(indice)}
                  onDoubleClick={modifica ? (e) => !(e.target as Element).closest("input") && modifica.apri(indice) : undefined}
                  onKeyDown={(e) => tasto(e, indice)}
                  onContextMenu={menuSu(indice)}
                >
                  <td className={stili.cellaDellaCasella}>
                    {/* Come i comandi della riga: conferma lei i campi aperti di un altro caso, al clic (confermati alla
                        pressione, si chiuderebbero e porterebbero un'altra casella sotto il puntatore prima del rilascio). */}
                    <input
                      type="checkbox"
                      className={stili.casella}
                      aria-label={riempi(testi.selezionaCaso, { nome: caso.name || testi.casoSenzaNome })}
                      checked={selezionati[indice] === true}
                      data-conferma-lui=""
                      onMouseDown={(e) => e.preventDefault()}
                      onChange={(e) => {
                        const spuntata = e.currentTarget.checked;
                        if (modifica?.inModifica && modifica.inModifica.indice !== indice) modifica.conferma(false);
                        seleziona(indice, spuntata);
                      }}
                    />
                  </td>
                  <th scope="row">
                    <span data-nome-caso="">{caso.name || testi.casoSenzaNome}</span>
                    <span id={`${prefisso}-${indice}`} data-voci="" className={stili.voci}>
                      {voci}
                    </span>
                  </th>
                  <td className={stili.cellaDeiComandi}>
                    <span className={stili.comandiDelCaso}>{comandiDelCaso(indice, caso.name || testi.casoSenzaNome)}</span>
                  </td>
                  <Segno stato={segni[indice]?.stato ?? "mai"} testi={testi} />
                </tr>,
                aperto && modifica && (
                  <tr key={`${indice}-campi`} className={stiliDati.rigaDellaScheda}>
                    <td colSpan={4}>
                      <CampiDelCaso
                        nome={caso.name}
                        caso={caso}
                        bozza={aperto.bozza}
                        scelte={scelte}
                        dalleProcedureChiamate={dalleProcedureChiamate}
                        esistenti={esistenti}
                        cambia={(b) => modifica.cambia(indice, b)}
                        conferma={modifica.conferma}
                        rinuncia={modifica.rinuncia}
                        elimina={() => modifica.elimina(indice)}
                        segnalazioni={modifica.candidato}
                        testi={testi}
                        codici={codici}
                        nomeDi={nomeDi}
                        parametri={parametri}
                      />
                    </td>
                  </tr>
                ),
                !aperto && scelto === indice && esito && (
                  <tr key={`${indice}-esito`} className={stili.rigaDellEsito}>
                    <td colSpan={4}>
                      <Differenze esito={esito} caso={caso} testi={testi} codici={codici} nomeDi={nomeDi} comandi={comandiDallEsito(indice)} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      )}
      {modifica && (
        <MenuDellaRiga
          dove={menu}
          nome={riempi(testi.menuDelCaso, { nome: (menu ? casi[menu.indice]?.name : "") || testi.casoSenzaNome })}
          testi={testi}
          azioni={azioniDellaRiga(menu?.indice ?? -1, casi.length, modifica, () => setMenu(null))}
          chiudi={(torna) => {
            if (torna && menu) riga(menu.indice)?.focus();
            setMenu(null);
          }}
        />
      )}
    </div>
  );
}
