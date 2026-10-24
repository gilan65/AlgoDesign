// Il salto a una procedura e i casi d'uso di una procedura o di una funzione nella finestra vera sotto happy-dom, sul
// programma di riferimento con le funzioni (`casi/tappa-3/riferimento-media-voti-funzioni.algo`: `leggi_numero` f2 con
// `rif numero`, `valido` f3, `stelle` f4 con `quante`; il salto `b1` chiama `leggi_numero(n)`, il salto `b13`
// `stelle(somma / contati)`), aperto come file dato all'avvio:
// - «Procedura» nell'elenco del «+», prima di «Commento», anche nel flowchart di una funzione;
// - i campi del salto: l'elenco delle procedure, un campo per parametro col nome e com'è ricevuto; un'altra procedura
//   scelta parte con gli argomenti vuoti, quella di prima riscelta ritrova i suoi; confermati, un passo, e Annulla riporta
//   procedura e argomenti; un argomento oltre la firma si toglie con la ×; il nome del salto per gli ausili dice *rif*;
// - «Nuova procedura…» nei campi: la finestra della sola procedura, poi il salto la chiama e la sua scheda si mostra, in un
//   passo che Annulla toglie tutto;
// - la fine di una funzione: il doppio clic o Invio aprono il campo di ciò che restituisce, Esc lo chiude senza passi;
// - i casi d'uso nella scheda di una procedura o di una funzione: i suoi, non quelli del programma; un caso nuovo con una
//   voce per parametro, la voce senza valore di un parametro per riferimento, «Esegui tutti» coi pallini; «Esegui» su un
//   caso di una funzione dice perché non si esegue nella finestra; il file salvato coi casi dentro la funzione.
//
// Che cosa NON guarda: i gesti veri nei motori e la costruzione del riferimento coi clic (`e2e/costruzione.e2e.ts`); le
// operazioni del nucleo (`core/modifica/operazioni.test.ts`); i campi del salto in inglese (lo stesso componente, i testi
// del dizionario).
import { afterAll, afterEach, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
const PERCORSO = "C:\\corpus\\funzioni.algo";

let datoAllAvvio = RIFERIMENTO;
const scritti: { percorso: string; testo: string }[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return PERCORSO;
      case "leggi_progetto":
        return datoAllAvvio;
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
async function apriLaFinestra(testo = RIFERIMENTO): Promise<void> {
  datoAllAvvio = testo;
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta("il file aperto", () => avviso() === riempi(testi.apertoIl, { file: "funzioni.algo" }));
}
const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));
const annulla = async () => {
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
};
/** «Salva» (il file è legato al percorso dato all'avvio): il progetto scritto. */
async function salvato(): Promise<Progetto> {
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("il file scritto", () => scritti.length > prima);
  const a = apri(scritti.at(-1)!.testo);
  if (!a.ok) throw new Error("il file salvato non si apre");
  return a.progetto;
}
const salto = (p: Progetto, id: string) => {
  const cerca = (bs: readonly unknown[]): unknown => {
    for (const b of bs as { id: string; then?: unknown[]; else?: unknown[]; body?: unknown[] }[]) {
      if (b.id === id) return b;
      const x = cerca([...(b.then ?? []), ...(b.else ?? []), ...(b.body ?? [])]);
      if (x) return x;
    }
    return undefined;
  };
  return cerca(p.functions.flatMap((f) => f.body)) as { callee: string; arguments: string[] } | undefined;
};

