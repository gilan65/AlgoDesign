// La bozza dei campi di un caso d'uso: ciò che l'utente scrive (nome, descrizione, le voci con il loro dato, l'output
// atteso), e il caso che ne viene. L'errore e gli avvisi attesi non sono campi: restano quelli del caso.
//
// Un caso di una procedura o di una funzione (eseguita da sola) ha voci in più: un parametro per riferimento può arrivare
// senza valore (la voce senza testo), e per un parametro vettore una voce sola può valere per ogni elemento.

import type { CasoDiUnaFunzione, Dato, DefinizioneDelRecord } from "../../core/progetto/modello";

export interface VoceDellaBozza {
  readonly dato: string;
  readonly testo: string;
  /** Nessun valore: il testo non conta (solo per un parametro per riferimento). */
  readonly senzaValore?: true;
  /** Lo stesso testo per ogni elemento (solo per un parametro vettore). */
  readonly ognuno?: true;
}

export interface BozzaDelCaso {
  readonly nome: string;
  readonly descrizione: string;
  readonly voci: readonly VoceDellaBozza[];
  readonly output: string;
}

export const bozzaDelCaso = (c: CasoDiUnaFunzione): BozzaDelCaso => ({
  nome: c.name,
  descrizione: c.description ?? "",
  voci: c.inputs.map((v) => ({ dato: v.data, testo: v.text ?? "", ...(v.text === undefined ? { senzaValore: true as const } : {}), ...(v.each ? { ognuno: true as const } : {}) })),
  output: c.expected.output,
});

/** Il caso coi campi della bozza; il resto dell'atteso è quello di `c`. */
export const casoDaBozza = (c: CasoDiUnaFunzione, b: BozzaDelCaso): CasoDiUnaFunzione => ({
  name: b.nome,
  ...(b.descrizione === "" ? {} : { description: b.descrizione }),
  inputs: b.voci.map((v) => ({ data: v.dato, ...(v.senzaValore ? {} : { text: v.testo }), ...(v.ognuno ? { each: true } : {}) })),
  expected: { ...c.expected, output: b.output },
});

/** Gli stessi campi: confermarli non è un passo. */
export const stessoCaso = (c: CasoDiUnaFunzione, b: BozzaDelCaso): boolean => JSON.stringify(bozzaDelCaso(c)) === JSON.stringify(b);

/** I dati a cui una voce può andare: quelli di input (anche input e output) e, se il progetto non usa i ruoli di input,
 * tutte le variabili. In una procedura o in una funzione prima i parametri, nell'ordine della firma, poi le variabili che
 * una lettura può ricevere. */
export function datiDelleVoci(dati: readonly Dato[]): string[] {
  const parametri = dati.filter((d) => d.parameter !== undefined);
  // Un parametro per uscita non ha una voce sua, ma una lettura nella procedura lo può ricevere.
  if (parametri.length > 0) return [...parametri, ...dati.filter((d) => d.parameter === undefined && d.constant !== true)].map((d) => d.name);
  const diInput = dati.filter((d) => d.role === "input" || d.role === "input_output");
  return (diInput.length > 0 ? diInput : dati.filter((d) => d.constant !== true)).map((d) => d.name);
}

/** La voce col dato nuovo: il testo resta, e «senza valore» e «in ogni elemento» se il dato nuovo li ammette (un
 * parametro per riferimento, un parametro vettore). */
export function conIlDato(v: VoceDellaBozza, dato: string, parametri?: ReadonlyMap<string, { readonly rif: boolean; readonly vettore: boolean; readonly uscita?: boolean }>): VoceDellaBozza {
  const p = parametri?.get(dato);
  return { dato, testo: v.testo, ...(v.senzaValore && p?.rif ? { senzaValore: true as const } : {}), ...(v.ognuno && p?.vettore ? { ognuno: true as const } : {}) };
}

/** Il nome del primo caso nuovo libero: «caso N», con N dal numero dei casi più uno in su. */
export function nomeDelCasoNuovo(casi: readonly CasoDiUnaFunzione[], modello: (n: number) => string): string {
  const usati = new Set(casi.map((c) => c.name));
  let n = casi.length + 1;
  while (usati.has(modello(n))) n++;
  return modello(n);
}

/** Le voci di un caso nuovo di una procedura o di una funzione: una per parametro, nell'ordine della firma, senza testo
 * da scrivere; per un parametro vettore una voce per ogni elemento; per un parametro record una voce per campo,
 * nell'ordine dei campi, col nome del parametro (mai per ogni elemento: i campi hanno tipi diversi); per un parametro
 * tabella una voce per campo di ogni record, record dopo record. Un parametro per uscita nessuna (non si chiede: parte senza
 * valore), e così il programma principale. */
export function vociDelCasoNuovo(dati: readonly Dato[], records: readonly DefinizioneDelRecord[] = []): VoceDellaBozza[] {
  return dati
    .filter((d) => d.parameter !== undefined && d.parameter !== "out")
    .flatMap((d) => {
      const campi = d.type === "record" ? records.find((r) => r.name === d.record)?.fields : undefined;
      if (campi !== undefined) return Array.from({ length: (d.size ?? 1) * campi.length }, () => ({ dato: d.name, testo: "" }));
      return [{ dato: d.name, testo: "", ...(d.size !== undefined ? { ognuno: true as const } : {}) }];
    });
}
