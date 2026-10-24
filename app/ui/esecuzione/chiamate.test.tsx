// L'esecuzione con procedure e funzioni dalla finestra, sotto happy-dom: la finestra vera (`Applicazione`), col file dato
// all'avvio da un guscio simulato, e i tasti e i clic come li dà l'utente.
//
// - Entra (F11), Passo (F10) ed Esci (Maiusc+F11) sulle chiamate su tre livelli del corpus: a ogni pausa la scheda
//   mostrata, il blocco corrente (dagli ausili) e «Dove sei», scritti a mano dalle regole del controllore dei passi, non
//   dal codice che si prova. «Passo» su una chiamata la esegue tutta; dopo il ritorno da una funzione chiamata in
//   un'espressione Esci si ferma sulla ripresa di chi chiama, col segno della ripresa nel disegno.
// - Il clic su un nome di «Dove sei» mostra la sua scheda col blocco della chiamata scelto; la pausa dopo torna a seguire
//   l'azione.
// - F5 sulla scheda di una procedura o di una funzione la esegue da sola: i parametri chiesti nella console (un vettore
//   elemento per elemento, col suo indice), «A ogni elemento» al primo elemento di un vettore, nessun comando per farli
//   arrivare senza valore, e alla fine ciò che restituisce (un vettore una riga per elemento, anche nella tabella di
//   traccia) e i parametri per riferimento; finché la colonna è aperta, F5 ricomincia la stessa anche da un'altra scheda.
// - Un punto di interruzione dentro una procedura ferma «Esegui» lì, e la scheda la mostra.
// - Entra ed Esci nella barra solo se il progetto ha procedure o funzioni.
//
// Che cosa NON guarda:
// - le sequenze del controllore su tutte le combinazioni (le prova il nucleo sull'interprete vero,
//   `core/esecuzione/esecuzione.test.ts`);
// - i casi d'uso di una funzione contro la riga di comando (`ui/casi/casi.test.tsx`);
// - i tasti veri nei motori, la barretta e l'aspetto (`e2e/chiamate.e2e.ts`);
// - la tabella coi gruppi delle funzioni e il watch dentro una funzione (qui la tabella è quella del nucleo, e il watch
//   vale solo nel programma principale).

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pausaSulValoreIniziale } from "../../core/esecuzione/atteso-del-riferimento";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const corpus = (nome: string) => readFileSync(join(import.meta.dir, "..", "..", "casi", nome), "utf8");
const TRE_LIVELLI = corpus("tappa-3/tre-livelli.algo");
const RIFERIMENTO = corpus("tappa-3/riferimento-media-voti-funzioni.algo");
const COPIE = corpus("tappa-3/copie-senza-riferimento.algo");
const SENZA = corpus("tappa-2/riferimento-media-voti-per.algo");

let datoAllAvvio = { percorso: "", testo: "" };
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return datoAllAvvio.percorso;
      case "leggi_progetto":
        if (argomenti.percorso !== datoAllAvvio.percorso) throw new Error("file non trovato");
        return datoAllAvvio.testo;
      case "elenca_esempi":
      case "elenca_librerie":
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [], gruppi: [] };
      case "segna_modificato":
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
afterEach(() => cleanup());

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}
async function apriLaFinestra(testo: string, nome = "funzioni.algo"): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(testi.apertoIl, { file: nome }));
}
const clic = (e: Element) => act(async () => void fireEvent.click(e));
const premi = (key: string, shiftKey = false) => act(async () => void fireEvent.keyDown(document.body, { key, shiftKey }));

/** La scheda mostrata, il blocco corrente (il valore iniziale come lo scrive la sequenza attesa; `↩` davanti, col segno
 * della ripresa nel disegno) e «Dove sei». */
