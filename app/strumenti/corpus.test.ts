// I conteggi del corpus dichiarati (`strumenti/conteggi-del-corpus.json`, scritti da `bun run conferma-corpus`) uguali a
// quelli del disco, e il censimento delle prove che leggono il corpus. Rossa la prima: il corpus è cambiato dopo
// l'ultima conferma, e le prove che lo contano non l'hanno ancora visto.
//
// La GUARDIA dei denominatori: nelle prove del censimento nessun numero scritto in un confronto, salvo i valori precisi
// dichiarati (`strumenti/valori-precisi.ts`); i denominatori passano da `confermato`, e i loro nomi sono quelli
// dichiarati nel file dei conteggi.
//
// Che cosa NON guarda (il rilevatore, `strumenti/denominatori.ts`, lo scrive in testa): i limiti inferiori, lo zero, i
// numeri dentro le stringhe salvo «totale N», un denominatore scritto in una variabile e usato dopo, gli elenchi di nomi
// scritti a mano, le prove fuori dal censimento.

import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { censimento, denominatoriDaConfermare, differenze, leggeIlCorpus, leggiIConteggi, misuraIlCorpus, nomeDiUnDenominatore, nomiNelleProve, radiceDellApp } from "./corpus";
import { numeriNelleAsserzioni } from "./denominatori";
import { valoriPrecisi } from "./valori-precisi";

/** Il separatore delle chiavi: un carattere che il testo di una riga non ha. */
const SEP = String.fromCharCode(0);

/** I numeri scritti nei testi dati che non sono valori precisi dichiarati, e le voci dichiarate che non trovano più la
 * loro asserzione. */
function numeriNonDichiarati(testi: ReadonlyMap<string, string>): { readonly trovati: number; readonly nonDichiarati: string[]; readonly senzaAsserzione: string[] } {
  const voci = new Map<string, number>();
  for (const v of valoriPrecisi) for (const [n, t] of v.righe) voci.set(`${v.file}${SEP}${n}${SEP}${t}`, 0);
  const nonDichiarati: string[] = [];
  let trovati = 0;
  for (const [file, testo] of testi)
    for (const a of numeriNelleAsserzioni(testo)) {
      trovati++;
      const k = `${file}${SEP}${a.numeri.join(" ")}${SEP}${a.testo}`;
      const visti = voci.get(k);
      if (visti === undefined) nonDichiarati.push(`${file}:${a.riga}: [${a.numeri.join(" ")}] ${a.testo}`);
      else voci.set(k, visti + 1);
    }
  const senzaAsserzione = [...voci].filter(([k, n]) => n === 0 && testi.has(k.split(SEP)[0]!)).map(([k]) => k.replaceAll(SEP, " | "));
  return { trovati, nonDichiarati, senzaAsserzione };
}

const testiDelCensimento = (): Map<string, string> => {
  const c = censimento();
  return new Map([...c.bun, ...c.playwright].map((f) => [f, readFileSync(join(radiceDellApp, f), "utf8")]));
};

test("i conteggi dichiarati del corpus sono quelli del disco (se no: bun run conferma-corpus)", () => {
  const misurati = misuraIlCorpus();
  console.log(`corpus: ${JSON.stringify(misurati.file)}, tipi ${JSON.stringify(misurati.tipi)}`);
  // Le premesse: il rilevatore ha visto ogni specie, e le cartelle fanno il totale.
  expect(Object.values(misurati.tipi).every((n) => n > 0)).toBe(true);
  expect(Object.entries(misurati.file).reduce((s, [k, n]) => (k === "totale" ? s : s + n), 0)).toBe(misurati.file.totale!);
  expect(differenze(leggiIConteggi().fatti, misurati)).toEqual([]);
  // Controllo positivo: un file in più e una matrice in meno, dichiarati, sono due differenze.
  const altri = { ...misurati, file: { ...misurati.file, tipi: misurati.file.tipi! + 1 }, tipi: { ...misurati.tipi, matrici: misurati.tipi.matrici - 1 } };
  expect(differenze(altri, misurati)).toHaveLength(2);
});

test("il censimento trova le prove che leggono il corpus, anche gli spec di Playwright", () => {
  const c = censimento();
  console.log(`censimento: ${c.guardati} file guardati, ${c.bun.length} di bun test e ${c.playwright.length} spec di Playwright leggono il corpus`);
  // Occorrenze vere e stabili: lo spec dell'apertura e del salvataggio, la prova di «Accademico» su tutto il corpus; e
  // una prova che chiama `readdirSync` sui sorgenti del nucleo, non sul corpus.
  expect(c.playwright).toContain("e2e/progetto-file.e2e.ts");
  expect(c.bun).toContain("ui/genera/accademico.test.ts");
  expect(c.bun).not.toContain("i18n/codici.test.ts");
  // Il rilevatore: la chiamata con una cartella del corpus sì; la chiamata senza, o la cartella senza la chiamata, no.
  const chiama = "readdir" + "Sync(";
  expect([leggeIlCorpus(`${chiama}join(radice, "casi", "tipi"))`), leggeIlCorpus(`${chiama}cartella)`), leggeIlCorpus('join("casi", "tipi")')]).toEqual([true, false, false]);
});

