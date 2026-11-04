# AlgoDesign: guide to reporting a malfunction

This guide is for people who use AlgoDesign, see something wrong and want to report it so that it gets fixed. It covers the whole path: how to recognise a malfunction, how to prepare the file in AlgoDesign, how to open the report on GitHub, what to write and what happens next. You do not need to know how AlgoDesign is made. How to use it is in the student guide (`STUDENT-GUIDE.md`).

## 1. The path in short

1. Right after the malfunction, without pressing Stop and without closing AlgoDesign: **Help** menu, **Save to report a malfunction…**, then **Save…** (§4).
2. If the malfunction can be repeated: **Turn on execution recording**, repeat what you did and save again (§6).
3. Open https://github.com/gilan65/AlgoDesign/issues/new, write what you did and **what you expected**, attach the file and send (§7).

AlgoDesign sends nothing on its own: it does not connect to the internet, and the file stays on your computer until you attach it.

## 2. Is it a malfunction?

Not everything that stops is a malfunction. If the program does something that cannot be done (an integer outside its range, an index outside the array, a division by zero), AlgoDesign stops the run on the block and the console tells what happened, with **Explanation** next to it. The same goes for the errors and warnings in the status bar. In these cases AlgoDesign is doing its job, and it is the program that has to change.

It is a malfunction of AlgoDesign, and worth reporting, when:

- the page “Something went wrong and the window cannot be shown” appears;
- the program gives a result different from what its rules say: following it by hand, block by block, the calculation does not match;
- the generated code does something different from the flowchart, on a calculation that respects the rules (those that break the rules are in §8 of the student guide);
- a command does not do what the guide says, or the flowchart, the trace table or a window shows something wrong;
- AlgoDesign no longer responds, or does not start;
- a text is wrong, or is in the other language.

When in doubt, report it: one report too many costs little, and whoever fixes it can answer that it is the program that has to change.

## 3. Before reporting

Three checks, which take a few minutes:

- **The version.** From the **Help** menu, **About AlgoDesign** tells yours. If the project page, https://www.lancellotti.info/AlgoDesign/, has a more recent one, try again with that one: the malfunction may already be fixed.
- **The known defects.** The release notes, the file `NOTE-DI-RILASCIO.md` (in Italian) next to the program, have the part “Difetti noti”, the known defects: those already known and not yet fixed. If yours is there, there is no need to report it, unless you have something to add.
- **The open reports.** In https://github.com/gilan65/AlgoDesign/issues search for a word of what you saw. If the same report is already there, add a comment to it with your file and with what you expected, instead of opening a new one.

To open a report you need a GitHub account, which is free and is created at https://github.com/signup. The GitHub pages are in English; the report can be written in English or in Italian.

## 4. The first file: right after the malfunction

The file comes from the run that is still open: **do not press Stop and do not close AlgoDesign**.

1. From the **Help** menu choose **Save to report a malfunction…**. The command is off while the program is advancing: wait for the end or, with Animate, pause.
2. A window opens with the **exact text** that will be written to the file. Read it (§5).
3. Press **Save…**: the Windows window suggests the name “project name - report.txt”. Choose where to save it and confirm; a message says that the file was saved.

The command is also off during “Run all” and when no run is open. If the malfunction came while you were drawing or changing the data, run the program with F5, then use the command: the file carries the project as it is now. If the project has errors the run does not start: first turn on recording (§6), then press F5, and the command turns on.

**If the page “Something went wrong…” appears** the menu is no longer there, and the command is a button of the page, with the same name. Use it before closing: the errors of the application are only in memory, and they are lost on closing. If the page says that there are unsaved changes, also save the project with **Save as**. Then close AlgoDesign and open it again.

## 5. What is in the file, and who will read it

The file is a text, and it contains:

