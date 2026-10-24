// L'atteso del programma di riferimento della tappa 1 (`casi/tappa-1/riferimento-media-voti.algo`) col suo
// caso d'uso (input 0, 4, 7, 11, 5, 8), scritto a mano seguendo il flowchart, senza il nucleo: la sequenza
// dei blocchi azione per azione e la tabella di traccia esportata in CSV nelle due lingue, riga per riga.
// Nessun valore qui è calcolato: un atteso dedotto dal nucleo darebbe ragione al nucleo qualunque cosa
// faccia.
//
// La tabella: una riga per azione col valore di ogni dato DOPO l'azione, la regola (il testo del blocco
// come nel disegno), l'esito della condizione e ciò che l'azione scrive (o l'input letto, dopo «← »); la
// riga 0 è «Inizio», con ogni dato non inizializzato. Le prime cinque azioni sono i valori iniziali, uno
// per dato nell'ordine della vista dei dati (`contati`, `insufficienti`, `somma`, `i`, `j`, tutti 0), con
// la regola scritta come il loro blocco sotto «Inizio». Il reale `media` vale 20 / 3 e si stampa coi 2
// decimali del progetto.
// Ogni riga del CSV è scritta per intero, separatori e virgolette compresi; il file le unisce con CR LF
// e comincia col BOM (lo dice la prova, non questo file). I commenti fra le righe aiutano a leggere le azioni.

/** Come la sequenza scrive la pausa sul valore iniziale di un dato, che non è un blocco dell'albero. */
export const pausaSulValoreIniziale = (dato: string) => `valore iniziale di ${dato}`;

/** Le 65 azioni, in ordine: i cinque valori iniziali, poi i blocchi. */
export const sequenzaAttesa = [
  "valore iniziale di contati", "valore iniziale di insufficienti", "valore iniziale di somma", "valore iniziale di i", "valore iniziale di j",
  "b3", "b4", "b5", "b2", "b3", "b4", "b2", "b6",
  "b7", "b8", "b9", "b10", "b11", "b12", "b15",
  "b7", "b8", "b9", "b14", "b15",
  "b7", "b8", "b9", "b10", "b11", "b12", "b13", "b15",
  "b7", "b8", "b9", "b10", "b11", "b12", "b15",
  "b7", "b16", "b17", "b18",
  "b19", "b20", "b21", "b19", "b20", "b21", "b19", "b20", "b21",
  "b19", "b20", "b21", "b19", "b20", "b21", "b19", "b20", "b21",
  "b19", "b22", "b24",
];

