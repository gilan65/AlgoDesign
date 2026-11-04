// Le Impostazioni: la finestra che si apre dal pulsante a destra della barra, a schede, con «Conferma» e
// «Annulla», e le preferenze che scrive.
//
// - I limiti arrivano al controllo: un vettore di 1000 elementi non è un errore coi limiti predefiniti (1000) e
//   lo è col limite abbassato a 999; «Torna ai predefiniti» lo riporta. Vettori e stringhe arrivano al più a
//   1000: 1000 si accetta, 1001 no, col messaggio «da 1 a 1000», e nessun avviso. Un limite scritto male non si
//   conferma: la finestra resta, sulla scheda dei limiti, col fuoco nel campo.
// - Un numero fra un minimo e un massimo (i tre limiti, i caratteri di una riga della console) ha accanto il cursore
//   col suo stesso nome: il cursore spostato dalla tastiera cambia il campo, il numero scritto sposta il cursore. I
//   caratteri vanno da 50 a 1000: 50 e 1000 si accettano, 49 e 1001 no (col messaggio «da 50 a 1000»), e un numero
//   sbagliato non si conferma: la finestra resta sulla scheda della console col fuoco nel campo.
// - «Annulla» non applica e non scrive nulla.
// - Ogni scelta confermata vale subito e si scrive nel file intero delle preferenze: colori, forma dei
//   comandi della barra, modi, conferma prima di eliminare un dato, forma dei vettori, colonne ferme, forma e
//   separatori del CSV della tabella di traccia, righe lunghe e caratteri per riga della console.
// - Ogni gruppo di opzioni di ogni scheda sta in un riquadro (bordo sui quattro lati) con la sua domanda dentro,
//   anche le caselle; i gruppi contati sono quelli che le schede hanno (controllo positivo della premessa).
// - Se il guscio non dà le preferenze, l'app parte lo stesso nella lingua del sistema coi colori predefiniti, e
//   l'errore va nella console.
// - Un campo rotto nel file delle preferenze scarta lui solo: gli altri restano (la lingua compresa).
// - Il menu dei linguaggi nella scheda «Console»: ▲ ▼ col fuoco sul pulsante della riga spostata (anche in cima, dove il
//   pulsante non fa nulla), l'ultimo acceso che non si spegne, le linguette nell'ordine dopo «Conferma», le preferenze
//   scritte, e le stesse linguette (mostrata la prima) dopo un riavvio con quel file.
// - I valori iniziali nel flowchart: nascosti, i blocchi sotto «Inizio» spariscono, e tornano mostrati. Il valore
//   iniziale di un vettore: le due forme danno disegni e righe dei dati diverse; un vettore nuovo nasce nel modo
//   scelto, ognuno lo scavalca con la sua casella, e passare dal valore ripetuto all'elenco riempie il campo.
// - La cartella degli esempi: una scelta che c'è vale (vuota, resta vuota); una che non c'è più lascia gli
//   esempi della predefinita, e le Impostazioni lo dicono.
//
// CHE COSA NON GUARDA:
// - la finestra di scelta della cartella del sistema (è del guscio: qui la finta restituisce un percorso);
// - il fuoco trattenuto ed Esc (nella prova di ogni finestra, `progetto-file.e2e.ts`) e il contrasto dei tre
//   insiemi di colori (`disegno.e2e.ts`);
// - i modi dei blocchi e dei dati all'opera (`modifica.e2e.ts`, `modifica-dati.e2e.ts`, che li prendono
//   dalle preferenze come le scrivono le Impostazioni);
// - le preferenze sul prodotto, dopo un riavvio (la prova portabile);
// - le colonne ferme e i separatori all'opera (`tabella.e2e.ts`, `ui/esecuzione/tabella.test.tsx`).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { tetti } from "../core/controllo/controllo";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { fileDa, scelteIniziali, type Scelte } from "../ui/preferenze";
import { apriVuota, costruisciFinzione, esempiDelCorpus, voceDellAiuto, type StatoDelGuscio } from "./pagina";

test.beforeAll(costruisciFinzione);
test.describe.configure({ mode: "parallel" });

const percorso = "C:\\Progetti\\vettore grande.algo";
const vettoreGrande = JSON.stringify(
  {
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Vettore grande" },
    // Il vettore si legge e si scrive: senza blocchi, il dato mai usato darebbe un avviso.
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "voti", type: "integer", size: 1000 }],
        body: [
          { id: "b2", kind: "read", target: "voti[0]" },
          { id: "b3", kind: "write", values: ["voti[0]"], newline: true },
        ],
        end: { id: "b1" },
      },
    ],
  },
  null,
  2,
);
const conIlVettore: StatoDelGuscio = { file: { [percorso]: vettoreGrande }, argomento: percorso };

