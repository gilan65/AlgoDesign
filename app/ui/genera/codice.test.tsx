// Il codice generato nella finestra, sotto happy-dom: la finestra vera (`Applicazione`) col file dato all'avvio da un
// guscio simulato, il pulsante «Genera» della barra, i tasti e i clic come li dà l'utente.
//
// - «Genera» apre la colonna del codice anche senza esecuzione; le tre linguette mostrano lo stesso testo che i
//   generatori danno con le parole del test differenziale (`paroleDelloPseudocodice` della lingua), riga per riga, e una
//   riga scritta a mano per linguetta; una modifica (un blocco tolto, poi Annulla) cambia il codice; in inglese il
//   Python usa i nomi inglesi.
// - Un progetto con errori non si genera: il riquadro lo dice, «Copia» e «Salva…» non sono disponibili.
// - La riga corrente: con F10 a ogni pausa le righe evidenziate sono quelle del blocco della pausa (o della
//   dichiarazione del dato, sul suo valore iniziale), scritte a mano nei tre linguaggi; tre righe del C per una
//   scrittura; la riga dell'errore che ferma il programma, segnata come errore; con F5 solo al punto di
//   interruzione, nessuna alla fine senza errore; sulla fine la riga della fine (nel Python nessuna: non ce n'è una);
//   coi valori iniziali nascosti nel flowchart, la dichiarazione del dato. In un ciclo `per` la riga della fase dell'evento: nel Python la
//   partenza, il controllo e l'aumento hanno una riga ciascuno, nel C e nello pseudocodice la riga del ciclo le ha tutte.
// - Il codice e la tabella si escludono durante un'esecuzione: «Genera» mette il codice al posto della tabella,
//   «Tabella» la rimette, «Genera» tolto la riporta.
// - «Copia» mette negli appunti il testo del linguaggio mostrato; «Salva…» propone il nome del progetto con l'estensione
//   del linguaggio e scrive il testo nel file scelto.
// - Il menu dei linguaggi: le linguette sono gli accesi delle preferenze nel loro ordine, all'avvio si mostra il primo e
//   «Salva…» usa il mostrato; nelle Impostazioni (scheda «Console») ▲ ▼ spostano una riga col fuoco sul pulsante
//   premuto, anche in cima o in fondo dove non fa nulla; l'ultimo acceso non si spegne; «Conferma» cambia le linguette e
//   scrive le preferenze; spenta la linguetta guardata, si mostra la prima.
//
// Che cosa NON guarda:
// - l'aspetto, lo scorrimento fino alla riga corrente, il fuoco dopo «Copia» e l'animata (nei motori,
//   `e2e/codice.e2e.ts`);
// - la finestra del sistema vera e la domanda di sostituire un file (è la stessa dell'esportazione della tabella, provata
//   in `e2e/tabella.e2e.ts`);
// - i programmi del corpus uno per uno (il testo è quello dei generatori, provati sul corpus dalle loro prove e dal test
//   differenziale).

import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { tetti } from "../../core/controllo/controllo";
import { c } from "../../core/genera/c";
import { testoDelCodice, type Generato } from "../../core/genera/forma";
import { pseudocodice } from "../../core/genera/pseudocodice";
import { python } from "../../core/genera/python";
import { apri } from "../../core/progetto/formato";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";
import { paroleDelloPseudocodice } from "./parole";

const misura = (t: string) => [...t].length * 10;

/** Una lettura, un elemento di un vettore, una scrittura con un carattere (tre righe nel C), un indice letto che va
 * fuori dal vettore con n = 5. */
const DOPPIO = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "doppio" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer", role: "input" },
        { name: "v", type: "integer", size: 3, initial: { each: "0" } },
        { name: "i", type: "integer", initial: "1" },
        { name: "c", type: "character", initial: "'ì'" },
        { name: "s", type: "integer", role: "output" },
      ],
      body: [
        { id: "b1", kind: "read", target: "n" },
        { id: "b2", kind: "assignment", target: "v[i]", value: "n * 2" },
        { id: "b3", kind: "write", values: ['"doppio "', "c", "v[i]"], newline: true },
        { id: "b4", kind: "assignment", target: "s", value: "v[n]" },
      ],
      end: { id: "b5" },
    },
  ],
});
const progettoDoppio = (() => {
  const r = apri(DOPPIO);
  if (!r.ok) throw new Error("il progetto della prova non si apre");
  return r.progetto;
})();

