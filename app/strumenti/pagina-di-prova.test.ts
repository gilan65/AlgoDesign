// La pagina di prova senza il motore: ciò che le sue promesse dicono del testo. Su ogni programma del corpus, nelle due lingue, le
// righe che il generatore segna sono tutte e sole gli `import`, e nell'esecuzione non resta nulla di Node fuori dai quattro nomi
// che la pagina porta; le righe restano al loro numero; la pagina non chiede nulla da fuori.
//
// Che cosa NON guarda: che il programma giri e dia l'esito atteso (`e2e/pagina-di-prova.e2e.ts`).
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../core/controllo/controllo";
import { formaSenzaTipiDel } from "../core/genera/linguaggi";
import { apri } from "../core/progetto/formato";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import { confermato } from "./corpus";
import { paginaDiProva, PREPARAZIONE, testiDellaPagina, testoDaEseguire } from "./pagina-di-prova";

const casi = join(import.meta.dir, "..", "casi");
const javascript = formaSenzaTipiDel("typescript")!;
const generati = readdirSync(casi, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".algo"))
  .sort()
  .flatMap((f) => {
    const a = apri(readFileSync(join(casi, f), "utf8"));
    if (!a.ok) return [];
    return (["it", "en"] as const).flatMap((lingua) => {
      const g = javascript.genera(a.progetto, tetti, lingua, paroleDelloPseudocodice(lingua));
      return g.generato ? [{ nome: `${f} ${lingua}`, lingua, titolo: a.progetto.metadata.name, righe: g.righe }] : [];
    });
  });

test("le righe segnate sono tutte e sole gli import, e nel testo eseguito Node resta solo nei nomi che la pagina porta", () => {
  const problemi: string[] = [];
  let segnate = 0;
  for (const { nome, righe } of generati) {
    for (const r of righe) {
      const eImport = /^import /.test(r.testo);
      if (eImport !== (r.delMotore === true)) problemi.push(`${nome}: «${r.testo}» ${eImport ? "non è segnata" : "è segnata"}`);
      if (r.delMotore === true) segnate++;
    }
    const testo = testoDaEseguire(righe);
    if (/\bnode:|^import /m.test(testo)) problemi.push(`${nome}: nel testo eseguito resta un import`);
    // Stesse righe: il numero nell'errore è quello del file.
    if (testo.split("\n").length !== righe.length) problemi.push(`${nome}: le righe sono cambiate di numero`);
  }
  expect(problemi.slice(0, 10)).toEqual([]);
  expect(generati.length).toBe(confermato("pagina di prova - programmi del corpus nelle due lingue", generati.length));
  // Controllo positivo: qualche riga segnata c'è, o il confronto non direbbe nulla.
  expect(segnate).toBeGreaterThan(generati.length);
  console.log(`pagina di prova: ${generati.length} programmi, ${segnate} righe segnate`);
});

test("la preparazione è una riga sola, senza commenti che mangerebbero il programma", () => {
  expect(PREPARAZIONE).not.toContain("\n");
  expect(PREPARAZIONE).not.toContain("//");
  expect(PREPARAZIONE.match(/INPUT/g)).toEqual(["INPUT"]);
});

test("la pagina è a sé: nessun indirizzo, nessun modulo, nessun `</script>` nel mezzo", () => {
  for (const { nome, lingua, titolo, righe } of generati) {
    const pagina = paginaDiProva(righe, { lingua, titolo });
    expect(pagina.match(/<script/g), nome).toEqual(["<script"]);
    expect(pagina.match(/<\/script>/g), nome).toEqual(["</script>"]);
    for (const fuori of ["src=", "href=", "@import", "url(", "fetch(", "importScripts", 'type: "module"']) expect(pagina.includes(fuori), `${nome}: ${fuori}`).toBe(false);
  }
});

test("le due lingue hanno gli stessi testi, tutti scritti e tutti diversi fra loro", () => {
  const it = testiDellaPagina.it;
  const en = testiDellaPagina.en;
  expect(Object.keys(en)).toEqual(Object.keys(it));
  for (const k of Object.keys(it) as (keyof typeof it)[]) expect(it[k].length * en[k].length).toBeGreaterThan(0);
  expect(new Set(Object.values(it)).size).toBe(Object.keys(it).length);
  expect(new Set(Object.values(en)).size).toBe(Object.keys(en).length);
});
