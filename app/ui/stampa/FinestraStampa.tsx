// La finestra «Stampa»: in cima di quali procedure e funzioni (tutte, o solo quella mostrata) e, con tutte, la casella
// «Ogni procedura e funzione in un foglio nuovo»; poi le parti nell'ordine in cui escono, ognuna con la sua casella (una
// parte vuota è spenta e non scelta); sotto il flowchart «Adatta al foglio» e il testo minimo in punti (il campo e il
// cursore, legati), la nota dei flowchart che a quei punti non stanno in larghezza ed escono più piccoli e, in pausa, la
// casella dei segni dell'esecuzione; accanto a «Codice in» il menu dei linguaggi accesi nelle Impostazioni (vale anche per
// gli affiancati) e sotto il verso dei fogli del codice (spento con gli affiancati, sempre orizzontali), con la nota di un
// linguaggio che sul progetto non dà il codice; «Flowchart e codice affiancati», che si sceglie solo col flowchart e il
// codice scelti ed esce al loro posto; i colori (i tre modi); il piè di pagina; in fondo il consiglio per avere un PDF (la
// destinazione si sceglie nella finestra del motore, che l'app non comanda). «Stampa…» manda le scelte a chi stampa;
// senza una parte che esca è spento. «Annulla» o Esc chiudono senza stampare. Le scelte partono da quelle date
// (l'ultima stampa della sessione, col linguaggio già fra quelli accesi).
import { useState, type ReactElement } from "react";
import { puntiMassimi, puntiMinimi } from "../../core/disegno/fogli";
import type { Linguaggio } from "../../core/genera/linguaggi";
import type { ModoDiColore } from "../../core/disegno/tavolozza";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { modiDiColore } from "../disegno/esporta";
import { sistemaDelMotore } from "../piattaforma";
import { Descrizione, Finestra, Rinuncia, stili as finestra } from "../finestre/Finestra";
import { Opzioni } from "../finestre/FinestraImpostazioni";
import { partiDellaStampa, partiStampate, testoDellaParte, type ParteDellaStampa, type ScelteDiStampa } from "./parti";
import stili from "./Stampa.module.css";

const testoDeiColori = { colori: "esportaAColori", grigi: "esportaAGrigi", "bianco-e-nero": "esportaInBiancoENero" } as const satisfies Record<ModoDiColore, keyof Dizionario>;

/** Ciò che la finestra sa del progetto: il nome della scheda mostrata, se l'esecuzione è in pausa, le parti piene, la
 * nota dei flowchart ristretti per le scelte di adesso, i linguaggi accesi coi loro nomi e la nota di un linguaggio che
 * non dà il codice (vuota se lo dà). */
export interface DaStampare {
  readonly mostrata: string;
  readonly inPausa: boolean;
  readonly piene: (tutte: boolean) => Readonly<Record<ParteDellaStampa, boolean>>;
  readonly ristretti: (s: ScelteDiStampa) => string;
  readonly linguaggi: readonly { readonly id: Linguaggio; readonly nome: string }[];
  readonly senzaCodice: (l: Linguaggio) => string;
}

function Casella({ testo, nota, scelta, spenta = false, cambia }: { testo: string; nota?: string; scelta: boolean; spenta?: boolean; cambia: (si: boolean) => void }): ReactElement {
  return (
    <label className={stili.voce}>
      <input type="checkbox" checked={scelta && !spenta} disabled={spenta} onChange={(e) => cambia(e.currentTarget.checked)} />
      <span>
        <span>{testo}</span>
        {nota !== undefined && <span className={stili.nota}>{nota}</span>}
      </span>
    </label>
  );
}

export function FinestraStampa({
  cosa,
  scelte,
  testi,
  stampa,
  rinuncia,
}: {
  cosa: DaStampare | null;
  scelte: ScelteDiStampa;
  testi: Dizionario;
  stampa: (s: ScelteDiStampa) => void;
  rinuncia: () => void;
}): ReactElement {
  return (
    <Finestra aperta={cosa !== null} titolo={testi.stampaTitolo} rinuncia={rinuncia}>
      {cosa && <Scelte cosa={cosa} iniziali={scelte} testi={testi} stampa={stampa} />}
    </Finestra>
  );
}

