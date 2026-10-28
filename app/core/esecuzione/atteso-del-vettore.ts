// L'atteso di un vettore con più elementi del tetto delle colonne (10), scritto a mano seguendo il flowchart,
// senza il nucleo: la tabella di traccia nelle tre forme (le colonne dei primi dieci con quella degli altri; il
// vettore in fila in una colonna sola; una colonna per elemento) esportata in CSV, nelle due lingue, riga per
// riga; e le celle cambiate di ogni riga. Nessun valore qui è calcolato.
//
// Il programma (`progettoDelVettore`): un vettore `v` di 12 reali senza valore iniziale e un intero `i` che
// parte da 8; un ciclo «mentre i < 12» scrive `v[i] ← i * i` e incrementa `i`. Riempie quindi gli elementi
// dall'ottavo all'undicesimo: due prima del tetto, due oltre. Le azioni sono 15: il valore iniziale di `i`,
// quattro giri da tre azioni, la condizione falsa e la fine. La riga 0 è «Inizio», con ogni dato non
// inizializzato. Il reale si stampa coi 2 decimali del progetto.
//
// Nella colonna degli altri, la riga dell'azione che cambia un elemento oltre il decimo dice quale e il nuovo
// valore («v[10] 100,00»); vuota altrove. In fila, gli elementi separati da « · », un elemento senza valore
// con «–».
//
// Il secondo programma (`progettoDeiValoriIniziali`): due vettori di 12 elementi col valore iniziale, `q` di
// interi con un elenco (i quadrati da 0 a 121) e `r` di reali col valore 0.5 ripetuto in ogni elemento; poi
// `r[11] ← q[11]`. Le azioni sono 4: i due valori iniziali, l'assegnazione, la fine. La regola della riga di un
// valore iniziale è il testo del suo blocco sotto «Inizio» (fra graffe i primi dieci e quanti ne restano); nella
// colonna degli altri, la stessa riga ha l'elenco tagliato allo stesso modo, coi valori come li scrive la
// tabella. Col valore ripetuto mostrato «un solo valore per tutti» cambia solo la regola della riga 2.

/** Il progetto, nella forma del file. */
export const progettoDelVettore = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "quadrati" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "v", type: "real", size: 12 },
        { name: "i", type: "integer", initial: "8" },
      ],
      body: [
        {
          id: "b1",
          kind: "while",
          condition: "i < 12",
          body: [
            { id: "b2", kind: "assignment", target: "v[i]", value: "i * i" },
            { id: "b3", kind: "assignment", target: "i", value: "i + 1" },
          ],
        },
      ],
      end: { id: "b4" },
    },
  ],
};

const ni8 = "non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata";
const un8 = "uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized";

/** Le colonne dei primi dieci e quella degli altri, in italiano. */
export const primiEAltriItaliano = [
  "#;Regola;v[0] (reale);v[1] (reale);v[2] (reale);v[3] (reale);v[4] (reale);v[5] (reale);v[6] (reale);v[7] (reale);v[8] (reale);v[9] (reale);v[10…11] (reale);i (intero);Condizione;Scrive",
  `0;Inizio;${ni8};non inizializzata;non inizializzata;;non inizializzata;;`,
  // il valore iniziale di i
  `1;i ← 8;${ni8};non inizializzata;non inizializzata;;8;;`,
  `2;i < 12;${ni8};non inizializzata;non inizializzata;;8;Vero;`,
  `3;v[i] ← i * i;${ni8};64,00;non inizializzata;;8;;`,
  `4;i ← i + 1;${ni8};64,00;non inizializzata;;9;;`,
  `5;i < 12;${ni8};64,00;non inizializzata;;9;Vero;`,
  `6;v[i] ← i * i;${ni8};64,00;81,00;;9;;`,
  `7;i ← i + 1;${ni8};64,00;81,00;;10;;`,
  `8;i < 12;${ni8};64,00;81,00;;10;Vero;`,
  // il primo elemento oltre il tetto
  `9;v[i] ← i * i;${ni8};64,00;81,00;v[10] 100,00;10;;`,
  `10;i ← i + 1;${ni8};64,00;81,00;;11;;`,
  `11;i < 12;${ni8};64,00;81,00;;11;Vero;`,
  `12;v[i] ← i * i;${ni8};64,00;81,00;v[11] 121,00;11;;`,
  `13;i ← i + 1;${ni8};64,00;81,00;;12;;`,
  `14;i < 12;${ni8};64,00;81,00;;12;Falso;`,
  `15;Fine;${ni8};64,00;81,00;;12;;`,
];

