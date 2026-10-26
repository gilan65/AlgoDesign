import { expect, test } from "bun:test";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { geometriaPredefinita } from "../core/disegno/tema";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { Applicazione } from "./Applicazione";
import { MINIMA } from "./disegno/VistaFlowchart";
import { scelteIniziali } from "./preferenze";
import { versione } from "./prodotto";

// La macchina a stati di Ark UI aggiorna React DOPO il montaggio e dopo ogni evento: un `act`
// asincrono attende anche quel giro. Con il solo `render`/`fireEvent` React avvisa di un aggiornamento
// fuori da `act`, e le asserzioni misurano l'istante prima del cambio.
// Happy-dom non ha il canvas: la misura del testo del disegno è una misura fissa, data dalla prova.
const misura = (t: string) => [...t].length * 10;

/** La finestra di dialogo aperta: si cerca dentro di lei e nella barra, mai nel documento intero (dove un
 * nome si calcola anche su ogni elemento del flowchart, e la prova diventa lenta). */
const finestraAperta = (titolo: string) => {
  const f = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((d) => within(d).queryByRole("heading", { name: titolo }) !== null);
  expect(f.length).toBe(1);
  return f[0]!;
};

/** Il nome che il riferimento ha nella cartella degli esempi: senza guscio la cartella è in memoria, e al
 * montaggio riceve gli esempi forniti col nome nella lingua dell'interfaccia. */
const RIFERIMENTO = it.esempioMediaVoti;

/** I fotogrammi e i timer in attesa (happy-dom), e gli aggiornamenti di React. */
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));

/** Una voce del menu «Aiuto»: la prima, «Guida…» (Inizio), la seconda, «Esempi…» (Inizio e una freccia), o l'ultima
 * (Fine): il menu si apre col clic sul suo pulsante e la voce si sceglie dalla tastiera (sotto happy-dom il clic su una
 * voce chiude il menu senza sceglierla). */
async function voceDellAiuto(voce: "guida" | "esempi" | "informazioni", testi = it): Promise<void> {
  await act(async () => {
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: testi.menuAiuto }));
  });
  await giro();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  for (const tasto of voce === "informazioni" ? ["End"] : voce === "guida" ? ["Home"] : ["Home", "ArrowDown"]) {
    await act(async () => {
      fireEvent.keyDown(menu, { key: tasto });
    });
    await giro();
  }
  expect(document.querySelector("[data-highlighted]")?.getAttribute("data-comando")).toBe(voce);
  await act(async () => {
    fireEvent.keyDown(menu, { key: "Enter" });
  });
  await giro();
}

/** I gruppi chiusi della finestra «Esempi», aperti uno per uno (i forniti stanno nei loro gruppi). */
async function apriIGruppi(finestra: HTMLElement): Promise<void> {
  for (const g of [...finestra.querySelectorAll<HTMLElement>('button[aria-expanded="false"]')])
    await act(async () => {
      fireEvent.click(g);
    });
}

/** L'esempio con quel nome, dalla finestra «Esempi». */
async function apriEsempio(nome: string, testi = it): Promise<void> {
  await voceDellAiuto("esempi", testi);
  await apriIGruppi(finestraAperta(testi.esempiTitolo));
  const riga = within(finestraAperta(testi.esempiTitolo))
    .getAllByRole("listitem")
    .find((r) => r.querySelector("strong")?.textContent === nome);
  expect(riga).toBeDefined();
  await act(async () => {
    fireEvent.click(within(riga!).getByRole("button", { name: testi.esempioApri }));
  });
}

/** Una scelta delle Impostazioni (nella prima scheda): la finestra si apre dalla barra, si sceglie la voce
 * e si conferma. I testi sono quelli della lingua in uso (`testi`). */
async function scegli(voce: string, testi = it): Promise<void> {
  await act(async () => {
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: testi.impostazioni }));
  });
  const finestra = finestraAperta(testi.impostazioniTitolo);
  await act(async () => {
    fireEvent.click(within(finestra).getByRole("radio", { name: voce }));
  });
  await act(async () => {
    fireEvent.click(within(finestra).getByRole("button", { name: testi.progettoConferma }));
  });
}

/** La finestra col progetto nuovo dell'avvio e poi, dagli esempi, il riferimento. */
async function mostra(): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  await apriEsempio(RIFERIMENTO);
}

