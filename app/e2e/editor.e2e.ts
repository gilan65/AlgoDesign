// Inserire e togliere dall'interfaccia, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima
// del build).
//
// L'albero si legge dall'ALBERO DELL'ACCESSIBILITÀ che il motore calcola (`ariaSnapshot`): i gruppi delle
// sequenze, i pulsanti dei blocchi e dei «+», coi loro nomi. È la struttura costruita dal progetto in
// memoria, non dal disegno: dove sta il «+» sullo schermo non entra mai nel confronto. Il posto atteso di
// ogni «+» e i nomi attesi si ricavano qui camminando l'albero del file (rilevatore indipendente dal
// modulo che costruisce la struttura).
//
// - Inserimento: il clic su ogni «+» del riferimento, poi «Assegnazione» nell'elenco, mette il blocco
//   nuovo nella sequenza e nella posizione di quel posto (i suoi campi si aprono: Esc li chiude senza
//   passi); dopo, Ctrl+Z riporta l'albero com'era. I campi del blocco nuovo stanno SUBITO accanto al blocco
//   (sotto, o sopra se sotto non c'è posto), letti appena il blocco compare, senza premere tasti.
//   Controllo positivo: il «+» accanto mette il blocco in un altro posto, e il rilevatore lo dice; il
//   rilevatore della posizione, a ogni inserimento, non dice «accanto» del riquadro messo in (0, 0).
// - Annulla e ripeti: sette operazioni (inserire due generi, cancellare con Canc e dalla barra, copiare
//   e incollare con Ctrl+V, tagliare dalla barra e incollare dall'elenco) annullate tutte tornano all'albero iniziale, ripetute
//   tutte a quello finale; coi tasti e coi pulsanti. Controllo positivo: un passo in meno non torna.
// - Tastiera e nomi: col Tab si passa dai valori iniziali, poi da ogni «+» e da ogni blocco nell'ordine del flusso, ognuno col nome
//   atteso; un blocco si inserisce, si cancella, si copia e si incolla solo da tastiera. Controllo
//   positivo: un blocco senza nome.
// - Scala minima: col carattere a 5 px, le etichette Vero e Falso non toccano le forme né fra loro, sul
//   riferimento e su 40 alberi generati. Controllo positivo: le etichette ingrandite.
//
// CHE COSA NON GUARDA:
// - dove sta il «+» rispetto alla linea (lo prova l'impaginazione, `impaginazione.test.ts`), né che il
//   clic del puntatore cada sul «+» giusto quando due aree si toccano alla scala minima;
// - l'aspetto dei «+», la loro comparsa al passaggio del puntatore, il contorno della selezione;
// - il testo nelle forme alla scala minima (lo guarda `disegno.e2e.ts` al 100%);
// - un lettore di schermo vero: qui l'albero dell'accessibilità del motore;
// - due blocchi con lo stesso nome nella stessa sequenza (il riferimento non ne ha: asserito);
// - la posizione dei campi di un blocco che si apre col doppio clic o con Invio (lì il blocco c'era già), né
//   dopo che il blocco cambia altezza mentre si scrive; e la posizione nel pannello a destra.

