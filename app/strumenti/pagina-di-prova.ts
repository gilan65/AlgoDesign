// La pagina di prova: il JavaScript di un progetto dentro una pagina HTML a sé, senza nulla da scaricare, con l'input e
// l'output nella pagina. Si apre con un doppio clic: gira da `file://`.
//
// Il programma è lo stesso del file `.js`, riga per riga: non si riscrive nulla. Le sue funzioni di supporto usano quattro nomi
// di Node (`readSync`, `writeSync`, `execSync`, `process`): la pagina li porta lei, in un Worker, e lascia vuote nell'esecuzione
// le righe `import`, che il generatore segna (`delMotore`). Così «Errore alla riga N» è la riga N del `.js`, e il codice
// mostrato è quello intero.
//
// Il Worker:
// - classico, da un `blob:`: da `file://` un Worker di modulo non parte, con un evento `error` senza messaggio (misurato in Chromium);
// - la preparazione sta tutta sulla prima riga, davanti al commento con cui il programma comincia: le righe non si spostano;
// - il programma sta in una funzione col modo stretto, come in un modulo: i suoi nomi non toccano quelli del Worker;
// - `process.exit` lancia un valore che nessuno cattura, spento dal filtro degli errori; ogni altro errore arriva alla pagina,
//   che lo dice: non è un esito del programma.
//
// L'input si scrive prima di «Esegui», una riga per ogni lettura: finite le righe, `readSync` dà 0 e il programma si ferma
// come con Node. Il programma che non finisce: «Ferma» termina il Worker e la pagina resta viva; oltre `tettoDellOutput`
// caratteri lo termina la pagina, che altrimenti un programma che scrive senza fine renderebbe inutilizzabile.
//
// CHE COSA NON FA: nessun limite di tempo; i browser diversi da Chromium non sono provati (fuori da V8 la forma della pila è
// un'altra, e la riga esce «?»); un input che non è testo (una casella contiene solo testo).
import type { Riga } from "../core/genera/forma";
import type { Lingua } from "../i18n/lingue";

/** I caratteri di output oltre i quali la pagina ferma il programma: il più lungo del corpus ne scrive poche centinaia. */
export const tettoDellOutput = 1_000_000;

interface TestiDellaPagina {
  readonly codice: string;
  readonly input: string;
  readonly suggerimento: string;
  readonly esegui: string;
  readonly ferma: string;
  readonly output: string;
  readonly inCorso: string;
  readonly finito: string;
  readonly fermatoErrore: string;
  readonly fermatoDaTe: string;
  readonly troppo: string;
  readonly nonPrevisto: string;
  readonly nonParte: string;
}

export const testiDellaPagina: Readonly<Record<Lingua, TestiDellaPagina>> = {
  it: {
    codice: "Il codice JavaScript",
    input: "Input",
    suggerimento: "Una riga per ogni lettura del programma.",
    esegui: "Esegui",
    ferma: "Ferma",
    output: "Output",
    inCorso: "Il programma è in esecuzione.",
    finito: "Il programma è finito.",
    fermatoErrore: "Il programma è stato fermato da un errore.",
    fermatoDaTe: "Il programma è stato fermato con «Ferma».",
    troppo: "Il programma è stato fermato: ha scritto più di un milione di caratteri.",
    nonPrevisto: "La pagina non è riuscita a eseguire il programma.",
    nonParte: "Il browser non ha lasciato partire il programma.",
  },
  en: {
    codice: "The JavaScript code",
    input: "Input",
    suggerimento: "One line for each read of the program.",
    esegui: "Run",
    ferma: "Stop",
    output: "Output",
    inCorso: "The program is running.",
    finito: "The program has finished.",
    fermatoErrore: "The program was stopped by an error.",
    fermatoDaTe: "The program was stopped with “Stop”.",
    troppo: "The program was stopped: it wrote more than one million characters.",
    nonPrevisto: "The page could not run the program.",
    nonParte: "The browser did not let the program start.",
  },
};

const html = (t: string) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
/** Un valore come JavaScript dentro `<script>`: nessun `<`, così `</script>` e `<!--` non possono chiudere nulla. */
const nelloScript = (v: unknown) => JSON.stringify(v).replaceAll("<", "\\u003c");

/** Il testo del programma come lo esegue il Worker: le righe segnate restano vuote, le altre al loro numero. */
export const testoDaEseguire = (righe: readonly Riga[]): string => righe.map((r) => (r.delMotore === true ? "" : r.testo)).join("\n");

/** La preparazione del Worker: una riga sola, e deve restarlo, perché il programma comincia sulla stessa riga. `INPUT` è il
 * testo che il programma legge. */
