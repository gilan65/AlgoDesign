// Le parti della stampa senza il motore, sul programma di riferimento della tappa 3 (quattro funzioni; casi d'uso nel
// programma, in `valido` e in `stelle`): le parti piene e quelle stampate (gli affiancati al posto del flowchart e del
// codice), le sezioni nell'ordine con le intestazioni per più combinazioni di scelte, il codice in Python da solo e
// affiancato (righe per funzione, coda, versi, fogli nuovi, «solo quella mostrata»), un linguaggio che non dà il codice
// o un progetto con errori, le misure del codice, le regole dei fogli (una per sezione, i sei riquadri occupati, il piè di
// pagina scelto), la nota dei flowchart ristretti; i record di un file dei tipi nuovi nella prima sezione dei dati. Gli
// attesi sono quelli scritti a mano prima del codice; i fogli del
// flowchart qui sono dati dalla prova (2 orizzontali per il programma principale, 1 verticale per le altre; sul mezzo
// foglio degli affiancati 2 per il programma principale, 1 per le altre): quelli veri del nucleo li guarda la prova nel
// motore. Il passo del carattere del codice è quello di Cascadia Mono (0,586 em), misurato nel motore.
//
// Le righe del Python del riferimento, contate sul testo generato: il programma principale 1–36 (con la testa del file),
// `leggi_numero` 37–48, `valido` 49–52, `stelle` 53–60, la coda 61–111. A 8 punti il mezzo foglio ha 75 colonne × 45
// righe: il programma principale (36 righe e 5 a capo) sta in un foglio, la coda (51 righe) ne vuole due; il foglio
// verticale 107 × 69 (111 righe: due fogli), l'orizzontale 160 × 45 (tre fogli).
//
// CHE COSA NON GUARDA: come la pagina disegna le righe (↪, la barra, i numeri: la prova nel motore), il testo delle
// mancanze e degli errori (lo dà chi stampa, dalla colonna del codice e dalla riga di stato).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tetti } from "../../core/controllo/controllo";
import { geometriaPredefinita } from "../../core/disegno/tema";
import type { Generato } from "../../core/genera/forma";
import { apri } from "../../core/progetto/formato";
import type { Funzione, Progetto } from "../../core/progetto/modello";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { codiceDi } from "../genera/codice";
import {
  flowchartRistretti,
  fraseSenzaCodice,
  funzioniDellaStampa,
  misureDelCodice,
  notaDeiRistretti,
  notaSenzaCodice,
  partiDellaStampa,
  partiPiene,
  partiStampate,
  regoleDeiFogli,
  sceltePredefinite,
  sezioniDellaStampa,
  SPAZIO,
  type CodiceDellaStampa,
  type ScelteDiStampa,
  type Sezione,
} from "./parti";

const progetto = (file: string): Progetto => {
  const e = apri(readFileSync(fileURLToPath(new URL(`../../casi/${file}`, import.meta.url)), "utf8"));
  if (!e.ok) throw new Error(`${file} non si apre`);
  return e.progetto;
};
const P = progetto("tappa-3/riferimento-media-voti-funzioni.algo");
const N = P.metadata.name;
const [main, leggi, valido, stelle] = P.functions as [Funzione, Funzione, Funzione, Funzione];
const fogliDi = (f: Funzione) => (f.kind === "main" ? { orizzontale: true, fogli: [{}, {}] } : { orizzontale: false, fogli: [{}] }) as never;
const fogliAccanto = (f: Funzione) => ({ fogli: f.kind === "main" ? [{}, {}] : [{}] }) as never;
/** Il passo di Cascadia Mono a 8 punti, in millimetri. */
const PASSO = (0.586 * 8 * 25.4) / 72;
const codiceIn = (p: Progetto, linguaggio: "python" | "accademico", testi = it): CodiceDellaStampa => {
  const generato = codiceDi(p, tetti, linguaggio, "it");
  return { nome: linguaggio === "python" ? testi.linguaggioPython : testi.linguaggioAccademico, generato, misure: misureDelCodice(PASSO, generato.generato ? generato.righe.length : 0), fogliAccanto };
};
const PY = codiceIn(P, "python");
const nessuna = { progetto: false, dati: false, flowchart: false, codice: false, affiancati: false, casi: false };
const tutteLeParti: ScelteDiStampa = { ...sceltePredefinite, parti: { ...nessuna, progetto: true, dati: true, flowchart: true, casi: true } };
const vista = (s: readonly { parte: string; orizzontale: boolean; testa: string; destra: string; funzioni: readonly Funzione[] }[]) =>
  s.map((x) => [x.parte, x.orizzontale ? "o" : "v", x.testa, x.destra, x.funzioni.map((f) => f.name ?? "main").join(",")]);
