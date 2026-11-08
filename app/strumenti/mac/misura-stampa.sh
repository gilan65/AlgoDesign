#!/bin/bash
# La misura della stampa sul Mac: una misura, non una prova, e non ferma nulla. L'app vera, ⌘P che apre la finestra
# «Stampa» dell'app, il pulsante «Stampa» (Maiusc+Tab dal primo elemento porta all'ultimo, Spazio lo preme) e, dopo 6 s,
# che cosa mostra il sistema: le finestre e i fogli dell'app, e una fotografia.
# Uso: misura-stampa.sh <cartella .app> <cartella delle uscite>. Le righe in <uscite>/stampa.txt.
# CHE COSA NON GUARDA: il foglio stampato (il servizio non ha una stampante); il suo verso, l'intestazione e il piè di
# pagina (si guardano sul Mac vero).
app="$1"
uscite="$2"
mkdir -p "$uscite"
se() { osascript -e "tell application \"System Events\" to $1" 2>&1; }
pkill -x algodesign; sleep 2
open -n "$app"
sleep 15
se 'keystroke "p" using command down' > /dev/null
sleep 2
screencapture -x "$uscite/stampa-finestra-dell-app.png"
se 'key code 48 using shift down' > /dev/null
se 'keystroke space' > /dev/null
sleep 6
screencapture -x "$uscite/stampa-dopo-il-pulsante.png"
{
  echo "finestre: $(se 'tell process "algodesign" to get name of every window')"
  echo "fogli della prima finestra: $(se 'tell process "algodesign" to count sheets of window 1')"
  echo "processi di stampa: $(pgrep -l -i -E 'print|PMPrinter' | tr '\n' ' ')"
} | tee "$uscite/stampa.txt"
se 'key code 53' > /dev/null
sleep 1
pkill -x algodesign
exit 0
