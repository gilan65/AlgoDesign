// Il confronto della forma senza tipi: uguale a meno degli spazi lasciati dalle annotazioni, e nient'altro; i controlli
// positivi sono le alterazioni che il confronto deve vedere. Lo strip qui è scritto a mano, con la forma che Node gli dà
// (spazi al posto delle annotazioni, misurato); quello vero corre nel differenziale.
import { describe, expect, test } from "bun:test";
import { differenzaDalTypeScript, differenzaDellaProvenienza } from "./senza-tipi";

const ts = [
  "// il nome: number",
  "let x!: number;",
  'const s: string = "a b: number";  // nota',
  "scrivi(`${booleano((p as boolean) === true)} a b\\n`);",
  "function f(a: number): void {",
  "}",
  "",
].join("\n");
const tolto = [
  "// il nome: number",
  "let x         ;",
  'const s         = "a b: number";  // nota',
  "scrivi(`${booleano((p           ) === true)} a b\\n`);",
  "function f(a        )       {",
  "}",
  "",
].join("\n");
const js = [
  "// il nome: number",
  "let x;",
  'const s = "a b: number";    // nota',
  "scrivi(`${booleano((p) === true)} a b\\n`);",
  "function f(a) {",
  "}",
  "",
].join("\n");

describe("il JavaScript contro il TypeScript senza le annotazioni", () => {
  test("uguali a meno degli spazi delle annotazioni e di quelli prima del commento", () => {
    expect(differenzaDalTypeScript(ts, tolto, js)).toBeUndefined();
  });

  test("un'annotazione lasciata nel JavaScript si vede", () => {
    expect(differenzaDalTypeScript(ts, tolto, js.replace("let x;", "let x: number;"))).toContain("riga 2");
    expect(differenzaDalTypeScript(ts, tolto, js.replace("(p)", "(p as boolean)"))).toContain("riga 4");
  });

  test("uno spazio tolto o aggiunto dentro una stringa o un testo composto si vede", () => {
    expect(differenzaDalTypeScript(ts, tolto, js.replace('"a b: number"', '"ab: number"'))).toContain("riga 3");
    expect(differenzaDalTypeScript(ts, tolto, js.replace("} a b", "} ab"))).toContain("riga 4");
    expect(differenzaDalTypeScript(ts, tolto, js.replace('"a b: number"', '"a  b: number"'))).toContain("riga 3");
  });

  test("gli spazi in più dove nessuna annotazione c'era si vedono, anche prima di un // dentro una stringa", () => {
    expect(differenzaDalTypeScript(ts, tolto, js.replace("function f", "function  f"))).toContain("riga 5");
    const conUrl = 'const u = "a  // b";\n';
    expect(differenzaDalTypeScript(conUrl, conUrl, 'const u = "a // b";\n')).toContain("riga 1");
  });

  test("il testo che continua dopo la riga, e la riga in più, si vedono", () => {
    expect(differenzaDalTypeScript(ts, tolto, js.replace("let x;", "let x; y"))).toContain("riga 2");
    expect(differenzaDalTypeScript(ts, tolto, `${js}// una riga in più\n`)).toContain("righe");
  });

  test("uno strip che cambiasse la lunghezza non si assolve", () => {
    expect(differenzaDalTypeScript(ts, tolto.replace("let x         ;", "let x;"), js)).toContain("lunghezza");
  });
});

describe("la provenienza", () => {
  const righe = [{ testo: "let x!: number;", dato: "x" }, { testo: "x = 1;", blocco: "b1" }, { testo: "}" }];
  const senza = [{ testo: "let x;", dato: "x" }, { testo: "x = 1;", blocco: "b1" }, { testo: "}" }];

  test("uguale a meno del testo", () => {
    expect(differenzaDellaProvenienza(righe, senza)).toBeUndefined();
  });

  test("una riga in più, o un blocco diverso, si vedono", () => {
    expect(differenzaDellaProvenienza(righe, [...senza, { testo: "" }])).toContain("righe");
    expect(differenzaDellaProvenienza(righe, senza.map((r) => (r.blocco === undefined ? r : { ...r, blocco: "b2" })))).toContain("riga 2");
  });
});
