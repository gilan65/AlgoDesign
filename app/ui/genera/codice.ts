// Il codice generato che la finestra mostra: lo stesso dei generatori del nucleo, presi dal registro dei linguaggi e
// chiamati con le stesse parole che usa il test differenziale (`paroleDelloPseudocodice` della lingua). Il testo dipende
// solo dal progetto e dalla lingua: i limiti delle Impostazioni decidono soltanto se il controllo statico lascia generare.
import type { Tetti } from "../../core/controllo/controllo";
import type { Generato } from "../../core/genera/forma";
import { voceDel, type Linguaggio } from "../../core/genera/linguaggi";
import type { Progetto } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import type { Lingua } from "../../i18n/lingue";
import { paroleDelloPseudocodice } from "./parole";

export type { Linguaggio };

/** Il nome di ogni linguaggio (la linguetta, l'avviso di «Copia») e il filtro della finestra di «Salva…», nel
 * dizionario: un linguaggio del registro senza la sua voce qui non compila. */
export const paroleDeiLinguaggi = {
  pseudocodice: { nome: "linguaggioPseudocodice", filtro: "filtroPseudocodice" },
  python: { nome: "linguaggioPython", filtro: "filtroPython" },
  c: { nome: "linguaggioC", filtro: "filtroC" },
} as const satisfies Record<Linguaggio, { readonly nome: keyof Dizionario; readonly filtro: keyof Dizionario }>;

export function codiceDi(p: Progetto, limiti: Tetti, linguaggio: Linguaggio, lingua: Lingua): Generato {
  return voceDel(linguaggio).genera(p, limiti, lingua, paroleDelloPseudocodice(lingua));
}
