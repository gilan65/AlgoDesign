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
  "LICENZE-DI-TERZE-PARTI.txt",
];

/** Il file delle licenze di terze parti: con l'estensione, perché Windows lo apra con un doppio clic. */
export const fileDelleLicenze = "LICENZE-DI-TERZE-PARTI.txt";

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

/** La cartella dell'archivio di Linux che porta le librerie di Ubuntu dentro l'AppImage: l'elenco dei file col loro
 * pacchetto, le versioni, i file di copyright, i testi delle licenze comuni e un `LEGGIMI.md` che spiega la cartella. */
export const cartellaDelleLibrerieDiSistema = "LICENZE-DELLE-LIBRERIE-DI-SISTEMA";

/** Le voci al primo livello dell'archivio di Linux (`archivio.ts`): le stesse di Windows con l'AppImage al posto
 * dell'eseguibile, più la cartella delle librerie di sistema. */
export const elencoDiLinux: readonly string[] = [
  "AlgoDesign.AppImage",
  "data/",
  "LEGGIMI.md",
  "NOTE-DI-RILASCIO.md",
  "GUIDA-PER-LO-STUDENTE.md",
  "CHANGELOG.md",
  "LICENSE",
  "LICENSE-DOCS",
  fileDelleLicenze,
  `${cartellaDelleLibrerieDiSistema}/`,
];

/** I testi per l'utente di Linux, letti dalla cartella data allo strumento coi segnaposto sostituiti: i due di Windows
 * al primo livello, e quello della cartella delle librerie di sistema, che dentro l'archivio si chiama `LEGGIMI.md`. */
export const testiDiLinux: Readonly<Record<string, string>> = {
  "LEGGIMI.md": "LEGGIMI.md",
  "NOTE-DI-RILASCIO.md": "NOTE-DI-RILASCIO.md",
  "LICENZE-DELLE-LIBRERIE-DI-SISTEMA.md": `${cartellaDelleLibrerieDiSistema}/LEGGIMI.md`,
};

/** I nomi dell'archivio di Linux, dal testo di `package.json`, con la stessa regola della versione di Windows. */
export function nomiDiLinux(testoDelPackageJson: string): { versione: string; cartella: string; archivio: string; cartellaNellArchivio: string } {
  const { versione, cartellaNelloZip } = nomiDelPacchetto(testoDelPackageJson);
  return { versione, cartella: `${versione}-linux`, archivio: `AlgoDesign-${versione}-linux-x64.tar.gz`, cartellaNellArchivio: cartellaNelloZip };
}

/** Le differenze fra le voci trovate e l'elenco, nei due versi: «manca X», «in più X». Vuoto se coincidono. */
export function differenzeDallElenco(trovate: readonly string[], elenco: readonly string[] = elencoDelPacchetto): string[] {
  return [...elenco.filter((v) => !trovate.includes(v)).map((v) => `manca ${v}`), ...trovate.filter((v) => !elenco.includes(v)).map((v) => `in più ${v}`)];
}
