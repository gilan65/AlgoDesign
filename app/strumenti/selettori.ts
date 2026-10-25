// I selettori delle prove che cercano un testo per sottostringa: `getByRole(ruolo, { name })` con un nome stringa senza
// `exact`, e `getByText`, `getByLabel`, `getByTitle`, `getByPlaceholder`, `getByAltText` con una stringa senza `exact`.
// Playwright li confronta per sottostringa e senza maiuscole: un nome tradotto contenuto in un altro («Lingua» in
// «Linguaggio…») rende ambiguo il selettore, o lo fa trovare l'elemento sbagliato. Un nome dato come espressione regolare
// (`/…/` o `new RegExp(…)`) dice da sé come si confronta, e non conta.
//
// Il rilevatore legge il sorgente a una passata, saltando stringhe, modelli, commenti ed espressioni regolari: una
// chiamata scritta dentro una stringa (una sonda) o in un commento non conta. Un modello si salta con le sue espressioni
// (`${…}`), dentro le quali stringhe e modelli annidati si saltano a loro volta: un apice dentro un modello annidato non
// apre una stringa che inghiotte il resto del file. Una stringa o un modello senza fine fermano il rilevatore con un
// errore, perché le chiamate dopo non sarebbero lette.
//
// Che cosa NON guarda:
// - le chiamate dentro le espressioni di un modello (`${…}`): il modello si salta per intero;
// - un'espressione regolare dentro l'espressione di un modello: le sue graffe contano;
// - un nome che arriva da una variabile che vale un'espressione regolare: conta come stringa (oggi nessuno);
// - `hasText` di `filter` e di `locator`, che confronta anche lui per sottostringa (ce ne sono, con testi che non ne
//   contengono altri: si guardano a mano quando un testo cambia);
// - i selettori fuori da Playwright (le prove sul prodotto Linux cercano con XPath, per testo intero).

export type Chiamata = { file: string; riga: number; metodo: string; argomenti: string };

const METODI = ["getByRole", "getByText", "getByLabel", "getByTitle", "getByPlaceholder", "getByAltText"];

/** La fine (esclusa) di una stringa, di un modello o di un commento che comincia in `i`; `i` se lì non comincia nulla. */
function saltaTesto(testo: string, i: number): number {
  const c = testo[i];
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < testo.length && testo[j] !== c) j += testo[j] === "\\" ? 2 : 1;
    return j + 1;
  }
  if (c === "`") {
    let j = i + 1;
    while (j < testo.length && testo[j] !== "`") {
      if (testo[j] === "\\") j += 2;
      else if (testo[j] === "$" && testo[j + 1] === "{") j = fineDellEspressione(testo, j + 2);
      else j++;
    }
    return j + 1;
  }
  if (c === "/" && testo[i + 1] === "/") {
    const fine = testo.indexOf("\n", i);
    return fine < 0 ? testo.length : fine;
  }
  if (c === "/" && testo[i + 1] === "*") {
    const fine = testo.indexOf("*/", i + 2);
    return fine < 0 ? testo.length : fine + 2;
  }
  return i;
}

/** La fine (esclusa) dell'espressione di un modello che comincia in `i`, dopo `${`: fino alla graffa che la chiude,
 * saltando le stringhe, i modelli e i commenti che contiene. */
function fineDellEspressione(testo: string, i: number): number {
  let j = i;
  let livello = 1;
  while (j < testo.length) {
    const salto = saltaTesto(testo, j);
    if (salto !== j) {
      j = salto;
      continue;
    }
    if (testo[j] === "{") livello++;
    else if (testo[j] === "}" && --livello === 0) return j + 1;
    j++;
  }
  return j;
}

/** La fine (esclusa) di un'espressione regolare letterale che comincia in `i`. */
function saltaRegex(testo: string, i: number): number {
  let j = i + 1;
  let classe = false;
  while (j < testo.length && (testo[j] !== "/" || classe)) {
    if (testo[j] === "\\") j++;
    else if (testo[j] === "[") classe = true;
    else if (testo[j] === "]") classe = false;
    j++;
  }
  j++;
  while (/[a-z]/.test(testo[j] ?? "")) j++;
  return j;
}

