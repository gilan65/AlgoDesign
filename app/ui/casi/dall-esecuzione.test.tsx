// Il caso d'uso salvato da un'esecuzione, sotto happy-dom: la finestra vera (`Applicazione`), col file dato all'avvio da un
// guscio simulato, e i clic e i tasti come li dà l'utente.
//
// - Un errore dentro una funzione chiamata: la scheda segue l'azione e mostra la funzione; «Salva l'esecuzione come caso
//   d'uso», sotto l'esito della console, mette il caso fra quelli del programma (la radice dell'esecuzione) e mostra la
//   sua scheda, coi campi aperti e il fuoco sul nome selezionato; Invio lo conferma, ed eseguito è raggiunto.
// - Lo stesso caso di nuovo, da «Nuovo caso dall'ultima esecuzione»: nessun caso in più, il fuoco sulla riga del caso
//   uguale e l'avviso col suo nome.
// - Il programma cambiato dopo la fine: il pulsante della scheda è spento col suo motivo e la riga della console non c'è;
//   Annulla fino al programma di allora li riporta. Prima di ogni esecuzione: spento, col suo motivo.
// - Esc nei campi del caso appena salvato: il caso sparisce senza lasciare un passo.
// - La casella delle Impostazioni spenta: il comando non c'è nei due posti.
// - I record: la Lettura di un campo con la domanda, il caso salvato con la voce del record; la procedura eseguita da
//   sola col parametro record chiesto campo per campo nella console («r.nome»), il caso salvato con una voce per campo, e
//   il caso nuovo con una voce per campo.
//
// Che cosa NON guarda:
// - le voci e l'atteso composti, caso per caso sul corpus: `core/casi/dall-esecuzione.test.ts`;
// - il fuoco nei motori veri e l'aspetto: `e2e/casi.e2e.ts`;
// - l'inglese dei testi nuovi (lo guarda la prova dei dizionari: le stesse chiavi, nessuna vuota).

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali, type Scelte } from "../preferenze";

const misura = (t: string) => [...t].length * 10;

/** Il programma legge `n` e scrive `inverso(n)`, la funzione che divide 100 per il suo parametro: con 0 l'errore cade
 * sulla fine della funzione (`e2`). */
const PROGRAMMA = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "inverso" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer", role: "input" },
        { name: "r", type: "integer", role: "output" },
      ],
      body: [
        { id: "b1", kind: "read", target: "n" },
        { id: "b2", kind: "assignment", target: "r", value: "inverso(n)" },
        { id: "b3", kind: "write", values: ["r"], newline: true },
      ],
      end: { id: "b4" },
    },
    { id: "f2", kind: "function", name: "inverso", return_type: "integer", data: [{ name: "x", type: "integer", parameter: "value" }], body: [], end: { id: "e2", return_value: "100 / x" } },
  ],
});

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
async function apriLaFinestra(scelte: Scelte = scelteIniziali, testo = PROGRAMMA, file = "inverso.algo"): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${file}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta("il file aperto", () => avviso() === riempi(testi.apertoIl, { file }));
}
const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));

const schedaMostrata = () => document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda") ?? "nessuna";
const nellaConsole = () => document.querySelector<HTMLButtonElement>("[data-salva-esecuzione]");
const nellaScheda = () => document.querySelector<HTMLButtonElement>("[data-nuovo-dall-esecuzione]");
const nomiDeiCasi = () => [...document.querySelectorAll("tr[data-caso] [data-nome-caso]")].map((e) => e.textContent);
async function vaiAiCasi(): Promise<void> {
  const l = [...document.querySelectorAll('[role="tab"]')].find((t) => /^Casi d'uso \(\d+\)$/.test(t.textContent ?? ""));
  expect(l, "la scheda dei casi d'uso non c'è").toBeDefined();
  await clic(l!);
}

/** F5 col valore scritto nella console, fino alla fine. */
async function eseguiCon(valore: string): Promise<void> {
  await tasto(document.body, "F5");
  await aspetta("la lettura di n", () => statoMostrato() === riempi(testi.statoChiede, { dato: "n" }));
  const campo = document.querySelector<HTMLInputElement>('[role="log"] ~ div input')!;
  await act(async () => void fireEvent.change(campo, { target: { value: valore } }));
  await act(async () => void fireEvent.keyDown(campo, { key: "Enter" }));
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita || statoMostrato() === testi.statoFermataDaUnErrore);
  await giro();
}

