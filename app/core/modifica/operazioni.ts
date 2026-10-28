// Le modifiche di un progetto, come funzioni pure: ognuna riceve il progetto e restituisce il progetto
// nuovo, o il motivo per cui non si applica. Il risultato passa SEMPRE dal lettore (`leggi`): un modello
// costruito qui obbedisce alle stesse regole di un file aperto, e quello che si restituisce è il modello
// che il lettore ricostruisce (campi nell'ordine del formato, opzioni uguali al predefinito tolte, `-0`
// letto `0`). Se il lettore lo rifiuta, l'operazione non si applica. Un campo facoltativo senza valore si
// omette, mai `undefined`.
//
// Un POSTO è una posizione in una sequenza di blocchi: il contenitore (l'`id` della funzione per la
// sequenza principale, o del blocco che possiede il ramo), il ramo (`body`, `then`, `else`) e l'indice,
// da 0 alla lunghezza della sequenza. I punti di inserimento del disegno portano lo stesso oggetto.
//
// I dati sono quelli di una funzione (il programma principale, se non si dice quale; le costanti comuni restano
// in sola lettura) e si indicano per POSIZIONE nella vista, non per nome: due dati possono avere lo stesso
// nome finché l'utente non lo corregge. Anche i casi d'uso si indicano per posizione; i loro nomi sono unici, e un
// nome già usato lo rifiuta il lettore. L'errore atteso e gli avvisi si scrivono dall'ESITO di un'esecuzione del
// caso, mai da un codice scelto a mano.
//
// Che cosa NON guarda: le regole di validità dei dati e la sintassi dei testi (sono del controllo statico:
// un blocco appena inserito ha i campi vuoti, e il progetto si apre lo stesso); i blocchi degli attesi dei
// casi d'uso, che restano anche se il blocco nominato non c'è più (il caso fallisce, il file si apre); che l'esito
// dato per scrivere l'errore atteso o gli avvisi sia di quel caso sul progetto di adesso (lo garantisce chi chiama,
// che l'ha appena ottenuto); le voci di un caso destinate a un dato che non c'è (il caso le mostra, il file si apre).

import type { EsitoDelCaso } from "../casi/esito";
import { datiLettiAltrove, datiLettiNellaRadice } from "../casi/voci";
import { leggi, nomeCheSiConfonde, type ErroreDiApertura } from "../progetto/formato";
import { nonSiAttendono, type Atteso, type Blocco, type CasoDiUnaFunzione, type CasoDUso, type Dato, type Funzione, type Metadati, type Opzioni, type Progetto } from "../progetto/modello";
import { conIdNuovi, idDelBlocco, idDellaPrincipale, primoLibero, sottoblocchi } from "./identificatori";
import { conTesti, eUnaParolaSola, nomina, rinominaNelTesto, testiPropri } from "./rinomina";

export type Ramo = "body" | "then" | "else";

export interface Posto {
  readonly contenitore: string;
  readonly ramo: Ramo;
  readonly indice: number;
}

/** I dieci generi di blocco che l'editor inserisce: quelli della tappa 1, i due cicli della tappa 2 e il salto a una
 * procedura, prima del commento. */
export const generiDellaTappa = ["assignment", "read", "write", "if", "while", "repeat", "for", "for_each", "call", "comment"] as const;
export type GenereDellaTappa = (typeof generiDellaTappa)[number];

export type Rifiuto =
  | { readonly motivo: "blocco_inesistente" }
  | { readonly motivo: "posto_inesistente" }
  | { readonly motivo: "dentro_se_stesso" }
  | { readonly motivo: "dato_inesistente" }
  | { readonly motivo: "caso_inesistente" }
  /** Una procedura o una funzione che non c'è (il programma principale non si rinomina né si elimina). */
  | { readonly motivo: "funzione_inesistente" }
  /** Spostare su il primo, o giù l'ultimo. */
  | { readonly motivo: "al_bordo" }
  /** Un parametro non si duplica né si sposta: la sua posizione è la firma della funzione. */
  | { readonly motivo: "parametro" }
  /** L'esito di un caso senza un errore da attendere. */
  | { readonly motivo: "nessun_errore" }
  /** Un errore che dipende dalla macchina e dal motore (la memoria finita): un caso non lo attende. */
  | { readonly motivo: "non_deterministico" }
  /** L'esito di un progetto fuori tappa: non c'è un ottenuto. */
  | { readonly motivo: "fuori_tappa" }
  /** Il nome dato a un caso si confonderebbe nella riga di comando con quello di un caso dell'altra parte
   * (`nomeCheSiConfonde`): un file che lo ha già si apre, ma un nome nuovo così non si dà. */
  | { readonly motivo: "nome_del_caso_confuso" }
  /** Il nome scelto per ciò che un'importazione rinomina: non valido, o già usato nel progetto o da un'altra cosa che entra. */
  | { readonly motivo: "nome_non_valido" | "nome_in_uso"; readonly nome: string }
  /** Per un nome che nel programma è di un'altra specie (la funzione e il dato) l'importazione ammette solo la rinomina. */
  | { readonly motivo: "scelta_non_ammessa"; readonly chiave: string }
  | { readonly motivo: "illeggibile"; readonly errori: readonly ErroreDiApertura[] };

/** `prossimo` è il primo numero libero per un identificatore nuovo (vedi `identificatori.ts`). */
export type Risultato = { readonly ok: true; readonly progetto: Progetto; readonly prossimo: number } | { readonly ok: false; readonly rifiuto: Rifiuto };

export type Operazione = (p: Progetto, prossimo: number) => Risultato;

const no = (motivo: Exclude<Rifiuto["motivo"], "illeggibile" | "nome_non_valido" | "nome_in_uso" | "scelta_non_ammessa">): Risultato => ({ ok: false, rifiuto: { motivo } });

