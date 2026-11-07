// Le figure delle guide in `docs/img/`: sono tutte e sole quelle citate dai documenti di `docs/`, ogni lingua ha le
// stesse (una cartella per lingua, gli stessi nomi), e il pacchetto dell'app e l'archivio di Linux portano la guida «per
// cominciare» con la cartella delle figure, quello dello strumento no. La copia nel pacchetto (`copiaLeFigure`) si prova
// su un repository finto, coi due versi del confronto.
//
// Che cosa NON guarda: il contenuto delle figure (un'immagine vecchia resta verde: si rifà dall'app vera), le immagini
// scritte in HTML.
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cartellaDelleFigure, elencoDelloStrumento, elencoDelPacchetto, elencoDiLinux, figureCitate, guidePerCominciare } from "./elenco-del-pacchetto";
import { citateNellaCartella, copiaLeFigure, differenzeDelleFigure, fileDi } from "./figure-delle-guide";

const docs = join(import.meta.dir, "..", "..", "docs");

test("le figure di docs/img sono tutte e sole quelle citate dai documenti di docs, e le due lingue hanno le stesse", () => {
  const citate = citateNellaCartella(docs);
  const presenti = fileDi(join(docs, cartellaDelleFigure)).map((f) => `${cartellaDelleFigure}/${f}`);
  console.log(`figure: ${presenti.length} in docs/img, ${citate.length} citate`);
  expect(presenti.length).toBeGreaterThan(0);
  expect(differenzeDelleFigure(citate, presenti)).toEqual([]);
  const perLingua = (l: string) => presenti.filter((p) => p.startsWith(`img/${l}/`)).map((p) => p.slice(`img/${l}/`.length));
  expect(perLingua("it").length).toBeGreaterThan(0);
  expect(perLingua("en")).toEqual(perLingua("it"));
  expect(presenti.filter((p) => !/^img\/(it|en)\//.test(p))).toEqual([]);
  // Ogni guida cita le figure della sua lingua, e nello stesso ordine dell'altra.
  const [it, en] = guidePerCominciare.map((g) => figureCitate(readFileSync(join(docs, g), "utf8")));
  expect(it!.every((f) => f.startsWith("img/it/"))).toBe(true);
  expect(en!.every((f) => f.startsWith("img/en/"))).toBe(true);
  expect(en!.map((f) => f.slice("img/en/".length))).toEqual(it!.map((f) => f.slice("img/it/".length)));
});

test("il confronto vede una figura citata e assente e una presente e non citata", () => {
  expect(differenzeDelleFigure(["img/it/a.png", "img/it/b.png"], ["img/it/a.png", "img/it/c.png"])).toEqual(["citata e assente img/it/b.png", "presente e non citata img/it/c.png"]);
  expect(figureCitate("![una](img/it/a.png) e [un collegamento](altro.md) e ![due](img/it/b.svg)")).toEqual(["img/it/a.png", "img/it/b.svg"]);
});

test("la guida per cominciare e la cartella delle figure sono nel pacchetto dell'app e nell'archivio di Linux, non in quello dello strumento", () => {
  for (const elenco of [elencoDelPacchetto, elencoDiLinux]) for (const v of [...guidePerCominciare, `${cartellaDelleFigure}/`]) expect(elenco).toContain(v);
  for (const v of [...guidePerCominciare, `${cartellaDelleFigure}/`]) expect(elencoDelloStrumento).not.toContain(v);
});

test("la copia delle figure nel pacchetto: verde se coincidono, e vede la citata che manca e la copiata in più", () => {
  const radice = mkdtempSync(join(tmpdir(), "algodesign-figure-"));
  try {
    const repository = join(radice, "repository");
    const pacchetto = join(radice, "pacchetto");
    mkdirSync(join(repository, "docs", "img", "it"), { recursive: true });
    mkdirSync(pacchetto);
    writeFileSync(join(repository, "docs", "img", "it", "a.png"), "a");
    writeFileSync(join(pacchetto, "GUIDA.md"), "![a](img/it/a.png)\n");
    expect(copiaLeFigure(repository, pacchetto)).toEqual({ copiate: 1, citate: 1, differenze: [] });
    rmSync(join(pacchetto, "img"), { recursive: true });
    writeFileSync(join(repository, "docs", "img", "it", "b.png"), "b");
    writeFileSync(join(pacchetto, "ALTRA.md"), "![c](img/it/c.png)\n");
    expect(copiaLeFigure(repository, pacchetto).differenze).toEqual(["citata e assente img/it/c.png", "presente e non citata img/it/b.png"]);
  } finally {
    rmSync(radice, { recursive: true, force: true });
  }
});
