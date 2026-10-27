// Il flowchart in SVG scritto dal nucleo (`core/disegno/svg.ts`) è il disegno della tela della finestra: nel motore, i due
// SVG nella stessa pagina, confrontati elemento per elemento NEI DUE VERSI (ogni elemento della tela ha il suo uguale
// nell'SVG del nucleo, e viceversa), coi numeri degli attributi e con gli stili CALCOLATI dal motore (riempimento,
// tratto, spessore, tratteggio, carattere, ancoraggio del testo): la tela li prende dalle variabili del tema, l'SVG dalla
// tavolozza letta da quelle stesse variabili.
// - Senza esecuzione, sulla pagina di prova dei disegni: ogni programma delle tappe 1 e 2 e tutte le funzioni di due
//   progetti della tappa 3 (le intestazioni, la chiamata coi lati e i pezzi con lo stile, «Restituisce»).
// - In esecuzione, nell'app vera: un programma scritto qui (un valore iniziale, una Scrittura con la sua Lettura mostrate
//   insieme, un ciclo `per` aperto, una funzione chiamata nell'espressione di una Scrittura, un punto di interruzione),
//   F11 fino alla fine; a ogni pausa i segni della tela (blocco corrente, fase, «↩», riga della domanda, punti) dati al
//   nucleo, e i due SVG confrontati. Si contano le pause con ogni genere di segno.
// Il `Disegno` del nucleo si rifà qui con la misura del testo del motore, in passate: le stringhe che l'impaginazione
// chiede si misurano nella pagina col canvas e col carattere del tema, come fa l'app, finché non ne manca nessuna.
//
// Controlli positivi: l'SVG del nucleo con una forma tolta, con un colore sbagliato, coi segni tolti e con un punto in più
// fa rosso il confronto.
//
// CHE COSA NON GUARDA:
// - quale elemento ha i segni: le regole sono le stesse per costruzione (`core/disegno/segni.ts`, lette da tutti e due), e
//   qui i segni del nucleo si danno da ciò che la tela mostra: si guarda che li disegni uguali;
// - il fondo colorato dei riquadri dei cicli (un'opzione dell'app): la tela lo scrive con `color-mix`, il nucleo con
//   l'opacità, e il motore li calcola in due scritture diverse; lo prova l'atteso a mano (`core/disegno/svg.test.ts`);
// - WebKit e la WebView2: qui Chromium (le beta sono solo per Windows);
// - il PNG, la stampa, i fogli: prove a sé.