/** Due operazioni in un passo solo: la seconda sul progetto che esce dalla prima. */
export const poi =
  (prima: Operazione, dopo: Operazione): Operazione =>
  (p, prossimo) => {
    const r = prima(p, prossimo);
    return r.ok ? dopo(r.progetto, r.prossimo) : r;
  };

/** Il progetto candidato passa dal lettore: è il modello che si restituisce. */
export function valida(p: Progetto, prossimo: number): Risultato {
  const esito = leggi(p);
  return esito.ok ? { ok: true, progetto: esito.progetto, prossimo } : { ok: false, rifiuto: { motivo: "illeggibile", errori: esito.errori } };
}

/** L'oggetto senza le chiavi a `undefined`: un facoltativo senza valore non c'è. */
function senzaVuoti<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

// --------------------------------------------------------------------------------------- l'albero

const ramiDi = (b: Blocco): readonly Ramo[] => (b.kind === "if" ? ["then", "else"] : "body" in b ? ["body"] : []);
const ramo = (b: Blocco, r: Ramo): readonly Blocco[] => (b as unknown as Record<Ramo, readonly Blocco[]>)[r];

/** Il blocco con quell'`id`, ovunque nel progetto. */
export function trova(p: Progetto, id: string): Blocco | undefined {
  const cerca = (s: readonly Blocco[]): Blocco | undefined => {
    for (const b of s) {
      if (b.id === id) return b;
      const dentro = cerca(sottoblocchi(b));
      if (dentro !== undefined) return dentro;
    }
    return undefined;
  };
  for (const f of p.functions) {
    const b = cerca(f.body);
    if (b !== undefined) return b;
  }
  return undefined;
}

/** Il posto in cui sta il blocco con quell'`id`. */
export function dove(p: Progetto, id: string): Posto | undefined {
  const cerca = (s: readonly Blocco[], contenitore: string, r: Ramo): Posto | undefined => {
    for (const [indice, b] of s.entries()) {
      if (b.id === id) return { contenitore, ramo: r, indice };
      for (const sotto of ramiDi(b)) {
        const trovato = cerca(ramo(b, sotto), b.id, sotto);
        if (trovato !== undefined) return trovato;
      }
    }
    return undefined;
  };
  for (const f of p.functions) {
    const posto = cerca(f.body, f.id, "body");
    if (posto !== undefined) return posto;
  }
  return undefined;
}

/** La sequenza di un contenitore e ramo; `undefined` se non esiste. */
function sequenza(p: Progetto, contenitore: string, r: Ramo): readonly Blocco[] | undefined {
  const f = p.functions.find((x) => x.id === contenitore);
  if (f !== undefined) return r === "body" ? f.body : undefined;
  const b = trova(p, contenitore);
  return b !== undefined && ramiDi(b).includes(r) ? ramo(b, r) : undefined;
}

/** Il progetto con la sequenza di quel contenitore e ramo sostituita (il posto deve esistere). */
function cambiaSequenza(p: Progetto, contenitore: string, r: Ramo, cambia: (s: readonly Blocco[]) => readonly Blocco[]): Progetto {
  const nelBlocco = (b: Blocco): Blocco => {
    const rami = ramiDi(b);
    if (rami.length === 0) return b;
    const nuovi = Object.fromEntries(rami.map((x) => [x, b.id === contenitore && x === r ? cambia(ramo(b, x)) : ramo(b, x).map(nelBlocco)]));
    return { ...b, ...nuovi } as Blocco;
  };
  return {
    ...p,
    functions: p.functions.map((f) => ({ ...f, body: f.id === contenitore && r === "body" ? cambia(f.body) : f.body.map(nelBlocco) })),
  };
}

/** Il progetto col blocco `id` sostituito da `cambia(blocco)` (il blocco deve esistere). */
function cambiaBlocco(p: Progetto, id: string, cambia: (b: Blocco) => Blocco): Progetto {
  const posto = dove(p, id)!;
  return cambiaSequenza(p, posto.contenitore, posto.ramo, (s) => s.map((b, i) => (i === posto.indice ? cambia(b) : b)));
}

const postoValido = (p: Progetto, posto: Posto): boolean => {
  const s = sequenza(p, posto.contenitore, posto.ramo);
  return s !== undefined && Number.isInteger(posto.indice) && posto.indice >= 0 && posto.indice <= s.length;
};

const inserito = (s: readonly Blocco[], indice: number, b: Blocco) => [...s.slice(0, indice), b, ...s.slice(indice)];

// ------------------------------------------------------------------------------------ il progetto

/** I metadati con i testi facoltativi vuoti omessi. */
const metadatiPuliti = (m: Metadati): Metadati =>
  senzaVuoti({ ...m, author: m.author || undefined, description: m.description || undefined, notes: m.notes || undefined });

/** Un progetto nuovo coi suoi metadati: il programma principale vuoto, con l'inizio e la fine. */
export function progettoNuovo(metadati: Metadati): Risultato {
  const p: Progetto = {
    format: "algodesign",
    schema_version: 2,
    metadata: metadatiPuliti(metadati),
    functions: [{ id: idDellaPrincipale, kind: "main", data: [], body: [], end: { id: idDelBlocco(1) } }],
  };
  return valida(p, primoLibero(p));
}

/** I metadati per intero; un testo facoltativo vuoto si omette. */
export const metadati =
  (m: Metadati): Operazione =>
  (p, prossimo) =>
    valida({ ...p, metadata: metadatiPuliti(m) }, prossimo);

/** Le opzioni per intero; quelle uguali al predefinito le toglie il lettore. */
export const opzioni =
  (o: Opzioni): Operazione =>
  (p, prossimo) => {
    const { options: _, ...senza } = p;
    const nuove = senzaVuoti(o);
    return valida(Object.keys(nuove).length === 0 ? senza : { ...senza, options: nuove }, prossimo);
  };

// ------------------------------------------------------------------------------------- i blocchi

