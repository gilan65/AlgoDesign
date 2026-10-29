// La tabella di traccia con un vettore oltre il tetto delle colonne (10), nel nucleo: le tre forme della tabella
// mostrata (le colonne dei primi dieci con quella degli altri; il vettore in fila in una colonna sola; una
// colonna per elemento), le due forme del CSV (uguale alla tabella, anche con le colonne nell'ordine mostrato; una colonna
// per elemento), la riga che spiega
// che cosa si vede, il watch con tutti gli elementi; poi il CSV nei casi di confine (separatori uguali, a capo
// dentro una cella, decimali del progetto, celle che un foglio di calcolo aprirebbe come formule).
//
// L'atteso del vettore è scritto a mano (`atteso-del-vettore.ts`); le prove confrontano con lui il CSV byte per
// byte e la tabella mostrata cella per cella, e il CSV «uguale» con la tabella mostrata.
//
// CHE COSA NON GUARDA:
// - le frasi vere della riga sopra la tabella (qui gli schemi brevi di `testi-di-prova.ts`; le frasi dei
//   dizionari le prova `ui/esecuzione/tabella.test.tsx`), né la tabella a schermo e la riga mostrata (prove
//   dell'interfaccia e nei motori);
// - un carattere di codice 0 in una cella: nessun valore lo contiene (una stringa lo rifiuta con un errore
//   dell'interprete) e l'output non lo scrive;
// - il tempo e la memoria della tabella con un vettore di 1000 elementi: si misurano a parte, nella finestra;
// - le righe tolte oltre le ultime 1000 (le prova `esecuzione.test.ts`).

import { describe, expect, test } from "bun:test";
import { tetti } from "../controllo/controllo";
import { opzioniPredefinite as opzioniDelDisegno, type FormeDeiCicli } from "../disegno/impaginazione";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apri, leggi } from "../progetto/formato";
import type { Progetto } from "../progetto/modello";
import {
  cambiateAttese,
  inFilaInglese,
  inFilaItaliano,
  iniziatiCambiateAttese,
  iniziatiInFilaInglese,
  iniziatiInFilaItaliano,
  iniziatiPerElementoInglese,
  iniziatiPerElementoItaliano,
  iniziatiPrimiEAltriInglese,
  iniziatiPrimiEAltriItaliano,
  perElementoInglese,
  perElementoItaliano,
  primiEAltriInglese,
  primiEAltriItaliano,
  progettoDeiValoriIniziali,
  progettoDelVettore,
  regolaDiRComeElenco,
  regolaDiRComeValoreSolo,
} from "./atteso-del-vettore";
import { cambiateDelPerOgni, perAtteso, perOgniVettoreAtteso } from "./atteso-dei-cicli";
import { cambiateDellaCopia, copiaDelRecordItaliano } from "./atteso-del-record";
import {
  cambiateDellaCopiaPerRiga,
  copiaInFila,
  copiaPerElemento,
  copiaPerRiga,
  pezziDellaRiga24,
  progettoDellaCopia,
  progettoDelleUndiciRighe,
  undiciCsvPerElemento,
  undiciInFila,
  undiciPerElemento,
  undiciPerRiga,
} from "./atteso-della-matrice";
import { Esecuzione } from "./esecuzione";
import { testiEn, testiIt } from "./testi-di-prova";
import * as traccia from "./traccia";
import { csv, separatoriPredefiniti, TabellaMostrata, type FormaDeiVettori, type FormaDelleMatrici, type RigaMostrata, type TestiDellaTraccia } from "./traccia";

type Json = any;
function progetto(p: Json): Progetto {
  const esito = leggi(p);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
function conDati(data: Json[], body: Json[], options?: Json): Progetto {
  return progetto({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }],
    ...(options ? { options } : {}),
  });
}

/** Esegue fino alla fine, senza input. */
function eseguita(p: Progetto): Esecuzione {
  const e = new Esecuzione(p, tetti);
  e.comanda("continua");
  for (let k = 0; k < 100 && e.stato.genere !== "finita"; k++) e.fetta(() => 0, Infinity);
  if (e.stato.genere !== "finita") throw new Error(JSON.stringify(e.stato));
  return e;
}

/** Le righe del CSV senza il BOM iniziale e senza il CR LF finale. */
const righeDelCsv = (testo: string): string[] => testo.slice(1).split("\r\n").slice(0, -1);

/** Le celle di una riga del CSV: separate da `sep`, fra virgolette quelle che lo contengono (le virgolette
 * raddoppiate dentro). */
function celleDelCsv(riga: string, sep: string): string[] {
  const celle: string[] = [];
  let k = 0;
  for (;;) {
    let cella = "";
    if (riga[k] === '"') {
      for (k++; ; k++) {
        if (riga[k] === '"' && riga[k + 1] === '"') {
          cella += '"';
          k++;
        } else if (riga[k] === '"') {
          k++;
          break;
        } else cella += riga[k];
      }
    } else while (k < riga.length && riga[k] !== sep) cella += riga[k++];
    celle.push(cella);
    if (k >= riga.length) return celle;
    k++;
  }
}

/** Le posizioni in cui due elenchi differiscono, la lunghezza compresa. */
const differenze = (a: readonly string[], b: readonly string[]): string[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, k) => k).flatMap((k) => (a[k] === b[k] ? [] : [`${k}: ${a[k]} | ${b[k]}`]));

const vettore = progetto(progettoDelVettore);
const lingue = [
  { nome: "italiano", testi: testiIt, sep: separatoriPredefiniti.it, atteso: { "primi-e-altri": primiEAltriItaliano, "in-fila": inFilaItaliano, "per-elemento": perElementoItaliano } },
  { nome: "inglese", testi: testiEn, sep: separatoriPredefiniti.en, atteso: { "primi-e-altri": primiEAltriInglese, "in-fila": inFilaInglese, "per-elemento": perElementoInglese } },
] as const;
const forme: readonly FormaDeiVettori[] = ["primi-e-altri", "in-fila", "per-elemento"];

/** Una riga mostrata come la scrive l'atteso: le celle unite dal separatore, senza le virgolette del CSV (nessuna
 * cella dell'atteso del vettore ne ha bisogno). */
const comeNellAtteso = (r: RigaMostrata, sep: string) => [String(r.numero), r.regola, ...r.valori.map((c) => c.testo), r.condizione, r.scrive].join(sep);

// ------------------------------------------------------------------------- le forme del vettore

