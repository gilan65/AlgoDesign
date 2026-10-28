// Il giudizio sul PDF della stampa (`pdf-stampato.ts`) su fogli letti scritti a mano, con i testi come li dà il lettore
// (un testo per blocco): le righe del primo foglio sono quelle del PDF di Chromium della pagina preparata, col piede che
// porta la nostra data. Ogni regola delle scritte del motore vista accendersi da sola, e spenta sulla nostra pagina.
import { expect, test } from "bun:test";
import type { PaginaLetta, PdfLetto } from "./lettore-pdf";
import { difettiDelPdf, scritteDiEdge, type FoglioAtteso } from "./pdf-stampato";

const testa = "riferimento-media-voti-funzioni · Flowchart e codice in Pseudocodice · Programma principale";
const nostre = [testa, " ", "foglio 1 di 2", "pagina ", "1", " di ", "5", " ", "31/12/1999, 23:59", "Inizio", "contati ← 0", "voto < 6", "Vero", "Falso"];
const margini = { sinistro: 33.75, destro: 34.3, alto: 62.25, basso: 50.81 };
const foglio = (righe: string[], mediaBox = [0, 0, 841.91998, 594.95996]): PaginaLetta => ({ mediaBox, righe, margini });
const pdf = (pagine: PaginaLetta[], errori: string[] = []): PdfLetto => ({ versione: "1.4", titolo: "AlgoDesign", pagine, errori });
const attesi: FoglioAtteso[] = [{ testa, destra: "foglio 1 di 2" }];

test("la nostra pagina non ha scritte del motore: nemmeno la nostra data (anno in quattro cifre) né «di 5»", () => {
  expect(scritteDiEdge(nostre, "AlgoDesign")).toEqual([]);
  expect(difettiDelPdf(pdf([foglio(nostre)]), attesi, "o", "AlgoDesign")).toEqual([]);
});

test("ogni scritta del motore si accende da sola: indirizzo, data con l'anno in due cifre, titolo, numero «n/m»", () => {
  expect(scritteDiEdge([...nostre, "http://tauri.localhost/"], "AlgoDesign")).toEqual(["indirizzo"]);
  expect(scritteDiEdge([...nostre, "27/10/26, 22:40"], "AlgoDesign")).toEqual(["data"]);
  // Subito dopo un testo che finisce con una cifra (la nostra data nel piede): i due testi non si incollano in un numero.
  expect(scritteDiEdge([...nostre.slice(0, 9), "27/10/26, 22:40", ...nostre.slice(9)], "AlgoDesign")).toEqual(["data"]);
  expect(scritteDiEdge([...nostre, "AlgoDesign"], "AlgoDesign")).toEqual(["titolo"]);
  expect(scritteDiEdge([...nostre, "1/5"], "AlgoDesign")).toEqual(["numero"]);
  // Come lo scrive il motore: tre testi (misurato in Chromium).
  expect(scritteDiEdge([...nostre, "1", "/", "5"], "AlgoDesign")).toEqual(["numero"]);
  // Le scritte del motore, alla lettera, dal PDF di Chromium con le sue intestazioni: tutte e quattro.
  expect(scritteDiEdge(["Una pagina di tutti i giorni.", "27/10/26, 22:43", "AlgoDesign", "http://tauri.localhost/", "1", "/", "1"], "AlgoDesign")).toEqual(["indirizzo", "data", "titolo", "numero"]);
  // Il titolo vuoto non si cerca (un foglio non ha mai una riga vuota uguale al titolo).
  expect(scritteDiEdge([...nostre, ""], "")).toEqual([]);
});

test("i difetti: un verso sbagliato, un foglio in più, l'intestazione mancante, il lettore in errore, l'area non letta", () => {
  expect(difettiDelPdf(pdf([foglio(nostre)]), attesi, "v", "")).toEqual(["foglio 1: 841.91998 × 594.95996 punti invece di A4 verticale"]);
  expect(difettiDelPdf(pdf([foglio(nostre), foglio(nostre)]), attesi, "o", "")).toEqual(["2 fogli invece di 1"]);
  expect(difettiDelPdf(pdf([foglio(nostre.slice(1))]), attesi, "o", "")).toEqual([`foglio 1: senza l'intestazione ${JSON.stringify(testa)}`]);
  expect(difettiDelPdf(pdf([foglio(nostre.filter((r) => r !== "foglio 1 di 2"))]), attesi, "o", "")).toEqual(['foglio 1: senza "foglio 1 di 2"']);
  expect(difettiDelPdf(pdf([foglio(nostre)], ["pagina 3: guasto"]), attesi, "o", "")).toEqual(["lettore: pagina 3: guasto"]);
  expect(difettiDelPdf(pdf([{ ...foglio(nostre), margini: null }]), attesi, "o", "")).toEqual(["foglio 1: area stampabile non letta"]);
});
