// I campi del blocco del valore iniziale di un dato, nel flowchart: la stessa cornice dei campi di un blocco
// (`CampiNelRiquadro`, accanto al blocco o nel pannello), col solo valore. Il nome del dato non si cambia da qui; per
// un vettore c'è anche la scelta fra l'elenco e il valore ripetuto, come nella vista dei dati (di una matrice l'elenco
// per righe, di una tabella per record), e passando dal valore ripetuto all'elenco il campo si riempie allo stesso modo (`conRipetuto`).
//
// Il testo scritto è una bozza del dato (`ui/dati/bozza.ts`): confermandola, chi monta i campi scrive il valore
// iniziale del dato con le operazioni del nucleo, e il blocco lo ridisegna il nucleo dal dato.
import type { ReactElement } from "react";
import { segnoDellElenco, segnoDellEspressione } from "../chiusura";
import { conRipetuto, type BozzaDelDato } from "../dati/bozza";
import { CampiNelRiquadro, type CorniceDeiCampi } from "./EditorDelBlocco";
import stili from "./EditorDelBlocco.module.css";

export function EditorDelValore({ chiave, bozza, cambia, ...cornice }: CorniceDeiCampi & { chiave: string; bozza: BozzaDelDato; cambia: (b: BozzaDelDato) => void }): ReactElement {
  const { testi } = cornice;
  return (
    <CampiNelRiquadro chiave={chiave} {...cornice}>
      <label className={stili.campo}>
        <span className={stili.etichetta}>{testi.campoValore}</span>
        <input className={stili.testo} type="text" spellCheck={false} autoComplete="off" {...((bozza.vettore && !bozza.ripetuto) || bozza.tipo === "record" ? segnoDellElenco : segnoDellEspressione)} value={bozza.iniziale} onChange={(e) => cambia({ ...bozza, iniziale: e.currentTarget.value })} />
      </label>
      {bozza.vettore && (
        <label className={stili.campo}>
          <span className={stili.etichetta}>{bozza.matrice ? testi.campoInizialeMatrice : testi.campoInizialeVettore}</span>
          <select className={stili.testo} value={bozza.ripetuto ? "ripetuto" : "elenco"} onChange={(e) => cambia(conRipetuto(bozza, e.currentTarget.value === "ripetuto"))}>
            <option value="elenco">{bozza.matrice ? testi.inizialeElencoPerRighe : bozza.tipo === "record" ? testi.inizialeElencoPerRecord : testi.inizialeElenco}</option>
            <option value="ripetuto">{testi.inizialeRipetuto}</option>
          </select>
        </label>
      )}
    </CampiNelRiquadro>
  );
}
