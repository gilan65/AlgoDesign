// Una riga della vista dei dati: gli attributi di un dato (nome, tipo, forma, natura, valore iniziale, ruolo) nella
// lingua dell'interfaccia. Nel file le parole sono inglesi (`integer`, `input_output`); qui diventano quelle del
// dizionario, e `tsc` fa rosso un tipo o un ruolo del modello senza la sua voce. Il valore iniziale si mostra come lo mostra il blocco sotto
// «Inizio» nel flowchart: lo scrive il nucleo (`valoreIniziale`), col modo del valore ripetuto delle Impostazioni.
//
// Il tipo dice anche la forma («vettore di 5 interi») e la lunghezza massima di una stringa, se il file la
// dichiara: la predefinita non è nel file e non si scrive.
import { valoreIniziale, type TestiDelDisegno, type ValoreRipetuto } from "../../core/disegno/impaginazione";
import { tipoSemplice, type Dato, type Ruolo, type Tipo } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";

export interface RigaDelDato {
  readonly nome: string;
  readonly tipo: string;
  readonly natura: string;
  /** Assente se il dato non ha valore iniziale: la vista mostra il trattino. */
  readonly iniziale?: string;
  /** Assente per i dati di lavoro e le costanti. */
  readonly ruolo?: string;
}

const nomiDeiTipi: Record<Tipo, readonly [keyof Dizionario, keyof Dizionario]> = {
  integer: ["tipoIntero", "tipoInteri"],
  real: ["tipoReale", "tipoReali"],
  character: ["tipoCarattere", "tipoCaratteri"],
  string: ["tipoStringa", "tipoStringhe"],
  boolean: ["tipoBooleano", "tipoBooleani"],
};

export const nomiDeiRuoli: Record<Ruolo, keyof Dizionario> = {
  input: "ruoloInput",
  output: "ruoloOutput",
  input_output: "ruoloInputOutput",
};

/** Il tipo di un dato come lo dice la colonna «Tipo»: anche lo pseudocodice lo scrive così. */
export function tipoDelDato(dato: Dato, testi: Dizionario): string {
  const [uno, molti] = nomiDeiTipi[tipoSemplice(dato.type)];
  const tipo = dato.size === undefined ? testi[uno] : riempi(testi.datiVettore, { n: String(dato.size), tipo: testi[dato.size === 1 ? uno : molti] });
  return dato.max_length === undefined ? tipo : riempi(dato.max_length === 1 ? testi.datiLunghezzaUno : testi.datiLunghezza, { tipo, n: String(dato.max_length) });
}

export function rigaDelDato(dato: Dato, testi: Dizionario, ripetuto: ValoreRipetuto, testiDelDisegno: TestiDelDisegno): RigaDelDato {
  const iniziale = valoreIniziale(dato, testiDelDisegno, ripetuto);
  return {
    nome: dato.name,
    tipo: tipoDelDato(dato, testi),
    natura: dato.constant === true ? testi.naturaCostante : testi.naturaVariabile,
    ...(iniziale === undefined ? {} : { iniziale }),
    // Una variabile senza ruolo è di lavoro; una costante e un parametro non hanno un ruolo (il trattino).
    ...(dato.role !== undefined ? { ruolo: testi[nomiDeiRuoli[dato.role]] } : dato.constant !== true && dato.parameter === undefined ? { ruolo: testi.ruoloDiLavoro } : {}),
  };
}
