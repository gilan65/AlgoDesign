// L'andata e ritorno di «Accademico»: per ogni file del corpus che si scrive, il testo generato si legge col lettore del
// nucleo e si rigenera, nelle due lingue, e deve dare lo stesso testo byte per byte; il progetto letto passa il
// controllo statico, e i casi d'uso del file originale, eseguiti sul progetto letto, danno lo stesso output a meno degli a
// capo (che la sintassi non esprime) e lo stesso codice d'errore. «Accademico» ha un solo tipo: nei file che scrivono un
// booleano il progetto letto scrive 1 e 0, e il confronto legge `true` e `false` così (i file sono elencati qui).
// In più un programma scritto qui con le forme che il corpus che si scrive non ha (il ripeti, anche annidato, il `per
// ogni` su una funzione dentro un altro, la costante comune).
//
// Che cosa queste prove NON guardano:
// - i blocchi degli errori attesi (il progetto letto ha `id` suoi: si confronta il codice);
// - le opzioni del progetto (il tetto delle chiamate), che il testo non porta: il progetto letto le prende dall'originale;
// - i testi che il generatore non produce (quelli scritti a mano: le prove del lettore, `core/lettore/accademico.test.ts`);
// - le funzioni booleane, che il generatore scrive con un `if` che restituisce 1 o 0: lette, sono un `return` a metà.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../../core/controllo/controllo";
import { eseguiCaso } from "../../core/casi/esecutore";
import { accademico } from "../../core/genera/accademico";
import { testoDelCodice } from "../../core/genera/forma";
import type { LinguaDelCodice } from "../../core/genera/nomi";
import { leggiAccademico } from "../../core/lettore/accademico";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { conIlCodice } from "./attesi-di-accademico";

const lingue: readonly LinguaDelCodice[] = ["it", "en"];
const cartella = join(import.meta.dir, "..", "..", "casi");
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(cartella, `${percorso}.algo`), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

/** Gli errori statici di un progetto, che non deve essere fuori tappa. */
const erroriStatici = (p: Progetto) => {
  const c = controlla(p, tetti);
  if (c.fuoriTappa) throw new Error(`${p.metadata.name}: fuori tappa`);
  return c.errori;
};

/** I file del corpus che scrivono un booleano: lì l'output del progetto letto ha 1 e 0. */
const scrivonoUnBooleano = ["tappa-1/assegnazione-booleano", "tappa-1/scrittura-booleano"];

/** Il testo generato, letto e rigenerato: i due testi e il progetto letto. */
function andataERitorno(p: Progetto, lingua: LinguaDelCodice) {
  const g = accademico(p, tetti, lingua);
  if (!g.generato) throw new Error(`${p.metadata.name} non si scrive`);
  const generato = testoDelCodice(g.righe);
  const letto = leggiAccademico(generato, { lingua });
  if (!letto.ok) throw new Error(`${p.metadata.name} (${lingua}), riga ${letto.riga}: ${letto.motivo}`);
  const r = accademico(letto.progetto, tetti, lingua);
  if (!r.generato) throw new Error(`${p.metadata.name} (${lingua}) letto non si scrive: ${r.perche}`);
  return { generato, rigenerato: testoDelCodice(r.righe), letto };
}

function uguale(rigenerato: string, generato: string, chi: string) {
  if (rigenerato === generato) return;
  const a = generato.split("\n");
  const b = rigenerato.split("\n");
  const k = Math.max(0, a.findIndex((x, i) => x !== b[i]));
  throw new Error(`${chi}, riga ${k + 1}: generato «${a[k] ?? "(nessuna)"}», rigenerato «${b[k] ?? "(nessuna)"}»`);
}

