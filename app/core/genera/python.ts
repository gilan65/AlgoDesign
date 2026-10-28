// Il Python di un progetto: un programma che sui casi d'uso dà lo stesso output dell'interprete, nella lingua
// dell'interfaccia (i nomi delle funzioni di supporto, i commenti, i motivi d'errore). La semantica resta quella del
// C: le funzioni di supporto la imitano dove Python fa altro (la lettura stretta, la divisione e il resto fra interi
// col segno del C, i reali a decimali fissi, i booleani scritti `true` e `false`, gli arrotondamenti con lo zero col
// segno, la potenza esatta, le regole del linguaggio su caratteri e stringhe). I comportamenti che il C non
// definisce non si controllano, e il commento in testa lo dice.
//
// La forma: il nome del progetto e la testa, gli import che servono, le costanti comuni sopra il programma
// principale, `main` coi dati annotati dalla vista dei dati (il valore iniziale nella dichiarazione, il ruolo o
// «costante» in una colonna allineata), le regole, poi le procedure e le funzioni del progetto nel suo ordine, poi le
// sole funzioni di supporto che il programma usa, in un ordine fisso, e la chiamata di `main`. Il `ripeti` è
// `while True:` con `if not (condizione): break` in fondo, che rivaluta la condizione a ogni giro. Il `per` e il `per
// ogni` sono il `mentre` equivalente, un `while` che ricalcola a ogni controllo la fine o la lunghezza della sorgente;
// l'indice nascosto del `per ogni` è `_indice` (`_index`), e dentro un altro `per ogni` `_indice2`, `_indice3`.
//
// Procedure e funzioni: una funzione restituisce il suo valore; una procedura con parametri per
// riferimento restituisce quei parametri, e la chiamata li riassegna (`x, v[_indice] = p(x, v[_indice])`): l'indice
// di un elemento passato per riferimento, se non è un numero scritto, si calcola prima della chiamata in un nome suo,
// perché Python assegna i valori restituiti da sinistra a destra e calcolerebbe l'indice dopo aver cambiato i dati
// prima. Due elementi dello stesso vettore per riferimento, con un indice calcolato, passano dal controllo
// `elementi_diversi` (una regola del linguaggio, non del C). Un vettore senza *rif* arriva come copia: la funzione
// chiamata la fa per prima cosa (`w = list(w)`); una stringa del Python non si modifica, e non la vuole. Il dato senza
// valore iniziale che una funzione passa per riferimento nasce con `None` (il Python non passa un nome senza valore).
// Un parametro per uscita non si passa né si riceve (`n = leggi_numero()`): la procedura lo dichiara senza valore coi
// suoi dati e lo restituisce con quelli per riferimento, nell'ordine dei parametri (`a, n = p(a)`); così il dato di
// chi chiama non arriva mai alla procedura.
// Un argomento che si può fermare si calcola prima della chiamata, nel suo ordine, solo se dopo di lui una riga prima
// della chiamata si può fermare anche lei (il controllo, o un indice che si ferma). `fermati` risale fino a una
// funzione del programma.
//
// La ricorsione: la prima riga delle sole funzioni del giro (`funzioniDelGiro`) conta la chiamata
// col suo spazio (`entra_nella_ricorsione`, lo spazio di `spazioDiUnaChiamata`) e si ferma oltre un tetto; l'ultima la
// toglie (`esci_dalla_ricorsione`), dopo il valore restituito, calcolato prima in `_valore` se può far partire chiamate
// del giro (`funzioniVersoIlGiro`). La riga dell'arresto è quella della chiamata: `fermati` la cerca dalla cornice di chi ha chiamato la funzione del
// giro (`fermati(motivo, 3)`).
//
// L'ordine degli arresti in un'espressione è quello di Python (da sinistra a destra, un'operazione dopo i suoi
// operandi), salvo un carattere che entra in una stringa: lo si controlla dopo aver calcolato il lato destro della
// concatenazione, e se quel lato si può fermare la concatenazione passa da `concatena`, che controlla dopo i due lati.
//
// Le espressioni si riscrivono dall'albero, non dal testo: le precedenze di Python non sono quelle del linguaggio
// (`not` sta sotto i confronti, e due confronti in fila si concatenano), quindi le parentesi sono quelle che servono
// a Python per dire lo stesso albero; i letterali si riscrivono dal loro valore.
//
// La provenienza delle righe è quella dello pseudocodice, salvo la fine: la riga che porta il testo di un blocco ha
// quel blocco (la condizione del `ripeti` sulla riga dell'`if not` in fondo; l'indice calcolato prima del valore, o
// prima della chiamata, e il controllo degli elementi hanno una riga loro, dello stesso blocco), la dichiarazione di un
// dato ha il dato (e la funzione, fuori dal programma principale), le righe di struttura (`else:`, `while True:`,
// `break`, `pass`, la copia di un vettore) e le funzioni di supporto nessuna. Python non ha una riga per la fine, salvo
// il `return` di una funzione o di una procedura con parametri per riferimento o per uscita, che ha il blocco di fine. Un `per` ha
// una riga per fase (il valore di partenza, il controllo, l'aumento); un `per ogni` anche (la partenza e l'aumento
// dell'indice nascosto, il controllo, l'elemento preso).
//
// Il programma di prova di un caso di una procedura o di una funzione eseguita da sola (`prova`): al posto del
// programma principale un `main` che legge i parametri come letture (riga per riga, la provenienza della funzione, il
// suo «Inizio»; quelli per uscita no), chiama e scrive ciò che scrive l'esecuzione («→ » e il risultato, o l'a capo e
// «nome = valore» per ogni parametro per riferimento o per uscita); poi la funzione con quelle che chiama.
//
// Che cosa NON fa: controllare l'indice di un vettore, un intero oltre i 32 bit, la divisione per zero, il reale fuori
// dall'intervallo degli interi convertito in intero, il dato senza valore, il reale non finito; le ultime cifre di `elevato_a` con un esponente non intero o oltre 1100 sono
// quelle di `math.pow`, non quelle dell'interprete.

import { chiamateDellaFunzione, chiamateIn, funzioniDelGiro, funzioniVersoIlGiro, lunghezzaPredefinita, type Tetti } from "../controllo/controllo";
import { lunghezzaMassima as lunghezzaMassimaNelNucleo } from "../controllo/lunghezza";
import { spazioDellaPila, spazioDiUnaChiamata, tettoDelleChiamate } from "../controllo/spazio";
import { analizza, type Espressione } from "../espressioni/analizzatore";
import { opzioniPredefinite, tipoSemplice, type Blocco, type CasoDiUnaFunzione, type Dato, type Funzione, type Progetto, type Ruolo, type Tipo } from "../progetto/modello";
import type { FaseDelCiclo } from "../interprete/interprete";
import { genera, parametriDelCaso, segnate, type Generato, type Riga } from "./forma";
import { motiviCol } from "./motivi";
import {
  contatoriDellaRicorsione,
  funzioniDiSupporto,
  indiceDelLivello,
  nomeDelRisultato,
  nomeDellaSorgente,
  nomeDellElemento,
  nomeDelValore,
  nomiDelSupporto,
  type FunzioneDiSupporto,
  type LinguaDelCodice,
} from "./nomi";

/** Le parole della vista dei dati che il Python scrive nei commenti delle dichiarazioni: le dà l'interfaccia. */
export interface NoteDeiDati {
  readonly costante: string;
  readonly ruoli: Readonly<Record<Ruolo, string>>;
}

/** Il caso di una procedura o di una funzione eseguita da sola, per il programma di prova: l'`id` della funzione. */
export interface Prova {
  readonly funzione: string;
  readonly caso: CasoDiUnaFunzione;
}

export function python(p: Progetto, limiti: Tetti, lingua: LinguaDelCodice, note: NoteDeiDati, prova?: Prova): Generato {
  return genera(p, limiti, (q) => righeDelPython(q, lingua, note, prova));
}

const rientro = "    ";

