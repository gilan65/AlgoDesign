// Lettura con validazione e salvataggio canonico del file di progetto `.algo`.
//
// La lettura rifiuta ciò che rende il file non rappresentabile nel modello: JSON non valido, campo
// sconosciuto, tipo JSON sbagliato, valore fuori da un'enumerazione o da un intervallo, campo obbligatorio
// mancante, campo non ammesso per quel genere di funzione o di blocco, `schema_version` sconosciuto, una
// funzione principale non unica, `id` doppi, nomi di casi d'uso doppi, `error` e `static_error` insieme.
//
// Una chiave ripetuta nello stesso oggetto è un errore di apertura (`duplicate_key`): `JSON.parse` terrebbe
// l'ultima in silenzio, e un refuso non passa in silenzio (come un campo sconosciuto). Un BOM UTF-8 in testa si
// accetta (lo scrivono alcuni editor di Windows); il salvataggio non lo scrive.
//
// Che cosa la lettura NON guarda (regola: un file così si apre, e il progetto non parte):
// - le regole di validità dei dati (nomi, valori iniziali, costanti, ruoli, lunghezze,
//   parametri, dimensione fra 1 e il tetto, le colonne di una matrice solo con la dimensione, un valore iniziale per
//   righe solo per una matrice), le stesse misure del risultato di una funzione e il passo zero di un `for`: errori del
//   controllo statico;
// - la sintassi di espressioni, destinazioni e valori iniziali, che restano testo;
// - che il blocco di un atteso esista: un caso col blocco sbagliato fallisce, non rende il file illeggibile;
// - le chiavi ripetute in un valore già analizzato (`leggi`): le vede solo `apri`, che ha il testo.
//
// Il salvataggio rilegge il modello con lo stesso lettore, che costruisce ogni oggetto con i campi
// nell'ordine stabilito dal formato, e lo scrive con rientro di 2 spazi e un a capo finale.

import {
  codiciAvviso,
  codiciErrore,
  codiciErroreStatico,
  generiDiBlocco,
  generiDiFunzione,
  limitiDellaPila,
  modalita,
  opzioniPredefinite,
  ruoli,
  tipi,
  tipiDelDato,
  type Progetto,
} from "./modello";

/** I motivi d'apertura: ognuno ha un testo in ogni lingua (`i18n/motivi.ts`). */
export const motivi = [
  "invalid_json",
  "duplicate_key",
  "unknown_field",
  "missing_field",
  "field_not_allowed",
  "wrong_type",
  "invalid_value",
  "unknown_schema_version",
  "main_count",
  "duplicate_id",
  "duplicate_test_case_name",
  "error_and_static_error",
  "output_with_static_error",
  "too_deep",
] as const;

export type Motivo = (typeof motivi)[number];

export interface ErroreDiApertura {
  /** Il percorso JSON del campo (`functions[0].body[2].kind`); vuoto per la radice. */
  readonly percorso: string;
  readonly motivo: Motivo;
}

export type Esito = { readonly ok: true; readonly progetto: Progetto } | { readonly ok: false; readonly errori: readonly ErroreDiApertura[] };

/** La versione con cui si salva: ogni file salvato la porta, anche senza le forme nuove. */
const versioneSchema = 2;

/** Le versioni che si aprono: le precedenti passano da `migra`. */
const versioniLette: readonly unknown[] = [1, versioneSchema];

/**
 * Quanti livelli di blocchi annidati si leggono: i blocchi del programma sono il primo livello, quelli dentro un
 * ciclo o una condizione il secondo, e così via. Ogni modulo che percorre i blocchi (questo lettore, il controllo,
 * l'interprete, il disegno) lo fa con la ricorsione, e oltre qualche centinaio di livelli la pila del motore si
 * esaurisce: misurato, la finestra resta bianca a 1000 livelli in Chromium (900 si aprono), il nucleo si rompe fra
 * 3000 e 5000 in WebKit e a 20 000 in Bun. Il limite più basso è però quello del Python generato: Python ammette 99
 * livelli di rientro, e il codice di un blocco al livello 98 non compila più (il `break` di un `ripeti` sta due rientri
 * sotto). Il tetto ha un margine di 47 livelli su quello; un algoritmo didattico non arriva a dieci.
 */