async function mostra(id: string): Promise<void> {
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector(`[data-elenco] [data-voce-funzione="${id}"]`)!);
  await giro();
}
/** Le voci dell'elenco del «+» sul primo punto del flowchart mostrato, poi l'elenco richiuso con Esc. */
async function vociDelPiu(): Promise<string[]> {
  const punto = document.querySelector<SVGGElement>("[data-punto]")!;
  await act(async () => {
    fireEvent.pointerDown(punto);
    fireEvent.click(punto);
  });
  await giro();
  const voci = screen.getAllByRole("menuitem").map((v) => v.textContent ?? "");
  await tasto(screen.getByRole("menu"), "Escape");
  return voci;
}
const campiDelBlocco = () => document.querySelector<HTMLFormElement>("form[aria-label^='Modifica di']");
/** I campi del salto aperti: la procedura scelta e, per ogni campo di testo, l'etichetta e il valore. */
const campiDelSalto = () => {
  const f = campiDelBlocco();
  if (!f) return null;
  return {
    procedura: f.querySelector<HTMLSelectElement>("[data-campo-procedura]")?.value ?? null,
    campi: [...f.querySelectorAll("label")].filter((l) => l.querySelector("input")).map((l) => `${l.querySelector("span")?.textContent}=${l.querySelector("input")!.value}`),
  };
};
const scegli = async (procedura: string) => {
  await act(async () => void fireEvent.change(campiDelBlocco()!.querySelector("[data-campo-procedura]")!, { target: { value: procedura } }));
  await giro();
};
const scrivi = async (input: Element, valore: string) => {
  await act(async () => void fireEvent.change(input, { target: { value: valore } }));
  await giro();
};
const apriIlBlocco = async (id: string) => {
  await act(async () => void fireEvent.doubleClick(document.querySelector(`[data-blocco="${id}"]`)!));
  await giro();
};

test("«Procedura» è nell'elenco del «+», prima di «Commento», anche nel flowchart di una funzione", async () => {
  await apriLaFinestra();
  const nelProgramma = await vociDelPiu();
  expect(nelProgramma.slice(-2)).toEqual([testi.bloccoProcedura, testi.bloccoCommento]);
  await mostra("f3");
  expect((await vociDelPiu()).slice(-2)).toEqual([testi.bloccoProcedura, testi.bloccoCommento]);
});

test("i campi del salto: le procedure, un campo per parametro; un'altra procedura parte vuota e quella di prima ritrova i suoi; Annulla riporta tutto", async () => {
  await apriLaFinestra();
  // Il nome per gli ausili: l'argomento per uscita con la sua parola davanti.
  expect(document.querySelector('[data-blocco="b1"]')?.getAttribute("aria-label")).toContain(`leggi_numero(${testi.disegnoOut} n)`);
  await apriIlBlocco("b13");
  const elenco = [...campiDelBlocco()!.querySelectorAll("[data-campo-procedura] option")].map((o) => o.textContent);
  expect(elenco).toEqual(["leggi_numero", "stelle", testi.nuovaProcedura]);
  expect(campiDelSalto()).toEqual({ procedura: "stelle", campi: [`${riempi(testi.campoParametroValore, { nome: "quante" })}=somma / contati`] });
  await scegli("leggi_numero");
  expect(campiDelSalto()).toEqual({ procedura: "leggi_numero", campi: [`${riempi(testi.campoParametroUscita, { nome: "numero" })}=`] });
  await scegli("stelle");
  expect(campiDelSalto()!.campi).toEqual([`${riempi(testi.campoParametroValore, { nome: "quante" })}=somma / contati`]);
  await scegli("leggi_numero");
  await scrivi(campiDelBlocco()!.querySelector("input")!, "contati");
  await tasto(campiDelBlocco()!.querySelector("input")!, "Enter");
  await giro();
  expect(campiDelBlocco()?.outerHTML ?? null).toBeNull();
  expect(salto(await salvato(), "b13")).toMatchObject({ callee: "leggi_numero", arguments: ["contati"] });
  await annulla();
  expect(salto(await salvato(), "b13")).toMatchObject({ callee: "stelle", arguments: ["somma / contati"] });
});