const istante = () => {
  const scheda = document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda") ?? "nessuna";
  const ripresa = document.querySelector("[data-segno-ripresa]") !== null ? "↩" : "";
  const correnti = [...document.querySelectorAll('[aria-current="step"]')]
    .filter((e) => !e.closest("[data-dove-sei]"))
    .map((e) => {
      const dato = e.getAttribute("data-iniziale-di");
      return dato !== null ? pausaSulValoreIniziale(dato) : (e.getAttribute("data-blocco") ?? e.getAttribute("data-fine") ?? "?");
    });
  const dove = [...document.querySelectorAll("[data-dove-sei] button")].map((b) => `${b.textContent}${b.getAttribute("aria-current") ? "*" : ""}`).join(" › ");
  return `${scheda} | ${ripresa}${correnti.join(",")} | ${dove}`;
};
/** Un tasto, poi l'attesa che il comando si fermi (una pausa, una lettura o la fine). */
async function eDopo(key: string, shiftKey = false): Promise<string> {
  await premi(key, shiftKey);
  await aspetta(`la fermata dopo ${shiftKey ? "Maiusc+" : ""}${key}`, () => statoMostrato() !== testi.statoInCorso);
  await giro();
  return istante();
}
const outputMostrato = () => [...document.querySelectorAll('[role="log"] [data-scrive]')].map((e) => e.textContent).join("");
const campoDellaLettura = () => document.querySelector<HTMLInputElement>('[role="log"] ~ div input')!;
async function scriviNellaConsole(valore: string): Promise<void> {
  const c = campoDellaLettura();
  await act(async () => void fireEvent.change(c, { target: { value: valore } }));
  await act(async () => void fireEvent.keyDown(c, { key: "Enter" }));
  await aspetta("la fermata dopo la riga", () => statoMostrato() !== testi.statoInCorso);
}
async function mostraLaFunzione(id: string): Promise<void> {
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector(`[data-elenco] [data-voce-funzione="${id}"]`)!);
  await giro();
}

const P = testi.schedaPrincipale;
// `tre-livelli`: il programma (f1) col valore iniziale di `n` e il salto `b1` a `mostra` (f2), che scrive in `b3` il
// risultato di `piu_uno_del_quadrato` (f3), la cui fine `b5` chiama `quadrato` (f4, la fine `b6`); poi le fini `b4` e `b2`.
// Dopo un ritorno, Esci si ferma sulla ripresa di chi chiama (ciò che restituisce piu_uno_del_quadrato, poi la scrittura).
test("Entra, Passo ed Esci su tre livelli: la scheda segue l'azione, e «Dove sei» dice le chiamate attive", async () => {
  await apriLaFinestra(TRE_LIVELLI);
  const visti: string[] = [];
  const tasti = [["F11", false], ["F11", false], ["F11", false], ["F11", false], ["F11", false], ["F11", true], ["F11", true], ["F10", false], ["F11", true], ["F10", false]] as const;
  // Le punte che entrano nel blocco corrente: nessuna sulle riprese (l'azione è a metà), una su ogni altra pausa.
  const punte: string[] = [];
  for (const [key, shift] of tasti) {
    visti.push(await eDopo(key, shift));
    const n = document.querySelectorAll("svg [data-freccia]").length;
    if (statoMostrato() !== testi.statoFinita) punte.push(`${visti.at(-1)!.includes("↩") ? "ripresa" : "pausa"} ${n}`);
  }
  expect([...new Set(punte)].sort()).toEqual(["pausa 1", "ripresa 0"]);
  expect(visti).toEqual([
    `f1 | ${pausaSulValoreIniziale("n")} | ${P}*`,
    `f1 | b1 | ${P}*`,
    `f2 | b3 | ${P} › mostra*`,
    `f3 | b5 | ${P} › mostra › piu_uno_del_quadrato*`,
    `f4 | b6 | ${P} › mostra › piu_uno_del_quadrato › quadrato*`,
    `f3 | ↩b5 | ${P} › mostra › piu_uno_del_quadrato*`,
    `f2 | ↩b3 | ${P} › mostra*`,
    `f2 | b4 | ${P} › mostra*`,
    `f1 | b2 | ${P}*`,
    `f1 |  | ${P}*`,
  ]);
  expect(outputMostrato()).toBe("risultato: 17\n");
});

