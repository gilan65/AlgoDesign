// Le procedure e le funzioni di un progetto, come operazioni pure (le stesse regole di `operazioni.ts`: il risultato passa
// dal lettore, un campo facoltativo senza valore si omette): crearne una, rinominarla con le sue chiamate, cambiarne le
// proprietà (anche il genere), duplicarla, eliminarla con o senza le chiamate. Il programma principale non si tocca.
//
// Una CHIAMATA di una procedura è un salto (`call`) che la nomina; quella di una funzione è il suo nome seguito da «(» in
// un testo che è una regola, o in ciò che una funzione restituisce. Le parole si leggono con l'analizzatore, anche nei
// testi che non si lasciano leggere (`paroleTolleranti`): il nome dentro un letterale non è una chiamata, e un nome seguito
// da un altro nome non lo è. Un salto a una funzione o una procedura in un'espressione sono errori del controllo: si
// contano e si rinominano lo stesso, perché nominano quella funzione.
//
// Che cosa NON guarda: le regole di validità (un nome già usato, un valore predefinito che non è del tipo, un parametro
// per riferimento in una funzione: sono errori del controllo, e l'interfaccia chiede il nome prima); i casi d'uso che
// attendono un errore su un blocco tolto (restano, come per `elimina`).

import { nomeValidoNelFile } from "../controllo/controllo";
import { paroleTolleranti, type Parola } from "../espressioni/analizzatore";
import { valorePredefinito, type Blocco, type Funzione, type Progetto, type TipoRestituito, type VoceDiUnaFunzione } from "../progetto/modello";
import { conIdNuovi, idDelBlocco, idUsati, primoLibero, sottoblocchi } from "./identificatori";
import { nomeDellaCopia, valida, type Operazione, type Risultato } from "./operazioni";
import { conTestiPropri, eUnaParolaSola, seguitaDaParentesi, testiPropri } from "./rinomina";

export type GenereDiSottoprogramma = "procedure" | "function";

/** Ciò che si sceglie di una procedura o di una funzione: il genere e, per una funzione, il tipo restituito, il valore
 * predefinito (il letterale che prende il suo posto in un'espressione quando la si toglie), la dimensione di un vettore
 * restituito e la lunghezza massima di una stringa restituita (`null`: nessuna, un valore solo o la lunghezza
 * predefinita; assenti, restano come sono). Un vettore non ha valore predefinito. */
export interface Proprieta {
  readonly genere: GenereDiSottoprogramma;
  /** Uno dei cinque, o un record (col nome in `record`). */
  readonly tipo?: TipoRestituito | "record";
  readonly record?: string;
  readonly predefinito?: string;
  readonly dimensione?: number | null;
  readonly lunghezza?: number | null;
}

const no = (motivo: "funzione_inesistente" | "dato_inesistente" | "al_bordo"): Risultato => ({ ok: false, rifiuto: { motivo } });

const sottoprogramma = (p: Progetto, id: string): Funzione | undefined => p.functions.find((f) => f.id === id && f.kind !== "main");

// ------------------------------------------------------------------------------- le parole di una chiamata

/** Le posizioni (nelle parole) dei nomi `nome` seguiti da «(»: le chiamate di quella funzione nel testo. */
function chiamateNelTesto(ps: readonly Parola[], nome: string): number[] {
  return ps.flatMap((p, k) => (p.genere === "nome" && p.testo === nome && seguitaDaParentesi(ps, k) ? [k] : []));
}

/** Vero se il testo chiama la funzione `nome`. */
export const chiamaNelTesto = (testo: string, nome: string): boolean => chiamateNelTesto(paroleTolleranti(testo), nome).length > 0;

