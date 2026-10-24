// Il testo di un'espressione nella lingua dell'interfaccia: nel file gli operatori a
// parola sono inglesi, l'interfaccia li mostra coi nomi della sua lingua. Si traducono solo le PAROLE che
// l'analizzatore riconosce come operatori: un letterale (`"to_integer"`) e un nome di dato che contiene
// l'operatore (`to_integer_n`) restano come sono, e il resto del testo (spazi, parentesi) non si tocca.
// Un testo che non si lascia leggere si mostra com'è: l'errore lo dice il controllo statico.

import { parole } from "../espressioni/analizzatore";

/** Gli operatori a parola che hanno un nome diverso nelle due lingue; `and`, `or`, `not`, `mod`, `true` e
 * `false` si scrivono uguali in italiano e in inglese. */
export const operatoriAParola = [
  "to_integer",
  "to_real",
  "to_character",
  "to_array",
  "to_string",
  "length",
  "absolute_value",
  "square_root",
  "raised_to",
  "round",
  "round_down",
  "round_up",
  "integer_part",
  "pi",
] as const;

export type OperatoreAParola = (typeof operatoriAParola)[number];

/** I nomi degli operatori a parola in una lingua: li dà l'interfaccia. */
export type NomiDegliOperatori = Readonly<Record<OperatoreAParola, string>>;

const eOperatore = (testo: string): testo is OperatoreAParola => (operatoriAParola as readonly string[]).includes(testo);

export function traduciEspressione(testo: string, nomi: NomiDegliOperatori): string {
  const ps = parole(testo);
  if (ps === undefined) return testo;
  const c = Array.from(testo);
  let fuori = "";
  let fatto = 0;
  for (const p of ps) {
    if (p.genere !== "parola" || !eOperatore(p.testo)) continue;
    fuori += c.slice(fatto, p.da).join("") + nomi[p.testo];
    fatto = p.a;
  }
  return fuori + c.slice(fatto).join("");
}
