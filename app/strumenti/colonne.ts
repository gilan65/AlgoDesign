// La pagina con due testi di codice affiancati su A4 orizzontale: una sola impaginazione, per il TypeScript col suo
// JavaScript e per due linguaggi a scelta. Da due elenchi di righe del generatore esce una pagina HTML a sé, senza nulla da
// scaricare: si apre nel browser e si stampa con Ctrl+P, su carta o in PDF.
//
// Le fasce: una fascia è un pezzo orizzontale del foglio, con le righe di sinistra e quelle di destra che cominciano alla
// stessa altezza. Quali righe vanno insieme lo dice l'allineamento:
// - `per-riga`: la riga n con la riga n (due testi con le stesse righe, il TypeScript e il suo JavaScript);
// - `per-blocco`: le procedure e funzioni (`partiDelCodice`) nell'ordine del progetto, in fondo ciò che non è di nessuna; dentro
//   una funzione, una fascia per ogni pezzo con la stessa provenienza (il blocco o il dato di `Riga`), appaiando i pezzi nei
//   due testi con la più lunga sottosequenza comune; ciò che resta sta fra due pezzi appaiati.
//
// I fogli: le righe a capo con `aCapo` (come la stampa dell'app) e il numero vero della riga a destra nella sua colonna;
// una fascia che sta in un foglio non si divide; una riga a capo non si divide fra due fogli, se non è più lunga di un
// foglio intero. Il foglio è fatto qui e non dal motore: una riga che non sta si vede dalle misure.
//
// Il passo del carattere non si può misurare (la pagina nasce senza browser): `larghezzaDelCarattere` è più larga di tutti i
// caratteri a spaziatura fissa di `CARATTERI`, e una colonna può avanzare ma non uscire.
//
// CHE COSA NON FA: generare il codice; aprire il browser o stampare; le misure diverse da A4; i caratteri larghi due colonne
// (una colonna per carattere, come `core/genera/stampato.ts`).
import type { Riga } from "../core/genera/forma";
import { aCapo, partiDelCodice, rientroDelSeguito, type ParteDelCodice } from "../core/genera/stampato";
import { INTERLINEA_DEL_CODICE, MARGINI, misureDelCodice, PUNTI_DEL_CODICE, SOLCO, SPAZIO, stringaCss } from "../ui/stampa/parti";

export type Allineamento = "per-riga" | "per-blocco";

/** Una colonna della pagina: il titolo sopra e le righe del generatore. */
export interface Colonna {
  readonly titolo: string;
  readonly righe: readonly Riga[];
}

/** Le righe (da 0) di una fascia, nei due lati. */
export interface Fascia {
  readonly lati: readonly [readonly number[], readonly number[]];
}

const intervallo = (da: number, a: number) => Array.from({ length: a - da }, (_, i) => da + i);

/** I pezzi di una funzione: righe contigue con la stessa provenienza; una riga di struttura resta con quella prima. */
function pezziDi(righe: readonly Riga[], parte: Pick<ParteDelCodice, "da" | "a">): { chiave: string | null; righe: number[] }[] {
  const chiaveDi = (r: Riga) => (r.blocco !== undefined ? `b:${r.blocco}` : r.dato !== undefined ? `d:${r.funzione ?? ""}:${r.dato}` : null);
  const pezzi: { chiave: string | null; righe: number[] }[] = [];
  for (const i of intervallo(parte.da, parte.a)) {
    const k = chiaveDi(righe[i]!);
    const ultimo = pezzi.at(-1);
    if (ultimo !== undefined && (k === null || k === ultimo.chiave)) ultimo.righe.push(i);
    else pezzi.push({ chiave: k, righe: [i] });
  }
  return pezzi;
}

/** Le fasce di una funzione appaiando i pezzi con la stessa chiave nello stesso ordine (la più lunga sottosequenza comune). */
function fasceDeiPezzi(a: ReturnType<typeof pezziDi>, b: ReturnType<typeof pezziDi>): Fascia[] {
  const lungo: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) lungo[i]![j] = a[i]!.chiave !== null && a[i]!.chiave === b[j]!.chiave ? lungo[i + 1]![j + 1]! + 1 : Math.max(lungo[i + 1]![j]!, lungo[i]![j + 1]!);
  const fasce: Fascia[] = [];
  let s: number[] = [];
  let d: number[] = [];
  const chiudi = () => {
    if (s.length > 0 || d.length > 0) fasce.push({ lati: [s, d] });
    s = [];
    d = [];
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i]!.chiave !== null && a[i]!.chiave === b[j]!.chiave) {
      chiudi();
      fasce.push({ lati: [a[i]!.righe, b[j]!.righe] });
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && lungo[i + 1]![j]! >= lungo[i]![j + 1]!)) s.push(...a[i++]!.righe);
    else d.push(...b[j++]!.righe);
  }
  chiudi();
  return fasce;
}

