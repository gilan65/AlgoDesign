// Il pallino del punto di interruzione e la punta del blocco corrente (`segni.ts`) su ogni albero delle prove
// del disegno: il corpus delle tappe 1 e 2, 300 alberi generati a seme fisso e 150 coi cicli, le funzioni della tappa 3 e
// di 60 progetti generati coi salti (le intestazioni e il blocco della chiamata), nelle due forme delle
// condizioni lunghe e, per i cicli, in tre forme (aperti con la posizione, aperti a parole, chiusi). Per ogni blocco che si esegue (i commenti no: non hanno punti di interruzione e non sono mai il blocco
// corrente), il pallino e la punta non toccano (con 1 px di luce; la punta sta per costruzione sulla linea che
// entra e sul vertice del blocco), e la punta non tocca il pallino: le etichette
// «Vero» e «Falso», la propria forma (il rombo col suo contorno, le altre col loro riquadro), il riquadro degli
// altri blocchi, le linee, i punti di unione, i «+» dei punti di inserimento, i bordi dei riquadri dei cicli; e
// stanno nel disegno. Il pallino c'è solo sui blocchi dell'albero (l'intestazione di un ciclo, non le parti che il
// riquadro aggiunge); la punta anche sulle parti, che sono il blocco corrente di una fase.
// Lo stesso per il «↩» della ripresa (anche contro il pallino dello stesso blocco) e per il bollino di un errore o di un
// avviso, che sta per costruzione su un angolo della sua forma (l'intestazione sul bordo del suo riquadro): per lui non
// contano la sua forma e il bordo del suo riquadro, contano il pallino dello stesso blocco e i «+» (il bollino c'è anche
// mentre si modifica).
// Controllo positivo: le premesse contate (blocchi, condizioni, etichette, linee), un pallino messo apposta
// sull'etichetta «Falso» del primo rombo, che il rilevatore deve vedere, e per ogni segno la posizione di prima su un
// disegno del corpus dove toccava: il pallino coi cicli chiusi col margine di 12 px, il «↩» in basso a destra, il bollino
// dell'intestazione in alto a destra.
//
// CHE COSA NON GUARDA:
// - la misura vera del testo: qui quella delle prove dell'impaginazione (per carattere); nei motori il testo è
//   più stretto o uguale, e le etichette non si allargano oltre il loro riquadro;
// - i segni dei blocchi che l'impaginazione non disegna (un ciclo chiuso non disegna le sue parti);
// - i colori e la leggibilità dei segni sopra lo sfondo: solo che non coprano nulla;
// - che la punta si veda nei motori (il disegno vero lo prova `e2e/esecuzione.e2e.ts` dagli attributi);
// - la punta contro i «+»: c'è un blocco corrente solo in esecuzione, quando il flowchart è in sola lettura e i «+»
//   non si disegnano.

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alberoGenerato, progettoGenerato } from "../../core/disegno/alberi-di-prova";
import { impagina, opzioniPredefinite, type Disegno, type Elemento, type MisuraDelTesto, type TestiDelDisegno } from "../../core/disegno/impaginazione";
import { geometriaPredefinita } from "../../core/disegno/tema";
import { cicliEn, cicliIt, funzioniEn, funzioniIt } from "../../core/esecuzione/testi-di-prova";
import { apri } from "../../core/progetto/formato";
import { tipi, type Dato, type Funzione } from "../../core/progetto/modello";
import { bollino, pallino, punta, RAGGIO_DEL_BOLLINO, RAGGIO_DEL_PALLINO, ripresa } from "./segni";
import { testiDelDisegno } from "./testi";

