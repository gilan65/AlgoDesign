// Un caso d'uso eseguito nella colonna, sotto happy-dom: la finestra vera (`Applicazione`), col file dato all'avvio da un
// guscio simulato, e i clic e i tasti come li dà l'utente.
//
// - «Passo passo» su un caso: F10 fa le pause del nucleo con le voci del caso date alle letture, mai una riga chiesta; le
//   pause del programma di riferimento sono la sequenza scritta a mano (`atteso-del-riferimento.ts`), e una sequenza con
//   un blocco cambiato le trova diverse; le voci sono righe lette della console; alla fine l'esito è nella console (in
//   fondo), nell'avviso, nel pallino del caso, e sotto il caso ci sono le differenze, con la scheda dei casi aperta.
// - «Passo passo» sul caso di una funzione e di una procedura (riferimento della tappa 3): le pause scritte a mano, il
//   parametro come riga letta, nella pila la funzione sola; su ogni caso delle funzioni importate da una libreria
//   (`importazione-dalla-libreria`): l'esito campo per campo è quello del nucleo, e il nucleo scrive le righe della riga
//   di comando (eseguita come processo a parte); la prima pausa, sul valore iniziale di una costante comune che la scheda
//   della funzione non disegna, accende il suo «Inizio».
// - «Esegui» su un caso coi punti di interruzione: si ferma dove si fermerebbe F5, e F5 prosegue.
// - I limiti delle Impostazioni arrivano al caso eseguito nella colonna: al limite parte ed è raggiunto, un elemento
//   oltre non parte e l'esito è l'errore statico (nominato su «Inizio»), coi limiti predefiniti non parte nemmeno al
//   limite scelto.
// - L'esito viene dal nucleo, non dall'output mostrato: un caso con l'output giusto e un errore che non attende è non
//   raggiunto. «Attendi questo errore» scrive nell'atteso l'errore ottenuto: il caso non si riesegue da sé (il pallino
//   giallo dice di eseguirlo di nuovo), eseguito è raggiunto; Annulla toglie l'errore atteso e riaccende l'esito di prima.
//   «Togli l'errore atteso», per un errore atteso che non arriva. «Scrivi gli avvisi» per un caso raggiunto con avvisi
//   diversi. I comandi del caso stanno sulla sua riga, in un gruppo prima del pallino.
//
// Che cosa NON guarda:
// - l'aspetto, lo scorrimento della console e i tempi (happy-dom non disegna: li guardano i motori, `e2e/casi.e2e.ts`);
// - il confronto dell'esito con la riga di comando campo per campo (lo fa `casi.test.tsx` su tutto il corpus, con lo
//   stesso esecutore);
// - una lettura chiesta nella console durante un caso: non deve esserci, e la prova lo dice solo per i casi che esegue;
// - l'inglese dei testi nuovi (lo guarda la prova dei dizionari: le stesse chiavi, nessuna vuota);
// - un lettore di schermo vero: i nomi si leggono dagli attributi.

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eseguiCaso } from "../../core/casi/esecutore";
import { tetti } from "../../core/controllo/controllo";
import { apri } from "../../core/progetto/formato";
import { righeDellEsito } from "../../strumenti/righe-dei-casi";
import { pausaSulValoreIniziale, sequenzaAttesa } from "../../core/esecuzione/atteso-del-riferimento";
import { testiDeiCodici } from "../../i18n/codici";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali, type Scelte } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const codici = testiDeiCodici.it;
const delCorpus = (nome: string) => readFileSync(new URL(`../../casi/tappa-1/${nome}`, import.meta.url), "utf8");

/** Il file che il guscio simulato dà all'avvio. */
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
      case "scrivi_preferenze":
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
afterEach(() => cleanup());

/** Un giro dell'interfaccia: i fotogrammi (qui `setImmediate`) e gli aggiornamenti di React. */
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
const statoMostrato = () => document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";
const istante = () => `${statoMostrato()} · ${document.querySelector('[role="log"]')?.childElementCount ?? 0}`;
const clic = (e: Element) => act(async () => void fireEvent.click(e));

