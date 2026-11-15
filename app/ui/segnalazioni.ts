// L'elenco delle segnalazioni del controllo, come lo mostra la riga di stato: una fonte sola per la riga di stato
// dell'app e per il punto d'ingresso del nucleo (`entrypoint/index.ts`, `segnalazioni`). Senza DOM e senza React: lo
// prova la configurazione del nucleo, che lo include.
//
// L'ordine: gli errori dei record, gli errori dei dati, gli errori dei blocchi, gli avvisi dei blocchi, gli avvisi dei
// dati. Il controllo dà gli errori e gli avvisi di un dato anche sulla sua funzione: la riga di stato li dice dato per
// dato e non li ripete sulla funzione. Il posto (`dove`) è il nome che lo studente vede: il blocco col suo testo, il
// dato con la sua tabella, ciò che sta in una procedura o in una funzione col suo nome davanti; mai un `id`.
//
// I silenzi sono della finestra, non del progetto: un blocco, un dato o un record appena aggiunti, che si stanno ancora
// scrivendo, non si segnalano. Chi chiama fuori dall'app non ne ha.
import type { EsitoDelControllo, FermataDelBlocco } from "../core/controllo/controllo";
import { partiDellaFine, partiDellIntestazione } from "../core/disegno/impaginazione";
import { sottoblocchi } from "../core/modifica/identificatori";
import { funzioneDi, trova } from "../core/modifica/operazioni";
import type { Blocco, Funzione, Progetto } from "../core/progetto/modello";
import type { SegnoDelControllo } from "../core/disegno/svg";
import { numeroDelCodice, testoDellaSegnalazione, type Codice } from "../i18n/codici";
import { dizionari, riempi, type Lingua } from "../i18n/lingue";
import { chiaveDelRecord, chiaveDellaRiga } from "./dati/righe";
import { nomeDelBlocco } from "./disegno/accessibile";
import { testiDelDisegno } from "./disegno/testi";

/** Una voce dell'elenco, coi testi già nella lingua dell'interfaccia. */
export interface VoceDelControllo {
  readonly genere: "errore" | "avviso";
  readonly codice: string;
  /** Il nome del blocco, o del dato con la sua tabella. */
  readonly dove: string;
  /** L'`id` del blocco, se la voce è di un blocco. */
  readonly blocco: string | null;
  /** L'`id` della fine di una funzione, se la voce è di ciò che restituisce: la fine porta il segno come un blocco. */
  readonly fine?: string;
  /** La chiave della riga, se la voce è di un dato. */
  readonly dato: string | null;
  /** L'`id` della funzione del blocco o del dato (della procedura o della funzione stessa, per il suo nome, il valore
   * predefinito e ciò che restituisce); assente per una costante comune. */
  readonly funzione?: string;
  /** Il testo breve del codice (la spiegazione intera sta nei campi del blocco o del dato, e qui sotto). */
  readonly breve: string;
  /** Che cosa è successo e il suggerimento: la spiegazione intera. */
  readonly accaduto: string;
  readonly suggerimento: string;
  /** I dati che il blocco può leggere prima che abbiano un valore: un comando ciascuno, che apre il loro valore
   * iniziale nella vista dei dati (`chiave` è quella della riga, `funzione` la funzione del dato). */
  readonly senzaValore?: readonly { readonly nome: string; readonly chiave: string; readonly funzione: string }[];
  /** I parametri per riferimento che ricevono un dato senza valore e che la procedura non legge prima di dar loro un
   * valore: un comando ciascuno, che li fa passare per uscita (`funzione` è la procedura, `indice` la posizione nei suoi dati). */
  readonly versoOut?: readonly { readonly nome: string; readonly funzione: string; readonly indice: number }[];
}

/** Ciò che la finestra tace mentre si scrive: un blocco, un dato della funzione mostrata, un record. */
export interface Silenzi {
  readonly blocco: string | null;
  readonly dato: number | null;
  readonly record: number | null;
}
export const nessunSilenzio: Silenzi = { blocco: null, dato: null, record: null };

/** I dati della funzione con quell'`id` (il programma principale, senza); nessuno, se la funzione non c'è più. */
export const datiDi = (p: Progetto, funzione?: string) => funzioneDi(p, funzione)?.data ?? [];

