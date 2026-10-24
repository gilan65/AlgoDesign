// Spostare un blocco col mouse e dalla tastiera, nei motori veri (Chromium e WebKit, server di sviluppo e
// anteprima del build).
//
// Il posto d'arrivo si legge dall'ALBERO DELL'ACCESSIBILITÀ (`ariaSnapshot`): il gruppo della sequenza e la
// posizione del blocco fra i blocchi del gruppo. La prova mira il centro del blocco e del «+» sullo schermo
// (è ciò che fa una persona); dove il «+» sta sullo schermo non entra nel confronto.
//
// - Trascinamento a tre scale (la minima, 100% e tre passi di «Ingrandisci», 195%): due spostamenti, uno
//   nella sequenza principale e uno dentro il corpo di un ciclo; ognuno è UN passo della cronologia (un
//   solo Annulla torna all'albero iniziale e lo spegne). Controllo positivo: il «+» accanto mette il blocco
//   in un altro posto, e il rilevatore lo dice.
// - Dentro sé stesso: un «se» rilasciato su un «+» del suo ramo Vero, col mouse e dalla tastiera, non si
//   sposta, e l'avviso lo dice.
// - Solo dalla tastiera: Spazio sul blocco, Maiusc+Tab fino al «+», Invio; il fuoco resta sul blocco
//   spostato. Esc annulla lo spostamento, e dopo Invio sul «+» apre di nuovo l'elenco dei blocchi.
//
// Gli esiti si raccolgono e si confrontano alla fine: un blocco rimasto dov'era è un esito, non un'attesa
// scaduta.
//
// CHE COSA NON GUARDA:
// - un trascinamento che fa scorrere la vista (il bersaglio fuori dallo schermo), né il trascinamento col
//   tocco;
// - l'aspetto durante il trascinamento (la copia che segue il puntatore, i «+» spenti): lo guarda la prova di
//   unità della scelta del bersaglio, sui numeri;
// - il clic che cade su un «+» quando due aree si toccano alla scala minima (qui si mira il centro).

