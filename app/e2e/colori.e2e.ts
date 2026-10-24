// I colori dei singoli generi di blocco nei motori, sul programma di riferimento con le funzioni (ogni genere di blocco,
// un ciclo «per» col suo riquadro).
//
// - Il contrasto calcolato dal motore su ogni scelta che l'interfaccia permette: ogni tinta dei blocchi su ogni genere
//   (il testo sul riempimento almeno 4,5:1), ogni tinta del riquadro (la linea sullo sfondo almeno 3:1; etichette, bordi e
//   linee dentro il riquadro sul suo fondo colorato), e «Come l'insieme»; nei tre insiemi, in chiaro e in scuro. Le
//   tinte entrano con le stesse variabili che scrive l'app (`variabiliDei`), una dopo l'altra sulla stessa pagina. Le
//   premesse: ogni forma ha davvero la tinta (il colore letto dal motore), e nei «Tenui» e nel «Contrasto forte» i
//   colori dell'insieme distinguono il «se» dai cicli, l'assegnazione dalla procedura, la lettura dalla scrittura.
// - Il file delle preferenze scritto a mano: ogni genere per sé, quello che non si legge col colore dell'insieme.
// - Le Impostazioni: la scelta si vede nel blocco d'esempio e non nel flowchart, e così un altro insieme scelto nella
//   copia (il blocco d'esempio di un genere «Come l'insieme» prende il suo colore); «Annulla» non applica e non scrive;
//   «Conferma» applica e scrive; il progetto non risulta modificato, e Ctrl+Z non tocca i colori (una preferenza, non
//   una modifica del progetto).
//
// CHE COSA NON GUARDA:
// - WebKit nel collaudo predefinito (corre solo Chromium), la WebView del prodotto;
// - il contrasto delle forme d'esempio nelle Impostazioni (le stesse classi e variabili del flowchart, sullo sfondo
//   della finestra, che è quello del flowchart);
// - quanto due tinte vicine si distinguano a occhio (le distanze sono misurate a parte, nella registrazione delle scelte);
// - il riquadro della copia di un vettore (le stesse classi del riquadro dei cicli).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { generiColorati, tinteDeiBlocchi, tinteDelRiquadro, variabiliDei, type GenereColorato } from "../ui/colori";
import { voci } from "../ui/preferenze";
import { contrasto, coppieSulFondo, sotto } from "./contrasto";
import { aggiungiStile, apriEsempio, apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);

// Il programma principale ha ogni genere di blocco tranne il commento (sta in `leggi_numero`): qui gliene si aggiunge uno.
const programma = (() => {
  const p = JSON.parse(readFileSync(fileURLToPath(new URL("../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8")) as { functions: { kind: string; body: unknown[] }[] };
  p.functions.find((f) => f.kind === "main")!.body.unshift({ id: "b90", kind: "comment", text: "una nota" });
  return JSON.stringify(p, null, 2);
})();
const deiBlocchi = generiColorati.filter((g) => g !== "riquadro");

async function apriIlProgramma(page: Page, salvate: Record<string, unknown>): Promise<void> {
  await apriVuota(page, { lingua: "it", ...salvate }, { esempi: { "1 funzioni.algo": programma } });
  await apriEsempio(page, 0);
  await expect(page.locator('svg[role="group"] g[data-forma="chiamata"]').first()).toBeVisible();
}

/** Le forme del flowchart col loro genere, il riempimento e il testo, come li calcola il motore; e lo sfondo. */
function forme(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[role="group"]')!;
    const genere = (g: SVGGElement) =>
      ({ inizio: "inizio-e-fine", fine: "inizio-e-fine", assegnazione: "assegnazione", chiamata: "procedura", lettura: "lettura", scrittura: "scrittura", commento: "commento" })[
        g.dataset.forma!
      ] ?? (g.dataset.forma === "condizione" ? (g.dataset.ciclo !== undefined ? "cicli" : "se") : undefined);
    return [...svg.querySelectorAll<SVGGElement>("g[data-forma]")].flatMap((g) => {
      const v = genere(g);
      return v === undefined ? [] : [{ genere: v, fondo: getComputedStyle(g.firstElementChild!).fill, testo: getComputedStyle(g.querySelector("text")!).fill }];
    });
  });
}