test("un argomento oltre la firma è in un campo suo e si toglie con la ×", async () => {
  const p = JSON.parse(RIFERIMENTO);
  p.functions[0].body[2].then[2].arguments = ["somma / contati", "1"];
  await apriLaFinestra(JSON.stringify(p));
  await apriIlBlocco("b13");
  expect(campiDelSalto()!.campi).toEqual([`${riempi(testi.campoParametroValore, { nome: "quante" })}=somma / contati`, `${riempi(testi.campoArgomentoInPiu, { n: "2" })}=1`]);
  await clic(screen.getByRole("button", { name: riempi(testi.togliArgomento, { n: "2" }) }));
  await tasto(campiDelBlocco()!.querySelector("input")!, "Enter");
  await giro();
  expect(salto(await salvato(), "b13")?.arguments).toEqual(["somma / contati"]);
});

test("«Nuova procedura…»: la finestra della sola procedura, poi il salto la chiama e la sua scheda si mostra; Annulla toglie tutto in un passo", async () => {
  await apriLaFinestra();
  await apriIlBlocco("b13");
  await scegli("+nuova");
  const finestra = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect([finestra.querySelector("h2")?.textContent, finestra.querySelectorAll("[data-genere]").length]).toEqual([testi.funzioneNuovaProceduraTitolo, 0]);
  await scrivi(finestra.querySelector('[data-campo="nome"]')!, "saluta");
  await act(async () => void fireEvent.submit(finestra.querySelector("form")!));
  await giro();
  const dopo = await salvato();
  // Gli argomenti scritti per `stelle` non sono della procedura nuova, che non ha parametri.
  expect([salto(dopo, "b13")?.callee, salto(dopo, "b13")?.arguments, dopo.functions.at(-1)?.name, dopo.functions.at(-1)?.kind]).toEqual(["saluta", [], "saluta", "procedure"]);
  expect(document.querySelector('[data-scheda][aria-selected="true"]')?.textContent).toContain("saluta");
  await annulla();
  const prima = await salvato();
  expect([salto(prima, "b13")?.callee, prima.functions.some((f) => f.name === "saluta")]).toEqual(["stelle", false]);
});

test("la fine di una funzione si apre: ciò che restituisce, con gli operatori della lingua, un passo che Annulla riporta", async () => {
  await apriLaFinestra();
  await mostra("f3");
  const fine = document.querySelector('[data-restituisce="b22"]')!;
  expect(fine.getAttribute("aria-label")).toBe(riempi(testi.nomeDelBlocco, { genere: testi.bloccoRestituisce, testo: "voto >= 1 and voto <= 10" }));
  // Una procedura non ha la voce.
  await mostra("f2");
  expect(document.querySelectorAll("[data-restituisce]").length).toBe(0);
  await mostra("f3");
  await act(async () => void fireEvent.doubleClick(document.querySelector('[data-restituisce="b22"]')!));
  await giro();
  const campo = () => campiDelBlocco()!.querySelector("input")!;
  expect(campo().value).toBe("voto >= 1 and voto <= 10");
  await scrivi(campo(), "valore_assoluto voto <= 10");
  await tasto(campo(), "Enter");
  await giro();
  expect(campiDelBlocco()?.outerHTML ?? null).toBeNull();
  const f3 = (p: Progetto) => p.functions.find((f) => f.id === "f3")!.end.return_value;
  expect(f3(await salvato())).toBe("absolute_value voto <= 10");
  await annulla();
  expect(f3(await salvato())).toBe("voto >= 1 and voto <= 10");
  // Invio sulla voce la apre come il doppio clic; Esc la chiude senza passi.
  await tasto(document.querySelector('[data-restituisce="b22"]')!, "Enter");
  await giro();
  expect(campo().value).toBe("voto >= 1 and voto <= 10");
  await scrivi(campo(), "falso");
  await tasto(campo(), "Escape");
  await giro();
  expect(f3(await salvato())).toBe("voto >= 1 and voto <= 10");
});