const testi = {
  it: {
    generato: "Programma principale generato da AlgoDesign dal flowchart e dalla vista dei dati.",
    nonControllati: [
      "Come il C, non controlla i calcoli che il C lascia senza regola (un intero oltre i 32 bit, la divisione",
      "intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in",
      "intero, un dato letto prima di avere un valore) né un reale che diventa infinito o non è un numero: li",
      "ferma l'esecuzione in AlgoDesign.",
    ],
    costantiComuni: "Costanti comuni",
    supporto: "Funzioni di supporto: fanno ciò che fa il C.",
    errore: "Errore alla riga",
    motivo: "motivo",
    chiamante: "chiamante",
    riga: "riga",
    cifre: "cifre",
    indici: "indici",
    spazio: "spazio",
    cornice: "cornice",
  },
  en: {
    generato: "Main program generated by AlgoDesign from the flowchart and the data view.",
    nonControllati: [
      "Like C, it does not check the calculations that C leaves without a rule (an integer beyond 32 bits, an",
      "integer division by zero, an index outside the array, a real outside the integer range converted to an",
      "integer, a data item read before it has a value) nor a real that becomes infinite or not a number:",
      "AlgoDesign stops them when it runs the flowchart.",
    ],
    costantiComuni: "Shared constants",
    supporto: "Support functions: they do what C does.",
    errore: "Error at line",
    motivo: "reason",
    chiamante: "caller",
    riga: "line",
    cifre: "digits",
    indici: "indices",
    spazio: "space",
    cornice: "frame",
  },
} as const;

/** Le spiegazioni delle funzioni di supporto (la prima riga di ognuna), per lingua. */
const spiegazioni: Readonly<Record<LinguaDelCodice, Readonly<Record<Exclude<FunzioneDiSupporto, "reale" | "convertiAVettore">, string>>>> = {
  it: {
    fermati: "Scrive il motivo e la riga del programma che lo ha incontrato, poi si ferma.",
    leggiRiga: "Una riga dell'input, senza il suo a capo; si ferma se l'input è finito o non è testo UTF-8.",
    leggiIntero: "Una riga con un intero a 32 bit: spazi, segno, cifre e spazi, come la lettura del flowchart.",
    leggiReale: "Una riga con un reale finito, scritto come nel flowchart (2.5, -3, 1.5e3), con spazi intorno.",
    leggiCarattere: "Una riga con esattamente un carattere.",
    leggiStringa: "Una riga con al più n caratteri, senza il carattere di codice 0.",
    leggiBooleano: "Una riga con true o false.",
    dividi: "La divisione fra interi del C: il quoziente troncato verso lo zero.",
    mod: "Il resto della divisione fra interi del C: col segno del dividendo.",
    elevatoA: "La potenza: con un esponente intero fino a 1100 è esatta, arrotondata una volta.",
    arrotonda: "La metà lontano dallo zero, come round del C (round di Python la porta al pari).",
    perDifetto: "Come floor del C: un reale, e lo zero col segno di x.",
    perEccesso: "Come ceil del C: un reale, e lo zero col segno di x.",
    parteIntera: "Come trunc del C: un reale, e lo zero col segno di x.",
    convertiACarattere: "Il carattere con quel codice Unicode; si ferma se il codice non è valido.",
    convertiAStringa: "Tutti gli elementi del vettore, in ordine; un carattere di codice 0 non entra in una stringa.",
    carattereDi: "Il carattere in posizione i della stringa, da 0; si ferma se la posizione è fuori.",
    nellaStringa: "Un carattere che entra in una stringa: quello di codice 0 non può.",
    concatenazione: "Due testi già calcolati, uno dopo l'altro: un carattere di codice 0 non entra in una stringa.",
    alPiu: "La stringa, se non ha più di n caratteri; altrimenti si ferma.",
    elementiDiversi: "Gli elementi di un vettore passati per riferimento nella stessa chiamata devono essere diversi.",
    booleano: "Un booleano come lo scrive il flowchart: true o false.",
    entraNellaRicorsione: `Una chiamata in più di una funzione che richiama sé stessa, con i suoi dati: oltre {tetto} chiamate in corso, o oltre {spazio} byte, si ferma sulla riga della chiamata.`,
    esciDallaRicorsione: "La chiamata è finita: i suoi dati lasciano la pila.",
  },
  en: {
    fermati: "Writes the reason and the line of the program that met it, then stops.",
    leggiRiga: "A line of the input, without its line break; stops if the input is exhausted or is not UTF-8 text.",
    leggiIntero: "A line with a 32-bit integer: spaces, sign, digits and spaces, as the flowchart reads it.",
    leggiReale: "A line with a finite real, written as in the flowchart (2.5, -3, 1.5e3), with spaces around.",
    leggiCarattere: "A line with exactly one character.",
    leggiStringa: "A line with at most n characters, without the character with code 0.",
    leggiBooleano: "A line with true or false.",
    dividi: "Integer division as in C: the quotient truncated towards zero.",
    mod: "The remainder of integer division as in C: with the sign of the dividend.",
    elevatoA: "The power: with an integer exponent up to 1100 it is exact, rounded once.",
    arrotonda: "Halves away from zero, like round in C (the round of Python takes them to even).",
    perDifetto: "Like floor in C: a real, and zero with the sign of x.",
    perEccesso: "Like ceil in C: a real, and zero with the sign of x.",
    parteIntera: "Like trunc in C: a real, and zero with the sign of x.",
    convertiACarattere: "The character with that Unicode code; stops if the code is not valid.",
    convertiAStringa: "All the elements of the array, in order; the character with code 0 cannot enter a string.",
    carattereDi: "The character at position i of the string, from 0; stops if the position is outside.",
    nellaStringa: "A character entering a string: the one with code 0 cannot.",
    concatenazione: "Two texts already calculated, one after the other: the character with code 0 cannot enter a string.",
    alPiu: "The string, if it has at most n characters; otherwise stops.",
    elementiDiversi: "The elements of an array passed by reference in the same call must be different.",
    booleano: "A boolean as the flowchart writes it: true or false.",
    entraNellaRicorsione: `One more call of a function that calls itself, with its data: beyond {tetto} calls in progress, or beyond {spazio} bytes, stops at the line of the call.`,
    esciDallaRicorsione: "The call has ended: its data leave the stack.",
  },
};

/** Le funzioni di supporto che ognuna chiama, e i moduli che legge. */
const chiama: Partial<Record<FunzioneDiSupporto, readonly FunzioneDiSupporto[]>> = {
  leggiRiga: ["fermati"],
  leggiIntero: ["leggiRiga", "fermati"],
  leggiReale: ["leggiRiga", "fermati"],
  leggiCarattere: ["leggiRiga", "fermati"],
  leggiStringa: ["leggiRiga", "fermati"],
  leggiBooleano: ["leggiRiga", "fermati"],
  arrotonda: ["parteIntera"],
  convertiACarattere: ["fermati"],
  convertiAVettore: ["fermati"],
  convertiAStringa: ["fermati"],
  carattereDi: ["fermati"],
  nellaStringa: ["fermati"],
  concatenazione: ["fermati"],
  alPiu: ["fermati"],
  elementiDiversi: ["fermati"],
  entraNellaRicorsione: ["fermati"],
};
const moduli: Partial<Record<FunzioneDiSupporto, readonly ("math" | "re")[]>> = {
  leggiIntero: ["re"],
  leggiReale: ["math", "re"],
  elevatoA: ["math"],
  arrotonda: ["math"],
  perDifetto: ["math"],
  perEccesso: ["math"],
  parteIntera: ["math"],
};

// ------------------------------------------------------------------------------------------------ i letterali