test("le parole dei cicli e delle funzioni che le prove del disegno usano sono quelle dei dizionari, nelle due lingue", () => {
  // Le prove del disegno (qui, nel nucleo e negli ausili) scrivono le parole a mano: senza questo legame, una parola
  // cambiata nel dizionario (la freccia del salto, «rif», «Restituisce») non la vedrebbe nessuna prova del disegno.
  // Il tipo del risultato è una funzione: si confronta su un dato di ogni tipo, semplice, vettore (anche di un elemento) e
  // con la lunghezza massima.
  const campioni: Dato[] = tipi.flatMap((type) => [{ name: "r", type }, { name: "r", type, size: 3 }, { name: "r", type, size: 1 }, ...(type === "string" ? [{ name: "r", type, max_length: 20 }, { name: "r", type, size: 2, max_length: 9 }] : [])]);
  for (const [l, cicli, funzioni] of [["it", cicliIt, funzioniIt], ["en", cicliEn, funzioniEn]] as const) {
    const { tipo, ...parole } = testiDelDisegno(l).funzioni;
    const { tipo: tipoDiProva, ...paroleDiProva } = funzioni;
    expect({ l, cicli: testiDelDisegno(l).cicli, funzioni: parole, tipi: campioni.map(tipo) }).toEqual({ l, cicli, funzioni: paroleDiProva, tipi: campioni.map(tipoDiProva) });
  }
  // Controllo positivo: un tipo che dimentica la dimensione si vede.
  expect(campioni.map(funzioniIt.tipo)).not.toEqual(campioni.map((d) => funzioniIt.tipo({ ...d, size: undefined } as Dato)));
});

const tema = geometriaPredefinita;
const testi: TestiDelDisegno = { inizio: "Inizio", fine: "Fine", leggi: "leggi", scrivi: "scrivi", vero: "Vero", falso: "Falso", aCapo: " ↵", ogniElemento: "{valore} in ogni elemento", altri: "… altri {n}", cicli: cicliIt, funzioni: funzioniIt };
const misura: MisuraDelTesto = (t) => [...t].reduce((s, c) => s + (c.codePointAt(0)! >= 0x1100 ? 1.2 : 0.62) * tema.carattere, 0);
const LUCE = 1;
/** Il lato del «+» di un punto di inserimento. */
const PIU = 12;

