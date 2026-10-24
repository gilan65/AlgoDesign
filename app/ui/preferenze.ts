// Preferenze dell'utente: le legge e le scrive il guscio, nel file `preferenze.json` (mai `localStorage`:
// nella modalità portabile non deve restare nulla nel profilo della WebView).
//
// Contratto con il guscio:
// - `leggi_preferenze` → l'oggetto del file, oppure `null` se non c'è ancora una preferenza salvata;
// - `scrivi_preferenze` con l'argomento `{ preferenze }`, l'oggetto intero.
// Il guscio non giudica i campi: lo fa `preferenzeDa`, qui, campo per campo e sul tipo oltre che sul valore.
// Il file si può modificare a mano, e un campo che l'app non conosce o non sa leggere vale come assente,
// lui solo: gli altri restano. Un file scritto prima che un campo esistesse non ce l'ha, ed è lo stesso caso.
// Fuori dal guscio (il server di sviluppo nel browser) non c'è niente da leggere né dove scrivere: le
// scelte restano nello stato dell'interfaccia fino al ricaricamento.
import { invoke } from "@tauri-apps/api/core";
import { tetti, type Tetti } from "../core/controllo/controllo";
import type { CondizioniLunghe, FormaDellaCopia, FormaDelPer, FormaDelPerOgni, ValoreRipetuto, ValoriIniziali } from "../core/disegno/impaginazione";
import { righeLunghePredefinite, type RigheLunghe } from "../core/esecuzione/esecuzione";
import { separatoriPredefiniti, type FormaDeiVettori, type FormaDelCsv, type Separatori } from "../core/esecuzione/traccia";
import { linguaValida, type Lingua } from "../i18n/lingue";
import { coloriDa, type ColoriDeiBlocchi } from "./colori";

/** I tre insiemi di colori del disegno, ognuno in chiaro e in scuro secondo il sistema. */
export type Colori = "tenue" | "contrasto" | "bianco-e-nero";
/** Dove si scrivono i campi di un blocco: in un riquadro attaccato al blocco, o in un pannello a destra. */
export type ModoDeiBlocchi = "riquadro" | "pannello";
/** Come si modificano i dati: nella scheda sotto la riga scelta, o in ogni cella. */
export type ModoDeiDati = "scheda" | "celle";
/** Quando si chiede conferma prima di cancellare un dato: solo se qualche regola lo usa, o sempre. */
export type ConfermaDelDato = "se-usato" | "sempre";
/** Come si presentano i pulsanti della barra: l'icona col testo accanto, la sola icona (il testo al passaggio del
 * puntatore), o il testo piccolo sotto l'icona. */
export type ComandiDellaBarra = "icone-e-testo" | "icone" | "testo-sotto";

/** I separatori del CSV della tabella di traccia: quelli della lingua dell'interfaccia (finché l'utente non ne
 * sceglie uno), o uno scelto. */
export type SeparatoreCsv = "lingua" | ";" | ",";
export type DecimaliCsv = "lingua" | "," | ".";
/** Le colonne della tabella di traccia che restano ferme scorrendo di lato (oltre all'intestazione). */
export type ColonneFerme = "numero-e-regola" | "numero";
/** Come si mostra un vettore nella tabella di traccia: le colonne dei primi dieci elementi e una per gli altri, o in
 * fila in una colonna sola (la stessa forma per tutti i vettori). */
export type FormaDeiVettoriNellaTabella = Exclude<FormaDeiVettori, "per-elemento">;
/** Come la console tiene una riga più lunga dei suoi caratteri: a capo da sola, o la fine. */
export type ModoDelleRigheLunghe = RigheLunghe["modo"];
/** La velocità dell'esecuzione animata, scelta dal suo menu nella barra. */
export type VelocitaAnimata = "lenta" | "media" | "veloce";
/** Quanto dura un passo dell'esecuzione animata, in millisecondi, per ogni velocità. */
export const durataDelPasso: Readonly<Record<VelocitaAnimata, number>> = { lenta: 1000, media: 500, veloce: 200 };

