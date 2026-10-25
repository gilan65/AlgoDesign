// Il codice generato che la finestra mostra: lo stesso dei generatori del nucleo, chiamati con le stesse parole che
// usa il test differenziale (`paroleDelloPseudocodice` della lingua). Il testo dipende solo dal progetto e dalla
// lingua: i limiti delle Impostazioni decidono soltanto se il controllo statico lascia generare.
import type { Tetti } from "../../core/controllo/controllo";
import { c } from "../../core/genera/c";
import type { Generato } from "../../core/genera/forma";
import { pseudocodice } from "../../core/genera/pseudocodice";
import { python } from "../../core/genera/python";
import type { Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import { paroleDelloPseudocodice } from "./parole";

export const LINGUAGGI = ["pseudocodice", "python", "c"] as const;
export type Linguaggio = (typeof LINGUAGGI)[number];

/** L'estensione del file del codice, per linguaggio. */
export const estensioni: Readonly<Record<Linguaggio, ".txt" | ".py" | ".c">> = { pseudocodice: ".txt", python: ".py", c: ".c" };

export function codiceDi(p: Progetto, limiti: Tetti, linguaggio: Linguaggio, lingua: Lingua): Generato {
  const parole = paroleDelloPseudocodice(lingua);
  return linguaggio === "pseudocodice" ? pseudocodice(p, limiti, parole) : linguaggio === "python" ? python(p, limiti, lingua, parole) : c(p, limiti, lingua, parole);
}
