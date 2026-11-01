// «Accademico»: la sintassi dello pseudocodice delle Selezioni scolastiche, da leggere. Ha meno costrutti del flowchart
// (un solo tipo semplice, l'intero, e il vettore di interi: niente record, matrici né tabelle; niente lettura, niente *rif* né *out*, gli operatori
// aritmetici, di confronto e logici): un progetto si scrive solo se ci sta tutto, altrimenti la verifica dà l'elenco di
// ciò che manca, tutto insieme e nell'ordine del progetto, ognuno col suo posto. Il testo è sempre puro: nessuna parola
// che la sintassi non abbia.
//
// Che cosa si traduce perché ci stia:
// - il booleano è un intero 0/1: `true` è 1, `false` è 0; in una condizione un booleano `b` è `b == 1` e `not b` è
//   `b == 0`. Una condizione che è tutto il valore di un'assegnazione a un booleano, di una scrittura o del valore
//   restituito da una funzione booleana diventa un `if` che assegna, scrive o restituisce 1 o 0; altrove (un argomento,
//   un indice, un operando) è una mancanza;
// - la costante è una variabile assegnata una volta, coi valori iniziali scritti come assegnazioni dopo le
//   dichiarazioni (la variabile dichiarata non ha valore); le costanti comuni stanno in testa, prima delle funzioni che
//   le leggono;
// - il `per` è un `for` sull'intervallo `[da ... a + 1)` quando è lo stesso ciclo: passo 1, la fine che il corpo non
//   cambia, e il contatore che non serve fuori dai cicli che lo contano (allora non si dichiara, come vuole la sintassi);
//   altrimenti è il `while` equivalente, con la fine ricalcolata a ogni controllo come nel flowchart;
// - il `per ogni` è un `for` sugli indici (`_indice`, `_indice2` dentro un altro), con la sorgente calcolata una volta
//   in `_sorgente` se è una funzione;
// - il ripeti è un `while` con l'intero 0/1 «ancora un giro» (`_ancora`, `_ancora2` dentro un altro);
// - la scrittura è un `output(…)` per valore, e l'a capo non si scrive; il commento non si scrive.
//
// I nomi che il testo aggiunge cominciano col trattino basso, che nessun dato può avere, nella lingua dell'interfaccia
// come quelli del Python e del C; le parole chiave sono in inglese in ogni lingua. Le espressioni si scrivono
// dall'albero, coi simboli `×` `≠` `≤` `≥`, il meno ASCII e le parentesi dove la precedenza le chiede: sempre fra `and`
// e `or` mescolati e attorno a `mod` accanto a `×` o `/`, come fa la sintassi.
//
// La provenienza delle righe come nello pseudocodice: la dichiarazione e il valore iniziale di un dato hanno il dato (e
// la funzione); una riga che viene da un blocco ha quel blocco; il programma principale non ha una riga di fine. Le righe
// dei cicli `per` e `per ogni` hanno le fasi come nel Python.

import { figliDelBlocco, type Tetti } from "../controllo/controllo";
import { analizza, type Espressione, type OperatoreUnario } from "../espressioni/analizzatore";
import type { FaseDelCiclo } from "../interprete/interprete";
import { eUnaCopia, nomiDeiVettori } from "../progetto/copia";
import type { Blocco, Dato, Funzione, Progetto, TipoDelDato, ValoreIniziale } from "../progetto/modello";
import { genera, segnate, type Generato, type Mancanza, type Riga, type SpecieDellaMancanza } from "./forma";
import { ancoraDelLivello, indiceDelLivello, nomeDellaSorgente, type LinguaDelCodice } from "./nomi";

/** Le parole della sintassi: un nome uguale non si può scrivere. */
export const paroleDiAccademico: readonly string[] = [
  "function", "return", "if", "then", "else", "for", "in", "while", "do", "end", "variable", "and", "or", "not", "mod",
  "output", "min", "max", "integer",
];

const rientro = "    ";

