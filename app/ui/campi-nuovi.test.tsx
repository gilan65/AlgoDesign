// L'elemento appena nato, coi campi vuoti, nella finestra vera sotto happy-dom (senza guscio: il progetto nuovo
// dell'avvio):
// - un blocco appena inserito, nei due modi dei campi (riquadro e pannello): all'apertura nessun errore né avviso nei
//   campi, nella riga di stato o sul blocco; la prima conferma con l'errore lascia aperti i campi e lo mostra in tutti e
//   tre i posti; la seconda conferma; il blocco che c'era già, riaperto, lo mostra da subito;
// - un dato appena aggiunto, nella scheda: nessun errore all'apertura né mentre si scrive un nome sbagliato; alla
//   conferma i campi restano e lo mostrano, alla seconda il dato ha il suo segno; nelle celle la riga del dato nuovo non
//   ha segno finché il fuoco non la lascia;
// - il «?» dei campi: a richiesta mostra che cosa scrivere nei campi di quel genere di blocco, e del dato.
//
// Che cosa NON guarda: l'aspetto del «?» (20 px, centrato sui comandi); i campi dei cicli e
// gli altri generi (un testo per genere, dalla stessa tabella: qui l'assegnazione e il dato); i motori.
import { beforeAll, expect, test } from "bun:test";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { it } from "../i18n/it";
import { Applicazione } from "./Applicazione";
import { scelteIniziali, type Scelte } from "./preferenze";

const misura = (t: string) => [...t].length * 10;
// La finestra senza guscio, in qualunque ordine girino i file: una prova prima, nello stesso processo, può aver lasciato
// il guscio simulato senza `invoke` (`clearMocks`), e la finestra crederebbe di averne uno.
beforeAll(() => {
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));

async function avvia(scelte: Partial<Scelte> = {}): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={{ ...scelteIniziali, ...scelte }} />);
  });
  await giro();
}

/** I campi aperti di un blocco, e le loro segnalazioni. */
const campiDelBlocco = () => document.querySelector<HTMLFormElement>("form[aria-label^='Modifica di']");
const segnalazioniDelBlocco = () => [...(campiDelBlocco()?.querySelectorAll(`ul[aria-label="${it.segnalazioniDelBlocco}"] li`) ?? [])].map((l) => l.textContent);
/** Le voci della riga di stato (l'elenco c'è anche chiuso), e i blocchi segnati con un errore. */
const vociDelControllo = () => [...document.querySelectorAll(`ul[aria-label="${it.elencoDelControllo}"] li`)].map((l) => l.textContent);
const bloccoConErrore = () => document.querySelectorAll('[data-blocco][aria-invalid="true"]').length;

/** Un'assegnazione nuova dal primo «+», come l'utente: la pressione e il clic sul «+», poi la voce dell'elenco. */
async function inserisciUnAssegnazione(): Promise<void> {
  const punto = document.querySelector<SVGGElement>("[data-punto]")!;
  await act(async () => {
    fireEvent.pointerDown(punto);
    fireEvent.click(punto);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: it.bloccoAssegnazione }));
  });
  await giro();
}

async function invio(campo: Element): Promise<void> {
  await act(async () => {
    fireEvent.keyDown(campo, { key: "Enter" });
  });
  await giro();
}

for (const modo of ["riquadro", "pannello"] as const)
  test(`un blocco appena inserito (campi nel ${modo}) non mostra errori finché non si conferma; la prima conferma li mostra e lascia aperti i campi, la seconda conferma`, async () => {
    await avvia({ modoDeiBlocchi: modo });
    await inserisciUnAssegnazione();
    expect(campiDelBlocco()).not.toBeNull();
    expect({ campi: segnalazioniDelBlocco(), stato: vociDelControllo(), segnati: bloccoConErrore() }).toEqual({ campi: [], stato: [], segnati: 0 });

    const destinazione = within(campiDelBlocco()!).getByRole("textbox", { name: it.campoDestinazione });
    await invio(destinazione);
    expect(campiDelBlocco()).not.toBeNull();
    expect(segnalazioniDelBlocco().length).toBeGreaterThan(0);
    expect(segnalazioniDelBlocco()[0]).toStartWith("Errore:");
    expect(vociDelControllo().length).toBeGreaterThan(0);
    expect(bloccoConErrore()).toBe(1);

    await invio(within(campiDelBlocco()!).getByRole("textbox", { name: it.campoDestinazione }));
    expect(campiDelBlocco()?.outerHTML ?? null).toBeNull();
    expect(bloccoConErrore()).toBe(1);

    // Il blocco che c'era già: riaperto, mostra l'errore da subito.
    await act(async () => {
      fireEvent.doubleClick(document.querySelector('[data-blocco][aria-invalid="true"]')!);
    });
    await giro();
    expect(segnalazioniDelBlocco().length).toBeGreaterThan(0);
  });

