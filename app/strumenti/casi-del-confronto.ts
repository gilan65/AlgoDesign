// Quali casi d'uso di un progetto si confrontano con un programma generato, e come dall'uscita di un programma nasce
// l'ottenuto. Li leggono il test differenziale (`differenziale.ts`, che fa girare i programmi nei processi) e la prova della
// pagina nel browser (`e2e/pagina-di-prova.e2e.ts`): un elenco solo, perché due invecchierebbero in disaccordo.
//
// Questo modulo non esegue nulla quando lo si carica, a differenza di `differenziale.ts`.
//
// Che cosa NON guarda: come si lancia un programma e come si leggono i suoi flussi; il confronto, che è `esitoDelCaso`.
import { margineDellOutput } from "../core/casi/esito";
import type { EsitoDelControllo } from "../core/controllo/controllo";
import { parametriDelCaso, type Riga } from "../core/genera/forma";
import type { VoceDelLinguaggio } from "../core/genera/linguaggi";
import { codiceDelMotivo } from "../core/genera/motivi";
import type { LinguaDelCodice } from "../core/genera/nomi";
import type { Atteso, CasoDiUnaFunzione, Funzione, Progetto } from "../core/progetto/modello";

/** Il controllo statico di un progetto della tappa: ha gli errori e gli avvisi. */
export type ControlloCheParte = Extract<EsitoDelControllo, { fuoriTappa: false }>;

/** I casi fuori dal differenziale, per nome del file (o `file#caso`), con la ragione. */
export const esclusi: Readonly<Record<string, string>> = {
  "intero-minimo-diviso-meno-uno": "overflow di un intero, che il C non definisce",
  "opposto-intero-minimo": "overflow di un intero, che il C non definisce",
  "overflow-fattoriale": "overflow di un intero, che il C non definisce",
  "divisione-per-zero": "divisione intera per zero, che il C non definisce",
  "indice-fuori": "indice fuori da un vettore, che il C non definisce",
  "indice-fuori-dalla-matrice": "indice fuori da una matrice, che il C non definisce",
  "reale-fuori-intervallo": "reale fuori intervallo convertito in intero, che il C non definisce",
  "reale-fuori-intervallo-parametro": "reale fuori intervallo convertito in intero, che il C non definisce",
  "reale-non-finito": "reale non finito, che l'interprete ferma per regola sua",
  "senza-valore-booleano": "dato letto senza valore, che il C non definisce",
  "senza-valore-carattere": "dato letto senza valore, che il C non definisce",
  "senza-valore-intero": "dato letto senza valore, che il C non definisce",
  "senza-valore-reale": "dato letto senza valore, che il C non definisce",
  "senza-valore-stringa": "dato letto senza valore, che il C non definisce",
  "troppi-passi": "tetto dei passi dell'interprete: il programma generato non finisce",
  "passi-fuori-dal-ciclo": "tetto dei passi dell'interprete in una ricorsione: il programma generato non lo ha",
  "sequenza-di-fibonacci#ventisei": "tetto dei passi dell'interprete in una ricorsione dentro un ciclo: il programma generato non lo ha",
  "riferimento-senza-valore-in-esecuzione": "dato senza valore passato per riferimento e letto, che il C non definisce",
  "uscita-letta-prima": "parametro per uscita letto senza valore, che il C non definisce",
  "uscita-con-valore-prima": "parametro per uscita letto prima di avere un valore: l'interprete lo fa partire senza valore e si ferma, il Python si ferma con UnboundLocalError, il C riceve il valore di chi chiama e lo scrive (divergenza voluta, con l'avviso del dato forse senza valore)",
  "uscita-non-assegnata": "parametro per uscita mai assegnato e letto dopo: l'interprete si ferma sul dato senza valore, il Python con UnboundLocalError, il C scrive il valore che il dato aveva prima (divergenza voluta, con l'avviso del dato forse senza valore)",
  "per-overflow-contatore": "overflow del contatore di un per, che il C non definisce",
  "copia-con-un-campo-senza-valore": "campo di un record letto senza valore nella copia, che il C non definisce",
  "riferimento-a-un-record-senza-valore#senza-valore": "record senza nessun campo con un valore passato per riferimento, che il C non definisce",
};

/** Perché una voce non sta in una riga, o niente. */
function vocePerUnaRiga(testo: string): string | undefined {
  if (testo.includes("\n")) return "ha un a capo";
  if (testo.includes("\r")) return "ha un ritorno carrello";
  if (/[\ud800-\udfff]/.test(testo.replace(/[\ud800-\udbff][\udc00-\udfff]/g, ""))) return "ha un surrogato isolato";
  return undefined;
}

