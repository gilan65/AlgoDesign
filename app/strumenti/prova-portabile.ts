// Prova sul prodotto, solo Windows: `bun run prova-portabile`. Costruisce l'eseguibile di release, lo
// copia in una cartella con spazi (`.collaudo/prova portabile/`) e ci lancia sopra due giri, pilotando
// la finestra con Playwright attraverso la porta di debug di WebView2 (4352, aperta solo da qui).
//
// 1. Giro PORTABILE (con `data\` accanto all'eseguibile):
//    - FINESTRA: l'app si apre ingrandita (la finestra occupa l'area di lavoro dello schermo);
//    - LINGUA: l'app parte nella lingua del sistema, si passa all'altra (nelle Impostazioni, con
//      «Conferma»), si chiude per PID (come dopo ogni clausola, tranne la CHIUSURA), si riapre e la ritrova; `data\preferenze.json` contiene la lingua;
//    - PREFERENZE: alla seconda apertura si scelgono nelle Impostazioni i colori «Contrasto forte», le
//      condizioni lunghe su una riga e i campi dei blocchi nel pannello a destra; chiusa per PID e riaperta, l'app li ritrova (i colori applicati al
//      documento, il modo scelto nella finestra) insieme alla lingua, e il file li contiene. Controllo
//      positivo: tolto il file, si riapre nella lingua iniziale e coi colori predefiniti (è il file a
//      ripristinarli);
//    - FILE: l'app parte col file di un progetto dato come argomento, FUORI da `data\` (accanto
//      all'eseguibile, con spazi nel nome); dall'interfaccia si cambia l'autore (finestra Proprietà) e «Salva»
//      riscrive quel file senza chiedere dove: sul disco ci sono esattamente i byte attesi (il progetto del
//      corpus con l'autore, salvato dal nucleo), e nessun temporaneo resta accanto. Al primo avvio la cartella
//      `data\esempi` ha ricevuto gli undici esempi forniti, nei loro tre gruppi (le sottocartelle scritte dal guscio vero).
//      Controllo positivo: il file prima del giro è
//      diverso dall'atteso (la modifica è arrivata davvero sul disco);
//    - LIBRERIA: l'app parte con la libreria del corpus (segnata) data come argomento, fuori da `data\`; dalla finestra
//      «Importa procedure e funzioni…» del menu «Progetto», «Aggiungi il progetto aperto» scrive (il guscio vero, nella
//      cartella predefinita `data\librerie`) il file nel gruppo proposto, coi byte del progetto; la finestra, riletta la
//      cartella, mostra il gruppo nuovo. Controllo positivo: prima della clausola `data\librerie` non c'è (è il primo file
//      nuovo che l'app scrive in `data\`). La guardia della cartella di prova la riconosce (il rilancio la cancella), e
//      ha il suo controllo positivo: un file che non è `.algo` dentro un gruppo delle librerie le è estraneo;
//    - COSTRUZIONE: l'app parte con un progetto VUOTO dato come argomento (lo stesso file fuori da `data\`: i
//      metadati e la fine dell'atteso, nessun dato, nessun blocco e nessun caso d'uso); dall'interfaccia, nei modi predefiniti e
//      nella lingua del sistema, si costruisce il programma di riferimento della tappa 2 intero (gli 8 dati e i blocchi,
//      coi due cicli `per`, con gli stessi passi della prova nel browser, `e2e/costruzione.ts`: i dati, il caso d'uso, le
//      regole) e «Salva» scrive sul disco esattamente i byte di `e2e/attesi/riferimento-media-voti-per.algo`, senza
//      temporanei accanto. Il rosso elenca i percorsi dei campi diversi. Controllo positivo: il file di partenza è diverso
//      dall'atteso;
//    - FUNZIONI: allo stesso modo, il programma di riferimento della tappa 3 costruito dall'interfaccia in un progetto
//      VUOTO dato come argomento (le due procedure dai campi dei loro salti, la funzione dal pulsante «Funzione», i
//      parametri, ciò che restituisce, i casi di ognuna; `e2e/costruzione.ts`), e «Salva» scrive esattamente i byte di
//      `e2e/attesi/riferimento-media-voti-funzioni.algo`. Controllo positivo: il file di partenza è diverso dall'atteso;
//    - CASO: nella stessa costruzione, il caso d'uso scritto con i clic si esegue dalla sua riga («Esegui» del caso,
//      nella scheda dei casi): coi soli dati il pallino passa da «mai eseguito» a «non raggiunto» e l'ultima riga della
//      console dice «non raggiunto (2 differenze)» (controllo positivo: il confronto sa dire no); con le regole, coi
//      cicli `per`, il pallino passa da «da rieseguire» a «raggiunto» e l'ultima riga della console lo dice. Le parole
//      sono quelle della lingua del sistema; le corse non cambiano il file (lo prova la COSTRUZIONE, che salva dopo);
//    - ESECUZIONE: l'app parte col programma di riferimento dato come argomento; F5 (via CDP, alla pagina: che il tasto
//      vero arrivi lo prova la RICARICA) lo esegue, i valori del suo caso si scrivono nella console, e alla fine
//      l'output della console è l'atteso del caso (lo stesso che verifica `bun run casi`). Poi «Esporta la tabella…»
//      dal menu «Progetto»: la finestra del sistema per salvare (quella vera, aperta dal comando del guscio) si
//      compila coi messaggi di Windows (`finestra-vera.ps1 <pid> salva`), col nome senza estensione, e il file
//      `.csv` scritto accanto è il CSV atteso della lingua (`core/esecuzione/atteso-del-riferimento.ts`, col BOM),
//      byte per byte. Controllo positivo: prima di F5 l'output è diverso dall'atteso (e il file non c'è);
//    - SICUREZZA: nella stessa esecuzione, dall'apertura del file all'esportazione, la pagina non annota violazioni
//      della politica di sicurezza dei contenuti (quella della configurazione di Tauri). Controllo positivo: uno stile
//      scritto nella pagina la viola («style-src-elem»), cioè la politica è attiva nel prodotto;
//    - VETTORE: l'app parte col vettore di 1000 elementi riempito da un ciclo (`e2e/vettore-riempito.ts`, lo stesso
//      programma della prova nei motori) dato come argomento; F5 lo esegue nella forma predefinita della tabella (le
//      colonne dei primi dieci e una per gli altri), «Ferma», poi nelle Impostazioni si sceglie la forma in fila e F5
//      lo esegue di nuovo. In ciascuna corsa la risposta della pagina (un giro di andata e ritorno) due secondi dopo F5
//      e alla fine, il fotogramma più lungo dal tasto alla fine e «Ferma» stanno entro un secondo, come nella prova nei
//      motori; il log ha i valori e il margine. Controlli positivi: le due corse hanno mostrato due forme diverse (la
//      riga sopra la tabella, il numero delle colonne) e il campionatore dei fotogrammi ne ha contati;
//    - RICORSIONE: nella WebView2 vera, che le prove nei motori non provano, la funzione `conta` che chiama sé stessa:
//      con 499 finisce (500 chiamate in corso, il tetto) e la console ha 499; con 500 l'esecuzione si ferma col
//      messaggio del tetto delle chiamate, «Dove sei» ha il principio, «… 496 chiamate …» e la fine, e la pagina
//      risponde entro un secondo. Controllo positivo: la prima corsa finisce senza errore (il tetto non scatta prima);
//    - CHIUSURA: col file del progetto dato come argomento, il messaggio di chiusura alla finestra (WM_CLOSE,
//      come la X; `finestra-vera.ps1`): senza modifiche la finestra si chiude; con modifiche (l'autore cambiato)
//      resta e chiede se salvare; «Annulla» la lascia aperta e una seconda richiesta chiede di nuovo; «Non
//      salvare» la chiude lasciando il file com'era; in un secondo avvio «Salva» scrive il file (i byte attesi)
//      e la chiude. Mentre si chiude dopo la domanda dell'app, il motore non chiede nulla (`beforeunload`).
//      Controllo positivo: lo stesso messaggio chiude la finestra senza modifiche. Un messaggio che non parte
//      è rosso, mai verde;
//    - RICARICA: col progetto modificato, F5 mandato come messaggio di Windows alla finestra d'input di
//      WebView2 (`finestra-vera.ps1`: la via dei tasti veri, senza primo piano; i tasti via CDP arrivano solo
//      alla pagina e non agli acceleratori di WebView2: misurato, non ricaricavano nemmeno il codice che non li
//      fermava, mentre questo messaggio sì) non arriva al motore: niente ricarica e niente domanda di
//      `beforeunload` (che col progetto modificato fermerebbe la ricarica e nasconderebbe un tasto non fermato:
//      misurato togliendo il fermo). F5 è il tasto dell'esecuzione: arrivato alla pagina, il riferimento parte
//      e aspetta il primo valore (poi la prova la ferma). Una ricarica chiesta dalla pagina fa
//      chiedere conferma al motore (rifiutata, la pagina resta). Due controlli positivi a ogni corsa: la stessa
//      via scrive una lettera nel campo dell'autore (arriva alla pagina), e lo stesso F5 ricarica una pagina
//      senza il fermo (`about:blank`: arriva agli acceleratori). Un tasto che non parte è rosso, mai verde;
//    - TRACCE: nessuna cartella dell'identificatore e nessuna voce nuova al primo livello di
//      %APPDATA%, %LOCALAPPDATA%, %TEMP% (e %TMP%, se è un'altra cartella); nella cartella di prova,
//      accanto all'eseguibile, nient'altro che `data\`. Voci ammesse: nessuna. Il log dice quanto pesa `data\webview`.
// 2. Giro SENZA `data\` (controllo positivo delle tracce): lo stesso eseguibile, con un cambio di
//    lingua, deve far comparire la cartella dell'identificatore in %LOCALAPPDATA% (profilo della
//    WebView) e in %APPDATA% (preferenza), e tutti e due i rilevatori devono vederla. Dopo, quelle
//    cartelle si descrivono nel log e si cancellano. Oltre a loro la prova cancella solo la propria
//    cartella di prova (in `.collaudo\`, o sotto `--radice`), con la guardia descritta in fondo.
//    Senza `data\` anche gli esempi vanno nella cartella dell'identificatore in %APPDATA%.
//
// I due rilevatori delle tracce: (1) voci di primo livello il cui nome contiene l'identificatore;
// (2) voci di primo livello nuove (assenti nella fotografia presa al marcatore d'inizio del giro). Le
// voci modificate dopo quel marcatore si stampano come informazione e non decidono l'esito: le radici
// cambiano anche per conto di altri processi. Le voci nuove create da altri processi invece sono
// rosse: il messaggio dà dimensione e ora di ciascuna, e segnala i file `.tmp` vuoti, che il Chrome
// dell'utente crea in %TEMP% a ogni avvio di un suo processo. Davanti a quel rosso si confronta l'ora
// del file con l'avvio dei processi `chrome` e si rilancia; non si ammettono per nome, perché
// assorbirebbero anche i file temporanei dell'app.
//
// La prova vuole lo schermo libero: l'app parte dietro le finestre già aperte, e se una finestra ingrandita la
// copre per intero la WebView2 sospende il disegno. Allora la CHIUSURA usciva rossa con «la seconda richiesta,
// dopo «Annulla», resta ma non chiede» e la RICARICA con «finestre d'input di WebView2 0» (misurato
// con lo stesso eseguibile: rossa 5 volte su 6 sotto una finestra ingrandita, verde 2 su 2 con lo schermo libero).
// La premessa è asserita a ogni avvio dell'app: le finestre che le stanno SOPRA nell'ordine di Windows e la coprono
// per intero (`finestra-vera.ps1 <pid> coperta`); se ce n'è una, il rosso è della PREMESSA e la nomina. Non dalla pagina: coperta, la WebView2 resta «visible» e continua a disegnare i fotogrammi
// (misurato), quindi `document.visibilityState` non lo sa dire.
//
// Che cosa questa prova NON guarda:
// - il registro di Windows;
// - le scritture DENTRO cartelle già esistenti nelle radici (una cartella condivisa di Microsoft
//   che riceve un file risulta solo «modificata»);
// - una voce creata e cancellata durante il giro (la fotografia è prima e dopo);
// - tutto ciò che sta fuori dalle radici e dalla cartella di prova (per esempio %ProgramData%);
// - la cartella dell'identificatore in %TEMP%: il rilevatore la cerca lì con lo stesso codice, ma
//   nessun giro ve la fa comparire, quindi su %TEMP% il controllo positivo è solo quello del
//   rilevatore delle voci nuove;
// - un utente diverso da quello che la lancia: guarda le radici di chi la esegue. Per un utente senza
//   diritti la si lancia come quell'utente (`runas`), con `--senza-build`;
// - Linux e macOS;
// - la finestra del file nativa per aprire e per «Salva con nome», e quella della scelta di una cartella:
//   Playwright non le comanda (la sola compilata qui è quella dell'esportazione, nella clausola ESECUZIONE, coi
//   messaggi di Windows; le altre usano lo stesso codice del guscio per scegliere, e le regole del nome stanno nei
//   test Rust). Le loro tracce su Windows sono state misurate a mano: il registro dell'utente riceve
//   gli ultimi file aperti o salvati e la vista delle cartelle (accettate e dichiarate nel README); su Linux quelle
//   del selettore di file GTK non sono misurate. Qui il file si dà come argomento;
// - nella ESECUZIONE, il watch e l'esecuzione animata: la WebView2 è Chromium come quello della prova nel browser,
//   che li prova coi tempi e col movimento ridotto emulato; sul prodotto non c'è nulla di diverso da guardare se non
//   la preferenza «riduci il movimento» letta da Windows, che la prova non cambia (è un'impostazione del sistema);
//   una lettura non valida, i punti di interruzione e un passo alla volta (li prova il browser);
// - nella ESECUZIONE, un eseguibile mutato a ogni corsa: dei suoi rilevatori due sono stati visti rossi su un
//   eseguibile mutato, una volta (l'output in maiuscolo, il CSV senza BOM); gli altri mai (F5 che non parte, la
//   finestra del sistema non compilata per un difetto dell'app, l'avviso dell'esportazione, i temporanei, le righe
//   del CSV in un altro ordine). Il confronto del CSV non ha un controllo positivo nello stesso giro: solo il file
//   che non c'è prima. L'esportazione sopra un file che esiste e un nome con lettere accentate: nessuna prova;
// - nel VETTORE, gli altri programmi pesanti della prova nei motori (il ciclo che non finisce e scrive, l'avvio con un
//   vettore inizializzato, le stringhe al limite): sul prodotto solo il vettore riempito, nelle due forme; il tempo con
//   un carico sulla macchina diverso da quello del momento (una corsa sola, con la macchina com'è); il tasto F5 arriva
//   via CDP, come nella ESECUZIONE. Il rilevatore del tempo è stato visto rosso una volta, su un eseguibile mutato
//   che mostra una colonna per elemento e disegna tutte le righe (risposta dopo 7905 ms, un fotogramma di 9814 ms);
//   con la sola colonna per elemento la finestra restava entro la soglia (la tabella disegna solo le righe in
//   vista), e il rosso era quello delle forme (nessuna riga sopra la tabella). Il rosso del campionatore spento,
//   mai; e mai la sola correzione delle righe in vista (tutte le righe disegnate, con le colonne col tetto). Il
//   programma finisce prima dei due secondi: la risposta «dopo 2 s» e quella «alla fine» misurano la pagina a corsa
//   finita, e la corsa la osserva il solo campionatore dei fotogrammi;
// - la riga d'esito pretende la riga verde di ogni clausola, nell'ordine dichiarato in `clausole`: una clausola nuova
//   che non entra in quell'elenco, o una che torna senza la sua riga, fa la riga d'esito rossa (vista una volta, con
//   la riga verde del VETTORE stampata fuori dal registro: «11 (…) invece di 12 (…)»);
// - la dimensione minima della finestra (960 × 600): la prova non ridimensiona la finestra nativa;
// - nella LIBRERIA, l'importazione stessa (la provano il browser e i test sotto happy-dom: sul prodotto non c'è nulla di
//   diverso), «Salva come libreria…» e «Da un altro file…» (vogliono le finestre del file native), la cartella delle
//   librerie scelta nelle Impostazioni;
// - nella RICARICA, Ctrl+R, Ctrl+F5 e Ctrl+Maiusc+R: il messaggio non porta Ctrl (arriva una R semplice), e i
//   tasti veri col primo piano non portano sempre il fuoco della tastiera nella WebView2. Misurati in una sola
//   sessione di misura (eseguibile col fermo d'impronta sha256 d41d77546aad8d2d…, la versione della
//   WebView2 non annotata) coi tasti veri col primo piano, a progetto NON modificato (la rete di
//   `beforeunload` non nasconde nulla): sull'eseguibile col fermo i tre tasti arrivano alla pagina con Ctrl,
//   fermati, e nessuna ricarica, in due corse della sessione; sull'eseguibile senza il fermo lo stesso gesto
//   ricarica ognuno dei tre. Quella misura non si ripete a ogni corsa; che l'app li fermi lo prova il browser
//   (`e2e/lavoro-al-sicuro.e2e.ts`);
// - le altre vie di ricarica o di navigazione: i tasti del browser di certe tastiere (Aggiorna, Indietro),
//   Alt+Freccia e il pulsante «indietro» del mouse (l'app ha una sola voce di cronologia), un file trascinato
//   sulla finestra (il guscio lascia a Tauri il trascinamento, col suo predefinito), lo spegnimento o la
//   disconnessione di Windows (nessun messaggio di chiusura alla finestra): nessuna è provata;
// - il menu del motore col tasto destro (con «Aggiorna»): un menu nativo non si legge da qui; che l'app lo
//   fermi fuori dai campi di testo lo prova il browser;
// - nella CHIUSURA, un eseguibile mutato a ogni corsa: dei nove rilevatori della clausola, quattro sono stati visti
//   rossi su un eseguibile mutato, una volta («Annulla» che chiude la finestra; «Salva» che chiude senza scrivere;
//   la chiusura senza domanda, col guscio che non fermava la chiusura; «Annulla» che non fa nulla, rossa «non
//   chiude la domanda»); gli altri cinque mai (la finestra che si chiude mentre chiede, «Non salvare» che non
//   chiude o che cambia il file, «Salva» che non chiude, le domande del motore). La clausola senza modifiche ha il
//   suo controllo positivo a ogni corsa; la PREMESSA dello schermo libero è stata vista rossa una volta, sotto una
//   finestra ingrandita sopra tutte;
// - la premessa dello schermo libero dopo l'avvio: una finestra aperta sopra l'app a prova in corso non è vista
//   (la premessa si legge a ogni avvio, non prima di ogni clausola), né una copertura fatta da più finestre
//   insieme, nessuna delle quali copre l'app per intero;
// - nella CHIUSURA, il rilevatore delle domande del motore non si accende se l'app smette di tacere la rete di
//   `beforeunload` dopo la sua domanda: nella WebView2 la finestra distrutta non porta quella domanda (misurato
//   neutralizzando il segno dell'app); vale solo se il guscio chiudesse in un altro modo;
// - nella CHIUSURA e nella RICARICA, del testo scritto in campi aperti (di un blocco, la scheda, le celle): qui
//   l'autore si cambia con la finestra Proprietà e si conferma; i campi aperti li prova il browser col guscio
//   simulato;
// - nella CHIUSURA, «Salva» rinunciato (vuole la finestra del file nativa: lo prova il browser col guscio
//   simulato) e «Salva» con la scrittura che fallisce (nessuno); la chiusura da Alt+F4 o dal menu della
//   finestra, che mandano lo stesso messaggio; una finestra del processo diversa da quella dell'app
//   (`finestra-vera.ps1` prende la prima finestra visibile del processo: oggi è una sola);
// - dopo il riavvio, delle preferenze tornano lingua, colori, condizioni e modo dei campi dei blocchi; non
//   la barra, il modo dei dati, la conferma prima di cancellare un dato, i limiti, la cartella degli esempi;
// - nel CASO, «Passo passo» sulla riga, le differenze sotto il caso e i comandi dall'esito (li prova il
//   browser col guscio simulato, `e2e/costruzione.e2e.ts` e `e2e/casi.e2e.ts`); il caso confrontato dalla riga di comando
//   sul file salvato (lo fa la prova nel browser); un eseguibile mutato: il controllo positivo è il caso coi soli dati,
//   non raggiunto nella stessa corsa;
// - nella COSTRUZIONE, il pannello e le celle (sul prodotto solo i modi predefiniti; gli altri due li prova
//   il browser), «Nuovo» e la numerazione da un progetto nuovo (si parte da un file con i metadati e la Fine);
//   il suo controllo positivo è una condizione sul file di partenza, non una prova che il confronto sappia
//   dire rosso (quella è nel browser).
//
// L'esito del build si legge dall'eseguibile (data e dimensione), non dal solo exit code. Gli exit
// code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.
//
// Dal pacchetto della release: `--pacchetto <cartella>` (per esempio `..\dist\<versione>`) prende la cartella che
// lo strumento del pacchetto ha composto, controlla che abbia le voci dell'elenco e `data` vuota, e la copia intera nella
// cartella di prova (che ha uno spazio nel nome): l'eseguibile provato è `AlgoDesign.exe` del pacchetto, coi file del
// pacchetto accanto (ammessi accanto all'eseguibile), e la riga del BUILD dice la sua impronta intera. Esclude
// `--senza-build`.
//
// Due opzioni, per le prove con un utente senza diritti e con la chiavetta:
// - `--senza-build`: usa l'eseguibile già costruito (`shell\target\release`), senza Rust. La sua
//   impronta si stampa; il riferimento è l'impronta stampata dal giro che l'ha costruito (nel log di
//   quel giro), e il confronto si fa a occhio. La riga d'esito dice che il build è stato saltato;
// - `--radice <cartella>`: la cartella di prova si crea lì (per esempio sulla chiavetta) invece che in
//   `.collaudo\`. Ogni opzione si dà al più una volta, e il valore di `--radice` non comincia con `--`.
// In ogni caso la cartella di prova si cancella solo se contiene ciò che ci mettono la prova e l'app:
// al primo livello l'eseguibile e i file del pacchetto (file), `data` (una cartella), il file del progetto di prova e la
// tabella esportata, e in
// `data` solo `preferenze.json`, `webview`, `esempi` e `librerie` (con soli file `.algo`, anche nelle sottocartelle dei gruppi).
// Altrimenti la prova si ferma
// con un rosso e non tocca nulla.

