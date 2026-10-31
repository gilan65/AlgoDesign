// L'esecuzione dalla finestra su OGNI file del corpus delle tappe 1 e 2, sotto happy-dom: la finestra vera
// (`Applicazione`), col file dato all'avvio da un guscio simulato, e i tasti premuti come li preme l'utente.
//
// - Un passo alla volta: F10 ripetuto, coi valori del caso scritti nella console e confermati con Invio; a ogni
//   pausa il blocco corrente letto dagli attributi degli ausili (`aria-current="step"`, uno solo) è l'evento
//   del nucleo nella stessa posizione, e in un ciclo `per` o `per ogni` il blocco evidenziato nel disegno è quello
//   della fase dell'evento (le forme predefinite, aperte, li disegnano tutti). Gli eventi del nucleo si ottengono qui
//   da un'`Esecuzione` del nucleo coi valori del caso; per il programma di riferimento anche dall'atteso scritto a
//   mano (`atteso-del-riferimento.ts`), che non dipende dal nucleo.
// - Coi cicli chiusi nelle Impostazioni la pausa evidenzia l'intestazione; un punto di interruzione su un `per` ferma
//   «Esegui» a ogni controllo, mai sulla partenza, sull'elemento preso né sull'aumento.
// - La console: le parti scritte dal programma sono l'output atteso del caso (lo stesso che verifica
//   `bun run casi`). Dove il caso finisce per gli input (finiti, destinati a un altro dato, non validi)
//   l'esecuzione nella finestra non finisce: aspetta un valore, e l'output fin lì è quello atteso.
// - Quando il programma aspetta un valore, l'istruzione sta nella console sopra la riga dove si scrive, e
//   l'avviso sopra il flowchart tace.
// - L'errore che ferma l'esecuzione sta sul blocco del caso (`aria-invalid`) e nella sua descrizione, e nella console
//   c'è, sotto la sua riga, il riquadro del suggerimento col testo del codice: per ogni codice che il corpus raggiunge,
//   in italiano; in inglese su un caso; l'errore della memoria (`out_of_memory`, che il corpus non raggiunge) con un
//   `RangeError` fatto sollevare alla tabella, come fa la prova del nucleo. Un progetto con errori statici non parte,
//   e l'avviso lo dice.
// - La console: sopra, quante righe il nucleo non tiene più (una sola, al singolare); una riga lunga va a capo da sola
//   o se ne tiene la fine, col modo e i caratteri scelti nelle Impostazioni.
// - Un evento si annuncia una volta: in pausa la sola regione di stato che parla è l'avviso (lo stato nella riga di
//   stato non è una regione viva).
// - A esecuzione finita il progetto si modifica, e la riga dell'errore nella console resta quella dell'esecuzione:
//   col blocco dell'errore tolto, nomina ancora quel blocco.
// - I limiti delle Impostazioni arrivano all'esecuzione: un vettore lungo quanto il limite scelto parte, uno
//   di un elemento in più no; coi limiti predefiniti nessuno dei due.
//
// Che cosa NON guarda:
// - `troppi-passi` un passo alla volta (un milione di azioni): lì F5, e l'output e l'errore;
// - l'aspetto (lo guardano i motori, `e2e/esecuzione.e2e.ts`), il tempo e le fette (happy-dom non disegna);
// - i punti di interruzione sul corpus (li provano i motori sul riferimento);
// - oltre il primo, gli altri casi d'uso di un file (il corpus ne ha uno con due): li esegue il nucleo nel modo caso;
// - le forme dei cicli diverse dalle predefinite su tutto il corpus: i cicli chiusi su un programma;
// - un lettore di schermo vero: le regioni si contano dagli elementi e dai ruoli.

import { afterAll, beforeAll, expect, test } from "bun:test";
import { confermato } from "../../strumenti/corpus";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readdirSync, readFileSync } from "node:fs";
import { tetti } from "../../core/controllo/controllo";
import { pausaSulValoreIniziale, sequenzaAttesa } from "../../core/esecuzione/atteso-del-riferimento";
import { Esecuzione } from "../../core/esecuzione/esecuzione";
import { Traccia } from "../../core/esecuzione/traccia";
import { apri } from "../../core/progetto/formato";
import { codiciErrore, type CasoDUso, type Progetto } from "../../core/progetto/modello";
import { testiDeiCodici, testoDellaSegnalazione, type Codice } from "../../i18n/codici";
import { en } from "../../i18n/en";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const CARTELLA = new URL("../../casi/tappa-1/", import.meta.url);
const CARTELLA2 = new URL("../../casi/tappa-2/", import.meta.url);
/** I file del corpus delle due tappe, con la loro cartella. */
const corpus = [CARTELLA, CARTELLA2].flatMap((c) =>
  readdirSync(c)
    .filter((n) => n.endsWith(".algo"))
    .sort()
    .map((nome) => ({ nome, url: new URL(nome, c) })),
);

/** Il file che il guscio simulato dà all'avvio: il percorso e il testo. */
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

const progettoDi = (testo: string): Progetto => {
  const r = apri(testo);
  if (!r.ok) throw new Error("il file del corpus non si apre");
  return r.progetto;
};

