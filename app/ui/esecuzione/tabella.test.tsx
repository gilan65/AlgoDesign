// La tabella di traccia nella finestra, sotto happy-dom: la finestra vera (`Applicazione`) col file dato all'avvio
// da un guscio simulato, e i tasti premuti come li preme l'utente.
//
// - A ogni pausa del programma di riferimento la riga corrente (`aria-current`, una sola) ha i valori di adesso:
//   gli 8 dati della riga dell'atteso scritto a mano (`atteso-del-riferimento.ts`) con lo stesso numero, che non
//   dipende dal nucleo; 65 pause (5 valori iniziali e 60 blocchi) più la fine, 66 righe.
// - A esecuzione finita la tabella è l'atteso cella per cella: intestazione (nome e tipo), numero, regola, valori,
//   condizione, scritto; sul riferimento e su un progetto con un vettore (una colonna per elemento).
// - «Esporta la tabella» dal menu «Progetto» scrive il CSV dell'atteso byte per byte, nelle due lingue coi
//   separatori della lingua, e coi separatori scelti nelle Impostazioni.
// - Su `troppi-passi` le ultime 1000 righe, la numerazione vera e quante righe non ci sono più; con una riga sola
//   tolta, la frase al singolare sopra la tabella e nel messaggio dopo l'esportazione.
// - La riga che spiega che cosa si vede di un vettore oltre il tetto delle colonne e che cosa ha il CSV, con le
//   frasi dei dizionari nelle due lingue (le compone il nucleo coi pezzi che le danno le parole della tabella).
// - La forma dei vettori e quella del CSV scelte nelle Impostazioni arrivano alla tabella, alla riga che spiega e al
//   file: un vettore di 12 elementi nelle due forme, contro l'atteso scritto a mano (`atteso-del-vettore.ts`) cella per
//   cella, coi segni (in fila, l'elemento cambiato dentro la cella) e il testo intero nel `title` della cella;
//   il CSV byte per byte nelle quattro combinazioni; in inglese le due forme.
// - Dopo «Esporta la tabella» il messaggio dice le righe che mancano, quando ne mancano.
//
// Che cosa NON guarda:
// - l'aspetto (colori della riga corrente e delle celle cambiate, scorrimento, colonne fisse): i motori;
// - le celle cambiate cella per cella: il nucleo (`core/esecuzione/esecuzione.test.ts`); qui solo che la finestra
//   segna quelle che il nucleo dà, sul riferimento;
// - la finestra del sistema per scegliere il file e la scrittura sul disco: il guscio è simulato (`cargo test` prova
//   la scrittura, la prova sul prodotto il resto);
// - la tabella durante «tutto insieme» (fra due fette): solo a comando fermo;
// - quanto del `title` mostra il suggerimento del sistema: una finestra del sistema, fuori dalla pagina (misurato a mano
//   sul vettore di 1000 in fila: in Chromium i primi 146 elementi, in WebKit su Windows nessun
//   suggerimento; per questo la frase sopra la tabella promette solo i primi);
// - le forme del vettore con un vettore lungo (1000 elementi) e il tempo: il nucleo (`core/esecuzione/traccia.test.ts`) e
//   la prova nei motori (`e2e/programmi-pesanti.e2e.ts`);
// - la cella tagliata in fila (il taglio lo fa il CSS: happy-dom non disegna).

import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { opzioniPredefinite as opzioniDelDisegno } from "../../core/disegno/impaginazione";
import { csvIngleseAtteso, csvItalianoAtteso } from "../../core/esecuzione/atteso-del-riferimento";
import {
  cambiateAttese,
  inFilaInglese,
  inFilaItaliano,
  iniziatiPrimiEAltriItaliano,
  perElementoItaliano,
  primiEAltriInglese,
  primiEAltriItaliano,
  progettoDeiValoriIniziali,
  progettoDelVettore,
  regolaDiRComeElenco,
  regolaDiRComeValoreSolo,
} from "../../core/esecuzione/atteso-del-vettore";
import { TabellaMostrata } from "../../core/esecuzione/traccia";
import { apri } from "../../core/progetto/formato";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali, type Scelte } from "../preferenze";
import { testiDellaTraccia } from "./TabellaDiTraccia";

