// Le procedure e le funzioni nella finestra vera sotto happy-dom, sul programma di riferimento con le funzioni (`casi/
// tappa-3/riferimento-media-voti-funzioni.algo`: `leggi_numero` f2, `valido` f3, `stelle` f4; il rombo `b4` chiama
// `valido`, il salto `b1` `leggi_numero`, il salto `b13` `stelle`), aperto come file dato all'avvio:
// - le schede: col solo programma principale non ci sono; con le procedure e le funzioni «Programma principale» è la
//   prima a sinistra (nulla prima di lei: il «+» e l'elenco vengono dopo le schede), una voce dell'elenco apre la sua scheda e la mostra (il flowchart e la vista dei dati la seguono), la × la
//   chiude e mostra quella a sinistra, le frecce passano alla vicina;
// - l'elenco: le procedure e poi le funzioni, in ordine alfabetico, con chi le chiama e la ricerca;
// - creare dal pulsante «Funzione» (solo funzioni) e dal menu Progetto, coi nomi rifiutati prima; rinominare (le chiamate
//   seguono), le proprietà (il genere), duplicare; Annulla dopo ognuna;
// - eliminare: la conferma sempre, senza spunte le chiamate restano; con la spunta la conferma globale e i rombi uno per
//   uno; Esc a ogni passo non elimina nulla; Annulla riporta tutto in un passo;
// - «Procedure e funzioni…» del menu Progetto; l'esecuzione che resta chiusa coi suoi casi d'uso aperti.
//
// Che cosa NON guarda: i gesti veri nei motori (il tasto destro, il fuoco dell'elenco: `e2e/funzioni.e2e.ts`); le
// operazioni del nucleo una per una (`core/modifica/funzioni.test.ts`).
import { afterAll, afterEach, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const RIFERIMENTO = readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", "riferimento-media-voti-funzioni.algo"), "utf8");
const SENZA = readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-2", "riferimento-media-voti-per.algo"), "utf8");

let datoAllAvvio = { percorso: "", testo: "" };
const scritti: { percorso: string; testo: string }[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return datoAllAvvio.percorso;
      case "leggi_progetto":
        if (argomenti.percorso !== datoAllAvvio.percorso) throw new Error("file non trovato");
        return datoAllAvvio.testo;
      case "scrivi_progetto":
        scritti.push({ percorso: String(argomenti.percorso), testo: String(argomenti.testo) });
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
// Ogni prova apre la finestra e ripete gesti: il limite predefinito di 5 s non basta sotto carico.
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
async function apriLaFinestra(testo = RIFERIMENTO, nome = "funzioni.algo"): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(testi.apertoIl, { file: nome }));
}

const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));
const annulla = async () => {
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
};
const ripeti = async () => {
  await tasto(document.body, "y", { ctrlKey: true });
  await giro();
};

/** Le schede sopra il flowchart, come si leggono; il testo di quella mostrata fra parentesi quadre. */
const schede = () =>
  [...document.querySelectorAll<HTMLElement>("[data-scheda]")].map((s) => (s.getAttribute("aria-selected") === "true" ? `[${s.textContent}]` : s.textContent));
/** Le didascalie delle tabelle della vista dei dati, unite: in una procedura o in una funzione, i parametri e i dati. */
const didascaliaDeiDati = () => [...(document.querySelector("[data-aggiungi]")?.parentElement?.querySelectorAll("caption") ?? [])].map((c) => c.textContent).join(" | ");
/** Il testo disegnato di un blocco (il disegno, non lo strato che lo rende raggiungibile). */
const testoDel = (id: string) => document.querySelector(`g[data-id="${id}"]:not([data-fase]) text`)?.textContent ?? null;
const finestra = () => document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
const pulsante = (testo: string, dentro: ParentNode = document) => [...dentro.querySelectorAll("button")].find((b) => b.textContent === testo);

async function apriLElenco(): Promise<HTMLElement> {
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  return document.querySelector<HTMLElement>("[data-elenco]")!;
}
async function mostra(id: string): Promise<void> {
  const elenco = await apriLElenco();
  await clic(elenco.querySelector(`[data-voce-funzione="${id}"]`)!);
  await giro();
}
/** Una voce del menu Progetto, dalla tastiera come fa chi usa il menu (sotto happy-dom il menu di Ark non risponde al
 * clic sulla voce): le frecce fino alla voce evidenziata, poi Invio. */
async function dalMenuProgetto(comando: string): Promise<void> {
  await clic(document.querySelector('[data-menu="progetto"]')!);
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  const evidenziata = () => menu.querySelector("[data-highlighted]")?.getAttribute("data-comando");
  for (let i = 0; i < 20 && evidenziata() !== comando; i++) {
    await tasto(menu, "ArrowDown");
    await giro();
  }
  expect(evidenziata()).toBe(comando);
  await tasto(menu, "Enter");
  await giro();
  await giro();
}
/** Una voce del menu di una scheda (il tasto destro). */
async function dalMenuDellaScheda(id: string, voce: string): Promise<void> {
  await act(async () => void fireEvent.contextMenu(document.querySelector(`[data-scheda="${id}"]`)!, { clientX: 30, clientY: 30 }));
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  await clic(menu.querySelector(`[data-voce="${voce}"]`)!);
  await giro();
}
/** Scrive nel campo della finestra aperta e conferma col comando dato. */
async function scriviEConferma(campo: string, valore: string, comando: string): Promise<void> {
  const f = finestra()!;
  await act(async () => void fireEvent.change(f.querySelector(`[data-campo="${campo}"]`)!, { target: { value: valore } }));
  await clic(pulsante(comando, f)!);
  await giro();
}
/** Il progetto salvato con Ctrl+S, riletto. */
async function salvato(): Promise<Progetto> {
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("salvato", () => avviso().startsWith("Salvato"));
  const a = apri(scritti.at(-1)!.testo);
  if (!a.ok) throw new Error("illeggibile");
  return a.progetto;
}

