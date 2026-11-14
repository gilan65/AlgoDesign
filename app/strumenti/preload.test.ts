// La pulizia del guscio finto nel preload di `bun test` (`preload.ts`, punto 5): dopo `clearMocks()` resta
// `window.__TAURI_INTERNALS__` vuoto, e la prova dopo crederebbe di avere il guscio. Le prove di questo file corrono in
// ordine: ognuna guarda ciò che ha lasciato quella prima.
//
// CHE COSA NON GUARDA: l'ordine dei file sul disco (su APFS diverso da NTFS e da ext4); lo prova la corsa delle prove sul
// Mac del servizio.
import { expect, test } from "bun:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

const interni = () => (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__;

test("la premessa: dopo clearMocks l'oggetto del guscio resta, senza invoke", () => {
  mockIPC(() => null);
  clearMocks();
  expect(typeof interni()).toBe("object");
  expect("invoke" in (interni() ?? {})).toBe(false);
});

test("la prova dopo non trova più il guscio vuoto", () => {
  expect("__TAURI_INTERNALS__" in window).toBe(false);
});

test("un guscio finto attivo non si tocca: lo lascia qui", () => {
  mockIPC(() => "risposta");
  expect("invoke" in (interni() ?? {})).toBe(true);
});

test("controllo positivo: il guscio attivo della prova prima c'è ancora", () => {
  expect("invoke" in (interni() ?? {})).toBe(true);
  clearMocks();
});