// Dopo uno di questi caratteri (una parentesi aperta, un separatore, un operatore, anche la freccia `=>`) una `/` apre
// un'espressione regolare e non è una divisione.
const PRIMA_DI_UNA_REGEX = "(,:=[!&|?{};<>+-*%~^";
const PAROLE_PRIMA_DI_UNA_REGEX = ["return", "typeof", "case", "in", "of", "new", "throw", "void", "await", "yield", "delete"];

/** Le chiamate dei metodi di ricerca nel codice di un file, con gli argomenti fra le parentesi. */
export function chiamate(testo: string, file: string): Chiamata[] {
  const fuori: Chiamata[] = [];
  let precedente = ";";
  let i = 0;
  while (i < testo.length) {
    const dopo = saltaTesto(testo, i);
    if (dopo > testo.length) throw new Error(`${file}: una stringa senza fine dalla riga ${testo.slice(0, i).split("\n").length}`);
    if (dopo !== i) {
      if (testo[i] !== "/") precedente = "a";
      i = dopo;
      continue;
    }
    const c = testo[i]!;
    if (c === "/" && PRIMA_DI_UNA_REGEX.includes(precedente)) {
      i = saltaRegex(testo, i);
      precedente = "a";
      continue;
    }
    const parola = /^[A-Za-z_$][\w$]*/.exec(testo.slice(i, i + 40));
    if (parola) {
      const nome = parola[0];
      const prima = testo[i - 1];
      if (METODI.includes(nome) && testo[i + nome.length] === "(" && prima !== undefined && prima === ".") {
        const inizio = i + nome.length + 1;
        let j = inizio;
        let livello = 1;
        let p = "(";
        while (j < testo.length && livello > 0) {
          const salto = saltaTesto(testo, j);
          if (salto !== j) {
            if (testo[j] !== "/") p = "a";
            j = salto;
            continue;
          }
          const d = testo[j]!;
          if (d === "/" && PRIMA_DI_UNA_REGEX.includes(p)) {
            j = saltaRegex(testo, j);
            p = "a";
            continue;
          }
          if (d === "(" || d === "{" || d === "[") livello++;
          if (d === ")" || d === "}" || d === "]") livello--;
          if (!/\s/.test(d)) p = d;
          j++;
        }
        fuori.push({ file, riga: testo.slice(0, i).split("\n").length, metodo: nome, argomenti: testo.slice(inizio, j - 1) });
        i = j;
        precedente = ")";
        continue;
      }
      i += nome.length;
      // Dopo una parola chiave come `return` una `/` apre un'espressione regolare.
      precedente = PAROLE_PRIMA_DI_UNA_REGEX.includes(nome) ? "(" : "a";
      continue;
    }
    if (!/\s/.test(c)) precedente = c;
    i++;
  }
  return fuori;
}

const regex = (valore: string) => valore.startsWith("/") || valore.startsWith("new RegExp");

/** Le chiamate che cercano per sottostringa (vedi in testa). */
export function senzaExact(tutte: readonly Chiamata[]): Chiamata[] {
  return tutte.filter((x) => {
    // Solo `exact: true` confronta il testo intero: `exact: false` è il confronto per sottostringa scritto per esteso.
    if (/\bexact\s*:\s*true\b/.test(x.argomenti)) return false;
    if (x.metodo === "getByRole") {
      // La forma abbreviata `{ name }` è un nome da una variabile, come `{ name: name }`.
      if (/[{,]\s*name\s*[,}]/.test(x.argomenti)) return true;
      const nome = /\bname\s*:\s*([\s\S]{0,12})/.exec(x.argomenti);
      return nome !== null && !regex(nome[1]!.trimStart());
    }
    return !regex(x.argomenti.trimStart());
  });
}
