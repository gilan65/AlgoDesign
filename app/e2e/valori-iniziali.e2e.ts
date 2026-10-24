// Il valore iniziale di un dato modificato dal flowchart, nei motori veri: il blocco sotto «Inizio» si sceglie, i suoi
// campi scrivono il valore del dato, «Elimina» e Canc lo tolgono chiedendo conferma, e la vista dei dati e il blocco
// dicono sempre la stessa cosa.
//
// A ogni passo si leggono quattro cose e si confrontano con l'ATTESO SCRITTO A MANO qui (la tabella delle vie nei due
// versi, prima del codice): il testo dei blocchi disegnati, il nome dei loro pulsanti per gli ausili, la colonna del
// valore iniziale nella vista dei dati e il valore iniziale nel file salvato (`initial`, con Ctrl+S).
//
// - Dal blocco al dato: i campi aperti col doppio clic e con Invio, il valore di un intero e l'elenco di un vettore, il
//   valore ripetuto e il passaggio all'elenco che riempie il campo, Esc che non cambia nulla; «Elimina» confermato e Canc
//   rifiutato; il valore vuotato nei campi, che chiede come «Elimina»; la costante, che non si toglie; Annulla e Ripeti;
//   F9, che dice perché un valore iniziale non ha punti di interruzione.
// - Dalla vista dei dati al blocco, le vie che `modifica-dati.e2e.ts` non percorre: la dimensione, la forma, il file
//   aperto.
// - Controllo positivo: un valore atteso diverso fa rosso (la lettura distingue).
//
// CHE COSA NON GUARDA:
// - le altre vie della vista dei dati (impostato, cambiato, tolto, rinominato, tipo, vettore, dato cancellato,
//   Annulla): `modifica-dati.e2e.ts`;
// - le costanti comuni (in sola lettura, nessuna nel corpus): i loro blocchi si scelgono e non si aprono, lo prova la
//   struttura sotto happy-dom;
// - l'aspetto dei campi e della finestra di conferma;
// - un lettore di schermo vero: qui gli attributi degli ausili.

import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Dato, Funzione } from "../core/progetto/modello";
import { testiDeiCodici } from "../i18n/codici";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { riferimento } from "./albero";
import { apri, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const NOME = "valori iniziali da modificare";
/** Il riferimento con un vettore e una costante in più. */
const programma: Funzione = {
  ...riferimento,
  data: [...riferimento.data, { name: "v", type: "integer", size: 3, initial: ["1", "2", "3"] }, { name: "MAX", type: "integer", constant: true, initial: "5" }],
};
const SALVATO = "C:\\miei\\valori iniziali.algo";

const flowchartDi = (page: Page) => page.getByRole("group", { name: `${it.flowchart}: ${NOME}`, exact: true });
const tabellaDi = (page: Page) => page.getByRole("table", { name: `${it.dati}: ${NOME}`, exact: true });
const nella = (page: Page, nome: string) => page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: nome, exact: true });
const voce = (page: Page, dato: string) => flowchartDi(page).locator(`[data-iniziale-di="${dato}"]`);
const campi = (page: Page, testo: string) => page.getByRole("form", { name: riempi(it.modificaDelBlocco, { blocco: `${it.bloccoAssegnazione}: ${testo}` }), exact: true });
const conferma = (page: Page, dato: string) => page.getByRole("alertdialog", { name: riempi(it.togliValoreTitolo, { nome: dato }), exact: true });
const avviso = (page: Page) => page.locator('output[role="status"]');

/** Ciò che la finestra dice dei valori iniziali, letto in quattro modi. */
async function leggi(page: Page, percorso: string): Promise<{ blocchi: string[]; voci: string[]; righe: string[]; file: Record<string, Dato["initial"] | null> }> {
  const flowchart = flowchartDi(page);
  const blocchi = await flowchart.locator("[data-valore-iniziale] text").allTextContents();
  const voci = await flowchart.locator("[data-iniziale]").evaluateAll((vs) => vs.map((v) => v.getAttribute("aria-label") ?? ""));
  // Le righe dei dati che hanno un valore iniziale: nome e valore come li scrive la vista.
  const righe = await tabellaDi(page)
    .locator("tbody tr")
    .evaluateAll((rs) =>
      rs
        .filter((r) => r.querySelector('[role="rowheader"], th'))
        .map((r) => [...r.children].map((c) => (c.hasAttribute("data-nessuno") ? "" : (c.textContent ?? ""))))
        .filter((c) => c[3] !== "")
        .map((c) => `${c[0]} ← ${c[3]}`),
    );
  // Il file: salvato con Ctrl+S (la prima volta con il nome scelto qui, poi sullo stesso file; un file aperto sul suo).
  await page.evaluate((p) => {
    window.__finzione__.daSalvare = p;
    delete window.__finzione__.file[p];
  }, percorso);
  await page.keyboard.press("Control+s");
  await page.waitForFunction((p) => window.__finzione__.file[p] !== undefined, percorso, { polling: "raf" });
  const testo = await page.evaluate((p) => window.__finzione__.file[p]!, percorso);
  const dati = (JSON.parse(testo).functions[0].data as Dato[]).filter((d) => ["somma", "i", "j", "v", "MAX", "contati"].includes(d.name));
  return { blocchi, voci, righe, file: Object.fromEntries(dati.map((d) => [d.name, d.initial ?? null])) };
}

