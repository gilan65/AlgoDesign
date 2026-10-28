// Il lettore minimo dei PDF che scrive la WebView2 (Skia, misurato con WebView2 155): oggetti numerati, flussi
// `FlateDecode`, caratteri Type0 `Identity-H` (codici di due byte) e caratteri coi codici di un byte, con la loro mappa
// `ToUnicode` (i byte di un codice si leggono dalla mappa), il testo glifo per glifo (`<…> Tj`). Per ogni pagina:
// `MediaBox`, il testo (una riga per blocco `BT … ET`) e i margini, letti dal primo ritaglio (`re W n`) della pagina,
// che Skia mette attorno all'area stampabile, con la trasformazione in vigore in quel punto.
//
// NON guarda: i PDF di altri produttori (flussi a oggetti, tabelle dei riferimenti compresse, mappe con codici di
// lunghezze diverse, testo in `TJ` con le spaziature come spazi: uno spazio vero è un glifo, qui); le immagini; le
// pagine ereditate da un albero con `Resources` sul nodo padre (Skia le scrive sulla pagina). Un oggetto o un flusso che
// non si legge, un contenuto guasto (una stringa esadecimale non chiusa, un delimitatore fuori posto), un glifo che la
// mappa non ha e una stringa che non è fatta di codici interi sono errori nell'elenco `errori`, mai saltati in silenzio
// (un testo non letto sembrerebbe assente); le prove sono in `lettore-pdf.test.ts`.
import { inflateSync } from "node:zlib";

export type Margini = { sinistro: number; destro: number; alto: number; basso: number };
export type PaginaLetta = { mediaBox: number[]; righe: string[]; margini: Margini | null };
export type PdfLetto = { versione: string; titolo: string | null; pagine: PaginaLetta[]; errori: string[] };

type Oggetto = { dizionario: string; flusso: Buffer | null };

/** I punti PDF in millimetri. */
export const mm = (punti: number) => (punti * 25.4) / 72;

function oggetti(pdf: Buffer, errori: string[]): Map<number, Oggetto> {
  const testo = pdf.toString("latin1");
  const fuori = new Map<number, Oggetto>();
  for (const m of testo.matchAll(/(\d+) 0 obj\b/g)) {
    const numero = Number(m[1]);
    const inizio = m.index! + m[0].length;
    const fine = testo.indexOf("endobj", inizio);
    if (fine < 0) {
      errori.push(`oggetto ${numero}: senza endobj`);
      continue;
    }
    const corpo = testo.slice(inizio, fine);
    const flusso = /stream\r?\n/.exec(corpo);
    if (!flusso) {
      fuori.set(numero, { dizionario: corpo.trim(), flusso: null });
      continue;
    }
    const dizionario = corpo.slice(0, flusso.index);
    const lunghezza = /\/Length (\d+)\b(?! 0 R)/.exec(dizionario);
    if (!lunghezza) {
      errori.push(`oggetto ${numero}: flusso senza /Length diretta`);
      continue;
    }
    const da = inizio + flusso.index + flusso[0].length;
    const grezzo = pdf.subarray(da, da + Number(lunghezza[1]));
    try {
      fuori.set(numero, { dizionario, flusso: /\/Filter\s*\/FlateDecode/.test(dizionario) ? inflateSync(grezzo) : grezzo });
    } catch (e) {
      errori.push(`oggetto ${numero}: flusso non decompresso (${String(e)})`);
    }
  }
  return fuori;
}

/** La mappa `ToUnicode` di un carattere: codice esadecimale del glifo → testo. */
function mappaUnicode(cmap: string): Map<string, string> {
  const fuori = new Map<string, string>();
  const utf16 = (esa: string) => String.fromCharCode(...(esa.match(/.{4}/g) ?? []).map((c) => parseInt(c, 16)));
  for (const blocco of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const r of blocco[1]!.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) fuori.set(r[1]!.toUpperCase(), utf16(r[2]!));
  for (const blocco of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
    for (const r of blocco[1]!.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([^\]]*)\])/g)) {
      const [da, a] = [parseInt(r[1]!, 16), parseInt(r[2]!, 16)];
      const larghezza = r[1]!.length;
      const elenco = r[4] ? [...r[4].matchAll(/<([0-9A-Fa-f]+)>/g)].map((x) => x[1]!) : null;
      for (let c = da; c <= a; c++) {
        const codice = c.toString(16).toUpperCase().padStart(larghezza, "0");
        if (elenco) fuori.set(codice, utf16(elenco[c - da] ?? ""));
        else {
          const base = parseInt(r[3]!, 16);
          fuori.set(codice, String.fromCharCode(base + (c - da)));
        }
      }
    }
  return fuori;
}

const riferimento = (dizionario: string, chiave: string) => {
  const m = new RegExp(`/${chiave}\\s+(\\d+) 0 R`).exec(dizionario);
  return m ? Number(m[1]) : null;
};

