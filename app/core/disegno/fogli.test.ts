// La divisione del flowchart in fogli (`fogli.ts`).
//
// L'atteso a mano: due funzioni del corpus con la misura «per codice» delle prove, a 8 punti, su A4 coi margini della
// stampa (22, 18 e 12 mm): il verso, il numero dei fogli e i tagli, ricavati a mano dagli intervalli liberi stampati
// da uno script scritto a parte, PRIMA di questo codice.
//
// Il corpus intero (ogni funzione delle tappe 1–4, dei record, nelle due forme della copia, e degli attesi), con le tre misure del testo delle prove, ai punti 6, 8
// e 12 e con «Adatta al foglio», sull'A4 e sulla metà sinistra di un foglio orizzontale (il flowchart affiancato al
// codice): con un rilevatore SCRITTO QUI, dagli oggetti del disegno e non dagli ostacoli di `fogli.ts`, nessun taglio
// passa dentro un oggetto (forma, intestazione, etichetta, unione, punta di una freccia; i lati di un riquadro e i tratti
// delle linee paralleli al taglio), ogni oggetto sta in un foglio solo, ogni foglio ha almeno un oggetto, i fogli coprono
// il disegno e stanno nell'area alla scala, il testo non scende sotto i punti scelti se non è `ristretto`, e «Adatta»
// dà un foglio solo. I conteggi si stampano.
//
// I tagli in colonne: nel corpus non ce n'è mai uno (misurato), e nemmeno negli alberi costruiti apposta (misurato: ogni
// blocco sta su una linea verticale); si provano su un disegno COMPOSTO da due
// disegni veri dell'impaginazione affiancati e uniti da una linea orizzontale.
//
// Controlli positivi: un taglio vero spostato dentro un blocco, e uno in colonne spostato dentro una forma, fanno rosso il
// rilevatore; le mutazioni di `fogli.ts` (un ostacolo dimenticato, il corridoio stretto) fanno rosso il corpus, e si
// stampa l'unione dei rilevatori accesi per nome.
//
// CHE COSA NON GUARDA:
// - la misura vera del testo: qui le tre delle prove (nei motori il testo cambia il disegno, non la regola dei tagli);
// - i segni dell'esecuzione come ostacoli sul corpus: li prova un caso a mano qui sotto;
// - come si vede un foglio (`svg.test.ts`; la pagina stampata nei motori ha le sue prove).

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cicliIt, funzioniIt } from "../esecuzione/testi-di-prova";
import { apri } from "../progetto/formato";
import type { Funzione } from "../progetto/modello";
import { fogliDelDisegno, puntiDelTesto, puntiMassimi, puntiMinimi, type AreeDelFoglio, type FogliDelDisegno } from "./fogli";
import { impagina, opzioniPredefinite, type Disegno, type MisuraDelTesto, type OpzioniDelDisegno, type TestiDelDisegno } from "./impaginazione";
import { pallino, punta, RAGGIO_DEL_PALLINO, ripresa } from "./segni";
import { geometriaPredefinita as tema } from "./tema";

const testi: TestiDelDisegno = { inizio: "Inizio", fine: "Fine", leggi: "leggi", scrivi: "scrivi", vero: "Vero", falso: "Falso", aCapo: " ↵", ogniElemento: "{valore} in ogni elemento", altri: "… altri {n}", cicli: cicliIt, funzioni: funzioniIt };
const PIU_LARGO = { grassetto: 1.15, corsivo: 1.05 } as const;
const conLoStile = (base: (t: string) => number): MisuraDelTesto => (t, stile) => base(t) * (stile === undefined ? 1 : PIU_LARGO[stile]);
const perCodice = conLoStile((t) => [...t].reduce((s, c) => s + (c.codePointAt(0)! >= 0x1100 ? 1.2 : 0.62) * tema.carattere, 0));
const leMisure = [
  { nome: "per codice", misura: perCodice },
  { nome: "uniforme stretta", misura: conLoStile((t) => [...t].length * 0.45 * tema.carattere) },
  { nome: "uniforme larga", misura: conLoStile((t) => [...t].length * 0.9 * tema.carattere) },
];

/** Millimetri in unità del disegno alla scala 1 (pixel CSS). */
const px = (mm: number) => (mm * 96) / 25.4;
const a4: AreeDelFoglio = { verticale: { larghezza: px(210 - 24), altezza: px(297 - 40) }, orizzontale: { larghezza: px(297 - 24), altezza: px(210 - 40) } };
const metaOrizzontale = { larghezza: px(297 - 24) / 2 - px(5), altezza: px(210 - 40) };
const affiancato: AreeDelFoglio = { verticale: metaOrizzontale, orizzontale: metaOrizzontale };
const leAree = [
  { nome: "A4", aree: a4 },
  { nome: "metà orizzontale", aree: affiancato },
];

