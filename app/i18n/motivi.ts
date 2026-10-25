// I testi dei motivi per cui un file di progetto non si apre (`core/progetto/formato.ts`), in italiano e in
// inglese. Il tipo vuole ogni motivo in ogni lingua, e nessun altro: una chiave mancante o in più è un
// errore di `tsc`. Il percorso del campo si mostra accanto, com'è nel file (in inglese).
import type { Motivo } from "../core/progetto/formato";
import type { Lingua } from "./lingue";

export const testiDeiMotivi: Record<Lingua, Record<Motivo, string>> = {
  it: {
    invalid_json: "Il testo non è JSON valido: forse è scritto a metà, o c'è una parentesi o una virgola fuori posto.",
    duplicate_key: "Lo stesso campo compare due volte nello stesso oggetto.",
    unknown_field: "Il formato non prevede questo campo: forse il nome è scritto male.",
    missing_field: "Manca questo campo, che è obbligatorio.",
    field_not_allowed: "Questo campo qui non è ammesso.",
    wrong_type: "Il valore è del tipo sbagliato: per esempio un testo dove serve un numero.",
    invalid_value: "Il valore non è fra quelli ammessi.",
    unknown_schema_version: "Il file usa una versione del formato che questa applicazione non conosce: forse l'ha scritto una versione più recente.",
    main_count: "Il progetto deve avere esattamente un programma principale.",
    duplicate_id: "Due blocchi o due funzioni hanno lo stesso identificatore.",
    duplicate_test_case_name: "Due casi d'uso hanno lo stesso nome.",
    error_and_static_error: "Il caso d'uso attende insieme un errore prima di partire e uno durante l'esecuzione.",
    output_with_static_error: "Con un errore atteso prima dell'esecuzione l'output deve essere vuoto.",
    too_deep: "I blocchi sono annidati troppo: un blocco dentro l'altro, si arriva al più a 50 livelli.",
  },
  en: {
    invalid_json: "The text is not valid JSON: it may be cut short, or have a bracket or a comma out of place.",
    duplicate_key: "The same field appears twice in the same object.",
    unknown_field: "The format has no such field: perhaps its name is misspelled.",
    missing_field: "This field is required and missing.",
    field_not_allowed: "This field is not allowed here.",
    wrong_type: "The value has the wrong type: for instance text where a number belongs.",
    invalid_value: "The value is not among the allowed ones.",
    unknown_schema_version: "The file uses a format version this application does not know: a newer version may have written it.",
    main_count: "The project must have exactly one main program.",
    duplicate_id: "Two blocks or two functions share the same identifier.",
    duplicate_test_case_name: "Two test cases share the same name.",
    error_and_static_error: "The test case expects both an error before starting and one while running.",
    output_with_static_error: "With an error expected before running, the output must be empty.",
    too_deep: "The blocks are nested too deeply: one block inside another, at most 50 levels are allowed.",
  },
};
