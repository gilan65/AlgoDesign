// Il rilevatore dei selettori per sottostringa (`selettori.ts`): ogni specie che deve contare, ognuna che non deve, e le
// chiamate scritte dentro stringhe, commenti ed espressioni regolari, che non sono chiamate.
import { expect, test } from "bun:test";
import { chiamate, senzaExact } from "./selettori";

const trovate = (testo: string) => senzaExact(chiamate(testo, "sonda.ts")).map((c) => `${c.metodo}:${c.riga}`);

test("contano il nome stringa senza `exact` di getByRole e il testo stringa senza `exact` degli altri metodi", () => {
  const sonda = [
    `page.getByRole("button", { name: it.salva });`,
    "page.getByRole(\"table\", { name: `${it.dati}: voti` });",
    `page.getByText(it.premessa);`,
    `page.getByLabel("Nome");`,
    `page.getByTitle(x).click(); page.getByPlaceholder("cerca"); page.getByAltText('logo');`,
    `page\n  .getByRole("menuitem", {\n    name: it.elimina,\n  });`,
  ].join("\n");
  expect(trovate(sonda)).toEqual(["getByRole:1", "getByRole:2", "getByText:3", "getByLabel:4", "getByTitle:5", "getByPlaceholder:5", "getByAltText:5", "getByRole:7"]);
});

test("non contano `exact`, i nomi regex, getByRole senza nome, né le chiamate dentro stringhe, commenti e regex", () => {
  const sonda = [
    `page.getByRole("button", { name: it.salva, exact: true });`,
    `page.getByRole("button", { name: /^Salva/ });`,
    "page.getByRole(\"menuitem\", { name: new RegExp(`^${it.elimina}`) });",
    `page.getByRole("dialog");`,
    `page.getByRole("radio", { checked: true });`,
    `page.getByText(/Premessa/i); page.getByText(it.premessa, { exact: true });`,
    `const s = 'page.getByRole("x", { name: a })';`,
    `// page.getByRole("x", { name: a })`,
    `/* page.getByText(a) */ const r = /getByText\\(a\\)/;`,
    "const t = `page.getByText(a)`;",
    `const q = x.filter((y) => /"/.test(y)); page.getByRole("tab", { name: n, exact: true });`,
    `function f() { return /'/.test(z); }`,
  ].join("\n");
  expect(trovate(sonda)).toEqual([]);
  // Controllo positivo dello stesso testo: le chiamate di codice ci sono tutte (otto), quelle nelle stringhe no.
  expect(chiamate(sonda, "sonda.ts").length).toBe(8);
});

test("contano `exact: false` e il nome abbreviato `{ name }`, che cercano per sottostringa", () => {
  const sonda = [`page.getByRole("button", { name: it.salva, exact: false });`, `page.getByText(it.premessa, { exact: false });`, `page.getByRole("tab", { name });`].join("\n");
  expect(trovate(sonda)).toEqual(["getByRole:1", "getByText:2", "getByRole:3"]);
});

test("un modello annidato con un apice, una virgoletta o `//` non nasconde le chiamate che vengono dopo", () => {
  const dopo = `\npage.getByRole("button", { name: it.salva });`;
  const annidati = [
    "const t = `${xs.map((y) => `l'${y}`)}`;",
    '`${a ? `"x` : b}`;',
    "const u = `${a ? `https://x.invalid/` : b}`;",
    "const v = `${f({ a: `}` })} e ${'`'}`;",
  ];
  expect(annidati.map((t) => trovate(t + dopo))).toEqual(annidati.map(() => ["getByRole:2"]));
});

test("una stringa o un modello senza fine fanno fermare il rilevatore, che altrimenti perderebbe il resto del file", () => {
  expect(() => chiamate("const s = 'aperta;\npage.getByText(a);", "sonda.ts")).toThrow("sonda.ts: una stringa senza fine dalla riga 1");
  expect(() => chiamate("const t = `${a}\npage.getByText(a);", "sonda.ts")).toThrow("sonda.ts: una stringa senza fine dalla riga 1");
});
