// Gli errori dell'app come entrano nel file: i percorsi tolti, l'elenco col tetto e le voci uguali contate.
//
// Che cosa NON guarda: gli errori veri di una finestra, che arrivano dal browser (`e2e/errori-dell-app.e2e.ts`).

import { expect, test } from "bun:test";
import { percorsiEProfilo } from "../../strumenti/registrazioni-del-corpus";
import { creaElenco, descriviErrore, senzaPercorsi, tettoDelleVoci, tettoDelTesto } from "./errori";

// Ogni riga: il testo di partenza, com'esce. Le prime sono le forme dei messaggi veri del guscio e degli stack.
const tolti: readonly (readonly [string, string])[] = [
  [String.raw`preferenze illeggibili in C:\Users\mario\AppData\preferenze.json: Accesso negato. (os error 5)`, "preferenze illeggibili in <path>: Accesso negato. (os error 5)"],
  [String.raw`C:\Users\Mario Rossi\Documenti\voti di prova.algo: non trovato`, "<path>: non trovato"],
  [String.raw`at leggi (C:\Program Files\AlgoDesign\app.js:12:3)`, "at leggi (<path>:12:3)"],
  ["C:/Users/mario/x.algo: errore", "<path>: errore"],
  [String.raw`\\server\cartella condivisa\x.algo: errore`, "<path>: errore"],
  [String.raw`\\?\C:\Users\mario\x.algo: errore`, "<path>: errore"],
  ["/home/mario rossi/voti.algo: errore", "<path>: errore"],
  ["/Users/mario/voti.algo: errore", "<path>: errore"],
  ["/media/mario/CHIAVETTA/voti.algo: errore", "<path>: errore"],
  ["file:///C:/Users/mario/x.js:1:2", "<path>:1:2"],
  ["file:///home/mario/x.js:1:2", "<path>:1:2"],
  // Il nome del profilo trovato in un percorso sparisce anche dal resto del testo.
  [String.raw`mario non legge C:\Users\mario\x.algo: negato a Mario`, "<user> non legge <path>: negato a <user>"],
  // L'oggetto di un errore del guscio arriva scritto in JSON, con le barre raddoppiate.
  [JSON.stringify({ genere: "sistema", dettaglio: String.raw`C:\Users\Mario Rossi\x.algo: negato a Mario Rossi` }), `{"genere":"sistema","dettaglio":"<path>: negato a <user>"}`],
  // L'apostrofo è lecito in un nome: un cognome, una cartella, e non deve fermare il taglio.
  [String.raw`preferenze illeggibili in C:\Users\D'Angelo\AppData\x.json: negato`, "preferenze illeggibili in <path>: negato"],
  [String.raw`C:\Users\mario\Documenti\Compiti dell'anno\x.algo: negato`, "<path>: negato"],
  ["/Users/mario/Mario's Files/x.algo: negato", "<path>: negato"],
  ["/home/d'amico/x.algo: negato", "<path>: negato"],
  [JSON.stringify({ dettaglio: String.raw`C:\Users\Dell'Orto\x.algo: negato a Dell'Orto` }), `{"dettaglio":"<path>: negato a <user>"}`],
  [String.raw`D'Angelo non legge C:\Users\D'Angelo\x.algo: negato a D'Angelo`, "<user> non legge <path>: negato a <user>"],
  // Un percorso fra apici: si toglie anche ciò che lo segue fino ai due punti, qualche parola in più e mai il contrario.
  [String.raw`apertura di 'C:\Users\mario\x.algo' negata: errore`, "apertura di '<path>: errore"],
  [String.raw`in 'C:\Users\mario': negato a mario`, "in '<path>: negato a <user>"],
];

// Restano uguali: gli indirizzi degli stack servono a capire il difetto, e nessuno di loro porta un percorso del computer.
const uguali: readonly string[] = [
  "at t (http://127.0.0.1:4351/avvio.js:4:15)",
  "at t (tauri://localhost/assets/avvio-abc.js:4:15)",
  "at t (https://tauri.localhost/avvio.js:4:15)",
  "a: 1 / 2, b:3\nvoto:\n",
  "1/2/3 non è una data",
  "Accesso negato. (os error 5)",
  "Marione non è il profilo mario",
];

test("un percorso sparisce per intero, anche con uno spazio dentro; ciò che lo segue resta", () => {
  for (const [da, atteso] of tolti) expect(senzaPercorsi(da)).toBe(atteso);
  console.log(`percorsi tolti: ${tolti.length} forme, restate uguali ${uguali.length}`);
});

