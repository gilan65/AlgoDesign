// Il controllo statico delle tappe da 1 a 4: strutture di base, i cicli `per` e `per ogni`, espressioni, lettura e scrittura, procedure e funzioni coi loro parametri e le
// chiamate, la ricorsione.
//
// La ricorsione (una funzione che richiama sé stessa, direttamente o attraverso altre) non ha regole proprie: il
// controllo la accetta, e l'interprete la esegue fino ai suoi tetti. Le funzioni del giro (`funzioniDelGiro`) sono
// quelle che contano per i tetti; i giri (`giriDellaRicorsione`) l'interfaccia li dice all'utente. Ogni strato
// (interprete, generatori, interfaccia) chiama `controlla`. L'esito «fuori tappa» oggi non c'è: resta per un costrutto
// che il nucleo conoscerà prima dell'interfaccia.
//
// Ogni funzione ha i suoi dati, controllati come quelli del programma principale e con gli stessi avvisi; i
// parametri stanno nella vista dei dati, senza valore iniziale, ruolo né natura di costante, e solo in una procedura o
// in una funzione. Una procedura compie un lavoro (legge, scrive, cambia i dati ricevuti per riferimento o per
// uscita); una funzione calcola un risultato dai dati che riceve e non fa altro: una lettura, una scrittura, un salto a
// una procedura o un parametro per riferimento o per uscita in una funzione sono `function_with_effect`. Il valore restituito si
// controlla come un'assegnazione a un dato del tipo restituito, il valore predefinito come un valore iniziale. Una
// funzione può restituire una stringa, con la sua lunghezza massima, o un vettore, con la sua dimensione: le due misure
// seguono le regole di quelle di un dato, e un vettore non ha valore predefinito.
//
// Un vettore intero (il nome di un vettore, o una funzione che lo restituisce) va dove va il nome di un vettore: nella
// sorgente di un «per ogni», in un argomento vettore per valore, in `converti_a_stringa`, con l'indice. E riceve un
// valore tutto insieme da un vettore dello stesso tipo e della stessa dimensione (`array_assignment` altrimenti): col
// nome è la copia elemento per elemento; la lunghezza degli elementi di un vettore di stringhe si controlla durante la
// copia.
//
// Una chiamata: la procedura col blocco di salto, la funzione dentro un'espressione (`function_as_statement`,
// `procedure_in_expression` altrimenti), un argomento per parametro. Per valore l'argomento è un'espressione del tipo
// del parametro (un intero in un reale avvisa, `implicit_conversion`, o `integer_division_to_real` se viene da una
// divisione intera); un vettore vuole un vettore della stessa dimensione, un dato stringa la stessa lunghezza massima,
// e un'altra espressione stringa vale come un'assegnazione. Per riferimento e per uscita l'argomento è un dato scritto
// per nome (una variabile o un elemento di un vettore, mai fra parentesi), dello stesso tipo e della stessa misura; lo
// stesso dato due volte nella stessa chiamata è `same_reference`. Un riferimento vuole il valore (il dato entra ed
// esce): un dato che su nessuna strada ha un valore prima del salto è `reference_without_value`, solo senza altri
// errori statici, come gli avvisi che seguono i percorsi; dove non è certo lo ferma l'interprete al legame. Un
// parametro per uscita parte senza valore.
//
// I due cicli («per» e «per ogni»): il contatore è un dato semplice intero, l'elemento un dato semplice del tipo
// dell'elemento (un carattere per una stringa), la sorgente il nome di un vettore o di una stringa; inizio e fine
// sono espressioni intere, il passo un intero diverso da zero dentro `int`. Il ciclo assegna il contatore e
// l'elemento: valgono le regole di una destinazione, e dentro il corpo sono in sola lettura, anche per un ciclo
// interno sullo stesso dato (`assign_to_read_only`). Il contatore lo legge il ciclo stesso, a ogni controllo.
//
// I due avvisi del dato inutile, dato per dato e solo senza errori statici: `unused_data` per il dato senza valore
// iniziale che nessun blocco nomina, `unused_value` per quello che riceve un valore (iniziale, da un'assegnazione,
// da una lettura, da un `per ogni`, da una chiamata per un parametro per valore) che nessuna espressione legge. Un
// parametro per riferimento che riceve un valore lo dà a chi chiama: non è mai `unused_value`.
//
// Il blocco di un errore o di un avviso della vista dei dati è l'`id` della funzione che possiede il dato;
// per una costante comune è vuoto, e vuol dire «il progetto» (per questo un `id` vuoto
// non si apre). Il file non dice QUALE dato: l'esito lo dice a parte (`dati`), con la funzione e la posizione del dato,
// per la vista dei dati; lì un avviso di ruolo compare per ogni dato, non una volta per funzione.
//
// I tre tetti delle impostazioni sono un parametro senza predefinito: ogni chiamante li passa
// (l'interfaccia quelli delle Impostazioni, la riga di comando dei casi i predefiniti, `tetti`).
//
// Con un errore statico gli avvisi dei RUOLI non si calcolano: dipendono da tutte le letture e le
// scritture, e un blocco con un errore si abbandona a metà (un dato letto o scritto lì risulterebbe mai
// letto o mai scritto). Lo stesso per il dato letto prima di avere un valore (`maybe_uninitialized`), che
// segue tutti i percorsi del programma. Gli altri avvisi sono del loro blocco e restano, ma nel blocco che
// ha l'errore solo quelli incontrati prima del punto in cui il controllo si ferma.
//
// Attraverso le chiamate: un parametro per riferimento letto dalla console dalla procedura è un dato letto da chi la
// chiama, e un parametro che la procedura mostra in una scrittura mostra ciò che chi chiama le passa (i ruoli); il
// dato passato per riferimento si legge al salto e ce l'ha dopo, quello passato per uscita ha un valore dopo se la
// procedura gliene dà certamente uno, e altrimenti lo perde (il dato letto prima di avere un valore).
//
// Che cosa il controllo NON guarda:
// - il valore delle condizioni, per il dato letto prima di avere un valore: un «mentre true» può non fare
//   giri e un «se» costante ha due rami (un avviso in più, mai uno in meno);
// - quale elemento di un vettore ha un valore: un elemento scritto vale per tutto il vettore (un avviso in meno:
//   `w[0] ← 1` seguito dalla lettura di `w[1]` non avvisa, e l'esecuzione si ferma lì);
// - fra i nomi riservati, quelli delle intestazioni del C che il programma generato non legge (le funzioni della
//   libreria che nessuna regola chiama: un dato dentro `main` le copre senza danno); ci sono le parole del C11, di
//   Python 3, degli operatori e i nomi dei programmi generati (`genera/nomi.ts`);
// - un letterale reale diverso da zero che diventa zero (`1e-400`): solo l'infinito è fuori intervallo;
// - lo stesso avviso due volte sullo stesso blocco: se ne segnala uno;
// - per il dato inutile, se la lettura si esegue davvero: un dato letto solo in un ramo che non si prende mai, o
//   dopo un blocco che ferma sempre l'esecuzione, conta come letto;
// - per il dato inutile, a chi serve la lettura: un dato che si legge solo per aggiornarsi (`k ← k + 1`, mai
//   scritto né usato altrove) conta come letto, come dice la regola dell'avviso («che nessuna espressione legge»); un dato
//   passato per riferimento conta come letto e come assegnato, qualunque cosa la procedura ne faccia;
// - due elementi dello stesso vettore passati per riferimento con indici calcolati: coincidono solo durante
//   l'esecuzione, e li ferma l'interprete; qui solo il vettore intero con un suo elemento, e due indici scritti come
//   lo stesso numero;
// - per i ruoli, gli argomenti di una funzione dentro una scrittura: si mostra il risultato, non i dati da cui si
//   calcola (come un indice);
// - nella ricorsione indiretta, ciò che una procedura fa ai parametri quando la si incontra mentre se ne percorre
//   un'altra del giro: vale la stima di quel momento, non quella finale (solo la procedura percorsa si rifà fino a non
//   cambiare più).

import { analizza, parole, type Causa, type Espressione, type Fermata } from "../espressioni/analizzatore";
import { nomiDelleIntestazioni, nomiRiservatiDeiGeneratori } from "../genera/nomi";
import type { Blocco, CodiceAvviso, CodiceErroreStatico, Dato, Funzione, GenereDiFunzione, Progetto, Segnalazione, Tipo } from "../progetto/modello";

/** I tetti delle impostazioni dell'app. */
export interface Tetti {
  readonly elementiDiUnVettore: number;
  readonly lunghezzaDiUnaStringa: number;
  /** Elementi per lunghezza massima: anche ogni riga della tabella di traccia tiene il vettore. */
  readonly caratteriDiUnVettoreDiStringhe: number;
}

/** I valori predefiniti dei tetti: quelli della riga di comando dei casi e dell'interprete. */
export const tetti: Tetti = { elementiDiUnVettore: 1000, lunghezzaDiUnaStringa: 1000, caratteriDiUnVettoreDiStringhe: 10_000 };
export const lunghezzaPredefinita = 255;

/** Gli avvisi che cadono sulla riga di un dato: l'esito li dice anche dato per dato (`dati`). */
export const avvisiDelDato = ["input_never_read", "output_never_written", "missing_role", "unused_data", "unused_value"] as const;
type AvvisoDelDato = (typeof avvisiDelDato)[number];