/** Il file dato all'avvio, i file scritti, le finestre del codice aperte (con gli argomenti) e ciò che restituiscono. */
let datoAllAvvio = { percorso: "", testo: "" };
let scritti: { percorso: string; testo: string }[] = [];
let finestreDelCodice: Record<string, unknown>[] = [];
let sceltoPerIlCodice: { percorso: string; sostituire: boolean } | null = null;
/** Le preferenze scritte dalle Impostazioni, una per «Conferma». */
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
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [], gruppi: [] };
      case "segna_modificato":
        return null;
      case "scegli_file_del_codice":
        finestreDelCodice.push(argomenti);
        return sceltoPerIlCodice;
      case "scrivi_progetto":
        scritti.push({ percorso: String(argomenti.percorso), testo: String(argomenti.testo) });
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
  scritti = [];
  finestreDelCodice = [];
  sceltoPerIlCodice = null;
  preferenzeScritte = [];
});

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";

async function aspetta(cosa: string, fatto: () => boolean, giri = 20_000): Promise<void> {
  for (let i = 0; i < giri; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

async function apriLaFinestra(testo = DOPPIO, lingua: "it" | "en" = "it", scelte = scelteIniziali): Promise<void> {
  datoAllAvvio = { percorso: "C:\\prove\\doppio.algo", testo };
  await act(async () => {
    render(<Applicazione linguaIniziale={lingua} misura={misura} scelteIniziali={scelte} />);
  });
  const t = lingua === "it" ? it : en;
  await aspetta("il file aperto", () => avviso() === riempi(t.apertoIl, { file: "doppio.algo" }));
}

const clic = (e: Element | null | undefined, cosa: string) => {
  if (!e) throw new Error(`manca ${cosa}`);
  return act(async () => void fireEvent.click(e));
};
const premi = (tasto: string, altro: Partial<KeyboardEventInit> = {}, su: Element = document.activeElement ?? document.body) => act(async () => void fireEvent.keyDown(su, { key: tasto, ...altro }));

const comando = (id: string) => document.querySelector<HTMLButtonElement>(`header [data-comando="${id}"]`);
const regione = () => document.querySelector<HTMLElement>(`section[aria-label="${it.codiceGenerato}"]`);
const linguetta = (nome: string) => [...(regione()?.querySelectorAll('[role="tab"]') ?? [])].find((t) => t.textContent === nome);
const scelta = () => regione()?.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? null;
/** Le righe mostrate (senza il numero), e quelle evidenziate col loro genere. */
const righe = () => [...(regione()?.querySelectorAll<HTMLElement>("[data-riga]") ?? [])].map((r) => r.lastElementChild?.textContent ?? "").map((t) => (t === " " ? "" : t));
const evidenziate = () =>
  [...(regione()?.querySelectorAll<HTMLElement>("[data-riga][data-evidenziata]") ?? [])].map((r) => `${r.dataset.evidenziata}: ${r.lastElementChild?.textContent}`);
const pulsanteNelRiquadro = (testo: string) => [...(regione()?.querySelectorAll("button") ?? [])].find((b) => b.textContent === testo);

/** Le righe del testo che il generatore dà, come le chiama il test differenziale. */
const delGeneratore = (g: Generato) => {
  if (!g.generato) throw new Error("il progetto della prova non si genera");
  return testoDelCodice(g.righe).split("\n").slice(0, -1);
};

async function scrivi(testo: string): Promise<void> {
  const campo = document.activeElement;
  if (!(campo instanceof HTMLInputElement)) throw new Error("il fuoco non è nella riga della console");
  await act(async () => void fireEvent.change(campo, { target: { value: testo } }));
  await act(async () => void fireEvent.keyDown(campo, { key: "Enter" }));
}

const chiede = () => statoMostrato() === riempi(it.statoChiede, { dato: "n" });
const inPausa = () => statoMostrato().startsWith(it.statoInPausa.split("{")[0]!);

// -------------------------------------------------------------------------------- il riquadro e le linguette

test("«Genera» mostra il codice delle tre linguette, lo stesso dei generatori col test differenziale, e lo segue a ogni modifica", async () => {
  await apriLaFinestra();
  expect({ regione: regione()?.outerHTML ?? null, premuto: comando("genera")?.getAttribute("aria-expanded") }).toEqual({ regione: null, premuto: "false" });
  // Chiuso, «Genera» non controlla un elemento che non c'è; aperto, controlla il riquadro.
  expect(comando("genera")?.hasAttribute("aria-controls")).toBe(false);
  await clic(comando("genera"), "«Genera»");
  expect(document.getElementById(comando("genera")?.getAttribute("aria-controls") ?? "(nessuno)")).not.toBeNull();
  expect({ premuto: comando("genera")?.getAttribute("aria-expanded"), scelta: scelta(), colonna: document.querySelector(`section[aria-label="${it.colonnaCodice}"]`) !== null }).toEqual({
    premuto: "true",
    scelta: it.linguaggioPseudocodice,
    colonna: true,
  });
  // Senza esecuzione, nessuna console.
  expect(document.querySelector(`[role="log"][aria-label="${it.console}"]`)?.outerHTML ?? null).toBeNull();
  const parole = paroleDelloPseudocodice("it");
  const attesi = { [it.linguaggioPseudocodice]: pseudocodice(progettoDoppio, tetti, parole), [it.linguaggioPython]: python(progettoDoppio, tetti, "it", parole), [it.linguaggioC]: c(progettoDoppio, tetti, "it", parole) };
  // Una riga per linguaggio scritta a mano: il generatore e il riquadro non si danno ragione da soli.
  const aMano = { [it.linguaggioPseudocodice]: [11, "    v[i] ← n * 2"], [it.linguaggioPython]: [17, "    v[i] = n * 2"], [it.linguaggioC]: [36, "    v[i] = n * 2;"] } as const;
  const conteggi: string[] = [];
  for (const nome of [it.linguaggioPseudocodice, it.linguaggioPython, it.linguaggioC]) {
    await clic(linguetta(nome), `la linguetta ${nome}`);
    expect(scelta()).toBe(nome);
    expect(righe()).toEqual(delGeneratore(attesi[nome]!));
    const [n, testo] = aMano[nome]!;
    expect(`${nome}: ${righe()[n]}`).toBe(`${nome}: ${testo}`);
    conteggi.push(`${nome} ${righe().length}`);
  }
  console.log(`righe mostrate: ${conteggi.join(", ")}`);
  // Una modifica: «s ← v[n]» tolto col tasto Canc sul suo blocco; Annulla lo rimette.
  await premi("Delete", {}, document.querySelector('[data-blocco="b4"]')!);
  expect(righe()).not.toContain("    s = v[n];");
  expect(righe().length).toBe(Number(conteggi[2]!.split(" ").at(-1)) - 1);
  await premi("z", { ctrlKey: true }, document.body);
  expect(righe()).toContain("    s = v[n];");
});

test("in inglese il codice usa le parole e i nomi inglesi, nelle tre linguette", async () => {
  await apriLaFinestra(DOPPIO, "en");
  await clic(document.querySelector('header [data-comando="genera"]'), "«Generate»");
  const r = document.querySelector(`section[aria-label="${en.codiceGenerato}"]`)!;
  // Una riga scritta a mano per linguaggio: la lettura del dato n, nelle parole inglesi; e nessuna riga italiana.
  const aMano = { [en.linguaggioPseudocodice]: "    READ n", [en.linguaggioPython]: "    n = read_integer()", [en.linguaggioC]: "    n = read_integer();" } as const;
  for (const [nome, riga] of Object.entries(aMano)) {
    await clic([...r.querySelectorAll('[role="tab"]')].find((t) => t.textContent === nome), `la linguetta ${nome}`);
    const testo = [...r.querySelectorAll("[data-riga]")].map((x) => x.lastElementChild?.textContent ?? "");
    expect(testo, nome).toContain(riga);
    expect(testo.filter((t) => /\b(leggi|scrivi|LEGGI|SCRIVI|leggi_intero)\b/.test(t)), nome).toEqual([]);
  }
});

test("un progetto con errori non si genera: il riquadro lo dice, e «Copia» e «Salva…» non sono disponibili", async () => {
  const conErrore = JSON.parse(DOPPIO);
  conErrore.functions[0].body.push({ id: "b6", kind: "assignment", target: "z", value: "1" });
  await apriLaFinestra(JSON.stringify(conErrore));
  await clic(comando("genera"), "«Genera»");
  expect({
    testo: regione()?.querySelector("p")?.textContent,
    righe: righe().length,
    copia: pulsanteNelRiquadro(it.codiceCopia)?.getAttribute("aria-disabled"),
    salva: pulsanteNelRiquadro(it.codiceSalva)?.getAttribute("aria-disabled"),
  }).toEqual({ testo: it.codiceConErrori, righe: 0, copia: "true", salva: "true" });
});

// ------------------------------------------------------------------------------------- la riga corrente

test("la riga corrente con F10: il blocco della pausa nei tre linguaggi, il valore iniziale, tre righe del C, l'errore", async () => {
  await apriLaFinestra();
  await clic(comando("genera"), "«Genera»");
  const nelLinguaggio = async (nome: string) => {
    await clic(linguetta(nome), `la linguetta ${nome}`);
    return evidenziate();
  };
  const passo = async (fino: () => boolean, cosa: string) => {
    await premi("F10");
    await aspetta(cosa, fino);
  };
  // Prima dell'esecuzione nessuna riga evidenziata.
  expect(evidenziate()).toEqual([]);
  // Le prime pause sono i valori iniziali, nell'ordine dei dati: la riga che dichiara il dato.
  await passo(inPausa, "la pausa sul valore iniziale di v");
  expect(evidenziate()).toEqual(["corrente:     v: vettore di 3 interi ← 0 in ogni elemento"]);
  expect(await nelLinguaggio(it.linguaggioC)).toEqual(["corrente:     int v[3] = {0};"]);
  await passo(() => evidenziate().length === 1 && evidenziate()[0] !== "corrente:     int v[3] = {0};", "la pausa sul valore iniziale di i");
  expect(evidenziate()).toEqual(["corrente:     int i = 1;"]);
  await passo(() => evidenziate()[0] !== "corrente:     int i = 1;", "la pausa sul valore iniziale di c");
  expect(await nelLinguaggio(it.linguaggioPython)).toEqual(["corrente:     c: str = 'ì'"]);
  // La lettura: la pausa sul blocco, poi il valore nella console.
  await passo(() => evidenziate()[0] === "corrente:     n = leggi_intero()", "la pausa sulla lettura");
  await premi("F10");
  await aspetta("la lettura", chiede);
  await scrivi("5");
  await aspetta("la pausa sull'assegnazione", () => inPausa() && evidenziate().length > 0);
  expect(evidenziate()).toEqual(["corrente:     v[i] = n * 2"]);
  expect(await nelLinguaggio(it.linguaggioPseudocodice)).toEqual(["corrente:     v[i] ← n * 2"]);
  // La scrittura: una riga nello pseudocodice e nel Python, tre nel C.
  await passo(() => evidenziate()[0] !== "corrente:     v[i] ← n * 2", "la pausa sulla scrittura");
  expect(evidenziate()).toEqual(['corrente:     SCRIVI "doppio ", c, v[i] ↵']);
  expect(await nelLinguaggio(it.linguaggioC)).toEqual(['corrente:     printf("doppio ");', "corrente:     scrivi_carattere(c);", 'corrente:     printf("%d\\n", v[i]);']);
  await passo(() => evidenziate()[0] === "corrente:     s = v[n];", "la pausa su «s ← v[n]»");
  // L'errore: v[5] fuori dal vettore; la riga del blocco resta, segnata come errore.
  await passo(() => statoMostrato() === it.statoFermataDaUnErrore, "l'errore");
  expect(evidenziate()).toEqual(["errore:     s = v[n];"]);
  expect(await nelLinguaggio(it.linguaggioPython)).toEqual(["errore:     s = v[n]"]);
  // «Ferma»: nessuna riga.
  await clic(comando("ferma"), "«Ferma»");
  expect(evidenziate()).toEqual([]);
}, 60_000);

test("la riga corrente in un ciclo per è quella della fase: nel Python una per fase, nel C e nello pseudocodice la riga del ciclo", async () => {
  await apriLaFinestra(readFileSync(new URL("../../casi/tappa-2/per.algo", import.meta.url), "utf8"));
  await clic(comando("genera"), "«Genera»");
  const nelLinguaggio = async (nome: string) => {
    await clic(linguetta(nome), `la linguetta ${nome}`);
    return evidenziate();
  };
  // Le prime quattro pause del primo `per` (da 1 a 5 col passo 2): la partenza, il controllo, il corpo, l'aumento.
  const viste: Record<string, string[]>[] = [];
  for (let k = 0; k < 4; k++) {
    const prima = statoMostrato();
    await premi("F10");
    await aspetta(`la pausa ${k + 1}`, () => inPausa() && statoMostrato() !== prima);
    viste.push({ python: await nelLinguaggio(it.linguaggioPython), c: await nelLinguaggio(it.linguaggioC), pseudo: await nelLinguaggio(it.linguaggioPseudocodice) });
  }
  const delFor = ["corrente:     for (i = 1; i <= 5; i += 2) {"];
  const delPer = ["corrente:     PER i DA 1 A 5 PASSO 2"];
  expect(viste).toEqual([
    { python: ["corrente:     i = 1"], c: delFor, pseudo: delPer },
    { python: ["corrente:     while i <= 5:"], c: delFor, pseudo: delPer },
    { python: ['corrente:         print(i, " ", sep="", end="")'], c: ['corrente:         printf("%d ", i);'], pseudo: ['corrente:         SCRIVI i, " "'] },
    { python: ["corrente:         i = i + 2"], c: delFor, pseudo: delPer },
  ]);
}, 60_000);

/** Un dato col valore iniziale, una scrittura, la fine. */
const BREVE = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "doppio" },
  functions: [{ id: "f1", kind: "main", data: [{ name: "i", type: "integer", initial: "1", role: "output" }], body: [{ id: "b1", kind: "write", values: ["i"], newline: true }], end: { id: "b2" } }],
});

