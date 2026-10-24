// L'analizzatore unico di espressioni, destinazioni e letterali: nel file sono testo, nella sintassi delle
// espressioni del linguaggio e coi nomi inglesi degli operatori a parola.
//
// Il testo si legge per CODICI Unicode, mai per unità UTF-16: un carattere fuori dal piano di base è un
// carattere solo. Per questo un letterale stringa è l'elenco dei suoi codici, e un carattere è un codice.
//
// L'analisi si ferma al primo errore. Gli errori sono codici d'errore statico del formato: la sintassi
// (`syntax_error`), i letterali (`literal_out_of_range`, `literal_leading_zero`, `multi_code_character`)
// e le due file vietate (`chained_comparison`, `chained_power`). I tipi li controlla chi usa l'albero.
//
// Un'espressione annidata oltre `tettoDiAnnidamento` livelli non si legge (`syntax_error`): l'analisi e
// chi percorre l'albero scendono per ricorsione, e lo stack dei motori finisce prima (misurato: Chromium
// a 976 livelli, WebKit a 1833, Bun a 2415). Contano due misure, e nessuna delle due supera il tetto:
// le aperture una dentro l'altra (parentesi, indici, argomenti, operatori con un operando) e la
// profondità dell'albero, dove ogni operatore contiene i suoi operandi (una somma di 64 termini ha 64
// livelli). 63 è anche il minimo di parentesi annidate che il C11 garantisce (5.2.4.1).

export const operatoriUnari = [
  "-", "not", "to_integer", "to_real", "to_character", "to_array", "to_string", "length", "absolute_value",
  "square_root", "round", "round_down", "round_up", "integer_part",
] as const;
export type OperatoreUnario = (typeof operatoriUnari)[number];

export type OperatoreBinario = "+" | "-" | "*" | "/" | "mod" | "raised_to" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "and" | "or";

export type Espressione =
  | { readonly genere: "intero"; readonly valore: number }
  | { readonly genere: "reale"; readonly valore: number }
  | { readonly genere: "carattere"; readonly codice: number }
  | { readonly genere: "stringa"; readonly codici: readonly number[] }
  | { readonly genere: "booleano"; readonly valore: boolean }
  | { readonly genere: "pi" }
  | { readonly genere: "nome"; readonly nome: string }
  | { readonly genere: "indice"; readonly base: Espressione; readonly indice: Espressione }
  | { readonly genere: "chiamata"; readonly nome: string; readonly argomenti: readonly Espressione[] }
  | { readonly genere: "unario"; readonly operatore: OperatoreUnario; readonly operando: Espressione }
  | {
      readonly genere: "binario";
      readonly operatore: OperatoreBinario;
      readonly sinistro: Espressione;
      readonly destro: Espressione;
    };

export type ErroreDiSintassi = "syntax_error" | "literal_out_of_range" | "literal_leading_zero" | "multi_code_character" | "chained_comparison" | "chained_power";

/** La causa precisa di un codice che ne ha più d'una: per i due della lettura, quella che ha fermato la lettura
 * (`destinazione` la dà il controllo, che sa quando il testo è una destinazione); per gli altri, il punto del controllo
 * che solleva il codice. I nomi sono unici fra tutti i codici: ognuno ha il suo testo. */