test("senza procedure né funzioni le schede non ci sono; il pulsante «Funzione» e le voci del menu Progetto sì", async () => {
  await apriLaFinestra(SENZA, "senza.algo");
  expect(document.querySelector("[data-schede]")?.outerHTML ?? null).toBeNull();
  expect(document.querySelector('[data-comando="funzione"]')?.textContent).toBe(testi.comandoFunzione);
  // Il pulsante sta a sinistra di «Salva», nel gruppo del progetto.
  const gruppo = [...document.querySelectorAll('[data-gruppo="progetto"] [data-comando]')].map((b) => b.getAttribute("data-comando"));
  expect(gruppo).toEqual(["funzione", "salva"]);
});

test("le schede: il programma principale per primo, una voce dell'elenco apre la scheda, la vista dei dati e il flowchart la seguono", async () => {
  await apriLaFinestra();
  expect(schede()).toEqual([`[${testi.schedaPrincipale}]`]);
  // Nella fila, la scheda del programma è la prima; poi il «+», in fondo l'elenco.
  const fila = [...document.querySelector("[data-schede]")!.querySelectorAll("[data-scheda], [data-nuova-funzione], [data-elenco-funzioni]")].map(
    (e) => e.getAttribute("data-scheda") ?? (e.hasAttribute("data-nuova-funzione") ? "+" : "elenco"),
  );
  expect(fila).toEqual(["f1", "+", "elenco"]);
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toBe(`${riempi(testi.elencoFunzioni, { n: "3" })} ▾`);
  expect(didascaliaDeiDati()).toBe("Dati: riferimento-media-voti-funzioni");
  await mostra("f3");
  expect(schede()).toEqual([`${testi.schedaPrincipale}`, `[valido ${testi.genereFunzione}]`]);
  expect(didascaliaDeiDati()).toBe("Parametri: valido | Dati: valido");
  expect(document.querySelector(`[aria-label="${testi.flowchart}: valido"]`)?.outerHTML ?? null).not.toBeNull();
  await mostra("f4");
  expect(schede()).toEqual([`${testi.schedaPrincipale}`, `valido ${testi.genereFunzione}`, `[stelle ${testi.genereProcedura}]`]);
  expect(testoDel("b23")).toBe("k < quante");
  // Le frecce passano alla scheda vicina e la mostrano.
  await tasto(document.querySelector('[data-scheda="f4"]')!, "ArrowLeft");
  expect(schede()[1]).toBe(`[valido ${testi.genereFunzione}]`);
  // La × chiude la scheda mostrata: si mostra quella a sinistra; la funzione resta nel progetto.
  await clic(document.querySelector('[data-chiudi-scheda="f3"]')!);
  expect(schede()).toEqual([`[${testi.schedaPrincipale}]`, `stelle ${testi.genereProcedura}`]);
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(3)");
});

test("l'elenco: le procedure e poi le funzioni in ordine alfabetico, chi le chiama, la ricerca", async () => {
  await apriLaFinestra();
  const elenco = await apriLElenco();
  const gruppi = [...elenco.querySelectorAll("section")].map((s) => ({
    titolo: s.querySelector("h3")?.textContent,
    voci: [...s.querySelectorAll("[data-voce-funzione]")].map((v) => v.textContent),
  }));
  expect(gruppi).toEqual([
    { titolo: riempi(testi.gruppoProcedure, { n: "2" }), voci: ["Procedura leggi_numero(out numero)chiamata da: Programma principale", "Procedura stelle(quante)chiamata da: Programma principale"] },
    { titolo: riempi(testi.gruppoFunzioni, { n: "1" }), voci: ["Funzione booleano ← valido(voto)chiamata da: Programma principale"] },
  ]);
  await act(async () => void fireEvent.change(elenco.querySelector('input[type="search"]')!, { target: { value: "ST" } }));
  expect([...elenco.querySelectorAll("[data-voce-funzione]")].map((v) => v.getAttribute("data-voce-funzione"))).toEqual(["f4"]);
  await act(async () => void fireEvent.change(elenco.querySelector('input[type="search"]')!, { target: { value: "zzz" } }));
  expect(elenco.textContent).toContain(testi.nessunaTrovata);
  // Esc chiude l'elenco.
  await tasto(elenco.querySelector("input")!, "Escape");
  expect(document.querySelector("[data-elenco]")?.outerHTML ?? null).toBeNull();
});

test("creare dal pulsante «Funzione»: solo una funzione; i nomi vuoti o già usati sono rifiutati; Annulla e Ripeti", async () => {
  await apriLaFinestra();
  await clic(document.querySelector('[data-comando="funzione"]')!);
  const f = finestra()!;
  expect(within(f).getByRole("heading").textContent).toBe(testi.funzioneNuovaSoloTitolo);
  expect(f.querySelector("[data-genere]")?.outerHTML ?? null).toBeNull();
  expect((f.querySelector('[data-campo="predefinito"]') as HTMLInputElement).value).toBe("0");
  await clic(pulsante(testi.funzioneCrea, f)!);
  expect(f.textContent).toContain(testi.funzioneNomeVuoto);
  await scriviEConferma("nome", "stelle", testi.funzioneCrea);
  expect(finestra()?.textContent).toContain("già usato");
  await scriviEConferma("nome", "doppio", testi.funzioneCrea);
  expect(finestra()?.outerHTML ?? null).toBeNull();
  expect(schede().at(-1)).toBe(`[doppio ${testi.genereFunzione}]`);
  await annulla();
  expect(schede()).toEqual([`[${testi.schedaPrincipale}]`]);
  await ripeti();
  expect(schede().at(-1)).toBe(`[doppio ${testi.genereFunzione}]`);
  // Il file: la funzione nuova, coi campi del formato.
  expect((await salvato()).functions.at(-1)).toEqual({ id: "f5", kind: "function", name: "doppio", return_type: "integer", data: [], body: [], end: { id: "b28", return_value: "" } });
});

