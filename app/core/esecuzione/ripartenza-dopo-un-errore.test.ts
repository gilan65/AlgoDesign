// Rieseguire da un errore che ha fermato il programma: con le stesse righe, fino al blocco dell'errore allo stesso passaggio, senza ribatterle. L'atteso è scritto prima del codice.
//
// Il programma: `n` letta (riga «3»), `v` di 2 elementi, `s = 0`, per `i` da 0 a `n - 1`: `s = s + v[i]` (il blocco dell'errore), scrivi `s`; poi scrivi «fine». Al 3° passaggio `v[2]`
// non c'è: il programma si ferma lì, con la console a «0» e «0».
//
// Che cosa NON guarda: l'opzione delle Impostazioni e il comando (`e2e/valore-a-mano.e2e.ts`); una ripartenza da una pausa (`ripartenza.test.ts`).

import { expect, test } from "bun:test";
import { tetti } from "../controllo/controllo";
import type { CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { Esecuzione } from "./esecuzione";
import { RicercaDelPunto, Riesecuzione } from "./ripartenza";
import { senzaOrologio, type Es } from "./ripartenza-di-prova";

const scrivi = (id: string, ...values: string[]) => ({ id, kind: "write", values, newline: true });
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });

const programma = (quanti = 2, corpo: readonly unknown[] = [assegna("b3", "s", "s + v[i]"), scrivi("b4", "s")], a = "n - 1", dopo: readonly unknown[] = [], prima: readonly unknown[] = []): Progetto =>
  ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Prova" },
    functions: [
      {
        id: "f0",
        kind: "main",
        data: [{ name: "n", type: "integer" }, { name: "m", type: "integer" }, { name: "s", type: "integer" }, { name: "i", type: "integer" }, { name: "v", type: "integer", size: quanti, initial: { each: "0" } }],
        body: [...prima, { id: "b1", kind: "read", target: "n" }, assegna("b2", "s", "0"), { id: "b6", kind: "for", counter: "i", from: "0", to: a, body: corpo }, ...dopo, scrivi("b5", '"fine"')],
        end: { id: "b9" },
      },
    ],
  }) as unknown as Progetto;

/** Da capo con le righe date, fino alla fine. */
function finita(p: Progetto, righe: readonly string[] = ["3"], modifica?: (es: Es) => void): Es {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(p, tetti, {});
  let k = 0;
  let scritto = false;
  es.comanda("dentro");
  for (let giri = 0; giri < 100000 && es.stato.genere !== "finita"; giri++) {
    const s = es.stato;
    if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") es.inserisci(righe[k++]!);
    else if (s.genere === "pausa") {
      if (!scritto && modifica !== undefined && s.blocco === "b4") {
        scritto = true;
        modifica(es);
      }
      es.comanda("dentro");
    } else throw new Error(s.genere);
  }
  return es;
}

function riesegui(da: Es, p: Progetto, valori: "tieni" | "togli" = "togli"): { esito: Riesecuzione<CasoDiUnaFunzione>["esito"]; es: Es | undefined } {
  const r = new Riesecuzione<CasoDiUnaFunzione>(da, p, tetti, {}, valori);
  for (let giri = 0; giri < 1000 && r.esito === undefined; giri++) r.fetta(senzaOrologio, Infinity);
  return { esito: r.esito, es: r.esecuzione };
}

const scritte = (es: Es) => es.console.filter((v) => v.genere === "scrive").map((v) => v.testo);

test("la premessa: il programma si ferma sul blocco dell'errore al 3° passaggio, e ci sono le righe date", () => {
  const es = finita(programma());
  expect(es.stato.genere === "finita" && es.stato.errore?.block).toBe("b3");
  expect(scritte(es)).toEqual(["0", "0"]);
  expect(es.righeDate.map((r) => r.text)).toEqual(["3"]);
});

test("corretto il programma: in pausa sul blocco dell'errore, allo stesso passaggio, senza chiedere la riga; poi prosegue fino alla fine", () => {
  const { esito, es } = riesegui(finita(programma()), programma(5));
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(es!.stato).toMatchObject({ genere: "pausa", blocco: "b3" });
  expect(scritte(es!)).toEqual(["0", "0"]);
  es!.comanda("continua");
  es!.fetta(senzaOrologio, Infinity);
  expect(es!.stato).toEqual({ genere: "finita" });
  expect(scritte(es!)).toEqual(["0", "0", "0", "fine"]);
});