/** Il testo con ogni chiamata della funzione `vecchio` scritta col nome `nuovo`; il resto del testo non si tocca. */
export function rinominaLaChiamata(testo: string, vecchio: string, nuovo: string): string {
  const ps = paroleTolleranti(testo);
  const c = Array.from(testo);
  let fuori = "";
  let fatto = 0;
  for (const k of chiamateNelTesto(ps, vecchio)) {
    fuori += c.slice(fatto, ps[k]!.da).join("") + nuovo;
    fatto = ps[k]!.a;
  }
  return fuori + c.slice(fatto).join("");
}

/** Il testo con ogni chiamata della funzione `nome`, argomenti compresi fino alla parentesi che la chiude, sostituita da
 * `valore` (fra parentesi se comincia col meno: `2 raised_to (-1)`). Una chiamata senza la parentesi che la chiude arriva
 * alla fine del testo. */
export function sostituisciLaChiamata(testo: string, nome: string, valore: string): string {
  const ps = paroleTolleranti(testo);
  const c = Array.from(testo);
  const al = valore.startsWith("-") ? `(${valore})` : valore;
  let fuori = "";
  let fatto = 0;
  for (const k of chiamateNelTesto(ps, nome)) {
    // Una chiamata dentro gli argomenti di una chiamata già sostituita è già andata via con lei.
    if (ps[k]!.da < fatto) continue;
    let profondita = 0;
    let fine = c.length;
    for (let j = k + 1; j < ps.length; j++) {
      const t = ps[j]!;
      if (t.genere !== "segno") continue;
      if (t.testo === "(") profondita++;
      else if (t.testo === ")" && --profondita === 0) {
        fine = t.a;
        break;
      }
    }
    fuori += c.slice(fatto, ps[k]!.da).join("") + al;
    fatto = fine;
  }
  return fuori + c.slice(fatto).join("");
}

/** Il testo con gli argomenti di ogni chiamata della funzione `nome` passati da `cambia`, ognuno senza gli spazi ai lati e
 * già con le chiamate che contiene cambiate. Lo stesso numero di argomenti torna al posto di quelli di prima, con gli spazi
 * di prima; un numero diverso si scrive separato da virgola e spazio. Le virgole che separano sono quelle fuori dalle
 * parentesi tonde e quadre degli argomenti e fuori dai letterali; una chiamata senza la parentesi che la chiude resta com'è. */
export function conGliArgomenti(testo: string, nome: string, cambia: (argomenti: readonly string[]) => readonly string[]): string {
  const ps = paroleTolleranti(testo);
  const c = Array.from(testo);
  let fuori = "";
  let fatto = 0;
  for (const k of chiamateNelTesto(ps, nome)) {
    // Una chiamata dentro gli argomenti di una chiamata già cambiata è già cambiata con lei.
    if (ps[k]!.da < fatto) continue;
    let profondita = 0;
    let chiusa = -1;
    const virgole: number[] = [];
    for (let j = k + 1; j < ps.length; j++) {
      const t = ps[j]!;
      if (t.genere !== "segno") continue;
      if (t.testo === "(" || t.testo === "[") profondita++;
      else if ((t.testo === ")" || t.testo === "]") && --profondita === 0) {
        chiusa = j;
        break;
      } else if (t.testo === "," && profondita === 1) virgole.push(j);
    }
    if (chiusa < 0) continue;
    const inizi = [ps[k + 1]!.a, ...virgole.map((j) => ps[j]!.a)];
    const fini = [...virgole.map((j) => ps[j]!.da), ps[chiusa]!.da];
    const posti = inizi.map((da, i) => {
      const t = c.slice(da, fini[i]).join("");
      const dentro = t.trim();
      return { prima: t.slice(0, t.length - t.trimStart().length), dentro: conGliArgomenti(dentro, nome, cambia), dopo: t.slice(t.trimEnd().length) };
    });
    const argomenti = posti.length === 1 && posti[0]!.dentro === "" ? [] : posti.map((x) => x.dentro);
    const nuovi = cambia(argomenti);
    const scritti =
      nuovi.length === argomenti.length && nuovi.length > 0 ? posti.map((x, i) => x.prima + nuovi[i] + x.dopo).join(",") : nuovi.join(", ");
    fuori += c.slice(fatto, ps[k + 1]!.a).join("") + scritti + ")";
    fatto = ps[chiusa]!.a;
  }
  return fuori + c.slice(fatto).join("");
}

