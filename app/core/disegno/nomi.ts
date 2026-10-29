// I nomi dei dati nel testo dei blocchi e il loro posto nel disegno: ciò su cui si porta il puntatore per il watch.
// Il testo e la sua misura NON cambiano (l'impaginazione resta la stessa): il testo di un blocco è fatto di parti
// (`partiDelBlocco`), i nomi si cercano nelle sole espressioni, una per una, e il loro posto si ricava dalle righe
// già impaginate, misurando con la stessa misura il testo che precede il nome nella sua riga, centrata nel riquadro
// del testo.
//
// Un nome è una parola che l'analizzatore riconosce come nome, fuori dai letterali, uguale al nome di un dato. Gli
// operatori a parola (in ogni lingua) sono nomi riservati: nessun dato si chiama così. Un'espressione che non si
// lascia leggere non ha nomi (l'errore lo dice il controllo statico, e il programma non parte). I commenti, l'inizio
// e la fine non hanno nomi. Il blocco del valore iniziale di un dato ha il nome del dato (e quelli di un valore
// sbagliato, scritto com'è): le sue parti sono quelle del testo che il nucleo gli dà. La fine di una funzione ha i nomi
// dell'espressione di ciò che restituisce. Un ciclo `per` o `per ogni` ha i
// nomi della sua intestazione e dei blocchi che il suo riquadro aggiunge (le parti di ogni fase, dalla funzione che dà
// loro il testo), tutti sotto l'`id` del ciclo; la posizione `_indice` non è un dato. Coi nomi delle funzioni che
// restituiscono un valore, anche le loro chiamate (il nome seguito da «(»), segnate: il watch ne mostra il valore
// restituito in quel blocco. La copia espansa di un vettore col
// suo nome, allo stesso modo: l'intestazione e i blocchi aggiunti sotto l'`id` dell'assegnazione. La Lettura con la
// domanda ha i nomi delle sue due righe, la domanda e la Lettura, sotto l'`id` della Lettura.

import { parole } from "../espressioni/analizzatore";
import { livelliDellePosizioni, nomiDelleMatrici, nomiDeiVettori } from "../progetto/copia";
import type { Blocco, Dato, DefinizioneDelRecord, Funzione } from "../progetto/modello";
import { domandaDellaScrittura } from "./domanda";
import {
  campiDellaCopia,
  misuraDelleParti,
  partiDelBlocco,
  partiDelCampoDellaCopia,
  partiDellaDomanda,
  partiDellaFine,
  partiDellaFase,
  partiDellIntestazioneDellaCopia,
  partiDelValoreIniziale,
  type Disegno,
  type Elemento,
  type FormeDeiCicli,
  type MisuraDelTesto,
  type ParteDelTesto,
  type Rettangolo,
  type TestiDelDisegno,
  type ValoreRipetuto,
} from "./impaginazione";
import type { GeometriaDelTema } from "./tema";

/** Un nome di un dato nel disegno: il dato e il rettangolo delle sue lettere. Con `chiamata`, il nome di una funzione
 * chiamata nel testo (il watch mostra ciò che ha restituito lì). */
export interface NomeNelDisegno {
  readonly dato: string;
  readonly riquadro: Rettangolo;
  readonly chiamata?: true;
}

type NomeNelTesto = { da: number; a: number; dato: string; chiamata?: true };

const lunghezza = (t: string) => Array.from(t).length;

/** I nomi dei dati nel testo di un blocco (`testoDelBlocco`): da dove a dove, contando i codici di `Array.from`. */
export function nomiDelBlocco(b: Blocco, testi: TestiDelDisegno, dati: ReadonlySet<string>): { da: number; a: number; dato: string }[] {
  return nomiNelleParti(partiDelBlocco(b, testi), dati);
}

function blocchiPerId(bs: readonly Blocco[], m = new Map<string, Blocco>()): Map<string, Blocco> {
  for (const b of bs) {
    m.set(b.id, b);
    if (b.kind === "if") blocchiPerId([...b.then, ...b.else], m);
    else if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") blocchiPerId(b.body, m);
  }
  return m;
}

/** I nomi dei dati nel testo del blocco del valore iniziale di un dato (`testoDelValoreIniziale`): il nome del dato e,
 * in un valore sbagliato scritto com'è, quelli che vi compaiono. Senza valore iniziale, nessuno. */
export function nomiDelValoreIniziale(d: Dato, testi: TestiDelDisegno, ripetuto: ValoreRipetuto, dati: ReadonlySet<string>): { da: number; a: number; dato: string }[] {
  const valore = partiDelValoreIniziale(d, testi, ripetuto);
  if (valore === undefined) return [];
  return nomiNelleParti([{ testo: d.name, espressione: true }, { testo: " ← ", espressione: false }, ...valore], dati);
}

/** I nomi dei dati nelle parti di un testo che sono espressioni: da dove a dove, contando i codici di `Array.from`; con
 * `funzioni`, anche i nomi di quelle funzioni seguiti da «(», le chiamate. */