/** Il colore di una variabile, come lo calcola il motore (su un elemento di prova; con un insieme, nel suo). */
const coloreDi = (page: Page, variabile: string, insieme?: string) =>
  page.evaluate(
    ({ v, insieme }) => {
      const prova = document.createElement("span");
      prova.style.color = `var(${v})`;
      if (insieme !== undefined) prova.dataset.colori = insieme;
      document.body.append(prova);
      const c = getComputedStyle(prova).color;
      prova.remove();
      return c;
    },
    { v: variabile, insieme },
  );

/** Le variabili dei generi sulla radice: quelle date, e nessun'altra. */
const variabili = (page: Page, v: Record<string, string>) =>
  page.evaluate(
    ({ v, generi }) => {
      const r = document.documentElement;
      for (const g of generi) r.style.removeProperty(`--blocco-${g}`);
      for (const [k, x] of Object.entries(v)) r.style.setProperty(k, x);
    },
    { v, generi: [...generiColorati] },
  );

/** La linea di ogni riquadro sullo sfondo dell'area, col colore che ha. */
const lineeDeiRiquadri = (page: Page) =>
  page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[role="group"]')!;
    let sopra: Element | null = svg.parentElement;
    let sfondo = "rgba(0, 0, 0, 0)";
    while (sopra && /rgba\(0, 0, 0, 0\)|transparent/.test(sfondo)) {
      sfondo = getComputedStyle(sopra).backgroundColor;
      sopra = sopra.parentElement;
    }
    return [...svg.querySelectorAll("rect[data-riquadro]")].map((r) => ({ linea: getComputedStyle(r).stroke, sfondo }));
  });

test("il contrasto di ogni tinta su ogni genere e del riquadro, e dei colori di ogni insieme, in chiaro e in scuro", async ({ context }, info) => {
  test.setTimeout(240_000);
  let pagine = 0;
  let provate = 0;
  const esiti: string[] = [];
  for (const colori of voci.colori)
    for (const schema of ["light", "dark"] as const) {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: schema, reducedMotion: "reduce" });
      await apriIlProgramma(page, { colori, fondoDeiCicli: true });
      expect(await page.evaluate(() => document.documentElement.dataset.colori)).toBe(colori);
      let minimoDelTesto = Infinity;
      let minimoDellaLinea = Infinity;
      const misuraIBlocchi = async (cosa: string, atteso: string | null) => {
        const fs = await forme(page);
        // Le premesse: ogni genere di blocco c'è, e con la tinta data ha davvero quella.
        expect(new Set(fs.map((f) => f.genere)), cosa).toEqual(new Set(deiBlocchi));
        if (atteso !== null) expect(fs.filter((f) => f.fondo !== atteso).map((f) => `${f.genere} ${f.fondo}`), cosa).toEqual([]);
        const bassi = fs.filter((f) => contrasto(f.testo, f.fondo) < 4.5).map((f) => `${f.genere} ${contrasto(f.testo, f.fondo).toFixed(2)}`);
        expect(bassi, `${colori} ${schema} ${cosa}`).toEqual([]);
        minimoDelTesto = Math.min(minimoDelTesto, ...fs.map((f) => contrasto(f.testo, f.fondo)));
        return fs;
      };
      const misuraIlRiquadro = async (cosa: string, atteso: string | null) => {
        const linee = await lineeDeiRiquadri(page);
        expect(linee.length, cosa).toBeGreaterThan(0);
        if (atteso !== null) expect(linee.every((l) => l.linea === atteso), cosa).toBe(true);
        for (const l of linee) {
          expect(contrasto(l.linea, l.sfondo), `${colori} ${schema} ${cosa}: la linea`).toBeGreaterThanOrEqual(3);
          minimoDellaLinea = Math.min(minimoDellaLinea, contrasto(l.linea, l.sfondo));
        }
        const dentro = await coppieSulFondo(page);
        expect(dentro.some((c) => c.cosa.startsWith("etichetta")), cosa).toBe(true);
        expect(sotto(dentro), `${colori} ${schema} ${cosa}: sul fondo`).toEqual([]);
      };

      // «Come l'insieme»: i colori dell'insieme, che distinguono i generi vicini (non in «Bianco e nero»).
      const dellInsieme = await misuraIBlocchi("come l'insieme", null);
      await misuraIlRiquadro("come l'insieme", null);
      const fondo = (g: GenereColorato) => dellInsieme.find((f) => f.genere === g)!.fondo;
      if (colori !== "bianco-e-nero")
        for (const [a, b] of [["se", "cicli"], ["assegnazione", "procedura"], ["lettura", "scrittura"]] as const) expect(fondo(a), `${colori} ${schema}: ${a} e ${b}`).not.toBe(fondo(b));
      provate++;

      for (const tinta of tinteDeiBlocchi) {
        await variabili(page, variabiliDei(Object.fromEntries(deiBlocchi.map((g) => [g, tinta]))));
        await misuraIBlocchi(tinta, await coloreDi(page, `--tinta-${tinta}`));
        provate++;
      }
      for (const tinta of tinteDelRiquadro) {
        await variabili(page, variabiliDei({ riquadro: tinta }));
        await misuraIlRiquadro(tinta, await coloreDi(page, `--tinta-${tinta}`));
        provate++;
      }
      esiti.push(`${colori} ${schema}: il testo più basso ${minimoDelTesto.toFixed(2)}:1, la linea del riquadro più bassa ${minimoDellaLinea.toFixed(2)}:1`);

      // Controllo positivo: il «se» col colore del testo e il riquadro col colore dello sfondo scendono sotto la soglia.
      await variabili(page, {});
      await aggiungiStile(page, ":root { --blocco-se: var(--colore-testo) !important; --blocco-riquadro: var(--colore-sfondo) !important; }");
      expect((await forme(page)).some((f) => f.genere === "se" && contrasto(f.testo, f.fondo) < 4.5)).toBe(true);
      expect((await lineeDeiRiquadri(page)).some((l) => contrasto(l.linea, l.sfondo) < 3)).toBe(true);
      pagine++;
      await page.close();
    }
  console.log(`[${info.project.name}] colori dei generi: ${esiti.join("; ")}`);
  expect(pagine).toBe(6);
  expect(provate).toBe(6 * (1 + tinteDeiBlocchi.length + tinteDelRiquadro.length));
});

