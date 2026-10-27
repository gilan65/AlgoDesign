// Ciò che l'interfaccia aggiunge alle modifiche del nucleo: trovare il blocco che un'operazione ha messo in
// un posto (per selezionarlo e dargli il fuoco), riconoscere i tasti di «Annulla», «Ripeti», dei file,
// dell'eliminazione e del ricaricamento della pagina, e i campi dove si scrive.
import { trova, type Posto } from "../core/modifica/operazioni";
import type { Blocco, Progetto } from "../core/progetto/modello";
import { sulMac } from "./piattaforma";

/** Il blocco che sta in quel posto, se c'è. */
export function bloccoNelPosto(p: Progetto, posto: Posto): Blocco | undefined {
  const f = p.functions.find((x) => x.id === posto.contenitore);
  if (f !== undefined) return posto.ramo === "body" ? f.body[posto.indice] : undefined;
  const contenitore = trova(p, posto.contenitore) as unknown as Partial<Record<Posto["ramo"], readonly Blocco[]>> | undefined;
  return contenitore?.[posto.ramo]?.[posto.indice];
}

/** Ctrl+Z annulla; Ctrl+Y e Ctrl+Maiusc+Z ripetono (Cmd al posto di Ctrl su macOS). */
export function comandoDellaCronologia(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): "annulla" | "ripeti" | null {
  const conIlComando = e.ctrlKey || e.metaKey;
  if (!conIlComando || e.altKey) return null;
  const tasto = e.key.toLowerCase();
  if (tasto === "z") return e.shiftKey ? "ripeti" : "annulla";
  if (tasto === "y" && !e.shiftKey) return "ripeti";
  return null;
}

/** I comandi dei file dalla tastiera: Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Maiusc+S e Ctrl+P (anche col tasto Comando). */
export function comandoDelFile(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): "nuovo" | "apri" | "salva" | "salvaConNome" | "stampa" | null {
  const conIlComando = e.ctrlKey || e.metaKey;
  if (!conIlComando || e.altKey) return null;
  const tasto = e.key.toLowerCase();
  if (tasto === "s") return e.shiftKey ? "salvaConNome" : "salva";
  if (e.shiftKey) return null;
  return tasto === "n" ? "nuovo" : tasto === "o" ? "apri" : tasto === "p" ? "stampa" : null;
}

/** I tasti che nel motore ricaricano la pagina: F5 (anche con Ctrl) e Ctrl+R (anche con Maiusc; Cmd su macOS).
 * Il motore guarda il tasto fisico: con una tastiera non latina Ctrl+R ha un'altra lettera, ma `code` è «KeyR». */
export function ricarica(e: { key: string; code?: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return e.key === "F5" || ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key.toLowerCase() === "r" || e.code === "KeyR"));
}

/** I tasti che nel motore lasciano la pagina: quelli che la ricaricano (`ricarica`, più il tasto «Aggiorna» che certe
 * tastiere hanno) e quelli che tornano indietro o vanno avanti fra le pagine (i tasti «Indietro» e «Avanti», Alt+freccia
 * a sinistra e a destra). L'app è una pagina sola: nessuno di loro le serve. */
export function lasciaLaPagina(e: { key: string; code?: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  if (ricarica(e) || ["BrowserRefresh", "BrowserBack", "BrowserForward"].includes(e.key)) return true;
  return e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight");
}

/** Il tasto che elimina ciò che ha il fuoco (un blocco, un dato, un caso): Canc; sul Mac, che non ha Canc, anche ⌫
 * da solo, mai in un campo di testo (lì cancella le lettere). */
export function tastoCheElimina(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; target: EventTarget | null }, mac = sulMac()): boolean {
  if (e.key === "Delete") return true;
  const conUnModificatore = e.altKey || e.shiftKey || e.metaKey || e.ctrlKey;
  return mac && e.key === "Backspace" && !conUnModificatore && !campoDiTesto(e.target);
}

/** Un campo dove si scrive del testo: lì il motore ha il suo Annulla e il suo menu (Taglia, Copia, Incolla). */
export function campoDiTesto(bersaglio: EventTarget | null): boolean {
  if (!(bersaglio instanceof HTMLElement)) return false;
  if (bersaglio instanceof HTMLInputElement) return !["radio", "checkbox", "button", "submit", "reset", "range", "color", "file"].includes(bersaglio.type);
  return bersaglio.isContentEditable || bersaglio.tagName === "TEXTAREA";
}

/** Un tasto premuto mentre si scrive in un campo resta del campo (lì Ctrl+Z annulla il testo). */
export function nelCampo(bersaglio: EventTarget | null): boolean {
  return campoDiTesto(bersaglio) || (bersaglio instanceof HTMLElement && bersaglio.tagName === "SELECT");
}