/** Le righe evidenziate in un linguaggio, scelta la sua linguetta. */
const nelLinguaggio = async (nome: string) => {
  await clic(linguetta(nome), `la linguetta ${nome}`);
  return evidenziate();
};

test("la pausa sulla fine: nello pseudocodice «FINE», nel C «return 0;», nel Python nessuna riga (non ce n'è una per la fine)", async () => {
  await apriLaFinestra(BREVE);
  await clic(comando("genera"), "«Genera»");
  for (let k = 1; k <= 3; k++) {
    const prima = statoMostrato();
    await premi("F10");
    await aspetta(`la pausa ${k}`, () => inPausa() && statoMostrato() !== prima);
  }
  expect({ pseudo: await nelLinguaggio(it.linguaggioPseudocodice), c: await nelLinguaggio(it.linguaggioC), python: await nelLinguaggio(it.linguaggioPython) }).toEqual({
    pseudo: ["corrente: FINE"],
    c: ["corrente:     return 0;"],
    python: [],
  });
}, 60_000);

test("coi valori iniziali nascosti nel flowchart, la pausa sul valore iniziale evidenzia nel codice la dichiarazione del dato: il codice non dipende da come si disegna", async () => {
  await apriLaFinestra(BREVE, "it", { ...scelteIniziali, valoriIniziali: "nascosti" });
  await clic(comando("genera"), "«Genera»");
  await premi("F10");
  await aspetta("la pausa sul valore iniziale", inPausa);
  expect({ pseudo: await nelLinguaggio(it.linguaggioPseudocodice), python: await nelLinguaggio(it.linguaggioPython), c: await nelLinguaggio(it.linguaggioC) }).toEqual({
    pseudo: ["corrente:     i: intero ← 1  // output"],
    python: ["corrente:     i: int = 1  # output"],
    c: ["corrente:     int i = 1;  /* output */"],
  });
}, 60_000);

