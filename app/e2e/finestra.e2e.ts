// La finestra a due viste nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build).
//
// Una pagina: in 1920 × 1080, con le due viste aperte, «Adatta alla finestra» mostra tutto il riferimento
// nell'area vera del flowchart, e il carattere più piccolo, misurato nel motore alla scala resa, è di
// almeno 6 px (erano 7 con le linee fra i blocchi di 28 px; a 36, per la luce intorno ai punti di
// inserimento, la soglia è scesa a 6); in italiano e in inglese (la barra e la tabella hanno larghezze diverse), nelle due forme
// delle condizioni lunghe. Coi valori iniziali NASCOSTI dalle Impostazioni (mostrati, i cinque
// blocchi sotto «Inizio» allungano il riferimento; quella misura si scrive, senza soglia). Controllo positivo: un
// esempio col corpo del riferimento raddoppiato va sotto. Il riferimento della tappa 2 (coi `per`), aperto nella
// finestra: coi `per` chiusi la stessa soglia, coi `per` aperti la misura si scrive.
//
// Due viste: la vista dei dati e quella del flowchart si trovano per ruolo e nome, affiancate, in italiano
// e in inglese; il pannello dei dati si chiude e si riapre dalla barra, e il bordo lo allarga col puntatore
// e con la tastiera. Controllo positivo: una vista senza nome non si trova.
//
// La lingua del documento è quella giusta già al primo render. Controllo positivo: il rilevatore legge
// `it` (quella di `index.html`) quando il parser inserisce la radice, cioè vede una lingua diversa quando c'è.
//
// La politica di sicurezza dei contenuti: l'anteprima del build manda quella della configurazione di Tauri, e la
// finestra al lavoro (le Impostazioni, il codice nei tre linguaggi, un'azione eseguita) non la viola.
// Controllo positivo: uno stile scritto nella pagina viola la politica, e la pagina lo annota. Il server di sviluppo non
// manda politiche (la prova lo dice), quindi lì lo zero non prova nulla.
//
// CHE COSA NON GUARDA:
// - la politica nel prodotto, dove la applica Tauri: la prova sul prodotto (`strumenti/prova-portabile.ts`);
// - la WebView vera, né una finestra di 1920 × 1080 sullo schermo (qui è l'area della pagina: la finestra
//   vera ha anche la cornice, quindi un'area un po' più bassa);
// - gli esempi diversi dal riferimento contro la soglia (sono più piccoli: il riferimento è il caso peggiore
//   per costruzione), né «Adatta» con il pannello allargato dall'utente;
// - l'appaiamento dei dati col modello (`dati.e2e.ts`) e il testo nelle forme (`disegno.e2e.ts`), nemmeno
//   alla scala di «Adatta»: lì il testo nelle forme si prova al 100%;
// - le finestre più piccole (l'app si apre ingrandita, e non scende sotto 960 × 600): lì «Adatta» porta il
//   carattere sotto i 6 px e si ferma alla scala minima (5 px), e la soglia vale solo a 1920 × 1080;
// - la scala minima si vede col corpo raddoppiato (il controllo positivo): il carattere a 5 px e il disegno
//   che non sta tutto nell'area; le etichette a quella scala le guarda `editor.e2e.ts`;
// - il carattere di sistema: la misura del motore segue il carattere di questa macchina, e il margine sulla
//   soglia è piccolo (6,17 px contro 6 in Chromium coi valori iniziali nascosti, misurato su Windows con la barra in
//   una riga da 38 px, il testo sotto l'icona; era 6,19 prima, 6,07 con la barra su due righe da 61 px); con un
//   carattere più largo il riferimento si allunga e il margine si consuma; coi valori mostrati 5,43 px;
// - la differenza fra le due forme delle condizioni sul riferimento: con la misura vera la sua condizione
//   sta su una riga, quindi le due forme danno lo stesso disegno e la prova non le distingue.

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { fileDa, scelteIniziali } from "../ui/preferenze";
import { politicaDelProdotto } from "../strumenti/politica";
import { apri, costruisciFinzione, scegliLingua, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const SOGLIA = 6;
/** Il carattere alla scala minima di «Adatta» e «Riduci» (sotto, le etichette toccavano le forme). */
const SCALA_MINIMA_IN_PX = 5;
const RIFERIMENTO = "riferimento-media-voti";

const riferimento: Funzione = (() => {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${RIFERIMENTO}.algo`, import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error("il riferimento non si apre");
  return esito.progetto.functions[0]!;
})();

/** Il riferimento col corpo ripetuto due volte (la seconda copia con altri id): alto il doppio. */
const raddoppiato: Funzione = {
  ...riferimento,
  body: [...riferimento.body, ...(JSON.parse(JSON.stringify(riferimento.body).replace(/"id":"(\w+)"/g, '"id":"$1-bis"')) as Funzione["body"])],
};

// ------------------------------------------------------------------------------------------- la misura

interface Misura {
  area: { larghezza: number; altezza: number };
  disegno: { larghezza: number; altezza: number };
  scala: number;
  carattere: number;
  /** Il disegno sta tutto nell'area: nessuna parte fuori, niente da scorrere. */
  tutto: boolean;
  barra: number;
  dati: number;
}

/** Dopo «Adatta»: il carattere più piccolo del flowchart in pixel dello schermo, e se il disegno si vede tutto. */
function misura(page: Page, vistaFlowchart: string, vistaDati: string): Promise<Misura> {
  return page.evaluate(
    ([nf, nd]) => {
      const tela = document.querySelector<HTMLElement>(`section[aria-label="${nf}"]`)!;
      const svg = tela.querySelector<SVGSVGElement>('svg[role="group"]')!;
      const r = svg.getBoundingClientRect();
      const t = tela.getBoundingClientRect();
      const scala = r.width / svg.viewBox.baseVal.width;
      const carattere = Math.min(...[...svg.querySelectorAll("text")].map((x) => parseFloat(getComputedStyle(x).fontSize) * scala));
      const dentro = r.left >= t.left && r.top >= t.top && r.right <= t.right && r.bottom <= t.bottom;
      const senzaScorrere = tela.scrollWidth <= tela.clientWidth && tela.scrollHeight <= tela.clientHeight;
      return {
        area: { larghezza: t.width, altezza: t.height },
        disegno: { larghezza: svg.viewBox.baseVal.width, altezza: svg.viewBox.baseVal.height },
        scala,
        carattere,
        tutto: dentro && senzaScorrere,
        barra: document.querySelector("header")!.getBoundingClientRect().height,
        dati: document.querySelector<HTMLElement>(`section[aria-label="${nd}"]`)?.getBoundingClientRect().width ?? 0,
      };
    },
    [vistaFlowchart, vistaDati] as const,
  );
}

async function adatta(page: Page, testi: typeof it): Promise<void> {
  const zoom = page.getByRole("group", { name: testi.zoom });
  await zoom.getByRole("button", { name: testi.zoomAdatta }).click();
  await expect(zoom.locator('[data-comando="cento"]')).not.toHaveText("100%");
}

const descrivi = (m: Misura) =>
  `area ${m.area.larghezza.toFixed(0)} × ${m.area.altezza.toFixed(0)}, disegno ${m.disegno.larghezza.toFixed(0)} × ${m.disegno.altezza.toFixed(0)}, ` +
  `scala ${(m.scala * 100).toFixed(1)}%, carattere ${m.carattere.toFixed(2)} px, tutto ${m.tutto ? "sì" : "no"}, barra ${m.barra.toFixed(0)} px, dati ${m.dati.toFixed(0)} px`;

// ---------------------------------------------------------------------------------------------- una pagina

// Una pagina nuova per ogni apertura: gli script iniettati si sommano sulla stessa pagina.
test("in 1920 × 1080, con le due viste aperte, «Adatta» mostra tutto il riferimento con il carattere di almeno 6 px", async ({ context }, info) => {
  let misure = 0;
  for (const [lingua, testi] of [["it", it], ["en", en]] as const)
    for (const condizioni of ["su-due-righe", "su-una-riga"] as const) {
      const page = await context.newPage();
      await apri(page, { lingua, condizioni, valoriIniziali: "nascosti" });
      await expect(page.getByRole("group", { name: `${testi.flowchart}: ${RIFERIMENTO}`, exact: true })).toBeVisible();
      // La premessa: i valori iniziali sono davvero nascosti.
      await expect(page.locator("[data-valore-iniziale]")).toHaveCount(0);
      // La premessa: la vista dei dati è aperta, accanto al flowchart.
      await expect(page.getByRole("region", { name: testi.vistaDati })).toBeVisible();
      await adatta(page, testi);
      const m = await misura(page, testi.vistaFlowchart, testi.vistaDati);
      console.log(`[${info.project.name}] una pagina ${lingua} ${condizioni}: ${descrivi(m)}`);
      expect(m.tutto).toBe(true);
      expect(m.carattere).toBeGreaterThanOrEqual(SOGLIA);
      expect(m.dati).toBeGreaterThan(300);
      misure++;
      await page.close();
    }
  expect(misure).toBe(4);

  // Coi valori iniziali mostrati (il predefinito): la misura si scrive, senza soglia, coi cinque blocchi contati.
  const mostrati = await context.newPage();
  await apri(mostrati, { lingua: "it" });
  await expect(mostrati.locator("[data-valore-iniziale]")).toHaveCount(5);
  await adatta(mostrati, it);
  console.log(`[${info.project.name}] una pagina coi valori iniziali mostrati (senza soglia): ${descrivi(await misura(mostrati, it.vistaFlowchart, it.vistaDati))}`);
  await mostrati.close();

  // Controllo positivo: il riferimento col corpo raddoppiato, nella stessa finestra, va sotto la soglia. E la
  // scala minima: per starci tutto gli servirebbe il carattere a circa 3,6 px, quindi «Adatta» si ferma al
  // carattere di 5 px e il disegno si scorre.
  const page = await context.newPage();
  await apri(page, { lingua: "it", valoriIniziali: "nascosti" }, undefined, [{ nome: "raddoppiato", titolo: "raddoppiato", funzione: raddoppiato }]);
  await expect(page.getByRole("group", { name: `${it.flowchart}: raddoppiato`, exact: true })).toBeVisible();
  await adatta(page, it);
  const doppio = await misura(page, it.vistaFlowchart, it.vistaDati);
  console.log(`[${info.project.name}] una pagina, controllo positivo (corpo raddoppiato): ${descrivi(doppio)}`);
  expect(doppio.carattere).toBeLessThan(SOGLIA);
  expect(doppio.carattere).toBeCloseTo(SCALA_MINIMA_IN_PX, 2);
  expect(doppio.tutto).toBe(false);
});

// Il riferimento della tappa 2 (i cicli `per`: la soglia di 6 px vale coi `per` chiusi, coi `per`
// aperti la misura si scrive), aperto nella finestra vera come esempio, nelle stesse condizioni della prova sopra.
// Controllo positivo: col corpo raddoppiato, coi `per` chiusi, va sotto la soglia.
const RIFERIMENTO_DEI_CICLI = "riferimento-media-voti-per";
const riferimentoDeiCicli: Funzione = (() => {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL(`../casi/tappa-2/${RIFERIMENTO_DEI_CICLI}.algo`, import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error("il riferimento della tappa 2 non si apre");
  return esito.progetto.functions[0]!;
})();

test("il riferimento della tappa 2: con «Adatta» il carattere coi «per» chiusi è di almeno 6 px; coi «per» aperti la misura si scrive", async ({ context }, info) => {
  const raddoppiatoDeiCicli: Funzione = {
    ...riferimentoDeiCicli,
    body: [...riferimentoDeiCicli.body, ...(JSON.parse(JSON.stringify(riferimentoDeiCicli.body).replace(/"id":"(\w+)"/g, '"id":"$1-bis"')) as Funzione["body"])],
  };
  /** «Adatta» sul programma aperto come esempio nella finestra, coi `per` nella forma data: la misura, e i riquadri. */
  const adattato = async (cicliPer: "aperto" | "chiuso", nome: string, funzione: Funzione) => {
    const page = await context.newPage();
    await apri(page, { lingua: "it", valoriIniziali: "nascosti", cicliPer }, undefined, [{ nome, titolo: nome, funzione }]);
    await expect(page.getByRole("group", { name: `${it.flowchart}: ${nome}`, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: it.vistaDati })).toBeVisible();
    await adatta(page, it);
    const m = await misura(page, it.vistaFlowchart, it.vistaDati);
    const riquadri = await page.locator("[data-riquadro]").count();
    await page.close();
    return { ...m, riquadri };
  };
  for (const per of ["chiuso", "aperto"] as const) {
    const m = await adattato(per, RIFERIMENTO_DEI_CICLI, riferimentoDeiCicli);
    console.log(`[${info.project.name}] riferimento della tappa 2, per ${per}: ${descrivi(m)}, margine ${(m.carattere - SOGLIA).toFixed(2)} px${per === "aperto" ? " (senza soglia)" : ""}`);
    // La premessa: i due cicli coi loro riquadri.
    expect(m.riquadri).toBe(2);
    if (per === "chiuso") {
      expect(m.tutto).toBe(true);
      expect(m.carattere).toBeGreaterThanOrEqual(SOGLIA);
    }
  }
  const doppio = await adattato("chiuso", "raddoppiato", raddoppiatoDeiCicli);
  console.log(`[${info.project.name}] riferimento della tappa 2, controllo positivo (corpo raddoppiato, per chiuso): ${descrivi(doppio)}`);
  expect(doppio.carattere).toBeLessThan(SOGLIA);
});

// ---------------------------------------------------------------------------------------------- due viste

test("le due viste si trovano per ruolo e nome, affiancate, in italiano e in inglese", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  let viste = 0;
  for (const [lingua, testi] of [["it", it], ["en", en]] as const) {
    if (lingua === "en") await scegliLingua(page, "en");
    const dati = page.getByRole("region", { name: testi.vistaDati });
    const flowchart = page.getByRole("region", { name: testi.vistaFlowchart });
    await expect(dati.getByRole("table", { name: `${testi.dati}: ${RIFERIMENTO}` })).toBeVisible();
    await expect(flowchart.getByRole("group", { name: `${testi.flowchart}: ${RIFERIMENTO}`, exact: true })).toBeVisible();
    const [d, f] = [(await dati.boundingBox())!, (await flowchart.boundingBox())!];
    console.log(`[${info.project.name}] due viste ${lingua}: dati ${d.width.toFixed(0)} × ${d.height.toFixed(0)} a x ${d.x.toFixed(0)}, flowchart ${f.width.toFixed(0)} × ${f.height.toFixed(0)} a x ${f.x.toFixed(0)}`);
    expect(d.x + d.width).toBeLessThanOrEqual(f.x);
    expect(Math.abs(d.y - f.y)).toBeLessThan(1);
    expect(f.width).toBeGreaterThan(d.width);
    viste += 2;
  }
  expect(viste).toBe(4);

  // Controllo positivo: una vista senza nome non si trova per ruolo e nome.
  await page.getByRole("region", { name: en.vistaDati }).evaluate((s) => s.removeAttribute("aria-label"));
  await expect(page.getByRole("region", { name: en.vistaDati })).toHaveCount(0);
  await expect(page.getByRole("region", { name: en.vistaFlowchart })).toHaveCount(1);
});

test("il pulsante «Dati» chiude e riapre la vista dei dati; il bordo la allarga col puntatore e con la tastiera", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const dati = page.getByRole("region", { name: it.vistaDati });
  const flowchart = page.getByRole("region", { name: it.vistaFlowchart });
  const pulsante = page.getByRole("button", { name: it.pannelloDati });
  await expect(dati).toBeVisible();
  const [larga, stretta] = [(await dati.boundingBox())!.width, (await flowchart.boundingBox())!.width];

  await pulsante.click();
  await expect(pulsante).toHaveAttribute("aria-expanded", "false");
  await expect(dati).toHaveCount(0);
  await expect(page.getByRole("separator")).toHaveCount(0);
  expect((await flowchart.boundingBox())!.width).toBeGreaterThan(stretta + larga - 1);
  await pulsante.click();
  await expect(dati).toBeVisible();
  expect((await dati.boundingBox())!.width).toBeCloseTo(larga, 0);

  // Con la tastiera: tre pressioni della freccia a destra, 16 px ciascuna.
  const bordo = page.getByRole("separator", { name: it.larghezzaPannello });
  await expect(bordo).toHaveAttribute("aria-valuenow", String(Math.round(larga)));
  await bordo.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(bordo).toHaveAttribute("aria-valuenow", String(Math.round(larga) + 48));
  expect((await dati.boundingBox())!.width).toBeCloseTo(Math.round(larga) + 48, 0);

  // Col puntatore: 100 px a destra.
  const b = (await bordo.boundingBox())!;
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y);
  await page.mouse.move(x + 100, y);
  await page.mouse.up();
  await expect(bordo).toHaveAttribute("aria-valuenow", String(Math.round(larga) + 148));
  expect((await dati.boundingBox())!.width).toBeCloseTo(Math.round(larga) + 148, 0);
  // Inizio: la larghezza minima.
  await page.keyboard.press("Home");
  await expect(bordo).toHaveAttribute("aria-valuenow", "160");
});

// ---------------------------------------------------------------------------------------------- le preferenze

/** Le Impostazioni aperte dalla barra, nella lingua data. */
async function impostazioni(page: Page, testi: typeof it) {
  await page.getByRole("banner").getByRole("button", { name: testi.impostazioni, exact: true }).click();
  const finestra = page.getByRole("dialog", { name: testi.impostazioniTitolo, exact: true });
  await expect(finestra).toBeVisible();
  return finestra;
}

test("la forma delle condizioni salvata vale all'avvio, e cambiarla la scrive con le altre preferenze", async ({ page }) => {
  await apri(page, { lingua: "it", condizioni: "su-una-riga" });
  let finestra = await impostazioni(page, it);
  await expect(finestra.getByRole("radio", { name: it.condizioniUnaRiga, exact: true })).toBeChecked();
  await finestra.getByRole("radio", { name: it.condizioniDueRighe, exact: true }).check();
  await finestra.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(finestra).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__finzione__.scritte)).toEqual([{ preferenze: fileDa("it", { ...scelteIniziali, condizioni: "su-due-righe" }) }]);
  finestra = await impostazioni(page, it);
  await expect(finestra.getByRole("radio", { name: it.condizioniDueRighe, exact: true })).toBeChecked();
});

test("una forma delle condizioni che l'app non conosce vale come assente", async ({ page }) => {
  await apri(page, { lingua: "en", condizioni: "su-tre-righe" });
  const finestra = await impostazioni(page, en);
  await expect(finestra.getByRole("radio", { name: en.condizioniDueRighe, exact: true })).toBeChecked();
});

// ---------------------------------------------------------------------------------------------- la lingua del documento

/** Registra la lingua del documento quando il parser inserisce `#radice` (prima che l'avvio giri) e
 * nell'istante in cui l'interfaccia scrive il primo nodo. */
async function registraLaLingua(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __linguaAllApertura__?: string; __linguaAlPrimoRender__?: string };
    new MutationObserver(() => {
      const radice = document.getElementById("radice");
      if (!radice) return;
      w.__linguaAllApertura__ ??= document.documentElement.lang;
      if (radice.childElementCount > 0) w.__linguaAlPrimoRender__ ??= document.documentElement.lang;
    }).observe(document, { childList: true, subtree: true });
  });
}

