// Le modifiche della Lettura con la domanda: la vista (`core/disegno/domanda.ts`) mostra una Scrittura e la Lettura che
// la segue come un blocco solo, e quel blocco si inserisce, sposta, copia, elimina e annulla INSIEME. Qui le operazioni
// sui due blocchi veri, ognuna un passo solo (`poi`), con gli indici della sequenza vera; il file resta quello che le
// operazioni di sempre scriverebbero a mano, una Scrittura e una Lettura.
//
// Che cosa NON guarda: che la coppia sia ancora una coppia (chi chiama la prende dalla vista del progetto di adesso);
// i testi dei valori (il controllo statico li dice sul progetto candidato, come per una Scrittura).
import { perScrittura, scritturaDellaDomanda, stessaDomanda, type Coppia, type Domanda } from "../disegno/domanda";
import type { Blocco, Progetto } from "../progetto/modello";
import { blocchiDelTratto, campi, dove, elimina, incolla, poi, trattoFra, type CampiDiUnBlocco, type Operazione, type Posto, type Tratto } from "./operazioni";

/** Il progetto com'è: un'operazione che non cambia niente (la cronologia non ne fa un passo). */
const niente: Operazione = (p, prossimo) => ({ ok: true, progetto: p, prossimo });

/** Il tratto allargato perché non separi una coppia: se comincia con la Lettura di una coppia prende anche la Scrittura
 * prima di lei, se finisce con la Scrittura di una coppia anche la Lettura dopo. `coppie`: quelle della vista, per `id`
 * della Lettura. Si sposta, si copia e si elimina coi tratti (`spostaTratto`, `eliminaTratto`). */
export function conLeCoppie(p: Progetto, t: Tratto, coppie: ReadonlyMap<string, Coppia>): Tratto {
  const blocchi = blocchiDelTratto(p, t);
  if (blocchi.length === 0) return t;
  const prima = coppie.has(blocchi[0]!.id) ? 1 : 0;
  const dopo = perScrittura(coppie).has(blocchi.at(-1)!.id) ? 1 : 0;
  return { ...t, da: t.da - prima, a: t.a + dopo };
}

/** Il tratto dei blocchi che il disegno mostra fra i due, compresi (lo stesso, un blocco solo), con le coppie intere;
 * `undefined` come `trattoFra`. */
export function trattoDellaVista(p: Progetto, uno: string, altro: string, coppie: ReadonlyMap<string, Coppia>): Tratto | undefined {
  const t = trattoFra(p, uno, altro);
  return t === undefined ? undefined : conLeCoppie(p, t, coppie);
}

/** Incolla i blocchi nel posto, di seguito, con identificatori nuovi (la coppia copiata: la Scrittura e la Lettura). */
export const incollaDiSeguito =
  (blocchi: readonly Blocco[], posto: Posto): Operazione =>
  (p, prossimo) =>
    blocchi.reduce<Operazione>((op, b, k) => poi(op, incolla(b, { ...posto, indice: posto.indice + k })), niente)(p, prossimo);

/**
 * I campi di una Lettura con la domanda scritta nei suoi campi, in un passo solo. `coppia`: la Scrittura che la vista le
 * dava (assente, nessuna). Una domanda uguale a quella di prima non tocca la Scrittura; una domanda cambiata la riscrive
 * (lo spazio nella forma che aveva); una domanda senza valori la elimina; una domanda su una Lettura che non l'aveva mette
 * una Scrittura subito prima. La Lettura prende i suoi campi.
 */
export const campiConLaDomanda =
  (lettura: string, nuovi: CampiDiUnBlocco, domanda: Domanda, coppia: Coppia | undefined): Operazione =>
  (p, prossimo) => {
    const scrittura = scritturaDellaDomanda(coppia === undefined ? domanda : { ...domanda, ...(coppia.domanda.spazio ? { spazio: coppia.domanda.spazio } : {}) });
    const deiCampi = campi(lettura, nuovi);
    if (coppia !== undefined) {
      if (stessaDomanda(domanda, coppia.domanda)) return deiCampi(p, prossimo);
      return poi(scrittura === undefined ? elimina(coppia.scrittura) : campi(coppia.scrittura, scrittura), deiCampi)(p, prossimo);
    }
    if (scrittura === undefined) return deiCampi(p, prossimo);
    const posto = dove(p, lettura);
    if (posto === undefined) return deiCampi(p, prossimo);
    return poi(incolla({ id: "nuova", kind: "write", ...scrittura }, posto), deiCampi)(p, prossimo);
  };
