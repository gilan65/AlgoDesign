// I file del progetto, le cartelle degli esempi e delle librerie e la chiusura della finestra: li gestisce il guscio
// (contratto in app/shell/src/progetto.rs). Fuori dal guscio (il server di sviluppo nel browser) non ci sono file: le
// finestre del file non si aprono (come se l'utente rinunciasse) e le due cartelle sono in memoria, vuote a ogni
// caricamento (come al primo avvio).
import { invoke } from "@tauri-apps/api/core";
import type { EstensioneDelCodice } from "../core/genera/linguaggi";
import { annota } from "./errori-dell-app";

/** I generi di un errore del guscio (`GENERI` in `shell/src/progetto.rs`, appaiati da una prova di `cargo test`): il
 * file non è testo UTF-8, il messaggio del sistema, e per gli esempi e i gruppi un nome non ammesso, un gruppo con dentro
 * altro oltre agli esempi, un gruppo con un esempio aperto in un altro programma, un esempio in sola lettura. */
export const generiDelFile = ["non_testo", "sistema", "nome_non_valido", "gruppo_con_altro", "gruppo_bloccato", "sola_lettura"] as const;

/** Un errore di lettura o di scrittura: il genere, e il dettaglio (il messaggio del sistema, un nome, un elenco). */
export interface ErroreDelFile {
  readonly genere: (typeof generiDelFile)[number];
  readonly dettaglio: string;
}

// Come in `preferenze.ts`: la finzione di Playwright imposta `__TAURI_INTERNALS__` e non `isTauri`.
const nelGuscio = () => "__TAURI_INTERNALS__" in window;

/** `cartella`: da dove parte la finestra (quella del file aperto o dell'ultimo usato); `null`, la sceglie il
 * guscio (nella versione portabile la cartella dell'eseguibile). */
export const scegliFileDaAprire = async (filtro: string, cartella: string | null) =>
  nelGuscio() ? invoke<string | null>("scegli_file_da_aprire", { filtro, cartella }) : null;

/** Il file dove salvare: il percorso scelto, già con «.algo», e se va chiesto all'utente di sostituirlo (il
 * file c'è, e la finestra del sistema non l'ha confermato perché il nome scelto era un altro). Le chiavi le
 * manda il guscio: una prova di `cargo test` le confronta con le righe `readonly` di questa dichiarazione. */
export interface FileDaSalvare {
  readonly percorso: string;
  readonly sostituire: boolean;
}

export const scegliFileDaSalvare = async (proposto: string, filtro: string, cartella: string | null) =>
  nelGuscio() ? invoke<FileDaSalvare | null>("scegli_file_da_salvare", { proposto, filtro, cartella }) : null;

/** Il file dove esportare la tabella di traccia: come per «Salva con nome», col filtro e l'estensione `.csv`. */
export const scegliFileDaEsportare = async (proposto: string, filtro: string, cartella: string | null) =>
  nelGuscio() ? invoke<FileDaSalvare | null>("scegli_file_da_esportare", { proposto, filtro, cartella }) : null;

/** Il file dove salvare il codice generato: come per «Salva con nome», col filtro e l'estensione del linguaggio (dal
 * registro dei linguaggi). */
export const scegliFileDelCodice = async (proposto: string, filtro: string, estensione: EstensioneDelCodice, cartella: string | null) =>
  nelGuscio() ? invoke<FileDaSalvare | null>("scegli_file_del_codice", { proposto, filtro, estensione, cartella }) : null;

/** Le estensioni del flowchart esportato (`IMMAGINE` in `shell/src/progetto.rs`). */
export const estensioniDellImmagine = [".png", ".svg"] as const;
export type EstensioneDellImmagine = (typeof estensioniDellImmagine)[number];

/** Il file dove esportare il flowchart: come per «Salva con nome», col filtro e l'estensione dell'immagine. */
export const scegliFileDellImmagine = async (proposto: string, filtro: string, estensione: EstensioneDellImmagine, cartella: string | null) =>
  nelGuscio() ? invoke<FileDaSalvare | null>("scegli_file_dell_immagine", { proposto, filtro, estensione, cartella }) : null;

