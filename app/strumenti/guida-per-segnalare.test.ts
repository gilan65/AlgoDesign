// La guida per segnalare un malfunzionamento dice i comandi che l'app ha e porta tutti allo stesso indirizzo: i nomi dei
// comandi vengono dai due dizionari, e un nome cambiato nell'app fa rossa la guida; il file sta nei pacchetti giusti.
//
// Che cosa NON guarda: che l'indirizzo risponda, né le pagine di GitHub, che cambiano senza avviso; le altre parole della
// guida; il comportamento dei comandi, che hanno le loro prove.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { elencoDelloStrumento, elencoDelPacchetto, elencoDiLinux, guidePerSegnalare } from "./elenco-del-pacchetto";

const radice = join(import.meta.dir, "..", "..");
const leggi = (f: string) => readFileSync(join(radice, f), "utf8").replaceAll("\r\n", "\n");
const indirizzo = "github.com/gilan65/AlgoDesign/issues/new";

/** Le voci dell'app che la guida di una lingua nomina, assenti dal testo dato. */
function comandiAssenti(testo: string, t: typeof it): string[] {
  const voci = [t.segnalaComando, t.segnalaSalva, t.segnalaAttiva, t.registraAttiva, t.registraDisattiva, t.statoInRegistrazione, riempi(t.statoInRegistrazioneMolte, { n: "3" }), t.informazioni];
  return voci.filter((v) => !testo.includes(v));
}

const guide = [
  { guida: "docs/GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md", studente: "docs/GUIDA-PER-LO-STUDENTE.md", readme: "LEGGIMI.md", testi: it },
  { guida: "docs/GUIDE-TO-REPORTING-A-MALFUNCTION.md", studente: "docs/STUDENT-GUIDE.md", readme: "README.md", testi: en as typeof it },
];

for (const { guida, studente, readme, testi } of guide) {
  test(`${guida} nomina i comandi come li chiama l'app, e ci rimandano la guida per lo studente e il README`, () => {
    const testo = leggi(guida);
    expect(comandiAssenti(testo, testi)).toEqual([]);
    // La prima frase della pagina dopo un errore nel disegno, fino alla prima parola che la guida taglia.
    expect(testo).toContain(testi.erroreInatteso.slice(0, testi.erroreInatteso.indexOf(".")));
    const nome = guida.slice("docs/".length);
    expect(leggi(studente)).toContain(`\`${nome}\``);
    expect(leggi(readme)).toContain(`(${guida})`);
    expect(leggi(studente)).toContain(testi.segnalaComando);
    expect(leggi(studente)).toContain(testi.registraAttiva);
  });

  test(`${guida}: lo stesso indirizzo nella guida, nella guida per lo studente, nel README e nella finestra`, () => {
    for (const documento of [guida, studente, readme]) expect(leggi(documento)).toContain(`https://${indirizzo}`);
    expect(testi.segnalaFrase).toContain(indirizzo);
  });
}

test("la guida è nel pacchetto di Windows e in quello di Linux, non in quello dello strumento", () => {
  expect(guidePerSegnalare.length).toBe(2);
  for (const g of guidePerSegnalare) {
    expect(elencoDelPacchetto).toContain(g);
    expect(elencoDiLinux).toContain(g);
    expect(elencoDelloStrumento).not.toContain(g);
  }
  expect(guide.map((g) => g.guida.slice("docs/".length)).sort()).toEqual([...guidePerSegnalare].sort());
});

test("il rilevatore vede un comando rinominato nell'app", () => {
  const testo = leggi(guide[0]!.guida);
  expect(comandiAssenti(testo, { ...it, segnalaComando: "Un altro nome…" })).toEqual(["Un altro nome…"]);
  expect(comandiAssenti(testo.replaceAll(it.registraAttiva, "attiva"), it)).toEqual([it.registraAttiva]);
});
