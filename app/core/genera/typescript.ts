// Il TypeScript di un progetto: un programma che sui casi d'uso dà lo stesso output dell'interprete, eseguito da Node.js
// (o da Bun) così com'è, nella lingua dell'interfaccia (i nomi delle funzioni di supporto, i commenti, i motivi d'errore).
// La semantica resta quella del C, come nel Python: gli interi sono `number` e la divisione fra interi passa da `dividi`,
// che tronca verso lo zero; il resto è `%`, che in JavaScript ha già il segno del dividendo come nel C. I comportamenti
// che il C non definisce non si controllano, e il commento in testa lo dice. Solo sintassi che si cancella togliendo i
// tipi (niente `enum` né `namespace`): il programma resta JavaScript a meno delle annotazioni.
//
// Il generatore sa scrivere le tappe 1, 2, 3 e 4: i dati e le costanti dei
// cinque tipi semplici e i vettori, l'assegnazione (anche a un elemento, e la copia di un vettore col nome), la lettura,
// la scrittura, il commento, `se`, `mentre`, `ripeti`, `per`, `per ogni`, ogni espressione della tappa 1, le procedure e
// le funzioni coi loro programmi di prova, la ricorsione, i record, le matrici, le tabelle.
//
// La forma: il nome del progetto e la testa, gli import da Node (`execSync` per `prepara_console`, e da `node:fs` le sole
// funzioni che leggono e scrivono, isolate in `leggi_riga`, `scrivi` e `fermati`: una pagina nel browser le può
// sostituire), le costanti comuni, `main` (che per prima cosa, se il programma legge, scrive o si ferma, mette la console
// di Windows in UTF-8 come il C: Node la lascia nella code page del sistema) coi dati
// annotati dalla vista dei dati (`let`, o `const` per una costante; un dato senza valore iniziale `let x!: number;`,
// perché `tsc` non lo dica usato prima di avere un valore in un programma valido; il ruolo o «costante» in una colonna
// allineata di commenti), le regole, poi le sole funzioni di supporto che il programma usa (con quelle che chiamano), in
// un ordine fisso, e la chiamata di `main`. Il vettore è un `Array` del tipo dell'elemento: con l'elenco dei valori, col
// valore ripetuto (`new Array<number>(26).fill(0)`) o senza valore (`new Array<string>(6)`: la lunghezza c'è, gli
// elementi no). Il carattere è una stringa di un carattere, come nel Python; la posizione, la lunghezza e il confronto
// d'ordine di carattere e stringa passano dalle funzioni di supporto, che contano i codici (`length` e `<` di JavaScript
// contano le unità UTF-16). Il `ripeti` è `do { … } while (condizione);`, che rivaluta la condizione dopo il corpo.
// Il `per` e il `per ogni` sono il `mentre` equivalente, come nel Python: la fine del `per` e la lunghezza della sorgente
// del `per ogni` si ricalcolano a ogni controllo; il `per ogni` ha l'indice nascosto `_indice` (`_indice2` dentro un
// altro), dichiarato dopo i dati come nel C, e su una stringa prende lunghezza e carattere per codici (`lunghezza`,
// `carattere_di`).
//
// Una scrittura è un testo composto (`` scrivi(`${q} ${r}\n`) ``): un intero, un carattere e una stringa come sono, un
// reale da `reale` (i decimali del progetto sul valore esatto, la metà alla cifra pari, come `printf` del C), un booleano
// da `booleano`, un letterale stringa o carattere dentro il testo coi caratteri che il testo composto protegge. Un valore
// che può fermare il programma comincia una scrittura nuova: quelli prima restano scritti, come nell'interprete.
//
// Lo zero intero: in JavaScript un calcolo fra interi può dare lo zero negativo (`Math.trunc(-1 / 2)`, `-4 % 2`), che da
// intero non si vede e da reale si scriverebbe `-0.00`. L'intero che entra in un reale (un dato reale, una conversione, un
// calcolo misto, una radice, un arrotondamento, la potenza) passa da `converti_a_reale`, che toglie il segno allo zero; un
// letterale intero lì si scrive reale (`5.0`, e `-0` è `0.0`).
//
// Le espressioni si riscrivono dall'albero, non dal testo, con le precedenze di JavaScript (un confronto dentro un
// confronto sta fra parentesi da tutti e due i lati, come nel Python, anche dove JavaScript non le vorrebbe; un meno
// davanti a un meno sta fra parentesi, perché `--` è un altro operatore). Un `===` o `!==` fra due letterali, o fra un
// booleano che `tsc` può aver ristretto e un letterale o un altro booleano così, allarga il tipo del lato sinistro
// (`(p as boolean) === false`, `((p && q) as boolean) === true`): `tsc` rifiuta l'uguaglianza fra due tipi letterali diversi,
// e un booleano assegnato con un letterale ne ha uno, che sia un dato, un campo o un elemento; `!`, `&&` e `||` lo portano con
// sé. Una chiamata e un confronto non si restringono mai.
// L'ordine degli arresti è quello del Python: un carattere che entra in una stringa si controlla dopo il lato destro
// della concatenazione, e se quel lato si può fermare la concatenazione passa da `concatena`. In `v[i] = valore`
// JavaScript calcola l'indice prima del valore, come il flowchart.
//
// Procedure e funzioni come nel Python: la firma coi tipi; una funzione restituisce il suo valore, una procedura coi
// parametri per riferimento o per uscita li restituisce (uno solo com'è, più d'uno in una tupla, `: [number, string]`) e
// la chiamata li riassegna (`a = p(a);`, `[a, n] = p(a);`); un parametro per uscita non si passa, e la procedura lo
// dichiara coi suoi dati. Prima della chiamata le righe del Python: l'indice di un elemento per riferimento in
// `_indice`, il controllo `elementi_diversi`, l'argomento che si ferma prima di una di quelle righe in `_valore`. Un
// vettore per valore la funzione chiamata lo copia per prima cosa (`w = Array.from(w);`); il risultato vettore è una
// lista nuova (`Array.from(r)`, coi controlli `r.map((_elemento) => al_piu(_elemento, 6))`). JavaScript vuole dichiarati
// col tipo i nomi del generatore: in testa alla funzione, dopo i dati, come nel C (`_indice` uno per livello, `_valore`
// uno per tipo libero nell'istruzione, `_sorgente` uno per `per ogni` su una funzione). Il valore restituito che è la
// chiamata di una funzione che si può fermare si calcola prima in `_valore`: restituito così sarebbe una chiamata in
// coda, e JavaScriptCore (Bun), che le fa in ogni modulo, toglierebbe la cornice della funzione dalla pila; così anche la
// chiamata di una funzione del giro, che al tetto si ferma sulla riga di chi la chiama.
//
// La ricorsione come nel Python: la prima riga delle sole funzioni del giro (`funzioniDelGiro`) conta la chiamata col suo
// spazio (`entra_nella_ricorsione`, lo spazio di `spazioDiUnaChiamata`) e si ferma oltre un tetto; l'ultima la toglie
// (`esci_dalla_ricorsione`), dopo il valore restituito, calcolato prima in `_valore` se può far partire chiamate del giro
// (`funzioniVersoIlGiro`). I due contatori stanno a livello del modulo. La riga dell'arresto è quella della chiamata:
// `fermati(motivo, 1)` salta la cornice della funzione del giro che si ferma e prende quella di chi la chiama (le cornici
// del programma, non le righe della pila, che in Bun perde quelle delle chiamate in coda).
//
// I record come nel Python, ma con una classe di TypeScript per record (dopo gli import): ogni campo col suo tipo e senza
// valore finché non ne ha uno (`nome!: string;`, come un dato senza valore iniziale: annotato `string | undefined`, come il
// `str | None` del Python, `tsc` rifiuterebbe `x.voto + 1`), il costruttore coi parametri facoltativi nell'ordine dei
// campi. Il campo si scrive `a.voto` come nel flowchart. Nessun record è mai condiviso da due dati: la copia col nome
// (`b ← a`) una riga per campo, ognuna col campo che copia; un record per valore la funzione chiamata lo copia per prima
// cosa (`x = new alunno(x.nome, x.classe, x.voto);`); un record restituito dal suo nome torna come un oggetto nuovo, da
// una funzione è già nuovo; per riferimento e per uscita la procedura lo restituisce, come gli altri dati. Un campo per
// riferimento è come un dato (`a.voto = raddoppia(a.voto);`).
//
// Le matrici come nel Python: un `Array` di `Array` (`number[][]`), ogni riga un `Array` suo, come la comprensione del
// Python (`Array.from({ length: 2 }, () => new Array<number>(3))`, mai `new Array(2).fill(riga)`, che ripete la stessa
// riga), e nessuna riga è mai condivisa da due dati: per valore e nel risultato dal nome la matrice si copia riga per riga
// (`x = x.map((_riga) => Array.from(_riga));`). La copia col nome (`b ← a`) è il `mentre` delle righe con dentro quello
// delle colonne, una riga per fase, quelle del ciclo delle colonne `interno`. La riga `m[i]` è un vettore dovunque ne va
// uno: si copia come un vettore (`Array.from(m[i])`, il `mentre` della copia col nome), si passa e si percorre col «per
// ogni»; l'indice di una riga che non è un numero né un nome si calcola una volta, nella partenza della copia, e nel «per
// ogni» l'indice della riga scelta sta in `_sorgente`. L'elemento `m[i][j]` si legge e si assegna così; JavaScript calcola
// gli indici prima del valore, come il flowchart.
//
// Le tabelle come nel Python: un `Array` di oggetti della classe (`alunno[]`), ogni record un oggetto suo, come la
// comprensione del Python (`Array.from({ length: 3 }, () => new alunno())`, mai `new Array(3).fill(new alunno())`, che ripete
// lo stesso oggetto), e nessun record è mai condiviso da due dati: per valore e nel risultato dal nome la tabella si copia
// record per record col costruttore (`x = x.map((_elemento) => new alunno(_elemento.nome, _elemento.voto));`). La copia col
// nome (`u ← t`) è il ciclo dei record con una riga per campo. Il record `t[i]` è un record dovunque ne va uno: `r ← t[i]`,
// `t[i] ← r` e `t[i] ← t[j]` una riga per campo (l'indice che non è un numero né un nome calcolato una volta, come
// nell'interprete), restituito un oggetto nuovo; nel «per ogni» l'elemento è un oggetto nuovo dal costruttore. Il campo
// `t[i].nome` per riferimento è un elemento della tabella col suo campo (`elementi_diversi` col campo).
//
// Un arresto scrive «Errore alla riga N: motivo» sullo standard error ed esce con 1: `fermati` trova la riga nella pila
// delle chiamate (`new Error().stack`), alla prima chiamata dentro `main` o dentro un'altra funzione del programma, come
// il Python che risale le cornici; una cornice nativa di Bun (`at map (native:1:11)`) non è mai del programma.
//
// La provenienza delle righe è quella del Python: la riga di un blocco ha quel blocco (la condizione del `ripeti` sulla
// riga del `while` in fondo; le righe di un `per` e di un `per ogni` anche la loro fase), la dichiarazione di un dato
// ha il dato, le righe di struttura (`function main(): void {`, la chiamata di `prepara_console`, gli indici nascosti
// dichiarati, `} else {`, `do {`, le graffe, la testa) e le funzioni di supporto nessuna; le righe di ogni funzione del
// programma sono segnate come sue, e la dichiarazione di un suo dato ha anche la funzione. Il `return` ha il blocco della
// fine. Il programma di prova legge i parametri con la provenienza della funzione, come il Python.
//
// Che cosa NON fa: controllare un intero oltre i 32 bit, la divisione per zero, l'indice di un vettore, il reale fuori
// dall'intervallo degli interi convertito in intero, il dato senza valore, il reale non finito; le ultime cifre di
// `elevato_a` con un esponente non intero o oltre 1100 sono quelle di `Math.pow`, non quelle dell'interprete.

import { chiamateDellaFunzione, chiamateIn, funzioniDelGiro, funzioniVersoIlGiro, lunghezzaPredefinita, type Tetti } from "../controllo/controllo";
import { lunghezzaMassima as lunghezzaMassimaNelNucleo } from "../controllo/lunghezza";
import { spazioDellaPila, spazioDiUnaChiamata, tettoDelleChiamate } from "../controllo/spazio";
import { analizza, type Espressione } from "../espressioni/analizzatore";
import { eUnaCopiaDiUnRecord, nomiDeiRecord, nomiDelleTabelle } from "../progetto/copia";
import { opzioniPredefinite, tipoSemplice, type Blocco, type Campo, type CasoDiUnaFunzione, type Dato, type Funzione, type Progetto, type Tipo, type TipoDelDato } from "../progetto/modello";
import type { FaseDelCiclo } from "../interprete/interprete";
import { controlliDegliElementi, genera, parametriDelCaso, posizioni, segnate, type Generato, type Riga } from "./forma";
import { motiviCol } from "./motivi";
import { contatoriDellaRicorsione, indiceDelLivello, nomeDelRisultato, nomeDellaRigaCopiata, nomeDellaSorgente, nomeDellElemento, nomeDelValore, nomiDelSupporto, nomiDelSupportoDelTypeScript, type LinguaDelCodice } from "./nomi";
import type { NoteDeiDati, Prova } from "./python";

