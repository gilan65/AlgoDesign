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
// - I valori scritti a mano: la ricerca del punto li ripete sempre allo stesso numero di avanzamenti (il progetto è quello di allora), o una modifica che ha cambiato il
//   cammino non ritroverebbe la pausa; e ricava per ognuno il suo punto. La ripartenza li riapplica lì, se chi la chiama li tiene: in una pausa il posto più l'occorrenza,
//   in attesa di una riga quante righe sono state date. Si ferma lì se il dato non c'è più o non accetta il valore; arrivata alla pausa con una modifica non applicata, si
//   ferma alla pausa: in tutti e due i casi il motivo lo dice.
//
// `GuidaDelleRighe` è il punto solo che dà le righe a un'esecuzione guidata: la usa anche la riproduzione di una registrazione. `RipetizioneDelleModifiche` è il punto solo
// che ripete i valori scritti a mano allo stesso numero di avanzamenti, usato anche dalla riproduzione.
//
// - Da un errore che ha fermato il programma: il punto è l'ultima fermata prima della fine, cioè il blocco dell'errore al suo passaggio. Il posto cancellato qui non ferma: il
//   programma corretto va fin dove va con le stesse righe, e se ci arriva si ferma lì.
//
// Che cosa NON guarda: i valori di prima accanto a quelli nuovi, le colonne della tabella e i punti su un blocco cancellato, che sono della finestra;
// un'esecuzione ferma in attesa di una riga, che non è una pausa.

import type { Tetti } from "../controllo/controllo";
import { senzaValore, type Riga } from "../interprete/interprete";
import type { CasoDiUnaFunzione, Progetto, VoceDiUnaFunzione } from "../progetto/modello";
import type { Comando } from "./controllore";
import { Esecuzione, funzioneDelBlocco, type EsitoDellaModifica, type ModificaFatta, type OpzioniDellEsecuzione, type RigaData, type Stato } from "./esecuzione";

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

/** I valori scritti a mano ripetuti allo stesso numero di avanzamenti, sullo stesso progetto: si chiama `ripeti` a ogni giro di una guida con «dentro», che passa da ogni
 * punto. */
export class RipetizioneDelleModifiche<C extends CasoDiUnaFunzione> {
  #fatte = 0;
  #rifiuto: Extract<EsitoDellaModifica, { ok: false }>["motivo"] | undefined;
  readonly #es: Esecuzione<C>;
  readonly #modifiche: readonly ModificaFatta[];

  constructor(es: Esecuzione<C>, modifiche: readonly ModificaFatta[]) {
    this.#es = es;
    this.#modifiche = modifiche;
  }

  /** Perché una è stata rifiutata: da lì non si ripete più nulla. */
  get rifiuto(): Extract<EsitoDellaModifica, { ok: false }>["motivo"] | undefined {
    return this.#rifiuto;
  }

  /** La prima non ripetuta, se c'è. */
  get mancante(): ModificaFatta | undefined {
    return this.#modifiche[this.#fatte];
  }

  /** `prima`, a ognuna che sta per essere ripetuta. */
  ripeti(prima?: (m: ModificaFatta) => void): void {
    for (let m = this.mancante; this.#rifiuto === undefined && m !== undefined && m.avanzamenti === this.#es.avanzamenti; m = this.mancante) {
      prima?.(m);
      const esito = this.#es.modifica(m, m.testo);
      if (esito.ok) this.#fatte++;
      else this.#rifiuto = esito.motivo;
    }
  }
}

/** Dove un valore scritto a mano si riapplica: una pausa, col suo posto e l'occorrenza, o l'attesa di una riga, con le righe date fin lì. */
export type PuntoDellaModifica = { readonly posto: string; readonly occorrenza: number } | { readonly righe: number };

export interface ModificaDaRiapplicare {
  readonly modifica: ModificaFatta;
  readonly punto: PuntoDellaModifica;
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

/** Si può ripartire da qui: una pausa, o un errore che ha fermato il programma. */
export const siRipartiDa = (s: Stato): boolean => s.genere === "pausa" || (s.genere === "finita" && s.errore !== undefined);

/** Il punto della pausa di `da`, o dell'errore che l'ha fermata, ricavato rieseguendo il progetto di allora con le stesse righe. `da` non cambia. */
export class RicercaDelPunto<C extends CasoDiUnaFunzione> {
  #punto: PuntoDellaPausa | undefined;
  #finita = false;
  /** L'ultima fermata vista: su un errore, il suo punto. */
  #ultima: Pausa | undefined;
  readonly #guida: GuidaDelleRighe<C, "arrivata">;
  readonly #copia: Esecuzione<C>;
  readonly #partenza: Pausa | Extract<Stato, { genere: "finita" }>;
  readonly #ripetizione: RipetizioneDelleModifiche<C>;
  readonly #visti = new Map<string, number>();
  readonly #daRiapplicare: ModificaDaRiapplicare[] = [];

