// Le tavole dello schema del formato: ogni oggetto che lo schema descrive, col percorso dove lo si incontra la prima
// volta e i suoi campi (tipo JSON, obbligatorio, valori ammessi). È ciò che la spiegazione del formato
// (`docs/FORMATO-FILE-ALGO.md`) mostra in una tabella per oggetto; `spiegazione.test.ts` le appaia nei due versi.
//
// I percorsi: `progetto` per la radice, il nome del campo per i suoi figli, `.campo` per un campo di un oggetto, `[]`
// per gli elementi di un elenco, `{genere}` per il ramo di un genere (`kind`), `{each}` per la forma «per ogni elemento»
// del valore iniziale, `blocco` per un blocco (che si incontra in ogni sequenza). Un oggetto già incontrato altrove (un
// dato, un atteso, un caso d'uso di una funzione) ha la sola tavola del primo posto.

import type { Schema } from "./formato";

export interface CampoDellaTavola {
  readonly campo: string;
  /** I tipi JSON del campo (`string`, `integer`, `boolean`, `array`, `object`), in ordine. */
  readonly tipi: readonly string[];
  readonly obbligatorio: boolean;
  /** I valori ammessi, se il campo ne ha un elenco o un valore fisso. */
  readonly valori: readonly string[] | null;
}

export interface Tavola {
  readonly percorso: string;
  readonly campi: readonly CampoDellaTavola[];
}

type Nodo = Record<string, unknown>;

const tipoDiUnValore = (x: unknown) => (typeof x === "number" ? "integer" : typeof x === "string" ? "string" : typeof x);

/** I tipi JSON di un nodo dello schema. */
function tipiDi(n: Nodo): string[] {
  if (typeof n.type === "string") return [n.type];
  if ("const" in n) return [tipoDiUnValore(n.const)];
  if (typeof n.$ref === "string") return ["object"];
  if (Array.isArray(n.anyOf)) return (n.anyOf as Nodo[]).flatMap(tipiDi);
  return [];
}

const valoriDi = (n: Nodo): string[] | null => (Array.isArray(n.enum) ? (n.enum as unknown[]).map(String) : "const" in n ? [String(n.const)] : null);

export function tavoleDelloSchema(schema: Schema): Tavola[] {
  const tavole: Tavola[] = [];
  const visti = new Set<unknown>();
  const definizioni = (schema.$defs ?? {}) as Record<string, Nodo>;

  const visita = (n: Nodo, percorso: string): void => {
    if (visti.has(n)) return;
    visti.add(n);
    if (typeof n.$ref === "string") {
      const nome = n.$ref.replace("#/$defs/", "");
      visita(definizioni[nome]!, nome === "block" ? "blocco" : nome);
      return;
    }
    // Un elenco con più forme (il valore iniziale: letterali o righe) le ha nei rami, ognuno coi suoi `items`.
    if (n.type === "array" && n.items === undefined) return ((n.anyOf ?? []) as Nodo[]).forEach((x) => visita(x.items as Nodo, `${percorso}[]`));
    if (n.type === "array") return visita(n.items as Nodo, `${percorso}[]`);
    if (Array.isArray(n.anyOf)) return (n.anyOf as Nodo[]).forEach((x) => (x.type === "object" ? visita(x, `${percorso}{each}`) : visita(x, percorso)));
    if (Array.isArray(n.allOf)) {
      for (const ramo of n.allOf as Nodo[]) {
        const genere = (((ramo.if as Nodo).properties as Nodo).kind as Nodo).const as string;
        visita(ramo.then as Nodo, `${percorso}{${genere}}`);
      }
      return;
    }
    if (n.type !== "object" || n.properties === undefined) return;
    const proprieta = n.properties as Record<string, Nodo>;
    const obbligatori = (n.required ?? []) as string[];
    tavole.push({
      percorso,
      campi: Object.entries(proprieta).map(([campo, x]) => ({ campo, tipi: tipiDi(x), obbligatorio: obbligatori.includes(campo), valori: valoriDi(x) })),
    });
    for (const [campo, x] of Object.entries(proprieta)) visita(x, percorso === "progetto" ? campo : `${percorso}.${campo}`);
  };

  visita(schema as Nodo, "progetto");
  return tavole;
}
