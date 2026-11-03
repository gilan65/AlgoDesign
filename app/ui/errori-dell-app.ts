// L'elenco degli errori dell'app: in memoria, dall'avvio, mai su disco. L'atto esplicito è il salvataggio di una registrazione, che
// lo copia nel file. Un punto solo: `annotaErrore` per ciò che finirebbe nella console, gli ascoltatori per ciò che nessuno prende.
//
// Un errore preso dal riparo non arriva agli ascoltatori (misurato nel server di sviluppo e nel build, React 19.3.0): nessun
// doppione. Che cosa NON guarda: gli errori che React scrive da sé nella console, un errore nel caricamento di un file della pagina.
import { creaElenco, descriviErrore } from "../core/registrazione/errori";
import type { ErroreDellApp, OrigineDellErrore } from "../core/registrazione/formato";

const elenco = creaElenco();

export interface ErroriDellApp {
  readonly voci: readonly ErroreDellApp[];
  readonly perse: number;
}

export const erroriDellApp = (): ErroriDellApp => ({ voci: elenco.voci(), perse: elenco.perse() });

/** Nell'elenco, senza scrivere nella console. Non lancia mai: chi la chiama sta già gestendo un errore. */
export function annota(origine: OrigineDellErrore, contesto: string, errore: unknown, dettagli = ""): void {
  try {
    elenco.aggiungi(origine, `${contesto === "" ? "" : `${contesto}: `}${descriviErrore(errore)}${dettagli}`);
  } catch {
    // Un elenco che non annota non deve aggiungere un errore a quello che c'è già.
  }
}

/** Un errore che l'app ha preso e gestito: nell'elenco e nella console. */
export function annotaErrore(contesto: string, errore: unknown): void {
  console.error(`${contesto}:`, errore);
  annota("handled", contesto, errore);
}

let inAscolto = false;

/** Da chiamare prima di ogni attesa dell'avvio, o un errore dell'avvio sfugge. Una volta sola. */
export function ascoltaGliErrori(): void {
  if (inAscolto) return;
  inAscolto = true;
  window.addEventListener("error", (e) => annota("uncaught", "", e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => annota("rejected", "", e.reason));
}