import { chromium, type Browser, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { join, relative, resolve } from "node:path";
import { apri as apriProgetto, salva as testoDel } from "../core/progetto/formato";
import { csvIngleseAtteso, csvItalianoAtteso } from "../core/esecuzione/atteso-del-riferimento";
import { costruisci as costruisciIlRiferimento, differenze, riferimentoDellaTappa2, riferimentoDellaTappa3 } from "../e2e/costruzione";
import { vettoreRiempito } from "../e2e/vettore-riempito";
import { differenzeDallElenco, elencoDelPacchetto } from "./elenco-del-pacchetto";
import { testiDeiCodici } from "../i18n/codici";
import { dizionari, linguaDelSistema, nomiLingue, riempi, type Lingua } from "../i18n/lingue";

if (process.platform !== "win32") {
  console.error("prova-portabile: solo Windows");
  process.exit(2);
}

const radice = join(import.meta.dir, "..");
const identificatore = JSON.parse(readFileSync(join(radice, "shell", "tauri.conf.json"), "utf8")).identifier as string;
const portaDebug = 4352;
const cartellaLog = join(radice, ".collaudo");
mkdirSync(cartellaLog, { recursive: true });
const fileLog = join(cartellaLog, `prova-portabile-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
const argomenti = process.argv.slice(2);
const senzaBuild = argomenti.includes("--senza-build");
const radiceProva = argomenti.includes("--radice") ? argomenti[argomenti.indexOf("--radice") + 1] : cartellaLog;
const pacchetto = argomenti.includes("--pacchetto") ? argomenti[argomenti.indexOf("--pacchetto") + 1] : undefined;
const conValore = ["--radice", "--pacchetto"];
const sconosciuti = argomenti.filter((a, i) => a !== "--senza-build" && !conValore.includes(a) && !conValore.includes(argomenti[i - 1] ?? ""));
const ripetute = ["--senza-build", ...conValore].filter((o) => argomenti.filter((a) => a === o).length > 1);
const valoreMancante = (o: string, v: string | undefined) => argomenti.includes(o) && (v === undefined || v.startsWith("--"));
if (valoreMancante("--radice", radiceProva) || valoreMancante("--pacchetto", pacchetto) || radiceProva === undefined || sconosciuti.length > 0 || ripetute.length > 0 || (senzaBuild && pacchetto !== undefined)) {
  console.error(
    `uso: prova-portabile [--senza-build | --pacchetto <cartella del pacchetto>] [--radice <cartella>] (non riconosciuti: ${JSON.stringify(sconosciuti)}, ripetute: ${JSON.stringify(ripetute)}, --radice: ${JSON.stringify(radiceProva ?? null)}, --pacchetto: ${JSON.stringify(pacchetto ?? null)})`,
  );
  process.exit(2);
}
const cartellaProva = join(radiceProva, "prova portabile");
// Dal pacchetto la cartella di prova è la copia della cartella del pacchetto: l'eseguibile ha il suo nome, e accanto
// ci sono i file del pacchetto.
const nomeEseguibile = pacchetto === undefined ? "algodesign.exe" : "AlgoDesign.exe";
const accantoAmmessi = pacchetto === undefined ? [nomeEseguibile] : elencoDelPacchetto.filter((v) => !v.endsWith("/"));
const eseguibile = join(cartellaProva, nomeEseguibile);
const dati = join(cartellaProva, "data");
// Il progetto della clausola FILE, fuori da `data\`, e il suo contenuto di partenza (un file del corpus).
const nomeProgetto = "progetto di prova.algo";
const progettoFuori = join(cartellaProva, nomeProgetto);
// La tabella della clausola ESECUZIONE, accanto al progetto: il nome scritto nella finestra del sistema, senza `.csv`.
const nomeEsportata = "tabella esportata";
const testoDiPartenza = readFileSync(join(radice, "casi", "tappa-1", "riferimento-media-voti.algo"), "utf8");
const radiciTracce: Record<string, string> = { APPDATA: process.env.APPDATA!, LOCALAPPDATA: process.env.LOCALAPPDATA!, TEMP: process.env.TEMP! };
// `GetTempPath` usa `TMP` prima di `TEMP`: se sono due cartelle diverse, si guardano tutte e due.
const tmp = process.env.TMP;
if (tmp !== undefined && resolve(tmp).toLowerCase() !== resolve(radiciTracce.TEMP!).toLowerCase()) radiciTracce.TMP = tmp;

function log(testo: string): void {
  appendFileSync(fileLog, testo.endsWith("\n") ? testo : `${testo}\n`);
}

function riga(testo: string): void {
  console.log(testo);
  log(testo);
}

class ClausolaRossa extends Error {}

function rosso(clausola: string, motivo: string): never {
  throw new ClausolaRossa(`${clausola}: ROSSA — ${motivo}`);
}

/** Le clausole della prova, nell'ordine in cui corrono, col nome che hanno nella riga d'esito: la riga d'esito è
 * verde solo se ciascuna ha stampato la sua riga verde, in quest'ordine (una clausola che tornasse senza rosso e
 * senza riga non passa). */
const clausole: [string, string][] = [
  ["BUILD", "build"],
  ["FINESTRA", "finestra"],
  ["LINGUA", "lingua"],
  ["PREFERENZE", "preferenze"],
  ["FILE", "file"],
  ["LIBRERIA", "libreria aggiunta"],
  ["COSTRUZIONE", "costruzione"],
  ["CASO", "caso d'uso"],
  ["FUNZIONI", "costruzione con le funzioni"],
  ["ESECUZIONE", "esecuzione"],
  ["SICUREZZA", "politica di sicurezza dei contenuti"],
  ["VETTORE", "vettore di 1000 elementi"],
  ["RICORSIONE", "ricorsione al tetto"],
  ["CHIUSURA", "chiusura"],
  ["RICARICA", "ricarica"],
  ["TRACCE (portabile)", "tracce"],
  ["TRACCE (controllo positivo)", "controllo positivo delle tracce"],
];
/** Le clausole che hanno stampato la riga verde, nell'ordine. */
const verdi: string[] = [];

function verde(clausola: string, dettaglio: string): void {
  riga(`${clausola}: VERDE | ${dettaglio}`);
  verdi.push(clausola);
}

/** Un testo nel messaggio di un rosso: fra virgolette, coi caratteri che non si vedono (il BOM, gli spazi diversi
 * dallo spazio, i caratteri di formato) scritti in forma di fuga, come quelli di controllo che `JSON.stringify` scrive
 * già così; altrimenti due righe diverse possono uscire identiche a occhio. */
function visibile(testo: string | undefined): string {
  return JSON.stringify(testo ?? null).replace(/[\p{Cf}\p{Z}]/gu, (c) => (c === " " ? c : `\\u${c.codePointAt(0)!.toString(16).padStart(4, "0")}`));
}

async function esegui(cmd: string[]): Promise<number> {
  log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({ cmd, cwd: radice, stdout: "pipe", stderr: "pipe" });
  const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  log(out + err);
  log(`(exit ${codice})`);
  return codice;
}

/** I file del profilo della WebView possono restare bloccati per qualche istante dopo la chiusura. */
async function cancella(percorso: string): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      rmSync(percorso, { recursive: true, force: true });
      return;
    } catch (e) {
      if (i === 20) throw e;
      await Bun.sleep(250);
    }
  }
}

async function portaLibera(): Promise<boolean> {
  try {
    const prova = Bun.listen({ hostname: "127.0.0.1", port: portaDebug, socket: { data() {} } });
    prova.stop(true);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------------------- tracce

type Fotografia = Record<string, Set<string>>;

function fotografa(): Fotografia {
  return Object.fromEntries(Object.entries(radiciTracce).map(([nome, cartella]) => [nome, new Set(readdirSync(cartella))]));
}

function cartelleIdentificatore(): string[] {
  return Object.values(radiciTracce).flatMap((cartella) =>
    readdirSync(cartella)
      .filter((voce) => voce.toLowerCase().includes(identificatore.toLowerCase()))
      .map((voce) => join(cartella, voce)),
  );
}

type Tracce = { conIdentificatore: string[]; nuove: string[]; modificate: string[] };

/** I due rilevatori, rispetto alla fotografia e alla soglia prese al marcatore d'inizio del giro. */
function rileva(prima: Fotografia, soglia: Date): Tracce {
  const nuove: string[] = [];
  const modificate: string[] = [];
  for (const [nome, cartella] of Object.entries(radiciTracce)) {
    for (const voce of readdirSync(cartella)) {
      const pieno = join(cartella, voce);
      if (!prima[nome]!.has(voce)) nuove.push(pieno);
      else {
        try {
          if (statSync(pieno).mtimeMs >= soglia.getTime()) modificate.push(pieno);
        } catch {
          // Sparita fra l'elenco e la lettura: un altro processo, non conta.
        }
      }
    }
  }
  return { conIdentificatore: cartelleIdentificatore(), nuove, modificate };
}

/** Una voce nuova per il messaggio rosso: dimensione e ora, e il segnale del rumore noto di Chrome. */
function descriviVoceNuova(percorso: string): string {
  try {
    const st = statSync(percorso);
    const tipo = st.isDirectory() ? "cartella" : `${st.size} byte`;
    const chrome = st.isFile() && st.size === 0 && percorso.toLowerCase().endsWith(".tmp");
    return `${percorso} (${tipo}, ${st.mtime.toISOString()}${chrome ? "; .tmp vuoto: forse Chrome, confronta l'ora con l'avvio dei processi chrome e rilancia" : ""})`;
  } catch {
    return `${percorso} (sparita prima della lettura)`;
  }
}

function descriviTracce(t: Tracce): void {
  riga(`  rilevatore identificatore: ${t.conIdentificatore.length} ${JSON.stringify(t.conIdentificatore)}`);
  riga(`  rilevatore voci nuove: ${t.nuove.length} ${JSON.stringify(t.nuove)}`);
  riga(`  voci modificate senza l'identificatore (informazione): ${t.modificate.length} ${JSON.stringify(t.modificate)}`);
}

function contaFile(cartella: string): { file: number; byte: number } {
  let file = 0;
  let byte = 0;
  for (const voce of readdirSync(cartella, { withFileTypes: true, recursive: true })) {
    if (!voce.isFile()) continue;
    file++;
    try {
      byte += statSync(join(voce.parentPath, voce.name)).size;
    } catch {
      // Un file che sparisce mentre si conta.
    }
  }
  return { file, byte };
}

/** Le cartelle dell'identificatore si guardano (descritte nel log) e poi si cancellano: nient'altro. */
async function guardaECancella(): Promise<string[]> {
  const trovate = cartelleIdentificatore();
  for (const cartella of trovate) {
    const { file, byte } = contaFile(cartella);
    riga(`  guardata ${cartella}: ${file} file, ${byte} byte, primo livello ${JSON.stringify(readdirSync(cartella))}`);
    await cancella(cartella);
  }
  return trovate;
}

// ------------------------------------------------------------------------------------------ finestra

type Avvio = { proc: Bun.Subprocess; browser?: Browser; pagina?: Page };

/** L'app in esecuzione, da chiudere anche se la prova si ferma a metà. */
let aperta: Avvio | undefined;

async function avvia(argomenti: string[] = []): Promise<{ proc: Bun.Subprocess; browser: Browser; pagina: Page }> {
  if (!(await portaLibera())) rosso("PROVA", `la porta ${portaDebug} è occupata prima dell'avvio`);
  const proc = Bun.spawn([eseguibile, ...argomenti], {
    cwd: cartellaProva,
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${portaDebug}` },
    stdout: "ignore",
    stderr: "ignore",
  });
  aperta = { proc };
  log(`avviato ${eseguibile}, PID ${proc.pid}`);
  let browser: Browser | undefined;
  for (let i = 0; i < 80 && !browser; i++) {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${portaDebug}`);
    } catch {
      await Bun.sleep(250);
    }
  }
  if (!browser) rosso("PROVA", `nessuna risposta sulla porta ${portaDebug} (PID ${proc.pid})`);
  aperta.browser = browser;
  let pagina: Page | undefined;
  for (let i = 0; i < 80 && !pagina; i++) {
    pagina = browser.contexts()[0]?.pages()[0];
    if (!pagina) await Bun.sleep(250);
  }
  if (!pagina) rosso("PROVA", "collegati, ma nessuna pagina");
  // Appena collegati la pagina può essere ancora `about:blank`: si aspetta la barra, cioè il suo primo
  // pulsante (quale lingua lo dice il nome del comando delle Impostazioni, dopo).
  await pagina.getByRole("banner").getByRole("button").first().waitFor({ timeout: 15_000 });
  // La premessa: la finestra dell'app si vede. Coperta per intero, la WebView2 sospende il disegno e le clausole
  // uscirebbero rosse accusando il codice.
  const schermo = await finestraVera(proc.pid, "coperta");
  if (schermo !== "libera") rosso("PREMESSA", `schermo coperto, la finestra dell'app non si vede (${schermo}): liberare lo schermo e rilanciare`);
  return { proc, browser, pagina };
}

