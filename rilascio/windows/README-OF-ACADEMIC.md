# The “Academic” tool of AlgoDesign {{versione}}

Version of {{data}}, for 64-bit Windows 10 and 11.

`algodesign-tools.exe` reads a text written in “Academic”, the pseudocode of the school selections of the Italian Olympiad in Informatics, and turns it into an AlgoDesign **library**: every `function` of the text becomes a procedure or a function, which opens in AlgoDesign and runs step by step, with the trace table. It is a program of its own: it needs no installation, and AlgoDesign is not needed to use it (it is needed to open the library it writes). AlgoDesign is downloaded separately, in its own package, `AlgoDesign-{{versione}}-windows-x64.zip`.

## How to use it

1. Extract the zip wherever you like: the folder `AlgoDesign-Tools-{{versione}}` is created.
2. In File Explorer, inside the tool's folder, type `powershell` in the address bar and press Enter: PowerShell opens in that folder (on Windows 11 you can also right-click inside the folder and choose “Open in Terminal”).
3. Type `.\algodesign-tools accademico -h` for the help or, for a text, for example:

```sh
.\algodesign-tools accademico exercise.txt -o exercises.algo
```

The text is given with its path, or copied into the same folder. The options, the examples and what the tool prints are in chapter 6 of the guide to “Academic”, `GUIDA-AD-ACCADEMICO.md`, in this folder (in Italian). The tool writes only the files it is told to write, and its messages are in Italian.

## The Windows warning at the first start

The tool is not digitally signed, and Windows may warn when it is started for the first time: what to do is in the `README.md` of AlgoDesign, in its package, and it is the same.

## License

The tool is by Giuseppe Lancellotti, under the MIT license (the file `LICENSE`); the guide to “Academic” is under the Creative Commons Attribution 4.0 International license (the file `LICENSE-DOCS`). The executable carries Bun inside, the program that runs it, with the libraries Bun uses: their licenses are in `LICENZE-DI-TERZE-PARTI.txt`.