test("Passo su una chiamata la esegue tutta, senza lasciare il programma principale", async () => {
  await apriLaFinestra(TRE_LIVELLI);
  const visti: string[] = [];
  for (let k = 0; k < 3; k++) visti.push(await eDopo("F10"));
  expect(visti).toEqual([`f1 | ${pausaSulValoreIniziale("n")} | ${P}*`, `f1 | b1 | ${P}*`, `f1 | b2 | ${P}*`]);
  expect(outputMostrato()).toBe("risultato: 17\n");
});

test("il clic su un nome di «Dove sei» mostra la sua scheda col blocco della chiamata scelto; la pausa dopo segue di nuovo l'azione", async () => {
  await apriLaFinestra(TRE_LIVELLI);
  for (let k = 0; k < 5; k++) await eDopo("F11");
  expect(istante()).toBe(`f4 | b6 | ${P} › mostra › piu_uno_del_quadrato › quadrato*`);
  await clic(document.querySelector('[data-dove-sei] [data-livello="1"]')!);
  await giro();
  await giro();
  const scelto = () => document.querySelector('[data-blocco][aria-pressed="true"]')?.getAttribute("data-blocco") ?? "nessuno";
  expect({ scheda: istante().split(" | ")[0], scelto: scelto() }).toEqual({ scheda: "f2", scelto: "b3" });
  await clic(document.querySelector('[data-dove-sei] [data-livello="0"]')!);
  await giro();
  await giro();
  expect({ scheda: istante().split(" | ")[0], scelto: scelto() }).toEqual({ scheda: "f1", scelto: "b1" });
  expect(await eDopo("F11", true)).toBe(`f3 | ↩b5 | ${P} › mostra › piu_uno_del_quadrato*`);
});

test("F5 sulla scheda di una funzione la esegue da sola: il parametro chiesto, poi ciò che restituisce", async () => {
  await apriLaFinestra(RIFERIMENTO);
  await mostraLaFunzione("f3");
  expect(istante()).toBe("f3 |  | ");
  await premi("F5");
  await aspetta("la lettura del parametro", () => statoMostrato() === riempi(testi.statoChiede, { dato: "voto" }));
  expect(istante()).toBe("f3 |  | valido*");
  // Un parametro per valore: nessuno dei due comandi.
  expect([document.querySelector("[data-senza-valore]"), document.querySelector("[data-ogni-elemento]")].map((e) => e === null)).toEqual([true, true]);
  await scriviNellaConsole("7");
  expect({ stato: statoMostrato(), output: outputMostrato() }).toEqual({ stato: testi.statoFinita, output: "→ true\n" });
  // A colonna aperta F5 ricomincia la stessa, anche dal programma principale.
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  await premi("F5");
  await aspetta("la lettura del parametro, di nuovo", () => statoMostrato() === riempi(testi.statoChiede, { dato: "voto" }));
  expect(istante()).toBe("f3 |  | valido*");
});

test("una procedura da sola: il parametro per uscita non si chiede; la lettura della procedura sì, senza «Senza valore»", async () => {
  await apriLaFinestra(RIFERIMENTO);
  await mostraLaFunzione("f2");
  await premi("F5");
  await aspetta("la lettura nella procedura", () => statoMostrato() === riempi(testi.statoChiede, { dato: "numero" }));
  // È la lettura della procedura, non un parametro: nessuno dei due comandi, e nulla è arrivato senza valore.
  expect([document.querySelector("button[data-senza-valore]"), document.querySelector("[data-ogni-elemento]"), document.querySelector("[data-arrivato-senza-valore]")].map((e) => e === null)).toEqual([true, true, true]);
  await scriviNellaConsole("4");
  expect({ stato: statoMostrato(), output: outputMostrato() }).toEqual({ stato: testi.statoFinita, output: "\nnumero = 4\n" });
});

