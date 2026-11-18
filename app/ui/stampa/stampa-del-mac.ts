// La stampa sul Mac, coi margini della pagina. Sul Mac Tauri mette al posto di `window.print()` il suo comando, che apre
// il pannello di stampa di macOS con i margini a zero (wry li prende a parte, e Tauri non glieli passa): il testo toccava
// il bordo del foglio (misurato nei Mac virtuali 13.3 e 27). Il WebKit del Mac non legge i margini delle regole `@page`;
// il comando del guscio `stampa_del_mac` apre lo stesso pannello coi margini di `MARGINI`. Fuori dal Mac, e fuori dal
// guscio, `window.print()` resta quello del motore. `afterprint` arriva come col comando di Tauri: la stampa è la stessa.
//
// CHE COSA NON FA: il verso dei fogli e le caselle del margine (intestazione e piè di pagina), che il WebKit del Mac non
// conosce: i fogli escono tutti in verticale (misurato nel PDF; il pannello non mostra il verso).
import { invoke } from "@tauri-apps/api/core";
import { annotaErrore } from "../errori-dell-app";
import { sulMac } from "../piattaforma";
import { MARGINI } from "./parti";

export type Margini = { sopra: number; destra: number; sotto: number; sinistra: number };

/** I margini in millimetri da una regola `margin` di uno, due, tre o quattro valori, ognuno in `mm`. */
export function marginiInMillimetri(regola: string): Margini {
  const valori = regola
    .trim()
    .split(/\s+/)
    .map((p) => {
      const m = /^(\d+(?:\.\d+)?)mm$/.exec(p);
      if (!m) throw new Error(`margine non in millimetri: ${p}`);
      return Number(m[1]);
    });
  if (valori.length > 4) throw new Error(`troppi valori nel margine: ${regola}`);
  const [sopra, destra = sopra, sotto = sopra, sinistra = destra] = valori as [number, number?, number?, number?];
  return { sopra, destra, sotto, sinistra };
}

// Come in `file.ts`: la finzione di Playwright imposta `__TAURI_INTERNALS__` e non `isTauri`.
const nelGuscio = () => "__TAURI_INTERNALS__" in window;

/** Nel guscio sul Mac, `window.print()` chiede il pannello di macOS al guscio, coi margini della pagina. */
export function stampaDelMac(): void {
  if (!nelGuscio() || !sulMac()) return;
  const m = marginiInMillimetri(MARGINI);
  window.print = () => {
    invoke("stampa_del_mac", { sopra: m.sopra, destra: m.destra, sotto: m.sotto, sinistra: m.sinistra }).catch((e: unknown) => annotaErrore("stampa non aperta", e));
  };
}