const lingueLette = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __linguaAllApertura__?: string; __linguaAlPrimoRender__?: string };
    return { apertura: w.__linguaAllApertura__, primoRender: w.__linguaAlPrimoRender__ };
  });

test.describe("la lingua del documento al primo render", () => {
  test.use({ locale: "it-IT" });

  test("è quella della preferenza salvata, non quella di index.html", async ({ page }, info) => {
    await registraLaLingua(page);
    await apri(page, { lingua: "en" });
    await expect(page.getByRole("region", { name: en.vistaDati })).toBeVisible();
    const lette = await lingueLette(page);
    console.log(`[${info.project.name}] lingua del documento: all'apertura ${lette.apertura}, al primo render ${lette.primoRender}`);
    expect(lette.primoRender).toBe("en");
    // Controllo positivo: lo stesso rilevatore, all'apertura, legge la lingua di index.html.
    expect(lette.apertura).toBe("it");
  });
});

test.describe("la lingua del documento senza preferenza, con il sistema in un'altra lingua", () => {
  test.use({ locale: "fr-FR" });

  test("è l'inglese già al primo render", async ({ page }) => {
    await registraLaLingua(page);
    await apri(page, null);
    await expect(page.getByRole("region", { name: en.vistaDati })).toBeVisible();
    expect((await lingueLette(page)).primoRender).toBe("en");
  });
});