/** Un errore o un avviso di un dato, con la funzione e la posizione del dato nella sua tabella. */
export interface SegnalazioneDiUnDato {
  readonly genere: "errore" | "avviso";
  readonly code: CodiceErroreStatico | CodiceAvviso;
  /** Una costante comune, o un dato di una funzione. */
  readonly comune: boolean;
  /** L'`id` della funzione che possiede il dato; vuoto per una costante comune. */
  readonly funzione: string;
  readonly indice: number;
  /** La causa precisa, per un codice che ne ha più d'una. */
  readonly fermata?: Fermata;
}

/** La causa precisa di un errore o di un avviso di un blocco (o della funzione stessa: il nome, le misure del risultato):
 * fuori da `errori` e `avvisi`, che hanno la forma dell'atteso di un caso. Le cause dei dati stanno sulla loro riga. */
export interface FermataDelBlocco {
  readonly code: CodiceErroreStatico | CodiceAvviso;
  readonly block: string;
  readonly fermata: Fermata;
}

export type EsitoDelControllo =
  | { readonly fuoriTappa: true; readonly blocchi: readonly string[] }
  | {
      readonly fuoriTappa: false;
      readonly errori: readonly Segnalazione<CodiceErroreStatico>[];
      /** Le cause precise degli errori e degli avvisi dei blocchi che ne hanno una. */
      readonly fermate: readonly FermataDelBlocco[];
      readonly avvisi: readonly Segnalazione<CodiceAvviso>[];
      /** Gli stessi errori della vista dei dati, e gli avvisi dei ruoli, dato per dato. */
      readonly dati: readonly SegnalazioneDiUnDato[];
      /** I dati dell'avviso `maybe_uninitialized`: il blocco che legge, la funzione e la posizione del dato, nell'ordine
       * delle letture. */
      readonly primaDelValore: readonly LetturaSenzaValore[];
      /** I parametri per riferimento delle procedure (la funzione e la posizione nei suoi dati) che la procedura non
       * legge prima di dar loro un valore: a loro il messaggio di `reference_without_value` può proporre il passaggio per
       * uscita. Vuoto con altri errori statici. */
      readonly versoOut: readonly { readonly funzione: string; readonly indice: number }[];
      /** I dati dell'errore `reference_without_value` prima di eseguire: il salto, la procedura chiamata e la posizione nei
       * suoi dati del parametro che riceve il dato senza valore, nell'ordine dei salti e degli argomenti. */
      readonly senzaValoreAlSalto: readonly { readonly block: string; readonly funzione: string; readonly indice: number }[];
    };

/** Un dato che un blocco può leggere prima che abbia un valore. */
export interface LetturaSenzaValore {
  readonly block: string;
  readonly funzione: string;
  readonly indice: number;
}

const riservati = new Set(
  [
    // C11, 6.4.1 (quelle col trattino basso iniziale non sono nomi validi comunque)
    "auto break case char const continue default do double else enum extern float for goto if inline int long",
    "register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while",
    // Python 3
    "False None True and as assert async await break class continue def del elif else except finally for from",
    "global if import in is lambda nonlocal not or pass raise return try while with yield",
    // Gli operatori a parola nelle due lingue
    "and or not mod true false pi pi_greco to_integer to_real to_character to_array to_string length absolute_value",
    "square_root raised_to round round_down round_up integer_part converti_a_intero converti_a_reale",
    "converti_a_carattere converti_a_vettore converti_a_stringa lunghezza valore_assoluto radice_quadrata elevato_a",
    "arrotonda per_difetto per_eccesso parte_intera",
  ]
    .join(" ")
    .split(" ")
    // I nomi che il codice generato usa per sé, in ogni lingua.
    .concat(nomiRiservatiDeiGeneratori),
);

/** Il nome di ciò che nel C sta a livello di file (una procedura, una funzione, una costante comune): nemmeno un nome
 * che le intestazioni del C dichiarano lì. */
const delleIntestazioni = new Set(nomiDelleIntestazioni);

/** Un nome valido: una lettera ASCII, poi lettere, cifre e trattino basso (`\w` senza il flag `u`), al più 63, e non
 * riservato; `nelFile` per un nome a livello di file. La causa del primo difetto (una lettera accentata o un segno
 * diacritico a parte, uno spazio, un altro simbolo, citati col carattere), `undefined` se il nome è valido. Esportata per
 * chi chiede un nome prima di crearlo (la finestra di una procedura o di una funzione). */
export function causaDelNome(nome: string, nelFile: boolean): Fermata | undefined {
  if (nome === "") return { causa: "nome_vuoto" };
  if (/^\d/.test(nome)) return { causa: "nome_cifra" };
  if (nome.startsWith("_")) return { causa: "nome_trattino" };
  const caratteri = Array.from(nome);
  const i = caratteri.findIndex((c) => !/^\w$/.test(c));
  if (i >= 0) {
    const c = caratteri[i]!;
    if (/\p{L}/u.test(c)) return { causa: "nome_accentato", segno: c };
    // Un accento scritto a parte si cita con la lettera che lo porta.
    if (/\p{M}/u.test(c)) return { causa: "nome_accentato", segno: `${caratteri[i - 1] ?? ""}${c}` };
    return /\s/u.test(c) ? { causa: "nome_spazio" } : { causa: "nome_simbolo", segno: c };
  }
  if (nome.length > 63) return { causa: "nome_lungo" };
  if (riservati.has(nome)) return { causa: "nome_riservato", segno: nome };
  if (nelFile && delleIntestazioni.has(nome)) return { causa: "nome_della_libreria", segno: nome };
  return undefined;
}
/** Esportata per chi chiede un nome prima di crearlo (`motivoDelNome` delle operazioni sulle funzioni). */
export const nomeValidoNelFile = (nome: string) => causaDelNome(nome, true) === undefined;

/** Il tipo di un'espressione; per un vettore intero anche la dimensione e la lunghezza massima degli elementi. */
type Valore = { readonly tipo: Tipo; readonly vettore: boolean; readonly divisioneIntera: boolean; readonly dimensione?: number; readonly lunghezza?: number };

class Errore {
  constructor(
    readonly codice: CodiceErroreStatico,
    readonly fermata?: Fermata,
  ) {}
}

const errore = (codice: CodiceErroreStatico, fermata?: Fermata): never => {
  throw new Errore(codice, fermata);
};

/** Un errore di un dato o delle misure del risultato, con la sua causa se il codice ne ha più d'una. */
type Difetto = { readonly codice: CodiceErroreStatico; readonly fermata?: Fermata };
const difetto = (codice: CodiceErroreStatico, causa?: Causa, segno?: string): Difetto =>
  causa === undefined ? { codice } : { codice, fermata: { causa, ...(segno === undefined ? {} : { segno }) } };

/** Da dove un dato riceve un valore, per la causa del valore che nessuno legge (il valore iniziale si guarda a parte). */
type Provenienza = "solo_assegnazione" | "solo_lettura" | "solo_per_ogni" | "solo_parametro";

const intMin = -2147483648;
const intMax = 2147483647;

const numero = (t: Tipo) => t === "integer" || t === "real";
const lunghezza = (d: Pick<Dato, "max_length">) => d.max_length ?? lunghezzaPredefinita;

const sotto = (e: Espressione): readonly Espressione[] =>
  e.genere === "indice"
    ? [e.base, e.indice]
    : e.genere === "unario"
      ? [e.operando]
      : e.genere === "binario"
        ? [e.sinistro, e.destro]
        : e.genere === "chiamata"
          ? e.argomenti
          : [];

const nomiIn = (e: Espressione): string[] => (e.genere === "nome" ? [e.nome] : sotto(e).flatMap(nomiIn));

/** I nomi delle funzioni che un'espressione chiama. */
export const chiamateIn = (e: Espressione): string[] => [...(e.genere === "chiamata" ? [e.nome] : []), ...sotto(e).flatMap(chiamateIn)];

/** I nomi il cui valore una scrittura mostra, per i ruoli: tutti, tranne quelli usati solo dentro un indice, che
 * dicono quale elemento mostrare (in `parola[i]` si mostra un carattere di `parola`, non `i`), e gli argomenti di una
 * funzione, da cui si calcola il risultato mostrato. */
const mostrati = (e: Espressione): string[] =>
  e.genere === "indice"
    ? mostrati(e.base)
    : e.genere === "unario"
      ? mostrati(e.operando)
      : e.genere === "binario"
        ? [...mostrati(e.sinistro), ...mostrati(e.destro)]
        : e.genere === "chiamata"
          ? []
          : nomiIn(e);

/** I testi di un blocco che l'analizzatore legge: destinazioni, espressioni, argomenti. */
export function testiDelBlocco(b: Blocco): readonly string[] {
  switch (b.kind) {
    case "assignment":
      return [b.target, b.value];
    case "read":
      return [b.target];
    case "write":
      return b.values;
    case "if":
    case "while":
    case "repeat":
      return [b.condition];
    case "for":
      return [b.counter, b.from, b.to];
    case "for_each":
      return [b.item, b.source];
    case "call":
      return b.arguments;
    case "comment":
      return [];
  }
}

export const figliDelBlocco = (b: Blocco): readonly Blocco[] =>
  b.kind === "if" ? [...b.then, ...b.else] : b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each" ? b.body : [];

/** Le funzioni che ogni blocco di una funzione chiama, per nome, nell'ordine dei blocchi (la fine per ultima); un
 * testo che non si lascia leggere non chiama nulla. */
