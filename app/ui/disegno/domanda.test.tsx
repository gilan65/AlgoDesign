// La Lettura con la domanda nella finestra vera, sotto happy-dom, col file del corpus che ne ha tre
// («domanda-prima-della-lettura») e l'opzione delle Impostazioni accesa:
// - il disegno: la Scrittura unita non è un blocco né una voce per gli ausili, la Lettura dice anche la domanda, fra le
//   due nessun «+», la Scrittura senza lo spazio resta un blocco a sé;
// - i campi della Lettura: la domanda sopra la destinazione («Domanda 1», «Aggiungi una domanda», «Va a capo»); una
//   domanda cambiata riscrive la Scrittura, tolta la elimina, scritta su una Lettura che non l'aveva la mette prima: un
//   passo solo, che Annulla toglie tutto;
// - eliminare, copiare e incollare la coppia insieme;
// - il file salvato identico byte per byte con l'opzione accesa e spenta, anche dopo i campi confermati senza cambiarli;
// - il passo: si ferma sulla domanda e poi sulla Lettura, tutte e due sullo stesso blocco (la riga del passo cerchiata);
//   il punto di interruzione sul blocco unito va sulla Scrittura e ferma «Esegui» alla domanda; la tabella di traccia
//   ha le due righe.
//
// Che cosa NON guarda: l'aspetto e il trascinamento (nei motori, `e2e/domanda.e2e.ts`); la regola delle coppie e le
// operazioni (prove del nucleo).
import { afterAll, afterEach, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { apri } from "../../core/progetto/formato";
import type { Blocco, Progetto } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali, type Scelte } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const TESTO = readFileSync(new URL("../../casi/tappa-1/domanda-prima-della-lettura.algo", import.meta.url), "utf8");
const conLaDomanda: Scelte = { ...scelteIniziali, domandaNellaLettura: true };

const scritti: string[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return "C:\\corpus\\domanda.algo";
      case "leggi_progetto":
        if (argomenti.percorso !== "C:\\corpus\\domanda.algo") throw new Error("file non trovato");
        return TESTO;
      case "scrivi_progetto":
        scritti.push(String(argomenti.testo));
        return null;
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
setDefaultTimeout(60_000);

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
const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));
const scrivi = (e: Element, valore: string) => act(async () => void fireEvent.change(e, { target: { value: valore } }));
const blocco = (id: string) => document.querySelector<SVGGElement>(`[data-blocco="${id}"]`);
const html = (e: Element | null) => e?.outerHTML ?? null;
const campoDi = (etichetta: string) => [...document.querySelectorAll("form label")].find((l) => l.querySelector("span")?.textContent === etichetta)?.querySelector("input") ?? null;
const pulsante = (testo: string) => [...document.querySelectorAll("button")].find((b) => b.textContent === testo) ?? null;

async function apriLaFinestra(scelte: Scelte = conLaDomanda): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta("aperto", () => avviso() === riempi(testi.apertoIl, { file: "domanda.algo" }));
}
/** Il testo salvato con Ctrl+S. */
async function salvato(): Promise<string> {
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("salvato", () => scritti.length > prima);
  return scritti.at(-1)!;
}
const progettoDi = (testo: string): Progetto => {
  const a = apri(testo);
  if (!a.ok) throw new Error("illeggibile");
  return a.progetto;
};
const corpo = (testo: string): readonly Blocco[] => progettoDi(testo).functions[0]!.body;
/** I campi del blocco aperti col doppio clic. */
async function apriICampi(id: string): Promise<void> {
  await act(async () => void fireEvent.doubleClick(blocco(id)!));
  await giro();
}
async function conferma(): Promise<void> {
  await tasto(document.querySelector("form input")!, "Enter");
  await giro();
}