test("le azioni prima del blocco possono cambiare: lo stesso passaggio, non lo stesso numero d'azione", () => {
  const { esito, es } = riesegui(finita(programma()), programma(5, undefined, undefined, [], [assegna("b0", "m", "1")]));
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  expect(es!.stato).toMatchObject({ genere: "pausa", blocco: "b3" });
  expect(scritte(es!)).toEqual(["0", "0"]);
});

test("il programma uguale ritrova la stessa pausa, e proseguendo lo stesso errore", () => {
  const { esito, es } = riesegui(finita(programma()), programma());
  expect(esito).toEqual({ ritrovato: true, righeAvanzate: 0 });
  es!.comanda("continua");
  es!.fetta(senzaOrologio, Infinity);
  expect(es!.stato.genere === "finita" && es!.stato.errore?.block).toBe("b3");
});

test("il blocco dell'errore cancellato: il programma va fin dove va con le stesse righe, e il motivo lo dice", () => {
  const { esito, es } = riesegui(finita(programma()), programma(2, [scrivi("b7", "i")]));
  expect(esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
  expect(es!.stato).toEqual({ genere: "finita" });
  expect(scritte(es!)).toEqual(["0", "1", "2", "fine"]);
  expect(es!.righeDate.map((r) => r.text)).toEqual(["3"]);
});

test("il ciclo accorciato: finisce prima di arrivarci, senza errori", () => {
  const { esito, es } = riesegui(finita(programma()), programma(2, undefined, "1"));
  expect(esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
  expect(es!.stato).toEqual({ genere: "finita" });
  expect(scritte(es!)).toEqual(["0", "0", "fine"]);
});

test("un errore che arriva prima del punto ferma lì: non si scavalca", () => {
  const { esito, es } = riesegui(finita(programma()), programma(2, [assegna("b3", "s", "s + v[i + 1]"), scrivi("b4", "s")]));
  expect(esito).toEqual({ ritrovato: false, motivo: "finito_prima" });
  expect(es!.stato.genere === "finita" && es!.stato.errore?.block).toBe("b3");
  expect(scritte(es!)).toEqual(["0"]);
});

test("una lettura in più: si ferma lì e la chiede", () => {
  const { esito, es } = riesegui(finita(programma()), programma(5, undefined, undefined, [], [{ id: "b0", kind: "read", target: "m" }]));
  expect(esito).toEqual({ ritrovato: false, motivo: "riga_per_un_altro_dato" });
  expect(es!.stato).toMatchObject({ genere: "chiede", dato: "m" });
});

test("il progetto con errori non parte: il motivo lo dice", () => {
  const { esito } = riesegui(finita(programma()), programma(5, [assegna("b3", "s", "s + ")]));
  expect(esito).toEqual({ ritrovato: false, motivo: "non_parte" });
});

test("i valori modificati: «tieni» li riapplica allo stesso punto, «togli» no", () => {
  const scrivi100 = (es: Es) => expect(es.modifica({ dato: "s", elemento: 0 }, "100")).toEqual({ ok: true });
  const da = finita(programma(), ["3"], scrivi100);
  expect(da.modifiche.length).toBe(1);
  expect(riesegui(da, programma(5), "tieni").es!.traccia.righe.at(-1)!.dati.valori[2]![0]!.v).toBe(100);
  expect(riesegui(da, programma(5), "togli").es!.traccia.righe.at(-1)!.dati.valori[2]![0]!.v).toBe(0);
});

test("l'esecuzione di partenza non cambia", () => {
  const da = finita(programma());
  const prima = da.stato;
  riesegui(da, programma(5));
  expect(da.stato).toBe(prima);
  expect(scritte(da)).toEqual(["0", "0"]);
});

test("il controllo positivo: un'esecuzione finita SENZA errore non ha un punto da cui ripartire", () => {
  const es = finita(programma(5));
  expect(es.stato).toEqual({ genere: "finita" });
  expect(() => new RicercaDelPunto(es)).toThrow();
  expect(() => new Riesecuzione<CasoDiUnaFunzione>(es, programma(), tetti, {})).toThrow();
});