export function typescript(p: Progetto, limiti: Tetti, lingua: LinguaDelCodice, note: NoteDeiDati, prova?: Prova): Generato {
  return genera(p, limiti, (q) => righeDelTypeScript(q, lingua, note, prova));
}

const rientro = "  ";

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
  },
} as const;

/** Le funzioni di supporto del TypeScript, nell'ordine in cui il programma le scrive. */
const supportoInOrdine = [
  "preparaConsole", "fermati", "leggiRiga", "leggiIntero", "leggiReale", "leggiCarattere", "leggiStringa", "leggiBooleano", "dividi",
  "convertiAReale", "elevatoA", "arrotonda", "convertiACarattere", "convertiAVettore", "convertiAStringa", "carattereDi",
  "lunghezza", "confronta", "nellaStringa", "concatenazione", "alPiu", "elementiDiversi", "reale", "booleano", "scrivi",
  "entraNellaRicorsione", "esciDallaRicorsione",
] as const;
type Supporto = (typeof supportoInOrdine)[number];

/** I nomi delle funzioni di supporto in una lingua: quelli comuni agli altri linguaggi, e quelli del solo TypeScript. */
const nomiIn = (lingua: LinguaDelCodice): Readonly<Record<Supporto, string>> =>
  Object.fromEntries(
    supportoInOrdine.map((f) => [f, f in nomiDelSupportoDelTypeScript[lingua] ? nomiDelSupportoDelTypeScript[lingua][f as keyof (typeof nomiDelSupportoDelTypeScript)["it"]] : nomiDelSupporto[lingua][f as Exclude<Supporto, keyof (typeof nomiDelSupportoDelTypeScript)["it"]>]]),
  ) as Record<Supporto, string>;

/** Le funzioni di supporto che ognuna chiama: il programma scrive anche quelle. */
const chiama: Partial<Record<Supporto, readonly Supporto[]>> = {
  leggiRiga: ["fermati"],
  leggiIntero: ["leggiRiga", "fermati"],
  leggiReale: ["leggiRiga", "fermati"],
  leggiCarattere: ["leggiRiga", "lunghezza", "fermati"],
  leggiStringa: ["leggiRiga", "lunghezza", "fermati"],
  leggiBooleano: ["leggiRiga", "fermati"],
  convertiACarattere: ["fermati"],
  convertiAVettore: ["fermati"],
  convertiAStringa: ["fermati"],
  carattereDi: ["fermati"],
  nellaStringa: ["fermati"],
  concatenazione: ["fermati"],
  alPiu: ["lunghezza", "fermati"],
  elementiDiversi: ["fermati"],
  entraNellaRicorsione: ["fermati"],
};

/** Gli a capo di una riga di testo: quelli di una fine riga, e i due separatori di Unicode che in JavaScript chiudono un
 * commento `//`. */
const aCapo = new RegExp(`\\r\\n|[\\r\\n${String.fromCharCode(0x2028, 0x2029)}]`);

const albero = (testo: string): Espressione => {
  const a = analizza(testo);
  // Il controllo statico ha già provato sintassi e tipi: qui non ci sono errori.
  if (!a.ok) throw new Error(`espressione non analizzabile dopo il controllo: ${testo}`);
  return a.espressione;
};

// ------------------------------------------------------------------------------------------------ i letterali

/** Un codice di un letterale fra `apice`: le sequenze di JavaScript, i caratteri di controllo in esadecimale, i due
 * separatori di Unicode con la loro sequenza (scritti, sarebbero un a capo per chi legge il file). */
