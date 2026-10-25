// Il flowchart nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build).
//
// Il testo nei motori: la misura del testo delle prove del nucleo è un'ipotesi, quella del motore è il fatto. Ogni testo,
// misurato nel motore con `getBBox`, sta dentro la SUA forma disegnata (rombo, parallelogramma, ovale:
// letta dagli attributi dell'SVG, non dal rettangolo che la contiene), e forme ed etichette non si toccano.
// Sul riferimento, sui casi delle tappe 1 e 2 del corpus e su alberi generati a seme fisso coi cicli (i primi 40 delle
// prove del nucleo: ogni genere delle tappe 1 e 2 e la profondità piena, asseriti), in italiano e in inglese,
// nelle due forme delle condizioni lunghe (con «Su due righe» qualche condizione va a capo, con «Su una
// riga» nessuna: asserito), e i cicli in una forma per combinazione (le tre forme dei cicli girano sulle quattro
// combinazioni: l'intestazione del riquadro e i blocchi che aggiunge sono forme col loro testo), e la Lettura con la
// domanda accesa in una combinazione per lingua (la Lettura su due righe è una forma col suo testo). Controllo positivo:
// un CSS iniettato che ingrandisce il carattere fa rosso.
//
// Lingua e leggibilità: gli operatori a parola nella lingua dell'interfaccia, letterali e nomi intatti; il contrasto del
// testo sulla sua superficie almeno 4,5:1 e quello di linee e bordi sullo sfondo almeno 3:1, in chiaro e in
// scuro, per ognuno dei tre insiemi di colori delle Impostazioni, anche dentro i riquadri dei cicli col fondo colorato
// (il fondo composto dal motore); il carattere almeno 14 px al 100%. Ognuno col suo controllo positivo.
//
// CHE COSA NON GUARDA:
// - la WebView vera (WebView2, WebKitGTK): qui i motori di Playwright, col carattere di sistema di questa
//   macchina; un carattere diverso su un'altra macchina cambia la misura, che resta dello stesso motore;
// - se un connettore attraversa una forma nel motore (i numeri sono quelli del nucleo, provati lì);
// - il contrasto di testi che non sono del flowchart (barra, intestazione);
// - le etichette Vero e Falso contro la loro forma: sono fuori dalla forma per costruzione, e la prova
//   guarda che non tocchino nessuna forma né altra etichetta;
// - il testo nelle forme a una scala diversa da 1 (lo zoom, «Adatta alla finestra»): qui i flowchart sono
//   al 100%;
// - un grassetto misurato più stretto di quanto il motore lo disegna, fuori dal salto: lo vede solo la luce del testo
//   del salto (rossa col grassetto misurato come il normale); nell'intestazione, in «Restituisce» e nei rombi il testo
//   resta dentro la forma per la luce e per la curva, e quella misura sbagliata passerebbe;
// - gli schermi a 125% e 150% (i fattori di scala più comuni su Windows): i profili dei motori
//   (`playwright.config.ts`) girano Chromium a 1 pixel del dispositivo per pixel CSS e WebKit a 2, letti dai
//   profili «Desktop Chrome» e «Desktop Safari» di Playwright.

import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { alberoGenerato, progettoGenerato, PROFONDITA } from "../core/disegno/alberi-di-prova";
import type { CondizioniLunghe, FormaDellaCopia, FormaDelPer, FormaDelPerOgni } from "../core/disegno/impaginazione";
import { geometriaPredefinita } from "../core/disegno/tema";
import { voci } from "../ui/preferenze";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Blocco, Funzione } from "../core/progetto/modello";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { contrasto, coppie, coppieSulFondo, sotto } from "./contrasto";
import { aggiungiStile, apri, apriEsempio, apriVuota, costruisciFinzione, scegliLingua } from "./pagina";

test.beforeAll(costruisciFinzione);

// ------------------------------------------------------------------------------------- gli ingressi

