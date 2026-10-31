// Le preferenze lette dal file e scritte: ogni campo si legge e torna uguale, un campo rotto scarta lui solo, i
// limiti coi loro intervalli (vettori e stringhe fino a 1000, i caratteri di un vettore di stringhe fino a 10 000), i separatori del CSV, la
// velocità dell'esecuzione animata, la forma dei vettori nella tabella e quella del CSV, le righe lunghe della console
// e i suoi caratteri per riga (da 50 a 1000), le forme dei cicli nel flowchart e il fondo del loro riquadro, i colori dei
// generi di blocco, la ricerca e la finestra della guida, i linguaggi del codice generato accesi e il loro ordine.
//
// CHE COSA NON GUARDA: le Impostazioni a schermo (i campi e i messaggi: `e2e/impostazioni.e2e.ts`)
// né il file sul disco (lo scrive il guscio: `cargo test`).
import { expect, test } from "bun:test";
import { tetti } from "../core/controllo/controllo";
import { righeLunghePredefinite } from "../core/esecuzione/esecuzione";
import { linguaggi } from "../core/genera/linguaggi";
import { accesiDiPartenza, caratteriPerRiga, durataDelPasso, fileDa, intervalli, limiteValido, preferenzeDa, righeDelMenu, scelteIniziali, separatoriDelCsv } from "./preferenze";

const tutte = {
  lingua: "en",
  colori: "bianco-e-nero",
  coloriDeiBlocchi: { se: "verde", cicli: "arancione-intenso", riquadro: "linea-blu" },
  condizioni: "su-una-riga",
  barra: "icone",
  esecuzioneFlottante: true,
  modoDeiBlocchi: "pannello",
  modoDeiDati: "celle",
  conferma: "sempre",
  limiti: { elementiDiUnVettore: 500, lunghezzaDiUnaStringa: 300, caratteriDiUnVettoreDiStringhe: 6000 },
  pilaDeiProgettiNuovi: 20,
  cartellaEsempi: "D:\\esempi",
  cartellaLibrerie: "D:\\librerie",
  separatoreCsv: ",",
  decimaliCsv: ".",
  colonneFerme: "numero",
  velocitaAnimata: "veloce",
  formaDeiVettori: "in-fila",
  formaDelleMatrici: "in-fila",
  formaDelleTabelle: "per-campo",
  formaDelCsv: "per-elemento",
  righeLunghe: "la-fine",
  caratteriPerRiga: 80,
  linguaggiDelCodice: ["c", "python"],
  valoriIniziali: "nascosti",
  valoreRipetuto: "un-valore",
  cicliPer: "chiuso",
  cicliPerOgni: "parole",
  copiaDeiVettori: "espansa",
  fondoDeiCicli: true,
  riquadroDellaScelta: true,
  chiusuraAutomatica: false,
  domandaNellaLettura: true,
  offriCasoDallEsecuzione: false,
  // I valori diversi dai predefiniti (la ricerca accesa, la guida fissa), perché il ritorno si veda.
  ricercaNellaGuida: false,
  guidaSpostabile: true,
  // Il pulsante dei record acceso (il predefinito è spento).
  pulsanteDeiRecord: true,
};

test("la presentazione dei pulsanti: tre valori, il predefinito è il testo sotto l'icona, e i due di prima valgono così come sono scritti", () => {
  expect(scelteIniziali.barra).toBe("testo-sotto");
  for (const barra of ["icone-e-testo", "icone", "testo-sotto"] as const) {
    const { scelte } = preferenzeDa({ barra });
    expect(scelte.barra).toBe(barra);
    expect(fileDa("it", scelte).barra).toBe(barra);
  }
  // Un file senza la presentazione, o senza la barretta: i predefiniti (barretta spenta).
  expect(preferenzeDa({ lingua: "it" }).scelte.barra).toBe("testo-sotto");
  expect(preferenzeDa({ lingua: "it" }).scelte.esecuzioneFlottante).toBe(false);
  expect(preferenzeDa({ esecuzioneFlottante: true }).scelte.esecuzioneFlottante).toBe(true);
});

