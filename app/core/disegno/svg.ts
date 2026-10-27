// Il flowchart di una funzione in SVG, scritto dal nucleo dai numeri dell'impaginazione (`Disegno`), senza DOM: la
// stampa e l'esportazione disegnano da qui, mai dalla tela della finestra (che porta lo zoom, la scelta, i «+», i campi).
// Gli elementi sono quelli della tela (`ui/disegno/Flowchart.tsx`, la funzione `parti`), nello stesso ordine, con gli
// stessi attributi `data-*` e gli stessi numeri passati senza conti: i riquadri dei cicli, le linee, le didascalie, le
// forme col testo per righe (e a pezzi con lo stile), i segni dell'esecuzione, le etichette Vero e Falso, le unioni. I
// colori al posto delle variabili CSS vengono dalla tavolozza data (`tavolozza.ts`) nel modo scelto; il carattere è
// quello con cui il testo è stato misurato (lo dà chi chiama); la geometria del tema dà la dimensione del testo e della
// punta. Il disegno ha sotto un rettangolo del colore dello sfondo (il foglio).
//
// I segni dell'esecuzione (il blocco corrente, la punta che entra, il «↩» della ripresa, la riga di una Lettura con la
// domanda, i punti di interruzione) ci sono solo se chi chiama li dà: le regole e le posizioni sono quelle della tela
// (`segni.ts`).
//
// Un foglio della stampa (`svgDelFoglio`) è una finestra sul disegno (`viewBox`) alla scala data; dove il foglio ha un
// taglio (`fogli.ts`), le linee che lo attraversano sono tratteggiate per `tratteggio` unità dal taglio: sopra la linea,
// un tratteggio del colore dello sfondo (la punta della freccia resta intera).
//
// Che cosa questo file NON fa:
// - i segni della finestra che non sono del disegno: la scelta, i «+», i bollini degli errori e degli avvisi, i nomi del
//   watch, la copia che si trascina;
// - arrotondare: le coordinate hanno i decimali dell'impaginazione (`String` di un numero);
// - misurare il testo: lo ha già misurato l'impaginazione, col carattere che chi chiama ripete qui.
import type { Disegno, Elemento, Forma, Punto, Rettangolo } from "./impaginazione";
import { tratteggio, type Foglio } from "./fogli";
import { CORPO_DELLA_RIPRESA, pallino, punta, RAGGIO_DEL_PALLINO, ripresa, segniDelDisegno, type SegniDellEsecuzione } from "./segni";
import { tavolozzaNelModo, type GenereDelColore, type ModoDiColore, type Tavolozza } from "./tavolozza";
import type { GeometriaDelTema } from "./tema";

export interface OpzioniDelSvg {
  readonly geometria: GeometriaDelTema;
  readonly tavolozza: Tavolozza;
  /** Predefinito: a colori. */
  readonly modo?: ModoDiColore;
  /** La famiglia CSS del carattere con cui l'impaginazione ha misurato il testo. */
  readonly carattere: string;
  /** Il riquadro dei cicli col fondo colorato (l'opzione dell'app); mai in bianco e nero. */
  readonly fondoDeiCicli?: boolean;
  /** I segni dell'esecuzione in pausa; senza, il flowchart pulito. */
  readonly segni?: SegniDellEsecuzione;
  /** Il prefisso degli identificatori (la punta): distingue i disegni nella stessa pagina. Predefinito «disegno». */
  readonly id?: string;
}

const n = (x: number) => String(x);
const punti = (ps: readonly Punto[]) => ps.map((p) => `${n(p.x)},${n(p.y)}`).join(" ");
const testo = (t: string) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const CENTRATO = 'text-anchor="middle" dominant-baseline="central"';

/** Il colore del genere della forma; il rombo di un ciclo ha quello dei cicli. L'intestazione di un riquadro non ha un
 * genere: ha il colore dello sfondo. */
const genereDellaForma: Record<Forma, GenereDelColore | undefined> = {
  inizio: "inizioEFine",
  fine: "inizioEFine",
  assegnazione: "assegnazione",
  lettura: "lettura",
  scrittura: "scrittura",
  condizione: "se",
  commento: "commento",
  intestazione: undefined,
  chiamata: "procedura",
};