/** Un codice in un letterale di Python fra `apice`: le sequenze del linguaggio, i caratteri di controllo in esadecimale. */
function nelLetterale(codice: number, apice: string): string {
  const c = String.fromCodePoint(codice);
  if (c === "\\" || c === apice) return `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (codice < 0x20 || codice === 0x7f) return `\\x${codice.toString(16).padStart(2, "0")}`;
  return c;
}
const letteraleCarattere = (codice: number) => `'${nelLetterale(codice, "'")}'`;
const letteraleStringa = (codici: readonly number[]) => `"${codici.map((c) => nelLetterale(c, '"')).join("")}"`;

/** Un reale di Python dal suo valore: le cifre più corte che lo rileggono uguale, con il punto se mancano. */
function letteraleReale(x: number): string {
  const t = String(x);
  return /[.e]/.test(t) ? t : `${t}.0`;
}

/** I blocchi di una sequenza, quelli dentro compresi. */
const tuttiIBlocchi = (bs: readonly Blocco[]): Blocco[] =>
  bs.flatMap((b) => [
    b,
    ...tuttiIBlocchi(b.kind === "if" ? [...b.then, ...b.else] : b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each" ? b.body : []),
  ]);

// ------------------------------------------------------------------------------------------- il programma

function righeDelPython(p: Progetto, lingua: LinguaDelCodice, note: NoteDeiDati, prova: Prova | undefined): Riga[] {
  const n = nomiDelSupporto[lingua];
  const w = testi[lingua];
  const main = p.functions.find((f) => f.kind === "main")!;
  const comuni = p.shared_constants ?? [];
  const perNome = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  const decimali = p.options?.real_decimals ?? opzioniPredefinite.real_decimals;
  const riempimento = (p.options?.fill_character ?? opzioniPredefinite.fill_character).codePointAt(0)!;
  const tetto = tettoDelleChiamate(p);

  const usate = new Set<FunzioneDiSupporto>();
  const altriModuli = new Set<"math" | "re">();
  const usa = (f: FunzioneDiSupporto): string => {
    usate.add(f);
    return n[f];
  };
  const albero = (testo: string): Espressione => {
    const a = analizza(testo);
    // Il controllo statico ha già provato sintassi e tipi: qui non ci sono errori.
    if (!a.ok) throw new Error(`espressione non analizzabile dopo il controllo: ${testo}`);
    return a.espressione;
  };

  /** I dati della funzione che si scrive, con le costanti comuni. */
  let dati = new Map<string, Dato>();
  /** Le funzioni del progetto che possono fermare il programma (una funzione di supporto che si ferma, o una funzione
   * che lo può), per nome: si scrivono prima quelle chiamate. */
  // Quelle del giro possono sempre (i tetti della ricorsione), e si sa prima di scriverle: in un giro non si può scrivere
  // prima chi è chiamato.
  const delGiro = funzioniDelGiro(p);
  const fermano = new Map<string, boolean>([...delGiro].map((f) => [f.name!, true]));
  /** Se la funzione che si scrive può fermare il programma. */
  let fermaLaFunzione = false;

  // ------------------------------------------------------------------------------------------- i tipi

  /** Un vettore intero: il nome di un vettore, o una funzione che lo restituisce. */
  const vettore = (e: Espressione) =>
    e.genere === "nome" ? dati.get(e.nome)!.size !== undefined : e.genere === "chiamata" && perNome.get(e.nome)?.return_size !== undefined;
  /** La dimensione e la lunghezza massima degli elementi di un vettore intero, come per un dato. */
  const misureDi = (e: Espressione): Pick<Dato, "size" | "max_length"> => {
    if (e.genere === "nome") return dati.get(e.nome)!;
    const f = perNome.get((e as { nome: string }).nome)!;
    return { size: f.return_size!, ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}) };
  };
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
        return tipoSemplice(dati.get(e.nome)!.type);
      case "campo":
        throw new Error("il campo di un record: il controllo statico dice fuori tappa un progetto coi record");
      case "indice":
        return vettore(e.base) ? tipo(e.base) : "character";
      case "chiamata":
        return tipoSemplice(perNome.get(e.nome)!.return_type!);
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

  // ------------------------------------------------------------------------------------- le espressioni

  /** Il testo di Python e la forza con cui tiene il suo operatore (più alta, più stretta): 10 un operando, una
   * chiamata o un indice; 8 il meno; 7 `*` e `/`; 6 `+` e `-`; 5 i confronti; 4 `not`; 3 `and`; 2 `or`. */
  type Testo = { readonly t: string; readonly forza: number };
  const operando = (t: string): Testo => ({ t, forza: 10 });
  const chiamata = (f: string, ...argomenti: string[]): Testo => operando(`${f}(${argomenti.join(", ")})`);
  const fra = (x: Testo, forza: number) => (x.forza < forza ? `(${x.t})` : x.t);
  /** Dice se il calcolo può fermare il programma per una regola del linguaggio (una funzione di supporto, o una
   * funzione del progetto che può). */
  let ferma = false;
  const conArresto = (f: FunzioneDiSupporto, ...argomenti: string[]): Testo => {
    ferma = true;
    fermaLaFunzione = true;
    return chiamata(usa(f), ...argomenti);
  };

  function espressione(e: Espressione): Testo {
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
        return operando(e.valore ? "True" : "False");
      case "pi":
        altriModuli.add("math");
        return operando("math.pi");
      case "nome":
        return operando(e.nome);
      case "campo":
        throw new Error("il campo di un record: il controllo statico dice fuori tappa un progetto coi record");
      case "indice":
        // L'elemento di un vettore, anche di quello restituito da una funzione: prima la chiamata, poi l'indice.
        if (vettore(e.base)) return operando(`${espressione(e.base).t}[${espressione(e.indice).t}]`);
        return conArresto("carattereDi", espressione(e.base).t, espressione(e.indice).t);
      case "chiamata": {
        // Gli argomenti di una funzione sono per valore: ognuno come un valore dato al suo parametro.
        const parametri = perNome.get(e.nome)!.data.filter((d) => d.parameter !== undefined);
        const argomenti = e.argomenti.map((a, k) => nelDato(a, parametri[k]!));
        if (fermano.get(e.nome) === true) {
          ferma = true;
          fermaLaFunzione = true;
        }
        return chiamata(e.nome, ...argomenti);
      }
      case "unario":
        return unario(e.operatore, e.operando);
      case "binario":
        return binario(e);
    }
  }

  function unario(op: string, o: Espressione): Testo {
    const x = espressione(o);
    const t = tipo(o);
    switch (op) {
      case "-":
        return { t: `-${fra(x, 9)}`, forza: 8 };
      case "not":
        return { t: `not ${fra(x, 8)}`, forza: 4 };
      case "to_integer":
        return t === "integer" ? x : chiamata(t === "character" ? "ord" : "int", x.t);
      case "to_real":
        return t === "real" ? x : chiamata("float", x.t);
      case "to_character":
        return t === "character" ? x : conArresto("convertiACarattere", x.t);
      case "length":
        return chiamata("len", x.t);
      case "absolute_value":
        return chiamata("abs", x.t);
      case "square_root":
        altriModuli.add("math");
        return chiamata("math.sqrt", x.t);
      case "round":
        return chiamata(usa("arrotonda"), x.t);
      case "round_down":
        return chiamata(usa("perDifetto"), x.t);
      case "round_up":
        return chiamata(usa("perEccesso"), x.t);
      case "integer_part":
        return chiamata(usa("parteIntera"), x.t);
      default:
        // `to_array` e `to_string` sono solo il lato destro intero di un'assegnazione (`assegnazione`).
        throw new Error(`operatore fuori dal controllo: ${op}`);
    }
  }

  function binario(e: Extract<Espressione, { genere: "binario" }>): Testo {
    const op = e.operatore;
    const interi = tipo(e.sinistro) === "integer" && tipo(e.destro) === "integer";
    if (op === "/" && interi) return chiamata(usa("dividi"), espressione(e.sinistro).t, espressione(e.destro).t);
    if (op === "mod") return chiamata(usa("mod"), espressione(e.sinistro).t, espressione(e.destro).t);
    if (op === "raised_to") return chiamata(usa("elevatoA"), espressione(e.sinistro).t, espressione(e.destro).t);
    const stringa = op === "+" && tipo(e) === "string";
    const zero = (x: Espressione) => stringa && tipo(x) === "character" && puoEssereZero(x);
    if (zero(e.sinistro)) {
      // Il carattere a sinistra si controlla dopo il lato destro: se quel lato si può fermare, prima lui.
      const l = espressione(e.sinistro);
      const prima = ferma;
      ferma = false;
      const r = espressione(e.destro);
      const destraFerma = ferma;
      ferma = prima || destraFerma;
      if (destraFerma) return conArresto("concatenazione", l.t, r.t);
      return { t: `${conArresto("nellaStringa", l.t).t} + ${fra(zero(e.destro) ? conArresto("nellaStringa", r.t) : r, 7)}`, forza: 6 };
    }
    const lato = (x: Espressione): Testo => (zero(x) ? conArresto("nellaStringa", espressione(x).t) : espressione(x));
    const l = lato(e.sinistro);
    const r = lato(e.destro);
    const forza = op === "*" || op === "/" ? 7 : op === "+" || op === "-" ? 6 : op === "and" ? 3 : op === "or" ? 2 : 5;
    // Un confronto dentro un confronto va fra parentesi da tutti e due i lati: Python li concatenerebbe.
    const sinistra = forza === 5 ? forza + 1 : forza;
    return { t: `${fra(l, sinistra)} ${op} ${fra(r, forza + 1)}`, forza };
  }

  /** Se un'espressione può far partire chiamate del giro: chiama una funzione del giro, o una da cui ci si arriva. */
  const versoIlGiro = funzioniVersoIlGiro(p);
  const chiamaIlGiro = (e: Espressione) => chiamateIn(e).some((nome) => versoIlGiro.has(perNome.get(nome)!));

  /** Un valore che va in un dato del tipo `verso`: un intero in un reale diventa reale; una stringa che può superare
   * la lunghezza massima del dato passa dal controllo. */
  function nelDato(e: Espressione, verso: Pick<Dato, "type" | "size" | "max_length">): string {
    const x = espressione(e);
    if (verso.type === "real" && tipo(e) === "integer") {
      if (e.genere === "intero") return `${x.t}.0`;
      // Lo zero intero non ha segno: `-0` dato a un reale è lo zero, mai il `-0.0` di Python.
      if (e.genere === "unario" && e.operatore === "-" && e.operando.genere === "intero") return /^-0+$/.test(x.t) ? "0.0" : `${x.t}.0`;
      return chiamata("float", x.t).t;
    }
    const massima = verso.max_length ?? lunghezzaPredefinita;
    if (verso.type === "string" && !(verso.size !== undefined && vettore(e)) && lunghezzaMassima(e) > massima) return conArresto("alPiu", x.t, String(massima)).t;
    return x.t;
  }

  /** Un vettore intero che va in un dato o nel risultato di una funzione (`verso`): una lista nuova. Dal nome di un
   * vettore la copia; con gli elementi stringa che possono essere più lunghi di quelli di `verso`, ognuno dal controllo. */
  function listaNuova(e: Espressione, verso: Pick<Dato, "type" | "max_length">): string {
    const x = espressione(e).t;
    const massima = verso.max_length ?? lunghezzaPredefinita;
    if (verso.type === "string" && (misureDi(e).max_length ?? lunghezzaPredefinita) > massima) {
      const elemento = nomeDellElemento[lingua];
      return `[${conArresto("alPiu", elemento, String(massima)).t} for ${elemento} in ${x}]`;
    }
    return e.genere === "nome" ? `list(${x})` : x;
  }

  // ---------------------------------------------------------------------------------------- le dichiarazioni

  const annotazioneDelTipo = (t: Tipo) => ({ integer: "int", real: "float", character: "str", string: "str", boolean: "bool" })[t];
  const annotazione = (d: Dato) => (d.size === undefined ? annotazioneDelTipo(tipoSemplice(d.type)) : `list[${annotazioneDelTipo(tipoSemplice(d.type))}]`);
  const annotazioneDelRisultato = (f: Funzione) => (f.return_size === undefined ? annotazioneDelTipo(tipoSemplice(f.return_type!)) : `list[${annotazioneDelTipo(tipoSemplice(f.return_type!))}]`);
  const valoreIniziale = (d: Dato): string | undefined => {
    const v = d.initial;
    if (v === undefined) return d.size === undefined ? undefined : `[None] * ${d.size}`;
    if (typeof v === "string") return nelDato(albero(v), d);
    if (Array.isArray(v)) return `[${(v as readonly string[]).map((x) => nelDato(albero(x), d)).join(", ")}]`;
    return `[${nelDato(albero((v as { readonly each: string }).each), d)}] * ${d.size}`;
  };

  /** Le dichiarazioni, con la colonna dei commenti allineata sulle righe che ne hanno uno; `senzaValore`, i dati senza
   * valore iniziale che nascono con `None`; `funzione`, quella che li possiede fuori dal programma principale. */
  const dichiara = (elenco: readonly Dato[], prima: string, conNota: boolean, senzaValore: ReadonlySet<string> = new Set(), funzione?: string): Riga[] => {
    const voci = elenco.map((d) => {
      const v = valoreIniziale(d) ?? (senzaValore.has(d.name) ? "None" : undefined);
      const nota = !conNota ? "" : d.constant === true ? note.costante : d.role !== undefined ? note.ruoli[d.role] : "";
      return { d, testo: `${prima}${d.name}: ${annotazione(d)}${v === undefined ? "" : ` = ${v}`}`, nota };
    });
    const larghezza = (t: string) => Array.from(t).length;
    const colonna = Math.max(0, ...voci.filter((x) => x.nota !== "").map((x) => larghezza(x.testo)));
    return voci.map(({ d, testo, nota }) => ({
      testo: nota === "" ? testo : `${testo}${" ".repeat(colonna - larghezza(testo))}  # ${nota}`,
      dato: d.name,
      ...(funzione !== undefined ? { funzione } : {}),
    }));
  };

  // --------------------------------------------------------------------------------------------- le regole

  let corpo: Riga[] = [];
  const struttura = (testo: string) => corpo.push({ testo });

  /** Quanti cicli `per ogni` contengono la regola che si scrive: l'indice di un ciclo, o quello calcolato prima del
   * valore, è quello del livello dopo. */
  let cicliPerOgni = 0;
  /** Quante sorgenti di un `per ogni` su una funzione ha la funzione che si scrive: `_sorgente`, poi `_sorgente2`. */
  let sorgenti = 0;

  /** Una destinazione e il valore che riceve. L'indice si calcola prima del valore, come nel flowchart: se il suo
   * calcolo può fermare il programma va prima in un nome suo, perché Python calcolerebbe prima il valore. */
  function assegna(r: string, id: string, bersaglio: string, valore: (d: Dato) => string) {
    const e = albero(bersaglio);
    if (e.genere === "nome") {
      corpo.push({ testo: `${r}${e.nome} = ${valore(dati.get(e.nome)!)}`, blocco: id });
      return;
    }
    const nome = (e as { base: { nome: string } }).base.nome;
    ferma = false;
    let i = espressione((e as { indice: Espressione }).indice).t;
    if (ferma) {
      const indice = indiceDelLivello(lingua, cicliPerOgni + 1);
      corpo.push({ testo: `${r}${indice} = ${i}`, blocco: id });
      i = indice;
    }
    corpo.push({ testo: `${r}${nome}[${i}] = ${valore(dati.get(nome)!)}`, blocco: id });
  }

  /** Il salto a una procedura: le righe prima della chiamata (gli indici degli elementi per riferimento e per uscita, il
   * controllo degli elementi dello stesso vettore, gli argomenti che si possono fermare prima di una di quelle righe che
   * si può fermare anche lei), poi la chiamata, che riassegna i parametri per riferimento e per uscita. Un argomento per
   * uscita non si passa: il dato di chi chiama non arriva alla procedura, che lo restituisce. */
  function salto(r: string, b: Extract<Blocco, { kind: "call" }>) {
    const parametri = perNome.get(b.callee)!.data.filter((d) => d.parameter !== undefined);
    type Argomento =
      | { readonly genere: "valore"; readonly testo: string; readonly ferma: boolean }
      | { readonly genere: "nome"; readonly testo: string }
      | { readonly genere: "elemento"; readonly vettore: string; readonly indice: string; readonly scritto: boolean; readonly ferma: boolean };
    const argomenti: Argomento[] = b.arguments.map((testo, k) => {
      const d = parametri[k]!;
      const a = albero(testo);
      ferma = false;
      if (d.parameter === "value") return { genere: "valore", testo: nelDato(a, d), ferma };
      if (a.genere === "nome") return { genere: "nome", testo: a.nome };
      const i = (a as { indice: Espressione }).indice;
      return { genere: "elemento", vettore: (a as { base: { nome: string } }).base.nome, indice: espressione(i).t, scritto: i.genere === "intero", ferma };
    });
    // Due elementi dello stesso vettore, con un indice calcolato: il controllo dopo tutti gli argomenti.
    const perVettore = new Map<string, number[]>();
    argomenti.forEach((a, k) => a.genere === "elemento" && perVettore.set(a.vettore, [...(perVettore.get(a.vettore) ?? []), k]));
    const controlli = [...perVettore.values()].filter((ks) => ks.length > 1 && ks.some((k) => !(argomenti[k] as { scritto: boolean }).scritto));
    // Le righe prima della chiamata che si possono fermare: da quella più a destra, un argomento a sinistra che si può
    // fermare anche lui si calcola prima, nel suo ordine.
    const ultimaCheFerma = controlli.length > 0 ? argomenti.length : argomenti.findLastIndex((a) => a.genere === "elemento" && !a.scritto && a.ferma);
    const passati: string[] = [];
    let indici = 0;
    let valori = 0;
    const riga = (testo: string) => corpo.push({ testo: r + testo, blocco: b.id });
    argomenti.forEach((a, k) => {
      if (a.genere === "elemento" && !a.scritto) {
        const nome = indiceDelLivello(lingua, cicliPerOgni + ++indici);
        riga(`${nome} = ${a.indice}`);
        passati.push(`${a.vettore}[${nome}]`);
      } else if (a.genere === "valore" && a.ferma && k < ultimaCheFerma) {
        const nome = ++valori === 1 ? nomeDelValore[lingua] : `${nomeDelValore[lingua]}${valori}`;
        riga(`${nome} = ${a.testo}`);
        passati.push(nome);
      } else passati.push(a.genere === "elemento" ? `${a.vettore}[${a.indice}]` : a.testo);
    });
    for (const ks of controlli) riga(`${usa("elementiDiversi")}(${ks.map((k) => passati[k]!.slice(passati[k]!.indexOf("[") + 1, -1)).join(", ")})`);
    const chiamata = `${b.callee}(${passati.filter((_, k) => parametri[k]!.parameter !== "out").join(", ")})`;
    const riassegnati = argomenti.flatMap((a, k) => (a.genere === "valore" ? [] : [passati[k]!]));
    riga(riassegnati.length === 0 ? chiamata : `${riassegnati.join(", ")} = ${chiamata}`);
  }

  const leggi = (d: Dato): string => {
    switch (tipoSemplice(d.type)) {
      case "integer":
        return `${usa("leggiIntero")}()`;
      case "real":
        return `${usa("leggiReale")}()`;
      case "character":
        return `${usa("leggiCarattere")}()`;
      case "string":
        return `${usa("leggiStringa")}(${d.max_length ?? lunghezzaPredefinita})`;
      case "boolean":
        return `${usa("leggiBooleano")}()`;
    }
  };

  /** Un valore di quel tipo come lo scrive una scrittura. */
  const comeScritto = (x: string, t: Tipo): string => (t === "real" ? chiamata(usa("reale"), x).t : t === "boolean" ? chiamata(usa("booleano"), x).t : x);
  const scritto = (testo: string): string => {
    const e = albero(testo);
    return comeScritto(espressione(e).t, tipo(e));
  };

  const sequenza = (bs: readonly Blocco[], livello: number) => {
    const r = rientro.repeat(livello);
    // Un ramo o un ciclo senza azioni (vuoto, o coi soli commenti) vuole `pass`.
    if (bs.every((b) => b.kind === "comment")) {
      bs.forEach((b) => blocco(b, livello));
      struttura(`${r}pass`);
      return;
    }
    for (const b of bs) blocco(b, livello);
  };

  function blocco(b: Blocco, livello: number) {
    const r = rientro.repeat(livello);
    const riga = (testo: string) => corpo.push({ testo: r + testo, blocco: b.id });
    switch (b.kind) {
      case "assignment": {
        const v = albero(b.value);
        if (v.genere === "unario" && v.operatore === "to_array") {
          const d = dati.get((albero(b.target) as { nome: string }).nome)!;
          return riga(`${d.name} = ${conArresto("convertiAVettore", espressione(v.operando).t, String(d.size)).t}`);
        }
        if (v.genere === "unario" && v.operatore === "to_string") {
          // Il nome di un vettore di caratteri, o la funzione che lo restituisce.
          const o = v.operando;
          return assegna(r, b.id, b.target, (d) => {
            const s = conArresto("convertiAStringa", espressione(o).t).t;
            const massima = d.max_length ?? lunghezzaPredefinita;
            return misureDi(o).size! > massima ? conArresto("alPiu", s, String(massima)).t : s;
          });
        }
        const t = albero(b.target);
        if (t.genere === "nome" && dati.get(t.nome)!.size !== undefined) {
          const d = dati.get(t.nome)!;
          if (v.genere !== "nome") return riga(`${t.nome} = ${listaNuova(v, d)}`);
          // La copia col nome, elemento per elemento: il `mentre` equivalente, una riga per fase.
          const fase = (testo: string, ...fasi: FaseDelCiclo[]) => corpo.push({ testo, blocco: b.id, fasi });
          const i = indiceDelLivello(lingua, cicliPerOgni + 1);
          const massima = d.max_length ?? lunghezzaPredefinita;
          const elemento = `${v.nome}[${i}]`;
          const lungo = d.type === "string" && (dati.get(v.nome)!.max_length ?? lunghezzaPredefinita) > massima;
          fase(`${r}${i} = 0`, "inizio");
          fase(`${r}while ${i} < ${d.size}:`, "condizione");
          fase(`${r}${rientro}${t.nome}[${i}] = ${lungo ? conArresto("alPiu", elemento, String(massima)).t : elemento}`, "elemento");
          fase(`${r}${rientro}${i} = ${i} + 1`, "passo");
          return;
        }
        return assegna(r, b.id, b.target, (d) => nelDato(v, d));
      }
      case "read":
        return assegna(r, b.id, b.target, leggi);
      case "write": {
        // Un valore che può fermare il programma comincia una `print` nuova: quelli prima restano scritti, come
        // nell'interprete, che scrive un valore alla volta (una `print` calcola tutti i valori prima di scrivere).
        const gruppi: string[][] = [[]];
        for (const v of b.values) {
          ferma = false;
          const x = scritto(v);
          if (ferma && gruppi.at(-1)!.length > 0) gruppi.push([]);
          gruppi.at(-1)!.push(x);
        }
        gruppi.forEach((valori, k) => {
          const sep = valori.length > 1 ? ', sep=""' : "";
          const fine = b.newline && k === gruppi.length - 1 ? "" : ', end=""';
          riga(`print(${valori.join(", ")}${sep}${fine})`);
        });
        return;
      }
      case "if":
        riga(`if ${espressione(albero(b.condition)).t}:`);
        sequenza(b.then, livello + 1);
        if (b.else.length > 0) {
          struttura(`${r}else:`);
          sequenza(b.else, livello + 1);
        }
        return;
      case "while":
        riga(`while ${espressione(albero(b.condition)).t}:`);
        sequenza(b.body, livello + 1);
        return;
      case "repeat":
        struttura(`${r}while True:`);
        b.body.forEach((x) => blocco(x, livello + 1));
        corpo.push({ testo: `${r}${rientro}if not (${espressione(albero(b.condition)).t}):`, blocco: b.id });
        struttura(`${r}${rientro}${rientro}break`);
        return;
      case "for": {
        // Il `mentre` equivalente: la fine si ricalcola a ogni controllo (mai `range`, che la calcola una volta).
        const fase = (testo: string, ...fasi: FaseDelCiclo[]) => corpo.push({ testo, blocco: b.id, fasi });
        const contatore = (albero(b.counter) as { nome: string }).nome;
        const passo = b.step ?? 1;
        fase(`${r}${contatore} = ${espressione(albero(b.from)).t}`, "inizio");
        fase(`${r}while ${contatore} ${passo > 0 ? "<=" : ">="} ${fra(espressione(albero(b.to)), 6)}:`, "condizione");
        b.body.forEach((x) => blocco(x, livello + 1));
        fase(`${r}${rientro}${contatore} = ${contatore} ${passo > 0 ? "+" : "-"} ${Math.abs(passo)}`, "passo");
        return;
      }
      case "for_each": {
        // Un indice nascosto, e la lunghezza della sorgente ricalcolata a ogni controllo (mai `for x in v`).
        const fase = (testo: string, ...fasi: FaseDelCiclo[]) => corpo.push({ testo, blocco: b.id, fasi });
        const elemento = (albero(b.item) as { nome: string }).nome;
        // Il nome di un vettore o di una stringa; una funzione si chiama una volta, alla partenza, e il suo risultato
        // sta in `_sorgente`.
        const s = albero(b.source);
        let sorgente: string;
        let lunghezzaDellaSorgente: number | undefined;
        if (s.genere === "nome") {
          sorgente = s.nome;
          lunghezzaDellaSorgente = dati.get(s.nome)!.max_length;
        } else {
          const g = perNome.get((s as { nome: string }).nome)!;
          sorgente = ++sorgenti === 1 ? nomeDellaSorgente[lingua] : `${nomeDellaSorgente[lingua]}${sorgenti}`;
          lunghezzaDellaSorgente = g.return_max_length;
          fase(`${r}${sorgente} = ${espressione(s).t}`, "inizio");
        }
        const indice = indiceDelLivello(lingua, ++cicliPerOgni);
        // Un elemento stringa che può essere più lungo del dato che lo riceve passa dal controllo.
        const massima = dati.get(elemento)!.max_length ?? lunghezzaPredefinita;
        const lungo = dati.get(elemento)!.type === "string" && (lunghezzaDellaSorgente ?? lunghezzaPredefinita) > massima;
        const preso = lungo ? conArresto("alPiu", `${sorgente}[${indice}]`, String(massima)).t : `${sorgente}[${indice}]`;
        fase(`${r}${indice} = 0`, "inizio");
        fase(`${r}while ${indice} < len(${sorgente}):`, "condizione");
        fase(`${r}${rientro}${elemento} = ${preso}`, "elemento");
        b.body.forEach((x) => blocco(x, livello + 1));
        fase(`${r}${rientro}${indice} = ${indice} + 1`, "passo");
        cicliPerOgni--;
        return;
      }
      case "call":
        return salto(r, b);
      case "comment":
        for (const t of b.text.split(/\r\n|\r|\n/)) riga(t === "" ? "#" : `# ${t}`);
        return;
    }
  }

  // ---------------------------------------------------------------------------------------- le funzioni

  /** Le righe di una funzione del progetto (o del programma principale): l'intestazione, la copia dei vettori senza
   * *rif*, le dichiarazioni, le regole e il ritorno. */
  function scriviFunzione(f: Funzione): Riga[] {
    dati = new Map<string, Dato>([...comuni, ...f.data].map((d) => [d.name, d]));
    corpo = [];
    cicliPerOgni = 0;
    sorgenti = 0;
    fermaLaFunzione = delGiro.has(f);
    const parametri = f.data.filter((d) => d.parameter !== undefined);
    // Quelli che la procedura restituisce: per riferimento e per uscita, nell'ordine dei parametri.
    const riferimenti = parametri.filter((d) => d.parameter === "reference" || d.parameter === "out");
    const ritorno =
      f.kind === "main" ? "None"
      : f.kind === "function" ? annotazioneDelRisultato(f)
      : riferimenti.length === 0 ? "None"
      : riferimenti.length === 1 ? annotazione(riferimenti[0]!)
      : `tuple[${riferimenti.map(annotazione).join(", ")}]`;
    // Un parametro per uscita non si riceve: è un dato senza valore della procedura, dichiarato coi suoi dati.
    const ricevuti = parametri.filter((d) => d.parameter !== "out");
    const intestazione = `def ${f.kind === "main" ? "main" : f.name}(${ricevuti.map((d) => `${d.name}: ${annotazione(d)}`).join(", ")}) -> ${ritorno}:`;
    const copie = parametri.filter((d) => d.parameter === "value" && d.size !== undefined).map((d) => ({ testo: `${rientro}${d.name} = list(${d.name})` }));
    // I dati senza valore iniziale che la funzione passa per riferimento, per nome.
    const passati = new Set(
      tuttiIBlocchi(f.body).flatMap((b) => {
        if (b.kind !== "call") return [];
        const suoi = perNome.get(b.callee)!.data.filter((d) => d.parameter !== undefined);
        return b.arguments.flatMap((a, k) => {
          const e = albero(a);
          return suoi[k]!.parameter === "reference" && e.genere === "nome" ? [e.nome] : [];
        });
      }),
    );
    const propri = f.data.filter((d) => d.parameter === undefined || d.parameter === "out");
    const dichiarazioni = dichiara(propri, rientro, true, passati, f.kind === "main" ? undefined : f.id);
    for (const b of f.body) blocco(b, 1);
    // Una funzione del giro conta la chiamata col suo spazio nella prima riga (e si ferma oltre un tetto, sulla riga della
    // chiamata) e la toglie nell'ultima, dopo il calcolo del valore restituito: se il valore può far partire chiamate del
    // giro, si calcola prima in `_valore`. Lo spazio è quello del nucleo, mai ricalcolato.
    const giro = delGiro.has(f);
    const entrata = giro ? [{ testo: `${rientro}${usa("entraNellaRicorsione")}(${spazioDiUnaChiamata(f, p)})` }] : [];
    const uscita = () => giro && struttura(`${rientro}${usa("esciDallaRicorsione")}(${spazioDiUnaChiamata(f, p)})`);
    const restituisce = (e: Espressione | undefined, valore: string) => {
      if (!(giro && e !== undefined && chiamaIlGiro(e))) {
        uscita();
        corpo.push({ testo: `${rientro}return ${valore}`, blocco: f.end.id });
        return;
      }
      const v = nomeDelValore[lingua];
      corpo.push({ testo: `${rientro}${v} = ${valore}`, blocco: f.end.id });
      uscita();
      corpo.push({ testo: `${rientro}return ${v}`, blocco: f.end.id });
    };
    if (f.kind === "function") {
      // Un vettore torna come lista nuova; una stringa col controllo della lunghezza massima del risultato.
      const e = albero(f.end.return_value!);
      const verso = { type: f.return_type!, ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}) };
      restituisce(e, f.return_size !== undefined ? listaNuova(e, verso) : nelDato(e, verso));
    } else if (riferimenti.length > 0) restituisce(undefined, riferimenti.map((d) => d.name).join(", "));
    else uscita();
    // Senza dichiarazioni, senza copie e senza azioni, il corpo vuole `pass`.
    if (!giro && dichiarazioni.length === 0 && copie.length === 0 && corpo.every((x) => x.testo.trimStart().startsWith("#"))) struttura(`${rientro}pass`);
    if (f.name !== undefined) fermano.set(f.name, fermaLaFunzione);
    return [{ testo: intestazione }, ...entrata, ...copie, ...dichiarazioni, ...corpo];
  }

  /** Il programma principale del programma di prova: legge i parametri, chiama, scrive il risultato. */
  function scriviLaProva(f: Funzione, caso: CasoDiUnaFunzione): Riga[] {
    const letti = parametriDelCaso(f, caso);
    if ("problema" in letti) throw new Error(`il caso ${caso.name} non ha un programma di prova: ${letti.problema}`);
    dati = new Map<string, Dato>([...comuni, ...f.data].map((d) => [d.name, d]));
    const righe: Riga[] = [{ testo: "def main() -> None:" }];
    for (const { dato: d, elementi, ognuno } of letti.parametri) {
      // Un parametro per uscita non si passa: lo dà la chiamata.
      if (d.parameter === "out") continue;
      const uno = (x: "riga" | "nessuno") => (x === "riga" ? leggi(d) : "None");
      const valore = d.size === undefined ? uno(elementi[0]!) : ognuno ? `[${uno(elementi[0]!)}] * ${d.size}` : `[${elementi.map(uno).join(", ")}]`;
      righe.push({ testo: `${rientro}${d.name}: ${annotazione(d)} = ${valore}`, blocco: f.id });
    }
    const parametri = f.data.filter((d) => d.parameter !== undefined);
    const riferimenti = parametri.filter((d) => d.parameter === "reference" || d.parameter === "out");
    const chiamataDiF = `${f.name}(${parametri.filter((d) => d.parameter !== "out").map((d) => d.name).join(", ")})`;
    // La prima chiamata di una funzione del giro si può fermare per lo spazio: la riga che la chiama ha la provenienza
    // della funzione, come le letture dei parametri (l'esecuzione si ferma lì).
    const delCaso = delGiro.has(f) ? { blocco: f.id } : {};
    if (f.kind === "function" && f.return_size !== undefined) {
      // La funzione si chiama una volta, poi una riga per elemento: se si ferma, nulla è scritto.
      const nome = nomeDelRisultato[lingua];
      righe.push({ testo: `${rientro}${nome} = ${chiamataDiF}`, ...delCaso });
      for (let i = 0; i < f.return_size; i++) righe.push({ testo: `${rientro}print("→ [${i}] = ", ${comeScritto(`${nome}[${i}]`, tipoSemplice(f.return_type!))}, sep="")` });
    } else if (f.kind === "function") righe.push({ testo: `${rientro}print("→ ", ${comeScritto(chiamataDiF, tipoSemplice(f.return_type!))}, sep="")`, ...delCaso });
    else if (riferimenti.length === 0) righe.push({ testo: `${rientro}${chiamataDiF}`, ...delCaso });
    else {
      righe.push({ testo: `${rientro}${riferimenti.map((d) => d.name).join(", ")} = ${chiamataDiF}`, ...delCaso }, { testo: `${rientro}print()` });
      for (const d of riferimenti)
        for (const nome of d.size === undefined ? [d.name] : [...Array(d.size).keys()].map((i) => `${d.name}[${i}]`))
          righe.push({ testo: `${rientro}print("${nome} = ", ${comeScritto(nome, tipoSemplice(d.type))}, sep="")` });
    }
    return righe;
  }

  // Le funzioni del programma: tutte, anche quelle che nessuno chiama ancora (si vedono nel codice come nello
  // pseudocodice), o nel programma di prova quella eseguita da sola con quelle che chiama. Si scrivono prima le
  // chiamate (la ricorsione è fuori tappa), per sapere quali possono fermare il programma.
  const radice = prova === undefined ? main : p.functions.find((f) => f.id === prova.funzione)!;
  const chiamate = (f: Funzione) => [...new Set(chiamateDellaFunzione(f).flatMap((c) => c.nomi))].map((x) => perNome.get(x)!);
  const inOrdine: Funzione[] = [];
  const viste = new Set<Funzione>();
  const visita = (f: Funzione) => {
    if (viste.has(f)) return;
    viste.add(f);
    chiamate(f).forEach(visita);
    inOrdine.push(f);
  };
  visita(radice);
  if (prova === undefined) p.functions.forEach(visita);
  const scritte = new Map<Funzione, Riga[]>();
  for (const f of inOrdine) if (prova === undefined || f !== main) scritte.set(f, scriviFunzione(f));
  const delProgramma = p.functions.filter((f) => f.kind !== "main" && scritte.has(f));

  const costanti = dichiara(comuni, "", false);
  const principale = prova === undefined ? segnate(scritte.get(main)!, main.id) : scriviLaProva(radice, prova.caso);

  // --------------------------------------------------------------------------------------- l'insieme

  // Le funzioni usate, con quelle che chiamano.
  for (let cresce = true; cresce; ) {
    cresce = false;
    for (const f of [...usate])
      for (const g of chiama[f] ?? [])
        if (!usate.has(g)) {
          usate.add(g);
          cresce = true;
        }
  }
  for (const f of usate) for (const m of moduli[f] ?? []) altriModuli.add(m);

  // Python legge una delle prime due righe come la codifica del file se contiene `coding:` o `coding=`: nel nome del
  // progetto la parola si separa dai due punti (o dall'uguale) con uno spazio, e il file resta in UTF-8.
  const nome = p.metadata.name.split(/\r\n|\r|\n/).join(" ").replace(/coding(?=[:=])/g, "coding ");
  const righe: Riga[] = [
    { testo: `# ${nome}` },
    { testo: `# ${w.generato}` },
    ...w.nonControllati.map((t) => ({ testo: `# ${t}` })),
    ...[...altriModuli, "sys" as const].sort().map((m) => ({ testo: `import ${m}` })),
  ];
  if (costanti.length > 0) righe.push({ testo: "" }, { testo: `# ${w.costantiComuni}` }, ...costanti);
  righe.push({ testo: "" }, { testo: "" }, ...principale);
  for (const f of delProgramma) righe.push({ testo: "" }, { testo: "" }, ...segnate(scritte.get(f)!, f.id));
  const funzioni = funzioniDiSupporto.filter((f) => usate.has(f));
  const risale = delProgramma.length === 0 ? undefined : ["main", ...delProgramma.map((f) => f.name!)];
  if (funzioni.length > 0) {
    righe.push({ testo: "" }, { testo: "" }, { testo: `# ${w.supporto}` });
    for (const f of funzioni) righe.push({ testo: "" }, { testo: "" }, ...funzione(f, lingua, decimali, riempimento, tetto, risale, usate.has("entraNellaRicorsione")).map((testo) => ({ testo })));
  }
  // L'output e i motivi d'errore in UTF-8 e con l'a capo `\n` anche su Windows, dove uno standard error rediretto
  // scriverebbe nella codifica del sistema (misurato: «più» non arrivava).
  righe.push(
    { testo: "" },
    { testo: "" },
    { testo: 'sys.stdout.reconfigure(encoding="utf-8", newline="\\n")' },
    { testo: 'sys.stderr.reconfigure(encoding="utf-8", newline="\\n")' },
    { testo: "main()" },
  );
  return righe;
}

