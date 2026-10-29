// L'atteso di una tabella (un vettore di record) nella tabella di traccia, scritto a mano seguendo il flowchart, senza il
// nucleo: il CSV in italiano riga per riga nelle tre forme della tabella, e le celle cambiate. Nessun valore qui è
// calcolato.
//
// Il record `alunno` ha due campi, `nome` (stringa) e `voto` (intero).
//
// Il primo programma (`progettoDellaCopia`): `t`, tabella di 2 `alunno` col valore iniziale {{"Anna", 7}, {"Bruno", 9}},
// `u` delle stesse misure senza, `r` un `alunno` senza; `u ← t` (la copia col nome: il ciclo dei record con `_indice`, e
// in ogni giro un'azione per campo), poi `r ← u[1]` e `u[0] ← r` (la copia di un record della tabella, un'azione per
// campo). Le azioni sono 16: il valore iniziale, le 10 della copia della tabella (la partenza, per ognuno dei due record
// il controllo, i due campi e l'aumento; il controllo falso), i due campi di ognuna delle due copie di un record e la fine.
// - Una colonna per record (la forma predefinita), con la copia espansa: le colonne `t[0]`, `t[1]`, `u[0]`, `u[1]` col
//   tipo `alunno` e i campi in fila fra « · » (un campo senza valore «–»), poi `r.nome`, `r.voto` e la posizione; la
//   regola di un'azione della copia della tabella è il testo del suo blocco nel disegno espanso, col campo.
// - Una colonna per campo di ogni record, con la copia espansa: due per record (`t[0].nome`, `t[0].voto`…), tutte (non più
//   del tetto); è anche il CSV «per elemento» di ogni forma con la copia espansa.
// - Una colonna per campo, con la copia compatta: `t[…].nome`, `t[…].voto` coi record in fila; la regola di ogni azione
//   della copia della tabella è `u ← t`, e la posizione non ha colonne; quella della copia di un record è il campo, come
//   in ogni forma.
//
// Il secondo programma (`progettoDegliUndiciRecord`): `t`, tabella di 11 `alunno` col record {"x", 0} ripetuto, poi
// `t[10].voto ← 5`, `t[0].voto ← 3`, `t[5].nome ← "y"`: oltre il tetto. Una colonna per record: i primi dieci e la
// colonna `t[10]` degli altri; una colonna per campo di ogni record: i primi dieci valori (i record 0–4) e la colonna
// `t[5].nome…t[10].voto`; la colonna degli altri dice i campi cambiati, e nella riga del valore iniziale l'elenco tagliato
// come nel blocco. Una colonna per campo non ha tetto.

const alunno = { name: "alunno", fields: [{ name: "nome", type: "string", max_length: 10 }, { name: "voto", type: "integer" }] };

/** Il primo programma, nella forma del file. */
export const progettoDellaCopia = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "copia" },
  records: [alunno],
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "t", type: "record", record: "alunno", size: 2, initial: [['"Anna"', "7"], ['"Bruno"', "9"]] },
        { name: "u", type: "record", record: "alunno", size: 2 },
        { name: "r", type: "record", record: "alunno" },
      ],
      body: [
        { id: "b1", kind: "assignment", target: "u", value: "t" },
        { id: "b2", kind: "assignment", target: "r", value: "u[1]" },
        { id: "b3", kind: "assignment", target: "u[0]", value: "r" },
      ],
      end: { id: "fine" },
    },
  ],
};

/** Il secondo programma, nella forma del file. */
export const progettoDegliUndiciRecord = {
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "undici" },
  records: [alunno],
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "t", type: "record", record: "alunno", size: 11, initial: { each: ['"x"', "0"] } }],
      body: [
        { id: "b1", kind: "assignment", target: "t[10].voto", value: "5" },
        { id: "b2", kind: "assignment", target: "t[0].voto", value: "3" },
        { id: "b3", kind: "assignment", target: "t[5].nome", value: '"y"' },
      ],
      end: { id: "fine" },
    },
  ],
};

