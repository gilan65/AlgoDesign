// Le prove dell'impaginazione: geometria (nessuna sovrapposizione, il testo dentro la sua forma, i connettori
// fuori dai riquadri, il Vero a destra) e funzione pura (stesso albero, stessa geometria).
//
// Su quali alberi: i casi delle tappe 1 e 2 del corpus (minuscoli: al più qualche blocco, non discriminano da
// soli), i programmi di riferimento delle due tappe, alberi GENERATI a seme fisso coi cicli (ogni genere delle
// tappe 1 e 2, profondità fino a 6, rami vuoti, i passi dei `per`, un `per ogni` dentro un altro, testi da 1 a 120
// caratteri: premesse asserite) e tre alberi costruiti apposta (un ramo largo accanto a uno stretto, nei due versi; la
// copia di un vettore col suo nome dove il corpus non la mette).
// Le forme dei cicli e della copia: tre combinazioni delle Impostazioni, ognuna con le due forme delle condizioni lunghe.
//
// I cicli `per` e `per ogni`, con l'albero in mano: un riquadro per ciclo, l'intestazione col suo testo sul bordo,
// dentro tutte e sole le forme del ciclo, i blocchi aggiunti della forma scelta col loro testo e al loro posto; aperto,
// il `mentre` equivalente ha il corpo a destra e l'uscita a sinistra; chiuso, il giro torna da destra. I punti del
// corpo stanno nel riquadro, fra i blocchi aggiunti e mai fra due di loro; quelli prima e dopo il ciclo fuori. La copia
// di un vettore col suo nome (riconosciuta qui, dai testi) allo stesso modo: compatta, la scritta sul bordo che non è un
// blocco e l'assegnazione dentro; espansa, come un `per ogni` con la posizione.
//
// I rilevatori sono scritti qui, indipendenti dal modulo: il testo si prova contro la FORMA (rombo,
// parallelogramma, ovale, rettangolo), non contro il rettangolo che la contiene. Il Vero a destra si prova
// sul RAMO, con l'albero in mano: i blocchi del `then` a destra del centro del rombo e quelli dell'`else` a
// sinistra, il corpo del `mentre` a destra, il giro di ritorno del `ripeti` dal vertice destro, e l'uscita
// Falso dei due cicli dal vertice sinistro verso il basso; un ramo vuoto è la sua linea dal vertice giusto.
// Le etichette Vero e Falso hanno un rilevatore a parte. Ogni rilevatore ha un controllo positivo su un
// disegno alterato apposta; le mutazioni del sorgente provano che le prove vedono un'impaginazione
// sbagliata, e quelle dei rami sono rosse col messaggio del rilevatore dei rami, non per un effetto
// collaterale.
//
// CHE COSA NON GUARDA:
// - la misura vera del testo nei motori: qui la misura è deterministica (per codici, non per unità UTF-16,
//   più larga per i caratteri larghi) e non è un maggiorante di quella del canvas, che si prova nel
//   browser; la geometria si prova con TRE misure (questa, una uniforme più stretta e una uniforme più
//   larga), per vedere che non dipende dal valore: un carattere vero non è uniforme, e non è provato;
// - l'estetica (proporzioni, simmetria) e la lunghezza dei tratti intermedi di una linea (si guarda solo il
//   tratto finale, perché la linea si veda oltre la punta);
// - se un connettore attraversa un altro connettore, e se le spezzate arrivano sui bordi giusti (delle
//   condizioni si guarda solo che dai due vertici laterali del rombo parta una linea, e quale dei due porta
//   al giro o al corpo di un ciclo);
// - un connettore che passa nel rettangolo di un rombo ma fuori dal rombo è contato come difetto (più
//   severo del necessario, mai più largo);
// - la linea del riquadro di un ciclo contro le linee del flusso (la attraversano per costruzione la linea che entra e
//   l'uscita): del riquadro si guardano le forme e le etichette dentro e fuori.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apri } from "../progetto/formato";
import type { Blocco, Dato, Funzione, Progetto } from "../progetto/modello";
import { inserisci, type Posto } from "../modifica/operazioni";
import { nomiDegliOperatori } from "../../i18n/operatori";
import { cicliIt, funzioniEn, funzioniIt } from "../esecuzione/testi-di-prova";
import { alberoGenerato, progettoGenerato, PROFONDITA } from "./alberi-di-prova";
import { coppie } from "./domanda";
import { traduciEspressione } from "./lingua";
import {
  impagina,
  opzioniPredefinite,
  righeDellaCondizione,
  testoDelValoreIniziale,
  type Disegno,
  type Elemento,
  type MisuraDelTesto,
  type OpzioniDelDisegno,
  type ParteDelTesto,
  type Punto,
  type Rettangolo,
  type TestiDelDisegno,
} from "./impaginazione";
import { segniDelDisegno } from "./segni";
import { geometriaPredefinita, type GeometriaDelTema } from "./tema";

type Impagina = typeof impagina;

// ------------------------------------------------------------------------------------- gli ingressi

const tema = geometriaPredefinita;
const testi: TestiDelDisegno = {
  inizio: "Inizio",
  fine: "Fine",
  leggi: "leggi",
  scrivi: "scrivi",
  vero: "Vero",
  falso: "Falso",
  aCapo: " ↵",
  ogniElemento: "{valore} in ogni elemento",
  altri: "… altri {n}",
  cicli: cicliIt,
  funzioni: funzioniIt,
};

/** Quanto il grassetto e il corsivo sono più larghi del normale nella misura delle prove: diversi da 1, perché un testo
 * con uno stile misurato come normale si veda. */
const PIU_LARGO = { grassetto: 1.15, corsivo: 1.05 } as const;
const conLoStile = (base: (t: string) => number): MisuraDelTesto => (t, stile) => base(t) * (stile === undefined ? 1 : PIU_LARGO[stile]);
/** La misura delle prove: per codice, più larga per i caratteri dal blocco Hangul Jamo in su (larghi o emoji). */
const misura: MisuraDelTesto = conLoStile((t) => [...t].reduce((s, c) => s + (c.codePointAt(0)! >= 0x1100 ? 1.2 : 0.62) * tema.carattere, 0));
/** Altre due misure, uniformi, una più stretta e una più larga: la geometria deve reggere qualunque sia il
 * valore (il rischio nei motori è un carattere più largo di quello delle prove). */
const leMisure = [
  { nome: "per codice", misura },
  { nome: "uniforme stretta", misura: conLoStile((t) => [...t].length * 0.45 * tema.carattere) },
  { nome: "uniforme larga", misura: conLoStile((t) => [...t].length * 0.9 * tema.carattere) },
];

/** Un albero delle prove: una funzione e, se il progetto ne ha, tutte le sue funzioni (i salti e i nomi nelle
 * espressioni). */
interface Albero {
  readonly nome: string;
  readonly funzione: Funzione;
  readonly funzioni?: readonly Funzione[];
}

const cartellaCasi = join(import.meta.dir, "..", "..", "casi", "tappa-1");
const delleTappe = ["tappa-1", "tappa-2"].map((t) => join(import.meta.dir, "..", "..", "casi", t));
const corpus: Albero[] = delleTappe.flatMap((cartella) =>
  readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((f) => {
      const esito = apri(readFileSync(join(cartella, f), "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      return { nome: f.slice(0, -".algo".length), funzione: esito.progetto.functions[0]! };
    }),
);
const riferimento = corpus.find((c) => c.nome === "riferimento-media-voti")!;

/** I progetti della tappa 3, interi. */
const cartellaTappa3 = join(import.meta.dir, "..", "..", "casi", "tappa-3");
const progettiDellaTappa3 = readdirSync(cartellaTappa3)
  .filter((f) => f.endsWith(".algo"))
  .map((f) => {
    const esito = apri(readFileSync(join(cartellaTappa3, f), "utf8"));
    if (!esito.ok) throw new Error(`${f} non si apre`);
    return { nome: f.slice(0, -".algo".length), progetto: esito.progetto };
  });
/** I progetti della tappa 4 (la ricorsione): le loro funzioni si disegnano con quelle della tappa 3. */
const cartellaTappa4 = join(import.meta.dir, "..", "..", "casi", "tappa-4");
const progettiDellaTappa4 = readdirSync(cartellaTappa4)
  .filter((f) => f.endsWith(".algo"))
  .map((f) => {
    const esito = apri(readFileSync(join(cartellaTappa4, f), "utf8"));
    if (!esito.ok) throw new Error(`${f} non si apre`);
    return { nome: f.slice(0, -".algo".length), progetto: esito.progetto };
  });
/** Ogni funzione di ogni progetto delle tappe 3 e 4, col nome del progetto e della funzione. */
const corpusTappa3: Albero[] = [...progettiDellaTappa3, ...progettiDellaTappa4].flatMap(({ nome, progetto }) =>
  progetto.functions.map((f) => ({ nome: `${nome}#${f.name ?? "principale"}`, funzione: f, funzioni: progetto.functions })),
);
const riferimento3 = progettiDellaTappa3.find((p) => p.nome === "riferimento-media-voti-funzioni")!.progetto;

const NUMERO_GENERATI = 300;
// Coi cicli: hanno anche ogni genere della tappa 1.
const generati: Albero[] = Array.from({ length: NUMERO_GENERATI }, (_, i) => ({ nome: `generato-${i + 1}`, funzione: alberoGenerato(1000 + i, true) }));
/** I progetti generati con procedure, funzioni e salti: ogni loro funzione è un albero. */
const NUMERO_PROGETTI = 100;
const coiSalti: Albero[] = Array.from({ length: NUMERO_PROGETTI }, (_, i) => progettoGenerato(7000 + i)).flatMap((fs, i) =>
  fs.map((f) => ({ nome: `progetto-${i + 1}#${f.name ?? "principale"}`, funzione: f, funzioni: fs })),
);

/** Un ramo largo (un se annidato con testi lunghi) accanto a uno stretto, nei due versi. */
function apposta(largoAVero: boolean): Funzione {
  const largo: Blocco[] = [
    { id: "a2", kind: "if", condition: "una condizione piuttosto lunga che allarga il rombo", then: [{ id: "a3", kind: "write", values: ["\"un testo lungo nel ramo interno\""], newline: true }], else: [{ id: "a4", kind: "assignment", target: "x", value: "x + 1000000" }] },
  ];
  const stretto: Blocco[] = [{ id: "a5", kind: "read", target: "n" }];
  return {
    id: "f1",
    kind: "main",
    data: [],
    body: [{ id: "a1", kind: "if", condition: "n > 0", then: largoAVero ? largo : stretto, else: largoAVero ? stretto : largo }],
    end: { id: "a6" },
  };
}
/** La copia di un vettore col suo nome dove il corpus non la mette: dentro un `per ogni` (la sua posizione al livello 2),
 * nei due rami di un `se`, nel corpo di un `per`, accanto a un'assegnazione di un vettore da un elemento. */
const copieApposta: Funzione = {
  id: "c1",
  kind: "main",
  data: [
    { name: "voti", type: "integer", size: 3 },
    { name: "altri", type: "integer", size: 3 },
    { name: "x", type: "integer" },
    { name: "i", type: "integer" },
  ],
  body: [
    {
      id: "c2",
      kind: "for_each",
      item: "x",
      source: "voti",
      body: [
        { id: "c3", kind: "assignment", target: "altri", value: "voti" },
        { id: "c4", kind: "assignment", target: "altri[0]", value: "x" },
      ],
    },
    { id: "c5", kind: "if", condition: "x > 0", then: [{ id: "c6", kind: "assignment", target: "altri", value: "voti" }], else: [{ id: "c7", kind: "assignment", target: " voti ", value: " altri " }] },
    { id: "c8", kind: "for", counter: "i", from: "1", to: "2", body: [{ id: "c9", kind: "assignment", target: "voti", value: "altri" }] },
  ],
  end: { id: "c10" },
};
const costruiti = [
  { nome: "apposta-largo-a-vero", funzione: apposta(true) },
  { nome: "apposta-largo-a-falso", funzione: apposta(false) },
  { nome: "apposta-copie", funzione: copieApposta },
];

const tuttiGliAlberi: Albero[] = [...corpus, ...corpusTappa3, ...generati, ...coiSalti, ...costruiti];

/** Il disegno di un albero delle prove, con le funzioni del suo progetto. */
const disegnaAlbero = (fn: Impagina, a: Albero, geometria: GeometriaDelTema, misuraDelTesto: MisuraDelTesto, opzioni: OpzioniDelDisegno = opzioniPredefinite) =>
  fn(a.funzione, geometria, misuraDelTesto, testi, opzioni, [], a.funzioni);

// ------------------------------------------------------------------------------------- i rilevatori

const EPS = 0.5;
/** Il nome di una forma nei messaggi: l'`id` del blocco, o il dato per il blocco del suo valore iniziale. */
const nomeDi = (e: Elemento) => (e.dato !== undefined ? `valore iniziale di ${e.dato}` : e.id);
/** Distanza minima fra due forme, o fra una forma e un'etichetta. */
const DISTANZA_MINIMA = 4;

const sovrapposti = (a: Rettangolo, b: Rettangolo, d: number) =>
  a.x < b.x + b.larghezza + d - EPS && b.x < a.x + a.larghezza + d - EPS && a.y < b.y + b.altezza + d - EPS && b.y < a.y + a.altezza + d - EPS;

/** I quattro angoli: le combinazioni dei due bordi verticali con i due orizzontali. */
function angoli(r: Rettangolo): Punto[] {
  const sinistra = r.x;
  const destra = r.x + r.larghezza;
  const cima = r.y;
  const fondo = r.y + r.altezza;
  return [sinistra, destra].flatMap((x) => [cima, fondo].map((y) => ({ x, y })));
}

/** Dentro un poligono convesso dato in senso orario (y verso il basso): ogni lato lascia il punto alla stessa parte. */
function dentroPoligono(vertici: readonly Punto[], p: Punto): boolean {
  return vertici.every((a, i) => {
    const b = vertici[(i + 1) % vertici.length]!;
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -EPS;
  });
}

/** Dentro la forma vera dell'elemento: l'ovale è un rettangolo con due semicerchi alle estremità. */
function dentroForma(e: Elemento, p: Punto): boolean {
  if (e.forma === "inizio" || e.forma === "fine") {
    const r = e.riquadro;
    const raggio = r.altezza / 2;
    const cy = r.y + raggio;
    const cx = Math.min(Math.max(p.x, r.x + raggio), r.x + r.larghezza - raggio);
    return (p.x - cx) ** 2 + (p.y - cy) ** 2 <= (raggio + EPS) ** 2;
  }
  return dentroPoligono(e.vertici, p);
}

/** Un tratto orizzontale o verticale che passa nell'interno di un rettangolo (toccarne il bordo è ammesso). */
function attraversa(a: Punto, b: Punto, r: Rettangolo): boolean {
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  return x0 < r.x + r.larghezza - EPS && x1 > r.x + EPS && y0 < r.y + r.altezza - EPS && y1 > r.y + EPS;
}

/** Linea che si deve vedere oltre la punta, nel tratto finale: la punta non deve mangiarsi la linea. */
const LINEA_VISIBILE = 16;

interface Esame {
  difetti: string[];
  premesse: { coppie: number; testi: number; tratti: number; condizioni: number; linee: number; unioni: number; rami: number; chiusi: number; cicli: number; riquadri: number; aggiunti: number; conStile: number; chiamate: number };
}

type Ciclo = Extract<Blocco, { kind: "for" | "for_each" }>;
const eCiclo = (b: Blocco): b is Ciclo => b.kind === "for" || b.kind === "for_each";
type Copia = Extract<Blocco, { kind: "assignment" }>;
const nomeSolo = /^\s*[\p{L}_][\p{L}\p{N}_]*\s*$/u;
/** La copia di un vettore col suo nome, riconosciuta qui dai testi (non dal modulo): la destinazione è il nome solo di
 * un vettore della funzione, il valore un nome solo. */
const eCopia = (b: Blocco, f: Funzione): b is Copia => b.kind === "assignment" && nomeSolo.test(b.target) && nomeSolo.test(b.value) && f.data.some((d) => d.name === b.target.trim() && d.size !== undefined);

/** I blocchi dentro un blocco: i due rami di un `se`, il corpo di un ciclo. */
const figli = (b: Blocco): readonly Blocco[] => (b.kind === "if" ? [...b.then, ...b.else] : b.kind === "while" || b.kind === "repeat" || eCiclo(b) ? b.body : []);

/** Gli `id` di una sequenza di blocchi, a ogni profondità. */
function idDi(blocchi: readonly Blocco[]): string[] {
  return blocchi.flatMap((b) => [b.id, ...idDi(figli(b))]);
}

/** Le forme dei blocchi dell'albero per `id`: per un ciclo la sua intestazione (non i blocchi che il riquadro
 * aggiunge, che hanno lo stesso `id` e una fase), nessun valore iniziale. */
/** Le forme dei blocchi per `id`; la Scrittura che una Lettura mostra come domanda ha la forma della Lettura. */
const formeDeiBlocchi = (d: Disegno) =>
  new Map(d.elementi.filter((e) => e.dato === undefined && e.fase === undefined).flatMap((e): [string, Elemento][] => (e.scrittura === undefined ? [[e.id, e]] : [[e.id, e], [e.scrittura, e]])));
/** I rombi per `id`: quelli dei `se`, dei cicli in testa e in coda, dei cicli `per` e `per ogni` aperti. */
const rombi = (d: Disegno) => new Map(d.elementi.filter((e) => e.forma === "condizione").map((e) => [e.id, e]));

/** Il RAMO dal lato giusto, con l'albero in mano: per ogni condizione dell'albero, i blocchi di ciascun ramo
 * dal loro lato del centro del rombo (tutto il riquadro, non il centro) e le uscite dal vertice giusto.
 * Restituisce quante condizioni ha guardato. */
function esaminaRami(d: Disegno, funzione: Funzione, opzioni: OpzioniDelDisegno, difetti: string[]): { rombi: number; chiusi: number } {
  const elemento = formeDeiBlocchi(d);
  const rombo = rombi(d);
  const flussi = d.connettori.filter((c) => c.genere === "flusso");
  const coincide = (a: Punto, b: Punto) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
  /** La linea che parte da un vertice del rombo, e dove arriva. */
  const daVertice = (v: Punto) => flussi.find((c) => coincide(c.punti[0]!, v));
  let guardate = 0;
  let chiusi = 0;
  const visita = (blocchi: readonly Blocco[]) => {
    for (const b of blocchi) {
      const copiaEspansa = eCopia(b, funzione) && opzioni.copia === "espansa";
      if (b.kind !== "if" && b.kind !== "while" && b.kind !== "repeat" && !eCiclo(b) && !copiaEspansa) continue;
      if (eCiclo(b) && (b.kind === "for" ? opzioni.per : opzioni.perOgni) === "chiuso") {
        chiusi++;
        esaminaIlCicloChiuso(d, b, difetti);
        visita(b.body);
        continue;
      }
      guardate++;
      const c = rombo.get(b.id);
      if (!c || ((eCiclo(b) || copiaEspansa) && c.fase !== "condizione")) {
        difetti.push(`rombo mancante ${b.id}`);
        continue;
      }
      const centro = c.riquadro.x + c.riquadro.larghezza / 2;
      const cima = c.riquadro.y;
      const [destro, sinistro] = [c.vertici[1]!, c.vertici[3]!];
      const tuttiA = (ids: readonly string[], lato: "destra" | "sinistra") =>
        ids.every((id) => {
          const r = elemento.get(id)?.riquadro;
          return r !== undefined && (lato === "destra" ? r.x > centro : r.x + r.larghezza < centro);
        });
      // Il giro finisce sul bordo di un punto di unione sull'asse del ciclo, sopra il rombo (il suo, ma non si
      // sa quale sia: sullo stesso asse ci sono anche quelli dei blocchi del corpo); l'uscita Falso mai, perché
      // scende, o si fonde con linee che finiscono altrove (un rombo, un'unione di un altro asse o più in basso).
      const sopra = d.ricongiungimenti.filter((u) => Math.abs(u.centro.x - centro) < 0.01 && u.centro.y < cima);
      const alGiro = (v: Punto) => {
        const l = daVertice(v);
        const fine = l?.punti[l.punti.length - 1];
        return fine !== undefined && sopra.some((u) => Math.abs(Math.hypot(fine.x - u.centro.x, fine.y - u.centro.y) - u.raggio) < 0.01);
      };
      // L'uscita Falso esce di lato e TORNA sull'asse del ciclo (due tratti orizzontali almeno), e non è il
      // giro; l'ingresso nel corpo del mentre va a destra e poi solo giù (un tratto orizzontale). Non si guarda
      // dove la linea finisce: l'uscita di un ciclo annidato si fonde con le linee di chi lo contiene.
      const orizzontali = (v: Punto) => {
        const p = daVertice(v)?.punti ?? [];
        return p.slice(1).filter((q, i) => q.y === p[i]!.y && q.x !== p[i]!.x).length;
      };
      // L'uscita va a sinistra e poi SCENDE (il giro di un `ripeti` specchiato sale); dopo, la linea può fondersi
      // anche col giro di un ciclo chiuso che contiene questo, e finire su un'unione sullo stesso asse, più in alto.
      const uscitaFalso = (v: Punto) => {
        const p = daVertice(v)?.punti;
        return p !== undefined && p.length >= 3 && p[1]!.x < p[0]!.x && p[1]!.y === p[0]!.y && p[2]!.x === p[1]!.x && p[2]!.y > p[1]!.y && orizzontali(v) >= 2;
      };
      if (b.kind === "if") {
        // Ogni ramo, vuoto o no, esce dal suo vertice; i blocchi di un ramo non vuoto stanno dal suo lato.
        if (!daVertice(destro) || !tuttiA(idDi(b.then), "destra")) difetti.push(`ramo Vero non a destra ${b.id}`);
        if (!daVertice(sinistro) || !tuttiA(idDi(b.else), "sinistra")) difetti.push(`ramo Falso non a sinistra ${b.id}`);
        visita(b.then);
        visita(b.else);
      } else if (b.kind === "while") {
        // Vero: il corpo a destra, e la linea dal vertice destro ci entra (a destra e poi solo giù), oppure,
        // se nel corpo non c'è una forma sull'asse (vuoto, o soli commenti), è il giro.
        const entra = tuttiA(idDi(b.body), "destra") && (orizzontali(destro) === 1 || alGiro(destro));
        if (!entra) difetti.push(`corpo del mentre non a destra ${b.id}`);
        if (!uscitaFalso(sinistro)) difetti.push(`uscita Falso del mentre non a sinistra ${b.id}`);
        visita(b.body);
      } else if (eCiclo(b) || copiaEspansa) {
        // Il `mentre` equivalente: il corpo a destra coi blocchi che il riquadro ci aggiunge (l'elemento preso,
        // l'aumento), e l'uscita Falso a sinistra. Il corpo non è mai vuoto: c'è almeno un blocco aggiunto (la copia
        // ha solo quelli).
        const aggiunti = d.elementi.filter((e) => e.id === b.id && (e.fase === "elemento" || e.fase === "passo"));
        const aggiuntiADestra = aggiunti.length > 0 && aggiunti.every((e) => e.riquadro.x > centro);
        const entra = tuttiA(idDi(figli(b)), "destra") && aggiuntiADestra && orizzontali(destro) === 1;
        if (!entra) difetti.push(`corpo del per non a destra ${b.id}`);
        if (!uscitaFalso(sinistro)) difetti.push(`uscita Falso del per non a sinistra ${b.id}`);
        visita(figli(b));
      } else {
        // Vero = un altro giro: la linea dal vertice destro sale all'unione sopra il corpo.
        if (!alGiro(destro)) difetti.push(`giro del ripeti non dal vertice destro ${b.id}`);
        if (!uscitaFalso(sinistro)) difetti.push(`uscita Falso del ripeti non a sinistra ${b.id}`);
        visita(figli(b));
      }
    }
  };
  visita(funzione.body);
  return { rombi: guardate, chiusi };
}

/** Il giro di un ciclo chiuso, col riquadro in mano: arriva al primo punto di unione dentro il riquadro (il suo: quelli
 * del corpo stanno più in basso) passando a destra, mai a sinistra; il corpo sta sull'asse di quell'unione. */
function esaminaIlCicloChiuso(d: Disegno, b: Ciclo, difetti: string[]): void {
  const r = d.riquadri.find((x) => x.blocco === b.id)?.bordo;
  if (r === undefined) return;
  const dentro = d.ricongiungimenti.filter((u) => u.centro.x > r.x && u.centro.x < r.x + r.larghezza && u.centro.y > r.y && u.centro.y < r.y + r.altezza);
  const u = dentro.reduce<(typeof dentro)[number] | undefined>((m, x) => (m === undefined || x.centro.y < m.centro.y ? x : m), undefined);
  if (u === undefined) {
    difetti.push(`giro del per chiuso senza unione ${b.id}`);
    return;
  }
  // All'unione arrivano la linea che entra, dall'alto, e il giro, di lato (l'ultimo tratto orizzontale): il giro arriva
  // da destra, e sta tutto a destra dell'asse.
  const arrivano = d.connettori.filter((c) => c.genere === "flusso" && Math.abs(Math.hypot(c.punti.at(-1)!.x - u.centro.x, c.punti.at(-1)!.y - u.centro.y) - u.raggio) < 0.01);
  // Il giro comincia dal punto più basso della sua linea (prima, la linea può venire dall'uscita di un ciclo del corpo,
  // che va a sinistra).
  const giri = arrivano.filter((c) => Math.abs(c.punti.at(-1)!.y - c.punti.at(-2)!.y) < 0.01);
  const giro = giri.length === 1 ? giri[0]!.punti : [];
  const fondo = Math.max(...giro.map((p) => p.y));
  const coda = giro.slice(giro.findLastIndex((p) => p.y === fondo));
  if (coda.length < 3 || !coda.every((p) => p.x > u.centro.x - 0.01)) difetti.push(`giro del per chiuso non a destra ${b.id}`);
  const forme = formeDeiBlocchi(d);
  for (const x of b.body) {
    const e = forme.get(x.id);
    // Un ciclo, o una copia espansa, ha l'intestazione a sinistra della linea.
    if (x.kind !== "comment" && e !== undefined && !eCiclo(x) && e.forma !== "intestazione" && Math.abs(e.riquadro.x + e.riquadro.larghezza / 2 - u.centro.x) > 0.01) difetti.push(`corpo del per chiuso fuori dall'asse ${b.id}`);
  }
}

/** I blocchi di un sottoalbero, a ogni profondità. */
const blocchiDi = (bs: readonly Blocco[]): Blocco[] => bs.flatMap((b) => [b, ...blocchiDi(figli(b))]);

/** Il livello di ogni `per ogni`: 1, o uno più di quanti `per ogni` lo contengono. */
function livelliDeiPerOgni(bs: readonly Blocco[], sopra = 0, fuori = new Map<string, number>()): Map<string, number> {
  for (const b of bs) {
    if (b.kind === "for_each") fuori.set(b.id, sopra + 1);
    livelliDeiPerOgni(figli(b), b.kind === "for_each" ? sopra + 1 : sopra, fuori);
  }
  return fuori;
}

/** Il livello della posizione di ogni `per ogni` e di ogni copia col nome: uno più di quanti `per ogni` li contengono. */
function livelliDellePosizioni(bs: readonly Blocco[], f: Funzione, sopra = 0, fuori = new Map<string, number>()): Map<string, number> {
  for (const b of bs) {
    if (b.kind === "for_each" || eCopia(b, f)) fuori.set(b.id, sopra + 1);
    livelliDellePosizioni(figli(b), f, b.kind === "for_each" ? sopra + 1 : sopra, fuori);
  }
  return fuori;
}

/** I testi attesi di un ciclo o di una copia, scritti qui dai modelli delle prove (le espressioni come sono: le prove
 * non ne traducono): l'intestazione (della copia compatta, la scritta sul bordo) e, per ogni fase che il riquadro
 * aggiunge nella forma data, il testo del blocco. */
function testiAttesi(b: Ciclo | Copia, come: string, livello: number, f: Funzione): { intestazione: string; fasi: Record<string, string> } {
  const c = cicliIt;
  const da = (modello: string, valori: Record<string, string>) => Object.entries(valori).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), modello);
  if (b.kind === "assignment") {
    if (come === "compatta") return { intestazione: c.copia, fasi: {} };
    const i = livello === 1 ? c.indice : `${c.indice}${livello}`;
    const [verso, sorgente] = [b.target.trim(), b.value.trim()];
    const n = f.data.find((x) => x.name === verso)!.size;
    return {
      intestazione: da(c.copiaEspansa, { assegnazione: `${b.target} ← ${b.value}`, copia: c.copia }),
      fasi: { inizio: `${i} ← 0`, condizione: `${i} < ${n}`, elemento: `${verso}[${i}] ← ${sorgente}[${i}]`, passo: `${i} ← ${i} + 1` },
    };
  }
  // Nell'intestazione le parole fra due valori sono staccate dallo spazio largo (U+2002), non dallo spazio semplice.
  const staccato = (modello: string) => modello.replace(/\}([^{}]+)\{/g, (_, m: string) => `}${m.replaceAll(" ", String.fromCodePoint(0x2002))}{`);
  if (b.kind === "for") {
    const passo = b.step ?? 1;
    const intestazione =
      passo === 1 ? da(staccato(c.per), { contatore: b.counter, da: b.from, a: b.to }) : da(staccato(c.perConPasso), { contatore: b.counter, da: b.from, a: b.to, passo: String(passo) });
    const fasi = { inizio: `${b.counter} ← ${b.from}`, condizione: `${b.counter} ${passo > 0 ? "<=" : ">="} ${b.to}`, passo: `${b.counter} ← ${b.counter} ${passo > 0 ? "+" : "-"} ${Math.abs(passo)}` };
    return { intestazione, fasi: come === "chiuso" ? {} : fasi };
  }
  const intestazione = da(staccato(c.perOgni), { elemento: b.item, sorgente: b.source });
  if (come === "chiuso") return { intestazione, fasi: {} };
  if (come === "parole") return { intestazione, fasi: { condizione: da(c.altroElemento, { sorgente: b.source }), elemento: `${b.item} ← ${da(c.elementoSuccessivo, { sorgente: b.source })}` } };
  const i = livello === 1 ? c.indice : `${c.indice}${livello}`;
  const n = f.data.find((x) => x.name === b.source)?.size;
  return { intestazione, fasi: { inizio: `${i} ← 0`, condizione: `${i} < ${n ?? `length ${b.source}`}`, elemento: `${b.item} ← ${b.source}[${i}]`, passo: `${i} ← ${i} + 1` } };
}