const misura = (t: string) => [...t].length * 10;
const CARTELLA = new URL("../../casi/tappa-1/", import.meta.url);
const testoDel = (nome: string) => readFileSync(new URL(nome, CARTELLA), "utf8");
const riferimento = testoDel("riferimento-media-voti.algo");
const progettoDelRiferimento = (() => {
  const r = apri(riferimento);
  if (!r.ok) throw new Error("il riferimento non si apre");
  return r.progetto;
})();
const inputDelRiferimento = progettoDelRiferimento.test_cases![0]!.inputs.map((i) => i.text);

let datoAllAvvio = { percorso: "", testo: "" };
/** Le scritture chieste al guscio: il percorso e il testo. */
let scritti: { percorso: string; testo: string }[] = [];
/** Le richieste della finestra del sistema per esportare: il nome proposto e il filtro. */
let proposti: { proposto: string; filtro: string }[] = [];
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
        proposti.push({ proposto: String(argomenti.proposto), filtro: String(argomenti.filtro) });
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
  proposti = [];
});

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const istante = () => `${statoMostrato()} · ${document.querySelector('[role="log"]')?.childElementCount ?? 0}`;

async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

async function apriLaFinestra(nome: string, testo: string, lingua: Lingua = "it", scelte: Scelte = scelteIniziali): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale={lingua} misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi((lingua === "it" ? it : en).apertoIl, { file: nome }));
}

async function premi(tasto: string): Promise<void> {
  const prima = istante();
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: tasto });
  });
  await aspetta(`l'effetto di ${tasto}`, () => istante() !== prima && !statoMostrato().startsWith(it.statoInCorso) && !statoMostrato().startsWith(en.statoInCorso));
}

async function scrivi(testo: string): Promise<void> {
  const campo = document.activeElement;
  if (!(campo instanceof HTMLInputElement)) throw new Error("il fuoco non è nella riga della console");
  const prima = istante();
  await act(async () => {
    fireEvent.change(campo, { target: { value: testo } });
  });
  await act(async () => {
    fireEvent.keyDown(campo, { key: "Enter" });
  });
  await aspetta(`l'effetto del valore «${testo}»`, () => istante() !== prima && !statoMostrato().startsWith(it.statoInCorso) && !statoMostrato().startsWith(en.statoInCorso));
}

/** La tabella di traccia nella colonna. */
const tabella = () => document.querySelector<HTMLTableElement>("table[data-traccia]");
/** L'intestazione come nel CSV: «nome (tipo)» per le colonne dei valori. */
const intestazione = () => [...(tabella()?.tHead?.querySelectorAll("th") ?? [])].map((th) => {
  const tipo = th.querySelector("[data-tipo]")?.textContent;
  const nome = th.querySelector("[data-nome]")?.textContent ?? th.textContent;
  return tipo ? `${nome} (${tipo})` : (nome ?? "");
});
const righe = () => [...(tabella()?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-riga]") ?? [])];
const celle = (tr: HTMLTableRowElement) => [...tr.cells].map((c) => c.textContent ?? "");
const correnti = () => righe().filter((tr) => tr.getAttribute("aria-current") === "true");

/** Le celle di una riga del CSV: separate da `sep`, fra virgolette quelle che lo contengono. */
function celleDelCsv(riga: string, sep: string): string[] {
  const fuori: string[] = [];
  let k = 0;
  for (;;) {
    let cella = "";
    if (riga[k] === '"') {
      for (k++; ; k++) {
        if (riga[k] === '"' && riga[k + 1] === '"') {
          cella += '"';
          k++;
        } else if (riga[k] === '"') {
          k++;
          break;
        } else cella += riga[k];
      }
    } else while (k < riga.length && riga[k] !== sep) cella += riga[k++];
    fuori.push(cella);
    if (k >= riga.length) return fuori;
    k++;
  }
}
const differenze = (a: readonly string[], b: readonly string[]): string[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, k) => k).flatMap((k) => (a[k] === b[k] ? [] : [`${k}: ${a[k]} | ${b[k]}`]));

/** Il riferimento un passo alla volta fino alla fine, coi valori del caso; a ogni pausa `aOgniPausa`. Lo stato
 * si legge nella lingua della finestra; la fine si riconosce dal suo testo (un altro stato è un errore). */