/** Un giro dell'interfaccia: i fotogrammi (qui `setImmediate`) e gli aggiornamenti di React. */
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
const istante = () => `${statoMostrato()} · ${document.querySelector('[role="log"]')?.childElementCount ?? 0}`;
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
/** Il blocco corrente letto dagli ausili; il valore iniziale di un dato come lo scrive la sequenza attesa; in un ciclo,
 * con la parte del riquadro evidenziata nel disegno (`id:fase`). */
const correnti = () =>
  [...document.querySelectorAll('[aria-current="step"]')].map((e) => {
    const dato = e.getAttribute("data-iniziale-di");
    if (dato !== null) return pausaSulValoreIniziale(dato);
    const id = e.getAttribute("data-blocco") ?? e.getAttribute("data-fine") ?? "?";
    const fase = document.querySelector(`svg g.corrente[data-id="${id}"]`)?.getAttribute("data-fase");
    return fase ? `${id}:${fase}` : id;
  });
/** Un evento del nucleo come lo scrive `correnti`. */
const comeEvento = (s: { readonly blocco: string; readonly dato?: string; readonly fase?: string }) =>
  s.dato !== undefined ? pausaSulValoreIniziale(s.dato) : s.fase !== undefined ? `${s.blocco}:${s.fase}` : s.blocco;
const outputMostrato = () => [...document.querySelectorAll('[role="log"] [data-scrive]')].map((e) => e.textContent).join("");

async function aspetta(cosa: string, fatto: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

/** La finestra col file aperto all'avvio. */
async function apriLaFinestra(nome: string, testo: string, scelte = scelteIniziali, lingua: "it" | "en" = "it"): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale={lingua} misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi((lingua === "it" ? testi : en).apertoIl, { file: nome }));
}

/** Il riquadro del suggerimento nella console: il titolo e il testo. */
const suggerimentoMostrato = () => {
  const r = document.querySelector('[role="log"] [data-suggerimento]');
  return r ? [...r.children].map((c) => c.textContent) : null;
};
/** Il suggerimento dopo il clic su «Spiegazione», che all'inizio è chiusa: chiusa, il riquadro non c'è. */
async function suggerimentoDellaSpiegazione(spiegazione: string): Promise<(string | null)[] | null> {
  const pulsante = [...document.querySelectorAll('[role="log"] button')].find((b) => b.firstChild?.textContent === spiegazione);
  if (pulsante?.getAttribute("aria-expanded") !== "false" || suggerimentoMostrato() !== null) return ["la spiegazione non è chiusa all'inizio", String(suggerimentoMostrato())];
  await act(async () => void fireEvent.click(pulsante));
  return suggerimentoMostrato();
}

/** Un tasto premuto dove sta il fuoco, poi i giri finché la finestra cambia (stato o console). */
async function premi(tasto: string): Promise<void> {
  const prima = istante();
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: tasto });
  });
  await aspetta(`l'effetto di ${tasto}`, () => istante() !== prima && !statoMostrato().startsWith(testi.statoInCorso));
}

/** Il valore scritto nella riga della console e confermato con Invio. */
async function scrivi(testo: string): Promise<void> {
  const campo = document.activeElement;
  if (!(campo instanceof HTMLInputElement) || campo.closest("label")?.textContent?.startsWith("Valore di") !== true) throw new Error("il fuoco non è nella riga della console");
  const prima = istante();
  await act(async () => {
    fireEvent.change(campo, { target: { value: testo } });
  });
  await act(async () => {
    fireEvent.keyDown(campo, { key: "Enter" });
  });
  await aspetta(`l'effetto del valore «${testo}»`, () => istante() !== prima && !statoMostrato().startsWith(testi.statoInCorso));
}

const PAUSA = new RegExp(`^${riempi(testi.statoInPausa, { n: "(\\d+)" })}$`);
const CHIEDE = new RegExp(`^${riempi(testi.statoChiede, { dato: "(\\w+)" })}$`);

/** Gli eventi del nucleo coi valori del caso, un passo alla volta, fin dove la finestra può arrivare (la fine,
 * o una lettura senza il suo valore). */
function delNucleo(p: Progetto, caso: CasoDUso): string[] {
  const es = new Esecuzione(p, tetti);
  if (es.stato.genere === "non parte") return [];
  const input = [...caso.inputs];
  const eventi: string[] = [];
  es.comanda("sopra");
  for (;;) {
    es.fetta(() => 0, 1);
    const s = es.stato;
    if (s.genere === "pausa") {
      eventi.push(comeEvento(s));
      es.comanda("sopra");
    } else if (s.genere === "chiede") {
      const v = input[0];
      if (!v || v.data !== s.dato || (s.nonValido && input.length === 0)) return eventi;
      input.shift();
      es.inserisci(v.text);
    } else return eventi;
  }
}

/** Il denominatore: quanti file, quante pause viste e attese (quelle in un ciclo, con la fase), quanti output
 * confrontati, quanti non partono. */
