# The command-line tool of AlgoDesign {{versione}}

Version of {{date}}, for 64-bit Linux.

`algodesign-tools` is an application of its own, with no windows and two commands:

- `accademico` reads a text written in “Academic”, the pseudocode of the school selections of the Italian Olympiad in Informatics, and turns it into an AlgoDesign **library**: every `function` of the text becomes a procedure or a function, which opens in AlgoDesign and runs step by step, with the trace table;
- `stampa` reads an AlgoDesign project and writes two HTML pages: one to print with two code texts side by side and one that runs the JavaScript of the program in the browser.

It needs no installation, and AlgoDesign is not needed to use it (it is needed to open the library it writes and to create the projects). AlgoDesign is downloaded separately, in its own archive, `AlgoDesign-{{versione}}-linux-x64.tar.gz`.

## How to use it

1. Extract the archive wherever you like (with the file manager, right-click → “Extract Here”, or with `tar xzf AlgoDesign-Tools-{{versione}}-linux-x64.tar.gz`): the folder `AlgoDesign-Tools-{{versione}}` is created.
2. Open a terminal in that folder (in the file manager, right-click inside the folder → “Open in Terminal”, or `cd AlgoDesign-Tools-{{versione}}`).
3. Type `./algodesign-tools -h` for the help or, for example:

```sh
./algodesign-tools accademico exercise.txt -o exercises.algo
./algodesign-tools stampa exercise.algo --lingua en
```

Files are given with their path, in quotes if it has spaces, or copied into the same folder. The two commands are explained in the guide to `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`, in this folder (in Italian); the options, the examples and what `accademico` prints in chapter 6 of the guide to “Academic”, `GUIDA-AD-ACCADEMICO.md` (in Italian). The two guides write the commands as on Windows, `.\algodesign-tools`: on Linux you type `./algodesign-tools`, and the rest of the line does not change. The tool writes only the files its command produces, and its messages are in Italian.

**If the terminal answers “Permission denied”**, the file has lost its execute permission, for example because it was copied from a USB stick: `chmod +x algodesign-tools`.

## License

The tool is by Giuseppe Lancellotti, under the MIT license (the file `LICENSE`); the two guides are under the Creative Commons Attribution 4.0 International license (the file `LICENSE-DOCS`). The executable carries Bun inside, which runs it, with the libraries Bun uses: their licenses are in `LICENZE-DI-TERZE-PARTI.txt`.