/** Le preferenze, tutte con un valore (quelle assenti dal file prendono il predefinito). La lingua
 * no: senza preferenza la decide il sistema, all'avvio. */
export interface Scelte {
  readonly colori: Colori;
  /** I generi di blocco con un colore scelto, sopra l'insieme (`ui/colori.ts`); gli altri hanno quello dell'insieme. */
  readonly coloriDeiBlocchi: ColoriDeiBlocchi;
  readonly condizioni: CondizioniLunghe;
  readonly barra: ComandiDellaBarra;
  /** I comandi dell'esecuzione in una barretta sopra il flowchart, mentre c'è un'esecuzione. */
  readonly esecuzioneFlottante: boolean;
  readonly modoDeiBlocchi: ModoDeiBlocchi;
  readonly modoDeiDati: ModoDeiDati;
  readonly conferma: ConfermaDelDato;
  readonly limiti: Tetti;
  /** La cartella degli esempi scelta; `null`, la predefinita. */
  readonly cartellaEsempi: string | null;
  /** La cartella delle librerie scelta; `null`, la predefinita. */
  readonly cartellaLibrerie: string | null;
  readonly separatoreCsv: SeparatoreCsv;
  readonly decimaliCsv: DecimaliCsv;
  readonly colonneFerme: ColonneFerme;
  readonly velocitaAnimata: VelocitaAnimata;
  readonly formaDeiVettori: FormaDeiVettoriNellaTabella;
  readonly formaDelCsv: FormaDelCsv;
  readonly righeLunghe: ModoDelleRigheLunghe;
  readonly caratteriPerRiga: number;
  /** I valori iniziali dei dati nel flowchart, sotto «Inizio», o nascosti. */
  readonly valoriIniziali: ValoriIniziali;
  /** Il valore iniziale di un vettore: come nasce nella vista dei dati (un elenco, o un valore per tutti gli elementi) e
   * come si mostra il valore ripetuto. */
  readonly valoreRipetuto: ValoreRipetuto;
  /** I cicli `per` e `per ogni` nel flowchart: aperti (il `mentre` che fa lo stesso, nel riquadro) o chiusi; il `per
   * ogni` aperto con la posizione dell'elemento o a parole. */
  readonly cicliPer: FormaDelPer;
  readonly cicliPerOgni: FormaDelPerOgni;
  /** La copia di un vettore col suo nome nel flowchart, nel riquadro «copia elemento per elemento»: compatta
   * (l'assegnazione) o espansa (il `mentre` che fa la copia). */
  readonly copiaDeiVettori: FormaDellaCopia;
  /** Il riquadro dei cicli col fondo colorato (la linea resta tratteggiata). */
  readonly fondoDeiCicli: boolean;
  /** I blocchi scelti insieme con un riquadro tratteggiato intorno (il bordo su ogni blocco resta). */
  readonly riquadroDellaScelta: boolean;
  /** Nei campi di un'espressione, una parentesi o un apice aperti si chiudono da sé (`ui/chiusura.ts`). */
  readonly chiusuraAutomatica: boolean;
  /** Una Scrittura subito prima di una Lettura si mostra come la domanda della Lettura, se la console resta identica. Il
   * file non cambia. */
  readonly domandaNellaLettura: boolean;
}

export const scelteIniziali: Scelte = {
  colori: "tenue",
  coloriDeiBlocchi: {},
  condizioni: "su-due-righe",
  barra: "testo-sotto",
  esecuzioneFlottante: false,
  modoDeiBlocchi: "riquadro",
  modoDeiDati: "scheda",
  conferma: "se-usato",
  limiti: tetti,
  cartellaEsempi: null,
  cartellaLibrerie: null,
  separatoreCsv: "lingua",
  decimaliCsv: "lingua",
  colonneFerme: "numero-e-regola",
  velocitaAnimata: "media",
  formaDeiVettori: "primi-e-altri",
  formaDelCsv: "uguale",
  righeLunghe: righeLunghePredefinite.modo,
  caratteriPerRiga: righeLunghePredefinite.caratteri,
  valoriIniziali: "mostrati",
  valoreRipetuto: "elenco",
  cicliPer: "aperto",
  cicliPerOgni: "posizione",
  copiaDeiVettori: "compatta",
  fondoDeiCicli: false,
  riquadroDellaScelta: false,
  chiusuraAutomatica: true,
  domandaNellaLettura: false,
};