/** Il confronto con l'atteso: i blocchi sono quelli scritti, le voci hanno il loro testo, le righe dei dati lo stesso,
 * il file i valori scritti. */
async function controlla(page: Page, passo: string, blocchi: string[], file: Record<string, Dato["initial"] | null>, percorso = SALVATO): Promise<void> {
  await expect.poll(async () => (await flowchartDi(page).locator("[data-valore-iniziale] text").allTextContents()), { message: `${passo}: i blocchi` }).toEqual(blocchi);
  const visto = await leggi(page, percorso);
  expect(visto.voci, `${passo}: il nome di un blocco per gli ausili non è il suo testo`).toEqual(blocchi.map((b) => `${it.bloccoAssegnazione}: ${b}`));
  expect(visto.righe, `${passo}: la vista dei dati dice un valore diverso dal blocco`).toEqual(blocchi);
  expect(visto.file, `${passo}: il valore iniziale nel file`).toEqual(file);
}

test("dal blocco al dato: campi, Elimina con e senza conferma, il valore vuotato, la costante, Annulla e Ripeti, F9", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apri(page, { lingua: "it" }, undefined, [{ nome: NOME, titolo: NOME, funzione: programma }]);
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  let passi = 0;
  const vede = async (passo: string, blocchi: string[], file: Record<string, Dato["initial"] | null>) => {
    await controlla(page, passo, blocchi, file);
    passi++;
  };
  const tutti = { contati: "0", somma: "0", i: "0", j: "0", v: ["1", "2", "3"], MAX: "5" };
  await vede("all'apertura", ["contati ← 0", "insufficienti ← 0", "somma ← 0", "i ← 0", "j ← 0", "v ← {1, 2, 3}", "MAX ← 5"], tutti);

  // I campi col doppio clic: il valore solo, Invio, il fuoco torna sul blocco.
  await voce(page, "somma").dblclick();
  const diSomma = campi(page, "somma ← 0");
  await expect(diSomma).toHaveCount(1);
  await expect(diSomma.getByRole("textbox")).toHaveCount(1);
  await diSomma.getByRole("textbox", { name: it.campoValore, exact: true }).fill("7");
  await diSomma.getByRole("textbox", { name: it.campoValore, exact: true }).press("Enter");
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(voce(page, "somma")).toBeFocused();
  await vede("valore di somma", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0", "v ← {1, 2, 3}", "MAX ← 5"], { ...tutti, somma: "7" });

  // I campi con Invio, su un vettore: l'elenco; poi il valore ripetuto.
  await voce(page, "v").focus();
  await page.keyboard.press("Enter");
  const diV = campi(page, "v ← {1, 2, 3}");
  await diV.getByRole("textbox", { name: it.campoValore, exact: true }).fill("4, 5, 6");
  await diV.getByRole("textbox", { name: it.campoValore, exact: true }).press("Enter");
  await vede("elenco di v", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0", "v ← {4, 5, 6}", "MAX ← 5"], { ...tutti, somma: "7", v: ["4", "5", "6"] });
  await voce(page, "v").dblclick();
  const diV2 = campi(page, "v ← {4, 5, 6}");
  await diV2.getByRole("combobox", { name: it.campoInizialeVettore, exact: true }).selectOption({ label: it.inizialeRipetuto });
  await diV2.getByRole("textbox", { name: it.campoValore, exact: true }).fill("0");
  await diV2.getByRole("textbox", { name: it.campoValore, exact: true }).press("Enter");
  const ripetuto = { ...tutti, somma: "7", v: { each: "0" } };
  await vede("valore ripetuto di v", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0", "v ← {0, 0, 0}", "MAX ← 5"], ripetuto);
  // Il passaggio all'elenco riempie il campo; Esc non cambia nulla.
  await voce(page, "v").dblclick();
  const diV3 = campi(page, "v ← {0, 0, 0}");
  await diV3.getByRole("combobox", { name: it.campoInizialeVettore, exact: true }).selectOption({ label: it.inizialeElenco });
  await expect(diV3.getByRole("textbox", { name: it.campoValore, exact: true })).toHaveValue("{0, 0, 0}");
  await diV3.getByRole("textbox", { name: it.campoValore, exact: true }).press("Escape");
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(voce(page, "v")).toBeFocused();
  await vede("Esc sui campi", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0", "v ← {0, 0, 0}", "MAX ← 5"], ripetuto);

  // «Elimina» dalla barra chiede; confermato, il blocco sparisce e il fuoco va al blocco dopo.
  await voce(page, "j").click();
  await nella(page, it.elimina).click();
  await expect(conferma(page, "j")).toBeVisible();
  await expect(conferma(page, "j")).toContainText(it.togliValoreSpiegazione);
  await conferma(page, "j").getByRole("button", { name: it.togliValoreConferma, exact: true }).click();
  await expect(conferma(page, "j")).toHaveCount(0);
  const senzaJ = { ...ripetuto, j: null };
  await vede("Elimina confermato", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "v ← {0, 0, 0}", "MAX ← 5"], senzaJ);
  await expect(voce(page, "v")).toBeFocused();

  // Canc chiede; Esc rinuncia, nulla cambia e il fuoco torna sul blocco.
  await voce(page, "i").focus();
  await page.keyboard.press("Delete");
  await expect(conferma(page, "i")).toBeVisible();
  // Con la conferma aperta né i tasti dell'esecuzione né Annulla fanno nulla: il programma non parte (lo stato resta
  // «Pronto» due fotogrammi dopo) e il progetto non cambia (lo dice il confronto dopo Esc).
  for (const tasto of ["F5", "F10", "Control+z"]) await page.keyboard.press(tasto);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(it.statoPronto);
  await expect(conferma(page, "i")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(conferma(page, "i")).toHaveCount(0);
  await expect(voce(page, "i")).toBeFocused();
  await vede("Canc rifiutato", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "v ← {0, 0, 0}", "MAX ← 5"], senzaJ);

  // La costante: «Elimina» spento, Canc non chiede, il valore vuotato non si conferma.
  await voce(page, "MAX").click();
  await expect(nella(page, it.elimina)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Delete");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.keyboard.press("Enter");
  const diMax = campi(page, "MAX ← 5");
  await diMax.getByRole("textbox", { name: it.campoValore, exact: true }).fill("");
  await diMax.getByRole("textbox", { name: it.campoValore, exact: true }).press("Enter");
  await expect(diMax).toHaveCount(1);
  await expect(avviso(page)).toHaveText(it.annuncioCostanteSenzaValore);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await diMax.getByRole("textbox", { name: it.campoValore, exact: true }).press("Escape");
  await vede("la costante", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "v ← {0, 0, 0}", "MAX ← 5"], senzaJ);

  // Il valore vuotato nei campi di una variabile chiede come «Elimina»; confermato, il valore iniziale va via.
  await voce(page, "i").dblclick();
  const diI = campi(page, "i ← 0");
  await diI.getByRole("textbox", { name: it.campoValore, exact: true }).fill("");
  await diI.getByRole("textbox", { name: it.campoValore, exact: true }).press("Enter");
  await expect(conferma(page, "i")).toBeVisible();
  await conferma(page, "i").getByRole("button", { name: it.togliValoreConferma, exact: true }).click();
  const senzaIJ = { ...senzaJ, i: null };
  await vede("valore vuotato", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "v ← {0, 0, 0}", "MAX ← 5"], senzaIJ);

  // Annulla e Ripeti: un passo per modifica.
  await flowchart.locator('[data-iniziale-di="somma"]').focus();
  await page.keyboard.press("Control+z");
  await vede("Annulla", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "v ← {0, 0, 0}", "MAX ← 5"], senzaJ);
  await page.keyboard.press("Control+z");
  await vede("Annulla due volte", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "j ← 0", "v ← {0, 0, 0}", "MAX ← 5"], ripetuto);
  await page.keyboard.press("Control+y");
  await vede("Ripeti", ["contati ← 0", "insufficienti ← 0", "somma ← 7", "i ← 0", "v ← {0, 0, 0}", "MAX ← 5"], senzaJ);

  // F9 su un valore iniziale dice perché non ha punti; il pulsante del punto è spento.
  await voce(page, "somma").click();
  await page.keyboard.press("F9");
  await expect(avviso(page)).toHaveText(it.annuncioPuntoSuUnValore);
  await expect(flowchart.locator("[data-interruzione]")).toHaveCount(0);

  console.log(`[${info.project.name}] dal blocco al dato: situazioni confrontate coi quattro lettori ${passi}`);
  expect(passi).toBe(12);
  // Controllo positivo: un valore atteso diverso fa rosso.
  await expect(controlla(page, "controllo positivo", ["contati ← 0", "insufficienti ← 0", "somma ← 8", "i ← 0", "v ← {0, 0, 0}", "MAX ← 5"], senzaJ)).rejects.toThrow();
});

