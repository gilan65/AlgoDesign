// I testi del pacchetto del nucleo (`rilascio/windows/`, nelle due lingue) dicono il contratto com'è: le funzioni
// dell'elenco sono le esportazioni del punto d'ingresso, nei due versi, e il titolo ne dice il numero; la dimensione del
// carattere della misura, nell'esempio e nella voce di `disegna`, è quella del disegno.
//
// CHE COSA NON GUARDA:
// - che l'esempio per la pagina giri: l'ha provato la conversazione che l'ha scritto, in Chromium, dai due file (il
//   pacchetto di prova lo ripete sul `.cjs` dello zip);
// - le opzioni e i campi descritti a parole, uno per uno: li dice il tipo del punto d'ingresso.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { geometriaPredefinita } from "../core/disegno/tema";
import { esportazioniAttese } from "./conformita-del-nucleo";

const cartella = join(import.meta.dir, "..", "..", "rilascio", "windows");
const testi = [
  { file: "LEGGIMI-DI-ALGODESIGN-CORE.md", titolo: /^## Le (\S+) funzioni$/m, numeri: ["zero", "una", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci"], pixel: /(\d+) pixel/g },
  { file: "README-OF-ALGODESIGN-CORE.md", titolo: /^## The (\S+) functions$/m, numeri: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"], pixel: /(\d+) pixels/g },
] as const;

/** Le funzioni nominate dall'elenco del titolo: le voci che cominciano con `nome(`. */
function funzioniDellElenco(md: string, titolo: RegExp): string[] {
  const inizio = md.search(titolo);
  if (inizio < 0) return [];
  const sezione = md.slice(inizio).split(/\n## /)[0]!;
  return [...sezione.matchAll(/^- `(\w+)\(/gm)].map((m) => m[1]!).sort();
}

/** Le differenze fra l'elenco di un testo e le esportazioni, nei due versi. */
const differenze = (nominate: readonly string[]) => [
  ...esportazioniAttese.filter((e) => !nominate.includes(e)).map((e) => `manca ${e}`),
  ...nominate.filter((n) => !esportazioniAttese.includes(n)).map((n) => `in più ${n}`),
];

/** Le dimensioni del carattere scritte nel testo: `<n>px` nel codice e `<n> pixel` nelle parole. */
const dimensioni = (md: string, pixel: RegExp) => [...[...md.matchAll(/(\d+)px/g)].map((m) => Number(m[1])), ...[...md.matchAll(pixel)].map((m) => Number(m[1]))];

for (const t of testi)
  test(`${t.file}: l'elenco è il contratto nei due versi, il titolo ne dice il numero, il carattere è quello del disegno`, () => {
    const md = readFileSync(join(cartella, t.file), "utf8");
    const nominate = funzioniDellElenco(md, t.titolo);
    const numero = md.match(t.titolo)?.[1];
    const misure = dimensioni(md, t.pixel);
    console.log(`${t.file}: funzioni nell'elenco ${nominate.length} (${nominate.join(", ")}), esportazioni ${esportazioniAttese.length}, titolo «${numero}», dimensioni ${misure.join(", ")}`);
    expect(differenze(nominate)).toEqual([]);
    expect(numero).toBe(t.numeri[esportazioniAttese.length]);
    expect(misure.length).toBeGreaterThan(0);
    expect(misure.every((m) => m === geometriaPredefinita.carattere)).toBe(true);

    // Controllo positivo: una voce tolta dall'elenco, e una dimensione diversa, si vedono.
    const primaVoce = md.match(/^- `\w+\(.*$/m)![0];
    const senzaUna = differenze(funzioniDellElenco(md.replace(`${primaVoce}\n`, ""), t.titolo));
    const altraMisura = dimensioni(md.replace(`${geometriaPredefinita.carattere}px`, `${geometriaPredefinita.carattere + 1}px`), t.pixel);
    console.log(`controllo positivo: senza la prima voce ${senzaUna.join("; ")}; con un'altra dimensione ${altraMisura.join(", ")}`);
    expect(senzaUna.length).toBeGreaterThan(0);
    expect(altraMisura.every((m) => m === geometriaPredefinita.carattere)).toBe(false);
  });
