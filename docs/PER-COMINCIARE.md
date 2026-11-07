# AlgoDesign: per cominciare

In questa guida impari a definire il primo algoritmo con AlgoDesign, passo per passo: leggere un numero intero e scrivere se è pari o dispari. Ogni comando è spiegato per intero nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md`; come si scarica e si avvia AlgoDesign è nel file `LEGGIMI.md`.

## 1. Un progetto nuovo

Dal menu **Progetto** scegli **Nuovo**. Scrivi il nome del progetto, `pari o dispari`, e premi **Crea**.

![Il menu Progetto, con la voce Nuovo nel riquadro rosso](img/it/01-menu-progetto.png)

## 2. Il dato

In AlgoDesign prima si dice che cosa serve, i dati, poi come si usano, le regole del flowchart. Qui serve un dato solo: il numero da leggere.

Nella scheda «Dati», a sinistra, premi **Aggiungi un dato**. Nel campo **Nome** scrivi `numero`, lascia il tipo **intero** e come **Ruolo** scegli **input**, perché il valore arriva da chi usa il programma. Poi premi **Conferma**.

![I campi del dato: il nome numero, il ruolo input e il pulsante Conferma nei riquadri rossi](img/it/02-dato.png)

## 3. La Lettura

Nel flowchart, a destra, fra «Inizio» e «Fine», c'è un **+**, che si vede col puntatore del mouse sopra il flowchart. Fai clic sul **+**: si apre l'elenco dei blocchi. Scegli **Lettura**.

![L'elenco dei blocchi aperto dal +, con la voce Lettura nel riquadro rosso](img/it/03-elenco-dei-blocchi.png)

Nel campo **Destinazione** scrivi `numero` e premi **Conferma**, o Invio. Il blocco aspetta un valore scritto nella console e lo mette nel dato.

![Il campo Destinazione della Lettura, con numero](img/it/04-lettura.png)

## 4. Il Se e le due Scritture

Sotto la Lettura c'è un altro **+**: fai clic e scegli **Se**. Nel campo **Condizione** scrivi `numero mod 2 == 0` e conferma: `mod` è il resto della divisione, e il resto della divisione per 2 è zero quando il numero è pari.

Il Se ha due rami, ognuno col suo **+**: **Vero** a destra, **Falso** a sinistra. Nel ramo Vero inserisci una **Scrittura** con il valore `"pari"`, fra virgolette perché è un testo, e con la casella **Va a capo**. Nel ramo Falso una **Scrittura** con `"dispari"`, anche lei con **Va a capo**.

![I campi della Scrittura: il valore "dispari" e la casella Va a capo nei riquadri rossi](img/it/05-scrittura.png)

Il flowchart è finito:

![Il flowchart di pari o dispari: Inizio, leggi numero, il Se con le due Scritture, Fine](img/it/06-flowchart.svg)

Salva il progetto con **Salva con nome** (Ctrl+Maiusc+S), dal menu **Progetto**: il file ha l'estensione `.algo`.

## 5. Eseguire passo passo

Premi **Passo** (F10) nella barra: a destra del flowchart compaiono la **tabella di traccia** e la **console**. Premi ancora **Passo**: il programma arriva alla Lettura e aspetta. In fondo alla console scrivi `7` e premi Invio.

![La console che aspetta il valore di numero, con il campo nel riquadro rosso](img/it/07-valore-da-scrivere.png)

Ogni **Passo** è un'azione. Premi ancora **Passo**: la condizione è falsa, perché 7 è dispari, e il blocco evidenziato in giallo, quello che sta per essere eseguito, è la Scrittura di «dispari».

![Il flowchart in pausa, con la Scrittura di dispari evidenziata in giallo](img/it/08-pausa.svg)

La tabella di traccia ha una riga per ogni azione: il valore di ogni dato e l'esito della condizione.

![La tabella di traccia, con la riga della condizione nel riquadro rosso](img/it/09-tabella-di-traccia.png)

Premi **Continua** (F5), il pulsante che durante l'esecuzione prende il posto di «Esegui», per arrivare alla fine: la console scrive `dispari`.

## 6. Un caso d'uso

Un caso d'uso è una prova da ripetere: i valori da scrivere nella console e l'output che il programma deve dare. Il più semplice nasce dall'esecuzione appena finita: in fondo alla console fai clic su **Salva l'esecuzione come caso d'uso**.

![La console alla fine dell'esecuzione, con Salva l'esecuzione come caso d'uso nel riquadro rosso](img/it/10-fine.png)

Si apre la scheda «Casi d'uso» con il caso già pronto, col valore `7` e l'output atteso `dispari`: premi **Conferma**. Poi premi **Esegui tutti**: il pallino verde accanto al caso dice che il programma ha dato l'output atteso. Ogni volta che cambi il flowchart, **Esegui tutti** ripete le prove con un clic.

![La scheda Casi d'uso, con Esegui tutti nel riquadro rosso e il pallino verde del caso](img/it/11-casi-d-uso.png)

## 7. Il codice generato

Premi **Genera** nella barra: a destra del flowchart compare il programma scritto in pseudocodice, in Python e in C, una linguetta per linguaggio. Il codice segue ogni modifica del flowchart, e durante l'esecuzione passo passo evidenzia la riga del blocco corrente.

![Il codice Python del programma, con la linguetta Python nel riquadro rosso](img/it/12-codice.png)

## 8. E adesso

- Dal menu **Aiuto**, **Esempi…** sono elencati dodici esempi da provare, divisi in gruppi.
- Dal menu **Aiuto**, **Guida per lo studente** si apre la guida completa, in una finestra accanto al flowchart: i cicli, i record, le procedure e le funzioni, la stampa e le Impostazioni.

## 9. Licenza di questa guida

Questa guida, testo e figure, è di Giuseppe Lancellotti ed è rilasciata con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): si può copiare, distribuire e modificare, anche per scopi commerciali, citando l'autore e la licenza. Il testo completo della licenza è nel file `LICENSE-DOCS`.
