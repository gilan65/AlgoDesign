// Il file di una registrazione: un testo leggibile, in JSON, con l'identificatore e la versione propri, che porta un
// elenco di esecuzioni. Dice una volta sola la versione del prodotto, la lingua, il sistema, i cinque valori che
// un'esecuzione prende fuori dal file del progetto (tre limiti, due delle righe lunghe) e gli errori dell'app; e per ogni
// esecuzione il progetto, la funzione eseguita, le righe date alle letture, la console, gli avanzamenti e l'esito.
//
// I passi non si scrivono: l'esecuzione è deterministica, e il programma li rifà dal progetto e dalle letture.
//
// Il lettore rifiuta col motivo, con gli stessi motivi del progetto (`progetto/formato.ts`, i testi in `i18n/motivi.ts`):
// un campo sconosciuto, una versione del formato sconosciuta, un progetto invalido (col percorso sotto `executions[n].project`).
// Lo schema si compone dai pezzi del lettore, come quello del progetto: resta interno finché il file lo legge solo l'app.
//
// Che cosa il lettore NON guarda (lo fa la riproduzione, che dice le differenze): che le letture, la console e l'esito siano
// quelli del programma, né che il caso eseguito sia uno di quelli del progetto (si porta con sé le voci e l'atteso).
// Le regole che lo schema non sa dire: la funzione eseguita che esiste nel progetto, la chiave ripetuta, una posizione degli errori dell'app
// che l'elenco non ha.
//
// Un valore scritto a mano in un'esecuzione non sta nel progetto né nelle letture: lo porta `changes`, col punto in cui è stato scritto, e il campo c'è solo se ce n'è uno,
// così un file senza modifiche resta uguale byte per byte. Nell'esecuzione di un caso d'uso non ce ne sono: il lettore e lo schema lo rifiutano.

import { codiciErrore, codiciErroreStatico, modalita, type CasoDiUnaFunzione, type CodiceErrore, type CodiceErroreStatico, type Progetto, type Segnalazione } from "../progetto/modello";
import {
  booleano,
  campo,
  casoDiUnaFunzione,
  conOggetto,
  definizioniDelFormato,
  eOggetto,
  elenco,
  facoltativo,
  fisso,
  genere,
  intero,
  lettore,
  oggetto,
  perGenere,
  progettoAnnidato,
  schemaDiCampi,
  segnala,
  segnalazione,
  sotto,
  stringa,
  uno,
  valoreDelTesto,
  type Campi,
  type Contesto,
  type ErroreDiApertura,
  type Lettore,
  type Schema,
} from "../progetto/formato";
import type { Lingua } from "../../i18n/lingue";

export const formatoDellaRegistrazione = "algodesign-recording";
const versioneDellaRegistrazione = 1;

/** Ogni lingua dell'interfaccia: una lingua nuova senza la sua voce è un errore di `tsc`. */
const lingueDelFile: Record<Lingua, true> = { it: true, en: true };

/** I sistemi: un elenco chiuso, mai il testo che il sistema dice di sé (porta nomi e versioni che nessuno ha scelto di dare). */
export const sistemi = ["windows", "linux", "macos"] as const;
export type Sistema = (typeof sistemi)[number];

export interface LimitiDelFile {
  readonly vector_elements: number;
  readonly string_length: number;
  readonly string_vector_characters: number;
}

export interface RigheLungheDelFile {
  readonly characters: number;
  readonly mode: "wrap" | "tail";
}

export interface RigaLetta {
  readonly data: string;
  readonly text?: string;
  readonly each?: true;
  readonly rejected?: true;
}

export type RigaDellaConsole =
  | { readonly kind: "write"; readonly text: string; readonly newline: boolean; readonly cut?: true }
  | { readonly kind: "read"; readonly data: string; readonly text: string; readonly cut?: true }
  | { readonly kind: "no_value"; readonly data: string }
  | { readonly kind: "invalid"; readonly data: string; readonly text: string; readonly cut?: true };

export type FaseDelFile = "start" | "condition" | "step" | "item";