export const voci = {
  colori: ["tenue", "contrasto", "bianco-e-nero"],
  condizioni: ["su-due-righe", "su-una-riga"],
  barra: ["icone-e-testo", "icone", "testo-sotto"],
  modoDeiBlocchi: ["riquadro", "pannello"],
  modoDeiDati: ["scheda", "celle"],
  conferma: ["se-usato", "sempre"],
  separatoreCsv: ["lingua", ";", ","],
  decimaliCsv: ["lingua", ",", "."],
  colonneFerme: ["numero-e-regola", "numero"],
  velocitaAnimata: ["lenta", "media", "veloce"],
  formaDeiVettori: ["primi-e-altri", "in-fila"],
  formaDelCsv: ["uguale", "per-elemento"],
  righeLunghe: ["a-capo", "la-fine"],
  valoriIniziali: ["mostrati", "nascosti"],
  valoreRipetuto: ["elenco", "un-valore"],
  cicliPer: ["aperto", "chiuso"],
  cicliPerOgni: ["posizione", "parole", "chiuso"],
  copiaDeiVettori: ["compatta", "espansa"],
} as const satisfies {
  [K in
    | "colori"
    | "condizioni"
    | "barra"
    | "modoDeiBlocchi"
    | "modoDeiDati"
    | "conferma"
    | "separatoreCsv"
    | "decimaliCsv"
    | "colonneFerme"
    | "velocitaAnimata"
    | "formaDeiVettori"
    | "formaDelCsv"
    | "righeLunghe"
    | "valoriIniziali"
    | "valoreRipetuto"
    | "cicliPer"
    | "cicliPerOgni"
    | "copiaDeiVettori"]: readonly Scelte[K][];
};

/** I separatori del CSV in uso: quelli scelti, o quelli della lingua. */
export function separatoriDelCsv(s: Scelte, lingua: Lingua): Separatori {
  const dellaLingua = separatoriPredefiniti[lingua];
  return { campo: s.separatoreCsv === "lingua" ? dellaLingua.campo : s.separatoreCsv, decimali: s.decimaliCsv === "lingua" ? dellaLingua.decimali : s.decimaliCsv };
}

/** I limiti accettati per ciascun tetto: un intero da 1 al massimo, che è anche il predefinito (i limiti si possono
 * solo abbassare). Un vettore o una stringa più lunghi, cambiati in un ciclo, costano secondi e centinaia di MB alla
 * tabella di traccia, che tiene i valori di ogni riga: 1000 elementi, 1000 caratteri, 10 000 caratteri in tutto per
 * un vettore di stringhe (1000 stringhe da 1000 bloccavano la finestra 30 s, misurato). I caratteri di un vettore di
 * stringhe non scendono sotto gli elementi di un vettore (`minimoDeiCaratteri`): il vettore più lungo permesso entra
 * sempre, con stringhe di un carattere. */
export const intervalli = {
  elementiDiUnVettore: { minimo: 1, massimo: 1000 },
  lunghezzaDiUnaStringa: { minimo: 1, massimo: 1000 },
  caratteriDiUnVettoreDiStringhe: { minimo: 1, massimo: 10_000 },
} as const satisfies Record<keyof Tetti, { minimo: number; massimo: number }>;

/** Il minimo di un limite con gli elementi di un vettore scelti: per i caratteri di un vettore di stringhe sono gli
 * elementi, per gli altri quello di `intervalli`. */
export const minimoDel = (chiave: keyof Tetti, elementi: number): number => (chiave === "caratteriDiUnVettoreDiStringhe" ? elementi : intervalli[chiave].minimo);

/** I caratteri di una riga della console: oltre, la riga va a capo da sola o se ne tiene la fine. */
export const caratteriPerRiga = { minimo: 50, massimo: 1000 } as const;