export const causeDeiCodici = {
  syntax_error: [
    "vuoto", "virgolette_aperte", "apice_aperto", "barra_rovesciata", "codice_vietato", "numero_scritto_male", "apici_vuoti",
    "uguale_solo", "lettera_accentata", "simbolo_sconosciuto", "tonda_aperta", "quadra_aperta", "operando_mancante",
    "operando_alla_fine", "simbolo_slegato", "troppo_annidata", "destinazione",
  ],
  multi_code_character: ["piu_caratteri", "accento_a_parte"],
  limit_exceeded: ["oltre_elementi", "oltre_lunghezza", "oltre_caratteri"],
  invalid_name: [
    "nome_vuoto", "nome_cifra", "nome_trattino", "nome_accentato", "nome_spazio", "nome_simbolo", "nome_lungo", "nome_riservato",
    "nome_della_libreria", "nome_doppio",
  ],
  invalid_data_item: [
    "dimensione_non_valida", "lunghezza_non_valida", "lunghezza_non_stringa", "costante_senza_valore", "costante_con_ruolo",
    "elenco_di_altra_lunghezza", "valore_non_scritto", "parametro_fuori_posto", "parametro_con_attributi", "comune_non_costante",
    "forma_del_valore",
  ],
  constant_loop_condition: ["sempre_vera", "mentre_falsa", "ripeti_falsa"],
  assign_to_read_only: ["carattere_della_stringa", "contatore_del_ciclo", "elemento_del_ciclo"],
  function_with_effect: ["funzione_legge", "funzione_scrive", "funzione_salta", "parametro_non_copia"],
  argument_mismatch: [
    "argomenti_in_piu", "argomenti_in_meno", "tipo_diverso", "tipo_per_riferimento", "lunghezza_diversa", "vettore_per_semplice",
    "semplice_per_vettore", "vettore_diverso", "lunghezza_diversa_nel_vettore",
  ],
  reference_not_assignable: ["non_un_dato", "fra_parentesi", "costante_passata", "contatore_passato", "elemento_passato", "carattere_passato"],
  unused_value: ["solo_iniziale", "solo_assegnazione", "solo_lettura", "solo_per_ogni", "solo_parametro"],
} as const;
export type CodiceConCause = keyof typeof causeDeiCodici;
export type Causa = (typeof causeDeiCodici)[CodiceConCause][number];

/** Dove la lettura si è fermata, quando il codice ha più cause: la causa e, per alcune, il pezzo di testo da citare. */
export interface Fermata {
  readonly causa: Causa;
  readonly segno?: string;
}

export type Analisi =
  | { readonly ok: true; readonly espressione: Espressione }
  | { readonly ok: false; readonly codice: ErroreDiSintassi; readonly fermata?: Fermata };

/** Il più grande letterale intero: il meno è un operatore, `INT_MIN` non si scrive. */
const interoMassimo = 2147483647;

/** I livelli di annidamento che un'espressione può avere (vedi l'intestazione). */
export const tettoDiAnnidamento = 63;

export const paroleChiave = new Set<string>(["and", "or", "not", "mod", "true", "false", "pi", "raised_to", ...operatoriUnari]);

type Simbolo =
  | { genere: "intero"; valore: number }
  | { genere: "reale"; valore: number }
  | { genere: "carattere"; codice: number }
  | { genere: "stringa"; codici: number[] }
  | { genere: "nome"; nome: string }
  | { genere: "parola"; parola: string }
  | { genere: "segno"; segno: string }
  | { genere: "fine" };

class Fermo {
  constructor(
    readonly codice: ErroreDiSintassi,
    readonly fermata?: Fermata,
  ) {}
}

const fermo = (codice: ErroreDiSintassi, causa?: Causa, segno?: string) =>
  new Fermo(codice, causa === undefined ? undefined : { causa, ...(segno === undefined ? {} : { segno }) });

const ferma = (codice: ErroreDiSintassi, causa?: Causa, segno?: string): never => {
  throw fermo(codice, causa, segno);
};

const cifra = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";
const lettera = (c: string | undefined) => c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"));

const escape: Record<string, number> = { n: 10, t: 9, "\\": 92, "'": 39, '"': 34 };

/** I simboli del testo, letto codice per codice, con la posizione di ciascuno: `da` e `a` contano i codici di
 * `Array.from(testo)`. `tollerante` non si
 * ferma mai: un letterale non chiuso arriva alla fine del testo, un segno sconosciuto è un segno di un carattere, e i
 * difetti di un letterale si lasciano al controllo. */
