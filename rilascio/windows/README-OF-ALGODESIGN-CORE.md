# The core of AlgoDesign for Node {{versione}}

`algodesign-core.cjs` is the core of AlgoDesign in a single file, with no interface: it is used to open, check and translate into code AlgoDesign projects from another application. It runs with Node on any system, has no dependencies and neither reads nor writes any file: it receives texts and returns them.

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

## The five functions

- `apri(testo)` gives the project contained in the text of an `.algo` file, or the opening errors.
- `controlla(progetto)` gives the static check of the project, with the errors and the warnings.
- `genera(progetto, linguaggio, lingua)` gives the code of the project, or the reason why it cannot be generated. The language is `pseudocodice`, `python`, `c`, `accademico` or `typescript` and the natural language is `it` or `en`: any other value is an exception with its name.
- `leggiAccademico(testo, opzioni, libreria)` gives the flowchart that a text in “Academic” describes, or the line and the reason why it cannot be read. The options and the library can be omitted.
- `aggiungiAllaLibreria(dove, letto, rinomina)` adds what was read to an open library, or to a new one if `dove` is `{ nome }`. The result carries the `testo` of the file to write.

## License

The core is by Giuseppe Lancellotti, under the MIT license (the file `LICENSE`); this text is under the Creative Commons Attribution 4.0 International license (the file `LICENSE-DOCS`). The file contains no libraries of others.