/** Un caso di un progetto: si confronta con le sue righe di input, o è escluso, o non si può portare in un programma. */
export type CasoDelProgetto = { readonly id: string; readonly delCaso: string; readonly caso: CasoDiUnaFunzione; readonly funzione?: Funzione } & (
  | { readonly input: string[] }
  | { readonly escluso: string }
  | { readonly problema: string }
);

/** I casi del programma, poi quelli di ogni procedura o funzione eseguita da sola, col loro nome: `nome` è quello del file
 * nel corpus (`tappa-1/x`), `base` senza la cartella. */
export function casiDelProgetto(nome: string, base: string, p: Progetto): CasoDelProgetto[] {
  const casi: { id: string; caso: CasoDiUnaFunzione; funzione?: Funzione }[] = [
    ...(p.test_cases ?? []).map((caso) => ({ id: `${nome}#${caso.name}`, caso })),
    ...p.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ id: `${nome}#${f.name}/${caso.name}`, caso, funzione: f }))),
  ];
  return casi.map(({ id, caso, funzione }) => {
    const delCaso = `${base}#${caso.name}`;
    const comune = { id, delCaso, caso, ...(funzione !== undefined ? { funzione } : {}) };
    // Escluso il file intero, o il solo caso (`file#caso`, un caso del programma).
    const escluso = Object.hasOwn(esclusi, base) ? base : funzione === undefined && Object.hasOwn(esclusi, delCaso) ? delCaso : undefined;
    if (escluso !== undefined) return { ...comune, escluso: esclusi[escluso]! };
    let input: string[];
    if (funzione === undefined) input = caso.inputs.map((v) => v.text!);
    else {
      const letti = parametriDelCaso(funzione, caso, p.records);
      if ("problema" in letti) return { ...comune, problema: `${id}: ${letti.problema}, e il programma di prova non la porta` };
      input = letti.righe;
    }
    const senzaRiga = input.map((t, i) => [i, vocePerUnaRiga(t)] as const).filter(([, m]) => m !== undefined);
    if (senzaRiga.length > 0) return { ...comune, problema: `${id}: ${senzaRiga.map(([i, m]) => `la voce ${i + 1} ${m}`).join("; ")}, e una riga non la porta` };
    return { ...comune, input };
  });
}

/** Ciò che un programma ha lasciato, già come testo: l'uscita, lo standard output e lo standard error. */
export type UscitaDelProgramma = { readonly uscita: number | null; readonly tutto: string; readonly err: string };

/** L'ottenuto di un programma generato nella forma dell'atteso, o il motivo per cui non ha un esito. Con `tagliato`:
 * l'output è stato tenuto solo fino all'atteso più il margine. `pila` è il tetto delle chiamate del progetto, che il motivo
 * del tetto dice. */
export function ottenutoDaiTesti(f: UscitaDelProgramma, voce: VoceDelLinguaggio, righe: readonly Riga[], lingua: LinguaDelCodice, atteso: Atteso, controllo: ControlloCheParte, pila: number): { atteso: Atteso; tagliato: boolean } | { senzaEsito: string } {
  if (voce.genere !== "da-eseguire") throw new Error(`${voce.id} non è un linguaggio da eseguire`);
  const { tutto, err } = f;
  const tetto = atteso.output.length + margineDellOutput;
  const tagliato = tutto.length > tetto;
  // Il taglio non spezza un carattere fuori dal piano di base, come l'esecuzione.
  const fine = tagliato && /[\ud800-\udbff]/.test(tutto[tetto - 1] ?? "") ? tetto - 1 : tetto;
  const output = tagliato ? tutto.slice(0, fine) : tutto;
  const avvisi = { warnings: controllo.avvisi };
  if (f.uscita === 0 && err === "") return { atteso: { output, ...avvisi }, tagliato };
  const m = voce.rigaDErrore.exec(err);
  if (m === null || f.uscita !== 1) return { senzaEsito: `uscita ${f.uscita}, stderr ${JSON.stringify(err.slice(-300))}` };
  const code = codiceDelMotivo(lingua, m[2]!, voce.motivi(pila));
  if (code === undefined) return { senzaEsito: `motivo che la tabella dei motivi non conosce: ${JSON.stringify(m[2])}` };
  const block = righe[Number(m[1]) - 1]?.blocco;
  if (block === undefined) return { senzaEsito: `la riga ${m[1]} non viene da un blocco: ${JSON.stringify(righe[Number(m[1]) - 1]?.testo ?? "(oltre la fine)")}` };
  return { atteso: { output, error: { code, block }, ...avvisi }, tagliato };
}