test("la barra porta la classe del suo CSS Module, e il nome dell'app non c'è (sta nel titolo della finestra)", async () => {
  await mostra();
  // Si asserisce il NOME della classe: sotto `bun test` il plugin del preload la mappa su sé stessa.
  // Senza il plugin la classe sarebbe `undefined` e l'attributo mancherebbe.
  expect(screen.getByRole("banner").className).toBe("barra");
  expect(screen.queryByRole("heading", { level: 1 })?.outerHTML ?? null).toBeNull();
});

test("la lingua scelta nelle Impostazioni cambia i testi e la lingua del documento", async () => {
  await mostra();
  expect(within(screen.getByRole("banner")).getByRole("button", { name: it.impostazioni })).toBeTruthy();
  expect(screen.getByText(it.premessa)).toBeTruthy();

  await scegli("English");

  expect(within(screen.getByRole("banner")).getByRole("button", { name: en.impostazioni })).toBeTruthy();
  expect(screen.getByText(en.premessa)).toBeTruthy();
  expect(screen.queryByText(it.premessa)?.outerHTML ?? null).toBeNull();
  expect(document.documentElement.lang).toBe("en");
});

test("il riferimento si disegna e si trova per ruolo e nome; le sue parole seguono la lingua", async () => {
  await mostra();
  const flowchart = screen.getByRole("group", { name: `${it.flowchart}: ${RIFERIMENTO}` });
  const testi = () => [...flowchart.querySelectorAll("text")].map((t) => t.textContent);
  expect(testi()).toContain(it.disegnoInizio);
  expect(testi()).toContain("media ← converti_a_reale somma / converti_a_reale contati");
  await scegli("English");
  expect(testi()).toContain(en.disegnoInizio);
  expect(testi()).toContain("media ← to_real somma / to_real contati");
});

test("i dati del riferimento sono una tabella trovata per ruolo e nome, nella lingua dell'interfaccia", async () => {
  await mostra();
  const righe = (titolo: string) =>
    [...screen.getByRole("table", { name: `${titolo}: ${RIFERIMENTO}` }).querySelectorAll("tbody tr")].map((r) =>
      [...r.children].map((c) => c.textContent),
    );
  const italiane = righe(it.dati);
  expect(italiane).toHaveLength(8);
  // Il trattino si vede, «nessuno» lo legge il lettore di schermo.
  expect(italiane[0]).toEqual(["n", "intero", "variabile", "—nessuno", "input"]);
  expect(italiane[3]).toEqual(["contati", "intero", "variabile", "0", "output"]);
  // Nessuna costante comune nel riferimento: la seconda tabella non c'è.
  expect(screen.queryByRole("table", { name: new RegExp(it.costantiComuni) })?.outerHTML ?? null).toBeNull();
  await scegli("English");
  expect(righe(en.dati)[0]).toEqual(["n", "integer", "variable", "—none", "input"]);
  expect(screen.queryByRole("table", { name: `${it.dati}: ${RIFERIMENTO}` })?.outerHTML ?? null).toBeNull();
});

test("le due viste si trovano per ruolo e nome; il pulsante «Dati» chiude e riapre la vista dei dati", async () => {
  await mostra();
  const dati = screen.getByRole("region", { name: it.vistaDati });
  expect(dati.querySelector("table")).toBeTruthy();
  expect(screen.getByRole("region", { name: it.vistaFlowchart }).querySelector('svg[role="group"]')).toBeTruthy();
  const pulsante = screen.getByRole("button", { name: it.pannelloDati });
  expect(pulsante.getAttribute("aria-expanded")).toBe("true");
  expect(pulsante.getAttribute("aria-controls")).toBe(dati.id);
  expect(screen.getByRole("separator", { name: it.larghezzaPannello })).toBeTruthy();

  await act(async () => {
    fireEvent.click(pulsante);
  });
  expect(pulsante.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("region", { name: it.vistaDati })?.outerHTML ?? null).toBeNull();
  expect(screen.queryByRole("separator")?.outerHTML ?? null).toBeNull();
  expect(screen.getByRole("region", { name: it.vistaFlowchart })).toBeTruthy();

  await act(async () => {
    fireEvent.click(pulsante);
  });
  expect(screen.getByRole("region", { name: it.vistaDati })).toBeTruthy();
  await scegli("English");
  expect(screen.getByRole("region", { name: en.vistaDati })).toBeTruthy();
  expect(screen.getByRole("region", { name: en.vistaFlowchart })).toBeTruthy();
});