interface Albero {
  readonly nome: string;
  readonly funzione: Funzione;
  readonly costanti: Parameters<typeof impagina>[5];
  readonly funzioni: readonly Funzione[];
  readonly records: Parameters<typeof impagina>[7];
  readonly copia: OpzioniDelDisegno["copia"];
}
const radice = join(import.meta.dir, "..", "..");
const corpus: Albero[] = ["casi/tappa-1", "casi/tappa-2", "casi/tappa-3", "casi/tappa-4", "casi/tipi", "e2e/attesi"].flatMap((c) =>
  readdirSync(join(radice, c))
    .filter((f) => f.endsWith(".algo"))
    .flatMap((f) => {
      const esito = apri(readFileSync(join(radice, c, f), "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      const p = esito.progetto;
      // I record: anche nella copia espansa (il riquadro «copia campo per campo» con un'assegnazione per campo).
      const forme = c === "casi/tipi" ? (["compatta", "espansa"] as const) : (["compatta"] as const);
      return forme.flatMap((copia) =>
        p.functions.map((fn) => ({
          nome: `${c}/${f} :: ${fn.name ?? "principale"}${copia === "espansa" ? " (copia espansa)" : ""}`,
          funzione: fn,
          costanti: fn.kind === "main" ? (p.shared_constants ?? []) : [],
          funzioni: p.functions,
          records: p.records ?? [],
          copia,
        })),
      );
    }),
);
const disegna = (a: Albero, misura: MisuraDelTesto = perCodice) => impagina(a.funzione, tema, misura, testi, { ...opzioniPredefinite, copia: a.copia }, a.costanti, a.funzioni, a.records);
const delCorpus = (nome: string) => corpus.find((a) => a.nome === nome)!;

// ------------------------------------------------------------------------------------- il rilevatore, scritto qui

/** Un oggetto del disegno che un taglio non deve attraversare: il suo ingombro, e su quali assi blocca i tagli (`y`: un
 * taglio orizzontale, a quella y; `x`: uno verticale). */
interface Oggetto {
  readonly nome: string;
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
  readonly blocca: "x" | "y" | "xy";
}
function oggetti(d: Disegno): Oggetto[] {
  const fuori: Oggetto[] = [];
  const box = (nome: string, r: { x: number; y: number; larghezza: number; altezza: number }) => fuori.push({ nome, x: [r.x, r.x + r.larghezza], y: [r.y, r.y + r.altezza], blocca: "xy" });
  for (const e of d.elementi) {
    const xs = [...e.vertici.map((v) => v.x), e.riquadro.x, e.riquadro.x + e.riquadro.larghezza];
    const ys = [...e.vertici.map((v) => v.y), e.riquadro.y, e.riquadro.y + e.riquadro.altezza];
    fuori.push({ nome: `forma ${e.forma} ${e.dato ?? e.id}${e.fase ? ` ${e.fase}` : ""}`, x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)], blocca: "xy" });
  }
  for (const r of d.riquadri) {
    if (r.didascalia) box(`intestazione ${r.blocco}`, r.didascalia.riquadro);
    const { x, y, larghezza: l, altezza: a } = r.bordo;
    fuori.push({ nome: `lato alto ${r.blocco}`, x: [x, x + l], y: [y, y], blocca: "y" }, { nome: `lato basso ${r.blocco}`, x: [x, x + l], y: [y + a, y + a], blocca: "y" });
    fuori.push({ nome: `lato sinistro ${r.blocco}`, x: [x, x], y: [y, y + a], blocca: "x" }, { nome: `lato destro ${r.blocco}`, x: [x + l, x + l], y: [y, y + a], blocca: "x" });
  }
  for (const t of d.etichette) box(`etichetta ${t.valore} ${t.blocco}`, t.riquadro);
  d.ricongiungimenti.forEach((u, i) => fuori.push({ nome: `unione ${i}`, x: [u.centro.x - u.raggio, u.centro.x + u.raggio], y: [u.centro.y - u.raggio, u.centro.y + u.raggio], blocca: "xy" }));
  d.connettori.forEach((c, k) => {
    for (let i = 1; i < c.punti.length; i++) {
      const [p, q] = [c.punti[i - 1]!, c.punti[i]!];
      const xs = [Math.min(p.x, q.x), Math.max(p.x, q.x)] as const;
      const ys = [Math.min(p.y, q.y), Math.max(p.y, q.y)] as const;
      fuori.push({ nome: `linea ${k} tratto ${i}`, x: xs, y: ys, blocca: p.y === q.y ? "y" : "x" });
    }
    if (c.genere === "flusso") {
      const [p, q] = [c.punti[c.punti.length - 2]!, c.punti[c.punti.length - 1]!];
      const m = tema.punta;
      // La punta: lunga `punta` lungo l'ultimo tratto, larga `punta` di traverso.
      const lungo = (a: number, b: number) => (b > a ? ([b - m, b] as const) : ([b, b + m] as const));
      const largo = (v: number) => [v - m / 2, v + m / 2] as const;
      fuori.push({ nome: `punta della linea ${k}`, x: p.x === q.x ? largo(q.x) : lungo(p.x, q.x), y: p.y === q.y ? largo(q.y) : lungo(p.y, q.y), blocca: "xy" });
    }
  });
  return fuori;
}

