// La modalità che registra più esecuzioni, sul piccolo: le ultime che tiene e quante ne ha perse, l'esecuzione aperta che conta fino al
// momento in cui si salva, quella che non parte, gli errori dell'app legati all'esecuzione giusta, i valori che cambiano fra due esecuzioni.
//
// Che cosa NON guarda: chi la accende e la riga di stato (`e2e/in-registrazione.e2e.ts`).

import { expect, test } from "bun:test";
import { contestoDiProva } from "../../strumenti/registrazioni-del-corpus";
import { tetti } from "../controllo/controllo";
import { Esecuzione } from "../esecuzione/esecuzione";
import type { Progetto } from "../progetto/modello";
import { componi } from "./composizione";
import { apriRegistrazione, testoDellaRegistrazione, type ErroreDellApp, type Registrazione } from "./formato";
import { erroriDurante, InRegistrazione, tettoDelleEsecuzioni } from "./in-registrazione";
import { riproduci } from "./riproduzione";

const senzaOrologio = () => 0;

const programma = (nome = "Prova"): Progetto =>
  ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: nome },
    functions: [{ id: "f0", kind: "main", data: [{ name: "n", type: "integer", role: "input" }], body: [{ id: "b1", kind: "read", target: "n" }, { id: "b2", kind: "write", values: ["10 / n"], newline: true }], end: { id: "b3" } }],
  }) as unknown as Progetto;

/** Un programma che non parte: legge un dato che non c'è. */
const cheNonParte = (): Progetto => ({ ...programma(), functions: [{ ...programma().functions[0]!, data: [] }] }) as unknown as Progetto;

function finita(p: Progetto, riga: string, limiti = tetti): Esecuzione {
  const es = new Esecuzione(p, limiti, { tabella: false });
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  es.inserisci(riga);
  es.fetta(senzaOrologio, Infinity);
  return es;
}

const nessuno: readonly ErroreDellApp[] = [];
const voce = (text: string, times = 1): ErroreDellApp => ({ origin: "handled", text, times });

function fileDi(r: InRegistrazione, errori: readonly ErroreDellApp[] = nessuno): Registrazione {
  const { fotografie, perse } = r.composizione(errori);
  return componi({ ...contestoDiProva, erroriDellApp: errori }, fotografie, perse);
}

test("una registrazione nuova non ha esecuzioni; con un'esecuzione già aperta conta anche lei", () => {
  expect(new InRegistrazione(null, nessuno).numero).toBe(0);
  expect(new InRegistrazione(null, nessuno).composizione(nessuno).fotografie).toEqual([]);
  const r = new InRegistrazione(finita(programma(), "5"), nessuno);
  expect(r.numero).toBe(1);
  expect(fileDi(r).executions.length).toBe(1);
});

test("ogni esecuzione col progetto di allora, nell'ordine; l'aperta è l'ultima, com'è al momento di salvare", () => {
  const r = new InRegistrazione(null, nessuno);
  r.apri(finita(programma("Prima"), "5"), nessuno);
  r.chiudi(nessuno);
  const aperta = new Esecuzione(programma("Seconda"), tetti, { tabella: false });
  aperta.comanda("continua");
  r.apri(aperta, nessuno);
  expect(r.numero).toBe(2);
  aperta.fetta(senzaOrologio, Infinity);
  const prima = fileDi(r);
  expect(prima.executions.map((x) => [x.project.metadata.name, x.outcome.kind])).toEqual([["Prima", "finished"], ["Seconda", "asking"]]);
  // Va avanti: il file dopo è diverso, quello di prima no.
  aperta.inserisci("2");
  aperta.fetta(senzaOrologio, Infinity);
  expect(fileDi(r).executions.map((x) => x.outcome.kind)).toEqual(["finished", "finished"]);
  expect(prima.executions[1]!.outcome.kind).toBe("asking");
  expect(r.numero).toBe(2);
});

test("aprirne una nuova fotografa quella di prima, anche senza `chiudi`", () => {
  const r = new InRegistrazione(null, nessuno);
  r.apri(finita(programma("Prima"), "5"), nessuno);
  r.apri(finita(programma("Seconda"), "2"), nessuno);
  expect(fileDi(r).executions.map((x) => x.project.metadata.name)).toEqual(["Prima", "Seconda"]);
});

test("chiudere due volte non la conta due volte", () => {
  const r = new InRegistrazione(finita(programma(), "5"), nessuno);
  r.chiudi(nessuno);
  r.chiudi(nessuno);
  expect(r.numero).toBe(1);
});