test("a esecuzione finita con un errore, una modifica del progetto lascia la riga dell'errore nel codice nuovo, come il segno sul flowchart", async () => {
  await apriLaFinestra();
  await clic(comando("genera"), "«Genera»");
  await clic(linguetta(it.linguaggioPython), "la linguetta Python");
  await premi("F5");
  await aspetta("la lettura", chiede);
  await scrivi("5");
  await aspetta("l'errore", () => statoMostrato() === it.statoFermataDaUnErrore);
  expect(evidenziate()).toEqual(["errore:     s = v[n]"]);
  // Il blocco della scrittura tolto: il codice cambia, il blocco dell'errore c'è ancora e la sua riga resta segnata.
  const prima = righe().length;
  const b3 = document.querySelector('[data-blocco="b3"]')!;
  await clic(b3, "il blocco b3");
  await premi("Delete", {}, b3);
  await aspetta("il blocco tolto", () => document.querySelector('[data-blocco="b3"]') === null);
  expect({ cambiato: righe().length < prima, evidenziate: evidenziate(), segno: document.querySelector('[data-blocco="b4"]')?.getAttribute("aria-invalid") }).toEqual({
    cambiato: true,
    evidenziate: ["errore:     s = v[n]"],
    segno: "true",
  });
}, 60_000);