/** Chiusura per PID dell'albero avviato (con i processi di WebView2), mai per nome. */
async function chiudi(a: Avvio): Promise<void> {
  await a.browser?.close().catch(() => {});
  const codice = await esegui(["taskkill", "/PID", String(a.proc.pid), "/T", "/F"]);
  await a.proc.exited;
  for (let i = 0; i < 40 && !(await portaLibera()); i++) await Bun.sleep(250);
  if (!(await portaLibera())) rosso("PROVA", `dopo la chiusura del PID ${a.proc.pid} (taskkill exit ${codice}) la porta ${portaDebug} è ancora occupata`);
  // Solo adesso l'app è chiusa: se la porta restava occupata, la pulizia finale riprova.
  aperta = undefined;
}

/** L'app si chiude da sola entro `ms`: allora il browser si scollega e la porta torna libera. */
async function uscita(a: Avvio, ms: number): Promise<boolean> {
  const uscita = await Promise.race([a.proc.exited.then(() => true), Bun.sleep(ms).then(() => false)]);
  if (!uscita) return false;
  await a.browser?.close().catch(() => {});
  for (let i = 0; i < 40 && !(await portaLibera()); i++) await Bun.sleep(250);
  if (!(await portaLibera())) rosso("PROVA", `il PID ${a.proc.pid} è uscito ma la porta ${portaDebug} è ancora occupata`);
  aperta = undefined;
  return true;
}

/** La finestra vera del processo (`finestra-vera.ps1`): il messaggio di un tasto o quello di chiusura. Una
 * PowerShell che non risponde entro 30 s si ferma, e l'esito lo dice (mai un'attesa senza fine). */
async function finestraVera(pid: number, azione: "tasto" | "chiudi" | "coperta" | "salva", argomento?: string): Promise<string> {
  const cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(import.meta.dir, "finestra-vera.ps1"), String(pid), azione, ...(argomento === undefined ? [] : [argomento])];
  log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
  const letto = Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]).then(([out, err, codice]) => ({ out, err, codice }));
  const esito = await Promise.race([letto, Bun.sleep(30_000).then(() => null)]);
  if (esito === null) {
    proc.kill();
    log("(PowerShell fermata dopo 30 s)");
    return "NON inviato: PowerShell non ha risposto in 30 s";
  }
  log(`${esito.out}${esito.err}(PowerShell: exit ${esito.codice})`);
  // Una PowerShell che non arriva a stampare l'esito (per esempio `Add-Type` che fallisce): il motivo è il suo errore.
  const riga = esito.out.trim();
  return riga !== "" ? riga : `NON inviato: PowerShell senza esito (exit ${esito.codice}): ${esito.err.trim().split("\n")[0] ?? ""}`;
}

/** Il messaggio di chiusura alla finestra; se non parte, la clausola è rossa (il guasto è dello strumento). */
async function chiudiLaFinestraVera(pid: number): Promise<void> {
  const spedita = await finestraVera(pid, "chiudi");
  if (spedita !== "chiusura spedita") rosso("CHIUSURA", `messaggio di chiusura non spedito: ${spedita}`);
}

/** Il messaggio di un tasto alla finestra d'input di WebView2; se non parte, la clausola è rossa (un gesto non
 * eseguito non è mai un verde). */
async function tastoVero(pid: number, tasto: "f5" | "z", clausola: string): Promise<void> {
  const esito = await finestraVera(pid, "tasto", tasto);
  if (esito !== "inviato") rosso(clausola, `il tasto «${tasto}» non è stato mandato alla finestra: ${esito}`);
}

/** La finestra Proprietà, dal menu «Progetto» della barra: il menu si apre, si aspetta il fuoco dentro (Ark ce lo
 * mette un fotogramma dopo), poi la voce. */
async function apriProprieta(pagina: Page, lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  await pagina.getByRole("banner").getByRole("button", { name: testi.menuProgetto, exact: true }).click();
  await pagina.waitForFunction(() => document.activeElement?.closest('[role="menu"]') != null, undefined, { polling: "raf", timeout: 10_000 });
  await pagina.getByRole("menu", { name: testi.menuProgetto, exact: true }).getByRole("menuitem", { name: testi.progetto, exact: true }).click();
}

/** Cambia l'autore dalla finestra Proprietà: il progetto è modificato. */
async function cambiaAutore(pagina: Page, lingua: Lingua, autore: string): Promise<void> {
  const testi = dizionari[lingua];
  await apriProprieta(pagina, lingua);
  const finestra = pagina.getByRole("dialog", { name: testi.progettoTitolo, exact: true });
  await finestra.getByLabel(testi.progettoAutore, { exact: true }).fill(autore);
  await finestra.getByRole("button", { name: testi.progettoConferma, exact: true }).click();
  await finestra.waitFor({ state: "hidden" });
}

/** Il comando delle Impostazioni nella barra, col nome in una lingua: c'è solo in quella mostrata. */
const comandoImpostazioni = (pagina: Page, lingua: Lingua) => pagina.getByRole("banner").getByRole("button", { name: dizionari[lingua].impostazioni, exact: true });

async function linguaMostrata(pagina: Page): Promise<{ lingua: Lingua; lang: string }> {
  for (const lingua of Object.keys(dizionari) as Lingua[]) {
    if ((await comandoImpostazioni(pagina, lingua).count()) === 1) {
      return { lingua, lang: await pagina.evaluate(() => document.documentElement.lang) };
    }
  }
  rosso("PROVA", "il comando delle Impostazioni non è in alcuna lingua nota");
}

async function attendiLingua(pagina: Page, lingua: Lingua, clausola: string): Promise<void> {
  try {
    await comandoImpostazioni(pagina, lingua).waitFor({ timeout: 10_000 });
  } catch {
    rosso(clausola, `atteso il comando delle Impostazioni in «${lingua}», mostrato in «${(await linguaMostrata(pagina)).lingua}»`);
  }
  const lang = await pagina.evaluate(() => document.documentElement.lang);
  if (lang !== lingua) rosso(clausola, `<html lang> vale «${lang}» invece di «${lingua}»`);
}

/** Aspetta che il file delle preferenze contenga quei campi con quei valori. */
async function attendiFile(percorso: string, attesi: Record<string, string>, clausola: string): Promise<void> {
  let letto: unknown = null;
  for (let i = 0; i < 40; i++) {
    try {
      letto = JSON.parse(readFileSync(percorso, "utf8"));
      if (Object.entries(attesi).every(([k, v]) => (letto as Record<string, unknown>)[k] === v)) return;
    } catch {
      // Non ancora scritto.
    }
    await Bun.sleep(250);
  }
  rosso(clausola, `${percorso} non contiene ${JSON.stringify(attesi)}: ${JSON.stringify(letto)}`);
}

/** Le Impostazioni aperte dalla barra (nella lingua mostrata), le scelte fatte, «Conferma». */
async function nelleImpostazioni(pagina: Page, lingua: Lingua, scelte: (finestra: ReturnType<Page["getByRole"]>) => Promise<void>): Promise<void> {
  await comandoImpostazioni(pagina, lingua).click();
  const finestra = pagina.getByRole("dialog", { name: dizionari[lingua].impostazioniTitolo, exact: true });
  await finestra.waitFor();
  await scelte(finestra);
  await finestra.getByRole("button", { name: dizionari[lingua].progettoConferma, exact: true }).click();
  await finestra.waitFor({ state: "hidden" });
}

