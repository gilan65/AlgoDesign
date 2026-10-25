// Un'esecuzione passo passo: l'interprete del nucleo guidato dai comandi dell'utente. L'interfaccia
// chiede un comando, fa avanzare l'esecuzione a fette e legge ciò che serve mostrare (lo stato, il blocco
// della pausa, l'output, la console, la tabella di traccia): nulla di tutto questo si ricalcola fuori di qui.
//
// - Ogni evento entra nella tabella appena arriva; poi il controllore decide se fermarsi lì, prima
//   dell'azione. In pausa sull'azione k la tabella arriva quindi all'azione k - 1: la sua ultima riga è
//   il valore attuale di ogni dato. Anche la ripresa dell'azione di chi chiama, dopo il ritorno da una funzione chiamata
//   nella sua espressione, entra nella tabella e può fermare (il controllore, alla profondità di chi chiama): la pausa
//   ha allora il valore restituito, e l'ultima riga della tabella è la fine della funzione appena tornata.
// - Una lettura ferma l'esecuzione finché arriva una riga (`inserisci`); una riga non valida si dice nella
//   console e la stessa lettura si richiede. Un'esecuzione non finisce mai gli input: aspetta.
// - Nel MODO CASO (un caso d'uso dato come parametro) l'esecuzione non chiede mai una riga: a ogni lettura consegna
//   la voce successiva del caso, che nella console è una riga «letto» come quelle scritte a mano. Una voce
//   destinata a un altro dato finisce con `input_mismatch` sulla lettura, senza leggerla; voci finite,
//   `input_exhausted` (lo dice l'interprete); una riga non valida finisce con `invalid_input`, non si richiede; voci
//   avanzate a fine normale, `unused_inputs` sul blocco di fine del programma principale. I comandi e i punti di
//   interruzione valgono come senza caso. Alla fine (o se il progetto non parte) `esito` confronta l'atteso con
//   l'ottenuto, con la sola funzione dell'esito (`casi/esito.ts`).
// - Con `funzione` si esegue da sola una procedura o una funzione (la radice al posto del programma principale): i
//   parametri si chiedono come letture; un parametro per riferimento accetta `senzaValore`, e il primo elemento di un
//   parametro vettore `{ ognuno }` (una riga per tutti). Nel modo caso una voce senza testo è `senzaValore` e una voce
//   con `each` è `{ ognuno }`, dove la lettura li ammette; altrove la voce non è valida (`invalid_input`). Le voci
//   avanzate cadono sulla fine della radice.
// - `fetta` fa almeno un passo, poi avanza finché il comando non si ferma o finché, secondo l'orologio dato,
//   non passa la durata; poi cede, e chi chiama decide quando riprendere (una fetta per fotogramma, «Ferma» fra
//   due fette). Un ciclo che non finisce non blocca chi chiama: il tetto dei passi lo ferma comunque, a fette.
// - Il motore che non riesce a proseguire (un `RangeError`: un testo più lungo di quanto il motore ammette, la
//   memoria) chiude l'esecuzione con l'errore `out_of_memory` sul blocco corrente, invece di lasciarla in corso
//   per sempre. Un'altra eccezione è un difetto dell'app, non del programma: esce dalla fetta.
// - La console è fatta di righe: ciò che il programma scrive si divide agli a capo, una riga senza a capo resta
//   aperta e la scrittura seguente la completa; un valore letto e uno non valido sono righe loro. Una riga più
//   lunga dei caratteri scelti va a capo da sola (le parti piene sono righe), o se ne tiene la fine: così nemmeno
//   un ciclo che scrive senza mai andare a capo fa una riga senza tetto. Una riga letta (scritta a mano o voce di un
//   caso) segue lo stesso modo; una non valida è un messaggio che non si spezza, e ne resta la fine. Se ne tengono le ultime, quante le righe
//   della tabella, e si contano le tolte. Senza caso l'output non si tiene altrove: la console è ciò che resta. Col
//   caso si tiene l'output fino alla lunghezza dell'atteso più il margine dell'esito, perché il confronto resti
//   esatto senza che un ciclo che scrive senza fine riempia la memoria.
// - Senza caso l'esecuzione tiene anche le righe date alle letture, intere, come voci di un caso (`lette`): un caso
//   d'uso composto da un'esecuzione finita (`casi/dallEsecuzione.ts`) le prende da qui, non dalla console.
// - I punti di interruzione si possono cambiare in pausa: valgono dal comando successivo.
// - La pila delle chiamate attive si legge dagli eventi: a ogni evento il suo livello (la profondità) prende la funzione e
//   il blocco dell'azione, e i livelli sotto si tolgono. Nei livelli sopra l'ultimo il blocco è quindi quello della
//   chiamata (il salto, o il blocco dell'espressione che chiama una funzione); sul valore iniziale di un dato è la
//   funzione stessa, il suo «Inizio».
// - I limiti delle impostazioni arrivano all'interprete da qui, con l'unico controllo statico, che dà anche gli
//   avvisi dell'esito di un caso.