export const livelliMassimi = 50;

type Contesto = { errori: ErroreDiApertura[]; id: Set<string>; principali: number; livello: number };

/** Un pezzo di JSON Schema (draft 2020-12): ciò che un lettore accetta, detto nella lingua degli editor. */
export type Schema = { readonly [chiave: string]: unknown };

/** Un lettore porta con sé il pezzo di schema che gli corrisponde: lo schema del formato si compone da questi pezzi
 * (`schemaDelFormato`), quindi dice per costruzione i campi, i tipi, gli elenchi di valori e gli obbligatori del lettore. */
type Lettore = ((v: unknown, percorso: string, c: Contesto) => unknown) & { readonly schema: Schema };
type Campo = { obbligatorio: boolean; leggi: Lettore; vietato?: true };
type Campi = Record<string, Campo>;

const lettore = (leggi: (v: unknown, percorso: string, c: Contesto) => unknown, schema: Schema): Lettore => Object.assign(leggi, { schema });

const segnala = (c: Contesto, percorso: string, motivo: Motivo): undefined => {
  c.errori.push({ percorso, motivo });
  return undefined;
};

const sotto = (percorso: string, chiave: string | number) =>
  typeof chiave === "number" ? `${percorso}[${chiave}]` : percorso === "" ? chiave : `${percorso}.${chiave}`;

const eOggetto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// ------------------------------------------------------------------------------------- lettori di base

const stringa = lettore((v, p, c) => (typeof v === "string" ? v : segnala(c, p, "wrong_type")), { type: "string" });

const stringaNonVuota = lettore((v, p, c) => (typeof v !== "string" ? segnala(c, p, "wrong_type") : v === "" ? segnala(c, p, "invalid_value") : v), {
  type: "string",
  minLength: 1,
});

const booleano = lettore((v, p, c) => (typeof v === "boolean" ? v : segnala(c, p, "wrong_type")), { type: "boolean" });

/** Un intero; `-0` diventa `0`, perché il testo JSON lo scrive `0` e la riapertura deve dare lo stesso modello. */
const intero = (min = -Infinity, max = Infinity): Lettore =>
  lettore(
    (v, p, c) =>
      !Number.isInteger(v) ? segnala(c, p, "wrong_type") : (v as number) < min || (v as number) > max ? segnala(c, p, "invalid_value") : Object.is(v, -0) ? 0 : v,
    { type: "integer", ...(min > -Infinity ? { minimum: min } : {}), ...(max < Infinity ? { maximum: max } : {}) },
  );

const uno = (valori: readonly string[]): Lettore =>
  lettore((v, p, c) => (typeof v !== "string" ? segnala(c, p, "wrong_type") : valori.includes(v) ? v : segnala(c, p, "invalid_value")), {
    type: "string",
    enum: [...valori],
  });

/** Un valore fisso, già controllato da chi legge l'oggetto (il genere, la versione dello schema): si tiene com'è. */
const fisso = (valore: string | number): Lettore => lettore((x) => x, { const: valore });

const elenco = (voce: Lettore, almenoUna = false): Lettore =>
  lettore(
    (v, p, c) => {
      if (!Array.isArray(v)) return segnala(c, p, "wrong_type");
      if (almenoUna && v.length === 0) return segnala(c, p, "invalid_value");
      return v.map((x, i) => voce(x, sotto(p, i), c));
    },
    { type: "array", items: voce.schema, ...(almenoUna ? { minItems: 1 } : {}) },
  );

