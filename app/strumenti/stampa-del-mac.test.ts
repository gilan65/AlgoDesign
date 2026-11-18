// La stampa sul Mac. Tauri, solo su macOS, mette al posto di `window.print()` il suo comando `plugin:webview|print`
// (il pannello di stampa di macOS sopra la finestra), e il comando vuole il permesso `core:webview:allow-print` in una
// capability della finestra: senza, viene rifiutato in silenzio e «Stampa…» non apre nulla (misurato nei Mac virtuali
// 13.3 e 27 con l'app della 1.0.0, che non aveva capability). La capability `shell/capabilities/stampa-del-mac.json` dà
// quel solo permesso, alla sola finestra dell'app, sul solo Mac: Windows e Linux restano col `window.print()` del motore.
//
// CHE COSA NON GUARDA: che il pannello si apra davvero (si misura sull'app del Mac costruita dal servizio, nei Mac
// virtuali) e come esce il foglio.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

const shell = new URL("../shell/", import.meta.url);
type Capability = { identifier: string; windows: string[]; platforms?: string[]; permissions: (string | { identifier: string })[] };
const capability = (nome: string): Capability => JSON.parse(readFileSync(new URL(`capabilities/${nome}`, shell), "utf8"));

test("la capability della stampa: la finestra dell'app, il solo macOS, il solo permesso di stampare", () => {
  // L'etichetta con cui il guscio crea la finestra.
  const finestra = /WebviewWindowBuilder::new\(app, "([^"]+)"/.exec(readFileSync(new URL("src/main.rs", shell), "utf8"))?.[1];
  expect(finestra).toBeDefined();
  const c = capability("stampa-del-mac.json");
  expect(c.windows).toEqual([finestra!]);
  expect(c.platforms).toEqual(["macOS"]);
  expect(c.permissions).toEqual(["core:webview:allow-print"]);
});

test("nessun'altra capability: i permessi dei comandi di Tauri sono solo quello della stampa", () => {
  const file = readdirSync(new URL("capabilities/", shell)).filter((f) => f.endsWith(".json"));
  expect(file).toEqual(["stampa-del-mac.json"]);
});