test("con F5 la riga corrente c'è solo al punto di interruzione, e nessuna alla fine senza errore", async () => {
  await apriLaFinestra();
  await clic(comando("genera"), "«Genera»");
  // Il punto sulla scrittura: il blocco scelto col clic, poi F9.
  await clic(document.querySelector('[data-blocco="b3"]'), "il blocco b3");
  await premi("F9");
  await premi("F5");
  await aspetta("la lettura", chiede);
  expect(evidenziate()).toEqual([]);
  await scrivi("1");
  await aspetta("la pausa sul punto", inPausa);
  expect(evidenziate()).toEqual(['corrente:     SCRIVI "doppio ", c, v[i] ↵']);
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === it.statoFinita);
  expect(evidenziate()).toEqual([]);
}, 60_000);

// ------------------------------------------------------------------------------------ codice e tabella

test("durante un'esecuzione il codice e la tabella si escludono", async () => {
  await apriLaFinestra();
  const tabella = () => {
    const t = document.querySelector(`table[aria-label="${it.tabellaDiTraccia}"], [role="table"][aria-label="${it.tabellaDiTraccia}"]`);
    return t !== null && t.closest("[hidden]") === null;
  };
  const stato = () => ({ codice: regione() !== null, tabella: tabella(), genera: comando("genera")?.getAttribute("aria-expanded"), tabellaPremuto: comando("tabella")?.getAttribute("aria-expanded") });
  await premi("F10");
  await aspetta("la prima pausa", inPausa);
  expect(stato()).toEqual({ codice: false, tabella: true, genera: "false", tabellaPremuto: "true" });
  await clic(comando("genera"), "«Genera»");
  expect(stato()).toEqual({ codice: true, tabella: false, genera: "true", tabellaPremuto: "false" });
  await clic(comando("tabella"), "«Tabella»");
  expect(stato()).toEqual({ codice: false, tabella: true, genera: "false", tabellaPremuto: "true" });
  await clic(comando("genera"), "«Genera»");
  await clic(comando("genera"), "«Genera» di nuovo");
  expect(stato()).toEqual({ codice: false, tabella: true, genera: "false", tabellaPremuto: "true" });
  // La console resta sotto il codice.
  await clic(comando("genera"), "«Genera»");
  expect(document.querySelector(`[role="log"][aria-label="${it.console}"]`)).not.toBeNull();
}, 60_000);

