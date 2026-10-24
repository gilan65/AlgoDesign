// Il testo del valore iniziale di un dato, come lo mostrano il blocco sotto «Inizio» e la riga della vista dei dati:
// gli attesi sono scritti a mano, nelle due lingue, prima del codice. Un letterale si mostra com'è (gli operatori a
// parola nella lingua dell'interfaccia, come in ogni espressione del disegno); un elenco fra graffe, fino a dieci
// elementi tutti, oltre i primi dieci e quanti ne restano; il valore ripetuto in due forme, l'elenco (predefinita)
// o il valore solo.
//
// CHE COSA NON GUARDA: la validità del letterale (è del controllo statico: un valore sbagliato si mostra com'è
// scritto), né dove sta il blocco nel disegno (`impaginazione.test.ts`).
import { describe, expect, test } from "bun:test";
import { nomiDegliOperatori } from "../../i18n/operatori";
import { cicliEn, cicliIt, funzioniEn, funzioniIt } from "../esecuzione/testi-di-prova";
import type { Dato } from "../progetto/modello";
import { traduciEspressione } from "./lingua";
import { testoDelValoreIniziale, valoreIniziale, type TestiDelDisegno, type ValoreRipetuto } from "./impaginazione";
// I primi dieci numeri e dieci zeri, scritti a pezzi (lo stesso testo): «1, 2, 3», poi i quattro seguenti, poi gli ultimi tre.
const primiDieci = "1, 2, 3, " /* poi i quattro seguenti */ + "4, 5, 6, 7, " /* poi gli ultimi tre */ + "8, 9, 10";
const dieciZeri = "0, 0, 0, " /* poi i quattro seguenti */ + "0, 0, 0, 0, " /* poi gli ultimi tre */ + "0, 0, 0";

const it: TestiDelDisegno = {
  inizio: "Inizio",
  fine: "Fine",
  leggi: "leggi",
  scrivi: "scrivi",
  vero: "Vero",
  falso: "Falso",
  aCapo: " ↵",
  ogniElemento: "{valore} in ogni elemento",
  altri: "… altri {n}",
  espressione: (t) => traduciEspressione(t, nomiDegliOperatori.it),
  cicli: cicliIt,
  funzioni: funzioniIt,
};
const en: TestiDelDisegno = {
  ...it,
  inizio: "Start",
  fine: "End",
  ogniElemento: "{valore} in every element",
  altri: "… {n} more",
  espressione: (t) => traduciEspressione(t, nomiDegliOperatori.en),
  cicli: cicliEn,
  funzioni: funzioniEn,
};

const dodici = Array.from({ length: 12 }, (_, i) => String(i + 1));
const dati: Record<string, Dato> = {
  intero: { name: "n", type: "integer", initial: "0" },
  realeNegativo: { name: "r", type: "real", initial: "-2.5" },
  carattere: { name: "c", type: "character", initial: "'a'" },
  stringa: { name: "s", type: "string", initial: '"ciao, mondo"' },
  booleano: { name: "trovato", type: "boolean", initial: "true" },
  costante: { name: "MAX", type: "integer", constant: true, initial: "5" },
  elencoDiCinque: { name: "voti", type: "integer", size: 5, initial: ["7", "4", "9", "6", "8"] },
  elencoDiDieci: { name: "d", type: "integer", size: 10, initial: dodici.slice(0, 10) },
  elencoDiDodici: { name: "q", type: "integer", size: 12, initial: dodici },
  ripetutoDiCinque: { name: "doppi", type: "integer", size: 5, initial: { each: "0" } },
  ripetutoDiDodici: { name: "z", type: "real", size: 12, initial: { each: "-1.5" } },
  ripetutoDiMille: { name: "v", type: "integer", size: 1000, initial: { each: "0" } },
  // Un valore sbagliato si mostra com'è scritto, con l'operatore a parola nella lingua; dentro un letterale no.
  operatore: { name: "k", type: "real", initial: "pi" },
  operatoreInUnaStringa: { name: "t", type: "string", initial: '"pi"' },
};