test("ogni campo si legge e torna uguale nel file scritto", () => {
  const { lingua, scelte } = preferenzeDa(tutte);
  expect(lingua).toBe("en");
  expect(fileDa(lingua!, scelte)).toEqual(tutte);
});

test("senza file, o con un file che non è un oggetto, valgono i predefiniti e la lingua resta al sistema", () => {
  for (const file of [null, undefined, "it", 3, [tutte]]) expect(preferenzeDa(file)).toEqual({ lingua: undefined, scelte: scelteIniziali });
  // Nel file scritto coi predefiniti le cartelle degli esempi e delle librerie non ci sono (valgono le predefinite).
  expect(Object.keys(fileDa("it", scelteIniziali))).not.toContain("cartellaEsempi");
  expect(Object.keys(fileDa("it", scelteIniziali))).not.toContain("cartellaLibrerie");
});

// Il file si modifica a mano: un campo sbagliato, nel valore o nel tipo, scarta lui solo.
const rotti: Record<string, readonly unknown[]> = {
  lingua: ["fr", 5, null, ["it"], { it: true }],
  colori: ["blu", 1, true, null],
  // L'oggetto dei colori dei blocchi rotto: tutti i generi col colore dell'insieme (un genere rotto: `colori.test.ts`).
  coloriDeiBlocchi: ["verde", 1, null, ["se"]],
  condizioni: ["su-tre-righe", 2, null],
  barra: ["testo", false, 3],
  esecuzioneFlottante: ["sì", 1, null],
  modoDeiBlocchi: ["finestra", 0, false],
  modoDeiDati: ["foglio", {}, null],
  conferma: ["mai", true, 1],
  // La pila delle chiamate dei progetti nuovi: un intero da 5 a 500, come nel file del progetto.
  pilaDeiProgettiNuovi: [4, 501, 0, 10.5, "20", null],
  cartellaEsempi: [5, null, "", ["D:\\"], {}],
  cartellaLibrerie: [5, null, "", ["D:\\"], {}],
  separatoreCsv: ["\t", ";;", 1, null],
  decimaliCsv: [" ", ",.", 0],
  colonneFerme: ["regola", true, null],
  velocitaAnimata: ["velocissima", 2, null],
  // Una colonna per elemento è la forma del CSV con tutti gli elementi, non una scelta della tabella.
  formaDeiVettori: ["per-elemento", "colonne", 1, null],
  // Le tre forme della matrice sono del nucleo; «primi-e-altri» è una forma dei vettori, non delle matrici.
  formaDelleMatrici: ["primi-e-altri", "righe", 2, null],
  // Le tre forme della tabella sono del nucleo; «per-riga» è una forma delle matrici, non delle tabelle.
  formaDelleTabelle: ["per-riga", "in-fila", 3, null],
  formaDelCsv: ["tutti", true, null],
  righeLunghe: ["taglia", 0, null],
  caratteriPerRiga: [0, 49, 1001, 2.5, "80", null],
  // I linguaggi accesi: un elenco di identificatori del registro, almeno uno (uno sconosciuto da solo non basta).
  linguaggiDelCodice: [[], ["linguaggio-finto"], "c", null, 1, [1, 2], { c: true }],
  valoriIniziali: ["nascosto", true, null],
  valoreRipetuto: ["ripetuto", 1, null],
  cicliPer: ["aperti", "chiusi", true, null],
  cicliPerOgni: ["indice", "aperto", 3, null],
  copiaDeiVettori: ["espanso", "chiusa", 2, null],
  fondoDeiCicli: ["sì", 1, null],
  riquadroDellaScelta: ["sì", 1, null],
  chiusuraAutomatica: ["no", 0, null],
  domandaNellaLettura: ["sì", 1, null],
  offriCasoDallEsecuzione: ["no", 0, null],
  ricercaNellaGuida: ["sì", 1, null],
  guidaSpostabile: ["no", 0, null],
  pulsanteDeiRecord: ["sì", 1, null],
};

