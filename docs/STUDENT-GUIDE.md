# AlgoDesign: student guide

This guide explains how to use AlgoDesign to design an algorithm, test it and see it translated into code. How to download and start the program is in the `README.md` file.

## 1. The idea: first the data, then the rules

In AlgoDesign an algorithm is designed in two steps, in two views side by side:

- in the **data view**, on the left, you say **what** is needed: the data, each with a name, a type and a role (an input data item, an output one, a working one);
- in the **flowchart**, on the right, you say **how** the problem is solved: the rules, that is the blocks that read, compute and write.

The words this guide uses are these: a **data item** is a constant or a variable; a **rule** is a block of the flowchart; an **action** is a step of the run (a rule being executed, or an initial value being assigned).

## 2. The window

- **The toolbar**, at the top, with the commands in groups, in working order: **Project** (a menu with New, Open, Save, Save as, Save as library…, Properties, New procedure or function…, Procedures and functions…, Import procedures and functions… and Export the table…; outside the menu there are also the Function and Save buttons), **Edit** (Undo, Redo and the commands of the chosen block), **Run** (Run, Step, Step in and Step out when the project has procedures or functions, Animate, Stop, Breakpoint, Clear points), **Views** (Data, Table, Code), and on the right **Settings** and **Help**. With the mouse pointer on a button you read its name and its key.
- **The data view**, on the left, with two tabs: “Data” and “Test cases”. The “Data” button closes and reopens it; its right edge can be dragged to widen it.
- **The flowchart**, on the right, with the zoom in the bottom bar (zoom out, the percentage, which goes back to 100% with a click, zoom in, “Fit to window”). When the project has procedures or functions, above the flowchart there is a tab for each of them (§8).
- **The status bar**, at the bottom: the file name, “modified” if there are unsaved changes, the errors and warnings of the project (a click on “Show the list” lists them, and a click on an item leads to the block or the data item), the state of the run and, at the far right, the interface language: “ITA” or “ENG”, and a click opens the menu with the two languages (the same choice as in the Settings).
- **The student guide**: from the **Help** menu, in a window on the right that stays open while you work (§11).

Every command can also be given from the keyboard: Tab moves from one element to the next, Enter opens and confirms, Esc cancels.

## 3. The first project, step by step

As an example, a program that reads a whole number and writes whether it is even or odd.

### The project

From the **Project** menu choose **New** (Ctrl+N). Write the name of the project, which is required, and, if you like, the author, a description and some notes; confirm with **Create**. The same information can be changed later with **Properties**, which also has two options that change the result: how many decimal digits a real number has when it is written (2 unless you say otherwise) and the character that fills an array of characters.

Save the project with **Save as** (Ctrl+Shift+S): the file has the `.algo` extension. From then on **Save** (Ctrl+S) writes the same file. The file takes the name of the project; if that name has characters a file name cannot have, or is a name Windows reserves (such as `CON` or `NUL`), before the Windows dialog AlgoDesign says so and suggests another name, which can be changed: **Which names can be used?** tells the rules.

### The data

In the “Data” tab press **Add a data item** and fill in the fields:

- **Name**: letters without accents, digits and the underscore, starting with a letter (`number`, `age`, not `età`), at most 63 characters; it cannot be a reserved word of C or Python (`if`, `while`, `int`, `return`…) or the name of an operator written as a word (`mod`, `length`…): this way the name goes unchanged into the generated code;
- **Type**: integer, real, character, string or boolean;
- **Shape**: single, or array with the number of elements (at most 1000);
- **Kind**: variable or constant (a constant always has a value);
- **Initial value**: optional for a variable; for an array, the list of values in braces, `{7, 8, 6}` (written without braces it works just the same);
- **Role**: input, output, input and output, or working, the initial choice. A constant has no role.

For the example a single data item is enough: `number`, integer, input. A data item is reopened with a double click or with Enter on its row; the row's menu duplicates it, moves it up or down and removes it. The **“?”** next to “Confirm” tells what to write in the fields.

A data item that no block uses, or that receives a value no block reads, has a warning: usually it is a forgotten data item, or a calculation that is not needed.

What each type means:

| Type | What it holds | Example values |
|---|---|---|
| integer | a whole number from −2 147 483 648 to 2 147 483 647 | `0`, `-15`, `2026` |
| real | a number with a fractional part, written with a point | `3.14`, `-0.5`, `2.0` |
| character | a single character, also an accented letter | `'a'`, `'è'`, `' '` |
| string | a text, at most 255 characters unless you say otherwise | `"hello"`, `"perché"` |
| boolean | true or false | `true`, `false` |

### The rules

In the flowchart, between “Start” and “End”, there is a **“+”**: with the mouse pointer on the flowchart it appears at every point where a block can be inserted. A click on the “+” opens the list of blocks:

| Block | What it does | In the field you write |
|---|---|---|
| Assignment | computes a value and gives it to a data item | the target (`sum`) and the value (`sum + mark`) |
| Read | waits for a value typed in the console and gives it to a data item | the data item to read |
| Write | writes one or more values in the console | the values, one per field, and “New line” if a new line follows |
| If | chooses between two paths | the condition |
| While | repeats its body as long as the condition is true, checking it before each round | the condition |
| Repeat | repeats its body as long as the condition is true, checking it after each round (so at least once) | the condition |
| For | repeats its body counting: an integer data item, the counter, goes from the first value to the last, one step at a time | the counter (`i`), the first and the last value (`1` and `n`), and the step if it is not 1 |
| For each | repeats its body once for each element of an array, or for each character of a string | the data item that receives the element (`mark`) and the array or the string (`marks`) |
| Procedure | calls a procedure of the project: the procedure does its job, then the run comes back here | the procedure, chosen from the list, and an argument for each of its parameters |
| Comment | a note for the reader; it is not run | the text |

A Write with several values has a field per value (**Add a value** opens another one): to write `Result = 42`, with `num` worth 42, the first field is `"Result = "` and the second `num`. The values are written one after the other just as they are, with no extra spaces: the space before 42 is there because it is inside the quotes. In the flowchart the block reads `write "Result = ", num ↵`, where `↵` means that a new line follows.

