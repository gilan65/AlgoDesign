// La forma senza tipi del TypeScript contro gli attesi scritti a mano (`attesi-del-javascript.ts`), e righe e provenienza
// uguali a quelle del TypeScript sui programmi scritti per le prove. Che ogni programma del corpus sia il TypeScript senza
// le annotazioni, e che dia l'output dell'interprete con Node e con Bun, lo prova il test differenziale.
//
// Che cosa queste prove NON guardano: il corpus intero (lo guarda il differenziale); la pagina nel browser.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../../core/controllo/controllo";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { formaSenzaTipiDel, linguaggi, voceDel } from "../../core/genera/linguaggi";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import { delCorpus } from "./attesi-del-javascript";
import { formeDellaTappa1, formeDellaTappa2, formeDellaTappa3, formeDelloScheletro } from "./attesi-del-typescript";
import { paroleDelloPseudocodice } from "./parole";

const lingue: readonly Lingua[] = ["it", "en"];
const leggi = (percorso: string): Progetto => {
  const r = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", percorso), "utf8"));
  if (!r.ok) throw new Error(`${percorso} non si apre`);
  return r.progetto;
};

const forma = formaSenzaTipiDel("typescript")!;
function righeDi(g: ReturnType<typeof forma.genera>, chi: string): readonly Riga[] {
  if (!g.generato) throw new Error(`${chi} non generato: ${g.perche}`);
  return g.righe;
}
const senzaTipi = (p: Progetto, l: Lingua) => righeDi(forma.genera(p, tetti, l, paroleDelloPseudocodice(l)), p.metadata.name);
const conITipi = (p: Progetto, l: Lingua) => righeDi(voceDel("typescript").genera(p, tetti, l, paroleDelloPseudocodice(l)), p.metadata.name);
/** La riga senza il suo testo: il blocco, il dato, le fasi, la funzione. */
const provenienza = ({ testo: _, ...resto }: Riga) => resto;

describe("la forma senza tipi uguale all'atteso scritto a mano", () => {
  for (const l of lingue)
    for (const [nome, atteso] of Object.entries(delCorpus))
      test(`${nome} (${l})`, () => {
        expect(testoDelCodice(senzaTipi(leggi(`${nome}.algo`), l))).toBe(atteso[l]);
      });
});

describe("la forma senza tipi nel registro", () => {
  test("la offre la voce del TypeScript, e nessun'altra: non è un linguaggio in più", () => {
    expect(linguaggi.filter((v) => formaSenzaTipiDel(v.id) !== undefined).map((v) => v.id)).toEqual(["typescript"]);
    expect(linguaggi.map((v) => v.id as string)).not.toContain(forma.id);
    expect(forma.estensione).toBe(".js");
    expect(linguaggi.map((v) => v.estensione as string)).not.toContain(forma.estensione);
  });
});

describe("le righe e la provenienza del TypeScript", () => {
  for (const [nome, p] of [["scheletro", formeDelloScheletro], ["tappa 1", formeDellaTappa1], ["tappa 2", formeDellaTappa2], ["tappa 3", formeDellaTappa3]] as const)
    test(`forme ${nome}: stesso numero di righe, stessa provenienza, ogni riga senza annotazioni`, () => {
      for (const l of lingue) {
        const [a, b] = [conITipi(p, l), senzaTipi(p, l)];
        expect(b.length).toBe(a.length);
        expect(b.map(provenienza)).toEqual(a.map(provenienza));
        // Controllo positivo: i due testi sono diversi, quindi la forma senza tipi non è il TypeScript passato com'è.
        expect(testoDelCodice(b)).not.toBe(testoDelCodice(a));
      }
    });
});