async function riferimentoFinoAllaFine(aOgniPausa: (azione: number) => void, testi: typeof it = it): Promise<number> {
  const input = [...inputDelRiferimento];
  let pause = 0;
  await premi("F10");
  for (;;) {
    const s = statoMostrato();
    const pausa = new RegExp(`^${riempi(testi.statoInPausa, { n: "(\\d+)" })}$`).exec(s);
    const chiede = new RegExp(`^${riempi(testi.statoChiede, { dato: "\\w+" })}$`).test(s);
    if (pausa) {
      pause++;
      aOgniPausa(Number(pausa[1]));
      await premi("F10");
    } else if (chiede) await scrivi(input.shift()!);
    else if (s === testi.statoFinita) return pause;
    else throw new Error(`stato inatteso: «${s}»`);
  }
}

// ------------------------------------------------------------------------- la riga corrente

test("a ogni pausa del riferimento la riga corrente ha i valori di adesso: 8 dati × 66 righe dall'atteso scritto a mano", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  const attese = csvItalianoAtteso.slice(1).map((r) => celleDelCsv(r, ";"));
  const sbagliate: string[] = [];
  let confrontate = 0;
  const guarda = (quando: string, numero: number) => {
    const c = correnti();
    if (c.length !== 1) {
      sbagliate.push(`${quando}: ${c.length} righe correnti`);
      return;
    }
    const viste = celle(c[0]!);
    const attesa = attese[numero]!;
    // Il numero della riga e i valori degli 8 dati (le colonne dopo «#» e «Regola»).
    if (viste[0] !== String(numero)) sbagliate.push(`${quando}: riga corrente ${viste[0]}, attesa ${numero}`);
    const valori = viste.slice(2, 10);
    if (valori.join("|") !== attesa.slice(2, 10).join("|")) sbagliate.push(`${quando}: ${valori.join("|")} | ${attesa.slice(2, 10).join("|")}`);
    confrontate += valori.length;
  };
  // In pausa sull'azione k la riga corrente è la k - 1 (la 0 alla prima pausa): i valori dopo l'azione di prima.
  const pause = await riferimentoFinoAllaFine((k) => guarda(`pausa ${k}`, k - 1));
  guarda("fine", 65);
  expect({ pause, sbagliate }).toEqual({ pause: 65, sbagliate: [] });
  expect(confrontate).toBe(8 * 66);
}, 60_000);

// ------------------------------------------------------------------- la tabella e il CSV

test("a esecuzione finita la tabella è l'atteso del riferimento cella per cella, coi segni delle celle cambiate", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  await riferimentoFinoAllaFine(() => {});
  const attese = csvItalianoAtteso.map((r) => celleDelCsv(r, ";"));
  expect(differenze(intestazione(), attese[0]!)).toEqual([]);
  const viste = righe().map(celle);
  expect(differenze(viste.map((r) => r.join("|")), attese.slice(1).map((r) => r.join("|")))).toEqual([]);
  expect(viste.length * (viste[0]?.length ?? 0)).toBe(66 * 12);
  // Le celle segnate come cambiate: quelle il cui testo è diverso dalla riga prima, nell'atteso.
  const segnate = righe().slice(1).flatMap((tr, k) => [...tr.cells].slice(2, 10).map((td, d) => (td.hasAttribute("data-cambiata") ? `${k + 1}:${d}` : null)).filter((x) => x !== null));
  const attesi = attese.slice(2).flatMap((r, k) => r.slice(2, 10).map((c, d) => (c !== attese[k + 1]![d + 2] ? `${k + 1}:${d}` : null)).filter((x) => x !== null));
  expect(segnate).toEqual(attesi);
  expect(attesi.length).toBe(29);
}, 60_000);

/** Esporta la tabella dal menu «Progetto», e restituisce ciò che il guscio ha scritto. */
async function esporta(testi: typeof it): Promise<{ percorso: string; testo: string }> {
  const menu = document.querySelector<HTMLButtonElement>('[data-menu="progetto"]');
  if (!menu) throw new Error("manca il menu «Progetto»");
  await act(async () => {
    fireEvent.click(menu);
  });
  await aspetta("il menu aperto", () => document.querySelector('[data-comando="esportaTabella"]') !== null);
  const voce = document.querySelector<HTMLElement>('[data-comando="esportaTabella"]')!;
  expect(voce.textContent).toContain(testi.esportaTabella);
  // Dalla tastiera: Fine porta all'ultima voce, Invio la sceglie (sotto happy-dom il clic su una voce, anche coi
  // gesti del puntatore, chiude il menu senza sceglierla: misurato).
  await giro();
  const contenuto = document.querySelector<HTMLElement>('[role="menu"]')!;
  await act(async () => {
    fireEvent.keyDown(contenuto, { key: "End" });
  });
  await giro();
  expect(document.querySelector("[data-highlighted]")?.getAttribute("data-comando")).toBe("esportaTabella");
  await act(async () => {
    fireEvent.keyDown(contenuto, { key: "Enter" });
  });
  await aspetta("la tabella scritta", () => scritti.length > 0);
  return scritti[0]!;
}

