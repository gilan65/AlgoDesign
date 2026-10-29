// L'atteso di una matrice nella tabella di traccia, scritto a mano seguendo il flowchart, senza il nucleo: il CSV in
// italiano riga per riga nelle tre forme della matrice, e le celle cambiate. Nessun valore qui è calcolato.
//
// Il primo programma (`progettoDellaCopia`): `a`, matrice di 2 righe e 2 colonne di interi col valore iniziale
// {{1, 2}, {3, 4}}, e `b` delle stesse misure senza; `b ← a` (la copia col nome, due «mentre» uno dentro l'altro: la
// riga con `_indice`, la colonna con `_indice2`), poi `b[1][0] ← 7`. Le azioni sono 25: il valore iniziale, le 22 della
// copia (la partenza, per ognuna delle due righe il controllo, la partenza delle colonne, tre azioni per colonna, il
// controllo falso e l'aumento della riga; il controllo falso), l'assegnazione e la fine.
// - Una colonna per riga (la forma predefinita), con la copia espansa: le colonne `a[0]`, `a[1]`, `b[0]`, `b[1]` coi
//   valori in fila fra « · » (un elemento senza valore «–»), poi le due posizioni; la regola di ogni azione della copia
//   è il testo del suo blocco nel disegno espanso.
// - Un elemento per colonna, con la copia espansa: quattro elementi per matrice, tutti con la loro colonna (non più del
//   tetto); è anche il CSV «per elemento» di ogni forma.
// - In fila, con la copia compatta: una colonna per matrice, le righe separate da « ‖ »; la regola di ogni azione della
//   copia è `b ← a`, e le posizioni non hanno colonne.
//
// Il secondo programma (`progettoDelleUndiciRighe`): `m`, matrice di 11 righe e 2 colonne col valore 0 ripetuto, poi
// `m[10][1] ← 5`, `m[0][1] ← 3`, `m[5][0] ← 8`: oltre il tetto in ogni forma. Una colonna per riga: le prime dieci righe
// e la colonna `m[10]` delle altre; un elemento per colonna: i primi dieci elementi (le righe 0–4) e la colonna
// `m[5][0]…m[10][1]`; la colonna degli altri dice gli elementi cambiati, e nella riga del valore iniziale l'elenco
// tagliato come nel blocco.

/** Il primo programma, nella forma del file. */
export const progettoDellaCopia = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "copia" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "a", type: "integer", size: 2, columns: 2, initial: [["1", "2"], ["3", "4"]] },
        { name: "b", type: "integer", size: 2, columns: 2 },
      ],
      body: [
        { id: "b1", kind: "assignment", target: "b", value: "a" },
        { id: "b2", kind: "assignment", target: "b[1][0]", value: "7" },
      ],
      end: { id: "fine" },
    },
  ],
};

/** Il secondo programma, nella forma del file. */
export const progettoDelleUndiciRighe = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "undici" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "m", type: "integer", size: 11, columns: 2, initial: { each: "0" } }],
      body: [
        { id: "b1", kind: "assignment", target: "m[10][1]", value: "5" },
        { id: "b2", kind: "assignment", target: "m[0][1]", value: "3" },
        { id: "b3", kind: "assignment", target: "m[5][0]", value: "8" },
      ],
      end: { id: "fine" },
    },
  ],
};

const ni = "non inizializzata";
/** Una riga di due elementi senza valore, in fila. */
const u = "– · –";
/** Le due righe di `a` dopo il valore iniziale, una per colonna. */
const A = "1 · 2;3 · 4";
const copia = "b[_indice][_indice2] ← a[_indice][_indice2]";

