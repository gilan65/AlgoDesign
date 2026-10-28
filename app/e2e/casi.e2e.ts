// I casi d'uso nella finestra, nei motori veri: «Esegui tutti» che non blocca la pagina, il menu di un caso dal tasto
// destro e dalla tastiera, un caso eseguito nella colonna.
//
// - «Esegui tutti» su due programmi pesanti, ognuno con un caso: il corpus che arriva al tetto del milione di azioni e
//   un ciclo che scrive seimila caratteri a giro (fino al tetto dei passi, più di venti secondi). Mezzo secondo dopo il
//   clic, e di nuovo dopo due secondi se corre ancora: la risposta della pagina (un giro di andata e ritorno) e il
//   fotogramma più lungo in un secondo; poi «Ferma», dal clic all'avanzamento sparito, se la corsa non è finita da sé.
//   Tutto entro la soglia di un secondo; i valori e il margine si stampano. Premessa: il ciclo è ancora in corsa al
//   momento di «Ferma» (o «Ferma» non misurerebbe nulla), e gli esiti dei casi fermati non ci sono.
// - Il menu del caso: il tasto destro sulla riga lo apre col suo nome; Maiusc+F10 sulla riga scelta lo apre col fuoco
//   sulla prima voce, Esc lo chiude e torna alla riga; «Elimina» chiede conferma. Prima, coi campi del primo caso
//   aperti, «Esegui» sulla riga del secondo lo esegue al primo clic.
// - Un caso nella colonna: «Esegui» sulla riga del caso apre la tabella e la console, e alla fine l'esito è l'ultima riga
//   della console, in vista, e il pallino del caso; poi l'utente risale nella console e un clic su un blocco ridisegna la
//   finestra senza cambiarne il contenuto: la console resta dove l'utente l'ha portata.
// - «Passo passo» sul caso di una funzione importata da una libreria: a ogni pausa un solo blocco acceso nel disegno, la
//   prima volta l'«Inizio» (la costante comune, che la scheda della funzione non disegna); alla fine il pallino.
// - Un'esecuzione salvata come caso d'uso: l'errore in una funzione chiamata ne mostra la scheda; dalla console il caso va
//   al programma, coi campi aperti e il fuoco sul nome selezionato, che scrivendo si sostituisce; dalla scheda dei casi lo
//   stesso caso non si ripete (il fuoco sulla sua riga, l'avviso).
//
// CHE COSA NON GUARDA:
// - l'esito dei casi (lo confronta con la riga di comando la prova sotto happy-dom, `ui/casi/casi.test.tsx`), e il caso
//   passo passo azione per azione, i punti di interruzione, i limiti, i comandi dall'esito (`ui/casi/colonna.test.tsx`);
// - la WebView2 e WebKitGTK (la prova sul prodotto);
// - la soglia sotto un carico diverso da quello della corsa;
// - la scheda in secondo piano: la pagina della prova è in primo piano.

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriEsempio, apriVuota, costruisciFinzione } from "./pagina";
import { fotogrammi, risposta, SOGLIA_MS } from "./risposta";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const troppiPassi = readFileSync(fileURLToPath(new URL("../casi/tappa-1/troppi-passi.algo", import.meta.url)), "utf8");
/** Il ciclo che scrive seimila caratteri a giro, con un caso che non attende nulla. */
const seimila = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "seimila" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "s", type: "string", max_length: 1000, initial: `"${"x".repeat(1000)}"` }],
      body: [{ id: "b1", kind: "while", condition: "true", body: [{ id: "b2", kind: "write", values: ["s", "s", "s", "s", "s", "s"], newline: true }] }],
      end: { id: "b3" },
    },
  ],
  test_cases: [{ name: "seimila", inputs: [], expected: { output: "" } }],
});

/** La finestra col progetto aperto dagli esempi e la scheda dei casi d'uso. */
async function apriICasi(page: Page, testo: string): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 casi.algo": testo } });
  await apriEsempio(page, 0);
  await page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ }).click();
}

const avanzamento = (page: Page) => page.locator("[data-avanzamento]");