async function aspetta(cosa: string, fatto: () => boolean, giri = 20_000): Promise<void> {
  for (let i = 0; i < giri; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (stato «${statoMostrato()}», avviso «${avviso()}»)`);
}

async function apriLaFinestra(nome: string, testo: string, scelte: Scelte = scelteIniziali): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelte} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(testi.apertoIl, { file: nome }));
}

/** Il blocco corrente letto dagli ausili; il valore iniziale di un dato come lo scrive la sequenza attesa. */
const correnti = () =>
  [...document.querySelectorAll('[aria-current="step"]')].map((e) => {
    const dato = e.getAttribute("data-iniziale-di");
    return dato !== null ? pausaSulValoreIniziale(dato) : (e.getAttribute("data-blocco") ?? e.getAttribute("data-fine") ?? "?");
  });
const outputMostrato = () => [...document.querySelectorAll('[role="log"] [data-scrive]')].map((e) => e.textContent).join("");
/** Le righe lette della console (quelle che non sono scritte dal programma, né la fine). */
const righeLette = () => [...document.querySelectorAll('[role="log"] > span')].filter((s) => s.querySelector("[data-scrive]") === null && !s.hasAttribute("data-esito-del-caso") && s.className.includes("letto")).map((s) => s.textContent?.trimEnd());
/** Una riga chiesta nella console: il campo dove scrivere un valore. */
const chiesta = () => [...document.querySelectorAll("label")].some((l) => l.textContent?.startsWith("Valore di") === true);
const esitoNellaConsole = () => document.querySelector('[role="log"] [data-esito-del-caso]')?.textContent ?? null;
const pallino = (i: number) => document.querySelector(`tr[data-caso="${i}"] [data-esito]`)?.getAttribute("data-esito") ?? "?";
const differenze = () => document.querySelector("[data-differenze]");
/** Il testo mostrato in un riquadro dell'output, senza i segni che non ne fanno parte (gli a capo resi visibili, «(niente)»). */
function testoMostrato(e: Element | null): string {
  if (!e) return "?";
  const copia = e.cloneNode(true) as Element;
  for (const s of copia.querySelectorAll("[data-segno-testo]")) s.remove();
  return copia.textContent ?? "";
}
const pulsante = (testo: string, dentro: ParentNode = document) => [...dentro.querySelectorAll("button")].find((b) => b.textContent === testo);

async function vaiAiCasi(): Promise<void> {
  const l = [...document.querySelectorAll('[role="tab"]')].find((t) => /^Casi d'uso \(\d+\)$/.test(t.textContent ?? ""));
  expect(l, "la scheda dei casi d'uso non c'è").toBeDefined();
  await clic(l!);
}

/** «Esegui» o «Passo passo» sulla riga del caso. */
async function eseguiIlCaso(indice: number, passoPasso: boolean): Promise<void> {
  await vaiAiCasi();
  const riga = document.querySelector(`tr[data-caso="${indice}"]`)!;
  const comando = riga.querySelector(`[data-esegui-caso="${passoPasso ? "passo" : "tutto"}"]`);
  const nome = riga.querySelector("[data-nome-caso]")?.textContent ?? "";
  expect(comando?.getAttribute("aria-label"), "il comando non è sulla riga del caso").toBe(riempi(passoPasso ? testi.casoPassoPassoIl : testi.casoEseguiIl, { nome }));
  // Il gruppo dei due comandi viene prima del pallino.
  expect([...riga.children].map((c) => (c.querySelector("[data-esegui-caso]") ? "comandi" : c.hasAttribute("data-esito") ? "pallino" : "altro"))).toEqual(["altro", "altro", "comandi", "pallino"]);
  const prima = istante();
  await clic(comando!);
  await aspetta("l'effetto del comando", () => (istante() !== prima || avviso() !== "") && !statoMostrato().startsWith(testi.statoInCorso));
}

/** Un tasto premuto, poi i giri finché la finestra cambia. */
async function premi(tasto: string): Promise<void> {
  const prima = istante();
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: tasto });
  });
  await aspetta(`l'effetto di ${tasto}`, () => istante() !== prima && !statoMostrato().startsWith(testi.statoInCorso));
}

const PAUSA = new RegExp(`^${riempi(testi.statoInPausa, { n: "(\\d+)" })}$`);
const finita = () => statoMostrato() === testi.statoFinita || statoMostrato() === testi.statoFermataDaUnErrore;

// ------------------------------------------------------------------------------------------------- passo passo

test("«Passo passo» su un caso: le pause del nucleo con le voci del caso, mai una riga chiesta; alla fine l'esito nella console, nell'avviso e nel pallino", async () => {
  const testo = delCorpus("riferimento-media-voti.algo");
  const caso = (JSON.parse(testo) as { test_cases: { name: string; inputs: { data: string; text: string }[]; expected: { output: string } }[] }).test_cases[0]!;
  await apriLaFinestra("riferimento-media-voti.algo", testo);
  await eseguiIlCaso(0, true);
  const visti: string[] = [];
  const sbagli: string[] = [];
  let chieste = 0;
  for (let giri = 0; giri < 1000; giri++) {
    if (chiesta()) chieste++;
    const pausa = PAUSA.exec(statoMostrato());
    if (!pausa) break;
    const ids = correnti();
    if (ids.length !== 1) sbagli.push(`azione ${pausa[1]}: correnti ${JSON.stringify(ids)}`);
    visti.push(ids[0] ?? "?");
    await premi("F10");
  }
  const nome = caso.name;
  console.log(`passo passo sul caso «${nome}»: ${visti.length} pause su ${sequenzaAttesa.length} attese, righe chieste ${chieste}, righe lette ${righeLette().length}`);
  expect({ visti, sbagli, chieste, stato: statoMostrato() }).toEqual({ visti: sequenzaAttesa, sbagli: [], chieste: 0, stato: testi.statoFinita });
  // Controllo positivo: un blocco cambiato nella sequenza attesa la rende diversa da quella vista.
  const alterato = [...sequenzaAttesa];
  alterato[20] = "b8";
  expect(visti).not.toEqual(alterato);

  // Le voci come righe lette, l'output del caso, l'esito in fondo alla console, nell'avviso e nel titolo della console.
  expect(righeLette()).toEqual(caso.inputs.map((v) => v.text));
  expect(outputMostrato()).toBe(caso.expected.output);
  const raggiunto = riempi(testi.esitoDelCasoRaggiunto, { nome });
  expect({ console: esitoNellaConsole(), avviso: avviso(), ultimo: document.querySelector('[role="log"]')?.lastElementChild?.hasAttribute("data-esito-del-caso") }).toEqual({ console: raggiunto, avviso: raggiunto, ultimo: true });
  expect([...document.querySelectorAll("h2")].some((h) => h.textContent === riempi(testi.consoleDelCaso, { nome }))).toBe(true);
  // La scheda dei casi aperta, il pallino verde, sotto il caso le differenze del nucleo.
  expect({ scheda: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent, pallino: pallino(0), differenze: differenze()?.getAttribute("data-esito") }).toEqual({
    scheda: "Casi d'uso (1)",
    pallino: "raggiunto",
    differenze: "raggiunto",
  });
});

/** La scheda di una procedura o di una funzione, dall'elenco. */
async function mostraLaFunzione(id: string): Promise<void> {
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector(`[data-elenco] [data-voce-funzione="${id}"]`)!);
  await giro();
}

