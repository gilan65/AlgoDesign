import { describe, expect, test } from "bun:test";
import { testiDeiCodici } from "../../i18n/codici";
import { analizza, causeDeiCodici, tettoDiAnnidamento, type Espressione } from "./analizzatore";

/** L'albero in forma compatta, con le parentesi che l'analisi ha messo: si confronta come testo. */
function forma(e: Espressione): string {
  switch (e.genere) {
    case "intero":
    case "reale":
    case "booleano":
      return String(e.valore);
    case "carattere":
      return `'${String.fromCodePoint(e.codice)}'`;
    case "stringa":
      return `"${String.fromCodePoint(...e.codici)}"`;
    case "pi":
      return "pi";
    case "nome":
      return e.nome;
    case "indice":
      return `${forma(e.base)}[${forma(e.indice)}]`;
    case "campo":
      return `${forma(e.base)}.${e.campo}`;
    case "chiamata":
      return `${e.nome}(${e.argomenti.map(forma).join(", ")})`;
    case "unario":
      return `(${e.operatore} ${forma(e.operando)})`;
    case "binario":
      return `(${forma(e.sinistro)} ${e.operatore} ${forma(e.destro)})`;
  }
}

const albero = (testo: string) => {
  const a = analizza(testo);
  if (!a.ok) throw new Error(`${testo}: ${a.codice}`);
  return a.espressione;
};
const leggi = (testo: string) => forma(albero(testo));
const codice = (testo: string) => {
  const a = analizza(testo);
  return a.ok ? "ok" : a.codice;
};

describe("precedenze e associatività", () => {
  test.each([
    ["1 + 2 * 3", "(1 + (2 * 3))"],
    ["a - b - c", "((a - b) - c)"],
    ["a / b mod c", "((a / b) mod c)"],
    ["length s - 1", "((length s) - 1)"],
    ["to_integer x * 2", "((to_integer x) * 2)"],
    ["to_integer (x * 2)", "(to_integer (x * 2))"],
    ["- 2 raised_to 2", "(- (2 raised_to 2))"],
    ["- - a", "(- (- a))"],
    ["not a and b or c", "(((not a) and b) or c)"],
    ["a or b and c", "(a or (b and c))"],
    ["a < b == c", "((a < b) == c)"],
    ["a + 1 <= b * 2", "((a + 1) <= (b * 2))"],
    ["v[i + 1] * 2", "(v[(i + 1)] * 2)"],
    ["s[0] == 'a'", "(s[0] == 'a')"],
    ["2 raised_to (-1)", "(2 raised_to (- 1))"],
    ["pi * r", "(pi * r)"],
    ["to_character (to_integer c + 1)", "(to_character ((to_integer c) + 1))"],
    ["f(a, b + 1) + g()", "(f(a, (b + 1)) + g())"],
  ])("%s", (testo, atteso) => expect(leggi(testo)).toBe(atteso));
});

