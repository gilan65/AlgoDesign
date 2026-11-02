// La registrazione sul corpus: ogni programma di `casi/`, in ogni modo di fermarsi, composto, scritto, riaperto e riprodotto dà
// «uguale», e il denominatore è confermato. Il controllo positivo usa le letture e gli esiti del corpus stesso: alterati nel file
// danno «diverso». Il file ha solo i campi dell'elenco chiuso, appaiato con lo schema per elementi nei due versi, e nessun percorso né
// il nome del profilo; ogni file è valido anche per un validatore indipendente, che legge lo schema composto dal lettore.
//
// Che cosa NON guarda: un altro computer, che è `strumenti/registrazioni-del-corpus.ts` (scrive su uno, riproduce sull'altro); il
// rilevatore dei percorsi su un `preferenze.json` scritto dal guscio, misurato con lo stesso strumento (`--rileva`).

import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { confermato } from "../../strumenti/corpus";
import { alterata, avanzamentiDelleFermate, esecuzioniDi, liberaDi, percorsiEProfilo, registrazioneDi, tuttoIlPercorso, vociDelCorpus } from "../../strumenti/registrazioni-del-corpus";
import { leggiRegistrazione, schemaDellaRegistrazione, testoDellaRegistrazione, type Registrazione } from "./formato";
import { riproduci } from "./riproduzione";

const cartelleDelCorpus = readdirSync(join(import.meta.dir, "..", "..", "casi"), { withFileTypes: true }).filter((d) => d.isDirectory()).length;

/** Le esecuzioni del corpus composte una volta sola: le prove guardano le stesse. */
let composte: { readonly id: string; readonly modo: string; readonly registrazione: Registrazione }[] | undefined;
const delCorpus = () => (composte ??= vociDelCorpus().flatMap((v) => esecuzioniDi(v).map((e) => ({ id: e.id, modo: e.modo, registrazione: registrazioneDi(e.es) }))));

test("ogni programma del corpus, in ogni modo di fermarsi, composto, scritto, riaperto e riprodotto dà «uguale»", () => {
  const diverse: string[] = [];
  const perModo: Record<string, number> = {};
  const perEsito: Record<string, number> = {};
  const tutte = delCorpus();
  for (const e of tutte) {
    perModo[e.modo] = (perModo[e.modo] ?? 0) + 1;
    const k = e.registrazione.executions[0]!.outcome.kind;
    perEsito[k] = (perEsito[k] ?? 0) + 1;
    const esito = tuttoIlPercorso(e.registrazione);
    if (!esito.uguale) diverse.push(`${e.id}: ${JSON.stringify(esito.differenze)}`);
  }
  const conti = { cartelle: cartelleDelCorpus, voci: vociDelCorpus().length, esecuzioni: tutte.length, perModo, perEsito };
  console.log(`corpus: ${JSON.stringify(conti)}; diverse ${diverse.length}`);
  expect(diverse).toEqual([]);
  expect(conti).toEqual(confermato("registrazione - esecuzioni del corpus riprodotte", conti));
  // Tutti i modi e gli esiti che il corpus sa dare: uno che manca è un rilevatore cieco.
  expect(["libera", "caso", "pausa", "in corso"].filter((m) => !perModo[m])).toEqual([]);
  expect(["finished", "not_started", "paused", "asking", "running"].filter((k) => !perEsito[k])).toEqual([]);
}, 300_000);

test("le righe lunghe sono quelle del file: con un modo non predefinito il corpus resta «uguale»", () => {
  const diverse: string[] = [];
  let totale = 0;
  for (const v of vociDelCorpus()) {
    totale++;
    const esito = tuttoIlPercorso(registrazioneDi(liberaDi(v, { caratteri: 7, modo: "la-fine" })));
    if (!esito.uguale) diverse.push(`${v.id}: ${JSON.stringify(esito.differenze)}`);
  }
  expect(diverse).toEqual([]);
  expect(totale).toBe(confermato("registrazione - esecuzioni con le righe lunghe del file", totale));
}, 300_000);

test("il controllo positivo sul corpus: una lettura e un esito alterati nel file danno «diverso»", () => {
  const conti = { conLetture: 0, lettureRilevate: 0, finite: 0, esitiRilevati: 0 };
  const sfuggite: string[] = [];
  for (const e of delCorpus()) {
    const x = e.registrazione.executions[0]!;
    if (e.modo !== "libera" || x.advances > avanzamentiDelleFermate) continue;
    const prima = x.reads?.find((v) => v.text !== undefined && v.rejected !== true);
    if (prima !== undefined) {
      conti.conLetture++;
      const r = alterata(e.registrazione, (y) => (y.reads = x.reads!.map((v) => (v === prima ? { ...v, text: `${v.text}9` } : v))));
      if (riproduci(r).uguale) sfuggite.push(`lettura: ${e.id}`);
      else conti.lettureRilevate++;
    }
    if (x.outcome.kind === "finished" && x.outcome.error === undefined) {
      conti.finite++;
      if (riproduci(alterata(e.registrazione, (y) => (y.outcome = { kind: "finished", error: { code: "division_by_zero", block: "b1" } }))).uguale) sfuggite.push(`esito: ${e.id}`);
      else conti.esitiRilevati++;
    }
  }
  console.log(`corpus, controllo positivo: ${JSON.stringify(conti)}; sfuggite ${sfuggite.length}`);
  expect(sfuggite).toEqual([]);
  expect(Boolean(conti.lettureRilevate && conti.esitiRilevati)).toBe(true);
  expect(conti).toEqual(confermato("registrazione - sonde alterate del corpus", conti));
}, 300_000);

