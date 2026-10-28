// I campi di un dato mentre si scrivono: la BOZZA, coi valori come li mostrano i campi (testo, scelte), e
// il ritorno al dato del modello. Il ritorno non giudica: un nome o un letterale sbagliato passa così com'è
// e lo segnala il controllo statico, sulla riga del dato.
//
// Il valore iniziale di un vettore si scrive come lo mostra la tabella: l'elenco completo dei letterali
// separati da virgole, fra graffe (senza vale lo stesso), oppure un letterale solo «in ogni elemento» (`ripetuto`). Una
// virgola dentro un letterale di testo o di carattere non separa. Un campo vuoto vuol dire «nessun valore iniziale».
//
// Un vettore nuovo (un dato che diventa un vettore, o un vettore ancora senza valore) nasce nel modo scelto
// nelle Impostazioni, l'elenco o un valore per tutti; un vettore che ha già un valore tiene il suo, e la casella
// lo cambia per lui solo. Passando dal valore ripetuto all'elenco il campo si riempie col valore, uno per elemento.
//
// Una dimensione o una lunghezza che non è un numero intero, o che lo è ma il file non la sa scrivere esatta (oltre 2^53,
// fino all'infinito di `parseInt` con 309 cifre), diventa 0, che il controllo segnala come dato non valido: un numero che
// il file non sa scrivere non arriva al modello, e la conferma della scheda non è mai rifiutata dal nucleo. La lunghezza massima vale solo
// per le stringhe: con un altro tipo il campo non si vede, e non si scrive.
//
// La natura è una sola scelta: variabile, costante, parametro per valore, per riferimento o per uscita. Un parametro non ha valore
// iniziale né ruolo (li riceve dalla chiamata): i loro campi non si vedono, e non si scrivono, ma la bozza li tiene finché
// i campi sono aperti (tornando variabile ricompaiono). La casella «globale» vale solo per una costante: dice se è una
// costante comune, e non è un attributo del dato (chi conferma la bozza sposta il dato fra le due tabelle).
import type { ValoreRipetuto } from "../../core/disegno/impaginazione";
import { tipoSemplice, type Dato, type Modalita, type Ruolo, type Tipo } from "../../core/progetto/modello";
import { intervalli } from "../preferenze";

export interface BozzaDelDato {
  readonly nome: string;
  readonly tipo: Tipo;
  readonly vettore: boolean;
  readonly dimensione: string;
  readonly costante: boolean;
  readonly iniziale: string;
  /** Per un vettore: il valore iniziale è un letterale ripetuto in ogni elemento (altrimenti l'elenco). */
  readonly ripetuto: boolean;
  readonly ruolo: Ruolo | "";
  /** La lunghezza massima di una stringa; vuota, la predefinita. */
  readonly lunghezza: string;
  /** Un parametro: come si passa. */
  readonly parametro: Modalita | "";
  /** Una costante comune. */
  readonly globale: boolean;
}

export type Natura = "variabile" | "costante" | Modalita;

export const naturaDi = (b: Pick<BozzaDelDato, "costante" | "parametro">): Natura => (b.parametro !== "" ? b.parametro : b.costante ? "costante" : "variabile");

/** La bozza con la natura scelta; una natura che non è «costante» toglie la casella «globale». */
export const conNatura = (b: BozzaDelDato, n: Natura): BozzaDelDato => ({
  ...b,
  costante: n === "costante",
  parametro: n === "value" || n === "reference" || n === "out" ? n : "",
  globale: n === "costante" && b.globale,
});

/** La bozza di un dato; `nuovo` è il modo delle Impostazioni per un vettore che non ha ancora un valore; `globale`, se è
 * una costante comune. */
export function bozzaDi(d: Dato, nuovo: ValoreRipetuto, globale = false): BozzaDelDato {
  const iniziale = d.initial === undefined ? "" : typeof d.initial === "string" ? d.initial : "each" in d.initial ? d.initial.each : fraGraffe(d.initial);
  return {
    nome: d.name,
    tipo: tipoSemplice(d.type),
    vettore: d.size !== undefined,
    dimensione: d.size === undefined ? "" : String(d.size),
    costante: d.constant === true,
    iniziale,
    ripetuto: d.initial === undefined || typeof d.initial === "string" ? nuovo === "un-valore" : "each" in d.initial,
    ruolo: d.role ?? "",
    lunghezza: d.max_length === undefined ? "" : String(d.max_length),
    parametro: d.parameter ?? "",
    globale,
  };
}

/** L'elenco di un vettore come lo mostrano il campo, il blocco e la riga della tabella. */
const fraGraffe = (valori: readonly string[]) => `{${valori.join(", ")}}`;