test("dalla vista dei dati al blocco: la dimensione, la forma, il file aperto", async ({ page }) => {
  test.setTimeout(120_000);
  const conRipetuto: Funzione = { ...programma, data: programma.data.map((d) => (d.name === "v" ? { ...d, initial: { each: "0" } } : d)) };
  await apri(page, { lingua: "it" }, undefined, [{ nome: NOME, titolo: NOME, funzione: conRipetuto }]);
  await expect(flowchartDi(page)).toBeVisible();
  const tutti = { contati: "0", somma: "0", i: "0", j: "0", v: { each: "0" }, MAX: "5" };
  const testa = ["contati ← 0", "insufficienti ← 0", "somma ← 0", "i ← 0", "j ← 0"];
  await controlla(page, "all'apertura", [...testa, "v ← {0, 0, 0}", "MAX ← 5"], tutti);
  const tabella = tabellaDi(page);
  const scheda = async (nome: string, scrivi: (s: Locator) => Promise<unknown>) => {
    await tabella.getByRole("rowheader", { name: nome, exact: true }).dblclick();
    const s = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome }), exact: true });
    await scrivi(s);
    await s.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
    await expect(page.getByRole("form")).toHaveCount(0);
  };
  // La dimensione: il valore ripetuto riempie quattro elementi.
  await scheda("v", (s) => s.getByRole("spinbutton", { name: it.campoElementi, exact: true }).fill("4"));
  await controlla(page, "la dimensione", [...testa, "v ← {0, 0, 0, 0}", "MAX ← 5"], tutti);
  // La forma: il vettore diventa un dato semplice, col valore com'era scritto.
  await scheda("v", (s) => s.getByRole("combobox", { name: it.campoForma, exact: true }).selectOption({ label: it.formaSemplice }));
  await controlla(page, "la forma", [...testa, "v ← 0", "MAX ← 5"], { ...tutti, v: "0" });
  // Il file aperto: i blocchi sono quelli dei suoi dati.
  const altro = "C:\\miei\\altro.algo";
  await page.evaluate(
    ([p, t]) => {
      window.__finzione__.file[p!] = t!;
      window.__finzione__.daAprire = p!;
    },
    [
      altro,
      JSON.stringify({
        format: "algodesign",
        schema_version: 1,
        metadata: { name: NOME },
        functions: [
          {
            ...riferimento,
            data: [
              { name: "somma", type: "integer", initial: "3" },
              { name: "v", type: "real", size: 12, initial: { each: "0.5" } },
              { name: "MAX", type: "integer", constant: true, initial: "9" },
            ],
          },
        ],
      }),
    ],
  );
  await page.keyboard.press("Control+o");
  await expect(avviso(page)).toHaveText(riempi(it.apertoIl, { file: "altro.algo" }));
  await controlla(page, "il file aperto", ["somma ← 3", "v ← {0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, … altri 2}", "MAX ← 9"], { somma: "3", v: { each: "0.5" }, MAX: "9" }, altro);
});

