// L'importazione di procedure e funzioni da un altro progetto (una libreria, o qualunque progetto): un'operazione pura che
// copia nel progetto le procedure e funzioni scelte, ciò che chiamano (anche passando per altre) e le costanti comuni che
// usano, in un passo solo. La copia è del progetto: nessun legame resta con la sorgente.
//
// Che cosa entra lo dice il riepilogo (`riepilogoDellImportazione`), che l'interfaccia mostra prima di confermare e che
// l'operazione rifà sul progetto a cui si applica:
// - IDENTICA: nel programma c'è già una procedura o funzione con lo stesso nome e lo stesso contenuto (senza gli `id`, i
//   punti d'interruzione e i casi d'uso), e ciò che chiama e le costanti che usa sono identiche anche loro (una costante:
//   lo stesso dato). Non entra, e ciò che entra usa quella del programma.
// - CONFLITTO: il nome c'è già nel programma, diverso. Della stessa specie (una procedura o funzione, una costante comune)
//   ci sono tre scelte: rinominare quella che viene importata (la predefinita, col primo nome libero `_2`), sostituire
//   quella del programma (al suo posto; i suoi casi d'uso sono eliminati; le sue chiamate vanno alla nuova), non
//   importarla (si usa quella del programma). Di un'altra specie (la funzione `somma` e il dato `somma`) solo la rinomina.
// - I RECORD che ciò che entra usa (il tipo dei suoi dati e dei risultati, le costanti di tipo record) entrano con lui,
//   senza scelte, come la dimensione di un vettore: un record identico a uno del programma (stesso nome e stessi campi)
//   non entra; con il nome già usato nel programma (un altro record, o un'altra cosa) entra col primo nome libero (`_2`),
//   e i dati, i risultati e le costanti che entrano lo seguono; il programma non cambia. Una procedura, una funzione o una
//   costante è identica solo coi suoi record identici. Un tipo che non corrisponde lo dice il controllo.
// - Si scende solo da ciò che entra: ciò che chiama soltanto un'identica o una che non si importa non entra.
// - Le rinomine seguono nei testi di ciò che entra (le chiamate, i salti, i nomi delle costanti); il programma non cambia.
// - Ciò che entra va in fondo, nell'ordine della sorgente (una sostituita al posto di quella del programma), con `id` nuovi
//   sullo stampo della copia di una funzione; gli attesi dei suoi casi nominano i blocchi nuovi (o quelli dell'identica del
//   programma); un atteso su un blocco che non entra va su un `id` mai usato, come quello di un blocco cancellato. I punti
//   d'interruzione non entrano, i casi d'uso solo se chiesti; mai il programma principale della sorgente né i suoi casi.
//
// Che cosa NON guarda: la validità del risultato, che è del controllo (un dato interno che ha il nome di una costante o di
// una funzione del programma entra com'è, e una sostituita con un'altra firma lascia chiamate sbagliate: il riepilogo lo
// dice); gli attesi dei casi del programma sui blocchi di una funzione sostituita. Nella sorgente, di due procedure o
// funzioni con lo stesso nome si segue la prima, come il controllo, e la seconda non si spunta (`omonimeDopoLaPrima`).
// Le opzioni del progetto (le cifre dei reali, il carattere di riempimento) restano quelle del programma: dove sono diverse
// da quelle della sorgente lo dice `opzioniDiverse`, perché un caso importato può dare un altro risultato.

import { nomeValidoNelFile } from "../controllo/controllo";
import { opzioniPredefinite, type Blocco, type Dato, type DefinizioneDelRecord, type Funzione, type Progetto } from "../progetto/modello";
import { conLaFine, ogniBlocco, rinominaLaChiamata } from "./funzioni";
import { conIdNuovi, idDelBlocco, idUsati, primoLibero, sottoblocchi } from "./identificatori";
import { nomeDellaCopia, valida, type Operazione, type Risultato } from "./operazioni";
import { conTestiPropri, nomiDelTesto, rinominaNelTesto, testiPropri } from "./rinomina";

