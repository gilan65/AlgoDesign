// I campi di un record mentre si scrivono: la BOZZA, coi valori come li mostrano i campi della scheda, e il ritorno al
// record del modello. Come per un dato, il ritorno non giudica: un nome sbagliato, un campo doppio o una lunghezza fuori dai
// limiti passano così come sono, e li segnala il controllo statico sulla riga del record. Dei nomi si tolgono solo gli
// spazi ai lati, scritti per errore.
//
// Ogni campo della bozza ricorda la posizione che aveva nel record (`origine`, assente per un campo nuovo): è ciò che fa
// di un nome cambiato una rinomina, che il nucleo porta anche nelle regole. La lunghezza massima vale solo per una
// stringa: con un altro tipo il campo non si vede, e non si scrive.
import type { Campo, DefinizioneDelRecord, Tipo } from "../../core/progetto/modello";
import { intero } from "./bozza";

export interface BozzaDelCampo {
  readonly nome: string;
  readonly tipo: Tipo;
  /** Vuota, la predefinita. */
  readonly lunghezza: string;
  readonly origine?: number;
}

export interface BozzaDelRecord {
  readonly nome: string;
  readonly campi: readonly BozzaDelCampo[];
}

export const bozzaDelRecord = (r: DefinizioneDelRecord): BozzaDelRecord => ({
  nome: r.name,
  campi: r.fields.map((c, origine) => ({ nome: c.name, tipo: c.type, lunghezza: c.max_length === undefined ? "" : String(c.max_length), origine })),
});

/** Un campo nuovo in fondo alla bozza: senza nome, intero. */
export const campoNuovo: BozzaDelCampo = { nome: "", tipo: "integer", lunghezza: "" };

/** Il record della bozza, e per ogni campo la posizione che aveva prima. */
export function recordDaBozza(b: BozzaDelRecord): { readonly record: DefinizioneDelRecord; readonly origini: readonly (number | undefined)[] } {
  const campo = (c: BozzaDelCampo): Campo =>
    c.tipo === "string" && c.lunghezza.trim() !== "" ? { name: c.nome.trim(), type: c.tipo, max_length: intero(c.lunghezza) } : { name: c.nome.trim(), type: c.tipo };
  return { record: { name: b.nome.trim(), fields: b.campi.map(campo) }, origini: b.campi.map((c) => c.origine) };
}

/** Due record uguali, campo per campo. */
export const stessoRecord = (a: DefinizioneDelRecord, b: DefinizioneDelRecord): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Il campo `k` spostato col vicino sopra (`-1`) o sotto (`1`); al bordo la bozza resta com'è. */
export function spostaCampo(b: BozzaDelRecord, k: number, verso: -1 | 1): BozzaDelRecord {
  const altro = k + verso;
  if (altro < 0 || altro >= b.campi.length) return b;
  return { ...b, campi: b.campi.map((c, i) => (i === k ? b.campi[altro]! : i === altro ? b.campi[k]! : c)) };
}
