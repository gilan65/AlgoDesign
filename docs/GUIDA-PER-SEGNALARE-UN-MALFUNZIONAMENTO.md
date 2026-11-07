# AlgoDesign: guida per segnalare un malfunzionamento

Questa guida è per chi usa AlgoDesign, vede qualcosa che non va e vuole segnalarlo perché venga corretto. Racconta tutto il percorso: come riconoscere un malfunzionamento, come preparare il file in AlgoDesign, come aprire la segnalazione su GitHub, che cosa scrivere e che cosa succede dopo. Non serve sapere come è fatto AlgoDesign. Come si usa è nella guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`).

## 1. Il percorso in breve

1. Subito dopo il malfunzionamento, senza premere Ferma e senza chiudere AlgoDesign: menu **Aiuto**, **Salva per segnalare un malfunzionamento…**, poi **Salva…** (§4).
2. Se il malfunzionamento si può ripetere: **Attiva la registrazione delle esecuzioni**, ripeti ciò che hai fatto e salva di nuovo (§6).
3. Apri https://github.com/gilan65/AlgoDesign/issues/new, scrivi che cosa hai fatto e **che cosa ti aspettavi**, allega il file e premi **Create** (§7).

AlgoDesign non invia nulla da solo: non si collega a internet, e il file resta sul tuo computer finché non lo alleghi tu.

## 2. È un malfunzionamento?

Non tutto ciò che si ferma è un malfunzionamento. Se il programma fa qualcosa che non si può fare (un intero fuori dal suo intervallo, un indice fuori dal vettore, una divisione per zero), AlgoDesign ferma l'esecuzione sul blocco e la console dice che cosa è successo, con **Spiegazione** accanto. Lo stesso vale per gli errori e gli avvisi nella riga di stato. In questi casi AlgoDesign sta facendo il suo lavoro, e a cambiare è il programma.

È un malfunzionamento di AlgoDesign, e conviene segnalarlo, quando:

- compare la pagina «Qualcosa non ha funzionato e la finestra non si può mostrare»;
- il programma dà un risultato diverso da quello che le sue regole dicono: seguendolo a mano, blocco per blocco, il conto non torna;
- il codice generato fa qualcosa di diverso dal flowchart, su un calcolo che rispetta le regole (quelli che escono dalle regole sono nel §8 della guida per lo studente);
- un comando non fa ciò che la guida dice, oppure il flowchart, la tabella di traccia o una finestra mostrano qualcosa di sbagliato;
- AlgoDesign non risponde più, o non si avvia;
- un testo è sbagliato, o è in un'altra lingua.

Nel dubbio segnala: una segnalazione di troppo costa poco, e chi corregge può risponderti che è il programma a dover cambiare.

## 3. Prima di segnalare

Tre controlli, che chiedono pochi minuti:

- **La versione.** Dal menu **Aiuto**, **Informazioni su AlgoDesign** dice la tua. Se sulla pagina del progetto, https://www.lancellotti.info/AlgoDesign/, ce n'è una più recente, riprova con quella: il malfunzionamento può essere già corretto.
- **I difetti noti.** Le note di rilascio, il file `NOTE-DI-RILASCIO.md` accanto al programma, hanno la parte «Difetti noti»: quelli già conosciuti e non ancora corretti. Se il tuo è lì, non serve segnalarlo, a meno che tu non abbia qualcosa da aggiungere.
- **Le segnalazioni aperte.** In https://github.com/gilan65/AlgoDesign/issues cerca una parola di ciò che hai visto. Se c'è già la stessa segnalazione, aggiungi lì un commento col tuo file e con ciò che ti aspettavi, invece di aprirne una nuova.

Per aprire una segnalazione serve un account GitHub, gratuito, che si crea su https://github.com/signup. Le pagine di GitHub sono in inglese; la segnalazione si può scrivere in italiano o in inglese.

## 4. Il primo file: subito dopo il malfunzionamento

Il file nasce dall'esecuzione ancora aperta: **non premere Ferma e non chiudere AlgoDesign**.

1. Dal menu **Aiuto** scegli **Salva per segnalare un malfunzionamento…**. Il comando è spento mentre il programma avanza: aspetta la fine o, con l'Animata, metti in pausa.
2. Si apre una finestra col **testo esatto** che sarà scritto nel file. Leggilo (§5).
3. Premi **Salva…**: la finestra di Windows propone il nome «nome del progetto - segnalazione.txt». Scegli dove salvarlo e conferma; un avviso dice che il file è stato salvato.

Il comando è spento anche durante «Esegui tutti» e quando non c'è un'esecuzione aperta. Se il malfunzionamento è arrivato mentre disegnavi o modificavi i dati, esegui il programma con F5, poi usa il comando: il file porta il progetto com'è adesso. Se il progetto ha errori l'esecuzione non parte: attiva prima la registrazione (§6), poi premi F5, e il comando si accende.

**Se compare la pagina «Qualcosa non ha funzionato…»** il menu non c'è più, e il comando è un pulsante della pagina, con lo stesso nome. Usalo prima di chiudere: gli errori dell'applicazione stanno solo in memoria, e alla chiusura si perdono. Se la pagina dice che ci sono modifiche non salvate, salva anche il progetto con **Salva con nome**. Poi chiudi AlgoDesign e riaprilo.

## 5. Che cosa c'è nel file, e chi lo leggerà

Il file è un testo, e contiene:

- il progetto intero: nome, autore, descrizione, note, dati, flowchart, procedure, funzioni e casi d'uso;
- i valori scritti nella console, quelli modificati a mano, ciò che il programma ha scritto e l'esito;
- gli errori dell'applicazione;
- la versione di AlgoDesign, la lingua, il sistema operativo e i cinque valori delle Impostazioni che possono cambiare il risultato.

Dagli errori dell'applicazione sono tolti i percorsi dei file e il nome del tuo utente, e delle Impostazioni ci sono solo quei cinque valori. Ciò che hai scritto nel progetto e nella console resta com'è.

**Una segnalazione è pubblica.** Chiunque può leggerla e scaricare il file, anche senza un account, e solo il proprietario del repository può cancellarla. Prima di salvare, quindi, rileggi il testo nella finestra. Se il progetto ha il tuo nome nel campo dell'autore, dati personali nelle note o nelle stringhe, o un lavoro che non vuoi mostrare, fai una copia con **Salva con nome**, togli da lì ciò che non vuoi pubblicare, eseguila di nuovo con F5, controlla che il malfunzionamento ci sia ancora e salva il file da quella copia: il file porta il progetto di quando l'esecuzione è partita. Un programma più piccolo che mostra lo stesso malfunzionamento è anche il più facile da correggere.

## 6. Il secondo file: ripetere il malfunzionamento registrando

Il primo file ha una sola esecuzione, l'ultima. Se il malfunzionamento si può ripetere, un secondo file racconta di più: ogni esecuzione dall'attivazione, ognuna col progetto di allora, e gli errori dell'applicazione arrivati durante ciascuna.

1. Dal menu **Aiuto** scegli **Attiva la registrazione delle esecuzioni** (oppure **Attiva la registrazione** nella finestra del §4). Nella riga di stato compare «In registrazione».
2. Ripeti ciò che hai fatto, anche più volte e anche cambiando il progetto: la riga di stato conta le esecuzioni («In registrazione: 3 esecuzioni»). Sono tenute le ultime 20; «Esegui tutti» non si registra.
3. Dal menu **Aiuto** scegli **Salva per segnalare un malfunzionamento…**: la finestra dice quante esecuzioni contiene. Salva con un nome diverso da quello del primo file.

Allega **il secondo file se il malfunzionamento si è ripetuto, altrimenti il primo**.

La registrazione sta solo in memoria: nulla è scritto sul disco finché non salvi. Salvare non la spegne. **Disattiva la registrazione delle esecuzioni**, nello stesso menu, la spegne e scarta le esecuzioni senza chiedere conferma: salva prima. Si spegne da sé alla chiusura di AlgoDesign, e all'avvio è sempre spenta.

## 7. La segnalazione su GitHub

1. Apri nel browser https://github.com/gilan65/AlgoDesign/issues/new e accedi col tuo account.
2. Nel campo **Add a title** scrivi in una riga che cosa succede: «La tabella di traccia mostra 8 dove il programma scrive 7», non «Non funziona».
3. Nel riquadro **Add a description** scrivi che cosa hai fatto, che cosa ti aspettavi e che cosa è successo (l'esempio è qui sotto).
4. Allega il file: trascinalo nel riquadro della descrizione, oppure fai clic su **Paste, drop, or click to add files**, sotto il riquadro, e sceglilo. Nel riquadro compare una riga col nome del file: aspetta che compaia prima di andare avanti. GitHub accetta i file `.txt` fino a 25 MB, e quello di AlgoDesign ci sta. Se un'immagine dello schermo aiuta a capire, allegala allo stesso modo.
5. Rileggi e conferma col pulsante **Create**, in fondo al modulo. La segnalazione riceve un numero e una pagina sua.

Un esempio di descrizione:

```text
Che cosa ho fatto: ho aperto l'esempio «Media dei voti», ho scritto 7, 11, 5 e 8 e ho premuto F5.
Che cosa mi aspettavo: la media 6, perché 11 non è un voto valido.
Che cosa è successo: ha scritto 7.
```

**La frase su che cosa ti aspettavi è la più importante.** Il file dice che cosa è successo, non che cosa doveva succedere: un programma che scrive 7 invece di 6, a chi legge il solo file, sembra a posto, e rieseguito scrive sempre 7.

## 8. Dopo l'invio

Chi corregge legge la tua frase e riesegue il file, per vedere ciò che hai visto tu. Risponde nella pagina della segnalazione, e GitHub ti avvisa secondo le impostazioni del tuo account: può chiederti un'altra prova o un file nuovo. Poi succede una di queste cose:

- il malfunzionamento è corretto: la segnalazione viene chiusa, e la correzione esce con una versione successiva;
- è un difetto vero che non si corregge subito: la risposta lo dice, il difetto resta fra quelli conosciuti e, se riguarda chi usa AlgoDesign, compare nelle note di rilascio della versione dopo;
- è il programma a dover cambiare, non AlgoDesign: la risposta dice dove guardare.

## 9. Se qualcosa non va come qui

- **AlgoDesign non si avvia**: il file non c'è, e si segnala lo stesso a parole, con la versione (il nome della cartella estratta dallo zip), Windows 10 o 11 e ciò che compare. Prima guarda i requisiti nel file `LEGGIMI.md`.
- **AlgoDesign non risponde più** e il file non si può salvare: chiudilo, riaprilo e riprova con la registrazione attiva (§6). Se non si ripete, segnalalo a parole.
- **Il file non si salva**: un messaggio dice perché; scegli un'altra cartella.
- **Non hai un account GitHub**: dai il file e la frase al tuo docente, o a chi ti ha dato AlgoDesign.

## 10. Licenza di questa guida

Questa guida è di Giuseppe Lancellotti ed è rilasciata con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): si può copiare, distribuire e modificare, anche per scopi commerciali, citando l'autore e la licenza. Il testo completo della licenza è nel file `LICENSE-DOCS`.