/** I riquadri dei cicli, con l'albero in mano: uno per ciclo e nessun altro; l'intestazione col suo testo, sul bordo in
 * alto; dentro tutte e sole le forme e le etichette del ciclo (le sue, quelle del corpo e i blocchi aggiunti); i
 * blocchi aggiunti quelli della forma scelta, col loro testo, e al loro posto rispetto al corpo vero (la partenza
 * sopra il rombo, l'elemento preso in testa al corpo, l'aumento in fondo). */
function esaminaIRiquadri(d: Disegno, f: Funzione, opzioni: OpzioniDelDisegno, difetti: string[]): { cicli: number; aggiunti: number } {
  const cicli = blocchiDi(f.body).filter((b): b is Ciclo | Copia => eCiclo(b) || eCopia(b, f));
  const disegnati = d.riquadri.map((r) => r.blocco);
  for (const b of cicli) if (disegnati.filter((x) => x === b.id).length !== 1) difetti.push(`ciclo ${b.id} con ${disegnati.filter((x) => x === b.id).length} riquadri`);
  for (const id of disegnati) if (!cicli.some((b) => b.id === id)) difetti.push(`riquadro senza ciclo ${id}`);
  const livelli = livelliDellePosizioni(f.body, f);
  const fondo = (r: Rettangolo) => r.y + r.altezza;
  const dentro = (r: Rettangolo, b: Rettangolo) => r.x > b.x && r.x + r.larghezza < b.x + b.larghezza && r.y > b.y && fondo(r) < fondo(b);
  let aggiunti = 0;
  for (const b of cicli) {
    const riquadro = d.riquadri.find((r) => r.blocco === b.id);
    const bordo = riquadro?.bordo;
    if (bordo === undefined) continue;
    const come = b.kind === "for" ? opzioni.per : b.kind === "for_each" ? opzioni.perOgni : opzioni.copia;
    const attesi = testiAttesi(b, come, livelli.get(b.id) ?? 1, f);
    // L'intestazione è il blocco, fra gli elementi; nella copia compatta la scritta sul bordo non è un blocco, e il
    // blocco è l'assegnazione dentro il riquadro.
    const compatta = b.kind === "assignment" && come === "compatta";
    const testa = d.elementi.filter((e) => e.id === b.id && e.dato === undefined && e.fase === undefined);
    const t = compatta ? riquadro!.didascalia : testa[0];
    if (compatta && (testa.length !== 1 || testa[0]!.forma !== "assegnazione")) difetti.push(`assegnazione della copia mancante ${b.id}`);
    if (!compatta && riquadro!.didascalia !== undefined) difetti.push(`scritta sul bordo di ${b.id} fuori dalla copia compatta`);
    if (t === undefined || (!compatta && testa.length !== 1) || t.forma !== "intestazione") difetti.push(`intestazione mancante ${b.id}`);
    else {
      if (t.testo !== attesi.intestazione) difetti.push(`intestazione di ${b.id}: «${t.testo}» invece di «${attesi.intestazione}»`);
      const r = t.riquadro;
      if (Math.abs(r.y + r.altezza / 2 - bordo.y) > 0.01 || r.x < bordo.x || r.x + r.larghezza > bordo.x + bordo.larghezza) difetti.push(`intestazione fuori dal bordo ${b.id}`);
    }
    // Dentro e fuori: le forme e le etichette del ciclo e del suo corpo dentro (della copia compatta, l'assegnazione),
    // ogni altra fuori.
    const suoi = new Set(idDi(figli(b)));
    const delCiclo = (id: string, e?: Elemento) => suoi.has(id) || (id === b.id && (e?.fase !== undefined || compatta));
    for (const e of d.elementi) {
      if (e.dato === undefined && e.id === b.id && e.fase === undefined && !compatta) continue;
      const proprio = e.dato === undefined && delCiclo(e.id, e);
      if (proprio && !dentro(e.riquadro, bordo)) difetti.push(`${nomeDi(e)} fuori dal riquadro di ${b.id}`);
      if (!proprio && sovrapposti(e.riquadro, bordo, 0)) difetti.push(`${nomeDi(e)} dentro il riquadro di ${b.id}`);
    }
    for (const x of d.etichette) {
      const proprio = suoi.has(x.blocco) || x.blocco === b.id;
      if (proprio !== dentro(x.riquadro, bordo)) difetti.push(`etichetta ${x.blocco}:${x.valore} ${proprio ? "fuori dal" : "dentro il"} riquadro di ${b.id}`);
    }
    // I blocchi aggiunti: le fasi della forma, i testi, il posto.
    const agg = d.elementi.filter((e) => e.id === b.id && e.fase !== undefined);
    aggiunti += agg.length;
    const fasi = (xs: readonly string[]) => [...xs].sort().join(", ");
    if (fasi(agg.map((e) => e.fase!)) !== fasi(Object.keys(attesi.fasi))) difetti.push(`fasi di ${b.id}: [${fasi(agg.map((e) => e.fase!))}] invece di [${fasi(Object.keys(attesi.fasi))}]`);
    for (const e of agg) if (attesi.fasi[e.fase!] !== undefined && e.testo !== attesi.fasi[e.fase!]) difetti.push(`testo della fase ${e.fase} di ${b.id}: «${e.testo}» invece di «${attesi.fasi[e.fase!]}»`);
    const di = (fase: string) => agg.find((e) => e.fase === fase)?.riquadro;
    const corpo = d.elementi.filter((e) => e.dato === undefined && suoi.has(e.id)).map((x) => x.riquadro);
    const [inizio, rombo, elemento, passo] = [di("inizio"), di("condizione"), di("elemento"), di("passo")];
    if (inizio && rombo && !(fondo(inizio) < rombo.y)) difetti.push(`partenza non sopra il rombo ${b.id}`);
    if (elemento && rombo && !(elemento.y > fondo(rombo))) difetti.push(`elemento preso non sotto il rombo ${b.id}`);
    if (elemento && corpo.some((r) => !(fondo(elemento) < r.y))) difetti.push(`elemento preso non in testa al corpo ${b.id}`);
    if (passo && corpo.some((r) => !(passo.y > fondo(r)))) difetti.push(`aumento non in fondo al corpo ${b.id}`);
    if (elemento && passo && !(fondo(elemento) < passo.y)) difetti.push(`aumento non in fondo al corpo ${b.id}`);
  }
  // Due riquadri: uno dentro l'altro (il ciclo dentro il corpo dell'altro), o separati.
  for (const a of d.riquadri)
    for (const b of d.riquadri) {
      if (a === b || !sovrapposti(a.bordo, b.bordo, 0)) continue;
      const corpoDi = (id: string) => idDi(figli(cicli.find((c) => c.id === id) ?? { id: "", kind: "comment", text: "" }));
      const bDentroA = corpoDi(a.blocco).includes(b.blocco);
      if (!(bDentroA && dentro(b.bordo, a.bordo)) && !corpoDi(b.blocco).includes(a.blocco)) difetti.push(`riquadri di ${a.blocco} e ${b.blocco} che si toccano`);
    }
  return { cicli: cicli.length, aggiunti };
}

/** La luce minima fra il testo del blocco della chiamata e le sue righe ai lati. */
const LUCE_DALLE_RIGHE = 8;

/** Il blocco della chiamata: due righe verticali alte quanto il blocco, dentro, alla stessa distanza dai due bordi, e il
 * testo (largo `larghezza`, misurata dalle prove) fra le due, con la luce. */
function esaminaLaChiamata(e: Elemento, larghezza: number): string[] {
  const r = e.riquadro;
  if (e.lati?.length !== 2) return [`righe ai lati mancanti ${e.id}`];
  const difetti: string[] = [];
  const [sinistra, destra] = [...e.lati].sort((a, b) => a[0].x - b[0].x) as [readonly [Punto, Punto], readonly [Punto, Punto]];
  for (const [a, b] of [sinistra, destra])
    if (a.x !== b.x || Math.abs(Math.min(a.y, b.y) - r.y) > EPS || Math.abs(Math.max(a.y, b.y) - (r.y + r.altezza)) > EPS || a.x <= r.x + EPS || a.x >= r.x + r.larghezza - EPS)
      difetti.push(`riga al lato fuori posto ${e.id}`);
  if (Math.abs(sinistra[0].x - r.x - (r.x + r.larghezza - destra[0].x)) > EPS) difetti.push(`righe ai lati non simmetriche ${e.id}`);
  const centro = e.riquadroTesto.x + e.riquadroTesto.larghezza / 2;
  if (centro - larghezza / 2 < sinistra[0].x + LUCE_DALLE_RIGHE - EPS || centro + larghezza / 2 > destra[0].x - LUCE_DALLE_RIGHE + EPS) difetti.push(`testo sulle righe ai lati ${e.id}`);
  return difetti;
}

function esamina(d: Disegno, funzione: Funzione, opzioni: OpzioniDelDisegno = opzioniPredefinite, misuraDelTesto: MisuraDelTesto = misura): Esame {
  const difetti: string[] = [];
  // Il testo con uno stile, misurato QUI pezzo per pezzo con la misura delle prove (un oracolo che non passa dal codice
  // dell'impaginazione): uniti, i pezzi sono le righe; il riquadro del testo ha quella larghezza e sta nella forma; il
  // blocco della chiamata ha le sue righe ai lati, il testo fra le due. Un salto per blocco `call` dell'albero.
  let [conStile, chiamate] = [0, 0];
  const larghezzaVera = (e: Elemento) =>
    e.pezzi === undefined ? Math.max(...e.righe.map((r) => misuraDelTesto(r))) : Math.max(...e.pezzi.map((riga) => riga.reduce((s, p) => s + misuraDelTesto(p.testo, p.stile), 0)));
  for (const e of d.elementi) {
    if (e.forma === "chiamata") {
      chiamate++;
      if (!e.pezzi?.flat().some((p) => p.stile === "grassetto")) difetti.push(`salto senza il nome in grassetto ${e.id}`);
      difetti.push(...esaminaLaChiamata(e, larghezzaVera(e)));
    }
    if (e.pezzi === undefined) continue;
    conStile++;
    if (e.pezzi.length !== e.righe.length || e.pezzi.some((riga, i) => riga.map((p) => p.testo).join("") !== e.righe[i])) difetti.push(`pezzi diversi dalle righe ${nomeDi(e)}`);
    const t = e.riquadroTesto;
    const w = larghezzaVera(e);
    if (Math.abs(w - t.larghezza) > EPS) difetti.push(`testo con lo stile misurato male ${nomeDi(e)}: ${w.toFixed(1)} contro ${t.larghezza.toFixed(1)}`);
    const vero = { x: t.x + t.larghezza / 2 - w / 2, y: t.y, larghezza: w, altezza: t.altezza };
    if (!angoli(vero).every((p) => dentroForma(e, p))) difetti.push(`testo con lo stile fuori dalla forma ${nomeDi(e)}`);
  }
  const salti = blocchiDi(funzione.body).filter((b) => b.kind === "call").length;
  if (chiamate !== salti) difetti.push(`salti disegnati ${chiamate} su ${salti}`);
  if (funzione.kind !== "main") {
    const inizio = d.elementi.find((e) => e.forma === "inizio");
    if (!inizio?.pezzi?.flat().some((p) => p.stile === "grassetto" && p.testo === funzione.name)) difetti.push(`il nome non in grassetto nell'intestazione di ${funzione.name}`);
  }
  // La scritta sul bordo della copia compatta conta come una forma: non tocca le altre, il suo testo sta dentro.
  const didascalie = d.riquadri.flatMap((r) => (r.didascalia ? [r.didascalia] : []));
  const forme = [...d.elementi.map((e) => ({ nome: nomeDi(e), r: e.riquadro })), ...didascalie.map((e) => ({ nome: `scritta ${e.id}`, r: e.riquadro }))];
  const etichette = d.etichette.map((t) => ({ nome: `${t.blocco}:${t.valore}`, r: t.riquadro }));
  const tutti = [...forme, ...etichette];
  let coppie = 0;
  tutti.forEach((a, i) =>
    tutti.slice(i + 1).forEach((b) => {
      coppie++;
      if (sovrapposti(a.r, b.r, DISTANZA_MINIMA)) difetti.push(`sovrapposti ${a.nome} e ${b.nome}`);
    }),
  );
  for (const e of [...d.elementi, ...didascalie]) {
    if (!angoli(e.riquadroTesto).every((p) => dentroForma(e, p))) difetti.push(`testo fuori dalla forma ${nomeDi(e)}`);
  }
  let tratti = 0;
  for (const c of d.connettori) {
    c.punti.slice(1).forEach((b, i) => {
      const a = c.punti[i]!;
      tratti++;
      if (a.x !== b.x && a.y !== b.y) difetti.push(`tratto obliquo ${JSON.stringify([a, b])}`);
      for (const t of tutti) if (attraversa(a, b, t.r)) difetti.push(`connettore dentro ${t.nome}`);
    });
  }
  // Le linee di flusso: intere (nessuna ricomincia dove un'altra finisce, fuori da un'unione) e con il
  // tratto finale lungo abbastanza da vedere la linea oltre la punta.
  const flussi = d.connettori.filter((c) => c.genere === "flusso");
  const dallUnione = (p: Punto) => d.ricongiungimenti.some((u) => Math.abs(Math.hypot(p.x - u.centro.x, p.y - u.centro.y) - u.raggio) < 0.01);
  for (const c of flussi) {
    const [a, b] = [c.punti[c.punti.length - 2]!, c.punti[c.punti.length - 1]!];
    if (Math.hypot(b.x - a.x, b.y - a.y) < tema.punta + LINEA_VISIBILE) difetti.push(`linea corta verso ${JSON.stringify(b)}`);
    if (!dallUnione(b) && flussi.some((x) => x !== c && Math.hypot(x.punti[0]!.x - b.x, x.punti[0]!.y - b.y) < 0.01)) difetti.push(`linea spezzata in ${JSON.stringify(b)}`);
  }
  // I punti di unione: liberi da forme ed etichette, almeno due linee che arrivano e una che esce, sul bordo.
  for (const u of d.ricongiungimenti) {
    const r = u.raggio;
    const cerchio = { x: u.centro.x - r, y: u.centro.y - r, larghezza: 2 * r, altezza: 2 * r };
    for (const t of tutti) if (sovrapposti(cerchio, t.r, 2)) difetti.push(`unione sopra ${t.nome}`);
    const sulBordo = (p: Punto) => Math.abs(Math.hypot(p.x - u.centro.x, p.y - u.centro.y) - r) < 0.01;
    const arrivi = flussi.filter((c) => sulBordo(c.punti[c.punti.length - 1]!)).length;
    const uscite = flussi.filter((c) => sulBordo(c.punti[0]!)).length;
    if (arrivi < 2 || uscite !== 1) difetti.push(`unione con ${arrivi} arrivi e ${uscite} uscite`);
  }
  let condizioni = 0;
  for (const e of d.elementi.filter((x) => x.forma === "condizione")) {
    condizioni++;
    const vero = d.etichette.find((t) => t.blocco === e.id && t.valore === "vero");
    const falso = d.etichette.find((t) => t.blocco === e.id && t.valore === "falso");
    const centro = e.riquadro.x + e.riquadro.larghezza / 2;
    if (!vero || !falso) difetti.push(`etichette mancanti ${e.id}`);
    else if (!(vero.riquadro.x > centro && falso.riquadro.x + falso.riquadro.larghezza < centro)) difetti.push(`Vero non a destra ${e.id}`);
  }
  const fuori = (r: Rettangolo) => r.x < -EPS || r.y < -EPS || r.x + r.larghezza > d.larghezza + EPS || r.y + r.altezza > d.altezza + EPS;
  for (const t of tutti) if (fuori(t.r)) difetti.push(`fuori dal disegno ${t.nome}`);
  const rami = esaminaRami(d, funzione, opzioni, difetti);
  const riquadri = esaminaIRiquadri(d, funzione, opzioni, difetti);
  return {
    difetti,
    premesse: {
      coppie,
      testi: d.elementi.length,
      tratti,
      condizioni,
      linee: flussi.length,
      unioni: d.ricongiungimenti.length,
      rami: rami.rombi,
      chiusi: rami.chiusi,
      cicli: riquadri.cicli,
      riquadri: d.riquadri.length,
      aggiunti: riquadri.aggiunti,
      conStile,
      chiamate,
    },
  };
}

