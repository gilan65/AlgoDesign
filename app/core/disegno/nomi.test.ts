// I nomi dei dati nel testo dei blocchi e il loro posto nel disegno (`nomi.ts`): ciò su cui si porta il puntatore
// per il watch. Il testo e la sua misura non cambiano: i posti si ricavano dalle righe che l'impaginazione ha già
// misurato.
//
// - Casi scritti a mano, con una misura di 10 px per carattere: un'assegnazione, una lettura, una scrittura con un
//   nome anche dentro un letterale (lì non è un nome), una condizione su due righe, gli operatori a parola tradotti.
// - Sul corpus della tappa 1 e su 300 alberi generati, nelle due lingue e nelle due forme delle condizioni lunghe:
//   ogni posto sta nel riquadro del testo, il testo della riga in quel posto è il nome del dato, e i nomi di ogni
//   blocco sono tanti quanti i nomi dei dati nelle sue espressioni lette dal file (senza traduzione né righe:
//   un conteggio fatto per un'altra via).
// - L'intestazione di un ciclo `per` e `per ogni` e i blocchi del suo corpo, a mano: i nomi dell'intestazione sopra le
//   sue lettere, e quelli dei blocchi che il riquadro aggiunge sopra le loro, sotto l'`id` del ciclo (la posizione non è
//   un dato); sul corpus della tappa 2 e su alberi generati coi cicli, nelle tre forme, ogni nome sulle sue lettere in un
//   blocco del ciclo, e quanti sono contati sul file con la regola delle forme (quante volte il disegno ripete ogni campo).
// - Il blocco del valore iniziale di un dato: a mano il nome del dato (un intero, un vettore con l'elenco e col valore
//   ripetuto nelle due forme, una costante, una costante comune, un valore sbagliato con un nome dentro); sul corpus
//   ogni blocco ha il nome del suo dato sulle sue lettere.
//
// Che cosa NON guarda:
// - la misura vera del carattere: qui quella per carattere; nei motori il posto del nome si prova col puntatore
//   vero (`e2e/watch.e2e.ts`);
// - il valore mostrato dal watch: `ui/esecuzione/watch.test.tsx`;
// - i blocchi fuori tappa: l'impaginazione non li disegna.

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parole } from "../espressioni/analizzatore";
import { apri } from "../progetto/formato";
import type { Blocco, Dato, Funzione } from "../progetto/modello";
import { alberoGenerato } from "./alberi-di-prova";
import { impagina, opzioniPredefinite, testoDelValoreIniziale, type CondizioniLunghe, type Disegno, type FormeDeiCicli, type Rettangolo, type TestiDelDisegno, type ValoreRipetuto } from "./impaginazione";
import { traduciEspressione, type NomiDegliOperatori } from "./lingua";
import { nomiDeiValoriIniziali, nomiDelDisegno, nomiDelValoreIniziale } from "./nomi";
import { geometriaPredefinita } from "./tema";
import { cicliIt, funzioniIt } from "../esecuzione/testi-di-prova";
import { nomiDegliOperatori } from "../../i18n/operatori";

const tema = geometriaPredefinita;
const misura = (t: string) => [...t].length * 10;
const testiIt: TestiDelDisegno = { inizio: "Inizio", fine: "Fine", leggi: "leggi", scrivi: "scrivi", vero: "Vero", falso: "Falso", aCapo: " ↵", ogniElemento: "{valore} in ogni elemento", altri: "… altri {n}", cicli: cicliIt, funzioni: funzioniIt };
const conOperatori = (nomi: NomiDegliOperatori): TestiDelDisegno => ({ ...testiIt, espressione: (t) => traduciEspressione(t, nomi) });

const funzione = (data: string[], body: unknown[]): Funzione => ({ id: "f1", kind: "main", data: data.map((name) => ({ name, type: "integer" })), body, end: { id: "fine" } }) as unknown as Funzione;

/** I nomi del blocco col riquadro del suo testo: i posti relativi all'angolo del testo. */
function nomiDi(f: Funzione, id: string, testi = testiIt, condizioni: CondizioniLunghe = "su-due-righe") {
  const d = impagina(f, tema, misura, testi, { ...opzioniPredefinite, condizioniLunghe: condizioni });
  // Di un ciclo, l'intestazione.
  const e = d.elementi.find((x) => x.id === id && x.fase === undefined)!;
  const t = e.riquadroTesto;
  const dati = new Set(f.data.map((x) => x.name));
  return {
    righe: e.righe,
    nomi: (nomiDelDisegno(d, f, tema, misura, testi, opzioniPredefinite, dati, []).get(id) ?? []).filter((n) => dentro(n.riquadro, t)).map((n) => ({
      dato: n.dato,
      x: n.riquadro.x - t.x,
      y: n.riquadro.y - t.y,
      larghezza: n.riquadro.larghezza,
      altezza: n.riquadro.altezza,
    })),
  };
}

