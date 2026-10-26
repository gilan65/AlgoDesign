// Il C di un progetto: un programma C11 che compila senza avvisi con `-std=c11 -Wall -Wextra` (se ogni dato è usato,
// e fuori dai dati letti senza valore) e sui casi d'uso dà lo
// stesso output dell'interprete, nella lingua dell'interfaccia (i nomi delle funzioni di supporto, i commenti, i motivi
// d'errore: gli stessi del Python). Il carattere è un `int` col suo codice Unicode, la stringa un vettore di `char` in
// UTF-8 di 4 byte per carattere più il terminatore, contata in caratteri dalle funzioni di supporto (mai `strlen`).
// I comportamenti che il C non definisce non si controllano, e il commento in testa lo dice.
//
// La forma: il nome del progetto e la testa, le intestazioni che servono, la console di Windows in UTF-8 e senza `\r\n`
// (le due funzioni dichiarate qui: `windows.h` definirebbe parole come `min` e `near`), la contrazione dei reali spenta
// per clang (gcc con `-std=c11` non contrae, e il pragma lo fa avvisare), le costanti comuni a livello di file (`const`,
// coi nomi delle intestazioni riservati per loro, `nomiDelleIntestazioni`), i prototipi delle procedure e delle funzioni
// del progetto, quelli delle funzioni di supporto usate con le macro che passano la riga (`leggi_intero()` chiama
// `leggi_intero_alla_riga(__LINE__)`), `main` coi dati col valore iniziale e il ruolo in una colonna allineata, le
// regole, `return 0;`, poi le procedure e le funzioni del progetto nel suo ordine, poi le definizioni delle funzioni di
// supporto usate, in un ordine fisso.
//
// Procedure e funzioni: un parametro per riferimento è un puntatore (`int *a`, nella procedura `*a`,
// nella chiamata `&n`), un vettore o una stringa per riferimento passano come sono. Un vettore o una stringa senza *rif*
// arrivano come copia: la funzione chiamata la fa per prima cosa, dal parametro `_da_w` (`_from_w`) al dato `w`. Il dato
// senza valore passato per riferimento passa il suo indirizzo. Un parametro per uscita si passa come uno per riferimento:
// il C non sa farlo partire senza valore, e la differenza si vede solo leggendolo prima di dargli un valore, cosa che il
// codice non controlla (come ogni dato senza valore). L'indice di un elemento passato per riferimento, se non è
// un numero scritto, si calcola prima della chiamata in `_indice` (come nel Python), e due elementi dello stesso vettore
// con un indice calcolato passano da `elementi_diversi`. Una procedura finisce con la graffa, che porta la sua fine; una
// funzione col `return`.
//
// La ricorsione: le sole funzioni del giro (`funzioniDelGiro`) ricevono per primo `_riga`, la riga
// della chiamata, che ogni loro chiamata scrive con `__LINE__`; la loro prima istruzione conta la chiamata col suo
// spazio (`entra_nella_ricorsione`, lo spazio di `spazioDiUnaChiamata`) e si ferma oltre un tetto sulla riga ricevuta,
// l'ultima la toglie (`esci_dalla_ricorsione`), dopo il valore restituito: se il valore può far partire chiamate del giro
// (`funzioniVersoIlGiro`), si calcola prima in `_valore`. Ogni concatenazione ha l'area della lunghezza massima del suo risultato, il primo argomento
// di `concatena`: è lo spazio che il tetto conta.
//
// L'ordine degli arresti: il linguaggio calcola da sinistra a destra e un'operazione dopo i suoi operandi; il C non fissa
// l'ordine degli operandi né degli argomenti. Dove due parti della stessa operazione (gli operandi, gli argomenti di una
// chiamata) si possono fermare, quelle prima dell'ultima si mettono da parte in `_valore`, `_valore2` (dichiarati in
// testa alla funzione, uno per tipo e riusati da un'istruzione all'altra): in una riga prima dell'istruzione, oppure, nelle
// condizioni dei cicli e dopo `&&` e `||`, dove una riga prima non basta, con la virgola del C. Nella concatenazione il
// carattere di codice 0 si controlla dopo aver calcolato i due lati: un lato che si ferma si mette da parte se l'altro
// controlla il carattere 0. Gli argomenti di un salto che si fermano si mettono da parte se dopo di loro si ferma ancora
// qualcosa (un altro argomento, un indice, il controllo degli elementi).
//
// Le espressioni si riscrivono dall'albero con le precedenze del C, con le parentesi che servono e quelle che tolgono
// un avviso (un confronto o un `!` dentro un confronto, `&&` dentro `||`). Una scrittura è una `printf` coi testi fissi
// nel formato, spezzata prima di un valore che può fermare il programma (il flowchart scrive un valore alla volta) e
// intorno a un carattere, che si scrive con `scrivi_carattere`; una concatenazione si scrive a pezzi, uno per argomento,
// solo se al più un pezzo si può fermare, o se si fermano solo per il carattere 0. Una stringa si assegna con `strcpy`
// (con `memmove` dallo stesso dato, che può essere lo stesso elemento), con `al_piu` se il valore può superare la
// lunghezza massima. Il `per` è un `for` del C, che ricontrolla la fine a ogni giro; il `per ogni` un `for` con l'indice
// nascosto `_indice` (`_index`; dentro un altro `per ogni` `_indice2`, `_indice3`) fino alla dimensione del vettore o alla
// lunghezza della stringa, ricalcolata a ogni controllo, e l'elemento preso nella prima riga del corpo.
//
// La provenienza delle righe: la riga che porta il testo di un blocco ha quel blocco (la condizione del `ripeti` sta su
// `} while`; l'indice calcolato prima del valore o della chiamata, le parti messe da parte e il controllo degli elementi
// hanno una riga loro dello stesso blocco; una scrittura può avere più righe), la dichiarazione di un dato ha il dato (e
// la funzione, fuori dal programma principale), `return 0;` e la graffa che chiude una procedura hanno la fine, le altre
// righe nessuna. La riga del `for` di un `per` mostra le sue tre fasi; quella di un `per ogni` la partenza, il controllo
// e l'aumento della posizione, e la riga che prende l'elemento la sua fase.
//
// Il programma di prova di un caso di una procedura o di una funzione eseguita da sola (`prova`): al posto del
// programma principale un `main` che legge i parametri come letture (una riga per elemento, ognuna con la provenienza
// della funzione, il suo «Inizio»; quelli per uscita si dichiarano e non si leggono), chiama e scrive ciò che scrive
// l'esecuzione («→ » e il risultato, o l'a capo e «nome = valore» per ogni parametro per riferimento o per uscita); poi la
// funzione con quelle che chiama.
//
// Che cosa NON fa: controllare l'indice di un vettore, un intero oltre i 32 bit, la divisione per zero, il reale fuori
// dall'intervallo degli interi convertito in intero, il dato senza valore, il reale non finito; evitare gli avvisi di
// `-Wall` su un dato mai usato, o scritto e mai letto (il progetto non ne ha avviso: «senza avvisi» vale quando ogni
// dato è usato); accettare una riga dell'input di più di 255 byte per un numero, un carattere o un booleano; dare le
// ultime cifre di `elevato_a` dell'interprete con una potenza non esatta (`pow` della libreria del C).

import { chiamateDellaFunzione, chiamateIn, funzioniDelGiro, funzioniVersoIlGiro, lunghezzaPredefinita, type Tetti } from "../controllo/controllo";
import { lunghezzaMassima as lunghezzaMassimaNelNucleo } from "../controllo/lunghezza";
import { spazioDellaPila, spazioDiUnaChiamata, tettoDelleChiamate } from "../controllo/spazio";
import { analizza, type Espressione } from "../espressioni/analizzatore";
import type { FaseDelCiclo } from "../interprete/interprete";
import { opzioniPredefinite, type Blocco, type CasoDiUnaFunzione, type Dato, type Funzione as FunzioneDelProgetto, type Progetto, type Tipo } from "../progetto/modello";
import { genera, parametriDelCaso, type Generato, type Riga } from "./forma";
import { motiviCol } from "./motivi";
import {
  contatoriDellaRicorsione,
  indiceDelLivello,
  nomeDellaRiga,
  nomeDelRisultato,
  nomeDellaSorgente,
  nomeDelValore,
  nomiDelSupporto,
  nomiDelSupportoDelC,
  prefissoDellaCopia,
  seguitoDellArea,
  seguitoDellaRiga,
  strutturaDelRisultato,
  type FunzioneDelC,
  type FunzioneDiSupporto,
  type LinguaDelCodice,
} from "./nomi";
import type { NoteDeiDati, Prova } from "./python";

export function c(p: Progetto, limiti: Tetti, lingua: LinguaDelCodice, note: NoteDeiDati, prova?: Prova): Generato {
  return genera(p, limiti, (q) => righeDelC(q, lingua, note, prova));
}

const rientro = "    ";

type Funzione = FunzioneDiSupporto | FunzioneDelC;

/** L'ordine fisso delle funzioni di supporto del C. */
const ordine: readonly Funzione[] = [
  "preparaConsole", "fermati", "leggiRiga", "decodifica", "codifica", "leggiIntero", "leggiReale", "quanteCifre",
  "leggiCarattere", "leggiStringa", "leggiBooleano", "lunghezza", "carattereDi", "convertiACarattere", "convertiAVettore",
  "convertiAStringa", "nellaStringa", "concatena", "alPiu", "elementiDiversi", "scriviCarattere", "booleano",
  "entraNellaRicorsione", "esciDallaRicorsione",
];

/** Le funzioni di supporto che ognuna chiama, e le intestazioni che legge. */
const chiama: Partial<Record<Funzione, readonly Funzione[]>> = {
  leggiRiga: ["fermati", "decodifica"],
  leggiIntero: ["leggiRiga", "fermati", "quanteCifre"],
  leggiReale: ["leggiRiga", "fermati", "quanteCifre"],
  leggiCarattere: ["leggiRiga", "fermati", "decodifica"],
  leggiStringa: ["leggiRiga", "fermati", "lunghezza"],
  leggiBooleano: ["leggiRiga", "fermati"],
  carattereDi: ["fermati", "lunghezza", "decodifica"],
  convertiACarattere: ["fermati"],
  convertiAVettore: ["fermati", "lunghezza", "decodifica"],
  convertiAStringa: ["fermati", "codifica"],
  nellaStringa: ["fermati", "codifica"],
  alPiu: ["fermati", "lunghezza"],
  elementiDiversi: ["fermati"],
  scriviCarattere: ["codifica"],
  entraNellaRicorsione: ["fermati"],
};
const intestazioniDi: Partial<Record<Funzione, readonly string[]>> = {
  fermati: ["stdlib.h"],
  leggiIntero: ["limits.h", "stdlib.h"],
  leggiReale: ["math.h", "stdlib.h"],
  leggiStringa: ["string.h"],
  leggiBooleano: ["stdbool.h", "string.h"],
  concatena: ["string.h"],
  booleano: ["stdbool.h"],
};

const testi = {
  it: {
    generato: "Programma principale generato da AlgoDesign dal flowchart e dalla vista dei dati.",
    nonControllati: [
      "Non controlla i calcoli che il C lascia senza regola (un intero oltre i 32 bit, la divisione intera per zero,",
      "un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto",
      "prima di avere un valore) né un reale che diventa infinito o non è un numero: li ferma l'esecuzione in",
      "AlgoDesign.",
    ],
    costantiComuni: "Costanti comuni",
    delProgetto: "Procedure e funzioni: sono dopo il programma principale.",
    prototipi: "Funzioni di supporto: sono in fondo al file.",
    supporto: "/* ---- Funzioni di supporto --------------------------------------------------------------- */",
    codice: "codice",
  },
  en: {
    generato: "Main program generated by AlgoDesign from the flowchart and the data view.",
    nonControllati: [
      "It does not check the calculations that C leaves without a rule (an integer beyond 32 bits, an integer division",
      "by zero, an index outside the array, a real outside the integer range converted to an integer, a data item read",
      "before it has a value) nor a real that becomes infinite or not a number: AlgoDesign stops them when it runs the",
      "flowchart.",
    ],
    costantiComuni: "Shared constants",
    delProgetto: "Procedures and functions: they are after the main program.",
    prototipi: "Support functions: they are at the end of the file.",
    supporto: "/* ---- Support functions ------------------------------------------------------------------- */",
    codice: "codepage",
  },
} as const;

