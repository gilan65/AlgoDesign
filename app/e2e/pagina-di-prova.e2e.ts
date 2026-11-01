// La pagina di prova nel motore. Sui casi del corpus, gli stessi del test differenziale (`strumenti/casi-del-confronto.ts`),
// nelle due lingue: l'input scritto nella casella vera, «Esegui», e l'output e la riga d'errore passati a `esitoDelCaso`, col
// blocco ricavato dalla riga N come per Node. Servita su HTTP (`page.route`), perché è il modo veloce di aprirne tante; e da
// `file://`, con la pagina scritta dal comando vero, perché è il modo in cui si apre davvero, e l'HTTP non lo dimostra (un
// Worker di modulo, per esempio, parte su HTTP e da `file://` no).
//
// Che cosa NON guarda: gli altri motori (fuori da V8 la pila ha un'altra forma); la console vera; i testi delle pagine di un
// progetto che non genera, di cui è la prova di `strumenti/stampa.test.ts`.
import { expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { esitoDelCaso } from "../core/casi/esito";
import { controlla, tetti } from "../core/controllo/controllo";
import type { Riga } from "../core/genera/forma";
import { formaSenzaTipiDel, linguaggi } from "../core/genera/linguaggi";
import { tettoDelleChiamate } from "../core/controllo/spazio";
import type { LinguaDelCodice } from "../core/genera/nomi";
import { apri, leggi } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { casiDelProgetto, ottenutoDaiTesti, type CasoDelProgetto, type ControlloCheParte } from "../strumenti/casi-del-confronto";
import { confermato } from "../strumenti/corpus";
import { paginaDiProva, testiDellaPagina, tettoDellOutput } from "../strumenti/pagina-di-prova";
import { righeDellEsito } from "../strumenti/righe-dei-casi";
import { paginaDiProvaDelProgetto, scegliColonne } from "../strumenti/stampa";
import { paroleDelloPseudocodice } from "../ui/genera/parole";

const app = join(import.meta.dirname, "..");
const cartellaDeiCasi = join(app, "casi");
const progetti: { nome: string; progetto: Progetto; casi: CasoDelProgetto[]; controllo: ControlloCheParte }[] = readdirSync(cartellaDeiCasi, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".algo"))
  .sort()
  .flatMap((f) => {
    const a = apri(readFileSync(join(cartellaDeiCasi, f), "utf8"));
    if (!a.ok) return [];
    const controllo = controlla(a.progetto, tetti);
    if (controllo.fuoriTappa) return [];
    const nome = f.replaceAll("\\", "/").slice(0, -".algo".length);
    return [{ nome, progetto: a.progetto, casi: casiDelProgetto(nome, basename(nome), a.progetto), controllo }];
  });
const delCorpus = (nome: string) => {
  const q = progetti.find((x) => x.nome === nome);
  if (q === undefined) throw new Error(`${nome} non è nel corpus`);
  return q;
};

const voce = linguaggi.find((v) => formaSenzaTipiDel(v.id) !== undefined)!;
const javascript = formaSenzaTipiDel(voce.id)!;
const indirizzo = "http://pagina-di-prova.prova/pagina.html";

async function apriLaPagina(page: Page, testo: string): Promise<void> {
  await page.unrouteAll();
  await page.route(indirizzo, (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: testo }));
  await page.goto(indirizzo);
}
const fine = (page: Page) => page.waitForFunction(() => !["in-corso", undefined].includes(document.getElementById("stato")!.dataset.esito), undefined, { timeout: 20_000 });
const letto = (page: Page) =>
  page.evaluate(() => ({
    esito: document.getElementById("stato")!.dataset.esito,
    tutto: document.getElementById("output")!.textContent ?? "",
    err: document.getElementById("errore")!.textContent ?? "",
  }));
async function esegui(page: Page, input: string) {
  await page.fill("#input", input);
  await page.click("#esegui");
  await fine(page);
  return letto(page);
}
const senzaEsito = (esito: string | undefined) => (esito === "finito" ? 0 : esito === "errore" ? 1 : null);
const inRighe = (input: readonly string[]) => input.map((t) => `${t}\n`).join("");