function nomiNelleParti(parti: readonly ParteDelTesto[], dati: ReadonlySet<string>, funzioni: ReadonlySet<string> = new Set()): NomeNelTesto[] {
  const fuori: NomeNelTesto[] = [];
  let k = 0;
  for (const p of parti) {
    if (p.espressione) {
      const ws = parole(p.testo) ?? [];
      ws.forEach((w, i) => {
        if (w.genere !== "nome") return;
        const chiama = ws[i + 1]?.genere === "segno" && ws[i + 1]!.testo === "(";
        if (chiama && funzioni.has(w.testo)) fuori.push({ da: k + w.da, a: k + w.a, dato: w.testo, chiamata: true });
        else if (dati.has(w.testo)) fuori.push({ da: k + w.da, a: k + w.a, dato: w.testo });
      });
    }
    k += lunghezza(p.testo);
  }
  return fuori;
}

/** I rettangoli dei nomi nelle righe già impaginate di un elemento. Le righe: una, il testo intero; due (una condizione
 * lunga), la seconda è la coda del testo e la prima la testa senza gli spazi in fondo. Un nome non sta mai a cavallo: il
 * taglio cade prima di una parola. */
function nelleRighe(e: Elemento, nomi: readonly NomeNelTesto[], tema: GeometriaDelTema, misura: MisuraDelTesto): NomeNelDisegno[] {
  const t = e.riquadroTesto;
  const centro = t.x + t.larghezza / 2;
  const inizioDellaRiga = e.righe.map((r, i) => (i === 0 ? 0 : lunghezza(e.testo) - lunghezza(r)));
  return nomi.map((n) => {
    const i = inizioDellaRiga.findLastIndex((k) => k <= n.da);
    const riga = Array.from(e.righe[i]!);
    const da = n.da - inizioDellaRiga[i]!;
    // Una riga a pezzi con uno stile si misura pezzo per pezzo, come l'ha misurata l'impaginazione; un nome sta in un
    // pezzo solo (un'espressione, che non ha stile).
    const pezzi = e.pezzi?.[i];
    const prima = pezzi === undefined ? misura(riga.slice(0, da).join("")) : primaDi(pezzi, da, misura);
    // Il nome col suo stile: quello di una funzione chiamata è in grassetto.
    const stile = pezzi === undefined ? undefined : stileIn(pezzi, da);
    return {
      dato: n.dato,
      ...(n.chiamata ? { chiamata: true as const } : {}),
      riquadro: {
        x: centro - (pezzi === undefined ? misura(e.righe[i]!) : misuraDelleParti(pezzi, misura)) / 2 + prima,
        y: t.y + tema.altezzaRiga * i,
        larghezza: misura(riga.slice(da, da + n.a - n.da).join(""), stile),
        altezza: tema.altezzaRiga,
      },
    };
  });
}

/** Le parti di seguito che sono espressioni (un nome di funzione in grassetto le divide) riunite in una: i nomi dei dati si
 * cercano nell'espressione intera. */
function riunite(parti: readonly ParteDelTesto[]): ParteDelTesto[] {
  const fuori: ParteDelTesto[] = [];
  for (const p of parti) {
    const ultima = fuori[fuori.length - 1];
    if (ultima?.espressione && p.espressione) fuori[fuori.length - 1] = { testo: ultima.testo + p.testo, espressione: true };
    else fuori.push(p);
  }
  return fuori;
}

/** Lo stile del pezzo in cui comincia il codice `da` di una riga a pezzi. */
function stileIn(pezzi: readonly ParteDelTesto[], da: number): ParteDelTesto["stile"] {
  let k = 0;
  for (const p of pezzi) {
    k += lunghezza(p.testo);
    if (da < k) return p.stile;
  }
  return undefined;
}

/** La larghezza dei primi `da` codici di una riga a pezzi, ognuno col suo stile. */
function primaDi(pezzi: readonly ParteDelTesto[], da: number, misura: MisuraDelTesto): number {
  let [k, w] = [0, 0];
  for (const p of pezzi) {
    const n = lunghezza(p.testo);
    if (k + n >= da) return w + misura(Array.from(p.testo).slice(0, da - k).join(""), p.stile);
    [k, w] = [k + n, w + misura(p.testo, p.stile)];
  }
  return w;
}

/** I nomi dei dati di ogni blocco del disegno di `funzione`, per `id`, coi rettangoli delle loro lettere; di un ciclo
 * anche quelli dei blocchi che il riquadro aggiunge, nelle forme dei cicli con cui il disegno è fatto. */