// ------------------------------------------------------------------------------------ a mano

test("un ciclo per e un per ogni: i nomi dell'intestazione sopra le sue lettere, e quelli dei blocchi del corpo", () => {
  const f = funzione(
    ["i", "n", "x", "v"],
    [
      { id: "b1", kind: "for", counter: "i", from: "1", to: "n", body: [{ id: "b2", kind: "write", values: ["x"], newline: false }] },
      { id: "b3", kind: "for_each", item: "x", source: "v", body: [{ id: "b4", kind: "read", target: "n" }] },
    ],
  );
  // «per i da 1 a n»: «i» da 4, «n» da 13; «per ogni x in v»: «x» da 9, «v» da 14.
  expect(nomiDi(f, "b1").nomi).toEqual([
    { dato: "i", x: 40, y: 0, larghezza: 10, altezza: 19 },
    { dato: "n", x: 130, y: 0, larghezza: 10, altezza: 19 },
  ]);
  expect(nomiDi(f, "b3").nomi).toEqual([
    { dato: "x", x: 90, y: 0, larghezza: 10, altezza: 19 },
    { dato: "v", x: 140, y: 0, larghezza: 10, altezza: 19 },
  ]);
  // Nel corpo: «scrivi x», «leggi n».
  expect(nomiDi(f, "b2").nomi.map((n) => [n.dato, n.x])).toEqual([["x", 70]]);
  expect(nomiDi(f, "b4").nomi.map((n) => [n.dato, n.x])).toEqual([["n", 60]]);
  // I blocchi che il riquadro aggiunge hanno l'id del ciclo: sotto quell'id anche i loro nomi, ognuno sulle sue lettere
  // (la posizione «_indice» non è un dato). Qui `v` non è un vettore: il controllo dice la lunghezza.
  const d = impagina(f, tema, misura, testiIt);
  const tutti = nomiDelDisegno(d, f, tema, misura, testiIt, opzioniPredefinite, new Set(["i", "n", "x", "v"]), []);
  const perFase = (id: string) =>
    Object.fromEntries(
      d.elementi
        .filter((e) => e.id === id && e.fase !== undefined)
        .map((e) => [e.fase, { testo: e.testo, nomi: (tutti.get(id) ?? []).filter((n) => dentro(n.riquadro, e.riquadroTesto)).map((n) => [n.dato, n.riquadro.x - e.riquadroTesto.x]) }]),
    );
  expect(perFase("b1")).toEqual({
    inizio: { testo: "i ← 1", nomi: [["i", 0]] },
    condizione: { testo: "i <= n", nomi: [["i", 0], ["n", 50]] },
    passo: { testo: "i ← i + 1", nomi: [["i", 0], ["i", 40]] },
  });
  expect(perFase("b3")).toEqual({
    inizio: { testo: "_indice ← 0", nomi: [] },
    condizione: { testo: "_indice < length v", nomi: [["v", 170]] },
    elemento: { testo: "x ← v[_indice]", nomi: [["x", 0], ["v", 40]] },
    passo: { testo: "_indice ← _indice + 1", nomi: [] },
  });
  // In tutto: due nell'intestazione e cinque nei blocchi aggiunti del `per`; due e tre nel `per ogni`.
  expect([tutti.get("b1")?.length, tutti.get("b3")?.length]).toEqual([7, 5]);
});

test("un salto e una condizione col nome di una funzione in grassetto: i nomi dei dati dopo i pezzi con lo stile, misurati col loro stile", () => {
  // 10 px per carattere, 12 in grassetto: un nome dopo un grassetto misurato come normale cadrebbe più a sinistra.
  const conStile = (t: string, stile?: "grassetto" | "corsivo") => [...t].length * (stile === "grassetto" ? 12 : 10);
  const principale = funzione(
    ["n", "voto"],
    [
      { id: "b1", kind: "call", callee: "leggi_numero", arguments: ["n"] },
      { id: "b2", kind: "if", condition: "valido(voto) and voto > 0", then: [], else: [] },
    ],
  );
  const leggi: Funzione = { id: "f2", kind: "procedure", name: "leggi_numero", data: [{ name: "numero", type: "integer", parameter: "reference" }], body: [], end: { id: "f2fine" } };
  const valido: Funzione = { id: "f3", kind: "function", name: "valido", return_type: "boolean", data: [{ name: "v", type: "integer", parameter: "value" }], body: [], end: { id: "f3fine", return_value: "v > 0" } };
  const opzioni = { ...opzioniPredefinite, condizioniLunghe: "su-una-riga" } as const;
  const d = impagina(principale, tema, conStile, testiIt, opzioni, [], [principale, leggi, valido]);
  const nomi = nomiDelDisegno(d, principale, tema, conStile, testiIt, opzioni, new Set(["n", "voto"]), []);
  const relativi = (id: string) => {
    const t = d.elementi.find((e) => e.id === id)!.riquadroTesto;
    return (nomi.get(id) ?? []).map((n) => [n.dato, n.riquadro.x - t.x, n.riquadro.larghezza]);
  };
  // «↪ leggi_numero(rif n)»: «↪ » 20, «leggi_numero» in grassetto 144, «(» 10, «rif» 30, « » 10: «n» da 214.
  expect(d.elementi.find((e) => e.id === "b1")!.testo).toBe("↪ leggi_numero(rif n)");
  expect(relativi("b1")).toEqual([["n", 214, 10]]);
  // «valido(voto) and voto > 0»: «valido» in grassetto 72, «(» 10: «voto» da 82; poi «voto) and » 100: «voto» da 182.
  expect(relativi("b2")).toEqual([
    ["voto", 82, 40],
    ["voto", 182, 40],
  ]);
});

