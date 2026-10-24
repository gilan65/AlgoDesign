// La traduzione degli operatori a parola per la visualizzazione: solo le parole che l'analizzatore
// riconosce come operatori, mai dentro un letterale né dentro un nome di dato, il resto del testo intatto.
//
// CHE COSA NON GUARDA: che i nomi italiani siano quelli giusti (li fissa la tabella `nomiDegliOperatori`, qui si
// confronta con quella tabella solo sugli esempi scritti); il testo dei blocchi diversi dalle espressioni (i commenti
// non si traducono, e lo prova l'impaginazione che non li passa alla traduzione).

import { describe, expect, test } from "bun:test";
import { nomiDegliOperatori } from "../../i18n/operatori";
import { operatoriUnari } from "../espressioni/analizzatore";
import { operatoriAParola, traduciEspressione } from "./lingua";

const it = (t: string) => traduciEspressione(t, nomiDegliOperatori.it);
const en = (t: string) => traduciEspressione(t, nomiDegliOperatori.en);

/** Il rilevatore della specie «tradotto dove non si doveva»: le parti che devono restare intatte ci sono
 * ancora, quelle da tradurre no. Indipendente dalla funzione provata. */
function difetti(mostrato: string, intatti: readonly string[], spariti: readonly string[]): string[] {
  // Le parole rimaste si cercano fuori dalle parti intatte (un letterale può contenere l'operatore).
  const fuori = intatti.reduce((t, x) => t.replaceAll(x, " "), mostrato);
  return [
    ...intatti.filter((x) => !mostrato.includes(x)).map((x) => `manca ${x}`),
    ...spariti.filter((x) => fuori.split(/[^A-Za-z0-9_]+/).includes(x)).map((x) => `non tradotto ${x}`),
  ];
}

describe("traduzione per parole", () => {
  test("gli operatori a parola si traducono, letterali e nomi restano", () => {
    const testo = 'to_integer x + length(s) - to_integer_n * "to_integer" + \'p\' + pi';
    const mostrato = it(testo);
    expect(mostrato).toBe('converti_a_intero x + lunghezza(s) - to_integer_n * "to_integer" + \'p\' + pi_greco');
    expect(difetti(mostrato, ["to_integer_n", '"to_integer"', "converti_a_intero x", "lunghezza(s)", "pi_greco"], ["to_integer", "length", "pi"])).toEqual([]);
  });

  test("gli spazi, le parentesi e i caratteri fuori dal piano di base restano dove sono", () => {
    expect(it('(a  raised_to   2) == square_root( b ) and s == "😀 round"')).toBe('(a  elevato_a   2) == radice_quadrata( b ) and s == "😀 round"');
    expect(it("not (round_down x > round_up y)")).toBe("not (per_difetto x > per_eccesso y)");
  });

  test("in inglese il testo resta quello del file", () => {
    const testo = "to_real somma / to_real contati";
    expect(en(testo)).toBe(testo);
    expect(it(testo)).toBe("converti_a_reale somma / converti_a_reale contati");
  });

  test("un testo illeggibile si mostra com'è", () => {
    expect(it('to_integer "aperta')).toBe('to_integer "aperta');
    expect(it("x +")).toBe("x +");
  });

  test("controllo positivo: una sostituzione sul testo traduce dentro il letterale e dentro il nome", () => {
    const testo = 'to_integer_n + to_integer "to_integer"';
    const sbagliato = testo.replaceAll("to_integer", nomiDegliOperatori.it.to_integer);
    const intatti = ["to_integer_n", '"to_integer"'];
    expect(difetti(sbagliato, intatti, ["to_integer"])).toEqual(["manca to_integer_n", 'manca "to_integer"']);
    expect(difetti(it(testo), intatti, ["to_integer"])).toEqual([]);
  });

  test("gli operatori a parola sono tutti e soli quelli dell'analizzatore con un nome diverso", () => {
    // Appaiati nei due versi: gli operatori dell'analizzatore (meno quelli uguali nelle due lingue) e quelli tradotti.
    const uguali = ["-", "not"];
    const dellAnalizzatore = [...operatoriUnari.filter((o) => !uguali.includes(o)), "raised_to", "pi"].sort();
    expect([...operatoriAParola].sort() as string[]).toEqual(dellAnalizzatore);
    expect(Object.keys(nomiDegliOperatori.it).sort()).toEqual(dellAnalizzatore);
    // Ognuno si traduce davvero in italiano, e in inglese resta sé stesso.
    for (const o of operatoriAParola) {
      const testo = o === "raised_to" ? "a raised_to 2" : o === "pi" ? "pi" : `${o} x`;
      expect(it(testo)).not.toBe(testo);
      expect(en(testo)).toBe(testo);
    }
  });
});