import { esitoDelCaso, margineDellOutput, type EsitoDelCaso } from "../casi/esito";
import { controlla, type EsitoDelControllo, type Tetti } from "../controllo/controllo";
import { eseguiDopoIlControllo, senzaValore, type Esito, type FaseDelCiclo, type Passo, type Restituito, type Riga } from "../interprete/interprete";
import type { Blocco, CasoDiUnaFunzione, CasoDUso, CodiceErrore, Progetto, Segnalazione, VoceDiUnaFunzione } from "../progetto/modello";
import { fermati, fermatiSullaRipresa, type Comando } from "./controllore";
import { righeTenute, Traccia } from "./traccia";

export type { Comando } from "./controllore";

/** L'`id` della funzione che contiene il blocco (o la sua fine), o `undefined`. Un errore sul valore iniziale di un dato
 * cade sull'`id` della funzione stessa. */
function funzioneDelBlocco(p: Progetto, id: string): string | undefined {
  const dentro = (bs: readonly Blocco[]): boolean =>
    bs.some((b) => b.id === id || (b.kind === "if" ? dentro(b.then) || dentro(b.else) : "body" in b && dentro(b.body)));
  return p.functions.find((f) => f.id === id || f.end.id === id || dentro(f.body))?.id;
}

export type Stato =
  /** Prima della prima azione. */
  | { readonly genere: "pronta" }
  /** Ferma prima di un'azione: un blocco, o il valore iniziale di `dato` (col blocco vuoto, come nel disegno; della
   * funzione `funzione`, se non è il programma principale) alla profondità delle chiamate attive; in un ciclo
   * `per` o `per ogni`, la sua parte (`fase`), quella che il disegno, la tabella e il codice evidenziano. Con `ripresa`
   * (il valore che la funzione chiamata ha restituito) è la ripresa dell'azione del blocco, al livello di chi chiama,
   * dopo il ritorno da una funzione chiamata nella sua espressione: non un'azione, e il numero delle azioni non cambia. */
  | { readonly genere: "pausa"; readonly blocco: string; readonly dato?: string; readonly fase?: FaseDelCiclo; readonly funzione?: string; readonly profondita: number; readonly ripresa?: Restituito }
  /** Un comando in corso, fra due fette. */
  | { readonly genere: "in corso" }
  /** Aspetta la riga di una lettura; `nonValido` se la riga data prima non andava; `parametro`, per un parametro della
   * funzione eseguita da sola (`riferimento`: può non avere un valore, `inserisci(senzaValore)`), con `elemento` per un
   * vettore (al primo, `inserisci({ ognuno })` dà la stessa riga a tutti). */
  | { readonly genere: "chiede"; readonly dato: string; readonly nonValido: boolean; readonly parametro?: "valore" | "riferimento"; readonly elemento?: number }
  | { readonly genere: "finita"; readonly errore?: Segnalazione<CodiceErrore> }
  /** Il controllo statico non la fa partire. */
  | { readonly genere: "non parte"; readonly controllo: EsitoDelControllo };

