// «Stampa…» (menu «Progetto» e Ctrl+P) nel motore, col guscio simulato e `window.print` sostituito da un contatore (la
// pagina preparata resta nel documento: il motore vero la toglie con `afterprint`), sul programma di riferimento della
// tappa 3 (quattro funzioni; casi d'uso nel programma, in `valido` e in `stelle`):
// - la finestra con le predefinite (gli affiancati) e le sei parti nell'ordine; la pagina con le parti scelte e solo
//   quelle, nell'ordine (Progetto, Dati, Flowchart, Casi d'uso), ognuna da un foglio nuovo con la sua regola `@page` nel
//   foglio di stile costruito dal CSSOM; le intestazioni; ogni foglio del flowchart uguale all'SVG che il nucleo scrive
//   per quel foglio; il contenuto dei dati e dei casi d'uso contato a mano; in stampa la sola pagina; il PDF di Chromium
//   coi versi dei fogli dalla `/MediaBox`; `afterprint` toglie la pagina e le sue regole;
// - «Ogni procedura e funzione in un foglio nuovo», «solo quella mostrata» (la parte vuota spenta), le predefinite che
//   stampano i soli affiancati, «Annulla» che non stampa, le scelte ricordate per la sessione; la nota dei flowchart
//   ristretti coi punti del nucleo;
// - Ctrl+P col fuoco in un campo; Ctrl+P fermato anche con un'altra finestra aperta; con la guida aperta la stampa senza
//   la guida (nemmeno nel PDF); in pausa la casella dei segni, che
//   mette o toglie il blocco corrente e il punto di interruzione dai fogli (degli affiancati);
// - il codice: i linguaggi accesi nel menu accanto a «Codice in»; gli affiancati in Python per funzione (il flowchart sul
//   mezzo foglio uguale all'SVG del nucleo, il codice coi numeri veri, ↪ sul seguito, la coda «Funzioni di supporto»),
//   tutti orizzontali nel PDF; il codice da solo verticale e orizzontale dalla `/MediaBox`, e una funzione per foglio;
//   ogni riga nel suo lato, misurato alla larghezza della carta (anche con le tabulazioni); «Accademico» che non dà il
//   codice: la nota, il foglio con la frase e l'elenco, poi i flowchart, e la nota dei ristretti calcolata sul foglio
//   intero (dove vanno i flowchart), non sul mezzo foglio.
// Gli attesi sono quelli scritti a mano prima del codice (`atteso.md` della misura); i fogli di ogni flowchart (quanti e
// il verso) li dà il nucleo con la misura del testo del motore.
//
// CHE COSA NON GUARDA: la WebView2, la sua anteprima di stampa e le intestazioni che il motore aggiunge di suo (non ci
// sono in `page.pdf`: la prova sul prodotto); il testo nei riquadri di margine del PDF (le regole li scrivono: lo guarda
// `ui/stampa/parti.test.ts`; che il motore li renda lo dice la misura della sonda); un progetto con errori stampato (la
// frase e l'elenco degli errori li guarda `parti.test.ts`; la pagina li disegna come le mancanze); WebKit.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fogliDelDisegno } from "../core/disegno/fogli";
import { svgDelFoglio } from "../core/disegno/svg";
import { geometriaPredefinita as tema } from "../core/disegno/tema";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { testiDelleMancanze } from "../i18n/mancanze";
import { leggiPdf } from "../strumenti/lettore-pdf";
import { areeAccanto, areeDellaStampa, notaDeiRistretti } from "../ui/stampa/parti";
import { disegnoNelMotore } from "./disegno-nel-motore";
import { apriVuota, costruisciFinzione, voceDelMenu, voceDellAiuto } from "./pagina";
import { CARTA, righeNelLato } from "./stampa-pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 }, reducedMotion: "reduce" });

const PERCORSO = "C:\\Documenti\\media voti.algo";
const TESTO = readFileSync(fileURLToPath(new URL("../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8");
const progetto = (() => {
  const p = apriProgetto(TESTO);
  if (!p.ok) throw new Error("il riferimento della tappa 3 non si apre");
  return p.progetto;
})();
const N = progetto.metadata.name;
const NOMI = ["Programma principale", "leggi_numero", "valido", "stelle"];

const finestra = (page: Page) => page.getByRole("dialog", { name: it.stampaTitolo, exact: true });
/** La casella col testo dato (la nota sotto non conta: «Flowchart» non è «Flowchart e codice affiancati»). */
const casella = (page: Page, nome: string) => finestra(page).locator("label", { has: page.locator(`xpath=./span/span[1][normalize-space(.)="${nome}"]`) }).getByRole("checkbox");
const stampe = (page: Page) => page.evaluate(() => (window as unknown as { __stampe__: number }).__stampe__);
/** Le sezioni della pagina preparata: la parte, l'intestazione, il nome della regola. */
const sezioni = (page: Page) =>
  page.locator("[data-stampa] section").evaluateAll((ss) => ss.map((s) => ({ parte: s.getAttribute("data-parte")!, testa: s.getAttribute("data-testa")!, destra: s.getAttribute("data-destra")!, pagina: (s as HTMLElement).style.getPropertyValue("page") })));
/** Le regole `@page` dei fogli di stile costruiti: il nome e il verso. */
const regole = (page: Page) =>
  page.evaluate(() =>
    [...document.adoptedStyleSheets].flatMap((f) => [...f.cssRules].filter((r): r is CSSPageRule => r instanceof CSSPageRule).map((r) => ({ nome: r.selectorText, verso: r.style.getPropertyValue("size") }))),
  );

/** L'app col riferimento aperto e `window.print` che conta le chiamate. */
async function conStampa(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __stampe__: number }).__stampe__ = 0;
    window.print = () => {
      (window as unknown as { __stampe__: number }).__stampe__++;
    };
  });
  await apriVuota(page, { lingua: "it" }, { argomento: PERCORSO, file: { [PERCORSO]: TESTO } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "media voti.algo" }));
}