function nelLetterale(codice: number, apice: string): string {
  const c = String.fromCodePoint(codice);
  if (c === "\\" || c === apice) return `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (codice < 0x20 || codice === 0x7f) return `\\x${codice.toString(16).padStart(2, "0")}`;
  if (codice === 0x2028 || codice === 0x2029) return `\\u${codice.toString(16)}`;
  return c;
}
const letteraleCarattere = (codice: number) => `'${nelLetterale(codice, "'")}'`;
const letteraleStringa = (codici: readonly number[]) => `"${codici.map((c) => nelLetterale(c, '"')).join("")}"`;

/** Un reale dal suo valore: le cifre più corte che lo rileggono uguale, con il punto se mancano. */
function letteraleReale(x: number): string {
  const t = String(x);
  return /[.e]/.test(t) ? t : `${t}.0`;
}

/** Un codice in un testo composto: i caratteri che il testo composto legge a modo suo, quelli di controllo e i due
 * separatori di Unicode. */
function nelTesto(codice: number): string {
  const c = String.fromCodePoint(codice);
  if (c === "`" || c === "\\" || c === "$") return `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (c === "\r") return "\\r";
  if (codice < 0x20 || codice === 0x7f) return `\\x${codice.toString(16).padStart(2, "0")}`;
  if (codice === 0x2028 || codice === 0x2029) return `\\u${codice.toString(16)}`;
  return c;
}

// ------------------------------------------------------------------------------------------- il programma

function righeDelTypeScript(p: Progetto, lingua: LinguaDelCodice, note: NoteDeiDati, prova: Prova | undefined): Riga[] {
  const w = testi[lingua];
  const nomi = nomiIn(lingua);
  const main = p.functions.find((f) => f.kind === "main")!;
  const comuni = p.shared_constants ?? [];
  const perNome = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  const decimali = p.options?.real_decimals ?? opzioniPredefinite.real_decimals;
  const riempimento = (p.options?.fill_character ?? opzioniPredefinite.fill_character).codePointAt(0)!;
  const tetto = tettoDelleChiamate(p);

  const usate = new Set<Supporto>();
  const usa = (f: Supporto): string => {
    usate.add(f);
    return nomi[f];
  };

  /** I dati della funzione che si scrive, con le costanti comuni. */
  let dati = new Map<string, Dato>();
  /** Le funzioni del progetto che possono fermare il programma, per nome: si scrivono prima quelle chiamate. */
  // Quelle del giro possono sempre (i tetti della ricorsione), e si sa prima di scriverle: in un giro non si può scrivere
  // prima chi è chiamato.
  const delGiro = funzioniDelGiro(p);
  const fermano = new Map<string, boolean>([...delGiro].map((f) => [f.name!, true]));
  /** Se la funzione che si scrive può fermare il programma. */
  let fermaLaFunzione = false;

  // ------------------------------------------------------------------------------------------- i tipi

  /** I record del progetto, per nome, e i campi di un record. */
  const records = new Map((p.records ?? []).map((r) => [r.name, r]));
  const campiDi = (record: string | undefined): readonly Campo[] => records.get(record ?? "")!.fields;
  /** Il record dei record di una tabella intera: il nome di una tabella, o una funzione che ne restituisce una. */
  const tabellaDi = (e: Espressione): string | undefined =>
    e.genere === "nome" ? (dati.get(e.nome)!.size !== undefined ? dati.get(e.nome)!.record : undefined)
    : e.genere === "chiamata" ? (perNome.get(e.nome)?.return_size !== undefined ? perNome.get(e.nome)?.return_record : undefined)
    : undefined;
  /** Il record di un'espressione che ne dà uno intero: il nome di un dato record, una funzione che lo restituisce, o un
   * record di una tabella (`t[i]`, anche di quella restituita da una funzione). */
  const recordDi = (e: Espressione): string | undefined =>
    e.genere === "nome" ? (dati.get(e.nome)!.size === undefined ? dati.get(e.nome)!.record : undefined)
    : e.genere === "chiamata" ? (perNome.get(e.nome)?.return_size === undefined ? perNome.get(e.nome)?.return_record : undefined)
    : e.genere === "indice" ? tabellaDi(e.base)
    : undefined;
  /** Un record nuovo dai campi di `x`, col costruttore della sua classe: la copia di un record, che non è mai lo stesso
   * oggetto. */
  const costruttore = (record: string, x: string) => `new ${record}(${campiDi(record).map((c) => `${x}.${c.name}`).join(", ")})`;
  /** Il campo di un'espressione `base.campo`: la base è un dato record o una funzione che restituisce un record. */
  const campoDi = (e: Extract<Espressione, { genere: "campo" }>): Campo => campiDi(recordDi(e.base)).find((c) => c.name === e.campo)!;

  /** Una matrice intera: il nome di una matrice, o una funzione che la restituisce. */
  const matrice = (e: Espressione) =>
    e.genere === "nome" ? dati.get(e.nome)!.columns !== undefined : e.genere === "chiamata" && perNome.get(e.nome)?.return_columns !== undefined;
  /** Un vettore intero: il nome di un vettore (una matrice è un vettore di righe), una funzione che lo restituisce, o la
   * riga di una matrice. */
  const vettore = (e: Espressione): boolean =>
    e.genere === "nome" ? dati.get(e.nome)!.size !== undefined
    : e.genere === "chiamata" ? perNome.get(e.nome)?.return_size !== undefined
    : e.genere === "indice" && matrice(e.base);
  /** La dimensione (le colonne, per una matrice), le righe e la lunghezza massima degli elementi di un vettore intero, o di
   * una stringa, come per un dato: la riga di una matrice ha la dimensione delle sue colonne. */
  const misureDi = (e: Espressione): Pick<Dato, "size" | "columns" | "max_length"> => {
    if (e.genere === "nome") return dati.get(e.nome)!;
    if (e.genere === "indice") {
      const m = misureDi(e.base);
      return { size: m.columns!, ...(m.max_length !== undefined ? { max_length: m.max_length } : {}) };
    }
    const f = perNome.get((e as { nome: string }).nome)!;
    return {
      ...(f.return_size !== undefined ? { size: f.return_size } : {}),
      ...(f.return_columns !== undefined ? { columns: f.return_columns } : {}),
      ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}),
    };
  };

  function tipo(e: Espressione): TipoDelDato {
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
      case "campo":
        return campoDi(e).type;
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
        const op = e.operatore;
        if (op !== "+" && op !== "-" && op !== "*" && op !== "/") return op === "mod" ? "integer" : op === "raised_to" ? "real" : "boolean";
        const [s, d] = [tipo(e.sinistro), tipo(e.destro)];
        if (op === "+" && (s === "string" || d === "string")) return "string";
        return s === "integer" && d === "integer" ? "integer" : "real";
      }
      default:
        // Ogni genere ha il suo ramo: questo non si raggiunge.
        throw new Error(`espressione sconosciuta: ${(e as { genere: string }).genere}`);
    }
  }

  /** La lunghezza massima che una stringa può avere. */
  const lunghezzaMassima = (e: Espressione): number => lunghezzaMassimaNelNucleo(e, (n) => dati.get(n), (n) => perNome.get(n), campoDi);

  /** Un carattere che può essere quello di codice 0: un dato, il campo di un record, un elemento di un vettore, una
   * conversione da intero, ciò che una funzione restituisce. Un letterale non lo è (sarebbe un errore statico), e nemmeno
   * un carattere preso da una stringa. */
  function puoEssereZero(e: Espressione): boolean {
    if (e.genere === "nome" || e.genere === "chiamata" || e.genere === "campo") return true;
    if (e.genere === "indice") return vettore(e.base);
    if (e.genere === "unario" && e.operatore === "to_character") return tipo(e.operando) === "integer" || puoEssereZero(e.operando);
    return false;
  }

  // ------------------------------------------------------------------------------------- le espressioni

  /** Il testo di TypeScript e la forza con cui tiene il suo operatore (più alta, più stretta), come le precedenze di
   * JavaScript: 20 un operando, una chiamata o un elemento; 15 il meno e `!`; 12 `*`, `/` e `%`; 11 `+` e `-`; 10 i
   * confronti d'ordine; 9 `===` e `!==`; 5 `&&`; 4 `||`. Con `coda`, il testo è la chiamata di una funzione che si può
   * fermare: restituita così, sarebbe una chiamata in coda (Bun toglie la cornice di chi la restituisce). */
  type Testo = { readonly t: string; readonly forza: number; readonly coda?: true };
  const operando = (t: string): Testo => ({ t, forza: 20 });
  const chiamata = (f: string, ...argomenti: string[]): Testo => operando(`${f}(${argomenti.join(", ")})`);
  const fra = (x: Testo, forza: number) => (x.forza < forza ? `(${x.t})` : x.t);
  /** Dice se il calcolo può fermare il programma per una regola del linguaggio (una funzione di supporto, o una funzione
   * del progetto che può). */
  let ferma = false;
  const conArresto = (f: Supporto, ...argomenti: string[]): Testo => {
    ferma = true;
    fermaLaFunzione = true;
    return { ...chiamata(usa(f), ...argomenti), coda: true };
  };

  /** Un booleano che `tsc` può aver ristretto a `true` o `false` (misurato): un letterale, un dato, un campo, un elemento,
   * con `!`, `&&` e `||` davanti o intorno. Una chiamata e un confronto no (un numero e una stringa non si restringono mai). */
  const ristretto = (e: Espressione): boolean =>
    e.genere === "booleano" || ((e.genere === "nome" || e.genere === "campo" || e.genere === "indice") && tipo(e) === "boolean") ||
    (e.genere === "unario" && e.operatore === "not" && ristretto(e.operando)) ||
    (e.genere === "binario" && (e.operatore === "and" || e.operatore === "or") && (ristretto(e.sinistro) || ristretto(e.destro)));
  /** Un lato che `tsc` può vedere col tipo letterale: un letterale (col meno davanti) o un booleano ristretto. */
  const letteraleOBooleano = (e: Espressione): boolean =>
    e.genere === "intero" || e.genere === "reale" || e.genere === "carattere" || e.genere === "stringa" ||
    (e.genere === "unario" && e.operatore === "-" && (e.operando.genere === "intero" || e.operando.genere === "reale")) ||
    ristretto(e);
  const tipoDiTypeScript = (t: TipoDelDato) => (t === "boolean" ? "boolean" : t === "integer" || t === "real" ? "number" : "string");

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
        return operando(e.valore ? "true" : "false");
      case "pi":
        return operando("Math.PI");
      case "nome":
        return operando(e.nome);
      case "indice":
        // L'elemento di un vettore, anche di quello restituito da una funzione (prima la chiamata, poi l'indice: non
        // controllato, come nel C); il carattere di una stringa, controllato.
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
        // Una funzione del giro si ferma al tetto sulla riga di chi la chiama: restituita così, sarebbe in coda.
        return delGiro.has(perNome.get(e.nome)!) ? { ...chiamata(e.nome, ...argomenti), coda: true } : chiamata(e.nome, ...argomenti);
      }
      case "campo":
        // Il campo di un dato, o del record restituito da una funzione: prima la chiamata, poi il campo (non è in coda).
        return operando(`${espressione(e.base).t}.${e.campo}`);
      case "unario":
        return unario(e.operatore, e.operando);
      case "binario":
        return binario(e);
      default:
        // Ogni genere ha il suo ramo: questo non si raggiunge.
        throw new Error(`espressione sconosciuta: ${(e as { genere: string }).genere}`);
    }
  }

  /** Un valore che entra in un reale: un intero passa da `converti_a_reale` (lo zero intero non ha segno), un letterale
   * intero si scrive reale (`-0` è `0.0`). */
  function nelReale(e: Espressione): Testo {
    if (tipo(e) !== "integer") return espressione(e);
    if (e.genere === "intero") return operando(`${e.valore}.0`);
    if (e.genere === "unario" && e.operatore === "-" && e.operando.genere === "intero") return e.operando.valore === 0 ? operando("0.0") : { t: `-${e.operando.valore}.0`, forza: 15 };
    return chiamata(usa("convertiAReale"), espressione(e).t);
  }

  function unario(op: string, o: Espressione): Testo {
    const t = tipo(o);
    switch (op) {
      case "-": {
        const x = espressione(o);
        // Un meno davanti a un meno: `--` sarebbe il decremento.
        return { t: x.t.startsWith("-") ? `-(${x.t})` : `-${fra(x, 15)}`, forza: 15 };
      }
      case "not":
        return { t: `!${fra(espressione(o), 15)}`, forza: 15 };
      case "to_integer": {
        const x = espressione(o);
        return t === "integer" ? x : t === "character" ? operando(`${fra(x, 20)}.codePointAt(0)!`) : chiamata("Math.trunc", x.t);
      }
      case "to_real":
        return nelReale(o);
      case "to_character": {
        const x = espressione(o);
        return t === "character" ? x : conArresto("convertiACarattere", x.t);
      }
      case "length":
        return chiamata(usa("lunghezza"), espressione(o).t);
      case "absolute_value":
        return chiamata("Math.abs", espressione(o).t);
      case "square_root":
        return chiamata("Math.sqrt", nelReale(o).t);
      case "round":
        return chiamata(usa("arrotonda"), nelReale(o).t);
      case "round_down":
        return chiamata("Math.floor", nelReale(o).t);
      case "round_up":
        return chiamata("Math.ceil", nelReale(o).t);
      case "integer_part":
        return chiamata("Math.trunc", nelReale(o).t);
      default:
        // `to_array` e `to_string` sono solo il lato destro intero di un'assegnazione.
        throw new Error(`operatore fuori dal controllo: ${op}`);
    }
  }

  const ordine: Readonly<Record<string, string>> = { "<": "<", "<=": "<=", ">": ">", ">=": ">=" };

  function binario(e: Extract<Espressione, { genere: "binario" }>): Testo {
    const op = e.operatore;
    const [ts, td] = [tipo(e.sinistro), tipo(e.destro)];
    if (op === "/" && ts === "integer" && td === "integer") return chiamata(usa("dividi"), espressione(e.sinistro).t, espressione(e.destro).t);
    if (op === "mod") return { t: `${fra(espressione(e.sinistro), 12)} % ${fra(espressione(e.destro), 13)}`, forza: 12 };
    if (op === "raised_to") return chiamata(usa("elevatoA"), nelReale(e.sinistro).t, nelReale(e.destro).t);
    if (op === "+" && tipo(e) === "string") {
      const zero = (x: Espressione) => tipo(x) === "character" && puoEssereZero(x);
      if (zero(e.sinistro)) {
        // Il carattere a sinistra si controlla dopo il lato destro: se quel lato si può fermare, prima lui.
        const l = espressione(e.sinistro);
        const prima = ferma;
        ferma = false;
        const r = espressione(e.destro);
        const destraFerma = ferma;
        ferma = prima || destraFerma;
        if (destraFerma) return conArresto("concatenazione", l.t, r.t);
        return { t: `${conArresto("nellaStringa", l.t).t} + ${fra(zero(e.destro) ? conArresto("nellaStringa", r.t) : r, 12)}`, forza: 11 };
      }
      const lato = (x: Espressione): Testo => (zero(x) ? conArresto("nellaStringa", espressione(x).t) : espressione(x));
      const l = lato(e.sinistro);
      const r = lato(e.destro);
      return { t: `${fra(l, 11)} + ${fra(r, 12)}`, forza: 11 };
    }
    if (op === "+" || op === "-" || op === "*" || op === "/") {
      // Un calcolo fra reali: l'intero di un lato entra in un reale.
      const reali = tipo(e) === "real";
      const l = reali ? nelReale(e.sinistro) : espressione(e.sinistro);
      const r = reali ? nelReale(e.destro) : espressione(e.destro);
      const forza = op === "*" || op === "/" ? 12 : 11;
      return { t: `${fra(l, forza)} ${op} ${fra(r, forza + 1)}`, forza };
    }
    if (op === "and" || op === "or") {
      const forza = op === "and" ? 5 : 4;
      return { t: `${fra(espressione(e.sinistro), forza)} ${op === "and" ? "&&" : "||"} ${fra(espressione(e.destro), forza + 1)}`, forza };
    }
    // Un confronto. Un confronto dentro un confronto va fra parentesi da tutti e due i lati.
    const l = espressione(e.sinistro);
    const r = espressione(e.destro);
    const testuale = ts === "character" || ts === "string";
    if (Object.hasOwn(ordine, op)) {
      // Fra caratteri e stringhe l'ordine è quello dei codici: `<` di JavaScript confronta le unità UTF-16.
      if (testuale) return { t: `${usa("confronta")}(${l.t}, ${r.t}) ${ordine[op]} 0`, forza: 10 };
      return { t: `${fra(l, 11)} ${ordine[op]} ${fra(r, 11)}`, forza: 10 };
    }
    // `tsc` rifiuta l'uguaglianza fra due tipi letterali diversi (TS2367): due letterali, o un booleano che un letterale
    // assegnato prima restringe a `true` o `false`. Il lato sinistro allarga il suo tipo con `as`, che lega più di `&&` e `||`.
    const sinistro = letteraleOBooleano(e.sinistro) && letteraleOBooleano(e.destro) ? operando(`(${fra(l, 15)} as ${tipoDiTypeScript(ts)})`) : l;
    return { t: `${fra(sinistro, 11)} ${op === "==" ? "===" : "!=="} ${fra(r, 11)}`, forza: 9 };
  }

  /** Un valore che va in un dato del tipo `verso`: un intero in un reale diventa reale; una stringa che può superare la
   * lunghezza massima del dato passa dal controllo. */
  function nelDatoTesto(e: Espressione, verso: Pick<Dato, "type" | "size" | "max_length">): Testo {
    if (verso.type === "real") return nelReale(e);
    const x = espressione(e);
    const massima = verso.max_length ?? lunghezzaPredefinita;
    if (verso.type === "string" && !(verso.size !== undefined && vettore(e)) && lunghezzaMassima(e) > massima) return conArresto("alPiu", x.t, String(massima));
    return x;
  }
  const nelDato = (e: Espressione, verso: Pick<Dato, "type" | "size" | "max_length">): string => nelDatoTesto(e, verso).t;

  /** Un vettore intero che va in un dato o nel risultato di una funzione (`verso`): una lista nuova. Dal nome di un
   * vettore, o da una riga di una matrice, la copia (`Array.from`, il `list` del Python); con gli elementi stringa che
   * possono essere più lunghi di quelli di `verso`, ognuno dal controllo (`map`, la comprensione del Python); da una
   * funzione è già nuovo. Una matrice dal suo nome si copia riga per riga (`x.map((_riga) => Array.from(_riga))`), una
   * tabella record per record, ognuno col costruttore. */
  function listaNuova(e: Espressione, verso: Pick<Dato, "type" | "max_length">): Testo {
    const x = espressione(e);
    const tabella = tabellaDi(e);
    if (tabella !== undefined) return e.genere === "nome" ? operando(`${x.t}.map((${nomeDellElemento[lingua]}) => ${costruttore(tabella, nomeDellElemento[lingua])})`) : x;
    const massima = verso.max_length ?? lunghezzaPredefinita;
    const lungo = verso.type === "string" && (misureDi(e).max_length ?? lunghezzaPredefinita) > massima;
    const elemento = nomeDellElemento[lingua];
    const riga = nomeDellaRigaCopiata[lingua];
    if (matrice(e)) {
      if (lungo) return { t: `${fra(x, 20)}.map((${riga}) => ${riga}.map((${elemento}) => ${conArresto("alPiu", elemento, String(massima)).t}))`, forza: 20, coda: true };
      return e.genere === "nome" ? operando(`${x.t}.map((${riga}) => Array.from(${riga}))`) : x;
    }
    if (lungo) return { t: `${fra(x, 20)}.map((${elemento}) => ${conArresto("alPiu", elemento, String(massima)).t})`, forza: 20, coda: true };
    return e.genere === "nome" || e.genere === "indice" ? operando(`Array.from(${x.t})`) : x;
  }

  /** Un record intero che va in un risultato: dal nome di un record, o da un record di una tabella, un oggetto nuovo, campo
   * per campo; da una funzione è già nuovo. L'indice di un record di una tabella che non è un numero né un nome si calcola
   * una volta prima, in una riga del blocco `id`. */
  function recordNuovo(e: Espressione, id: string): Testo {
    if (e.genere === "indice") return operando(costruttore(recordDi(e)!, recordDellaTabella(rientro, id, e)));
    return e.genere === "nome" ? operando(costruttore(recordDi(e)!, e.nome)) : espressione(e);
  }

  /** Il testo di un record di una tabella (`t[i]`) letto più volte: con un indice che non è un numero né un nome, calcolato
   * una volta prima in un nome suo (`calcolati` conta quelli già presi dalla stessa regola), in una riga del blocco `id`
   * (col `campo` 0 nella copia campo per campo, la cui prima azione calcola gli indici). */
  function recordDellaTabella(r: string, id: string, e: Extract<Espressione, { genere: "indice" }>, calcolati = 0, campo?: number): string {
    const nome = (e.base as { nome: string }).nome;
    if (e.indice.genere === "intero" || e.indice.genere === "nome") return `${nome}[${espressione(e.indice).t}]`;
    const indice = indiceAl(cicliPerOgni + calcolati + 1);
    corpo.push({ testo: `${r}${indice} = ${espressione(e.indice).t};`, blocco: id, ...(campo !== undefined ? { campo } : {}) });
    return `${nome}[${indice}]`;
  }

  // ---------------------------------------------------------------------------------------- le dichiarazioni

  const annotazioneDelTipo = (t: Tipo) => ({ integer: "number", real: "number", character: "string", string: "string", boolean: "boolean" })[t];
  /** Il tipo di un dato, o degli elementi di un vettore: un record col nome della sua classe. */
  const delTipo = (t: TipoDelDato, record: string | undefined) => (t === "record" ? record! : annotazioneDelTipo(t));
  /** Il tipo di un dato, di un vettore (`number[]`) o di una matrice (`number[][]`). */
  const forma = (t: string, size: number | undefined, columns: number | undefined) => `${t}${size === undefined ? "" : columns === undefined ? "[]" : "[][]"}`;
  const annotazione = (d: Dato) => forma(delTipo(d.type, d.record), d.size, d.columns);
  const annotazioneDelRisultato = (f: Funzione) => forma(delTipo(f.return_type!, f.return_record), f.return_size, f.return_columns);
  const valoreIniziale = (d: Dato): string | undefined => {
    const v = d.initial;
    // Un record nasce sempre come oggetto: senza valore coi campi senza valore (`new alunno()`), con un valore un letterale
    // per campo. Una tabella un oggetto per record, ognuno dal suo costruttore (mai `new Array(3).fill(new alunno())`, che
    // ripete lo stesso oggetto).
    if (d.type === "record") {
      const uno = (valori: readonly string[] | undefined) => `new ${d.record!}(${(valori ?? []).map((x, k) => nelDato(albero(x), campiDi(d.record)[k]!)).join(", ")})`;
      if (d.size === undefined) return uno(v as readonly string[] | undefined);
      if (v === undefined) return `Array.from({ length: ${d.size} }, () => ${uno(undefined)})`;
      if (Array.isArray(v)) return `[${(v as readonly (readonly string[])[]).map(uno).join(", ")}]`;
      return `Array.from({ length: ${d.size} }, () => ${uno((v as unknown as { readonly each: readonly string[] }).each)})`;
    }
    const elemento = annotazioneDelTipo(tipoSemplice(d.type));
    // Una matrice: ogni riga un Array suo, come la comprensione del Python (mai `new Array(2).fill(riga)`, che ripete la
    // stessa riga); col valore ripetuto, il valore in ogni riga.
    if (d.columns !== undefined) {
      const righe = (riga: string) => `Array.from({ length: ${d.size} }, () => ${riga})`;
      if (v === undefined) return righe(`new Array<${elemento}>(${d.columns})`);
      if (Array.isArray(v)) return `[${(v as readonly (readonly string[])[]).map((riga) => `[${riga.map((x) => nelDato(albero(x), d)).join(", ")}]`).join(", ")}]`;
      return righe(`new Array<${elemento}>(${d.columns}).fill(${nelDato(albero((v as { readonly each: string }).each), d)})`);
    }
    if (v === undefined) return d.size === undefined ? undefined : `new Array<${elemento}>(${d.size})`;
    if (typeof v === "string") return nelDato(albero(v), d);
    if (Array.isArray(v)) return `[${(v as readonly string[]).map((x) => nelDato(albero(x), d)).join(", ")}]`;
    return `new Array<${elemento}>(${d.size}).fill(${nelDato(albero((v as { readonly each: string }).each), d)})`;
  };

  /** Le dichiarazioni, con la colonna dei commenti allineata sulle righe che ne hanno uno; `funzione`, quella che le
   * possiede fuori dal programma principale. */
  const dichiara = (elenco: readonly Dato[], prima: string, conNota: boolean, funzione?: string): Riga[] => {
    const voci = elenco.map((d) => {
      const v = valoreIniziale(d);
      const parola = d.constant === true || prima === "" ? "const" : "let";
      const nota = !conNota ? "" : d.constant === true ? note.costante : d.role !== undefined ? note.ruoli[d.role] : "";
      return { d, testo: `${prima}${parola} ${d.name}${v === undefined ? "!" : ""}: ${annotazione(d)}${v === undefined ? "" : ` = ${v}`};`, nota };
    });
    const larghezza = (t: string) => Array.from(t).length;
    const colonna = Math.max(0, ...voci.filter((x) => x.nota !== "").map((x) => larghezza(x.testo)));
    return voci.map(({ d, testo, nota }) => ({
      testo: nota === "" ? testo : `${testo}${" ".repeat(colonna - larghezza(testo))}  // ${nota}`,
      dato: d.name,
      ...(funzione !== undefined ? { funzione } : {}),
    }));
  };

  // ------------------------------------------------------------------------- i nomi del generatore

  // JavaScript vuole i nomi dichiarati col tipo, e il Python no: in testa alla funzione, dopo i dati, come nel C. Gli
  // indici, uno per livello usato; le parti messe da parte (`_valore`, `_valore2`) come le temporanee del C, una per tipo
  // libera nell'istruzione che si scrive; le sorgenti di un `per ogni` su una funzione, una per ciclo.
  /** Quanti cicli `per ogni` contengono la regola che si scrive, e il livello più alto degli indici usati. */
  let cicliPerOgni = 0;
  let livelli = 0;
  const indiceAl = (n: number): string => {
    livelli = Math.max(livelli, n);
    return indiceDelLivello(lingua, n);
  };
  let temporanee: { nome: string; tipo: string }[] = [];
  const prese = new Set<string>();
  const temporanea = (t: string): string => {
    let x = temporanee.find((v) => v.tipo === t && !prese.has(v.nome));
    if (x === undefined) {
      const k = temporanee.length + 1;
      x = { nome: k === 1 ? nomeDelValore[lingua] : `${nomeDelValore[lingua]}${k}`, tipo: t };
      temporanee.push(x);
    }
    prese.add(x.nome);
    return x.nome;
  };
  let sorgenti: { nome: string; tipo: string }[] = [];
  const sorgenteNuova = (t: string): string => {
    const k = sorgenti.length + 1;
    const nome = k === 1 ? nomeDellaSorgente[lingua] : `${nomeDellaSorgente[lingua]}${k}`;
    sorgenti.push({ nome, tipo: t });
    return nome;
  };

  // --------------------------------------------------------------------------------------------- le regole

  let corpo: Riga[] = [];
  const struttura = (testo: string) => corpo.push({ testo });
  /** I record e le tabelle della funzione che si scrive (con le costanti comuni): riconoscono la copia col nome. */
  let deiRecord: ReadonlySet<string> = new Set();
  let delleTabelle: ReadonlySet<string> = new Set();

  /** Una destinazione e il valore che riceve: un dato, il campo di un record, l'elemento di un vettore o di una matrice, o
   * la riga di una matrice (JavaScript calcola gli indici prima del valore, come il flowchart: nessuno si calcola prima,
   * come invece nel Python). La riga riceve un vettore delle sue colonne. */
  function assegna(r: string, id: string, bersaglio: string, valore: (d: Dato) => string) {
    const e = albero(bersaglio);
    if (e.genere === "nome") {
      corpo.push({ testo: `${r}${e.nome} = ${valore(dati.get(e.nome)!)};`, blocco: id });
      return;
    }
    if (e.genere === "campo") {
      // Il campo di un dato record riceve il valore come un dato del tipo del campo.
      const destinazione = `${espressione(e.base).t}.${e.campo}`;
      corpo.push({ testo: `${r}${destinazione} = ${valore({ ...campoDi(e), name: destinazione })};`, blocco: id });
      return;
    }
    const { nome, indici } = elementoDi(e);
    const d = dati.get(nome)!;
    const posto = `${nome}${indici.map((i) => `[${espressione(i).t}]`).join("")}`;
    corpo.push({ testo: `${r}${posto} = ${valore(d.columns !== undefined && indici.length === 1 ? { ...d, size: d.columns, columns: undefined } : d)};`, blocco: id });
  }

  /** La copia col nome (`altri ← voti`, `v ← m[1]`, `m[0] ← v`, `b ← a` fra due matrici), elemento per elemento: il
   * `mentre` equivalente, una riga per fase, come il Python (mai `altri = voti`, che farebbe dei due nomi lo stesso
   * vettore); per una matrice quello delle colonne dentro quello delle righe, con le sue righe `interno`. L'indice di una
   * riga che non è un numero né un nome si calcola nella partenza, una volta, in un nome suo dopo quello della posizione.
   * Un elemento stringa che può essere più lungo di quelli che lo ricevono passa dal controllo. */
  function copia(r: string, id: string, t: Espressione, v: Espressione) {
    const fase = (testo: string, interno: boolean | undefined, ...fasi: FaseDelCiclo[]) =>
      corpo.push({ testo, blocco: id, fasi, ...(interno !== undefined ? { interno } : {}) });
    let calcolati = 1;
    const vettoreDi = (e: Espressione): string => {
      if (e.genere === "nome") return e.nome;
      const x = e as Extract<Espressione, { genere: "indice" }>;
      const nome = (x.base as { nome: string }).nome;
      if (x.indice.genere === "intero" || x.indice.genere === "nome") return `${nome}[${espressione(x.indice).t}]`;
      const indice = indiceAl(cicliPerOgni + ++calcolati);
      fase(`${r}${indice} = ${espressione(x.indice).t};`, undefined, "inizio");
      return `${nome}[${indice}]`;
    };
    const verso = vettoreDi(t);
    const da = vettoreDi(v);
    const misure = misureDi(t);
    const massima = misure.max_length ?? lunghezzaPredefinita;
    const lungo = tipo(t) === "string" && (misureDi(v).max_length ?? lunghezzaPredefinita) > massima;
    const preso = (x: string) => (lungo ? conArresto("alPiu", x, String(massima)).t : x);
    const i = indiceAl(cicliPerOgni + 1);
    const tabella = tabellaDi(t);
    if (tabella !== undefined) {
      // Una tabella: il ciclo dei record, con dentro una riga per campo, ognuna col campo che copia (lo stesso record: le
      // stringhe hanno la stessa lunghezza).
      fase(`${r}${i} = 0;`, undefined, "inizio");
      fase(`${r}while (${i} < ${misure.size}) {`, undefined, "condizione");
      campiDi(tabella).forEach((c, k) => corpo.push({ testo: `${r}${rientro}${verso}[${i}].${c.name} = ${da}[${i}].${c.name};`, blocco: id, fasi: ["elemento"], campo: k }));
      fase(`${r}${rientro}${i} = ${i} + 1;`, undefined, "passo");
      struttura(`${r}}`);
      return;
    }
    if (misure.columns === undefined) {
      fase(`${r}${i} = 0;`, undefined, "inizio");
      fase(`${r}while (${i} < ${misure.size}) {`, undefined, "condizione");
      fase(`${r}${rientro}${verso}[${i}] = ${preso(`${da}[${i}]`)};`, undefined, "elemento");
      fase(`${r}${rientro}${i} = ${i} + 1;`, undefined, "passo");
      struttura(`${r}}`);
      return;
    }
    const j = indiceAl(cicliPerOgni + 2);
    fase(`${r}${i} = 0;`, false, "inizio");
    fase(`${r}while (${i} < ${misure.size}) {`, false, "condizione");
    fase(`${r}${rientro}${j} = 0;`, true, "inizio");
    fase(`${r}${rientro}while (${j} < ${misure.columns}) {`, true, "condizione");
    fase(`${r}${rientro.repeat(2)}${verso}[${i}][${j}] = ${preso(`${da}[${i}][${j}]`)};`, true, "elemento");
    fase(`${r}${rientro.repeat(2)}${j} = ${j} + 1;`, true, "passo");
    struttura(`${r}${rientro}}`);
    fase(`${r}${rientro}${i} = ${i} + 1;`, false, "passo");
    struttura(`${r}}`);
  }

  /** Il dato e gli indici, dal primo, di un elemento di un vettore o di una matrice, o di una riga (`m[i][j]`: `m`, i, j). */
  function elementoDi(e: Espressione): { nome: string; indici: Espressione[] } {
    if (e.genere !== "indice") return { nome: (e as { nome: string }).nome, indici: [] };
    const sotto = elementoDi(e.base);
    return { nome: sotto.nome, indici: [...sotto.indici, e.indice] };
  }

  /** Il salto a una procedura, come nel Python: le righe prima della chiamata (gli indici degli elementi per riferimento
   * e per uscita, il controllo degli elementi dello stesso vettore, gli argomenti che si possono fermare prima di una di
   * quelle righe che si può fermare anche lei), poi la chiamata, che riassegna i parametri per riferimento e per uscita:
   * uno solo com'è, più d'uno dalla tupla (`[a, n] = p(a);`). Un argomento per uscita non si passa. */
  function salto(r: string, b: Extract<Blocco, { kind: "call" }>) {
    prese.clear();
    const parametri = perNome.get(b.callee)!.data.filter((d) => d.parameter !== undefined);
    type Argomento =
      | { readonly genere: "valore"; readonly testo: string; readonly ferma: boolean }
      | { readonly genere: "nome"; readonly testo: string }
      | { readonly genere: "elemento"; readonly vettore: string; readonly indici: readonly { readonly t: string; readonly scritto: boolean }[]; readonly ferma: boolean; readonly campo?: string };
    const argomenti: Argomento[] = b.arguments.map((testo, k) => {
      const d = parametri[k]!;
      const a = albero(testo);
      ferma = false;
      if (d.parameter === "value") return { genere: "valore", testo: nelDato(a, d), ferma };
      if (a.genere === "nome") return { genere: "nome", testo: a.nome };
      // Il campo di un record di una tabella: un elemento della tabella col suo campo, gli indici dal primo.
      if (a.genere === "campo" && a.base.genere === "indice") {
        const { nome, indici } = elementoDi(a.base);
        return { genere: "elemento", vettore: nome, indici: indici.map((i) => ({ t: espressione(i).t, scritto: i.genere === "intero" })), ferma, campo: a.campo };
      }
      // Un campo per riferimento si passa e si riassegna come un dato.
      if (a.genere === "campo") return { genere: "nome", testo: espressione(a).t };
      const { nome, indici } = elementoDi(a);
      return { genere: "elemento", vettore: nome, indici: indici.map((i) => ({ t: espressione(i).t, scritto: i.genere === "intero" })), ferma };
    });
    const calcolato = (a: Argomento) => a.genere === "elemento" && a.indici.some((i) => !i.scritto);
    const usati: string[][] = [];
    const perVettore = new Map<string, number[]>();
    argomenti.forEach((a, k) => a.genere === "elemento" && perVettore.set(a.vettore, [...(perVettore.get(a.vettore) ?? []), k]));
    const gruppi = [...perVettore.values()].filter((ks) => ks.length > 1 && ks.some((k) => calcolato(argomenti[k]!)));
    // Le righe prima della chiamata che si possono fermare: da quella più a destra, un argomento a sinistra che si può
    // fermare anche lui si calcola prima, nel suo ordine.
    const ultimaCheFerma = gruppi.length > 0 ? argomenti.length : argomenti.findLastIndex((a) => calcolato(a) && a.genere === "elemento" && a.ferma);
    const passati: string[] = [];
    let indici = 0;
    const riga = (testo: string) => corpo.push({ testo: r + testo, blocco: b.id });
    argomenti.forEach((a, k) => {
      if (a.genere === "elemento") {
        usati[k] = a.indici.map((i) => {
          if (i.scritto) return i.t;
          const nome = indiceAl(cicliPerOgni + ++indici);
          riga(`${nome} = ${i.t};`);
          return nome;
        });
        passati.push(`${a.vettore}${usati[k]!.map((i) => `[${i}]`).join("")}${a.campo !== undefined ? `.${a.campo}` : ""}`);
      } else if (a.genere === "valore" && a.ferma && k < ultimaCheFerma) {
        const nome = temporanea(annotazione(parametri[k]!));
        riga(`${nome} = ${a.testo};`);
        passati.push(nome);
      } else passati.push(a.testo);
    });
    const campoDellArgomento = (k: number) => (argomenti[k] as { campo?: string }).campo;
    for (const ks of gruppi)
      for (const confronto of controlliDegliElementi(ks.map((k) => usati[k]!), dati.get((argomenti[ks[0]!] as { vettore: string }).vettore)!, ks.map(campoDellArgomento)))
        riga(`${usa("elementiDiversi")}(${confronto.join(", ")});`);
    const chiamataDelSalto = `${b.callee}(${passati.filter((_, k) => parametri[k]!.parameter !== "out").join(", ")})`;
    const riassegnati = argomenti.flatMap((a, k) => (a.genere === "valore" ? [] : [passati[k]!]));
    riga(riassegnati.length === 0 ? `${chiamataDelSalto};` : riassegnati.length === 1 ? `${riassegnati[0]} = ${chiamataDelSalto};` : `[${riassegnati.join(", ")}] = ${chiamataDelSalto};`);
  }

  const leggi = (d: Pick<Dato, "type" | "max_length">): string => {
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

  /** Un valore di quel tipo dentro il testo composto: un reale da `reale`, un booleano da `booleano`, ogni altro com'è. */
  const comeScritto = (x: string, t: TipoDelDato): string => (t === "real" ? `\${${usa("reale")}(${x})}` : t === "boolean" ? `\${${usa("booleano")}(${x})}` : `\${${x}}`);

  /** Un valore di una scrittura dentro il testo composto: un letterale stringa o carattere coi suoi caratteri, ogni altro
   * valore come lo scrive `comeScritto`. */
  function nellaScrittura(v: string): string {
    const e = albero(v);
    if (e.genere === "stringa") return e.codici.map(nelTesto).join("");
    if (e.genere === "carattere") return nelTesto(e.codice);
    return comeScritto(espressione(e).t, tipo(e));
  }

  function blocco(b: Blocco, livello: number) {
    const r = rientro.repeat(livello);
    const riga = (testo: string) => corpo.push({ testo: r + testo, blocco: b.id });
    switch (b.kind) {
      case "assignment": {
        const v = albero(b.value);
        if (v.genere === "unario" && v.operatore === "to_array")
          return assegna(r, b.id, b.target, (d) => conArresto("convertiAVettore", espressione(v.operando).t, String(d.size)).t);
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
        if (eUnaCopiaDiUnRecord(b, deiRecord, delleTabelle)) {
          // La copia di un record col suo nome, o di un record di una tabella, campo per campo: una riga per campo, col campo
          // che copia (mai `b = a`, che farebbe dei due nomi lo stesso oggetto). Gli indici che non sono un numero né un nome
          // si calcolano prima, come nella prima azione dell'interprete: quello della destinazione, poi quello della sorgente.
          const recordIn = (e: Espressione, calcolati: number) => (e.genere === "indice" ? recordDellaTabella(r, b.id, e, calcolati, 0) : espressione(e).t);
          const calcolato = (e: Espressione) => (e.genere === "indice" && e.indice.genere !== "intero" && e.indice.genere !== "nome" ? 1 : 0);
          const verso = recordIn(t, 0);
          const da = recordIn(v, calcolato(t));
          campiDi(recordDi(t)).forEach((c, k) => corpo.push({ testo: `${r}${verso}.${c.name} = ${da}.${c.name};`, blocco: b.id, campo: k }));
          return;
        }
        if (vettore(t)) {
          // Un vettore intero, una matrice intera o la riga di una matrice: da una funzione una lista nuova, dal nome di un
          // altro vettore, o da una riga, la copia elemento per elemento.
          if (v.genere !== "nome" && !(v.genere === "indice" && vettore(v))) return assegna(r, b.id, b.target, (d) => listaNuova(v, d).t);
          return copia(r, b.id, t, v);
        }
        return assegna(r, b.id, b.target, (d) => nelDato(v, d));
      }
      case "read":
        return assegna(r, b.id, b.target, leggi);
      case "write": {
        // Un valore che può fermare il programma comincia una scrittura nuova: quelli prima restano scritti, come
        // nell'interprete, che scrive un valore alla volta (il testo composto calcola tutti i valori prima di scrivere).
        const gruppi: string[][] = [[]];
        for (const v of b.values) {
          ferma = false;
          const x = nellaScrittura(v);
          if (ferma && gruppi.at(-1)!.length > 0) gruppi.push([]);
          gruppi.at(-1)!.push(x);
        }
        gruppi.forEach((valori, k) => riga(`${usa("scrivi")}(\`${valori.join("")}${b.newline && k === gruppi.length - 1 ? "\\n" : ""}\`);`));
        return;
      }
      case "if":
        riga(`if (${espressione(albero(b.condition)).t}) {`);
        b.then.forEach((x) => blocco(x, livello + 1));
        if (b.else.length > 0) {
          struttura(`${r}} else {`);
          b.else.forEach((x) => blocco(x, livello + 1));
        }
        struttura(`${r}}`);
        return;
      case "while":
        riga(`while (${espressione(albero(b.condition)).t}) {`);
        b.body.forEach((x) => blocco(x, livello + 1));
        struttura(`${r}}`);
        return;
      case "repeat":
        struttura(`${r}do {`);
        b.body.forEach((x) => blocco(x, livello + 1));
        riga(`} while (${espressione(albero(b.condition)).t});`);
        return;
      case "for": {
        // Il `mentre` equivalente: la fine si ricalcola a ogni controllo (mai un `for` che la copi una volta).
        const fase = (testo: string, ...fasi: FaseDelCiclo[]) => corpo.push({ testo, blocco: b.id, fasi });
        const contatore = (albero(b.counter) as { nome: string }).nome;
        const passo = b.step ?? 1;
        fase(`${r}${contatore} = ${espressione(albero(b.from)).t};`, "inizio");
        fase(`${r}while (${contatore} ${passo > 0 ? "<=" : ">="} ${fra(espressione(albero(b.to)), 11)}) {`, "condizione");
        b.body.forEach((x) => blocco(x, livello + 1));
        fase(`${r}${rientro}${contatore} = ${contatore} ${passo > 0 ? "+" : "-"} ${Math.abs(passo)};`, "passo");
        struttura(`${r}}`);
        return;
      }
      case "for_each": {
        // Un indice nascosto, e la lunghezza della sorgente ricalcolata a ogni controllo (mai `for … of`, che la prende
        // una volta). Una stringa per codici: `length` e `s[i]` di JavaScript contano le unità UTF-16. Una funzione si
        // chiama una volta, alla partenza, e il suo risultato sta in `_sorgente`. La riga di una matrice si sceglie alla
        // partenza: con un indice che non è un numero, l'indice sta in `_sorgente` e il ciclo legge `m[_sorgente]` a ogni
        // giro, come il Python (la riga assegnata nel ciclo è un'altra lista, e l'interprete legge la riga che c'è).
        const fase = (testo: string, ...fasi: FaseDelCiclo[]) => corpo.push({ testo, blocco: b.id, fasi });
        const elemento = dati.get((albero(b.item) as { nome: string }).nome)!;
        const s = albero(b.source);
        let sorgente: string;
        if (s.genere === "nome") sorgente = s.nome;
        else if (s.genere === "indice") {
          if (s.indice.genere === "intero") sorgente = espressione(s).t;
          else {
            const riga = sorgenteNuova("number");
            fase(`${r}${riga} = ${espressione(s.indice).t};`, "inizio");
            sorgente = `${espressione(s.base).t}[${riga}]`;
          }
        } else {
          sorgente = sorgenteNuova(annotazioneDelRisultato(perNome.get((s as { nome: string }).nome)!));
          fase(`${r}${sorgente} = ${espressione(s).t};`, "inizio");
        }
        const { size: dimensione, max_length: lunghezzaDellaSorgente } = misureDi(s);
        const indice = indiceAl(++cicliPerOgni);
        const fine = dimensione !== undefined ? `${sorgente}.length` : `${usa("lunghezza")}(${sorgente})`;
        // Un elemento stringa che può essere più lungo del dato che lo riceve passa dal controllo.
        const massima = elemento.max_length ?? lunghezzaPredefinita;
        const lungo = elemento.type === "string" && (lunghezzaDellaSorgente ?? lunghezzaPredefinita) > massima;
        // Il record di una tabella è un oggetto nuovo, dal costruttore (l'interprete lo prende in un'azione).
        const tabella = tabellaDi(s);
        const preso =
          tabella !== undefined ? costruttore(tabella, `${sorgente}[${indice}]`)
          : dimensione === undefined ? conArresto("carattereDi", sorgente, indice).t
          : lungo ? conArresto("alPiu", `${sorgente}[${indice}]`, String(massima)).t
          : `${sorgente}[${indice}]`;
        fase(`${r}${indice} = 0;`, "inizio");
        fase(`${r}while (${indice} < ${fine}) {`, "condizione");
        fase(`${r}${rientro}${elemento.name} = ${preso};`, "elemento");
        b.body.forEach((x) => blocco(x, livello + 1));
        fase(`${r}${rientro}${indice} = ${indice} + 1;`, "passo");
        struttura(`${r}}`);
        cicliPerOgni--;
        return;
      }
      case "call":
        return salto(r, b);
      case "comment":
        for (const t of b.text.split(aCapo)) riga(t === "" ? "//" : `// ${t}`);
        return;
    }
  }

  // ---------------------------------------------------------------------------------------- le funzioni

  /** Le righe di una funzione del progetto (o del programma principale): l'intestazione coi tipi, la copia dei vettori
   * senza *rif*, le dichiarazioni (i parametri per uscita fra i dati della procedura), i nomi del generatore, le regole e
   * il ritorno, che ha il blocco della fine. Il valore restituito che è la chiamata di una funzione che si può fermare si
   * calcola prima in `_valore`: restituito così, sarebbe una chiamata in coda, e Bun toglierebbe la cornice della funzione
   * (`fermati` troverebbe la riga di chi la chiama). La riga che chiama `prepara_console` la mette l'insieme. */
  function scriviFunzione(f: Funzione): Riga[] {
    dati = new Map<string, Dato>([...comuni, ...f.data].map((d) => [d.name, d]));
    deiRecord = nomiDeiRecord([...comuni, ...f.data]);
    delleTabelle = nomiDelleTabelle([...comuni, ...f.data]);
    corpo = [];
    cicliPerOgni = 0;
    livelli = 0;
    temporanee = [];
    sorgenti = [];
    fermaLaFunzione = delGiro.has(f);
    const parametri = f.data.filter((d) => d.parameter !== undefined);
    // Quelli che la procedura restituisce: per riferimento e per uscita, nell'ordine dei parametri.
    const riferimenti = parametri.filter((d) => d.parameter === "reference" || d.parameter === "out");
    const ritorno =
      f.kind === "main" ? "void"
      : f.kind === "function" ? annotazioneDelRisultato(f)
      : riferimenti.length === 0 ? "void"
      : riferimenti.length === 1 ? annotazione(riferimenti[0]!)
      : `[${riferimenti.map(annotazione).join(", ")}]`;
    // Un parametro per uscita non si riceve: è un dato senza valore della procedura, dichiarato coi suoi dati.
    const ricevuti = parametri.filter((d) => d.parameter !== "out");
    const intestazione = `function ${f.kind === "main" ? "main" : f.name}(${ricevuti.map((d) => `${d.name}: ${annotazione(d)}`).join(", ")}): ${ritorno} {`;
    // Un vettore e un record per valore la funzione li copia per prima cosa: nessuno dei due è mai lo stesso oggetto di chi
    // chiama.
    const copie = parametri
      .filter((d) => d.parameter === "value" && (d.size !== undefined || d.type === "record"))
      .map((d) => ({ testo: `${rientro}${d.name} = ${d.size !== undefined ? listaNuova({ genere: "nome", nome: d.name }, d).t : costruttore(d.record!, d.name)};` }));
    const propri = f.data.filter((d) => d.parameter === undefined || d.parameter === "out");
    const dichiarazioni = dichiara(propri, rientro, true, f.kind === "main" ? undefined : f.id);
    for (const b of f.body) blocco(b, 1);
    // Una funzione del giro conta la chiamata col suo spazio nella prima riga (e si ferma oltre un tetto, sulla riga della
    // chiamata) e la toglie nell'ultima, dopo il calcolo del valore restituito: se il valore può far partire chiamate del
    // giro, si calcola prima in `_valore`. Lo spazio è quello del nucleo, mai ricalcolato.
    const giro = delGiro.has(f);
    const entrata = giro ? [{ testo: `${rientro}${usa("entraNellaRicorsione")}(${spazioDiUnaChiamata(f, p)});` }] : [];
    const uscita = () => giro && struttura(`${rientro}${usa("esciDallaRicorsione")}(${spazioDiUnaChiamata(f, p)});`);
    if (f.kind === "function") {
      // Un vettore torna come lista nuova; una stringa col controllo della lunghezza massima del risultato.
      prese.clear();
      const e = albero(f.end.return_value!);
      const verso = { type: f.return_type!, ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}) };
      const x = f.return_size !== undefined ? listaNuova(e, verso) : f.return_type === "record" ? recordNuovo(e, f.end.id) : nelDatoTesto(e, verso);
      if (giro && chiamaIlGiro(e)) {
        const v = temporanea(annotazioneDelRisultato(f));
        corpo.push({ testo: `${rientro}${v} = ${x.t};`, blocco: f.end.id });
        uscita();
        corpo.push({ testo: `${rientro}return ${v};`, blocco: f.end.id });
      } else if (x.coda === true) {
        uscita();
        const v = temporanea(annotazioneDelRisultato(f));
        corpo.push({ testo: `${rientro}${v} = ${x.t};`, blocco: f.end.id }, { testo: `${rientro}return ${v};`, blocco: f.end.id });
      } else {
        uscita();
        corpo.push({ testo: `${rientro}return ${x.t};`, blocco: f.end.id });
      }
    } else if (riferimenti.length > 0) {
      uscita();
      const nomiDeiRiferimenti = riferimenti.map((d) => d.name);
      corpo.push({ testo: `${rientro}return ${nomiDeiRiferimenti.length === 1 ? nomiDeiRiferimenti[0] : `[${nomiDeiRiferimenti.join(", ")}]`};`, blocco: f.end.id });
    } else uscita();
    const delGeneratore: Riga[] = [
      ...Array.from({ length: livelli }, (_, k) => ({ testo: `${rientro}let ${indiceDelLivello(lingua, k + 1)}: number;` })),
      ...[...temporanee, ...sorgenti].map((x) => ({ testo: `${rientro}let ${x.nome}: ${x.tipo};` })),
    ];
    if (f.name !== undefined) fermano.set(f.name, fermaLaFunzione);
    return [{ testo: intestazione }, ...entrata, ...copie, ...dichiarazioni, ...delGeneratore, ...corpo, { testo: "}" }];
  }

  /** Se un'espressione può far partire chiamate del giro: chiama una funzione del giro, o una da cui ci si arriva. */
  const versoIlGiro = funzioniVersoIlGiro(p);
  const chiamaIlGiro = (e: Espressione) => chiamateIn(e).some((nome) => versoIlGiro.has(perNome.get(nome)!));

  /** Il programma principale del programma di prova, come nel Python: legge i parametri (con la provenienza della
   * funzione), chiama, scrive ciò che scrive l'esecuzione. Un parametro per uscita non si legge né si passa: è dichiarato
   * prima della chiamata, che gli dà il valore. */
  function scriviLaProva(f: Funzione, caso: CasoDiUnaFunzione): Riga[] {
    const letti = parametriDelCaso(f, caso, p.records);
    if ("problema" in letti) throw new Error(`il caso ${caso.name} non ha un programma di prova: ${letti.problema}`);
    dati = new Map<string, Dato>([...comuni, ...f.data].map((d) => [d.name, d]));
    const righe: Riga[] = [{ testo: "function main(): void {" }];
    for (const { dato: d, elementi, ognuno } of letti.parametri) {
      if (d.parameter === "out") {
        righe.push({ testo: `${rientro}let ${d.name}!: ${annotazione(d)};` });
        continue;
      }
      const uno = (x: "riga" | "nessuno") => {
        if (x !== "riga") throw new Error(`il parametro ${d.name} senza valore nel caso ${caso.name}`);
        return leggi(d);
      };
      // Un record: un campo per voce, nell'ordine dei campi; un campo senza valore non si legge.
      const delCampo = (x: "riga" | "nessuno", c: Campo) => (x === "riga" ? leggi(c) : "undefined");
      // Una matrice riga dopo riga; con un valore per ogni elemento, letto una volta e copiato in ogni riga, come il Python.
      const elemento = d.type === "record" ? "" : annotazioneDelTipo(tipoSemplice(d.type));
      const riga = nomeDellaRigaCopiata[lingua];
      // Una tabella record dopo record, ognuno un campo per voce.
      const delRecord = (i: number) => `new ${d.record!}(${campiDi(d.record).map((c, k) => delCampo(elementi[i * campiDi(d.record).length + k]!, c)).join(", ")})`;
      const valore =
        d.type === "record" && d.size !== undefined ? `[${[...Array(d.size).keys()].map(delRecord).join(", ")}]`
        : d.type === "record" ? delRecord(0)
        : d.size === undefined ? uno(elementi[0]!)
        : d.columns !== undefined && ognuno ? `new Array<${elemento}[]>(${d.size}).fill(new Array<${elemento}>(${d.columns}).fill(${uno(elementi[0]!)})).map((${riga}) => Array.from(${riga}))`
        : d.columns !== undefined ? `[${[...Array(d.size).keys()].map((i) => `[${elementi.slice(i * d.columns!, (i + 1) * d.columns!).map(uno).join(", ")}]`).join(", ")}]`
        : ognuno ? `new Array<${elemento}>(${d.size}).fill(${uno(elementi[0]!)})`
        : `[${elementi.map(uno).join(", ")}]`;
      righe.push({ testo: `${rientro}let ${d.name}: ${annotazione(d)} = ${valore};`, blocco: f.id });
    }
    const parametri = f.data.filter((d) => d.parameter !== undefined);
    const riferimenti = parametri.filter((d) => d.parameter === "reference" || d.parameter === "out");
    const chiamataDiF = `${f.name}(${parametri.filter((d) => d.parameter !== "out").map((d) => d.name).join(", ")})`;
    // La prima chiamata di una funzione del giro si può fermare per lo spazio: la riga che la chiama ha la provenienza
    // della funzione, come le letture dei parametri (l'esecuzione si ferma lì).
    const delCaso = delGiro.has(f) ? { blocco: f.id } : {};
    const scrivi = (testo: string, conLaChiamata = false) => righe.push({ testo: `${rientro}${usa("scrivi")}(\`${testo}\\n\`);`, ...(conLaChiamata ? delCaso : {}) });
    /** Le parti di un record come le scrive l'esecuzione (`.nome`), col tipo. */
    const campiScritti = (record: string | undefined, davanti: string): [string, TipoDelDato][] => campiDi(record).map((c) => [`${davanti}.${c.name}`, c.type]);
    if (f.kind === "function" && f.return_size !== undefined && f.return_type === "record") {
      // La funzione si chiama una volta, poi una riga per campo di ogni record.
      const nome = nomeDelRisultato[lingua];
      righe.push({ testo: `${rientro}let ${nome}: ${annotazioneDelRisultato(f)} = ${chiamataDiF};`, ...delCaso });
      for (const k of posizioni(f.return_size, undefined))
        for (const [x, t] of campiScritti(f.return_record, k)) scrivi(`→ ${x} = ${comeScritto(`${nome}${x}`, t)}`);
    } else if (f.kind === "function" && f.return_type === "record") {
      // La funzione si chiama una volta, poi una riga per campo, come per un vettore.
      const nome = nomeDelRisultato[lingua];
      righe.push({ testo: `${rientro}let ${nome}: ${annotazioneDelRisultato(f)} = ${chiamataDiF};`, ...delCaso });
      for (const [x, t] of campiScritti(f.return_record, "")) scrivi(`→ ${x} = ${comeScritto(`${nome}${x}`, t)}`);
    } else if (f.kind === "function" && f.return_size !== undefined) {
      // La funzione si chiama una volta, poi una riga per elemento: se si ferma, nulla è scritto.
      const nome = nomeDelRisultato[lingua];
      righe.push({ testo: `${rientro}let ${nome}: ${annotazioneDelRisultato(f)} = ${chiamataDiF};`, ...delCaso });
      for (const k of posizioni(f.return_size, f.return_columns)) scrivi(`→ ${k} = ${comeScritto(`${nome}${k}`, tipoSemplice(f.return_type!))}`);
    } else if (f.kind === "function") scrivi(`→ ${comeScritto(chiamataDiF, tipoSemplice(f.return_type!))}`, true);
    else if (riferimenti.length === 0) righe.push({ testo: `${rientro}${chiamataDiF};`, ...delCaso });
    else {
      const nomiDeiRiferimenti = riferimenti.map((d) => d.name);
      righe.push({ testo: `${rientro}${nomiDeiRiferimenti.length === 1 ? nomiDeiRiferimenti[0] : `[${nomiDeiRiferimenti.join(", ")}]`} = ${chiamataDiF};`, ...delCaso });
      scrivi("");
      for (const d of riferimenti) {
        // Un record una riga per campo, `r.nome = …`.
        const pezzi: [string, TipoDelDato][] =
          d.type === "record" && d.size !== undefined ? posizioni(d.size, undefined).flatMap((k) => campiScritti(d.record, `${d.name}${k}`))
          : d.type === "record" ? campiScritti(d.record, d.name)
          : d.size === undefined ? [[d.name, d.type]]
          : posizioni(d.size, d.columns).map((k) => [`${d.name}${k}`, d.type]);
        for (const [nome, t] of pezzi) scrivi(`${nome} = ${comeScritto(nome, t)}`);
      }
    }
    righe.push({ testo: "}" });
    return righe;
  }

  // Le funzioni del programma: tutte, anche quelle che nessuno chiama ancora (si vedono nel codice come nello
  // pseudocodice), o nel programma di prova quella eseguita da sola con quelle che chiama. Si scrivono prima le chiamate,
  // per sapere quali possono fermare il programma (in un giro no: quelle del giro si sa già che possono).
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
  // Un programma che legge, scrive o si ferma mette la console di Windows in UTF-8 per prima cosa, come il C: Node la
  // lascia nella code page del sistema (misurato: «è» letto come un byte della 850, «città» scritta male).
  const conLaConsole = usate.has("leggiRiga") || usate.has("scrivi") || usate.has("fermati");
  if (conLaConsole) {
    usate.add("preparaConsole");
    principale.splice(1, 0, { testo: `${rientro}${nomi.preparaConsole}();`, ...(prova === undefined ? { nellaFunzione: main.id } : {}) });
  }
  const letti = [...(usate.has("leggiRiga") ? ["readSync"] : []), ...(usate.has("scrivi") || usate.has("fermati") ? ["writeSync"] : [])];
  const nome = p.metadata.name.split(aCapo).join(" ");
  const righe: Riga[] = [
    { testo: `// ${nome}` },
    { testo: `// ${w.generato}` },
    ...w.nonControllati.map((t) => ({ testo: `// ${t}` })),
    ...(conLaConsole ? [{ testo: 'import { execSync } from "node:child_process";' }] : []),
    ...(letti.length > 0 ? [{ testo: `import { ${letti.join(", ")} } from "node:fs";` }] : []),
  ];
  // I record: una classe per record, dopo gli import, come la classe di dati del Python; ogni campo senza valore finché non
  // ne ha uno (`nome!: string`, come un dato senza valore iniziale), il costruttore coi parametri facoltativi nell'ordine
  // dei campi.
  for (const r of p.records ?? [])
    righe.push(
      { testo: "" },
      { testo: "" },
      { testo: `class ${r.name} {` },
      ...r.fields.map((c) => ({ testo: `${rientro}${c.name}!: ${annotazioneDelTipo(c.type)};` })),
      { testo: "" },
      { testo: `${rientro}constructor(${r.fields.map((c) => `${c.name}?: ${annotazioneDelTipo(c.type)}`).join(", ")}) {` },
      ...r.fields.map((c) => ({ testo: `${rientro}${rientro}this.${c.name} = ${c.name}!;` })),
      { testo: `${rientro}}` },
      { testo: "}" },
    );
  if (costanti.length > 0) righe.push({ testo: "" }, { testo: `// ${w.costantiComuni}` }, ...costanti);
  righe.push({ testo: "" }, { testo: "" }, ...principale);
  for (const f of delProgramma) righe.push({ testo: "" }, { testo: "" }, ...segnate(scritte.get(f)!, f.id));
  // `fermati` risale fino alla prima funzione del programma, come il Python (senza procedure né funzioni, il solo `main`).
  const risale = delProgramma.length === 0 ? undefined : ["main", ...delProgramma.map((f) => f.name!)];
  const funzioni = supportoInOrdine.filter((f) => usate.has(f));
  if (funzioni.length > 0) {
    righe.push({ testo: "" }, { testo: "" }, { testo: `// ${w.supporto}` });
    for (const f of funzioni) righe.push({ testo: "" }, { testo: "" }, ...funzione(f, lingua, nomi, decimali, riempimento, tetto, risale, usate.has("entraNellaRicorsione")).map((testo) => ({ testo })));
  }
  righe.push({ testo: "" }, { testo: "" }, { testo: "main();" });
  return righe;
}