const atteso: Record<"it" | "en", Record<ValoreRipetuto, Record<keyof typeof dati, string>>> = {
  it: {
    elenco: {
      intero: "n ← 0",
      realeNegativo: "r ← -2.5",
      carattere: "c ← 'a'",
      stringa: 's ← "ciao, mondo"',
      booleano: "trovato ← true",
      costante: "MAX ← 5",
      elencoDiCinque: "voti ← {7, 4, 9, 6, 8}",
      elencoDiDieci: `d ← {${primiDieci}}`,
      elencoDiDodici: `q ← {${primiDieci}, … altri 2}`,
      ripetutoDiCinque: "doppi ← {0, 0, 0, 0, 0}",
      ripetutoDiDodici: "z ← {-1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, … altri 2}",
      ripetutoDiMille: `v ← {${dieciZeri}, … altri 990}`,
      operatore: "k ← pi_greco",
      operatoreInUnaStringa: 't ← "pi"',
    },
    "un-valore": {
      intero: "n ← 0",
      realeNegativo: "r ← -2.5",
      carattere: "c ← 'a'",
      stringa: 's ← "ciao, mondo"',
      booleano: "trovato ← true",
      costante: "MAX ← 5",
      elencoDiCinque: "voti ← {7, 4, 9, 6, 8}",
      elencoDiDieci: `d ← {${primiDieci}}`,
      elencoDiDodici: `q ← {${primiDieci}, … altri 2}`,
      ripetutoDiCinque: "doppi ← 0 in ogni elemento",
      ripetutoDiDodici: "z ← -1.5 in ogni elemento",
      ripetutoDiMille: "v ← 0 in ogni elemento",
      operatore: "k ← pi_greco",
      operatoreInUnaStringa: 't ← "pi"',
    },
  },
  en: {
    elenco: {
      intero: "n ← 0",
      realeNegativo: "r ← -2.5",
      carattere: "c ← 'a'",
      stringa: 's ← "ciao, mondo"',
      booleano: "trovato ← true",
      costante: "MAX ← 5",
      elencoDiCinque: "voti ← {7, 4, 9, 6, 8}",
      elencoDiDieci: `d ← {${primiDieci}}`,
      elencoDiDodici: `q ← {${primiDieci}, … 2 more}`,
      ripetutoDiCinque: "doppi ← {0, 0, 0, 0, 0}",
      ripetutoDiDodici: "z ← {-1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, … 2 more}",
      ripetutoDiMille: `v ← {${dieciZeri}, … 990 more}`,
      operatore: "k ← pi",
      operatoreInUnaStringa: 't ← "pi"',
    },
    "un-valore": {
      intero: "n ← 0",
      realeNegativo: "r ← -2.5",
      carattere: "c ← 'a'",
      stringa: 's ← "ciao, mondo"',
      booleano: "trovato ← true",
      costante: "MAX ← 5",
      elencoDiCinque: "voti ← {7, 4, 9, 6, 8}",
      elencoDiDieci: `d ← {${primiDieci}}`,
      elencoDiDodici: `q ← {${primiDieci}, … 2 more}`,
      ripetutoDiCinque: "doppi ← 0 in every element",
      ripetutoDiDodici: "z ← -1.5 in every element",
      ripetutoDiMille: "v ← 0 in every element",
      operatore: "k ← pi",
      operatoreInUnaStringa: 't ← "pi"',
    },
  },
};

describe("il testo del valore iniziale di un dato", () => {
  for (const [lingua, testi] of [["it", it], ["en", en]] as const)
    for (const ripetuto of ["elenco", "un-valore"] as const)
      test(`in ${lingua === "it" ? "italiano" : "inglese"}, il valore ripetuto ${ripetuto === "elenco" ? "in un elenco" : "come un valore solo"}`, () => {
        const visti = Object.fromEntries(Object.entries(dati).map(([k, d]) => [k, testoDelValoreIniziale(d, testi, ripetuto)]));
        expect(visti).toEqual(atteso[lingua][ripetuto]);
        // Il valore è il testo senza il nome e la freccia: la riga della vista dei dati mostra quello.
        for (const [k, d] of Object.entries(dati)) expect(`${d.name} ← ${valoreIniziale(d, testi, ripetuto)}`).toBe(atteso[lingua][ripetuto][k as keyof typeof dati]!);
      });

  test("un dato senza valore iniziale non ha testo", () => {
    expect(testoDelValoreIniziale({ name: "x", type: "integer" }, it, "elenco")).toBeUndefined();
    expect(valoreIniziale({ name: "v", type: "integer", size: 3 }, it, "un-valore")).toBeUndefined();
  });

  test("un valore ripetuto in un dato senza una dimensione valida si mostra come un valore solo, e un vettore enorme non si materializza", () => {
    // Dati sbagliati (li segnala il controllo statico): il testo si mostra lo stesso.
    expect(testoDelValoreIniziale({ name: "x", type: "integer", initial: { each: "1" } }, it, "elenco")).toBe("x ← 1 in ogni elemento");
    expect(testoDelValoreIniziale({ name: "x", type: "integer", size: 0, initial: { each: "1" } }, it, "elenco")).toBe("x ← 1 in ogni elemento");
    // Una dimensione di un miliardo (oltre il limite): dieci elementi e quanti ne restano, in tempo costante.
    const t0 = performance.now();
    expect(testoDelValoreIniziale({ name: "x", type: "integer", size: 1_000_000_000, initial: { each: "1" } }, it, "elenco")).toBe(
      "x ← {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, … altri 999999990}",
    );
    expect(performance.now() - t0).toBeLessThan(50);
    // Un elenco per un dato semplice si mostra fra graffe com'è.
    expect(testoDelValoreIniziale({ name: "x", type: "integer", initial: ["1", "2"] }, it, "elenco")).toBe("x ← {1, 2}");
  });
});