const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true });
const scritte = (page: Page) => page.evaluate(() => window.__finzione__.scritte as { preferenze: unknown }[]);
const coloriApplicati = (page: Page) => page.evaluate(() => document.documentElement.dataset.colori);

/** Le Impostazioni aperte dal loro comando nella barra: un rosso col suo messaggio se il comando non c'è. */
async function apriLe(page: Page, testi = it): Promise<Locator> {
  const comando = page.getByRole("banner").getByRole("button", { name: testi.impostazioni ?? "Impostazioni", exact: true });
  await expect(page.getByRole("banner")).toBeVisible();
  expect(await comando.count(), "non c'è il comando Impostazioni").toBe(1);
  await comando.click();
  const finestra = page.getByRole("dialog", { name: testi.impostazioniTitolo, exact: true });
  await expect(finestra).toBeVisible();
  return finestra;
}
const scheda = (f: Locator, nome: string) => f.getByRole("tab", { name: nome, exact: true }).click();
async function conferma(f: Locator, testi = it): Promise<void> {
  await f.getByRole("button", { name: testi.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
}
const campo = (f: Locator, nome: string) => f.getByRole("spinbutton", { name: nome, exact: true });

test("un vettore al limite predefinito non è un errore; col limite abbassato sì; «Torna ai predefiniti» lo riporta", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, conIlVettore);
  const stato = statoDi(page);
  await expect(stato).toContainText("vettore grande.algo");
  await expect(stato).toContainText(it.statoNessuno);

  let f = await apriLe(page);
  await scheda(f, it.impostazioniLimiti);
  await campo(f, it.limiteVettore).fill("999");
  await conferma(f);
  await expect(stato).toContainText(it.statoErrore);
  expect((await scritte(page)).at(-1)).toEqual({ preferenze: fileDa("it", { ...scelteIniziali, limiti: { ...tetti, elementiDiUnVettore: 999 } }) });

  f = await apriLe(page);
  await scheda(f, it.impostazioniLimiti);
  await expect(campo(f, it.limiteVettore)).toHaveValue("999");
  await f.getByRole("button", { name: it.limitiPredefiniti, exact: true }).click();
  await expect(campo(f, it.limiteVettore)).toHaveValue("1000");
  await conferma(f);
  await expect(stato).toContainText(it.statoNessuno);
  expect((await scritte(page)).at(-1)).toEqual({ preferenze: fileDa("it", scelteIniziali) });
});

