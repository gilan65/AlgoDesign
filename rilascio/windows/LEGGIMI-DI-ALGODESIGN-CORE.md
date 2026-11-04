# Il nucleo di AlgoDesign per Node {{versione}}

`algodesign-core.cjs` è il nucleo di AlgoDesign in un solo file, senza interfaccia: serve per aprire, controllare e tradurre in codice i progetti di AlgoDesign da un'altra applicazione. Gira con Node su ogni sistema, non ha dipendenze e non legge né scrive alcun file: i testi li riceve e li restituisce.

Non serve per usare AlgoDesign, che si scarica a parte, nel suo pacchetto, `AlgoDesign-{{versione}}-windows-x64.zip`.

## Come si usa

1. Estrai lo zip: nasce la cartella `AlgoDesign-Core-{{versione}}`.
2. Carica il file con `require`, per esempio:

```js
const nucleo = require("./algodesign-core.cjs");
const { readFileSync } = require("node:fs");

const aperto = nucleo.apri(readFileSync("media.algo", "utf8"));
if (aperto.ok) {
  const codice = nucleo.genera(aperto.progetto, "python", "it");
  console.log(codice.generato ? codice.testo : codice.perche);
}
```

## Le cinque funzioni

- `apri(testo)` dà il progetto contenuto nel testo di un file `.algo`, o gli errori di apertura.
- `controlla(progetto)` dà il controllo statico del progetto, con gli errori e gli avvisi.
- `genera(progetto, linguaggio, lingua)` dà il codice del progetto, o il motivo per cui non si può generare. Il linguaggio è `pseudocodice`, `python`, `c`, `accademico` o `typescript` e la lingua è `it` o `en`: un altro valore è un'eccezione col suo nome.
- `leggiAccademico(testo, opzioni, libreria)` dà il flowchart che un testo in «Accademico» descrive, o la riga e il motivo per cui non si legge. Le opzioni e la libreria si possono omettere.
- `aggiungiAllaLibreria(dove, letto, rinomina)` aggiunge ciò che è stato letto a una libreria aperta, o a una nuova se `dove` è `{ nome }`. Il risultato porta il `testo` del file da scrivere.

## Licenza

Il nucleo è di Giuseppe Lancellotti, con licenza MIT (il file `LICENSE`); questo testo ha licenza Creative Commons Attribuzione 4.0 Internazionale (il file `LICENSE-DOCS`). Il file non contiene librerie di altri.