/** Un blocco nuovo di quel genere, coi campi vuoti: li scrive l'utente subito dopo. */
function bloccoVuoto(genere: GenereDellaTappa, id: string): Blocco {
  switch (genere) {
    case "assignment":
      return { id, kind: genere, target: "", value: "" };
    case "read":
      return { id, kind: genere, target: "" };
    case "write":
      return { id, kind: genere, values: [""], newline: true };
    case "if":
      return { id, kind: genere, condition: "", then: [], else: [] };
    case "while":
      return { id, kind: genere, condition: "", body: [] };
    case "repeat":
      return { id, kind: genere, body: [], condition: "" };
    case "for":
      return { id, kind: genere, counter: "", from: "", to: "", body: [] };
    case "for_each":
      return { id, kind: genere, item: "", source: "", body: [] };
    // La procedura da chiamare si sceglie nei campi: finché non c'è, il controllo dice che non esiste.
    case "call":
      return { id, kind: genere, callee: "", arguments: [] };
    case "comment":
      return { id, kind: genere, text: "" };
  }
}

/** Il primo numero libero: quello della cronologia, o più avanti se il progetto lo ha già superato. */
const libero = (p: Progetto, prossimo: number) => Math.max(prossimo, primoLibero(p));

export const inserisci =
  (posto: Posto, genere: GenereDellaTappa): Operazione =>
  (p, prossimo) => {
    if (!postoValido(p, posto)) return no("posto_inesistente");
    const n = libero(p, prossimo);
    return valida(
      cambiaSequenza(p, posto.contenitore, posto.ramo, (s) => inserito(s, posto.indice, bloccoVuoto(genere, idDelBlocco(n)))),
      n + 1,
    );
  };

/** Toglie il blocco col suo sottoalbero. */
export const elimina =
  (id: string): Operazione =>
  (p, prossimo) => {
    const posto = dove(p, id);
    if (posto === undefined) return no("blocco_inesistente");
    return valida(
      cambiaSequenza(p, posto.contenitore, posto.ramo, (s) => s.filter((_, i) => i !== posto.indice)),
      prossimo,
    );
  };

/** Gli `id` del blocco e di tutto il suo sottoalbero. */
function idDentro(b: Blocco): Set<string> {
  const fuori = new Set<string>();
  const visita = (x: Blocco): void => {
    fuori.add(x.id);
    sottoblocchi(x).forEach(visita);
  };
  visita(b);
  return fuori;
}

/**
 * Sposta il blocco (col suo sottoalbero) nel posto, contato sul progetto di PRIMA dello spostamento: è il
 * punto che l'utente vede. Rifiutato se il posto sta nel blocco stesso o nel suo sottoalbero. Rilasciato
 * subito prima o subito dopo sé stesso, il progetto non cambia (lo stesso oggetto).
 */
export const sposta =
  (id: string, posto: Posto): Operazione =>
  (p, prossimo) => {
    const da = dove(p, id);
    if (da === undefined) return no("blocco_inesistente");
    return spostaTratto({ contenitore: da.contenitore, ramo: da.ramo, da: da.indice, a: da.indice }, posto)(p, prossimo);
  };

/**
 * Incolla nel posto una copia del blocco col suo sottoalbero, con identificatori nuovi (anche dopo un
 * «taglia»: lo stesso blocco si può incollare più volte). Il blocco viene da un progetto qualunque, anche
 * da uno che non c'è più.
 */
export const incolla =
  (blocco: Blocco, posto: Posto): Operazione =>
  (p, prossimo) => {
    if (!postoValido(p, posto)) return no("posto_inesistente");
    const copia = conIdNuovi(blocco, libero(p, prossimo));
    return valida(
      cambiaSequenza(p, posto.contenitore, posto.ramo, (s) => inserito(s, posto.indice, copia.blocco)),
      copia.prossimo,
    );
  };

// ------------------------------------------------------------------------------------- i tratti

/** Un TRATTO è un pezzo di una sequenza: i blocchi vicini dall'indice `da` all'indice `a`, compresi, dello stesso
 * contenitore e ramo. Si sposta, si copia e si elimina in un passo solo, ognuno col suo sottoalbero. */
export interface Tratto {
  readonly contenitore: string;
  readonly ramo: Ramo;
  readonly da: number;
  readonly a: number;
}

/** I posti dal programma (o dalla funzione) fino al blocco: il primo è nella sequenza della funzione, l'ultimo è quello del
 * blocco stesso. Vuoto se il blocco non c'è. */
function catena(p: Progetto, id: string): Posto[] {
  const fuori: Posto[] = [];
  for (let x: Posto | undefined = dove(p, id); x !== undefined; x = dove(p, x.contenitore)) fuori.unshift(x);
  return fuori;
}

/**
 * Il tratto più corto che contiene i due blocchi: nella sequenza più interna che li ha tutti e due, dal blocco che contiene
 * (o è) il primo a quello che contiene (o è) il secondo, in qualunque ordine. Un blocco dentro un altro dà il tratto del
 * solo blocco esterno. `undefined` se uno dei due non c'è o se stanno in due funzioni diverse.
 */
export function trattoFra(p: Progetto, uno: string, altro: string): Tratto | undefined {
  const x = catena(p, uno);
  const y = catena(p, altro);
  if (x.length === 0 || y.length === 0 || x[0]!.contenitore !== y[0]!.contenitore) return undefined;
  let k = 0;
  // Si scende finché al livello sotto i due stanno nella stessa sequenza (lo stesso blocco che li contiene, lo stesso ramo).
  while (k + 1 < x.length && k + 1 < y.length && x[k + 1]!.contenitore === y[k + 1]!.contenitore && x[k + 1]!.ramo === y[k + 1]!.ramo) k++;
  const [i, j] = [x[k]!.indice, y[k]!.indice];
  return { contenitore: x[k]!.contenitore, ramo: x[k]!.ramo, da: Math.min(i, j), a: Math.max(i, j) };
}