export const PREPARAZIONE = [
  "(function () {",
  '"use strict";',
  "const posta = self.postMessage.bind(self);",
  "const uscita = {};",
  "const input = new TextEncoder().encode(INPUT);",
  "let letti = 0;",
  'self.addEventListener("error", function (e) { if (e.error === uscita) e.preventDefault(); });',
  "self.readSync = function (fd, b, da) { if (letti >= input.length) return 0; b[da] = input[letti++]; return 1; };",
  "self.writeSync = function (fd, testo) { posta({ flusso: fd, testo: testo }); return testo.length; };",
  'self.execSync = function () { throw new Error("execSync"); };',
  'self.process = { platform: "browser", stdin: {}, stdout: {}, stderr: {}, exit: function (c) { posta({ fine: c }); throw uscita; } };',
  "})();",
  '(function () { "use strict"; ',
].join(" ");
/** Dopo l'ultima riga: fuori dalla funzione del programma, dove i suoi nomi non arrivano. */
const CHIUSURA = "\n})();\npostMessage({ fine: 0 });\n";

/** Lo script della pagina: tiene il programma e lancia il Worker. Niente `import`, niente richieste: la pagina è a sé. */
const scriptDellaPagina = (programma: string, t: TestiDellaPagina): string => `
"use strict";
const PROGRAMMA = ${nelloScript(programma)};
const PREPARAZIONE = ${nelloScript(PREPARAZIONE)};
const CHIUSURA = ${nelloScript(CHIUSURA)};
const TETTO = ${tettoDellOutput};
const testi = ${nelloScript({ inCorso: t.inCorso, finito: t.finito, fermatoErrore: t.fermatoErrore, fermatoDaTe: t.fermatoDaTe, troppo: t.troppo, nonPrevisto: t.nonPrevisto, nonParte: t.nonParte })};
const output = document.getElementById("output");
const errore = document.getElementById("errore");
const stato = document.getElementById("stato");
const pulsanteEsegui = document.getElementById("esegui");
const pulsanteFerma = document.getElementById("ferma");
const casella = document.getElementById("input");
let lavoro = null;
function segnaLaRiga(testo) {
  const m = /^\\D*(\\d+):/.exec(testo);
  const r = m === null ? null : document.querySelector('.riga[data-riga="' + m[1] + '"]');
  if (r !== null) {
    r.classList.add("segnata");
    r.scrollIntoView({ block: "center" });
  }
}
function metti(testo, esito) {
  stato.textContent = testo;
  stato.dataset.esito = esito;
}
function finisci(testo, esito) {
  lavoro.worker.terminate();
  lavoro.scrivi();
  lavoro = null;
  metti(testo, esito);
  pulsanteEsegui.disabled = false;
  pulsanteFerma.disabled = true;
}
function nonPrevisto(motivo) {
  errore.textContent = motivo === undefined || motivo === "" ? testi.nonParte : motivo;
  finisci(testi.nonPrevisto, "imprevisto");
}
function esegui() {
  for (const r of document.querySelectorAll(".riga.segnata")) r.classList.remove("segnata");
  output.textContent = "";
  errore.textContent = "";
  metti(testi.inCorso, "in-corso");
  pulsanteEsegui.disabled = true;
  pulsanteFerma.disabled = false;
  const testo = PREPARAZIONE.replace("INPUT", () => JSON.stringify(casella.value)) + PROGRAMMA + CHIUSURA;
  const indirizzo = URL.createObjectURL(new Blob([testo], { type: "text/javascript" }));
  const pezzi = [];
  let orologio = null;
  const questo = {
    worker: { terminate() {} },
    caratteri: 0,
    scrivi() {
      if (orologio !== null) clearTimeout(orologio);
      orologio = null;
      if (pezzi.length > 0) output.append(pezzi.join(""));
      pezzi.length = 0;
    },
  };
  lavoro = questo;
  try {
    questo.worker = new Worker(indirizzo);
  } catch (e) {
    nonPrevisto(String(e));
    return;
  }
  questo.worker.onmessage = (e) => {
    if (lavoro !== questo) return;
    const m = e.data;
    if (m.flusso === 1) {
      pezzi.push(m.testo);
      questo.caratteri += m.testo.length;
      if (questo.caratteri > TETTO) finisci(testi.troppo, "troppo");
      else if (orologio === null) orologio = setTimeout(() => questo.scrivi(), 50);
    } else if (m.flusso === 2) errore.append(m.testo);
    else if (m.fine === 0) finisci(testi.finito, "finito");
    else {
      finisci(testi.fermatoErrore, "errore");
      segnaLaRiga(errore.textContent);
    }
  };
  questo.worker.onerror = (e) => {
    if (lavoro === questo) nonPrevisto(e.message);
  };
}
pulsanteEsegui.addEventListener("click", esegui);
pulsanteFerma.addEventListener("click", () => {
  if (lavoro !== null) finisci(testi.fermatoDaTe, "fermato");
});
`;

