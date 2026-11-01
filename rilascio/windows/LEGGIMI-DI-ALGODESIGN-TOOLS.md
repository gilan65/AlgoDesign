# Lo strumento a riga di comando di AlgoDesign {{versione}}

Versione del {{data}}, per Windows 10 e 11 a 64 bit.

`algodesign-tools.exe` è un'applicazione a sé, senza finestre, con due comandi:

- `accademico` legge un testo scritto in «Accademico», lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica, e ne fa una **libreria** di AlgoDesign: ogni `function` del testo diventa una procedura o una funzione, che si apre in AlgoDesign e si esegue passo passo, con la tabella di traccia;
- `stampa` legge un progetto di AlgoDesign e scrive due pagine HTML: una da stampare con due testi di codice affiancati e una che esegue il JavaScript del programma nel browser.

Non serve installarlo, e non serve AlgoDesign per usarlo (serve per aprire la libreria che scrive e per creare i progetti). AlgoDesign si scarica a parte, nel suo pacchetto, `AlgoDesign-{{versione}}-windows-x64.zip`.

## Come si usa

1. Estrai lo zip dove preferisci: nasce la cartella `AlgoDesign-Tools-{{versione}}`.
2. In Esplora file, nella cartella dello strumento, scrivi `powershell` nella barra dell'indirizzo e premi Invio: si apre PowerShell in quella cartella (su Windows 11 va bene anche il tasto destro nella cartella, «Apri nel Terminale»).
3. Scrivi `.\algodesign-tools -h` per l'aiuto, oppure, per esempio:

```sh
.\algodesign-tools accademico esercizio.txt -o esercizi.algo
.\algodesign-tools stampa esercizio.algo
```

I file si danno col loro percorso, o si copiano nella stessa cartella. I due comandi sono spiegati nella guida ad `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`, in questa cartella; le opzioni, gli esempi e ciò che stampa `accademico` nel capitolo 6 della guida ad «Accademico», `GUIDA-AD-ACCADEMICO.md`. Lo strumento scrive solo i file che gli si dicono, e i suoi messaggi sono in italiano.

Chi aveva `algodesign-accademico.exe`, lo strumento delle versioni precedenti, scrive `accademico` dopo il nome nuovo; il resto della riga non cambia.

## L'avviso di Windows al primo avvio

Lo strumento non è firmato digitalmente, e Windows può avvisare quando lo si avvia la prima volta: come procedere è nel `LEGGIMI.md` di AlgoDesign, nel suo pacchetto, ed è lo stesso.

## Licenza

Lo strumento è di Giuseppe Lancellotti, con licenza MIT (il file `LICENSE`); le due guide hanno licenza Creative Commons Attribuzione 4.0 Internazionale (il file `LICENSE-DOCS`). L'eseguibile porta dentro Bun, che lo esegue, con le librerie che Bun usa: le loro licenze sono in `LICENZE-DI-TERZE-PARTI.txt`.