export function caratteriValidi(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isInteger(valore) && valore >= caratteriPerRiga.minimo && valore <= caratteriPerRiga.massimo;
}

/** Come la console tiene le righe lunghe, per l'esecuzione. */
export const righeLungheDi = (s: Scelte): RigheLunghe => ({ caratteri: s.caratteriPerRiga, modo: s.righeLunghe });

/** Un limite valido: un intero fra il minimo (con gli elementi di un vettore scelti, se li si dà) e il massimo. */
export function limiteValido(chiave: keyof Tetti, valore: unknown, elementi: number = intervalli.elementiDiUnVettore.minimo): valore is number {
  return typeof valore === "number" && Number.isInteger(valore) && valore >= minimoDel(chiave, elementi) && valore <= intervalli[chiave].massimo;
}

const uno = <V extends string>(ammessi: readonly V[], valore: unknown): V | undefined =>
  typeof valore === "string" && (ammessi as readonly string[]).includes(valore) ? (valore as V) : undefined;

const oggetto = (v: unknown): Record<string, unknown> | undefined => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

/** Le preferenze lette dal file: ogni campo per sé, e quello che non si legge prende il predefinito (la
 * lingua resta assente: la decide il sistema). I caratteri di un vettore di stringhe sotto gli elementi letti non
 * valgono; lo spazio in KiB scritto da una versione di prima non si legge più. */
export function preferenzeDa(file: unknown): { lingua: Lingua | undefined; scelte: Scelte } {
  const f = oggetto(file) ?? {};
  const limiti = oggetto(f.limiti) ?? {};
  const elementi = limiteValido("elementiDiUnVettore", limiti.elementiDiUnVettore) ? limiti.elementiDiUnVettore : tetti.elementiDiUnVettore;
  const limite = (k: keyof Tetti) => (limiteValido(k, limiti[k], elementi) ? (limiti[k] as number) : tetti[k]);
  const cartella = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  return {
    lingua: linguaValida(f.lingua) ? f.lingua : undefined,
    scelte: {
      colori: uno(voci.colori, f.colori) ?? scelteIniziali.colori,
      coloriDeiBlocchi: coloriDa(f.coloriDeiBlocchi),
      condizioni: uno(voci.condizioni, f.condizioni) ?? scelteIniziali.condizioni,
      barra: uno(voci.barra, f.barra) ?? scelteIniziali.barra,
      esecuzioneFlottante: typeof f.esecuzioneFlottante === "boolean" ? f.esecuzioneFlottante : scelteIniziali.esecuzioneFlottante,
      modoDeiBlocchi: uno(voci.modoDeiBlocchi, f.modoDeiBlocchi) ?? scelteIniziali.modoDeiBlocchi,
      modoDeiDati: uno(voci.modoDeiDati, f.modoDeiDati) ?? scelteIniziali.modoDeiDati,
      conferma: uno(voci.conferma, f.conferma) ?? scelteIniziali.conferma,
      limiti: { elementiDiUnVettore: limite("elementiDiUnVettore"), lunghezzaDiUnaStringa: limite("lunghezzaDiUnaStringa"), caratteriDiUnVettoreDiStringhe: limite("caratteriDiUnVettoreDiStringhe") },
      cartellaEsempi: cartella(f.cartellaEsempi),
      cartellaLibrerie: cartella(f.cartellaLibrerie),
      separatoreCsv: uno(voci.separatoreCsv, f.separatoreCsv) ?? scelteIniziali.separatoreCsv,
      decimaliCsv: uno(voci.decimaliCsv, f.decimaliCsv) ?? scelteIniziali.decimaliCsv,
      colonneFerme: uno(voci.colonneFerme, f.colonneFerme) ?? scelteIniziali.colonneFerme,
      velocitaAnimata: uno(voci.velocitaAnimata, f.velocitaAnimata) ?? scelteIniziali.velocitaAnimata,
      formaDeiVettori: uno(voci.formaDeiVettori, f.formaDeiVettori) ?? scelteIniziali.formaDeiVettori,
      formaDelCsv: uno(voci.formaDelCsv, f.formaDelCsv) ?? scelteIniziali.formaDelCsv,
      righeLunghe: uno(voci.righeLunghe, f.righeLunghe) ?? scelteIniziali.righeLunghe,
      caratteriPerRiga: caratteriValidi(f.caratteriPerRiga) ? f.caratteriPerRiga : scelteIniziali.caratteriPerRiga,
      valoriIniziali: uno(voci.valoriIniziali, f.valoriIniziali) ?? scelteIniziali.valoriIniziali,
      valoreRipetuto: uno(voci.valoreRipetuto, f.valoreRipetuto) ?? scelteIniziali.valoreRipetuto,
      cicliPer: uno(voci.cicliPer, f.cicliPer) ?? scelteIniziali.cicliPer,
      cicliPerOgni: uno(voci.cicliPerOgni, f.cicliPerOgni) ?? scelteIniziali.cicliPerOgni,
      copiaDeiVettori: uno(voci.copiaDeiVettori, f.copiaDeiVettori) ?? scelteIniziali.copiaDeiVettori,
      fondoDeiCicli: typeof f.fondoDeiCicli === "boolean" ? f.fondoDeiCicli : scelteIniziali.fondoDeiCicli,
      riquadroDellaScelta: typeof f.riquadroDellaScelta === "boolean" ? f.riquadroDellaScelta : scelteIniziali.riquadroDellaScelta,
      chiusuraAutomatica: typeof f.chiusuraAutomatica === "boolean" ? f.chiusuraAutomatica : scelteIniziali.chiusuraAutomatica,
      domandaNellaLettura: typeof f.domandaNellaLettura === "boolean" ? f.domandaNellaLettura : scelteIniziali.domandaNellaLettura,
    },
  };
}

