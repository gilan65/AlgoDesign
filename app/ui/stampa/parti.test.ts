// Le parti della stampa senza il motore, sul programma di riferimento della tappa 3 (quattro funzioni; casi d'uso nel
// programma, in `valido` e in `stelle`): le parti piene, le sezioni nell'ordine con le intestazioni per tre combinazioni
// di scelte, le regole dei fogli (una per sezione, i sei riquadri occupati, il piè di pagina scelto), la nota dei
// flowchart ristretti. Gli attesi sono quelli scritti a mano prima del codice; i fogli del flowchart qui sono dati dalla
// prova (2 orizzontali per il programma principale, 1 verticale per le altre): quelli veri del nucleo li guarda la prova
// nel motore.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { geometriaPredefinita } from "../../core/disegno/tema";
import { apri } from "../../core/progetto/formato";
import type { Funzione, Progetto } from "../../core/progetto/modello";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { flowchartRistretti, funzioniDellaStampa, notaDeiRistretti, partiPiene, regoleDeiFogli, sceltePredefinite, sezioniDellaStampa, SPAZIO, type ScelteDiStampa } from "./parti";

const e = apri(readFileSync(fileURLToPath(new URL("../../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8"));
if (!e.ok) throw new Error("il riferimento della tappa 3 non si apre");
const P: Progetto = e.progetto;
const N = P.metadata.name;
const [main, leggi, valido, stelle] = P.functions as [Funzione, Funzione, Funzione, Funzione];
const fogliDi = (f: Funzione) => (f.kind === "main" ? { orizzontale: true, fogli: [{}, {}] } : { orizzontale: false, fogli: [{}] }) as never;
const tutteLeParti: ScelteDiStampa = { ...sceltePredefinite, parti: { progetto: true, dati: true, flowchart: true, casi: true } };
const vista = (s: readonly { parte: string; orizzontale: boolean; testa: string; destra: string; funzioni: readonly Funzione[] }[]) =>
  s.map((x) => [x.parte, x.orizzontale ? "o" : "v", x.testa, x.destra, x.funzioni.map((f) => f.name ?? "main").join(",")]);

test("le parti piene: tutte con tutte le funzioni; con solo `leggi_numero` i casi d'uso spenti; il progetto col solo nome spento", () => {
  expect(partiPiene(P, P.functions)).toEqual({ progetto: true, dati: true, flowchart: true, casi: true });
  expect(partiPiene(P, funzioniDellaStampa(P, leggi.id, false))).toEqual({ progetto: true, dati: true, flowchart: true, casi: false });
  const soloNome = { ...P, metadata: { name: N } };
  expect(partiPiene(soloNome, P.functions).progetto).toBe(false);
  // Controllo positivo: un autore di soli spazi non basta, uno vero sì.
  expect([partiPiene({ ...P, metadata: { name: N, author: "  " } }, []).progetto, partiPiene({ ...P, metadata: { name: N, author: "3ª B" } }, []).progetto]).toEqual([false, true]);
  expect(sceltePredefinite.parti).toEqual({ progetto: false, dati: false, flowchart: true, casi: false });
});

test("A: tutte le parti, tutte le funzioni, di seguito — progetto, dati, i fogli di ogni flowchart, casi d'uso", () => {
  const s = sezioniDellaStampa(P, P.functions, tutteLeParti, fogliDi, it);
  expect(vista(s)).toEqual([
    ["progetto", "v", `${N} · Progetto`, "", ""],
    ["dati", "v", `${N} · Dati`, "", "main,leggi_numero,valido,stelle"],
    ["flowchart", "o", `${N} · Flowchart · Programma principale`, "foglio 1 di 2 del flowchart", "main"],
    ["flowchart", "o", `${N} · Flowchart · Programma principale`, "foglio 2 di 2 del flowchart", "main"],
    ["flowchart", "v", `${N} · Flowchart · leggi_numero`, "", "leggi_numero"],
    ["flowchart", "v", `${N} · Flowchart · valido`, "", "valido"],
    ["flowchart", "v", `${N} · Flowchart · stelle`, "", "stelle"],
    ["casi", "v", `${N} · Casi d'uso`, "", "main,valido,stelle"],
  ]);
  // Una regola per sezione, coi nomi tutti diversi.
  expect(new Set(s.map((x) => x.nome)).size).toBe(s.length);
});

test("B: ogni funzione da un foglio nuovo — dati e casi d'uso una sezione per funzione, col nome nell'intestazione", () => {
  const s = sezioniDellaStampa(P, P.functions, { ...tutteLeParti, foglioNuovo: true }, fogliDi, it);
  expect(vista(s).filter((x) => x[0] !== "flowchart")).toEqual([
    ["progetto", "v", `${N} · Progetto`, "", ""],
    ["dati", "v", `${N} · Dati · Programma principale`, "", "main"],
    ["dati", "v", `${N} · Dati · leggi_numero`, "", "leggi_numero"],
    ["dati", "v", `${N} · Dati · valido`, "", "valido"],
    ["dati", "v", `${N} · Dati · stelle`, "", "stelle"],
    ["casi", "v", `${N} · Casi d'uso · Programma principale`, "", "main"],
    ["casi", "v", `${N} · Casi d'uso · valido`, "", "valido"],
    ["casi", "v", `${N} · Casi d'uso · stelle`, "", "stelle"],
  ]);
  expect(s.length).toBe(1 + 4 + 5 + 3);
  // Con «solo quella mostrata» la casella non vale: una sezione per parte, come di seguito.
  const sola = sezioniDellaStampa(P, funzioniDellaStampa(P, valido.id, false), { ...tutteLeParti, tutte: false, foglioNuovo: true }, fogliDi, it);
  expect(vista(sola)).toEqual([
    ["progetto", "v", `${N} · Progetto`, "", ""],
    ["dati", "v", `${N} · Dati`, "", "valido"],
    ["flowchart", "v", `${N} · Flowchart · valido`, "", "valido"],
    ["casi", "v", `${N} · Casi d'uso`, "", "valido"],
  ]);
});

test("C: le predefinite stampano solo il flowchart; una parte scelta ma vuota non esce; in inglese le intestazioni in inglese", () => {
  expect(vista(sezioniDellaStampa(P, funzioniDellaStampa(P, main.id, false), sceltePredefinite, fogliDi, it)).map((x) => x[0])).toEqual(["flowchart", "flowchart"]);
  // `leggi_numero` non ha casi d'uso: la parte scelta non esce.
  expect(vista(sezioniDellaStampa(P, [leggi], tutteLeParti, fogliDi, it)).map((x) => x[0])).toEqual(["progetto", "dati", "flowchart"]);
  const inglese = sezioniDellaStampa(P, [main, stelle], tutteLeParti, fogliDi, en);
  expect(inglese.map((x) => [x.testa, x.destra])).toEqual([
    [`${N} · Project`, ""],
    [`${N} · Data`, ""],
    [`${N} · Flowchart · Main program`, "sheet 1 of 2 of the flowchart"],
    [`${N} · Flowchart · Main program`, "sheet 2 of 2 of the flowchart"],
    [`${N} · Flowchart · stelle`, ""],
    [`${N} · Test cases`, ""],
  ]);
});

test("le regole dei fogli: una per sezione col verso e l'intestazione; i sei riquadri occupati; il piè di pagina scelto o vuoto", () => {
  const s = sezioniDellaStampa(P, P.functions, tutteLeParti, fogliDi, it);
  const regole = regoleDeiFogli(s, it, { numeri: true, data: true }, "QUANDO-STAMPATO").split("\n");
  const diPagina = regole.filter((r) => r.startsWith("@page "));
  expect(diPagina.length).toBe(s.length);
  for (const [i, x] of s.entries()) {
    const r = diPagina[i]!;
    expect(r.startsWith(`@page ${x.nome} { size: A4 ${x.orizzontale ? "landscape" : "portrait"};`)).toBe(true);
    expect(r).toContain(`@top-left { content: "${x.testa}";`);
    expect(r).toContain(`@top-right { content: ${x.destra === "" ? SPAZIO : `"${x.destra}"`};`);
    for (const m of ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]) expect(r).toContain(`@${m} {`);
    expect(r).toContain('@bottom-left { content: "QUANDO-STAMPATO";');
    expect(r).toContain('"pagina " counter(page) " di " counter(pages) ""');
  }
  // In stampa si vede solo la pagina, su carta bianca.
  expect(regole.at(-1)).toBe("@media print { html, body { background: #ffffff; } #radice { display: none; } }");
  // Senza numero né data: i margini sotto restano occupati dallo spazio, senza contatore né anno.
  const senza = regoleDeiFogli(s, it, { numeri: false, data: false }, "QUANDO-STAMPATO");
  expect({ contatore: senza.includes("counter(page)"), anno: senza.includes("QUANDO-STAMPATO"), sinistra: senza.includes(`@bottom-left { content: ${SPAZIO};`), destra: senza.includes(`@bottom-right { content: ${SPAZIO};`) }).toEqual({
    contatore: false,
    anno: false,
    sinistra: true,
    destra: true,
  });
});

test("la nota dei flowchart ristretti: singolare, plurale, nessuna con «Adatta al foglio» o senza ristretti", () => {
  const scala = 10.6 / (geometriaPredefinita.carattere * 0.75);
  const ristretto = (f: Funzione) => ({ ristretto: f.kind === "main" || f.name === "stelle", scala });
  const uno = flowchartRistretti([main, valido], { adatta: false, punti: 12 }, ristretto, geometriaPredefinita);
  expect(notaDeiRistretti(uno, 12, it, "it")).toBe("A 12 punti il flowchart di «Programma principale» è più largo del foglio: si stampa più piccolo, a 10,6 punti.");
  expect(notaDeiRistretti(uno, 12, en, "en")).toBe("At 12 points the flowchart of “Main program” is wider than the page: it is printed smaller, at 10.6 points.");
  const due = flowchartRistretti(P.functions, { adatta: false, punti: 12 }, ristretto, geometriaPredefinita);
  expect(notaDeiRistretti(due, 12, it, "it")).toBe("A 12 punti questi flowchart sono più larghi del foglio e si stampano più piccoli: Programma principale (10,6 punti), stelle (10,6 punti).");
  expect(flowchartRistretti(P.functions, { adatta: true, punti: 12 }, ristretto, geometriaPredefinita)).toEqual([]);
  expect(notaDeiRistretti([], 8, it, "it")).toBe("");
});