const ni = "non inizializzata";
/** Un record senza valori, coi campi in fila. */
const v = "– · –";
/** Il valore iniziale di `t` nella regola, come nel CSV (le virgolette raddoppiate, la cella fra virgolette). */
const regolaDiT = '"t ← {{""Anna"", 7}, {""Bruno"", 9}}"';
const T = "Anna · 7;Bruno · 9";
const nome = "u[_indice].nome ← t[_indice].nome";
const voto = "u[_indice].voto ← t[_indice].voto";

/** Una colonna per record, la copia espansa: il CSV «uguale» senza il BOM e senza il CR LF finale. */
export const copiaPerRecord = [
  "#;Regola;t[0] (alunno);t[1] (alunno);u[0] (alunno);u[1] (alunno);r.nome (stringa);r.voto (intero);_indice (intero);Condizione;Scrive",
  `0;Inizio;${v};${v};${v};${v};${ni};${ni};${ni};;`,
  `1;${regolaDiT};${T};${v};${v};${ni};${ni};${ni};;`,
  // il primo record
  `2;_indice ← 0;${T};${v};${v};${ni};${ni};0;;`,
  `3;_indice < 2;${T};${v};${v};${ni};${ni};0;Vero;`,
  `4;${nome};${T};Anna · –;${v};${ni};${ni};0;;`,
  `5;${voto};${T};Anna · 7;${v};${ni};${ni};0;;`,
  `6;_indice ← _indice + 1;${T};Anna · 7;${v};${ni};${ni};1;;`,
  // il secondo record
  `7;_indice < 2;${T};Anna · 7;${v};${ni};${ni};1;Vero;`,
  `8;${nome};${T};Anna · 7;Bruno · –;${ni};${ni};1;;`,
  `9;${voto};${T};Anna · 7;Bruno · 9;${ni};${ni};1;;`,
  `10;_indice ← _indice + 1;${T};Anna · 7;Bruno · 9;${ni};${ni};2;;`,
  `11;_indice < 2;${T};Anna · 7;Bruno · 9;${ni};${ni};2;Falso;`,
  // un record della tabella in un record, poi un record in un record della tabella
  `12;r.nome ← u[1].nome;${T};Anna · 7;Bruno · 9;Bruno;${ni};2;;`,
  `13;r.voto ← u[1].voto;${T};Anna · 7;Bruno · 9;Bruno;9;2;;`,
  `14;u[0].nome ← r.nome;${T};Bruno · 7;Bruno · 9;Bruno;9;2;;`,
  `15;u[0].voto ← r.voto;${T};Bruno · 9;Bruno · 9;Bruno;9;2;;`,
  `16;Fine;${T};Bruno · 9;Bruno · 9;Bruno;9;2;;`,
];

/** Le celle cambiate di ogni riga della forma per record, dalla 0: «x» cambiata, «.» no, nell'ordine delle sette colonne. */
export const cambiateDellaCopiaPerRecord = [
  ".......",
  "xx.....",
  "......x",
  ".......",
  "..x....",
  "..x....",
  "......x",
  ".......",
  "...x...",
  "...x...",
  "......x",
  ".......",
  "....x..",
  ".....x.",
  "..x....",
  "..x....",
  ".......",
];

const ni2 = `${ni};${ni}`;
const ni4 = `${ni2};${ni2}`;
const T4 = "Anna;7;Bruno;9";

/** Una colonna per campo di ogni record, la copia espansa: il CSV «uguale» (e «per elemento» di ogni forma con la copia
 * espansa). */
