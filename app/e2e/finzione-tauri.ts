// Il guscio simulato, iniettato nella pagina PRIMA dell'interfaccia (`page.addInitScript`). Usa
// `mockIPC` della libreria di Tauri, così la finzione segue le parti interne che `invoke` si aspetta.
// Lo stato iniziale (`window.__finzione__`) lo scrive la prova; qui si risponde ai comandi e si
// registrano le scritture.
//
// I file del progetto stanno in `file` (percorso → testo). La finestra del file nativa è finta: restituisce
// il percorso che la prova ha scritto in `daAprire` o `daSalvare` (`null` = l'utente rinuncia) e conta le
// volte che si è aperta; per il salvataggio, il percorso passa dalla decisione del guscio vero (il nome che
// finisce in `.algo`, e se chiedere di sostituire), coi nomi confrontati esatti come su Linux. La scrittura
// cattura il testo. Un guasto si chiede con lo stato: la scrittura dei file e quella delle preferenze rifiutano come
// il guscio vero (un errore del sistema col dettaglio, un testo), la lettura delle preferenze rifiuta. I comandi e
// gli argomenti che legge li appaia coi comandi del guscio una prova di `cargo test` (`main.rs`).
import { mockIPC } from "@tauri-apps/api/mocks";
import { eventoDiChiusura } from "../ui/file";
import { daSalvare } from "./salva-con-nome";

export interface Finzione {
  salvate: unknown;
  scritte: unknown[];
  file: Record<string, string>;
  daAprire: string | null;
  /** Il nome scelto nella finestra di salvataggio, prima della decisione del guscio. */
  daSalvare: string | null;
  /** Il nome scelto nella finestra per esportare la tabella; assente o `null`, l'utente rinuncia. */
  daEsportare?: string | null;
  /** Il nome scelto nella finestra per salvare il codice generato; assente o `null`, l'utente rinuncia. */
  daSalvareIlCodice?: string | null;
  /** Quante volte si sono aperte le finestre del file, e il nome proposto nell'ultima di salvataggio o di
   * esportazione. */
  finestre: { apri: number; salva: number; esporta?: number; codice?: number; proposto: string | null; cartella: string | null };
  /** Il file dato come argomento all'avvio. */
  argomento: string | null;
  /** La cartella predefinita degli esempi (nome del file → testo; «gruppo/nome» per un file di un gruppo, e «gruppo/»
   * il gruppo stesso, che resta anche vuoto), `null` se non c'è ancora; e dove sta. */
  esempi: Record<string, string> | null;
  cartellaEsempi: string;
  /** La cartella predefinita delle librerie, come quella degli esempi (assente o `null`: non c'è ancora), e dove sta. */
  librerie?: Record<string, string> | null;
  cartellaLibrerie?: string;
  /** Le altre cartelle che esistono sul disco finto (percorso → file), fra cui l'utente può sceglierne una. */
  cartelle: Record<string, Record<string, string>>;
  /** Che cosa restituisce la finestra di scelta di una cartella (`null` = l'utente rinuncia), e da dove parte. */
  daScegliere: string | null;
  sceltaDellaCartella: { volte: number; partenza: string | null };
  /** Ogni valore passato a `segna_modificato`, in ordine. */
  modificato: boolean[];
  /** «modificato» come lo tiene il guscio: l'ultimo valore ricevuto, azzerato da `chiudi_finestra`. */
  segnato: boolean;
  chiusa: boolean;
  /** La finestra non si chiude: `chiudi_finestra` rifiuta (un guasto del guscio). */
  chiusuraRifiutata: boolean;
  /** Le preferenze non si scrivono: `scrivi_preferenze` rifiuta con questo testo, come il guscio vero (`null`: si
   * scrivono). */
  preferenzeRifiutate: string | null;
  /** Le preferenze non si leggono: `leggi_preferenze` rifiuta (un guasto del guscio). */
  preferenzeIlleggibili?: boolean;
  /** I file non si scrivono: `scrivi_progetto` rifiuta con un errore del sistema con questo dettaglio, come il guscio
   * vero (assente o `null`: si scrivono). */
  scritturaRifiutata?: string | null;
  /** Le voci di ogni menu del Mac mandato al guscio (`imposta_menu`), in ordine. */
  menu?: Record<string, string>[];
}

declare global {
  interface Window {
    __finzione__: Finzione;
    /** La X della finestra, come la tratta il guscio vero (`alla_chiusura`). */
    __laX__: () => void;
  }
}

// Con «modificato» la chiusura si ferma e l'interfaccia riceve l'evento, per chiedere; senza, la finestra si chiude.
window.__laX__ = () => {
  if (window.__finzione__.segnato) window.dispatchEvent(new Event(eventoDiChiusura));
  else window.__finzione__.chiusa = true;
};