const corpus = ["tappa-1", "tappa-2"].flatMap((tappa) => {
  const cartella = fileURLToPath(new URL(`../casi/${tappa}`, import.meta.url));
  return readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((f) => {
      const esito = apriProgetto(readFileSync(join(cartella, f), "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      return { nome: f.slice(0, -".algo".length), funzione: esito.progetto.functions[0]! };
    });
});
/** Ogni funzione di ogni progetto delle tappe 3 e 4, con le funzioni del suo progetto (i salti, i nomi nelle espressioni;
 * nella tappa 4 la ricorsione, e la chiamata dentro 49 «se»). */
const corpusTappa3 = ["tappa-3", "tappa-4"]
  .flatMap((tappa) => {
    const cartella = fileURLToPath(new URL(`../casi/${tappa}`, import.meta.url));
    return readdirSync(cartella)
      .filter((f) => f.endsWith(".algo"))
      .map((f) => join(cartella, f));
  })
  .flatMap((percorso) => {
    const f = percorso.slice(percorso.replaceAll("\\", "/").lastIndexOf("/") + 1);
    const esito = apriProgetto(readFileSync(percorso, "utf8"));
    if (!esito.ok) throw new Error(`${f} non si apre`);
    return esito.progetto.functions.map((x) => ({ nome: `${f.slice(0, -".algo".length)}#${x.name ?? "principale"}`, funzione: x, funzioni: esito.progetto.functions }));
  });
const NUMERO_GENERATI = 40;
const generati = Array.from({ length: NUMERO_GENERATI }, (_, i) => ({ nome: `generato-${i + 1}`, funzione: alberoGenerato(1000 + i, true) }));
/** I primi 15 progetti generati coi salti delle prove del nucleo: ogni loro funzione (nomi anche lunghi in grassetto). */
const coiSalti = Array.from({ length: 15 }, (_, i) => progettoGenerato(7000 + i)).flatMap((fs, i) => fs.map((x) => ({ nome: `progetto-${i + 1}#${x.name ?? "principale"}`, funzione: x, funzioni: fs })));
const tuttiGliAlberi = [...corpus, ...corpusTappa3, ...generati, ...coiSalti];

// ------------------------------------------------------------------------- che cosa si legge dal motore

interface Riquadro {
  x: number;
  y: number;
  larghezza: number;
  altezza: number;
}
interface FormaLetta {
  id: string;
  forma: string;
  contorno: Riquadro;
  /** I vertici del poligono; assenti per inizio e fine, che sono un rettangolo con le estremità tonde. */
  vertici: { x: number; y: number }[] | null;
  testo: Riquadro;
  caratteri: number;
  /** Le righe del testo (i `tspan`): più di una solo per una condizione che va a capo. */
  righe: number;
  /** Le ascisse delle due righe ai lati del blocco della chiamata (nessuna per le altre forme). */
  lati: number[];
}
interface FlowchartLetto {
  nome: string;
  forme: FormaLetta[];
  etichette: (Riquadro & { nome: string })[];
}

/** Ogni flowchart della pagina: forme, testi ed etichette, con `getBBox` del motore. */
function leggi(page: Page): Promise<FlowchartLetto[]> {
  return page.evaluate(() => {
    const riquadro = (e: SVGGraphicsElement) => {
      const b = e.getBBox();
      return { x: b.x, y: b.y, larghezza: b.width, altezza: b.height };
    };
    return [...document.querySelectorAll<SVGSVGElement>('svg[role="img"]')].map((svg) => ({
      nome: svg.getAttribute("aria-label") ?? "",
      forme: [...svg.querySelectorAll<SVGGElement>("g[data-forma]")].map((g) => {
        const contorno = g.firstElementChild as SVGGraphicsElement;
        const testo = g.querySelector("text")!;
        const punti = contorno.tagName === "polygon" ? contorno.getAttribute("points")! : null;
        return {
          id: g.dataset.id ?? "",
          forma: g.dataset.forma ?? "",
          contorno: riquadro(contorno),
          vertici: punti === null ? null : punti.trim().split(/\s+/).map((p) => ({ x: Number(p.split(",")[0]), y: Number(p.split(",")[1]) })),
          testo: riquadro(testo),
          caratteri: (testo.textContent ?? "").length,
          righe: Math.max(1, testo.querySelectorAll(":scope > tspan").length),
          lati: [...g.querySelectorAll("line[data-lato]")].map((l) => Number(l.getAttribute("x1"))).sort((a, b) => a - b),
        };
      }),
      etichette: [...svg.querySelectorAll<SVGTextElement>("text[data-etichetta]")].map((t, i) => ({ nome: `etichetta ${i} ${t.dataset.etichetta}`, ...riquadro(t) })),
    }));
  });
}

// --------------------------------------------------------------------------------- i rilevatori del testo

const EPS = 0.5;
/** Quanto la distanza fra il testo del salto e le righe ai lati può scostarsi dal margine: i bordi dei caratteri (misurato
 * in Chromium sul riferimento: 11,1 e 12,0 px contro 12). */
const TOLLERANZA_DEL_MARGINE = 2;

const angoli = (r: Riquadro) => [r.x, r.x + r.larghezza].flatMap((x) => [r.y, r.y + r.altezza].map((y) => ({ x, y })));

/** Dentro la forma disegnata: un poligono convesso in senso orario (y verso il basso), o il rettangolo con
 * le estremità a semicerchio. */
function dentro(f: FormaLetta, p: { x: number; y: number }): boolean {
  if (f.vertici === null) {
    const r = f.contorno;
    const raggio = r.altezza / 2;
    const cx = Math.min(Math.max(p.x, r.x + raggio), r.x + r.larghezza - raggio);
    return (p.x - cx) ** 2 + (p.y - (r.y + raggio)) ** 2 <= (raggio + EPS) ** 2;
  }
  const v = f.vertici;
  return v.every((a, i) => {
    const b = v[(i + 1) % v.length]!;
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -EPS;
  });
}

const sovrapposti = (a: Riquadro, b: Riquadro) =>
  a.x < b.x + b.larghezza - EPS && b.x < a.x + a.larghezza - EPS && a.y < b.y + b.altezza - EPS && b.y < a.y + a.altezza - EPS;

function esamina(flowcharts: FlowchartLetto[]) {
  const difetti: string[] = [];
  let [forme, testi, coppie] = [0, 0, 0];
  for (const fc of flowcharts) {
    for (const f of fc.forme) {
      forme++;
      if (f.caratteri === 0) continue;
      testi++;
      // Un testo che il motore non disegna (larghezza zero) starebbe «dentro» per niente.
      if (f.testo.larghezza <= 0 || f.testo.altezza <= 0) difetti.push(`${fc.nome}: testo non disegnato in ${f.id}`);
      else if (!angoli(f.testo).every((p) => dentro(f, p))) difetti.push(`${fc.nome}: testo fuori dalla forma ${f.id} (${f.forma}): contorno ${JSON.stringify(f.contorno)}, testo ${JSON.stringify(f.testo)}`);
      // Il salto: il testo, misurato dal motore, dista dalle due righe ai lati almeno il margine del tema (meno la
      // tolleranza dei bordi dei caratteri): un grassetto misurato come normale lo avvicinerebbe alle righe. Più lontano
      // si può: l'SVG riduce due spazi a uno (gli alberi generati ne hanno), e il testo esce più stretto del misurato.
      if (f.forma === "chiamata") {
        const [sinistra, destra] = f.lati;
        const luci = sinistra === undefined || destra === undefined ? [] : [f.testo.x - sinistra, destra - (f.testo.x + f.testo.larghezza)];
        if (luci.length !== 2 || luci.some((l) => l < geometriaPredefinita.margineTestoX - TOLLERANZA_DEL_MARGINE))
          difetti.push(`${fc.nome}: testo del salto non al margine dalle righe ai lati ${f.id}: ${luci.map((l) => l.toFixed(1)).join(" e ")}`);
      }
    }
    const tutti = [...fc.forme.map((f) => ({ nome: f.id, r: f.contorno })), ...fc.etichette.map((e) => ({ nome: e.nome, r: e }))];
    tutti.forEach((a, i) =>
      tutti.slice(i + 1).forEach((b) => {
        coppie++;
        if (sovrapposti(a.r, b.r)) difetti.push(`${fc.nome}: si toccano ${a.nome} e ${b.nome}`);
      }),
    );
  }
  return { difetti, premesse: { flowchart: flowcharts.length, forme, testi, coppie } };
}

// ------------------------------------------------------------------------------------------- il testo dentro le forme

test("i 40 alberi generati coprono ogni genere delle tappe 1 e 2 e la profondità piena", () => {
  const generi = new Set<string>();
  let profonditaMassima = 0;
  const visita = (blocchi: readonly Blocco[], p: number) => {
    for (const b of blocchi) {
      generi.add(b.kind);
      profonditaMassima = Math.max(profonditaMassima, p);
      if (b.kind === "if") visita(b.then, p + 1), visita(b.else, p + 1);
      if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") visita(b.body, p + 1);
    }
  };
  generati.forEach((g) => visita(g.funzione.body, 0));
  expect([...generi].sort()).toEqual(["assignment", "comment", "for", "for_each", "if", "read", "repeat", "while", "write"]);
  expect(profonditaMassima).toBe(PROFONDITA);
});

// Le combinazioni guardate: ogni lingua per ogni forma delle condizioni lunghe (4), con le tre forme dei cicli a giro e
// le due della copia di un vettore col suo nome; la Lettura con la domanda (su due righe, la domanda sopra) accesa in una
// combinazione per lingua, con l'altra forma delle condizioni.
const formeDeiCicli = [
  { cicliPer: "aperto", cicliPerOgni: "posizione", copiaDeiVettori: "espansa" },
  { cicliPer: "chiuso", cicliPerOgni: "parole", copiaDeiVettori: "compatta" },
  { cicliPer: "aperto", cicliPerOgni: "chiuso", copiaDeiVettori: "espansa" },
] as const satisfies readonly { cicliPer: FormaDelPer; cicliPerOgni: FormaDelPerOgni; copiaDeiVettori: FormaDellaCopia }[];
const combinazioni = (["it", "en"] as const)
  .flatMap((lingua) => (["su-due-righe", "su-una-riga"] as const satisfies readonly CondizioniLunghe[]).map((condizioni) => ({ lingua, condizioni })))
  .map((c, i) => ({ ...c, ...formeDeiCicli[i % formeDeiCicli.length]!, domandaNellaLettura: i === 1 || i === 2 }));

for (const { lingua, condizioni, cicliPer, cicliPerOgni, copiaDeiVettori, domandaNellaLettura } of combinazioni) {
  test(`ogni testo, misurato nel motore, sta dentro la sua forma; forme ed etichette non si toccano (${lingua}, ${condizioni}, per ${cicliPer}, per ogni ${cicliPerOgni}, copia ${copiaDeiVettori}${domandaNellaLettura ? ", domanda nella lettura" : ""})`, async ({ page }, info) => {
    await apri(page, { lingua, condizioni, cicliPer, cicliPerOgni, copiaDeiVettori, domandaNellaLettura }, tuttiGliAlberi);
    await expect(page.getByRole("img")).toHaveCount(tuttiGliAlberi.length);
    const letti = await leggi(page);
    const { difetti, premesse } = esamina(letti);
    const aCapo = letti.flatMap((f) => f.forme).filter((f) => f.forma === "condizione" && f.righe > 1).length;
    const intestazioni = letti.flatMap((f) => f.forme).filter((f) => f.forma === "intestazione").length;
    const conLaDomanda = letti.flatMap((f) => f.forme).filter((f) => f.forma === "lettura" && f.righe === 2).length;
    const [riquadri, aggiunti, scritte] = [await page.locator("[data-riquadro]").count(), await page.locator("g[data-fase]").count(), await page.locator("g[data-didascalia]").count()];
    const [salti, lati, grassetti, corsivi] = [
      await page.locator('g[data-forma="chiamata"]').count(),
      await page.locator("line[data-lato]").count(),
      await page.locator('[data-stile="grassetto"]').count(),
      await page.locator('[data-stile="corsivo"]').count(),
    ];
    console.log(
      `[${info.project.name}] testo nelle forme (${lingua}, ${condizioni}, per ${cicliPer}, per ogni ${cicliPerOgni}, copia ${copiaDeiVettori}; combinazione ${combinazioni.findIndex((c) => c.lingua === lingua && c.condizioni === condizioni) + 1} di ${combinazioni.length}): ` +
        `flowchart ${premesse.flowchart} (corpus ${corpus.length}, generati ${generati.length}), forme ${premesse.forme}, ` +
        `testi ${premesse.testi}, coppie ${premesse.coppie}, condizioni a capo ${aCapo}, letture con la domanda ${conLaDomanda}, riquadri ${riquadri}, intestazioni ${intestazioni}, scritte della copia ${scritte}, blocchi aggiunti ${aggiunti}, ` +
        `funzioni delle tappe 3 e 4 ${corpusTappa3.length}, dei progetti coi salti ${coiSalti.length}, salti ${salti}, righe ai lati ${lati}, pezzi in grassetto ${grassetti}, in corsivo ${corsivi}; difetti ${difetti.length}`,
    );
    expect(difetti.slice(0, 10)).toEqual([]);
    // Le premesse: tutti gli alberi disegnati, il riferimento fra loro, ogni forma con un testo da guardare,
    // e la lingua e la forma delle condizioni davvero applicate.
    expect(combinazioni.length).toBe(4);
    await expect(page.locator("html")).toHaveAttribute("lang", lingua);
    expect(premesse.flowchart).toBe(tuttiGliAlberi.length);
    expect(corpus.length).toBe(71);
    expect([corpusTappa3.length, coiSalti.length]).toEqual([181, 45]);
    // Le forme di procedure e funzioni: due righe ai lati per salto, i nomi in grassetto, *rif* e i tipi in corsivo.
    expect(salti).toBeGreaterThan(30);
    expect(lati).toBe(2 * salti);
    expect(grassetti).toBeGreaterThan(salti);
    expect(corsivi).toBeGreaterThan(0);
    // I cicli nei loro riquadri, con l'intestazione; i blocchi aggiunti ci sono in ogni combinazione (almeno un ciclo
    // aperto), e le intestazioni sono forme col testo come le altre.
    expect(riquadri).toBeGreaterThan(40);
    expect(intestazioni).toBe(riquadri);
    // La copia col nome (due blocchi nel corpus della tappa 3): compatta, la scritta sul bordo è una forma col testo e non
    // un blocco; espansa, l'intestazione è il blocco.
    expect(scritte).toBe(copiaDeiVettori === "compatta" ? 2 : 0);
    expect(aggiunti).toBeGreaterThan(0);
    expect(letti.some((f) => f.nome.endsWith("riferimento-media-voti"))).toBe(true);
    expect(premesse.testi).toBe(premesse.forme);
    if (condizioni === "su-due-righe") expect(aCapo).toBeGreaterThan(0);
    else expect(aCapo).toBe(0);
    // La Lettura con la domanda su due righe, solo con l'opzione accesa: le tre del file del corpus che le ha, undici in
    // tutto (misurato: anche altri alberi hanno una Scrittura subito prima di una Lettura).
    expect(combinazioni.filter((c) => c.domandaNellaLettura).map((c) => c.lingua)).toEqual(["it", "en"]);
    const nelFile = letti.find((f) => f.nome.endsWith("domanda-prima-della-lettura"))!.forme.filter((f) => f.forma === "lettura" && f.righe === 2).length;
    expect([nelFile, conLaDomanda]).toEqual(domandaNellaLettura ? [3, 11] : [0, 0]);

    // Controllo positivo del testo con uno stile: i soli pezzi in grassetto allargati (come un grassetto misurato come
    // normale) escono dalla forma, e la prova lo vede su forme che hanno un grassetto.
    await aggiungiStile(page, '[data-stile="grassetto"] { letter-spacing: 4px !important; }');
    const allargati = esamina(await leggi(page));
    const conGrassetto = new Set((await leggi(page)).flatMap((f) => f.forme.filter((x) => x.forma === "chiamata" || x.forma === "inizio").map((x) => x.id)));
    console.log(`[${info.project.name}] testo nelle forme, controllo positivo (grassetto allargato): difetti ${allargati.difetti.length}`);
    expect(allargati.difetti.filter((d) => d.includes("testo fuori dalla forma") && [...conGrassetto].some((id) => d.includes(`forma ${id} (`))).length).toBeGreaterThan(0);
    await aggiungiStile(page, '[data-stile="grassetto"] { letter-spacing: normal !important; }');

    // Controllo positivo: il carattere ingrandito da un CSS iniettato esce dalle forme, e la prova lo vede.
    await aggiungiStile(page, 'svg[role="img"] text { font-size: 30px !important; }');
    const ingranditi = esamina(await leggi(page));
    console.log(`[${info.project.name}] testo nelle forme, controllo positivo (carattere a 30 px): difetti ${ingranditi.difetti.length}`);
    expect(ingranditi.difetti.filter((d) => d.includes("testo fuori dalla forma")).length).toBeGreaterThan(0);
  });
}

// ------------------------------------------------------------------------------------- la lingua

const conOperatori: Funzione = {
  id: "f1",
  kind: "main",
  data: [],
  body: [
    { id: "b1", kind: "assignment", target: "to_integer_n", value: 'to_integer x + length("to_integer")' },
    { id: "b2", kind: "write", values: ['"to_integer"', "to_string to_integer_n"], newline: true },
    { id: "b3", kind: "if", condition: "to_integer_n > pi", then: [], else: [] },
  ],
  end: { id: "b4" },
};

const attesi = {
  it: [
    `to_integer_n ← converti_a_intero x + lunghezza("to_integer")`,
    `${it.disegnoScrivi} "to_integer", converti_a_stringa to_integer_n${it.disegnoACapo}`,
    "to_integer_n > pi_greco",
  ],
  en: [`to_integer_n ← to_integer x + length("to_integer")`, `${en.disegnoScrivi} "to_integer", to_string to_integer_n${en.disegnoACapo}`, "to_integer_n > pi"],
};

/** I testi attesi che il flowchart non mostra. */
const mancanti = (mostrati: readonly string[], voluti: readonly string[]) => voluti.filter((v) => !mostrati.includes(v));

async function testiDelFlowchart(page: Page): Promise<string[]> {
  return page.locator('svg[role="img"] g[data-forma] text').evaluateAll((ts) => ts.map((t) => [...t.querySelectorAll("tspan")].map((s) => s.textContent).join(" ")));
}

test("gli operatori a parola nella lingua dell'interfaccia, letterali e nomi intatti", async ({ page }) => {
  await apri(page, { lingua: "it" }, [{ nome: "operatori", funzione: conOperatori }]);
  await expect(page.getByRole("img", { name: `${it.flowchart}: operatori`, exact: true })).toBeVisible();
  const italiani = await testiDelFlowchart(page);
  expect(mancanti(italiani, attesi.it)).toEqual([]);
  expect(italiani).toContain(it.disegnoInizio);

  await scegliLingua(page, "en");
  await expect(page.getByRole("img", { name: `${en.flowchart}: operatori`, exact: true })).toBeVisible();
  const inglesi = await testiDelFlowchart(page);
  expect(mancanti(inglesi, attesi.en)).toEqual([]);
  expect(inglesi).toContain(en.disegnoInizio);

  // Controllo positivo: una traduzione per sostituzione sul testo (dentro il letterale e dentro il nome)
  // è vista dal rilevatore.
  const sostituiti = attesi.en.map((t) => t.replaceAll("to_integer", "converti_a_intero").replaceAll(en.disegnoScrivi, it.disegnoScrivi));
  expect(mancanti(sostituiti, attesi.it).length).toBeGreaterThan(0);
});

// ----------------------------------------------------------------------------- contrasto e carattere


// I tre insiemi di colori delle Impostazioni, ognuno in chiaro e in scuro: sei misure, una pagina ciascuna (gli
// stili iniettati dal controllo positivo restano sulla pagina).
test("contrasto dei colori del tema in chiaro e in scuro, per ognuno dei tre insiemi", async ({ context }, info) => {
  const sfondi = new Set<string>();
  const condizioni = new Set<string>();
  let misure = 0;
  for (const colori of voci.colori)
    for (const schema of ["light", "dark"] as const) {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: schema });
      await apri(page, { lingua: "it", colori });
      await expect(page.getByRole("group", { name: `${it.flowchart}: riferimento-media-voti`, exact: true })).toBeVisible();
      // La premessa: l'insieme chiesto è quello applicato.
      expect(await page.evaluate(() => document.documentElement.dataset.colori)).toBe(colori);
      const cs = await coppie(page);
      const minimo = Math.min(...cs.filter((c) => c.minimo === 4.5).map((c) => contrasto(c.primo, c.secondo)));
      console.log(`[${info.project.name}] contrasto ${colori} ${schema}: coppie ${cs.length}, il testo più basso ${minimo.toFixed(2)}:1, sotto la soglia ${sotto(cs).length}`);
      expect(sotto(cs), `${colori} ${schema}`).toEqual([]);
      // Le premesse: ogni specie di superficie e le due etichette.
      for (const cosa of ["testo su condizione", "testo su lettura", "testo su scrittura", "testo su commento", "testo su assegnazione", "testo su inizio", "etichetta vero", "etichetta falso", "punto di inserimento"])
        expect(cs.some((c) => c.cosa === cosa)).toBe(true);
      sfondi.add(cs.find((c) => c.cosa === "etichetta vero")!.secondo);
      condizioni.add(`${schema} ${cs.find((c) => c.cosa === "testo su condizione")!.secondo}`);

      // Controllo positivo: un colore a basso contrasto (l'etichetta Vero col colore dello sfondo).
      await aggiungiStile(page, '[data-etichetta="vero"] { fill: var(--colore-sfondo) !important; }');
      expect(sotto(await coppie(page)).some((s) => s.startsWith("etichetta vero"))).toBe(true);
      misure++;
      await page.close();
    }
  expect(misure).toBe(6);
  // Il tema scuro è stato davvero applicato (due sfondi), e i tre insiemi danno tre colori diversi al rombo
  // in ogni schema: altrimenti le misure sarebbero le stesse.
  expect(sfondi.size).toBe(2);
  expect(condizioni.size).toBe(6);
});