/** Le fasce di due testi: `ordine`, le funzioni nell'ordine del progetto. Ogni riga dei due testi sta in una fascia sola. */
export function fasceDelle(a: readonly Riga[], b: readonly Riga[], allineamento: Allineamento, ordine: readonly string[]): Fascia[] {
  if (allineamento === "per-riga") return intervallo(0, Math.max(a.length, b.length)).map((i) => ({ lati: [i < a.length ? [i] : [], i < b.length ? [i] : []] }));
  const parti = [partiDelCodice(a), partiDelCodice(b)] as const;
  // Le funzioni nell'ordine del progetto; una funzione senza righe in un testo ha il lato vuoto; in fondo ciò che non è di nessuna.
  const chi: (string | undefined)[] = [...ordine.filter((f) => parti.some((p) => p.some((x) => x.funzione === f))), ...(parti.some((p) => p.some((x) => x.funzione === undefined)) ? [undefined] : [])];
  return chi.flatMap((f) => {
    const [x, y] = [parti[0].find((p) => p.funzione === f), parti[1].find((p) => p.funzione === f)];
    if (x === undefined || y === undefined) return [{ lati: [x ? intervallo(x.da, x.a) : [], y ? intervallo(y.da, y.a) : []] } as Fascia];
    return fasceDeiPezzi(pezziDi(a, x), pezziDi(b, y));
  });
}

/** Una riga stampata: il numero (da 0) della riga del testo, il pezzo (0 la riga vera), il testo e la colonna. */
export interface Stampata {
  readonly riga: number;
  readonly pezzo: number;
  readonly testo: string;
  readonly colonna: number;
}
export interface FasciaStampata {
  readonly lati: readonly [readonly Stampata[], readonly Stampata[]];
}
export type Foglio = readonly FasciaStampata[];

/** I fogli delle fasce: `colonne` caratteri per colonna, `righe` righe di codice per foglio. */
export function fogliDelleFasce(a: readonly Riga[], b: readonly Riga[], fasce: readonly Fascia[], misure: { readonly colonne: number; readonly righe: number }): Foglio[] {
  const stampate = (testi: readonly Riga[], riga: number): Stampata[] => {
    const c = aCapo(testi[riga]!.testo, misure.colonne);
    return c.pezzi.map((testo, pezzo) => ({ riga, pezzo, testo, colonna: pezzo === 0 ? c.colonna : c.colonna + rientroDelSeguito }));
  };
  const fogli: FasciaStampata[][] = [];
  let foglio: FasciaStampata[] = [];
  let usate = 0;
  const nuovo = () => {
    if (foglio.length > 0) fogli.push(foglio);
    foglio = [];
    usate = 0;
  };
  /** Dall'inizio di `gruppi` le righe intere che stanno in `spazio`; a foglio vuoto, una riga più lunga del foglio si taglia. */
  const prendi = (gruppi: Stampata[][], spazio: number): Stampata[] => {
    const prese: Stampata[] = [];
    while (gruppi.length > 0 && prese.length + gruppi[0]!.length <= spazio) prese.push(...gruppi.shift()!);
    if (prese.length === 0 && gruppi.length > 0 && spazio === misure.righe) prese.push(...gruppi[0]!.splice(0, spazio));
    return prese;
  };
  for (const f of fasce) {
    const s = f.lati[0].map((r) => stampate(a, r));
    const d = f.lati[1].map((r) => stampate(b, r));
    const altezza = Math.max(s.flat().length, d.flat().length);
    if (usate > 0 && usate + altezza > misure.righe && altezza <= misure.righe) nuovo();
    while (s.length > 0 || d.length > 0) {
      const ps = prendi(s, misure.righe - usate);
      const pd = prendi(d, misure.righe - usate);
      if (ps.length > 0 || pd.length > 0) {
        foglio.push({ lati: [ps, pd] });
        usate += Math.max(ps.length, pd.length);
      }
      if (s.length > 0 || d.length > 0) nuovo();
    }
  }
  nuovo();
  return fogli;
}

/** I caratteri della pagina, gli stessi dell'app; uno che non c'è cede al seguente. */
export const CARATTERI = 'ui-monospace, "Cascadia Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';
/** La larghezza di un carattere in em: Consolas 0,55, Cascadia Mono 0,586, Liberation Mono 0,6, DejaVu Sans Mono 0,602. */
export const larghezzaDelCarattere = 0.61;
const PASSO = (larghezzaDelCarattere * PUNTI_DEL_CODICE * 25.4) / 72;
/** La riga dei titoli delle colonne, in righe di codice. */
const RIGHE_DEI_TITOLI = 2;

const html = (t: string) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
/** Un testo del progetto dentro lo stile: un `<` scritto così non chiude il tag `style`. */
const testoNelloStile = (t: string) => stringaCss(t).replaceAll("<", "\\3c ");

function latoDelFoglio(righe: readonly Stampata[], lato: number, cifre: number): string {
  const una = (r: Stampata) => {
    const numero = r.pezzo === 0 ? String(r.riga + 1) : "↪";
    const testo = r.pezzo === 0 ? " ".repeat(r.colonna) + html(r.testo) : `${" ".repeat(r.colonna - 2)}<span class="barra"> </span> ${html(r.testo)}`;
    return `<div class="riga" data-riga="${r.riga}" data-pezzo="${r.pezzo}" data-colonna="${r.colonna}"><span class="numero" style="width:${cifre}ch">${numero}</span><span class="testo">${testo}</span></div>`;
  };
  return `<pre class="lato" data-lato="${lato}">${righe.map(una).join("")}</pre>`;
}

