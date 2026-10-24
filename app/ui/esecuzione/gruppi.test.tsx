// La tabella di traccia di un progetto con procedure e funzioni nella finestra, e le righe del codice delle chiamate, sotto
// happy-dom: la finestra vera (`Applicazione`) col file dato all'avvio da un guscio simulato, i tasti e i clic come li dà
// l'utente. Il progetto è `tappa-3/tre-livelli`: il programma chiama `mostra(n)`, che scrive ciò che restituisce
// `piu_uno_del_quadrato(q)`, cioè `quadrato(x) + 1`.
//
// - A esecuzione finita: la riga dei gruppi (il programma principale, poi la condizione e lo scritto che occupano le due
//   righe, poi un gruppo per funzione), i nomi delle colonne sotto, e le righe cella per cella nell'ordine mostrato, col
//   livello, lo sfondo del livello e le righe della ripresa dopo un ritorno dentro un'espressione; tutto scritto a mano.
// - Il CSV esportato ha le colonne nell'ordine mostrato, col livello.
// - Il clic sul nome di un gruppo lo chiude in una colonna sola, con «⋯» nelle righe in cui la funzione è attiva e il segno
//   dove un suo dato cambia; un altro clic lo riapre; il CSV ha comunque tutte le colonne.
// - Un gruppo chiuso resta chiuso a un'altra esecuzione.
// - Nel codice generato, in pausa dentro `quadrato` (cinque volte «Entra»), le righe delle chiamate in corso ai livelli di
//   sopra con lo sfondo del livello che ciascuna apre, e la riga corrente; dopo «Esci» una riga in meno.
// - La riga dell'errore in un ciclo `per`: nel Python solo la riga della parte che si è fermata (l'aumento).
//
// Che cosa NON guarda:
// - i colori veri degli sfondi e il contrasto (`sfondi.test.ts` sui valori del tema, `e2e/tabella.e2e.ts` nel motore);
// - le righe della tabella calcolate dal nucleo, cella per cella in ogni forma (`core/esecuzione/traccia.test.ts`);
// - il trascinamento delle colonne fra le regioni (`colonne.test.ts` per l'ordine, `e2e/colonne.e2e.ts` nel motore).

import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const TRE_LIVELLI = readFileSync(new URL("../../casi/tappa-3/tre-livelli.algo", import.meta.url), "utf8");
/** Un `per` che si ferma all'aumento: il contatore oltre il più grande degli interi. */
const PER_CHE_SI_FERMA = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "per" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "i", type: "integer" },
        { name: "s", type: "integer", initial: "0" },
      ],
      body: [{ id: "b1", kind: "for", counter: "i", from: "2147483646", to: "2147483647", body: [{ id: "b2", kind: "assignment", target: "s", value: "i mod 2" }] }],
      end: { id: "b3" },
    },
  ],
});

let datoAllAvvio = { percorso: "", testo: "" };
let scritti: { percorso: string; testo: string }[] = [];
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
      case "scegli_file_da_esportare":
        return { percorso: "C:\\tabelle\\traccia.csv", sostituire: false };
      case "scrivi_progetto":
        scritti.push({ percorso: String(argomenti.percorso), testo: String(argomenti.testo) });
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
beforeEach(() => {
  cleanup();
  scritti = [];
});

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";

async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

async function apriLaFinestra(nome: string, testo: string): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(it.apertoIl, { file: nome }));
}

const premi = (tasto: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(document.activeElement ?? document.body, { key: tasto, ...altro }));
const clic = (e: Element | null | undefined, cosa: string) => {
  if (!e) throw new Error(`manca ${cosa}`);
  return act(async () => void fireEvent.click(e));
};
const finita = () => statoMostrato() === it.statoFinita || statoMostrato() === it.statoFermataDaUnErrore;