/** Una riga della console; una scritta senza `aCapo` è l'ultima, ancora aperta, o è stata chiusa da una lettura, o
 * continua nella seguente (una riga lunga andata a capo da sola). `tagliata`: ne restano solo gli ultimi caratteri.
 * `senzaValore`: un parametro per riferimento della funzione eseguita da sola arrivato senza un valore (nessun testo). */
export type VoceDellaConsole =
  | { readonly genere: "scrive"; readonly testo: string; readonly aCapo: boolean; readonly tagliata?: true }
  | { readonly genere: "letto"; readonly dato: string; readonly testo: string; readonly tagliata?: true }
  | { readonly genere: "senzaValore"; readonly dato: string; readonly testo: "" }
  | { readonly genere: "nonValido"; readonly dato: string; readonly testo: string; readonly tagliata?: true };

/** Un livello della pila delle chiamate: la funzione (il suo `id`, anche del programma principale), il blocco dell'ultima
 * azione a quel livello e, in un ciclo `per` o `per ogni`, la sua parte (un `per` che chiama dai suoi limiti, nella
 * partenza). */
export interface LivelloDellaPila {
  readonly funzione: string;
  readonly blocco: string;
  readonly fase?: FaseDelCiclo;
}

/** Una riga più lunga di `caratteri` (contati in codici): va a capo da sola, e le sue parti piene sono righe della
 * console; o se ne tengono gli ultimi `caratteri`, e la riga è segnata come tagliata. */
export interface RigheLunghe {
  readonly caratteri: number;
  readonly modo: "a-capo" | "la-fine";
}
export const righeLunghePredefinite: RigheLunghe = { caratteri: 250, modo: "a-capo" };

/** `righe`: quante righe tengono la tabella di traccia e la console (`righeTenute`); `righeLunghe`: come la console tiene una
 * riga più lunga dei suoi caratteri; `caso`: il caso d'uso, nel modo caso; `tabella: false`: nessuna riga nella
 * tabella di traccia (la riga di comando dei casi, che non la mostra: è metà del tempo di un caso lungo, misurato);
 * `funzione`: l'`id` della procedura o della funzione eseguita da sola (il caso è allora uno dei suoi); `controllo`:
 * l'esito del controllo con quei limiti già fatto da chi chiama, al posto di quello dell'esecuzione (l'interfaccia, che
 * l'ha già fatto coi limiti delle Impostazioni). */
export interface OpzioniDellEsecuzione<C extends CasoDiUnaFunzione = CasoDUso> {
  readonly funzione?: string;
  readonly righe?: number;
  readonly righeLunghe?: RigheLunghe;
  readonly caso?: C;
  readonly tabella?: boolean;
  readonly controllo?: EsitoDelControllo;
}

/** Un caso del programma (`CasoDUso`), o di una funzione eseguita da sola (`CasoDiUnaFunzione`, con `funzione`). */
export class Esecuzione<C extends CasoDiUnaFunzione = CasoDUso> {
  /** I blocchi coi punti di interruzione. */
  puntiDiInterruzione: ReadonlySet<string> = new Set();
  /** La tabella di traccia; con `tabella: false` resta vuota. */
  readonly traccia: Traccia;
  /** La tabella che riceve gli eventi: nessuna con `tabella: false`. */
  readonly #traccia: Traccia | undefined;

