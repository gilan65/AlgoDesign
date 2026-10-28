// La finestra fluida con molte chiamate: un programma che chiama una procedura a ogni giro di un ciclo, che ne chiama
// un'altra, che ne chiama una terza (tre livelli nella pila), con cento procedure in più chiamate una volta all'inizio
// che allungano il codice generato (più di tremila righe nel C), eseguito fino al tetto dei passi tre volte: con
// la tabella nascosta e il codice chiuso (la corsa di confronto), con la tabella coi gruppi delle funzioni, col codice
// del C aperto. Per ciascuna: la risposta della pagina e il fotogramma più lungo durante la corsa (un campione ogni
// 1,5 s, fino alla fine naturale della corsa) e dal tasto alla fine, la risposta alla fine e «Ferma»; tutti entro la
// soglia di un secondo. E quante volte la tabella e il codice si disegnano durante la corsa (`data-ridisegni`): al più
// `RIDISEGNI_MASSIMI`. È la difesa del disegno che durante «tutto insieme» non rifà la tabella e il codice a ogni fetta
// (il loro `memo`), e che a ogni fetta non ricalcola nulla che attraversi tutto il progetto: con cento procedure, i
// chiamanti di ogni funzione ricalcolati a ogni disegno portavano la corsa oltre i 200 s (qui al tetto dei passi in meno
// di 20 s). Si contano i disegni, non le durate: un rapporto di durate (1,77 col `memo` della tabella tolto, contro un
// tetto di 1,5) e un tetto in secondi (la corsa di confronto da 12 a 65 s secondo il carico, 70 s col `memo` tolto)
// dipendono dalla macchina e dal carico, un conto no.
//
// CHE COSA NON GUARDA:
// - la WebView2 vera e WebKitGTK (qui il Chromium di Playwright);
// - la soglia della risposta sotto un carico diverso da quello della corsa (nel collaudo, quattro processi);
// - la console, che si aggiorna a ogni fetta per costruzione (l'output si vede mentre arriva);
// - che cosa mostrano la tabella e il codice (le prove sotto happy-dom e `tabella.e2e.ts`);
// - le altre forme pesanti della tabella (`programmi-pesanti.e2e.ts`).

import { expect, test, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";
import { accendiIlCampionatore, fotogrammaPeggiore, fotogrammi, risposta, SOGLIA_MS } from "./risposta";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

/** Quante volte al più la tabella e il codice si disegnano durante una corsa: alla partenza e alla fermata, col doppio
 * disegno del modo stretto di React nel server di sviluppo. Senza il loro `memo` sono uno per fetta, a migliaia. */
const RIDISEGNI_MASSIMI = 20;
/** Le procedure in più, chiamate una volta all'inizio, e quante assegnazioni ha ciascuna. */
const IN_PIU = 100;
const ASSEGNAZIONI = 30;

const procedura = (id: string, name: string, data: unknown[], body: unknown[]) => ({ id, kind: "procedure", name, data, body, end: { id: `${id}-fine` } });
const programma = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "molte chiamate" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "i", type: "integer" },
        { name: "s", type: "integer", initial: "0" },
      ],
      body: [
        // Ogni procedura in più chiamata una volta all'inizio: sta nella pila e nella tabella, oltre che nel codice.
        ...Array.from({ length: IN_PIU }, (_, k) => ({ id: `b0-${k}`, kind: "call", callee: `in_piu_${k}`, arguments: [] })),
        { id: "b1", kind: "for", counter: "i", from: "1", to: "2000000000", body: [{ id: "b2", kind: "call", callee: "primo", arguments: ["s", "i"] }] },
      ],
      end: { id: "b3" },
    },
    procedura(
      "f2",
      "primo",
      [
        { name: "a", type: "integer", parameter: "reference" },
        { name: "b", type: "integer", parameter: "value" },
      ],
      [
        { id: "b4", kind: "assignment", target: "a", value: "(a + b) mod 1000" },
        { id: "b5", kind: "call", callee: "secondo", arguments: ["a"] },
      ],
    ),
    procedura("f3", "secondo", [{ name: "c", type: "integer", parameter: "reference" }], [
      { id: "b6", kind: "assignment", target: "c", value: "c + 1" },
      { id: "b7", kind: "call", callee: "terzo", arguments: ["c"] },
    ]),
    procedura("f4", "terzo", [{ name: "d", type: "integer", parameter: "reference" }], [{ id: "b8", kind: "assignment", target: "d", value: "d mod 997" }]),
    ...Array.from({ length: IN_PIU }, (_, k) =>
      procedura(
        `g${k}`,
        `in_piu_${k}`,
        [{ name: "x", type: "integer", initial: "0" }],
        Array.from({ length: ASSEGNAZIONI }, (_, j) => ({ id: `g${k}-${j}`, kind: "assignment", target: "x", value: `x + ${j + 1}` })),
      ),
    ),
  ],
});

