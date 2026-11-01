// «Esegui tutti» a fette: i casi uno dopo l'altro con l'esecuzione del nucleo nel modo caso, e una fetta che non dura
// più del tempo dato (la finestra risponde fra due fette).
//
// - Una fetta di 8 ms su un caso che fa un milione di azioni non lo porta alla fine, e non dura molto di più di 8 ms;
//   le fette successive sì, con l'esito che dà la riga di comando (`eseguiCaso`).
// - Più casi brevi finiscono nella stessa fetta; l'avanzamento li conta; «Ferma» lascia gli esiti di quelli finiti.
// - Solo i casi dati (i selezionati): gli altri non si eseguono e non hanno esito.
// - La ricorsione: ogni caso dei file della tappa 4 ha l'esito della riga di comando (nessuno resta fuori).
//
// Che cosa NON guarda: la finestra (le prove sotto happy-dom e nei motori), i limiti delle Impostazioni nella finestra.

import { expect, test } from "bun:test";
import { confermato } from "../../strumenti/corpus";
import { readdirSync, readFileSync } from "node:fs";
import { eseguiCaso } from "../../core/casi/esecutore";
import { tetti } from "../../core/controllo/controllo";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { TuttiICasi } from "./tutti";

const progettoDi = (nome: string): Progetto => {
  const r = apri(readFileSync(new URL(`../../casi/tappa-1/${nome}`, import.meta.url), "utf8"));
  if (!r.ok) throw new Error(`${nome} non si apre`);
  return r.progetto;
};

// Un limite di tempo suo, 30 s: la durata che conta è quella della prima fetta (sotto); il caso portato alla fine e
// rieseguito dura 1,3 s da solo, ma in una corsa intera su una macchina rallentata ha preso 6,2 s, e il limite di 5 s di
// Bun la dava rossa senza un difetto.
test("una fetta non porta alla fine un caso di un milione di azioni, e dura poco più del tempo dato", () => {
  const p = progettoDi("troppi-passi.algo");
  const t = new TuttiICasi(p, tetti);
  const inizio = performance.now();
  t.fetta(() => performance.now(), 8);
  const durata = performance.now() - inizio;
  console.log(`la prima fetta di 8 ms: ${durata.toFixed(1)} ms, casi finiti ${t.eseguiti} su ${t.totale}`);
  expect({ finita: t.finita, eseguiti: t.eseguiti }).toEqual({ finita: false, eseguiti: 0 });
  // L'avvio del caso (il controllo statico) sta nella prima fetta: il margine lo tiene.
  expect(durata).toBeLessThan(100);
  let fette = 1;
  while (!t.finita) {
    t.fetta(() => performance.now(), 8);
    fette++;
  }
  console.log(`fette fino alla fine: ${fette}`);
  expect(fette).toBeGreaterThan(5);
  expect(t.esiti).toEqual([eseguiCaso(p, p.test_cases![0]!, tetti)]);
}, 30_000);

test("più casi brevi in una fetta, contati dall'avanzamento, con gli esiti della riga di comando", () => {
  const p = progettoDi("lettura-intero.algo");
  expect(p.test_cases!.length).toBe(2);
  const t = new TuttiICasi(p, tetti);
  expect({ eseguiti: t.eseguiti, totale: t.totale }).toEqual({ eseguiti: 0, totale: 2 });
  t.fetta(() => performance.now(), 1000);
  expect({ finita: t.finita, eseguiti: t.eseguiti }).toEqual({ finita: true, eseguiti: 2 });
  expect(t.esiti).toEqual(p.test_cases!.map((c) => eseguiCaso(p, c, tetti)));
});

test("fermata a metà: gli esiti dei casi finiti restano, gli altri non ci sono", () => {
  const p = progettoDi("lettura-intero.algo");
  const t = new TuttiICasi(p, tetti);
  // Fette di durata zero: un'azione alla volta, fino alla fine del primo caso.
  let fette = 0;
  while (t.eseguiti === 0) {
    t.fetta(() => performance.now(), 0);
    fette++;
  }
  expect(fette).toBeGreaterThan(1);
  expect({ eseguiti: t.eseguiti, finita: t.finita }).toEqual({ eseguiti: 1, finita: false });
  expect(t.esiti.length).toBe(2);
  expect(t.esiti[0]).toEqual(eseguiCaso(p, p.test_cases![0]!, tetti));
  expect(t.esiti[1]).toBeUndefined();
});

test("solo i casi dati: il secondo, e il primo resta senza esito", () => {
  const p = progettoDi("lettura-intero.algo");
  const t = new TuttiICasi(p, tetti, [1]);
  expect({ eseguiti: t.eseguiti, totale: t.totale }).toEqual({ eseguiti: 0, totale: 1 });
  t.fetta(() => performance.now(), 1000);
  expect({ finita: t.finita, eseguiti: t.eseguiti }).toEqual({ finita: true, eseguiti: 1 });
  expect(t.esiti).toEqual([undefined, eseguiCaso(p, p.test_cases![1]!, tetti)]);
});

test("la ricorsione: ogni caso della tappa 4 ha l'esito della riga di comando", () => {
  const cartella = new URL("../../casi/tappa-4/", import.meta.url);
  const file = readdirSync(cartella).filter((f) => f.endsWith(".algo"));
  let casi = 0;
  for (const f of file) {
    const r = apri(readFileSync(new URL(f, cartella), "utf8"));
    if (!r.ok) throw new Error(`${f} non si apre`);
    const t = new TuttiICasi(r.progetto, tetti);
    while (!t.finita) t.fetta(() => 0, Infinity);
    const attesi = (r.progetto.test_cases ?? []).map((c) => eseguiCaso(r.progetto, c, tetti));
    expect({ f, esiti: t.esiti }).toEqual({ f, esiti: attesi });
    expect({ f, fuori: t.esiti.filter((e) => e === undefined || e.fuoriTappa).length }).toEqual({ f, fuori: 0 });
    casi += t.totale;
  }
  console.log(`la tappa 4 con «Esegui tutti»: file ${file.length}, casi ${casi}`);
  expect({ file: file.length, casi }).toEqual(confermato("esegui tutti - file e casi della tappa 4", { file: file.length, casi }));
  // Due volte ciascuno dei due casi al milione di passi (qui e con la riga di comando).
}, 60_000);