import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { impagina, opzioniPredefinite, type Disegno, type MisuraDelTesto, type OpzioniDelDisegno, type StileDelTesto } from "../core/disegno/impaginazione";
import type { SegniDellEsecuzione } from "../core/disegno/segni";
import { svgDelDisegno } from "../core/disegno/svg";
import type { Tavolozza } from "../core/disegno/tavolozza";
import { geometriaPredefinita as tema } from "../core/disegno/tema";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Dato, Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { testiDelDisegno } from "../ui/disegno/testi";
import { apri, apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
// Nessuna transizione: il blocco corrente cambia colore senza sfumare, e lo stile calcolato è quello finale.
test.use({ viewport: { width: 1600, height: 1000 }, reducedMotion: "reduce" });

// ------------------------------------------------------------------------------------- il disegno con la misura del motore

/** Il `Disegno` di una funzione con la misura del testo del motore: l'impaginazione chiede le stringhe, la pagina le misura
 * col canvas e col carattere del tema (come `ui/disegno/misura.ts`), e si rifà finché non ne manca nessuna. */
async function disegnoNelMotore(page: Page, funzione: Funzione, comuni: readonly Dato[], funzioni: readonly Funzione[], opzioni: OpzioniDelDisegno = opzioniPredefinite): Promise<Disegno> {
  const note = new Map<string, number>();
  for (let passata = 0; passata < 10; passata++) {
    const mancanti = new Map<string, readonly [string, StileDelTesto | undefined]>();
    const misura: MisuraDelTesto = (t, s) => {
      const k = `${s ?? ""}|${t}`;
      const w = note.get(k);
      if (w === undefined) mancanti.set(k, [t, s]);
      return w ?? 0;
    };
    const d = impagina(funzione, tema, misura, testiDelDisegno("it"), opzioni, comuni, funzioni);
    if (mancanti.size === 0) return d;
    const larghezze = await page.evaluate(
      ({ richieste, dimensione }) => {
        const famiglia = getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim();
        const davanti: Record<string, string> = { normale: "", grassetto: "bold ", corsivo: "italic " };
        const contesto = document.createElement("canvas").getContext("2d")!;
        return richieste.map(([t, s]) => {
          contesto.font = `${davanti[s ?? "normale"]}${dimensione}px ${famiglia}`;
          return contesto.measureText(t).width;
        });
      },
      { richieste: [...mancanti.values()], dimensione: tema.carattere },
    );
    [...mancanti.keys()].forEach((k, i) => note.set(k, larghezze[i]!));
  }
  throw new Error("la misura del testo non si ferma in 10 passate");
}

/** La tavolozza dalle variabili del tema, lette sulla tela; e il carattere. */
const tavolozzaDellaTela = (page: Page, selettore: string) =>
  page.evaluate((sel) => {
    const s = getComputedStyle(document.querySelector(sel)!);
    const v = (n: string) => s.getPropertyValue(n).trim();
    const tavolozza: Tavolozza = {
      sfondo: v("--colore-sfondo"),
      testo: v("--colore-testo"),
      bordo: v("--disegno-bordo"),
      linea: v("--disegno-linea"),
      riquadro: v("--blocco-riquadro"),
      vero: v("--disegno-vero"),
      falso: v("--disegno-falso"),
      forme: {
        inizioEFine: v("--blocco-inizio-e-fine"),
        assegnazione: v("--blocco-assegnazione"),
        procedura: v("--blocco-procedura"),
        lettura: v("--blocco-lettura"),
        scrittura: v("--blocco-scrittura"),
        se: v("--blocco-se"),
        cicli: v("--blocco-cicli"),
        commento: v("--blocco-commento"),
      },
      corrente: v("--esecuzione-corrente"),
      bordoCorrente: v("--esecuzione-bordo"),
      testoCorrente: v("--esecuzione-testo"),
      punto: v("--esecuzione-punto"),
    };
    return { tavolozza, carattere: getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim() };
  }, selettore);

// ------------------------------------------------------------------------------------- il confronto nel motore

/** I due SVG descritti elemento per elemento (un testo JSON per elemento) e confrontati nei due versi: la tela (il primo
 * elemento che risponde al selettore) e l'SVG del nucleo messo nella pagina. */
async function confronta(page: Page, selettoreDellaTela: string, nucleo: string): Promise<{ elementi: number; soloTela: string[]; soloNucleo: string[] }> {
  return page.evaluate(
    ({ sel, testo }) => {
      const STILI = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline"];
      const stile = (e: Element) => {
        const s = getComputedStyle(e);
        return Object.fromEntries(STILI.map((p) => [p, s.getPropertyValue(p)]));
      };
      const attributi = (e: Element, nomi: string[]) => Object.fromEntries(nomi.map((n) => [n, e.getAttribute(n)]));
      const descrivi = (radice: Element): string[] => {
        const fuori: string[] = [];
        const tutti = (sel: string) => [...radice.querySelectorAll(sel)].filter((e) => e.closest("[data-copia]") === null);
        const r = radice as SVGSVGElement;
        fuori.push(JSON.stringify({ svg: attributi(r, ["viewBox", "width", "height"]), stile: stile(r) }));
        for (const m of tutti("marker")) fuori.push(JSON.stringify({ marker: attributi(m, ["viewBox", "refX", "refY", "markerUnits", "markerWidth", "markerHeight", "orient"]), d: m.firstElementChild?.getAttribute("d"), stile: stile(m.firstElementChild!) }));
        for (const e of tutti("[data-riquadro]")) fuori.push(JSON.stringify({ riquadro: attributi(e, ["data-riquadro", "x", "y", "width", "height"]), stile: stile(e) }));
        for (const e of tutti("[data-connettore]"))
          fuori.push(JSON.stringify({ linea: attributi(e, ["data-connettore", "points"]), punta: getComputedStyle(e).getPropertyValue("marker-end") !== "none", stile: stile(e) }));
        for (const g of tutti("g[data-forma]")) {
          const contorno = g.firstElementChild!;
          const t = g.querySelector("[data-testo]")!;
          const righe = [...t.children].map((riga) => ({
            ...attributi(riga, ["x", "y"]),
            stile: stile(riga),
            pezzi: riga.children.length === 0 ? riga.textContent : [...riga.children].map((p) => ({ testo: p.textContent, stile: stile(p), data: p.getAttribute("data-stile") })),
          }));
          fuori.push(
            JSON.stringify({
              forma: attributi(g, ["data-forma", "data-id", "data-fase", "data-ciclo", "data-valore-iniziale", "data-didascalia"]),
              contorno: { tag: contorno.tagName, ...attributi(contorno, ["x", "y", "width", "height", "rx", "ry", "points"]), stile: stile(contorno) },
              testo: { stile: stile(t), righe },
              lati: [...g.querySelectorAll("[data-lato]")].map((l) => ({ ...attributi(l, ["x1", "y1", "x2", "y2"]), stile: stile(l) })),
            }),
          );
        }
        for (const e of tutti("[data-etichetta]")) fuori.push(JSON.stringify({ etichetta: attributi(e, ["data-etichetta", "x", "y"]), testo: e.textContent, stile: stile(e) }));
        for (const e of tutti("[data-unione]")) fuori.push(JSON.stringify({ unione: attributi(e, ["cx", "cy", "r"]), stile: stile(e) }));
        for (const e of tutti("[data-interruzione]")) fuori.push(JSON.stringify({ punto: attributi(e, ["data-interruzione", "cx", "cy", "r"]), stile: stile(e) }));
        for (const e of tutti("[data-freccia]")) fuori.push(JSON.stringify({ freccia: attributi(e, ["d"]), stile: stile(e) }));
        for (const e of tutti("[data-segno-ripresa]")) fuori.push(JSON.stringify({ ripresa: attributi(e, ["x", "y"]), testo: e.textContent, stile: stile(e) }));
        for (const e of tutti("[data-riga-corrente]")) fuori.push(JSON.stringify({ riga: attributi(e, ["data-riga-corrente", "x", "y", "width", "height", "rx"]), stile: stile(e) }));
        return fuori;
      };
      const contenitore = document.createElement("div");
      contenitore.setAttribute("data-svg-del-nucleo", "");
      contenitore.innerHTML = testo;
      document.body.append(contenitore);
      try {
        const tela = descrivi(document.querySelector(sel)!);
        const nucleo = descrivi(contenitore.querySelector("svg")!);
        const togli = (da: string[], via: string[]) => {
          const resto = [...via];
          return da.filter((x) => {
            const i = resto.indexOf(x);
            if (i < 0) return true;
            resto.splice(i, 1);
            return false;
          });
        };
        return { elementi: tela.length, soloTela: togli(tela, nucleo), soloNucleo: togli(nucleo, tela) };
      } finally {
        contenitore.remove();
      }
    },
    { sel: selettoreDellaTela, testo: nucleo },
  );
}

// ------------------------------------------------------------------------------------- senza esecuzione

const radice = fileURLToPath(new URL("..", import.meta.url));
const progetto = (percorso: string) => {
  const e = apriProgetto(readFileSync(join(radice, percorso), "utf8"));
  if (!e.ok) throw new Error(`${percorso} non si apre`);
  return e.progetto;
};
const disegniDiProva = [
  ...["casi/tappa-1", "casi/tappa-2"].flatMap((c) =>
    readdirSync(join(radice, c))
      .filter((f) => f.endsWith(".algo"))
      .map((f) => ({ nome: f.slice(0, -".algo".length), funzione: progetto(`${c}/${f}`).functions[0]!, costantiComuni: [] as readonly Dato[], funzioni: [] as readonly Funzione[] })),
  ),
  ...["riferimento-media-voti-funzioni", "tre-livelli"].flatMap((n) => {
    const p = progetto(`casi/tappa-3/${n}.algo`);
    return p.functions.map((f) => ({ nome: `${n} ${f.name ?? "programma"}`, funzione: f, costantiComuni: f.kind === "main" ? (p.shared_constants ?? []) : [], funzioni: p.functions }));
  }),
];

test("senza esecuzione l'SVG del nucleo è la tela, elemento per elemento nei due versi, su ogni programma delle tappe 1 e 2 e su due progetti della tappa 3", async ({ page }, info) => {
  test.setTimeout(300_000);
  await apri(page, { lingua: "it" }, disegniDiProva);
  const tele = page.locator('svg[role="img"]');
  await expect(tele).toHaveCount(disegniDiProva.length);
  const { tavolozza, carattere } = await tavolozzaDellaTela(page, 'svg[role="img"]');
  let elementi = 0;
  const diversi: string[] = [];
  for (const [i, d] of disegniDiProva.entries()) {
    const disegno = await disegnoNelMotore(page, d.funzione, d.costantiComuni, d.funzioni);
    const nucleo = svgDelDisegno(disegno, { geometria: tema, tavolozza, carattere });
    const esito = await confronta(page, `main > :nth-child(${i + 1}) svg[role="img"]`, nucleo);
    elementi += esito.elementi;
    if (esito.soloTela.length + esito.soloNucleo.length > 0) diversi.push(`${d.nome}: solo nella tela ${esito.soloTela.length} (${esito.soloTela[0]}), solo nel nucleo ${esito.soloNucleo.length} (${esito.soloNucleo[0]})`);
  }
  console.log(`[${info.project.name}] SVG = tela senza esecuzione: ${disegniDiProva.length} flowchart, ${elementi} elementi confrontati, diversi ${diversi.length}`);
  expect(diversi).toEqual([]);
  expect(elementi).toBeGreaterThan(disegniDiProva.length * 10);

  // Controlli positivi sul riferimento della tappa 1: una forma tolta, un colore sbagliato.
  const k = disegniDiProva.findIndex((d) => d.nome === "riferimento-media-voti");
  const r = disegniDiProva[k]!;
  const disegno = await disegnoNelMotore(page, r.funzione, r.costantiComuni, r.funzioni);
  const sel = `main > :nth-child(${k + 1}) svg[role="img"]`;
  const giusto = svgDelDisegno(disegno, { geometria: tema, tavolozza, carattere });
  const senzaUnaForma = giusto.replace(/<g data-forma="condizione"[\s\S]*?<\/g>\n/, "");
  expect(senzaUnaForma.length).toBeLessThan(giusto.length);
  const tolta = await confronta(page, sel, senzaUnaForma);
  expect({ soloTela: tolta.soloTela.length, soloNucleo: tolta.soloNucleo.length }).toEqual({ soloTela: 1, soloNucleo: 0 });
  const sbagliato = await confronta(page, sel, svgDelDisegno(disegno, { geometria: tema, tavolozza: { ...tavolozza, forme: { ...tavolozza.forme, se: "#123456" } }, carattere }));
  expect(sbagliato.soloTela.length).toBeGreaterThan(0);
  expect(sbagliato.soloTela.length).toBe(sbagliato.soloNucleo.length);
});

// ------------------------------------------------------------------------------------- in esecuzione

const PERCORSO = "C:\\Documenti\\segni.algo";
/** Il programma dei segni: n col valore iniziale; la domanda e la sua Lettura; un `per` che scrive fibonacci(i). */
const PROGRAMMA = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "segni" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer", initial: "2" },
        { name: "i", type: "integer" },
      ],
      body: [
        { id: "b1", kind: "write", values: ['"Quanti? "'], newline: false },
        { id: "b2", kind: "read", target: "n" },
        { id: "b3", kind: "for", counter: "i", from: "0", to: "n - 1", body: [{ id: "b4", kind: "write", values: ["fibonacci(i)"], newline: true }] },
      ],
      end: { id: "b5" },
    },
    {
      id: "f2",
      kind: "function",
      name: "fibonacci",
      return_type: "integer",
      data: [
        { name: "n", type: "integer", parameter: "value" },
        { name: "f", type: "integer" },
      ],
      body: [{ id: "b6", kind: "if", condition: "n < 2", then: [{ id: "b7", kind: "assignment", target: "f", value: "n" }], else: [{ id: "b8", kind: "assignment", target: "f", value: "fibonacci(n - 1) + fibonacci(n - 2)" }] }],
      end: { id: "b9", return_value: "f" },
    },
  ],
});