export type EsitoDelFile =
  /** Prima della prima azione. */
  | { readonly kind: "ready" }
  /** Fra due fette: il punto lo dicono gli avanzamenti. */
  | { readonly kind: "running" }
  | {
      readonly kind: "paused";
      readonly block: string;
      readonly data?: string;
      readonly phase?: FaseDelFile;
      readonly field?: number;
      readonly inner?: true;
      readonly function?: string;
      readonly depth: number;
      /** La funzione tornata, se la pausa è la ripresa dell'azione di chi l'ha chiamata. */
      readonly resumed_from?: string;
    }
  | { readonly kind: "asking"; readonly data: string; readonly invalid: boolean; readonly parameter?: "value" | "reference"; readonly element?: number; readonly field?: string }
  | { readonly kind: "finished"; readonly error?: Segnalazione<CodiceErrore> }
  /** Il controllo statico non la fa partire; `out_of_scope`: i blocchi di un progetto fuori tappa. */
  | { readonly kind: "not_started"; readonly errors: readonly Segnalazione<CodiceErroreStatico>[]; readonly out_of_scope?: readonly string[] };

/** La parte di un'esecuzione che il programma rifà: la riproduzione la confronta campo per campo. */
export interface EsitoRegistrato {
  readonly console: readonly RigaDellaConsole[];
  readonly console_removed: number;
  /** I risultati dell'interprete guardati: dicono il punto di un'esecuzione non finita. */
  readonly advances: number;
  readonly outcome: EsitoDelFile;
}

/** Un valore scritto a mano: gli avanzamenti dicono il punto, il testo è quello dato. `function`: nessuna per la radice. */
export interface ModificaDelFile {
  readonly advances: number;
  readonly function?: string;
  readonly data: string;
  readonly element: number;
  readonly text: string;
}

/** Con le righe date alle letture, o nel modo caso con il caso, che ha le sue voci. */
export type EsecuzioneRegistrata = EsitoRegistrato & {
  readonly project: Progetto;
  readonly function?: string;
  /** I valori scritti a mano, nell'ordine; assente se nessuno. */
  readonly changes?: readonly ModificaDelFile[];
  /** I limiti e le righe lunghe di questa esecuzione, se non sono quelli scritti in cima al file. */
  readonly limits?: LimitiDelFile;
  readonly long_lines?: RigheLungheDelFile;
  /** Le posizioni in `app_errors` delle voci arrivate mentre questa esecuzione era aperta; assente se nessuna. */
  readonly app_errors_during?: readonly number[];
} & ({ readonly reads: readonly RigaLetta[]; readonly test_case?: undefined } | { readonly test_case: CasoDiUnaFunzione; readonly reads?: undefined });

/** Da dove viene un errore dell'app: il disegno, un errore che nessuno ha preso (un gestore di un evento, un fotogramma), una promessa
 * rifiutata che nessuno ha preso, un errore che l'app ha preso e gestito (un errore del guscio, una finestra d'errore). */
export const originiDegliErrori = ["drawing", "uncaught", "rejected", "handled"] as const;
export type OrigineDellErrore = (typeof originiDegliErrori)[number];

export interface ErroreDellApp {
  readonly origin: OrigineDellErrore;
  /** Senza percorsi (`errori.ts`). */
  readonly text: string;
  /** Quante volte è arrivato lo stesso testo dalla stessa origine. */
  readonly times: number;
}

export interface Registrazione {
  readonly format: typeof formatoDellaRegistrazione;
  readonly schema_version: typeof versioneDellaRegistrazione;
  readonly product_version: string;
  readonly language: Lingua;
  readonly system: Sistema;
  readonly limits: LimitiDelFile;
  readonly long_lines: RigheLungheDelFile;
  readonly app_errors: readonly ErroreDellApp[];
  /** Quante volte un errore non è entrato perché l'elenco era pieno: le occorrenze, non i testi diversi. */
  readonly app_errors_lost: number;
  /** Le esecuzioni più vecchie che non ci sono, perché chi registra ne tiene un numero fisso. */
  readonly executions_lost: number;
  readonly executions: readonly EsecuzioneRegistrata[];
}

// ---------------------------------------------------------------------------------------------- i lettori

/** Un intero da `min` in su. */
const almeno = (min: number) => intero(min);

/** Un valore di un elenco di generi: l'oggetto dei campi di quel genere, lo schema per genere. */
function perGeneri(campi: Readonly<Record<string, Campi>>): Lettore {
  const generi = Object.keys(campi);
  return lettore(
    (v, p, c) => {
      if (!eOggetto(v)) return segnala(c, p, "wrong_type");
      const g = genere(v, p, c, generi);
      return g === undefined ? undefined : oggetto(v, p, c, campi[g]!);
    },
    perGenere(generi, (g) => schemaDiCampi(campi[g]!)),
  );
}