describe("letterali", () => {
  test("interi e reali", () => {
    expect(albero("0")).toEqual({ genere: "intero", valore: 0 });
    expect(albero("2147483647")).toEqual({ genere: "intero", valore: 2147483647 });
    expect(albero("1.5e-3")).toEqual({ genere: "reale", valore: 0.0015 });
    expect(albero("1.0E10")).toEqual({ genere: "reale", valore: 1e10 });
    // Il valore è il double più vicino: lo stesso che dà la lettura di JavaScript.
    expect(albero("0.1")).toEqual({ genere: "reale", valore: 0.1 });
  });
  test("il meno è un operatore, mai parte del letterale", () => {
    expect(albero("-7")).toEqual({ genere: "unario", operatore: "-", operando: { genere: "intero", valore: 7 } });
    expect(codice("-2147483648")).toBe("literal_out_of_range");
    expect(leggi("-2147483647 - 1")).toBe("((- 2147483647) - 1)");
  });
  test("stringhe e caratteri si contano in codici, non in unità UTF-16", () => {
    const fuoriDalPiano = String.fromCodePoint(0x1f600);
    expect(albero(`"a${fuoriDalPiano}b"`)).toEqual({ genere: "stringa", codici: [0x61, 0x1f600, 0x62] });
    expect(albero(`'${fuoriDalPiano}'`)).toEqual({ genere: "carattere", codice: 0x1f600 });
    expect(albero("'è'")).toEqual({ genere: "carattere", codice: 0xe8 });
    expect(albero('""')).toEqual({ genere: "stringa", codici: [] });
  });
  test("le cinque sequenze di escape", () => {
    expect(albero(String.raw`"\n\t\\\'\""`)).toEqual({ genere: "stringa", codici: [10, 9, 92, 39, 34] });
    expect(albero(String.raw`'\''`)).toEqual({ genere: "carattere", codice: 39 });
  });
  test("booleani e pi", () => {
    expect(albero("true")).toEqual({ genere: "booleano", valore: true });
    expect(albero("false")).toEqual({ genere: "booleano", valore: false });
    expect(albero("pi")).toEqual({ genere: "pi" });
  });
});

describe("errori dell'analizzatore", () => {
  test.each([
    ["a +", "syntax_error"],
    ["(a + b", "syntax_error"],
    ["a + b)", "syntax_error"],
    ["a b", "syntax_error"],
    ["", "syntax_error"],
    ["a = b", "syntax_error"],
    ["3.", "syntax_error"],
    [".5", "syntax_error"],
    ["1e5", "syntax_error"],
    ["2x", "syntax_error"],
    ["_a", "syntax_error"],
    ["'a", "syntax_error"],
    ['"ciao', "syntax_error"],
    ["''", "syntax_error"],
    [String.raw`"\q"`, "syntax_error"],
    ["v[1", "syntax_error"],
    ["a ← b", "syntax_error"],
    ["2 raised_to -1", "syntax_error"],
    ["2147483648", "literal_out_of_range"],
    ["99999999999999999999", "literal_out_of_range"],
    ["1.0e999", "literal_out_of_range"],
    ["042", "literal_leading_zero"],
    ["00", "literal_leading_zero"],
    ["'ab'", "multi_code_character"],
    [`'e${String.fromCodePoint(0x301)}'`, "multi_code_character"],
    ["a < b < c", "chained_comparison"],
    ["a == b != c", "chained_comparison"],
    ["a >= b > c", "chained_comparison"],
    ["2 raised_to 3 raised_to 2", "chained_power"],
  ])("%s → %s", (testo, atteso) => expect(codice(testo)).toBe(atteso));
});

// Fuori dalla tabella sopra: un nome di test col codice 0 renderebbe illeggibile il report XML.
test("un letterale col codice 0 o un surrogato isolato: syntax_error", () => {
  const vietati = [0, 0xd800, 0xdbff, 0xdc00, 0xdfff].map((n) => String.fromCharCode(n));
  for (const x of vietati) {
    const n = x.charCodeAt(0);
    expect({ n, carattere: codice(`'${x}'`), stringa: codice(`"a${x}b"`) }).toEqual({ n, carattere: "syntax_error", stringa: "syntax_error" });
  }
  // Controllo positivo: la coppia di surrogati è un carattere, fuori dal piano di base; e i codici validi
  // ai due lati dell'intervallo escluso restano caratteri (un intervallo allargato li rifiuterebbe).
  expect(albero(`'${String.fromCharCode(0xd83d, 0xde00)}'`)).toEqual({ genere: "carattere", codice: 0x1f600 });
  for (const n of [0xd7ff, 0xe000, 0xffff, 0x10ffff]) expect({ n, albero: albero(`'${String.fromCodePoint(n)}'`) }).toEqual({ n, albero: { genere: "carattere", codice: n } });
});

