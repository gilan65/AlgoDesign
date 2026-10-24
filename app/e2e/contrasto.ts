// Il contrasto dei colori del flowchart come li calcola il motore: le coppie (un testo sulla sua superficie, una linea o un
// bordo sullo sfondo) e il rapporto WCAG 2. Le usano `disegno.e2e.ts` (i tre insiemi) e `colori.e2e.ts` (le tinte dei
// generi di blocco).
import type { Page } from "@playwright/test";

type Rgb = [number, number, number];

export function rgb(colore: string): Rgb {
  const m = colore.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!m) throw new Error(`colore non letto: «${colore}»`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Il rapporto di contrasto WCAG 2. */
export function contrasto(a: string, b: string): number {
  const luminanza = (c: Rgb) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as Rgb;
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luminanza(rgb(a)), luminanza(rgb(b))].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

export interface Coppia {
  cosa: string;
  primo: string;
  secondo: string;
  minimo: number;
}

/** Le coppie di colori del flowchart, come le calcola il motore: ogni testo sulla sua superficie (la forma,
 * o lo sfondo dell'area per le etichette), linee e bordi sullo sfondo. */
export function coppie(page: Page): Promise<Coppia[]> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[role="group"]')!;
    let sopra: Element | null = svg.parentElement;
    let sfondo = "rgba(0, 0, 0, 0)";
    while (sopra && /rgba\(0, 0, 0, 0\)|transparent/.test(sfondo)) {
      sfondo = getComputedStyle(sopra).backgroundColor;
      sopra = sopra.parentElement;
    }
    const stile = (e: Element) => getComputedStyle(e);
    const fuori: { cosa: string; primo: string; secondo: string; minimo: number }[] = [];
    for (const g of svg.querySelectorAll<SVGGElement>("g[data-forma]")) {
      const forma = g.firstElementChild!;
      fuori.push({ cosa: `testo su ${g.dataset.forma}`, primo: stile(g.querySelector("text")!).fill, secondo: stile(forma).fill, minimo: 4.5 });
      fuori.push({ cosa: `bordo di ${g.dataset.forma}`, primo: stile(forma).stroke, secondo: sfondo, minimo: 3 });
    }
    for (const t of svg.querySelectorAll<SVGTextElement>("text[data-etichetta]"))
      fuori.push({ cosa: `etichetta ${t.dataset.etichetta}`, primo: stile(t).fill, secondo: sfondo, minimo: 4.5 });
    for (const l of svg.querySelectorAll("polyline")) fuori.push({ cosa: `linea ${l.getAttribute("data-connettore")}`, primo: stile(l).stroke, secondo: sfondo, minimo: 3 });
    // Il «+» (bordo e segno d'accento sul colore dello sfondo): lo stesso colore fa il contorno del blocco selezionato.
    for (const c of svg.querySelectorAll("[data-punto] circle")) fuori.push({ cosa: "punto di inserimento", primo: stile(c).stroke, secondo: sfondo, minimo: 3 });
    return fuori;
  });
}

export const sotto = (cs: Coppia[]) => cs.filter((c) => contrasto(c.primo, c.secondo) < c.minimo).map((c) => `${c.cosa}: ${contrasto(c.primo, c.secondo).toFixed(2)} (${c.primo} su ${c.secondo})`);

/** Le coppie di colori dentro i riquadri dei cicli col fondo colorato: etichette, bordi delle forme e linee sul fondo che
 * il motore compone (lo sfondo, poi il velo di ogni riquadro che le contiene), letto da un pixel di un canvas. */
export function coppieSulFondo(page: Page): Promise<Coppia[]> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[role="group"]')!;
    let sopra: Element | null = svg.parentElement;
    let sfondo = "rgba(0, 0, 0, 0)";
    while (sopra && /rgba\(0, 0, 0, 0\)|transparent/.test(sfondo)) {
      sfondo = getComputedStyle(sopra).backgroundColor;
      sopra = sopra.parentElement;
    }
    const riquadri = [...svg.querySelectorAll<SVGRectElement>("rect[data-riquadro]")].map((r) => ({ b: r.getBBox(), fondo: getComputedStyle(r).fill }));
    const tela = document.createElement("canvas").getContext("2d")!;
    /** Il fondo sotto un punto: lo sfondo e i veli dei riquadri che lo contengono, composti dal motore. */
    const fondoIn = (x: number, y: number) => {
      tela.globalCompositeOperation = "source-over";
      tela.fillStyle = sfondo;
      tela.fillRect(0, 0, 1, 1);
      const dentro = riquadri.filter((r) => x >= r.b.x && x <= r.b.x + r.b.width && y >= r.b.y && y <= r.b.y + r.b.height);
      // Un riquadro senza fondo non dipinge (e un `fillStyle` non valido lascerebbe quello di prima).
      const dipinti = dentro.filter((r) => r.fondo !== "none");
      for (const r of dipinti) {
        tela.fillStyle = r.fondo;
        tela.fillRect(0, 0, 1, 1);
      }
      const [a, b, c] = tela.getImageData(0, 0, 1, 1).data;
      return { colore: `rgb(${a}, ${b}, ${c})`, veli: dipinti.length, riquadri: dentro.length };
    };
    const centro = (e: SVGGraphicsElement) => {
      const b = e.getBBox();
      return fondoIn(b.x + b.width / 2, b.y + b.height / 2);
    };
    const fuori: { cosa: string; primo: string; secondo: string; minimo: number }[] = [];
    // Un bordo che non si disegna (l'intestazione del ciclo, che interrompe la linea del riquadro) non ha contrasto.
    const conVelo = (cosa: string, primo: string, f: { colore: string; veli: number; riquadri: number }, minimo: number) => {
      if (f.riquadri > 0 && primo !== "none") fuori.push({ cosa: `${cosa} (in ${f.riquadri} riquadri, ${f.veli} veli)`, primo, secondo: f.colore, minimo });
    };
    for (const t of svg.querySelectorAll<SVGTextElement>("text[data-etichetta]")) conVelo(`etichetta ${t.dataset.etichetta}`, getComputedStyle(t).fill, centro(t), 4.5);
    for (const g of svg.querySelectorAll<SVGGElement>("g[data-forma]")) {
      const forma = g.firstElementChild as SVGGraphicsElement;
      conVelo(`bordo di ${g.dataset.forma}`, getComputedStyle(forma).stroke, centro(forma), 3);
    }
    for (const l of svg.querySelectorAll<SVGPolylineElement>("polyline")) conVelo(`linea ${l.getAttribute("data-connettore")}`, getComputedStyle(l).stroke, centro(l), 3);
    return fuori;
  });
}
