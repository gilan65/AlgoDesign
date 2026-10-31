// Le modifiche dei record del progetto (i tipi coi campi), come quelle dei dati: funzioni pure che passano dal lettore. Un
// record si indica per POSIZIONE fra i record, non per nome: due record possono avere lo stesso nome finché l'utente non lo
// corregge (il controllo lo dice).
//
// Il nome di un record non compare mai nel testo delle regole: rinominarlo cambia il tipo dei dati, delle costanti comuni e
// dei risultati che lo nominano. Il nome di un CAMPO sì (`a.voto`, `t[i].voto`, `promosso(a).voto`): si cambia per PAROLE
// dell'analizzatore, dove la parola è il campo dopo un punto e prima del punto (sopra gli indici di una tabella) c'è il
// nome di un dato di quel record che la funzione vede (suo, o una costante comune che nessun suo dato copre) o la chiamata
// di una funzione che lo restituisce; `voto` da solo, `voti.voto` di un altro record o `"a.voto"` restano. I valori che
// seguono l'ordine dei campi (il valore iniziale di un record o di una tabella, le voci dei casi di un parametro) seguono
// i campi spostati, aggiunti (senza valore) e tolti.
//
// Che cosa NON guarda: i nomi dei campi nell'output atteso di un caso (`→ .voto = 7`), che mostrano l'esito diverso; le
// regole di validità dei record (nome, campi doppi, lunghezze), che sono del controllo statico.

import { paroleTolleranti, type Parola } from "../espressioni/analizzatore";
import type { Dato, DefinizioneDelRecord, Funzione, Progetto } from "../progetto/modello";
import { nomeDellaCopia, valida, type Operazione, type Risultato } from "./operazioni";
import { conTesti, eUnaParolaSola } from "./rinomina";

const nessuno: Risultato = { ok: false, rifiuto: { motivo: "record_inesistente" } };

const recordDi = (p: Progetto): readonly DefinizioneDelRecord[] => p.records ?? [];
const esiste = (p: Progetto, indice: number) => Number.isInteger(indice) && indice >= 0 && indice < recordDi(p).length;

/** Il progetto coi record dati; nessuno, e il campo non c'è. */
function conRecord(p: Progetto, records: readonly DefinizioneDelRecord[]): Progetto {
  const { records: _, ...senza } = p;
  return records.length === 0 ? senza : { ...senza, records };
}

/** Il record senza le chiavi facoltative a `undefined` nei campi. */
const pulito = (r: DefinizioneDelRecord): DefinizioneDelRecord => ({
  name: r.name,
  fields: r.fields.map((c) => (c.max_length === undefined ? { name: c.name, type: c.type } : { name: c.name, type: c.type, max_length: c.max_length })),
});

/** Il nome di un record per un record nuovo: vuoto, come un dato nuovo (il controllo lo segnala solo dopo i campi aperti). */
export const recordNuovo: DefinizioneDelRecord = { name: "", fields: [{ name: "", type: "integer" }] };

/** Un record nuovo in fondo. */
export const aggiungiRecord =
  (r: DefinizioneDelRecord = recordNuovo): Operazione =>
  (p, prossimo) =>
    valida(conRecord(p, [...recordDi(p), pulito(r)]), prossimo);

const segno = (p: Parola | undefined, testo: string) => p?.genere === "segno" && p.testo === testo;

/** La posizione della parentesi che apre quella chiusa in `j` (`]` con `[`, `)` con `(`), anche con altre annidate. */
function apertaDa(ps: readonly Parola[], j: number, chiusa: string, aperta: string): number {
  let profondita = 0;
  for (; j >= 0; j--) {
    if (segno(ps[j], chiusa)) profondita++;
    else if (segno(ps[j], aperta) && --profondita === 0) return j;
  }
  return -1;
}

/** Ciò di cui la parola in posizione `k` è il campo: il nome del dato (`a` in `a.voto`, `t` in `t[i].voto`, sopra gli
 * indici fra parentesi quadre), o `f()` per il risultato della funzione `f` (`f(a).voto`, `f(x)[i].voto`); nessuno per il
 * campo di un campo. */
const baseDelCampo = (ps: readonly Parola[], k: number): string | undefined => {
  if (!segno(ps[k - 1], ".")) return undefined;
  let j = k - 2;
  while (j >= 0 && segno(ps[j], "]")) j = apertaDa(ps, j, "]", "[") - 1;
  const chiamata = j >= 0 && segno(ps[j], ")");
  if (chiamata) j = apertaDa(ps, j, ")", "(") - 1;
  return j >= 0 && ps[j]!.genere === "nome" && !segno(ps[j - 1], ".") ? (chiamata ? `${ps[j]!.testo}()` : ps[j]!.testo) : undefined;
};

