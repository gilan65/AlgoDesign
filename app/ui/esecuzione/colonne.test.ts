// Le colonne della tabella di traccia come le dispone l'utente (`colonne.ts`), funzioni pure:
// - l'ordine dei gruppi di una tabella dall'ordine scelto: i gruppi che non ci sono si tolgono, uno mai spostato sta
//   dopo quello che lo precede nell'ordine del nucleo (o in testa);
// - le colonne mostrate: dentro un gruppo (un vettore) nell'ordine del nucleo, la condizione e lo scritto dopo i valori
//   finché non si spostano, ognuna con la sua cella della riga del nucleo;
// - spostare un gruppo di un posto (fermo agli estremi), metterlo in un posto fra gli altri, il posto dai centri;
// - con procedure e funzioni, le regioni: la condizione e lo scritto subito dopo la radice, il gruppo di ogni funzione
//   dopo, le chiavi col nome della funzione (un dato con lo stesso nome nella radice non la condivide), lo spostamento
//   solo dentro la regione, anche con un ordine scelto che le mescolerebbe;
// - i limiti della larghezza.
//
// Che cosa NON guarda: il trascinamento e il menu nella tabella (`e2e/tabella.e2e.ts`, `tabella.test.tsx`).
import { expect, test } from "bun:test";
import type { ColonnaDiUnValore } from "../../core/esecuzione/traccia";
import {
  colonneMostrate,
  conIlGruppoIn,
  conLaRegione,
  CONDIZIONE,
  gruppiDellaRegione,
  LARGHEZZA_MASSIMA,
  LARGHEZZA_MINIMA,
  limitata,
  ordineDeiGruppi,
  postoDelPuntatore,
  SCRIVE,
  spostato,
} from "./colonne";

const colonna = (nome: string, gruppo = nome): ColonnaDiUnValore => ({ nome, tipo: "intero", gruppo });
/** `n`, poi un vettore `v` di tre elementi, poi `s`. */
const colonne = [colonna("n"), colonna("v[0]", "v"), colonna("v[1]", "v"), colonna("v[2]", "v"), colonna("s")];

test("senza scelte, le colonne nell'ordine del nucleo con la condizione e lo scritto in fondo, ognuna con la sua cella", () => {
  expect(colonneMostrate(colonne, []).map((c) => `${c.chiave}:${c.cella}`)).toEqual(["n:0", "v[0]:1", "v[1]:2", "v[2]:3", "s:4", `${CONDIZIONE}:5`, `${SCRIVE}:6`]);
});

test("le colonne di un vettore si spostano insieme, nell'ordine del nucleo; lo scritto può andare in testa", () => {
  expect(colonneMostrate(colonne, [SCRIVE, "s", "v", "n", CONDIZIONE]).map((c) => c.chiave)).toEqual([SCRIVE, "s", "v[0]", "v[1]", "v[2]", "n", CONDIZIONE]);
});

test("l'ordine scelto per un'altra tabella: i gruppi che non ci sono si tolgono, quelli nuovi stanno dopo il loro precedente del nucleo", () => {
  const nucleo = ["n", "v", "s", CONDIZIONE, SCRIVE];
  // `v` mai spostato: dopo `n`, che lo precede nel nucleo; `x` non c'è più.
  expect(ordineDeiGruppi(nucleo, ["s", "x", "n", SCRIVE, CONDIZIONE])).toEqual(["s", "n", "v", SCRIVE, CONDIZIONE]);
  // Un gruppo nuovo senza precedenti nell'ordine scelto va in testa; lo scritto, dopo la condizione che lo precede nel
  // nucleo.
  expect(ordineDeiGruppi(nucleo, [CONDIZIONE, "s"])).toEqual(["n", "v", CONDIZIONE, SCRIVE, "s"]);
  expect(ordineDeiGruppi(nucleo, [])).toEqual(nucleo);
});