/** F10 dalla prima pausa fino alla fine: i blocchi correnti di ogni pausa, quelli sbagliati, le righe chieste. */
async function passoPassoFinoAllaFine(): Promise<{ visti: string[]; sbagli: string[]; chieste: number }> {
  const visti: string[] = [];
  const sbagli: string[] = [];
  let chieste = 0;
  for (let giri = 0; giri < 1000; giri++) {
    if (chiesta()) chieste++;
    const pausa = PAUSA.exec(statoMostrato());
    if (!pausa) break;
    // Nel disegno un blocco solo; nella pila «Dove sei» la funzione eseguita da sola.
    const ids = correnti().filter((_, i) => [...document.querySelectorAll('[aria-current="step"]')][i]?.tagName !== "BUTTON");
    const pila = [...document.querySelectorAll('button[aria-current="step"]')].map((b) => b.textContent);
    if (ids.length !== 1 || pila.length !== 1) sbagli.push(`azione ${pausa[1]}: correnti ${JSON.stringify(ids)}, pila ${JSON.stringify(pila)}`);
    visti.push(ids[0] ?? "?");
    await premi("F10");
  }
  return { visti, sbagli, chieste };
}

test("«Passo passo» sul caso di una funzione e di una procedura del riferimento della tappa 3: le pause scritte a mano, i parametri come righe lette, l'esito", async () => {
  const testo = readFileSync(new URL("../../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url), "utf8");
  // Scritte a mano dal flowchart: `valido` (corpo vuoto) ha la sola azione della sua fine, che restituisce; `stelle` con
  // quante = 3 il valore iniziale di k, tre giri del ciclo (condizione, scrittura, assegnazione), la condizione falsa,
  // l'a capo, la fine. Il parametro è una riga letta, prima della prima azione.
  const attese = {
    valido: { pause: ["b22"], lette: ["7"], output: "→ true\n" },
    stelle: { pause: ["valore iniziale di k", ...Array.from({ length: 3 }, () => ["b23", "b24", "b25"]).flat(), "b23", "b26", "b27"], lette: ["3"], output: "***\n" },
  };
  const visti: Record<string, unknown> = {};
  for (const [nome, id] of [
    ["valido", "f3"],
    ["stelle", "f4"],
  ] as const) {
    await apriLaFinestra("riferimento-media-voti-funzioni.algo", testo);
    await mostraLaFunzione(id);
    await eseguiIlCaso(0, true);
    const { visti: pause, sbagli, chieste } = await passoPassoFinoAllaFine();
    expect({ nome, sbagli, chieste, stato: statoMostrato(), pallino: pallino(0) }).toEqual({ nome, sbagli: [], chieste: 0, stato: testi.statoFinita, pallino: "raggiunto" });
    visti[nome] = { pause, lette: righeLette(), output: outputMostrato() };
    cleanup();
  }
  console.log(`passo passo sui casi delle funzioni: ${JSON.stringify(visti)}`);
  expect(visti).toEqual(attese);
  // Controllo positivo: un blocco cambiato nella sequenza scritta la rende diversa da quella vista.
  expect(visti).not.toEqual({ ...attese, stelle: { ...attese.stelle, pause: attese.stelle.pause.map((b) => (b === "b26" ? "b25" : b)) } });
}, 120_000);

test("«Passo passo» su ogni caso delle funzioni importate da una libreria: l'esito è quello della riga di comando, campo per campo", async () => {
  const percorso = fileURLToPath(new URL("../../casi/tappa-3/importazione-dalla-libreria.algo", import.meta.url));
  const testo = readFileSync(percorso, "utf8");
  const aperto = apri(testo);
  if (!aperto.ok) throw new Error("importazione-dalla-libreria");
  const p = aperto.progetto;
  // Le importate: quelle che il progetto ha in più del riferimento della tappa 3 da cui l'importazione è partita.
  const delRiferimento = new Set(["leggi_numero", "valido", "stelle"]);
  const importate = p.functions.filter((f) => f.kind !== "main" && !delRiferimento.has(f.name!) && (f.test_cases?.length ?? 0) > 0);
  // La riga di comando, in un processo a parte: le righe di ogni caso.
  const cli = Bun.spawnSync(["bun", "strumenti/casi.ts", percorso], { cwd: fileURLToPath(new URL("../../", import.meta.url)), stdout: "pipe", stderr: "pipe" }).stdout.toString();
  const diversi: string[] = [];
  let casi = 0;
  let pause = 0;
  /** «Passo passo» sul caso `i` di `f` nel file `t`, fino alla fine: ciò che la finestra mostra contro il nucleo. */
  async function nellaFinestra(t: string, q: typeof p, f: (typeof importate)[number], i: number, id: string): Promise<{ readonly raggiunto: boolean }> {
    const caso = q.functions.find((x) => x.id === f.id)!.test_cases![i]!;
    const nucleo = eseguiCaso(q, caso, tetti, f.id);
    if (nucleo.fuoriTappa) throw new Error(`${id} fuori tappa`);
    await apriLaFinestra("importazione-dalla-libreria.algo", t);
    await mostraLaFunzione(f.id);
    await eseguiIlCaso(i, true);
    const { visti, sbagli, chieste } = await passoPassoFinoAllaFine();
    pause += visti.length;
    // La prima azione è il valore iniziale della costante comune, che nella scheda della funzione non è disegnato:
    // corrente è il suo «Inizio».
    if (visti[0] !== f.id) diversi.push(`${id}: la prima pausa è su ${visti[0]}, non sull'«Inizio» di ${f.name}`);
    await aspetta("l'esito", () => pallino(i) !== "mai");
    const campi = [...(differenze()?.querySelectorAll("[data-campo]") ?? [])].map((c) => {
      const campo = c.getAttribute("data-campo")!;
      const leggi = (sel: string) => (campo === "output" ? testoMostrato(c.querySelector(sel)) : (c.querySelector(sel)?.getAttribute("data-segnalazione") ?? "?"));
      return { campo, atteso: leggi("[data-atteso]"), ottenuto: leggi("[data-ottenuto]") };
    });
    const mostrato = { pallino: pallino(i), campi, sbagli, chieste };
    const atteso = { pallino: nucleo.raggiunto ? "raggiunto" : "non-raggiunto", campi: nucleo.differenze.map(({ campo, atteso, ottenuto }) => ({ campo, atteso, ottenuto })), sbagli: [], chieste: 0 };
    if (JSON.stringify(mostrato) !== JSON.stringify(atteso)) diversi.push(`${id}: finestra ${JSON.stringify(mostrato)}, nucleo ${JSON.stringify(atteso)}`);
    cleanup();
    return { raggiunto: nucleo.raggiunto };
  }
  for (const f of importate) {
    for (const [i, caso] of f.test_cases!.entries()) {
      casi++;
      const id = `${percorso}#${f.name}/${caso.name}`;
      // Il nucleo e la riga di comando dicono le stesse righe.
      const nucleo = eseguiCaso(p, caso, tetti, f.id);
      const righe = nucleo.fuoriTappa ? [] : righeDellEsito(id, nucleo).righe;
      if (!righe.every((r) => cli.split(/\r?\n/).includes(r))) diversi.push(`${id}: la riga di comando non scrive ${JSON.stringify(righe)}`);
      await nellaFinestra(testo, p, f, i, id);
    }
  }
  // Un caso non raggiunto (l'output atteso alterato, in una copia): il pallino e le differenze sono quelli del nucleo, non
  // un «raggiunto» o un riquadro vuoto fissi.
  const alterato = JSON.parse(testo);
  const delPrimo = alterato.functions.find((x: { id: string }) => x.id === importate[0]!.id);
  delPrimo.test_cases[0].expected.output += "in più\n";
  const testoAlterato = JSON.stringify(alterato, null, 2);
  const q = apri(testoAlterato);
  if (!q.ok) throw new Error("la copia alterata non si apre");
  const nonRaggiunto = await nellaFinestra(testoAlterato, q.progetto, importate[0]!, 0, `${percorso} alterato#${importate[0]!.name}`);
  console.log(`passo passo sui casi delle funzioni importate: funzioni ${importate.length} (${importate.map((f) => f.name).join(", ")}), casi ${casi}, pause ${pause}, diversi ${diversi.length}`);
  expect(diversi).toEqual([]);
  // Le premesse: le cinque importate coi loro sette casi, le pause, e il caso alterato che davvero non è raggiunto.
  expect({ funzioni: importate.length, casi, nonRaggiunto: nonRaggiunto.raggiunto }).toEqual({ funzioni: 5, casi: 7, nonRaggiunto: false });
  expect(pause).toBeGreaterThan(casi);
}, 300_000);

test("«Esegui» su un caso coi punti di interruzione: si ferma dove si fermerebbe F5, e F5 prosegue fino alla fine", async () => {
  const p = JSON.parse(delCorpus("riferimento-media-voti.algo"));
  // Il punto di interruzione sul blocco degli asterischi (b19), scritto nel file come lo scrive «Salva».
  const conPunto = JSON.stringify(p, (k, v) => (v && typeof v === "object" && !Array.isArray(v) && v.id === "b19" ? { ...v, breakpoint: true } : v));
  expect(conPunto).toContain('"breakpoint":true');
  await apriLaFinestra("con-un-punto.algo", conPunto);
  await eseguiIlCaso(0, false);
  const fermate: string[] = [];
  for (let giri = 0; giri < 100; giri++) {
    const pausa = PAUSA.exec(statoMostrato());
    if (!pausa) break;
    fermate.push(`${pausa[1]} ${correnti().join(",")}`);
    await premi("F5");
  }
  const attese = sequenzaAttesa.flatMap((b, i) => (b === "b19" ? [`${i + 1} b19`] : []));
  expect({ fermate, stato: statoMostrato(), esito: esitoNellaConsole() }).toEqual({ fermate: attese, stato: testi.statoFinita, esito: riempi(testi.esitoDelCasoRaggiunto, { nome: p.test_cases[0].name }) });
  expect(attese.length).toBe(7);
});

// ---------------------------------------------------------------------------------------------------- i limiti

const conUnVettore = (n: number) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: `vettore-${n}` },
    functions: [{ id: "f1", kind: "main", data: [{ name: "v", type: "integer", size: n, initial: { each: "7" } }], body: [{ id: "b1", kind: "write", values: ["v[0]"], newline: true }], end: { id: "b2" } }],
    test_cases: [{ name: "il primo", inputs: [], expected: { output: "7\n" } }],
  });