export const copiaPerElemento = [
  "#;Regola;t[0].nome (stringa);t[0].voto (intero);t[1].nome (stringa);t[1].voto (intero);u[0].nome (stringa);u[0].voto (intero);u[1].nome (stringa);u[1].voto (intero);r.nome (stringa);r.voto (intero);_indice (intero);Condizione;Scrive",
  `0;Inizio;${ni4};${ni4};${ni2};${ni};;`,
  `1;${regolaDiT};${T4};${ni4};${ni2};${ni};;`,
  `2;_indice ← 0;${T4};${ni4};${ni2};0;;`,
  `3;_indice < 2;${T4};${ni4};${ni2};0;Vero;`,
  `4;${nome};${T4};Anna;${ni};${ni2};${ni2};0;;`,
  `5;${voto};${T4};Anna;7;${ni2};${ni2};0;;`,
  `6;_indice ← _indice + 1;${T4};Anna;7;${ni2};${ni2};1;;`,
  `7;_indice < 2;${T4};Anna;7;${ni2};${ni2};1;Vero;`,
  `8;${nome};${T4};Anna;7;Bruno;${ni};${ni2};1;;`,
  `9;${voto};${T4};Anna;7;Bruno;9;${ni2};1;;`,
  `10;_indice ← _indice + 1;${T4};Anna;7;Bruno;9;${ni2};2;;`,
  `11;_indice < 2;${T4};Anna;7;Bruno;9;${ni2};2;Falso;`,
  `12;r.nome ← u[1].nome;${T4};Anna;7;Bruno;9;Bruno;${ni};2;;`,
  `13;r.voto ← u[1].voto;${T4};Anna;7;Bruno;9;Bruno;9;2;;`,
  `14;u[0].nome ← r.nome;${T4};Bruno;7;Bruno;9;Bruno;9;2;;`,
  `15;u[0].voto ← r.voto;${T4};Bruno;9;Bruno;9;Bruno;9;2;;`,
  `16;Fine;${T4};Bruno;9;Bruno;9;Bruno;9;2;;`,
];

/** I due campi di `t` coi record in fila. */
const Tc = "Anna · Bruno;7 · 9";

/** Una colonna per campo, la copia compatta: il CSV «uguale». */
export const copiaPerCampo = [
  "#;Regola;t[…].nome (stringa);t[…].voto (intero);u[…].nome (stringa);u[…].voto (intero);r.nome (stringa);r.voto (intero);Condizione;Scrive",
  `0;Inizio;${v};${v};${v};${v};${ni};${ni};;`,
  `1;${regolaDiT};${Tc};${v};${v};${ni};${ni};;`,
  `2;u ← t;${Tc};${v};${v};${ni};${ni};;`,
  `3;u ← t;${Tc};${v};${v};${ni};${ni};Vero;`,
  `4;u ← t;${Tc};Anna · –;${v};${ni};${ni};;`,
  `5;u ← t;${Tc};Anna · –;7 · –;${ni};${ni};;`,
  `6;u ← t;${Tc};Anna · –;7 · –;${ni};${ni};;`,
  `7;u ← t;${Tc};Anna · –;7 · –;${ni};${ni};Vero;`,
  `8;u ← t;${Tc};Anna · Bruno;7 · –;${ni};${ni};;`,
  `9;u ← t;${Tc};Anna · Bruno;7 · 9;${ni};${ni};;`,
  `10;u ← t;${Tc};Anna · Bruno;7 · 9;${ni};${ni};;`,
  `11;u ← t;${Tc};Anna · Bruno;7 · 9;${ni};${ni};Falso;`,
  `12;r.nome ← u[1].nome;${Tc};Anna · Bruno;7 · 9;Bruno;${ni};;`,
  `13;r.voto ← u[1].voto;${Tc};Anna · Bruno;7 · 9;Bruno;9;;`,
  `14;u[0].nome ← r.nome;${Tc};Bruno · Bruno;7 · 9;Bruno;9;;`,
  `15;u[0].voto ← r.voto;${Tc};Bruno · Bruno;9 · 9;Bruno;9;;`,
  `16;Fine;${Tc};Bruno · Bruno;9 · 9;Bruno;9;;`,
];

/** Nella forma per campo, la cella di `u[…].voto` nella riga 15 a pezzi: fra parentesi quadre il pezzo cambiato. */
export const pezziDellaRiga15 = ["[9]", " · 9"];

/** Il valore iniziale della seconda tabella: i primi dieci record e quanti ne restano, come nel CSV. */
const regolaDegliUndici =
  '"t ← {{""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, {""x"", 0}, … altri 1}"';
const v10 = `${v};${v};${v};${v};${v};${v};${v};${v};${v};${v}`;
const x9 = "x · 0;x · 0;x · 0;x · 0;x · 0;x · 0;x · 0;x · 0;x · 0";

