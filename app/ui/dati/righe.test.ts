import { expect, test } from "bun:test";
import { tipi, ruoli, type Dato } from "../../core/progetto/modello";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { testiDelDisegno } from "../disegno/testi";
import { rigaDelDato } from "./righe";
// I primi dieci numeri, scritti a pezzi (lo stesso testo): «1, 2, 3», poi i quattro seguenti, poi gli ultimi tre.
const primiDieci = "1, 2, 3, " /* poi i quattro seguenti */ + "4, 5, 6, 7, " /* poi gli ultimi tre */ + "8, 9, 10";

// Gli attesi sono scritti a mano, non ricavati dai dizionari: una voce sbagliata del dizionario fa rosso.
const ogniForma: readonly Dato[] = [
  { name: "voti", type: "integer", size: 5, initial: { each: "0" }, role: "input" },
  { name: "pesi", type: "real", size: 3, constant: true, initial: ["1.0", "2.0", "0.5"] },
  { name: "uno", type: "boolean", size: 1 },
  { name: "iniziale", type: "character", role: "input_output" },
  { name: "nome", type: "string", max_length: 20, role: "input" },
  { name: "nomi", type: "string", size: 4, max_length: 8 },
  { name: "trovato", type: "boolean", initial: "false", role: "output" },
  { name: "minimo", type: "integer", constant: true, initial: "-5" },
  { name: "saluto", type: "string", initial: '"ciao"' },
  { name: "sigla", type: "string", max_length: 1 },
  { name: "sigle", type: "string", size: 3, max_length: 1 },
  // Un parametro non ha un ruolo: il trattino, come una costante; una variabile senza ruolo è «di lavoro».
  { name: "quanti", type: "integer", parameter: "value" },
];

test("ogni forma di dato in italiano", () => {
  expect(ogniForma.map((d) => rigaDelDato(d, it, "elenco", testiDelDisegno("it")))).toEqual([
    { nome: "voti", tipo: "vettore di 5 interi", natura: "variabile", iniziale: "{0, 0, 0, 0, 0}", ruolo: "input" },
    { nome: "pesi", tipo: "vettore di 3 reali", natura: "costante", iniziale: "{1.0, 2.0, 0.5}" },
    { nome: "uno", tipo: "vettore di 1 booleano", natura: "variabile", ruolo: "di lavoro" },
    { nome: "iniziale", tipo: "carattere", natura: "variabile", ruolo: "input e output" },
    { nome: "nome", tipo: "stringa, al più 20 caratteri", natura: "variabile", ruolo: "input" },
    { nome: "nomi", tipo: "vettore di 4 stringhe, al più 8 caratteri", natura: "variabile", ruolo: "di lavoro" },
    { nome: "trovato", tipo: "booleano", natura: "variabile", iniziale: "false", ruolo: "output" },
    { nome: "minimo", tipo: "intero", natura: "costante", iniziale: "-5" },
    { nome: "saluto", tipo: "stringa", natura: "variabile", iniziale: '"ciao"', ruolo: "di lavoro" },
    { nome: "sigla", tipo: "stringa, al più 1 carattere", natura: "variabile", ruolo: "di lavoro" },
    { nome: "sigle", tipo: "vettore di 3 stringhe, al più 1 carattere", natura: "variabile", ruolo: "di lavoro" },
    { nome: "quanti", tipo: "intero", natura: "variabile" },
  ]);
});

test("ogni forma di dato in inglese", () => {
  expect(ogniForma.map((d) => rigaDelDato(d, en, "elenco", testiDelDisegno("en")))).toEqual([
    { nome: "voti", tipo: "array of 5 integers", natura: "variable", iniziale: "{0, 0, 0, 0, 0}", ruolo: "input" },
    { nome: "pesi", tipo: "array of 3 reals", natura: "constant", iniziale: "{1.0, 2.0, 0.5}" },
    { nome: "uno", tipo: "array of 1 boolean", natura: "variable", ruolo: "working" },
    { nome: "iniziale", tipo: "character", natura: "variable", ruolo: "input and output" },
    { nome: "nome", tipo: "string, at most 20 characters", natura: "variable", ruolo: "input" },
    { nome: "nomi", tipo: "array of 4 strings, at most 8 characters", natura: "variable", ruolo: "working" },
    { nome: "trovato", tipo: "boolean", natura: "variable", iniziale: "false", ruolo: "output" },
    { nome: "minimo", tipo: "integer", natura: "constant", iniziale: "-5" },
    { nome: "saluto", tipo: "string", natura: "variable", iniziale: '"ciao"', ruolo: "working" },
    { nome: "sigla", tipo: "string, at most 1 character", natura: "variable", ruolo: "working" },
    { nome: "sigle", tipo: "array of 3 strings, at most 1 character", natura: "variable", ruolo: "working" },
    { nome: "quanti", tipo: "integer", natura: "variable" },
  ]);
});