// -------------------------------------------------------------------------------- le funzioni di supporto

/** Le spiegazioni delle funzioni di supporto (il commento `/** … *\/` di ognuna), per lingua. */
const spiegazioni: Readonly<Record<LinguaDelCodice, Readonly<Record<Exclude<Supporto, "reale" | "convertiAVettore">, string>>>> = {
  it: {
    preparaConsole: "La console di Windows in UTF-8 in entrata e in uscita, come fa il C (Node la lascia nella code page del sistema).",
    fermati: "Scrive il motivo e la riga del programma che lo ha incontrato, poi si ferma.",
    leggiRiga: "Una riga dell'input, senza il suo a capo; si ferma se l'input è finito o non è testo UTF-8.",
    leggiIntero: "Una riga con un intero a 32 bit: spazi, segno, cifre e spazi, come la lettura del flowchart.",
    leggiReale: "Una riga con un reale finito, scritto come nel flowchart (2.5, -3, 1.5e3), con spazi intorno.",
    leggiCarattere: "Una riga con esattamente un carattere.",
    leggiStringa: "Una riga con al più n caratteri, senza il carattere di codice 0.",
    leggiBooleano: "Una riga con true o false.",
    dividi: "La divisione fra interi del C: il quoziente troncato verso lo zero.",
    convertiAReale: "Un intero che diventa reale: lo zero intero non ha segno, come nel C.",
    elevatoA: "La potenza: con un esponente intero fino a 1100 è esatta, arrotondata una volta.",
    arrotonda: "La metà lontano dallo zero, come round del C (Math.round la porta verso più infinito).",
    convertiACarattere: "Il carattere con quel codice Unicode; si ferma se il codice non è valido.",
    convertiAStringa: "Tutti gli elementi del vettore, in ordine; un carattere di codice 0 non entra in una stringa.",
    carattereDi: "Il carattere in posizione i della stringa, da 0; si ferma se la posizione è fuori.",
    lunghezza: "Quanti caratteri ha la stringa (length di JavaScript conta le unità UTF-16).",
    confronta: "Due testi confrontati per codici dei caratteri, come nel C: negativo, zero o positivo (il < di JavaScript confronta le unità UTF-16).",
    nellaStringa: "Un carattere che entra in una stringa: quello di codice 0 non può.",
    concatenazione: "Due testi già calcolati, uno dopo l'altro: un carattere di codice 0 non entra in una stringa.",
    alPiu: "La stringa, se non ha più di n caratteri; altrimenti si ferma.",
    elementiDiversi: "Gli elementi di un vettore passati per riferimento nella stessa chiamata devono essere diversi.",
    booleano: "Un booleano come lo scrive il flowchart: true o false.",
    scrivi: "Scrive il testo sullo standard output.",
    entraNellaRicorsione: "Una chiamata in più di una funzione che richiama sé stessa, con i suoi dati: oltre {tetto} chiamate in corso, o oltre {spazio} byte, si ferma sulla riga della chiamata.",
    esciDallaRicorsione: "La chiamata è finita: i suoi dati lasciano la pila.",
  },
  en: {
    preparaConsole: "The Windows console in UTF-8 for input and output, as C does (Node leaves it in the code page of the system).",
    fermati: "Writes the reason and the line of the program that met it, then stops.",
    leggiRiga: "A line of the input, without its line break; stops if the input is exhausted or is not UTF-8 text.",
    leggiIntero: "A line with a 32-bit integer: spaces, sign, digits and spaces, as the flowchart reads it.",
    leggiReale: "A line with a finite real, written as in the flowchart (2.5, -3, 1.5e3), with spaces around.",
    leggiCarattere: "A line with exactly one character.",
    leggiStringa: "A line with at most n characters, without the character with code 0.",
    leggiBooleano: "A line with true or false.",
    dividi: "Integer division as in C: the quotient truncated towards zero.",
    convertiAReale: "An integer that becomes a real: the integer zero has no sign, as in C.",
    elevatoA: "The power: with an integer exponent up to 1100 it is exact, rounded once.",
    arrotonda: "Halves away from zero, like round in C (Math.round takes them towards plus infinity).",
    convertiACarattere: "The character with that Unicode code; stops if the code is not valid.",
    convertiAStringa: "All the elements of the array, in order; the character with code 0 cannot enter a string.",
    carattereDi: "The character at position i of the string, from 0; stops if the position is outside.",
    lunghezza: "How many characters the string has (the length of JavaScript counts UTF-16 units).",
    confronta: "Two texts compared by the codes of their characters, as in C: negative, zero or positive (the < of JavaScript compares UTF-16 units).",
    nellaStringa: "A character entering a string: the one with code 0 cannot.",
    concatenazione: "Two texts already calculated, one after the other: the character with code 0 cannot enter a string.",
    alPiu: "The string, if it has at most n characters; otherwise stops.",
    elementiDiversi: "The elements of an array passed by reference in the same call must be different.",
    booleano: "A boolean as the flowchart writes it: true or false.",
    scrivi: "Writes the text to the standard output.",
    entraNellaRicorsione: "One more call of a function that calls itself, with its data: beyond {tetto} calls in progress, or beyond {spazio} bytes, stops at the line of the call.",
    esciDallaRicorsione: "The call has ended: its data leave the stack.",
  },
};

