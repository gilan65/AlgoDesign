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
//   parametri, dimensione fra 1 e il tetto), le stesse misure del risultato di una funzione e il passo zero di un
//   `for`: errori del controllo statico;
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
  modalita,
  opzioniPredefinite,
  ruoli,
  tipi,
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

/** La sola versione che questo schema conosce, e quella con cui si salva. */
const versioneSchema = 1;

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
type Lettore = (v: unknown, percorso: string, c: Contesto) => unknown;
type Campi = Record<string, { obbligatorio: boolean; leggi: Lettore }>;

const segnala = (c: Contesto, percorso: string, motivo: Motivo): undefined => {
  c.errori.push({ percorso, motivo });
  return undefined;
};

const sotto = (percorso: string, chiave: string | number) =>
  typeof chiave === "number" ? `${percorso}[${chiave}]` : percorso === "" ? chiave : `${percorso}.${chiave}`;

const eOggetto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// ------------------------------------------------------------------------------------- lettori di base

const stringa: Lettore = (v, p, c) => (typeof v === "string" ? v : segnala(c, p, "wrong_type"));

const stringaNonVuota: Lettore = (v, p, c) => (typeof v !== "string" ? segnala(c, p, "wrong_type") : v === "" ? segnala(c, p, "invalid_value") : v);

const booleano: Lettore = (v, p, c) => (typeof v === "boolean" ? v : segnala(c, p, "wrong_type"));

/** Un intero; `-0` diventa `0`, perché il testo JSON lo scrive `0` e la riapertura deve dare lo stesso modello. */
const intero =
  (min = -Infinity, max = Infinity): Lettore =>
  (v, p, c) =>
    !Number.isInteger(v) ? segnala(c, p, "wrong_type") : (v as number) < min || (v as number) > max ? segnala(c, p, "invalid_value") : Object.is(v, -0) ? 0 : v;

const uno =
  (valori: readonly string[]): Lettore =>
  (v, p, c) =>
    typeof v !== "string" ? segnala(c, p, "wrong_type") : valori.includes(v) ? v : segnala(c, p, "invalid_value");

const elenco =
  (voce: Lettore, almenoUna = false): Lettore =>
  (v, p, c) => {
    if (!Array.isArray(v)) return segnala(c, p, "wrong_type");
    if (almenoUna && v.length === 0) return segnala(c, p, "invalid_value");
    return v.map((x, i) => voce(x, sotto(p, i), c));
  };

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

const campo = (leggi: Lettore) => ({ obbligatorio: true, leggi });
const facoltativo = (leggi: Lettore) => ({ obbligatorio: false, leggi });

/** Un campo che per questo genere di funzione o di blocco non deve esserci. */
const vietato = facoltativo((_v, p, c) => segnala(c, p, "field_not_allowed"));

const conOggetto =
  (campi: Campi): Lettore =>
  (v, p, c) =>
    oggetto(v, p, c, campi);

/** Un `id` di funzione o di blocco: non vuoto (un blocco vuoto vuol dire «il progetto») e unico nel progetto. */
const id: Lettore = (v, p, c) => {
  if (typeof v !== "string") return segnala(c, p, "wrong_type");
  if (v === "") return segnala(c, p, "invalid_value");
  if (c.id.has(v)) segnala(c, p, "duplicate_id");
  c.id.add(v);
  return v;
};

// ---------------------------------------------------------------------------------------- lo schema

const metadati = conOggetto({
  name: campo(stringaNonVuota),
  author: facoltativo(stringa),
  description: facoltativo(stringa),
  notes: facoltativo(stringa),
  // `false` vuol dire «non è una libreria», come l'assenza: si legge come assente e salvando non si scrive.
  library: facoltativo((v, p, c) => (booleano(v, p, c) === true ? true : undefined)),
});

/** Un solo carattere (un codice), mai quello di codice 0 né un surrogato isolato. */
const carattereDiRiempimento: Lettore = (v, p, c) => {
  if (typeof v !== "string") return segnala(c, p, "wrong_type");
  const codici = [...v].map((x) => x.codePointAt(0)!);
  return codici.length !== 1 || codici[0] === 0 || (codici[0]! >= 0xd800 && codici[0]! <= 0xdfff) ? segnala(c, p, "invalid_value") : v;
};

/** Le opzioni uguali al predefinito si tolgono, e con esse un oggetto rimasto vuoto: salvando, l'app le omette. */
const opzioni: Lettore = (v, p, c) => {
  const letto = oggetto(v, p, c, { fill_character: facoltativo(carattereDiRiempimento), real_decimals: facoltativo(intero(0, 15)) });
  if (letto === undefined) return undefined;
  const diverse = Object.entries(letto).filter(([k, x]) => x !== opzioniPredefinite[k as keyof typeof opzioniPredefinite]);
  return diverse.length === 0 ? undefined : Object.fromEntries(diverse);
};

const valoreIniziale: Lettore = (v, p, c) =>
  typeof v === "string" ? v : Array.isArray(v) ? elenco(stringa)(v, p, c) : eOggetto(v) ? oggetto(v, p, c, { each: campo(stringa) }) : segnala(c, p, "wrong_type");

