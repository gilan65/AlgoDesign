// La copia di un vettore col suo nome riconosciuta sull'albero dell'espressione, come la leggono l'interprete e i
// generatori: le parentesi attorno al nome non cambiano niente, una chiamata o un elemento non sono una copia.
//
// Che cosa NON guarda: la copia eseguita e scritta nel codice (prove dell'interprete e dei generatori).
import { expect, test } from "bun:test";
import { eUnaCopia } from "./copia";

test("la copia col nome: anche fra parentesi; non da una chiamata, da un elemento o in un dato che non è un vettore", () => {
  const vettori = new Set(["voti", "altri"]);
  const copia = (target: string, value: string) => eUnaCopia({ id: "b1", kind: "assignment", target, value }, vettori);
  expect({
    nome: copia("altri", "voti"),
    fraParentesi: copia("altri", "(voti)"),
    versoFraParentesi: copia("(altri)", "voti"),
    chiamata: copia("altri", "doppi(voti)"),
    elemento: copia("altri", "voti[0]"),
    nonVettore: copia("n", "voti"),
    illeggibile: copia("altri", "(voti"),
  }).toEqual({ nome: true, fraParentesi: true, versoFraParentesi: true, chiamata: false, elemento: false, nonVettore: false, illeggibile: false });
});
