// La forma senza tipi del TypeScript, scritta a mano su tre programmi del corpus: una coi record e le tabelle, una con le
// funzioni e gli arresti, una con il confronto fra letterali che nel TypeScript allarga il tipo. Che ogni altro programma
// sia il TypeScript senza le annotazioni lo prova il differenziale, che lo confronta con `stripTypeScriptTypes` di Node.

import type { Atteso } from "./attesi-dello-pseudocodice";
import { testa, titoloDelSupporto } from "./attesi-del-typescript";

type Lingua = keyof Atteso;

const testo = (...righe: string[]) => `${righe.join("\n")}\n`;

const nomi = {
  it: { console: "prepara_console", scrivi: "scrivi", indice: "_indice", valore: "_valore", testoDi: "testo" },
  en: { console: "prepare_console", scrivi: "write", indice: "_index", valore: "_value", testoDi: "text" },
} as const;

const laConsole: Readonly<Record<Lingua, readonly string[]>> = {
  it: [
    "/** La console di Windows in UTF-8 in entrata e in uscita, come fa il C (Node la lascia nella code page del sistema). */",
    "function prepara_console() {",
    '  if (process.platform === "win32" && (process.stdin.isTTY || process.stdout.isTTY || process.stderr.isTTY)) execSync("chcp 65001", { stdio: "ignore" });',
    "}",
  ],
  en: [
    "/** The Windows console in UTF-8 for input and output, as C does (Node leaves it in the code page of the system). */",
    "function prepare_console() {",
    '  if (process.platform === "win32" && (process.stdin.isTTY || process.stdout.isTTY || process.stderr.isTTY)) execSync("chcp 65001", { stdio: "ignore" });',
    "}",
  ],
};

const laScrittura: Readonly<Record<Lingua, readonly string[]>> = {
  it: ["/** Scrive il testo sullo standard output. */", "function scrivi(testo) {", "  writeSync(1, testo);", "}"],
  en: ["/** Writes the text to the standard output. */", "function write(text) {", "  writeSync(1, text);", "}"],
};

const gliImport = ['import { execSync } from "node:child_process";', 'import { writeSync } from "node:fs";'];

const unaRigaPerCampo = (verso: string, da: string, rientro = "  ") => ["nome", "classe", "voto"].map((c) => `${rientro}${verso}.${c} = ${da}.${c};`);

/** I record e le tabelle: il campo senza il tipo, il costruttore senza i facoltativi, `this.nome = nome;`. */
const copiaDiUnaTabella = (l: Lingua) => {
  const { console: prepara, scrivi, indice: i } = nomi[l];
  return testo(
    "// copia-di-una-tabella",
    ...testa[l],
    ...gliImport,
    "",
    "",
    "class alunno {",
    "  nome;",
    "  classe;",
    "  voto;",
    "",
    "  constructor(nome, classe, voto) {",
    "    this.nome = nome;",
    "    this.classe = classe;",
    "    this.voto = voto;",
    "  }",
    "}",
    "",
    "",
    "function main() {",
    `  ${prepara}();`,
    '  let t = [new alunno("Anna", "3A", 7), new alunno("Bruno", "3B", 5)];',
    "  let u = Array.from({ length: 2 }, () => new alunno());",
    "  let r = new alunno();",
    `  let ${i};`,
    `  ${i} = 0;`,
    `  while (${i} < 2) {`,
    ...unaRigaPerCampo(`u[${i}]`, `t[${i}]`, "    "),
    `    ${i} = ${i} + 1;`,
    "  }",
    "  t[0].voto = 1;",
    `  ${scrivi}(\`\${u[0].voto} \${t[0].voto}\\n\`);`,
    ...unaRigaPerCampo("r", "t[1]"),
    "  t[1].voto = 2;",
    `  ${scrivi}(\`\${r.voto} \${t[1].voto}\\n\`);`,
    ...unaRigaPerCampo("u[1]", "r"),
    "  r.voto = 3;",
    `  ${scrivi}(\`\${u[1].voto} \${r.voto}\\n\`);`,
    ...unaRigaPerCampo("u[0]", "u[1]"),
    '  u[1].nome = "Zeno";',
    `  ${scrivi}(\`\${u[0].nome} \${u[1].nome}\\n\`);`,
    "}",
    "",
    "",
    titoloDelSupporto[l],
    "",
    "",
    ...laConsole[l],
    "",
    "",
    ...laScrittura[l],
    "",
    "",
    "main();",
  );
};