import { expect, test, type Page } from "@playwright/test";
import { alberoGenerato } from "../core/disegno/alberi-di-prova";
import type { Blocco, Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { albero, bloccoDiNome, doveSta, nomeBlocco, RIFERIMENTO, riferimento, senzaNome, stato } from "./albero";
import { aggiungiStile, apri, apriEsempio, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

interface PostoAtteso {
  /** Il nome del gruppo della sequenza. */
  sequenza: string;
  indice: number;
  /** Il nome del «+». */
  nome: string;
}

/** Nell'ordine del flusso: i «+» col loro posto, e i nomi dei valori iniziali (letterali, nel riferimento), dei «+» e
 * dei blocchi come li attraversa il Tab. */
function attesiDi(f: Funzione): { posti: PostoAtteso[]; ordine: string[]; blocchi: number; valori: number } {
  const posti: PostoAtteso[] = [];
  const ordine: string[] = [];
  let blocchi = 0;
  const seq = (s: readonly Blocco[], sequenza: string) => {
    const punto = (indice: number) => {
      const nome = `${sequenza}: inserisci al posto ${indice + 1} di ${s.length + 1}`;
      posti.push({ sequenza, indice, nome });
      ordine.push(nome);
    };
    s.forEach((b, i) => {
      punto(i);
      blocchi++;
      const n = nomeBlocco(b);
      if (b.kind === "repeat") seq(b.body, `Corpo di «${n}»`);
      ordine.push(n);
      if (b.kind === "if") seq(b.then, `Ramo Vero di «${n}»`), seq(b.else, `Ramo Falso di «${n}»`);
      if (b.kind === "while") seq(b.body, `Corpo di «${n}»`);
    });
    punto(s.length);
  };
  // I valori iniziali dei dati vengono prima, nell'ordine della vista: il Tab li attraversa per primi.
  ordine.push(...f.data.filter((d) => d.initial !== undefined).map((d) => `${it.bloccoAssegnazione}: ${d.name} ← ${d.initial as string}`));
  const valori = ordine.length;
  seq(f.body, it.sequenzaPrincipale);
  return { posti, ordine, blocchi, valori };
}

const flowchartDi = (page: Page, nome = RIFERIMENTO) => page.getByRole("group", { name: `${it.flowchart}: ${nome}`, exact: true });
const punto = (page: Page, nome: string) => page.getByRole("button", { name: nome, exact: true });
const voce = (page: Page, nome: string) => page.getByRole("menuitem", { name: nome, exact: true });
const nella = (page: Page, nome: string) => page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: nome, exact: true });

// ------------------------------------------------------------------------------- inserimento