test("il disegno: la Scrittura unita non è un blocco, la Lettura dice la domanda, fra le due nessun «+»", async () => {
  await apriLaFinestra();
  expect(["b1", "b2", "b3", "b4", "b5", "b6", "b9", "b10"].map((id) => [id, blocco(id) !== null])).toEqual([
    ["b1", true],
    ["b2", true],
    ["b3", false],
    ["b4", true],
    ["b5", false],
    ["b6", true],
    ["b9", false],
    ["b10", true],
  ]);
  expect(blocco("b4")!.getAttribute("aria-label")).toBe(riempi(testi.nomeDellaLetturaConDomanda, { genere: testi.bloccoLettura, testo: "nome", domanda: '"Come ti chiami?"' }));
  // I «+» del programma: prima di ogni blocco mostrato e dopo l'ultimo, con gli indici della sequenza vera.
  const punti = [...document.querySelectorAll("[data-punto]")].map((p) => p.getAttribute("data-punto")).filter((k) => k!.startsWith("f1/"));
  expect(punti).toEqual(["f1/body/0", "f1/body/1", "f1/body/2", "f1/body/4", "f1/body/6", "f1/body/7", "f1/body/8"]);
  // Le due righe nel disegno: sopra la domanda, sotto la Lettura.
  const righe = [...document.querySelectorAll('svg g[data-id="b6"] text')].map((t) => t.textContent);
  expect(righe.join(" | ")).toContain('"Voto di ", nome');
  expect(righe.join(" | ")).toContain("leggi voto");
});

test("senza l'opzione le Scritture sono blocchi a sé, come sempre", async () => {
  await apriLaFinestra(scelteIniziali);
  expect(["b3", "b5", "b9"].map((id) => blocco(id) !== null)).toEqual([true, true, true]);
  expect(blocco("b4")!.getAttribute("aria-label")).toBe(riempi(testi.nomeDelBlocco, { genere: testi.bloccoLettura, testo: "nome" }));
});

test("il file salvato è identico byte per byte con l'opzione accesa e spenta, anche coi campi confermati senza cambiarli", async () => {
  await apriLaFinestra(scelteIniziali);
  const spenta = await salvato();
  cleanup();
  await apriLaFinestra();
  const accesa = await salvato();
  await apriICampi("b6");
  await conferma();
  const dopoICampi = await salvato();
  expect({ spenta: spenta === TESTO, accesa: accesa === TESTO, dopoICampi: dopoICampi === TESTO }).toEqual({ spenta: true, accesa: true, dopoICampi: true });
});

test("i campi della Lettura: la domanda sopra la destinazione; cambiata riscrive la Scrittura, un passo che Annulla toglie", async () => {
  await apriLaFinestra();
  await apriICampi("b4");
  const etichette = [...document.querySelectorAll("form label span, form button")].map((e) => e.textContent);
  expect(etichette.slice(0, 5)).toEqual([testi.campoDomandaN.replace("{n}", "1"), "×", testi.aggiungiDomanda, testi.campoDestinazione, "?"]);
  expect(document.querySelector("[data-domanda-a-capo]")!.closest("label")!.textContent).toBe(testi.campoACapo);
  // Il «?» dice che cosa scrivere anche nella domanda.
  await clic(document.querySelector(`form button[aria-label="${testi.suggerimenti}"]`)!);
  expect(document.querySelector("form [data-guida]")?.textContent).toBe(testi.guidaLetturaConDomanda);
  expect(campoDi("Domanda 1")!.value).toBe('"Come ti chiami?"');
  expect(campoDi(testi.campoDestinazione)!.value).toBe("nome");
  expect(document.querySelector<HTMLInputElement>("[data-domanda-a-capo]")!.checked).toBe(false);
  await scrivi(campoDi("Domanda 1")!, '"Nome?"');
  await conferma();
  expect(corpo(await salvato())[2]).toEqual({ id: "b3", kind: "write", values: ['"Nome? "'], newline: false });
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  expect(await salvato()).toBe(TESTO);
});