/** La funzione che contiene il blocco con quell'`id`. */
export function funzioneCon(p: Progetto, id: string): Funzione | undefined {
  const dentro = (s: readonly Blocco[]): boolean => s.some((b) => b.id === id || dentro(sottoblocchi(b)));
  return p.functions.find((f) => dentro(f.body));
}

/** La causa precisa dell'errore o dell'avviso di un blocco, se il controllo la sa. */
export const fermataDel = (fermate: readonly FermataDelBlocco[], s: { code: string; block: string }) => fermate.find((f) => f.code === s.code && f.block === s.block)?.fermata;

/**
 * L'elenco della riga di stato per l'esito del controllo di quel progetto, nella lingua data. `mostrata` è l'`id` della
 * funzione della scheda mostrata: i suoi parametri si nominano col loro nome nei comandi «per uscita», altrove con
 * l'argomento del salto.
 */
export function vociDelControllo(progetto: Progetto, controllo: EsitoDelControllo, lingua: Lingua, mostrata: string, silenzi: Silenzi = nessunSilenzio): VoceDelControllo[] {
  if (controllo.fuoriTappa) return [];
  const testi = dizionari[lingua];
  const disegnoDiOra = testiDelDisegno(lingua);
  const espressione = disegnoDiOra.espressione ?? ((t: string) => t);
  // Ciò che sta in una procedura o in una funzione si dice col suo nome davanti.
  const nellaFunzione = (f: Funzione, dove: string) => (f.kind === "main" ? dove : riempi(testi.voceNellaFunzione, { funzione: f.name ?? "", dove }));
  // Gli errori e gli avvisi di un dato il controllo li dà anche sulla sua funzione: quelli la vista dei dati li dice dato
  // per dato, e qui non si ripetono. Restano gli errori della funzione stessa (il suo nome, il valore predefinito).
  const deiDati = new Map<string, number>();
  const chiaveDel = (genere: string, block: string, code: string) => `${genere} ${block} ${code}`;
  for (const s of controllo.dati) if (!s.comune) deiDati.set(chiaveDel(s.genere, s.funzione, s.code), (deiDati.get(chiaveDel(s.genere, s.funzione, s.code)) ?? 0) + 1);
  const delBlocco =
    (genere: "errore" | "avviso") =>
    (s: { code: string; block: string }): VoceDelControllo[] => {
      if (s.block === silenzi.blocco) return [];
      const b = trova(progetto, s.block);
      const chiave = chiaveDel(genere, s.block, s.code);
      const ripetuti = b ? 0 : (deiDati.get(chiave) ?? 0);
      if (ripetuti > 0) {
        deiDati.set(chiave, ripetuti - 1);
        return [];
      }
      // Il blocco di una funzione, la funzione stessa (il nome, il valore predefinito) o la sua fine (ciò che restituisce).
      const f = b ? funzioneCon(progetto, s.block) : progetto.functions.find((x) => x.id === s.block || x.end.id === s.block);
      if (!f) return [];
      // Il dato letto prima di avere un valore: i dati li dice il controllo, per la funzione e la posizione.
      const senzaValore =
        s.code === "maybe_uninitialized"
          ? controllo.primaDelValore
              .filter((l) => l.block === s.block)
              .map((l) => ({ nome: datiDi(progetto, l.funzione)[l.indice]?.name ?? "", chiave: chiaveDellaRiga(false, l.indice), funzione: l.funzione }))
          : undefined;
      // Il riferimento senza valore: per i parametri che lo ricevono, e che la procedura non legge prima di dar loro un
      // valore, la correzione verso il passaggio per uscita (mai per uno letto prima: lì servirebbe il valore). Il nome
      // è quello della scheda mostrata: nella procedura il parametro, altrove l'argomento come lo scrive il salto.
      const versoOut =
        s.code === "reference_without_value" && b?.kind === "call"
          ? controllo.senzaValoreAlSalto
              .filter((a) => a.block === s.block && controllo.versoOut.some((v) => v.funzione === a.funzione && v.indice === a.indice))
              .map((a) => {
                const dati = datiDi(progetto, a.funzione);
                const parametro = dati[a.indice];
                const argomento = b.arguments[dati.filter((d) => d.parameter !== undefined).indexOf(parametro!)] ?? "";
                const nome = mostrata === a.funzione ? (parametro?.name ?? "") : espressione(argomento);
                return { nome, funzione: a.funzione, indice: a.indice };
              })
          : [];
      const testo = b
        ? nomeDelBlocco(b, testi, espressione, progetto.functions)
        : (s.block === f.id ? partiDellIntestazione(f, disegnoDiOra) : partiDellaFine(f, disegnoDiOra)).map((p) => p.testo).join("");
      // Sulla funzione stessa (le misure del risultato) o sulla sua fine, l'errore è sul risultato: il suo testo.
      const sulRisultato = !b && f.kind === "function";
      return [
        {
          genere,
          codice: s.code,
          dove: nellaFunzione(f, testo),
          blocco: b ? b.id : null,
          ...(!b && s.block === f.end.id ? { fine: f.end.id } : {}),
          dato: null,
          funzione: f.id,
          ...testoDellaSegnalazione(lingua, s.code as Codice, sulRisultato, fermataDel(controllo.fermate, s)),
          ...(senzaValore ? { senzaValore } : {}),
          ...(versoOut.length > 0 ? { versoOut } : {}),
        },
      ];
    };
  const dati = controllo.dati
    .filter((s) => s.comune || s.funzione !== mostrata || s.indice !== silenzi.dato)
    .map((s): VoceDelControllo => {
      const f = s.comune ? undefined : progetto.functions.find((x) => x.id === s.funzione);
      const d = (s.comune ? (progetto.shared_constants ?? []) : (f?.data ?? []))[s.indice]!;
      const voce = riempi(testi.voceDelDato, { tabella: s.comune ? testi.costantiComuni : testi.dati, nome: d.name || testi.datoSenzaNome });
      return {
        genere: s.genere,
        codice: s.code,
        dove: f ? nellaFunzione(f, voce) : voce,
        blocco: null,
        dato: chiaveDellaRiga(s.comune, s.indice),
        ...(f ? { funzione: f.id } : {}),
        ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata),
      };
    });
  // Gli errori dei record (del progetto, col blocco vuoto, che nessun blocco né funzione ha): uno per record e codice.
  const deiRecord = (controllo.record ?? [])
    .filter((s) => s.indice !== silenzi.record)
    .map((s): VoceDelControllo => ({
      genere: "errore",
      codice: s.code,
      dove: riempi(testi.voceDelDato, { tabella: testi.recordTitolo, nome: progetto.records?.[s.indice]?.name || testi.datoSenzaNome }),
      blocco: null,
      dato: chiaveDelRecord(s.indice),
      ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata),
    }));
  const errori = dati.filter((v) => v.genere === "errore");
  const avvisi = dati.filter((v) => v.genere === "avviso");
  return [...deiRecord, ...errori, ...controllo.errori.flatMap(delBlocco("errore")), ...controllo.avvisi.flatMap(delBlocco("avviso")), ...avvisi];
}

/** Il segno di ogni blocco (e della fine di una funzione) che ha una voce, coi numeri dei suoi codici nell'ordine
 * dell'elenco: «errore» vince su «avviso». */
export function segnalatiDelleVoci(voci: readonly VoceDelControllo[]): Map<string, SegnoDelControllo> {
  const m = new Map<string, SegnoDelControllo>();
  for (const v of voci) {
    const id = v.blocco ?? v.fine;
    if (id === undefined) continue;
    const prima = m.get(id);
    const numero = numeroDelCodice[v.codice as Codice];
    m.set(id, {
      segno: prima?.segno === "errore" ? "errore" : v.genere,
      codici: prima === undefined ? [numero] : prima.codici.includes(numero) ? prima.codici : [...prima.codici, numero],
    });
  }
  return m;
}

/** Il segno di ogni blocco (e della fine di una funzione) che ha una voce: «errore» vince su «avviso». */
export const segniDelleVoci = (voci: readonly VoceDelControllo[]): Map<string, "errore" | "avviso"> =>
  new Map([...segnalatiDelleVoci(voci)].map(([id, s]) => [id, s.segno]));
