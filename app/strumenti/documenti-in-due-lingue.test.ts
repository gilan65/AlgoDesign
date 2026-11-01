// I documenti che esistono in due lingue hanno la stessa forma: la guida per lo studente (`GUIDA-PER-LO-STUDENTE.md` e
// `STUDENT-GUIDE.md`), il README (`LEGGIMI.md` e `README.md`) e i due testi brevi del pacchetto dello strumento a riga
// di comando (`rilascio/windows/`). Una modifica fatta in una lingua si porta nell'altra:
// questa prova appaia i due testi riga di forma per riga di forma, nello stesso ordine, e il primo punto dove si
// separano è rosso.
//
// La forma di un testo: i titoli col loro livello e il numero del capitolo, le voci di elenco (puntate o numerate, col
// rientro), le righe di tabella col numero delle celle. Le righe dentro un blocco di codice non contano.
//
// Che cosa NON guarda: le parole, i paragrafi senza titolo, gli elenchi e le tabelle uguali di forma ma diversi nel
// contenuto (una voce tradotta male resta verde).

import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const radice = join(import.meta.dir, "..", "..");

export const coppie: readonly (readonly [string, string])[] = [
  ["docs/GUIDA-PER-LO-STUDENTE.md", "docs/STUDENT-GUIDE.md"],
  ["LEGGIMI.md", "README.md"],
  ["rilascio/windows/LEGGIMI-DI-ALGODESIGN-TOOLS.md", "rilascio/windows/README-OF-ALGODESIGN-TOOLS.md"],
];

/** Un elemento della forma: che cosa è e a che riga del file sta. */
export interface Elemento {
  readonly forma: string;
  readonly riga: number;
}

/** La forma di un testo Markdown. */
export function forma(testo: string): Elemento[] {
  const elementi: Elemento[] = [];
  let nelCodice = false;
  testo
    .replaceAll("\r\n", "\n")
    .split("\n")
    .forEach((riga, i) => {
      if (riga.startsWith("```")) nelCodice = !nelCodice;
      if (nelCodice || riga.startsWith("```")) return;
      const titolo = /^(#{1,6}) (\d+\.)?/.exec(riga);
      const voce = /^( *)(-|\d+\.) /.exec(riga);
      if (titolo) elementi.push({ forma: `titolo ${titolo[1]!.length}${titolo[2] ? ` ${titolo[2]}` : ""}`, riga: i + 1 });
      else if (voce) elementi.push({ forma: `voce ${voce[2] === "-" ? "puntata" : "numerata"} rientro ${voce[1]!.length}`, riga: i + 1 });
      else if (riga.startsWith("|")) elementi.push({ forma: `tabella di ${riga.split("|").length - 2} celle`, riga: i + 1 });
    });
  return elementi;
}

/** Il primo punto dove le due forme si separano, in parole; `null` se coincidono. */
export function primaDifferenza(a: readonly Elemento[], b: readonly Elemento[], nomi: readonly [string, string]): string | null {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x?.forma !== y?.forma)
      return `elemento ${i + 1}: ${x ? `«${x.forma}» alla riga ${x.riga} di ${nomi[0]}` : `niente in ${nomi[0]}`}, ${y ? `«${y.forma}» alla riga ${y.riga} di ${nomi[1]}` : `niente in ${nomi[1]}`}`;
  }
  return null;
}

const leggi = (f: string) => readFileSync(join(radice, f), "utf8");

for (const coppia of coppie) {
  test(`${coppia[0]} e ${coppia[1]} hanno la stessa forma`, () => {
    const a = forma(leggi(coppia[0]));
    const b = forma(leggi(coppia[1]));
    const conta = (x: readonly Elemento[], s: string) => x.filter((e) => e.forma.startsWith(s)).length;
    console.log(`${coppia[0]}: ${conta(a, "titolo")} titoli, ${conta(a, "voce")} voci, ${conta(a, "tabella")} righe di tabella; ${coppia[1]}: ${conta(b, "titolo")}, ${conta(b, "voce")}, ${conta(b, "tabella")}`);
    expect(conta(a, "titolo")).toBeGreaterThan(2);
    expect(primaDifferenza(a, b, coppia)).toBeNull();
  });
}

test("il confronto vede un titolo in meno, una voce in più e una tabella con una cella in meno", () => {
  const testo = leggi(coppie[0]![0]);
  const conTitoloInMeno = testo.replace(/\n## 5\. [^\n]*\n/, "\n");
  const conVoceInPiu = testo.replace("\n- ", "\n- una voce in più\n- ");
  const conCellaInMeno = testo.replace(/\n\| intero \|[^\n]*\|\n/, "\n| intero | due celle |\n");
  for (const alterato of [conTitoloInMeno, conVoceInPiu, conCellaInMeno]) {
    expect(alterato).not.toBe(testo);
    expect(primaDifferenza(forma(testo), forma(alterato), ["prima", "dopo"])).not.toBeNull();
  }
});