// ------------------------------------------------------------------------------------------------ i letterali

/** Un codice dentro un letterale del C fra `apice`: le sequenze del linguaggio, i caratteri di controllo in ottale a
 * tre cifre (un'ottale non si allunga sul carattere che segue, un'esadecimale sì). */
function nelLetterale(codice: number, apice: string): string {
  const c = String.fromCodePoint(codice);
  if (c === "\\" || c === apice) return `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (codice < 0x20 || codice === 0x7f) return `\\${codice.toString(8).padStart(3, "0")}`;
  return c;
}

/** Il testo fra virgolette di una stringa del C; nel formato di una `printf` anche `%` raddoppiato. Un punto
 * interrogativo dopo un altro diventa `\?`: con `-std=c11` gcc legge i trigrammi (`??!` sarebbe `|`). */
function dentroLeVirgolette(codici: readonly number[], formato: boolean): string {
  let t = "";
  let prima = 0;
  for (const c of codici) {
    t += c === 0x3f && prima === 0x3f ? "\\?" : formato && c === 0x25 ? "%%" : nelLetterale(c, '"');
    prima = c;
  }
  return t;
}
const letteraleStringa = (codici: readonly number[]) => `"${dentroLeVirgolette(codici, false)}"`;
const codiciDi = (t: string) => Array.from(t, (x) => x.codePointAt(0)!);

/** Un carattere: fra apici se è ASCII stampabile (o a capo, o tabulazione), altrimenti il suo codice col carattere,
 * se si vede, e la sua scrittura Unicode in un commento. */
function letteraleCarattere(codice: number): string {
  if ((codice >= 0x20 && codice < 0x7f) || codice === 10 || codice === 9) return `'${nelLetterale(codice, "'")}'`;
  const c = String.fromCodePoint(codice);
  const u = `U+${codice.toString(16).toUpperCase().padStart(4, "0")}`;
  return /^[\p{L}\p{N}\p{P}\p{S}]$/u.test(c) ? `${codice} /* ${c} ${u} */` : `${codice} /* ${u} */`;
}

/** Un reale dal suo valore: le cifre più corte che lo rileggono uguale, con il punto se mancano. */
function letteraleReale(x: number): string {
  const t = String(x);
  return /[.e]/.test(t) ? t : `${t}.0`;
}

/** Un testo in un commento del C, che non lo chiuda né ne apra un altro. */
const inCommento = (t: string) => t.split("*/").join("* /").split("/*").join("/ *");

// ------------------------------------------------------------------------------------------- il programma