test("un campo rotto scarta lui solo: gli altri restano", () => {
  let provati = 0;
  for (const [campo, valori] of Object.entries(rotti))
    for (const v of valori) {
      const { lingua, scelte } = preferenzeDa({ ...tutte, [campo]: v });
      const atteso = preferenzeDa(tutte);
      if (campo === "lingua") expect(lingua).toBeUndefined();
      else expect(lingua).toBe("en");
      const predefinito = campo === "lingua" ? atteso.scelte : { ...atteso.scelte, [campo]: scelteIniziali[campo as keyof typeof scelteIniziali] };
      expect(scelte, `${campo} = ${JSON.stringify(v)}`).toEqual(predefinito);
      provati++;
    }
  // Ogni campo del file ha le sue prove (i limiti hanno la loro).
  expect(Object.keys(rotti).sort()).toEqual(Object.keys(tutte).filter((k) => k !== "limiti").sort());
  expect(provati).toBe(133);
});

test("un limite rotto scarta lui solo, e un oggetto dei limiti rotto li scarta tutti e tre", () => {
  const limiti = (l: unknown) => preferenzeDa({ ...tutte, limiti: l }).scelte;
  for (const v of ["500", 0, -5, 2.5, 1001, 1_000_001, null, true, Number.NaN]) {
    const s = limiti({ ...tutte.limiti, elementiDiUnVettore: v });
    expect(s.limiti, JSON.stringify(v)).toEqual({ ...tutte.limiti, elementiDiUnVettore: tetti.elementiDiUnVettore });
    expect(s.colori).toBe("bianco-e-nero");
  }
  // I caratteri di un vettore di stringhe stanno fra gli elementi di un vettore (qui 500) e 10 000.
  const caratteri = (v: number) => limiti({ ...tutte.limiti, caratteriDiUnVettoreDiStringhe: v }).limiti.caratteriDiUnVettoreDiStringhe;
  expect([caratteri(499), caratteri(500), caratteri(10_000), caratteri(10_001)]).toEqual([tetti.caratteriDiUnVettoreDiStringhe, 500, 10_000, tetti.caratteriDiUnVettoreDiStringhe]);
  for (const l of ["tanti", 3, null, [1, 2, 3]]) expect(limiti(l)).toEqual({ ...preferenzeDa(tutte).scelte, limiti: tetti });
  // Un limite assente (un file scritto prima che esistesse) prende il predefinito.
  expect(limiti({ lunghezzaDiUnaStringa: 7 }).limiti).toEqual({ ...tetti, lunghezzaDiUnaStringa: 7 });
});

test("vettori e stringhe di al più 1000: 1000 si legge, 1001 scarta il campo e tiene gli altri; nessun avviso oltre il predefinito per loro", () => {
  expect([intervalli.elementiDiUnVettore, intervalli.lunghezzaDiUnaStringa]).toEqual([
    { minimo: 1, massimo: 1000 },
    { minimo: 1, massimo: 1000 },
  ]);
  for (const k of ["elementiDiUnVettore", "lunghezzaDiUnaStringa"] as const) {
    expect([limiteValido(k, 1000), limiteValido(k, 1001)], k).toEqual([true, false]);
    const altro = k === "elementiDiUnVettore" ? "lunghezzaDiUnaStringa" : "elementiDiUnVettore";
    const letti = (v: number) => preferenzeDa({ limiti: { [k]: v, [altro]: 7 } }).scelte.limiti;
    // 1000 si legge (la prova distingue: non è il predefinito che torna per caso, l'altro campo dice 7).
    expect(letti(1000)).toEqual({ ...tetti, [k]: 1000, [altro]: 7 });
    expect(letti(1001)).toEqual({ ...tetti, [altro]: 7 });
    expect(letti(999)).toEqual({ ...tetti, [k]: 999, [altro]: 7 });
  }
});