test("il clic su ogni «+» del riferimento inserisce il blocco nella sequenza e nella posizione di quel posto; Ctrl+Z lo toglie", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const { posti, ordine, blocchi, valori } = attesiDi(riferimento);
  const iniziale = await stato(flowchart);
  // Le premesse: ogni nome dei «+» e dei blocchi una volta sola (un valore iniziale può avere il nome di un blocco: nel
  // riferimento «i ← 0»), e un «+» per posto.
  const dellAlbero = ordine.slice(valori);
  expect(new Set(dellAlbero).size).toBe(dellAlbero.length);
  await expect(flowchart.locator("[data-punto]")).toHaveCount(posti.length);

  const NUOVO = `${it.bloccoAssegnazione}: ${it.bloccoSenzaTesto}`;
  const campiDelNuovo = page.getByRole("form", { name: riempi(it.modificaDelBlocco, { blocco: NUOVO }), exact: true });
  /** Il riquadro dei campi sta accanto al blocco (sotto, o sopra se sotto non c'è posto), allineato a sinistra
   * quanto la finestra lo permette: lo dice la posizione letta SUBITO, senza aspettare né premere tasti. */
  const accanto = (r: { left: number; top: number; bottom: number }, f: { left: number; top: number; bottom: number; width: number }, larghezza: number) =>
    (Math.abs(f.top - (r.bottom + 8)) <= 1 || Math.abs(f.bottom - (r.top - 8)) <= 1) && Math.abs(f.left - Math.max(Math.min(r.left, larghezza - f.width), 0)) <= 1;
  /** Clic sul «+» col nome dato, «Assegnazione»: dove finisce il blocco nuovo, e dove stanno i suoi campi. */
  async function inserisciDa(nome: string) {
    await punto(page, nome).click();
    await voce(page, it.bloccoAssegnazione).click();
    // Un blocco che non compare (l'operazione rifiutata) è un esito da registrare, non un'attesa scaduta.
    await flowchart.getByRole("button", { name: NUOVO, exact: true }).first().waitFor({ timeout: 2_000 }).catch(() => undefined);
    // Le due posizioni nello stesso istante, rispetto alla finestra (come le legge l'app).
    const blocco = flowchart.getByRole("button", { name: NUOVO, exact: true });
    const posizione =
      (await campiDelNuovo.count()) === 1 && (await blocco.count()) === 1
        ? await campiDelNuovo.evaluate(
            (f, b) => {
              const { left, top, bottom, width } = f.getBoundingClientRect();
              const suo = b.getBoundingClientRect();
              return { campi: { left, top, bottom, width }, larghezza: innerWidth, blocco: { left: suo.x, top: suo.y, bottom: suo.y + suo.height } };
            },
            await blocco.elementHandle(),
          )
        : null;
    return { visti: doveSta(await albero(flowchart), NUOVO), posizione };
  }
  const sbagliati: string[] = [];
  const fuoriPosto: string[] = [];
  let tornati = 0;
  for (const p of posti) {
    const { visti, posizione } = await inserisciDa(p.nome);
    if (visti.length !== 1 || visti[0]!.sequenza !== p.sequenza || visti[0]!.indice !== p.indice) sbagliati.push(`${p.nome} → ${JSON.stringify(visti)}`);
    if (!posizione?.blocco || !accanto(posizione.blocco, posizione.campi, posizione.larghezza)) fuoriPosto.push(`${p.nome}: campi ${JSON.stringify(posizione?.campi)}, blocco ${JSON.stringify(posizione?.blocco)}`);
    // Controllo positivo del rilevatore: il riquadro in (0, 0) non è accanto al blocco.
    if (posizione?.blocco && accanto(posizione.blocco, { ...posizione.campi, left: 0, top: 0, bottom: posizione.campi.bottom - posizione.campi.top }, posizione.larghezza))
      fuoriPosto.push(`${p.nome}: il rilevatore direbbe «accanto» anche al riquadro in (0, 0)`);
    if (visti.length > 0) {
      // I campi del blocco nuovo hanno il fuoco (lì Ctrl+Z è del campo): Esc li chiude, poi si annulla.
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+z");
    }
    await expect(flowchart.getByRole("button", { name: NUOVO, exact: true })).toHaveCount(0);
    if ((await stato(flowchart)) === iniziale) tornati++;
  }
  console.log(`[${info.project.name}] inserimento dai «+» del riferimento: posti ${posti.length}, blocchi ${blocchi}, sbagliati ${sbagliati.length}, campi non accanto al blocco ${fuoriPosto.length}, tornati all'albero iniziale con Ctrl+Z ${tornati}`);
  expect(sbagliati).toEqual([]);
  expect(fuoriPosto).toEqual([]);
  expect(tornati).toBe(posti.length);
  expect(posti.length).toBe(35);

  // Controllo positivo: il «+» accanto (quello dopo) al posto del primo; il rilevatore vede il posto diverso.
  const { visti } = await inserisciDa(posti[1]!.nome);
  expect(visti).toHaveLength(1);
  expect(visti[0]!.sequenza === posti[0]!.sequenza && visti[0]!.indice === posti[0]!.indice).toBe(false);
});

// ------------------------------------------------------------------------------- annulla e ripeti