mockIPC((comando, argomenti) => {
  const f = window.__finzione__;
  const a = (argomenti ?? {}) as Record<string, unknown>;
  // La cartella degli esempi (o delle librerie) in uso, come nel guscio: la scelta se c'è, altrimenti la predefinita.
  const delleLibrerie = comando === "elenca_librerie" || comando === "scrivi_libreria";
  const scelta = typeof a.scelta === "string" && a.scelta !== "" ? a.scelta : null;
  const sceltaPresente = scelta !== null && scelta in f.cartelle;
  const inUso = () => (sceltaPresente ? f.cartelle[scelta!]! : delleLibrerie ? (f.librerie ?? null) : f.esempi);
  const metti = (cartella: Record<string, string>) => {
    if (sceltaPresente) f.cartelle[scelta!] = cartella;
    else if (delleLibrerie) f.librerie = cartella;
    else f.esempi = cartella;
  };
  // Un file in un gruppo è la chiave «gruppo/nome»; il gruppo esiste anche vuoto, con la chiave «gruppo/».
  const gruppo = typeof a.gruppo === "string" ? a.gruppo : null;
  const chiave = (nome: string) => (gruppo === null ? nome : `${gruppo}/${nome}`);
  switch (comando) {
    case "leggi_preferenze":
      if (f.preferenzeIlleggibili) return Promise.reject("le preferenze non si leggono");
      return f.salvate;
    case "scrivi_preferenze":
      if (f.preferenzeRifiutate !== null) return Promise.reject(f.preferenzeRifiutate);
      f.scritte.push(argomenti);
      return null;
    case "file_dato_all_avvio":
      return f.argomento;
    case "scegli_file_da_aprire":
      f.finestre.apri++;
      f.finestre.cartella = a.cartella as string | null;
      return f.daAprire;
    case "scegli_file_da_salvare":
      f.finestre.salva++;
      f.finestre.proposto = a.proposto as string;
      f.finestre.cartella = a.cartella as string | null;
      // Il percorso che la finestra del sistema restituisce, deciso come nel guscio vero.
      return f.daSalvare === null ? null : daSalvare(f.daSalvare, (p) => p in f.file, ".algo");
    case "scegli_file_da_esportare":
      // La tabella di traccia: lo stesso, con «.csv»; senza un nome scritto dalla prova, l'utente rinuncia.
      f.finestre.esporta = (f.finestre.esporta ?? 0) + 1;
      f.finestre.proposto = a.proposto as string;
      f.finestre.cartella = a.cartella as string | null;
      return f.daEsportare == null ? null : daSalvare(f.daEsportare, (p) => p in f.file, ".csv");
    case "scegli_file_del_codice":
      // Il codice generato: lo stesso, con l'estensione del linguaggio; senza un nome scritto dalla prova, l'utente
      // rinuncia.
      f.finestre.codice = (f.finestre.codice ?? 0) + 1;
      f.finestre.proposto = a.proposto as string;
      f.finestre.cartella = a.cartella as string | null;
      return f.daSalvareIlCodice == null ? null : daSalvare(f.daSalvareIlCodice, (p) => p in f.file, a.estensione as ".txt" | ".py" | ".c");
    case "leggi_progetto": {
      const testo = f.file[a.percorso as string];
      if (testo === undefined) throw new Error(`file non trovato: ${String(a.percorso)}`);
      return testo;
    }
    case "scrivi_progetto":
      if (f.scritturaRifiutata != null) return Promise.reject({ genere: "sistema", dettaglio: f.scritturaRifiutata });
      f.file[a.percorso as string] = a.testo as string;
      return null;
    case "elenca_esempi":
    case "elenca_librerie": {
      const cartella = inUso();
      const predefinita = delleLibrerie ? (f.cartellaLibrerie ?? "") : f.cartellaEsempi;
      const chiavi = Object.keys(cartella ?? {});
      const fileDi = (g: string) =>
        chiavi
          .filter((k) => k.startsWith(g) && k.length > g.length && !k.slice(g.length).includes("/"))
          .sort()
          .map((k) => ({ nome: k.slice(g.length), testo: cartella![k] }));
      const gruppi = [...new Set(chiavi.filter((k) => k.includes("/")).map((k) => k.slice(0, k.indexOf("/"))))].sort();
      return {
        cartella: sceltaPresente ? scelta : predefinita,
        predefinita,
        mancante: scelta !== null && !sceltaPresente,
        esiste: cartella !== null,
        file: fileDi(""),
        gruppi: gruppi.map((nome) => ({ nome, file: fileDi(`${nome}/`) })),
      };
    }
    case "scrivi_esempio":
    case "scrivi_libreria":
      metti({ ...(inUso() ?? {}), ...(gruppo === null ? {} : { [`${gruppo}/`]: "" }), [chiave(a.nome as string)]: a.testo as string });
      return null;
    case "togli_esempio": {
      const cartella = inUso();
      const k = chiave(a.nome as string);
      if (cartella === null || !(k in cartella)) throw new Error(`file non trovato: ${k}`);
      const { [k]: _, ...resto } = cartella;
      metti(resto);
      return null;
    }
    case "togli_gruppo": {
      // Come il guscio: tutti i file del gruppo (qui sono solo esempi) e il gruppo stesso.
      const cartella = inUso();
      const dentro = `${String(a.gruppo)}/`;
      if (cartella === null || !Object.keys(cartella).some((k) => k.startsWith(dentro))) throw new Error(`gruppo non trovato: ${String(a.gruppo)}`);
      metti(Object.fromEntries(Object.entries(cartella).filter(([k]) => !k.startsWith(dentro))));
      return null;
    }
    case "scegli_cartella":
      f.sceltaDellaCartella.volte++;
      f.sceltaDellaCartella.partenza = a.cartella as string | null;
      return f.daScegliere;
    case "segna_modificato":
      f.modificato.push(a.modificato as boolean);
      f.segnato = a.modificato as boolean;
      return null;
    case "chiudi_finestra":
      // Come il guscio vero: «modificato» si azzera solo se la finestra si chiude.
      if (f.chiusuraRifiutata) throw new Error("la finestra non si chiude");
      f.segnato = false;
      f.chiusa = true;
      return null;
    case "imposta_menu":
      (f.menu ??= []).push(a.voci as Record<string, string>);
      return null;
  }
  throw new Error(`comando non simulato: ${comando}`);
});
