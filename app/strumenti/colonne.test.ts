// L'impaginazione di due testi su tutto il corpus, per ogni coppia del registro e per il TypeScript col suo JavaScript: ogni
// riga di ogni colonna sta nei fogli una volta sola, intera e al suo posto; nessun foglio ha più righe di quelle che può
// tenere; le righe di una fascia vengono dallo stesso blocco.
//
// Che cosa NON guarda: come il motore disegna la pagina, se una riga stampata sta nella colonna e quanti fogli escono dal
// PDF (`e2e/pagina-affiancata.e2e.ts`); gli esiti del comando (`stampa.test.ts`).
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../core/controllo/controllo";
import type { Riga } from "../core/genera/forma";
import { formaSenzaTipiDel, linguaggi, type Linguaggio } from "../core/genera/linguaggi";
import { apri } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { codiceDi } from "../ui/genera/codice";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import { fasceDelle, fogliDelleFasce, paginaAffiancata, type Foglio } from "./colonne";
import { confermato } from "./corpus";

const casi = join(import.meta.dir, "..", "casi");
const progetti: { nome: string; progetto: Progetto }[] = readdirSync(casi, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".algo"))
  .sort()
  .flatMap((f) => {
    const a = apri(readFileSync(join(casi, f), "utf8"));
    return a.ok ? [{ nome: f, progetto: a.progetto }] : [];
  });
const parole = { lingua: "it", testa: "prova", pagina: "pagina {n} di {m}" };
const misure = { colonne: 60, righe: 40 };

/** Da una colonna dei fogli, ogni riga del testo coi suoi pezzi rimessi insieme, nell'ordine in cui escono. */
const rimesse = (fogli: readonly Foglio[], lato: 0 | 1) => {
  const per = new Map<number, string[]>();
  for (const s of fogli.flat().flatMap((f) => f.lati[lato])) {
    if (s.pezzo === 0 && per.has(s.riga)) throw new Error(`la riga ${s.riga} esce due volte`);
    per.set(s.riga, [...(per.get(s.riga) ?? []), s.testo]);
  }
  return per;
};
const provaLeRighe = (righe: readonly Riga[], fogli: readonly Foglio[], lato: 0 | 1, chi: string) => {
  const per = rimesse(fogli, lato);
  const mancanti = righe.flatMap((_, i) => (per.has(i) ? [] : [i]));
  if (mancanti.length > 0) throw new Error(`${chi}: mancano le righe ${mancanti.slice(0, 5).join(", ")}`);
  righe.forEach((r, i) => {
    const insieme = per.get(i)!.join("");
    if (insieme !== r.testo.trimStart()) throw new Error(`${chi}, riga ${i + 1}: «${insieme}» invece di «${r.testo.trimStart()}»`);
  });
};
const provaIFogli = (fogli: readonly Foglio[], chi: string) => {
  fogli.forEach((f, i) => {
    const altezza = f.reduce((n, x) => n + Math.max(x.lati[0].length, x.lati[1].length), 0);
    if (altezza > misure.righe) throw new Error(`${chi}, foglio ${i + 1}: ${altezza} righe su ${misure.righe}`);
  });
};
const chiave = (r: Riga | undefined) => (r === undefined ? undefined : (r.blocco ?? (r.dato !== undefined ? `${r.funzione ?? ""}:${r.dato}` : undefined)));

describe("il TypeScript col suo JavaScript", () => {
  test("su ogni progetto del corpus che genera: ogni riga nei fogli, la riga n accanto alla riga n", () => {
    const forma = formaSenzaTipiDel("typescript")!;
    let provati = 0;
    for (const { nome, progetto: p } of progetti) {
      const a = codiceDi(p, tetti, "typescript", "it");
      const b = forma.genera(p, tetti, "it", paroleDelloPseudocodice("it"));
      if (!a.generato || !b.generato) continue;
      provati++;
      if (a.righe.length !== b.righe.length) throw new Error(`${nome}: ${a.righe.length} righe contro ${b.righe.length}`);
      const fasce = fasceDelle(a.righe, b.righe, "per-riga", []);
      const fogli = fogliDelleFasce(a.righe, b.righe, fasce, misure);
      provaLeRighe(a.righe, fogli, 0, nome);
      provaLeRighe(b.righe, fogli, 1, nome);
      provaIFogli(fogli, nome);
      for (const x of fogli.flat()) if (x.lati[0][0]?.riga !== x.lati[1][0]?.riga) throw new Error(`${nome}: la riga ${x.lati[0][0]?.riga} accanto alla ${x.lati[1][0]?.riga}`);
    }
    expect(provati).toBe(confermato("stampa - progetti col typescript e il javascript", provati));
  });
});