describe("l'andata e ritorno sui file del corpus che si scrivono", () => {
  test("36 file nelle due lingue: generato, letto, rigenerato identico byte per byte, senza trasformazioni né errori statici", () => {
    let righe = 0;
    for (const f of conIlCodice)
      for (const l of lingue) {
        const { generato, rigenerato, letto } = andataERitorno(leggi(f), l);
        uguale(rigenerato, generato, `${f} (${l})`);
        expect(letto.trasformazioni, `${f} (${l})`).toEqual([]);
        expect(erroriStatici(letto.progetto), `${f} (${l})`).toEqual([]);
        righe += generato.split("\n").length - 1;
      }
    expect(conIlCodice.length).toBe(36);
    console.log(`andata e ritorno: ${conIlCodice.length} file × ${lingue.length} lingue, ${righe} righe identiche`);
  });

  test("i casi d'uso del file originale sul progetto letto: lo stesso output a meno degli a capo e lo stesso errore", () => {
    let casi = 0;
    let conIlBooleano = 0;
    const comeIntero = (t: string) => t.replace(/\btrue\b/g, "1").replace(/\bfalse\b/g, "0");
    for (const f of conIlCodice) {
      const p = leggi(f);
      const { letto } = andataERitorno(p, "it");
      // Le opzioni (il tetto delle chiamate) sono del progetto, non del testo: vengono dal file originale.
      const q: Progetto = { ...letto.progetto, ...(p.options !== undefined ? { options: p.options } : {}) };
      const casiDelFile = [
        ...(p.test_cases ?? []).map((caso) => ({ caso, funzione: undefined as string | undefined })),
        ...p.functions.flatMap((fn) => (fn.test_cases ?? []).map((caso) => ({ caso, funzione: q.functions.find((g) => g.name === fn.name)!.id }))),
      ];
      for (const { caso, funzione } of casiDelFile) {
        const esito = eseguiCaso(q, caso, tetti, funzione);
        if (esito.fuoriTappa) throw new Error(`${f}: fuori tappa`);
        const booleano = scrivonoUnBooleano.includes(f);
        const atteso = (booleano ? comeIntero(caso.expected.output) : caso.expected.output).replaceAll("\n", "");
        expect(esito.ottenuto.output.replaceAll("\n", ""), `${f}#${caso.name}`).toBe(atteso);
        expect(esito.ottenuto.error?.code, `${f}#${caso.name}`).toBe(caso.expected.error?.code);
        casi++;
        if (booleano) conIlBooleano++;
      }
    }
    // i denominatori: i 37 casi dei 36 file, e i 2 casi dei 2 file col booleano
    expect([casi, conIlBooleano]).toEqual([37, 2]);
    console.log(`casi sul progetto letto: ${casi}, di cui ${conIlBooleano} coi booleani letti come 1 e 0`);
  });
});

/** Il programma con le forme che il corpus che si scrive non ha. */
const forme: Progetto = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "forme del lettore" },
  shared_constants: [{ name: "LIMITE", type: "integer", constant: true, initial: "3" }],
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer", initial: "0" },
        { name: "k", type: "integer", initial: "0" },
        { name: "v", type: "integer", size: 2, initial: ["4", "-5"] },
        { name: "x", type: "integer" },
        { name: "y", type: "integer" },
      ],
      body: [
        {
          id: "b1",
          kind: "repeat",
          body: [
            { id: "b2", kind: "assignment", target: "n", value: "n + 1" },
            { id: "b3", kind: "repeat", body: [{ id: "b4", kind: "assignment", target: "k", value: "k + 1" }], condition: "k < n" },
          ],
          condition: "n < LIMITE",
        },
        {
          id: "b5",
          kind: "for_each",
          item: "x",
          source: "v",
          body: [{ id: "b6", kind: "for_each", item: "y", source: "doppi(v)", body: [{ id: "b7", kind: "write", values: ["x * y", "(x - y) mod 3"], newline: true }] }],
        },
        { id: "b8", kind: "write", values: ["n", "k"], newline: true },
      ],
      end: { id: "b9" },
    },
    {
      id: "f2",
      kind: "function",
      name: "doppi",
      return_type: "integer",
      return_size: 2,
      data: [
        { name: "w", type: "integer", size: 2, parameter: "value" },
        { name: "r", type: "integer", size: 2 },
        { name: "i", type: "integer" },
      ],
      body: [{ id: "b10", kind: "for", counter: "i", from: "0", to: "1", body: [{ id: "b11", kind: "assignment", target: "r[i]", value: "w[i] * 2" }] }],
      end: { id: "b12", return_value: "r" },
    },
  ],
  test_cases: [{ name: "forme", inputs: [], expected: { output: "" } }],
};

describe("le forme che il corpus che si scrive non ha", () => {
  for (const l of lingue)
    test(`il ripeti annidato, il «per ogni» su una funzione dentro un altro, la costante comune (${l})`, () => {
      const { generato, rigenerato, letto } = andataERitorno(forme, l);
      uguale(rigenerato, generato, `forme (${l})`);
      expect(generato).toContain(l === "it" ? "_ancora2" : "_again2");
      expect(generato).toContain(l === "it" ? "_sorgente" : "_source");
      expect(erroriStatici(letto.progetto)).toEqual([]);
      // lo stesso output dell'originale, eseguiti tutti e due
      const caso = forme.test_cases![0]!;
      const prima = eseguiCaso(forme, caso, tetti);
      const dopo = eseguiCaso(letto.progetto, caso, tetti);
      if (prima.fuoriTappa || dopo.fuoriTappa) throw new Error("fuori tappa");
      expect(dopo.ottenuto.output.replaceAll("\n", "")).toBe(prima.ottenuto.output.replaceAll("\n", ""));
      expect(prima.ottenuto.output.length).toBeGreaterThan(0);
    });
});
