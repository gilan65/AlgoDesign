// La finestra «Importa procedure e funzioni…» nell'app vera sotto happy-dom, col guscio simulato: il programma di
// riferimento della tappa 3 (`leggi_numero`, `valido` coi suoi due casi, `stelle`) aperto come file dato all'avvio, la
// cartella delle librerie con la libreria del corpus (`libreria-dei-voti`: `leggi_numero` identica, `valido` diversa,
// `media` che nel programma è un dato, `giudizio` che chiama `stelle_di` e `valido`, la costante `MAX_VOTI`) nel gruppo
// «Scuola» e un file che non si apre; e un altro file da scegliere con «Da un altro file…».
// - dalla cartella: i gruppi, il file che non si apre (col motivo, «Scegli» spento), le spunte, il riepilogo che è
//   quello del nucleo voce per voce, la casella dei casi col loro numero;
// - i conflitti: la scelta cambia ciò che entra (una non importata non porta la costante che solo lei usa), «Sostituisci»
//   dice i casi eliminati, un nome rifiutato si dice sotto il campo e spegne «Importa», come quando non entra niente;
// - gli avvisi del riepilogo da un altro file: le opzioni diverse (solo coi casi che entrano), la costante sostituita, i
//   dati col nome di una costante o di una procedura del programma, senza spostare i numeri del riepilogo; la seconda di
//   due funzioni omonime spenta col motivo;
// - «Importa» è un passo solo: il file salvato dopo è quello che il nucleo fa del progetto, e dopo Annulla è di nuovo il
//   file di partenza, byte per byte; l'avviso nomina ciò che è entrato;
// - «Da un altro file…»: un file che non si apre lo dice, uno che si apre diventa la sorgente;
// - «Aggiungi il progetto aperto»: spento (col perché) su un progetto non segnato; sulla libreria aperta scrive nel gruppo
//   «Le mie librerie» col nome libero;
// - il segno: la casella «È una libreria» nelle Proprietà lo mette e lo toglie, e confermare le Proprietà di una libreria
//   non lo perde; «Salva come libreria…» parte dalla cartella delle librerie, scrive il segno, e Annulla lo toglie.
//
// Che cosa NON guarda: i gesti nei motori (`e2e/libreria.e2e.ts`); le regole dell'importazione una per una
// (`core/modifica/importa.test.ts`); il guscio vero (la prova sul prodotto).
import { afterAll, afterEach, beforeAll, beforeEach, expect, setDefaultTimeout, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importa, riepilogoDellImportazione, type Scelta } from "../../core/modifica/importa";
import { primoLibero } from "../../core/modifica/identificatori";
import { apri, salva } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const corpus = (f: string) => readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", f), "utf8");
const RIFERIMENTO = corpus("riferimento-media-voti-funzioni.algo");
const LIBRERIA = corpus("libreria-dei-voti.algo");
const TRE_LIVELLI = corpus("tre-livelli.algo");
const progetto = (t: string): Progetto => {
  const e = apri(t);
  if (!e.ok) throw new Error("un file del corpus non si apre");
  return e.progetto;
};
const CARTELLA = "C:\\Chiavetta\\data\\librerie";