// ---------------------------------------------------------------------------------- dove è chiamata

/** Una chiamata di una funzione: la funzione e il blocco che la contengono (la fine, per ciò che una funzione
 * restituisce), e che genere di blocco è. */
export interface Chiamata {
  readonly funzione: string;
  readonly blocco: string;
  /** Un salto (`call`), non un nome in un'espressione. */
  readonly salto: boolean;
  /** Un rombo (se, mentre, ripeti) con la chiamata nella condizione. */
  readonly rombo: boolean;
  /** Un'assegnazione con la chiamata nella destinazione o nel valore. */
  readonly assegnazione: boolean;
}

const rombi = new Set(["if", "while", "repeat"]);

/** Dove la procedura o la funzione `nome` è chiamata, blocco per blocco, nell'ordine delle funzioni e della lettura. */
export function chiamateDi(p: Progetto, nome: string): Chiamata[] {
  const fuori: Chiamata[] = [];
  for (const f of p.functions) {
    const visita = (b: Blocco): void => {
      if (b.kind === "call" && b.callee === nome) fuori.push({ funzione: f.id, blocco: b.id, salto: true, rombo: false, assegnazione: false });
      else if (testiPropri(b).some((t) => chiamaNelTesto(t, nome)))
        fuori.push({ funzione: f.id, blocco: b.id, salto: false, rombo: rombi.has(b.kind), assegnazione: b.kind === "assignment" });
      sottoblocchi(b).forEach(visita);
    };
    f.body.forEach(visita);
    if (f.end.return_value !== undefined && chiamaNelTesto(f.end.return_value, nome))
      fuori.push({ funzione: f.id, blocco: f.end.id, salto: false, rombo: false, assegnazione: false });
  }
  return fuori;
}

/** Gli `id` delle funzioni (programma principale compreso) che chiamano `nome`, una volta ciascuna, tranne lei stessa. */
export function chiamataDa(p: Progetto, nome: string): string[] {
  const se = p.functions.find((f) => f.name === nome)?.id;
  return [...new Set(chiamateDi(p, nome).map((c) => c.funzione))].filter((id) => id !== se);
}

// -------------------------------------------------------------------------------------- le operazioni

/** Perché quel nome non va per una procedura o una funzione, con le regole del controllo: non valido, o già di un'altra
 * funzione (non quella con `id`), di un dato di una funzione o di una costante comune (i due errori `invalid_name` e
 * `function_name_in_use`). Lo chiede l'interfaccia prima di creare o di rinominare. */
export function motivoDelNome(p: Progetto, nome: string, id?: string): "non_valido" | "in_uso" | undefined {
  if (!nomeValidoNelFile(nome)) return "non_valido";
  const usati = [
    ...p.functions.filter((f) => f.id !== id).map((f) => f.name),
    ...p.functions.flatMap((f) => f.data.map((d) => d.name)),
    ...(p.shared_constants ?? []).map((d) => d.name),
  ];
  return usati.includes(nome) ? "in_uso" : undefined;
}

/** L'`id` della prossima funzione: `f<N>`, col primo N oltre quelli usati (anche negli attesi dei casi). */
export function idDellaFunzioneNuova(p: Progetto): string {
  const usati = new Set(idUsati(p));
  let n = 1 + idUsati(p).reduce((m, id) => Math.max(m, Number(/^f([1-9]\d*)$/.exec(id)?.[1] ?? 0)), 0);
  while (usati.has(`f${n}`)) n++;
  return `f${n}`;
}

/** La funzione col genere e le proprietà date: una funzione ha il tipo restituito, il valore predefinito (omesso se è
 * quello del tipo, e sempre per un vettore) e ciò che restituisce (vuoto, se prima non c'era); una procedura nessuno dei
 * tre. La dimensione di un vettore restituito e la lunghezza massima, non date, restano alla funzione (la lunghezza solo
 * a una funzione che resta stringa). */