/** Stampa con la finestra già aperta, e aspetta la chiamata `n` di `window.print`. */
async function stampa(page: Page, n: number): Promise<void> {
  await finestra(page).getByRole("button", { name: it.stampa, exact: true }).click();
  await expect(finestra(page)).toHaveCount(0);
  await expect.poll(() => stampe(page)).toBe(n);
}

/** La stampa del motore finita: la pagina esce. */
async function dopoLaStampa(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("[data-stampa]")).toHaveCount(0);
}

/** I fogli del nucleo di ogni funzione, coi punti dati, con la misura del testo del motore. */
async function fogliDelNucleo(page: Page, punti = 8, adatta = false, testo: unknown = progetto, aree = areeDellaStampa) {
  const p = apriProgetto(typeof testo === "string" ? testo : JSON.stringify(testo));
  if (!p.ok) throw new Error("il progetto della prova non si apre");
  const fuori = [];
  for (const f of p.progetto.functions) {
    const d = await disegnoNelMotore(page, f, f.kind === "main" ? (p.progetto.shared_constants ?? []) : [], p.progetto.functions);
    fuori.push({ f, d, g: fogliDelDisegno(d, aree, { adatta, punti }, tema) });
  }
  return fuori;
}

/** I versi dei fogli del PDF di Chromium: «v» verticale, «o» orizzontale. */
async function fogliDelPdf(page: Page): Promise<string[]> {
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString("latin1");
  return [...pdf.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => (Number(m[1]) > Number(m[2]) ? "o" : "v"));
}