/** Il contenuto, montato a ogni apertura: le scelte ripartono da quelle date. */
function Scelte({ cosa, iniziali, testi, stampa }: { cosa: DaStampare; iniziali: ScelteDiStampa; testi: Dizionario; stampa: (s: ScelteDiStampa) => void }): ReactElement {
  const [s, setS] = useState(iniziali);
  // Il testo del campo dei punti mentre si scrive: un numero fuori dai limiti (o nessuno) non cambia la scelta, e andando
  // altrove il campo torna alla scelta.
  const [scritti, setScritti] = useState(String(iniziali.punti));
  const piene = cosa.piene(s.tutte);
  const parte = (p: ParteDellaStampa, si: boolean) => setS((x) => ({ ...x, parti: { ...x.parti, [p]: si } }));
  const punti = (n: number) => {
    setS((x) => ({ ...x, punti: n }));
    setScritti(String(n));
  };
  const flowchart = s.parti.flowchart && piene.flowchart;
  const codice = s.parti.codice && piene.codice;
  const stampate = partiStampate(s, piene);
  const qualcosa = partiDellaStampa.some((p) => stampate[p]);
  const nota = flowchart ? cosa.ristretti(s) : "";
  const linguaggio = s.linguaggio ?? cosa.linguaggi[0]!.id;
  const senzaCodice = stampate.codice || stampate.affiancati ? cosa.senzaCodice(linguaggio) : "";
  const note: Partial<Record<ParteDellaStampa, string>> = { progetto: testi.stampaNotaProgetto, affiancati: testi.stampaNotaAffiancati };
  // Gli affiancati si scelgono solo col flowchart e il codice.
  const spenta = (p: ParteDellaStampa) => !piene[p] || (p === "affiancati" && !(flowchart && codice));
  return (
    <>
      <fieldset className={stili.gruppo}>
        <legend className={stili.titoloDelGruppo}>{testi.stampaQualiFunzioni}</legend>
        <div className={stili.rientro}>
          <label className={finestra.opzione}>
            <input type="radio" name="funzioni" checked={s.tutte} onChange={() => setS((x) => ({ ...x, tutte: true }))} />
            {testi.stampaTutte}
          </label>
          <div className={stili.rientro}>
            <Casella testo={testi.stampaFoglioNuovo} scelta={s.foglioNuovo} spenta={!s.tutte} cambia={(si) => setS((x) => ({ ...x, foglioNuovo: si }))} />
          </div>
          <label className={finestra.opzione}>
            <input type="radio" name="funzioni" checked={!s.tutte} onChange={() => setS((x) => ({ ...x, tutte: false }))} />
            {riempi(testi.stampaSoloMostrata, { nome: cosa.mostrata })}
          </label>
        </div>
      </fieldset>
      <fieldset className={stili.gruppo} data-parti="">
        <legend className={stili.titoloDelGruppo}>{testi.stampaSpiegazione}</legend>
        {partiDellaStampa.map((p) => (
          <div key={p} className={stili.gruppo}>
            {p === "codice" ? (
              <div className={stili.codiceIn}>
                <Casella testo={testi[testoDellaParte[p]]} scelta={s.parti[p]} spenta={spenta(p)} cambia={(si) => parte(p, si)} />
                <select className={finestra.campo} aria-label={testi.stampaLinguaggio} value={linguaggio}
                  onChange={(e) => {
                    const l = e.currentTarget.value as Linguaggio;
                    setS((x) => ({ ...x, linguaggio: l }));
                  }}
                >
                  {cosa.linguaggi.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <Casella testo={testi[testoDellaParte[p]]} {...(note[p] !== undefined ? { nota: note[p] } : {})} scelta={s.parti[p]} spenta={spenta(p)} cambia={(si) => parte(p, si)} />
            )}
            {p === "codice" && (
              <div className={stili.rientro}>
                {([false, true] as const).map((o) => (
                  <label key={String(o)} className={finestra.opzione}>
                    <input type="radio" name="verso" checked={s.codiceOrizzontale === o} disabled={!stampate.codice} onChange={() => setS((x) => ({ ...x, codiceOrizzontale: o }))} />
                    {o ? testi.stampaOrizzontale : testi.stampaVerticale}
                  </label>
                ))}
                {senzaCodice !== "" && (
                  <p className={stili.ristretto} data-senza-codice="">
                    {senzaCodice}
                  </p>
                )}
              </div>
            )}
            {p === "flowchart" && (
              <div className={stili.rientro}>
                <Casella testo={testi.stampaAdatta} nota={testi.stampaNotaAdatta} scelta={s.adatta} spenta={!flowchart} cambia={(si) => setS((x) => ({ ...x, adatta: si }))} />
                <div className={stili.voce}>
                  <span />
                  <span>
                    <span>{testi.stampaPunti}</span>
                    <span className={stili.nota}>{testi.stampaNotaPunti}</span>
                  </span>
                </div>
                <div className={stili.punti}>
                  <input
                    type="range"
                    className={finestra.cursore}
                    aria-label={testi.stampaPunti}
                    min={puntiMinimi}
                    max={puntiMassimi}
                    step={1}
                    value={s.punti}
                    disabled={!flowchart}
                    onChange={(e) => punti(Number(e.currentTarget.value))}
                  />
                  <input
                    type="number"
                    className={finestra.campo}
                    aria-label={testi.stampaPunti}
                    min={puntiMinimi}
                    max={puntiMassimi}
                    step={1}
                    value={scritti}
                    disabled={!flowchart}
                    onChange={(e) => {
                      const t = e.currentTarget.value;
                      setScritti(t);
                      const n = Number(t);
                      if (t.trim() !== "" && Number.isInteger(n) && n >= puntiMinimi && n <= puntiMassimi) setS((x) => ({ ...x, punti: n }));
                    }}
                    onBlur={() => setScritti(String(s.punti))}
                  />
                </div>
                {nota !== "" && (
                  <p className={stili.ristretto} data-ristretti="">
                    {nota}
                  </p>
                )}
                {cosa.inPausa && <Casella testo={testi.stampaSegni} nota={testi.stampaNotaSegni} scelta={s.segni} spenta={!flowchart} cambia={(si) => setS((x) => ({ ...x, segni: si }))} />}
              </div>
            )}
          </div>
        ))}
      </fieldset>
      <Opzioni legenda={testi.esportaColori} nome="colori" valore={s.colori} ammessi={modiDiColore} testo={(c) => testi[testoDeiColori[c]]} cambia={(colori) => setS((x) => ({ ...x, colori }))} />
      <fieldset className={stili.gruppo}>
        <legend className={stili.titoloDelGruppo}>{testi.stampaPiede}</legend>
        <div className={stili.rientro}>
          <Casella testo={testi.stampaNumeri} scelta={s.numeri} cambia={(si) => setS((x) => ({ ...x, numeri: si }))} />
          <Casella testo={testi.stampaData} scelta={s.data} cambia={(si) => setS((x) => ({ ...x, data: si }))} />
        </div>
      </fieldset>
      <Descrizione className={stili.consiglio}>{sistemaDelMotore() === "linux" ? testi.stampaConsiglioPdfLinux : testi.stampaConsiglioPdf}</Descrizione>
      <div className={finestra.comandi}>
        <Rinuncia type="button" className={finestra.comando}>
          {testi.annullaEsc}
        </Rinuncia>
        <button type="button" className={finestra.comando} disabled={!qualcosa} onClick={() => stampa(s)}>
          {testi.stampa}
        </button>
      </div>
    </>
  );
}
