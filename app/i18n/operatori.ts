// I nomi degli operatori a parola nelle lingue dell'interfaccia. Il tipo viene dal
// nucleo, quindi un operatore senza nome in una lingua è un errore di `tsc`. In inglese i nomi sono quelli
// del file.
import type { NomiDegliOperatori } from "../core/disegno/lingua";
import type { Lingua } from "./lingue";

const italiano: NomiDegliOperatori = {
  to_integer: "converti_a_intero",
  to_real: "converti_a_reale",
  to_character: "converti_a_carattere",
  to_array: "converti_a_vettore",
  to_string: "converti_a_stringa",
  length: "lunghezza",
  absolute_value: "valore_assoluto",
  square_root: "radice_quadrata",
  raised_to: "elevato_a",
  round: "arrotonda",
  round_down: "per_difetto",
  round_up: "per_eccesso",
  integer_part: "parte_intera",
  pi: "pi_greco",
};

const inglese: NomiDegliOperatori = {
  to_integer: "to_integer",
  to_real: "to_real",
  to_character: "to_character",
  to_array: "to_array",
  to_string: "to_string",
  length: "length",
  absolute_value: "absolute_value",
  square_root: "square_root",
  raised_to: "raised_to",
  round: "round",
  round_down: "round_down",
  round_up: "round_up",
  integer_part: "integer_part",
  pi: "pi",
};

export const nomiDegliOperatori: Record<Lingua, NomiDegliOperatori> = { it: italiano, en: inglese };