const CARATTERI_DEL_CODICE = 'ui-monospace, "Cascadia Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';

const STILE = `
:root { color-scheme: light dark; --sfondo: #f4f4f2; --carta: #ffffff; --testo: #1c1c1c; --tenue: #666666; --linea: #d0d0cc; --accento: #0b5cad; --errore: #b3261e; --segno: #fdecc8; }
@media (prefers-color-scheme: dark) { :root { --sfondo: #1c1c1c; --carta: #262626; --testo: #eeeeee; --tenue: #a8a8a8; --linea: #444444; --accento: #7db7f0; --errore: #ff8a80; --segno: #5c4813; } }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--sfondo); color: var(--testo); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1400px; margin: 0 auto; padding: 16px; display: grid; gap: 14px; }
h1 { margin: 0; font-size: 19px; font-weight: 600; overflow-wrap: anywhere; }
h2 { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
.parte { background: var(--carta); border: 1px solid var(--linea); border-radius: 6px; padding: 12px; min-width: 0; }
.nota { margin: 0 0 6px; color: var(--tenue); font-size: 13px; }
textarea { display: block; width: 100%; min-height: 96px; resize: vertical; font: 14px/1.4 ${CARATTERI_DEL_CODICE}; color: inherit; background: var(--sfondo); border: 1px solid var(--linea); border-radius: 4px; padding: 6px 8px; }
.comandi { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
button { font: inherit; font-weight: 600; padding: 6px 16px; border-radius: 4px; border: 1px solid var(--accento); cursor: pointer; }
#esegui { background: var(--accento); color: var(--carta); }
#ferma { background: transparent; color: var(--accento); }
button:disabled { opacity: 0.45; cursor: default; }
#stato { font-size: 13px; color: var(--tenue); min-height: 1.45em; margin: 0 0 6px; }
#stato[data-esito="errore"], #stato[data-esito="imprevisto"], #stato[data-esito="troppo"] { color: var(--errore); font-weight: 600; }
pre { margin: 0; font: 13.5px/1.45 ${CARATTERI_DEL_CODICE}; }
#output, #errore { white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 4; }
#output { max-height: 60vh; overflow: auto; }
#errore { color: var(--errore); font-weight: 600; }
.codice { overflow: auto; max-height: 70vh; }
.codice pre { white-space: pre; width: max-content; min-width: 100%; }
.riga { display: block; }
.riga::before { content: attr(data-riga); display: inline-block; width: 4ch; margin-right: 1.5ch; text-align: right; color: var(--tenue); }
.riga.segnata { background: var(--segno); }
.colonne { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); }
.destra { display: grid; gap: 14px; align-content: start; min-width: 0; }
@media (min-width: 900px) { .colonne { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); } .codice { max-height: calc(100vh - 90px); } }
`;

/** La pagina, dalle righe del JavaScript: ogni riga nel codice mostrato, col suo numero. */
export function paginaDiProva(righe: readonly Riga[], parole: { lingua: Lingua; titolo: string }): string {
  const t = testiDellaPagina[parole.lingua];
  const codice = righe.map((r, i) => `<span class="riga" data-riga="${i + 1}">${html(r.testo)}\n</span>`).join("");
  return `<!doctype html>
<html lang="${parole.lingua}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(parole.titolo)}</title>
<style>${STILE}</style>
</head>
<body>
<main>
<h1>${html(parole.titolo)}</h1>
<div class="colonne">
<section class="parte codice"><h2>${html(t.codice)}</h2><pre id="codice">${codice}</pre></section>
<div class="destra">
<section class="parte"><h2><label for="input">${html(t.input)}</label></h2><p class="nota">${html(t.suggerimento)}</p><textarea id="input" spellcheck="false" autocomplete="off"></textarea></section>
<section class="parte"><h2>${html(t.output)}</h2><div class="comandi"><button id="esegui" type="button">${html(t.esegui)}</button><button id="ferma" type="button" disabled>${html(t.ferma)}</button></div><p id="stato" role="status"></p><pre id="output"></pre><pre id="errore"></pre></section>
</div>
</div>
</main>
<script>${scriptDellaPagina(testoDaEseguire(righe), t)}</script>
</body>
</html>
`;
}