test("sette operazioni annullate tutte tornano all'albero iniziale e ripetute tutte a quello finale, coi tasti e coi pulsanti", async ({ page }, info) => {
  // Limite dichiarato: 22-26 s in WebKit coi quattro progetti in parallelo (il predefinito è 30).
  test.setTimeout(90_000);
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const { posti } = attesiDi(riferimento);
  const istantanee = [await stato(flowchart)];
  const fatto = async () => {
    const s = await stato(flowchart);
    expect(s).not.toBe(istantanee.at(-1));
    istantanee.push(s);
  };
  const principale = posti.filter((p) => p.sequenza === it.sequenzaPrincipale);

  // 1. un «se» in testa al programma; 2. una lettura nel suo ramo Vero. Le istantanee si prendono coi campi chiusi da
  // Esc: aperti, un blocco appena inserito non mostra il suo errore, e tornati lì con Annulla (i campi chiusi) sì.
  await punto(page, principale[0]!.nome).click();
  await voce(page, it.bloccoSe).click();
  // I campi del «se» nuovo stanno sotto il rombo e coprono il «+» del suo ramo Vero (misurato nei due motori):
  // come farebbe una persona, Esc li chiude prima del clic.
  await page.keyboard.press("Escape");
  await fatto();
  await punto(page, `Ramo Vero di «${it.bloccoSe}: ${it.bloccoSenzaTesto}»: inserisci al posto 1 di 1`).click();
  await voce(page, it.bloccoLettura).click();
  await page.keyboard.press("Escape");
  await fatto();
  // 3. cancellato con Canc il commento; 4. dalla barra «i ← 0».
  await bloccoDiNome(flowchart, nomeBlocco(riferimento.body[0]!)).click();
  await page.keyboard.press("Delete");
  await fatto();
  await bloccoDiNome(flowchart, "Assegnazione: i ← 0").click();
  await nella(page, it.elimina).click();
  await fatto();
  // 5. copiato «leggi voto» e incollato con Ctrl+V sull'ultimo «+» del programma.
  await bloccoDiNome(flowchart, "Lettura: voto").click();
  await page.keyboard.press("Control+c");
  const ultimoPunto = flowchart.getByRole("group", { name: it.sequenzaPrincipale, exact: true }).getByRole("button", { name: /^Programma principale: inserisci al posto (\d+) di \1$/ });
  await ultimoPunto.focus();
  await page.keyboard.press("Control+v");
  await fatto();
  await expect(bloccoDiNome(flowchart, "Lettura: voto")).toHaveCount(2);
  // 6. tagliato «leggi n» dalla barra e incollato dall'elenco del primo «+».
  await bloccoDiNome(flowchart, "Lettura: n").click();
  await nella(page, it.taglia).click();
  await fatto();
  await punto(page, `${it.sequenzaPrincipale}: inserisci al posto 1 di 6`).click();
  await voce(page, it.incolla).click();
  await fatto();
  const operazioni = istantanee.length - 1;

  // Annulla tutto: Ctrl+Z e il pulsante, alternati.
  for (let i = operazioni; i > 0; i--) {
    expect(await nella(page, it.annulla).getAttribute("aria-disabled"), `un passo non è entrato nella cronologia: «${it.annulla}» spento con ${i} passi da annullare`).toBe("false");
    if (i % 2 === 0) await page.keyboard.press("Control+z");
    else await nella(page, it.annulla).click();
    await expect.poll(() => stato(flowchart)).toBe(istantanee[i - 1]);
  }
  await expect(nella(page, it.annulla)).toHaveAttribute("aria-disabled", "true");
  // Ripeti tutto: Ctrl+Y, Ctrl+Maiusc+Z e il pulsante.
  for (let i = 1; i <= operazioni; i++) {
    if (i % 3 === 0) await page.keyboard.press("Control+y");
    else if (i % 3 === 1) await page.keyboard.press("Control+Shift+z");
    else await nella(page, it.ripeti).click();
    await expect.poll(() => stato(flowchart)).toBe(istantanee[i]);
  }
  await expect(nella(page, it.ripeti)).toHaveAttribute("aria-disabled", "true");
  console.log(`[${info.project.name}] annulla e ripeti: operazioni ${operazioni}, istantanee diverse ${new Set(istantanee).size}`);
  expect(operazioni).toBe(7);
  expect(new Set(istantanee).size).toBe(istantanee.length);

  // Controllo positivo: un passo in meno annullato non torna all'albero iniziale.
  for (let i = 0; i < operazioni - 1; i++) await page.keyboard.press("Control+z");
  expect(await stato(flowchart)).not.toBe(istantanee[0]);
});

// ------------------------------------------------------------------------------- tastiera e nomi

