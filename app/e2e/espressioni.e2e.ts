// Le parentesi e le virgolette che si chiudono da sé, e la causa precisa di un testo che non si lascia leggere, nei motori
// veri: sul programma di riferimento della media dei voti con un vettore in più, nei campi dell'assegnazione `j ← j + 1` e
// in quelli del valore iniziale del vettore.
//
// - Mentre si scrive: `(` dà la coppia col cursore dentro, la `)` scritta scavalca quella aggiunta, ⌫ fra le due le toglie,
//   una selezione si racchiude, la quadra di AltGr si chiude; Ctrl+Z toglie la coppia in un colpo solo, come la scrittura;
//   Esc lascia il progetto com'era (Annulla spento), Invio è un passo che un Annulla toglie.
// - La causa: la frase breve della causa sotto i campi, il suo suggerimento in «Spiegazione», la stessa frase nella riga
//   di stato dopo Invio; la destinazione che non è un dato. Anche per un avviso (la condizione di un «mentre» sempre vera
//   o sempre falsa) e per un errore del controllo nel valore iniziale (un nome fra gli elementi, un elenco corto).
// - Il valore iniziale di un vettore: l'elenco fra graffe nel campo, la graffa che si chiude da sé, il valore scritto nel
//   blocco; la causa di un elemento scritto male.
// - La casella spenta: niente si chiude da sé; il testo di un commento, che non è un'espressione, nemmeno.
//
// CHE COSA NON GUARDA: la regola tasto per tasto (`ui/chiusura.test.ts`, con la via di ripiego senza il comando di
// modifica); le cause una per una (`core/espressioni/analizzatore.test.ts`) e i loro testi (`i18n/codici.test.ts`); i campi
// della vista dei dati e il valore predefinito di una funzione (lo stesso segno e lo stesso ascoltatore: qui uno solo dei
// campi segnati per genere); WebKit (al primo rilascio per Linux o macOS, come le altre prove).
import { expect, test, type Page } from "@playwright/test";
import type { Funzione } from "../core/progetto/modello";
import { testiDelleCause } from "../i18n/codici";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { riferimento } from "./albero";
import { apri, costruisciFinzione } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });

const NOME = "parentesi e virgolette";
const programma: Funzione = { ...riferimento, data: [...riferimento.data, { name: "v", type: "integer", size: 3, initial: ["1", "2", "3"] }] };

const blocco = (page: Page, id: string) => page.locator(`[data-blocco="${id}"]`);
const campiDi = (page: Page, testo: string) => page.getByRole("form", { name: riempi(it.modificaDelBlocco, { blocco: `${it.bloccoAssegnazione}: ${testo}` }), exact: true });
const nella = (page: Page, nome: string) => page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: nome, exact: true });
/** Il testo del campo, col cursore segnato da `|` (e la selezione fra `⟪` e `⟫`). */
const conIlCursore = (campo: ReturnType<Page["getByRole"]>) =>
  campo.evaluate((c: HTMLInputElement) => {
    const [a, b] = [c.selectionStart ?? 0, c.selectionEnd ?? 0];
    return a === b ? `${c.value.slice(0, a)}|${c.value.slice(a)}` : `${c.value.slice(0, a)}⟪${c.value.slice(a, b)}⟫${c.value.slice(b)}`;
  });
const breve = (causa: keyof (typeof testiDelleCause)["it"], segno = "") => testiDelleCause.it[causa].breve.replace("{segno}", segno);

async function apriIlProgramma(page: Page, salvate: Record<string, unknown> = { lingua: "it" }): Promise<void> {
  await apri(page, salvate, undefined, [{ nome: NOME, titolo: NOME, funzione: programma }]);
  await expect(blocco(page, "b21")).toBeVisible();
}