/** L'oggetto da scrivere: la lingua e ogni scelta (le cartelle solo se scelte). */
export function fileDa(lingua: Lingua, s: Scelte): Record<string, unknown> {
  return {
    lingua,
    colori: s.colori,
    coloriDeiBlocchi: { ...s.coloriDeiBlocchi },
    condizioni: s.condizioni,
    barra: s.barra,
    esecuzioneFlottante: s.esecuzioneFlottante,
    modoDeiBlocchi: s.modoDeiBlocchi,
    modoDeiDati: s.modoDeiDati,
    conferma: s.conferma,
    limiti: { ...s.limiti },
    ...(s.cartellaEsempi !== null ? { cartellaEsempi: s.cartellaEsempi } : {}),
    ...(s.cartellaLibrerie !== null ? { cartellaLibrerie: s.cartellaLibrerie } : {}),
    separatoreCsv: s.separatoreCsv,
    decimaliCsv: s.decimaliCsv,
    colonneFerme: s.colonneFerme,
    velocitaAnimata: s.velocitaAnimata,
    formaDeiVettori: s.formaDeiVettori,
    formaDelCsv: s.formaDelCsv,
    righeLunghe: s.righeLunghe,
    caratteriPerRiga: s.caratteriPerRiga,
    valoriIniziali: s.valoriIniziali,
    valoreRipetuto: s.valoreRipetuto,
    cicliPer: s.cicliPer,
    cicliPerOgni: s.cicliPerOgni,
    copiaDeiVettori: s.copiaDeiVettori,
    fondoDeiCicli: s.fondoDeiCicli,
    riquadroDellaScelta: s.riquadroDellaScelta,
    chiusuraAutomatica: s.chiusuraAutomatica,
    domandaNellaLettura: s.domandaNellaLettura,
  };
}

// `isTauri()` non basta: la finzione di Playwright (`mockIPC`) imposta `__TAURI_INTERNALS__` ma non
// `isTauri`, e sotto la finzione i comandi devono partire come nel guscio vero.
function nelGuscio(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function leggiPreferenze(): Promise<unknown> {
  return nelGuscio() ? invoke<unknown>("leggi_preferenze") : null;
}

export async function scriviPreferenze(lingua: Lingua, scelte: Scelte): Promise<void> {
  if (nelGuscio()) await invoke("scrivi_preferenze", { preferenze: fileDa(lingua, scelte) });
}