test("il file delle preferenze scritto a mano: ogni genere per sé, quello che non si legge col colore dell'insieme; già al primo disegno", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Quando l'interfaccia mette il primo elemento nella pagina, i colori letti sono già sulla radice (li scrive l'effetto
  // dell'applicazione, prima che la pagina si disegni): altrimenti il primo disegno nascerebbe coi colori dell'insieme e
  // sfumerebbe verso quelli scelti.
  await page.addInitScript(() => {
    const o = new MutationObserver(() => {
      if ((document.getElementById("radice")?.childElementCount ?? 0) === 0) return;
      Object.assign(window, { __alPrimoDisegno__: document.documentElement.style.getPropertyValue("--blocco-se") });
      o.disconnect();
    });
    o.observe(document, { childList: true, subtree: true });
  });
  await apriIlProgramma(page, { coloriDeiBlocchi: { se: "verde", procedura: "sabbia-intenso", cicli: "giallo", lettura: "linea-verde", salto: "verde", commento: 3 } });
  const fs = await forme(page);
  const fondi = (g: string) => [...new Set(fs.filter((f) => f.genere === g).map((f) => f.fondo))];
  expect(fondi("se")).toEqual([await coloreDi(page, "--tinta-verde")]);
  expect(fondi("procedura")).toEqual([await coloreDi(page, "--tinta-sabbia-intenso")]);
  for (const g of ["cicli", "lettura", "commento"]) expect(fondi(g), g).toEqual([await coloreDi(page, `--disegno-${g}`)]);
  // Sulla radice solo le variabili dei due generi letti.
  expect(await page.evaluate(() => [...document.documentElement.style].filter((p) => p.startsWith("--blocco-")).sort())).toEqual(["--blocco-procedura", "--blocco-se"]);
  expect(await page.evaluate(() => (window as unknown as { __alPrimoDisegno__?: string }).__alPrimoDisegno__)).toBe("var(--tinta-verde)");
});