/** Una sezione del codice: la parte, il verso, la testa, la destra, il foglio del flowchart (o «-»), le righe del codice
 * (da 1, la prima e l'ultima, o «-»), «senza» se non c'è codice. */
const delCodice = (s: readonly Sezione[]) =>
  s.map((x) => [
    x.parte,
    x.orizzontale ? "o" : "v",
    x.testa,
    x.destra,
    x.foglio ?? "-",
    x.codice ? `${x.codice.primo + x.codice.righe[0]!.riga + 1}-${x.codice.primo + x.codice.righe.at(-1)!.riga + 1}` : x.senzaCodice ? "senza" : "-",
  ]);

test("le sei parti nell'ordine; le piene; le predefinite (flowchart, codice e affiancati); gli affiancati al posto del flowchart e del codice", () => {
  expect(partiDellaStampa).toEqual(["progetto", "dati", "flowchart", "codice", "affiancati", "casi"]);
  expect(partiPiene(P, P.functions)).toEqual({ progetto: true, dati: true, flowchart: true, codice: true, affiancati: true, casi: true });
  expect(partiPiene(P, funzioniDellaStampa(P, leggi.id, false))).toEqual({ progetto: true, dati: true, flowchart: true, codice: true, affiancati: true, casi: false });
  const soloNome = { ...P, metadata: { name: N } };
  expect(partiPiene(soloNome, P.functions).progetto).toBe(false);
  // Controllo positivo: un autore di soli spazi non basta, uno vero sì.
  expect([partiPiene({ ...P, metadata: { name: N, author: "  " } }, []).progetto, partiPiene({ ...P, metadata: { name: N, author: "3ª B" } }, []).progetto]).toEqual([false, true]);
  expect({ parti: sceltePredefinite.parti, linguaggio: sceltePredefinite.linguaggio, orizzontale: sceltePredefinite.codiceOrizzontale }).toEqual({
    parti: { ...nessuna, flowchart: true, codice: true, affiancati: true },
    linguaggio: null,
    orizzontale: false,
  });
  const piene = partiPiene(P, P.functions);
  // Le predefinite: i soli affiancati.
  expect(partiStampate(sceltePredefinite, piene)).toEqual({ ...nessuna, affiancati: true });
  // Gli affiancati senza il codice o senza il flowchart non valgono: esce l'altra parte da sola.
  expect(partiStampate({ ...sceltePredefinite, parti: { ...nessuna, flowchart: true, affiancati: true } }, piene)).toEqual({ ...nessuna, flowchart: true });
  expect(partiStampate({ ...sceltePredefinite, parti: { ...nessuna, codice: true, affiancati: true } }, piene)).toEqual({ ...nessuna, codice: true });
  expect(partiStampate({ ...sceltePredefinite, parti: { ...nessuna, flowchart: true, codice: true } }, piene)).toEqual({ ...nessuna, flowchart: true, codice: true });
  // Una parte scelta ma vuota non esce.
  expect(partiStampate({ ...sceltePredefinite, parti: { ...nessuna, casi: true } }, { ...piene, casi: false })).toEqual(nessuna);
});

test("A: tutte le parti, tutte le funzioni, di seguito — progetto, dati, i fogli di ogni flowchart, casi d'uso", () => {
  const s = sezioniDellaStampa(P, P.functions, tutteLeParti, fogliDi, it, PY);
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
  const s = sezioniDellaStampa(P, P.functions, { ...tutteLeParti, foglioNuovo: true }, fogliDi, it, PY);
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
  const sola = sezioniDellaStampa(P, funzioniDellaStampa(P, valido.id, false), { ...tutteLeParti, tutte: false, foglioNuovo: true }, fogliDi, it, PY);
  expect(vista(sola)).toEqual([
    ["progetto", "v", `${N} · Progetto`, "", ""],
    ["dati", "v", `${N} · Dati`, "", "valido"],
    ["flowchart", "v", `${N} · Flowchart · valido`, "", "valido"],
    ["casi", "v", `${N} · Casi d'uso`, "", "valido"],
  ]);
});

