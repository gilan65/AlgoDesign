// La pagina con due testi di codice affiancati nel motore, servita su HTTP (`page.route`): la pagina non dipende dall'app, e la
// si apre come farebbe chi la riceve. Per ogni progetto: ogni riga di ogni colonna è nella pagina, nessuna riga esce dalla
// sua colonna, nessun foglio dal suo spazio; il PDF ha un foglio per ogni sezione, orizzontale, coi riquadri di margine.
//
// Il TypeScript col suo JavaScript su ogni progetto del corpus che genera; ogni coppia del registro sui progetti più difficili
// per quella coppia, scelti dalla misura: i più lunghi e quelli con la riga più lunga. Le altre righe del corpus le prova
// `strumenti/colonne.test.ts`, senza il motore.
//
// Che cosa NON guarda: gli altri motori e i caratteri di un'altra macchina (le colonne hanno il margine di
// `larghezzaDelCarattere`); le intestazioni che un browser aggiunge di suo.
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../core/controllo/controllo";
import type { Riga } from "../core/genera/forma";
import { formaSenzaTipiDel, linguaggi, type Linguaggio } from "../core/genera/linguaggi";
import { apri } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { paginaDelProgetto, scegliColonne } from "../strumenti/stampa";
import { confermato } from "../strumenti/corpus";
import { codiceDi } from "../ui/genera/codice";
import { paroleDelloPseudocodice } from "../ui/genera/parole";

const casi = join(import.meta.dirname, "..", "casi");
const progetti: { nome: string; progetto: Progetto }[] = readdirSync(casi, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".algo"))
  .sort()
  .flatMap((f) => {
    const a = apri(readFileSync(join(casi, f), "utf8"));
    return a.ok ? [{ nome: f, progetto: a.progetto }] : [];
  });

/** La misura di un foglio A4 orizzontale nel PDF, in punti: non dipende dal corpus. */
const A4_ORIZZONTALE = [842, 595];
const indirizzo = "http://pagina-affiancata.prova/pagina.html";
async function apriLaPagina(page: Page, testo: string): Promise<void> {
  await page.unrouteAll();
  await page.route(indirizzo, (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: testo }));
  await page.goto(indirizzo);
}

/** Dalla pagina: i titoli di ogni foglio, le righe di ogni lato coi loro pezzi, e ciò che esce (dalla colonna, dal foglio). */
const misuraLaPagina = (page: Page) =>
  page.evaluate(() => {
    const fogli = [...document.querySelectorAll<HTMLElement>("section.foglio")];
    const fuori: string[] = [];
    const righe: [Record<number, string[]>, Record<number, string[]>] = [{}, {}];
    const titoli = new Set<string>();
    let misurate = 0;
    let piuLarga = 0;
    fogli.forEach((f, n) => {
      titoli.add([...f.querySelectorAll("[data-titolo]")].map((t) => t.textContent).join(" | "));
      const fondo = f.getBoundingClientRect().bottom;
      for (const lato of f.querySelectorAll<HTMLElement>("pre.lato")) {
        const quale = Number(lato.dataset.lato) as 0 | 1;
        const destra = lato.getBoundingClientRect().right;
        for (const r of lato.querySelectorAll<HTMLElement>(".riga")) {
          const testo = r.querySelector<HTMLElement>(".testo")!;
          const q = testo.getBoundingClientRect();
          const riga = Number(r.dataset.riga);
          misurate++;
          piuLarga = Math.max(piuLarga, q.width / (destra - r.getBoundingClientRect().left));
          if (q.right > destra + 0.5) fuori.push(`foglio ${n + 1}, lato ${quale}, riga ${riga + 1}: a destra di ${(q.right - destra).toFixed(1)} px`);
          if (q.bottom > fondo + 0.5) fuori.push(`foglio ${n + 1}, lato ${quale}, riga ${riga + 1}: sotto di ${(q.bottom - fondo).toFixed(1)} px`);
          (righe[quale][riga] ??= []).push(testo.textContent!.slice(Number(r.dataset.colonna)));
        }
      }
    });
    return { fogli: fogli.length, fuori, righe, titoli: [...titoli], misurate, piuLarga };
  });

/** Le righe attese contro quelle della pagina, nei due versi. */
function confronta(chi: string, attese: readonly Riga[], lette: Record<number, string[]>): string[] {
  const problemi: string[] = [];
  attese.forEach((r, i) => {
    const insieme = lette[i]?.join("");
    if (insieme !== r.testo.trimStart()) problemi.push(`${chi}, riga ${i + 1}: «${insieme}» invece di «${r.testo.trimStart()}»`);
  });
  for (const k of Object.keys(lette)) if (Number(k) >= attese.length) problemi.push(`${chi}: la riga ${Number(k) + 1} non è del testo`);
  return problemi;
}

const paginaDi = (p: Progetto, nomi: readonly [string, string] | undefined) => {
  const s = scegliColonne(nomi);
  if ("motivo" in s) throw new Error(s.motivo);
  const pagina = paginaDelProgetto(p, s.colonne, s.allineamento, "it", "x.algo");
  if ("errori" in pagina) return undefined;
  return { testo: pagina.testo, colonne: s.colonne };
};