const conti = { file: 0, pause: 0, attese: 0, conLaFase: 0, output: 0, nonPartono: 0, errori: 0, suggerimenti: 0 };
/** I codici d'errore che il corpus raggiunge nella finestra, col suggerimento visto. */
const codiciVisti = new Set<string>();

for (const { nome, url } of corpus) {
  test(`${nome}: un passo alla volta i blocchi correnti sono gli eventi del nucleo, la console ha l'output del caso`, async () => {
    const testo = readFileSync(url, "utf8");
    const p = progettoDi(testo);
    expect(p.test_cases?.length).toBeGreaterThanOrEqual(1);
    const caso = p.test_cases![0]!;
    await apriLaFinestra(nome, testo);
    const lungo = nome === "troppi-passi.algo";
    const atteso = lungo ? [] : delNucleo(p, caso);
    const input = [...caso.inputs];
    const visti: string[] = [];
    const sbagli: string[] = [];
    if (caso.expected.static_error) {
      await act(async () => {
        fireEvent.keyDown(document.body, { key: "F10" });
      });
      await giro();
      expect(avviso()).toBe(testi.annuncioNonParte);
      expect(statoMostrato()).toBe(testi.statoPronto);
      expect(caso.expected.output).toBe("");
      conti.file++;
      conti.nonPartono++;
      return;
    }
    await premi(lungo ? "F5" : "F10");
    for (;;) {
      const s = statoMostrato();
      const pausa = PAUSA.exec(s);
      const chiede = CHIEDE.exec(s);
      if (pausa) {
        const ids = correnti();
        if (ids.length !== 1) sbagli.push(`azione ${pausa[1]}: correnti ${JSON.stringify(ids)}`);
        visti.push(ids[0] ?? "?");
        await premi("F10");
      } else if (chiede) {
        const v = input[0];
        // Un valore non valido già dato, o finito, o destinato a un altro dato: la finestra aspetta.
        const giaRichiesto = document.querySelectorAll('[role="log"] span').length > 0 && [...document.querySelectorAll('[role="log"] span')].at(-1)!.textContent!.startsWith("«");
        if (!v || v.data !== chiede[1] || (giaRichiesto && input.length === 0)) break;
        input.shift();
        await scrivi(v.text);
      } else break;
    }
    expect({ visti, sbagli }).toEqual({ visti: atteso, sbagli: [] });
    expect(outputMostrato()).toBe(caso.expected.output);
    conti.file++;
    conti.pause += visti.length;
    conti.attese += atteso.length;
    conti.conLaFase += visti.filter((v) => v.includes(":")).length;
    conti.output++;
    if (nome === "riferimento-media-voti.algo") expect(visti).toEqual(sequenzaAttesa);
    const errore = caso.expected.error;
    if (errore && !["input_exhausted", "input_mismatch", "invalid_input", "unused_inputs"].includes(errore.code)) {
      expect(statoMostrato()).toBe(testi.statoFermataDaUnErrore);
      const b = document.querySelector(`[data-blocco="${errore.block}"]`);
      expect(b?.getAttribute("aria-invalid")).toBe("true");
      const descrizione = document.getElementById(b?.getAttribute("aria-describedby") ?? "")?.textContent;
      const codice = testiDeiCodici.it[errore.code as keyof (typeof testiDeiCodici)["it"]];
      expect(descrizione).toContain(riempi(testi.erroreInEsecuzione, codice));
      conti.errori++;
      // Sotto la riga dell'errore, aperta «Spiegazione», il suggerimento del codice nel suo riquadro.
      expect(await suggerimentoDellaSpiegazione(testi.spiegazione)).toEqual([testi.consoleSuggerimento, codice.suggerimento]);
      conti.suggerimenti++;
      codiciVisti.add(errore.code);
    } else if (!errore || errore.code === "unused_inputs") expect(statoMostrato()).toBe(testi.statoFinita);
    else expect(CHIEDE.test(statoMostrato())).toBe(true);
  }, 60_000);
}

test("il denominatore: ogni file del corpus provato, le pause viste sono quelle del nucleo", () => {
  console.log(
    `finestra sul corpus: file ${conti.file} su ${corpus.length}, pause viste ${conti.pause} e attese ${conti.attese} (in un ciclo con la fase ${conti.conLaFase}), output confrontati ${conti.output}, non partono ${conti.nonPartono}, errori sul blocco ${conti.errori}, suggerimenti ${conti.suggerimenti} (codici ${[...codiciVisti].sort().join(", ")})`,
  );
  expect(conti.suggerimenti).toBe(conti.errori);
  // Ogni codice d'errore dell'interprete che la finestra incontra nelle tappe 1 e 2 ha visto il suo suggerimento: tutti
  // quelli del modello tranne quelli dell'esecutore dei casi (nella finestra un valore non valido si richiede e gli
  // input non finiscono), il riferimento condiviso o senza valore e la ricorsione (funzioni, tappe 3 e 4) e la memoria
  // (la prova qui sotto). Il carattere di codice 0 in una stringa lo raggiunge `scrittura-che-si-ferma`.
  const fuori = ["invalid_input", "input_exhausted", "input_mismatch", "unused_inputs", "same_reference", "reference_without_value", "recursion_too_deep", "recursion_data_too_large", "out_of_memory"];
  expect([...codiciVisti].sort()).toEqual(codiciErrore.filter((c) => !fuori.includes(c)).sort());
  expect(conti.file).toBe(corpus.length);
  expect(conti.pause).toBe(conti.attese);
  expect(conti.output + conti.nonPartono).toBe(corpus.length);
  // Controllo positivo: il corpus ha esecuzioni vere (il riferimento da solo ne fa 65), pause nei cicli con la fase,
  // errori sul blocco, e i tre programmi della tappa 2 con l'errore statico atteso, che non partono.
  expect(conti.pause).toBeGreaterThan(sequenzaAttesa.length);
  expect(conti.conLaFase).toBeGreaterThan(100);
  expect(conti.errori).toBeGreaterThan(0);
  expect({ file: corpus.length, nonPartono: conti.nonPartono }).toEqual(confermato("finestra - file delle tappe 1 e 2, quelli che non partono", { file: corpus.length, nonPartono: conti.nonPartono }));
});