/** Rifiuta con un `ErroreDelFile`. Scrive i byte com'è (il PNG), in modo atomico: viaggiano in base64. */
export const scriviByte = (percorso: string, byte: string) => invoke<void>("scrivi_byte", { percorso, byte });

/** Rifiuta con un `ErroreDelFile`. */
export const leggiProgetto = (percorso: string) => invoke<string>("leggi_progetto", { percorso });

/** Rifiuta con un `ErroreDelFile`. Scrive il testo com'è, in modo atomico: serve anche alla tabella esportata. */
export const scriviProgetto = (percorso: string, testo: string) => invoke<void>("scrivi_progetto", { percorso, testo });

export const fileDatoAllAvvio = async () => (nelGuscio() ? invoke<string | null>("file_dato_all_avvio") : null);

/** Un file della cartella degli esempi: il testo, o perché non si legge. */
export interface FileDiEsempio {
  readonly nome: string;
  readonly testo?: string;
  readonly errore?: ErroreDelFile;
}

/** Una sottocartella della cartella degli esempi: un gruppo, coi suoi file `.algo` in ordine di nome. */
export interface GruppoDiFile {
  readonly nome: string;
  readonly file: readonly FileDiEsempio[];
}

/** La cartella degli esempi in uso (la scelta nelle Impostazioni, se c'è ancora, o la predefinita): dove
 * sta, qual è la predefinita, se la scelta non c'è più, se la cartella in uso c'è già, i suoi file `.algo`
 * fuori da ogni gruppo e i gruppi (le sottocartelle), tutti in ordine di nome. */
export interface CartellaDegliEsempi {
  readonly cartella: string;
  readonly predefinita: string;
  readonly mancante: boolean;
  readonly esiste: boolean;
  readonly file: readonly FileDiEsempio[];
  readonly gruppi: readonly GruppoDiFile[];
}

/** Fuori dal guscio: i gruppi (`""` per i file fuori da ogni gruppo), ognuno coi suoi file. Un gruppo resta anche
 * vuoto, come la sottocartella. */
const inMemoria = new Map<string, Map<string, string>>();
let creataInMemoria = false;

const fileDi = (g: Map<string, string> | undefined): FileDiEsempio[] => [...(g?.keys() ?? [])].sort().map((nome) => ({ nome, testo: g!.get(nome)! }));

// `scelta` è la cartella scelta nelle Impostazioni (`null`: la predefinita); fuori dal guscio non conta.
export async function elencaEsempi(scelta: string | null): Promise<CartellaDegliEsempi> {
  if (nelGuscio()) return invoke<CartellaDegliEsempi>("elenca_esempi", { scelta });
  const gruppi = [...inMemoria.keys()].filter((g) => g !== "").sort().map((nome) => ({ nome, file: fileDi(inMemoria.get(nome)) }));
  return { cartella: "", predefinita: "", mancante: false, esiste: creataInMemoria, file: fileDi(inMemoria.get("")), gruppi };
}

/** Rifiuta con un `ErroreDelFile`. `gruppo`: la sottocartella (`null`: fuori da ogni gruppo), creata se manca. */
export async function scriviEsempio(nome: string, testo: string, scelta: string | null, gruppo: string | null): Promise<void> {
  if (nelGuscio()) return invoke("scrivi_esempio", { nome, testo, scelta, gruppo });
  creataInMemoria = true;
  const g = inMemoria.get(gruppo ?? "") ?? new Map<string, string>();
  g.set(nome, testo);
  inMemoria.set(gruppo ?? "", g);
}

/** Fuori dal guscio la cartella delle librerie, come quella degli esempi: i gruppi, ognuno coi suoi file. */
const librerieInMemoria = new Map<string, Map<string, string>>();

/** La cartella delle librerie in uso, con le regole di quella degli esempi (`scelta`: la cartella scelta nelle
 * Impostazioni; `null`, la predefinita, `librerie` accanto agli esempi). Nessuna libreria è fornita: la cartella
 * nasce con la prima aggiunta. */
