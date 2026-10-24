// Le differenze di un caso, sotto il caso scelto: l'esito dell'esecuzione del nucleo (`core/casi/esito.ts`) mostrato
// com'è, senza confronti propri. «Raggiunto» o «Non raggiunto» col numero delle differenze; per l'output l'atteso e
// l'ottenuto coi loro a capo visibili e la prima differenza segnata (dove la dice il nucleo); per un errore il suo
// testo e il blocco; gli avvisi diversi a parte, anche in un caso raggiunto. Coi comandi, accanto a un errore diverso
// «Attendi questo errore» (se l'esecuzione ne ha ottenuto uno) o «Togli l'errore atteso» (se non ne ha ottenuto), e
// accanto agli avvisi diversi «Scrivi gli avvisi»: che cosa scrivono nell'atteso lo decide il nucleo, dall'esito.
//
// I segni che non fanno parte del testo (la freccia dell'a capo, «(niente)», «(finisce qui)») portano
// `data-segno-testo`: tolti loro, il riquadro ha il testo esatto.

import type { ReactElement, ReactNode } from "react";
import { primaDifferenza, type Campo, type EsitoDelCaso } from "../../core/casi/esito";
import { nonSiAttendono, type CasoDiUnaFunzione, type Segnalazione } from "../../core/progetto/modello";
import type { testiDeiCodici } from "../../i18n/codici";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import stili from "./VistaCasi.module.css";

type Codici = (typeof testiDeiCodici)["it"];

/** Un testo con ogni a capo reso visibile da una freccia (che non fa parte del testo). */
function conGliACapo(s: string): ReactNode[] {
  return s.split("\n").flatMap((riga, i, tutte) => (i < tutte.length - 1 ? [riga, <span key={i} data-segno-testo="" aria-hidden="true" className={stili.aCapo}>↵</span>, "\n"] : [riga]));
}

function TestoMostrato({ testo, da, finisce, testi }: { testo: string; da: number; finisce: boolean; testi: Dizionario }): ReactElement {
  if (testo === "")
    return (
      <span data-segno-testo="" className={stili.nota}>
        {finisce ? testi.diffFinisceQui : testi.diffNiente}
      </span>
    );
  const prima = testo.slice(0, da);
  const dopo = testo.slice(da);
  return (
    <>
      {conGliACapo(prima)}
      {dopo !== "" ? (
        <mark className={stili.differenza}>{conGliACapo(dopo)}</mark>
      ) : (
        finisce && (
          <mark data-segno-testo="" className={stili.differenza}>
            {testi.diffFinisceQui}
          </mark>
        )
      )}
    </>
  );
}

/** I comandi che scrivono nell'atteso ciò che l'esito ha ottenuto. */
export interface ComandiDallEsito {
  readonly attendiErrore: () => void;
  readonly togliErrore: () => void;
  readonly scriviAvvisi: () => void;
}

export function Differenze({
  esito,
  caso,
  testi,
  codici,
  nomeDi,
  comandi,
}: {
  esito: EsitoDelCaso;
  caso: CasoDiUnaFunzione;
  testi: Dizionario;
  codici: Codici;
  /** Il nome di un blocco del progetto eseguito (o della fine). */
  nomeDi: (blocco: string) => string;
  /** Senza, le differenze si leggono soltanto. */
  comandi?: ComandiDallEsito | undefined;
}): ReactElement {
  if (esito.fuoriTappa)
    return (
      <div data-differenze="" className={stili.differenze}>
        {testi.esitoFuoriTappa}
      </div>
    );
  const segnalazione = (s: Segnalazione<string> | undefined) =>
    s === undefined ? testi.diffNessuno : riempi(testi.diffSegnalazione, { breve: codici[s.code as keyof Codici].breve, dove: nomeDi(s.block) });
  const elenco = (a: readonly Segnalazione<string>[] | undefined) => (a && a.length > 0 ? a.map(segnalazione).join("; ") : testi.diffNessuno);
  const nomeDel: Record<Campo, string> = { output: testi.diffOutput, error: testi.diffErrore, static_error: testi.diffErroreStatico };
  const atteso = caso.expected;
  const ottenuto = esito.ottenuto;
  const n = esito.differenze.length;
  return (
    <div data-differenze="" data-esito={esito.raggiunto ? "raggiunto" : "non-raggiunto"} className={stili.differenze}>
      <p className={stili.titoloEsito}>
        <strong>{esito.raggiunto ? testi.esitoRaggiunto : testi.esitoNonRaggiunto}</strong>
        {esito.raggiunto
          ? `: ${atteso.static_error ? testi.diffRaggiuntoStatico : atteso.error ? testi.diffRaggiuntoErrore : testi.diffRaggiunto}`
          : ` (${n === 1 ? testi.diffUna : riempi(testi.diffTante, { n: String(n) })}):`}
      </p>
      {esito.differenze.map((d) => {
        if (d.campo === "output") {
          const k = primaDifferenza(d.atteso, d.ottenuto);
          return (
            <div key={d.campo} data-campo={d.campo} className={stili.campoDiverso}>
              <strong>{nomeDel[d.campo]}</strong> — {testi.diffAtteso}:
              <pre data-atteso="" className={stili.testo}>
                <TestoMostrato testo={d.atteso} da={k} finisce={d.atteso.length < d.ottenuto.length} testi={testi} />
              </pre>
              {testi.diffOttenuto}:
              <pre data-ottenuto="" className={stili.testo}>
                <TestoMostrato testo={d.ottenuto} da={k} finisce={d.ottenuto.length < d.atteso.length} testi={testi} />
              </pre>
              {d.tagliato && <p className={stili.nota}>{testi.diffTagliato}</p>}
            </div>
          );
        }
        return (
          <p key={d.campo} data-campo={d.campo} className={stili.campoDiverso}>
            <strong>{nomeDel[d.campo]}</strong> — {testi.diffAtteso}:{" "}
            <span data-atteso="" data-segnalazione={d.atteso}>
              {segnalazione(atteso[d.campo])}
            </span>
            ; {testi.diffOttenuto}:{" "}
            <span data-ottenuto="" data-segnalazione={d.ottenuto}>
              {segnalazione(ottenuto[d.campo])}
            </span>
            {/* Un errore che non si attende (il nucleo lo rifiuta): nessun comando. */}
            {comandi && !(d.campo === "error" && ottenuto.error !== undefined && nonSiAttendono.has(ottenuto.error.code)) && (
              <button
                type="button"
                className={stili.comandoDallEsito}
                onClick={ottenuto[d.campo] !== undefined ? comandi.attendiErrore : comandi.togliErrore}
              >
                {ottenuto[d.campo] !== undefined ? testi.attendiErrore : testi.togliErroreAtteso}
              </button>
            )}
          </p>
        );
      })}
      {esito.avvisi && (
        <div data-avvisi="" data-attesi={esito.avvisi.attesi} data-ottenuti={esito.avvisi.ottenuti} className={stili.avvisi}>
          {esito.raggiunto && <p>{testi.diffAvvisiRaggiunto}</p>}
          <p>
            <strong>{testi.diffAvvisi}</strong> — {testi.diffAtteso}: {elenco(atteso.warnings)}; {testi.diffOttenuto}: {elenco(ottenuto.warnings)}
            {comandi && (
              <button type="button" className={stili.comandoDallEsito} onClick={comandi.scriviAvvisi}>
                {/* Senza avvisi ottenuti il comando toglie quelli attesi: lo dice. */}
                {esito.avvisi.ottenuti === "nessuno" ? testi.togliAvvisiAttesi : testi.scriviAvvisi}
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