test("i limiti delle Impostazioni arrivano al caso eseguito nella colonna: al limite raggiunto, un elemento oltre l'errore statico; coi predefiniti nemmeno al limite", async () => {
  const limite = tetti.elementiDiUnVettore + 500;
  const scelte = { ...scelteIniziali, limiti: { ...tetti, elementiDiUnVettore: limite } };
  const statico = riempi(testi.diffSegnalazione, { breve: codici.limit_exceeded.breve, dove: testi.disegnoInizio });
  const esiti: string[] = [];
  for (const [n, conLeScelte] of [
    [limite, true],
    [limite + 1, true],
    [limite, false],
  ] as const) {
    await apriLaFinestra(`vettore-${n}.algo`, conUnVettore(n), conLeScelte ? scelte : scelteIniziali);
    await eseguiIlCaso(0, false);
    await aspetta("l'esito del caso", () => pallino(0) !== "mai");
    const ottenuto = differenze()?.querySelector('[data-campo="static_error"] [data-ottenuto]')?.textContent ?? "nessuno";
    esiti.push(`${n} ${conLeScelte ? "scelti" : "predefiniti"}: ${pallino(0)}, colonna ${document.querySelector('[role="log"]') ? "aperta" : "chiusa"}, errore statico ${ottenuto}`);
    cleanup();
  }
  expect(esiti).toEqual([
    `${limite} scelti: raggiunto, colonna aperta, errore statico nessuno`,
    `${limite + 1} scelti: non-raggiunto, colonna chiusa, errore statico ${statico}`,
    `${limite} predefiniti: non-raggiunto, colonna chiusa, errore statico ${statico}`,
  ]);
});