test("vettori e stringhe fino a 1000; i caratteri di un vettore di stringhe dagli elementi a 10 000; un limite sbagliato non si conferma", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, conIlVettore);
  const f = await apriLe(page);
  await scheda(f, it.impostazioniLimiti);
  const fuori = riempi(it.limiteFuori, { minimo: "1", massimo: "1000" });
  // Vettori e stringhe: 1000 si accetta, 1001 no (col messaggio «da 1 a 1000»); nessun avviso, né a 1000 né oltre.
  for (const nome of [it.limiteVettore, it.limiteStringa]) {
    await campo(f, nome).fill("1000");
    await expect(f.getByText(fuori, { exact: true }), `1000 rifiutato per «${nome}»`).toHaveCount(0);
    await campo(f, nome).fill("1001");
    await expect(f.getByText(fuori, { exact: true }), `1001 accettato per «${nome}»`).toHaveCount(1);
    await expect(campo(f, nome)).toHaveAttribute("aria-invalid", "true");
    await campo(f, nome).fill("1000");
    await expect(f.getByText(fuori, { exact: true })).toHaveCount(0);
  }
  // I caratteri di un vettore di stringhe: da quanti elementi può avere un vettore (qui 1000) a 10 000; abbassati gli
  // elementi a 50, il minimo scende a 50.
  const caratteri = campo(f, it.limiteCaratteri);
  await expect(caratteri).toHaveValue("10000");
  for (const [elementi, scritto, accettato] of [
    ["1000", "1000", true],
    ["1000", "999", false],
    ["1000", "10001", false],
    ["50", "50", true],
  ] as const) {
    await campo(f, it.limiteVettore).fill(elementi);
    await caratteri.fill(scritto);
    const messaggio = f.getByText(riempi(it.limiteFuori, { minimo: elementi, massimo: "10000" }), { exact: true });
    await expect(messaggio, `${scritto} caratteri con ${elementi} elementi`).toHaveCount(accettato ? 0 : 1);
  }
  await campo(f, it.limiteVettore).fill("1000");
  await caratteri.fill("10000");

  // Un limite sbagliato: l'errore sotto il campo; «Conferma» da un'altra scheda riporta lì, col fuoco.
  await campo(f, it.limiteVettore).fill("0");
  await expect(f.getByText(fuori, { exact: true })).toBeVisible();
  await scheda(f, it.impostazioniDisegno);
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeVisible();
  await expect(f.getByRole("tab", { name: it.impostazioniLimiti, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(campo(f, it.limiteVettore)).toBeFocused();
  expect(await scritte(page)).toEqual([]);
  // Vale ancora il limite di prima.
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  await expect(statoDi(page)).toContainText(it.statoNessuno);
});

test("ogni numero ha il cursore accanto, che lo segue nei due versi; i caratteri di una riga da 50 a 1000, la pila dei progetti nuovi da 5 a 500", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const f = await apriLe(page);
  const cursore = (nome: string) => f.getByRole("slider", { name: nome, exact: true });
  // Ogni campo numerico ha il suo cursore, col suo nome (controllo positivo: i campi contati sono cinque).
  let numeri = 0;
  for (const [s, nomi] of [
    [it.impostazioniLimiti, [it.limiteVettore, it.limiteStringa, it.limiteCaratteri, it.pilaDeiProgettiNuovi]],
    [it.impostazioniConsole, [it.caratteriPerRiga]],
  ] as const) {
    await scheda(f, s);
    for (const nome of nomi) {
      await expect(cursore(nome), `il cursore di «${nome}»`).toHaveCount(1);
      await expect(cursore(nome)).toHaveValue(await campo(f, nome).inputValue());
      numeri++;
    }
    expect(await f.getByRole("tabpanel", { name: s, exact: true }).getByRole("spinbutton").count()).toBe(nomi.length);
  }
  expect(numeri).toBe(5);
  // Il cursore dalla tastiera cambia il campo; il numero scritto sposta il cursore.
  await cursore(it.caratteriPerRiga).focus();
  await page.keyboard.press("ArrowRight");
  await expect(campo(f, it.caratteriPerRiga)).toHaveValue("251");
  await campo(f, it.caratteriPerRiga).fill("700");
  await expect(cursore(it.caratteriPerRiga)).toHaveValue("700");
  // I confini: 50 e 1000 sì, 49 e 1001 no.
  const fuori = riempi(it.limiteFuori, { minimo: "50", massimo: "1000" });
  for (const [v, ok] of [["50", true], ["1000", true], ["49", false], ["1001", false]] as const) {
    await campo(f, it.caratteriPerRiga).fill(v);
    await expect(f.getByText(fuori, { exact: true }), `${v} caratteri`).toHaveCount(ok ? 0 : 1);
  }
  // Un numero sbagliato non si conferma: la finestra torna sulla scheda della console, col fuoco nel campo.
  await scheda(f, it.impostazioniDisegno);
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f.getByRole("tab", { name: it.impostazioniConsole, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(campo(f, it.caratteriPerRiga)).toBeFocused();
  expect(await scritte(page)).toEqual([]);
  // La pila delle chiamate dei progetti nuovi: 5 e 500 sì, 4 e 501 no; sbagliata, la conferma torna su «Limiti».
  await campo(f, it.caratteriPerRiga).fill("700");
  await scheda(f, it.impostazioniLimiti);
  const pila = riempi(it.limiteFuori, { minimo: "5", massimo: "500" });
  for (const [v, ok] of [["5", true], ["500", true], ["4", false], ["501", false]] as const) {
    await campo(f, it.pilaDeiProgettiNuovi).fill(v);
    await expect(f.getByText(pila, { exact: true }), `pila ${v}`).toHaveCount(ok ? 0 : 1);
  }
  await scheda(f, it.impostazioniDisegno);
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f.getByRole("tab", { name: it.impostazioniLimiti, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(campo(f, it.pilaDeiProgettiNuovi)).toBeFocused();
  expect(await scritte(page)).toEqual([]);
  await campo(f, it.pilaDeiProgettiNuovi).fill("20");
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  expect((await scritte(page)).at(-1)).toEqual({ preferenze: fileDa("it", { ...scelteIniziali, caratteriPerRiga: 700, pilaDeiProgettiNuovi: 20 }) });
});

test("«Annulla» non applica e non scrive nulla; riaperta, la finestra riparte dalle scelte in uso", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, conIlVettore);
  let f = await apriLe(page);
  await f.getByRole("radio", { name: it.coloriBiancoNero, exact: true }).check();
  await scheda(f, it.impostazioniLimiti);
  await campo(f, it.limiteVettore).fill("500");
  await f.getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(f).toBeHidden();
  expect(await coloriApplicati(page)).toBe("tenue");
  await expect(statoDi(page)).toContainText(it.statoNessuno);
  expect(await scritte(page)).toEqual([]);
  f = await apriLe(page);
  await expect(f.getByRole("radio", { name: it.coloriTenue, exact: true })).toBeChecked();
  await scheda(f, it.impostazioniLimiti);
  await expect(campo(f, it.limiteVettore)).toHaveValue("1000");
});

test("ogni scelta confermata vale subito e si scrive nel file intero delle preferenze", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const f = await apriLe(page);
  // Il fuoco parte dalla prima scheda.
  await expect(f.getByRole("tab", { name: it.impostazioniDisegno, exact: true })).toBeFocused();
  await f.getByRole("radio", { name: it.coloriContrasto, exact: true }).check();
  await f.getByRole("radio", { name: it.barraSoloIcone, exact: true }).check();
  await f.getByRole("radio", { name: it.valoriNascosti, exact: true }).check();
  await f.getByRole("radio", { name: it.ripetutoUnValore, exact: true }).check();
  // I cicli: le due scelte hanno la voce «Chiusi» con lo stesso testo, ciascuna nel suo gruppo.
  await f.getByRole("group", { name: it.cicliPer, exact: true }).getByRole("radio", { name: it.perChiuso, exact: true }).check();
  await f.getByRole("group", { name: it.cicliPerOgni, exact: true }).getByRole("radio", { name: it.perOgniParole, exact: true }).check();
  await f.getByRole("checkbox", { name: it.fondoDeiCicli, exact: true }).check();
  await f.getByRole("group", { name: it.sceltaDiPiuBlocchi, exact: true }).getByRole("checkbox", { name: it.riquadroDellaScelta, exact: true }).check();
  await scheda(f, it.impostazioniModifica);
  await f.getByRole("radio", { name: it.modoPannello, exact: true }).check();
  await f.getByRole("radio", { name: it.modoCelle, exact: true }).check();
  await f.getByRole("radio", { name: it.confermaSempre, exact: true }).check();
  await scheda(f, it.impostazioniTabella);
  await f.getByRole("radio", { name: it.fermeNumero, exact: true }).check();
  await f.getByRole("group", { name: it.separatoreCsv, exact: true }).getByRole("radio", { name: it.segnoVirgola, exact: true }).check();
  await f.getByRole("group", { name: it.decimaliCsv, exact: true }).getByRole("radio", { name: it.segnoPunto, exact: true }).check();
  await f.getByRole("radio", { name: it.formaInFila, exact: true }).check();
  // La forma delle matrici, accanto a quella dei vettori: la predefinita è una colonna per riga.
  await expect(f.getByRole("group", { name: it.formaDelleMatrici, exact: true }).getByRole("radio", { name: it.formaMatricePerRiga, exact: true })).toBeChecked();
  await f.getByRole("group", { name: it.formaDelleMatrici, exact: true }).getByRole("radio", { name: it.formaMatricePerElemento, exact: true }).check();
  // La forma delle tabelle, accanto a quella delle matrici: la predefinita è una colonna per record.
  await expect(f.getByRole("group", { name: it.formaDelleTabelle, exact: true }).getByRole("radio", { name: it.formaTabellaPerRecord, exact: true })).toBeChecked();
  await f.getByRole("group", { name: it.formaDelleTabelle, exact: true }).getByRole("radio", { name: it.formaTabellaPerCampo, exact: true }).check();
  await f.getByRole("radio", { name: it.csvPerElemento, exact: true }).check();
  await scheda(f, it.impostazioniConsole);
  await f.getByRole("radio", { name: it.righeLaFine, exact: true }).check();
  await campo(f, it.caratteriPerRiga).fill("80");
  await conferma(f);
  const attese: Scelte = {
    ...scelteIniziali,
    colori: "contrasto",
    barra: "icone",
    modoDeiBlocchi: "pannello",
    modoDeiDati: "celle",
    conferma: "sempre",
    colonneFerme: "numero",
    separatoreCsv: ",",
    decimaliCsv: ".",
    formaDeiVettori: "in-fila",
    formaDelleMatrici: "per-elemento",
    formaDelleTabelle: "per-campo",
    formaDelCsv: "per-elemento",
    righeLunghe: "la-fine",
    caratteriPerRiga: 80,
    valoriIniziali: "nascosti",
    valoreRipetuto: "un-valore",
    cicliPer: "chiuso",
    cicliPerOgni: "parole",
    fondoDeiCicli: true,
    riquadroDellaScelta: true,
  };
  expect(await scritte(page)).toEqual([{ preferenze: fileDa("it", attese) }]);
  expect(await coloriApplicati(page)).toBe("contrasto");
  // Con la sola icona il testo resta il nome del pulsante, e compare al passaggio (`title`).
  const impostazioni = page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true });
  await expect(impostazioni).toHaveAttribute("title", it.impostazioni);
  expect(await impostazioni.evaluate((b) => b.querySelector("span")!.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  // Le celle: un dato aggiunto ha il nome in un campo della sua riga.
  await page.getByRole("button", { name: it.aggiungiDato, exact: true }).click();
  await expect(page.getByRole("region", { name: it.vistaDati, exact: true }).getByRole("textbox").first()).toBeFocused();
});

test("la forma delle matrici scelta torna al riavvio, letta dal file delle preferenze", async ({ page }) => {
  for (const [forma, voce] of [
    ["in-fila", it.formaMatriceInFila],
    ["per-riga", it.formaMatricePerRiga],
  ] as const) {
    await apriVuota(page, fileDa("it", { ...scelteIniziali, formaDelleMatrici: forma }));
    const f = await apriLe(page);
    await scheda(f, it.impostazioniTabella);
    const gruppo = f.getByRole("group", { name: it.formaDelleMatrici, exact: true });
    await expect(gruppo.getByRole("radio", { name: voce, exact: true }), forma).toBeChecked();
    // Controllo positivo: delle tre una sola è scelta.
    await expect(gruppo.getByRole("radio", { checked: true })).toHaveCount(1);
  }
});

test("la forma delle tabelle scelta torna al riavvio, letta dal file delle preferenze", async ({ page }) => {
  for (const [forma, voce] of [
    ["per-elemento", it.formaTabellaPerElemento],
    ["per-campo", it.formaTabellaPerCampo],
    ["per-record", it.formaTabellaPerRecord],
  ] as const) {
    await apriVuota(page, fileDa("it", { ...scelteIniziali, formaDelleTabelle: forma }));
    const f = await apriLe(page);
    await scheda(f, it.impostazioniTabella);
    const gruppo = f.getByRole("group", { name: it.formaDelleTabelle, exact: true });
    await expect(gruppo.getByRole("radio", { name: voce, exact: true }), forma).toBeChecked();
    // Controllo positivo: delle tre una sola è scelta.
    await expect(gruppo.getByRole("radio", { checked: true })).toHaveCount(1);
  }
});

test("i valori iniziali nascosti spariscono dal flowchart; il valore iniziale di un vettore nelle due forme, nel disegno e nella vista dei dati", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const flowchart = page.getByRole("region", { name: it.vistaFlowchart, exact: true });
  const blocchi = () => flowchart.locator("[data-valore-iniziale] text").allTextContents();
  const vista = page.getByRole("region", { name: it.vistaDati, exact: true });
  const scheda = (nome: string) => page.getByRole("form", { name: riempi(it.modificaDelDato, { nome }), exact: true });
  const tipoDelValore = (f: Locator) => f.getByRole("combobox", { name: it.campoInizialeVettore, exact: true });
  /** Un vettore di cinque interi scritto da zero con «Aggiungi un dato»: il nome, la forma, gli elementi; il modo
   * del valore iniziale com'è nato, poi quello scelto (se si sceglie) e il valore. */
  async function vettore(nome: string, valore: string, modo?: string): Promise<string> {
    await vista.getByRole("button", { name: it.aggiungiDato, exact: true }).click();
    const f = scheda(it.datoSenzaNome);
    await f.getByRole("textbox", { name: it.datiNome, exact: true }).fill(nome);
    await f.getByRole("combobox", { name: it.campoForma, exact: true }).selectOption({ label: it.formaVettore });
    await f.getByRole("spinbutton", { name: it.campoElementi, exact: true }).fill("5");
    const nato = await tipoDelValore(f).evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.text ?? "");
    if (modo) await tipoDelValore(f).selectOption({ label: modo });
    await f.getByRole("textbox", { name: it.datiIniziale, exact: true }).fill(valore);
    await f.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
    await expect(page.getByRole("form")).toHaveCount(0);
    return nato;
  }
  const rigaDi = (nome: string) => vista.getByRole("row").filter({ has: page.getByRole("rowheader", { name: nome, exact: true }) });

  // Coi predefiniti: un vettore nuovo nasce con l'elenco; scelto il valore ripetuto, il blocco e la riga lo mostrano
  // come l'elenco che riempie.
  expect(await vettore("doppi", "0", it.inizialeRipetuto)).toBe(it.inizialeElenco);
  await expect.poll(blocchi).toEqual(["doppi ← {0, 0, 0, 0, 0}"]);
  await expect(rigaDi("doppi").getByRole("cell").nth(2)).toHaveText("{0, 0, 0, 0, 0}");

  // Un solo valore per tutti: lo stesso dato si mostra col valore solo, e un vettore nuovo nasce col valore ripetuto.
  let f = await apriLe(page);
  await f.getByRole("radio", { name: it.ripetutoUnValore, exact: true }).check();
  await conferma(f);
  await expect.poll(blocchi).toEqual(["doppi ← 0 in ogni elemento"]);
  await expect(rigaDi("doppi").getByRole("cell").nth(2)).toHaveText("0 in ogni elemento");
  // Ogni vettore scavalca l'impostazione: questo nasce col valore ripetuto, e gli si scrive un elenco.
  expect(await vettore("voti", "7, 4, 9, 6, 8", it.inizialeElenco)).toBe(it.inizialeRipetuto);
  await expect.poll(blocchi).toEqual(["doppi ← 0 in ogni elemento", "voti ← {7, 4, 9, 6, 8}"]);

  // Dal valore ripetuto all'elenco: il campo si riempie col valore, uno per elemento.
  await rigaDi("doppi").dblclick();
  await tipoDelValore(scheda("doppi")).selectOption({ label: it.inizialeElenco });
  await expect(scheda("doppi").getByRole("textbox", { name: it.datiIniziale, exact: true })).toHaveValue("{0, 0, 0, 0, 0}");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("form")).toHaveCount(0);

  // Nascosti: i blocchi spariscono; mostrati, tornano. Le scelte scritte nelle preferenze.
  f = await apriLe(page);
  await f.getByRole("radio", { name: it.valoriNascosti, exact: true }).check();
  await conferma(f);
  await expect(flowchart.locator("[data-valore-iniziale]")).toHaveCount(0);
  expect((await scritte(page)).at(-1)).toEqual({ preferenze: fileDa("it", { ...scelteIniziali, valoreRipetuto: "un-valore", valoriIniziali: "nascosti" }) });
  f = await apriLe(page);
  await expect(f.getByRole("radio", { name: it.valoriNascosti, exact: true })).toBeChecked();
  await f.getByRole("radio", { name: it.valoriMostrati, exact: true }).check();
  await conferma(f);
  await expect.poll(blocchi).toEqual(["doppi ← 0 in ogni elemento", "voti ← {7, 4, 9, 6, 8}"]);
});

