// «Esporta il flowchart…»: la finestra prima della finestra del sistema. Dice di quale scheda è il flowchart (e, durante
// l'esecuzione, che l'immagine ha i segni dell'esecuzione), e fa scegliere il formato (PNG o SVG), i colori (i tre modi)
// e lo sfondo trasparente. Si apre con le scelte dell'ultima esportazione della sessione; «Esporta…» (o Invio) le
// conferma e passa alla finestra del sistema; «Annulla» ed Esc non esportano e non le cambiano.
import { useState, type FormEvent, type ReactElement } from "react";
import type { ModoDiColore } from "../../core/disegno/tavolozza";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { formatiDellImmagine, modiDiColore, type FormatoDellImmagine, type ScelteDellEsportazione } from "../disegno/esporta";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";
import { Opzioni } from "./FinestraImpostazioni";

/** Che cosa si esporta: il nome della scheda mostrata, e se c'è un'esecuzione (i segni nell'immagine). */
export interface DaEsportare {
  readonly nome: string;
  readonly inEsecuzione: boolean;
}

const testoDelFormato = { png: "esportaFormatoPng", svg: "esportaFormatoSvg" } as const satisfies Record<FormatoDellImmagine, keyof Dizionario>;
const testoDeiColori = { colori: "esportaAColori", grigi: "esportaAGrigi", "bianco-e-nero": "esportaInBiancoENero" } as const satisfies Record<ModoDiColore, keyof Dizionario>;

export function FinestraEsporta({
  cosa,
  scelte,
  testi,
  conferma,
  rinuncia,
}: {
  cosa: DaEsportare | null;
  scelte: ScelteDellEsportazione;
  testi: Dizionario;
  conferma: (s: ScelteDellEsportazione) => void;
  rinuncia: () => void;
}): ReactElement {
  return (
    <Finestra aperta={cosa !== null} titolo={testi.esportaFlowchartTitolo} rinuncia={rinuncia}>
      {cosa && <Campi cosa={cosa} scelte={scelte} testi={testi} conferma={conferma} />}
    </Finestra>
  );
}

function Campi({ cosa, scelte, testi, conferma }: { cosa: DaEsportare; scelte: ScelteDellEsportazione; testi: Dizionario; conferma: (s: ScelteDellEsportazione) => void }): ReactElement {
  const [s, setS] = useState(scelte);
  const invia = (e: FormEvent) => {
    e.preventDefault();
    conferma(s);
  };
  return (
    <form className={stili.campi} onSubmit={invia}>
      <Descrizione className={stili.spiegazione}>
        {riempi(testi.esportaDiQualeFlowchart, { nome: cosa.nome })}
        {cosa.inEsecuzione && ` ${testi.esportaConISegni}`}
      </Descrizione>
      <Opzioni legenda={testi.esportaFormato} nome="formato" valore={s.formato} ammessi={formatiDellImmagine} testo={(f) => testi[testoDelFormato[f]]} cambia={(formato) => setS({ ...s, formato })} />
      <Opzioni legenda={testi.esportaColori} nome="colori" valore={s.colori} ammessi={modiDiColore} testo={(c) => testi[testoDeiColori[c]]} cambia={(colori) => setS({ ...s, colori })}>
        <label className={stili.opzione}>
          <input type="checkbox" checked={s.trasparente} onChange={(e) => setS({ ...s, trasparente: e.target.checked })} />
          {testi.esportaSfondoTrasparente}
        </label>
      </Opzioni>
      <div className={stili.comandi}>
        <button type="submit" className={stili.comando}>
          {testi.esportaConferma}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </form>
  );
}