test("[Stampa] tutte le parti del riferimento della tappa 3: le predefinite, le sezioni nell'ordine con le intestazioni e le regole, i fogli del flowchart dal nucleo, i dati e i casi d'uso, in stampa la sola pagina, il PDF di Chromium", async ({ page }) => {
  test.setTimeout(120_000);
  await conStampa(page);
  const prima = await page.evaluate(() => document.adoptedStyleSheets.length);
  await (await voceDelMenu(page, it.stampa)).click();
  await expect(finestra(page)).toBeVisible();
  // Le predefinite: tutte le funzioni, di seguito; il flowchart e il codice affiancati; nessuna parte spenta; nessuna
  // casella dei segni. Le sei parti nell'ordine.
  const parti = [it.stampaProgetto, it.stampaDati, it.stampaFlowchart, it.stampaCodice, it.stampaAffiancati, it.stampaCasi];
  const ordine = await finestra(page)
    .locator("[data-parti] > div")
    .evaluateAll((dd) => dd.map((d) => d.querySelector("label > span > span:first-child")!.textContent));
  const predefinite = await Promise.all(parti.map(async (n) => [await casella(page, n).isChecked(), await casella(page, n).isDisabled()]));
  expect({
    ordine,
    predefinite,
    tutte: await finestra(page).getByRole("radio", { name: it.stampaTutte, exact: true }).isChecked(),
    foglioNuovo: await casella(page, it.stampaFoglioNuovo).isChecked(),
    segni: await casella(page, it.stampaSegni).count(),
  }).toEqual({ ordine: parti, predefinite: [[false, false], [false, false], [true, false], [true, false], [true, false], [false, false]], tutte: true, foglioNuovo: false, segni: 0 });
  for (const n of [it.stampaProgetto, it.stampaDati, it.stampaCasi]) await casella(page, n).check();
  // Senza il codice gli affiancati sono spenti, e non escono: qui le parti del progetto, dei dati, del flowchart e dei casi.
  await casella(page, it.stampaCodice).uncheck();
  expect([await casella(page, it.stampaAffiancati).isDisabled(), await casella(page, it.stampaAffiancati).isChecked()]).toEqual([true, false]);
  await stampa(page, 1);

  // L'atteso scritto prima del codice; i fogli di ogni flowchart dal nucleo.
  const nucleo = await fogliDelNucleo(page);
  const flowchart = nucleo.flatMap(({ g }, k) =>
    g.fogli.map((_, i) => ({ parte: "flowchart", testa: `${N} · Flowchart · ${NOMI[k]}`, destra: g.fogli.length > 1 ? riempi(it.stampaFoglio, { n: String(i + 1), m: String(g.fogli.length) }) : "", verso: g.orizzontale ? "o" : "v" })),
  );
  const attese = [
    { parte: "progetto", testa: `${N} · Progetto`, destra: "", verso: "v" },
    { parte: "dati", testa: `${N} · Dati`, destra: "", verso: "v" },
    ...flowchart,
    { parte: "casi", testa: `${N} · Casi d'uso`, destra: "", verso: "v" },
  ];
  const s = await sezioni(page);
  console.log(`riferimento della tappa 3 stampato: ${s.length} sezioni, fogli dei flowchart ${nucleo.map(({ g }) => `${g.fogli.length}${g.orizzontale ? "o" : "v"}`).join(" ")}`);
  expect(s.map(({ parte, testa, destra }) => ({ parte, testa, destra }))).toEqual(attese.map(({ parte, testa, destra }) => ({ parte, testa, destra })));
  // Ogni sezione ha la sua regola, col suo nome e il suo verso, nel foglio costruito.
  const r = await regole(page);
  // Chromium scrive il verticale, che è il predefinito, come «a4».
  expect(r).toEqual(s.map((x, i) => ({ nome: x.pagina, verso: attese[i]!.verso === "o" ? "a4 landscape" : "a4" })));
  expect(new Set(s.map((x) => x.pagina)).size).toBe(s.length);

  // Il progetto: il nome e la sola descrizione (il file non ha autore né note).
  const p = page.locator('[data-stampa] [data-parte="progetto"]');
  expect({ titolo: await p.locator("h1").textContent(), voci: await p.locator("dt").allTextContents(), descrizione: await p.locator("dd").textContent() }).toEqual({
    titolo: N,
    voci: [it.progettoDescrizione],
    descrizione: progetto.metadata.description,
  });
  // I dati: le quattro funzioni coi titoli; le tabelle e le righe contate a mano.
  const dati = page.locator('[data-stampa] [data-parte="dati"]');
  const tabelle = await dati.locator("[data-funzione]").evaluateAll((ff) =>
    ff.map((f) => [f.querySelector("h2")!.textContent, [...f.querySelectorAll("h3")].map((h) => h.textContent).join("+"), [...f.querySelectorAll("tbody")].map((b) => b.querySelectorAll("tr").length).join("+")]),
  );
  expect(tabelle).toEqual([
    [NOMI[0], it.dati, "7"],
    [NOMI[1], it.parametri, "1"],
    [NOMI[2], it.parametri, "1"],
    [NOMI[3], `${it.parametri}+${it.dati}`, "1+1"],
  ]);
  expect(await dati.locator("tbody th, tbody td").first().textContent()).toBe("n");
  // I casi d'uso: tre funzioni (non `leggi_numero`), coi nomi dei casi e gli output attesi.
  const casi = await page.locator('[data-stampa] [data-parte="casi"] [data-funzione]').evaluateAll((ff) =>
    ff.map((f) => [f.querySelector("h2")!.textContent, [...f.querySelectorAll("tbody tr")].map((t) => [t.children[0]!.textContent, t.children[3]!.textContent])]),
  );
  expect(casi).toEqual([
    [NOMI[0], [["riferimento-media-voti-funzioni", "Numero non valido: da 1 a 30\nVoto ignorato: 11\nMedia: 6.67 su 3 voti, insufficienti: 1\n******"]]],
    [NOMI[2], [["voto valido", "→ true"], ["voto troppo alto", "→ false"]]],
    [NOMI[3], [["tre stelle", "***"]]],
  ]);

  // Ogni foglio del flowchart è l'SVG che il nucleo scrive per quel foglio (passato dal parser HTML, nella stessa forma).
  const carattere = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim());
  const attesi = nucleo.flatMap(({ f, d, g }) => g.fogli.map((foglio, i) => svgDelFoglio(d, foglio, g.scala, { geometria: tema, tavolozza: CARTA, modo: "colori", carattere, fondoDeiCicli: false, id: `stampa-${f.id}-${i}` })));
  const confronto = await page.evaluate((aa) => {
    const stampati = [...document.querySelectorAll('[data-stampa] [data-parte="flowchart"] svg')].map((e) => e.outerHTML);
    const attesi = aa.map((a) => {
      const d = document.createElement("div");
      d.innerHTML = a;
      return d.querySelector("svg")!.outerHTML;
    });
    return { stampati: stampati.length, uguali: stampati.map((x, i) => x === attesi[i]) };
  }, attesi);
  expect(confronto).toEqual({ stampati: attesi.length, uguali: attesi.map(() => true) });

  // In stampa: la sola pagina preparata; il PDF di Chromium con un foglio per sezione, nel verso della sua regola.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#radice")).toBeHidden();
  await expect(page.locator('[data-stampa] [data-parte="casi"]')).toBeVisible();
  const pdf = await fogliDelPdf(page);
  console.log(`pdf: ${pdf.length} fogli ${pdf.join("")}`);
  expect(pdf).toEqual(attese.map((a) => a.verso));
  await page.emulateMedia({ media: "screen" });
  // `afterprint`: la pagina e le sue regole escono.
  await dopoLaStampa(page);
  expect(await page.evaluate(() => document.adoptedStyleSheets.length)).toBe(prima);
});