export function chiamateDellaFunzione(f: Funzione): { block: string; nomi: string[] }[] {
  const fuori: { block: string; nomi: string[] }[] = [];
  const nomi = (testi: readonly string[]) =>
    testi.flatMap((t) => {
      const a = analizza(t);
      return a.ok ? chiamateIn(a.espressione) : [];
    });
  const visita = (b: Blocco) => {
    fuori.push({ block: b.id, nomi: [...(b.kind === "call" ? [b.callee] : []), ...nomi(testiDelBlocco(b))] });
    figliDelBlocco(b).forEach(visita);
  };
  f.body.forEach(visita);
  fuori.push({ block: f.end.id, nomi: nomi(f.end.return_value === undefined ? [] : [f.end.return_value]) });
  return fuori.filter((c) => c.nomi.length > 0);
}

/** Il grafo delle chiamate: le chiamate di ogni funzione, le funzioni di un nome, e se da `da` si arriva ad `a` seguendo
 * le chiamate (una visita con una pila, ogni funzione una volta). Una chiamata a un nome che non c'è non porta da
 * nessuna parte. */
function grafoDelleChiamate(p: Progetto) {
  const perNome = new Map<string, Funzione[]>();
  for (const f of p.functions) if (f.name !== undefined) perNome.set(f.name, [...(perNome.get(f.name) ?? []), f]);
  const chiamate = new Map(p.functions.map((f) => [f, chiamateDellaFunzione(f)]));
  const chiamati = (f: Funzione) => chiamate.get(f)!.flatMap((c) => c.nomi.flatMap((n) => perNome.get(n) ?? []));
  const arriva = (da: Funzione, a: Funzione): boolean => {
    const visti = new Set<Funzione>();
    const pila = [da];
    while (pila.length > 0) {
      const g = pila.pop()!;
      if (g === a) return true;
      if (visti.has(g)) continue;
      visti.add(g);
      pila.push(...chiamati(g));
    }
    return false;
  };
  return { perNome, chiamate, chiamati, arriva };
}

/** Le funzioni del giro: quelle da cui, seguendo le chiamate, si torna a sé stesse. Solo le loro
 * chiamate in corso, e i loro dati, contano per i tetti della ricorsione, nei tre esecutori. */
export function funzioniDelGiro(p: Progetto): ReadonlySet<Funzione> {
  const { chiamati, arriva } = grafoDelleChiamate(p);
  return new Set(p.functions.filter((f) => chiamati(f).some((g) => arriva(g, f))));
}

/** Le funzioni da cui, seguendo le chiamate, si arriva a una funzione del giro (quelle del giro comprese): un valore
 * restituito che ne chiama una può far partire chiamate del giro, e la chiamata che lo calcola resta in corso finché non
 * è pronto. I due generatori la leggono per contare la chiamata fino al ritorno, come l'interprete. */
export function funzioniVersoIlGiro(p: Progetto): ReadonlySet<Funzione> {
  const { arriva } = grafoDelleChiamate(p);
  const delGiro = [...funzioniDelGiro(p)];
  return new Set(p.functions.filter((f) => delGiro.some((g) => arriva(f, g))));
}

/** I giri della ricorsione, per dirli all'utente: ognuno è le funzioni nell'ordine delle chiamate, dalla prima del
 * progetto fino a quella che la chiama di nuovo (`[a]` se `a` chiama sé stessa, `[a, b]` se `a` chiama `b` che chiama di
 * nuovo `a`). Il giro più corto da ogni funzione del giro non ancora nominata, nell'ordine del progetto: ogni funzione
 * del giro sta almeno in uno. */
export function giriDellaRicorsione(p: Progetto): (readonly Funzione[])[] {
  const { chiamati, arriva } = grafoDelleChiamate(p);
  const delGiro = p.functions.filter((f) => chiamati(f).some((g) => arriva(g, f)));
  const nominate = new Set<Funzione>();
  const giri: Funzione[][] = [];
  for (const f of delGiro) {
    if (nominate.has(f)) continue;
    // Il cammino più corto da `f` a `f`: una visita in ampiezza, col passo di prima di ogni funzione raggiunta.
    const prima = new Map<Funzione, Funzione>();
    const coda = [f];
    let ultima: Funzione | undefined;
    for (let i = 0; i < coda.length && ultima === undefined; i++) {
      const g = coda[i]!;
      for (const h of chiamati(g)) {
        if (h === f) {
          ultima = g;
          break;
        }
        if (!prima.has(h)) {
          prima.set(h, g);
          coda.push(h);
        }
      }
    }
    const giro: Funzione[] = [];
    for (let g: Funzione | undefined = ultima; g !== undefined && g !== f; g = prima.get(g)) giro.unshift(g);
    giro.unshift(f);
    giro.forEach((g) => nominate.add(g));
    giri.push(giro);
  }
  return giri;
}

/** Un argomento di un salto a una procedura: il dato passato per riferimento, e i nomi che mostra se la procedura
 * mostra il parametro. */
type Argomento = { readonly riferimento?: string; readonly mostrati: readonly string[] };

/** Ciò che una funzione fa coi suoi dati, per i ruoli e il dato inutile. */
type Riepilogo = {
  readonly funzione: Funzione;
  /** I dati letti dalla console, e quelli mostrati in una scrittura (anche attraverso una procedura). */
  readonly letti: Set<string>;
  readonly scritti: Set<string>;
  /** I dati che un'espressione legge, e quelli a cui un blocco dà un valore. */
  readonly usati: Set<string>;
  readonly conValore: Set<string>;
  /** Da dove ogni dato riceve un valore (oltre al valore iniziale). */
  readonly provenienze: Map<string, Set<Provenienza>>;
  readonly salti: readonly { readonly procedura: Funzione; readonly argomenti: readonly Argomento[] }[];
};