/** Il blocco della sequenza del tratto che è il blocco `id` o lo contiene; `undefined` se non ce n'è uno. */
export function nellaSequenzaDel(p: Progetto, id: string, t: Tratto): string | undefined {
  const posto = catena(p, id).find((x) => x.contenitore === t.contenitore && x.ramo === t.ramo);
  return posto === undefined ? undefined : sequenza(p, t.contenitore, t.ramo)?.[posto.indice]?.id;
}

/** I blocchi del tratto, nell'ordine della sequenza; vuoto se il tratto non c'è. */
export function blocchiDelTratto(p: Progetto, t: Tratto): readonly Blocco[] {
  const s = sequenza(p, t.contenitore, t.ramo);
  return s === undefined || !trattoValido(s, t) ? [] : s.slice(t.da, t.a + 1);
}

const trattoValido = (s: readonly Blocco[], t: Tratto) => Number.isInteger(t.da) && Number.isInteger(t.a) && t.da >= 0 && t.da <= t.a && t.a < s.length;

/** Toglie i blocchi del tratto, ognuno col suo sottoalbero. */
export const eliminaTratto =
  (t: Tratto): Operazione =>
  (p, prossimo) => {
    const s = sequenza(p, t.contenitore, t.ramo);
    if (s === undefined || !trattoValido(s, t)) return no("blocco_inesistente");
    return valida(
      cambiaSequenza(p, t.contenitore, t.ramo, (x) => [...x.slice(0, t.da), ...x.slice(t.a + 1)]),
      prossimo,
    );
  };

/**
 * Sposta i blocchi del tratto, di seguito e nello stesso ordine, nel posto contato sul progetto di PRIMA dello spostamento
 * (come `sposta`). Rifiutato se il posto sta in uno dei blocchi o nel suo sottoalbero. Rilasciato su un posto del tratto
 * stesso (subito prima, fra due suoi blocchi, subito dopo), il progetto non cambia.
 */
export const spostaTratto =
  (t: Tratto, posto: Posto): Operazione =>
  (p, prossimo) => {
    const s = sequenza(p, t.contenitore, t.ramo);
    if (s === undefined || !trattoValido(s, t)) return no("blocco_inesistente");
    const blocchi = s.slice(t.da, t.a + 1);
    if (blocchi.some((b) => idDentro(b).has(posto.contenitore))) return no("dentro_se_stesso");
    if (!postoValido(p, posto)) return no("posto_inesistente");
    const stessa = t.contenitore === posto.contenitore && t.ramo === posto.ramo;
    if (stessa && posto.indice >= t.da && posto.indice <= t.a + 1) return { ok: true, progetto: p, prossimo };
    const indice = stessa && posto.indice > t.a ? posto.indice - blocchi.length : posto.indice;
    const senza = cambiaSequenza(p, t.contenitore, t.ramo, (x) => [...x.slice(0, t.da), ...x.slice(t.a + 1)]);
    return valida(
      cambiaSequenza(senza, posto.contenitore, posto.ramo, (x) => [...x.slice(0, indice), ...blocchi, ...x.slice(indice)]),
      prossimo,
    );
  };

/** I campi propri di un blocco che l'editor scrive. Un campo che il genere non ha, lo rifiuta il lettore. */
export interface CampiDiUnBlocco {
  readonly target?: string;
  readonly value?: string;
  readonly values?: readonly string[];
  readonly newline?: boolean;
  readonly condition?: string;
  readonly text?: string;
  readonly counter?: string;
  readonly from?: string;
  readonly to?: string;
  /** Il passo di un `per`; `null` lo toglie. */
  readonly step?: number | null;
  readonly item?: string;
  readonly source?: string;
  /** La procedura chiamata da un salto, e i suoi argomenti in ordine. */
  readonly callee?: string;
  readonly arguments?: readonly string[];
}

/** Cambia i campi dati; quelli assenti (o a `undefined`) restano come sono. Il passo di un `per` portato a 1, o a
 * `null`, si toglie: il passo 1 non si scrive (un file scritto a mano con `"step": 1` resta com'è finché il passo non si
 * riscrive: se arriva 1 su un blocco che ha già `"step": 1`, come dai campi aperti e confermati cambiando un altro
 * campo, il passo resta). */
export const campi =
  (id: string, nuovi: CampiDiUnBlocco): Operazione =>
  (p, prossimo) => {
    if (trova(p, id) === undefined) return no("blocco_inesistente");
    const { step, ...resto } = nuovi;
    return valida(
      cambiaBlocco(p, id, (b) => {
        const togliIlPasso = step === null || (step === 1 && (b as { step?: number }).step !== 1);
        const nuovo = { ...b, ...senzaVuoti({ ...resto, step: togliIlPasso ? undefined : step }) } as Blocco & { step?: number };
        if (!togliIlPasso) return nuovo;
        const { step: _, ...senzaPasso } = nuovo;
        return senzaPasso as Blocco;
      }),
      prossimo,
    );
  };

// ---------------------------------------------------------------------------------------- i dati

// Ogni operazione sui dati riceve, per ultimo, l'`id` della funzione che li possiede (la scheda mostrata); senza, il
// programma principale. Una funzione che non c'è vale un dato che non c'è.

/** La funzione con quell'`id`; senza `id`, il programma principale. */
export const funzioneDi = (p: Progetto, funzione?: string): Funzione | undefined =>
  funzione === undefined ? p.functions.find((f) => f.kind === "main") : p.functions.find((f) => f.id === funzione);

/** Il progetto coi dati della funzione `id` cambiati, e il suo corpo e la sua fine con `corpo` (le regole). */
function cambiaDati(p: Progetto, id: string, cambia: (d: readonly Dato[]) => readonly Dato[], corpo?: (b: Blocco) => Blocco, fine?: (t: string) => string): Progetto {
  return {
    ...p,
    functions: p.functions.map((f) =>
      f.id === id
        ? {
            ...f,
            data: cambia(f.data),
            body: corpo ? f.body.map(corpo) : f.body,
            end: fine && f.end.return_value !== undefined ? { ...f.end, return_value: fine(f.end.return_value) } : f.end,
          }
        : f,
    ),
  };
}