function conProprieta(f: Funzione, pr: Proprieta): Funzione {
  const { return_type: _t, return_record: recordDi, return_size: dimensioneDi, return_max_length: lunghezzaDi, default_result: _d, ...resto } = f;
  const { return_value, ...fine } = f.end;
  if (pr.genere === "procedure") {
    // Una funzione non scrive (E042): l'output atteso dei suoi casi è fatto delle righe di ciò che restituisce, che una
    // procedura non scrive. Escono dalla prima in poi (sono in fondo, e una stringa restituita può andare a capo: la
    // riga dopo il suo a capo non comincia con «→ »); il resto dell'atteso no.
    const senzaRisultato = (o: string) => {
      const i = o.startsWith("→ ") ? 0 : o.indexOf("\n→ ");
      return i < 0 ? o : o.slice(0, i === 0 ? 0 : i + 1);
    };
    const casi = f.kind === "function" && resto.test_cases ? { test_cases: resto.test_cases.map((c) => ({ ...c, expected: { ...c.expected, output: senzaRisultato(c.expected.output) } })) } : {};
    return { ...resto, kind: "procedure", end: fine, ...casi };
  }
  const return_size = pr.dimensione === undefined ? dimensioneDi : (pr.dimensione ?? undefined);
  // Un record restituito non ha valore predefinito né lunghezza: il nome del record dato, o quello di prima.
  if ((pr.tipo ?? f.return_type) === "record")
    return {
      ...resto,
      kind: "function",
      return_type: "record",
      return_record: pr.record ?? recordDi ?? "",
      ...(return_size !== undefined ? { return_size } : {}),
      end: { ...fine, return_value: return_value ?? "" },
    };
  const tipo = (pr.tipo ?? f.return_type ?? "integer") as TipoRestituito;
  const return_max_length = pr.lunghezza === undefined ? lunghezzaDi : (pr.lunghezza ?? undefined);
  const predefinito = return_size !== undefined ? valorePredefinito[tipo] : (pr.predefinito ?? f.default_result ?? valorePredefinito[tipo]);
  return {
    ...resto,
    kind: "function",
    return_type: tipo,
    ...(return_size !== undefined ? { return_size } : {}),
    ...(tipo === "string" && return_max_length !== undefined ? { return_max_length } : {}),
    ...(predefinito === valorePredefinito[tipo] ? {} : { default_result: predefinito }),
    end: { ...fine, return_value: return_value ?? "" },
  };
}

/** Una procedura o una funzione nuova in fondo al progetto, vuota (l'inizio e la fine), con l'`id` di
 * `idDellaFunzioneNuova`. */
export const nuovaFunzione =
  (nome: string, pr: Proprieta): Operazione =>
  (p, prossimo) => {
    const n = Math.max(prossimo, primoLibero(p));
    const vuota: Funzione = { id: idDellaFunzioneNuova(p), kind: "procedure", name: nome, data: [], body: [], end: { id: idDelBlocco(n) } };
    return valida({ ...p, functions: [...p.functions, conProprieta(vuota, pr)] }, n + 1);
  };

/** Ogni blocco del progetto, in ogni funzione, passato da `cambia` (dopo i blocchi che contiene): `null` lo toglie. */
export function ogniBlocco(f: Funzione, cambia: (b: Blocco) => Blocco | null): Funzione {
  const sequenza = (s: readonly Blocco[]): Blocco[] =>
    s.flatMap((b) => {
      const dentro: Blocco =
        b.kind === "if" ? { ...b, then: sequenza(b.then), else: sequenza(b.else) } : "body" in b ? ({ ...b, body: sequenza(b.body) } as Blocco) : b;
      const x = cambia(dentro);
      return x === null ? [] : [x];
    });
  return { ...f, body: sequenza(f.body) };
}

