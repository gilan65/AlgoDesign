// La stampa sul Mac passa dal comando del guscio coi margini della pagina (`stampa-del-mac.ts`): nel guscio e sul Mac
// `window.print()` chiede `stampa_del_mac` coi margini di `MARGINI` in millimetri; fuori dal Mac, o fuori dal guscio,
// `window.print()` resta quello del motore.
//
// CHE COSA NON GUARDA: il pannello di macOS e i fogli che escono (si misurano sull'app del Mac costruita dal servizio,
// nei Mac virtuali); il comando in Rust, che si compila solo sul Mac (i nomi degli argomenti li appaia `main.rs`).
import { afterEach, expect, test } from "bun:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { MARGINI } from "./parti";
import { marginiInMillimetri, stampaDelMac } from "./stampa-del-mac";

const delMotore = window.print;
const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0";
const conIlMotore = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

afterEach(() => {
  window.print = delMotore;
  Reflect.deleteProperty(navigator, "userAgent");
  clearMocks();
});

/** Le chiamate al guscio dopo un `window.print()`, con `stampaDelMac` installata nel motore dato. */
async function chiamateDopoLaStampa(ua: string, nelGuscio: boolean): Promise<[string, unknown][]> {
  const chiamate: [string, unknown][] = [];
  if (nelGuscio) mockIPC((comando, a) => void chiamate.push([comando, a]));
  conIlMotore(ua);
  const motore: string[] = [];
  window.print = () => void motore.push("motore");
  stampaDelMac();
  window.print();
  await new Promise((r) => setTimeout(r, 0));
  return [...chiamate, ...motore.map((m): [string, unknown] => [m, null])];
}

test("i margini della pagina in millimetri, nell'ordine di una regola `margin`", () => {
  expect(MARGINI).toBe("22mm 12mm 18mm");
  expect(marginiInMillimetri(MARGINI)).toEqual({ sopra: 22, destra: 12, sotto: 18, sinistra: 12 });
  expect(marginiInMillimetri("10mm")).toEqual({ sopra: 10, destra: 10, sotto: 10, sinistra: 10 });
  expect(marginiInMillimetri("10mm 5mm")).toEqual({ sopra: 10, destra: 5, sotto: 10, sinistra: 5 });
  expect(marginiInMillimetri("1mm 2mm 3mm 4.5mm")).toEqual({ sopra: 1, destra: 2, sotto: 3, sinistra: 4.5 });
  // Un'altra unità, o troppi valori: il guscio riceverebbe un numero sbagliato.
  expect(() => marginiInMillimetri("2cm 12mm")).toThrow();
  expect(() => marginiInMillimetri("1mm 2mm 3mm 4mm 5mm")).toThrow();
});

test("nel guscio sul Mac la stampa chiede il comando coi margini; il `window.print()` del motore non si chiama", async () => {
  expect(await chiamateDopoLaStampa(mac, true)).toEqual([["stampa_del_mac", { sopra: 22, destra: 12, sotto: 18, sinistra: 12 }]]);
});

// Una prova per caso: `clearMocks()` lascia `__TAURI_INTERNALS__` (vuoto), e lo toglie il preload prima di ogni prova.
test("fuori dal Mac resta il `window.print()` del motore", async () => {
  expect(await chiamateDopoLaStampa(windows, true)).toEqual([["motore", null]]);
});

test("fuori dal guscio resta il `window.print()` del motore", async () => {
  expect("__TAURI_INTERNALS__" in window).toBe(false);
  expect(await chiamateDopoLaStampa(mac, false)).toEqual([["motore", null]]);
});