test("il valore predefinito: segue il tipo finché non lo si scrive; uno che non è del tipo ferma la conferma; le Proprietà lo cambiano col tipo", async () => {
  await apriLaFinestra();
  await clic(document.querySelector('[data-comando="funzione"]')!);
  const campo = (c: string) => finestra()!.querySelector<HTMLInputElement>(`[data-campo="${c}"]`)!;
  const cambia = async (c: string, valore: string) => {
    await act(async () => void fireEvent.change(campo(c), { target: { value: valore } }));
    await giro();
  };
  await cambia("tipo", "real");
  expect(campo("predefinito").value).toBe("0.0");
  await cambia("nome", "mezzo");
  await cambia("predefinito", "abc");
  await clic(pulsante(testi.funzioneCrea, finestra()!)!);
  // Il valore sbagliato: l'errore sotto il campo, e la funzione non nasce.
  expect([finestra()?.outerHTML !== undefined, campo("predefinito").getAttribute("aria-invalid")]).toEqual([true, "true"]);
  await cambia("predefinito", "2.5");
  // Scritto, non segue più il tipo.
  await cambia("tipo", "integer");
  await cambia("tipo", "real");
  expect(campo("predefinito").value).toBe("2.5");
  await clic(pulsante(testi.funzioneCrea, finestra()!)!);
  await giro();
  expect(finestra()?.outerHTML ?? null).toBeNull();
  const media = (await salvato()).functions.at(-1)!;
  expect([media.name, media.return_type, media.default_result]).toEqual(["mezzo", "real", "2.5"]);
  // Le Proprietà: il tipo intero col 2.5 scritto ferma la conferma; col 3 passa, in un passo che Annulla riporta.
  await dalMenuDellaScheda(media.id, "proprieta");
  expect(campo("predefinito").value).toBe("2.5");
  await cambia("tipo", "integer");
  await clic(pulsante(testi.funzioneConferma, finestra()!)!);
  expect(campo("predefinito").getAttribute("aria-invalid")).toBe("true");
  await cambia("predefinito", "3");
  await clic(pulsante(testi.funzioneConferma, finestra()!)!);
  await giro();
  const dopo = (await salvato()).functions.at(-1)!;
  expect([dopo.return_type, dopo.default_result]).toEqual(["integer", "3"]);
  await annulla();
  const prima = (await salvato()).functions.at(-1)!;
  expect([prima.return_type, prima.default_result]).toEqual(["real", "2.5"]);
});

test("creare dal menu Progetto: una procedura; la finestra «Procedure e funzioni…» le elenca", async () => {
  await apriLaFinestra(SENZA, "senza.algo");
  await dalMenuProgetto("funzioni");
  await aspetta("la finestra delle funzioni", () => finestra() !== null);
  expect(finestra()!.textContent).toContain(testi.funzioniNessuna);
  await clic(pulsante(testi.funzioniNuova, finestra()!)!);
  await giro();
  const f = finestra()!;
  expect(within(f).getByRole("heading").textContent).toBe(testi.funzioneNuovaTitolo);
  await clic(f.querySelector('[data-genere="procedure"]')!);
  expect(f.querySelector('[data-campo="tipo"]')?.outerHTML ?? null).toBeNull();
  await scriviEConferma("nome", "saluta", testi.funzioneCrea);
  expect(schede()).toEqual([`${testi.schedaPrincipale}`, `[saluta ${testi.genereProcedura}]`]);
  await dalMenuProgetto("funzioni");
  await aspetta("la finestra delle funzioni", () => finestra() !== null);
  expect([...finestra()!.querySelectorAll("tbody tr")].map((r) => r.getAttribute("data-funzione"))).toEqual(["f2"]);
});

test("rinominare: le chiamate seguono; Annulla le riporta", async () => {
  await apriLaFinestra();
  await mostra("f3");
  await dalMenuDellaScheda("f3", "rinomina");
  await scriviEConferma("nome", "corretto", testi.funzioneRinomina);
  expect(schede()[1]).toBe(`[corretto ${testi.genereFunzione}]`);
  await clic(document.querySelector('[data-scheda="f1"]')!);
  expect(testoDel("b4")).toBe("corretto(voto)");
  await annulla();
  expect(testoDel("b4")).toBe("valido(voto)");
});

test("le proprietà: una funzione che diventa procedura; duplicare; Annulla dopo ognuna", async () => {
  await apriLaFinestra();
  await mostra("f3");
  await dalMenuDellaScheda("f3", "proprieta");
  await clic(finestra()!.querySelector('[data-genere="procedure"]')!);
  await clic(pulsante(testi.funzioneConferma, finestra()!)!);
  await giro();
  expect(schede()[1]).toBe(`[valido ${testi.genereProcedura}]`);
  await annulla();
  expect(schede()[1]).toBe(`[valido ${testi.genereFunzione}]`);
  await dalMenuDellaScheda("f3", "duplica");
  expect(schede().at(-1)).toBe(`[valido_2 ${testi.genereFunzione}]`);
  await annulla();
  expect(schede().some((s) => s?.includes("valido_2"))).toBe(false);
});

