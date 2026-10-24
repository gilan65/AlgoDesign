// La finestra che risponde mentre esegue i programmi più pesanti che le Impostazioni lasciano eseguire (coi limiti
// predefiniti, che sono anche i massimi: vettori e stringhe di 1000): un vettore di 1000 elementi riempito da un
// ciclo, nella tabella con le colonne dei primi dieci e in fila; un ciclo che non finisce e scrive, con e senza a
// capo; il valore iniziale di un vettore di 1000 elementi (un'azione che li cambia tutti), lo stesso in ogni elemento e
// in un elenco, nelle due forme della tabella; una stringa di 1000 caratteri cambiata a ogni giro; un
// vettore di stringhe al limite dei caratteri (10 stringhe da 1000, 100 da 100), nelle due forme della tabella; un ciclo
// `per` fino al tetto dei passi col watch fermo sul contatore e il codice aperto (che non si ridisegnano a ogni fetta).
// Per ciascuno, due secondi dopo F5, durante la corsa per il ciclo che non finisce (un campione ogni 2 s, il
// peggiore) e alla fine (a corsa finita; per il ciclo che non finisce al tetto dei passi o dopo 30 s, il primo dei
// due): la risposta della pagina (un giro di andata e ritorno) e il fotogramma più lungo; il fotogramma più lungo di
// TUTTA la corsa, dal tasto alla fine, da un campionatore acceso prima di F5 (un programma breve finisce prima dei due
// secondi, e il disegno della tabella intera cadeva fuori da ogni campione); poi «Ferma», dal tasto alla colonna
// chiusa. Tutti entro la soglia di un secondo; i valori e il margine si stampano. Premesse: la riga sopra la tabella
// dice la forma scelta, e il ciclo che non finisce ha almeno un campione durante la corsa.
//
// CHE COSA NON GUARDA:
// - la WebView2 vera e WebKitGTK (qui i motori di Playwright; la prova sul prodotto ha la sua clausola);
// - la soglia sotto un carico diverso da quello della corsa (nel collaudo, quattro processi);
// - che cosa la tabella e la console mostrano (le celle e le righe le provano `ui/esecuzione/tabella.test.tsx` e
//   la prova della finestra sotto happy-dom): qui solo il tempo;
// - i programmi oltre i limiti massimi delle Impostazioni (le Impostazioni non li accettano);
// - la scheda in secondo piano: la pagina della prova è in primo piano;
// - la riga lunga senza a capo: tolto il suo tetto, la soglia resta rispettata in questi motori (la console la tiene
//   comunque); qui si prova solo che la finestra risponde;
// - quale dei due cicli che non finiscono è ancora in corsa alla fine: quello che va a capo arriva al tetto dei passi
//   in circa 20 s, e «Ferma» chiude un'esecuzione già ferma; quello senza a capo corre ancora dopo 30 s (misurato in
//   Chromium), ma la prova non lo pretende (un «Ferma» in corsa lo prova `esecuzione.e2e.ts`).

import { expect, test, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriEsempio, apriVuota, costruisciFinzione } from "./pagina";
import { vettoreRiempito } from "./vettore-riempito";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

/** La soglia della finestra che risponde: dal gesto all'effetto, e il fotogramma più lungo. */
const SOGLIA_MS = 1_000;
/** Quanto dura al più il ciclo che non finisce prima della misura «alla fine». */
const DURATA_DEL_CICLO_MS = 30_000;

const progetto = (data: unknown[], body: unknown[]) =>
  JSON.stringify({ format: "algodesign", schema_version: 1, metadata: { name: "pesante" }, functions: [{ id: "f1", kind: "main", data, body, end: { id: "bz" } }] });

/** Lo stesso programma della prova sul prodotto. */
const riempito = vettoreRiempito;

/** Un vettore di `n` stringhe da `l` caratteri, scritte 330 volte (circa 1000 azioni), ogni volta diverse. */
const conStringhe = (n: number, l: number) =>
  progetto(
    [
      { name: "a", type: "string", max_length: l, initial: `"${"x".repeat(l - 1)}"` },
      { name: "v", type: "string", size: n, max_length: l },
      { name: "i", type: "integer", initial: "0" },
    ],
    [
      {
        id: "b1",
        kind: "while",
        condition: "i < 330",
        body: [
          {
            id: "b2",
            kind: "if",
            condition: "i mod 2 == 0",
            then: [{ id: "b3", kind: "assignment", target: `v[i mod ${n}]`, value: 'a + "y"' }],
            else: [{ id: "b4", kind: "assignment", target: `v[i mod ${n}]`, value: 'a + "z"' }],
          },
          { id: "b5", kind: "assignment", target: "i", value: "i + 1" },
        ],
      },
    ],
  );