test("spostare un gruppo di un posto, fermo agli estremi", () => {
  const ordine = ["a", "b", "c"];
  expect(spostato(ordine, "b", -1)).toEqual(["b", "a", "c"]);
  expect(spostato(ordine, "b", 1)).toEqual(["a", "c", "b"]);
  expect(spostato(ordine, "a", -1)).toBe(ordine);
  expect(spostato(ordine, "c", 1)).toBe(ordine);
  expect(spostato(ordine, "z", 1)).toBe(ordine);
});

test("il gruppo trascinato messo in un posto fra gli altri, e il posto contato dai centri degli altri", () => {
  const ordine = ["a", "b", "c", "d"];
  expect(conIlGruppoIn(ordine, "c", 0)).toEqual(["c", "a", "b", "d"]);
  expect(conIlGruppoIn(ordine, "a", 3)).toEqual(["b", "c", "d", "a"]);
  // Gli altri hanno i centri a 10, 30, 50: un puntatore a 31 sta dopo i primi due.
  expect(postoDelPuntatore([10, 30, 50], 31)).toBe(2);
  // Sul centro esatto non lo ha ancora passato.
  expect(postoDelPuntatore([10, 30, 50], 30)).toBe(1);
  expect(postoDelPuntatore([10, 30, 50], 5)).toBe(0);
  expect(postoDelPuntatore([10, 30, 50], 99)).toBe(3);
});

/** Il programma con `n` e `v[0]`, una funzione `f` con `n` (lo stesso nome) e `t`, una `g` con `k`. */
const nellaFunzione = (funzione: string, nome: string, gruppo = nome): ColonnaDiUnValore => ({ nome, tipo: "intero", gruppo: `${funzione} › ${gruppo}`, funzione });
const conFunzioni = [colonna("n"), colonna("v[0]", "v"), nellaFunzione("f", "n"), nellaFunzione("f", "t"), nellaFunzione("g", "k")];

test("con le funzioni: la condizione e lo scritto dopo la radice, poi un gruppo per funzione, le chiavi col nome della funzione", () => {
  expect(colonneMostrate(conFunzioni, []).map((c) => `${c.chiave}:${c.cella}:${c.funzione ?? "-"}`)).toEqual([
    "n:0:-",
    "v[0]:1:-",
    `${CONDIZIONE}:5:-`,
    `${SCRIVE}:6:-`,
    "f › n:2:f",
    "f › t:3:f",
    "g › k:4:g",
  ]);
});

test("con le funzioni, ogni gruppo resta nella sua regione anche se l'ordine scelto le mescolerebbe", () => {
  // Un ordine che metterebbe `t` di f prima di tutto e lo scritto dopo k di g.
  const scelto = ["f › t", "g › k", SCRIVE, "v", "n", "f › n", CONDIZIONE];
  expect(colonneMostrate(conFunzioni, scelto).map((c) => c.chiave)).toEqual([SCRIVE, "v[0]", "n", CONDIZIONE, "f › t", "f › n", "g › k"]);
  const mostrate = colonneMostrate(conFunzioni, []);
  expect(gruppiDellaRegione(mostrate, "f › t")).toEqual(["f › n", "f › t"]);
  expect(gruppiDellaRegione(mostrate, SCRIVE)).toEqual(["n", "v", CONDIZIONE, SCRIVE]);
  // Spostare t di f prima di n tocca solo la regione di f.
  expect(conLaRegione(mostrate, "f › t", ["f › t", "f › n"])).toEqual(["n", "v", CONDIZIONE, SCRIVE, "f › t", "f › n", "g › k"]);
});

test("la larghezza resta fra la minima e la massima, in pixel interi", () => {
  expect(limitata(3)).toBe(LARGHEZZA_MINIMA);
  expect(limitata(10_000)).toBe(LARGHEZZA_MASSIMA);
  expect(limitata(100.4)).toBe(100);
});