const corpus = (tappa: string) => {
  const cartella = join(import.meta.dir, "..", "..", "casi", tappa);
  return readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((f) => {
      const esito = apri(readFileSync(join(cartella, f), "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      return { nome: f, funzione: esito.progetto.functions.find((x) => x.kind === "main")! };
    });
};
const funzioni: { nome: string; funzione: Funzione }[] = [
  ...corpus("tappa-1"),
  ...Array.from({ length: 300 }, (_, i) => ({ nome: `generato-${i + 1}`, funzione: alberoGenerato(1000 + i) })),
];
/** Gli alberi coi cicli, disegnati in tre forme. */
const conICicli: { nome: string; funzione: Funzione }[] = [
  ...corpus("tappa-2"),
  ...Array.from({ length: 150 }, (_, i) => ({ nome: `coi-cicli-${i + 1}`, funzione: alberoGenerato(5000 + i, true) })),
];
/** Le funzioni coi salti e le intestazioni di procedure e funzioni: ognuna di ogni progetto della tappa 3 e di 60 progetti
 * generati, con le funzioni del loro progetto, disegnate nelle tre forme dei cicli. */
const cartellaTappa3 = join(import.meta.dir, "..", "..", "casi", "tappa-3");
const cartellaTappa4 = join(import.meta.dir, "..", "..", "casi", "tappa-4");
const coiSalti: { nome: string; funzione: Funzione; funzioni: readonly Funzione[] }[] = [
  ...[cartellaTappa3, cartellaTappa4].flatMap((cartella) =>
    readdirSync(cartella)
      .filter((f) => f.endsWith(".algo"))
      .map((f) => join(cartella, f)),
  )
    .flatMap((f) => {
      const esito = apri(readFileSync(f, "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      return esito.progetto.functions.map((x) => ({ nome: `${f}#${x.name ?? "principale"}`, funzione: x, funzioni: esito.progetto.functions }));
    }),
  ...Array.from({ length: 60 }, (_, i) => progettoGenerato(7000 + i)).flatMap((fs, i) => fs.map((x) => ({ nome: `progetto-${i + 1}#${x.name ?? "principale"}`, funzione: x, funzioni: fs }))),
];
const formeDeiCicli = [
  { per: "aperto", perOgni: "posizione" },
  { per: "aperto", perOgni: "parole" },
  { per: "chiuso", perOgni: "chiuso" },
] as const;
/** Ogni disegno delle prove: gli alberi senza cicli nelle forme predefinite, quelli coi cicli in tre forme. */
const disegni = (condizioniLunghe: "su-due-righe" | "su-una-riga") => [
  ...funzioni.map(({ nome, funzione }) => ({ nome, forma: "", d: impagina(funzione, tema, misura, testi, { ...opzioniPredefinite, condizioniLunghe }) })),
  ...conICicli.flatMap(({ nome, funzione }) =>
    formeDeiCicli.map((f) => ({ nome, forma: `${f.per}/${f.perOgni}`, d: impagina(funzione, tema, misura, testi, { ...opzioniPredefinite, condizioniLunghe, ...f }) })),
  ),
  ...coiSalti.flatMap(({ nome, funzione, funzioni: delProgetto }) =>
    formeDeiCicli.map((f) => ({ nome, forma: `${f.per}/${f.perOgni}`, d: impagina(funzione, tema, misura, testi, { ...opzioniPredefinite, condizioniLunghe, ...f }, [], delProgetto) })),
  ),
];

type P = { readonly x: number; readonly y: number };
type R = { readonly x: number; readonly y: number; readonly larghezza: number; readonly altezza: number };

/** La distanza di un punto da un segmento. */
function distanza(p: P, a: P, b: P): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  // La proiezione sul segmento, tenuta fra i due capi.
  const proiezione = l === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / l;
  const t = proiezione < 0 ? 0 : proiezione > 1 ? 1 : proiezione;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
/** Il punto è dentro il poligono (pari e dispari). */
function dentro(p: P, v: readonly P[]): boolean {
  let s = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++)
    if (v[i]!.y > p.y !== v[j]!.y > p.y && p.x < ((v[j]!.x - v[i]!.x) * (p.y - v[i]!.y)) / (v[j]!.y - v[i]!.y) + v[i]!.x) s = !s;
  return s;
}
const lati = (v: readonly P[]) => v.map((a, i) => [a, v[(i + 1) % v.length]!] as const);
/** I quattro angoli di un rettangolo, in giro: sinistra e destra, alto e basso. */
function angoli(q: R): P[] {
  const [sinistra, destra, alto, basso] = [q.x, q.x + q.larghezza, q.y, q.y + q.altezza];
  return [
    { x: sinistra, y: alto },
    { x: destra, y: alto },
    { x: destra, y: basso },
    { x: sinistra, y: basso },
  ];
}

/** Un segno: un cerchio o un triangolo. Tocca un poligono se un suo punto è dentro o se è più vicino di `luce` a un lato. */
type Segno = { cerchio: P; raggio: number } | { triangolo: readonly P[] };
function tocca(s: Segno, poligono: readonly P[], luce = LUCE): boolean {
  if ("cerchio" in s) return dentro(s.cerchio, poligono) || lati(poligono).some(([a, b]) => distanza(s.cerchio, a, b) < s.raggio + luce);
  return s.triangolo.some((p) => dentro(p, poligono)) || poligono.some((p) => dentro(p, s.triangolo)) || lati(s.triangolo).some(([a, b]) => lati(poligono).some(([c, d]) => Math.min(distanza(a, c, d), distanza(b, c, d), distanza(c, a, b), distanza(d, a, b)) < luce));
}
function toccaSegmento(s: Segno, a: P, b: P): boolean {
  if ("cerchio" in s) return distanza(s.cerchio, a, b) < s.raggio + LUCE;
  return tocca(s, [a, b, b, a], LUCE) || dentro(a, s.triangolo);
}

/** Che cosa tocca il segno, nel disegno: un elenco vuoto se nulla. La punta del blocco corrente sta per
 * costruzione sulla linea che entra e tocca il vertice: con `entrata` (il punto dove la linea entra) quella linea
 * e la forma del blocco non contano. Con `suo` (il bollino) non contano la forma di quell'elemento e il bordo del suo
 * riquadro. */
function ostacoli(d: Disegno, id: string, s: Segno, entrata?: P, inEsecuzione = entrata !== undefined, suo?: Elemento): string[] {
  const fuori: string[] = [];
  for (const e of d.elementi) {
    if ((entrata && e.id === id) || e === suo) continue;
    const forma = e.id === id && e.forma === "condizione" ? e.vertici : angoli(e.riquadro);
    if (tocca(s, forma)) fuori.push(e.id === id ? "la sua forma" : `il blocco ${e.id}`);
  }
  for (const t of d.etichette) if (tocca(s, angoli(t.riquadro))) fuori.push(`l'etichetta «${t.testo}» di ${t.blocco}`);
  d.connettori.forEach((c, k) => {
    const fine = c.punti.at(-1)!;
    if (entrata && Math.hypot(fine.x - entrata.x, fine.y - entrata.y) < 1) return;
    for (let i = 1; i < c.punti.length; i++) if (toccaSegmento(s, c.punti[i - 1]!, c.punti[i]!)) return void fuori.push(`la linea ${k}`);
  });
  for (const r of d.riquadri) if (!(suo && r.blocco === id) && lati(angoli(r.bordo)).some(([a, b]) => toccaSegmento(s, a, b))) fuori.push(`il bordo del riquadro di ${r.blocco}`);
  for (const u of d.ricongiungimenti) if (tocca(s, angoli({ x: u.centro.x - u.raggio, y: u.centro.y - u.raggio, larghezza: 2 * u.raggio, altezza: 2 * u.raggio }))) fuori.push("un punto di unione");
  // Durante l'esecuzione i «+» non ci sono (sola lettura), e solo allora c'è un blocco corrente: per la punta non contano.
  if (!inEsecuzione) for (const p of d.punti) if (tocca(s, angoli({ x: p.x - PIU / 2, y: p.y - PIU / 2, larghezza: PIU, altezza: PIU }))) fuori.push("un «+»");
  const v = "cerchio" in s ? [{ x: s.cerchio.x - s.raggio, y: s.cerchio.y - s.raggio }, { x: s.cerchio.x + s.raggio, y: s.cerchio.y + s.raggio }] : s.triangolo;
  if (v.some((q) => q.x < 0 || q.y < 0 || q.x > d.larghezza || q.y > d.altezza)) fuori.push("il bordo del disegno");
  return fuori;
}

test("il pallino del punto di interruzione non tocca nulla del disegno, in ogni albero e su ogni blocco che si esegue", () => {
  const difetti: string[] = [];
  const conti = { disegni: 0, blocchi: 0, condizioni: 0, commenti: 0, etichette: 0, linee: 0, intestazioni: 0, riquadri: 0 };
  for (const condizioniLunghe of ["su-due-righe", "su-una-riga"] as const)
    for (const { nome, forma, d } of disegni(condizioniLunghe)) {
      conti.disegni++;
      conti.etichette += d.etichette.length;
      conti.linee += d.connettori.length;
      conti.riquadri += d.riquadri.length;
      for (const e of d.elementi) {
        // Un commento non si esegue: non ha punti di interruzione (la finestra non glieli mette); le parti che il
        // riquadro di un ciclo aggiunge non ne hanno (il punto è sull'intestazione).
        if (e.forma === "commento") {
          conti.commenti++;
          continue;
        }
        // Le etichette del rombo di un ciclo aperto contano fra le premesse.
        if (e.forma === "condizione") conti.condizioni++;
        if (e.fase !== undefined) continue;
        conti.blocchi++;
        if (e.forma === "intestazione") conti.intestazioni++;
        const p = ostacoli(d, e.id, { cerchio: pallino(e), raggio: RAGGIO_DEL_PALLINO });
        if (p.length > 0) difetti.push(`${nome} ${forma} ${condizioniLunghe} ${e.id} (${e.forma}): il pallino tocca ${p.join(", ")}`);
      }
    }
  console.log(`pallini: disegni ${conti.disegni}, blocchi ${conti.blocchi}, condizioni ${conti.condizioni}, intestazioni ${conti.intestazioni}, riquadri ${conti.riquadri}, commenti saltati ${conti.commenti}, etichette ${conti.etichette}, linee ${conti.linee}; difetti ${difetti.length}`);
  // Le premesse: alberi con condizioni, etichette, linee, commenti e cicli.
  expect(conti.condizioni).toBeGreaterThan(100);
  expect(conti.commenti).toBeGreaterThan(0);
  expect(conti.intestazioni).toBeGreaterThan(500);
  expect(conti.etichette).toBe(2 * conti.condizioni);
  expect({ difetti: difetti.length, primi: difetti.slice(0, 12) }).toEqual({ difetti: 0, primi: [] });
}, 30_000);

test("la punta del blocco corrente non tocca nulla del disegno oltre alla linea che entra, né il pallino dello stesso blocco, in ogni albero", () => {
  const difetti: string[] = [];
  const specie = new Map<string, number>();
  let blocchi = 0;
  for (const condizioniLunghe of ["su-due-righe", "su-una-riga"] as const)
    for (const { nome, forma, d } of disegni(condizioniLunghe)) {
      for (const e of d.elementi) {
        // Un commento non si esegue: non è mai il blocco corrente.
        if (e.forma === "commento") continue;
        blocchi++;
        const f = { triangolo: punta(e) };
        const o = ostacoli(d, e.id, f, f.triangolo[2]);
        const p = pallino(e);
        const r = RAGGIO_DEL_PALLINO + 1;
        if (e.fase === undefined && tocca({ cerchio: p, raggio: r }, f.triangolo)) o.push("il pallino dello stesso blocco");
        if (o.length > 0) difetti.push(`${nome} ${forma} ${condizioniLunghe} ${e.id}${e.fase ? `:${e.fase}` : ""} (${e.forma}): la punta tocca ${o.join(", ")}`);
        for (const x of o) specie.set(`${e.forma}: ${x.split(" ").slice(0, 2).join(" ")}`, (specie.get(`${e.forma}: ${x.split(" ").slice(0, 2).join(" ")}`) ?? 0) + 1);
      }
    }
  console.log(`punte: blocchi ${blocchi}; difetti ${difetti.length}${[...specie].map(([k, n]) => `; ${n} ${k}`).join("")}`);
  expect(blocchi).toBeGreaterThan(7000);
  expect({ difetti: difetti.length, primi: difetti.slice(0, 12) }).toEqual({ difetti: 0, primi: [] });
  // Il limite esplicito, quattro volte la durata più lunga misurata: 34 s da sola (anche sul commit di
  // partenza, prima dei casi nuovi), sotto i 30 nella corsa intera, dove il codice dell'impaginazione è già caldo: col
  // limite di 30 s il verdetto dipendeva da che cosa girava prima. La prova non misura un tempo.
}, 150_000);

test("il «↩» della ripresa non tocca nulla del disegno e ci sta dentro, su ogni blocco che si esegue, in ogni albero", () => {
  // La ripresa c'è solo in esecuzione (i «+» non ci sono) e su un blocco che chiama una funzione in un'espressione: qui su
  // ogni blocco che si esegue, che è più largo. Il riquadro del glifo è quello che `ripresa` dichiara.
  const difetti: string[] = [];
  const specie = new Map<string, number>();
  let blocchi = 0;
  for (const condizioniLunghe of ["su-due-righe", "su-una-riga"] as const)
    for (const { nome, forma, d } of disegni(condizioniLunghe)) {
      for (const e of d.elementi) {
        if (e.forma === "commento") continue;
        blocchi++;
        const glifo = { triangolo: angoli(ripresa(e).riquadro) };
        const o = ostacoli(d, e.id, glifo, undefined, true);
        if (e.fase === undefined && tocca({ cerchio: pallino(e), raggio: RAGGIO_DEL_PALLINO }, glifo.triangolo)) o.push("il pallino dello stesso blocco");
        if (o.length > 0) difetti.push(`${nome} ${forma} ${condizioniLunghe} ${e.id}${e.fase ? `:${e.fase}` : ""} (${e.forma}): il «↩» tocca ${o.join(", ")}`);
        // La specie: il bordo del disegno, il bordo di un riquadro, una linea, un blocco, un'etichetta.
        const di = (x: string) => (x.startsWith("il bordo del riquadro") ? "il bordo di un riquadro" : x.startsWith("la linea") ? "una linea" : x.startsWith("il blocco") ? "un altro blocco" : x.startsWith("l'etichetta") ? "un'etichetta" : x);
        for (const x of new Set(o.map(di))) specie.set(x, (specie.get(x) ?? 0) + 1);
      }
    }
  console.log(`riprese: blocchi ${blocchi}; difetti ${difetti.length}${[...specie].map(([k, n]) => `; ${n} ${k}`).join("")}`);
  expect(blocchi).toBeGreaterThan(7000);
  expect({ difetti: difetti.length, primi: difetti.slice(0, 12) }).toEqual({ difetti: 0, primi: [] });
}, 150_000);

test("il bollino di un errore non tocca nulla del disegno fuori dalla sua forma e ci sta dentro, su ogni blocco che si esegue, in ogni albero", () => {
  // Il bollino c'è mentre si modifica (coi «+») e in esecuzione, su ogni blocco dell'albero che si esegue (le parti che il
  // riquadro di un ciclo aggiunge non hanno segni: il segno è sull'intestazione).
  const difetti: string[] = [];
  const specie = new Map<string, number>();
  let blocchi = 0;
  for (const condizioniLunghe of ["su-due-righe", "su-una-riga"] as const)
    for (const { nome, forma, d } of disegni(condizioniLunghe)) {
      for (const e of d.elementi) {
        if (e.forma === "commento" || e.fase !== undefined) continue;
        blocchi++;
        const s = { cerchio: bollino(e), raggio: RAGGIO_DEL_BOLLINO };
        const o = ostacoli(d, e.id, s, undefined, false, e);
        if (tocca(s, angoli({ x: pallino(e).x - RAGGIO_DEL_PALLINO, y: pallino(e).y - RAGGIO_DEL_PALLINO, larghezza: 2 * RAGGIO_DEL_PALLINO, altezza: 2 * RAGGIO_DEL_PALLINO }))) o.push("il pallino dello stesso blocco");
        if (o.length > 0) difetti.push(`${nome} ${forma} ${condizioniLunghe} ${e.id} (${e.forma}): il bollino tocca ${o.join(", ")}`);
        for (const x of new Set(o.map((y) => y.split(" ").slice(0, 2).join(" ")))) specie.set(`${e.forma}: ${x}`, (specie.get(`${e.forma}: ${x}`) ?? 0) + 1);
      }
    }
  console.log(`bollini: blocchi ${blocchi}; difetti ${difetti.length}${[...specie].map(([k, n]) => `; ${n} ${k}`).join("")}`);
  expect(blocchi).toBeGreaterThan(7000);
  expect({ difetti: difetti.length, primi: difetti.slice(0, 12) }).toEqual({ difetti: 0, primi: [] });
}, 150_000);

test("controllo positivo: un pallino sull'etichetta «Falso» del primo rombo, e uno sulla linea che entra, si vedono", () => {
  const riferimento = funzioni.find((f) => f.nome === "riferimento-media-voti.algo")!.funzione;
  const d = impagina(riferimento, tema, misura, testi, { ...opzioniPredefinite, condizioniLunghe: "su-due-righe" });
  const rombo = d.elementi.find((e) => e.forma === "condizione")!;
  const falso = d.etichette.find((t) => t.blocco === rombo.id && t.valore === "falso")!.riquadro;
  const sullEtichetta = { x: falso.x + falso.larghezza / 2, y: falso.y + falso.altezza / 2 };
  expect(ostacoli(d, rombo.id, { cerchio: sullEtichetta, raggio: RAGGIO_DEL_PALLINO })).toContain(`l'etichetta «Falso» di ${rombo.id}`);
  const sullaLinea = { x: rombo.riquadro.x + rombo.riquadro.larghezza / 2, y: rombo.riquadro.y - 10 };
  expect(ostacoli(d, rombo.id, { cerchio: sullaLinea, raggio: RAGGIO_DEL_PALLINO }).some((o) => o.startsWith("la linea"))).toBe(true);
  // E uno sul lato sinistro del riquadro del primo ciclo del riferimento coi «per».
  const coiPer = conICicli.find((f) => f.nome === "riferimento-media-voti-per.algo")!.funzione;
  const c = impagina(coiPer, tema, misura, testi, opzioniPredefinite);
  const r = c.riquadri[0]!;
  const sulBordo = { x: r.bordo.x, y: r.bordo.y + r.bordo.altezza / 2 };
  expect(ostacoli(c, "nessuno", { cerchio: sulBordo, raggio: RAGGIO_DEL_PALLINO })).toContain(`il bordo del riquadro di ${r.blocco}`);
});

test("controllo positivo: le posizioni di prima dei tre segni toccano, su disegni del corpus", () => {
  const coiPer = conICicli.find((f) => f.nome === "riferimento-media-voti-per.algo")!.funzione;
  // Il pallino coi cicli chiusi e il margine di prima (12 px): sul blocco «scrivi "Voto ignorato: "…» tocca il bordo
  // del riquadro del «per» che lo contiene.
  const chiusi = { ...opzioniPredefinite, per: "chiuso", perOgni: "chiuso" } as const;
  const conDodici = impagina(coiPer, { ...tema, margineRiquadroChiuso: 12 }, misura, testi, chiusi);
  const scrive = conDodici.elementi.find((e) => e.id === "b14")!;
  expect(ostacoli(conDodici, "b14", { cerchio: pallino(scrive), raggio: RAGGIO_DEL_PALLINO })).toContain("il bordo del riquadro di b7");
  expect(ostacoli(impagina(coiPer, tema, misura, testi, chiusi), "b14", { cerchio: pallino(impagina(coiPer, tema, misura, testi, chiusi).elementi.find((e) => e.id === "b14")!), raggio: RAGGIO_DEL_PALLINO })).toEqual([]);
  // Il bollino dell'intestazione del primo «per» (aperto) in alto a destra, come prima: tocca la linea che entra.
  const aperti = impagina(coiPer, tema, misura, testi, opzioniPredefinite);
  const intestazione = aperti.elementi.find((e) => e.id === "b7" && e.forma === "intestazione")!;
  const inAltoADestra = { x: Math.max(...intestazione.vertici.map((v) => v.x)), y: Math.min(...intestazione.vertici.map((v) => v.y)) };
  expect(ostacoli(aperti, "b7", { cerchio: inAltoADestra, raggio: RAGGIO_DEL_BOLLINO }, undefined, false, intestazione).some((o) => o.startsWith("la linea"))).toBe(true);
  // Il «↩» in basso a destra, come prima, sulla stessa intestazione: tocca il bordo del suo riquadro.
  const { x, y, larghezza, altezza } = intestazione.riquadro;
  expect(ostacoli(aperti, "b7", { triangolo: angoli({ x: x + larghezza + 4, y: y + altezza + 4 - 16, larghezza: 20, altezza: 20 }) }, undefined, true)).toContain("il bordo del riquadro di b7");
  // E sotto la fine, col margine in basso di prima (20 px), esce dal disegno.
  const conVenti = impagina(coiPer, { ...tema, margineInBasso: 20 }, misura, testi, opzioniPredefinite);
  const fine = conVenti.elementi.find((e) => e.forma === "fine")!;
  expect(ostacoli(conVenti, fine.id, { triangolo: angoli(ripresa(fine).riquadro) }, undefined, true)).toContain("il bordo del disegno");
});