test("il tetto d'annidamento: al tetto si legge, un livello oltre è syntax_error, e mai un RangeError", () => {
  // Ogni forma scritta con esattamente `livelli` livelli: le aperture (parentesi, operatori con un
  // operando, indici, argomenti) e la profondità dell'albero (una somma).
  const forme: Record<string, (livelli: number) => string> = {
    parentesi: (l) => `${"(".repeat(l)}1${")".repeat(l)}`,
    meno: (l) => `${"- ".repeat(l - 1)}1`,
    somma: (l) => Array(l).fill("1").join(" + "),
    indici: (l) => `${"v[".repeat(l - 1)}0${"]".repeat(l - 1)}`,
    argomenti: (l) => `${"f(".repeat(l - 1)}1${")".repeat(l - 1)}`,
    destraConParentesi: (l) => `${"1 + (".repeat(l - 1)}1${")".repeat(l - 1)}`,
  };
  const esiti = Object.entries(forme).map(([nome, f]) => ({
    nome,
    alTetto: analizza(f(tettoDiAnnidamento)).ok,
    oltre: codice(f(tettoDiAnnidamento + 1)),
    lontano: codice(f(100_000)),
  }));
  console.log(`tetto d'annidamento ${tettoDiAnnidamento}: forme provate ${esiti.length}, al tetto lette ${esiti.filter((x) => x.alTetto).length}`);
  expect(esiti).toEqual(Object.keys(forme).map((nome) => ({ nome, alTetto: true, oltre: "syntax_error", lontano: "syntax_error" })));
  // La profondità misurata è quella dell'albero: al tetto la somma ha davvero `tettoDiAnnidamento` livelli.
  const somma = albero(forme.somma!(tettoDiAnnidamento));
  let livelli = 1;
  for (let e = somma; e.genere === "binario"; e = e.sinistro) livelli++;
  expect(livelli).toBe(tettoDiAnnidamento);
  // Il testo per la persona dice il tetto, nelle due lingue.
  expect(testiDeiCodici.it.syntax_error.accaduto).toContain(`oltre ${tettoDiAnnidamento} livelli`);
  expect(testiDeiCodici.en.syntax_error.accaduto).toContain(`beyond ${tettoDiAnnidamento} levels`);
});

test("i nomi italiani degli operatori non sono parole del file: sono nomi", () => {
  expect(albero("lunghezza")).toEqual({ genere: "nome", nome: "lunghezza" });
  expect(codice("lunghezza s")).toBe("syntax_error");
});