/** Le violazioni della politica annotate dalla pagina, nell'ordine. */
const violazioni = (page: Page) => page.evaluate(() => [...(window as unknown as { __violazioni__: string[] }).__violazioni__]);

test("l'anteprima manda la politica di sicurezza dei contenuti del prodotto, e la finestra al lavoro non la viola", async ({ page }, info) => {
  // Le violazioni, annotate dalla pagina prima di ogni suo script.
  await page.addInitScript(() => {
    const viste: string[] = [];
    Object.assign(window, { __violazioni__: viste });
    document.addEventListener("securitypolicyviolation", (e) => viste.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
  const documento = page.waitForResponse((r) => new URL(r.url()).pathname === "/");
  await apri(page, { lingua: "it" });
  const anteprima = info.project.name.endsWith("-anteprima");
  const politica = (await documento).headers()["content-security-policy"] ?? null;
  console.log(`[${info.project.name}] politica: ${politica}`);
  expect(politica).toBe(anteprima ? politicaDelProdotto() : null);

  // Al lavoro: le Impostazioni aperte e chiuse, gli esempi e «Informazioni» dal menu «Aiuto», il codice nei tre
  // linguaggi, un'azione eseguita con la riga corrente.
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  const impostazioni = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  await impostazioni.getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(impostazioni).toBeHidden();
  // Il menu «Aiuto», gli esempi e «Informazioni» aperti e chiusi.
  for (const [voce, titolo] of [
    [it.esempi, it.esempiTitolo],
    [it.informazioni, it.informazioniTitolo],
  ] as const) {
    await (await voceDellAiuto(page, voce)).click();
    const f = page.getByRole("dialog", { name: titolo, exact: true });
    await expect(f).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(f).toBeHidden();
  }
  await page.getByRole("banner").getByRole("button", { name: it.pannelloCodice, exact: true }).click();
  const codice = page.getByRole("region", { name: it.codiceGenerato, exact: true });
  for (const linguaggio of [it.linguaggioPython, it.linguaggioC]) await codice.getByRole("tab", { name: linguaggio, exact: true }).click();
  await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F10");
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true }).locator("[data-stato-esecuzione]")).toHaveText(new RegExp(`^${it.statoInPausa.replace("{n}", "\\d+")}$`));
  expect(await violazioni(page)).toEqual([]);

  // Controllo positivo: uno stile scritto nella pagina, che la politica del prodotto non ammette.
  await page.evaluate(() => {
    const stile = document.createElement("style");
    stile.textContent = "body { outline: 1px solid red; }";
    document.head.append(stile);
  });
  if (anteprima) await expect.poll(() => violazioni(page)).toEqual([expect.stringMatching(/^style-src-elem inline$/)]);
  else expect(await violazioni(page)).toEqual([]);
});
