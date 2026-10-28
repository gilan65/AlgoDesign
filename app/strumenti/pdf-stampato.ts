// Il giudizio sul PDF della stampa letto da `lettore-pdf.ts`, per la prova sul prodotto: i fogli contro l'atteso (quanti,
// il verso dalla `/MediaBox`, la nostra intestazione nel testo) e le scritte che il motore aggiunge di suo nei margini che
// la pagina lascia liberi. Le prove sono in `pdf-stampato.test.ts`.
//
// NON guarda: dove stanno i testi nel foglio (il lettore non dà le posizioni dei glifi: che il codice stia nel suo lato
// lo misura la pagina); il disegno; un'intestazione del motore in un'altra lingua o in un'altra forma (misurate: la data
// col giorno, il mese e l'anno in due cifre, il titolo, l'indirizzo `tauri.localhost`, il numero «n/m»).
import type { PdfLetto } from "./lettore-pdf";

export type FoglioAtteso = { testa: string; destra: string };

/** I fogli A4 di un verso, in punti (Skia scrive 841,92 × 594,96: si confronta a ±1). */
export const A4 = { o: [841.89, 595.28], v: [595.28, 841.89] } as const;

/** Le scritte che il motore aggiunge di suo nei margini liberi di un foglio (la data e l'ora con l'anno in due cifre e il
 * titolo della pagina in testa; l'indirizzo e il numero «n/m» in fondo), cercate nel testo del foglio: ognuna col suo
 * nome, perché il controllo positivo le pretende tutte. La nostra data, nel piede, ha l'anno in quattro cifre. */
export function scritteDiEdge(righe: readonly string[], titolo: string): string[] {
  const tutto = righe.join("");
  // La data cercata nei testi incollati (il motore può spezzarla) e separati (dopo un testo che finisce con una cifra,
  // incollata, sembrerebbe parte di un numero).
  const data = /(^|\D)\d{1,2}\/\d{1,2}\/\d{2}(?!\d)/;
  return [
    ...(tutto.includes("tauri.localhost") ? ["indirizzo"] : []),
    ...(data.test(tutto) || data.test(righe.join("\n")) ? ["data"] : []),
    ...(titolo !== "" && righe.some((r) => r.trim() === titolo) ? ["titolo"] : []),
    ...(righe.some((r, i) => /^\s*\d+\/\d+\s*$/.test(r) || (numero(r) && righe[i + 1]?.trim() === "/" && numero(righe[i + 2] ?? ""))) ? ["numero"] : []),
  ];
}

/** Un testo che è solo un numero: il motore scrive «1/5» in tre testi (misurato in Chromium: "1", "/", "5"). */
const numero = (r: string) => /^\s*\d+\s*$/.test(r);

/** I difetti del PDF stampato rispetto all'atteso: il numero dei fogli, il verso di ognuno dalla `/MediaBox`, la nostra
 * intestazione (e il «foglio n di m», se c'è) nel suo testo, nessuna scritta del motore, l'area stampabile letta,
 * nessun errore del lettore. */
export function difettiDelPdf(letto: PdfLetto, attesi: readonly FoglioAtteso[], verso: "o" | "v", titolo: string): string[] {
  const difetti = letto.errori.map((e) => `lettore: ${e}`);
  if (letto.pagine.length !== attesi.length) difetti.push(`${letto.pagine.length} fogli invece di ${attesi.length}`);
  for (const [i, g] of letto.pagine.entries()) {
    const [, , w, h] = g.mediaBox;
    if (w === undefined || h === undefined || Math.abs(w - A4[verso][0]) > 1 || Math.abs(h - A4[verso][1]) > 1)
      difetti.push(`foglio ${i + 1}: ${w} × ${h} punti invece di A4 ${verso === "o" ? "orizzontale" : "verticale"}`);
    const testo = g.righe.join("");
    const a = attesi[i];
    if (a && !testo.includes(a.testa)) difetti.push(`foglio ${i + 1}: senza l'intestazione ${JSON.stringify(a.testa)}`);
    if (a && a.destra !== "" && !testo.includes(a.destra)) difetti.push(`foglio ${i + 1}: senza ${JSON.stringify(a.destra)}`);
    const scritte = scritteDiEdge(g.righe, titolo);
    if (scritte.length > 0) difetti.push(`foglio ${i + 1}: scritte del motore (${scritte.join(", ")})`);
    if (g.margini === null) difetti.push(`foglio ${i + 1}: area stampabile non letta`);
  }
  return difetti;
}