  #g: Generator<Passo, Esito, Riga>;
  #stato: Stato;
  /** Un risultato dell'interprete già arrivato e non ancora guardato (il primo evento). */
  #daGuardare: IteratorResult<Passo, Esito> | undefined;
  #comando: Comando = "sopra";
  #partenza: number | undefined;
  /** La riga da dare alla lettura in corso, e il dato che la chiede. */
  #riga: Riga;
  #chiesto = "";
  #nonValido = false;
  /** Nel modo caso: quante voci sono state consegnate, l'output tenuto fino a `#tettoDellOutput` e se ne è rimasto
   * fuori qualcosa. Senza caso il tetto non c'è: l'output non si tiene (la regola sta qui sola). */
  #voci = 0;
  #output = "";
  readonly #tettoDellOutput: number | undefined;
  #outputTagliato = false;
  #esito: EsitoDelCaso | undefined;
  /** Il blocco di fine della radice (il programma principale, o la funzione eseguita da sola): quello di
   * `unused_inputs`. */
  readonly #fine: string;
  /** Senza caso: le righe date alle letture, intere e nell'ordine, come voci di un caso (col dato che le ha chieste; la
   * stessa riga a ogni elemento con `each`, nessun testo per un parametro arrivato senza valore). La console le spezza
   * a righe, e può perderle: un caso d'uso composto dall'esecuzione le prende da qui. */
  readonly #lette: VoceDiUnaFunzione[] = [];
  /** Le righe chiuse della console; la riga aperta (scritta senza a capo) sta a parte, come testo: un oggetto per
   * riga solo quando si chiude. */
  #console: VoceDellaConsole[] = [];
  #aperta: string | undefined;
  /** La riga aperta ha perso il suo inizio (righe lunghe tenute dalla fine). */
  #apertaTagliata = false;
  readonly #righeLunghe: RigheLunghe;
  /** Le righe della console tolte quando se ne tenevano il doppio del tetto. */
  #consoleTagliata = 0;
  readonly #massimoDiRighe: number;
  #passi = 0;
  /** Il blocco dell'ultimo evento: quello su cui cade un errore del motore («Inizio», la funzione, durante i valori
   * iniziali). */
  #bloccoCorrente: string;
  /** La pila delle chiamate all'ultimo evento, dalla radice; la radice, prima del primo. */
  readonly #pila: LivelloDellaPila[];
  /** L'`id` del programma principale: la funzione di un evento che non la dice. */
  readonly #principale: string;

  /** Il progetto eseguito: quello della tabella di traccia anche quando, a esecuzione finita, il progetto
   * mostrato cambia. */
  readonly progetto: Progetto;
  /** Il caso d'uso del modo caso, o nessuno. */
  readonly caso: C | undefined;
  /** La procedura o la funzione eseguita da sola, o nessuna (il programma principale). */
  readonly funzione: string | undefined;
  /** I limiti dati: quelli dell'esito di un caso, che la finestra tiene accanto a lui. */
  readonly limiti: Tetti;
  /** L'unico controllo statico, coi limiti dati. */
  readonly controllo: EsitoDelControllo;

  constructor(p: Progetto, limiti: Tetti, opzioni: OpzioniDellEsecuzione<C> = {}) {
    const { funzione, righe = righeTenute, righeLunghe = righeLunghePredefinite, caso, tabella = true, controllo } = opzioni;
    // Andare a capo ogni zero caratteri non finirebbe: le Impostazioni danno da 50 a 1000, qui si rifiuta il resto.
    if (!Number.isInteger(righeLunghe.caratteri) || righeLunghe.caratteri < 1) throw new Error(`caratteri di una riga non validi: ${righeLunghe.caratteri}`);
    this.progetto = p;
    this.caso = caso;
    this.funzione = funzione;
    this.limiti = limiti;
    this.#massimoDiRighe = righe;
    this.#righeLunghe = righeLunghe;
    this.#tettoDellOutput = caso === undefined ? undefined : caso.expected.output.length + margineDellOutput;
    this.traccia = new Traccia(righe);
    this.#traccia = tabella ? this.traccia : undefined;
    const radice = p.functions.find((f) => (funzione === undefined ? f.kind === "main" : f.id === funzione));
    this.#bloccoCorrente = radice?.id ?? "";
    this.#fine = radice?.end.id ?? "";
    this.#principale = p.functions.find((f) => f.kind === "main")?.id ?? "";
    this.#pila = [{ funzione: radice?.id ?? "", blocco: radice?.id ?? "" }];
    this.controllo = controllo ?? controlla(p, limiti);
    this.#g = eseguiDopoIlControllo(p, this.controllo, funzione);
    const primo = this.#g.next();
    if (primo.done && !primo.value.parte) this.#stato = { genere: "non parte", controllo: primo.value.controllo };
    else {
      this.#stato = { genere: "pronta" };
      this.#daGuardare = primo;
    }
  }

  get stato(): Stato {
    return this.#stato;
  }