test("eliminare chiede sempre; senza la spunta le chiamate restano (errori); Esc non elimina; Annulla riporta tutto", async () => {
  await apriLaFinestra();
  await mostra("f3");
  await dalMenuDellaScheda("f3", "elimina");
  const f = finestra()!;
  expect(within(f).getByRole("heading").textContent).toBe(riempi(testi.eliminaFunzioneTitoloF, { nome: "valido" }));
  expect(f.textContent).toContain("Programma principale: Se: valido(voto)");
  // Esc: nulla è eliminato.
  await tasto(f, "Escape");
  expect(finestra()?.outerHTML ?? null).toBeNull();
  expect(schede()[1]).toBe(`[valido ${testi.genereFunzione}]`);
  await dalMenuDellaScheda("f3", "elimina");
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(2)");
  expect(schede()).toEqual([`[${testi.schedaPrincipale}]`]);
  expect(testoDel("b4")).toBe("valido(voto)");
  await annulla();
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(3)");
});

test("eliminare con la spunta: la conferma globale, poi i rombi uno per uno; un passo solo da annullare", async () => {
  await apriLaFinestra();
  await mostra("f3");
  await dalMenuDellaScheda("f3", "elimina");
  await clic(finestra()!.querySelector("[data-spunta]")!);
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  expect(finestra()!.querySelector('[data-passo="globale"]')?.textContent).toBe(testi.eliminaGlobaleUna);
  // Esc alla conferma globale: nulla è eliminato.
  await tasto(finestra()!, "Escape");
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(3)");
  await dalMenuDellaScheda("f3", "elimina");
  await clic(finestra()!.querySelector("[data-spunta]")!);
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  expect(finestra()!.querySelector('[data-passo="rombo"]')?.getAttribute("data-blocco-rombo")).toBe("b4");
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  expect(finestra()?.outerHTML ?? null).toBeNull();
  expect(testoDel("b4")).toBe("false");
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(2)");
  await annulla();
  expect(testoDel("b4")).toBe("valido(voto)");
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(3)");
});

test("un rombo non confermato tiene la chiamata; una procedura con tutte le chiamate", async () => {
  await apriLaFinestra();
  await mostra("f3");
  await dalMenuDellaScheda("f3", "elimina");
  await clic(finestra()!.querySelector("[data-spunta]")!);
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  await clic(finestra()!.querySelector("[data-elimina-no]")!);
  await giro();
  expect(testoDel("b4")).toBe("valido(voto)");
  expect(document.querySelector("[data-elenco-funzioni]")?.textContent).toContain("(2)");
  await annulla();
  await mostra("f2");
  await dalMenuDellaScheda("f2", "elimina");
  await clic(finestra()!.querySelector("[data-spunta]")!);
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  expect(document.querySelector('[data-blocco="b1"]')?.outerHTML ?? null).toBeNull();
  await annulla();
  expect(document.querySelector('[data-blocco="b1"]')?.outerHTML ?? null).not.toBeNull();
});

test("Annulla di un passo fatto in un'altra scheda mostra quella scheda; se cambia anche la mostrata, si resta lì", async () => {
  await apriLaFinestra();
  await mostra("f4");
  await dalMenuDellaScheda("f4", "proprieta");
  await clic(finestra()!.querySelector('[data-genere="function"]')!);
  await clic(pulsante(testi.funzioneConferma, finestra()!)!);
  await giro();
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await annulla();
  // Il passo annullato ha cambiato solo `stelle`: la sua scheda torna mostrata.
  expect(schede().includes(`[stelle ${testi.genereProcedura}]`)).toBe(true);
  // La rinomina cambia anche il programma principale (la chiamata): Annulla lì non cambia scheda.
  await dalMenuDellaScheda("f4", "rinomina");
  await scriviEConferma("nome", "asterischi", testi.funzioneRinomina);
  await clic(document.querySelector('[data-scheda="f1"]')!);
  expect(testoDel("b13")).toContain("asterischi");
  await annulla();
  expect(schede()[0]).toBe(`[${testi.schedaPrincipale}]`);
  expect(testoDel("b13")).toContain("stelle");
});

test("la vista dei dati segue la scheda: un dato nuovo va alla funzione mostrata", async () => {
  await apriLaFinestra();
  await mostra("f4");
  expect(didascaliaDeiDati()).toBe("Parametri: stelle | Dati: stelle");
  await clic(document.querySelector("[data-aggiungi]")!);
  await giro();
  const nome = screen.getByRole("textbox", { name: testi.datiNome });
  await act(async () => void fireEvent.change(nome, { target: { value: "riga" } }));
  await tasto(nome, "Enter");
  await giro();
  expect([...document.querySelectorAll("tr[data-dato] th")].map((t) => t.textContent)).toEqual(["quante", "k", "riga"]);
  const p = await salvato();
  expect(p.functions.find((f) => f.id === "f4")!.data.map((d) => d.name)).toEqual(["quante", "k", "riga"]);
  expect(p.functions.find((f) => f.id === "f1")!.data.length).toBe(7);
});

