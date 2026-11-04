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
  "README.md",
  "LEGGIMI.md",
  "NOTE-DI-RILASCIO.md",
  "GUIDA-PER-LO-STUDENTE.md",
  "STUDENT-GUIDE.md",
  "GUIDA-AD-ACCADEMICO.md",
  "GUIDA-AD-ALGODESIGN-TOOLS.md",
  "GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md",
  "GUIDE-TO-REPORTING-A-MALFUNCTION.md",
  "CHANGELOG.md",
  "LICENSE",
  "LICENSE-DOCS",
  "LICENZE-DI-TERZE-PARTI.txt",
];

/** Il file delle licenze di terze parti: con l'estensione, perché Windows lo apra con un doppio clic. */
export const fileDelleLicenze = "LICENZE-DI-TERZE-PARTI.txt";

/** I testi per l'utente, letti da una cartella data allo strumento: `{{versione}}`, `{{delData}}` e `{{date}}` diventano quelle della release. */
export const testiDelPacchetto: readonly string[] = ["NOTE-DI-RILASCIO.md"];

/** I due README della radice del repository (inglese e italiano), che il pacchetto copia così come sono: dicono la
 * versione del prodotto. */
export const documentiDellaRadice: readonly string[] = ["README.md", "LEGGIMI.md"];

/** I documenti del repository che il pacchetto copia così come sono, dalla cartella `docs/`: le due guide per lo
 * studente, le stesse che la finestra «Guida» mostra (`ui/guida/guide.ts`, appaiate da `ui/guida/guida.test.ts`). */
export const documentiDelPacchetto: readonly string[] = ["GUIDA-PER-LO-STUDENTE.md", "STUDENT-GUIDE.md"];

/** La guida ad «Accademico», da `docs/` così com'è: nel pacchetto dell'app (la guida per lo studente la nomina) e in
 * quello dello strumento. Fuori da `documentiDelPacchetto`, che sono le guide della finestra «Guida». */
export const guidaAdAccademico = "GUIDA-AD-ACCADEMICO.md";

/** La guida dello strumento a riga di comando, da `docs/` così com'è: nel pacchetto dell'app (la guida per lo studente la
 * nomina) e in quello dello strumento. Fuori da `documentiDelPacchetto`, che sono le guide della finestra «Guida». */
export const guidaDelloStrumento = "GUIDA-AD-ALGODESIGN-TOOLS.md";

/** La guida per segnalare un malfunzionamento, nelle due lingue, da `docs/` così com'è: nel pacchetto dell'app, non in
 * quello dello strumento. Fuori da `documentiDelPacchetto`, che sono le guide della finestra «Guida». */
export const guidePerSegnalare: readonly string[] = ["GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md", "GUIDE-TO-REPORTING-A-MALFUNCTION.md"];

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
 * pacchetto, le versioni, i file di copyright, i testi delle licenze comuni e `CONTENUTO-DELLA-CARTELLA.md`, che la spiega. */
export const cartellaDelleLibrerieDiSistema = "LICENZE-DELLE-LIBRERIE-DI-SISTEMA";

/** Le voci al primo livello dell'archivio di Linux (`archivio.ts`): le stesse di Windows con l'AppImage al posto
 * dell'eseguibile, più il testo di Linux e la cartella delle librerie di sistema. */
export const elencoDiLinux: readonly string[] = [
  "AlgoDesign.AppImage",
  "data/",
  "README.md",
  "LEGGIMI.md",
  "ALGODESIGN-PER-LINUX.md",
  "NOTE-DI-RILASCIO.md",
  "GUIDA-PER-LO-STUDENTE.md",
  "STUDENT-GUIDE.md",
  "GUIDA-AD-ACCADEMICO.md",
  "GUIDA-AD-ALGODESIGN-TOOLS.md",
  "GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md",
  "GUIDE-TO-REPORTING-A-MALFUNCTION.md",
  "CHANGELOG.md",
  "LICENSE",
  "LICENSE-DOCS",
  fileDelleLicenze,
  `${cartellaDelleLibrerieDiSistema}/`,
];

