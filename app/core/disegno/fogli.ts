// Il flowchart stampato: la scala e i fogli, calcolati dai numeri dell'impaginazione (`Disegno`). Le misure sono in unità
// del disegno: alla scala 1 un'unità è un pixel CSS (la tela al 100%), e il testo dei blocchi (`carattere` della
// geometria, 15 unità) è di 11,25 punti.
//
// La scala: con «Adatta al foglio» quella che fa stare la funzione in un foglio solo, anche oltre 1 e anche se il testo
// diventa più piccolo dei punti scelti (che allora non contano). Senza: al più quella, e mai oltre 1; se così il testo
// scende sotto i punti scelti (da `puntiMinimi` a `puntiMassimi`, predefiniti `puntiPredefiniti`), il flowchart va alla
// scala di quei punti, su più fogli. Se a quella scala i tagli buoni non bastano, la scala più grande che si divide
// (`ristretto`): nel corpus succede solo a un flowchart più largo del foglio, che non ha mai un taglio in colonne.
//
// Il verso: prima quello che rispetta i punti scelti; fra due che li rispettano, quello con meno fogli, poi col testo più
// grande, poi il verticale; fra due ristretti, quello col testo più grande, poi con meno fogli, poi il verticale.
//
// I tagli: rette orizzontali (fra le righe di fogli) e verticali (fra le colonne), ognuna al centro di un corridoio largo
// `2 × margineDelTaglio` unità che non tocca nessuna forma (con le intestazioni dei riquadri e i valori iniziali), nessuna
// etichetta, unione o punta di una freccia, né i segni dell'esecuzione dati; né i lati di un riquadro o i tratti delle
// linee paralleli al taglio: questi devono attraversarlo da parte a parte. Per ogni foglio il taglio buono più lontano
// dall'inizio (così i fogli sono i meno possibili); mai nel bianco intorno al disegno, che lascerebbe un foglio vuoto.
//
// Che cosa questo file NON fa:
// - fogli di misura simile: il taglio buono più lontano può lasciare un foglio corto dopo uno pieno;
// - le misure della carta: l'area utile del foglio, in unità, la dà chi stampa;
// - disegnare: i fogli in SVG li scrive `svgDelFoglio` (`svg.ts`), che tratteggia le linee vicino ai tagli.
import type { Connettore, Disegno, Rettangolo } from "./impaginazione";
import { pallino, punta, RAGGIO_DEL_PALLINO, ripresa, segniDelDisegno, type SegniDellEsecuzione } from "./segni";
import type { GeometriaDelTema } from "./tema";

/** Il testo dei blocchi stampato non scende sotto i punti tipografici scelti, fra questi. */
export const puntiMinimi = 6;
export const puntiPredefiniti = 8;
export const puntiMassimi = 12;

/** Metà della larghezza del corridoio di un taglio, in unità del disegno. */
export const margineDelTaglio = 4;

/** Il tratto tratteggiato di una linea interrotta, da ciascuna parte del taglio, in unità del disegno. */
export const tratteggio = 16;

/** I punti tipografici di un pixel CSS. */
const PUNTI_PER_UNITA = 0.75;

/** Un foglio del flowchart: il suo riquadro in unità del disegno, e i lati che sono un taglio. */
export interface Foglio extends Rettangolo {
  readonly tagli: { readonly sinistra: boolean; readonly destra: boolean; readonly sopra: boolean; readonly sotto: boolean };
}

export interface FogliDelDisegno {
  readonly scala: number;
  readonly orizzontale: boolean;
  /** I fogli per righe, da sinistra a destra e dall'alto in basso. */
  readonly fogli: readonly Foglio[];
  /** I tagli verticali (x) e orizzontali (y), in unità del disegno. */
  readonly tagliX: readonly number[];
  readonly tagliY: readonly number[];
  /** Ai punti scelti i tagli buoni non bastavano: il flowchart è più piccolo. */
  readonly ristretto: boolean;
}

export interface AreaDelFoglio {
  readonly larghezza: number;
  readonly altezza: number;
}

/** L'area utile di un foglio orizzontale e di uno verticale, in pixel CSS (unità del disegno alla scala 1). */
export interface AreeDelFoglio {
  readonly orizzontale: AreaDelFoglio;
  readonly verticale: AreaDelFoglio;
}

export interface OpzioniDeiFogli {
  /** «Adatta al foglio». */
  readonly adatta: boolean;
  /** La misura minima del testo dei blocchi, in punti (fuori da `puntiMinimi`–`puntiMassimi` vale il limite più vicino). */
  readonly punti: number;
}

type Asse = "x" | "y";
type Intervallo = readonly [number, number];

/** I punti del testo dei blocchi alla scala data. */
export const puntiDelTesto = (scala: number, geometria: GeometriaDelTema) => geometria.carattere * PUNTI_PER_UNITA * scala;

