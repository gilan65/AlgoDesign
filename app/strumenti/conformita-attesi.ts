// Gli attesi della conformità del nucleo per Node: i sorgenti del nucleo, non impacchettati, sotto Bun, chiamati come li chiama
// lo strumento differenziale. Scrive in un file l'esito di ogni combinazione: i dati stanno nei file, mai in ciò che un
// processo stampa. Enumera il corpus da solo.
//
//   bun ./strumenti/conformita-attesi.ts <cartella del corpus> <file di uscita>
//
// Questo file non importa mai il punto d'ingresso né il suo pacchetto, o la prova si autocertifica: importa solo `node:` e i
// sorgenti del nucleo, e la prova lo controlla col parser e con una spia di testo. Per questo la logica propria dell'aggiunta
// a una libreria (che crea e salva) qui si scrive di nuovo, dalle funzioni del nucleo.

import { readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../core/controllo/controllo";
import { testoDelCodice } from "../core/genera/forma";
import { linguaggi, type VoceDelLinguaggio } from "../core/genera/linguaggi";
import type { LinguaDelCodice } from "../core/genera/nomi";
import { aggiungiAllaLibreria, leggiAccademico, type Lettura } from "../core/lettore/accademico";
import { progettoNuovo } from "../core/modifica/operazioni";
import { apri, salva } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { paroleDelloPseudocodice } from "../ui/genera/parole";

const LINGUE: readonly LinguaDelCodice[] = ["it", "en"];

const [corpus, uscita] = process.argv.slice(2);
if (corpus === undefined || uscita === undefined) throw new Error("servono la cartella del corpus e il file di uscita");

/** Il valore come lo scrive il file: una mappa, che in JSON sarebbe `{}` e nasconderebbe ogni differenza, con le sue voci. */
const inJson = (_: string, v: unknown): unknown => (v instanceof Map ? { mappa: [...v] } : v);

/** Il corpo di un'eccezione imprevista: senza il messaggio, che JSC e V8 scrivono diverso. */
const eccezione = { eccezione: true };

function protetto(corpo: () => unknown): unknown {
  try {
    return corpo();
  } catch {
    return eccezione;
  }
}

function genera(testo: string, voce: VoceDelLinguaggio, lingua: LinguaDelCodice): unknown {
  const aperto = apri(testo);
  if (!aperto.ok) return { apriRifiuta: aperto };
  const g = voce.genera(aperto.progetto, tetti, lingua, paroleDelloPseudocodice(lingua));
  return g.generato ? { generato: true, testo: testoDelCodice(g.righe) } : g;
}

/** L'aggiunta: una libreria nuova col suo nome, o una aperta; il risultato col testo del file. */
function aggiungi(dove: Progetto | { readonly nome: string }, letto: Extract<Lettura, { ok: true }>, rinomina: boolean): unknown {
  let libreria: Progetto;
  if ("nome" in dove) {
    const nuova = progettoNuovo({ name: dove.nome, library: true });
    if (!nuova.ok) return { ok: false, rifiuto: nuova.rifiuto };
    libreria = nuova.progetto;
  } else {
    if (dove.metadata.library !== true) return { ok: false, rifiuto: { motivo: "non_e_una_libreria" } };
    libreria = dove;
  }
  const a = aggiungiAllaLibreria(libreria, letto, rinomina);
  return a.ok ? { ...a, testo: salva(a.progetto) } : a;
}

const esiti: Record<string, unknown> = {};
for (const cartella of readdirSync(corpus, { withFileTypes: true }).filter((v) => v.isDirectory()).map((v) => v.name).sort())
  for (const f of readdirSync(join(corpus, cartella)).filter((n) => n.endsWith(".algo")).sort()) {
    const nome = `${cartella}/${f.slice(0, -".algo".length)}`;
    const testo = readFileSync(join(corpus, cartella, f), "utf8");
    esiti[`controlla ${nome}`] = protetto(() => {
      const aperto = apri(testo);
      return aperto.ok ? controlla(aperto.progetto, tetti) : { apriRifiuta: aperto };
    });
    for (const lingua of LINGUE)
      for (const voce of linguaggi) {
        const g = protetto(() => genera(testo, voce, lingua));
        esiti[`genera ${nome} ${voce.id} ${lingua}`] = g;
        // Il testo in «Accademico» generato si rilegge e si aggiunge a una libreria nuova.
        const delTesto = g as { generato?: boolean; testo?: string };
        if (voce.id !== "accademico" || delTesto.generato !== true) continue;
        const letto = protetto(() => leggiAccademico(delTesto.testo!));
        esiti[`leggi ${nome} ${lingua}`] = letto;
        if ((letto as Lettura).ok) esiti[`aggiungi ${nome} ${lingua}`] = protetto(() => aggiungi({ nome: "prova" }, letto as Extract<Lettura, { ok: true }>, false));
      }
  }

// I rami che il corpus non esercita: casi fatti a mano, gli stessi del lato di Node.
const funzione = (segno: string) => `function somma(a: integer, b: integer) → integer\n    return a ${segno} b\nend function\n`;
const letta = leggiAccademico(funzione("+")) as Extract<Lettura, { ok: true }>;
const diversa = leggiAccademico(funzione("-")) as Extract<Lettura, { ok: true }>;
const nuova = aggiungi({ nome: "prova" }, letta, false) as { testo: string };
const riaperta = apri(nuova.testo) as Extract<ReturnType<typeof apri>, { ok: true }>;
const programma = progettoNuovo({ name: "programma" }) as { ok: true; progetto: Progetto };
esiti["caso apri rifiuta"] = apri("questo non è un file");
esiti["caso leggi rifiuta"] = leggiAccademico("function (((");
esiti["caso linguaggio sconosciuto"] = { eccezione: "linguaggio sconosciuto: inesistente" };
esiti["caso lingua sconosciuta"] = { eccezione: "lingua sconosciuta: IT" };
esiti["caso aggiungi a una nuova"] = nuova;
esiti["caso aggiungi una identica"] = aggiungi(riaperta.progetto, letta, false);
esiti["caso aggiungi un conflitto"] = aggiungi(riaperta.progetto, diversa, false);
esiti["caso aggiungi una rinominata"] = aggiungi(riaperta.progetto, diversa, true);
esiti["caso aggiungi a chi non è una libreria"] = aggiungi(programma.progetto, letta, false);
esiti["caso aggiungi con un nome vuoto"] = aggiungi({ nome: "" }, letta, false);
// Gli argomenti facoltativi della lettura: le opzioni, e una libreria che ha già il nome di un dato del testo.
const unDatoSomma = "function uno() → integer\n    variable somma: integer\n    somma ← 1\n    return somma\nend function\n";
esiti["caso leggi con le opzioni"] = leggiAccademico(funzione("+"), { lingua: "en", nome: "esercizio" });
esiti["caso leggi senza la libreria"] = leggiAccademico(unDatoSomma);
esiti["caso leggi con la libreria"] = leggiAccademico(unDatoSomma, undefined, riaperta.progetto);

// Il file nasce intero: uno a metà non esiste.
writeFileSync(`${uscita}.provvisorio`, JSON.stringify(esiti, inJson));
renameSync(`${uscita}.provvisorio`, uscita);