/** Lo stesso `esamina`, col nome che i controlli positivi possono usare: lì un `esamina` locale lo nasconde. */
const esaminaConLAlbero = esamina;

const leDueForme: readonly OpzioniDelDisegno[] = [
  { ...opzioniPredefinite, condizioniLunghe: "su-due-righe" },
  { ...opzioniPredefinite, condizioniLunghe: "su-una-riga" },
];

/** Le forme dei cicli, tre combinazioni: ogni forma del `per` (2) e del `per ogni` (3) almeno una volta, e i due
 * cicli uno aperto e l'altro chiuso nei due versi (i riquadri si annidano). */
const leFormeDeiCicli = [
  { per: "aperto", perOgni: "posizione", copia: "espansa" },
  { per: "chiuso", perOgni: "parole", copia: "compatta" },
  { per: "aperto", perOgni: "chiuso", copia: "espansa" },
] as const satisfies readonly Pick<OpzioniDelDisegno, "per" | "perOgni" | "copia">[];

/** Le due forme delle condizioni per le tre dei cicli. */
const leForme: readonly OpzioniDelDisegno[] = leDueForme.flatMap((o) => leFormeDeiCicli.map((c) => ({ ...o, ...c })));
const nomeDelleForme = (o: OpzioniDelDisegno) => `${o.condizioniLunghe}, per ${o.per}, per ogni ${o.perOgni}, copia ${o.copia}`;

function esaminaTutti(
  fn: Impagina,
  geometria: GeometriaDelTema,
  alberi: readonly Albero[],
  opzioni: OpzioniDelDisegno,
  misuraDelTesto: MisuraDelTesto = misura,
) {
  const esiti = alberi.map((a) => ({ nome: a.nome, esame: esamina(disegnaAlbero(fn, a, geometria, misuraDelTesto, opzioni), a.funzione, opzioni, misuraDelTesto) }));
  const somma = (k: keyof Esame["premesse"]) => esiti.reduce((s, e) => s + e.esame.premesse[k], 0);
  return {
    sbagliati: esiti.filter((e) => e.esame.difetti.length > 0).map((e) => `${e.nome}: ${e.esame.difetti.slice(0, 3).join("; ")}`),
    premesse: {
      alberi: esiti.length,
      coppie: somma("coppie"),
      testi: somma("testi"),
      tratti: somma("tratti"),
      condizioni: somma("condizioni"),
      linee: somma("linee"),
      unioni: somma("unioni"),
      rami: somma("rami"),
      chiusi: somma("chiusi"),
      cicli: somma("cicli"),
      riquadri: somma("riquadri"),
      aggiunti: somma("aggiunti"),
      conStile: somma("conStile"),
      chiamate: somma("chiamate"),
    },
  };
}

/** Le due forme insieme: i difettosi di ciascuna, col nome della forma davanti (al più tre difetti per albero). */
function esaminaLeDueForme(fn: Impagina, geometria: GeometriaDelTema, alberi: readonly Albero[]) {
  return leDueForme.flatMap((o) => esaminaTutti(fn, geometria, alberi, o).sbagliati.map((s) => `${o.condizioniLunghe} ${s}`));
}

/** Tutti i difetti di tutti gli alberi, nelle forme date (le due delle condizioni, se non se ne danno): per cercare
 * il messaggio di un rilevatore, che fra i primi tre di un albero potrebbe non esserci. */
function messaggiDelleDueForme(fn: Impagina, forme: readonly OpzioniDelDisegno[] = leDueForme): string[] {
  return forme.flatMap((o) => tuttiGliAlberi.flatMap((a) => esaminaConLAlbero(disegnaAlbero(fn, a, tema, misura, o), a.funzione, o).difetti));
}

// ------------------------------------------------------------------------------------------ le prove

describe("geometria", () => {
  for (const opzioni of leForme) {
    for (const { nome: nomeMisura, misura: misuraDelTesto } of leMisure) {
      test(`nessun difetto su corpus, riferimento, alberi generati e costruiti apposta (${nomeDelleForme(opzioni)}, misura ${nomeMisura})`, () => {
        const { sbagliati, premesse } = esaminaTutti(impagina, tema, tuttiGliAlberi, opzioni, misuraDelTesto);
        console.log(
          `${nomeDelleForme(opzioni)}, misura ${nomeMisura}: alberi corpus ${corpus.length}, generati ${generati.length}, apposta ${costruiti.length}; ` +
            `forme ${premesse.testi}, coppie ${premesse.coppie}, tratti ${premesse.tratti}, linee ${premesse.linee}, ` +
            `unioni ${premesse.unioni}, condizioni ${premesse.condizioni}, rami guardati ${premesse.rami}, cicli chiusi ${premesse.chiusi}, ` +
            `cicli ${premesse.cicli}, riquadri ${premesse.riquadri}, blocchi aggiunti dai riquadri ${premesse.aggiunti}; difettosi ${sbagliati.length}`,
        );
        expect(sbagliati).toEqual([]);
        expect(corpus.length).toBe(76);
        // La tappa 3: 53 progetti, 130 funzioni; la tappa 4: 22 progetti, 53 funzioni; i progetti generati coi salti, 296.
        expect([progettiDellaTappa3.length, progettiDellaTappa4.length, corpusTappa3.length, coiSalti.length]).toEqual([53, 22, 183, 296]);
        expect(premesse.alberi).toBe(corpus.length + corpusTappa3.length + NUMERO_GENERATI + coiSalti.length + costruiti.length);
        // Le premesse delle forme nuove: salti disegnati (uno per blocco dell'albero: lo guarda l'esame) e testi con uno
        // stile.
        console.log(`${nomeDelleForme(opzioni)}, misura ${nomeMisura}: tappa 3 ${corpusTappa3.length}, coi salti ${coiSalti.length}; salti ${premesse.chiamate}, testi con uno stile ${premesse.conStile}`);
        expect(premesse.chiamate).toBeGreaterThan(100);
        expect(premesse.conStile).toBeGreaterThan(premesse.chiamate);
        // Le premesse: ci sono linee e condizioni da guardare, ogni condizione e ogni ciclo chiuso ha il suo punto di
        // unione, il rilevatore dei rami ha guardato ogni condizione dell'albero, e ci sono cicli coi loro riquadri.
        expect(premesse.linee).toBeGreaterThan(0);
        expect(premesse.condizioni).toBeGreaterThan(0);
        expect(premesse.unioni).toBe(premesse.condizioni + premesse.chiusi);
        expect(premesse.rami).toBe(premesse.condizioni);
        expect(premesse.cicli).toBeGreaterThan(100);
        expect(premesse.riquadri).toBe(premesse.cicli);
        expect(premesse.chiusi > 0).toBe(opzioni.per === "chiuso" || opzioni.perOgni === "chiuso");
        expect(premesse.aggiunti).toBeGreaterThan(0);
      });
    }
  }

  test("la forma «Su due righe» manda a capo condizioni vere, «Su una riga» mai", () => {
    const aCapo = (o: OpzioniDelDisegno) =>
      tuttiGliAlberi.flatMap((a) => disegnaAlbero(impagina, a, tema, misura, o).elementi).filter((e) => e.righe.length > 1).length;
    const [due, una] = [aCapo(leDueForme[0]!), aCapo(leDueForme[1]!)];
    console.log(`condizioni a capo: su due righe ${due}, su una riga ${una}`);
    expect(due).toBeGreaterThan(0);
    expect(una).toBe(0);
    // La predefinita è «Su due righe»: il riferimento manda a capo `voto >= 1 and voto <= 10`.
    const predefinita = impagina(riferimento.funzione, tema, misura, testi).elementi.find((e) => e.righe.length > 1);
    expect(predefinita?.righe).toEqual(["voto >= 1", "and voto <= 10"]);
  });

  test("gli alberi generati coprono ogni genere delle tappe 1 e 2, la profondità dichiarata, i rami vuoti e i testi lunghi", () => {
    const generi = new Set<string>();
    let profonditaMassima = 0;
    let [testiLunghi, fuoriDalPianoDiBase] = [0, 0];
    // I rami vuoti per specie: il rilevatore dei rami ha un percorso per ciascuna. Dei cicli anche i passi (assente,
    // 1, positivo, negativo: l'intestazione e la condizione cambiano) e un `per ogni` dentro un altro (la posizione
    // col numero del livello).
    const vuoti = {
      "then vuoto": 0,
      "else vuoto": 0,
      "corpo del mentre vuoto": 0,
      "corpo del mentre di soli commenti": 0,
      "corpo del ripeti vuoto": 0,
      "corpo del per vuoto": 0,
      "corpo del per ogni vuoto": 0,
      "per senza passo": 0,
      "per col passo 1": 0,
      "per col passo positivo": 0,
      "per col passo negativo": 0,
      "per ogni dentro un per ogni": 0,
    };
    const soliCommenti = (bs: readonly Blocco[]) => bs.length > 0 && bs.every((x) => x.kind === "comment");
    const testiDi = (b: Blocco): string[] =>
      b.kind === "assignment" ? [b.target, b.value]
      : b.kind === "read" ? [b.target]
      : b.kind === "write" ? [...b.values]
      : b.kind === "comment" ? [b.text]
      : b.kind === "if" || b.kind === "while" || b.kind === "repeat" ? [b.condition]
      : b.kind === "for" ? [b.counter, b.from, b.to]
      : b.kind === "for_each" ? [b.item, b.source]
      : [];
    for (const g of generati) for (const livello of livelliDeiPerOgni(g.funzione.body).values()) vuoti["per ogni dentro un per ogni"] += Number(livello > 1);
    const visita = (blocchi: readonly Blocco[], p: number) => {
      for (const b of blocchi) {
        generi.add(b.kind);
        profonditaMassima = Math.max(profonditaMassima, p);
        for (const t of testiDi(b)) {
          if ([...t].length >= 100) testiLunghi++;
          if ([...t].some((c) => c.codePointAt(0)! > 0xffff)) fuoriDalPianoDiBase++;
        }
        if (b.kind === "if") {
          vuoti["then vuoto"] += Number(b.then.length === 0);
          vuoti["else vuoto"] += Number(b.else.length === 0);
          visita(b.then, p + 1), visita(b.else, p + 1);
        }
        if (b.kind === "while") {
          vuoti["corpo del mentre vuoto"] += Number(b.body.length === 0);
          vuoti["corpo del mentre di soli commenti"] += Number(soliCommenti(b.body));
          visita(b.body, p + 1);
        }
        if (b.kind === "repeat") {
          vuoti["corpo del ripeti vuoto"] += Number(b.body.length === 0);
          visita(b.body, p + 1);
        }
        if (b.kind === "for") {
          vuoti["corpo del per vuoto"] += Number(b.body.length === 0);
          vuoti["per senza passo"] += Number(b.step === undefined);
          vuoti["per col passo 1"] += Number(b.step === 1);
          vuoti["per col passo positivo"] += Number(b.step !== undefined && b.step > 1);
          vuoti["per col passo negativo"] += Number(b.step !== undefined && b.step < 0);
          visita(b.body, p + 1);
        }
        if (b.kind === "for_each") {
          vuoti["corpo del per ogni vuoto"] += Number(b.body.length === 0);
          visita(b.body, p + 1);
        }
      }
    };
    generati.forEach((g) => visita(g.funzione.body, 0));
    console.log(
      `generi ${[...generi].sort().join(", ")}; profondità massima ${profonditaMassima}; ${Object.entries(vuoti).map(([k, n]) => `${k} ${n}`).join(", ")}; ` +
        `testi di almeno 100 caratteri ${testiLunghi}; testi con un carattere fuori dal piano di base ${fuoriDalPianoDiBase}`,
    );
    expect([...generi].sort()).toEqual(["assignment", "comment", "for", "for_each", "if", "read", "repeat", "while", "write"]);
    expect(profonditaMassima).toBe(PROFONDITA);
    for (const [specie, n] of Object.entries(vuoti)) expect({ specie, presente: n > 0 }).toEqual({ specie, presente: true });
    expect(testiLunghi).toBeGreaterThan(0);
    expect(fuoriDalPianoDiBase).toBeGreaterThan(0);
  });

  test("il riferimento usa ogni genere della tappa 1, annidati", () => {
    const generi = new Set<string>();
    const visita = (blocchi: readonly Blocco[]) =>
      blocchi.forEach((b) => {
        generi.add(b.kind);
        if (b.kind === "if") visita(b.then), visita(b.else);
        if (b.kind === "while" || b.kind === "repeat") visita(b.body);
      });
    visita(riferimento.funzione.body);
    expect([...generi].sort()).toEqual(["assignment", "comment", "if", "read", "repeat", "while", "write"]);
    const d = impagina(riferimento.funzione, tema, misura, testi);
    console.log(`riferimento: ${Math.round(d.larghezza)} × ${Math.round(d.altezza)} px, forme ${d.elementi.length}`);
  });

  // La clausola «una pagina» della tappa 1: con «Adatta alla finestra» il riferimento si
  // vede tutto e il carattere resta di almeno 6 px («Adatta» serve a orientarsi; per leggere c'è il 100%).
  // Erano 7 px finché le linee fra i blocchi erano di 28 px: allungate a 36 per la luce intorno ai punti di
  // inserimento, la soglia è scesa a 6.
  // Qui con la misura delle prove e un'area DICHIARATA di 1540 × 1000, sulle due forme; la misura vera la fa
  // il browser (`e2e/finestra.e2e.ts`). L'area viene da quella misurata nella finestra vera a 1920 × 1080
  // con le due viste aperte, 1496 × 1028: qui è più bassa di 28 px, quindi più severa in altezza, che è
  // quella che decide; è più larga di 44 px, che oggi non conta (adattato, il riferimento occupa circa 611
  // px di larghezza). Il margine è piccolo (6,24 px), e ogni allungamento della geometria lo consuma.
  // Con gli operatori a parola mostrati in italiano, che allungano i testi (`converti_a_reale`), e con i
  // nomi del file (l'inglese dell'interfaccia).
  // Coi valori iniziali NASCOSTI (un'impostazione li nasconde, e la soglia resta di 6 px); coi
  // valori mostrati il riferimento ha cinque blocchi in più sotto «Inizio» e la misura si scrive, senza soglia.
  const SOGLIA_ADATTA = 6;
  const leDueLingue = [
    { lingua: "it", testi: { ...testi, espressione: (t: string) => traduciEspressione(t, nomiDegliOperatori.it) } },
    { lingua: "en", testi },
  ];
  for (const opzioni of leDueForme) {
    for (const { lingua, testi: testiDellaLingua } of leDueLingue) {
      test(`il riferimento coi valori iniziali nascosti, adattato a 1540 × 1000, ha il carattere di almeno ${SOGLIA_ADATTA} px (${opzioni.condizioniLunghe}, ${lingua})`, () => {
        const scala = (d: Disegno) => Math.min(1540 / d.larghezza, 1000 / d.altezza, 1);
        const nascosti = { ...opzioni, valoriIniziali: "nascosti" } as const;
        const d = impagina(riferimento.funzione, tema, misura, testiDellaLingua, nascosti);
        const mostrati = impagina(riferimento.funzione, tema, misura, testiDellaLingua, { ...opzioni, valoriIniziali: "mostrati" });
        console.log(
          `${opzioni.condizioniLunghe} ${lingua}: riferimento coi valori nascosti ${Math.round(d.larghezza)} × ${Math.round(d.altezza)} px; adattato: scala ${scala(d).toFixed(3)}, ` +
            `carattere ${(scala(d) * tema.carattere).toFixed(2)} px; coi valori mostrati (senza soglia) ${Math.round(mostrati.larghezza)} × ${Math.round(mostrati.altezza)} px, ` +
            `carattere ${(scala(mostrati) * tema.carattere).toFixed(2)} px`,
        );
        expect(scala(d) * tema.carattere).toBeGreaterThanOrEqual(SOGLIA_ADATTA);
        // La premessa: i valori mostrati allungano davvero il disegno (cinque blocchi), quindi la prova sceglie.
        expect(mostrati.altezza - d.altezza).toBeCloseTo(325, 6);
        // Controllo positivo: il riferimento col corpo raddoppiato non ci sta.
        const doppio = { ...riferimento.funzione, body: [...riferimento.funzione.body, ...riferimento.funzione.body] };
        expect(scala(impagina(doppio, tema, misura, testiDellaLingua, nascosti)) * tema.carattere).toBeLessThan(SOGLIA_ADATTA);
      });
    }
  }
});

describe("il taglio delle condizioni lunghe, sulle parole", () => {
  test("prima di and od or fuori dalle parentesi, il più vicino al centro", () => {
    expect(righeDellaCondizione("voto >= 1 and voto <= 10")).toEqual(["voto >= 1", "and voto <= 10"]);
    expect(righeDellaCondizione("a < 1 or b < 2 or c < 3 or d < 4")).toEqual(["a < 1 or b < 2", "or c < 3 or d < 4"]);
    expect(righeDellaCondizione("(a and b) or c == 2")).toEqual(["(a and b)", "or c == 2"]);
    // Il taglio conta i codici, non le unità UTF-16: un carattere fuori dal piano di base prima del taglio
    // (con le unità UTF-16 la seconda riga comincerebbe con uno spazio).
    expect(righeDellaCondizione('s == "😀" and t == 1')).toEqual(['s == "😀"', "and t == 1"]);
  });
  test("mai dentro un letterale, mai senza un and od or fuori dalle parentesi, mai su un testo illeggibile", () => {
    // Controllo positivo del taglio sulle parole: un taglio sul testo cadrebbe dentro il letterale.
    expect(righeDellaCondizione('s == "uno and due"')).toEqual(['s == "uno and due"']);
    expect(righeDellaCondizione("not (a and b)")).toEqual(["not (a and b)"]);
    expect(righeDellaCondizione("somma / contati > 1000000")).toEqual(["somma / contati > 1000000"]);
    expect(righeDellaCondizione('a and "aperta')).toEqual(['a and "aperta']);
  });
});