/** Un caso nella pagina aperta: le righe rosse, vuote se è come atteso. */
async function provaIlCaso(page: Page, q: (typeof progetti)[number], c: Extract<CasoDelProgetto, { input: string[] }>, righe: readonly Riga[], lingua: LinguaDelCodice): Promise<string[]> {
  const f = await esegui(page, inRighe(c.input));
  const chi = `${lingua} ${c.id}`;
  const o = ottenutoDaiTesti({ uscita: senzaEsito(f.esito), tutto: f.tutto, err: f.err }, voce, righe, lingua, c.caso.expected, q.controllo, tettoDelleChiamate(q.progetto));
  if ("senzaEsito" in o) return [`${chi} senza esito: ${o.senzaEsito} (la pagina dice ${f.esito})`];
  const esito = esitoDelCaso(c.caso.expected, o.atteso, o.tagliato);
  if (esito.fuoriTappa) return [`${chi} fuori tappa`];
  const r = righeDellEsito(chi, esito);
  return r.genere === "verde" ? [] : r.righe;
}

test("ogni caso del confronto, nelle due lingue: la pagina dà l'output atteso e l'errore sul blocco atteso", async ({ page }) => {
  test.setTimeout(600_000);
  const problemi: string[] = [];
  const quanti = { casi: 0, arresti: 0, diFunzioni: 0, letture: 0 };
  for (const lingua of ["it", "en"] as const)
    for (const q of progetti) {
      if (q.controllo.errori.length > 0) continue;
      const parole = paroleDelloPseudocodice(lingua);
      const delProgramma = q.casi.filter((c) => c.funzione === undefined);
      const generato = delProgramma.some((c) => "input" in c) ? javascript.genera(q.progetto, tetti, lingua, parole) : undefined;
      if (generato !== undefined) {
        if (!generato.generato) throw new Error(`${q.nome}: il JavaScript non genera`);
        await apriLaPagina(page, paginaDiProva(generato.righe, { lingua, titolo: q.nome }));
      }
      for (const c of delProgramma) {
        if (!("input" in c)) continue;
        problemi.push(...(await provaIlCaso(page, q, c, generato !== undefined && generato.generato ? generato.righe : [], lingua)));
        quanti.casi++;
        if (c.caso.expected.error !== undefined) quanti.arresti++;
        if (c.input.length > 0) quanti.letture++;
      }
      // I programmi di prova delle funzioni: uno per caso, come nel differenziale.
      for (const c of q.casi) {
        if (c.funzione === undefined || !("input" in c)) continue;
        const g = javascript.genera(q.progetto, tetti, lingua, parole, { funzione: c.funzione.id, caso: c.caso });
        if (!g.generato) throw new Error(`${c.id}: il programma di prova non genera`);
        await apriLaPagina(page, paginaDiProva(g.righe, { lingua, titolo: c.id }));
        problemi.push(...(await provaIlCaso(page, q, c, g.righe, lingua)));
        quanti.casi++;
        quanti.diFunzioni++;
        if (c.caso.expected.error !== undefined) quanti.arresti++;
      }
    }
  expect(problemi.slice(0, 10)).toEqual([]);
  expect(quanti.casi).toBe(confermato("pagina di prova - casi eseguiti nelle due lingue", quanti.casi));
  // Le premesse: ci sono davvero arresti, letture e programmi di prova, o la prova non proverebbe ciò che dice.
  expect(quanti.arresti).toBe(confermato("pagina di prova - casi con un arresto", quanti.arresti));
  expect(quanti.letture).toBe(confermato("pagina di prova - casi del programma che leggono", quanti.letture));
  expect(quanti.diFunzioni).toBe(confermato("pagina di prova - programmi di prova delle funzioni", quanti.diFunzioni));
  console.log(`pagina di prova: ${quanti.casi} casi, ${quanti.arresti} con un arresto, ${quanti.letture} che leggono, ${quanti.diFunzioni} di funzioni`);
});

test("c'è una pagina per ogni progetto del corpus che genera, e nessuna per chi ha errori statici", async () => {
  const scelta = scegliColonne(undefined);
  if ("motivo" in scelta) throw new Error(scelta.motivo);
  let conLaPagina = 0;
  for (const q of progetti) {
    const pagina = paginaDiProvaDelProgetto(q.progetto, scelta.colonne[1], "it");
    expect(pagina === undefined, q.nome).toBe(q.controllo.errori.length > 0);
    if (pagina !== undefined) conLaPagina++;
  }
  expect(conLaPagina).toBe(confermato("pagina di prova - progetti con la pagina", conLaPagina));
});