describe("un vettore di 12 elementi riempito da un ciclo, contro l'atteso scritto a mano", () => {
  const e = eseguita(vettore);

  test("il tetto delle colonne è 10", () => {
    expect(traccia.tettoDelleColonne).toBe(10);
  });

  test("la tabella mostra le matrici: un progetto che le usa si costruisce, e ogni riga ha una cella per colonna", () => {
    const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", "copia-di-una-matrice.algo"), "utf8"));
    if (!a.ok) throw new Error("copia-di-una-matrice non si apre");
    const e = eseguita(a.progetto);
    const tabella = new TabellaMostrata(a.progetto, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    const righe = tabella.righe(e.traccia);
    expect(righe.filter((r) => r.valori.length !== tabella.colonne.length).map((r) => r.numero)).toEqual([]);
    // Controllo positivo: le righe ci sono, e le matrici hanno una colonna per riga (la forma predefinita).
    expect(righe.length).toBeGreaterThan(20);
    expect(tabella.colonne.map((c) => c.nome).slice(0, 4)).toEqual(["a[0]", "a[1]", "b[0]", "b[1]"]);
  });

  for (const l of lingue)
    for (const forma of forme) {
      test(`${forma}, in ${l.nome}: la tabella mostrata cella per cella, e il CSV uguale byte per byte`, () => {
        const tabella = new TabellaMostrata(vettore, l.testi, l.sep.decimali, forma, "elenco", opzioniDelDisegno);
        const atteso = l.atteso[forma];
        // L'intestazione: le colonne della tabella col tipo, come nel CSV.
        const intestazione = [l.testi.numero, l.testi.regola, ...tabella.colonne.map((c) => `${c.nome} (${c.tipo})`), l.testi.condizione, l.testi.scrive].join(l.sep.campo);
        const mostrate = [intestazione, ...tabella.righe(e.traccia).map((r) => comeNellAtteso(r, l.sep.campo))];
        expect(differenze(mostrate, atteso)).toEqual([]);
        const file = csv(e.traccia, tabella, "uguale", l.sep.campo);
        expect(differenze(righeDelCsv(file), atteso)).toEqual([]);
        expect(file).toBe(`\u{feff}${atteso.join("\r\n")}\r\n`);
      });
    }

  test("il CSV con una colonna per elemento, da una tabella in ognuna delle tre forme e nelle due lingue", () => {
    for (const l of lingue)
      for (const forma of forme) {
        const tabella = new TabellaMostrata(vettore, l.testi, l.sep.decimali, forma, "elenco", opzioniDelDisegno);
        expect(differenze(righeDelCsv(csv(e.traccia, tabella, "per-elemento", l.sep.campo)), l.atteso["per-elemento"]), `${forma} in ${l.nome}`).toEqual([]);
      }
  });

  test("il CSV «uguale» è la tabella mostrata: ogni cella viene dalle sue righe", () => {
    for (const forma of forme) {
      const tabella = new TabellaMostrata(vettore, testiIt, ",", forma, "elenco", opzioniDelDisegno);
      const celle = tabella.righe(e.traccia).map((r) => comeNellAtteso(r, ";"));
      expect(righeDelCsv(csv(e.traccia, tabella, "uguale", ";")).slice(1)).toEqual(celle);
    }
  });

  test("controllo positivo: una cella dell'atteso cambiata fa rosso il confronto, in ogni forma", () => {
    for (const forma of ["primi-e-altri", "in-fila"] as const) {
      const tabella = new TabellaMostrata(vettore, testiIt, ",", forma, "elenco", opzioniDelDisegno);
      const alterato = [...lingue[0].atteso[forma]];
      // La riga 9 (dopo l'intestazione): il primo elemento oltre il tetto.
      alterato[10] = alterato[10]!.replace("100,00", "100,01");
      expect(differenze(righeDelCsv(csv(e.traccia, tabella, "uguale", ";")), alterato).length, forma).toBe(1);
    }
  });

  test("le celle cambiate: nella colonna degli altri nelle righe che la riempiono; in fila, l'elemento cambiato dentro la cella", () => {
    for (const forma of ["primi-e-altri", "in-fila"] as const) {
      const tabella = new TabellaMostrata(vettore, testiIt, ",", forma, "elenco", opzioniDelDisegno);
      const viste: Record<number, readonly string[]> = {};
      for (const r of tabella.righe(e.traccia)) {
        const cambiate = r.valori.flatMap((c, k) => {
          if (!c.cambiata) return [];
          const nome = tabella.colonne[k]!.nome;
          const dentro = c.pezzi?.filter((p) => p.cambiato).map((p) => p.testo);
          return [dentro ? `${nome} ${dentro.join(" ")}` : nome];
        });
        if (cambiate.length > 0) viste[r.numero] = cambiate;
      }
      expect(viste, forma).toEqual(forma === "primi-e-altri" ? cambiateAttese.primiEAltri : cambiateAttese.inFila);
    }
  });

  test("in fila, i pezzi di una cella uniti sono il suo testo, in ogni riga", () => {
    const tabella = new TabellaMostrata(vettore, testiIt, ",", "in-fila", "elenco", opzioniDelDisegno);
    const sbagliate = tabella.righe(e.traccia).flatMap((r) => {
      const c = r.valori[0]!;
      return c.pezzi?.map((p) => p.testo).join("") === c.testo ? [] : [r.numero];
    });
    expect(sbagliate).toEqual([]);
    // Controllo positivo: la riga 0 non ha elementi cambiati, ma ha i suoi pezzi.
    expect(tabella.iniziale(e.traccia)!.valori[0]!.pezzi?.length).toBe(1);
  });

  test("il watch dà tutti gli elementi in ogni forma, coi valori della riga corrente", () => {
    for (const forma of forme) {
      const tabella = new TabellaMostrata(vettore, testiIt, ",", forma, "elenco", opzioniDelDisegno);
      const w = tabella.watch(e.traccia, "v");
      expect({ forma, nomi: w?.elementi.map((x) => x.nome).join(" "), valori: w?.elementi.map((x) => x.cella.testo).slice(7) }).toEqual({
        forma,
        nomi: "v[0] v[1] v[2] v[3] v[4] v[5] v[6] v[7] v[8] v[9] v[10] v[11]",
        valori: ["non inizializzata", "64,00", "81,00", "100,00", "121,00"],
      });
      expect(tabella.watch(e.traccia, "i")?.elementi.map((x) => x.cella.testo)).toEqual(["12"]);
    }
  });
});

describe("un vettore di al più 10 elementi", () => {
  const p = conDati(
    [
      { name: "v", type: "integer", size: 10, initial: { each: "5" } },
      { name: "n", type: "integer", initial: "-2" },
    ],
    [{ id: "b1", kind: "assignment", target: "v[9]", value: "n" }],
  );
  const e = eseguita(p);

  test("coi primi dieci resta una colonna per elemento, come con una colonna per elemento; in fila va in una colonna sola", () => {
    const colonne = (forma: FormaDeiVettori) => new TabellaMostrata(p, testiIt, ",", forma, "elenco", opzioniDelDisegno).colonne.map((c) => c.nome).join(" ");
    expect(colonne("primi-e-altri")).toBe("v[0] v[1] v[2] v[3] v[4] v[5] v[6] v[7] v[8] v[9] n");
    expect(colonne("per-elemento")).toBe(colonne("primi-e-altri"));
    expect(colonne("in-fila")).toBe("v n");
    expect(new TabellaMostrata(p, testiIt, ",", "in-fila", "elenco", opzioniDelDisegno).righe(e.traccia).at(-1)!.valori[0]!.testo).toBe("5 · 5 · 5 · 5 · 5 · 5 · 5 · 5 · 5 · -2");
  });
});

describe("un vettore di 11 elementi: la colonna degli altri ha un elemento solo, e si chiama come lui", () => {
  const p = conDati([{ name: "v", type: "integer", size: 11, initial: { each: "4" } }], [{ id: "b1", kind: "assignment", target: "v[10]", value: "9" }]);
  const e = eseguita(p);
  const tabella = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "un-valore", opzioniDelDisegno);

  test("il nome della colonna, la riga sopra la tabella, la riga del valore iniziale e l'azione sull'undicesimo", () => {
    const righe = tabella.righe(e.traccia);
    expect({
      colonna: tabella.colonne[10]!.nome,
      spiegazione: tabella.spiegazione("uguale"),
      iniziale: righe[1]!.valori[10]!.testo,
      azione: righe[2]!.valori[10]!.testo,
    }).toEqual({ colonna: "v[10]", spiegazione: "v: 11, i primi 10, gli altri in v[10]. CSV uguale.", iniziale: "v[10] ← {4}", azione: "v[10] 9" });
    // Controllo positivo: con 12 elementi la colonna è ancora un intervallo.
    const dodici = conDati([{ name: "v", type: "integer", size: 12 }], []);
    expect(new TabellaMostrata(dodici, testiIt, ",", "primi-e-altri", "un-valore", opzioniDelDisegno).colonne[10]!.nome).toBe("v[10…11]");
  });
});

test("più elementi oltre il decimo cambiati dalla stessa azione: tutti nella colonna degli altri, nell'ordine", () => {
  const p = conDati(
    [
      { name: "c", type: "character", size: 13 },
      { name: "s", type: "string", initial: '"abcdefghijklm"' },
    ],
    [{ id: "b1", kind: "assignment", target: "c", value: "to_array s" }],
  );
  const e = eseguita(p);
  const tabella = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
  expect(tabella.colonne.map((c) => c.nome).slice(9, 11)).toEqual(["c[9]", "c[10…12]"]);
  const righe = tabella.righe(e.traccia);
  // La riga 0, il valore iniziale di s, l'azione, la fine.
  expect(righe.map((r) => r.valori[10]!.testo)).toEqual(["", "", "c[10] k · c[11] l · c[12] m", ""]);
});

// ------------------------------------------------------------------- i valori iniziali di due vettori

describe("due vettori di 12 elementi col valore iniziale, contro l'atteso scritto a mano", () => {
  const p = progetto(progettoDeiValoriIniziali);
  const e = eseguita(p);
  const lingueDegliIniziati = [
    { nome: "italiano", lingua: "it", testi: testiIt, sep: separatoriPredefiniti.it, atteso: { "primi-e-altri": iniziatiPrimiEAltriItaliano, "in-fila": iniziatiInFilaItaliano, "per-elemento": iniziatiPerElementoItaliano } },
    { nome: "inglese", lingua: "en", testi: testiEn, sep: separatoriPredefiniti.en, atteso: { "primi-e-altri": iniziatiPrimiEAltriInglese, "in-fila": iniziatiInFilaInglese, "per-elemento": iniziatiPerElementoInglese } },
  ] as const;

  for (const l of lingueDegliIniziati)
    for (const forma of forme)
      for (const ripetuto of ["elenco", "un-valore"] as const) {
        test(`${forma}, in ${l.nome}, col valore ripetuto ${ripetuto === "elenco" ? "in un elenco" : "come valore solo"}: la tabella mostrata cella per cella, e il CSV uguale byte per byte`, () => {
          const tabella = new TabellaMostrata(p, l.testi, l.sep.decimali, forma, ripetuto, opzioniDelDisegno);
          // Col valore solo cambia la regola della riga del valore iniziale di r, e nient'altro.
          const atteso = l.atteso[forma].map((r) => (ripetuto === "elenco" ? r : r.replace(regolaDiRComeElenco[l.lingua], regolaDiRComeValoreSolo[l.lingua]).replace(/^2,"([^",]*)",/, "2,$1,")));
          const file = csv(e.traccia, tabella, "uguale", l.sep.campo);
          expect(differenze(righeDelCsv(file), atteso)).toEqual([]);
          expect(file).toBe(`\u{feff}${atteso.join("\r\n")}\r\n`);
          // La tabella mostrata: le celle dell'atteso, senza le virgolette del CSV.
          const mostrate = tabella.righe(e.traccia).map((r) => [String(r.numero), r.regola, ...r.valori.map((c) => c.testo), r.condizione, r.scrive]);
          expect(mostrate).toEqual(atteso.slice(1).map((r) => celleDelCsv(r, l.sep.campo)));
        });
      }

  test("controllo positivo: la riga del valore ripetuto cambia davvero fra i due modi, e una cella dell'atteso alterata fa rosso", () => {
    const elenco = csv(e.traccia, new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno), "uguale", ";");
    const solo = csv(e.traccia, new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "un-valore", opzioniDelDisegno), "uguale", ";");
    expect(differenze(righeDelCsv(elenco), righeDelCsv(solo)).length).toBe(1);
    const alterato = [...iniziatiPrimiEAltriItaliano];
    alterato[2] = alterato[2]!.replace("q[10…11] ← {100, 121}", "q[10…11] ← {100, 122}");
    expect(differenze(righeDelCsv(elenco), alterato).length).toBe(1);
  });

  test("le celle cambiate: i dieci elementi e la colonna degli altri nella riga del valore iniziale; in fila, ogni elemento", () => {
    for (const forma of ["primi-e-altri", "in-fila"] as const) {
      const tabella = new TabellaMostrata(p, testiIt, ",", forma, "elenco", opzioniDelDisegno);
      const viste: Record<number, readonly string[]> = {};
      for (const r of tabella.righe(e.traccia)) {
        const cambiate = r.valori.flatMap((c, k) => {
          if (!c.cambiata) return [];
          const nome = tabella.colonne[k]!.nome;
          const dentro = c.pezzi?.filter((x) => x.cambiato).map((x) => x.testo);
          return [dentro ? `${nome} ${dentro.join(" ")}` : nome];
        });
        if (cambiate.length > 0) viste[r.numero] = cambiate;
      }
      expect(viste, forma).toEqual(forma === "primi-e-altri" ? iniziatiCambiateAttese.primiEAltri : iniziatiCambiateAttese.inFila);
    }
  });

  test("un vettore di mille elementi: la colonna degli altri della riga del valore iniziale ha dieci valori e quanti ne restano", () => {
    const mille = conDati([{ name: "w", type: "integer", size: 1000, initial: { each: "7" } }], []);
    const t = eseguita(mille).traccia;
    const riga = new TabellaMostrata(mille, testiIt, ",", "primi-e-altri", "un-valore", opzioniDelDisegno).righe(t)[1]!;
    expect({ regola: riga.regola, altri: riga.valori[10]!.testo, cambiata: riga.valori[10]!.cambiata }).toEqual({
      regola: "w ← 7 in ogni elemento",
      altri: "w[10…999] ← {7, 7, 7, 7, 7, 7, 7, 7, 7, 7, … altri 980}",
      cambiata: true,
    });
  });
});

