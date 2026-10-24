// Gli sfondi dei livelli di chiamata nella tabella di traccia, letti dal tema (`ui/tema.css`) nei due temi: il testo su
// ogni sfondo si legge (contrasto almeno 4,5:1), il segno del dato cambiato (l'ambra della cella, col suo testo scuro)
// resta lontano da ogni sfondo, e due livelli vicini (anche il quarto col primo, quando si ripetono) si distinguono.
//
// La distanza fra due colori è la differenza di colore CIE76 (la distanza nello spazio Lab): una differenza di circa 2,3
// è appena visibile. Le soglie: almeno 40 fra l'ambra e ogni sfondo (fra l'ambra e lo sfondo della tabella è 47,1 nel
// tema chiaro), almeno 5 fra due livelli vicini.
//
// CHE COSA NON GUARDA:
// - che la tabella usi davvero questi colori sulle righe giuste (lo prova `e2e/tabella.e2e.ts` nel motore);
// - la riga corrente, che ha il suo giallo sopra ogni sfondo;
// - la vista dei colori di chi non distingue le tinte: il livello lo dice anche la colonna «Livello» del CSV, non la
//   tabella.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SFONDI_DEI_LIVELLI } from "./TabellaDiTraccia";

const tema = readFileSync(join(import.meta.dir, "..", "tema.css"), "utf8");
/** Il primo blocco `:root { … }` (il tema chiaro) e quello dentro il primo `@media (prefers-color-scheme: dark)`. */
const chiaro = tema.slice(tema.indexOf(":root {"), tema.indexOf("@media (prefers-color-scheme: dark)"));
const scuro = tema.slice(tema.indexOf("@media (prefers-color-scheme: dark)"), tema.indexOf('[data-colori="tenue"]'));
const variabile = (blocco: string, nome: string, ripiego?: string): string => {
  const m = new RegExp(`${nome}:\\s*(#[0-9a-fA-F]{6});`).exec(blocco);
  if (m) return m[1]!;
  if (ripiego !== undefined) return variabile(ripiego, nome);
  throw new Error(`${nome} non c'è`);
};

const lineare = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const rgb = (h: string) => [1, 3, 5].map((i) => lineare(Number.parseInt(h.slice(i, i + 2), 16))) as [number, number, number];
const luminanza = (h: string) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrasto = (a: string, b: string) => {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
const lab = (h: string) => {
  const [r, g, b] = rgb(h);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const distanza = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]!));

for (const [nome, blocco] of [
  ["chiaro", chiaro],
  ["scuro", scuro],
] as const) {
  describe(`gli sfondi dei livelli, tema ${nome}`, () => {
    const delTema = (v: string) => variabile(blocco, v, chiaro);
    const livelli = Array.from({ length: SFONDI_DEI_LIVELLI }, (_, k) => delTema(`--traccia-livello-${k + 1}`));
    const sfondo = delTema("--colore-sfondo");
    const testo = delTema("--colore-testo");
    const ambra = delTema("--esecuzione-cambiata");
    const testoDellAmbra = delTema("--esecuzione-testo");

    test("il testo, il segno del dato cambiato e i livelli vicini, misurati", () => {
      const misure = livelli.map((l, k) => ({
        livello: k + 1,
        colore: l,
        testo: Math.round(contrasto(testo, l) * 100) / 100,
        ambra: Math.round(distanza(ambra, l) * 10) / 10,
        // Il vicino di prima: lo sfondo della tabella per il primo; e il quarto col primo, che lo segue quando si ripetono.
        vicino: Math.round(distanza(l, k === 0 ? sfondo : livelli[k - 1]!) * 10) / 10,
      }));
      const ripetuto = Math.round(distanza(livelli.at(-1)!, livelli[0]!) * 10) / 10;
      console.log(`[tema ${nome}] ${misure.map((m) => `livello ${m.livello} ${m.colore}: testo ${m.testo}:1, ambra ΔE ${m.ambra}, vicino ΔE ${m.vicino}`).join("; ")}; il quarto col primo ΔE ${ripetuto}; il testo sull'ambra ${Math.round(contrasto(testoDellAmbra, ambra) * 100) / 100}:1`);
      // Premessa: i colori sono stati letti, quattro e tutti diversi.
      expect(new Set(livelli).size).toBe(SFONDI_DEI_LIVELLI);
      for (const m of misure) {
        expect(m.testo, `livello ${m.livello}: il testo`).toBeGreaterThanOrEqual(4.5);
        expect(m.ambra, `livello ${m.livello}: l'ambra`).toBeGreaterThanOrEqual(40);
        expect(m.vicino, `livello ${m.livello}: il vicino`).toBeGreaterThanOrEqual(5);
      }
      expect(ripetuto, "il quarto col primo").toBeGreaterThanOrEqual(5);
      expect(contrasto(testoDellAmbra, ambra)).toBeGreaterThanOrEqual(4.5);
    });
  });
}

test("controllo positivo: le misure distinguono uno sfondo sbagliato", () => {
  // Un livello giallo come l'ambra, uno scuro col testo scuro, due livelli uguali: tre rossi.
  expect(distanza("#fde68a", "#fbe58c")).toBeLessThan(40);
  expect(contrasto("#1d1d1b", "#3a3a3a")).toBeLessThan(4.5);
  expect(distanza("#e0eafa", "#e0eafa")).toBeLessThan(5);
  // Il calcolo sui valori noti: il nero sul bianco 21:1, il nero e il bianco ΔE 100.
  expect(Math.round(contrasto("#000000", "#ffffff"))).toBe(21);
  expect(Math.round(distanza("#000000", "#ffffff"))).toBe(100);
});
