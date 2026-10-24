// I nomi dei dati nel testo delle regole, PAROLA per parola con l'analizzatore: un letterale (`"voto"`), un
// nome più lungo che contiene quello cercato (`voto2`), una parola chiave e il nome di una funzione chiamata (`voto(1)`)
// non sono il nome di un dato. Le parole si leggono anche nei testi che non si lasciano leggere (`x = 5`, `x % 2`): lì
// il controllo mostra l'errore, e il nome cambia lo stesso.
//
// Che cosa NON guarda: il testo di un commento, che non è una regola; dentro un apice non chiuso, il resto del testo è il
// letterale.

import { parole, paroleTolleranti, type Parola } from "../espressioni/analizzatore";
import type { Blocco } from "../progetto/modello";

/** Vero se la parola in posizione `k` è seguita da «(»: un nome così è una chiamata. */
export const seguitaDaParentesi = (ps: readonly Parola[], k: number): boolean => ps[k + 1]?.genere === "segno" && ps[k + 1]!.testo === "(";

/** Le posizioni (nelle parole) del nome `nome` come dato: non seguito da «(», che lo fa una chiamata. */
const comeDato = (ps: readonly Parola[], nome: string): number[] => ps.flatMap((p, k) => (p.genere === "nome" && p.testo === nome && !seguitaDaParentesi(ps, k) ? [k] : []));

/** I nomi di un testo letto una volta: quelli chiamati (seguiti da «(») e quelli come dato. `nomina(t, n)` è
 * `nomiDelTesto(t).dati.has(n)`, e una chiamata di `n` (`chiamaNelTesto`) è `chiamati.has(n)`. */
export function nomiDelTesto(testo: string): { readonly chiamati: ReadonlySet<string>; readonly dati: ReadonlySet<string> } {
  const ps = paroleTolleranti(testo);
  const chiamati = new Set<string>();
  const dati = new Set<string>();
  ps.forEach((p, k) => {
    if (p.genere === "nome") (seguitaDaParentesi(ps, k) ? chiamati : dati).add(p.testo);
  });
  return { chiamati, dati };
}

/** Il testo con ogni parola che è il nome `vecchio` scritta `nuovo`; il resto del testo non si tocca. */
export function rinominaNelTesto(testo: string, vecchio: string, nuovo: string): string {
  const ps = paroleTolleranti(testo);
  const c = Array.from(testo);
  let fuori = "";
  let fatto = 0;
  for (const k of comeDato(ps, vecchio)) {
    fuori += c.slice(fatto, ps[k]!.da).join("") + nuovo;
    fatto = ps[k]!.a;
  }
  return fuori + c.slice(fatto).join("");
}

/** Vero se il testo nomina il dato `nome` (come parola). */
export const nomina = (testo: string, nome: string): boolean => comeDato(paroleTolleranti(testo), nome).length > 0;

/** Vero se `nome` si legge come una parola sola di genere nome: solo allora entra nelle regole al posto di un altro. */
export const eUnaParolaSola = (nome: string): boolean => {
  const ps = parole(nome);
  return ps !== undefined && ps.length === 1 && ps[0]!.genere === "nome" && ps[0]!.testo === nome;
};

/** I testi di un blocco che sono regole, senza quelli dei blocchi che contiene. */
export function testiPropri(b: Blocco): readonly string[] {
  switch (b.kind) {
    case "assignment":
      return [b.target, b.value];
    case "read":
      return [b.target];
    case "write":
      return b.values;
    case "if":
    case "while":
    case "repeat":
      return [b.condition];
    case "for":
      return [b.counter, b.from, b.to];
    case "for_each":
      return [b.item, b.source];
    case "call":
      return b.arguments;
    case "comment":
      return [];
  }
}

/** Il blocco col suo sottoalbero, con `cambia` applicato a ogni testo che è una regola. */
export function conTesti(b: Blocco, cambia: (testo: string) => string): Blocco {
  const dentro = (s: readonly Blocco[]) => s.map((x) => conTesti(x, cambia));
  const c = conTestiPropri(b, cambia);
  switch (c.kind) {
    case "if":
      return { ...c, then: dentro(c.then), else: dentro(c.else) };
    case "while":
    case "repeat":
    case "for":
    case "for_each":
      return { ...c, body: dentro(c.body) };
    default:
      return c;
  }
}

/** Il blocco con `cambia` applicato ai soli testi suoi che sono regole: i blocchi che contiene restano com'erano. */
export function conTestiPropri(b: Blocco, cambia: (testo: string) => string): Blocco {
  switch (b.kind) {
    case "assignment":
      return { ...b, target: cambia(b.target), value: cambia(b.value) };
    case "read":
      return { ...b, target: cambia(b.target) };
    case "write":
      return { ...b, values: b.values.map(cambia) };
    case "if":
    case "while":
    case "repeat":
      return { ...b, condition: cambia(b.condition) };
    case "for":
      return { ...b, counter: cambia(b.counter), from: cambia(b.from), to: cambia(b.to) };
    case "for_each":
      return { ...b, item: cambia(b.item), source: cambia(b.source) };
    case "call":
      return { ...b, arguments: b.arguments.map(cambia) };
    case "comment":
      return b;
  }
}