test("ogni gruppo di opzioni sta in un riquadro, con la sua domanda dentro", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const f = await apriLe(page);
  const esiti: string[] = [];
  let gruppi = 0;
  for (const nome of [it.impostazioniDisegno, it.impostazioniModifica, it.impostazioniLimiti, it.impostazioniPercorsi, it.impostazioniTabella, it.impostazioniConsole]) {
    await scheda(f, nome);
    const visti = await f.getByRole("tabpanel", { name: nome, exact: true }).evaluate((p) =>
      [...new Set([...p.querySelectorAll('input[type="radio"], input[type="checkbox"]')].map((r) => r.closest("fieldset")))].map((g) => {
        if (g === null) return "un'opzione fuori da ogni gruppo";
        const s = getComputedStyle(g);
        const lati = [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat);
        const legenda = g.querySelector(":scope > legend")?.getBoundingClientRect();
        const r = g.getBoundingClientRect();
        const dentro = legenda !== undefined && legenda.top >= r.top - 1 && legenda.left >= r.left;
        return `${g.querySelector("legend")?.textContent}: bordo ${lati.join("/")} ${s.borderTopStyle}${dentro ? "" : ", domanda fuori"}`;
      }),
    );
    gruppi += visti.length;
    esiti.push(...visti.filter((v) => !/bordo [1-9][\d.]*\/[1-9][\d.]*\/[1-9][\d.]*\/[1-9][\d.]* solid$/.test(v)).map((v) => `${nome} · ${v}`));
  }
  // Controllo positivo della premessa: i gruppi sono quelli che le schede hanno (14 in Aspetto, coi tre dei cicli, quello
  // della copia di un vettore, quello dei blocchi selezionati, quello del blocco di Lettura, quello dei colori dei
  // blocchi e quello della guida; 7 in Modifica, con quello delle parentesi, quello dei casi d'uso, quello dei record e quello di «Riesegui»; 7
  // nella tabella di traccia, con quelli della forma delle matrici e delle tabelle; 2 nella console, con quello dei
  // linguaggi del codice generato).
  expect({ gruppi, senzaRiquadro: esiti }).toEqual({ gruppi: 30, senzaRiquadro: [] });
});

