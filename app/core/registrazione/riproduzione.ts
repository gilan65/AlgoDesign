// La riproduzione di una registrazione: dal solo file si riesegue ogni esecuzione, coi valori del file, e si dice «uguale» oppure le
// differenze, per esecuzione e per campo. Tutto puro: nessun orologio, nessuna preferenza, nessuna lettura dall'esterno.
//
// - Un'esecuzione libera si guida con i comandi pubblici, dando alle letture le righe del file, rifiutate comprese (anche loro
//   scrivono nella console, e il tetto della console le conta); una non finita si ferma allo stesso numero di avanzamenti, che
//   è lo stesso punto. Nel modo caso la guida è la stessa e le voci sono del caso.
// - Con «dentro» l'esecuzione si ferma a ogni azione e a ogni ripresa, quindi una pausa ritrovata è la stessa pausa, qualunque
//   comando l'avesse fermata allora; i punti di interruzione non contano.
// - Un programma che chiede una riga che il file non ha, o per un altro dato, si ferma lì: le letture consumate sono diverse e
//   la differenza lo dice. Non resta mai appeso; un ciclo senza fine lo ferma il tetto dei passi.
// - `out_of_memory` è il solo esito legato alla macchina: ogni differenza di un'esecuzione dove compare, da una parte o dall'altra,
//   porta `dellaMacchina`, perché non si legga come una differenza del programma.
// - Un'eccezione dell'esecuzione è un difetto dell'app, proprio ciò che si cerca: si dice come una differenza, non esce di qui.
//
// Che cosa NON guarda: la versione del prodotto (la dice chi mostra l'esito), gli errori dell'app, i punti di interruzione.

import { Esecuzione } from "../esecuzione/esecuzione";
import { senzaValore, type Riga } from "../interprete/interprete";
import { nonSiAttendono, type CasoDiUnaFunzione } from "../progetto/modello";
import { esitoRegistrato, righeLette } from "./composizione";
import type { EsecuzioneRegistrata, EsitoDelFile, Registrazione, RigaLetta } from "./formato";

export type CampoDelConfronto = "outcome" | "console" | "console_removed" | "reads" | "advances" | "exception";

export interface DifferenzaDellaRiproduzione {
  /** La posizione dell'esecuzione nel file, da 0. */
  readonly esecuzione: number;
  readonly campo: CampoDelConfronto;
  readonly registrato: string;
  readonly riprodotto: string;
  /** In un elenco, la posizione del primo elemento diverso. */
  readonly posizione?: number;
  /** Un esito legato alla macchina (`out_of_memory`), non una differenza del programma. */
  readonly dellaMacchina?: true;
}

export interface Riproduzione {
  readonly uguale: boolean;
  readonly esecuzioni: number;
  readonly differenze: readonly DifferenzaDellaRiproduzione[];
}

const senzaOrologio = () => 0;

const comeRiga = (v: RigaLetta): Exclude<Riga, undefined> => {
  const testo = v.text ?? senzaValore;
  return v.each === true ? { ognuno: testo } : testo;
};

/** L'esecuzione guidata con le righe del file, fino agli avanzamenti (`undefined`: fino a dove arriva) o a una riga che manca. */
function guida(es: Esecuzione<CasoDiUnaFunzione>, righe: readonly RigaLetta[], fino: number | undefined): void {
  let prossima = 0;
  for (;;) {
    if (fino !== undefined && es.avanzamenti >= fino) return;
    const s = es.stato;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda(fino === undefined ? "continua" : "dentro");
    // Con la durata zero una fetta fa un solo avanzamento: ci si ferma esattamente al punto.
    else if (s.genere === "in corso") es.fetta(senzaOrologio, fino === undefined ? Infinity : 0);
    else if (s.genere === "chiede") {
      const riga = righe[prossima];
      if (riga === undefined || riga.data !== s.dato) return;
      prossima++;
      try {
        es.inserisci(comeRiga(riga));
      } catch {
        // Una riga che questa lettura non ammette (un file scritto a mano): le letture consumate lo diranno.
        return;
      }
    } else return;
  }
}

