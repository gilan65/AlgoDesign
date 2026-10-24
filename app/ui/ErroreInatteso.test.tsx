// Il riparo dell'intera interfaccia, sotto happy-dom: un errore durante il disegno di ciò che contiene lascia al suo
// posto la frase che dice che qualcosa non ha funzionato, nella lingua data, col segno `data-errore-inatteso`; senza
// errori mostra ciò che contiene (controllo positivo: il rilevatore distingue). Col riparo il guscio sa che non c'è
// più nulla da chiedere alla chiusura (`segna_modificato` con falso): senza, la X non chiuderebbe più.
//
// Che cosa NON guarda:
// - gli errori fuori dal disegno (un gestore di un evento, una promessa rifiutata): il riparo di React non li vede;
// - la finestra vera (`avvio.tsx` monta il riparo intorno all'app: lo dice la lettura, non una prova).

import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { ReactElement } from "react";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { ErroreInatteso } from "./ErroreInatteso";

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

test("col riparo il guscio non aspetta più la domanda sulle modifiche: segna «nessuna modifica»", async () => {
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
