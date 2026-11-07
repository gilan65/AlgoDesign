// I segnaposto dei testi dei pacchetti (`{{versione}}`, `{{delData}}`, `{{date}}`): il rilevatore di uno rimasto, lo
// stesso per il pacchetto di Windows (`pacchetto.ts`) e per l'archivio di Linux (`archivio.ts`). Prima ognuno aveva il
// suo, e quello di Linux, che rifiutava ogni «{{», era rimasto indietro quando le guide hanno avuto i valori delle matrici.

/** Un segnaposto: un nome fra due graffe doppie (`{{versione}}`). Il valore iniziale di una matrice o di una tabella
 * scritto in una guida (`{{1, 2}, {3, 4}}`, `{{"Anna", 7}}`) non lo è. */
export const segnaposto = /\{\{\s*[A-Za-z_]\w*\s*\}\}/;

/** Le sonde del rilevatore nei due versi: due segnaposto da vedere, due valori di matrice da non vedere. */
export const sondeDeiSegnaposto: readonly (readonly [testo: string, atteso: boolean])[] = [
  ["{{versione}}", true],
  ["{{ data }}", true],
  ["{{1, 2}, {3, 4}}", false],
  ['{{"Anna", 7}, {"Bruno", 8}}', false],
];

/** Il controllo positivo: `null` se il rilevatore dà l'atteso su ogni sonda, altrimenti che cosa ha visto. */
export function sondaDeiSegnaposto(): string | null {
  const sbagliate = sondeDeiSegnaposto.filter(([t, atteso]) => segnaposto.test(t) !== atteso);
  return sbagliate.length === 0 ? null : `il rilevatore dei segnaposto sbaglia su ${sbagliate.map(([t]) => `«${t}»`).join(", ")}`;
}

/** Il primo segnaposto rimasto in un testo, o `null`. */
export const segnapostoRimasto = (testo: string): string | null => segnaposto.exec(testo)?.[0] ?? null;

/** I segnaposto che i testi dei pacchetti sostituiscono: `{{versione}}`, `{{delData}}` (italiano) e `{{date}}` (inglese). */
export function sostituisci(testo: string, valori: { versione: string; delData: string; date: string }): string {
  return testo.replaceAll("{{versione}}", valori.versione).replaceAll("{{delData}}", valori.delData).replaceAll("{{date}}", valori.date);
}
