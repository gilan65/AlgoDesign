// Le tavolozze della carta dei tre insiemi di colori, per chi disegna senza il foglio di stile dell'app (il punto
// d'ingresso del nucleo): gli stessi colori che l'esportazione legge da `ui/tema.css` col tema chiaro, senza i colori dei
// generi scelti nelle Impostazioni (che stanno nelle preferenze dell'app, non nel progetto).
//
// La fonte resta il foglio di stile: questi valori li confronta con lui `ui/disegno/esporta.test.ts`, insieme per insieme
// e campo per campo, ed è rossa con un colore cambiato da una parte sola.
import type { Tavolozza } from "./tavolozza";

/** Gli insiemi di colori del flowchart, come le Impostazioni li offrono (`data-colori` sulla radice). */
export type InsiemeDiColori = "tenue" | "contrasto" | "bianco-e-nero";
export const insiemiDiColori: readonly InsiemeDiColori[] = ["tenue", "contrasto", "bianco-e-nero"];

/** I colori che i tre insiemi hanno in comune: lo sfondo bianco della carta, il testo, i segni dell'esecuzione e quelli
 * del controllo. */
const comuni = {
  sfondo: "#ffffff",
  testo: "#1d1d1b",
  corrente: "#fff59d",
  bordoCorrente: "#d97706",
  testoCorrente: "#111111",
  punto: "#c62828",
  errore: "#b42318",
  avviso: "#9a6700",
} as const;

export const tavolozzeDellaCarta: Readonly<Record<InsiemeDiColori, Tavolozza>> = {
  tenue: {
    ...comuni,
    bordo: "#3d4a5c",
    linea: "#5b6470",
    riquadro: "#3d4a5c",
    vero: "#1f7a4d",
    falso: "#b4462f",
    forme: {
      inizioEFine: "#cfd2d6",
      assegnazione: "#f0dcf2",
      procedura: "#efe3d0",
      lettura: "#d9f0df",
      scrittura: "#c9e0fd",
      se: "#fcd2b0",
      cicli: "#f9a66c",
      commento: "#ffffff",
    },
  },
  contrasto: {
    ...comuni,
    bordo: "#000000",
    linea: "#1d1d1b",
    riquadro: "#000000",
    vero: "#0b5733",
    falso: "#8f2410",
    forme: {
      inizioEFine: "#bcc0c6",
      assegnazione: "#e4c3ea",
      procedura: "#e3cfaf",
      lettura: "#bfe6cb",
      scrittura: "#acd0fb",
      se: "#f9a66c",
      cicli: "#f28a3c",
      commento: "#ffffff",
    },
  },
  "bianco-e-nero": {
    ...comuni,
    bordo: "#000000",
    linea: "#000000",
    riquadro: "#000000",
    vero: "#000000",
    falso: "#000000",
    forme: {
      inizioEFine: "#ffffff",
      assegnazione: "#ffffff",
      procedura: "#ffffff",
      lettura: "#ffffff",
      scrittura: "#ffffff",
      se: "#ffffff",
      cicli: "#ffffff",
      commento: "#ffffff",
    },
  },
};
