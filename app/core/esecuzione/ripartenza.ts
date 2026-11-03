// Ripartire da una pausa dopo una modifica del progetto: lo stato non si conserva, si ricalcola. L'interprete non vede una modifica (i suoi
// generatori stanno sugli oggetti del progetto di partenza), quindi si riesegue il progetto nuovo con le stesse righe, fino allo stesso punto.
//
// - Il punto è il POSTO (il blocco, la parte del ciclo, il campo, il valore iniziale, la ripresa) più l'OCCORRENZA, quante volte il programma ci è
//   passato: il numero dell'azione non regge una modifica (uno in più prima del punto lo sposta). Si conta su ogni fermata di «dentro», quindi non
//   dipende dal comando che aveva fermato l'esecuzione, né dai punti di interruzione: quelli incontrati per strada non fermano.
// - Il punto si ricava dal progetto di allora, con le stesse righe (`RicercaDelPunto`): nessun contatore mentre si esegue, perché serve di rado.
// - Tutto a fette: un programma lungo, o diventato senza fine, non blocca chi chiama, e il tetto dei passi lo ferma comunque.
// - Non ritrovato: il posto cancellato (senza eseguire nulla), il progetto che non parte, il programma finito prima, una riga che manca o che è per
//   un altro dato, una riga la cui accettazione è cambiata. Si ferma lì e il motivo lo dice: l'esecuzione resta in quello stato.
//
// `GuidaDelleRighe` è il punto solo che dà le righe a un'esecuzione guidata: la usa anche la riproduzione di una registrazione.
//
// Che cosa NON guarda: i valori di prima accanto a quelli nuovi, le colonne della tabella e i punti su un blocco cancellato, che sono della finestra;
// un'esecuzione ferma in attesa di una riga, che non è una pausa.

import type { Tetti } from "../controllo/controllo";
import { senzaValore, type Riga } from "../interprete/interprete";
import type { CasoDiUnaFunzione, Progetto, VoceDiUnaFunzione } from "../progetto/modello";
import type { Comando } from "./controllore";
import { Esecuzione, funzioneDelBlocco, type OpzioniDellEsecuzione, type RigaData, type Stato } from "./esecuzione";

const comeRiga = (v: VoceDiUnaFunzione): Exclude<Riga, undefined> => {
  const testo = v.text ?? senzaValore;
  return v.each === true ? { ognuno: testo } : testo;
};

/** Perché la guida si è fermata senza che lo chiedesse chi guida. */
export type FermataDelleRighe = "fine" | "riga_mancante" | "riga_per_un_altro_dato" | "riga_non_ammessa";

/** Un'esecuzione guidata con un comando, che dà alle letture le righe date; `ferma`, guardata a ogni giro, dice quando smettere. Con «dentro» avanza
 * di un solo risultato alla volta, e si può fermare esattamente a un punto. */
export class GuidaDelleRighe<C extends CasoDiUnaFunzione, M> {
  #fermata: M | FermataDelleRighe | undefined;
  #date = 0;
  readonly #es: Esecuzione<C>;
  readonly #righe: readonly VoceDiUnaFunzione[];
  readonly #comando: Comando;
  readonly #ferma: () => M | undefined;

  constructor(es: Esecuzione<C>, righe: readonly VoceDiUnaFunzione[], comando: Comando, ferma: () => M | undefined) {
    this.#es = es;
    this.#righe = righe;
    this.#comando = comando;
    this.#ferma = ferma;
  }

  /** Perché si è fermata; finché è `undefined` si chiama ancora `fetta`. */
  get fermata(): M | FermataDelleRighe | undefined {
    return this.#fermata;
  }

  /** Quante righe ha dato. */
  get date(): number {
    return this.#date;
  }