/** I nomi interni delle funzioni di supporto e i loro commenti, per lingua. */
const interni = {
  it: {
    motivo: "motivo", riga: "riga", chiamata: "chiamata", trovata: "trovata", errore: "Errore alla riga", letti: "letti",
    cifre: "cifre", testo: "testo", bit: "bit", alto: "alto", esponente: "esponente", numeratore: "numeratore",
    denominatore: "denominatore", resto: "resto", bitDi: "bit_di", dueAlla: "due_alla", arrotondato: "arrotondato",
    ultimo: "ultimo", meta: "meta", indici: "indici", spazio: "spazio", cornice: "cornice",
    nonBloccante: "Un input non bloccante senza dati si riprova; la fine di un tubo di Windows è la fine dell'input.",
    quantiBit: "Quanti bit ha l'intero.",
    dueAllaE: "2^e, per e fra -1074 e 1023, costruito dai bit.",
    piuVicino: "Il reale più vicino a num / den · 2^p, la metà alla pari; Infinity oltre il massimo.",
    ilValore: "Il valore è (q0 + resto) · 2^(p - s); l'ultimo bit tenuto: 53 di mantissa, mai sotto 2^-1074.",
    esatta: "|x| = m · 2^e con m intero dispari, dai bit del numero: la potenza m^k · 2^(e·k) è esatta.",
    daiBit: "|x| = mantissa · 2^e, dai bit del numero.",
  },
  en: {
    motivo: "reason", riga: "line", chiamata: "call", trovata: "found", errore: "Error at line", letti: "bytes",
    cifre: "digits", testo: "text", bit: "bits", alto: "high", esponente: "exponent", numeratore: "numerator",
    denominatore: "denominator", resto: "rest", bitDi: "bit_count", dueAlla: "two_to", arrotondato: "rounded",
    ultimo: "last", meta: "half", indici: "indices", spazio: "space", cornice: "frame",
    nonBloccante: "A non-blocking input without data is retried; the end of a Windows pipe is the end of the input.",
    quantiBit: "How many bits the integer has.",
    dueAllaE: "2^e, for e between -1074 and 1023, built from the bits.",
    piuVicino: "The real nearest to num / den · 2^p, halves to even; Infinity beyond the maximum.",
    ilValore: "The value is (q0 + rest) · 2^(p - s); the last bit kept: 53 of mantissa, never below 2^-1074.",
    esatta: "|x| = m · 2^e with m an odd integer, from the bits of the number: the power m^k · 2^(e·k) is exact.",
    daiBit: "|x| = mantissa · 2^e, from the bits of the number.",
  },
} as const;