  constructor(da: Esecuzione<C>) {
    const s = da.stato;
    if ((s.genere !== "pausa" && s.genere !== "finita") || !siRipartiDa(s)) throw new Error(`un punto con l'esecuzione ${s.genere}`);
    this.#partenza = s;
    const copia = new Esecuzione<C>(da.progetto, da.limiti, {
      tabella: false,
      righeLunghe: da.righeLunghe,
      controllo: da.controllo,
      ...(da.funzione !== undefined ? { funzione: da.funzione } : {}),
      ...(da.caso !== undefined ? { caso: da.caso } : {}),
    });
    this.#copia = copia;
    // Da un errore si arriva alla fine: l'esecuzione è deterministica, e si ferma lì da sola.
    const fino = s.genere === "pausa" ? da.avanzamenti : Infinity;
    this.#ripetizione = new RipetizioneDelleModifiche(copia, da.modifiche);
    const guida: GuidaDelleRighe<C, "arrivata"> = new GuidaDelleRighe<C, "arrivata">(copia, da.righeDate, "dentro", () => {
      const c = copia.stato;
      const posto = c.genere === "pausa" ? postoDi(c) : undefined;
      if (posto !== undefined) {
        this.#visti.set(posto, (this.#visti.get(posto) ?? 0) + 1);
        this.#ultima = c as Pausa;
      }
      this.#ripetizione.ripeti((modifica) => this.#daRiapplicare.push({ modifica, punto: posto !== undefined ? { posto, occorrenza: this.#visti.get(posto)! } : { righe: guida.date } }));
      return copia.avanzamenti >= fino ? "arrivata" : undefined;
    });
    this.#guida = guida;
  }

  /** Il punto, quando la ricerca è finita; nessuno, se l'errore è arrivato prima della prima azione. */
  get punto(): PuntoDellaPausa | undefined {
    return this.#punto;
  }

  get finita(): boolean {
    return this.#finita;
  }

  /** I valori scritti a mano col loro punto, quando la ricerca è finita. */
  get modifiche(): readonly ModificaDaRiapplicare[] {
    return this.#daRiapplicare;
  }

