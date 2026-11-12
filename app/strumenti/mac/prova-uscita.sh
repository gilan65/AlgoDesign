#!/bin/bash
# La prova dell'uscita e del menu sul Mac: per ogni caso un avvio nuovo dell'app, una modifica vera fatta coi tasti e
# il mouse (un dato aggiunto), il gesto, e dopo 5 s la domanda: l'app è ancora viva (ha chiesto) o no?
# Uso: prova-uscita.sh <cartella .app> <cartella delle uscite>. Esiti in <uscite>/esiti.txt (una riga per caso, con
# l'atteso, confrontati da `esiti-dell-uscita.ts`), catture e testi accanto. Controllo positivo: ⌘W passa dalla chiusura
# della finestra (la X), che chiede da sempre; senza modifiche Cmd+Q deve chiudere subito. Dopo ogni gesto con le
# modifiche, «Don't save» (Tab, Spazio) deve far uscire l'app: prova che la domanda c'era, e che «viva» non viene da un
# gesto che non è arrivato. La barra dei menu si confronta, nelle due lingue, coi nomi letti sul Mac del servizio.
# CHE COSA NON GUARDA: «Salva» nella domanda (apre la finestra del sistema); la chiusura della sessione e lo
# spegnimento (la stessa richiesta di AppleScript, che si prova); la tastiera di un portatile (fn).
app="$1"
uscite="$2"
mkdir -p "$uscite"
preferenze="$HOME/Library/Application Support/io.github.gilan65.algodesign/preferenze.json"
stato() { pgrep -x algodesign > /dev/null && echo viva || echo morta; }
se() { osascript -e "tell application \"System Events\" to $1" 2>&1; }
avvia() {
  pkill -x algodesign; sleep 2
  open -n "$app" --stdout "$uscite/avvio-$1.log" --stderr "$uscite/avvio-$1.log"
  sleep 15
  [ "$(stato)" = viva ] || { echo "$1: NON PARTITA" | tee -a "$uscite/esiti.txt"; return 1; }
}
modifica() {
  # «Aggiungi un dato» nella vista dei dati (la finestra è ingrandita sullo schermo del runner), un nome, Invio.
  se 'tell process "algodesign" to click at {75, 282}' > /dev/null
  sleep 1
  se 'keystroke "x"' > /dev/null
  se 'key code 36' > /dev/null
  sleep 2
  screencapture -x "$uscite/$1-modificata.png"
}
esito() {
  sleep 5
  screencapture -x "$uscite/$1.png"
  echo "$1: $(stato) (attesa: $2)" | tee -a "$uscite/esiti.txt"
}
voce_di_uscita() {
  # La voce del menu dell'app che comincia con «Quit» o «Esci».
  se 'tell process "algodesign" to click (first menu item of menu 1 of menu bar item 2 of menu bar 1 whose name starts with "Quit" or name starts with "Esci")'
}
non_salvare() {
  # Il secondo pulsante della domanda, come per la X.
  se 'key code 48' > /dev/null
  se 'keystroke space' > /dev/null
  esito "$1-non-salvare" morta
}
barra() {
  echo "$1: $(se 'tell process "algodesign" to get name of every menu bar item of menu bar 1') (attesa: $2)" | tee -a "$uscite/esiti.txt"
}
menu() {
  {
    echo "barra: $(se 'tell process "algodesign" to get name of every menu bar item of menu bar 1')"
    for i in 2 3 4; do
      echo "menu $i: $(se "tell process \"algodesign\" to get name of every menu item of menu 1 of menu bar item $i of menu bar 1")"
    done
  } | tee -a "$uscite/$1"
}

: > "$uscite/esiti.txt"
rm -f "$preferenze"

if avvia senza-modifiche; then
  se 'keystroke "q" using command down' > /dev/null
  esito senza-modifiche morta
fi
if avvia cmdq; then
  modifica cmdq
  menu menu-inglese.txt
  barra barra-inglese "Apple, AlgoDesign, Edit, Window"
  se 'keystroke "q" using command down' > /dev/null
  esito cmdq viva
  # Le stesse risposte della X: Esc annulla (l'app resta), Cmd+Q chiede di nuovo, «Don't save» (Tab dal primo
  # pulsante, Spazio) esce.
  se 'key code 53' > /dev/null
  esito cmdq-esc viva
  se 'keystroke "q" using command down' > /dev/null
  esito cmdq-di-nuovo viva
  se 'key code 48' > /dev/null
  se 'keystroke space' > /dev/null
  esito cmdq-non-salvare morta
fi
if avvia menu; then
  modifica menu
  voce_di_uscita > /dev/null
  esito menu viva
  non_salvare menu
fi
if avvia applescript; then
  modifica applescript
  osascript -e 'tell application id "io.github.gilan65.algodesign" to quit' > /dev/null 2>&1 &
  esito applescript viva
  non_salvare applescript
fi
if avvia nascosta; then
  # Con l'app nascosta (⌘H) la richiesta di AppleScript deve riportarla davanti con la domanda: lo prova «Don't
  # save», che arriva solo a una domanda in primo piano.
  modifica nascosta
  se 'keystroke "h" using command down' > /dev/null
  sleep 2
  osascript -e 'tell application id "io.github.gilan65.algodesign" to quit' > /dev/null 2>&1 &
  esito nascosta viva
  non_salvare nascosta
fi
if avvia cmdw; then
  modifica cmdw
  se 'keystroke "w" using command down' > /dev/null
  esito cmdw viva
  non_salvare cmdw
fi
if avvia campi; then
  # Copia e incolla in un campo di testo col menu Modifica: «abc», ⌘A, ⌘X, ⌘V due volte → «abcabc».
  se 'tell process "algodesign" to click at {75, 282}' > /dev/null
  sleep 1
  se 'keystroke "abc"' > /dev/null
  se 'keystroke "a" using command down' > /dev/null
  se 'keystroke "x" using command down' > /dev/null
  se 'keystroke "v" using command down' > /dev/null
  se 'keystroke "v" using command down' > /dev/null
  sleep 1
  screencapture -x "$uscite/campi.png"
  letto=$(se 'get value of attribute "AXValue" of (value of attribute "AXFocusedUIElement" of process "algodesign")')
  # Fra graffe: la bash del Mac prende il primo byte di «»» come parte del nome, e il valore esce vuoto.
  echo "campi: «${letto}» (atteso: «abcabc»)" | tee -a "$uscite/esiti.txt"
fi
mkdir -p "$(dirname "$preferenze")"
echo '{"lingua":"it"}' > "$preferenze"
if avvia italiano; then
  menu menu-italiano.txt
  barra barra-italiana "Apple, AlgoDesign, Modifica, Finestra"
  se 'tell process "algodesign" to click menu item "Impostazioni…" of menu 1 of menu bar item 2 of menu bar 1' > /dev/null
  sleep 2
  screencapture -x "$uscite/italiano-impostazioni.png"
  se 'key code 53' > /dev/null
  sleep 1
  se 'tell process "algodesign" to click menu item "Informazioni su AlgoDesign" of menu 1 of menu bar item 2 of menu bar 1' > /dev/null
  sleep 2
  screencapture -x "$uscite/italiano-informazioni.png"
fi
rm -f "$preferenze"
pkill -x algodesign
echo; cat "$uscite/esiti.txt"