function righeDelC(p: Progetto, lingua: LinguaDelCodice, note: NoteDeiDati, prova: Prova | undefined): Riga[] {
  const n = { ...nomiDelSupporto[lingua], ...nomiDelSupportoDelC[lingua] } as Readonly<Record<Funzione, string>>;
  const w = testi[lingua];
  const main = p.functions.find((f) => f.kind === "main")!;
  const comuni = p.shared_constants ?? [];
  const perNome = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  const parametriDi = (f: FunzioneDelProgetto) => f.data.filter((d) => d.parameter !== undefined);
  const decimali = p.options?.real_decimals ?? opzioniPredefinite.real_decimals;
  const riempimento = (p.options?.fill_character ?? opzioniPredefinite.fill_character).codePointAt(0)!;
  const tetto = tettoDelleChiamate(p);

  const usate = new Set<Funzione>(["preparaConsole"]);
  const intestazioni = new Set<string>(["stdio.h"]);
  let reali = false;
  /** Le funzioni del giro (quelle che richiamano sé stesse, anche attraverso altre): ricevono per primo `_riga`, la riga
   * della chiamata, e contano le chiamate in corso e lo spazio dei loro dati. */
  const delGiro = funzioniDelGiro(p);
  const nelGiro = (nome: string) => delGiro.has(perNome.get(nome)!);
  const parametroDellaRiga = nomeDellaRiga[lingua];
  const usa = (f: Funzione): string => {
    usate.add(f);
    return n[f];
  };
  const albero = (testo: string): Espressione => {
    const a = analizza(testo);
    // Il controllo statico ha già provato sintassi e tipi: qui non ci sono errori.
    if (!a.ok) throw new Error(`espressione non analizzabile dopo il controllo: ${testo}`);
    return a.espressione;
  };

  /** I dati della funzione che si scrive, con le costanti comuni; i parametri per riferimento che sono puntatori. */
  let dati = new Map<string, Dato>();
  let puntatori = new Set<string>();
  /** Le funzioni del progetto che possono fermare il programma, per nome: si scrivono prima quelle chiamate. Quelle del
   * giro possono sempre (i tetti della ricorsione), e si sa prima di scriverle: in un giro non si può scrivere prima chi
   * è chiamato. */
  const fermano = new Map<string, boolean>([...delGiro].map((f) => [f.name!, true]));
  /** Se la funzione che si scrive può fermare il programma. */
  let fermaLaFunzione = false;

  // ------------------------------------------------------------------------------------------- i tipi

  /** Un vettore intero: il nome di un vettore, o una funzione che lo restituisce. */
  const vettore = (e: Espressione) =>
    e.genere === "nome" ? dati.get(e.nome)!.size !== undefined : e.genere === "chiamata" && perNome.get(e.nome)!.return_size !== undefined;
  /** Una funzione che restituisce un vettore o una stringa: il C li restituisce in una struttura, col campo `v` o `s`. */
  const conStruttura = (f: FunzioneDelProgetto) => f.kind === "function" && (f.return_size !== undefined || f.return_type === "string");
  const campo = (f: FunzioneDelProgetto) => (f.return_size !== undefined ? ".v" : ".s");
  /** Il risultato di una funzione come un dato: il tipo, e la dimensione e la lunghezza massima che ha. */
  const comeDato = (f: FunzioneDelProgetto): Dato => ({
    name: "",
    type: f.return_type!,
    ...(f.return_size !== undefined ? { size: f.return_size } : {}),
    ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}),
  });
  function tipo(e: Espressione): Tipo {
    switch (e.genere) {
      case "intero":
        return "integer";
      case "reale":
      case "pi":
        return "real";
      case "carattere":
        return "character";
      case "stringa":
        return "string";
      case "booleano":
        return "boolean";
      case "nome":
        return dati.get(e.nome)!.type;
      case "indice":
        return vettore(e.base) ? tipo(e.base) : "character";
      case "chiamata":
        return perNome.get(e.nome)!.return_type!;
      case "unario":
        switch (e.operatore) {
          case "-":
          case "absolute_value":
          case "not":
            return tipo(e.operando);
          case "to_integer":
          case "length":
            return "integer";
          case "to_character":
            return "character";
          case "to_string":
            return "string";
          default:
            return "real";
        }
      case "binario": {
        // I tipi dei due lati una volta sola: con un'espressione annidata, ricalcolarli sarebbe esponenziale.
        const op = e.operatore;
        if (op !== "+" && op !== "-" && op !== "*" && op !== "/") return op === "mod" ? "integer" : op === "raised_to" ? "real" : "boolean";
        const [s, d] = [tipo(e.sinistro), tipo(e.destro)];
        if (op === "+" && (s === "string" || d === "string")) return "string";
        return s === "integer" && d === "integer" ? "integer" : "real";
      }
    }
  }

  /** La lunghezza massima che una stringa può avere. */
  const lunghezzaMassima = (e: Espressione): number => lunghezzaMassimaNelNucleo(e, (n) => dati.get(n), (n) => perNome.get(n));

  /** Un carattere che può essere quello di codice 0: un dato, un elemento di un vettore, una conversione da intero, ciò
   * che una funzione restituisce. Un letterale non lo è (sarebbe un errore statico), e nemmeno un carattere preso da una
   * stringa. */
  function puoEssereZero(e: Espressione): boolean {
    if (e.genere === "nome" || e.genere === "chiamata") return true;
    if (e.genere === "indice") return vettore(e.base);
    if (e.genere === "unario" && e.operatore === "to_character") return tipo(e.operando) === "integer" || puoEssereZero(e.operando);
    return false;
  }

  // ------------------------------------------------------------------------- le parti messe da parte

  /** I dati del generatore che tengono una parte messa da parte nella funzione che si scrive (`_valore`, `_valore2`), col
   * tipo del C; quelli già presi dall'istruzione che si scrive. */
  let temporanee: { nome: string; tipo: string }[] = [];
  const prese = new Set<string>();
  /** Le righe prima dell'istruzione che si scrive; `null` dove una riga prima non basta (si usa la virgola). */
  let prima: string[] | null = null;
  const tipoDelC = (t: Tipo) => {
    if (t === "boolean") intestazioni.add("stdbool.h");
    if (t === "real") reali = true;
    return { integer: "int", real: "double", character: "int", string: "const char *", boolean: "bool" }[t];
  };
  /** Un dato del generatore libero in questa istruzione, di quel tipo (del C: anche la struttura di un risultato). */
  const temporanea = (t: Tipo): string => temporaneaDelC(tipoDelC(t));
  const temporaneaDelC = (tc: string): string => {
    let x = temporanee.find((v) => v.tipo === tc && !prese.has(v.nome));
    if (x === undefined) {
      const k = temporanee.length + 1;
      x = { nome: k === 1 ? nomeDelValore[lingua] : `${nomeDelValore[lingua]}${k}`, tipo: tc };
      temporanee.push(x);
    }
    prese.add(x.nome);
    return x.nome;
  };
  const dichiarazioneDi = (x: { nome: string; tipo: string }) => `${rientro}${x.tipo}${x.tipo.endsWith("*") ? "" : " "}${x.nome};`;
  /** Le strutture delle funzioni percorse dai `per ogni` della funzione che si scrive, una per ciclo: `_sorgente`,
   * `_sorgente2`. A differenza delle parti messe da parte non si riusano, perché il ciclo le legge fino alla fine. */
  let sorgenti: { nome: string; tipo: string }[] = [];
  const sorgenteNuova = (tc: string): string => {
    const k = sorgenti.length + 1;
    const nome = k === 1 ? nomeDellaSorgente[lingua] : `${nomeDellaSorgente[lingua]}${k}`;
    sorgenti.push({ nome, tipo: tc });
    return nome;
  };

  /** Il testo del C e la forza con cui tiene il suo operatore (più alta, più stretta): 16 un operando, una chiamata o
   * un indice; 14 il meno, `!`, `*` di un puntatore e la conversione; 13 `*`, `/`, `%`; 12 `+` e `-`; 10 `<` `<=` `>`
   * `>=`; 9 `==` e `!=`; 5 `&&`; 4 `||`. */
  type Testo = { readonly t: string; readonly forza: number; readonly struttura?: Struttura };
  /** Il vettore o la stringa di una struttura restituita da una chiamata, che esiste solo fino alla fine
   * dell'istruzione: la struttura (`tipo`), la chiamata e il campo; `dentro`, il testo intorno al campo (`al_piu`). Messa
   * da parte, va in un dato del generatore di quel tipo, e il testo prende il campo da lì. */
  type Struttura = { readonly tipo: string; readonly chiamata: string; readonly campo: string; readonly dentro: (x: string) => string };
  const operando = (t: string): Testo => ({ t, forza: 16 });
  const chiamata = (f: string, ...argomenti: string[]): Testo => operando(`${f}(${argomenti.join(", ")})`);
  const fra = (x: Testo, forza: number) => (x.forza < forza ? `(${x.t})` : x.t);
  /** Dice se il calcolo può fermare il programma per una regola del linguaggio (una funzione di supporto, o una
   * funzione del progetto che può). */
  let ferma = false;
  const fermaQui = () => {
    ferma = true;
    fermaLaFunzione = true;
  };
  const conArresto = (f: Funzione, ...argomenti: string[]): Testo => {
    fermaQui();
    return chiamata(usa(f), ...argomenti);
  };
  const conIntestazione = (h: string, f: string, ...argomenti: string[]): Testo => {
    intestazioni.add(h);
    return chiamata(f, ...argomenti);
  };
  const booleanoLetterale = (v: boolean) => {
    intestazioni.add("stdbool.h");
    return v ? "true" : "false";
  };

  /** Una parte calcolata a sé: il testo, se si può fermare, le righe prima che ha prodotto. */
  type Parte = { readonly x: Testo; readonly ferma: boolean; readonly righe: readonly string[] };
  const aSe = (calcolo: () => Testo): Parte => {
    const salvato = { ferma, prima };
    ferma = false;
    if (prima !== null) prima = [];
    const x = calcolo();
    const p: Parte = { x, ferma, righe: prima ?? [] };
    ferma = salvato.ferma || ferma;
    prima = salvato.prima;
    return p;
  };
  /** Le parti di un'operazione, nell'ordine in cui il linguaggio le calcola: quelle che vanno messe da parte (`daParte`)
   * diventano un dato del generatore, in una riga prima o con la virgola. Restituisce i testi da usare e il modo di
   * avvolgere l'operazione (la virgola, se serve). */
  const inOrdine = (parti: readonly { parte: Parte; tipo: Tipo; daParte: boolean }[]): { testi: Testo[]; avvolgi: (x: Testo) => Testo } => {
    const virgola: string[] = [];
    const metti = (nome: string, valore: string) => (prima !== null ? prima.push(`${nome} = ${valore};`) : virgola.push(`${nome} = ${valore}`));
    const testi = parti.map(({ parte, tipo: t, daParte }) => {
      prima?.push(...parte.righe);
      if (!daParte) return parte.x;
      const s = parte.x.struttura;
      if (s === undefined) {
        const nome = temporanea(t);
        metti(nome, parte.x.t);
        return operando(nome);
      }
      // La struttura intera, che resta fino alla riga dopo; poi il controllo intorno al campo, se c'è.
      const nome = temporaneaDelC(s.tipo);
      metti(nome, s.chiamata);
      const preso = `${nome}${s.campo}`;
      if (s.dentro(preso) === preso) return operando(preso);
      const controllato = temporanea("string");
      metti(controllato, s.dentro(preso));
      return operando(controllato);
    });
    return { testi, avvolgi: (x) => (virgola.length === 0 ? x : operando(`(${[...virgola, x.t].join(", ")})`)) };
  };
  /** Le parti che si possono fermare, tranne l'ultima, vanno messe da parte. */
  const tranneLUltima = (parti: readonly Parte[]): boolean[] => {
    const ultima = parti.map((x) => x.ferma).lastIndexOf(true);
    return parti.map((x, k) => x.ferma && k < ultima);
  };
  /** Un calcolo dove una riga prima non basta (la condizione di un ciclo, ciò che sta dopo `&&` e `||`). */
  const senzaRighePrima = <T>(calcolo: () => T): T => {
    const salvato = prima;
    prima = null;
    const x = calcolo();
    prima = salvato;
    return x;
  };

  // ------------------------------------------------------------------------------------- le espressioni

  function espressione(e: Espressione): Testo {
    if (tipo(e) === "real") reali = true;
    switch (e.genere) {
      case "intero":
        return operando(String(e.valore));
      case "reale":
        return operando(letteraleReale(e.valore));
      case "carattere":
        return operando(letteraleCarattere(e.codice));
      case "stringa":
        return operando(letteraleStringa(e.codici));
      case "booleano":
        return operando(booleanoLetterale(e.valore));
      case "pi":
        return operando("3.141592653589793");
      case "nome":
        return puntatori.has(e.nome) ? { t: `*${e.nome}`, forza: 14 } : operando(e.nome);
      case "indice": {
        if (e.base.genere === "nome" && vettore(e.base)) return operando(`${e.base.nome}[${espressione(e.indice).t}]`);
        // Il carattere di una stringa, o l'elemento del vettore restituito da una funzione: prima la chiamata, poi
        // l'indice.
        const parti = [aSe(() => espressione(e.base)), aSe(() => espressione(e.indice))];
        const daParte = tranneLUltima(parti);
        const { testi, avvolgi } = inOrdine(parti.map((parte, k) => ({ parte, tipo: k === 0 ? "string" : "integer", daParte: daParte[k]! })));
        if (vettore(e.base)) return avvolgi(operando(`${testi[0]!.t}[${testi[1]!.t}]`));
        return avvolgi(conArresto("carattereDi", testi[0]!.t, testi[1]!.t));
      }
      case "chiamata": {
        // Gli argomenti di una funzione sono per valore: ognuno come un valore dato al suo parametro.
        const g = perNome.get(e.nome)!;
        const parametri = parametriDi(g);
        const parti = e.argomenti.map((a, k) => aSe(() => nelDato(a, parametri[k]!)));
        const daParte = tranneLUltima(parti);
        const { testi, avvolgi } = inOrdine(parti.map((parte, k) => ({ parte, tipo: parametri[k]!.type, daParte: daParte[k]! })));
        if (fermano.get(e.nome) === true) fermaQui();
        // Una funzione del giro riceve per prima la riga della chiamata.
        const x = avvolgi(chiamata(e.nome, ...(nelGiro(e.nome) ? ["__LINE__"] : []), ...testi.map((y) => y.t)));
        if (!conStruttura(g)) return x;
        return { t: `${x.t}${campo(g)}`, forza: 16, struttura: { tipo: strutturaDelRisultato(lingua, e.nome), chiamata: x.t, campo: campo(g), dentro: (y) => y } };
      }
      case "unario":
        return unario(e.operatore, e.operando);
      case "binario":
        return binario(e);
    }
  }

  /** Un valore che va in un parametro: una stringa che può superare la lunghezza massima del parametro passa dal
   * controllo (un intero in un reale lo converte il C). */
  function nelDato(e: Espressione, verso: Pick<Dato, "type" | "size" | "max_length">): Testo {
    const x = espressione(e);
    const massima = verso.max_length ?? lunghezzaPredefinita;
    if (!(verso.type === "string" && verso.size === undefined && lunghezzaMassima(e) > massima)) return x;
    const controllato = conArresto("alPiu", x.t, String(massima));
    const s = x.struttura;
    return s === undefined ? controllato : { ...controllato, struttura: { ...s, dentro: (y) => chiamata(n.alPiu, s.dentro(y), String(massima)).t } };
  }

  function unario(op: string, o: Espressione): Testo {
    const x = espressione(o);
    const t = tipo(o);
    const conversione = (verso: string) => ({ t: `(${verso})${fra(x, 14)}`, forza: 14 });
    switch (op) {
      case "-":
        // Un meno davanti a un meno va fra parentesi: `--` è un altro operatore.
        return { t: `-${x.forza < 14 || x.t.startsWith("-") ? `(${x.t})` : x.t}`, forza: 14 };
      case "not":
        return { t: `!${fra(x, 14)}`, forza: 14 };
      case "to_integer":
        return t === "real" ? conversione("int") : x;
      case "to_real":
        return t === "integer" ? conversione("double") : x;
      case "to_character":
        return t === "integer" ? conArresto("convertiACarattere", x.t) : x;
      case "length":
        return chiamata(usa("lunghezza"), x.t);
      case "absolute_value":
        return t === "integer" ? conIntestazione("stdlib.h", "abs", x.t) : conIntestazione("math.h", "fabs", x.t);
      case "square_root":
        return conIntestazione("math.h", "sqrt", x.t);
      case "round":
        return conIntestazione("math.h", "round", x.t);
      case "round_down":
        return conIntestazione("math.h", "floor", x.t);
      case "round_up":
        return conIntestazione("math.h", "ceil", x.t);
      case "integer_part":
        return conIntestazione("math.h", "trunc", x.t);
      default:
        // `to_array` e `to_string` sono solo il lato destro intero di un'assegnazione (`blocco`).
        throw new Error(`operatore fuori dal controllo: ${op}`);
    }
  }

  const confronti: Readonly<Record<string, number>> = { "<": 10, "<=": 10, ">": 10, ">=": 10, "==": 9, "!=": 9 };

  function binario(e: Extract<Espressione, { genere: "binario" }>): Testo {
    const op = e.operatore;
    if (op === "and" || op === "or") {
      // Il lato destro si calcola solo a volte: lì una riga prima non basta.
      const l = espressione(e.sinistro);
      const r = senzaRighePrima(() => espressione(e.destro));
      const forza = op === "and" ? 5 : 4;
      // `&&` dentro `||` va fra parentesi: gcc avvisa.
      const lato = (x: Testo) => (op === "or" && x.forza === 5 ? `(${x.t})` : fra(x, forza));
      return { t: `${lato(l)} ${op === "and" ? "&&" : "||"} ${lato(r)}`, forza };
    }
    if (op === "+" && tipo(e) === "string") {
      // La concatenazione: un carattere entra con `nella_stringa`, che rifiuta quello di codice 0 dopo il calcolo dei
      // due lati. Il primo argomento è la lunghezza massima del suo risultato: l'area che `concatena` gli dà, la stessa
      // che lo spazio di una chiamata conta (`spazioDiUnaChiamata`).
      const zero = (x: Espressione) => tipo(x) === "character" && puoEssereZero(x);
      const l = aSe(() => espressione(e.sinistro));
      const r = aSe(() => espressione(e.destro));
      const { testi, avvolgi } = inOrdine([
        { parte: l, tipo: tipo(e.sinistro), daParte: l.ferma && (r.ferma || zero(e.destro)) },
        { parte: r, tipo: tipo(e.destro), daParte: r.ferma && zero(e.sinistro) },
      ]);
      const lato = (x: Testo, s: Espressione) => {
        if (tipo(s) !== "character") return x.t;
        if (zero(s)) fermaQui();
        return chiamata(usa("nellaStringa"), x.t).t;
      };
      return avvolgi(chiamata(usa("concatena"), String(lunghezzaMassima(e)), lato(testi[0]!, e.sinistro), lato(testi[1]!, e.destro)));
    }
    const parti = [aSe(() => espressione(e.sinistro)), aSe(() => espressione(e.destro))];
    const daParte = tranneLUltima(parti);
    const { testi, avvolgi } = inOrdine(parti.map((parte, k) => ({ parte, tipo: tipo(k === 0 ? e.sinistro : e.destro), daParte: daParte[k]! })));
    const [l, r] = testi as [Testo, Testo];
    if (op === "raised_to") return avvolgi(conIntestazione("math.h", "pow", l.t, r.t));
    if (op in confronti) {
      const forza = confronti[op]!;
      // Fra due stringhe confronta `strcmp`, che lavora sui byte senza segno: in UTF-8 è l'ordine dei codici.
      if (tipo(e.sinistro) === "string") return avvolgi({ t: `${conIntestazione("string.h", "strcmp", l.t, r.t).t} ${op} 0`, forza });
      // Un confronto o un `!` dentro un confronto vanno fra parentesi: si legge meglio, e un compilatore avvisa.
      const lato = (x: Testo, s: Espressione) => ((s.genere === "binario" && s.operatore in confronti) || (s.genere === "unario" && s.operatore === "not") ? `(${x.t})` : fra(x, forza + 1));
      return avvolgi({ t: `${lato(l, e.sinistro)} ${op} ${lato(r, e.destro)}`, forza });
    }
    const forza = op === "+" || op === "-" ? 12 : 13;
    return avvolgi({ t: `${fra(l, forza)} ${op === "mod" ? "%" : op} ${fra(r, forza + 1)}`, forza });
  }

  // ---------------------------------------------------------------------------------------- le dichiarazioni

  const tipoDelDato = (d: Dato) => {
    if (d.type === "boolean") intestazioni.add("stdbool.h");
    if (d.type === "real") reali = true;
    return { integer: "int", real: "double", character: "int", string: "char", boolean: "bool" }[d.type];
  };
  /** Le dimensioni di un dato dopo il nome: quella del vettore e quella della stringa. */
  const forma = (d: Dato) => `${d.size === undefined ? "" : `[${d.size}]`}${d.type === "string" ? `[4 * ${d.max_length ?? lunghezzaPredefinita} + 1]` : ""}`;
  /** Un valore che in tutti gli elementi è quello che il C mette da sé dopo il primo: `{0}` li dice tutti. */
  const zero = (e: Espressione) =>
    (e.genere === "intero" && e.valore === 0) || (e.genere === "reale" && Object.is(e.valore, 0)) || (e.genere === "booleano" && !e.valore) || (e.genere === "stringa" && e.codici.length === 0);
  const valoreIniziale = (d: Dato): string | undefined => {
    const v = d.initial;
    if (v === undefined) return undefined;
    if (typeof v === "string") return espressione(albero(v)).t;
    if (Array.isArray(v)) return `{${(v as readonly string[]).map((x) => espressione(albero(x)).t).join(", ")}}`;
    const ogni = albero((v as { readonly each: string }).each);
    const t = espressione(ogni).t;
    return zero(ogni) ? `{${t}}` : `{${Array<string>(d.size!).fill(t).join(", ")}}`;
  };

  /** Le dichiarazioni, con la colonna dei commenti allineata sulle righe che ne hanno uno; `funzione`, quella che le
   * possiede fuori dal programma principale. */
  const dichiara = (elenco: readonly Dato[], davanti: string, conNota: boolean, funzione?: string): Riga[] => {
    const voci = elenco.map((d) => {
      const v = valoreIniziale(d);
      const nota = conNota && d.constant !== true && d.role !== undefined ? note.ruoli[d.role] : "";
      return { d, testo: `${davanti}${d.constant === true ? "const " : ""}${tipoDelDato(d)} ${d.name}${forma(d)}${v === undefined ? "" : ` = ${v}`};`, nota };
    });
    const larghezza = (t: string) => Array.from(t).length;
    const colonna = Math.max(0, ...voci.filter((x) => x.nota !== "").map((x) => larghezza(x.testo)));
    return voci.map(({ d, testo, nota }) => ({
      testo: nota === "" ? testo : `${testo}${" ".repeat(colonna - larghezza(testo))}  /* ${nota} */`,
      dato: d.name,
      ...(funzione !== undefined ? { funzione } : {}),
    }));
  };

  // --------------------------------------------------------------------------------------------- le regole

  let corpo: Riga[] = [];
  const struttura = (testo: string) => corpo.push({ testo });
  /** Quanti cicli `per ogni` contengono la regola che si scrive: l'indice di un ciclo, o quello calcolato prima del
   * valore, è quello del livello dopo. Gli indici dichiarati sono quelli fino al livello più alto usato. */
  let cicliPerOgni = 0;
  let indici = 0;
  const indice = (k = 1) => {
    indici = Math.max(indici, cicliPerOgni + k);
    return indiceDelLivello(lingua, cicliPerOgni + k);
  };

  /** Un'istruzione: le parti che mette da parte diventano righe del blocco prima di lei. */
  function calcola<T>(r: string, id: string, calcolo: () => T): T {
    prima = [];
    prese.clear();
    const x = calcolo();
    for (const t of prima) corpo.push({ testo: `${r}${t}`, blocco: id });
    prima = null;
    return x;
  }

  /** Una destinazione e il valore che riceve. L'indice si calcola prima del valore, come nel flowchart: se il suo
   * calcolo può fermare il programma va prima in un nome suo, perché in C i due lati non hanno un ordine. */
  function assegna(r: string, id: string, bersaglio: string, istruzione: (destinazione: string, d: Dato) => string) {
    const e = albero(bersaglio);
    if (e.genere === "nome") {
      const destinazione = puntatori.has(e.nome) ? `*${e.nome}` : e.nome;
      const testo = calcola(r, id, () => istruzione(destinazione, dati.get(e.nome)!));
      corpo.push({ testo: `${r}${testo}`, blocco: id });
      return;
    }
    const nome = (e as { base: { nome: string } }).base.nome;
    let fermaLIndice = false;
    let i = calcola(r, id, () => {
      ferma = false;
      const t = espressione((e as { indice: Espressione }).indice).t;
      fermaLIndice = ferma;
      return t;
    });
    if (fermaLIndice) {
      const primaDelValore = indice();
      corpo.push({ testo: `${r}${primaDelValore} = ${i};`, blocco: id });
      i = primaDelValore;
    }
    const testo = calcola(r, id, () => istruzione(`${nome}[${i}]`, dati.get(nome)!));
    corpo.push({ testo: `${r}${testo}`, blocco: id });
  }

  const baseDi = (e: Espressione) => (e.genere === "nome" ? e.nome : e.genere === "indice" && e.base.genere === "nome" ? e.base.nome : undefined);

  /** Un valore in un dato: una stringa si copia (con `memmove` dallo stesso dato, che può essere lo stesso elemento). */
  const valoreNelDato = (v: Espressione, destinazione: string, d: Dato): string => {
    if (d.type !== "string") return `${destinazione} = ${espressione(v).t};`;
    intestazioni.add("string.h");
    const x = espressione(v).t;
    if (baseDi(v) === d.name) return `memmove(${destinazione}, ${x}, strlen(${x}) + 1);`;
    const massima = d.max_length ?? lunghezzaPredefinita;
    return lunghezzaMassima(v) > massima ? `strcpy(${destinazione}, ${conArresto("alPiu", x, String(massima)).t});` : `strcpy(${destinazione}, ${x});`;
  };

  /** Un elemento in quello di un altro vettore: una stringa si copia, col controllo se può essere più lunga di quella che
   * la riceve (con `memmove` dallo stesso vettore, dove è lo stesso elemento). */
  const elementoInElemento = (destinazione: string, sorgente: string, d: Dato, lunghezzaDellaSorgente: number, stesso: boolean): string => {
    if (d.type !== "string") return `${destinazione} = ${sorgente};`;
    if (stesso) return `memmove(${destinazione}, ${sorgente}, strlen(${sorgente}) + 1);`;
    const massima = d.max_length ?? lunghezzaPredefinita;
    return lunghezzaDellaSorgente > massima ? `strcpy(${destinazione}, ${conArresto("alPiu", sorgente, String(massima)).t});` : `strcpy(${destinazione}, ${sorgente});`;
  };

  /**
   * Un vettore intero in `destinazione` (un dato, o il risultato nella sua struttura), `d` com'è: dal nome di un vettore o
   * da una funzione che lo restituisce. Con `conFasi`, dal nome la copia elemento per elemento, un ciclo con le fasi del
   * `mentre` equivalente (la riga del `for` la partenza, il controllo e l'aumento; quella della copia l'elemento). Senza,
   * `memcpy` se gli elementi hanno la stessa misura (`grandezza`, il `sizeof` della destinazione), altrimenti il ciclo
   * (stringhe di lunghezza diversa), dopo aver messo da parte la struttura di una funzione, che si chiama una volta.
   */
  function vettoreIn(r: string, id: string, destinazione: string, grandezza: string, d: Dato, v: Espressione, conFasi: boolean) {
    intestazioni.add("string.h");
    const g = v.genere === "chiamata" ? perNome.get(v.nome)! : undefined;
    const lunghezzaDellaSorgente = (g === undefined ? dati.get((v as { nome: string }).nome)!.max_length : g.return_max_length) ?? lunghezzaPredefinita;
    const stessaMisura = d.type !== "string" || (d.max_length ?? lunghezzaPredefinita) === lunghezzaDellaSorgente;
    const fasi = (...f: FaseDelCiclo[]) => (conFasi ? { fasi: f } : {});
    let sorgente: string;
    if (g === undefined) sorgente = (v as { nome: string }).nome;
    else {
      // La struttura restituita: intera nella destinazione, o messa da parte per il ciclo.
      let messa = "";
      const x = calcola(r, id, () => {
        const t = espressione(v);
        if (!stessaMisura) messa = temporaneaDelC(t.struttura!.tipo);
        return t;
      });
      if (stessaMisura) {
        corpo.push({ testo: `${r}memcpy(${destinazione}, ${x.t}, ${grandezza});`, blocco: id });
        return;
      }
      corpo.push({ testo: `${r}${messa} = ${x.struttura!.chiamata};`, blocco: id });
      sorgente = `${messa}${x.struttura!.campo}`;
    }
    if (!conFasi && stessaMisura) {
      corpo.push({ testo: `${r}memcpy(${destinazione}, ${sorgente}, ${grandezza});`, blocco: id });
      return;
    }
    const i = indice();
    corpo.push({ testo: `${r}for (${i} = 0; ${i} < ${d.size}; ${i}++)`, blocco: id, ...fasi("inizio", "condizione", "passo") });
    const copia = calcola(r, id, () => elementoInElemento(`${destinazione}[${i}]`, `${sorgente}[${i}]`, d, lunghezzaDellaSorgente, sorgente === destinazione));
    corpo.push({ testo: `${r}${rientro}${copia}`, blocco: id, ...fasi("elemento") });
  }

  const leggi = (destinazione: string, d: Dato): string => {
    switch (d.type) {
      case "integer":
        return `${destinazione} = ${usa("leggiIntero")}();`;
      case "real":
        return `${destinazione} = ${usa("leggiReale")}();`;
      case "character":
        return `${destinazione} = ${usa("leggiCarattere")}();`;
      case "string":
        return `${usa("leggiStringa")}(${destinazione}, ${d.max_length ?? lunghezzaPredefinita});`;
      case "boolean":
        return `${destinazione} = ${usa("leggiBooleano")}();`;
    }
  };

  /** Una voce di una scrittura: testo fisso, un valore con la sua specifica, o un carattere da scrivere a sé. */
  type NelFormato = { readonly codici: readonly number[] } | { readonly specifica: string; readonly argomento: string };
  type Voce = NelFormato | { readonly carattere: string };
  /** I pezzi di una concatenazione, in ordine. */
  const pezzi = (e: Espressione): Espressione[] =>
    e.genere === "binario" && e.operatore === "+" && tipo(e) === "string" ? [...pezzi(e.sinistro), ...pezzi(e.destro)] : [e];
  /** Un valore come lo scrive una scrittura, con la sua specifica. */
  const specifica = (t: Tipo) => (t === "integer" ? "%d" : t === "real" ? `%.${decimali}f` : "%s");
  function voci(e: Espressione): Voce[] {
    const t = tipo(e);
    if (e.genere === "stringa") return [{ codici: e.codici }];
    if (e.genere === "carattere") return [{ codici: [e.codice] }];
    if (e.genere === "booleano") return [{ codici: codiciDi(e.valore ? "true" : "false") }];
    if (t === "string" && e.genere === "binario") {
      // A pezzi, se l'ordine in cui la printf li calcola non conta: al più un pezzo si ferma, o tutti solo per il
      // carattere 0 (lo stesso motivo); altrimenti la concatenazione intera, e la prova a pezzi non lascia nulla.
      const salvato = { temporanee: temporanee.length, prese: [...prese], usate: [...usate] };
      const pz = pezzi(e).map((x) => {
        const zero = tipo(x) === "character" && puoEssereZero(x);
        const parte = aSe(() => (tipo(x) === "character" ? chiamata(usa("nellaStringa"), espressione(x).t) : espressione(x)));
        return { x, parte, zero };
      });
      const valori = pz.filter((q) => q.parte.ferma).length;
      if (valori === 0 || (valori === 1 && !pz.some((q) => q.zero))) {
        if (pz.some((q) => q.zero)) fermaQui();
        return pz.flatMap(({ x, parte }): Voce[] => {
          prima?.push(...parte.righe);
          return x.genere === "stringa" ? [{ codici: x.codici }] : x.genere === "carattere" ? [{ codici: [x.codice] }] : [{ specifica: "%s", argomento: parte.x.t }];
        });
      }
      temporanee.length = salvato.temporanee;
      prese.clear();
      salvato.prese.forEach((x) => prese.add(x));
      usate.clear();
      salvato.usate.forEach((x) => usate.add(x));
      return [{ specifica: "%s", argomento: espressione(e).t }];
    }
    if (t === "character") return [{ carattere: espressione(e).t }];
    if (t === "boolean") return [{ specifica: "%s", argomento: chiamata(usa("booleano"), espressione(e).t).t }];
    return [{ specifica: specifica(t), argomento: espressione(e).t }];
  }

  /** Le righe di una scrittura: le `printf`, e `scrivi_carattere` per un carattere. */
  function scrivi(r: string, id: string, valori: readonly string[], aCapo: boolean) {
    const da = corpo.length;
    let formato: NelFormato[] | undefined;
    const chiudi = () => {
      if (formato === undefined) return;
      let t = "";
      const argomenti: string[] = [];
      let testo: number[] = [];
      for (const v of formato) {
        if ("codici" in v) testo.push(...v.codici);
        else {
          t += dentroLeVirgolette(testo, true) + v.specifica;
          testo = [];
          argomenti.push(v.argomento);
        }
      }
      t += dentroLeVirgolette(testo, true);
      if (t !== "") corpo.push({ testo: `${r}printf("${t}"${argomenti.map((a) => `, ${a}`).join("")});`, blocco: id });
      formato = undefined;
    };
    for (const v of valori) {
      prima = [];
      prese.clear();
      ferma = false;
      const elenco = voci(albero(v));
      // Un valore che può fermare il programma comincia una printf nuova: quelli prima restano scritti, poi le sue parti
      // messe da parte.
      if (ferma) chiudi();
      for (const t of prima) corpo.push({ testo: `${r}${t}`, blocco: id });
      prima = null;
      for (const x of elenco) {
        if ("carattere" in x) {
          chiudi();
          corpo.push({ testo: `${r}${usa("scriviCarattere")}(${x.carattere});`, blocco: id });
        } else (formato ??= []).push(x);
      }
    }
    if (aCapo) (formato ??= []).push({ codici: [10] });
    chiudi();
    // Una scrittura del solo testo vuoto: una riga che non scrive nulla (`printf("")` farebbe avvisare gcc).
    if (corpo.length === da) corpo.push({ testo: `${r}printf("%s", "");`, blocco: id });
  }

  /** Il salto a una procedura: le righe prima della chiamata (gli argomenti messi da parte, gli indici degli elementi
   * per riferimento, il controllo degli elementi dello stesso vettore), poi la chiamata. */
  function salto(r: string, b: Extract<Blocco, { kind: "call" }>) {
    const parametri = parametriDi(perNome.get(b.callee)!);
    prima = [];
    prese.clear();
    type Argomento =
      | { readonly genere: "valore"; readonly parte: Parte; readonly tipo: Tipo }
      | { readonly genere: "nome"; readonly testo: string }
      | { readonly genere: "elemento"; readonly vettore: string; readonly indice: Parte; readonly scritto: boolean; readonly indirizzo: boolean };
    const argomenti: Argomento[] = b.arguments.map((testo, k) => {
      const d = parametri[k]!;
      const a = albero(testo);
      if (d.parameter === "value") return { genere: "valore", parte: aSe(() => nelDato(a, d)), tipo: d.type };
      if (a.genere === "nome") {
        const suo = dati.get(a.nome)!;
        const comeE = suo.size !== undefined || suo.type === "string" || puntatori.has(a.nome);
        return { genere: "nome", testo: comeE ? a.nome : `&${a.nome}` };
      }
      const nome = (a as { base: { nome: string } }).base.nome;
      const i = (a as { indice: Espressione }).indice;
      return { genere: "elemento", vettore: nome, indice: aSe(() => espressione(i)), scritto: i.genere === "intero", indirizzo: dati.get(nome)!.type !== "string" };
    });
    // Due elementi dello stesso vettore, con un indice calcolato: il controllo dopo tutti gli argomenti.
    const perVettore = new Map<string, number[]>();
    argomenti.forEach((a, k) => a.genere === "elemento" && perVettore.set(a.vettore, [...(perVettore.get(a.vettore) ?? []), k]));
    const controlli = [...perVettore.values()].filter((ks) => ks.length > 1 && ks.some((k) => !(argomenti[k] as { scritto: boolean }).scritto));
    // Ciò che si può fermare, in ordine: un argomento che si ferma si mette da parte se dopo di lui si ferma ancora
    // qualcosa (un altro argomento, un indice, il controllo).
    const siFerma = argomenti.map((a) => (a.genere === "valore" ? a.parte.ferma : a.genere === "elemento" ? a.indice.ferma : false));
    const ultima = controlli.length > 0 ? argomenti.length : siFerma.lastIndexOf(true);
    const passati: string[] = [];
    const nomiDegliIndici: string[] = [];
    let indiciDelSalto = 0;
    argomenti.forEach((a, k) => {
      if (a.genere === "nome") return passati.push(a.testo);
      if (a.genere === "valore") {
        const { testi } = inOrdine([{ parte: a.parte, tipo: a.tipo, daParte: a.parte.ferma && k < ultima }]);
        return passati.push(testi[0]!.t);
      }
      prima!.push(...a.indice.righe);
      let i = a.indice.x.t;
      if (!a.scritto) {
        const nome = indice(++indiciDelSalto);
        prima!.push(`${nome} = ${i};`);
        i = nome;
      }
      nomiDegliIndici[k] = i;
      return passati.push(`${a.indirizzo ? "&" : ""}${a.vettore}[${i}]`);
    });
    for (const ks of controlli) prima!.push(`${usa("elementiDiversi")}(${ks.map((k) => nomiDegliIndici[k]!).join(", ")});`);
    for (const t of prima!) corpo.push({ testo: `${r}${t}`, blocco: b.id });
    prima = null;
    if (fermano.get(b.callee) === true) fermaLaFunzione = true;
    corpo.push({ testo: `${r}${b.callee}(${[...(nelGiro(b.callee) ? ["__LINE__"] : []), ...passati].join(", ")});`, blocco: b.id });
  }

  const sequenza = (bs: readonly Blocco[], livello: number) => {
    for (const b of bs) blocco(b, livello);
  };
  /** La condizione di un ciclo, un'istruzione a sé dove una riga prima non basta. */
  const nelCiclo = (condizione: string): string => {
    prese.clear();
    return senzaRighePrima(() => espressione(albero(condizione)).t);
  };

  function blocco(b: Blocco, livello: number) {
    const r = rientro.repeat(livello);
    const riga = (testo: string) => corpo.push({ testo: r + testo, blocco: b.id });
    switch (b.kind) {
      case "assignment": {
        const v = albero(b.value);
        if (v.genere === "unario" && v.operatore === "to_array") {
          const d = dati.get((albero(b.target) as { nome: string }).nome)!;
          return riga(calcola(r, b.id, () => `${conArresto("convertiAVettore", d.name, String(d.size), espressione(v.operando).t).t};`));
        }
        if (v.genere === "unario" && v.operatore === "to_string") {
          // Il nome di un vettore di caratteri, o la funzione che lo restituisce.
          const o = v.operando;
          const dimensione = o.genere === "nome" ? dati.get(o.nome)!.size! : perNome.get((o as { nome: string }).nome)!.return_size!;
          return assegna(r, b.id, b.target, (destinazione, d) => {
            const sorgente = espressione(o).t;
            return `${conArresto("convertiAStringa", destinazione, String(d.max_length ?? lunghezzaPredefinita), sorgente, String(dimensione)).t};`;
          });
        }
        const t = albero(b.target);
        if (t.genere === "nome" && dati.get(t.nome)!.size !== undefined) {
          // Un vettore intero: un parametro per riferimento o per uscita è un puntatore, che non sa la sua grandezza.
          const d = dati.get(t.nome)!;
          const grandezza = d.parameter === undefined || d.parameter === "value" ? `sizeof ${t.nome}` : `${d.size} * sizeof ${t.nome}[0]`;
          return vettoreIn(r, b.id, t.nome, grandezza, d, v, v.genere === "nome");
        }
        return assegna(r, b.id, b.target, (destinazione, d) => valoreNelDato(v, destinazione, d));
      }
      case "read":
        return assegna(r, b.id, b.target, leggi);
      case "write":
        return scrivi(r, b.id, b.values, b.newline);
      case "if":
        riga(`if (${calcola(r, b.id, () => espressione(albero(b.condition)).t)}) {`);
        sequenza(b.then, livello + 1);
        if (b.else.length > 0) {
          struttura(`${r}} else {`);
          sequenza(b.else, livello + 1);
        }
        struttura(`${r}}`);
        return;
      case "while":
        // La condizione si ricalcola a ogni controllo: le parti messe da parte con la virgola.
        riga(`while (${nelCiclo(b.condition)}) {`);
        sequenza(b.body, livello + 1);
        struttura(`${r}}`);
        return;
      case "repeat":
        struttura(`${r}do {`);
        sequenza(b.body, livello + 1);
        riga(`} while (${nelCiclo(b.condition)});`);
        return;
      case "for": {
        // Il `for` del C è il `mentre` equivalente: ricalcola la fine a ogni controllo.
        const nome = (albero(b.counter) as { nome: string }).nome;
        const contatore = puntatori.has(nome) ? `(*${nome})` : nome;
        const passo = b.step ?? 1;
        const aumento = passo === 1 ? `${contatore}++` : passo === -1 ? `${contatore}--` : `${contatore} ${passo > 0 ? "+=" : "-="} ${Math.abs(passo)}`;
        const da = calcola(r, b.id, () => espressione(albero(b.from)).t);
        const controllo = `${contatore} ${passo > 0 ? "<=" : ">="} ${fra(senzaRighePrima(() => espressione(albero(b.to))), 11)}`;
        corpo.push({ testo: `${r}for (${contatore} = ${da}; ${controllo}; ${aumento}) {`, blocco: b.id, fasi: ["inizio", "condizione", "passo"] });
        sequenza(b.body, livello + 1);
        struttura(`${r}}`);
        return;
      }
      case "for_each": {
        // Un indice nascosto fino alla dimensione del vettore, o alla lunghezza della stringa ricalcolata a ogni
        // controllo; l'elemento si prende nella prima riga del corpo.
        const nomeDellElemento = (albero(b.item) as { nome: string }).nome;
        const elemento = dati.get(nomeDellElemento)!;
        const destinazione = puntatori.has(nomeDellElemento) ? `*${nomeDellElemento}` : nomeDellElemento;
        // Il nome di un vettore o di una stringa; una funzione si chiama una volta, alla partenza, e la sua struttura sta
        // in `_sorgente`.
        const s = albero(b.source);
        let sorgente: Dato;
        let percorsa: string;
        if (s.genere === "nome") {
          sorgente = dati.get(s.nome)!;
          percorsa = s.nome;
        } else {
          const g = perNome.get((s as { nome: string }).nome)!;
          sorgente = comeDato(g);
          const da = corpo.length;
          const x = calcola(r, b.id, () => espressione(s));
          const nome = sorgenteNuova(x.struttura!.tipo);
          for (let k = da; k < corpo.length; k++) corpo[k] = { ...corpo[k]!, fasi: ["inizio"] };
          corpo.push({ testo: `${r}${nome} = ${x.struttura!.chiamata};`, blocco: b.id, fasi: ["inizio"] });
          percorsa = `${nome}${x.struttura!.campo}`;
        }
        const i = indice();
        cicliPerOgni++;
        const fine = sorgente.size !== undefined ? String(sorgente.size) : `${usa("lunghezza")}(${percorsa})`;
        corpo.push({ testo: `${r}for (${i} = 0; ${i} < ${fine}; ${i}++) {`, blocco: b.id, fasi: ["inizio", "condizione", "passo"] });
        let preso: string;
        if (sorgente.size === undefined) preso = `${destinazione} = ${conArresto("carattereDi", percorsa, i).t};`;
        else if (elemento.type !== "string") preso = `${destinazione} = ${percorsa}[${i}];`;
        else {
          // Un elemento stringa si copia; se può essere più lungo del dato che lo riceve passa dal controllo.
          intestazioni.add("string.h");
          const massima = elemento.max_length ?? lunghezzaPredefinita;
          const x = `${percorsa}[${i}]`;
          preso = `strcpy(${elemento.name}, ${(sorgente.max_length ?? lunghezzaPredefinita) > massima ? conArresto("alPiu", x, String(massima)).t : x});`;
        }
        corpo.push({ testo: `${r}${rientro}${preso}`, blocco: b.id, fasi: ["elemento"] });
        sequenza(b.body, livello + 1);
        struttura(`${r}}`);
        cicliPerOgni--;
        return;
      }
      case "call":
        return salto(r, b);
      case "comment":
        for (const t of b.text.split(/\r\n|\r|\n/)) riga(t === "" ? "/* */" : `/* ${inCommento(t)} */`);
        return;
    }
  }

  // ---------------------------------------------------------------------------------------- le funzioni

  /** Il parametro come lo riceve il C: un puntatore se è per riferimento (un vettore o una stringa come sono), e col
   * nome della copia davanti se è un vettore o una stringa senza *rif*. */
  const copiato = (d: Dato) => d.parameter === "value" && (d.size !== undefined || d.type === "string");
  const parametroDelC = (d: Dato): string => {
    const t = tipoDelDato(d);
    if (d.parameter !== "value") return d.size === undefined && d.type !== "string" ? `${t} *${d.name}` : `${t} ${d.name}${forma(d)}`;
    if (!copiato(d)) return `${t} ${d.name}`;
    const nome = `${prefissoDellaCopia[lingua]}${d.name}`;
    return d.size === undefined ? `const char *${nome}` : `const ${t} ${nome}${forma(d)}`;
  };
  const restituito = (f: FunzioneDelProgetto) => (f.kind !== "function" ? "void" : conStruttura(f) ? strutturaDelRisultato(lingua, f.name!) : tipoDelC(f.return_type!));
  const intestazioneDi = (f: FunzioneDelProgetto) =>
    `${restituito(f)} ${f.name}(${[...(delGiro.has(f) ? [`int ${parametroDellaRiga}`] : []), ...parametriDi(f).map(parametroDelC)].join(", ") || "void"})`;
  /** Le due righe di una funzione del giro: all'inizio conta la chiamata col suo spazio (e si ferma oltre un tetto,
   * sulla riga della chiamata), alla fine la toglie. Lo spazio è quello del nucleo, mai ricalcolato. */
  const entrata = (f: FunzioneDelProgetto): Riga[] =>
    delGiro.has(f) ? [{ testo: `${rientro}${usa("entraNellaRicorsione")}(${parametroDellaRiga}, ${spazioDiUnaChiamata(f, p)});` }] : [];
  const uscita = (f: FunzioneDelProgetto): Riga[] => (delGiro.has(f) ? [{ testo: `${rientro}${usa("esciDallaRicorsione")}(${spazioDiUnaChiamata(f, p)});` }] : []);
  /** Se un'espressione può far partire chiamate del giro: chiama una funzione del giro, o una da cui ci si arriva. */
  const versoIlGiro = funzioniVersoIlGiro(p);
  const chiamaIlGiro = (e: Espressione) => chiamateIn(e).some((nome) => versoIlGiro.has(perNome.get(nome)!));
  /** La struttura che porta il vettore o la stringa restituiti, prima del prototipo della funzione. */
  const definizioneDellaStruttura = (f: FunzioneDelProgetto) => {
    const d = comeDato(f);
    return `${strutturaDelRisultato(lingua, f.name!)} { ${tipoDelDato(d)} ${campo(f).slice(1)}${forma(d)}; };`;
  };

  /** La fine di una funzione: il valore restituito; un vettore o una stringa nella struttura `_risultato`, con le righe
   * della fine, poi `return`. In una funzione del giro la riga d'uscita sta subito prima del `return`, dopo il calcolo
   * del valore: se il valore può far partire chiamate del giro, si calcola prima in `_valore`. */
  function fineDellaFunzione(f: FunzioneDelProgetto): Riga[] {
    const id = f.end.id;
    const e = albero(f.end.return_value!);
    if (!conStruttura(f)) {
      const x = calcola(rientro, id, () => nelDato(e, { type: f.return_type! }).t);
      if (!(delGiro.has(f) && chiamaIlGiro(e))) return [...uscita(f), { testo: `${rientro}return ${x};`, blocco: id }];
      const v = temporanea(f.return_type!);
      return [{ testo: `${rientro}${v} = ${x};`, blocco: id }, ...uscita(f), { testo: `${rientro}return ${v};`, blocco: id }];
    }
    const risultato = nomeDelRisultato[lingua];
    const d = comeDato(f);
    if (f.return_size !== undefined) vettoreIn(rientro, id, `${risultato}.v`, `sizeof ${risultato}.v`, d, e, false);
    else corpo.push({ testo: `${rientro}${calcola(rientro, id, () => valoreNelDato(e, `${risultato}.s`, d))}`, blocco: id });
    return [...uscita(f), { testo: `${rientro}return ${risultato};`, blocco: id }];
  }

  /** Il corpo di una funzione: le dichiarazioni (le copie, i dati, gli indici, le sorgenti dei `per ogni`, le parti
   * messe da parte e il risultato), la riga vuota, le righe d'apertura e le regole. */
  function corpoDi(f: FunzioneDelProgetto, apertura: readonly Riga[], fine: () => Riga[]): Riga[] {
    corpo = [];
    cicliPerOgni = 0;
    indici = 0;
    temporanee = [];
    sorgenti = [];
    sequenza(f.body, 1);
    const finali = fine();
    const parametri = parametriDi(f);
    const copie = parametri.filter(copiato);
    const dichiarazioniDelleCopie = copie.map((d) => ({ testo: `${rientro}${tipoDelDato(d)} ${d.name}${forma(d)};` }));
    const dichiarazioni = dichiara(
      f.data.filter((d) => d.parameter === undefined),
      rientro,
      true,
      f.kind === "main" ? undefined : f.id,
    );
    const indiciDichiarati = Array.from({ length: indici }, (_, k) => ({ testo: `${rientro}int ${indiceDelLivello(lingua, k + 1)};` }));
    const risultato = conStruttura(f) ? [{ testo: dichiarazioneDi({ nome: nomeDelRisultato[lingua], tipo: strutturaDelRisultato(lingua, f.name!) }) }] : [];
    const tutte = [
      ...dichiarazioniDelleCopie,
      ...dichiarazioni,
      ...indiciDichiarati,
      ...[...sorgenti, ...temporanee].map((x) => ({ testo: dichiarazioneDi(x) })),
      ...risultato,
    ];
    const righeDelleCopie = copie.map((d) => {
      intestazioni.add("string.h");
      const da = `${prefissoDellaCopia[lingua]}${d.name}`;
      return { testo: d.size === undefined ? `${rientro}strcpy(${d.name}, ${da});` : `${rientro}memcpy(${d.name}, ${da}, sizeof ${d.name});` };
    });
    return [...tutte, ...(tutte.length > 0 ? [{ testo: "" }] : []), ...apertura, ...righeDelleCopie, ...corpo, ...finali];
  }

  /** Le righe di una procedura o di una funzione del progetto, o del programma principale. */
  function scriviFunzione(f: FunzioneDelProgetto): Riga[] {
    dati = new Map<string, Dato>([...comuni, ...f.data].map((d) => [d.name, d]));
    puntatori = new Set(parametriDi(f).filter((d) => d.parameter !== "value" && d.size === undefined && d.type !== "string").map((d) => d.name));
    fermaLaFunzione = delGiro.has(f);
    const righe =
      f.kind === "main"
        ? [
            { testo: "int main(void) {" },
            ...corpoDi(f, [{ testo: `${rientro}${n.preparaConsole}();` }], () => [{ testo: `${rientro}return 0;`, blocco: f.end.id }]),
            { testo: "}" },
          ]
        : f.kind === "function"
          ? [
              { testo: `${intestazioneDi(f)} {` },
              ...corpoDi(f, entrata(f), () => fineDellaFunzione(f)),
              { testo: "}" },
            ]
          : [{ testo: `${intestazioneDi(f)} {` }, ...corpoDi(f, entrata(f), () => uscita(f)), { testo: "}", blocco: f.end.id }];
    if (f.name !== undefined) fermano.set(f.name, fermaLaFunzione);
    return righe;
  }

  /** Il programma principale del programma di prova: legge i parametri, chiama, scrive il risultato. */
  function scriviLaProva(f: FunzioneDelProgetto, caso: CasoDiUnaFunzione): Riga[] {
    const letti = parametriDelCaso(f, caso);
    if ("problema" in letti) throw new Error(`il caso ${caso.name} non ha un programma di prova: ${letti.problema}`);
    dati = new Map<string, Dato>([...comuni, ...f.data].map((d) => [d.name, d]));
    puntatori = new Set();
    temporanee = [];
    prese.clear();
    const dichiarazioni: Riga[] = letti.parametri.map(({ dato: d }) => ({ testo: `${rientro}${tipoDelDato(d)} ${d.name}${forma(d)};` }));
    const righe: Riga[] = [{ testo: `${rientro}${n.preparaConsole}();` }];
    const parametri = parametriDi(f);
    // Una funzione del giro riceve la riga della chiamata: la sua prima chiamata si può fermare per lo spazio, e la riga
    // che la chiama ha la provenienza della funzione, come le letture dei parametri (l'esecuzione si ferma lì).
    const chiamataDiF = `${f.name}(${[
      ...(delGiro.has(f) ? ["__LINE__"] : []),
      ...parametri.map((d) => (d.parameter !== "value" && d.size === undefined && d.type !== "string" ? `&${d.name}` : d.name)),
    ].join(", ")})`;
    const scrittura = (testo: string) => righe.push({ testo: `${rientro}${testo}`, ...(delGiro.has(f) && testo.includes(chiamataDiF) ? { blocco: f.id } : {}) });
    for (const { dato: d, elementi, ognuno } of letti.parametri) {
      if (d.size === undefined) {
        if (elementi[0] === "riga") righe.push({ testo: `${rientro}${leggi(d.name, d)}`, blocco: f.id });
        continue;
      }
      elementi.forEach((x, i) => x === "riga" && righe.push({ testo: `${rientro}${leggi(`${d.name}[${i}]`, d)}`, blocco: f.id }));
      if (ognuno && elementi[0] === "riga")
        for (let i = 1; i < d.size; i++) scrittura(d.type === "string" ? `strcpy(${d.name}[${i}], ${d.name}[0]);` : `${d.name}[${i}] = ${d.name}[0];`);
    }
    /** Un valore scritto come lo scrive l'esecuzione, dopo un testo fisso. */
    const scriviValore = (davanti: string, x: string, t: Tipo) => {
      const fisso = dentroLeVirgolette(codiciDi(davanti), true);
      if (t === "character") {
        scrittura(`printf("${fisso}");`);
        scrittura(`${usa("scriviCarattere")}(${x});`);
        scrittura('printf("\\n");');
      } else scrittura(`printf("${fisso}${specifica(t)}\\n", ${t === "boolean" ? chiamata(usa("booleano"), x).t : x});`);
    };
    const risultato: Riga[] = [];
    if (f.kind === "function") {
      const t = f.return_type!;
      if (t === "boolean") intestazioni.add("stdbool.h");
      if (t === "real") reali = true;
      if (f.return_size !== undefined) {
        // La funzione si chiama una volta, poi una riga per elemento: se si ferma, nulla è scritto.
        const nome = nomeDelRisultato[lingua];
        risultato.push({ testo: dichiarazioneDi({ nome, tipo: strutturaDelRisultato(lingua, f.name!) }) });
        scrittura(`${nome} = ${chiamataDiF};`);
        for (let i = 0; i < f.return_size; i++) scriviValore(`→ [${i}] = `, `${nome}.v[${i}]`, t);
      } else if (t === "string") scriviValore("→ ", `${chiamataDiF}.s`, t);
      else if (t === "character") {
        // Il risultato prima del testo: se la funzione si ferma, nulla è scritto.
        const nome = temporanea(t);
        scrittura(`${nome} = ${chiamataDiF};`);
        scriviValore("→ ", nome, t);
      } else scriviValore("→ ", chiamataDiF, t);
    } else {
      scrittura(`${chiamataDiF};`);
      const riferimenti = parametri.filter((d) => d.parameter !== "value");
      if (riferimenti.length > 0) scrittura('printf("\\n");');
      for (const d of riferimenti)
        for (const nome of d.size === undefined ? [d.name] : [...Array(d.size).keys()].map((i) => `${d.name}[${i}]`)) scriviValore(`${nome} = `, nome, d.type);
    }
    const tutte = [...dichiarazioni, ...temporanee.map((x) => ({ testo: dichiarazioneDi(x) })), ...risultato];
    return [{ testo: "int main(void) {" }, ...tutte, ...(tutte.length > 0 ? [{ testo: "" }] : []), ...righe, { testo: `${rientro}return 0;` }, { testo: "}" }];
  }

  // Le funzioni del programma: tutte, anche quelle che nessuno chiama ancora (si vedono nel codice come nello
  // pseudocodice), o nel programma di prova quella eseguita da sola con quelle che chiama. Si scrivono prima le
  // chiamate, per sapere quali possono fermare il programma; in un giro ognuna si visita una volta, e le funzioni del
  // giro si sanno fermare da prima (`fermano`).
  const radice = prova === undefined ? main : p.functions.find((f) => f.id === prova.funzione)!;
  const chiamate = (f: FunzioneDelProgetto) => [...new Set(chiamateDellaFunzione(f).flatMap((x) => x.nomi))].map((x) => perNome.get(x)!);
  const inOrdineDiChiamata: FunzioneDelProgetto[] = [];
  const viste = new Set<FunzioneDelProgetto>();
  const visita = (f: FunzioneDelProgetto) => {
    if (viste.has(f)) return;
    viste.add(f);
    chiamate(f).forEach(visita);
    inOrdineDiChiamata.push(f);
  };
  visita(radice);
  if (prova === undefined) p.functions.forEach(visita);
  const scritte = new Map<FunzioneDelProgetto, Riga[]>();
  for (const f of inOrdineDiChiamata) if (prova === undefined || f !== main) scritte.set(f, scriviFunzione(f));
  const delProgetto = p.functions.filter((f) => f.kind !== "main" && scritte.has(f));
  const principale = prova === undefined ? scritte.get(main)! : scriviLaProva(radice, prova.caso);
  dati = new Map<string, Dato>(comuni.map((d) => [d.name, d]));
  const costanti = dichiara(comuni, "", false);

  // --------------------------------------------------------------------------------------- l'insieme

  // Le funzioni usate, con quelle che chiamano, e le loro intestazioni.
  for (let cresce = true; cresce; ) {
    cresce = false;
    for (const f of [...usate])
      for (const g of chiama[f] ?? [])
        if (!usate.has(g)) {
          usate.add(g);
          cresce = true;
        }
  }
  for (const f of usate) for (const h of intestazioniDi[f] ?? []) intestazioni.add(h);
  const funzioni = ordine.filter((f) => usate.has(f));

  // Le strutture dei risultati prima della testa: un booleano vuole la sua intestazione.
  const strutture = new Map(delProgetto.filter(conStruttura).map((f) => [f, definizioneDellaStruttura(f)]));
  const nome = inCommento(p.metadata.name.split(/\r\n|\r|\n/).join(" "));
  const righe: Riga[] = [
    { testo: `/* ${nome}` },
    { testo: ` * ${w.generato}` },
    ...w.nonControllati.map((t, i) => ({ testo: ` * ${t}${i === w.nonControllati.length - 1 ? " */" : ""}` })),
    ...[...intestazioni].sort().map((h) => ({ testo: `#include <${h}>` })),
    { testo: "#ifdef _WIN32" },
    { testo: "#include <fcntl.h>" },
    { testo: "#include <io.h>" },
    { testo: `int __stdcall SetConsoleOutputCP(unsigned int ${w.codice});` },
    { testo: `int __stdcall SetConsoleCP(unsigned int ${w.codice});` },
    { testo: "#endif" },
  ];
  if (reali) righe.push({ testo: "#ifdef __clang__" }, { testo: "#pragma STDC FP_CONTRACT OFF" }, { testo: "#endif" });
  righe.push({ testo: "" });
  if (costanti.length > 0) righe.push({ testo: `/* ${w.costantiComuni} */` }, ...costanti, { testo: "" });
  if (delProgetto.length > 0)
    righe.push(
      { testo: `/* ${w.delProgetto} */` },
      ...delProgetto.flatMap((f) => [...(strutture.has(f) ? [{ testo: strutture.get(f)! }] : []), { testo: `${intestazioneDi(f)};` }]),
      { testo: "" },
    );
  righe.push({ testo: `/* ${w.prototipi} */` });
  const testoDi = (f: Funzione) => funzione(f, lingua, n, riempimento, tetto);
  for (const f of funzioni) righe.push(...testoDi(f).prototipo.map((testo) => ({ testo })));
  righe.push({ testo: "" }, ...principale);
  for (const f of delProgetto) righe.push({ testo: "" }, ...scritte.get(f)!);
  righe.push({ testo: "" }, { testo: w.supporto });
  for (const f of funzioni) righe.push({ testo: "" }, ...testoDi(f).definizione.map((testo) => ({ testo })));
  return righe;
}

