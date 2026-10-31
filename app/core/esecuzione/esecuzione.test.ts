// L'esecuzione passo passo nel nucleo: il programma di riferimento contro l'atteso scritto a mano
// (sequenza, tabella di traccia, CSV nelle due lingue, celle cambiate, il watch dalla riga corrente), i punti di
// interruzione, il corpus eseguito un comando alla volta con gli input scritti come alla console, le ultime righe
// della tabella su un ciclo che non finisce, l'avanzare a fette con un orologio finto (almeno un passo per fetta),
// l'eccezione del motore che chiude l'esecuzione con l'errore della memoria, la console a righe (le ultime righe,
// quante ne sono state tolte; una riga più lunga dei caratteri scelti a capo da sola o tenuta dalla fine, coi
// caratteri contati in codici), i limiti delle impostazioni che arrivano a ogni chiamante e il modo caso (le voci del
// caso date alle letture, l'esito alla fine, la riga di comando e l'esecuzione passo passo uguali sul corpus).
//
// CHE COSA NON GUARDA:
// - che l'interfaccia mostri ciò che il nucleo dà (blocco corrente, riga corrente, tabella, console): è delle
//   prove della finestra (`ui/esecuzione/`, sotto happy-dom) e di quelle nei motori;
// - il passo dentro e il passo fuori su sequenze sintetiche: `controllore.test.ts` (qui sull'interprete vero, con le
//   chiamate su tre livelli del corpus);
// - nella prova del corpus senza caso, i casi il cui esito appartiene al modo caso (`input_mismatch`,
//   `unused_inputs`): alla console gli input non hanno destinatario e le voci avanzate non esistono; si saltano
//   contandoli (oggi il corpus non ne ha); il modo caso li prova sul corpus intero e coi progetti sintetici;
// - l'output scritto quando la console ha tolto righe: senza caso nessuno lo tiene (lo si confronta, dove serve,
//   nel modo caso), e le prove leggono le righe della console;
// - le regole del confronto fra atteso e ottenuto, una per una: `casi/esecutore.test.ts`;
// - il tempo vero di una fetta: l'orologio è finto, e la durata scelta dall'interfaccia è delle prove nei
//   motori;
// - un RangeError vero del motore: la prova lo fa sollevare alla tabella (un testo lungo 2^29 caratteri in V8, 2^31
//   in Bun, non si raggiunge in una prova); quale eccezione solleva ciascun motore è misurato a parte;
// - le forme della tabella con un vettore oltre il tetto delle colonne: `traccia.test.ts`;
// - i limiti alzati oltre il predefinito: le Impostazioni non lo permettono per i vettori (il confine si prova
//   abbassandolo), e il controllo che li accetta come parametro lo prova `controllo.test.ts`.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eseguiCaso } from "../casi/esecutore";
import { controlla, tetti, type Tetti } from "../controllo/controllo";
import { genera } from "../genera/forma";
import { opzioniPredefinite as opzioniDelDisegno } from "../disegno/impaginazione";
import { esegui, tettoDeiPassi } from "../interprete/interprete";
import { apri, leggi } from "../progetto/formato";
import type { Progetto } from "../progetto/modello";
import { csvItalianoAtteso, csvIngleseAtteso, pausaSulValoreIniziale, sequenzaAttesa } from "./atteso-del-riferimento";
import { azioniSenzaIValoriIniziali } from "./azioni-del-corpus";
import { Esecuzione, righeLunghePredefinite, type Comando, type Stato } from "./esecuzione";
import { testiEn, testiIt } from "./testi-di-prova";
import { csv as csvDellaTabella, separatoriPredefiniti, TabellaMostrata, type Separatori, type TestiDellaTraccia } from "./traccia";

const cartella = join(import.meta.dir, "..", "..", "casi");
const apriFile = (nome: string): Progetto => {
  const a = apri(readFileSync(join(cartella, `${nome}.algo`), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
const riferimento = apriFile("tappa-1/riferimento-media-voti");
const inputDelRiferimento = riferimento.test_cases![0]!.inputs.map((i) => i.text);

/** Il CSV della tabella con una colonna per elemento (qui nessun vettore supera il tetto delle colonne). */
const csv = (t: Esecuzione["traccia"], p: Progetto, testi: TestiDellaTraccia, sep: Separatori): string =>
  csvDellaTabella(t, new TabellaMostrata(p, testi, sep.decimali, "per-elemento", "elenco", opzioniDelDisegno), "uguale", sep.campo);

/** Una pausa come la scrive la sequenza attesa: il blocco, o il valore iniziale del dato. */
const nomeDellaPausa = (s: Extract<Stato, { genere: "pausa" }>): string => (s.dato !== undefined ? pausaSulValoreIniziale(s.dato) : s.blocco);

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
    } else
      while (k < riga.length && riga[k] !== sep) cella += riga[k++];
    celle.push(cella);
    if (k >= riga.length) return celle;
    k++;
  }
}

/** Ciò che il programma ha scritto, dalle righe della console (vale finché la console non ne ha tolte né tagliate). */
function scritto(e: Esecuzione): string {
  if (e.consoleTolte > 0 || e.console.some((r) => r.genere === "scrive" && r.tagliata)) throw new Error("la console ha tolto o tagliato righe: l'output non è più tutto lì");
  return e.console.map((r) => (r.genere === "scrive" ? r.testo + (r.aCapo ? "\n" : "") : "")).join("");
}

/** Le posizioni in cui due elenchi differiscono, la lunghezza compresa. */
const differenze = (a: readonly string[], b: readonly string[]): string[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, k) => k).flatMap((k) => (a[k] === b[k] ? [] : [`${k}: ${a[k]} | ${b[k]}`]));

const nessunaAttesa = () => 0;

/**
 * Esegue fino alla fine dando lo stesso comando a ogni pausa e gli input in ordine a ogni richiesta; a
 * ogni pausa chiama `aOgniPausa`. Restituisce i blocchi delle pause.
 */
function finoAllaFine(e: Esecuzione, comando: Comando, input: readonly string[], aOgniPausa: (e: Esecuzione) => void = () => {}): string[] {
  const pause: string[] = [];
  let k = 0;
  for (let giri = 0; giri < 3 * tettoDeiPassi; giri++) {
    const s = e.stato;
    if (s.genere === "finita" || s.genere === "non parte") return pause;
    if (s.genere === "chiede") {
      if (k >= input.length) return pause;
      e.inserisci(input[k++]!);
    } else if (s.genere === "pronta" || s.genere === "pausa") {
      if (s.genere === "pausa") {
        pause.push(nomeDellaPausa(s));
        aOgniPausa(e);
      }
      e.comanda(comando);
    }
    e.fetta(nessunaAttesa, Infinity);
  }
  throw new Error("l'esecuzione non finisce");
}

// --------------------------------------------------------------------------- il riferimento

