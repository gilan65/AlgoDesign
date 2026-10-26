// La finestra «Importa procedure e funzioni…». Due momenti:
// - da dove: la cartella delle librerie, a gruppi e con la ricerca come gli esempi (un file che non si apre resta
//   nell'elenco col motivo, e «Scegli» è spento), e «Da un altro file…», da qualunque progetto; in fondo il gruppo e
//   «Aggiungi il progetto aperto», attivo solo se il progetto aperto è segnato come libreria;
// - che cosa: le procedure e funzioni della sorgente con una spunta ciascuna e, sotto, il riepilogo di ciò che entra,
//   che la finestra NON calcola: lo chiede al nucleo (`riepilogoDellImportazione`) a ogni spunta e a ogni scelta
//   cambiata. Un conflitto ha le sue scelte (della stessa specie tre, di un'altra solo la rinomina) e il nome proposto
//   modificabile; gli avvisi dicono la firma diversa (di una sostituita e di una che non si importa), i casi eliminati
//   e i risultati che possono cambiare di una sostituita, la costante sostituita, i dati interni che urtano e, sotto il
//   riepilogo, gli errori che il programma avrebbe dopo l'importazione se prima non ne aveva (il controllo statico sulla
//   prova dell'importazione: anche una ricorsione nata da due scelte, o una funzione già con un errore nella sorgente).
//   Con i casi d'uso, le opzioni del progetto diverse nella sorgente (le cifre dei reali, il carattere di riempimento):
//   restano quelle del programma, e un caso importato può non essere raggiunto. Una procedura o funzione col nome di una
//   più sopra (una sorgente scritta a mano) non si spunta, e dice perché.
//   Un nome scelto che il nucleo rifiuta (non valido, già usato) si dice sotto il suo campo, e «Importa» resta spento;
//   spento anche quando non entra niente, o quando il nucleo la rifiuta per un altro motivo (nessuna via lo raggiunge
//   oggi: importato ogni file del corpus in ogni altro, con ogni scelta, il nucleo rifiuta solo i nomi).
//   «Importa» applica l'importazione in un passo solo.
// I gruppi aperti e il gruppo dell'ultima aggiunta durano finché l'app resta aperta, come negli esempi.
import { useEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from "react";
import { controlla, type Tetti } from "../../core/controllo/controllo";
import { partiDellIntestazione } from "../../core/disegno/impaginazione";
import { importa, omonimeDopoLaPrima, opzioniDiverse, riepilogoDellImportazione, type Scelta, type VoceDellImportazione } from "../../core/modifica/importa";
import type { Funzione, Progetto } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import { testiDelDisegno } from "../disegno/testi";
import { cerca, gruppoDi, testoDelProblema, type Esempio, type EsempiDellaCartella } from "../esempi";
import { gruppoValido } from "../nomi";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

/** La voce «Nuovo gruppo…» dell'elenco dei gruppi: una barra, che il nome di un gruppo non può avere. */
const NUOVO = "/";

/** Il progetto da cui si importa: il nome mostrato (del progetto) e dove sta. */
export interface Sorgente {
  readonly nome: string;
  readonly percorso: string;
  readonly progetto: Progetto;
}

/** Ciò che «Da un altro file…» trova: la sorgente, il motivo per cui il file non si apre, o niente (l'utente rinuncia). */
export type DaUnFile = { readonly sorgente: Sorgente } | { readonly errore: string } | null;

interface Proprieta {
  aperta: boolean;
  /** Dove sta la cartella delle librerie; vuota fuori dal guscio (la cartella è in memoria). */
  cartella: string;
  librerie: EsempiDellaCartella;
  /** Il progetto che riceve, e il primo identificatore libero della sua cronologia (per provare i nomi scelti). */
  progetto: Progetto;
  prossimo: number;
  /** I limiti delle impostazioni, per il controllo statico del programma prima e dopo l'importazione. */
  limiti: Tetti;
  testi: Dizionario;
  lingua: Lingua;
  daUnAltroFile: () => Promise<DaUnFile>;
  /** L'importazione, in un passo solo. */
  importa: (s: Sorgente, spuntate: readonly string[], conCasi: boolean, scelte: ReadonlyMap<string, Scelta>) => void;
  /** Il progetto aperto nel gruppo dato; assente se il progetto aperto non è una libreria. */
  aggiungi: ((gruppo: string) => void) | undefined;
  chiudi: () => void;
}

export function FinestraImporta(p: Proprieta): ReactElement {
  const [aperti, setAperti] = useState<ReadonlySet<string>>(new Set());
  const [ultimo, setUltimo] = useState<string | null>(null);
  const ricerca = useRef<HTMLInputElement>(null);
  return (
    <Finestra aperta={p.aperta} titolo={p.testi.importaTitolo} rinuncia={p.chiudi} larga iniziale={() => ricerca.current}>
      <Contenuto
        {...p}
        campo={ricerca}
        aperti={aperti}
        cambia={(nome, aperto) => setAperti((a) => (aperto ? new Set([...a, nome]) : new Set([...a].filter((x) => x !== nome))))}
        ultimo={ultimo}
        aggiungi={
          p.aggiungi === undefined
            ? undefined
            : (gruppo) => {
                setUltimo(gruppo);
                setAperti((a) => new Set([...a, gruppo]));
                p.aggiungi!(gruppo);
              }
        }
      />
    </Finestra>
  );
}

type Interni = Proprieta & {
  campo: RefObject<HTMLInputElement | null>;
  aperti: ReadonlySet<string>;
  cambia: (gruppo: string, aperto: boolean) => void;
  ultimo: string | null;
};

/** Il contenuto, montato a ogni apertura: si riparte dalla scelta della libreria. */
function Contenuto(p: Interni): ReactElement {
  const [sorgente, setSorgente] = useState<Sorgente | null>(null);
  return sorgente === null ? <DaDove {...p} scegli={setSorgente} /> : <CheCosa {...p} sorgente={sorgente} cambiaSorgente={() => setSorgente(null)} />;
}

function DaDove({ cartella, librerie, testi, lingua, daUnAltroFile, aggiungi, campo, aperti, cambia, ultimo, scegli }: Interni & { scegli: (s: Sorgente) => void }): ReactElement {
  // Tornati qui con «Cambia», che non c'è più: il fuoco alla ricerca (all'apertura lo dà già la finestra).
  useEffect(() => campo.current?.focus(), [campo]);
  const [cercato, setCercato] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const cercando = cercato.trim() !== "";
  const mostrate = cerca(librerie, cercato);
  const vuota = librerie.sciolti.length === 0 && librerie.gruppi.length === 0;

  // Il gruppo dove aggiungere, come negli esempi: i gruppi che ci sono, e «Le mie librerie» se non c'è.
  const gruppi = librerie.gruppi.map((g) => g.nome);
  const miei = gruppoDi(gruppi, testi.importaGruppoMiei);
  const [scelto, setScelto] = useState(ultimo !== null ? gruppoDi(gruppi, ultimo) : miei);
  const scelte = [...new Set([...gruppi, miei, ...(scelto === NUOVO ? [] : [scelto])])];
  const [nuovo, setNuovo] = useState("");
  const gruppo = gruppoDi(gruppi, scelto === NUOVO ? nuovo.trim() : scelto);
  const valido = scelto !== NUOVO || gruppoValido(gruppo);
  const siAggiunge = aggiungi !== undefined && valido;

  const riga = (e: Esempio) => (
    <li key={`${e.gruppo ?? ""}/${e.nome}`} className={stili.esempio}>
      <span className={stili.nome}>
        <strong className={stili.titoloDellEsempio}>{e.progetto?.metadata.name ?? e.nome}</strong>
        {e.progetto?.metadata.description && <span className={stili.descrizione}>{e.progetto.metadata.description}</span>}
        {e.problema && <span className={stili.errore}>{riempi(testi.esempioNonSiApre, { motivo: testoDelProblema(e.problema, testi) })}</span>}
        <span className={stili.etichetta}>
          {e.progetto === null ? e.nome : riempi(testi.importaQuante, { file: e.nome, n: String(e.progetto.functions.filter((f) => f.kind !== "main").length) })}
        </span>
      </span>
      <button
        type="button"
        className={stili.comando}
        aria-disabled={e.progetto === null}
        onClick={e.progetto === null ? undefined : () => scegli({ nome: e.progetto!.metadata.name, percorso: [cartella, e.gruppo, e.nome].filter((x) => x !== null && x !== "").join(cartella.includes("/") ? "/" : "\\"), progetto: e.progetto! })}
      >
        {testi.importaScegli}
      </button>
    </li>
  );

  return (
    <>
      <Descrizione className={stili.spiegazione}>{testi.importaSpiegazione}</Descrizione>
      {cartella !== "" && <p className={`${stili.spiegazione} ${stili.percorso}`}>{riempi(testi.importaCartella, { cartella })}</p>}
      <input ref={campo} type="search" className={stili.campo} aria-label={testi.importaCerca} placeholder={testi.importaCerca} value={cercato} onChange={(e) => setCercato(e.currentTarget.value)} />
      {vuota ? (
        <p className={stili.spiegazione}>{testi.importaNessuna}</p>
      ) : mostrate.sciolti.length === 0 && mostrate.gruppi.length === 0 ? (
        <p className={stili.spiegazione}>{riempi(testi.importaNessunaTrovata, { testo: cercato.trim() })}</p>
      ) : (
        <div className={stili.esempi}>
          {mostrate.sciolti.length > 0 && <ul className={stili.elenco}>{mostrate.sciolti.map(riga)}</ul>}
          {mostrate.gruppi.map((g) => {
            const aperto = cercando || aperti.has(g.nome);
            return (
              <section key={g.nome} className={stili.gruppoDegliEsempi} data-gruppo={g.nome}>
                <div className={stili.testaDelGruppo}>
                  <button type="button" className={stili.nomeDelGruppo} aria-expanded={aperto} onClick={cercando ? undefined : () => cambia(g.nome, !aperto)}>
                    <span aria-hidden="true" className={stili.freccia}>
                      {aperto ? "▾" : "▸"}
                    </span>
                    {g.nome}
                    <span className={stili.quanti}>({g.esempi.length})</span>
                  </button>
                </div>
                {aperto && (g.esempi.length === 0 ? <p className={stili.spiegazione}>{testi.importaGruppoVuoto}</p> : <ul className={stili.elenco}>{g.esempi.map(riga)}</ul>)}
              </section>
            );
          })}
        </div>
      )}
      <div className={stili.comandi}>
        <button
          type="button"
          className={stili.comando}
          onClick={() =>
            void daUnAltroFile().then((r) => {
              if (r === null) return;
              if ("errore" in r) setErrore(r.errore);
              else scegli(r.sorgente);
            })
          }
        >
          {testi.importaDaFile}
        </button>
      </div>
      {errore !== null && <p className={stili.errore}>{errore}</p>}
      <div className={stili.comandi}>
        <label className={stili.inLinea}>
          {testi.esempiGruppo}
          <select className={stili.campo} value={scelto} onChange={(e) => setScelto(e.currentTarget.value)}>
            {scelte.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value={NUOVO}>{testi.esempiGruppoNuovo}</option>
          </select>
        </label>
        {scelto === NUOVO && (
          <input
            className={stili.campo}
            aria-label={testi.esempiNomeDelGruppo}
            placeholder={testi.esempiNomeDelGruppo}
            aria-invalid={nuovo !== "" && !valido}
            value={nuovo}
            onChange={(e) => setNuovo(e.currentTarget.value)}
          />
        )}
        <button
          type="button"
          className={stili.comando}
          aria-disabled={!siAggiunge}
          onClick={
            siAggiunge
              ? () => {
                  aggiungi!(gruppo);
                  setScelto(gruppo);
                  setNuovo("");
                }
              : undefined
          }
        >
          {testi.importaAggiungi}
        </button>
      </div>
      {aggiungi === undefined && <p className={stili.aiuto}>{testi.importaAggiungiSpento}</p>}
      {scelto === NUOVO && nuovo !== "" && !valido && <p className={stili.errore}>{testi.esempiGruppoNonValido}</p>}
      <div className={stili.comandi}>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </>
  );
}

/** L'intestazione di una procedura o funzione, come nel blocco d'inizio del disegno: il nome in grassetto, *rif*, *out* e
 * il tipo in corsivo. */
function Intestazione({ f, lingua }: { f: Funzione; lingua: Lingua }): ReactElement {
  return (
    <span>
      {partiDellIntestazione(f, testiDelDisegno(lingua)).map((p, i) =>
        p.stile === "grassetto" ? <strong key={i}>{p.testo}</strong> : p.stile === "corsivo" ? <em key={i}>{p.testo}</em> : <span key={i}>{p.testo}</span>,
      )}
    </span>
  );
}

/** Il nome che una voce avrà nel progetto: quello scelto per la rinomina, o il suo. */
const nomeFinale = (v: VoceDellImportazione): string => (v.scelta?.come === "rinomina" ? v.scelta.nome : v.nome);

/** Entra: è nuova, o un conflitto che non si salta. */
const entra = (v: VoceDellImportazione): boolean => v.stato === "nuova" || (v.stato === "conflitto" && v.scelta?.come !== "salta");

/** Se il programma ha errori statici, o è fuori tappa: i suoi casi d'uso non si eseguono. */
const conErrori = (p: Progetto, limiti: Tetti): boolean => {
  const c = controlla(p, limiti);
  return c.fuoriTappa || c.errori.length > 0;
};

function CheCosa({ sorgente, cambiaSorgente, progetto, prossimo, limiti, testi, lingua, importa: applica }: Interni & { sorgente: Sorgente; cambiaSorgente: () => void }): ReactElement {
  const [spuntate, setSpuntate] = useState<readonly string[]>([]);
  // Scelta la sorgente il pulsante premuto non c'è più: il fuoco al primo controllo di questa vista.
  const prima = useRef<HTMLParagraphElement>(null);
  useEffect(() => prima.current?.querySelector<HTMLElement>("button")?.focus(), []);
  const [conCasi, setConCasi] = useState(true);
  const [scelte, setScelte] = useState<ReadonlyMap<string, Scelta>>(new Map());
  const sotto = sorgente.progetto.functions.filter((f) => f.kind !== "main");
  const omonime = useMemo(() => omonimeDopoLaPrima(sorgente.progetto), [sorgente.progetto]);
  const opzioni = useMemo(() => opzioniDiverse(progetto, sorgente.progetto), [progetto, sorgente.progetto]);
  const carattere = (c: string) => (c === " " ? testi.importaLoSpazio : riempi(testi.importaIlCarattere, { carattere: c }));
  // Il riepilogo è del nucleo, con le scelte di adesso; e la prova dell'importazione dice se un nome scelto è rifiutato.
  const { voci, datiCheUrtano } = riepilogoDellImportazione(progetto, sorgente.progetto, spuntate, scelte);
  const prova = spuntate.length === 0 ? undefined : importa(sorgente.progetto, spuntate, { conCasi, scelte })(progetto, prossimo);
  const rifiuto = prova !== undefined && !prova.ok ? prova.rifiuto : undefined;
  const nomeRifiutato = rifiuto !== undefined && (rifiuto.motivo === "nome_non_valido" || rifiuto.motivo === "nome_in_uso") ? rifiuto : undefined;
  // Gli errori dopo l'importazione si dicono solo se il programma prima non ne aveva: quelli di prima non sono suoi.
  const primaConErrori = useMemo(() => conErrori(progetto, limiti), [progetto, limiti]);
  const dopoConErrori = prova?.ok === true && !primaConErrori && conErrori(prova.progetto, limiti);
  const entrano = voci.filter(entra);
  const casi = entrano.reduce((n, v) => n + (v.casi ?? 0), 0);
  const siImporta = entrano.length > 0 && prova?.ok === true;
  const scegli = (chiave: string, s: Scelta) => setScelte((m) => new Map([...m, [chiave, s]]));

  const avvisi = (v: VoceDellImportazione): string[] => {
    if (v.stato !== "conflitto") return [];
    if (v.scelta?.come === "rinomina") return [testi.importaRinominaSegue];
    if (v.scelta?.come === "salta") return v.firmaDiversa ? [testi.importaFirmaDiversaSalta] : [];
    if (v.scelta?.come !== "sostituisci") return [];
    if (v.genere === "constant") return [testi.importaCostanteSostituita];
    return [
      testi.importaSostituitaRisultati,
      ...(v.firmaDiversa ? [testi.importaFirmaDiversa] : []),
      ...(v.casiEliminati === 1 ? [testi.importaCasoEliminato] : (v.casiEliminati ?? 0) > 1 ? [riempi(testi.importaCasiEliminati, { n: String(v.casiEliminati) })] : []),
    ];
  };
  const stato = (v: VoceDellImportazione): string => {
    if (v.stato === "identica") return testi.importaIdentica;
    if (v.stato === "conflitto")
      return v.specie === "altra" ? riempi(testi.importaConflittoAltra, { nome: v.nome }) : riempi(v.genere === "constant" ? testi.importaConflittoCostante : testi.importaConflitto, { nome: v.nome });
    return v.perche.come === "scelta" ? testi.importaEntraScelta : riempi(v.perche.come === "chiamata" ? testi.importaEntraChiamata : testi.importaEntraUsata, { da: v.perche.da });
  };
  const perNome = new Map<string, Funzione>(sotto.map((f) => [`f:${f.id}`, f]));
  const costante = (nome: string) => sorgente.progetto.shared_constants?.find((c) => c.name === nome);

  const voce = (v: VoceDellImportazione) => {
    const f = perNome.get(v.chiave);
    const c = v.genere === "constant" ? costante(v.nome) : undefined;
    const scelta = v.scelta;
    const errore = scelta?.come === "rinomina" && nomeRifiutato?.nome === scelta.nome ? (nomeRifiutato.motivo === "nome_non_valido" ? testi.importaNomeNonValido : testi.importaNomeInUso) : undefined;
    return (
      <li key={v.chiave} className={stili.esempio} data-voce={v.chiave}>
        <span className={stili.nome}>
          <span>
            {f !== undefined ? (
              <Intestazione f={f} lingua={lingua} />
            ) : (
              <>
                {testi.importaCostanteComune} <strong>{v.nome}</strong>
                {c?.initial !== undefined && ` = ${c.initial}`}
              </>
            )}
          </span>
          <span className={stili.etichetta}>{stato(v)}</span>
          {v.stato === "conflitto" && scelta !== undefined && (
            <span className={stili.sceltaDelConflitto}>
              {v.specie === "stessa" && (
                <select
                  className={stili.campo}
                  aria-label={riempi(testi.importaSceltaDi, { nome: v.nome })}
                  value={scelta.come}
                  onChange={(e) => {
                    const come = e.currentTarget.value as Scelta["come"];
                    scegli(v.chiave, come === "rinomina" ? { come, nome: v.proposto! } : { come });
                  }}
                >
                  <option value="rinomina">{testi.importaRinomina}</option>
                  <option value="sostituisci">{testi.importaSostituisci}</option>
                  <option value="salta">{testi.importaSalta}</option>
                </select>
              )}
              {scelta.come === "rinomina" && (
                <input
                  className={stili.campo}
                  aria-label={riempi(testi.importaNomeNuovo, { nome: v.nome })}
                  aria-invalid={errore !== undefined}
                  value={scelta.nome}
                  onChange={(e) => scegli(v.chiave, { come: "rinomina", nome: e.currentTarget.value })}
                />
              )}
            </span>
          )}
          {errore !== undefined && <span className={stili.errore}>{errore}</span>}
          {avvisi(v).map((a) => (
            <span key={a} className={stili.avvisoDelCampo}>
              {a}
            </span>
          ))}
        </span>
      </li>
    );
  };

  return (
    <>
      <p ref={prima} className={stili.spiegazione}>
        <strong>{riempi(testi.importaDa, { nome: sorgente.nome })}</strong> {sorgente.percorso !== "" && <span className={stili.percorso}>({sorgente.percorso})</span>}{" "}
        <button type="button" className={stili.comando} onClick={cambiaSorgente}>
          {testi.importaCambia}
        </button>
      </p>
      {sotto.length === 0 ? (
        <p className={stili.spiegazione}>{testi.importaSenzaFunzioni}</p>
      ) : (
        <fieldset className={stili.scelta}>
          <legend>{testi.importaCheCosa}</legend>
          {sotto.map((f) => (
            <label key={f.id} className={omonime.has(f.id) ? `${stili.opzione} ${stili.opzioneSpenta}` : stili.opzione}>
              <input
                type="checkbox"
                checked={spuntate.includes(f.id)}
                disabled={omonime.has(f.id)}
                aria-describedby={omonime.has(f.id) ? `omonima-${f.id}` : undefined}
                onChange={(e) => {
                  const si = e.currentTarget.checked;
                  setSpuntate((s) => (si ? sotto.filter((g) => g.id === f.id || s.includes(g.id)).map((g) => g.id) : s.filter((id) => id !== f.id)));
                }}
              />
              <Intestazione f={f} lingua={lingua} />
              {omonime.has(f.id) && (
                <span id={`omonima-${f.id}`} className={stili.motivoDellOpzione} data-omonima="">
                  {testi.importaOmonima}
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}
      {sotto.length > 0 &&
        (voci.length === 0 ? (
          <p className={stili.spiegazione}>{testi.importaSpunta}</p>
        ) : (
          <fieldset className={stili.scelta}>
            <legend>{testi.importaEntra}</legend>
            <ul className={stili.elenco}>{voci.map(voce)}</ul>
            {datiCheUrtano.map((d) => (
              <p key={`${d.funzione}/${d.dato}`} className={stili.avvisoDelCampo}>
                {riempi(d.con === "costante" ? testi.importaUrtaCostante : testi.importaUrtaFunzione, { dato: d.dato, funzione: d.funzione })}
              </p>
            ))}
            {dopoConErrori && <p className={stili.avvisoDelCampo}>{testi.importaDopoErrori}</p>}
            {conCasi &&
              casi > 0 &&
              opzioni.map((o) => (
                <p key={o.opzione} className={stili.avvisoDelCampo} data-opzione={o.opzione}>
                  {o.opzione === "real_decimals"
                    ? riempi(testi.importaDecimaliDiversi, { programma: String(o.programma), sorgente: String(o.sorgente), nome: sorgente.nome })
                    : o.opzione === "call_stack_limit"
                      ? riempi(testi.importaPilaDiversa, { programma: String(o.programma), sorgente: String(o.sorgente), nome: sorgente.nome })
                      : riempi(testi.importaRiempimentoDiverso, { programma: carattere(o.programma), sorgente: carattere(o.sorgente), nome: sorgente.nome })}
                </p>
              ))}
            {entrano.length === 0 ? (
              <p className={stili.spiegazione}>{testi.importaNiente}</p>
            ) : (
              <label className={stili.opzione}>
                <input type="checkbox" checked={conCasi} onChange={(e) => setConCasi(e.currentTarget.checked)} /> {riempi(testi.importaConCasi, { n: String(casi) })}
              </label>
            )}
          </fieldset>
        ))}
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} aria-disabled={!siImporta} onClick={siImporta ? () => applica(sorgente, spuntate, conCasi, scelte) : undefined}>
          {testi.importaConferma}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </>
  );
}

/** I nomi che entrano nel progetto, come li dice l'avviso dopo «Importa». */
export const nomiCheEntrano = (progetto: Progetto, sorgente: Progetto, spuntate: readonly string[], scelte: ReadonlyMap<string, Scelta>): string[] =>
  riepilogoDellImportazione(progetto, sorgente, spuntate, scelte).voci.filter(entra).map(nomeFinale);
