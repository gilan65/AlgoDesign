# AlgoDesign

**English** · [Italiano](LEGGIMI.md)

**Design algorithms as flowcharts, run them step by step and translate them into pseudocode, Python, C and TypeScript.**

Version 0.7.0-beta.3 of 1 November 2026, for 64-bit Windows 10 and 11.

AlgoDesign is a teaching environment for people learning to program: first you design and test the algorithm as a flowchart, then you see how the same reasoning becomes code. It is a **local and lightweight** application: it works without internet, without installing it and without administrator rights.

Project page: https://www.lancellotti.info/AlgoDesign/

## Why AlgoDesign

Whoever starts programming has to learn two things at the same time: to reason in algorithms and to write the solution in a programming language, with its syntax, its punctuation and its error messages. Often the second task hides the first, and the student gets stuck on a missing parenthesis before even understanding what they wanted the computer to do.

AlgoDesign separates the two tasks: first you **design** the algorithm as a flowchart, **test** it and fix it; only afterwards you see how it becomes code.

## What it does

- **Data view** next to the drawing: constants and variables, each with its type (integer, real, character, string, boolean, also as an array or a matrix; a record, also in a table), its initial value and its role.
- **Flowchart editor** with the blocks used in class: start and end, assignment, read, write, selection (“If”), loops with the check at the top (“While”) and at the bottom (“Repeat”), the loops that count (“For”) and that go through an array or a string (“For each”), the call of a procedure, comment. You work with the mouse or the keyboard, also on several blocks together; errors are shown on the block and in the status bar, with the precise cause and a hint.
- **Procedures and functions**: an algorithm is split into named pieces, each in its own tab, with its data and its parameters, by value, by reference or output; a procedure does a job, a function computes a result, also a string or an array. They can call themselves (recursion), and they are imported from another project or from a libraries folder.
- **Step-by-step run**: all at once, one action at a time or animated, in and out of procedures and functions, with breakpoints; you follow the active block, type the values in the console and watch the data change in the trace table, which can be exported for a spreadsheet. The value of a data item is read with the mouse pointer on its name, or from the keyboard.
- **Test cases**: an algorithm, or one of its procedures or functions on its own, is tested on input values and expected results, like a small test, even before writing the rules; a finished run can be saved as a test case.
- **Translation** of the flowchart into pseudocode (in Italian or in English), Python, C and, if they are turned on, TypeScript and “Academic”, the pseudocode of the school selections of the Italian Olympiad in Informatics, next to the drawing, with the current line highlighted during the run; the code is copied or saved to a file. Which languages are shown, and in what order, is chosen in the Settings.
- **Printing and exporting**: the project is printed, also to a PDF, with the data, the flowcharts, the code and the test cases, also with the flowchart and the code side by side; the flowchart is exported as a PNG or SVG image.
- **Examples** ready to open and change, in groups.
- Interface in **Italian** and **English**.

Types and rules are those of the C language, plus a string type, so that the step from the flowchart to the code is natural. The generated code, however, is made to be read and does not check the calculations that break the rules (an integer outside its range, an integer division by zero, an index outside the array and a few others, listed in the release notes): AlgoDesign always stops them, the generated Python, C and TypeScript do not, and on those calculations they may give different results from each other.

How to use AlgoDesign is in the **student guide**, `STUDENT-GUIDE.md` (in Italian `GUIDA-PER-LO-STUDENTE.md`): in the package it sits next to the program, in the repository in the `docs` folder. Inside AlgoDesign the guide opens from the **Help** menu, “Student guide”, in the language of the interface. How to use “Academic” to practise for the selections is in the **guide to “Academic”**, `GUIDA-AD-ACCADEMICO.md`; the command-line tool in the **guide to `algodesign-tools`**, `GUIDA-AD-ALGODESIGN-TOOLS.md`. Both are in Italian, next to the student guide. The news of each version is in the change log, `CHANGELOG.md` (in Italian).

## Download and start

