# The core of AlgoDesign for Node {{versione}}

`algodesign-core.cjs` is the core of AlgoDesign in a single file, with no interface: it is used to open, check, translate into code and draw AlgoDesign projects from another application. It runs with Node on any system and also in a web page, because it does not use the objects of Node. It has no dependencies and neither reads nor writes any file: it receives texts and returns them.

It is not needed to use AlgoDesign, which is downloaded separately, in its own package, `AlgoDesign-{{versione}}-windows-x64.zip`.

## How to use it

1. Extract the zip: the folder `AlgoDesign-Core-{{versione}}` is created.
2. Load the file with `require`, for example:

```js
const core = require("./algodesign-core.cjs");
const { readFileSync } = require("node:fs");

const opened = core.apri(readFileSync("average.algo", "utf8"));
if (opened.ok) {
  const code = core.genera(opened.progetto, "python", "en");
  console.log(code.generato ? code.testo : code.perche);
}
```

## In a web page

The file must be run inside a function that receives `module` and `exports`, as Node does, or imported with a bundler: loaded with a plain `<script>`, it would put its names among those of the page. The text is measured with a canvas, for example in a script of type `module`:

```js
const response = await fetch("algodesign-core.cjs");
const loaded = { exports: {} };
new Function("module", "exports", await response.text())(loaded, loaded.exports);
const core = loaded.exports;

const font = "system-ui, sans-serif";
const canvas = document.createElement("canvas").getContext("2d");
const measure = (text, style) => {
  canvas.font = `${style === "grassetto" ? "bold " : style === "corsivo" ? "italic " : ""}15px ${font}`;
  return canvas.measureText(text).width;
};

// text: the content of an .algo file
const opened = core.apri(text);
if (opened.ok) {
  const main = opened.progetto.functions.find((f) => f.kind === "main").id;
  const { svg } = core.disegna(opened.progetto, main, "en", measure, font, { errori: core.controlla(opened.progetto) });
  document.body.insertAdjacentHTML("beforeend", svg);
}
```

## The seven functions

- `apri(testo)` gives the project contained in the text of an `.algo` file, or the opening errors.
- `controlla(progetto)` gives the static check of the project, with the errors and the warnings.
- `genera(progetto, linguaggio, lingua)` gives the code of the project, or the reason why it cannot be generated. The language is `pseudocodice`, `python`, `c`, `accademico` or `typescript` and the natural language is `it` or `en`: any other value is an exception with its name.
- `leggiAccademico(testo, opzioni, libreria)` gives the flowchart that a text in “Academic” describes, or the line and the reason why it cannot be read. The options and the library can be omitted.
- `aggiungiAllaLibreria(dove, letto, rinomina)` adds what was read to an open library, or to a new one if `dove` is `{ nome }`. With `ok: true` the result carries the `testo` of the file to write. With `ok: false` it carries `conflitti`, if a name is already there and `rinomina` is false, or `rifiuto`, if the name of the new library is not valid or `dove` is not a library. With `rinomina` true a name already in use takes `_2`.
- `disegna(progetto, funzione, lingua, misura, carattere, opzioni)` gives the flowchart of a function of the project, given by its `id`, as AlgoDesign exports it: `{ svg, larghezza, altezza }`. `misura(testo, stile)` gives the width in pixels of a text on one line, written in the `carattere` (a CSS font family) at 15 pixels, normal or with the style `grassetto` (bold) or `corsivo` (italic): the SVG uses the same font. The options can be omitted: the shapes of the drawing as in the Settings of AlgoDesign (`condizioniLunghe`, `valoriIniziali`, `valoreRipetuto`, `per`, `perOgni`, `copia`, `domanda`, with the default values `su-due-righe`, `mostrati`, `elenco`, `aperto`, `posizione`, `compatta`, `nella-scrittura`), the colors (`tenue`, `contrasto` or `bianco-e-nero`), the mode (`colori`, `grigi` or `bianco-e-nero`; another value is an exception), the background of the loops (`fondoDeiCicli`), the transparent background (`trasparente`) and `id`, the prefix of the identifiers of the SVG, to be changed for two drawings in the same page. With `errori`, the result of `controlla`, every flagged block has the colored outline and the **badge**, the round sign on the corner of the block: red with the exclamation mark for an error, ochre with the question mark for a warning. It is in a group with the attributes `data-id`, `data-segno` and `data-codici`.
- `segnalazioni(progetto, lingua)` gives the errors and the warnings of the project as the status bar of AlgoDesign lists them: for each one the number of the code (`E034`), the kind, the texts (`breve`, `accaduto`, `suggerimento`), the place in words (`dove`) and the `blocco` that carries the badge in the drawing, `null` for a data item, a record or the heading of a function. With `domanda: "nella-lettura"` the output of the question and the input that follows are a single block in the drawing, with the badge on the input: a message of the output has in `blocco` the `id` of the output. `funzione` is the `id` of the function of the block or of the data item.

## License

The core is by Giuseppe Lancellotti, under the MIT license (the file `LICENSE`); this text is under the Creative Commons Attribution 4.0 International license (the file `LICENSE-DOCS`). The file contains no libraries of others.
