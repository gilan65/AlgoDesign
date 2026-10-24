// La geometria del tema dei simboli: un dato, non codice. L'impaginazione chiede qui
// misure e proporzioni; i colori non stanno qui ma nelle variabili CSS dell'interfaccia. Il tema è uno
// solo, dell'app, e non entra nel file del progetto.

export interface GeometriaDelTema {
  /** Dimensione del carattere dei blocchi, in pixel al 100%. */
  readonly carattere: number;
  /** Altezza di una riga di testo. */
  readonly altezzaRiga: number;
  /** Spazio fra il testo e il bordo della forma, in orizzontale e in verticale. */
  readonly margineTestoX: number;
  readonly margineTestoY: number;
  /** Il rombo: rapporto fra la sua mezza altezza e la mezza altezza del testo con il margine (maggiore di 1). */
  readonly rapportoRombo: number;
  /** Lo scarto orizzontale dei lati obliqui del parallelogramma di lettura e scrittura. */
  readonly scartoParallelogramma: number;
  /** Lunghezza di un tratto verticale di collegamento fra due blocchi. */
  readonly passoVerticale: number;
  /** Tratto verticale in più dopo un punto di unione o dopo una piega che scende al blocco successivo:
   * la linea che esce si vede, non è quasi tutta punta. */
  readonly discesa: number;
  /** Lunghezza della punta della freccia, a misura fissa (non legata allo spessore della linea). */
  readonly punta: number;
  /** Larghezza del testo di una condizione oltre la quale, nella forma «Su due righe», va a capo. */
  readonly sogliaACapo: number;
  /** Distanza minima fra due rami affiancati (se) e fra un corpo e la linea che ritorna (mentre, ripeti). */
  readonly distanzaRami: number;
  /** Tratto orizzontale minimo fra il vertice di un rombo e la linea che ne scende. */
  readonly uscitaRombo: number;
  /** Spazio fra il vertice del rombo e l'etichetta Vero o Falso. */
  readonly scostamentoEtichetta: number;
  /** Distanza fra la linea del flusso e la nota di un commento. */
  readonly distanzaNota: number;
  /** Raggio del punto di ricongiungimento: un cerchio vuoto, sul cui bordo le linee si fermano. */
  readonly raggioRicongiungimento: number;
  /** Margine intorno all'intero disegno. */
  readonly margineEsterno: number;
  /** Il riquadro tratteggiato di un ciclo `per` o `per ogni`: lo spazio fra il suo contenuto e la linea. */
  readonly margineRiquadro: number;
  /** La distanza dell'intestazione del riquadro dal suo angolo in alto a sinistra. */
  readonly rientroIntestazione: number;
  /** Lo spazio intorno al testo dell'intestazione, che interrompe la linea del riquadro (in verticale la metà). */
  readonly luceIntestazione: number;
  /** Il blocco della chiamata: la distanza delle due righe ai lati dal bordo (il testo ha il suo margine dalle righe). */
  readonly latiDellaChiamata: number;
}

export const geometriaPredefinita: GeometriaDelTema = {
  carattere: 15,
  altezzaRiga: 19,
  margineTestoX: 12,
  margineTestoY: 5,
  rapportoRombo: 2,
  scartoParallelogramma: 14,
  // 36 e non 28: fra due blocchi c'è il punto di inserimento, un «+» di 12 px con almeno 6 px di luce verso
  // il blocco di sopra e verso la punta.
  passoVerticale: 36,
  discesa: 28,
  punta: 8,
  sogliaACapo: 220,
  distanzaRami: 24,
  uscitaRombo: 28,
  scostamentoEtichetta: 6,
  distanzaNota: 20,
  raggioRicongiungimento: 5,
  // 20 e non 16: a sinistra dei blocchi più larghi c'è il pallino del punto di interruzione, staccato dal blocco.
  margineEsterno: 20,
  // Le misure del riquadro dei cicli: 12 fra il contenuto e la linea, l'intestazione a 5 dall'angolo col testo a 10.
  margineRiquadro: 12,
  rientroIntestazione: 5,
  luceIntestazione: 5,
  latiDellaChiamata: 8,
};