export const primiEAltriInglese = [
  "#,Rule,v[0] (real),v[1] (real),v[2] (real),v[3] (real),v[4] (real),v[5] (real),v[6] (real),v[7] (real),v[8] (real),v[9] (real),v[10…11] (real),i (integer),Condition,Writes",
  `0,Start,${un8},uninitialized,uninitialized,,uninitialized,,`,
  `1,i ← 8,${un8},uninitialized,uninitialized,,8,,`,
  `2,i < 12,${un8},uninitialized,uninitialized,,8,True,`,
  `3,v[i] ← i * i,${un8},64.00,uninitialized,,8,,`,
  `4,i ← i + 1,${un8},64.00,uninitialized,,9,,`,
  `5,i < 12,${un8},64.00,uninitialized,,9,True,`,
  `6,v[i] ← i * i,${un8},64.00,81.00,,9,,`,
  `7,i ← i + 1,${un8},64.00,81.00,,10,,`,
  `8,i < 12,${un8},64.00,81.00,,10,True,`,
  `9,v[i] ← i * i,${un8},64.00,81.00,v[10] 100.00,10,,`,
  `10,i ← i + 1,${un8},64.00,81.00,,11,,`,
  `11,i < 12,${un8},64.00,81.00,,11,True,`,
  `12,v[i] ← i * i,${un8},64.00,81.00,v[11] 121.00,11,,`,
  `13,i ← i + 1,${un8},64.00,81.00,,12,,`,
  `14,i < 12,${un8},64.00,81.00,,12,False,`,
  `15,End,${un8},64.00,81.00,,12,,`,
];

/** Il vettore in fila, in italiano. */
export const inFilaItaliano = [
  "#;Regola;v (reale);i (intero);Condizione;Scrive",
  "0;Inizio;– · – · – · – · – · – · – · – · – · – · – · –;non inizializzata;;",
  "1;i ← 8;– · – · – · – · – · – · – · – · – · – · – · –;8;;",
  "2;i < 12;– · – · – · – · – · – · – · – · – · – · – · –;8;Vero;",
  "3;v[i] ← i * i;– · – · – · – · – · – · – · – · 64,00 · – · – · –;8;;",
  "4;i ← i + 1;– · – · – · – · – · – · – · – · 64,00 · – · – · –;9;;",
  "5;i < 12;– · – · – · – · – · – · – · – · 64,00 · – · – · –;9;Vero;",
  "6;v[i] ← i * i;– · – · – · – · – · – · – · – · 64,00 · 81,00 · – · –;9;;",
  "7;i ← i + 1;– · – · – · – · – · – · – · – · 64,00 · 81,00 · – · –;10;;",
  "8;i < 12;– · – · – · – · – · – · – · – · 64,00 · 81,00 · – · –;10;Vero;",
  "9;v[i] ← i * i;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · –;10;;",
  "10;i ← i + 1;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · –;11;;",
  "11;i < 12;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · –;11;Vero;",
  "12;v[i] ← i * i;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · 121,00;11;;",
  "13;i ← i + 1;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · 121,00;12;;",
  "14;i < 12;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · 121,00;12;Falso;",
  "15;Fine;– · – · – · – · – · – · – · – · 64,00 · 81,00 · 100,00 · 121,00;12;;",
];

export const inFilaInglese = [
  "#,Rule,v (real),i (integer),Condition,Writes",
  "0,Start,– · – · – · – · – · – · – · – · – · – · – · –,uninitialized,,",
  "1,i ← 8,– · – · – · – · – · – · – · – · – · – · – · –,8,,",
  "2,i < 12,– · – · – · – · – · – · – · – · – · – · – · –,8,True,",
  "3,v[i] ← i * i,– · – · – · – · – · – · – · – · 64.00 · – · – · –,8,,",
  "4,i ← i + 1,– · – · – · – · – · – · – · – · 64.00 · – · – · –,9,,",
  "5,i < 12,– · – · – · – · – · – · – · – · 64.00 · – · – · –,9,True,",
  "6,v[i] ← i * i,– · – · – · – · – · – · – · – · 64.00 · 81.00 · – · –,9,,",
  "7,i ← i + 1,– · – · – · – · – · – · – · – · 64.00 · 81.00 · – · –,10,,",
  "8,i < 12,– · – · – · – · – · – · – · – · 64.00 · 81.00 · – · –,10,True,",
  "9,v[i] ← i * i,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · –,10,,",
  "10,i ← i + 1,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · –,11,,",
  "11,i < 12,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · –,11,True,",
  "12,v[i] ← i * i,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · 121.00,11,,",
  "13,i ← i + 1,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · 121.00,12,,",
  "14,i < 12,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · 121.00,12,False,",
  "15,End,– · – · – · – · – · – · – · – · 64.00 · 81.00 · 100.00 · 121.00,12,,",
];