const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]");

/** Un comando dell'esecuzione dalla barra: i tasti andrebbero al flowchart col fuoco, e un clic per dargli il fuoco può
 * cadere su un'altra scheda, che F10 eseguirebbe da sola. */
const comando = (page: Page, id: string) => page.locator(`header [data-comando="${id}"]`).click();

/** Una corsa fino al tetto dei passi: un passo («Passo»), `prima` (la tabella si mostra o si nasconde solo con
 * un'esecuzione), poi «Esegui»; le misure da «Esegui», la durata e «Ferma». */
/** Quante volte si sono disegnati la tabella e il codice finora (il codice, se c'è). */
const ridisegni = async (page: Page) => {
  const di = async (l: ReturnType<Page["locator"]>) => ((await l.count()) === 0 ? 0 : Number(await l.getAttribute("data-ridisegni")));
  return {
    tabella: await di(page.locator("div[data-ridisegni]:has(> div > table[data-traccia])")),
    codice: await di(page.getByRole("region", { name: it.codiceGenerato, exact: true })),
  };
};

async function corsa(page: Page, cosa: string, prima: () => Promise<void>): Promise<{ misure: { cosa: string; ms: number }[]; durata: number; ridisegni: { tabella: number; codice: number }; allaFine: { tabella: number; codice: number } }> {
  const misure: { cosa: string; ms: number }[] = [];
  // La scheda del programma principale: la corsa di prima si è fermata dentro una procedura, e la scheda l'ha seguita.
  await page.locator('[data-scheda="f1"]').click();
  await expect(page.locator('[data-scheda][aria-selected="true"]')).toHaveAttribute("data-scheda", "f1");
  await comando(page, "passo");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await prima();
  await accendiIlCampionatore(page);
  const partenza = Date.now();
  const disegniPrima = await ridisegni(page);
  await comando(page, "esegui");
  let campioni = 0;
  let rispostaPeggiore = 0;
  let fotogrammaPeggioreInCorsa = 0;
  while ((await statoDi(page).textContent()) !== it.statoFermataDaUnErrore && Date.now() - partenza < 200_000) {
    await page.waitForTimeout(1_500);
    rispostaPeggiore = Math.max(rispostaPeggiore, await risposta(page));
    fotogrammaPeggioreInCorsa = Math.max(fotogrammaPeggioreInCorsa, (await fotogrammi(page, 500)).peggiore);
    campioni++;
  }
  // Premesse: la corsa è arrivata al tetto dei passi ed è stata campionata.
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
  expect(campioni, `${cosa}: campioni durante la corsa`).toBeGreaterThan(0);
  const durata = Date.now() - partenza;
  const disegniDopo = await ridisegni(page);
  misure.push({ cosa: `${cosa}, risposta peggiore durante la corsa (${campioni} campioni)`, ms: rispostaPeggiore });
  misure.push({ cosa: `${cosa}, fotogramma più lungo durante la corsa`, ms: fotogrammaPeggioreInCorsa });
  misure.push({ cosa: `${cosa}, fotogramma più lungo dal tasto alla fine`, ms: await fotogrammaPeggiore(page) });
  misure.push({ cosa: `${cosa}, risposta alla fine`, ms: await risposta(page) });
  const t = Date.now();
  await comando(page, "ferma");
  await expect(statoDi(page)).toHaveText(it.statoPronto, { timeout: 60_000 });
  misure.push({ cosa: `${cosa}, «Ferma»`, ms: Date.now() - t });
  return { misure, durata, ridisegni: { tabella: disegniDopo.tabella - disegniPrima.tabella, codice: disegniDopo.codice - disegniPrima.codice }, allaFine: disegniDopo };
}