const esiste = (f: Funzione | undefined, indice: number): f is Funzione => f !== undefined && Number.isInteger(indice) && indice >= 0 && indice < f.data.length;

/** Un dato nuovo in fondo alla vista. */
export const aggiungiDato =
  (d: Dato, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (f === undefined) return no("dato_inesistente");
    return valida(
      cambiaDati(p, f.id, (dati) => [...dati, senzaVuoti(d)]),
      prossimo,
    );
  };

/** Tutti gli attributi del dato in quella posizione, tranne il nome: si cambia con `rinominaDato`. */
export const modificaDato =
  (indice: number, attributi: Omit<Dato, "name">, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    return valida(
      cambiaDati(p, f.id, (dati) => dati.map((d, i) => (i === indice ? senzaVuoti({ ...attributi, name: d.name }) : d))),
      prossimo,
    );
  };

/** I dati, per `id` della funzione, a cui le voci `nome` dei casi della radice `r` possono andare: quelli con quel nome che
 * una lettura riceve, nella radice stessa e nelle procedure che chiama. */
const destinatari = (p: Progetto, r: Funzione, nome: string): string[] => [
  ...(datiLettiNellaRadice(p, r.id).includes(nome) ? [r.id] : []),
  ...datiLettiAltrove(p, r.id).flatMap((g) => (g.dati.includes(nome) ? [g.funzione] : [])),
];

/** Che cosa fanno le voci dei casi della radice `r` rinominando il dato in posizione `indice` di `f`: seguono, se possono
 * essere solo di quel dato (anche nessuno, per i casi di `f` stessa); restano, se un altro dato con quel nome riceve una
 * lettura dalla stessa radice (la voce potrebbe essere sua: il nome da solo non lo dice); non lo riguardano, se la
 * radice non arriva al dato. */
function voceDellaRadice(p: Progetto, f: Funzione, indice: number, r: Funzione): "segue" | "resta" | "fuori" {
  const d = f.data[indice]!;
  const letto = (d.parameter === undefined || d.parameter === "value") && f.kind === "procedure";
  if (r.id !== f.id && !letto) return "fuori";
  const a = destinatari(p, r, d.name);
  if (r.id !== f.id && !a.includes(f.id)) return "fuori";
  return a.every((x) => x === f.id) ? "segue" : "resta";
}

/** Le radici in cui, rinominando il dato in posizione `indice` (della funzione `funzione`; il programma principale, senza),
 * le voci dei casi col suo nome restano com'erano perché un altro dato con quel nome riceve una lettura: per ognuna i
 * nomi delle altre funzioni a cui una voce può andare (`null` per il programma principale). Solo le radici che hanno
 * davvero una voce con quel nome. */
export function vociCheRestano(p: Progetto, indice: number, funzione?: string): { readonly radice: string | null; readonly altre: readonly (string | null)[] }[] {
  const f = funzioneDi(p, funzione);
  if (!esiste(f, indice)) return [];
  const nome = f.data[indice]!.name;
  const nomeDi = (id: string) => {
    const g = p.functions.find((x) => x.id === id)!;
    return g.kind === "main" ? null : g.name!;
  };
  return p.functions.flatMap((r) => {
    const casi = r.kind === "main" ? (p.test_cases ?? []) : (r.test_cases ?? []);
    if (!casi.some((c) => c.inputs.some((x) => x.data === nome)) || voceDellaRadice(p, f, indice, r) !== "resta") return [];
    return [{ radice: nomeDi(r.id), altre: destinatari(p, r, nome).filter((x) => x !== f.id).map(nomeDi) }];
  });
}

/**
 * Rinomina il dato e, nello stesso passo, le regole della sua funzione che lo nominano (anche ciò che una funzione
 * restituisce) e le voci dei suoi casi d'uso destinate a lui (quelli del progetto per il programma principale); per un
 * dato di lavoro di una procedura che una lettura riceve, anche le voci dei casi delle radici che la raggiungono
 * (`datiLettiAltrove`). Le voci seguono solo se non possono essere di un altro dato con lo stesso nome che una lettura
 * riceve dalla stessa radice (in un'altra procedura chiamata, o nella radice stessa): lì restano com'erano, e
 * `vociCheRestano` lo dice. Le
 * regole cambiano solo se il nome nuovo si legge come un nome solo (un nome con uno spazio o con una lettera accentata
 * spezzerebbe le regole: lì il dato mostra l'errore), se nessun altro dato porta ancora il nome vecchio (le regole
 * restano sue) e se il nome nuovo non è già di un altro dato della funzione, di una costante comune o di una procedura o
 * funzione: le regole dei due si fonderebbero, e Annulla non saprebbe più quali erano di chi (lì il dato mostra l'errore
 * del nome doppio). Le regole delle altre funzioni non si toccano: i loro dati sono altri, anche con lo stesso nome.
 */
export const rinominaDato =
  (indice: number, nuovo: string, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    const vecchio = f.data[indice]!.name;
    const altri = [...f.data.filter((_, i) => i !== indice), ...(p.shared_constants ?? [])];
    const occupato = altri.some((d) => d.name === nuovo) || p.functions.some((x) => x.name === nuovo);
    const regole = eUnaParolaSola(nuovo) && !altri.some((d) => d.name === vecchio) && !occupato;
    const nelTesto = (t: string) => rinominaNelTesto(t, vecchio, nuovo);
    const rinominato = cambiaDati(
      p,
      f.id,
      (dati) => dati.map((d, i) => (i === indice ? { ...d, name: nuovo } : d)),
      regole ? (b) => conTesti(b, nelTesto) : undefined,
      regole ? nelTesto : undefined,
    );
    if (!regole) return valida(rinominato, prossimo);
    const voci = <V extends { readonly data: string }>(c: CasoDUso<V>): CasoDUso<V> => ({ ...c, inputs: c.inputs.map((x) => (x.data === vecchio ? { ...x, data: nuovo } : x)) });
    const segue = (r: Funzione) => voceDellaRadice(p, f, indice, r) === "segue";
    const delProgramma = p.functions.find((x) => x.kind === "main");
    return valida(
      {
        ...rinominato,
        ...(p.test_cases && delProgramma && segue(delProgramma) ? { test_cases: p.test_cases.map(voci) } : {}),
        functions: rinominato.functions.map((x) => (x.kind !== "main" && x.test_cases && segue(x) ? { ...x, test_cases: x.test_cases.map(voci) } : x)),
      },
      prossimo,
    );
  };