test("da file://, con le pagine scritte dal comando vero e un nome con gli spazi: lo stesso esito, e nessuna richiesta oltre alla pagina", async ({ page }) => {
  test.setTimeout(120_000);
  const q = delCorpus("tipi/stringa-per-valore-da-un-campo");
  const cartella = mkdtempSync(join(tmpdir(), "pagina di prova "));
  try {
    const progetto = join(cartella, "il mio esercizio.algo");
    writeFileSync(progetto, readFileSync(join(cartellaDeiCasi, `${q.nome}.algo`)));
    const r = spawnSync(process.execPath, ["./strumenti/algodesign-tools.ts", "stampa", progetto], { cwd: app, encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const file = join(cartella, "il mio esercizio (prova).html");
    const richieste: string[] = [];
    page.on("request", (x) => richieste.push(x.url()));
    const errori: string[] = [];
    page.on("pageerror", (e) => errori.push(String(e)));
    await page.goto(pathToFileURL(file).href);
    const g = javascript.genera(q.progetto, tetti, "it", paroleDelloPseudocodice("it"));
    if (!g.generato) throw new Error(q.nome);
    let arresti = 0;
    for (const c of q.casi) {
      if (!("input" in c) || c.funzione !== undefined) continue;
      expect(await provaIlCaso(page, q, c, g.righe, "it")).toEqual([]);
      if (c.caso.expected.error !== undefined) arresti++;
    }
    expect(arresti).toBeGreaterThan(0);
    expect(errori).toEqual([]);
    const altrove = richieste.filter((u) => !u.startsWith("blob:") && u !== pathToFileURL(file).href);
    expect(altrove).toEqual([]);
    expect(richieste.some((u) => u.startsWith("blob:null/"))).toBe(true);
  } finally {
    rmSync(cartella, { recursive: true, force: true });
  }
});

test("un programma che non finisce: «Ferma» lo ferma e lo dice; poi si può rieseguire; la pagina non ha mai smesso di rispondere", async ({ page }) => {
  test.setTimeout(60_000);
  const q = delCorpus("tappa-1/troppi-passi");
  const g = javascript.genera(q.progetto, tetti, "it", paroleDelloPseudocodice("it"));
  if (!g.generato) throw new Error(q.nome);
  await apriLaPagina(page, paginaDiProva(g.righe, { lingua: "it", titolo: q.nome }));
  await page.click("#esegui");
  await expect(page.locator("#stato")).toHaveAttribute("data-esito", "in-corso");
  await expect(page.locator("#esegui")).toBeDisabled();
  // Il programma gira ancora dopo un secondo, e intanto la pagina risponde.
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => document.getElementById("stato")!.dataset.esito)).toBe("in-corso");
  await page.click("#ferma");
  await expect(page.locator("#stato")).toHaveAttribute("data-esito", "fermato");
  await expect(page.locator("#stato")).toHaveText(testiDellaPagina.it.fermatoDaTe);
  await expect(page.locator("#ferma")).toBeDisabled();
  await page.click("#esegui");
  await expect(page.locator("#stato")).toHaveAttribute("data-esito", "in-corso");
  await page.click("#ferma");
  await expect(page.locator("#stato")).toHaveAttribute("data-esito", "fermato");
});

test("un programma che scrive senza fine: la pagina lo ferma oltre il tetto e lo dice, senza un errore del programma", async ({ page }) => {
  test.setTimeout(60_000);
  const scritta = "una riga di testo\n";
  const righe: Riga[] = [{ testo: "// scrive sempre" }, { testo: `function main() { for (;;) writeSync(1, ${JSON.stringify(scritta)}); }` }, { testo: "main();" }];
  await apriLaPagina(page, paginaDiProva(righe, { lingua: "it", titolo: "scrive sempre" }));
  await page.click("#esegui");
  await expect(page.locator("#stato")).toHaveAttribute("data-esito", "troppo", { timeout: 30_000 });
  await expect(page.locator("#stato")).toHaveText(testiDellaPagina.it.troppo);
  const f = await letto(page);
  expect(f.tutto.length).toBeGreaterThan(tettoDellOutput);
  // Si ferma alla scrittura che passa il tetto, non molto dopo.
  expect(f.tutto.length - tettoDellOutput).toBeLessThanOrEqual(scritta.length);
  expect(f.err).toBe("");
});