test("l'errore in una funzione chiamata: il caso va al programma, coi campi aperti sul nome; confermato ed eseguito è raggiunto", async () => {
  await apriLaFinestra();
  await eseguiCon("0");
  // La scheda ha seguito l'errore, nella funzione.
  expect(schedaMostrata()).toBe("f2");
  expect(nellaConsole()?.textContent).toBe(testi.salvaEsecuzione);
  await clic(nellaConsole()!);
  await giro();
  await giro();
  const attivo = document.activeElement as HTMLInputElement;
  expect({ scheda: schedaMostrata(), casi: nomiDeiCasi(), fuoco: attivo.tagName, nome: attivo.value, selezione: [attivo.selectionStart, attivo.selectionEnd] }).toEqual({
    scheda: "f1",
    casi: ["caso 1"],
    fuoco: "INPUT",
    nome: "caso 1",
    selezione: [0, 6],
  });
  await act(async () => void fireEvent.change(attivo, { target: { value: "zero" } }));
  await tasto(attivo, "Enter");
  await giro();
  expect(nomiDeiCasi()).toEqual(["zero"]);
  // Eseguito, il caso è raggiunto: è quello dell'esecuzione.
  await clic(document.querySelector('tr[data-caso="0"] [data-esegui-caso="tutto"]')!);
  await aspetta("l'esito del caso", () => avviso() === riempi(testi.esitoDelCasoRaggiunto, { nome: "zero" }));
});

test("lo stesso caso di nuovo: nessun caso in più, il fuoco sul caso uguale e l'avviso col suo nome", async () => {
  await apriLaFinestra();
  await eseguiCon("4");
  await clic(nellaConsole()!);
  await giro();
  await tasto(document.activeElement!, "Enter");
  await giro();
  expect(nomiDeiCasi()).toEqual(["caso 1"]);
  expect(nellaScheda()?.getAttribute("aria-disabled")).toBeNull();
  await clic(nellaScheda()!);
  await giro();
  expect({ casi: nomiDeiCasi(), fuoco: document.activeElement?.getAttribute("data-caso"), avviso: avviso() }).toEqual({
    casi: ["caso 1"],
    fuoco: "0",
    avviso: riempi(testi.annuncioCasoUguale, { nome: "caso 1" }),
  });
});

test("il programma cambiato dopo la fine: il comando è spento col suo motivo, Annulla lo riporta; prima di eseguire è spento", async () => {
  await apriLaFinestra();
  await vaiAiCasi();
  expect({ spento: nellaScheda()?.getAttribute("aria-disabled"), motivo: nellaScheda()?.title }).toEqual({ spento: "true", motivo: testi.casoDallEsecuzioneNonFinita });
  await eseguiCon("5");
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  const b3 = document.querySelector<SVGGElement>('[data-blocco="b3"]')!;
  await clic(b3);
  await tasto(b3, "Delete");
  await giro();
  await vaiAiCasi();
  expect({ console: nellaConsole(), spento: nellaScheda()?.getAttribute("aria-disabled"), motivo: nellaScheda()?.title }).toEqual({ console: null, spento: "true", motivo: testi.casoDallEsecuzioneCambiato });
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  expect({ console: nellaConsole() !== null, spento: nellaScheda()?.getAttribute("aria-disabled") }).toEqual({ console: true, spento: null });
});

test("Esc nei campi del caso appena salvato: il caso sparisce senza lasciare un passo", async () => {
  await apriLaFinestra();
  await eseguiCon("2");
  await vaiAiCasi();
  await clic(nellaScheda()!);
  await giro();
  expect(nomiDeiCasi()).toEqual(["caso 1"]);
  await tasto(document.activeElement!, "Escape");
  await giro();
  expect(nomiDeiCasi()).toEqual([]);
  // Nessun passo da annullare: Annulla non lo fa tornare.
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
  expect(nomiDeiCasi()).toEqual([]);
});