/** Una colonna per riga, la copia espansa: il CSV «uguale» senza il BOM e senza il CR LF finale. */
export const copiaPerRiga = [
  "#;Regola;a[0] (intero);a[1] (intero);b[0] (intero);b[1] (intero);_indice (intero);_indice2 (intero);Condizione;Scrive",
  `0;Inizio;${u};${u};${u};${u};${ni};${ni};;`,
  `1;a ← {{1, 2}, {3, 4}};${A};${u};${u};${ni};${ni};;`,
  // la prima riga
  `2;_indice ← 0;${A};${u};${u};0;${ni};;`,
  `3;_indice < 2;${A};${u};${u};0;${ni};Vero;`,
  `4;_indice2 ← 0;${A};${u};${u};0;0;;`,
  `5;_indice2 < 2;${A};${u};${u};0;0;Vero;`,
  `6;${copia};${A};1 · –;${u};0;0;;`,
  `7;_indice2 ← _indice2 + 1;${A};1 · –;${u};0;1;;`,
  `8;_indice2 < 2;${A};1 · –;${u};0;1;Vero;`,
  `9;${copia};${A};1 · 2;${u};0;1;;`,
  `10;_indice2 ← _indice2 + 1;${A};1 · 2;${u};0;2;;`,
  `11;_indice2 < 2;${A};1 · 2;${u};0;2;Falso;`,
  `12;_indice ← _indice + 1;${A};1 · 2;${u};1;2;;`,
  // la seconda riga
  `13;_indice < 2;${A};1 · 2;${u};1;2;Vero;`,
  `14;_indice2 ← 0;${A};1 · 2;${u};1;0;;`,
  `15;_indice2 < 2;${A};1 · 2;${u};1;0;Vero;`,
  `16;${copia};${A};1 · 2;3 · –;1;0;;`,
  `17;_indice2 ← _indice2 + 1;${A};1 · 2;3 · –;1;1;;`,
  `18;_indice2 < 2;${A};1 · 2;3 · –;1;1;Vero;`,
  `19;${copia};${A};1 · 2;3 · 4;1;1;;`,
  `20;_indice2 ← _indice2 + 1;${A};1 · 2;3 · 4;1;2;;`,
  `21;_indice2 < 2;${A};1 · 2;3 · 4;1;2;Falso;`,
  `22;_indice ← _indice + 1;${A};1 · 2;3 · 4;2;2;;`,
  `23;_indice < 2;${A};1 · 2;3 · 4;2;2;Falso;`,
  // la copia cambiata, la sorgente no
  `24;b[1][0] ← 7;${A};1 · 2;7 · 4;2;2;;`,
  `25;Fine;${A};1 · 2;7 · 4;2;2;;`,
];

/** Le celle cambiate di ogni riga della forma per riga, dalla 0: «x» cambiata, «.» no, nell'ordine delle sei colonne. */
export const cambiateDellaCopiaPerRiga = [
  "......",
  "xx....",
  "....x.",
  "......",
  ".....x",
  "......",
  "..x...",
  ".....x",
  "......",
  "..x...",
  ".....x",
  "......",
  "....x.",
  "......",
  ".....x",
  "......",
  "...x..",
  ".....x",
  "......",
  "...x..",
  ".....x",
  "......",
  "....x.",
  "......",
  "...x..",
  "......",
];

const ni4 = `${ni};${ni};${ni};${ni}`;
const A4 = "1;2;3;4";

/** Un elemento per colonna, la copia espansa: il CSV «uguale» (e «per elemento» di ogni forma con la copia espansa). */
export const copiaPerElemento = [
  "#;Regola;a[0][0] (intero);a[0][1] (intero);a[1][0] (intero);a[1][1] (intero);b[0][0] (intero);b[0][1] (intero);b[1][0] (intero);b[1][1] (intero);_indice (intero);_indice2 (intero);Condizione;Scrive",
  `0;Inizio;${ni4};${ni4};${ni};${ni};;`,
  `1;a ← {{1, 2}, {3, 4}};${A4};${ni4};${ni};${ni};;`,
  `2;_indice ← 0;${A4};${ni4};0;${ni};;`,
  `3;_indice < 2;${A4};${ni4};0;${ni};Vero;`,
  `4;_indice2 ← 0;${A4};${ni4};0;0;;`,
  `5;_indice2 < 2;${A4};${ni4};0;0;Vero;`,
  `6;${copia};${A4};1;${ni};${ni};${ni};0;0;;`,
  `7;_indice2 ← _indice2 + 1;${A4};1;${ni};${ni};${ni};0;1;;`,
  `8;_indice2 < 2;${A4};1;${ni};${ni};${ni};0;1;Vero;`,
  `9;${copia};${A4};1;2;${ni};${ni};0;1;;`,
  `10;_indice2 ← _indice2 + 1;${A4};1;2;${ni};${ni};0;2;;`,
  `11;_indice2 < 2;${A4};1;2;${ni};${ni};0;2;Falso;`,
  `12;_indice ← _indice + 1;${A4};1;2;${ni};${ni};1;2;;`,
  `13;_indice < 2;${A4};1;2;${ni};${ni};1;2;Vero;`,
  `14;_indice2 ← 0;${A4};1;2;${ni};${ni};1;0;;`,
  `15;_indice2 < 2;${A4};1;2;${ni};${ni};1;0;Vero;`,
  `16;${copia};${A4};1;2;3;${ni};1;0;;`,
  `17;_indice2 ← _indice2 + 1;${A4};1;2;3;${ni};1;1;;`,
  `18;_indice2 < 2;${A4};1;2;3;${ni};1;1;Vero;`,
  `19;${copia};${A4};1;2;3;4;1;1;;`,
  `20;_indice2 ← _indice2 + 1;${A4};1;2;3;4;1;2;;`,
  `21;_indice2 < 2;${A4};1;2;3;4;1;2;Falso;`,
  `22;_indice ← _indice + 1;${A4};1;2;3;4;2;2;;`,
  `23;_indice < 2;${A4};1;2;3;4;2;2;Falso;`,
  `24;b[1][0] ← 7;${A4};1;2;7;4;2;2;;`,
  `25;Fine;${A4};1;2;7;4;2;2;;`,
];