Often a Write just before a Read is its question: `write "Mark: "`, then `read mark`. In the Settings, “Appearance” tab, the box **Show the question in the Read block** (off at first) draws the two as a single block, on two lines: above, the question (`"Mark:"`; several values separated by a comma, and `↵` if it goes to a new line), below, `read mark`. It happens only when the console stays the same, that is when the Write goes to a new line or ends with a space (at the end of the last text, `"Mark: "`, or as a value on its own, `" "`). The other Writes stay separate blocks. In the fields of the Read, above the Target, there is then a field for each value of the question (**Question 1**, **Question 2**…, each with its ×), **Add a question** and **New line**. Without “New line” the value is typed on the same line, after a space AlgoDesign adds by itself. The block is moved, copied, deleted and undone all together, and between the question and the read there is no “+”: to insert a block between the two, turn the box off. Step by step the run stops first on the question and then on the read, on the same block, with the current line circled. The file and the generated code do not change: it is only another way to draw the same two blocks.

In the “If” block the **True** branch is on the right and the **False** one on the left. In loops, True means “another round”. The “For” and “For each” loops have their own chapter, §4; procedures and functions §8.

For the example:

1. insert a **Read** of the data item `number`;
2. below it, an **If** with the condition `number mod 2 == 0`;
3. in the True branch a **Write** with the value `"even"` and “New line”; in the False branch a **Write** with `"odd"` and “New line”.

A block is opened with a double click or with Enter; **Enter** confirms, **Esc** cancels. The **“?”** next to “Confirm” tells what to write in the fields of that block. If what you write has an error, under the fields the error appears in a sentence, as you type: the sentence tells the precise cause when AlgoDesign recognizes it, such as “A parenthesis is opened and never closed.” or “The name has a space.”, and this holds for expressions, names, data, arguments and loops; the same sentence is in the status bar. **Explanation** opens the hint for that cause and, when the cause is not known, the possible causes. In a block just inserted, instead, the error appears when you confirm: the fields stay open to fix it, and a second confirmation keeps the block as it is, marked in the flowchart. A block is moved by dragging it onto another “+” (or from the keyboard with Space), copied, cut and pasted onto a “+”, deleted with Del. The right mouse button on a block (or, from the keyboard, the Menu key or Shift+F10) opens its menu: Cut, Copy, Delete. **Undo** (Ctrl+Z) and **Redo** (Ctrl+Y) go back and forward by one change.

**Several blocks together.** Shift+click on another block also chooses the blocks between the two; from the keyboard, Shift+↑ and Shift+↓ widen the choice one block at a time. You choose neighboring blocks, in the same sequence: a block inside a loop or an “If” brings the choice to the loop or the “If” that contains it, with all its content. Each chosen block has the border, and a command applies to all of them in a single step: they are dragged onto a “+” (from the keyboard Space, then Tab to a “+” and Enter), cut, copied, deleted with Del, and Undo brings them all back. The right mouse button opens the menu of the chosen blocks. In the Settings (§12) the box “With a frame around them” also encloses them in a dashed frame.

### How expressions are written

- Numbers are written with a point: `3.5`; characters in single quotes, `'a'`; strings in double quotes, `"hello"`.
- The operations: `+`, `-`, `*`, `/`, and `mod` for the remainder of the division between integers. Between two integers `/` is integer division (`7 / 2` is `3`), as in C; to get `3.5` one of the two must be real (`to_real 7 / 2`).
- `+` between two strings, or between a string and a character, joins them: literals, data and elements, such as `"Hello, " + name` or `name + " " + surname`. Two characters, instead, are not joined (in C they are two numbers): to make a string of them you start from a string, `"" + c1 + c2`. A number is not joined to a string: to write it next to a text you put two values in the same Write (`"Average: "` and `average`). If the result exceeds the maximum length of the data item that receives it, the program stops.
- The comparisons: `==` (equal), `!=` (different), `<`, `<=`, `>`, `>=`. A single `=` is an error: to give a value to a data item there is the assignment.
- Conditions are combined with `and`, `or`, `not`.
- The operations written as words: `to_integer`, `to_real`, `to_character`, `to_string`, `to_array`, `length`, `absolute_value`, `square_root`, `x raised_to y`, `round`, `round_down`, `round_up`, `integer_part`, and the constant `pi`. With the interface in Italian they are written in Italian (`converti_a_intero`, `lunghezza`, …).
- An element of an array is written with its index in square brackets, starting from 0: `marks[0]`, `marks[i]`.
- As you type, a round or square bracket, a double quote or a single quote close by themselves, with the cursor in between: it happens at the end of the text, before a space, a closing or a comma, not in front of a word. Typing the closing one steps over it, ⌫ right after the opening removes both, and a selected text is enclosed. In the list of an array the brace closes by itself too. In the Settings, “Editing” tab, the box “Close them by themselves as you type” turns it off.

## 4. The “For” and “For each” loops

Many loops count: “for i going from 1 to n”, “for each mark of the class”. With the “While” such a loop needs three blocks around the body: the starting value of the counter, the condition, the increase at the end of the round. The **“For”** and **“For each”** loops write it in a single block, and in the flowchart they show inside themselves the “While” that does the same thing: they are not a new way of repeating, but a short way to write a loop you already know how to make.

### The “For” loop

In the fields of the block:

- **Counter**: an integer data item, a variable (`i`);
- **From**: the first value (`1`, or an expression such as `length word - 1`);
- **To**: the last value (`n`);
- **Step**: how much the counter changes at each round, a whole number other than 0; empty means 1, and `-1` counts backwards.

In the flowchart the “For” is a **dashed frame** with the heading on the edge (“for i from 1 to n”, “for i from 3 to 1 step -1”: step 1 is not written) and inside, one below the other, the parts of the equivalent “While”:

1. the start, `i ← 1`;
2. the diamond of the check, `i <= n` (with a negative step `i >= 1`): True means another round;
3. the body, with the blocks of the loop;
4. the increase, `i ← i + 1`, and back to the diamond.

Three rules, the same as for the “While” the frame shows:

