// «Esporta il flowchart…» fuori dal motore: i nomi proposti, la misura del PNG, la tavolozza della carta letta dal vero
// `tema.css` (il tema CHIARO, anche se il foglio ha le regole del sistema scuro), lo sfondo trasparente dell'SVG. Gli
// attesi sono scritti a mano, prima del codice.
//
// CHE COSA NON GUARDA:
// - il CSSOM del motore (`regoleDelTema` sui fogli veri, col sistema scuro emulato) e il PNG decodificato: li prova
//   `e2e/esporta.e2e.ts`;
// - qui le regole di `tema.css` le legge un lettore della prova (graffe al primo livello, senza i commenti), non il motore.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { svgDelDisegno } from "../../core/disegno/svg";
import { geometriaPredefinita } from "../../core/disegno/tema";
import type { Disegno } from "../../core/disegno/impaginazione";
import { it as testiIt } from "../../i18n/it";
import { en as testiEn } from "../../i18n/en";
import { baseProposta } from "../nomi";
import { misuraDelPng, nomeDellImmagine, tavolozzaDellaCarta, type RegolaDelTema } from "./esporta";

// ------------------------------------------------------------------------------------- i nomi

test("i nomi proposti sono quelli scritti a mano: il progetto, la funzione fra parentesi, un nome riservato, i caratteri tolti", () => {
  // Il nome della finestra del sistema: `baseProposta` del progetto (quella che `nomeDaUsare` propone nell'avviso) e la
  // funzione della scheda.
  const proposto = (progetto: string, funzione: string | null, estensione: string, ripiego = testiIt.ripiegoDelNomeDelFile, nome = nomeDellImmagine) =>
    `${nome(baseProposta(progetto, ripiego), funzione)}${estensione}`;
  const casi: [string, string | null, string, string, string?][] = [
    ["Senza nome", null, ".png", "Senza nome.png"],
    ["", null, ".svg", "progetto.svg"],
    ["", null, ".svg", "project.svg", testiEn.ripiegoDelNomeDelFile],
    ["media voti", "leggi_numero", ".png", "media voti (leggi_numero).png"],
    ["con", null, ".png", "con (2).png"],
    ["con", "f", ".svg", "con (2) (f).svg"],
    ["a/b?", null, ".png", "ab.png"],
  ];
  const visti = casi.map(([p, f, e, , r]) => proposto(p, f, e, r));
  expect(visti).toEqual(casi.map((c) => c[3]));
  // Controllo positivo: un nome che dimentica la funzione sbaglia proprio le righe con la funzione.
  const senzaFunzione = casi.map(([p, f, e, , r]) => proposto(p, f, e, r, (b) => b));
  expect(senzaFunzione.filter((v, i) => v !== casi[i]![3])).toEqual(["media voti.png", "con (2).svg"]);
  console.log(`nomi proposti: ${casi.length} casi`);
});

test("il PNG misura il doppio del disegno, arrotondato in su al pixel; col fattore 1 no", () => {
  expect(misuraDelPng(180.5, 121.25)).toEqual({ larghezza: 361, altezza: 243 });
  expect(misuraDelPng(180.5, 121.25, 1)).toEqual({ larghezza: 181, altezza: 122 });
  expect(misuraDelPng(180.5, 121.25, 1)).not.toEqual(misuraDelPng(180.5, 121.25));
});

// ------------------------------------------------------------------------------------- la tavolozza della carta

/** Le regole di `tema.css` come le dà il CSSOM: i selettori e le variabili. Al primo livello soltanto (come
 * `regoleDelTema`), o anche dentro gli `@media` (il controllo positivo: è ciò che il sistema scuro aggiungerebbe). */