test("con la casella delle Impostazioni spenta il comando non c'è nei due posti", async () => {
  await apriLaFinestra({ ...scelteIniziali, offriCasoDallEsecuzione: false });
  await eseguiCon("3");
  await vaiAiCasi();
  // Controllo positivo: l'esecuzione è finita e la scheda dei casi è quella giusta («Aggiungi un caso» c'è).
  expect({ fine: statoMostrato(), aggiungi: document.querySelector("[data-aggiungi-caso]") !== null, console: nellaConsole(), scheda: nellaScheda() }).toEqual({ fine: testi.statoFinita, aggiungi: true, console: null, scheda: null });
});

// --------------------------------------------------------------------------------------------- i record

/** Il record `alunno` (nome, voto): il programma chiede il nome di `a` con la domanda e lo scrive; la procedura `promuovi`
 * riceve un alunno per riferimento e ne aumenta il voto. */
const DEI_RECORD = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "alunni" },
  records: [{ name: "alunno", fields: [{ name: "nome", type: "string", max_length: 10 }, { name: "voto", type: "integer" }] }],
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "a", type: "record", record: "alunno" }],
      body: [
        { id: "b1", kind: "write", values: ['"Il nome? "'], newline: false },
        { id: "b2", kind: "read", target: "a.nome" },
        { id: "b3", kind: "write", values: ["a.nome"], newline: true },
      ],
      end: { id: "b4" },
    },
    {
      id: "f2",
      kind: "procedure",
      name: "promuovi",
      data: [{ name: "r", type: "record", record: "alunno", parameter: "reference" }],
      body: [{ id: "b5", kind: "assignment", target: "r.voto", value: "r.voto + 1" }],
      end: { id: "b6" },
    },
  ],
});
const vociDelCaso = () => [...document.querySelectorAll("tr[data-caso]")].map((r) => r.textContent ?? "");
async function scriviNellaConsole(valore: string): Promise<void> {
  const campo = document.querySelector<HTMLInputElement>('[role="log"] ~ div input')!;
  await act(async () => void fireEvent.change(campo, { target: { value: valore } }));
  await act(async () => void fireEvent.keyDown(campo, { key: "Enter" }));
  await giro();
}

test("un record: la Lettura di un campo con la domanda chiede il record, e il caso salvato ha la sua voce", async () => {
  await apriLaFinestra({ ...scelteIniziali, domandaNellaLettura: true }, DEI_RECORD, "alunni.algo");
  // La domanda nella Lettura del campo: un blocco solo, su due righe.
  expect(document.querySelector('g[data-id="b2"]')?.textContent).toBe('"Il nome?"leggi a.nome');
  await tasto(document.body, "F5");
  await aspetta("la lettura del nome", () => statoMostrato() === riempi(testi.statoChiede, { dato: "a" }));
  await scriviNellaConsole("Ugo");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  await clic(nellaConsole()!);
  await giro();
  await tasto(document.activeElement!, "Enter");
  await giro();
  expect(nomiDeiCasi()).toEqual(["caso 1"]);
  expect(vociDelCaso()[0]).toContain(riempi(testi.casoVoce, { dato: "a", testo: "Ugo" }));
  await clic(document.querySelector('tr[data-caso="0"] [data-esegui-caso="tutto"]')!);
  await aspetta("l'esito del caso", () => avviso() === riempi(testi.esitoDelCasoRaggiunto, { nome: "caso 1" }));
});

test("un parametro record della procedura eseguita da sola: chiesto campo per campo, il caso salvato e il caso nuovo con una voce per campo", async () => {
  await apriLaFinestra(scelteIniziali, DEI_RECORD, "alunni.algo");
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector('[data-elenco] [data-voce-funzione="f2"]')!);
  await giro();
  await tasto(document.body, "F5");
  await aspetta("il nome di r", () => statoMostrato() === riempi(testi.statoChiede, { dato: "r.nome" }));
  await scriviNellaConsole("Ugo");
  await aspetta("il voto di r", () => statoMostrato() === riempi(testi.statoChiede, { dato: "r.voto" }));
  await scriviNellaConsole("5");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  await clic(nellaConsole()!);
  await giro();
  await tasto(document.activeElement!, "Enter");
  await giro();
  expect(schedaMostrata()).toBe("f2");
  expect(nomiDeiCasi()).toEqual(["caso 1"]);
  expect(vociDelCaso()[0]).toContain([riempi(testi.casoVoce, { dato: "r", testo: "Ugo" }), riempi(testi.casoVoce, { dato: "r", testo: "5" })].join(" · "));
  await clic(document.querySelector('tr[data-caso="0"] [data-esegui-caso="tutto"]')!);
  await aspetta("l'esito del caso", () => avviso() === riempi(testi.esitoDelCasoRaggiunto, { nome: "caso 1" }));
  // Il caso nuovo: una voce per campo, col nome del parametro.
  await clic(document.querySelector("[data-aggiungi-caso]")!);
  await giro();
  await tasto(document.activeElement!, "Enter");
  await giro();
  expect(nomiDeiCasi()).toEqual(["caso 1", "caso 2"]);
  expect(vociDelCaso()[1]).toContain([riempi(testi.casoVoce, { dato: "r", testo: "" }), riempi(testi.casoVoce, { dato: "r", testo: "" })].join(" · "));
});