// -------------------------------------------------------------------------------- le funzioni di supporto

/** Il prototipo di una funzione di supporto (con la macro che le passa la riga del programma, o l'area del risultato)
 * e la sua definizione con la spiegazione in testa. */
function funzione(
  f: Funzione,
  lingua: LinguaDelCodice,
  n: Readonly<Record<Funzione, string>>,
  riempimento: number,
  tetto: number,
): { prototipo: string[]; definizione: string[] } {
  const it = lingua === "it";
  const d = (a: string, b: string) => (it ? a : b);
  const m = motiviCol(tetto)[lingua];
  const riga = d("riga", "line");
  const testo = d("testo", "text");
  const passo = d("passo", "step");
  const codice = d("codice", "code");
  const letti = d("letti", "count");
  const valore = d("valore", "value");
  const inizio = d("inizio", "start");
  const valida = d("valida", "valid");
  const ferma = (motivo: string) => `${n.fermati}(${riga}, "${motivo}")`;
  const conRiga = (x: FunzioneDiSupporto) => n[x] + seguitoDellaRiga[lingua];
  /** Una funzione che riceve la riga: il prototipo, la macro, la definizione. */
  const colRiga = (x: FunzioneDiSupporto, ritorno: string, parametri: string[], spiegazione: string[], corpo: string[]) => {
    const firma = `static ${ritorno}${conRiga(x)}(${[`int ${riga}`, ...parametri].join(", ")})`;
    const nomi = parametri.map((q) => /(\w+)$/.exec(q)![1]!);
    return {
      prototipo: [`${firma};`, `#define ${n[x]}(${nomi.join(", ")}) ${conRiga(x)}(${["__LINE__", ...nomi].join(", ")})`],
      definizione: [...spiegazione, `${firma} {`, ...corpo, "}"],
    };
  };
  const semplice = (firma: string, spiegazione: string[], corpo: string[]) => ({ prototipo: [`${firma};`], definizione: [...spiegazione, `${firma} {`, ...corpo, "}"] });
  /** L'inizio di una lettura di una riga: il testo e la sua lunghezza. */
  const riga255 = [`    char ${testo}[256];`, `    int n = ${n.leggiRiga}(${riga}, ${testo}, 255);`];
  switch (f) {
    case "preparaConsole":
      return semplice(
        `static void ${n.preparaConsole}(void)`,
        [
          d(
            "/* La console di Windows in UTF-8, l'a capo scritto \\n anche in un file, e l'output scritto subito. */",
            "/* The Windows console in UTF-8, the line break written as \\n also into a file, and the output written at once. */",
          ),
        ],
        [
          "#ifdef _WIN32",
          "    SetConsoleOutputCP(65001);",
          "    SetConsoleCP(65001);",
          "    _setmode(_fileno(stdout), _O_BINARY);",
          "    _setmode(_fileno(stderr), _O_BINARY);",
          "#endif",
          "    setvbuf(stdout, NULL, _IONBF, 0);",
        ],
      );
    case "fermati": {
      const motivo = d("motivo", "reason");
      return semplice(
        `static void ${n.fermati}(int ${riga}, const char *${motivo})`,
        [d("/* Scrive il motivo e la riga del programma che lo ha incontrato, poi si ferma. */", "/* Writes the reason and the line of the program that met it, then stops. */")],
        [`    fprintf(stderr, "${d("Errore alla riga", "Error at line")} %d: %s\\n", ${riga}, ${motivo});`, "    exit(1);"],
      );
    }
    case "leggiRiga": {
      const ultimo = d("ultimo", "last");
      return semplice(
        `static int ${n.leggiRiga}(int ${riga}, char *${testo}, int n)`,
        [
          d(
            "/* Una riga dell'input, senza il suo a capo, in testo (al più n byte e il terminatore); restituisce i byte",
            "/* A line of the input, without its line break, into text (at most n bytes and the terminator); returns the",
          ),
          d(
            " * letti. Si ferma se l'input è finito, se la riga è più lunga o se non è testo UTF-8. */",
            " * bytes read. Stops if the input is exhausted, if the line is longer or if it is not UTF-8 text. */",
          ),
        ],
        [
          "    int c = getchar();",
          `    int ${letti} = 0;`,
          `    int ${ultimo} = 0;`,
          `    if (c == EOF) ${ferma(m.input_exhausted)};`,
          "    while (c != EOF && c != '\\n') {",
          `        if (${letti} < n) ${testo}[${letti}] = (char)c;`,
          `        ${letti}++;`,
          `        ${ultimo} = c;`,
          "        c = getchar();",
          "    }",
          `    if (c == '\\n' && ${ultimo} == '\\r') ${letti}--;`,
          `    if (${letti} > n) ${ferma(m.invalid_input)};`,
          `    ${testo}[${letti}] = '\\0';`,
          `    for (int i = 0; i < ${letti};) {`,
          `        int ${passo};`,
          `        if (${n.decodifica}(${testo} + i, &${passo}) < 0) ${ferma(m.invalid_input)};`,
          `        i += ${passo};`,
          "    }",
          `    return ${letti};`,
        ],
      );
    }
    case "decodifica":
      return semplice(
        `static int ${n.decodifica}(const char *s, int *${passo})`,
        [
          d(
            "/* Il codice del carattere che comincia in s, e in *passo i suoi byte; -1 se i byte non sono UTF-8 valido. */",
            "/* The code of the character that starts at s, and in *step its bytes; -1 if the bytes are not valid UTF-8. */",
          ),
        ],
        [
          "    const unsigned char *b = (const unsigned char *)s;",
          `    int ${codice};`,
          "    int n;",
          `    *${passo} = 1;`,
          "    if (b[0] < 0x80) return b[0];",
          "    if (b[0] >= 0xC2 && b[0] <= 0xDF) {",
          "        n = 2;",
          `        ${codice} = b[0] & 0x1F;`,
          "    } else if (b[0] >= 0xE0 && b[0] <= 0xEF) {",
          "        n = 3;",
          `        ${codice} = b[0] & 0x0F;`,
          "    } else if (b[0] >= 0xF0 && b[0] <= 0xF4) {",
          "        n = 4;",
          `        ${codice} = b[0] & 0x07;`,
          "    } else {",
          "        return -1;",
          "    }",
          "    for (int i = 1; i < n; i++) {",
          "        if ((b[i] & 0xC0) != 0x80) return -1;",
          `        ${codice} = (${codice} << 6) | (b[i] & 0x3F);`,
          "    }",
          `    *${passo} = n;`,
          `    if ((n == 3 && ${codice} < 0x800) || (n == 4 && ${codice} < 0x10000) || (${codice} >= 0xD800 && ${codice} <= 0xDFFF) || ${codice} > 0x10FFFF)`,
          "        return -1;",
          `    return ${codice};`,
        ],
      );
    case "codifica":
      return semplice(
        `static int ${n.codifica}(char *s, int c)`,
        [
          d(
            "/* Scrive in s il carattere di codice c in UTF-8, col terminatore; restituisce i byte del carattere. */",
            "/* Writes into s the character with code c in UTF-8, with the terminator; returns the bytes of the character. */",
          ),
        ],
        [
          "    unsigned char *b = (unsigned char *)s;",
          "    int n;",
          "    if (c < 0x80) {",
          "        n = 1;",
          "        b[0] = c;",
          "    } else if (c < 0x800) {",
          "        n = 2;",
          "        b[0] = 0xC0 | (c >> 6);",
          "    } else if (c < 0x10000) {",
          "        n = 3;",
          "        b[0] = 0xE0 | (c >> 12);",
          "    } else {",
          "        n = 4;",
          "        b[0] = 0xF0 | (c >> 18);",
          "    }",
          "    for (int i = 1; i < n; i++) b[i] = 0x80 | ((c >> (6 * (n - 1 - i))) & 0x3F);",
          "    b[n] = 0;",
          "    return n;",
        ],
      );
    case "leggiIntero":
      return colRiga(
        f,
        "int ",
        [],
        [d("/* Una riga con un intero a 32 bit: spazi, segno, cifre e spazi, come la lettura del flowchart. */", "/* A line with a 32-bit integer: spaces, sign, digits and spaces, as the flowchart reads it. */")],
        [
          ...riga255,
          "    int i = 0;",
          `    while (${testo}[i] == ' ') i++;`,
          `    int ${inizio} = i;`,
          `    if (${testo}[i] == '+' || ${testo}[i] == '-') i++;`,
          `    int k = ${n.quanteCifre}(${testo}, i);`,
          "    i += k;",
          `    while (${testo}[i] == ' ') i++;`,
          `    long long ${valore} = strtoll(${testo} + ${inizio}, NULL, 10);`,
          `    if (k == 0 || i < n || ${valore} < INT_MIN || ${valore} > INT_MAX) ${ferma(m.invalid_input)};`,
          `    return (int)${valore};`,
        ],
      );
    case "leggiReale":
      return colRiga(
        f,
        "double ",
        [],
        [d("/* Una riga con un reale finito, scritto come nel flowchart (2.5, -3, 1.5e3), con spazi intorno. */", "/* A line with a finite real, written as in the flowchart (2.5, -3, 1.5e3), with spaces around. */")],
        [
          ...riga255,
          "    int i = 0;",
          `    while (${testo}[i] == ' ') i++;`,
          `    int ${inizio} = i;`,
          `    if (${testo}[i] == '+' || ${testo}[i] == '-') i++;`,
          `    int k = ${n.quanteCifre}(${testo}, i);`,
          `    int ${valida} = k > 0;`,
          "    i += k;",
          `    if (${valida} && ${testo}[i] == '.') {`,
          `        k = ${n.quanteCifre}(${testo}, i + 1);`,
          `        ${valida} = k > 0;`,
          "        i += 1 + k;",
          `        if (${valida} && (${testo}[i] == 'e' || ${testo}[i] == 'E')) {`,
          "            i++;",
          `            if (${testo}[i] == '+' || ${testo}[i] == '-') i++;`,
          `            k = ${n.quanteCifre}(${testo}, i);`,
          `            ${valida} = k > 0;`,
          "            i += k;",
          "        }",
          "    }",
          `    while (${testo}[i] == ' ') i++;`,
          `    double ${valore} = strtod(${testo} + ${inizio}, NULL);`,
          `    if (!${valida} || i < n || isinf(${valore})) ${ferma(m.invalid_input)};`,
          `    return ${valore};`,
        ],
      );
    case "quanteCifre":
      return semplice(
        `static int ${n.quanteCifre}(const char *${testo}, int i)`,
        [d("/* Quante cifre decimali ci sono in testo dalla posizione i. */", "/* How many decimal digits there are in text from position i. */")],
        ["    int k = 0;", `    while (${testo}[i + k] >= '0' && ${testo}[i + k] <= '9') k++;`, "    return k;"],
      );
    case "leggiCarattere":
      return colRiga(f, "int ", [], [d("/* Una riga con esattamente un carattere. */", "/* A line with exactly one character. */")], [
        ...riga255,
        `    int ${passo};`,
        `    int c = ${n.decodifica}(${testo}, &${passo});`,
        `    if (n == 0 || ${passo} != n) ${ferma(m.invalid_input)};`,
        "    return c;",
      ]);
    case "leggiStringa":
      return colRiga(
        f,
        "void ",
        ["char *s", "int n"],
        [d("/* Una riga con al più n caratteri, senza il carattere di codice 0, scritta in s. */", "/* A line with at most n characters, without the character with code 0, written into s. */")],
        [`    int byte = ${n.leggiRiga}(${riga}, s, 4 * n);`, `    if (${n.lunghezza}(s) > n || (int)strlen(s) != byte) ${ferma(m.invalid_input)};`],
      );
    case "leggiBooleano":
      return colRiga(f, "bool ", [], [d("/* Una riga con true o false. */", "/* A line with true or false. */")], [
        ...riga255,
        `    if ((int)strlen(${testo}) != n || (strcmp(${testo}, "true") != 0 && strcmp(${testo}, "false") != 0)) ${ferma(m.invalid_input)};`,
        `    return strcmp(${testo}, "true") == 0;`,
      ]);
    case "lunghezza":
      return semplice(
        `static int ${n.lunghezza}(const char *s)`,
        [
          d(
            "/* Quanti caratteri ha la stringa: i byte che non continuano un carattere (in UTF-8 cominciano con 10). */",
            "/* How many characters the string has: the bytes that do not continue a character (in UTF-8 they start with 10). */",
          ),
        ],
        ["    int n = 0;", "    for (int i = 0; s[i] != '\\0'; i++)", "        if ((s[i] & 0xC0) != 0x80) n++;", "    return n;"],
      );
    case "carattereDi":
      return colRiga(
        f,
        "int ",
        ["const char *s", "int i"],
        [d("/* Il carattere in posizione i della stringa, da 0; si ferma se la posizione è fuori. */", "/* The character at position i of the string, from 0; stops if the position is outside. */")],
        [
          `    int ${passo};`,
          `    if (i < 0 || i >= ${n.lunghezza}(s)) ${ferma(m.index_out_of_range)};`,
          "    for (int k = 0; k < i; k++) {",
          `        ${n.decodifica}(s, &${passo});`,
          `        s += ${passo};`,
          "    }",
          `    return ${n.decodifica}(s, &${passo});`,
        ],
      );
    case "convertiACarattere":
      return colRiga(
        f,
        "int ",
        ["int n"],
        [d("/* Il carattere con quel codice Unicode; si ferma se il codice non è valido. */", "/* The character with that Unicode code; stops if the code is not valid. */")],
        [`    if (n < 0 || n > 0x10FFFF || (n >= 0xD800 && n <= 0xDFFF)) ${ferma(m.invalid_character_code)};`, "    return n;"],
      );
    case "convertiAVettore": {
      const spazio = riempimento === 0x20;
      return colRiga(
        f,
        "void ",
        ["int *v", "int n", "const char *s"],
        [
          d(
            `/* I caratteri della stringa negli n elementi del vettore v, poi ${spazio ? "lo spazio" : "il carattere"} di riempimento; si ferma se la`,
            `/* The characters of the string into the n elements of the array v, then the padding ${spazio ? "space" : "character"}; stops if the`,
          ),
          d(" * stringa è più lunga del vettore. */", " * string is longer than the array. */"),
        ],
        [
          `    int ${passo};`,
          `    if (${n.lunghezza}(s) > n) ${ferma(m.string_longer_than_array)};`,
          "    for (int i = 0; i < n; i++) {",
          "        if (*s != '\\0') {",
          `            v[i] = ${n.decodifica}(s, &${passo});`,
          `            s += ${passo};`,
          "        } else {",
          `            v[i] = ${letteraleCarattere(riempimento)};`,
          "        }",
          "    }",
        ],
      );
    }
    case "convertiAStringa":
      return colRiga(
        f,
        "void ",
        ["char *s", "int m", "const int *v", "int n"],
        [
          d(
            "/* Tutti gli n elementi del vettore v, in ordine, nella stringa s di al più m caratteri; un carattere di",
            "/* All the n elements of the array v, in order, into the string s of at most m characters; the character",
          ),
          d(" * codice 0 non entra in una stringa. */", " * with code 0 cannot enter a string. */"),
        ],
        [
          "    for (int i = 0; i < n; i++)",
          `        if (v[i] == 0) ${ferma(m.null_character_in_string)};`,
          `    if (n > m) ${ferma(m.string_too_long)};`,
          `    for (int i = 0; i < n; i++) s += ${n.codifica}(s, v[i]);`,
        ],
      );
    case "nellaStringa": {
      const firma = `static const char *${conRiga(f)}(int ${riga}, char *${testo}, int c)`;
      return {
        prototipo: [`${firma};`, `#define ${n.nellaStringa}(c) ${conRiga(f)}(__LINE__, (char[5]){0}, c)`],
        definizione: [
          d("/* Un carattere che entra in una stringa, scritto in testo: quello di codice 0 non può. */", "/* A character entering a string, written into text: the one with code 0 cannot. */"),
          `${firma} {`,
          `    if (c == 0) ${ferma(m.null_character_in_string)};`,
          `    ${n.codifica}(${testo}, c);`,
          `    return ${testo};`,
          "}",
        ],
      };
    }
    case "concatena": {
      const vera = n.concatena + seguitoDellArea[lingua];
      const firma = `static const char *${vera}(char *${testo}, const char *a, const char *b)`;
      return {
        prototipo: [`${firma};`, `#define ${n.concatena}(n, a, b) ${vera}((char[4 * (n) + 1]){0}, a, b)`],
        definizione: [
          d(
            "/* La stringa a seguita dalla stringa b, scritta in testo: un'area per n caratteri, nuova a ogni concatenazione. */",
            "/* The string a followed by the string b, written into text: an area for n characters, new at each concatenation. */",
          ),
          `${firma} {`,
          `    strcpy(${testo}, a);`,
          `    strcat(${testo}, b);`,
          `    return ${testo};`,
          "}",
        ],
      };
    }
    case "alPiu":
      return colRiga(
        f,
        "const char *",
        ["const char *s", "int n"],
        [d("/* La stringa, se non ha più di n caratteri; altrimenti si ferma. */", "/* The string, if it has at most n characters; otherwise stops. */")],
        [`    if (${n.lunghezza}(s) > n) ${ferma(m.string_too_long)};`, "    return s;"],
      );
    case "elementiDiversi": {
      // Gli indici in un vettore scritto sul posto, e quanti sono: la macro si chiama come quella del Python.
      const indici = d("indici", "indices");
      const firma = `static void ${conRiga(f)}(int ${riga}, const int *${indici}, int n)`;
      return {
        prototipo: [`${firma};`, `#define ${n.elementiDiversi}(...) ${conRiga(f)}(__LINE__, (int[]){__VA_ARGS__}, (int)(sizeof (int[]){__VA_ARGS__} / sizeof(int)))`],
        definizione: [
          d(
            "/* Gli elementi di un vettore passati per riferimento nella stessa chiamata devono essere diversi. */",
            "/* The elements of an array passed by reference in the same call must be different. */",
          ),
          `${firma} {`,
          "    for (int i = 0; i < n; i++)",
          "        for (int k = i + 1; k < n; k++)",
          `            if (${indici}[i] == ${indici}[k]) ${ferma(m.same_reference)};`,
          "}",
        ],
      };
    }
    case "scriviCarattere":
      return semplice(
        `static void ${n.scriviCarattere}(int c)`,
        [d("/* Scrive il carattere di codice c, in UTF-8. */", "/* Writes the character with code c, in UTF-8. */")],
        [`    char ${testo}[5];`, `    fwrite(${testo}, 1, ${n.codifica}(${testo}, c), stdout);`],
      );
    case "booleano":
      return semplice(
        `static const char *${n.booleano}(bool b)`,
        [d("/* Un booleano come lo scrive il flowchart: true o false. */", "/* A boolean as the flowchart writes it: true or false. */")],
        ['    return b ? "true" : "false";'],
      );
    case "entraNellaRicorsione": {
      const k = contatoriDellaRicorsione[lingua];
      const spazio = d("spazio", "space");
      return {
        prototipo: [`static void ${n.entraNellaRicorsione}(int ${riga}, int ${spazio});`],
        definizione: [
          d(
            "/* Le chiamate in corso delle funzioni che richiamano sé stesse, e i byte dei loro dati. */",
            "/* The calls in progress of the functions that call themselves, and the bytes of their data. */",
          ),
          `static int ${k.chiamate} = 0;`,
          `static int ${k.spazio} = 0;`,
          "",
          d(
            `/* Una chiamata in più, con i suoi dati: oltre ${tetto} chiamate in corso, o oltre ${spazioDellaPila} byte, si ferma sulla`,
            `/* One more call, with its data: beyond ${tetto} calls in progress, or beyond ${spazioDellaPila} bytes, stops at the line`,
          ),
          d(" * riga della chiamata. */", " * of the call. */"),
          `static void ${n.entraNellaRicorsione}(int ${riga}, int ${spazio}) {`,
          `    if (++${k.chiamate} > ${tetto}) ${ferma(m.recursion_too_deep)};`,
          `    if ((${k.spazio} += ${spazio}) > ${spazioDellaPila}) ${ferma(m.recursion_data_too_large)};`,
          "}",
        ],
      };
    }
    case "esciDallaRicorsione": {
      const k = contatoriDellaRicorsione[lingua];
      const spazio = d("spazio", "space");
      return semplice(
        `static void ${n.esciDallaRicorsione}(int ${spazio})`,
        [d("/* La chiamata è finita: i suoi dati lasciano la pila. */", "/* The call has ended: its data leave the stack. */")],
        [`    ${k.chiamate}--;`, `    ${k.spazio} -= ${spazio};`],
      );
    }
    default:
      // Le funzioni del Python che il C non usa: la divisione, il resto, la potenza, gli arrotondamenti e la stampa
      // dei reali e dei booleani sono del C stesso.
      throw new Error(`funzione di supporto che il C non usa: ${f}`);
  }
}
