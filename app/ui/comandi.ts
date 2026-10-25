// Il catalogo dei comandi: per ogni comando il testo (una chiave del dizionario), l'icona, il tasto, il gruppo e
// i posti dove si trova. Barra, menu «Progetto» e «Aiuto» (il menu di un comando è quello del suo gruppo), riga di stato, barretta dell'esecuzione e suggerimenti al
// passaggio del puntatore si ricavano da qui, e una prova (`comandi.test.tsx`) appaia il catalogo coi comandi
// resi, nei due versi. Un comando nuovo si aggiunge qui per primo: il posto dove va lo dice il suo gruppo.
//
// - La disponibilità non è scritta qui: la dà la finestra in ogni momento (un comando senza azione è
//   raggiungibile col fuoco ma non fa nulla, `aria-disabled`).
// - Il tasto si scrive coi nomi standard (quelli di `aria-keyshortcuts`), con Ctrl: sul Mac diventa Cmd
//   (`tastoDelComando`) e si mostra coi simboli del Mac (`tastoMostrato`); lo riconoscono `modifiche.ts` e la
//   tabella per situazione di `esecuzione/tasti.ts`, che restano dove sono perché hanno regole che il catalogo
//   non porta (Cmd al posto di Ctrl, Ctrl+Maiusc+Z, che cosa fa F5 in ogni situazione): la prova controlla che
//   dicano la stessa cosa. I tasti che valgono sul blocco col fuoco (Canc, Ctrl+C, Ctrl+X) non si scrivono:
//   dalla barra non valgono.
import type { Dizionario } from "../i18n/it";
import type { icone } from "./icone";
import { sulMac } from "./piattaforma";

/** I gruppi della barra, in ordine di lavoro; lo zoom sta nella riga di stato. */
export const GRUPPI = ["progetto", "modifica", "esecuzione", "viste", "applicazione"] as const;
export type Gruppo = (typeof GRUPPI)[number] | "zoom";
export type Posto = "barra" | "menu" | "riga di stato";

type ChiaveDelTesto = { [K in keyof Dizionario]: Dizionario[K] extends string ? K : never }[keyof Dizionario];

export interface Comando {
  readonly testo: ChiaveDelTesto;
  readonly icona: keyof typeof icone;
  /** Il tasto che fa lo stesso, coi nomi standard («Control+Shift+S»). */
  readonly tasto?: string;
  readonly gruppo: Gruppo;
  readonly posti: readonly Posto[];
}

export const catalogo = {
  nuovo: { testo: "nuovo", icona: "nuovo", tasto: "Control+N", gruppo: "progetto", posti: ["menu"] },
  apri: { testo: "apri", icona: "apri", tasto: "Control+O", gruppo: "progetto", posti: ["menu"] },
  // Il pulsante «Funzione», a sinistra di «Salva»: crea solo funzioni (le procedure nascono dal menu e dal flowchart).
  funzione: { testo: "comandoFunzione", icona: "funzione", gruppo: "progetto", posti: ["barra"] },
  salva: { testo: "salva", icona: "salva", tasto: "Control+S", gruppo: "progetto", posti: ["menu", "barra"] },
  salvaConNome: { testo: "salvaConNome", icona: "salvaConNome", tasto: "Control+Shift+S", gruppo: "progetto", posti: ["menu"] },
  // Segna il progetto come libreria e lo salva con nome, partendo dalla cartella delle librerie.
  salvaComeLibreria: { testo: "salvaComeLibreria", icona: "libreria", gruppo: "progetto", posti: ["menu"] },
  proprieta: { testo: "progetto", icona: "progetto", gruppo: "progetto", posti: ["menu"] },
  nuovaFunzione: { testo: "nuovaProceduraOFunzione", icona: "funzione", gruppo: "progetto", posti: ["menu"] },
  funzioni: { testo: "gestisciFunzioni", icona: "funzioni", gruppo: "progetto", posti: ["menu"] },
  importa: { testo: "importaFunzioni", icona: "importa", gruppo: "progetto", posti: ["menu"] },
  esportaTabella: { testo: "esportaTabella", icona: "esporta", gruppo: "progetto", posti: ["menu"] },
  annulla: { testo: "annulla", icona: "annulla", tasto: "Control+Z", gruppo: "modifica", posti: ["barra"] },
  ripeti: { testo: "ripeti", icona: "ripeti", tasto: "Control+Y", gruppo: "modifica", posti: ["barra"] },
  taglia: { testo: "taglia", icona: "taglia", gruppo: "modifica", posti: ["barra"] },
  copia: { testo: "copia", icona: "copia", gruppo: "modifica", posti: ["barra"] },
  elimina: { testo: "elimina", icona: "elimina", gruppo: "modifica", posti: ["barra"] },
  esegui: { testo: "esegui", icona: "esegui", tasto: "F5", gruppo: "esecuzione", posti: ["barra"] },
  passo: { testo: "unPasso", icona: "passo", tasto: "F10", gruppo: "esecuzione", posti: ["barra"] },
  // Entra ed Esci: il passo dentro una chiamata e fuori da quella in corso; nella barra solo se il progetto ha procedure o
  // funzioni (`conChiamate` della barra).
  entra: { testo: "entra", icona: "entra", tasto: "F11", gruppo: "esecuzione", posti: ["barra"] },
  esci: { testo: "esci", icona: "esci", tasto: "Shift+F11", gruppo: "esecuzione", posti: ["barra"] },
  animata: { testo: "animata", icona: "animata", gruppo: "esecuzione", posti: ["barra"] },
  velocita: { testo: "velocita", icona: "velocitaMedia", gruppo: "esecuzione", posti: ["barra"] },
  ferma: { testo: "ferma", icona: "ferma", tasto: "Shift+F5", gruppo: "esecuzione", posti: ["barra"] },
  punto: { testo: "puntoDiInterruzione", icona: "punto", tasto: "F9", gruppo: "esecuzione", posti: ["barra"] },
  togliPunti: { testo: "togliPunti", icona: "togliPunti", gruppo: "esecuzione", posti: ["barra"] },
  dati: { testo: "pannelloDati", icona: "dati", gruppo: "viste", posti: ["barra"] },
  tabella: { testo: "pannelloTabella", icona: "tabella", gruppo: "viste", posti: ["barra"] },
  genera: { testo: "pannelloCodice", icona: "codice", gruppo: "viste", posti: ["barra"] },
  impostazioni: { testo: "impostazioni", icona: "impostazioni", gruppo: "applicazione", posti: ["barra"] },
  guida: { testo: "guida", icona: "guida", gruppo: "applicazione", posti: ["menu"] },
  esempi: { testo: "esempi", icona: "esempio", gruppo: "applicazione", posti: ["menu"] },
  informazioni: { testo: "informazioni", icona: "informazioni", gruppo: "applicazione", posti: ["menu"] },
  riduci: { testo: "zoomRiduci", icona: "riduci", gruppo: "zoom", posti: ["riga di stato"] },
  cento: { testo: "zoomCento", icona: "cento", gruppo: "zoom", posti: ["riga di stato"] },
  ingrandisci: { testo: "zoomIngrandisci", icona: "ingrandisci", gruppo: "zoom", posti: ["riga di stato"] },
  adatta: { testo: "zoomAdatta", icona: "adatta", gruppo: "zoom", posti: ["riga di stato"] },
} as const satisfies Record<string, Comando>;

