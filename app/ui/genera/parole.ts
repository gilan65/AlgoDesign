// Le parole dello pseudocodice nella lingua dell'interfaccia: quelle dei dizionari, il tipo e il ruolo come li
// dice la vista dei dati, e le espressioni con gli operatori a parola tradotti per parole (mai con una
// sostituzione sul testo).
import { traduciEspressione } from "../../core/disegno/lingua";
import type { ParoleDelloPseudocodice } from "../../core/genera/pseudocodice";
import { dizionari, type Lingua } from "../../i18n/lingue";
import { nomiDegliOperatori } from "../../i18n/operatori";
import { nomiDeiRuoli, tipoDelDato } from "../dati/righe";

export function paroleDelloPseudocodice(lingua: Lingua): ParoleDelloPseudocodice {
  const d = dizionari[lingua];
  const nomi = nomiDegliOperatori[lingua];
  return {
    record: d.pseudoRecord,
    fineRecord: d.pseudoFineRecord,
    costantiComuni: d.pseudoCostantiComuni,
    programma: d.pseudoProgramma,
    dati: d.pseudoDati,
    regole: d.pseudoRegole,
    fine: d.pseudoFine,
    leggi: d.pseudoLeggi,
    scrivi: d.pseudoScrivi,
    aCapo: d.disegnoACapo,
    se: d.pseudoSe,
    allora: d.pseudoAllora,
    altrimenti: d.pseudoAltrimenti,
    fineSe: d.pseudoFineSe,
    mentre: d.pseudoMentre,
    fineMentre: d.pseudoFineMentre,
    ripeti: d.pseudoRipeti,
    per: d.pseudoPer,
    da: d.pseudoDa,
    a: d.pseudoA,
    passo: d.pseudoPasso,
    finePer: d.pseudoFinePer,
    perOgni: d.pseudoPerOgni,
    in: d.pseudoIn,
    finePerOgni: d.pseudoFinePerOgni,
    procedura: d.pseudoProcedura,
    funzione: d.pseudoFunzione,
    chiama: d.pseudoChiama,
    restituisce: d.pseudoRestituisce,
    rif: d.pseudoRif,
    out: d.pseudoOut,
    costante: d.naturaCostante,
    ruoli: { input: d[nomiDeiRuoli.input], output: d[nomiDeiRuoli.output], input_output: d[nomiDeiRuoli.input_output] },
    tipo: (dato) => tipoDelDato(dato, d),
    ogniElemento: d.datiOgniElemento,
    espressione: (testo) => traduciEspressione(testo, nomi),
  };
}
