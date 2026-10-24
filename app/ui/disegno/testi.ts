// Le parole del disegno nella lingua dell'interfaccia: quelle dei dizionari e i nomi degli operatori a
// parola, tradotti per parole (mai con una sostituzione sul testo). La posizione dell'elemento di un «per ogni» ha il
// nome che il codice generato le dà (`_indice`), che nessun dato può avere: il disegno non la confonde con un dato.
import type { TestiDelDisegno } from "../../core/disegno/impaginazione";
import { traduciEspressione } from "../../core/disegno/lingua";
import { indiceDelLivello } from "../../core/genera/nomi";
import { dizionari, type Lingua } from "../../i18n/lingue";
import { tipoDelDato } from "../dati/righe";
import { nomiDegliOperatori } from "../../i18n/operatori";

export function testiDelDisegno(lingua: Lingua): TestiDelDisegno {
  const d = dizionari[lingua];
  const nomi = nomiDegliOperatori[lingua];
  return {
    inizio: d.disegnoInizio,
    fine: d.disegnoFine,
    leggi: d.disegnoLeggi,
    scrivi: d.disegnoScrivi,
    vero: d.disegnoVero,
    falso: d.disegnoFalso,
    aCapo: d.disegnoACapo,
    ogniElemento: d.datiOgniElemento,
    altri: d.disegnoAltri,
    espressione: (testo) => traduciEspressione(testo, nomi),
    cicli: {
      per: d.disegnoPer,
      perConPasso: d.disegnoPerConPasso,
      perOgni: d.disegnoPerOgni,
      indice: indiceDelLivello(lingua, 1),
      altroElemento: d.disegnoAltroElemento,
      elementoSuccessivo: d.disegnoElementoSuccessivo,
      copia: d.disegnoCopia,
      copiaEspansa: d.disegnoCopiaEspansa,
    },
    funzioni: {
      procedura: d.disegnoProcedura,
      funzione: d.disegnoFunzione,
      restituisce: d.disegnoRestituisce,
      chiamata: d.disegnoChiamata,
      rif: d.disegnoRif,
      out: d.disegnoOut,
      // Nell'intestazione gli elementi di un vettore sì, la lunghezza massima di una stringa no: la dice la vista dei
      // dati (l'ovale con la lunghezza diventava largo quasi il doppio).
      tipo: ({ max_length: _, ...dato }) => tipoDelDato(dato, d),
    },
  };
}