test("un parametro vettore si chiede elemento per elemento; «A ogni elemento» dà lo stesso valore a tutti", async () => {
  await apriLaFinestra(COPIE);
  await mostraLaFunzione("f2");
  await premi("F5");
  await aspetta("il primo elemento", () => statoMostrato() === riempi(testi.statoChiede, { dato: "w[0]" }));
  expect(document.querySelector('[role="log"] ~ p[role="status"]')?.textContent).toBe(riempi(testi.annuncioChiede, { dato: "w[0]" }));
  expect(document.querySelector("button[data-senza-valore]") === null).toBe(true);
  await act(async () => void fireEvent.change(campoDellaLettura(), { target: { value: "5" } }));
  await clic(document.querySelector("button[data-ogni-elemento]")!);
  await aspetta("la stringa", () => statoMostrato() === riempi(testi.statoChiede, { dato: "s" }));
  // Il secondo parametro non è un vettore: nessun «A ogni elemento».
  expect(document.querySelector("button[data-ogni-elemento]") === null).toBe(true);
  await scriviNellaConsole("ok");
  expect({ stato: statoMostrato(), output: outputMostrato() }).toEqual({ stato: testi.statoFinita, output: COPIE_ATTESO });
});
// L'atteso del caso «vettore ripetuto» del corpus, lo stesso valore a tutti gli elementi.
const COPIE_ATTESO = "99 ok!\n";

test("una funzione che restituisce un vettore, da sola: una riga «→» per elemento nella console e nella tabella di traccia", async () => {
  await apriLaFinestra(corpus("tappa-3/risultato-vettore-assegnato.algo"), "vettore.algo");
  await mostraLaFunzione("f2");
  await premi("F5");
  await aspetta("il primo elemento", () => statoMostrato() === riempi(testi.statoChiede, { dato: "w[0]" }));
  await act(async () => void fireEvent.change(campoDellaLettura(), { target: { value: "4" } }));
  await clic(document.querySelector("button[data-ogni-elemento]")!);
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  // Scritto a mano: doppi raddoppia ogni elemento.
  expect(outputMostrato()).toBe("→ [0] = 8\n→ [1] = 8\n→ [2] = 8\n");
  await clic(document.querySelector('[data-comando="tabella"]')!);
  await giro();
  const ultima = [...document.querySelectorAll("table[data-traccia] tbody tr[data-riga]")].at(-1);
  expect(ultima?.textContent).toContain(`→ [0] = 8${testi.disegnoACapo}→ [1] = 8${testi.disegnoACapo}→ [2] = 8`);
});

test("un punto di interruzione dentro una procedura ferma «Esegui» lì, e la scheda la mostra", async () => {
  await apriLaFinestra(TRE_LIVELLI);
  await mostraLaFunzione("f2");
  await clic(document.querySelector('[data-blocco="b3"]')!);
  await premi("F9");
  await giro();
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  expect(await eDopo("F5")).toBe(`f2 | b3 | ${P} › mostra*`);
  expect(await eDopo("F5")).toBe(`f1 |  | ${P}*`);
});

/** Il riquadro del watch del nome `dato` puntato nel disegno della scheda mostrata, dentro `dove` (un blocco o la fine). */
async function watchDi(dove: string, dato: string): Promise<string> {
  const n = document.querySelector(`${dove} [data-watch-dato="${dato}"]`);
  if (!n) return `nessun nome «${dato}» in ${dove}`;
  await act(async () => void fireEvent.pointerOver(n));
  await giro();
  const w = document.querySelector("[data-watch]");
  const testo = w ? [...w.querySelectorAll("[data-watch-nome], [data-watch-valore], [data-watch-riferimento]")].map((e) => e.textContent).join(" | ") : "nessun watch";
  await act(async () => void fireEvent.pointerOut(n));
  await giro();
  return testo;
}