const EPS = 1e-6;
/** I difetti di una divisione in fogli, con le premesse contate. */
function esamina(d: Disegno, f: FogliDelDisegno, aree: AreeDelFoglio, opzioni: { adatta: boolean; punti: number }): { difetti: string[]; oggetti: number } {
  const difetti: string[] = [];
  const ogg = oggetti(d);
  const dentro = (c: number, [lo, hi]: readonly [number, number]) => lo - EPS <= c && c <= hi + EPS;
  for (const c of f.tagliY) for (const o of ogg) if (o.blocca !== "x" && dentro(c, o.y)) difetti.push(`taglio orizzontale a ${c} dentro ${o.nome}`);
  for (const c of f.tagliX) for (const o of ogg) if (o.blocca !== "y" && dentro(c, o.x)) difetti.push(`taglio verticale a ${c} dentro ${o.nome}`);
  const contiene = (a: number, b: number, [lo, hi]: readonly [number, number]) => a - EPS <= lo && hi <= b + EPS;
  const righe = [0, ...f.tagliY, d.altezza];
  const colonne = [0, ...f.tagliX, d.larghezza];
  const fasce = (bordi: number[]) => bordi.slice(1).map((b, i) => [bordi[i]!, b] as const);
  for (const o of ogg) {
    const r = fasce(righe).filter(([a, b]) => contiene(a, b, o.y)).length;
    const k = fasce(colonne).filter(([a, b]) => contiene(a, b, o.x)).length;
    const quanti = o.blocca === "xy" ? r * k : o.blocca === "y" ? r : k;
    if (quanti !== 1) difetti.push(`${o.nome} in ${quanti} fogli`);
  }
  // Nei due versi: ogni foglio ha almeno un oggetto che sta tutto in lui.
  f.fogli.forEach((g, i) => {
    if (!ogg.some((o) => o.blocca === "xy" && contiene(g.x, g.x + g.larghezza, o.x) && contiene(g.y, g.y + g.altezza, o.y))) difetti.push(`foglio ${i + 1} vuoto`);
  });
  // I fogli: per righe, da sinistra a destra, che coprono il disegno; nell'area alla scala.
  const attesi = fasce(righe).flatMap(([y0, y1]) => fasce(colonne).map(([x0, x1]) => ({ x: x0, y: y0, larghezza: x1 - x0, altezza: y1 - y0 })));
  if (JSON.stringify(f.fogli.map(({ x, y, larghezza, altezza }) => ({ x, y, larghezza, altezza }))) !== JSON.stringify(attesi)) difetti.push("i fogli non sono la griglia dei tagli");
  const area = f.orizzontale ? aree.orizzontale : aree.verticale;
  for (const g of f.fogli) if (g.larghezza * f.scala > area.larghezza + EPS || g.altezza * f.scala > area.altezza + EPS) difetti.push(`un foglio ${g.larghezza}×${g.altezza} fuori dall'area alla scala ${f.scala}`);
  if (opzioni.adatta) {
    if (f.fogli.length !== 1) difetti.push(`«Adatta» con ${f.fogli.length} fogli`);
  } else {
    const minimo = Math.min(Math.max(opzioni.punti, puntiMinimi), puntiMassimi);
    // Oltre il 100% solo quando lo chiedono i punti (a 12 punti la scala è 12 / 11,25).
    const massima = Math.max(1, minimo / puntiDelTesto(1, tema));
    if (f.scala > massima + EPS) difetti.push(`scala ${f.scala} oltre ${massima} senza «Adatta»`);
    if (!f.ristretto && puntiDelTesto(f.scala, tema) < minimo - EPS) difetti.push(`testo a ${puntiDelTesto(f.scala, tema)} pt sotto ${minimo} senza «ristretto»`);
  }
  return { difetti, oggetti: ogg.length };
}