/** Il testo con ogni campo di un dato di `basi` rinominato secondo `nomi` (vecchio → nuovo), in un passo solo: due campi
 * scambiati di nome si scambiano davvero. */
export function rinominaICampiNelTesto(testo: string, basi: ReadonlySet<string>, nomi: ReadonlyMap<string, string>): string {
  const ps = paroleTolleranti(testo);
  const c = Array.from(testo);
  let fuori = "";
  let fatto = 0;
  ps.forEach((x, k) => {
    const nuovo = x.genere === "nome" ? nomi.get(x.testo) : undefined;
    const base = baseDelCampo(ps, k);
    if (nuovo === undefined || base === undefined || !basi.has(base)) return;
    fuori += c.slice(fatto, x.da).join("") + nuovo;
    fatto = x.a;
  });
  return fuori + c.slice(fatto).join("");
}

/** I nomi dei dati del record `nome` che le regole della funzione vedono: i suoi e le costanti comuni che nessun suo dato
 * copre. */
function datiDelRecordIn(f: Funzione, comuni: readonly Dato[], nome: string): ReadonlySet<string> {
  const suoi = new Set(f.data.map((d) => d.name));
  const delRecord = (d: Dato) => d.type === "record" && d.record === nome;
  return new Set([...f.data.filter(delRecord), ...comuni.filter((d) => !suoi.has(d.name) && delRecord(d))].map((d) => d.name));
}

/**
 * Il record in quella posizione per intero, in un passo solo (la scheda conferma nome e campi insieme). `origini[k]` è la
 * posizione che il campo `k` aveva prima (assente per un campo nuovo): un campo con un'origine e un nome diverso è
 * rinominato, e con lui le regole che lo nominano (vedi in testa), se il nome nuovo si legge come un nome solo e non è di un
 * altro campo del record. Se il nome del record cambia, cambia anche nei dati, nelle costanti comuni e nei risultati che
 * lo nominano, se nessun altro record porta il nome vecchio e nessuno il nuovo.
 */
export const cambiaRecord =
  (indice: number, r: DefinizioneDelRecord, origini: readonly (number | undefined)[]): Operazione =>
  (p, prossimo) => {
    if (!esiste(p, indice)) return nessuno;
    const records = recordDi(p);
    const prima = records[indice]!;
    const altri = records.filter((_, i) => i !== indice);
    const rinominato = r.name !== prima.name && !altri.some((x) => x.name === prima.name || x.name === r.name);
    const daNome = rinominato ? r.name : prima.name;
    const tipo = <D extends Dato>(d: D): D => (rinominato && d.type === "record" && d.record === prima.name ? { ...d, record: r.name } : d);

    // I campi rinominati: dall'origine al nome nuovo, se valido e unico nel record.
    const nomi = new Map<string, string>();
    r.fields.forEach((c, k) => {
      const j = origini[k];
      const vecchio = j === undefined ? undefined : prima.fields[j]?.name;
      const unico = r.fields.filter((x) => x.name === c.name).length === 1;
      if (vecchio !== undefined && vecchio !== c.name && eUnaParolaSola(c.name) && unico) nomi.set(vecchio, c.name);
    });

    // I valori nell'ordine dei campi: il campo `k` prende il valore del campo da cui viene; uno nuovo nessuno. Un elenco
    // che non ha un valore per campo di prima resta com'è (il controllo dice già la lunghezza).
    const stessoOrdine = r.fields.length === prima.fields.length && origini.every((j, k) => j === k);
    const riordina = <T>(xs: readonly T[], vuoto: T): readonly T[] => (xs.length === prima.fields.length ? r.fields.map((_, k) => (origini[k] === undefined ? vuoto : xs[origini[k]!]!)) : xs);
    const conIValori = <D extends Dato>(d: D): D => {
      if (stessoOrdine || d.type !== "record" || d.record !== daNome || d.initial === undefined) return d;
      const v = d.initial;
      const elenco = (x: unknown): x is readonly string[] => Array.isArray(x) && x.every((y) => typeof y === "string");
      if (d.size === undefined) return elenco(v) ? { ...d, initial: riordina(v, "") } : d;
      if (Array.isArray(v)) return v.every(elenco) ? { ...d, initial: v.map((x) => riordina(x, "")) } : d;
      const each = (v as { each: unknown }).each;
      return elenco(each) ? { ...d, initial: { each: riordina(each, "") } } : d;
    };
    /** Le voci dei casi della funzione: quelle di un parametro del record (un gruppo di voci per campo, record dopo record)
     * riordinate al loro posto; un gruppo che non ha una voce per campo, o con le voci non una dopo l'altra (un caso
     * scritto apposta col dato sbagliato), resta com'è. */
    const conLeVoci = (f: Funzione): Funzione => {
      const parametri = f.data.filter((d) => d.type === "record" && d.record === daNome && d.parameter !== undefined && d.parameter !== "out");
      if (stessoOrdine || parametri.length === 0 || f.test_cases === undefined) return f;
      const test_cases = f.test_cases.map((c) => {
        const gruppi = new Map(
          parametri.flatMap((d) => {
            const posti = c.inputs.flatMap((v, i) => (v.data === d.name ? [i] : []));
            const n = d.size ?? 1;
            const contigue = posti.length > 0 && posti.at(-1)! - posti[0]! + 1 === posti.length;
            if (posti.length !== n * prima.fields.length || !contigue) return [];
            const suoi = posti.map((i) => c.inputs[i]!);
            const nuove = Array.from({ length: n }, (_, i) => riordina(suoi.slice(i * prima.fields.length, (i + 1) * prima.fields.length), { data: d.name })).flat();
            return [[d.name, nuove] as const];
          }),
        );
        const scritti = new Set<string>();
        const inputs = c.inputs.flatMap((v) => {
          const g = gruppi.get(v.data);
          if (g === undefined) return [v];
          if (scritti.has(v.data)) return [];
          scritti.add(v.data);
          return g;
        });
        return { ...c, inputs };
      });
      return { ...f, test_cases };
    };

    // Le funzioni che restituiscono il record (o una sua tabella): il campo del loro risultato, `f(a).voto`.
    const restituiscono = p.functions.filter((f) => f.return_type === "record" && f.return_record === prima.name && f.name !== undefined).map((f) => `${f.name}()`);
    const comuni = (p.shared_constants ?? []).map(tipo).map(conIValori);
    const functions = p.functions.map((f) => {
      const g: Funzione = conLeVoci({
        ...f,
        data: f.data.map(tipo).map(conIValori),
        ...(rinominato && f.return_type === "record" && f.return_record === prima.name ? { return_record: r.name } : {}),
      });
      if (nomi.size === 0) return g;
      const basi = new Set([...datiDelRecordIn(g, comuni, daNome), ...restituiscono]);
      if (basi.size === 0) return g;
      const nelTesto = (t: string) => rinominaICampiNelTesto(t, basi, nomi);
      return {
        ...g,
        body: g.body.map((b) => conTesti(b, nelTesto)),
        end: g.end.return_value === undefined ? g.end : { ...g.end, return_value: nelTesto(g.end.return_value) },
      };
    });
    const { shared_constants: _, ...senza } = p;
    const conLeComuni = comuni.length === 0 ? senza : { ...senza, shared_constants: comuni };
    return valida(
      conRecord({ ...conLeComuni, functions }, records.map((x, i) => (i === indice ? pulito(r) : x))),
      prossimo,
    );
  };