/** Un oggetto con esattamente i campi dati: ricostruito nell'ordine di `campi`. */
function oggetto(v: unknown, p: string, c: Contesto, campi: Campi): Record<string, unknown> | undefined {
  if (!eOggetto(v)) return segnala(c, p, "wrong_type");
  // `Object.hasOwn`, non `in`: `constructor` o `__proto__` non sono campi dello schema.
  for (const chiave of Object.keys(v)) if (!Object.hasOwn(campi, chiave)) segnala(c, sotto(p, chiave), "unknown_field");
  const fuori: Record<string, unknown> = {};
  for (const [nome, campo] of Object.entries(campi)) {
    if (!Object.hasOwn(v, nome)) {
      if (campo.obbligatorio) segnala(c, sotto(p, nome), "missing_field");
      continue;
    }
    const letto = campo.leggi(v[nome], sotto(p, nome), c);
    if (letto !== undefined) fuori[nome] = letto;
  }
  return fuori;
}

const campo = (leggi: Lettore): Campo => ({ obbligatorio: true, leggi });
const facoltativo = (leggi: Lettore): Campo => ({ obbligatorio: false, leggi });

/** Un campo che per questo genere di funzione o di blocco non deve esserci: nello schema non compare, e un oggetto
 * dello schema non ammette campi oltre i suoi. */
const vietato: Campo = { obbligatorio: false, leggi: lettore((_v, p, c) => segnala(c, p, "field_not_allowed"), {}), vietato: true };

/** Lo schema di un oggetto coi campi dati: i campi nell'ordine del formato, gli obbligatori, nessun campo in più. */
const schemaDiCampi = (campi: Campi): Schema => {
  const ammessi = Object.entries(campi).filter(([, x]) => !x.vietato);
  return {
    type: "object",
    properties: Object.fromEntries(ammessi.map(([nome, x]) => [nome, x.leggi.schema])),
    required: ammessi.filter(([, x]) => x.obbligatorio).map(([nome]) => nome),
    additionalProperties: false,
  };
};

const conOggetto = (campi: Campi): Lettore => lettore((v, p, c) => oggetto(v, p, c, campi), schemaDiCampi(campi));

/**
 * Lo schema di un oggetto i cui campi dipendono dal genere (`kind`): un ramo `if`/`then` per genere. Un validatore guarda
 * solo il ramo del genere scritto; con un `oneOf` li proverebbe tutti, e i generi che contengono altri blocchi
 * moltiplicherebbero il lavoro a ogni livello annidato, fino a non finire su un file annidato in profondità.
 */
function perGenere<G extends string>(generi: readonly G[], schemaDi: (g: G) => Schema): Schema {
  return {
    type: "object",
    properties: { kind: { type: "string", enum: [...generi] } },
    required: ["kind"],
    allOf: generi.map((g) => ({ if: { type: "object", properties: { kind: { const: g } }, required: ["kind"] }, then: schemaDi(g) })),
  };
}

/** Un `id` di funzione o di blocco: non vuoto (un blocco vuoto vuol dire «il progetto») e unico nel progetto. Lo schema
 * non sa dire «unico»: lo dice solo il lettore. */
const id = lettore(
  (v, p, c) => {
    if (typeof v !== "string") return segnala(c, p, "wrong_type");
    if (v === "") return segnala(c, p, "invalid_value");
    if (c.id.has(v)) segnala(c, p, "duplicate_id");
    c.id.add(v);
    return v;
  },
  { type: "string", minLength: 1 },
);

// ---------------------------------------------------------------------------------------- lo schema

const metadati = conOggetto({
  name: campo(stringaNonVuota),
  author: facoltativo(stringa),
  description: facoltativo(stringa),
  notes: facoltativo(stringa),
  // `false` vuol dire «non è una libreria», come l'assenza: si legge come assente e salvando non si scrive.
  library: facoltativo(lettore((v, p, c) => (booleano(v, p, c) === true ? true : undefined), booleano.schema)),
});

/** Un solo carattere (un codice), mai quello di codice 0 né un surrogato isolato. Lo schema conta i caratteri come il
 * lettore, ma non sa escludere un surrogato isolato: lo esclude solo il lettore. */