test("C: le predefinite stampano i soli affiancati; una parte scelta ma vuota non esce; in inglese le intestazioni in inglese", () => {
  expect(vista(sezioniDellaStampa(P, funzioniDellaStampa(P, main.id, false), { ...sceltePredefinite, tutte: false }, fogliDi, it, PY)).map((x) => x[0])).toEqual(["affiancati", "affiancati"]);
  // `leggi_numero` non ha casi d'uso: la parte scelta non esce.
  expect(vista(sezioniDellaStampa(P, [leggi], tutteLeParti, fogliDi, it, PY)).map((x) => x[0])).toEqual(["progetto", "dati", "flowchart"]);
  const inglese = sezioniDellaStampa(P, [main, stelle], tutteLeParti, fogliDi, en, PY);
  expect(inglese.map((x) => [x.testa, x.destra])).toEqual([
    [`${N} · Project`, ""],
    [`${N} · Data`, ""],
    [`${N} · Flowchart · Main program`, "sheet 1 of 2 of the flowchart"],
    [`${N} · Flowchart · Main program`, "sheet 2 of 2 of the flowchart"],
    [`${N} · Flowchart · stelle`, ""],
    [`${N} · Test cases`, ""],
  ]);
});

test("le misure del codice a 8 punti col passo di Cascadia Mono: numeri in 4 colonne con 111 righe, in 2 con 9; una colonna e una riga di margine", () => {
  expect(misureDelCodice(PASSO, 111)).toEqual({ cifre: 4, verticale: { colonne: 107, righe: 69 }, orizzontale: { colonne: 160, righe: 45 }, accanto: { colonne: 75, righe: 45 } });
  expect(misureDelCodice(PASSO, 9).accanto).toEqual({ colonne: 77, righe: 45 });
});

test("D: gli affiancati in Python di tutte le funzioni — ogni funzione da un foglio nuovo, il più lungo continua, la coda in fondo", () => {
  const s = sezioniDellaStampa(P, P.functions, sceltePredefinite, fogliDi, it, PY);
  const t = `${N} · Flowchart e codice in Python`;
  const d = delCodice(s);
  expect(d.slice(0, 5)).toEqual([
    ["affiancati", "o", `${t} · Programma principale`, "foglio 1 di 2", 0, "1-36"],
    ["affiancati", "o", `${t} · Programma principale`, "foglio 2 di 2", 1, "-"],
    ["affiancati", "o", `${t} · leggi_numero`, "", 0, "37-48"],
    ["affiancati", "o", `${t} · valido`, "", 0, "49-52"],
    ["affiancati", "o", `${t} · stelle`, "", 0, "53-60"],
  ]);
  // La coda: due fogli, col lato del flowchart vuoto e senza funzione; dalla 61 alla 111, di seguito.
  const coda = s.slice(5);
  expect(coda.map((x) => [x.parte, x.orizzontale, x.testa, x.destra, x.foglio, x.funzioni.length])).toEqual([
    ["affiancati", true, `${t} · Funzioni di supporto`, "foglio 1 di 2", undefined, 0],
    ["affiancati", true, `${t} · Funzioni di supporto`, "foglio 2 di 2", undefined, 0],
  ]);
  const righe = coda.flatMap((x) => x.codice!.righe.filter((r) => r.pezzo === 0).map((r) => x.codice!.primo + r.riga + 1));
  expect(righe).toEqual(Array.from({ length: 51 }, (_, i) => 61 + i));
  // Ogni foglio del codice nella misura del mezzo foglio, coi numeri in 4 colonne.
  for (const x of s.filter((y) => y.codice)) expect([x.codice!.righe.length <= 45, x.codice!.cifre]).toEqual([true, 4]);
  // Il flowchart e il codice non escono anche da soli.
  expect(new Set(s.map((x) => x.parte))).toEqual(new Set(["affiancati"]));
});