test("un errore su ciò che una funzione restituisce segna la sua fine, e la voce della riga di stato porta lì", async () => {
  const p = JSON.parse(RIFERIMENTO);
  p.functions.find((f: { id: string }) => f.id === "f3").end.return_value = "voto + 1";
  await apriLaFinestra(JSON.stringify(p));
  // Dal programma principale: la voce dell'errore mostra la scheda di `valido` e dà il fuoco alla sua fine.
  await clic(screen.getByRole("button", { name: testi.statoMostra }));
  const voce = [...document.querySelectorAll(`[aria-label="${testi.elencoDelControllo}"] button`)].find((b) => b.textContent?.includes("valido"))!;
  await clic(voce);
  await aspetta("la fine col fuoco", () => document.activeElement?.getAttribute("data-restituisce") === "b22");
  const fine = document.querySelector('[data-restituisce="b22"]')!;
  expect([fine.getAttribute("aria-invalid"), fine.querySelector("[data-segno]")?.getAttribute("data-segno")]).toEqual(["true", "errore"]);
  expect(document.getElementById(fine.getAttribute("aria-describedby")!)?.textContent).toContain(testi.segnalazioneErrore.split("{")[0]!.trim());
  // Controllo positivo: la fine giusta non ha il segno.
  cleanup();
  await apriLaFinestra();
  await mostra("f3");
  const giusta = document.querySelector('[data-restituisce="b22"]')!;
  expect([giusta.getAttribute("aria-invalid"), giusta.querySelector("[data-segno]")]).toEqual([null, null]);
});

test("i casi d'uso di una procedura con un vettore per uscita: la voce di quel vettore senza «in ogni elemento», e una voce nuova parte dal parametro che si chiede", async () => {
  const uscita = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", "ogni-tipo-per-uscita.algo"), "utf8"));
  // `riempi` con un parametro per valore dopo quelli per uscita: la voce nuova parte da lui, non dal primo per uscita.
  const riempiDati: { parameter?: string }[] = uscita.functions[1].data;
  const ultimoParametro = riempiDati.map((d) => d.parameter !== undefined).lastIndexOf(true);
  uscita.functions[1].data = [...riempiDati.slice(0, ultimoParametro + 1), { name: "k", type: "integer", parameter: "value" }, ...riempiDati.slice(ultimoParametro + 1)];
  uscita.functions[0].body = uscita.functions[0].body.map((b: { kind: string; arguments?: string[] }) => (b.kind === "call" ? { ...b, arguments: [...b.arguments!, "1"] } : b));
  await apriLaFinestra(JSON.stringify(uscita));
  await clic(screen.getByRole("tab", { name: new RegExp(`^${testi.schedaCasi.split("(")[0]}`) }));
  await mostra("f2");
  await clic(document.querySelector("[data-aggiungi-caso]")!);
  await giro();
  const campi = () => document.querySelector<HTMLFormElement>("[data-campi-caso]")!;
  const dati = () => [...campi().querySelectorAll("select")].map((s) => (s as HTMLSelectElement).value);
  const prima = dati();
  await clic(screen.getByRole("button", { name: testi.casoAggiungiValore }));
  const nuova = dati().at(-1);
  // La voce va al vettore per uscita (una lettura lo può ricevere): nessuna casella «in ogni elemento».
  const ultima = campi().querySelectorAll("select")[dati().length - 1]!;
  await act(async () => void fireEvent.change(ultima, { target: { value: "v" } }));
  expect({ prima, nuova, caselle: campi().querySelectorAll('input[type="checkbox"]').length }).toEqual({ prima: ["k"], nuova: "k", caselle: 0 });
});