/** Il testo di un elenco senza le graffe che lo racchiudono, se ci sono tutte e due. */
const senzaGraffe = (testo: string) => (testo.startsWith("{") && testo.endsWith("}") ? testo.slice(1, -1).trim() : testo);

/** Un numero intero scritto in un campo, se il file lo sa scrivere esatto (fino a 2^53, non infinito); altrimenti 0. */
export const intero = (testo: string): number => {
  const n = /^\s*-?\d+\s*$/.test(testo) ? Number.parseInt(testo, 10) : 0;
  const esatto = Number.isSafeInteger(n);
  return esatto ? n : 0;
};

/** Le parti di un elenco separate da virgole, fuori dai letterali fra apici o virgolette (con le loro
 * sequenze di escape). Ogni parte senza gli spazi ai lati. */
export function elementi(testo: string): string[] {
  const parti: string[] = [];
  let corrente = "";
  let dentro: string | null = null;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]!;
    if (dentro !== null) {
      corrente += c;
      if (c === "\\" && i + 1 < testo.length) corrente += testo[++i];
      else if (c === dentro) dentro = null;
    } else if (c === ",") {
      parti.push(corrente.trim());
      corrente = "";
    } else {
      if (c === '"' || c === "'") dentro = c;
      corrente += c;
    }
  }
  parti.push(corrente.trim());
  return parti;
}

/** La casella del valore iniziale di un vettore cambiata: dal valore ripetuto all'elenco, il campo si riempie col
 * valore, uno per elemento, se c'è un valore e la dimensione è un intero fra 1 e il massimo di un vettore; altrimenti
 * resta com'è. */
export function conRipetuto(b: BozzaDelDato, ripetuto: boolean): BozzaDelDato {
  const valore = b.iniziale.trim();
  const n = /^\s*\d+\s*$/.test(b.dimensione) ? Number.parseInt(b.dimensione, 10) : 0;
  const riempie = b.ripetuto && !ripetuto && valore !== "" && n >= 1 && n <= intervalli.elementiDiUnVettore.massimo;
  return { ...b, ripetuto, ...(riempie ? { iniziale: fraGraffe(Array<string>(n).fill(valore)) } : {}) };
}

/** Il valore iniziale scritto nel campo, come il dato lo tiene: vuoto, nessuno; un vettore, l'elenco o il valore
 * ripetuto. Lo stesso per la vista dei dati e per i campi del blocco del valore iniziale nel flowchart. */
export function inizialeDaBozza(b: Pick<BozzaDelDato, "iniziale" | "vettore" | "ripetuto">): Dato["initial"] {
  const testo = b.iniziale.trim();
  if (testo === "") return undefined;
  if (!b.vettore) return testo;
  if (b.ripetuto) return { each: testo };
  // Le graffe vuote sono l'elenco vuoto: nessun valore, come il campo vuoto.
  const dentro = senzaGraffe(testo);
  return dentro === "" ? undefined : elementi(dentro);
}

/** Il dato col valore iniziale della bozza, tutto il resto com'è (i campi del blocco del valore iniziale). */
export function conIlValoreDi(d: Dato, b: Pick<BozzaDelDato, "iniziale" | "vettore" | "ripetuto">): Dato {
  const { initial: _, ...senza } = d;
  const iniziale = inizialeDaBozza(b);
  return iniziale === undefined ? senza : { ...senza, initial: iniziale };
}

export function datoDaBozza(b: BozzaDelDato): Dato {
  const iniziale = b.parametro === "" ? inizialeDaBozza(b) : undefined;
  return {
    name: b.nome,
    type: b.tipo,
    ...(b.vettore ? { size: intero(b.dimensione) } : {}),
    ...(b.costante && b.parametro === "" ? { constant: true } : {}),
    ...(iniziale === undefined ? {} : { initial: iniziale }),
    ...(b.ruolo === "" || b.parametro !== "" ? {} : { role: b.ruolo }),
    ...(b.tipo === "string" && b.lunghezza.trim() !== "" ? { max_length: intero(b.lunghezza) } : {}),
    ...(b.parametro === "" ? {} : { parameter: b.parametro }),
  };
}

/** Due dati uguali, attributo per attributo (l'ordine delle chiavi non conta). */
export function stessoDato(a: Dato, b: Dato): boolean {
  const ordinato = (d: Dato) => JSON.stringify(Object.fromEntries(Object.entries(d).sort(([x], [y]) => x.localeCompare(y))));
  return ordinato(a) === ordinato(b);
}
