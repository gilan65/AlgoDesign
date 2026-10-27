# Lo strumento di «Accademico» di AlgoDesign {{versione}}

Versione del {{data}}, per Windows 10 e 11 a 64 bit.

`algodesign-accademico.exe` legge un testo scritto in «Accademico», lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica, e ne fa una **libreria** di AlgoDesign: ogni `function` del testo diventa una procedura o una funzione, che si apre in AlgoDesign e si esegue passo passo, con la tabella di traccia. È un programma a sé: non serve installarlo, e non serve AlgoDesign per usarlo (serve per aprire la libreria che scrive). AlgoDesign si scarica a parte, nel suo pacchetto, `AlgoDesign-{{versione}}-windows-x64.zip`.

## Come si usa

1. Estrai lo zip dove preferisci: nasce la cartella `AlgoDesign-Accademico-{{versione}}`.
2. In Esplora file, col tasto destro nella cartella, apri il **Terminale** lì.
3. Scrivi `.\algodesign-accademico -h` per l'aiuto, oppure, per un testo, per esempio:

```sh
.\algodesign-accademico esercizio.txt -o esercizi.algo
```

Il testo si dà col suo percorso, o si copia nella stessa cartella. Le opzioni, gli esempi e ciò che lo strumento stampa sono nel capitolo 6 della guida ad «Accademico», `GUIDA-AD-ACCADEMICO.md`, in questa cartella. Lo strumento scrive solo i file che gli si dicono, e i suoi messaggi sono in italiano.

## L'avviso di Windows al primo avvio

Lo strumento non è firmato digitalmente, e Windows può avvisare quando lo si avvia la prima volta: come procedere è nel `LEGGIMI.md` di AlgoDesign, nel suo pacchetto, ed è lo stesso.

## Licenza

Lo strumento è di Giuseppe Lancellotti, con licenza MIT (il file `LICENSE`); la guida ad «Accademico» ha licenza Creative Commons Attribuzione 4.0 Internazionale (il file `LICENSE-DOCS`). L'eseguibile porta dentro Bun, il programma che lo esegue, con le librerie che Bun usa: le loro licenze sono in `LICENZE-DI-TERZE-PARTI.txt`.