test("il TypeScript col suo JavaScript: su ogni progetto ogni riga è nella pagina e nessuna esce dalla colonna o dal foglio", async ({ page }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ media: "print" });
  let provati = 0;
  let misurate = 0;
  let piuLarga = 0;
  const problemi: string[] = [];
  for (const { nome, progetto: p } of progetti) {
    const x = paginaDi(p, undefined);
    if (x === undefined) continue;
    const ts = codiceDi(p, tetti, "typescript", "it");
    const js = formaSenzaTipiDel("typescript")!.genera(p, tetti, "it", paroleDelloPseudocodice("it"));
    if (!ts.generato || !js.generato) throw new Error(`${nome}: il TypeScript o il JavaScript non genera`);
    provati++;
    await apriLaPagina(page, x.testo);
    const m = await misuraLaPagina(page);
    misurate += m.misurate;
    piuLarga = Math.max(piuLarga, m.piuLarga);
    problemi.push(...m.fuori.map((f) => `${nome}: ${f}`));
    problemi.push(...confronta(`${nome} (TypeScript)`, ts.righe, m.righe[0]));
    problemi.push(...confronta(`${nome} (JavaScript)`, js.righe, m.righe[1]));
    if (m.titoli.join() !== "TypeScript | JavaScript") problemi.push(`${nome}: i titoli sono ${m.titoli.join()}`);
  }
  expect(problemi.slice(0, 10)).toEqual([]);
  expect(provati).toBe(confermato("stampa - progetti col typescript e il javascript", provati));
  // La premessa: si è misurato davvero, e la riga più larga riempie quasi la colonna (se fosse piccola, la prova della
  // larghezza non proverebbe nulla).
  expect(misurate).toBeGreaterThan(provati);
  expect(piuLarga).toBeGreaterThan(0.8);
  console.log(`pagina affiancata: ${provati} progetti, ${misurate} righe misurate, la più larga al ${(100 * piuLarga).toFixed(1)}% della colonna`);
});

// I progetti più difficili per una coppia: i tre con più righe e i tre con la riga più lunga, dalla misura.
const piuDifficili = (x: Linguaggio, y: Linguaggio) => {
  const con = progetti.flatMap(({ nome, progetto: p }) => {
    const a = codiceDi(p, tetti, x, "it");
    const b = codiceDi(p, tetti, y, "it");
    if (!a.generato || !b.generato) return [];
    const righe = a.righe.length + b.righe.length;
    const lunga = Math.max(...[...a.righe, ...b.righe].map((r) => r.testo.length));
    return [{ nome, progetto: p, a: a.righe, b: b.righe, righe, lunga }];
  });
  const scelti = new Map([...[...con].sort((m, n) => n.righe - m.righe).slice(0, 3), ...[...con].sort((m, n) => n.lunga - m.lunga).slice(0, 3)].map((q) => [q.nome, q]));
  return [...scelti.values()];
};

const coppie = linguaggi.flatMap((a, i) => linguaggi.slice(i + 1).map((b) => [a.id, b.id] as [Linguaggio, Linguaggio]));
test("ogni coppia del registro: sui progetti più difficili ogni riga è nella pagina, nessuna esce, e le colonne sono nell'ordine chiesto", async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ media: "print" });
  const problemi: string[] = [];
  let pagine = 0;
  for (const [x, y] of coppie)
    for (const q of piuDifficili(x, y)) {
      const fatta = paginaDi(q.progetto, [x, y]);
      if (fatta === undefined) throw new Error(`${q.nome}: ${x} e ${y} non danno la pagina`);
      await apriLaPagina(page, fatta.testo);
      const m = await misuraLaPagina(page);
      pagine++;
      problemi.push(...m.fuori.map((f) => `${q.nome} (${x}, ${y}): ${f}`));
      problemi.push(...confronta(`${q.nome} (${x})`, q.a, m.righe[0]));
      problemi.push(...confronta(`${q.nome} (${y})`, q.b, m.righe[1]));
      const titoli = `${fatta.colonne[0].nome("it")} | ${fatta.colonne[1].nome("it")}`;
      if (m.titoli.join() !== titoli) problemi.push(`${q.nome}: i titoli sono ${m.titoli.join()} invece di ${titoli}`);
    }
  expect(problemi.slice(0, 10)).toEqual([]);
  expect(pagine).toBeGreaterThanOrEqual(coppie.length);
});

test("il PDF: un foglio A4 orizzontale per ogni sezione, senza fogli in più, sul progetto più lungo", async ({ page }) => {
  test.setTimeout(120_000);
  const q = piuDifficili("python", "c")[0]!;
  for (const nomi of [undefined, ["python", "c"], ["pseudocodice", "typescript"]] as const) {
    const fatta = paginaDi(q.progetto, nomi);
    if (fatta === undefined) throw new Error(q.nome);
    await apriLaPagina(page, fatta.testo);
    const sezioni = await page.locator("section.foglio").count();
    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString("latin1");
    const scatole = [...pdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) => [Math.round(Number(m[1])), Math.round(Number(m[2]))]);
    expect(sezioni).toBeGreaterThan(1);
    expect(scatole.length).toBe(sezioni);
    for (const s of scatole) expect(s).toEqual(A4_ORIZZONTALE);
  }
});

test("il nome del progetto con caratteri dell'HTML e del CSS non rompe la pagina; lo stile è applicato", async ({ page }) => {
  const q = progetti.find((x) => x.nome.endsWith("tre-livelli.algo"))!;
  const p: Progetto = { ...q.progetto, metadata: { ...q.progetto.metadata, name: `</style><b>"a'\\` } };
  const fatta = paginaDi(p, ["pseudocodice", "c"]);
  if (fatta === undefined) throw new Error(q.nome);
  await apriLaPagina(page, fatta.testo);
  expect(await page.locator("body b").count()).toBe(0);
  expect(await page.locator("section.foglio").first().evaluate((f) => getComputedStyle(f).breakInside)).toBe("avoid");
  expect((await page.pdf({ preferCSSPageSize: true })).length).toBeGreaterThan(0);
});
