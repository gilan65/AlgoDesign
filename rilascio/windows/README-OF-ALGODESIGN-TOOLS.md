# The command-line tool of AlgoDesign {{versione}}

Version of {{date}}, for 64-bit Windows 10 and 11.

`algodesign-tools.exe` is an application of its own, with no windows and two commands:

- `accademico` reads a text written in “Academic”, the pseudocode of the school selections of the Italian Olympiad in Informatics, and turns it into an AlgoDesign **library**: every `function` of the text becomes a procedure or a function, which opens in AlgoDesign and runs step by step, with the trace table;
- `stampa` reads an AlgoDesign project and writes two HTML pages: one to print with two code texts side by side and one that runs the JavaScript of the program in the browser.

It needs no installation, and AlgoDesign is not needed to use it (it is needed to open the library it writes and to create the projects). AlgoDesign is downloaded separately, in its own package, `AlgoDesign-{{versione}}-windows-x64.zip`.

## How to use it

1. Extract the zip wherever you like: the folder `AlgoDesign-Tools-{{versione}}` is created.
2. In File Explorer, inside the tool's folder, type `powershell` in the address bar and press Enter: PowerShell opens in that folder (on Windows 11 you can also right-click inside the folder and choose “Open in Terminal”).
3. Type `.\algodesign-tools -h` for the help or, for example:

```sh
.\algodesign-tools accademico exercise.txt -o exercises.algo
.\algodesign-tools stampa exercise.algo --lingua en
```

Files are given with their path, or copied into the same folder. The two commands are explained in the guide to `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`, in this folder (in Italian); the options, the examples and what `accademico` prints in chapter 6 of the guide to “Academic”, `GUIDA-AD-ACCADEMICO.md` (in Italian). The tool writes only the files its command produces, and its messages are in Italian.

If you had `algodesign-accademico.exe`, the tool of the previous versions, type `accademico` after the new name; the rest of the line does not change.

## The Windows warning at the first start

The tool is not digitally signed, and Windows may warn when it is started for the first time: what to do is in the `README.md` of AlgoDesign, in its package, and it is the same.

## License

The tool is by Giuseppe Lancellotti, under the MIT license (the file `LICENSE`); the two guides are under the Creative Commons Attribution 4.0 International license (the file `LICENSE-DOCS`). The executable carries Bun inside, which runs it, with the libraries Bun uses: their licenses are in `LICENZE-DI-TERZE-PARTI.txt`.