The beta versions are downloaded from the project page.

1. Download the zip and, if you like, check its fingerprint: the `.sha256` file next to the zip contains its SHA-256 code, which in PowerShell is computed with `Get-FileHash <zip name>` (PowerShell writes it in uppercase, the file in lowercase: upper and lower case do not matter).
2. Extract the zip wherever you like (the Desktop, a documents folder, a USB stick): the folder `AlgoDesign-0.7.0-beta.3` is created.
3. Open the folder and double-click `AlgoDesign.exe`.

**The command-line tool.** Next to the AlgoDesign zip there is a separate package, `AlgoDesign-Tools-0.7.0-beta.3-windows.zip`, with its fingerprint: `algodesign-tools.exe` has two commands. `accademico` reads a text written in “Academic” and turns it into an AlgoDesign library, to open and run step by step; `stampa` writes from a project a page to print with two code texts side by side and a page that tests the JavaScript in the browser. It is used from PowerShell; how is told by the `README.md` of the package and by the guide to `algodesign-tools`, which the package carries.

**The Windows warning at the first start.** AlgoDesign is not digitally signed, and Windows warns when a program downloaded from the internet without a signature is started. If the window “Windows protected your PC” appears, choose “More info” and then “Run anyway”. To avoid it, before extracting the zip open its Properties (right-click on the zip), tick “Unblock” at the bottom of the “General” tab and confirm with “OK”.

**If Windows blocks AlgoDesign without the “Run anyway” button.** It happens on a Windows 11 with “Smart App Control” turned on, which is usually there only on recently installed PCs: it blocks the programs that are not digitally signed and that Microsoft does not know, and it does not allow an exception for a single program. To use AlgoDesign on that PC the control must be turned off, in “Windows Security”, “App & browser control”. Turning it off removes that protection for all programs, not only for AlgoDesign: on a Windows 11 updated at least to April 2026 it can be turned on again whenever you want, on an older one, once turned off, it cannot be turned on again without reinstalling Windows. If the PC is not yours (for example in a lab), ask whoever manages it.

**The `data` folder.** Next to `AlgoDesign.exe` there is the `data` folder: there AlgoDesign keeps the preferences, the examples and the data of its window, and it writes nothing of its own in the user profile or in the Windows registry. To move AlgoDesign elsewhere you copy the whole folder, also onto a USB stick (tested on NTFS, exFAT and FAT32 sticks; on exFAT and FAT32 a file saved over one whose extension is written with other capitals, for example `media.ALGO`, keeps its previous name). If the `data` folder is not there, AlgoDesign uses the standard folders of the user profile.

**The windows to open and save a file** are those of Windows, not of AlgoDesign: they have the look and the language of the system, even when AlgoDesign is in another language. Before saving a project with a name that cannot be a file name, AlgoDesign suggests another name, which can be changed.

Windows itself, instead, records some things in the user registry even for a portable program: its windows to open and save a file, or to choose a folder, remember the last files and folders used (also the PDF of a print); the list of started programs remembers the path of `AlgoDesign.exe`; the WebView2 component remembers when it was used and, with printing, records a signature of its settings. These are traces of Windows, not of AlgoDesign.

## Requirements

- **64-bit Windows 10 or Windows 11.**
- **Microsoft Edge WebView2**, the Windows component that draws the AlgoDesign window: without it, AlgoDesign does not open. It is already present on Windows 11 and, almost always, on an updated Windows 10. To check whether it is there: in the Windows Settings, “Apps”, then “Installed apps” (on Windows 10 “Apps & features”), search for “WebView2”: the item is “Microsoft Edge WebView2 Runtime”. If it is missing, it can be downloaded for free from the Microsoft site, https://developer.microsoft.com/microsoft-edge/webview2/, in the “Evergreen” part. It can also be installed without administrator rights: in that case, according to Microsoft, it applies only to the user who installs it.
- **No installation and no administrator rights**: AlgoDesign also works with a user without rights, from any folder or from a USB stick.
- **Disk space**: about 20 MB (the program is 9 MB, the window data in the `data` folder grows up to about ten MB).
- A screen of at least 960 × 600 points: the window does not shrink below that size.
- No internet connection is needed.