const programmi = [
  { nome: "un vettore di 1000 elementi riempito da un ciclo, con le colonne dei primi dieci", testo: riempito, forma: "primi-e-altri", finisce: true, oltre: true },
  { nome: "un vettore di 1000 elementi riempito da un ciclo, in fila", testo: riempito, forma: "in-fila", finisce: true, oltre: true },
  {
    nome: "un ciclo che non finisce e scrive",
    testo: progetto(
      [{ name: "i", type: "integer", initial: "0" }],
      [
        {
          id: "b1",
          kind: "while",
          condition: "true",
          body: [
            { id: "b2", kind: "write", values: ['"ciao "', "i"], newline: true },
            { id: "b3", kind: "assignment", target: "i", value: "i + 1" },
          ],
        },
      ],
    ),
    forma: "primi-e-altri",
    finisce: false,
    oltre: false,
  },
  {
    // Senza a capo: una riga sola che crescerebbe senza tetto (3,4 milioni di caratteri dopo 30 s), se la console non
    // andasse a capo da sola.
    nome: "un ciclo che non finisce e scrive senza andare a capo",
    testo: progetto(
      [{ name: "i", type: "integer", initial: "0" }],
      [
        {
          id: "b1",
          kind: "while",
          condition: "true",
          body: [
            { id: "b2", kind: "write", values: ['"ciao "', "i"], newline: false },
            { id: "b3", kind: "assignment", target: "i", value: "i + 1" },
          ],
        },
      ],
    ),
    forma: "primi-e-altri",
    finisce: false,
    oltre: false,
  },
  // Il valore iniziale di un vettore di 1000 elementi è un'azione sola che li cambia tutti: con le colonne dei primi
  // dieci, la colonna degli altri ne ha 990 in una riga.
  ...(["primi-e-altri", "in-fila"] as const).flatMap((forma) => [
    {
      nome: `il valore iniziale di un vettore di 1000 elementi, lo stesso in ogni elemento, ${forma === "in-fila" ? "in fila" : "con le colonne dei primi dieci"}`,
      testo: progetto([{ name: "v", type: "integer", size: 1000, initial: { each: "0" } }], [{ id: "b1", kind: "write", values: ["v[0]"], newline: true }]),
      forma,
      finisce: true,
      oltre: true,
    },
    {
      nome: `il valore iniziale di un vettore di 1000 elementi in un elenco, ${forma === "in-fila" ? "in fila" : "con le colonne dei primi dieci"}`,
      testo: progetto([{ name: "v", type: "integer", size: 1000, initial: Array.from({ length: 1000 }, (_, i) => String(i * i)) }], [{ id: "b1", kind: "write", values: ["v[999]"], newline: true }]),
      forma,
      finisce: true,
      oltre: true,
    },
  ]),
  {
    nome: "una stringa di 1000 caratteri cambiata a ogni giro",
    testo: progetto(
      [
        { name: "a", type: "string", max_length: 1000, initial: `"${"x".repeat(999)}"` },
        { name: "s", type: "string", max_length: 1000 },
        { name: "i", type: "integer", initial: "0" },
      ],
      [
        {
          id: "b1",
          kind: "while",
          condition: "i < 1000",
          body: [
            {
              id: "b2",
              kind: "if",
              condition: "i mod 2 == 0",
              then: [{ id: "b3", kind: "assignment", target: "s", value: 'a + "y"' }],
              else: [{ id: "b4", kind: "assignment", target: "s", value: 'a + "z"' }],
            },
            { id: "b5", kind: "assignment", target: "i", value: "i + 1" },
          ],
        },
      ],
    ),
    forma: "primi-e-altri",
    finisce: true,
    oltre: false,
  },
  { nome: "10 stringhe da 1000 caratteri, con le colonne dei primi dieci", testo: conStringhe(10, 1000), forma: "primi-e-altri", finisce: true, oltre: false },
  { nome: "10 stringhe da 1000 caratteri, in fila", testo: conStringhe(10, 1000), forma: "in-fila", finisce: true, oltre: false },
  { nome: "100 stringhe da 100 caratteri, con le colonne dei primi dieci", testo: conStringhe(100, 100), forma: "primi-e-altri", finisce: true, oltre: true },
  { nome: "100 stringhe da 100 caratteri, in fila", testo: conStringhe(100, 100), forma: "in-fila", finisce: true, oltre: true },
] as const;

