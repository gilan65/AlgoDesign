// La rinomina nel testo delle regole, parola per parola: contro i letterali, i nomi che contengono quello
// vecchio, le parole chiave, i caratteri fuori dal piano di base, le chiamate, anche nei testi che non si lasciano
// leggere. Il controllo positivo applica gli stessi casi a una sostituzione per sottostringa, che sbaglia proprio
// dove la prova guarda.

import { expect, test } from "bun:test";
import { eUnaParolaSola, nomiDelTesto, nomina, rinominaNelTesto } from "./rinomina";

const casi: readonly (readonly [testo: string, vecchio: string, nuovo: string, atteso: string])[] = [
  ["voto + 1", "voto", "punti", "punti + 1"],
  ['"voto" + voto', "voto", "punti", '"voto" + punti'],
  ["voto2 + voto", "voto", "punti", "voto2 + punti"],
  ["votoTotale - voto", "voto", "punti", "votoTotale - punti"],
  ["voto_x * voto", "voto", "punti", "voto_x * punti"],
  ["voto*voto", "voto", "punti", "punti*punti"],
  ["v[v]", "v", "w", "w[w]"],
  ["'v' + v", "v", "w", "'v' + w"],
  ['"città 😀" + voto', "voto", "punti", '"città 😀" + punti'],
  ["  voto  ", "voto", "punti", "  punti  "],
  // Una parola chiave non è il nome di un dato, anche se un dato (sbagliato) si chiama così.
  ["length s + length", "length", "lunghezza", "length s + length"],
  ["not voto", "not", "x", "not voto"],
  // Un testo che non si lascia leggere cambia lo stesso, parola per parola: il controllo mostra l'errore col nome nuovo.
  ['"voto', "voto", "punti", '"voto'],
  ["voto + ", "voto", "punti", "punti + "],
  ["voto = 5", "voto", "punti", "punti = 5"],
  ["voto % 2", "voto", "punti", "punti % 2"],
  ["3. + voto", "voto", "punti", "3. + punti"],
  // Un nome seguito da «(» è la chiamata di una funzione, non il dato.
  ["voto(voto)", "voto", "punti", "voto(punti)"],
  // Un nome dopo un punto è il campo di un record, non il dato: cambia solo la base.
  ["voto ← a.voto", "voto", "punti", "punti ← a.voto"],
  ["a.nome ← nome", "nome", "n", "a.nome ← n"],
  ["t[voto].voto + voto", "voto", "punti", "t[punti].voto + punti"],
  ["a.voto", "a", "b", "b.voto"],
];

/** Il rilevatore: i casi in cui la rinomina data non dà l'atteso. */
const sbagliati = (rinomina: (testo: string, vecchio: string, nuovo: string) => string) =>
  casi.filter(([testo, vecchio, nuovo, atteso]) => rinomina(testo, vecchio, nuovo) !== atteso).map(([testo]) => testo);

test("la rinomina cambia solo le parole che sono il nome, mai un letterale né un nome più lungo", () => {
  console.log(`rinomina: ${casi.length} casi`);
  expect(sbagliati(rinominaNelTesto)).toEqual([]);
  // Controllo positivo: la sostituzione per sottostringa sbaglia i letterali e i nomi simili.
  const perSottostringa = (testo: string, vecchio: string, nuovo: string) => testo.replaceAll(vecchio, nuovo);
  expect(sbagliati(perSottostringa)).toEqual([
    '"voto" + voto',
    "voto2 + voto",
    "votoTotale - voto",
    "voto_x * voto",
    "'v' + v",
    "length s + length",
    "not voto",
    '"voto',
    "voto(voto)",
    "voto ← a.voto",
    "a.nome ← nome",
    "t[voto].voto + voto",
  ]);
});

test("nomina: il nome come parola, anche in un testo che non si legge, mai la chiamata; una parola sola: solo un nome che si legge così", () => {
  expect([nomina("voto2 + 1", "voto"), nomina('"voto"', "voto"), nomina("v[voto]", "voto")]).toEqual([false, false, true]);
  expect([nomina("voto = 5", "voto"), nomina("voto % 2", "voto"), nomina("voto(1)", "voto"), nomina("valido(voto)", "voto")]).toEqual([true, true, false, true]);
  // Il campo di un record non è un uso del dato omonimo; la base sì.
  expect([nomina("a.voto", "voto"), nomina("t[i].voto", "voto"), nomina("a.voto", "a")]).toEqual([false, false, true]);
  expect([...nomiDelTesto("a.voto + t[i].nome").dati].sort()).toEqual(["a", "i", "t"]);
  expect(["voto", "v2", "a_b"].map(eUnaParolaSola)).toEqual([true, true, true]);
  expect(["", "età", "voto bis", "1voto", "not", "length", "(a)", "_a"].map(eUnaParolaSola)).toEqual([false, false, false, false, false, false, false, false]);
});