/** Ciò che una funzione restituisce, passato da `cambia`. */
export const conLaFine = (f: Funzione, cambia: (t: string) => string): Funzione =>
  f.end.return_value === undefined ? f : { ...f, end: { ...f.end, return_value: cambia(f.end.return_value) } };

/**
 * Rinomina la procedura o la funzione e, nello stesso passo, le sue chiamate: i salti che la nominano e il suo nome
 * seguito da «(» nei testi di ogni funzione. Le chiamate cambiano solo se il nome nuovo si legge come un nome solo (come
 * per un dato) e se nessun'altra funzione porta già il nome nuovo, o ancora il vecchio: lì le chiamate sono anche sue, e
 * riscriverle le fonderebbe (il controllo mostra il nome doppio).
 */
export const rinominaFunzione =
  (id: string, nuovo: string): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, id);
    if (f === undefined) return no("funzione_inesistente");
    const vecchio = f.name!;
    const altri = p.functions.filter((x) => x.id !== id).map((x) => x.name);
    const chiamate = eUnaParolaSola(nuovo) && !altri.includes(nuovo) && !altri.includes(vecchio);
    const nelTesto = (t: string) => rinominaLaChiamata(t, vecchio, nuovo);
    const functions = p.functions.map((x) => {
      const rinominata = x.id === id ? { ...x, name: nuovo } : x;
      if (!chiamate) return rinominata;
      return conLaFine(
        ogniBlocco(rinominata, (b) => {
          const c = conTestiPropri(b, nelTesto);
          return c.kind === "call" && c.callee === vecchio ? { ...c, callee: nuovo } : c;
        }),
        nelTesto,
      );
    });
    return valida({ ...p, functions }, prossimo);
  };

/** Il genere, il tipo restituito (con la dimensione e la lunghezza massima) e il valore predefinito. Cambiare il genere tiene corpo, dati e casi: ciò che non va più
 * bene (un parametro per riferimento in una funzione, un salto a una funzione) lo segnala il controllo. Una funzione che
 * diventa procedura perde ciò che restituisce, e dall'output atteso dei suoi casi escono le righe «→ …»; una procedura che
 * diventa funzione restituisce un'espressione vuota, e i suoi casi restano com'erano (ciò che restituirà non si sa). */
export const proprietaDellaFunzione =
  (id: string, pr: Proprieta): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, id);
    if (f === undefined) return no("funzione_inesistente");
    const nuova = conProprieta(f, pr);
    // Le stesse proprietà: il progetto non cambia (nessun passo), anche se il file scrive il valore predefinito del tipo.
    const stesse =
      nuova.kind === f.kind &&
      nuova.return_type === f.return_type &&
      nuova.return_size === f.return_size &&
      nuova.return_max_length === f.return_max_length &&
      (f.kind === "procedure" || predefinitoDi(nuova) === predefinitoDi(f));
    return stesse ? { ok: true, progetto: p, prossimo } : valida({ ...p, functions: p.functions.map((x) => (x.id === id ? nuova : x)) }, prossimo);
  };

/** Ciò che la funzione restituisce (l'espressione della sua fine), scritto com'è: che sia un'espressione giusta, e del tipo,
 * lo dice il controllo. Solo una funzione: una procedura e il programma principale non restituiscono nulla. */
export const restituisce =
  (id: string, valore: string): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, id);
    if (f === undefined || f.kind !== "function") return no("funzione_inesistente");
    return valida({ ...p, functions: p.functions.map((x) => (x.id === id ? { ...x, end: { ...x.end, return_value: valore } } : x)) }, prossimo);
  };

/** La copia della procedura o della funzione subito dopo di lei, col primo nome libero (`media_2`, fra i nomi delle
 * funzioni, dei dati e delle costanti comuni), identificatori nuovi per lei, i suoi blocchi e la sua fine, gli stessi
 * dati e casi d'uso (gli errori e gli avvisi attesi sui blocchi della copia). Le chiamate restano all'originale. */