test("i caratteri di un vettore di stringhe: al più 10 000, predefinito 10 000, e mai meno degli elementi di un vettore", () => {
  expect(tetti.caratteriDiUnVettoreDiStringhe).toBe(10_000);
  expect(intervalli.caratteriDiUnVettoreDiStringhe.massimo).toBe(10_000);
  // Il minimo segue gli elementi letti nello stesso file (il vettore più lungo permesso entra sempre).
  const letti = (elementi: number, caratteri: number) => preferenzeDa({ limiti: { elementiDiUnVettore: elementi, caratteriDiUnVettoreDiStringhe: caratteri } }).scelte.limiti.caratteriDiUnVettoreDiStringhe;
  expect([letti(1000, 1000), letti(1000, 999), letti(50, 50), letti(50, 49)]).toEqual([1000, 10_000, 50, 10_000]);
  // Il file scritto prima, con lo spazio in KiB: il campo vecchio non si legge, vale il predefinito.
  expect(preferenzeDa({ limiti: { bufferDiUnVettoreDiStringhe: 1024 * 1024 } }).scelte.limiti).toEqual(tetti);
});

test("i separatori del CSV seguono la lingua finché l'utente non ne sceglie uno, ognuno per sé", () => {
  expect([scelteIniziali.separatoreCsv, scelteIniziali.decimaliCsv]).toEqual(["lingua", "lingua"]);
  expect(separatoriDelCsv(scelteIniziali, "it")).toEqual({ campo: ";", decimali: "," });
  expect(separatoriDelCsv(scelteIniziali, "en")).toEqual({ campo: ",", decimali: "." });
  expect(separatoriDelCsv({ ...scelteIniziali, separatoreCsv: "," }, "it")).toEqual({ campo: ",", decimali: "," });
  expect(separatoriDelCsv({ ...scelteIniziali, decimaliCsv: "." }, "it")).toEqual({ campo: ";", decimali: "." });
  // Un file senza i separatori (scritto prima che esistessero): seguono la lingua.
  expect(preferenzeDa({ lingua: "en" }).scelte.separatoreCsv).toBe("lingua");
});

test("la velocità dell'esecuzione animata: tre valori, la media predefinita, ognuno con la durata di un passo", () => {
  expect(scelteIniziali.velocitaAnimata).toBe("media");
  expect(preferenzeDa({ lingua: "it" }).scelte.velocitaAnimata).toBe("media");
  for (const v of ["lenta", "media", "veloce"] as const) expect(fileDa("it", preferenzeDa({ velocitaAnimata: v }).scelte).velocitaAnimata).toBe(v);
  expect(durataDelPasso).toEqual({ lenta: 1000, media: 500, veloce: 200 });
});