test("mentre si scrive: la coppia col cursore dentro, la chiusura scavalcata, ⌫, la selezione, AltGr; Ctrl+Z toglie la coppia in un colpo", async ({ page }) => {
  await apriIlProgramma(page);
  // Premessa: niente da annullare.
  await expect(nella(page, it.annulla)).toHaveAttribute("aria-disabled", "true");
  await blocco(page, "b21").dblclick();
  const campo = campiDi(page, "j ← j + 1").getByRole("textbox", { name: it.campoValore, exact: true });
  await campo.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" * ");
  await page.keyboard.press("(");
  expect(await conIlCursore(campo)).toBe("j + 1 * (|)");
  await page.keyboard.type("j");
  await page.keyboard.press(")");
  expect(await conIlCursore(campo)).toBe("j + 1 * (j)|");
  // Ctrl+Z: prima la «j», poi la coppia in un colpo solo, poi « * ».
  await page.keyboard.press("Control+z");
  expect(await campo.inputValue()).toBe("j + 1 * ()");
  await page.keyboard.press("Control+z");
  expect(await campo.inputValue()).toBe("j + 1 * ");
  await page.keyboard.press("Control+z");
  expect(await campo.inputValue()).toBe("j + 1");
  // ⌫ fra le due toglie la coppia; davanti a una parola niente si aggiunge.
  await page.keyboard.press("End");
  await page.keyboard.type(" + v");
  await page.keyboard.press("[");
  expect(await conIlCursore(campo)).toBe("j + 1 + v[|]");
  await page.keyboard.press("Backspace");
  expect(await conIlCursore(campo)).toBe("j + 1 + v|");
  await page.keyboard.press("Home");
  await page.keyboard.press("(");
  expect(await conIlCursore(campo)).toBe("(|j + 1 + v");
  await page.keyboard.press("Backspace");
  // La selezione si racchiude.
  await page.keyboard.press("Shift+End");
  await page.keyboard.press("(");
  expect(await conIlCursore(campo)).toBe("(j + 1 + v)|");
  // La quadra di AltGr (Ctrl+Alt su Windows) si chiude anche lei.
  await page.keyboard.press("Control+Alt+[");
  expect(await conIlCursore(campo)).toBe("(j + 1 + v)[|]");
  // Esc: il progetto è quello di prima, niente da annullare.
  await page.keyboard.press("Escape");
  await expect(campiDi(page, "j ← j + 1")).toBeHidden();
  await expect(nella(page, it.annulla)).toHaveAttribute("aria-disabled", "true");
  // Invio è un passo, e Annulla lo toglie.
  await blocco(page, "b21").dblclick();
  await campo.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" + ");
  await page.keyboard.press("(");
  await page.keyboard.type("j * 2");
  await page.keyboard.press(")");
  await page.keyboard.press("Enter");
  await expect(blocco(page, "b21")).toHaveAccessibleName(`${it.bloccoAssegnazione}: j ← j + 1 + (j * 2)`);
  await nella(page, it.annulla).click();
  await expect(blocco(page, "b21")).toHaveAccessibleName(`${it.bloccoAssegnazione}: j ← j + 1`);
});

test("la causa precisa sotto i campi, nella Spiegazione e nella riga di stato; la destinazione che non è un dato", async ({ page }) => {
  await apriIlProgramma(page);
  await blocco(page, "b21").dblclick();
  const campi = campiDi(page, "j ← j + 1");
  const segnalazioni = page.getByRole("list", { name: it.segnalazioniDelBlocco, exact: true }).getByRole("listitem");
  await campi.getByRole("textbox", { name: it.campoValore, exact: true }).fill("(j + 1");
  await expect(segnalazioni).toHaveText([`Errore: ${breve("tonda_aperta")} ${it.spiegazione} ▸`]);
  await segnalazioni.getByRole("button", { name: it.spiegazione, exact: true }).click();
  await expect(segnalazioni.locator("[data-spiegazione]")).toHaveText(testiDelleCause.it.tonda_aperta.suggerimento);
  await campi.getByRole("textbox", { name: it.campoValore, exact: true }).fill("j = 1");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(`Errore: ${breve("uguale_solo")}`);
  await campi.getByRole("textbox", { name: it.campoValore, exact: true }).fill("j + 1");
  await campi.getByRole("textbox", { name: it.campoDestinazione, exact: true }).fill("j + 1");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(`Errore: ${breve("destinazione")}`);
  await campi.getByRole("textbox", { name: it.campoDestinazione, exact: true }).fill("j");
  await campi.getByRole("textbox", { name: it.campoValore, exact: true }).fill("j + * 1");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(`Errore: ${breve("operando_mancante", "*")}`);
  await page.keyboard.press("Enter");
  // La riga di stato dice la stessa causa.
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(breve("operando_mancante", "*"));
});

