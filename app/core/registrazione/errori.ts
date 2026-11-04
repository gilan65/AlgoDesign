// Gli errori dell'app, come entrano nel file di una registrazione: un testo senza percorsi, l'origine, quante volte. L'elenco
// tiene le prime voci distinte, perché di solito la prima è la causa, e conta le uguali nella voce: un difetto dentro un fotogramma
// ne produce sessanta al secondo, tutte con lo stesso testo, e senza contarle a parte nasconderebbe l'errore dopo.
//
// Togliere un percorso vuole una regola più larga di rilevarlo: un percorso può avere uno spazio, e fermarsi lì lascerebbe il resto
// del nome nel file. Il taglio arriva fino a due punti, virgolette doppie o fine riga, e può togliere qualche parola in più, mai il contrario.
// Lo stesso vale per l'apostrofo, lecito in un nome (un cognome, «Compiti dell'anno»): non ferma nulla, e un percorso fra apici singoli perde anche
// ciò che lo segue fino ai due punti.
//
// Che cosa NON guarda: un nome del profilo nudo in un testo senza percorsi (nessun comando dice all'interfaccia come si chiama il
// profilo, e i messaggi del guscio non ne portano); i percorsi scritti in una forma relativa; il contenuto del progetto, che è ciò che
// lo studente ha scritto e la finestra gli mostra prima di salvare.

import type { ErroreDellApp, OrigineDellErrore } from "./formato";

/** Quante voci distinte tiene l'elenco, e quanto è lungo al più il testo di una voce. */
export const tettoDelleVoci = 50;
export const tettoDelTesto = 4000;

const percorsoTolto = "<path>";
const nomeTolto = "<user>";

/** Ciò che può seguire l'inizio di un percorso: tutto, spazi compresi, fino a un carattere che Windows non ammette in un nome. */
const resto = String.raw`[^:"<>|?*\r\n]*`;
const percorsi = [
  // Un indirizzo di un file, col disco o senza: anche i tre `/` di fila, che la regola per Unix non vede.
  new RegExp(String.raw`file:/+(?:[A-Za-z]:)?${resto}`, "gi"),
  // Un percorso con il disco, anche col prefisso «\\?\» o «\\.\»: `tauri://` e `https://` non ci cadono, perché una lettera ha una lettera
  // davanti. Prima di quello di rete: scritto in JSON ha le barre raddoppiate, e sembrerebbe di rete dopo il disco.
  new RegExp(String.raw`(?:\\\\[?.]\\)?(?<![A-Za-z])[A-Za-z]:[\\/]${resto}`, "g"),
  // Un percorso di rete.
  new RegExp(String.raw`\\\\${resto}`, "g"),
  // Un percorso Unix di almeno due nomi: non un indirizzo (`http://x/y`, con `:` o `/` o una cifra davanti), non una divisione.
  new RegExp(String.raw`(?<![\w:/.~-])/[^\s/:"<>|?*]+/${resto}`, "g"),
];

/** Il nome del profilo dentro un percorso: la cartella sotto quella degli utenti. Anche con le barre raddoppiate, perché l'oggetto di un
 * errore del guscio arriva qui scritto in JSON. */
const profilo = /(?:[A-Za-z]:[\\/]+|\/)(?:Users|home|media)[\\/]+([^\\/:"<>|?*\r\n]+)/gi;

const inUnaRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Il testo senza percorsi, e senza il nome del profilo che uno di quei percorsi portava. */
export function senzaPercorsi(testo: string): string {
  // Un apice in coda è quello che chiude il percorso, non una lettera del nome.
  const nomi = [...testo.matchAll(profilo)].map((m) => m[1]!.trim().replace(/'+$/, "")).filter((n) => n.length > 1);
  let fuori = percorsi.reduce((t, r) => t.replace(r, percorsoTolto), testo);
  for (const nome of nomi) fuori = fuori.replace(new RegExp(`(?<![\\p{L}\\p{N}])${inUnaRegex(nome)}(?![\\p{L}\\p{N}])`, "giu"), nomeTolto);
  return fuori;
}

/** Ciò che si sa di un valore lanciato, anche di quello che non è un `Error`: una stringa, l'oggetto di un errore del guscio. Non lancia
 * mai: chi la chiama sta già gestendo un errore. */
export function descriviErrore(e: unknown): string {
  try {
    if (typeof e === "string") return e;
    if (e instanceof Error) {
      const intestazione = `${e.name}: ${e.message}`;
      if (e.stack === undefined || e.stack === "") return intestazione;
      // Lo stack comincia col messaggio in Chromium, non in WebKit.
      return e.stack.includes(e.message) ? e.stack : `${intestazione}\n${e.stack}`;
    }
    return typeof e === "object" && e !== null ? JSON.stringify(e) : String(e);
  } catch {
    return "(unreadable)";
  }
}

export interface ElencoDegliErrori {
  /** Il testo è pulito qui, una volta per tutte: nessuna finestra può mostrare ciò che non è entrato. */
  aggiungi(origine: OrigineDellErrore, testo: string): void;
  readonly voci: () => readonly ErroreDellApp[];
  /** Quante volte un errore non è entrato perché l'elenco era pieno: le occorrenze, non i testi diversi. */
  readonly perse: () => number;
}

export function creaElenco(): ElencoDegliErrori {
  const voci = new Map<string, ErroreDellApp>();
  let perse = 0;
  return {
    aggiungi(origin, testo) {
      const pulito = senzaPercorsi(testo);
      const text = pulito.length > tettoDelTesto ? `${pulito.slice(0, tettoDelTesto)}…` : pulito;
      const chiave = `${origin}\n${text}`;
      const presente = voci.get(chiave);
      if (presente !== undefined) voci.set(chiave, { ...presente, times: presente.times + 1 });
      else if (voci.size >= tettoDelleVoci) perse++;
      else voci.set(chiave, { origin, text, times: 1 });
    },
    voci: () => [...voci.values()],
    perse: () => perse,
  };
}