const carattereDiRiempimento = lettore(
  (v, p, c) => {
    if (typeof v !== "string") return segnala(c, p, "wrong_type");
    const codici = [...v].map((x) => x.codePointAt(0)!);
    return codici.length !== 1 || codici[0] === 0 || (codici[0]! >= 0xd800 && codici[0]! <= 0xdfff) ? segnala(c, p, "invalid_value") : v;
  },
  { type: "string", minLength: 1, maxLength: 1, not: { const: String.fromCodePoint(0) } },
);

const campiDelleOpzioni: Campi = {
  fill_character: facoltativo(carattereDiRiempimento),
  real_decimals: facoltativo(intero(0, 15)),
  call_stack_limit: facoltativo(intero(limitiDellaPila.minimo, limitiDellaPila.massimo)),
};

/** Le opzioni uguali al predefinito si tolgono, e con esse un oggetto rimasto vuoto: salvando, l'app le omette. */
const opzioni = lettore((v, p, c) => {
  const letto = oggetto(v, p, c, campiDelleOpzioni);
  if (letto === undefined) return undefined;
  const diverse = Object.entries(letto).filter(([k, x]) => x !== opzioniPredefinite[k as keyof typeof opzioniPredefinite]);
  return diverse.length === 0 ? undefined : Object.fromEntries(diverse);
}, schemaDiCampi(campiDelleOpzioni));

const perOgniElemento: Campi = { each: campo(stringa) };

/** Le righe di una matrice: un elenco di letterali per riga. Un elenco con dentro un elenco è tutto di righe. */
const perRighe = elenco(elenco(stringa));

const valoreIniziale = lettore(
  (v, p, c) =>
    typeof v === "string"
      ? v
      : Array.isArray(v)
        ? (v.some(Array.isArray) ? perRighe : elenco(stringa))(v, p, c)
        : eOggetto(v)
          ? oggetto(v, p, c, perOgniElemento)
          : segnala(c, p, "wrong_type"),
  // Le due forme di elenco in un ramo solo: un elenco di letterali o un elenco di righe, mai le due insieme.
  { anyOf: [stringa.schema, { type: "array", anyOf: [{ items: stringa.schema }, { items: elenco(stringa).schema }] }, schemaDiCampi(perOgniElemento)] },
);

/**
 * Il nome del record va col tipo `record` e solo con lui: `chiaveDelTipo` col valore `record` vuole `chiaveDelRecord`, e
 * un altro tipo non la ammette. Lo dice anche lo schema, con un `if`/`then` sul tipo.
 */
function controllaIlRecord(v: unknown, p: string, c: Contesto, chiaveDelTipo: string, chiaveDelRecord: string): void {
  if (!eOggetto(v) || !Object.hasOwn(v, chiaveDelTipo)) return;
  const eRecord = v[chiaveDelTipo] === "record";
  if (eRecord && !Object.hasOwn(v, chiaveDelRecord)) segnala(c, sotto(p, chiaveDelRecord), "missing_field");
  if (!eRecord && Object.hasOwn(v, chiaveDelRecord)) segnala(c, sotto(p, chiaveDelRecord), "field_not_allowed");
}

const schemaColRecord = (schema: Schema, chiaveDelTipo: string, chiaveDelRecord: string): Schema => ({
  ...schema,
  if: { type: "object", properties: { [chiaveDelTipo]: { const: "record" } }, required: [chiaveDelTipo] },
  // Il campo nominato si dichiara anche qui (vuoto: accetta tutto), perché un validatore rigoroso lo chiede.
  then: { type: "object", properties: { [chiaveDelRecord]: {} }, required: [chiaveDelRecord] },
  else: { not: { type: "object", properties: { [chiaveDelRecord]: {} }, required: [chiaveDelRecord] } },
});

function colRecord(campi: Campi, chiaveDelTipo: string, chiaveDelRecord: string): Lettore {
  const base = conOggetto(campi);
  return lettore(
    (v, p, c) => {
      const letto = base(v, p, c);
      if (letto !== undefined) controllaIlRecord(v, p, c, chiaveDelTipo, chiaveDelRecord);
      return letto;
    },
    schemaColRecord(base.schema, chiaveDelTipo, chiaveDelRecord),
  );
}