## The trace table in a spreadsheet

“Export the table…” writes the trace table to a CSV file, which opens with a spreadsheet. The cell separator and the decimal separator are chosen in the Settings, “Trace table” tab; at first they follow the interface language: in English the comma and the point, which English Excel opens with a double click.

A cell that starts with `=`, `+`, `-` or `@` and is not a number (for example a text written by the program, such as `=1+2` or `-a`) is written in the file preceded by an apostrophe, so that the spreadsheet does not take it as a formula to compute. Microsoft Excel and LibreOffice Calc open it as text and show the apostrophe in front: `'=1+2`.

## Good to know

- This version is for Windows only.
- Not tested: shutting down or restarting Windows with unsaved changes (better save first) and a file dragged onto the window (to open it use “Open”). The browser keys that would reload the window or go back (F5, Ctrl+R, “Refresh” and “Back” of some keyboards, Alt+arrow) are stopped by AlgoDesign: F5 runs the program.
- The generated code has no limit on actions: a loop that does not end, which AlgoDesign stops after a million actions, must be stopped by hand in the generated Python, C and TypeScript.

## Reporting a malfunction

If AlgoDesign does not behave as it should, it can be reported so that it gets fixed: from the **Help** menu you save a file with what happened and you attach it to a report on GitHub, https://github.com/gilan65/AlgoDesign/issues/new, with a sentence about what you expected. AlgoDesign sends nothing on its own. The whole path is in the **guide to reporting a malfunction**, [`GUIDE-TO-REPORTING-A-MALFUNCTION.md`](docs/GUIDE-TO-REPORTING-A-MALFUNCTION.md) (in Italian [`GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md`](docs/GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md)): in the package it sits next to the program, in the repository in the `docs` folder.

## How it was developed

AlgoDesign is a *vibe coding* project: the author describes what is needed, makes the teaching decisions and checks every result, while most of the code is written by an artificial intelligence assistant. The development diary is on the site:
https://www.lancellotti.info/blog/tag/algodesign/

## For developers

### Prerequisites

