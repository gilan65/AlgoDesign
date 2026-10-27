// Ciò che manca, come lo mostra la colonna del codice, e il nome che «Salva…» propone per il codice.
//
// - I testi delle specie: ognuna nelle due lingue, la frase breve fino a 80 caratteri e il suggerimento fino a 100, il
//   nome dell'operatore nelle due o in nessuna.
// - Le voci di un progetto vero del corpus (una procedura con un parametro per uscita e una Lettura, funzioni col
//   risultato reale e stringa, ciò che una funzione restituisce, dati stringa e testi fra virgolette), scritte a mano:
//   la frase, il posto e dove porta il clic; il dato del programma principale, la costante comune, il nome che è una
//   parola di «Accademico».
// - «Salva…»: i linguaggi con la stessa estensione propongono nomi diversi (lo pseudocodice «nome.txt», «Accademico»
//   «nome (Accademico).txt», in inglese «nome (Academic).txt»), per ogni estensione del registro.
//
// Che cosa NON guarda: l'elenco nella finestra e il clic che sceglie (nella prova della finestra e in
// `e2e/codice.e2e.ts`), l'ordine delle mancanze (quello del nucleo, provato in `accademico.test.ts`).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { partiDellaFine } from "../../core/disegno/impaginazione";
import { mancanzeDiAccademico } from "../../core/genera/accademico";
import { specieDelleMancanze } from "../../core/genera/forma";
import { linguaggi } from "../../core/genera/linguaggi";
import { trova } from "../../core/modifica/operazioni";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import type { Lingua } from "../../i18n/lingue";
import { testiDelleMancanze } from "../../i18n/mancanze";
import { nomeDelBlocco } from "../disegno/accessibile";
import { testiDelDisegno } from "../disegno/testi";
import { nomeDelFileDelCodice } from "./codice";
import { vociDelleMancanze } from "./mancanze";

const dizionari = { it, en } as const;

const delCorpus = (f: string): Progetto => {
  const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", `${f}.algo`), "utf8"));
  if (!a.ok) throw new Error(`${f} non si apre`);
  return a.progetto;
};

/** Il nome di un blocco o della fine di una funzione, come lo dà la finestra (`nomeIn` in `Applicazione.tsx`). */
const nomeIn = (p: Progetto, lingua: Lingua) => (id: string) => {
  const b = trova(p, id);
  if (b) return nomeDelBlocco(b, dizionari[lingua], testiDelDisegno(lingua).espressione ?? ((t) => t), p.functions);
  const f = p.functions.find((x) => x.end.id === id)!;
  return partiDellaFine(f, testiDelDisegno(lingua)).map((x) => x.testo).join("");
};

const voci = (p: Progetto, lingua: Lingua = "it") => vociDelleMancanze(mancanzeDiAccademico(p), p, lingua, dizionari[lingua], nomeIn(p, lingua));

test("i testi delle specie: ognuna nelle due lingue, la frase breve fino a 80 caratteri, il suggerimento fino a 100", () => {
  for (const l of ["it", "en"] as const) expect(Object.keys(testiDelleMancanze[l]).sort()).toEqual([...specieDelleMancanze].sort());
  const lunghe: string[] = [];
  for (const s of specieDelleMancanze) {
    const [t, e] = [testiDelleMancanze.it[s], testiDelleMancanze.en[s]];
    for (const [l, x] of [["it", t], ["en", e]] as const) {
      if (x.breve.replace("{operatore}", "converti_a_carattere").length > 80) lunghe.push(`${l} ${s} breve`);
      if (x.suggerimento.length > 100) lunghe.push(`${l} ${s} suggerimento`);
    }
    expect(e.breve.includes("{operatore}"), s).toBe(t.breve.includes("{operatore}"));
    expect([t.breve, t.suggerimento]).not.toEqual([e.breve, e.suggerimento]);
  }
  expect(lunghe).toEqual([]);
  console.log(`testi delle mancanze: ${specieDelleMancanze.length} specie × 2 lingue`);
});

