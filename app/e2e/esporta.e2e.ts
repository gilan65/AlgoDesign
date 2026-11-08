// «Esporta il flowchart…» nel motore, col guscio simulato (i byte scritti si leggono dalla finzione):
// - col sistema SCURO emulato (la tela è scura), l'SVG esportato è, byte per byte, quello del nucleo con la tavolozza del
//   tema CHIARO scritta a mano qui (sfondo bianco); senza esecuzione nessun punto di interruzione, anche con un punto
//   messo; il nome proposto e l'estensione chiesta alla finestra del sistema; il messaggio dopo;
// - il PNG decodificato nella pagina misura il doppio dell'SVG (arrotondato in su), e i suoi pixel sono quelli dell'SVG
//   reso dal motore al doppio (una fotografia della pagina); nessuna violazione della politica di sicurezza dei contenuti
//   (l'immagine `blob:`); lo sfondo trasparente ha l'angolo trasparente, quello pieno bianco;
// - in pausa sul punto di interruzione l'SVG ha il blocco corrente, la punta e il punto, e la finestra lo dice;
// - le scelte si ricordano per la sessione e «Annulla» non le cambia; il nome con la funzione fra parentesi; un nome
//   riservato passa dall'avviso del nome («con (2).png»); un errore prima della finestra del sistema (una variabile tolta
//   dal tema chiaro) esce nella finestra d'errore.
//
// Controlli positivi: la tavolozza della tela (scura) al posto di quella scritta a mano dà un altro SVG; un PNG fatto al
// fattore 1 non ha la misura attesa; il PNG a toni di grigio confrontato con l'SVG a colori ha molti pixel diversi; con la
// tela si vede il punto che l'SVG senza esecuzione non ha.
//
// CHE COSA NON GUARDA:
// - la WebView2 e la finestra vera del sistema (la prova sul prodotto, alla fine del blocco);
// - WebKit (le beta sono solo per Windows);
// - il confronto della tavolozza in bianco e nero e a toni di grigio coi colori: lo fa `core/disegno/svg.test.ts`;
// - le voci del menu durante «tutto insieme» e mentre l'esecuzione va avanti.
import { expect, test, type Page } from "@playwright/test";
import { svgDelDisegno } from "../core/disegno/svg";
import type { Tavolozza } from "../core/disegno/tavolozza";
import { geometriaPredefinita as tema } from "../core/disegno/tema";
import { apri as apriProgetto } from "../core/progetto/formato";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { disegnoNelMotore } from "./disegno-nel-motore";
import type { Finzione } from "./finzione-tauri";
import { apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 }, reducedMotion: "reduce" });

const PERCORSO = "C:\\Documenti\\media voti.algo";
const USCITA = "C:\\Documenti\\uscita";
/** Il programma: n riceve leggi_numero(), poi si scrive; la funzione restituisce 7. */
const PROGRAMMA = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "media voti" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "n", type: "integer" }],
      body: [
        { id: "b1", kind: "assignment", target: "n", value: "leggi_numero()" },
        { id: "b2", kind: "write", values: ["n"], newline: true },
      ],
      end: { id: "b3" },
    },
    {
      id: "f2",
      kind: "function",
      name: "leggi_numero",
      return_type: "integer",
      data: [{ name: "x", type: "integer" }],
      body: [{ id: "b4", kind: "assignment", target: "x", value: "7" }],
      end: { id: "b5", return_value: "x" },
    },
  ],
});

/** La tavolozza della carta scritta a mano dal tema chiaro dei «Tenui» (`ui/tema.css`), con lo sfondo bianco. */
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

const finzione = (page: Page) => page.evaluate(() => window.__finzione__ as Finzione);
const finestra = (page: Page) => page.getByRole("dialog", { name: it.esportaFlowchartTitolo, exact: true });
const avviso = (page: Page) => page.locator('output[role="status"]');

/** La finestra aperta dal menu, le scelte fatte, «Esporta…». */
async function esporta(page: Page, scelte: { formato?: string; colori?: string; trasparente?: boolean } = {}): Promise<void> {
  await (await voceDelMenu(page, it.esportaFlowchart)).click();
  const f = finestra(page);
  await expect(f).toBeVisible();
  if (scelte.formato) await f.getByRole("radio", { name: scelte.formato, exact: true }).check();
  if (scelte.colori) await f.getByRole("radio", { name: scelte.colori, exact: true }).check();
  if (scelte.trasparente !== undefined) await f.getByRole("checkbox", { name: it.esportaSfondoTrasparente, exact: true }).setChecked(scelte.trasparente);
  await f.getByRole("button", { name: it.esportaConferma, exact: true }).click();
  await expect(f).toBeHidden();
}

