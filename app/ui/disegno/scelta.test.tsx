// La scelta di più blocchi vicini nella finestra vera, sotto happy-dom, col programma di riferimento della media dei voti
// (la sequenza principale: un commento, un «ripeti», un'assegnazione, un «mentre» con dentro un «se» e un «se») e col
// file delle domande prima delle letture, con l'opzione della domanda nel blocco di Lettura accesa:
// - Maiusc+clic sceglie i blocchi fra il primo e il cliccato; un blocco dentro un ciclo porta la scelta al ciclo; il
//   messaggio dice quanti; un clic senza Maiusc torna a un blocco solo; durante l'esecuzione Maiusc+clic sceglie un
//   blocco solo;
// - Maiusc+↓ e Maiusc+↑ allargano e stringono la scelta dal blocco scelto, col fuoco che lo segue; dentro un campo no;
// - Taglia, Incolla, Copia, Elimina, Spazio con Invio su un «+», e il menu del tasto destro agiscono su tutti i blocchi
//   scelti, ognuno in un passo solo: Annulla riporta il file di prima byte per byte;
// - una Lettura con la domanda resta con la sua Scrittura (dentro la scelta, in testa o in coda);
// - con la casella delle Impostazioni, il riquadro intorno ai blocchi scelti (solo con più d'uno).
//
// Che cosa NON guarda: il trascinamento col puntatore vero e l'aspetto (nei motori, `e2e/scelta.e2e.ts`); le operazioni
// sui tratti del nucleo e il riquadro calcolato (prove del nucleo e `bersaglio.test.ts`).
import { afterAll, afterEach, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { apri } from "../../core/progetto/formato";
import type { Blocco } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali, type Scelte } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const FILE = {
  riferimento: readFileSync(new URL("../../casi/tappa-1/riferimento-media-voti.algo", import.meta.url), "utf8"),
  domanda: readFileSync(new URL("../../casi/tappa-1/domanda-prima-della-lettura.algo", import.meta.url), "utf8"),
};
let aperto: keyof typeof FILE = "riferimento";