test("coi cicli chiusi nelle Impostazioni la pausa in un ciclo evidenzia l'intestazione; aperti, il blocco della fase", async () => {
  const nome = "per.algo";
  const testo = readFileSync(new URL(nome, CARTELLA2), "utf8");
  /** Le prime pause di F10 nel primo ciclo: lo stato, la voce corrente, e il gruppo segnato nel disegno (forma e fase). */
  const pause = async (scelte: typeof scelteIniziali) => {
    cleanup();
    await apriLaFinestra(nome, testo, scelte);
    const viste: string[] = [];
    for (let k = 0; k < 4; k++) {
      await premi("F10");
      const segnati = [...document.querySelectorAll("svg g.corrente")].map((g) => `${g.getAttribute("data-id")} ${g.getAttribute("data-forma")} ${g.getAttribute("data-fase") ?? "-"}`);
      viste.push(`${correnti().join(",")} | ${segnati.join(",")} | ${document.querySelectorAll("[data-freccia]").length}`);
    }
    return viste;
  };
  // Il primo `per` (b1, da 1 a 5 col passo 2): la partenza, il controllo, la scrittura del corpo, l'aumento.
  expect(await pause({ ...scelteIniziali, cicliPer: "chiuso" })).toEqual(["b1 | b1 intestazione - | 1", "b1 | b1 intestazione - | 1", "b2 | b2 scrittura - | 1", "b1 | b1 intestazione - | 1"]);
  // Controllo positivo: aperti, gli stessi eventi sui blocchi della fase.
  expect(await pause(scelteIniziali)).toEqual(["b1:inizio | b1 assegnazione inizio | 1", "b1:condizione | b1 condizione condizione | 1", "b2 | b2 scrittura - | 1", "b1:passo | b1 assegnazione passo | 1"]);
}, 60_000);

test("un punto di interruzione su un ciclo ferma «Esegui» a ogni controllo: mai sulla partenza, sull'elemento preso né sull'aumento", async () => {
  /** Il file col punto sul primo ciclo, e le pause di F5 fino alla fine: la voce corrente con la fase. */
  const pauseDiF5 = async (nome: string) => {
    cleanup();
    const p = JSON.parse(readFileSync(new URL(nome, CARTELLA2), "utf8"));
    p.functions[0].body[0].breakpoint = true;
    await apriLaFinestra(nome, JSON.stringify(p, null, 2));
    const viste: string[] = [];
    for (let k = 0; k < 20; k++) {
      await premi("F5");
      if (!PAUSA.test(statoMostrato())) break;
      viste.push(correnti().join(","));
    }
    return { viste, stato: statoMostrato() };
  };
  // «per i da 1 a 5 passo 2»: i controlli con i = 1, 3, 5 e 7 (l'ultimo falso), scritti a mano.
  expect(await pauseDiF5("per.algo")).toEqual({ viste: ["b1:condizione", "b1:condizione", "b1:condizione", "b1:condizione"], stato: testi.statoFinita });
  // «per ogni x in v» con quattro elementi: i controlli con la posizione 0, 1, 2, 3 e 4 (l'ultimo falso).
  expect(await pauseDiF5("per-ogni-vettore.algo")).toEqual({ viste: Array(5).fill("b1:condizione"), stato: testi.statoFinita });
}, 60_000);

