// Il modello di un progetto: la forma del file `.algo`, con gli stessi nomi
// inglesi dei campi, perché il file non dipende dalla lingua. Immutabile: ogni campo è `readonly`, e chi
// cambia un progetto ne costruisce uno nuovo.
//
// Espressioni, destinazioni e valori iniziali restano testo: li analizza l'analizzatore unico delle
// espressioni, e le regole di validità dei dati (nomi, valori iniziali, costanti, ruoli, lunghezze, parametri)
// sono del controllo statico.

export const tipi = ["integer", "real", "character", "string", "boolean"] as const;
export type Tipo = (typeof tipi)[number];

/** Ciò che una funzione restituisce: uno dei cinque tipi, e con `return_size` un vettore di quel tipo. */
export type TipoRestituito = Tipo;

export const ruoli = ["input", "output", "input_output"] as const;
export type Ruolo = (typeof ruoli)[number];

/** Per valore (una copia), per riferimento (il dato entra ed esce: vuole il valore), per uscita (il dato solo esce:
 * parte senza valore). */
export const modalita = ["value", "reference", "out"] as const;
export type Modalita = (typeof modalita)[number];

export const generiDiFunzione = ["main", "procedure", "function"] as const;
export type GenereDiFunzione = (typeof generiDiFunzione)[number];

export const generiDiBlocco = ["assignment", "read", "write", "if", "while", "repeat", "for", "for_each", "call", "comment"] as const;
export type GenereDiBlocco = (typeof generiDiBlocco)[number];

/** I codici degli errori e degli avvisi, scritti nel file dagli attesi dei casi d'uso: errori dell'interprete, errori
 * statici, avvisi. */
export const codiciErrore = [
  "uninitialized", "index_out_of_range", "string_too_long", "null_character_in_string", "invalid_character_code",
  "string_longer_than_array", "same_reference", "reference_without_value", "integer_overflow", "division_by_zero", "real_to_integer_out_of_range",
  "non_finite_real", "invalid_input", "input_exhausted", "input_mismatch", "unused_inputs", "too_many_steps",
  "recursion_too_deep", "recursion_data_too_large", "out_of_memory",
] as const;
export const codiciErroreStatico = [
  "unknown_name", "invalid_name", "invalid_data_item", "assign_to_constant", "assign_to_read_only", "array_assignment",
  "literal_out_of_range", "literal_leading_zero", "string_literal_too_long", "multi_code_character", "type_mismatch",
  "condition_not_boolean", "chained_comparison", "chained_power", "division_by_literal_zero", "invalid_step",
  "unknown_callee", "argument_mismatch", "reference_not_assignable", "same_reference", "function_as_statement",
  "procedure_in_expression", "limit_exceeded", "syntax_error", "function_with_effect", "invalid_default_value",
  "function_name_in_use", "reference_without_value",
] as const;
export const codiciAvviso = [
  "integer_division_to_real", "real_equality", "useless_conversion", "constant_loop_condition", "input_never_read",
  "output_never_written", "missing_role", "maybe_uninitialized", "unused_data", "unused_value", "implicit_conversion",
] as const;
export type CodiceErrore = (typeof codiciErrore)[number];
/** Gli errori che un caso d'uso non attende: dipendono dalla macchina e dal motore. */
export const nonSiAttendono: ReadonlySet<CodiceErrore> = new Set(["out_of_memory"]);
export type CodiceErroreStatico = (typeof codiciErroreStatico)[number];
export type CodiceAvviso = (typeof codiciAvviso)[number];

export type ValoreIniziale = string | readonly string[] | { readonly each: string };

export interface Dato {
  readonly name: string;
  readonly type: Tipo;
  readonly size?: number;
  readonly constant?: boolean;
  readonly initial?: ValoreIniziale;
  readonly role?: Ruolo;
  readonly max_length?: number;
  readonly parameter?: Modalita;
}

interface BloccoBase<G extends GenereDiBlocco> {
  readonly id: string;
  readonly kind: G;
  readonly breakpoint?: boolean;
}

export type Blocco =
  | (BloccoBase<"assignment"> & { readonly target: string; readonly value: string })
  | (BloccoBase<"read"> & { readonly target: string })
  | (BloccoBase<"write"> & { readonly values: readonly string[]; readonly newline: boolean })
  | (BloccoBase<"if"> & { readonly condition: string; readonly then: readonly Blocco[]; readonly else: readonly Blocco[] })
  | (BloccoBase<"while"> & { readonly condition: string; readonly body: readonly Blocco[] })
  | (BloccoBase<"repeat"> & { readonly body: readonly Blocco[]; readonly condition: string })
  | (BloccoBase<"for"> & {
      readonly counter: string;
      readonly from: string;
      readonly to: string;
      readonly step?: number;
      readonly body: readonly Blocco[];
    })
  | (BloccoBase<"for_each"> & { readonly item: string; readonly source: string; readonly body: readonly Blocco[] })
  | (BloccoBase<"call"> & { readonly callee: string; readonly arguments: readonly string[] })
  | (BloccoBase<"comment"> & { readonly text: string });

