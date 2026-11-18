# The command-line tool of AlgoDesign {{versione}}

Version of {{date}}, for macOS 13.3 or later, on Macs with Apple chips and on those with Intel processors.

`algodesign-tools` is an application of its own, with no windows and three commands:

- `accademico` reads a text written in “Academic”, the pseudocode of the school selections of the Italian Olympiad in Informatics, and turns it into an AlgoDesign **library**: every `function` of the text becomes a procedure or a function, which opens in AlgoDesign and runs step by step, with the trace table;
- `stampa` reads an AlgoDesign project and writes two HTML pages: one to print with two code texts side by side and one that runs the JavaScript of the program in the browser;
- `flowgorithm` converts Flowgorithm files (`.fprg`) into AlgoDesign projects, which open and run step by step: one file, several files or a whole folder.

It needs no installation, and AlgoDesign is not needed to use it (it is needed to open the files it writes and to create the projects). AlgoDesign is downloaded separately, in its own zip, `AlgoDesign-{{versione}}-macos-universal.zip`.

## How to use it

1. Safari extracts the zip by itself, in the Downloads folder: the folder `AlgoDesign-Tools-{{versione}}` is created. With another browser, double-click the zip in the Finder.
2. Open the Terminal (in Applications, Utilities) and go to that folder: `cd ~/Downloads/AlgoDesign-Tools-{{versione}}`.
3. Type `./algodesign-tools -h` for the help or, for example:

```sh
./algodesign-tools accademico exercise.txt -o exercises.algo
./algodesign-tools stampa exercise.algo --lingua en
./algodesign-tools flowgorithm exercise.fprg
```

Files are given with their path, in quotes if it has spaces, or copied into the same folder. The three commands are explained in the guide to `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`, in this folder (in Italian); the options, the examples and what `accademico` prints in chapter 6 of the guide to “Academic”, `GUIDA-AD-ACCADEMICO.md` (in Italian); what a Flowgorithm program becomes and what is not converted in the guide to the files of Flowgorithm, `GUIDA-AI-FILE-DI-FLOWGORITHM.md` (in Italian). The guides write the commands as on Windows, `.\algodesign-tools`: on the Mac you type `./algodesign-tools`, and the rest of the line does not change. The tool writes only the files its command produces, and its messages are in Italian.

**The first time, macOS blocks the tool**, which is not signed by Apple, and the Terminal writes `zsh: killed`. It is unblocked once:

- **from macOS 15 on** the window says “"algodesign-tools" Not Opened”, with “Move to Trash” in blue and “Done”: ⚠️ **choose “Done”**. In System Settings, “Privacy & Security”, “Security” section, next to “"algodesign-tools" was blocked…” click **“Allow Anyway”**. Type the command again: in the window “Open "algodesign-tools"?” choose **“Open Anyway”** and type the password;
- **on macOS 13 and 14** the window says that “algodesign-tools” cannot be opened, with “Show in Finder” and “OK”: choose “OK”. In System Settings, “Privacy & Security”, click **“Allow Anyway”** next to the line about “algodesign-tools” and type the password. Type the command again and, in the window that comes back, choose **“Open”**.

The first time the tool reads a file in the Downloads folder, or in Documents, macOS asks permission for the Terminal (“"Terminal" would like to access files in your Downloads folder”): choose “Allow”, or “OK”.

**On a Mac with an Apple chip** the tool uses its part for that chip. If the Terminal is opened with Rosetta, it uses the part for Intel processors instead, which works from macOS 15 on; on macOS 13 and 14 it stops with “Illegal instruction”: open the Terminal without Rosetta.

## License

The tool is by Giuseppe Lancellotti, under the MIT license (the file `LICENSE`); the three guides are under the Creative Commons Attribution 4.0 International license (the file `LICENSE-DOCS`). The executable carries Bun inside, which runs it, with the libraries Bun uses: their licenses are in `LICENZE-DI-TERZE-PARTI.txt`.
