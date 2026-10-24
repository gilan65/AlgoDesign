// La vista dei dati di una procedura o di una funzione nella finestra vera sotto happy-dom, sul programma di riferimento con
// le funzioni (`casi/tappa-3/riferimento-media-voti-funzioni.algo`: `valido` f3, `stelle` f4 col salto `b13` che la chiama),
// con tre aggiunte scritte qui: la costante comune `VOTO_MASSIMO` (la usano `valido` e il programma principale), la costante
// `SOGLIA` del programma principale, il secondo parametro `simbolo` di `stelle` (il salto gli passa '*'):
// - la tabella «Parametri» sopra i dati, con la posizione, la natura e ciò che una funzione restituisce; nessuna nel
//   programma principale;
// - creare un parametro dal pulsante e dalla natura (un dato diventa un parametro); rinunciare a un parametro appena nato;
// - il menu del dato su un parametro: «Duplica» spento, spostare che scambia gli argomenti del salto, eliminare con la
//   conferma che conta le chiamate e la spunta che toglie l'argomento; Annulla dopo ognuno;
// - le costanti comuni in ogni scheda, che si cambiano anche da una funzione; la casella «globale» che porta una costante
//   fra le comuni, e tolta chiede se le altre funzioni la usano.
// Ogni esito si legge dal FILE SALVATO, non dalla tabella: un campo perso nel file fa rosso.
//
// Che cosa NON guarda: i gesti veri nei motori (`e2e/parametri.e2e.ts`); le operazioni del nucleo una per una
// (`core/modifica/funzioni.test.ts`); i campi della scheda da soli (`ui/dati/scheda.test.tsx`).
import { afterAll, afterEach, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apri } from "../../core/progetto/formato";
import type { Progetto } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

type Qualunque = any;
const misura = (t: string) => [...t].length * 10;
const PROGETTO = (() => {
  const p: Qualunque = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-3", "riferimento-media-voti-funzioni.algo"), "utf8"));
  p.shared_constants = [{ name: "VOTO_MASSIMO", type: "integer", constant: true, initial: "10" }];
  const [principale, , valido, stelle] = p.functions;
  principale.data.push({ name: "SOGLIA", type: "integer", constant: true, initial: "6" });
  principale.body[1].body[1].then[2].condition = "voto < SOGLIA";
  principale.body[1].body[1].else[0].values = ['"Voto ignorato (da 1 a "', "VOTO_MASSIMO", '"): "', "voto"];
  valido.end.return_value = "voto >= 1 and voto <= VOTO_MASSIMO";
  stelle.data.splice(1, 0, { name: "simbolo", type: "character", parameter: "value" });
  stelle.body[0].body[0].values = ["simbolo"];
  principale.body[2].then[2].arguments = ["somma / contati", "'*'"];
  return JSON.stringify(p, null, 2);
})();

const scritti: { percorso: string; testo: string }[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return "C:\\corpus\\dati.algo";
      case "leggi_progetto":
        if (argomenti.percorso !== "C:\\corpus\\dati.algo") throw new Error("file non trovato");
        return PROGETTO;
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
const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));
const scrivi = (e: Element, valore: string) => act(async () => void fireEvent.change(e, { target: { value: valore } }));
const annulla = async () => {
  await tasto(document.body, "z", { ctrlKey: true });
  await giro();
};

async function apriLaFinestra(): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta("aperto", () => avviso() === riempi(testi.apertoIl, { file: "dati.algo" }));
}
async function mostra(id: string): Promise<void> {
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector(`[data-elenco] [data-voce-funzione="${id}"]`)!);
  await giro();
}
/** Le tabelle della vista dei dati: la didascalia e i nomi delle righe (o la riga vuota), con la riga in fondo. */
const tabelle = () =>
  [...(document.querySelector("[data-aggiungi]")?.parentElement?.querySelectorAll("table") ?? [])].map((t) => {
    const righe = [...t.querySelectorAll("tbody tr")].map((r) => r.querySelector("th")?.textContent ?? r.textContent);
    const piede = t.querySelector("tfoot")?.textContent;
    return `${t.querySelector("caption")?.textContent}: ${righe.join(", ")}${piede ? ` [${piede}]` : ""}`;
  });