/** Il CSV in italiano: separatore `;`, decimali con la virgola. */
export const csvItalianoAtteso = [
  "#;Regola;n (intero);voto (intero);media (reale);contati (intero);insufficienti (intero);somma (intero);i (intero);j (intero);Condizione;Scrive",
  "0;Inizio;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;non inizializzata;;",
  // i valori iniziali, uno per azione
  "1;contati ← 0;non inizializzata;non inizializzata;non inizializzata;0;non inizializzata;non inizializzata;non inizializzata;non inizializzata;;",
  "2;insufficienti ← 0;non inizializzata;non inizializzata;non inizializzata;0;0;non inizializzata;non inizializzata;non inizializzata;;",
  "3;somma ← 0;non inizializzata;non inizializzata;non inizializzata;0;0;0;non inizializzata;non inizializzata;;",
  "4;i ← 0;non inizializzata;non inizializzata;non inizializzata;0;0;0;0;non inizializzata;;",
  "5;j ← 0;non inizializzata;non inizializzata;non inizializzata;0;0;0;0;0;;",
  // la prima lettura, e la prima condizione
  "6;leggi n;0;non inizializzata;non inizializzata;0;0;0;0;0;;" + /* la riga letta */ "← 0",
  // vera: n vale 0
  "7;n < 1 or n > 30;0;non inizializzata;non inizializzata;0;0;0;0;0;Vero;",
  '8;"scrivi ""Numero non valido: da 1 a 30"" ↵";0;non inizializzata;non inizializzata;0;0;0;0;0;;Numero non valido: da 1 a 30 ↵',
  "9;n < 1 or n > 30;0;non inizializzata;non inizializzata;0;0;0;0;0;Vero;",
  "10;leggi n;4;non inizializzata;non inizializzata;0;0;0;0;0;;← 4",
  "11;n < 1 or n > 30;4;non inizializzata;non inizializzata;0;0;0;0;0;Falso;",
  "12;n < 1 or n > 30;4;non inizializzata;non inizializzata;0;0;0;0;0;Falso;",
  "13;i ← 0;4;non inizializzata;non inizializzata;0;0;0;0;0;;",
  "14;i < n;4;non inizializzata;non inizializzata;0;0;0;0;0;Vero;",
  "15;leggi voto;4;7;non inizializzata;0;0;0;0;0;;← 7",
  "16;voto >= 1 and voto <= 10;4;7;non inizializzata;0;0;0;0;0;Vero;",
  "17;somma ← somma + voto;4;7;non inizializzata;0;0;7;0;0;;",
  "18;contati ← contati + 1;4;7;non inizializzata;1;0;7;0;0;;",
  "19;voto < 6;4;7;non inizializzata;1;0;7;0;0;Falso;",
  "20;i ← i + 1;4;7;non inizializzata;1;0;7;1;0;;",
  "21;i < n;4;7;non inizializzata;1;0;7;1;0;Vero;",
  "22;leggi voto;4;11;non inizializzata;1;0;7;1;0;;← 11",
  "23;voto >= 1 and voto <= 10;4;11;non inizializzata;1;0;7;1;0;Falso;",
  '24;"scrivi ""Voto ignorato: "", voto ↵";4;11;non inizializzata;1;0;7;1;0;;Voto ignorato: 11 ↵',
  "25;i ← i + 1;4;11;non inizializzata;1;0;7;2;0;;",
  "26;i < n;4;11;non inizializzata;1;0;7;2;0;Vero;",
  "27;leggi voto;4;5;non inizializzata;1;0;7;2;0;;← 5",
  "28;voto >= 1 and voto <= 10;4;5;non inizializzata;1;0;7;2;0;Vero;",
  "29;somma ← somma + voto;4;5;non inizializzata;1;0;12;2;0;;",
  "30;contati ← contati + 1;4;5;non inizializzata;2;0;12;2;0;;",
  "31;voto < 6;4;5;non inizializzata;2;0;12;2;0;Vero;",
  "32;insufficienti ← insufficienti + 1;4;5;non inizializzata;2;1;12;2;0;;",
  "33;i ← i + 1;4;5;non inizializzata;2;1;12;3;0;;",
  "34;i < n;4;5;non inizializzata;2;1;12;3;0;Vero;",
  "35;leggi voto;4;8;non inizializzata;2;1;12;3;0;;← 8",
  "36;voto >= 1 and voto <= 10;4;8;non inizializzata;2;1;12;3;0;Vero;",
  "37;somma ← somma + voto;4;8;non inizializzata;2;1;20;3;0;;",
  "38;contati ← contati + 1;4;8;non inizializzata;3;1;20;3;0;;",
  "39;voto < 6;4;8;non inizializzata;3;1;20;3;0;Falso;",
  "40;i ← i + 1;4;8;non inizializzata;3;1;20;4;0;;",
  "41;i < n;4;8;non inizializzata;3;1;20;4;0;Falso;",
  "42;contati > 0;4;8;non inizializzata;3;1;20;4;0;Vero;",
  "43;media ← converti_a_reale somma / converti_a_reale contati;4;8;6,67;3;1;20;4;0;;",
  '44;"scrivi ""Media: "", media, "" su "", contati, "" voti, insufficienti: "", insufficienti ↵";4;8;6,67;3;1;20;4;0;;Media: 6.67 su 3 voti, insufficienti: 1 ↵',
  "45;j < somma / contati;4;8;6,67;3;1;20;4;0;Vero;",
  '46;"scrivi ""*""";4;8;6,67;3;1;20;4;0;;*',
  "47;j ← j + 1;4;8;6,67;3;1;20;4;1;;",
  "48;j < somma / contati;4;8;6,67;3;1;20;4;1;Vero;",
  '49;"scrivi ""*""";4;8;6,67;3;1;20;4;1;;*',
  "50;j ← j + 1;4;8;6,67;3;1;20;4;2;;",
  "51;j < somma / contati;4;8;6,67;3;1;20;4;2;Vero;",
  '52;"scrivi ""*""";4;8;6,67;3;1;20;4;2;;*',
  "53;j ← j + 1;4;8;6,67;3;1;20;4;3;;",
  "54;j < somma / contati;4;8;6,67;3;1;20;4;3;Vero;",
  '55;"scrivi ""*""";4;8;6,67;3;1;20;4;3;;*',
  "56;j ← j + 1;4;8;6,67;3;1;20;4;4;;",
  "57;j < somma / contati;4;8;6,67;3;1;20;4;4;Vero;",
  '58;"scrivi ""*""";4;8;6,67;3;1;20;4;4;;*',
  "59;j ← j + 1;4;8;6,67;3;1;20;4;5;;",
  "60;j < somma / contati;4;8;6,67;3;1;20;4;5;Vero;",
  '61;"scrivi ""*""";4;8;6,67;3;1;20;4;5;;*',
  "62;j ← j + 1;4;8;6,67;3;1;20;4;6;;",
  "63;j < somma / contati;4;8;6,67;3;1;20;4;6;Falso;",
  '64;"scrivi """" ↵";4;8;6,67;3;1;20;4;6;; ↵',
  "65;Fine;4;8;6,67;3;1;20;4;6;;",
];