test("il nome di una funzione chiamata: segnato come chiamata, sopra le sue lettere in grassetto; senza le funzioni, nessuno", () => {
  const conStile = (t: string, stile?: "grassetto" | "corsivo") => [...t].length * (stile === "grassetto" ? 12 : 10);
  const principale = funzione(["voto"], [{ id: "b2", kind: "if", condition: "valido(voto) and voto > 0", then: [], else: [] }]);
  const valido: Funzione = { id: "f3", kind: "function", name: "valido", return_type: "boolean", data: [{ name: "v", type: "integer", parameter: "value" }], body: [], end: { id: "f3fine", return_value: "v > 0" } };
  const opzioni = { ...opzioniPredefinite, condizioniLunghe: "su-una-riga" } as const;
  const d = impagina(principale, tema, conStile, testiIt, opzioni, [], [principale, valido]);
  const t = d.elementi.find((e) => e.id === "b2")!.riquadroTesto;
  const relativi = (funzioni?: ReadonlySet<string>) =>
    (nomiDelDisegno(d, principale, tema, conStile, testiIt, opzioni, new Set(["voto"]), [], funzioni).get("b2") ?? []).map((n) => [n.dato, n.riquadro.x - t.x, n.riquadro.larghezza, n.chiamata === true]);
  // «valido» in grassetto: da 0, largo 72; poi i due «voto» come prima.
  expect(relativi(new Set(["valido"]))).toEqual([
    ["valido", 0, 72, true],
    ["voto", 82, 40, false],
    ["voto", 182, 40, false],
  ]);
  expect(relativi()).toEqual([
    ["voto", 82, 40, false],
    ["voto", 182, 40, false],
  ]);
});

test("la copia espansa di un vettore col suo nome: i nomi dell'intestazione e dei blocchi aggiunti, sotto l'id dell'assegnazione", () => {
  const f: Funzione = {
    id: "f1",
    kind: "main",
    data: [
      { name: "v", type: "integer", size: 3 },
      { name: "w", type: "integer", size: 3 },
    ],
    body: [{ id: "b1", kind: "assignment", target: "w", value: "v" }],
    end: { id: "fine" },
  };
  const forme: FormeDeiCicli = { per: "aperto", perOgni: "posizione", copia: "espansa" };
  const d = impagina(f, tema, misura, testiIt, { ...opzioniPredefinite, ...forme });
  const tutti = nomiDelDisegno(d, f, tema, misura, testiIt, forme, new Set(["v", "w"]), []);
  const sopra = (e: { riquadroTesto: Rettangolo }) => (tutti.get("b1") ?? []).filter((n) => dentro(n.riquadro, e.riquadroTesto)).map((n) => [n.dato, n.riquadro.x - e.riquadroTesto.x]);
  const intestazione = d.elementi.find((e) => e.id === "b1" && e.fase === undefined)!;
  // «w ← v: copia elemento per elemento»: «w» da 0, «v» da 40.
  expect([intestazione.testo, sopra(intestazione)]).toEqual(["w ← v: copia elemento per elemento", [["w", 0], ["v", 40]]]);
  const perFase = Object.fromEntries(d.elementi.filter((e) => e.id === "b1" && e.fase !== undefined).map((e) => [e.fase, [e.testo, sopra(e)]]));
  // «w[_indice] ← v[_indice]»: «w» da 0, «v» da 130.
  expect(perFase).toEqual({
    inizio: ["_indice ← 0", []],
    condizione: ["_indice < 3", []],
    elemento: ["w[_indice] ← v[_indice]", [["w", 0], ["v", 130]]],
    passo: ["_indice ← _indice + 1", []],
  });
  expect(tutti.get("b1")?.length).toBe(4);
});