/** Il testo di una funzione di supporto: la spiegazione, la firma, il corpo. `risale`, le funzioni del programma fino a
 * cui `fermati` cerca la riga (senza procedure né funzioni, il solo `main`); `ricorsione`, se il programma ha funzioni del
 * giro: allora `fermati` sa saltare un numero dato di cornici del programma. */
function funzione(f: Supporto, lingua: LinguaDelCodice, n: Readonly<Record<Supporto, string>>, decimali: number, riempimento: number, tetto: number, risale: readonly string[] | undefined, ricorsione: boolean): string[] {
  const k = interni[lingua];
  const m = motiviCol(tetto)[lingua];
  const ferma = (motivo: string) => `${n.fermati}("${motivo}")`;
  // Il tetto e lo spazio si riempiono qui, non dove i testi nascono: il modulo si carica dentro un ciclo d'import, come
  // il Python.
  const s = (x: Exclude<Supporto, "reale" | "convertiAVettore">) => `/** ${spiegazioni[lingua][x].split("{tetto}").join(String(tetto)).split("{spazio}").join(String(spazioDellaPila))} */`;
  /** Una lettura: la riga, la condizione che la rifiuta, il valore. */
  const lettura = (x: "leggiIntero" | "leggiReale" | "leggiCarattere" | "leggiStringa" | "leggiBooleano", firma: string, rifiuta: string, valore: string) => [
    s(x),
    `function ${n[x]}(${firma} {`,
    `  const ${k.riga} = ${n.leggiRiga}();`,
    `  if (${rifiuta}) ${ferma(m.invalid_input)};`,
    `  return ${valore};`,
    "}",
  ];
  switch (f) {
    case "preparaConsole":
      // Node non ha SetConsoleCP: `chcp` cambia la console a cui il programma è attaccato (32 ms, misurato); coi tubi
      // nessuno dei tre flussi è una console, e non parte.
      return [
        s(f),
        `function ${n.preparaConsole}(): void {`,
        '  if (process.platform === "win32" && (process.stdin.isTTY || process.stdout.isTTY || process.stderr.isTTY)) execSync("chcp 65001", { stdio: "ignore" });',
        "}",
      ];
    case "fermati": {
      // La cornice di una funzione del programma: `at nome (percorso:riga:colonna)` in Node e in Bun (misurato); una
      // cornice nativa di Bun (`at map (native:1:11)`, dentro il `map` di un vettore coi controlli) non lo è mai, anche se
      // una funzione del programma ha quel nome.
      // Con la ricorsione, `cornice` dice quante cornici del programma saltare (0 per difetto): `entra_nella_ricorsione`
      // salta quella della funzione del giro e prende quella di chi la chiama, come `fermati(motivo, 3)` del Python. Si
      // contano le cornici del programma, non le righe della pila: Bun perde quelle delle chiamate in coda.
      const cornice = risale === undefined ? "at main \\(" : `at (?:${risale.join("|")}) \\((?!native:)`;
      return [
        s(f),
        `function ${n.fermati}(${k.motivo}: string${ricorsione ? `, ${k.cornice}: number = 0` : ""}): never {`,
        `  let ${k.riga} = "?";`,
        `  for (const ${k.chiamata} of (new Error().stack ?? "").split("\\n")) {`,
        `    const ${k.trovata} = /^\\s*${cornice}.*:(\\d+):\\d+\\)$/.exec(${k.chiamata});`,
        `    if (${k.trovata} !== null) {`,
        ...(ricorsione ? [`      if (${k.cornice} > 0) {`, `        ${k.cornice}--;`, "        continue;", "      }"] : []),
        `      ${k.riga} = ${k.trovata}[1];`,
        "      break;",
        "    }",
        "  }",
        `  writeSync(2, \`${k.errore} \${${k.riga}}: \${${k.motivo}}\\n\`);`,
        "  process.exit(1);",
        "}",
      ];
    }
    case "leggiRiga":
      return [
        s(f),
        `function ${n.leggiRiga}(): string {`,
        "  const byte = new Uint8Array(1);",
        `  const ${k.letti}: number[] = [];`,
        "  for (;;) {",
        "    let n = 0;",
        "    try {",
        "      n = readSync(0, byte, 0, 1, null);",
        "    } catch (e) {",
        `      // ${k.nonBloccante}`,
        '      if ((e as { code?: string }).code === "EAGAIN") continue;',
        '      if ((e as { code?: string }).code !== "EOF") throw e;',
        "    }",
        "    if (n === 0) break;",
        `    ${k.letti}.push(byte[0]);`,
        "    if (byte[0] === 10) break;",
        "  }",
        `  if (${k.letti}.length === 0) ${ferma(m.input_exhausted)};`,
        `  if (${k.letti}.at(-1) === 10) {`,
        `    ${k.letti}.pop();`,
        `    if (${k.letti}.at(-1) === 13) ${k.letti}.pop();`,
        "  }",
        "  try {",
        `    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(new Uint8Array(${k.letti}));`,
        "  } catch {",
        `    ${ferma(m.invalid_input)};`,
        "  }",
        "}",
      ];
    case "leggiIntero": {
      const c = k.cifre;
      const valore = `Number(${c}[1] + ${c}[2])`;
      return [
        s(f),
        `function ${n.leggiIntero}(): number {`,
        `  const ${k.riga} = ${n.leggiRiga}();`,
        `  const ${c} = /^ *([+-]?)0*([0-9]{1,10}) *$/.exec(${k.riga});`,
        `  if (${c} === null || !(-2147483648 <= ${valore} && ${valore} <= 2147483647)) ${ferma(m.invalid_input)};`,
        `  return ${valore};`,
        "}",
      ];
    }
    case "leggiReale":
      return lettura(f, "): number", `!/^ *[+-]?[0-9]{1,}(\\.[0-9]+([eE][+-]?[0-9]+)?)? *$/.test(${k.riga}) || !Number.isFinite(Number(${k.riga}))`, `Number(${k.riga})`);
    case "leggiCarattere":
      return lettura(f, "): string", `${n.lunghezza}(${k.riga}) !== 1`, k.riga);
    case "leggiStringa":
      return lettura(f, "n: number): string", `${n.lunghezza}(${k.riga}) > n || ${k.riga}.includes("\\0")`, k.riga);
    case "leggiBooleano":
      return lettura(f, "): boolean", `${k.riga} !== "true" && ${k.riga} !== "false"`, `${k.riga} === "true"`);
    case "dividi":
      return [s(f), `function ${n.dividi}(a: number, b: number): number {`, "  return Math.trunc(a / b);", "}"];
    case "convertiAReale":
      return [s(f), `function ${n.convertiAReale}(n: number): number {`, "  return n + 0;", "}"];
    case "elevatoA":
      return [
        s(f),
        `function ${n.elevatoA}(x: number, y: number): number {`,
        `  /** ${k.quantiBit} */`,
        `  function ${k.bitDi}(b: bigint): number {`,
        "    return b.toString(2).length;",
        "  }",
        "",
        `  /** ${k.dueAllaE} */`,
        `  function ${k.dueAlla}(e: number): number {`,
        "    const b = new DataView(new ArrayBuffer(8));",
        "    if (e >= -1022) b.setInt32(0, (e + 1023) << 20);",
        "    else if (e + 1074 >= 32) b.setInt32(0, 1 << (e + 1042));",
        "    else b.setUint32(4, (1 << (e + 1074)) >>> 0);",
        "    return b.getFloat64(0);",
        "  }",
        "",
        `  /** ${k.piuVicino} */`,
        `  function ${k.arrotondato}(num: bigint, den: bigint, p: number): number {`,
        `    const s = 55 - (${k.bitDi}(num) - ${k.bitDi}(den));`,
        "    const n = s >= 0 ? num << BigInt(s) : num;",
        "    const d = s >= 0 ? den : den << BigInt(-s);",
        "    const q0 = n / d;",
        `    // ${k.ilValore}`,
        `    let ${k.ultimo} = Math.max(p - s + ${k.bitDi}(q0) - 53, -1074);`,
        `    const t = BigInt(${k.ultimo} - (p - s));`,
        "    let q = q0 >> t;",
        `    const ${k.resto} = q0 & ((1n << t) - 1n);`,
        `    const ${k.meta} = 1n << (t - 1n);`,
        `    if (${k.resto} > ${k.meta} || (${k.resto} === ${k.meta} && (n % d !== 0n || (q & 1n) === 1n))) q += 1n;`,
        "    if (q === 0n) return 0;",
        `    if (${k.bitDi}(q) > 53) {`,
        "      q >>= 1n;",
        `      ${k.ultimo}++;`,
        "    }",
        `    if (${k.ultimo} + ${k.bitDi}(q) - 1 > 1023) return Infinity;`,
        `    return Number(q) * ${k.dueAlla}(${k.ultimo});`,
        "  }",
        "",
        "  if (!(Number.isFinite(x) && x !== 0 && Number.isInteger(y) && Math.abs(y) <= 1100)) return Math.pow(x, y);",
        `  // ${k.esatta}`,
        `  const ${k.bit} = new DataView(new ArrayBuffer(8));`,
        `  ${k.bit}.setFloat64(0, Math.abs(x));`,
        `  const ${k.alto} = ${k.bit}.getUint32(0);`,
        `  let m = (BigInt(${k.alto} & 0xfffff) << 32n) | BigInt(${k.bit}.getUint32(4)) | (${k.alto} >>> 20 > 0 ? 1n << 52n : 0n);`,
        `  let e = Math.max(${k.alto} >>> 20, 1) - 1075;`,
        "  while ((m & 1n) === 0n) {",
        "    m >>= 1n;",
        "    e++;",
        "  }",
        "  const k = Math.abs(y);",
        "  const mk = m ** BigInt(k);",
        `  const v = y >= 0 ? ${k.arrotondato}(mk, 1n, e * k) : ${k.arrotondato}(1n, mk, -e * k);`,
        "  return x < 0 && k % 2 === 1 ? -v : v;",
        "}",
      ];
    case "arrotonda":
      return [s(f), `function ${n.arrotonda}(x: number): number {`, "  const t = Math.trunc(x);", "  return Math.abs(x - t) >= 0.5 ? t + (x < 0 ? -1 : 1) : t;", "}"];
    case "convertiACarattere":
      return [
        s(f),
        `function ${n.convertiACarattere}(n: number): string {`,
        `  if (!(0 <= n && n <= 0x10FFFF) || (0xD800 <= n && n <= 0xDFFF)) ${ferma(m.invalid_character_code)};`,
        "  return String.fromCodePoint(n);",
        "}",
      ];
    case "convertiAVettore": {
      const spazio = riempimento === 0x20;
      const spiegazione = {
        it: `I caratteri della stringa, poi ${spazio ? "lo spazio" : "il carattere"} di riempimento fino a n elementi.`,
        en: `The characters of the string, then the padding ${spazio ? "space" : "character"} up to n elements.`,
      }[lingua];
      return [
        `/** ${spiegazione} */`,
        `function ${n.convertiAVettore}(s: string, n: number): string[] {`,
        "  const c = Array.from(s);",
        `  if (c.length > n) ${ferma(m.string_longer_than_array)};`,
        `  return c.concat(new Array<string>(n - c.length).fill(${letteraleStringa([riempimento])}));`,
        "}",
      ];
    }
    case "convertiAStringa":
      return [s(f), `function ${n.convertiAStringa}(v: string[]): string {`, `  if (v.includes("\\0")) ${ferma(m.null_character_in_string)};`, '  return v.join("");', "}"];
    case "carattereDi":
      return [
        s(f),
        `function ${n.carattereDi}(s: string, i: number): string {`,
        "  const c = Array.from(s);",
        `  if (!(0 <= i && i < c.length)) ${ferma(m.index_out_of_range)};`,
        "  return c[i];",
        "}",
      ];
    case "lunghezza":
      return [s(f), `function ${n.lunghezza}(s: string): number {`, "  return Array.from(s).length;", "}"];
    case "confronta":
      return [
        s(f),
        `function ${n.confronta}(a: string, b: string): number {`,
        "  const x = Array.from(a);",
        "  const y = Array.from(b);",
        "  for (let i = 0; i < x.length && i < y.length; i++) {",
        "    if (x[i] !== y[i]) return x[i].codePointAt(0)! - y[i].codePointAt(0)!;",
        "  }",
        "  return x.length - y.length;",
        "}",
      ];
    case "nellaStringa":
      return [s(f), `function ${n.nellaStringa}(c: string): string {`, `  if (c === "\\0") ${ferma(m.null_character_in_string)};`, "  return c;", "}"];
    case "concatenazione":
      return [s(f), `function ${n.concatenazione}(a: string, b: string): string {`, `  if (a === "\\0" || b === "\\0") ${ferma(m.null_character_in_string)};`, "  return a + b;", "}"];
    case "alPiu":
      return [s(f), `function ${n.alPiu}(s: string, n: number): string {`, `  if (${n.lunghezza}(s) > n) ${ferma(m.string_too_long)};`, "  return s;", "}"];
    case "elementiDiversi":
      // Il `set` del Python: due indici uguali lo fanno più corto dell'elenco.
      return [s(f), `function ${n.elementiDiversi}(...${k.indici}: number[]): void {`, `  if (new Set(${k.indici}).size < ${k.indici}.length) ${ferma(m.same_reference)};`, "}"];
    case "reale": {
      const scala = `1${"0".repeat(decimali)}n`;
      const cifre = k.cifre;
      const segno = `\${${k.alto} >>> 31 === 1 ? "-" : ""}`;
      return [
        `/** ${{ it: `Un reale con ${decimali} decimali, come nel C: sul valore esatto del numero, la metà alla cifra pari.`, en: `A real with ${decimali} decimals, as in C: on the exact value of the number, halves to the even digit.` }[lingua]} */`,
        `function ${n.reale}(x: number): string {`,
        `  // ${k.daiBit}`,
        `  const ${k.bit} = new DataView(new ArrayBuffer(8));`,
        `  ${k.bit}.setFloat64(0, x);`,
        `  const ${k.alto} = ${k.bit}.getUint32(0);`,
        `  const ${k.esponente} = (${k.alto} >>> 20) & 0x7ff;`,
        `  const mantissa = (BigInt(${k.alto} & 0xfffff) << 32n) | BigInt(${k.bit}.getUint32(4)) | (${k.esponente} > 0 ? 1n << 52n : 0n);`,
        `  const e = Math.max(${k.esponente}, 1) - 1075;`,
        "  let q: bigint;",
        "  if (e >= 0) {",
        `    q = (mantissa << BigInt(e)) * ${scala};`,
        "  } else {",
        `    const ${k.numeratore} = mantissa * ${scala};`,
        `    const ${k.denominatore} = 1n << BigInt(-e);`,
        `    q = ${k.numeratore} / ${k.denominatore};`,
        `    const ${k.resto} = 2n * (${k.numeratore} % ${k.denominatore});`,
        `    if (${k.resto} > ${k.denominatore} || (${k.resto} === ${k.denominatore} && q % 2n === 1n)) q += 1n;`,
        "  }",
        `  const ${cifre} = q.toString().padStart(${decimali + 1}, "0");`,
        decimali === 0 ? `  return \`${segno}\${${cifre}}\`;` : `  return \`${segno}\${${cifre}.slice(0, -${decimali})}.\${${cifre}.slice(-${decimali})}\`;`,
        "}",
      ];
    }
    case "booleano":
      return [s(f), `function ${n.booleano}(b: boolean): string {`, '  return b ? "true" : "false";', "}"];
    case "scrivi":
      return [s(f), `function ${n.scrivi}(${k.testo}: string): void {`, `  writeSync(1, ${k.testo});`, "}"];
    case "entraNellaRicorsione": {
      // I contatori stanno sopra, a livello del modulo; `fermati` scrive la riga di chi ha chiamato la funzione del giro
      // (salta una cornice del programma: quella della funzione del giro).
      const c = contatoriDellaRicorsione[lingua];
      return [
        `let ${c.chiamate} = 0;`,
        `let ${c.spazio} = 0;`,
        "",
        "",
        s(f),
        `function ${n.entraNellaRicorsione}(${k.spazio}: number): void {`,
        `  ${c.chiamate} += 1;`,
        `  ${c.spazio} += ${k.spazio};`,
        `  if (${c.chiamate} > ${tetto}) ${n.fermati}("${m.recursion_too_deep}", 1);`,
        `  if (${c.spazio} > ${spazioDellaPila}) ${n.fermati}("${m.recursion_data_too_large}", 1);`,
        "}",
      ];
    }
    case "esciDallaRicorsione": {
      const c = contatoriDellaRicorsione[lingua];
      return [s(f), `function ${n.esciDallaRicorsione}(${k.spazio}: number): void {`, `  ${c.chiamate} -= 1;`, `  ${c.spazio} -= ${k.spazio};`, "}"];
    }
  }
}