async function apriIlProgramma(page: Page, testo = PROGRAMMA): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { argomento: PERCORSO, file: { [PERCORSO]: testo }, daEsportareLImmagine: USCITA });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "media voti.algo" }));
}

const programma = () => {
  const p = apriProgetto(PROGRAMMA);
  if (!p.ok) throw new Error("il programma non si apre");
  return p.progetto;
};

/** L'SVG atteso del programma principale: il nucleo con la tavolozza scritta a mano e il carattere del tema. */
async function svgAtteso(page: Page, segni?: Parameters<typeof svgDelDisegno>[1]["segni"]): Promise<string> {
  const p = programma();
  const disegno = await disegnoNelMotore(page, p.functions[0]!, [], p.functions);
  const carattere = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim());
  return svgDelDisegno(disegno, { geometria: tema, tavolozza: CARTA, carattere, fondoDeiCicli: false, ...(segni ? { segni } : {}) });
}

test.describe("col sistema scuro", () => {
  test.use({ colorScheme: "dark" });

  test("l'SVG esportato è quello del nucleo coi colori del tema chiaro e lo sfondo bianco, senza punti fuori dall'esecuzione; il nome e il messaggio", async ({ page }) => {
    await apriIlProgramma(page);
    // La premessa: la tela è davvero scura.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--disegno-linea").trim())).toBe("#9aa4b0");
    // Un punto di interruzione messo: la tela lo mostra, l'immagine senza esecuzione no.
    await page.locator('[data-blocco="b2"]').click();
    await page.keyboard.press("F9");
    await expect(page.locator('svg[role="group"] [data-interruzione="b2"]')).toHaveCount(1);
    await (await voceDelMenu(page, it.esportaFlowchart)).click();
    const f = finestra(page);
    await expect(f).toBeVisible();
    await expect(f.locator('[data-part="description"]')).toHaveText(riempi(it.esportaDiQualeFlowchart, { nome: "media voti" }));
    // Le scelte di partenza: PNG, a colori, sfondo pieno.
    await expect(f.getByRole("radio", { name: it.esportaFormatoPng, exact: true })).toBeChecked();
    await expect(f.getByRole("radio", { name: it.esportaAColori, exact: true })).toBeChecked();
    await expect(f.getByRole("checkbox", { name: it.esportaSfondoTrasparente, exact: true })).not.toBeChecked();
    await f.getByRole("radio", { name: it.esportaFormatoSvg, exact: true }).check();
    await f.getByRole("button", { name: it.esportaConferma, exact: true }).click();
    await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita.svg" }));
    const g = await finzione(page);
    expect({ proposto: g.finestre.proposto, estensione: g.finestre.estensione, volte: g.finestre.immagine }).toEqual({ proposto: "media voti.svg", estensione: ".svg", volte: 1 });
    const scritto = g.file[`${USCITA}.svg`]!;
    const atteso = await svgAtteso(page);
    console.log(`SVG esportato: ${scritto.length} caratteri, atteso ${atteso.length}`);
    expect(scritto).toBe(atteso);
    expect(scritto).not.toContain("data-interruzione");
    expect(scritto).toContain('data-fondo="" x="0" y="0"');
    // Controllo positivo: con la tavolozza della tela (scura) l'SVG sarebbe un altro.
    const scura = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--disegno-linea").trim());
    const p = programma();
    const conLaTela = svgDelDisegno(await disegnoNelMotore(page, p.functions[0]!, [], p.functions), { geometria: tema, tavolozza: { ...CARTA, linea: scura }, carattere: await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim()) });
    expect(conLaTela).not.toBe(scritto);
  });
});

/** I byte del PNG scritto (base64) decodificati nella pagina: la misura e i pixel (RGBA). */
const decodifica = (page: Page, base64: string) =>
  page.evaluate(async (b) => {
    const byte = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const immagine = await createImageBitmap(new Blob([byte], { type: "image/png" }));
    const c = document.createElement("canvas");
    [c.width, c.height] = [immagine.width, immagine.height];
    const x = c.getContext("2d")!;
    x.drawImage(immagine, 0, 0);
    return { larghezza: immagine.width, altezza: immagine.height, pixel: [...x.getImageData(0, 0, c.width, c.height).data] };
  }, base64);

/** Quanti pixel differiscono (un canale oltre 12: i colori pastello e i loro grigi distano da 20 a 45) fra due immagini
 * della stessa misura. */