/** Un rettangolo dentro un altro (il fondo solo sul riquadro più esterno: dentro un altro il velo si sommerebbe). */
const contiene = (fuori: Rettangolo, dentro: Rettangolo) =>
  dentro.x >= fuori.x && dentro.y >= fuori.y && dentro.x + dentro.larghezza <= fuori.x + fuori.larghezza && dentro.y + dentro.altezza <= fuori.y + fuori.altezza;

/** Il contorno di una forma, coi colori del suo stato: blocco corrente, col punto di interruzione, o com'è. */
function contorno(e: Elemento, t: Tavolozza, stato: "corrente" | "punto" | undefined): string {
  const genere = e.ciclo === true ? "cicli" : genereDellaForma[e.forma];
  const fill = stato === "corrente" ? t.corrente : genere === undefined ? t.sfondo : t.forme[genere];
  const tratto =
    stato === "corrente" ? `stroke="${t.bordoCorrente}" stroke-width="4"`
    : stato === "punto" ? `stroke="${t.punto}" stroke-width="2"`
    : genere === undefined ? `stroke="none"`
    : `stroke="${t.bordo}" stroke-width="1.5"`;
  const tratteggiato = e.forma === "commento" ? ` stroke-dasharray="4 3"` : "";
  if (e.forma === "inizio" || e.forma === "fine") {
    const { x, y, larghezza, altezza } = e.riquadro;
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(larghezza)}" height="${n(altezza)}" rx="${n(altezza / 2)}" ry="${n(altezza / 2)}" fill="${fill}" ${tratto}${tratteggiato}/>`;
  }
  return `<polygon points="${punti(e.vertici)}" fill="${fill}" ${tratto}${tratteggiato}/>`;
}

/** La forma col suo testo (una riga per `tspan`, a pezzi con lo stile) e le righe ai lati della chiamata. */
function formaColTesto(e: Elemento, t: Tavolozza, g: GeometriaDelTema, stato: "corrente" | "punto" | undefined): string[] {
  const r = e.riquadroTesto;
  const x = r.x + r.larghezza / 2;
  const righe = e.righe.map((riga, i) => {
    const pezzi = e.pezzi?.[i];
    const contenuto =
      pezzi === undefined ? testo(riga)
      : pezzi
          .map((p) =>
            p.stile === "grassetto" ? `<tspan data-stile="grassetto" font-weight="700" ${CENTRATO}>${testo(p.testo)}</tspan>`
            : p.stile === "corsivo" ? `<tspan data-stile="corsivo" font-style="italic" ${CENTRATO}>${testo(p.testo)}</tspan>`
            : `<tspan ${CENTRATO}>${testo(p.testo)}</tspan>`,
          )
          .join("");
    return `<tspan x="${n(x)}" y="${n(r.y + g.altezzaRiga * (i + 0.5))}" ${CENTRATO}>${contenuto}</tspan>`;
  });
  return [
    contorno(e, t, stato),
    `<text data-testo="" fill="${stato === "corrente" ? t.testoCorrente : t.testo}" ${CENTRATO}>${righe.join("")}</text>`,
    ...(e.lati ?? []).map(([a, b]) => `<line data-lato="" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${t.bordo}" stroke-width="1.5"/>`),
  ];
}

/** Gli elementi del disegno, nell'ordine della tela; `tagli`: le linee che attraversano i tagli di un foglio, coi tratti
 * del colore dello sfondo da mettere sopra (subito dopo le linee: le forme restano sopra di loro). */