const campiDelDato: Campi = {
  name: campo(stringa),
  type: campo(uno(tipiDelDato)),
  record: facoltativo(stringa),
  size: facoltativo(intero()),
  columns: facoltativo(intero()),
  constant: facoltativo(booleano),
  initial: facoltativo(valoreIniziale),
  role: facoltativo(uno(ruoli)),
  max_length: facoltativo(intero()),
  parameter: facoltativo(uno(modalita)),
};

const dato = colRecord(campiDelDato, "type", "record");

/** Un campo di un record: un tipo semplice. Le regole dei nomi e delle lunghezze sono del controllo statico. */
const campoDelRecord = conOggetto({ name: campo(stringa), type: campo(uno(tipi)), max_length: facoltativo(intero()) });

/** Un record del progetto: il nome e i campi (almeno uno lo chiede il controllo statico, non l'apertura). */
const definizioneDelRecord = conOggetto({ name: campo(stringa), fields: campo(elenco(campoDelRecord)) });

const segnalazione = (codici: readonly string[]) => conOggetto({ code: campo(uno(codici)), block: campo(stringa) });

const campiDellAtteso: Campi = {
  output: campo(stringa),
  error: facoltativo(segnalazione(codiciErrore)),
  static_error: facoltativo(segnalazione(codiciErroreStatico)),
  warnings: facoltativo(elenco(segnalazione(codiciAvviso))),
};

const atteso = lettore(
  (v, p, c) => {
    const letto = oggetto(v, p, c, campiDellAtteso);
    if (letto === undefined) return undefined;
    if ("error" in letto && "static_error" in letto) segnala(c, p, "error_and_static_error");
    // Con un errore statico atteso l'output è vuoto: il progetto non parte, e niente è stato scritto.
    if ("static_error" in letto && typeof letto.output === "string" && letto.output !== "") segnala(c, sotto(p, "output"), "output_with_static_error");
    return letto;
  },
  {
    ...schemaDiCampi(campiDellAtteso),
    // I campi nominati si dichiarano anche qui (vuoti: accettano tutto), perché un validatore rigoroso lo chiede.
    not: { type: "object", properties: { error: {}, static_error: {} }, required: ["error", "static_error"] },
    if: { type: "object", properties: { static_error: {} }, required: ["static_error"] },
    then: { type: "object", properties: { output: { const: "" } } },
  },
);

const casoDUso = conOggetto({
  name: campo(stringa),
  description: facoltativo(stringa),
  inputs: campo(elenco(conOggetto({ data: campo(stringa), text: campo(stringa) }))),
  expected: campo(atteso),
});

/** Un caso di una funzione eseguita da sola: una voce può non avere il testo (un parametro per riferimento senza valore)
 * e può valere per ogni elemento di un parametro vettore (`each`); a quale lettura arriva lo dice l'esecuzione. */
const casoDiUnaFunzione = conOggetto({
  name: campo(stringa),
  description: facoltativo(stringa),
  inputs: campo(elenco(conOggetto({ data: campo(stringa), text: facoltativo(stringa), each: facoltativo(booleano) }))),
  expected: campo(atteso),
});

/** I nomi dei casi d'uso sono unici fra i casi del progetto, e fra quelli di una funzione (lo schema non lo sa dire). */
const casiDUso = (caso: Lettore = casoDUso): Lettore =>
  lettore((v, p, c) => {
    const casi = elenco(caso)(v, p, c);
    if (!Array.isArray(casi)) return undefined;
    const visti = new Set<unknown>();
    casi.forEach((caso, i) => {
      const nome = eOggetto(caso) ? caso.name : undefined;
      if (typeof nome !== "string") return;
      if (visti.has(nome)) segnala(c, sotto(sotto(p, i), "name"), "duplicate_test_case_name");
      visti.add(nome);
    });
    return casi;
  }, elenco(caso).schema);

/** Un blocco dentro una sequenza: lo schema lo richiama per nome, perché un blocco contiene altre sequenze. */
const unBlocco = lettore((v, p, c) => blocco(v, p, c), { $ref: "#/$defs/block" });