test("la tabella, il CSV e la console: le colonne dei primi dieci, il CSV uguale alla tabella, a capo ogni 250 caratteri; i caratteri da 50 a 1000", () => {
  expect([scelteIniziali.formaDeiVettori, scelteIniziali.formaDelCsv, scelteIniziali.righeLunghe, scelteIniziali.caratteriPerRiga]).toEqual(["primi-e-altri", "uguale", "a-capo", 250]);
  // I predefiniti della console sono quelli del nucleo.
  expect({ caratteri: scelteIniziali.caratteriPerRiga, modo: scelteIniziali.righeLunghe }).toEqual(righeLunghePredefinite);
  expect(caratteriPerRiga).toEqual({ minimo: 50, massimo: 1000 });
  // I confini si leggono (la prova distingue: non è il predefinito che torna).
  for (const n of [50, 1000]) expect(preferenzeDa({ caratteriPerRiga: n }).scelte.caratteriPerRiga).toBe(n);
  for (const forma of ["primi-e-altri", "in-fila"] as const) expect(fileDa("it", preferenzeDa({ formaDeiVettori: forma }).scelte).formaDeiVettori).toBe(forma);
  for (const forma of ["uguale", "per-elemento"] as const) expect(fileDa("it", preferenzeDa({ formaDelCsv: forma }).scelte).formaDelCsv).toBe(forma);
  // La forma delle matrici: una colonna per riga, predefinita anche per un file scritto prima che la scelta esistesse; le
  // tre forme si leggono e si riscrivono.
  expect([scelteIniziali.formaDelleMatrici, preferenzeDa({ lingua: "it", formaDeiVettori: "in-fila" }).scelte.formaDelleMatrici]).toEqual(["per-riga", "per-riga"]);
  for (const forma of ["per-riga", "per-elemento", "in-fila"] as const) expect(fileDa("it", preferenzeDa({ formaDelleMatrici: forma }).scelte).formaDelleMatrici).toBe(forma);
  // La forma delle tabelle: una colonna per record, predefinita anche per un file di prima; le tre forme tornano.
  expect([scelteIniziali.formaDelleTabelle, preferenzeDa({ lingua: "it", formaDelleMatrici: "in-fila" }).scelte.formaDelleTabelle]).toEqual(["per-record", "per-record"]);
  for (const forma of ["per-record", "per-elemento", "per-campo"] as const) expect(fileDa("it", preferenzeDa({ formaDelleTabelle: forma }).scelte).formaDelleTabelle).toBe(forma);
  for (const modo of ["a-capo", "la-fine"] as const) expect(fileDa("it", preferenzeDa({ righeLunghe: modo }).scelte).righeLunghe).toBe(modo);
});

test("i valori iniziali nel flowchart: mostrati (predefinito) o nascosti; il valore ripetuto di un vettore: in un elenco (predefinito) o un valore solo", () => {
  expect([scelteIniziali.valoriIniziali, scelteIniziali.valoreRipetuto]).toEqual(["mostrati", "elenco"]);
  // Un file scritto prima che le due scelte esistessero: i predefiniti.
  expect(preferenzeDa({ lingua: "it" }).scelte.valoriIniziali).toBe("mostrati");
  expect(preferenzeDa({ lingua: "it" }).scelte.valoreRipetuto).toBe("elenco");
  // Ogni valore si legge e torna uguale (la prova distingue: non è il predefinito che torna).
  for (const v of ["mostrati", "nascosti"] as const) expect(fileDa("it", preferenzeDa({ valoriIniziali: v }).scelte).valoriIniziali).toBe(v);
  for (const v of ["elenco", "un-valore"] as const) expect(fileDa("it", preferenzeDa({ valoreRipetuto: v }).scelte).valoreRipetuto).toBe(v);
});

test("i cicli nel flowchart: «per» aperto (predefinito) o chiuso; «per ogni» con la posizione (predefinito), a parole o chiuso; il fondo del riquadro spento", () => {
  expect([scelteIniziali.cicliPer, scelteIniziali.cicliPerOgni, scelteIniziali.fondoDeiCicli]).toEqual(["aperto", "posizione", false]);
  // Un file scritto prima che le tre scelte esistessero: i predefiniti.
  const prima = preferenzeDa({ lingua: "it" }).scelte;
  expect([prima.cicliPer, prima.cicliPerOgni, prima.fondoDeiCicli]).toEqual(["aperto", "posizione", false]);
  // Ogni valore si legge e torna uguale (la prova distingue: non è il predefinito che torna).
  for (const v of ["aperto", "chiuso"] as const) expect(fileDa("it", preferenzeDa({ cicliPer: v }).scelte).cicliPer).toBe(v);
  for (const v of ["posizione", "parole", "chiuso"] as const) expect(fileDa("it", preferenzeDa({ cicliPerOgni: v }).scelte).cicliPerOgni).toBe(v);
  for (const v of [true, false]) expect(fileDa("it", preferenzeDa({ fondoDeiCicli: v }).scelte).fondoDeiCicli).toBe(v);
});