/** Una colonna per elemento, in italiano. */
export const perElementoItaliano = [
  "#;Regola;v[0] (reale);v[1] (reale);v[2] (reale);v[3] (reale);v[4] (reale);v[5] (reale);v[6] (reale);v[7] (reale);v[8] (reale);v[9] (reale);v[10] (reale);v[11] (reale);i (intero);Condizione;Scrive",
  `0;Inizio;${ni8};non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;;`,
  `1;i ← 8;${ni8};non inizializzata;non inizializzata;non inizializzata;non inizializzata;8;;`,
  `2;i < 12;${ni8};non inizializzata;non inizializzata;non inizializzata;non inizializzata;8;Vero;`,
  `3;v[i] ← i * i;${ni8};64,00;non inizializzata;non inizializzata;non inizializzata;8;;`,
  `4;i ← i + 1;${ni8};64,00;non inizializzata;non inizializzata;non inizializzata;9;;`,
  `5;i < 12;${ni8};64,00;non inizializzata;non inizializzata;non inizializzata;9;Vero;`,
  `6;v[i] ← i * i;${ni8};64,00;81,00;non inizializzata;non inizializzata;9;;`,
  `7;i ← i + 1;${ni8};64,00;81,00;non inizializzata;non inizializzata;10;;`,
  `8;i < 12;${ni8};64,00;81,00;non inizializzata;non inizializzata;10;Vero;`,
  `9;v[i] ← i * i;${ni8};64,00;81,00;100,00;non inizializzata;10;;`,
  `10;i ← i + 1;${ni8};64,00;81,00;100,00;non inizializzata;11;;`,
  `11;i < 12;${ni8};64,00;81,00;100,00;non inizializzata;11;Vero;`,
  `12;v[i] ← i * i;${ni8};64,00;81,00;100,00;121,00;11;;`,
  `13;i ← i + 1;${ni8};64,00;81,00;100,00;121,00;12;;`,
  `14;i < 12;${ni8};64,00;81,00;100,00;121,00;12;Falso;`,
  `15;Fine;${ni8};64,00;81,00;100,00;121,00;12;;`,
];

export const perElementoInglese = [
  "#,Rule,v[0] (real),v[1] (real),v[2] (real),v[3] (real),v[4] (real),v[5] (real),v[6] (real),v[7] (real),v[8] (real),v[9] (real),v[10] (real),v[11] (real),i (integer),Condition,Writes",
  `0,Start,${un8},uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,,`,
  `1,i ← 8,${un8},uninitialized,uninitialized,uninitialized,uninitialized,8,,`,
  `2,i < 12,${un8},uninitialized,uninitialized,uninitialized,uninitialized,8,True,`,
  `3,v[i] ← i * i,${un8},64.00,uninitialized,uninitialized,uninitialized,8,,`,
  `4,i ← i + 1,${un8},64.00,uninitialized,uninitialized,uninitialized,9,,`,
  `5,i < 12,${un8},64.00,uninitialized,uninitialized,uninitialized,9,True,`,
  `6,v[i] ← i * i,${un8},64.00,81.00,uninitialized,uninitialized,9,,`,
  `7,i ← i + 1,${un8},64.00,81.00,uninitialized,uninitialized,10,,`,
  `8,i < 12,${un8},64.00,81.00,uninitialized,uninitialized,10,True,`,
  `9,v[i] ← i * i,${un8},64.00,81.00,100.00,uninitialized,10,,`,
  `10,i ← i + 1,${un8},64.00,81.00,100.00,uninitialized,11,,`,
  `11,i < 12,${un8},64.00,81.00,100.00,uninitialized,11,True,`,
  `12,v[i] ← i * i,${un8},64.00,81.00,100.00,121.00,11,,`,
  `13,i ← i + 1,${un8},64.00,81.00,100.00,121.00,12,,`,
  `14,i < 12,${un8},64.00,81.00,100.00,121.00,12,False,`,
  `15,End,${un8},64.00,81.00,100.00,121.00,12,,`,
];