/** Una sequenza di blocchi, un livello più in giù: oltre il tetto una sequenza che ha dei blocchi si segnala
 * (`too_deep`, una volta sola) e non si scende; vuota, non aggiunge livelli. Lo schema non conta i livelli. */
const blocchi = lettore((v, p, c) => {
  if (c.livello >= livelliMassimi && Array.isArray(v) && v.length > 0) return segnala(c, p, "too_deep");
  c.livello++;
  try {
    return elenco(unBlocco)(v, p, c);
  } finally {
    c.livello--;
  }
}, elenco(unBlocco).schema);

const campiPropri: Record<(typeof generiDiBlocco)[number], Campi> = {
  assignment: { target: campo(stringa), value: campo(stringa) },
  read: { target: campo(stringa) },
  write: { values: campo(elenco(stringa, true)), newline: campo(booleano) },
  if: { condition: campo(stringa), then: campo(blocchi), else: campo(blocchi) },
  while: { condition: campo(stringa), body: campo(blocchi) },
  repeat: { body: campo(blocchi), condition: campo(stringa) },
  for: { counter: campo(stringa), from: campo(stringa), to: campo(stringa), step: facoltativo(intero()), body: campo(blocchi) },
  for_each: { item: campo(stringa), source: campo(stringa), body: campo(blocchi) },
  call: { callee: campo(stringa), arguments: campo(elenco(stringa)) },
  comment: { text: campo(stringa) },
};

/** I campi di un blocco di quel genere: gli stessi per la lettura e per lo schema. */
const campiDelBlocco = (g: (typeof generiDiBlocco)[number]): Campi => ({ id: campo(id), kind: campo(fisso(g)), breakpoint: facoltativo(booleano), ...campiPropri[g] });

/** I campi di una funzione di quel genere: gli stessi per la lettura e per lo schema. */
function campiDellaFunzione(g: (typeof generiDiFunzione)[number]): Campi {
  const conNome = g !== "main";
  const restituisce = g === "function";
  const fine = conOggetto({
    id: campo(id),
    return_value: restituisce ? campo(stringa) : vietato,
    breakpoint: facoltativo(booleano),
  });
  return {
    id: campo(id),
    kind: campo(fisso(g)),
    name: conNome ? campo(stringa) : vietato,
    return_type: restituisce ? campo(uno(tipiDelDato)) : vietato,
    return_record: restituisce ? facoltativo(stringa) : vietato,
    // Il vettore e la lunghezza massima della stringa restituiti, sullo stampo di un dato: i valori fuori dai limiti sono
    // errori del controllo statico.
    return_size: restituisce ? facoltativo(intero()) : vietato,
    return_columns: restituisce ? facoltativo(intero()) : vietato,
    return_max_length: restituisce ? facoltativo(intero()) : vietato,
    default_result: restituisce ? facoltativo(stringa) : vietato,
    data: campo(elenco(dato)),
    body: campo(blocchi),
    end: campo(fine),
    // I casi del programma principale stanno nella radice; quelli di una procedura o di una funzione qui.
    test_cases: conNome ? facoltativo(casiDUso(casoDiUnaFunzione)) : vietato,
  };
}

/**
 * Il genere si legge per primo, perché decide quali campi sono ammessi; se manca o è sconosciuto si
 * segnala solo quello, invece di dichiarare sconosciuti tutti gli altri campi.
 */
function genere(v: Record<string, unknown>, p: string, c: Contesto, generi: readonly string[]): string | undefined {
  if (!Object.hasOwn(v, "kind")) return segnala(c, sotto(p, "kind"), "missing_field");
  return uno(generi)(v.kind, sotto(p, "kind"), c) as string | undefined;
}

function blocco(v: unknown, p: string, c: Contesto): unknown {
  if (!eOggetto(v)) return segnala(c, p, "wrong_type");
  const g = genere(v, p, c, generiDiBlocco);
  if (g === undefined) return undefined;
  return oggetto(v, p, c, campiDelBlocco(g as (typeof generiDiBlocco)[number]));
}