test("un blocco appena inserito tace finché i suoi campi sono aperti: chiusi con Esc, il suo errore compare nello stesso disegno", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const { posti } = attesiDi(riferimento);
  await punto(page, posti.find((p) => p.sequenza === it.sequenzaPrincipale)!.nome).click();
  await voce(page, it.bloccoAssegnazione).click();
  const nuovo = page.getByRole("button", { name: `${it.bloccoAssegnazione}: ${it.bloccoSenzaTesto}`, exact: true });
  await expect(page.locator("form")).toBeVisible();
  // Aperti i campi: nessun segno d'errore sul blocco nuovo.
  expect(await nuovo.getAttribute("aria-invalid")).toBeNull();
  // Ogni disegno dopo Esc, come lo vede un osservatore del documento: i campi ci sono, il blocco è segnato.
  await page.evaluate(() => {
    const disegni: { campi: boolean; segnato: boolean }[] = [];
    const guarda = () => {
      const b = [...document.querySelectorAll("[data-blocco]")].find((x) => x.getAttribute("aria-label")?.endsWith(": senza testo"));
      disegni.push({ campi: document.querySelector("form") !== null, segnato: b?.getAttribute("aria-invalid") === "true" });
    };
    new MutationObserver(guarda).observe(document.body, { subtree: true, childList: true, attributes: true });
    Object.assign(window, { __disegni__: disegni });
  });
  await page.keyboard.press("Escape");
  await expect(nuovo).toHaveAttribute("aria-invalid", "true");
  const disegni = await page.evaluate(() => (window as unknown as { __disegni__: { campi: boolean; segnato: boolean }[] }).__disegni__);
  // Premessa: l'osservatore ha visto la chiusura dei campi.
  expect(disegni.some((d) => !d.campi)).toBe(true);
  expect(disegni.filter((d) => !d.campi && !d.segnato), `un disegno coi campi chiusi e il blocco senza segno: ${JSON.stringify(disegni)}`).toEqual([]);
});