/**
 * Le celle cambiate di ogni riga delle azioni (la riga 0 non ne ha), col nome della colonna: nella forma coi primi
 * dieci la colonna degli altri è cambiata nelle righe che la riempiono; in fila, la cella del vettore e, dentro,
 * il testo dell'elemento cambiato.
 */
export const cambiateAttese = {
  primiEAltri: { 1: ["i"], 3: ["v[8]"], 4: ["i"], 6: ["v[9]"], 7: ["i"], 9: ["v[10…11]"], 10: ["i"], 12: ["v[10…11]"], 13: ["i"] },
  inFila: { 1: ["i"], 3: ["v 64,00"], 4: ["i"], 6: ["v 81,00"], 7: ["i"], 9: ["v 100,00"], 10: ["i"], 12: ["v 121,00"], 13: ["i"] },
} as const;

// ------------------------------------------------------------------- i valori iniziali di due vettori

/** Il progetto coi due vettori inizializzati, nella forma del file. */
export const progettoDeiValoriIniziali = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "inizializzati" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "q", type: "integer", size: 12, initial: ["0", "1", "4", "9", "16", "25", "36", "49", "64", "81", "100", "121"] },
        { name: "r", type: "real", size: 12, initial: { each: "0.5" } },
      ],
      body: [{ id: "b1", kind: "assignment", target: "r[11]", value: "q[11]" }],
      end: { id: "b2" },
    },
  ],
};

const ni10 = "non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata";
const un10 = "uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized";
const q10It = "0;1;4;9;16;25;36;49;64;81";
const q10En = "0,1,4,9,16,25,36,49,64,81";
const r10It = "0,50;0,50;0,50;0,50;0,50;0,50;0,50;0,50;0,50;0,50";
const r10En = "0.50,0.50,0.50,0.50,0.50,0.50,0.50,0.50,0.50,0.50";

/** La regola della riga 2 (il valore iniziale di `r`) quando il valore ripetuto si mostra come valore solo. */
export const regolaDiRComeValoreSolo = { it: "r ← 0.5 in ogni elemento", en: "r ← 0.5 in every element" } as const;
/** La stessa regola come elenco (il predefinito), come la scrivono le righe qui sotto. */
export const regolaDiRComeElenco = {
  it: "r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … altri 2}",
  en: "r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … 2 more}",
} as const;

export const iniziatiPrimiEAltriItaliano = [
  "#;Regola;q[0] (intero);q[1] (intero);q[2] (intero);q[3] (intero);q[4] (intero);q[5] (intero);q[6] (intero);q[7] (intero);q[8] (intero);q[9] (intero);q[10…11] (intero);r[0] (reale);r[1] (reale);r[2] (reale);r[3] (reale);r[4] (reale);r[5] (reale);r[6] (reale);r[7] (reale);r[8] (reale);r[9] (reale);r[10…11] (reale);Condizione;Scrive",
  `0;Inizio;${ni10};;${ni10};;;`,
  // l'elenco tagliato come nel blocco: nella regola il testo del valore iniziale, negli altri i valori della tabella
  `1;q ← {0, 1, 4, 9, 16, 25, 36, 49, 64, 81, … altri 2};${q10It};q[10…11] ← {100, 121};${ni10};;;`,
  `2;r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … altri 2};${q10It};;${r10It};r[10…11] ← {0,50, 0,50};;`,
  `3;r[11] ← q[11];${q10It};;${r10It};r[11] 121,00;;`,
  `4;Fine;${q10It};;${r10It};;;`,
];

export const iniziatiPrimiEAltriInglese = [
  "#,Rule,q[0] (integer),q[1] (integer),q[2] (integer),q[3] (integer),q[4] (integer),q[5] (integer),q[6] (integer),q[7] (integer),q[8] (integer),q[9] (integer),q[10…11] (integer),r[0] (real),r[1] (real),r[2] (real),r[3] (real),r[4] (real),r[5] (real),r[6] (real),r[7] (real),r[8] (real),r[9] (real),r[10…11] (real),Condition,Writes",
  `0,Start,${un10},,${un10},,,`,
  `1,"q ← {0, 1, 4, 9, 16, 25, 36, 49, 64, 81, … 2 more}",${q10En},"q[10…11] ← {100, 121}",${un10},,,`,
  `2,"r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … 2 more}",${q10En},,${r10En},"r[10…11] ← {0.50, 0.50}",,`,
  `3,r[11] ← q[11],${q10En},,${r10En},r[11] 121.00,,`,
  `4,End,${q10En},,${r10En},,,`,
];