let file: Record<string, string> = {};
let datoAllAvvio = "";
let daAprire: string | null = null;
let daSalvare: string | null = null;
let partenzaDelSalvataggio: unknown = undefined;
const scritti: { percorso: string; testo: string }[] = [];
const librerieScritte: Record<string, unknown>[] = [];
/** La cartella che ogni lettura delle librerie ha chiesto al guscio (`scelta`: quella delle Impostazioni, o nessuna). */
const librerieChieste: unknown[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return datoAllAvvio;
      case "leggi_progetto": {
        const testo = file[String(argomenti.percorso)];
        if (testo === undefined) throw new Error("file non trovato");
        return testo;
      }
      case "scrivi_progetto":
        scritti.push({ percorso: String(argomenti.percorso), testo: String(argomenti.testo) });
        return null;
      case "scegli_file_da_aprire":
        return daAprire;
      case "scegli_file_da_salvare":
        partenzaDelSalvataggio = argomenti.cartella;
        return daSalvare === null ? null : { percorso: daSalvare, sostituire: false };
      case "elenca_esempi":
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [], gruppi: [] };
      case "elenca_librerie":
        librerieChieste.push(argomenti.scelta);
        return {
          cartella: CARTELLA,
          predefinita: CARTELLA,
          mancante: false,
          esiste: true,
          file: [],
          gruppi: [{ nome: "Scuola", file: [{ nome: "Libreria dei voti.algo", testo: LIBRERIA }, { nome: "rotta.algo", testo: "{ non è un progetto" }] }],
        };
      case "scrivi_libreria":
        librerieScritte.push(argomenti);
        return null;
      case "segna_modificato":
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
beforeEach(() => {
  file = { "C:\\corpus\\riferimento.algo": RIFERIMENTO, "C:\\corpus\\libreria.algo": LIBRERIA, "C:\\altrove\\tre-livelli.algo": TRE_LIVELLI, "C:\\altrove\\rotto.algo": "{ rotto" };
  datoAllAvvio = "C:\\corpus\\riferimento.algo";
  daAprire = null;
  daSalvare = null;
  partenzaDelSalvataggio = undefined;
  scritti.length = 0;
  librerieScritte.length = 0;
  librerieChieste.length = 0;
});
afterEach(() => cleanup());
setDefaultTimeout(60_000);

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
async function aspetta(cosa: string, fatto: () => boolean, giri = 20_000): Promise<void> {
  for (let i = 0; i < giri; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (avviso «${avviso()}»)`);
}
const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));
const cambia = (e: Element, value: string) => act(async () => void fireEvent.change(e, { target: { value } }));
const finestra = () => document.querySelector<HTMLElement>('[role="dialog"]');
const pulsante = (testo: string, dentro: ParentNode = finestra()!) => [...dentro.querySelectorAll("button")].find((b) => b.textContent === testo);
const casella = (testo: RegExp) => [...finestra()!.querySelectorAll("label")].find((l) => testo.test(l.textContent ?? ""))!.querySelector("input")!;
const voci = () => [...finestra()!.querySelectorAll<HTMLElement>("[data-voce]")].map((v) => v.dataset.voce);
const testoDellaVoce = (chiave: string) => finestra()!.querySelector(`[data-voce="${chiave}"]`)?.textContent ?? "";
const sceltaDi = (nome: string) => finestra()!.querySelector<HTMLSelectElement>(`select[aria-label="${riempi(testi.importaSceltaDi, { nome })}"]`)!;
const nomeNuovoDi = (nome: string) => finestra()!.querySelector<HTMLInputElement>(`input[aria-label="${riempi(testi.importaNomeNuovo, { nome })}"]`)!;
const spento = (testo: string) => pulsante(testo)?.getAttribute("aria-disabled") === "true";

async function avvia(scelte = scelteIniziali): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta("il file dato all'avvio aperto", () => avviso().startsWith("Aperto"));
}
/** Una voce del menu Progetto, dalla tastiera (sotto happy-dom il menu di Ark non risponde al clic sulla voce). */
async function dalMenuProgetto(comando: string): Promise<void> {
  await clic(document.querySelector('[data-menu="progetto"]')!);
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  const evidenziata = () => menu.querySelector("[data-highlighted]")?.getAttribute("data-comando");
  for (let i = 0; i < 30 && evidenziata() !== comando; i++) {
    await tasto(menu, "ArrowDown");
    await giro();
  }
  expect(evidenziata()).toBe(comando);
  await tasto(menu, "Enter");
  await giro();
  await giro();
}
async function apriLaLibreria(): Promise<void> {
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra()?.querySelector('[data-gruppo="Scuola"]') !== null);
  await clic(finestra()!.querySelector('[data-gruppo="Scuola"] button')!);
  const scegli = finestra()!.querySelector('[data-gruppo="Scuola"]')!.querySelectorAll("li");
  await clic(pulsante(testi.importaScegli, scegli[0]!)!);
}
async function salvaOra(): Promise<string> {
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("il file salvato", () => scritti.length > prima);
  return scritti.at(-1)!.testo;
}

test("dalla cartella: i gruppi, il file che non si apre, le spunte e il riepilogo del nucleo, la casella dei casi", async () => {
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra()?.querySelector('[data-gruppo="Scuola"]') !== null);
  expect(finestra()!.textContent).toContain(riempi(testi.importaCartella, { cartella: CARTELLA }));
  await clic(finestra()!.querySelector('[data-gruppo="Scuola"] button')!);
  const righe = [...finestra()!.querySelector('[data-gruppo="Scuola"]')!.querySelectorAll("li")];
  // Il file rotto resta nell'elenco col motivo, e non si sceglie.
  expect(righe.map((r) => pulsante(testi.importaScegli, r)!.getAttribute("aria-disabled"))).toEqual(["false", "true"]);
  expect(righe[1]!.textContent).toContain("Non si apre.");
  await clic(pulsante(testi.importaScegli, righe[0]!)!);
  expect(finestra()!.textContent).toContain(riempi(testi.importaDa, { nome: "libreria-dei-voti" }));
  // Senza spunte, l'invito; «Importa» spento.
  expect(finestra()!.textContent).toContain(testi.importaSpunta);
  expect(spento(testi.importaConferma)).toBe(true);
  await clic(casella(/giudizio/));
  // Il riepilogo è quello del nucleo, voce per voce e nello stesso ordine.
  const attese = riepilogoDellImportazione(progetto(RIFERIMENTO), progetto(LIBRERIA), ["f7"]);
  expect(voci()).toEqual(attese.voci.map((v) => v.chiave));
  expect(voci()).toEqual(["f:f3", "f:f6", "f:f7", "c:MAX_VOTI"]);
  expect(testoDellaVoce("f:f7")).toContain(testi.importaEntraScelta);
  expect(testoDellaVoce("f:f6")).toContain(riempi(testi.importaEntraChiamata, { da: "giudizio" }));
  expect(testoDellaVoce("c:MAX_VOTI")).toContain(riempi(testi.importaEntraUsata, { da: "valido" }));
  expect(testoDellaVoce("f:f3")).toContain(riempi(testi.importaConflitto, { nome: "valido" }));
  // La casella dei casi, spuntata, col numero dei casi di ciò che entra.
  const casi = attese.voci.filter((v) => v.stato !== "identica").reduce((n, v) => n + (v.casi ?? 0), 0);
  expect(casella(/con i loro casi d'uso/).checked).toBe(true);
  expect(finestra()!.textContent).toContain(riempi(testi.importaConCasi, { n: String(casi) }));
  expect(spento(testi.importaConferma)).toBe(false);
  // Un'identica sola: non entra niente, «Importa» spento.
  await clic(casella(/giudizio/));
  await clic(casella(/leggi_numero/));
  expect(testoDellaVoce("f:f2")).toContain(testi.importaIdentica);
  expect(finestra()!.textContent).toContain(testi.importaNiente);
  expect(spento(testi.importaConferma)).toBe(true);
});

test("i conflitti: la scelta cambia ciò che entra, «Sostituisci» dice i casi eliminati, un nome rifiutato spegne «Importa»", async () => {
  await avvia();
  await apriLaLibreria();
  await clic(casella(/giudizio/));
  // La rinomina predefinita, col nome proposto.
  expect(sceltaDi("valido").value).toBe("rinomina");
  expect(nomeNuovoDi("valido").value).toBe("valido_2");
  // «Sostituisci»: i due casi di quella del programma sono eliminati.
  await cambia(sceltaDi("valido"), "sostituisci");
  expect(testoDellaVoce("f:f3")).toContain(riempi(testi.importaCasiEliminati, { n: "2" }));
  // «Non importarla»: la costante che solo lei usa non entra più.
  await cambia(sceltaDi("valido"), "salta");
  expect(voci()).toEqual(["f:f3", "f:f6", "f:f7"]);
  await cambia(sceltaDi("valido"), "rinomina");
  // Un nome di un'altra specie: solo la rinomina, senza l'elenco delle scelte.
  await clic(casella(/media/));
  expect(testoDellaVoce("f:f5")).toContain(riempi(testi.importaConflittoAltra, { nome: "media" }));
  expect(finestra()!.querySelector(`select[aria-label="${riempi(testi.importaSceltaDi, { nome: "media" })}"]`)?.outerHTML ?? null).toBeNull();
  // Un nome non valido, poi uno già usato: detti sotto il campo, «Importa» spento; un nome libero lo riaccende.
  await cambia(nomeNuovoDi("valido"), "2x");
  expect(testoDellaVoce("f:f3")).toContain(testi.importaNomeNonValido);
  expect(spento(testi.importaConferma)).toBe(true);
  await cambia(nomeNuovoDi("valido"), "leggi_numero");
  expect(testoDellaVoce("f:f3")).toContain(testi.importaNomeInUso);
  expect(spento(testi.importaConferma)).toBe(true);
  await cambia(nomeNuovoDi("valido"), "voto valido");
  expect(testoDellaVoce("f:f3")).toContain(testi.importaNomeNonValido);
  expect(spento(testi.importaConferma)).toBe(true);
  // Gli spazi ai lati non contano, e il campo tiene ciò che si sta scrivendo.
  await cambia(nomeNuovoDi("valido"), " voto_valido ");
  expect(nomeNuovoDi("valido").value).toBe(" voto_valido ");
  expect(nomeNuovoDi("valido").getAttribute("aria-invalid")).toBe("false");
  expect(spento(testi.importaConferma)).toBe(false);
  await cambia(nomeNuovoDi("valido"), "voto_valido");
  expect(nomeNuovoDi("valido").getAttribute("aria-invalid")).toBe("false");
  expect(spento(testi.importaConferma)).toBe(false);
});

/** Una sorgente con `valido` di un'altra intestazione (due parametri) e `usa`, che la chiama e ha un caso. */
const ALTRA = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "altra" },
  functions: [
    { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
    {
      id: "f2",
      kind: "function",
      name: "valido",
      return_type: "boolean",
      data: [
        { name: "a", type: "integer", parameter: "value" },
        { name: "b", type: "integer", parameter: "value" },
      ],
      body: [],
      end: { id: "b2", return_value: "a < b" },
    },
    { id: "f3", kind: "function", name: "usa", return_type: "boolean", data: [], body: [], end: { id: "b3", return_value: "valido(1, 2)" }, test_cases: [{ name: "uno", inputs: [], expected: { output: "→ true\n" } }] },
  ],
});

test("gli avvisi: l'intestazione diversa anche di una che non si importa, i risultati di una sostituita, gli errori dopo; senza i casi non entrano", async () => {
  file["C:\\altrove\\altra.algo"] = ALTRA;
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  daAprire = "C:\\altrove\\altra.algo";
  await clic(pulsante(testi.importaDaFile)!);
  await aspetta("la sorgente scelta", () => finestra()!.textContent!.includes(riempi(testi.importaDa, { nome: "altra" })));
  await clic(casella(/usa/));
  const sotto = () => ({ dopoErrori: finestra()!.textContent!.includes(testi.importaDopoErrori), importa: !spento(testi.importaConferma) });
  // Rinominata (la scelta di partenza): nessun avviso sugli esiti, il programma resta senza errori.
  const rinominata = { voce: testoDellaVoce("f:f2"), ...sotto() };
  await cambia(sceltaDi("valido"), "salta");
  const saltata = { voce: testoDellaVoce("f:f2"), ...sotto() };
  await cambia(sceltaDi("valido"), "sostituisci");
  const sostituita = { voce: testoDellaVoce("f:f2"), ...sotto() };
  await cambia(sceltaDi("valido"), "rinomina");
  expect({
    rinominata: [rinominata.voce.includes(testi.importaFirmaDiversaSalta), rinominata.voce.includes(testi.importaSostituitaRisultati), rinominata.dopoErrori, rinominata.importa],
    saltata: [saltata.voce.includes(testi.importaFirmaDiversaSalta), saltata.voce.includes(testi.importaSostituitaRisultati), saltata.dopoErrori, saltata.importa],
    sostituita: [sostituita.voce.includes(testi.importaFirmaDiversa), sostituita.voce.includes(testi.importaSostituitaRisultati), sostituita.dopoErrori, sostituita.importa],
  }).toEqual({ rinominata: [false, false, false, true], saltata: [true, false, true, true], sostituita: [true, true, true, true] });
  // Senza i casi: «usa» entra senza il suo.
  await clic(casella(/con i loro casi d'uso/));
  await clic(pulsante(testi.importaConferma)!);
  await aspetta("la finestra chiusa", () => finestra() === null);
  const entrate = progetto(await salvaOra()).functions.filter((f) => f.name === "usa" || f.name === "valido_2");
  expect(entrate.map((f) => [f.name, f.test_cases?.length ?? 0])).toEqual([
    ["valido_2", 0],
    ["usa", 0],
  ]);
});

/** Un programma con due costanti comuni e una procedura; e una sorgente con altre opzioni, la stessa costante con un altro
 * valore (che `triplo` usa, col suo caso) e una funzione coi dati che hanno il nome dell'altra costante e della procedura. */
const COSTANTI = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "costanti" },
  records: [{ name: "voto", fields: [{ name: "valore", type: "integer" }] }],
  shared_constants: [
    { name: "K", type: "integer", constant: true, initial: "2" },
    { name: "LIMITE", type: "integer", constant: true, initial: "10" },
  ],
  functions: [
    { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
    { id: "f2", kind: "procedure", name: "stampa", data: [], body: [], end: { id: "b2" } },
  ],
});
const CON_ALTRE_OPZIONI = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "altre-opzioni" },
  options: { real_decimals: 3, fill_character: "*", call_stack_limit: 10 },
  shared_constants: [{ name: "K", type: "integer", constant: true, initial: "3" }],
  functions: [
    { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
    {
      id: "f2",
      kind: "function",
      name: "triplo",
      return_type: "integer",
      data: [{ name: "n", type: "integer", parameter: "value" }],
      body: [],
      end: { id: "b2", return_value: "n * K" },
      test_cases: [{ name: "due", inputs: [{ data: "n", text: "2" }], expected: { output: "→ 6\n" } }],
    },
    {
      id: "f3",
      kind: "function",
      name: "urta",
      return_type: "integer",
      data: [
        { name: "LIMITE", type: "integer", initial: "1" },
        { name: "stampa", type: "integer", initial: "1" },
        { name: "voto", type: "integer", initial: "1" },
      ],
      body: [],
      end: { id: "b3", return_value: "LIMITE + stampa" },
    },
  ],
});

/** La sorgente scelta con «Da un altro file…», dal programma dato all'avvio. */
async function daUnFile(programma: string, sorgente: string, nome: string): Promise<void> {
  file["C:\\altrove\\programma.algo"] = programma;
  file["C:\\altrove\\sorgente.algo"] = sorgente;
  datoAllAvvio = "C:\\altrove\\programma.algo";
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  daAprire = "C:\\altrove\\sorgente.algo";
  await clic(pulsante(testi.importaDaFile)!);
  await aspetta("la sorgente scelta", () => finestra()!.textContent!.includes(riempi(testi.importaDa, { nome })));
}

test("le opzioni diverse (coi casi che entrano), la costante sostituita, i dati che urtano: righe del riepilogo che non spostano i suoi numeri", async () => {
  await daUnFile(COSTANTI, CON_ALTRE_OPZIONI, "altre-opzioni");
  await clic(casella(/triplo/));
  await clic(casella(/urta/));
  const opzioni = () => [...finestra()!.querySelectorAll<HTMLElement>("[data-opzione]")].map((p) => p.textContent);
  const conCasi = riempi(testi.importaConCasi, { n: "1" });
  // Le tre opzioni diverse, coi valori del programma e della sorgente; lo spazio a parole.
  expect(opzioni()).toEqual([
    riempi(testi.importaDecimaliDiversi, { programma: "2", sorgente: "3", nome: "altre-opzioni" }),
    riempi(testi.importaRiempimentoDiverso, { programma: testi.importaLoSpazio, sorgente: riempi(testi.importaIlCarattere, { carattere: "*" }), nome: "altre-opzioni" }),
    riempi(testi.importaPilaDiversa, { programma: "500", sorgente: "10", nome: "altre-opzioni" }),
  ]);
  // I dati di «urta» col nome della costante, della procedura e del record del programma.
  const testo = () => finestra()!.textContent!;
  expect([
    testo().includes(riempi(testi.importaUrtaCostante, { dato: "LIMITE", funzione: "urta" })),
    testo().includes(riempi(testi.importaUrtaFunzione, { dato: "stampa", funzione: "urta" })),
    testo().includes(riempi(testi.importaUrtaRecord, { dato: "voto", funzione: "urta" })),
  ]).toEqual([true, true, true]);
  // La costante in conflitto: rinominata nessun avviso sul valore; sostituita, l'avviso.
  expect(voci()).toEqual(["f:f2", "f:f3", "c:K"]);
  expect(testoDellaVoce("c:K").includes(testi.importaCostanteSostituita)).toBe(false);
  await cambia(sceltaDi("K"), "sostituisci");
  expect(testoDellaVoce("c:K")).toContain(testi.importaCostanteSostituita);
  // I numeri del riepilogo: le voci e i casi che entrano, con gli avvisi in più.
  expect([voci(), testo().includes(conCasi)]).toEqual([["f:f2", "f:f3", "c:K"], true]);
  // Senza i casi le righe delle opzioni spariscono; gli altri avvisi restano.
  await clic(casella(/con i loro casi d'uso/));
  expect([opzioni(), testo().includes(testi.importaCostanteSostituita), testo().includes(riempi(testi.importaUrtaCostante, { dato: "LIMITE", funzione: "urta" }))]).toEqual([[], true, true]);
});

test("le opzioni uguali (scritte o predefinite) non danno righe", async () => {
  const uguali = JSON.parse(CON_ALTRE_OPZIONI);
  uguali.options = { real_decimals: 2, fill_character: " " };
  await daUnFile(COSTANTI, JSON.stringify(uguali), "altre-opzioni");
  await clic(casella(/triplo/));
  expect([finestra()!.querySelectorAll("[data-opzione]").length, finestra()!.textContent!.includes(riempi(testi.importaConCasi, { n: "1" }))]).toEqual([0, true]);
});

test("due funzioni con lo stesso nome nella sorgente: la seconda è spenta col motivo, la prima entra", async () => {
  const omonime = JSON.parse(CON_ALTRE_OPZIONI);
  omonime.functions[2] = { ...omonime.functions[1], id: "f3", end: { id: "b3", return_value: "n * 3" }, test_cases: [] };
  await daUnFile(COSTANTI, JSON.stringify(omonime), "altre-opzioni");
  const caselle = [...finestra()!.querySelectorAll<HTMLInputElement>('fieldset input[type="checkbox"]')];
  const motivo = (c: HTMLInputElement) => (c.getAttribute("aria-describedby") ? document.getElementById(c.getAttribute("aria-describedby")!)?.textContent : null);
  expect(caselle.map((c) => [c.disabled, motivo(c)])).toEqual([
    [false, null],
    [true, testi.importaOmonima],
  ]);
  await clic(caselle[0]!);
  expect([voci()[0], spento(testi.importaConferma)]).toEqual(["f:f2", false]);
});

test("un file coi record è una sorgente: il record che la funzione usa entra con lei, col nome nuovo se il programma ha già il suo", async () => {
  const sorgente = readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", "funzione-con-un-record.algo"), "utf8");
  // Il programma ha un altro «alunno», con un campo solo.
  const programma = JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "programma" },
    records: [{ name: "alunno", fields: [{ name: "voto", type: "integer" }] }],
    functions: [{ id: "f1", kind: "main", data: [{ name: "a", type: "record", record: "alunno" }], body: [], end: { id: "b1" } }],
  });
  await daUnFile(programma, sorgente, "funzione-con-un-record");
  await clic(casella(/migliore/));
  expect(voci()).toEqual(["f:f2", "r:alunno"]);
  expect(testoDellaVoce("r:alunno")).toContain(riempi(testi.importaRecordRinominato, { nome: "alunno", nuovo: "alunno_2" }));
  expect(testoDellaVoce("r:alunno")).toContain(`${testi.importaRecord} alunno (nome, classe, voto)`);
  await clic(pulsante(testi.importaConferma)!);
  await aspetta("la finestra chiusa", () => finestra() === null);
  const p = progetto(programma);
  const atteso = importa(progetto(sorgente), ["f2"], { conCasi: true })(p, primoLibero(p));
  if (!atteso.ok) throw new Error("l'importazione del nucleo è rifiutata");
  expect(await salvaOra()).toBe(salva(atteso.progetto));
  expect(atteso.progetto.records?.map((r) => r.name)).toEqual(["alunno", "alunno_2"]);
});

test("«Importa» è un passo solo: il file è quello del nucleo, Annulla riporta il file di partenza byte per byte", async () => {
  await avvia();
  await apriLaLibreria();
  await clic(casella(/giudizio/));
  await cambia(sceltaDi("valido"), "sostituisci");
  await clic(pulsante(testi.importaConferma)!);
  await aspetta("la finestra chiusa", () => finestra() === null);
  expect(avviso()).toBe(riempi(testi.importaFatto, { nomi: "valido, stelle_di, giudizio, MAX_VOTI", tasto: "Ctrl+Z" }));
  const p = progetto(RIFERIMENTO);
  const atteso = importa(progetto(LIBRERIA), ["f7"], { conCasi: true, scelte: new Map<string, Scelta>([["f:f3", { come: "sostituisci" }]]) })(p, primoLibero(p));
  if (!atteso.ok) throw new Error("l'importazione del nucleo è rifiutata");
  expect(await salvaOra()).toBe(salva(atteso.progetto));
  // Annulla, una volta sola: il progetto di prima, byte per byte.
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  expect(await salvaOra()).toBe(RIFERIMENTO);
  // Controllo positivo: il file di partenza e quello importato sono diversi.
  expect(salva(atteso.progetto)).not.toBe(RIFERIMENTO);
});

test("«Da un altro file…»: un file che non si apre lo dice; uno che si apre diventa la sorgente", async () => {
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  daAprire = "C:\\altrove\\rotto.algo";
  await clic(pulsante(testi.importaDaFile)!);
  await aspetta("il motivo", () => finestra()!.textContent!.includes("«rotto.algo» non si apre."));
  daAprire = "C:\\altrove\\tre-livelli.algo";
  await clic(pulsante(testi.importaDaFile)!);
  await aspetta("la sorgente scelta", () => finestra()!.textContent!.includes(riempi(testi.importaDa, { nome: progetto(TRE_LIVELLI).metadata.name })));
  // Il pulsante premuto non c'è più: il fuoco è nella vista nuova, su «Cambia».
  expect(document.activeElement?.textContent).toBe(testi.importaCambia);
  await clic(casella(/mostra/));
  expect(voci()).toEqual(["f:f2", "f:f3", "f:f4"]);
  // L'utente che rinuncia nella finestra del sistema non cambia niente.
  await clic(pulsante(testi.importaCambia)!);
  await giro();
  // Tornati alla scelta, il fuoco è nella ricerca.
  expect(document.activeElement?.tagName).toBe("INPUT");
  daAprire = null;
  await clic(pulsante(testi.importaDaFile)!);
  await giro();
  expect(finestra()!.textContent).toContain(testi.importaSpiegazione);
});

test("«Aggiungi il progetto aperto»: spento col perché su un progetto non segnato; sulla libreria aperta scrive nel gruppo", async () => {
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  expect(spento(testi.importaAggiungi)).toBe(true);
  expect(finestra()!.textContent).toContain(testi.importaAggiungiSpento);
  cleanup();
  datoAllAvvio = "C:\\corpus\\libreria.algo";
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  expect(spento(testi.importaAggiungi)).toBe(false);
  expect(finestra()!.textContent).not.toContain(testi.importaAggiungiSpento);
  await clic(pulsante(testi.importaAggiungi)!);
  await aspetta("la libreria scritta", () => librerieScritte.length === 1);
  expect(librerieScritte[0]).toEqual({ nome: "libreria-dei-voti.algo", testo: LIBRERIA, scelta: null, gruppo: testi.importaGruppoMiei });
});

test("la cartella delle librerie scelta nelle Impostazioni arriva al guscio: nell'elenco e in «Aggiungi il progetto aperto»", async () => {
  const scelta = "D:\\Scuola\\librerie";
  datoAllAvvio = "C:\\corpus\\libreria.algo";
  await avvia({ ...scelteIniziali, cartellaLibrerie: scelta });
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  await clic(pulsante(testi.importaAggiungi)!);
  await aspetta("la libreria scritta", () => librerieScritte.length === 1);
  // Controllo positivo: senza la scelta, nessuna cartella (la predefinita del guscio).
  const conLaScelta = { chieste: [...new Set(librerieChieste)], scritta: librerieScritte[0]!.scelta };
  cleanup();
  librerieChieste.length = 0;
  librerieScritte.length = 0;
  await avvia();
  await dalMenuProgetto("importa");
  await aspetta("la finestra dell'importazione", () => finestra() !== null);
  await clic(pulsante(testi.importaAggiungi)!);
  await aspetta("la libreria scritta", () => librerieScritte.length === 1);
  expect({ conLaScelta, senza: { chieste: [...new Set(librerieChieste)], scritta: librerieScritte[0]!.scelta } }).toEqual({
    conLaScelta: { chieste: [scelta], scritta: scelta },
    senza: { chieste: [null], scritta: null },
  });
});

test("in pausa «Salva come libreria…», le Proprietà e «Importa…» ci sono, perché il progetto si modifica; fermata, restano", async () => {
  await avvia();
  const spente = async () => {
    await clic(document.querySelector('[data-menu="progetto"]')!);
    await giro();
    const voce = (c: string) => document.querySelector(`[role="menu"] [data-comando="${c}"]`)?.getAttribute("aria-disabled");
    const esito = ["salvaComeLibreria", "proprieta", "importa", "salva"].map((c) => `${c} ${voce(c)}`);
    await tasto(document.querySelector('[role="menu"]')!, "Escape");
    await giro();
    return esito;
  };
  // In pausa al primo passo (F10), poi fermata (Maiusc+F5).
  await tasto(document.body, "F10");
  await aspetta("la pausa", () => document.querySelector('[aria-current="step"]') !== null);
  const inPausa = await spente();
  await tasto(document.body, "F5", { shiftKey: true });
  await aspetta("fermata", () => document.querySelector('[aria-current="step"]') === null);
  const ferma = await spente();
  expect({ inPausa, ferma }).toEqual({
    inPausa: ["salvaComeLibreria false", "proprieta false", "importa false", "salva false"],
    ferma: ["salvaComeLibreria false", "proprieta false", "importa false", "salva false"],
  });
});

test("il segno: la casella delle Proprietà lo mette e lo toglie, e non si perde; «Salva come libreria…» lo scrive e Annulla lo toglie", async () => {
  // Una libreria: confermare le Proprietà senza toccare nulla non cambia il file.
  datoAllAvvio = "C:\\corpus\\libreria.algo";
  await avvia();
  await dalMenuProgetto("proprieta");
  await aspetta("le Proprietà", () => finestra() !== null);
  expect(casella(/È una libreria/).checked).toBe(true);
  await clic(casella(/È una libreria/));
  await clic(pulsante(testi.progettoConferma)!);
  expect(await salvaOra()).toBe(salva((({ library: _, ...m }) => ({ ...progetto(LIBRERIA), metadata: m }))(progetto(LIBRERIA).metadata)));
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  expect(await salvaOra()).toBe(LIBRERIA);
  await dalMenuProgetto("proprieta");
  await aspetta("le Proprietà", () => finestra() !== null);
  await clic(pulsante(testi.progettoConferma)!);
  expect(await salvaOra()).toBe(LIBRERIA);
  cleanup();

  // Un programma: «Salva come libreria…» parte dalla cartella delle librerie e scrive il segno; rinunciando, niente.
  datoAllAvvio = "C:\\corpus\\riferimento.algo";
  await avvia();
  daSalvare = null;
  await dalMenuProgetto("salvaComeLibreria");
  await aspetta("la finestra del sistema", () => partenzaDelSalvataggio !== undefined);
  expect(partenzaDelSalvataggio).toBe(CARTELLA);
  expect(await salvaOra()).toBe(RIFERIMENTO);
  daSalvare = `${CARTELLA}\\riferimento.algo`;
  await dalMenuProgetto("salvaComeLibreria");
  await aspetta("la libreria salvata", () => scritti.at(-1)?.percorso === daSalvare);
  const segnato = salva({ ...progetto(RIFERIMENTO), metadata: { ...progetto(RIFERIMENTO).metadata, library: true } });
  expect(scritti.at(-1)!.testo).toBe(segnato);
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  expect(await salvaOra()).toBe(RIFERIMENTO);
});
