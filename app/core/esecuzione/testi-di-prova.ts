// Le parole della tabella di traccia nelle due lingue, per le prove del nucleo: scritte qui, non prese dai
// dizionari dell'interfaccia (le frasi sopra la tabella sono schemi brevi; quelle vere le prova
// `ui/esecuzione/tabella.test.tsx`).
import { nomiDegliOperatori } from "../../i18n/operatori";
import type { ParoleDeiCicli, ParoleDelleFunzioni } from "../disegno/impaginazione";
import { traduciEspressione } from "../disegno/lingua";
import type { Dato, Tipo } from "../progetto/modello";
import type { TestiDellaTraccia } from "./traccia";

/** Le parole dei cicli nel disegno, per le prove: anche quelle del disegno che non mostrano la tabella. */
export const cicliIt: ParoleDeiCicli = {
  per: "per {contatore} da {da} a {a}",
  perConPasso: "per {contatore} da {da} a {a} passo {passo}",
  perOgni: "per ogni {elemento} in {sorgente}",
  indice: "_indice",
  altroElemento: "c'è un altro elemento in {sorgente}",
  elementoSuccessivo: "elemento successivo di {sorgente}",
  copia: "copia elemento per elemento",
  copiaEspansa: "{assegnazione}: {copia}",
  copiaCampi: "copia campo per campo",
};

export const cicliEn: ParoleDeiCicli = {
  per: "for {contatore} from {da} to {a}",
  perConPasso: "for {contatore} from {da} to {a} step {passo}",
  perOgni: "for each {elemento} in {sorgente}",
  indice: "_index",
  altroElemento: "another element in {sorgente}",
  elementoSuccessivo: "next element of {sorgente}",
  copia: "copy element by element",
  copiaEspansa: "{assegnazione}: {copia}",
  copiaCampi: "copy field by field",
};

/** Il tipo del risultato nell'intestazione di una funzione, per le prove: come lo dice la vista dei dati
 * (`vettore di 3 interi`), senza la lunghezza massima di una stringa; le parole date, uno e molti per ogni tipo; un record
 * col suo nome, uguale al singolare e al plurale. */
function tipoDiProva(d: Dato, nomi: Readonly<Record<Tipo, readonly [string, string]>>, vettore: string): string {
  const [uno, molti] = d.type === "record" ? [d.record ?? "", d.record ?? ""] : nomi[d.type];
  return d.size === undefined ? uno : `${vettore} ${d.size} ${d.size === 1 ? uno : molti}`;
}

/** Le parole di procedure e funzioni nel disegno, per le prove. */
export const funzioniIt: ParoleDelleFunzioni = {
  procedura: "Procedura {nome}({parametri})",
  funzione: "Funzione {tipo} ← {nome}({parametri})",
  restituisce: "Restituisce {valore}",
  chiamata: "↪ {nome}({argomenti})",
  rif: "rif",
  out: "out",
  tipo: (d) => tipoDiProva(d, { integer: ["intero", "interi"], real: ["reale", "reali"], character: ["carattere", "caratteri"], string: ["stringa", "stringhe"], boolean: ["booleano", "booleani"] }, "vettore di"),
};

export const funzioniEn: ParoleDelleFunzioni = {
  procedura: "Procedure {nome}({parametri})",
  funzione: "Function {tipo} ← {nome}({parametri})",
  restituisce: "Returns {valore}",
  chiamata: "↪ {nome}({argomenti})",
  rif: "ref",
  out: "out",
  tipo: (d) => tipoDiProva(d, { integer: ["integer", "integers"], real: ["real", "reals"], character: ["character", "characters"], string: ["string", "strings"], boolean: ["boolean", "booleans"] }, "array of"),
};

