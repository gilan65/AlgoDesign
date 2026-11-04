// Le modifiche a mano nel file di una registrazione: stanno nell'esecuzione, si riproducono allo stesso punto dal solo testo; il lettore e lo schema ne rifiutano
// le forme sbagliate. Il controllo positivo: la modifica tolta dal file dà «diverso».
//
// Che cosa NON guarda: un altro computer (`strumenti/registrazioni-del-corpus.ts`); il resto del formato (`registrazione.test.ts`).

import { expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020";
import { alterata, registrazioneDi } from "../../strumenti/registrazioni-del-corpus";
import { tetti } from "../controllo/controllo";
import { Esecuzione } from "../esecuzione/esecuzione";
import type { Progetto } from "../progetto/modello";
import { apriRegistrazione, leggiRegistrazione, schemaDellaRegistrazione, testoDellaRegistrazione } from "./formato";
import { riproduci } from "./riproduzione";

const senzaOrologio = () => 0;

/** Una lettura, una scrittura che dipende dal dato letto. */
const programma = (): Progetto =>
  ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Prova" },
    functions: [
      {
        id: "f0",
        kind: "main",
        data: [{ name: "n", type: "integer", role: "input" }],
        body: [
          { id: "b1", kind: "read", target: "n" },
          { id: "b2", kind: "write", values: ["10 / n"], newline: true },
        ],
        end: { id: "b3" },
      },
    ],
  }) as unknown as Progetto;

function fermaSulloScrivere(): Esecuzione {
  const es = new Esecuzione(programma(), tetti, { tabella: false });
  es.comanda("dentro");
  for (let giri = 0; giri < 1000 && !(es.stato.genere === "pausa" && es.stato.blocco === "b2"); giri++) {
    const s = es.stato;
    if (s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") es.inserisci("5");
  }
  return es;
}

/** `n` letta 5 e portata a 2: scrive 5, e non 2. */
function conLaModifica(): Esecuzione {
  const es = fermaSulloScrivere();
  expect(es.modifica({ dato: "n", elemento: 0 }, "2")).toEqual({ ok: true });
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  expect(es.console.at(-1)).toMatchObject({ genere: "scrive", testo: "5" });
  return es;
}

test("una modifica è nel file e si riproduce dal solo testo: uguale", () => {
  const r = registrazioneDi(conLaModifica());
  expect(r.executions[0]!.changes).toEqual([{ advances: expect.any(Number), data: "n", element: 0, text: "2" }]);
  const aperta = apriRegistrazione(testoDellaRegistrazione(r));
  expect(aperta.ok).toBe(true);
  expect(aperta.ok && riproduci(aperta.registrazione)).toEqual({ uguale: true, esecuzioni: 1, differenze: [] });
});

test("anche un'esecuzione non finita, ferma sulla modifica", () => {
  const es = fermaSulloScrivere();
  es.modifica({ dato: "n", elemento: 0 }, "2");
  expect(riproduci(registrazioneDi(es)).uguale).toBe(true);
});

test("la modifica tolta dal file dà «diverso»; spostata dove non si arriva, o col valore che non va, sul suo campo", () => {
  const r = registrazioneDi(conLaModifica());
  const tolta = riproduci(alterata(r, (x) => delete x.changes));
  expect(tolta.uguale).toBe(false);
  expect(tolta.differenze.map((d) => d.campo)).toContain("console");
  const lontana = riproduci(alterata(r, (x) => (x.changes = [{ advances: 100000, data: "n", element: 0, text: "2" }])));
  expect(lontana.uguale).toBe(false);
  expect(lontana.differenze.map((d) => d.campo)).toContain("changes");
  const punto = r.executions[0]!.changes![0]!.advances;
  const nonValida = riproduci(alterata(r, (x) => (x.changes = [{ advances: punto, data: "n", element: 0, text: "abc" }])));
  expect(nonValida.differenze.map((d) => d.campo)).toContain("changes");
});

test("un'esecuzione senza modifiche non ha il campo: i file di prima restano uguali", () => {
  const es = new Esecuzione(programma(), tetti, { tabella: false });
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  es.inserisci("5");
  es.fetta(senzaOrologio, Infinity);
  expect("changes" in registrazioneDi(es).executions[0]!).toBe(false);
});

const valida = new Ajv2020({ strict: true, allErrors: true }).compile(schemaDellaRegistrazione());

const partenza = () => {
  const es = new Esecuzione(programma(), tetti, { tabella: false });
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  es.inserisci("5");
  es.fetta(senzaOrologio, Infinity);
  return JSON.parse(testoDellaRegistrazione(registrazioneDi(es))) as Record<string, unknown> & { executions: Record<string, unknown>[] };
};

test("le forme sbagliate di una modifica: rifiutate dal lettore e dallo schema; il controllo positivo è la forma giusta", () => {
  const conLe = (changes: unknown) => {
    const r = partenza();
    r.executions[0]!.changes = changes;
    return r;
  };
  const giusta = conLe([{ advances: 1, data: "n", element: 0, text: "2" }]);
  expect(leggiRegistrazione(giusta).ok).toBe(true);
  expect(valida(giusta)).toBe(true);
  const sonde: readonly (readonly [unknown, string, string])[] = [
    [[{ advances: 1, data: "n", element: 0, text: "2", colore: 1 }], "executions[0].changes[0].colore", "unknown_field"],
    [[{ data: "n", element: 0, text: "2" }], "executions[0].changes[0].advances", "missing_field"],
    [[{ advances: -1, data: "n", element: 0, text: "2" }], "executions[0].changes[0].advances", "invalid_value"],
    [[{ advances: 1, data: "n", element: -1, text: "2" }], "executions[0].changes[0].element", "invalid_value"],
    [[{ advances: 1, data: "n", element: 0 }], "executions[0].changes[0].text", "missing_field"],
  ];
  const diversi = sonde.flatMap(([c, percorso, motivo]) => {
    const r = conLe(c);
    const letto = leggiRegistrazione(r);
    const detto = letto.ok ? [] : letto.errori;
    return [...(detto.some((e) => e.percorso === percorso && e.motivo === motivo) ? [] : [`${percorso}: ${JSON.stringify(detto)}`]), ...(valida(r) ? [`${percorso}: lo schema l'accetta`] : [])];
  });
  expect(diversi).toEqual([]);
});

test("una modifica insieme a un caso d'uso è rifiutata: nell'esecuzione di un caso non se ne fanno", () => {
  const r = partenza();
  delete r.executions[0]!.reads;
  r.executions[0]!.test_case = { name: "x", inputs: [], expected: { output: "" } };
  expect(leggiRegistrazione(r).ok).toBe(true);
  expect(valida(r)).toBe(true);
  r.executions[0]!.changes = [{ advances: 1, data: "n", element: 0, text: "2" }];
  const letto = leggiRegistrazione(r);
  expect(letto.ok ? [] : letto.errori).toContainEqual({ percorso: "executions[0].changes", motivo: "field_not_allowed" });
  expect(valida(r)).toBe(false);
});