/** Le Impostazioni dalla barra: `fa` nella finestra aperta, poi «Conferma». */
async function nelleImpostazioni(fa: (finestra: HTMLElement) => void): Promise<void> {
  await clic(screen.getByRole("button", { name: testi.impostazioni }));
  const finestra = screen.getByRole("dialog", { name: testi.impostazioniTitolo });
  await act(async () => fa(finestra));
  await clic(within(finestra).getByRole("button", { name: testi.progettoConferma }));
  await aspetta("le Impostazioni chiuse", () => document.querySelector('[role="dialog"][data-state="open"]') === null);
}

test("«Esegui tutti» coi limiti delle Impostazioni; un'altra scelta confermata non rende vecchio l'esito, un limite cambiato sì", async () => {
  // Un limite scelto più basso del predefinito, un vettore di un elemento oltre: coi limiti scelti il caso non parte,
  // coi predefiniti sarebbe raggiunto.
  const limite = 10;
  await apriLaFinestra(`vettore-${limite + 1}.algo`, conUnVettore(limite + 1), { ...scelteIniziali, limiti: { ...tetti, elementiDiUnVettore: limite } });
  await vaiAiCasi();
  await clic(pulsante(testi.eseguiTutti)!);
  await aspetta("l'esito di «Esegui tutti»", () => pallino(0) !== "mai" && document.querySelector("[data-avanzamento]") === null);
  const dopoTutti = pallino(0);
  // I colori del disegno: i limiti restano quelli, l'esito resta attuale.
  await nelleImpostazioni((f) => fireEvent.click(within(f).getByRole("radio", { name: testi.coloriContrasto })));
  await vaiAiCasi();
  const dopoIColori = pallino(0);
  // Controllo positivo: un limite cambiato rende vecchio l'esito.
  await nelleImpostazioni((f) => fireEvent.change(f.querySelector('[data-limite="elementiDiUnVettore"]')!, { target: { value: String(limite + 1) } }));
  await vaiAiCasi();
  expect([dopoTutti, dopoIColori, pallino(0)]).toEqual(["non-raggiunto", "non-raggiunto", "da-rieseguire"]);
});