describe("il programma di riferimento contro l'atteso scritto a mano", () => {
  test("un passo alla volta: le pause sono la sequenza attesa, e gli eventi del nucleo", () => {
    const e = new Esecuzione(riferimento, tetti);
    const pause = finoAllaFine(e, "sopra", inputDelRiferimento);
    expect(differenze(pause, sequenzaAttesa)).toEqual([]);
    expect(e.stato).toEqual({ genere: "finita" });
    expect(scritto(e)).toBe(riferimento.test_cases![0]!.expected.output);
    // Gli eventi dell'interprete, presi direttamente dal generatore.
    const g = esegui(riferimento, tetti);
    const eventi: string[] = [];
    let k = 0;
    for (let r = g.next(); !r.done; ) {
      const x = r.value;
      if ("evento" in x) eventi.push(x.dato !== undefined ? pausaSulValoreIniziale(x.dato) : x.evento);
      r = g.next("chiedi" in x ? inputDelRiferimento[k++] : undefined);
    }
    expect(differenze(pause, eventi)).toEqual([]);
  });

  test("controllo positivo: un blocco dell'atteso cambiato fa rosso il confronto", () => {
    const alterato = [...sequenzaAttesa];
    alterato[45] = "b21";
    const e = new Esecuzione(riferimento, tetti);
    expect(differenze(finoAllaFine(e, "sopra", inputDelRiferimento), alterato)).toEqual(["45: b20 | b21"]);
  });

  test("il primo passo si ferma prima del primo valore iniziale: una pausa per dato, col nome del dato e l'id vuoto del suo blocco", () => {
    const e = new Esecuzione(riferimento, tetti);
    expect(e.stato).toEqual({ genere: "pronta" });
    // La tabella prima del primo passo non ha righe; alla prima pausa ha la riga 0 «Inizio».
    expect(e.traccia.righe.length).toBe(0);
    const viste: unknown[] = [];
    for (let k = 0; k < 6; k++) {
      e.comanda("sopra");
      e.fetta(nessunaAttesa, Infinity);
      viste.push({ stato: e.stato, passi: e.passi, righe: e.traccia.righe.length });
    }
    expect(viste).toEqual([
      ...["contati", "insufficienti", "somma", "i", "j"].map((dato, k) => ({ stato: { genere: "pausa", blocco: "", dato, profondita: 0 }, passi: k + 1, righe: k })),
      { stato: { genere: "pausa", blocco: "b3", profondita: 0 }, passi: 6, righe: 5 },
    ]);
    expect(e.traccia.valoriIniziali?.valori.every((elementi) => elementi.every((v) => v === undefined))).toBe(true);
  });

  test("«continua» non si ferma sui valori iniziali, nemmeno con un punto sull'id vuoto del loro blocco", () => {
    const e = new Esecuzione(riferimento, tetti);
    e.puntiDiInterruzione = new Set(["", "b16"]);
    expect(finoAllaFine(e, "continua", inputDelRiferimento)).toEqual(["b16"]);
    expect(e.passi).toBe(65);
  });

  test("un punto sulla copia di un vettore col suo nome ferma «continua» a ogni controllo, come su un ciclo, con la posizione", () => {
    // `copia-di-un-vettore`: b1 `altri ← voti`, tre elementi; quattro controlli, l'ultimo falso. A mano: le fasi delle
    // pause e la posizione che la fotografia ha in ciascuna.
    const e = new Esecuzione(apriFile("tappa-3/copia-di-un-vettore"), tetti);
    e.puntiDiInterruzione = new Set(["b1"]);
    const viste: string[] = [];
    finoAllaFine(e, "continua", [], (x) => {
      const s = x.stato as Extract<Stato, { genere: "pausa" }>;
      viste.push(`${s.blocco}:${s.fase ?? ""}:${x.traccia.righe.at(-1)?.dati.posizioni?.[0] ?? "-"}`);
    });
    expect(viste).toEqual(["b1:condizione:0", "b1:condizione:1", "b1:condizione:2", "b1:condizione:3"]);
  });

  test("un punto sulla copia di un record col suo nome ferma «continua» una volta, prima del primo campo; «dentro» su ogni campo", () => {
    // `tipi/copia-di-un-record`: b1 `b ← a`, tre campi. A mano: con «continua» una pausa sola, col campo 0; con «dentro»
    // il valore iniziale, i tre campi, poi i blocchi.
    const pause = (comando: "continua" | "dentro") => {
      const e = new Esecuzione(apriFile("tipi/copia-di-un-record"), tetti);
      e.puntiDiInterruzione = new Set(["b1"]);
      const viste: string[] = [];
      finoAllaFine(e, comando, [], (x) => {
        const s = x.stato as Extract<Stato, { genere: "pausa" }>;
        viste.push(`${s.blocco || s.dato}${s.campo !== undefined ? `.${s.campo}` : ""}`);
      });
      return viste;
    };
    expect({ continua: pause("continua"), dentro: pause("dentro") }).toEqual({ continua: ["b1.0"], dentro: ["a", "b1.0", "b1.1", "b1.2", "b2", "b3", "b4", "b5", "fine"] });
  });

  test("la tabella in CSV, in italiano e in inglese, uguale all'atteso riga per riga e byte per byte", () => {
    const e = new Esecuzione(riferimento, tetti);
    finoAllaFine(e, "continua", inputDelRiferimento);
    const it = csv(e.traccia, riferimento, testiIt, separatoriPredefiniti.it);
    const en = csv(e.traccia, riferimento, testiEn, separatoriPredefiniti.en);
    expect(differenze(righeDelCsv(it), csvItalianoAtteso)).toEqual([]);
    expect(differenze(righeDelCsv(en), csvIngleseAtteso)).toEqual([]);
    // Il file: UTF-8 col BOM, righe chiuse da CR LF, l'ultima compresa.
    expect(it).toBe(`\u{feff}${csvItalianoAtteso.join("\r\n")}\r\n`);
    expect(en).toBe(`\u{feff}${csvIngleseAtteso.join("\r\n")}\r\n`);
    expect([...new TextEncoder().encode(it).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(e.traccia.tolte).toBe(0);
  });

  test("controllo positivo: una cella dell'atteso cambiata fa rosso il confronto", () => {
    const e = new Esecuzione(riferimento, tetti);
    finoAllaFine(e, "continua", inputDelRiferimento);
    const alterato = [...csvItalianoAtteso];
    alterato[44] = alterato[44]!.replace("6,67", "6,66");
    expect(differenze(righeDelCsv(csv(e.traccia, riferimento, testiIt, separatoriPredefiniti.it)), alterato).length).toBe(1);
  });

  test("a ogni pausa la riga corrente ha i valori di adesso: quella dell'azione appena fatta", () => {
    const e = new Esecuzione(riferimento, tetti);
    const sbagliate: string[] = [];
    let k = 0;
    finoAllaFine(e, "sopra", inputDelRiferimento, (x) => {
      k++;
      // In pausa sull'azione k la tabella arriva all'azione k - 1 (la riga 0 per la prima pausa).
      const ultima = righeDelCsv(csv(x.traccia, riferimento, testiIt, separatoriPredefiniti.it)).at(-1);
      if (ultima !== csvItalianoAtteso[k]) sbagliate.push(`pausa ${k}: ${ultima} | ${csvItalianoAtteso[k]}`);
    });
    expect({ pause: k, sbagliate }).toEqual({ pause: 65, sbagliate: [] });
  });

  test("le celle cambiate: una cella è cambiata se il suo testo è diverso da quello della riga prima, nell'atteso", () => {
    // L'atteso dei segni si ricava dall'atteso scritto a mano (le colonne dei dati, riga per riga), non dal nucleo.
    const celle = csvItalianoAtteso.slice(1).map((r) => celleDelCsv(r, ";").slice(2, -2));
    const attesi = celle.slice(1).map((r, k) => r.map((c, d) => c !== celle[k]![d]));
    const e = new Esecuzione(riferimento, tetti);
    finoAllaFine(e, "continua", inputDelRiferimento);
    const visti = e.traccia.righe.map((r) => r.cambiati.flat());
    expect(differenze(visti.map((r) => r.join()), attesi.map((r) => r.join()))).toEqual([]);
    // Controllo positivo: l'atteso ha celle cambiate e celle ferme. Le azioni che scrivono un dato sono 30 (le prime
    // cinque i valori iniziali), ma «i ← 0» (l'azione 13) gli lascia il valore che aveva: cambiano 29 celle.
    expect(attesi.flat().filter(Boolean).length).toBe(29);
    expect(attesi.flat().filter((c) => !c).length).toBeGreaterThan(400);
  });

  test("un reale che passa da 0.0 a -0.0 cambia il testo della cella, e la cella è cambiata", () => {
    const p = apri(
      JSON.stringify({
        format: "algodesign",
        schema_version: 2,
        metadata: { name: "meno-zero" },
        functions: [
          {
            id: "f1",
            kind: "main",
            data: [{ name: "x", type: "real", initial: "0.0" }],
            body: [
              { id: "b1", kind: "assignment", target: "x", value: "-x" },
              { id: "b2", kind: "assignment", target: "x", value: "x" },
            ],
            end: { id: "b3" },
          },
        ],
      }),
    );
    if (!p.ok) throw new Error("il progetto non si apre");
    const e = new Esecuzione(p.progetto, tetti);
    finoAllaFine(e, "continua", []);
    const testi = csv(e.traccia, p.progetto, testiIt, separatoriPredefiniti.it);
    // La premessa: la riga 0 non ha il valore, l'azione del valore iniziale dice «0,00», quella di «-x» «-0,00» (testi
    // del nucleo); poi «x ← x» e la fine.
    const valori = righeDelCsv(testi).slice(1).map((r) => celleDelCsv(r, separatoriPredefiniti.it.campo)[2]);
    expect(valori).toEqual(["non inizializzata", "0,00", "-0,00", "-0,00", "-0,00"]);
    // Il valore iniziale e «-x» cambiano la cella; «x ← x» no (controllo positivo: il confronto distingue).
    expect(e.traccia.righe.map((r) => r.cambiati.flat())).toEqual([[true], [true], [false], [false]]);
  });

  test("i punti di interruzione: «continua» si ferma su ogni loro occorrenza, e solo lì", () => {
    const e = new Esecuzione(riferimento, tetti);
    e.puntiDiInterruzione = new Set(["b10", "b21"]);
    expect(finoAllaFine(e, "continua", inputDelRiferimento)).toEqual(["b10", "b10", "b10", "b21", "b21", "b21", "b21", "b21", "b21"]);
    expect(scritto(e)).toBe(riferimento.test_cases![0]!.expected.output);
  });

  test("un punto messo durante la pausa vale dal comando successivo", () => {
    const e = new Esecuzione(riferimento, tetti);
    const pause = finoAllaFine(e, "continua", inputDelRiferimento, (x) => {
      x.puntiDiInterruzione = new Set();
    });
    expect(pause).toEqual([]);
    const f = new Esecuzione(riferimento, tetti);
    f.puntiDiInterruzione = new Set(["b16"]);
    expect(
      finoAllaFine(f, "continua", inputDelRiferimento, (x) => {
        x.puntiDiInterruzione = new Set(["b24"]);
      }),
    ).toEqual(["b16", "b24"]);
  });
});

// ------------------------------------------------------------------- il salto e il ritorno

// Le chiamate su tre livelli del corpus (`tappa-3/tre-livelli`): il programma principale (profondità 0) col valore
// iniziale di `n` e il salto `b1` a `mostra`; `mostra` (1) scrive in `b3` il risultato di `piu_uno_del_quadrato` (2),
// la cui fine `b5` chiama `quadrato` (3, la fine `b6`); poi la fine di `mostra` (`b4`) e quella del programma (`b2`).
// Le pause attese sono scritte a mano dalle regole del passo (dove si ferma il controllore), comando dopo comando. Dopo il
// ritorno da una funzione chiamata in un'espressione, l'azione di chi chiama riprende al suo livello (`↩`): la scrittura
// `b3` dopo `piu_uno_del_quadrato`, la fine `b5` dopo `quadrato`; la chiamata della procedura `b1` è un salto, senza ripresa.

/** Dalla partenza, un comando per pausa: dove si ferma ognuno (`blocco·profondità`, il dato per un valore iniziale, `↩`
 * davanti a una ripresa; «fine» a esecuzione finita). Una lettura prende il primo degli input rimasti, col comando di
 * prima. */
function percorso(p: Progetto, comandi: readonly Comando[], input: readonly string[] = [], punti: ReadonlySet<string> = new Set()): string[] {
  const e = new Esecuzione(p, tetti);
  e.puntiDiInterruzione = punti;
  const restanti = [...input];
  return comandi.map((c) => {
    e.comanda(c);
    for (;;) {
      e.fetta(nessunaAttesa, Infinity);
      const s = e.stato;
      if (s.genere !== "chiede") break;
      e.inserisci(restanti.shift()!);
    }
    const s = e.stato;
    return s.genere === "pausa" ? `${s.ripresa ? "↩" : ""}${s.dato ?? s.blocco}·${s.profondita}` : s.genere === "finita" ? "fine" : s.genere;
  });
}

describe("dentro, sopra e fuori sull'interprete vero: le chiamate su tre livelli", () => {
  const treLivelli = apriFile("tappa-3/tre-livelli");
  const attesi: [string, Comando[], string[]][] = [
    [
      "sempre dentro: ogni azione e ogni ripresa, a ogni livello",
      ["dentro", "dentro", "dentro", "dentro", "dentro", "dentro", "dentro", "dentro", "dentro", "dentro"],
      ["n·0", "b1·0", "b3·1", "b5·2", "b6·3", "↩b5·2", "↩b3·1", "b4·1", "b2·0", "fine"],
    ],
    ["sopra dal salto: la chiamata tutta in un passo", ["sopra", "sopra", "sopra", "sopra"], ["n·0", "b1·0", "b2·0", "fine"]],
    ["sopra dentro mostra: la funzione nella scrittura tutta in un passo, fino alla ripresa", ["dentro", "dentro", "dentro", "sopra", "sopra"], ["n·0", "b1·0", "b3·1", "↩b3·1", "b4·1"]],
    ["sopra al secondo livello: il terzo si salta, fino alla ripresa", ["dentro", "dentro", "dentro", "dentro", "sopra"], ["n·0", "b1·0", "b3·1", "b5·2", "↩b5·2"]],
    ["fuori dal secondo livello: la ripresa del primo; poi dal primo, poi dal programma", ["dentro", "dentro", "dentro", "dentro", "fuori", "fuori", "fuori"], ["n·0", "b1·0", "b3·1", "b5·2", "↩b3·1", "b2·0", "fine"]],
    ["fuori dal terzo livello: la ripresa del secondo", ["dentro", "dentro", "dentro", "dentro", "dentro", "fuori"], ["n·0", "b1·0", "b3·1", "b5·2", "b6·3", "↩b5·2"]],
  ];
  for (const [nome, comandi, pause] of attesi)
    test(nome, () => {
      expect(percorso(treLivelli, comandi)).toEqual(pause);
    });

  test("controllo positivo: una profondità dell'atteso cambiata fa rosso il confronto; l'output è quello del caso", () => {
    const [, comandi, pause] = attesi[0]!;
    expect(percorso(treLivelli, comandi)).not.toEqual(pause.map((x) => (x === "b6·3" ? "b6·2" : x)));
    const e = new Esecuzione(treLivelli, tetti);
    finoAllaFine(e, "continua", []);
    expect(scritto(e)).toBe(treLivelli.test_cases![0]!.expected.output);
  });

  test("la pausa dentro una funzione dice la funzione; quella del programma principale no", () => {
    const e = new Esecuzione(treLivelli, tetti);
    const pause: Stato[] = [];
    for (let k = 0; k < 4; k++) {
      e.comanda("dentro");
      while (e.stato.genere === "in corso") e.fetta(nessunaAttesa, Infinity);
      pause.push(e.stato);
    }
    expect(pause).toEqual([
      { genere: "pausa", blocco: "", dato: "n", profondita: 0 },
      { genere: "pausa", blocco: "b1", profondita: 0 },
      { genere: "pausa", blocco: "b3", funzione: "f2", profondita: 1 },
      { genere: "pausa", blocco: "b5", funzione: "f3", profondita: 2 },
    ]);
  });

  // Nei livelli sopra l'ultimo il blocco della chiamata: il salto `b1`, la scrittura `b3` che chiama la funzione, la fine
  // `b5` che ne chiama un'altra; sul valore iniziale la funzione stessa; al ritorno (la ripresa) i livelli sotto spariscono.
  test("la pila delle chiamate, pausa dopo pausa", () => {
    const e = new Esecuzione(treLivelli, tetti);
    const pile: string[] = [e.pila.map((l) => `${l.funzione}:${l.blocco}`).join(" ")];
    for (let k = 0; k < 9; k++) {
      e.comanda("dentro");
      while (e.stato.genere === "in corso") e.fetta(nessunaAttesa, Infinity);
      pile.push(e.pila.map((l) => `${l.funzione}:${l.blocco}`).join(" "));
    }
    expect(pile).toEqual([
      "f1:f1",
      "f1:f1",
      "f1:b1",
      "f1:b1 f2:b3",
      "f1:b1 f2:b3 f3:b5",
      "f1:b1 f2:b3 f3:b5 f4:b6",
      "f1:b1 f2:b3 f3:b5",
      "f1:b1 f2:b3",
      "f1:b1 f2:b4",
      "f1:b2",
    ]);
  });

  test("la pila di una funzione eseguita da sola parte da lei", () => {
    const e = new Esecuzione(treLivelli, tetti, { funzione: "f3" });
    expect(e.pila).toEqual([{ funzione: "f3", blocco: "f3" }]);
    e.comanda("continua");
    while (e.stato.genere === "in corso") e.fetta(nessunaAttesa, Infinity);
    expect(e.stato).toMatchObject({ genere: "chiede", dato: "x", parametro: "valore" });
    e.inserisci("3");
    do e.fetta(nessunaAttesa, Infinity);
    while ((e.stato as Stato).genere === "in corso");
    // L'ultima azione è la fine di `quadrato`, chiamata da ciò che `f3` restituisce: a fine normale resta la radice.
    expect({ stato: e.stato.genere, pila: e.pila }).toEqual({ stato: "finita", pila: [{ funzione: "f3", blocco: "b5" }] });
  });

  test("dopo un errore dentro una funzione la pila resta fino a lei", () => {
    // `primo` (f2) restituisce un elemento fuori dal vettore: l'errore cade sulla sua fine `b3`, chiamata dalla scrittura `b1`.
    const e = new Esecuzione(apriFile("tappa-3/scrittura-con-funzione-che-si-ferma"), tetti);
    finoAllaFine(e, "continua", []);
    expect({ stato: e.stato, pila: e.pila }).toEqual({
      stato: { genere: "finita", errore: { code: "index_out_of_range", block: "b3" } },
      pila: [
        { funzione: "f1", blocco: "b1" },
        { funzione: "f2", blocco: "b3" },
      ],
    });
  });

  test("il tetto dei passi sul ciclo di chi chiama, raggiunto dentro una procedura: la pila torna a chi ha il ciclo", () => {
    // Sei azioni per giro (il ciclo, la chiamata, il valore iniziale di k, le due assegnazioni, la fine): un milione è
    // 4 più un multiplo di 6, quindi l'azione oltre il tetto è la seconda assegnazione, dentro la procedura. Con cinque
    // azioni per giro sarebbe il ciclo stesso, e la prova non lo distinguerebbe.
    const r = leggi({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "senza fine" },
      functions: [
        { id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "while", condition: "true", body: [{ id: "b2", kind: "call", callee: "p", arguments: [] }] }], end: { id: "b3" } },
        {
          id: "f2",
          kind: "procedure",
          name: "p",
          data: [{ name: "k", type: "integer", initial: "0" }],
          body: [
            { id: "b4", kind: "assignment", target: "k", value: "k + 1" },
            { id: "b6", kind: "assignment", target: "k", value: "k + 1" },
          ],
          end: { id: "b5" },
        },
      ],
    });
    if (!r.ok) throw new Error(JSON.stringify(r.errori));
    const e = new Esecuzione(r.progetto, tetti, { tabella: false });
    finoAllaFine(e, "continua", []);
    expect({ stato: e.stato, pila: e.pila }).toEqual({ stato: { genere: "finita", errore: { code: "too_many_steps", block: "b1" } }, pila: [{ funzione: "f1", blocco: "b1" }] });
  });

  test("il tetto dei passi dentro una procedura che chiama sé stessa: la pila ha le chiamate in corso del nucleo, e l'ultima ha il blocco dell'errore", () => {
    // Hanoi con 21 e 23 dischi supera il milione di azioni a livelli diversi, su un blocco che il livello più profondo
    // non ha ancora raggiunto (21) o dopo il ritorno di una procedura, che non lascia una ripresa (23).
    const hanoi = apriFile("tappa-4/hanoi");
    for (const n of ["21", "23"]) {
      const e = new Esecuzione(hanoi, tetti, { caso: { name: n, inputs: [{ data: "n", text: n }], expected: { output: "" } }, tabella: false });
      finoAllaFine(e, "continua", []);
      const g = esegui(hanoi, tetti);
      let r = g.next();
      while (!r.done) r = g.next("chiedi" in r.value ? n : undefined);
      const esito = r.value;
      if (!esito.parte || esito.errore === undefined) throw new Error(`hanoi con ${n} dischi: nessun errore`);
      expect(esito.errore.code).toBe("too_many_steps");
      expect({ n, stato: e.stato, livelli: e.pila.length - 1, ultimo: e.pila.at(-1) }).toEqual({
        n,
        stato: { genere: "finita", errore: esito.errore },
        livelli: esito.dati.chiamate!.length,
        ultimo: { funzione: "f2", blocco: esito.errore.block },
      });
    }
  }, 60_000);

  test("il tetto dei passi sul valore iniziale di una procedura che chiama sé stessa, senza cicli: l'ultimo livello è la procedura", () => {
    // `p` si chiama due volte finché n > 0 (un albero di chiamate, nessun ciclo) e ha un dato di lavoro con un valore
    // iniziale, che è l'azione d'avvio di ogni chiamata: lì l'errore cade sull'id della procedura, non su un blocco.
    // Le assegnazioni del programma prima della chiamata spostano di uno l'azione oltre il tetto: si cerca la prima
    // che lo fa cadere sul valore iniziale.
    const progetto = (prima: number) => {
      const r = leggi({
        format: "algodesign",
        schema_version: 2,
        metadata: { name: "albero" },
        functions: [
          {
            id: "f1",
            kind: "main",
            data: [{ name: "a", type: "integer", initial: "0" }],
            body: [
              ...Array.from({ length: prima }, (_, k) => ({ id: `b${10 + k}`, kind: "assignment", target: "a", value: "a + 1" })),
              { id: "b1", kind: "call", callee: "p", arguments: ["20"] },
            ],
            end: { id: "b2" },
          },
          {
            id: "f2",
            kind: "procedure",
            name: "p",
            data: [
              { name: "n", type: "integer", parameter: "value" },
              { name: "k", type: "integer", initial: "0" },
            ],
            body: [
              {
                id: "b3",
                kind: "if",
                condition: "n > 0",
                then: [
                  { id: "b4", kind: "call", callee: "p", arguments: ["n - 1"] },
                  { id: "b5", kind: "call", callee: "p", arguments: ["n - 1"] },
                ],
                else: [],
              },
            ],
            end: { id: "b6" },
          },
        ],
      });
      if (!r.ok) throw new Error(JSON.stringify(r.errori));
      return r.progetto;
    };
    const esitoDel = (p: Progetto) => {
      const g = esegui(p, tetti);
      let r = g.next();
      while (!r.done) r = g.next();
      if (!r.value.parte || r.value.errore === undefined) throw new Error("nessun errore");
      return r.value;
    };
    const prima = Array.from({ length: 8 }, (_, k) => k).find((k) => esitoDel(progetto(k)).errore!.block === "f2");
    // La premessa: c'è uno spostamento che porta il tetto sul valore iniziale.
    expect(prima).toBeDefined();
    const p = progetto(prima!);
    const esito = esitoDel(p);
    const e = new Esecuzione(p, tetti, { tabella: false });
    finoAllaFine(e, "continua", []);
    expect({ stato: e.stato, livelli: e.pila.length - 1, ultimo: e.pila.at(-1) }).toEqual({
      stato: { genere: "finita", errore: { code: "too_many_steps", block: "f2" } },
      livelli: esito.dati.chiamate!.length,
      ultimo: { funzione: "f2", blocco: "f2" },
    });
  }, 60_000);
});

