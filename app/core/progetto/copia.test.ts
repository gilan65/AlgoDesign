// La copia di un vettore col suo nome riconosciuta sull'albero dell'espressione, come la leggono l'interprete e i
// generatori: le parentesi attorno al nome non cambiano niente, una chiamata o un elemento non sono una copia.
//
// Che cosa NON guarda: la copia eseguita e scritta nel codice (prove dell'interprete e dei generatori).
import { expect, test } from "bun:test";
import type { Dato } from "./modello";
import { eUnaCopia, eUnaCopiaDiUnRecord, livelliDellePosizioni, nomiDeiRecord, nomiDeiVettori } from "./copia";

test("la copia di un record col nome: un riconoscimento suo, senza la posizione nascosta del vettore", () => {
  const dati: Dato[] = [
    { name: "a", type: "record", record: "alunno" },
    { name: "b", type: "record", record: "alunno" },
    { name: "classe", type: "record", record: "alunno", size: 3 },
    { name: "n", type: "integer" },
  ];
  const record = nomiDeiRecord(dati);
  const copia = (target: string, value: string) => eUnaCopiaDiUnRecord({ id: "b1", kind: "assignment", target, value }, record);
  expect([...record]).toEqual(["a", "b"]);
  expect({
    nome: copia("b", "a"),
    fraParentesi: copia("b", "(a)"),
    campo: copia("b.nome", "a.nome"),
    chiamata: copia("b", "promosso(a)"),
    vettoreDiRecord: copia("classe", "a"),
    nonRecord: copia("n", "a"),
  }).toEqual({ nome: true, fraParentesi: true, campo: false, chiamata: false, vettoreDiRecord: false, nonRecord: false });
  // Il record non è un vettore: nessuna posizione per la sua copia.
  expect(eUnaCopia({ id: "b1", kind: "assignment", target: "b", value: "a" }, nomiDeiVettori(dati))).toBe(false);
  expect(livelliDellePosizioni([{ id: "b1", kind: "assignment", target: "b", value: "a" }], nomiDeiVettori(dati)).size).toBe(0);
});

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