/**
 * Il dato in quella posizione per intero, in un passo solo (la vista dei dati conferma tutti gli attributi
 * insieme): se il nome cambia lo rinomina come `rinominaDato`, regole comprese, poi gli altri attributi.
 */
export const cambiaDato =
  (indice: number, d: Dato, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    const r: Risultato = f.data[indice]!.name === d.name ? { ok: true, progetto: p, prossimo } : rinominaDato(indice, d.name, f.id)(p, prossimo);
    if (!r.ok) return r;
    const { name: _, ...attributi } = d;
    return modificaDato(indice, attributi, f.id)(r.progetto, r.prossimo);
  };

/** Toglie il dato in quella posizione; le regole che lo usano restano, e mostrano l'errore. */
export const eliminaDato =
  (indice: number, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    return valida(
      cambiaDati(p, f.id, (dati) => dati.filter((_, i) => i !== indice)),
      prossimo,
    );
  };

/** Il primo nome libero fra `nome_2`, `nome_3`, … (fra i nomi `usati`), col nome accorciato quanto serve perché stia nei
 * 63 caratteri di un nome. */
export function nomeDellaCopia(usati: ReadonlySet<string>, nome: string): string {
  for (let n = 2; ; n++) {
    const suffisso = `_${n}`;
    const candidato = nome.slice(0, 63 - suffisso.length) + suffisso;
    if (!usati.has(candidato)) return candidato;
  }
}

/** La copia del dato sotto l'originale, col primo nome libero (`voto_2`, fra i dati della funzione e le costanti
 * comuni) e gli stessi attributi; le regole e i casi non cambiano. Un parametro no. */
export const duplicaDato =
  (indice: number, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    const d = f.data[indice]!;
    if (d.parameter !== undefined) return no("parametro");
    const copia = { ...d, name: nomeDellaCopia(new Set([...f.data, ...(p.shared_constants ?? [])].map((x) => x.name)), d.name) };
    return valida(
      cambiaDati(p, f.id, (dati) => [...dati.slice(0, indice + 1), copia, ...dati.slice(indice + 1)]),
      prossimo,
    );
  };

/** Scambia il dato col dato di lavoro vicino sopra (`-1`) o sotto (`1`), saltando i parametri (sono un'altra tabella della
 * vista): cambia l'ordine della vista e del file, e quindi delle azioni dei valori iniziali. Un parametro si sposta con
 * `spostaParametro`, che cambia anche le chiamate. */
export const spostaDato =
  (indice: number, verso: -1 | 1, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    const dati = f.data;
    if (dati[indice]!.parameter !== undefined) return no("parametro");
    let altro = indice + verso;
    while (altro >= 0 && altro < dati.length && dati[altro]!.parameter !== undefined) altro += verso;
    if (altro < 0 || altro >= dati.length) return no("al_bordo");
    return valida(
      cambiaDati(p, f.id, (ds) => ds.map((d, i) => (i === indice ? ds[altro]! : i === altro ? ds[indice]! : d))),
      prossimo,
    );
  };

// --------------------------------------------------------------------------------- le costanti comuni

// Le costanti comuni si indicano per posizione fra loro, come i dati di una funzione. Una costante comune è di ogni
// funzione che non ha un dato suo con lo stesso nome (un errore del controllo: lì le regole restano del dato suo).

const comuniDi = (p: Progetto): readonly Dato[] => p.shared_constants ?? [];
const esisteLaComune = (p: Progetto, indice: number) => Number.isInteger(indice) && indice >= 0 && indice < comuniDi(p).length;

/** Il progetto con le costanti comuni date; nessuna, e il campo non c'è. */
function conComuni(p: Progetto, comuni: readonly Dato[]): Progetto {
  const { shared_constants: _, ...senza } = p;
  return comuni.length === 0 ? senza : { ...senza, shared_constants: comuni };
}

/** Le funzioni a cui la costante comune `nome` appartiene: quelle senza un dato loro con lo stesso nome. */
const funzioniDellaComune = (p: Progetto, nome: string) => p.functions.filter((f) => !f.data.some((d) => d.name === nome));

/** La costante comune in quella posizione per intero; se il nome cambia, nello stesso passo le regole di ogni funzione a
 * cui appartiene, con ciò che restituisce, alle condizioni di `rinominaDato` (un nome solo, nessun'altra costante comune
 * col nome vecchio, il nome nuovo non già di un'altra costante comune, di un dato di una funzione o di una procedura o
 * funzione). */
export const cambiaComune =
  (indice: number, d: Dato): Operazione =>
  (p, prossimo) => {
    if (!esisteLaComune(p, indice)) return no("dato_inesistente");
    const comuni = comuniDi(p);
    const vecchio = comuni[indice]!.name;
    const altre = comuni.filter((_, i) => i !== indice);
    const occupato = [...altre, ...p.functions.flatMap((f) => f.data)].some((x) => x.name === d.name) || p.functions.some((f) => f.name === d.name);
    const regole = d.name !== vecchio && eUnaParolaSola(d.name) && !altre.some((x) => x.name === vecchio) && !occupato;
    const nelTesto = (t: string) => rinominaNelTesto(t, vecchio, d.name);
    const rinominato = regole ? funzioniDellaComune(p, vecchio).reduce((q, f) => cambiaDati(q, f.id, (x) => x, (b) => conTesti(b, nelTesto), nelTesto), p) : p;
    return valida(
      conComuni(rinominato, comuni.map((x, i) => (i === indice ? senzaVuoti(d) : x))),
      prossimo,
    );
  };