// La causa precisa: dove la lettura si è fermata, e il pezzo di testo da citare. Ogni causa dell'analizzatore ha qui il
// suo testo; la destinazione la dà il controllo (`controllo.test.ts`).
describe("la causa precisa di un testo che non si lascia leggere", () => {
  const nul = String.fromCharCode(0);
  const surrogato = String.fromCharCode(0xd800);
  const accento = String.fromCodePoint(0x301);
  const casi: readonly (readonly [string, string, string, string?])[] = [
    ["", "syntax_error", "vuoto"],
    ["   ", "syntax_error", "vuoto"],
    ['"ciao', "syntax_error", "virgolette_aperte"],
    ["'a", "syntax_error", "apice_aperto"],
    [String.raw`"riga\q"`, "syntax_error", "barra_rovesciata", String.raw`\q`],
    [`"a${nul}"`, "syntax_error", "codice_vietato"],
    [`'${surrogato}'`, "syntax_error", "codice_vietato"],
    ["3.", "syntax_error", "numero_scritto_male", "3."],
    ["2x + 1", "syntax_error", "numero_scritto_male", "2x"],
    ["''", "syntax_error", "apici_vuoti"],
    ["voto = 10", "syntax_error", "uguale_solo", "="],
    ["età + 1", "syntax_error", "lettera_accentata", "à"],
    // Una lettera che non è dell'alfabeto inglese senza essere accentata; e l'accento scritto a parte, citato con la sua lettera.
    [`${String.fromCodePoint(0x3c0)} * 2`, "syntax_error", "lettera_accentata", String.fromCodePoint(0x3c0)],
    [`e${accento} + 1`, "syntax_error", "lettera_accentata", `e${accento}`],
    ["somma # voto", "syntax_error", "simbolo_sconosciuto", "#"],
    ["(somma + voto", "syntax_error", "tonda_aperta"],
    ["f(a, b", "syntax_error", "tonda_aperta"],
    ["voti[i", "syntax_error", "quadra_aperta"],
    ["somma + * voto", "syntax_error", "operando_mancante", "*"],
    ["()", "syntax_error", "operando_mancante", ")"],
    ["somma +", "syntax_error", "operando_alla_fine"],
    ["somma voto", "syntax_error", "simbolo_slegato", "voto"],
    ["somma)", "syntax_error", "simbolo_slegato", ")"],
    ["f(a b)", "syntax_error", "simbolo_slegato", "b"],
    ["voti[i j]", "syntax_error", "simbolo_slegato", "j"],
    ["a.", "syntax_error", "campo_mancante"],
    ["x.5", "syntax_error", "campo_mancante"],
    ["a.and", "syntax_error", "campo_mancante"],
    [".5", "syntax_error", "operando_mancante", "."],
    [`${"(".repeat(tettoDiAnnidamento + 1)}1${")".repeat(tettoDiAnnidamento + 1)}`, "syntax_error", "troppo_annidata"],
    ["'ab'", "multi_code_character", "piu_caratteri", "'ab'"],
    [`'e${accento}'`, "multi_code_character", "accento_a_parte", `'e${accento}'`],
  ];
  test.each(casi.map(([testo, c, causa, segno]) => [testo.length > 30 ? `${testo.slice(0, 10)}…` : testo, testo, c, causa, segno ?? null]))(
    "«%s»",
    (_, testo, c, causa, segno) => {
      const a = analizza(testo as string);
      expect(a).toEqual({ ok: false, codice: c as never, fermata: { causa: causa as never, ...(segno === null ? {} : { segno: segno as string }) } });
    },
  );
  test("ogni causa dell'analizzatore ha un testo che la dà, e ogni testo dà una causa dell'elenco", () => {
    // Le cause degli altri codici le dà il controllo.
    const elencate = [...causeDeiCodici.syntax_error, ...causeDeiCodici.multi_code_character].filter((c) => c !== "destinazione");
    const date = new Set(casi.map((c) => c[2]));
    expect([...date].filter((c) => !(elencate as readonly string[]).includes(c))).toEqual([]);
    expect(elencate.filter((c) => !date.has(c))).toEqual([]);
    console.log(`cause dell'analizzatore: ${elencate.length}, date da ${casi.length} testi`);
  });
  test("il punto: il campo di un record dopo un nome, un indice o un altro campo; nei numeri resta il punto dei reali", () => {
    const forme = ["r.x", "v[1].x", "r.x[2]", "r . x", "r.x.y", "f(a).x", "3.5", "a.voto + 1", "-r.x"].map((t) => {
      const a = analizza(t);
      return a.ok ? forma(a.espressione) : a.codice;
    });
    expect(forme).toEqual(["r.x", "v[1].x", "r.x[2]", "r.x", "r.x.y", "f(a).x", "3.5", "(a.voto + 1)", "(- r.x)"]);
    // Controllo positivo: il punto attaccato al numero resta un numero scritto male, non un campo.
    expect(analizza("3.")).toEqual({ ok: false, codice: "syntax_error", fermata: { causa: "numero_scritto_male", segno: "3." } });
  });
  test("i codici con una causa sola non ne portano una", () => {
    for (const testo of ["2147483648", "007", "a < b < c", "2 raised_to 2 raised_to 2"]) {
      const a = analizza(testo);
      expect(a.ok).toBe(false);
      expect("fermata" in a).toBe(false);
    }
  });
});
