// La finestra «Guida» e la lingua nella riga di stato, sotto happy-dom: la finestra vera (`Applicazione`) col riferimento
// della media dei voti dato all'avvio da un guscio simulato, e i clic e i tasti come li dà l'utente.
//
// - «Guida per lo studente» dal menu «Aiuto» apre la guida della lingua dell'interfaccia (l'HTML della build), non
//   modale, col fuoco nel testo; i tasti dell'app valgono con la guida aperta (F10 fa un passo); Esc dentro la guida la
//   chiude e il fuoco torna al pulsante del menu.
// - La lingua dalla riga di stato: «ITA», il menu delle due lingue, «English»; l'interfaccia e la guida aperta passano
//   all'inglese, la preferenza si scrive con la lingua nuova, e le Impostazioni la mostrano.
// - La ricerca: c'è o no secondo la preferenza; segna ogni volta che il testo contiene la parola, e Invio va alla
//   successiva; spenta con la guida aperta, i segni vanno via. La finestra fissa a destra o, con la preferenza, spostabile (le sue misure scritte, l'angolo che allarga).
//
// Che cosa NON guarda: le misure e lo scorrimento (happy-dom non dispone la pagina: li guardano i motori,
// `e2e/guida.e2e.ts`, col capitolo tenuto al cambio di lingua e i menu sopra la guida).
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { FinestraGuida, GUIDE, memoriaNuova } from "../finestre/FinestraGuida";
import { scelteIniziali, type Scelte } from "../preferenze";
import { testoDi } from "./guida";

const misura = (t: string) => [...t].length * 10;
const riferimento = readFileSync(new URL("../../casi/tappa-1/riferimento-media-voti.algo", import.meta.url), "utf8");
const percorso = "C:\\corpus\\riferimento-media-voti.algo";
/** Le preferenze che l'interfaccia ha mandato al guscio, in ordine. */
let scritte: Record<string, unknown>[] = [];

beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return percorso;
      case "leggi_progetto":
        return riferimento;
      case "elenca_esempi":
      case "elenca_librerie":
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [], gruppi: [] };
      case "segna_modificato":
        return null;
      case "scrivi_preferenze":
        scritte.push(argomenti.preferenze as Record<string, unknown>);
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
afterEach(() => {
  cleanup();
  scritte = [];
});

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const guida = () => document.querySelector<HTMLElement>("[data-finestra-guida]");
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
/** L'HTML della build come lo scrive il DOM (che scrive `&quot;` come `"`), per confrontarlo col testo della finestra. */
const nelDom = (html: string) => {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.innerHTML;
};