test("la forma del «per ogni» scelta nelle Impostazioni arriva al disegno, alla pausa e alla tabella: con la posizione, a parole, chiuso", async () => {
  const nome = "per-ogni-vettore.algo";
  const testo = readFileSync(new URL(nome, CARTELLA2), "utf8");
  /** Le prime pause di F10 nel ciclo (il gruppo segnato nel disegno, con la forma e la fase) e le colonne della tabella. */
  const pause = async (cicliPerOgni: (typeof scelteIniziali)["cicliPerOgni"]) => {
    cleanup();
    await apriLaFinestra(nome, testo, { ...scelteIniziali, cicliPerOgni });
    const viste: string[] = [];
    // I valori iniziali prima del ciclo.
    for (let k = 0; k < 10 && !correnti()[0]?.startsWith("b1"); k++) await premi("F10");
    for (let k = 0; k < 4; k++) {
      viste.push([...document.querySelectorAll("svg g.corrente")].map((g) => `${g.getAttribute("data-forma")} ${g.getAttribute("data-fase") ?? "-"}`).join(","));
      await premi("F10");
    }
    const colonne = [...document.querySelectorAll('th[scope="col"]')].map((th) => th.textContent?.trim() ?? "");
    // Il titolo della colonna è il nome col tipo sotto.
    return { viste, posizione: colonne.some((c) => c.startsWith("_indice")) };
  };
  // Il ciclo b1 su v: la partenza, il controllo, l'elemento preso, il corpo (b2), scritti a mano.
  expect(await pause("posizione")).toEqual({ viste: ["assegnazione inizio", "condizione condizione", "assegnazione elemento", "assegnazione -"], posizione: true });
  expect(await pause("parole")).toEqual({ viste: ["intestazione -", "condizione condizione", "assegnazione elemento", "assegnazione -"], posizione: false });
  expect(await pause("chiuso")).toEqual({ viste: ["intestazione -", "intestazione -", "intestazione -", "assegnazione -"], posizione: false });
}, 60_000);

test("«Animata» si spegne sul punto di un ciclo al primo controllo, non sulla partenza; in pausa la parte della fase va in vista", async () => {
  const nome = "per.algo";
  const p = JSON.parse(readFileSync(new URL(nome, CARTELLA2), "utf8"));
  p.functions[0].body[0].breakpoint = true;
  await apriLaFinestra(nome, JSON.stringify(p, null, 2), { ...scelteIniziali, velocitaAnimata: "veloce" });
  const animata = () => document.querySelector<HTMLButtonElement>('header [data-comando="animata"]');
  await act(async () => {
    fireEvent.click(animata()!);
  });
  await aspetta("l'animata spenta sul punto", () => animata()?.getAttribute("aria-pressed") === "false" && PAUSA.test(statoMostrato()));
  expect(correnti()).toEqual(["b1:condizione"]);
  await act(async () => {
    fireEvent.click(document.querySelector('header [data-comando="ferma"]')!);
  });
  // Lo scorrimento: l'elemento a cui la pausa chiede di andare in vista, fino all'aumento in fondo al corpo.
  const inVista: Element[] = [];
  const prima = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (this: Element) {
    inVista.push(this);
  };
  try {
    for (let k = 0; k < 8 && correnti()[0] !== "b1:passo"; k++) {
      await premi("F10");
      await act(async () => await new Promise((r) => requestAnimationFrame(() => r(undefined))));
    }
    expect(correnti()).toEqual(["b1:passo"]);
    const ultimo = inVista.filter((e) => e.closest("svg")).at(-1);
    expect(`${ultimo?.getAttribute("data-id")}:${ultimo?.getAttribute("data-fase")}`).toBe("b1:passo");
  } finally {
    Element.prototype.scrollIntoView = prima;
  }
}, 60_000);

test("la pausa su un valore iniziale: il suo blocco sotto «Inizio» evidenziato, o «Inizio» coi valori nascosti; le stesse azioni e lo stesso messaggio, col testo del blocco", async () => {
  const nome = "riferimento-media-voti.algo";
  const testo = readFileSync(new URL(nome, CARTELLA), "utf8");
  const attesi = ["contati", "insufficienti", "somma", "i", "j"];
  const visti: Record<string, unknown[]> = {};
  for (const valoriIniziali of ["mostrati", "nascosti"] as const) {
    cleanup();
    await apriLaFinestra(nome, testo, { ...scelteIniziali, valoriIniziali });
    const pause: unknown[] = [];
    for (let k = 0; k < 6; k++) {
      await premi("F10");
      const segnati = [...document.querySelectorAll("svg g.corrente")];
      pause.push({
        stato: statoMostrato(),
        correnti: correnti(),
        // Il segno nel disegno: il gruppo col bordo del blocco corrente (il suo nome o il suo id) e la punta che entra.
        segnato: segnati.map((g) => g.getAttribute("data-valore-iniziale") ?? g.getAttribute("data-id")),
        frecce: document.querySelectorAll("[data-freccia]").length,
        avviso: avviso(),
      });
    }
    visti[valoriIniziali] = pause;
  }
  const messaggio = (testoDelBlocco: string, n: number) => riempi(testi.annuncioPausa, { blocco: riempi(testi.nomeDelBlocco, { genere: testi.bloccoAssegnazione, testo: testoDelBlocco }), n: String(n) });
  const ultima = { stato: riempi(testi.statoInPausa, { n: "6" }), correnti: ["b3"], segnato: ["b3"], frecce: 1 };
  expect(visti.mostrati).toEqual([
    ...attesi.map((d, k) => ({ stato: riempi(testi.statoInPausa, { n: String(k + 1) }), correnti: [pausaSulValoreIniziale(d)], segnato: [d], frecce: 1, avviso: messaggio(`${d} ← 0`, k + 1) })),
    { ...ultima, avviso: (visti.mostrati![5] as { avviso: string }).avviso },
  ]);
  // Coi valori iniziali nascosti: le stesse azioni e gli stessi messaggi, evidenziato «Inizio» (l'id della funzione).
  expect(visti.nascosti).toEqual([
    ...attesi.map((d, k) => ({ stato: riempi(testi.statoInPausa, { n: String(k + 1) }), correnti: ["f1"], segnato: ["f1"], frecce: 1, avviso: messaggio(`${d} ← 0`, k + 1) })),
    { ...ultima, avviso: (visti.mostrati![5] as { avviso: string }).avviso },
  ]);
  // Controllo positivo: il disegno coi valori nascosti non ha i blocchi dei valori iniziali, quello coi valori mostrati sì.
  expect(document.querySelectorAll("[data-valore-iniziale]").length).toBe(0);
});

