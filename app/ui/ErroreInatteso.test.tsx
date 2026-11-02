// Il riparo dell'intera interfaccia, sotto happy-dom: un errore durante il disegno di ciò che contiene lascia al suo
// posto la frase che dice che qualcosa non ha funzionato, nella lingua data, col segno `data-errore-inatteso`; senza
// errori mostra ciò che contiene (controllo positivo: il rilevatore distingue). Senza modifiche il guscio sa che non c'è
// più nulla da chiedere alla chiusura (`segna_modificato` con falso): senza, la X non chiuderebbe più. Con modifiche il lavoro si
// salva da qui, con la domanda prima di sostituire un file, e una scrittura rifiutata lo dice.
//
// Che cosa NON guarda:
// - gli errori fuori dal disegno (un gestore di un evento, una promessa rifiutata): il riparo di React non li vede, e li prende
//   `errori-dell-app.ts`;
// - la finestra vera, la X e i tasti: `e2e/errori-dell-app.e2e.ts`.

import { afterEach, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { ReactElement } from "react";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { erroriDellApp } from "./errori-dell-app";
import { ErroreInatteso, ricordaIlLavoro } from "./ErroreInatteso";

afterEach(() => cleanup());

function Lancia(): ReactElement {
  throw new Error("un calcolo nel disegno che lancia");
}

/** Il disegno col riparo intorno, con la console degli errori zitta (React e il riparo ci scrivono l'errore). */
function disegna(figlio: ReactElement, testi: typeof it): void {
  const scrivi = console.error;
  console.error = () => {};
  try {
    render(<ErroreInatteso testi={testi}>{figlio}</ErroreInatteso>);
  } finally {
    console.error = scrivi;
  }
}

test("un errore nel disegno lascia la frase del riparo, nelle due lingue; senza errori il contenuto", () => {
  for (const testi of [it, en]) {
    disegna(<Lancia />, testi);
    const riparo = document.querySelector('[role="alert"][data-errore-inatteso]');
    expect(riparo?.textContent).toBe(testi.erroreInatteso);
    cleanup();
  }
  // Controllo positivo: senza errori nessun riparo, e il contenuto c'è.
  disegna(<p data-contenuto="">contenuto</p>, it);
  expect(document.querySelector("[data-errore-inatteso]")?.outerHTML ?? null).toBeNull();
  expect(document.querySelector("[data-contenuto]")?.textContent).toBe("contenuto");
});

test("senza modifiche il guscio non aspetta più la domanda: segna «nessuna modifica»", async () => {
  const segnati: unknown[] = [];
  mockIPC((comando, a) => {
    if (comando === "segna_modificato") segnati.push((a as { modificato: unknown }).modificato);
    return null;
  });
  try {
    disegna(<p>contenuto</p>, it);
    await new Promise((r) => setTimeout(r, 0));
    // Controllo positivo: senza errori il riparo non segna nulla.
    expect(segnati).toEqual([]);
    cleanup();
    disegna(<Lancia />, it);
    await new Promise((r) => setTimeout(r, 0));
    expect(segnati).toEqual([false]);
  } finally {
    clearMocks();
  }
});

// Il riparo con il lavoro da salvare: i rami che nel browser non si provano (`e2e/errori-dell-app.e2e.ts` prova il giro intero).

/** Il guscio finto: le risposte della finestra del sistema e della scrittura, e che cosa è stato chiesto. */
function guscio(scelto: unknown, scrittura: () => unknown = () => null) {
  const scritti: unknown[] = [];
  const segnati: unknown[] = [];
  mockIPC((comando, a) => {
    const argomenti = a as { percorso?: unknown; testo?: unknown; modificato?: unknown };
    if (comando === "scegli_file_da_salvare") return scelto;
    if (comando === "scrivi_progetto") {
      const esito = scrittura();
      scritti.push([argomenti.percorso, argomenti.testo]);
      return esito;
    }
    if (comando === "segna_modificato") segnati.push(argomenti.modificato);
    return null;
  });
  return { scritti, segnati };
}

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const pulsante = (nome: string) => [...document.querySelectorAll("button")].find((b) => b.textContent === nome) ?? null;

const conModifiche = { testo: () => "il testo del progetto", nome: "Media", percorso: null, cartella: null, modificato: true } as const;

afterEach(() => {
  ricordaIlLavoro(null);
  clearMocks();
});

test("con modifiche la frase è quella del salvataggio e il guscio resta avvisato; senza modifiche no", async () => {
  const { segnati } = guscio(null);
  ricordaIlLavoro(conModifiche);
  disegna(<Lancia />, it);
  await giro();
  expect(document.querySelector("[data-errore-inatteso]")?.textContent).toBe(it.erroreInattesoConModifiche);
  expect(pulsante(it.salvaConNome)).not.toBeNull();
  expect(segnati).toEqual([]);
  cleanup();
  // Un progetto ricordato ma senza modifiche: come senza progetto.
  ricordaIlLavoro({ ...conModifiche, modificato: false });
  disegna(<Lancia />, en);
  await giro();
  expect(document.querySelector("[data-errore-inatteso]")?.textContent).toBe(en.erroreInatteso);
  expect(document.querySelectorAll("button").length).toBe(0);
  expect(segnati).toEqual([false]);
});

test("rinunciare alla finestra del sistema non scrive nulla e lascia i pulsanti", async () => {
  const { scritti, segnati } = guscio(null);
  ricordaIlLavoro(conModifiche);
  disegna(<Lancia />, it);
  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  expect(scritti).toEqual([]);
  expect(segnati).toEqual([]);
  expect(pulsante(it.salvaConNome)).not.toBeNull();
});

test("un file che c'è chiede prima di sostituirlo: «Non sostituire» e Esc non scrivono, «Sostituisci» scrive", async () => {
  const { scritti, segnati } = guscio({ percorso: "C:\\miei\\media.algo", sostituire: true });
  ricordaIlLavoro(conModifiche);
  disegna(<Lancia />, it);
  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  expect(document.querySelector('[role="alertdialog"]')?.getAttribute("aria-label")).toBe(riempi(it.sostituireTitolo, { file: "media.algo" }));
  await act(async () => pulsante(it.sostituireRinuncia)!.click());
  expect(scritti).toEqual([]);
  expect(document.querySelector('[role="alertdialog"]')?.outerHTML ?? null).toBeNull();

  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  await act(async () => void document.querySelector('[role="alertdialog"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector('[role="alertdialog"]')?.outerHTML ?? null).toBeNull();
  expect(scritti).toEqual([]);

  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  await act(async () => pulsante(it.sostituireConferma)!.click());
  await giro();
  expect(scritti).toEqual([["C:\\miei\\media.algo", "il testo del progetto"]]);
  expect(document.querySelector("[data-errore-inatteso]")?.textContent).toBe(riempi(it.erroreInattesoSalvato, { file: "media.algo" }));
  expect(segnati).toEqual([false]);
});

test("una scrittura rifiutata lo dice, entra nell'elenco, e si può riprovare", async () => {
  let rifiuta = true;
  const { segnati } = guscio({ percorso: "C:\\miei\\media.algo", sostituire: false }, () => {
    if (rifiuta) return Promise.reject({ genere: "sistema", dettaglio: "sonda della scrittura rifiutata" });
    return null;
  });
  ricordaIlLavoro(conModifiche);
  disegna(<Lancia />, it);
  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  expect(document.querySelector("[data-errore-del-salvataggio]")?.textContent).toContain("sonda della scrittura rifiutata");
  expect(segnati).toEqual([]);
  expect(erroriDellApp().voci.filter((v) => v.origin === "handled" && v.text.includes("sonda della scrittura rifiutata")).length).toBe(1);

  rifiuta = false;
  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  expect(document.querySelector("[data-errore-del-salvataggio]")?.outerHTML ?? null).toBeNull();
  expect(segnati).toEqual([false]);
});

test("il testo del progetto che non si calcola lo dice, come una scrittura rifiutata", async () => {
  guscio({ percorso: "C:\\miei\\media.algo", sostituire: false });
  ricordaIlLavoro({
    ...conModifiche,
    testo: () => {
      throw new Error("sonda del testo");
    },
  });
  disegna(<Lancia />, it);
  await act(async () => pulsante(it.salvaConNome)!.click());
  await giro();
  expect(document.querySelector("[data-errore-del-salvataggio]")?.textContent).toContain("sonda del testo");
});