// -------------------------------------------------------------------------------------------- dall'esito all'atteso

/** Il file del corpus col caso cambiato. */
function conIlCaso(nome: string, cambia: (c: { expected: Record<string, unknown> }) => void): string {
  const p = JSON.parse(delCorpus(nome));
  cambia(p.test_cases[0]);
  return JSON.stringify(p);
}
/** Le righe dell'atteso che i campi del caso mostrano (l'errore, gli avvisi), aprendoli e chiudendoli. */
async function attesoNeiCampi(indice: number): Promise<string[]> {
  const riga = document.querySelector(`tr[data-caso="${indice}"]`)!;
  await act(async () => void fireEvent.doubleClick(riga));
  const campi = document.querySelector("[data-campi-caso]");
  const righe = [...(campi?.querySelectorAll("p") ?? [])].map((p) => p.textContent ?? "").filter((t) => /^(Il programma deve|Il progetto non deve|Avvisi attesi)/.test(t));
  await act(async () => void fireEvent.keyDown(campi!, { key: "Escape" }));
  return righe;
}
async function annulla(): Promise<void> {
  await act(async () => void fireEvent.keyDown(document.body, { key: "z", ctrlKey: true }));
  await giro();
}

test("l'esito è del nucleo: l'output giusto con un errore non atteso è non raggiunto; «Attendi questo errore» lo scrive nell'atteso e il caso resta da eseguire, Annulla lo toglie, eseguito su richiesta è raggiunto", async () => {
  // La divisione per zero senza l'errore atteso: l'output (vuoto) è quello atteso, l'errore no.
  const testo = conIlCaso("divisione-per-zero.algo", (c) => delete c.expected.error);
  await apriLaFinestra("divisione-per-zero.algo", testo);
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  const nome = (JSON.parse(testo) as { test_cases: { name: string }[] }).test_cases[0]!.name;
  expect({ console: esitoNellaConsole(), pallino: pallino(0) }).toEqual({ console: riempi(testi.esitoDelCasoNonRaggiunto, { nome, quante: testi.diffUna }), pallino: "non-raggiunto" });
  const errore = riempi(testi.diffSegnalazione, { breve: codici.division_by_zero.breve, dove: "Assegnazione: q ← a / b" });
  expect(differenze()?.querySelector('[data-campo="error"] [data-ottenuto]')?.textContent).toBe(errore);

  await clic(pulsante(testi.attendiErrore, differenze()!)!);
  await giro();
  expect(avviso()).toBe(riempi(testi.annuncioAttendiErrore, { nome }));
  // Il caso non si riesegue da sé: giallo, nessuna differenza mostrata; l'atteso ha l'errore.
  expect({ pallino: pallino(0), differenze: differenze()?.outerHTML ?? null }).toEqual({ pallino: "da-rieseguire", differenze: null });
  expect(await attesoNeiCampi(0)).toEqual([riempi(testi.casoErroreAtteso, { breve: codici.division_by_zero.breve, dove: "Assegnazione: q ← a / b" })]);
  // Annulla: l'atteso di prima, e l'esito di prima torna attuale.
  await annulla();
  expect({ campi: await attesoNeiCampi(0), pallino: pallino(0) }).toEqual({ campi: [], pallino: "non-raggiunto" });
  // Ripeti, ed eseguito su richiesta: raggiunto.
  await act(async () => void fireEvent.keyDown(document.body, { key: "y", ctrlKey: true }));
  await giro();
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  expect({ pallino: pallino(0), console: esitoNellaConsole() }).toEqual({ pallino: "raggiunto", console: riempi(testi.esitoDelCasoRaggiunto, { nome }) });
});