// ------------------------------------------------------------------------- la riga che spiega

describe("la riga sopra la tabella: che cosa si vede di ogni vettore e che cosa ha il CSV", () => {
  const p = conDati(
    [
      { name: "v", type: "integer", size: 12 },
      { name: "corto", type: "integer", size: 3 },
      { name: "w", type: "real", size: 1000 },
      { name: "n", type: "integer" },
    ],
    [],
  );
  const spiega = (forma: FormaDeiVettori, csvForma: "uguale" | "per-elemento", testi: TestiDellaTraccia = testiIt) => new TabellaMostrata(p, testi, ",", forma, "elenco", opzioniDelDisegno).spiegazione(csvForma);

  test("coi primi dieci: i vettori oltre il tetto, con la colonna degli altri; poi il CSV", () => {
    expect(spiega("primi-e-altri", "uguale")).toBe("v: 12, i primi 10, gli altri in v[10…11]. w: 1000, i primi 10, gli altri in w[10…999]. CSV uguale.");
    expect(spiega("primi-e-altri", "per-elemento")).toBe("v: 12, i primi 10, gli altri in v[10…11]. w: 1000, i primi 10, gli altri in w[10…999]. CSV per elemento.");
    expect(spiega("primi-e-altri", "per-elemento", testiEn)).toBe("v: 12, first 10, others in v[10…11]. w: 1000, first 10, others in w[10…999]. CSV per element.");
  });

  test("in fila: ogni vettore, anche quelli di al più 10 elementi", () => {
    expect(spiega("in-fila", "uguale")).toBe("v: 12 in fila. corto: 3 in fila. w: 1000 in fila. CSV uguale.");
  });

  test("nessuna riga quando la tabella ha una colonna per elemento", () => {
    expect(spiega("per-elemento", "uguale")).toBeUndefined();
    expect(spiega("per-elemento", "per-elemento")).toBeUndefined();
    const piccolo = conDati([{ name: "corto", type: "integer", size: 3 }], []);
    expect(new TabellaMostrata(piccolo, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno).spiegazione("per-elemento")).toBeUndefined();
    // Controllo positivo: lo stesso progetto in fila la riga ce l'ha.
    expect(new TabellaMostrata(piccolo, testiIt, ",", "in-fila", "elenco", opzioniDelDisegno).spiegazione("per-elemento")).toBe("corto: 3 in fila. CSV per elemento.");
  });
});

// ------------------------------------------------------------------------------ il CSV ai confini

describe("il CSV ai confini", () => {
  test("le celle che un foglio di calcolo aprirebbe come formule cominciano con l'apostrofo; i numeri negativi no, e la tabella mostrata non lo ha", () => {
    const p = conDati(
      [
        { name: "a", type: "string", initial: '"=SOMMA(A1)"' },
        { name: "b", type: "string", initial: '"+39"' },
        { name: "c", type: "string", initial: '"@x"' },
        { name: "d", type: "string", initial: '"-a"' },
        { name: "t", type: "string", initial: '"\\tx"' },
        { name: "n", type: "integer", initial: "-3" },
        { name: "r", type: "real", initial: "-0.5" },
        { name: "m", type: "string", initial: '"-7"' },
      ],
      [{ id: "b1", kind: "write", values: ["a"], newline: false }],
    );
    const e = eseguita(p);
    const tabella = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    const righe = righeDelCsv(csv(e.traccia, tabella, "uguale", ";"));
    // Le righe 1-8 sono i valori iniziali, la cui regola comincia col nome del dato: niente apostrofo.
    expect(righe[2]).toBe(`1;"a ← ""=SOMMA(A1)""";'=SOMMA(A1);non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;;`);
    expect(righe[9]).toBe(`8;"m ← ""-7""";'=SOMMA(A1);'+39;'@x;'-a;'\tx;-3;-0,50;-7;;`);
    expect(righe[10]).toBe("9;scrivi a;'=SOMMA(A1);'+39;'@x;'-a;'\tx;-3;-0,50;-7;;'=SOMMA(A1)");
    // La differenza è della forma del file, come le virgolette: la tabella mostrata ha il testo del valore.
    expect(tabella.righe(e.traccia)[9]!.valori.map((c) => c.testo).slice(0, 5)).toEqual(["=SOMMA(A1)", "+39", "@x", "-a", "\tx"]);
  });

  test("separatore delle celle e dei decimali uguali; a capo dentro una cella; decimali del progetto; un reale negativo in un vettore", () => {
    const p = conDati(
      [
        { name: "r", type: "real", size: 2, initial: ["-1.5", "2.25"] },
        { name: "s", type: "string", initial: '"a\\nb"' },
        { name: "q", type: "string" },
      ],
      [{ id: "b1", kind: "assignment", target: "q", value: '"c" + to_character 13 + "d"' }],
      { real_decimals: 3 },
    );
    const e = eseguita(p);
    const conLaVirgola = csv(e.traccia, new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno), "uguale", ",");
    // Le righe 1 e 2 sono i valori iniziali di r e di s; l'azione è la 3.
    expect(conLaVirgola.slice(1).split("\r\n")[4]).toBe('3,"q ← ""c"" + converti_a_carattere 13 + ""d""","-1,500","2,250","a\nb","c\rd",,');
    const inglese = csv(e.traccia, new TabellaMostrata(p, testiEn, ".", "primi-e-altri", "elenco", opzioniDelDisegno), "uguale", ",");
    expect(inglese.slice(1).split("\r\n").slice(1, 4)).toEqual([
      "0,Start,uninitialized,uninitialized,uninitialized,uninitialized,,",
      '1,"r ← {-1.5, 2.25}",-1.500,2.250,uninitialized,uninitialized,,',
      '2,"s ← ""a\\nb""",-1.500,2.250,"a\nb",uninitialized,,',
    ]);
  });
});

// ------------------------------------------------------------------------------------- i cicli

describe("i cicli per e per ogni, contro l'atteso scritto a mano: la regola di ogni evento e la colonna della posizione", () => {
  const delCorpus = (nome: string) => {
    const r = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-2", nome), "utf8"));
    if (!r.ok) throw new Error(`${nome} non si apre`);
    return r.progetto;
  };
  const conLeForme = (p: Progetto, forme: FormeDeiCicli) => {
    const e = eseguita(p);
    const tabella = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", forme);
    const intestazione = [testiIt.numero, testiIt.regola, ...tabella.colonne.map((c) => `${c.nome} (${c.tipo})`), testiIt.condizione, testiIt.scrive].join(";");
    return { e, tabella, righe: [intestazione, ...tabella.righe(e.traccia).map((r) => comeNellAtteso(r, ";"))] };
  };
  const per = delCorpus("per.algo");
  const perOgni = delCorpus("per-ogni-vettore.algo");

  test("il per aperto: la partenza, il controllo e l'aumento coi loro blocchi; chiuso, l'intestazione; e il CSV uguale", () => {
    for (const aperto of [true, false]) {
      const { e, tabella, righe } = conLeForme(per, { per: aperto ? "aperto" : "chiuso", perOgni: "posizione", copia: "compatta" });
      expect(differenze(righe, perAtteso(aperto))).toEqual([]);
      // Nel CSV le regole con le virgolette stanno fra virgolette: si confrontano le celle lette.
      expect(differenze(righeDelCsv(csv(e.traccia, tabella, "uguale", ";")).map((r) => celleDelCsv(r, ";").join(";")), perAtteso(aperto))).toEqual([]);
    }
  });

  test("il per ogni nelle tre forme: con la posizione la sua colonna, a parole e chiuso nessuna; e il CSV uguale", () => {
    for (const forma of ["posizione", "parole", "chiuso"] as const) {
      const { e, tabella, righe } = conLeForme(perOgni, { per: "aperto", perOgni: forma, copia: "compatta" });
      expect(differenze(righe, perOgniVettoreAtteso(forma))).toEqual([]);
      expect(csv(e.traccia, tabella, "uguale", ";")).toBe(`\u{feff}${perOgniVettoreAtteso(forma).join("\r\n")}\r\n`);
    }
  });

  test("il CSV uguale alla tabella con le colonne nell'ordine mostrato; quello per elemento resta nell'ordine del nucleo", () => {
    const { e, tabella } = conLeForme(perOgni, { per: "aperto", perOgni: "posizione", copia: "compatta" });
    // Le celle dopo la regola: v[0]…v[3] (0–3), x (4), somma (5), _indice (6), la condizione (7), lo scritto (8). Mostrate:
    // lo scritto, somma, il vettore, x, _indice, la condizione.
    const ordine = [8, 5, 0, 1, 2, 3, 4, 6, 7];
    const righe = righeDelCsv(csv(e.traccia, tabella, "uguale", ";", ordine));
    expect(righe[0]).toBe("#;Regola;Scrive;somma (intero);v[0] (intero);v[1] (intero);v[2] (intero);v[3] (intero);x (intero);_indice (intero);Condizione");
    const attese = perOgniVettoreAtteso("posizione").map((r) => {
      const c = r.split(";");
      return [c[0], c[1], ...ordine.map((i) => c[i + 2])].join(";");
    });
    expect(differenze(righe, attese)).toEqual([]);
    expect(csv(e.traccia, tabella, "per-elemento", ";", ordine)).toBe(csv(e.traccia, tabella, "per-elemento", ";"));
  });

  test("le celle cambiate dagli eventi del per ogni: l'elemento e la posizione", () => {
    const { e, tabella } = conLeForme(perOgni, { per: "aperto", perOgni: "posizione", copia: "compatta" });
    const viste: Record<number, number[]> = {};
    for (const r of tabella.righe(e.traccia)) {
      const regola = r.regola;
      if (!["_indice ← 0", "_indice < 4", "x ← v[_indice]", "_indice ← _indice + 1"].includes(regola)) continue;
      viste[r.numero] = r.valori.flatMap((c, k) => (c.cambiata ? [k] : []));
    }
    expect(viste).toEqual(cambiateDelPerOgni);
  });

  test("controllo positivo: l'atteso con lo spazio semplice al posto di quello largo è rosso, e le regole delle fasi sono diverse dall'intestazione", () => {
    // Le righe degli eventi dei due `per`: otto ciascuno (la partenza, quattro controlli, tre aumenti).
    const { righe } = conLeForme(per, { per: "chiuso", perOgni: "chiuso", copia: "compatta" });
    const conLoSpazio = perAtteso(false).map((r) => r.replaceAll(String.fromCodePoint(0x2002), " "));
    expect(differenze(righe, conLoSpazio).length).toBe(16);
    expect(differenze(perAtteso(true), perAtteso(false)).length).toBe(16);
    expect(differenze(perOgniVettoreAtteso("posizione"), perOgniVettoreAtteso("parole")).length).toBe(24);
  });
});