/** La matrice `a` in fila, e quella senza valori. */
const Af = "1 · 2 ‖ 3 · 4";
const uf = "– · – ‖ – · –";

/** In fila, la copia compatta: il CSV «uguale». */
export const copiaInFila = [
  "#;Regola;a (intero);b (intero);Condizione;Scrive",
  `0;Inizio;${uf};${uf};;`,
  `1;a ← {{1, 2}, {3, 4}};${Af};${uf};;`,
  `2;b ← a;${Af};${uf};;`,
  `3;b ← a;${Af};${uf};Vero;`,
  `4;b ← a;${Af};${uf};;`,
  `5;b ← a;${Af};${uf};Vero;`,
  `6;b ← a;${Af};1 · – ‖ – · –;;`,
  `7;b ← a;${Af};1 · – ‖ – · –;;`,
  `8;b ← a;${Af};1 · – ‖ – · –;Vero;`,
  `9;b ← a;${Af};1 · 2 ‖ – · –;;`,
  `10;b ← a;${Af};1 · 2 ‖ – · –;;`,
  `11;b ← a;${Af};1 · 2 ‖ – · –;Falso;`,
  `12;b ← a;${Af};1 · 2 ‖ – · –;;`,
  `13;b ← a;${Af};1 · 2 ‖ – · –;Vero;`,
  `14;b ← a;${Af};1 · 2 ‖ – · –;;`,
  `15;b ← a;${Af};1 · 2 ‖ – · –;Vero;`,
  `16;b ← a;${Af};1 · 2 ‖ 3 · –;;`,
  `17;b ← a;${Af};1 · 2 ‖ 3 · –;;`,
  `18;b ← a;${Af};1 · 2 ‖ 3 · –;Vero;`,
  `19;b ← a;${Af};1 · 2 ‖ 3 · 4;;`,
  `20;b ← a;${Af};1 · 2 ‖ 3 · 4;;`,
  `21;b ← a;${Af};1 · 2 ‖ 3 · 4;Falso;`,
  `22;b ← a;${Af};1 · 2 ‖ 3 · 4;;`,
  `23;b ← a;${Af};1 · 2 ‖ 3 · 4;Falso;`,
  `24;b[1][0] ← 7;${Af};1 · 2 ‖ 7 · 4;;`,
  `25;Fine;${Af};1 · 2 ‖ 7 · 4;;`,
];

/** In fila, la cella di `b` nella riga 24 a pezzi: fra parentesi quadre il pezzo cambiato. */
export const pezziDellaRiga24 = ["1 · 2 ‖ ", "[7]", " · 4"];

/** Il valore iniziale di `m`: le prime dieci righe e quante ne restano. */
const regolaDiM = "m ← {{0, 0}, {0, 0}, {0, 0}, {0, 0}, {0, 0}, {0, 0}, {0, 0}, {0, 0}, {0, 0}, {0, 0}, … altri 1}";
const u10 = `${u};${u};${u};${u};${u};${u};${u};${u};${u};${u}`;
const z9 = "0 · 0;0 · 0;0 · 0;0 · 0;0 · 0;0 · 0;0 · 0;0 · 0;0 · 0";