function diversi(a: { pixel: number[] }, b: { pixel: number[] }): number {
  let n = 0;
  for (let i = 0; i < a.pixel.length; i += 4) if ([0, 1, 2, 3].some((k) => Math.abs(a.pixel[i + k]! - b.pixel[i + k]!) > 12)) n++;
  return n;
}

// Un pixel per punto, come in Chromium: il dispositivo di WebKit ne ha due, e la foto di riferimento misurava il doppio
// del PNG. Il PNG non dipende dal fattore della pagina: è sempre al doppio dell'SVG. I pixel diversi dal riferimento,
// misurati: 1,11 % in Chromium su Windows, 1,96 % nel WebKit per Linux (uguale in due giri; 2,01 % con due pixel per punto e
// la foto ridotta), 15,7 % il PNG a toni di grigio (il controllo positivo). La soglia è il 3 %.
test.describe("con un pixel per punto", () => {
test.use({ deviceScaleFactor: 1 });
test("il PNG decodificato misura il doppio dell'SVG e ha i pixel dell'SVG reso al doppio; nessuna violazione della politica; lo sfondo trasparente", async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await apriIlProgramma(page);
  await page.evaluate(() => {
    const violazioni: string[] = [];
    Object.assign(window, { __violazioni__: violazioni });
    document.addEventListener("securitypolicyviolation", (e) => violazioni.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
  // L'SVG e il PNG a colori, con lo sfondo pieno.
  await page.evaluate((u) => Object.assign(window.__finzione__, { daEsportareLImmagine: `${u} svg` }), USCITA);
  await esporta(page, { formato: it.esportaFormatoSvg });
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita svg.svg" }));
  await page.evaluate((u) => Object.assign(window.__finzione__, { daEsportareLImmagine: `${u} png` }), USCITA);
  await esporta(page, { formato: it.esportaFormatoPng });
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita png.png" }));
  const g = await finzione(page);
  const svg = g.file[`${USCITA} svg.svg`]!;
  const png = await decodifica(page, g.byte![`${USCITA} png.png`]!);
  const [l, a] = [/width="([\d.]+)"/, /height="([\d.]+)"/].map((r) => Number(r.exec(svg)![1]));
  const attesa = { larghezza: Math.ceil(l! * 2), altezza: Math.ceil(a! * 2) };
  console.log(`SVG ${l} × ${a}, PNG ${png.larghezza} × ${png.altezza}, atteso ${attesa.larghezza} × ${attesa.altezza}`);
  expect({ larghezza: png.larghezza, altezza: png.altezza }).toEqual(attesa);

  const violazioni = () => page.evaluate(() => (window as unknown as { __violazioni__: string[] }).__violazioni__);
  const primaDelRiferimento = (await violazioni()).length;
  // Il riferimento: lo stesso SVG nella pagina, al doppio, fotografato dal motore.
  await page.evaluate(
    ({ testo, misura }) => {
      const sopra = document.createElement("div");
      sopra.id = "riferimento";
      Object.assign(sopra.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", width: `${misura.larghezza}px`, height: `${misura.altezza}px`, background: "#ffffff" });
      sopra.innerHTML = testo;
      const s = sopra.querySelector("svg")!;
      s.setAttribute("width", String(Number(s.getAttribute("width")) * 2));
      s.setAttribute("height", String(Number(s.getAttribute("height")) * 2));
      s.style.display = "block";
      document.body.append(sopra);
    },
    { testo: svg, misura: attesa },
  );
  // La foto misura il PNG: con due pixel per punto era il doppio (888 × 1080 contro 444 × 540, misurato nel WebKit per Linux).
  const foto = await page.screenshot({ clip: { x: 0, y: 0, width: attesa.larghezza, height: attesa.altezza } });
  const riferimento = await decodifica(page, foto.toString("base64"));
  // Il `<style>` dell'SVG messo nella pagina dalla prova: WebKit annota la violazione (`style-src-elem inline`, misurato nel
  // WebKit per Linux), Chromium no. È della prova, non dell'esportazione: si toglie dal conto, e si stampa.
  const dellaProva = await page.evaluate((da) => (window as unknown as { __violazioni__: string[] }).__violazioni__.splice(da), primaDelRiferimento);
  console.log(`violazioni del riferimento messo dalla prova: ${JSON.stringify(dellaProva)}`);
  expect(dellaProva.every((v) => v === "style-src-elem inline")).toBe(true);
  expect({ larghezza: riferimento.larghezza, altezza: riferimento.altezza }).toEqual(attesa);
  const n = diversi(png, riferimento);
  const totale = png.pixel.length / 4;
  console.log(`pixel diversi dal riferimento: ${n} su ${totale} (${((n / totale) * 100).toFixed(2)}%)`);
  // La soglia per motore: misurati 1,11% in Chromium e 1,96% nel WebKit per Linux.
  expect(n / totale).toBeLessThan(browserName === "chromium" ? 0.02 : 0.03);

  // Controlli positivi: il PNG a toni di grigio contro lo stesso riferimento; un PNG fatto al fattore 1 nella pagina.
  await page.evaluate((u) => Object.assign(window.__finzione__, { daEsportareLImmagine: `${u} grigio` }), USCITA);
  await page.locator("#riferimento").evaluate((e) => (e as HTMLElement).style.setProperty("display", "none"));
  await esporta(page, { colori: it.esportaAGrigi });
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita grigio.png" }));
  const grigio = await decodifica(page, (await finzione(page)).byte![`${USCITA} grigio.png`]!);
  const nGrigio = diversi(grigio, riferimento);
  console.log(`controllo positivo, a toni di grigio: ${nGrigio} pixel diversi su ${totale}`);
  expect(nGrigio / totale).toBeGreaterThan(0.1);
  const alFattoreUno = await page.evaluate(async (testo) => {
    const indirizzo = URL.createObjectURL(new Blob([testo], { type: "image/svg+xml" }));
    const i = new Image();
    i.src = indirizzo;
    await i.decode();
    URL.revokeObjectURL(indirizzo);
    return { larghezza: Math.ceil(i.naturalWidth), altezza: Math.ceil(i.naturalHeight) };
  }, svg);
  expect(alFattoreUno).not.toEqual(attesa);

  // Lo sfondo trasparente: l'angolo trasparente; con lo sfondo pieno, bianco.
  await page.evaluate((u) => Object.assign(window.__finzione__, { daEsportareLImmagine: `${u} trasparente` }), USCITA);
  await esporta(page, { colori: it.esportaAColori, trasparente: true });
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita trasparente.png" }));
  const trasparente = await decodifica(page, (await finzione(page)).byte![`${USCITA} trasparente.png`]!);
  expect({ trasparente: trasparente.pixel.slice(0, 4), pieno: png.pixel.slice(0, 4) }).toEqual({ trasparente: [0, 0, 0, 0], pieno: [255, 255, 255, 255] });
  expect(await page.evaluate(() => (window as unknown as { __violazioni__: string[] }).__violazioni__)).toEqual([]);
});

test("un flowchart che al doppio non entra nel canvas del motore esce a misura piena e la riga di stato lo dice; se non entra nemmeno a un quarto, l'errore", async ({ page }) => {
  await apriIlProgramma(page);
  const svg = await svgAtteso(page);
  const [l, a] = [/width="([\d.]+)"/, /height="([\d.]+)"/].map((r) => Number(r.exec(svg)![1]));
  const piena = { larghezza: Math.ceil(l!), altezza: Math.ceil(a!) };
  // Il motore non dà il PNG oltre un'area del canvas (misurata: 16384 × 16384 in Chromium, nella WebView2 e nel WebKitGTK):
  // qui l'area si abbassa a quella del flowchart a misura piena, così al doppio non entra.
  const limita = (area: number) =>
    page.evaluate((area) => {
      const vero = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (fatto, ...resto) {
        if (this.width * this.height > area) return void setTimeout(() => fatto(null));
        return vero.call(this, fatto, ...resto);
      };
    }, area);
  await limita(piena.larghezza * piena.altezza);
  await page.evaluate((u) => Object.assign(window.__finzione__, { daEsportareLImmagine: `${u} ridotto` }), USCITA);
  await esporta(page, { formato: it.esportaFormatoPng });
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoRidotto, { file: "uscita ridotto.png", larghezza: String(piena.larghezza), altezza: String(piena.altezza) }));
  const ridotto = await decodifica(page, (await finzione(page)).byte![`${USCITA} ridotto.png`]!);
  expect({ larghezza: ridotto.larghezza, altezza: ridotto.altezza }).toEqual(piena);
  // Nemmeno un pixel: a nessun fattore; la finestra d'errore, nessun file e la riga di stato di prima.
  await limita(0);
  await page.evaluate((u) => Object.assign(window.__finzione__, { daEsportareLImmagine: `${u} niente` }), USCITA);
  await esporta(page);
  const errore = page.getByRole("alertdialog", { name: riempi(it.esportaFlowchartErroreTitolo, { file: "uscita niente.png" }), exact: true });
  await expect(errore).toContainText("nemmeno a 0.25 volte");
  expect((await finzione(page)).byte?.[`${USCITA} niente.png`]).toBeUndefined();
});
});

test("in pausa sul punto di interruzione l'immagine ha il blocco corrente, la punta e il punto, e la finestra lo dice", async ({ page }) => {
  await apriIlProgramma(page);
  await page.locator('[data-blocco="b2"]').click();
  await page.keyboard.press("F9");
  await page.keyboard.press("F5");
  await expect(page.locator('svg[role="group"] [aria-current="step"]')).toHaveAttribute("data-blocco", "b2");
  await (await voceDelMenu(page, it.esportaFlowchart)).click();
  const f = finestra(page);
  await expect(f.locator('[data-part="description"]')).toHaveText(`${riempi(it.esportaDiQualeFlowchart, { nome: "media voti" })} ${it.esportaConISegni}`);
  await f.getByRole("radio", { name: it.esportaFormatoSvg, exact: true }).check();
  await f.getByRole("button", { name: it.esportaConferma, exact: true }).click();
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita.svg" }));
  const scritto = (await finzione(page)).file[`${USCITA}.svg`]!;
  expect(scritto).toBe(await svgAtteso(page, { corrente: "b2", interruzioni: new Set(["b2"]) }));
  for (const segno of ['data-interruzione="b2"', "data-freccia", 'fill="#fff59d"']) expect({ segno, c: scritto.includes(segno) }).toEqual({ segno, c: true });
  // Controllo positivo: lo stesso disegno senza segni non è l'immagine esportata.
  expect(scritto).not.toBe(await svgAtteso(page));
});

test("le scelte si ricordano per la sessione e «Annulla» non le cambia; il nome con la funzione; un nome riservato passa dall'avviso", async ({ page }) => {
  await apriIlProgramma(page);
  await esporta(page, { formato: it.esportaFormatoSvg, colori: it.esportaInBiancoENero, trasparente: true });
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita.svg" }));
  await (await voceDelMenu(page, it.esportaFlowchart)).click();
  const f = finestra(page);
  await expect(f.getByRole("radio", { name: it.esportaFormatoSvg, exact: true })).toBeChecked();
  await expect(f.getByRole("radio", { name: it.esportaInBiancoENero, exact: true })).toBeChecked();
  await expect(f.getByRole("checkbox", { name: it.esportaSfondoTrasparente, exact: true })).toBeChecked();
  // Cambiate e lasciate con Esc: alla prossima apertura sono quelle di prima.
  await f.getByRole("radio", { name: it.esportaFormatoPng, exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  await (await voceDelMenu(page, it.esportaFlowchart)).click();
  await expect(f.getByRole("radio", { name: it.esportaFormatoSvg, exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(f).toBeHidden();
  const svg = (await finzione(page)).file[`${USCITA}.svg`]!;
  expect(svg).not.toContain("data-fondo");
  expect([...new Set(svg.match(/#[0-9a-f]{6}/g))].sort()).toEqual(["#000000", "#ffffff"]);

  // La scheda di una funzione: il suo nome fra parentesi.
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator('[data-voce-funzione="f2"]').click();
  await (await voceDelMenu(page, it.esportaFlowchart)).click();
  await expect(f.locator('[data-part="description"]')).toHaveText(riempi(it.esportaDiQualeFlowchart, { nome: "leggi_numero" }));
  await f.getByRole("radio", { name: it.esportaFormatoPng, exact: true }).check();
  await f.getByRole("button", { name: it.esportaConferma, exact: true }).click();
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita.png" }));
  expect((await finzione(page)).finestre.proposto).toBe("media voti (leggi_numero).png");
});

test("un progetto con un nome riservato di Windows: l'avviso del nome, poi «con (2).png»", async ({ page }) => {
  await apriIlProgramma(page, PROGRAMMA.replace('"name":"media voti"', '"name":"con"'));
  await esporta(page);
  const nome = page.getByRole("dialog", { name: it.nomeCambiaTitolo, exact: true });
  await expect(nome).toBeVisible();
  await nome.getByRole("button", { name: it.nomeCambiaContinua, exact: true }).click();
  await expect(avviso(page)).toHaveText(riempi(it.flowchartEsportatoIn, { file: "uscita.png" }));
  expect((await finzione(page)).finestre.proposto).toBe("con (2).png");

  // Un errore prima della finestra del sistema (qui la tavolozza della carta: una variabile tolta dal tema chiaro) si dice
  // con la finestra d'errore, e non sparisce nella console.
  await page.evaluate(() => {
    for (const f of document.styleSheets) for (const r of f.cssRules) if (r instanceof CSSStyleRule) r.style.removeProperty("--disegno-linea");
  });
  await esporta(page);
  const errore = page.getByRole("alertdialog", { name: it.esportaFlowchartTitolo, exact: true });
  await expect(errore).toContainText("--disegno-linea");
});