const vero = lettore((v, p, c) => (booleano(v, p, c) === true ? true : undefined), booleano.schema);

const campiDellaConsole: Readonly<Record<RigaDellaConsole["kind"], Campi>> = {
  write: { kind: campo(fisso("write")), text: campo(stringa), newline: campo(booleano), cut: facoltativo(vero) },
  read: { kind: campo(fisso("read")), data: campo(stringa), text: campo(stringa), cut: facoltativo(vero) },
  no_value: { kind: campo(fisso("no_value")), data: campo(stringa) },
  invalid: { kind: campo(fisso("invalid")), data: campo(stringa), text: campo(stringa), cut: facoltativo(vero) },
};

const fasi: readonly FaseDelFile[] = ["start", "condition", "step", "item"];

const campiDellEsito: Readonly<Record<EsitoDelFile["kind"], Campi>> = {
  ready: { kind: campo(fisso("ready")) },
  running: { kind: campo(fisso("running")) },
  paused: {
    kind: campo(fisso("paused")),
    block: campo(stringa),
    data: facoltativo(stringa),
    phase: facoltativo(uno(fasi)),
    field: facoltativo(almeno(0)),
    inner: facoltativo(vero),
    function: facoltativo(stringa),
    depth: campo(almeno(0)),
    resumed_from: facoltativo(stringa),
  },
  asking: {
    kind: campo(fisso("asking")),
    data: campo(stringa),
    invalid: campo(booleano),
    parameter: facoltativo(uno(modalita.filter((m) => m !== "out"))),
    element: facoltativo(almeno(0)),
    field: facoltativo(stringa),
  },
  finished: { kind: campo(fisso("finished")), error: facoltativo(segnalazione(codiciErrore)) },
  not_started: { kind: campo(fisso("not_started")), errors: campo(elenco(segnalazione(codiciErroreStatico))), out_of_scope: facoltativo(elenco(stringa)) },
};

const rigaLetta = conOggetto({ data: campo(stringa), text: facoltativo(stringa), each: facoltativo(vero), rejected: facoltativo(vero) });

const modificaDelFile = conOggetto({ advances: campo(almeno(0)), function: facoltativo(stringa), data: campo(stringa), element: campo(almeno(0)), text: campo(stringa) });

const limitiDelFile = conOggetto({ vector_elements: campo(almeno(1)), string_length: campo(almeno(1)), string_vector_characters: campo(almeno(1)) });
const righeLungheDelFile = conOggetto({ characters: campo(almeno(1)), mode: campo(uno(["wrap", "tail"])) });

const campiDellEsecuzione: Campi = {
  project: campo(progettoAnnidato),
  function: facoltativo(stringa),
  limits: facoltativo(limitiDelFile),
  long_lines: facoltativo(righeLungheDelFile),
  app_errors_during: facoltativo(elenco(almeno(0))),
  test_case: facoltativo(casoDiUnaFunzione),
  reads: facoltativo(elenco(rigaLetta)),
  changes: facoltativo(elenco(modificaDelFile, true)),
  console: campo(elenco(perGeneri(campiDellaConsole))),
  console_removed: campo(almeno(0)),
  advances: campo(almeno(0)),
  outcome: campo(perGeneri(campiDellEsito)),
};

/** Una funzione eseguita che il progetto non ha non si esegue; le letture o il caso, uno solo dei due (lo schema dice solo questo). */
const esecuzione = lettore(
  (v, p, c) => {
    const letta = oggetto(v, p, c, campiDellEsecuzione);
    if (letta === undefined) return undefined;
    const conCaso = Object.hasOwn(letta, "test_case");
    if (conCaso && Object.hasOwn(letta, "reads")) segnala(c, sotto(p, "reads"), "field_not_allowed");
    if (conCaso && Object.hasOwn(letta, "changes")) segnala(c, sotto(p, "changes"), "field_not_allowed");
    const nelFile = eOggetto(v) && Object.hasOwn(v, "reads");
    if (!conCaso && !nelFile) segnala(c, sotto(p, "reads"), "missing_field");
    const progetto = letta.project as Progetto | undefined;
    if (typeof letta.function === "string" && progetto !== undefined && !progetto.functions.some((f) => f.id === letta.function && f.kind !== "main")) segnala(c, sotto(p, "function"), "invalid_value");
    return letta;
  },
  {
    ...schemaDiCampi(campiDellEsecuzione),
    if: { type: "object", properties: { test_case: {} }, required: ["test_case"] },
    then: { allOf: [{ not: { type: "object", properties: { reads: {} }, required: ["reads"] } }, { not: { type: "object", properties: { changes: {} }, required: ["changes"] } }] },
    else: { type: "object", properties: { reads: {} }, required: ["reads"] },
  },
);