/** Che cosa fare di un conflitto. */
export type Scelta = { readonly come: "rinomina"; readonly nome: string } | { readonly come: "sostituisci" } | { readonly come: "salta" };

/** Perché entra: è fra le scelte, la chiama una procedura o funzione che entra, la usa (una costante). `da` è il suo nome
 * nella sorgente. */
export type Perche = { readonly come: "scelta" } | { readonly come: "chiamata" | "usata"; readonly da: string };

/** Una voce del riepilogo: una procedura, una funzione, una costante comune o un record della sorgente, raggiunto dalle
 * scelte. */
export interface VoceDellImportazione {
  /** `f:<id nella sorgente>` per una procedura o funzione, `c:<nome>` per una costante, `r:<nome>` per un record: la
   * chiave delle scelte (un record non ne ha). */
  readonly chiave: string;
  readonly genere: "procedure" | "function" | "constant" | "record";
  readonly nome: string;
  readonly perche: Perche;
  /** `rinominato` solo per un record: entra col nome `proposto`, senza scelte. */
  readonly stato: "nuova" | "identica" | "conflitto" | "rinominato";
  /** I casi d'uso che ha nella sorgente (non per una costante). */
  readonly casi?: number;
  /** Solo per un conflitto: con un nome della stessa specie, o di un'altra (allora si può solo rinominare). */
  readonly specie?: "stessa" | "altra";
  /** Solo per un conflitto: il nome proposto per la rinomina, libero nel programma e in ciò che entra; per un record
   * rinominato, il suo nome nel programma. */
  readonly proposto?: string;
  /** Solo per un conflitto: la scelta che vale (la predefinita è la rinomina col nome proposto). */
  readonly scelta?: Scelta;
  /** Solo per un conflitto con una procedura o funzione del programma: genere, risultato o parametri diversi. */
  readonly firmaDiversa?: boolean;
  /** Solo per un conflitto con una procedura o funzione del programma: i suoi casi d'uso, eliminati se la si sostituisce. */
  readonly casiEliminati?: number;
}

/** Un dato interno di ciò che entra col nome di una costante comune o di una procedura o funzione del programma. */
export interface DatoCheUrta {
  readonly funzione: string;
  readonly dato: string;
  readonly con: "costante" | "funzione";
}

export interface Riepilogo {
  /** Le procedure e funzioni nell'ordine della sorgente, poi le costanti comuni e i record nell'ordine della sorgente. */
  readonly voci: readonly VoceDellImportazione[];
  readonly datiCheUrtano: readonly DatoCheUrta[];
}

export interface Importazione {
  /** Con i casi d'uso di ciò che entra. */
  readonly conCasi: boolean;
  /** Le scelte sui conflitti, per chiave; quelle che mancano sono la rinomina col nome proposto. */
  readonly scelte?: ReadonlyMap<string, Scelta>;
}

/** Il contenuto senza ciò che non conta per «identica»: gli `id`, i punti d'interruzione, i casi d'uso. */
const contenuto = (x: unknown): string => JSON.stringify(x, (k, v) => (k === "id" || k === "breakpoint" || k === "test_cases" ? undefined : v));

/** Ciò che chi chiama vede di una procedura o funzione: genere, risultato, parametri (senza i nomi). */
const firma = (f: Funzione): string =>
  JSON.stringify([f.kind, f.return_type, f.return_size, f.return_max_length, f.data.filter((d) => d.parameter !== undefined).map((d) => [d.type, d.size, d.max_length, d.parameter])]);

/** I blocchi in ordine di lettura, coi blocchi che contengono. */
const inOrdine = (bs: readonly Blocco[]): Blocco[] => bs.flatMap((b) => [b, ...inOrdine(sottoblocchi(b))]);

/** I testi di una funzione che sono regole, compresa ciò che restituisce. */
const testiDi = (f: Funzione): string[] => [...inOrdine(f.body).flatMap((b) => testiPropri(b)), ...(f.end.return_value !== undefined ? [f.end.return_value] : [])];