const intervallo = (r: Rettangolo, asse: Asse): Intervallo => (asse === "x" ? [r.x, r.x + r.larghezza] : [r.y, r.y + r.altezza]);

/** La punta alla fine di una linea del flusso: lunga `punta` lungo l'ultimo tratto, larga `punta` di traverso. */
function puntaDellaLinea(c: Connettore, asse: Asse, geometria: GeometriaDelTema): Intervallo {
  const [p, q] = [c.punti[c.punti.length - 2]!, c.punti[c.punti.length - 1]!];
  const m = geometria.punta;
  if (p[asse] === q[asse]) return [q[asse] - m / 2, q[asse] + m / 2];
  return q[asse] > p[asse] ? [q[asse] - m, q[asse]] : [q[asse], q[asse] + m];
}

/** Gli ingombri su un asse: quelli che un corridoio non può toccare (`pieni`), quelli che lo devono attraversare da parte
 * a parte (`attraversano`: i lati di un riquadro e i tratti delle linee perpendicolari al taglio), e le forme (`forme`:
 * fra due tagli ce ne dev'essere almeno una intera, o il foglio avrebbe solo pezzi di linee). */
function ingombri(d: Disegno, asse: Asse, geometria: GeometriaDelTema, segni: SegniDellEsecuzione | undefined): { pieni: Intervallo[]; attraversano: Intervallo[]; forme: Intervallo[] } {
  const pieni: Intervallo[] = [];
  const attraversano: Intervallo[] = [];
  const forme: Intervallo[] = [];
  const segniDi = segniDelDisegno(d.elementi, segni);
  for (const e of d.elementi) {
    const vs = e.vertici.map((v) => v[asse]);
    const [lo, hi] = intervallo(e.riquadro, asse);
    forme.push([Math.min(lo, ...vs), Math.max(hi, ...vs)]);
    pieni.push([Math.min(lo, ...vs), Math.max(hi, ...vs)]);
    const s = segniDi(e);
    if (s.punto) {
      const p = pallino(e)[asse];
      pieni.push([p - RAGGIO_DEL_PALLINO, p + RAGGIO_DEL_PALLINO]);
    }
    if (s.corrente && segni?.ripresa === true) pieni.push(intervallo(ripresa(e).riquadro, asse));
    else if (s.corrente) {
      const vs2 = punta(e).map((v) => v[asse]);
      pieni.push([Math.min(...vs2), Math.max(...vs2)]);
    }
  }
  for (const r of d.riquadri) {
    if (r.didascalia) pieni.push(intervallo(r.didascalia.riquadro, asse));
    const [a, b] = intervallo(r.bordo, asse);
    pieni.push([a, a], [b, b]);
    attraversano.push([a, b]);
  }
  for (const t of d.etichette) pieni.push(intervallo(t.riquadro, asse));
  for (const u of d.ricongiungimenti) pieni.push([u.centro[asse] - u.raggio, u.centro[asse] + u.raggio]);
  for (const c of d.connettori) {
    for (let i = 1; i < c.punti.length; i++) {
      const [p, q] = [c.punti[i - 1]!, c.punti[i]!];
      if (p[asse] === q[asse]) pieni.push([p[asse], p[asse]]);
      else attraversano.push([Math.min(p[asse], q[asse]), Math.max(p[asse], q[asse])]);
    }
    if (c.genere === "flusso") pieni.push(puntaDellaLinea(c, asse, geometria));
  }
  return { pieni, attraversano, forme };
}

/** Dove il centro di un taglio può cadere su un asse: intervalli chiusi, ordinati, dentro il contenuto del disegno (mai
 * nel bianco intorno). Il corridoio può toccare un ingombro sul bordo, mai entrarci. */
function liberi(ing: ReturnType<typeof ingombri>): Intervallo[] {
  const m = margineDelTaglio;
  const vietati = [...ing.pieni.map(([a, b]): Intervallo => [a - m, b + m]), ...ing.attraversano.flatMap(([a, b]): Intervallo[] => [[a - m, a + m], [b - m, b + m]])].sort((p, q) => p[0] - q[0]);
  const tutti = [...ing.pieni, ...ing.attraversano];
  if (tutti.length === 0) return [];
  const [inizio, fine] = [Math.min(...tutti.map((t) => t[0])), Math.max(...tutti.map((t) => t[1]))];
  const fuori: Intervallo[] = [];
  let da = inizio;
  for (const [a, b] of vietati) {
    // Un vietato è aperto: i suoi estremi restano liberi.
    if (a >= da) fuori.push([da, Math.min(a, fine)]);
    da = Math.max(da, b);
    if (da >= fine) break;
  }
  // Il primo e l'ultimo ingombro vietano già il bordo del contenuto e il bianco intorno: nessun foglio resta vuoto.
  if (da < fine) fuori.push([da, fine]);
  return fuori;
}