const statoDi = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]");

/** Un giro di andata e ritorno con la pagina, in millisecondi. */
async function risposta(page: Page): Promise<number> {
  const t0 = Date.now();
  await page.evaluate(() => 1);
  return Date.now() - t0;
}

/** Il fotogramma più lungo nei prossimi `ms` millisecondi, misurato nella pagina, e quanti ne arrivano. */
const fotogrammi = (page: Page, ms: number) =>
  page.evaluate(
    (durata) =>
      new Promise<{ n: number; peggiore: number }>((fatto) => {
        let prima = performance.now();
        let n = 0;
        let peggiore = 0;
        const fine = prima + durata;
        const giro = (t: number) => {
          peggiore = Math.max(peggiore, t - prima);
          prima = t;
          n++;
          if (t < fine) requestAnimationFrame(giro);
          else fatto({ n, peggiore: Math.round(peggiore) });
        };
        requestAnimationFrame(giro);
      }),
    ms,
  );

for (const p of programmi)
  test(`la finestra risponde entro la soglia: ${p.nome}`, async ({ page }, info) => {
    test.setTimeout(240_000);
    await apriVuota(page, { lingua: "it", formaDeiVettori: p.forma }, { esempi: { "1 pesante.algo": p.testo } });
    await apriEsempio(page, 0);
    await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
    const misure: { cosa: string; ms: number }[] = [];
    const partenza = Date.now();
    // Il fotogramma più lungo di tutta la corsa, dal tasto alla fine: un campionatore nella pagina, acceso prima.
    await page.evaluate(() => {
      const w = window as unknown as { __peggiore: number };
      w.__peggiore = 0;
      let prima = performance.now();
      const giro = (t: number) => {
        w.__peggiore = Math.max(w.__peggiore, t - prima);
        prima = t;
        requestAnimationFrame(giro);
      };
      requestAnimationFrame(giro);
    });
    await page.keyboard.press("F5");
    await page.waitForTimeout(2_000);
    misure.push({ cosa: "risposta dopo 2 s", ms: await risposta(page) });
    const f1 = await fotogrammi(page, 1_000);
    misure.push({ cosa: `fotogramma più lungo dopo 2 s (${f1.n} in 1 s)`, ms: f1.peggiore });
    if (p.finisce) await expect(statoDi(page)).toHaveText(it.statoFinita, { timeout: 120_000 });
    else {
      // Il ciclo che non finisce peggiora mentre corre (ciò che tiene cresce): si campiona per tutta la corsa, ogni 2 s,
      // finché si ferma da sé al tetto dei passi o finché passa la durata; resta il campione peggiore.
      let campioni = 0;
      let rispostaPeggiore = 0;
      let fotogrammaPeggiore = 0;
      while ((await statoDi(page).textContent()) === it.statoInCorso && Date.now() - partenza < DURATA_DEL_CICLO_MS) {
        await page.waitForTimeout(1_500);
        rispostaPeggiore = Math.max(rispostaPeggiore, await risposta(page));
        fotogrammaPeggiore = Math.max(fotogrammaPeggiore, (await fotogrammi(page, 500)).peggiore);
        campioni++;
      }
      // Premessa: la corsa è stata campionata, o le due misure qui sotto sarebbero zeri senza misura.
      expect(campioni, "campioni durante la corsa").toBeGreaterThan(0);
      misure.push({ cosa: `risposta peggiore durante la corsa (${campioni} campioni)`, ms: rispostaPeggiore });
      misure.push({ cosa: "fotogramma più lungo durante la corsa", ms: fotogrammaPeggiore });
    }
    misure.push({ cosa: `fotogramma più lungo dal tasto alla fine (${Date.now() - partenza} ms di corsa)`, ms: Math.round(await page.evaluate(() => (window as unknown as { __peggiore: number }).__peggiore)) });
    const stato = await statoDi(page).textContent();
    // La forma scelta è quella mostrata (la riga sopra la tabella): senza, le due forme della stessa prova potrebbero
    // misurare la stessa tabella. Un vettore in fila ha sempre la sua frase; con le colonne dei primi dieci solo oltre
    // il decimo elemento.
    const spiega = (await page.locator("[data-spiega]").allTextContents()).join(" ");
    if (p.forma === "in-fila") expect(spiega, "la riga sopra la tabella").toContain("in una colonna sola");
    else if (p.oltre) expect(spiega, "la riga sopra la tabella").toContain("le colonne dei primi 10");
    else expect(spiega, "la riga sopra la tabella").toBe("");
    misure.push({ cosa: `risposta alla fine (${stato})`, ms: await risposta(page) });
    const f2 = await fotogrammi(page, 1_000);
    misure.push({ cosa: `fotogramma più lungo alla fine (${f2.n} in 1 s)`, ms: f2.peggiore });
    const t = Date.now();
    await page.keyboard.press("Shift+F5");
    await expect(statoDi(page)).toHaveText(it.statoPronto, { timeout: 120_000 });
    misure.push({ cosa: "«Ferma»", ms: Date.now() - t });
    const peggiore = Math.max(...misure.map((m) => m.ms));
    console.log(
      `[${info.project.name}] ${p.nome}: ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}; il più lungo ${peggiore} ms, margine ${Math.round((100 * (SOGLIA_MS - peggiore)) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms)`,
    );
    for (const m of misure) expect(m.ms, m.cosa).toBeLessThanOrEqual(SOGLIA_MS);
  });