/** Primo avvio senza preferenza: lingua del sistema; poi il passaggio all'altra lingua, nelle Impostazioni. */
async function primoAvvioECambio(clausola: string): Promise<{ iniziale: Lingua; opposta: Lingua; a: Avvio }> {
  const a = await avvia();
  const sistema = await a.pagina.evaluate(() => navigator.language);
  const iniziale = linguaDelSistema(sistema);
  const opposta: Lingua = iniziale === "it" ? "en" : "it";
  riga(`  indirizzo dell'interfaccia: ${a.pagina.url()} · navigator.language «${sistema}» → lingua iniziale «${iniziale}»`);
  await attendiLingua(a.pagina, iniziale, clausola);
  await nelleImpostazioni(a.pagina, iniziale, (f) => f.getByRole("radio", { name: nomiLingue[opposta], exact: true }).check());
  await attendiLingua(a.pagina, opposta, clausola);
  return { iniziale, opposta, a };
}

/** La finestra ingrandita: occupa l'area di lavoro dello schermo (a meno della cornice). */
async function ingrandita(pagina: Page): Promise<string> {
  const m = await pagina.evaluate(() => ({ larga: outerWidth, alta: outerHeight, schermoL: screen.availWidth, schermoA: screen.availHeight }));
  const descritta = `finestra ${m.larga} × ${m.alta}, area di lavoro ${m.schermoL} × ${m.schermoA}`;
  // Controllo positivo nel numero: la finestra non ingrandita è di 1024 × 720 (più la cornice), molto meno.
  if (m.schermoL - m.larga > 32 || m.schermoA - m.alta > 32) rosso("FINESTRA", `non ingrandita: ${descritta}`);
  return descritta;
}

function marcatore(giro: string): { soglia: Date; prima: Fotografia } {
  const prima = fotografa();
  const soglia = new Date();
  log(`=== INIZIO GIRO ${giro} ${soglia.toISOString()} ===`);
  return { soglia, prima };
}

// ---------------------------------------------------------------------------------------------- giri

/** Ciò che nella cartella di prova non ci hanno messo la prova e l'app: se è vuoto, la si può cancellare. */
function estraneeAllaProva(): string[] {
  if (!existsSync(cartellaProva)) return [];
  // L'eseguibile e i file del pacchetto, di una prova fatta in un modo o nell'altro (Windows non bada alle maiuscole).
  const dellaProva = new Set(["algodesign.exe", ...elencoDelPacchetto.filter((v) => !v.endsWith("/")).map((v) => v.toLowerCase())]);
  const estranee = readdirSync(cartellaProva).filter((v) => !dellaProva.has(v.toLowerCase()) && v !== "data" && v !== nomeProgetto && v !== `${nomeEsportata}.csv`);
  for (const v of readdirSync(cartellaProva).filter((v) => dellaProva.has(v.toLowerCase()))) if (!lstatSync(join(cartellaProva, v)).isFile()) estranee.push(`${v} (non è un file)`);
  if (existsSync(progettoFuori) && !lstatSync(progettoFuori).isFile()) estranee.push(`${nomeProgetto} (non è un file)`);
  if (existsSync(dati)) {
    if (!lstatSync(dati).isDirectory()) estranee.push("data (non è una cartella)");
    else estranee.push(...readdirSync(dati).filter((v) => v !== "preferenze.json" && v !== "webview" && v !== "esempi" && v !== "librerie").map((v) => `data\\${v}`));
    for (const nome of ["esempi", "librerie"]) estranee.push(...estraneeNellaCartella(nome));
  }
  return estranee;
}

/** Ciò che in una cartella di progetti di `data` (gli esempi, le librerie) non è un file `.algo`, fuori da ogni gruppo o
 * in un gruppo (una sottocartella con soli file `.algo`). */
function estraneeNellaCartella(nome: string): string[] {
  const cartella = join(dati, nome);
  if (!existsSync(cartella)) return [];
  if (!lstatSync(cartella).isDirectory()) return [`data\\${nome} (non è una cartella)`];
  return readdirSync(cartella, { withFileTypes: true }).flatMap((v) =>
    v.isDirectory()
      ? readdirSync(join(cartella, v.name), { withFileTypes: true })
          .filter((w) => !w.isFile() || !w.name.endsWith(".algo"))
          .map((w) => `data\\${nome}\\${v.name}\\${w.name}`)
      : !v.isFile() || !v.name.endsWith(".algo")
        ? [`data\\${nome}\\${v.name}`]
        : [],
  );
}

/** Dal pacchetto: la cartella ha le voci dell'elenco e `data` vuota; si copia intera nella cartella di prova. */
async function dalPacchetto(cartella: string): Promise<string> {
  if (!existsSync(cartella) || !lstatSync(cartella).isDirectory()) rosso("BUILD", `--pacchetto ${cartella}: non è una cartella`);
  const voci = readdirSync(cartella, { withFileTypes: true }).map((v) => (v.isDirectory() ? `${v.name}/` : v.name)).sort();
  const differenze = differenzeDallElenco(voci);
  if (differenze.length > 0) rosso("BUILD", `--pacchetto ${cartella}: le voci non sono quelle del pacchetto: ${differenze.join(", ")}`);
  if (readdirSync(join(cartella, "data")).length > 0) rosso("BUILD", `--pacchetto ${cartella}: data non è vuota`);
  const exe = join(cartella, nomeEseguibile);
  const impronta = createHash("sha256").update(readFileSync(exe)).digest("hex");
  const estranee = estraneeAllaProva();
  if (estranee.length > 0) rosso("PROVA", `${cartellaProva} contiene altro oltre a ciò che la prova ci mette, non la cancello: ${estranee.join(", ")}`);
  await cancella(cartellaProva);
  cpSync(cartella, cartellaProva, { recursive: true });
  const copiata = createHash("sha256").update(readFileSync(eseguibile)).digest("hex");
  if (copiata !== impronta) rosso("BUILD", `la copia di ${nomeEseguibile} ha l'impronta ${copiata}, il pacchetto ${impronta}`);
  riga(`BUILD: DAL PACCHETTO | ${cartella} (${voci.length} voci dell'elenco) copiata in «${cartellaProva}» | ${nomeEseguibile} ${(statSync(exe).size / 1024 / 1024).toFixed(1)} MB, sha256 ${impronta}`);
  verdi.push("BUILD");
  return `eseguibile del pacchetto sha256 ${impronta}`;
}

/** Costruisce (o, con `--senza-build`, prende) l'eseguibile; restituisce la clausola per la riga d'esito. */
async function costruisci(): Promise<string> {
  if (pacchetto !== undefined) return dalPacchetto(resolve(pacchetto));
  const rilascio = join(radice, "shell", "target", "release", "algodesign.exe");
  let esitoBuild = "";
  if (senzaBuild) {
    if (!existsSync(rilascio)) rosso("BUILD", `--senza-build ma ${relative(radice, rilascio)} non esiste`);
  } else {
    const inizio = Date.now();
    const codice = await esegui([process.execPath, "tauri", "build", "--no-bundle"]);
    const secondi = Math.round((Date.now() - inizio) / 1000);
    if (codice !== 0) rosso("BUILD", `exit ${codice} dopo ${secondi} s (dettaglio nel log)`);
    if (!existsSync(rilascio)) rosso("BUILD", `exit 0 ma ${relative(radice, rilascio)} non esiste`);
    if (statSync(rilascio).mtime.getTime() < inizio) rosso("BUILD", `exit 0 ma l'eseguibile è del ${statSync(rilascio).mtime.toISOString()}, prima del build`);
    esitoBuild = `${secondi} s | `;
  }
  const { size, mtime } = statSync(rilascio);
  if (size === 0) rosso("BUILD", `${relative(radice, rilascio)} è vuoto (0 byte)`);
  const impronta = createHash("sha256").update(readFileSync(rilascio)).digest("hex").slice(0, 16);
  const descritto = `${relative(radice, rilascio)} ${(size / 1024 / 1024).toFixed(1)} MB del ${mtime.toISOString()}, sha256 ${impronta}… | cartella di prova «${cartellaProva}»`;
  // Saltato, il build ha la sua riga ma non è verde: la riga d'esito lo dice.
  if (senzaBuild) {
    riga(`BUILD: SALTATO (--senza-build) | ${descritto}`);
    verdi.push("BUILD");
  } else verde("BUILD", `${esitoBuild}${descritto}`);

  // La cartella di prova si cancella solo se contiene ciò che la prova ci mette (può stare su una chiavetta).
  const estranee = estraneeAllaProva();
  if (estranee.length > 0) rosso("PROVA", `${cartellaProva} contiene altro oltre a ciò che la prova ci mette, non la cancello: ${estranee.join(", ")}`);
  await cancella(cartellaProva);
  mkdirSync(dati, { recursive: true });
  cpSync(rilascio, eseguibile);
  return senzaBuild ? `build SALTATO, eseguibile esistente sha256 ${impronta}…` : "build";
}

async function giroPortabile(): Promise<void> {
  const { soglia, prima } = marcatore("portabile");
  const preferenze = join(dati, "preferenze.json");

  const { iniziale, opposta, a } = await primoAvvioECambio("LINGUA");
  verde("FINESTRA", `ingrandita all'apertura: ${await ingrandita(a.pagina!)}`);
  await attendiFile(preferenze, { lingua: opposta }, "LINGUA");
  await chiudi(a);

  // Alla seconda apertura la lingua c'è; si scelgono colori e modo dei campi dei blocchi.
  const testi = dizionari[opposta];
  const secondo = await avvia();
  await attendiLingua(secondo.pagina, opposta, "LINGUA");
  const coloriDi = (p: Page) => p.evaluate(() => document.documentElement.dataset.colori);
  const coloriPrima = await coloriDi(secondo.pagina);
  if (coloriPrima !== "tenue") rosso("PREFERENZE", `al primo avvio i colori sono «${coloriPrima}» invece dei predefiniti`);
  await nelleImpostazioni(secondo.pagina, opposta, async (f) => {
    await f.getByRole("radio", { name: testi.coloriContrasto, exact: true }).check();
    await f.getByRole("radio", { name: testi.condizioniUnaRiga, exact: true }).check();
    await f.getByRole("tab", { name: testi.impostazioniModifica, exact: true }).click();
    await f.getByRole("radio", { name: testi.modoPannello, exact: true }).check();
  });
  await attendiFile(preferenze, { lingua: opposta, colori: "contrasto", condizioni: "su-una-riga", modoDeiBlocchi: "pannello" }, "PREFERENZE");
  await chiudi(secondo);

  const terzo = await avvia();
  await attendiLingua(terzo.pagina, opposta, "LINGUA");
  const coloriDopo = await coloriDi(terzo.pagina);
  if (coloriDopo !== "contrasto") rosso("PREFERENZE", `dopo il riavvio i colori sono «${coloriDopo}» invece di «contrasto»`);
  await comandoImpostazioni(terzo.pagina, opposta).click();
  const finestra = terzo.pagina.getByRole("dialog", { name: testi.impostazioniTitolo, exact: true });
  if (!(await finestra.getByRole("radio", { name: testi.condizioniUnaRiga, exact: true }).isChecked())) rosso("PREFERENZE", "dopo il riavvio la forma delle condizioni lunghe non è «su una riga»");
  await finestra.getByRole("tab", { name: testi.impostazioniModifica, exact: true }).click();
  if (!(await finestra.getByRole("radio", { name: testi.modoPannello, exact: true }).isChecked())) rosso("PREFERENZE", "dopo il riavvio il modo dei campi dei blocchi non è il pannello");
  await chiudi(terzo);

  // Controllo positivo: senza il file la lingua e i colori salvati non possono tornare.
  rmSync(preferenze);
  const quarto = await avvia();
  await attendiLingua(quarto.pagina, iniziale, "LINGUA (controllo positivo)");
  const coloriSenza = await coloriDi(quarto.pagina);
  if (coloriSenza !== "tenue") rosso("PREFERENZE (controllo positivo)", `senza il file i colori sono «${coloriSenza}»`);
  await chiudi(quarto);
  verde(
    "LINGUA",
    `«${iniziale}» → «${opposta}» nelle Impostazioni, ritrovata dopo la chiusura per PID; data\\preferenze.json con «${opposta}» | controllo positivo acceso (senza il file torna «${iniziale}»)`,
  );
  verde(
    "PREFERENZE",
    `colori «tenue» → «contrasto», condizioni lunghe su una riga e campi dei blocchi nel pannello, ritrovati dopo la chiusura per PID (colori del documento, scelta nella finestra) e scritti nel file | controllo positivo acceso (senza il file tornano i colori «tenue»)`,
  );

  await giroDelFile(iniziale);
  await giroDellaLibreria(iniziale);
  await giroDellaCostruzione(iniziale);
  await giroDelleFunzioni(iniziale);
  await giroDellEsecuzione(iniziale);
  await giroDelVettore(iniziale);
  await giroDellaRicorsione(iniziale);
  await giroDellaChiusura(iniziale);
  await giroDellaRicarica(iniziale);

  const tracce = rileva(prima, soglia);
  descriviTracce(tracce);
  const profilo = join(dati, "webview");
  const { file: nelProfilo, byte: byteDelProfilo } = existsSync(profilo) ? contaFile(profilo) : { file: 0, byte: 0 };
  if (tracce.conIdentificatore.length > 0) rosso("TRACCE", `cartelle dell'identificatore: ${tracce.conIdentificatore.join("; ")}`);
  if (tracce.nuove.length > 0) rosso("TRACCE", `voci nuove fuori dall'elenco (vuoto): ${tracce.nuove.map(descriviVoceNuova).join("; ")}`);
  if (nelProfilo === 0) rosso("TRACCE", "data\\webview è vuota: il profilo della WebView non è andato in data\\");
  const accanto = readdirSync(cartellaProva).filter((v) => !accantoAmmessi.includes(v) && v !== "data");
  if (accanto.length > 0) rosso("TRACCE", `accanto all'eseguibile, fuori da data\\: ${accanto.join(", ")}`);
  verde("TRACCE (portabile)", `zero | profilo della WebView in data\\webview (${nelProfilo} file, ${(byteDelProfilo / 1024 / 1024).toFixed(1)} MB) | accanto all'eseguibile solo data\\${pacchetto === undefined ? "" : " e i file del pacchetto"}`);
}