/** Toglie la costante comune; le regole che la usano restano, e mostrano l'errore. */
export const eliminaComune =
  (indice: number): Operazione =>
  (p, prossimo) => {
    if (!esisteLaComune(p, indice)) return no("dato_inesistente");
    return valida(
      conComuni(p, comuniDi(p).filter((_, i) => i !== indice)),
      prossimo,
    );
  };

/** La copia sotto l'originale, col primo nome libero fra le costanti comuni e i dati di ogni funzione. */
export const duplicaComune =
  (indice: number): Operazione =>
  (p, prossimo) => {
    if (!esisteLaComune(p, indice)) return no("dato_inesistente");
    const comuni = comuniDi(p);
    const d = comuni[indice]!;
    const copia = { ...d, name: nomeDellaCopia(new Set([...comuni, ...p.functions.flatMap((f) => f.data)].map((x) => x.name)), d.name) };
    return valida(
      conComuni(p, [...comuni.slice(0, indice + 1), copia, ...comuni.slice(indice + 1)]),
      prossimo,
    );
  };

/** Scambia la costante comune con la vicina sopra (`-1`) o sotto (`1`). */
export const spostaComune =
  (indice: number, verso: -1 | 1): Operazione =>
  (p, prossimo) => {
    if (!esisteLaComune(p, indice)) return no("dato_inesistente");
    const comuni = comuniDi(p);
    const altro = indice + verso;
    if (altro < 0 || altro >= comuni.length) return no("al_bordo");
    return valida(
      conComuni(p, comuni.map((d, i) => (i === indice ? comuni[altro]! : i === altro ? comuni[indice]! : d))),
      prossimo,
    );
  };

/** Il dato della funzione in quella posizione diventa una costante comune, in fondo (la casella «globale»): le regole non
 * cambiano. Che sia una costante, e che il nome non sia di un dato di un'altra funzione, lo dice il controllo. */
export const rendiComune =
  (indice: number, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (!esiste(f, indice)) return no("dato_inesistente");
    const d = f.data[indice]!;
    return valida(
      conComuni(cambiaDati(p, f.id, (dati) => dati.filter((_, i) => i !== indice)), [...comuniDi(p), d]),
      prossimo,
    );
  };

/** La costante comune in quella posizione diventa un dato della funzione (la scheda mostrata), in fondo ai suoi dati: le
 * altre funzioni che la usano mostrano l'errore. */
export const rendiDellaFunzione =
  (indice: number, funzione?: string): Operazione =>
  (p, prossimo) => {
    const f = funzioneDi(p, funzione);
    if (f === undefined || !esisteLaComune(p, indice)) return no("dato_inesistente");
    const d = comuniDi(p)[indice]!;
    return valida(
      conComuni(cambiaDati(p, f.id, (dati) => [...dati, d]), comuniDi(p).filter((_, i) => i !== indice)),
      prossimo,
    );
  };

/** Quante regole nominano la costante comune (con uno qualunque dei nomi dati), in ogni funzione a cui appartiene, contando
 * anche ciò che una funzione restituisce: la conferma prima di cancellarla le conta. */
export function regoleCheUsanoLaComune(p: Progetto, nome: string | readonly string[]): number {
  const nomi = typeof nome === "string" ? [nome] : nome;
  return p.functions.filter((f) => !f.data.some((d) => nomi.includes(d.name))).reduce((n, f) => n + regoleCheUsano(p, nomi, f.id), 0);
}

/** Gli `id` delle funzioni che usano la costante comune `nome`: quelle a cui appartiene con almeno una regola che la nomina. */
export function funzioniCheUsano(p: Progetto, nome: string): string[] {
  return funzioniDellaComune(p, nome)
    .filter((f) => regoleCheUsano(p, nome, f.id) > 0)
    .map((f) => f.id);
}

// ---------------------------------------------------------------------------------- i casi d'uso

// Ogni operazione sui casi riceve, per ultimo, l'`id` della funzione a cui i casi appartengono: senza, o col programma
// principale, i casi del progetto; con una procedura o una funzione, i suoi (eseguita da sola: una voce può non avere
// testo, o valere per ogni elemento). Una funzione che non c'è non ha casi.

/** I casi del programma principale, se `funzione` non c'è o è il programma; altrimenti quelli della funzione. */
function casiDi(p: Progetto, funzione?: string): readonly CasoDiUnaFunzione[] {
  const f = funzione === undefined ? undefined : p.functions.find((x) => x.id === funzione);
  if (funzione !== undefined && f === undefined) return [];
  return f === undefined || f.kind === "main" ? (p.test_cases ?? []) : (f.test_cases ?? []);
}
const esisteIlCaso = (p: Progetto, indice: number, funzione?: string) => Number.isInteger(indice) && indice >= 0 && indice < casiDi(p, funzione).length;

/** Il progetto coi casi dati, del programma o della funzione; senza casi il campo non c'è. Una voce senza testo nei casi
 * del programma la rifiuta il lettore. */
function conCasi(p: Progetto, casi: readonly CasoDiUnaFunzione[], funzione?: string): Progetto {
  const f = funzione === undefined ? undefined : p.functions.find((x) => x.id === funzione);
  if (f === undefined || f.kind === "main") {
    const { test_cases: _, ...senza } = p;
    return casi.length === 0 ? senza : { ...senza, test_cases: casi as readonly CasoDUso[] };
  }
  return {
    ...p,
    functions: p.functions.map((x) => {
      if (x.id !== f.id) return x;
      const { test_cases: _, ...senza } = x;
      return casi.length === 0 ? senza : { ...senza, test_cases: casi };
    }),
  };
}

/** Un caso senza i facoltativi vuoti (la descrizione vuota si omette). */
const casoPulito = (c: CasoDiUnaFunzione): CasoDiUnaFunzione => senzaVuoti({ ...c, description: c.description || undefined });