export const testiIt: TestiDellaTraccia = {
  inizio: "Inizio",
  fine: "Fine",
  leggi: "leggi",
  scrivi: "scrivi",
  vero: "Vero",
  falso: "Falso",
  aCapo: " ↵",
  ogniElemento: "{valore} in ogni elemento",
  altri: "… altri {n}",
  espressione: (t) => traduciEspressione(t, nomiDegliOperatori.it),
  cicli: cicliIt,
  funzioni: funzioniIt,
  numero: "#",
  livello: "Livello",
  regola: "Regola",
  restituisce: "Restituisce",
  ripresa: "↩ ",
  restituito: "  ({funzione} → {valore})",
  condizione: "Condizione",
  scrive: "Scrive",
  nonInizializzata: "non inizializzata",
  letto: "← ",
  tipi: { integer: "intero", real: "reale", character: "carattere", string: "stringa", boolean: "booleano" },
  spiegazione: {
    primiEAltri: (nome, n, primi, colonna) => `${nome}: ${n}, i primi ${primi}, gli altri in ${colonna}.`,
    inFila: (nome, n) => `${nome}: ${n} in fila.`,
    perRiga: (nome, righe, colonne) => `${nome}: ${righe} × ${colonne} per riga.`,
    primeEAltre: (nome, righe, colonne, prime, colonna) => `${nome}: ${righe} × ${colonne}, le prime ${prime}, le altre in ${colonna}.`,
    matriceInFila: (nome, righe, colonne) => `${nome}: ${righe} × ${colonne} in fila.`,
    perRecord: (nome, record) => `${nome}: ${record} record per record.`,
    primiRecordEAltri: (nome, record, primi, colonna) => `${nome}: ${record} record, i primi ${primi}, gli altri in ${colonna}.`,
    perCampo: (nome, record) => `${nome}: ${record} record per campo.`,
    tabellaPrimiEAltri: (nome, record, valori, primi, colonna) => `${nome}: ${record} record, ${valori} valori, i primi ${primi}, gli altri in ${colonna}.`,
    csvUguale: "CSV uguale.",
    csvPerElemento: "CSV per elemento.",
  },
  valoriModificati: "Valori modificati",
  era: "era {valore}",
  eraDi: "{nome} era {valore}",
};

export const testiEn: TestiDellaTraccia = {
  inizio: "Start",
  fine: "End",
  leggi: "read",
  scrivi: "write",
  vero: "True",
  falso: "False",
  aCapo: " ↵",
  ogniElemento: "{valore} in every element",
  altri: "… {n} more",
  espressione: (t) => traduciEspressione(t, nomiDegliOperatori.en),
  cicli: cicliEn,
  funzioni: funzioniEn,
  numero: "#",
  livello: "Level",
  regola: "Rule",
  restituisce: "Returns",
  ripresa: "↩ ",
  restituito: "  ({funzione} → {valore})",
  condizione: "Condition",
  scrive: "Writes",
  nonInizializzata: "uninitialized",
  letto: "← ",
  tipi: { integer: "integer", real: "real", character: "character", string: "string", boolean: "boolean" },
  spiegazione: {
    primiEAltri: (nome, n, primi, colonna) => `${nome}: ${n}, first ${primi}, others in ${colonna}.`,
    inFila: (nome, n) => `${nome}: ${n} in a row.`,
    perRiga: (nome, righe, colonne) => `${nome}: ${righe} × ${colonne} per row.`,
    primeEAltre: (nome, righe, colonne, prime, colonna) => `${nome}: ${righe} × ${colonne}, first ${prime}, others in ${colonna}.`,
    matriceInFila: (nome, righe, colonne) => `${nome}: ${righe} × ${colonne} in a row.`,
    perRecord: (nome, record) => `${nome}: ${record} records per record.`,
    primiRecordEAltri: (nome, record, primi, colonna) => `${nome}: ${record} records, first ${primi}, others in ${colonna}.`,
    perCampo: (nome, record) => `${nome}: ${record} records per field.`,
    tabellaPrimiEAltri: (nome, record, valori, primi, colonna) => `${nome}: ${record} records, ${valori} values, first ${primi}, others in ${colonna}.`,
    csvUguale: "CSV same.",
    csvPerElemento: "CSV per element.",
  },
  valoriModificati: "Changed values",
  era: "was {valore}",
  eraDi: "{nome} was {valore}",
};
