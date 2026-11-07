# Lo strumento a riga di comando di AlgoDesign {{versione}}

Versione {{delData}}, per Linux a 64 bit.

`algodesign-tools` è un'applicazione a sé, senza finestre, con due comandi:

- `accademico` legge un testo scritto in «Accademico», lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica e ne fa una **libreria** di AlgoDesign: ogni `function` del testo diventa una procedura o una funzione, che si apre in AlgoDesign e si esegue passo passo, con la tabella di traccia;
- `stampa` legge un progetto di AlgoDesign e scrive due pagine HTML: una da stampare con due testi di codice affiancati e una che esegue il JavaScript del programma nel browser.

Non serve installarlo e non serve AlgoDesign per usarlo (serve per aprire la libreria che scrive e per creare i progetti). AlgoDesign si scarica a parte, nel suo archivio, `AlgoDesign-{{versione}}-linux-x64.tar.gz`.

## Come si usa

1. Estrai l'archivio dove preferisci (con il gestore dei file, tasto destro → «Estrai qui», oppure con `tar xzf AlgoDesign-Tools-{{versione}}-linux-x64.tar.gz`): nasce la cartella `AlgoDesign-Tools-{{versione}}`.
2. Apri il terminale in quella cartella (nel gestore dei file, tasto destro nella cartella → «Apri nel terminale», oppure `cd AlgoDesign-Tools-{{versione}}`).
3. Scrivi `./algodesign-tools -h` per l'aiuto, oppure, per esempio:

```sh
./algodesign-tools accademico esercizio.txt -o esercizi.algo
./algodesign-tools stampa esercizio.algo
```

I file si danno col loro percorso, fra virgolette se ha degli spazi, o si copiano nella stessa cartella. I due comandi sono spiegati nella guida ad `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`, in questa cartella; le opzioni, gli esempi e ciò che stampa `accademico` nel capitolo 6 della guida ad «Accademico», `GUIDA-AD-ACCADEMICO.md`. Le due guide scrivono i comandi come su Windows, `.\algodesign-tools`: su Linux si scrive `./algodesign-tools`, e il resto della riga non cambia. Lo strumento scrive solo i file che il comando produce e i suoi messaggi sono in italiano.

**Se il terminale risponde «Permesso negato»**, il file ha perso il permesso di esecuzione, per esempio perché è stato copiato da una chiavetta: `chmod +x algodesign-tools`.

## Licenza

Lo strumento è di Giuseppe Lancellotti, con licenza MIT (il file `LICENSE`); le due guide hanno licenza Creative Commons Attribuzione 4.0 Internazionale (il file `LICENSE-DOCS`). L'eseguibile porta dentro Bun, che lo esegue, con le librerie che Bun usa: le loro licenze sono in `LICENZE-DI-TERZE-PARTI.txt`.