test("col Tab si passa da ogni «+» e da ogni blocco nell'ordine del flusso, col nome atteso; si inserisce, si cancella, si copia e si incolla da tastiera", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  const { ordine, posti, blocchi } = attesiDi(riferimento);

  // Dal primo «+», Tab fino a uscire dal flowchart.
  const nomeDelFuoco = () => page.evaluate(() => (document.activeElement?.closest("svg") ? (document.activeElement.getAttribute("aria-label") ?? "") : null));
  await punto(page, ordine[0]!).focus();
  const visti: string[] = [];
  for (let i = 0; i < ordine.length + 5; i++) {
    const n = await nomeDelFuoco();
    if (n === null) break;
    visti.push(n);
    await page.keyboard.press("Tab");
  }
  console.log(`[${info.project.name}] tastiera: fermate del Tab ${visti.length} (attese ${ordine.length}: «+» ${posti.length}, blocchi ${blocchi}), senza nome ${senzaNome(await albero(flowchart))}`);
  expect(visti).toEqual(ordine);
  expect(senzaNome(await albero(flowchart))).toBe(0);

  // Esc sull'elenco lo chiude e torna al «+».
  await punto(page, posti[0]!.nome).focus();
  await page.keyboard.press("Enter");
  await expect(voce(page, it.bloccoAssegnazione)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(punto(page, posti[0]!.nome)).toBeFocused();
  // Inserire da tastiera: Invio sul «+», freccia giù, Invio. Il fuoco va nei campi del blocco nuovo; Esc li
  // chiude e lo porta sul blocco.
  await page.keyboard.press("Enter");
  await expect(voce(page, it.bloccoAssegnazione)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const nuovo = flowchart.getByRole("button", { name: `${it.bloccoLettura}: ${it.bloccoSenzaTesto}`, exact: true });
  await expect(page.getByRole("textbox", { name: it.campoDestinazione, exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(nuovo).toBeFocused();
  // Cancellare: Canc sul blocco; il fuoco va sul «+» del suo posto.
  await nuovo.focus();
  await page.keyboard.press("Delete");
  await expect(nuovo).toHaveCount(0);
  await expect(punto(page, posti[0]!.nome)).toBeFocused();
  // Copiare e incollare: Ctrl+C su «i ← 0», Tab fino all'ultimo «+» del programma, Ctrl+V.
  await bloccoDiNome(flowchart, "Assegnazione: i ← 0").focus();
  await page.keyboard.press("Control+c");
  const ultimo = `${it.sequenzaPrincipale}: inserisci al posto 6 di 6`;
  for (let i = 0; i < ordine.length && (await nomeDelFuoco()) !== ultimo; i++) await page.keyboard.press("Tab");
  await expect(punto(page, ultimo)).toBeFocused();
  await page.keyboard.press("Control+v");
  await expect(bloccoDiNome(flowchart, "Assegnazione: i ← 0")).toHaveCount(2);
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", "Assegnazione: i ← 0");
  expect(doveSta(await albero(flowchart), "Assegnazione: i ← 0")).toEqual([
    { sequenza: it.sequenzaPrincipale, indice: 2 },
    { sequenza: it.sequenzaPrincipale, indice: 5 },
  ]);

  // Controllo positivo: un blocco senza nome si vede.
  await flowchart.locator("[data-blocco]").first().evaluate((g) => g.removeAttribute("aria-label"));
  expect(senzaNome(await albero(flowchart))).toBe(1);
});

// ------------------------------------------------------------------------------- scala minima

const generati = Array.from({ length: 40 }, (_, i) => ({ nome: `generato-${i + 1}`, titolo: `generato-${i + 1}`, funzione: alberoGenerato(1000 + i) }));

/** Le etichette che toccano una forma o un'altra etichetta, in pixel dello schermo. */
function etichetteCheToccano(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[role="group"]')!;
    const r = (e: Element) => e.getBoundingClientRect();
    const tocca = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.25 && b.left < a.right - 0.25 && a.top < b.bottom - 0.25 && b.top < a.bottom - 0.25;
    const forme = [...svg.querySelectorAll("g[data-forma]")].map((g) => ({ nome: g.getAttribute("data-id")!, r: r(g.firstElementChild!) }));
    const etichette = [...svg.querySelectorAll("text[data-etichetta]")].map((t, i) => ({ nome: `etichetta ${i}`, r: r(t) }));
    const difetti: string[] = [];
    etichette.forEach((e, i) => {
      for (const f of forme) if (tocca(e.r, f.r)) difetti.push(`${e.nome} tocca ${f.nome}`);
      for (const altra of etichette.slice(i + 1)) if (tocca(e.r, altra.r)) difetti.push(`${e.nome} tocca ${altra.nome}`);
    });
    const scala = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const carattere = Math.min(...[...svg.querySelectorAll("text")].map((t) => parseFloat(getComputedStyle(t).fontSize) * scala));
    return { difetti, etichette: etichette.length, forme: forme.length, carattere };
  });
}

test("alla scala minima (carattere di 5 px) le etichette Vero e Falso non toccano le forme né fra loro", async ({ page }, info) => {
  // Limite dichiarato: 41 disegni aperti uno per uno; 45–53 s in WebKit nel collaudo, oltre 120 s in quattro
  // giri su sei con tre ripetizioni di tutti gli spec (misurato quando la costruzione dall'interfaccia ha
  // aggiunto due prove lunghe).
  test.setTimeout(240_000);
  const esempi = [{ nome: RIFERIMENTO, titolo: RIFERIMENTO, funzione: riferimento }, ...generati];
  await apri(page, { lingua: "it" }, undefined, esempi);
  const zoom = page.getByRole("group", { name: it.zoom, exact: true });
  for (let i = 0; i < 10; i++) await zoom.getByRole("button", { name: it.zoomRiduci, exact: true }).click();
  await expect(zoom.locator('[data-comando="cento"]')).toHaveText("33%");
  let [disegni, etichette, forme, minimo] = [0, 0, 0, Infinity];
  const difetti: string[] = [];
  for (const [i, e] of esempi.entries()) {
    if (i > 0) await apriEsempio(page, i);
    await expect(flowchartDi(page, e.nome)).toBeVisible();
    const m = await etichetteCheToccano(page);
    difetti.push(...m.difetti.map((d) => `${e.nome}: ${d}`));
    disegni++;
    etichette += m.etichette;
    forme += m.forme;
    minimo = Math.min(minimo, m.carattere);
  }
  console.log(`[${info.project.name}] scala minima: disegni ${disegni}, forme ${forme}, etichette ${etichette}, carattere ${minimo.toFixed(2)} px, difetti ${difetti.length}`);
  expect(difetti.slice(0, 10)).toEqual([]);
  expect(disegni).toBe(41);
  expect(etichette).toBeGreaterThan(40);
  expect(minimo).toBeCloseTo(5, 1);

  // Controllo positivo: le etichette ingrandite toccano.
  await aggiungiStile(page, "[data-etichetta] { font-size: 60px !important; }");
  expect((await etichetteCheToccano(page)).difetti.length).toBeGreaterThan(0);
});