const funzione = lettore(
  (v, p, c) => {
    if (!eOggetto(v)) return segnala(c, p, "wrong_type");
    const g = genere(v, p, c, generiDiFunzione);
    if (g === undefined) return undefined;
    if (g === "main") c.principali++;
    const letta = oggetto(v, p, c, campiDellaFunzione(g as (typeof generiDiFunzione)[number]));
    if (letta !== undefined && g === "function") controllaIlRecord(v, p, c, "return_type", "return_record");
    return letta;
  },
  perGenere(generiDiFunzione, (g) => {
    const schema = schemaDiCampi(campiDellaFunzione(g));
    return g === "function" ? schemaColRecord(schema, "return_type", "return_record") : schema;
  }),
);

/** Le funzioni del progetto: una sola è il programma principale (lo schema lo dice con `contains`). */
const funzioni = lettore(elenco(funzione), {
  ...elenco(funzione).schema,
  contains: { type: "object", properties: { kind: { const: "main" } }, required: ["kind"] },
  minContains: 1,
  maxContains: 1,
});

/** Se un caso chiamato `nome`, del programma (`funzione` assente) o della procedura o funzione con quell'`id`, ha lo
 * stesso nome nella riga di comando (`file#funzione/caso`) di un caso dell'altra parte: un caso del
 * programma che è il nome di una procedura o funzione, «/» e il nome di un suo caso. Non è un errore di apertura (un file
 * così si apre): lo rifiutano le modifiche che danno il nome a un caso. Un nome di funzione non ha «/», quindi un caso del
 * programma si confonde al più con un caso per funzione. */
export function nomeCheSiConfonde(p: Progetto, nome: string, funzione?: string): boolean {
  if (funzione === undefined) return p.functions.some((f) => f.name !== undefined && (f.test_cases ?? []).some((x) => `${f.name}/${x.name}` === nome));
  const f = p.functions.find((x) => x.id === funzione);
  return f?.name !== undefined && (p.test_cases ?? []).some((c) => c.name === `${f.name}/${nome}`);
}

/**
 * Punto di migrazione: una versione precedente dello schema si porta all'ultima prima di leggerla. La versione 1 ha la
 * stessa forma della 2 senza i record, e cambia solo il numero; una versione che non si conosce (scritta da
 * un'applicazione più recente) non si apre.
 */
function migra(v: Record<string, unknown>, c: Contesto): Record<string, unknown> | undefined {
  if (!Object.hasOwn(v, "schema_version")) return segnala(c, "schema_version", "missing_field");
  if (!versioniLette.includes(v.schema_version)) return segnala(c, "schema_version", Number.isInteger(v.schema_version) ? "unknown_schema_version" : "wrong_type");
  return v.schema_version === versioneSchema ? v : { ...v, schema_version: versioneSchema };
}

const campiDelProgetto: Campi = {
  format: campo(uno(["algodesign"])),
  // Già portata all'ultima da `migra`; lo schema dice le versioni che si aprono.
  schema_version: campo(lettore((x) => x, { type: "integer", enum: [...versioniLette] })),
  metadata: campo(metadati),
  options: facoltativo(opzioni),
  records: facoltativo(elenco(definizioneDelRecord)),
  shared_constants: facoltativo(elenco(dato)),
  functions: campo(funzioni),
  test_cases: facoltativo(casiDUso()),
};

/**
 * Lo JSON Schema del file `.algo`, composto dai pezzi del lettore: lo stesso lettore, detto per gli editor e per chi
 * scrive un file fuori dall'app. Non sa dire ciò che il lettore controlla oltre la forma: gli `id` unici, i nomi dei
 * casi d'uso unici, la chiave ripetuta in un oggetto, i 50 livelli di blocchi annidati, il surrogato isolato nel
 * carattere di riempimento.
 */
export function schemaDelFormato(): Schema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "AlgoDesign project (.algo)",
    ...schemaDiCampi(campiDelProgetto),
    $defs: { block: perGenere(generiDiBlocco, (g) => schemaDiCampi(campiDelBlocco(g))) },
  };
}