// ----------------------------------------------------------------------------------- Copia e Salva…

test("«Copia» mette negli appunti il codice mostrato; «Salva…» propone il nome del progetto con l'estensione e lo scrive", async () => {
  await apriLaFinestra();
  await clic(comando("genera"), "«Genera»");
  await clic(linguetta(it.linguaggioPython), "la linguetta Python");
  const testo = `${righe().join("\n")}\n`;
  await clic(pulsanteNelRiquadro(it.codiceCopia), "«Copia»");
  await aspetta("l'avviso della copia", () => avviso() === riempi(it.codiceCopiato, { linguaggio: it.linguaggioPython }));
  expect(await navigator.clipboard.readText()).toBe(testo);
  // «Salva…»: rinuncia nella finestra del sistema, poi un file scelto.
  await clic(pulsanteNelRiquadro(it.codiceSalva), "«Salva…»");
  await giro();
  expect({ finestre: finestreDelCodice, scritti }).toEqual({ finestre: [{ proposto: "doppio.py", filtro: it.filtroPython, estensione: ".py", cartella: "C:\\prove" }], scritti: [] });
  sceltoPerIlCodice = { percorso: "C:\\prove\\doppio.py", sostituire: false };
  await clic(pulsanteNelRiquadro(it.codiceSalva), "«Salva…»");
  await aspetta("l'avviso del salvataggio", () => avviso() === riempi(it.codiceSalvatoIn, { file: "doppio.py" }));
  expect(scritti).toEqual([{ percorso: "C:\\prove\\doppio.py", testo }]);
  // Lo pseudocodice in un file di testo.
  await clic(linguetta(it.linguaggioPseudocodice), "la linguetta Pseudocodice");
  sceltoPerIlCodice = { percorso: "C:\\prove\\doppio.txt", sostituire: false };
  await clic(pulsanteNelRiquadro(it.codiceSalva), "«Salva…»");
  await aspetta("il secondo salvataggio", () => scritti.length === 2);
  expect({ estensione: finestreDelCodice.at(-1)?.estensione, filtro: finestreDelCodice.at(-1)?.filtro, prima: scritti[1]!.testo.split("\n")[0] }).toEqual({
    estensione: ".txt",
    filtro: it.filtroPseudocodice,
    prima: "PROGRAMMA doppio",
  });
});