// ------------------------------------------------------------------------------------- l'atteso a mano

describe("l'atteso scritto a mano, a 8 punti sull'A4", () => {
  test("il riferimento della tappa 1: in verticale non sta in larghezza e non ha tagli in colonne; orizzontale, 4 fogli", () => {
    const d = disegna(delCorpus("casi/tappa-1/riferimento-media-voti.algo :: principale"));
    expect([d.larghezza, d.altezza]).toEqual([1310.5000000000005, 2743]);
    const f = fogliDelDisegno(d, a4, { adatta: false, punti: 8 }, tema);
    expect({ orizzontale: f.orizzontale, ristretto: f.ristretto, fogli: f.fogli.length, tagliX: f.tagliX }).toEqual({ orizzontale: true, ristretto: false, fogli: 4, tagliX: [] });
    expect(f.scala).toBeCloseTo(8 / 11.25, 10);
    expect(f.tagliY.length).toBe(3);
    expect(f.tagliY[0]!).toBeCloseTo(px(170) / (8 / 11.25), 6);
    expect(f.tagliY.slice(1)).toEqual([1788, 2676]);
  });

  test("per-ogni-annidati: verticale, 3 fogli, tagli a 1353,5 e 2716", () => {
    const d = disegna(delCorpus("casi/tappa-2/per-ogni-annidati.algo :: principale"));
    const f = fogliDelDisegno(d, a4, { adatta: false, punti: 8 }, tema);
    expect({ orizzontale: f.orizzontale, ristretto: f.ristretto, fogli: f.fogli.length, tagliX: f.tagliX, tagliY: f.tagliY }).toEqual({ orizzontale: false, ristretto: false, fogli: 3, tagliX: [], tagliY: [1353.5, 2716] });
    expect(f.fogli.map((g) => g.tagli)).toEqual([
      { sinistra: false, destra: false, sopra: false, sotto: true },
      { sinistra: false, destra: false, sopra: true, sotto: true },
      { sinistra: false, destra: false, sopra: true, sotto: false },
    ]);
  });

  test("«Adatta al foglio»: un foglio solo, nel verso col testo più grande, anche oltre il 100% e anche sotto il testo minimo", () => {
    const grande = disegna(delCorpus("casi/tappa-1/riferimento-media-voti.algo :: principale"));
    const f = fogliDelDisegno(grande, a4, { adatta: true, punti: 12 }, tema);
    // Verticale: min(702,99/1310,5; 971,34/2743) = 0,3541; orizzontale: min(1031,81/1310,5; 642,52/2743) = 0,2342.
    expect({ fogli: f.fogli.length, orizzontale: f.orizzontale }).toEqual({ fogli: 1, orizzontale: false });
    expect(f.scala).toBeCloseTo(px(257) / 2743, 10);
    const piccolo = disegna(corpus.find((a) => a.nome.startsWith("casi/tappa-1/"))!);
    expect(fogliDelDisegno(piccolo, a4, { adatta: true, punti: 8 }, tema).scala).toBeGreaterThan(1);
    expect(fogliDelDisegno(piccolo, a4, { adatta: false, punti: 8 }, tema).scala).toBe(1);
  });

  test("i punti fuori da 6–12 valgono il limite più vicino", () => {
    const d = disegna(delCorpus("casi/tappa-2/per-ogni-annidati.algo :: principale"));
    expect(fogliDelDisegno(d, a4, { adatta: false, punti: 30 }, tema)).toEqual(fogliDelDisegno(d, a4, { adatta: false, punti: 12 }, tema));
    expect(fogliDelDisegno(d, a4, { adatta: false, punti: 1 }, tema)).toEqual(fogliDelDisegno(d, a4, { adatta: false, punti: 6 }, tema));
  });
});

// ------------------------------------------------------------------------------------- il corpus intero

const leOpzioni = [
  { nome: "6 pt", adatta: false, punti: 6 },
  { nome: "8 pt", adatta: false, punti: 8 },
  { nome: "12 pt", adatta: false, punti: 12 },
  { nome: "«Adatta»", adatta: true, punti: 8 },
];