import { expect, test, type Locator, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { albero, doveSta, nomeBlocco, RIFERIMENTO, riferimento, stato } from "./albero";
import { apri, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const flowchartDi = (page: Page) => page.getByRole("group", { name: `${it.flowchart}: ${RIFERIMENTO}`, exact: true });
// Un blocco o un «+» col suo nome: non il valore iniziale di un dato, che può avere il nome di un blocco.
const pulsante = (dentro: Locator, nome: string) => dentro.getByRole("button", { name: nome, exact: true }).and(dentro.locator(":not([data-iniziale])"));
const nelGruppo = (page: Page, gruppo: string, nome: string) => page.getByRole("group", { name: gruppo, exact: true }).getByRole("button", { name: nome, exact: true });
// L'avviso della finestra: l'unico `role="status"` scritto; lo stato dell'esecuzione è un `output` senza ruolo
// scritto (anche lui per il motore è uno «status»).
const avviso = (page: Page) => page.locator('output[role="status"]');

// I blocchi del riferimento che le prove spostano, coi nomi ricavati dal file.
const [commento, ripeti, assegnazione] = [riferimento.body[0]!, riferimento.body[1]!, riferimento.body[2]!];
if (ripeti.kind !== "repeat") throw new Error("il riferimento è cambiato: il secondo blocco non è un «ripeti»");
const [lettura, se] = [ripeti.body[0]!, ripeti.body[1]!];
if (se.kind !== "if") throw new Error("il riferimento è cambiato: il secondo blocco del «ripeti» non è un «se»");
const PRINCIPALE = it.sequenzaPrincipale;
const CORPO = riempi(it.sequenzaCorpo, { blocco: nomeBlocco(ripeti) });
const VERO = riempi(it.sequenzaVero, { blocco: nomeBlocco(se) });
const nomeDelPunto = (sequenza: string, n: number, totale: number) => riempi(it.nomeDelPunto, { sequenza, n: String(n), totale: String(totale) });

/** Due fotogrammi: il tempo che serve a React per ridisegnare dopo un evento. */
const dueGiri = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

/** Trascina dal centro di `da` al centro di `a`, a piccoli passi come una mano. Prima porta il blocco al centro della
 * vista, come chi lo deve vedere per prenderlo: coi valori iniziali sotto «Inizio», a 195% il blocco sta sotto il bordo
 * (la prova mirava un punto fuori dallo schermo). Se il bersaglio resta fuori dalla finestra, un rosso che lo dice. */
async function trascina(page: Page, da: Locator, a: Locator): Promise<void> {
  await da.evaluate((e) => e.scrollIntoView({ block: "center", inline: "center" }));
  await dueGiri(page);
  const finestra = page.viewportSize()!;
  for (const [nome, el] of [["il blocco", da], ["il bersaglio", a]] as const) {
    const r = await el.boundingBox();
    if (!r || r.y < 0 || r.y + r.height > finestra.height || r.x < 0 || r.x + r.width > finestra.width) throw new Error(`${nome} da trascinare è fuori dalla finestra: ${JSON.stringify(r)}`);
  }
  const s = await da.boundingBox();
  const t = await a.boundingBox();
  if (!s || !t) throw new Error("un elemento da trascinare o il bersaglio non ha una posizione");
  const [sx, sy, tx, ty] = [s.x + s.width / 2, s.y + s.height / 2, t.x + t.width / 2, t.y + t.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.mouse.up();
  await dueGiri(page);
}

const scale = [
  { nome: "minima", riduci: 10, ingrandisci: 0, atteso: "33%" },
  { nome: "100%", riduci: 0, ingrandisci: 0, atteso: "100%" },
  { nome: "195%", riduci: 0, ingrandisci: 3, atteso: "195%" },
];

async function allaScala(page: Page, s: (typeof scale)[number]): Promise<void> {
  await page.getByRole("group", { name: it.zoom, exact: true }).locator('[data-comando="cento"]').click();
  for (let i = 0; i < s.riduci; i++) await nelGruppo(page, it.zoom, it.zoomRiduci).click();
  for (let i = 0; i < s.ingrandisci; i++) await nelGruppo(page, it.zoom, it.zoomIngrandisci).click();
  await expect(page.getByRole("group", { name: it.zoom, exact: true }).locator('[data-comando="cento"]')).toHaveText(s.atteso);
}

// ------------------------------------------------------------------------------- col mouse

test("trascinato su un «+», il blocco va nella sequenza e nella posizione di quel posto, a tre scale; è un passo solo", async ({ page }, info) => {
  // Limite dichiarato: oltre 90 s una volta in WebKit con tre ripetizioni di tutti gli spec (misurato quando
  // la costruzione dall'interfaccia ha aggiunto due prove lunghe).
  test.setTimeout(180_000);
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const iniziale = await stato(flowchart);
  const casi = [
    { blocco: nomeBlocco(lettura), punto: nomeDelPunto(PRINCIPALE, 1, 6), atteso: { sequenza: PRINCIPALE, indice: 0 } },
    { blocco: nomeBlocco(commento), punto: nomeDelPunto(CORPO, 2, 3), atteso: { sequenza: CORPO, indice: 1 } },
  ];
  const sbagliati: string[] = [];
  let [spostati, unPasso] = [0, 0];
  for (const s of scale) {
    await allaScala(page, s);
    for (const c of casi) {
      await trascina(page, pulsante(flowchart, c.blocco), pulsante(flowchart, c.punto));
      const visti = doveSta(await albero(flowchart), c.blocco);
      if (visti.length === 1 && visti[0]!.sequenza === c.atteso.sequenza && visti[0]!.indice === c.atteso.indice) spostati++;
      else sbagliati.push(`[${s.nome}] ${c.blocco} su «${c.punto}» → ${JSON.stringify(visti)}`);
      // Un passo solo: un Annulla torna all'albero iniziale e non resta altro da annullare.
      if ((await stato(flowchart)) !== iniziale) {
        await page.keyboard.press("Control+z");
        await dueGiri(page);
        if ((await stato(flowchart)) === iniziale && (await nelGruppo(page, it.modifica, it.annulla).getAttribute("aria-disabled")) === "true") unPasso++;
        else sbagliati.push(`[${s.nome}] ${c.blocco}: un Annulla non torna all'albero iniziale con la cronologia vuota`);
      }
    }
  }
  console.log(`[${info.project.name}] trascinamento: scale ${scale.length}, spostamenti ${scale.length * casi.length}, al posto giusto ${spostati}, un passo solo ${unPasso}, sbagliati ${sbagliati.length}`);
  expect(sbagliati).toEqual([]);
  expect(spostati).toBe(scale.length * casi.length);
  expect(unPasso).toBe(scale.length * casi.length);

  // Controllo positivo: il «+» accanto (quello dopo il commento) al posto del primo; il rilevatore vede il posto diverso.
  await trascina(page, pulsante(flowchart, casi[0]!.blocco), pulsante(flowchart, nomeDelPunto(PRINCIPALE, 2, 6)));
  const visti = doveSta(await albero(flowchart), casi[0]!.blocco);
  expect(visti).toHaveLength(1);
  expect(visti[0]).not.toEqual(casi[0]!.atteso);
});

test("un blocco rilasciato dentro sé stesso non si sposta, e l'avviso lo dice, col mouse e dalla tastiera", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const iniziale = await stato(flowchart);
  const dentro = nomeDelPunto(VERO, 1, 2);

  await trascina(page, pulsante(flowchart, nomeBlocco(se)), pulsante(flowchart, dentro));
  const colMouse = { avviso: await avviso(page).textContent(), uguale: (await stato(flowchart)) === iniziale };

  await pulsante(flowchart, nomeBlocco(se)).focus();
  await page.keyboard.press(" ");
  await pulsante(flowchart, dentro).focus();
  await page.keyboard.press("Enter");
  await dueGiri(page);
  const daTastiera = { avviso: await avviso(page).textContent(), uguale: (await stato(flowchart)) === iniziale };

  expect({ colMouse, daTastiera }).toEqual({
    colMouse: { avviso: it.spostamentoDentroSeStesso, uguale: true },
    daTastiera: { avviso: it.spostamentoDentroSeStesso, uguale: true },
  });
  await expect(nelGruppo(page, it.modifica, it.annulla)).toHaveAttribute("aria-disabled", "true");
});

// ------------------------------------------------------------------------------- dalla tastiera

test("solo dalla tastiera: Spazio sul blocco, Tab fino al «+», Invio lo sposta; Esc annulla lo spostamento", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const iniziale = await stato(flowchart);
  const nome = nomeBlocco(assegnazione);
  const bersaglio = nomeDelPunto(PRINCIPALE, 1, 6);
  const nomeDelFuoco = () => page.evaluate(() => (document.activeElement?.closest("svg") ? (document.activeElement.getAttribute("aria-label") ?? "") : null));

  await pulsante(flowchart, nome).focus();
  await page.keyboard.press(" ");
  await dueGiri(page);
  const annunciato = await avviso(page).textContent();
  // Il «+» sta prima del blocco: indietro con Maiusc+Tab.
  for (let i = 0; i < 20 && (await nomeDelFuoco()) !== bersaglio; i++) await page.keyboard.press("Shift+Tab");
  const raggiunto = await nomeDelFuoco();
  await page.keyboard.press("Enter");
  await dueGiri(page);
  const esito = {
    annunciato,
    raggiunto,
    dove: doveSta(await albero(flowchart), nome),
    fuoco: await nomeDelFuoco(),
    menu: await page.getByRole("menu").count(),
  };
  expect(esito).toEqual({
    annunciato: riempi(it.spostamentoIniziato, { blocco: nome }),
    raggiunto: bersaglio,
    dove: [{ sequenza: PRINCIPALE, indice: 0 }],
    fuoco: nome,
    menu: 0,
  });
  await page.keyboard.press("Control+z");
  await expect.poll(() => stato(flowchart)).toBe(iniziale);

  // Esc annulla: dopo, Invio sul «+» apre l'elenco dei blocchi come sempre.
  await pulsante(flowchart, nome).focus();
  await page.keyboard.press(" ");
  await page.keyboard.press("Escape");
  await dueGiri(page);
  const annullato = await avviso(page).textContent();
  await pulsante(flowchart, bersaglio).focus();
  await page.keyboard.press("Enter");
  await dueGiri(page);
  expect({ annullato, menu: await page.getByRole("menu").count(), uguale: (await stato(flowchart)) === iniziale }).toEqual({ annullato: it.spostamentoAnnullato, menu: 1, uguale: true });
});
