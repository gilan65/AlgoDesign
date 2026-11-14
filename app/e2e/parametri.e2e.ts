// La vista dei dati di una procedura o di una funzione nei motori, coi gesti veri, sul programma di riferimento con le
// funzioni (`casi/tappa-3/riferimento-media-voti-funzioni.algo`: `valido` f3, `stelle` f4 col salto `b13`), con il
// secondo parametro `simbolo` di `stelle` e la costante comune `VOTO_MASSIMO` aggiunti qui:
// - la tabella «Parametri» sta sopra quella dei dati; «Aggiungi un parametro», il nome scritto e Invio;
// - il tasto destro su un parametro: «Sposta giù» scambia anche gli argomenti del salto; eliminare apre la finestra
//   d'allerta col fuoco su «Non eliminare» e la spunta che toglie l'argomento;
// - la casella «globale» di una costante comune tolta da una funzione: la finestra, e la costante fra i dati della scheda.
// Ogni esito si legge dal file salvato.
//
// Che cosa NON guarda: ogni passo e ogni rinuncia (sotto happy-dom: `ui/dati/parametri.test.tsx`).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { apriVuota, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1600, height: 1000 } });

type Qualunque = any;
const PERCORSO = "C:\\Documenti\\parametri.algo";
const TESTO = (() => {
  const p: Qualunque = JSON.parse(readFileSync(fileURLToPath(new URL("../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8"));
  p.shared_constants = [{ name: "VOTO_MASSIMO", type: "integer", constant: true, initial: "10" }];
  const [principale, , valido, stelle] = p.functions;
  principale.body[1].body[1].else[0].values = ['"Voto ignorato (da 1 a "', "VOTO_MASSIMO", '"): "', "voto"];
  valido.end.return_value = "voto >= 1 and voto <= VOTO_MASSIMO";
  stelle.data.splice(1, 0, { name: "simbolo", type: "character", parameter: "value" });
  principale.body[2].then[2].arguments = ["somma / contati", "'*'"];
  return JSON.stringify(p, null, 2);
})();

async function apriIlProgetto(page: Page): Promise<void> {
  await apriVuota(page, { lingua: "it" }, { argomento: PERCORSO, file: { [PERCORSO]: TESTO } });
  await expect(page.getByRole("status")).toHaveText(riempi(it.apertoIl, { file: "parametri.algo" }));
}
async function mostra(page: Page, id: string): Promise<void> {
  await page.locator("[data-elenco-funzioni]").click();
  await page.locator(`[data-voce-funzione="${id}"]`).click();
}
/** Il progetto salvato con Ctrl+S, riletto dal disco finto quando il file è cambiato (ogni salvataggio qui segue una
 * modifica). */
async function salvato(page: Page): Promise<Qualunque> {
  const file = () => page.evaluate((p) => (window as unknown as { __finzione__: { file: Record<string, string> } }).__finzione__.file[p]!, PERCORSO);
  const prima = await file();
  await page.keyboard.press("Control+s");
  await expect.poll(file).not.toBe(prima);
  return JSON.parse(await file());
}
const tabella = (page: Page, nome: string) => page.getByRole("table", { name: nome, exact: true });

test("la tabella «Parametri» sta sopra i dati; «Aggiungi un parametro» lo mette in fondo alla firma", async ({ page }) => {
  await apriIlProgetto(page);
  await mostra(page, "f4");
  const parametri = (await tabella(page, `${it.parametri}: stelle`).boundingBox())!;
  const dati = (await tabella(page, `${it.dati}: stelle`).boundingBox())!;
  expect(dati.y).toBeGreaterThan(parametri.y + parametri.height - 1);
  await page.getByRole("button", { name: it.aggiungiParametro, exact: true }).click();
  await expect(page.getByRole("textbox", { name: it.datiNome, exact: true })).toBeFocused();
  await page.keyboard.type("altezza");
  await page.keyboard.press("Enter");
  await expect(tabella(page, `${it.parametri}: stelle`).locator("tbody th")).toHaveText(["quante", "simbolo", "altezza"]);
  const p = await salvato(page);
  expect(p.functions[3].data.at(-1)).toEqual({ name: "altezza", type: "integer", parameter: "value" });
});

test("il tasto destro su un parametro: «Sposta giù» scambia gli argomenti del salto; eliminare con la spunta toglie l'argomento", async ({ page }) => {
  await apriIlProgetto(page);
  await mostra(page, "f4");
  await page.locator('[data-dato="dati-0"]').click({ button: "right" });
  const menu = page.getByRole("menu", { name: riempi(it.menuDelDato, { nome: "quante" }), exact: true });
  await expect(menu.locator('[data-voce="duplica"]')).toHaveAttribute("aria-disabled", "true");
  await menu.locator('[data-voce="giu"]').click();
  await expect(page.locator('[data-dato="dati-1"]')).toBeFocused();
  let p = await salvato(page);
  expect(p.functions[3].data.map((d: Qualunque) => d.name)).toEqual(["simbolo", "quante", "k"]);
  expect(p.functions[0].body[2].then[2].arguments).toEqual(["'*'", "somma / contati"]);
  await page.locator('[data-dato="dati-0"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: it.menuElimina, exact: true }).click();
  const allerta = page.getByRole("alertdialog", { name: riempi(it.eliminaParametroTitolo, { nome: "simbolo" }), exact: true });
  await expect(allerta).toBeVisible();
  await expect(allerta.getByRole("button", { name: it.eliminaRinuncia, exact: true })).toBeFocused();
  await allerta.getByRole("checkbox", { name: it.togliArgomenti, exact: true }).check();
  await allerta.getByRole("button", { name: it.eliminaConferma, exact: true }).click();
  await expect(allerta).toBeHidden();
  p = await salvato(page);
  expect(p.functions[3].data.map((d: Qualunque) => d.name)).toEqual(["quante", "k"]);
  expect(p.functions[0].body[2].then[2].arguments).toEqual(["somma / contati"]);
});

test("la casella «globale» tolta da una funzione: la finestra nomina chi la usa, poi la costante è un dato della scheda", async ({ page }) => {
  await apriIlProgetto(page);
  await mostra(page, "f3");
  await page.locator('[data-dato="comuni-0"]').dblclick();
  const globale = page.getByRole("checkbox", { name: it.campoGlobale, exact: true });
  await expect(globale).toBeChecked();
  await globale.uncheck();
  await page.keyboard.press("Enter");
  const allerta = page.getByRole("alertdialog", { name: riempi(it.comuneTogliTitolo, { nome: "VOTO_MASSIMO" }), exact: true });
  await expect(allerta).toContainText(it.schedaPrincipale);
  await expect(allerta.getByRole("button", { name: it.comuneTogliRinuncia, exact: true })).toBeFocused();
  await allerta.getByRole("button", { name: it.comuneTogliConferma, exact: true }).click();
  await expect(tabella(page, `${it.dati}: valido`).locator("tbody th")).toHaveText(["VOTO_MASSIMO"]);
  const p = await salvato(page);
  expect(p.shared_constants).toBeUndefined();
  expect(p.functions[2].data.at(-1)).toEqual({ name: "VOTO_MASSIMO", type: "integer", constant: true, initial: "10" });
});