/** Tutte le divisioni del corpus con una funzione dei fogli data (quella vera o una mutata): i difettosi e i conti. */
function sulCorpus(dividi: typeof fogliDelDisegno) {
  const conti = { divisioni: 0, oggetti: 0, fogli: 0, suPiuFogli: 0, ristrette: 0, inColonne: 0, orizzontali: 0 };
  const difettosi: string[] = [];
  for (const { nome: nm, misura } of leMisure) {
    const disegni = corpus.map((a) => ({ nome: a.nome, d: disegna(a, misura) }));
    for (const { nome: na, aree } of leAree)
      for (const o of leOpzioni)
        for (const { nome, d } of disegni) {
          const f = dividi(d, aree, o, tema);
          const e = esamina(d, f, aree, o);
          conti.divisioni++;
          conti.oggetti += e.oggetti;
          conti.fogli += f.fogli.length;
          if (f.fogli.length > 1) conti.suPiuFogli++;
          if (f.ristretto) conti.ristrette++;
          if (f.tagliX.length > 0) conti.inColonne++;
          if (f.orizzontale) conti.orizzontali++;
          if (e.difetti.length > 0) difettosi.push(`${nome} (${nm}, ${na}, ${o.nome}): ${e.difetti[0]}${e.difetti.length > 1 ? ` (+${e.difetti.length - 1})` : ""}`);
        }
  }
  return { conti, difettosi };
}

describe("il corpus intero: nessun taglio dentro un oggetto, ogni oggetto in un foglio solo", () => {
  test(
    `${corpus.length} funzioni × ${leMisure.length} misure × ${leAree.length} aree × ${leOpzioni.length} opzioni`,
    () => {
      const { conti, difettosi } = sulCorpus(fogliDelDisegno);
      console.log(`fogli sul corpus: ${JSON.stringify(conti)}; difettosi ${difettosi.length}`);
      expect(difettosi).toEqual([]);
      // Le premesse dei record: il riquadro della copia di un record c'è, nelle due forme (una scritta sul bordo nella
      // compatta, un'assegnazione per campo nell'espansa).
      const deiRecord = corpus.filter((a) => a.nome.startsWith("casi/tipi/")).map((a) => disegna(a));
      const campi = deiRecord.flatMap((d) => d.elementi.filter((e) => e.campo !== undefined)).length;
      const scritte = deiRecord.flatMap((d) => d.riquadri.filter((r) => r.didascalia?.testo === cicliIt.copiaCampi)).length;
      console.log(`fogli sul corpus: copie di un record, assegnazioni dei campi ${campi}, scritte della compatta ${scritte}`);
      expect(campi).toBeGreaterThan(0);
      expect(scritte).toBeGreaterThan(0);
      // Le premesse: il corpus discrimina (molte funzioni su più fogli, qualcuna ristretta, i due versi).
      expect(conti.divisioni).toBe(corpus.length * 24);
      expect(conti.suPiuFogli).toBeGreaterThan(100);
      expect(conti.ristrette).toBeGreaterThan(0);
      expect(conti.orizzontali).toBeGreaterThan(0);
      expect(conti.orizzontali).toBeLessThan(conti.divisioni);
      // Misurato: nel corpus nessun taglio in colonne (se ne comparisse uno, questa riga lo dice: è una notizia, non un errore da nascondere).
      expect(conti.inColonne).toBe(0);
    },
    120_000,
  );

  test("controllo positivo: un taglio vero del corpus spostato dentro il blocco che lo segue fa rosso il rilevatore", () => {
    const d = disegna(delCorpus("casi/tappa-1/riferimento-media-voti.algo :: principale"));
    const o = { adatta: false, punti: 8 };
    const f = fogliDelDisegno(d, a4, o, tema);
    expect(esamina(d, f, a4, o).difetti).toEqual([]);
    const c = f.tagliY[1]!;
    const sotto = d.elementi.filter((e) => e.riquadro.y > c).sort((a, b) => a.riquadro.y - b.riquadro.y)[0]!;
    const spostato = sotto.riquadro.y + sotto.riquadro.altezza / 2;
    const tagliY = f.tagliY.map((t) => (t === c ? spostato : t));
    const fogli = f.fogli.map((g) => (g.y === c ? { ...g, y: spostato, altezza: g.altezza - (spostato - c) } : g.y + g.altezza === c ? { ...g, altezza: spostato - g.y } : g));
    const difetti = esamina(d, { ...f, tagliY, fogli }, a4, o).difetti;
    console.log(`controllo positivo dei tagli orizzontali: ${difetti.length} difetti, il primo «${difetti[0]}»`);
    expect(difetti.some((x) => x.startsWith(`taglio orizzontale a ${spostato} dentro forma`))).toBe(true);
  });
});

// ------------------------------------------------------------------------------------- i tagli in colonne

/** Due disegni veri dell'impaginazione affiancati (il secondo spostato a destra del primo) e uniti da una linea orizzontale
 * da un capo all'altro dello spazio fra loro: l'unico posto dove un taglio in colonne può cadere. */