test("un progetto con procedure e funzioni si esegue nella finestra: la lettura dentro la procedura ne mostra la scheda", async () => {
  await apriLaFinestra();
  await clic(document.querySelector('[data-comando="esegui"]')!);
  await aspetta("la lettura", () => document.querySelector(".lettura input, [class*=lettura] input") !== null);
  expect(document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda")).toBe("f2");
  expect([...document.querySelectorAll("[data-dove-sei] button")].map((b) => b.textContent)).toEqual([testi.schedaPrincipale, "leggi_numero"]);
});

test("la finestra «Procedure e funzioni…»: il «⋯» apre il menu della riga, Esc chiude il solo menu, una voce fa il suo comando", async () => {
  await apriLaFinestra();
  await dalMenuProgetto("funzioni");
  await aspetta("la finestra delle funzioni", () => finestra() !== null);
  expect([...finestra()!.querySelectorAll("tbody tr")].map((r) => r.getAttribute("data-funzione"))).toEqual(["f2", "f4", "f3"]);
  const puntini = finestra()!.querySelector('[data-comandi-della-riga="f4"]')!;
  expect(puntini.getAttribute("aria-label")).toBe(riempi(testi.menuDellaFunzione, { nome: "stelle" }));
  await clic(puntini);
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  expect([...menu.querySelectorAll('[role="menuitem"]')].map((v) => v.textContent)).toEqual([testi.menuApri, testi.menuRinomina, testi.menuProprieta, testi.menuDuplica, testi.menuEliminaFunzione]);
  await tasto(menu, "Escape");
  await giro();
  expect(document.querySelector('[role="menu"]')?.outerHTML ?? null).toBeNull();
  expect(finestra()?.querySelector("table")?.outerHTML ?? null).not.toBeNull();
  await clic(finestra()!.querySelector('[data-comandi-della-riga="f4"]')!);
  await giro();
  await clic(document.querySelector('[role="menu"] [data-voce="apri"]')!);
  await giro();
  expect(finestra()?.outerHTML ?? null).toBeNull();
  expect(schede()).toEqual([testi.schedaPrincipale, `[stelle ${testi.genereProcedura}]`]);
});

test("dal «⋯» della finestra «Procedure e funzioni…» le stesse azioni del menu della scheda: Elimina chiede, Esc non elimina, Annulla riporta", async () => {
  await apriLaFinestra();
  const dalPuntini = async (id: string, voce: string) => {
    await dalMenuProgetto("funzioni");
    await aspetta("la finestra delle funzioni", () => finestra()?.querySelector(`[data-comandi-della-riga="${id}"]`) != null);
    await clic(finestra()!.querySelector(`[data-comandi-della-riga="${id}"]`)!);
    await giro();
    await clic(document.querySelector(`[role="menu"] [data-voce="${voce}"]`)!);
    await giro();
  };
  const quante = () => document.querySelector("[data-elenco-funzioni]")?.textContent;
  // Elimina: la conferma, ed Esc non elimina nulla.
  await dalPuntini("f4", "elimina");
  expect(finestra()?.querySelector("[data-elimina-si]")?.outerHTML ?? null).not.toBeNull();
  await tasto(finestra()!, "Escape");
  await giro();
  expect(quante()).toContain("(3)");
  // Confermata, la procedura va via; Annulla la riporta.
  await dalPuntini("f4", "elimina");
  await clic(finestra()!.querySelector("[data-elimina-si]")!);
  await giro();
  expect(quante()).toContain("(2)");
  await annulla();
  expect(quante()).toContain("(3)");
  // Rinomina e Proprietà aprono la loro finestra; Duplica fa la copia, che Annulla toglie.
  await dalPuntini("f4", "rinomina");
  expect(finestra()?.querySelector('[data-campo="nome"]')?.outerHTML ?? null).not.toBeNull();
  await tasto(finestra()!, "Escape");
  await giro();
  await dalPuntini("f4", "proprieta");
  expect(finestra()?.querySelectorAll("[data-genere]").length).toBe(2);
  await tasto(finestra()!, "Escape");
  await giro();
  await dalPuntini("f4", "duplica");
  expect(quante()).toContain("(4)");
  await annulla();
  expect(quante()).toContain("(3)");
});

test("una funzione chiamata da più funzioni: ogni chiamante una volta, nell'elenco e nella finestra", async () => {
  // `valido` chiamata dal programma principale (b4) e, due volte, da una funzione nuova `doppiamente_valido`.
  const p = JSON.parse(RIFERIMENTO);
  p.functions.push({
    id: "f5",
    kind: "function",
    name: "doppiamente_valido",
    return_type: "boolean",
    data: [{ name: "a", type: "integer", parameter: "value" }],
    body: [],
    end: { id: "b28", return_value: "valido(a) and valido(a + 1)" },
  });
  await apriLaFinestra(JSON.stringify(p, null, 2));
  const elenco = await apriLElenco();
  expect(elenco.querySelector('[data-voce-funzione="f3"]')?.textContent).toContain(riempi(testi.chiamataDa, { chi: `${testi.schedaPrincipale}, doppiamente_valido` }));
  await tasto(elenco.querySelector("input")!, "Escape");
  await dalMenuProgetto("funzioni");
  await aspetta("la finestra delle funzioni", () => finestra() !== null);
  const riga = finestra()!.querySelector('tr[data-funzione="f3"]')!;
  expect([...riga.querySelectorAll("td")][3]?.textContent).toBe(`${testi.schedaPrincipale}, doppiamente_valido`);
});

// ------------------------------------------------------------- il risultato stringa e vettore, la correzione del rif

const STRINGA = readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", "risultato-stringa.algo"), "utf8");
const VETTORE = readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", "risultato-vettore-assegnato.algo"), "utf8");
/** Il riferimento com'era scritto prima: `leggi_numero` riceve `numero` per riferimento, e `n` non ha un valore. */
const CON_RIF = RIFERIMENTO.replace('"parameter": "out"', '"parameter": "reference"');
/** Lo stesso, con `leggi_numero` che scrive il parametro prima di dargli un valore: lì il passaggio per uscita è sbagliato. */
const LETTO_PRIMA = (() => {
  const p = JSON.parse(CON_RIF) as { functions: { id: string; body: unknown[] }[] };
  p.functions.find((f) => f.id === "f2")!.body.unshift({ id: "b90", kind: "write", values: ["numero"], newline: true });
  return JSON.stringify(p, null, 2);
})();
/** Le voci della riga di stato e i comandi della correzione sotto di esse. */
async function vociDellaRiga(): Promise<{ voci: string[]; correzioni: string[] }> {
  const mostra = pulsante(testi.statoMostra);
  if (mostra) await clic(mostra);
  await giro();
  const elenco = document.querySelector(`[aria-label="${testi.elencoDelControllo}"]`)!;
  return {
    voci: [...elenco.querySelectorAll("li > :first-child")].map((v) => v.textContent ?? ""),
    correzioni: [...elenco.querySelectorAll("[data-verso-out]")].map((v) => v.textContent ?? ""),
  };
}

test("il rif senza valore: la correzione col nome della scheda mostrata, un passo che fa passare il parametro di uscita; Annulla lo riporta", async () => {
  expect(CON_RIF).not.toBe(RIFERIMENTO);
  await apriLaFinestra(CON_RIF, "con-rif.algo");
  const breve = (await import("../../i18n/codici")).testiDeiCodici.it.reference_without_value.breve;
  // Nel programma principale l'argomento come lo scrive il salto.
  expect(await vociDellaRiga()).toEqual({ voci: [`Errore in «Procedura: leggi_numero(${testi.disegnoRif} n)»: ${breve}`], correzioni: [riempi(testi.sostituisciConOut, { nome: "n" })] });
  // Nella scheda della procedura il nome del parametro.
  await mostra("f2");
  expect((await vociDellaRiga()).correzioni).toEqual([riempi(testi.sostituisciConOut, { nome: "numero" })]);
  await clic(document.querySelector("[data-verso-out]")!);
  await giro();
  expect(document.querySelector(`[aria-label="${testi.elencoDelControllo}"] li`)?.outerHTML ?? null).toBeNull();
  expect((await salvato()).functions.find((f) => f.id === "f2")!.data[0]!.parameter).toBe("out");
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  expect(document.querySelector('[data-blocco="b1"]')?.getAttribute("aria-label")).toContain(`leggi_numero(${testi.disegnoOut} n)`);
  await annulla();
  // Annulla mostra la scheda dove è avvenuto il passo, la procedura: il comando torna col nome del parametro.
  expect({ scheda: document.querySelector('[data-scheda][aria-selected="true"]')?.getAttribute("data-scheda"), ...(await vociDellaRiga()) }).toEqual({
    scheda: "f2",
    voci: [`Errore in «Procedura: leggi_numero(${testi.disegnoRif} n)»: ${(await import("../../i18n/codici")).testiDeiCodici.it.reference_without_value.breve}`],
    correzioni: [riempi(testi.sostituisciConOut, { nome: "numero" })],
  });
  expect((await salvato()).functions.find((f) => f.id === "f2")!.data[0]!.parameter).toBe("reference");
});

test("la correzione dal programma principale: il pulsante sparisce con l'errore, e il fuoco va al blocco del salto", async () => {
  await apriLaFinestra(CON_RIF, "con-rif.algo");
  await vociDellaRiga();
  await clic(document.querySelector("[data-verso-out]")!);
  await giro();
  expect(document.activeElement?.getAttribute("data-blocco")).toBe("b1");
  // Dalla scheda della procedura il salto non è nel flowchart mostrato: il fuoco va alla riga del parametro.
  await annulla();
  await mostra("f2");
  await vociDellaRiga();
  await clic(document.querySelector("[data-verso-out]")!);
  await giro();
  expect(document.activeElement?.closest("[data-dato]")?.getAttribute("data-dato")).toBe("dati-0");
});

test("il rif senza valore che la procedura legge prima di dargli un valore: l'errore sì, la correzione mai", async () => {
  await apriLaFinestra(LETTO_PRIMA, "letto-prima.algo");
  const { voci, correzioni } = await vociDellaRiga();
  // Controllo positivo: l'errore c'è, ed è quello del rif senza valore (la premessa); il comando no.
  const breve = (await import("../../i18n/codici")).testiDeiCodici.it.reference_without_value.breve;
  expect({ voci: voci.map((v) => v.endsWith(`: ${breve}`)), correzioni }).toEqual({ voci: [true], correzioni: [] });
});

// La causa precisa dei codici del controllo nella riga di stato: di un dato (sulla sua riga), di un blocco, di un avviso
// di un blocco; e quella dell'avviso di un dato, che c'è solo senza errori. Le frasi sono quelle delle cause, col pezzo
// citato; la causa non entra nel file.
const progettoDiProva = (data: unknown[], body: unknown[], ...altre: unknown[]) =>
  JSON.stringify({ format: "algodesign", schema_version: 2, metadata: { name: "cause" }, functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }, ...altre] }, null, 2);