describe("controlli positivi dei rilevatori (un disegno alterato apposta)", () => {
  const buono = impagina(riferimento.funzione, tema, misura, testi);
  const [primo, secondo] = [buono.elementi[1]!, buono.elementi[2]!];
  const condizione = buono.elementi.find((e) => e.forma === "condizione")!;
  const esamina = (d: Disegno) => esaminaConLAlbero(d, riferimento.funzione);
  /** I blocchi del riferimento di un genere, a ogni profondità. */
  const bloccoDi = <K extends Blocco["kind"]>(kind: K): Extract<Blocco, { kind: K }>[] =>
    blocchiDi(riferimento.funzione.body).filter((b) => b.kind === kind) as Extract<Blocco, { kind: K }>[];
  const primoDi = <K extends Blocco["kind"]>(kind: K) => bloccoDi(kind)[0]!;
  /** Il disegno buono con gli elementi di questi `id` specchiati attorno a una verticale. */
  const specchiati = (ids: readonly string[], asse: number): Disegno => ({
    ...buono,
    elementi: buono.elementi.map((e) => (ids.includes(e.id) ? { ...e, riquadro: { ...e.riquadro, x: 2 * asse - e.riquadro.x - e.riquadro.larghezza } } : e)),
  });
  const centroDi = (id: string) => {
    const r = buono.elementi.find((e) => e.id === id)!.riquadro;
    return r.x + r.larghezza / 2;
  };

  test("il disegno buono è senza difetti", () => expect(esamina(buono).difetti).toEqual([]));

  test("un tratto obliquo", () => {
    const obliquo = { genere: "flusso" as const, punti: [{ x: 1, y: 1 }, { x: 2, y: 2 }] };
    expect(esamina({ ...buono, connettori: [...buono.connettori, obliquo] }).difetti).toContain(`tratto obliquo ${JSON.stringify(obliquo.punti)}`);
  });

  test("le etichette di una condizione tolte", () => {
    const alterato = { ...buono, etichette: buono.etichette.filter((t) => t.blocco !== condizione.id) };
    expect(esamina(alterato).difetti).toContain(`etichette mancanti ${condizione.id}`);
  });

  test("il ramo Vero di un se disegnato a sinistra, il corpo di un mentre a sinistra", () => {
    const se = bloccoDi("if").find((b) => b.then.length > 0)!;
    expect(esamina(specchiati(idDi(se.then), centroDi(se.id))).difetti).toContain(`ramo Vero non a destra ${se.id}`);
    const conElse = bloccoDi("if").find((b) => b.else.length > 0)!;
    expect(esamina(specchiati(idDi(conElse.else), centroDi(conElse.id))).difetti).toContain(`ramo Falso non a sinistra ${conElse.id}`);
    const mentre = primoDi("while");
    expect(esamina(specchiati(idDi(mentre.body), centroDi(mentre.id))).difetti).toContain(`corpo del mentre non a destra ${mentre.id}`);
  });

  test("il giro di ritorno del ripeti e l'uscita Falso dei cicli dal vertice sbagliato", () => {
    // Ogni linea che parte da un vertice laterale di un rombo, specchiata attorno al suo centro: le uscite
    // scambiano lato.
    const specchiate = (id: string) => {
      const c = buono.elementi.find((e) => e.id === id)!;
      const asse = c.riquadro.x + c.riquadro.larghezza / 2;
      const laterali = [c.vertici[1]!, c.vertici[3]!];
      return {
        ...buono,
        connettori: buono.connettori.map((l) =>
          laterali.some((v) => Math.abs(l.punti[0]!.x - v.x) < 0.01 && Math.abs(l.punti[0]!.y - v.y) < 0.01)
            ? { ...l, punti: l.punti.map((p) => ({ x: 2 * asse - p.x, y: p.y })) }
            : l,
        ),
      };
    };
    const ripeti = primoDi("repeat");
    const difettiRipeti = esamina(specchiate(ripeti.id)).difetti;
    expect(difettiRipeti).toContain(`giro del ripeti non dal vertice destro ${ripeti.id}`);
    expect(difettiRipeti).toContain(`uscita Falso del ripeti non a sinistra ${ripeti.id}`);
    // Il corpo del mentre resta a destra, ma la linea che ci entra parte dal vertice sinistro: lo vede la sola
    // seconda metà del controllo sull'ingresso nel corpo.
    const mentre = primoDi("while");
    const difettiMentre = esamina(specchiate(mentre.id)).difetti;
    expect(difettiMentre).toContain(`uscita Falso del mentre non a sinistra ${mentre.id}`);
    expect(difettiMentre).toContain(`corpo del mentre non a destra ${mentre.id}`);
  });

  test("un rombo tolto, e un se senza la linea da un vertice laterale", () => {
    const se = primoDi("if");
    expect(esamina({ ...buono, elementi: buono.elementi.filter((e) => e.id !== se.id) }).difetti).toContain(`rombo mancante ${se.id}`);
    const c = buono.elementi.find((e) => e.id === se.id)!;
    for (const [vertice, messaggio] of [
      [c.vertici[1]!, `ramo Vero non a destra ${se.id}`],
      [c.vertici[3]!, `ramo Falso non a sinistra ${se.id}`],
    ] as const) {
      const senzaLinea = buono.connettori.filter((l) => !(Math.abs(l.punti[0]!.x - vertice.x) < 0.01 && Math.abs(l.punti[0]!.y - vertice.y) < 0.01));
      expect(senzaLinea.length).toBe(buono.connettori.length - 1);
      expect(esamina({ ...buono, connettori: senzaLinea }).difetti).toContain(messaggio);
    }
  });

  test("il testo largo quanto il parallelogramma, e il testo più largo del rettangolo", () => {
    for (const genere of ["lettura", "assegnazione"] as const) {
      const e = buono.elementi.find((x) => x.forma === genere)!;
      const testo = { ...e.riquadroTesto, x: e.riquadro.x - 1, larghezza: e.riquadro.larghezza + 2 };
      const alterato = { ...buono, elementi: buono.elementi.map((x) => (x === e ? { ...x, riquadroTesto: testo } : x)) };
      expect(esamina(alterato).difetti).toContain(`testo fuori dalla forma ${nomeDi(e)}`);
    }
    // Il parallelogramma: un testo dentro il suo rettangolo ma sopra un lato obliquo.
    const p = buono.elementi.find((x) => x.forma === "lettura")!;
    const sulLato = { ...p.riquadroTesto, x: p.riquadro.x + 1, larghezza: p.riquadro.larghezza - 2 };
    expect(esamina({ ...buono, elementi: buono.elementi.map((x) => (x === p ? { ...x, riquadroTesto: sulLato } : x)) }).difetti).toContain(`testo fuori dalla forma ${nomeDi(p)}`);
  });

  test("una forma sopra un'altra: sovrapposizione", () => {
    const alterato = { ...buono, elementi: buono.elementi.map((e) => (e === secondo ? { ...e, riquadro: primo.riquadro } : e)) };
    expect(esamina(alterato).difetti.some((x) => x.startsWith("sovrapposti"))).toBe(true);
  });

  test("il testo largo quanto il rettangolo del rombo: fuori dalla forma, dentro il rettangolo", () => {
    const r = condizione.riquadro;
    const testo = { ...condizione.riquadroTesto, x: r.x + 2, larghezza: r.larghezza - 4 };
    const alterato = { ...buono, elementi: buono.elementi.map((e) => (e === condizione ? { ...e, riquadroTesto: testo } : e)) };
    expect(esamina(alterato).difetti).toContain(`testo fuori dalla forma ${condizione.id}`);
  });

  test("il testo largo quanto l'ovale: fuori dalle estremità curve", () => {
    const inizio = buono.elementi[0]!;
    const testo = { ...inizio.riquadroTesto, x: inizio.riquadro.x + 1, larghezza: inizio.riquadro.larghezza - 2 };
    const alterato = { ...buono, elementi: buono.elementi.map((e) => (e === inizio ? { ...e, riquadroTesto: testo } : e)) };
    expect(esamina(alterato).difetti).toContain(`testo fuori dalla forma ${inizio.id}`);
  });

  test("un connettore che taglia una forma", () => {
    const r = primo.riquadro;
    const taglio = { genere: "flusso" as const, punti: [{ x: r.x - 10, y: r.y + r.altezza / 2 }, { x: r.x + r.larghezza + 10, y: r.y + r.altezza / 2 }] };
    expect(esamina({ ...buono, connettori: [...buono.connettori, taglio] }).difetti).toContain(`connettore dentro ${nomeDi(primo)}`);
  });

  test("Vero e Falso scambiati", () => {
    const alterato = {
      ...buono,
      etichette: buono.etichette.map((t) => (t.blocco === condizione.id ? { ...t, valore: t.valore === "vero" ? ("falso" as const) : ("vero" as const) } : t)),
    };
    expect(esamina(alterato).difetti).toContain(`Vero non a destra ${condizione.id}`);
  });

  test("una forma fuori dal disegno", () => {
    expect(esamina({ ...buono, larghezza: buono.larghezza / 2 }).difetti.some((x) => x.startsWith("fuori dal disegno"))).toBe(true);
  });

  test("una linea col tratto finale corto: quasi tutta punta", () => {
    const linea = buono.connettori.find((c) => c.genere === "flusso")!;
    const fine = linea.punti[linea.punti.length - 1]!;
    const corta = { genere: "flusso" as const, punti: [{ x: fine.x, y: fine.y - (tema.punta + 4) }, fine] };
    const alterato = { ...buono, connettori: buono.connettori.map((c) => (c === linea ? corta : c)) };
    expect(esamina(alterato).difetti).toContain(`linea corta verso ${JSON.stringify(fine)}`);
  });

  test("una linea spezzata in due in un punto libero", () => {
    const linea = buono.connettori.find((c) => c.genere === "flusso" && c.punti.length === 2)!;
    const [a, b] = [linea.punti[0]!, linea.punti[1]!];
    const mezzo = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const pezzi = [
      { genere: "flusso" as const, punti: [a, mezzo] },
      { genere: "flusso" as const, punti: [mezzo, b] },
    ];
    const alterato = { ...buono, connettori: [...buono.connettori.filter((c) => c !== linea), ...pezzi] };
    expect(esamina(alterato).difetti).toContain(`linea spezzata in ${JSON.stringify(mezzo)}`);
  });

  test("un punto di unione senza le sue linee, e uno sopra una forma", () => {
    const u = buono.ricongiungimenti[0]!;
    const spostato = { ...u, centro: { x: u.centro.x + 3, y: u.centro.y } };
    expect(esamina({ ...buono, ricongiungimenti: [spostato] }).difetti.some((x) => x.startsWith("unione con 0 arrivi"))).toBe(true);
    const c = primo.riquadro;
    const sopra = { ...u, centro: { x: c.x + c.larghezza / 2, y: c.y + c.altezza / 2 } };
    expect(esamina({ ...buono, ricongiungimenti: [sopra] }).difetti).toContain(`unione sopra ${nomeDi(primo)}`);
  });
});

// ---------------------------------------------------------------------- mutazioni dell'impaginazione

// Il sorgente si copia in una cartella temporanea con gli import resi assoluti; la copia senza mutazioni
// è il controllo che la copia funzioni (0 difettosi), ogni mutazione deve fare almeno un difettoso. Ogni
// sostituzione deve trovare il suo testo una volta sola. Le mutazioni dei rami (lo scambio nel `se`, lo
// specchio di `mentre` e di `ripeti`: il codice resta simmetrico, quindi nessun altro rilevatore le vede)
// devono essere rosse col messaggio del rilevatore dei rami.
const sorgente = readFileSync(join(import.meta.dir, "impaginazione.ts"), "utf8");
interface Mutazione {
  sostituzioni: [string, string][];
  /** Il messaggio che la mutazione deve far comparire, se non basta un difettoso qualunque. */
  messaggio?: string;
}
const mutazioni: Record<string, Mutazione> = {
  "nessuna (controllo positivo)": { sostituzioni: [] },
  "il ramo Vero ignora la larghezza del ramo": {
    sostituzioni: [["const xVero = Math.max(c.larghezza / 2 + tema.uscitaRombo, vero.sinistra + tema.distanzaRami / 2);", "const xVero = c.larghezza / 2 + tema.uscitaRombo;"]],
  },
  "il ramo Falso ignora la larghezza del ramo": {
    sostituzioni: [["const xFalso = -Math.max(c.larghezza / 2 + tema.uscitaRombo, falso.destra + tema.distanzaRami / 2);", "const xFalso = -(c.larghezza / 2 + tema.uscitaRombo);"]],
  },
  "margine del rombo tolto": { sostituzioni: [["const a = ((wTesto / 2 + mx) * k) / (k - 1);", "const a = wTesto / 2 + mx;"]] },
  "la linea di ritorno del mentre attraversa il corpo": {
    sostituzioni: [
      ["const xRitorno = Math.max(xCorpo + corpo.destra, et.destraVero) + tema.distanzaRami / 2;", "const xRitorno = Math.max(xCorpo, et.destraVero) + tema.distanzaRami / 2;"],
    ],
  },
  "i tratti non diventano linee intere": {
    sostituzioni: [["const connettori = linee(disegno.connettori, disegno.ricongiungimenti);", "const connettori = disegno.connettori;"]],
  },
  "i rami del se scambiati": {
    sostituzioni: [
      [
        'const vero = sequenza(b.then, b.id, "then");\n    const falso = sequenza(b.else, b.id, "else");',
        'const vero = sequenza(b.else, b.id, "else");\n    const falso = sequenza(b.then, b.id, "then");',
      ],
    ],
    messaggio: "ramo Vero non a destra",
  },
  "il mentre specchiato: il corpo a sinistra, l'uscita Falso a destra": {
    sostituzioni: [
      [
        "const xCorpo = Math.max(c.larghezza / 2 + tema.uscitaRombo, corpo.sinistra + tema.distanzaRami / 2);",
        "const xCorpo = -Math.max(c.larghezza / 2 + tema.uscitaRombo, corpo.destra + tema.distanzaRami / 2);",
      ],
      [
        "const xRitorno = Math.max(xCorpo + corpo.destra, et.destraVero) + tema.distanzaRami / 2;\n    const xFalso = -(c.larghezza / 2 + tema.uscitaRombo);",
        "const xRitorno = -(Math.max(-xCorpo + corpo.sinistra, et.sinistraFalso) + tema.distanzaRami / 2);\n    const xFalso = c.larghezza / 2 + tema.uscitaRombo;",
      ],
      [
        "return unisci(Math.max(c.larghezza / 2, et.sinistraFalso, -xFalso), xRitorno, yUscita + tema.discesa, [sposta(corpo, xCorpo, y0)], {",
        "return unisci(-xRitorno, Math.max(c.larghezza / 2, et.destraVero, xFalso), yUscita + tema.discesa, [sposta(corpo, xCorpo, y0)], {",
      ],
      ["flusso(punto(c.larghezza / 2, ym), punto(xCorpo, ym), punto(xCorpo, y0)),", "flusso(punto(-c.larghezza / 2, ym), punto(xCorpo, ym), punto(xCorpo, y0)),"],
      [
        "punto(xRitorno, ySotto), punto(xRitorno, yRitorno), punto(0, yRitorno)),\n        flusso(punto(-c.larghezza / 2, ym), punto(xFalso, ym),",
        "punto(xRitorno, ySotto), punto(xRitorno, yRitorno), punto(0, yRitorno)),\n        flusso(punto(c.larghezza / 2, ym), punto(xFalso, ym),",
      ],
    ],
    messaggio: "mentre non a",
  },
  "il ripeti specchiato: il giro di ritorno a sinistra, l'uscita Falso a destra": {
    sostituzioni: [
      [
        "const xRitorno = Math.max(corpo.destra, et.destraVero, c.larghezza / 2 + tema.uscitaRombo) + tema.distanzaRami / 2;\n    const xFalso = -(c.larghezza / 2 + tema.uscitaRombo);",
        "const xRitorno = -(Math.max(corpo.sinistra, et.sinistraFalso, c.larghezza / 2 + tema.uscitaRombo) + tema.distanzaRami / 2);\n    const xFalso = c.larghezza / 2 + tema.uscitaRombo;",
      ],
      [
        "return unisci(Math.max(corpo.sinistra, c.larghezza / 2, et.sinistraFalso, -xFalso), xRitorno, yUscita + tema.discesa, [sposta(corpo, 0, yCorpo)], {",
        "return unisci(-xRitorno, Math.max(corpo.destra, c.larghezza / 2, et.destraVero, xFalso), yUscita + tema.discesa, [sposta(corpo, 0, yCorpo)], {",
      ],
      [
        "flusso(punto(c.larghezza / 2, ym), punto(xRitorno, ym), punto(xRitorno, yRitorno), punto(0, yRitorno)),\n        flusso(punto(-c.larghezza / 2, ym), punto(xFalso, ym),",
        "flusso(punto(-c.larghezza / 2, ym), punto(xRitorno, ym), punto(xRitorno, yRitorno), punto(0, yRitorno)),\n        flusso(punto(c.larghezza / 2, ym), punto(xFalso, ym),",
      ],
    ],
    messaggio: "giro del ripeti non dal vertice destro",
  },
  "il testo con uno stile misurato come normale": {
    sostituzioni: [["parti.reduce((s, p) => s + misura(p.testo, p.stile), 0);", "parti.reduce((s, p) => s + misura(p.testo), 0);"]],
    messaggio: "testo con lo stile misurato male",
  },
  "le righe ai lati del salto tolte": {
    sostituzioni: [["...(lati ? { lati: lati(larghezza, altezza)", "...(false && lati ? { lati: lati(larghezza, altezza)"]],
    messaggio: "righe ai lati mancanti",
  },
  "il testo del salto senza la distanza dalle righe ai lati": {
    sostituzioni: [["larghezza = wTesto + 2 * mx + 2 * s;\n        lati = (w, h) => [", "larghezza = wTesto + 2 * mx;\n        lati = (w, h) => ["]],
    messaggio: "testo sulle righe ai lati",
  },
  "il nome della procedura chiamata senza il grassetto": {
    sostituzioni: [['{ nome: { testo: b.callee, espressione: false, stile: "grassetto" }, argomenti }', "{ nome: { testo: b.callee, espressione: false }, argomenti }"]],
    messaggio: "salto senza il nome in grassetto",
  },
  "il nome nell'intestazione senza il grassetto": {
    sostituzioni: [['const nome: ParteDelTesto = { testo: f.name ?? "", espressione: false, stile: "grassetto" };', 'const nome: ParteDelTesto = { testo: f.name ?? "", espressione: false };']],
    messaggio: "il nome non in grassetto nell'intestazione",
  },
};

/** Una copia mutata del sorgente, importata da una cartella temporanea. */
async function mutante(sostituzioni: readonly [string, string][], prova: (fn: Impagina) => void): Promise<void> {
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  const cartellaTemporanea = mkdtempSync(join(tmpdir(), "impaginazione-"));
  try {
    const mutato = sostituzioni.reduce((s, [da, a]) => s.replace(da, a), sorgente);
    const file = join(cartellaTemporanea, "mutante.ts");
    writeFileSync(file, mutato.replaceAll('from "../', `from "${nucleo}/`).replaceAll('from "./', `from "${nucleo}/disegno/`));
    const modulo: { impagina: Impagina } = await import(file);
    prova(modulo.impagina);
  } finally {
    rmSync(cartellaTemporanea, { recursive: true, force: true });
  }
}

describe("mutazioni: un'impaginazione sbagliata fa difettosi", () => {
  for (const [nome, { sostituzioni, messaggio }] of Object.entries(mutazioni)) {
    test(
      nome,
      async () => {
        for (const [da] of sostituzioni) expect({ nome, da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ nome, da, occorrenze: 1 });
        await mutante(sostituzioni, (fn) => {
          const sbagliati = esaminaLeDueForme(fn, tema, tuttiGliAlberi);
          const conIlMessaggio = messaggio === undefined ? undefined : messaggiDelleDueForme(fn).filter((m) => m.includes(messaggio)).length;
          console.log(`mutazione ${nome}: difettosi ${sbagliati.length}${messaggio === undefined ? "" : `, difetti «${messaggio}» ${conIlMessaggio}`}`);
          if (sostituzioni.length === 0) expect(sbagliati).toEqual([]);
          else expect(sbagliati.length).toBeGreaterThan(0);
          if (conIlMessaggio !== undefined) expect(conIlMessaggio).toBeGreaterThan(0);
        });
      },
      30_000,
    );
  }

  test("spaziatura dei rami a zero nel tema", () => {
    const sbagliati = esaminaLeDueForme(impagina, { ...tema, distanzaRami: 0 }, tuttiGliAlberi);
    console.log(`tema con distanza dei rami 0: difettosi ${sbagliati.length}`);
    expect(sbagliati.length).toBeGreaterThan(0);
  });

  test("tratto fra i blocchi corto come la punta nel tema", () => {
    const sbagliati = esaminaLeDueForme(impagina, { ...tema, passoVerticale: tema.punta + 4 }, tuttiGliAlberi);
    console.log(`tema con passo ${tema.punta + 4}: difettosi ${sbagliati.length}`);
    expect(sbagliati.some((s) => s.includes("linea corta"))).toBe(true);
  });

  // Il grassetto dei nomi delle funzioni nelle espressioni non cambia la geometria che l'esame guarda (lo vede la misura
  // a pezzi): la sua mutazione la vede l'atteso scritto a mano del rombo del riferimento della tappa 3.
  test("il grassetto dei nomi delle funzioni nelle espressioni tolto: l'atteso a mano del rombo è rosso", async () => {
    const da = "if (nomi.size === 0) return [...parti];";
    expect(sorgente.split(da).length - 1).toBe(1);
    // L'atteso a mano, lo stesso della prova del riferimento della tappa 3.
    const attesoAMano = ["grassetto:valido", "normale:(voto)"];
    const pezziDelRombo = (fn: Impagina) =>
      fn(riferimento3.functions[0]!, tema, misura, testi, opzioniPredefinite, [], riferimento3.functions)
        .elementi.find((e) => e.id === "b4")!
        .pezzi?.flat()
        .map((p) => `${p.stile ?? "normale"}:${p.testo}`);
    expect(pezziDelRombo(impagina)).toEqual(attesoAMano);
    await mutante([[da, "return [...parti];"]], (fn) => {
      console.log(`mutazione del grassetto nelle espressioni: pezzi del rombo ${JSON.stringify(pezziDelRombo(fn))}`);
      expect(pezziDelRombo(fn)).not.toEqual(attesoAMano);
    });
  });

  test("gli alberi costruiti apposta vedono il ramo largo ignorato, nei due versi", async () => {
    // Un difettoso per forma, sull'albero col ramo largo dal lato della mutazione; nessuno sull'altro.
    await mutante(mutazioni["il ramo Vero ignora la larghezza del ramo"]!.sostituzioni, (fn) => {
      expect(esaminaLeDueForme(fn, tema, [costruiti[0]!]).length).toBe(2);
      expect(esaminaLeDueForme(fn, tema, [costruiti[1]!]).length).toBe(0);
    });
    await mutante(mutazioni["il ramo Falso ignora la larghezza del ramo"]!.sostituzioni, (fn) => {
      expect(esaminaLeDueForme(fn, tema, [costruiti[1]!]).length).toBe(2);
      expect(esaminaLeDueForme(fn, tema, [costruiti[0]!]).length).toBe(0);
    });
  });
});

// ------------------------------------------------------------------------------ i punti di inserimento