// Il dato letto prima di avere un valore: l'avviso nella riga di stato e sul blocco che legge, col comando che apre il
// valore iniziale del dato nella vista dei dati (nei due modi), spento durante l'esecuzione. ATTESO SCRITTO A MANO:
// «somma» senza valore iniziale è letta dalla somma nel ciclo (b2) e dalla scrittura (b4): due avvisi, un dato.
const senzaValore: Funzione = {
  id: "f1",
  kind: "main",
  data: [
    { name: "somma", type: "integer" },
    { name: "i", type: "integer", initial: "1" },
  ],
  body: [
    {
      id: "b1",
      kind: "while",
      condition: "i <= 3",
      body: [
        { id: "b2", kind: "assignment", target: "somma", value: "somma + i" },
        { id: "b3", kind: "assignment", target: "i", value: "i + 1" },
      ],
    },
    { id: "b4", kind: "write", values: ['"Somma: "', "somma"], newline: true },
  ],
  end: { id: "b5" },
};
const NOME_SENZA = "somma senza valore iniziale";

for (const modo of ["scheda", "celle"] as const)
  test(`il dato letto prima di avere un valore: l'avviso sul blocco e nella riga di stato, il comando che apre il valore iniziale (dati a ${modo})`, async ({ page }) => {
    test.setTimeout(120_000);
    await apri(page, { lingua: "it", modoDeiDati: modo }, undefined, [{ nome: NOME_SENZA, titolo: NOME_SENZA, funzione: senzaValore }]);
    const flowchart = page.getByRole("group", { name: `${it.flowchart}: ${NOME_SENZA}`, exact: true });
    await expect(flowchart).toBeVisible();
    const stato = page.getByRole("region", { name: it.rigaDiStato, exact: true });
    const testo = testiDeiCodici.it.maybe_uninitialized;
    // Il segno «?» e la descrizione sui due blocchi che leggono, e su nessun altro.
    const segnati = await flowchart.locator("[data-blocco]").evaluateAll((bs) => bs.filter((b) => b.querySelector('[data-segno="avviso"]')).map((b) => b.getAttribute("data-blocco")));
    expect(segnati).toEqual(["b2", "b4"]);
    for (const id of ["b2", "b4"]) await expect(flowchart.locator(`[data-blocco="${id}"] > desc`)).toHaveText(riempi(it.segnalazioneAvviso, testo));
    // La riga di stato: due avvisi; nell'elenco una voce per blocco, ciascuna col comando che nomina il dato.
    await expect(stato).toContainText(riempi(it.statoAvvisi, { n: "2" }));
    await stato.getByRole("button", { name: it.statoMostra, exact: true }).click();
    const elenco = stato.getByRole("list", { name: it.elencoDelControllo, exact: true });
    const comandi = elenco.getByRole("button", { name: riempi(it.daiUnValore, { nome: "somma" }), exact: true });
    await expect(comandi).toHaveCount(2);
    await expect(elenco.getByRole("listitem")).toHaveText([
      `${riempi(it.voceAvviso, { dove: `${it.bloccoAssegnazione}: somma ← somma + i`, breve: testo.breve })}${riempi(it.daiUnValore, { nome: "somma" })}`,
      `${riempi(it.voceAvviso, { dove: `${it.bloccoScrittura}: "Somma: ", somma`, breve: testo.breve })}${riempi(it.daiUnValore, { nome: "somma" })}`,
    ]);
    // Il comando con la vista dei dati chiusa: si apre, e il fuoco è nel campo del valore iniziale della riga di «somma».
    await page.getByRole("banner").getByRole("button", { name: it.dati, exact: true }).click();
    await expect(page.getByRole("region", { name: it.vistaDati, exact: true })).toBeHidden();
    await comandi.first().click();
    await expect(page.getByRole("region", { name: it.vistaDati, exact: true })).toBeVisible();
    const campo = page.locator(':focus[data-campo="iniziale"]');
    await expect(campo).toHaveCount(1);
    await expect(campo).toHaveAccessibleName(modo === "scheda" ? it.datiIniziale : riempi(it.campoDellaRiga, { campo: it.datiIniziale, n: "1" }));
    // Il valore scritto e confermato toglie i due avvisi.
    await campo.fill("0");
    await campo.press("Enter");
    await expect(stato).toContainText(it.statoNessuno);
    await expect(flowchart.locator('[data-segno="avviso"]')).toHaveCount(0);
    // Annullato, gli avvisi tornano; durante l'esecuzione (che parte: è un avviso) il comando è spento.
    // (Il pulsante della barra: nelle celle il fuoco è ancora nel campo, dove Ctrl+Z è quello del campo.)
    await page.getByRole("banner").getByRole("button", { name: it.annulla, exact: true }).click();
    await expect(stato).toContainText(riempi(it.statoAvvisi, { n: "2" }));
    await page.keyboard.press("F10");
    await expect(stato.locator("[data-stato-esecuzione]")).not.toHaveText(it.statoPronto);
    // L'elenco resta aperto com'era; se no, si apre.
    const mostra = stato.getByRole("button", { name: it.statoMostra, exact: true });
    if ((await mostra.count()) > 0) await mostra.click();
    await expect(comandi).toHaveCount(2);
    for (const c of await comandi.all()) await expect(c).toBeDisabled();
  });