const albero = (testo: string): Espressione => {
  const a = analizza(testo);
  // Il controllo statico ha già letto ogni testo: qui si arriva solo senza errori.
  if (!a.ok) throw new Error(`testo che non si legge: ${testo}`);
  return a.espressione;
};

const sotto = (e: Espressione): readonly Espressione[] =>
  e.genere === "indice" ? [e.base, e.indice] : e.genere === "campo" ? [e.base] : e.genere === "unario" ? [e.operando] : e.genere === "binario" ? [e.sinistro, e.destro] : e.genere === "chiamata" ? e.argomenti : [];

const nomiIn = (e: Espressione): string[] => (e.genere === "nome" ? [e.nome] : sotto(e).flatMap(nomiIn));

/** Un'espressione che dà vero o falso con un operatore: un confronto, `and`, `or`, `not`. */
const condizionale = (e: Espressione): boolean =>
  (e.genere === "binario" && ["<", "<=", ">", ">=", "==", "!=", "and", "or"].includes(e.operatore)) || (e.genere === "unario" && e.operatore === "not");

const specieDellOperatore: Partial<Record<OperatoreUnario | "raised_to", SpecieDellaMancanza>> = {
  raised_to: "potenza",
  square_root: "radice",
  absolute_value: "valore-assoluto",
  round: "arrotondamento",
  round_down: "arrotondamento",
  round_up: "arrotondamento",
  integer_part: "arrotondamento",
  to_integer: "conversione",
  to_real: "conversione",
  to_character: "conversione",
  to_array: "conversione",
  to_string: "conversione",
  length: "lunghezza",
};

const specieDelTipo = { real: "reale", character: "carattere", string: "stringa", record: "record" } as const;
/** La specie di ciò che manca per un tipo, se la sintassi non lo ha: l'intero e il booleano (un intero 0/1) ci sono. */
const specieDi = (t: TipoDelDato) => (t === "integer" || t === "boolean" ? undefined : specieDelTipo[t]);

/** Dove sta un'espressione: in una condizione; tutto il valore di una scrittura, o di ciò che riceve un booleano (dove
 * una condizione diventa un `if`); altrove, un valore. */
type Contesto = "condizione" | "scrittura" | "booleano" | "valore";

/** Ciò che manca a un progetto perché si scriva in «Accademico»: tutto, nell'ordine del progetto (le costanti comuni,
 * poi ogni funzione col nome, il risultato, i dati, i blocchi dall'alto e la fine), una voce per specie e posto. */