function corpo(d: Disegno, o: OpzioniDelSvg, t: Tavolozza, punta_: string, tagli: readonly string[] = []): string[] {
  const g = o.geometria;
  const segniDi = segniDelDisegno(d.elementi, o.segni);
  const ripresaInCorso = o.segni?.ripresa === true;
  const fondo = o.fondoDeiCicli === true && (o.modo ?? "colori") !== "bianco-e-nero";
  const out: string[] = [];
  for (const r of d.riquadri) {
    const conFondo = fondo && !d.riquadri.some((a) => a !== r && contiene(a.bordo, r.bordo));
    const riempimento = conFondo ? `fill="${t.riquadro}" fill-opacity="0.05"` : `fill="none"`;
    out.push(`<rect data-riquadro="${testo(r.blocco)}" x="${n(r.bordo.x)}" y="${n(r.bordo.y)}" width="${n(r.bordo.larghezza)}" height="${n(r.bordo.altezza)}" ${riempimento} stroke="${t.riquadro}" stroke-width="1.25" stroke-dasharray="6 4"/>`);
  }
  for (const c of d.connettori)
    out.push(
      c.genere === "flusso" ?
        `<polyline data-connettore="flusso" points="${punti(c.punti)}" fill="none" stroke="${t.linea}" stroke-width="1.5" marker-end="url(#${punta_})"/>`
      : `<polyline data-connettore="nota" points="${punti(c.punti)}" fill="none" stroke="${t.linea}" stroke-width="1.5" stroke-dasharray="3 3"/>`,
    );
  out.push(...tagli);
  for (const r of d.riquadri)
    if (r.didascalia) out.push(`<g data-forma="intestazione" data-didascalia="${testo(r.blocco)}">`, ...formaColTesto(r.didascalia, t, g, undefined), `</g>`);
  for (const e of d.elementi) {
    const s = segniDi(e);
    const stato = s.corrente ? "corrente" : s.punto ? "punto" : undefined;
    const attributi =
      e.dato !== undefined ?
        `data-forma="${e.forma}" data-valore-iniziale="${testo(e.dato)}"`
      : `data-forma="${e.forma}" data-id="${testo(e.id)}"${e.fase === undefined ? "" : ` data-fase="${e.fase}"`}${e.ciclo ? ` data-ciclo=""` : ""}`;
    out.push(`<g ${attributi}>`, ...formaColTesto(e, t, g, stato), `</g>`);
  }
  for (const e of d.elementi) {
    const s = segniDi(e);
    if (s.riga !== undefined) {
      const r = e.riquadroTesto;
      const h = r.altezza / e.righe.length;
      out.push(`<rect data-riga-corrente="${s.riga}" x="${n(r.x - 4)}" y="${n(r.y + h * s.riga)}" width="${n(r.larghezza + 8)}" height="${n(h)}" rx="3" fill="none" stroke="${t.bordoCorrente}" stroke-width="2"/>`);
    }
    if (s.punto) {
      const p = pallino(e);
      out.push(`<circle data-interruzione="${testo(e.id)}" cx="${n(p.x)}" cy="${n(p.y)}" r="${n(RAGGIO_DEL_PALLINO)}" fill="${t.punto}" stroke="${t.sfondo}" stroke-width="1.5"/>`);
    }
    if (s.corrente && !ripresaInCorso) out.push(`<path data-freccia="" d="M${punta(e).map((v) => `${n(v.x)},${n(v.y)}`).join(" L")} z" fill="${t.bordoCorrente}"/>`);
    if (s.corrente && ripresaInCorso) {
      const { base } = ripresa(e);
      out.push(`<text data-segno-ripresa="" x="${n(base.x)}" y="${n(base.y)}" font-size="${n(CORPO_DELLA_RIPRESA)}" font-weight="700" fill="${t.bordoCorrente}">↩</text>`);
    }
  }
  for (const e of d.etichette)
    out.push(`<text data-etichetta="${e.valore}" x="${n(e.riquadro.x)}" y="${n(e.riquadro.y + e.riquadro.altezza / 2)}" fill="${e.valore === "vero" ? t.vero : t.falso}" dominant-baseline="central">${testo(e.testo)}</text>`);
  for (const u of d.ricongiungimenti) out.push(`<circle data-unione="" cx="${n(u.centro.x)}" cy="${n(u.centro.y)}" r="${n(u.raggio)}" fill="${t.sfondo}" stroke="${t.linea}" stroke-width="1.6"/>`);
  return out;
}

