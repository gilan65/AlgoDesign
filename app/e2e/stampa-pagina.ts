// La pagina preparata per la stampa, misurata nel motore: comune alla prova nei motori (`stampa.e2e.ts`) e alla prova
// sul prodotto (`strumenti/prova-portabile.ts`, sulla WebView2 vera).
import type { Page } from "@playwright/test";
import type { Tavolozza } from "../core/disegno/tavolozza";

/** La tavolozza della carta scritta a mano dal tema chiaro dei «Tenui» (come `esporta.e2e.ts`). */
export const CARTA: Tavolozza = {
  sfondo: "#ffffff",
  testo: "#1d1d1b",
  bordo: "#3d4a5c",
  linea: "#5b6470",
  riquadro: "#3d4a5c",
  vero: "#1f7a4d",
  falso: "#b4462f",
  forme: { inizioEFine: "#cfd2d6", assegnazione: "#f0dcf2", procedura: "#efe3d0", lettura: "#d9f0df", scrittura: "#c9e0fd", se: "#fcd2b0", cicli: "#f9a66c", commento: "#ffffff" },
  corrente: "#fff59d",
  bordoCorrente: "#d97706",
  testoCorrente: "#111111",
  punto: "#c62828",
};

/** In stampa: per ogni foglio del codice, se le righe stanno nel lato, misurato dalla carta e non dal contenitore (un lato
 * che si allarga per la riga lunga la conterrebbe). Senza impaginazione `emulateMedia` dispone la pagina alla larghezza
 * della finestra: qui ogni sezione ha la larghezza dell'area utile del suo foglio (273 mm orizzontale, 186 verticale),
 * quella che le dà la sua regola `@page`. Negli affiancati il lato è metà meno metà dei 6 mm, e il lato del codice deve
 * essere largo proprio così; da solo il foglio intero. */
export const righeNelLato = (page: Page, codiceOrizzontale = false) =>
  page.evaluate((orizzontale) => {
    const mm = 96 / 25.4;
    const solco = 6 * mm;
    const pre = [...document.querySelectorAll("[data-stampa] pre")] as HTMLElement[];
    for (const p of pre) {
      const s = p.closest("section")!;
      s.style.width = `${s.getAttribute("data-parte") === "affiancati" || orizzontale ? 273 : 186}mm`;
    }
    const misure = pre.map((p) => {
      const s = p.closest("section")!;
      const lato = s.getAttribute("data-parte") === "affiancati" ? (s.clientWidth - solco) / 2 : s.clientWidth;
      // La larghezza del testo: il bordo destro dell'ultima parte di ogni riga (`scrollWidth` non scende sotto quella
      // dell'elemento, e misurerebbe il contenitore).
      const sinistra = p.getBoundingClientRect().left;
      const testo = Math.max(...[...p.children].map((r) => r.lastElementChild!.getBoundingClientRect().right - sinistra));
      return { larga: Math.max(testo, p.scrollWidth > p.clientWidth + 1 ? p.scrollWidth : 0) / lato, giusta: Math.abs(p.clientWidth - lato) <= 1.5 };
    });
    const fuori = { pre: pre.length, fuori: misure.filter((m) => m.larga > 1.002).length, latiStorti: misure.filter((m) => !m.giusta).length, piuLarga: Math.max(...misure.map((m) => m.larga)) };
    for (const p of pre) p.closest("section")!.style.removeProperty("width");
    return fuori;
  }, codiceOrizzontale);