test("E: il codice da solo — verticale di seguito, orizzontale, una funzione per foglio nuovo; «solo quella mostrata»", () => {
  const soloCodice = { ...sceltePredefinite, parti: { ...nessuna, codice: true } };
  const t = `${N} · Codice in Python`;
  const verticale = delCodice(sezioniDellaStampa(P, P.functions, soloCodice, fogliDi, it, PY));
  expect(verticale.map((x) => x.slice(0, 5))).toEqual([
    ["codice", "v", t, "", "-"],
    ["codice", "v", t, "", "-"],
  ]);
  expect([String(verticale[0]![5]).startsWith("1-"), String(verticale[1]![5]).endsWith("-111")]).toEqual([true, true]);
  const orizzontale = delCodice(sezioniDellaStampa(P, P.functions, { ...soloCodice, codiceOrizzontale: true }, fogliDi, it, PY));
  expect(orizzontale.map((x) => [x[0], x[1], x[2]])).toEqual(Array(3).fill(["codice", "o", t]));
  expect(String(orizzontale.at(-1)![5]).endsWith("-111")).toBe(true);
  // Una funzione per foglio nuovo: ognuna in un foglio, col suo nome; la coda in fondo.
  expect(delCodice(sezioniDellaStampa(P, P.functions, { ...soloCodice, foglioNuovo: true }, fogliDi, it, PY))).toEqual([
    ["codice", "v", `${t} · Programma principale`, "", "-", "1-36"],
    ["codice", "v", `${t} · leggi_numero`, "", "-", "37-48"],
    ["codice", "v", `${t} · valido`, "", "-", "49-52"],
    ["codice", "v", `${t} · stelle`, "", "-", "53-60"],
    ["codice", "v", `${t} · Funzioni di supporto`, "", "-", "61-111"],
  ]);
  // Solo quella mostrata: le sue righe coi numeri veri, senza la coda; da sola e affiancata.
  expect(delCodice(sezioniDellaStampa(P, [valido], { ...soloCodice, tutte: false }, fogliDi, it, PY))).toEqual([["codice", "v", t, "", "-", "49-52"]]);
  expect(delCodice(sezioniDellaStampa(P, [main], { ...soloCodice, tutte: false }, fogliDi, it, PY))).toEqual([["codice", "v", t, "", "-", "1-36"]]);
  expect(delCodice(sezioniDellaStampa(P, [valido], { ...sceltePredefinite, tutte: false }, fogliDi, it, PY))).toEqual([["affiancati", "o", `${N} · Flowchart e codice in Python · valido`, "", 0, "49-52"]]);
});

test("F: le sei parti insieme nell'ordine, con e senza gli affiancati", () => {
  const sei = { ...sceltePredefinite, parti: { progetto: true, dati: true, flowchart: true, codice: true, affiancati: true, casi: true } };
  const parti = (s: readonly Sezione[]) => [...new Set(s.map((x) => x.parte))];
  expect(parti(sezioniDellaStampa(P, P.functions, sei, fogliDi, it, PY))).toEqual(["progetto", "dati", "affiancati", "casi"]);
  expect(parti(sezioniDellaStampa(P, P.functions, { ...sei, parti: { ...sei.parti, affiancati: false } }, fogliDi, it, PY))).toEqual(["progetto", "dati", "flowchart", "codice", "casi"]);
});

test("G: un linguaggio che non dà il codice («Accademico» su un programma con una procedura) e un progetto con errori: mai un foglio vuoto", () => {
  const Q = progetto("tappa-3/parametro-booleano.algo");
  const acc = codiceIn(Q, "accademico");
  expect(acc.generato.generato).toBe(false);
  const soloCodice = { ...sceltePredefinite, parti: { ...nessuna, codice: true } };
  // Il codice da solo: un foglio verticale al posto del codice.
  expect(delCodice(sezioniDellaStampa(Q, Q.functions, soloCodice, fogliDi, it, acc))).toEqual([["codice", "v", "parametro-booleano · Codice in Accademico", "", "-", "senza"]]);
  // Gli affiancati: il foglio dell'elenco, poi i flowchart coi fogli e il verso della parte «Flowchart».
  expect(delCodice(sezioniDellaStampa(Q, Q.functions, sceltePredefinite, fogliDi, it, acc))).toEqual([
    ["affiancati", "v", "parametro-booleano · Flowchart e codice in Accademico", "", "-", "senza"],
    ["flowchart", "o", "parametro-booleano · Flowchart · Programma principale", "foglio 1 di 2 del flowchart", 0, "-"],
    ["flowchart", "o", "parametro-booleano · Flowchart · Programma principale", "foglio 2 di 2 del flowchart", 1, "-"],
    ["flowchart", "v", "parametro-booleano · Flowchart · inverti", "", 0, "-"],
  ]);
  // Le frasi: sul foglio e nella finestra.
  expect(fraseSenzaCodice(acc.generato, "Accademico", 0, it)).toBe("Il programma non si scrive in Accademico: una cosa da cambiare.");
  expect(notaSenzaCodice(acc.generato, "Accademico", it)).toBe("Il programma non si scrive in Accademico (una cosa da cambiare): al posto del codice si stampa l'elenco.");
  const cinque: Generato = { generato: false, perche: "non-ci-sta", mancanze: Array(5).fill({ specie: "reale" }) };
  expect([fraseSenzaCodice(cinque, "Academic", 0, en), notaSenzaCodice(cinque, "Academic", en)]).toEqual([
    "The program cannot be written in Academic: 5 things to change.",
    "The program cannot be written in Academic (5 things to change): the list is printed instead of the code.",
  ]);
  const R = progetto("tappa-3/riferimento-senza-valore.algo");
  const errori = codiceIn(R, "python");
  expect(delCodice(sezioniDellaStampa(R, R.functions, soloCodice, fogliDi, it, errori))).toEqual([["codice", "v", "riferimento-senza-valore · Codice in Python", "", "-", "senza"]]);
  expect([fraseSenzaCodice(errori.generato, "Python", 1, it), fraseSenzaCodice(errori.generato, "Python", 3, it), notaSenzaCodice(errori.generato, "Python", it)]).toEqual([
    "Il codice si genera da un progetto senza errori e questo ha 1 errore:",
    "Il codice si genera da un progetto senza errori e questo ha 3 errori:",
    "Il progetto ha errori: al posto del codice si stampa il loro elenco.",
  ]);
  const fuori: Generato = { generato: false, perche: "fuori-tappa" };
  expect([fraseSenzaCodice(fuori, "Python", 0, it), notaSenzaCodice(fuori, "Python", it), notaSenzaCodice(PY.generato, "Python", it)]).toEqual([it.apriFuoriTappa, it.apriFuoriTappa, ""]);
});