// ------------------------------------------------------------- il passo su una funzione ricorsiva

// Le sequenze scritte a mano dalla regola della ripresa: dopo il ritorno da una funzione chiamata in
// un'espressione, la ripresa dell'azione di chi chiama ferma Entra, Passo ed Esci alla profondità di chi chiama; Continua
// e i punti di interruzione no.
// - Il fattoriale del corpus (`tappa-4/fattoriale`) con 3: il programma principale legge `n` (b1) e chiama `fatt(n)` in
//   `b2`, poi scrive (b3) e finisce (b4); `fatt` ha il «se» b5, il caso che smette `f ← 1` (b6), `f ← n * fatt(n - 1)`
//   (b7) e la fine b8. Le chiamate sono ai livelli 1, 2 e 3.
// - Due chiamate in un'espressione: `r ← doppio(1) + triplo(2)` (b1), poi la scrittura b2 e la fine b3; `doppio` ha
//   `d ← x * 2` (b4) e la fine b5, `triplo` `t ← x * 3` (b6) e la fine b7.
// - La ricorsione indiretta del corpus (`tappa-4/pari-e-dispari`) con 2: la scrittura b2 chiama `pari(n)`; `pari` ha
//   il «se» b4, `p ← true` (b5), `p ← dispari(n - 1)` (b6) e la fine b7; `dispari` il «se» b8, `d ← false` (b9),
//   `d ← pari(n - 1)` (b10) e la fine b11.
describe("il passo su una funzione ricorsiva: la ripresa ferma Entra, Passo ed Esci", () => {
  const fattoriale = apriFile("tappa-4/fattoriale");
  const pariEDispari = apriFile("tappa-4/pari-e-dispari");
  const due = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "due chiamate" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "r", type: "integer" }],
        body: [
          { id: "b1", kind: "assignment", target: "r", value: "doppio(1) + triplo(2)" },
          { id: "b2", kind: "write", values: ["r"], newline: true },
        ],
        end: { id: "b3" },
      },
      { id: "f2", kind: "function", name: "doppio", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }, { name: "d", type: "integer" }], body: [{ id: "b4", kind: "assignment", target: "d", value: "x * 2" }], end: { id: "b5", return_value: "d" } },
      { id: "f3", kind: "function", name: "triplo", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }, { name: "t", type: "integer" }], body: [{ id: "b6", kind: "assignment", target: "t", value: "x * 3" }], end: { id: "b7", return_value: "t" } },
    ],
  });
  if (!due.ok) throw new Error(JSON.stringify(due.errori));
  const dueChiamate = due.progetto;
  // Le chiamate nella condizione di un «mentre» (b1, `conta(i) < 2`), nel limite di un «per» (b3, `quanti()`, ricalcolato
  // a ogni controllo) e nell'argomento di una procedura (b5, `mostra(doppio(3))`); `conta`, `quanti` e `doppio` hanno
  // solo la fine (b7, b8, b9), `mostra` scrive (b10) e finisce (b11).
  const neiCicli = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "nei cicli" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "i", type: "integer" },
          { name: "r", type: "integer" },
        ],
        body: [
          { id: "b12", kind: "assignment", target: "i", value: "0" },
          { id: "b1", kind: "while", condition: "conta(i) < 2", body: [{ id: "b2", kind: "assignment", target: "i", value: "i + 1" }] },
          { id: "b3", kind: "for", counter: "r", from: "1", to: "quanti()", body: [{ id: "b4", kind: "write", values: ["r"], newline: true }] },
          { id: "b5", kind: "call", callee: "mostra", arguments: ["doppio(3)"] },
        ],
        end: { id: "b6" },
      },
      { id: "f2", kind: "function", name: "conta", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }], body: [], end: { id: "b7", return_value: "x" } },
      { id: "f3", kind: "function", name: "quanti", return_type: "integer", data: [], body: [], end: { id: "b8", return_value: "2" } },
      { id: "f4", kind: "function", name: "doppio", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }], body: [], end: { id: "b9", return_value: "x * 2" } },
      { id: "f5", kind: "procedure", name: "mostra", data: [{ name: "y", type: "integer", parameter: "value" }], body: [{ id: "b10", kind: "write", values: ["y"], newline: true }], end: { id: "b11" } },
    ],
  });
  if (!neiCicli.ok) throw new Error(JSON.stringify(neiCicli.errori));
  // Il valore restituito che chiude il programma: `scrivi uno()` è l'ultimo blocco (b1); `uno` ha solo la fine (b3).
  const chiude = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "chiude" },
    functions: [
      { id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "write", values: ["uno()"], newline: true }], end: { id: "b2" } },
      { id: "f2", kind: "function", name: "uno", return_type: "integer", data: [], body: [], end: { id: "b3", return_value: "1" } },
    ],
  });
  if (!chiude.ok) throw new Error(JSON.stringify(chiude.errori));
  const volte = (n: number, c: Comando): Comando[] => Array.from({ length: n }, () => c);

  const attesi: [string, Progetto, string[], Comando[], string[], string[]?][] = [
    [
      "il fattoriale, sempre Entra: ogni azione e ogni ripresa",
      fattoriale,
      ["3"],
      volte(17, "dentro"),
      ["b1·0", "b2·0", "b5·1", "b7·1", "b5·2", "b7·2", "b5·3", "b6·3", "b8·3", "↩b7·2", "b8·2", "↩b7·1", "b8·1", "↩b2·0", "b3·0", "b4·0", "fine"],
    ],
    ["il fattoriale, sempre Passo: la chiamata tutta, poi la sua ripresa", fattoriale, ["3"], volte(6, "sopra"), ["b1·0", "b2·0", "↩b2·0", "b3·0", "b4·0", "fine"]],
    [
      "il fattoriale, Esci dal caso che smette: ogni Esci risale di un livello sulla moltiplicazione",
      fattoriale,
      ["3"],
      [...volte(8, "dentro"), "fuori", "fuori", "fuori", "fuori"],
      ["b1·0", "b2·0", "b5·1", "b7·1", "b5·2", "b7·2", "b5·3", "b6·3", "↩b7·2", "↩b7·1", "↩b2·0", "fine"],
    ],
    [
      "il fattoriale, Passo dalla fine di una chiamata: la ripresa di chi chiama; da lì Passo fino alla sua fine",
      fattoriale,
      ["3"],
      [...volte(9, "dentro"), "sopra", "sopra", "sopra"],
      ["b1·0", "b2·0", "b5·1", "b7·1", "b5·2", "b7·2", "b5·3", "b6·3", "b8·3", "↩b7·2", "b8·2", "↩b7·1"],
    ],
    [
      "il fattoriale, Passo sulla moltiplicazione: la chiamata più profonda tutta, poi la ripresa",
      fattoriale,
      ["3"],
      [...volte(4, "dentro"), "sopra", "sopra"],
      ["b1·0", "b2·0", "b5·1", "b7·1", "↩b7·1", "b8·1"],
    ],
    ["il fattoriale, Continua con un punto sulla moltiplicazione: si ferma sull'azione, mai sulla ripresa", fattoriale, ["3"], volte(3, "continua"), ["b7·1", "b7·2", "fine"], ["b7"]],
    ["il fattoriale, Continua con un punto sul caso che smette: una volta sola", fattoriale, ["3"], volte(2, "continua"), ["b6·3", "fine"], ["b6"]],
    [
      "il fattoriale, Esci da una pausa di Continua: la ripresa del livello di sopra",
      fattoriale,
      ["3"],
      ["continua", "fuori", "fuori"],
      ["b6·3", "↩b7·2", "↩b7·1"],
      ["b6"],
    ],
    ["due chiamate, sempre Entra", dueChiamate, [], volte(10, "dentro"), ["b1·0", "b4·1", "b5·1", "↩b1·0", "b6·1", "b7·1", "↩b1·0", "b2·0", "b3·0", "fine"]],
    ["due chiamate, sempre Passo: una ripresa dopo ogni chiamata", dueChiamate, [], volte(6, "sopra"), ["b1·0", "↩b1·0", "↩b1·0", "b2·0", "b3·0", "fine"]],
    ["due chiamate, Passo dalla fine della prima: la ripresa, prima della seconda", dueChiamate, [], [...volte(3, "dentro"), "sopra", "sopra"], ["b1·0", "b4·1", "b5·1", "↩b1·0", "↩b1·0"]],
    ["due chiamate, Esci da dentro la prima: la ripresa; da lì Entra nella seconda", dueChiamate, [], ["dentro", "dentro", "fuori", "dentro", "fuori"], ["b1·0", "b4·1", "↩b1·0", "b6·1", "↩b1·0"]],
    [
      "la ricorsione indiretta, sempre Entra",
      pariEDispari,
      ["2"],
      volte(15, "dentro"),
      ["b1·0", "b2·0", "b4·1", "b6·1", "b8·2", "b10·2", "b4·3", "b5·3", "b7·3", "↩b10·2", "b11·2", "↩b6·1", "b7·1", "↩b2·0", "b3·0"],
    ],
    [
      "la ricorsione indiretta, Esci dal caso che smette e Passo dalla ripresa",
      pariEDispari,
      ["2"],
      [...volte(8, "dentro"), "fuori", "sopra", "fuori", "sopra", "sopra"],
      ["b1·0", "b2·0", "b4·1", "b6·1", "b8·2", "b10·2", "b4·3", "b5·3", "↩b10·2", "b11·2", "↩b6·1", "b7·1", "↩b2·0"],
    ],
    [
      "la ricorsione indiretta, Esci a catena dal caso che smette: un livello alla volta, poi la fine",
      pariEDispari,
      ["2"],
      [...volte(7, "dentro"), "fuori", "fuori", "fuori", "fuori"],
      ["b1·0", "b2·0", "b4·1", "b6·1", "b8·2", "b10·2", "b4·3", "↩b10·2", "↩b6·1", "↩b2·0", "fine"],
    ],
    [
      "le chiamate in una condizione, in un limite e in un argomento, sempre Entra: la ripresa del ciclo a ogni controllo",
      neiCicli.progetto,
      [],
      volte(32, "dentro"),
      [
        ...["b12·0", "b1·0", "b7·1", "↩b1·0", "b2·0", "b1·0", "b7·1", "↩b1·0", "b2·0", "b1·0", "b7·1", "↩b1·0"],
        ...["b3·0", "b3·0", "b8·1", "↩b3·0", "b4·0", "b3·0", "b3·0", "b8·1", "↩b3·0", "b4·0", "b3·0", "b3·0", "b8·1", "↩b3·0"],
        ...["b5·0", "b9·1", "↩b5·0", "b10·1", "b11·1", "b6·0"],
      ],
    ],
    [
      "le chiamate in una condizione, in un limite e in un argomento, sempre Passo: una ripresa dopo ogni chiamata",
      neiCicli.progetto,
      [],
      volte(24, "sopra"),
      [
        ...["b12·0", "b1·0", "↩b1·0", "b2·0", "b1·0", "↩b1·0", "b2·0", "b1·0", "↩b1·0"],
        ...["b3·0", "b3·0", "↩b3·0", "b4·0", "b3·0", "b3·0", "↩b3·0", "b4·0", "b3·0", "b3·0", "↩b3·0"],
        ...["b5·0", "↩b5·0", "b6·0", "fine"],
      ],
    ],
    ["il valore che chiude il programma: Esci dalla funzione si ferma sulla ripresa; da lì Esci finisce", chiude.progetto, [], ["dentro", "dentro", "fuori", "fuori"], ["b1·0", "b3·1", "↩b1·0", "fine"]],
    ["il valore che chiude il programma: dalla ripresa Passo va alla fine del programma", chiude.progetto, [], ["dentro", "dentro", "dentro", "sopra"], ["b1·0", "b3·1", "↩b1·0", "b2·0"]],
  ];
  for (const [nome, p, input, comandi, pause, punti] of attesi)
    test(nome, () => {
      expect(percorso(p, comandi, input, new Set(punti ?? []))).toEqual(pause);
    });

  test("controllo positivo: le stesse sequenze senza le riprese sono un'altra cosa", () => {
    const [, p, input, comandi, pause] = attesi[0]!;
    expect(percorso(p, comandi, input)).not.toEqual(pause.filter((x) => !x.startsWith("↩")));
  });

  test("la pausa sulla ripresa: il blocco e la funzione di chi chiama, la sua profondità e il valore restituito, letti dal nucleo", () => {
    const e = new Esecuzione(fattoriale, tetti);
    const riprese: Stato[] = [];
    e.comanda("dentro");
    for (let giri = 0; giri < 100 && e.stato.genere !== "finita"; giri++) {
      e.fetta(nessunaAttesa, Infinity);
      const s = e.stato;
      if (s.genere === "chiede") e.inserisci("3");
      else if (s.genere === "pausa") {
        if (s.ripresa) riprese.push(s);
        e.comanda("dentro");
      }
    }
    expect(riprese).toEqual([
      { genere: "pausa", blocco: "b7", funzione: "f2", profondita: 2, ripresa: { funzione: "f2", valore: { tipo: "integer", v: 1 } } },
      { genere: "pausa", blocco: "b7", funzione: "f2", profondita: 1, ripresa: { funzione: "f2", valore: { tipo: "integer", v: 2 } } },
      { genere: "pausa", blocco: "b2", profondita: 0, ripresa: { funzione: "f2", valore: { tipo: "integer", v: 6 } } },
    ]);
  });

  // A ogni pausa di Entra: il numero dell'azione (una ripresa non è un'azione: resta quello della fine appena passata),
  // l'ultima riga della tabella (la riga della ripresa si chiude all'azione dopo) e `n` di `fatt` nel watch, la chiamata
  // più profonda (n = 4 - livello); «-» dove `fatt` non è attiva.
  test("il fattoriale livello per livello: il numero dell'azione, l'ultima riga della tabella e il watch", () => {
    const e = new Esecuzione(fattoriale, tetti);
    const tabella = new TabellaMostrata(fattoriale, testiIt, separatoriPredefiniti.it.decimali, "per-elemento", "elenco", opzioniDelDisegno);
    const viste: string[] = [];
    e.comanda("dentro");
    for (let giri = 0; giri < 100 && e.stato.genere !== "finita"; giri++) {
      e.fetta(nessunaAttesa, Infinity);
      const s = e.stato;
      if (s.genere === "chiede") e.inserisci("3");
      else if (s.genere === "pausa") {
        const r = e.traccia.righe.at(-1);
        const riga = r === undefined ? "-" : `${r.ripresa ? "↩" : ""}${r.blocco}·${r.livello}`;
        const n = tabella.watch(e.traccia, "n", "f2")?.elementi[0]!.cella.testo ?? "-";
        viste.push(`${s.ripresa ? "↩" : ""}${s.blocco}·${s.profondita} ${e.passi} ${riga} ${n}`);
        e.comanda("dentro");
      }
    }
    expect(viste).toEqual([
      "b1·0 1 - -",
      "b2·0 2 b1·0 -",
      "b5·1 3 b2·0 3",
      "b7·1 4 b5·1 3",
      "b5·2 5 b7·1 2",
      "b7·2 6 b5·2 2",
      "b5·3 7 b7·2 1",
      "b6·3 8 b5·3 1",
      "b8·3 9 b6·3 1",
      "↩b7·2 9 b8·3 2",
      "b8·2 10 ↩b7·2 2",
      "↩b7·1 10 b8·2 3",
      "b8·1 11 ↩b7·1 3",
      "↩b2·0 11 b8·1 -",
      "b3·0 12 ↩b2·0 -",
      "b4·0 13 b3·0 -",
    ]);
  });
});

