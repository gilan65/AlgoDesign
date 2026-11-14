// Preload di `bun test` (bunfig.toml → [test] preload). Cinque cose, e ognuna ha una ragione:
//
// 1. Sotto `bun test` un `*.module.css` arriva come oggetto VUOTO: i CSS Modules sono del bundler,
//    non del runtime. Le classi varrebbero `undefined` e un test che confronta due `undefined`
//    passerebbe senza aver provato nulla. Il plugin restituisce ogni classe mappata sul proprio nome.
// 2. Il DOM per le prove dell'interfaccia viene da happy-dom.
// 3. Testing Library registra da sola la propria pulizia solo se trova un `afterEach` GLOBALE; qui
//    `afterEach` si importa da "bun:test", quindi la pulizia si registra a mano. Senza, i nodi resi da
//    una prova restano nel documento e la prova successiva ne trova due.
// 4. La finestra «Guida» prende le guide da una macro (`ui/guida/guide.ts`, `with { type: "macro" }`), che nella build e
//    nel server di sviluppo gira mentre Bun impacchetta. Sotto `bun test` no (Bun 1.4.2, misurato): quando la finestra
//    arriva fra gli import statici di un file di prova (l'app intera), la macro viene chiamata ma il suo risultato non
//    entra nel codice, l'import sparisce e resta la chiamata (`guide is not defined`), e quella trasformazione guasta
//    resta nella cache del transpiler per le corse dopo. Con un import dinamico funziona: la regola non è affidabile.
//    Qui l'import della macro diventa un import normale, e la stessa conversione gira quando la finestra si carica;
//    la sostituzione deve trovare il suo testo una volta sola, o il caricamento si ferma col perché.
// 5. `clearMocks()` di Tauri toglie le funzioni da `window.__TAURI_INTERNALS__` ma lascia l'oggetto, e l'interfaccia
//    riconosce il guscio dalla sola presenza di quel nome (`"__TAURI_INTERNALS__" in window`, `ui/file.ts`): ogni prova
//    dopo crederebbe di avere il guscio. Tutti i file corrono nello stesso processo, in un ordine che dipende dal disco
//    (su APFS `ErroreInatteso.test.tsx` corre prima di `Applicazione.test.tsx`: 9 prove rosse, misurato). Prima di ogni
//    prova l'oggetto rimasto senza `invoke` si toglie; un `mockIPC` attivo (con `invoke`) resta.
import { afterEach, beforeEach } from "bun:test";
import { plugin } from "bun";
import { readFileSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

plugin({
  name: "css-modules-nelle-prove",
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, ({ path }) => {
      const css = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const classi: Record<string, string> = {};
      for (const m of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
        const nome = m[1];
        if (nome) classi[nome] = nome;
      }
      return { exports: { default: classi, ...classi }, loader: "object" };
    });
  },
});

const importDellaMacro = 'import { guide } from "../guida/guide" with { type: "macro" };';
plugin({
  name: "guide-senza-macro-nelle-prove",
  setup(build) {
    build.onLoad({ filter: /[\\/]ui[\\/]finestre[\\/]FinestraGuida\.tsx$/ }, ({ path }) => {
      const testo = readFileSync(path, "utf8");
      const volte = testo.split(importDellaMacro).length - 1;
      if (volte !== 1) throw new Error(`${path}: l'import della macro delle guide compare ${volte} volte, non 1 («${importDellaMacro}»)`);
      return { contents: testo.replace(importDellaMacro, 'import { guide } from "../guida/guide";'), loader: "tsx" };
    });
  },
});

GlobalRegistrator.register();

// Importata DOPO la registrazione del DOM: Testing Library legge `document` quando si carica.
const { cleanup } = await import("@testing-library/react");
afterEach(() => cleanup());

/** Il guscio finto rimasto vuoto dopo `clearMocks()`: si toglie, perché la prova dopo non creda di avere il guscio. */
function togliIlGuscioVuoto(): boolean {
  const interni = (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__;
  if (typeof interni !== "object" || interni === null || "invoke" in interni) return false;
  delete (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__;
  return true;
}
beforeEach(() => {
  togliIlGuscioVuoto();
});
