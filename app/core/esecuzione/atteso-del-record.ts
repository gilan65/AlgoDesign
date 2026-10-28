// L'atteso di un record nella tabella di traccia, scritto a mano seguendo il flowchart, senza il nucleo: il CSV in
// italiano riga per riga e le celle cambiate di ogni riga. Nessun valore qui è calcolato.
//
// Il programma è quello del corpus `casi/tipi/copia-di-un-record.algo`: il record `alunno` (nome, classe, voto), `a`
// col valore iniziale {"Anna", "3A", 7} e `b` senza; `b ← a` (la copia campo per campo, un'azione per campo), poi
// `b.voto ← 9`, la scrittura dei due voti, `a.nome ← "Bruno"`, la scrittura dei due nomi. Un record ha una colonna per
// campo, col nome del dato e del campo e il tipo del campo, in ogni forma dei vettori; la regola di un'azione della copia
// è l'assegnazione di quel campo. Le azioni sono 9: il valore iniziale, i tre campi della copia, cinque blocchi e la fine.

const ni = "non inizializzata";
const tre = `${ni};${ni};${ni}`;

/** Il CSV «uguale» in italiano, senza il BOM e senza il CR LF finale. */
export const copiaDelRecordItaliano = [
  "#;Regola;a.nome (stringa);a.classe (stringa);a.voto (intero);b.nome (stringa);b.classe (stringa);b.voto (intero);Condizione;Scrive",
  `0;Inizio;${tre};${tre};;`,
  // il valore iniziale di a
  `1;"a ← {""Anna"", ""3A"", 7}";Anna;3A;7;${tre};;`,
  // la copia, un campo per riga
  `2;b.nome ← a.nome;Anna;3A;7;Anna;${ni};${ni};;`,
  `3;b.classe ← a.classe;Anna;3A;7;Anna;3A;${ni};;`,
  "4;b.voto ← a.voto;Anna;3A;7;Anna;3A;7;;",
  // la copia cambiata, la sorgente no
  "5;b.voto ← 9;Anna;3A;7;Anna;3A;9;;",
  `6;"scrivi a.voto, "" "", b.voto ↵";Anna;3A;7;Anna;3A;9;;7 9 ↵`,
  // la sorgente cambiata, la copia no
  `7;"a.nome ← ""Bruno""";Bruno;3A;7;Anna;3A;9;;`,
  `8;"scrivi a.nome, "" "", b.nome ↵";Bruno;3A;7;Anna;3A;9;;Bruno Anna ↵`,
  "9;Fine;Bruno;3A;7;Anna;3A;9;;",
];

/** Le celle cambiate di ogni riga, dalla 0: «x» cambiata, «.» no, nell'ordine delle sei colonne dei campi. */
export const cambiateDellaCopia = ["......", "xxx...", "...x..", "....x.", ".....x", ".....x", "......", "x.....", "......", "......"];