test("«Esporta la tabella» scrive il CSV dell'atteso byte per byte, in italiano e in inglese coi separatori della lingua", async () => {
  for (const [lingua, testi, atteso] of [
    ["it", it, csvItalianoAtteso],
    ["en", en, csvIngleseAtteso],
  ] as const) {
    cleanup();
    scritti = [];
    proposti = [];
    await apriLaFinestra("riferimento-media-voti.algo", riferimento, lingua);
    await riferimentoFinoAllaFine(() => {}, testi);
    const scritto = await esporta(testi);
    expect(scritto.percorso).toBe("C:\\tabelle\\traccia.csv");
    expect(differenze(scritto.testo.slice(1).split("\r\n"), [...atteso, ""])).toEqual([]);
    expect(scritto.testo).toBe(`\u{feff}${atteso.join("\r\n")}\r\n`);
    expect(proposti).toEqual([{ proposto: riempi(testi.nomeDellaTabella, { nome: progettoDelRiferimento.metadata.name }), filtro: testi.filtroDellaTabella }]);
  }
}, 120_000);

test("i separatori scelti nelle Impostazioni valgono per l'esportazione", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento, "it", { ...scelteIniziali, separatoreCsv: ",", decimaliCsv: "." });
  await riferimentoFinoAllaFine(() => {});
  const scritto = await esporta(it);
  // L'atteso inglese coi testi italiani: separatori e decimali sono quelli dell'inglese.
  const atteso = csvItalianoAtteso.map((r) => celleDelCsv(r, ";").map((c) => (/^\d+,\d+$/.test(c) ? c.replace(",", ".") : c)).map((c) => (/[,"]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c)).join(","));
  expect(differenze(scritto.testo.slice(1).split("\r\n"), [...atteso, ""])).toEqual([]);
}, 60_000);

// --------------------------------------------------------------------- le ultime 1000 righe

test("un ciclo che non finisce: la riga 0, poi le ultime 1000 righe con la numerazione vera, e quante non ci sono più", async () => {
  await apriLaFinestra("troppi-passi.algo", testoDel("troppi-passi.algo"));
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === it.statoFermataDaUnErrore);
  const numeri = righe().map((tr) => celle(tr)[0]);
  expect({ righe: numeri.length, prima: numeri[0], seconda: numeri[1], ultima: numeri.at(-1) }).toEqual({ righe: 1001, prima: "0", seconda: "999001", ultima: "1000000" });
  expect(document.querySelector("[data-tolte]")?.textContent).toBe(riempi(it.tracciaTolte, { n: (999000).toLocaleString("it") }));
  expect(correnti().map((tr) => celle(tr)[0])).toEqual(["1000000"]);
}, 120_000);

test("durante «tutto insieme» la tabella non si ridisegna: si aggiorna quando l'esecuzione si ferma", async () => {
  // A ogni fotogramma ridisegnarla (fino a 1000 righe) rubava il tempo alla corsa: il tetto di un milione di passi
  // arrivava 7-10 volte più tardi nei motori (misurato in `esecuzione.e2e.ts`). Sotto happy-dom la corsa intera
  // finisce dentro un solo `act`: si contano, dall'inizio alla fine, le volte che la tabella cambia (un osservatore
  // messo prima di F5), e i fotogrammi della corsa (le fette: ognuna ridisegna lo stato nella riga di stato).
  await apriLaFinestra("troppi-passi.algo", testoDel("troppi-passi.algo"));
  let volteDellaTabella = 0;
  let fotogrammi = 0;
  const osservatore = new MutationObserver((m) => {
    if (m.some((x) => (x.target instanceof Element ? x.target : x.target.parentElement)?.closest("table[data-traccia]"))) volteDellaTabella++;
  });
  osservatore.observe(document.body, { childList: true, subtree: true, characterData: true });
  const fotogrammaVero = window.requestAnimationFrame;
  window.requestAnimationFrame = (f) => fotogrammaVero((t) => {
    fotogrammi++;
    f(t);
  });
  try {
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "F5" });
    });
    await aspetta("la fine", () => statoMostrato() === it.statoFermataDaUnErrore);
  } finally {
    osservatore.disconnect();
    window.requestAnimationFrame = fotogrammaVero;
  }
  console.log(`corsa lunga: fotogrammi ${fotogrammi}, volte che la tabella è cambiata ${volteDellaTabella}`);
  // La premessa: la corsa è durata molti fotogrammi. La tabella cambia all'avvio e alla fine, non a ogni fotogramma.
  expect(fotogrammi).toBeGreaterThan(20);
  expect(volteDellaTabella).toBeLessThanOrEqual(3);
  expect(righe().at(-1)?.getAttribute("data-riga")).toBe("1000000");
}, 120_000);