async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 2000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (avviso «${avviso()}»)`);
}

async function apri(scelte: Scelte = scelteIniziali): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta("il riferimento aperto", () => avviso() === riempi(it.apertoIl, { file: "riferimento-media-voti.algo" }));
}

/** Una voce di un menu di Ark sotto happy-dom: il menu si apre col clic sul suo pulsante e la voce si sceglie dalla
 * tastiera (il clic su una voce chiude il menu senza sceglierla). */
async function sceglieNelMenu(pulsante: HTMLElement, tasti: readonly string[], attesa: string): Promise<void> {
  await act(async () => void fireEvent.click(pulsante));
  await aspetta("il menu aperto", () => document.querySelector('[role="menu"]') !== null);
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  for (const tasto of tasti) {
    await act(async () => void fireEvent.keyDown(menu, { key: tasto }));
    await giro();
  }
  expect(document.querySelector("[data-highlighted]")?.getAttribute("data-valore") ?? document.querySelector("[data-highlighted]")?.getAttribute("data-comando")).toBe(attesa);
  await act(async () => void fireEvent.keyDown(menu, { key: "Enter" }));
  await aspetta("il menu chiuso", () => document.querySelector('[role="menu"]') === null);
}
const pulsanteDellAiuto = () => document.querySelector<HTMLElement>('header [data-menu="aiuto"]')!;
const apriLaGuida = () => sceglieNelMenu(pulsanteDellAiuto(), ["Home"], "guida");

test("«Guida per lo studente» apre la guida della lingua, non modale, col fuoco nel testo; F10 fa un passo con la guida aperta; Esc la chiude e il fuoco torna al menu", async () => {
  await apri();
  await apriLaGuida();
  await aspetta("la guida aperta", () => guida() !== null);
  const g = guida()!;
  expect({ ruolo: g.getAttribute("role"), modale: g.getAttribute("aria-modal"), titolo: g.querySelector("h2")?.textContent, lingua: g.getAttribute("data-finestra-guida") }).toEqual({ ruolo: "dialog", modale: "false", titolo: it.guidaTitolo, lingua: "it" });
  expect(g.querySelector("article")?.innerHTML === nelDom(GUIDE.it.html)).toBe(true);
  expect(nelDom(GUIDE.it.html) === nelDom(GUIDE.en.html)).toBe(false);
  expect([...g.querySelectorAll("nav button")].map((b) => b.textContent)).toEqual(GUIDE.it.capitoli.map((c) => c.titolo));
  expect(document.activeElement?.tagName).toBe("ARTICLE");
  // La guida non è una finestra modale: un tasto dell'app vale (F10, il primo passo).
  const prima = statoMostrato();
  await act(async () => void fireEvent.keyDown(document.activeElement!, { key: "F10" }));
  await aspetta("il primo passo con la guida aperta", () => statoMostrato() !== prima);
  expect(guida() !== null).toBe(true);
  // Esc dentro la guida la chiude, e il fuoco torna al pulsante del menu «Aiuto».
  await act(async () => void fireEvent.keyDown(guida()!.querySelector("article")!, { key: "Escape" }));
  await aspetta("la guida chiusa", () => guida() === null);
  expect(document.activeElement === pulsanteDellAiuto()).toBe(true);
});

test("la lingua dalla riga di stato: «ITA», il menu, «English»; l'interfaccia e la guida aperta in inglese, la preferenza scritta, le Impostazioni la mostrano", async () => {
  await apri();
  await apriLaGuida();
  await aspetta("la guida aperta", () => guida() !== null);
  const lingua = () => document.querySelector<HTMLElement>("[data-lingua]")!;
  expect({ testo: lingua().textContent, nome: lingua().getAttribute("aria-label") }).toEqual({ testo: "ITA", nome: `${it.linguaDellInterfaccia}: Italiano` });
  await sceglieNelMenu(lingua(), ["End"], "en");
  await aspetta("l'interfaccia in inglese", () => lingua().textContent === "ENG");
  expect({ nome: lingua().getAttribute("aria-label"), documento: document.documentElement.lang, aiuto: pulsanteDellAiuto().textContent?.replace("▾", "").trim() }).toEqual({ nome: `${en.linguaDellInterfaccia}: English`, documento: "en", aiuto: en.menuAiuto });
  // La guida aperta ha cambiato lingua.
  expect({ lingua: guida()?.getAttribute("data-finestra-guida"), titolo: guida()?.querySelector("h2")?.textContent, testo: guida()?.querySelector("article")?.innerHTML === nelDom(GUIDE.en.html) }).toEqual({ lingua: "en", titolo: en.guidaTitolo, testo: true });
  // La preferenza scritta: la lingua nuova, le altre scelte com'erano.
  expect(scritte.at(-1)).toMatchObject({ lingua: "en", ricercaNellaGuida: true, guidaSpostabile: false });
  // Le Impostazioni, aperte dopo, mostrano l'inglese.
  await act(async () => void fireEvent.click(document.querySelector<HTMLElement>('header [data-comando="impostazioni"]')!));
  await aspetta("le Impostazioni", () => document.querySelector('input[name="lingua"]') !== null);
  expect(document.querySelector<HTMLInputElement>('input[name="lingua"]:checked')?.value).toBe("en");
});

test("la ricerca: c'è secondo la preferenza, segna ogni volta che il testo contiene la parola, Invio va alla successiva", async () => {
  await apri();
  await apriLaGuida();
  await aspetta("la guida aperta", () => guida() !== null);
  const campo = guida()!.querySelector<HTMLInputElement>('input[type="search"]');
  expect(campo?.getAttribute("aria-label") ?? "senza ricerca").toBe(it.guidaCerca);
  const parola = "maiusc+f9";
  const attese = testoDi(GUIDE.it.html).toLocaleLowerCase().split(parola).length - 1;
  expect(attese).toBeGreaterThan(1);
  await act(async () => void fireEvent.change(campo!, { target: { value: "Maiusc+F9" } }));
  await giro();
  const trovate = () => guida()!.querySelector("[data-trovate]")?.textContent;
  expect({ segni: guida()!.querySelectorAll("article mark").length, detto: trovate() }).toEqual({ segni: attese, detto: riempi(it.guidaTrovate, { n: "1", totale: String(attese) }) });
  await act(async () => void fireEvent.keyDown(campo!, { key: "Enter" }));
  expect(trovate()).toBe(riempi(it.guidaTrovate, { n: "2", totale: String(attese) }));
  const segnata = [...guida()!.querySelectorAll("article mark")].findIndex((m) => m.hasAttribute("data-corrente"));
  expect(segnata).toBe(1);
  await act(async () => void fireEvent.change(campo!, { target: { value: "zzqq" } }));
  await giro();
  expect({ segni: guida()!.querySelectorAll("article mark").length, detto: trovate() }).toEqual({ segni: 0, detto: it.guidaNessuna });
  cleanup();
  // Con la ricerca spenta nelle Impostazioni il campo non c'è.
  await apri({ ...scelteIniziali, ricercaNellaGuida: false });
  await apriLaGuida();
  await aspetta("la guida aperta", () => guida() !== null);
  expect(guida()!.querySelector('input[type="search"]')?.outerHTML ?? "nessun campo").toBe("nessun campo");
});

test("la ricerca spenta con la guida aperta non lascia segni nel testo", async () => {
  const memoria = memoriaNuova();
  const finestra = (ricerca: boolean) => <FinestraGuida aperta testi={it} lingua="it" ricerca={ricerca} spostabile={false} memoria={memoria} chiudi={() => {}} />;
  const { rerender } = render(finestra(true));
  const campo = guida()!.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => void fireEvent.change(campo, { target: { value: "Maiusc+F9" } }));
  await giro();
  // Premessa: i segni ci sono.
  expect(guida()!.querySelectorAll("article mark").length).toBeGreaterThan(1);
  await act(async () => void rerender(finestra(false)));
  expect({ segni: guida()!.querySelectorAll("article mark").length, testo: guida()!.querySelector("article")!.innerHTML === nelDom(GUIDE.it.html) }).toEqual({ segni: 0, testo: true });
});

test("la guida fissa sta a destra; con la preferenza si sposta dal titolo e si ridimensiona dall'angolo", async () => {
  await apri();
  await apriLaGuida();
  await aspetta("la guida aperta", () => guida() !== null);
  const fissa = guida()!;
  expect({ destra: fissa.style.right, sinistra: fissa.style.left, altezza: fissa.style.height, spostabile: fissa.className.includes("spostabile") }).toEqual({ destra: "8px", sinistra: "", altezza: "", spostabile: false });
  cleanup();
  await apri({ ...scelteIniziali, guidaSpostabile: true });
  await apriLaGuida();
  await aspetta("la guida aperta", () => guida() !== null);
  const mobile = guida()!;
  expect({ destra: mobile.style.right, sinistra: mobile.style.left !== "", altezza: mobile.style.height !== "", spostabile: mobile.className.includes("spostabile") }).toEqual({ destra: "", sinistra: true, altezza: true, spostabile: true });
});