function regoleDelFile(css: string, ancheDentroIMedia = false): RegolaDelTema[] {
  const testo = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const fuori: RegolaDelTema[] = [];
  const leggi = (pezzo: string, dentroUnMedia: boolean) => {
    let i = 0;
    while (i < pezzo.length) {
      const aperta = pezzo.indexOf("{", i);
      if (aperta < 0) break;
      const testa = pezzo.slice(i, aperta).trim();
      let livello = 1;
      let j = aperta + 1;
      while (livello > 0) {
        if (pezzo[j] === "{") livello++;
        if (pezzo[j] === "}") livello--;
        j++;
      }
      const corpo = pezzo.slice(aperta + 1, j - 1);
      if (testa.startsWith("@")) {
        if (ancheDentroIMedia) leggi(corpo, true);
      } else if (!dentroUnMedia || ancheDentroIMedia) {
        const variabili = Object.fromEntries([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
        fuori.push({ selettori: testa.split(",").map((s) => s.trim()), variabili });
      }
      i = j;
    }
  };
  leggi(testo, false);
  return fuori;
}

const tema = readFileSync(new URL("../tema.css", import.meta.url), "utf8");

test("la tavolozza della carta è il tema chiaro dell'insieme, coi colori dei generi scelti, e lo sfondo bianco", () => {
  const regole = regoleDelFile(tema);
  // La premessa: il lettore trova le regole del tema (le variabili della radice e dei tre insiemi).
  expect(regole.filter((r) => Object.keys(r.variabili).length > 0).length).toBeGreaterThanOrEqual(6);
  const tenui = tavolozzaDellaCarta(regole, "tenue", {});
  expect({ sfondo: tenui.sfondo, testo: tenui.testo, linea: tenui.linea, bordo: tenui.bordo, se: tenui.forme.se, cicli: tenui.forme.cicli, vero: tenui.vero, falso: tenui.falso, riquadro: tenui.riquadro }).toEqual({
    sfondo: "#ffffff",
    testo: "#1d1d1b",
    linea: "#5b6470",
    bordo: "#3d4a5c",
    se: "#fcd2b0",
    cicli: "#f9a66c",
    vero: "#1f7a4d",
    falso: "#b4462f",
    riquadro: "#3d4a5c",
  });
  expect({ corrente: tenui.corrente, bordoCorrente: tenui.bordoCorrente, punto: tenui.punto }).toEqual({ corrente: "#fff59d", bordoCorrente: "#d97706", punto: "#c62828" });
  // L'insieme «Contrasto forte» e una tinta scelta per un genere (scritta in linea sulla radice).
  expect(tavolozzaDellaCarta(regole, "contrasto", {}).forme.se).toBe("#f9a66c");
  const conLaTinta = tavolozzaDellaCarta(regole, "tenue", { "--blocco-assegnazione": "var(--tinta-viola)" });
  expect(conLaTinta.forme.assegnazione).toBe("#e6dcf7");
  expect(tavolozzaDellaCarta(regole, "bianco-e-nero", {}).forme.cicli).toBe("#ffffff");
  // Controllo positivo: con le regole del sistema scuro lette anche loro, la tavolozza è quella scura.
  const conLoScuro = tavolozzaDellaCarta(regoleDelFile(tema, true), "tenue", { "--blocco-assegnazione": "var(--tinta-viola)" });
  expect({ linea: conLoScuro.linea, se: conLoScuro.forme.se, assegnazione: conLoScuro.forme.assegnazione }).toEqual({ linea: "#9aa4b0", se: "#5a3214", assegnazione: "#33284a" });
});

// ------------------------------------------------------------------------------------- lo sfondo trasparente

test("con lo sfondo trasparente l'SVG non ha il rettangolo del fondo; le unioni restano col colore dello sfondo", () => {
  const disegno: Disegno = { larghezza: 40, altezza: 30, elementi: [], connettori: [], etichette: [], ricongiungimenti: [{ centro: { x: 20, y: 15 }, raggio: 4 }], punti: [], riquadri: [] } as unknown as Disegno;
  const o = { geometria: geometriaPredefinita, tavolozza: tavolozzaDellaCarta(regoleDelFile(tema), "tenue", {}), carattere: "sans-serif" };
  const pieno = svgDelDisegno(disegno, o);
  const trasparente = svgDelDisegno(disegno, { ...o, trasparente: true });
  expect(pieno).toContain('<rect data-fondo="" x="0" y="0" width="40" height="30" fill="#ffffff"/>');
  expect(trasparente).not.toContain("data-fondo");
  expect(trasparente).toContain('data-unione="" cx="20" cy="15" r="4" fill="#ffffff"');
  // Il resto è lo stesso: tolta la riga del fondo, i due testi coincidono.
  expect(pieno.split("\n").filter((r) => !r.includes("data-fondo"))).toEqual(trasparente.split("\n"));
});