// ------------------------------------------------------------------------------- un vettore

test("un vettore: una colonna per elemento, e la tabella è l'atteso scritto a mano", async () => {
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "vettore" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "v", type: "integer", size: 3 },
          { name: "r", type: "real", initial: "-0.5" },
        ],
        body: [
          { id: "b1", kind: "assignment", target: "v[1]", value: "7" },
          { id: "b2", kind: "assignment", target: "r", value: "v[1] / 2" },
        ],
        end: { id: "fine" },
      },
    ],
  });
  await apriLaFinestra("vettore.algo", testo);
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === it.statoFinita);
  expect(intestazione()).toEqual(["#", "Regola", "v[0] (intero)", "v[1] (intero)", "v[2] (intero)", "r (reale)", "Condizione", "Scrive"]);
  expect(righe().map((tr) => celle(tr).join("|"))).toEqual([
    "0|Inizio|non inizializzata|non inizializzata|non inizializzata|non inizializzata||",
    "1|r ← -0.5|non inizializzata|non inizializzata|non inizializzata|-0,50||",
    "2|v[1] ← 7|non inizializzata|7|non inizializzata|-0,50||",
    "3|r ← v[1] / 2|non inizializzata|7|non inizializzata|3,00||",
    "4|Fine|non inizializzata|7|non inizializzata|3,00||",
  ]);
  // Solo l'elemento che cambia è segnato.
  expect(righe().map((tr) => [...tr.cells].map((td, i) => (td.hasAttribute("data-cambiata") ? i : null)).filter((i) => i !== null))).toEqual([[], [5], [3], [5], []]);
}, 60_000);

test("la riga che spiega un vettore oltre il tetto: le frasi dei dizionari, nelle due lingue e nelle due forme", () => {
  const r = apri(
    JSON.stringify({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "quadrati" },
      functions: [{ id: "f1", kind: "main", data: [{ name: "v", type: "integer", size: 1000 }], body: [], end: { id: "b1" } }],
    }),
  );
  if (!r.ok) throw new Error("il progetto non si apre");
  const spiega = (lingua: Lingua, forma: "primi-e-altri" | "in-fila", csv: "uguale" | "per-elemento") => new TabellaMostrata(r.progetto, testiDellaTraccia(lingua), ",", forma, "elenco", opzioniDelDisegno).spiegazione(csv);
  expect(spiega("it", "primi-e-altri", "uguale")).toBe(
    "«v» ha 1000 elementi: qui le colonne dei primi 10, gli altri nella colonna «v[10…999]» quando cambiano; tutti con un clic sul nome nel flowchart. Il CSV esportato è uguale alla tabella.",
  );
  expect(spiega("it", "in-fila", "per-elemento")).toBe("«v» ha 1000 elementi in una colonna sola: col puntatore del mouse sopra una cella se ne leggono i primi, tutti con un clic sul nome nel flowchart. Il CSV esportato ha una colonna per ogni elemento.");
  expect(spiega("en", "primi-e-altri", "per-elemento")).toBe(
    "“v” has 1,000 elements: here the columns of the first 10, the others in the column “v[10…999]” when they change; all of them with a click on the name in the flowchart. The exported CSV has a column for each element.",
  );
  expect(spiega("en", "in-fila", "uguale")).toBe("“v” has 1,000 elements in a single column: with the mouse pointer on a cell the first ones can be read, all of them with a click on the name in the flowchart. The exported CSV is the same as the table.");
  // Un vettore di un elemento solo, in fila: la frase al singolare.
  const uno = apri(
    JSON.stringify({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "uno" },
      functions: [{ id: "f1", kind: "main", data: [{ name: "u", type: "integer", size: 1 }], body: [], end: { id: "b1" } }],
    }),
  );
  if (!uno.ok) throw new Error("il progetto non si apre");
  const spiegaUno = (lingua: Lingua) => new TabellaMostrata(uno.progetto, testiDellaTraccia(lingua), ",", "in-fila", "elenco", opzioniDelDisegno).spiegazione("uguale");
  expect(spiegaUno("it")).toBe("«u» ha 1 elemento, in una colonna sola. Il CSV esportato è uguale alla tabella.");
  expect(spiegaUno("en")).toBe("“u” has 1 element, in a single column. The exported CSV is the same as the table.");
});