test("le regole dei fogli: una per sezione col verso e l'intestazione; i sei riquadri occupati; il piè di pagina scelto o vuoto", () => {
  const s = sezioniDellaStampa(P, P.functions, { ...tutteLeParti, parti: { ...tutteLeParti.parti, codice: true, affiancati: true } }, fogliDi, it, PY);
  // Controllo positivo della premessa: fra le sezioni ci sono fogli dei due versi.
  expect(new Set(s.map((x) => x.orizzontale))).toEqual(new Set([true, false]));
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
  expect(regole.at(-1)).toBe("@media print { html, body { background: #ffffff; } body > :not([data-stampa]) { display: none; } }");
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

test("i record: la parte «Dati» piena anche coi soli record; la loro tabella nella prima sezione dei dati, una volta, anche con la sola funzione mostrata e con una funzione per foglio", () => {
  const T = progetto("tipi/tabella-come-parametro.algo");
  // Sei funzioni; `iniziali` non ha dati, e nella parte «Dati» non c'è.
  expect(T.functions.map((f) => [f.name ?? "main", f.data.length])).toEqual([["main", 4], ["alza", 2], ["crea", 2], ["migliore", 3], ["alzata", 1], ["iniziali", 0]]);
  const nomi = ["main", "alza", "crea", "migliore", "alzata"];
  const PYT = codiceIn(T, "python");
  const soloDati = { ...tutteLeParti, parti: { ...nessuna, dati: true } };
  const conRecord = (s: readonly Sezione[]) => s.map((x) => [x.parte, x.testa, x.funzioni.map((f) => f.name ?? "main").join(","), x.record === true]);
  const t = T.metadata.name;
  // Di seguito: una sezione, coi record.
  expect(conRecord(sezioniDellaStampa(T, T.functions, soloDati, fogliDi, it, PYT))).toEqual([["dati", `${t} · Dati`, nomi.join(","), true]]);
  // Una funzione per foglio: i record con la prima.
  expect(conRecord(sezioniDellaStampa(T, T.functions, { ...soloDati, foglioNuovo: true }, fogliDi, it, PYT))).toEqual(
    nomi.map((n, i) => ["dati", `${t} · Dati · ${i === 0 ? "Programma principale" : n}`, n, i === 0]),
  );
  // La sola funzione mostrata: i record con lei.
  const alza = T.functions[1]!;
  expect(conRecord(sezioniDellaStampa(T, funzioniDellaStampa(T, alza.id, false), { ...soloDati, tutte: false }, fogliDi, it, PYT))).toEqual([["dati", `${t} · Dati`, "alza", true]]);
  // I soli record, senza dati: la parte è piena e la sezione ha i soli record, anche con una funzione per foglio.
  const soliRecord: Progetto = { ...T, shared_constants: [], functions: T.functions.map((f) => ({ ...f, data: [] })) };
  expect(partiPiene(soliRecord, soliRecord.functions).dati).toBe(true);
  expect(conRecord(sezioniDellaStampa(soliRecord, soliRecord.functions, { ...soloDati, foglioNuovo: true }, fogliDi, it, PYT))).toEqual([["dati", `${t} · Dati`, "", true]]);
  // Controllo positivo: senza record e senza dati la parte è vuota; un progetto senza record non ha la tabella.
  expect(partiPiene({ ...soliRecord, records: [] }, soliRecord.functions).dati).toBe(false);
  expect(sezioniDellaStampa(P, P.functions, soloDati, fogliDi, it, PY).some((x) => x.record === true)).toBe(false);
});