  fetta(orologio: () => number, durata: number): void {
    const inizio = orologio();
    do {
      const m = this.#ferma();
      if (m !== undefined) {
        this.#fermata = m;
        return;
      }
      this.#giro(orologio, durata);
    } while (this.#fermata === undefined && orologio() - inizio < durata);
  }

  #giro(orologio: () => number, durata: number): void {
    const es = this.#es;
    const s = es.stato;
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda(this.#comando);
    // Con la durata zero una fetta fa un solo avanzamento: ci si ferma esattamente al punto.
    else if (s.genere === "in corso") es.fetta(orologio, this.#comando === "dentro" ? 0 : durata);
    else if (s.genere === "chiede") {
      const riga = this.#righe[this.#date];
      if (riga === undefined) this.#fermata = "riga_mancante";
      else if (riga.data !== s.dato) this.#fermata = "riga_per_un_altro_dato";
      else {
        this.#date++;
        try {
          es.inserisci(comeRiga(riga));
        } catch {
          // Una riga che questa lettura non ammette (un file scritto a mano, un parametro cambiato).
          this.#fermata = "riga_non_ammessa";
        }
      }
    } else this.#fermata = "fine";
  }
}

/** Il punto di una pausa. */
export interface PuntoDellaPausa {
  /** Il posto, da confrontare (`postoDi`). */
  readonly posto: string;
  /** Il blocco, o vuoto sul valore iniziale di un dato. */
  readonly blocco: string;
  readonly dato?: string;
  readonly funzione?: string;
  /** Quante volte il programma è passato da quel posto, questa compresa. */
  readonly occorrenza: number;
}

type Pausa = Extract<Stato, { genere: "pausa" }>;

/** Il posto di una pausa, senza la profondità: una modifica può cambiarla, e l'occorrenza distingue già le chiamate. */
export const postoDi = (s: Pausa): string => JSON.stringify([s.blocco, s.dato ?? null, s.funzione ?? null, s.fase ?? null, s.campo ?? null, s.interno ?? false, s.ripresa?.funzione ?? null]);

/** Il punto della pausa di `da`, ricavato rieseguendo il progetto di allora con le stesse righe. `da` non cambia. */
export class RicercaDelPunto<C extends CasoDiUnaFunzione> {
  #punto: PuntoDellaPausa | undefined;
  #visti = 0;
  readonly #guida: GuidaDelleRighe<C, "arrivata">;
  readonly #copia: Esecuzione<C>;
  readonly #pausa: Pausa;

  constructor(da: Esecuzione<C>) {
    const s = da.stato;
    if (s.genere !== "pausa") throw new Error(`un punto con l'esecuzione ${s.genere}`);
    this.#pausa = s;
    const copia = new Esecuzione<C>(da.progetto, da.limiti, {
      tabella: false,
      righeLunghe: da.righeLunghe,
      controllo: da.controllo,
      ...(da.funzione !== undefined ? { funzione: da.funzione } : {}),
      ...(da.caso !== undefined ? { caso: da.caso } : {}),
    });
    this.#copia = copia;
    const posto = postoDi(s);
    const fino = da.avanzamenti;
    this.#guida = new GuidaDelleRighe<C, "arrivata">(copia, da.righeDate, "dentro", () => {
      const c = copia.stato;
      if (c.genere === "pausa" && postoDi(c) === posto) this.#visti++;
      return copia.avanzamenti >= fino ? "arrivata" : undefined;
    });
  }

  /** Il punto, quando la ricerca è finita. */
  get punto(): PuntoDellaPausa | undefined {
    return this.#punto;
  }