test("[Stampa] le predefinite stampano i soli affiancati; «Annulla» non stampa; le scelte ricordate; ogni funzione in un foglio nuovo; solo quella mostrata, con la parte vuota spenta", async ({ page }) => {
  test.setTimeout(120_000);
  await conStampa(page);
  await page.keyboard.press("Control+p");
  await expect(finestra(page)).toBeVisible();
  await finestra(page).getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(finestra(page)).toHaveCount(0);
  expect({ stampe: await stampe(page), pagina: await page.locator("[data-stampa]").count() }).toEqual({ stampe: 0, pagina: 0 });
  // Le predefinite: i soli affiancati di tutte le funzioni, nel linguaggio mostrato (lo Pseudocodice, il primo del menu:
  // il codice di ogni funzione sta in un foglio, e non ha la coda).
  await page.keyboard.press("Control+p");
  await stampa(page, 1);
  const accanto = await fogliDelNucleo(page, 8, false, progetto, areeAccanto);
  expect((await sezioni(page)).map((x) => x.parte)).toEqual(Array<string>(accanto.reduce((n, { g }) => n + g.fogli.length, 0)).fill("affiancati"));
  await dopoLaStampa(page);

  // Ogni funzione in un foglio nuovo: dati e casi d'uso una sezione per funzione, col nome nell'intestazione.
  await page.keyboard.press("Control+p");
  for (const n of [it.stampaDati, it.stampaCasi]) await casella(page, n).check();
  await casella(page, it.stampaFoglioNuovo).check();
  await stampa(page, 2);
  const divise = (await sezioni(page)).filter((x) => x.parte === "dati" || x.parte === "casi").map((x) => x.testa);
  expect(divise).toEqual([...NOMI.map((n) => `${N} · Dati · ${n}`), ...[NOMI[0], NOMI[2], NOMI[3]].map((n) => `${N} · Casi d'uso · ${n}`)]);
  await dopoLaStampa(page);

  // Le scelte ricordate; «solo quella mostrata» spegne la casella del foglio nuovo; con `leggi_numero` mostrata i casi
  // d'uso sono spenti.
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f2"]').click();
  await page.keyboard.press("Control+p");
  expect([await casella(page, it.stampaDati).isChecked(), await casella(page, it.stampaFoglioNuovo).isChecked()]).toEqual([true, true]);
  await finestra(page).getByRole("radio", { name: riempi(it.stampaSoloMostrata, { nome: "leggi_numero" }), exact: true }).check();
  expect([await casella(page, it.stampaFoglioNuovo).isDisabled(), await casella(page, it.stampaCasi).isDisabled(), await casella(page, it.stampaCasi).isChecked()]).toEqual([true, true, false]);
  await stampa(page, 3);
  const sola = await sezioni(page);
  // Controllo positivo: la parte dei casi d'uso, scelta ma vuota, non c'è.
  expect(sola.map((x) => [x.parte, x.testa])).toEqual([
    ["dati", `${N} · Dati`],
    ...accanto[1]!.g.fogli.map(() => ["affiancati", `${N} · Flowchart e codice in Pseudocodice · leggi_numero`]),
  ]);
  await dopoLaStampa(page);
});

test("[Ctrl+P] col fuoco in un campo apre la finestra; con un'altra finestra aperta è fermato e non apre nulla; in pausa la casella dei segni mette o toglie il blocco corrente e il punto", async ({ page }) => {
  test.setTimeout(120_000);
  await conStampa(page);
  // Il fuoco nel campo di un blocco aperto.
  await page.locator('[data-blocco="b5"]').dblclick();
  await page.getByRole("form").getByRole("textbox").first().focus();
  await page.keyboard.press("Control+p");
  await expect(finestra(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(finestra(page)).toHaveCount(0);
  // Con un'altra finestra aperta: il tasto è fermato (non arriva alla stampa del motore) e la finestra «Stampa» non si apre.
  await (await voceDelMenu(page, it.esportaFlowchart)).click();
  await expect(page.getByRole("dialog", { name: it.esportaFlowchartTitolo, exact: true })).toBeVisible();
  const fermato = await page.evaluate(() => !document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true, cancelable: true })));
  // Controllo positivo del rilevatore: un tasto che l'app non prende non è fermato.
  const libero = await page.evaluate(() => !document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "q", ctrlKey: true, bubbles: true, cancelable: true })));
  expect({ fermato, libero, stampa: await finestra(page).count(), stampe: await stampe(page) }).toEqual({ fermato: true, libero: false, stampa: 0, stampe: 0 });
  await page.keyboard.press("Escape");

  // Con la guida aperta (resta aperta mentre si lavora, fuori da `#radice`): Ctrl+P apre la finestra, e in stampa la guida
  // non c'è; nel PDF nessun foglio ha il suo titolo. Il rilevatore si accende: prima della stampa la guida si vede.
  await (await voceDellAiuto(page, it.guida, it)).click();
  const guida = page.locator("[data-finestra-guida]");
  await expect(guida).toContainText(it.guidaTitolo);
  await page.keyboard.press("Control+p");
  await stampa(page, 1);
  await page.emulateMedia({ media: "print" });
  const inStampa = await guida.evaluate((g) => getComputedStyle(g).display);
  const conLaGuida = leggiPdf(await page.pdf({ preferCSSPageSize: true })).pagine.filter((p) => p.righe.some((r) => r.includes(it.guidaTitolo))).length;
  await page.emulateMedia({ media: null });
  expect({ inStampa, conLaGuida }).toEqual({ inStampa: "none", conLaGuida: 0 });
  await dopoLaStampa(page);
  await guida.locator("article").focus();
  await page.keyboard.press("Escape");
  await expect(guida).toHaveCount(0);
  // Il contatore delle stampe da capo: le stampe in pausa qui sotto si contano da 1.
  await page.evaluate(() => {
    (window as unknown as { __stampe__: number }).__stampe__ = 0;
  });

  // In pausa sul punto di interruzione del primo blocco: la casella dei segni, accesa; i fogli del programma con la freccia
  // del blocco corrente e il punto; spenta, senza.
  await page.locator('[data-blocco="b1"]').click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(new RegExp(`^${riempi(it.statoInPausa, { n: "" })}`));
  // Sul primo foglio del programma (ogni foglio ha il disegno intero, e ne mostra la sua finestra).
  // Le predefinite: gli affiancati, coi segni anche lì.
  const segni = () => page.locator('[data-stampa] [data-parte="affiancati"]').first().evaluate((s) => [s.querySelectorAll("[data-freccia]").length, s.querySelectorAll("[data-interruzione]").length]);
  await page.keyboard.press("Control+p");
  await expect(casella(page, it.stampaSegni)).toBeChecked();
  await stampa(page, 1);
  const con = await segni();
  await dopoLaStampa(page);
  await page.keyboard.press("Control+p");
  await casella(page, it.stampaSegni).uncheck();
  await stampa(page, 2);
  const senza = await segni();
  expect({ con, senza }).toEqual({ con: [1, 1], senza: [0, 0] });
});