test("un programma che scrive sempre un testo vuoto: la pagina risponde e «Ferma» lo ferma", async ({ page }) => {
  test.setTimeout(60_000);
  const righe: Riga[] = [{ testo: "// scrive il vuoto" }, { testo: 'function main() { for (;;) writeSync(1, ""); }' }, { testo: "main();" }];
  await apriLaPagina(page, paginaDiProva(righe, { lingua: "it", titolo: "scrive il vuoto" }));
  await page.click("#esegui");
  // Cinque secondi di scritture: con un messaggio per ognuna la pagina non risponde più, e il clic non arriva in dieci.
  await page.waitForTimeout(5000);
  await page.click("#ferma", { timeout: 10_000 });
  await expect(page.locator("#stato")).toHaveAttribute("data-esito", "fermato", { timeout: 10_000 });
  expect((await letto(page)).tutto).toBe("");
});

test("U+2028 e U+2029 nell'input: la riga dell'errore resta quella del file, e il programma li riceve uguali", async ({ page }) => {
  const separatori = `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`;
  const a = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "due letture" },
    functions: [{ id: "f1", kind: "main", data: [{ name: "s", type: "string" }, { name: "t", type: "string" }], body: [{ id: "b1", kind: "read", target: "s" }, { id: "b2", kind: "read", target: "t" }], end: { id: "fine" } }],
    test_cases: [],
  });
  if (!a.ok) throw new Error(JSON.stringify(a));
  const g = javascript.genera(a.progetto, tetti, "it", paroleDelloPseudocodice("it"));
  if (!g.generato) throw new Error("il programma non genera");
  await apriLaPagina(page, paginaDiProva(g.righe, { lingua: "it", titolo: "due letture" }));
  // La seconda lettura si ferma per l'input finito, alla stessa riga con i separatori e senza.
  const senza = await esegui(page, "a");
  expect(senza.esito).toBe("errore");
  const segnata = await page.locator(".riga.segnata").getAttribute("data-riga");
  const con = await esegui(page, separatori);
  expect(con.err).toBe(senza.err);
  await expect(page.locator(".riga.segnata")).toHaveAttribute("data-riga", segnata!);
  const eco: Riga[] = [{ testo: "// eco" }, { testo: "function main() { const b = new Uint8Array(64); let n = 0; while (readSync(0, b, n, 1, null) === 1) n++; writeSync(1, new TextDecoder().decode(b.subarray(0, n))); }" }, { testo: "main();" }];
  await apriLaPagina(page, paginaDiProva(eco, { lingua: "it", titolo: "eco" }));
  expect((await esegui(page, separatori)).tutto).toBe(separatori);
});

test("ogni esecuzione rilascia il testo del suo programma quando finisce", async ({ page }) => {
  await page.addInitScript(() => {
    const conti = { fatti: 0, rilasciati: 0 };
    (window as unknown as { conti: typeof conti }).conti = conti;
    const crea = URL.createObjectURL.bind(URL);
    const rilascia = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (o) => {
      conti.fatti++;
      return crea(o);
    };
    URL.revokeObjectURL = (u) => {
      conti.rilasciati++;
      rilascia(u);
    };
  });
  await apriLaPagina(page, paginaDiProva([{ testo: "// nulla" }], { lingua: "it", titolo: "nulla" }));
  expect((await esegui(page, "")).esito).toBe("finito");
  expect((await esegui(page, "")).esito).toBe("finito");
  const conti = await page.evaluate(() => (window as unknown as { conti: { fatti: number; rilasciati: number } }).conti);
  expect(conti.fatti).toBeGreaterThan(1);
  expect(conti.rilasciati).toBe(conti.fatti);
});