interface Analisi {
  readonly riepilogo: Riepilogo;
  /** Le procedure e funzioni che entrano, nell'ordine della sorgente, con la loro voce. */
  readonly funzioni: readonly { readonly f: Funzione; readonly voce: VoceDellImportazione }[];
  readonly costanti: readonly { readonly c: Dato; readonly voce: VoceDellImportazione }[];
  /** I record che entrano, nell'ordine della sorgente, col loro nome nel programma. */
  readonly records: readonly { readonly r: DefinizioneDelRecord; readonly nome: string }[];
  /** Le identiche della sorgente con quella del programma che le vale. */
  readonly identiche: ReadonlyMap<Funzione, Funzione>;
  /** I nomi del programma: procedure e funzioni, dati di ogni funzione, costanti comuni, record. */
  readonly nomiDelProgramma: ReadonlySet<string>;
}

/** Le procedure e funzioni della sorgente con il nome di una che viene prima, per `id`: si segue la prima, come il
 * controllo, e queste non si spuntano (la sorgente è già invalida: il controllo dice `function_name_in_use`). */
export function omonimeDopoLaPrima(s: Progetto): ReadonlySet<string> {
  const visti = new Set<string>();
  const fuori = new Set<string>();
  for (const f of s.functions)
    if (f.kind !== "main") {
      if (visti.has(f.name!)) fuori.add(f.id);
      visti.add(f.name!);
    }
  return fuori;
}