/** Un programma con una sola scrittura lunga: più largo del foglio verticale a 12 punti, non a 8 (nel riferimento della
 * tappa 3, con la misura del motore, nessun flowchart esce ristretto). */
const LARGO = {
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "largo" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [],
      body: [{ id: "b1", kind: "write", values: [`"${"Una frase lunga da scrivere nella console. ".repeat(3)}"`], newline: true }],
      end: { id: "b2" },
    },
  ],
} as const;

test("[Stampa] la nota dei flowchart ristretti: ai punti scelti, coi punti del nucleo; nessuna a 8 punti o con «Adatta al foglio»", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    (window as unknown as { __stampe__: number }).__stampe__ = 0;
    window.print = () => {
      (window as unknown as { __stampe__: number }).__stampe__++;
    };
  });
  const percorso = "C:\\Documenti\\largo.algo";
  await apriVuota(page, { lingua: "it" }, { argomento: percorso, file: { [percorso]: JSON.stringify(LARGO) } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "largo.algo" }));
  await page.keyboard.press("Control+p");
  // Il flowchart da solo, sul foglio intero (senza il codice gli affiancati non escono).
  await casella(page, it.stampaCodice).uncheck();
  const nota = finestra(page).locator("[data-ristretti]");
  const campo = finestra(page).getByRole("spinbutton", { name: it.stampaPunti, exact: true });
  const cursore = finestra(page).getByRole("slider", { name: it.stampaPunti, exact: true });
  const viste: Record<number, string> = {};
  const attese: Record<number, string> = {};
  for (const punti of [8, 10, 12]) {
    await campo.fill(String(punti));
    expect(await cursore.inputValue()).toBe(String(punti));
    viste[punti] = (await nota.count()) === 0 ? "" : ((await nota.textContent()) ?? "");
    const ristretti = (await fogliDelNucleo(page, punti, false, LARGO)).filter(({ g }) => g.ristretto).map(({ f, g }) => ({ funzione: f as Funzione, punti: (g.scala * tema.carattere * 0.75) }));
    attese[punti] = notaDeiRistretti(ristretti, punti, it, "it");
  }
  console.log(`note dei ristretti: ${JSON.stringify(viste)}`);
  expect(viste).toEqual(attese);
  // Controllo positivo della premessa: a 12 punti il flowchart largo è ristretto (la nota non è vuota), a 8 no.
  expect([attese[12] !== "", attese[8]]).toEqual([true, ""]);
  await casella(page, it.stampaAdatta).check();
  await expect(nota).toHaveCount(0);

  // A 8 punti il flowchart largo non sta nel foglio verticale e va su un foglio orizzontale: la regola e il PDF lo dicono.
  await casella(page, it.stampaAdatta).uncheck();
  await campo.fill("8");
  await stampa(page, 1);
  const { g } = (await fogliDelNucleo(page, 8, false, LARGO))[0]!;
  expect({ orizzontale: g.orizzontale, fogli: g.fogli.length }).toEqual({ orizzontale: true, fogli: 1 });
  expect({ regole: (await regole(page)).map((r) => r.verso), sezioni: (await sezioni(page)).map((x) => x.parte) }).toEqual({ regole: ["a4 landscape"], sezioni: ["flowchart"] });
  await page.emulateMedia({ media: "print" });
  expect(await fogliDelPdf(page)).toEqual(["o"]);
});

