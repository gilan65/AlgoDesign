# Le librerie di sistema dentro AlgoDesign per Linux

L'AppImage di AlgoDesign contiene, oltre al programma, alcune librerie di **Ubuntu 22.04** che servono a disegnare la finestra e a farla funzionare su distribuzioni diverse: fra queste WebKitGTK, che disegna l'interfaccia, GTK, GLib, Cairo e Pango. Non sono scritte dall'autore di AlgoDesign: ognuna ha la sua licenza, quasi sempre la GNU LGPL o licenze libere simili.

In questa cartella:

- `pacchetti-di-sistema.txt`: ogni file di libreria contenuto nell'AppImage, con il pacchetto di Ubuntu da cui viene (`SCONOSCIUTO` solo per le cache generate durante la costruzione, che non appartengono a un pacchetto);
- `versioni-dei-pacchetti.txt`: i pacchetti di Ubuntu, con la versione esatta;
- `<pacchetto>.copyright`: il file di copyright di ciascun pacchetto, così come Ubuntu lo distribuisce: autori, licenze e da dove viene il codice;
- `licenze-comuni/`: i testi completi delle licenze a cui i file di copyright rimandano (in Ubuntu stanno in `/usr/share/common-licenses`).

**Il codice sorgente** di ognuna di queste librerie, nella versione esatta indicata, si scarica dagli archivi di Ubuntu: `https://launchpad.net/ubuntu/+source/<nome del pacchetto sorgente>`, oppure, su un sistema Ubuntu o Debian, con `apt source <pacchetto>`.

**Sostituire una libreria.** L'AppImage si può estrarre (`./AlgoDesign.AppImage --appimage-extract`, che crea la cartella `squashfs-root`): le librerie stanno in `squashfs-root/usr/lib`, e ognuna si può sostituire con un'altra versione compatibile, avviando poi `squashfs-root/AppRun`.