const riga = (chiave: string) => document.querySelector<HTMLElement>(`[data-dato="${chiave}"]`)!;
const campo = (nome: string) => document.querySelector<HTMLElement>(`form [aria-label="${nome}"]`)!;
const finestra = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
const pulsante = (testo: string, dentro: ParentNode = document) => [...dentro.querySelectorAll("button")].find((b) => b.textContent === testo);
/** Il menu della riga col tasto destro; le voci con la loro disponibilità. */
async function menuDi(chiave: string): Promise<HTMLElement> {
  await act(async () => void fireEvent.contextMenu(riga(chiave), { clientX: 30, clientY: 30 }));
  await giro();
  return document.querySelector<HTMLElement>('[role="menu"]')!;
}
const voci = (menu: HTMLElement) => [...menu.querySelectorAll("[data-voce]")].map((v) => `${v.getAttribute("data-voce")}${v.getAttribute("aria-disabled") ? " spenta" : ""}`);
/** Il progetto salvato con Ctrl+S, riletto. */
async function salvato(): Promise<Progetto> {
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("salvato", () => scritti.length > prima);
  const a = apri(scritti.at(-1)!.testo);
  if (!a.ok) throw new Error("illeggibile");
  return a.progetto;
}
const funzione = (p: Progetto, id: string) => p.functions.find((f) => f.id === id)!;
const argomenti = (p: Progetto) => (funzione(p, "f1").body[2] as Qualunque).then[2].arguments;

test("la tabella «Parametri» sopra i dati, con la posizione, la natura e ciò che una funzione restituisce", async () => {
  await apriLaFinestra();
  expect(tabelle()).toEqual([
    "Costanti comuni: riferimento-media-voti-funzioni: VOTO_MASSIMO",
    "Dati: riferimento-media-voti-funzioni: n, voto, media, contati, insufficienti, somma, i, SOGLIA",
  ]);
  await mostra("f4");
  expect(tabelle()).toEqual(["Costanti comuni: riferimento-media-voti-funzioni: VOTO_MASSIMO", "Parametri: stelle: quante, simbolo", "Dati: stelle: k"]);
  expect([...riga("dati-1").querySelectorAll("td")].map((c) => c.textContent)).toEqual(["2", testi.tipoCarattere, testi.naturaParametroValore]);
  await mostra("f3");
  expect(tabelle()).toEqual(["Costanti comuni: riferimento-media-voti-funzioni: VOTO_MASSIMO", `Parametri: valido: voto [${riempi(testi.restituisceUn, { tipo: testi.tipoBooleano })}]`, "Dati: valido: "]);
  // Senza parametri, la riga che lo dice.
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector('[data-elenco] [data-voce-funzione="f2"]')!);
  await giro();
  expect(tabelle()[1]).toBe("Parametri: leggi_numero: numero");
});

test("creare un parametro dal pulsante e dalla natura; rinunciare a un parametro appena nato non lascia passi", async () => {
  await apriLaFinestra();
  await mostra("f4");
  await clic(document.querySelector("[data-aggiungi-parametro]")!);
  await giro();
  // Rinunciare: sparisce, il fuoco torna sul pulsante.
  await tasto(campo(testi.datiNome), "Escape");
  await giro();
  expect(tabelle()[1]).toBe("Parametri: stelle: quante, simbolo");
  expect(document.activeElement?.getAttribute("data-aggiungi-parametro")).toBe("");
  await clic(document.querySelector("[data-aggiungi-parametro]")!);
  await giro();
  // Un parametro non ha valore iniziale né ruolo; la natura offre le cinque scelte di una procedura.
  expect([document.querySelector(`form [aria-label="${testi.datiIniziale}"]`)?.outerHTML ?? null, document.querySelector(`form [aria-label="${testi.datiRuolo}"]`)?.outerHTML ?? null]).toEqual([null, null]);
  expect([...(campo(testi.datiNatura) as HTMLSelectElement).options].map((o) => o.value)).toEqual(["value", "reference", "out", "variabile", "costante"]);
  await scrivi(campo(testi.datiNome), "altezza");
  await scrivi(campo(testi.datiNatura), "reference");
  await tasto(campo(testi.datiNome), "Enter");
  await giro();
  // Il dato di lavoro `k` diventa un parametro per valore: resta al suo posto fra i dati, quindi è il secondo parametro.
  await act(async () => void fireEvent.doubleClick(riga("dati-2")));
  await giro();
  await scrivi(campo(testi.datiNatura), "value");
  await tasto(campo(testi.datiNome), "Enter");
  await giro();
  expect(tabelle().slice(1)).toEqual(["Parametri: stelle: quante, simbolo, k, altezza", "Dati: stelle: "]);
  const p = await salvato();
  expect(funzione(p, "f4").data).toEqual([
    { name: "quante", type: "integer", parameter: "value" },
    { name: "simbolo", type: "character", parameter: "value" },
    { name: "k", type: "integer", parameter: "value" },
    { name: "altezza", type: "integer", parameter: "reference" },
  ]);
  // Una funzione non offre «per riferimento».
  await mostra("f3");
  await act(async () => void fireEvent.doubleClick(riga("dati-0")));
  await giro();
  expect([...(campo(testi.datiNatura) as HTMLSelectElement).options].map((o) => o.value)).toEqual(["value", "variabile", "costante"]);
});