// ----------------------------------------------------------------------------------- il menu dei linguaggi

const linguette = () => [...(regione()?.querySelectorAll('[role="tab"]') ?? [])].map((t) => t.textContent);

test("le linguette sono i linguaggi accesi nelle preferenze, nel loro ordine: all'avvio si mostra il primo, e «Salva…» usa il mostrato", async () => {
  await apriLaFinestra(DOPPIO, "it", { ...scelteIniziali, linguaggiDelCodice: ["c", "pseudocodice"] });
  await clic(comando("genera"), "«Genera»");
  expect({ linguette: linguette(), scelta: scelta() }).toEqual({ linguette: [it.linguaggioC, it.linguaggioPseudocodice], scelta: it.linguaggioC });
  expect(righe()).toEqual(delGeneratore(c(progettoDoppio, tetti, "it", paroleDelloPseudocodice("it"))));
  await clic(pulsanteNelRiquadro(it.codiceSalva), "«Salva…»");
  await giro();
  expect(finestreDelCodice).toEqual([{ proposto: "doppio.c", filtro: it.filtroC, estensione: ".c", cartella: "C:\\prove" }]);
});

test("il menu dei linguaggi nelle Impostazioni: ▲ ▼ col fuoco sul pulsante, l'ultimo acceso non si spegne, «Conferma» cambia le linguette e le scrive; spenta la linguetta guardata, si mostra la prima", async () => {
  await apriLaFinestra();
  await clic(comando("genera"), "«Genera»");
  await clic(linguetta(it.linguaggioPython), "la linguetta Python");
  expect(scelta()).toBe(it.linguaggioPython);
  const finestra = () => screen.queryByRole("dialog", { name: it.impostazioniTitolo });
  const apriIlMenu = async () => {
    await clic(within(screen.getByRole("banner")).getByRole("button", { name: it.impostazioni }), "«Impostazioni»");
    await clic(within(finestra()!).getByRole("tab", { name: it.impostazioniConsole }), "la scheda «Console»");
  };
  const menu = () => finestra()?.querySelector<HTMLElement>("[data-menu-dei-linguaggi]") ?? null;
  const righeDelMenu = () => [...(menu()?.querySelectorAll<HTMLElement>("[data-linguaggio]") ?? [])].map((r) => `${r.dataset.linguaggio}${r.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked ? "" : " (spento)"}`);
  const riga = (l: string) => menu()?.querySelector<HTMLElement>(`[data-linguaggio="${l}"]`) ?? null;
  const pulsante = (l: string, verso: -1 | 1) => riga(l)?.querySelector<HTMLButtonElement>(`[data-verso="${verso}"]`) ?? null;
  const casella = (l: string) => riga(l)?.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? null;
  const conferma = () => clic([...(finestra()?.querySelectorAll("button") ?? [])].find((b) => b.textContent === it.progettoConferma), "«Conferma»");

  await apriIlMenu();
  expect(menu()?.querySelector("legend")?.textContent).toBe(it.linguaggiDelCodice);
  expect(righeDelMenu()).toEqual(["pseudocodice", "python", "c"]);
  // Il primo non sale e l'ultimo non scende; i nomi dei pulsanti dicono il linguaggio.
  expect([pulsante("pseudocodice", -1)?.getAttribute("aria-disabled"), pulsante("c", 1)?.getAttribute("aria-disabled"), pulsante("python", -1)?.getAttribute("aria-disabled")]).toEqual(["true", "true", "false"]);
  expect(pulsante("python", 1)?.getAttribute("aria-label")).toBe(riempi(it.linguaggioGiu, { linguaggio: it.linguaggioPython }));
  // ▼ due volte sullo pseudocodice: la riga scende, e il fuoco resta sul suo ▼ anche in fondo, dove non fa nulla.
  await clic(pulsante("pseudocodice", 1), "▼ dello pseudocodice");
  await aspetta("il fuoco sul ▼ dello pseudocodice", () => document.activeElement === pulsante("pseudocodice", 1));
  expect(righeDelMenu()).toEqual(["python", "pseudocodice", "c"]);
  await clic(pulsante("pseudocodice", 1), "▼ dello pseudocodice");
  await aspetta("il fuoco sul ▼ dello pseudocodice, in fondo", () => document.activeElement === pulsante("pseudocodice", 1) && righeDelMenu().at(-1) === "pseudocodice");
  expect({ righe: righeDelMenu(), fermo: pulsante("pseudocodice", 1)?.getAttribute("aria-disabled") }).toEqual({ righe: ["python", "c", "pseudocodice"], fermo: "true" });
  await clic(pulsante("pseudocodice", 1), "▼ dello pseudocodice, in fondo");
  expect(righeDelMenu()).toEqual(["python", "c", "pseudocodice"]);
  // Spenti il Python e lo pseudocodice, il C resta: la sua casella non si spegne, e la riga sotto lo dice.
  await clic(casella("python"), "la casella del Python");
  await clic(casella("pseudocodice"), "la casella dello pseudocodice");
  expect({ righe: righeDelMenu(), bloccata: casella("c")?.disabled, detto: menu()?.textContent?.includes(it.almenoUnLinguaggio) }).toEqual({ righe: ["python (spento)", "c", "pseudocodice (spento)"], bloccata: true, detto: true });
  await clic(casella("c"), "la casella del C, bloccata");
  expect(righeDelMenu()).toEqual(["python (spento)", "c", "pseudocodice (spento)"]);
  await conferma();
  // La linguetta guardata (Python) è spenta: si mostra la prima del menu.
  expect({ linguette: linguette(), scelta: scelta(), scritte: preferenzeScritte.map((p) => p.linguaggiDelCodice) }).toEqual({ linguette: [it.linguaggioC], scelta: it.linguaggioC, scritte: [["c"]] });
  // Riaperta: gli accesi in cima, gli spenti nell'ordine del registro; riacceso lo pseudocodice, va dopo il C.
  await apriIlMenu();
  expect(righeDelMenu()).toEqual(["c", "pseudocodice (spento)", "python (spento)"]);
  expect(menu()?.textContent?.includes(it.almenoUnLinguaggio)).toBe(true);
  await clic(casella("pseudocodice"), "la casella dello pseudocodice");
  expect({ bloccata: casella("c")?.disabled, detto: menu()?.textContent?.includes(it.almenoUnLinguaggio) }).toEqual({ bloccata: false, detto: false });
  await conferma();
  expect({ linguette: linguette(), scelta: scelta(), scritte: preferenzeScritte.map((p) => p.linguaggiDelCodice) }).toEqual({
    linguette: [it.linguaggioC, it.linguaggioPseudocodice],
    scelta: it.linguaggioC,
    scritte: [["c"], ["c", "pseudocodice"]],
  });
});
