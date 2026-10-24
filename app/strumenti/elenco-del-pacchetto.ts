// Che cosa contiene il pacchetto della release e come si chiamano le sue parti. L'elenco è scritto qui, prima dello
// strumento che lo compone (`pacchetto.ts`), che lo confronta coi file davvero composti nei due versi; i nomi
// vengono dalla versione di `package.json`, la fonte sola, e `ui/prodotto.test.ts` li appaia con le altre copie.
//
// I nomi dei tre file delle licenze sono quelli che dice la finestra «Informazioni su AlgoDesign» nei due dizionari
// (`informazioniFile`, `informazioniDocumenti`): `ui/prodotto.test.ts` li appaia nei due versi, e un nome diverso qui
// la fa rossa finché non cambiano anche loro.

/** Le voci al primo livello della cartella del pacchetto; `data/` è una cartella (vuota: l'avvio portabile). */
export const elencoDelPacchetto: readonly string[] = [
  "AlgoDesign.exe",
  "data/",
  "LEGGIMI.md",
  "NOTE-DI-RILASCIO.md",
  "GUIDA-PER-LO-STUDENTE.md",
  "CHANGELOG.md",
  "LICENSE",
  "LICENSE-DOCS",
  "LICENZE-DI-TERZE-PARTI",
];

/** I testi per l'utente, letti da una cartella data allo strumento: `{{versione}}` e `{{data}}` diventano quelle della release. */
export const testiDelPacchetto: readonly string[] = ["LEGGIMI.md", "NOTE-DI-RILASCIO.md"];

/** I documenti del repository che il pacchetto copia così come sono, dalla cartella `docs/`. */
export const documentiDelPacchetto: readonly string[] = ["GUIDA-PER-LO-STUDENTE.md"];

export type NomiDelPacchetto = {
  versione: string;
  /** La cartella in `dist/` coi file del pacchetto. */
  cartella: string;
  /** Lo zip in `dist/`, accanto alla cartella. */
  zip: string;
  /** La cartella che nasce estraendo lo zip. */
  cartellaNelloZip: string;
};

/** I nomi del pacchetto, dal testo di `package.json`. */
export function nomiDelPacchetto(testoDelPackageJson: string): NomiDelPacchetto {
  const versione: unknown = JSON.parse(testoDelPackageJson).version;
  if (typeof versione !== "string" || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(versione)) throw new Error(`versione non valida in package.json: ${JSON.stringify(versione)}`);
  return { versione, cartella: versione, zip: `AlgoDesign-${versione}-windows-x64.zip`, cartellaNelloZip: `AlgoDesign-${versione}` };
}

/** Le differenze fra le voci trovate e l'elenco, nei due versi: «manca X», «in più X». Vuoto se coincidono. */
export function differenzeDallElenco(trovate: readonly string[], elenco: readonly string[] = elencoDelPacchetto): string[] {
  return [...elenco.filter((v) => !trovate.includes(v)).map((v) => `manca ${v}`), ...trovate.filter((v) => !elenco.includes(v)).map((v) => `in più ${v}`)];
}