// -------------------------------------------------------------------------------- le funzioni di supporto

/** Il testo di una funzione di supporto: la riga `def`, la spiegazione, il corpo. `risale`, le funzioni del programma
 * fino a cui `fermati` cerca la riga (senza procedure né funzioni, il solo `main`); `ricorsione`, se il programma ha
 * funzioni del giro: allora `fermati` sa partire da una cornice data. */
function funzione(f: FunzioneDiSupporto, lingua: LinguaDelCodice, decimali: number, riempimento: number, tetto: number, risale: readonly string[] | undefined, ricorsione: boolean): string[] {
  const n = nomiDelSupporto[lingua];
  const w = testi[lingua];
  const m = motiviCol(tetto)[lingua];
  const ferma = (motivo: string) => `${n.fermati}("${motivo}")`;
  // Il tetto e lo spazio si riempiono qui, non dove i testi nascono: il modulo si carica dentro un ciclo d'import
  // (il controllo statico legge il registro, che legge i generatori, che leggono i tetti del controllo).
  const spiegazione = (testo: string) => `    """${testo.split("{tetto}").join(String(tetto)).split("{spazio}").join(String(spazioDellaPila))}"""`;
  const s = (x: Exclude<FunzioneDiSupporto, "reale" | "convertiAVettore">) => spiegazione(spiegazioni[lingua][x]);
  const riga = w.riga;
  /** Una lettura: la riga, la condizione che la rifiuta, il valore. */
  const lettura = (x: "leggiIntero" | "leggiReale" | "leggiCarattere" | "leggiStringa" | "leggiBooleano", firma: string, rifiuta: string, valore: string) => [
    `def ${n[x]}(${firma}`,
    s(x),
    `    ${riga} = ${n.leggiRiga}()`,
    `    if ${rifiuta}:`,
    `        ${ferma(m.invalid_input)}`,
    `    return ${valore}`,
  ];
  switch (f) {
    case "fermati":
      // Con la ricorsione, la cornice da cui si cerca la riga: 1 è chi chiama `fermati`.
      return [
        `def ${n.fermati}(${w.motivo}: str${ricorsione ? `, ${w.cornice}: int = 1` : ""}) -> None:`,
        s(f),
        `    ${w.chiamante} = sys._getframe(${ricorsione ? w.cornice : "1"})`,
        risale === undefined
          ? `    while ${w.chiamante}.f_code.co_name != "main":`
          : `    while ${w.chiamante}.f_code.co_name not in (${risale.map((x) => `"${x}"`).join(", ")}):`,
        `        ${w.chiamante} = ${w.chiamante}.f_back`,
        "    sys.stdout.flush()",
        `    print(f"${w.errore} {${w.chiamante}.f_lineno}: {${w.motivo}}", file=sys.stderr)`,
        "    sys.exit(1)",
      ];
    case "leggiRiga":
      return [
        `def ${n.leggiRiga}() -> str:`,
        s(f),
        `    ${riga} = sys.stdin.buffer.readline()`,
        `    if ${riga} == b"":`,
        `        ${ferma(m.input_exhausted)}`,
        `    if ${riga}.endswith(b"\\n"):`,
        `        ${riga} = ${riga}.removesuffix(b"\\n").removesuffix(b"\\r")`,
        "    try:",
        `        return ${riga}.decode("utf-8")`,
        "    except UnicodeDecodeError:",
        `        ${ferma(m.invalid_input)}`,
      ];
    case "leggiIntero":
      // Gli zeri davanti non passano da `int`, che rifiuta un testo di più di 4300 cifre (e un intero a 32 bit ne ha
      // al più 10): il valore è il segno con le cifre che restano.
      return [
        `def ${n[f]}() -> int:`,
        s(f),
        `    ${riga} = ${n.leggiRiga}()`,
        `    ${w.cifre} = re.fullmatch(r" *([+-]?)0*([0-9]{1,10}) *", ${riga})`,
        `    if ${w.cifre} is None or not -2147483648 <= int(${w.cifre}[1] + ${w.cifre}[2]) <= 2147483647:`,
        `        ${ferma(m.invalid_input)}`,
        `    return int(${w.cifre}[1] + ${w.cifre}[2])`,
      ];
    case "leggiReale":
      return lettura(
        f,
        ") -> float:",
        `re.fullmatch(r" *[+-]?[0-9]{1,}(\\.[0-9]+([eE][+-]?[0-9]+)?)? *", ${riga}) is None or not math.isfinite(float(${riga}))`,
        `float(${riga})`,
      );
    case "leggiCarattere":
      return lettura(f, ") -> str:", `len(${riga}) != 1`, riga);
    case "leggiStringa":
      return lettura(f, "n: int) -> str:", `len(${riga}) > n or chr(0) in ${riga}`, riga);
    case "leggiBooleano":
      return lettura(f, ") -> bool:", `${riga} != "true" and ${riga} != "false"`, `${riga} == "true"`);
    case "dividi":
      return [`def ${n.dividi}(a: int, b: int) -> int:`, s(f), "    q = abs(a) // abs(b)", "    return q if (a < 0) == (b < 0) else -q"];
    case "mod":
      return [`def ${n.mod}(a: int, b: int) -> int:`, s(f), "    r = abs(a) % abs(b)", "    return r if a >= 0 else -r"];
    case "elevatoA":
      return [
        `def ${n.elevatoA}(x: float, y: float) -> float:`,
        s(f),
        "    if math.isfinite(x) and x != 0 and math.isfinite(y) and y == int(y) and abs(y) <= 1100:",
        "        m, d = x.as_integer_ratio()",
        "        k = int(y)",
        "        return m ** k / d ** k if k >= 0 else d ** -k / m ** -k",
        "    return math.pow(x, y)",
      ];
    case "arrotonda":
      return [`def ${n.arrotonda}(x: float) -> float:`, s(f), `    t = ${n.parteIntera}(x)`, "    return t + math.copysign(1.0, x) if abs(x - t) >= 0.5 else t"];
    case "perDifetto":
      return [`def ${n.perDifetto}(x: float) -> float:`, s(f), "    return math.copysign(float(math.floor(x)), x)"];
    case "perEccesso":
      return [`def ${n.perEccesso}(x: float) -> float:`, s(f), "    return math.copysign(float(math.ceil(x)), x)"];
    case "parteIntera":
      return [`def ${n.parteIntera}(x: float) -> float:`, s(f), "    return math.copysign(float(math.trunc(x)), x)"];
    case "convertiACarattere":
      return [
        `def ${n.convertiACarattere}(n: int) -> str:`,
        s(f),
        "    if not 0 <= n <= 0x10FFFF or 0xD800 <= n <= 0xDFFF:",
        `        ${ferma(m.invalid_character_code)}`,
        "    return chr(n)",
      ];
    case "convertiAVettore": {
      const spazio = riempimento === 0x20;
      const testo = {
        it: `I caratteri della stringa, poi ${spazio ? "lo spazio" : "il carattere"} di riempimento fino a n elementi.`,
        en: `The characters of the string, then the padding ${spazio ? "space" : "character"} up to n elements.`,
      }[lingua];
      return [
        `def ${n.convertiAVettore}(s: str, n: int) -> list[str]:`,
        spiegazione(testo),
        "    if len(s) > n:",
        `        ${ferma(m.string_longer_than_array)}`,
        `    return list(s) + [${letteraleStringa([riempimento])}] * (n - len(s))`,
      ];
    }
    case "convertiAStringa":
      return [`def ${n.convertiAStringa}(v: list[str]) -> str:`, s(f), "    if chr(0) in v:", `        ${ferma(m.null_character_in_string)}`, '    return "".join(v)'];
    case "carattereDi":
      return [`def ${n.carattereDi}(s: str, i: int) -> str:`, s(f), "    if not 0 <= i < len(s):", `        ${ferma(m.index_out_of_range)}`, "    return s[i]"];
    case "nellaStringa":
      return [`def ${n.nellaStringa}(c: str) -> str:`, s(f), "    if c == chr(0):", `        ${ferma(m.null_character_in_string)}`, "    return c"];
    case "concatenazione":
      return [`def ${n.concatenazione}(a: str, b: str) -> str:`, s(f), "    if a == chr(0) or b == chr(0):", `        ${ferma(m.null_character_in_string)}`, "    return a + b"];
    case "alPiu":
      return [`def ${n.alPiu}(s: str, n: int) -> str:`, s(f), "    if len(s) > n:", `        ${ferma(m.string_too_long)}`, "    return s"];
    case "elementiDiversi":
      return [`def ${n.elementiDiversi}(*${w.indici}: int) -> None:`, s(f), `    if len(set(${w.indici})) < len(${w.indici}):`, `        ${ferma(m.same_reference)}`];
    case "reale":
      return [
        `def ${n.reale}(x: float) -> str:`,
        spiegazione({ it: `Un reale con ${decimali} decimali, come nel C.`, en: `A real with ${decimali} decimals, as in C.` }[lingua]),
        `    return "%.${decimali}f" % x`,
      ];
    case "booleano":
      return [`def ${n.booleano}(b: bool) -> str:`, s(f), '    return "true" if b else "false"'];
    case "entraNellaRicorsione": {
      // I contatori stanno sopra, a livello del modulo; `fermati` scrive la riga di chi ha chiamato la funzione del giro
      // (la cornice 3: fermati, questa funzione, la funzione del giro, chi la chiama).
      const k = contatoriDellaRicorsione[lingua];
      return [
        `${k.chiamate} = 0`,
        `${k.spazio} = 0`,
        "",
        "",
        `def ${n.entraNellaRicorsione}(${w.spazio}: int) -> None:`,
        s(f),
        `    global ${k.chiamate}, ${k.spazio}`,
        `    ${k.chiamate} += 1`,
        `    ${k.spazio} += ${w.spazio}`,
        `    if ${k.chiamate} > ${tetto}:`,
        `        ${n.fermati}("${m.recursion_too_deep}", 3)`,
        `    if ${k.spazio} > ${spazioDellaPila}:`,
        `        ${n.fermati}("${m.recursion_data_too_large}", 3)`,
      ];
    }
    case "esciDallaRicorsione": {
      const k = contatoriDellaRicorsione[lingua];
      return [`def ${n.esciDallaRicorsione}(${w.spazio}: int) -> None:`, s(f), `    global ${k.chiamate}, ${k.spazio}`, `    ${k.chiamate} -= 1`, `    ${k.spazio} -= ${w.spazio}`];
    }
  }
}