function simboliConPosizioni(testo: string, tollerante = false): { simboli: Simbolo[]; posizioni: { da: number; a: number }[] } {
  const c = Array.from(testo);
  const fuori: Simbolo[] = [];
  const posizioni: { da: number; a: number }[] = [];
  let i = 0;
  const ferma = (codice: ErroreDiSintassi, causa?: Causa, segno?: string): undefined => {
    if (!tollerante) throw fermo(codice, causa, segno);
    return undefined;
  };
  // Il contenuto di un letterale fra `chiusura`, con le sequenze di escape risolte (tollerante, un letterale non chiuso
  // arriva alla fine del testo).
  const codiciFino = (chiusura: string): number[] => {
    const codici: number[] = [];
    for (;;) {
      const x = c[i++];
      if (x === undefined) return ferma("syntax_error", chiusura === '"' ? "virgolette_aperte" : "apice_aperto") ?? codici;
      if (x === chiusura) return codici;
      if (x === "\\") {
        const e = escape[c[i++] ?? ""];
        if (e === undefined) ferma("syntax_error", "barra_rovesciata", `\\${c[i - 1] ?? ""}`);
        else codici.push(e);
      } else {
        // Il codice 0 e un surrogato isolato non sono caratteri di un letterale: entrano solo da un file
        // scritto a mano, e si fermano prima di partire.
        const codice = x.codePointAt(0)!;
        if (codice === 0 || (codice >= 0xd800 && codice <= 0xdfff)) ferma("syntax_error", "codice_vietato");
        codici.push(codice);
      }
    }
  };
  while (i < c.length) {
    const x = c[i]!;
    const da = i;
    const prima = fuori.length;
    if (x === " " || x === "\t") {
      i++;
    } else if (cifra(x)) {
      const inizio = i;
      while (cifra(c[i])) i++;
      const parteIntera = c.slice(inizio, i).join("");
      if (c[i] === "." && cifra(c[i + 1])) {
        i++;
        while (cifra(c[i])) i++;
        if ((c[i] === "e" || c[i] === "E") && (cifra(c[i + 1]) || ((c[i + 1] === "+" || c[i + 1] === "-") && cifra(c[i + 2])))) {
          i += 2;
          while (cifra(c[i])) i++;
        }
        const valore = Number(c.slice(inizio, i).join(""));
        if (!Number.isFinite(valore)) ferma("literal_out_of_range");
        fuori.push({ genere: "reale", valore });
      } else {
        if (parteIntera.length > 1 && parteIntera[0] === "0") ferma("literal_leading_zero");
        const valore = Number(parteIntera);
        if (valore > interoMassimo) ferma("literal_out_of_range");
        fuori.push({ genere: "intero", valore });
      }
      // Un numero seguito da una lettera, da un punto o da un trattino basso (`3.`, `1e5`, `2x`) non è un letterale.
      if (lettera(c[i]) || c[i] === "." || c[i] === "_") ferma("syntax_error", "numero_scritto_male", c.slice(inizio, i + 1).join(""));
    } else if (lettera(x)) {
      const inizio = i;
      while (lettera(c[i]) || cifra(c[i]) || c[i] === "_") i++;
      const nome = c.slice(inizio, i).join("");
      fuori.push(paroleChiave.has(nome) ? { genere: "parola", parola: nome } : { genere: "nome", nome });
    } else if (x === "'") {
      i++;
      const codici = codiciFino("'");
      if (codici.length === 0) ferma("syntax_error", "apici_vuoti");
      // Dopo il primo, solo segni che si uniscono al carattere prima (un accento scritto a parte): si vede un carattere.
      const uniti = codici.slice(1).every((k) => /\p{M}/u.test(String.fromCodePoint(k)));
      if (codici.length > 1) ferma("multi_code_character", uniti ? "accento_a_parte" : "piu_caratteri", c.slice(da, i).join(""));
      fuori.push({ genere: "carattere", codice: codici[0]! });
    } else if (x === '"') {
      i++;
      fuori.push({ genere: "stringa", codici: codiciFino('"') });
    } else {
      const due = x + (c[i + 1] ?? "");
      const segno = ["<=", ">=", "==", "!="].includes(due) ? due : "+-*/()[],<>".includes(x) ? x : undefined;
      // Un = solo è lo sbaglio più comune; una lettera fuori dall'ASCII è quasi sempre accentata. Un accento scritto a
      // parte (un segno che si unisce al carattere prima) si cita con la lettera che lo porta, come nel nome di un dato.
      const unito = /\p{M}/u.test(x);
      if (segno === undefined) ferma("syntax_error", x === "=" ? "uguale_solo" : /\p{L}/u.test(x) || unito ? "lettera_accentata" : "simbolo_sconosciuto", unito ? `${c[i - 1] ?? ""}${x}` : x);
      // Tollerante, un carattere sconosciuto è un segno di un codice (anche fuori dal piano di base).
      fuori.push({ genere: "segno", segno: segno ?? x });
      i += segno === undefined ? 1 : segno.length;
    }
    if (fuori.length > prima) posizioni.push({ da, a: i });
  }
  fuori.push({ genere: "fine" });
  return { simboli: fuori, posizioni };
}