test("il menu su un parametro: Duplica spento; spostare scambia gli argomenti del salto; Annulla li riporta", async () => {
  await apriLaFinestra();
  await mostra("f4");
  let menu = await menuDi("dati-0");
  expect(voci(menu)).toEqual(["elimina", "duplica spenta", "su spenta", "giu"]);
  await clic(menu.querySelector('[data-voce="giu"]')!);
  await giro();
  expect(tabelle()[1]).toBe("Parametri: stelle: simbolo, quante");
  const p = await salvato();
  expect(funzione(p, "f4").data.map((d) => d.name)).toEqual(["simbolo", "quante", "k"]);
  expect(argomenti(p)).toEqual(["'*'", "somma / contati"]);
  await annulla();
  const q = await salvato();
  expect(argomenti(q)).toEqual(["somma / contati", "'*'"]);
  // Un dato di lavoro: l'unico della sua tabella non si sposta, anche se sopra ha dei parametri.
  menu = await menuDi("dati-2");
  expect(voci(menu)).toEqual(["elimina", "duplica", "su spenta", "giu spenta"]);
  await tasto(menu, "Escape");
});

test("eliminare un parametro: la conferma conta le chiamate; Esc non elimina; con la spunta l'argomento se ne va", async () => {
  await apriLaFinestra();
  await mostra("f4");
  await clic((await menuDi("dati-1")).querySelector('[data-voce="elimina"]')!);
  await giro();
  const f = finestra()!;
  expect(f.textContent).toContain(riempi(testi.eliminaParametroTitolo, { nome: "simbolo" }));
  expect(f.textContent).toContain(riempi(testi.eliminaParametroChiamataUna, { nome: "stelle" }));
  const spunta = f.querySelector<HTMLInputElement>("[data-spunta]")!;
  expect(spunta.checked).toBe(false);
  await tasto(f, "Escape");
  await giro();
  expect(finestra()?.outerHTML ?? null).toBeNull();
  expect(tabelle()[1]).toBe("Parametri: stelle: quante, simbolo");
  await clic((await menuDi("dati-1")).querySelector('[data-voce="elimina"]')!);
  await giro();
  await clic(finestra()!.querySelector("[data-spunta]")!);
  await clic(pulsante(testi.eliminaConferma, finestra()!)!);
  await giro();
  const p = await salvato();
  expect(funzione(p, "f4").data.map((d) => d.name)).toEqual(["quante", "k"]);
  expect(argomenti(p)).toEqual(["somma / contati"]);
  // Senza la spunta le chiamate restano: dopo Annulla, elimina di nuovo.
  await annulla();
  await clic((await menuDi("dati-1")).querySelector('[data-voce="elimina"]')!);
  await giro();
  await clic(pulsante(testi.eliminaConferma, finestra()!)!);
  await giro();
  expect(argomenti(await salvato())).toEqual(["somma / contati", "'*'"]);
});

