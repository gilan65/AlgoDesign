// Le cifre scritte nei testi dell'interfaccia sono quelle delle costanti che descrivono: i limiti dei dati, le colonne
// della forma predefinita della tabella, le righe che tengono la console e la tabella. Cambiata una costante, il testo
// che la dice si rivede (come il tetto dei passi nei testi dei codici, `i18n/codici.test.ts`).
//
// CHE COSA NON GUARDA: come il numero è scritto (qui «10000», nei documenti «10 000»), e i numeri che i testi compongono
// da sé al momento (`{n}`).
import { expect, test } from "bun:test";
import { righeTenute, tettoDelleColonne } from "../core/esecuzione/traccia";
import { en } from "../i18n/en";
import { it, type Dizionario } from "../i18n/it";
import { intervalli } from "./preferenze";

type Cifre = Partial<Record<keyof Dizionario, number[]>>;

/** Le chiavi dei testi e le cifre che ciascuno deve dire. */
const cifre = (c: { elementi: number; caratteri: number; vettoreDiStringhe: number; colonne: number; righe: number }): Cifre => ({
  limitiSpiegazione: [c.elementi, c.caratteri, c.vettoreDiStringhe],
  formaPrimiEAltri: [c.colonne],
  formaInFila: [c.colonne],
  consoleSpiegazione: [c.righe],
  consoleTolte: [c.righe],
  consoleTolta: [c.righe],
  tracciaTolte: [c.righe],
  tracciaTolta: [c.righe],
});

const vere = {
  elementi: intervalli.elementiDiUnVettore.massimo,
  caratteri: intervalli.lunghezzaDiUnaStringa.massimo,
  vettoreDiStringhe: intervalli.caratteriDiUnVettoreDiStringhe.massimo,
  colonne: tettoDelleColonne,
  righe: righeTenute,
};

/** Le cifre che un testo non dice, come numero intero (non dentro un altro: «10» non vale in «1000»). */
function mancanti(testi: Dizionario, attese: Cifre): string[] {
  return Object.entries(attese).flatMap(([chiave, numeri]) =>
    numeri!.filter((n) => !new RegExp(`(^|\\D)${n}(\\D|$)`).test(testi[chiave as keyof Dizionario] as string)).map((n) => `${chiave}: ${n}`),
  );
}

test("le cifre dei testi sono quelle delle costanti, nelle due lingue", () => {
  expect(mancanti(it, cifre(vere))).toEqual([]);
  expect(mancanti(en, cifre(vere))).toEqual([]);
  // Le premesse: le costanti che i testi dicono oggi, e otto testi per lingua guardati.
  expect(vere).toEqual({ elementi: 1000, caratteri: 1000, vettoreDiStringhe: 10_000, colonne: 10, righe: 1000 });
  expect(Object.keys(cifre(vere)).length).toBe(8);
});

test("controllo positivo: una costante cambiata fa mancare la sua cifra in ogni testo che la dice", () => {
  for (const [nome, valore] of Object.entries(vere)) {
    const altre = cifre({ ...vere, [nome]: valore + 1 });
    const attese = Object.entries(altre).flatMap(([chiave, numeri]) => numeri!.filter((n, i) => n !== cifre(vere)[chiave as keyof Dizionario]![i]).map((n) => `${chiave}: ${n}`));
    expect(attese.length).toBeGreaterThan(0);
    expect(mancanti(it, altre)).toEqual(attese);
  }
});