export const iniziatiInFilaItaliano = [
  "#;Regola;q (intero);r (reale);Condizione;Scrive",
  "0;Inizio;– · – · – · – · – · – · – · – · – · – · – · –;– · – · – · – · – · – · – · – · – · – · – · –;;",
  "1;q ← {0, 1, 4, 9, 16, 25, 36, 49, 64, 81, … altri 2};0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121;– · – · – · – · – · – · – · – · – · – · – · –;;",
  "2;r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … altri 2};0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121;0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50;;",
  "3;r[11] ← q[11];0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121;0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 121,00;;",
  "4;Fine;0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121;0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 0,50 · 121,00;;",
];

export const iniziatiInFilaInglese = [
  "#,Rule,q (integer),r (real),Condition,Writes",
  "0,Start,– · – · – · – · – · – · – · – · – · – · – · –,– · – · – · – · – · – · – · – · – · – · – · –,,",
  '1,"q ← {0, 1, 4, 9, 16, 25, 36, 49, 64, 81, … 2 more}",0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121,– · – · – · – · – · – · – · – · – · – · – · –,,',
  '2,"r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … 2 more}",0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121,0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50,,',
  "3,r[11] ← q[11],0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121,0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 121.00,,",
  "4,End,0 · 1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100 · 121,0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 0.50 · 121.00,,",
];

export const iniziatiPerElementoItaliano = [
  "#;Regola;q[0] (intero);q[1] (intero);q[2] (intero);q[3] (intero);q[4] (intero);q[5] (intero);q[6] (intero);q[7] (intero);q[8] (intero);q[9] (intero);q[10] (intero);q[11] (intero);r[0] (reale);r[1] (reale);r[2] (reale);r[3] (reale);r[4] (reale);r[5] (reale);r[6] (reale);r[7] (reale);r[8] (reale);r[9] (reale);r[10] (reale);r[11] (reale);Condizione;Scrive",
  `0;Inizio;${ni10};non inizializzata;non inizializzata;${ni10};non inizializzata;non inizializzata;;`,
  `1;q ← {0, 1, 4, 9, 16, 25, 36, 49, 64, 81, … altri 2};${q10It};100;121;${ni10};non inizializzata;non inizializzata;;`,
  `2;r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … altri 2};${q10It};100;121;${r10It};0,50;0,50;;`,
  `3;r[11] ← q[11];${q10It};100;121;${r10It};0,50;121,00;;`,
  `4;Fine;${q10It};100;121;${r10It};0,50;121,00;;`,
];

export const iniziatiPerElementoInglese = [
  "#,Rule,q[0] (integer),q[1] (integer),q[2] (integer),q[3] (integer),q[4] (integer),q[5] (integer),q[6] (integer),q[7] (integer),q[8] (integer),q[9] (integer),q[10] (integer),q[11] (integer),r[0] (real),r[1] (real),r[2] (real),r[3] (real),r[4] (real),r[5] (real),r[6] (real),r[7] (real),r[8] (real),r[9] (real),r[10] (real),r[11] (real),Condition,Writes",
  `0,Start,${un10},uninitialized,uninitialized,${un10},uninitialized,uninitialized,,`,
  `1,"q ← {0, 1, 4, 9, 16, 25, 36, 49, 64, 81, … 2 more}",${q10En},100,121,${un10},uninitialized,uninitialized,,`,
  `2,"r ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … 2 more}",${q10En},100,121,${r10En},0.50,0.50,,`,
  `3,r[11] ← q[11],${q10En},100,121,${r10En},0.50,121.00,,`,
  `4,End,${q10En},100,121,${r10En},0.50,121.00,,`,
];

/** Le celle cambiate dei due vettori inizializzati, in italiano. */
export const iniziatiCambiateAttese = {
  primiEAltri: {
    1: ["q[0]", "q[1]", "q[2]", "q[3]", "q[4]", "q[5]", "q[6]", "q[7]", "q[8]", "q[9]", "q[10…11]"],
    2: ["r[0]", "r[1]", "r[2]", "r[3]", "r[4]", "r[5]", "r[6]", "r[7]", "r[8]", "r[9]", "r[10…11]"],
    3: ["r[10…11]"],
  },
  inFila: {
    1: ["q 0 1 4 9 16 25 36 49 64 81 100 121"],
    2: ["r 0,50 0,50 0,50 0,50 0,50 0,50 0,50 0,50 0,50 0,50 0,50 0,50"],
    3: ["r 121,00"],
  },
} as const;