/** `limiti` sono i tetti delle impostazioni: l'interfaccia passa quelli scelti, la riga di comando i predefiniti. */
export function controlla(p: Progetto, limiti: Tetti): EsitoDelControllo {
  const errori: Segnalazione<CodiceErroreStatico>[] = [];
  const fermate: FermataDelBlocco[] = [];
  const avvisi: Segnalazione<CodiceAvviso>[] = [];
  const avvisa = (code: CodiceAvviso, block: string, fermata?: Fermata) => {
    if (avvisi.some((a) => a.code === code && a.block === block)) return;
    avvisi.push({ code, block });
    if (fermata) fermate.push({ code, block, fermata });
  };
  /** Un errore sollevato da `corpo` è l'errore del blocco `block`, e il resto di `corpo` si abbandona. */
  const sulBlocco = (block: string, corpo: () => void) => {
    try {
      corpo();
    } catch (e) {
      if (!(e instanceof Errore)) throw e;
      errori.push({ code: e.codice, block });
      if (e.fermata) fermate.push({ code: e.codice, block, fermata: e.fermata });
    }
  };

  /** Le procedure e le funzioni per nome: con due funzioni dello stesso nome (un errore), la prima. */
  const funzioni = new Map<string, Funzione>();
  for (const f of p.functions) if (f.name !== undefined && !funzioni.has(f.name)) funzioni.set(f.name, f);

  // ------------------------------------------------------------------------------ la vista dei dati

  const perDato: SegnalazioneDiUnDato[] = [];
  const datiDi = (elenco: readonly Dato[], mappa: Map<string, Dato>, block: string, genere: GenereDiFunzione | undefined) => {
    const comune = genere === undefined;
    for (const [indice, d] of elenco.entries()) {
      const doppio = mappa.has(d.name);
      if (!doppio) mappa.set(d.name, d);
      const segnala = ({ codice: code, fermata }: Difetto) => {
        errori.push({ code, block });
        perDato.push({ genere: "errore", code, comune, funzione: block, indice, ...(fermata ? { fermata } : {}) });
      };
      const sbagliato = erroreDelDato(d, genere);
      if (sbagliato !== undefined) segnala(sbagliato);
      else if (doppio) segnala(difetto("invalid_name", "nome_doppio", d.name));
    }
  };

  /** Le regole di validità della vista dei dati (nome, tipo e forma, costante, valore iniziale, lunghezza, parametro)
   * su un dato di una funzione del genere dato (nessun genere: una costante comune), nell'ordine: il primo errore, con
   * la sua causa. */
  function erroreDelDato(d: Dato, genere: GenereDiFunzione | undefined): Difetto | undefined {
    const comune = genere === undefined;
    const delNome = causaDelNome(d.name, comune);
    if (delNome !== undefined) return { codice: "invalid_name", fermata: delNome };
    const misura = erroreDellaMisura(d);
    if (misura !== undefined) return misura;
    if (d.parameter !== undefined) {
      // Il programma principale non ha parametri, né il progetto; un parametro riceve il valore dalla chiamata.
      if (comune || genere === "main") return difetto("invalid_data_item", "parametro_fuori_posto");
      if (d.constant === true || d.initial !== undefined || d.role !== undefined) return difetto("invalid_data_item", "parametro_con_attributi");
      // Una funzione riceve copie: un parametro per riferimento o per uscita cambierebbe i dati di chi la chiama.
      return genere === "function" && d.parameter !== "value" ? difetto("function_with_effect", "parametro_non_copia", d.name) : undefined;
    }
    // Una costante comune è una costante senza ruolo.
    if (comune && d.constant !== true) return difetto("invalid_data_item", "comune_non_costante");
    if (d.constant === true && d.initial === undefined) return difetto("invalid_data_item", "costante_senza_valore");
    if (d.constant === true && d.role !== undefined) return difetto("invalid_data_item", "costante_con_ruolo");
    if (d.initial === undefined) return undefined;
    if (d.size === undefined) return typeof d.initial === "string" ? erroreDelLetterale(d.initial, d) : difetto("invalid_data_item", "forma_del_valore");
    if (typeof d.initial === "string") return difetto("invalid_data_item", "forma_del_valore");
    if (Array.isArray(d.initial)) {
      if (d.initial.length !== d.size) return difetto("invalid_data_item", "elenco_di_altra_lunghezza", String(d.initial.length));
      // Il primo letterale sbagliato: gli altri, prima, si leggono.
      return d.initial.map((x) => erroreDelLetterale(x, d)).find((c) => c !== undefined);
    }
    return erroreDelLetterale((d.initial as { each: string }).each, d);
  }

  /** La dimensione e la lunghezza massima di un dato, o del risultato di una funzione: dentro i limiti, la lunghezza solo
   * per una stringa. Un limite superato cita il limite. */
  function erroreDellaMisura(d: Pick<Dato, "type" | "size" | "max_length">): Difetto | undefined {
    if (d.size !== undefined && d.size < 1) return difetto("invalid_data_item", "dimensione_non_valida");
    if (d.size !== undefined && d.size > limiti.elementiDiUnVettore) return difetto("limit_exceeded", "oltre_elementi", String(limiti.elementiDiUnVettore));
    if (d.max_length !== undefined && d.type !== "string") return difetto("invalid_data_item", "lunghezza_non_stringa");
    if (d.max_length !== undefined && d.max_length < 1) return difetto("invalid_data_item", "lunghezza_non_valida");
    if (d.max_length !== undefined && d.max_length > limiti.lunghezzaDiUnaStringa) return difetto("limit_exceeded", "oltre_lunghezza", String(limiti.lunghezzaDiUnaStringa));
    if (d.type === "string" && d.size !== undefined && d.size * lunghezza(d) > limiti.caratteriDiUnVettoreDiStringhe)
      return difetto("limit_exceeded", "oltre_caratteri", String(limiti.caratteriDiUnVettoreDiStringhe));
    return undefined;
  }

  /** Il risultato di una funzione con le misure di un dato: il tipo, la dimensione del vettore, la lunghezza massima. */
  const comeDato = (f: Funzione): Pick<Dato, "type" | "size" | "max_length"> => ({
    type: f.return_type!,
    ...(f.return_size !== undefined ? { size: f.return_size } : {}),
    ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}),
  });

  /** Un valore iniziale: un letterale del tipo del dato, col meno ammesso davanti a un numero. Un testo che
   * non si lascia leggere porta la causa della lettura; uno che non è un letterale (un nome, un calcolo) cita sé stesso. */
  function erroreDelLetterale(testo: string, d: Pick<Dato, "type" | "max_length">): Difetto | undefined {
    const a = analizza(testo);
    if (!a.ok) return a.fermata ? { codice: a.codice, fermata: a.fermata } : { codice: a.codice };
    let e = a.espressione;
    if (e.genere === "unario" && e.operatore === "-") {
      const o = e.operando;
      if (o.genere !== "intero" && o.genere !== "reale")
        return ["carattere", "stringa", "booleano"].includes(o.genere) ? difetto("type_mismatch") : difetto("invalid_data_item", "valore_non_scritto", testo);
      e = o;
    }
    const tipoDelLetterale: Partial<Record<Espressione["genere"], Tipo>> = {
      intero: "integer",
      reale: "real",
      carattere: "character",
      stringa: "string",
      booleano: "boolean",
    };
    const t = tipoDelLetterale[e.genere];
    if (t === undefined) return difetto("invalid_data_item", "valore_non_scritto", testo);
    if (t !== d.type && !(t === "integer" && d.type === "real")) return difetto("type_mismatch");
    if (e.genere === "stringa" && e.codici.length > (d.max_length ?? lunghezzaPredefinita)) return difetto("string_literal_too_long");
    return undefined;
  }

  const comuni = new Map<string, Dato>();
  datiDi(p.shared_constants ?? [], comuni, "", undefined);
  const nomiDeiDati = new Set(p.functions.flatMap((f) => f.data.map((d) => d.name)));
  const nomiDelleFunzioni = new Set<string>();
  /** Un errore della funzione stessa (il nome, le misure del risultato), con la sua causa sul blocco della funzione. */
  const dellaFunzione = (f: Funzione, { codice, fermata }: Difetto) => {
    errori.push({ code: codice, block: f.id });
    if (fermata) fermate.push({ code: codice, block: f.id, fermata });
  };

  /** Il nome di una procedura o di una funzione: valido, e non già di un'altra funzione, di un dato o di una costante
   * comune (nessuno ne nasconde un altro). */
  function nomeDellaFunzione(f: Funzione): void {
    if (f.name === undefined) return;
    const causa = causaDelNome(f.name, true);
    if (causa !== undefined) dellaFunzione(f, { codice: "invalid_name", fermata: causa });
    else if (nomiDelleFunzioni.has(f.name) || comuni.has(f.name) || nomiDeiDati.has(f.name)) errori.push({ code: "function_name_in_use", block: f.id });
    nomiDelleFunzioni.add(f.name);
  }

  // ------------------------------------------------------------------------------------ le regole

  // La funzione che si controlla, coi suoi dati (le costanti comuni comprese). `letti` e `scritti` sono i dati letti
  // dalla console e mostrati in output (i ruoli); `usati` quelli che un'espressione legge, `conValore` quelli a cui un
  // blocco dà un valore (il dato inutile).
  let corrente = p.functions[0]!;
  let dati = new Map<string, Dato>();
  let letti = new Set<string>();
  let scritti = new Set<string>();
  let usati = new Set<string>();
  let conValore = new Set<string>();
  let provenienze = new Map<string, Set<Provenienza>>();
  let salti: { procedura: Funzione; argomenti: Argomento[] }[] = [];
  /** I contatori e gli elementi dei cicli in cui si sta, col genere del loro ciclo: lì sono in sola lettura. */
  const soloLettura = new Map<string, "for" | "for_each">();
  const riepiloghi: Riepilogo[] = [];
  /** Un dato riceve un valore da `da`. */
  const riceve = (nome: string, da: Provenienza) => {
    conValore.add(nome);
    provenienze.set(nome, new Set([...(provenienze.get(nome) ?? []), da]));
  };

  function blocco(b: Blocco): void {
    sulBlocco(b.id, () => regola(b));
    if (b.kind === "if") [...b.then, ...b.else].forEach(blocco);
    if (b.kind === "while" || b.kind === "repeat") b.body.forEach(blocco);
    if (b.kind === "for" || b.kind === "for_each") nelCiclo(b.kind === "for" ? b.counter : b.item, b.body, b.kind);
  }

  /** Il corpo di un ciclo, col suo contatore o il suo elemento in sola lettura (se è un nome). */
  function nelCiclo(testo: string, corpo: readonly Blocco[], genere: "for" | "for_each"): void {
    const a = analizza(testo);
    const nome = a.ok && a.espressione.genere === "nome" && !soloLettura.has(a.espressione.nome) ? a.espressione.nome : undefined;
    if (nome !== undefined) soloLettura.set(nome, genere);
    corpo.forEach(blocco);
    if (nome !== undefined) soloLettura.delete(nome);
  }
  /** La causa di un dato in sola lettura perché è il contatore o l'elemento di un ciclo. */
  const delCicloInCorso = (nome: string, contatore: Causa, elemento: Causa): Fermata => ({ causa: soloLettura.get(nome) === "for" ? contatore : elemento, segno: nome });

  function analizzato(testo: string): Espressione {
    const a = analizza(testo);
    return a.ok ? a.espressione : errore(a.codice, a.fermata);
  }

  /** Una funzione calcola e basta: legge, scrive e salta a una procedura solo una procedura o il programma. */
  const soloFuoriDaUnaFunzione = (causa: Causa) => {
    if (corrente.kind === "function") errore("function_with_effect", { causa });
  };

  function regola(b: Blocco): void {
    switch (b.kind) {
      case "call":
        return salto(b.id, b.callee, b.arguments);
      case "for": {
        // Il contatore lo legge il ciclo stesso: da dove riceve il valore non si dice mai.
        const contatore = delCiclo(b.counter, b.id, "solo_assegnazione");
        if (contatore.tipo !== "integer") errore("type_mismatch");
        // Il ciclo lo legge a ogni controllo.
        usati.add(contatore.nome);
        for (const testo of [b.from, b.to]) {
          const v = valore(analizzato(testo), b.id);
          if (v.tipo !== "integer" || v.vettore) errore("type_mismatch");
        }
        if (b.step !== undefined && (b.step === 0 || b.step < intMin || b.step > intMax)) errore("invalid_step");
        return;
      }
      case "for_each": {
        // Il nome di un vettore o di una stringa, o una funzione che ne restituisce uno (chiamata una volta, all'inizio).
        const e = analizzato(b.source);
        if (e.genere !== "nome" && e.genere !== "chiamata") errore("type_mismatch");
        const sorgente = valore(e, b.id);
        if (!sorgente.vettore && sorgente.tipo !== "string") errore("type_mismatch");
        if (delCiclo(b.item, b.id, "solo_per_ogni").tipo !== (sorgente.vettore ? sorgente.tipo : "character")) errore("type_mismatch");
        return;
      }
      case "comment":
        return;
      case "read": {
        soloFuoriDaUnaFunzione("funzione_legge");
        const d = destinazione(b.target, b.id, "solo_lettura");
        letti.add(d.nome);
        if (d.vettore) errore("array_assignment");
        return;
      }
      case "write":
        soloFuoriDaUnaFunzione("funzione_scrive");
        for (const testo of b.values) {
          const e = analizzato(testo);
          mostrati(e).forEach((n) => scritti.add(n));
          if (valore(e, b.id).vettore) errore("type_mismatch");
        }
        return;
      case "assignment":
        return assegnazione(b.target, b.value, b.id);
      case "if":
      case "while":
      case "repeat": {
        const e = analizzato(b.condition);
        const v = valore(e, b.id);
        if (v.tipo !== "boolean" || v.vettore) errore("condition_not_boolean");
        // Sempre vera non si ferma; sempre falsa un «mentre» non comincia e un «ripeti» fa un giro solo.
        if (b.kind !== "if" && e.genere === "booleano")
          avvisa("constant_loop_condition", b.id, { causa: e.valore ? "sempre_vera" : b.kind === "while" ? "mentre_falsa" : "ripeti_falsa" });
        return;
      }
    }
  }

  /** Il blocco di salto a una procedura: una funzione non si chiama come blocco, e una funzione
   * non salta. */
  function salto(block: string, callee: string, testi: readonly string[]): void {
    const procedura = funzioni.get(callee) ?? errore("unknown_callee");
    if (procedura.kind === "function") errore("function_as_statement");
    soloFuoriDaUnaFunzione("funzione_salta");
    const argomenti = argomentiDi(
      procedura,
      testi.map((testo) => ({ testo, espressione: analizzato(testo) })),
      block,
    );
    salti.push({ procedura, argomenti });
  }

  /** Gli argomenti di una chiamata contro i parametri, nell'ordine. Il testo c'è nel blocco
   * di salto: lì un argomento per riferimento fra parentesi si vede. */
  function argomentiDi(g: Funzione, argomenti: readonly { testo?: string; espressione: Espressione }[], block: string): Argomento[] {
    const parametri = g.data.filter((d) => d.parameter !== undefined);
    if (argomenti.length !== parametri.length)
      errore("argument_mismatch", { causa: argomenti.length > parametri.length ? "argomenti_in_piu" : "argomenti_in_meno", segno: g.name ?? "" });
    const perRiferimento: { nome: string; indice?: Espressione }[] = [];
    return parametri.map((parametro, i) => {
      const a = argomenti[i]!;
      if (parametro.parameter === "value") {
        perValore(parametro, a.espressione, block);
        return { mostrati: mostrati(a.espressione) };
      }
      const r = riferimento(parametro, a.testo, a.espressione, block);
      // Lo stesso dato due volte: il vettore intero insieme a un suo elemento, o due indici scritti come lo stesso
      // numero; con indici calcolati lo vede l'interprete.
      const stessoIndice = (x?: Espressione, y?: Espressione) =>
        x === undefined || y === undefined || (x.genere === "intero" && y.genere === "intero" && x.valore === y.valore);
      if (perRiferimento.some((altro) => altro.nome === r.nome && stessoIndice(altro.indice, r.indice))) errore("same_reference");
      perRiferimento.push(r);
      return { riferimento: r.nome, mostrati: [r.nome] };
    });
  }

  /** Un argomento per valore: l'espressione arriva come una copia, del tipo del parametro. */
  function perValore(parametro: Dato, e: Espressione, block: string): void {
    const v = valore(e, block);
    const per = (causa: Causa): Fermata => ({ causa, segno: parametro.name });
    if (parametro.size !== undefined) {
      // La copia di un vettore intero (il suo nome, o una funzione che lo restituisce): lo stesso tipo e la stessa misura.
      if (!v.vettore) errore("argument_mismatch", per("semplice_per_vettore"));
      // Una lunghezza massima diversa delle stringhe è una causa sua: tipo e dimensione possono coincidere.
      if (v.tipo !== parametro.type || v.dimensione !== parametro.size) errore("argument_mismatch", per("vettore_diverso"));
      else if (v.tipo === "string" && v.lunghezza !== lunghezza(parametro)) errore("argument_mismatch", per("lunghezza_diversa_nel_vettore"));
      return;
    }
    if (v.vettore) errore("argument_mismatch", per("vettore_per_semplice"));
    if (parametro.type === "real" && v.tipo === "integer") inUnReale(v, block);
    else if (parametro.type !== v.tipo) errore("argument_mismatch", per("tipo_diverso"));
    if (parametro.type !== "string") return;
    // Un dato stringa ha la lunghezza massima del parametro; un'altra espressione vale come un'assegnazione.
    const d = datoDellaStringa(e);
    if (d !== undefined && !stessaMisura(d, parametro)) errore("argument_mismatch", per("lunghezza_diversa"));
    if (e.genere === "stringa" && e.codici.length > lunghezza(parametro)) errore("string_literal_too_long");
  }

  /** Il tipo e, per una stringa, la lunghezza massima. */
  const stessaMisura = (d: Dato, parametro: Dato) => d.type === parametro.type && (d.type !== "string" || lunghezza(d) === lunghezza(parametro));

  /** Il dato di un'espressione stringa che è un dato: il nome di una stringa, o l'elemento di un vettore di stringhe. */
  function datoDellaStringa(e: Espressione): Dato | undefined {
    if (e.genere === "nome") return dati.get(e.nome);
    if (e.genere === "indice" && e.base.genere === "nome") {
      const d = dati.get(e.base.nome);
      return d?.size !== undefined ? d : undefined;
    }
    return undefined;
  }

  /** Un argomento per riferimento: un dato scritto per nome, che si può cambiare, dello stesso tipo e della stessa misura. */
  function riferimento(parametro: Dato, testo: string | undefined, e: Espressione, block: string): { nome: string; indice?: Espressione } {
    // Un calcolo, un valore scritto o un dato fra parentesi non si passano: le parentesi non lasciano traccia
    // nell'albero, e si vedono dalla prima parola del testo.
    const perNome = e.genere === "nome" || (e.genere === "indice" && e.base.genere === "nome");
    // Un argomento che non è un dato si dice col nome del parametro: un argomento di una chiamata dentro un'espressione
    // non ha il suo testo.
    if (!perNome) errore("reference_not_assignable", { causa: "non_un_dato", segno: parametro.name });
    if (testo !== undefined && parole(testo)?.[0]?.genere !== "nome") errore("reference_not_assignable", { causa: "fra_parentesi", segno: parametro.name });
    const nome = e.genere === "nome" ? e.nome : ((e as { base: { nome: string } }).base.nome);
    const dato = dati.get(nome) ?? errore("unknown_name");
    if (dato.constant === true) errore("reference_not_assignable", { causa: "costante_passata", segno: nome });
    if (soloLettura.has(nome)) errore("reference_not_assignable", delCicloInCorso(nome, "contatore_passato", "elemento_passato"));
    const indice = e.genere === "indice" ? e.indice : undefined;
    if (indice !== undefined) {
      if (dato.size === undefined && dato.type === "string") errore("reference_not_assignable", { causa: "carattere_passato", segno: nome });
      if (dato.size === undefined) errore("type_mismatch");
      const i = valore(indice, block);
      if (i.tipo !== "integer" || i.vettore) errore("type_mismatch");
    }
    // Lo stesso tipo e la stessa misura: un vettore intero per un vettore della stessa dimensione, un dato semplice o un
    // elemento per un parametro semplice.
    const vettore = dato.size !== undefined && indice === undefined;
    const alParametro = parametro.size !== undefined;
    const per = (causa: Causa): Fermata => ({ causa, segno: parametro.name });
    if (vettore && !alParametro) errore("argument_mismatch", per("vettore_per_semplice"));
    if (!vettore && alParametro) errore("argument_mismatch", per("semplice_per_vettore"));
    if (vettore && (dato.type !== parametro.type || dato.size !== parametro.size)) errore("argument_mismatch", per("vettore_diverso"));
    else if (vettore && !stessaMisura(dato, parametro)) errore("argument_mismatch", per("lunghezza_diversa_nel_vettore"));
    if (dato.type !== parametro.type) errore("argument_mismatch", per("tipo_per_riferimento"));
    if (!stessaMisura(dato, parametro)) errore("argument_mismatch", per("lunghezza_diversa"));
    // La procedura può leggerlo e dargli un valore.
    usati.add(nome);
    conValore.add(nome);
    return indice === undefined ? { nome } : { nome, indice };
  }

  /** Una destinazione: un nome, o l'elemento di un vettore. */
  function destinazione(testo: string, block: string, da: Provenienza): { nome: string; dato: Dato; vettore: boolean; tipo: Tipo } {
    const e = analizzato(testo);
    const base = e.genere === "indice" ? e.base : e;
    if (base.genere !== "nome") return errore("syntax_error", { causa: "destinazione" });
    const dato = dati.get(base.nome) ?? errore("unknown_name");
    if (dato.constant === true) errore("assign_to_constant");
    if (soloLettura.has(base.nome)) errore("assign_to_read_only", delCicloInCorso(base.nome, "contatore_del_ciclo", "elemento_del_ciclo"));
    riceve(base.nome, da);
    if (e.genere === "nome") return { nome: base.nome, dato, vettore: dato.size !== undefined, tipo: dato.type };
    if (dato.size === undefined && dato.type === "string") return errore("assign_to_read_only", { causa: "carattere_della_stringa", segno: base.nome });
    if (dato.size === undefined) return errore("type_mismatch");
    const i = valore((e as { indice: Espressione }).indice, block);
    if (i.tipo !== "integer" || i.vettore) errore("type_mismatch");
    return { nome: base.nome, dato, vettore: false, tipo: dato.type };
  }

  /** Il contatore o l'elemento di un ciclo: una destinazione che è un dato semplice, non un vettore né un suo elemento. */
  function delCiclo(testo: string, block: string, da: Provenienza): { nome: string; tipo: Tipo } {
    const d = destinazione(testo, block, da);
    if (d.vettore || analizzato(testo).genere !== "nome") errore("type_mismatch");
    return d;
  }

  function assegnazione(target: string, testo: string, block: string): void {
    const d = destinazione(target, block, "solo_assegnazione");
    const e = analizzato(testo);
    // Le due conversioni fra stringa e vettore di caratteri valgono solo come lato destro intero.
    if (e.genere === "unario" && (e.operatore === "to_array" || e.operatore === "to_string")) {
      const o = valore(e.operando, block);
      const daStringa = e.operatore === "to_array";
      const ok = daStringa
        ? d.vettore && d.tipo === "character" && o.tipo === "string" && !o.vettore
        : !d.vettore && d.tipo === "string" && o.tipo === "character" && o.vettore;
      if (!ok) errore("type_mismatch");
      return;
    }
    if (d.vettore) return vettoreIntero(e, d.dato, block);
    const v = valore(e, block);
    if (v.vettore) errore("type_mismatch");
    if (d.tipo === "real" && v.tipo === "integer") comeReale(v, block);
    else if (d.tipo !== v.tipo) errore("type_mismatch");
    if (e.genere === "stringa" && e.codici.length > lunghezza(d.dato)) errore("string_literal_too_long");
  }

  /** Un vettore che riceve un valore tutto insieme: da un vettore dello stesso tipo e della stessa dimensione, il suo nome
   * (la copia elemento per elemento) o una funzione che lo restituisce. */
  function vettoreIntero(e: Espressione, verso: Pick<Dato, "type" | "size">, block: string): void {
    if (e.genere !== "nome" && e.genere !== "chiamata") errore("array_assignment");
    const v = valore(e, block);
    if (!v.vettore || v.tipo !== verso.type || v.dimensione !== verso.size) errore("array_assignment");
  }

  /** La fine di una funzione: il valore restituito, come un'assegnazione a un dato del tipo restituito. */
  function fine(f: Funzione): void {
    if (f.kind !== "function") return;
    sulBlocco(f.end.id, () => {
      const e = analizzato(f.end.return_value!);
      if (f.return_size !== undefined) return vettoreIntero(e, comeDato(f), f.end.id);
      const v = valore(e, f.end.id);
      if (v.vettore) errore("type_mismatch");
      if (f.return_type === "real" && v.tipo === "integer") inUnReale(v, f.end.id);
      else if (f.return_type !== v.tipo) errore("type_mismatch");
      if (e.genere === "stringa" && e.codici.length > lunghezza(comeDato(f))) errore("string_literal_too_long");
    });
  }

  // ------------------------------------------------------------------------ i tipi e le conversioni

  /** Un intero che diventa reale: se viene da una divisione intera, l'avviso. */
  function comeReale(v: Valore, block: string): void {
    if (v.tipo === "integer" && v.divisioneIntera) avvisa("integer_division_to_real", block);
  }

  /** Un intero che passa in un parametro reale o nel risultato di una funzione reale: il tipo cambia senza che sia
   * scritto. La divisione intera ha l'avviso suo, che dice di più. */
  function inUnReale(v: Valore, block: string): void {
    avvisa(v.divisioneIntera ? "integer_division_to_real" : "implicit_conversion", block);
  }

  const semplice = (tipo: Tipo, divisioneIntera = false): Valore => ({ tipo, vettore: false, divisioneIntera });

  function valore(e: Espressione, block: string): Valore {
    switch (e.genere) {
      case "intero":
        return semplice("integer");
      case "reale":
      case "pi":
        return semplice("real");
      case "carattere":
        return semplice("character");
      case "stringa":
        return semplice("string");
      case "booleano":
        return semplice("boolean");
      case "nome": {
        const d = dati.get(e.nome) ?? errore("unknown_name");
        usati.add(e.nome);
        return d.size === undefined ? semplice(d.type) : { tipo: d.type, vettore: true, divisioneIntera: false, dimensione: d.size, lunghezza: lunghezza(d) };
      }
      case "indice": {
        const base = valore(e.base, block);
        const i = valore(e.indice, block);
        if (i.tipo !== "integer" || i.vettore) errore("type_mismatch");
        if (base.vettore) return semplice(base.tipo);
        return base.tipo === "string" ? semplice("character") : errore("type_mismatch");
      }
      case "chiamata": {
        const g = funzioni.get(e.nome) ?? errore("unknown_callee");
        if (g.kind === "procedure") errore("procedure_in_expression");
        argomentiDi(
          g,
          e.argomenti.map((espressione) => ({ espressione })),
          block,
        );
        const r = comeDato(g);
        return r.size === undefined ? semplice(r.type) : { tipo: r.type, vettore: true, divisioneIntera: false, dimensione: r.size, lunghezza: lunghezza(r) };
      }
      case "unario":
        return unario(e.operatore, valore(e.operando, block), block);
      case "binario":
        return binario(e, block);
    }
  }

  function unario(op: string, o: Valore, block: string): Valore {
    if (o.vettore) errore("type_mismatch");
    const t = o.tipo;
    const inutile = (verso: Tipo) => {
      avvisa("useless_conversion", block);
      return semplice(verso, o.divisioneIntera);
    };
    switch (op) {
      case "-":
      case "absolute_value":
        return numero(t) ? o : errore("type_mismatch");
      case "not":
        return t === "boolean" ? o : errore("type_mismatch");
      case "to_integer":
        return t === "integer" ? inutile("integer") : t === "real" || t === "character" ? semplice("integer") : errore("type_mismatch");
      case "to_real":
        return t === "real" ? inutile("real") : t === "integer" ? semplice("real") : errore("type_mismatch");
      case "to_character":
        return t === "character" ? inutile("character") : t === "integer" ? semplice("character") : errore("type_mismatch");
      case "length":
        return t === "string" ? semplice("integer") : errore("type_mismatch");
      case "square_root":
      case "round":
      case "round_down":
      case "round_up":
      case "integer_part":
        if (!numero(t)) errore("type_mismatch");
        comeReale(o, block);
        return semplice("real");
      default:
        // `to_array` e `to_string` fuori dal lato destro intero di un'assegnazione.
        return errore("type_mismatch");
    }
  }

  function binario(e: Extract<Espressione, { genere: "binario" }>, block: string): Valore {
    const l = valore(e.sinistro, block);
    const r = valore(e.destro, block);
    if (l.vettore || r.vettore) errore("type_mismatch");
    const op = e.operatore;
    const interi = l.tipo === "integer" && r.tipo === "integer";
    const numeri = numero(l.tipo) && numero(r.tipo);
    const misti = () => {
      comeReale(l, block);
      comeReale(r, block);
    };
    const zeroLetterale = e.destro.genere === "intero" && e.destro.valore === 0;
    switch (op) {
      case "+":
      case "-":
      case "*":
        if (interi) return semplice("integer", l.divisioneIntera || r.divisioneIntera);
        if (numeri) return misti(), semplice("real");
        if (op === "+" && (l.tipo === "string" || r.tipo === "string") && [l.tipo, r.tipo].every((t) => t === "string" || t === "character"))
          return semplice("string");
        return errore("type_mismatch");
      case "/":
        if (interi) return zeroLetterale ? errore("division_by_literal_zero") : semplice("integer", true);
        if (numeri) return misti(), semplice("real");
        return errore("type_mismatch");
      case "mod":
        if (!interi) return errore("type_mismatch");
        return zeroLetterale ? errore("division_by_literal_zero") : semplice("integer", l.divisioneIntera || r.divisioneIntera);
      case "raised_to":
        if (!numeri) return errore("type_mismatch");
        return misti(), semplice("real");
      case "and":
      case "or":
        return l.tipo === "boolean" && r.tipo === "boolean" ? semplice("boolean") : errore("type_mismatch");
      default: {
        // I confronti: numeri fra loro, caratteri fra loro, stringhe fra loro; `==` e `!=` anche i booleani.
        const uguaglianza = op === "==" || op === "!=";
        if (numeri) {
          // Solo un confronto con un reale converte l'intero; fra due interi non c'è conversione.
          if (!interi) misti();
          if (uguaglianza && (l.tipo === "real" || r.tipo === "real")) avvisa("real_equality", block);
          return semplice("boolean");
        }
        const confrontabili = l.tipo === r.tipo && (l.tipo === "character" || l.tipo === "string" || (uguaglianza && l.tipo === "boolean"));
        return confrontabili ? semplice("boolean") : errore("type_mismatch");
      }
    }
  }

  for (const f of p.functions) {
    corrente = f;
    dati = new Map(comuni);
    letti = new Set();
    scritti = new Set();
    usati = new Set();
    conValore = new Set();
    provenienze = new Map();
    salti = [];
    nomeDellaFunzione(f);
    datiDi(f.data, dati, f.id, f.kind);
    if (f.kind === "function") {
      // Le misure del risultato come quelle di un dato; il valore predefinito un letterale del tipo, e un vettore non ne ha.
      const misura = erroreDellaMisura(comeDato(f));
      if (misura !== undefined) dellaFunzione(f, misura);
      if (f.default_result !== undefined && (f.return_size !== undefined || erroreDelLetterale(f.default_result, comeDato(f)) !== undefined))
        errori.push({ code: "invalid_default_value", block: f.id });
    }
    // Un parametro per valore riceve il valore dalla chiamata.
    for (const d of f.data) if (d.parameter === "value") riceve(d.name, "solo_parametro");
    f.body.forEach(blocco);
    fine(f);
    riepiloghi.push({ funzione: f, letti, scritti, usati, conValore, provenienze, salti });
  }

  // ---------------------------------------------------------------------- i ruoli e il dato inutile

  if (errori.length > 0) return { fuoriTappa: false, errori, fermate, avvisi, dati: perDato, primaDelValore: [], versoOut: [], senzaValoreAlSalto: [] };

  const riepilogoDi = new Map(riepiloghi.map((r) => [r.funzione, r]));
  /** Gli effetti di ogni procedura sui parametri per riferimento e per uscita, calcolati una volta (`effettiDi`). */
  const effetti = new Map<Funzione, { lettiPrima: Set<string>; daranno: Set<string> }>();

  // Un riferimento vuole il valore: un dato che su nessuna strada ne ha uno prima del salto è un errore. Qui solo dove è
  // certo; altrove lo ferma l'interprete al legame.
  const versoOut = parametriVersoOut();
  const { trovati: senzaValoreCerto, argomenti: senzaValoreAlSalto } = riferimentiSenzaValore();
  // Qui gli errori di prima non ci sono: le cause sono quelle degli avvisi.
  if (senzaValoreCerto.length > 0) return { fuoriTappa: false, errori: senzaValoreCerto, fermate, avvisi, dati: perDato, primaDelValore: [], versoOut, senzaValoreAlSalto };

  // Attraverso i salti: un parametro per riferimento letto dalla console dalla procedura è un dato letto da chi la
  // chiama, e un parametro mostrato dalla procedura mostra ciò che chi chiama le passa. Senza ricorsione si arriva a
  // un punto fermo.
  for (let cambiato = true; cambiato; ) {
    cambiato = false;
    const aggiungi = (insieme: Set<string>, nome: string) => {
      if (!insieme.has(nome)) (insieme.add(nome), (cambiato = true));
    };
    for (const r of riepiloghi)
      for (const s of r.salti) {
        const suo = riepilogoDi.get(s.procedura)!;
        const parametri = s.procedura.data.filter((d) => d.parameter !== undefined);
        s.argomenti.forEach((a, i) => {
          const nome = parametri[i]!.name;
          if (a.riferimento !== undefined && suo.letti.has(nome)) aggiungi(r.letti, a.riferimento);
          if (suo.scritti.has(nome)) a.mostrati.forEach((m) => aggiungi(r.scritti, m));
        });
      }
  }

  const primaDelValore = senzaValore();
  /** Un avviso sulla riga di un dato (la causa sta lì, non fra le cause dei blocchi), e una volta sulla sua funzione. */
  const delDato = (code: AvvisoDelDato, indice: number, funzione: string, fermata?: Fermata) => {
    avvisa(code, funzione);
    perDato.push({ genere: "avviso", code, comune: funzione === "", funzione, indice, ...(fermata ? { fermata } : {}) });
  };
  /** Il dato inutile: senza valore iniziale e mai nominato, o col valore che nessuna espressione legge; questo con la
   * causa quando il valore arriva da un posto solo. */
  const inutile = (d: Dato, indice: number, funzione: string, r: Pick<Riepilogo, "usati" | "conValore" | "provenienze">) => {
    if (r.usati.has(d.name)) return;
    // Un parametro per riferimento o per uscita che riceve un valore lo dà a chi chiama.
    if (d.parameter === "reference" || d.parameter === "out") {
      if (!r.conValore.has(d.name)) delDato("unused_data", indice, funzione);
      return;
    }
    if (d.initial === undefined && !r.conValore.has(d.name)) return delDato("unused_data", indice, funzione);
    const da: Causa[] = [...(d.initial === undefined ? [] : ["solo_iniziale" as const]), ...(r.provenienze.get(d.name) ?? [])];
    delDato("unused_value", indice, funzione, da.length === 1 ? { causa: da[0]! } : undefined);
  };
  const usatiOvunque = { usati: new Set(riepiloghi.flatMap((r) => [...r.usati])), conValore: new Set<string>(), provenienze: new Map<string, Set<Provenienza>>() };
  (p.shared_constants ?? []).forEach((d, indice) => inutile(d, indice, "", usatiOvunque));
  for (const r of riepiloghi) {
    const f = r.funzione;
    const usaRuoli = f.data.some((d) => d.role !== undefined);
    for (const [indice, d] of f.data.entries()) {
      const input = d.role === "input" || d.role === "input_output";
      const output = d.role === "output" || d.role === "input_output";
      if (input && !r.letti.has(d.name)) delDato("input_never_read", indice, f.id);
      if (output && !r.scritti.has(d.name)) delDato("output_never_written", indice, f.id);
      const lettoOMostrato = r.letti.has(d.name) || r.scritti.has(d.name);
      if (usaRuoli && d.role === undefined && d.constant !== true && d.parameter === undefined && lettoOMostrato) delDato("missing_role", indice, f.id);
      inutile(d, indice, f.id, r);
    }
  }
  return { fuoriTappa: false, errori, fermate, avvisi, dati: perDato, primaDelValore, versoOut, senzaValoreAlSalto: [] };

  // -------------------------------------------------------- un riferimento che non ha mai un valore

  /** I salti che passano a un parametro per riferimento un dato che su NESSUNA strada dall'inizio della funzione ha un
   * valore: si segue l'insieme dei dati che POSSONO avere un valore (il valore iniziale, i parametri per valore e per
   * riferimento, un'assegnazione, una lettura, il contatore e l'elemento di un ciclo, un dato passato per uscita a una
   * procedura che gli dà un valore su qualche strada). Dopo un «se» lo possono avere quelli di uno dei due rami; un
   * ciclo si ripete finché l'insieme non cresce più, e i salti si giudicano solo sull'ultimo giro: un dato che ha un
   * valore al secondo giro non è un errore certo (lo ferma l'interprete al primo). Un elemento vale per il vettore.
   * `argomenti`: per ogni salto segnalato, i parametri che ricevono un dato senza valore. */
  function riferimentiSenzaValore(): { trovati: Segnalazione<CodiceErroreStatico>[]; argomenti: { block: string; funzione: string; indice: number }[] } {
    const trovati: Segnalazione<CodiceErroreStatico>[] = [];
    const argomenti: { block: string; funzione: string; indice: number }[] = [];
    const espressione = (testo: string) => (analizza(testo) as { espressione: Espressione }).espressione;
    const baseDi = (testo: string) => {
      const e = espressione(testo);
      return e.genere === "indice" ? (e.base as { nome: string }).nome : (e as { nome: string }).nome;
    };
    /** I dati che possono avere un valore dopo `blocchi`, partendo da `prima`; con `segnala` i salti si giudicano. */
    function sequenza(blocchi: readonly Blocco[], prima: ReadonlySet<string>, segnala: boolean): Set<string> {
      const possono = new Set(prima);
      /** Un ciclo: il corpo da capo finché l'insieme cresce, poi l'ultimo giro col giudizio. */
      const ciclo = (corpo: readonly Blocco[], entrata: Set<string>): Set<string> => {
        for (;;) {
          const dopo = sequenza(corpo, entrata, false);
          const quanti = entrata.size;
          dopo.forEach((n) => entrata.add(n));
          if (entrata.size === quanti) break;
        }
        sequenza(corpo, entrata, segnala);
        return entrata;
      };
      for (const b of blocchi) {
        switch (b.kind) {
          case "read":
          case "assignment":
            possono.add(baseDi(b.target));
            break;
          case "call": {
            const parametri = funzioni.get(b.callee)!.data.filter((d) => d.parameter !== undefined);
            const suoi = riepilogoDi.get(funzioni.get(b.callee)!)!;
            const avranno: string[] = [];
            b.arguments.forEach((testo, i) => {
              const parametro = parametri[i]!;
              if (parametro.parameter === "value") return;
              const nome = baseDi(testo);
              if (parametro.parameter === "reference" && segnala && !possono.has(nome)) {
                if (!trovati.some((t) => t.block === b.id)) trovati.push({ code: "reference_without_value", block: b.id });
                const g = funzioni.get(b.callee)!;
                const indice = g.data.indexOf(parametro);
                if (!argomenti.some((x) => x.block === b.id && x.indice === indice)) argomenti.push({ block: b.id, funzione: g.id, indice });
              }
              if (parametro.parameter === "out" && suoi.conValore.has(parametro.name)) avranno.push(nome);
            });
            avranno.forEach((n) => possono.add(n));
            break;
          }
          case "if":
            for (const n of [...sequenza(b.then, possono, segnala), ...sequenza(b.else, possono, segnala)]) possono.add(n);
            break;
          case "while":
            ciclo(b.body, possono);
            break;
          case "repeat":
            ciclo(b.body, possono);
            break;
          case "for":
            possono.add(baseDi(b.counter));
            ciclo(b.body, possono);
            break;
          case "for_each": {
            possono.add(baseDi(b.item));
            ciclo(b.body, possono);
            break;
          }
          default:
            break;
        }
      }
      return possono;
    }
    for (const f of p.functions) {
      const iniziano = [...(p.shared_constants ?? []), ...f.data].filter((d) => d.initial !== undefined || d.parameter === "value" || d.parameter === "reference");
      sequenza(f.body, new Set(iniziano.map((d) => d.name)), true);
    }
    return { trovati, argomenti };
  }

  /** I parametri per riferimento di ogni procedura che la procedura non legge prima di dar loro un valore su nessuna
   * strada, e a cui lo dà su ogni strada: per loro il messaggio del riferimento senza valore può proporre il passaggio per
   * uscita, che non cambia l'esito di chi chiama con un valore. Mai per un vettore: un elemento solo conta come valore,
   * e per uscita gli altri elementi resterebbero senza. */
  function parametriVersoOut(): { readonly funzione: string; readonly indice: number }[] {
    return p.functions.flatMap((g) => {
      if (g.kind !== "procedure") return [];
      const { lettiPrima, daranno } = effettiDi(g);
      return g.data.flatMap((d, indice) =>
        d.parameter === "reference" && d.size === undefined && !lettiPrima.has(d.name) && daranno.has(d.name) ? [{ funzione: g.id, indice }] : [],
      );
    });
  }

  // ---------------------------------------------------------- i dati letti prima di avere un valore

  /** Un dato si legge prima di avere un valore se c'è ALMENO UN percorso dall'inizio della sua funzione alla lettura su
   * cui nessuna azione gliene dà uno: si segue l'insieme dei dati che hanno certamente un valore. Il valore iniziale
   * lo dà dall'inizio, e così la chiamata a un parametro; un'assegnazione o una lettura dalla console da lì in poi,
   * anche di un solo elemento (che conta come valore del vettore). Un «mentre» può non fare nemmeno un giro, un
   * «ripeti» ne fa almeno uno; dopo un «se» hanno un valore i dati che l'hanno dopo tutti e due i rami. Gli altri giri
   * di un ciclo non tolgono nulla: si legge al primo. */
  function senzaValore(): LetturaSenzaValore[] {
    const trovate: LetturaSenzaValore[] = [];
    for (const f of p.functions) {
      const leggeSenza = (nome: string, block: string) => {
        const indice = f.data.findIndex((d) => d.name === nome);
        avvisa("maybe_uninitialized", block);
        if (!trovate.some((t) => t.block === block && t.indice === indice)) trovate.push({ block, funzione: f.id, indice });
      };
      percorri(f, iniziali(f), leggeSenza);
    }
    return trovate;
  }

  /** I dati che hanno un valore all'inizio di una funzione: le costanti comuni, i dati col valore iniziale, i parametri
   * per valore e per riferimento (un parametro per uscita parte senza). */
  function iniziali(f: Funzione): Set<string> {
    return new Set([...(p.shared_constants ?? []), ...f.data].filter((d) => d.initial !== undefined || d.parameter === "value" || d.parameter === "reference").map((d) => d.name));
  }

  /** Ciò che una procedura fa ai suoi parametri per riferimento e per uscita: quelli che legge prima di dar loro un
   * valore, e quelli a cui dà certamente un valore prima di tornare. Con la ricorsione la procedura si incontra mentre
   * la si sta percorrendo: lì vale l'ultima stima, che parte da «non ne legge nessuno, li dà tutti» e si rifà finché non
   * cambia più (dà un valore se lo danno le strade che finiscono; legge prima se una strada qualunque lo fa). */
  function effettiDi(g: Funzione): { lettiPrima: Set<string>; daranno: Set<string> } {
    const giaVisti = effetti.get(g);
    if (giaVisti !== undefined) return giaVisti;
    const perRiferimento = g.data.filter((d) => d.parameter === "reference" || d.parameter === "out").map((d) => d.name);
    let stima = { lettiPrima: new Set<string>(), daranno: new Set(perRiferimento) };
    for (;;) {
      effetti.set(g, stima);
      const lettiPrima = new Set<string>();
      const all = iniziali(g);
      perRiferimento.forEach((n) => all.delete(n));
      const dopo = percorri(g, all, (nome) => {
        if (perRiferimento.includes(nome)) lettiPrima.add(nome);
      });
      const fatti = { lettiPrima, daranno: new Set(perRiferimento.filter((n) => dopo.has(n))) };
      const uguali = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((n) => b.has(n));
      if (uguali(fatti.lettiPrima, stima.lettiPrima) && uguali(fatti.daranno, stima.daranno)) return fatti;
      stima = fatti;
    }
  }

  /** Il percorso di una funzione dall'inizio alla fine: chiama `leggeSenza` per ogni dato letto senza un valore certo, e
   * restituisce i dati che hanno certamente un valore alla fine. I testi sono già stati controllati. */
  function percorri(f: Funzione, prima: ReadonlySet<string>, leggeSenza: (nome: string, block: string) => void): Set<string> {
    const legge = (e: Espressione, hanno: ReadonlySet<string>, block: string) => {
      for (const nome of nomiIn(e)) if (!hanno.has(nome)) leggeSenza(nome, block);
    };
    const espressione = (testo: string) => (analizza(testo) as { espressione: Espressione }).espressione;
    /** Una destinazione: si legge l'indice, poi il dato ha un valore. */
    const assegna = (target: string, hanno: Set<string>, block: string) => {
      const e = espressione(target);
      if (e.genere === "indice") legge(e.indice, hanno, block);
      hanno.add(e.genere === "indice" ? (e.base as { nome: string }).nome : (e as { nome: string }).nome);
    };
    function sequenza(blocchi: readonly Blocco[], prima: ReadonlySet<string>): Set<string> {
      const hanno = new Set(prima);
      for (const b of blocchi) {
        switch (b.kind) {
          case "read":
            assegna(b.target, hanno, b.id);
            break;
          case "write":
            for (const testo of b.values) legge(espressione(testo), hanno, b.id);
            break;
          case "assignment":
            legge(espressione(b.value), hanno, b.id);
            assegna(b.target, hanno, b.id);
            break;
          case "call": {
            // Per valore si legge l'argomento. Per riferimento e per uscita si legge l'indice. Il riferimento vuole il
            // valore: il dato si legge al salto, e dopo ce l'ha. Per uscita il dato ha un valore dopo se la procedura
            // gliene dà certamente uno, e altrimenti, passato intero, lo perde (parte senza valore).
            const procedura = funzioni.get(b.callee)!;
            const parametri = procedura.data.filter((d) => d.parameter !== undefined);
            const suoi = effettiDi(procedura);
            const avranno: string[] = [];
            const perdono: string[] = [];
            b.arguments.forEach((testo, i) => {
              const parametro = parametri[i]!;
              const e = espressione(testo);
              if (parametro.parameter === "value") return legge(e, hanno, b.id);
              const nome = e.genere === "indice" ? (e.base as { nome: string }).nome : (e as { nome: string }).nome;
              if (e.genere === "indice") legge(e.indice, hanno, b.id);
              if (parametro.parameter === "reference") {
                if (!hanno.has(nome)) leggeSenza(nome, b.id);
                avranno.push(nome);
              } else if (suoi.daranno.has(parametro.name)) avranno.push(nome);
              else if (e.genere !== "indice") perdono.push(nome);
            });
            perdono.forEach((nome) => hanno.delete(nome));
            avranno.forEach((nome) => hanno.add(nome));
            break;
          }
          case "if": {
            legge(espressione(b.condition), hanno, b.id);
            const allora = sequenza(b.then, hanno);
            const altrimenti = sequenza(b.else, hanno);
            for (const nome of allora) if (altrimenti.has(nome)) hanno.add(nome);
            break;
          }
          case "while":
            legge(espressione(b.condition), hanno, b.id);
            sequenza(b.body, hanno);
            break;
          case "repeat": {
            const dopo = sequenza(b.body, hanno);
            legge(espressione(b.condition), dopo, b.id);
            dopo.forEach((nome) => hanno.add(nome));
            break;
          }
          case "for":
            // L'inizio si calcola prima del contatore, la fine dopo; il contatore ha un valore anche dopo il ciclo,
            // che può non fare giri.
            legge(espressione(b.from), hanno, b.id);
            assegna(b.counter, hanno, b.id);
            legge(espressione(b.to), hanno, b.id);
            sequenza(b.body, hanno);
            break;
          case "for_each": {
            // L'elemento ha un valore solo nel corpo: senza giri resta com'era.
            legge(espressione(b.source), hanno, b.id);
            const dentro = new Set(hanno);
            assegna(b.item, dentro, b.id);
            sequenza(b.body, dentro);
            break;
          }
          default:
            break;
        }
      }
      return hanno;
    }
    const alla = sequenza(f.body, prima);
    if (f.end.return_value !== undefined) legge(espressione(f.end.return_value), alla, f.end.id);
    return alla;
  }
}