function analizza(p: Progetto, s: Progetto, spuntate: readonly string[], scelte: ReadonlyMap<string, Scelta>): Analisi | undefined {
  const sotto = s.functions.filter((f) => f.kind !== "main");
  const omonime = omonimeDopoLaPrima(s);
  if (spuntate.some((id) => omonime.has(id) || !sotto.some((f) => f.id === id))) return undefined;
  const comuni = s.shared_constants ?? [];
  const perNome = new Map<string, Funzione>();
  for (const f of sotto) if (!perNome.has(f.name!)) perNome.set(f.name!, f);
  // Ciò che una funzione chiama e le costanti che usa, coi suoi testi letti una volta sola: la finestra rifà l'analisi a
  // ogni tasto, e una lettura per ogni testo e ogni nome cercato costa secondi su una libreria di cento funzioni.
  const letti = new Map<Funzione, { readonly chiamate: Funzione[]; readonly usate: Dato[] }>();
  const nomiDi = (f: Funzione) => {
    const giaLetti = letti.get(f);
    if (giaLetti !== undefined) return giaLetti;
    const testi = testiDi(f).map(nomiDelTesto);
    const salti = new Set(inOrdine(f.body).flatMap((b) => (b.kind === "call" ? [b.callee] : [])));
    const nuovi = {
      chiamate: [...perNome.values()].filter((g) => salti.has(g.name!) || testi.some((t) => t.chiamati.has(g.name!))),
      usate: comuni.filter((c, i) => comuni.findIndex((x) => x.name === c.name) === i && testi.some((t) => t.dati.has(c.name))),
    };
    letti.set(f, nuovi);
    return nuovi;
  };
  const chiamate = (f: Funzione): Funzione[] => nomiDi(f).chiamate;
  const usate = (f: Funzione): Dato[] => nomiDi(f).usate;

  const delProgramma = new Map<string, Funzione>();
  for (const f of p.functions) if (f.kind !== "main" && !delProgramma.has(f.name!)) delProgramma.set(f.name!, f);
  const comuniDelProgramma = new Map<string, Dato>();
  for (const c of p.shared_constants ?? []) if (!comuniDelProgramma.has(c.name)) comuniDelProgramma.set(c.name, c);
  const datiDelProgramma = new Set(p.functions.flatMap((f) => f.data.map((d) => d.name)));
  const recordDelProgramma = new Map<string, DefinizioneDelRecord>();
  for (const r of p.records ?? []) if (!recordDelProgramma.has(r.name)) recordDelProgramma.set(r.name, r);
  const nomiDelProgramma = new Set([...delProgramma.keys(), ...datiDelProgramma, ...comuniDelProgramma.keys(), ...recordDelProgramma.keys()]);

  // I record della sorgente (di due con lo stesso nome, il primo, come il controllo) e quelli che un dato, un risultato o
  // una costante nomina.
  const recordDellaSorgente = new Map<string, DefinizioneDelRecord>();
  for (const r of s.records ?? []) if (!recordDellaSorgente.has(r.name)) recordDellaSorgente.set(r.name, r);
  const delDato = (d: Dato): string[] => (d.type === "record" && d.record !== undefined && recordDellaSorgente.has(d.record) ? [d.record] : []);
  const recordDi = (f: Funzione): string[] => [...f.data.flatMap(delDato), ...(f.return_type === "record" && f.return_record !== undefined && recordDellaSorgente.has(f.return_record) ? [f.return_record] : [])];
  const recordIdentico = (nome: string) => recordDelProgramma.has(nome) && contenuto(recordDelProgramma.get(nome)) === contenuto(recordDellaSorgente.get(nome));

  // Identiche come punto fisso: si parte da quelle uguali per contenuto e si toglie chi chiama o usa una non identica.
  const costantiIdentiche = new Set(comuni.filter((c) => comuniDelProgramma.has(c.name) && contenuto(comuniDelProgramma.get(c.name)) === contenuto(c) && delDato(c).every(recordIdentico)));
  const identiche = new Set([...perNome.values()].filter((f) => delProgramma.has(f.name!) && contenuto(delProgramma.get(f.name!)) === contenuto(f) && recordDi(f).every(recordIdentico)));
  for (let cambiato = true; cambiato; ) {
    cambiato = false;
    for (const f of identiche)
      if (chiamate(f).some((g) => !identiche.has(g)) || usate(f).some((c) => !costantiIdentiche.has(c))) {
        identiche.delete(f);
        cambiato = true;
      }
  }

  const statoDellaFunzione = (f: Funzione) =>
    identiche.has(f) ? ({ stato: "identica" } as const) : delProgramma.has(f.name!) ? ({ stato: "conflitto", specie: "stessa" } as const) : nomiDelProgramma.has(f.name!) ? ({ stato: "conflitto", specie: "altra" } as const) : ({ stato: "nuova" } as const);
  const statoDellaCostante = (c: Dato) =>
    costantiIdentiche.has(c) ? ({ stato: "identica" } as const) : comuniDelProgramma.has(c.name) ? ({ stato: "conflitto", specie: "stessa" } as const) : nomiDelProgramma.has(c.name) ? ({ stato: "conflitto", specie: "altra" } as const) : ({ stato: "nuova" } as const);
  /** La scelta che vale: quella data, se ammessa per la specie, o la rinomina col nome proposto. */
  const sceltaPer = (chiave: string, specie: "stessa" | "altra", proposto: string): Scelta => {
    const data = scelte.get(chiave);
    return data !== undefined && (specie === "stessa" || data.come === "rinomina") ? data : { come: "rinomina", nome: proposto };
  };
  /** Entra una nuova, o un conflitto che non si salta. */
  const entra = (st: { readonly stato: string; readonly specie?: "stessa" | "altra" }, chiave: string): boolean =>
    st.stato === "nuova" || (st.stato === "conflitto" && sceltaPer(chiave, st.specie!, "").come !== "salta");

  // La visita: dalle scelte, in larghezza; si scende solo da ciò che entra.
  const raggiunte = new Map<Funzione, Perche>();
  const costantiRaggiunte = new Map<Dato, Perche>();
  const coda = sotto.filter((f) => spuntate.includes(f.id));
  for (const f of coda) raggiunte.set(f, { come: "scelta" });
  for (let i = 0; i < coda.length; i++) {
    const f = coda[i]!;
    if (!entra(statoDellaFunzione(f), `f:${f.id}`)) continue;
    for (const g of chiamate(f))
      if (!raggiunte.has(g)) {
        raggiunte.set(g, { come: "chiamata", da: f.name! });
        coda.push(g);
      }
    for (const c of usate(f)) if (!costantiRaggiunte.has(c)) costantiRaggiunte.set(c, { come: "usata", da: f.name! });
  }

  // I nomi proposti: liberi fra i nomi del programma e quelli di ciò che è raggiunto (anche i dati interni).
  const funzioniRaggiunte = sotto.filter((f) => raggiunte.has(f));
  const comuniRaggiunte = comuni.filter((c) => costantiRaggiunte.has(c));
  const usati = new Set([
    ...nomiDelProgramma,
    ...funzioniRaggiunte.flatMap((f) => [f.name!, ...f.data.map((d) => d.name)]),
    ...comuniRaggiunte.map((c) => c.name),
    ...recordDellaSorgente.keys(),
  ]);
  const proponi = (nome: string): string => {
    const proposto = nomeDellaCopia(usati, nome);
    usati.add(proposto);
    return proposto;
  };

  const funzioni = funzioniRaggiunte.map((f) => {
    const chiave = `f:${f.id}`;
    const st = statoDellaFunzione(f);
    const base = { chiave, genere: f.kind as "procedure" | "function", nome: f.name!, perche: raggiunte.get(f)!, stato: st.stato, casi: f.test_cases?.length ?? 0 };
    if (st.stato !== "conflitto") return { f, voce: base as VoceDellImportazione };
    const proposto = proponi(f.name!);
    const g = st.specie === "stessa" ? delProgramma.get(f.name!)! : undefined;
    const voce: VoceDellImportazione = {
      ...base,
      specie: st.specie,
      proposto,
      scelta: sceltaPer(chiave, st.specie, proposto),
      ...(g !== undefined ? { firmaDiversa: firma(g) !== firma(f), casiEliminati: g.test_cases?.length ?? 0 } : {}),
    };
    return { f, voce };
  });
  const costanti = comuniRaggiunte.map((c) => {
    const chiave = `c:${c.name}`;
    const st = statoDellaCostante(c);
    const base = { chiave, genere: "constant" as const, nome: c.name, perche: costantiRaggiunte.get(c)!, stato: st.stato };
    if (st.stato !== "conflitto") return { c, voce: base as VoceDellImportazione };
    const proposto = proponi(c.name);
    return { c, voce: { ...base, specie: st.specie, proposto, scelta: sceltaPer(chiave, st.specie, proposto) } as VoceDellImportazione };
  });

  const entrano = funzioni.filter((x) => entra(x.voce, x.voce.chiave));
  const costantiCheEntrano = costanti.filter((x) => entra(x.voce, x.voce.chiave));
  // I record di ciò che entra, nell'ordine della sorgente, con chi li usa per primo.
  const usatoDa = new Map<string, string>();
  for (const { f } of entrano) for (const r of recordDi(f)) if (!usatoDa.has(r)) usatoDa.set(r, f.name!);
  for (const { c } of costantiCheEntrano) for (const r of delDato(c)) if (!usatoDa.has(r)) usatoDa.set(r, c.name);
  const records = [...recordDellaSorgente.values()].flatMap((r) => {
    const da = usatoDa.get(r.name);
    if (da === undefined) return [];
    const base = { chiave: `r:${r.name}`, genere: "record" as const, nome: r.name, perche: { come: "usata" as const, da } };
    if (recordIdentico(r.name)) return [{ r, voce: { ...base, stato: "identica" } as VoceDellImportazione }];
    if (!nomiDelProgramma.has(r.name)) return [{ r, voce: { ...base, stato: "nuova" } as VoceDellImportazione }];
    return [{ r, voce: { ...base, stato: "rinominato", proposto: proponi(r.name) } as VoceDellImportazione }];
  });
  const datiCheUrtano: DatoCheUrta[] = entrano.flatMap(({ f }) =>
    f.data.flatMap((d): DatoCheUrta[] => (comuniDelProgramma.has(d.name) ? [{ funzione: f.name!, dato: d.name, con: "costante" }] : delProgramma.has(d.name) ? [{ funzione: f.name!, dato: d.name, con: "funzione" }] : [])),
  );
  const identicheDelProgramma = new Map([...identiche].map((f) => [f, delProgramma.get(f.name!)!] as const));
  return {
    riepilogo: { voci: [...funzioni.map((x) => x.voce), ...costanti.map((x) => x.voce), ...records.map((x) => x.voce)], datiCheUrtano },
    funzioni: entrano,
    costanti: costantiCheEntrano,
    records: records.filter((x) => x.voce.stato !== "identica").map((x) => ({ r: x.r, nome: x.voce.proposto ?? x.r.name })),
    identiche: identicheDelProgramma,
    nomiDelProgramma,
  };
}