/** I tagli di un asse lungo `lunghezza` unità, con fogli non più lunghi di `foglio`: per ogni foglio il taglio buono più
 * lontano, se fra lui e il taglio di prima sta una forma intera (il più lontano è quello che ne contiene di più); null se
 * un foglio non ne trova uno. */
function tagliDi(lunghezza: number, foglio: number, buoni: readonly Intervallo[], forme: readonly Intervallo[]): number[] | null {
  const conUnaForma = (da: number, a: number) => forme.some(([lo, hi]) => lo >= da && hi <= a);
  const tagli: number[] = [];
  let da = 0;
  while (lunghezza - da > foglio) {
    const fino = da + foglio;
    let c: number | undefined;
    for (const [a, b] of buoni) if (a <= fino && b > da) c = Math.min(b, fino);
    if (c === undefined || c <= da || !conUnaForma(da, c)) return null;
    tagli.push(c);
    da = c;
  }
  return tagli.length === 0 || conUnaForma(da, lunghezza) ? tagli : null;
}

interface Prova {
  readonly orizzontale: boolean;
  readonly scala: number;
  readonly tagliX: readonly number[];
  readonly tagliY: readonly number[];
  readonly fogli: number;
  readonly ristretto: boolean;
}

/** La scala e i fogli del flowchart, per le aree utili date; i segni dell'esecuzione, se dati, sono ostacoli dei tagli. */
export function fogliDelDisegno(d: Disegno, aree: AreeDelFoglio, opzioni: OpzioniDeiFogli, geometria: GeometriaDelTema, segni?: SegniDellEsecuzione): FogliDelDisegno {
  const [ingX, ingY] = [ingombri(d, "x", geometria, segni), ingombri(d, "y", geometria, segni)];
  const [buoniX, buoniY] = [liberi(ingX), liberi(ingY)];
  const scalaDeiPunti = Math.min(Math.max(opzioni.punti, puntiMinimi), puntiMassimi) / (geometria.carattere * PUNTI_PER_UNITA);
  const prova = (orizzontale: boolean): Prova => {
    const area = orizzontale ? aree.orizzontale : aree.verticale;
    const stare = Math.min(area.larghezza / d.larghezza, area.altezza / d.altezza);
    const uno = { orizzontale, tagliX: [], tagliY: [], fogli: 1, ristretto: false };
    if (opzioni.adatta) return { ...uno, scala: stare };
    if (Math.min(1, stare) >= scalaDeiPunti) return { ...uno, scala: Math.min(1, stare) };
    const taglia = (s: number) => {
      const tagliX = tagliDi(d.larghezza, area.larghezza / s, buoniX, ingX.forme);
      const tagliY = tagliDi(d.altezza, area.altezza / s, buoniY, ingY.forme);
      return tagliX === null || tagliY === null ? null : { tagliX, tagliY };
    };
    let s = scalaDeiPunti;
    let t = taglia(s);
    if (t === null) {
      // La scala più grande che si divide, fra quella che fa stare il flowchart in un foglio (che si divide sempre: senza
      // tagli) e quella dei punti. Un foglio più lungo trova i tagli di uno più corto, quindi la ricerca per metà regge.
      let [lo, hi] = [stare, scalaDeiPunti];
      for (let i = 0; i < 50; i++) {
        const m = (lo + hi) / 2;
        if (taglia(m) !== null) lo = m;
        else hi = m;
      }
      s = lo;
      t = taglia(lo) ?? { tagliX: [], tagliY: [] };
    }
    return { orizzontale, scala: s, ...t, fogli: (t.tagliX.length + 1) * (t.tagliY.length + 1), ristretto: s < scalaDeiPunti };
  };
  const [v, o] = [prova(false), prova(true)];
  /** La chiave del confronto: più piccola vince; a parità, il verticale (il primo). */
  const chiave = (x: Prova) => (x.ristretto ? [1, -x.scala, x.fogli] : [0, x.fogli, -x.scala]);
  const prima = (a: readonly number[], b: readonly number[]) => {
    const i = a.findIndex((x, k) => x !== b[k]);
    return i >= 0 && a[i]! < b[i]!;
  };
  const s = prima(chiave(o), chiave(v)) ? o : v;
  const xs = [0, ...s.tagliX, d.larghezza];
  const ys = [0, ...s.tagliY, d.altezza];
  const fogli: Foglio[] = [];
  for (let j = 0; j + 1 < ys.length; j++)
    for (let i = 0; i + 1 < xs.length; i++)
      fogli.push({
        x: xs[i]!,
        y: ys[j]!,
        larghezza: xs[i + 1]! - xs[i]!,
        altezza: ys[j + 1]! - ys[j]!,
        tagli: { sinistra: i > 0, destra: i + 2 < xs.length, sopra: j > 0, sotto: j + 2 < ys.length },
      });
  return { scala: s.scala, orizzontale: s.orizzontale, fogli, tagliX: s.tagliX, tagliY: s.tagliY, ristretto: s.ristretto };
}
