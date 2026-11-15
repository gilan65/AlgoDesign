# Il nucleo di AlgoDesign per Node {{versione}}

`algodesign-core.cjs` è il nucleo di AlgoDesign in un solo file, senza interfaccia: serve per aprire, controllare, tradurre in codice e disegnare i progetti di AlgoDesign da un'altra applicazione. Gira con Node su ogni sistema e anche in una pagina web, perché non usa gli oggetti di Node. Non ha dipendenze e non legge né scrive alcun file: i testi li riceve e li restituisce.

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

## In una pagina web

Il file va eseguito dentro una funzione che riceve `module` ed `exports`, come fa Node, oppure importato con un bundler: caricato con un semplice `<script>`, metterebbe i suoi nomi fra quelli della pagina. Il testo si misura con un canvas, per esempio in uno script di tipo `module`:

```js
const risposta = await fetch("algodesign-core.cjs");
const caricato = { exports: {} };
new Function("module", "exports", await risposta.text())(caricato, caricato.exports);
const nucleo = caricato.exports;

const carattere = "system-ui, sans-serif";
const canvas = document.createElement("canvas").getContext("2d");
const misura = (testo, stile) => {
  canvas.font = `${stile === "grassetto" ? "bold " : stile === "corsivo" ? "italic " : ""}15px ${carattere}`;
  return canvas.measureText(testo).width;
};

// testo: il contenuto di un file .algo
const aperto = nucleo.apri(testo);
if (aperto.ok) {
  const principale = aperto.progetto.functions.find((f) => f.kind === "main").id;
  const { svg } = nucleo.disegna(aperto.progetto, principale, "it", misura, carattere, { errori: nucleo.controlla(aperto.progetto) });
  document.body.insertAdjacentHTML("beforeend", svg);
}
```

## Le sette funzioni

- `apri(testo)` dà il progetto contenuto nel testo di un file `.algo`, o gli errori di apertura.
- `controlla(progetto)` dà il controllo statico del progetto, con gli errori e gli avvisi.
- `genera(progetto, linguaggio, lingua)` dà il codice del progetto, o il motivo per cui non si può generare. Il linguaggio è `pseudocodice`, `python`, `c`, `accademico` o `typescript` e la lingua è `it` o `en`: un altro valore è un'eccezione col suo nome.
- `leggiAccademico(testo, opzioni, libreria)` dà il flowchart che un testo in «Accademico» descrive, o la riga e il motivo per cui non si legge. Le opzioni e la libreria si possono omettere.
- `aggiungiAllaLibreria(dove, letto, rinomina)` aggiunge ciò che è stato letto a una libreria aperta, o a una nuova se `dove` è `{ nome }`. Con `ok: true` il risultato porta il `testo` del file da scrivere. Con `ok: false` porta `conflitti`, se un nome c'è già e `rinomina` è falso, oppure `rifiuto`, se il nome della libreria nuova non va o `dove` non è una libreria. Con `rinomina` vero un nome già usato prende `_2`.
- `disegna(progetto, funzione, lingua, misura, carattere, opzioni)` dà il flowchart di una funzione del progetto, indicata col suo `id`, come lo esporta AlgoDesign: `{ svg, larghezza, altezza }`. `misura(testo, stile)` dà la larghezza in pixel di un testo su una riga, scritto nel `carattere` (una famiglia CSS) a 15 pixel, normale o con lo stile `grassetto` o `corsivo`: l'SVG usa lo stesso carattere. Le opzioni si possono omettere: le forme del disegno come nelle Impostazioni di AlgoDesign, i colori (`tenue`, `contrasto` o `bianco-e-nero`), il modo (`colori`, `grigi` o `bianco-e-nero`), il fondo dei cicli e lo sfondo trasparente. Con `errori`, il risultato di `controlla`, ogni blocco segnalato ha il contorno e il bollino, in un gruppo con gli attributi `data-id`, `data-segno` e `data-codici`.
- `segnalazioni(progetto, lingua)` dà gli errori e gli avvisi del progetto come li elenca la riga di stato di AlgoDesign: per ognuno il numero del codice (`E034`), il genere, i testi (`breve`, `accaduto`, `suggerimento`), il posto in parole (`dove`) e il `blocco` che nel disegno porta il bollino, `null` per un dato o un record.

## Licenza

Il nucleo è di Giuseppe Lancellotti, con licenza MIT (il file `LICENSE`); questo testo ha licenza Creative Commons Attribuzione 4.0 Internazionale (il file `LICENSE-DOCS`). Il file non contiene librerie di altri.