const arresti: Readonly<Record<Lingua, readonly string[]>> = {
  it: [
    "/** Scrive il motivo e la riga del programma che lo ha incontrato, poi si ferma. */",
    "function fermati(motivo) {",
    '  let riga = "?";',
    '  for (const chiamata of (new Error().stack ?? "").split("\\n")) {',
    "    const trovata = /^\\s*(?:at (?:main|saluto) \\((?!native:)|(?:main|saluto)@).*:(\\d+):\\d+\\)?$/.exec(chiamata);",
    "    if (trovata !== null) {",
    "      riga = trovata[1];",
    "      break;",
    "    }",
    "  }",
    "  writeSync(2, `Errore alla riga ${riga}: ${motivo}\\n`);",
    "  process.exit(1);",
    "}",
    "",
    "",
    "/** Il carattere in posizione i della stringa, da 0; si ferma se la posizione è fuori. */",
    "function carattere_di(s, i) {",
    "  const c = Array.from(s);",
    '  if (!(0 <= i && i < c.length)) fermati("indice fuori dalla stringa");',
    "  return c[i];",
    "}",
    "",
    "",
    "/** Quanti caratteri ha la stringa (length di JavaScript conta le unità UTF-16). */",
    "function lunghezza(s) {",
    "  return Array.from(s).length;",
    "}",
    "",
    "",
    "/** La stringa, se non ha più di n caratteri; altrimenti si ferma. */",
    "function al_piu(s, n) {",
    '  if (lunghezza(s) > n) fermati("stringa troppo lunga");',
    "  return s;",
    "}",
  ],
  en: [
    "/** Writes the reason and the line of the program that met it, then stops. */",
    "function halt(reason) {",
    '  let line = "?";',
    '  for (const call of (new Error().stack ?? "").split("\\n")) {',
    "    const found = /^\\s*(?:at (?:main|saluto) \\((?!native:)|(?:main|saluto)@).*:(\\d+):\\d+\\)?$/.exec(call);",
    "    if (found !== null) {",
    "      line = found[1];",
    "      break;",
    "    }",
    "  }",
    "  writeSync(2, `Error at line ${line}: ${reason}\\n`);",
    "  process.exit(1);",
    "}",
    "",
    "",
    "/** The character at position i of the string, from 0; stops if the position is outside. */",
    "function character_at(s, i) {",
    "  const c = Array.from(s);",
    '  if (!(0 <= i && i < c.length)) halt("index outside the string");',
    "  return c[i];",
    "}",
    "",
    "",
    "/** How many characters the string has (the length of JavaScript counts UTF-16 units). */",
    "function length(s) {",
    "  return Array.from(s).length;",
    "}",
    "",
    "",
    "/** The string, if it has at most n characters; otherwise stops. */",
    "function at_most(s, n) {",
    '  if (length(s) > n) halt("string too long");',
    "  return s;",
    "}",
  ],
};

/** Una funzione e gli arresti: il dato senza valore senza il `!`, il nome del generatore senza il tipo, la firma senza `: never`. */
const risultatoStringa = (l: Lingua) => {
  const { console: prepara, scrivi, valore } = nomi[l];
  const [carattere, alPiu] = l === "it" ? ["carattere_di", "al_piu"] : ["character_at", "at_most"];
  return testo(
    "// risultato-stringa",
    ...testa[l],
    ...gliImport,
    "",
    "",
    "function main() {",
    `  ${prepara}();`,
    "  let s;",
    '  s = saluto("Anna");',
    `  ${scrivi}(\`\${s} \`);`,
    `  ${scrivi}(\`\${${carattere}(saluto("Bo"), 5)}\\n\`);`,
    "}",
    "",
    "",
    "function saluto(nome) {",
    `  let ${valore};`,
    `  ${valore} = ${alPiu}("Ciao " + nome, 20);`,
    `  return ${valore};`,
    "}",
    "",
    "",
    titoloDelSupporto[l],
    "",
    "",
    ...laConsole[l],
    "",
    "",
    ...arresti[l],
    "",
    "",
    ...laScrittura[l],
    "",
    "",
    "main();",
  );
};

const ilBooleano: Readonly<Record<Lingua, readonly string[]>> = {
  it: ["/** Un booleano come lo scrive il flowchart: true o false. */", "function booleano(b) {", '  return b ? "true" : "false";', "}"],
  en: ["/** A boolean as the flowchart writes it: true or false. */", "function boolean(b) {", '  return b ? "true" : "false";', "}"],
};

/** Il confronto fra due letterali: l'`as` del TypeScript se ne va, le sue parentesi restano. */
const assegnazioneBooleano = (l: Lingua) => {
  const { console: prepara, scrivi } = nomi[l];
  return testo(
    "// assegnazione-booleano",
    ...testa[l],
    ...gliImport,
    "",
    "",
    "function main() {",
    `  ${prepara}();`,
    "  let p;",
    "  p = 3 < 5 && !((2) === 3);",
    `  ${scrivi}(\`\${${l === "it" ? "booleano" : "boolean"}(p)}\\n\`);`,
    "}",
    "",
    "",
    titoloDelSupporto[l],
    "",
    "",
    ...laConsole[l],
    "",
    "",
    ...ilBooleano[l],
    "",
    "",
    ...laScrittura[l],
    "",
    "",
    "main();",
  );
};

const inDueLingue = (f: (l: Lingua) => string): Atteso => ({ it: f("it"), en: f("en") });

export const delCorpus: Readonly<Record<string, Atteso>> = {
  "tipi/copia-di-una-tabella": inDueLingue(copiaDiUnaTabella),
  "tappa-3/risultato-stringa": inDueLingue(risultatoStringa),
  "tappa-1/assegnazione-booleano": inDueLingue(assegnazioneBooleano),
};