/** Il caso in quella posizione con l'atteso cambiato da `cambia`. */
function cambiaAtteso(p: Progetto, indice: number, prossimo: number, cambia: (a: Atteso) => Atteso, funzione?: string): Risultato {
  if (!esisteIlCaso(p, indice, funzione)) return no("caso_inesistente");
  return valida(
    conCasi(p, casiDi(p, funzione).map((c, i) => (i === indice ? { ...c, expected: cambia(c.expected) } : c)), funzione),
    prossimo,
  );
}

/** Un caso nuovo in fondo all'elenco. */
export const aggiungiCaso =
  (caso: CasoDiUnaFunzione, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (funzione !== undefined && funzioneDi(p, funzione) === undefined) return no("funzione_inesistente");
    if (nomeCheSiConfonde(p, caso.name, funzione)) return no("nome_del_caso_confuso");
    return valida(conCasi(p, [...casiDi(p, funzione), casoPulito(caso)], funzione), prossimo);
  };

/** Il caso in quella posizione per intero. Un nome che si confonde si rifiuta solo se è nuovo: il caso di un file che lo
 * ha già si cambia nel resto. */
export const cambiaCaso =
  (indice: number, caso: CasoDiUnaFunzione, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (!esisteIlCaso(p, indice, funzione)) return no("caso_inesistente");
    if (caso.name !== casiDi(p, funzione)[indice]!.name && nomeCheSiConfonde(p, caso.name, funzione)) return no("nome_del_caso_confuso");
    return valida(
      conCasi(p, casiDi(p, funzione).map((c, i) => (i === indice ? casoPulito(caso) : c)), funzione),
      prossimo,
    );
  };

export const eliminaCaso =
  (indice: number, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (!esisteIlCaso(p, indice, funzione)) return no("caso_inesistente");
    return valida(
      conCasi(p, casiDi(p, funzione).filter((_, i) => i !== indice), funzione),
      prossimo,
    );
  };

/** La copia del caso sotto l'originale, chiamata «nome (copia)», poi «nome (copia 2)», …: `copia` è la parola nella
 * lingua di chi chiama. */
export const duplicaCaso =
  (indice: number, copia: string, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (!esisteIlCaso(p, indice, funzione)) return no("caso_inesistente");
    const casi = casiDi(p, funzione);
    const c = casi[indice]!;
    const usati = new Set(casi.map((x) => x.name));
    let nome = `${c.name} (${copia})`;
    for (let n = 2; usati.has(nome); n++) nome = `${c.name} (${copia} ${n})`;
    if (nomeCheSiConfonde(p, nome, funzione)) return no("nome_del_caso_confuso");
    return valida(
      conCasi(p, [...casi.slice(0, indice + 1), { ...c, name: nome }, ...casi.slice(indice + 1)], funzione),
      prossimo,
    );
  };

/** Scambia il caso col vicino sopra (`-1`) o sotto (`1`): l'ordine dell'elenco e del file. */
export const spostaCaso =
  (indice: number, verso: -1 | 1, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (!esisteIlCaso(p, indice, funzione)) return no("caso_inesistente");
    const casi = casiDi(p, funzione);
    const altro = indice + verso;
    if (altro < 0 || altro >= casi.length) return no("al_bordo");
    return valida(
      conCasi(p, casi.map((c, i) => (i === indice ? casi[altro]! : i === altro ? casi[indice]! : c)), funzione),
      prossimo,
    );
  };

/** L'errore OTTENUTO nell'esito del caso diventa l'atteso (genere e blocco), al posto di quello di prima. Un errore
 * statico vuole l'output vuoto: il progetto non parte, e non scrive nulla. La memoria finita non si
 * attende: dipende dalla macchina e dal motore. */
export const attendiErrore =
  (indice: number, esito: EsitoDelCaso, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (esito.fuoriTappa) return no("fuori_tappa");
    const { error, static_error } = esito.ottenuto;
    if (error === undefined && static_error === undefined) return no("nessun_errore");
    if (error !== undefined && nonSiAttendono.has(error.code)) return no("non_deterministico");
    return cambiaAtteso(
      p,
      indice,
      prossimo,
      ({ error: _, static_error: __, ...a }) => (static_error !== undefined ? { ...a, output: "", static_error } : { ...a, error: error! }),
      funzione,
    );
  };

/** L'atteso senza errore né errore statico. */
export const togliErroreAtteso =
  (indice: number, funzione?: string): Operazione =>
  (p, prossimo) =>
    cambiaAtteso(p, indice, prossimo, ({ error: _, static_error: __, ...a }) => a, funzione);

/** Gli avvisi OTTENUTI nell'esito del caso diventano gli attesi; nessuno, e il campo non c'è. */
export const scriviAvvisi =
  (indice: number, esito: EsitoDelCaso, funzione?: string): Operazione =>
  (p, prossimo) => {
    if (esito.fuoriTappa) return no("fuori_tappa");
    const ottenuti = esito.ottenuto.warnings ?? [];
    return cambiaAtteso(p, indice, prossimo, ({ warnings: _, ...a }) => (ottenuti.length === 0 ? a : { ...a, warnings: ottenuti }), funzione);
  };

/** Quante regole della funzione (il programma principale, senza `funzione`) nominano il dato (con uno qualunque dei nomi
 * dati), contando anche ciò che la funzione restituisce: la conferma prima di cancellarlo le conta. */
export function regoleCheUsano(p: Progetto, nome: string | readonly string[], funzione?: string): number {
  const nomi = typeof nome === "string" ? [nome] : nome;
  const f = funzioneDi(p, funzione);
  if (f === undefined) return 0;
  const usa = (t: string) => nomi.some((x) => nomina(t, x));
  let n = 0;
  const visita = (b: Blocco): void => {
    if (testiPropri(b).some(usa)) n++;
    sottoblocchi(b).forEach(visita);
  };
  f.body.forEach(visita);
  if (f.end.return_value !== undefined && usa(f.end.return_value)) n++;
  return n;
}