/** La clausola FILE: il progetto dato come argomento, fuori da `data\`, cambiato e salvato dall'interfaccia. */
async function giroDelFile(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const autore = "Prova portabile";
  const partenza = apriProgetto(testoDiPartenza);
  if (!partenza.ok) rosso("FILE", "il file del corpus non si apre");
  const atteso = testoDel({ ...partenza.progetto, metadata: { ...partenza.progetto.metadata, author: autore } });
  if (atteso === testoDiPartenza) rosso("FILE (controllo positivo)", "l'atteso è uguale al file di partenza: il confronto non vedrebbe la scrittura");
  writeFileSync(progettoFuori, testoDiPartenza);

  const a = await avvia([progettoFuori]);
  const nome = `${testi.flowchart}: ${partenza.progetto.metadata.name}`;
  try {
    await a.pagina.getByRole("group", { name: nome, exact: true }).waitFor({ timeout: 15_000 });
  } catch {
    rosso("FILE", `il file dato come argomento non si è aperto: manca il flowchart «${nome}»`);
  }
  await cambiaAutore(a.pagina, lingua, autore);
  await a.pagina.getByRole("banner").getByRole("button", { name: testi.salva, exact: true }).click();
  let scritto = "";
  for (let i = 0; i < 40 && scritto !== atteso; i++) {
    await Bun.sleep(250);
    scritto = readFileSync(progettoFuori, "utf8");
  }
  if (scritto !== atteso) rosso("FILE", `${progettoFuori} non contiene i byte attesi dopo «Salva» (${Buffer.byteLength(scritto)} byte invece di ${Buffer.byteLength(atteso)})`);
  // I file della cartella degli esempi, «gruppo\nome» per quelli di un gruppo.
  const cartellaEsempi = join(dati, "esempi");
  const esempi = existsSync(cartellaEsempi)
    ? readdirSync(cartellaEsempi, { withFileTypes: true })
        .flatMap((v) => (v.isDirectory() ? readdirSync(join(cartellaEsempi, v.name)).map((w) => `${v.name}\\${w}`) : [v.name]))
        .sort()
    : [];
  await chiudi(a);
  const temporanei = readdirSync(cartellaProva).filter((v) => v.endsWith(".tmp"));
  if (temporanei.length > 0) rosso("FILE", `temporanei rimasti accanto al file: ${temporanei.join(", ")}`);
  const forniti = [
    ...[testi.esempioMediaVoti, testi.esempioPariDispari, testi.esempioPrimoQuadrato, testi.esempioFattoriale].map((n) => `${testi.esempiGruppoPrimiPassi}\\${n}.algo`),
    ...[testi.esempioMediaVotiPer, testi.esempioParolaAlContrario].map((n) => `${testi.esempiGruppoCicli}\\${n}.algo`),
    ...[testi.esempioMediaVotiFunzioni, testi.esempioCopie, testi.esempioTreLivelli, testi.esempioFattorialeRicorsivo, testi.esempioSequenzaDiFibonacci].map((n) => `${testi.esempiGruppoFunzioni}\\${n}.algo`),
  ].sort();
  if (JSON.stringify(esempi) !== JSON.stringify(forniti)) rosso("FILE", `data\\esempi non ha gli undici esempi forniti nei loro gruppi: ${JSON.stringify(esempi)}`);
  rmSync(progettoFuori);
  verde(
    "FILE",
    `${nomeProgetto} fuori da data\\, aperto come argomento, salvato con «Salva»: ${Buffer.byteLength(atteso)} byte uguali all'atteso, nessun temporaneo | data\\esempi con i ${forniti.length} forniti nei loro gruppi | controllo positivo acceso (il file di partenza era diverso)`,
  );
}

/** La clausola LIBRERIA: la libreria del corpus data come argomento, aggiunta alla cartella delle librerie dalla finestra
 * dell'importazione. */
async function giroDellaLibreria(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const testo = readFileSync(join(radice, "casi", "tappa-3", "libreria-dei-voti.algo"), "utf8");
  const libreria = apriProgetto(testo);
  if (!libreria.ok || libreria.progetto.metadata.library !== true) rosso("LIBRERIA", "la libreria del corpus non si apre, o non è segnata");
  const cartella = join(dati, "librerie");
  if (existsSync(cartella)) rosso("LIBRERIA (controllo positivo)", "data\\librerie c'è già prima della clausola: la scrittura non si vedrebbe");
  writeFileSync(progettoFuori, testo);
  const a = await avvia([progettoFuori]);
  const nome = `${testi.flowchart}: ${libreria.progetto.metadata.name}`;
  try {
    await a.pagina.getByRole("group", { name: nome, exact: true }).waitFor({ timeout: 15_000 });
  } catch {
    rosso("LIBRERIA", `il file dato come argomento non si è aperto: manca il flowchart «${nome}»`);
  }
  await a.pagina.getByRole("banner").getByRole("button", { name: testi.menuProgetto, exact: true }).click();
  await a.pagina.waitForFunction(() => document.activeElement?.closest('[role="menu"]') != null, undefined, { polling: "raf", timeout: 10_000 });
  await a.pagina.getByRole("menu", { name: testi.menuProgetto, exact: true }).getByRole("menuitem", { name: testi.importaFunzioni, exact: true }).click();
  const finestra = a.pagina.getByRole("dialog", { name: testi.importaTitolo, exact: true });
  await finestra.getByRole("button", { name: testi.importaAggiungi, exact: true }).click();
  // Il nome atteso è scritto qui, non ricavato dalla funzione che l'app usa per darlo: se cambiassero insieme, la prova
  // non lo vedrebbe.
  const scritto = join(cartella, testi.importaGruppoMiei, "libreria-dei-voti.algo");
  let letto = "";
  for (let i = 0; i < 40 && letto !== testo; i++) {
    await Bun.sleep(250);
    letto = existsSync(scritto) ? readFileSync(scritto, "utf8") : "";
  }
  if (letto !== testo) rosso("LIBRERIA", `${relative(cartellaProva, scritto)} non contiene i byte della libreria (${Buffer.byteLength(letto)} byte invece di ${Buffer.byteLength(testo)})`);
  try {
    await finestra.locator(`[data-gruppo="${testi.importaGruppoMiei}"]`).waitFor({ timeout: 10_000 });
  } catch {
    rosso("LIBRERIA", `la finestra, riletta la cartella, non mostra il gruppo «${testi.importaGruppoMiei}»`);
  }
  await chiudi(a);
  rmSync(progettoFuori);
  // La guardia della cartella di prova riconosce la cartella nuova; controllo positivo: un file che non è un progetto,
  // dentro il gruppo, le è estraneo.
  const prima = estraneeAllaProva();
  if (prima.length > 0) rosso("LIBRERIA", `la guardia della cartella di prova non riconosce ciò che l'app scrive: ${prima.join(", ")}`);
  const sonda = join(cartella, testi.importaGruppoMiei, "note.txt");
  writeFileSync(sonda, "x");
  const conSonda = estraneeAllaProva();
  rmSync(sonda);
  if (conSonda.length !== 1) rosso("LIBRERIA (controllo positivo)", `la guardia non vede un file estraneo fra le librerie: ${JSON.stringify(conSonda)}`);
  verde(
    "LIBRERIA",
    `«${testi.importaAggiungi}» ha scritto ${relative(cartellaProva, scritto)} (${Buffer.byteLength(testo)} byte, quelli della libreria) e la finestra mostra il gruppo | controllo positivo acceso (data\\librerie non c'era prima) | guardia della cartella di prova: riconosce le librerie, e vede ${conSonda.join(", ")}`,
  );
}

/** La clausola COSTRUZIONE: il programma di riferimento della tappa 2 (coi cicli `per`) costruito sul prodotto, in un
 * progetto vuoto dato come argomento, e salvato con «Salva» nello stesso file. */
async function giroDellaCostruzione(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const attesoDellaCostruzione = riferimentoDellaTappa2.atteso;
  const f = attesoDellaCostruzione.progetto.functions[0]!;
  // Il caso d'uso lo scrive la costruzione: il file di partenza non lo ha (con il caso dell'atteso, la scheda dei casi
  // partiva da uno e la costruzione non la trovava: visto alla prima corsa dopo che la costruzione scrive il caso).
  const { test_cases: _, ...senzaCasi } = attesoDellaCostruzione.progetto;
  const vuoto = testoDel({ ...senzaCasi, functions: [{ ...f, data: [], body: [] }] });
  if (vuoto === attesoDellaCostruzione.testo) rosso("COSTRUZIONE (controllo positivo)", "il progetto vuoto è uguale all'atteso: il confronto non vedrebbe la costruzione");
  writeFileSync(progettoFuori, vuoto);

  const a = await avvia([progettoFuori]);
  const inizio = Date.now();
  const nomeDelCaso = attesoDellaCostruzione.progetto.test_cases![0]!.name;
  // Gli esiti attesi del caso (la clausola CASO), scritti prima della corsa: coi soli dati non raggiunto, con due
  // differenze (l'output, e l'errore dei valori del caso che avanzano: nessuna lettura li consuma); con le regole, coi
  // cicli `per`, «Esegui» del caso lo dà raggiunto, con la riga dell'esito nella console.
  const attesi = {
    prima: { prima: "mai", dopo: "non-raggiunto", console: riempi(testi.esitoDelCasoNonRaggiunto, { nome: nomeDelCaso, quante: riempi(testi.diffTante, { n: "2" }) }) },
    regole: { prima: "da-rieseguire", dopo: "raggiunto", console: riempi(testi.esitoDelCasoRaggiunto, { nome: nomeDelCaso }) },
  };
  let primaDelleRegole: EsitoSullaRiga | undefined;
  let osservato;
  try {
    osservato = await costruisciIlRiferimento(
      a.pagina,
      lingua,
      { blocchi: "riquadro", dati: "scheda" },
      false,
      async () => {
        primaDelleRegole = await eseguiIlCaso(a.pagina, lingua);
      },
      riferimentoDellaTappa2,
    );
  } catch (e) {
    // I passi lanciano solo errori che nominano il passo mancante.
    rosso("COSTRUZIONE", (e as Error).message ?? String(e));
  }
  if (osservato.riquadri !== osservato.blocchi) rosso("COSTRUZIONE", `i campi dei blocchi non si sono aperti sempre nel riquadro (modo predefinito): ${osservato.riquadri} su ${osservato.blocchi}`);
  if (osservato.cicli !== 2) rosso("COSTRUZIONE", `i cicli costruiti sono ${osservato.cicli}, non i 2 del riferimento`);
  let conLeRegole: EsitoSullaRiga;
  try {
    conLeRegole = await eseguiIlCaso(a.pagina, lingua);
  } catch (e) {
    rosso("CASO", `con le regole: ${(e as Error).message ?? String(e)}`);
  }
  await a.pagina.getByRole("banner").getByRole("button", { name: testi.salva, exact: true }).click();
  let scritto = "";
  for (let i = 0; i < 40 && scritto !== attesoDellaCostruzione.testo; i++) {
    await Bun.sleep(250);
    scritto = readFileSync(progettoFuori, "utf8");
  }
  const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
  await chiudi(a);
  if (scritto !== attesoDellaCostruzione.testo) {
    let campi: string[];
    try {
      campi = differenze(JSON.parse(scritto), JSON.parse(attesoDellaCostruzione.testo));
    } catch {
      campi = ["(il file sul disco non è JSON)"];
    }
    rosso("COSTRUZIONE", `${progettoFuori} dopo «Salva» non è l'atteso (${Buffer.byteLength(scritto)} byte invece di ${Buffer.byteLength(attesoDellaCostruzione.testo)}); campi diversi: ${campi.length === 0 ? "nessuno, diversi i byte" : campi.join(", ")}`);
  }
  const temporanei = readdirSync(cartellaProva).filter((v) => v.endsWith(".tmp"));
  if (temporanei.length > 0) rosso("COSTRUZIONE", `temporanei rimasti accanto al file: ${temporanei.join(", ")}`);
  rmSync(progettoFuori);
  verde(
    "COSTRUZIONE",
    `progetto vuoto fuori da data\\ dato come argomento; in «${lingua}», modi predefiniti: ${osservato!.dati} dati, il caso d'uso con ${osservato!.valoriDelCaso} valori e ${osservato!.blocchi} blocchi (più la fine; ${osservato!.cicli} cicli per) costruiti dall'interfaccia in ${secondi} s; «Salva»: ${Buffer.byteLength(scritto)} byte uguali all'atteso, nessun temporaneo | controllo positivo acceso (il file di partenza era diverso)`,
  );

  // La clausola CASO: gli esiti letti durante la costruzione, contro quelli scritti prima della corsa.
  if (primaDelleRegole === undefined) rosso("CASO", "coi soli dati il caso non è stato eseguito");
  if (JSON.stringify(primaDelleRegole) !== JSON.stringify(attesi.prima)) rosso("CASO", `coi soli dati: ${JSON.stringify(primaDelleRegole)} invece di ${JSON.stringify(attesi.prima)}`);
  if (JSON.stringify(conLeRegole!) !== JSON.stringify(attesi.regole)) rosso("CASO", `con le regole: ${JSON.stringify(conLeRegole!)} invece di ${JSON.stringify(attesi.regole)}`);
  verde(
    "CASO",
    `il caso «${nomeDelCaso}» scritto con i clic: con le regole (coi cicli per), eseguito dalla sua riga, pallino «${conLeRegole!.prima}» → «${conLeRegole!.dopo}», «${conLeRegole!.console}» | controllo positivo acceso: coi soli dati, eseguito dalla sua riga, pallino «${primaDelleRegole!.prima}» → «${primaDelleRegole!.dopo}», «${primaDelleRegole!.console}»`,
  );
}

/** La clausola FUNZIONI: il programma di riferimento della tappa 3 costruito sul prodotto in un progetto vuoto dato come
 * argomento (le due procedure dai campi dei loro salti, la funzione dal pulsante, i parametri, ciò che restituisce, i casi
 * di ognuna), e salvato con «Salva» nello stesso file. */