const CON_LE_CAUSE = progettoDiProva(
  [{ name: "eta media", type: "integer" }],
  [
    { id: "b1", kind: "while", condition: "true", body: [] },
    { id: "b2", kind: "call", callee: "p", arguments: ["3"] },
  ],
  { id: "f2", kind: "procedure", name: "p", data: [{ name: "r", type: "integer", parameter: "reference" }], body: [], end: { id: "fine-p" } },
);
const SOLO_AVVISI = progettoDiProva([{ name: "a", type: "integer" }], [{ id: "b1", kind: "read", target: "a" }]);
/** Le frasi brevi delle voci della riga di stato, nell'ordine. */
const brevi = async () => (await vociDellaRiga()).voci.map((v) => v.slice(v.indexOf("»: ") + 3));

test("la causa precisa nella riga di stato: un dato, un blocco, l'avviso di un ciclo e quello di un dato; il file non la porta", async () => {
  const { testiDelleCause: cause } = await import("../../i18n/codici");
  await apriLaFinestra(CON_LE_CAUSE, "cause.algo");
  expect(await brevi()).toEqual([cause.it.nome_spazio.breve, riempi(cause.it.non_un_dato.breve, { segno: "r" }), cause.it.sempre_vera.breve]);
  // La causa resta fuori dal file: gli errori del file hanno la forma di sempre (qui nessun caso), e il dato il suo nome.
  const p = await salvato();
  expect(JSON.stringify(p)).not.toContain("causa");
  cleanup();
  await apriLaFinestra(SOLO_AVVISI, "avvisi.algo");
  expect(await brevi()).toEqual([cause.it.solo_lettura.breve]);
});