test("«Togli l'errore atteso» per un errore che non arriva più; «Scrivi gli avvisi» per un caso raggiunto con avvisi diversi", async () => {
  // Un errore atteso che il programma non dà.
  await apriLaFinestra("scrittura-intero.algo", conIlCaso("scrittura-intero.algo", (c) => (c.expected.error = { code: "division_by_zero", block: "b1" })));
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  expect(pallino(0)).toBe("non-raggiunto");
  expect(pulsante(testi.attendiErrore, differenze()!)?.outerHTML).toBeUndefined();
  await clic(pulsante(testi.togliErroreAtteso, differenze()!)!);
  await giro();
  expect(avviso()).toBe(riempi(testi.annuncioTogliErrore, { nome: document.querySelector('tr[data-caso="0"] [data-nome-caso]')?.textContent ?? "?" }));
  expect({ pallino: pallino(0), campi: await attesoNeiCampi(0) }).toEqual({ pallino: "da-rieseguire", campi: [] });
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  expect(pallino(0)).toBe("raggiunto");
  cleanup();

  // Gli avvisi attesi tolti: l'output è giusto, gli avvisi no.
  const testo = conIlCaso("divisione-intera-in-reale.algo", (c) => delete c.expected.warnings);
  const nome = (JSON.parse(testo) as { test_cases: { name: string }[] }).test_cases[0]!.name;
  await apriLaFinestra("divisione-intera-in-reale.algo", testo);
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  expect({ console: esitoNellaConsole(), pallino: pallino(0) }).toEqual({ console: riempi(testi.esitoDelCasoAvvisi, { nome }), pallino: "raggiunto" });
  await clic(pulsante(testi.scriviAvvisi, differenze()!)!);
  await giro();
  expect(avviso()).toBe(riempi(testi.annuncioScriviAvvisi, { nome }));
  // Raggiunto prima della modifica: il pallino si svuota.
  expect(pallino(0)).toBe("raggiunto-prima");
  const avvisoAtteso = riempi(testi.diffSegnalazione, { breve: codici.integer_division_to_real.breve, dove: "Assegnazione: m ← 7 / 2" });
  expect(await attesoNeiCampi(0)).toEqual([riempi(testi.casoAvvisiAttesi, { elenco: avvisoAtteso })]);
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  expect({ pallino: pallino(0), console: esitoNellaConsole(), avvisi: differenze()?.querySelector("[data-avvisi]")?.outerHTML ?? null }).toEqual({ pallino: "raggiunto", console: riempi(testi.esitoDelCasoRaggiunto, { nome }), avvisi: null });
  await annulla();
  expect(await attesoNeiCampi(0)).toEqual([]);
});