// Il codice stampato. Le righe del Python del riferimento della tappa 3, contate sul testo generato (`parti.test.ts`): il
// programma principale 1–36, `leggi_numero` 37–48, `valido` 49–52, `stelle` 53–60, la coda 61–111; ognuna delle quattro
// funzioni sta in un foglio del codice, la coda ne vuole due (sul mezzo foglio) e il file intero due verticali o tre
// orizzontali.
const RIGHE = [
  [1, 36],
  [37, 48],
  [49, 52],
  [53, 60],
] as const;
const menuDeiLinguaggi = (page: Page) => finestra(page).getByRole("combobox", { name: it.stampaLinguaggio, exact: true });
/** Le righe del codice di ogni sezione: la prima e l'ultima vera (o null), quanti seguiti (↪), quanti SVG, se è il foglio
 * senza codice. */
const codiceStampato = (page: Page) =>
  page.locator("[data-stampa] section").evaluateAll((ss) =>
    ss.map((s) => {
      const righe = [...s.querySelectorAll("[data-riga]")];
      const vere = righe.filter((r) => r.getAttribute("data-pezzo") === "0").map((r) => Number(r.getAttribute("data-riga")));
      return { prima: vere[0] ?? null, ultima: vere.at(-1) ?? null, seguiti: righe.length - vere.length, svg: s.querySelectorAll("svg").length, senza: s.querySelector("[data-senza-codice]") !== null };
    }),
  );

test("[Stampa] gli affiancati in Python: i linguaggi accesi nel menu, per funzione il flowchart sul mezzo foglio e il codice coi numeri veri, la coda «Funzioni di supporto», ogni riga nel suo lato, tutti orizzontali nel PDF", async ({ page }) => {
  test.setTimeout(120_000);
  await conStampa(page);
  await page.keyboard.press("Control+p");
  // I linguaggi accesi nel menu delle Impostazioni (quelli di partenza: «Accademico» non c'è); scelto quello mostrato.
  expect({ voci: await menuDeiLinguaggi(page).locator("option").allTextContents(), scelto: await menuDeiLinguaggi(page).inputValue() }).toEqual({
    voci: [it.linguaggioPseudocodice, it.linguaggioPython, it.linguaggioC],
    scelto: "pseudocodice",
  });
  // Il verso del codice è spento con gli affiancati (sempre orizzontali).
  expect(await finestra(page).getByRole("radio", { name: it.stampaVerticale, exact: true }).isDisabled()).toBe(true);
  await menuDeiLinguaggi(page).selectOption("python");
  await expect(finestra(page).locator("[data-senza-codice]")).toHaveCount(0);
  await stampa(page, 1);

  // L'atteso: per ogni funzione tanti fogli quanti quelli del suo flowchart sul mezzo foglio (il codice sta nel primo),
  // poi i due della coda.
  const accanto = await fogliDelNucleo(page, 8, false, progetto, areeAccanto);
  const t = `${N} · Flowchart e codice in Python`;
  const foglioDi = (i: number, n: number) => (n > 1 ? riempi(it.stampaFoglioDi, { n: String(i + 1), m: String(n) }) : "");
  const attese = [
    ...accanto.flatMap(({ g }, k) => g.fogli.map((_, i) => ({ parte: "affiancati", testa: `${t} · ${NOMI[k]}`, destra: foglioDi(i, g.fogli.length) }))),
    ...[0, 1].map((i) => ({ parte: "affiancati", testa: `${t} · ${it.stampaSupporto}`, destra: foglioDi(i, 2) })),
  ];
  const s = await sezioni(page);
  expect(s.map(({ parte, testa, destra }) => ({ parte, testa, destra }))).toEqual(attese);
  const codice = await codiceStampato(page);
  console.log(`affiancati: ${s.length} sezioni, fogli dei flowchart sul mezzo foglio ${accanto.map(({ g }) => g.fogli.length).join(" ")}, seguiti ${codice.reduce((n, c) => n + c.seguiti, 0)}`);
  const primi = accanto.map(({ g }, k) => accanto.slice(0, k).reduce((n, x) => n + x.g.fogli.length, 0));
  expect(primi.map((i) => [codice[i]!.prima, codice[i]!.ultima, codice[i]!.svg])).toEqual(RIGHE.map(([a, b]) => [a, b, 1]));
  // Un flowchart più lungo continua col lato del codice vuoto; la coda col lato del flowchart vuoto, dalla 61 alla 111.
  for (const [k, { g }] of accanto.entries()) for (let i = 1; i < g.fogli.length; i++) expect([codice[primi[k]! + i]!.prima, codice[primi[k]! + i]!.svg]).toEqual([null, 1]);
  const [c1, c2] = codice.slice(-2) as [(typeof codice)[number], (typeof codice)[number]];
  expect([c1.prima, c2.prima === c1.ultima! + 1, c2.ultima, c1.svg, c2.svg]).toEqual([61, true, 111, 0, 0]);
  // Il seguito di una riga a capo: ↪ al posto del numero (le spiegazioni in testa al file vanno a capo).
  expect(codice[0]!.seguiti).toBeGreaterThan(0);
  expect(await page.locator('[data-stampa] [data-pezzo="1"] > span').first().textContent()).toBe("↪");

  // Ogni foglio del flowchart è l'SVG che il nucleo scrive per quel foglio sul mezzo foglio.
  const carattere = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim());
  const svgAttesi = accanto.flatMap(({ f, d, g }) => g.fogli.map((foglio, i) => svgDelFoglio(d, foglio, g.scala, { geometria: tema, tavolozza: CARTA, modo: "colori", carattere, fondoDeiCicli: false, id: `stampa-accanto-${f.id}-${i}` })));
  const confronto = await page.evaluate((aa) => {
    const stampati = [...document.querySelectorAll('[data-stampa] [data-parte="affiancati"] svg')].map((e) => e.outerHTML);
    return { stampati: stampati.length, uguali: aa.map((a, i) => {
      const d = document.createElement("div");
      d.innerHTML = a;
      return d.querySelector("svg")!.outerHTML === stampati[i];
    }) };
  }, svgAttesi);
  expect(confronto).toEqual({ stampati: svgAttesi.length, uguali: svgAttesi.map(() => true) });

  // In stampa: ogni riga sta nel suo lato; il PDF ha un foglio orizzontale per sezione.
  await page.emulateMedia({ media: "print" });
  const lato = await righeNelLato(page);
  console.log(`righe nel lato: ${JSON.stringify(lato)}`);
  expect({ pre: lato.pre, fuori: lato.fuori, latiStorti: lato.latiStorti }).toEqual({ pre: RIGHE.length + 2, fuori: 0, latiStorti: 0 });
  expect(await fogliDelPdf(page)).toEqual(attese.map(() => "o"));
});