// La copia di un vettore col suo nome, `altri ← voti` con due elementi: le azioni del `mentre` equivalente nelle due forme.
// Compatta, ogni riga ha per regola l'assegnazione e la tabella non ha la colonna della posizione; espansa, la regola
// della fase e la colonna `_indice`, coi valori che dà l'interprete. Scritto a mano.
describe("la copia di un vettore col suo nome nelle due forme, contro l'atteso scritto a mano", () => {
  const ni = "non inizializzata";
  const copia = conDati(
    [
      { name: "voti", type: "integer", size: 2, initial: ["7", "4"] },
      { name: "altri", type: "integer", size: 2 },
    ],
    [{ id: "b1", kind: "assignment", target: "altri", value: "voti" }],
  );
  const conLaForma = (forma: "compatta" | "espansa") => {
    const e = eseguita(copia);
    const tabella = new TabellaMostrata(copia, testiIt, ",", "primi-e-altri", "elenco", { per: "aperto", perOgni: "posizione", copia: forma });
    const intestazione = [testiIt.numero, testiIt.regola, ...tabella.colonne.map((c) => `${c.nome} (${c.tipo})`), testiIt.condizione, testiIt.scrive].join(";");
    return { e, tabella, righe: [intestazione, ...tabella.righe(e.traccia).map((r) => comeNellAtteso(r, ";"))] };
  };
  const compatta = [
    "#;Regola;voti[0] (intero);voti[1] (intero);altri[0] (intero);altri[1] (intero);Condizione;Scrive",
    `0;Inizio;${ni};${ni};${ni};${ni};;`,
    `1;voti ← {7, 4};7;4;${ni};${ni};;`,
    `2;altri ← voti;7;4;${ni};${ni};;`,
    `3;altri ← voti;7;4;${ni};${ni};Vero;`,
    `4;altri ← voti;7;4;7;${ni};;`,
    `5;altri ← voti;7;4;7;${ni};;`,
    `6;altri ← voti;7;4;7;${ni};Vero;`,
    "7;altri ← voti;7;4;7;4;;",
    "8;altri ← voti;7;4;7;4;;",
    "9;altri ← voti;7;4;7;4;Falso;",
    "10;Fine;7;4;7;4;;",
  ];
  const espansa = [
    "#;Regola;voti[0] (intero);voti[1] (intero);altri[0] (intero);altri[1] (intero);_indice (intero);Condizione;Scrive",
    `0;Inizio;${ni};${ni};${ni};${ni};${ni};;`,
    `1;voti ← {7, 4};7;4;${ni};${ni};${ni};;`,
    `2;_indice ← 0;7;4;${ni};${ni};0;;`,
    `3;_indice < 2;7;4;${ni};${ni};0;Vero;`,
    `4;altri[_indice] ← voti[_indice];7;4;7;${ni};0;;`,
    `5;_indice ← _indice + 1;7;4;7;${ni};1;;`,
    `6;_indice < 2;7;4;7;${ni};1;Vero;`,
    "7;altri[_indice] ← voti[_indice];7;4;7;4;1;;",
    "8;_indice ← _indice + 1;7;4;7;4;2;;",
    "9;_indice < 2;7;4;7;4;2;Falso;",
    "10;Fine;7;4;7;4;2;;",
  ];

  test("compatta: la regola è l'assegnazione, nessuna colonna della posizione; espansa: la regola della fase e _indice; e il CSV uguale", () => {
    for (const [forma, atteso] of [
      ["compatta", compatta],
      ["espansa", espansa],
    ] as const) {
      const { e, tabella, righe } = conLaForma(forma);
      expect(differenze(righe, atteso)).toEqual([]);
      expect(csv(e.traccia, tabella, "uguale", ";")).toBe(`\u{feff}${atteso.join("\r\n")}\r\n`);
    }
  });

  test("controllo positivo: le due forme hanno righe diverse, e un valore della posizione cambiato è rosso", () => {
    expect(differenze(compatta, espansa).length).toBe(compatta.length);
    const { righe } = conLaForma("espansa");
    expect(differenze(righe, espansa.map((r) => r.replace("4;7;4;1;;", "4;7;4;2;;"))).length).toBe(1);
  });
});

// Il valore restituito da una funzione chiamata in un'espressione: nella riga della ripresa, se la tabella lo mostra, e
// nel watch sul nome della funzione nel blocco che la chiama (le chiamate dell'ultima azione di quel blocco). Scritto a
// mano sui casi `risultato-stringa` (saluto("Anna"), poi saluto("Bo")[5]) e `risultato-vettore-per-ogni` (doppi(voti)
// nella partenza del «per ogni»), e su `massimo(3, 8) + massimo(5, 2)`.
describe("il valore restituito: nella riga della ripresa e nel watch del nome della funzione", () => {
  const delCorpus = (nome: string) => {
    const r = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", `${nome}.algo`), "utf8"));
    if (!r.ok) throw new Error(`${nome} non si apre`);
    return r.progetto;
  };
  const stringa = delCorpus("risultato-stringa");
  const riprese = (t: TabellaMostrata, e: Esecuzione) => t.righe(e.traccia).filter((r) => r.ripresa).map((r) => r.regola);

  test("la riga della ripresa dice il valore, anche nel CSV; senza la scelta, come prima", () => {
    const e = eseguita(stringa);
    const con = new TabellaMostrata(stringa, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno, undefined, true);
    const senza = new TabellaMostrata(stringa, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    expect(riprese(con, e)).toEqual(['↩ s ← saluto("Anna")  (saluto → Ciao Anna)', '↩ scrivi s, " ", saluto("Bo")[5] ↵  (saluto → Ciao Bo)']);
    expect(riprese(senza, e)).toEqual(['↩ s ← saluto("Anna")', '↩ scrivi s, " ", saluto("Bo")[5] ↵']);
    expect(righeDelCsv(csv(e.traccia, con, "uguale", ";")).filter((r) => r.includes("↩")).map((r) => celleDelCsv(r, ";")[2])).toEqual(riprese(con, e));
    // Un vettore restituito: gli elementi in fila. La funzione del «per ogni» si chiama nell'azione della partenza, che il
    // «per ogni» aperto con la posizione scrive `_indice ← 0`.
    const vettore = delCorpus("risultato-vettore-per-ogni");
    const v = new TabellaMostrata(vettore, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno, undefined, true);
    expect(riprese(v, eseguita(vettore))).toEqual(["↩ _indice ← 0  (doppi → 14 · 8 · 18)"]);
  });

  test("un valore restituito con un «$» si legge com'è, non come un modello della sostituzione", () => {
    const conDollari = structuredClone(stringa) as typeof stringa;
    const b1 = conDollari.functions[0]!.body[0] as { value: string };
    b1.value = 'saluto("$$ $&")';
    const con = new TabellaMostrata(conDollari, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno, undefined, true);
    expect(riprese(con, eseguita(conDollari))[0]).toBe('↩ s ← saluto("$$ $&")  (saluto → Ciao $$ $&)');
  });

  test("il watch del nome di una funzione: i valori dell'ultima azione del blocco che l'ha chiamata", () => {
    const e = eseguita(stringa);
    const t = new TabellaMostrata(stringa, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    const testi = (b: string) => t.chiamata(e.traccia, "saluto", b)?.chiamate.map((c) => c.map((x) => `${x.nome} ${x.cella.testo}`).join(" | "));
    expect(testi("b1")).toEqual(["saluto Ciao Anna"]);
    expect(testi("b2")).toEqual(["saluto Ciao Bo"]);
    // Un blocco che non la chiama: la funzione c'è, nessun valore; un nome che non è una funzione: nessun watch.
    expect(t.chiamata(e.traccia, "saluto", "b3")).toEqual({ nome: "saluto", tipo: "stringa", vettore: false, chiamate: [] });
    expect(t.chiamata(e.traccia, "s", "b1")).toBeUndefined();
    const vettore = delCorpus("risultato-vettore-per-ogni");
    const v = new TabellaMostrata(vettore, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    const w = v.chiamata(eseguita(vettore).traccia, "doppi", "b1")!;
    expect([w.vettore, w.chiamate.map((c) => c.map((x) => `${x.nome} ${x.cella.testo}`).join(" | "))]).toEqual([true, ["[0] 14 | [1] 8 | [2] 18"]]);
  });

  test("una funzione chiamata due volte nella stessa azione: i due valori nell'ordine; controllo positivo, il secondo da solo è rosso", () => {
    const p = progetto({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "prova" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "m", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "m", value: "massimo(3, 8) + massimo(5, 2)" }], end: { id: "fine" } },
        {
          id: "f2",
          kind: "function",
          name: "massimo",
          return_type: "integer",
          data: [
            { name: "a", type: "integer", parameter: "value" },
            { name: "b", type: "integer", parameter: "value" },
            { name: "r", type: "integer" },
          ],
          body: [{ id: "b3", kind: "if", condition: "a > b", then: [{ id: "b4", kind: "assignment", target: "r", value: "a" }], else: [{ id: "b5", kind: "assignment", target: "r", value: "b" }] }],
          end: { id: "b2", return_value: "r" },
        },
      ],
    });
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    const valori = t.chiamata(eseguita(p).traccia, "massimo", "b1")!.chiamate.map((c) => c[0]!.cella.testo);
    expect(valori).toEqual(["8", "5"]);
    expect(valori).not.toEqual(["5"]);
  });
});

// ------------------------------------------------------------------------- procedure e funzioni