test("le costanti comuni si cambiano da una funzione; la casella «globale» le sposta, e tolta chiede", async () => {
  await apriLaFinestra();
  await mostra("f3");
  // Cambiata dalla scheda di `valido`: il valore e il nome, con le regole di ogni funzione.
  await act(async () => void fireEvent.doubleClick(riga("comuni-0")));
  await giro();
  expect((campo(testi.campoGlobale) as HTMLInputElement).checked).toBe(true);
  await scrivi(campo(testi.datiNome), "MASSIMO");
  await scrivi(campo(testi.datiIniziale), "9");
  await tasto(campo(testi.datiNome), "Enter");
  await giro();
  let p = await salvato();
  expect(p.shared_constants).toEqual([{ name: "MASSIMO", type: "integer", constant: true, initial: "9" }]);
  expect(funzione(p, "f3").end.return_value).toBe("voto >= 1 and voto <= MASSIMO");
  // Tolta la casella: la usa anche il programma principale, e la finestra lo dice.
  await act(async () => void fireEvent.doubleClick(riga("comuni-0")));
  await giro();
  await clic(campo(testi.campoGlobale));
  await tasto(campo(testi.datiNome), "Enter");
  await giro();
  expect(finestra()?.textContent).toContain(riempi(testi.comuneTogliSpiegazioneUna, { funzione: "valido", chi: `«${testi.schedaPrincipale}»` }));
  // «Lasciala comune»: nulla cambia.
  await tasto(finestra()!, "Escape");
  await giro();
  expect(tabelle()[0]).toBe("Costanti comuni: riferimento-media-voti-funzioni: MASSIMO");
  await act(async () => void fireEvent.doubleClick(riga("comuni-0")));
  await giro();
  await clic(campo(testi.campoGlobale));
  await tasto(campo(testi.datiNome), "Enter");
  await giro();
  await clic(pulsante(testi.comuneTogliConferma, finestra()!)!);
  await giro();
  p = await salvato();
  expect(p.shared_constants).toBeUndefined();
  expect(funzione(p, "f3").data.map((d) => d.name)).toEqual(["voto", "MASSIMO"]);
  await annulla();
  expect((await salvato()).shared_constants?.map((d) => d.name)).toEqual(["MASSIMO"]);
  // Messa a SOGLIA nel programma principale: va fra le comuni, senza domande.
  await clic(document.querySelector('[data-scheda="f1"]')!);
  await giro();
  await act(async () => void fireEvent.doubleClick(riga("dati-7")));
  await giro();
  expect((campo(testi.campoGlobale) as HTMLInputElement).checked).toBe(false);
  await clic(campo(testi.campoGlobale));
  await tasto(campo(testi.datiNome), "Enter");
  await giro();
  expect(finestra()?.outerHTML ?? null).toBeNull();
  p = await salvato();
  expect(p.shared_constants?.map((d) => d.name)).toEqual(["MASSIMO", "SOGLIA"]);
  expect(funzione(p, "f1").data.map((d) => d.name)).not.toContain("SOGLIA");
});

test("eliminare una costante comune che le regole usano chiede: Esc non elimina, la conferma elimina, Annulla la riporta", async () => {
  await apriLaFinestra();
  // `VOTO_MASSIMO` la usano una scrittura del programma e ciò che `valido` restituisce: due regole.
  await clic((await menuDi("comuni-0")).querySelector('[data-voce="elimina"]')!);
  await giro();
  expect(finestra()?.querySelector("h2")?.textContent ?? finestra()?.textContent ?? null).toContain(riempi(testi.eliminaDatoTitolo, { nome: "VOTO_MASSIMO" }));
  expect(finestra()?.textContent).toContain(riempi(testi.eliminaDatoUsato, { n: "2" }));
  await tasto(finestra()!, "Escape");
  await giro();
  expect(finestra()?.outerHTML ?? null).toBeNull();
  expect(tabelle()[0]).toBe("Costanti comuni: riferimento-media-voti-funzioni: VOTO_MASSIMO");
  await clic((await menuDi("comuni-0")).querySelector('[data-voce="elimina"]')!);
  await giro();
  await clic(pulsante(testi.eliminaConferma, finestra()!)!);
  await giro();
  expect((await salvato()).shared_constants).toBeUndefined();
  await annulla();
  expect((await salvato()).shared_constants?.map((d) => d.name)).toEqual(["VOTO_MASSIMO"]);
});