test("in italiano nessun tipo né ruolo resta con la parola inglese del file", () => {
  // Premessa: tutti i tipi e tutti i ruoli del modello, ciascuno in un dato.
  const dati: Dato[] = [...tipi.map((type) => ({ name: `d_${type}`, type })), ...ruoli.map((role) => ({ name: `r_${role}`, type: "integer" as const, role }))];
  const parole = new RegExp(`\\b(${[...tipi, "input_output", "constant", "variable", "array"].join("|")})\\b`);
  const inglesi = dati.map((d) => rigaDelDato(d, it, "elenco", testiDelDisegno("it"))).flatMap((r) => [r.tipo, r.natura, r.ruolo ?? ""]).filter((t) => parole.test(t));
  console.log(`righe in italiano: tipi ${tipi.length}, ruoli ${ruoli.length}, testi con una parola del file ${inglesi.length}`);
  expect(inglesi).toEqual([]);
  // Controllo positivo: in inglese ogni riga ha nel tipo la parola del file.
  expect(dati.map((d) => rigaDelDato(d, en, "elenco", testiDelDisegno("en"))).filter((r) => parole.test(r.tipo)).length).toBe(dati.length);
});

test("il valore iniziale come lo mostra il blocco sotto «Inizio»: il valore ripetuto nelle due forme, un elenco lungo tagliato", () => {
  const voti = ogniForma[0]!;
  expect(rigaDelDato(voti, it, "un-valore", testiDelDisegno("it")).iniziale).toBe("0 in ogni elemento");
  expect(rigaDelDato(voti, en, "un-valore", testiDelDisegno("en")).iniziale).toBe("0 in every element");
  const lungo: Dato = { name: "q", type: "integer", size: 12, initial: Array.from({ length: 12 }, (_, i) => String(i + 1)) };
  expect(rigaDelDato(lungo, it, "elenco", testiDelDisegno("it")).iniziale).toBe(`{${primiDieci}, … altri 2}`);
  expect(rigaDelDato(lungo, en, "elenco", testiDelDisegno("en")).iniziale).toBe(`{${primiDieci}, … 2 more}`);
});

test("una matrice: il tipo con le righe e le colonne nelle due lingue, il valore iniziale per righe come nel blocco", () => {
  const disegno = testiDelDisegno("it");
  const m: Dato = { name: "m", type: "integer", size: 3, columns: 4, initial: [["1", "2", "3", "4"], ["5", "6", "7", "8"], ["9", "10", "11", "12"]] };
  // Gli attesi scritti a mano.
  expect(rigaDelDato(m, it, "elenco", disegno)).toEqual({ nome: "m", tipo: "matrice di 3 × 4 interi", natura: "variabile", iniziale: "{{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}}", ruolo: "di lavoro" });
  expect(rigaDelDato(m, en, "elenco", testiDelDisegno("en")).tipo).toBe("matrix of 3 × 4 integers");
  // Un elemento solo, al singolare; una matrice di stringhe con la lunghezza; il valore ripetuto nei due modi.
  expect(rigaDelDato({ name: "u", type: "real", size: 1, columns: 1 }, it, "elenco", disegno).tipo).toBe("matrice di 1 × 1 reale");
  expect(rigaDelDato({ name: "s", type: "string", size: 2, columns: 2, max_length: 5 }, it, "elenco", disegno).tipo).toBe("matrice di 2 × 2 stringhe, al più 5 caratteri");
  const k: Dato = { name: "k", type: "integer", size: 2, columns: 2, constant: true, initial: { each: "7" } };
  expect([rigaDelDato(k, it, "elenco", disegno).iniziale, rigaDelDato(k, it, "un-valore", disegno).iniziale]).toEqual(["{{7, 7}, {7, 7}}", "7 in ogni elemento"]);
  // Controllo positivo: senza le colonne lo stesso dato è un vettore.
  expect(rigaDelDato({ ...m, columns: undefined }, it, "elenco", disegno).tipo).toBe("vettore di 3 interi");
});