test("la finestra risponde entro la soglia: un ciclo per fino al tetto dei passi, col watch fermo sul contatore e il codice aperto", async ({ page }, info) => {
  test.setTimeout(240_000);
  // Tre azioni per giro (il controllo, il corpo, l'aumento): il tetto di un milione di passi arriva prima della fine.
  const testo = progetto(
    [
      { name: "i", type: "integer" },
      { name: "s", type: "integer", initial: "0" },
    ],
    [{ id: "b1", kind: "for", counter: "i", from: "1", to: "2000000000", body: [{ id: "b2", kind: "assignment", target: "s", value: "i mod 7" }] }],
  );
  await apriVuota(page, { lingua: "it" }, { esempi: { "1 pesante.algo": testo } });
  await apriEsempio(page, 0);
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  // La prima pausa (il valore iniziale di s), poi il watch fermato col clic sul contatore e il codice aperto.
  await page.keyboard.press("F10");
  await expect(statoDi(page)).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await page.locator('[data-blocco="b1"] [data-watch-dato="i"]').first().click();
  const fermo = page.locator("[data-watch][data-watch-fermo]");
  await expect(fermo).toHaveCount(1);
  await page.locator('header [data-comando="genera"]').click();
  await expect(page.getByRole("region", { name: it.codiceGenerato, exact: true })).toBeVisible();
  const misure: { cosa: string; ms: number }[] = [];
  const partenza = Date.now();
  await page.evaluate(() => {
    const w = window as unknown as { __peggiore: number };
    w.__peggiore = 0;
    let prima = performance.now();
    const giro = (t: number) => {
      w.__peggiore = Math.max(w.__peggiore, t - prima);
      prima = t;
      requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
  });
  await page.keyboard.press("F5");
  let campioni = 0;
  let rispostaPeggiore = 0;
  let fotogrammaPeggiore = 0;
  while ((await statoDi(page).textContent()) === it.statoInCorso && Date.now() - partenza < 120_000) {
    await page.waitForTimeout(1_500);
    rispostaPeggiore = Math.max(rispostaPeggiore, await risposta(page));
    fotogrammaPeggiore = Math.max(fotogrammaPeggiore, (await fotogrammi(page, 500)).peggiore);
    campioni++;
  }
  // Premesse: la corsa è stata campionata ed è finita al tetto dei passi, col watch fermo e il codice ancora lì.
  expect(campioni, "campioni durante la corsa").toBeGreaterThan(0);
  await expect(statoDi(page)).toHaveText(it.statoFermataDaUnErrore);
  await expect(fermo).toHaveCount(1);
  misure.push({ cosa: `risposta peggiore durante la corsa (${campioni} campioni)`, ms: rispostaPeggiore });
  misure.push({ cosa: "fotogramma più lungo durante la corsa", ms: fotogrammaPeggiore });
  misure.push({ cosa: `fotogramma più lungo dal tasto alla fine (${Date.now() - partenza} ms di corsa)`, ms: Math.round(await page.evaluate(() => (window as unknown as { __peggiore: number }).__peggiore)) });
  misure.push({ cosa: "risposta alla fine", ms: await risposta(page) });
  const peggiore = Math.max(...misure.map((m) => m.ms));
  console.log(
    `[${info.project.name}] ciclo per al tetto dei passi, watch fermo e codice aperto: ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}; il più lungo ${peggiore} ms, margine ${Math.round((100 * (SOGLIA_MS - peggiore)) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms)`,
  );
  for (const m of misure) expect(m.ms, m.cosa).toBeLessThanOrEqual(SOGLIA_MS);
});
