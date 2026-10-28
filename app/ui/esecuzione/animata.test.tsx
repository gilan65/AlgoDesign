// L'esecuzione animata nella finestra, sotto happy-dom: la finestra vera (`Applicazione`) col file dato all'avvio da
// un guscio simulato, il comando «Animata» della barra e la velocità dal suo menu.
//
// - «Animata» fa un passo alla volta da sola: le pause sono quelle di F11, nell'ordine dell'atteso scritto a mano
//   (`atteso-del-riferimento.ts`), una ogni tanto quanto dice la velocità; una lettura aspetta il valore nella
//   console e, dopo Invio, l'animata riprende. Con le funzioni entra nelle chiamate (la scheda segue l'azione) e si
//   ferma anche sulla ripresa dopo un ritorno, che un punto di interruzione sul blocco non ferma.
// - Un punto di interruzione la ferma in pausa lì; F5, F10, «Ferma» e un secondo clic su «Animata» la fermano; un
//   altro progetto (Nuovo, Apri, un esempio), che chiude l'esecuzione, la rilascia.
// - La velocità si sceglie dal menu (lenta, media, veloce) e si ricorda nelle preferenze.
//
// Che cosa NON guarda:
// - che cosa si muove nel disegno durante l'animata e il movimento ridotto del sistema: nei motori
//   (`e2e/watch.e2e.ts`), dove ci sono le transizioni e la preferenza del sistema si emula;
// - il ritmo esatto: solo che fra due passi passi almeno la durata scelta (un limite superiore dipenderebbe dal
//   carico della macchina);
// - l'animata nella barretta flottante: gli stessi comandi del gruppo (`barra.e2e.ts`).

import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { pausaSulValoreIniziale, sequenzaAttesa } from "../../core/esecuzione/atteso-del-riferimento";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { preferenzeDa, scelteIniziali, type Scelte } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const riferimento = readFileSync(new URL("../../casi/tappa-1/riferimento-media-voti.algo", import.meta.url), "utf8");

let datoAllAvvio = { percorso: "", testo: "" };
/** Le preferenze scritte dal guscio, nell'ordine. */
let preferenzeScritte: Record<string, unknown>[] = [];
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
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [{ nome: "1 riferimento.algo", testo: riferimento }], gruppi: [] };
      case "scegli_file_da_aprire":
        return datoAllAvvio.percorso;
      case "segna_modificato":
        return null;
      case "scrivi_preferenze":
        preferenzeScritte.push(argomenti.preferenze as Record<string, unknown>);
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
beforeEach(() => {
  cleanup();
  preferenzeScritte = [];
});

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 5)));
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
/** Il blocco corrente letto dagli ausili; il valore iniziale di un dato come lo scrive la sequenza attesa. */
const corrente = () => {
  const e = document.querySelector('[aria-current="step"]');
  const dato = e?.getAttribute("data-iniziale-di");
  return dato ? pausaSulValoreIniziale(dato) : (e?.getAttribute("data-blocco") ?? null);
};
const animata = () => document.querySelector<HTMLButtonElement>('header [data-comando="animata"]');
const chiede = () => new RegExp(`^${riempi(it.statoChiede, { dato: "\\w+" })}$`).test(statoMostrato());

/** Aspetta che `fatto` sia vero; a ogni giro annota il blocco corrente quando cambia, con l'istante. */
async function aspetta(cosa: string, fatto: () => boolean, pause: { blocco: string; t: number }[] = [], limite = 20_000): Promise<void> {
  const inizio = performance.now();
  while (performance.now() - inizio < limite) {
    const c = corrente();
    if (c !== null && c !== pause.at(-1)?.blocco) pause.push({ blocco: c, t: performance.now() });
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

async function apriLaFinestra(scelte: Scelte = scelteIniziali): Promise<void> {
  datoAllAvvio = { percorso: "C:\\corpus\\riferimento-media-voti.algo", testo: riferimento };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta("il riferimento aperto", () => avviso() === riempi(it.apertoIl, { file: "riferimento-media-voti.algo" }));
}

async function clic(e: Element | null, cosa: string): Promise<void> {
  if (!e) throw new Error(`manca ${cosa}`);
  await act(async () => {
    fireEvent.click(e);
  });
}

async function premi(tasto: string, conMaiusc = false, conCtrl = false): Promise<void> {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: tasto, shiftKey: conMaiusc, ctrlKey: conCtrl });
  });
}