export async function elencaLibrerie(scelta: string | null): Promise<CartellaDegliEsempi> {
  if (nelGuscio()) return invoke<CartellaDegliEsempi>("elenca_librerie", { scelta });
  const gruppi = [...librerieInMemoria.keys()].filter((g) => g !== "").sort().map((nome) => ({ nome, file: fileDi(librerieInMemoria.get(nome)) }));
  return { cartella: "", predefinita: "", mancante: false, esiste: librerieInMemoria.size > 0, file: fileDi(librerieInMemoria.get("")), gruppi };
}

/** Rifiuta con un `ErroreDelFile`. `gruppo`: la sottocartella (`null`: fuori da ogni gruppo), creata se manca. */
export async function scriviLibreria(nome: string, testo: string, scelta: string | null, gruppo: string | null): Promise<void> {
  if (nelGuscio()) return invoke("scrivi_libreria", { nome, testo, scelta, gruppo });
  const g = librerieInMemoria.get(gruppo ?? "") ?? new Map<string, string>();
  g.set(nome, testo);
  librerieInMemoria.set(gruppo ?? "", g);
}

/** Rifiuta con un `ErroreDelFile`. Il gruppo resta, anche vuoto. */
export async function togliEsempio(nome: string, scelta: string | null, gruppo: string | null): Promise<void> {
  if (nelGuscio()) return invoke("togli_esempio", { nome, scelta, gruppo });
  inMemoria.get(gruppo ?? "")?.delete(nome);
}

/** Rifiuta con un `ErroreDelFile`. Cancella gli esempi del gruppo e la sottocartella (il guscio rifiuta senza
 * cancellare nulla se dentro c'è altro). */
export async function togliGruppo(gruppo: string, scelta: string | null): Promise<void> {
  if (nelGuscio()) return invoke("togli_gruppo", { gruppo, scelta });
  inMemoria.delete(gruppo);
}

/** La finestra del sistema per scegliere una cartella, che parte da `cartella`; `null` se l'utente rinuncia
 * (e sempre fuori dal guscio). */
export const scegliCartella = async (cartella: string | null) => (nelGuscio() ? invoke<string | null>("scegli_cartella", { cartella }) : null);

export async function segnaModificato(modificato: boolean): Promise<void> {
  if (nelGuscio()) await invoke("segna_modificato", { modificato });
}

export async function chiudiFinestra(): Promise<void> {
  if (nelGuscio()) await invoke("chiudi_finestra");
}

/** L'evento che il guscio manda alla pagina quando si chiude la finestra con modifiche non salvate (il nome
 * scritto nel guscio lo appaia `file.test.ts`). */
export const eventoDiChiusura = "algodesign-chiusura";

/** Un errore rifiutato da `invoke`, riconosciuto per forma; un'altra cosa (la finzione lancia un `Error`)
 * è un errore del sistema col suo testo. Ogni errore del guscio che arriva a una finestra passa di qui: è il punto in cui entra
 * nell'elenco degli errori dell'app. */
export function erroreDelFile(e: unknown): ErroreDelFile {
  annota("handled", "", e);
  if (typeof e === "object" && e !== null && "genere" in e && generiDelFile.some((g) => g === e.genere))
    return { genere: e.genere as ErroreDelFile["genere"], dettaglio: String((e as { dettaglio?: unknown }).dettaglio ?? "") };
  const messaggio = (e as { message?: unknown } | null)?.message;
  return { genere: "sistema", dettaglio: typeof messaggio === "string" ? messaggio : String(e) };
}

/** Il nome del file, senza la cartella (barre dei due sistemi). */
export const nomeDelFile = (percorso: string) => percorso.split(/[\\/]/).at(-1) ?? percorso;

/** La cartella del file (barre dei due sistemi); `null` per un nome senza cartella. */
export function cartellaDi(percorso: string): string | null {
  const fine = Math.max(percorso.lastIndexOf("\\"), percorso.lastIndexOf("/"));
  return fine <= 0 ? null : percorso.slice(0, fine);
}
