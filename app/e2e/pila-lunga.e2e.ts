// La pila lunga nei motori: `conta(499)` arriva a 500 chiamate in corso, il tetto, col punto di interruzione sul caso che
// smette. In pausa con la pila piena, e dopo un passo:
// - la finestra risponde (un giro con la pagina e il fotogramma più lungo, entro la soglia di un secondo), anche aprendo
//   l'elenco delle 496 chiamate nascoste di «Dove sei»;
// - «Dove sei» ha il principio e la fine (prima: 501 nomi alti 1195 px, la tabella fuori dalla finestra), e la tabella
//   si vede;
// - il gruppo di `conta` nella riga corrente e il watch di `n` hanno la chiamata più profonda (n = 0); scelto il livello
//   37 dall'elenco, il watch ha la sua (n = 463);
// - il watch e l'elenco non ridisegnano la tabella (`data-ridisegni` fermo): la difesa del suo `memo` contata, non a tempo.
// E con sette funzioni ricorsive la riga di stato resta su una riga a 1280 px: la prima frase e quante altre, lo stato
// dell'esecuzione e lo zoom dentro la finestra, l'elenco a richiesta con le sette frasi.
//
// CHE COSA NON GUARDA:
// - la WebView2 vera e WebKitGTK (qui il Chromium di Playwright; WebKit al rilascio per Linux);
// - le forme livello per livello (`core/esecuzione/traccia.test.ts`) e le altre forme dell'interfaccia
//   (`ui/esecuzione/pila-lunga.test.tsx`);
// - la corsa «tutto insieme» con la tabella e il codice (`fluida.e2e.ts`).

import { expect, test, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";
import { fotogrammi, risposta, SOGLIA_MS } from "./risposta";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });

const programma = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "cinquecento chiamate" },
  functions: [
    { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "r", value: "conta(499)" }, { id: "b2", kind: "write", values: ["r"], newline: true }], end: { id: "b3" } },
    {
      id: "f2",
      kind: "function",
      name: "conta",
      return_type: "integer",
      data: [
        { name: "n", type: "integer", parameter: "value" },
        { name: "s", type: "integer" },
      ],
      body: [
        {
          id: "b4",
          kind: "if",
          condition: "n == 0",
          then: [{ id: "b5", kind: "assignment", target: "s", value: "0", breakpoint: true }],
          else: [{ id: "b6", kind: "assignment", target: "s", value: "conta(n - 1) + 1" }],
        },
      ],
      end: { id: "b7", return_value: "s" },
    },
  ],
});

const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]");
const comando = (page: Page, id: string) => page.locator(`header [data-comando="${id}"]`).click();
const disegniDellaTabella = async (page: Page) => Number(await page.locator("div[data-ridisegni]:has(> div > table[data-traccia])").getAttribute("data-ridisegni"));
/** Il watch di `n` nel disegno di `conta`: il valore e la riga del livello. */
async function watchDiN(page: Page): Promise<string> {
  await page.mouse.move(2, 2);
  await page.locator('[data-blocco="b4"] [data-watch-dato="n"]').hover();
  const w = page.locator('[role="tooltip"][data-watch]');
  await expect(w).toBeVisible();
  return `${await w.locator("[data-watch-valore]").textContent()} | ${await w.locator("[data-watch-livello]").textContent()}`;
}