test("quando il programma aspetta un valore, l'istruzione sta nella console sopra la riga dove si scrive, non sopra il flowchart", async () => {
  const nome = "riferimento-media-voti.algo";
  await apriLaFinestra(nome, readFileSync(new URL(nome, CARTELLA), "utf8"));
  await premi("F5");
  expect(CHIEDE.exec(statoMostrato())?.[1]).toBe("n");
  const istruzione = riempi(testi.annuncioChiede, { dato: "n" });
  const colonna = document.querySelector(`section[aria-label="${testi.colonnaEsecuzione}"]`)!;
  const inColonna = [...colonna.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent === istruzione);
  // L'avviso sopra il flowchart tace; nella console l'istruzione c'è una volta, dopo il registro e prima del campo.
  expect({ avviso: avviso(), nellaConsole: inColonna.length }).toEqual({ avviso: "", nellaConsole: 1 });
  const registro = colonna.querySelector('[role="log"]')!;
  const campo = colonna.querySelector("input")!;
  expect(registro.compareDocumentPosition(inColonna[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(inColonna[0]!.compareDocumentPosition(campo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // Scritto il valore, l'istruzione passa al dato dopo (qui di nuovo «n»: 0 non è fra 1 e 30) e resta una.
  await scrivi("0");
  expect([...colonna.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent === istruzione).length).toBe(1);
});

test("un commento non si esegue: F9 non gli mette un punto di interruzione, l'avviso lo dice e il pulsante non è disponibile", async () => {
  const nome = "riferimento-media-voti.algo";
  await apriLaFinestra(nome, readFileSync(new URL(nome, CARTELLA), "utf8"));
  const punti = () => [...document.querySelectorAll("[data-interruzione]")].map((p) => p.getAttribute("data-interruzione"));
  const pulsante = () => document.querySelector('header [data-comando="punto"]')!;
  const scegliEPremi = async (id: string) => {
    await act(async () => {
      fireEvent.click(document.querySelector(`[data-blocco="${id}"]`)!);
    });
    const disponibile = pulsante().getAttribute("aria-disabled") !== "true";
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "F9" });
    });
    return disponibile;
  };
  // Il commento (b1) del riferimento.
  expect(await scegliEPremi("b1")).toBe(false);
  expect({ punti: punti(), avviso: avviso() }).toEqual({ punti: [], avviso: testi.annuncioPuntoSuUnCommento });
  // Controllo positivo: sul blocco dopo (una lettura) il punto si mette.
  expect(await scegliEPremi("b3")).toBe(true);
  expect(punti()).toEqual(["b3"]);
});

test("un progetto con un errore statico non parte: l'avviso lo dice e la finestra resta ferma", async () => {
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "senza-dato" },
    functions: [{ id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "write", values: ["x"], newline: true }], end: { id: "b2" } }],
  });
  await apriLaFinestra("senza-dato.algo", testo);
  for (const tasto of ["F5", "F10"]) {
    await act(async () => {
      fireEvent.keyDown(document.body, { key: tasto });
    });
    await giro();
    expect({ tasto, avviso: avviso(), stato: statoMostrato() }).toEqual({ tasto, avviso: testi.annuncioNonParte, stato: testi.statoPronto });
  }
});

/** Un programma con un vettore di `n` elementi, che scrive il suo primo elemento. */
const conUnVettore = (n: number) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: `vettore-${n}` },
    functions: [{ id: "f1", kind: "main", data: [{ name: "v", type: "integer", size: n, initial: { each: "7" } }], body: [{ id: "b1", kind: "write", values: ["v[0]"], newline: true }], end: { id: "b2" } }],
  });