test("un indirizzo di uno stack e un testo senza percorsi restano com'erano", () => {
  for (const t of uguali) expect(senzaPercorsi(t)).toBe(t);
});

test("il rilevatore si accende sul testo di partenza e tace su quello pulito", () => {
  const veri = tolti.map(([da]) => da).filter((t) => !t.startsWith("file:"));
  // Controllo positivo: sul testo di partenza il rilevatore c'è, altrimenti lo zero sotto non vuol dire nulla.
  const accesi = veri.filter((t) => percorsiEProfilo(JSON.stringify({ text: t })).length > 0);
  expect(accesi).toEqual(veri);
  expect(tolti.flatMap(([da]) => percorsiEProfilo(JSON.stringify({ text: senzaPercorsi(da) })))).toEqual([]);
  // La sonda della regola più larga: il cognome dopo lo spazio non resta, e il rilevatore da solo non lo direbbe.
  expect(senzaPercorsi(String.raw`C:\Users\Mario Rossi\x.algo`)).not.toContain("Rossi");
});

test("ogni valore lanciato ha un testo, anche quello che non si sa leggere", () => {
  expect(descriviErrore("una stringa")).toBe("una stringa");
  expect(descriviErrore({ genere: "sistema", dettaglio: "Accesso negato" })).toBe(`{"genere":"sistema","dettaglio":"Accesso negato"}`);
  expect(descriviErrore(null)).toBe("null");
  expect(descriviErrore(undefined)).toBe("undefined");
  expect(descriviErrore(new Error("il messaggio"))).toContain("il messaggio");
  const senzaStack = new TypeError("senza stack");
  senzaStack.stack = "";
  expect(descriviErrore(senzaStack)).toBe("TypeError: senza stack");
  // Uno stack senza il messaggio in testa, come in WebKit: il messaggio c'è lo stesso.
  const comeWebKit = new Error("il messaggio");
  comeWebKit.stack = "t@tauri://localhost/avvio.js:1:2";
  expect(descriviErrore(comeWebKit)).toBe("Error: il messaggio\nt@tauri://localhost/avvio.js:1:2");
  const ciclo: { io?: unknown } = {};
  ciclo.io = ciclo;
  expect(descriviErrore(ciclo)).toBe("(unreadable)");
});

test("le voci uguali si contano nella voce, e un errore diverso dopo si vede ancora", () => {
  const e = creaElenco();
  for (let i = 0; i < 3600; i++) e.aggiungi("uncaught", "un difetto a ogni fotogramma");
  e.aggiungi("rejected", "un difetto a ogni fotogramma");
  e.aggiungi("uncaught", "la causa vera");
  expect(e.voci()).toEqual([
    { origin: "uncaught", text: "un difetto a ogni fotogramma", times: 3600 },
    { origin: "rejected", text: "un difetto a ogni fotogramma", times: 1 },
    { origin: "uncaught", text: "la causa vera", times: 1 },
  ]);
  expect(e.perse()).toBe(0);
});

test("pieno, l'elenco tiene le prime e conta le altre; una voce che c'è già si conta ancora", () => {
  const e = creaElenco();
  for (let i = 0; i < tettoDelleVoci + 7; i++) e.aggiungi("handled", `errore ${i}`);
  e.aggiungi("handled", "errore 0");
  expect(e.voci().map((v) => v.text)).toEqual(Array.from({ length: tettoDelleVoci }, (_, i) => `errore ${i}`));
  expect(e.voci()[0]!.times).toBe(2);
  expect(e.perse()).toBe(7);
});

test("un testo lungo si taglia dopo aver tolto i percorsi, e un taglio non lascia un percorso a metà", () => {
  const e = creaElenco();
  // Lungo col percorso, e sotto il tetto senza: il taglio guarda il testo già pulito.
  const prima = "x".repeat(tettoDelTesto - 20);
  e.aggiungi("handled", `${prima} C:\\Users\\mario\\${"y".repeat(100)}: fine`);
  expect(e.voci()[0]!.text).toBe(`${prima} <path>: fine`);
  const f = creaElenco();
  f.aggiungi("handled", "z".repeat(tettoDelTesto + 10));
  expect(f.voci()[0]!.text).toBe(`${"z".repeat(tettoDelTesto)}…`);
});