function composto(a: Disegno, b: Disegno, y: number): Disegno {
  const dx = a.larghezza;
  const sposta = <T extends { x: number }>(p: T): T => ({ ...p, x: p.x + dx });
  const r = <T extends { x: number; y: number; larghezza: number; altezza: number }>(q: T): T => sposta(q);
  return {
    larghezza: a.larghezza + b.larghezza,
    altezza: Math.max(a.altezza, b.altezza),
    elementi: [...a.elementi, ...b.elementi.map((e) => ({ ...e, riquadro: r(e.riquadro), riquadroTesto: r(e.riquadroTesto), vertici: e.vertici.map(sposta), ...(e.lati ? { lati: e.lati.map(([p, q]) => [sposta(p), sposta(q)] as const) } : {}) }))],
    connettori: [...a.connettori, ...b.connettori.map((c) => ({ ...c, punti: c.punti.map(sposta) })), { genere: "nota", punti: [{ x: a.larghezza - 30, y }, { x: dx + 30, y }] }],
    etichette: [...a.etichette, ...b.etichette.map((t) => ({ ...t, riquadro: r(t.riquadro) }))],
    ricongiungimenti: [...a.ricongiungimenti, ...b.ricongiungimenti.map((u) => ({ ...u, centro: sposta(u.centro) }))],
    punti: [],
    riquadri: [...a.riquadri, ...b.riquadri.map((q) => ({ ...q, bordo: r(q.bordo), ...(q.didascalia ? { didascalia: { ...q.didascalia, riquadro: r(q.didascalia.riquadro), riquadroTesto: r(q.didascalia.riquadroTesto), vertici: q.didascalia.vertici.map(sposta) } } : {}) }))],
  };
}

describe("i tagli in colonne, su un disegno composto da due disegni veri", () => {
  const sinistra = disegna(delCorpus("casi/tappa-2/per-ogni-annidati.algo :: principale"));
  const destra = disegna(delCorpus("casi/tappa-1/riferimento-media-voti.algo :: principale"));
  const d = composto(sinistra, destra, 30);

  test("più largo del foglio in tutti e due i versi: il taglio in colonne fra i due disegni, i fogli per righe; il rilevatore verde", () => {
    const o = { adatta: false, punti: 8 };
    const f = fogliDelDisegno(d, a4, o, tema);
    console.log(`composto ${d.larghezza} × ${d.altezza}: ${f.fogli.length} fogli ${f.orizzontale ? "orizzontali" : "verticali"}, tagli in colonne ${f.tagliX.join(", ")}, ristretto ${f.ristretto}`);
    expect(f.ristretto).toBe(false);
    expect(f.tagliX.length).toBe(1);
    expect(f.tagliX[0]!).toBeGreaterThanOrEqual(sinistra.larghezza - 30 + 4);
    expect(f.tagliX[0]!).toBeLessThanOrEqual(sinistra.larghezza + 30 - 4);
    expect(f.fogli.filter((g) => g.tagli.destra).length).toBeGreaterThan(0);
    expect(esamina(d, f, a4, o).difetti).toEqual([]);
  });

  test("controllo positivo: il taglio in colonne spostato dentro una forma fa rosso il rilevatore", () => {
    const o = { adatta: false, punti: 8 };
    const f = fogliDelDisegno(d, a4, o, tema);
    const forma = destra.elementi[1]!;
    const dentro = sinistra.larghezza + forma.riquadro.x + forma.riquadro.larghezza / 2;
    const difetti = esamina(d, { ...f, tagliX: [dentro] }, a4, o).difetti;
    expect(difetti.some((x) => x.startsWith(`taglio verticale a ${dentro} dentro forma`))).toBe(true);
  });
});

// ------------------------------------------------------------------------------------- i segni come ostacoli

