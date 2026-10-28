// La vista dei dati: la definizione dei dati, non i loro valori durante l'esecuzione. Una tabella per i
// dati di lavoro della funzione mostrata (il programma principale, o una procedura o una funzione) e, sopra, una per le
// costanti comuni, solo se il progetto ne ha, e una per i parametri di una procedura o di una funzione (sempre, anche
// senza parametri: «Nessun parametro»), nell'ordine in cui si passano, con in fondo ciò che una funzione restituisce.
// Cinque colonne: nome, tipo (con la forma), natura, valore iniziale, ruolo; i parametri ne hanno quattro: la posizione,
// nome, tipo, natura. Ogni tabella si trova per ruolo e nome dalla sua didascalia. Un attributo assente è un trattino,
// che il lettore di schermo legge «nessuno».
//
// Una riga ha per chiave la POSIZIONE DEL DATO NEL FILE (fra i dati della funzione, o fra le costanti comuni), non quella
// nella tabella: i parametri e i dati di lavoro stanno nello stesso elenco del file, in due tabelle.
//
// Con `modifica` i dati si cambiano (con `modificaComuni` le costanti comuni), in uno dei due modi: la SCHEDA sotto la riga
// (il predefinito: doppio clic o Invio sulla riga la aprono) o le CELLE, dove ogni attributo è già un campo
// e la riga si conferma lasciandola o con Invio. Nei due modi una riga si sceglie col fuoco (nelle celle,
// con un clic fuori dai campi, che li conferma, o con Esc da un campo) e Canc la cancella; il tasto destro sulla riga (o il
// tasto Menu, o Maiusc+F10) apre il suo menu (Elimina, Duplica, Sposta su e giù: lo stesso menu di un caso d'uso), tranne
// che su un campo di testo. Sotto la tabella dei dati, «Aggiungi un dato»; sotto quella dei parametri, «Aggiungi un
// parametro». Un parametro non si duplica (la sua posizione è la firma), e si sposta solo fra i parametri, se chi monta la
// vista lo permette; un dato di lavoro si sposta fra i dati di lavoro.
//
// Ogni riga si raggiunge col Tab e porta i segni del controllo statico: un errore o un avviso del dato la
// segnano (`aria-invalid` per un errore), e il testo è la sua descrizione accessibile. Le righe sono in
// ordine di posizione, la chiave è la posizione: due dati con lo stesso nome sono due righe, e il secondo
// mostra l'errore.
import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import type { TestiDelDisegno, ValoreRipetuto } from "../../core/disegno/impaginazione";
import type { Dato, DefinizioneDelRecord, GenereDiFunzione } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import type { SegnalazioneMostrata } from "../disegno/EditorDelBlocco";
import { campoDiTesto, tastoCheElimina } from "../modifiche";
import { bozzaDi, type BozzaDelDato, type Natura } from "./bozza";
import { campiDelDato, nomiDelleNature, SchedaDelDato, Segnalazioni } from "./CampiDelDato";
import { azioniDellaRiga, MenuDellaRiga } from "./MenuDellaRiga";
import { rigaDelDato } from "./righe";
import { TabellaDeiRecord, type ModificaDeiRecord } from "./TabellaDeiRecord";
import stili from "./VistaDati.module.css";

export type ModoDeiDati = "scheda" | "celle";

/** La chiave di una riga nel documento: la tabella e la posizione del dato. */
export const chiaveDellaRiga = (comune: boolean, indice: number) => `${comune ? "comuni" : "dati"}-${indice}`;