test("il valore iniziale di un vettore: l'elenco fra graffe, la graffa che si chiude da sé, la causa di un elemento", async ({ page }) => {
  await apriIlProgramma(page);
  const voce = page.locator('[data-iniziale-di="v"]');
  await voce.dblclick();
  const campi = campiDi(page, "v ← {1, 2, 3}");
  const campo = campi.getByRole("textbox", { name: it.campoValore, exact: true });
  await expect(campo).toHaveValue("{1, 2, 3}");
  await campo.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("{");
  expect(await conIlCursore(campo)).toBe("{|}");
  await page.keyboard.type("4, 5, 2x");
  const segnalazioni = page.getByRole("list", { name: it.segnalazioniDelBlocco, exact: true }).getByRole("listitem");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(`Errore: ${breve("numero_scritto_male", "2x")}`);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("6");
  await page.keyboard.press("}");
  expect(await conIlCursore(campo)).toBe("{4, 5, 6}|");
  // Nessun errore (l'avviso del vettore che nessun blocco legge resta).
  await expect(segnalazioni.filter({ hasText: /^Errore:/ })).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(voce).toHaveAccessibleName(`${it.bloccoAssegnazione}: v ← {4, 5, 6}`);
});

test("la causa precisa di un avviso e di un valore iniziale che non è un valore scritto; Annulla riporta il blocco", async ({ page }) => {
  await apriIlProgramma(page);
  const segnalazioni = page.getByRole("list", { name: it.segnalazioniDelBlocco, exact: true }).getByRole("listitem");
  // L'avviso della condizione sempre vera di un «mentre»: la causa sotto i campi, il suo suggerimento in «Spiegazione».
  await blocco(page, "b7").dblclick();
  const condizione = page.getByRole("textbox", { name: it.campoCondizione, exact: true });
  await condizione.fill("true");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(`Avviso: ${breve("sempre_vera")}`);
  await segnalazioni.getByRole("button", { name: it.spiegazione, exact: true }).click();
  await expect(segnalazioni.locator("[data-spiegazione]")).toHaveText(testiDelleCause.it.sempre_vera.suggerimento);
  await condizione.fill("false");
  await expect(segnalazioni.locator("[data-breve]")).toHaveText(`Avviso: ${breve("mentre_falsa")}`);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(breve("mentre_falsa"));
  await nella(page, it.annulla).click();
  await expect(blocco(page, "b7")).toHaveAccessibleName(`${it.bloccoMentre}: i < n`);
  // Il valore iniziale del vettore con un nome fra gli elementi: la causa cita l'elemento.
  await page.locator('[data-iniziale-di="v"]').dblclick();
  await campiDi(page, "v ← {1, 2, 3}").getByRole("textbox", { name: it.campoValore, exact: true }).fill("{1, 2, x}");
  await expect(segnalazioni.locator("[data-breve]").filter({ hasText: /^Errore:/ })).toHaveText(`Errore: ${breve("valore_non_scritto", "x")}`);
  await campiDi(page, "v ← {1, 2, 3}").getByRole("textbox", { name: it.campoValore, exact: true }).fill("{1, 2}");
  await expect(segnalazioni.locator("[data-breve]").filter({ hasText: /^Errore:/ })).toHaveText(`Errore: ${breve("elenco_di_altra_lunghezza", "2")}`);
  await page.keyboard.press("Escape");
});

test("la casella spenta: niente si chiude da sé", async ({ page }) => {
  await apriIlProgramma(page, { lingua: "it", chiusuraAutomatica: false });
  await blocco(page, "b21").dblclick();
  const campo = campiDi(page, "j ← j + 1").getByRole("textbox", { name: it.campoValore, exact: true });
  await campo.click();
  await page.keyboard.press("End");
  await page.keyboard.type(' (["');
  expect(await conIlCursore(campo)).toBe('j + 1 ([\"|');
});

test("il testo di un commento non è un'espressione: le parentesi e le virgolette restano sole", async ({ page }) => {
  await apriIlProgramma(page);
  await blocco(page, "b1").dblclick();
  const campo = page.getByRole("textbox", { name: it.campoTesto, exact: true });
  await campo.click();
  await page.keyboard.press("End");
  await page.keyboard.type(' ("');
  expect(await conIlCursore(campo)).toBe('Prima si chiede quanti voti leggere, finché il numero non è fra 1 e 30 ("|');
  // Premessa: lo stesso tasto, in un campo di un'espressione, si chiude da sé.
  await page.keyboard.press("Escape");
  await blocco(page, "b21").dblclick();
  const valore = campiDi(page, "j ← j + 1").getByRole("textbox", { name: it.campoValore, exact: true });
  await valore.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" (");
  expect(await conIlCursore(valore)).toBe("j + 1 (|)");
});