export const duplicaFunzione =
  (id: string): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, id);
    if (f === undefined) return no("funzione_inesistente");
    const usati = new Set([...p.functions.flatMap((x) => [x.name ?? "", ...x.data.map((d) => d.name)]), ...(p.shared_constants ?? []).map((d) => d.name)]);
    let n = Math.max(prossimo, primoLibero(p));
    const body = f.body.map((b) => {
      const copia = conIdNuovi(b, n);
      n = copia.prossimo;
      return copia.blocco;
    });
    const id2 = idDellaFunzioneNuova(p);
    // Gli attesi dei casi nominano i blocchi della copia, non quelli dell'originale (gli `id` nuovi sono in ordine di lettura).
    const inOrdine = (bs: readonly Blocco[]): string[] => bs.flatMap((b) => [b.id, ...inOrdine(sottoblocchi(b))]);
    const nuovoId = new Map([...inOrdine(f.body).map((x, i) => [x, inOrdine(body)[i]!] as const), [f.end.id, idDelBlocco(n)], [f.id, id2]]);
    const nuovo = <T extends { readonly block: string }>(s: T | undefined): T | undefined => (s === undefined ? s : { ...s, block: nuovoId.get(s.block) ?? s.block });
    const test_cases = f.test_cases?.map((c) => {
      const { error, static_error, warnings } = c.expected;
      return {
        ...c,
        expected: { ...c.expected, ...(error && { error: nuovo(error) }), ...(static_error && { static_error: nuovo(static_error) }), ...(warnings && { warnings: warnings.map((w) => nuovo(w)!) }) },
      };
    });
    const copia: Funzione = { ...f, id: id2, name: nomeDellaCopia(usati, f.name!), body, end: { ...f.end, id: idDelBlocco(n) }, ...(test_cases && { test_cases }) };
    const i = p.functions.indexOf(f);
    return valida({ ...p, functions: [...p.functions.slice(0, i + 1), copia, ...p.functions.slice(i + 1)] }, n + 1);
  };

/** Che cosa fare delle chiamate di ciò che si elimina: lasciarle (diventano errori da correggere); per una procedura
 * togliere i salti; per una funzione sostituirle col suo valore predefinito, oppure togliere le assegnazioni che la
 * contengono e sostituirla altrove. `rombiTenuti` sono i rombi in cui l'utente non ha confermato la sostituzione: lì la
 * chiamata resta. Una funzione che restituisce un vettore non ha un valore predefinito: si tolgono le assegnazioni che la
 * contengono, e altrove resta. */
export type ChiamateDaTogliere =
  | { readonly come: "restano" }
  | { readonly come: "salti" }
  | { readonly come: "predefinito" | "assegnazioni"; readonly rombiTenuti?: readonly string[] };

/** Il valore predefinito di una funzione: quello scritto, o quello del tipo; un record non ne ha (vuoto). */
export const predefinitoDi = (f: Funzione): string => f.default_result ?? (f.return_type === "record" ? "" : valorePredefinito[f.return_type ?? "integer"]);