const dato = conOggetto({
  name: campo(stringa),
  type: campo(uno(tipi)),
  size: facoltativo(intero()),
  constant: facoltativo(booleano),
  initial: facoltativo(valoreIniziale),
  role: facoltativo(uno(ruoli)),
  max_length: facoltativo(intero()),
  parameter: facoltativo(uno(modalita)),
});

/** Una sequenza di blocchi, un livello più in giù: oltre il tetto una sequenza che ha dei blocchi si segnala
 * (`too_deep`, una volta sola) e non si scende; vuota, non aggiunge livelli. */
const blocchi: Lettore = (v, p, c) => {
  if (c.livello >= livelliMassimi && Array.isArray(v) && v.length > 0) return segnala(c, p, "too_deep");
  c.livello++;
  try {
    return elenco(blocco)(v, p, c);
  } finally {
    c.livello--;
  }
};

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
  const propri = campiPropri[g as keyof typeof campiPropri];
  return oggetto(v, p, c, { id: campo(id), kind: campo((x) => x), breakpoint: facoltativo(booleano), ...propri });
}

function funzione(v: unknown, p: string, c: Contesto): unknown {
  if (!eOggetto(v)) return segnala(c, p, "wrong_type");
  const g = genere(v, p, c, generiDiFunzione);
  if (g === undefined) return undefined;
  if (g === "main") c.principali++;
  const conNome = g !== "main";
  const restituisce = g === "function";
  const fine = conOggetto({
    id: campo(id),
    return_value: restituisce ? campo(stringa) : vietato,
    breakpoint: facoltativo(booleano),
  });
  return oggetto(v, p, c, {
    id: campo(id),
    kind: campo((x) => x),
    name: conNome ? campo(stringa) : vietato,
    return_type: restituisce ? campo(uno(tipi)) : vietato,
    // Il vettore e la lunghezza massima della stringa restituiti, sullo stampo di un dato: i valori fuori dai limiti sono
    // errori del controllo statico.
    return_size: restituisce ? facoltativo(intero()) : vietato,
    return_max_length: restituisce ? facoltativo(intero()) : vietato,
    default_result: restituisce ? facoltativo(stringa) : vietato,
    data: campo(elenco(dato)),
    body: campo(blocchi),
    end: campo(fine),
    // I casi del programma principale stanno nella radice; quelli di una procedura o di una funzione qui.
    test_cases: conNome ? facoltativo(casiDUso(casoDiUnaFunzione)) : vietato,
  });
}

const segnalazione = (codici: readonly string[]) => conOggetto({ code: campo(uno(codici)), block: campo(stringa) });

function atteso(v: unknown, p: string, c: Contesto): unknown {
  const letto = oggetto(v, p, c, {
    output: campo(stringa),
    error: facoltativo(segnalazione(codiciErrore)),
    static_error: facoltativo(segnalazione(codiciErroreStatico)),
    warnings: facoltativo(elenco(segnalazione(codiciAvviso))),
  });
  if (letto === undefined) return undefined;
  if ("error" in letto && "static_error" in letto) segnala(c, p, "error_and_static_error");
  // Con un errore statico atteso l'output è vuoto: il progetto non parte, e niente è stato scritto.
  if ("static_error" in letto && typeof letto.output === "string" && letto.output !== "") segnala(c, sotto(p, "output"), "output_with_static_error");
  return letto;
}

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

/** I nomi dei casi d'uso sono unici fra i casi del progetto, e fra quelli di una funzione. */
const casiDUso = (caso: Lettore = casoDUso): Lettore => (v, p, c) => {
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
};

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
 * Punto di migrazione: qui una versione precedente dello schema si porterebbe all'ultima, prima di
 * leggerla. Oggi lo schema ha la sola versione 1, e una versione diversa è sconosciuta.
 */
function migra(v: Record<string, unknown>, c: Contesto): Record<string, unknown> | undefined {
  if (!Object.hasOwn(v, "schema_version")) return segnala(c, "schema_version", "missing_field");
  if (v.schema_version !== versioneSchema) return segnala(c, "schema_version", Number.isInteger(v.schema_version) ? "unknown_schema_version" : "wrong_type");
  return v;
}

// ------------------------------------------------------------------------------------------ ingressi

/** Valida un valore JSON già analizzato e ne fa un progetto. */
export function leggi(v: unknown): Esito {
  const c: Contesto = { errori: [], id: new Set(), principali: 0, livello: 0 };
  if (!eOggetto(v)) return { ok: false, errori: [{ percorso: "", motivo: "wrong_type" }] };
  const migrato = migra(v, c);
  if (migrato === undefined) return { ok: false, errori: c.errori };
  const progetto = oggetto(migrato, "", c, {
    format: campo(uno(["algodesign"])),
    schema_version: campo((x) => x),
    metadata: campo(metadati),
    options: facoltativo(opzioni),
    shared_constants: facoltativo(elenco(dato)),
    functions: campo(elenco(funzione)),
    test_cases: facoltativo(casiDUso()),
  });
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