  /** Nel modo caso, a esecuzione finita o se il progetto non parte, l'esito del caso; altrimenti nessuno. */
  get esito(): EsitoDelCaso | undefined {
    const caso = this.caso;
    const s = this.#stato;
    if (caso === undefined || (s.genere !== "finita" && s.genere !== "non parte")) return undefined;
    if (this.#esito === undefined) {
      const c = this.controllo;
      if (c.fuoriTappa) this.#esito = { fuoriTappa: true };
      else if (s.genere === "non parte") this.#esito = esitoDelCaso(caso.expected, { output: "", static_error: c.errori[0]!, warnings: c.avvisi }, false);
      else this.#esito = esitoDelCaso(caso.expected, { output: this.#output, ...(s.errore ? { error: s.errore } : {}), warnings: c.avvisi }, this.#outputTagliato);
    }
    return this.#esito;
  }

  /** Quanti caratteri (unità di testo) dell'output l'esecuzione tiene oltre la console: nel modo caso al più l'atteso
   * più il margine, senza caso nessuno. */
  get outputTenuto(): number {
    return this.#output.length;
  }

  /** Le ultime righe della console: l'output, le righe lette e quelle non valide, nell'ordine. */
  get console(): readonly VoceDellaConsole[] {
    const m = this.#massimoDiRighe;
    const righe = this.#aperta === undefined ? this.#console : [...this.#console, this.#rigaAperta(false)];
    return righe.length > m ? righe.slice(-m) : righe;
  }

  /** Quante righe della console non sono più tenute. */
  get consoleTolte(): number {
    const righe = this.#console.length + (this.#aperta === undefined ? 0 : 1);
    return this.#consoleTagliata + Math.max(0, righe - this.#massimoDiRighe);
  }