test("500 chiamate in corso: la finestra risponde, «Dove sei» col principio e la fine, la tabella e il watch sulla chiamata giusta", async ({ page }, info) => {
  test.setTimeout(120_000);
  const percorso = "C:\\Documenti\\cinquecento chiamate.algo";
  await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: programma } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "cinquecento chiamate.algo" }));
  await comando(page, "esegui");
  // 1001 azioni: la prima del programma, due per ognuna delle 499 chiamate prima dell'ultima, poi la condizione e
  // l'assegnazione dell'ultima.
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1001" }), { timeout: 60_000 });
  const misure: { cosa: string; ms: number }[] = [];
  misure.push({ cosa: "risposta in pausa", ms: await risposta(page) });
  misure.push({ cosa: "fotogramma più lungo in pausa", ms: (await fotogrammi(page, 500)).peggiore });

  // «Dove sei»: il principio e la fine, su una riga; la tabella sotto di lui, in vista.
  const dove = page.locator("[data-dove-sei]");
  await expect(dove.locator("button")).toHaveText(["Programma principale", "conta", riempi(it.doveSeiNascoste, { n: "496" }), "conta", "conta", "conta"]);
  const alto = (await dove.boundingBox())!.height;
  const cimaDellaTabella = (await page.locator("table[data-traccia]").boundingBox())!.y;
  expect({ alto: alto < 60, tabellaInVista: cimaDellaTabella < 1000 }).toEqual({ alto: true, tabellaInVista: true });

  // Il gruppo di `conta` nella riga corrente: n e s della chiamata più profonda (dopo la condizione e lo scritto).
  const corrente = await page.locator('table[data-traccia] tr[aria-current="true"] td').allTextContents();
  expect([corrente[5], corrente[6]]).toEqual(["0", it.tracciaNonInizializzata]);
  const disegni = await disegniDellaTabella(page);
  expect(await watchDiN(page)).toBe(`0 | ${riempi(it.watchLivello, { di: "500", su: "500" })}`);

  // L'elenco delle chiamate nascoste, e il livello 37.
  const t = Date.now();
  await dove.locator("[data-nascosti]").click();
  const elenco = page.getByRole("menu", { name: it.doveSeiElenco, exact: true });
  await expect(elenco.getByRole("menuitem")).toHaveCount(496);
  misure.push({ cosa: "l'elenco delle 496 chiamate aperto", ms: Date.now() - t });
  await elenco.locator('[data-voce="37"]').click();
  expect(await watchDiN(page)).toBe(`463 | ${riempi(it.watchLivello, { di: "37", su: "500" })}`);
  // Il watch e l'elenco non ridisegnano la tabella.
  const disegniDopo = await disegniDellaTabella(page);

  // Un passo con la pila piena: la fine della chiamata più profonda.
  const p = Date.now();
  await comando(page, "passo");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1002" }));
  misure.push({ cosa: "un passo con 500 chiamate", ms: Date.now() - p });
  misure.push({ cosa: "risposta dopo il passo", ms: await risposta(page) });
  expect(await watchDiN(page)).toBe(`0 | ${riempi(it.watchLivello, { di: "500", su: "500" })}`);

  const peggiore = Math.max(...misure.map((m) => m.ms));
  console.log(
    `[${info.project.name}] 500 chiamate: ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}; il più lungo ${peggiore} ms, margine ${Math.round((100 * (SOGLIA_MS - peggiore)) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms); «Dove sei» alto ${Math.round(alto)} px; disegni della tabella ${disegni} → ${disegniDopo}`,
  );
  for (const m of misure) expect(m.ms, m.cosa).toBeLessThanOrEqual(SOGLIA_MS);
  expect(disegniDopo, "i disegni della tabella col watch e l'elenco").toBe(disegni);
});

/** Sette funzioni che chiamano sé stesse: sette frasi nella riga di stato. */
const setteRicorsioni = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "sette ricorsioni" },
  functions: [
    { id: "f0", kind: "main", data: [{ name: "t", type: "integer", initial: "0" }], body: ["conta", "somma_fino", "potenza", "cifre", "fattoriale", "fibonacci", "massimo"].map((nome, k) => ({ id: `m${k}`, kind: "assignment", target: "t", value: `t + ${nome}(3)` })), end: { id: "mf" } },
    ...["conta", "somma_fino", "potenza", "cifre", "fattoriale", "fibonacci", "massimo"].map((nome, k) => ({
      id: `f${k + 1}`,
      kind: "function",
      name: nome,
      return_type: "integer",
      data: [
        { name: "n", type: "integer", parameter: "value" },
        { name: "r", type: "integer" },
      ],
      body: [{ id: `c${k}a`, kind: "if", condition: "n <= 0", then: [{ id: `c${k}b`, kind: "assignment", target: "r", value: "0" }], else: [{ id: `c${k}c`, kind: "assignment", target: "r", value: `${nome}(n - 1) + 1` }] }],
      end: { id: `c${k}d`, return_value: "r" },
    })),
  ],
});

test("la riga di stato con sette ricorsioni resta su una riga a 1280 px: la prima frase, quante altre, lo stato e lo zoom in vista", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const percorso = "C:\\Documenti\\sette ricorsioni.algo";
  await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: setteRicorsioni } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "sette ricorsioni.algo" }));
  const riga = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  const ricorsioni = riga.locator("[data-ricorsione]");
  await expect(ricorsioni).toHaveText(`La funzione «conta» chiama sé stessa${riempi(it.ricorsioniAltre, { n: "6" })}`);
  const misura = await riga.evaluate((r) => {
    const dentro = (e: Element | null) => {
      const q = e?.getBoundingClientRect();
      return q !== undefined && q.left >= 0 && q.right <= window.innerWidth && q.width > 0;
    };
    return { alta: r.getBoundingClientRect().height, stato: dentro(r.querySelector("[data-stato-esecuzione]")), zoom: dentro(r.querySelector('[role="group"]')), larga: r.scrollWidth <= r.clientWidth };
  });
  console.log(`[${info.project.name}] riga di stato con sette ricorsioni a 1280 px: alta ${misura.alta} px, stato in vista ${misura.stato}, zoom in vista ${misura.zoom}`);
  // Una riga sola (alta come senza ricorsioni, 23 px; con le frasi di seguito andava a capo e saliva a 101), lo stato e lo
  // zoom dentro la finestra.
  expect(misura).toEqual({ alta: expect.any(Number), stato: true, zoom: true, larga: true });
  expect(misura.alta).toBeLessThan(30);
  // L'elenco a richiesta, con le sette frasi.
  await riga.getByRole("button", { name: it.ricorsioniMostra, exact: true }).click();
  await expect(page.getByRole("list", { name: it.elencoDelleRicorsioni, exact: true }).getByRole("listitem")).toHaveCount(7);
});