// Ogni posto dell'albero (prima, fra e dopo i blocchi di ogni sequenza, rami e corpi vuoti compresi) ha il
// suo punto nel disegno. I rilevatori sono scritti qui, dall'albero e dal disegno, senza il codice che produce
// i punti:
// - i POSTI si contano visitando l'albero, e si appaiano con quelli dei punti nei due versi, elemento per
//   elemento (un posto senza punto, un punto senza posto, un posto con due punti);
// - ogni punto sta SU una linea del flusso (su un suo tratto) e a distanza dalle forme, dalle etichette e dai
//   punti di unione (i riquadri, non le forme: più severo del necessario);
// - LA LUCE: ogni punto sta al centro della parte libera della sua linea verticale
//   (dal capo di sopra a quello di sotto, senza la punta se la linea finisce lì, spezzata dove parte la nota
//   di un commento), con almeno raggio del «+» più luce verso ciascun capo; dove la linea è più lunga di un
//   passo, il punto non resta a ridosso di un capo;
// - ogni punto sta AL SUO POSTO, letto dall'albero: sotto il blocco che lo precede nella sequenza e sopra
//   quello che lo segue (tutto il loro sottoalbero), sull'asse dei blocchi della sequenza, e dal lato del ramo
//   rispetto al rombo che lo possiede;
// - inserire un blocco nel posto di un punto (`inserisci` del nucleo) lo mette dove il punto era: rifatto il
//   disegno, il blocco nuovo sta al posto del punto secondo lo stesso rilevatore.
//
// CHE COSA NON GUARDA: la distanza fra due punti oltre la minima stampata; il «+» che li disegnerà (è
// dell'interfaccia: qui il suo raggio è dichiarato); la luce verso un'altra linea che passa accanto (si
// guardano forme, etichette e punti di unione).

/** Il raggio del «+» che disegnerà il punto, e la luce minima fra il «+» e ogni altra cosa del disegno. */
const RAGGIO_DEL_PUNTO = 6;
const LUCE = 6;
const LIBERO = RAGGIO_DEL_PUNTO + LUCE;

/** La parte libera della linea verticale su cui sta il punto, letta dalle linee del disegno: dal capo di sopra
 * a quello di sotto, senza la punta se la linea finisce lì, spezzata dove parte la nota di un commento e dove
 * attraversa la linea del riquadro di un ciclo. */
function parteLibera(d: Disegno, q: Punto): { sopra: number; sotto: number } | undefined {
  for (const c of d.connettori.filter((x) => x.genere === "flusso")) {
    for (const [i, b] of c.punti.entries()) {
      const a = c.punti[i - 1];
      if (a === undefined || Math.abs(a.x - q.x) > 0.01 || Math.abs(b.x - q.x) > 0.01 || !(a.y < b.y) || q.y < a.y - 0.01 || q.y > b.y + 0.01) continue;
      const fondo = i === c.punti.length - 1 ? b.y - tema.punta : b.y;
      const note = d.connettori.filter((n) => n.genere === "nota" && Math.abs(n.punti[0]!.x - q.x) < 0.01).map((n) => n.punti[0]!.y);
      const bordi = d.riquadri.filter((r) => q.x > r.bordo.x && q.x < r.bordo.x + r.bordo.larghezza).flatMap((r) => [r.bordo.y, r.bordo.y + r.bordo.altezza]);
      const tagli = [...note, ...bordi].filter((y) => y > a.y && y < fondo);
      return { sopra: Math.max(a.y, ...tagli.filter((y) => y < q.y)), sotto: Math.min(fondo, ...tagli.filter((y) => y > q.y)) };
    }
  }
  return undefined;
}

const chiave = (p: Posto) => `${p.contenitore}/${p.ramo}/${p.indice}`;

/** I posti dell'albero, contati visitandolo. */
function postiDellAlbero(f: Funzione): Posto[] {
  const fuori: Posto[] = [];
  const sequenza = (s: readonly Blocco[], contenitore: string, ramo: Posto["ramo"]) => {
    for (let indice = 0; indice <= s.length; indice++) fuori.push({ contenitore, ramo, indice });
    for (const b of s) {
      if (b.kind === "if") sequenza(b.then, b.id, "then"), sequenza(b.else, b.id, "else");
      if (b.kind === "while" || b.kind === "repeat" || eCiclo(b)) sequenza(b.body, b.id, "body");
    }
  };
  sequenza(f.body, f.id, "body");
  return fuori;
}

/** Il punto di unione a cui torna il giro di un `ripeti`: dove finisce la linea che parte dal vertice destro del rombo. */
function unioneDelGiro(d: Disegno, id: string) {
  const v = rombi(d).get(id)?.vertici[1];
  const fine = v && d.connettori.find((c) => c.genere === "flusso" && Math.abs(c.punti[0]!.x - v.x) < 0.01 && Math.abs(c.punti[0]!.y - v.y) < 0.01)?.punti.at(-1);
  return fine && d.ricongiungimenti.find((u) => Math.abs(Math.hypot(fine.x - u.centro.x, fine.y - u.centro.y) - u.raggio) < 0.01);
}

/** La sequenza di un posto e, se è un ramo, il blocco che la possiede. */
function sequenzaDel(f: Funzione, posto: Posto): { sequenza: readonly Blocco[]; padrone?: Blocco } {
  if (posto.contenitore === f.id) return { sequenza: f.body };
  const b = blocchiDi(f.body).find((x) => x.id === posto.contenitore)!;
  return { sequenza: (b as unknown as Record<string, readonly Blocco[]>)[posto.ramo]!, padrone: b };
}

/** Dove sta un punto `q` rispetto ai tocchi che il posto separa, letti dall'albero: i difetti trovati.
 * `prima` e `dopo` sono i blocchi accanto al posto nella sequenza (assenti agli estremi). */
function fuoriPosto(d: Disegno, f: Funzione, posto: Posto, prima: Blocco | undefined, dopo: Blocco | undefined, q: Punto): string[] {
  const elemento = formeDeiBlocchi(d);
  // Tutto ciò che un blocco occupa: le forme del suo sottoalbero (coi blocchi aggiunti dai riquadri) e i riquadri.
  // Di un `ripeti` anche il punto di unione del suo giro, sopra il corpo.
  const riquadri = (b: Blocco) => {
    const ids = new Set(idDi([b]));
    const giri = blocchiDi([b]).flatMap((x) => (x.kind === "repeat" ? [unioneDelGiro(d, x.id)] : [])).filter((u) => u !== undefined);
    return [
      ...d.elementi.filter((e) => e.dato === undefined && ids.has(e.id)).map((x) => x.riquadro),
      ...d.riquadri.filter((r) => ids.has(r.blocco)).map((r) => r.bordo),
      ...giri.map((u) => ({ x: u.centro.x - u.raggio, y: u.centro.y - u.raggio, larghezza: 2 * u.raggio, altezza: 2 * u.raggio })),
    ];
  };
  const fondo = (b: Blocco) => Math.max(...riquadri(b).map((r) => r.y + r.altezza));
  const cima = (b: Blocco) => Math.min(...riquadri(b).map((r) => r.y));
  const centro = (r: Rettangolo) => r.x + r.larghezza / 2;
  const difetti: string[] = [];
  const nome = chiave(posto);
  if (prima !== undefined && !(q.y > fondo(prima))) difetti.push(`punto ${nome} non sotto ${prima.id}`);
  if (dopo !== undefined && !(q.y < cima(dopo))) difetti.push(`punto ${nome} non sopra ${dopo.id}`);
  // L'asse della sequenza: il centro di un blocco che non sia un commento (la nota sta a lato della linea), né un
  // ciclo nel suo riquadro, né una copia espansa (l'intestazione sta a sinistra della linea).
  const sullAsse = [prima, dopo].filter((b): b is Blocco => b !== undefined && b.kind !== "comment" && !eCiclo(b) && elemento.get(b.id)?.forma !== "intestazione");
  for (const b of sullAsse) if (Math.abs(centro(elemento.get(b.id)!.riquadro) - q.x) > 0.01) difetti.push(`punto ${nome} fuori dall'asse di ${b.id}`);
  const { padrone } = sequenzaDel(f, posto);
  if (padrone === undefined) {
    const [inizio, fine] = [elemento.get(f.id)!.riquadro, elemento.get(f.end.id)!.riquadro];
    if (!(q.y > inizio.y + inizio.altezza && q.y < fine.y)) difetti.push(`punto ${nome} fuori da inizio e fine`);
    // Nessun punto prima dei valori iniziali o fra di loro: i dati che ne hanno uno, letti dalla funzione, e i loro
    // blocchi cercati nel disegno per nome.
    const iniziali = d.elementi.filter((e) => e.dato !== undefined && f.data.some((x) => x.name === e.dato && x.initial !== undefined));
    if (iniziali.some((e) => !(q.y > e.riquadro.y + e.riquadro.altezza))) difetti.push(`punto ${nome} prima di un valore iniziale`);
    if (Math.abs(centro(inizio) - q.x) > 0.01) difetti.push(`punto ${nome} fuori dall'asse principale`);
  } else if (eCiclo(padrone)) {
    // Il corpo di un ciclo: dentro il suo riquadro, sotto l'intestazione; aperto, dal lato Vero del rombo e fra i
    // blocchi che il riquadro aggiunge (sotto l'elemento preso, sopra l'aumento), mai fra due di loro.
    const bordo = d.riquadri.find((r) => r.blocco === padrone.id)?.bordo;
    const testa = elemento.get(padrone.id)?.riquadro;
    if (!bordo || !testa || !(q.x > bordo.x && q.x < bordo.x + bordo.larghezza && q.y > testa.y + testa.altezza && q.y < bordo.y + bordo.altezza)) difetti.push(`punto ${nome} fuori dal riquadro di ${padrone.id}`);
    const r = rombi(d).get(padrone.id)?.riquadro;
    if (r !== undefined && !(q.x > centro(r) && q.y > r.y + r.altezza / 2)) difetti.push(`punto ${nome} dal lato sbagliato di ${padrone.id}`);
    const uscita = yDellUscita(d, padrone.id);
    if (r !== undefined && !(uscita !== undefined && q.y < uscita)) difetti.push(`punto ${nome} sotto l'uscita di ${padrone.id}`);
    const xDelCorpo = r === undefined ? undefined : xDellaLineaDalVertice(d, padrone.id, 1);
    if (xDelCorpo !== undefined && Math.abs(q.x - xDelCorpo) > 0.01) difetti.push(`punto ${nome} fuori dalla linea del ramo di ${padrone.id}`);
    const aggiunto = (fase: string) => d.elementi.find((e) => e.id === padrone.id && e.fase === fase)?.riquadro;
    const [preso, aumento] = [aggiunto("elemento"), aggiunto("passo")];
    if ((preso && !(q.y > preso.y + preso.altezza)) || (aumento && !(q.y < aumento.y))) difetti.push(`punto ${nome} fra i blocchi del riquadro di ${padrone.id}`);
  } else {
    const r = elemento.get(padrone.id)!.riquadro;
    // Un ramo esce dal vertice laterale del rombo: il suo primo punto sta sotto il vertice, dal suo lato.
    const vertice = r.y + r.altezza / 2;
    const lato = posto.ramo === "else" ? q.x < centro(r) && q.y > vertice : padrone.kind === "repeat" ? Math.abs(q.x - centro(r)) < 0.01 && q.y < r.y : q.x > centro(r) && q.y > vertice;
    if (!lato) difetti.push(`punto ${nome} dal lato sbagliato di ${padrone.id}`);
    // Sulla linea del suo ramo: quella che scende dal vertice del rombo (il ramo vuoto non ha blocchi che la dicano).
    const xDelRamo = padrone.kind === "repeat" ? undefined : xDellaLineaDalVertice(d, padrone.id, posto.ramo === "else" ? 3 : 1);
    if (xDelRamo !== undefined && Math.abs(q.x - xDelRamo) > 0.01) difetti.push(`punto ${nome} fuori dalla linea del ramo di ${padrone.id}`);
    // L'altro limite, letto dal disegno: il corpo di un `ripeti` sotto il punto di unione del suo giro (sulla stessa
    // linea, sopra, c'è il punto prima del `ripeti`); i rami di un `se` sopra il suo punto di unione (un ramo vuoto non
    // ha blocchi che lo limitino); il corpo di un `mentre` sopra la sua uscita.
    if (padrone.kind === "repeat") {
      const u = unioneDelGiro(d, padrone.id);
      if (!(u !== undefined && q.y > u.centro.y)) difetti.push(`punto ${nome} sopra il giro di ${padrone.id}`);
    } else if (padrone.kind === "if") {
      const sotto = d.ricongiungimenti.filter((u) => Math.abs(u.centro.x - centro(r)) < 0.01 && u.centro.y > vertice).sort((a, b) => a.centro.y - b.centro.y)[0];
      if (!(sotto !== undefined && q.y < sotto.centro.y)) difetti.push(`punto ${nome} sotto l'unione di ${padrone.id}`);
    } else if (padrone.kind === "while") {
      const uscita = yDellUscita(d, padrone.id);
      if (!(uscita !== undefined && q.y < uscita)) difetti.push(`punto ${nome} sotto l'uscita di ${padrone.id}`);
    }
  }
  return difetti;
}

/** Dove scende la linea che parte da un vertice laterale del rombo (1 il destro, 3 il sinistro): il suo primo tratto è
 * orizzontale. */
function xDellaLineaDalVertice(d: Disegno, id: string, vertice: 1 | 3): number | undefined {
  const v = rombi(d).get(id)?.vertici[vertice];
  return v && d.connettori.find((c) => c.genere === "flusso" && Math.abs(c.punti[0]!.x - v.x) < 0.01 && Math.abs(c.punti[0]!.y - v.y) < 0.01)?.punti[1]?.x;
}

/** L'altezza del tratto orizzontale con cui l'uscita Falso di un ciclo in testa torna sull'asse: la linea parte dal
 * vertice sinistro del rombo, va a sinistra e scende fin lì. */
function yDellUscita(d: Disegno, id: string): number | undefined {
  const v = rombi(d).get(id)?.vertici[3];
  const p = v && d.connettori.find((c) => c.genere === "flusso" && Math.abs(c.punti[0]!.x - v.x) < 0.01 && Math.abs(c.punti[0]!.y - v.y) < 0.01)?.punti;
  return p?.[2]?.y;
}

/** Il punto `q` su un tratto di una linea del flusso. */
function sullaLinea(d: Disegno, q: Punto): boolean {
  return d.connettori.some(
    (c) =>
      c.genere === "flusso" &&
      c.punti.slice(1).some((b, i) => {
        const a = c.punti[i]!;
        const dentro = (v: number, x: number, y: number) => v >= Math.min(x, y) - 0.01 && v <= Math.max(x, y) + 0.01;
        return (Math.abs(a.x - b.x) < 0.01 && Math.abs(q.x - a.x) < 0.01 && dentro(q.y, a.y, b.y)) || (Math.abs(a.y - b.y) < 0.01 && Math.abs(q.y - a.y) < 0.01 && dentro(q.x, a.x, b.x));
      }),
  );
}

/** Distanza di un punto da un rettangolo (0 dentro). */
const distanza = (q: Punto, r: Rettangolo) => Math.hypot(Math.max(r.x - q.x, 0, q.x - r.x - r.larghezza), Math.max(r.y - q.y, 0, q.y - r.y - r.altezza));

interface EsameDeiPunti {
  difetti: string[];
  premesse: { posti: number; punti: number; distanzaMinima: number };
}

function esaminaIPunti(d: Disegno, f: Funzione): EsameDeiPunti {
  const difetti: string[] = [];
  const posti = postiDellAlbero(f);
  const deiPunti = d.punti.map((p) => chiave(p.posto));
  const contati = posti.map(chiave);
  // L'appaiamento nei due versi, col conteggio accanto: un posto senza punto, un punto senza posto, un doppio.
  for (const k of contati) if (!deiPunti.includes(k)) difetti.push(`posto senza punto ${k}`);
  for (const k of deiPunti) if (!contati.includes(k)) difetti.push(`punto senza posto ${k}`);
  for (const k of new Set(deiPunti)) if (deiPunti.filter((x) => x === k).length > 1) difetti.push(`posto con più punti ${k}`);
  const ostacoli = [
    ...d.elementi.map((e) => ({ nome: nomeDi(e), r: e.riquadro })),
    ...d.etichette.map((t) => ({ nome: `${t.blocco}:${t.valore}`, r: t.riquadro })),
    ...d.ricongiungimenti.map((u) => ({ nome: "unione", r: { x: u.centro.x - u.raggio, y: u.centro.y - u.raggio, larghezza: 2 * u.raggio, altezza: 2 * u.raggio } })),
  ];
  let distanzaMinima = Infinity;
  for (const p of d.punti) {
    const nome = chiave(p.posto);
    if (!sullaLinea(d, p)) difetti.push(`punto ${nome} fuori dalle linee`);
    for (const o of ostacoli) if (distanza(p, o.r) < LIBERO - 0.01) difetti.push(`punto ${nome} tocca ${o.nome}`);
    // La luce lungo la linea: dal capo di sopra e dalla punta, e il punto al centro della parte libera.
    const libera = parteLibera(d, p);
    if (libera === undefined) difetti.push(`punto ${nome} non su una linea verticale che scende`);
    else {
      if (p.y - libera.sopra < LIBERO - 0.01 || libera.sotto - p.y < LIBERO - 0.01) difetti.push(`punto ${nome} senza luce`);
      if (Math.abs(p.y - (libera.sopra + libera.sotto) / 2) > 0.01) difetti.push(`punto ${nome} non al centro della linea libera`);
    }
    for (const altro of d.punti) if (altro !== p) distanzaMinima = Math.min(distanzaMinima, Math.hypot(altro.x - p.x, altro.y - p.y));
    if (!contati.includes(nome)) continue;
    const { sequenza } = sequenzaDel(f, p.posto);
    difetti.push(...fuoriPosto(d, f, p.posto, sequenza[p.posto.indice - 1], sequenza[p.posto.indice], p));
  }
  return { difetti, premesse: { posti: posti.length, punti: d.punti.length, distanzaMinima } };
}

describe("la Lettura con la domanda", () => {
  // Con l'opzione, la geometria regge su tutti gli alberi come senza; i punti sono uno per posto della sequenza vera
  // tranne quello fra una Scrittura e la Lettura che la mostra come domanda, che non c'è (appaiati nei due versi: i
  // posti mancanti sono esattamente quelli delle coppie). Controllo positivo: gli alberi hanno coppie, e la Lettura unita
  // ha due righe.
  for (const opzioni of [leForme[0]!, leForme[4]!].map((o) => ({ ...o, domanda: "nella-lettura" as const }))) {
    test(`geometria e punti (${nomeDelleForme(opzioni)})`, () => {
      const geometria = esaminaTutti(impagina, tema, tuttiGliAlberi, opzioni);
      expect(geometria.sbagliati).toEqual([]);
      let [unite, mancanti, attesi] = [0, 0, 0];
      const sbagliati: string[] = [];
      for (const a of tuttiGliAlberi) {
        const d = disegnaAlbero(impagina, a, tema, misura, opzioni);
        const cs = [...coppie(a.funzione.body).values()];
        const fra = new Set(cs.map((c) => {
          const posto = postoDi(a.funzione, c.lettura)!;
          return chiave(posto);
        }));
        attesi += fra.size;
        unite += d.elementi.filter((e) => e.scrittura !== undefined && e.righe.length === 2).length;
        const esame = esaminaIPunti(d, a.funzione);
        const altri = esame.difetti.filter((x) => {
          const m = /^posto senza punto (.+)$/.exec(x);
          if (m && fra.has(m[1]!)) {
            mancanti++;
            return false;
          }
          return true;
        });
        if (altri.length > 0) sbagliati.push(`${a.nome}: ${altri.slice(0, 3).join("; ")}`);
      }
      console.log(`la domanda nella Lettura, ${nomeDelleForme(opzioni)}: alberi ${tuttiGliAlberi.length}, Letture unite ${unite}, posti fra le due ${attesi}, senza punto ${mancanti}; difettosi ${sbagliati.length}`);
      expect(sbagliati).toEqual([]);
      expect(unite).toBeGreaterThan(0);
      expect(mancanti).toBe(attesi);
      expect(unite).toBe(attesi);
    }, 60_000);
  }
});

/** Il posto del blocco `id` nella funzione: il contenitore, il ramo e l'indice nella sequenza vera. */
function postoDi(f: Funzione, id: string): Posto | undefined {
  const cerca = (s: readonly Blocco[], contenitore: string, ramo: Posto["ramo"]): Posto | undefined => {
    for (const [indice, b] of s.entries()) {
      if (b.id === id) return { contenitore, ramo, indice };
      const rami: [Posto["ramo"], readonly Blocco[]][] = b.kind === "if" ? [["then", b.then], ["else", b.else]] : "body" in b ? [["body", b.body]] : [];
      for (const [r, sotto] of rami) {
        const x = cerca(sotto, b.id, r);
        if (x) return x;
      }
    }
    return undefined;
  };
  return cerca(f.body, f.id, "body");
}