/** Il CSV in inglese: separatore `,`, decimali col punto; le celle con una virgola vanno fra virgolette. */
export const csvIngleseAtteso = [
  "#,Rule,n (integer),voto (integer),media (real),contati (integer),insufficienti (integer),somma (integer),i (integer),j (integer),Condition,Writes",
  "0,Start,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,uninitialized,,",
  // i valori iniziali, uno per azione
  "1,contati ← 0,uninitialized,uninitialized,uninitialized,0,uninitialized,uninitialized,uninitialized,uninitialized,,",
  "2,insufficienti ← 0,uninitialized,uninitialized,uninitialized,0,0,uninitialized,uninitialized,uninitialized,,",
  "3,somma ← 0,uninitialized,uninitialized,uninitialized,0,0,0,uninitialized,uninitialized,,",
  "4,i ← 0,uninitialized,uninitialized,uninitialized,0,0,0,0,uninitialized,,",
  "5,j ← 0,uninitialized,uninitialized,uninitialized,0,0,0,0,0,,",
  // la prima lettura, e la prima condizione
  "6,read n,0,uninitialized,uninitialized,0,0,0,0,0,," + /* la riga letta */ "← 0",
  // vera: n vale 0
  "7,n < 1 or n > 30,0,uninitialized,uninitialized,0,0,0,0,0,True,",
  '8,"write ""Numero non valido: da 1 a 30"" ↵",0,uninitialized,uninitialized,0,0,0,0,0,,Numero non valido: da 1 a 30 ↵',
  "9,n < 1 or n > 30,0,uninitialized,uninitialized,0,0,0,0,0,True,",
  "10,read n,4,uninitialized,uninitialized,0,0,0,0,0,,← 4",
  "11,n < 1 or n > 30,4,uninitialized,uninitialized,0,0,0,0,0,False,",
  "12,n < 1 or n > 30,4,uninitialized,uninitialized,0,0,0,0,0,False,",
  "13,i ← 0,4,uninitialized,uninitialized,0,0,0,0,0,,",
  "14,i < n,4,uninitialized,uninitialized,0,0,0,0,0,True,",
  "15,read voto,4,7,uninitialized,0,0,0,0,0,,← 7",
  "16,voto >= 1 and voto <= 10,4,7,uninitialized,0,0,0,0,0,True,",
  "17,somma ← somma + voto,4,7,uninitialized,0,0,7,0,0,,",
  "18,contati ← contati + 1,4,7,uninitialized,1,0,7,0,0,,",
  "19,voto < 6,4,7,uninitialized,1,0,7,0,0,False,",
  "20,i ← i + 1,4,7,uninitialized,1,0,7,1,0,,",
  "21,i < n,4,7,uninitialized,1,0,7,1,0,True,",
  "22,read voto,4,11,uninitialized,1,0,7,1,0,,← 11",
  "23,voto >= 1 and voto <= 10,4,11,uninitialized,1,0,7,1,0,False,",
  '24,"write ""Voto ignorato: "", voto ↵",4,11,uninitialized,1,0,7,1,0,,Voto ignorato: 11 ↵',
  "25,i ← i + 1,4,11,uninitialized,1,0,7,2,0,,",
  "26,i < n,4,11,uninitialized,1,0,7,2,0,True,",
  "27,read voto,4,5,uninitialized,1,0,7,2,0,,← 5",
  "28,voto >= 1 and voto <= 10,4,5,uninitialized,1,0,7,2,0,True,",
  "29,somma ← somma + voto,4,5,uninitialized,1,0,12,2,0,,",
  "30,contati ← contati + 1,4,5,uninitialized,2,0,12,2,0,,",
  "31,voto < 6,4,5,uninitialized,2,0,12,2,0,True,",
  "32,insufficienti ← insufficienti + 1,4,5,uninitialized,2,1,12,2,0,,",
  "33,i ← i + 1,4,5,uninitialized,2,1,12,3,0,,",
  "34,i < n,4,5,uninitialized,2,1,12,3,0,True,",
  "35,read voto,4,8,uninitialized,2,1,12,3,0,,← 8",
  "36,voto >= 1 and voto <= 10,4,8,uninitialized,2,1,12,3,0,True,",
  "37,somma ← somma + voto,4,8,uninitialized,2,1,20,3,0,,",
  "38,contati ← contati + 1,4,8,uninitialized,3,1,20,3,0,,",
  "39,voto < 6,4,8,uninitialized,3,1,20,3,0,False,",
  "40,i ← i + 1,4,8,uninitialized,3,1,20,4,0,,",
  "41,i < n,4,8,uninitialized,3,1,20,4,0,False,",
  "42,contati > 0,4,8,uninitialized,3,1,20,4,0,True,",
  "43,media ← to_real somma / to_real contati,4,8,6.67,3,1,20,4,0,,",
  '44,"write ""Media: "", media, "" su "", contati, "" voti, insufficienti: "", insufficienti ↵",4,8,6.67,3,1,20,4,0,,"Media: 6.67 su 3 voti, insufficienti: 1 ↵"',
  "45,j < somma / contati,4,8,6.67,3,1,20,4,0,True,",
  '46,"write ""*""",4,8,6.67,3,1,20,4,0,,*',
  "47,j ← j + 1,4,8,6.67,3,1,20,4,1,,",
  "48,j < somma / contati,4,8,6.67,3,1,20,4,1,True,",
  '49,"write ""*""",4,8,6.67,3,1,20,4,1,,*',
  "50,j ← j + 1,4,8,6.67,3,1,20,4,2,,",
  "51,j < somma / contati,4,8,6.67,3,1,20,4,2,True,",
  '52,"write ""*""",4,8,6.67,3,1,20,4,2,,*',
  "53,j ← j + 1,4,8,6.67,3,1,20,4,3,,",
  "54,j < somma / contati,4,8,6.67,3,1,20,4,3,True,",
  '55,"write ""*""",4,8,6.67,3,1,20,4,3,,*',
  "56,j ← j + 1,4,8,6.67,3,1,20,4,4,,",
  "57,j < somma / contati,4,8,6.67,3,1,20,4,4,True,",
  '58,"write ""*""",4,8,6.67,3,1,20,4,4,,*',
  "59,j ← j + 1,4,8,6.67,3,1,20,4,5,,",
  "60,j < somma / contati,4,8,6.67,3,1,20,4,5,True,",
  '61,"write ""*""",4,8,6.67,3,1,20,4,5,,*',
  "62,j ← j + 1,4,8,6.67,3,1,20,4,6,,",
  "63,j < somma / contati,4,8,6.67,3,1,20,4,6,False,",
  '64,"write """" ↵",4,8,6.67,3,1,20,4,6,, ↵',
  "65,End,4,8,6.67,3,1,20,4,6,,",
];
