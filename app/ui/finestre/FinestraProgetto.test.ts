// Le regole della finestra Proprietà sono quelle del lettore del file: sui valori ai confini, la bozza accetta un valore
// se e solo se il lettore lo accetta, campo per campo (nome, cifre decimali, carattere di riempimento, pila delle chiamate). Una regola stretta
// o allargata da una parte sola farebbe rifiutare dal lettore un progetto che la finestra ha confermato, o il contrario.
import { expect, test } from "bun:test";
import { apri } from "../../core/progetto/formato";
import { erroriDellaBozza } from "./FinestraProgetto";

/** Il lettore su un progetto minimo col campo cambiato: vero se si apre. */
function legge(campo: "nome" | "decimali" | "riempimento" | "pila", valore: string | number): boolean {
  const progetto = {
    format: "algodesign",
    schema_version: 1,
    metadata: { name: campo === "nome" ? valore : "x" },
    ...(campo === "nome" ? {} : { options: campo === "decimali" ? { real_decimals: valore } : campo === "pila" ? { call_stack_limit: valore } : { fill_character: valore } }),
    functions: [{ id: "f1", kind: "main", data: [], body: [], end: { id: "e" } }],
  };
  return apri(JSON.stringify(progetto)).ok;
}

const bozza = { nome: "x", autore: "", descrizione: "", note: "", decimali: "2", riempimento: "*", pila: "500" };
const c = String.fromCharCode;
const casi = {
  nome: ["", " ", "a", "Media dei voti"],
  decimali: [-1, 0, 1, 15, 16, 99, 1.5],
  riempimento: ["", "*", "ab", c(0), c(1), c(0xd800), c(0xdbff), c(0xdc00), c(0xdfff), String.fromCodePoint(0x1f600), "e" + c(0x301), " "],
  pila: [0, 4, 5, 6, 10, 499, 500, 501, 1000, 10.5, -5],
} as const;

/** Le differenze fra la regola data e il lettore, sui valori ai confini. */
function differenze(regola: typeof erroriDellaBozza): string[] {
  const fuori: string[] = [];
  for (const [campo, valori] of Object.entries(casi) as [keyof typeof casi, readonly (string | number)[]][]) {
    for (const v of valori) {
      const finestra = regola({ ...bozza, [campo]: String(v) })[campo] === undefined;
      const lettore = legge(campo, v);
      if (finestra !== lettore) fuori.push(`${campo} ${JSON.stringify(v)}: la finestra ${finestra ? "accetta" : "rifiuta"}, il lettore ${lettore ? "accetta" : "rifiuta"}`);
    }
  }
  return fuori;
}

test("la finestra Proprietà accetta un valore se e solo se il lettore del file lo accetta, ai confini", () => {
  const n = Object.values(casi).reduce((s, v) => s + v.length, 0);
  console.log(`valori ai confini: ${n} (nome ${casi.nome.length}, decimali ${casi.decimali.length}, riempimento ${casi.riempimento.length}, pila ${casi.pila.length})`);
  expect(differenze(erroriDellaBozza)).toEqual([]);
  // La premessa: ogni campo ha valori accettati e rifiutati.
  for (const [campo, valori] of Object.entries(casi) as [keyof typeof casi, readonly (string | number)[]][]) {
    const accettati = valori.filter((v) => legge(campo, v)).length;
    expect({ campo, accettati: accettati > 0, rifiutati: accettati < valori.length }).toEqual({ campo, accettati: true, rifiutati: true });
  }
  // Controllo positivo: le cifre decimali fino a 16 nella finestra, e un surrogato basso ammesso, si vedono.
  const fino16: typeof erroriDellaBozza = (b) => erroriDellaBozza({ ...b, decimali: b.decimali === "16" ? "15" : b.decimali });
  expect(differenze(fino16)).toEqual(['decimali 16: la finestra accetta, il lettore rifiuta']);
  const surrogatoBasso: typeof erroriDellaBozza = (b) => erroriDellaBozza({ ...b, riempimento: b.riempimento === c(0xdc00) ? "*" : b.riempimento });
  expect(differenze(surrogatoBasso)).toEqual([`riempimento ${JSON.stringify(c(0xdc00))}: la finestra accetta, il lettore rifiuta`]);
  const pilaDa4: typeof erroriDellaBozza = (b) => erroriDellaBozza({ ...b, pila: b.pila === "4" ? "5" : b.pila });
  expect(differenze(pilaDa4)).toEqual(["pila 4: la finestra accetta, il lettore rifiuta"]);
});