test("i limiti delle Impostazioni arrivano all'esecuzione: al limite parte, un elemento oltre no; coi predefiniti nessuno dei due", async () => {
  const limite = tetti.elementiDiUnVettore + 500;
  const scelte = { ...scelteIniziali, limiti: { ...tetti, elementiDiUnVettore: limite } };
  const esiti: string[] = [];
  for (const [n, conLeScelte] of [
    [limite, true],
    [limite + 1, true],
    [limite, false],
  ] as const) {
    await apriLaFinestra(`vettore-${n}.algo`, conUnVettore(n), conLeScelte ? scelte : scelteIniziali);
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "F5" });
    });
    for (let i = 0; i < 50 && statoMostrato() === testi.statoPronto && avviso() !== testi.annuncioNonParte; i++) await giro();
    await aspetta("la fine o il rifiuto", () => statoMostrato() === testi.statoFinita || avviso() === testi.annuncioNonParte);
    esiti.push(`${n} ${conLeScelte ? "scelti" : "predefiniti"}: ${statoMostrato() === testi.statoFinita ? `finita, «${outputMostrato().trim()}»` : "non parte"}`);

    cleanup();
  }
  expect(esiti).toEqual([`${limite} scelti: finita, «7»`, `${limite + 1} scelti: non parte`, `${limite} predefiniti: non parte`]);
});

test("gli errori e gli avvisi del controllo stanno nella descrizione del loro blocco, coi testi dei codici", async () => {
  // Un nome che non è un dato (errore) e un ciclo con la condizione sempre vera (avviso).
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "segni" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "n", type: "integer", initial: "1" }],
        body: [
          { id: "b1", kind: "write", values: ["x"], newline: true },
          { id: "b2", kind: "while", condition: "true", body: [{ id: "b3", kind: "assignment", target: "n", value: "n + 1" }] },
        ],
        end: { id: "b4" },
      },
    ],
  });
  const p = progettoDi(testo);
  const { controlla } = await import("../../core/controllo/controllo");
  const c = controlla(p, tetti);
  if (c.fuoriTappa) throw new Error("fuori tappa");
  const attese = new Map<string, string[]>();
  const aggiungi = (b: string, t: string) => attese.set(b, [...(attese.get(b) ?? []), t]);
  // Il testo è quello della causa, se il controllo la sa (la condizione sempre vera), altrimenti quello del codice.
  const scritto = (s: { code: string; block: string }) =>
    testoDellaSegnalazione("it", s.code as Codice, false, c.fermate.find((f) => f.code === s.code && f.block === s.block)?.fermata);
  for (const e of c.errori) aggiungi(e.block, riempi(testi.segnalazioneErrore, scritto(e)));
  for (const a of c.avvisi) aggiungi(a.block, riempi(testi.segnalazioneAvviso, scritto(a)));
  // Controllo positivo: il progetto ha davvero un errore e un avviso su blocchi, e l'avviso ha la sua causa.
  expect(c.errori.length > 0 && c.avvisi.length > 0).toBe(true);
  expect(c.fermate.map((f) => f.fermata.causa)).toEqual(["sempre_vera"]);
  await apriLaFinestra("segni.algo", testo);
  const viste = new Map(
    [...document.querySelectorAll("[data-blocco][aria-describedby]")].map((b) => [b.getAttribute("data-blocco")!, document.getElementById(b.getAttribute("aria-describedby")!)?.textContent ?? ""]),
  );
  expect(Object.fromEntries(viste)).toEqual(Object.fromEntries([...attese].map(([b, t]) => [b, t.join(" ")])));
  for (const e of c.errori) expect(document.querySelector(`[data-blocco="${e.block}"]`)?.getAttribute("aria-invalid")).toBe("true");
});

// ------------------------------------------------------------------- la console e il suggerimento

/** Un programma scritto qui: un ciclo di `giri` giri che scrive `testo` (con o senza a capo). */
const cheScrive = (giri: number, testo: string, aCapo: boolean) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "scrive" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "i", type: "integer", initial: "0" }],
        body: [{ id: "b1", kind: "while", condition: `i < ${giri}`, body: [{ id: "b2", kind: "write", values: [testo], newline: aCapo }, { id: "b3", kind: "assignment", target: "i", value: "i + 1" }] }],
        end: { id: "b4" },
      },
    ],
  });

test("l'errore della memoria, che il corpus non raggiunge: nella console col suggerimento del suo codice", async () => {
  // Il motore che non riesce più ad allungare un testo, alla terza scrittura (come nella prova del nucleo).
  const scriveVero = Traccia.prototype.scrive;
  let scritture = 0;
  Traccia.prototype.scrive = function (this: Traccia, testo: string) {
    if (++scritture === 3) throw new RangeError("Invalid string length");
    scriveVero.call(this, testo);
  };
  try {
    await apriLaFinestra("memoria.algo", cheScrive(10, '"ciao"', true));
    await premi("F5");
    await aspetta("l'errore", () => statoMostrato() === testi.statoFermataDaUnErrore);
  } finally {
    Traccia.prototype.scrive = scriveVero;
  }
  expect(await suggerimentoDellaSpiegazione(testi.spiegazione)).toEqual([testi.consoleSuggerimento, testiDeiCodici.it.out_of_memory.suggerimento]);
  expect(document.querySelector('[role="log"]')?.textContent).toContain(testiDeiCodici.it.out_of_memory.accaduto);
}, 60_000);

test("in inglese il suggerimento ha il titolo e il testo del codice in inglese", async () => {
  const nome = "troppi-passi.algo";
  await apriLaFinestra(nome, readFileSync(new URL(nome, CARTELLA), "utf8"), scelteIniziali, "en");
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "F5" });
  });
  await aspetta("l'errore", () => statoMostrato() === en.statoFermataDaUnErrore);
  expect(await suggerimentoDellaSpiegazione(en.spiegazione)).toEqual([en.consoleSuggerimento, testiDeiCodici.en.too_many_steps.suggerimento]);
}, 120_000);