/** L'apertura dell'SVG, la punta e il foglio sotto il disegno. */
function testa(finestra: Rettangolo, scala: number, o: OpzioniDelSvg, t: Tavolozza, idDellaPunta: string): string[] {
  const { x, y, larghezza, altezza } = finestra;
  const g = o.geometria;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(x)} ${n(y)} ${n(larghezza)} ${n(altezza)}" width="${n(larghezza * scala)}" height="${n(altezza * scala)}" font-family="${testo(o.carattere)}" font-size="${n(g.carattere)}" font-weight="normal">`,
    `<defs><marker id="${testo(idDellaPunta)}" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="${n(g.punta)}" markerHeight="${n(g.punta)}" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${t.linea}"/></marker></defs>`,
    `<rect data-fondo="" x="${n(x)}" y="${n(y)}" width="${n(larghezza)}" height="${n(altezza)}" fill="${t.sfondo}"/>`,
  ];
}

/** Il testo del file SVG del flowchart intero, alla scala 1 (la misura in pixel è quella del disegno al 100%). */
export function svgDelDisegno(d: Disegno, o: OpzioniDelSvg): string {
  const t = tavolozzaNelModo(o.tavolozza, o.modo ?? "colori");
  const idDellaPunta = `${o.id ?? "disegno"}-punta`;
  return [...testa({ x: 0, y: 0, larghezza: d.larghezza, altezza: d.altezza }, 1, o, t, idDellaPunta), ...corpo(d, o, t, idDellaPunta), "</svg>", ""].join("\n");
}

/** I tratti dello sfondo sopra le linee che attraversano i tagli del foglio, per `tratteggio` unità da ogni taglio: un
 * taglio orizzontale (sopra, sotto) attraversa i tratti verticali, uno verticale (a sinistra, a destra) quelli
 * orizzontali. Sull'ultimo tratto di una linea del flusso il tratteggio si ferma prima della punta. */
function trattiDeiTagli(d: Disegno, f: Foglio, t: Tavolozza, g: GeometriaDelTema): string[] {
  const tagliY = [f.tagli.sopra ? f.y : undefined, f.tagli.sotto ? f.y + f.altezza : undefined].filter((c) => c !== undefined);
  const tagliX = [f.tagli.sinistra ? f.x : undefined, f.tagli.destra ? f.x + f.larghezza : undefined].filter((c) => c !== undefined);
  const out: string[] = [];
  for (const c of d.connettori) {
    c.punti.forEach((b, i) => {
      if (i === 0) return;
      const a = c.punti[i - 1]!;
      const ultimo = c.genere === "flusso" && i === c.punti.length - 1;
      // Il tratto da `da` a `a_`, lungo l'asse del tratto, accorciato della punta se è l'ultimo della linea del flusso.
      const tratto = (asse: "x" | "y", tagli: readonly number[]) => {
        if (a[asse === "x" ? "y" : "x"] !== b[asse === "x" ? "y" : "x"]) return;
        const verso = Math.sign(b[asse] - a[asse]);
        const [inizio, fine] = [a[asse], b[asse] - (ultimo ? verso * g.punta : 0)];
        const [lo, hi] = [Math.min(inizio, fine), Math.max(inizio, fine)];
        for (const taglio of tagli) {
          if (!(lo < taglio && taglio < hi)) continue;
          const [p, q] = [Math.max(lo, taglio - tratteggio), Math.min(hi, taglio + tratteggio)];
          const fisso = asse === "x" ? a.y : a.x;
          const [x1, y1, x2, y2] = asse === "x" ? [p, fisso, q, fisso] : [fisso, p, fisso, q];
          out.push(`<line data-taglio="" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${t.sfondo}" stroke-width="3" stroke-dasharray="3 3"/>`);
        }
      };
      tratto("y", tagliY);
      tratto("x", tagliX);
    });
  }
  return out;
}

/** Il testo SVG di un foglio della stampa: la finestra del foglio sul disegno, alla scala data (la larghezza e l'altezza
 * in pixel CSS), con le linee tratteggiate vicino ai tagli. */
export function svgDelFoglio(d: Disegno, foglio: Foglio, scala: number, o: OpzioniDelSvg): string {
  const t = tavolozzaNelModo(o.tavolozza, o.modo ?? "colori");
  const idDellaPunta = `${o.id ?? "disegno"}-punta`;
  return [...testa(foglio, scala, o, t, idDellaPunta), ...corpo(d, o, t, idDellaPunta, trattiDeiTagli(d, foglio, t, o.geometria)), "</svg>", ""].join("\n");
}