test("[Stampa] il codice da solo: verticale, poi orizzontale dalla /MediaBox; ogni procedura e funzione in un foglio nuovo coi numeri veri e la coda in fondo", async ({ page }) => {
  test.setTimeout(120_000);
  await conStampa(page);
  await page.keyboard.press("Control+p");
  await menuDeiLinguaggi(page).selectOption("python");
  await casella(page, it.stampaFlowchart).uncheck();
  const verticale = finestra(page).getByRole("radio", { name: it.stampaVerticale, exact: true });
  const orizzontale = finestra(page).getByRole("radio", { name: it.stampaOrizzontale, exact: true });
  // Senza il flowchart gli affiancati sono spenti; il verso si sceglie, verticale per predefinito.
  expect([await casella(page, it.stampaAffiancati).isDisabled(), await verticale.isChecked(), await verticale.isDisabled()]).toEqual([true, true, false]);
  await stampa(page, 1);
  const t = `${N} · Codice in Python`;
  const di = async () => ({ sezioni: (await sezioni(page)).map((x) => [x.parte, x.testa, x.destra]), codice: (await codiceStampato(page)).map((c) => [c.prima, c.ultima]) });
  const v = await di();
  expect(v.sezioni).toEqual([["codice", t, ""], ["codice", t, ""]]);
  expect([v.codice[0]![0], v.codice[1]![0] === v.codice[0]![1]! + 1, v.codice[1]![1]]).toEqual([1, true, 111]);
  await page.emulateMedia({ media: "print" });
  // Una tabulazione (può venire dal testo di un commento) si stampa larga una colonna, come la conta l'a capo: una riga di
  // 60 caratteri con 30 tabulazioni resta nel lato (larga 8 colonne ciascuna, ne uscirebbe).
  await page.locator("[data-stampa] pre").first().evaluate((p) => {
    p.firstElementChild!.lastElementChild!.textContent = "a\t".repeat(30);
  });
  expect({ lato: ((l) => l.fuori + l.latiStorti)(await righeNelLato(page)), pdf: await fogliDelPdf(page) }).toEqual({ lato: 0, pdf: ["v", "v"] });
  await page.emulateMedia({ media: "screen" });
  await dopoLaStampa(page);

  // Le scelte ricordate (Python, il flowchart spento); su fogli orizzontali: tre.
  await page.keyboard.press("Control+p");
  expect([await menuDeiLinguaggi(page).inputValue(), await casella(page, it.stampaFlowchart).isChecked()]).toEqual(["python", false]);
  await orizzontale.check();
  await stampa(page, 2);
  const o = await di();
  expect(o.sezioni).toEqual(Array(3).fill(["codice", t, ""]));
  expect([o.codice[0]![0], o.codice[2]![1]]).toEqual([1, 111]);
  await page.emulateMedia({ media: "print" });
  expect({ lato: ((l) => l.fuori + l.latiStorti)(await righeNelLato(page, true)), pdf: await fogliDelPdf(page) }).toEqual({ lato: 0, pdf: ["o", "o", "o"] });
  await page.emulateMedia({ media: "screen" });
  await dopoLaStampa(page);

  // Ogni procedura e funzione in un foglio nuovo, su fogli verticali: una sezione per parte del codice.
  await page.keyboard.press("Control+p");
  await casella(page, it.stampaFoglioNuovo).check();
  await verticale.check();
  await stampa(page, 3);
  const d = await di();
  expect(d).toEqual({
    sezioni: [...NOMI.map((n) => ["codice", `${t} · ${n}`, ""]), ["codice", `${t} · ${it.stampaSupporto}`, ""]],
    codice: [...RIGHE.map(([a, b]) => [a, b]), [61, 111]],
  });
  await page.emulateMedia({ media: "print" });
  expect(await fogliDelPdf(page)).toEqual(Array(5).fill("v"));
});