/** I campi dell'elenco chiuso, fuori dal progetto e dai casi (che hanno il loro lettore). */
const elencoChiuso = ["format", "schema_version", "product_version", "language", "system", "limits", "long_lines", "app_errors", "executions"];
const campiDiUnEsecuzione = ["project", "function", "test_case", "reads", "console", "console_removed", "advances", "outcome"];
const campiDeiLimiti = ["vector_elements", "string_length", "string_vector_characters"];
const campiDelleRigheLunghe = ["characters", "mode"];

/** I percorsi di un valore JSON, con gli indici tolti, fino al progetto e al caso escluso il loro contenuto. */
function percorsi(v: unknown, p = ""): string[] {
  if (Array.isArray(v)) return v.flatMap((x) => percorsi(x, `${p}[]`));
  if (typeof v !== "object" || v === null) return [p];
  return Object.entries(v).flatMap(([k, x]) => (k === "project" || k === "test_case" ? [`${p}.${k}`] : percorsi(x, `${p}.${k}`)));
}

test("il file ha solo i campi dell'elenco chiuso, appaiato con lo schema nei due versi; nessun percorso né il profilo", () => {
  const schema = schemaDellaRegistrazione() as { properties: Record<string, { items?: { properties?: Record<string, unknown> }; properties?: Record<string, unknown> }> };
  const nomi = (o: Record<string, unknown> | undefined) => Object.keys(o ?? {}).sort();
  expect(nomi(schema.properties)).toEqual([...elencoChiuso].sort());
  expect(nomi(schema.properties.executions!.items!.properties)).toEqual([...campiDiUnEsecuzione].sort());
  expect(nomi(schema.properties.limits!.properties)).toEqual([...campiDeiLimiti].sort());
  expect(nomi(schema.properties.long_lines!.properties)).toEqual([...campiDelleRigheLunghe].sort());

  const visti = new Set<string>();
  const trovati: string[] = [];
  let file = 0;
  for (const e of delCorpus()) {
    file++;
    const testo = testoDellaRegistrazione(e.registrazione);
    for (const x of percorsi(JSON.parse(testo))) visti.add(x);
    for (const o of percorsiEProfilo(testo)) trovati.push(`${e.id}: ${o}`);
  }
  // Nei due versi: ogni campo dell'elenco si vede nei file, e nei file nessun campo fuori dall'elenco. Gli errori dell'app sono
  // vuoti finché non li raccoglie nessuno; il caso e la funzione ci sono solo nei loro modi.
  const radici = new Set([...visti].map((x) => x.slice(1).split(/[.[]/)[0]!));
  const delleEsecuzioni = new Set([...visti].filter((x) => x.startsWith(".executions[].")).map((x) => x.slice(".executions[].".length).split(/[.[]/)[0]!));
  const fuori = [...[...radici].filter((c) => !elencoChiuso.includes(c)), ...[...delleEsecuzioni].filter((c) => !campiDiUnEsecuzione.includes(c))];
  const maiVisti = [...elencoChiuso.filter((c) => !radici.has(c)), ...campiDiUnEsecuzione.filter((c) => !delleEsecuzioni.has(c))];
  console.log(`campi: file ${file}, percorsi distinti ${visti.size}, fuori elenco ${fuori.length}, mai visti ${JSON.stringify(maiVisti)}, percorsi o profilo ${trovati.length}`);
  expect(fuori).toEqual([]);
  expect(maiVisti).toEqual(["app_errors"]);
  expect(trovati).toEqual([]);
  expect(file).toBe(confermato("registrazione - file guardati dal rilevatore dei percorsi", file));
}, 300_000);

test("ogni file composto dal corpus è valido per il lettore e per lo schema", () => {
  const valida = new Ajv2020({ strict: true, allErrors: true }).compile(schemaDellaRegistrazione());
  const rifiutati: string[] = [];
  let file = 0;
  for (const e of delCorpus()) {
    file++;
    const j = JSON.parse(testoDellaRegistrazione(e.registrazione));
    if (!leggiRegistrazione(j).ok || !valida(j)) rifiutati.push(e.id);
  }
  expect(rifiutati).toEqual([]);
  expect(file).toBe(confermato("registrazione - file validi per il lettore e per lo schema", file));
}, 300_000);