/** Che cosa entrerebbe nel progetto `p` importando da `sorgente` le procedure e funzioni con gli `id` spuntati, con quelle
 * scelte sui conflitti: le voci e i dati interni che urtano. Gli `id` che non sono di una procedura o funzione della
 * sorgente non contano. */
export function riepilogoDellImportazione(p: Progetto, sorgente: Progetto, spuntate: readonly string[], scelte: ReadonlyMap<string, Scelta> = new Map()): Riepilogo {
  const omonime = omonimeDopoLaPrima(sorgente);
  const valide = spuntate.filter((id) => !omonime.has(id) && sorgente.functions.some((f) => f.id === id && f.kind !== "main"));
  return analizza(p, sorgente, valide, scelte)!.riepilogo;
}

/** Un'opzione del progetto con un valore diverso nel programma e nella sorgente (contano i predefiniti). */
export type OpzioneDiversa =
  | { readonly opzione: "real_decimals"; readonly programma: number; readonly sorgente: number }
  | { readonly opzione: "fill_character"; readonly programma: string; readonly sorgente: string }
  | { readonly opzione: "call_stack_limit"; readonly programma: number; readonly sorgente: number };

/** Le opzioni che il programma `p` e la sorgente hanno diverse: dopo l'importazione valgono quelle del programma, e un caso
 * importato scritto con quelle della sorgente può non essere raggiunto. */
