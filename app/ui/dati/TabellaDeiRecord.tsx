// La tabella «Record» in cima alla vista dei dati: i tipi coi campi del progetto, visibili da ogni funzione come le costanti
// comuni. Una riga per record, col nome e i campi in fila; la riga si sceglie col fuoco, il doppio clic o Invio aprono la
// SCHEDA sotto di lei, Canc la cancella, il tasto destro (o il tasto Menu, o Maiusc+F10) apre il suo menu (Elimina, Duplica,
// Sposta su e giù: lo stesso dei dati). Nella scheda il nome del record e una riga per campo (nome, tipo semplice, lunghezza
// di una stringa, i comandi per spostarlo e toglierlo), «Aggiungi un campo», gli errori del record nel progetto candidato e
// i comandi; Invio conferma, Esc annulla, un clic fuori conferma, come la scheda di un dato.
//
// Natura, ruolo e valore iniziale non stanno qui: sono di ogni dato che ha il tipo del record.
//
// Ogni riga porta i segni del controllo statico come quella di un dato (`aria-invalid`, la descrizione).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { tipi, type DefinizioneDelRecord, type Tipo } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import type { SegnalazioneMostrata } from "../disegno/EditorDelBlocco";
import stiliDeiCampi from "../disegno/EditorDelBlocco.module.css";
import { useConfermaFuori } from "../fuori";
import { tastoCheElimina } from "../modifiche";
import { Segnalazioni } from "./CampiDelDato";
import { azioniDellaRiga, MenuDellaRiga } from "./MenuDellaRiga";
import { campoNuovo, spostaCampo, type BozzaDelRecord } from "./record";
import stili from "./VistaDati.module.css";

/** Il segno di una riga di un record, nel documento. */
export const chiaveDelRecord = (indice: number) => `record-${indice}`;

const nomiDeiTipi: Record<Tipo, keyof Dizionario> = {
  integer: "tipoIntero",
  real: "tipoReale",
  character: "tipoCarattere",
  string: "tipoStringa",
  boolean: "tipoBooleano",
};

export interface ModificaDeiRecord {
  /** Il record di cui si scrivono i campi (la sua posizione), con la bozza. */
  readonly inModifica: { readonly indice: number; readonly bozza: BozzaDelRecord } | null;
  readonly apri: (indice: number) => void;
  readonly cambia: (bozza: BozzaDelRecord) => void;
  /** `torna` dice se il fuoco torna sulla riga (dopo Invio). */
  readonly conferma: (torna: boolean) => void;
  readonly rinuncia: () => void;
  readonly elimina: (indice: number) => void;
  readonly duplica: (indice: number) => void;
  readonly sposta: (indice: number, verso: -1 | 1) => void;
  /** Gli errori del record in modifica, nel progetto candidato. */
  readonly candidato: readonly SegnalazioneMostrata[];
}

const testoDelSegno = (s: SegnalazioneMostrata, testi: Dizionario) =>
  riempi(s.genere === "errore" ? testi.segnalazioneErrore : testi.segnalazioneAvviso, { breve: s.breve });

const apreIlMenu = (e: KeyboardEvent) => (e.shiftKey ? e.key === "F10" : e.key === "ContextMenu");