- **the check is made again at each round**, with the values of that moment: if the body changes `n`, the next round sees the new value;
- **the counter is not changed in the body**: an assignment or a read of the counter, or another “For” with the same counter, are an error, because the loop keeps the count;
- **after the loop the counter holds the first value that makes the check false**: after “for i from 1 to 5”, `i` is 6 (if that value goes beyond the integers, the run stops with an error on the “For”).

The fields of the loop open from the heading, with a double click or with Enter, and also with a double click on the start, on the diamond or on the increase. The blocks of the body are inserted from the “+” signs inside the frame.

### The “For each” loop

In the fields of the block:

- **Element**: the data item that receives an element at each round, of the same type as the elements (`mark` for an array of integers, a character `c` for a string);
- **Array or string**: the data item to go through (`marks`, `word`).

The “For each” is a dashed frame too, with the heading “for each c in word”, and inside the “While” that does the same. The loop keeps the **position** of the element by itself, which is called `_index` (inside another “For each”, `_index2`): it is not a data item of the project, and in the generated code it has the same name. The parts are:

1. the start, `_index ← 0`;
2. the diamond, `_index < 5` for an array of 5 elements, `_index < length word` for a string;
3. the element taken, `c ← word[_index]`;
4. the body;
5. the increase, `_index ← _index + 1`.

As in the “For”, the check is made again at each round (if the body shortens the string, the loop ends sooner) and the element is not changed in the body. The fields open from the heading.

### Copying an array by its name

An array is copied into another by its name, with an assignment: `others ← marks`, if the two have the same type and the same number of elements. The copy, however, does not happen all at once: it goes one element at a time, like a “For each”. That is why in the flowchart the assignment sits in a dashed frame like the one of the loops, with the words “copy element by element” on the edge. In the **compact** form, the initial choice, the frame holds only the assignment. In the **expanded** form it holds the “While” that makes the copy, with the heading “others ← marks: copy element by element”:

1. the start, `_index ← 0`;
2. the diamond, `_index < 3` for an array of 3 elements;
3. the copy of an element, `others[_index] ← marks[_index]`;
4. the increase, `_index ← _index + 1`.

In both forms each part is an action, step by step, and the breakpoint stops “Run” at each check, as in a loop. In the trace table the `_index` column is there only with the expanded form, where the drawing shows it. The array returned by a function is also assigned by its name (`doubled_marks ← doubles(marks)`, §8), but there the result arrives ready: it is a single action, with no frame.

### Open or closed

In the Settings, “Appearance” tab, loops can be drawn in other ways; the program stays the same, only the drawing changes:

- **“For” loops**: open, as above (it is the initial choice), or **closed**, with only the heading above the body and the line going back to the top;
- **“For each” loops**: open with the element's position, as above; open **in words** (“another element in word”, “c ← next element of word”); or closed;
- **Copy of an array by its name**: compact, with only the assignment in the frame (it is the initial choice), or expanded, with the “While” that copies one element at a time;
- **Frame of the loops**: with a colored background, besides the dashed border.

### Step by step and trace table

With Step (F10) the run stops on each part of the loop: the start, each check, the element taken, the increase; the current part is highlighted like a block (with the closed loop, and for the parts the drawing in words does not show, the heading is highlighted). The breakpoint of a loop sits on the heading and stops “Run” at each check: at each round, and one last time when the check is false and the loop ends. In the trace table each part that runs has its row; with the “For each” drawn with the position, there is also the `_index` column.

### Two examples

Among the supplied examples (§11), in the “For and For each loops” group, two use these loops:

- **Word backwards** reads a word, writes it backwards with a “For” that counts down (`for i from length parola - 1 to 0 step -1`) and counts its vowels with a “For each” on the characters: with `ciao` it writes `oaic` and `Vocali: 3`;
- **Average of marks with For loops** is the “Average of marks” example with the two counting loops written as “For”: opening both examples you compare the same algorithm written in the two ways.

## 5. Running

When the project has no errors you run it:

- **Run** (F5) goes to the end, or to the next breakpoint;
- **Step** (F10) takes a single action: each press, one action;
- **Animate** moves forward by itself, at one of the three speeds chosen in the menu next to it, and it also enters the procedures and functions that are called, like Step in (§8); a click pauses it;
- **Stop** (Shift+F5) goes back to editing;
- **Breakpoint** (F9) sets or removes a breakpoint on the chosen block: a red dot on the left of the block. “Run” stops there before executing it. “Clear points” removes them all.

With procedures and functions there are also **Step in** (F11) and **Step out** (Shift+F11), to enter a call and leave it: §8.

At the start, on the right of the flowchart a panel opens with the **trace table** above and the **console** below, and the current block is highlighted in yellow with an orange border. When the program reads a data item, at the bottom of the console there is the line where you type the value: type it and press **Enter**. A value that does not fit (letters instead of a number) is pointed out, and the same read is repeated.

The **trace table** has one row per action: the number, the rule, the value of each data item after the action (the changed value is highlighted, “uninitialized” where there is no value yet), the outcome of the condition and what is written or read. The first row is “Start”; then each initial value has its own row. “Export the table…” (Project menu) writes it to a CSV file that opens with a spreadsheet.