  fetta(orologio: () => number, durata: number): void {
    if (this.#finita) return;
    this.#guida.fetta(orologio, durata);
    const fermata = this.#guida.fermata;
    if (fermata === undefined) return;
    const s = this.#partenza;
    const c = this.#copia.stato;
    // L'esecuzione è deterministica: se non torna è un difetto dell'app, e non si riparte da un punto falso.
    const rifiuto = this.#ripetizione.rifiuto;
    const tornata =
      s.genere === "pausa"
        ? fermata === "arrivata" && c.genere === "pausa" && postoDi(c) === postoDi(s)
        : fermata === "fine" && c.genere === "finita" && c.errore?.code === s.errore?.code && c.errore?.block === s.errore?.block;
    if (!tornata || rifiuto !== undefined || this.#ripetizione.mancante !== undefined) throw new Error(`la pausa non si ritrova: ${fermata}, ${c.genere}, ${rifiuto ?? "nessun rifiuto"}`);
    const u = s.genere === "pausa" ? s : this.#ultima;
    this.#finita = true;
    if (u !== undefined) this.#punto = { posto: postoDi(u), blocco: u.blocco, ...(u.dato !== undefined ? { dato: u.dato } : {}), ...(u.funzione !== undefined ? { funzione: u.funzione } : {}), occorrenza: this.#visti.get(postoDi(u))! };
  }
}

export type MotivoDelNonRitrovato = "posto_cancellato" | "non_parte" | "finito_prima" | "riga_mancante" | "riga_per_un_altro_dato" | "riga_non_ammessa" | "riga_ora_rifiutata" | "riga_ora_valida" | "modifica_persa" | "modifica_rifiutata";

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
  readonly #guida: GuidaDelleRighe<C, "arrivata" | "riga_ora_rifiutata" | "riga_ora_valida" | "modifica_persa" | "modifica_rifiutata"> | undefined;
  readonly #righe: readonly RigaData[];

  /** `modifiche`: i valori scritti a mano da riapplicare, ognuno al suo punto. `dopoUnErrore`: senza il punto (o col suo posto cancellato) non ci si ferma: si corre con le stesse righe. */
  constructor(p: Progetto, limiti: Tetti, opzioni: OpzioniDellEsecuzione<C>, righe: readonly RigaData[], puntoDato: PuntoDellaPausa | undefined, modifiche: readonly ModificaDaRiapplicare[] = [], dopoUnErrore = false) {
    const es = new Esecuzione<C>(p, limiti, opzioni);
    this.esecuzione = es;
    this.#righe = righe;
    const punto = puntoDato !== undefined && postoPresente(p, puntoDato) ? puntoDato : undefined;
    if (punto === undefined && !dopoUnErrore) {
      this.#esito = { ritrovato: false, motivo: "posto_cancellato" };
      this.#guida = undefined;
      return;
    }
    const visti = new Map<string, number>();
    const daFare = [...modifiche];
    let confrontate = 0;
    const guida = new GuidaDelleRighe<C, "arrivata" | "riga_ora_rifiutata" | "riga_ora_valida" | "modifica_persa" | "modifica_rifiutata">(es, righe, "dentro", () => {
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
      const posto = s.genere === "pausa" ? postoDi(s) : undefined;
      if (posto !== undefined) visti.set(posto, (visti.get(posto) ?? 0) + 1);
      for (let k = 0; k < daFare.length && (posto !== undefined || s.genere === "chiede"); ) {
        const { modifica: m, punto: dove } = daFare[k]!;
        const qui = "righe" in dove ? posto === undefined && dove.righe === guida.date : dove.posto === posto && dove.occorrenza === visti.get(posto);
        if (!qui) k++;
        else if (es.modifica(m, m.testo).ok) daFare.splice(k, 1);
        else return "modifica_rifiutata";
      }
      if (punto === undefined || posto !== punto.posto || visti.get(posto) !== punto.occorrenza) return undefined;
      return daFare.length > 0 ? "modifica_persa" : "arrivata";
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

/** Il gesto intero, da una pausa di `da` o dall'errore che l'ha fermata: il punto ricavato dal progetto di allora, poi un'esecuzione nuova del progetto `p` fino a quel punto, tutto a fette.
 * `da` non cambia. Finché non c'è l'esito l'esecuzione nuova è a metà e non si mostra; col posto cancellato non c'è affatto. `valori`: i valori scritti a mano in `da` si
 * riapplicano allo stesso punto («tieni»), o no («togli»). */
export class Riesecuzione<C extends CasoDiUnaFunzione> {
  #ripartenza: Ripartenza<C> | undefined;
  #esito: EsitoDellaRipartenza | undefined;
  readonly #ricerca: RicercaDelPunto<C>;
  readonly #da: Esecuzione<C>;
  readonly #progetto: Progetto;
  readonly #limiti: Tetti;
  readonly #opzioni: OpzioniDellEsecuzione<C>;
  readonly #valori: "tieni" | "togli";

  constructor(da: Esecuzione<C>, p: Progetto, limiti: Tetti, opzioni: OpzioniDellEsecuzione<C>, valori: "tieni" | "togli" = "togli") {
    this.#ricerca = new RicercaDelPunto(da);
    this.#da = da;
    this.#progetto = p;
    this.#limiti = limiti;
    this.#opzioni = opzioni;
    this.#valori = valori;
  }

  get esito(): EsitoDellaRipartenza | undefined {
    return this.#esito;
  }

  /** L'esecuzione nuova, a esito arrivato; nessuna col posto cancellato: nulla è stato eseguito. */
  get esecuzione(): Esecuzione<C> | undefined {
    return this.#esito === undefined || (!this.#esito.ritrovato && this.#esito.motivo === "posto_cancellato") ? undefined : this.#ripartenza?.esecuzione;
  }

  fetta(orologio: () => number, durata: number): void {
    if (this.#esito !== undefined) return;
    if (!this.#ricerca.finita) {
      this.#ricerca.fetta(orologio, durata);
      return;
    }
    const { funzione } = this.#opzioni;
    // La funzione eseguita da sola non c'è più: anche il posto, e un'esecuzione senza radice non si comincia.
    if (funzione !== undefined && !this.#progetto.functions.some((f) => f.id === funzione)) {
      this.#esito = { ritrovato: false, motivo: "posto_cancellato" };
      return;
    }
    this.#ripartenza ??= new Ripartenza<C>(this.#progetto, this.#limiti, this.#opzioni, this.#da.righeDate, this.#ricerca.punto, this.#valori === "tieni" ? this.#ricerca.modifiche : [], this.#da.stato.genere === "finita");
    this.#ripartenza.fetta(orologio, durata);
    this.#esito = this.#ripartenza.esito;
  }
}