export interface ModificaDeiDati {
  readonly modo: ModoDeiDati;
  /** Il dato di cui si scrivono i campi (la sua posizione nel file), con la loro bozza. */
  readonly inModifica: { readonly indice: number; readonly bozza: BozzaDelDato; readonly campo?: "iniziale" } | null;
  /** Apre i campi del dato (la scheda), o comincia a scriverli (le celle). */
  readonly apri: (indice: number) => void;
  readonly cambia: (indice: number, bozza: BozzaDelDato) => void;
  /** `torna` dice se il fuoco torna sulla riga (nella scheda, dopo Invio). */
  readonly conferma: (torna: boolean) => void;
  readonly rinuncia: () => void;
  readonly aggiungi: () => void;
  /** «Aggiungi un parametro»; senza, il pulsante non c'è. */
  readonly aggiungiParametro?: (() => void) | undefined;
  readonly elimina: (indice: number) => void;
  /** Dal menu della riga: la copia sotto il dato, lo scambio col vicino sopra (`-1`) o sotto (`1`) nella sua tabella. */
  readonly duplica: (indice: number) => void;
  readonly sposta: (indice: number, verso: -1 | 1) => void;
  /** Lo scambio di un parametro col vicino nella firma; senza, un parametro non si sposta. */
  readonly spostaParametro?: ((indice: number, verso: -1 | 1) => void) | undefined;
  /** Le scelte della natura nei campi di un parametro e di un dato di lavoro. */
  readonly nature: { readonly parametri: readonly Natura[]; readonly dati: readonly Natura[] };
  /** Errori e avvisi del dato in modifica, nel progetto candidato. */
  readonly candidato: readonly SegnalazioneMostrata[];
  /** Nelle celle, il fuoco ha lasciato la riga. */
  readonly lasciata?: ((indice: number) => void) | undefined;
}

/** I segni del controllo sulle righe: per tabella, la posizione del dato e le sue segnalazioni. */
export interface Segni {
  readonly dati: ReadonlyMap<number, readonly SegnalazioneMostrata[]>;
  readonly comuni: ReadonlyMap<number, readonly SegnalazioneMostrata[]>;
}

function Attributo({ valore, testi, codice = false }: { valore: string | undefined; testi: Dizionario; codice?: boolean }): ReactElement {
  if (valore === undefined)
    return (
      <td data-nessuno="">
        <span aria-hidden="true">—</span>
        <span className={stili.nascosto}>{testi.datiNessuno}</span>
      </td>
    );
  return <td className={codice ? stili.codice : undefined}>{valore}</td>;
}

/** Come si mostrano i valori iniziali: le parole del disegno nella lingua e il modo del valore ripetuto delle
 * Impostazioni (lo stesso testo del blocco sotto «Inizio»); il modo dice anche come nasce un vettore nuovo. */
export interface ValoriMostrati {
  readonly testi: TestiDelDisegno;
  readonly ripetuto: ValoreRipetuto;
}

/** Il tasto Menu, o Maiusc con F10: aprono il menu della riga. */
const apreIlMenu = (e: KeyboardEvent) => (e.shiftKey ? e.key === "F10" : e.key === "ContextMenu");

const testoDelSegno = (s: SegnalazioneMostrata, testi: Dizionario) =>
  riempi(s.genere === "errore" ? testi.segnalazioneErrore : testi.segnalazioneAvviso, { breve: s.breve });

/** Una riga di una tabella: il dato e la sua posizione nel file. */
interface Riga {
  readonly indice: number;
  readonly dato: Dato;
}

