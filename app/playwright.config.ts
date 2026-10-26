// Playwright livello 1: l'interfaccia nel browser, con il guscio simulato (`mockIPC`). Due motori per
// due bersagli: il WebKit di Playwright per la macchina che esegue (che non è WebKitGTK di Linux né il WebKit di
// macOS), e l'anteprima serve dist/, cioè ciò che Tauri incorpora. Un rosso su uno solo dei quattro progetti è un difetto vero.
// Si esegue sotto Bun: `bun --bun playwright test`. Il collaudo sceglie i progetti col suo modo: solo Chromium nel
// predefinito, tutti e quattro con `--completo` (`strumenti/collaudo.ts`).
import { defineConfig, devices } from "@playwright/test";
import { portaAnteprima, portaSviluppo } from "./strumenti/porte";

// Il dispositivo «Desktop Safari» dichiara un Mac nel suo `userAgent`, e l'interfaccia ne fa i tasti e il menu del
// Mac: le prove di WebKit girano invece col nome di un WebKit per Linux, la piattaforma di cui sono la controfigura. I
// casi del Mac stanno in `e2e/mac.e2e.ts`, che il nome del Mac lo dà da sé.
const webkitDiLinux = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const motori = [
  { nome: "chromium", dispositivo: devices["Desktop Chrome"] },
  { nome: "webkit", dispositivo: { ...devices["Desktop Safari"], userAgent: webkitDiLinux } },
];
// Le prove con l'etichetta `@solo-sviluppo` non corrono sul build di produzione: lì falliscono a intermittenza per un difetto noto
// non ancora risolto (lo dice la prova); il collaudo le conta fuori da quel bersaglio, per nome (`proveFuoriDalBersaglio`).
const bersagli = [
  { nome: "sviluppo", url: `http://127.0.0.1:${portaSviluppo}`, comando: "bun ./strumenti/dev.ts" },
  { nome: "anteprima", url: `http://127.0.0.1:${portaAnteprima}`, comando: "bun ./strumenti/anteprima.ts", escluse: /@solo-sviluppo/ },
];

// I margini di tempo, una regola sola: il limite di una prova è almeno QUATTRO volte la sua durata più lunga misurata
// nella corsa intera del collaudo (quattro progetti in parallelo), arrotondato ai 30 s. Il predefinito di 60 s copre
// le prove fino a 15 s; le più lunghe dichiarano il proprio con `test.setTimeout`, e il collaudo stampa la prova
// col margine più stretto. Un'azione ferma (un clic che aspetta un elemento che non arriva) si interrompe dopo 30 s
// col nome dell'azione, invece di consumare tutto il limite della prova senza dire dove.
//
// Quattro processi, non gli otto predefiniti (metà dei 16 processori logici di questa macchina): con otto, quando la
// macchina rallenta, le pagine di WebKit smettono per decine di secondi di dare fotogrammi e un clic resta ad
// aspettare che il pulsante sia «fermo» (misurato: 7 rossi in tre corse, e 4 sul codice di prima con la stessa
// configurazione; la somma delle durate salita da 2000 a 3500 s). Con quattro: 304 su 304 in 7,3 minuti, somma 1715 s.
export default defineConfig({
  testDir: "e2e",
  workers: 4,
  timeout: 60_000,
  use: { actionTimeout: 30_000 },
  // `.e2e.ts`, non `.spec.ts`: `bun test` raccoglie anche i `.spec.*` e proverebbe a eseguirli.
  testMatch: "**/*.e2e.ts",
  outputDir: ".collaudo/playwright",
  projects: motori.flatMap((m) =>
    bersagli.map((b) => ({ name: `${m.nome}-${b.nome}`, use: { ...m.dispositivo, baseURL: b.url }, ...("escluse" in b ? { grepInvert: b.escluse } : {}) })),
  ),
  // Mai riusare un server già acceso: sarebbe quello di un giro vecchio, e nessuno lo saprebbe.
  webServer: bersagli.map((b) => ({ command: b.comando, url: b.url, reuseExistingServer: false })),
});