export function mancanzeDiAccademico(p: Progetto): Mancanza[] {
  const fuori: Mancanza[] = [];
  const viste = new Set<string>();
  const segna = (m: Mancanza) => {
    const chiave = `${m.specie}|${m.operatore ?? ""}|${m.blocco ?? ""}|${m.dato ?? ""}|${m.funzione ?? ""}`;
    if (viste.has(chiave)) return;
    viste.add(chiave);
    fuori.push(m);
  };
  const parola = new Set(paroleDiAccademico);
  const comuni = p.shared_constants ?? [];

  const dato = (d: Dato, funzione: string | undefined) => {
    const posto = { dato: d.name, ...(funzione !== undefined ? { funzione } : {}) };
    // Una tabella (un vettore di record) ha la sua specie, al posto di quella del record.
    const specie = d.type === "record" && d.size !== undefined ? "tabella" : specieDi(d.type);
    if (specie !== undefined) segna({ specie, ...posto });
    // Una matrice di interi non è un `integer[]`: la sintassi ha i soli vettori.
    if (d.columns !== undefined) segna({ specie: "matrice", ...posto });
    if (d.parameter === "reference") segna({ specie: "rif", ...posto });
    if (d.parameter === "out") segna({ specie: "out", ...posto });
    if (parola.has(d.name)) segna({ specie: "parola-del-linguaggio", ...posto });
  };
  for (const d of comuni) dato(d, undefined);

  for (const f of p.functions) {
    const funzione = f.kind === "main" ? undefined : f.id;
    if (f.name !== undefined && parola.has(f.name)) segna({ specie: "parola-del-linguaggio", funzione: f.id });
    const r = f.kind !== "function" ? undefined : f.return_type === "record" && f.return_size !== undefined ? "tabella" : specieDi(f.return_type!);
    if (r !== undefined) segna({ specie: r, funzione: f.id });
    if (f.return_columns !== undefined) segna({ specie: "matrice", funzione: f.id });
    f.data.forEach((d) => dato(d, funzione));
    const dati = new Map([...comuni, ...f.data].map((d) => [d.name, d]));

    const esamina =(e: Espressione, contesto: Contesto, blocco: string) => {
      const manca = (specie: SpecieDellaMancanza, operatore?: OperatoreUnario | "raised_to") => segna({ specie, ...(operatore !== undefined ? { operatore } : {}), blocco });
      switch (e.genere) {
        case "reale":
          return manca("letterale-reale");
        case "carattere":
          return manca("letterale-carattere");
        case "stringa":
          if (contesto !== "scrittura") manca("letterale-stringa");
          return;
        case "pi":
          return manca("pi");
        case "intero":
        case "booleano":
        case "nome":
          return;
        case "indice":
          esamina(e.base, "valore", blocco);
          return esamina(e.indice, "valore", blocco);
        case "campo":
          // Il record lo dice il suo dato (o la funzione che lo restituisce): qui si guarda solo la base.
          return esamina(e.base, "valore", blocco);
        case "chiamata":
          for (const a of e.argomenti) esamina(a, "valore", blocco);
          return;
        case "unario":
        case "binario": {
          if (condizionale(e)) {
            if (contesto === "valore") manca("condizione-come-valore");
            // Dentro una condizione: i rami di `and`, `or` e `not` sono condizioni, gli operandi di un confronto valori.
            const logico = e.genere === "unario" || e.operatore === "and" || e.operatore === "or";
            for (const x of sotto(e)) esamina(x, logico ? "condizione" : "valore", blocco);
            return;
          }
          const operatore = e.genere === "unario" ? e.operatore : e.operatore === "raised_to" ? "raised_to" : undefined;
          const specie = operatore === undefined ? undefined : specieDellOperatore[operatore];
          if (specie !== undefined) manca(specie, operatore);
          for (const x of sotto(e)) esamina(x, "valore", blocco);
          return;
        }
      }
    };
    /** Il dato di una destinazione: il nome, il vettore o la matrice di un elemento, la tabella del record di un campo. */
    const datoDi = (t: Espressione): Dato | undefined => (t.genere === "nome" ? dati.get(t.nome) : t.genere === "indice" || t.genere === "campo" ? datoDi(t.base) : undefined);
    /** Il tipo di ciò che riceve un'assegnazione: il dato, un suo elemento, il campo di un record. */
    const destinazione = (t: Espressione): TipoDelDato | undefined => {
      if (t.genere === "campo") return p.records?.find((r) => r.name === datoDi(t.base)?.record)?.fields.find((c) => c.name === t.campo)?.type;
      return datoDi(t)?.type;
    };

    const visita = (b: Blocco) => {
      const testo = (t: string, contesto: Contesto) => esamina(albero(t), contesto, b.id);
      switch (b.kind) {
        case "assignment":
          testo(b.target, "valore");
          testo(b.value, destinazione(albero(b.target)) === "boolean" ? "booleano" : "valore");
          break;
        case "read":
          segna({ specie: "lettura", blocco: b.id });
          testo(b.target, "valore");
          break;
        case "write":
          b.values.forEach((v) => testo(v, "scrittura"));
          break;
        case "if":
        case "while":
        case "repeat":
          testo(b.condition, "condizione");
          break;
        case "for":
          testo(b.from, "valore");
          testo(b.to, "valore");
          break;
        case "for_each":
          testo(b.source, "valore");
          break;
        case "call":
          b.arguments.forEach((a) => testo(a, "valore"));
          break;
        case "comment":
          break;
      }
      figliDelBlocco(b).forEach(visita);
    };
    f.body.forEach(visita);
    if (f.end.return_value !== undefined) esamina(albero(f.end.return_value), f.return_type === "boolean" ? "booleano" : "valore", f.end.id);
  }
  return fuori;
}