export function nomiDelDisegno(
  d: Disegno,
  funzione: Funzione,
  tema: GeometriaDelTema,
  misura: MisuraDelTesto,
  testi: TestiDelDisegno,
  forme: FormeDeiCicli,
  dati: ReadonlySet<string>,
  /** Le costanti comuni, nel programma principale: il disegno le ha avute uguali. */
  comuni: readonly Dato[],
  /** I nomi delle funzioni che restituiscono un valore: le loro chiamate nel testo. */
  funzioni: ReadonlySet<string> = new Set(),
  /** I record del progetto: nella copia espansa di un record o di una tabella, il testo dell'assegnazione di un campo. */
  records: readonly DefinizioneDelRecord[] = [],
): ReadonlyMap<string, readonly NomeNelDisegno[]> {
  const blocchi = blocchiPerId(funzione.body);
  const livelli = livelliDellePosizioni(funzione.body, nomiDeiVettori([...funzione.data, ...comuni]), nomiDelleMatrici([...funzione.data, ...comuni]));
  const fuori = new Map<string, NomeNelDisegno[]>();
  for (const e of d.elementi) {
    // La fine di una funzione: ciò che restituisce, coi pezzi disegnati se ha uno stile.
    if (e.dato === undefined && e.id === funzione.end.id && funzione.kind === "function") {
      const nomi = nomiNelleParti(e.pezzi !== undefined ? riunite(e.pezzi.flat()) : partiDellaFine(funzione, testi), dati, funzioni);
      if (nomi.length > 0) fuori.set(e.id, nelleRighe(e, nomi, tema, misura));
      continue;
    }
    const b = e.dato === undefined ? blocchi.get(e.id) : undefined;
    if (!b) continue;
    // Un blocco aggiunto dal riquadro ha l'`id` del ciclo e il testo della sua fase; il salto ha il testo che
    // l'impaginazione ha disegnato (la freccia, *rif*), su una riga, coi pezzi di un'espressione riuniti.
    // La Lettura con la domanda: le due righe, la domanda (dalla Scrittura che mostra) e la Lettura.
    const scrittura = e.scrittura === undefined ? undefined : blocchi.get(e.scrittura);
    const domanda = scrittura?.kind === "write" ? domandaDellaScrittura(scrittura) : undefined;
    // L'assegnazione di un campo nella copia espansa: di un record (`b.nome ← a.nome`), o nel ciclo dei record di una
    // tabella (`u[_indice].nome ← t[_indice].nome`), col testo che il disegno ha scritto.
    const delCampo = e.campo !== undefined && b.kind === "assignment" ? campiDellaCopia(b, [...funzione.data, ...comuni], records)?.[e.campo]?.name : undefined;
    const verso = b.kind === "assignment" ? [...funzione.data, ...comuni].find((x) => x.name === b.target.trim()) : undefined;
    const campoDellaTabella = e.campo !== undefined && verso?.size !== undefined ? records.find((r) => r.name === verso.record)?.fields[e.campo]?.name : undefined;
    const parti =
      domanda !== undefined ? [...partiDellaDomanda(domanda, testi), ...partiDelBlocco(b, testi)]
      : b.kind === "call" && e.pezzi !== undefined ? riunite(e.pezzi.flat())
      : b.kind === "assignment" && e.forma === "intestazione" ? partiDellIntestazioneDellaCopia(b, testi)
      : b.kind === "assignment" && delCampo !== undefined ? partiDelCampoDellaCopia(b, delCampo, testi)
      : e.fase === undefined ? partiDelBlocco(b, testi)
      : b.kind === "for" || b.kind === "for_each" || b.kind === "assignment" ? partiDellaFase(b, e.fase, forme, testi, livelli.get(b.id) ?? 1, [...funzione.data, ...comuni], e.interno === true, campoDellaTabella)
      : undefined;
    const nomi = parti === undefined ? [] : nomiNelleParti(parti, dati, funzioni);
    if (nomi.length > 0) fuori.set(e.id, [...(fuori.get(e.id) ?? []), ...nelleRighe(e, nomi, tema, misura)]);
  }
  return fuori;
}

/**
 * I nomi dei dati nei blocchi dei valori iniziali del disegno, per nome del dato (`valori`: i dati della funzione e,
 * nel programma principale, le costanti comuni, da cui il disegno li ha presi). Due dati con lo stesso nome sono un
 * errore e il programma non parte: il watch non c'è, e vale il primo.
 */
export function nomiDeiValoriIniziali(
  d: Disegno,
  valori: readonly Dato[],
  tema: GeometriaDelTema,
  misura: MisuraDelTesto,
  testi: TestiDelDisegno,
  ripetuto: ValoreRipetuto,
  dati: ReadonlySet<string>,
): ReadonlyMap<string, readonly NomeNelDisegno[]> {
  const fuori = new Map<string, NomeNelDisegno[]>();
  for (const e of d.elementi) {
    const dato = e.dato === undefined || fuori.has(e.dato) ? undefined : valori.find((x) => x.name === e.dato);
    if (!dato) continue;
    const nomi = nomiDelValoreIniziale(dato, testi, ripetuto, dati);
    if (nomi.length > 0) fuori.set(dato.name, nelleRighe(e, nomi, tema, misura));
  }
  return fuori;
}
