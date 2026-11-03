// Le esecuzioni di una registrazione attiva, in memoria: mai su disco, e la tiene viva solo chi l'ha attivata. Una fotografia per ogni
// esecuzione chiusa, ognuna col progetto di allora, più un solo riferimento a quella aperta, che si fotografa al momento di salvare.
//
// Una ripartita o fermata a metà resta registrabile; una che non parte si tiene com'è. Si tengono le ultime `tettoDelleEsecuzioni`, perché il
// malfunzionamento è l'ultima cosa fatta, e il file dice quante ne mancano. Misurato: comporre non pesa, pesa il testo (nel caso peggiore 20
// esecuzioni 6,65 MB, 500 esecuzioni 166 MB).
//
// Un errore dell'app è legato alle esecuzioni aperte quando è arrivato: l'elenco dà solo voci che si aggiungono in coda e conteggi che crescono,
// quindi basta confrontare i conteggi all'inizio e alla fine.
//
// Che cosa NON guarda: chi la attiva, il segno che la mostra, il testo del file (`composizione.ts`).

import type { Esecuzione } from "../esecuzione/esecuzione";
import type { CasoDiUnaFunzione } from "../progetto/modello";
import { fotografa, type Fotografia } from "./composizione";
import type { ErroreDellApp } from "./formato";

export const tettoDelleEsecuzioni = 20;

type Errori = readonly ErroreDellApp[];

/** Le posizioni delle voci nuove e di quelle tornate. */
export const erroriDurante = (prima: Errori, dopo: Errori): readonly number[] => dopo.flatMap((v, i) => (v.times !== prima[i]?.times ? [i] : []));

function fotografiaDi(es: Esecuzione<CasoDiUnaFunzione>, prima: Errori, dopo: Errori): Fotografia {
  const f = fotografa(es);
  const durante = erroriDurante(prima, dopo);
  return durante.length === 0 ? f : { ...f, esecuzione: { ...f.esecuzione, app_errors_during: durante } };
}

export class InRegistrazione {
  private tenute: Fotografia[] = [];
  private tolte = 0;
  private aperta: { readonly es: Esecuzione<CasoDiUnaFunzione>; readonly errori: Errori } | null;

  /** `es`: l'esecuzione già aperta all'attivazione, che conta anche lei. */
  constructor(es: Esecuzione<CasoDiUnaFunzione> | null, errori: Errori) {
    this.aperta = es === null ? null : { es, errori };
  }

  private aggiungi(f: Fotografia): void {
    this.tenute.push(f);
    if (this.tenute.length > tettoDelleEsecuzioni) {
      this.tenute.shift();
      this.tolte++;
    }
  }

  /** L'esecuzione aperta non cambierà più: resta la sua fotografia. Senza un'esecuzione aperta non fa nulla. */
  chiudi(errori: Errori): void {
    if (this.aperta === null) return;
    this.aggiungi(fotografiaDi(this.aperta.es, this.aperta.errori, errori));
    this.aperta = null;
  }

  /** Un'esecuzione nuova: quella di prima, se c'è, si chiude qui. */
  apri(es: Esecuzione<CasoDiUnaFunzione>, errori: Errori): void {
    this.chiudi(errori);
    this.aperta = { es, errori };
  }

  /** Un'esecuzione che non parte: non si apre, si tiene com'è, dopo quella che c'era. */
  tieni(es: Esecuzione<CasoDiUnaFunzione>, errori: Errori): void {
    this.chiudi(errori);
    this.aggiungi(fotografiaDi(es, errori, errori));
  }

  /** Quante esecuzioni avrebbe il file, adesso. */
  get numero(): number {
    return Math.min(this.tenute.length + (this.aperta === null ? 0 : 1), tettoDelleEsecuzioni);
  }

  /** Ciò che serve a comporre il file adesso: l'aperta compresa, com'è. */
  composizione(errori: Errori): { readonly fotografie: readonly Fotografia[]; readonly perse: number } {
    const tutte = this.aperta === null ? this.tenute : [...this.tenute, fotografiaDi(this.aperta.es, this.aperta.errori, errori)];
    const oltre = Math.max(0, tutte.length - tettoDelleEsecuzioni);
    return { fotografie: tutte.slice(oltre), perse: this.tolte + oltre };
  }
}
