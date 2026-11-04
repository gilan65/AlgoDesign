// Il menu di un blocco del flowchart e il doppio clic nel riquadro di un ciclo, nella finestra vera sotto happy-dom,
// sull'esempio «Parola al contrario» (una lettura, un «per», un «per ogni», un valore iniziale):
// - il tasto destro su un blocco apre il suo menu («Comandi del blocco «…»»): Taglia, Copia, Elimina, le azioni della
//   barra (Elimina e Taglia tolgono il blocco, Copia e Taglia mettono «Incolla» nell'elenco di un «+»); il blocco cliccato
//   diventa quello scelto; dalla tastiera Maiusc+F10 sul blocco, Esc lo chiude e torna sul blocco;
// - sul blocco del valore iniziale di un dato solo Elimina, che chiede di toglierlo;
// - sul Mac le voci coi tasti del Mac (⌘X, ⌘C, ⌫), e ⌫ sul blocco lo toglie (fuori dal Mac no);
// - in pausa il menu si apre, in sola lettura no (`e2e/riesegui.e2e.ts`, gesto per gesto);
// - il doppio clic su una parte disegnata del riquadro di un «per» apre i campi del ciclo; in quello di un «per ogni» no.
//
// Che cosa NON guarda: dove il menu si apre (nel punto del clic: la cornice è quella del menu della riga, provata coi
// dati); il tasto destro e Maiusc+F10 veri nei motori, anche su una parte del riquadro (`e2e/editor-dei-cicli.e2e.ts`).
import { beforeAll, expect, test } from "bun:test";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";

const misura = (t: string) => [...t].length * 10;
// Le voci coi tasti di Windows e Linux, alla lettera: fuori dal Mac non cambiano.
const [TAGLIA, COPIA, ELIMINA] = ["Taglia (Ctrl+X)", "Copia (Ctrl+C)", "Elimina (Canc)"];
// La finestra senza guscio, in qualunque ordine girino i file: una prova prima, nello stesso processo, può aver lasciato
// il guscio simulato senza `invoke` (`clearMocks`), e la finestra crederebbe di averne uno.
beforeAll(() => {
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));

/** La finestra col progetto nuovo e poi, dalla finestra «Esempi» del menu «Aiuto», «Parola al contrario». */
async function apriLaParola(): Promise<void> {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  await act(async () => {
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: it.menuAiuto }));
  });
  await giro();
  const aiuto = document.querySelector<HTMLElement>('[role="menu"]')!;
  // «Esempi…» è la seconda voce, dopo la guida.
  await act(async () => {
    fireEvent.keyDown(aiuto, { key: "Home" });
  });
  await giro();
  await act(async () => {
    fireEvent.keyDown(aiuto, { key: "ArrowDown" });
  });
  await giro();
  expect(document.querySelector("[data-highlighted]")?.getAttribute("data-comando")).toBe("esempi");
  await act(async () => {
    fireEvent.keyDown(aiuto, { key: "Enter" });
  });
  await giro();
  const finestra = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find((d) => within(d).queryByRole("heading", { name: it.esempiTitolo }))!;
  // L'esempio sta nel suo gruppo, chiuso: si apre.
  const gruppo = [...finestra.querySelectorAll<HTMLElement>("section")].find((s) => s.getAttribute("data-gruppo") === it.esempiGruppoCicli)!;
  await act(async () => {
    fireEvent.click(gruppo.querySelector<HTMLElement>("button[aria-expanded]")!);
  });
  const riga = within(finestra)
    .getAllByRole("listitem")
    .find((r) => r.querySelector("strong")?.textContent === it.esempioParolaAlContrario)!;
  await act(async () => {
    fireEvent.click(within(riga).getByRole("button", { name: it.esempioApri }));
  });
  await giro();
}

const blocco = (id: string) => document.querySelector<SVGGElement>(`[data-blocco="${id}"]`);
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
/** Un elemento come testo, per darlo a `expect`: un elemento del documento non si dà mai a `expect`, perché con la finestra
 * intera la stampa del messaggio va fuori memoria e l'asserzione che doveva fallire passa (misurato). */
const html = (e: Element | null) => e?.outerHTML ?? null;
/** Le voci del menu aperto: la chiave, tra parentesi se non è disponibile. */
const voci = () => [...(menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])].map((v) => (v.getAttribute("aria-disabled") ? `(${v.textContent})` : v.textContent));

async function tastoDestro(e: Element): Promise<void> {
  await act(async () => {
    fireEvent.contextMenu(e, { clientX: 40, clientY: 40 });
  });
  await giro();
}
async function scegli(voce: string): Promise<void> {
  await act(async () => {
    fireEvent.click(within(menu()!).getByRole("menuitem", { name: voce }));
  });
  await giro();
}
/** Le voci dell'elenco dei blocchi sul primo «+» (poi chiuso con Esc). */
async function vociDelPrimoPunto(): Promise<string[]> {
  const punto = document.querySelector<SVGGElement>("[data-punto]")!;
  await act(async () => {
    fireEvent.pointerDown(punto);
    fireEvent.click(punto);
  });
  await giro();
  const nomi = [...document.querySelectorAll('[role="menuitem"]')].map((v) => v.textContent ?? "");
  await act(async () => {
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  });
  await giro();
  return nomi;
}