/** Una parola del testo di un'espressione, con la sua posizione: chi mostra il testo lo traduce o lo
 * spezza senza toccare il resto. `da` e `a` contano i codici di `Array.from(testo)`, non le unità UTF-16. */
export interface Parola {
  readonly genere: "intero" | "reale" | "carattere" | "stringa" | "nome" | "parola" | "segno";
  /** Il testo così com'è scritto, virgolette e sequenze di escape comprese. */
  readonly testo: string;
  readonly da: number;
  readonly a: number;
}

/** Le parole di un'espressione, o `undefined` se il testo non si lascia leggere: chi lo mostra lo mostra
 * com'è, e l'errore lo dice il controllo statico. */
export function parole(testo: string): readonly Parola[] | undefined {
  let letti: ReturnType<typeof simboliConPosizioni>;
  try {
    letti = simboliConPosizioni(testo);
  } catch (e) {
    if (e instanceof Fermo) return undefined;
    throw e;
  }
  return conIlTesto(testo, letti);
}

/** Le parole di un testo anche quando non si lascia leggere (`x = 5`, un apice non chiuso): chi cambia un nome nel testo
 * lo cambia anche lì, dove il controllo mostra l'errore. Un testo che si legge ha le stesse parole di `parole`. */
export function paroleTolleranti(testo: string): readonly Parola[] {
  return conIlTesto(testo, simboliConPosizioni(testo, true));
}

function conIlTesto(testo: string, letti: ReturnType<typeof simboliConPosizioni>): readonly Parola[] {
  const c = Array.from(testo);
  return letti.posizioni.map(({ da, a }, k) => ({
    genere: letti.simboli[k]!.genere as Parola["genere"],
    testo: c.slice(da, a).join(""),
    da,
    a,
  }));
}

/** Oltre il tetto il testo non si legge. */
const oltre = (livelli: number) => {
  if (livelli > tettoDiAnnidamento) ferma("syntax_error", "troppo_annidata");
};

const figli = (e: Espressione): readonly Espressione[] =>
  e.genere === "indice"
    ? [e.base, e.indice]
    : e.genere === "unario"
      ? [e.operando]
      : e.genere === "binario"
        ? [e.sinistro, e.destro]
        : e.genere === "chiamata"
          ? e.argomenti
          : [];

/** La profondità dell'albero, con una pila e non per ricorsione: una somma lunghissima non ricorre
 * nell'analisi, e non deve farlo nemmeno qui. */
function profondita(radice: Espressione): number {
  let massima = 0;
  const pila: [Espressione, number][] = [[radice, 1]];
  while (pila.length > 0) {
    const [e, livelli] = pila.pop()!;
    massima = Math.max(massima, livelli);
    for (const f of figli(e)) pila.push([f, livelli + 1]);
  }
  return massima;
}

/** Il parser a discesa: un livello per livello di precedenza degli operatori, dal più basso. `testi` è il testo
 * scritto di ogni simbolo (la fine non ne ha), da citare nella causa. */