async function giroDelleFunzioni(lingua: Lingua): Promise<void> {
  const atteso = riferimentoDellaTappa3.atteso;
  const f = atteso.progetto.functions[0]!;
  const { test_cases: _, ...senzaCasi } = atteso.progetto;
  const vuoto = testoDel({ ...senzaCasi, functions: [{ ...f, data: [], body: [] }] });
  if (vuoto === atteso.testo) rosso("FUNZIONI (controllo positivo)", "il progetto vuoto è uguale all'atteso: il confronto non vedrebbe la costruzione");
  writeFileSync(progettoFuori, vuoto);
  const a = await avvia([progettoFuori]);
  const inizio = Date.now();
  let osservato;
  try {
    osservato = await costruisciIlRiferimento(a.pagina, lingua, { blocchi: "riquadro", dati: "scheda" }, false, async () => {}, riferimentoDellaTappa3);
  } catch (e) {
    rosso("FUNZIONI", (e as Error).message ?? String(e));
  }
  // Le premesse: i due salti (i loro campi aperti due volte: la procedura nasce lì, gli argomenti dopo), le tre procedure e
  // funzioni coi loro casi.
  const visto = { salti: osservato.salti, funzioni: osservato.funzioni, casi: osservato.casiDelleFunzioni, riquadri: osservato.riquadri - osservato.blocchi };
  if (JSON.stringify(visto) !== JSON.stringify({ salti: 2, funzioni: 3, casi: 3, riquadri: 2 })) rosso("FUNZIONI", `la costruzione non è passata da tutti i passi: ${JSON.stringify(visto)}`);
  await a.pagina.getByRole("banner").getByRole("button", { name: dizionari[lingua].salva, exact: true }).click();
  let scritto = "";
  for (let i = 0; i < 40 && scritto !== atteso.testo; i++) {
    await Bun.sleep(250);
    scritto = readFileSync(progettoFuori, "utf8");
  }
  const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
  await chiudi(a);
  if (scritto !== atteso.testo) {
    let campi: string[];
    try {
      campi = differenze(JSON.parse(scritto), JSON.parse(atteso.testo));
    } catch {
      campi = ["(il file sul disco non è JSON)"];
    }
    rosso("FUNZIONI", `${progettoFuori} dopo «Salva» non è l'atteso (${Buffer.byteLength(scritto)} byte invece di ${Buffer.byteLength(atteso.testo)}); campi diversi: ${campi.length === 0 ? "nessuno, diversi i byte" : campi.join(", ")}`);
  }
  rmSync(progettoFuori);
  verde(
    "FUNZIONI",
    `progetto vuoto dato come argomento; in «${lingua}»: ${osservato!.dati} dati, ${osservato!.blocchi} blocchi coi ${osservato!.salti} salti, ${osservato!.funzioni} procedure e funzioni coi loro ${osservato!.casiDelleFunzioni} casi, costruiti dall'interfaccia in ${secondi} s; «Salva»: ${Buffer.byteLength(scritto)} byte uguali all'atteso | controllo positivo acceso (il file di partenza era diverso)`,
  );
}

/** Il pallino di un caso prima e dopo la corsa, e la riga dell'esito in fondo alla console. */
type EsitoSullaRiga = { prima: string | null; dopo: string | null; console: string | null };

/** «Esegui» sul primo caso, dalla sua riga nella scheda dei casi (come `e2e/costruzione.e2e.ts`): il pallino prima e
 * dopo la corsa, e la riga dell'esito in fondo alla console. Un passo che non arriva lancia un errore che lo nomina. */
async function eseguiIlCaso(pagina: Page, lingua: Lingua): Promise<EsitoSullaRiga> {
  const testi = dizionari[lingua];
  await pagina.getByRole("tab", { name: riempi(testi.schedaCasi, { n: "1" }), exact: true }).click({ timeout: 10_000 });
  const riga = pagina.locator('tr[data-caso="0"]');
  const pallino = riga.locator("[data-esito]");
  const prima = await pallino.getAttribute("data-esito", { timeout: 10_000 });
  // La riga dell'esito di una corsa di prima sparisce quando la colonna si apre di nuovo.
  const esito = pagina.locator('[role="log"] [data-esito-del-caso]');
  await riga.locator('[data-esegui-caso="tutto"]').click({ timeout: 10_000 });
  for (let i = 0; i < 120 && (await pallino.getAttribute("data-esito")) === prima; i++) await Bun.sleep(250);
  try {
    await esito.waitFor({ timeout: 30_000 });
  } catch {
    throw new Error(`dopo «Esegui» del caso nessuna riga dell'esito nella console (pallino «${await pallino.getAttribute("data-esito")}»)`);
  }
  return { prima, dopo: await pallino.getAttribute("data-esito"), console: await esito.textContent() };
}

/** La clausola ESECUZIONE: il programma di riferimento dato come argomento, eseguito con F5 e coi valori del suo caso
 * scritti nella console; l'output è quello atteso dal caso; «Esporta la tabella…», con la finestra del sistema
 * compilata da `finestra-vera.ps1`, scrive il CSV dell'atteso. */