export function opzioniDiverse(p: Progetto, sorgente: Progetto): OpzioneDiversa[] {
  const decimali = (x: Progetto) => x.options?.real_decimals ?? opzioniPredefinite.real_decimals;
  const riempimento = (x: Progetto) => x.options?.fill_character ?? opzioniPredefinite.fill_character;
  const pila = (x: Progetto) => x.options?.call_stack_limit ?? opzioniPredefinite.call_stack_limit;
  return [
    ...(decimali(p) !== decimali(sorgente) ? [{ opzione: "real_decimals", programma: decimali(p), sorgente: decimali(sorgente) } as const] : []),
    ...(riempimento(p) !== riempimento(sorgente) ? [{ opzione: "fill_character", programma: riempimento(p), sorgente: riempimento(sorgente) } as const] : []),
    ...(pila(p) !== pila(sorgente) ? [{ opzione: "call_stack_limit", programma: pila(p), sorgente: pila(sorgente) } as const] : []),
  ];
}

/** L'importazione da `sorgente` delle procedure e funzioni con gli `id` spuntati (vedi in testa), in un passo solo. */
export const importa =
  (sorgente: Progetto, spuntate: readonly string[], importazione: Importazione): Operazione =>
  (p, prossimo) => {
    const scelte = importazione.scelte ?? new Map<string, Scelta>();
    const a = analizza(p, sorgente, spuntate, scelte);
    if (a === undefined) return { ok: false, rifiuto: { motivo: "funzione_inesistente" } };
    // Non entra niente (tutto identico o non importato): il progetto com'è, che la cronologia non conta come passo.
    if (a.funzioni.length === 0 && a.costanti.length === 0 && a.records.length === 0) return { ok: true, progetto: p, prossimo };
    const voci = [...a.funzioni.map((x) => x.voce), ...a.costanti.map((x) => x.voce)];
    for (const v of voci) if (v.specie === "altra" && scelte.has(v.chiave) && scelte.get(v.chiave)!.come !== "rinomina") return { ok: false, rifiuto: { motivo: "scelta_non_ammessa", chiave: v.chiave } };

    // I nomi finali: quelli scelti per la rinomina, liberi e diversi da ogni altro nome del progetto che ne esce.
    const finale = (v: VoceDellImportazione): string => (v.scelta?.come === "rinomina" ? v.scelta.nome : v.nome);
    const usati = new Set([
      ...a.nomiDelProgramma,
      ...a.funzioni.flatMap((x) => x.f.data.map((d) => d.name)),
      ...voci.filter((v) => v.scelta?.come !== "rinomina").map((v) => v.nome),
      ...a.records.map((x) => x.nome),
    ]);
    for (const v of voci) {
      if (v.scelta?.come !== "rinomina") continue;
      const nome = v.scelta.nome;
      const rifiuto: Risultato | undefined = !nomeValidoNelFile(nome)
        ? { ok: false, rifiuto: { motivo: "nome_non_valido", nome } }
        : usati.has(nome)
          ? { ok: false, rifiuto: { motivo: "nome_in_uso", nome } }
          : undefined;
      if (rifiuto !== undefined) return rifiuto;
      usati.add(nome);
    }
    const rinominate = (xs: readonly { voce: VoceDellImportazione }[]) => xs.flatMap(({ voce }) => (voce.scelta?.come === "rinomina" ? [[voce.nome, voce.scelta.nome] as const] : []));
    const funzioniRinominate = rinominate(a.funzioni);
    const costantiRinominate = rinominate(a.costanti);
    const nelTesto = (t: string): string => {
      let fuori = t;
      for (const [vecchio, nuovo] of funzioniRinominate) fuori = rinominaLaChiamata(fuori, vecchio, nuovo);
      for (const [vecchio, nuovo] of costantiRinominate) fuori = rinominaNelTesto(fuori, vecchio, nuovo);
      return fuori;
    };
    const callee = new Map(funzioniRinominate);
    // Il tipo di un dato, di un risultato o di una costante che entra segue il record rinominato.
    const nomeDelRecord = new Map(a.records.filter((x) => x.nome !== x.r.name).map((x) => [x.r.name, x.nome] as const));
    const conIlRecord = <D extends Dato>(d: D): D => (d.type === "record" && d.record !== undefined && nomeDelRecord.has(d.record) ? { ...d, record: nomeDelRecord.get(d.record)! } : d);

    // Gli `id` nuovi, sullo stampo della copia di una funzione; la mappa dalla sorgente vale per gli attesi dei casi.
    let n = Math.max(prossimo, primoLibero(p));
    const idPresi = new Set(idUsati(p));
    let f = 1 + [...idPresi].reduce((m, id) => Math.max(m, Number(/^f([1-9]\d*)$/.exec(id)?.[1] ?? 0)), 0);
    const idDellaFunzione = (): string => {
      while (idPresi.has(`f${f}`)) f++;
      idPresi.add(`f${f}`);
      return `f${f++}`;
    };
    const mappa = new Map<string, string>();
    for (const [x, delProgramma] of a.identiche) {
      mappa.set(x.id, delProgramma.id);
      mappa.set(x.end.id, delProgramma.end.id);
      const nuovi = inOrdine(delProgramma.body);
      inOrdine(x.body).forEach((b, i) => mappa.set(b.id, nuovi[i]!.id));
    }
    const copie = a.funzioni.map(({ f: x, voce }) => {
      const body = x.body.map((b) => {
        const copia = conIdNuovi(b, n);
        n = copia.prossimo;
        return copia.blocco;
      });
      const nuovi = inOrdine(body);
      inOrdine(x.body).forEach((b, i) => mappa.set(b.id, nuovi[i]!.id));
      const fine = idDelBlocco(n++);
      mappa.set(x.end.id, fine);
      const id = idDellaFunzione();
      mappa.set(x.id, id);
      const { test_cases: _casi, ...senzaCasi } = x;
      const { breakpoint: _punto, ...end } = x.end;
      const copia = conLaFine(
        ogniBlocco(
          {
            ...senzaCasi,
            id,
            name: finale(voce),
            data: senzaCasi.data.map(conIlRecord),
            ...(senzaCasi.return_type === "record" && senzaCasi.return_record !== undefined && nomeDelRecord.has(senzaCasi.return_record) ? { return_record: nomeDelRecord.get(senzaCasi.return_record)! } : {}),
            body,
            end: { ...end, id: fine },
          },
          (b) => {
            const { breakpoint: _, ...c } = conTestiPropri(b, nelTesto);
            return c.kind === "call" && callee.has(c.callee) ? { ...c, callee: callee.get(c.callee)! } : (c as Blocco);
          },
        ),
        nelTesto,
      );
      return { x, voce, copia };
    });
    // Un errore atteso su un blocco che non entra va su un `id` mai usato, dopo quelli di ciò che entra. Gli avvisi attesi
    // sono del progetto intero: di quelli della sorgente restano solo gli avvisi sui blocchi e le funzioni che entrano.
    const fuori = new Map<string, string>();
    const nuovo = (block: string): string => {
      if (block === "") return block;
      const m = mappa.get(block) ?? fuori.get(block);
      if (m !== undefined) return m;
      const libero = idDelBlocco(n++);
      fuori.set(block, libero);
      return libero;
    };
    const conCasi = copie.map(({ x, voce, copia }) => {
      if (!importazione.conCasi || x.test_cases === undefined) return { voce, copia };
      const test_cases = x.test_cases.map((c) => {
        const { error, static_error, warnings, ...resto } = c.expected;
        const avvisi = warnings?.filter((w) => mappa.has(w.block)).map((w) => ({ ...w, block: mappa.get(w.block)! }));
        return {
          ...c,
          expected: {
            ...resto,
            ...(error && { error: { ...error, block: nuovo(error.block) } }),
            ...(static_error && { static_error: { ...static_error, block: nuovo(static_error.block) } }),
            ...(avvisi !== undefined && avvisi.length > 0 && { warnings: avvisi }),
          },
        };
      });
      return { voce, copia: { ...copia, test_cases } };
    });

    // Una sostituita prende il posto della prima del programma col suo nome; le altre in fondo.
    const alPosto = new Map(conCasi.filter((x) => x.voce.scelta?.come === "sostituisci").map((x) => [x.voce.nome, x.copia] as const));
    const functions = p.functions.map((x) => {
      if (x.kind === "main" || !alPosto.has(x.name!)) return x;
      const copia = alPosto.get(x.name!)!;
      alPosto.delete(x.name!);
      return copia;
    });
    functions.push(...conCasi.filter((x) => x.voce.scelta?.come !== "sostituisci").map((x) => x.copia));
    const costantiAlPosto = new Map(a.costanti.filter((x) => x.voce.scelta?.come === "sostituisci").map((x) => [x.c.name, x.c] as const));
    const costanti = (p.shared_constants ?? []).map((c) => {
      const nuova = costantiAlPosto.get(c.name);
      costantiAlPosto.delete(c.name);
      return nuova ?? c;
    });
    costanti.push(...a.costanti.filter((x) => x.voce.scelta?.come !== "sostituisci").map((x) => conIlRecord({ ...x.c, name: finale(x.voce) })));
    const records = [...(p.records ?? []), ...a.records.map((x) => ({ ...x.r, name: x.nome }))];
    return valida(
      {
        ...p,
        functions,
        ...(costanti.length > 0 || p.shared_constants !== undefined ? { shared_constants: costanti } : {}),
        ...(records.length > 0 ? { records } : {}),
      },
      n,
    );
  };