test("le voci di un progetto del corpus: la frase, il posto e dove porta il clic, scritti a mano", () => {
  const p = delCorpus("tappa-3/libreria-dei-voti");
  const id = (nome: string) => p.functions.find((f) => f.name === nome)!.id;
  const tipo = (t: string) => `Il tipo ${t} non è supportato in Accademico.`;
  const virgolette = "Un testo fra virgolette è supportato solo in una Scrittura.";
  expect(voci(p).map((v) => [v.breve, v.posto, v.clic]) as unknown).toEqual([
    ["Il parametro per uscita (out) non è supportato in Accademico.", "Il dato «numero», procedura leggi_numero", { funzione: id("leggi_numero"), dato: "numero", comune: false }],
    ["La Lettura non è supportata in Accademico.", "«Lettura: numero», procedura leggi_numero", { funzione: id("leggi_numero"), blocco: "b4" }],
    ["Il tipo reale non è supportato in Accademico: ci sono solo gli interi.", "Il risultato, funzione media", { funzione: id("media") }],
    ["L'operatore converti_a_reale non è presente in Accademico.", "Ciò che restituisce, funzione media", { funzione: id("media"), fine: "b12" }],
    [tipo("stringa"), "Il risultato, funzione stelle_di", { funzione: id("stelle_di") }],
    [tipo("stringa"), "Il dato «s», funzione stelle_di", { funzione: id("stelle_di"), dato: "s", comune: false }],
    [virgolette, "«Assegnazione: s ← s + \"*\"», funzione stelle_di", { funzione: id("stelle_di"), blocco: "b14" }],
    [tipo("stringa"), "Il risultato, funzione giudizio", { funzione: id("giudizio") }],
    [tipo("stringa"), "Il dato «g», funzione giudizio", { funzione: id("giudizio"), dato: "g", comune: false }],
    [virgolette, "«Assegnazione: g ← \"voto \" + stelle_di(voto)», funzione giudizio", { funzione: id("giudizio"), blocco: "b17" }],
    [virgolette, "«Assegnazione: g ← \"non valido\"», funzione giudizio", { funzione: id("giudizio"), blocco: "b18" }],
  ]);
  // Il suggerimento è quello della specie; in inglese le parole inglesi.
  expect(voci(p)[1]!.suggerimento).toBe(testiDelleMancanze.it.lettura.suggerimento);
  expect(voci(p, "en").slice(0, 4).map((v) => [v.breve, v.posto])).toEqual([
    ["The output parameter (out) is not supported in Academic.", "The data item “numero”, procedure leggi_numero"],
    ["The Read block is not supported in Academic.", "“Read: numero”, procedure leggi_numero"],
    ["The real type is not supported in Academic: there are only integers.", "The result, function media"],
    ["The operator to_real is not present in Academic.", "What it returns, function media"],
  ]);
});

test("il dato del programma principale, la costante comune e il nome che è una parola di «Accademico»", () => {
  const principale = voci(delCorpus("tappa-1/riferimento-media-voti"));
  expect(principale[0]!.posto).toBe("Il dato «media», programma principale");
  expect(principale[0]!.clic).toMatchObject({ dato: "media", comune: false });
  const comune: Progetto = {
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "comune" },
    shared_constants: [{ name: "PI", type: "real", initial: "3.14", role: "constant" }],
    functions: [
      { id: "f1", kind: "main", data: [], body: [], end: { id: "f1-fine" } },
      { id: "f2", kind: "procedure", name: "max", data: [], body: [], end: { id: "f2-fine" } },
    ],
  } as unknown as Progetto;
  expect(voci(comune).map((v) => [v.breve, v.posto, v.clic]) as unknown).toEqual([
    ["Il tipo reale non è supportato in Accademico: ci sono solo gli interi.", "La costante comune «PI»", { funzione: "f1", dato: "PI", comune: true }],
    ["Il nome è una parola di Accademico.", "Il nome, procedura max", { funzione: "f2" }],
  ]);
});

test("«Salva…»: i linguaggi con la stessa estensione propongono nomi diversi, per ogni estensione del registro", () => {
  const distinti = (nomi: readonly string[]) => new Set(nomi).size === nomi.length;
  for (const l of ["it", "en"] as const) {
    const proposti = linguaggi.map((v) => `${nomeDelFileDelCodice("media", v.id, dizionari[l])}${v.estensione}`);
    expect(distinti(proposti), l).toBe(true);
  }
  expect(["pseudocodice", "accademico", "python", "c"].map((id) => nomeDelFileDelCodice("media", id as never, it))).toEqual(["media", "media (Accademico)", "media", "media"]);
  expect(nomeDelFileDelCodice("media", "accademico", en)).toBe("media (Academic)");
  // Controllo positivo: lo stesso nome ai due file di testo è colto.
  expect(distinti(["media.txt", "media.txt", "media.py"])).toBe(false);
  // Le estensioni ripetute nel registro: la prova ha di che provare.
  expect(linguaggi.filter((v) => v.estensione === ".txt").length).toBeGreaterThanOrEqual(2);
});