/** Il testo del file dello schema pubblicato: rientro di 2 spazi e un a capo finale, come un progetto salvato. */
export const testoDelloSchema = (): string => `${JSON.stringify(schemaDelFormato(), null, 2)}\n`;

// ------------------------------------------------------------------------------------------ ingressi

/** Valida un valore JSON già analizzato e ne fa un progetto. */
export function leggi(v: unknown): Esito {
  const c: Contesto = { errori: [], id: new Set(), principali: 0, livello: 0 };
  if (!eOggetto(v)) return { ok: false, errori: [{ percorso: "", motivo: "wrong_type" }] };
  const migrato = migra(v, c);
  if (migrato === undefined) return { ok: false, errori: c.errori };
  const progetto = oggetto(migrato, "", c, campiDelProgetto);
  if (Array.isArray(migrato.functions) && c.principali !== 1) segnala(c, "functions", "main_count");
  if (c.errori.length > 0 || progetto === undefined) return { ok: false, errori: c.errori };
  return { ok: true, progetto: progetto as unknown as Progetto };
}

type Cornice = { oggetto: true; percorso: string; chiavi: Set<string>; chiave: string | null } | { oggetto: false; percorso: string; indice: number };

/**
 * Le chiavi ripetute nello stesso oggetto di un testo JSON **valido**, col percorso della ripetizione. Il
 * testo si scorre una volta, con una pila esplicita (un file annidatissimo non esaurisce lo stack); una
 * chiave si confronta dopo averne letto le sequenze di escape, come fa `JSON.parse`.
 */
export function chiaviRipetute(testo: string): ErroreDiApertura[] {
  const errori: ErroreDiApertura[] = [];
  const pila: Cornice[] = [];
  const delValore = (): string => {
    const c = pila.at(-1);
    return c === undefined ? "" : c.oggetto ? sotto(c.percorso, c.chiave ?? "") : sotto(c.percorso, c.indice);
  };
  for (let i = 0; i < testo.length; i++) {
    const x = testo[i];
    if (x === '"') {
      let fine = i + 1;
      while (testo[fine] !== '"') fine += testo[fine] === "\\" ? 2 : 1;
      const c = pila.at(-1);
      if (c?.oggetto && c.chiave === null) {
        const chiave = JSON.parse(testo.slice(i, fine + 1)) as string;
        if (c.chiavi.has(chiave)) errori.push({ percorso: sotto(c.percorso, chiave), motivo: "duplicate_key" });
        c.chiavi.add(chiave);
        c.chiave = chiave;
      }
      i = fine;
    } else if (x === "{") pila.push({ oggetto: true, percorso: delValore(), chiavi: new Set(), chiave: null });
    else if (x === "[") pila.push({ oggetto: false, percorso: delValore(), indice: 0 });
    else if (x === "}" || x === "]") pila.pop();
    else if (x === ",") {
      const c = pila.at(-1);
      if (c?.oggetto) c.chiave = null;
      else if (c) c.indice++;
    }
  }
  return errori;
}

/** Apre il testo di un file `.algo`; un BOM UTF-8 in testa si salta. */
export function apri(testo: string): Esito {
  const senzaBom = testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo;
  let v: unknown;
  try {
    v = JSON.parse(senzaBom);
  } catch {
    return { ok: false, errori: [{ percorso: "", motivo: "invalid_json" }] };
  }
  const ripetute = chiaviRipetute(senzaBom);
  return ripetute.length > 0 ? { ok: false, errori: ripetute } : leggi(v);
}

/** Il testo canonico di un progetto: campi nell'ordine stabilito dal formato, rientro di 2 spazi, a capo finale. */
export function salva(p: Progetto): string {
  const esito = leggi(p);
  if (!esito.ok) throw new Error(`progetto non valido: ${JSON.stringify(esito.errori)}`);
  return `${JSON.stringify(esito.progetto, null, 2)}\n`;
}