test("[Stampa] un linguaggio che non dà il codice: «Accademico» acceso nel menu, la nota nella finestra, il foglio con la frase e l'elenco intero e poi i flowchart; il codice da solo, il solo foglio", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    (window as unknown as { __stampe__: number }).__stampe__ = 0;
    window.print = () => {
      (window as unknown as { __stampe__: number }).__stampe__++;
    };
  });
  // Un programma con una procedura, che «Accademico» non scrive: una cosa da cambiare (il parametro per riferimento).
  const percorso = "C:\\Documenti\\parametro-booleano.algo";
  const testo = readFileSync(fileURLToPath(new URL("../casi/tappa-3/parametro-booleano.algo", import.meta.url)), "utf8");
  await apriVuota(page, { lingua: "it", linguaggiDelCodice: ["python", "accademico"] }, { argomento: percorso, file: { [percorso]: testo } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "parametro-booleano.algo" }));
  await page.keyboard.press("Control+p");
  const nota = finestra(page).locator("[data-senza-codice]");
  expect({ voci: await menuDeiLinguaggi(page).locator("option").allTextContents(), scelto: await menuDeiLinguaggi(page).inputValue(), nota: await nota.count() }).toEqual({
    voci: [it.linguaggioPython, it.linguaggioAccademico],
    scelto: "python",
    nota: 0,
  });
  await menuDeiLinguaggi(page).selectOption("accademico");
  await expect(nota).toHaveText(riempi(it.stampaNotaNonCiSta, { linguaggio: it.linguaggioAccademico, quante: it.mancanzaUna }));
  await stampa(page, 1);
  const flowchart = await fogliDelNucleo(page, 8, false, testo);
  const nomi = [it.schedaPrincipale, "inverti"];
  expect((await sezioni(page)).map(({ parte, testa, destra }) => ({ parte, testa, destra }))).toEqual([
    { parte: "affiancati", testa: "parametro-booleano · Flowchart e codice in Accademico", destra: "" },
    ...flowchart.flatMap(({ g }, k) =>
      g.fogli.map((_, i) => ({ parte: "flowchart", testa: `parametro-booleano · Flowchart · ${nomi[k]}`, destra: g.fogli.length > 1 ? riempi(it.stampaFoglio, { n: String(i + 1), m: String(g.fogli.length) }) : "" })),
    ),
  ]);
  const elenco = page.locator("[data-stampa] [data-senza-codice]");
  expect({ frase: await elenco.locator("p").textContent(), voci: await elenco.locator("li").count(), prima: await elenco.locator("li").first().textContent() }).toMatchObject({
    frase: riempi(it.stampaNonCiSta, { linguaggio: it.linguaggioAccademico, quante: it.mancanzaUna }),
    voci: 1,
  });
  expect((await elenco.locator("li").first().textContent())!.startsWith(riempi(testiDelleMancanze.it.rif.breve, { operatore: "" }))).toBe(true);
  await page.emulateMedia({ media: "print" });
  expect(await fogliDelPdf(page)).toEqual(["v", ...flowchart.flatMap(({ g }) => g.fogli.map(() => (g.orizzontale ? "o" : "v")))]);
  await page.emulateMedia({ media: "screen" });
  await dopoLaStampa(page);

  // Il codice da solo: il solo foglio dell'elenco.
  await page.keyboard.press("Control+p");
  await casella(page, it.stampaFlowchart).uncheck();
  await stampa(page, 2);
  expect((await sezioni(page)).map((x) => [x.parte, x.testa])).toEqual([["codice", "parametro-booleano · Codice in Accademico"]]);
  expect(await page.locator("[data-stampa] [data-senza-codice] li").count()).toBe(1);
  await page.emulateMedia({ media: "print" });
  expect(await fogliDelPdf(page)).toEqual(["v"]);
  await page.emulateMedia({ media: "screen" });
  await dopoLaStampa(page);

  // La nota dei flowchart ristretti col foglio che si stampa davvero: senza il codice i flowchart vanno sul foglio intero,
  // non sul mezzo foglio degli affiancati. Il riferimento della tappa 3, che «Accademico» non scrive: a 8 punti il
  // programma principale esce ristretto sul mezzo foglio e non sul foglio intero (premessa misurata qui).
  await apriVuota(page, { lingua: "it", linguaggiDelCodice: ["python", "accademico"] }, { argomento: PERCORSO, file: { [PERCORSO]: TESTO } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "media voti.algo" }));
  await page.keyboard.press("Control+p");
  await menuDeiLinguaggi(page).selectOption("accademico");
  await casella(page, it.stampaFlowchart).check();
  await expect(casella(page, it.stampaAffiancati)).toBeChecked();
  const notaDi = async (aree: typeof areeDellaStampa) =>
    notaDeiRistretti((await fogliDelNucleo(page, 8, false, progetto, aree)).filter(({ g }) => g.ristretto).map(({ f, g }) => ({ funzione: f as Funzione, punti: g.scala * tema.carattere * 0.75 })), 8, it, "it");
  const ristretti = finestra(page).locator("[data-ristretti]");
  const vista = (await ristretti.count()) === 0 ? "" : ((await ristretti.textContent()) ?? "");
  const [intero, mezzo] = [await notaDi(areeDellaStampa), await notaDi(areeAccanto)];
  expect({ vista, premessa: mezzo !== "" && intero === "" }).toEqual({ vista: intero, premessa: true });
});