// --------------------------------------------------------------------------------------------- le tabelle

/** Lo stesso record `alunno`: la procedura `seconda` riceve una tabella di due alunni per valore e scrive il nome del
 * secondo. */
const DELLE_TABELLE = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "classe" },
  records: [{ name: "alunno", fields: [{ name: "nome", type: "string", max_length: 10 }, { name: "voto", type: "integer" }] }],
  functions: [
    { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
    {
      id: "f2",
      kind: "procedure",
      name: "seconda",
      data: [{ name: "t", type: "record", record: "alunno", size: 2, parameter: "value" }],
      body: [{ id: "b2", kind: "write", values: ["t[1].nome", "t[0].voto"], newline: true }],
      end: { id: "b3" },
    },
  ],
});

test("un parametro tabella della procedura eseguita da sola: chiesto record per record e campo per campo senza «A ogni elemento», il caso salvato e il caso nuovo con una voce per campo di ogni record", async () => {
  await apriLaFinestra(scelteIniziali, DELLE_TABELLE, "classe.algo");
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector('[data-elenco] [data-voce-funzione="f2"]')!);
  await giro();
  await tasto(document.body, "F5");
  const chiesti: string[] = [];
  const pulsanti: boolean[] = [];
  for (const [dato, valore] of [
    ["t[0].nome", "Anna"],
    ["t[0].voto", "7"],
    ["t[1].nome", "Ugo"],
    ["t[1].voto", "5"],
  ] as const) {
    await aspetta(dato, () => statoMostrato() === riempi(testi.statoChiede, { dato }));
    chiesti.push(statoMostrato());
    pulsanti.push(document.querySelector("[data-ogni-elemento]") !== null);
    await scriviNellaConsole(valore);
  }
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  // Scritti a mano: l'elemento e il campo insieme, mai «A ogni elemento» (i campi hanno tipi diversi).
  expect(chiesti).toEqual(["t[0].nome", "t[0].voto", "t[1].nome", "t[1].voto"].map((dato) => riempi(testi.statoChiede, { dato })));
  expect(pulsanti).toEqual([false, false, false, false]);
  await clic(nellaConsole()!);
  await giro();
  await tasto(document.activeElement!, "Enter");
  await giro();
  expect(schedaMostrata()).toBe("f2");
  expect(nomiDeiCasi()).toEqual(["caso 1"]);
  expect(vociDelCaso()[0]).toContain(["Anna", "7", "Ugo", "5"].map((testo) => riempi(testi.casoVoce, { dato: "t", testo })).join(" · "));
  await clic(document.querySelector('tr[data-caso="0"] [data-esegui-caso="tutto"]')!);
  await aspetta("l'esito del caso", () => avviso() === riempi(testi.esitoDelCasoRaggiunto, { nome: "caso 1" }));
  // Il caso nuovo: una voce per campo di ogni record, col nome del parametro, e nessuna casella «in ogni elemento».
  await clic(document.querySelector("[data-aggiungi-caso]")!);
  await giro();
  expect(document.querySelectorAll("[data-campi-caso] select").length).toBe(4);
  expect(document.querySelectorAll('[data-campi-caso] input[type="checkbox"]').length).toBe(0);
  await tasto(document.activeElement!, "Enter");
  await giro();
  expect(nomiDeiCasi()).toEqual(["caso 1", "caso 2"]);
  expect(vociDelCaso()[1]).toContain(Array.from({ length: 4 }, () => riempi(testi.casoVoce, { dato: "t", testo: "" })).join(" · "));
}, 60_000);
