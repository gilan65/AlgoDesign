// La lunghezza massima di un'espressione stringa, con gli attesi scritti a mano: un testo fra virgolette, un dato
// stringa, l'elemento di un vettore di stringhe, un carattere, una funzione che restituisce una stringa (o un vettore di
// stringhe, con l'indice) e una concatenazione.
import { expect, test } from "bun:test";
import { analizza, type Espressione } from "../espressioni/analizzatore";
import type { Dato, Funzione } from "../progetto/modello";
import { lunghezzaMassima } from "./lunghezza";

const dati: Record<string, Dato> = {
  s: { name: "s", type: "string", max_length: 20 },
  t: { name: "t", type: "string" },
  c: { name: "c", type: "character" },
  n: { name: "n", type: "integer" },
  parole: { name: "parole", type: "string", size: 4, max_length: 7 },
};
const funzione = (name: string, altro: Partial<Funzione>): Funzione => ({ id: name, kind: "function", name, data: [], body: [], end: { id: `fine-${name}`, return_value: '""' }, ...altro });
const funzioni: Record<string, Funzione> = {
  saluto: funzione("saluto", { return_type: "string", return_max_length: 12 }),
  lungo: funzione("lungo", { return_type: "string" }),
  nomi: funzione("nomi", { return_type: "string", return_size: 3, return_max_length: 9 }),
  doppi: funzione("doppi", { return_type: "integer", return_size: 3 }),
  iniziale: funzione("iniziale", { return_type: "character" }),
};

const albero = (testo: string): Espressione => {
  const a = analizza(testo);
  if (!a.ok) throw new Error(testo);
  return a.espressione;
};
const misura = (testo: string) => lunghezzaMassima(albero(testo), (n) => dati[n], (n) => funzioni[n]);

test("la lunghezza massima di un'espressione stringa", () => {
  const attese: [string, number][] = [
    ['"abc"', 3],
    ['""', 0],
    ["s", 20],
    ["t", 255],
    ["c", 1],
    ["parole[1]", 7],
    ["s[0]", 1],
    ['saluto("x")', 12],
    ["lungo()", 255],
    ["nomi()[0]", 9],
    ['saluto("x")[0]', 1],
    ["iniziale()", 1],
    ["doppi()[0]", 1],
    ['"ab" + s + c', 23],
    ['saluto("x") + parole[0]', 19],
  ];
  expect(attese.map(([testo]) => [testo, misura(testo)])).toEqual(attese);
});