describe("i punti di inserimento", () => {
  for (const opzioni of leForme) {
    for (const { nome: nomeMisura, misura: misuraDelTesto } of leMisure) {
      test(`uno per posto, sulla linea, al suo posto, lontani dalle forme (${nomeDelleForme(opzioni)}, misura ${nomeMisura})`, () => {
        let [posti, punti, distanzaMinima] = [0, 0, Infinity];
        const sbagliati: string[] = [];
        for (const a of tuttiGliAlberi) {
          const esame = esaminaIPunti(disegnaAlbero(impagina, a, tema, misuraDelTesto, opzioni), a.funzione);
          posti += esame.premesse.posti;
          punti += esame.premesse.punti;
          distanzaMinima = Math.min(distanzaMinima, esame.premesse.distanzaMinima);
          if (esame.difetti.length > 0) sbagliati.push(`${a.nome}: ${esame.difetti.slice(0, 3).join("; ")}`);
        }
        console.log(
          `punti ${nomeDelleForme(opzioni)}, misura ${nomeMisura}: alberi ${tuttiGliAlberi.length}, posti contati ${posti}, punti ${punti}, ` +
            `distanza minima fra due punti ${distanzaMinima.toFixed(1)}; difettosi ${sbagliati.length}`,
        );
        expect(sbagliati).toEqual([]);
        expect(tuttiGliAlberi.length).toBe(corpus.length + corpusTappa3.length + NUMERO_GENERATI + coiSalti.length + costruiti.length);
        expect(posti).toBeGreaterThan(tuttiGliAlberi.length);
        expect(punti).toBe(posti);
        expect(distanzaMinima).toBeGreaterThanOrEqual(2 * RAGGIO_DEL_PUNTO);
      });
    }
  }

  test("inserire nel posto di un punto mette il blocco dove il punto era disegnato", () => {
    let [inseriti, alberi] = [0, 0];
    const sbagliati: string[] = [];
    // Un albero su tre nelle forme predefinite dei cicli, gli altri col `per` chiuso e il `per ogni` a parole.
    const forme = [opzioniPredefinite, { ...opzioniPredefinite, ...leFormeDeiCicli[1] }];
    for (const [i, a] of tuttiGliAlberi.entries()) {
      const opzioni = forme[i % 3 === 0 ? 0 : 1]!;
      const progetto: Progetto = { format: "algodesign", schema_version: 2, metadata: { name: a.nome }, functions: a.funzioni ?? [a.funzione] };
      const prima = disegnaAlbero(impagina, a, tema, misura, opzioni);
      alberi++;
      for (const p of prima.punti) {
        const r = inserisci(p.posto, "assignment")(progetto, 1_000_000);
        if (!r.ok) {
          sbagliati.push(`${a.nome} ${chiave(p.posto)}: rifiutato ${r.rifiuto.motivo}`);
          continue;
        }
        const f = r.progetto.functions.find((x) => x.id === a.funzione.id)!;
        const nuovo = blocchiDi(f.body).find((b) => !blocchiDi(a.funzione.body).some((x) => x.id === b.id))!;
        const dopo = impagina(f, tema, misura, testi, opzioni, [], a.funzioni);
        const e = dopo.elementi.find((x) => x.id === nuovo.id)!.riquadro;
        const { sequenza } = sequenzaDel(f, p.posto);
        // Il blocco nuovo sta nel posto del punto: fra gli stessi vicini, che ora sono uno prima e uno dopo di lui.
        const centro = { x: e.x + e.larghezza / 2, y: e.y + e.altezza / 2 };
        const difetti = [
          ...(sequenza[p.posto.indice]?.id === nuovo.id ? [] : [`il blocco nuovo non è all'indice ${p.posto.indice}`]),
          ...fuoriPosto(dopo, f, p.posto, sequenza[p.posto.indice - 1], sequenza[p.posto.indice + 1], centro),
        ];
        if (difetti.length > 0) sbagliati.push(`${a.nome}: ${difetti.join("; ")}`);
        else inseriti++;
      }
    }
    console.log(`inserimenti nei posti dei punti: alberi ${alberi}, blocchi inseriti al loro posto ${inseriti}; difettosi ${sbagliati.length}`);
    expect(sbagliati.slice(0, 5)).toEqual([]);
    expect(inseriti).toBeGreaterThan(alberi);
  }, 120_000);

  describe("controlli positivi (un disegno alterato apposta)", () => {
    const f = riferimento.funzione;
    const buono = impagina(f, tema, misura, testi);
    const esame = (d: Disegno) => esaminaIPunti(d, f).difetti;
    // Due punti della sequenza principale, uno dopo l'altro: hanno vicini diversi.
    const [p0, p1] = [buono.punti.find((p) => chiave(p.posto) === `${f.id}/body/0`)!, buono.punti.find((p) => chiave(p.posto) === `${f.id}/body/1`)!];

    test("il disegno buono è senza difetti", () => expect(esame(buono)).toEqual([]));

    test("un punto spostato fuori dalla linea", () => {
      const fuori = { ...buono, punti: buono.punti.map((p) => (p === p0 ? { ...p, x: p.x + 30 } : p)) };
      expect(esame(fuori)).toContain(`punto ${chiave(p0.posto)} fuori dalle linee`);
    });

    test("un punto tolto", () => {
      expect(esame({ ...buono, punti: buono.punti.filter((p) => p !== p1) })).toContain(`posto senza punto ${chiave(p1.posto)}`);
    });

    test("due posti scambiati", () => {
      const scambiati = { ...buono, punti: buono.punti.map((p) => (p === p0 ? { ...p, posto: p1.posto } : p === p1 ? { ...p, posto: p0.posto } : p)) };
      const difetti = esame(scambiati);
      expect(difetti.some((x) => x.startsWith(`punto ${chiave(p0.posto)} non`))).toBe(true);
      expect(difetti.some((x) => x.startsWith(`punto ${chiave(p1.posto)} non`))).toBe(true);
    });

    // Ogni coppia di punti coi posti scambiati, sul riferimento della tappa 1 e su quello della tappa 2 nelle forme dei
    // cicli: il rilevatore vede fuori posto tutti e due i punti di ogni coppia (il «+» prima di un `ripeti` e quello in
    // testa al suo corpo stanno sulla stessa linea, separati dal punto di unione del giro).
    const riferimentoDeiCicli = corpus.find((c) => c.nome === "riferimento-media-voti-per")!;
    for (const [nome, fn, opzioni] of [
      ["della tappa 1", f, opzioniPredefinite],
      ...leFormeDeiCicli.map((c) => [`della tappa 2 (per ${c.per}, per ogni ${c.perOgni})`, riferimentoDeiCicli.funzione, { ...opzioniPredefinite, ...c }] as const),
    ] as const)
      test(`ogni coppia di posti scambiati, nel riferimento ${nome}`, () => {
        const d = impagina(fn, tema, misura, testi, opzioni);
        expect(esaminaIPunti(d, fn).difetti).toEqual([]);
        let [coppie, viste] = [0, 0];
        const sfuggite: string[] = [];
        d.punti.forEach((a, i) =>
          d.punti.slice(i + 1).forEach((b) => {
            coppie++;
            const scambiati = { ...d, punti: d.punti.map((p) => (p === a ? { ...p, posto: b.posto } : p === b ? { ...p, posto: a.posto } : p)) };
            const difetti = esaminaIPunti(scambiati, fn).difetti;
            // Il punto disegnato in a porta ora il posto di b: il difetto nomina quel posto, e viceversa.
            const vista = [b.posto, a.posto].every((posto) => difetti.some((x) => x.startsWith(`punto ${chiave(posto)} `)));
            if (vista) viste++;
            else sfuggite.push(`${chiave(a.posto)} ↔ ${chiave(b.posto)}`);
          }),
        );
        console.log(`coppie di posti scambiati nel riferimento ${nome}: punti ${d.punti.length}, coppie ${coppie}, viste ${viste}, sfuggite ${sfuggite.length}: ${sfuggite.slice(0, 5).join(", ")}`);
        expect(sfuggite).toEqual([]);
        expect(coppie).toBe((d.punti.length * (d.punti.length - 1)) / 2);
        expect(coppie).toBeGreaterThan(100);
      });

    test("un punto sulla linea ma attaccato a una forma", () => {
      const sotto = buono.elementi.find((e) => e.id === f.id)!.riquadro;
      const attaccato = { ...buono, punti: buono.punti.map((p) => (p === p0 ? { ...p, y: sotto.y + sotto.altezza + 2 } : p)) };
      expect(esame(attaccato)).toContain(`punto ${chiave(p0.posto)} tocca ${f.id}`);
    });

    test("un punto in più, con un posto che non c'è", () => {
      const inventato = { ...p0, posto: { ...p0.posto, indice: 99 } };
      expect(esame({ ...buono, punti: [...buono.punti, inventato] })).toContain(`punto senza posto ${chiave(inventato.posto)}`);
    });
  });

  // Mutazioni del sorgente: i punti dei rami del se scambiati (il disegno resta giusto, solo i posti no), i
  // punti a ridosso del capo di sopra, e i punti lasciati dove li mette la sequenza, senza centrarli sulla
  // linea più lunga.
  const mutazioniDeiPunti: Record<string, { sostituzioni: [string, string][]; messaggio: string }> = {
    "i posti dei rami del se scambiati": {
      sostituzioni: [['const vero = sequenza(b.then, b.id, "then");', 'const vero = sequenza(b.then, b.id, "else");']],
      messaggio: "dal lato sbagliato",
    },
    "i punti a ridosso del capo di sopra della linea": {
      sostituzioni: [["return { ...q, y: (sopra + sotto) / 2 };", "return { ...q, y: sopra + 2 };"]],
      messaggio: "senza luce",
    },
    "i punti non centrati sulla linea più lunga": {
      sostituzioni: [["punti: disegno.punti.map((q) => centrato(q, connettori, tema.punta, disegno.riquadri)),", "punti: disegno.punti,"]],
      messaggio: "non al centro della linea libera",
    },
  };
  for (const [nome, { sostituzioni, messaggio }] of Object.entries(mutazioniDeiPunti)) {
    test(`mutazione: ${nome}`, async () => {
      for (const [da] of sostituzioni) expect({ nome, da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ nome, da, occorrenze: 1 });
      await mutante(sostituzioni, (fn) => {
        const difetti = tuttiGliAlberi.flatMap((a) => esaminaIPunti(disegnaAlbero(fn, a, tema, misura), a.funzione).difetti);
        const conIlMessaggio = difetti.filter((d) => d.includes(messaggio));
        console.log(`mutazione dei punti ${nome}: difetti ${difetti.length}, «${messaggio}» ${conIlMessaggio.length}, il primo: ${conIlMessaggio[0]}`);
        expect(conIlMessaggio.length).toBeGreaterThan(0);
      });
    }, 30_000);
  }
});

// ------------------------------------------------------------------------------- il riquadro dei cicli
//
// I rilevatori dei riquadri sono in `esamina` (`esaminaIRiquadri`, e i rami dei cicli in `esaminaRami`), quelli dei
// punti nel corpo in `fuoriPosto`. Qui i loro controlli positivi su un disegno alterato apposta, le mutazioni del
// sorgente (lo specchio dei due riquadri, lo scambio dei blocchi aggiunti, un punto fra due blocchi aggiunti, la
// linea che entra sotto l'intestazione), ciascuna rossa col messaggio del suo rilevatore nelle forme dei cicli, e
// il riferimento della tappa 2 con «Adatta».
//
// CHE COSA NON GUARDA: il disegno della linea tratteggiata e del fondo (è dell'interfaccia: qui il riquadro è un
// rettangolo), la misura vera dell'intestazione nei motori (`e2e/disegno.e2e.ts`).

describe("il riquadro dei cicli", () => {
  const delCiclo = corpus.find((c) => c.nome === "riferimento-media-voti-per")!;
  const annidati = corpus.find((c) => c.nome === "per-annidati")!;

  test("controlli positivi: il riquadro tolto, l'intestazione spostata, il testo di un blocco aggiunto cambiato", () => {
    const d = impagina(annidati.funzione, tema, misura, testi);
    expect(esaminaConLAlbero(d, annidati.funzione).difetti).toEqual([]);
    const primo = d.riquadri[0]!;
    expect(esaminaConLAlbero({ ...d, riquadri: d.riquadri.slice(1) }, annidati.funzione).difetti).toContain(`ciclo ${primo.blocco} con 0 riquadri`);
    const spostata = d.elementi.map((e) => (e.id === primo.blocco && e.fase === undefined ? { ...e, riquadro: { ...e.riquadro, y: e.riquadro.y + 10 } } : e));
    expect(esaminaConLAlbero({ ...d, elementi: spostata }, annidati.funzione).difetti).toContain(`intestazione fuori dal bordo ${primo.blocco}`);
    const passo = d.elementi.find((e) => e.id === primo.blocco && e.fase === "passo")!;
    const cambiato = d.elementi.map((e) => (e === passo ? { ...e, testo: "x ← x + 2" } : e));
    expect(esaminaConLAlbero({ ...d, elementi: cambiato }, annidati.funzione).difetti).toContain(`testo della fase passo di ${primo.blocco}: «x ← x + 2» invece di «${passo.testo}»`);
    // Il ciclo chiuso: il giro del primo ciclo specchiato attorno all'asse del suo punto di unione (il primo dentro il
    // suo riquadro).
    const chiusi = { ...opzioniPredefinite, per: "chiuso" } as const;
    const c = impagina(annidati.funzione, tema, misura, testi, chiusi);
    expect(esaminaConLAlbero(c, annidati.funzione, chiusi).difetti).toEqual([]);
    const bordo = c.riquadri.find((r) => r.blocco === "b1")!.bordo;
    const u = c.ricongiungimenti.filter((x) => x.centro.y > bordo.y && x.centro.y < bordo.y + bordo.altezza).sort((a, b) => a.centro.y - b.centro.y)[0]!;
    const alGiro = (l: (typeof c.connettori)[number]) => l.punti.some((p) => p.x > u.centro.x + 1) && Math.abs(Math.hypot(l.punti.at(-1)!.x - u.centro.x, l.punti.at(-1)!.y - u.centro.y) - u.raggio) < 0.01;
    expect(c.connettori.filter(alGiro).length).toBe(1);
    const specchiato = c.connettori.map((l) => (alGiro(l) ? { ...l, punti: l.punti.map((p) => ({ x: 2 * u.centro.x - p.x, y: p.y })) } : l));
    expect(esaminaConLAlbero({ ...c, connettori: specchiato }, annidati.funzione, chiusi).difetti).toContain("giro del per chiuso non a destra b1");
  });

  const mutazioniDeiCicli: Record<string, { sostituzioni: [string, string][]; messaggio: string; forme: readonly OpzioniDelDisegno[]; deiPunti?: boolean }> = {
    "il per aperto specchiato: il corpo a sinistra, l'uscita Falso a destra": {
      sostituzioni: mutazioni["il mentre specchiato: il corpo a sinistra, l'uscita Falso a destra"]!.sostituzioni,
      messaggio: "del per non a",
      forme: [opzioniPredefinite],
    },
    "il ciclo chiuso specchiato: il giro a sinistra": {
      sostituzioni: [
        ["const xRitorno = Math.max(corpo.destra, tema.uscitaRombo) + tema.distanzaRami / 2;", "const xRitorno = -(Math.max(corpo.sinistra, tema.uscitaRombo) + tema.distanzaRami / 2);"],
        ["return unisci(corpo.sinistra, xRitorno, ySotto + passo, [sposta(corpo, 0, yCorpo)], {", "return unisci(-xRitorno, corpo.destra, ySotto + passo, [sposta(corpo, 0, yCorpo)], {"],
      ],
      messaggio: "giro del per chiuso non a destra",
      forme: [{ ...opzioniPredefinite, per: "chiuso", perOgni: "chiuso" }],
    },
    "scambio: l'aumento in testa al corpo, l'elemento preso in fondo": {
      sostituzioni: [["const pezzi = [...prima, ...veri.pezzi, ...dopo];", "const pezzi = [...dopo, ...veri.pezzi, ...prima];"]],
      messaggio: "non in fondo al corpo",
      forme: [opzioniPredefinite],
    },
    "un punto in più fra i blocchi del riquadro": {
      sostituzioni: [[".slice(prima.length, prima.length + veri.pezzi.length + 1);", ".slice(0, veri.pezzi.length + 1);"]],
      messaggio: "fra i blocchi del riquadro",
      forme: [opzioniPredefinite, { ...opzioniPredefinite, perOgni: "parole" }],
      deiPunti: true,
    },
    "l'intestazione sulla linea che entra": {
      sostituzioni: [["const x0 = -Math.max(interno.sinistra + m, tema.rientroIntestazione + f.larghezza + tema.luceIntestazione);", "const x0 = -(interno.sinistra + m);"]],
      messaggio: "connettore dentro",
      forme: [{ ...opzioniPredefinite, per: "chiuso", perOgni: "chiuso" }],
    },
  };
  for (const [nome, { sostituzioni, messaggio, forme, deiPunti }] of Object.entries(mutazioniDeiCicli)) {
    test(`mutazione: ${nome}`, async () => {
      for (const [da] of sostituzioni) expect({ nome, da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ nome, da, occorrenze: 1 });
      await mutante(sostituzioni, (fn) => {
        const difetti = deiPunti
          ? forme.flatMap((o) => tuttiGliAlberi.flatMap((a) => esaminaIPunti(disegnaAlbero(fn, a, tema, misura, o), a.funzione).difetti))
          : messaggiDelleDueForme(fn, forme);
        const conIlMessaggio = difetti.filter((d) => d.includes(messaggio));
        console.log(`mutazione del riquadro ${nome}: difetti ${difetti.length}, «${messaggio}» ${conIlMessaggio.length}, il primo: ${conIlMessaggio[0]}`);
        expect(conIlMessaggio.length).toBeGreaterThan(0);
      });
    }, 30_000);
  }

  // La clausola «una pagina» della tappa 2, come quella della tappa 1 (sopra): il riferimento coi `per`, coi valori
  // iniziali nascosti, adattato all'area dichiarata di 1540 × 1000, nelle forme del `per` (il `per ogni` non c'è).
  // La soglia di 6 px vale coi `per` chiusi; coi `per` aperti (la forma predefinita, misurata a
  // 5,88 px) la misura si scrive senza soglia, come coi valori iniziali mostrati della tappa 1. Il margine si scrive.
  const SOGLIA_ADATTA = 6;
  for (const per of ["aperto", "chiuso"] as const)
    for (const [lingua, testiDellaLingua] of [
      ["it", { ...testi, espressione: (t: string) => traduciEspressione(t, nomiDegliOperatori.it) }],
      ["en", testi],
    ] as const)
      test(`il riferimento della tappa 2 coi valori iniziali nascosti, adattato a 1540 × 1000: ${per === "chiuso" ? `carattere di almeno ${SOGLIA_ADATTA} px` : "la misura, senza soglia"} (per ${per}, ${lingua})`, () => {
        const scala = (d: Disegno) => Math.min(1540 / d.larghezza, 1000 / d.altezza, 1);
        const opzioni = { ...opzioniPredefinite, valoriIniziali: "nascosti", per } as const;
        const d = impagina(delCiclo.funzione, tema, misura, testiDellaLingua, opzioni);
        const carattere = scala(d) * tema.carattere;
        console.log(
          `riferimento della tappa 2, per ${per}, ${lingua}: ${Math.round(d.larghezza)} × ${Math.round(d.altezza)} px, scala ${scala(d).toFixed(3)}, ` +
            `carattere ${carattere.toFixed(2)} px, margine ${(carattere - SOGLIA_ADATTA).toFixed(2)} px`,
        );
        if (per === "chiuso") expect(carattere).toBeGreaterThanOrEqual(SOGLIA_ADATTA);
        // Aperti, il disegno è più alto: le premesse della misura scritta (i blocchi aggiunti, che allungano).
        else expect(d.elementi.filter((e) => e.fase !== undefined).length).toBe(6);
        // La premessa: il riferimento ha i due cicli coi loro riquadri.
        expect(d.riquadri.length).toBe(2);
        // Controllo positivo: col corpo raddoppiato non ci sta.
        const doppio = { ...delCiclo.funzione, body: [...delCiclo.funzione.body, ...delCiclo.funzione.body] };
        expect(scala(impagina(doppio, tema, misura, testiDellaLingua, opzioni)) * tema.carattere).toBeLessThan(SOGLIA_ADATTA);
      });
});

// ------------------------------------------------------------------------------- procedure e funzioni
//
// Il riferimento della tappa 3 («media dei voti con le funzioni»), con gli attesi SCRITTI A MANO prima del codice:
// l'intestazione di una procedura e di una funzione col nome in grassetto e *rif* e
// il tipo in corsivo, la fine «Restituisce …» di una funzione e «Fine» di una procedura, il salto con la freccia e il nome
// in grassetto e *rif* in corsivo davanti all'argomento per riferimento, il nome di una funzione del progetto in grassetto
// anche dentro un'espressione. I pezzi si confrontano riuniti per stile (come sono divisi è un dettaglio), scritti
// «stile:testo» (n normale, g grassetto, c corsivo). Poi «Adatta» su ogni funzione del riferimento.