  /** Senza caso, le righe date alle letture come voci di un caso, intere e nell'ordine; nel modo caso nessuna. */
  get lette(): readonly VoceDiUnaFunzione[] {
    return [...this.#lette];
  }

  /** La pila delle chiamate attive all'ultima azione cominciata, dalla radice (prima della prima, la radice sola). */
  get pila(): readonly LivelloDellaPila[] {
    return [...this.#pila];
  }

  /** Le azioni cominciate: gli eventi dell'interprete. */
  get passi(): number {
    return this.#passi;
  }

  /** Un comando da una pausa o prima della prima azione; si esegue con `fetta`. */
  comanda(c: Comando): void {
    const s = this.#stato;
    if (s.genere !== "pronta" && s.genere !== "pausa") throw new Error(`comando con l'esecuzione ${s.genere}`);
    this.#comando = c;
    this.#partenza = s.genere === "pausa" ? s.profondita : undefined;
    this.#stato = { genere: "in corso" };
  }

  /** La riga per la lettura che l'esecuzione aspetta (`senzaValore` solo per un parametro per riferimento della funzione
   * eseguita da sola); si prosegue con `fetta`, col comando di prima. */
  inserisci(riga: Exclude<Riga, undefined>): void {
    const s = this.#stato;
    if (s.genere !== "chiede") throw new Error(`riga con l'esecuzione ${s.genere}`);
    if (!rigaAmmessa(riga, s)) throw new Error(`riga non ammessa per ${s.dato}`);
    this.#riga = riga;
    this.#stato = { genere: "in corso" };
  }

  /** Un passo, poi avanza finché il comando non si ferma, o finché secondo `orologio` (in millisecondi) non passa
   * `durata`. Fuori da un comando in corso non fa nulla. */
  fetta(orologio: () => number, durata: number): void {
    if (this.#stato.genere !== "in corso") return;
    try {
      this.#avanza(orologio, durata);
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      this.#traccia?.interrotta();
      this.#stato = { genere: "finita", errore: { code: "out_of_memory", block: this.#bloccoCorrente } };
    }
  }

  #avanza(orologio: () => number, durata: number): void {
    const inizio = orologio();
    do this.#guarda(this.#prossimo());
    while (this.#stato.genere === "in corso" && orologio() - inizio < durata);
  }

  /** Una riga chiusa della console. Un valore letto o non valido chiude prima la riga aperta, senza a capo. */
  #aggiungi(v: VoceDellaConsole): void {
    if (v.genere !== "scrive" && this.#aperta !== undefined) {
      this.#console.push(this.#rigaAperta(false));
      this.#aperta = undefined;
      this.#apertaTagliata = false;
    }
    this.#console.push(v);
    // Si taglia ogni `massimo` righe in più, come la tabella.
    const m = this.#massimoDiRighe;
    if (this.#console.length >= 2 * m) {
      this.#consoleTagliata += this.#console.length - m;
      this.#console = this.#console.slice(-m);
    }
  }

  /** La riga aperta come riga della console. */
  #rigaAperta(aCapo: boolean): VoceDellaConsole {
    return { genere: "scrive", testo: this.#aperta ?? "", aCapo, ...(this.#apertaTagliata ? { tagliata: true as const } : {}) };
  }

  /** Ciò che il programma scrive, a righe: ogni a capo chiude la riga aperta (o una vuota), il resto la apre o la
   * completa. */
  #scrivi(testo: string): void {
    let da = 0;
    for (let a = testo.indexOf("\n"); a >= 0; a = testo.indexOf("\n", da)) {
      this.#allunga(testo.slice(da, a));
      this.#aggiungi(this.#rigaAperta(true));
      this.#aperta = undefined;
      this.#apertaTagliata = false;
      da = a + 1;
    }
    if (da < testo.length) this.#allunga(testo.slice(da));
  }

  /** La riga aperta allungata di `pezzo`, nei caratteri di una riga: le parti piene diventano righe (a capo da sola), o
   * se ne tiene la fine. */
  #allunga(pezzo: string): void {
    let riga = (this.#aperta ?? "") + pezzo;
    const { caratteri, modo } = this.#righeLunghe;
    if (modo === "la-fine") {
      const inizio = inizioDegliUltimi(riga, caratteri);
      if (inizio > 0) {
        riga = riga.slice(inizio);
        this.#apertaTagliata = true;
      }
    } else
      for (let fine = dopoIPrimi(riga, caratteri); fine < riga.length; fine = dopoIPrimi(riga, caratteri)) {
        this.#aggiungi({ genere: "scrive", testo: riga.slice(0, fine), aCapo: false });
        riga = riga.slice(fine);
      }
    this.#aperta = riga;
  }

  #prossimo(): IteratorResult<Passo, Esito> {
    const giaArrivato = this.#daGuardare;
    if (giaArrivato !== undefined) {
      this.#daGuardare = undefined;
      return giaArrivato;
    }
    const riga = this.#riga;
    this.#riga = undefined;
    const r = this.#g.next(riga);
    // Una riga che non torna indietro come non valida è stata letta: va nella tabella prima che l'evento
    // successivo chiuda la riga della lettura. Un parametro senza valore non ha una riga: la console lo dice.
    const scritta = typeof riga === "object" ? riga.ognuno : riga;
    const libera = this.caso === undefined;
    if (typeof scritta === "string" && (r.done || !("nonValido" in r.value))) {
      this.#traccia?.letto(scritta);
      this.#leggi(scritta);
      if (libera) this.#lette.push({ data: this.#chiesto, text: scritta, ...(typeof riga === "object" ? { each: true } : {}) });
    } else if (typeof scritta === "string") this.#aggiungi({ genere: "nonValido", dato: this.#chiesto, ...this.#laFine(scritta) });
    else if (scritta === senzaValore) {
      this.#aggiungi({ genere: "senzaValore", dato: this.#chiesto, testo: "" });
      if (libera) this.#lette.push({ data: this.#chiesto, ...(typeof riga === "object" ? { each: true } : {}) });
    }
    return r;
  }

