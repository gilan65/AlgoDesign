// Le tabelle di traccia di due programmi del corpus coi cicli, scritte a mano in italiano (separatore «;»): i `per` di
// `per.algo` aperti e chiusi, il `per ogni` di `per-ogni-vettore.algo` nelle tre forme. Le regole degli eventi sono
// i testi dei blocchi della loro fase (chiuso, o una parte che la forma non disegna: l'intestazione, con lo spazio largo
// fra le parole e i valori); la colonna della posizione c'è solo col `per ogni` disegnato con la posizione, e cambia
// sulla partenza e sugli aumenti. Scritte prima di eseguire i programmi, dal loro testo: non vengono dal nucleo.

/** Lo spazio largo dell'intestazione dei cicli (U+2002), costruito: scritto nel sorgente non si vedrebbe. */
const L = String.fromCodePoint(0x2002);

/** Una riga: le celle unite dal separatore. */
const riga = (...celle: string[]) => celle.join(";");

const ni = "non inizializzata";

/** `per.algo`: un `per` da 1 a 5 col passo 2, la scrittura del contatore dopo, un `per` da 3 a 1 col passo -1. */
export function perAtteso(aperto: boolean): string[] {
  const r = (aperta: string, chiusa: string) => (aperto ? aperta : chiusa);
  const primo = `per i${L}da${L}1${L}a${L}5${L}passo${L}2`;
  const secondo = `per i${L}da${L}3${L}a${L}1${L}passo${L}-1`;
  return [
    riga("#", "Regola", "i (intero)", "Condizione", "Scrive"),
    riga("0", "Inizio", ni, "", ""),
    riga("1", r("i ← 1", primo), "1", "", ""),
    riga("2", r("i <= 5", primo), "1", "Vero", ""),
    riga("3", 'scrivi i, " "', "1", "", "1 "),
    riga("4", r("i ← i + 2", primo), "3", "", ""),
    riga("5", r("i <= 5", primo), "3", "Vero", ""),
    riga("6", 'scrivi i, " "', "3", "", "3 "),
    riga("7", r("i ← i + 2", primo), "5", "", ""),
    riga("8", r("i <= 5", primo), "5", "Vero", ""),
    riga("9", 'scrivi i, " "', "5", "", "5 "),
    riga("10", r("i ← i + 2", primo), "7", "", ""),
    riga("11", r("i <= 5", primo), "7", "Falso", ""),
    riga("12", 'scrivi "| ", i, " | "', "7", "", "| 7 | "),
    riga("13", r("i ← 3", secondo), "3", "", ""),
    riga("14", r("i >= 1", secondo), "3", "Vero", ""),
    riga("15", "scrivi i", "3", "", "3"),
    riga("16", r("i ← i - 1", secondo), "2", "", ""),
    riga("17", r("i >= 1", secondo), "2", "Vero", ""),
    riga("18", "scrivi i", "2", "", "2"),
    riga("19", r("i ← i - 1", secondo), "1", "", ""),
    riga("20", r("i >= 1", secondo), "1", "Vero", ""),
    riga("21", "scrivi i", "1", "", "1"),
    riga("22", r("i ← i - 1", secondo), "0", "", ""),
    riga("23", r("i >= 1", secondo), "0", "Falso", ""),
    riga("24", 'scrivi "." ↵', "0", "", ". ↵"),
    riga("25", "Fine", "0", "", ""),
  ];
}

/** `per-ogni-vettore.algo`: la somma degli elementi di v = {3, 1, 4, 1} con un `per ogni`. */
export function perOgniVettoreAtteso(forma: "posizione" | "parole" | "chiuso"): string[] {
  const conPosizione = forma === "posizione";
  /** Le celle dei dati (v[0]…v[3], x, somma) e, con la posizione, quella di `_indice`. */
  const valori = (x: string, somma: string, indice: string, v = ["3", "1", "4", "1"]) => [...v, x, somma, ...(conPosizione ? [indice] : [])];
  const intestazione = `per ogni x${L}in${L}v`;
  // A parole la partenza e l'aumento della posizione non hanno un blocco: la regola è l'intestazione.
  const partenza = { posizione: "_indice ← 0", parole: intestazione, chiuso: intestazione }[forma];
  const controllo = { posizione: "_indice < 4", parole: "c'è un altro elemento in v", chiuso: intestazione }[forma];
  const elemento = { posizione: "x ← v[_indice]", parole: "x ← elemento successivo di v", chiuso: intestazione }[forma];
  const aumento = { posizione: "_indice ← _indice + 1", parole: intestazione, chiuso: intestazione }[forma];
  /** Un giro: il controllo, l'elemento preso, la somma, l'aumento; da `n` (il numero della prima riga). */
  const giro = (n: number, preso: string, prima: string, dopo: string, k: number) => [
    riga(String(n), controllo, ...valori(k === 0 ? ni : x(k - 1), prima, String(k)), "Vero", ""),
    riga(String(n + 1), elemento, ...valori(preso, prima, String(k)), "", ""),
    riga(String(n + 2), "somma ← somma + x", ...valori(preso, dopo, String(k)), "", ""),
    riga(String(n + 3), aumento, ...valori(preso, dopo, String(k + 1)), "", ""),
  ];
  const x = (k: number) => ["3", "1", "4", "1"][k]!;
  return [
    riga("#", "Regola", "v[0] (intero)", "v[1] (intero)", "v[2] (intero)", "v[3] (intero)", "x (intero)", "somma (intero)", ...(conPosizione ? ["_indice (intero)"] : []), "Condizione", "Scrive"),
    riga("0", "Inizio", ...valori(ni, ni, ni, [ni, ni, ni, ni]), "", ""),
    riga("1", "v ← {3, 1, 4, 1}", ...valori(ni, ni, ni), "", ""),
    riga("2", "somma ← 0", ...valori(ni, "0", ni), "", ""),
    riga("3", partenza, ...valori(ni, "0", "0"), "", ""),
    ...giro(4, "3", "0", "3", 0),
    ...giro(8, "1", "3", "4", 1),
    ...giro(12, "4", "4", "8", 2),
    ...giro(16, "1", "8", "9", 3),
    riga("20", controllo, ...valori("1", "9", "4"), "Falso", ""),
    riga("21", "scrivi somma ↵", ...valori("1", "9", "4"), "", "9 ↵"),
    riga("22", "Fine", ...valori("1", "9", "4"), "", ""),
  ];
}

/** Le celle cambiate di `per-ogni-vettore.algo` con la posizione, per le righe dei suoi eventi: quelle di x e di
 * `_indice` (le colonne 4 e 6 dei valori). La partenza e gli aumenti cambiano la posizione, l'elemento preso x; il
 * controllo nulla. */
export const cambiateDelPerOgni: Record<number, number[]> = {
  3: [6],
  4: [],
  5: [4],
  7: [6],
  8: [],
  9: [4],
  11: [6],
  12: [],
  13: [4],
  15: [6],
  16: [],
  17: [4],
  19: [6],
  20: [],
};