test("il «?» dei campi di un blocco mostra, a richiesta, che cosa scrivere; un secondo clic lo nasconde", async () => {
  await avvia();
  await inserisciUnAssegnazione();
  const guida = () => campiDelBlocco()?.querySelector("[data-guida]")?.textContent ?? null;
  const aiuto = within(campiDelBlocco()!).getByRole("button", { name: it.suggerimenti });
  expect([guida(), aiuto.getAttribute("aria-expanded")]).toEqual([null, "false"]);
  await act(async () => {
    fireEvent.click(aiuto);
  });
  expect([guida(), aiuto.getAttribute("aria-expanded")]).toEqual([it.guidaAssegnazione, "true"]);
  // Il clic sul «?» non conferma i campi: niente errori, i campi aperti.
  expect(segnalazioniDelBlocco()).toEqual([]);
  await act(async () => {
    fireEvent.click(aiuto);
  });
  expect(guida()).toBeNull();
});

/** La scheda del dato aperta, e le sue segnalazioni. */
const schedaDelDato = () => document.querySelector<HTMLFormElement>(`form[aria-label="${it.modificaDelDato.replace("{nome}", it.datoSenzaNome)}"]`);
const segnalazioniDelDato = () => [...document.querySelectorAll(`ul[aria-label="${it.segnalazioniDelDato}"] li`)].map((l) => l.textContent);
const righeSegnate = () => document.querySelectorAll('tr[data-dato][data-segno="errore"]').length;

async function aggiungiUnDato(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: it.aggiungiDato }));
  });
  await giro();
}

test("un dato appena aggiunto, nella scheda: nessun errore all'apertura né scrivendo un nome sbagliato; la prima conferma lo mostra, la seconda conferma", async () => {
  await avvia();
  await aggiungiUnDato();
  expect(schedaDelDato()).not.toBeNull();
  expect({ campi: segnalazioniDelDato(), stato: vociDelControllo(), righe: righeSegnate() }).toEqual({ campi: [], stato: [], righe: 0 });
  const nome = within(schedaDelDato()!).getByRole("textbox", { name: it.datiNome });
  await act(async () => {
    fireEvent.change(nome, { target: { value: "1a" } });
  });
  await giro();
  expect({ campi: segnalazioniDelDato(), stato: vociDelControllo(), righe: righeSegnate() }).toEqual({ campi: [], stato: [], righe: 0 });

  await invio(nome);
  expect(document.querySelector("form")).not.toBeNull();
  expect(segnalazioniDelDato().length).toBeGreaterThan(0);
  expect(vociDelControllo().length).toBeGreaterThan(0);
  expect(righeSegnate()).toBe(1);

  await invio(document.querySelector("form input")!);
  expect(document.querySelector("form")?.outerHTML ?? null).toBeNull();
  expect(righeSegnate()).toBe(1);
});

test("il «?» della scheda di un dato mostra che cosa scrivere nei campi", async () => {
  await avvia();
  await aggiungiUnDato();
  await act(async () => {
    fireEvent.click(within(schedaDelDato()!).getByRole("button", { name: it.suggerimenti }));
  });
  expect(schedaDelDato()!.querySelector("[data-guida]")?.textContent).toBe(it.guidaDato);
});

test("un dato appena aggiunto, nelle celle: la riga non ha segno finché il fuoco non la lascia", async () => {
  await avvia({ modoDeiDati: "celle" });
  await aggiungiUnDato();
  const riga = document.querySelector<HTMLTableRowElement>('tr[data-dato="dati-0"]')!;
  expect(riga.contains(document.activeElement)).toBe(true);
  expect({ stato: vociDelControllo(), segno: riga.getAttribute("data-segno") }).toEqual({ stato: [], segno: null });
  await act(async () => {
    fireEvent.blur(document.activeElement!, { relatedTarget: screen.getByRole("button", { name: it.aggiungiDato }) });
  });
  await giro();
  expect(document.querySelector('tr[data-dato="dati-0"]')!.getAttribute("data-segno")).toBe("errore");
  expect(vociDelControllo().length).toBeGreaterThan(0);
});