/** Toglie la procedura o la funzione, e delle sue chiamate ciò che `chiamate` dice (vedi `ChiamateDaTogliere`). */
export const eliminaFunzione =
  (id: string, chiamate: ChiamateDaTogliere): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, id);
    if (f === undefined) return no("funzione_inesistente");
    const nome = f.name!;
    const resto = p.functions.filter((x) => x.id !== id);
    if (chiamate.come === "restano") return valida({ ...p, functions: resto }, prossimo);
    if (chiamate.come === "salti")
      return valida({ ...p, functions: resto.map((x) => ogniBlocco(x, (b) => (b.kind === "call" && b.callee === nome ? null : b))) }, prossimo);
    const tenuti = new Set(chiamate.rombiTenuti ?? []);
    // Al posto della chiamata va un valore del tipo restituito: un intero ammesso per un reale si scrive da reale (lo zero
    // senza segno), o in un'espressione farebbe una divisione intera.
    const scritto = predefinitoDi(f);
    const valore = f.return_type === "real" && /^-?\d+$/.test(scritto) ? (/^-?0+$/.test(scritto) ? "0.0" : `${scritto}.0`) : scritto;
    // Un vettore o un record restituito non ha un valore predefinito: come il vettore.
    const vettore = f.return_size !== undefined || f.return_type === "record";
    const sostituisci = (t: string) => (vettore ? t : sostituisciLaChiamata(t, nome, valore));
    const togliAssegnazioni = vettore || chiamate.come === "assegnazioni";
    const functions = resto.map((x) =>
      conLaFine(
        ogniBlocco(x, (b) => {
          if (!testiPropri(b).some((t) => chiamaNelTesto(t, nome))) return b;
          if (togliAssegnazioni && b.kind === "assignment") return null;
          if (rombi.has(b.kind) && tenuti.has(b.id)) return b;
          return conTestiPropri(b, sostituisci);
        }),
        sostituisci,
      ),
    );
    return valida({ ...p, functions }, prossimo);
  };

// -------------------------------------------------------------------------------------- i parametri

/** Le posizioni nei dati della funzione dei suoi parametri, nell'ordine della firma. */
const posizioniDeiParametri = (f: Funzione): number[] => f.data.flatMap((d, i) => (d.parameter === undefined ? [] : [i]));

/** Le voci di un caso della funzione che vanno ai parametri, un pezzo per parametro nell'ordine della firma (un vettore
 * elemento per elemento, o fino alla voce con `each`, come le legge l'interprete; un parametro di uscita non si chiede,
 * e il suo pezzo è vuoto), e quelle che restano (le letture del corpo); `undefined` se le voci non cominciano coi
 * parametri: il caso resta com'è, e lo mostra il suo esito. */
function vociAiParametri(f: Funzione, voci: readonly VoceDiUnaFunzione[]) {
  const pezzi: VoceDiUnaFunzione[][] = [];
  let i = 0;
  for (const d of f.data.filter((x) => x.parameter !== undefined)) {
    const pezzo: VoceDiUnaFunzione[] = [];
    if (d.parameter === "out") {
      pezzi.push(pezzo);
      continue;
    }
    for (let k = 0; k < (d.size ?? 1); k++) {
      const v = voci[i];
      if (v === undefined || v.data !== d.name) return undefined;
      pezzo.push(v);
      i++;
      if (v.each === true) break;
    }
    pezzi.push(pezzo);
  }
  return { pezzi, resto: voci.slice(i) };
}

/** La funzione coi casi d'uso le cui voci dei parametri (di `prima`, la funzione com'era) passano da `cambia`. */
function conLeVociDeiParametri(prima: Funzione, dopo: Funzione, cambia: (pezzi: VoceDiUnaFunzione[][]) => VoceDiUnaFunzione[][]): Funzione {
  if (prima.test_cases === undefined) return dopo;
  const test_cases = prima.test_cases.map((caso) => {
    const v = vociAiParametri(prima, caso.inputs);
    return v === undefined ? caso : { ...caso, inputs: [...cambia(v.pezzi).flat(), ...v.resto] };
  });
  return { ...dopo, test_cases };
}

/** Il progetto con gli argomenti di ogni chiamata della funzione `f` passati da `cambia`: i salti e il suo nome seguito da
 * «(» nei testi di ogni funzione (anche dentro gli argomenti di un salto). Se un'altra funzione porta lo stesso nome, le
 * chiamate sono anche sue, e restano come sono. */
function conLeChiamate(p: Progetto, f: Funzione, cambia: (argomenti: readonly string[]) => readonly string[]): Progetto {
  const nome = f.name!;
  if (p.functions.some((x) => x.id !== f.id && x.name === nome)) return p;
  const nelTesto = (t: string) => conGliArgomenti(t, nome, cambia);
  return {
    ...p,
    functions: p.functions.map((x) =>
      conLaFine(
        ogniBlocco(x, (b) => {
          const c = conTestiPropri(b, nelTesto);
          return c.kind === "call" && c.callee === nome ? { ...c, arguments: cambia(c.arguments) } : c;
        }),
        nelTesto,
      ),
    ),
  };
}