- [Bun](https://bun.sh) 1.4.2 and stable [Rust](https://rustup.rs) (1.99.0).
- Windows 10 or 11 with WebView2.
- For the test run, the comparison of the generated code: a gcc and a clang (C11) and Python 3, given with the variables `ALGODESIGN_CC` (the compiler executables, separated as in the `PATH`) and `ALGODESIGN_PYTHON`, or in the file `app/.collaudo/toolchain.json` (`{ "c": [ … ], "python": "…" }`, not versioned), or found in the `PATH`; and Node.js 24, for the TypeScript and the JavaScript.
- Only for the test in the Linux container: Docker Desktop.

### Commands

All the commands are given in the `app/` folder, after `bun install`.

| What | Command |
|---|---|
| The app in development, in a window | `bun tauri dev` |
| Browsers for the interface tests (only the first time) | `bun --bun playwright install chromium webkit` |
| Test cases of the example corpus (`casi/`), or of a given project | `bun run casi`, `bun run casi <project.algo>` |
| From a text in “Academic” an AlgoDesign library (the options in chapter 6 of the guide to “Academic”) | `bun run accademico <text.txt>`, `bun run accademico -h` |
| From a project two code texts side by side and the test page (the options in the guide to `algodesign-tools`) | `bun run tools stampa <project.algo>`, `bun run tools stampa -h` |
| Test run (types, unit tests, test cases, comparison of the generated code, build, tests of the Rust shell, interface tests in Chromium) | `bun run collaudo` |
| Full test run, with the interface tests in WebKit too | `bun run collaudo --completo` |
| Comparison of the generated code with the run on the test cases | `bun run differenziale` |
| Release executable for Windows | `bun tauri build --no-bundle` → `shell/target/release/algodesign.exe` |
| Release packages for Windows: the one of AlgoDesign and the one of the command-line tool, from the same tree (folders, zips and fingerprints in `dist/` at the root; the first carries this file, `LEGGIMI.md`, the two student guides, the guide to “Academic”, the one to the tool and the two to report a malfunction from `docs/` and the release notes, the second the executable of the tool, the two guides and the two short texts; the texts are given to the tool) | `bun run pacchetto --testi ../rilascio/windows` (with `--prova` from a tree with changes, in `dist/prova/`) |
| The JSON Schema of the format, after a change to the file reader | `bun ./strumenti/schema-del-formato.ts` |

### The tests on the product

- `bun run prova-portabile`: builds the executable, starts it with and without `data` and checks language, preferences (with the menu of the languages of the generated code), the student guide opened from the Help menu, opening and saving a file given at the start, building a whole program from the interface with its test case, run from its row before and after the rules, and one with two procedures and a function, the supplied examples in their groups, running a program with the values typed in the console and exporting its trace table, without violations of the content security policy, the window answering within a second while running an array of 1000 elements, in the two forms of the table, closing the window with and without changes, the F5 key that runs and does not reload the window, exporting the flowchart in SVG and in PNG, printing to PDF from the Edge print window, and the traces, in the profile and next to the executable. The traces are searched in the folders of application data and temporary files (`%APPDATA%`, `%LOCALAPPDATA%`, `%TEMP%`): no folder of the app and no new item at their first level; it does not look inside the folders that already exist. It looks at the user registry only around printing, with three snapshots from a new profile: every change outside the background noise must be allowed (the signature of the WebView2 settings and the traces that Windows records for every program). Printing needs the user in front of the PC for four gestures (Ctrl+P, “Print…”, “Save as PDF”, “Save”): the test warns them with a window and waits for “OK”. `--senza-build` uses the executable already built, `--radice <folder>` creates the test folder elsewhere (for example on the USB stick), `--pacchetto <folder>` tests the folder composed by the package tool, copied whole.
- `bun run prova-linux` (Docker Desktop started): builds the app in an Ubuntu 24.04 container and checks the language, running a program with the values typed in the console, the window answering within a second with an array of 1000 elements, and the traces, with and without `data`.

### Technical choices, in short

- Desktop shell **Tauri 2**; interface React + TypeScript + Ark UI, with **Bun** for packages, development server, build and tests.
- The flowchart is a **syntax tree**; the core (model, type checking, interpreter, code generators) is pure TypeScript, separate from interface and shell.
- Types and semantics of **C11**, plus a `string` type.
- A project is a single `.algo` file, in JSON: the format is explained field by field in `FORMATO-FILE-ALGO.md` (in Italian), and written as a JSON Schema in `algo.schema.json`, in the `docs/` folder of the project repository.

## License

© 2026 Giuseppe Lancellotti. Two licenses, depending on the kind of content:

| Content | License | Text |
|---|---|---|
| **Code**: sources, scripts, build and test configurations | [MIT](https://opensource.org/license/mit) | [`LICENSE`](LICENSE) |
| **Documentation**: the Markdown files (`*.md`) of the repository, including manuals and guides in `docs/` | [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) | [`LICENSE-DOCS`](LICENSE-DOCS) |

AlgoDesign uses third-party libraries, each with its own license: in the package, the list and the license texts are in the file `LICENZE-DI-TERZE-PARTI.txt`.

## The name

"AlgoDesign" is the name of this project, used since 4 October 2026 by Giuseppe Lancellotti:
https://www.lancellotti.info/AlgoDesign/

The MIT license covers the **code**, not the name. Whoever distributes a modified version must give it a different name, so that nobody mistakes it for the original. They may write that it is "based on AlgoDesign", with a link to the project page.

## Author

Giuseppe Lancellotti, teacher of Computer Science: https://www.lancellotti.info