export type IdComando = keyof typeof catalogo;

/** I comandi di un gruppo che stanno in quel posto, nell'ordine del catalogo. */
export const delGruppo = (g: Gruppo, posto: Posto): IdComando[] =>
  (Object.keys(catalogo) as IdComando[]).filter((id) => catalogo[id].gruppo === g && (catalogo[id].posti as readonly Posto[]).includes(posto));

/** Le voci del menu «Progetto»: i comandi del gruppo che stanno nel menu, con le linee che li separano. */
export const VOCI_DEL_MENU: readonly (IdComando | "—")[] = ["nuovo", "apri", "—", "salva", "salvaConNome", "salvaComeLibreria", "—", "proprieta", "—", "nuovaFunzione", "funzioni", "importa", "—", "esportaTabella"];
/** Le voci del menu «Aiuto», alla destra di «Impostazioni»: i comandi del gruppo dell'applicazione che stanno nel menu. */
export const VOCI_DELL_AIUTO: readonly (IdComando | "—")[] = ["guida", "esempi", "—", "informazioni"];

/** Il tasto di un comando sulla piattaforma: sul Mac Cmd (`Meta`) al posto di Ctrl, e Ripeti è Cmd+Maiusc+Z, come
 * nel menu Modifica del Mac (Cmd+Y vale lo stesso). */
export function tastoDelComando(id: IdComando, mac = sulMac()): string | undefined {
  const t = (catalogo[id] as Comando).tasto;
  if (!mac || t === undefined) return t;
  return id === "ripeti" ? "Meta+Shift+Z" : tastoSullaPiattaforma(t, mac);
}

/** Un tasto scritto con Ctrl («Control+X»), sulla piattaforma: sul Mac col Cmd («Meta+X»). */
export const tastoSullaPiattaforma = (tasto: string, mac = sulMac()): string => (mac ? tasto.replace("Control", "Meta") : tasto);

/** I simboli del Mac per i modificatori, nell'ordine in cui macOS li scrive (⌃⌥⇧⌘), e per i tasti di cancellazione. */
const SIMBOLI_DEL_MAC: Readonly<Record<string, string>> = { Control: "⌃", Alt: "⌥", Shift: "⇧", Meta: "⌘", Backspace: "⌫", Delete: "⌦" };

/** Il tasto come si legge nella lingua dell'interfaccia: «Ctrl+Maiusc+S», «Canc»; sul Mac coi simboli, «⇧⌘S», «⌫». */
export function tastoMostrato(tasto: string, testi: Dizionario, mac = sulMac()): string {
  const parti = tasto.split("+");
  if (mac) {
    const ordine = ["Control", "Alt", "Shift", "Meta"];
    const modificatori = ordine.filter((m) => parti.includes(m)).map((m) => SIMBOLI_DEL_MAC[m]);
    const tasti = parti.filter((p) => !ordine.includes(p)).map((p) => SIMBOLI_DEL_MAC[p] ?? p);
    return [...modificatori, ...tasti].join("");
  }
  return parti.map((p) => (p === "Control" ? "Ctrl" : p === "Shift" ? testi.tastoMaiusc : p === "Delete" ? testi.tastoCanc : p)).join("+");
}

/** Il suggerimento al passaggio del puntatore: il nome e, se c'è, il tasto. */
export function suggerimento(id: IdComando, testo: string, testi: Dizionario, mac = sulMac()): string {
  const t = tastoDelComando(id, mac);
  return t === undefined ? testo : `${testo} (${tastoMostrato(t, testi, mac)})`;
}

/** Il tasto che elimina ciò che ha il fuoco, sulla piattaforma (`tastoCheElimina` in `modifiche.ts`). */
export const tastoDiEliminazione = (mac = sulMac()): string => (mac ? "Backspace" : "Delete");
