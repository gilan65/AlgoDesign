// «Stampa…» (menu «Progetto» e Ctrl+P) nel motore, col guscio simulato e `window.print` sostituito da un contatore (la
// pagina preparata resta nel documento: il motore vero la toglie con `afterprint`), sul programma di riferimento della
// tappa 3 (quattro funzioni; casi d'uso nel programma, in `valido` e in `stelle`):
// - la finestra con le predefinite e le parti piene; la pagina con le parti scelte e solo quelle, nell'ordine (Progetto,
//   Dati, Flowchart, Casi d'uso), ognuna da un foglio nuovo con la sua regola `@page` nel foglio di stile costruito dal
//   CSSOM; le intestazioni; ogni foglio del flowchart uguale all'SVG che il nucleo scrive per quel foglio; il contenuto
//   dei dati e dei casi d'uso contato a mano; in stampa la sola pagina; il PDF di Chromium coi versi dei fogli dalla
//   `/MediaBox`; `afterprint` toglie la pagina e le sue regole;
// - «Ogni procedura e funzione da un foglio nuovo», «solo quella mostrata» (la parte vuota spenta), le predefinite che
//   stampano il solo flowchart, «Annulla» che non stampa, le scelte ricordate per la sessione; la nota dei flowchart
//   ristretti coi punti del nucleo;
// - Ctrl+P col fuoco in un campo; Ctrl+P fermato anche con un'altra finestra aperta; in pausa la casella dei segni, che
//   mette o toglie il blocco corrente e il punto di interruzione dai fogli.
// Gli attesi sono quelli scritti a mano prima del codice (`atteso.md` della misura); i fogli di ogni flowchart (quanti e
// il verso) li dà il nucleo con la misura del testo del motore.
//
// CHE COSA NON GUARDA: la WebView2, la sua anteprima di stampa e le intestazioni che il motore aggiunge di suo (non ci
// sono in `page.pdf`: la prova sul prodotto); il testo nei riquadri di margine del PDF (le regole li scrivono: lo guarda
// `ui/stampa/parti.test.ts`; che il motore li renda lo dice la misura della sonda); WebKit.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fogliDelDisegno } from "../core/disegno/fogli";
import { svgDelFoglio } from "../core/disegno/svg";
import type { Tavolozza } from "../core/disegno/tavolozza";
import { geometriaPredefinita as tema } from "../core/disegno/tema";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { areeDellaStampa, notaDeiRistretti } from "../ui/stampa/parti";
import { disegnoNelMotore } from "./disegno-nel-motore";
import { apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

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

/** La tavolozza della carta scritta a mano dal tema chiaro dei «Tenui» (come `esporta.e2e.ts`). */
const CARTA: Tavolozza = {
  sfondo: "#ffffff",
  testo: "#1d1d1b",
  bordo: "#3d4a5c",
  linea: "#5b6470",
  riquadro: "#3d4a5c",
  vero: "#1f7a4d",
  falso: "#b4462f",
  forme: { inizioEFine: "#cfd2d6", assegnazione: "#f0dcf2", procedura: "#efe3d0", lettura: "#d9f0df", scrittura: "#c9e0fd", se: "#fcd2b0", cicli: "#f9a66c", commento: "#ffffff" },
  corrente: "#fff59d",
  bordoCorrente: "#d97706",
  testoCorrente: "#111111",
  punto: "#c62828",
};

const finestra = (page: Page) => page.getByRole("dialog", { name: it.stampaTitolo, exact: true });
const casella = (page: Page, nome: string) => finestra(page).getByRole("checkbox", { name: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
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
async function fogliDelNucleo(page: Page, punti = 8, adatta = false, testo: unknown = progetto) {
  const p = apriProgetto(typeof testo === "string" ? testo : JSON.stringify(testo));
  if (!p.ok) throw new Error("il progetto della prova non si apre");
  const fuori = [];
  for (const f of p.progetto.functions) {
    const d = await disegnoNelMotore(page, f, f.kind === "main" ? (p.progetto.shared_constants ?? []) : [], p.progetto.functions);
    fuori.push({ f, d, g: fogliDelDisegno(d, areeDellaStampa, { adatta, punti }, tema) });
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
  // Le predefinite: tutte le funzioni, di seguito; solo il flowchart; nessuna parte spenta; nessuna casella dei segni.
  const parti = [it.stampaProgetto, it.stampaDati, it.stampaFlowchart, it.stampaCasi];
  const ordine = await finestra(page).locator("[data-parti] > div > label > span > span:first-child").allTextContents();
  const predefinite = await Promise.all(parti.map(async (n) => [await casella(page, n).isChecked(), await casella(page, n).isDisabled()]));
  expect({
    ordine,
    predefinite,
    tutte: await finestra(page).getByRole("radio", { name: it.stampaTutte, exact: true }).isChecked(),
    foglioNuovo: await casella(page, it.stampaFoglioNuovo).isChecked(),
    segni: await casella(page, it.stampaSegni).count(),
  }).toEqual({ ordine: parti, predefinite: [[false, false], [false, false], [true, false], [false, false]], tutte: true, foglioNuovo: false, segni: 0 });
  for (const n of [it.stampaProgetto, it.stampaDati, it.stampaCasi]) await casella(page, n).check();
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

test("[Stampa] le predefinite stampano il solo flowchart; «Annulla» non stampa; le scelte ricordate; ogni funzione da un foglio nuovo; solo quella mostrata, con la parte vuota spenta", async ({ page }) => {
  test.setTimeout(120_000);
  await conStampa(page);
  await page.keyboard.press("Control+p");
  await expect(finestra(page)).toBeVisible();
  await finestra(page).getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(finestra(page)).toHaveCount(0);
  expect({ stampe: await stampe(page), pagina: await page.locator("[data-stampa]").count() }).toEqual({ stampe: 0, pagina: 0 });
  // Le predefinite: il solo flowchart di tutte le funzioni.
  await page.keyboard.press("Control+p");
  await stampa(page, 1);
  const nucleo = await fogliDelNucleo(page);
  expect((await sezioni(page)).map((x) => x.parte)).toEqual(Array<string>(nucleo.reduce((n, { g }) => n + g.fogli.length, 0)).fill("flowchart"));
  await dopoLaStampa(page);

  // Ogni funzione da un foglio nuovo: dati e casi d'uso una sezione per funzione, col nome nell'intestazione.
  await page.keyboard.press("Control+p");
  for (const n of [it.stampaDati, it.stampaCasi]) await casella(page, n).check();
  await casella(page, it.stampaFoglioNuovo).check();
  await stampa(page, 2);
  const divise = (await sezioni(page)).filter((x) => x.parte !== "flowchart").map((x) => x.testa);
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
    ...nucleo[1]!.g.fogli.map(() => ["flowchart", `${N} · Flowchart · leggi_numero`]),
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

  // In pausa sul punto di interruzione del primo blocco: la casella dei segni, accesa; i fogli del programma con la freccia
  // del blocco corrente e il punto; spenta, senza.
  await page.locator('[data-blocco="b1"]').click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(new RegExp(`^${riempi(it.statoInPausa, { n: "" })}`));
  // Sul primo foglio del programma (ogni foglio ha il disegno intero, e ne mostra la sua finestra).
  const segni = () => page.locator('[data-stampa] [data-parte="flowchart"]').first().evaluate((s) => [s.querySelectorAll("[data-freccia]").length, s.querySelectorAll("[data-interruzione]").length]);
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