// Il caso `tappa-3/indice-del-riferimento`: i dati `i` (0) e `v` ({1, 2, 3}); il salto `metti(i, v[i])` a una procedura
// coi due parametri per riferimento `a` e `b`, che riceve `i` e `v[0]` (l'indice calcolato prima) e dà 2 ad `a` e 9 a
// `b`; poi la scrittura. L'atteso è scritto a mano: una riga per azione, il livello, il gruppo di `metti` vuoto quando
// non è attiva, il dato di chi chiama fra parentesi, il salto e il ritorno come righe.
describe("procedure e funzioni: una tabella sola, il livello per riga, i gruppi delle funzioni", () => {
  const delCorpus = (nome: string) => {
    const r = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", `${nome}.algo`), "utf8"));
    if (!r.ok) throw new Error(`${nome} non si apre`);
    return r.progetto;
  };
  const indice = delCorpus("indice-del-riferimento");
  const ni = "non inizializzata";
  const attese = [
    "#;Livello;Regola;i (intero);v[0] (intero);v[1] (intero);v[2] (intero);metti › a (intero);metti › b (intero);Condizione;Scrive",
    `0;0;Inizio;${ni};${ni};${ni};${ni};;;;`,
    `1;0;i ← 0;0;${ni};${ni};${ni};;;;`,
    "2;0;v ← {1, 2, 3};0;1;2;3;;;;",
    "3;0;↪ metti(rif i, rif v[i]);0;1;2;3;0 (i);1 (v[0]);;",
    "4;1;a ← 2;2;1;2;3;2 (i);1 (v[0]);;",
    "5;1;b ← 9;2;9;2;3;2 (i);9 (v[0]);;",
    "6;1;Fine;2;9;2;3;;;;",
    '7;0;scrivi v[0], " ", v[1], " ", v[2], " ", i ↵;2;9;2;3;;;;9 2 3 2 ↵',
    "8;0;Fine;2;9;2;3;;;;",
  ];
  // Le colonne cambiate di ogni riga, scritte a mano: il salto riempie il gruppo di `metti`, il ritorno lo svuota.
  const cambiate = [[], ["i"], ["v[0]", "v[1]", "v[2]"], ["a", "b"], ["i", "a"], ["v[0]", "b"], [], [], []];
  const e = eseguita(indice);
  const tabella = new TabellaMostrata(indice, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);

  test("le righe e il CSV uguali all'atteso, cella per cella", () => {
    const righe = tabella.righe(e.traccia);
    const intestazione = [testiIt.numero, testiIt.livello, testiIt.regola, ...tabella.colonne.map((c) => `${c.funzione === undefined ? c.nome : `${c.funzione} › ${c.nome}`} (${c.tipo})`), testiIt.condizione, testiIt.scrive];
    const mostrate = [intestazione.join(";"), ...righe.map((r) => [String(r.numero), String(r.livello), r.regola, ...r.valori.map((c) => c.testo), r.condizione, r.scrive].join(";"))];
    expect(differenze(mostrate, attese)).toEqual([]);
    expect(differenze(righeDelCsv(csv(e.traccia, tabella, "uguale", ";")).map((r) => celleDelCsv(r, ";").join(";")), attese)).toEqual([]);
    expect(righe.map((r) => r.valori.flatMap((c, k) => (c.cambiata ? [tabella.colonne[k]!.nome] : [])))).toEqual(cambiate);
  });

  test("controllo positivo: un livello dell'atteso cambiato è rosso; senza funzioni il CSV non ha il livello", () => {
    const righe = tabella.righe(e.traccia).map((r) => r.livello);
    const livelli = [
      ...[0, 0, 0, 0], // dalla riga 0 al salto
      ...[1, 1, 1], // dentro metti, il ritorno compreso
      ...[0, 0], // la scrittura e la fine
    ];
    expect(righe).toEqual(livelli);
    expect(righe).not.toEqual(livelli.map((l, k) => (k === 4 ? 0 : l)));
    const senza = conDati([{ name: "n", type: "integer", initial: "1" }], []);
    const t = new TabellaMostrata(senza, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    expect(righeDelCsv(csv(eseguita(senza).traccia, t, "uguale", ";"))[0]).toBe("#;Regola;n (intero);Condizione;Scrive");
  });

  // `tre-livelli`: `mostra(q)` scrive «risultato: » e ciò che `piu_uno_del_quadrato(x)` restituisce, cioè
  // `quadrato(x) + 1`, con `quadrato(y)` che restituisce `y * y`. Dopo ogni ritorno dentro un'espressione l'azione di chi
  // chiama riprende in una riga sua, col suo numero: il «+ 1» dopo il ritorno da `quadrato`, poi la fine della scrittura
  // dopo il ritorno da `piu_uno_del_quadrato`, che scrive «17 ↵» lì e non sulla fine di `quadrato`. Scritto a mano.
  test("il ritorno dentro un'espressione: l'azione di chi chiama riprende in una riga sua, al suo livello, col suo numero", () => {
    const p = delCorpus("tre-livelli");
    const x = eseguita(p);
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    const scritta = 'scrivi "risultato: ", piu_uno_del_quadrato(q) ↵';
    const atteso = [
      "#;Livello;Regola;n (intero);mostra › q (intero);piu_uno_del_quadrato › x (intero);quadrato › y (intero);Condizione;Scrive",
      `0;0;Inizio;${ni};;;;;`,
      "1;0;n ← 4;4;;;;;",
      "2;0;↪ mostra(n);4;4;;;;",
      `3;1;${scritta};4;4;4;;;risultato: `,
      "4;2;Restituisce quadrato(x) + 1;4;4;4;4;;",
      "5;3;Restituisce y * y;4;4;4;;;",
      "4;2;↩ Restituisce quadrato(x) + 1;4;4;;;;",
      `3;1;↩ ${scritta};4;4;;;;17 ↵`,
      "6;1;Fine;4;;;;;",
      "7;0;Fine;4;;;;;",
    ];
    const righe = t.righe(x.traccia);
    expect(differenze(righeDelCsv(csv(x.traccia, t, "uguale", ";")).map((r) => celleDelCsv(r, ";").join(";")), atteso)).toEqual([]);
    expect(righe.map((r) => `${r.chiave}${r.ripresa ? "r" : ""}:${r.livello}`)).toEqual(["0:0", "1:0", "2:0", "3:1", "4:2", "5:3", "6r:2", "7r:1", "8:1", "9:0"]);
    // Il dato del gruppo attivo: ogni riga dice quali funzioni sono attive dopo la sua azione.
    expect(righe.map((r) => r.attive.map((a) => (a ? "1" : "0")).join(""))).toEqual(["000", "000", "100", "110", "111", "110", "100", "100", "000", "000"]);
  });

  // Una procedura con un `per ogni` sul suo parametro vettore: le colonne della posizione nel suo gruppo, dopo i suoi dati,
  // vuote quando non è attiva. Scritto a mano.
  test("le colonne della posizione di un «per ogni» dentro una funzione chiamata, nel suo gruppo", () => {
    const p = progetto({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "prova" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "v", type: "integer", size: 2, initial: ["4", "5"] }], body: [{ id: "b1", kind: "call", callee: "conta", arguments: ["v"] }], end: { id: "fine" } },
        {
          id: "f2",
          kind: "procedure",
          name: "conta",
          data: [
            { name: "w", type: "integer", size: 2, parameter: "value" },
            { name: "x", type: "integer" },
            { name: "t", type: "integer", initial: "0" },
          ],
          body: [{ id: "b2", kind: "for_each", item: "x", source: "w", body: [{ id: "b3", kind: "assignment", target: "t", value: "t + x" }] }],
          end: { id: "b4" },
        },
      ],
    });
    const x = eseguita(p);
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    const atteso = [
      "#;Livello;Regola;v[0] (intero);v[1] (intero);conta › w[0] (intero);conta › w[1] (intero);conta › x (intero);conta › t (intero);conta › _indice (intero);Condizione;Scrive",
      `0;0;Inizio;${ni};${ni};;;;;;;`,
      "1;0;v ← {4, 5};4;5;;;;;;;",
      `2;0;↪ conta(v);4;5;4;5;${ni};${ni};${ni};;`,
      `3;1;t ← 0;4;5;4;5;${ni};0;${ni};;`,
      `4;1;_indice ← 0;4;5;4;5;${ni};0;0;;`,
      `5;1;_indice < 2;4;5;4;5;${ni};0;0;Vero;`,
      "6;1;x ← w[_indice];4;5;4;5;4;0;0;;",
      "7;1;t ← t + x;4;5;4;5;4;4;0;;",
      "8;1;_indice ← _indice + 1;4;5;4;5;4;4;1;;",
      "9;1;_indice < 2;4;5;4;5;4;4;1;Vero;",
      "10;1;x ← w[_indice];4;5;4;5;5;4;1;;",
      "11;1;t ← t + x;4;5;4;5;5;9;1;;",
      "12;1;_indice ← _indice + 1;4;5;4;5;5;9;2;;",
      "13;1;_indice < 2;4;5;4;5;5;9;2;Falso;",
      "14;1;Fine;4;5;;;;;;;",
      "15;0;Fine;4;5;;;;;;;",
    ];
    const cambiate = [[], ["v[0]", "v[1]"], ["w[0]", "w[1]"], ["t"], ["_indice"], [], ["x"], ["t"], ["_indice"], [], ["x"], ["t"], ["_indice"], [], [], []];
    const righe = t.righe(x.traccia);
    expect(differenze(righeDelCsv(csv(x.traccia, t, "uguale", ";")).map((r) => celleDelCsv(r, ";").join(";")), atteso)).toEqual([]);
    expect(righe.map((r) => r.valori.flatMap((c, k) => (c.cambiata ? [t.colonne[k]!.nome] : [])))).toEqual(cambiate);
    expect(t.gruppi).toEqual([
      { da: 0, colonne: 2 },
      { funzione: "f2", nome: "conta", da: 2, colonne: 5 },
    ]);
    // A parole, il gruppo non ha la colonna della posizione.
    const aParole = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", { ...opzioniDelDisegno, perOgni: "parole" });
    expect(aParole.colonne.map((c) => c.nome)).toEqual(["v[0]", "v[1]", "w[0]", "w[1]", "x", "t"]);
  });

  test("una funzione eseguita da sola è la radice: i suoi dati per primi, il parametro già nella riga 0, «Restituisce» nel ritorno", () => {
    const p = delCorpus("riferimento-media-voti-funzioni");
    const valido = p.functions.find((f) => f.name === "valido")!;
    const x = new Esecuzione(p, tetti, { funzione: valido.id, caso: valido.test_cases![0]! });
    x.comanda("continua");
    for (let k = 0; k < 10 && x.stato.genere !== "finita"; k++) x.fetta(() => 0, Infinity);
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno, valido.id);
    expect(t.colonne.map((c) => `${c.funzione ?? ""}/${c.nome}`)).toEqual(["/voto", "leggi_numero/numero", "stelle/quante", "stelle/k"]);
    expect(t.righe(x.traccia).map((r) => [r.numero, r.livello, r.regola, ...r.valori.map((c) => c.testo), r.scrive].join(";"))).toEqual([
      "0;0;Inizio;7;;;;",
      "1;0;Restituisce voto >= 1 and voto <= 10;7;;;;→ true ↵",
    ]);
  });
});