test("la finestra della funzione: un nome non valido dice la sua causa", async () => {
  const { testiDelleCause: cause } = await import("../../i18n/codici");
  await apriLaFinestra();
  await clic(document.querySelector('[data-comando="funzione"]')!);
  for (const [nome, attesa] of [
    ["1conta", cause.it.nome_cifra.breve],
    ["città", riempi(cause.it.nome_accentato.breve, { segno: "à" })],
    ["log", riempi(cause.it.nome_della_libreria.breve, { segno: "log" })],
    ["while", riempi(cause.it.nome_riservato.breve, { segno: "while" })],
  ] as const) {
    await scriviEConferma("nome", nome, testi.funzioneCrea);
    expect({ nome, dice: finestra()?.textContent?.includes(attesa) }).toEqual({ nome, dice: true });
  }
  // Un nome già usato ha la sua frase, una sola causa.
  await scriviEConferma("nome", "stelle", testi.funzioneCrea);
  expect(finestra()?.textContent).toContain((await import("../../i18n/codici")).testiDeiCodici.it.function_name_in_use.breve);
});

test("la finestra della funzione: il vettore con gli elementi e senza valore predefinito, la stringa con la lunghezza nelle opzioni avanzate", async () => {
  await apriLaFinestra(STRINGA, "stringa.algo");
  await mostra("f2");
  // L'intestazione nell'ovale: la stringa senza la sua lunghezza; la riga sotto i parametri con l'articolo giusto.
  expect(testoDel("f2")).toBe(`${testi.disegnoFunzione.split(" ")[0]} ${testi.tipoStringa} ← saluto(nome)`);
  expect(document.body.textContent).toContain(riempi(testi.restituisceUna, { tipo: riempi(testi.datiLunghezza, { tipo: testi.tipoStringa, n: "20" }) }));
  await dalMenuDellaScheda("f2", "proprieta");
  const f = finestra()!;
  const campo = (c: string) => f.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-campo="${c}"]`);
  // La stringa: la lunghezza scritta apre da sé le opzioni avanzate.
  expect([campo("tipo")?.value, campo("forma")?.value, f.querySelector("details")?.open, campo("lunghezza")?.value, campo("dimensione")]).toEqual(["string", "semplice", true, "20", null]);
  // Il vettore: gli elementi compaiono, il valore predefinito no.
  await act(async () => void fireEvent.change(campo("forma")!, { target: { value: "vettore" } }));
  await act(async () => void fireEvent.change(campo("tipo")!, { target: { value: "integer" } }));
  await act(async () => void fireEvent.change(campo("dimensione")!, { target: { value: "4" } }));
  expect([campo("predefinito"), f.querySelector("details")]).toEqual([null, null]);
  await clic(pulsante(testi.funzioneConferma, f)!);
  await giro();
  const g = (await salvato()).functions.find((x) => x.id === "f2")!;
  expect([g.return_type, g.return_size, g.return_max_length, g.default_result]).toEqual(["integer", 4, undefined, undefined]);
  expect(testoDel("f2")).toBe(`${testi.disegnoFunzione.split(" ")[0]} ${riempi(testi.datiVettore, { n: "4", tipo: testi.tipoInteri })} ← saluto(nome)`);
  await annulla();
  const h = (await salvato()).functions.find((x) => x.id === "f2")!;
  expect([h.return_type, h.return_size, h.return_max_length]).toEqual(["string", undefined, 20]);
});

test("la finestra «Procedure e funzioni…» dice ciò che restituisce per intero: la stringa con la lunghezza, il vettore con gli elementi", async () => {
  const restituisce = async (testo: string, nome: string) => {
    cleanup();
    await apriLaFinestra(testo, nome);
    await dalMenuProgetto("funzioni");
    await aspetta("la finestra delle funzioni", () => finestra() !== null);
    return [...finestra()!.querySelectorAll("tbody tr")].map((r) => `${r.querySelector("th")?.textContent} ${r.querySelectorAll("td")[2]?.textContent}`);
  };
  const stringa = await restituisce(STRINGA, "stringa.algo");
  const vettore = await restituisce(VETTORE, "vettore.algo");
  expect({ stringa, vettore }).toEqual({
    stringa: [`saluto ${riempi(testi.datiLunghezza, { tipo: testi.tipoStringa, n: "20" })}`],
    vettore: [`doppi ${riempi(testi.datiVettore, { n: "3", tipo: testi.tipoInteri })}`],
  });
});

test("una funzione nuova che restituisce una stringa: le opzioni avanzate chiuse finché la lunghezza non c'è", async () => {
  await apriLaFinestra(SENZA, "senza.algo");
  await clic(document.querySelector('[data-comando="funzione"]')!);
  await giro();
  const f = finestra()!;
  await act(async () => void fireEvent.change(f.querySelector('[data-campo="tipo"]')!, { target: { value: "string" } }));
  expect([f.querySelector("details")?.open, f.querySelector("summary")?.textContent, f.querySelector<HTMLInputElement>('[data-campo="predefinito"]')?.value]).toEqual([false, testi.opzioniAvanzate, '""']);
});

test("eliminare una funzione che restituisce un vettore: si tolgono le assegnazioni che la contengono, altrove resta", async () => {
  await apriLaFinestra(VETTORE, "vettore.algo");
  await mostra("f2");
  expect(testoDel("f2")).toBe(`${testi.disegnoFunzione.split(" ")[0]} ${riempi(testi.datiVettore, { n: "3", tipo: testi.tipoInteri })} ← doppi(w)`);
  expect(document.body.textContent).toContain(riempi(testi.restituisceUn, { tipo: riempi(testi.datiVettore, { n: "3", tipo: testi.tipoInteri }) }));
  await dalMenuDellaScheda("f2", "elimina");
  await clic(finestra()!.querySelector("[data-spunta]")!);
  // Un modo solo: un vettore non ha un valore predefinito.
  expect([...finestra()!.querySelectorAll("[data-modo]")].map((m) => [m.getAttribute("data-modo"), m.parentElement?.textContent])).toEqual([["assegnazioni", testi.toglilaConLAssegnazioneVettore]]);
  await clic(pulsante(testi.eliminaFunzioneConferma, finestra()!)!);
  await giro();
  expect(finestra()!.textContent).toContain(riempi(testi.eliminaGlobaleAssegnazioniVettore, { nome: "doppi" }));
  await clic(pulsante(testi.eliminaGlobaleConferma, finestra()!)!);
  await giro();
  const p = await salvato();
  expect(p.functions.map((x) => x.id)).toEqual(["f1"]);
  expect(JSON.stringify(p.functions[0]!.body)).not.toContain("doppi(");
  await annulla();
  expect((await salvato()).functions.map((x) => x.id)).toEqual(["f1", "f2"]);
});

/** Il file del vettore restituito con una chiamata anche fuori da un'assegnazione (in una Scrittura), e senza quella
 * nell'assegnazione se `soloFuori`. */
const vettoreConUnaScrittura = (soloFuori: boolean): string => {
  const p = JSON.parse(VETTORE);
  const principale = p.functions[0];
  const scrittura = { id: "b90", kind: "write", values: ["doppi(voti)[0]"], newline: true };
  principale.body = soloFuori ? [scrittura] : [...principale.body, scrittura];
  return JSON.stringify(p);
};

test("eliminare una funzione che chiama sé stessa: le chiamate dentro di lei non si contano né si elencano, perché spariscono con lei", async () => {
  // Il fattoriale: «fatt» è chiamata dal programma principale (b2) e da sé stessa (b7).
  await apriLaFinestra(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-4", "fattoriale.algo"), "utf8"), "fattoriale.algo");
  await mostra("f2");
  await dalMenuDellaScheda("f2", "elimina");
  const testo = finestra()!.textContent!;
  expect({ una: testo.includes(testi.eliminaFunzioneChiamataUna), principale: testo.includes(`${testi.schedaPrincipale}: `), sua: testo.includes("fatt: ") }).toEqual({ una: true, principale: true, sua: false });
});

test("eliminare una funzione vettore: il titolo conta le sole chiamate nelle assegnazioni, che si tolgono; senza nessuna la spunta non c'è", async () => {
  await apriLaFinestra(vettoreConUnaScrittura(false), "vettore.algo");
  await mostra("f2");
  await dalMenuDellaScheda("f2", "elimina");
  // Chiamata in due blocchi (l'assegnazione e la Scrittura), ma se ne toglie uno solo.
  expect(finestra()!.textContent).toContain(riempi(testi.eliminaFunzioneChiamata, { n: "2" }));
  await clic(finestra()!.querySelector("[data-spunta]")!);
  await clic(pulsante(testi.eliminaFunzioneConferma, finestra()!)!);
  await giro();
  expect(finestra()!.querySelector('[data-passo="globale"]')?.textContent).toBe(testi.eliminaGlobaleUna);
  await clic(pulsante(testi.eliminaGlobaleConferma, finestra()!)!);
  await giro();
  // Tolta l'assegnazione, la Scrittura resta con la chiamata (un errore da correggere).
  const p = await salvato();
  expect([p.functions.map((x) => x.id), p.functions[0]!.body.map((b) => b.id)]).toEqual([["f1"], ["b2", "b90"]]);
  await annulla();
  cleanup();
  // Solo nella Scrittura: niente da togliere, e la spunta non c'è.
  await apriLaFinestra(vettoreConUnaScrittura(true), "vettore.algo");
  await mostra("f2");
  await dalMenuDellaScheda("f2", "elimina");
  expect([finestra()!.textContent!.includes(testi.eliminaFunzioneChiamataUna), finestra()!.querySelector("[data-spunta]")]).toEqual([true, null]);
});
