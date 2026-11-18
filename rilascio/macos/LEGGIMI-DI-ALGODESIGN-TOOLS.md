# Lo strumento a riga di comando di AlgoDesign {{versione}}

Versione {{delData}}, per macOS 13.3 o successivo, sui Mac con chip Apple e su quelli con processore Intel.

`algodesign-tools` è un'applicazione a sé, senza finestre, con tre comandi:

- `accademico` legge un testo scritto in «Accademico», lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica e ne fa una **libreria** di AlgoDesign: ogni `function` del testo diventa una procedura o una funzione, che si apre in AlgoDesign e si esegue passo passo, con la tabella di traccia;
- `stampa` legge un progetto di AlgoDesign e scrive due pagine HTML: una da stampare con due testi di codice affiancati e una che esegue il JavaScript del programma nel browser;
- `flowgorithm` converte i file di Flowgorithm (`.fprg`) in progetti di AlgoDesign, che si aprono e si eseguono passo passo: un file, più file o una cartella intera.

Non serve installarlo e non serve AlgoDesign per usarlo (serve per aprire i file che scrive e per creare i progetti). AlgoDesign si scarica a parte, nel suo zip, `AlgoDesign-{{versione}}-macos-universal.zip`.

## Come si usa

1. Safari estrae lo zip da solo, nella cartella Download: nasce la cartella `AlgoDesign-Tools-{{versione}}`. Con un altro browser, fai doppio clic sullo zip nel Finder.
2. Apri il Terminale (in Applicazioni, Utility) e vai in quella cartella: `cd ~/Downloads/AlgoDesign-Tools-{{versione}}`.
3. Scrivi `./algodesign-tools -h` per l'aiuto, oppure, per esempio:

```sh
./algodesign-tools accademico esercizio.txt -o esercizi.algo
./algodesign-tools stampa esercizio.algo
./algodesign-tools flowgorithm esercizio.fprg
```

I file si danno col loro percorso, fra virgolette se ha degli spazi, o si copiano nella stessa cartella. I tre comandi sono spiegati nella guida ad `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`, in questa cartella; le opzioni, gli esempi e ciò che stampa `accademico` nel capitolo 6 della guida ad «Accademico», `GUIDA-AD-ACCADEMICO.md`; che cosa diventa un programma di Flowgorithm e che cosa non si converte nella guida ai file di Flowgorithm, `GUIDA-AI-FILE-DI-FLOWGORITHM.md`. Le guide scrivono i comandi come su Windows, `.\algodesign-tools`: sul Mac si scrive `./algodesign-tools` e il resto della riga non cambia. Lo strumento scrive solo i file che il comando produce e i suoi messaggi sono in italiano.

**La prima volta macOS blocca lo strumento**, che non è firmato da Apple, e il Terminale scrive `zsh: killed`. Si sblocca una volta sola:

- **da macOS 15 in poi** la finestra dice «"algodesign-tools" non è stata aperta», con «Sposta nel Cestino» in blu e «Fine»: ⚠️ **scegli «Fine»**. Nelle Impostazioni di Sistema, «Privacy e sicurezza», sezione «Sicurezza», accanto a «Il Mac ha bloccato "algodesign-tools"…» fai clic su **«Consenti comunque»**. Scrivi di nuovo il comando: alla finestra «Vuoi aprire "algodesign-tools"?» scegli **«Apri comunque»** e scrivi la password;
- **su macOS 13 e 14** la finestra dice «Impossibile aprire "algodesign-tools"…», con «Mostra nel Finder» e «OK»: scegli «OK». Nelle Impostazioni di Sistema, «Privacy e sicurezza», accanto a «L'utilizzo di "algodesign-tools" è stato bloccato…» fai clic su **«Consenti comunque»** e scrivi la password. Scrivi di nuovo il comando e, nella finestra che torna, scegli **«Apri»**.

La prima volta che lo strumento legge un file nella cartella Download, o in Documenti, macOS chiede il permesso per il Terminale («"Terminale" vorrebbe accedere ai file nella cartella Download»): scegli «Consenti», o «OK».

**Su un Mac con chip Apple** lo strumento usa la sua parte per quel chip. Se il Terminale è aperto con Rosetta, usa invece quella per i processori Intel, che funziona da macOS 15 in poi; su macOS 13 alcuni comandi si fermano con «Illegal instruction», come `flowgorithm` (su macOS 14 non è provato): apri il Terminale senza Rosetta.

## Licenza

Lo strumento è di Giuseppe Lancellotti, con licenza MIT (il file `LICENSE`); le tre guide hanno licenza Creative Commons Attribuzione 4.0 Internazionale (il file `LICENSE-DOCS`). L'eseguibile porta dentro Bun, che lo esegue, con le librerie che Bun usa: le loro licenze sono in `LICENZE-DI-TERZE-PARTI.txt`.