const scritti: string[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return `C:\\corpus\\${aperto}.algo`;
      case "leggi_progetto":
        if (argomenti.percorso !== `C:\\corpus\\${aperto}.algo`) throw new Error("file non trovato");
        return FILE[aperto];
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
async function aspetta(cosa: string, fatto: () => boolean, giri = 20_000): Promise<void> {
  for (let i = 0; i < giri; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (avviso «${avviso()}»)`);
}
const blocco = (id: string) => document.querySelector<SVGGElement>(`[data-blocco="${id}"]`);
const punto = (chiave: string) => document.querySelector<SVGGElement>(`[data-punto="${chiave}"]`);
const html = (e: Element | null) => e?.outerHTML ?? null;
const tasto = async (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => {
  await act(async () => void fireEvent.keyDown(e, { key, ...altro }));
  await giro();
};
/** Il clic su un blocco, con Maiusc se `maiusc`: il puntatore premuto, poi il clic. */
const clic = async (id: string, maiusc = false) => {
  await act(async () => {
    fireEvent.pointerDown(blocco(id)!, { button: 0, isPrimary: true, shiftKey: maiusc });
    fireEvent.click(blocco(id)!, { shiftKey: maiusc });
  });
  await giro();
};
/** I blocchi scelti, nell'ordine del disegno. */
const scelti = () => [...document.querySelectorAll('[data-blocco][aria-pressed="true"]')].map((b) => b.getAttribute("data-blocco"));
const conIlFuoco = () => document.activeElement?.getAttribute("data-blocco") ?? null;

async function apriLaFinestra(file: keyof typeof FILE = "riferimento", scelte: Scelte = scelteIniziali): Promise<void> {
  aperto = file;
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta("aperto", () => avviso() === riempi(testi.apertoIl, { file: `${file}.algo` }));
}
/** Il testo salvato con Ctrl+S. */
async function salvato(): Promise<string> {
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("salvato", () => scritti.length > prima);
  return scritti.at(-1)!;
}
const corpo = (testo: string): readonly Blocco[] => {
  const a = apri(testo);
  if (!a.ok) throw new Error("illeggibile");
  return a.progetto.functions[0]!.body;
};
const ids = async () => corpo(await salvato()).map((b) => b.id);
/** Annulla: un Ctrl+Z, poi il file salvato dev'essere quello di prima, byte per byte. */
async function annullaUnPasso(prima: string): Promise<void> {
  await tasto(document.body, "z", { ctrlKey: true });
  expect(await salvato()).toBe(prima);
}

test("Maiusc+clic sceglie i blocchi fra i due; un blocco dentro un ciclo porta la scelta al ciclo; il messaggio dice quanti", async () => {
  await apriLaFinestra();
  // Premessa: la sequenza principale.
  expect(await ids()).toEqual(["b1", "b2", "b6", "b7", "b16"]);
  await clic("b2");
  await clic("b6", true);
  expect(scelti()).toEqual(["b2", "b6"]);
  expect(avviso()).toBe(riempi(testi.blocchiSelezionati, { n: "2" }));
  // Dal commento in cima a «leggi voto» dentro il «mentre» b7: fino al ciclo, col fuoco sul ciclo.
  await clic("b1");
  await clic("b8", true);
  expect(scelti()).toEqual(["b1", "b2", "b6", "b7"]);
  expect(avviso()).toBe(riempi(testi.blocchiSelezionati, { n: "4" }));
  expect(conIlFuoco()).toBe("b7");
  // Dentro un ramo: due blocchi dello stesso ramo, e un blocco dell'altro ramo che porta la scelta al «se».
  await clic("b10");
  await clic("b12", true);
  expect(scelti()).toEqual(["b10", "b11", "b12"]);
  await clic("b13", true);
  expect(scelti()).toEqual(["b10", "b11", "b12"]);
  await clic("b14", true);
  expect(scelti()).toEqual(["b9"]);
  // Un clic senza Maiusc: il blocco solo; Esc toglie la scelta.
  await clic("b1");
  await clic("b16", true);
  await clic("b6");
  expect(scelti()).toEqual(["b6"]);
  await tasto(blocco("b6")!, "Escape");
  expect(scelti()).toEqual([]);
});

test("Maiusc+↓ e Maiusc+↑ allargano e stringono la scelta col fuoco; ai bordi e dentro un campo non cambiano nulla", async () => {
  await apriLaFinestra();
  await act(async () => blocco("b2")!.focus());
  await tasto(blocco("b2")!, "ArrowDown", { shiftKey: true });
  await tasto(document.activeElement!, "ArrowDown", { shiftKey: true });
  expect([scelti(), conIlFuoco(), avviso()]).toEqual([["b2", "b6", "b7"], "b7", riempi(testi.blocchiSelezionati, { n: "3" })]);
  await tasto(document.activeElement!, "ArrowUp", { shiftKey: true });
  expect([scelti(), conIlFuoco()]).toEqual([["b2", "b6"], "b6"]);
  // Su, oltre l'ancora: la scelta si gira.
  await tasto(document.activeElement!, "ArrowUp", { shiftKey: true });
  await tasto(document.activeElement!, "ArrowUp", { shiftKey: true });
  expect([scelti(), conIlFuoco()]).toEqual([["b1", "b2"], "b1"]);
  // Al bordo: nulla.
  await tasto(document.activeElement!, "ArrowUp", { shiftKey: true });
  expect(scelti()).toEqual(["b1", "b2"]);
  // Le frecce senza Maiusc non scelgono.
  await clic("b16");
  await tasto(blocco("b16")!, "ArrowUp");
  expect(scelti()).toEqual(["b16"]);
  // Nei campi di un blocco Maiusc+↓ resta del campo: la scelta non cambia, i campi restano aperti.
  await act(async () => void fireEvent.doubleClick(blocco("b6")!));
  await giro();
  const campo = document.querySelector<HTMLInputElement>("form input")!;
  await tasto(campo, "ArrowDown", { shiftKey: true });
  expect([scelti(), html(document.querySelector("form")) !== null]).toEqual([["b6"], true]);
});

test("Taglia, Incolla, Copia ed Elimina sui blocchi scelti: un passo solo ciascuno, che Annulla riporta byte per byte", async () => {
  await apriLaFinestra();
  const prima = await salvato();
  await clic("b2");
  await clic("b7", true);
  await tasto(blocco("b7")!, "x", { ctrlKey: true });
  expect(await ids()).toEqual(["b1", "b16"]);
  const tagliato = await salvato();
  // Incollati dopo «se» b16: di seguito, con identificatori nuovi, e scelti insieme.
  await act(async () => void fireEvent.focus(punto("f1/body/2")!));
  await tasto(punto("f1/body/2")!, "v", { ctrlKey: true });
  const incollato = corpo(await salvato());
  expect(incollato.map((b) => b.kind)).toEqual(["comment", "if", "repeat", "assignment", "while"]);
  expect(incollato.slice(2).map((b) => b.id).some((id) => ["b2", "b6", "b7"].includes(id))).toBe(false);
  expect(scelti()).toEqual(incollato.slice(2).map((b) => b.id));
  await annullaUnPasso(tagliato);
  await annullaUnPasso(prima);
  // Copia: niente cambia; incollati in cima.
  await clic("b6");
  await clic("b7", true);
  await tasto(blocco("b7")!, "c", { ctrlKey: true });
  expect(await salvato()).toBe(prima);
  await act(async () => void fireEvent.focus(punto("f1/body/0")!));
  await tasto(punto("f1/body/0")!, "v", { ctrlKey: true });
  expect(corpo(await salvato()).map((b) => b.kind)).toEqual(["assignment", "while", "comment", "repeat", "assignment", "while", "if"]);
  await annullaUnPasso(prima);
  // Canc: tutti i blocchi scelti, col fuoco sul «+» dove stava il primo.
  await clic("b6");
  await clic("b16", true);
  await tasto(blocco("b16")!, "Delete");
  expect(await ids()).toEqual(["b1", "b2"]);
  expect(document.activeElement?.getAttribute("data-punto")).toBe("f1/body/2");
  await annullaUnPasso(prima);
});

test("Spazio su un blocco scelto sposta tutti i blocchi scelti: Invio su un «+», un passo; il messaggio dice quanti", async () => {
  await apriLaFinestra();
  const prima = await salvato();
  await clic("b2");
  await clic("b6", true);
  await act(async () => blocco("b6")!.focus());
  await tasto(blocco("b6")!, " ");
  expect(avviso()).toBe(riempi(testi.spostamentoDiPiuIniziato, { n: "2" }));
  // Mentre si raggiunge il «+» il fuoco passa su altri blocchi: lo spostamento resta dei due.
  await act(async () => blocco("b16")!.focus());
  await tasto(punto("f1/body/4")!, "Enter");
  expect(await ids()).toEqual(["b1", "b7", "b2", "b6", "b16"]);
  expect(scelti()).toEqual(["b2", "b6"]);
  await annullaUnPasso(prima);
  // Su un blocco solo, il messaggio di sempre.
  await clic("b16");
  await tasto(blocco("b16")!, " ");
  expect(avviso().startsWith(testi.spostamentoIniziato.split("{blocco}")[0]!)).toBe(true);
});

test("il menu del tasto destro su un blocco scelto: il suo nome dice quanti, Elimina li toglie tutti; fuori dalla scelta, il menu del blocco", async () => {
  await apriLaFinestra();
  const prima = await salvato();
  await clic("b2");
  await clic("b7", true);
  await act(async () => void fireEvent.contextMenu(blocco("b6")!, { clientX: 40, clientY: 40 }));
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  expect(menu.getAttribute("aria-label")).toBe(riempi(testi.menuDeiBlocchi, { n: "3" }));
  expect(scelti()).toEqual(["b2", "b6", "b7"]);
  await act(async () => void fireEvent.click(within(menu).getByRole("menuitem", { name: "Elimina (Canc)" })));
  await giro();
  expect(await ids()).toEqual(["b1", "b16"]);
  await annullaUnPasso(prima);
  await clic("b1");
  await clic("b2", true);
  await act(async () => void fireEvent.contextMenu(blocco("b16")!, { clientX: 40, clientY: 40 }));
  await giro();
  expect(document.querySelector('[role="menu"]')!.getAttribute("aria-label")).toBe(riempi(testi.menuDelBlocco, { blocco: blocco("b16")!.getAttribute("aria-label")! }));
  expect(scelti()).toEqual(["b16"]);
});

test("una Lettura con la domanda resta con la sua Scrittura: dentro la scelta, in testa e in coda", async () => {
  await apriLaFinestra("domanda", { ...scelteIniziali, domandaNellaLettura: true });
  // Premesse: la sequenza vera, e le Scritture b3 e b5 unite alle loro Letture (non sono blocchi nel disegno).
  const prima = await salvato();
  expect(corpo(prima).map((b) => b.id)).toEqual(["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b12"]);
  expect([html(blocco("b3")), html(blocco("b5"))]).toEqual([null, null]);
  // Da b2 a b4 (la Lettura in coda): b2, b3, b4; il messaggio conta i blocchi del disegno.
  await clic("b2");
  await clic("b4", true);
  expect([scelti(), avviso()]).toEqual([["b2", "b4"], riempi(testi.blocchiSelezionati, { n: "2" })]);
  await tasto(blocco("b4")!, "x", { ctrlKey: true });
  expect(await ids()).toEqual(["b1", "b5", "b6", "b7", "b12"]);
  await annullaUnPasso(prima);
  // Da b4 (la Lettura in testa) a b6: la Scrittura b3 entra con lei.
  await clic("b4");
  await clic("b6", true);
  await tasto(blocco("b6")!, "Delete");
  expect(await ids()).toEqual(["b1", "b2", "b7", "b12"]);
  await annullaUnPasso(prima);
  // Maiusc+↓ da b2 salta la Scrittura: il blocco dopo è la Lettura b4.
  await clic("b2");
  await act(async () => blocco("b2")!.focus());
  await tasto(blocco("b2")!, "ArrowDown", { shiftKey: true });
  expect([scelti(), conIlFuoco()]).toEqual([["b2", "b4"], "b4"]);
});

test("il riquadro intorno ai blocchi scelti: con la casella e più di un blocco; mai senza la casella", async () => {
  const riquadro = () => html(document.querySelector("[data-riquadro-della-scelta]"));
  await apriLaFinestra("riferimento", { ...scelteIniziali, riquadroDellaScelta: true });
  await clic("b2");
  expect(riquadro()).toBeNull();
  await clic("b7", true);
  expect(riquadro()).not.toBeNull();
  await clic("b6");
  expect(riquadro()).toBeNull();
  cleanup();
  await apriLaFinestra();
  await clic("b2");
  await clic("b7", true);
  expect([scelti().length, riquadro()]).toEqual([3, null]);
});

test("durante l'esecuzione Maiusc+clic sceglie un blocco solo (per il suo punto di interruzione)", async () => {
  await apriLaFinestra();
  await tasto(document.body, "F10");
  await aspetta("in esecuzione", () => (document.querySelector("[data-stato-esecuzione]")?.textContent ?? testi.statoPronto) !== testi.statoPronto);
  await clic("b2");
  await clic("b7", true);
  expect(scelti()).toEqual(["b7"]);
});