/** I segni che la tela mostra, come li darebbe chi esegue: il blocco corrente dallo strato (un valore iniziale per nome, la
 * domanda dalla riga cerchiata), la fase dalla parte del ciclo col bordo del blocco corrente, la ripresa dal suo segno, i
 * punti dai pallini. */
const segniDellaTela = (page: Page) =>
  page.evaluate(() => {
    const svg = document.querySelector('svg[role="group"]')!;
    const c = svg.querySelector('[aria-current="step"]');
    const fase = [...svg.querySelectorAll("g[data-fase]")].find((g) => getComputedStyle(g.firstElementChild!).strokeWidth === "4px")?.getAttribute("data-fase") ?? null;
    return {
      blocco: c?.getAttribute("data-blocco") ?? c?.getAttribute("data-fine") ?? null,
      valore: c?.getAttribute("data-iniziale-di") ?? null,
      riga: svg.querySelector("[data-riga-corrente]")?.getAttribute("data-riga-corrente") ?? null,
      fase,
      ripresa: svg.querySelector("[data-segno-ripresa]") !== null,
      interruzioni: [...svg.querySelectorAll("[data-interruzione]")].map((p) => p.getAttribute("data-interruzione")!),
      funzione: svg.querySelector('[data-id="b6"]') !== null ? "f2" : "f1",
    };
  });