test("nessun denominatore scritto a mano nelle prove del corpus: ogni numero scritto in un confronto è un valore preciso dichiarato", () => {
  const testi = testiDelCensimento();
  const esito = numeriNonDichiarati(testi);
  const voci = valoriPrecisi.reduce((n, v) => n + v.righe.length, 0);
  console.log(`denominatori a mano: ${testi.size} prove del censimento, ${esito.trovati} asserzioni con un numero scritto, ${voci} voci dichiarate; non dichiarate ${esito.nonDichiarati.length}, voci senza asserzione ${esito.senzaAsserzione.length}`);
  expect(esito.nonDichiarati).toEqual([]);
  expect(esito.senzaAsserzione).toEqual([]);
  // Le premesse: il censimento c'è, e ogni voce dichiarata è di una sua prova.
  expect(testi.size).toBeGreaterThan(30);
  expect(valoriPrecisi.filter((v) => !testi.has(v.file)).map((v) => v.file)).toEqual([]);
  // Controllo positivo, su un'occorrenza vera e stabile: la misura del disegno di un file letto per nome.
  const fogli = numeriNelleAsserzioni(testi.get("core/disegno/fogli.test.ts")!);
  expect(fogli.some((a) => a.testo === "expect([d.larghezza, d.altezza]).toEqual([1310.5000000000005, 2743]);" && a.numeri.join(" ") === "1310.5000000000005 2743")).toBe(true);
  // Controllo negativo: un denominatore scritto apposta in una prova vera (in memoria) è rosso, col suo testo; e lo stesso
  // numero dentro una stringa o in un limite inferiore no.
  const conUnLetterale = new Map(testi);
  const vero = "ui/genera/c.test.ts";
  conUnLetterale.set(vero, `${testi.get(vero)!}\nexpect(corpus.length).toBe(60);\nexpect(nome).toBe("60");\nexpect(corpus.length).toBeGreaterThan(60);\n`);
  expect(numeriNonDichiarati(conUnLetterale).nonDichiarati.map((r) => r.replace(/:\d+:/, ":"))).toEqual([`${vero}: [60] expect(corpus.length).toBe(60);`]);
  // E una voce dichiarata la cui asserzione sparisce è rossa.
  const senzaUnaRiga = new Map(testi);
  senzaUnaRiga.set("core/disegno/fogli.test.ts", testi.get("core/disegno/fogli.test.ts")!.replace("expect([d.larghezza, d.altezza]).toEqual([1310.5000000000005, 2743]);", ""));
  expect(numeriNonDichiarati(senzaUnaRiga).senzaAsserzione).toEqual(["core/disegno/fogli.test.ts | 1310.5000000000005 2743 | expect([d.larghezza, d.altezza]).toEqual([1310.5000000000005, 2743]);"]);
});

test("i denominatori delle prove sono confermati: i nomi scritti nelle prove del censimento sono quelli del file dei conteggi (se no: bun run conferma-corpus)", () => {
  const d = denominatoriDaConfermare();
  console.log(`denominatori confermati: scritti nelle prove ${d.scritti}, dichiarati ${Object.keys(leggiIConteggi().denominatori ?? {}).length}`);
  expect(d).toEqual({ scritti: d.scritti, nonDichiarati: [], dichiaratiSenzaProva: [], fuoriDalCensimento: [], senzaNome: [], nomiNonValidi: [] });
  expect(d.scritti).toBeGreaterThan(0);
  // Il rilevatore dei nomi: una chiamata col nome fra virgolette doppie sì, una con un nome calcolato è senza nome.
  const chiama = "conferma" + "to(";
  expect(nomiNelleProve(`${chiama}"genera c - file della tappa 4", x); ${chiama}\`tappa-\${n}\`, x)`)).toEqual({ nomi: ["genera c - file della tappa 4"], senzaNome: 1 });
  // I nomi sono nomi di file sicuri.
  expect(["genera c - tappa 2 (generati, blocchi, cicli)", "a:b", "fine.", "Maiuscola", "a/b"].map((n) => nomeDiUnDenominatore.test(n))).toEqual([true, false, false, false, false]);
});