test("col fondo colorato dei cicli, etichette, bordi e linee dentro un riquadro hanno il contrasto anche sul fondo, un velo solo coi cicli annidati, in chiaro e in scuro, per ognuno dei tre insiemi", async ({ context }, info) => {
  // Un ciclo dentro un altro: le etichette del rombo interno stanno in due riquadri.
  const testo = readFileSync(fileURLToPath(new URL("../casi/tappa-2/per-annidati.algo", import.meta.url)), "utf8");
  let misure = 0;
  for (const colori of voci.colori)
    for (const schema of ["light", "dark"] as const) {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: schema });
      await apriVuota(page, { lingua: "it", colori, fondoDeiCicli: true }, { esempi: { "1 cicli.algo": testo } });
      await apriEsempio(page, 0);
      await expect(page.locator("rect[data-riquadro]").first()).toBeVisible();
      const cs = await coppieSulFondo(page);
      const etichette = cs.filter((c) => c.cosa.startsWith("etichetta"));
      const minimo = Math.min(...etichette.map((c) => contrasto(c.primo, c.secondo)));
      console.log(`[${info.project.name}] contrasto sul fondo dei cicli ${colori} ${schema}: coppie ${cs.length} (etichette ${etichette.length}), l'etichetta più bassa ${minimo.toFixed(2)}:1, sotto la soglia ${sotto(cs).length}`);
      expect(sotto(cs), `${colori} ${schema}`).toEqual([]);
      // Le premesse: dentro i riquadri ci sono etichette, bordi e linee; alcune etichette stanno in due riquadri, con un
      // velo solo.
      expect(etichette.length).toBeGreaterThan(0);
      expect(cs.some((c) => c.cosa.startsWith("bordo")) && cs.some((c) => c.cosa.startsWith("linea"))).toBe(true);
      expect(etichette.some((c) => c.cosa.endsWith("(in 2 riquadri, 1 veli)"))).toBe(true);
      // Controllo positivo: il velo del colore delle etichette Vero le porta sotto la soglia.
      await aggiungiStile(page, 'rect[data-riquadro] { fill: var(--disegno-vero) !important; }');
      expect(sotto(await coppieSulFondo(page)).some((s) => s.startsWith("etichetta vero"))).toBe(true);
      misure++;
      await page.close();
    }
  expect(misure).toBe(6);
});

