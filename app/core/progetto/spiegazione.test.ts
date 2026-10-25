// La spiegazione del formato (`docs/FORMATO-FILE-ALGO.md`) e lo schema dicono gli stessi campi. Ogni oggetto dello
// schema (`tavoleDelloSchema`) ha nel documento un titolo col suo percorso fra apici inversi e una tabella con una riga
// per campo, nello stesso ordine: il nome, i tipi JSON, «sì» o «no» per l'obbligatorio, e, per un campo con un elenco
// di valori o un valore fisso, esattamente quei valori fra apici inversi. Nei due versi: un oggetto o un campo dello
// schema senza tabella o senza riga, e una tabella o una riga del documento che lo schema non ha, sono rossi.
// L'esempio del documento è un file che il lettore e lo schema accettano.
//
// Che cosa NON guarda: la prosa del documento (le regole a parole, le spiegazioni dei campi senza elenco di valori).

import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { leggi, schemaDelFormato } from "./formato";
import { tavoleDelloSchema, type Tavola } from "./tavole-dello-schema";

const testo = readFileSync(join(import.meta.dir, "..", "..", "..", "docs", "FORMATO-FILE-ALGO.md"), "utf8").replaceAll("\r\n", "\n");

/** I frammenti fra apici inversi di un testo. */
const frammenti = (x: string) => [...x.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);

interface TavolaScritta {
  readonly percorso: string;
  readonly righe: readonly { campo: string; tipi: string[]; obbligatorio: string; valori: string[] }[];
}

/** Le tabelle del documento, ognuna col primo frammento del titolo che la precede. */
function tavoleDelDocumento(md: string): TavolaScritta[] {
  const tavole: { percorso: string; righe: TavolaScritta["righe"][number][] }[] = [];
  let titolo: string | null = null;
  for (const riga of md.split("\n")) {
    if (/^#{2,4} /.test(riga)) titolo = frammenti(riga)[0] ?? null;
    else if (riga.startsWith("| `")) {
      const celle = riga.split("|").slice(1, -1).map((c) => c.trim());
      const voce = { campo: frammenti(celle[0]!)[0]!, tipi: frammenti(celle[1]!), obbligatorio: celle[2]!, valori: frammenti(celle[3] ?? "") };
      const ultima = tavole.at(-1);
      if (ultima !== undefined && ultima.percorso === titolo) ultima.righe.push(voce);
      else tavole.push({ percorso: titolo ?? "(nessun titolo)", righe: [voce] });
    }
  }
  return tavole;
}

/** Le differenze fra le tavole dello schema e quelle del documento, nei due versi. */
export function differenze(schema: readonly Tavola[], scritte: readonly TavolaScritta[]): string[] {
  const fuori: string[] = [];
  for (const t of scritte.filter((x) => !schema.some((s) => s.percorso === x.percorso))) fuori.push(`tabella senza oggetto nello schema: ${t.percorso}`);
  for (const s of schema) {
    const scritta = scritte.filter((x) => x.percorso === s.percorso);
    if (scritta.length !== 1) {
      fuori.push(`oggetto ${s.percorso}: ${scritta.length} tabelle nel documento`);
      continue;
    }
    const righe = scritta[0]!.righe;
    const nomi = (x: readonly { campo: string }[]) => x.map((c) => c.campo).join(", ");
    if (nomi(righe) !== nomi(s.campi)) fuori.push(`oggetto ${s.percorso}: campi [${nomi(s.campi)}] nello schema, [${nomi(righe)}] nel documento`);
    for (const c of s.campi) {
      const r = righe.find((x) => x.campo === c.campo);
      if (r === undefined) continue;
      if (r.tipi.join(",") !== c.tipi.join(",")) fuori.push(`${s.percorso}.${c.campo}: tipi ${c.tipi.join(",")} nello schema, ${r.tipi.join(",")} nel documento`);
      if (r.obbligatorio !== (c.obbligatorio ? "sì" : "no")) fuori.push(`${s.percorso}.${c.campo}: obbligatorio ${c.obbligatorio} nello schema, «${r.obbligatorio}» nel documento`);
      if (c.valori !== null && [...r.valori].sort().join(",") !== [...c.valori].sort().join(","))
        fuori.push(`${s.percorso}.${c.campo}: valori [${c.valori.join(", ")}] nello schema, [${r.valori.join(", ")}] nel documento`);
    }
  }
  return fuori;
}

const schema = tavoleDelloSchema(schemaDelFormato());

test("ogni oggetto e ogni campo dello schema ha la sua riga nella spiegazione, e viceversa", () => {
  const scritte = tavoleDelDocumento(testo);
  console.log(`spiegazione: ${schema.length} oggetti nello schema, ${scritte.length} tabelle nel documento, ${scritte.reduce((n, t) => n + t.righe.length, 0)} righe`);
  expect(differenze(schema, scritte)).toEqual([]);
});

test("il confronto vede una riga tolta, un tipo cambiato, un valore in più, una tabella di troppo e un obbligatorio scambiato", () => {
  const scritte = tavoleDelDocumento(testo);
  const conUnObbligatorioScambiato = scritte.map((t) => (t.percorso === "metadata" ? { ...t, righe: t.righe.map((r) => (r.campo === "name" ? { ...r, obbligatorio: r.obbligatorio === "sì" ? "no" : "sì" } : r)) } : t));
  expect(differenze(schema, conUnObbligatorioScambiato)).toEqual([expect.stringContaining("metadata.name: obbligatorio")]);
  const conUnaRigaInMeno = scritte.map((t) => (t.percorso === "metadata" ? { ...t, righe: t.righe.filter((r) => r.campo !== "notes") } : t));
  const conUnTipoCambiato = scritte.map((t) => (t.percorso === "options" ? { ...t, righe: t.righe.map((r) => (r.campo === "real_decimals" ? { ...r, tipi: ["string"] } : r)) } : t));
  const conUnValoreInPiu = scritte.map((t) => (t.percorso === "shared_constants[]" ? { ...t, righe: t.righe.map((r) => (r.campo === "role" ? { ...r, valori: [...r.valori, "work"] } : r)) } : t));
  const conUnaTabellaDiTroppo = [...scritte, { percorso: "functions[]{method}", righe: [] }];
  expect(differenze(schema, conUnaRigaInMeno).length).toBeGreaterThan(0);
  expect(differenze(schema, conUnTipoCambiato).length).toBeGreaterThan(0);
  expect(differenze(schema, conUnValoreInPiu).length).toBeGreaterThan(0);
  expect(differenze(schema, conUnaTabellaDiTroppo).length).toBeGreaterThan(0);
});

test("l'esempio della spiegazione è un file che il lettore e lo schema accettano", () => {
  const esempi = [...testo.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]!));
  const valida = new Ajv2020({ strict: true }).compile(schemaDelFormato());
  expect(esempi.length).toBe(1);
  expect(esempi.map((e) => [leggi(e).ok, valida(e)])).toEqual([[true, true]]);
});