export interface Fine {
  readonly id: string;
  readonly return_value?: string;
  readonly breakpoint?: boolean;
}

export interface Funzione {
  readonly id: string;
  readonly kind: GenereDiFunzione;
  /** Assente nel programma principale, obbligatorio altrimenti. */
  readonly name?: string;
  /** Solo per `function`, e lì obbligatorio: con `return_size`, il tipo degli elementi del vettore restituito. */
  readonly return_type?: TipoRestituito;
  /** Solo per `function`: presente, la funzione restituisce un vettore di tanti elementi. */
  readonly return_size?: number;
  /** Solo per `function` che restituisce una stringa: la sua lunghezza massima; assente, quella predefinita. */
  readonly return_max_length?: number;
  /** Solo per `function`: il valore che prende il posto della funzione tolta da un'espressione, un letterale del tipo
   * restituito. Assente, quello del tipo (`valorePredefinito`). Un vettore non ne ha. */
  readonly default_result?: string;
  readonly data: readonly Dato[];
  readonly body: readonly Blocco[];
  readonly end: Fine;
  /** Solo per `procedure` e `function`: i casi d'uso della funzione eseguita da sola, con le voci dei parametri. */
  readonly test_cases?: readonly CasoDiUnaFunzione[];
}

/** Il valore predefinito di una funzione che non lo scrive: lo stesso che l'editor propone per una funzione nuova. */
export const valorePredefinito: Readonly<Record<TipoRestituito, string>> = { integer: "0", real: "0.0", character: "' '", string: '""', boolean: "false" };

export interface Segnalazione<C> {
  readonly code: C;
  readonly block: string;
}

export interface Atteso {
  readonly output: string;
  readonly error?: Segnalazione<CodiceErrore>;
  readonly static_error?: Segnalazione<CodiceErroreStatico>;
  readonly warnings?: readonly Segnalazione<CodiceAvviso>[];
}

/** Una voce di un caso: la riga data alla lettura del dato `data`. */
export interface Voce {
  readonly data: string;
  readonly text: string;
}

/** Una voce di un caso di una funzione eseguita da sola: con `each`, la stessa riga per ogni elemento
 * di un parametro vettore, al posto della voce del suo primo elemento. Senza `text` non è una riga: per un parametro per
 * riferimento ferma l'esecuzione (un riferimento vuole il valore), e i parametri per uscita non hanno voci. */
export interface VoceDiUnaFunzione {
  readonly data: string;
  readonly text?: string;
  readonly each?: boolean;
}

export interface CasoDUso<V = Voce> {
  readonly name: string;
  readonly description?: string;
  readonly inputs: readonly V[];
  readonly expected: Atteso;
}

export type CasoDiUnaFunzione = CasoDUso<VoceDiUnaFunzione>;

export interface Metadati {
  readonly name: string;
  readonly author?: string;
  readonly description?: string;
  readonly notes?: string;
  /** Il progetto è una libreria: dice solo dove lo si trova, non che cosa se ne importa. Assente, non lo è. */
  readonly library?: true;
}

/** Le opzioni che cambiano il risultato. Un'opzione uguale al predefinito non c'è: la lettura la toglie. */
export interface Opzioni {
  readonly fill_character?: string;
  readonly real_decimals?: number;
}

export const opzioniPredefinite = { fill_character: " ", real_decimals: 2 } as const;

export interface Progetto {
  readonly format: "algodesign";
  readonly schema_version: 1;
  readonly metadata: Metadati;
  readonly options?: Opzioni;
  readonly shared_constants?: readonly Dato[];
  readonly functions: readonly Funzione[];
  readonly test_cases?: readonly CasoDUso[];
}

/** Il livello di ogni `per ogni` di un albero, per `id`: 1 se nessun altro `per ogni` lo contiene, poi 2, 3… È il
 * numero della sua posizione (`_indice`, `_indice2`) nel disegno, nella tabella di traccia e nel codice. */
export function livelliDeiPerOgni(blocchi: readonly Blocco[]): ReadonlyMap<string, number> {
  const livelli = new Map<string, number>();
  const visita = (bs: readonly Blocco[], fuori: number): void => {
    for (const b of bs) {
      if (b.kind === "if") visita([...b.then, ...b.else], fuori);
      else if (b.kind === "for_each") {
        livelli.set(b.id, fuori + 1);
        visita(b.body, fuori + 1);
      } else if (b.kind === "while" || b.kind === "repeat" || b.kind === "for") visita(b.body, fuori);
    }
  };
  visita(blocchi, 0);
  return livelli;
}