test("il menu dei linguaggi: ▲ ▼ spostano una riga col fuoco sul pulsante, l'ultimo acceso non si spegne, «Conferma» dà le linguette nell'ordine e le scrive, e al riavvio tornano", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const genera = page.getByRole("banner").getByRole("button", { name: it.pannelloCodice, exact: true });
  const linguette = () => page.getByRole("region", { name: it.codiceGenerato, exact: true }).getByRole("tab");
  await genera.click();
  await expect(linguette()).toHaveText([it.linguaggioPseudocodice, it.linguaggioPython, it.linguaggioC]);
  await page.getByRole("region", { name: it.codiceGenerato, exact: true }).getByRole("tab", { name: it.linguaggioPython, exact: true }).click();

  let f = await apriLe(page);
  await scheda(f, it.impostazioniConsole);
  const menu = () => f.getByRole("group", { name: it.linguaggiDelCodice, exact: true });
  const righe = () => menu().getByRole("listitem").evaluateAll((r) => r.map((x) => `${(x as HTMLElement).dataset.linguaggio}${x.querySelector("input")!.checked ? "" : " (spento)"}`));
  const pulsante = (nome: string, su: boolean) => menu().getByRole("button", { name: riempi(su ? it.linguaggioSu : it.linguaggioGiu, { linguaggio: nome }), exact: true });
  const casella = (nome: string) => menu().getByRole("checkbox", { name: nome, exact: true });
  expect(await righe()).toEqual(["pseudocodice", "python", "c", "accademico (spento)", "typescript (spento)"]);
  // ▲ sul C due volte: sale in cima, e il fuoco resta sul suo ▲ (fermo, raggiungibile); dalla tastiera, Invio.
  await pulsante(it.linguaggioC, true).click();
  await expect(pulsante(it.linguaggioC, true)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(righe).toEqual(["c", "pseudocodice", "python", "accademico (spento)", "typescript (spento)"]);
  await expect(pulsante(it.linguaggioC, true)).toBeFocused();
  await expect(pulsante(it.linguaggioC, true)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  expect(await righe()).toEqual(["c", "pseudocodice", "python", "accademico (spento)", "typescript (spento)"]);
  // Spenti lo pseudocodice e il Python, il C non si spegne e la riga lo dice; riacceso il Python, sì.
  await casella(it.linguaggioPseudocodice).uncheck();
  await casella(it.linguaggioPython).uncheck();
  await expect(casella(it.linguaggioC)).toBeDisabled();
  await expect(menu().getByText(it.almenoUnLinguaggio, { exact: true })).toBeVisible();
  await casella(it.linguaggioPython).check();
  await expect(casella(it.linguaggioC)).toBeEnabled();
  await expect(menu().getByText(it.almenoUnLinguaggio, { exact: true })).toHaveCount(0);
  await conferma(f);
  // La linguetta guardata (Python) c'è ancora e resta mostrata; l'ordine è quello del menu.
  await expect(linguette()).toHaveText([it.linguaggioC, it.linguaggioPython]);
  await expect(page.getByRole("region", { name: it.codiceGenerato, exact: true }).getByRole("tab", { selected: true })).toHaveText(it.linguaggioPython);
  const scritta = (await scritte(page)).at(-1);
  expect(scritta).toEqual({ preferenze: fileDa("it", { ...scelteIniziali, linguaggiDelCodice: ["c", "python"] }) });

  // Il riavvio con le preferenze scritte: le linguette nell'ordine, mostrata la prima; il menu con lo spento in fondo.
  await apriVuota(page, scritta!.preferenze);
  await genera.click();
  await expect(linguette()).toHaveText([it.linguaggioC, it.linguaggioPython]);
  await expect(page.getByRole("region", { name: it.codiceGenerato, exact: true }).getByRole("tab", { selected: true })).toHaveText(it.linguaggioC);
  f = await apriLe(page);
  await scheda(f, it.impostazioniConsole);
  expect(await righe()).toEqual(["c", "python", "pseudocodice (spento)", "accademico (spento)", "typescript (spento)"]);
});

test.describe("col sistema in italiano, le preferenze che non si leggono", () => {
  test.use({ locale: "it-IT" });

  test("se le preferenze non si leggono, l'app parte lo stesso con le scelte predefinite, e l'errore va nella console", async ({ page }) => {
    const errori: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errori.push(m.text());
    });
    await apriVuota(page, { lingua: "en", colori: "contrasto" }, { preferenzeIlleggibili: true });
    // La finestra c'è, nella lingua del sistema e coi colori predefiniti: le preferenze salvate (l'inglese, i colori a
    // contrasto) non sono state lette.
    await expect(page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true })).toBeVisible();
    expect(await coloriApplicati(page)).toBe("tenue");
    expect(errori.some((e) => e.includes("le preferenze non si leggono")), errori.join(" | ")).toBe(true);
  });
});

