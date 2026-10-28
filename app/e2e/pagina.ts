// L'apertura della pagina nelle prove di Playwright, comune a tutti gli spec. Il guscio simulato si
// costruisce una volta per processo: è un modulo che importa `mockIPC`, e nella pagina entra come script
// già impacchettato (lo stato iniziale lo scrive uno script iniettato prima).
//
// La finestra parte con un progetto nuovo; `apri` vi apre poi il primo esempio dalla finestra «Esempi», aperta
// dal menu «Aiuto» (come farebbe l'utente), perché quasi tutte le prove lavorano sul programma di riferimento. `apriVuota`
// lascia il progetto nuovo, col guscio simulato nello stato dato.
//
// La cartella degli esempi del guscio simulato contiene, se la prova non ne dà un'altra, i quattro file del
// corpus che l'app fornisce, coi loro nomi del corpus (il riferimento per primo): così le prove trovano i
// progetti per il nome del file, come prima. Gli esempi «di prova» di una prova diventano file della stessa
// cartella, nell'ordine dato.
import { expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import type { Finzione } from "./finzione-tauri";

let finzione = "";

export async function costruisciFinzione(): Promise<void> {
  if (finzione !== "") return;
  const esito = await Bun.build({
    entrypoints: [fileURLToPath(new URL("./finzione-tauri.ts", import.meta.url))],
    target: "browser",
  });
  if (!esito.success || !esito.outputs[0]) throw new Error(`finzione del guscio non costruita: ${esito.logs.join("\n")}`);
  finzione = await esito.outputs[0].text();
}

export type StatoDelGuscio = Partial<Omit<Finzione, "salvate" | "scritte" | "finestre" | "modificato" | "segnato" | "chiusa" | "sceltaDellaCartella">>;

const delCorpus = (nome: string) => readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${nome}.algo`, import.meta.url)), "utf8");
/** La cartella degli esempi predefinita delle prove: i quattro forniti dall'app, coi nomi del corpus. */
export const esempiDelCorpus = (): Record<string, string> =>
  Object.fromEntries(["riferimento-media-voti", "condizione-intero", "condizione-booleano", "overflow-fattoriale"].map((n, i) => [`${i + 1} ${n}.algo`, delCorpus(n)]));

/** Gli esempi di una prova come file della cartella, nell'ordine dato. */
const comeFile = (esempi: readonly { nome: string; funzione: Funzione }[]): Record<string, string> =>
  Object.fromEntries(
    esempi.map((e, i) => [
      `${String(i).padStart(3, "0")} ${e.nome}.algo`,
      JSON.stringify({ format: "algodesign", schema_version: 2, metadata: { name: e.nome }, functions: [e.funzione] }, null, 2),
    ]),
  );

/** Un CSS aggiunto alla pagina da una prova (di solito il suo controllo positivo), come foglio costruito dal CSSOM: la
 * politica di sicurezza dei contenuti dell'anteprima, quella del prodotto, ferma un `<style>` scritto nella pagina
 * (`page.addStyleTag`), non il CSSOM. */
export async function aggiungiStile(page: Page, css: string): Promise<void> {
  await page.evaluate((testo) => {
    const foglio = new CSSStyleSheet();
    foglio.replaceSync(testo);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, foglio];
  }, css);
}

/** La finestra col progetto nuovo dell'avvio: preferenza salvata e guscio simulato nello stato dato. */
export async function apriVuota(
  page: Page,
  salvate: unknown,
  guscio: StatoDelGuscio = {},
  disegni?: readonly { nome: string; funzione: Funzione }[],
  esempi?: readonly { nome: string; titolo: string; funzione: Funzione }[],
): Promise<void> {
  if (finzione === "") throw new Error("finzione del guscio non costruita: manca costruisciFinzione() in beforeAll");
  const iniziale: Finzione = {
    salvate,
    scritte: [],
    file: {},
    daAprire: null,
    daSalvare: null,
    finestre: { apri: 0, salva: 0, proposto: null, cartella: null },
    argomento: null,
    esempi: esempi ? comeFile(esempi) : esempiDelCorpus(),
    cartellaEsempi: "C:\\Utenti\\prova\\AlgoDesign\\esempi",
    cartelle: {},
    daScegliere: null,
    sceltaDellaCartella: { volte: 0, partenza: null },
    modificato: [],
    segnato: false,
    chiusa: false,
    chiusuraRifiutata: false,
    preferenzeRifiutate: null,
    ...guscio,
  };
  await page.addInitScript((s) => {
    window.__finzione__ = s;
  }, iniziale);
  if (disegni)
    await page.addInitScript((d) => {
      Object.assign(window, { __disegniDiProva__: d });
    }, disegni);
  await page.addInitScript(finzione);
  await page.goto("/");
}

/** Apre la finestra con la preferenza salvata data; con `disegni`, la pagina di prova dei disegni; con
 * `esempi`, la finestra vera con questi esempi al posto di quelli incorporati. Nella finestra vera apre il
 * primo esempio. */
export async function apri(
  page: Page,
  salvate: unknown,
  disegni?: readonly { nome: string; funzione: Funzione }[],
  esempi?: readonly { nome: string; titolo: string; funzione: Funzione }[],
): Promise<void> {
  await apriVuota(page, salvate, {}, disegni, esempi);
  if (!disegni) await apriEsempio(page, 0);
}

/** La lingua scelta nelle Impostazioni e confermata, come fa l'utente (la finestra nella lingua di prima). */
export async function scegliLingua(page: Page, lingua: "it" | "en"): Promise<void> {
  const prima = (await page.evaluate(() => document.documentElement.lang)) as "it" | "en";
  const testi = prima === "en" ? (await import("../i18n/en")).en : it;
  await page.getByRole("banner").getByRole("button", { name: testi.impostazioni, exact: true }).click();
  const finestra = page.getByRole("dialog", { name: testi.impostazioniTitolo, exact: true });
  await finestra.getByRole("radio", { name: lingua === "en" ? "English" : "Italiano", exact: true }).check();
  await finestra.getByRole("button", { name: testi.progettoConferma, exact: true }).click();
  await expect(finestra).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("lang", lingua);
}

/** Una voce del menu «Progetto» (Nuovo, Apri, Salva, Salva con nome, Proprietà): il menu si apre dal suo pulsante
 * nella barra, se non è già aperto, e si aspetta il fuoco dentro (Ark ce lo mette un fotogramma dopo: un tasto
 * premuto prima andrebbe al pulsante). */
export function voceDelMenu(page: Page, nome: string, testi: { menuProgetto: string } = it): Promise<Locator> {
  return voceDi(page, testi.menuProgetto, nome);
}

/** Una voce del menu «Aiuto» (Esempi…, Informazioni su AlgoDesign), allo stesso modo. */
export function voceDellAiuto(page: Page, nome: string, testi: { menuAiuto: string } = it): Promise<Locator> {
  return voceDi(page, testi.menuAiuto, nome);
}

async function voceDi(page: Page, nomeDelMenu: string, nome: string): Promise<Locator> {
  const menu = page.getByRole("menu", { name: nomeDelMenu, exact: true });
  const pulsante = page.getByRole("banner").getByRole("button", { name: nomeDelMenu, exact: true });
  // Aperto vuol dire il pulsante aperto: il menu di un giro prima, che si sta chiudendo, è ancora nel documento.
  if ((await pulsante.getAttribute("data-state")) !== "open") {
    await expect(menu).toHaveCount(0);
    await pulsante.click();
  }
  // Il limite d'azione: il menu si posiziona ai fotogrammi, e sotto carico WebKit li dà tardi. Se non compare, il
  // rosso dice com'è il menu nel documento.
  await menu.waitFor({ timeout: 30_000 }).catch(async () => {
    const com = await pulsante.evaluate((p) => ({
      menu: document.querySelectorAll('[role="menu"]').length,
      stato: p.getAttribute("data-state"),
      espanso: p.getAttribute("aria-expanded"),
    }));
    throw new Error(`il menu «${nomeDelMenu}» non compare in 30 s: ${JSON.stringify(com)}`);
  });
  await page.waitForFunction(() => document.activeElement?.closest('[role="menu"]') != null, undefined, { polling: "raf" });
  return menu.getByRole("menuitem", { name: nome, exact: true });
}

/** L'esempio in quella posizione, dalla finestra «Esempi» aperta dal menu «Aiuto» (nella lingua della finestra). */
export async function apriEsempio(page: Page, posizione: number): Promise<void> {
  const lingua = (await page.evaluate(() => document.documentElement.lang)) as "it" | "en";
  const testi = lingua === "en" ? (await import("../i18n/en")).en : it;
  await (await voceDellAiuto(page, testi.esempi, testi)).click();
  const finestra = page.getByRole("dialog", { name: testi.esempiTitolo, exact: true });
  await expect(finestra).toBeVisible();
  await finestra.getByRole("listitem").nth(posizione).getByRole("button", { name: testi.esempioApri, exact: true }).click();
  await expect(finestra).toBeHidden();
}