// ------------------------------------------------------------------- un input non valido

test("un input non valido si dice e si richiede, senza perdere nulla", () => {
  const e = new Esecuzione(riferimento, tetti);
  e.comanda("continua");
  e.fetta(nessunaAttesa, Infinity);
  expect(e.stato).toEqual({ genere: "chiede", dato: "n", nonValido: false });
  e.inserisci("quattro");
  e.fetta(nessunaAttesa, Infinity);
  expect(e.stato).toEqual({ genere: "chiede", dato: "n", nonValido: true });
  expect(finoAllaFine(e, "continua", inputDelRiferimento)).toEqual([]);
  expect(scritto(e)).toBe(riferimento.test_cases![0]!.expected.output);
  expect(e.console.filter((v) => v.genere !== "scrive")).toEqual([
    { genere: "nonValido", dato: "n", testo: "quattro" },
    ...inputDelRiferimento.map((t, i) => ({ genere: "letto" as const, dato: i < 2 ? "n" : "voto", testo: t })),
  ]);
});

// ------------------------------------------------------------------------------ il corpus

test("il corpus: ogni caso della tappa 1 eseguito un comando alla volta, con gli input alla console", () => {
  const delCaso = new Set(["input_mismatch", "unused_inputs"]);
  const sbagliati: string[] = [];
  let casi = 0;
  let saltati = 0;
  let iniziali = 0;
  const conValoriIniziali = new Set<string>();
  const file = readdirSync(join(cartella, "tappa-1")).filter((f) => f.endsWith(".algo"));
  for (const f of file) {
    const p = apriFile(`tappa-1/${f.slice(0, -5)}`);
    for (const caso of p.test_cases ?? []) {
      const atteso = caso.expected;
      if (atteso.error && delCaso.has(atteso.error.code)) {
        saltati++;
        continue;
      }
      casi++;
      const input = caso.inputs.map((i) => i.text);
      const e = new Esecuzione(p, tetti);
      const pause = finoAllaFine(e, "sopra", input);
      const s = e.stato;
      const nome = `${f.slice(0, -5)}#${caso.name}`;
      if (atteso.static_error) {
        if (s.genere !== "non parte") sbagliati.push(`${nome}: parte`);
        continue;
      }
      if (scritto(e) !== atteso.output) sbagliati.push(`${nome}: output ${JSON.stringify(scritto(e))}`);
      const errore = atteso.error;
      if (errore?.code === "invalid_input") {
        // Alla console la stessa lettura si richiede: l'esecuzione aspetta sul blocco della lettura.
        if (!(s.genere === "chiede" && s.nonValido && pause.at(-1) === errore.block)) sbagliati.push(`${nome}: ${JSON.stringify(s)} dopo ${pause.at(-1)}`);
      } else if (errore?.code === "input_exhausted") {
        if (!(s.genere === "chiede" && !s.nonValido && pause.at(-1) === errore.block)) sbagliati.push(`${nome}: ${JSON.stringify(s)} dopo ${pause.at(-1)}`);
      } else if (JSON.stringify(s) !== JSON.stringify({ genere: "finita", ...(errore ? { errore } : {}) })) sbagliati.push(`${nome}: ${JSON.stringify(s)}`);
      // Le pause sono gli eventi del nucleo, uno per uno.
      if (e.passi !== pause.length) sbagliati.push(`${nome}: ${e.passi} passi, ${pause.length} pause`);
      // Le azioni sono quelle di quando i valori iniziali non erano azioni, più una per dato con un valore iniziale
      // (al più il tetto); e le prime pause sono quelle dei valori iniziali, nell'ordine della vista dei dati.
      const main = p.functions.find((x) => x.kind === "main")!;
      const conValore = [...(p.shared_constants ?? []), ...main.data].filter((d) => d.initial !== undefined).map((d) => pausaSulValoreIniziale(d.name));
      iniziali += conValore.length;
      const prima = azioniSenzaIValoriIniziali[nome];
      const attese = prima === undefined ? undefined : Math.min(prima + conValore.length, tettoDeiPassi);
      if (e.passi !== attese) sbagliati.push(`${nome}: ${e.passi} azioni invece di ${attese}`);
      if (JSON.stringify(pause.slice(0, conValore.length)) !== JSON.stringify(conValore)) sbagliati.push(`${nome}: pause iniziali ${JSON.stringify(pause.slice(0, conValore.length))}`);
      if (conValore.length > 0) conValoriIniziali.add(f);
    }
  }
  console.log(
    `esecuzione sul corpus: file ${file.length}, casi eseguiti ${casi}, dell'esecutore dei casi ${saltati}, file con valori iniziali ${conValoriIniziali.size}, azioni dei valori iniziali ${iniziali}, sbagliati ${sbagliati.length}`,
  );
  expect(sbagliati).toEqual([]);
  // Controllo positivo: le misure di prima coprono ogni caso (60 file, tre con due casi), e il corpus ha casi coi
  // valori iniziali.
  expect(Object.keys(azioniSenzaIValoriIniziali).length).toBe(63);
  expect(conValoriIniziali.size).toBeGreaterThan(20);
  expect({ file: file.length, casi: casi + saltati }).toEqual({ file: 60, casi: 63 });
  // Oggi nessun caso del corpus ha quegli esiti: li provano i progetti sintetici di `esecutore.test.ts`.
  expect(saltati).toBe(0);
});