test("tolta la domanda la Scrittura si elimina; scritta su una Lettura che non l'aveva, una Scrittura nuova la precede", async () => {
  await apriLaFinestra();
  await apriICampi("b4");
  await clic(document.querySelector('[data-domanda="0"] button')!);
  const aCapoSpento = document.querySelector<HTMLInputElement>("[data-domanda-a-capo]")?.disabled;
  expect(aCapoSpento).toBe(true);
  await conferma();
  expect(corpo(await salvato()).map((b) => b.id)).toEqual(["b1", "b2", "b4", "b5", "b6", "b7", "b12"]);
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  // b2 legge dopo una Scrittura senza lo spazio, a sé: la domanda nuova le sta in mezzo, e si mostra nella Lettura.
  await apriICampi("b2");
  expect(campoDi("Domanda 1")).toBeNull();
  await clic(pulsante(testi.aggiungiDomanda)!);
  await scrivi(campoDi("Domanda 1")!, '"In che anno?"');
  await conferma();
  const s = corpo(await salvato());
  expect(s.slice(0, 3).map((b) => b.kind)).toEqual(["write", "write", "read"]);
  expect(s[1]).toMatchObject({ values: ['"In che anno? "'], newline: false });
  expect(blocco("b2")!.getAttribute("aria-label")).toContain("In che anno?");
});

test("eliminare, copiare e incollare la coppia insieme", async () => {
  await apriLaFinestra();
  await clic(blocco("b4")!);
  await tasto(blocco("b4")!, "Delete");
  await giro();
  expect(corpo(await salvato()).map((b) => b.id)).toEqual(["b1", "b2", "b5", "b6", "b7", "b12"]);
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  await clic(blocco("b6")!);
  await tasto(blocco("b6")!, "c", { ctrlKey: true });
  const ultimo = document.querySelector<SVGGElement>('[data-punto="f1/body/8"]')!;
  await act(async () => void fireEvent.focus(ultimo));
  await tasto(ultimo, "v", { ctrlKey: true });
  await giro();
  const s = corpo(await salvato());
  expect(s.length).toBe(10);
  expect(s.slice(8).map((b) => ({ ...b, id: "" }))).toEqual(corpo(TESTO).slice(4, 6).map((b) => ({ ...b, id: "" })));
  // La Lettura incollata è scelta, e si mostra con la sua domanda.
  expect(blocco(s[9]!.id)!.getAttribute("aria-pressed")).toBe("true");
  expect(blocco(s[8]!.id)).toBeNull();
});

test("una Lettura inserita dopo una Scrittura che diventa la sua domanda la mostra nei campi, e la conferma la lascia", async () => {
  await apriLaFinestra();
  const dopoLUltima = document.querySelector<SVGGElement>('[data-punto="f1/body/8"]')!;
  await act(async () => {
    fireEvent.pointerDown(dopoLUltima);
    fireEvent.click(dopoLUltima);
  });
  await clic(screen.getByRole("menuitem", { name: testi.bloccoLettura }));
  await giro();
  const domanda = [campoDi("Domanda 1")?.value ?? null, campoDi("Domanda 2")?.value ?? null];
  await scrivi(campoDi(testi.campoDestinazione)!, "anno");
  await conferma();
  const s = corpo(await salvato());
  expect({ domanda, generi: s.slice(7).map((b) => b.kind), scrittura: s[7] }).toEqual({
    domanda: ['"Anno "', "anno"],
    generi: ["write", "read"],
    scrittura: corpo(TESTO)[7]!,
  });
});

test("una Scrittura inserita prima di una Lettura che la mostra come domanda apre i campi della Lettura, che resta scelta", async () => {
  await apriLaFinestra();
  const primaDiB2 = document.querySelector<SVGGElement>('[data-punto="f1/body/1"]')!;
  await act(async () => {
    fireEvent.pointerDown(primaDiB2);
    fireEvent.click(primaDiB2);
  });
  await clic(screen.getByRole("menuitem", { name: testi.bloccoScrittura }));
  await giro();
  // I campi prima del salvataggio, che li conferma e li chiude.
  const campi = { destinazione: campoDi(testi.campoDestinazione)?.value ?? null, domanda: campoDi("Domanda 1") !== null };
  const scelta = blocco("b2")!.getAttribute("aria-pressed");
  await tasto(document.querySelector("form input")!, "Escape");
  await giro();
  const nuova = corpo(await salvato())[1]!;
  expect({ nuova: nuova.kind, bloccoDellaNuova: blocco(nuova.id) !== null, scelta, ...campi }).toEqual({
    nuova: "write",
    bloccoDellaNuova: false,
    scelta: "true",
    destinazione: "anno",
    domanda: true,
  });
});