// ------------------------------------------------------------- le forme scelte nelle Impostazioni

/** La tabella vista come righe del CSV: l'intestazione «nome (tipo)» e le celle, unite col separatore italiano. */
const comeCsv = () => [intestazione().join(";"), ...righe().map((tr) => celle(tr).join(";"))];
/** Le celle segnate come cambiate di ogni riga delle azioni, col nome della colonna e, in fila, il pezzo segnato. */
function segnateDaRiga(): Record<number, string[]> {
  const nomi = [...(tabella()?.tHead?.querySelectorAll("th") ?? [])].map((th) => th.querySelector("[data-nome]")?.textContent ?? "");
  const fuori: Record<number, string[]> = {};
  for (const tr of righe()) {
    const segnate = [...tr.cells].flatMap((td, i) => {
      if (!td.hasAttribute("data-cambiata")) return [];
      const pezzi = [...td.querySelectorAll("[data-cambiato]")].map((m) => m.textContent);
      return [pezzi.length > 0 ? `${nomi[i]} ${pezzi.join(" ")}` : nomi[i]!];
    });
    if (segnate.length > 0) fuori[Number(tr.dataset.riga)] = segnate;
  }
  return fuori;
}

test("la forma dei vettori e quella del CSV scelte nelle Impostazioni arrivano alla tabella, alla riga che spiega e al file: l'atteso scritto a mano", async () => {
  const testo = JSON.stringify(progettoDelVettore);
  const casi = [
    { forma: "primi-e-altri", csv: "uguale", tabella: primiEAltriItaliano, file: primiEAltriItaliano, segnate: cambiateAttese.primiEAltri },
    { forma: "primi-e-altri", csv: "per-elemento", tabella: primiEAltriItaliano, file: perElementoItaliano, segnate: cambiateAttese.primiEAltri },
    { forma: "in-fila", csv: "uguale", tabella: inFilaItaliano, file: inFilaItaliano, segnate: cambiateAttese.inFila },
    { forma: "in-fila", csv: "per-elemento", tabella: inFilaItaliano, file: perElementoItaliano, segnate: cambiateAttese.inFila },
  ] as const;
  const spiega = {
    "primi-e-altri": riempi(it.tracciaVettorePrimiEAltri, { nome: "v", n: "12", primi: "10", colonna: "v[10…11]" }),
    "in-fila": riempi(it.tracciaVettoreInFila, { nome: "v", n: "12" }),
  };
  for (const c of casi) {
    cleanup();
    scritti = [];
    await apriLaFinestra("quadrati.algo", testo, "it", { ...scelteIniziali, formaDeiVettori: c.forma, formaDelCsv: c.csv });
    await premi("F5");
    await aspetta("la fine", () => statoMostrato() === it.statoFinita);
    const quale = `${c.forma}, CSV ${c.csv}`;
    expect(differenze(comeCsv(), c.tabella), quale).toEqual([]);
    expect(segnateDaRiga(), quale).toEqual(c.segnate as unknown as Record<number, string[]>);
    expect(document.querySelector("[data-spiega]")?.textContent, quale).toBe(`${spiega[c.forma]} ${c.csv === "uguale" ? it.tracciaCsvUguale : it.tracciaCsvPerElemento}`);
    // In fila, il testo intero di ogni cella del vettore sta nel suo `title`.
    if (c.forma === "in-fila") for (const tr of righe()) expect(tr.cells[2]!.getAttribute("title"), quale).toBe(tr.cells[2]!.textContent);
    const scritto = await esporta(it);
    expect(differenze(scritto.testo.slice(1).split("\r\n"), [...c.file, ""]), quale).toEqual([]);
    expect(scritto.testo, quale).toBe(`\u{feff}${c.file.join("\r\n")}\r\n`);
  }
}, 120_000);