/**
 * Scambia il parametro in quella posizione dei dati col parametro vicino nella firma, prima (`-1`) o dopo (`1`), e nello
 * stesso passo i due argomenti di ogni chiamata (quelle con meno argomenti restano come sono) e le voci dei due parametri
 * nei casi d'uso della funzione: la firma, le chiamate e i casi cambiano insieme. I dati di lavoro restano al loro posto.
 */
export const spostaParametro =
  (indice: number, verso: -1 | 1, funzione: string): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, funzione);
    if (f === undefined) return no("funzione_inesistente");
    const posizioni = posizioniDeiParametri(f);
    const k = posizioni.indexOf(indice);
    if (k < 0) return no("dato_inesistente");
    const h = k + verso;
    if (h < 0 || h >= posizioni.length) return no("al_bordo");
    const altro = posizioni[h]!;
    const scambiati = conLeVociDeiParametri(f, { ...f, data: f.data.map((d, i) => (i === indice ? f.data[altro]! : i === altro ? f.data[indice]! : d)) }, (pz) =>
      pz.map((x, i) => (i === k ? pz[h]! : i === h ? pz[k]! : x)),
    );
    const conLaFirma = { ...p, functions: p.functions.map((x) => (x.id === f.id ? scambiati : x)) };
    return valida(
      conLeChiamate(conLaFirma, scambiati, (a) => (a.length > Math.max(k, h) ? a.map((x, i) => (i === k ? a[h]! : i === h ? a[k]! : x)) : a)),
      prossimo,
    );
  };

/** Toglie il parametro in quella posizione dei dati, e le sue voci dai casi d'uso della funzione; con `togliArgomenti`,
 * anche il suo argomento da ogni chiamata (quelle con meno argomenti restano come sono); senza, le chiamate restano e
 * mostrano l'errore. Le regole che lo usano restano. Un parametro AGGIUNTO non ha voci nei casi: lo dice il loro esito. */
export const eliminaParametro =
  (indice: number, funzione: string, togliArgomenti: boolean): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, funzione);
    if (f === undefined) return no("funzione_inesistente");
    const k = posizioniDeiParametri(f).indexOf(indice);
    if (k < 0) return no("dato_inesistente");
    const senza = conLeVociDeiParametri(f, { ...f, data: f.data.filter((_, i) => i !== indice) }, (pz) => pz.filter((_, i) => i !== k));
    const q = { ...p, functions: p.functions.map((x) => (x.id === f.id ? senza : x)) };
    return valida(togliArgomenti ? conLeChiamate(q, senza, (a) => (a.length > k ? a.filter((_, i) => i !== k) : a)) : q, prossimo);
  };

/** Il parametro per riferimento in quella posizione dei dati passa per uscita, e le sue voci escono dai casi d'uso della
 * funzione (un parametro di uscita non si chiede), in un passo solo. Le chiamate restano come sono. */
export const perUscita =
  (indice: number, funzione: string): Operazione =>
  (p, prossimo) => {
    const f = sottoprogramma(p, funzione);
    if (f === undefined) return no("funzione_inesistente");
    const k = posizioniDeiParametri(f).indexOf(indice);
    if (k < 0 || f.data[indice]!.parameter !== "reference") return no("dato_inesistente");
    const dopo = conLeVociDeiParametri(f, { ...f, data: f.data.map((d, i) => (i === indice ? { ...d, parameter: "out" as const } : d)) }, (pz) => pz.map((x, i) => (i === k ? [] : x)));
    return valida({ ...p, functions: p.functions.map((x) => (x.id === f.id ? dopo : x)) }, prossimo);
  };