  fetta(orologio: () => number, durata: number): void {
    if (this.#punto !== undefined) return;
    this.#guida.fetta(orologio, durata);
    const fermata = this.#guida.fermata;
    if (fermata === undefined) return;
    const s = this.#pausa;
    const c = this.#copia.stato;
    // L'esecuzione è deterministica: se non torna è un difetto dell'app, e non si riparte da un punto falso.
    if (fermata !== "arrivata" || c.genere !== "pausa" || postoDi(c) !== postoDi(s)) throw new Error(`la pausa non si ritrova: ${fermata}, ${c.genere}`);
    this.#punto = { posto: postoDi(s), blocco: s.blocco, ...(s.dato !== undefined ? { dato: s.dato } : {}), ...(s.funzione !== undefined ? { funzione: s.funzione } : {}), occorrenza: this.#visti };
  }
}

export type MotivoDelNonRitrovato = "posto_cancellato" | "non_parte" | "finito_prima" | "riga_mancante" | "riga_per_un_altro_dato" | "riga_non_ammessa" | "riga_ora_rifiutata" | "riga_ora_valida";

/** `righeAvanzate`: quante righe date non sono servite per arrivare (una lettura tolta): si dichiarano, non sono un errore. */
export type EsitoDellaRipartenza = { readonly ritrovato: true; readonly righeAvanzate: number } | { readonly ritrovato: false; readonly motivo: MotivoDelNonRitrovato };

/** Il posto c'è ancora nel progetto: il blocco, o il dato del valore iniziale nella sua funzione o fra le costanti comuni. */
function postoPresente(p: Progetto, punto: PuntoDellaPausa): boolean {
  if (punto.dato === undefined) return funzioneDelBlocco(p, punto.blocco) !== undefined;
  const f = p.functions.find((x) => (punto.funzione === undefined ? x.kind === "main" : x.id === punto.funzione));
  return f !== undefined && [...f.data, ...(p.shared_constants ?? [])].some((d) => d.name === punto.dato);
}

/** Un'esecuzione nuova del progetto `p`, portata con le righe date fino al punto. L'esecuzione si guarda da `esecuzione`; a ricerca finita, con
 * `esito`, è in pausa sul punto o ferma dove il motivo dice, e chi chiama la prosegue coi comandi di sempre. */
export class Ripartenza<C extends CasoDiUnaFunzione> {
  readonly esecuzione: Esecuzione<C>;
  #esito: EsitoDellaRipartenza | undefined;
  readonly #guida: GuidaDelleRighe<C, "arrivata" | "riga_ora_rifiutata" | "riga_ora_valida"> | undefined;
  readonly #righe: readonly RigaData[];

  constructor(p: Progetto, limiti: Tetti, opzioni: OpzioniDellEsecuzione<C>, righe: readonly RigaData[], punto: PuntoDellaPausa) {
    const es = new Esecuzione<C>(p, limiti, opzioni);
    this.esecuzione = es;
    this.#righe = righe;
    if (!postoPresente(p, punto)) {
      this.#esito = { ritrovato: false, motivo: "posto_cancellato" };
      this.#guida = undefined;
      return;
    }
    let visti = 0;
    let confrontate = 0;
    const guida = new GuidaDelleRighe<C, "arrivata" | "riga_ora_rifiutata" | "riga_ora_valida">(es, righe, "dentro", () => {
      // Una riga data si sa se è stata accettata al primo avanzamento dopo.
      if (confrontate < guida.date) {
        const date = es.righeDate;
        for (; confrontate < date.length; confrontate++) {
          const allora = righe[confrontate]?.rifiutata === true;
          const adesso = date[confrontate]!.rifiutata === true;
          if (allora !== adesso) return adesso ? "riga_ora_rifiutata" : "riga_ora_valida";
        }
      }
      const s = es.stato;
      return s.genere === "pausa" && postoDi(s) === punto.posto && ++visti === punto.occorrenza ? "arrivata" : undefined;
    });
    this.#guida = guida;
  }

  /** L'esito, quando la ricerca è finita. */
  get esito(): EsitoDellaRipartenza | undefined {
    return this.#esito;
  }

  fetta(orologio: () => number, durata: number): void {
    const guida = this.#guida;
    if (this.#esito !== undefined || guida === undefined) return;
    guida.fetta(orologio, durata);
    const fermata = guida.fermata;
    if (fermata === undefined) return;
    const es = this.esecuzione;
    // Fermata fra due avanzamenti (una riga appena giudicata): si arriva alla fermata vera, la lettura richiesta o l'azione dopo.
    while (es.stato.genere === "in corso") es.fetta(orologio, 0);
    if (fermata === "arrivata") this.#esito = { ritrovato: true, righeAvanzate: this.#righe.length - guida.date };
    else if (fermata === "fine") this.#esito = { ritrovato: false, motivo: es.stato.genere === "non parte" ? "non_parte" : "finito_prima" };
    else this.#esito = { ritrovato: false, motivo: fermata };
  }
}