/** Le parti di un flusso di contenuto: stringhe esadecimali e letterali (come byte), nomi, numeri, operatori, `[` e `]`.
 * Un contenuto guasto (una stringa esadecimale non chiusa, un delimitatore fuori posto) solleva un errore che lo dice. */
function* parti(c: string): Generator<{ tipo: "byte" | "nome" | "numero" | "operatore"; valore: string }> {
  let i = 0;
  while (i < c.length) {
    const ch = c[i]!;
    if (/\s/.test(ch)) i++;
    else if (ch === "%") i = c.indexOf("\n", i) < 0 ? c.length : c.indexOf("\n", i);
    else if (ch === "<" && c[i + 1] !== "<") {
      const fine = c.indexOf(">", i);
      if (fine < 0) throw new Error("stringa esadecimale non chiusa");
      const esa = c.slice(i + 1, fine).replace(/\s/g, "");
      yield { tipo: "byte", valore: Buffer.from(esa.length % 2 ? `${esa}0` : esa, "hex").toString("latin1") };
      i = fine + 1;
    } else if (ch === "(") {
      let livello = 1;
      let s = "";
      i++;
      while (i < c.length && livello > 0) {
        const x = c[i]!;
        if (x === "\\") {
          const y = c[i + 1]!;
          const ottale = /^[0-7]{1,3}/.exec(c.slice(i + 1, i + 4));
          if (ottale) {
            s += String.fromCharCode(parseInt(ottale[0], 8));
            i += 1 + ottale[0].length;
            continue;
          }
          s += ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" } as Record<string, string>)[y] ?? y;
          i += 2;
          continue;
        }
        if (x === "(") livello++;
        if (x === ")" && --livello === 0) break;
        s += x;
        i++;
      }
      yield { tipo: "byte", valore: s };
      i++;
    } else if (ch === "/") {
      const m = /^\/[^\s/<>()[\]{}%]*/.exec(c.slice(i))![0];
      yield { tipo: "nome", valore: m.slice(1) };
      i += m.length;
    } else if (ch === "[" || ch === "]") {
      yield { tipo: "operatore", valore: ch };
      i++;
    } else if (ch === "<" || ch === ">") {
      i += 2;
    } else if (ch === ")" || ch === "{" || ch === "}") {
      throw new Error(`«${ch}» fuori posto nel contenuto`);
    } else {
      const m = /^[^\s/<>()[\]{}%]+/.exec(c.slice(i))![0];
      yield { tipo: /^[-+.\d]/.test(m) ? "numero" : "operatore", valore: m };
      i += m.length;
    }
  }
}

/** Le parti lette fino al primo guasto, che va a `errore`: quelle prima restano. */
function partiLette(c: string, errore: (e: string) => void) {
  const fuori: { tipo: "byte" | "nome" | "numero" | "operatore"; valore: string }[] = [];
  try {
    for (const p of parti(c)) fuori.push(p);
  } catch (e) {
    errore(e instanceof Error ? e.message : String(e));
  }
  return fuori;
}