/** Le parole della pagina, nella lingua di chi la chiede. */
export interface ParoleDellaPagina {
  readonly lingua: string;
  /** L'intestazione dei fogli. */
  readonly testa: string;
  /** Il testo del numero di pagina, con `{n}` e `{m}`. */
  readonly pagina: string;
}

/** La pagina intera, con i fogli che dà. */
export function paginaAffiancata(colonne: readonly [Colonna, Colonna], allineamento: Allineamento, ordine: readonly string[], parole: ParoleDellaPagina): { testo: string; fogli: readonly Foglio[] } {
  const [a, b] = colonne;
  const misure = misureDelCodice(PASSO, Math.max(a.righe.length, b.righe.length));
  const fasce = fasceDelle(a.righe, b.righe, allineamento, ordine);
  const fogli = fogliDelleFasce(a.righe, b.righe, fasce, { colonne: misure.accanto.colonne, righe: misure.accanto.righe - RIGHE_DEI_TITOLI });
  const [prima, mezzo, dopo] = parole.pagina.split(/\{n\}|\{m\}/) as [string, string, string];
  const carattere = 'font: 8.5pt system-ui, -apple-system, "Segoe UI", sans-serif; color: #444444;';
  const sopra = "vertical-align: bottom; padding-bottom: 1.5mm; margin-bottom: 6mm; border-bottom: 0.5pt solid #999999;";
  const sotto = "vertical-align: top; margin-top: 6mm;";
  // Le linee sottili sono bordi, non ombre né sfondi: Ctrl+P non stampa gli sfondi per predefinito. Sono fuori dal flusso: un
  // bordo nel flusso, arrotondato dal motore a un pixel intero, a ogni fascia sposta le righe, e il foglio sfora (misurato).
  const stile = `
@page {
  size: A4 landscape;
  margin: ${MARGINI};
  @top-left { content: ${testoNelloStile(parole.testa)}; ${carattere} ${sopra} }
  @top-center { content: ${SPAZIO}; ${sopra} }
  @top-right { content: ${SPAZIO}; ${sopra} }
  @bottom-left { content: ${SPAZIO}; ${sotto} }
  @bottom-center { content: ${SPAZIO}; ${sotto} }
  @bottom-right { content: ${stringaCss(prima)} counter(page) ${stringaCss(mezzo)} counter(pages) ${stringaCss(dopo)}; ${carattere} ${sotto} }
}
html, body { margin: 0; background: #ffffff; color: #000000; }
.foglio { width: 273mm; height: 170mm; box-sizing: border-box; break-after: page; break-inside: avoid; }
.foglio:last-child { break-after: auto; }
.titoli, .fascia { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: ${SOLCO}mm; }
.titoli { height: ${(RIGHE_DEI_TITOLI * PUNTI_DEL_CODICE * INTERLINEA_DEL_CODICE * 25.4) / 72}mm; font: 600 9pt system-ui, -apple-system, "Segoe UI", sans-serif; }
.lato { margin: 0; font: ${PUNTI_DEL_CODICE}pt / ${INTERLINEA_DEL_CODICE} ${CARATTERI}; white-space: pre; tab-size: 1; }
.riga { display: flex; }
.numero { flex: none; padding-right: 1ch; box-sizing: border-box; text-align: right; color: #777777; }
.barra { border-left: 0.6pt solid #b0b0b0; }
.fascia, .lato { position: relative; }
.per-blocco .fascia + .fascia::before { content: ""; position: absolute; inset: 0 0 auto 0; border-top: 0.25pt solid #dddddd; }
.lato + .lato::before { content: ""; position: absolute; inset: 0 auto 0 -3mm; border-left: 0.25pt solid #dddddd; }
@media screen { body { padding: 6mm; background: #dddddd; } .foglio { background: #ffffff; padding: 0; margin: 0 auto 6mm; outline: 6mm solid #ffffff; } }
`;
  const titoli = `<div class="titoli"><div data-titolo="0">${html(a.titolo)}</div><div data-titolo="1">${html(b.titolo)}</div></div>`;
  const corpo = fogli
    .map((f) => {
      const fasceDelFoglio = f.map((x) => `<div class="fascia">${latoDelFoglio(x.lati[0], 0, misure.cifre)}${latoDelFoglio(x.lati[1], 1, misure.cifre)}</div>`).join("");
      return `<section class="foglio">${titoli}${fasceDelFoglio}</section>`;
    })
    .join("\n");
  return { fogli, testo: `<!doctype html>\n<html lang="${parole.lingua}">\n<head>\n<meta charset="utf-8">\n<title>${html(parole.testa)}</title>\n<style>${stile}</style>\n</head>\n<body class="${allineamento}">\n${corpo}\n</body>\n</html>\n` };
}
