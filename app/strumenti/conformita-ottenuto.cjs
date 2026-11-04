// L'ottenuto della conformità del nucleo per Node: il pacchetto indicato, sotto Node. Enumera il corpus da solo e porta il proprio
// elenco dei linguaggi, perché il pacchetto non lo esporta: una combinazione che esiste solo da una parte si vede, e una voce
// nuova del registro è rossa finché non si aggiunge qui. Non legge gli attesi e non giudica nulla.
//
//   node strumenti/conformita-ottenuto.cjs <pacchetto> <cartella del corpus> <file di uscita>
//
// Scrive `{ esportazioni, esiti }`. Le chiavi e i casi a mano sono quelli di `conformita-attesi.ts`.

const { readFileSync, readdirSync, renameSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const LINGUAGGI = ["pseudocodice", "python", "c", "accademico", "typescript"];
const LINGUE = ["it", "en"];

const [pacchetto, corpus, uscita] = process.argv.slice(2);
const m = require(resolve(pacchetto));

/** Una mappa, che in JSON sarebbe `{}` e nasconderebbe ogni differenza, con le sue voci. */
const inJson = (_, v) => (v instanceof Map ? { mappa: [...v] } : v);

/** Il corpo di un'eccezione imprevista: senza il messaggio, che V8 e JSC scrivono diverso. */
function protetto(corpo) {
  try {
    return corpo();
  } catch {
    return { eccezione: true };
  }
}

/** Il messaggio di un'eccezione voluta: il suo testo è parte del contratto. */
function eccezioneDi(corpo) {
  try {
    corpo();
    return { nessunaEccezione: true };
  } catch (e) {
    return { eccezione: e.message };
  }
}

const esiti = {};
for (const cartella of readdirSync(corpus, { withFileTypes: true }).filter((v) => v.isDirectory()).map((v) => v.name).sort())
  for (const f of readdirSync(join(corpus, cartella)).filter((n) => n.endsWith(".algo")).sort()) {
    const nome = `${cartella}/${f.slice(0, -".algo".length)}`;
    const testo = readFileSync(join(corpus, cartella, f), "utf8");
    esiti[`controlla ${nome}`] = protetto(() => {
      const aperto = m.apri(testo);
      return aperto.ok ? m.controlla(aperto.progetto) : { apriRifiuta: aperto };
    });
    for (const lingua of LINGUE)
      for (const linguaggio of LINGUAGGI) {
        const g = protetto(() => {
          const aperto = m.apri(testo);
          return aperto.ok ? m.genera(aperto.progetto, linguaggio, lingua) : { apriRifiuta: aperto };
        });
        esiti[`genera ${nome} ${linguaggio} ${lingua}`] = g;
        if (linguaggio !== "accademico" || g.generato !== true) continue;
        const letto = protetto(() => m.leggiAccademico(g.testo));
        esiti[`leggi ${nome} ${lingua}`] = letto;
        if (letto.ok) esiti[`aggiungi ${nome} ${lingua}`] = protetto(() => m.aggiungiAllaLibreria({ nome: "prova" }, letto, false));
      }
  }

// I rami che il corpus non esercita.
const funzione = (segno) => `function somma(a: integer, b: integer) → integer\n    return a ${segno} b\nend function\n`;
const letta = m.leggiAccademico(funzione("+"));
const diversa = m.leggiAccademico(funzione("-"));
const nuova = m.aggiungiAllaLibreria({ nome: "prova" }, letta, false);
const riaperta = m.apri(nuova.testo);
const programma = m.apri(readFileSync(join(corpus, "tappa-1", "arrotonda-meta.algo"), "utf8"));
esiti["caso apri rifiuta"] = m.apri("questo non è un file");
esiti["caso leggi rifiuta"] = m.leggiAccademico("function (((");
esiti["caso linguaggio sconosciuto"] = eccezioneDi(() => m.genera(programma.progetto, "inesistente", "it"));
esiti["caso lingua sconosciuta"] = eccezioneDi(() => m.genera(programma.progetto, "python", "IT"));
esiti["caso aggiungi a una nuova"] = nuova;
esiti["caso aggiungi una identica"] = m.aggiungiAllaLibreria(riaperta.progetto, letta, false);
esiti["caso aggiungi un conflitto"] = m.aggiungiAllaLibreria(riaperta.progetto, diversa, false);
esiti["caso aggiungi una rinominata"] = m.aggiungiAllaLibreria(riaperta.progetto, diversa, true);
esiti["caso aggiungi a chi non è una libreria"] = m.aggiungiAllaLibreria(programma.progetto, letta, false);
esiti["caso aggiungi con un nome vuoto"] = m.aggiungiAllaLibreria({ nome: "" }, letta, false);
// Gli argomenti facoltativi della lettura: le opzioni, e una libreria che ha già il nome di un dato del testo.
const unDatoSomma = "function uno() → integer\n    variable somma: integer\n    somma ← 1\n    return somma\nend function\n";
esiti["caso leggi con le opzioni"] = m.leggiAccademico(funzione("+"), { lingua: "en", nome: "esercizio" });
esiti["caso leggi senza la libreria"] = m.leggiAccademico(unDatoSomma);
esiti["caso leggi con la libreria"] = m.leggiAccademico(unDatoSomma, undefined, riaperta.progetto);

// `__esModule` è il segno del formato, non una funzione; un `default` invece sì, e deve vedersi.
const esportazioni = Object.keys(m).filter((k) => k !== "__esModule").sort();

// Il file nasce intero: uno a metà non esiste.
writeFileSync(`${uscita}.provvisorio`, JSON.stringify({ esportazioni, esiti }, inJson));
renameSync(`${uscita}.provvisorio`, uscita);