test("la domanda nel blocco di Lettura: spenta di partenza e in un file scritto prima che la scelta esistesse; ogni valore torna uguale", () => {
  expect(scelteIniziali.domandaNellaLettura).toBe(false);
  expect(preferenzeDa({ lingua: "it" }).scelte.domandaNellaLettura).toBe(false);
  for (const v of [true, false]) expect(fileDa("it", preferenzeDa({ domandaNellaLettura: v }).scelte).domandaNellaLettura).toBe(v);
});

test("il riquadro intorno ai blocchi scelti insieme: spento di partenza e in un file scritto prima che la scelta esistesse; ogni valore torna uguale", () => {
  expect(scelteIniziali.riquadroDellaScelta).toBe(false);
  expect(preferenzeDa({ lingua: "it" }).scelte.riquadroDellaScelta).toBe(false);
  for (const v of [true, false]) expect(fileDa("it", preferenzeDa({ riquadroDellaScelta: v }).scelte).riquadroDellaScelta).toBe(v);
});

test("la chiusura automatica di parentesi e virgolette: accesa di partenza e in un file scritto prima che la scelta esistesse; ogni valore torna uguale", () => {
  expect(scelteIniziali.chiusuraAutomatica).toBe(true);
  expect(preferenzeDa({ lingua: "it" }).scelte.chiusuraAutomatica).toBe(true);
  for (const v of [true, false]) expect(fileDa("it", preferenzeDa({ chiusuraAutomatica: v }).scelte).chiusuraAutomatica).toBe(v);
});

test("il comando che salva un'esecuzione come caso d'uso: acceso di partenza e in un file scritto prima che la scelta esistesse; ogni valore torna uguale", () => {
  expect(scelteIniziali.offriCasoDallEsecuzione).toBe(true);
  expect(preferenzeDa({ lingua: "it" }).scelte.offriCasoDallEsecuzione).toBe(true);
  for (const v of [true, false]) expect(fileDa("it", preferenzeDa({ offriCasoDallEsecuzione: v }).scelte).offriCasoDallEsecuzione).toBe(v);
});

test("i linguaggi del codice generato: i tre di partenza e in un file senza il campo; l'ordine scritto torna uguale, uno sconosciuto o ripetuto si ignora", () => {
  const delRegistro = linguaggi.map((v) => v.id);
  expect(scelteIniziali.linguaggiDelCodice).toEqual(["pseudocodice", "python", "c"]);
  expect(preferenzeDa({ lingua: "it" }).scelte.linguaggiDelCodice).toEqual(["pseudocodice", "python", "c"]);
  // Un linguaggio che il registro aggiunge dopo non è di partenza: per chi non ha ancora scelto nasce spento.
  const conUnoNuovo = [...linguaggi.map((v) => ({ id: v.id as string, diPartenza: v.diPartenza })), { id: "linguaggio-nuovo", diPartenza: false }];
  expect(accesiDiPartenza(conUnoNuovo)).toEqual(["pseudocodice", "python", "c"]);
  // Ogni ordine e ogni scelta tornano uguali (la prova distingue: non è il predefinito che torna).
  for (const v of [["c"], ["python", "pseudocodice"], ["c", "pseudocodice", "python"]] as const) expect(fileDa("it", preferenzeDa({ linguaggiDelCodice: v }).scelte).linguaggiDelCodice).toEqual(v);
  // Uno che l'app non conosce (un linguaggio di una versione dopo, aperto da questa) si ignora; uno ripetuto vale una volta.
  expect(preferenzeDa({ linguaggiDelCodice: ["linguaggio-finto", "c", "c", 3, "python"] }).scelte.linguaggiDelCodice).toEqual(["c", "python"]);
  // Le righe del menu: gli accesi nel loro ordine, poi gli spenti in quello del registro.
  expect(righeDelMenu(["c"])).toEqual(["c", "pseudocodice", "python", "accademico", "typescript"]);
  expect(righeDelMenu(["python", "c"])).toEqual(["python", "c", "pseudocodice", "accademico", "typescript"]);
  expect(righeDelMenu(delRegistro)).toEqual(delRegistro);
});