describe("i segni dell'esecuzione dati: un taglio non li attraversa", () => {
  test("ogni blocco a turno corrente (con la punta, o col «↩» della ripresa) e col punto: nessun taglio sui suoi segni", () => {
    const o = { adatta: false, punti: 8 };
    let prove = 0;
    let cambiati = 0;
    for (const nome of ["casi/tappa-2/per-ogni-annidati.algo :: principale", "casi/tappa-1/riferimento-media-voti.algo :: principale"]) {
      const d = disegna(delCorpus(nome));
      const senza = fogliDelDisegno(d, a4, o, tema);
      for (const e of d.elementi.filter((x) => x.dato === undefined))
        for (const inRipresa of [true, false]) {
          const f = fogliDelDisegno(d, a4, o, tema, { corrente: e.id, faseCorrente: e.fase ?? null, ripresa: inRipresa, interruzioni: new Set([e.id]) });
          prove++;
          if (JSON.stringify(f.tagliY) !== JSON.stringify(senza.tagliY)) cambiati++;
          const ys = inRipresa ? [ripresa(e).riquadro.y, ripresa(e).riquadro.y + ripresa(e).riquadro.altezza] : punta(e).map((v) => v.y);
          const p = pallino(e);
          const ingombri: [number, number][] = [[Math.min(...ys), Math.max(...ys)], ...(e.fase === undefined ? [[p.y - RAGGIO_DEL_PALLINO, p.y + RAGGIO_DEL_PALLINO] as [number, number]] : [])];
          for (const c of f.tagliY) for (const [lo, hi] of ingombri) if (lo <= c && c <= hi) throw new Error(`${nome}: il taglio a ${c} passa sui segni di ${e.id} ${e.fase ?? ""} (${lo}–${hi})`);
        }
    }
    console.log(`segni come ostacoli: ${prove} divisioni, ${cambiati} coi tagli cambiati dai segni`);
    // La premessa: i segni hanno spostato qualche taglio (sotto un blocco il «↩» occupa il corridoio).
    expect(cambiati).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------- i casi a mano

/** Disegni scritti a mano dove UNA SOLA difesa tiene un taglio fuori da un oggetto: nel corpus l'etichetta sta sempre
 * accanto al suo rombo e un tratto orizzontale accanto a una forma, che lo coprirebbero anche senza di lei. Fra «Inizio» e
 * «Fine» una linea verticale; l'oggetto a y 195–205; il foglio lungo 200 unità a 8 punti: il taglio più lontano cadrebbe
 * a 200, dentro l'oggetto. */
const forma = (id: string, y: number): Disegno["elementi"][number] => ({
  id,
  forma: "assegnazione",
  riquadro: { x: 50, y, larghezza: 100, altezza: 30 },
  vertici: [
    { x: 50, y },
    { x: 150, y },
    { x: 150, y: y + 30 },
    { x: 50, y: y + 30 },
  ],
  testo: id,
  righe: [id],
  riquadroTesto: { x: 60, y: y + 5, larghezza: 80, altezza: 19 },
});
const traDueForme = (extra: Partial<Disegno>): Disegno => ({
  larghezza: 200,
  altezza: 300,
  elementi: [forma("a", 20), forma("b", 250)],
  connettori: [{ genere: "nota", punti: [{ x: 100, y: 50 }, { x: 100, y: 250 }] }],
  etichette: [],
  ricongiungimenti: [],
  punti: [],
  riquadri: [],
  ...extra,
});
const casiAMano: { nome: string; d: Disegno }[] = [
  { nome: "un'etichetta sola fra due forme", d: traDueForme({ etichette: [{ blocco: "a", valore: "vero", testo: "Vero", riquadro: { x: 160, y: 195, larghezza: 30, altezza: 10 } }] }) },
  {
    nome: "un tratto orizzontale solo fra due forme",
    d: traDueForme({
      connettori: [
        { genere: "nota", punti: [{ x: 100, y: 50 }, { x: 100, y: 250 }] },
        { genere: "nota", punti: [{ x: 110, y: 200 }, { x: 180, y: 200 }] },
      ],
    }),
  },
];
/** L'area dei casi a mano: a 8 punti un foglio lungo 200 unità, largo quanto basta. */
const areaAMano = { larghezza: 1000, altezza: 200 * (8 / 11.25) };
const areeAMano: AreeDelFoglio = { verticale: areaAMano, orizzontale: areaAMano };
function suiCasiAMano(dividi: typeof fogliDelDisegno): string[] {
  const o = { adatta: false, punti: 8 };
  return casiAMano.flatMap(({ nome, d }) => esamina(d, dividi(d, areeAMano, o, tema), areeAMano, o).difetti.map((x) => `${nome}: ${x}`));
}

test("i casi a mano: il taglio resta fuori dall'oggetto (prima del corridoio, a 191 e a 196)", () => {
  expect(suiCasiAMano(fogliDelDisegno)).toEqual([]);
  const o = { adatta: false, punti: 8 };
  expect(casiAMano.map(({ d }) => fogliDelDisegno(d, areeAMano, o, tema).tagliY)).toEqual([[191], [196]]);
});

// ------------------------------------------------------------------------------------- mutazioni di fogli.ts

const sorgente = readFileSync(join(import.meta.dir, "fogli.ts"), "utf8");
/** Ogni mutazione con la sua sostituzione (che deve trovarsi una volta sola) e il difetto che il rilevatore deve dire, sul
 * corpus e sui casi a mano; `verde`: una mutazione che resta verde perché un'altra difesa tiene, col perché. */
const mutazioni: Record<string, { sostituzioni: [string, string][]; difetto?: string; verde?: string }> = {
  "nessuna (controllo positivo)": { sostituzioni: [] },
  "le punte delle frecce dimenticate": { sostituzioni: [["if (c.genere === \"flusso\") pieni.push(puntaDellaLinea(c, asse, geometria));", ""]], difetto: "punta della linea" },
  "i tratti delle linee paralleli al taglio dimenticati": { sostituzioni: [["if (p[asse] === q[asse]) pieni.push([p[asse], p[asse]]);", "if (p[asse] === q[asse]) {}"]], difetto: "tratto" },
  "i lati dei riquadri paralleli al taglio dimenticati": {
    sostituzioni: [["pieni.push([a, a], [b, b]);", ""]],
    verde: "per costruzione: i lati perpendicolari al taglio finiscono sul lato parallelo, e i loro estremi vietano lo stesso corridoio",
  },
  "le etichette dimenticate": { sostituzioni: [["for (const t of d.etichette) pieni.push(intervallo(t.riquadro, asse));", ""]], difetto: "etichetta" },
  "il corridoio largo zero": { sostituzioni: [["export const margineDelTaglio = 4;", "export const margineDelTaglio = 0;"]] },
  "il foglio con soli pezzi di linee ammesso": { sostituzioni: [["const conUnaForma = (da: number, a: number) => forme.some(([lo, hi]) => lo >= da && hi <= a);", "const conUnaForma = (da: number, a: number) => da < a || forme.length > 0;"]], difetto: "vuoto" },
};

async function mutante(sostituzioni: readonly [string, string][]): Promise<typeof fogliDelDisegno> {
  const cartella = mkdtempSync(join(tmpdir(), "fogli-"));
  const disegno = import.meta.dir.replaceAll("\\", "/");
  const mutato = sostituzioni.reduce((s, [da, a]) => s.replace(da, a), sorgente);
  const file = join(cartella, "mutante.ts");
  writeFileSync(file, mutato.replaceAll('from "./', `from "${disegno}/`).replaceAll('from "../', `from "${disegno}/../`));
  try {
    return ((await import(file)) as { fogliDelDisegno: typeof fogliDelDisegno }).fogliDelDisegno;
  } finally {
    rmSync(cartella, { recursive: true, force: true });
  }
}

describe("mutazioni: una divisione sbagliata fa rosso il corpus", () => {
  const accesi = new Map<string, string[]>();
  for (const [nome, { sostituzioni, difetto, verde }] of Object.entries(mutazioni)) {
    test(
      nome,
      async () => {
        for (const [da] of sostituzioni) expect({ nome, da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ nome, da, occorrenze: 1 });
        const dividi = await mutante(sostituzioni);
        const difettosi = [...sulCorpus(dividi).difettosi, ...suiCasiAMano(dividi).map((x) => `(a mano): ${x}`)];
        if (verde !== undefined) {
          console.log(`mutazione ${nome}: verde attesa (${verde}); difettosi ${difettosi.length}`);
          accesi.set(nome, ["verde attesa"]);
          expect(difettosi).toEqual([]);
          return;
        }
        const conIlDifetto = difetto === undefined ? difettosi.length : difettosi.filter((x) => x.includes(difetto)).length;
        // I generi di difetto accesi, senza i numeri: l'unione per nome si stampa in fondo.
        accesi.set(nome, [...new Set(difettosi.map((x) => x.slice(x.indexOf("): ") + 3).replace(/[-\d.]+/g, "#")))].slice(0, 4));
        console.log(`mutazione ${nome}: difettosi ${difettosi.length}${difetto === undefined ? "" : `, col difetto «${difetto}» ${conIlDifetto}`}`);
        if (sostituzioni.length === 0) expect(difettosi).toEqual([]);
        else expect(conIlDifetto).toBeGreaterThan(0);
      },
      120_000,
    );
  }
  test("l'unione per nome: ogni mutazione accende il rilevatore con almeno un difetto", () => {
    for (const [nome, d] of accesi) console.log(`  ${nome}: ${d.join(" · ") || "—"}`);
    expect(accesi.size).toBe(Object.keys(mutazioni).length);
    expect([...accesi].filter(([n, d]) => n !== "nessuna (controllo positivo)" && d.length === 0).map(([n]) => n)).toEqual([]);
  });
});