test("la voce del controllo di una Scrittura unita alla sua Lettura sceglie la Lettura e le dà il fuoco", async () => {
  await apriLaFinestra();
  await apriICampi("b6");
  await scrivi(campoDi("Domanda 2")!, "nomeSbagliato");
  await conferma();
  await clic(pulsante(testi.statoMostra)!);
  const errore = testi.voceErrore.slice(0, testi.voceErrore.indexOf("{"));
  const voci = [...document.querySelectorAll(`ul[aria-label="${testi.elencoDelControllo}"] li button`)].filter((b) => b.textContent?.startsWith(errore));
  await clic(voci[0]!);
  await giro();
  expect({ voci: voci.length, scelta: blocco("b6")!.getAttribute("aria-pressed"), fuoco: document.activeElement?.getAttribute("data-blocco") ?? null }).toEqual({ voci: 1, scelta: "true", fuoco: "b6" });
});

/** Il blocco corrente per gli ausili e la riga del passo cerchiata nel disegno. */
const corrente = () => {
  const b = document.querySelectorAll('[aria-current="step"]');
  const riga = document.querySelector("[data-riga-corrente]")?.getAttribute("data-riga-corrente") ?? "-";
  return `${[...b].map((e) => e.getAttribute("data-blocco")).join(",")}:${riga}`;
};
const istante = () => `${statoMostrato()} · ${document.querySelector('[role="log"]')?.childElementCount ?? 0}`;
async function premi(t: string): Promise<void> {
  const prima = istante();
  await tasto(document.activeElement ?? document.body, t);
  await aspetta(`l'effetto di ${t}`, () => istante() !== prima && !statoMostrato().startsWith(testi.statoInCorso));
}
async function valore(testo: string): Promise<void> {
  const campo = document.activeElement as HTMLInputElement;
  const prima = istante();
  await scrivi(campo, testo);
  await tasto(campo, "Enter");
  await aspetta(`il valore ${testo}`, () => istante() !== prima && !statoMostrato().startsWith(testi.statoInCorso));
}

test("il passo si ferma sulla domanda e poi sulla Lettura, sullo stesso blocco; la tabella di traccia ha le due righe", async () => {
  await apriLaFinestra();
  const visti: string[] = [];
  await premi("F10");
  const valori = ["2026", "Anna", "7"];
  for (let k = 0; k < 40; k++) {
    if (statoMostrato().startsWith(riempi(testi.statoChiede, { dato: "" }).slice(0, 8))) {
      const v = valori.shift();
      if (v === undefined) break;
      await valore(v);
    } else if (document.querySelector('[aria-current="step"]')) {
      visti.push(corrente());
      await premi("F10");
    } else break;
  }
  expect(visti.slice(0, 6)).toEqual(["b1:-", "b2:-", "b4:0", "b4:1", "b6:0", "b6:1"]);
  const regole = [...document.querySelectorAll("[data-riga] td[title]")].map((c) => c.getAttribute("title"));
  const i = regole.indexOf('scrivi "Come ti chiami? "');
  expect(regole.slice(i, i + 2)).toEqual(['scrivi "Come ti chiami? "', "leggi nome"]);
});

test("il punto di interruzione sul blocco unito va sulla Scrittura e ferma «Esegui» alla domanda", async () => {
  await apriLaFinestra();
  await clic(blocco("b6")!);
  await tasto(blocco("b6")!, "F9");
  await giro();
  const s = progettoDi(await salvato()).functions[0]!.body;
  expect(s.filter((b) => b.breakpoint).map((b) => b.id)).toEqual(["b5"]);
  expect(html(document.querySelector('[data-interruzione="b6"]'))).not.toBeNull();
  await premi("F5");
  await valore("2026");
  await valore("Anna");
  await aspetta("la pausa", () => document.querySelector('[aria-current="step"]') !== null);
  expect(corrente()).toBe("b6:0");
  // Tolto dal blocco unito, il punto non c'è più su nessuno dei due.
  await tasto(document.body, "F9");
  await giro();
});