/** Undici righe, una colonna per riga: il CSV «uguale». */
export const undiciPerRiga = [
  "#;Regola;m[0] (intero);m[1] (intero);m[2] (intero);m[3] (intero);m[4] (intero);m[5] (intero);m[6] (intero);m[7] (intero);m[8] (intero);m[9] (intero);m[10] (intero);Condizione;Scrive",
  `0;Inizio;${u10};;;`,
  `1;${regolaDiM};0 · 0;${z9};m[10] ← {{0, 0}};;`,
  `2;m[10][1] ← 5;0 · 0;${z9};m[10][1] 5;;`,
  `3;m[0][1] ← 3;0 · 3;${z9};;;`,
  "4;m[5][0] ← 8;0 · 3;0 · 0;0 · 0;0 · 0;0 · 0;8 · 0;0 · 0;0 · 0;0 · 0;0 · 0;;;",
  "5;Fine;0 · 3;0 · 0;0 · 0;0 · 0;0 · 0;8 · 0;0 · 0;0 · 0;0 · 0;0 · 0;;;",
];

const ni10 = `${ni4};${ni4};${ni};${ni}`;

/** Undici righe, un elemento per colonna coi vettori nella forma dei primi dieci: il CSV «uguale». */
export const undiciPerElemento = [
  "#;Regola;m[0][0] (intero);m[0][1] (intero);m[1][0] (intero);m[1][1] (intero);m[2][0] (intero);m[2][1] (intero);m[3][0] (intero);m[3][1] (intero);m[4][0] (intero);m[4][1] (intero);m[5][0]…m[10][1] (intero);Condizione;Scrive",
  `0;Inizio;${ni10};;;`,
  `1;${regolaDiM};0;0;0;0;0;0;0;0;0;0;m[5][0]…m[10][1] ← {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, … altri 2};;`,
  "2;m[10][1] ← 5;0;0;0;0;0;0;0;0;0;0;m[10][1] 5;;",
  "3;m[0][1] ← 3;0;3;0;0;0;0;0;0;0;0;;;",
  "4;m[5][0] ← 8;0;3;0;0;0;0;0;0;0;0;m[5][0] 8;;",
  "5;Fine;0;3;0;0;0;0;0;0;0;0;;;",
];

/** Undici righe in fila: il CSV «uguale». */
export const undiciInFila = [
  "#;Regola;m (intero);Condizione;Scrive",
  "0;Inizio;– · – ‖ – · – ‖ – · – ‖ – · – ‖ – · – ‖ – · – ‖ – · – ‖ – · – ‖ – · – ‖ – · – ‖ – · –;;",
  `1;${regolaDiM};0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0;;`,
  "2;m[10][1] ← 5;0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 5;;",
  "3;m[0][1] ← 3;0 · 3 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 5;;",
  "4;m[5][0] ← 8;0 · 3 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 8 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 5;;",
  "5;Fine;0 · 3 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 8 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 0 ‖ 0 · 5;;",
];

/** Undici righe, il CSV «per elemento»: ventidue colonne, una per elemento, da ogni forma. */
export const undiciCsvPerElemento = [
  "#;Regola;m[0][0] (intero);m[0][1] (intero);m[1][0] (intero);m[1][1] (intero);m[2][0] (intero);m[2][1] (intero);m[3][0] (intero);m[3][1] (intero);m[4][0] (intero);m[4][1] (intero);m[5][0] (intero);m[5][1] (intero);m[6][0] (intero);m[6][1] (intero);m[7][0] (intero);m[7][1] (intero);m[8][0] (intero);m[8][1] (intero);m[9][0] (intero);m[9][1] (intero);m[10][0] (intero);m[10][1] (intero);Condizione;Scrive",
  `0;Inizio;${ni10};${ni10};${ni};${ni};;`,
  `1;${regolaDiM};0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;;`,
  "2;m[10][1] ← 5;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;5;;",
  "3;m[0][1] ← 3;0;3;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;5;;",
  "4;m[5][0] ← 8;0;3;0;0;0;0;0;0;0;0;8;0;0;0;0;0;0;0;0;0;0;5;;",
  "5;Fine;0;3;0;0;0;0;0;0;0;0;8;0;0;0;0;0;0;0;0;0;0;5;;",
];