test("il tasto destro su un blocco: il suo menu con Taglia, Copia, Elimina; Elimina lo toglie, il blocco cliccato è quello scelto", async () => {
  await apriLaParola();
  await tastoDestro(blocco("b4")!);
  expect(menu()?.getAttribute("aria-label")).toBe(riempi(it.menuDelBlocco, { blocco: blocco("b4")!.getAttribute("aria-label")! }));
  expect(voci()).toEqual([TAGLIA, COPIA, ELIMINA]);
  expect(blocco("b4")!.getAttribute("aria-pressed")).toBe("true");
  await scegli(ELIMINA);
  expect(html(menu())).toBeNull();
  expect(html(blocco("b4"))).toBeNull();
});

test("Copia e Taglia dal menu mettono il blocco negli appunti («Incolla» nell'elenco di un «+»); Taglia lo toglie", async () => {
  await apriLaParola();
  expect(await vociDelPrimoPunto()).not.toContain(it.incolla);
  await tastoDestro(blocco("b4")!);
  await scegli(COPIA);
  expect(html(blocco("b4"))).not.toBeNull();
  expect(await vociDelPrimoPunto()).toContain(it.incolla);
  await tastoDestro(blocco("b8")!);
  await scegli(TAGLIA);
  expect(html(blocco("b8"))).toBeNull();
});

test("dalla tastiera Maiusc+F10 sul blocco apre il menu col fuoco sulla prima voce; Esc lo chiude e il fuoco torna sul blocco", async () => {
  await apriLaParola();
  const b = blocco("b1")!;
  await act(async () => {
    b.focus();
    fireEvent.keyDown(b, { key: "F10", shiftKey: true });
  });
  await giro();
  expect(voci()).toEqual([TAGLIA, COPIA, ELIMINA]);
  expect(document.activeElement?.textContent).toBe(TAGLIA);
  await act(async () => {
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  });
  await giro();
  expect(html(menu())).toBeNull();
  expect(document.activeElement?.getAttribute("data-blocco")).toBe("b1");
});

test("sul blocco del valore iniziale di un dato solo Elimina, che chiede di toglierlo", async () => {
  await apriLaParola();
  await tastoDestro(document.querySelector('[data-iniziale="dati-1"]')!);
  expect(voci()).toEqual([`(${TAGLIA})`, `(${COPIA})`, ELIMINA]);
  await scegli(ELIMINA);
  expect(screen.getByRole("alertdialog", { name: riempi(it.togliValoreTitolo, { nome: "vocali" }) })).toBeTruthy();
});

test("sul Mac le voci hanno i tasti del Mac e ⌫ sul blocco lo toglie; fuori dal Mac ⌫ non lo tocca", async () => {
  await apriLaParola();
  const indietro = async (id: string) => {
    await act(async () => {
      blocco(id)!.focus();
      fireEvent.keyDown(blocco(id)!, { key: "Backspace" });
    });
    await giro();
  };
  // Fuori dal Mac (il motore di happy-dom non si presenta come «Macintosh»): ⌫ non toglie il blocco.
  await indietro("b4");
  expect(html(blocco("b4"))).not.toBeNull();
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)", configurable: true });
  try {
    await tastoDestro(blocco("b8")!);
    expect(voci()).toEqual(["Taglia (⌘X)", "Copia (⌘C)", "Elimina (⌫)"]);
    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    });
    await giro();
    await indietro("b4");
    expect(html(blocco("b4"))).toBeNull();
  } finally {
    Reflect.deleteProperty(navigator, "userAgent");
  }
  expect(navigator.userAgent).not.toContain("Macintosh");
});

test("in pausa il tasto destro su un blocco apre il menu, perché il progetto si modifica", async () => {
  await apriLaParola();
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "F10" });
  });
  await giro();
  // Premessa: l'esecuzione è cominciata (col menu aperto non comincerebbe: un menu aperto ferma i tasti
  // dell'esecuzione, quindi il menu non è mai aperto quando un'esecuzione parte).
  // L'elemento c'è (una premessa che non può mancare in silenzio), e non dice «Pronto».
  expect(document.querySelector("[data-stato-esecuzione]")?.textContent ?? "manca lo stato").not.toBe(it.statoPronto);
  expect(document.querySelector("[data-stato-esecuzione]")?.outerHTML ?? null).not.toBeNull();
  await tastoDestro(blocco("b4")!);
  expect(html(menu())).not.toBeNull();
});

test("il doppio clic su una parte disegnata del riquadro di un «per» apre i campi del ciclo; in quello di un «per ogni» no", async () => {
  await apriLaParola();
  const campi = () => document.querySelector("form[aria-label^='Modifica di']")?.getAttribute("aria-label") ?? null;
  const parti = (id: string) => [...document.querySelectorAll(`[data-id="${id}"][data-fase]`)];
  // Premessa: le parti disegnate dei due riquadri ci sono (i cicli aperti, il «per ogni» con la posizione).
  expect([parti("b2").length, parti("b5").length]).toEqual([3, 4]);
  for (const parte of parti("b2")) {
    await act(async () => {
      fireEvent.doubleClick(parte);
    });
    await giro();
    expect(campi()).toBe(riempi(it.modificaDelBlocco, { blocco: blocco("b2")!.getAttribute("aria-label")! }));
    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    });
    await giro();
  }
  for (const parte of parti("b5")) {
    await act(async () => {
      fireEvent.doubleClick(parte);
    });
    await giro();
    expect(campi()).toBeNull();
  }
});