test("all'avvio un progetto nuovo; dalla finestra «Esempi» si apre ogni esempio, e flowchart e dati cambiano insieme", async () => {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  expect(screen.getByRole("group", { name: `${it.flowchart}: ${it.progettoSenzaNome}` })).toBeTruthy();
  expect(screen.getByRole("table", { name: `${it.dati}: ${it.progettoSenzaNome}` })).toBeTruthy();
  // I gruppi della barra in ordine di lavoro; l'ultimo, a destra, con «Impostazioni» e il menu «Aiuto».
  const gruppi = [...screen.getByRole("banner").querySelectorAll('[role="group"]')];
  expect(gruppi.map((g) => g.getAttribute("aria-label"))).toEqual([it.menuProgetto, it.modifica, it.esecuzione, it.gruppoViste, it.gruppoApplicazione]);
  expect([...gruppi.at(-1)!.querySelectorAll("button")].map((c) => c.querySelector("[data-testo]")?.textContent)).toEqual([it.impostazioni, it.menuAiuto]);

  await voceDellAiuto("esempi");
  // La cartella (in memoria) ha ricevuto i dodici esempi forniti nei loro tre gruppi, ognuno in ordine di nome del
  // file; quelli coi cicli, con le funzioni e con la ricorsione si aprono come gli altri.
  const perGruppo = [
    [it.esempioMediaVoti, it.esempioPariDispari, it.esempioPrimoQuadrato, it.esempioFattoriale],
    [it.esempioMediaVotiPer, it.esempioParolaAlContrario],
    [it.esempioMediaVotiFunzioni, it.esempioCopie, it.esempioTreLivelli, it.esempioFattorialeRicorsivo, it.esempioSequenzaDiFibonacci, it.esempioRicorsioneSenzaUscita],
  ];
  const forniti = perGruppo.flat();
  await apriIGruppi(finestraAperta(it.esempiTitolo));
  const nomi = within(finestraAperta(it.esempiTitolo))
    .getAllByRole("listitem")
    .map((v) => v.querySelector("strong")?.textContent);
  // In ordine di nome del FILE: «Media dei voti coi cicli per.algo» prima di «Media dei voti.algo» (lo spazio prima del
  // punto).
  expect(nomi).toEqual(perGruppo.flatMap((g) => g.map((n) => `${n}.algo`).sort().map((f) => f.slice(0, -".algo".length))));
  await act(async () => {
    fireEvent.keyDown(finestraAperta(it.esempiTitolo), { key: "Escape" });
  });

  for (const nome of forniti) {
    await apriEsempio(nome);
    expect(screen.getByRole("group", { name: `${it.flowchart}: ${nome}` })).toBeTruthy();
    expect(screen.getByRole("table", { name: `${it.dati}: ${nome}` })).toBeTruthy();
  }
  expect(screen.queryByRole("group", { name: `${it.flowchart}: ${RIFERIMENTO}` })?.outerHTML ?? null).toBeNull();
}, 60_000);

test("la forma delle condizioni lunghe si sceglie nelle Impostazioni e cambia il disegno", async () => {
  await mostra();
  // Con la misura fissa di questa prova (10 px a carattere) la condizione del riferimento è lunga.
  const condizione = () => {
    const testo = [...screen.getByRole("group", { name: `${it.flowchart}: ${RIFERIMENTO}` }).querySelectorAll('g[data-forma="condizione"] text')].find((t) =>
      t.textContent?.includes("voto <= 10"),
    );
    return [...testo!.querySelectorAll("tspan")].map((s) => s.textContent);
  };
  expect(condizione()).toEqual(["voto >= 1", "and voto <= 10"]);
  await scegli(it.condizioniUnaRiga);
  expect(condizione()).toEqual(["voto >= 1 and voto <= 10"]);
});