/** I testi per l'utente di Linux, letti dalla cartella data allo strumento coi segnaposto sostituiti: quello che dice come
 * si avvia AlgoDesign su Linux e i suoi limiti e le note di rilascio al primo livello, e quello della cartella delle
 * librerie di sistema, che dentro l'archivio si chiama `CONTENUTO-DELLA-CARTELLA.md`. */
export const testiDiLinux: Readonly<Record<string, string>> = {
  "ALGODESIGN-PER-LINUX.md": "ALGODESIGN-PER-LINUX.md",
  "NOTE-DI-RILASCIO.md": "NOTE-DI-RILASCIO.md",
  "LICENZE-DELLE-LIBRERIE-DI-SISTEMA.md": `${cartellaDelleLibrerieDiSistema}/CONTENUTO-DELLA-CARTELLA.md`,
};

/** I nomi dell'archivio di Linux, dal testo di `package.json`, con la stessa regola della versione di Windows. */
export function nomiDiLinux(testoDelPackageJson: string): { versione: string; cartella: string; archivio: string; cartellaNellArchivio: string } {
  const { versione, cartellaNelloZip } = nomiDelPacchetto(testoDelPackageJson);
  return { versione, cartella: `${versione}-linux`, archivio: `AlgoDesign-${versione}-linux-x64.tar.gz`, cartellaNellArchivio: cartellaNelloZip };
}

/** Le voci al primo livello del pacchetto aggiuntivo dello strumento a riga di comando (`pacchetto.ts`): l'eseguibile a
 * sé, i due testi brevi, le due guide e le licenze; niente `data/`, perché lo strumento scrive solo dove gli si dice. */
export const elencoDelloStrumento: readonly string[] = [
  "algodesign-tools.exe",
  "LEGGIMI.md",
  "README.md",
  guidaDelloStrumento,
  guidaAdAccademico,
  "LICENSE",
  "LICENSE-DOCS",
  fileDelleLicenze,
];

/** I testi brevi del pacchetto dello strumento, letti dalla cartella di `--testi` coi segnaposto sostituiti: il nome
 * nella cartella e quello dentro il pacchetto. */
export const testiDelloStrumento: Readonly<Record<string, string>> = {
  "LEGGIMI-DI-ALGODESIGN-TOOLS.md": "LEGGIMI.md",
  "README-OF-ALGODESIGN-TOOLS.md": "README.md",
};

/** I nomi del pacchetto dello strumento, dal testo di `package.json`, con la stessa regola della versione dell'app; la
 * versione delle proprietà dell'eseguibile ha i soli tre numeri e uno zero, perché Bun non ne accetta altre. */
export function nomiDelloStrumento(testoDelPackageJson: string): { versione: string; versioneDellEseguibile: string; cartella: string; zip: string; cartellaNelloZip: string } {
  const { versione } = nomiDelPacchetto(testoDelPackageJson);
  return {
    versione,
    versioneDellEseguibile: `${/^\d+\.\d+\.\d+/.exec(versione)![0]}.0`,
    cartella: `${versione}-tools`,
    zip: `AlgoDesign-Tools-${versione}-windows.zip`,
    cartellaNelloZip: `AlgoDesign-Tools-${versione}`,
  };
}

/** Le differenze fra le voci trovate e l'elenco, nei due versi: «manca X», «in più X». Vuoto se coincidono. */
export function differenzeDallElenco(trovate: readonly string[], elenco: readonly string[] = elencoDelPacchetto): string[] {
  return [...elenco.filter((v) => !trovate.includes(v)).map((v) => `manca ${v}`), ...trovate.filter((v) => !elenco.includes(v)).map((v) => `in più ${v}`)];
}