test("un'esecuzione che non parte si registra, dopo quella che c'era", () => {
  const r = new InRegistrazione(finita(programma("Prima"), "5"), nessuno);
  const ferma = new Esecuzione(cheNonParte(), tetti, { tabella: false });
  expect(ferma.stato.genere).toBe("non parte");
  r.tieni(ferma, nessuno);
  expect(fileDi(r).executions.map((x) => x.outcome.kind)).toEqual(["finished", "not_started"]);
  expect(r.numero).toBe(2);
});

test(`si tengono le ultime ${tettoDelleEsecuzioni} e il file dice quante ne mancano: l'aperta compresa`, () => {
  const r = new InRegistrazione(null, nessuno);
  const quante = tettoDelleEsecuzioni + 2;
  for (let i = 0; i < quante; i++) r.apri(finita(programma(`P${i}`), "5"), nessuno);
  expect(r.numero).toBe(tettoDelleEsecuzioni);
  const file = fileDi(r);
  expect(file.executions_lost).toBe(2);
  expect(file.executions.map((x) => x.project.metadata.name)).toEqual(Array.from({ length: tettoDelleEsecuzioni }, (_, i) => `P${i + 2}`));
  expect(riproduci(file).uguale).toBe(true);
});

test("fino al tetto nessuna persa", () => {
  const r = new InRegistrazione(null, nessuno);
  for (let i = 0; i < tettoDelleEsecuzioni; i++) r.apri(finita(programma(), "5"), nessuno);
  expect(fileDi(r).executions_lost).toBe(0);
});

test("erroriDurante: le posizioni delle voci nuove e di quelle tornate, mai le altre", () => {
  expect(erroriDurante([], [])).toEqual([]);
  expect(erroriDurante([voce("a")], [voce("a")])).toEqual([]);
  expect(erroriDurante([voce("a")], [voce("a", 2)])).toEqual([0]);
  expect(erroriDurante([voce("a")], [voce("a"), voce("b")])).toEqual([1]);
  expect(erroriDurante([voce("a"), voce("b")], [voce("a", 3), voce("b"), voce("c")])).toEqual([0, 2]);
});

test("un errore è legato alla sola esecuzione aperta quando è arrivato; fra due esecuzioni a nessuna; l'aperta fino al momento di salvare", () => {
  const r = new InRegistrazione(null, nessuno);
  let errori: readonly ErroreDellApp[] = [];
  r.apri(finita(programma("Senza"), "5"), errori);
  r.chiudi(errori);
  // Fra due esecuzioni.
  errori = [voce("fra le due")];
  r.apri(finita(programma("Con"), "5"), errori);
  errori = [voce("fra le due"), voce("durante")];
  r.chiudi(errori);
  r.apri(finita(programma("Aperta"), "5"), errori);
  errori = [voce("fra le due", 2), voce("durante")];
  const file = fileDi(r, errori);
  expect(file.executions.map((x) => [x.project.metadata.name, x.app_errors_during])).toEqual([["Senza", undefined], ["Con", [1]], ["Aperta", [0]]]);
  // Nel testo c'è, e il lettore lo tiene: il file riaperto dice lo stesso.
  const riaperta = apriRegistrazione(testoDellaRegistrazione(file));
  if (!riaperta.ok) throw new Error(JSON.stringify(riaperta.errori));
  expect(riaperta.registrazione.executions.map((x) => x.app_errors_during)).toEqual([undefined, [1], [0]]);
  expect(riproduci(riaperta.registrazione).uguale).toBe(true);
});

test("i valori che cambiano fra due esecuzioni: la prima li dà al file, l'altra porta i suoi, e si riproduce coi suoi", () => {
  const r = new InRegistrazione(null, nessuno);
  r.apri(finita(programma("Prima"), "5"), nessuno);
  r.apri(finita(programma("Altra"), "5", { ...tetti, elementiDiUnVettore: 9 }), nessuno);
  const file = fileDi(r);
  expect(file.limits.vector_elements).toBe(tetti.elementiDiUnVettore);
  expect(file.executions[0]!.limits).toBeUndefined();
  expect(file.executions[1]!.limits?.vector_elements).toBe(9);
  expect(file.executions[1]!.long_lines).toEqual(file.long_lines);
  expect(riproduci(file).uguale).toBe(true);
});