type Matrice = [number, number, number, number, number, number];
const per = (m: Matrice, n: Matrice): Matrice => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/** Legge il PDF. Gli errori di lettura stanno in `errori`: un PDF con errori non si giudica. */
export function leggiPdf(pdf: Buffer): PdfLetto {
  const errori: string[] = [];
  const versione = /^%PDF-(\d\.\d)/.exec(pdf.subarray(0, 16).toString("latin1"))?.[1] ?? "";
  if (!versione) errori.push("intestazione %PDF- assente");
  const tutti = oggetti(pdf, errori);
  const info = [...tutti.values()].find((o) => /\/Producer/.test(o.dizionario));
  const titolo = info ? (/\/Title \(([^)]*)\)/.exec(info.dizionario)?.[1] ?? null) : null;
  const pagine: PaginaLetta[] = [];
  for (const [numero, o] of tutti) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(o.dizionario)) continue;
    const mediaBox = (/\/MediaBox\s*\[([^\]]*)\]/.exec(o.dizionario)?.[1] ?? "").trim().split(/\s+/).map(Number);
    // I caratteri della pagina: nome della risorsa → mappa ToUnicode.
    const caratteri = new Map<string, Map<string, string>>();
    const risorse = /\/Font\s*<<([^>]*)>>/.exec(o.dizionario)?.[1] ?? "";
    for (const f of risorse.matchAll(/\/(\w+)\s+(\d+) 0 R/g)) {
      const font = tutti.get(Number(f[2]));
      const tu = font ? riferimento(font.dizionario, "ToUnicode") : null;
      const cmap = tu !== null ? tutti.get(tu)?.flusso : null;
      if (!cmap) errori.push(`pagina ${numero}: carattere ${f[1]} senza ToUnicode leggibile`);
      else caratteri.set(f[1]!, mappaUnicode(cmap.toString("latin1")));
    }
    const contenuti = /\/Contents\s*\[([^\]]*)\]/.exec(o.dizionario)?.[1] ?? /\/Contents\s+(\d+ 0 R)/.exec(o.dizionario)?.[1] ?? "";
    const flussi = [...contenuti.matchAll(/(\d+) 0 R/g)].map((r) => tutti.get(Number(r[1]))?.flusso);
    if (flussi.length === 0 || flussi.some((f) => !f)) errori.push(`pagina ${numero}: contenuto non letto`);
    const righe: string[] = [];
    let margini: Margini | null = null;
    let ctm: Matrice = [1, 0, 0, 1, 0, 0];
    const pila: Matrice[] = [];
    let font: Map<string, string> | undefined;
    let numeri: number[] = [];
    let stringhe: string[] = [];
    let rettangolo: number[] | null = null;
    let riga = "";
    // Un glifo che la mappa non ha, o un byte che resta solo, è testo non letto: si conta fra gli errori (le scritte del
    // motore si giudicano dalla loro assenza, e un testo non letto sembrerebbe assente).
    let senzaMappa = 0;
    let dispari = 0;
    const decodifica = (b: string) => {
      if (!font) return "";
      // I byte di un codice, dalla mappa: due per `Identity-H`, uno per un carattere semplice (`<A6>`).
      const byte = Math.max(1, (font.keys().next().value?.length ?? 4) / 2);
      if (b.length % byte !== 0) dispari++;
      let s = "";
      for (let k = 0; k + byte <= b.length; k += byte) {
        let n = 0;
        for (let j = 0; j < byte; j++) n = n * 256 + b.charCodeAt(k + j);
        const codice = n.toString(16).toUpperCase().padStart(byte * 2, "0");
        const testo = font.get(codice);
        if (testo === undefined) senzaMappa++;
        s += testo ?? "�";
      }
      return s;
    };
    for (const flusso of flussi) {
      if (!flusso) continue;
      for (const p of partiLette(flusso.toString("latin1"), (e) => errori.push(`pagina ${numero}: ${e}`))) {
        if (p.tipo === "numero") numeri.push(Number(p.valore));
        else if (p.tipo === "byte") stringhe.push(p.valore);
        else if (p.tipo === "nome") stringhe.push(`/${p.valore}`);
        else {
          switch (p.valore) {
            case "q":
              pila.push(ctm);
              break;
            case "Q":
              ctm = pila.pop() ?? ctm;
              break;
            case "cm":
              ctm = per(numeri.slice(-6) as Matrice, ctm);
              break;
            case "re":
              rettangolo = numeri.slice(-4);
              break;
            case "W":
            case "W*":
              if (!margini && rettangolo && mediaBox.length === 4) {
                const [x, y, w, h] = rettangolo as [number, number, number, number];
                const punto = (a: number, b: number) => [ctm[0] * a + ctm[2] * b + ctm[4], ctm[1] * a + ctm[3] * b + ctm[5]] as const;
                const [p1, p2] = [punto(x, y), punto(x + w, y + h)];
                margini = {
                  sinistro: Math.min(p1[0], p2[0]) - mediaBox[0]!,
                  destro: mediaBox[2]! - Math.max(p1[0], p2[0]),
                  basso: Math.min(p1[1], p2[1]) - mediaBox[1]!,
                  alto: mediaBox[3]! - Math.max(p1[1], p2[1]),
                };
              }
              break;
            case "Tf":
              font = caratteri.get(stringhe.at(-1)?.slice(1) ?? "");
              if (!font) errori.push(`pagina ${numero}: carattere ${stringhe.at(-1)} senza mappa`);
              break;
            case "Tj":
            case "'":
            case '"':
              riga += decodifica(stringhe.at(-1) ?? "");
              break;
            case "TJ": {
              // Le stringhe fra `[` e `]`: l'ultima parentesi aperta è segnata nell'elenco delle stringhe.
              const da = stringhe.lastIndexOf("[");
              riga += stringhe.slice(da + 1).map(decodifica).join("");
              break;
            }
            case "[":
              stringhe.push("[");
              continue;
            case "]":
              continue;
            case "BT":
              riga = "";
              break;
            case "ET":
              if (riga) righe.push(riga);
              riga = "";
              break;
          }
          numeri = [];
          stringhe = [];
        }
      }
    }
    if (senzaMappa > 0 || dispari > 0) errori.push(`pagina ${numero}: ${senzaMappa} glifi senza la mappa del carattere, ${dispari} stringhe di byte dispari`);
    pagine.push({ mediaBox, righe, margini });
  }
  if (pagine.length === 0) errori.push("nessuna pagina");
  return { versione, titolo, pagine, errori };
}