async function scrivi(testo: string): Promise<void> {
  const campo = document.activeElement;
  if (!(campo instanceof HTMLInputElement)) throw new Error("il fuoco non è nella riga della console");
  await act(async () => {
    fireEvent.change(campo, { target: { value: testo } });
  });
  await act(async () => {
    fireEvent.keyDown(campo, { key: "Enter" });
  });
}

const veloce: Scelte = { ...scelteIniziali, velocitaAnimata: "veloce" };

// ------------------------------------------------------------------------------- un passo alla volta

test("«Animata» fa un passo alla volta da sola, come F11: aspetta il valore di una lettura e dopo Invio riprende", async () => {
  await apriLaFinestra(veloce);
  const pause: { blocco: string; t: number }[] = [];
  await clic(animata(), "«Animata»");
  expect(animata()!.getAttribute("aria-pressed")).toBe("true");
  // Le prime azioni sono i cinque valori iniziali, una pausa ciascuno; poi una lettura: l'animata aspetta il valore.
  await aspetta("la prima lettura", chiede, pause);
  await scrivi("0");
  // Poi «n < 1 or n > 30», la scrittura, la condizione del ciclo e di nuovo la lettura.
  await aspetta("la seconda lettura", () => chiede() && pause.length >= 10, pause);
  await scrivi("4");
  await aspetta("la terza lettura (il primo voto)", () => chiede() && pause.length >= 15, pause);
  expect(pause.map((p) => p.blocco)).toEqual(sequenzaAttesa.slice(0, 15));
  // Fra due passi passa almeno la durata della velocità scelta (veloce: 200 ms), tranne dopo una lettura (le pause 6
  // e 10, sulle letture). Si misura sulla SOMMA degli intervalli: l'istante di una pausa è quello in cui la prova la
  // vede, e una vista in ritardo (la macchina carica) accorcia l'intervallo dopo di quanto allunga quello prima (in un
  // collaudo: 259, 258, 163, coi passi veri di circa 210 ms); la somma non cambia, e un passo senza attesa la dimezza.
  const intervalli = pause.slice(1).map((p, k) => Math.round(p.t - pause[k]!.t)).filter((_, k) => ![5, 9].includes(k));
  console.log(`animata veloce, intervalli fra le pause (ms): ${intervalli.join(", ")}`);
  expect(intervalli.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(intervalli.length * 190);
  // E nessun intervallo sotto un quarto della durata: un passo senza attesa (pochi ms) la somma lo assorbirebbe, mentre
  // una vista in ritardo accorcia l'intervallo dopo di decine di ms (163 il più corto misurato sotto carico).
  expect(Math.min(...intervalli)).toBeGreaterThanOrEqual(50);
  expect(animata()!.getAttribute("aria-pressed")).toBe("true");
}, 60_000);

// Due chiamate in un'espressione: `r ← doppio(1) + triplo(2)` (b1), la scrittura b2, la fine b3; `doppio` (f2) ha b4 e la
// fine b5, `triplo` (f3) b6 e la fine b7. Il punto su b1 ferma l'animata sull'azione, non sulle sue riprese.
const dueChiamate = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "due chiamate" },
  functions: [
    { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "r", value: "doppio(1) + triplo(2)", breakpoint: true }, { id: "b2", kind: "write", values: ["r"], newline: true }], end: { id: "b3" } },
    { id: "f2", kind: "function", name: "doppio", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }, { name: "d", type: "integer" }], body: [{ id: "b4", kind: "assignment", target: "d", value: "x * 2" }], end: { id: "b5", return_value: "d" } },
    { id: "f3", kind: "function", name: "triplo", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }, { name: "t", type: "integer" }], body: [{ id: "b6", kind: "assignment", target: "t", value: "x * 3" }], end: { id: "b7", return_value: "t" } },
  ],
});