function parser(s: Simbolo[], testi: readonly string[]) {
  let i = 0;
  // Le aperture in corso: ognuna è una discesa della ricorsione.
  let aperte = 0;
  const dentro = <T>(leggi: () => T): T => {
    oltre(++aperte);
    const fuori = leggi();
    aperte--;
    return fuori;
  };
  const guarda = () => s[i]!;
  const segno = (x: string) => {
    const t = guarda();
    return (t.genere === "segno" && t.segno === x) || (t.genere === "parola" && t.parola === x);
  };
  const prendi = (x: string) => (segno(x) ? (i++, true) : false);
  /** Il simbolo che non va dove sta: alla fine del testo manca la chiusura, altrove non si lega a ciò che lo precede. */
  const aspetta = (x: ")" | "]") => {
    if (prendi(x)) return;
    if (guarda().genere === "fine") ferma("syntax_error", x === ")" ? "tonda_aperta" : "quadra_aperta");
    else ferma("syntax_error", "simbolo_slegato", testi[i]);
  };

  const binari = (operatori: readonly OperatoreBinario[], sotto: () => Espressione) => (): Espressione => {
    let e = sotto();
    for (;;) {
      const op = operatori.find(segno);
      if (op === undefined) return e;
      i++;
      e = { genere: "binario", operatore: op, sinistro: e, destro: sotto() };
    }
  };

  /** Un confronto, mai due in fila allo stesso livello (`a < b < c`). */
  const confronto = (operatori: readonly OperatoreBinario[], sotto: () => Espressione) => (): Espressione => {
    const e = sotto();
    const op = operatori.find(segno);
    if (op === undefined) return e;
    i++;
    const destro = sotto();
    if (operatori.some(segno)) ferma("chained_comparison");
    return { genere: "binario", operatore: op, sinistro: e, destro };
  };

  /** Livello 1: un operando semplice con gli indici e la chiamata. */
  const operando = (): Espressione => {
    const t = guarda();
    i++;
    let e: Espressione;
    if (t.genere === "intero" || t.genere === "reale") e = { genere: t.genere, valore: t.valore };
    else if (t.genere === "carattere") e = { genere: "carattere", codice: t.codice };
    else if (t.genere === "stringa") e = { genere: "stringa", codici: t.codici };
    else if (t.genere === "parola" && (t.parola === "true" || t.parola === "false")) e = { genere: "booleano", valore: t.parola === "true" };
    else if (t.genere === "parola" && t.parola === "pi") e = { genere: "pi" };
    else if (t.genere === "segno" && t.segno === "(") {
      e = dentro(espressione);
      aspetta(")");
    } else if (t.genere === "nome") {
      if (prendi("(")) {
        const argomenti: Espressione[] = [];
        if (!prendi(")")) {
          do argomenti.push(dentro(espressione));
          while (prendi(","));
          aspetta(")");
        }
        e = { genere: "chiamata", nome: t.nome, argomenti };
      } else e = { genere: "nome", nome: t.nome };
    } else if (t.genere === "fine") return ferma("syntax_error", s.length === 1 ? "vuoto" : "operando_alla_fine");
    else return ferma("syntax_error", "operando_mancante", testi[i - 1]);
    while (prendi("[")) {
      const indice = dentro(espressione);
      aspetta("]");
      e = { genere: "indice", base: e, indice };
    }
    return e;
  };

  /** Livello 2: `elevato_a` senza associatività, fra due operandi semplici. */
  const potenza = (): Espressione => {
    const base = operando();
    if (!prendi("raised_to")) return base;
    const esponente = operando();
    if (segno("raised_to")) ferma("chained_power");
    return { genere: "binario", operatore: "raised_to", sinistro: base, destro: esponente };
  };

  /** Livello 3: il meno, `not` e gli operatori a parola con un operando, da destra. */
  const unario = (): Espressione => {
    const op = operatoriUnari.find(segno);
    if (op === undefined) return potenza();
    i++;
    return { genere: "unario", operatore: op, operando: dentro(unario) };
  };

  const moltiplicativo = binari(["*", "/", "mod"], unario);
  const additivo = binari(["+", "-"], moltiplicativo);
  const relazionale = confronto(["<", "<=", ">", ">="], additivo);
  const uguaglianza = confronto(["==", "!="], relazionale);
  const congiunzione = binari(["and"], uguaglianza);
  const espressione = binari(["or"], congiunzione);

  return () => {
    const fuori = espressione();
    if (guarda().genere !== "fine") ferma("syntax_error", "simbolo_slegato", testi[i]);
    oltre(profondita(fuori));
    return fuori;
  };
}

/** Analizza un'espressione, una destinazione o un valore iniziale: la forma la controlla chi chiama. */
export function analizza(testo: string): Analisi {
  try {
    const letti = simboliConPosizioni(testo);
    const c = Array.from(testo);
    return { ok: true, espressione: parser(letti.simboli, letti.posizioni.map(({ da, a }) => c.slice(da, a).join("")))() };
  } catch (e) {
    if (e instanceof Fermo) return { ok: false, codice: e.codice, ...(e.fermata ? { fermata: e.fermata } : {}) };
    throw e;
  }
}