test("al 100% il carattere del flowchart è di almeno 14 px; lo zoom lo cambia", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  const flowchart = page.getByRole("group", { name: `${it.flowchart}: riferimento-media-voti`, exact: true });
  await expect(flowchart).toBeVisible();
  const zoom = page.getByRole("group", { name: it.zoom, exact: true });
  /** Il carattere più piccolo dei testi del flowchart, in pixel dello schermo. */
  const carattereMinimo = () =>
    flowchart.evaluate((svg: SVGSVGElement) => {
      const scala = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return Math.min(...[...svg.querySelectorAll("text")].map((t) => parseFloat(getComputedStyle(t).fontSize) * scala));
    });

  await zoom.locator('[data-comando="cento"]').click();
  await expect(zoom.locator('[data-comando="cento"]')).toHaveText("100%");
  const cento = await carattereMinimo();
  expect(cento).toBeGreaterThanOrEqual(14);

  await zoom.getByRole("button", { name: it.zoomIngrandisci, exact: true }).click();
  await expect(zoom.locator('[data-comando="cento"]')).toHaveText("125%");
  await zoom.getByRole("button", { name: it.zoomRiduci, exact: true }).click();
  await expect(zoom.locator('[data-comando="cento"]')).toHaveText("100%");

  // Controllo positivo: con «Adatta alla finestra» il riferimento si rimpicciolisce e scende sotto i 14 px.
  await zoom.getByRole("button", { name: it.zoomAdatta, exact: true }).click();
  await expect(zoom.locator('[data-comando="cento"]')).not.toHaveText("100%");
  const adattato = await carattereMinimo();
  console.log(`[${info.project.name}] carattere: al 100% ${cento.toFixed(2)} px; adattato a ${page.viewportSize()?.width}×${page.viewportSize()?.height} ${adattato.toFixed(2)} px`);
  expect(adattato).toBeLessThan(14);
});