describe("procedure e funzioni nel disegno", () => {
  const funzioniDi = riferimento3.functions;
  const funzioneDi = (nome: string | undefined) => funzioniDi.find((f) => f.name === nome)!;
  /** I pezzi di ogni riga riuniti per stile, «stile:testo»; senza pezzi, la riga intera come normale. */
  const pezziDi = (e: Elemento): string[] =>
    (e.pezzi ?? e.righe.map((r): ParteDelTesto[] => [{ testo: r, espressione: false }])).map((riga) =>
      riga
        .reduce<{ stile: string; testo: string }[]>((fuori, p) => {
          const stile = p.stile === "grassetto" ? "g" : p.stile === "corsivo" ? "c" : "n";
          const ultimo = fuori[fuori.length - 1];
          if (ultimo?.stile === stile) ultimo.testo += p.testo;
          else fuori.push({ stile, testo: p.testo });
          return fuori;
        }, [])
        .map((x) => `${x.stile}:${x.testo}`)
        .join(" | "),
    );
  const disegnoDi = (nome: string | undefined, t: TestiDelDisegno = testi) => impagina(funzioneDi(nome), tema, misura, t, opzioniPredefinite, [], funzioniDi);
  const formaDi = (d: Disegno, chi: (e: Elemento) => boolean) => d.elementi.find(chi)!;

  test("il riferimento della tappa 3: intestazioni, fine, salti e i nomi delle funzioni in grassetto, come scritti a mano", () => {
    const principale = disegnoDi(undefined);
    expect(pezziDi(formaDi(principale, (e) => e.forma === "inizio"))).toEqual(["n:Inizio"]);
    expect(pezziDi(formaDi(principale, (e) => e.forma === "fine"))).toEqual(["n:Fine"]);
    // Il parametro per uscita con la sua parola in corsivo, come il riferimento.
    expect(pezziDi(formaDi(principale, (e) => e.id === "b1"))).toEqual(["n:↪  | g:leggi_numero | n:( | c:out | n: n)"]);
    expect(pezziDi(formaDi(principale, (e) => e.id === "b13"))).toEqual(["n:↪  | g:stelle | n:(somma / contati)"]);
    expect(pezziDi(formaDi(principale, (e) => e.id === "b4"))).toEqual(["g:valido | n:(voto)"]);
    // Le forme: il salto è il blocco della chiamata, il rombo resta un rombo.
    expect([formaDi(principale, (e) => e.id === "b1").forma, formaDi(principale, (e) => e.id === "b4").forma]).toEqual(["chiamata", "condizione"]);
    // Un blocco senza nomi di funzioni non ha pezzi.
    expect(formaDi(principale, (e) => e.id === "b11").pezzi).toBeUndefined();

    const leggi = disegnoDi("leggi_numero");
    expect(pezziDi(formaDi(leggi, (e) => e.forma === "inizio"))).toEqual(["n:Procedura  | g:leggi_numero | n:( | c:out | n: numero)"]);
    // *rif* in corsivo, nell'intestazione e nel salto: la stessa procedura col parametro per riferimento.
    const conRif = funzioniDi.map((f) => (f.name === "leggi_numero" ? { ...f, data: f.data.map((d) => (d.parameter === "out" ? { ...d, parameter: "reference" as const } : d)) } : f));
    const dellaVariante = (nome: string | undefined) => impagina(conRif.find((f) => f.name === nome)!, tema, misura, testi, opzioniPredefinite, [], conRif);
    expect(pezziDi(formaDi(dellaVariante("leggi_numero"), (e) => e.forma === "inizio"))).toEqual(["n:Procedura  | g:leggi_numero | n:( | c:rif | n: numero)"]);
    expect(pezziDi(formaDi(dellaVariante(undefined), (e) => e.id === "b1"))).toEqual(["n:↪  | g:leggi_numero | n:( | c:rif | n: n)"]);
    expect(pezziDi(formaDi(leggi, (e) => e.forma === "fine"))).toEqual(["n:Fine"]);
    const valido = disegnoDi("valido");
    expect(pezziDi(formaDi(valido, (e) => e.forma === "inizio"))).toEqual(["n:Funzione  | c:booleano | n: ←  | g:valido | n:(voto)"]);
    expect(pezziDi(formaDi(valido, (e) => e.forma === "fine"))).toEqual(["n:Restituisce voto >= 1 and voto <= 10"]);
    const stelle = disegnoDi("stelle");
    expect(pezziDi(formaDi(stelle, (e) => e.forma === "inizio"))).toEqual(["n:Procedura  | g:stelle | n:(quante)"]);
    // In inglese, con le parole dell'altra lingua.
    const testiEn: TestiDelDisegno = { ...testi, fine: "End", funzioni: funzioniEn };
    expect(pezziDi(formaDi(disegnoDi("valido", testiEn), (e) => e.forma === "inizio"))).toEqual(["n:Function  | c:boolean | n: ←  | g:valido | n:(voto)"]);
    expect(pezziDi(formaDi(disegnoDi("valido", testiEn), (e) => e.forma === "fine"))).toEqual(["n:Returns voto >= 1 and voto <= 10"]);
    expect(pezziDi(formaDi(impagina(conRif[0]!, tema, misura, testiEn, opzioniPredefinite, [], conRif), (e) => e.id === "b1"))).toEqual(["n:↪  | g:leggi_numero | n:( | c:ref | n: n)"]);
    // Senza le funzioni del progetto un salto non sa chi chiama: nessun *rif*, e nessun nome in grassetto nelle espressioni.
    const senza = impagina(funzioneDi(undefined), tema, misura, testi);
    expect(pezziDi(formaDi(senza, (e) => e.id === "b1"))).toEqual(["n:↪  | g:leggi_numero | n:(n)"]);
    expect(formaDi(senza, (e) => e.id === "b4").pezzi).toBeUndefined();
  });

  test("il nome di una funzione in una condizione lunga, su due righe: ogni riga coi suoi pezzi", () => {
    const f: Funzione = {
      id: "f1",
      kind: "main",
      data: [],
      body: [{ id: "c1", kind: "if", condition: "valido(un_voto_molto_lungo) and valido(un_altro_voto_lungo + 1)", then: [], else: [] }],
      end: { id: "c2" },
    };
    const d = impagina(f, tema, misura, testi, opzioniPredefinite, [], [f, funzioneDi("valido")]);
    expect(pezziDi(formaDi(d, (e) => e.id === "c1"))).toEqual(["g:valido | n:(un_voto_molto_lungo)", "n:and  | g:valido | n:(un_altro_voto_lungo + 1)"]);
  });

  // La clausola «una pagina» su ogni funzione del riferimento della tappa 3, come per le tappe 1 e 2: adattata all'area
  // dichiarata di 1540 × 1000, coi valori iniziali nascosti, nelle due forme del `per`, il carattere e il margine scritti.
  const SOGLIA_ADATTA = 6;
  for (const per of ["aperto", "chiuso"] as const)
    for (const [lingua, testiDellaLingua] of [
      ["it", { ...testi, espressione: (t: string) => traduciEspressione(t, nomiDegliOperatori.it) }],
      ["en", { ...testi, funzioni: funzioniEn }],
    ] as const)
      test(`ogni funzione del riferimento della tappa 3 adattata a 1540 × 1000, coi valori nascosti (per ${per}, ${lingua})`, () => {
        const scala = (d: Disegno) => Math.min(1540 / d.larghezza, 1000 / d.altezza, 1);
        const opzioni = { ...opzioniPredefinite, valoriIniziali: "nascosti", per } as const;
        const misurate = funzioniDi.map((f) => {
          const d = impagina(f, tema, misura, testiDellaLingua, opzioni, [], funzioniDi);
          const carattere = scala(d) * tema.carattere;
          console.log(
            `riferimento della tappa 3, ${f.name ?? "programma principale"}, per ${per}, ${lingua}: ${Math.round(d.larghezza)} × ${Math.round(d.altezza)} px, ` +
              `scala ${scala(d).toFixed(3)}, carattere ${carattere.toFixed(2)} px, margine ${(carattere - SOGLIA_ADATTA).toFixed(2)} px`,
          );
          return { f, carattere };
        });
        expect(misurate.length).toBe(4);
        for (const { f, carattere } of misurate) expect({ funzione: f.name ?? "principale", almenoLaSoglia: carattere >= SOGLIA_ADATTA }).toEqual({ funzione: f.name ?? "principale", almenoLaSoglia: true });
        // Controllo positivo: il programma principale col corpo triplicato non ci sta (raddoppiato, coi `per` chiusi, ci sta ancora: 6,13 px).
        const p = funzioneDi(undefined);
        expect(scala(impagina({ ...p, body: [...p.body, ...p.body, ...p.body] }, tema, misura, testiDellaLingua, opzioni, [], funzioniDi)) * tema.carattere).toBeLessThan(SOGLIA_ADATTA);
      });
});

// ------------------------------------------------------------------------------- i valori iniziali
//
// Il valore iniziale di un dato si vede come un blocco di assegnazione sotto «Inizio», disegnato dal dato (la sola
// fonte: nessun blocco nell'albero). I rilevatori leggono dalla FUNZIONE quali dati hanno un valore iniziale e in che
// ordine, e cercano i blocchi nel disegno per nome:
// - uno per dato con valore iniziale, nell'ordine dei dati (le costanti comuni prima), col testo del dato;
// - in colonna sotto «Inizio», sull'asse principale, ognuno a un passo dal precedente, e ogni altra forma e ogni
//   punto di inserimento sotto l'ultimo (nessun «+» prima o fra di loro: lo guarda anche il rilevatore dei punti);
// - coi valori nascosti il disegno è quello della stessa funzione senza dati.
// Le coordinate si ricalcolano dal tema, mai scritte; quelle del riferimento sono scritte a mano dal tema (sotto).
//
// CHE COSA NON GUARDA: il blocco nello strato delle modifiche e nella struttura accessibile (non c'è: si vede e non
// si sceglie), né l'esecuzione dei valori iniziali.

/** I difetti dei blocchi dei valori iniziali di un disegno, coi dati della funzione (e le costanti comuni). */
function esaminaIValoriIniziali(d: Disegno, f: Funzione, opzioni: OpzioniDelDisegno, comuni: readonly Funzione["data"][number][] = []): { difetti: string[]; blocchi: number } {
  const difetti: string[] = [];
  const attesi = opzioni.valoriIniziali === "nascosti" ? [] : [...comuni, ...f.data].filter((x) => x.initial !== undefined);
  const visti = d.elementi.filter((e) => e.dato !== undefined).sort((a, b) => a.riquadro.y - b.riquadro.y);
  const nomi = (xs: readonly string[]) => xs.join(", ");
  if (nomi(visti.map((e) => e.dato!)) !== nomi(attesi.map((x) => x.name))) difetti.push(`valori iniziali [${nomi(visti.map((e) => e.dato!))}] invece di [${nomi(attesi.map((x) => x.name))}]`);
  const inizio = d.elementi.find((e) => e.forma === "inizio")!.riquadro;
  const asse = inizio.x + inizio.larghezza / 2;
  let sotto = inizio.y + inizio.altezza;
  visti.forEach((e, i) => {
    const x = attesi[i];
    if (x !== undefined && e.testo !== testoDelValoreIniziale(x, testi, opzioni.valoreRipetuto)) difetti.push(`testo del valore iniziale di ${e.dato}: ${e.testo}`);
    if (e.forma !== "assegnazione" || e.id !== "") difetti.push(`valore iniziale di ${e.dato} con forma ${e.forma} e id «${e.id}»`);
    if (Math.abs(e.riquadro.y - (sotto + tema.passoVerticale)) > 0.01) difetti.push(`valore iniziale di ${e.dato} non a un passo dal precedente`);
    if (Math.abs(e.riquadro.x + e.riquadro.larghezza / 2 - asse) > 0.01) difetti.push(`valore iniziale di ${e.dato} fuori dall'asse principale`);
    sotto = e.riquadro.y + e.riquadro.altezza;
  });
  for (const e of d.elementi) if (e.dato === undefined && e.forma !== "inizio" && !(e.riquadro.y > sotto)) difetti.push(`${e.id} non sotto i valori iniziali`);
  for (const p of d.punti) if (!(p.y > sotto)) difetti.push(`punto ${chiave(p.posto)} non sotto i valori iniziali`);
  return { difetti, blocchi: visti.length };
}

describe("i valori iniziali sotto «Inizio»", () => {
  const leForme: readonly OpzioniDelDisegno[] = [
    ...leDueForme,
    { ...opzioniPredefinite, valoreRipetuto: "un-valore" },
    { ...opzioniPredefinite, valoriIniziali: "nascosti" },
  ];

  test("il riferimento: cinque blocchi, nell'ordine dei dati, alle coordinate scritte a mano dal tema", () => {
    const f = riferimento.funzione;
    const d = impagina(f, tema, misura, testi);
    const iniziali = d.elementi.filter((e) => e.dato !== undefined);
    // Il tema: margine esterno 20, «Inizio» alto 19 + 2 × 5 = 29, passo 36; un blocco di una riga alto 29.
    expect(iniziali.map((e) => [e.testo, e.riquadro.y, e.riquadro.altezza])).toEqual([
      ["contati ← 0", 85, 29],
      ["insufficienti ← 0", 150, 29],
      ["somma ← 0", 215, 29],
      ["i ← 0", 280, 29],
      ["j ← 0", 345, 29],
    ]);
    // Il primo «+» del programma sta al centro della parte libera fra l'ultimo (fondo 374) e il primo tocco sotto: il
    // programma comincia con un commento, alto 29 a un passo (410), e la sua nota parte a metà, 424,5: (374 + 424,5) / 2.
    // Ogni forma del corpo scende di 5 × 65 = 325 rispetto ai valori nascosti, e non si sposta di lato.
    const primo = d.punti.find((p) => chiave(p.posto) === `${f.id}/body/0`)!;
    expect(primo.y).toBe(399.25);
    const nascosti = impagina(f, tema, misura, testi, { ...opzioniPredefinite, valoriIniziali: "nascosti" });
    const spostati = nascosti.elementi
      .filter((e) => e.forma !== "inizio")
      .map((e) => {
        const r = d.elementi.find((x) => x.id === e.id && x.dato === undefined)!.riquadro;
        return [e.id, r.x - e.riquadro.x, r.y - e.riquadro.y];
      });
    expect(spostati.length).toBe(nascosti.elementi.length - 1);
    expect(spostati.filter(([, dx, dy]) => Math.abs(dx as number) > 1e-9 || Math.abs((dy as number) - 325) > 1e-9)).toEqual([]);
  });

  for (const opzioni of leForme)
    test(`un blocco per dato con valore iniziale, in colonna sotto «Inizio», su corpus, generati e costruiti (${opzioni.condizioniLunghe}, ${opzioni.valoriIniziali}, ${opzioni.valoreRipetuto})`, () => {
      const sbagliati: string[] = [];
      let [blocchi, conIniziali] = [0, 0];
      for (const a of tuttiGliAlberi) {
        const esame = esaminaIValoriIniziali(disegnaAlbero(impagina, a, tema, misura, opzioni), a.funzione, opzioni);
        blocchi += esame.blocchi;
        conIniziali += Number(esame.blocchi > 0);
        if (esame.difetti.length > 0) sbagliati.push(`${a.nome}: ${esame.difetti.slice(0, 3).join("; ")}`);
      }
      const attesi = opzioni.valoriIniziali === "nascosti" ? 0 : tuttiGliAlberi.reduce((s, a) => s + a.funzione.data.filter((x) => x.initial !== undefined).length, 0);
      console.log(`valori iniziali ${opzioni.valoriIniziali} (${opzioni.valoreRipetuto}): alberi ${tuttiGliAlberi.length}, con blocchi ${conIniziali}, blocchi ${blocchi} su ${attesi} attesi; difettosi ${sbagliati.length}`);
      expect(sbagliati).toEqual([]);
      expect(blocchi).toBe(attesi);
      if (opzioni.valoriIniziali === "mostrati") expect(blocchi).toBeGreaterThan(100);
    });

  test("gli alberi generati hanno dati con ogni forma di valore iniziale", () => {
    const tutti = generati.flatMap((g) => g.funzione.data);
    const conta = {
      dati: tutti.length,
      letterali: tutti.filter((x) => typeof x.initial === "string").length,
      elenchi: tutti.filter((x) => Array.isArray(x.initial)).length,
      "elenchi di più di dieci": tutti.filter((x) => Array.isArray(x.initial) && x.initial.length > 10).length,
      ripetuti: tutti.filter((x) => x.initial !== undefined && typeof x.initial === "object" && "each" in x.initial).length,
      "senza valore": tutti.filter((x) => x.initial === undefined).length,
      costanti: tutti.filter((x) => x.constant === true).length,
    };
    console.log(`dati degli alberi generati: ${Object.entries(conta).map(([k, n]) => `${k} ${n}`).join(", ")}`);
    for (const [specie, n] of Object.entries(conta)) expect({ specie, presente: n > 0 }).toEqual({ specie, presente: true });
  });

  // Senza valori iniziali, non senza dati: la condizione del `per ogni` aperto con la posizione legge la dimensione del
  // vettore dal suo dato.
  test("coi valori nascosti il disegno è quello della stessa funzione senza valori iniziali", () => {
    let confrontati = 0;
    const senzaValori = (f: Funzione): Funzione => ({ ...f, data: f.data.map(({ initial: _, ...d }) => d) });
    for (const a of tuttiGliAlberi)
      for (const o of leDueForme) {
        const nascosti = { ...o, valoriIniziali: "nascosti" } as const;
        expect(disegnaAlbero(impagina, a, tema, misura, nascosti)).toEqual(impagina(senzaValori(a.funzione), tema, misura, testi, o, [], a.funzioni));
        confrontati++;
      }
    expect(confrontati).toBe(2 * tuttiGliAlberi.length);
    // Controllo positivo: coi valori mostrati il riferimento è un altro disegno.
    expect(impagina(riferimento.funzione, tema, misura, testi)).not.toEqual(impagina(senzaValori(riferimento.funzione), tema, misura, testi));
  });

  test("le costanti comuni per prime, poi i dati del programma", () => {
    const f: Funzione = { ...riferimento.funzione, data: [{ name: "a", type: "integer", initial: "1" }] };
    const comuni = [{ name: "MAX", type: "integer" as const, constant: true, initial: "5" }];
    const d = impagina(f, tema, misura, testi, opzioniPredefinite, comuni);
    expect(d.elementi.filter((e) => e.dato !== undefined).map((e) => e.testo)).toEqual(["MAX ← 5", "a ← 1"]);
    expect(esaminaIValoriIniziali(d, f, opzioniPredefinite, comuni).difetti).toEqual([]);
    // Controllo positivo: senza le costanti comuni il rilevatore vede il blocco che non doveva esserci.
    expect(esaminaIValoriIniziali(d, f, opzioniPredefinite).difetti.length).toBeGreaterThan(0);
  });

  test("un «per ogni» su un vettore delle costanti comuni: il controllo scrive la dimensione, come per un vettore del programma", () => {
    const ciclo = { id: "c1", kind: "for_each", item: "x", source: "VOTI", body: [] } as unknown as Blocco;
    const f: Funzione = { ...riferimento.funzione, data: [{ name: "x", type: "integer" }], body: [ciclo] };
    const comuni = [{ name: "VOTI", type: "integer" as const, constant: true, size: 3, initial: ["7", "4", "9"] }];
    const rombo = (c: readonly Dato[]) => impagina(f, tema, misura, testi, opzioniPredefinite, c).elementi.find((e) => e.id === "c1" && e.fase === "condizione")?.testo;
    expect(rombo(comuni)).toBe("_indice < 3");
    // Controllo positivo: senza le costanti comuni il nome non si trova, e il testo è quello della stringa.
    expect(rombo([])).not.toBe("_indice < 3");
  });

  test("un file scritto a mano non confonde un blocco con un valore iniziale: l'id vuoto non si apre, gli altri restano dei blocchi", () => {
    const testo = readFileSync(join(cartellaCasi, "riferimento-media-voti.algo"), "utf8");
    // L'id dei blocchi dei valori iniziali è vuoto: un blocco con l'id vuoto non si apre.
    const vuoto = JSON.parse(testo);
    vuoto.functions[0].body[0].id = "";
    const esitoVuoto = apri(JSON.stringify(vuoto));
    expect(esitoVuoto.ok).toBe(false);
    // Blocchi con gli id che somigliano a un dato o a un valore iniziale restano blocchi, uno per id.
    const simili = JSON.parse(testo);
    const candidati = ["contati", "iniziale-contati", "valore-iniziale", "f1/contati"];
    candidati.forEach((id, i) => (simili.functions[0].body[i].id = id));
    const esito = apri(JSON.stringify(simili));
    if (!esito.ok) throw new Error("il file con gli id simili non si apre");
    const d = impagina(esito.progetto.functions[0]!, tema, misura, testi);
    for (const id of candidati) expect({ id, forme: d.elementi.filter((e) => e.id === id).map((e) => e.dato ?? "blocco") }).toEqual({ id, forme: ["blocco"] });
    expect(d.elementi.filter((e) => e.dato !== undefined).map((e) => e.dato)).toEqual(["contati", "insufficienti", "somma", "i", "j"]);
  });

  test("mutazione: un dato saltato", async () => {
    const sostituzioni: [string, string][] = [["const conValore = [...costantiComuni, ...funzione.data]", "const conValore = [...costantiComuni, ...funzione.data].slice(1)"]];
    for (const [da] of sostituzioni) expect({ da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ da, occorrenze: 1 });
    await mutante(sostituzioni, (fn) => {
      const difetti = tuttiGliAlberi.flatMap((a) => esaminaIValoriIniziali(disegnaAlbero(fn, a, tema, misura, opzioniPredefinite), a.funzione, opzioniPredefinite).difetti);
      console.log(`mutazione dei valori iniziali, un dato saltato: difetti ${difetti.length}, il primo: ${difetti[0]}`);
      expect(difetti.some((x) => x.startsWith("valori iniziali ["))).toBe(true);
    });
  }, 30_000);
});

describe("il tempo d'impaginazione dei programmi più grandi delle prove", () => {
  // Soglia dichiarata: 50 ms di mediana. Misurato prima di fissarla (mediana di 15 corse): riferimento
  // ripetuto tre volte, 69 blocchi, 6,1 ms in Bun, 7,8 in Chromium, 5 in WebKit; il generato più grande, 99
  // blocchi, 22,3 ms in Bun, 15,4 in Chromium, 21 in WebKit; la crescita più che lineare (il riferimento
  // ripetuto sei volte, 138 blocchi: 38 ms in Bun), e dentro questa corsa, dopo migliaia di impaginazioni, il
  // generato più grande a 68,5 ms: oltre la soglia. Veniva dall'unione dei tratti in linee intere, che
  // ricominciava da capo dopo ogni unione; resa lineare, con lo stesso disegno (confrontato su tutti gli
  // alberi delle prove): 1,0 e 1,3 ms in Chromium, 1 e 1 in WebKit, 0,9 e 1,5 in Bun, 0,6 e 1,4 qui.
  const SOGLIA_MS = 50;
  const conta = (bs: readonly Blocco[]) => blocchiDi(bs).length;
  const mediana = (fn: Funzione) => {
    for (let i = 0; i < 3; i++) impagina(fn, tema, misura, testi);
    const tempi = Array.from({ length: 15 }, () => {
      const t0 = performance.now();
      impagina(fn, tema, misura, testi);
      return performance.now() - t0;
    }).sort((a, b) => a - b);
    return tempi[7]!;
  };
  const piuGrande = generati.reduce((m, g) => (conta(g.funzione.body) > conta(m.funzione.body) ? g : m));
  const ripetuto = { ...riferimento.funzione, body: [0, 1, 2].flatMap(() => riferimento.funzione.body) };
  for (const [nome, fn] of [
    ["il riferimento ripetuto tre volte", ripetuto],
    [`il generato più grande (${piuGrande.nome})`, piuGrande.funzione],
  ] as const) {
    test(`${nome}: sotto ${SOGLIA_MS} ms`, () => {
      const ms = mediana(fn);
      console.log(`tempo d'impaginazione, ${nome}: blocchi ${conta(fn.body)}, mediana ${ms.toFixed(1)} ms (soglia ${SOGLIA_MS})`);
      expect(conta(fn.body)).toBeGreaterThanOrEqual(69);
      expect(ms).toBeLessThan(SOGLIA_MS);
    });
  }
});