/** Il codice di un progetto in «Accademico», se il controllo statico lo lascia eseguire e se ci sta tutto. */
export function accademico(p: Progetto, limiti: Tetti, lingua: LinguaDelCodice): Generato {
  return genera(p, limiti, (q) => righeDiAccademico(q, lingua), mancanzeDiAccademico);
}

// ---------------------------------------------------------------------------------------- le espressioni

/** I livelli di precedenza degli operatori a due operandi, dal più basso (il livello è la posizione più uno): poi
 * vengono il meno (6) e gli operandi (7). */
const precedenze: readonly (readonly string[])[] = [["or"], ["and"], ["<", "<=", ">", ">=", "==", "!="], ["+", "-"], ["*", "/", "mod"]];
const livelloDi: Partial<Record<string, number>> = Object.fromEntries(precedenze.flatMap((ops, k) => ops.map((op) => [op, k + 1])));
const simbolo: Readonly<Record<string, string>> = { "*": "×", "!=": "≠", "<=": "≤", ">=": "≥" };
const operando = 7;

interface Testo {
  readonly t: string;
  readonly livello: number;
}

const fra = (x: Testo, serve: boolean) => (serve ? `(${x.t})` : x.t);

/** Un letterale stringa coi suoi codici, con le sequenze di escape del flowchart. */
const letteraleStringa = (codici: readonly number[]) =>
  `"${codici.map((k) => (k === 10 ? "\\n" : k === 9 ? "\\t" : k === 92 ? "\\\\" : k === 34 ? '\\"' : String.fromCodePoint(k))).join("")}"`;

/** Le espressioni di una funzione: sa quali nomi sono booleani. */
function espressioni(p: Progetto, dati: readonly Dato[]) {
  const tipi = new Map(dati.map((d) => [d.name, d.type]));
  const risultati = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f.return_type] as const])));
  /** Un booleano senza operatore: un nome, un elemento, una chiamata. */
  const booleano = (e: Espressione): boolean =>
    (e.genere === "nome" && tipi.get(e.nome) === "boolean") || (e.genere === "indice" && booleano(e.base)) || (e.genere === "chiamata" && risultati.get(e.nome) === "boolean");

  /** Un valore: un intero, un vettore, un booleano senza operatore come intero 0/1. */
  const valore = (e: Espressione): Testo => {
    switch (e.genere) {
      case "intero":
        return { t: String(e.valore), livello: operando };
      case "booleano":
        return { t: e.valore ? "1" : "0", livello: operando };
      case "stringa":
        return { t: letteraleStringa(e.codici), livello: operando };
      case "nome":
        return { t: e.nome, livello: operando };
      case "indice": {
        const b = valore(e.base);
        return { t: `${fra(b, b.livello < operando)}[${valore(e.indice).t}]`, livello: operando };
      }
      case "chiamata":
        return { t: `${e.nome}(${e.argomenti.map((a) => valore(a).t).join(", ")})`, livello: operando };
      case "unario": {
        if (e.operatore !== "-") break;
        const x = valore(e.operando);
        return { t: `-${fra(x, x.livello < operando)}`, livello: 6 };
      }
      case "binario": {
        const livello = livelloDi[e.operatore];
        if (livello === undefined || livello <= 3) break;
        const s = valore(e.sinistro);
        const d = valore(e.destro);
        // `mod` accanto a `×` o `/` (o a un altro `mod`) va sempre fra parentesi, come fa la sintassi.
        const conMod = (x: Espressione) => livello === 5 && x.genere === "binario" && livelloDi[x.operatore] === 5 && (e.operatore === "mod" || x.operatore === "mod");
        const op = simbolo[e.operatore] ?? e.operatore;
        return { t: `${fra(s, s.livello < livello || conMod(e.sinistro))} ${op} ${fra(d, d.livello <= livello || conMod(e.destro))}`, livello };
      }
      case "reale":
      case "carattere":
      case "pi":
        break;
    }
    // La verifica ha lasciato fuori ogni altra forma.
    throw new Error("un'espressione che «Accademico» non ha");
  };

  /** Una condizione, dopo `if` e `while`: i booleani come confronti con 1 e 0. */
  const condizione = (e: Espressione): Testo => {
    if (e.genere === "booleano") return { t: e.valore ? "1 == 1" : "1 == 0", livello: 3 };
    if (booleano(e)) return { t: `${valore(e).t} == 1`, livello: 3 };
    if (e.genere === "unario" && e.operatore === "not") {
      const o = e.operando;
      if (booleano(o)) return { t: `${valore(o).t} == 0`, livello: 3 };
      if (o.genere === "booleano") return { t: o.valore ? "1 == 0" : "1 == 1", livello: 3 };
      return { t: `not (${condizione(o).t})`, livello: 6 };
    }
    if (e.genere === "binario" && (e.operatore === "and" || e.operatore === "or")) {
      const s = condizione(e.sinistro);
      const d = condizione(e.destro);
      const livello = livelloDi[e.operatore]!;
      // Fra `and` e `or` mescolati sempre le parentesi; a destra anche fra due uguali, che l'albero ha così.
      return { t: `${fra(s, s.livello < 3 && s.livello !== livello)} ${e.operatore} ${fra(d, d.livello < 3)}`, livello };
    }
    if (e.genere === "binario" && livelloDi[e.operatore] === 3) {
      const op = simbolo[e.operatore] ?? e.operatore;
      return { t: `${valore(e.sinistro).t} ${op} ${valore(e.destro).t}`, livello: 3 };
    }
    throw new Error("una condizione che «Accademico» non ha");
  };

  return { valore, condizione, booleano };
}