/** Un rettangolo dentro un altro. */
const dentro =(r: Rettangolo, t: Rettangolo) => r.x >= t.x - 1e-9 && r.x + r.larghezza <= t.x + t.larghezza + 1e-9 && r.y >= t.y - 1e-9 && r.y + r.altezza <= t.y + t.altezza + 1e-9;

test("un'assegnazione: i tre nomi, ognuno sopra le sue lettere", () => {
  const f = funzione(["somma", "voto"], [{ id: "b1", kind: "assignment", target: "somma", value: "somma + voto" }]);
  // «somma ← somma + voto»: 20 caratteri, 200 px; «somma» da 0, «somma» da 8, «voto» da 16.
  expect(nomiDi(f, "b1").nomi).toEqual([
    { dato: "somma", x: 0, y: 0, larghezza: 50, altezza: 19 },
    { dato: "somma", x: 80, y: 0, larghezza: 50, altezza: 19 },
    { dato: "voto", x: 160, y: 0, larghezza: 40, altezza: 19 },
  ]);
});

test("una lettura e una scrittura: la parola davanti non è un nome, e un nome dentro un letterale nemmeno", () => {
  const f = funzione(
    ["somma", "leggi"],
    [
      { id: "b1", kind: "read", target: "leggi" },
      { id: "b2", kind: "write", values: ['"somma: "', "somma"], newline: true },
    ],
  );
  // «leggi leggi»: la parola è del disegno, il secondo «leggi» è il dato.
  expect(nomiDi(f, "b1").nomi).toEqual([{ dato: "leggi", x: 60, y: 0, larghezza: 50, altezza: 19 }]);
  // «scrivi "somma: ", somma ↵»: il nome fuori dal letterale comincia al carattere 18.
  expect(nomiDi(f, "b2").nomi).toEqual([{ dato: "somma", x: 180, y: 0, larghezza: 50, altezza: 19 }]);
});

test("una condizione su due righe: ogni nome nella sua riga, centrata", () => {
  const f = funzione(["voto", "somma"], [{ id: "b1", kind: "if", condition: "voto >= 1 and voto <= 10 and somma > 0", then: [], else: [] }]);
  const { righe, nomi } = nomiDi(f, "b1");
  // Il taglio più vicino al centro è il secondo «and»: righe di 24 e 13 caratteri, la seconda centrata (55 px).
  expect(righe).toEqual(["voto >= 1 and voto <= 10", "and somma > 0"]);
  expect(nomi).toEqual([
    { dato: "voto", x: 0, y: 0, larghezza: 40, altezza: 19 },
    { dato: "voto", x: 140, y: 0, larghezza: 40, altezza: 19 },
    { dato: "somma", x: 95, y: 19, larghezza: 50, altezza: 19 },
  ]);
  // Su una riga: gli stessi nomi, tutti nella prima.
  expect(nomiDi(f, "b1", testiIt, "su-una-riga").nomi.map((n) => [n.dato, n.x, n.y])).toEqual([
    ["voto", 0, 0],
    ["voto", 140, 0],
    ["somma", 290, 0],
  ]);
});

test("gli operatori a parola nella lingua dell'interfaccia: i nomi dopo un operatore tradotto stanno dove il testo li mostra", () => {
  const f = funzione(["media", "somma"], [{ id: "b1", kind: "assignment", target: "media", value: "to_real somma" }]);
  // «media ← converti_a_reale somma»: «somma» al carattere 25.
  expect(nomiDi(f, "b1", conOperatori(nomiDegliOperatori.it)).nomi.map((n) => [n.dato, n.x])).toEqual([
    ["media", 0],
    ["somma", 250],
  ]);
  // In inglese l'operatore è più corto: «media ← to_real somma», «somma» al carattere 16.
  expect(nomiDi(f, "b1", conOperatori(nomiDegliOperatori.en)).nomi.map((n) => [n.dato, n.x])).toEqual([
    ["media", 0],
    ["somma", 160],
  ]);
});

// ------------------------------------------------------------------------ corpus e alberi generati

function espressioniDi(b: Blocco): readonly string[] {
  return b.kind === "assignment" ? [b.target, b.value] : b.kind === "read" ? [b.target] : b.kind === "write" ? b.values : b.kind === "if" || b.kind === "while" || b.kind === "repeat" ? [b.condition] : [];
}
function blocchi(bs: readonly Blocco[]): Blocco[] {
  return bs.flatMap((b) => [b, ...(b.kind === "if" ? blocchi([...b.then, ...b.else]) : b.kind === "while" || b.kind === "repeat" ? blocchi(b.body) : [])]);
}