test("il nome del progetto con i caratteri dell'HTML e dello script non rompe la pagina; l'errore che non è del programma è detto come tale", async ({ page }) => {
  const q = delCorpus("tappa-3/tre-livelli");
  const p: Progetto = { ...q.progetto, metadata: { ...q.progetto.metadata, name: `</script><b>"a'\\<!--<script>` } };
  const g = javascript.genera(p, tetti, "it", paroleDelloPseudocodice("it"));
  if (!g.generato) throw new Error(q.nome);
  const scelta = scegliColonne(undefined);
  if ("motivo" in scelta) throw new Error(scelta.motivo);
  await apriLaPagina(page, paginaDiProvaDelProgetto(p, scelta.colonne[1], "it")!);
  expect(await page.locator("body b").count()).toBe(0);
  await expect(page.locator("h1")).toContainText("</script>");
  const c = q.casi.find((x): x is Extract<CasoDelProgetto, { input: string[] }> => "input" in x && x.funzione === undefined)!;
  expect(await provaIlCaso(page, q, c, g.righe, "it")).toEqual([]);
  // Un testo dell'input coi caratteri della sostituzione arriva com'è.
  const eco: Riga[] = [{ testo: "// eco" }, { testo: 'function main() { const b = new Uint8Array(8); const n = readSync(0, b, 0, 1, null); writeSync(1, String.fromCharCode(b[0]) + n); }' }, { testo: "main();" }];
  await apriLaPagina(page, paginaDiProva(eco, { lingua: "it", titolo: "eco" }));
  expect((await esegui(page, "$&")).tutto).toBe("$1");
  // Un programma con un difetto: non è un esito del programma.
  await apriLaPagina(page, paginaDiProva([{ testo: "// difetto" }, { testo: "null.x;" }], { lingua: "it", titolo: "difetto" }));
  const d = await esegui(page, "");
  expect(d.esito).toBe("imprevisto");
  await expect(page.locator("#stato")).toHaveText(testiDellaPagina.it.nonPrevisto);
  expect(d.err).toContain("TypeError");
  // Un Worker che il browser non lascia partire dà un evento senza messaggio: la pagina lo dice a parole, mai «undefined».
  await page.addInitScript(() => {
    (window as unknown as { Worker: unknown }).Worker = class {
      onerror: ((e: Event) => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(new Event("error")), 0);
      }
      terminate() {}
    };
  });
  await apriLaPagina(page, paginaDiProva([{ testo: "// non parte" }], { lingua: "it", titolo: "non parte" }));
  const n = await esegui(page, "");
  expect(n.esito).toBe("imprevisto");
  expect(n.err).toBe(testiDellaPagina.it.nonParte);
});

test("la forma: la riga dell'errore segnata e in vista, il numero è quello del file; due colonne, una sola se è stretta; la lingua della pagina", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  const q = delCorpus("tipi/stringa-per-valore-da-un-campo");
  const g = javascript.genera(q.progetto, tetti, "it", paroleDelloPseudocodice("it"));
  if (!g.generato) throw new Error(q.nome);
  await apriLaPagina(page, paginaDiProva(g.righe, { lingua: "it", titolo: q.nome }));
  // Ogni riga del testo è nel codice mostrato, con gli import, al suo numero.
  const mostrate = await page.locator("#codice .riga").allTextContents();
  expect(mostrate.map((r) => r.replace(/\n$/, ""))).toEqual(g.righe.map((r) => r.testo));
  expect(g.righe.some((r) => r.delMotore === true)).toBe(true);
  const f = await esegui(page, "Anna\nAlessandro Magno\n");
  expect(f.esito).toBe("errore");
  const n = Number(/^Errore alla riga (\d+):/.exec(f.err)![1]);
  await expect(page.locator(".riga.segnata")).toHaveCount(1);
  await expect(page.locator(".riga.segnata")).toHaveAttribute("data-riga", String(n));
  await expect(page.locator(".riga.segnata")).toBeInViewport();
  // Rieseguito e finito bene, nessuna riga resta segnata.
  expect((await esegui(page, "Anna\nBen\n")).esito).toBe("finito");
  await expect(page.locator(".riga.segnata")).toHaveCount(0);
  await expect(page.locator("#stato")).toHaveText(testiDellaPagina.it.finito);
  const posti = () =>
    page.evaluate(() => {
      const codice = document.querySelector(".codice")!.getBoundingClientRect();
      const input = document.getElementById("input")!.getBoundingClientRect();
      return { aDestra: input.left >= codice.right, sotto: input.top >= codice.bottom, fuori: document.documentElement.scrollWidth > window.innerWidth };
    });
  expect(await posti()).toEqual({ aDestra: true, sotto: false, fuori: false });
  await page.setViewportSize({ width: 600, height: 800 });
  expect(await posti()).toEqual({ aDestra: false, sotto: true, fuori: false });
  const scelta = scegliColonne(undefined);
  if ("motivo" in scelta) throw new Error(scelta.motivo);
  await apriLaPagina(page, paginaDiProvaDelProgetto(q.progetto, scelta.colonne[1], "en")!);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#esegui")).toHaveText(testiDellaPagina.en.esegui);
  await expect(page.locator("h1")).toContainText("test");
});
