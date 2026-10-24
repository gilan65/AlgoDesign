// I colori dei singoli generi di blocco nella scheda «Aspetto» delle Impostazioni: una riga per genere, col suo nome, il
// blocco disegnato coi colori della scelta (non ancora confermata) e i quadratini delle tinte, il primo «Come l'insieme».
// I quadratini sono pulsanti di opzione nativi (le frecce passano dall'uno all'altro), col nome della tinta per gli
// ausili e al passaggio del puntatore del mouse. Il riquadro ha l'insieme della scelta (`data-colori`) e le variabili dei
// generi scelti: le forme e il «Come l'insieme» si colorano come si colorerà il flowchart.
import type { ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { generiColorati, tinteDeiBlocchi, tinteDi, variabiliDei, type ColoriDeiBlocchi, type GenereColorato, type Tinta } from "../colori";
import type { Colori } from "../preferenze";
import disegno from "../disegno/Flowchart.module.css";
import stili from "./ColoriDeiBlocchi.module.css";
import { stili as finestra } from "./Finestra";

/** Il nome di un genere, come lo dicono l'elenco dei blocchi e le Impostazioni. */
function nomeDel(g: GenereColorato, t: Dizionario): string {
  return {
    "inizio-e-fine": t.genereInizioEFine,
    assegnazione: t.bloccoAssegnazione,
    procedura: t.bloccoProcedura,
    lettura: t.bloccoLettura,
    scrittura: t.bloccoScrittura,
    se: t.bloccoSe,
    cicli: t.genereCicli,
    commento: t.bloccoCommento,
    riquadro: t.riquadroDeiCicli,
  }[g];
}

/** Il nome di una tinta: il colore, «intenso» per le intense. */
export function nomeDellaTinta(tinta: Tinta, t: Dizionario): string {
  const colore = tinta.replace(/^linea-/, "").replace(/-intenso$/, "");
  const nome = {
    bianco: t.tintaBianco,
    grigio: t.tintaGrigio,
    sabbia: t.tintaSabbia,
    verde: t.tintaVerde,
    acqua: t.tintaAcqua,
    azzurro: t.tintaAzzurro,
    viola: t.tintaViola,
    malva: t.tintaMalva,
    rosa: t.tintaRosa,
    arancione: t.tintaArancione,
    blu: t.tintaBlu,
    rosso: t.tintaRosso,
  }[colore]!;
  // Il colore dopo un'altra parola («Deep green») perde la maiuscola.
  return tinta.endsWith("-intenso") ? riempi(t.tintaIntensa, { colore: t.tintaIntensa.startsWith("{colore}") ? nome : nome.toLowerCase() }) : nome;
}

const L = 112;
const H = 30;

/** Il blocco del genere, con le classi del flowchart: il colore è quello che il flowchart avrà. */
function Esempio({ genere, testi }: { genere: GenereColorato; testi: Dizionario }): ReactElement {
  const testo = {
    "inizio-e-fine": testi.disegnoInizio,
    assegnazione: testi.esempioAssegnazione,
    procedura: testi.esempioProcedura,
    lettura: testi.esempioLettura,
    scrittura: testi.esempioScrittura,
    se: testi.esempioSe,
    cicli: testi.esempioCiclo,
    commento: testi.esempioCommento,
    riquadro: riempi(testi.disegnoPer, { contatore: "i", da: "1", a: "10" }),
  }[genere];
  const [x, y, w, h] = [4, 4, L, H];
  const romboDi = (c: string) => <polygon className={c} points={`${x + w / 2},${y - 2} ${x + w},${y + h / 2} ${x + w / 2},${y + h + 2} ${x},${y + h / 2}`} />;
  const forma = {
    "inizio-e-fine": <rect className={disegno.inizioEFine} x={x} y={y} width={w} height={h} rx={h / 2} />,
    assegnazione: <rect className={disegno.assegnazione} x={x} y={y} width={w} height={h} />,
    procedura: (
      <>
        <rect className={disegno.procedura} x={x} y={y} width={w} height={h} />
        <line className={disegno.latoDellaChiamata} x1={x + 7} y1={y} x2={x + 7} y2={y + h} />
        <line className={disegno.latoDellaChiamata} x1={x + w - 7} y1={y} x2={x + w - 7} y2={y + h} />
      </>
    ),
    lettura: <polygon className={disegno.lettura} points={`${x + 10},${y} ${x + w},${y} ${x + w - 10},${y + h} ${x},${y + h}`} />,
    scrittura: <polygon className={disegno.scrittura} points={`${x + 10},${y} ${x + w},${y} ${x + w - 10},${y + h} ${x},${y + h}`} />,
    se: romboDi(disegno.se!),
    cicli: romboDi(disegno.cicli!),
    commento: <rect className={disegno.commento} x={x} y={y} width={w} height={h} />,
    riquadro: <rect className={`${disegno.riquadro} ${disegno.conFondo}`} x={x} y={y} width={w} height={h} />,
  }[genere];
  return (
    <svg className={stili.esempio} width={L + 8} height={H + 8} viewBox={`0 0 ${L + 8} ${H + 8}`} aria-hidden="true" data-esempio={genere}>
      {forma}
      <text className={disegno.testo} x={x + w / 2} y={y + h / 2}>
        {testo}
      </text>
    </svg>
  );
}

export function ColoriDeiBlocchi({
  testi,
  insieme,
  colori,
  cambia,
}: {
  testi: Dizionario;
  /** L'insieme della scelta: i colori «Come l'insieme» sono i suoi. */
  insieme: Colori;
  colori: ColoriDeiBlocchi;
  cambia: (colori: ColoriDeiBlocchi) => void;
}): ReactElement {
  const scegli = (g: GenereColorato, tinta: Tinta | undefined) => {
    const { [g]: _, ...altri } = colori;
    cambia(tinta === undefined ? altri : { ...altri, [g]: tinta });
  };
  const nessuno = Object.keys(colori).length === 0;
  return (
    <fieldset className={`${finestra.scelta} ${stili.colori}`} data-colori={insieme} style={variabiliDei(colori)}>
      <legend>{testi.coloriDeiBlocchi}</legend>
      <p className={finestra.spiegazione}>{testi.coloriDeiBlocchiSpiegazione}</p>
      {generiColorati.map((g) => {
        const nome = nomeDel(g, testi);
        const tinte = tinteDi(g);
        const quadratino = (tinta: Tinta | undefined, etichetta: string, sfondo: string) => (
          <label key={tinta ?? ""} className={stili.quadratino} title={etichetta}>
            <input type="radio" name={`colore-${g}`} checked={colori[g] === tinta} aria-label={etichetta} onChange={() => scegli(g, tinta)} data-tinta={tinta ?? ""} />
            <span style={{ background: sfondo }} />
          </label>
        );
        return (
          <div key={g} className={stili.genere} role="radiogroup" aria-label={nome} data-genere={g}>
            <span className={stili.nome}>{nome}</span>
            <Esempio genere={g} testi={testi} />
            <span className={stili.tinte}>
              {/* «Come l'insieme»: il colore del genere nel solo insieme, senza la scelta (un elemento con l'insieme lo
                  dichiara di nuovo). */}
              <span data-colori={insieme} className={stili.dellInsieme}>
                {quadratino(undefined, testi.coloriComeLInsieme, `var(--blocco-${g})`)}
              </span>
              {tinte.map((tinta) => (
                <span key={tinta} className={tinteDeiBlocchi.indexOf(tinta as never) === 9 ? stili.aCapo : undefined}>
                  {quadratino(tinta, nomeDellaTinta(tinta, testi), `var(--tinta-${tinta})`)}
                </span>
              ))}
            </span>
          </div>
        );
      })}
      <div className={finestra.comandi}>
        <button type="button" className={finestra.comando} aria-disabled={nessuno} onClick={nessuno ? undefined : () => cambia({})}>
          {testi.coloriTuttiComeLInsieme}
        </button>
      </div>
    </fieldset>
  );
}