test("sopra la console, quante righe il nucleo non tiene più; senza righe tolte nessuna", async () => {
  await apriLaFinestra("poche.algo", cheScrive(5, '"riga"', true));
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  expect(document.querySelector("[data-tolte-console]")?.outerHTML ?? null).toBeNull();
  cleanup();
  await apriLaFinestra("tante.algo", cheScrive(1500, '"riga"', true));
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  expect(document.querySelector("[data-tolte-console]")?.textContent).toBe(riempi(testi.consoleTolte, { n: "500" }));
  expect(document.querySelectorAll('[role="log"] [data-scrive]').length).toBe(1000);
  // Una riga sola tolta: la frase al singolare.
  cleanup();
  await apriLaFinestra("una-in-piu.algo", cheScrive(1001, '"riga"', true));
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  expect(document.querySelector("[data-tolte-console]")?.textContent).toBe(testi.consoleTolta);
}, 60_000);

test("un evento si annuncia una volta: in pausa una sola regione di stato parla, l'avviso", async () => {
  await apriLaFinestra("riferimento-media-voti.algo", readFileSync(new URL("riferimento-media-voti.algo", CARTELLA), "utf8"));
  // Le regioni che un lettore di schermo legge da sé quando cambiano: gli `output` (ruolo implicito di stato) e i ruoli
  // di stato espliciti, se non sono spenti.
  const cheParlano = () =>
    [...document.querySelectorAll<HTMLElement>('output, [role="status"]')]
      .filter((e) => (e.getAttribute("role") ?? "status") === "status" && e.getAttribute("aria-live") !== "off" && (e.textContent ?? "") !== "")
      .map((e) => e.textContent);
  await premi("F10");
  // Controllo positivo della premessa: l'avviso dice la pausa, e lo stato nella riga di stato c'è.
  expect(avviso()).toContain(riempi(testi.annuncioPausa, { blocco: "", n: "1" }).slice(-"(azione 1).".length));
  expect(statoMostrato()).toBe(riempi(testi.statoInPausa, { n: "1" }));
  expect(cheParlano()).toEqual([avviso()]);
}, 60_000);

test("a esecuzione finita, modificando il progetto la riga dell'errore nella console resta quella dell'esecuzione", async () => {
  // Una somma senza valore iniziale: l'errore è sul blocco «s ← s + 1».
  const testo = JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "senza-valore" },
    functions: [{ id: "f1", kind: "main", data: [{ name: "s", type: "integer" }], body: [{ id: "b1", kind: "assignment", target: "s", value: "s + 1" }], end: { id: "b2" } }],
  });
  await apriLaFinestra("senza-valore.algo", testo);
  await premi("F5");
  await aspetta("l'errore", () => statoMostrato() === testi.statoFermataDaUnErrore);
  const rigaDellErrore = () => document.querySelector('[role="log"]')?.firstElementChild?.textContent ?? "";
  const prima = rigaDellErrore();
  // Controllo positivo della premessa: la riga nomina il blocco, non la fine.
  expect(prima).toContain("s ← s + 1");
  // Il blocco tolto dal flowchart (a esecuzione finita il progetto si modifica): la riga resta quella.
  const b1 = document.querySelector('[data-blocco="b1"]')!;
  await act(async () => {
    fireEvent.click(b1);
  });
  await act(async () => {
    fireEvent.keyDown(b1, { key: "Delete" });
  });
  await giro();
  expect(document.querySelector('[data-blocco="b1"]')?.outerHTML ?? null).toBeNull();
  expect(rigaDellErrore()).toBe(prima);
}, 60_000);

test("una riga lunga, col modo e i caratteri delle Impostazioni: a capo da sola, o la sua fine dopo «…»", async () => {
  // 30 scritture di «abcde» senza a capo: una riga di 150 caratteri, coi caratteri per riga a 50.
  const testo = cheScrive(30, '"abcde"', false);
  await apriLaFinestra("lunga.algo", testo, { ...scelteIniziali, caratteriPerRiga: 50 });
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  const righe = () => [...document.querySelectorAll('[role="log"] [data-scrive]')].map((e) => e.parentElement!.textContent);
  expect(righe()).toEqual(["abcde".repeat(10), "abcde".repeat(10), "abcde".repeat(10)]);
  cleanup();
  await apriLaFinestra("lunga.algo", testo, { ...scelteIniziali, caratteriPerRiga: 50, righeLunghe: "la-fine" });
  await premi("F5");
  await aspetta("la fine", () => statoMostrato() === testi.statoFinita);
  expect(righe()).toEqual([`…${"abcde".repeat(10)}`]);
  // Ciò che si vede è il testo scritto dal programma: il «…» non ne fa parte (l'output intero lo prova il nucleo).
  expect(outputMostrato()).toBe("abcde".repeat(10));
}, 60_000);