const stato = (page: Page) => page.locator("[data-stato-esecuzione]");
const statoEAvviso = (page: Page) => page.evaluate(() => `${document.querySelector("[data-stato-esecuzione]")?.textContent ?? ""}|${document.querySelector('output[role="status"]')?.textContent ?? ""}|${document.querySelector('[role="log"]')?.childElementCount ?? 0}`);

test("in esecuzione, a ogni pausa, l'SVG del nucleo coi segni dati è la tela: il valore iniziale, la domanda, le fasi del ciclo, la ripresa, il punto", async ({ page }, info) => {
  test.setTimeout(240_000);
  await apriVuota(page, { lingua: "it", domandaNellaLettura: true }, { argomento: PERCORSO, file: { [PERCORSO]: PROGRAMMA } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "segni.algo" }));
  const progettoDelleSegni = apriProgetto(PROGRAMMA);
  if (!progettoDelleSegni.ok) throw new Error("il programma dei segni non si apre");
  const funzioni = progettoDelleSegni.progetto.functions;
  const opzioni = { ...opzioniPredefinite, domanda: "nella-lettura" as const };
  // Il punto sulla Scrittura del ciclo.
  await page.locator('[data-blocco="b4"]').click();
  await page.keyboard.press("F9");
  await expect(page.locator('[data-interruzione="b4"]')).toHaveCount(1);
  const { tavolozza, carattere } = await tavolozzaDellaTela(page, 'svg[role="group"]');
  const disegni = new Map<string, Disegno>();
  for (const f of funzioni) disegni.set(f.id, await disegnoNelMotore(page, f, [], funzioni, opzioni));
  const conti = { pause: 0, elementi: 0, valore: 0, domanda: 0, lettura: 0, fase: 0, ripresa: 0, freccia: 0, punto: 0 };
  const diversi: string[] = [];
  let controllo: { disegno: Disegno; segni: SegniDellEsecuzione } | undefined;
  for (let passo = 0; passo < 80; passo++) {
    const prima = await statoEAvviso(page);
    await page.keyboard.press("F11");
    await expect.poll(() => statoEAvviso(page)).not.toBe(prima);
    await expect(stato(page)).not.toHaveText(it.statoInCorso);
    const testoDelloStato = (await stato(page).textContent()) ?? "";
    if (testoDelloStato === it.statoFinita) break;
    if (testoDelloStato === riempi(it.statoChiede, { dato: "n" })) {
      await page.keyboard.type("2");
      await page.keyboard.press("Enter");
      await expect(stato(page)).not.toHaveText(testoDelloStato);
      continue;
    }
    const t = await segniDellaTela(page);
    const disegno = disegni.get(t.funzione)!;
    // Con la riga 0 il passo è sulla domanda: il blocco corrente è la Scrittura che la Lettura mostra.
    const corrente = t.riga === "0" ? (disegno.elementi.find((e) => e.id === t.blocco)?.scrittura ?? t.blocco) : t.blocco;
    const segni: SegniDellEsecuzione = { corrente, correnteValore: t.valore, faseCorrente: t.fase as SegniDellEsecuzione["faseCorrente"], ripresa: t.ripresa, interruzioni: new Set(t.interruzioni) };
    const esito = await confronta(page, 'svg[role="group"]', svgDelDisegno(disegno, { geometria: tema, tavolozza, carattere, segni }));
    conti.pause++;
    conti.elementi += esito.elementi;
    if (t.valore !== null) conti.valore++;
    if (t.riga === "0") conti.domanda++;
    if (t.riga === "1") conti.lettura++;
    if (t.fase !== null) conti.fase++;
    if (t.ripresa) conti.ripresa++;
    if (!t.ripresa && (t.blocco !== null || t.valore !== null)) conti.freccia++;
    if (t.interruzioni.length > 0) conti.punto++;
    if (esito.soloTela.length + esito.soloNucleo.length > 0) diversi.push(`pausa ${conti.pause} (${testoDelloStato}): solo nella tela ${esito.soloTela.length} (${esito.soloTela[0]}), solo nel nucleo ${esito.soloNucleo.length} (${esito.soloNucleo[0]})`);
    if (t.fase !== null && t.interruzioni.length > 0 && controllo === undefined) controllo = { disegno, segni };
  }
  console.log(`[${info.project.name}] SVG = tela in esecuzione: ${JSON.stringify(conti)}, diversi ${diversi.length}`);
  expect(diversi).toEqual([]);
  // Le premesse: ogni genere di segno è stato confrontato almeno una volta.
  for (const genere of ["valore", "domanda", "lettura", "fase", "ripresa", "freccia", "punto"] as const) expect({ genere, n: conti[genere] > 0 }).toEqual({ genere, n: true });

  // Controlli positivi su una pausa del ciclo col punto: i segni tolti, un punto in più.
  expect(controllo).toBeDefined();
  const { disegno, segni } = controllo!;
  // A esecuzione finita la tela non ha il blocco corrente, e il punto resta (si toglie con F9): il confronto coi soli punti.
  const fermo = await segniDellaTela(page);
  expect({ blocco: fermo.blocco, funzione: fermo.funzione, interruzioni: fermo.interruzioni }).toEqual({ blocco: null, funzione: "f1", interruzioni: ["b4"] });
  const coiPunti = { interruzioni: new Set(fermo.interruzioni) };
  const fine = await confronta(page, 'svg[role="group"]', svgDelDisegno(disegni.get("f1")!, { geometria: tema, tavolozza, carattere, segni: coiPunti }));
  expect({ soloTela: fine.soloTela, soloNucleo: fine.soloNucleo }).toEqual({ soloTela: [], soloNucleo: [] });
  // Senza segni il nucleo non disegna nessun punto (l'immagine senza esecuzione è il flowchart pulito): la tela ne ha uno.
  const senzaSegni = await confronta(page, 'svg[role="group"]', svgDelDisegno(disegni.get("f1")!, { geometria: tema, tavolozza, carattere }));
  expect(senzaSegni.soloTela.some((x) => x.includes('"data-interruzione":"b4"'))).toBe(true);
  expect(senzaSegni.soloNucleo.some((x) => x.includes("data-interruzione"))).toBe(false);
  // I segni di una pausa del ciclo, sulla tela ferma: in più nel nucleo.
  const conSegni = await confronta(page, 'svg[role="group"]', svgDelDisegno(disegno, { geometria: tema, tavolozza, carattere, segni }));
  expect(conSegni.soloNucleo.length).toBeGreaterThan(0);
  const unPuntoInPiu = await confronta(page, 'svg[role="group"]', svgDelDisegno(disegni.get("f1")!, { geometria: tema, tavolozza, carattere, segni: { interruzioni: new Set(["b4", "b2"]) } }));
  expect(unPuntoInPiu.soloNucleo.some((x) => x.includes('"data-interruzione":"b2"'))).toBe(true);
});