test("il watch dentro una procedura e una funzione: i loro dati, anche in ciò che restituisce", async () => {
  await apriLaFinestra(TRE_LIVELLI);
  for (let k = 0; k < 3; k++) await eDopo("F11");
  expect(istante()).toBe(`f2 | b3 | ${P} › mostra*`);
  expect(await watchDi('[data-blocco="b3"]', "q")).toBe("q | 4");
  for (let k = 0; k < 2; k++) await eDopo("F11");
  // `quadrato` (f4) restituisce `y * y`, con `y` = 4 (piu_uno_del_quadrato le passa `x`, che vale `q`).
  expect(istante()).toBe(`f4 | b6 | ${P} › mostra › piu_uno_del_quadrato › quadrato*`);
  expect(await watchDi('[data-restituisce="b6"]', "y")).toBe("y | 4");
  // Nella scheda di chi chiama, il suo dato: `q` di `mostra` è ancora attiva.
  await clic(document.querySelector('[data-dove-sei] [data-livello="1"]')!);
  await giro();
  expect(await watchDi('[data-blocco="b3"]', "q")).toBe("q | 4");
});

test("il watch di un parametro di uscita: il suo valore è quello del dato di chi chiama, e il riquadro dice quale e che è di uscita", async () => {
  await apriLaFinestra(RIFERIMENTO);
  await mostraLaFunzione("f2");
  await clic(document.querySelector('[data-blocco="b19"]')!);
  await premi("F9");
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  await premi("F5");
  // La lettura dice il nome del blocco, e accanto il dato di chi chiama che riceve il valore.
  await aspetta("la lettura dentro la procedura", () => statoMostrato() === riempi(testi.statoChiede, { dato: "numero" }));
  expect([campoDellaLettura().closest("label")?.firstElementChild?.textContent, document.querySelector("[data-lettura-di]")?.textContent]).toEqual([
    riempi(testi.consoleValore, { dato: "numero" }),
    riempi(testi.watchUscita, { dato: "n", funzione: P }),
  ]);
  await scriviNellaConsole("4");
  expect(istante()).toBe(`f2 | b19 | ${P} › leggi_numero*`);
  expect(await watchDi('[data-blocco="b19"]', "numero")).toBe(`numero | 4 | ${riempi(testi.watchUscita, { dato: "n", funzione: P })}`);
});

test("il watch di un parametro per riferimento: il riquadro dice quale dato di chi chiama, e che è per riferimento", async () => {
  // Lo stesso programma con `numero` per riferimento, e `n` con un valore prima della chiamata (il rif lo vuole).
  const conRif = JSON.parse(RIFERIMENTO);
  conRif.functions[1].data[0].parameter = "reference";
  conRif.functions[0].data[0].initial = "0";
  await apriLaFinestra(JSON.stringify(conRif));
  await mostraLaFunzione("f2");
  await clic(document.querySelector('[data-blocco="b19"]')!);
  await premi("F9");
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  await premi("F5");
  await aspetta("la lettura dentro la procedura", () => statoMostrato() === riempi(testi.statoChiede, { dato: "numero" }));
  const lettura = document.querySelector("[data-lettura-di]")?.textContent;
  await scriviNellaConsole("4");
  expect({ lettura, watch: await watchDi('[data-blocco="b19"]', "numero") }).toEqual({
    lettura: riempi(testi.watchRiferimento, { dato: "n", funzione: P }),
    watch: `numero | 4 | ${riempi(testi.watchRiferimento, { dato: "n", funzione: P })}`,
  });
});

test("Entra ed Esci sono nella barra solo se il progetto ha procedure o funzioni", async () => {
  const comandi = () => [...document.querySelectorAll<HTMLElement>('header [data-gruppo="esecuzione"] [data-comando]')].map((e) => e.dataset.comando).filter((c) => c === "entra" || c === "esci");
  await apriLaFinestra(TRE_LIVELLI);
  expect(comandi()).toEqual(["entra", "esci"]);
  cleanup();
  await apriLaFinestra(SENZA, "senza.algo");
  expect(comandi()).toEqual([]);
});