describe("due linguaggi a scelta", () => {
  // Ogni coppia del registro, per elementi: un linguaggio aggiunto entra da solo.
  const coppie = linguaggi.flatMap((a, i) => linguaggi.slice(i + 1).map((b) => [a.id, b.id] as [Linguaggio, Linguaggio]));
  test("le coppie sono tutte quelle del registro, ognuno con ogni altro", () => {
    for (const a of linguaggi) expect(coppie.filter((c) => c.includes(a.id)).map((c) => (c[0] === a.id ? c[1] : c[0])).sort()).toEqual(linguaggi.map((v) => v.id as Linguaggio).filter((x) => x !== a.id).sort());
  });
  const perCoppia: Record<string, number> = {};
  for (const [x, y] of coppie)
    test(`${x} e ${y}: ogni riga dei due testi nei fogli; i pezzi appaiati con la stessa provenienza`, () => {
      let provati = 0;
      let appaiate = 0;
      for (const { nome, progetto: p } of progetti) {
        const a = codiceDi(p, tetti, x, "it");
        const b = codiceDi(p, tetti, y, "it");
        if (!a.generato || !b.generato) continue;
        provati++;
        const fasce = fasceDelle(a.righe, b.righe, "per-blocco", p.functions.map((f) => f.id));
        const fogli = fogliDelleFasce(a.righe, b.righe, fasce, misure);
        provaLeRighe(a.righe, fogli, 0, `${nome} (${x})`);
        provaLeRighe(b.righe, fogli, 1, `${nome} (${y})`);
        provaIFogli(fogli, nome);
        for (const f of fasce) {
          const [s, d] = [chiave(a.righe[f.lati[0][0]!]), chiave(b.righe[f.lati[1][0]!])];
          if (s !== undefined && d !== undefined && s === d) appaiate++;
        }
      }
      perCoppia[`${x} e ${y}`] = provati;
      // Il controllo positivo dell'appaiamento: se nessuna fascia avesse la stessa provenienza, la forma scelta sarebbe spenta.
      expect(appaiate).toBeGreaterThan(provati);
    });
  test("i progetti di ogni coppia sono quelli confermati, e ci sono tutte le coppie", () => {
    expect(Object.keys(perCoppia)).toEqual(coppie.map(([x, y]) => `${x} e ${y}`));
    expect(perCoppia).toEqual(confermato("stampa - progetti per coppia di linguaggi", perCoppia));
  });
});

describe("la pagina", () => {
  const { progetto: p } = progetti.find((x) => x.nome.endsWith("tre-livelli.algo"))!;
  const g = codiceDi(p, tetti, "pseudocodice", "it");
  const c = codiceDi(p, tetti, "c", "it");
  if (!g.generato || !c.generato) throw new Error("tre-livelli non genera");
  const pagina = (testa: string) => paginaAffiancata([{ titolo: "A<b>", righe: g.righe }, { titolo: "B", righe: c.righe }], "per-blocco", p.functions.map((f) => f.id), { ...parole, testa });

  test("il testo del progetto non chiude lo stile e non diventa un tag", () => {
    const { testo } = pagina("</style><script>x</script>");
    expect(testo.match(/<\/style>/g)).toEqual(["</style>"]);
    expect(testo).not.toContain("<script>");
    expect(testo).toContain("A&lt;b&gt;");
  });

  test("la pagina è a sé: nessun indirizzo da cui scaricare qualcosa", () => {
    const { testo } = pagina("prova");
    expect(testo).not.toMatch(/\b(?:src|href)=|url\(|@import|https?:/);
  });
});