test("con le funzioni l'animata entra nelle chiamate come F11, la scheda segue l'azione, e si ferma anche sulle riprese; un punto sul blocco che riprende non la spegne", async () => {
  datoAllAvvio = { percorso: "C:\\corpus\\due-chiamate.algo", testo: dueChiamate };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={veloce} />);
  });
  await aspetta("il progetto aperto", () => avviso() === riempi(it.apertoIl, { file: "due-chiamate.algo" }));
  /** La scheda e il blocco corrente (o la fine), col segno della ripresa nel disegno. */
  const istante = () => {
    const e = [...document.querySelectorAll('[aria-current="step"]')].find((x) => !x.closest("[data-dove-sei]"));
    if (e === undefined) return null;
    const scheda = document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda");
    return `${scheda}|${document.querySelector("[data-segno-ripresa]") ? "↩" : ""}${e.getAttribute("data-blocco") ?? e.getAttribute("data-fine")}`;
  };
  // Il primo clic si ferma sul punto, la prima azione; il secondo va fino alla fine, annotando ogni istante diverso.
  await clic(animata(), "«Animata»");
  await aspetta("la pausa sul punto", () => istante() === "f1|b1" && animata()!.getAttribute("aria-pressed") === "false");
  const visti: string[] = [istante()!];
  await clic(animata(), "«Animata»");
  await aspetta("la fine", () => {
    const x = istante();
    if (x !== null && x !== visti.at(-1)) visti.push(x);
    return statoMostrato() === it.statoFinita;
  });
  expect(visti).toEqual(["f1|b1", "f2|b4", "f2|b5", "f1|↩b1", "f3|b6", "f3|b7", "f1|↩b1", "f1|b2", "f1|b3"]);
  expect(animata()!.getAttribute("aria-pressed")).toBe("false");
}, 60_000);

// ------------------------------------------------------------------------------- che cosa la ferma

test("un punto di interruzione ferma l'animata in pausa lì", async () => {
  await apriLaFinestra(veloce);
  // Il punto su «i ← 0» (b6): il blocco scelto col clic, poi F9.
  await clic(document.querySelector('[data-blocco="b6"]'), "il blocco b6");
  await premi("F9");
  await clic(animata(), "«Animata»");
  await aspetta("la prima lettura", chiede);
  await scrivi("4");
  await aspetta("la pausa sul punto", () => corrente() === "b6");
  // Resta lì: dopo tre volte la durata di un passo, la stessa pausa.
  await new Promise((r) => setTimeout(r, 700));
  await giro();
  expect({ corrente: corrente(), stato: statoMostrato(), premuto: animata()!.getAttribute("aria-pressed") }).toEqual({
    corrente: "b6",
    stato: riempi(it.statoInPausa, { n: "9" }),
    premuto: "false",
  });
}, 60_000);

test("F10, F5, «Ferma» e un secondo clic su «Animata» fermano l'animata", async () => {
  await apriLaFinestra(veloce);
  for (const [come, ferma] of [
    ["un secondo clic", () => clic(animata(), "«Animata»")],
    ["F10", () => premi("F10")],
    ["F5", () => premi("F5")],
    ["«Ferma»", () => clic(document.querySelector('header [data-comando="ferma"]'), "«Ferma»")],
  ] as const) {
    await clic(animata(), "«Animata»");
    await aspetta("la lettura", chiede);
    await scrivi(come === "F5" ? "4" : "0");
    // In pausa dopo la lettura: l'animata va avanti da sola.
    await aspetta(`un passo prima di ${come}`, () => corrente() !== null);
    await ferma();
    // F10 fa il suo passo, F5 prosegue fino alla lettura dopo: si aspetta che il comando si fermi.
    await aspetta(`fermo dopo ${come}`, () => !statoMostrato().startsWith(it.statoInCorso) && (come !== "F5" || chiede()));
    expect(`${come}: ${animata()!.getAttribute("aria-pressed")}`).toBe(`${come}: false`);
    // Ferma davvero: nessun passo in più dopo tre volte la durata di un passo.
    const prima = statoMostrato();
    await new Promise((r) => setTimeout(r, 700));
    await giro();
    expect(`${come}: ${statoMostrato()}`).toBe(`${come}: ${prima}`);
    if (come !== "«Ferma»") await clic(document.querySelector('header [data-comando="ferma"]'), "«Ferma»");
  }
}, 60_000);