async function giroDellEsecuzione(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const caso = (JSON.parse(testoDiPartenza) as { test_cases: { inputs: { data: string; text: string }[]; expected: { output: string } }[] }).test_cases[0]!;
  const csvAtteso = `\u{feff}${(lingua === "it" ? csvItalianoAtteso : csvIngleseAtteso).join("\r\n")}\r\n`;
  // Il nome si scrive senza estensione: la riceve dal guscio (o dalla finestra), come quando lo scrive l'utente.
  const esportata = join(cartellaProva, `${nomeEsportata}.csv`);
  if (existsSync(esportata)) rosso("ESECUZIONE", `${esportata} c'è già prima del giro`);
  writeFileSync(progettoFuori, testoDiPartenza);
  const partenza = apriProgetto(testoDiPartenza);
  if (!partenza.ok) rosso("ESECUZIONE", "il file del corpus non si apre");
  const a = await avvia([progettoFuori]);
  const nome = `${testi.flowchart}: ${partenza.progetto.metadata.name}`;
  try {
    await a.pagina.getByRole("group", { name: nome, exact: true }).waitFor({ timeout: 15_000 });
  } catch {
    rosso("ESECUZIONE", `il file dato come argomento non si è aperto: manca il flowchart «${nome}»`);
  }
  // SICUREZZA: da qui la pagina annota le violazioni della politica di sicurezza dei contenuti.
  await a.pagina.evaluate(() => {
    const viste: string[] = [];
    Object.assign(window, { __violazioni__: viste });
    document.addEventListener("securitypolicyviolation", (e) => viste.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
  const output = () => a.pagina.getByRole("log", { name: testi.console, exact: true }).locator("[data-scrive]").evaluateAll((els) => els.map((e) => e.textContent ?? "").join(""));
  const stato = () => a.pagina.locator("[data-stato-esecuzione]").textContent({ timeout: 5_000 });
  // Controllo positivo del confronto: prima dell'esecuzione l'output è diverso dall'atteso.
  const outputPrima = await output();
  if (outputPrima === caso.expected.output) rosso("ESECUZIONE (controllo positivo)", "l'output prima dell'esecuzione è già quello atteso: il confronto non vedrebbe nulla");

  const inizio = Date.now();
  await a.pagina.getByRole("region", { name: testi.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await a.pagina.keyboard.press("F5");
  // Ogni valore si scrive quando lo stato dice che l'esecuzione lo chiede, e si aspetta la sua riga nel registro: fra due
  // letture dello stesso dato il campo resta lo stesso, e un Invio arrivato mentre l'esecuzione riprende (fra due
  // fotogrammi) non è una risposta: senza queste due attese un valore si perdeva (misurato: «aspetta il valore di voto»
  // dopo i sei valori).
  const righeDelRegistro = () => a.pagina.getByRole("log", { name: testi.console, exact: true }).evaluate((r) => r.childElementCount);
  for (const [i, { data, text }] of caso.inputs.entries()) {
    const campo = a.pagina.getByRole("textbox", { name: riempi(testi.consoleValore, { dato: data }), exact: true });
    const chiede = riempi(testi.statoChiede, { dato: data });
    let adesso = "";
    for (let k = 0; k < 40 && adesso !== chiede; k++) {
      adesso = (await stato().catch(() => "")) ?? "";
      if (adesso !== chiede) await Bun.sleep(250);
    }
    if (adesso !== chiede) rosso("ESECUZIONE", `al valore ${i + 1} di ${caso.inputs.length} la console non chiede «${data}»: stato «${adesso}», output finora ${JSON.stringify(await output())}`);
    const prima = await righeDelRegistro();
    await campo.fill(text);
    await campo.press("Enter");
    let dopo = prima;
    for (let k = 0; k < 40 && dopo <= prima; k++) {
      dopo = await righeDelRegistro();
      if (dopo <= prima) await Bun.sleep(100);
    }
    if (dopo <= prima) rosso("ESECUZIONE", `il valore ${i + 1} («${text}» per «${data}») non è stato letto: nessuna riga nuova nel registro`);
  }
  let finale = "";
  for (let i = 0; i < 60 && finale !== testi.statoFinita; i++) {
    finale = (await stato().catch(() => "")) ?? "";
    if (finale !== testi.statoFinita) await Bun.sleep(250);
  }
  const visto = await output();
  const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
  if (finale !== testi.statoFinita) rosso("ESECUZIONE", `dopo i ${caso.inputs.length} valori lo stato è «${finale}» invece di «${testi.statoFinita}»`);
  if (visto !== caso.expected.output) rosso("ESECUZIONE", `output della console diverso dall'atteso del caso: ${JSON.stringify(visto)} invece di ${JSON.stringify(caso.expected.output)}`);

  // «Esporta la tabella…» dal menu «Progetto»: la finestra del sistema si compila coi messaggi di Windows.
  await a.pagina.getByRole("banner").getByRole("button", { name: testi.menuProgetto, exact: true }).click();
  await a.pagina.waitForFunction(() => document.activeElement?.closest('[role="menu"]') != null, undefined, { polling: "raf", timeout: 10_000 });
  await a.pagina.getByRole("menu", { name: testi.menuProgetto, exact: true }).getByRole("menuitem", { name: testi.esportaTabella, exact: true }).click();
  const compilata = await finestraVera(a.proc.pid, "salva", join(cartellaProva, nomeEsportata));
  if (compilata !== "salvato") rosso("ESECUZIONE", `la finestra del sistema per esportare la tabella non è stata compilata: ${compilata}`);
  const avviso = riempi(testi.esportataIn, { file: `${nomeEsportata}.csv` });
  let detto = "";
  for (let i = 0; i < 40 && detto !== avviso; i++) {
    detto = (await a.pagina.locator('output[role="status"]').textContent({ timeout: 5_000 }).catch(() => "")) ?? "";
    if (detto !== avviso) await Bun.sleep(250);
  }
  const violazioni = await a.pagina.evaluate(() => [...(window as unknown as { __violazioni__: string[] }).__violazioni__]);
  // Controllo positivo: uno stile scritto nella pagina, che la politica del prodotto non ammette.
  const sonda = await a.pagina.evaluate(
    () =>
      new Promise<string>((fatto) => {
        document.addEventListener("securitypolicyviolation", (e) => fatto(`${e.effectiveDirective} ${e.blockedURI}`), { once: true });
        const stile = document.createElement("style");
        stile.textContent = "body { outline: 1px solid red; }";
        document.head.append(stile);
        setTimeout(() => fatto("nessuna violazione"), 5_000);
      }),
  );
  await chiudi(a);
  if (sonda !== "style-src-elem inline") rosso("SICUREZZA (controllo positivo)", `uno stile scritto nella pagina dà «${sonda}» invece di «style-src-elem inline»: la politica non è attiva nel prodotto`);
  if (violazioni.length > 0) rosso("SICUREZZA", `violazioni della politica durante l'esecuzione e l'esportazione: ${violazioni.join("; ")}`);
  if (!existsSync(esportata)) rosso("ESECUZIONE", `nessun ${esportata} dopo «Esporta la tabella…»; avviso «${detto}»`);
  const scritto = readFileSync(esportata, "utf8");
  if (scritto !== csvAtteso) {
    const righe = scritto.split("\r\n");
    const attese = csvAtteso.split("\r\n");
    const prima = attese.findIndex((r, i) => righe[i] !== r);
    rosso("ESECUZIONE", `il CSV esportato non è l'atteso (${Buffer.byteLength(scritto)} byte invece di ${Buffer.byteLength(csvAtteso)}); prima riga diversa, la ${prima}: ${visibile(righe[prima])} invece di ${visibile(attese[prima])}`);
  }
  if (detto !== avviso) rosso("ESECUZIONE", `CSV scritto, ma l'avviso dice «${detto}» invece di «${avviso}»`);
  const temporanei = readdirSync(cartellaProva).filter((v) => v.endsWith(".tmp"));
  if (temporanei.length > 0) rosso("ESECUZIONE", `temporanei rimasti accanto al file: ${temporanei.join(", ")}`);
  rmSync(esportata);
  rmSync(progettoFuori);
  verde(
    "ESECUZIONE",
    `in «${lingua}», F5 sul riferimento dato come argomento, ${caso.inputs.length} valori del caso scritti nella console, «${finale}» in ${secondi} s: output uguale all'atteso del caso (${Buffer.byteLength(visto)} byte) | «Esporta la tabella…» con la finestra del sistema compilata («${nomeEsportata}», senza estensione): ${nomeEsportata}.csv di ${Buffer.byteLength(scritto)} byte uguali al CSV atteso, avviso «${detto}», nessun temporaneo | controllo positivo: prima di F5 l'output era diverso (${JSON.stringify(outputPrima)})`,
  );
  verde("SICUREZZA", `nessuna violazione della politica di sicurezza dei contenuti dall'apertura del file all'esportazione | controllo positivo acceso (uno stile scritto nella pagina: «${sonda}»)`);
}

/** La soglia della finestra che risponde, la stessa della prova nei motori (`e2e/programmi-pesanti.e2e.ts`). */
const SOGLIA_MS = 1_000;

/** Una corsa del vettore di 1000 elementi, misurata come nella prova nei motori: la risposta della pagina (un giro di
 * andata e ritorno) due secondi dopo F5 e alla fine, il fotogramma più lungo dal tasto alla fine (un campionatore
 * nella pagina, acceso prima di F5, che conta anche i fotogrammi: senza fotogrammi il suo «più lungo» non direbbe
 * nulla), «Ferma» dal tasto alla colonna chiusa; la riga sopra la tabella e le colonne dell'intestazione dicono la
 * forma che si vedeva. */
async function corsaDelVettore(pagina: Page, testi: (typeof dizionari)[Lingua], forma: string) {
  const stato = () => pagina.locator("[data-stato-esecuzione]").textContent({ timeout: 5_000 }).catch(() => "");
  const risposta = async () => {
    const t0 = Date.now();
    await pagina.evaluate(() => 1);
    return Date.now() - t0;
  };
  const attendiStato = async (atteso: string, ms: number) => {
    let visto: string | null = "";
    for (const fine = Date.now() + ms; Date.now() < fine && visto !== atteso; ) {
      visto = await stato();
      if (visto !== atteso) await Bun.sleep(100);
    }
    return visto ?? "";
  };
  await pagina.getByRole("region", { name: testi.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await pagina.evaluate(() => {
    const w = window as unknown as { __peggiore: number; __fotogrammi: number };
    w.__peggiore = 0;
    w.__fotogrammi = 0;
    let prima = performance.now();
    const giro = (t: number) => {
      w.__peggiore = Math.max(w.__peggiore, t - prima);
      w.__fotogrammi++;
      prima = t;
      requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
  });
  const partenza = Date.now();
  await pagina.keyboard.press("F5");
  await Bun.sleep(2_000);
  const misure: { cosa: string; ms: number }[] = [{ cosa: "risposta 2 s dopo F5", ms: await risposta() }];
  const finale = await attendiStato(testi.statoFinita, 120_000);
  const corsa = Date.now() - partenza;
  if (finale !== testi.statoFinita) rosso("VETTORE", `${forma}: dopo ${corsa} ms lo stato è «${finale}» invece di «${testi.statoFinita}»; misure finora ${JSON.stringify(misure)}`);
  const campionatore = await pagina.evaluate(() => {
    const w = window as unknown as { __peggiore: number; __fotogrammi: number };
    return { peggiore: Math.round(w.__peggiore), fotogrammi: w.__fotogrammi };
  });
  misure.push({ cosa: `fotogramma più lungo dal tasto alla fine (${campionatore.fotogrammi} fotogrammi in ${corsa} ms)`, ms: campionatore.peggiore });
  misure.push({ cosa: "risposta alla fine", ms: await risposta() });
  const vista = await pagina.evaluate(() => {
    const spiega = document.querySelector("[data-spiega]");
    return { spiegazione: spiega?.textContent ?? null, colonne: spiega?.parentElement?.querySelector("thead tr")?.children.length ?? 0, righe: document.querySelectorAll("table[data-traccia] tbody tr[data-riga]").length };
  });
  const t = Date.now();
  await pagina.keyboard.press("Shift+F5");
  const fermata = await attendiStato(testi.statoPronto, 120_000);
  misure.push({ cosa: "«Ferma»", ms: Date.now() - t });
  if (fermata !== testi.statoPronto) rosso("VETTORE", `${forma}: dopo «Ferma» lo stato è «${fermata}» invece di «${testi.statoPronto}»`);
  const descritte = `${forma}: ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}`;
  const peggiore = Math.max(...misure.map((m) => m.ms));
  if (peggiore > SOGLIA_MS) rosso("VETTORE", `la finestra non risponde entro ${SOGLIA_MS} ms: ${descritte}`);
  // Controllo positivo del campionatore: una corsa di più di due secondi ha disegnato dei fotogrammi.
  if (campionatore.fotogrammi < 10) rosso("VETTORE", `il campionatore dei fotogrammi non si è acceso (${campionatore.fotogrammi} fotogrammi): ${descritte}`);
  return { descritte, peggiore, ...vista };
}

/** La clausola VETTORE: il programma più pesante per la tabella di traccia che le Impostazioni lasciano eseguire (un
 * vettore di 1000 elementi riempito da un ciclo, lo stesso della prova nei motori), dato come argomento ed eseguito
 * con F5 nelle due forme della tabella: quella predefinita (le colonne dei primi dieci e una per gli altri) e, scelta
 * nelle Impostazioni nella stessa sessione, quella in fila. In ciascuna la finestra risponde entro la soglia. */
async function giroDelVettore(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  writeFileSync(progettoFuori, vettoreRiempito);
  const a = await avvia([progettoFuori]);
  const nome = `${testi.flowchart}: ${JSON.parse(vettoreRiempito).metadata.name}`;
  try {
    await a.pagina.getByRole("group", { name: nome, exact: true }).waitFor({ timeout: 15_000 });
  } catch {
    rosso("VETTORE", `il file dato come argomento non si è aperto: manca il flowchart «${nome}»`);
  }
  const predefinita = await corsaDelVettore(a.pagina, testi, "colonne dei primi dieci (predefinita)");
  await nelleImpostazioni(a.pagina, lingua, async (f) => {
    await f.getByRole("tab", { name: testi.impostazioniTabella, exact: true }).click();
    await f.getByRole("radio", { name: testi.formaInFila, exact: true }).check();
  });
  const inFila = await corsaDelVettore(a.pagina, testi, "in fila (scelta nelle Impostazioni)");
  await chiudi(a);
  rmSync(progettoFuori);
  // Le due corse hanno mostrato due forme diverse: la riga che spiega cambia, e in fila le colonne sono meno.
  if (predefinita.spiegazione === null || inFila.spiegazione === null || predefinita.spiegazione === inFila.spiegazione || inFila.colonne >= predefinita.colonne)
    rosso("VETTORE", `le due corse non hanno mostrato le due forme: riga sopra la tabella ${visibile(predefinita.spiegazione ?? undefined)} e ${visibile(inFila.spiegazione ?? undefined)}, colonne ${predefinita.colonne} e ${inFila.colonne}; ${predefinita.descritte}; ${inFila.descritte}`);
  // In ciascuna la tabella ha le sue righe alla fine: la seconda esecuzione, uguale alla prima nel conto dei passi,
  // lasciava la tabella vuota (visto la prima volta sul WebKitGTK della prova Linux, poi in ogni motore).
  if (predefinita.righe === 0 || inFila.righe === 0) rosso("VETTORE", `a esecuzione finita la tabella senza righe: ${predefinita.righe} nella forma predefinita, ${inFila.righe} in fila`);
  verde(
    "VETTORE",
    `in «${lingua}», F5 sul vettore di 1000 elementi riempito da un ciclo, dato come argomento; ${predefinita.descritte} (${predefinita.colonne} colonne); ${inFila.descritte} (${inFila.colonne} colonne); righe disegnate alla fine ${predefinita.righe} e ${inFila.righe}; il più lungo ${Math.max(predefinita.peggiore, inFila.peggiore)} ms, margine ${Math.round((100 * (SOGLIA_MS - Math.max(predefinita.peggiore, inFila.peggiore))) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms) | controllo positivo: le due forme diverse (la riga sopra la tabella e le colonne), il campionatore acceso`,
  );
}

/** `conta(n)`: dà 0 se `n` è 0, altrimenti `conta(n - 1) + 1`; il programma principale scrive `conta(fino)`. Con 499 le
 * chiamate in corso arrivano a 500, il tetto; con 500 la cinquecentunesima si ferma. */
const contaFino = (fino: number): string =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: `conta fino a ${fino}` },
    functions: [
      { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "r", value: `conta(${fino})` }, { id: "b2", kind: "write", values: ["r"], newline: true }], end: { id: "b3" } },
      {
        id: "f2",
        kind: "function",
        name: "conta",
        return_type: "integer",
        data: [
          { name: "n", type: "integer", parameter: "value" },
          { name: "s", type: "integer" },
        ],
        body: [{ id: "b4", kind: "if", condition: "n == 0", then: [{ id: "b5", kind: "assignment", target: "s", value: "0" }], else: [{ id: "b6", kind: "assignment", target: "s", value: "conta(n - 1) + 1" }] }],
        end: { id: "b7", return_value: "s" },
      },
    ],
  });

/** Una corsa di `conta(fino)` data come argomento, con F5: lo stato alla fine, il testo della pagina e i nomi di «Dove
 * sei», con la risposta della pagina alla fine. */
async function corsaDellaRicorsione(lingua: Lingua, fino: number) {
  const testi = dizionari[lingua];
  writeFileSync(progettoFuori, contaFino(fino));
  const a = await avvia([progettoFuori]);
  const nome = `${testi.flowchart}: conta fino a ${fino}`;
  try {
    await a.pagina.getByRole("group", { name: nome, exact: true }).waitFor({ timeout: 15_000 });
  } catch {
    rosso("RICORSIONE", `il file dato come argomento non si è aperto: manca il flowchart «${nome}»`);
  }
  const stato = () => a.pagina.locator("[data-stato-esecuzione]").textContent({ timeout: 5_000 }).catch(() => "");
  const finali = [testi.statoFinita, testi.statoFermataDaUnErrore];
  await a.pagina.getByRole("region", { name: testi.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  const partenza = Date.now();
  await a.pagina.keyboard.press("F5");
  let visto: string | null = "";
  for (const fine = Date.now() + 60_000; Date.now() < fine && !finali.includes(visto ?? ""); ) {
    visto = await stato();
    if (!finali.includes(visto ?? "")) await Bun.sleep(100);
  }
  const corsa = Date.now() - partenza;
  const t0 = Date.now();
  await a.pagina.evaluate(() => 1);
  const risposta = Date.now() - t0;
  const pagina = (await a.pagina.locator("body").innerText()) ?? "";
  // La console sola: il numero sta anche nel flowchart e nel nome del progetto.
  const console = (await a.pagina.locator('[role="log"]').innerText().catch(() => "")) ?? "";
  const dove = await a.pagina.locator("[data-dove-sei] button").allTextContents();
  await chiudi(a);
  rmSync(progettoFuori);
  return { stato: visto ?? "", corsa, risposta, pagina, console, dove };
}

/** La clausola RICORSIONE: il tetto della ricorsione nella WebView2 vera (vedi in testa). */
async function giroDellaRicorsione(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const breve = testiDeiCodici[lingua].recursion_too_deep.breve;
  const sotto = await corsaDellaRicorsione(lingua, 499);
  if (sotto.stato !== testi.statoFinita) rosso("RICORSIONE", `conta(499): lo stato è «${sotto.stato}» invece di «${testi.statoFinita}» (controllo positivo: il tetto non deve scattare prima)`);
  if (!sotto.console.split("\n").some((r) => r.trim() === "499")) rosso("RICORSIONE", `conta(499): la console non ha la riga 499 (ha ${JSON.stringify(sotto.console)})`);
  const oltre = await corsaDellaRicorsione(lingua, 500);
  if (oltre.stato !== testi.statoFermataDaUnErrore) rosso("RICORSIONE", `conta(500): lo stato è «${oltre.stato}» invece di «${testi.statoFermataDaUnErrore}»`);
  if (!oltre.pagina.includes(breve)) rosso("RICORSIONE", `conta(500): la pagina non ha il messaggio «${breve}»`);
  const nascoste = riempi(testi.doveSeiNascoste, { n: "496" });
  if (oltre.dove.length !== 6 || oltre.dove[2] !== nascoste) rosso("RICORSIONE", `conta(500): «Dove sei» è ${JSON.stringify(oltre.dove)} invece del principio, «${nascoste}» e la fine`);
  const peggiore = Math.max(sotto.risposta, oltre.risposta);
  if (peggiore > SOGLIA_MS) rosso("RICORSIONE", `la pagina non risponde entro ${SOGLIA_MS} ms alla fine: ${sotto.risposta} e ${oltre.risposta} ms`);
  verde(
    "RICORSIONE",
    `in «${lingua}», conta(499) finita in ${sotto.corsa} ms con 499 nella console; conta(500) «${oltre.stato}» in ${oltre.corsa} ms, col messaggio «${breve}», «Dove sei» ${JSON.stringify(oltre.dove)}; risposta alla fine ${sotto.risposta} e ${oltre.risposta} ms (soglia ${SOGLIA_MS} ms) | controllo positivo: conta(499) finisce senza errore`,
  );
}

/** La clausola RICARICA: con un progetto modificato, F5 mandato come messaggio alla finestra d'input (la via dei
 * tasti veri, che sul codice di prima ricaricava) non ricarica; una ricarica chiesta dalla pagina fa chiedere
 * conferma al motore. */
async function giroDellaRicarica(lingua: Lingua): Promise<void> {
  writeFileSync(progettoFuori, testoDiPartenza);
  const a = await avvia([progettoFuori]);
  await cambiaAutore(a.pagina, lingua, "Ricarica");
  const domande: string[] = [];
  // Le domande del motore si rifiutano, tranne quella che lascia la pagina per il controllo degli acceleratori.
  let accetta = false;
  a.pagina.on("dialog", (d) => {
    domande.push(d.type());
    void (accetta ? d.accept() : d.dismiss()).catch(() => {});
  });
  const segna = () => a.pagina.evaluate(() => Object.assign(window, { __segno__: 1 }));
  /** Il segno lasciato prima c'è ancora («rimasta»), è sparito con la pagina ricaricata, o la pagina non
   * risponde più entro 15 s (visto sul codice che non fermava i tasti). */
  const dopo = async (): Promise<"rimasta" | "ricaricata" | "non risponde"> => {
    try {
      await a.pagina.getByRole("banner").waitFor({ timeout: 15_000 });
      return (await a.pagina.evaluate(() => (window as unknown as { __segno__?: number }).__segno__ ?? null)) !== null ? "rimasta" : "ricaricata";
    } catch {
      const stato = await Promise.race([
        a.pagina.evaluate(() =>
          JSON.stringify({
            segno: (window as unknown as { __segno__?: number }).__segno__ ?? null,
            barre: document.querySelectorAll("header").length,
            finestre: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].map((d) => d.getAttribute("aria-labelledby") && document.getElementById(d.getAttribute("aria-labelledby")!)?.textContent),
            fuoco: `${document.activeElement?.tagName} ${document.activeElement?.textContent?.slice(0, 40) ?? ""}`,
          }),
        ),
        Bun.sleep(2_000).then(() => "nessuna risposta in 2 s"),
      ]).catch((e: unknown) => `errore: ${String(e).split("\n")[0]}`);
      riga(`  RICARICA, la barra non compare: ${stato}`);
      return "non risponde";
    }
  };
  // Controllo positivo del gesto: la stessa via porta un tasto alla pagina (una lettera nel campo dell'autore).
  const testi = dizionari[lingua];
  await apriProprieta(a.pagina, lingua);
  const autore = a.pagina.getByRole("dialog", { name: testi.progettoTitolo, exact: true }).getByLabel(testi.progettoAutore, { exact: true });
  // La finestra mette il fuoco nel suo primo campo un istante dopo essersi aperta: si aspetta che il fuoco sia
  // dentro, poi lo si porta sull'autore e si controlla che ci resti.
  for (let i = 0; i < 40 && !(await autore.evaluate((el) => el.closest('[role="dialog"]')!.contains(document.activeElement))); i++) await Bun.sleep(50);
  await autore.focus();
  await Bun.sleep(200);
  const sulCampo = await autore.evaluate((el) => el === document.activeElement);
  await tastoVero(a.proc.pid, "z", "RICARICA (controllo positivo)");
  await Bun.sleep(500);
  const scritto = await autore.inputValue();
  if (scritto.toLowerCase() !== "ricaricaz") {
    const fuoco = await a.pagina.evaluate(() => `${document.activeElement?.tagName} «${(document.activeElement as HTMLInputElement | null)?.value ?? ""}»`);
    riga(`  RICARICA, la lettera non è nel campo dell'autore: fuoco sul campo prima del tasto ${sulCampo}, ora su ${fuoco}`);
  }
  await a.pagina.keyboard.press("Escape");
  // F5 non deve arrivare al motore: né una ricarica né la domanda di `beforeunload`, che col progetto modificato
  // fermerebbe la ricarica e farebbe sembrare fermato il tasto (misurato togliendo il fermo di F5).
  await segna();
  const primaDiF5 = domande.length;
  await tastoVero(a.proc.pid, "f5", "RICARICA");
  await Bun.sleep(1_500);
  const conF5 = await dopo();
  const domandeDiF5 = domande.slice(primaDiF5);
  // F5 arrivato alla pagina è «Esegui»: il riferimento parte e aspetta il primo valore. Poi si ferma, per la
  // ricarica chiesta dalla pagina.
  const statoDopoF5 = await a.pagina
    .locator("[data-stato-esecuzione]")
    .textContent({ timeout: 5_000 })
    .catch((e: unknown) => `nessuno stato: ${String(e).split("\n")[0]}`);
  const esegue = statoDopoF5 === riempi(testi.statoChiede, { dato: "n" });
  await a.pagina.keyboard.press("Shift+F5");
  // La rete: una ricarica chiesta dalla pagina, col progetto modificato.
  await segna();
  await a.pagina.evaluate(() => setTimeout(() => location.reload(), 0));
  await Bun.sleep(2_000);
  const restata = (await dopo()) === "rimasta";
  const domandeDellaRete = [...domande];
  // Controllo positivo per corsa, al livello degli acceleratori: su una pagina senza il fermo (`about:blank`) lo
  // stesso messaggio F5 la ricarica (il segno sparisce). Se non la ricarica, il messaggio non raggiunge più gli
  // acceleratori di WebView2 e il verde di F5 qui sopra non proverebbe nulla.
  accetta = true;
  await a.pagina.goto("about:blank", { timeout: 15_000 });
  await a.pagina.evaluate(() => Object.assign(window, { __segno__: 1 }));
  await tastoVero(a.proc.pid, "f5", "RICARICA (controllo positivo degli acceleratori)");
  await Bun.sleep(1_500);
  const segnoVuota = await Promise.race([
    a.pagina.evaluate(() => (window as unknown as { __segno__?: number }).__segno__ ?? null),
    Bun.sleep(5_000).then(() => "nessuna risposta in 5 s"),
  ]).catch((e: unknown) => `errore: ${String(e).split("\n")[0]}`);
  await chiudi(a);
  rmSync(progettoFuori);
  // Il messaggio arriva senza lo stato di Maiusc della tastiera: la lettera può uscire maiuscola.
  if (scritto.toLowerCase() !== "ricaricaz") rosso("RICARICA (controllo positivo)", `il tasto non arriva alla pagina: l'autore vale «${scritto}» invece di «Ricaricaz»`);
  if (conF5 !== "rimasta" || domandeDiF5.length > 0) rosso("RICARICA", `F5 mandato alla finestra è arrivato al motore: pagina ${conF5}, domande del motore ${JSON.stringify(domandeDiF5)}`);
  if (!esegue) rosso("RICARICA", `F5 mandato alla finestra non ha avviato l'esecuzione: stato «${statoDopoF5}»`);
  if (!restata || !domandeDellaRete.includes("beforeunload"))
    rosso("RICARICA", `una ricarica chiesta dalla pagina con modifiche: domande del motore ${JSON.stringify(domandeDellaRete)}, ${restata ? "pagina rimasta" : "pagina ricaricata"}`);
  if (segnoVuota !== null) rosso("RICARICA (controllo positivo degli acceleratori)", `il messaggio F5 non ricarica nemmeno una pagina senza il fermo (segno ${JSON.stringify(segnoVuota)}): non raggiunge gli acceleratori, e il verde di F5 non prova nulla`);
  verde(
    "RICARICA",
    `progetto modificato; F5 mandato alla finestra d'input: nessuna ricarica e nessuna domanda del motore, e l'esecuzione parte («${statoDopoF5}»); una ricarica chiesta dalla pagina: domanda del motore (${domandeDellaRete.join(", ")}), rifiutata, la pagina resta | controlli positivi accesi: la stessa via scrive «${scritto.at(-1)}» nel campo dell'autore, e lo stesso F5 ricarica una pagina senza il fermo (about:blank)`,
  );
}

/** La clausola CHIUSURA: il messaggio di chiusura alla finestra (come la X): senza modifiche chiude, con
 * modifiche la finestra resta e chiede; «Annulla» la lascia aperta e una seconda richiesta chiede di nuovo;
 * «Non salvare» chiude e il file resta com'era; «Salva» salva il file e chiude. Mentre la finestra si chiude
 * dopo la domanda dell'app, il motore non chiede nulla (`beforeunload`). */
async function giroDellaChiusura(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  writeFileSync(progettoFuori, testoDiPartenza);
  const senza = await avvia([progettoFuori]);
  await chiudiLaFinestraVera(senza.proc.pid);
  if (!(await uscita(senza, 10_000))) rosso("CHIUSURA", "senza modifiche la finestra non si chiude col messaggio di chiusura");

  const partenza = apriProgetto(testoDiPartenza);
  if (!partenza.ok) rosso("CHIUSURA", "il file del corpus non si apre");
  const nome = partenza.progetto.metadata.name;
  /** L'app col progetto modificato (l'autore cambiato), il messaggio di chiusura spedito e la domanda comparsa;
   * le domande del motore si contano (e si rifiutano). */
  async function conLaDomanda(autore: string) {
    const a = await avvia([progettoFuori]);
    const domande: string[] = [];
    a.pagina.on("dialog", (d) => {
      domande.push(d.type());
      void d.dismiss().catch(() => {});
    });
    await cambiaAutore(a.pagina, lingua, autore);
    const conferma = a.pagina.getByRole("alertdialog", { name: riempi(testi.modificheTitolo, { nome }), exact: true });
    const chiede = async (quale: string) => {
      await chiudiLaFinestraVera(a.proc.pid);
      try {
        await conferma.waitFor({ timeout: 10_000 });
      } catch {
        rosso("CHIUSURA", `con modifiche (${quale}) ${(await uscita(a, 2_000)) ? "la finestra si è chiusa senza chiedere" : "la finestra resta ma non chiede"}`);
      }
      if (await uscita(a, 1_500)) rosso("CHIUSURA", `con modifiche (${quale}) la finestra si è chiusa mentre chiedeva`);
    };
    /** Il clic su un comando della domanda: la finestra può chiudersi mentre il clic è ancora in corso, e il suo
     * errore («Target … closed») non conta; decide l'uscita del processo. */
    const clic = (comando: string) =>
      conferma
        .getByRole("button", { name: comando, exact: true })
        .click()
        .catch((e: unknown) => log(`clic su «${comando}» interrotto dalla chiusura: ${String(e).split("\n")[0]}`));
    await chiede("prima richiesta");
    return { a, domande, conferma, chiede, clic };
  }

  // «Annulla», poi una seconda richiesta, poi «Non salvare».
  const con = await conLaDomanda("Chiusura");
  await con.clic(testi.annullaEsc);
  // Una finestra che si chiude interrompe l'attesa («Target … closed»): quell'errore non conta, decide l'uscita del
  // processo (altrimenti «Annulla» che chiude la finestra uscirebbe come un errore della prova, non con il suo
  // rosso). Ogni altro errore, il tempo scaduto compreso, è «Annulla» che non chiude la domanda.
  const nascosta = await con.conferma.waitFor({ state: "hidden", timeout: 5_000 }).then(
    () => null,
    (e: unknown) => String(e).split("\n")[0] ?? "",
  );
  if (await uscita(con.a, 2_000)) rosso("CHIUSURA", "«Annulla» ha chiuso la finestra");
  if (nascosta !== null) rosso("CHIUSURA", `«Annulla» non chiude la domanda: ${nascosta}`);
  await con.chiede("seconda richiesta, dopo «Annulla»");
  await con.clic(testi.modificheNonSalvare);
  if (!(await uscita(con.a, 10_000))) rosso("CHIUSURA", "«Non salvare» non chiude la finestra");
  if (readFileSync(progettoFuori, "utf8") !== testoDiPartenza) rosso("CHIUSURA", `«Non salvare» ha cambiato ${nomeProgetto}`);

  // «Salva»: il file è legato al progetto, si scrive senza chiedere dove, poi la finestra si chiude.
  const autore = "Chiusura salvata";
  const atteso = testoDel({ ...partenza.progetto, metadata: { ...partenza.progetto.metadata, author: autore } });
  const salva = await conLaDomanda(autore);
  await salva.clic(testi.modificheSalva);
  if (!(await uscita(salva.a, 10_000))) rosso("CHIUSURA", "«Salva» non chiude la finestra");
  if (readFileSync(progettoFuori, "utf8") !== atteso) rosso("CHIUSURA", `dopo «Salva» ${nomeProgetto} non contiene i byte attesi`);
  const domande = [...con.domande, ...salva.domande];
  if (domande.length > 0) rosso("CHIUSURA", `domande del motore durante la chiusura dopo la domanda dell'app: ${JSON.stringify(domande)}`);
  rmSync(progettoFuori);
  verde(
    "CHIUSURA",
    `messaggio di chiusura alla finestra: senza modifiche si chiude; con modifiche resta e chiede «${riempi(testi.modificheTitolo, { nome })}»; «Annulla» la lascia aperta e una seconda richiesta chiede di nuovo; «Non salvare» la chiude e il file resta com'era; «Salva» scrive ${Buffer.byteLength(atteso)} byte uguali all'atteso e la chiude; nessuna domanda del motore | controllo positivo: lo stesso messaggio chiude la finestra senza modifiche`,
  );
}

async function giroSenzaDati(): Promise<void> {
  await cancella(dati);
  const { soglia, prima } = marcatore("senza data");
  const { opposta, a } = await primoAvvioECambio("TRACCE (controllo positivo)");
  await attendiFile(join(radiciTracce.APPDATA!, identificatore, "preferenze.json"), { lingua: opposta }, "TRACCE (controllo positivo)");
  await chiudi(a);

  const tracce = rileva(prima, soglia);
  descriviTracce(tracce);
  const attese = [join(radiciTracce.LOCALAPPDATA!, identificatore), join(radiciTracce.APPDATA!, identificatore)];
  const spente = attese.flatMap((p) => [
    ...(tracce.conIdentificatore.includes(p) ? [] : [`rilevatore identificatore cieco su ${p}`]),
    ...(tracce.nuove.includes(p) ? [] : [`rilevatore voci nuove cieco su ${p}`]),
  ]);
  if (spente.length > 0) rosso("TRACCE (controllo positivo)", `SPENTO: ${spente.join("; ")}`);
  verde("TRACCE (controllo positivo)", `acceso | senza data\\ entrambi i rilevatori vedono ${attese.join(" e ")}`);
}

// -------------------------------------------------------------------------------------------- giro

log(`=== INIZIO PROVA PORTABILE ${new Date().toISOString()} · bun ${Bun.version} ===`);
console.log(`prova-portabile: log in ${relative(radice, fileLog)}`);
riga(`utente ${userInfo().username} · radici delle tracce ${JSON.stringify(radiciTracce)}`);

let esito = 0;
let pulire = false;
let clausolaBuild = "";
try {
  const giaPresenti = cartelleIdentificatore();
  if (giaPresenti.length > 0)
    rosso("PROVA", `radici non alla linea di base, cartelle dell'identificatore già presenti (guardarle e toglierle a mano): ${giaPresenti.join("; ")}`);
  pulire = true;
  clausolaBuild = await costruisci();
  await giroPortabile();
  await giroSenzaDati();
} catch (e) {
  riga(e instanceof ClausolaRossa ? e.message : `ERRORE DELLA PROVA: ${e instanceof Error ? e.stack : String(e)}`);
  esito = 1;
} finally {
  if (aperta) await chiudi(aperta).catch((e: unknown) => riga(`chiusura dopo il rosso fallita: ${String(e)}`));
  // Le cartelle dell'identificatore comparse durante la prova: si guardano e si cancellano.
  if (pulire) {
    try {
      const tolte = await guardaECancella();
      riga(`pulizia: ${tolte.length} cartelle dell'identificatore cancellate`);
    } catch (e) {
      esito = 1;
      riga(`pulizia: ROSSA — non cancellate (guardarle e toglierle a mano): ${cartelleIdentificatore().join("; ")} · ${String(e)}`);
    }
  }
}
// Senza rossi, ogni clausola dichiarata deve aver stampato la sua riga verde, nell'ordine dichiarato.
const dichiarate = clausole.map(([c]) => c);
if (esito === 0 && verdi.join(" → ") !== dichiarate.join(" → ")) {
  riga(`ESITO: righe verdi delle clausole diverse dalle dichiarate: ${verdi.length} (${verdi.join(" → ")}) invece di ${dichiarate.length} (${dichiarate.join(" → ")})`);
  esito = 1;
}
// Ultima riga, dopo la pulizia: dice le clausole eseguite, nell'ordine, e concorda con l'exit code.
const nellEsito = clausole.map(([c, nome]) => (c === "BUILD" ? clausolaBuild : nome));
riga(esito === 0 ? `ESITO: VERDE (${nellEsito.join(", ")}: ${verdi.length} righe verdi su ${dichiarate.length} clausole)` : "ESITO: ROSSO");
log("=== FINE PROVA PORTABILE ===");
process.exit(esito);