// ------------------------------------------------------------------------- la ricorsione

// `conta(3)`: il programma assegna a `r` il valore di `conta(3)`; `conta(n)` dà 0 se `n` è 0, altrimenti
// `conta(n - 1) + 1`. Le righe della tabella, coi valori di `r` e del gruppo di `conta` (n, s), scritte a mano: il
// gruppo mostra la chiamata più profonda, quella dell'azione. La fine di una
// chiamata mostra i valori dopo il ritorno: quelli della chiamata di sopra, che è ancora della stessa funzione.
describe("la ricorsione: il gruppo e il watch leggono la chiamata giusta, livello per livello", () => {
  const conta = (n: number): Progetto =>
    progetto({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "conta" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "r", value: `conta(${n})` }, { id: "b2", kind: "write", values: ["r"], newline: true }], end: { id: "b3" } },
        {
          id: "f2",
          kind: "function",
          name: "conta",
          return_type: "integer",
          data: [
            { name: "n", type: "integer", parameter: "value" },
            { name: "s", type: "integer" },
          ],
          body: [
            {
              id: "b4",
              kind: "if",
              condition: "n == 0",
              then: [{ id: "b5", kind: "assignment", target: "s", value: "0" }],
              else: [{ id: "b6", kind: "assignment", target: "s", value: "conta(n - 1) + 1" }],
            },
          ],
          end: { id: "b7", return_value: "s" },
        },
      ],
    });
  const u = "non inizializzata";
  // Il livello, la ripresa e i valori (r, poi n e s di `conta`) di ogni riga, dalla riga 0.
  const attese = [
    [0, false, u, "", ""],
    [0, false, u, "3", u],
    [1, false, u, "3", u],
    [1, false, u, "2", u],
    [2, false, u, "2", u],
    [2, false, u, "1", u],
    [3, false, u, "1", u],
    [3, false, u, "0", u],
    [4, false, u, "0", u],
    [4, false, u, "0", "0"],
    [4, false, u, "1", u],
    [3, true, u, "1", "1"],
    [3, false, u, "2", u],
    [2, true, u, "2", "2"],
    [2, false, u, "3", u],
    [1, true, u, "3", "3"],
    [1, false, u, "", ""],
    [0, true, "3", "", ""],
    [0, false, "3", "", ""],
    [0, false, "3", "", ""],
  ];
  const righeDi = (T: typeof TabellaMostrata, p: Progetto, e: Esecuzione) =>
    new T(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno).righe(e.traccia).map((r) => [r.livello, r.ripresa, ...r.valori.map((c) => c.testo)]);

  test("le righe col gruppo della chiamata più profonda, uguali all'atteso", () => {
    const p = conta(3);
    expect(righeDi(TabellaMostrata, p, eseguita(p))).toEqual(attese);
  });

  test("i cambi di ogni chiamata attiva, riga per riga, uguali a quelli ricalcolati da capo dalla riga prima, valore per valore", () => {
    // Il ricalcolo di riferimento non guarda se la fotografia di una chiamata è la stessa di prima: confronta ogni valore
    // con quello della stessa chiamata (lo stesso numero) nella riga prima; una chiamata appena cominciata ha cambiati i
    // valori che ci sono.
    const e = eseguita(conta(40));
    const righe = e.traccia.righe;
    const stesso = (a: traccia.Riga["dati"]["valori"][number][number], b: typeof a) =>
      a === b || (a !== undefined && b !== undefined && a.tipo === b.tipo && (a.tipo === "string" ? JSON.stringify(a.v) === JSON.stringify(b.v) : Object.is(a.v, b.v)));
    let ferme = 0;
    let cambiate = 0;
    for (let i = 1; i < righe.length; i++) {
      const prima = righe[i - 1]!.dati.chiamate ?? [];
      const attesi = (righe[i]!.dati.chiamate ?? []).map((c) => {
        const q = prima.find((x) => x.numero === c.numero);
        if (q === c) ferme++;
        else cambiate++;
        return c.valori.map((elementi, d) => elementi.map((v, k) => (q === undefined ? v !== undefined : !stesso(v, q.valori[d]![k]))));
      });
      expect({ riga: i, cambi: (righe[i]!.chiamateCambiate ?? []).map((c) => c.map((x) => [...x])) }).toEqual({ riga: i, cambi: attesi });
    }
    // Le premesse: molte chiamate rimaste uguali da una riga all'altra, e una cambiata o appena cominciata quasi a ogni riga.
    console.log(`cambi delle chiamate: righe ${righe.length}, chiamate ferme ${ferme}, cambiate o appena cominciate ${cambiate}`);
    expect({ ferme: ferme > 1000, cambiate: cambiate > 40 }).toEqual({ ferme: true, cambiate: true });
  });

  test("il watch: la chiamata più profonda, o quella del livello scelto, col livello e quanti sono", () => {
    const p = conta(3);
    const e = new Esecuzione(p, tetti);
    e.puntiDiInterruzione = new Set(["b5"]);
    e.comanda("continua");
    e.fetta(() => 0, Infinity);
    // Premessa: in pausa sul caso che smette, al livello 4.
    expect(e.stato).toMatchObject({ genere: "pausa", blocco: "b5", profondita: 4 });
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    const di = (livello?: number) => {
      const w = t.watch(e.traccia, "n", "f2", livello);
      return [w?.elementi[0]?.cella.testo, w?.livello];
    };
    expect(di()).toEqual(["0", { di: 4, su: 4 }]);
    expect(di(2)).toEqual(["2", { di: 2, su: 4 }]);
    expect(di(1)).toEqual(["3", { di: 1, su: 4 }]);
    // Un livello che non è della funzione, o che non c'è: la più profonda.
    expect(di(0)).toEqual(["0", { di: 4, su: 4 }]);
    expect(di(9)).toEqual(["0", { di: 4, su: 4 }]);
    // Un dato della radice non dice livelli.
    expect(t.watch(e.traccia, "r")).toEqual({ nome: "r", tipo: "intero", vettore: false, elementi: [{ nome: "r", cella: { testo: u, nonInizializzata: true, cambiata: false } }] });
  });

  test("eseguita da sola, la funzione che chiama sé stessa: il suo gruppo e il watch leggono la chiamata giusta, livello per livello", () => {
    // `conta` eseguita da sola con n = 3, in pausa sul caso che smette: la radice è la chiamata al livello 0, e le sue
    // chiamate ai livelli 1, 2 e 3. Il gruppo mostra la più profonda; la riga dell'assegnazione che chiama mostra già la
    // chiamata cominciata, come dal programma principale.
    const p = conta(3);
    const e = new Esecuzione(p, tetti, { funzione: "f2", caso: { name: "tre", inputs: [{ data: "n", text: "3" }], expected: { output: "" } } });
    e.puntiDiInterruzione = new Set(["b5"]);
    e.comanda("continua");
    e.fetta(() => 0, Infinity);
    expect(e.stato).toMatchObject({ genere: "pausa", blocco: "b5", profondita: 3 });
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno, "f2");
    expect(t.conChiamate).toBe(true);
    expect(t.righe(e.traccia).map((r) => [r.livello, ...r.valori.map((c) => c.testo)])).toEqual([
      [0, "3", u],
      [0, "3", u],
      [0, "2", u],
      [1, "2", u],
      [1, "1", u],
      [2, "1", u],
      [2, "0", u],
      [3, "0", u],
    ]);
    const di = (livello?: number) => {
      const w = t.watch(e.traccia, "n", "f2", livello);
      return [w?.elementi[0]?.cella.testo, w?.livello];
    };
    expect(di()).toEqual(["0", { di: 3, su: 3 }]);
    expect(di(2)).toEqual(["1", { di: 2, su: 3 }]);
    expect(di(0)).toEqual(["3", { di: 0, su: 3 }]);
    expect(di(9)).toEqual(["0", { di: 3, su: 3 }]);
  });

  test("il dato dietro un riferimento lungo la ricorsione: lo dice il nucleo, a ogni livello", () => {
    // `scendi(n, rif t)` passa `t` a sé stessa: a ogni livello è `c` del programma principale.
    const p = progetto({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "scendi" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "c", type: "integer", initial: "0" }], body: [{ id: "b1", kind: "call", callee: "scendi", arguments: ["2", "c"] }], end: { id: "b2" } },
        {
          id: "f2",
          kind: "procedure",
          name: "scendi",
          data: [
            { name: "n", type: "integer", parameter: "value" },
            { name: "t", type: "integer", parameter: "reference" },
          ],
          body: [
            { id: "b3", kind: "if", condition: "n > 0", then: [{ id: "b4", kind: "call", callee: "scendi", arguments: ["n - 1", "t"] }], else: [] },
            { id: "b5", kind: "assignment", target: "t", value: "t + 1" },
          ],
          end: { id: "b6" },
        },
      ],
    });
    const e = new Esecuzione(p, tetti);
    e.puntiDiInterruzione = new Set(["b5"]);
    e.comanda("continua");
    e.fetta(() => 0, Infinity);
    expect(e.stato).toMatchObject({ genere: "pausa", blocco: "b5", profondita: 3 });
    const t = new TabellaMostrata(p, testiIt, ",", "per-elemento", "elenco", opzioniDelDisegno);
    for (const livello of [3, 2, 1]) expect({ livello, origine: t.watch(e.traccia, "t", "f2", livello)?.origine }).toEqual({ livello, origine: { nome: "c", livello: 0 } });
  });

  // La mutazione che discrimina: il gruppo e il watch sulla chiamata più esterna (com'era prima della ricorsione
  // nell'interfaccia). Controllo positivo: la copia senza mutazioni dà l'atteso.
  const sorgente = readFileSync(join(import.meta.dir, "traccia.ts"), "utf8");
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  for (const [nome, vecchio, nuovo] of [
    ["nessuna (controllo positivo)", "", ""],
    ["il gruppo mostra la chiamata più esterna", "return f.chiamate?.findLastIndex(", "return f.chiamate?.findIndex("],
  ] as const)
    test(`mutazione della tabella: ${nome}`, async () => {
      if (vecchio !== "") expect(sorgente.split(vecchio).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "traccia-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, sorgente.replace(vecchio, nuovo).replaceAll('from "../', `from "${nucleo}/`));
        const mutante: typeof traccia = await import(file);
        const p = conta(3);
        const righe = righeDi(mutante.TabellaMostrata, p, eseguita(p));
        const diverse = righe.flatMap((r, k) => (JSON.stringify(r) === JSON.stringify(attese[k]) ? [] : [k]));
        console.log(`mutazione della tabella «${nome}»: righe diverse dall'atteso ${diverse.length} su ${attese.length}`);
        if (vecchio === "") expect(diverse).toEqual([]);
        else expect(diverse.length).toBeGreaterThan(0);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});

// Il record: una colonna per campo in ogni forma, la copia col nome una riga per campo, il riferimento a un campo, il
// watch dei campi. L'atteso della copia è scritto a mano (`atteso-del-record.ts`); gli altri qui accanto, scritti prima.
describe("il record nella tabella di traccia", () => {
  const delCorpus = (nome: string): Progetto => {
    const r = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", `${nome}.algo`), "utf8"));
    if (!r.ok) throw new Error(nome);
    return r.progetto;
  };
  /** Esegue fino alla fine dando le righe alle letture. */
  const conLeRighe = (p: Progetto, righe: readonly string[]): Esecuzione => {
    const e = new Esecuzione(p, tetti);
    e.comanda("continua");
    let k = 0;
    for (let giri = 0; giri < 100 && e.stato.genere !== "finita"; giri++) {
      if (e.stato.genere === "chiede") e.inserisci(righe[k++]!);
      e.fetta(() => 0, Infinity);
    }
    if (e.stato.genere !== "finita") throw new Error(JSON.stringify(e.stato));
    return e;
  };
  const copia = delCorpus("copia-di-un-record");

  for (const forma of forme)
    test(`la copia di un record: il CSV byte per byte e le celle cambiate, nella forma ${forma}`, () => {
      const e = eseguita(copia);
      const tabella = new TabellaMostrata(copia, testiIt, ",", forma, "elenco", opzioniDelDisegno);
      expect(differenze(righeDelCsv(csv(e.traccia, tabella, "uguale", ";")), copiaDelRecordItaliano)).toEqual([]);
      expect(tabella.righe(e.traccia).map((r) => r.valori.map((c) => (c.cambiata ? "x" : ".")).join(""))).toEqual(cambiateDellaCopia);
      // I sei campi in due gruppi, uno per record: si spostano insieme.
      expect(tabella.colonne.map((c) => c.gruppo).join(" ")).toBe("a a a b b b");
    });

  test("il watch di un record: un elemento per campo col nome del campo, il tipo è il nome del record", () => {
    const e = eseguita(copia);
    const t = new TabellaMostrata(copia, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    const w = t.watch(e.traccia, "b")!;
    expect({ tipo: w.tipo, vettore: w.vettore, elementi: w.elementi.map((x) => `${x.nome}=${x.cella.testo}`) }).toEqual({ tipo: "alunno", vettore: false, elementi: ["b.nome=Anna", "b.classe=3A", "b.voto=9"] });
  });

  test("il riferimento a un record e a un suo campo: il dato di chi chiama col campo accanto al valore", () => {
    const p = delCorpus("record-per-riferimento");
    const t = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    const righe = t.righe(conLeRighe(p, ["Dario"]).traccia);
    const cella = (regola: string, colonna: string) => righe.find((r) => r.regola === regola)!.valori[t.colonne.findIndex((c) => `${c.funzione ? `${c.funzione} › ` : ""}${c.nome}` === colonna)]!.testo;
    // `promuovi(a)`: dopo `r.voto ← r.voto + 1` il campo di `r` è quello di `a`; `raddoppia(a.voto)`: il parametro è il campo.
    expect([cella("r.voto ← r.voto + 1", "promuovi › r.voto"), cella("n ← n * 2", "raddoppia › n"), cella("r.voto ← 6", "crea › r.voto")]).toEqual(["8 (a.voto)", "16 (a.voto)", "6 (c.voto)"]);
  });

  test("il watch del nome di una funzione che restituisce un record: i campi del valore restituito", () => {
    const p = delCorpus("funzione-con-un-record");
    const e = eseguita(p);
    const t = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    const w = t.chiamata(e.traccia, "migliore", "b2")!;
    expect({ tipo: w.tipo, vettore: w.vettore, chiamate: w.chiamate.map((c) => c.map((x) => `${x.nome}=${x.cella.testo}`)) }).toEqual({ tipo: "alunno", vettore: false, chiamate: [[".nome=Bruno", ".classe=3B", ".voto=9"]] });
  });

  // Le mutazioni che discriminano: il record in una colonna come un dato semplice, la regola della copia uguale per ogni
  // campo. Controllo positivo: la copia senza mutazioni dà l'atteso.
  const sorgente = readFileSync(join(import.meta.dir, "traccia.ts"), "utf8");
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  for (const [nome, vecchio, nuovo] of [
    ["nessuna (controllo positivo)", "", ""],
    ["il record senza le colonne dei campi", "      if (d.campi !== undefined) return d.campi.map((c) => colonna(`${d.nome}.${c.nome}`, c.tipo));\n", ""],
    ["la regola della copia senza il campo", "      if (r.campo !== undefined && b.kind === \"assignment\") {", "      if (false) {"],
  ] as const)
    test(`mutazione della tabella del record: ${nome}`, async () => {
      if (vecchio !== "") expect(sorgente.split(vecchio).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "traccia-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, sorgente.replace(vecchio, nuovo).replaceAll('from "../', `from "${nucleo}/`));
        const mutante: typeof traccia = await import(file);
        const e = eseguita(copia);
        let righe: string[];
        try {
          righe = righeDelCsv(mutante.csv(e.traccia, new mutante.TabellaMostrata(copia, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno), "uguale", ";"));
        } catch (x) {
          righe = [`eccezione: ${x}`];
        }
        const diverse = differenze(righe, copiaDelRecordItaliano);
        console.log(`mutazione della tabella del record «${nome}»: righe diverse ${diverse.length}`);
        if (vecchio === "") expect(diverse).toEqual([]);
        else expect(diverse.length).toBeGreaterThan(0);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});

// La matrice: le tre forme (una colonna per riga, la predefinita; un elemento per colonna; in fila), il CSV nei due modi,
// le due posizioni della copia col nome e le regole del ciclo delle colonne, il tetto delle righe e degli elementi, il
// riferimento, il valore restituito, il watch. Gli attesi delle forme sono scritti a mano (`atteso-della-matrice.ts`);
// quelli del riferimento e del valore restituito qui accanto, seguendo `tipi/matrice-come-parametro`.
describe("la matrice nella tabella di traccia", () => {
  const copia = progetto(progettoDellaCopia);
  const undici = progetto(progettoDelleUndiciRighe);
  const espansa: FormeDeiCicli = { ...opzioniDelDisegno, copia: "espansa" };
  const tabellaDi = (p: Progetto, forma: FormaDeiVettori, matrici: FormaDelleMatrici, cicli: FormeDeiCicli = opzioniDelDisegno) =>
    new TabellaMostrata(p, testiIt, ",", forma, "elenco", cicli, undefined, false, matrici);
  const attesi = { copiaPerRiga, copiaPerElemento, copiaInFila, undiciPerRiga, undiciPerElemento, undiciInFila, undiciCsvPerElemento };

  test("gli attesi scritti a mano: ogni riga ha tante celle quante l'intestazione, e i numeri delle righe in fila", () => {
    for (const [nome, righe] of Object.entries(attesi)) {
      const celle = righe.map((r) => celleDelCsv(r, ";").length);
      expect({ nome, diverse: celle.flatMap((n, k) => (n === celle[0] ? [] : [k])) }).toEqual({ nome, diverse: [] });
      expect({ nome, numeri: righe.slice(1).map((r) => r.split(";")[0]) }).toEqual({ nome, numeri: righe.slice(1).map((_, k) => String(k)) });
    }
  });

  for (const [forma, matrici, cicli, atteso] of [
    ["primi-e-altri", "per-riga", espansa, copiaPerRiga],
    ["primi-e-altri", "per-elemento", espansa, copiaPerElemento],
    ["primi-e-altri", "in-fila", opzioniDelDisegno, copiaInFila],
  ] as const)
    test(`la copia di una matrice, ${matrici}: il CSV «uguale» byte per byte, e la tabella mostrata cella per cella`, () => {
      const e = eseguita(copia);
      const tabella = tabellaDi(copia, forma, matrici, cicli);
      expect(differenze(righeDelCsv(csv(e.traccia, tabella, "uguale", ";")), atteso)).toEqual([]);
      expect(csv(e.traccia, tabella, "uguale", ";")).toBe(`\u{feff}${atteso.join("\r\n")}\r\n`);
      expect(differenze(tabella.righe(e.traccia).map((r) => comeNellAtteso(r, ";")), atteso.slice(1))).toEqual([]);
    });

  test("una colonna per riga: la cella di una riga cambia se cambia uno qualunque dei suoi elementi", () => {
    const e = eseguita(copia);
    const tabella = tabellaDi(copia, "primi-e-altri", "per-riga", espansa);
    expect(tabella.righe(e.traccia).map((r) => r.valori.map((c) => (c.cambiata ? "x" : ".")).join(""))).toEqual(cambiateDellaCopiaPerRiga);
  });

  test("in fila: i pezzi della cella segnano l'elemento cambiato, le righe separate da ‖", () => {
    const e = eseguita(copia);
    const riga = tabellaDi(copia, "primi-e-altri", "in-fila").righe(e.traccia)[24]!;
    expect(riga.valori[1]!.pezzi!.map((p) => (p.cambiato ? `[${p.testo}]` : p.testo))).toEqual(pezziDellaRiga24);
  });

  test("il CSV «per elemento» ha una colonna per elemento da ogni forma della matrice e dei vettori", () => {
    const e = eseguita(copia);
    const u = eseguita(undici);
    for (const forma of forme)
      for (const matrici of ["per-riga", "per-elemento", "in-fila"] as const) {
        expect(differenze(righeDelCsv(csv(e.traccia, tabellaDi(copia, forma, matrici, espansa), "per-elemento", ";")), copiaPerElemento), `${forma} ${matrici}`).toEqual([]);
        expect(differenze(righeDelCsv(csv(u.traccia, tabellaDi(undici, forma, matrici), "per-elemento", ";")), undiciCsvPerElemento), `${forma} ${matrici}`).toEqual([]);
      }
  });

  test("oltre il tetto: le prime dieci righe e la colonna delle altre; i primi dieci elementi e la colonna degli altri", () => {
    const e = eseguita(undici);
    for (const [matrici, atteso] of [
      ["per-riga", undiciPerRiga],
      ["per-elemento", undiciPerElemento],
      ["in-fila", undiciInFila],
    ] as const)
      expect(differenze(righeDelCsv(csv(e.traccia, tabellaDi(undici, "primi-e-altri", matrici), "uguale", ";")), atteso), matrici).toEqual([]);
  });

  test("un elemento per colonna segue i vettori solo per il tetto: tutte le colonne con «una colonna per elemento», altrimenti i primi dieci", () => {
    const e = eseguita(undici);
    expect(differenze(righeDelCsv(csv(e.traccia, tabellaDi(undici, "in-fila", "per-elemento"), "uguale", ";")), undiciPerElemento)).toEqual([]);
    expect(differenze(righeDelCsv(csv(e.traccia, tabellaDi(undici, "per-elemento", "per-elemento"), "uguale", ";")), undiciCsvPerElemento)).toEqual([]);
  });

  test("la riga sopra la tabella: che cosa si vede della matrice nella sua forma", () => {
    const spiega = (p: Progetto, forma: FormaDeiVettori, matrici: FormaDelleMatrici) => tabellaDi(p, forma, matrici).spiegazione("uguale");
    expect([
      spiega(copia, "primi-e-altri", "per-riga"),
      spiega(undici, "primi-e-altri", "per-riga"),
      spiega(copia, "primi-e-altri", "in-fila"),
      spiega(copia, "primi-e-altri", "per-elemento"),
      spiega(undici, "primi-e-altri", "per-elemento"),
      spiega(undici, "per-elemento", "per-elemento"),
    ]).toEqual([
      "a: 2 × 2 per riga. b: 2 × 2 per riga. CSV uguale.",
      "m: 11 × 2, le prime 10, le altre in m[10]. CSV uguale.",
      "a: 2 × 2 in fila. b: 2 × 2 in fila. CSV uguale.",
      undefined,
      "m: 22, i primi 10, gli altri in m[5][0]…m[10][1]. CSV uguale.",
      undefined,
    ]);
  });

  test("il nome della colonna degli altri: nella stessa riga, fra righe diverse, uno solo", () => {
    const di = (righe: number, colonne: number) =>
      tabellaDi(conDati([{ name: "m", type: "integer", size: righe, columns: colonne }], []), "primi-e-altri", "per-elemento").colonne.at(-1)!.nome;
    expect([di(3, 4), di(6, 2), di(7, 2), di(11, 1), di(1, 11)]).toEqual(["m[2][2…3]", "m[5][0…1]", "m[5][0]…m[6][1]", "m[10][0]", "m[0][10]"]);
  });

  test("il watch di una matrice: un elemento per valore col nome dei due indici, e le colonne", () => {
    const e = eseguita(copia);
    for (const matrici of ["per-riga", "per-elemento", "in-fila"] as const) {
      const w = tabellaDi(copia, "primi-e-altri", matrici).watch(e.traccia, "b")!;
      expect({ colonne: w.colonne, vettore: w.vettore, elementi: w.elementi.map((x) => `${x.nome}=${x.cella.testo}`) }).toEqual({
        colonne: 2,
        vettore: true,
        elementi: ["b[0][0]=1", "b[0][1]=2", "b[1][0]=7", "b[1][1]=4"],
      });
    }
  });

  test("la copia di una riga col nome: la posizione nella tabella, e la regola con la misura della riga", () => {
    const p = conDati(
      [
        { name: "a", type: "integer", size: 2, columns: 3, initial: [["1", "2", "3"], ["4", "5", "6"]] },
        { name: "v", type: "integer", size: 3 },
      ],
      [{ id: "b1", kind: "assignment", target: "v", value: "a[1]" }],
    );
    const t = tabellaDi(p, "primi-e-altri", "per-riga", espansa);
    const righe = t.righe(eseguita(p).traccia);
    expect(t.colonne.map((c) => c.nome)).toEqual(["a[0]", "a[1]", "v[0]", "v[1]", "v[2]", "_indice"]);
    expect(righe.slice(2, 5).map((r) => r.regola)).toEqual(["_indice ← 0", "_indice < 3", "v[_indice] ← a[1][_indice]"]);
  });

  // Il riferimento e il valore restituito, su `tipi/matrice-come-parametro`: `metti(m[0][2])` riceve un elemento,
  // `azzera_riga(m[1])` una riga, `raddoppia(n)` la matrice intera (`n` 2 × 2 col 3 ripetuto, il primo elemento
  // raddoppiato a 6); `trasposta(m)` restituisce la matrice 3 × 2 di `m` dopo `metti` e `azzera_riga` ({{1, 2, 77}, {0, 0, 0}}).
  test("il riferimento a una matrice, a una riga e a un elemento; il valore restituito con le righe separate", () => {
    const r = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", "matrice-come-parametro.algo"), "utf8"));
    if (!r.ok) throw new Error("matrice-come-parametro");
    const p = r.progetto;
    const e = eseguita(p);
    const cella = (t: TabellaMostrata, regola: string, colonna: string) => {
      const riga = t.righe(e.traccia).find((x) => x.regola === regola)!;
      return riga.valori[t.colonne.findIndex((c) => `${c.funzione ? `${c.funzione} › ` : ""}${c.nome}` === colonna)]!.testo;
    };
    const perRiga = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno, undefined, true, "per-riga");
    const perElemento = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno, undefined, true, "per-elemento");
    const inFila = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno, undefined, true, "in-fila");
    expect([
      cella(perRiga, "e ← 77", "metti › e"),
      cella(perRiga, "v[0] ← 0", "azzera_riga › v[0]"),
      cella(perRiga, "w[i][j] ← w[i][j] * 2", "raddoppia › w[0]"),
      cella(perElemento, "w[i][j] ← w[i][j] * 2", "raddoppia › w[0][0]"),
      cella(inFila, "w[i][j] ← w[i][j] * 2", "raddoppia › w"),
    ]).toEqual(["77 (m[0][2])", "0 (m[1][0])", "6 · 3 (n[0])", "6 (n[0][0])", "6 · 3 ‖ 3 · 3 (n)"]);
    const ripresa = perRiga.righe(e.traccia).find((x) => x.ripresa && x.regola.includes("trasposta(m)"))!;
    expect(ripresa.regola.endsWith("(trasposta → 1 · 0 ‖ 2 · 0 ‖ 77 · 0)")).toBe(true);
    const w = perRiga.chiamata(e.traccia, "trasposta", "b5")!;
    expect({ colonne: w.colonne, nomi: w.chiamate[0]!.map((x) => `${x.nome}=${x.cella.testo}`) }).toEqual({ colonne: 2, nomi: ["[0][0]=1", "[0][1]=0", "[1][0]=2", "[1][1]=0", "[2][0]=77", "[2][1]=0"] });
  });

  // Le mutazioni che discriminano: una forma cambiata apposta (la riga in fila come le altre, le righe fra « · »), una
  // colonna della posizione tolta (il massimo dei soli livelli, come prima), la regola del ciclo delle colonne persa.
  // Controllo positivo: senza mutazioni, gli attesi.
  const sorgente = readFileSync(join(import.meta.dir, "traccia.ts"), "utf8");
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  for (const [nome, vecchio, nuovo, matrici, cicli, atteso] of [
    ["nessuna (controllo positivo), per riga", "", "", "per-riga", espansa, copiaPerRiga],
    ["nessuna (controllo positivo), in fila", "", "", "in-fila", opzioniDelDisegno, copiaInFila],
    ["la forma per riga mostrata in fila", 'if (this.formaDelleMatrici === "in-fila") return [di(', 'if (this.formaDelleMatrici !== "per-elemento") return [di(', "per-riga", espansa, copiaPerRiga],
    ["le righe in fila separate come gli elementi", 'const fraLeRighe = " ‖ ";', 'const fraLeRighe = " · ";', "in-fila", opzioniDelDisegno, copiaInFila],
    [
      "una colonna della posizione tolta",
      "const posizioniDi = (f: Funzione) => quantePosizioni(f.body, nomiDeiVettori(datiDi(f)), nomiDelleMatrici(datiDi(f)), mostrata);",
      "const posizioniDi = (f: Funzione) => Math.max(0, ...[...livelli.get(f.id)!].flatMap(([id, l]) => (mostrata(blocchi.get(id)!.blocco) ? [l] : [])));",
      "per-riga",
      espansa,
      copiaPerRiga,
    ],
    ["la regola del ciclo delle colonne persa", "datiDi(f), r.interno === true)", "datiDi(f), false)", "per-riga", espansa, copiaPerRiga],
  ] as const)
    test(`mutazione della tabella della matrice: ${nome}`, async () => {
      if (vecchio !== "") expect(sorgente.split(vecchio).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "traccia-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, sorgente.replace(vecchio, nuovo).replaceAll('from "../', `from "${nucleo}/`));
        const mutante: typeof traccia = await import(file);
        const e = eseguita(copia);
        let righe: string[];
        try {
          righe = righeDelCsv(mutante.csv(e.traccia, new mutante.TabellaMostrata(copia, testiIt, ",", "primi-e-altri", "elenco", cicli, undefined, false, matrici), "uguale", ";"));
        } catch (x) {
          righe = [`eccezione: ${x}`];
        }
        const diverse = differenze(righe, atteso);
        console.log(`mutazione della tabella della matrice «${nome}»: righe diverse ${diverse.length}`);
        if (vecchio === "") expect(diverse).toEqual([]);
        else expect(diverse.length).toBeGreaterThan(0);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});