test("i valori iniziali di due vettori: la regola segue il modo del valore ripetuto scelto nelle Impostazioni, le celle no; la tabella e il file sono l'atteso scritto a mano", async () => {
  const testo = JSON.stringify(progettoDeiValoriIniziali);
  for (const valoreRipetuto of ["elenco", "un-valore"] as const) {
    cleanup();
    scritti = [];
    await apriLaFinestra("inizializzati.algo", testo, "it", { ...scelteIniziali, valoreRipetuto });
    await premi("F5");
    await aspetta("la fine", () => statoMostrato() === it.statoFinita);
    const atteso = valoreRipetuto === "elenco" ? iniziatiPrimiEAltriItaliano : iniziatiPrimiEAltriItaliano.map((r) => r.replace(regolaDiRComeElenco.it, regolaDiRComeValoreSolo.it));
    expect(differenze(comeCsv(), atteso), valoreRipetuto).toEqual([]);
    const scritto = await esporta(it);
    expect(scritto.testo, valoreRipetuto).toBe(`\u{feff}${atteso.join("\r\n")}\r\n`);
  }
  // Controllo positivo: le due forme dell'atteso sono diverse.
  expect(iniziatiPrimiEAltriItaliano.filter((r) => r.includes(regolaDiRComeElenco.it)).length).toBe(1);
}, 60_000);

test("in inglese, le due forme e la riga che spiega con le frasi del dizionario", async () => {
  const testo = JSON.stringify(progettoDelVettore);
  for (const [forma, atteso, frase] of [
    ["primi-e-altri", primiEAltriInglese, riempi(en.tracciaVettorePrimiEAltri, { nome: "v", n: "12", primi: "10", colonna: "v[10…11]" })],
    ["in-fila", inFilaInglese, riempi(en.tracciaVettoreInFila, { nome: "v", n: "12" })],
  ] as const) {
    cleanup();
    await apriLaFinestra("quadrati.algo", testo, "en", { ...scelteIniziali, formaDeiVettori: forma });
    await premi("F5");
    await aspetta("la fine", () => statoMostrato() === en.statoFinita);
    const viste = [intestazione().join(","), ...righe().map((tr) => celle(tr).join(","))];
    expect(differenze(viste, atteso), forma).toEqual([]);
    expect(document.querySelector("[data-spiega]")?.textContent, forma).toBe(`${frase} ${en.tracciaCsvUguale}`);
  }
}, 60_000);

test("senza vettori oltre il tetto né in fila nessuna riga spiega; dopo l'esportazione il messaggio dice le righe che mancano, come la tabella", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", riferimento);
  await riferimentoFinoAllaFine(() => {});
  expect(document.querySelector("[data-spiega]")?.outerHTML ?? null).toBeNull();
  await esporta(it);
  // Nessuna riga tolta: il messaggio di sempre.
  expect(avviso()).toBe(riempi(it.esportataIn, { file: "traccia.csv" }));
  cleanup();
  scritti = [];
  await apriLaFinestra("troppi-passi.algo", testoDel("troppi-passi.algo"));
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === it.statoFermataDaUnErrore);
  await esporta(it);
  expect(avviso()).toBe(riempi(it.esportataSenzaLePrime, { file: "traccia.csv", n: (999000).toLocaleString("it") }));
}, 120_000);

test("una riga sola tolta: sopra la tabella e nel messaggio dopo l'esportazione le frasi al singolare", async () => {
  // 1001 azioni: il valore iniziale di i, poi 499 giri di condizione e assegnazione, l'ultima condizione e la fine.
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "mille-e-una" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "i", type: "integer", initial: "0" }],
        body: [{ id: "b3", kind: "while", condition: "i < 499", body: [{ id: "b4", kind: "assignment", target: "i", value: "i + 1" }] }],
        end: { id: "b5" },
      },
    ],
  });
  await apriLaFinestra("mille-e-una.algo", testo);
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === it.statoFinita);
  // La premessa: la prima riga dopo la riga 0 è la 2, cioè ne manca una sola.
  expect(righe().slice(0, 2).map((tr) => tr.getAttribute("data-riga"))).toEqual(["0", "2"]);
  expect(document.querySelector("[data-tolte]")?.textContent).toBe(it.tracciaTolta);
  await esporta(it);
  expect(avviso()).toBe(riempi(it.esportataSenzaLaPrima, { file: "traccia.csv" }));
}, 60_000);