test("«Togli gli avvisi attesi» quando il caso non ne ottiene, con l'annuncio; il blocco dell'errore atteso cancellato si chiama «blocco tolto»", async () => {
  // Un avviso atteso che il programma non dà: raggiunto, con gli avvisi diversi.
  const testo = conIlCaso("scrittura-intero.algo", (c) => (c.expected.warnings = [{ code: "integer_division_to_real", block: "b1" }]));
  const nome = (JSON.parse(testo) as { test_cases: { name: string }[] }).test_cases[0]!.name;
  await apriLaFinestra("scrittura-intero.algo", testo);
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  // Prima il pulsante diceva «Scrivi gli avvisi», e toglieva quelli attesi.
  expect(pulsante(testi.scriviAvvisi, differenze()!)?.outerHTML).toBeUndefined();
  await clic(pulsante(testi.togliAvvisiAttesi, differenze()!)!);
  await giro();
  expect({ avviso: avviso(), campi: await attesoNeiCampi(0) }).toEqual({ avviso: riempi(testi.annuncioTogliAvvisi, { nome }), campi: [] });
  cleanup();

  // L'errore atteso sul blocco della divisione, poi il blocco cancellato: il caso lo nomina come tolto (prima «Fine»).
  await apriLaFinestra("divisione-per-zero.algo", conIlCaso("divisione-per-zero.algo", (c) => delete c.expected.error));
  await eseguiIlCaso(0, false);
  await aspetta("la fine", finita);
  await clic(pulsante(testi.attendiErrore, differenze()!)!);
  await giro();
  const blocco = [...document.querySelectorAll("[data-blocco]")].find((b) => b.getAttribute("aria-label") === "Assegnazione: q ← a / b")!;
  await act(async () => void fireEvent.keyDown(blocco, { key: "Delete" }));
  await giro();
  expect(await attesoNeiCampi(0)).toEqual([riempi(testi.casoErroreAtteso, { breve: codici.division_by_zero.breve, dove: testi.bloccoTolto })]);
});