// ---------------------------------------------------------------- le ultime righe della tabella

test("un ciclo che non finisce: le ultime 1000 righe, la numerazione vera e quante ne sono state tolte", () => {
  const p = apriFile("tappa-1/troppi-passi");
  const e = new Esecuzione(p, tetti);
  finoAllaFine(e, "continua", []);
  expect(e.stato).toEqual({ genere: "finita", errore: { code: "too_many_steps", block: "b1" } });
  const t = e.traccia;
  // Un milione di azioni: i valori iniziali di i e di x (le azioni 1 e 2), poi b1 (dispari) e b2 (pari), alternate;
  // x cambia a ogni b2 (le azioni pari dalla 4), quindi dopo l'azione 999 001 (un b1, preceduto da 499 499 b2) vale 1,
  // e dopo la 1 000 000 (il b2 numero 499 999) ancora 1.
  expect(tettoDeiPassi).toBe(1_000_000);
  expect({ righe: t.righe.length, tolte: t.tolte, prima: t.righe[0]!.numero, ultima: t.righe.at(-1)!.numero }).toEqual({
    righe: 1000,
    tolte: 999_000,
    prima: 999_001,
    ultima: 1_000_000,
  });
  const righe = righeDelCsv(csv(t, p, testiIt, separatoriPredefiniti.it));
  expect(righe.slice(0, 3)).toEqual(["#;Regola;i (intero);x (intero);Condizione;Scrive", "0;Inizio;non inizializzata;non inizializzata;;", "999001;i < 10;0;1;Vero;"]);
  expect(righe.at(-1)).toBe("1000000;x ← 1 - x;0;1;;");
  expect(righe.length).toBe(1002);
});

test("le ultime righe anche quando il totale non è un multiplo del taglio: 7 righe tenute su 65", () => {
  // Su un milione di azioni il taglio cade esattamente alla fine, e restano 1000 righe giuste per caso:
  // qui le righe in memoria sono più di quelle da mostrare.
  const e = new Esecuzione(riferimento, tetti, { righe: 7 });
  finoAllaFine(e, "continua", inputDelRiferimento);
  expect({ numeri: e.traccia.righe.map((r) => r.numero), tolte: e.traccia.tolte }).toEqual({ numeri: [59, 60, 61, 62, 63, 64, 65], tolte: 58 });
  const righe = righeDelCsv(csv(e.traccia, riferimento, testiIt, separatoriPredefiniti.it));
  expect(righe).toEqual([...csvItalianoAtteso.slice(0, 2), ...csvItalianoAtteso.slice(60)]);
});

// ---------------------------------------------------------------------------- un vettore

test("un vettore: una colonna per elemento; caratteri, stringhe e booleani come li scrive il programma", () => {
  const p = progetto(
    [
      { name: "v", type: "integer", size: 3 },
      { name: "s", type: "string", initial: '"a;b"' },
      { name: "c", type: "character", initial: "'x'" },
      { name: "ok", type: "boolean" },
      { name: "r", type: "real", initial: "-0.5" },
    ],
    [
      { id: "b1", kind: "assignment", target: "v[1]", value: "7" },
      { id: "b2", kind: "assignment", target: "ok", value: "v[1] > 5" },
      { id: "b3", kind: "write", values: ["s", "c"], newline: false },
    ],
  );
  const e = new Esecuzione(p, tetti);
  finoAllaFine(e, "continua", []);
  expect(righeDelCsv(csv(e.traccia, p, testiIt, separatoriPredefiniti.it))).toEqual([
    "#;Regola;v[0] (intero);v[1] (intero);v[2] (intero);s (stringa);c (carattere);ok (booleano);r (reale);Condizione;Scrive",
    "0;Inizio;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;;",
    // i valori iniziali: la regola come nel blocco, coi letterali come sono scritti
    '1;"s ← ""a;b""";non inizializzata;non inizializzata;non inizializzata;"a;b";non inizializzata;non inizializzata;non inizializzata;;',
    "2;c ← 'x';non inizializzata;non inizializzata;non inizializzata;\"a;b\";x;non inizializzata;non inizializzata;;",
    '3;r ← -0.5;non inizializzata;non inizializzata;non inizializzata;"a;b";x;non inizializzata;-0,50;;',
    '4;v[1] ← 7;non inizializzata;7;non inizializzata;"a;b";x;non inizializzata;-0,50;;',
    '5;ok ← v[1] > 5;non inizializzata;7;non inizializzata;"a;b";x;true;-0,50;;',
    '6;scrivi s, c;non inizializzata;7;non inizializzata;"a;b";x;true;-0,50;;"a;bx"',
    '7;Fine;non inizializzata;7;non inizializzata;"a;b";x;true;-0,50;;',
  ]);
});

test("le celle cambiate di un vettore: solo l'elemento che cambia, e non se riceve lo stesso valore", () => {
  const p = progetto(
    [{ name: "v", type: "integer", size: 3, initial: { each: "0" } }],
    [
      { id: "b1", kind: "assignment", target: "v[1]", value: "7" },
      { id: "b2", kind: "assignment", target: "v[1]", value: "7" },
    ],
  );
  const e = new Esecuzione(p, tetti);
  finoAllaFine(e, "continua", []);
  // Il valore iniziale cambia ogni elemento, in un'azione.
  expect(e.traccia.righe.map((r) => r.cambiati)).toEqual([[[true, true, true]], [[false, true, false]], [[false, false, false]], [[false, false, false]]]);
});

// ------------------------------------------------------------------------------------- il watch