const tabella = () => document.querySelector<HTMLTableElement>("table[data-traccia]");
/** Le righe dell'intestazione, cella per cella: il testo, «↕» se occupa le due righe, «×n» se copre n colonne. */
const righeDellIntestazione = () =>
  [...(tabella()?.querySelectorAll("thead tr") ?? [])].map((tr) =>
    [...tr.querySelectorAll("th")].map((th) => `${th.textContent ?? ""}${th.getAttribute("rowspan") === "2" ? " ↕" : ""}${Number(th.getAttribute("colspan") ?? "1") > 1 ? ` ×${th.getAttribute("colspan")}` : ""}`),
  );
const righe = () => [...(tabella()?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-riga]") ?? [])];
const celle = (tr: HTMLTableRowElement) => [...tr.cells].map((c) => c.textContent ?? "").join("|");
const gruppo = (nome: string) => tabella()?.querySelector<HTMLButtonElement>(`button[data-gruppo-di="${nome}"]`);

/** Esporta la tabella dal menu «Progetto» (dalla tastiera: sotto happy-dom il clic su una voce non la sceglie). */
async function esporta(): Promise<string> {
  scritti = [];
  await clic(document.querySelector('[data-menu="progetto"]'), "il menu «Progetto»");
  await aspetta("il menu aperto", () => document.querySelector('[data-comando="esportaTabella"]') !== null);
  await giro();
  const contenuto = document.querySelector<HTMLElement>('[role="menu"]')!;
  await act(async () => void fireEvent.keyDown(contenuto, { key: "End" }));
  await giro();
  await act(async () => void fireEvent.keyDown(contenuto, { key: "Enter" }));
  await aspetta("la tabella scritta", () => scritti.length > 0);
  return scritti[0]!.testo;
}

const scritta = 'scrivi "risultato: ", piu_uno_del_quadrato(q) ↵';
const ni = "non inizializzata";

test("i gruppi, le righe coi livelli e le riprese, e il CSV nell'ordine mostrato: scritti a mano", async () => {
  await apriLaFinestra("tre-livelli.algo", TRE_LIVELLI);
  await premi("F5");
  await aspetta("la fine", finita);
  expect(righeDellIntestazione()).toEqual([
    ["# ↕", "Regola ↕", "▾ Programma principale", "Condizione ↕", "Scrive ↕", "▾ mostra", "▾ piu_uno_del_quadrato", "▾ quadrato"],
    ["nintero", "qintero", "xintero", "yintero"],
  ]);
  // Numero, regola, n, condizione, scritto, q, x, y; poi il livello, lo sfondo e la ripresa.
  const viste = righe().map((tr) => `${celle(tr)} · ${tr.dataset.livello}/${tr.dataset.sfondo ?? "-"}${tr.hasAttribute("data-ripresa") ? " ripresa" : ""}`);
  expect(viste).toEqual([
    `0|Inizio|${ni}||||| · 0/-`,
    "1|n ← 4|4||||| · 0/-",
    "2|↪ mostra(n)|4|||4|| · 0/-",
    `3|${scritta}|4||risultato: |4|4| · 1/1`,
    "4|Restituisce quadrato(x) + 1|4|||4|4|4 · 2/2",
    "5|Restituisce y * y|4|||4|4| · 3/3",
    // La ripresa dice anche il valore che la funzione chiamata ha restituito.
    "4|↩ Restituisce quadrato(x) + 1  (quadrato → 16)|4|||4|| · 2/2 ripresa",
    `3|↩ ${scritta}  (piu_uno_del_quadrato → 17)|4||17 ↵|4|| · 1/1 ripresa`,
    "6|Fine|4||||| · 1/1",
    "7|Fine|4||||| · 0/-",
  ]);
  // Una sola riga corrente, l'ultima.
  expect(righe().map((tr) => tr.getAttribute("aria-current") ?? "")).toEqual(["", "", "", "", "", "", "", "", "", "true"]);
  const csv = (await esporta()).replace(/^\u{feff}/u, "").split("\r\n").slice(0, -1);
  expect(csv[0]).toBe("#;Livello;Regola;n (intero);Condizione;Scrive;mostra › q (intero);piu_uno_del_quadrato › x (intero);quadrato › y (intero)");
  // La regola con le virgolette sta fra virgolette, raddoppiate (RFC 4180).
  expect(csv.slice(7, 9)).toEqual(["4;2;↩ Restituisce quadrato(x) + 1  (quadrato → 16);4;;;4;;", `3;1;"↩ ${scritta.replaceAll('"', '""')}  (piu_uno_del_quadrato → 17)";4;;17 ↵;4;;`]);
  expect(csv.length).toBe(11);
}, 60_000);

test("il clic sul nome di un gruppo lo chiude in una colonna sola con «⋯» dove la funzione è attiva; un altro lo riapre; il CSV ha tutto", async () => {
  await apriLaFinestra("tre-livelli.algo", TRE_LIVELLI);
  await premi("F5");
  await aspetta("la fine", finita);
  const tutto = await esporta();
  await clic(gruppo("piu_uno_del_quadrato"), "il gruppo di piu_uno_del_quadrato");
  expect(gruppo("piu_uno_del_quadrato")?.getAttribute("aria-expanded")).toBe("false");
  expect(righeDellIntestazione()).toEqual([
    ["# ↕", "Regola ↕", "▾ Programma principale", "Condizione ↕", "Scrive ↕", "▾ mostra", "▸ piu_uno_del_quadrato ↕", "▾ quadrato"],
    ["nintero", "qintero", "yintero"],
  ]);
  // La colonna chiusa: «⋯» dalla riga 3 (il salto dentro la scrittura) alla 5, segnata solo alla 3, dove x riceve 4.
  const chiuse = righe().map((tr) => {
    const td = tr.querySelector<HTMLTableCellElement>('td[data-chiuso="piu_uno_del_quadrato"]')!;
    return `${td.textContent}${td.hasAttribute("data-cambiata") ? "*" : ""}`;
  });
  expect(chiuse).toEqual(["", "", "", "⋯*", "⋯", "⋯", "", "", "", ""]);
  expect(await esporta()).toBe(tutto);
  await clic(gruppo("piu_uno_del_quadrato"), "il gruppo di piu_uno_del_quadrato");
  expect(righeDellIntestazione()[1]).toEqual(["nintero", "qintero", "xintero", "yintero"]);
  // Chiuso il programma principale, la condizione e lo scritto restano.
  await clic(gruppo("#radice"), "il gruppo del programma principale");
  expect(righeDellIntestazione()[0]).toEqual(["# ↕", "Regola ↕", "▸ Programma principale ↕", "Condizione ↕", "Scrive ↕", "▾ mostra", "▾ piu_uno_del_quadrato", "▾ quadrato"]);
  expect(celle(righe()[1]!)).toBe("1|n ← 4|⋯|||||");
}, 60_000);

test("un gruppo chiuso resta chiuso all'esecuzione dopo", async () => {
  await apriLaFinestra("tre-livelli.algo", TRE_LIVELLI);
  await premi("F5");
  await aspetta("la fine", finita);
  await clic(gruppo("quadrato"), "il gruppo di quadrato");
  await premi("F5", { shiftKey: true });
  await aspetta("ferma", () => tabella() === null);
  await premi("F5");
  await aspetta("la fine", finita);
  expect(gruppo("quadrato")?.getAttribute("aria-expanded")).toBe("false");
}, 60_000);

// ---------------------------------------------------------------------------------- il codice

const regione = () => document.querySelector<HTMLElement>(`section[aria-label="${it.codiceGenerato}"]`);
const linguetta = (nome: string) => [...(regione()?.querySelectorAll('[role="tab"]') ?? [])].find((t) => t.textContent === nome);
/** Le righe segnate del codice: la corrente o l'errore, e quelle delle chiamate col loro sfondo. */
const segnate = () =>
  [...(regione()?.querySelectorAll<HTMLElement>("[data-riga][data-evidenziata], [data-riga][data-chiamata]") ?? [])].map(
    (r) => `${r.dataset.evidenziata ?? `chiamata ${r.dataset.chiamata}`}: ${r.lastElementChild?.textContent}`,
  );

test("nel codice le righe delle chiamate in corso, con lo sfondo del livello che aprono; a ogni «Esci» una in meno", async () => {
  await apriLaFinestra("tre-livelli.algo", TRE_LIVELLI);
  await clic(document.querySelector('header [data-comando="genera"]'), "«Genera»");
  // Cinque volte «Entra»: il valore iniziale di n, il salto a mostra, la scrittura, ciò che restituisce
  // piu_uno_del_quadrato, ciò che restituisce quadrato.
  for (let k = 1; k <= 5; k++) {
    await premi("F11");
    await aspetta(`la pausa ${k}`, () => statoMostrato() === riempi(it.statoInPausa, { n: String(k) }));
  }
  expect(segnate()).toEqual(["chiamata 1:     CHIAMA mostra(n)", 'chiamata 2:     SCRIVI "risultato: ", piu_uno_del_quadrato(q) ↵', "chiamata 3: RESTITUISCE quadrato(x) + 1", "corrente: RESTITUISCE y * y"]);
  // «Esci» si ferma sulla ripresa dopo il ritorno, al livello di chi chiama: ciò che restituisce piu_uno_del_quadrato,
  // poi la scrittura (non sono azioni: il numero resta 5); poi «Passo» fino alla fine di mostra.
  const ripresaDopo = (funzione: string, valore: string) => riempi(it.annuncioRipresa, { funzione, valore, blocco: "", n: "" }).split("«»")[0]!;
  await premi("F11", { shiftKey: true });
  await aspetta("fuori da quadrato", () => avviso().startsWith(ripresaDopo("quadrato", "16")));
  expect([statoMostrato(), ...segnate()]).toEqual([
    riempi(it.statoInPausa, { n: "5" }),
    "chiamata 1:     CHIAMA mostra(n)",
    'chiamata 2:     SCRIVI "risultato: ", piu_uno_del_quadrato(q) ↵',
    "corrente: RESTITUISCE quadrato(x) + 1",
  ]);
  await premi("F11", { shiftKey: true });
  await aspetta("fuori da piu_uno_del_quadrato", () => avviso().startsWith(ripresaDopo("piu_uno_del_quadrato", "17")));
  expect([statoMostrato(), ...segnate()]).toEqual([riempi(it.statoInPausa, { n: "5" }), "chiamata 1:     CHIAMA mostra(n)", 'corrente:     SCRIVI "risultato: ", piu_uno_del_quadrato(q) ↵']);
  await premi("F10");
  await aspetta("la fine di mostra", () => statoMostrato() === riempi(it.statoInPausa, { n: "6" }));
  expect(segnate()).toEqual(["chiamata 1:     CHIAMA mostra(n)", "corrente: FINE"]);
  // Nel Python la chiamata del programma principale; la fine di una procedura non ha una riga sua.
  await clic(linguetta(it.linguaggioPython), "la linguetta del Python");
  expect(segnate()).toEqual(["chiamata 1:     mostra(n)"]);
}, 60_000);

test("la riga dell'errore in un ciclo per: nel Python solo quella della parte che si è fermata", async () => {
  await apriLaFinestra("per.algo", PER_CHE_SI_FERMA);
  await clic(document.querySelector('header [data-comando="genera"]'), "«Genera»");
  await clic(linguetta(it.linguaggioPython), "la linguetta del Python");
  await premi("F5");
  await aspetta("l'errore", () => statoMostrato() === it.statoFermataDaUnErrore);
  expect(segnate()).toEqual(["errore:         i = i + 1"]);
}, 60_000);