test("«Riduci» e «Adatta alla finestra» si fermano dove il carattere del disegno arriva a 5 px", async () => {
  await mostra();
  // Lo zoom nella riga di stato; la percentuale è il pulsante che torna al 100%.
  const zoom = within(screen.getByRole("region", { name: it.rigaDiStato })).getByRole("group", { name: it.zoom });
  const livello = () => zoom.querySelector('[data-comando="cento"]')?.textContent;
  const premi = async (comando: string) =>
    act(async () => {
      fireEvent.click(zoom.querySelector(`[data-comando="${comando}"]`)!);
    });
  // La scala minima è quella del carattere a 5 px, letta dal tema (15 px al 100%: 1/3, mostrata «33%»).
  expect(MINIMA * geometriaPredefinita.carattere).toBeCloseTo(5, 10);
  // Controllo positivo: il livello mostrato si muove con «Riduci».
  expect(livello()).toBe("100%");
  await premi("riduci");
  expect(livello()).toBe("80%");
  for (let i = 0; i < 20; i++) await premi("riduci");
  expect(livello()).toBe("33%");
  // «Adatta» in happy-dom misura un'area nulla: senza il fermo la scala andrebbe a 0.
  await premi("cento");
  expect(livello()).toBe("100%");
  await premi("adatta");
  expect(livello()).toBe("33%");
});

test("dopo «Adatta alla finestra» lo stesso pulsante torna allo zoom di prima; un altro comando dello zoom lo rimette com'era", async () => {
  await mostra();
  const zoom = within(screen.getByRole("region", { name: it.rigaDiStato })).getByRole("group", { name: it.zoom });
  const livello = () => zoom.querySelector('[data-comando="cento"]')?.textContent;
  const adatta = () => zoom.querySelector<HTMLButtonElement>('[data-comando="adatta"]')!;
  const premi = async (comando: string) =>
    act(async () => {
      fireEvent.click(zoom.querySelector(`[data-comando="${comando}"]`)!);
    });
  await premi("riduci");
  expect(livello()).toBe("80%");
  expect(adatta().textContent).toBe(it.zoomAdatta);
  await premi("adatta");
  // In happy-dom l'area è nulla: «Adatta» arriva alla scala minima (33%).
  expect(livello()).toBe("33%");
  // Il pulsante cambia nome (non diventa un interruttore premuto: il nome dice che cosa fa).
  expect(adatta().textContent).toBe(it.zoomTornaIndietro);
  // Il nome corto; al passaggio del puntatore, a che cosa si torna.
  expect(adatta().getAttribute("title")).toBe(it.zoomTornaIndietroSuggerimento);
  await premi("adatta");
  expect(livello()).toBe("80%");
  expect(adatta().textContent).toBe(it.zoomAdatta);
  // Adattata e poi ingrandita: la scala di prima non vale più, il pulsante adatta di nuovo.
  await premi("adatta");
  await premi("ingrandisci");
  expect(adatta().textContent).toBe(it.zoomAdatta);
  await premi("adatta");
  expect(livello()).toBe("33%");
});

test("la forma delle condizioni data all'avvio vale da subito, e le Impostazioni la mostrano", async () => {
  await act(async () => {
    render(<Applicazione linguaIniziale="en" scelteIniziali={{ ...scelteIniziali, condizioni: "su-una-riga" }} misura={misura} />);
  });
  await act(async () => {
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: en.impostazioni }));
  });
  expect(within(finestraAperta(en.impostazioniTitolo)).getByRole<HTMLInputElement>("radio", { name: en.condizioniUnaRiga }).checked).toBe(true);
});

test("un avviso sopra il flowchart si chiude con la × in alto a destra; senza avviso la × non c'è", async () => {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";
  const chiudi = () => screen.queryByRole("button", { name: it.chiudiAvviso });
  expect(chiudi()?.outerHTML ?? null).toBeNull();
  // F9 senza un blocco scelto: l'avviso lo dice.
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "F9" });
  });
  expect(avviso()).toBe(it.annuncioSenzaBlocco);
  await act(async () => {
    fireEvent.click(chiudi()!);
  });
  expect({ avviso: avviso(), chiudi: chiudi()?.outerHTML ?? null }).toEqual({ avviso: "", chiudi: null });
});

test("dal menu «Aiuto», «Informazioni su AlgoDesign» apre la finestra con la versione dei file; si chiude con Esc", async () => {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  await voceDellAiuto("informazioni");
  const finestra = finestraAperta(it.informazioniTitolo);
  expect(finestra.querySelector("[data-versione]")?.getAttribute("data-versione")).toBe(versione);
  expect(finestra.textContent).toContain(it.informazioniLicenza);
  await act(async () => {
    fireEvent.keyDown(finestra, { key: "Escape" });
  });
  await giro();
  expect(document.querySelectorAll('[role="dialog"]').length).toBe(0);
});