// Il sistema in italiano: se il campo rotto costasse anche la lingua salvata (l'inglese), l'app partirebbe in
// italiano e il comando delle Impostazioni inglese non ci sarebbe.
test.describe("col sistema in italiano", () => {
  test.use({ locale: "it-IT" });

  test("un campo rotto nel file delle preferenze scarta lui solo: gli altri restano", async ({ page }) => {
    await apriVuota(page, { lingua: "en", colori: 5, condizioni: "su-una-riga", valoriIniziali: "nascosto", valoreRipetuto: "un-valore", limiti: { elementiDiUnVettore: "tanti", lunghezzaDiUnaStringa: 7 } });
    // La lingua è rimasta (i testi sono inglesi), i colori no (il valore non è del tipo giusto).
    const f = await apriLe(page, en);
    await expect(f.getByRole("radio", { name: en.coloriTenue, exact: true })).toBeChecked();
    await expect(f.getByRole("radio", { name: en.condizioniUnaRiga, exact: true })).toBeChecked();
    // I valori iniziali: il valore che l'app non conosce vale come assente (mostrati); l'altro resta.
    await expect(f.getByRole("radio", { name: en.valoriMostrati, exact: true })).toBeChecked();
    await expect(f.getByRole("radio", { name: en.ripetutoUnValore, exact: true })).toBeChecked();
    expect(await coloriApplicati(page)).toBe("tenue");
    await scheda(f, en.impostazioniLimiti);
    await expect(campo(f, en.limiteVettore)).toHaveValue(String(tetti.elementiDiUnVettore));
    await expect(campo(f, en.limiteStringa)).toHaveValue("7");
  });
});