/** Undici record, una colonna per record: il CSV «uguale». */
export const undiciPerRecord = [
  "#;Regola;t[0] (alunno);t[1] (alunno);t[2] (alunno);t[3] (alunno);t[4] (alunno);t[5] (alunno);t[6] (alunno);t[7] (alunno);t[8] (alunno);t[9] (alunno);t[10] (alunno);Condizione;Scrive",
  `0;Inizio;${v10};;;`,
  `1;${regolaDegliUndici};x · 0;${x9};t[10] ← {{x, 0}};;`,
  `2;t[10].voto ← 5;x · 0;${x9};t[10].voto 5;;`,
  `3;t[0].voto ← 3;x · 3;${x9};;;`,
  '4;"t[5].nome ← ""y""";x · 3;x · 0;x · 0;x · 0;x · 0;y · 0;x · 0;x · 0;x · 0;x · 0;;;',
  "5;Fine;x · 3;x · 0;x · 0;x · 0;x · 0;y · 0;x · 0;x · 0;x · 0;x · 0;;;",
];

const ni10 = `${ni4};${ni4};${ni2}`;

/** Undici record, una colonna per campo di ogni record coi vettori nella forma dei primi dieci: il CSV «uguale». */
export const undiciPerElemento = [
  "#;Regola;t[0].nome (stringa);t[0].voto (intero);t[1].nome (stringa);t[1].voto (intero);t[2].nome (stringa);t[2].voto (intero);t[3].nome (stringa);t[3].voto (intero);t[4].nome (stringa);t[4].voto (intero);t[5].nome…t[10].voto (alunno);Condizione;Scrive",
  `0;Inizio;${ni10};;;`,
  `1;${regolaDegliUndici};x;0;x;0;x;0;x;0;x;0;t[5].nome…t[10].voto ← {x, 0, x, 0, x, 0, x, 0, x, 0, … altri 2};;`,
  "2;t[10].voto ← 5;x;0;x;0;x;0;x;0;x;0;t[10].voto 5;;",
  "3;t[0].voto ← 3;x;3;x;0;x;0;x;0;x;0;;;",
  '4;"t[5].nome ← ""y""";x;3;x;0;x;0;x;0;x;0;t[5].nome y;;',
  "5;Fine;x;3;x;0;x;0;x;0;x;0;;;",
];

/** Undici record in fila per campo. */
const vv = "– · – · – · – · – · – · – · – · – · – · –";
export const undiciPerCampo = [
  "#;Regola;t[…].nome (stringa);t[…].voto (intero);Condizione;Scrive",
  `0;Inizio;${vv};${vv};;`,
  `1;${regolaDegliUndici};x · x · x · x · x · x · x · x · x · x · x;0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0;;`,
  "2;t[10].voto ← 5;x · x · x · x · x · x · x · x · x · x · x;0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 5;;",
  "3;t[0].voto ← 3;x · x · x · x · x · x · x · x · x · x · x;3 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 5;;",
  '4;"t[5].nome ← ""y""";x · x · x · x · x · y · x · x · x · x · x;3 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 5;;',
  "5;Fine;x · x · x · x · x · y · x · x · x · x · x;3 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 5;;",
];

/** Undici record, il CSV «per elemento»: ventidue colonne, una per campo di ogni record, da ogni forma. */
export const undiciCsvPerElemento = [
  "#;Regola;t[0].nome (stringa);t[0].voto (intero);t[1].nome (stringa);t[1].voto (intero);t[2].nome (stringa);t[2].voto (intero);t[3].nome (stringa);t[3].voto (intero);t[4].nome (stringa);t[4].voto (intero);t[5].nome (stringa);t[5].voto (intero);t[6].nome (stringa);t[6].voto (intero);t[7].nome (stringa);t[7].voto (intero);t[8].nome (stringa);t[8].voto (intero);t[9].nome (stringa);t[9].voto (intero);t[10].nome (stringa);t[10].voto (intero);Condizione;Scrive",
  `0;Inizio;${ni10};${ni10};${ni2};;`,
  `1;${regolaDegliUndici};x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;;`,
  "2;t[10].voto ← 5;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;5;;",
  "3;t[0].voto ← 3;x;3;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;0;x;5;;",
  '4;"t[5].nome ← ""y""";x;3;x;0;x;0;x;0;x;0;y;0;x;0;x;0;x;0;x;0;x;5;;',
  "5;Fine;x;3;x;0;x;0;x;0;x;0;y;0;x;0;x;0;x;0;x;0;x;5;;",
];
