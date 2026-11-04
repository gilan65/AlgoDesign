// I tasti dell'esecuzione e che cosa fanno in ogni situazione: una tabella sola, letta da chi ascolta i tasti
// e provata voce per voce. F5 esegue (o continua), F10 fa un passo, F11 un passo dentro la chiamata e Maiusc+F11 fino
// al ritorno da quella in corso, Maiusc+F5 ferma, F9 mette o toglie il punto di interruzione sul blocco scelto.
//
// - Da ferma (o a esecuzione finita) F11 comincia come F10, fermo sulla prima azione; Maiusc+F11 non fa nulla: non c'è
//   ancora una chiamata da cui uscire.
//
// - In pausa col programma cambiato dopo la pausa F5 riesegue fino allo stesso passaggio; gli altri comandi non ci sono: proseguirebbero sul
//   programma di prima, che non è più quello disegnato.
// - Dopo un errore, col programma cambiato e l'opzione delle Impostazioni attiva, F5 riesegue con le stesse righe; gli altri tasti restano quelli di
//   un'esecuzione finita, così cominciarne un'altra da capo si può ancora.
// - Mentre il programma aspetta un valore, F5 e F10 non fanno nulla: il valore si conferma con Invio nella
//   console, e l'esecuzione prosegue col comando di prima.
// - A esecuzione finita F5 e F10 ne cominciano un'altra; Maiusc+F5 chiude la colonna dell'esecuzione.
// - Prima della tabella la finestra guarda le finestre aperte (lì nessun tasto dell'esecuzione fa nulla) e i
//   campi aperti (confermati prima di cominciare un'esecuzione, come fanno i comandi dei file).

export const TASTI = ["F5", "F10", "F11", "Maiusc+F11", "Maiusc+F5", "F9"] as const;
export type TastoDellEsecuzione = (typeof TASTI)[number];

/** Nessuna esecuzione; in pausa prima di un'azione; in pausa, col programma cambiato dopo; un comando in corso; in attesa di un valore; finita; finita con un errore, da cui si può rieseguire. */
export const SITUAZIONI = ["ferma", "in pausa", "modificata", "in corso", "chiede", "finita", "dopo un errore"] as const;
export type Situazione = (typeof SITUAZIONI)[number];

/** «esegui» e «passo» cominciano un'esecuzione (fino a un punto di interruzione, o fino alla prima azione);
 * «continua», «un passo», «entra» ed «esci» la proseguono da una pausa; «riesegui» riparte dal programma cambiato, fino allo stesso passaggio. */
export type Azione = "esegui" | "passo" | "riesegui" | "continua" | "un passo" | "entra" | "esci" | "ferma" | "punto" | "nulla";

const tabella: Record<Situazione, Record<TastoDellEsecuzione, Azione>> = {
  ferma: { F5: "esegui", F10: "passo", F11: "passo", "Maiusc+F11": "nulla", "Maiusc+F5": "nulla", F9: "punto" },
  "in pausa": { F5: "continua", F10: "un passo", F11: "entra", "Maiusc+F11": "esci", "Maiusc+F5": "ferma", F9: "punto" },
  modificata: { F5: "riesegui", F10: "nulla", F11: "nulla", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  "in corso": { F5: "nulla", F10: "nulla", F11: "nulla", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  chiede: { F5: "nulla", F10: "nulla", F11: "nulla", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  finita: { F5: "esegui", F10: "passo", F11: "passo", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  "dopo un errore": { F5: "riesegui", F10: "passo", F11: "passo", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
};

export const azioneDelTasto = (s: Situazione, t: TastoDellEsecuzione): Azione => tabella[s][t];

/** Il tasto dell'esecuzione premuto, se lo è: senza Ctrl, Alt né Cmd; Maiusc solo con F5 e F11 (Maiusc+F10 apre il
 * menu di un dato, Ctrl+F5 è un tasto di ricarica). */
export function tastoDellEsecuzione(premuto: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): TastoDellEsecuzione | null {
  const { key, ctrlKey, metaKey, shiftKey, altKey } = premuto;
  if (ctrlKey || metaKey || altKey) return null;
  if (key === "F5") return shiftKey ? "Maiusc+F5" : "F5";
  if (key === "F11") return shiftKey ? "Maiusc+F11" : "F11";
  if (shiftKey) return null;
  return key === "F10" ? "F10" : key === "F9" ? "F9" : null;
}