test("la finestra fluida con molte chiamate: la tabella coi gruppi e il codice aperto non rallentano la corsa", async ({ page }, info) => {
  // Quattro volte la durata più lunga misurata nella corsa intera (la regola della configurazione): 310,5 s in un
  // collaudo con la macchina carica (sotto il limite di allora, 600 s, ne usava il 52%).
  test.setTimeout(1_260_000);
  const percorso = "C:\\Documenti\\molte chiamate.algo";
  await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: programma } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "molte chiamate.algo" }));
  const tabella = page.locator('header [data-comando="tabella"]');
  const genera = page.locator('header [data-comando="genera"]');

  // Il confronto: la tabella nascosta, il codice chiuso.
  const confronto = await corsa(page, "senza tabella né codice", async () => {
    await tabella.click();
    await expect(tabella).toHaveAttribute("aria-expanded", "false");
  });
  // La tabella coi gruppi delle funzioni.
  const conTabella = await corsa(page, "con la tabella coi gruppi", async () => {
    await tabella.click();
    await expect(tabella).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("table[data-traccia] thead tr[data-gruppi]")).toHaveCount(1);
  });
  // Il codice del C, il più lungo.
  const codice = page.getByRole("region", { name: it.codiceGenerato, exact: true });
  let righeDelCodice = 0;
  const conCodice = await corsa(page, "col codice del C", async () => {
    await genera.click();
    await codice.getByRole("tab", { name: it.linguaggioC, exact: true }).click();
    righeDelCodice = await codice.locator("[data-riga]").count();
  });

  // Premesse: il codice è lungo, la tabella ha i gruppi.
  expect(righeDelCodice, "le righe del codice del C").toBeGreaterThan(3000);
  const misure = [...confronto.misure, ...conTabella.misure, ...conCodice.misure];
  const peggiore = Math.max(...misure.map((m) => m.ms));
  console.log(
    `[${info.project.name}] molte chiamate (${righeDelCodice} righe del C): ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}; il più lungo ${peggiore} ms, margine ${Math.round((100 * (SOGLIA_MS - peggiore)) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms); durate ${confronto.durata} ms, con la tabella ${conTabella.durata} ms, col codice ${conCodice.durata} ms; disegni durante la corsa: tabella ${conTabella.ridisegni.tabella}, codice ${conCodice.ridisegni.codice} (al più ${RIDISEGNI_MASSIMI})`,
  );
  for (const m of misure) expect(m.ms, m.cosa).toBeLessThanOrEqual(SOGLIA_MS);
  // Controllo positivo: i contatori ci sono e si accendono (alla fine della corsa, prima di «Ferma», la tabella e il codice
  // si sono disegnati almeno una volta).
  expect(conTabella.allaFine.tabella, "i disegni della tabella, in tutto").toBeGreaterThan(0);
  expect(conCodice.allaFine.codice, "i disegni del codice, in tutto").toBeGreaterThan(0);
  expect(conTabella.ridisegni.tabella, "i disegni della tabella durante la corsa").toBeLessThanOrEqual(RIDISEGNI_MASSIMI);
  expect(conCodice.ridisegni.codice, "i disegni del codice durante la corsa").toBeLessThanOrEqual(RIDISEGNI_MASSIMI);
});