  /** Una riga letta nella console, nei caratteri di una riga: le parti piene sono righe lette (a capo da sola), o se ne
   * tiene la fine. La tabella di traccia la tiene intera. */
  #leggi(riga: string): void {
    const { caratteri, modo } = this.#righeLunghe;
    if (modo === "la-fine") return this.#aggiungi({ genere: "letto", dato: this.#chiesto, ...this.#laFine(riga) });
    let resto = riga;
    for (let fine = dopoIPrimi(resto, caratteri); fine < resto.length; fine = dopoIPrimi(resto, caratteri)) {
      this.#aggiungi({ genere: "letto", dato: this.#chiesto, testo: resto.slice(0, fine) });
      resto = resto.slice(fine);
    }
    this.#aggiungi({ genere: "letto", dato: this.#chiesto, testo: resto });
  }

  /** Gli ultimi caratteri di una riga, segnata come tagliata se ne ha persi. */
  #laFine(riga: string): { readonly testo: string; readonly tagliata?: true } {
    const inizio = inizioDegliUltimi(riga, this.#righeLunghe.caratteri);
    return inizio > 0 ? { testo: riga.slice(inizio), tagliata: true } : { testo: riga };
  }

  /** Nel modo caso: l'esecuzione finisce con l'errore del caso, e la tabella chiude la riga dell'azione in corso. */
  #fermaIlCaso(errore: Segnalazione<CodiceErrore>): void {
    this.#traccia?.interrotta();
    this.#stato = { genere: "finita", errore };
  }

  /** Nel modo caso: l'output scritto, fino al tetto; un carattere fuori dal piano di base non si spezza. Senza caso,
   * nulla. */
  #tieni(testo: string): void {
    const tetto = this.#tettoDellOutput;
    if (tetto === undefined || this.#outputTagliato) return;
    const resto = tetto - this.#output.length;
    if (testo.length <= resto) {
      this.#output += testo;
      return;
    }
    const ultimo = testo.charCodeAt(resto - 1);
    this.#output += testo.slice(0, ultimo >= 0xd800 && ultimo <= 0xdbff ? resto - 1 : resto);
    this.#outputTagliato = true;
  }

  #guarda(r: IteratorResult<Passo, Esito>): void {
    if (r.done) {
      const esito = r.value;
      if (!esito.parte) throw new Error("il controllo statico non è più quello dell'avvio");
      this.#traccia?.fine(esito.dati);
      // Le voci avanzate contano solo a fine normale: dopo un errore l'esito è quell'errore, che viene prima.
      const avanzate = this.caso !== undefined && this.#voci < this.caso.inputs.length;
      const errore = esito.errore ?? (avanzate ? { code: "unused_inputs" as const, block: this.#fine } : undefined);
      this.#stato = errore ? { genere: "finita", errore } : { genere: "finita" };
      // A fine normale la radice sola (le chiamate di ciò che restituisce sono finite); dopo un errore del programma fino
      // al livello dove cade, che lo dice il nucleo (un errore dopo il ritorno cade sulla chiamata; il tetto dei passi sul
      // ciclo di chi chiama), col blocco dell'errore. Il livello dell'errore può non avere ancora un'azione: la funzione
      // si prende dal blocco. Gli errori dell'esito (`unused_inputs`) cadono sulla radice.
      const dove = esito.errore !== undefined ? (esito.livello ?? 0) : 0;
      this.#pila.length = Math.min(this.#pila.length, dove + 1);
      if (esito.errore !== undefined) {
        const funzione = this.#pila[dove]?.funzione ?? funzioneDelBlocco(this.progetto, esito.errore.block) ?? this.#principale;
        this.#pila[dove] = { funzione, blocco: esito.errore.block };
      }
      return;
    }
    const x = r.value;
    if ("evento" in x) {
      this.#passi++;
      if (x.dato === undefined) this.#bloccoCorrente = x.evento;
      const funzione = x.funzione ?? this.#principale;
      this.#pila.length = x.profondita;
      this.#pila.push({ funzione, blocco: x.dato === undefined ? x.evento : funzione, ...(x.fase !== undefined ? { fase: x.fase } : {}) });
      this.#traccia?.evento(x.evento, x.dati, x.dato, x.fase, x.profondita, x.funzione);
      if (fermati(this.#comando, this.#partenza, this.puntiDiInterruzione, x))
        this.#stato = {
          genere: "pausa",
          blocco: x.evento,
          ...(x.dato !== undefined ? { dato: x.dato } : {}),
          ...(x.fase !== undefined ? { fase: x.fase } : {}),
          ...(x.funzione !== undefined ? { funzione: x.funzione } : {}),
          profondita: x.profondita,
        };
    } else if ("condizione" in x) this.#traccia?.condizione(x.condizione);
    else if ("ripresa" in x) {
      this.#pila.length = x.ripresa + 1;
      // L'azione di chi chiama riprende: un errore del motore da qui cade sul suo blocco, non sulla fine della chiamata.
      this.#bloccoCorrente = this.#pila[x.ripresa]!.blocco;
      this.#traccia?.ripresa(x.dati, x.ripresa, x.restituito);
      // Una fermata alla profondità di chi chiama, sul blocco (e la parte del ciclo) della sua azione: non un'azione.
      if (fermatiSullaRipresa(this.#comando, this.#partenza, x.ripresa)) {
        const { blocco, fase, funzione } = this.#pila[x.ripresa]!;
        this.#stato = {
          genere: "pausa",
          blocco,
          ...(fase !== undefined ? { fase } : {}),
          ...(funzione !== this.#principale ? { funzione } : {}),
          profondita: x.ripresa,
          ripresa: x.restituito,
        };
      }
    } else if ("scrive" in x) {
      this.#tieni(x.scrive);
      this.#traccia?.scrive(x.scrive);
      this.#scrivi(x.scrive);
    } else if ("nonValido" in x) {
      if (this.caso !== undefined) this.#fermaIlCaso({ code: "invalid_input", block: x.nonValido });
      else this.#nonValido = true;
    } else {
      this.#chiesto = x.chiedi;
      const caso = this.caso;
      if (caso === undefined) {
        this.#stato = {
          genere: "chiede",
          dato: x.chiedi,
          nonValido: this.#nonValido,
          ...(x.parametro !== undefined ? { parametro: x.parametro } : {}),
          ...(x.elemento !== undefined ? { elemento: x.elemento } : {}),
        };
        this.#nonValido = false;
        return;
      }
      // La voce successiva va alla lettura col comando di prima; senza voci, `undefined` (l'interprete dice
      // `input_exhausted`).
      const voce = caso.inputs[this.#voci];
      if (voce !== undefined && voce.data !== x.chiedi) return this.#fermaIlCaso({ code: "input_mismatch", block: this.#bloccoCorrente });
      if (voce === undefined) return void (this.#riga = undefined);
      this.#voci++;
      // Una voce senza testo è un parametro per riferimento senza valore; con `each`, la riga per ogni elemento di un
      // parametro vettore, al primo. Altrove la voce non è una riga valida.
      const testo = voce.text ?? (x.parametro === "riferimento" ? senzaValore : undefined);
      const riga: Riga = testo === undefined ? undefined : voce.each === true ? { ognuno: testo } : testo;
      if (riga === undefined || !rigaAmmessa(riga, x)) return this.#fermaIlCaso({ code: "invalid_input", block: this.#bloccoCorrente });
      this.#riga = riga;
    }
  }
}

/** Una riga che la lettura `l` ammette: `senzaValore` solo per un parametro per riferimento della funzione eseguita da
 * sola, `ognuno` solo al primo elemento di un suo parametro vettore. */
function rigaAmmessa(riga: Exclude<Riga, undefined>, l: { readonly parametro?: "valore" | "riferimento"; readonly elemento?: number }): boolean {
  const testo = typeof riga === "object" ? riga.ognuno : riga;
  return (testo !== senzaValore || l.parametro === "riferimento") && (typeof riga !== "object" || l.elemento === 0);
}

/** Dove finiscono i primi `n` codici di un testo (un carattere fuori dal piano di base è un codice, due unità). */
function dopoIPrimi(testo: string, n: number): number {
  let i = 0;
  for (let k = 0; k < n && i < testo.length; k++) i += testo.codePointAt(i)! > 0xffff ? 2 : 1;
  return i;
}

/** Dove cominciano gli ultimi `n` codici di un testo. */
function inizioDegliUltimi(testo: string, n: number): number {
  let i = testo.length;
  for (let k = 0; k < n && i > 0; k++) i -= i >= 2 && testo.codePointAt(i - 2)! > 0xffff ? 2 : 1;
  return i;
}