test("la cartella degli esempi scelta vale (vuota, resta vuota); se non c'è più, gli esempi della predefinita, e lo si dice", async ({ page, context }) => {
  const scelta = "D:\\Scuola\\esempi della classe";
  await apriVuota(page, { lingua: "it" }, { cartelle: { [scelta]: {} }, daScegliere: scelta });
  let f = await apriLe(page);
  await scheda(f, it.impostazioniPercorsi);
  // Nella scheda «Percorsi» il riquadro degli esempi, sotto quello delle librerie.
  const riquadro = (f2: typeof f) => f2.getByRole("group", { name: it.percorsiEsempi, exact: true });
  await riquadro(f).getByRole("button", { name: it.cartellaScegli, exact: true }).click();
  await expect(riquadro(f).getByText(`Cartella: ${scelta}`, { exact: true })).toBeVisible();
  await conferma(f);
  expect((await scritte(page)).at(-1)).toEqual({ preferenze: fileDa("it", { ...scelteIniziali, cartellaEsempi: scelta }) });
  await (await voceDellAiuto(page, it.esempi)).click();
  const esempi = page.getByRole("dialog", { name: it.esempiTitolo, exact: true });
  await expect(esempi.getByText(it.esempiNessuno, { exact: true })).toBeVisible();
  await expect(esempi.getByText(`Cartella: ${scelta}`, { exact: true })).toBeVisible();
  // Controllo positivo: la cartella predefinita ha ancora i suoi quattro esempi.
  expect(Object.keys(await page.evaluate(() => window.__finzione__.esempi ?? {}))).toHaveLength(4);

  // Una scelta che non c'è più: gli esempi della predefinita, e la scheda lo dice.
  const altra = await context.newPage();
  await apriVuota(altra, { lingua: "it", cartellaEsempi: "E:\\Chiavetta tolta\\esempi" });
  await (await voceDellAiuto(altra, it.esempi)).click();
  const elenco = altra.getByRole("dialog", { name: it.esempiTitolo, exact: true });
  await expect(elenco.getByRole("listitem")).toHaveCount(Object.keys(esempiDelCorpus()).length);
  await altra.keyboard.press("Escape");
  await expect(elenco).toBeHidden();
  f = await apriLe(altra);
  await scheda(f, it.impostazioniPercorsi);
  await expect(riquadro(f).getByText(/^La cartella scelta, «E:\\Chiavetta tolta\\esempi», non c'è/)).toBeVisible();
  // «Usa la cartella predefinita» toglie la scelta dal file.
  await riquadro(f).getByRole("button", { name: it.cartellaPredefinita, exact: true }).click();
  await conferma(f);
  expect((await scritte(altra)).at(-1)).toEqual({ preferenze: fileDa("it", scelteIniziali) });
});