for (const p of [
  { nome: "il tetto del milione di azioni", testo: troppiPassi, finisce: true },
  { nome: "il ciclo dei seimila caratteri", testo: seimila, finisce: false },
])
  test(`«Esegui tutti» non blocca la finestra: ${p.nome}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await apriICasi(page, p.testo);
    const misure: { cosa: string; ms: number }[] = [];
    await page.getByRole("button", { name: it.eseguiTutti, exact: true }).click();
    for (const dopo of [500, 2_000]) {
      await page.waitForTimeout(dopo === 500 ? 500 : 1_500);
      if (!(await avanzamento(page).isVisible())) break;
      misure.push({ cosa: `risposta dopo ${dopo} ms`, ms: await risposta(page) });
      const f = await fotogrammi(page, 1_000);
      misure.push({ cosa: `fotogramma più lungo dopo ${dopo} ms (${f.n} in 1 s)`, ms: f.peggiore });
    }
    // Premessa: la misura durante la corsa c'è (almeno a mezzo secondo).
    expect(misure.length, "campioni durante la corsa").toBeGreaterThan(0);
    const inCorsa = await avanzamento(page).isVisible();
    if (!p.finisce) expect(inCorsa, "il ciclo corre ancora prima di «Ferma»").toBe(true);
    if (inCorsa) {
      const t = Date.now();
      // Il tetto del milione può arrivare da sé fra la domanda e il clic: allora «Ferma» sparisce, non c'è nulla da
      // fermare e il caso è raggiunto (visto nel WebKit sul build: il clic aspettava un pulsante che non c'era più).
      const fermata = await page
        .getByRole("tabpanel")
        .getByRole("button", { name: it.casiFerma, exact: true })
        .click({ timeout: p.finisce ? 5_000 : 30_000 })
        .then(
          () => true,
          async (e: unknown) => {
            if (!p.finisce || (await avanzamento(page).count()) > 0) throw e;
            return false;
          },
        );
      await expect(avanzamento(page)).toHaveCount(0, { timeout: 30_000 });
      if (fermata) misure.push({ cosa: "«Ferma»", ms: Date.now() - t });
      await expect(page.locator("tr[data-caso] [data-esito]")).toHaveAttribute("data-esito", p.finisce ? /^(mai|raggiunto)$/ : "mai");
    } else await expect(page.locator("tr[data-caso] [data-esito]")).toHaveAttribute("data-esito", "raggiunto");
    const peggiore = Math.max(...misure.map((m) => m.ms));
    console.log(
      `[${info.project.name}] «Esegui tutti» con ${p.nome}: ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}; il più lungo ${peggiore} ms, margine ${Math.round((100 * (SOGLIA_MS - peggiore)) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms)`,
    );
    for (const m of misure) expect(m.ms, m.cosa).toBeLessThanOrEqual(SOGLIA_MS);
  });

test("il menu del caso: il tasto destro, Maiusc+F10 sulla riga scelta, Esc che torna alla riga, Elimina che chiede", async ({ page }) => {
  const testo = readFileSync(fileURLToPath(new URL("../casi/tappa-1/lettura-intero.algo", import.meta.url)), "utf8");
  await apriICasi(page, testo);
  const righe = page.locator("tr[data-caso]");
  await expect(righe).toHaveCount(2);
  // Coi campi del primo caso aperti, «Esegui» sulla riga del secondo (che sta sotto i campi) lo esegue al primo clic: i
  // campi si confermano al clic, non alla pressione, e il pulsante non si sposta prima del rilascio.
  await righe.nth(0).locator("[data-nome-caso]").dblclick();
  await expect(page.locator('tr[data-caso="0"] ~ tr form, tr[data-caso="0"] + tr form').first()).toBeVisible();
  await page.locator('tr[data-caso="1"] [data-esegui-caso="tutto"]').click();
  await expect(page.locator('tr[data-caso="1"] [data-esito]'), "il primo clic su «Esegui» sotto i campi aperti si è perso").toHaveAttribute("data-esito", "raggiunto", { timeout: 10_000 });
  await expect(page.locator("tr[data-caso] form")).toHaveCount(0);
  const nome = (await righe.nth(1).locator("[data-nome-caso]").textContent()) ?? "";
  await righe.nth(1).click({ button: "right" });
  const menu = page.getByRole("menu", { name: riempi(it.menuDelCaso, { nome }), exact: true });
  await expect(menu, "il tasto destro non apre il menu del caso").toHaveCount(1, { timeout: 3000 });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await righe.nth(1).focus();
  await page.keyboard.press("Shift+F10");
  await expect(menu.getByRole("menuitem", { name: it.menuElimina, exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(righe.nth(1)).toBeFocused();
  await page.keyboard.press("Shift+F10");
  await menu.getByRole("menuitem", { name: it.menuElimina, exact: true }).click();
  const conferma = page.getByRole("alertdialog", { name: riempi(it.eliminaCasoTitolo, { nome }), exact: true });
  await expect(conferma).toBeVisible();
  await expect(righe).toHaveCount(2);
  await conferma.getByRole("button", { name: it.eliminaConferma, exact: true }).click();
  await expect(righe).toHaveCount(1);
});

/** Quattro casi di una lettura: le righe sotto i campi aperti del primo. */
const quattro = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "quattro casi" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "n", type: "integer", role: "input" }],
      body: [{ id: "b1", kind: "read", target: "n" }, { id: "b2", kind: "write", values: ["n * 2"], newline: true }],
      end: { id: "b3" },
    },
  ],
  test_cases: ["uno", "due", "tre", "quattro"].map((name, i) => ({ name, inputs: [{ data: "n", text: String(i + 1) }], expected: { output: `${2 * (i + 1)}\n` } })),
});

test("coi campi di un caso aperti, il tasto destro su una riga sotto apre il menu di quel caso, e la sua casella prende il clic", async ({ page }) => {
  await apriICasi(page, quattro);
  const righe = page.locator("tr[data-caso]");
  await expect(righe).toHaveCount(4);
  const campiAperti = page.locator("tr[data-caso] ~ tr form");
  await righe.nth(0).locator("[data-nome-caso]").dblclick();
  await expect(campiAperti).toHaveCount(1);
  // Il tasto destro sul nome del terzo caso: il menu è il suo (prima: i campi si chiudevano alla pressione e il menu si
  // apriva sul caso salito sotto il puntatore).
  await righe.nth(2).locator("[data-nome-caso]").click({ button: "right" });
  await expect(page.getByRole("menu", { name: riempi(it.menuDelCaso, { nome: "tre" }), exact: true }), "il menu non è quello del caso cliccato").toHaveCount(1, { timeout: 3000 });
  await page.keyboard.press("Escape");
  // La casella del terzo caso, coi campi del primo di nuovo aperti: il clic la spunta (prima andava perso), e i campi si
  // confermano.
  await righe.nth(0).locator("[data-nome-caso]").dblclick();
  await expect(campiAperti).toHaveCount(1);
  await righe.nth(2).getByRole("checkbox").click();
  await expect(righe.nth(2).getByRole("checkbox"), "il clic sulla casella sotto i campi aperti si è perso").toBeChecked({ timeout: 3000 });
  await expect(campiAperti).toHaveCount(0);
  await expect(righe.nth(3).getByRole("checkbox")).not.toBeChecked();
});

/** Duecento righe scritte, col caso che le attende tutte. */
const duecento = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "duecento righe" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "i", type: "integer", initial: "0" }],
      body: [{ id: "b1", kind: "while", condition: "i < 200", body: [{ id: "b2", kind: "write", values: ['"riga "', "i"], newline: true }, { id: "b3", kind: "assignment", target: "i", value: "i + 1" }] }],
      end: { id: "b4" },
    },
  ],
  test_cases: [{ name: "tutte", inputs: [], expected: { output: Array.from({ length: 200 }, (_, i) => `riga ${i}\n`).join("") } }],
});

const importazione = readFileSync(fileURLToPath(new URL("../casi/tappa-3/importazione-dalla-libreria.algo", import.meta.url)), "utf8");

test("«Passo passo» sul caso di una funzione importata da una libreria: ogni pausa accende un blocco del disegno, la prima l'«Inizio»; l'esito nel pallino", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 importazione.algo": importazione } });
  await apriEsempio(page, 0);
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-elenco] [data-voce-funzione="f9"]').click();
  await page.getByRole("tab", { name: /^Casi d'uso \(\d+\)$/ }).click();
  await page.locator('tr[data-caso="0"] [data-esegui-caso="passo"]').click();
  const stato = page.locator("[data-stato-esecuzione]");
  const accesi = page.locator('svg [aria-current="step"]');
  // La prima azione dà il valore alla costante comune, che la scheda della funzione non disegna: si accende «Inizio».
  await expect(page.locator('svg [aria-current="step"][data-fine="f9"]')).toBeVisible();
  const pause: number[] = [];
  for (let giri = 0; giri < 200; giri++) {
    const testo = (await stato.textContent()) ?? "";
    if (!/^In pausa/.test(testo)) break;
    pause.push(await accesi.count());
    await page.keyboard.press("F10");
    await expect(stato).not.toHaveText(testo);
    await expect(stato).toHaveText(new RegExp(`^(In pausa|${it.statoFinita})`));
  }
  console.log(`passo passo sul caso «sette» di «giudizio»: pause ${pause.length}, blocchi accesi per pausa ${[...new Set(pause)].join(",")}`);
  expect({ pause: pause.length > 2, accesi: [...new Set(pause)] }).toEqual({ pause: true, accesi: [1] });
  await expect(page.locator('tr[data-caso="0"] [data-esito]')).toHaveAttribute("data-esito", "raggiunto");
});

test("un caso nella colonna: «Esegui» apre la tabella e la console, l'esito in fondo e nel pallino; dopo la fine la console resta dove l'utente la porta", async ({ page }) => {
  await apriICasi(page, duecento);
  await page.locator('tr[data-caso="0"] [data-esegui-caso="tutto"]').click();
  const registro = page.getByRole("log");
  await expect(registro.locator("[data-esito-del-caso]")).toHaveText(riempi(it.esitoDelCasoRaggiunto, { nome: "tutte" }));
  await expect(page.locator('tr[data-caso="0"] [data-esito]')).toHaveAttribute("data-esito", "raggiunto");
  await expect(page.getByRole("table", { name: /./ }).first()).toBeVisible();
  // L'esito tocca la fine della console: l'ultima riga, e la console in fondo.
  const posizione = () => registro.evaluate((r) => ({ inFondo: Math.abs(r.scrollHeight - r.clientHeight - r.scrollTop) <= 1, sopra: r.scrollTop, ultimo: r.lastElementChild?.hasAttribute("data-esito-del-caso") === true, scorre: r.scrollHeight > r.clientHeight }));
  expect(await posizione()).toMatchObject({ inFondo: true, ultimo: true, scorre: true });
  // L'utente risale; un clic su un blocco ridisegna la finestra senza cambiare la console: la console resta lì.
  await registro.evaluate((r) => void (r.scrollTop = 0));
  const blocco = page.locator('[data-blocco="b2"]');
  await blocco.click();
  await expect(blocco).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await posizione()).toMatchObject({ sopra: 0, inFondo: false });
});

/** Il programma legge `n` e scrive `inverso(n)`, la funzione che divide 100 per il suo parametro: con 0 l'errore cade
 * nella funzione, e la scheda la segue. */
const inverso = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "inverso" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer", role: "input" },
        { name: "r", type: "integer", role: "output" },
      ],
      body: [
        { id: "b1", kind: "read", target: "n" },
        { id: "b2", kind: "assignment", target: "r", value: "inverso(n)" },
        { id: "b3", kind: "write", values: ["r"], newline: true },
      ],
      end: { id: "b4" },
    },
    { id: "f2", kind: "function", name: "inverso", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }], body: [], end: { id: "e2", return_value: "100 / x" } },
  ],
});

test("l'esecuzione salvata come caso d'uso: dalla console il caso va al programma col fuoco sul nome selezionato; dalla scheda lo stesso caso non si ripete", async ({ page }) => {
  await apriICasi(page, inverso);
  await page.keyboard.press("F5");
  const riga = page.getByRole("textbox", { name: riempi(it.consoleValore, { dato: "n" }), exact: true });
  await expect(riga).toBeFocused();
  await page.keyboard.type("0");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(it.statoFermataDaUnErrore);
  // La scheda ha seguito l'errore nella funzione; il caso va al programma, da cui l'esecuzione è partita.
  await expect(page.locator('[data-scheda][aria-selected="true"]')).toHaveAttribute("data-scheda", "f2");
  await page.locator("[data-salva-esecuzione]").click();
  await expect(page.locator('[data-scheda][aria-selected="true"]')).toHaveAttribute("data-scheda", "f1");
  const nome = page.getByRole("textbox", { name: it.casoNome, exact: true });
  await expect(nome).toBeFocused();
  await expect(nome).toHaveValue("caso 1");
  expect(await nome.evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd])).toEqual([0, 6]);
  // Il nome selezionato si sostituisce scrivendo.
  await page.keyboard.type("zero");
  await page.keyboard.press("Enter");
  await expect(page.locator("tr[data-caso] [data-nome-caso]")).toHaveText(["zero"]);
  await page.locator("[data-nuovo-dall-esecuzione]").click();
  await expect(page.locator('tr[data-caso="0"]')).toBeFocused();
  await expect(page.locator("tr[data-caso]")).toHaveCount(1);
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.annuncioCasoUguale, { nome: "zero" }));
});
