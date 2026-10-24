// Alberi GENERATI a seme fisso, per le prove del disegno: le prove dell'impaginazione (`bun test`) e quelle
// nei motori veri (Playwright) disegnano gli stessi alberi. Ogni genere della tappa 1, profondità fino a
// `PROFONDITA`, rami vuoti, testi da 1 a 120 caratteri (anche accentati e fuori dal piano di base), e da zero a sei
// dati, coi valori iniziali in ogni forma (un letterale, un elenco anche di più di dieci elementi, un valore ripetuto,
// nessuno) e qualche costante. Coi cicli (`conICicli`), anche `per` (col passo 1, assente, o un altro) e `per ogni`:
// sono altri alberi, e senza gli alberi restano quelli di prima, seme per seme. Non lo usa l'app.

import type { Blocco, Dato, Funzione, ValoreIniziale } from "../progetto/modello";

/** Generatore a seme fisso (mulberry32): gli stessi alberi a ogni corsa. */
function casuale(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const alfabeto = [..."abcdefghijklmnopqrstuvwxyz0123456789 +-*/<>=()\"àèéìòù"];
export const PROFONDITA = 6;

export function alberoGenerato(seme: number, conICicli = false): Funzione {
  return generata(casuale(seme), conICicli, [], { id: "f1", kind: "main" }, "g");
}

/**
 * Un progetto GENERATO a seme fisso con procedure e funzioni: da una a tre oltre al programma principale, ognuna coi suoi
 * parametri (da zero a quattro, per valore o per riferimento) e il nome di un testo qualunque (anche lungo), le funzioni
 * con un tipo restituito e un'espressione restituita; in ogni corpo, coi blocchi e i cicli, anche salti con da zero a
 * quattro argomenti verso una di loro o verso un nome che non c'è, e i loro nomi seguiti dalla parentesi nelle
 * espressioni. Per il disegno: le regole delle funzioni (una funzione non ha *rif*, non legge) non contano.
 */
export function progettoGenerato(seme: number): Funzione[] {
  const r = casuale(seme);
  const intero = (n: number) => Math.floor(r() * n);
  const nome = () => Array.from({ length: 1 + intero(r() < 0.2 ? 40 : 12) }, () => "abcdefghijklmnopqrstuvwxyz_àè"[intero(29)]).join("");
  const tipi = ["integer", "real", "character", "boolean"] as const;
  const altre = Array.from({ length: 1 + intero(3) }, (_, i) => {
    const genere = r() < 0.5 ? ("procedure" as const) : ("function" as const);
    return { id: `f${i + 2}`, kind: genere, name: `${nome()}${i}`, ...(genere === "function" ? { return_type: tipi[intero(tipi.length)]! } : {}) };
  });
  const nomi = altre.map((f) => f.name);
  return [
    generata(r, true, nomi, { id: "f1", kind: "main" }, "g"),
    ...altre.map((f, i) => {
      const g = generata(r, true, nomi, f, `p${i}g`);
      const parametri: Dato[] = Array.from({ length: intero(5) }, (_, k) => ({ name: `${nome()}${k}`, type: "integer", parameter: r() < 0.5 ? "reference" : "value" }));
      return { ...g, data: [...parametri, ...g.data], end: { id: `${g.end.id}`, ...(f.kind === "function" ? { return_value: `${nomi[intero(nomi.length)]}(${nome()}) + 1` } : {}) } };
    }),
  ];
}

/** Una funzione generata da `r`: i salti e i nomi seguiti dalla parentesi vanno verso `chiamabili` (senza, nessuno: gli
 * alberi di `alberoGenerato` restano quelli di prima, seme per seme). */
function generata(
  r: () => number,
  conICicli: boolean,
  chiamabili: readonly string[],
  testa: Pick<Funzione, "id" | "kind" | "name" | "return_type">,
  prefisso: string,
): Funzione {
  const intero = (n: number) => Math.floor(r() * n);
  let contatore = 0;
  const id = () => `${prefisso}${++contatore}`;
  const conLeChiamate = chiamabili.length > 0;
  const testo = () => {
    const lunghezza = 1 + intero(r() < 0.15 ? 120 : 30);
    const caratteri = Array.from({ length: lunghezza }, () => alfabeto[intero(alfabeto.length)]!);
    if (r() < 0.1) caratteri.push("😀");
    // Coi salti, un'espressione su quattro comincia col nome di una procedura o funzione seguito dalla parentesi.
    return conLeChiamate && r() < 0.25 ? `${chiamabili[intero(chiamabili.length)]}(${caratteri.join("")}` : caratteri.join("");
  };
  // Una condizione su tre è fatta di confronti legati da `and` e `or`, perché la forma «Su due righe» abbia
  // dove tagliare.
  const confronto = () => `${"abcxyz"[intero(6)]}${intero(1000)} ${["<", ">=", "=="][intero(3)]} ${intero(100000)}`;
  const condizione = () =>
    r() < 0.33 ? Array.from({ length: 2 + intero(4) }, confronto).reduce((s, x) => `${s} ${r() < 0.5 ? "and" : "or"} ${x}`) : testo();
  const sequenza = (profondita: number, almenoUno: boolean): Blocco[] =>
    Array.from({ length: (almenoUno ? 1 : 0) + intero(4) }, () => blocco(profondita));
  function blocco(profondita: number): Blocco {
    const generi = profondita >= PROFONDITA ? 4 : conICicli ? 9 : 7;
    if (conLeChiamate && r() < 0.2) {
      // Un salto verso una procedura o funzione del progetto, o verso un nome che non c'è.
      const chiamata = r() < 0.9 ? chiamabili[intero(chiamabili.length)]! : "sconosciuta";
      return { id: id(), kind: "call", callee: chiamata, arguments: Array.from({ length: intero(5) }, testo) };
    }
    switch (intero(generi)) {
      case 0:
        return { id: id(), kind: "assignment", target: testo(), value: testo() };
      case 1:
        return { id: id(), kind: "read", target: testo() };
      case 2:
        return { id: id(), kind: "write", values: Array.from({ length: 1 + intero(3) }, testo), newline: r() < 0.5 };
      case 3:
        return { id: id(), kind: "comment", text: testo() };
      case 4:
        return { id: id(), kind: "if", condition: condizione(), then: sequenza(profondita + 1, false), else: sequenza(profondita + 1, false) };
      case 5:
        return { id: id(), kind: "while", condition: condizione(), body: sequenza(profondita + 1, false) };
      case 6:
        return { id: id(), kind: "repeat", body: sequenza(profondita + 1, false), condition: condizione() };
      case 7: {
        const passo = [undefined, 1, -1, 3, -2][intero(5)];
        return { id: id(), kind: "for", counter: testo(), from: testo(), to: testo(), ...(passo === undefined ? {} : { step: passo }), body: sequenza(profondita + 1, false) };
      }
      default:
        return { id: id(), kind: "for_each", item: testo(), source: testo(), body: sequenza(profondita + 1, false) };
    }
  }
  const body = sequenza(0, true);
  // I dati dopo i blocchi: coi valori iniziali nascosti, i blocchi sono quelli di prima che i dati ci fossero.
  const tipi = ["integer", "real", "character", "string", "boolean"] as const;
  function dato(): Dato {
    const size = r() < 0.4 ? 1 + intero(15) : undefined;
    const quale = intero(4);
    const initial: ValoreIniziale | undefined =
      quale === 0 ? undefined : size === undefined || quale === 1 ? testo() : quale === 2 ? Array.from({ length: size }, testo) : { each: testo() };
    const costante = initial !== undefined && r() < 0.15;
    return { name: testo(), type: tipi[intero(tipi.length)]!, ...(size === undefined ? {} : { size }), ...(costante ? { constant: true } : {}), ...(initial === undefined ? {} : { initial }) };
  }
  const data = Array.from({ length: intero(7) }, dato);
  return { ...testa, data, body, end: { id: testa.kind === "main" ? "fine" : `${prefisso}fine` } };
}