test("«Accademico» nasce spento e in fondo al menu: con le preferenze senza il campo e con i tre linguaggi di prima", () => {
  // Le due strade: chi non ha mai scelto (il file senza il campo, o nessun file) e chi ha scelto i tre di prima.
  const senzaIlCampo = preferenzeDa({ lingua: "it" }).scelte.linguaggiDelCodice;
  const coiTre = preferenzeDa({ linguaggiDelCodice: ["pseudocodice", "python", "c"] }).scelte.linguaggiDelCodice;
  for (const accesi of [scelteIniziali.linguaggiDelCodice, senzaIlCampo, coiTre]) {
    expect(accesi).not.toContain("accademico");
    expect(righeDelMenu(accesi).slice(-2)).toEqual(["accademico", "typescript"]);
  }
  // Acceso dall'utente, torna acceso, nel suo posto.
  expect(fileDa("it", preferenzeDa({ linguaggiDelCodice: ["accademico", "c"] }).scelte).linguaggiDelCodice).toEqual(["accademico", "c"]);
  // Controllo positivo: lo stesso registro con «Accademico» di partenza lo accende per chi non ha scelto.
  const diPartenza = linguaggi.map((v) => ({ id: v.id as string, diPartenza: v.diPartenza || v.id === "accademico" }));
  expect(accesiDiPartenza(diPartenza)).toContain("accademico");
});

test("TypeScript nasce spento e in fondo al menu: con le preferenze senza il campo e coi quattro linguaggi di prima", () => {
  // Le due strade: chi non ha mai scelto (il file senza il campo, o nessun file) e chi ha acceso i quattro di prima.
  const senzaIlCampo = preferenzeDa({ lingua: "it" }).scelte.linguaggiDelCodice;
  const coiQuattro = preferenzeDa({ linguaggiDelCodice: ["pseudocodice", "python", "c", "accademico"] }).scelte.linguaggiDelCodice;
  expect(coiQuattro).toEqual(["pseudocodice", "python", "c", "accademico"]);
  for (const accesi of [scelteIniziali.linguaggiDelCodice, senzaIlCampo, coiQuattro]) {
    expect(accesi).not.toContain("typescript");
    expect(righeDelMenu(accesi).at(-1)).toBe("typescript");
  }
  // Acceso dall'utente, torna acceso, nel suo posto.
  expect(fileDa("it", preferenzeDa({ linguaggiDelCodice: ["typescript", "python"] }).scelte).linguaggiDelCodice).toEqual(["typescript", "python"]);
  // Controllo positivo: lo stesso registro con TypeScript di partenza lo accende per chi non ha scelto.
  const diPartenza = linguaggi.map((v) => ({ id: v.id as string, diPartenza: v.diPartenza || v.id === "typescript" }));
  expect(accesiDiPartenza(diPartenza)).toContain("typescript");
});

test("la guida: la ricerca accesa e la finestra fissa di partenza, anche in un file scritto prima che le scelte esistessero; ogni valore torna uguale", () => {
  expect([scelteIniziali.ricercaNellaGuida, scelteIniziali.guidaSpostabile]).toEqual([true, false]);
  const { scelte } = preferenzeDa({ lingua: "it" });
  expect([scelte.ricercaNellaGuida, scelte.guidaSpostabile]).toEqual([true, false]);
  for (const v of [true, false]) {
    const letto = fileDa("it", preferenzeDa({ ricercaNellaGuida: v, guidaSpostabile: v }).scelte);
    expect([letto.ricercaNellaGuida, letto.guidaSpostabile]).toEqual([v, v]);
  }
});