/** Toglie il record; i dati che lo nominano restano, e mostrano l'errore del record che non c'è. */
export const eliminaRecord =
  (indice: number): Operazione =>
  (p, prossimo) =>
    esiste(p, indice) ? valida(conRecord(p, recordDi(p).filter((_, i) => i !== indice)), prossimo) : nessuno;

/** La copia sotto l'originale, col primo nome libero fra i record, i dati e le procedure e funzioni. */
export const duplicaRecord =
  (indice: number): Operazione =>
  (p, prossimo) => {
    if (!esiste(p, indice)) return nessuno;
    const records = recordDi(p);
    const usati = new Set([
      ...records.map((x) => x.name),
      ...(p.shared_constants ?? []).map((d) => d.name),
      ...p.functions.flatMap((f) => [...f.data.map((d) => d.name), ...(f.name === undefined ? [] : [f.name])]),
    ]);
    const copia = { ...records[indice]!, name: nomeDellaCopia(usati, records[indice]!.name) };
    return valida(conRecord(p, [...records.slice(0, indice + 1), copia, ...records.slice(indice + 1)]), prossimo);
  };

/** Scambia il record col vicino sopra (`-1`) o sotto (`1`). */
export const spostaRecord =
  (indice: number, verso: -1 | 1): Operazione =>
  (p, prossimo) => {
    if (!esiste(p, indice)) return nessuno;
    const records = recordDi(p);
    const altro = indice + verso;
    if (altro < 0 || altro >= records.length) return { ok: false, rifiuto: { motivo: "al_bordo" } };
    return valida(conRecord(p, records.map((x, i) => (i === indice ? records[altro]! : i === altro ? records[indice]! : x))), prossimo);
  };

/** Quanti dati (costanti comuni e parametri compresi) e risultati di funzione hanno il tipo del record `nome`: la conferma
 * prima di eliminarlo li conta. */
export function usiDelRecord(p: Progetto, nome: string): number {
  const delRecord = (d: Dato) => d.type === "record" && d.record === nome;
  return (p.shared_constants ?? []).filter(delRecord).length + p.functions.reduce((n, f) => n + f.data.filter(delRecord).length + (f.return_type === "record" && f.return_record === nome ? 1 : 0), 0);
}
