// Progetti di prova dei casi d'uso, costruiti da un file del corpus che chi chiama apre: le prove del nucleo e
// dell'interfaccia li condividono.

import type { Progetto } from "../progetto/modello";

/** Da `lettura-attraverso-riferimento` del corpus: la lettura di `leggi` in un suo dato di lavoro (`riga`, poi copiato
 * nel parametro di uscita), con la voce del caso del programma che nomina `riga`, e un caso di `chiedi`, la procedura di
 * mezzo, con la stessa voce. Il corpus non ha letture in un dato di lavoro di una procedura chiamata. */
export function conUnaLetturaNelDatoDiLavoro(p: Progetto): Progetto {
  return {
    ...p,
    functions: p.functions.map((f) => {
      if (f.name === "leggi")
        return {
          ...f,
          data: [...f.data, { name: "riga", type: "integer" as const }],
          body: [
            { id: "b6", kind: "read" as const, target: "riga" },
            { id: "b8", kind: "assignment" as const, target: "valore", value: "riga" },
          ],
        };
      if (f.name === "chiedi") return { ...f, test_cases: [{ name: "ventuno", inputs: [{ data: "riga", text: "21" }], expected: { output: "\nnumero = 21\n" } }] };
      return f;
    }),
    test_cases: [{ ...p.test_cases![0]!, inputs: [{ data: "riga", text: "21" }] }],
  };
}