test("un altro progetto (Nuovo, Apri, un esempio) chiude l'esecuzione e rilascia «Animata»", async () => {
  /** La finestra di dialogo col titolo dato. */
  const finestra = (titolo: string) => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find((d) => d.querySelector("h2")?.textContent === titolo) ?? null;
  const pulsanteIn = (f: HTMLElement | null, testo: string) => [...(f?.querySelectorAll("button") ?? [])].find((b) => b.textContent === testo) ?? null;
  const vie: [string, () => Promise<void>][] = [
    [
      "Nuovo",
      async () => {
        await premi("n", false, true);
        await aspetta("la finestra Progetto", () => finestra(it.progettoNuovoTitolo) !== null);
        const nome = finestra(it.progettoNuovoTitolo)!.querySelector("input")!;
        await act(async () => {
          fireEvent.change(nome, { target: { value: "altro" } });
        });
        await clic(pulsanteIn(finestra(it.progettoNuovoTitolo), it.progettoCrea), "«Crea»");
      },
    ],
    ["Apri", () => premi("o", false, true)],
    [
      "un esempio",
      async () => {
        // «Esempi…» è la seconda voce del menu «Aiuto», dopo la guida: sotto happy-dom si sceglie dalla tastiera, non col
        // clic.
        await clic(document.querySelector('header [data-menu="aiuto"]'), "il menu «Aiuto»");
        await aspetta("il menu «Aiuto»", () => document.querySelector('[role="menu"]') !== null);
        await act(async () => {
          fireEvent.keyDown(document.querySelector('[role="menu"]')!, { key: "Home" });
        });
        await aspetta("«Guida per lo studente» evidenziata", () => document.querySelector('[data-highlighted][data-comando="guida"]') !== null);
        await act(async () => {
          fireEvent.keyDown(document.querySelector('[role="menu"]')!, { key: "ArrowDown" });
        });
        await aspetta("«Esempi…» evidenziata", () => document.querySelector('[data-highlighted][data-comando="esempi"]') !== null);
        await act(async () => {
          fireEvent.keyDown(document.querySelector('[role="menu"]')!, { key: "Enter" });
        });
        await aspetta("la finestra degli esempi", () => finestra(it.esempiTitolo) !== null);
        await clic(pulsanteIn(finestra(it.esempiTitolo), it.esempioApri), "«Apri» dell'esempio");
      },
    ],
  ];
  const esiti: string[] = [];
  for (const [come, gesto] of vie) {
    cleanup();
    await apriLaFinestra(veloce);
    await clic(animata(), "«Animata»");
    // L'animata aspetta il valore della prima lettura: è premuta, l'esecuzione c'è (controllo positivo).
    await aspetta("la lettura", chiede);
    expect(`${come} prima: ${animata()!.getAttribute("aria-pressed")}`).toBe(`${come} prima: true`);
    await gesto();
    await aspetta(`l'esecuzione chiusa da ${come}`, () => statoMostrato() === it.statoPronto);
    await giro();
    esiti.push(`${come}: premuta ${animata()!.getAttribute("aria-pressed")}`);
  }
  expect(esiti).toEqual(["Nuovo: premuta false", "Apri: premuta false", "un esempio: premuta false"]);
}, 60_000);

// --------------------------------------------------------------------------------------- la velocità

test("la velocità si sceglie dal menu della barra e si ricorda nelle preferenze", async () => {
  await apriLaFinestra();
  const velocita = () => document.querySelector<HTMLButtonElement>('header [data-comando="velocita"]');
  // La predefinita: media.
  expect(velocita()?.textContent).toContain(it.velocitaMedia);
  await clic(velocita(), "il menu della velocità");
  await aspetta("il menu aperto", () => document.querySelector('[role="menu"] [role="menuitemradio"]') !== null);
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  // Dalla tastiera (sotto happy-dom il clic su una voce chiude il menu senza sceglierla): Home porta alla prima
  // voce, «Lenta», Invio la sceglie.
  await act(async () => {
    fireEvent.keyDown(menu, { key: "Home" });
  });
  await giro();
  await act(async () => {
    fireEvent.keyDown(menu, { key: "Enter" });
  });
  await aspetta("la preferenza scritta", () => preferenzeScritte.length > 0);
  expect(preferenzeScritte.at(-1)?.velocitaAnimata).toBe("lenta");
  expect(velocita()?.textContent).toContain(it.velocitaLenta);
  // Riletta all'avvio dopo: la stessa.
  cleanup();
  await apriLaFinestra(preferenzeDa(preferenzeScritte.at(-1)).scelte);
  expect(velocita()?.textContent).toContain(it.velocitaLenta);
}, 60_000);