export function TabellaDeiRecord({
  records,
  segni,
  testi,
  modifica,
}: {
  records: readonly DefinizioneDelRecord[];
  segni: ReadonlyMap<number, readonly SegnalazioneMostrata[]>;
  testi: Dizionario;
  /** Senza, i record sono in sola lettura. */
  modifica?: ModificaDeiRecord | undefined;
}): ReactElement {
  const prefisso = useId();
  const [menu, setMenu] = useState<{ indice: number; x: number; y: number } | null>(null);
  const descrizioni: ReactElement[] = [];
  const nomeDi = (r: DefinizioneDelRecord | undefined) => r?.name || testi.datoSenzaNome;

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
    e.preventDefault();
    const { clientX: x, clientY: y } = e;
    setMenu({ indice, x, y });
  };

  return (
    <>
      <table className={stili.tabella} data-record-tabella="">
        <caption className={stili.didascalia}>{testi.recordTitolo}</caption>
        <thead>
          <tr>
            <th scope="col">{testi.datiNome}</th>
            <th scope="col">{testi.recordCampi}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, indice) => {
            const suoi = segni.get(indice) ?? [];
            const errore = suoi.some((s) => s.genere === "errore");
            const idDescrizione = `${prefisso}-${indice}`;
            if (suoi.length > 0)
              descrizioni.push(
                <span key={indice} id={idDescrizione}>
                  {suoi.map((s) => testoDelSegno(s, testi)).join(" ")}
                </span>,
              );
            const inScrittura = modifica?.inModifica?.indice === indice ? modifica.inModifica : null;
            return [
              <tr
                key={indice}
                data-record={chiaveDelRecord(indice)}
                data-segno={suoi.length === 0 ? undefined : errore ? "errore" : "avviso"}
                aria-invalid={errore || undefined}
                aria-describedby={suoi.length > 0 ? idDescrizione : undefined}
                title={suoi.length > 0 ? suoi.map((s) => testoDelSegno(s, testi)).join("\n") : undefined}
                tabIndex={0}
                className={stili.riga}
                onDoubleClick={modifica ? () => modifica.apri(indice) : undefined}
                onKeyDown={modifica ? (e) => tasto(e, indice) : undefined}
                onContextMenu={modifica ? menuSu(indice) : undefined}
              >
                <th scope="row">{r.name}</th>
                <td className={stili.codice}>{r.fields.map((c) => c.name).join(", ")}</td>
              </tr>,
              inScrittura && modifica && (
                <tr key={`${indice}-scheda`} className={stili.rigaDellaScheda}>
                  <td colSpan={2}>
                    <SchedaDelRecord nome={r.name} bozza={inScrittura.bozza} modifica={modifica} elimina={() => modifica.elimina(indice)} testi={testi} />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
      {descrizioni.length > 0 && <div className={stili.nascosto}>{descrizioni}</div>}
      {modifica && (
        <MenuDellaRiga
          dove={menu}
          nome={riempi(testi.menuDelRecord, { nome: nomeDi(menu ? records[menu.indice] : undefined) })}
          testi={testi}
          azioni={azioniDellaRiga(menu?.indice ?? -1, records.length, { elimina: modifica.elimina, duplica: modifica.duplica, sposta: modifica.sposta }, () => setMenu(null))}
          chiudi={(torna) => {
            if (torna && menu) document.querySelector<HTMLElement>(`[data-record="${chiaveDelRecord(menu.indice)}"]`)?.focus();
            setMenu(null);
          }}
        />
      )}
    </>
  );
}

/** La scheda di un record: il nome, i campi, gli errori, i comandi. Il fuoco va nel nome all'apertura. */
function SchedaDelRecord({
  nome,
  bozza,
  modifica,
  elimina,
  testi,
}: {
  /** Il nome del record com'è prima della modifica. */
  nome: string;
  bozza: BozzaDelRecord;
  modifica: ModificaDeiRecord;
  elimina: () => void;
  testi: Dizionario;
}): ReactElement {
  const modulo = useRef<HTMLFormElement>(null);
  useConfermaFuori(modulo, modifica.conferma);
  const [conGuida, setConGuida] = useState(false);
  useEffect(() => {
    modulo.current?.querySelector<HTMLElement>("input")?.focus();
  }, []);
  const cambiaCampo = (k: number, c: Partial<BozzaDelRecord["campi"][number]>) => modifica.cambia({ ...bozza, campi: bozza.campi.map((x, i) => (i === k ? { ...x, ...c } : x)) });

  function tasto(e: KeyboardEvent): void {
    if (e.key === "Escape") modifica.rinuncia();
    else if (e.key === "Enter" && (e.target as Element).tagName !== "BUTTON") modifica.conferma(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <form
      ref={modulo}
      aria-label={riempi(testi.modificaDelRecord, { nome: nome || testi.datoSenzaNome })}
      className={stili.scheda}
      onKeyDown={tasto}
      onSubmit={(e) => {
        e.preventDefault();
        modifica.conferma(true);
      }}
    >
      <label className={stili.voce}>
        <span className={stili.etichetta}>{testi.recordNome}</span>
        <input
          aria-label={testi.recordNome}
          className={`${stili.campo} ${stili.codice}`}
          spellCheck={false}
          autoComplete="off"
          value={bozza.nome}
          onChange={(e) => modifica.cambia({ ...bozza, nome: e.currentTarget.value })}
        />
      </label>
      <table className={stili.campiDelRecord}>
        <thead>
          <tr>
            <th scope="col">{testi.recordCampo}</th>
            <th scope="col">{testi.datiTipo}</th>
            <th scope="col">{testi.campoLunghezza}</th>
            <th scope="col">
              <span className={stili.nascosto}>{testi.comandiDellaRiga}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bozza.campi.map((c, k) => {
            const n = String(k + 1);
            const chi = c.nome || testi.datoSenzaNome;
            return (
              <tr key={k} data-campo-del-record={k}>
                <td>
                  <input
                    aria-label={riempi(testi.recordNomeDelCampo, { n })}
                    className={`${stili.campo} ${stili.codice}`}
                    spellCheck={false}
                    autoComplete="off"
                    value={c.nome}
                    onChange={(e) => cambiaCampo(k, { nome: e.currentTarget.value })}
                  />
                </td>
                <td>
                  <select aria-label={riempi(testi.recordTipoDelCampo, { n })} className={stili.campo} value={c.tipo} onChange={(e) => cambiaCampo(k, { tipo: e.currentTarget.value as Tipo })}>
                    {tipi.map((t) => (
                      <option key={t} value={t}>
                        {testi[nomiDeiTipi[t]]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {c.tipo === "string" ? (
                    <input
                      aria-label={riempi(testi.recordLunghezzaDelCampo, { n })}
                      className={stili.campo}
                      type="number"
                      step={1}
                      min={1}
                      value={c.lunghezza}
                      onChange={(e) => cambiaCampo(k, { lunghezza: e.currentTarget.value })}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  <span className={stili.insieme}>
                    <button type="button" className={stili.togli} aria-label={riempi(testi.recordSuIlCampo, { nome: chi })} title={riempi(testi.recordSuIlCampo, { nome: chi })} disabled={k === 0} onClick={() => modifica.cambia(spostaCampo(bozza, k, -1))}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className={stili.togli}
                      aria-label={riempi(testi.recordGiuIlCampo, { nome: chi })}
                      title={riempi(testi.recordGiuIlCampo, { nome: chi })}
                      disabled={k === bozza.campi.length - 1}
                      onClick={() => modifica.cambia(spostaCampo(bozza, k, 1))}
                    >
                      ↓
                    </button>
                    <button type="button" className={stili.togli} aria-label={riempi(testi.recordEliminaIlCampo, { nome: chi })} title={riempi(testi.recordEliminaIlCampo, { nome: chi })} onClick={() => modifica.cambia({ ...bozza, campi: bozza.campi.filter((_, i) => i !== k) })}>
                      ×
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div>
        <button type="button" className={stili.comando} onClick={() => modifica.cambia({ ...bozza, campi: [...bozza.campi, campoNuovo] })}>
          {testi.recordAggiungiCampo}
        </button>
      </div>
      {conGuida && (
        <p className={stiliDeiCampi.guida} data-guida>
          {testi.guidaRecord}
        </p>
      )}
      <Segnalazioni segnalazioni={modifica.candidato} testi={testi} />
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} onClick={elimina}>
          {testi.recordElimina}
        </button>
        <button type="button" className={stiliDeiCampi.aiuto} aria-label={testi.suggerimenti} title={testi.suggerimenti} aria-expanded={conGuida} onClick={() => setConGuida((g) => !g)}>
          ?
        </button>
        <button type="submit" className={stili.comando}>
          {testi.conferma}
        </button>
        <button type="button" className={stili.comando} onClick={modifica.rinuncia}>
          {testi.rinuncia}
        </button>
      </div>
    </form>
  );
}
