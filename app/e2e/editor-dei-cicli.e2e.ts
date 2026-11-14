// I cicli `per` e `per ogni` nell'editor, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del
// build), su «parola al contrario» (un `per` col passo -1 e un `per ogni`, aperto come esempio). I posti si leggono
// dall'ALBERO DELL'ACCESSIBILITÀ (`ariaSnapshot`), il file da «Salva con nome» del guscio simulato.
//
// - Inserimento: «Per» dall'elenco di un «+» col clic, «Per ogni» da tastiera (Invio sul «+», frecce, Invio); il blocco
//   nuovo sta nel posto di quel «+», coi suoi campi aperti (Contatore, Da, A, Passo col segnaposto 1; Elemento, Vettore o
//   stringa).
// - I campi col controllo immediato: un passo che non è un numero intero dà l'errore del passo sotto i campi e Invio
//   non conferma (l'avviso lo dice); il passo zero, l'errore del controllo; un contatore che non è un dato, il suo
//   errore; il passo vuoto non si scrive nel file, «1» nemmeno (e non è un passo della cronologia), «-2» sì. Del `per
//   ogni`, una sorgente che non è un vettore né una stringa dà il suo errore.
// - Rinomina e conteggio degli usi: il dato rinominato cambia le intestazioni dei due cicli; la conferma prima di
//   eliminare il contatore e l'elemento conta le regole che li usano.
// - Trascinamento: un blocco dentro il corpo del `per ogni`; il `per ogni` col suo corpo fuori, in testa al programma;
//   il `per` dentro sé stesso no (l'avviso lo dice). Ognuno un passo solo.
//
// Controlli positivi: il rilevatore dei posti vede un posto diverso (il blocco nuovo non è al posto 2); il file salvato
// col passo -2 ha il passo; l'errore del passo sparisce col passo vuoto.
//
// CHE COSA NON GUARDA:
// - la costruzione di un programma intero coi cicli e il file confrontato con l'atteso (`costruzione.e2e.ts`);
// - il disegno dei cicli (`disegno.e2e.ts`) e la copia che segue il puntatore (`ui/disegno/bersaglio.test.ts`);
// - il campo del passo nel pannello a destra (il contenuto è lo stesso componente: lo prova la costruzione nel pannello
//   coi campi del `per` senza passo);
// - l'esecuzione dei cicli nella finestra (`ui/esecuzione/finestra.test.tsx`, `e2e/costruzione.e2e.ts`).

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { traduciEspressione } from "../core/disegno/lingua";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { testiDeiCodici } from "../i18n/codici";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { nomiDegliOperatori } from "../i18n/operatori";
import { albero, bloccoDiNome, doveSta, stato } from "./albero";
import { apri, costruisciFinzione, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const NOME = "parola al contrario";
const parola: Funzione = (() => {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL("../casi/tappa-2/parola-al-contrario.algo", import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error("«parola al contrario» non si apre");
  return esito.progetto.functions[0]!;
})();

const e = (t: string) => traduciEspressione(t, nomiDegliOperatori.it);
/** I nomi dei due cicli del programma, scritti qui dal file coi modelli del dizionario. */
const PER = `${it.bloccoPer}: ${riempi(it.contenutoPerConPasso, { contatore: "i", da: e("length parola - 1"), a: "0", passo: "-1" })}`;
const PER_OGNI = `${it.bloccoPerOgni}: ${riempi(it.contenutoPerOgni, { elemento: "c", sorgente: "parola" })}`;
const PRINCIPALE = it.sequenzaPrincipale;
const CORPO_PER_OGNI = riempi(it.sequenzaCorpo, { blocco: PER_OGNI });
const nomeDelPunto = (sequenza: string, n: number, totale: number) => riempi(it.nomeDelPunto, { sequenza, n: String(n), totale: String(totale) });
const senzaTesto = (genere: string) => riempi(it.nomeDelBlocco, { genere, testo: it.bloccoSenzaTesto });
const campiDi = (page: Page, nome: string) => page.getByRole("form", { name: riempi(it.modificaDelBlocco, { blocco: nome }), exact: true });
const errore = (codice: keyof (typeof testiDeiCodici)["it"]) => riempi(it.segnalazioneErrore, testiDeiCodici.it[codice]);
const avviso = (page: Page) => page.locator('output[role="status"]');
const flowchartDi = (page: Page) => page.getByRole("group", { name: `${it.flowchart}: ${NOME}`, exact: true });

async function apriParola(page: Page): Promise<Locator> {
  await apri(page, { lingua: "it" }, undefined, [{ nome: NOME, titolo: NOME, funzione: parola }]);
  const flowchart = flowchartDi(page);
  await expect(flowchart).toBeVisible();
  // La premessa: i due cicli, coi loro nomi.
  await expect(bloccoDiNome(flowchart, PER)).toHaveCount(1);
  await expect(bloccoDiNome(flowchart, PER_OGNI)).toHaveCount(1);
  return flowchart;
}

/** «Salva con nome» verso un percorso del guscio simulato: il progetto salvato. */
async function salvato(page: Page, percorso: string): Promise<{ functions: { body: Record<string, unknown>[] }[] }> {
  await page.evaluate((p) => Object.assign(window.__finzione__, { daSalvare: p }), percorso);
  await (await voceDelMenu(page, it.salvaConNome)).click();
  await page.waitForFunction((p) => window.__finzione__.file[p] !== undefined, percorso, { polling: "raf" });
  return JSON.parse(await page.evaluate((p) => window.__finzione__.file[p]!, percorso));
}

/** Due fotogrammi: il tempo che serve a React per ridisegnare dopo un evento. */
const dueGiri = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

/** Trascina dal centro di `da` al centro di `a` a piccoli passi, come in `trascina.e2e.ts`. */
async function trascina(page: Page, da: Locator, a: Locator): Promise<void> {
  await da.evaluate((x) => x.scrollIntoView({ block: "center", inline: "center" }));
  await dueGiri(page);
  const s = await da.boundingBox();
  const t = await a.boundingBox();
  if (!s || !t) throw new Error("un elemento da trascinare o il bersaglio non ha una posizione");
  const [sx, sy, tx, ty] = [s.x + s.width / 2, s.y + s.height / 2, t.x + t.width / 2, t.y + t.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await page.mouse.move(tx, ty, { steps: 10 });
  // Il bersaglio si rilegge prima di lasciare, come farebbe chi lo guarda: col trascinamento in corso la disposizione può
  // essersi spostata, e il rilascio cadeva dove il bersaglio non era più (DN-3: il «per ogni» rimasto all'indice 3 invece di
  // andare a 0, due volte nel WebKit per Linux della CI).
  await dueGiri(page);
  const ora = await a.boundingBox();
  if (ora) await page.mouse.move(ora.x + ora.width / 2, ora.y + ora.height / 2, { steps: 2 });
  await page.mouse.up();
  await dueGiri(page);
}

// ------------------------------------------------------------------------------- inserimento

test("«Per» dall'elenco di un «+» col clic e «Per ogni» da tastiera: il blocco nel posto del «+», coi suoi campi aperti", async ({ page }, info) => {
  const flowchart = await apriParola(page);
  const iniziale = await stato(flowchart);

  // Col clic, sul primo «+» del programma.
  await page.getByRole("button", { name: nomeDelPunto(PRINCIPALE, 1, 6), exact: true }).click();
  await page.getByRole("menuitem", { name: it.bloccoPer, exact: true }).click();
  const campiDelPer = campiDi(page, senzaTesto(it.bloccoPer));
  await expect(campiDelPer.getByRole("textbox", { name: it.campoContatore, exact: true })).toBeFocused();
  const etichette = await campiDelPer.getByRole("textbox").evaluateAll((c) => c.map((x) => `${x.closest("label")?.textContent} [${(x as HTMLInputElement).placeholder}]`));
  const doveIlPer = doveSta(await albero(flowchart), senzaTesto(it.bloccoPer));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  await expect(flowchart.getByRole("button", { name: senzaTesto(it.bloccoPer), exact: true })).toHaveCount(0);

  // Da tastiera, sull'ultimo «+» del corpo del «per ogni»: Invio apre l'elenco, le frecce arrivano a «Per ogni».
  await page.getByRole("button", { name: nomeDelPunto(CORPO_PER_OGNI, 2, 2), exact: true }).focus();
  await page.keyboard.press("Enter");
  const elenco = page.getByRole("menu", { name: it.elencoDeiBlocchi, exact: true });
  const voci = await elenco.getByRole("menuitem").allTextContents();
  for (let k = 0; k < voci.indexOf(it.bloccoPerOgni); k++) await page.keyboard.press("ArrowDown");
  await expect(elenco.getByRole("menuitem", { name: it.bloccoPerOgni, exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  const campiDelPerOgni = campiDi(page, senzaTesto(it.bloccoPerOgni));
  await expect(campiDelPerOgni.getByRole("textbox", { name: it.campoElemento, exact: true })).toBeFocused();
  const etichetteDelPerOgni = await campiDelPerOgni.getByRole("textbox").evaluateAll((c) => c.map((x) => x.closest("label")?.textContent));
  const doveIlPerOgni = doveSta(await albero(flowchart), senzaTesto(it.bloccoPerOgni));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  console.log(`[${info.project.name}] inserimento dei cicli: elenco ${voci.join(", ")}; per in ${JSON.stringify(doveIlPer)}, per ogni in ${JSON.stringify(doveIlPerOgni)}`);

  expect(voci).toEqual([it.bloccoAssegnazione, it.bloccoLettura, it.bloccoScrittura, it.bloccoSe, it.bloccoMentre, it.bloccoRipeti, it.bloccoPer, it.bloccoPerOgni, it.bloccoProcedura, it.bloccoCommento]);
  expect(doveIlPer).toEqual([{ sequenza: PRINCIPALE, indice: 0 }]);
  expect(etichette).toEqual([`${it.campoContatore} []`, `${it.campoDa} []`, `${it.campoA} []`, `${it.campoPasso} [1]`]);
  expect(doveIlPerOgni).toEqual([{ sequenza: CORPO_PER_OGNI, indice: 1 }]);
  expect(etichetteDelPerOgni).toEqual([it.campoElemento, it.campoSorgente]);
  // Annullati, si torna all'albero iniziale.
  expect(await stato(flowchart)).toBe(iniziale);
  // Controllo positivo del rilevatore dei posti: il blocco nuovo non è al posto 2 del corpo.
  expect(doveIlPerOgni).not.toEqual([{ sequenza: CORPO_PER_OGNI, indice: 0 }]);
});

// ------------------------------------------------------------------------------- i campi

test("i campi del «per»: il passo che non è un numero non si conferma, zero e un contatore sconosciuto hanno il loro errore, il passo vuoto o 1 non si scrive", async ({ page }) => {
  const flowchart = await apriParola(page);
  await bloccoDiNome(flowchart, PER).dblclick();
  const campi = campiDi(page, PER);
  const campo = (nome: string) => campi.getByRole("textbox", { name: nome, exact: true });
  const segnalazioni = campi.getByRole("list", { name: it.segnalazioniDelBlocco, exact: true });
  // I campi col contenuto del blocco, gli operatori nella lingua dell'interfaccia.
  expect(await Promise.all([it.campoContatore, it.campoDa, it.campoA, it.campoPasso].map((n) => campo(n).inputValue()))).toEqual(["i", e("length parola - 1"), "0", "-1"]);

  // Un passo che non è un numero intero: l'errore del passo mentre si scrive; Invio non conferma, e l'avviso lo dice.
  await campo(it.campoPasso).fill("due");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(errore("invalid_step"));
  await campo(it.campoPasso).press("Enter");
  await expect(campi).toBeVisible();
  await expect(avviso(page)).toHaveText(it.modificaRifiutata);
  // Zero: l'errore viene dal controllo del progetto candidato, lo stesso testo.
  await campo(it.campoPasso).fill("0");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(errore("invalid_step"));
  // Un contatore che non è un dato.
  await campo(it.campoPasso).fill("-1");
  await expect(segnalazioni.getByRole("listitem")).toHaveCount(0);
  await campo(it.campoContatore).fill("k");
  await expect(segnalazioni).toContainText(testiDeiCodici.it.unknown_name.breve);
  await campo(it.campoContatore).fill("i");
  await expect(segnalazioni.getByRole("listitem")).toHaveCount(0);

  // Il passo vuoto: confermato, il blocco senza passo e il file senza `step`.
  await campo(it.campoPasso).fill("");
  await campo(it.campoPasso).press("Enter");
  await expect(campi).toBeHidden();
  const senzaPasso = `${it.bloccoPer}: ${riempi(it.contenutoPer, { contatore: "i", da: e("length parola - 1"), a: "0" })}`;
  await expect(bloccoDiNome(flowchart, senzaPasso)).toHaveCount(1);
  const primo = (await salvato(page, "C:\\prove\\senza-passo.algo")).functions[0]!.body[1]!;
  expect(primo).toEqual({ id: "b2", kind: "for", counter: "i", from: "length parola - 1", to: "0", body: [{ id: "b3", kind: "write", values: ["parola[i]"], newline: false }] });

  // «1» scritto nel passo: lo stesso ciclo, nessun passo della cronologia (un Annulla torna al passo -1).
  await bloccoDiNome(flowchart, senzaPasso).dblclick();
  await campiDi(page, senzaPasso).getByRole("textbox", { name: it.campoPasso, exact: true }).fill("1");
  await campiDi(page, senzaPasso).getByRole("textbox", { name: it.campoPasso, exact: true }).press("Enter");
  await expect(campiDi(page, senzaPasso)).toBeHidden();
  expect("step" in (await salvato(page, "C:\\prove\\passo-uno.algo")).functions[0]!.body[1]!).toBe(false);
  // «Annulla» della barra: dopo il menu «Progetto» un Ctrl+Z subito non arrivava sempre (anteprima del build).
  await page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: it.annulla, exact: true }).click();
  await expect(bloccoDiNome(flowchart, PER)).toHaveCount(1);

  // «-2»: il passo si scrive (controllo positivo del rilevatore del file).
  await bloccoDiNome(flowchart, PER).dblclick();
  await campiDi(page, PER).getByRole("textbox", { name: it.campoPasso, exact: true }).fill("-2");
  await campiDi(page, PER).getByRole("textbox", { name: it.campoPasso, exact: true }).press("Enter");
  await expect(bloccoDiNome(flowchart, `${it.bloccoPer}: ${riempi(it.contenutoPerConPasso, { contatore: "i", da: e("length parola - 1"), a: "0", passo: "-2" })}`)).toHaveCount(1);
  expect((await salvato(page, "C:\\prove\\passo-meno-due.algo")).functions[0]!.body[1]!.step).toBe(-2);
});

test("i campi del «per ogni»: elemento e sorgente; una sorgente che non è un vettore né una stringa ha il suo errore", async ({ page }) => {
  const flowchart = await apriParola(page);
  await bloccoDiNome(flowchart, PER_OGNI).dblclick();
  const campi = campiDi(page, PER_OGNI);
  const campo = (nome: string) => campi.getByRole("textbox", { name: nome, exact: true });
  const segnalazioni = campi.getByRole("list", { name: it.segnalazioniDelBlocco, exact: true });
  expect([await campo(it.campoElemento).inputValue(), await campo(it.campoSorgente).inputValue()]).toEqual(["c", "parola"]);
  await campo(it.campoSorgente).fill("vocali");
  await expect(segnalazioni.getByRole("listitem")).not.toHaveCount(0);
  const visto = await segnalazioni.textContent();
  await campo(it.campoSorgente).fill("parola");
  await expect(segnalazioni.getByRole("listitem")).toHaveCount(0);
  // Esc: nessun passo, il blocco com'era.
  const prima = await stato(flowchart);
  await page.keyboard.press("Escape");
  await expect(campi).toBeHidden();
  expect(await stato(flowchart)).toBe(prima);
  expect(visto).toContain(testiDeiCodici.it.type_mismatch.breve);
});

// ------------------------------------------------------------------------------- rinomina e usi

test("il dato rinominato cambia le intestazioni dei due cicli; la conferma prima di eliminare il contatore e l'elemento conta le regole che li usano", async ({ page }) => {
  const flowchart = await apriParola(page);
  const tabella = page.getByRole("table", { name: `${it.dati}: ${NOME}`, exact: true });
  const riga = (nome: string) => tabella.locator("tbody").getByRole("row").filter({ has: page.getByRole("rowheader", { name: nome, exact: true }) });
  await riga("parola").dblclick();
  const scheda = page.getByRole("form", { name: riempi(it.modificaDelDato, { nome: "parola" }), exact: true });
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).fill("testo");
  await scheda.getByRole("textbox", { name: it.datiNome, exact: true }).press("Enter");
  await expect(bloccoDiNome(flowchart, `${it.bloccoPer}: ${riempi(it.contenutoPerConPasso, { contatore: "i", da: e("length testo - 1"), a: "0", passo: "-1" })}`)).toHaveCount(1);
  await expect(bloccoDiNome(flowchart, `${it.bloccoPerOgni}: ${riempi(it.contenutoPerOgni, { elemento: "c", sorgente: "testo" })}`)).toHaveCount(1);
  // Controllo positivo: i nomi di prima non ci sono più.
  await expect(bloccoDiNome(flowchart, PER)).toHaveCount(0);

  // Il contatore `i` lo usano il `per` e la scrittura di `testo[i]`; l'elemento `c` il `per ogni` e la condizione.
  const usi: Record<string, string | null> = {};
  for (const nome of ["i", "c"]) {
    await riga(nome).focus();
    await page.keyboard.press("Delete");
    const finestra = page.getByRole("alertdialog", { name: riempi(it.eliminaDatoTitolo, { nome }), exact: true });
    await expect(finestra).toBeVisible();
    usi[nome] = await finestra.textContent();
    await page.keyboard.press("Escape");
    await expect(finestra).toBeHidden();
  }
  expect(usi.i).toContain(riempi(it.eliminaDatoUsato, { n: "2" }));
  expect(usi.c).toContain(riempi(it.eliminaDatoUsato, { n: "2" }));
});

// ------------------------------------------------------------------------------- trascinamento

test("trascinati: un blocco dentro il corpo del «per ogni», il «per ogni» col suo corpo in testa al programma; il «per» dentro sé stesso no", async ({ page }, info) => {
  const flowchart = await apriParola(page);
  const iniziale = await stato(flowchart);
  const pulsante = (nome: string) => flowchart.getByRole("button", { name: nome, exact: true }).and(flowchart.locator(":not([data-iniziale])"));
  const scrittura = riempi(it.nomeDelBlocco, { genere: it.bloccoScrittura, testo: '""' });
  const esiti: Record<string, unknown> = {};

  // Dentro: la scrittura vuota (b4) nel corpo del «per ogni», al primo posto.
  await trascina(page, pulsante(scrittura), pulsante(nomeDelPunto(CORPO_PER_OGNI, 1, 2)));
  esiti.dentro = doveSta(await albero(flowchart), scrittura);
  await page.keyboard.press("Control+z");
  esiti.tornatoDentro = (await stato(flowchart)) === iniziale;

  // Fuori: il «per ogni» in testa al programma, col suo corpo.
  await trascina(page, bloccoDiNome(flowchart, PER_OGNI), pulsante(nomeDelPunto(PRINCIPALE, 1, 6)));
  esiti.fuori = doveSta(await albero(flowchart), PER_OGNI);
  // Il corpo è venuto col ciclo: ha ancora un blocco (il «se»), quindi il suo ultimo «+» è il secondo di due. Il nome
  // del «se» ha degli apici, che il lettore dell'albero (`albero.ts`) non sa leggere: si cerca il «+».
  esiti.corpo = await flowchart.getByRole("button", { name: nomeDelPunto(CORPO_PER_OGNI, 2, 2), exact: true }).count();
  await page.keyboard.press("Control+z");
  esiti.tornatoFuori = (await stato(flowchart)) === iniziale;

  // Il «per» nel proprio corpo: non si sposta, l'avviso lo dice.
  await trascina(page, bloccoDiNome(flowchart, PER), pulsante(nomeDelPunto(riempi(it.sequenzaCorpo, { blocco: PER }), 1, 2)));
  esiti.inSeStesso = { avviso: await avviso(page).textContent(), fermo: (await stato(flowchart)) === iniziale };
  console.log(`[${info.project.name}] trascinamento dei cicli: ${JSON.stringify(esiti)}`);

  expect(esiti).toEqual({
    dentro: [{ sequenza: CORPO_PER_OGNI, indice: 0 }],
    tornatoDentro: true,
    fuori: [{ sequenza: PRINCIPALE, indice: 0 }],
    corpo: 1,
    tornatoFuori: true,
    inSeStesso: { avviso: it.spostamentoDentroSeStesso, fermo: true },
  });
});

// ------------------------------------------------------------------------------- il menu del blocco e il riquadro dei campi

test("il menu di un blocco col tasto destro, anche su una parte del riquadro di un ciclo, e con Maiusc+F10: Elimina toglie il ciclo, Esc chiude", async ({ page }, info) => {
  const flowchart = await apriParola(page);
  const iniziale = await stato(flowchart);
  const menu = page.getByRole("menu", { name: riempi(it.menuDelBlocco, { blocco: PER }), exact: true });
  const voci = async () => (await menu.getByRole("menuitem").allTextContents()).map((v) => v.replace(/ \(.*\)$/, ""));
  const esiti: Record<string, unknown> = {};

  // Il tasto destro sull'intestazione del «per».
  await bloccoDiNome(flowchart, PER).click({ button: "right" });
  await expect(menu).toBeVisible();
  esiti.intestazione = await voci();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  // Sul rombo del «per», una parte disegnata del riquadro: lo stesso menu.
  const id = await bloccoDiNome(flowchart, PER).getAttribute("data-blocco");
  const rombo = page.locator(`svg g[data-id="${id}"][data-fase="condizione"]`);
  await rombo.evaluate((x) => x.scrollIntoView({ block: "center", inline: "center" }));
  await dueGiri(page);
  await rombo.click({ button: "right" });
  await expect(menu).toBeVisible();
  esiti.parte = await voci();
  await page.keyboard.press("Escape");

  // Con Maiusc+F10 sul blocco scelto, poi «Elimina»: il ciclo va via col suo corpo; Ctrl+Z lo riporta.
  await bloccoDiNome(flowchart, PER).focus();
  await page.keyboard.press("Shift+F10");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: new RegExp(`^${it.menuElimina}`) }).click();
  esiti.eliminato = await bloccoDiNome(flowchart, PER).count();
  await page.keyboard.press("Control+z");
  esiti.tornato = (await stato(flowchart)) === iniziale;
  console.log(`[${info.project.name}] menu del blocco: ${JSON.stringify(esiti)}`);

  const attese = [it.menuTaglia, it.menuCopia, it.menuEliminaBlocco].map((v) => v.replace(/ \(.*\)$/, ""));
  expect(esiti).toEqual({ intestazione: attese, parte: attese, eliminato: 0, tornato: true });
});

test("il riquadro dei campi resta nella finestra quando cresce: coi suggerimenti del «?» aperti, «Conferma» si raggiunge", async ({ page }, info) => {
  // Più bassa del riquadro coi suggerimenti aperti (365 px misurati con la finestra a 420): senza l'altezza massima esce.
  const ALTEZZA = 330;
  await page.setViewportSize({ width: 1280, height: ALTEZZA });
  const flowchart = await apriParola(page);
  await bloccoDiNome(flowchart, PER).evaluate((x) => x.scrollIntoView({ block: "center", inline: "center" }));
  await dueGiri(page);
  await bloccoDiNome(flowchart, PER).dblclick();
  const campi = campiDi(page, PER);
  await expect(campi).toBeVisible();
  const prima = (await campi.boundingBox())!;
  await campi.getByRole("button", { name: it.suggerimenti, exact: true }).click();
  await dueGiri(page);
  const conferma = campi.getByRole("button", { name: it.conferma, exact: true });
  await conferma.scrollIntoViewIfNeeded();
  const dopo = (await campi.boundingBox())!;
  const pulsante = (await conferma.boundingBox())!;
  const misura = { altezzaPrima: Math.round(prima.height), altezzaDopo: Math.round(dopo.height), fondo: Math.round(dopo.y + dopo.height), fondoDiConferma: Math.round(pulsante.y + pulsante.height) };
  console.log(`[${info.project.name}] riquadro dei campi in una finestra alta ${ALTEZZA} px: ${JSON.stringify(misura)}`);
  expect({ riquadro: misura.fondo <= ALTEZZA, conferma: misura.fondoDiConferma <= ALTEZZA && pulsante.y >= dopo.y }).toEqual({ riquadro: true, conferma: true });
});