- the whole project: name, author, description, notes, data, flowchart, procedures, functions and test cases;
- the values typed in the console, those changed by hand, what the program wrote and the outcome;
- the errors of the application;
- the version of AlgoDesign, the language, the operating system and the five values of the Settings that can change the result.

It does not contain file paths, your user name or the other Settings.

**A report is public.** Anyone can read it and download the file, even without an account, and only the owner of the repository can delete it. So before saving, read the text in the window again. If the project has your name in the author field, personal data in the notes or in the strings, or work you do not want to show, make a copy with **Save as**, remove from it what you do not want to publish, check that the malfunction is still there and save the file from that copy. A smaller program that shows the same malfunction is also the easiest to fix.

## 6. The second file: repeating the malfunction while recording

The first file has a single run, the last one. If the malfunction can be repeated, a second file tells more: every run since recording was turned on, each with the project of that moment, and the errors of the application that came during each one.

1. From the **Help** menu choose **Turn on execution recording** (or **Turn on recording** in the window of §4). “Recording” appears in the status bar.
2. Repeat what you did, even several times and even changing the project: the status bar counts the runs (“Recording: 3 executions”). Only the last 20 are kept; “Run all” is not recorded.
3. From the **Help** menu choose **Save to report a malfunction…**: the window says how many runs it contains. Save with a name different from that of the first file.

Attach **the second file if the malfunction happened again, otherwise the first**.

Recording is only in memory: nothing is written to disk until you save. Saving does not turn it off. **Turn off execution recording**, in the same menu, turns it off and discards the runs without asking for confirmation: save first. It turns off by itself when AlgoDesign closes, and it is always off at startup.

## 7. The report on GitHub

1. Open https://github.com/gilan65/AlgoDesign/issues/new in the browser and sign in with your account.
2. In the title field (**Title**) write in one line what happens: “The trace table shows 8 where the program writes 7”, not “It doesn't work”.
3. In the description box write what you did, what you expected and what happened (the example is below).
4. Attach the file: drag it into the description box, or use the command to add a file below the box. GitHub accepts `.txt` files up to 25 MB, and the AlgoDesign file fits. If a screenshot helps to understand, attach it the same way.
5. Read it again and confirm with the button at the bottom of the form. The report gets a number and a page of its own.

An example of a description:

```text
What I did: I opened the example "Average of marks", I typed 7, 11, 5 and 8 and I pressed F5.
What I expected: the average 6, because 11 is not a valid mark.
What happened: it wrote 7.
```

**The sentence about what you expected is the most important.** The file says what happened, not what should have happened: a program that writes 7 instead of 6 looks fine to someone who reads only the file, and when run again it always writes 7.

## 8. After sending

Whoever fixes it reads your sentence and runs the file again, to see what you saw. They answer on the page of the report, and GitHub notifies you according to the settings of your account: they may ask you for another try or a new file. Then one of these things happens:

- the malfunction is fixed: the report is closed, and the fix comes with a later version;
- it is a real defect that is not fixed right away: the answer says so, the defect stays among the known ones and, if it concerns people who use AlgoDesign, it appears in the release notes of the next version;
- it is the program that has to change, not AlgoDesign: the answer says where to look.

## 9. If something does not go as described here

- **AlgoDesign does not start**: there is no file, and you report it anyway in words, with the version (the name of the folder extracted from the zip), Windows 10 or 11 and what appears. First look at the requirements in the file `README.md`.
- **AlgoDesign no longer responds** and the file cannot be saved: close it, open it again and try again with recording on (§6). If it does not happen again, report it in words.
- **The file is not saved**: a message says why; choose another folder.
- **You do not have a GitHub account**: give the file and the sentence to your teacher, or to whoever gave you AlgoDesign.

## 10. License of this guide

This guide is by Giuseppe Lancellotti and is released under the Creative Commons Attribution 4.0 International license (CC BY 4.0): it can be copied, distributed and modified, also for commercial purposes, crediting the author and the license. The full text of the license is in the `LICENSE-DOCS` file.