test("i casi d'uso nella scheda di una procedura: i suoi, una voce per parametro (nessuna per uscita), «Esegui tutti», il file", async () => {
  await apriLaFinestra();
  const linguetta = (n: number) => screen.getByRole("tab", { name: riempi(testi.schedaCasi, { n: String(n) }) });
  await clic(linguetta(1));
  const nomi = () => [...document.querySelectorAll("tr[data-caso] [data-nome-caso]")].map((x) => x.textContent);
  expect(nomi()).toEqual(["riferimento-media-voti-funzioni"]);
  // La scheda di `stelle`: il suo caso; uno nuovo con la voce di `quante`.
  await mostra("f4");
  expect([document.querySelector('[role="tablist"] [aria-selected="true"]')?.textContent, nomi()]).toEqual([riempi(testi.schedaCasi, { n: "1" }), ["tre stelle"]]);
  expect(document.body.textContent).toContain(testi.casiPremessaFunzione);
  await clic(document.querySelector("[data-aggiungi-caso]")!);
  await giro();
  const campi = () => document.querySelector<HTMLFormElement>("[data-campi-caso]")!;
  expect([...campi().querySelectorAll("select")].map((s) => (s as HTMLSelectElement).value)).toEqual(["quante"]);
  await scrivi(campi().querySelector(`input[aria-label="${riempi(testi.casoTestoDelValore, { n: "1" })}"]`)!, "2");
  await scrivi(campi().querySelector("textarea")!, "**\n");
  await tasto(campi().querySelector("input")!, "Enter");
  await giro();
  // La scheda di `leggi_numero`: il parametro per uscita non ha voce; un caso con le due letture.
  await mostra("f2");
  expect(nomi()).toEqual([]);
  await clic(document.querySelector("[data-aggiungi-caso]")!);
  await giro();
  expect(campi().querySelectorAll("select").length).toBe(0);
  for (const valore of ["0", "4"]) {
    await clic(screen.getByRole("button", { name: testi.casoAggiungiValore }));
    const testi_ = campi().querySelectorAll<HTMLInputElement>("input[type=text]");
    await scrivi(testi_[testi_.length - 1]!, valore);
  }
  // Le letture vogliono un valore: nessuna casella «senza valore».
  expect(campi().querySelectorAll('input[type="checkbox"]').length).toBe(0);
  await scrivi(campi().querySelector("textarea")!, "Numero non valido: da 1 a 30\n\nnumero = 4\n");
  await tasto(campi().querySelector("input")!, "Enter");
  await giro();
  await clic(screen.getByRole("button", { name: testi.eseguiTutti }));
  await aspetta("il caso eseguito", () => document.querySelector('tr[data-caso="0"] [data-esito]')?.getAttribute("data-esito") !== "mai");
  expect(document.querySelector('tr[data-caso="0"] [data-esito]')?.getAttribute("data-esito")).toBe("raggiunto");
  // «Esegui» sul caso di una funzione: si esegue nella colonna, e l'esito è lo stesso.
  await clic(document.querySelector('tr[data-caso="0"] [data-esegui-caso="tutto"]')!);
  await aspetta("il caso eseguito nella colonna", () => document.querySelector("[data-esito-del-caso]") !== null);
  expect(avviso()).toBe(riempi(testi.esitoDelCasoRaggiunto, { nome: riempi(testi.nomeDelCasoNuovo, { n: "1" }) }));
  expect(document.querySelector('tr[data-caso="0"] [data-esito]')?.getAttribute("data-esito")).toBe("raggiunto");
  const p = await salvato();
  const casi = (nome: string) => p.functions.find((f) => f.name === nome)?.test_cases;
  expect(casi("leggi_numero")).toEqual([
    { name: riempi(testi.nomeDelCasoNuovo, { n: "1" }), inputs: [{ data: "numero", text: "0" }, { data: "numero", text: "4" }], expected: { output: "Numero non valido: da 1 a 30\n\nnumero = 4\n" } },
  ]);
  expect(casi("stelle")?.map((c) => [c.name, c.inputs, c.expected.output])).toEqual([
    ["tre stelle", [{ data: "quante", text: "3" }], "***\n"],
    [riempi(testi.nomeDelCasoNuovo, { n: "2" }), [{ data: "quante", text: "2" }], "**\n"],
  ]);
  expect(p.test_cases?.map((c) => c.name)).toEqual(["riferimento-media-voti-funzioni"]);
});