// ---------------------------------------------------------------------------------- funzione pura

test("funzione pura: lo stesso albero dà la stessa geometria, anche ricostruito", () => {
  for (const a of [riferimento, ...generati.slice(0, 20)]) {
    const copia: Funzione = JSON.parse(JSON.stringify(a.funzione));
    expect(impagina(copia, tema, misura, testi)).toEqual(disegnaAlbero(impagina, a, tema, misura));
  }
  // Controllo positivo: il confronto vede una differenza di geometria.
  expect(impagina(riferimento.funzione, { ...tema, passoVerticale: tema.passoVerticale + 1 }, misura, testi)).not.toEqual(
    impagina(riferimento.funzione, tema, misura, testi),
  );
});

// Il rombo di un ciclo porta il segno `ciclo` (l'interfaccia gli dà il colore dei cicli), quello del «se» no: in ogni
// forma dei cicli, sui file del corpus che hanno «se», «mentre», «ripeti», «per» e «per ogni».
test("il rombo di ogni ciclo, aperto o nel riquadro, ha il segno del ciclo; quello del «se» no", () => {
  const conti = { se: 0, cicli: 0 };
  const visti = new Set<string>();
  for (const [tappa, nome] of [
    ["tappa-1", "riferimento-media-voti"],
    ["tappa-2", "riferimento-media-voti-per"],
    ["tappa-2", "parola-al-contrario"],
  ] as const) {
    const e = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", tappa, `${nome}.algo`), "utf8"));
    if (!e.ok) throw new Error(`${nome} non si apre`);
    const funzione = e.progetto.functions[0]!;
    const genere = new Map<string, Blocco["kind"]>();
    const visita = (bs: readonly Blocco[]): void => {
      for (const b of bs) {
        genere.set(b.id, b.kind);
        for (const s of ["then", "else", "body"] as const) if (s in b) visita((b as unknown as Record<string, readonly Blocco[]>)[s]!);
      }
    };
    visita(funzione.body);
    for (const opzioni of [opzioniPredefinite, { ...opzioniPredefinite, perOgni: "parole" as const }])
      for (const r of impagina(funzione, tema, misura, testi, opzioni).elementi.filter((x) => x.forma === "condizione")) {
        const k = genere.get(r.id);
        expect(r.ciclo === true, `${nome} ${r.id} ${k}`).toBe(k !== "if");
        conti[k === "if" ? "se" : "cicli"]++;
        visti.add(k!);
      }
  }
  // Le premesse: rombi di «se» e di cicli, e ogni genere di ciclo.
  console.log(`rombi: del «se» ${conti.se}, dei cicli ${conti.cicli}`);
  expect(conti.se).toBeGreaterThan(0);
  expect(conti.cicli).toBeGreaterThan(0);
  expect([...visti].sort()).toEqual(["for", "for_each", "if", "repeat", "while"]);
});

// La copia di un record col suo nome (`b ← a`), sul programma del corpus `casi/tipi/copia-di-un-record.algo`: gli attesi
// scritti qui a mano dal flowchart. Compatta, l'assegnazione nel riquadro con la scritta «copia campo per campo»;
// espansa, l'intestazione e un'assegnazione per campo, una sotto l'altra sull'asse, nel riquadro, senza il `mentre` (nessun
// rombo, nessuna posizione). Le prove generiche dei riquadri qui sopra riconoscono solo la copia di un vettore: questa
// guarda la geometria del riquadro nuovo da sé.
describe("la copia di un record nel riquadro", () => {
  const e = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", "copia-di-un-record.algo"), "utf8"));
  if (!e.ok) throw new Error("copia-di-un-record non si apre");
  const p = e.progetto;
  const disegno = (copia: "compatta" | "espansa") => impagina(p.functions[0]!, tema, misura, testi, { ...opzioniPredefinite, copia }, [], p.functions, p.records ?? []);
  /** Della copia (`b1`): gli elementi in ordine dall'alto, col testo, la forma, la fase e il campo. */
  const dellaCopia = (d: Disegno) =>
    d.elementi
      .filter((x) => x.id === "b1")
      .sort((a, b) => a.riquadro.y - b.riquadro.y)
      .map((x) => ({ testo: x.testo, forma: x.forma, ...(x.fase !== undefined ? { fase: x.fase } : {}), ...(x.campo !== undefined ? { campo: x.campo } : {}) }));

  test("compatta: l'assegnazione dentro, la scritta sul bordo", () => {
    const d = disegno("compatta");
    expect(dellaCopia(d)).toEqual([{ testo: "b ← a", forma: "assegnazione" }]);
    const r = d.riquadri.filter((x) => x.blocco === "b1");
    expect(r.length).toBe(1);
    expect(r[0]!.didascalia?.testo).toBe("copia campo per campo");
  });

  test("espansa: l'intestazione e un'assegnazione per campo, nel riquadro, sull'asse, senza sovrapporsi", () => {
    const d = disegno("espansa");
    expect(dellaCopia(d)).toEqual([
      { testo: "b ← a: copia campo per campo", forma: "intestazione" },
      { testo: "b.nome ← a.nome", forma: "assegnazione", fase: "elemento", campo: 0 },
      { testo: "b.classe ← a.classe", forma: "assegnazione", fase: "elemento", campo: 1 },
      { testo: "b.voto ← a.voto", forma: "assegnazione", fase: "elemento", campo: 2 },
    ]);
    const r = d.riquadri.filter((x) => x.blocco === "b1");
    expect(r.length).toBe(1);
    expect(r[0]!.didascalia).toBeUndefined();
    const bordo = r[0]!.bordo;
    const campi = d.elementi.filter((x) => x.id === "b1" && x.campo !== undefined);
    const difetti: string[] = [];
    // L'asse: il centro del blocco che segue la copia.
    const asse = ((q) => q.x + q.larghezza / 2)(d.elementi.find((x) => x.id === "b2")!.riquadro);
    for (const c of campi) {
      const q = c.riquadro;
      if (!(q.x > bordo.x && q.x + q.larghezza < bordo.x + bordo.larghezza && q.y > bordo.y && q.y + q.altezza < bordo.y + bordo.altezza)) difetti.push(`campo ${c.campo} fuori dal riquadro`);
      if (Math.abs(q.x + q.larghezza / 2 - asse) > EPS) difetti.push(`campo ${c.campo} fuori dall'asse`);
    }
    // Nessuna forma della funzione tocca un'altra, e nessuna fuori dal riquadro gli sta dentro.
    const forme = d.elementi.filter((x) => x.dato === undefined);
    forme.forEach((a, i) => forme.slice(i + 1).forEach((b) => sovrapposti(a.riquadro, b.riquadro, DISTANZA_MINIMA) && difetti.push(`${a.testo} tocca ${b.testo}`)));
    for (const x of forme.filter((f) => f.id !== "b1")) {
      const q = x.riquadro;
      if (sovrapposti(q, bordo, 0)) difetti.push(`${x.testo} dentro il riquadro della copia`);
    }
    // Il `mentre` del vettore non c'è: nessun rombo della copia.
    if (d.elementi.some((x) => x.id === "b1" && x.forma === "condizione")) difetti.push("un rombo nella copia di un record");
    expect(difetti).toEqual([]);
    expect(campi.length).toBe(3);
  });

  test("un dato che non è un record, o un campo, non fa il riquadro", () => {
    const f = p.functions[0]!;
    const conCampo: Funzione = { ...f, body: [{ id: "b1", kind: "assignment", target: "b.nome", value: "a.nome" }] };
    const d = impagina(conCampo, tema, misura, testi, { ...opzioniPredefinite, copia: "espansa" }, [], [conCampo], p.records ?? []);
    expect(d.riquadri.length).toBe(0);
    // Senza i record del progetto (il record non c'è) l'assegnazione resta semplice.
    expect(impagina(f, tema, misura, testi, { ...opzioniPredefinite, copia: "espansa" }, [], p.functions).riquadri.length).toBe(0);
  });
});

// La copia di una matrice col suo nome (`b ← a`) e di una sua riga, sul programma del corpus
// `casi/tipi/copia-di-una-matrice.algo`: gli attesi scritti qui a mano dal flowchart. Espansa, la copia della matrice ha il
// ciclo delle colonne (`_indice2`, le parti con `interno`) dentro quello delle righe (`_indice`); la copia di una riga è
// quella di un vettore, lunga quanto le colonne. Compatta, il riquadro con la scritta come per un vettore. I segni
// dell'esecuzione distinguono la stessa fase nei due cicli.
describe("la copia di una matrice nel riquadro", () => {
  const e = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", "copia-di-una-matrice.algo"), "utf8"));
  if (!e.ok) throw new Error("copia-di-una-matrice non si apre");
  const p = e.progetto;
  const disegno = (copia: "compatta" | "espansa") => impagina(p.functions[0]!, tema, misura, testi, { ...opzioniPredefinite, copia }, [], p.functions, p.records ?? []);
  /** Di un blocco: gli elementi in ordine dall'alto, col testo, la forma, la fase e `interno`. */
  const di = (d: Disegno, id: string) =>
    d.elementi
      .filter((x) => x.id === id && x.dato === undefined)
      .sort((a, b) => a.riquadro.y - b.riquadro.y)
      .map((x) => ({ testo: x.testo, forma: x.forma, ...(x.fase !== undefined ? { fase: x.fase } : {}), ...(x.interno ? { interno: true } : {}) }));

  test("espansa: il ciclo delle colonne dentro quello delle righe, tutto nel riquadro, senza sovrapporsi", () => {
    const d = disegno("espansa");
    expect(di(d, "b1")).toEqual([
      { testo: "b ← a: copia elemento per elemento", forma: "intestazione" },
      { testo: "_indice ← 0", forma: "assegnazione", fase: "inizio" },
      { testo: "_indice < 2", forma: "condizione", fase: "condizione" },
      { testo: "_indice2 ← 0", forma: "assegnazione", fase: "inizio", interno: true },
      { testo: "_indice2 < 2", forma: "condizione", fase: "condizione", interno: true },
      { testo: "b[_indice][_indice2] ← a[_indice][_indice2]", forma: "assegnazione", fase: "elemento", interno: true },
      { testo: "_indice2 ← _indice2 + 1", forma: "assegnazione", fase: "passo", interno: true },
      { testo: "_indice ← _indice + 1", forma: "assegnazione", fase: "passo" },
    ]);
    const r = d.riquadri.filter((x) => x.blocco === "b1");
    expect(r.length).toBe(1);
    const bordo = r[0]!.bordo;
    const difetti: string[] = [];
    for (const x of d.elementi.filter((y) => y.id === "b1" && y.fase !== undefined)) {
      const q = x.riquadro;
      if (!(q.x > bordo.x && q.x + q.larghezza < bordo.x + bordo.larghezza && q.y > bordo.y && q.y + q.altezza < bordo.y + bordo.altezza)) difetti.push(`${x.testo} fuori dal riquadro`);
    }
    const forme = d.elementi.filter((x) => x.dato === undefined);
    forme.forEach((a, i) => forme.slice(i + 1).forEach((b) => sovrapposti(a.riquadro, b.riquadro, DISTANZA_MINIMA) && difetti.push(`${a.testo} tocca ${b.testo}`)));
    for (const x of forme.filter((f) => f.id !== "b1")) if (sovrapposti(x.riquadro, bordo, 0)) difetti.push(`${x.testo} dentro il riquadro della copia`);
    expect(difetti).toEqual([]);
  });

  test("espansa: la copia di una riga, nei due versi, è quella di un vettore lunga quanto le colonne", () => {
    const d = disegno("espansa");
    expect(di(d, "b5").map((x) => x.testo)).toEqual(["v ← a[1]: copia elemento per elemento", "_indice ← 0", "_indice < 2", "v[_indice] ← a[1][_indice]", "_indice ← _indice + 1"]);
    expect(di(d, "b8").map((x) => x.testo)).toEqual(["a[0] ← v: copia elemento per elemento", "_indice ← 0", "_indice < 2", "a[0][_indice] ← v[_indice]", "_indice ← _indice + 1"]);
    expect(di(d, "b5").some((x) => "interno" in x) || di(d, "b8").some((x) => "interno" in x)).toBe(false);
  });

  test("compatta: le tre copie nel riquadro con la scritta, come quella di un vettore", () => {
    const d = disegno("compatta");
    for (const id of ["b1", "b5", "b8"]) {
      const r = d.riquadri.filter((x) => x.blocco === id);
      expect(r.length, id).toBe(1);
      expect(r[0]!.didascalia?.testo, id).toBe("copia elemento per elemento");
    }
    expect(di(d, "b1")).toEqual([{ testo: "b ← a", forma: "assegnazione" }]);
  });

  test("i segni: la stessa fase delle righe o delle colonne, secondo la pausa; nella compatta l'assegnazione", () => {
    const d = disegno("espansa");
    const correnti = (interno: boolean, fase: "inizio" | "condizione" | "elemento" | "passo") => {
      const segni = segniDelDisegno(d.elementi, { corrente: "b1", faseCorrente: fase, internoCorrente: interno });
      return d.elementi.filter((x) => segni(x).corrente).map((x) => x.testo);
    };
    expect(correnti(false, "inizio")).toEqual(["_indice ← 0"]);
    expect(correnti(true, "inizio")).toEqual(["_indice2 ← 0"]);
    expect(correnti(false, "passo")).toEqual(["_indice ← _indice + 1"]);
    expect(correnti(true, "passo")).toEqual(["_indice2 ← _indice2 + 1"]);
    expect(correnti(true, "elemento")).toEqual(["b[_indice][_indice2] ← a[_indice][_indice2]"]);
    // Controllo positivo: senza distinguere i due cicli, la stessa fase ne accenderebbe due.
    expect(d.elementi.filter((x) => x.id === "b1" && x.fase === "inizio").length).toBe(2);
    const compatta = disegno("compatta");
    const segni = segniDelDisegno(compatta.elementi, { corrente: "b1", faseCorrente: "elemento", internoCorrente: true });
    expect(compatta.elementi.filter((x) => segni(x).corrente).map((x) => x.testo)).toEqual(["b ← a"]);
  });
});

// La copia di una tabella col suo nome (`u ← t`) e di un suo record (`r ← t[1]`, `u[1] ← r`, `u[0] ← u[1]`), sul programma
// del corpus `casi/tipi/copia-di-una-tabella.algo` (il record `alunno`: nome, classe, voto): gli attesi scritti qui a mano
// dal flowchart. Espansa, la copia della tabella ha nel ciclo dei record un'assegnazione per campo (la fase «elemento» col
// campo), la copia di un record le assegnazioni dei campi della copia fra due record; compatta, i riquadri con la scritta.
// I segni dell'esecuzione accendono il blocco del campo della pausa.
describe("la copia di una tabella nel riquadro", () => {
  const e = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", "copia-di-una-tabella.algo"), "utf8"));
  if (!e.ok) throw new Error("copia-di-una-tabella non si apre");
  const p = e.progetto;
  const disegno = (copia: "compatta" | "espansa") => impagina(p.functions[0]!, tema, misura, testi, { ...opzioniPredefinite, copia }, [], p.functions, p.records ?? []);
  /** Di un blocco: gli elementi in ordine dall'alto, col testo, la forma, la fase e il campo. */
  const di = (d: Disegno, id: string) =>
    d.elementi
      .filter((x) => x.id === id && x.dato === undefined)
      .sort((a, b) => a.riquadro.y - b.riquadro.y)
      .map((x) => ({ testo: x.testo, forma: x.forma, ...(x.fase !== undefined ? { fase: x.fase } : {}), ...(x.campo !== undefined ? { campo: x.campo } : {}) }));

  test("espansa: nel ciclo dei record un'assegnazione per campo, tutto nel riquadro, senza sovrapporsi", () => {
    const d = disegno("espansa");
    expect(di(d, "b1")).toEqual([
      { testo: "u ← t: copia elemento per elemento", forma: "intestazione" },
      { testo: "_indice ← 0", forma: "assegnazione", fase: "inizio" },
      { testo: "_indice < 2", forma: "condizione", fase: "condizione" },
      { testo: "u[_indice].nome ← t[_indice].nome", forma: "assegnazione", fase: "elemento", campo: 0 },
      { testo: "u[_indice].classe ← t[_indice].classe", forma: "assegnazione", fase: "elemento", campo: 1 },
      { testo: "u[_indice].voto ← t[_indice].voto", forma: "assegnazione", fase: "elemento", campo: 2 },
      { testo: "_indice ← _indice + 1", forma: "assegnazione", fase: "passo" },
    ]);
    const r = d.riquadri.filter((x) => x.blocco === "b1");
    expect(r.length).toBe(1);
    const bordo = r[0]!.bordo;
    const difetti: string[] = [];
    for (const x of d.elementi.filter((y) => y.id === "b1" && y.fase !== undefined)) {
      const q = x.riquadro;
      if (!(q.x > bordo.x && q.x + q.larghezza < bordo.x + bordo.larghezza && q.y > bordo.y && q.y + q.altezza < bordo.y + bordo.altezza)) difetti.push(`${x.testo} fuori dal riquadro`);
    }
    const forme = d.elementi.filter((x) => x.dato === undefined);
    forme.forEach((a, i) => forme.slice(i + 1).forEach((b) => sovrapposti(a.riquadro, b.riquadro, DISTANZA_MINIMA) && difetti.push(`${a.testo} tocca ${b.testo}`)));
    for (const x of forme.filter((f) => f.id !== "b1")) if (sovrapposti(x.riquadro, bordo, 0)) difetti.push(`${x.testo} dentro il riquadro della copia`);
    expect(difetti).toEqual([]);
  });

  test("espansa: la copia di un record della tabella, nei due versi e fra due record della tabella, è quella di un record", () => {
    const d = disegno("espansa");
    expect(di(d, "b4").map((x) => x.testo)).toEqual(["r ← t[1]: copia campo per campo", "r.nome ← t[1].nome", "r.classe ← t[1].classe", "r.voto ← t[1].voto"]);
    expect(di(d, "b7").map((x) => x.testo)).toEqual(["u[1] ← r: copia campo per campo", "u[1].nome ← r.nome", "u[1].classe ← r.classe", "u[1].voto ← r.voto"]);
    expect(di(d, "b10").map((x) => x.testo)).toEqual(["u[0] ← u[1]: copia campo per campo", "u[0].nome ← u[1].nome", "u[0].classe ← u[1].classe", "u[0].voto ← u[1].voto"]);
    // Un campo di un record della tabella resta un'assegnazione semplice.
    expect(di(d, "b11")).toEqual([{ testo: 'u[1].nome ← "Zeno"', forma: "assegnazione" }]);
  });

  test("compatta: le quattro copie nel riquadro con la scritta, della tabella e dei record", () => {
    const d = disegno("compatta");
    for (const [id, scritta] of [
      ["b1", "copia elemento per elemento"],
      ["b4", "copia campo per campo"],
      ["b7", "copia campo per campo"],
      ["b10", "copia campo per campo"],
    ] as const) {
      const r = d.riquadri.filter((x) => x.blocco === id);
      expect(r.length, id).toBe(1);
      expect(r[0]!.didascalia?.testo, id).toBe(scritta);
    }
    expect(di(d, "b1")).toEqual([{ testo: "u ← t", forma: "assegnazione" }]);
  });

  test("i segni: la pausa su un campo accende il suo blocco nella espansa, l'assegnazione nella compatta", () => {
    const d = disegno("espansa");
    const correnti = (dd: Disegno, corrente: string, faseCorrente: "elemento" | undefined, campoCorrente: number) => {
      const segni = segniDelDisegno(dd.elementi, { corrente, ...(faseCorrente ? { faseCorrente } : {}), campoCorrente });
      return dd.elementi.filter((x) => segni(x).corrente).map((x) => x.testo);
    };
    expect([0, 1, 2].map((k) => correnti(d, "b1", "elemento", k))).toEqual([["u[_indice].nome ← t[_indice].nome"], ["u[_indice].classe ← t[_indice].classe"], ["u[_indice].voto ← t[_indice].voto"]]);
    // La copia di un record della tabella: la pausa ha il campo senza la fase, come quella fra due record.
    expect(correnti(d, "b4", undefined, 1)).toEqual(["r.classe ← t[1].classe"]);
    const compatta = disegno("compatta");
    expect(correnti(compatta, "b1", "elemento", 1)).toEqual(["u ← t"]);
    expect(correnti(compatta, "b4", undefined, 1)).toEqual(["r ← t[1]"]);
  });
});

// Il valore iniziale di una tabella sotto «Inizio»: l'elenco dei record, ognuno l'elenco dei suoi campi; il record
// ripetuto come l'elenco che riempie o da solo, fra graffe. Gli attesi scritti qui a mano.
test("il valore iniziale di una tabella: l'elenco dei record, e il record ripetuto nelle due forme", () => {
  const tabella = (initial: Dato["initial"]): Dato => ({ name: "t", type: "record", record: "alunno", size: 3, ...(initial !== undefined ? { initial } : {}) });
  expect([
    testoDelValoreIniziale(tabella([['"Anna"', "7"], ['"Bruno"', "9"], ['"Carla"', "6"]]), testi, "elenco"),
    testoDelValoreIniziale(tabella({ each: ['"x"', "0"] }), testi, "elenco"),
    testoDelValoreIniziale(tabella({ each: ['"x"', "0"] }), testi, "un-valore"),
  ]).toEqual(['t ← {{"Anna", 7}, {"Bruno", 9}, {"Carla", 6}}', 't ← {{"x", 0}, {"x", 0}, {"x", 0}}', `t ← ${testi.ogniElemento.replace("{valore}", '{"x", 0}')}`]);
});
