#!/bin/bash
# La misura della stampa sul Mac: una misura, non una prova, e non ferma nulla. L'app vera, ⌘P che apre la finestra
# «Stampa» dell'app, il pulsante «Stampa» (Maiusc+Tab dal primo elemento porta all'ultimo, Spazio lo preme) e, dopo 6 s,
# che cosa mostra il sistema: le finestre e i fogli dell'app, e una fotografia.
# Uso: misura-stampa.sh <cartella .app> <cartella delle uscite>. Le righe in <uscite>/stampa.txt.
# CHE COSA NON GUARDA: il foglio stampato (il servizio non ha una stampante); il suo verso, l'intestazione e il piè di
# pagina (si guardano sul Mac vero).
if [ -z "${GITHUB_ACTIONS:-}" ] && [ "${ALGODESIGN_SU_QUESTO_MAC:-}" != 1 ]; then
  echo "misura-stampa.sh chiude AlgoDesign se è aperta e preme tasti nella finestra in primo piano: corre sulle macchine di GitHub; su un altro Mac solo con ALGODESIGN_SU_QUESTO_MAC=1" >&2
  exit 2
fi
app="$1"
uscite="$2"
mkdir -p "$uscite"
se() { osascript -e "tell application \"System Events\" to $1" 2>&1; }
pkill -x algodesign; sleep 2
# Ciò che l'app scrive: se il comando della stampa del guscio non riesce, lo dice qui («stampa non aperta…»).
open -n "$app" --stdout "$uscite/stampa-app.log" --stderr "$uscite/stampa-app.log"
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
  # Il pgrep del Mac legge già le espressioni estese e non ha -E.
  echo "processi di stampa: $(pgrep -l -i 'print|PMPrinter' 2>&1 | tr '\n' ' ')"
  # grep -c scrive «0» ed esce 1 se non trova nulla: `|| true` tiene il solo numero.
  echo "righe della stampa scritte dall'app: $(grep -c 'stampa' "$uscite/stampa-app.log" || true) ($(grep 'stampa' "$uscite/stampa-app.log" | head -3 | tr '\n' ' '))"
} | tee "$uscite/stampa.txt"
se 'key code 53' > /dev/null
sleep 1
pkill -x algodesign
exit 0