function Tabella({
  titolo,
  righe,
  comune,
  parametri = false,
  piede,
  segni,
  testi,
  valori,
  modifica,
  records,
}: {
  titolo: string;
  righe: readonly Riga[];
  comune: boolean;
  /** La tabella dei parametri: la posizione al posto del valore iniziale e del ruolo. */
  parametri?: boolean;
  /** L'ultima riga dei parametri di una funzione: ciò che restituisce. */
  piede?: string | undefined;
  segni: ReadonlyMap<number, readonly SegnalazioneMostrata[]>;
  testi: Dizionario;
  valori: ValoriMostrati;
  modifica?: ModificaDeiDati | undefined;
  /** I nomi dei record del progetto, per la scelta del tipo. */
  records: readonly string[];
}): ReactElement {
  const prefisso = useId();
  const celle = modifica?.modo === "celle";
  const colonne = parametri ? 4 : 5;
  const nature = parametri ? modifica?.nature.parametri : modifica?.nature.dati;
  const descrizioni: ReactElement[] = [];
  const [menu, setMenu] = useState<{ indice: number; x: number; y: number } | null>(null);
  const riga = (indice: number) => document.querySelector<HTMLElement>(`[data-dato="${chiaveDellaRiga(comune, indice)}"]`);
  const posto = menu ? righe.findIndex((r) => r.indice === menu.indice) : -1;

  /** I tasti sulla riga stessa (non sui suoi campi): Invio apre la scheda, Canc (sul Mac anche ⌫) cancella, il tasto Menu o
   * Maiusc+F10 aprono il menu sotto la riga. */
  function tasto(e: KeyboardEvent<HTMLTableRowElement>, indice: number): boolean {
    if (!modifica || e.target !== e.currentTarget) return false;
    if (e.key === "Enter" && !celle) modifica.apri(indice);
    else if (tastoCheElimina(e)) modifica.elimina(indice);
    else if (apreIlMenu(e)) {
      const r = e.currentTarget.getBoundingClientRect();
      setMenu({ indice, x: r.left, y: r.bottom });
    } else return false;
    e.preventDefault();
    return true;
  }
  // Su un campo di testo (nelle celle) resta il menu del sistema, con Taglia, Copia e Incolla.
  const menuSu = (indice: number) => (e: MouseEvent<HTMLTableRowElement>) => {
    if (campoDiTesto(e.target)) return;
    e.preventDefault();
    const { clientX: x, clientY: y } = e;
    setMenu({ indice, x, y });
  };

  return (
    <>
      <table className={stili.tabella}>
        <caption className={stili.didascalia}>{titolo}</caption>
        <thead>
          <tr>
            {parametri && <th scope="col">{testi.datiPosizione}</th>}
            <th scope="col">{testi.datiNome}</th>
            <th scope="col">{testi.datiTipo}</th>
            <th scope="col">{testi.datiNatura}</th>
            {!parametri && <th scope="col">{testi.datiIniziale}</th>}
            {!parametri && <th scope="col">{testi.datiRuolo}</th>}
            {celle && (
              <th scope="col">
                <span className={stili.nascosto}>{testi.comandiDellaRiga}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {parametri && righe.length === 0 && (
            <tr className={stili.vuota}>
              <td colSpan={colonne}>{testi.nessunParametro}</td>
            </tr>
          )}
          {righe.map(({ indice, dato }, posizione) => {
            const chiave = chiaveDellaRiga(comune, indice);
            const suoi = segni.get(indice) ?? [];
            const errore = suoi.some((s) => s.genere === "errore");
            const idDescrizione = `${prefisso}-${indice}`;
            if (suoi.length > 0)
              descrizioni.push(
                <span key={indice} id={idDescrizione}>
                  {suoi.map((s) => testoDelSegno(s, testi)).join(" ")}
                </span>,
              );
            const segno = {
              "data-dato": chiave,
              "data-segno": suoi.length === 0 ? undefined : errore ? "errore" : "avviso",
              "aria-invalid": errore || undefined,
              "aria-describedby": suoi.length > 0 ? idDescrizione : undefined,
              title: suoi.length > 0 ? suoi.map((s) => testoDelSegno(s, testi)).join("\n") : undefined,
            };
            const inScrittura = modifica?.inModifica?.indice === indice ? modifica.inModifica : null;

            // Le celle: la riga è fatta di campi; lasciarla (il fuoco esce dalla riga) la conferma.
            if (celle && modifica && nature) {
              const bozza = inScrittura?.bozza ?? bozzaDi(dato, valori.ripetuto, comune);
              const c = campiDelDato(bozza, (b) => modifica.cambia(indice, b), testi, (campo) => riempi(testi.campoDellaRiga, { campo, n: String(posizione + 1) }), nature, records);
              return (
                <tr
                  key={indice}
                  {...segno}
                  tabIndex={-1}
                  className={`${stili.riga} ${stili.rigaACelle}`}
                  onContextMenu={menuSu(indice)}
                  onKeyDown={(e) => {
                    if (tasto(e, indice)) return;
                    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) modifica.conferma(true);
                    else if (e.key === "Escape" && inScrittura) modifica.rinuncia();
                    // Esc da un campo senza nulla da annullare sceglie la riga: lì Canc la cancella.
                    else if (e.key === "Escape") e.currentTarget.focus();
                    else return;
                    e.preventDefault();
                  }}
                  onBlur={(e) => {
                    // Anche il fuoco che va alla riga stessa (un clic fuori dai campi) la conferma: la riga ha i
                    // suoi tasti (Canc la cancella), e `contains` è vero anche per lei.
                    const fuoriDaiCampi = e.relatedTarget === e.currentTarget || !e.currentTarget.contains(e.relatedTarget as Node | null);
                    if (inScrittura && fuoriDaiCampi) modifica.conferma(false);
                    else if (fuoriDaiCampi) modifica.lasciata?.(indice);
                  }}
                >
                  {parametri && <td>{posizione + 1}</td>}
                  <th scope="row">{c.nome}</th>
                  <td>
                    <span className={stili.insieme}>
                      {c.tipo}
                      {c.forma}
                      {c.elementi}
                      {c.lunghezza}
                    </span>
                  </td>
                  <td>
                    <span className={stili.insieme}>
                      {c.natura}
                      {c.globale}
                    </span>
                  </td>
                  {!parametri && (
                    <td>
                      <span className={stili.insieme}>
                        {c.iniziale}
                        {c.inizialeVettore}
                      </span>
                    </td>
                  )}
                  {!parametri && <td>{c.ruolo}</td>}
                  <td>
                    <button
                      type="button"
                      className={stili.togli}
                      aria-label={riempi(testi.eliminaIlDato, { nome: dato.name || testi.datoSenzaNome })}
                      title={riempi(testi.eliminaIlDato, { nome: dato.name || testi.datoSenzaNome })}
                      // Il clic non sposta il fuoco: in WebKit andrebbe alla riga, che conferma il testo scritto e
                      // può spostare il pulsante (il segno d'errore del nome sparisce) prima che il clic finisca.
                      // Il testo lo conferma l'eliminazione stessa.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => modifica.elimina(indice)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            }

            const riga = rigaDelDato(dato, testi, valori.ripetuto, valori.testi);
            return [
              <tr
                key={indice}
                {...segno}
                tabIndex={0}
                className={stili.riga}
                onDoubleClick={modifica ? () => modifica.apri(indice) : undefined}
                onKeyDown={modifica ? (e) => tasto(e, indice) : undefined}
                onContextMenu={modifica ? menuSu(indice) : undefined}
              >
                {parametri && <td>{posizione + 1}</td>}
                <th scope="row">{riga.nome}</th>
                <td>{riga.tipo}</td>
                <td>{dato.parameter === undefined ? riga.natura : testi[nomiDelleNature[dato.parameter]]}</td>
                {!parametri && <Attributo valore={riga.iniziale} testi={testi} codice />}
                {!parametri && <Attributo valore={riga.ruolo} testi={testi} />}
              </tr>,
              inScrittura && modifica && nature && (
                <tr key={`${indice}-scheda`} className={stili.rigaDellaScheda}>
                  <td colSpan={colonne}>
                    <SchedaDelDato
                      nome={dato.name}
                      nature={nature}
                      records={records}
                      bozza={inScrittura.bozza}
                      {...(inScrittura.campo ? { primo: inScrittura.campo } : {})}
                      cambia={(b) => modifica.cambia(indice, b)}
                      conferma={modifica.conferma}
                      rinuncia={modifica.rinuncia}
                      elimina={() => modifica.elimina(indice)}
                      segnalazioni={modifica.candidato}
                      testi={testi}
                    />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
        {piede !== undefined && (
          <tfoot>
            <tr className={stili.piede}>
              <td colSpan={colonne}>{piede}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {descrizioni.length > 0 && <div className={stili.nascosto}>{descrizioni}</div>}
      {modifica && (
        <MenuDellaRiga
          dove={menu}
          nome={riempi(testi.menuDelDato, { nome: righe[posto]?.dato.name || testi.datoSenzaNome })}
          testi={testi}
          azioni={azioniDellaRiga(
            posto,
            righe.length,
            {
              elimina: (k) => modifica.elimina(righe[k]!.indice),
              duplica: (k) => modifica.duplica(righe[k]!.indice),
              sposta: (k, verso) => (parametri ? modifica.spostaParametro : modifica.sposta)?.(righe[k]!.indice, verso),
            },
            () => setMenu(null),
            { duplica: !parametri, sposta: !parametri || modifica.spostaParametro !== undefined },
          )}
          chiudi={(torna) => {
            if (torna && menu) riga(menu.indice)?.focus();
            setMenu(null);
          }}
        />
      )}
      {celle && modifica?.inModifica && righe.some((r) => r.indice === modifica.inModifica?.indice) && modifica.candidato.length > 0 && (
        <Segnalazioni segnalazioni={modifica.candidato} testi={testi} />
      )}
    </>
  );
}

export function VistaDati({
  nome,
  progetto = nome,
  genere = "main",
  restituisce,
  dati,
  costantiComuni = [],
  testi,
  valori,
  segni,
  modifica,
  modificaComuni,
  records = [],
  segniDeiRecord,
  modificaRecord,
  aggiungiRecord,
}: {
  /** Il nome della funzione mostrata (il nome del progetto, per il programma principale), nelle didascalie. */
  nome: string;
  /** Il nome del progetto, nella didascalia delle costanti comuni. */
  progetto?: string;
  genere?: GenereDiFunzione;
  /** Per una funzione, ciò che restituisce, come lo dice la riga sotto i parametri. */
  restituisce?: string | undefined;
  /** I dati della funzione mostrata, parametri compresi, nell'ordine del file. */
  dati: readonly Dato[];
  costantiComuni?: readonly Dato[] | undefined;
  testi: Dizionario;
  valori: ValoriMostrati;
  segni?: Segni | undefined;
  /** Senza, la vista è in sola lettura (la pagina di prova del disegno). */
  modifica?: ModificaDeiDati | undefined;
  /** Senza, le costanti comuni sono in sola lettura. */
  modificaComuni?: ModificaDeiDati | undefined;
  /** I record del progetto: con almeno uno, la loro tabella in cima. */
  records?: readonly DefinizioneDelRecord[] | undefined;
  segniDeiRecord?: ReadonlyMap<number, readonly SegnalazioneMostrata[]> | undefined;
  /** Senza, i record sono in sola lettura. */
  modificaRecord?: ModificaDeiRecord | undefined;
  /** «Aggiungi un record» sotto la loro tabella o, senza record, in cima (se chi monta la vista lo dà). */
  aggiungiRecord?: (() => void) | undefined;
}): ReactElement {
  const nomiDeiRecord = records.map((r) => r.name);
  const nessuno = new Map<number, readonly SegnalazioneMostrata[]>();
  const righe = dati.map((dato, indice) => ({ indice, dato }));
  const pulsante = (testo: string, aggiungi: () => void, segno: string) => (
    <button
      type="button"
      className={stili.comando}
      {...{ [segno]: "" }}
      // Come il «×»: il clic non sposta il fuoco e non conferma i campi aperti alla pressione (la scheda o l'elenco
      // degli errori si restringerebbero e il pulsante salirebbe prima del rilascio); li conferma l'aggiunta.
      data-conferma-lui=""
      onMouseDown={(e) => e.preventDefault()}
      onClick={aggiungi}
    >
      {testo}
    </button>
  );
  return (
    <div className={stili.vista}>
      {records.length > 0 && <TabellaDeiRecord records={records} segni={segniDeiRecord ?? nessuno} testi={testi} modifica={modificaRecord} />}
      {aggiungiRecord && pulsante(testi.aggiungiRecord, aggiungiRecord, "data-aggiungi-record")}
      {costantiComuni.length > 0 && (
        <Tabella
          titolo={`${testi.costantiComuni}: ${progetto}`}
          righe={costantiComuni.map((dato, indice) => ({ indice, dato }))}
          comune
          segni={segni?.comuni ?? nessuno}
          testi={testi}
          valori={valori}
          modifica={modificaComuni}
          records={nomiDeiRecord}
        />
      )}
      {genere !== "main" && (
        <Tabella
          titolo={`${testi.parametri}: ${nome}`}
          righe={righe.filter((r) => r.dato.parameter !== undefined)}
          comune={false}
          parametri
          piede={restituisce}
          segni={segni?.dati ?? nessuno}
          testi={testi}
          valori={valori}
          modifica={modifica}
          records={nomiDeiRecord}
        />
      )}
      {modifica?.aggiungiParametro && genere !== "main" && pulsante(testi.aggiungiParametro, modifica.aggiungiParametro, "data-aggiungi-parametro")}
      <Tabella
        titolo={`${testi.dati}: ${nome}`}
        righe={righe.filter((r) => r.dato.parameter === undefined)}
        comune={false}
        segni={segni?.dati ?? nessuno}
        testi={testi}
        valori={valori}
        modifica={modifica}
        records={nomiDeiRecord}
      />
      {modifica && pulsante(testi.aggiungiDato, modifica.aggiungi, "data-aggiungi")}
    </div>
  );
}