const campiDellaRegistrazione: Campi = {
  format: campo(uno([formatoDellaRegistrazione])),
  // Già controllata da chi legge il file: una versione che non si conosce non si legge oltre.
  schema_version: campo(fisso(versioneDellaRegistrazione)),
  product_version: campo(stringa),
  language: campo(uno(Object.keys(lingueDelFile))),
  system: campo(uno(sistemi)),
  limits: campo(limitiDelFile),
  long_lines: campo(righeLungheDelFile),
  app_errors: campo(elenco(conOggetto({ origin: campo(uno(originiDegliErrori)), text: campo(stringa), times: campo(almeno(1)) }))),
  app_errors_lost: campo(almeno(0)),
  executions_lost: campo(almeno(0)),
  executions: campo(elenco(esecuzione, true)),
};

/** Lo schema del file, composto dai pezzi del lettore. */
export const schemaDellaRegistrazione = (): Schema => ({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "AlgoDesign recording",
  ...schemaDiCampi(campiDellaRegistrazione),
  $defs: definizioniDelFormato(),
});

export type EsitoDellaLettura = { readonly ok: true; readonly registrazione: Registrazione } | { readonly ok: false; readonly errori: readonly ErroreDiApertura[] };

/** Valida un valore JSON già analizzato. Prima l'identificatore e la versione: un altro file, o uno di una versione che non si
 * conosce, si dice da solo invece di una lista di campi sconosciuti. */
export function leggiRegistrazione(v: unknown): EsitoDellaLettura {
  const c: Contesto = { errori: [], id: new Set(), principali: 0, livello: 0 };
  if (!eOggetto(v)) return { ok: false, errori: [{ percorso: "", motivo: "wrong_type" }] };
  if (!Object.hasOwn(v, "format")) return { ok: false, errori: [{ percorso: "format", motivo: "missing_field" }] };
  if (uno([formatoDellaRegistrazione])(v.format, "format", c) === undefined) return { ok: false, errori: c.errori };
  if (!Object.hasOwn(v, "schema_version")) return { ok: false, errori: [{ percorso: "schema_version", motivo: "missing_field" }] };
  if (v.schema_version !== versioneDellaRegistrazione) return { ok: false, errori: [{ percorso: "schema_version", motivo: Number.isInteger(v.schema_version) ? "unknown_schema_version" : "wrong_type" }] };
  const letta = oggetto(v, "", c, campiDellaRegistrazione);
  if (c.errori.length > 0 || letta === undefined) return { ok: false, errori: c.errori };
  const registrazione = letta as unknown as Registrazione;
  // Una regola che lo schema non sa dire: una posizione dell'elenco degli errori che l'elenco non ha.
  registrazione.executions.forEach((x, n) =>
    x.app_errors_during?.forEach((posizione, i) => {
      if (posizione >= registrazione.app_errors.length) segnala(c, `executions[${n}].app_errors_during[${i}]`, "invalid_value");
    }),
  );
  return c.errori.length > 0 ? { ok: false, errori: c.errori } : { ok: true, registrazione };
}

/** Apre il testo di un file; un BOM in testa si salta. */
export function apriRegistrazione(testo: string): EsitoDellaLettura {
  const v = valoreDelTesto(testo);
  return v.ok ? leggiRegistrazione(v.valore) : v;
}

/** Il testo del file, byte per byte quello che la finestra mostra: i campi nell'ordine del formato, rientro di 2 spazi, a capo finale. */
export function testoDellaRegistrazione(r: Registrazione): string {
  const letta = leggiRegistrazione(r);
  if (!letta.ok) throw new Error(`registrazione non valida: ${JSON.stringify(letta.errori)}`);
  return `${JSON.stringify(letta.registrazione, null, 2)}\n`;
}