The columns of the table are widened and narrowed by dragging the right edge of their header, and moved by dragging the header (except “#” and “Rule”); the columns of an array move together. From the keyboard: Tab to the “Rule” header, the arrows from one column to the next, and Enter (or the Menu key, or Shift+F10) opens the column's menu, with Move left, Move right, Wider and Narrower; with the mouse the same menu opens with the right button. Order and widths stay until AlgoDesign is closed, and the CSV “the same as the table” follows the order you see.

With the mouse pointer on the name of a data item in a block, a box tells its type and value; a click on the name pins it, and with a long array it can be scrolled to the last element. From the keyboard, **Shift+F9** on the block that has the focus opens the box of the block's first data item, with the focus inside; another Shift+F9 moves to the next data item, and **Esc** closes the box and goes back to the block. The box is there during the run and, once the run is over, until the project changes.

If the program does something that cannot be done (an integer leaving its range, a division by zero, an index outside the array, a data item read before it has a value), the run stops on the block, and the console tells in a sentence what happened; **Explanation**, next to it, opens the rest with a **hint** to fix it. During the run the flowchart and the data can only be looked at: to change them press Stop, or wait for the end.

## 6. Test cases: testing an algorithm

A **test case** is a test: the values the user would type in the console, in order, and the **expected output**, that is the exact text the program must write. It can be written before the rules, as soon as the data exist: this way you decide what the program must do before deciding how.

In the “Test cases” tab press **Add a test case** and fill in:

- the **name** and, if you like, a description;
- the **inputs typed at the console**, in order, each with the data item it goes to (**Add an input**);
- the **expected output**: the exact text, with a line break where the program goes to a new line.

For the even or odd example: a case with the input `7` for `number` and the expected output `odd` followed by a line break; another one with `10` and `even`.

On the row of a case, **Run** runs it like F5, with the table and the console and the case's inputs instead of the ones to type; the other button runs it **one action at a time**, like F10. **Run all** and **Run selected** run them one after the other. Next to each case a dot tells the last outcome: **green** passed, **red** failed, **yellow** if the project has changed after a red. Under the chosen case you read the differences between expected and got, with the first one marked. A case can also expect an error: after a run stopped by an error, **Expect this error** writes it into the expected result.

**A test case from a run.** When a run with F5 or F10 is over, without a test case, at the bottom of the console there is **Save the run as a test case**: a click leads to the “Test cases” tab with a new case already prepared, with the values typed in the console, each with its data item, and as expected output what the program wrote, with the error if the run stopped on an error, and with the warnings of the project. The fields of the case are open, with the suggested name (“case 3”) already selected, to be changed. **New test case from the last run** in the “Test cases” tab does the same. The case goes to the program, or to the procedure or function run on its own. While paused, after “Stop”, after a test case has run, or when the console has lost part of the output, the command in the console is not there and the one in the tab is off, and its tooltip says why; if the program or the limits change after the end, it must be run again. If a case with the same inputs and the same result already exists, AlgoDesign chooses that one and says so. In the Settings, “Editing” tab, the box **Offer to save a run as a test case**, on at first, removes the two commands.

The menu of a case's row, like that of a data item, duplicates it, moves it and removes it. Undo also brings back the tick of a case that was removed or renamed, as it was before the change; the other cases keep the tick they have.

A procedure or a function also has its own test cases, which test it on its own: §8.

## 7. The generated code

The **Code** button, in the group of the views, opens on the right of the flowchart the panel of the **generated code**, with three tabs: **Pseudocode** (in the language of the interface), **Python** and **C**. The code follows every change of the flowchart; with a project that has errors, instead of the code there is the invitation to fix them. “Code” and “Table” take turns in the same panel.

During the run with Step or with Animate the code highlights the line (or the lines) of the current block; with Run, the line where the run stops on a breakpoint or on an error. This way you see, action by action, what each block corresponds to.

The “For” and “For each” loops become, in the pseudocode, `FOR i FROM 1 TO n` … `END FOR` and `FOR EACH c IN word` … `END FOR EACH`; in Python a `while`, with the counter increased at the end of the body; in C a `for`. The “For each” goes through the array or the string with its position, `_index`, as in the open flowchart. During the run the line of the current part of the loop is highlighted: the start, the check, the element taken or the increase. How procedures and functions become code is told in §8.

**Copy** puts the code on the clipboard; **Save…** writes it to a file (`.txt`, `.py` or `.c`). The Python code runs with Python 3.9 or later; the C compiles with a C11 compiler (for example `gcc -std=c11 program.c -lm`).

The generated code is made to be read: it does not check the calculations C leaves without a rule (an integer leaving its range, an integer division by zero, an index outside the array, a real outside the range of the integers converted to an integer, a data item read before it has a value), nor a real that becomes infinite or is not a number. A comment at the top of the Python and C program says so. AlgoDesign instead always stops them, and also stops a loop that does not end, after a million actions: that is why it is worth testing the algorithm in AlgoDesign first, with its test cases.

## 8. Procedures and functions

A long algorithm reads better split into pieces, each with a name that says what it does: “read the number of marks”, “is the mark valid?”, “write the stars”. In AlgoDesign the pieces are of two kinds, and the difference lies in the problem, not in the programming language:

- a **procedure does a job**: it reads, writes, changes the data it receives. It has no result, and it is called with a block of the flowchart, the “Procedure” block;
- a **function computes a result** from the data it receives, and does nothing else: it does not read, does not write, does not change the data of whoever calls it. Its result (an integer, a real, a character, a boolean, a string or an array) is used inside an expression, like `valido(voto)` in the condition of an “If”.

A function that reads or writes is an error, with the hint to turn it into a procedure. A procedure can call other procedures and functions; a function only other functions. A procedure or a function that calls itself, directly or through others (A calls B and B calls A), uses **recursion**: §9 tells about it.

The program written so far is the **main program**: it is the one that runs first, and it calls the procedures and the functions.

### An example: the average of marks with functions

Among the supplied examples (§11), in the “Functions and procedures” group, **Average of marks with functions** is the “Average of marks” split into three pieces (the names inside the examples are in Italian):

- the procedure **leggi_numero**(*out* numero) asks how many marks to read, until the number is between 1 and 30, and gives it to whoever calls it;
- the function **valido**(voto) returns a boolean: `voto >= 1 and voto <= 10`;
- the procedure **stelle**(quante) writes as many stars as `quante` says.

The main program calls `leggi_numero(out n)` with a “Procedure” block, uses `valido(voto)` in the condition of the “If” inside the loop, and at the end calls `stelle(somma / contati)`. With the marks 7, 11, 5 and 8 it writes the same result as the “Average of marks”, plus a line of six stars.

### Creating a procedure or a function

- The **Function** button, next to “Save”, creates a function: you write the name, what it returns (the type and the shape, single or array with the number of elements; for a string the maximum length is in the “Advanced options”) and the **default value**, which takes the place of the function in expressions if one day you delete it (for a new function 0, 0.0, `' '`, `""` or false; a function that returns an array has none).
- In the flowchart, the **“+”** has the **Procedure** block, before “Comment”: in its fields you choose the procedure from the list, and at the bottom of the list **New procedure…** creates it; the block calls it, and you move to its tab.
- The **Project** menu has **New procedure or function…**, which asks what it does: “Does a job on the data it receives (procedure)” or “Computes a result from the data it receives (function)”.

A function is called by writing its name in an expression, with the arguments in parentheses: `valido(voto)`. A name that is not a function of the project is an error: AlgoDesign does not create a function from a written name, because a mistyped word would be enough.

In the flowchart a procedure starts with “Procedure **leggi_numero**(*out* numero)” and ends with “End”; a function starts with “Function *boolean* ← **valido**(voto)” and ends with “Returns voto >= 1 and voto <= 10”. What the function returns is written by opening “Returns”, with a double click or with Enter. The block that calls a procedure has two lines on its sides and an arrow: “↪ **leggi_numero**(*out* n)”. The names of procedures and functions are in bold, also inside expressions.

### Parameters: by value, *ref* and *out*

A procedure or a function has **its own data**: those of the main program are not visible there. What it needs it receives through the **parameters**, which in its data view are in the “Parameters” table, above the working data, in the order in which they are passed; for a function, below there is “Returns: …”. A parameter is created with **Add a parameter**, or by choosing for a data item the kind “parameter by value”, “parameter by reference” or “output parameter”.

- **By value** (with no word) the parameter receives **a copy**: the procedure can change it, but the data item of whoever calls stays as it was. This holds for every type, also for an array and for a string (the example “A procedure receives copies” shows it). The argument can be an expression: `stelle(somma / contati)`.
- **By reference** (*ref*) the data item **goes in and out**: the procedure uses the value it has, and what it does to the parameter it does to the data item of whoever calls. That is why the data item must already have a value when the procedure is called: if it has none it is an error, which is seen before running when no path of the flowchart gives it one, otherwise during the run, on the call.
- **Output** (*out*) the data item **only goes out**: the parameter starts without a value (reading it before giving it one is an error), and what the procedure gives it goes to the data item of whoever calls. It is the right way for a procedure that reads a value and hands it over, like `leggi_numero`.

For *ref* and for *out* the argument must be a data item that can be changed, that is a variable or an element of an array (`n`, `v[i]`), and in the drawing of the block the argument has *ref* or *out* in front of it (it is not written in the field). Only procedures have parameters by reference or output parameters.

When a data item without a value goes to a *ref* and the procedure does not use that value, because it gives it a new one before reading it on every path, under the error in the status bar there is the fix **Replace ref with out for …**: a click, or Enter, changes the parameter into *out* and removes its input from the procedure's test cases, and Undo brings everything back. If the procedure gives it a value only on some paths, or if the parameter is an array, the fix is not there: with *out* the incoming value would be lost; give the data item a value before the call. On the procedure's tab the fix names the parameter (“for numero”), elsewhere the argument as the call writes it (“for n”). It is the typical fix for a project written with an earlier version of AlgoDesign, which did not check this rule.

In the fields of the “Procedure” block there is a field per parameter, with its name and the way it receives it (“numero, output”). The arguments must be as many as the parameters, in the same order and of the right type; a real parameter by value also accepts an integer, with a warning, because the type changes without being written. Moving a parameter up or down swaps the arguments of every call; removing it asks whether to remove its argument from every call too.

A constant can be **global** (the box next to the kind): then it can be used in every procedure and function, and it appears in every tab.

### The result: a string or an array too

A function can also return a **string**, with its maximum length (255 characters unless you say otherwise), or an **array**, of the type and with the number of elements written in the function's window. In the flowchart the start says “Function array of 3 integers ← **doubles**(w)” or “Function string ← **greeting**(name)”; the length of the string is told by the data view, “Returns: string, at most 20 characters”. For an array, “Returns” has the name of an array of the function with the same type and the same size: `Returns r`.

The result goes wherever a string or the name of an array goes: in an assignment (`doubled_marks ← doubles(marks)`), as an argument (`show(doubles(marks))`), as the array of a “For each” (`for each x in doubles(marks)`: the function is called only once, at the start), and with the index, `doubles(marks)[1]` or `greeting("Bo")[6]`, first the call and then the element. Whoever receives an array always receives a copy: changing it changes nothing inside the function. A string longer than the maximum length of the result stops the run on the end of the function, before whoever calls it receives it.

### The tabs and the list

When the first procedure or function is created, above the flowchart a row of **tabs** appears: the first on the left is always “Main program”, then one for each open procedure or function. The × closes the tab (the procedure or the function stays in the project); the “+” after the last tab creates a new one. The data view and the test cases follow the tab: for a function, its data and its cases.

At the end of the row, on the right, **Procedures and functions (n) ▾** opens the list of all of them, in alphabetical order, the procedures separated from the functions, each with whoever calls it, and a search at the top: a click opens its tab.

### Renaming, changing, duplicating, deleting

The right mouse button on an item of the list or on a tab opens the menu with **Open**, **Rename…**, **Properties…**, **Duplicate** and **Delete…** (on a tab also “Close the tab”). The same commands are in the **Procedures and functions…** window of the Project menu: a table with the name, the kind, the parameters, what it returns, who calls it and the test cases, and a “⋯” at the end of each row.

- **Rename** changes the name in all the calls too.
- **Properties** changes what it returns, the default value and also what it does: a procedure can become a function, and the other way round; what no longer fits becomes an error to fix. When a function becomes a procedure, the “→ …” lines of what it returned leave the expected output of its test cases (a procedure returns nothing); in the other direction the cases stay as they were, because what the function will return is not known yet.
- **Delete** asks, lists where it is called and warns that the calls that remain will be errors. For a procedure there is the tick **Also delete all the calls**; for a function **Remove it from the expressions**, replacing it with its default value or deleting the assignments that contain it; for a function that returns an array, which has no default value, the assignments are deleted, and elsewhere the call stays, to be fixed. A second confirmation tells what is removed; in conditions the replacement is confirmed one by one.

After each of these commands **Undo** (Ctrl+Z) brings everything back as it was, and shows the tab that changed.

### Running

**Run** (F5) on the main program's tab runs the program, which goes in and out of the procedures and functions it calls; on the tab of a procedure or of a function it runs it **on its own** (further on). With the run stopped or finished, F5 starts the same run again, even from another tab; while paused it continues it.

Step by step, on a block that calls a procedure or a function:

- **Step** (F10) runs all of it, and stops on the next action (with a function inside an expression, even before on the resumption of the block: further below);
- **Step in** (F11) stops on its first action;
- **Step out** (Shift+F11) goes on until the return to whoever called it.

The “Step in” and “Step out” buttons are in the toolbar next to “Step” when the project has procedures or functions; the keys always work (when stopped, F11 starts like F10). The flowchart **follows the action**: when the run enters a procedure its tab opens, and on return it goes back to whoever calls. Breakpoints also work inside procedures and functions.

When a function is called inside an expression, the block that calls it runs in two stages: first the call, then the rest of the block, with the value the function returned. That is why, after the return, the run also stops **partway through the block**: Step on that block stops twice, first on the resumption and then on the next action; Step out from inside the function and Animate stop on the resumption. In the flowchart the block is highlighted without the tip of the incoming arrow, with the sign “↩” at the bottom right, like the “↩” row of the table; above the flowchart a message says so, for example “The function “fatt” returned 1: paused partway through “Assignment: f ← n * fatt(n - 1)” (action 11).”. With two calls in the same expression, like `double(1) + triple(2)`, the run stops after each one, and from the first resumption Step runs the whole second call, while Step in enters it. Run and breakpoints do not stop on the resumption.

At the top of the run panel, **Where you are** tells the calls in progress, for example “Main program › leggi_numero”: a click on a name shows that tab, on the block of the call.

With the mouse pointer on the name of a data item you read its type and value also inside a procedure or a function in progress; for a parameter by reference or an output parameter an extra line tells which data item it is: “Output: it is “n” of “Main program”” (for a *ref*, “By reference: …”). A read inside a procedure asks for the value with the name written in the block (“Value of “numero””) and, next to it, tells which data item of whoever calls receives it.

The same holds for the name of a **called function** in a block: during the run, with the mouse pointer on its name a box says “greeting(…)”, the type of the result and the value it returned in the last execution of that block; before the call ends there, “It has not returned a value here yet”. If the block calls it several times, the values are all there, in the order in which the calls end (“Call 1”, “Call 2”). This way you see the value the block works on: in `write greeting("Bo")[6]` the box shows “Hello Bo”, from which the block takes the character `B`.

### The trace table with procedures and functions

The table stays a single one, with one row per action also inside the calls:

- the columns are **in groups**: those of the main program, then “Condition” and “Writes”, then a group for each procedure or function, with its name at the top; the cells of a group are empty when that procedure is not in progress;
- a click on the name of a group closes it into a narrow column, with “⋯” where the procedure is in progress, colored where one of its data items changes; another click reopens it, and a closed group stays closed in the following runs too;
- the rows of each call **level** have a different background (light blue, teal, lilac, pink, then light blue again); the rows of the main program have none;
- the call is a row, “↪ leggi_numero(out n)”, and the end of a function is the row “Returns …”; when a function is called inside an expression, after the return a row “↩ …” resumes the block of whoever calls, with the outcome of the condition, what is written or the data item changed, and at the end the value the function returned: “↩ write s, " ", greeting("Bo")[6] ↵  (greeting → Hello Bo)”, for an array the elements in a row, “(doubles → 14 · 8 · 18)”. The value is in the CSV too.

The exported CSV has all the columns, also those of a closed group. In the generated code, during a call, the lines of the calls in progress at the levels above are marked too, each with the background of its level and a small bar on the left.

### A procedure or a function on its own, and its test cases

A procedure or a function can be tested **on its own**, before using it in the program: F5 on its tab. The parameters are asked in the console one at a time, like reads; next to the first element of an array the “To every element” button gives the same value to all of them. An output parameter is not asked: it starts without a value anyway. At the end the console writes the result: “→ true” for what a function returns, and for an array one line per element, “→ [0] = 4”; for a procedure, “numero = 4” for each parameter by reference or output parameter. Before these lines the console always goes to a new line: the results start on a new line, and if the procedure had already gone to a new line, or has written nothing, you see an empty line. These lines are the same in every language.

The **test cases of a procedure or of a function** are in the “Test cases” tab when its tab is shown, and they are like those of the program: a new case already has an input for each parameter that is asked, in order, followed by the reads; the expected output is what it writes, then “→ value” or “name = value”. For `valido`: the input `7` and the expected `→ true`, or `11` and `→ false`. They run like the others, one at a time or all together, with their dot. A case written with an earlier version, which gave a parameter by reference the input “no value”, now stops on the error of the *ref* without a value; in the fields of the case the “no value” box is still there on that input, so that it can be removed.

When a program (or a procedure) calls a procedure that reads into one of its working data items, or into one of its parameters by value, the values of those reads go there too: in the fields of a case the choice of the data item of an input has, after the data of the tab, a group **Working data of leggi** for each called procedure. If that data item changes name, the inputs of the cases follow it, except when another data item with the same name, in another called procedure, also receives a read: then the inputs stay as they were, and a message says so and suggests choosing the new name in the test case, where the value belonged to the renamed data item.

The name of a case of the program can contain “/” (“marks 6/7”), but it cannot be the name of a procedure or function followed by “/” and the name of one of its cases (`valido/sette`): it would be mistaken for that case, and the field says so. A file that already has such a name opens all the same.

### The generated code

In the code, procedures and functions come after the main program. In the pseudocode they are `PROCEDURE leggi_numero(out numero: integer)` and `FUNCTION boolean ← valido(voto: integer)`, which ends with `RETURNS …`, and the call of a procedure is `CALL leggi_numero(out n)`; a string or array result is written with the words of the data view, `FUNCTION array of 3 integers ← doubles(…)`. Python has no parameters by reference: a procedure returns the values of its parameters by reference and output parameters, and whoever calls it assigns them again; an output parameter is not even passed (`n = leggi_numero()`). In C a parameter by reference or an output parameter is a pointer (`void leggi_numero(int *numero)`, called with `leggi_numero(&n)`). An array passed by value is copied at the beginning of the called procedure, in Python and in C, so that the copy is really a copy; a string only in C, because in Python a string cannot be changed. For the same reason a function that returns an array gives in Python a new list (`return list(r)`); in C, which cannot return an array, the function returns a structure that contains it, and whoever calls it takes the array from it (`doubles(marks).v`; a string the same way, `.s`). The copy `others ← marks` is a real loop, one line for each of its parts, as in the expanded flowchart.

## 9. Recursion

A procedure or a function can call itself. The factorial of n is n times the factorial of n − 1, and the factorial of 1 is 1: the function “fatt” writes it exactly like that, `n * fatt(n - 1)`, and when `n <= 1` it returns 1 without calling itself any more. Every recursion has these two parts: the case in which the function no longer calls itself, and the call with a data item closer to that case. Each call in progress has its own data: while `fatt(3)` works, the `n` of `fatt(4)` is still 4 and waits for the result. Recursion can also go through other procedures or functions: “even” calls “odd”, which calls “even” again.

### Two examples

Among the supplied examples (§11), in the “Functions and procedures” group:

- **Factorial with recursion**: the main program reads `n`, computes `r ← fatt(n)` and writes `r`; the function “fatt” has an “If” with the condition `n <= 1`, and in the True branch `f ← 1`, in the False one `f ← n * fatt(n - 1)`; then it returns `f`. With 10 it writes 3628800;
- **Fibonacci sequence with recursion** reads `n` and writes the first n Fibonacci numbers, one per line: the function “fibonacci” calls itself twice, `fibonacci(n - 1) + fibonacci(n - 2)`, down to 0 and 1. Its test case “ventisei” stops: the work grows very fast with each number, and after 24 numbers it goes beyond a million actions.

AlgoDesign recognizes recursion by itself and says so, in the status bar and in the “Procedures and functions” list, under “called by”: “The function “fatt” calls itself”, or “The function “even” calls “odd”, which calls “even” again”. It is a piece of information, not an error. If the project has several recursions, the status bar tells the first and how many more there are (“, and 2 more recursions”); **Show the recursions** opens the list of all of them, above the bar, and **Hide the recursions** closes it.

### Running step by step

Each call in progress is a **level**. Step in (F11) on `fatt(n - 1)` goes down one level; Step out (Shift+F11) goes up one, stopping partway through `f ← n * fatt(n - 1)`, on the resumption (§8).

- **Where you are** tells all the calls in progress up to seven levels; with more levels it shows the first two, “… 496 calls …” and the last three. A click on “…” opens the list “The other calls”, an item per level (“Level 37: fatt”), and an item shows that call.
- In the **trace table** the group of “fatt” shows the data of the call of the action in progress, the deepest one.
- With the mouse pointer on the name of a data item you read the value of the call of the action in progress. Choosing a level in “Where you are”, you read that of the chosen level, with the line “Call at level 37 of 500”, until the run takes another action. For a parameter by reference the line also tells the level: “By reference: it is “x” of “down” at level 3”.

### When the recursion does not end

If the case that stops the recursion is missing, or if the call does not get closer to it, the calls never end. AlgoDesign stops the run on the call that would be the five hundred and first still in progress: “The procedure or function has been called 500 times without any call ending.”. Each call in progress keeps its data on the **call stack**, which has 256 KB: when each call receives copies of large arrays or strings, or gets them from the functions it calls, the run stops sooner, with “The data of the calls in progress no longer fit on the stack.”. A procedure that does not change the array it receives can take it by reference (*ref*), and then the calls do not make a copy each. Only the calls of the procedures and functions that call themselves, directly or through others, count: a program without recursion does not have these limits. A job that is too long, like the Fibonacci sequence with a large number, stops instead after a million actions, like a loop that does not end.

### The generated code

In the pseudocode and in Python the call stays `fatt(n - 1)`; in C it has an extra first argument, the line of the call: `fatt(__LINE__, n - 1)`. Unlike the other errors of §7, the generated code does check these two limits: the Python and the C count the calls in progress like AlgoDesign and stop at the same point, with the same sentence and the line of the call.

## 10. Libraries: importing procedures and functions

A well-written procedure or function is useful in several programs: `leggi_numero`, `valido`, a sort. Instead of writing it again, you **import** it: AlgoDesign copies part of another project into the open one. Afterwards, the copy belongs to the project: if the other one changes, the project does not.

### A library

A **library** is a project like the others, an `.algo` file, which collects procedures and functions to be used elsewhere (its main program can be empty, or test them). It is told apart by a mark, which is set with the box **It is a library** in the “Properties” window, under the notes, or with the command **Save as library…** of the Project menu, which ticks the box and saves with a name (starting from the libraries folder, if there is one). “Save” and “Save as” leave the mark as it is; it is removed from the box. The mark only says where the library is: procedures and functions can be imported from any project, marked or not.

### Importing

From the Project menu, **Import procedures and functions…** opens the import window (**Import…** in the “Procedures and functions…” window does the same). At the top you choose where from:

- from the **libraries folder**, divided into groups like that of the examples (§11), with the search at the top: **Choose** next to a library;
- or with **From another file…** from any project on the disk.

Below, **What to import** lists the procedures and functions of the chosen project, each with its tick (**Change** goes back to choosing the project). If two have the same name, the second stays in the list turned off, with “Another one above has the same name: only that one is imported.” below it. Ticking one, **What goes into the project** tells what goes in and why: with it also go in the procedures and functions it calls, even through others (“Goes in: … calls it.”), and the shared constants they use (“Goes in: … uses it.”). What is already in the program, identical, does not go in again. The main program of the chosen project and its test cases never go in.

If the program already has a procedure, a function or a shared constant with the same name but different, the summary says so and asks what to do:

- **Rename the imported one** (the initial choice): it goes in with a new name, suggested with `_2` at the end and changeable; inside what is imported, the new name takes the place of the old one;
- **Replace the one in the program**: it goes in instead of the one that was there, and the program's calls go to it. The summary warns if it has another heading (then the calls will need fixing), and says that the test cases of the one in the program are deleted, and that the program's results may change (also for a constant);
- **Do not import it: use the one in the program**: if it has another heading, the summary warns that the calls in what is imported will need fixing.

If after the import the program had errors it did not have before (for example a call with the wrong arguments), the summary says so below: the test cases do not run until you fix them. “Import” stays active: you can import and fix afterwards.

When test cases go in and the chosen project has in its Properties an option different from the program's (the decimal digits of reals or the fill character), the summary has a line for each one, with the two values: an imported case may not pass, and you fix its expected output, or the option in the Properties. The options of the program stay its own.

If the name already belongs to a data item or to another kind (an imported function named like a data item of the program), it can only be renamed. The box **with their use cases**, ticked at first, also brings the test cases of what goes in.

**Import** does everything in a single step: **Undo** (Ctrl+Z) removes everything that went in. When nothing goes in, because everything is already in the program, the summary says so and “Import” stays off. What goes in is added at the end of the list of procedures and functions; breakpoints do not go in.

### The libraries folder

The libraries folder is chosen in the Settings, “Paths” tab (§12): for example a folder shared with the class. At first it sits next to the examples folder, and it does not exist until the first library goes in; AlgoDesign does not supply any. A project marked as a library goes in with **Add the open project**, at the bottom of the import window, in the group chosen next to it (“My libraries”, another group that exists, or a new one with “New group…”); if the file name is already used, the new file becomes “Name (2).algo”. With a project that is not marked the command is off, and the line next to it says to tick “It is a library” in the Properties. Libraries are not deleted from the window: they are deleted from the folder, with the system.

## 11. The examples

From the **Help** menu, **Examples…** opens the examples window: the projects of a folder, divided into **groups**, one for each of its subfolders. At the first start the folder receives eleven examples supplied with AlgoDesign, in three groups (the data, procedures and functions inside them have Italian names: a project does not change with the interface language):

- **First steps**: “Average of marks”, “Even or odd”, “First square over 20”, “Factorial of 13”;
- **For and For each loops**: “Average of marks with For loops”, “Word backwards”;
- **Functions and procedures**: “Average of marks with functions”, “A procedure receives copies”, “A function that calls another”, “Factorial with recursion”, “Fibonacci sequence with recursion”.

A group is opened and closed with a click on its name; the **search** at the top finds an example by its name or its description. **Open** opens a copy of it, which is not tied to the file: to keep it use “Save as”. **Add the open project** puts it among the examples, in the group chosen next to it (“My examples”, or a new one with “New group…”). **Delete** deletes an example, and **Delete the group** deletes a group you created, with its examples (not the groups of the supplied examples): both ask first. **Restore the supplied examples** puts back the original ones, each in its group.

In a folder used by an earlier version, the supplied examples move by themselves into their groups, your files stay where they are, and the new examples arrive with “Restore the supplied examples”. The folder is chosen in the Settings, “Paths” tab (§12), next to the libraries one: for example a folder shared with the class.

From the same menu, **Student guide** opens this guide in a window on the right, in the language of the interface: on the left the chapters (a click leads to the chapter), on the right the text, with the search above it (a word, then Enter to go to the next one). The window stays open while you work: the app and its keys still work, and if the language changes the guide changes with it, staying on the same chapter. In the Settings, “Appearance” tab, it can also be moved, by dragging its title, and resized from its bottom corner. It closes with “Close” or with Esc. Finally, **About AlgoDesign** tells the version, its date and the licenses.

## 12. The Settings

The **Settings** button opens a window with six tabs; the choices apply after **Confirm** and stay after a restart:

- **Appearance**: the language (Italian or English; it can also be changed from the status bar, §2), the flowchart colors (Soft, High contrast, Black and white) and the block colors (further below), long conditions on one or two lines, the initial values shown in the flowchart below “Start” or hidden, and the initial value of an array in a list or with a single value, how the “For” and “For each” loops and their frame are drawn (§4), the frame around the selected blocks (§3), the copy of an array by its name, compact or expanded (§4), the question in the Read block (§3), the look of the toolbar buttons, the run commands in a small bar above the flowchart, the search in the guide and its window, fixed or movable (§11);
- **Editing**: where the fields of a block are written (in a box next to the block or in a panel on the right) and those of a data item (in a card below the row or in every cell), when to ask for confirmation before deleting a data item, whether brackets and quotes close by themselves as you type (§3), whether to offer to save a run as a test case (§6);
- **Limits**: the elements of an array, the characters of a string and the characters of an array of strings (elements × maximum length), which can only be lowered;
- **Paths**: the libraries folder (§10) and the examples one (§11);
- **Trace table**: how an array is shown, what the CSV file has, the columns that stay in place, the separators;
- **Console**: what a line that is too long does.

**The block colors.** In the “Appearance” tab, under “Flowchart colors”, the **Block colors** box has a row per kind: Start and end, Assignment, Procedure, Read, Write, If, Loops (the diamond of each loop), Comment and Frame of the loops. Each row has a sample block, drawn with the color it will have, and the hues to choose from: the first, **As in the set**, keeps the color of the set chosen above; then seventeen hues for the blocks (nine soft and eight deep) and eight for the line of the frame of the loops. A chosen hue holds with every set: changing the set it stays, and the other kinds take the colors of the new one. **All as in the set** brings every kind back to the color of the set. At first, in “Soft”, start and end are gray, the assignment mauve, the procedure sand, the read green, the write light blue, the “If” orange, the loops deep orange and the comment white; in “High contrast” the same colors are stronger. Yellow is not there: it is the color of the current block during the run.

## 13. License of this guide

This guide is by Giuseppe Lancellotti and is released under the Creative Commons Attribution 4.0 International license (CC BY 4.0): it can be copied, distributed and modified, also for commercial purposes, crediting the author and the license. The full text of the license is in the `LICENSE-DOCS` file.