// ---------------------------------------------------------------------------------------- le righe

function righeDiAccademico(p: Progetto, lingua: LinguaDelCodice): Riga[] {
  const comuni = p.shared_constants ?? [];
  const perNome = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  const parti: Riga[][] = [];

  /** Il valore iniziale come valore da assegnare: un elenco fra quadre, l'elemento ripetuto scritto per esteso. */
  const iniziale = (v: ValoreIniziale, d: Dato, e: ReturnType<typeof espressioni>): string => {
    if (typeof v === "string") return e.valore(albero(v)).t;
    const elementi = Array.isArray(v) ? (v as readonly string[]) : Array.from({ length: d.size ?? 1 }, () => (v as { readonly each: string }).each);
    return `[${elementi.map((x) => e.valore(albero(x)).t).join(", ")}]`;
  };

  /** Le dichiarazioni e i valori iniziali di una parte (i nomi aggiunti dopo i dati, senza provenienza). */
  const dichiara = (righe: Riga[], r: string, dati: readonly Dato[], aggiunti: readonly { nome: string; vettore: boolean }[], funzione: string | undefined, e: ReturnType<typeof espressioni>) => {
    const del = (d: Dato) => ({ dato: d.name, ...(funzione !== undefined ? { funzione } : {}) });
    for (const d of dati) righe.push({ testo: `${r}variable ${d.name}: integer${d.size !== undefined ? "[]" : ""}`, ...del(d) });
    for (const a of aggiunti) righe.push({ testo: `${r}variable ${a.nome}: integer${a.vettore ? "[]" : ""}` });
    for (const d of dati) if (d.initial !== undefined) righe.push({ testo: `${r}${d.name} ← ${iniziale(d.initial, d, e)}`, ...del(d) });
  };

  if (comuni.length > 0) {
    const righe: Riga[] = [];
    dichiara(righe, "", comuni, [], undefined, espressioni(p, comuni));
    parti.push(righe);
  }
  for (const f of p.functions.filter((g) => g.kind !== "main")) parti.push(segnate(parte(f), f.id));
  const principale = p.functions.find((f) => f.kind === "main")!;
  const main = segnate(parte(principale), principale.id);
  if (main.length > 0) parti.push(main);
  return parti.flatMap((righe, k) => (k === 0 ? righe : [{ testo: "" }, ...righe]));

  /** Una procedura o una funzione (con l'intestazione e la fine), o il programma principale al livello più esterno. */
  function parte(f: Funzione): Riga[] {
    const righe: Riga[] = [];
    const principale = f.kind === "main";
    const base = principale ? 0 : 1;
    const funzione = principale ? undefined : f.id;
    const e = espressioni(p, [...comuni, ...f.data]);
    const vettori = nomiDeiVettori([...comuni, ...f.data]);
    const contatori = contatoriDelFor(f);

    // I nomi aggiunti: le sorgenti dei `per ogni` su una funzione, nell'ordine, e un `_ancora` per livello di ripeti.
    const sorgenti: string[] = [];
    let ripetiAnnidati = 0;
    const misura = (bs: readonly Blocco[], ripeti: number) => {
      for (const b of bs) {
        if (b.kind === "for_each" && albero(b.source).genere === "chiamata") {
          const n = sorgenti.length + 1;
          sorgenti.push(n === 1 ? nomeDellaSorgente[lingua] : `${nomeDellaSorgente[lingua]}${n}`);
        }
        const dentro = ripeti + (b.kind === "repeat" ? 1 : 0);
        ripetiAnnidati = Math.max(ripetiAnnidati, dentro);
        misura(figliDelBlocco(b), dentro);
      }
    };
    misura(f.body, 0);

    if (!principale) {
      const parametri = f.data.filter((d) => d.parameter !== undefined).map((d) => `${d.name}: integer${d.size !== undefined ? "[]" : ""}`);
      const risultato = f.kind === "function" ? ` → integer${f.return_size !== undefined ? "[]" : ""}` : "";
      righe.push({ testo: `function ${f.name}(${parametri.join(", ")})${risultato}` });
    }
    const r0 = rientro.repeat(base);
    dichiara(
      righe,
      r0,
      f.data.filter((d) => d.parameter === undefined && !contatori.has(d.name)),
      [...sorgenti.map((nome) => ({ nome, vettore: true })), ...Array.from({ length: ripetiAnnidati }, (_, k) => ({ nome: ancoraDelLivello(lingua, k + 1), vettore: false }))],
      funzione,
      e,
    );

    let sorgentiUsate = 0;
    /** L'`if` che dà 1 o 0 a seconda della condizione: `scrivi(x)` è la riga di ciascun ramo. */
    const unoOZero = (r: string, id: string, c: Espressione, scrivi: (x: string) => string) => {
      righe.push({ testo: `${r}if ${e.condizione(c).t} then`, blocco: id });
      righe.push({ testo: `${r}${rientro}${scrivi("1")}`, blocco: id });
      righe.push({ testo: `${r}else` });
      righe.push({ testo: `${r}${rientro}${scrivi("0")}`, blocco: id });
      righe.push({ testo: `${r}end if` });
    };
    const sequenza = (bs: readonly Blocco[], livello: number, perOgni: number, ripeti: number) => {
      for (const b of bs) blocco(b, livello, perOgni, ripeti);
    };
    const blocco = (b: Blocco, livello: number, perOgni: number, ripeti: number) => {
      const r = rientro.repeat(livello);
      const riga = (testo: string, fasi?: readonly FaseDelCiclo[]) => righe.push({ testo: r + testo, blocco: b.id, ...(fasi !== undefined ? { fasi } : {}) });
      const struttura = (testo: string) => righe.push({ testo: r + testo });
      switch (b.kind) {
        case "assignment": {
          const t = e.valore(albero(b.target)).t;
          const v = albero(b.value);
          if (eUnaCopia(b, vettori)) return riga(`${t} ← ${e.valore(v).t}`, ["inizio", "condizione", "elemento", "passo"]);
          if (condizionale(v)) return unoOZero(r, b.id, v, (x) => `${t} ← ${x}`);
          return riga(`${t} ← ${e.valore(v).t}`);
        }
        case "write":
          for (const testo of b.values) {
            const v = albero(testo);
            if (condizionale(v)) unoOZero(r, b.id, v, (x) => `output(${x})`);
            else riga(`output(${e.valore(v).t})`);
          }
          return;
        case "if":
          riga(`if ${e.condizione(albero(b.condition)).t} then`);
          sequenza(b.then, livello + 1, perOgni, ripeti);
          if (b.else.length > 0) {
            struttura("else");
            sequenza(b.else, livello + 1, perOgni, ripeti);
          }
          return struttura("end if");
        case "while":
          riga(`while ${e.condizione(albero(b.condition)).t} do`);
          sequenza(b.body, livello + 1, perOgni, ripeti);
          return struttura("end while");
        case "repeat": {
          const ancora = ancoraDelLivello(lingua, ripeti + 1);
          riga(`${ancora} ← 1`);
          riga(`while ${ancora} == 1 do`);
          sequenza(b.body, livello + 1, perOgni, ripeti + 1);
          unoOZero(r + rientro, b.id, albero(b.condition), (x) => `${ancora} ← ${x}`);
          return struttura("end while");
        }
        case "for": {
          const contatore = (albero(b.counter) as { nome: string }).nome;
          const da = e.valore(albero(b.from)).t;
          const a = albero(b.to);
          if (contatori.has(contatore)) {
            riga(`for ${contatore} in [${da} ... ${finePiuUno(a, e.valore)}) do`, ["inizio", "condizione", "passo"]);
            sequenza(b.body, livello + 1, perOgni, ripeti);
            return struttura("end for");
          }
          const passo = b.step ?? 1;
          riga(`${contatore} ← ${da}`, ["inizio"]);
          riga(`while ${contatore} ${passo > 0 ? "≤" : "≥"} ${e.valore(a).t} do`, ["condizione"]);
          sequenza(b.body, livello + 1, perOgni, ripeti);
          righe.push({ testo: `${r}${rientro}${contatore} ← ${contatore} ${passo > 0 ? "+" : "-"} ${Math.abs(passo)}`, blocco: b.id, fasi: ["passo"] });
          return struttura("end while");
        }
        case "for_each": {
          const elemento = (albero(b.item) as { nome: string }).nome;
          const s = albero(b.source);
          let sorgente: string;
          let quanti: number;
          if (s.genere === "nome") {
            sorgente = s.nome;
            quanti = [...comuni, ...f.data].find((d) => d.name === s.nome)!.size!;
          } else {
            sorgente = sorgenti[sorgentiUsate++]!;
            quanti = perNome.get((s as { nome: string }).nome)!.return_size!;
            riga(`${sorgente} ← ${e.valore(s).t}`, ["inizio"]);
          }
          const indice = indiceDelLivello(lingua, perOgni + 1);
          riga(`for ${indice} in [0 ... ${quanti}) do`, ["inizio", "condizione", "passo"]);
          righe.push({ testo: `${r}${rientro}${elemento} ← ${sorgente}[${indice}]`, blocco: b.id, fasi: ["elemento"] });
          sequenza(b.body, livello + 1, perOgni + 1, ripeti);
          return struttura("end for");
        }
        case "call":
          return riga(`${b.callee}(${b.arguments.map((x) => e.valore(albero(x)).t).join(", ")})`);
        case "read":
        case "comment":
          // La lettura non ci sta (la verifica la ferma prima); il commento non si scrive.
          return;
      }
    };
    sequenza(f.body, base, 0, 0);

    if (f.kind === "function") {
      const v = albero(f.end.return_value!);
      if (condizionale(v)) unoOZero(r0, f.end.id, v, (x) => `return ${x}`);
      else righe.push({ testo: `${r0}return ${e.valore(v).t}`, blocco: f.end.id });
    }
    if (!principale) righe.push({ testo: "end function", ...(f.kind === "procedure" ? { blocco: f.end.id } : {}) });
    return righe;
  }
}