test("nelle Impostazioni: la scelta nel blocco d'esempio, «Annulla» che non applica né scrive, «Conferma» che applica e scrive; il progetto intatto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await apriIlProgramma(page, {});
  const se = page.locator('svg[role="group"] g[data-forma="condizione"]:not([data-ciclo]) > polygon').first();
  const ciclo = page.locator('svg[role="group"] g[data-forma="condizione"][data-ciclo] > polygon').first();
  const fill = (l: typeof se) => l.evaluate((p) => getComputedStyle(p).fill);
  const [seDiPartenza, cicloDiPartenza, verde] = [await fill(se), await fill(ciclo), await coloreDi(page, "--tinta-verde")];
  expect(seDiPartenza).not.toBe(verde);
  const stato = () => page.evaluate(() => ({ scritte: window.__finzione__.scritte.length, modificato: [...window.__finzione__.modificato], segnato: window.__finzione__.segnato }));
  const prima = await stato();

  const apriLe = async () => {
    await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
    const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
    await expect(f).toBeVisible();
    return f;
  };
  let f = await apriLe();
  const riga = f.getByRole("radiogroup", { name: it.bloccoSe, exact: true });
  await expect(riga.getByRole("radio", { name: it.coloriComeLInsieme, exact: true })).toBeChecked();
  await riga.getByRole("radio", { name: it.tintaVerde, exact: true }).check();
  // Il blocco d'esempio del «se» ha il verde; il flowchart ancora no.
  await expect.poll(() => riga.locator("svg polygon").evaluate((p) => getComputedStyle(p).fill)).toBe(verde);
  expect(await fill(se)).toBe(seDiPartenza);
  // Un altro insieme nella copia: il blocco d'esempio della procedura, «Come l'insieme», prende il colore del nuovo
  // insieme; il flowchart resta col suo.
  const procedura = page.locator('svg[role="group"] g[data-forma="chiamata"] > polygon').first();
  const [proceduraDiPartenza, delContrasto] = [await fill(procedura), await coloreDi(page, "--disegno-procedura", "contrasto")];
  expect(delContrasto).not.toBe(proceduraDiPartenza);
  await f.getByRole("radio", { name: it.coloriContrasto, exact: true }).check();
  await expect.poll(() => f.getByRole("radiogroup", { name: it.bloccoProcedura, exact: true }).locator("svg rect").first().evaluate((r) => getComputedStyle(r).fill)).toBe(delContrasto);
  expect(await fill(procedura)).toBe(proceduraDiPartenza);
  await f.getByRole("button", { name: it.annullaEsc, exact: true }).click();
  await expect(f).toBeHidden();
  expect(await fill(se)).toBe(seDiPartenza);
  expect(await stato()).toEqual(prima);

  f = await apriLe();
  await expect(f.getByRole("radiogroup", { name: it.bloccoSe, exact: true }).getByRole("radio", { name: it.coloriComeLInsieme, exact: true })).toBeChecked();
  await f.getByRole("radiogroup", { name: it.bloccoSe, exact: true }).getByRole("radio", { name: it.tintaVerde, exact: true }).check();
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
  await expect.poll(() => fill(se)).toBe(verde);
  expect(await fill(ciclo)).toBe(cicloDiPartenza);
  const dopo = await stato();
  expect(dopo.scritte).toBe(prima.scritte + 1);
  expect(await page.evaluate(() => (window.__finzione__.scritte.at(-1) as { preferenze: { coloriDeiBlocchi: unknown } }).preferenze.coloriDeiBlocchi)).toEqual({ se: "verde" });
  // Il progetto: nessuna modifica segnata, e Ctrl+Z non riporta i colori (non sono una modifica del progetto).
  expect({ modificato: dopo.modificato, segnato: dopo.segnato }).toEqual({ modificato: prima.modificato, segnato: prima.segnato });
  await page.locator("body").press("Control+z");
  expect(await fill(se)).toBe(verde);
  expect((await stato()).segnato).toBe(prima.segnato);
});