describe("il watch: un dato nella riga corrente della tabella", () => {
  test("a ogni pausa del riferimento, e alla fine, ogni dato ha il tipo e il valore della riga corrente dell'atteso scritto a mano", () => {
    const e = new Esecuzione(riferimento, tetti);
    const tabella = new TabellaMostrata(riferimento, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    const intestazione = csvItalianoAtteso[0]!.split(";");
    const righe = csvItalianoAtteso.slice(1).map((r) => r.split(";"));
    const colonne = intestazione.slice(2, 10).map((t, k) => {
      const [, nome, tipo] = /^(\w+) \((\w+)\)$/.exec(t)!;
      return { nome: nome!, tipo: tipo!, indice: k + 2 };
    });
    const sbagliati: string[] = [];
    const guarda = (quando: string, numero: number) => {
      for (const c of colonne) {
        const w = tabella.watch(e.traccia, c.nome);
        const visto = w && `${w.nome} ${w.tipo} ${w.vettore} ${w.elementi.map((x) => `${x.nome}=${x.cella.testo}${x.cella.nonInizializzata ? "?" : ""}`).join(" ")}`;
        const valore = righe[numero]![c.indice]!;
        const atteso = `${c.nome} ${c.tipo} false ${c.nome}=${valore}${valore === "non inizializzata" ? "?" : ""}`;
        if (visto !== atteso) sbagliati.push(`${quando}: ${visto} invece di ${atteso}`);
      }
    };
    let pause = 0;
    // In pausa sull'azione k la riga corrente è la k - 1: i valori dopo l'azione di prima.
    finoAllaFine(e, "sopra", inputDelRiferimento, () => guarda(`pausa ${++pause}`, pause - 1));
    guarda("fine", 65);
    expect({ pause, sbagliati: sbagliati.slice(0, 5), quanti: sbagliati.length }).toEqual({ pause: 65, sbagliati: [], quanti: 0 });
  });

  test("un vettore: un elemento per colonna; nessun watch per un nome che non è un dato, né prima della prima azione", () => {
    const p = progetto(
      [
        { name: "v", type: "integer", size: 3 },
        { name: "r", type: "real", initial: "-0.5" },
      ],
      [{ id: "b1", kind: "assignment", target: "v[1]", value: "7" }],
    );
    const e = new Esecuzione(p, tetti);
    const tabella = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    expect(tabella.watch(e.traccia, "v")).toBeUndefined();
    finoAllaFine(e, "continua", []);
    expect(tabella.watch(e.traccia, "v")).toEqual({
      nome: "v",
      tipo: "intero",
      vettore: true,
      elementi: [
        { nome: "v[0]", cella: { testo: "non inizializzata", nonInizializzata: true, cambiata: false } },
        { nome: "v[1]", cella: { testo: "7", nonInizializzata: false, cambiata: false } },
        { nome: "v[2]", cella: { testo: "non inizializzata", nonInizializzata: true, cambiata: false } },
      ],
    });
    expect(tabella.watch(e.traccia, "r")?.elementi.map((x) => x.cella.testo)).toEqual(["-0,50"]);
    expect(tabella.watch(e.traccia, "x")).toBeUndefined();
  });

  // Il riferimento della tappa 3: `leggi_numero` (f2) riceve `n` del programma per riferimento e legge `numero` finché non
  // è fra 1 e 30. Dato 0, la lettura si richiede: `numero` vale 0, ed è il dato `n` di chi chiama (lo stesso valore).
  test("dentro una procedura: i suoi dati, il dato di chi chiama per un riferimento, nessuno per una funzione non attiva", () => {
    const p = apriFile("tappa-3/riferimento-media-voti-funzioni");
    const e = new Esecuzione(p, tetti);
    const tabella = new TabellaMostrata(p, testiIt, ",", "primi-e-altri", "elenco", opzioniDelDisegno);
    e.comanda("continua");
    while (e.stato.genere === "in corso") e.fetta(nessunaAttesa, Infinity);
    e.inserisci("0");
    do e.fetta(nessunaAttesa, Infinity);
    while ((e.stato as Stato).genere === "in corso");
    // La lettura nomina il dato che riceve il valore, `n` di chi chiama (come la voce di un caso).
    expect(e.stato).toMatchObject({ genere: "chiede", dato: "n" });
    const zero = { testo: "0", nonInizializzata: false, cambiata: false };
    expect(tabella.watch(e.traccia, "numero", "f2")).toEqual({ nome: "numero", tipo: "intero", vettore: false, elementi: [{ nome: "numero", cella: zero }], origine: { nome: "n", livello: 0 } });
    expect(tabella.watch(e.traccia, "n")).toEqual({ nome: "n", tipo: "intero", vettore: false, elementi: [{ nome: "n", cella: zero }] });
    // Un dato del programma non è di `leggi_numero`; `valido` (f3) non è attiva; `numero` non è un dato del programma.
    expect([tabella.watch(e.traccia, "n", "f2"), tabella.watch(e.traccia, "voto", "f3"), tabella.watch(e.traccia, "numero")]).toEqual([undefined, undefined, undefined]);
  });
});

// ------------------------------------------------------------------------------- le fette

describe("a fette: si avanza finché passa la durata, poi si cede", () => {
  test("un ciclo che non finisce non si mangia la fetta: si ferma alla durata data dall'orologio", () => {
    const e = new Esecuzione(apriFile("tappa-1/troppi-passi"), tetti);
    let t = 0;
    const orologio = () => t++;
    e.comanda("continua");
    e.fetta(orologio, 50);
    expect(e.stato).toEqual({ genere: "in corso" });
    expect(e.passi).toBeGreaterThan(0);
    expect(e.passi).toBeLessThanOrEqual(50);
    const dopoUna = e.passi;
    e.fetta(orologio, 50);
    expect(e.passi).toBeGreaterThan(dopoUna);
    expect(e.passi).toBeLessThanOrEqual(dopoUna + 50);
  });

  test("a fette o in una volta, la stessa esecuzione: pause, output e tabella", () => {
    const tutto = new Esecuzione(riferimento, tetti);
    finoAllaFine(tutto, "continua", inputDelRiferimento);
    const fette = new Esecuzione(riferimento, tetti);
    let t = 0;
    let quante = 0;
    let k = 0;
    fette.comanda("continua");
    while (fette.stato.genere !== "finita") {
      if (fette.stato.genere === "chiede") fette.inserisci(inputDelRiferimento[k++]!);
      fette.fetta(() => t++, 3);
      quante++;
    }
    expect(quante).toBeGreaterThan(20);
    expect(scritto(fette)).toBe(scritto(tutto));
    expect(csv(fette.traccia, riferimento, testiIt, separatoriPredefiniti.it)).toBe(csv(tutto.traccia, riferimento, testiIt, separatoriPredefiniti.it));
  });
});

describe("una fetta fa almeno un passo, e un'eccezione del motore chiude l'esecuzione", () => {
  test("con un orologio che avanza più della durata a ogni lettura, o con la durata zero, ogni fetta avanza di un passo", () => {
    // Un passo dell'interprete è un evento, l'esito di una condizione o una scrittura: in «troppi-passi» gli eventi
    // dei due valori iniziali, poi l'evento della condizione (b1) e il suo esito, poi l'evento dell'assegnazione (b2).
    // Le azioni contate sono gli eventi.
    for (const durata of [1, 0]) {
      const e = new Esecuzione(apriFile("tappa-1/troppi-passi"), tetti);
      let t = 0;
      e.comanda("continua");
      const dopo: number[] = [];
      for (let k = 0; k < 6; k++) {
        e.fetta(() => (t += 5), durata);
        dopo.push(e.passi);
      }
      expect({ durata, dopo }).toEqual({ durata, dopo: [1, 2, 3, 3, 4, 5] });
    }
  });

  test("da una pausa una fetta non fa nulla: il passo lo chiede un comando", () => {
    const f = new Esecuzione(apriFile("tappa-1/troppi-passi"), tetti);
    f.comanda("sopra");
    f.fetta(nessunaAttesa, Infinity);
    const passi = f.passi;
    expect(f.stato.genere).toBe("pausa");
    f.fetta(nessunaAttesa, Infinity);
    expect(f.passi).toBe(passi);
  });

  test("un RangeError del motore dentro una fetta: l'esecuzione finisce con l'errore della memoria sul blocco corrente, e la tabella chiude la sua riga", () => {
    const p = progetto([{ name: "n", type: "integer", initial: "0" }], [{ id: "b1", kind: "while", condition: "true", body: [{ id: "b2", kind: "write", values: ['"ciao"'], newline: true }, { id: "b3", kind: "assignment", target: "n", value: "n + 1" }] }]);
    const e = new Esecuzione(p, tetti);
    // Il motore che non riesce più ad allungare un testo, alla terza scrittura: il blocco scrive il testo e poi l'a
    // capo, quindi è la seconda volta di b2, all'azione 6 dopo il valore iniziale di n (la console ha ciò che è arrivato prima
    // del pezzo che il motore non ha retto).
    let scritture = 0;
    const scrive = e.traccia.scrive.bind(e.traccia);
    e.traccia.scrive = (testo: string) => {
      if (++scritture === 3) throw new RangeError("Invalid string length");
      scrive(testo);
    };
    e.comanda("continua");
    e.fetta(nessunaAttesa, Infinity);
    expect(e.stato).toEqual({ genere: "finita", errore: { code: "out_of_memory", block: "b2" } });
    expect({ passi: e.passi, output: scritto(e), righe: e.traccia.righe.map((r) => `${r.numero} ${r.blocco}`).slice(-2) }).toEqual({ passi: 6, output: "ciao\n", righe: ["5 b1", "6 b2"] });
    // Finita: un'altra fetta non fa nulla.
    e.fetta(nessunaAttesa, Infinity);
    expect(e.passi).toBe(6);
  });

  test("un'eccezione che non è del motore (un difetto dell'app) non si traveste da errore del programma: esce dalla fetta", () => {
    const e = new Esecuzione(apriFile("tappa-1/troppi-passi"), tetti);
    e.traccia.condizione = () => {
      throw new TypeError("difetto");
    };
    e.comanda("continua");
    expect(() => e.fetta(nessunaAttesa, Infinity)).toThrow("difetto");
  });
});

// ----------------------------------------------------------------------------- la console

describe("la console a righe: le ultime righe, quante ne sono state tolte", () => {
  test("le scritture si dividono in righe; una riga senza a capo resta aperta e si completa; letto e non valido sono righe loro", () => {
    const p = progetto(
      [{ name: "n", type: "integer" }],
      [
        { id: "b1", kind: "write", values: ['"ab"'], newline: false },
        { id: "b2", kind: "write", values: ['"c"'], newline: true },
        { id: "b3", kind: "write", values: ['"d\\ne"'], newline: false },
        { id: "b4", kind: "read", target: "n" },
        { id: "b5", kind: "write", values: ["n"], newline: true },
        { id: "b6", kind: "write", values: ['""'], newline: true },
      ],
    );
    const e = new Esecuzione(p, tetti);
    expect(finoAllaFine(e, "continua", ["x", "5"])).toEqual([]);
    expect(e.console).toEqual([
      { genere: "scrive", testo: "abc", aCapo: true },
      { genere: "scrive", testo: "d", aCapo: true },
      { genere: "scrive", testo: "e", aCapo: false },
      { genere: "nonValido", dato: "n", testo: "x" },
      { genere: "letto", dato: "n", testo: "5" },
      { genere: "scrive", testo: "5", aCapo: true },
      { genere: "scrive", testo: "", aCapo: true },
    ]);
    expect(e.consoleTolte).toBe(0);
    // Le righe scritte, unite coi loro a capo, sono l'output.
    expect(scritto(e)).toBe("abc\nd\ne5\n\n");
  });

  test("le scritture consecutive restano righe distinte, una per a capo", () => {
    const p = progetto([{ name: "n", type: "integer", initial: "0" }], [
      { id: "b1", kind: "while", condition: "n < 3", body: [{ id: "b2", kind: "write", values: ['"ciao"'], newline: true }, { id: "b3", kind: "assignment", target: "n", value: "n + 1" }] },
    ]);
    const e = new Esecuzione(p, tetti);
    finoAllaFine(e, "continua", []);
    expect(e.console).toEqual([1, 2, 3].map(() => ({ genere: "scrive", testo: "ciao", aCapo: true })));
  });

  test("oltre il tetto restano le ultime righe, anche la riga aperta, col conteggio delle tolte; senza caso l'output non si tiene", () => {
    const p = progetto([{ name: "n", type: "integer", initial: "0" }], [
      { id: "b1", kind: "while", condition: "n < 10", body: [{ id: "b2", kind: "write", values: ['"riga "', "n"], newline: true }, { id: "b3", kind: "assignment", target: "n", value: "n + 1" }] },
      { id: "b4", kind: "write", values: ['"fine"'], newline: false },
    ]);
    const e = new Esecuzione(p, tetti, { righe: 7 });
    finoAllaFine(e, "continua", []);
    expect({ righe: e.console.map((r) => (r.genere === "scrive" ? `${r.testo}${r.aCapo ? "↵" : ""}` : r.genere)), tolte: e.consoleTolte }).toEqual({
      righe: ["riga 4↵", "riga 5↵", "riga 6↵", "riga 7↵", "riga 8↵", "riga 9↵", "fine"],
      tolte: 4,
    });
    // Senza caso non c'è un esito, e nessun output tenuto oltre le righe della console.
    expect(e.esito).toBeUndefined();
    expect(e.outputTenuto).toBe(0);
    // Controllo positivo: lo stesso programma con un caso tiene tutto ciò che scrive (74 caratteri, sotto il margine).
    const conCaso = new Esecuzione(p, tetti, { righe: 7, caso: { name: "c", inputs: [], expected: { output: "" } } });
    finoAllaFine(conCaso, "continua", []);
    expect(conCaso.outputTenuto).toBe(74);
  });

  test("un ciclo che scrive senza fine: 1000 righe tenute, le altre contate", () => {
    const p = progetto([], [{ id: "b1", kind: "while", condition: "true", body: [{ id: "b2", kind: "write", values: ['"ciao"'], newline: true }] }]);
    const e = new Esecuzione(p, tetti);
    finoAllaFine(e, "continua", []);
    expect(e.stato).toEqual({ genere: "finita", errore: { code: "too_many_steps", block: "b1" } });
    // Una riga per scrittura: le tenute più le tolte.
    const scritture = e.console.length + e.consoleTolte;
    expect(scritture).toBe(500_000);
    expect({ righe: e.console.length, tolte: e.consoleTolte, tutte: e.console.every((r) => r.genere === "scrive" && r.testo === "ciao" && r.aCapo) }).toEqual({
      righe: 1000,
      tolte: scritture - 1000,
      tutte: true,
    });
  });

  // Tre scritture di dieci caratteri senza a capo, poi «xy» con l'a capo: una riga di 32 caratteri.
  const lunga = () =>
    progetto(
      [{ name: "n", type: "integer", initial: "0" }],
      [
        { id: "b1", kind: "while", condition: "n < 3", body: [{ id: "b2", kind: "write", values: ['"abcdefghij"'], newline: false }, { id: "b3", kind: "assignment", target: "n", value: "n + 1" }] },
        { id: "b4", kind: "write", values: ['"xy"'], newline: true },
      ],
    );
  const comeTesto = (e: Esecuzione) => e.console.map((r) => (r.genere === "scrive" ? `${r.tagliata ? "…" : ""}${r.testo}${r.aCapo ? "↵" : ""}` : r.genere));

  test("una riga più lunga dei caratteri di una riga va a capo da sola: le righe piene sono righe della console, e unite sono l'output", () => {
    const e = new Esecuzione(lunga(), tetti, { righeLunghe: { caratteri: 4, modo: "a-capo" } });
    finoAllaFine(e, "continua", []);
    expect(comeTesto(e)).toEqual(["abcd", "efgh", "ijab", "cdef", "ghij", "abcd", "efgh", "ijxy↵"]);
    expect(scritto(e)).toBe("abcdefghij".repeat(3) + "xy\n");
    // Le righe piene contano fra quelle tenute.
    const corta = new Esecuzione(lunga(), tetti, { righe: 3, righeLunghe: { caratteri: 4, modo: "a-capo" } });
    finoAllaFine(corta, "continua", []);
    expect({ righe: comeTesto(corta), tolte: corta.consoleTolte }).toEqual({ righe: ["abcd", "efgh", "ijxy↵"], tolte: 5 });
  });

  test("oppure se ne tiene la fine: gli ultimi caratteri di una riga, segnata come tagliata; la riga aperta non cresce", () => {
    const e = new Esecuzione(lunga(), tetti, { righeLunghe: { caratteri: 4, modo: "la-fine" } });
    expect(e.stato.genere).toBe("pronta");
    e.comanda("continua");
    // Fermata sulla prima scrittura dopo il primo giro: la riga aperta ha già gli ultimi quattro.
    e.puntiDiInterruzione = new Set(["b3"]);
    e.fetta(nessunaAttesa, Infinity);
    expect(comeTesto(e)).toEqual(["…ghij"]);
    e.puntiDiInterruzione = new Set();
    finoAllaFine(e, "continua", []);
    expect(comeTesto(e)).toEqual(["…ijxy↵"]);
    // La console tiene la fine, l'output di un caso resta intero: l'atteso coincide.
    const conCaso = new Esecuzione(lunga(), tetti, { righeLunghe: { caratteri: 4, modo: "la-fine" }, caso: { name: "intero", inputs: [], expected: { output: "abcdefghij".repeat(3) + "xy\n" } } });
    finoAllaFine(conCaso, "continua", []);
    expect({ console: comeTesto(conCaso), raggiunto: conCaso.esito?.fuoriTappa === false && conCaso.esito.raggiunto }).toEqual({ console: ["…ijxy↵"], raggiunto: true });
    // Una riga lunga quanto i caratteri non è tagliata.
    const giusta = new Esecuzione(progetto([], [{ id: "b1", kind: "write", values: ['"abcd"'], newline: true }]), tetti, { righeLunghe: { caratteri: 4, modo: "la-fine" } });
    finoAllaFine(giusta, "continua", []);
    expect(comeTesto(giusta)).toEqual(["abcd↵"]);
  });

  test("una riga letta più lunga dei caratteri va a capo da sola o se ne tiene la fine, come le altre; una riga non valida tiene la fine", () => {
    const p = progetto(
      [
        { name: "s", type: "string" },
        { name: "n", type: "integer" },
      ],
      [
        { id: "b1", kind: "read", target: "s" },
        { id: "b2", kind: "read", target: "n" },
      ],
    );
    const caso = { name: "lungo", inputs: [{ data: "s", text: "abcdefghij" }, { data: "n", text: "12" }], expected: { output: "" } };
    const righe = (e: Esecuzione) => e.console.map((r) => `${r.genere} ${"tagliata" in r && r.tagliata ? "…" : ""}${r.testo}`);
    const aCapo = new Esecuzione(p, tetti, { righeLunghe: { caratteri: 4, modo: "a-capo" }, caso });
    finoAllaFine(aCapo, "continua", []);
    const fine = new Esecuzione(p, tetti, { righeLunghe: { caratteri: 4, modo: "la-fine" }, caso });
    finoAllaFine(fine, "continua", []);
    // Senza caso: una riga non valida, poi una giusta.
    const scritta = new Esecuzione(p, tetti, { righeLunghe: { caratteri: 4, modo: "a-capo" } });
    finoAllaFine(scritta, "continua", ["abc", "1234567x", "7"]);
    expect({ aCapo: righe(aCapo), fine: righe(fine), scritta: righe(scritta) }).toEqual({
      aCapo: ["letto abcd", "letto efgh", "letto ij", "letto 12"],
      fine: ["letto …ghij", "letto 12"],
      scritta: ["letto abc", "nonValido …567x", "letto 7"],
    });
    // La tabella di traccia ha la riga letta intera.
    expect(aCapo.traccia.righe.flatMap((r) => (r.letto === undefined ? [] : [r.letto]))).toEqual(["abcdefghij", "12"]);
  });

  test("i caratteri di una riga sono un intero da 1 in su: altri valori si rifiutano subito (andare a capo ogni zero caratteri non finirebbe)", () => {
    for (const caratteri of [0, -1, 2.5, Number.NaN])
      expect(() => new Esecuzione(lunga(), tetti, { righeLunghe: { caratteri, modo: "a-capo" } }), String(caratteri)).toThrow("caratteri di una riga");
    // Controllo positivo: il più piccolo accettato.
    expect(new Esecuzione(lunga(), tetti, { righeLunghe: { caratteri: 1, modo: "a-capo" } }).stato.genere).toBe("pronta");
  });

  test("i caratteri si contano in codici: un carattere fuori dal piano di base non si spezza", () => {
    const p = progetto([], [{ id: "b1", kind: "write", values: [`"a${String.fromCodePoint(0x1f600)}bc"`], newline: true }]);
    const aCapo = new Esecuzione(p, tetti, { righeLunghe: { caratteri: 2, modo: "a-capo" } });
    finoAllaFine(aCapo, "continua", []);
    expect(comeTesto(aCapo)).toEqual([`a${String.fromCodePoint(0x1f600)}`, "bc↵"]);
    const fine = new Esecuzione(p, tetti, { righeLunghe: { caratteri: 3, modo: "la-fine" } });
    finoAllaFine(fine, "continua", []);
    expect(comeTesto(fine)).toEqual([`…${String.fromCodePoint(0x1f600)}bc↵`]);
  });

  test("un ciclo che scrive senza mai andare a capo: la console resta nel tetto (righe per caratteri) nei due modi, coi predefiniti", () => {
    const p = progetto([{ name: "i", type: "integer", initial: "0" }], [
      { id: "b1", kind: "while", condition: "true", body: [{ id: "b2", kind: "write", values: ['"ciao "', "i"], newline: false }, { id: "b3", kind: "assignment", target: "i", value: "i + 1" }] },
    ]);
    for (const modo of ["a-capo", "la-fine"] as const) {
      const e = new Esecuzione(p, tetti, { righeLunghe: { ...righeLunghePredefinite, modo } });
      finoAllaFine(e, "continua", []);
      const caratteri = e.console.reduce((s, r) => s + r.testo.length, 0);
      expect({ modo, stato: e.stato.genere, oltre: e.console.some((r) => [...r.testo].length > righeLunghePredefinite.caratteri), righe: e.console.length <= 1000, caratteri: caratteri <= 1000 * 250 }).toEqual({
        modo,
        stato: "finita",
        oltre: false,
        righe: true,
        caratteri: true,
      });
      if (modo === "la-fine") expect(e.console.length).toBe(1);
      else expect(e.consoleTolte).toBeGreaterThan(0);
    }
    expect(righeLunghePredefinite).toEqual({ caratteri: 250, modo: "a-capo" });
    // Il limite esplicito: meno di 2 s a macchina libera, oltre i 5 predefiniti sotto il carico del collaudo intero
    // (misurato due volte: 5138 e 5095 ms). La prova non misura un tempo.
  }, 15_000);
});

// ---------------------------------------------------------------- i limiti delle impostazioni

describe("i limiti delle impostazioni arrivano all'esecuzione da ogni chiamante", () => {
  // Un vettore di 600 elementi: sotto il limite predefinito (1000), esattamente al limite abbassato. Le Impostazioni
  // non alzano il limite dei vettori oltre il predefinito: il confine si prova abbassandolo.
  const p = progetto([{ name: "v", type: "integer", size: 600, initial: { each: "4" } }], [{ id: "b1", kind: "write", values: ["v[599]"], newline: false }], [
    { name: "ultimo", inputs: [], expected: { output: "4" } },
  ]);
  const abbassati = (n: number): Tetti => ({ ...tetti, elementiDiUnVettore: n });

  test("esegui: parte al limite esatto, non parte un elemento sotto; coi predefiniti parte", () => {
    const fine = (l: Tetti) => {
      const g = esegui(p, l);
      let r = g.next();
      while (!r.done) r = g.next();
      return r.value.parte ? "parte" : r.value.controllo.fuoriTappa ? "fuori tappa" : r.value.controllo.errori.map((x) => x.code).join();
    };
    expect([fine(abbassati(600)), fine(abbassati(599)), fine(tetti)]).toEqual(["parte", "limit_exceeded", "parte"]);
  });

  test("un caso, dalla riga di comando e passo passo: lo stesso confine", () => {
    const caso = p.test_cases![0]!;
    const passoPasso = (l: Tetti) => {
      const e = new Esecuzione(p, l, { caso });
      finoAllaFine(e, "sopra", []);
      return e.esito;
    };
    const differenze = (x: ReturnType<typeof eseguiCaso> | undefined) => (x === undefined || x.fuoriTappa ? x : { raggiunto: x.raggiunto, differenze: x.differenze });
    const sotto = {
      raggiunto: false,
      differenze: [
        { campo: "output", atteso: "4", ottenuto: "" },
        { campo: "static_error", atteso: "nessuno", ottenuto: "limit_exceeded@f1" },
      ],
    } as const;
    expect([600, 599].map((n) => differenze(eseguiCaso(p, caso, abbassati(n))))).toEqual([{ raggiunto: true, differenze: [] }, sotto]);
    expect([600, 599].map((n) => differenze(passoPasso(abbassati(n))))).toEqual([{ raggiunto: true, differenze: [] }, sotto]);
  });

  test("l'esecuzione passo passo: lo stesso confine", () => {
    const e = new Esecuzione(p, abbassati(600));
    finoAllaFine(e, "continua", []);
    expect({ stato: e.stato, output: scritto(e) }).toEqual({ stato: { genere: "finita" }, output: "4" });
    expect(new Esecuzione(p, abbassati(599)).stato.genere).toBe("non parte");
  });
});

// ------------------------------------------------------------------------------- il modo caso

describe("il modo caso: le letture prendono le voci del caso, e alla fine c'è l'esito", () => {
  const casoDelRiferimento = riferimento.test_cases![0]!;
  /** Fino alla fine dando `comando` a ogni pausa, senza mai scrivere una riga: le pause e gli stati attraversati. */
  function soloComandi(e: Esecuzione, comando: Comando): { pause: string[]; stati: Set<string> } {
    const pause: string[] = [];
    const stati = new Set<string>();
    for (let giri = 0; giri < 3 * tettoDeiPassi; giri++) {
      const s = e.stato;
      stati.add(s.genere);
      if (s.genere === "finita" || s.genere === "non parte" || s.genere === "chiede") return { pause, stati };
      if (s.genere === "pausa") pause.push(nomeDellaPausa(s));
      if (s.genere !== "in corso") e.comanda(comando);
      e.fetta(nessunaAttesa, Infinity);
    }
    throw new Error("l'esecuzione non finisce");
  }
  const caso = (inputs: [string, string][], expected: Json) => ({ name: "c", inputs: inputs.map(([data, text]) => ({ data, text })), expected });
  const a = { name: "a", type: "integer", role: "input" };
  const b = { name: "b", type: "integer", role: "input" };
  const leggiAB = [
    { id: "b1", kind: "read", target: "a" },
    { id: "b2", kind: "read", target: "b" },
    { id: "b3", kind: "write", values: ["a + b"], newline: false },
  ];
  const conCaso = (data: Json[], body: Json[], c: Json, comando: Comando = "sopra") => {
    const p = progetto(data, body, [c]);
    const e = new Esecuzione(p, tetti, { caso: p.test_cases![0]! });
    return { e, ...soloComandi(e, comando) };
  };

  test("non chiede mai una riga: le pause sono quelle senza caso, le voci sono righe «letto» della console, l'esito è raggiunto", () => {
    const e = new Esecuzione(riferimento, tetti, { caso: casoDelRiferimento });
    const { pause, stati } = soloComandi(e, "sopra");
    expect(differenze(pause, sequenzaAttesa)).toEqual([]);
    // Mai una richiesta; gli stati visti fra un comando e l'altro sono quelli di un'esecuzione senza letture.
    expect([...stati].sort()).toEqual(["finita", "pausa", "pronta"]);
    expect(e.console.filter((v) => v.genere !== "scrive")).toEqual(inputDelRiferimento.map((t, i) => ({ genere: "letto", dato: i < 2 ? "n" : "voto", testo: t })));
    expect(scritto(e)).toBe(casoDelRiferimento.expected.output);
    expect(e.esito).toMatchObject({ fuoriTappa: false, raggiunto: true, differenze: [] });
    // La tabella ha le righe «letto» come alla console.
    expect(e.traccia.righe.filter((r) => r.letto !== undefined).map((r) => r.letto)).toEqual(inputDelRiferimento);
  });

  test("i punti di interruzione e «continua» valgono come senza caso", () => {
    const e = new Esecuzione(riferimento, tetti, { caso: casoDelRiferimento });
    e.puntiDiInterruzione = new Set(["b10", "b21"]);
    expect(soloComandi(e, "continua").pause).toEqual(["b10", "b10", "b10", "b21", "b21", "b21", "b21", "b21", "b21"]);
    expect(e.esito).toMatchObject({ raggiunto: true });
  });

  test("una riga non valida è l'esito invalid_input sulla lettura, non una lettura richiesta", () => {
    const { e, stati } = conCaso([a, b], leggiAB, caso([["a", "1"], ["b", "due"], ["b", "2"]], { output: "", error: { code: "invalid_input", block: "b2" } }));
    expect(stati.has("chiede")).toBe(false);
    expect(e.stato).toEqual({ genere: "finita", errore: { code: "invalid_input", block: "b2" } });
    expect(e.console).toEqual([
      { genere: "letto", dato: "a", testo: "1" },
      { genere: "nonValido", dato: "b", testo: "due" },
    ]);
    expect(e.esito).toMatchObject({ raggiunto: true });
  });

  test("una voce destinata a un altro dato: input_mismatch sulla lettura, senza leggerla, e la tabella chiude la riga", () => {
    const { e, pause } = conCaso([a, b], leggiAB, caso([["b", "1"]], { output: "", error: { code: "input_mismatch", block: "b1" } }));
    expect(pause).toEqual(["b1"]);
    expect(e.stato).toEqual({ genere: "finita", errore: { code: "input_mismatch", block: "b1" } });
    expect(e.console).toEqual([]);
    expect(e.traccia.righe.map((r) => `${r.numero} ${r.blocco} ${r.letto ?? "-"}`)).toEqual(["1 b1 -"]);
    expect(e.esito).toMatchObject({ raggiunto: true });
  });

  test("voci finite: input_exhausted dall'interprete, sulla lettura senza voce", () => {
    const { e } = conCaso([a, b], leggiAB, caso([["a", "1"]], { output: "", error: { code: "input_exhausted", block: "b2" } }));
    expect(e.stato).toEqual({ genere: "finita", errore: { code: "input_exhausted", block: "b2" } });
    expect(e.esito).toMatchObject({ raggiunto: true });
  });

  test("voci avanzate: unused_inputs sul blocco di fine, solo a fine normale", () => {
    const avanzi = conCaso([a, b], leggiAB, caso([["a", "1"], ["b", "2"], ["a", "3"]], { output: "3", error: { code: "unused_inputs", block: "fine" } }));
    expect(avanzi.e.stato).toEqual({ genere: "finita", errore: { code: "unused_inputs", block: "fine" } });
    expect(avanzi.e.esito).toMatchObject({ raggiunto: true });
    // Fermata da un errore: le voci rimaste non contano.
    const divide = [{ id: "b1", kind: "read", target: "a" }, { id: "b2", kind: "write", values: ["10 / a"], newline: false }];
    const errore = conCaso([a], divide, caso([["a", "0"], ["a", "5"]], { output: "", error: { code: "division_by_zero", block: "b2" } }));
    expect(errore.e.stato).toEqual({ genere: "finita", errore: { code: "division_by_zero", block: "b2" } });
  });

  // Le procedure e le funzioni si eseguono: l'esecuzione arriva all'esito del caso di ogni file della tappa 3 del corpus
  // (l'interprete parte, tranne dove il caso attende un errore statico); un generatore lo genera, o lo rifiuta per
  // l'errore statico, mai con un'eccezione.
  test("ogni progetto della tappa 3 si esegue fino all'esito atteso, e i generatori lo traducono se non ha errori statici", () => {
    const tre = readdirSync(join(cartella, "tappa-3")).filter((f) => f.endsWith(".algo"));
    let conRisultato = 0;
    for (const f of tre) {
      const p = apriFile(`tappa-3/${f.slice(0, -".algo".length)}`);
      const caso = p.test_cases![0]!;
      const primo = esegui(p, tetti).next();
      const e = new Esecuzione(p, tetti, { caso });
      soloComandi(e, "continua");
      expect({
        f,
        controllo: controlla(p, tetti).fuoriTappa,
        raggiunto: e.esito?.fuoriTappa === false && e.esito.raggiunto,
        interprete: !primo.done || primo.value.parte,
        generato: genera(p, tetti, () => []),
      }).toEqual({
        f,
        controllo: false,
        raggiunto: true,
        interprete: caso.expected.static_error === undefined,
        // Anche una funzione che restituisce una stringa o un vettore.
        generato: caso.expected.static_error !== undefined ? { generato: false, perche: "errori-statici" } : { generato: true, righe: [] },
      });
      if (p.functions.some((f) => f.kind === "function" && (f.return_type === "string" || f.return_size !== undefined))) conRisultato++;
    }
    console.log(`la tappa 3: ${tre.length} progetti, ${conRisultato} con una stringa o un vettore restituiti`);
    expect([tre.length, conRisultato]).toEqual([54, 16]);
  });

  test("un progetto che non parte e uno fuori tappa: l'esito c'è subito", () => {
    const statico = new Esecuzione(progetto([], [{ id: "b1", kind: "write", values: ["y"], newline: false }], [caso([], { output: "" })]), tetti, { caso: caso([], { output: "" }) });
    expect(statico.stato.genere).toBe("non parte");
    expect(statico.esito).toMatchObject({ raggiunto: false, differenze: [{ campo: "static_error", atteso: "nessuno", ottenuto: "unknown_name@b1" }] });
    // Fuori tappa con un controllo dato che lo dice (quello dell'interfaccia per la ricorsione): il nucleo la esegue.
    const ricorsiva = apriFile("tappa-4/ricorsione-profonda");
    const fuori = new Esecuzione(ricorsiva, tetti, { caso: caso([], { output: "" }), controllo: { fuoriTappa: true, blocchi: ["b4"] } });
    expect(fuori.esito).toEqual({ fuoriTappa: true });
    expect(new Esecuzione(ricorsiva, tetti, { caso: caso([], { output: "" }) }).stato.genere).toBe("pronta");
  });

  test("senza la tabella di traccia: nessuna riga, e lo stesso esito, le stesse pause e la stessa console", () => {
    const corsa = (tabella: boolean) => {
      const e = new Esecuzione(riferimento, tetti, { caso: casoDelRiferimento, tabella });
      const { pause } = soloComandi(e, "sopra");
      return { e, pause };
    };
    const con = corsa(true);
    const senza = corsa(false);
    expect({ righe: senza.e.traccia.righe.length, tolte: senza.e.traccia.tolte }).toEqual({ righe: 0, tolte: 0 });
    expect({ esito: senza.e.esito, pause: senza.pause, console: senza.e.console }).toEqual({ esito: con.e.esito, pause: con.pause, console: con.e.console });
    // Controllo positivo: con la tabella le righe ci sono.
    expect(con.e.traccia.righe.length).toBe(65);
  });

  test("l'output: senza caso nessun esito; col caso si tiene fino all'atteso più il margine, e l'esito arriva solo alla fine", () => {
    const n = { name: "n", type: "integer", initial: "0" };
    const scrive = [{ id: "b1", kind: "while", condition: "n < 3000", body: [{ id: "b2", kind: "write", values: ['"x"'], newline: false }, { id: "b3", kind: "assignment", target: "n", value: "n + 1" }] }];
    const libera = new Esecuzione(progetto([n], scrive), tetti);
    soloComandi(libera, "continua");
    expect({ stato: libera.stato.genere, esito: libera.esito }).toEqual({ stato: "finita", esito: undefined });
    const c = progetto([n], scrive, [caso([], { output: "xx" })]);
    const e = new Esecuzione(c, tetti, { caso: c.test_cases![0]! });
    expect(e.esito).toBeUndefined();
    e.comanda("sopra");
    e.fetta(nessunaAttesa, Infinity);
    expect(e.esito).toBeUndefined();
    soloComandi(e, "continua");
    const esito = e.esito;
    expect(esito?.fuoriTappa === false && { raggiunto: esito.raggiunto, tenuto: esito.ottenuto.output.length, tagliato: esito.differenze[0]?.tagliato }).toEqual({ raggiunto: false, tenuto: 1002, tagliato: true });
  });

  test("sul corpus la riga di comando e l'esecuzione passo passo danno lo stesso esito, campo per campo", () => {
    let casi = 0;
    const diversi: string[] = [];
    const esiti = new Map<string, number>();
    for (const f of readdirSync(join(cartella, "tappa-1")).filter((x) => x.endsWith(".algo"))) {
      const p = apriFile(`tappa-1/${f.slice(0, -5)}`);
      for (const c of p.test_cases ?? []) {
        casi++;
        const riga = eseguiCaso(p, c, tetti);
        const e = new Esecuzione(p, tetti, { caso: c });
        soloComandi(e, "sopra");
        if (JSON.stringify(e.esito) !== JSON.stringify(riga)) diversi.push(`${f}#${c.name}: ${JSON.stringify(e.esito)} | ${JSON.stringify(riga)}`);
        const livello = riga.fuoriTappa ? "fuori tappa" : riga.raggiunto ? "raggiunto" : "non raggiunto";
        esiti.set(livello, (esiti.get(livello) ?? 0) + 1);
      }
    }
    console.log(`un esecutore sul corpus: casi ${casi}, esiti ${JSON.stringify(Object.fromEntries(esiti))}, diversi ${diversi.length}`);
    expect(diversi).toEqual([]);
    expect({ casi, raggiunti: esiti.get("raggiunto") }).toEqual({ casi: 63, raggiunti: 63 });
    // Il limite esplicito, quattro volte la durata più lunga misurata, arrotondato ai 30 s: 5,35 s misurati nella corsa
    // intera, oltre i 5 predefiniti; da sola meno.
  }, 30_000);

  test("un blocco del riferimento cambiato: il caso non è raggiunto, con le stesse differenze dalla riga di comando e passo passo", () => {
    // La media calcolata con un'unità in più, nel blocco che la calcola.
    const testo = JSON.stringify(riferimento);
    const alterato = JSON.parse(testo.replace('"to_real somma / to_real contati"', '"to_real somma / to_real contati + 1.0"')) as Progetto;
    expect(JSON.stringify(alterato)).not.toBe(testo);
    const passoPasso = (p: Progetto) => {
      const e = new Esecuzione(p, tetti, { caso: casoDelRiferimento });
      soloComandi(e, "sopra");
      return e.esito;
    };
    const riga = eseguiCaso(alterato, casoDelRiferimento, tetti);
    expect(riga).toMatchObject({ raggiunto: false });
    expect(!riga.fuoriTappa && riga.differenze.map((d) => d.campo)).toEqual(["output"]);
    expect(passoPasso(alterato)).toEqual(riga);
    // Controllo positivo: il programma giusto torna raggiunto nei due.
    expect([eseguiCaso(riferimento, casoDelRiferimento, tetti), passoPasso(riferimento)]).toMatchObject([{ raggiunto: true }, { raggiunto: true }]);
  });
});

// ------------------------------------------------------------------------------- gli aiuti

type Json = any;
function progetto(data: Json[], body: Json[], test_cases?: Json[]): Progetto {
  const esito = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }],
    ...(test_cases ? { test_cases } : {}),
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