/** La fine esclusa dell'intervallo di un `for`: un letterale col suo seguente, `x - 1` come `x`, altrimenti `a + 1`. */
function finePiuUno(a: Espressione, valore: (e: Espressione) => Testo): string {
  if (a.genere === "intero") return String(a.valore + 1);
  if (a.genere === "binario" && a.operatore === "-" && a.destro.genere === "intero") {
    const k = a.destro.valore;
    const s = valore(a.sinistro);
    return k === 0 ? `${s.t} + 1` : k === 1 ? s.t : `${s.t} - ${k - 1}`;
  }
  const x = valore(a);
  return `${fra(x, x.livello < 4)} + 1`;
}

/** I contatori dei `per` che diventano un `for`: un dato della funzione senza valore iniziale, che non compare fuori
 * dai cicli che lo contano, e ogni suo ciclo col passo 1 e una fine che il corpo non cambia. */
function contatoriDelFor(f: Funzione): ReadonlySet<string> {
  const fuori = new Set<string>();
  const nonEquivalenti = new Set<string>();
  const tutti = new Set<string>();
  /** I nomi che un corpo assegna: le destinazioni, i contatori, gli elementi dei `per ogni`. */
  const assegnati = (bs: readonly Blocco[]): Set<string> => {
    const s = new Set<string>();
    const visita = (b: Blocco) => {
      if (b.kind === "assignment" || b.kind === "read") nomiIn(albero(b.target)).slice(0, 1).forEach((n) => s.add(n));
      if (b.kind === "for") s.add((albero(b.counter) as { nome: string }).nome);
      if (b.kind === "for_each") s.add((albero(b.item) as { nome: string }).nome);
      figliDelBlocco(b).forEach(visita);
    };
    bs.forEach(visita);
    return s;
  };
  const usa = (testo: string, dentro: ReadonlySet<string>) => {
    for (const n of nomiIn(albero(testo))) if (!dentro.has(n)) fuori.add(n);
  };
  const visita = (bs: readonly Blocco[], dentro: ReadonlySet<string>) => {
    for (const b of bs) {
      switch (b.kind) {
        case "for": {
          const c = (albero(b.counter) as { nome: string }).nome;
          tutti.add(c);
          usa(b.from, dentro);
          usa(b.to, dentro);
          const corpo = assegnati(b.body);
          if ((b.step ?? 1) !== 1 || nomiIn(albero(b.to)).some((n) => corpo.has(n))) nonEquivalenti.add(c);
          visita(b.body, new Set([...dentro, c]));
          break;
        }
        case "assignment":
          usa(b.target, dentro);
          usa(b.value, dentro);
          break;
        case "read":
          usa(b.target, dentro);
          break;
        case "write":
          b.values.forEach((v) => usa(v, dentro));
          break;
        case "if":
          usa(b.condition, dentro);
          visita([...b.then, ...b.else], dentro);
          break;
        case "while":
        case "repeat":
          usa(b.condition, dentro);
          visita(b.body, dentro);
          break;
        case "for_each":
          usa(b.item, dentro);
          usa(b.source, dentro);
          visita(b.body, dentro);
          break;
        case "call":
          b.arguments.forEach((a) => usa(a, dentro));
          break;
        case "comment":
          break;
      }
    }
  };
  visita(f.body, new Set());
  if (f.end.return_value !== undefined) usa(f.end.return_value, new Set());
  const propri = new Map(f.data.map((d) => [d.name, d]));
  return new Set(
    [...tutti].filter((c) => {
      const d = propri.get(c);
      return d !== undefined && d.parameter === undefined && d.initial === undefined && !fuori.has(c) && !nonEquivalenti.has(c);
    }),
  );
}