const cartella = join(import.meta.dir, "..", "..", "casi", "tappa-1");
const funzioni: { nome: string; funzione: Funzione; dati: Set<string> }[] = [
  ...readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((f) => {
      const esito = apri(readFileSync(join(cartella, f), "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      const main = esito.progetto.functions.find((x) => x.kind === "main")!;
      return { nome: f, funzione: main, dati: new Set([...(esito.progetto.shared_constants ?? []), ...main.data].map((d) => d.name)) };
    }),
  // Gli alberi generati non hanno dati: ogni nome che compare nei loro testi vale come un dato (tranne i nomi degli
  // operatori a parola, che sono riservati), così i nomi stanno anche dopo lettere accentate e fuori dal piano di base.
  ...Array.from({ length: 300 }, (_, i) => {
    const f = alberoGenerato(1000 + i);
    const riservati = new Set<string>([...Object.values(nomiDegliOperatori.it), ...Object.values(nomiDegliOperatori.en)]);
    const dati = new Set(
      blocchi(f.body)
        .flatMap(espressioniDi)
        .flatMap((e) => parole(e) ?? [])
        .filter((p) => p.genere === "nome" && !riservati.has(p.testo))
        .map((p) => p.testo),
    );
    return { nome: `generato-${i + 1}`, funzione: f, dati };
  }),
];

/** I nomi dei dati nelle espressioni di un blocco, contati sul testo del file con l'analizzatore. */
function nomiNelFile(b: Blocco, dati: ReadonlySet<string>): number {
  return espressioniDi(b).reduce((s, e) => s + (parole(e) ?? []).filter((p) => p.genere === "nome" && dati.has(p.testo)).length, 0);
}

test("su corpus e alberi generati, nelle due lingue e nelle due forme: ogni nome nel riquadro del testo, sulle sue lettere, e quanti sono nel file", () => {
  const difetti: string[] = [];
  let nomi = 0;
  let disegni = 0;
  let suDueRighe = 0;
  for (const lingua of ["it", "en"] as const)
    for (const condizioni of ["su-due-righe", "su-una-riga"] as const)
      for (const { nome, funzione: f, dati } of funzioni) {
        const testi = conOperatori(nomiDegliOperatori[lingua]);
        const d: Disegno = impagina(f, tema, misura, testi, { ...opzioniPredefinite, condizioniLunghe: condizioni });
        disegni++;
        const tutti = nomiDelDisegno(d, f, tema, misura, testi, opzioniPredefinite, dati, []);
        for (const b of blocchi(f.body)) {
          const e = d.elementi.find((x) => x.id === b.id);
          if (!e) continue;
          const mie = tutti.get(b.id) ?? [];
          nomi += mie.length;
          if (mie.length !== nomiNelFile(b, dati)) difetti.push(`${nome} ${lingua} ${condizioni} ${b.id}: ${mie.length} nomi, nel file ${nomiNelFile(b, dati)}`);
          const t = e.riquadroTesto;
          for (const n of mie) {
            const r = n.riquadro;
            if (r.x < t.x - 1e-9 || r.x + r.larghezza > t.x + t.larghezza + 1e-9 || r.y < t.y - 1e-9 || r.y + r.altezza > t.y + t.altezza + 1e-9)
              difetti.push(`${nome} ${b.id} «${n.dato}» fuori dal riquadro del testo`);
            // Con 10 px per carattere il posto dice la riga e il carattere: lì c'è il nome.
            const k = Math.round((r.y - t.y) / tema.altezzaRiga);
            const riga = e.righe[k] ?? "";
            if (k > 0) suDueRighe++;
            const inizio = (r.x - (t.x + t.larghezza / 2 - misura(riga) / 2)) / 10;
            const visto = [...riga].slice(inizio, inizio + r.larghezza / 10).join("");
            if (visto !== n.dato) difetti.push(`${nome} ${b.id}: nel posto di «${n.dato}» c'è «${visto}»`);
          }
        }
      }
  console.log(`nomi: ${nomi} in ${disegni} disegni (${funzioni.length} alberi × 2 lingue × 2 forme), ${suDueRighe} nella seconda riga di una condizione`);
  expect(difetti.slice(0, 10)).toEqual([]);
  // Le premesse: molti nomi, e qualcuno nella seconda riga.
  expect(nomi).toBeGreaterThan(1000);
  expect(suDueRighe).toBeGreaterThan(0);
});

/** I blocchi di un albero, anche dentro i cicli `per` e `per ogni`. */
function conICicli(bs: readonly Blocco[]): Blocco[] {
  return bs.flatMap((b) => [b, ...(b.kind === "if" ? conICicli([...b.then, ...b.else]) : "body" in b ? conICicli(b.body) : [])]);
}
const nomiIn = (e: string, dati: ReadonlySet<string>) => (parole(e) ?? []).filter((p) => p.genere === "nome" && dati.has(p.testo)).length;

/** Quanti nomi di dati il disegno mostra per un ciclo, contati sul file: l'intestazione ha ogni campo una volta; il `per`
 * aperto ripete il contatore nella partenza, nel controllo e due volte nell'aumento, l'inizio nella partenza e la fine
 * nel controllo; il `per ogni` con la posizione ripete l'elemento e la sorgente nell'elemento preso, e la sorgente nel
 * controllo se è una stringa (la lunghezza); a parole la sorgente nel controllo e nell'elemento, l'elemento in questo. */
function nomiDelCicloNelFile(b: Extract<Blocco, { kind: "for" | "for_each" }>, forme: FormeDeiCicli, f: Funzione, dati: ReadonlySet<string>): number {
  if (b.kind === "for") {
    const [c, da, a] = [nomiIn(b.counter, dati), nomiIn(b.from, dati), nomiIn(b.to, dati)];
    return forme.per === "chiuso" ? c + da + a : 5 * c + 2 * da + 2 * a;
  }
  const [x, s] = [nomiIn(b.item, dati), nomiIn(b.source, dati)];
  if (forme.perOgni === "chiuso") return x + s;
  if (forme.perOgni === "parole") return 2 * x + 3 * s;
  return 2 * x + (f.data.find((d) => d.name === b.source)?.size !== undefined ? 2 : 3) * s;
}

test("i cicli, sul corpus della tappa 2 e su alberi generati coi cicli, nelle tre forme: ogni nome sulle sue lettere in un blocco del ciclo, e quanti sono nel file", () => {
  const cartella2 = join(import.meta.dir, "..", "..", "casi", "tappa-2");
  const alberi: { nome: string; funzione: Funzione; dati: Set<string> }[] = [
    ...readdirSync(cartella2)
      .filter((f) => f.endsWith(".algo"))
      .map((f) => {
        const esito = apri(readFileSync(join(cartella2, f), "utf8"));
        if (!esito.ok) throw new Error(`${f} non si apre`);
        const main = esito.progetto.functions.find((x) => x.kind === "main")!;
        return { nome: f, funzione: main, dati: new Set(main.data.map((d) => d.name)) };
      }),
    // Come sopra, ogni nome dei testi vale come un dato; qui anche i campi dei cicli.
    ...Array.from({ length: 100 }, (_, i) => {
      const f = alberoGenerato(5000 + i, true);
      const riservati = new Set<string>([...Object.values(nomiDegliOperatori.it), ...Object.values(nomiDegliOperatori.en)]);
      const campi = (b: Blocco) => (b.kind === "for" ? [b.counter, b.from, b.to] : b.kind === "for_each" ? [b.item, b.source] : espressioniDi(b));
      const dati = new Set(
        conICicli(f.body)
          .flatMap(campi)
          .flatMap((e) => parole(e) ?? [])
          .filter((p) => p.genere === "nome" && !riservati.has(p.testo))
          .map((p) => p.testo),
      );
      return { nome: `generato-${i + 1}`, funzione: f, dati };
    }),
  ];
  const difetti: string[] = [];
  const conti = { cicli: 0, nomi: 0, neiBlocchiAggiunti: 0 };
  const tutteLeForme: FormeDeiCicli[] = [
    { per: "aperto", perOgni: "posizione", copia: "espansa" },
    { per: "aperto", perOgni: "parole", copia: "compatta" },
    { per: "chiuso", perOgni: "chiuso", copia: "compatta" },
  ];
  for (const lingua of ["it", "en"] as const)
    for (const forme of tutteLeForme)
      for (const { nome, funzione: f, dati } of alberi) {
        const testi = conOperatori(nomiDegliOperatori[lingua]);
        const d = impagina(f, tema, misura, testi, { ...opzioniPredefinite, ...forme });
        const tutti = nomiDelDisegno(d, f, tema, misura, testi, forme, dati, []);
        for (const b of conICicli(f.body)) {
          if (b.kind !== "for" && b.kind !== "for_each") continue;
          conti.cicli++;
          const mie = tutti.get(b.id) ?? [];
          conti.nomi += mie.length;
          const attesi = nomiDelCicloNelFile(b, forme, f, dati);
          if (mie.length !== attesi) difetti.push(`${nome} ${lingua} ${forme.per}/${forme.perOgni} ${b.id}: ${mie.length} nomi, nel file ${attesi}`);
          const forme_ = d.elementi.filter((x) => x.id === b.id && x.dato === undefined);
          for (const n of mie) {
            // L'elemento del ciclo che contiene il nome; con 10 px per carattere il posto dice il carattere: lì c'è il nome.
            const e = forme_.find((x) => dentro(n.riquadro, x.riquadroTesto));
            if (!e) {
              difetti.push(`${nome} ${b.id} «${n.dato}» fuori dai blocchi del ciclo`);
              continue;
            }
            if (e.fase !== undefined) conti.neiBlocchiAggiunti++;
            const t = e.riquadroTesto;
            const riga = e.righe[Math.round((n.riquadro.y - t.y) / tema.altezzaRiga)] ?? "";
            const inizio = (n.riquadro.x - (t.x + t.larghezza / 2 - misura(riga) / 2)) / 10;
            const visto = [...riga].slice(inizio, inizio + n.riquadro.larghezza / 10).join("");
            if (visto !== n.dato) difetti.push(`${nome} ${b.id}: nel posto di «${n.dato}» c'è «${visto}»`);
          }
        }
      }
  console.log(`nomi dei cicli: ${conti.nomi} in ${conti.cicli} cicli (${alberi.length} alberi × 2 lingue × 3 forme), nei blocchi aggiunti ${conti.neiBlocchiAggiunti}`);
  expect(difetti.slice(0, 10)).toEqual([]);
  // Le premesse: i cicli ci sono, e i blocchi aggiunti hanno nomi.
  expect(conti.cicli).toBeGreaterThan(500);
  expect(conti.neiBlocchiAggiunti).toBeGreaterThan(1000);
});

// ------------------------------------------------------------------------ i valori iniziali

/** I nomi del blocco del valore iniziale di un dato, coi posti relativi all'angolo del testo. */
function nomiDelValore(data: readonly Dato[], dato: string, ripetuto: ValoreRipetuto = "elenco", comuni: readonly Dato[] = []) {
  const f = { id: "f1", kind: "main", data, body: [], end: { id: "fine" } } as unknown as Funzione;
  const d = impagina(f, tema, misura, testiIt, { ...opzioniPredefinite, valoreRipetuto: ripetuto }, comuni);
  const e = d.elementi.find((x) => x.dato === dato)!;
  const t = e.riquadroTesto;
  const tutti = [...comuni, ...data];
  return (nomiDeiValoriIniziali(d, tutti, tema, misura, testiIt, ripetuto, new Set(tutti.map((x) => x.name))).get(dato) ?? []).map((n) => [n.dato, n.riquadro.x - t.x, n.riquadro.y - t.y, n.riquadro.larghezza]);
}

test("il blocco del valore iniziale: il nome del dato sopra le sue lettere, anche per un vettore, una costante e una costante comune", () => {
  // «somma ← 0»: il nome da 0, 50 px.
  expect(nomiDelValore([{ name: "somma", type: "integer", initial: "0" }], "somma")).toEqual([["somma", 0, 0, 50]]);
  // «voti ← {7, 4}» e «MAX ← 5»: un elenco e una costante; nessun nome dentro i letterali.
  const data: Dato[] = [
    { name: "voti", type: "integer", size: 2, initial: ["7", "4"] },
    { name: "MAX", type: "integer", constant: true, initial: "5" },
    { name: "nome", type: "string", initial: '"voti"' },
  ];
  expect(nomiDelValore(data, "voti")).toEqual([["voti", 0, 0, 40]]);
  expect(nomiDelValore(data, "MAX")).toEqual([["MAX", 0, 0, 30]]);
  expect(nomiDelValore(data, "nome")).toEqual([["nome", 0, 0, 40]]);
  // Il valore ripetuto, nelle due forme: «doppi ← 0 in ogni elemento» e «doppi ← {0, 0}».
  const doppi: Dato[] = [{ name: "doppi", type: "integer", size: 2, initial: { each: "0" } }];
  expect(nomiDelValore(doppi, "doppi", "un-valore")).toEqual([["doppi", 0, 0, 50]]);
  expect(nomiDelValore(doppi, "doppi", "elenco")).toEqual([["doppi", 0, 0, 50]]);
  // Una costante comune, disegnata per prima.
  expect(nomiDelValore([{ name: "x", type: "integer", initial: "0" }], "PASSO", "elenco", [{ name: "PASSO", type: "integer", constant: true, initial: "10" }])).toEqual([["PASSO", 0, 0, 50]]);
  // Un valore sbagliato si mostra com'è scritto: un nome dentro c'è («n ← k», col dato «k»).
  expect(nomiDelValore([{ name: "n", type: "integer", initial: "k" }, { name: "k", type: "integer" }], "n")).toEqual([
    ["n", 0, 0, 10],
    ["k", 40, 0, 10],
  ]);
});

test("sul corpus: ogni blocco del valore iniziale ha il nome del suo dato, sulle sue lettere, e le parti fanno il testo del blocco", () => {
  const difetti: string[] = [];
  let blocchiValore = 0;
  for (const { nome, funzione: f, dati } of funzioni.filter((x) => x.nome.endsWith(".algo") && x.funzione.data.some((d) => d.initial !== undefined)))
    for (const ripetuto of ["elenco", "un-valore"] as const) {
      const d = impagina(f, tema, misura, testiIt, { ...opzioniPredefinite, valoreRipetuto: ripetuto });
      const tutti = nomiDeiValoriIniziali(d, f.data, tema, misura, testiIt, ripetuto, dati);
      for (const e of d.elementi.filter((x) => x.dato !== undefined)) {
        blocchiValore++;
        const dato = f.data.find((x) => x.name === e.dato)!;
        const parti = nomiDelValoreIniziale(dato, testiIt, ripetuto, dati);
        if (e.testo !== testoDelValoreIniziale(dato, testiIt, ripetuto)) difetti.push(`${nome} ${e.dato}: testo del blocco diverso dal testo del nucleo`);
        const mie = tutti.get(e.dato!) ?? [];
        if (mie.length !== parti.length || mie[0]?.dato !== e.dato) difetti.push(`${nome} ${e.dato}: ${mie.map((n) => n.dato).join(",")}`);
        const t = e.riquadroTesto;
        for (const n of mie) {
          const inizio = (n.riquadro.x - (t.x + t.larghezza / 2 - misura(e.righe[0]!) / 2)) / 10;
          const visto = [...e.righe[0]!].slice(inizio, inizio + n.riquadro.larghezza / 10).join("");
          if (visto !== n.dato) difetti.push(`${nome} ${e.dato}: nel posto di «${n.dato}» c'è «${visto}»`);
        }
      }
    }
  console.log(`valori iniziali nel watch: ${blocchiValore} blocchi (due forme del valore ripetuto), difetti ${difetti.length}`);
  expect(difetti).toEqual([]);
  // La premessa: i 53 valori iniziali dei 32 file della tappa 1, nelle due forme.
  expect(blocchiValore).toBe(106);
});

// La copia espansa di un record (`b ← a`) e di una tabella (`u ← t`, coi campi nel ciclo dei record; `r ← t[1]`,
// `u[1] ← r`, `u[0] ← u[1]`): i nomi dei dati sopra le loro lettere nell'assegnazione di ogni campo, due per blocco, coi
// record del progetto. Controllo positivo: senza i record, il testo misurato è quello della fase senza il campo e
// qualche nome cade su altre lettere.
test("la copia espansa di un record e di una tabella: i nomi sulle loro lettere nell'assegnazione di ogni campo", () => {
  const cartella = join(import.meta.dir, "..", "..", "casi", "tipi");
  const conti = { blocchi: 0, nomi: 0, sbagliatiSenzaRecord: 0 };
  const difetti: string[] = [];
  for (const file of ["copia-di-un-record", "copia-di-una-tabella"]) {
    const a = apri(readFileSync(join(cartella, `${file}.algo`), "utf8"));
    if (!a.ok) throw new Error(`${file} non si apre`);
    const p = a.progetto;
    const f = p.functions.find((x) => x.kind === "main")!;
    const forme = { ...opzioniPredefinite, copia: "espansa" as const };
    const d = impagina(f, tema, misura, testiIt, forme, [], p.functions, p.records ?? []);
    const dati = new Set(f.data.map((x) => x.name));
    const posti = (records: Parameters<typeof nomiDelDisegno>[9]) => nomiDelDisegno(d, f, tema, misura, testiIt, forme, dati, [], undefined, records);
    const sbagliati = (tutti: ReturnType<typeof posti>, e: Disegno["elementi"][number]) =>
      (tutti.get(e.id) ?? [])
        .filter((n) => dentro(n.riquadro, e.riquadroTesto))
        .filter((n) => {
          const t = e.riquadroTesto;
          const inizio = (n.riquadro.x - (t.x + t.larghezza / 2 - misura(e.righe[0]!) / 2)) / 10;
          return [...e.righe[0]!].slice(inizio, inizio + n.riquadro.larghezza / 10).join("") !== n.dato;
        });
    const coi = posti(p.records ?? []);
    const senza = posti([]);
    for (const e of d.elementi.filter((x) => x.campo !== undefined)) {
      conti.blocchi++;
      const mie = (coi.get(e.id) ?? []).filter((n) => dentro(n.riquadro, e.riquadroTesto));
      conti.nomi += mie.length;
      if (mie.length !== 2) difetti.push(`${file} «${e.testo}»: ${mie.length} nomi`);
      for (const n of sbagliati(coi, e)) difetti.push(`${file} «${e.testo}»: «${n.dato}» non sulle sue lettere`);
      conti.sbagliatiSenzaRecord += sbagliati(senza, e).length;
    }
  }
  console.log(`la copia espansa coi campi: ${conti.blocchi} blocchi, ${conti.nomi} nomi; senza i record ${conti.sbagliatiSenzaRecord} fuori posto`);
  expect(difetti).toEqual([]);
  // Le premesse: i 3 campi di `b ← a`, poi i 3 di `u ← t` e i 3 di ognuna delle tre copie di un record della tabella.
  expect(conti.blocchi).toBe(15);
  expect(conti.sbagliatiSenzaRecord).toBeGreaterThan(0);
});
