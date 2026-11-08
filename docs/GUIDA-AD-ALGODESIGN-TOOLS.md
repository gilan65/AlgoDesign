# AlgoDesign: guida ad `algodesign-tools`

`algodesign-tools` è lo strumento a riga di comando di AlgoDesign. È un'applicazione a sé, senza finestre, con due comandi:

- **`accademico`** legge un testo scritto in «Accademico», lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica e ne fa una libreria di AlgoDesign;
- **`stampa`** legge un progetto di AlgoDesign e scrive due pagine HTML: due testi di codice affiancati da stampare e una pagina per provare il programma nel browser.

Lo strumento scrive solo i file che il comando produce, non apre il browser e non stampa da solo. I suoi messaggi sono in italiano. Come si usa AlgoDesign è nella guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`).

## 1. Come si scarica e si avvia

Per Windows lo strumento è `algodesign-tools.exe`, in un pacchetto a parte, `AlgoDesign-Tools-0.7.0-beta.3-windows.zip`, accanto a quello di AlgoDesign. Si estrae dove si preferisce: nasce la cartella `AlgoDesign-Tools-0.7.0-beta.3` e non c'è nulla da installare. Per usarlo non servono AlgoDesign, Node o altri motori.

Si usa da **PowerShell**: in Esplora file, nella cartella dello strumento, si scrive `powershell` nella barra dell'indirizzo e si preme Invio (su Windows 11 va bene anche il tasto destro nella cartella, «Apri nel Terminale»). PowerShell non avvia un'applicazione della cartella senza `.\` davanti al nome: si scrive `.\algodesign-tools` negli esempi che seguono. I file si danno col loro percorso, fra virgolette se ha degli spazi, o si copiano nella stessa cartella.

Per Linux lo strumento è `algodesign-tools`, nell'archivio `AlgoDesign-Tools-0.7.0-beta.3-linux-x64.tar.gz`: si estrae allo stesso modo, si usa dal terminale aperto nella sua cartella e negli esempi si scrive `./algodesign-tools` al posto di `.\algodesign-tools`. Per il Mac lo strumento è lo stesso, nell'archivio `AlgoDesign-Tools-0.7.0-beta.3-macos-universal.zip`, e si usa allo stesso modo dal Terminale.

```sh
.\algodesign-tools -h
.\algodesign-tools stampa -h
.\algodesign-tools accademico -h
```

Lo strumento non è firmato digitalmente e Windows può avvisare al primo avvio: come procedere è nel `LEGGIMI.md` di AlgoDesign, nel suo pacchetto, ed è lo stesso.

Chi ha il codice di AlgoDesign e Bun scrive `bun run tools` al posto di `.\algodesign-tools`, dalla cartella `app`; i comandi e le opzioni sono gli stessi.

## 2. Il comando `accademico`

Fa di un testo in «Accademico» una libreria di AlgoDesign, che si apre e si esegue passo passo, con la tabella di traccia. Ogni `function` del testo diventa una procedura o una funzione; il codice fuori dalle funzioni diventa una procedura.

```sh
.\algodesign-tools accademico esercizio.txt -o esercizi.algo
```

Le opzioni, in breve (che cosa stampa, gli esempi e quando si ferma sono nel §6 della guida ad «Accademico», `GUIDA-AD-ACCADEMICO.md`):

| Opzione | Che cosa fa |
|---|---|
| `-l` | aggiunge a questa libreria; senza, ne nasce una nuova |
| `-o` | dove scrivere; senza, nella libreria di `-l`, oppure accanto al testo, col suo nome e `.algo` |
| `-n` | il nome della procedura che porta il codice fuori dalle funzioni; senza, il nome del file |
| `-d` | la lunghezza di un vettore che il testo non dice; senza, 10 |
| `-r` | rinomina ciò che ha un nome già usato o riservato dal flowchart, invece di fermarsi |
| `-s` | sostituisce il file d'uscita, se c'è già; senza, lo strumento si ferma |
| `-h` | mostra l'aiuto |

Chi aveva `algodesign-accademico.exe`, lo strumento delle versioni precedenti, scrive `accademico` dopo il nome nuovo; il resto della riga non cambia.

## 3. Il comando `stampa`

Legge un progetto (un file `.algo`) e scrive le pagine accanto al progetto, o nella cartella di `-o`.

```sh
.\algodesign-tools stampa media.algo
```

```text
SCRITTO media (TypeScript e JavaScript).html
SCRITTO media (prova).html
```

Sono due pagine HTML a sé: non chiedono nulla da scaricare e si aprono con un doppio clic. Un file che c'è già si sostituisce, perché la pagina si rifà dal progetto: la riga dice `SOSTITUITO` al posto di `SCRITTO`.

### La pagina da stampare

La prima pagina mette il TypeScript e il JavaScript del programma in due colonne, riga per riga: il JavaScript è lo stesso programma senza i tipi. Si apre nel browser e si stampa con Ctrl+P, su carta o in un PDF, su fogli A4 orizzontali. Ogni foglio ha in alto il nome del progetto e i nomi dei due linguaggi, in basso il numero di pagina.

### La pagina di prova

La seconda pagina esegue il JavaScript nel browser, senza nessun'altra applicazione. A sinistra c'è il codice coi numeri di riga, a destra l'input e l'output (in una finestra stretta i riquadri stanno uno sotto l'altro).

1. Nella casella **Input** si scrivono i valori **prima** di avviare, una riga per ogni lettura del programma.
2. **Esegui** avvia il programma. Ciò che scrive compare in **Output**; una riga dice se il programma è in esecuzione, se è finito o se un errore lo ha fermato.
3. **Ferma** interrompe un programma che non finisce: non c'è un limite di tempo. Oltre un milione di caratteri scritti lo ferma la pagina, che lo dice.

Se le righe dell'input finiscono prima delle letture, il programma si ferma con «input finito». Un errore si legge in fondo all'output, «Errore alla riga N: motivo»: la riga N si evidenzia nel codice ed è la stessa del programma con Node.

Il riquadro del codice si seleziona col mouse senza i numeri di riga: incollato in un file `.js`, è il programma da eseguire con Node (§8 della guida per lo studente).

La pagina è provata in **Chrome**, in **Edge** e in **Firefox**. In **Safari** non è provata: per la riga dell'errore la pagina potrebbe mostrare «?», col motivo giusto. L'input è una casella, quindi solo testo.

### Due linguaggi a scelta

Con `--linguaggi` la pagina da stampare affianca due linguaggi del codice generato, il primo a sinistra, con le righe allineate blocco per blocco: dove un blocco ha più righe in un linguaggio che nell'altro, l'altra colonna resta vuota. La pagina di prova in questo caso non si scrive.

```sh
.\algodesign-tools stampa media.algo --linguaggi pseudocodice c
```

```text
SCRITTO media (Pseudocodice e C).html
```

I linguaggi si chiamano `pseudocodice`, `python`, `c`, `accademico` e `typescript`, anche quelli non attivi nelle Impostazioni di AlgoDesign. JavaScript non si sceglie: si affianca al solo TypeScript, senza `--linguaggi`.

### Le opzioni

| Opzione | Che cosa fa |
|---|---|
| `--linguaggi` | due linguaggi, il primo a sinistra; senza, il TypeScript e il JavaScript, più la pagina di prova |
| `--lingua` | `it` o `en`: la lingua del codice, delle pagine e del nome dei file; senza, `it` |
| `-o` | la cartella dove scrivere, che deve esserci già; senza, accanto al progetto |
| `-h` | mostra l'aiuto |

Con `--lingua en` i nomi dei file sono `media (TypeScript and JavaScript).html` e `media (test).html`.

### Quando si ferma

Lo strumento non scrive nulla e si ferma con una riga `ERRORE`, per esempio se il file non si legge o non è un progetto valido, se il progetto ha errori (una riga per errore), se la cartella di `-o` non c'è, o se il programma non ci sta in «Accademico»:

```text
ERRORE media.algo non ci sta in «Accademico»: mancano 4 cose (l'elenco è nell'app, nella linguetta «Accademico»)
```

Le due pagine si scrivono insieme o per niente. Un linguaggio sconosciuto, lo stesso linguaggio scritto due volte o un'opzione sbagliata fanno scrivere il motivo e l'aiuto.

## 4. Licenza di questa guida

Questa guida è di Giuseppe Lancellotti ed è rilasciata con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): si può copiare, distribuire e modificare, anche per scopi commerciali, citando l'autore e la licenza. Il testo completo della licenza è nel file `LICENSE-DOCS`.