/** La prima posizione diversa di due elenchi, con gli elementi come testo. */
function primaDiversa(a: readonly unknown[], b: readonly unknown[]): { readonly posizione: number; readonly registrato: string; readonly riprodotto: string } | undefined {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = JSON.stringify(a[i]) ?? "nessuno";
    const y = JSON.stringify(b[i]) ?? "nessuno";
    if (x !== y) return { posizione: i, registrato: x, riprodotto: y };
  }
  return undefined;
}

/** L'esito finito con un errore che dipende dalla macchina, l'elenco che già vieta di attenderlo in un caso d'uso. */
const legatoAllaMacchina = ({ outcome: o }: { readonly outcome: EsitoDelFile }) => o.kind === "finished" && o.error !== undefined && nonSiAttendono.has(o.error.code);

function riproduciUna(r: Registrazione, x: EsecuzioneRegistrata, indice: number): DifferenzaDellaRiproduzione[] {
  const fuori: DifferenzaDellaRiproduzione[] = [];
  const finita = x.outcome.kind === "finished" || x.outcome.kind === "not_started";
  let ottenuto;
  let lette: readonly RigaLetta[] = [];
  // I valori dell'esecuzione, se li porta (cambiati mentre si registrava), altrimenti quelli del file.
  const limiti = x.limits ?? r.limits;
  const righeLunghe = x.long_lines ?? r.long_lines;
  try {
    const es = new Esecuzione<CasoDiUnaFunzione>(
      x.project,
      { elementiDiUnVettore: limiti.vector_elements, lunghezzaDiUnaStringa: limiti.string_length, caratteriDiUnVettoreDiStringhe: limiti.string_vector_characters },
      {
        tabella: false,
        righeLunghe: { caratteri: righeLunghe.characters, modo: righeLunghe.mode === "wrap" ? "a-capo" : "la-fine" },
        ...(x.function !== undefined ? { funzione: x.function } : {}),
        ...(x.test_case !== undefined ? { caso: x.test_case } : {}),
      },
    );
    guida(es, x.reads ?? [], finita ? undefined : x.advances);
    ottenuto = esitoRegistrato(es);
    lette = righeLette(es);
  } catch (e) {
    return [{ esecuzione: indice, campo: "exception", registrato: "nessuna", riprodotto: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }];
  }
  const dellaMacchina = legatoAllaMacchina(x) || legatoAllaMacchina(ottenuto);
  const aggiungi = (campo: CampoDelConfronto, registrato: string, riprodotto: string, posizione?: number) =>
    fuori.push({ esecuzione: indice, campo, registrato, riprodotto, ...(posizione !== undefined ? { posizione } : {}), ...(dellaMacchina ? { dellaMacchina: true as const } : {}) });
  const elenchi = (campo: CampoDelConfronto, a: readonly unknown[], b: readonly unknown[]) => {
    const d = primaDiversa(a, b);
    if (d !== undefined) aggiungi(campo, d.registrato, d.riprodotto, d.posizione);
  };
  // Fra due fette, o prima della prima azione, il punto lo dicono gli avanzamenti: la fermata di adesso non si confronta.
  const senzaFermata = x.outcome.kind === "running" || x.outcome.kind === "ready";
  if (!senzaFermata && JSON.stringify(x.outcome) !== JSON.stringify(ottenuto.outcome)) aggiungi("outcome", JSON.stringify(x.outcome), JSON.stringify(ottenuto.outcome));
  if (x.advances !== ottenuto.advances) aggiungi("advances", String(x.advances), String(ottenuto.advances));
  elenchi("reads", x.reads ?? [], lette);
  elenchi("console", x.console, ottenuto.console);
  if (x.console_removed !== ottenuto.console_removed) aggiungi("console_removed", String(x.console_removed), String(ottenuto.console_removed));
  return fuori;
}

/** Ogni esecuzione del file rieseguita coi valori del file. */
export function riproduci(r: Registrazione): Riproduzione {
  const differenze = r.executions.flatMap((x, i) => riproduciUna(r, x, i));
  return { uguale: differenze.length === 0, esecuzioni: r.executions.length, differenze };
}
