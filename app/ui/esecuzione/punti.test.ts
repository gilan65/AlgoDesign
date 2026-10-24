// I punti di interruzione fuori dalla cronologia: tolti all'apertura, rimessi per salvare. Sul programma di
// riferimento, con punti dentro un ramo, dentro un ciclo e sulla fine.
//
// Che cosa NON guarda: le funzioni oltre il programma principale (la tappa 1 non le ha, il codice le visita
// allo stesso modo); che la finestra usi queste funzioni (lo provano i motori e la finestra sotto happy-dom).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { apri, salva } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { conPunti, puntiDi, senzaPunti } from "./punti";

const testo = readFileSync(new URL("../../casi/tappa-1/riferimento-media-voti.algo", import.meta.url), "utf8");
const progetto = (t: string): Progetto => {
  const r = apri(t);
  if (!r.ok) throw new Error("il riferimento non si apre");
  return r.progetto;
};

test("il riferimento non ha punti; quelli aggiunti si scrivono nei loro blocchi, anche annidati e sulla fine", () => {
  const p = progetto(testo);
  expect([...puntiDi(p)]).toEqual([]);
  // b7 è la condizione del ciclo, b11 un blocco nel suo corpo, b24 la fine.
  const con = conPunti(p, new Set(["b7", "b11", "b24"]));
  expect([...puntiDi(con)].sort()).toEqual(["b11", "b24", "b7"]);
  const scritto = salva(con);
  // Controllo positivo: il testo cambia esattamente di tre righe `"breakpoint": true`.
  expect(scritto.split("\n").filter((r) => r.includes('"breakpoint": true')).length).toBe(3);
  expect([...puntiDi(progetto(scritto))].sort()).toEqual(["b11", "b24", "b7"]);
});

test("tolti e rimessi, i punti danno lo stesso file byte per byte; un `false` del file resta; un id che non c'è non si scrive", () => {
  const conTre = salva(conPunti(progetto(testo), new Set(["b7", "b11", "b24"])));
  const p = progetto(conTre);
  const senza = senzaPunti(p);
  expect([...puntiDi(senza)]).toEqual([]);
  expect(salva(conPunti(senza, puntiDi(p)))).toBe(conTre);
  // Un `breakpoint: false` scritto nel file non è un punto, e resta.
  const conFalso = conTre.replace('"id": "b24",\n        "breakpoint": true', '"id": "b24",\n        "breakpoint": false');
  expect(conFalso).not.toBe(conTre);
  const q = progetto(conFalso);
  expect([...puntiDi(q)].sort()).toEqual(["b11", "b7"]);
  expect(salva(conPunti(senzaPunti(q), puntiDi(q)))).toBe(conFalso);
  // Un blocco che non c'è (cancellato) non lascia traccia.
  expect(salva(conPunti(senzaPunti(p), new Set(["b999"])))).toBe(salva(senza));
});
