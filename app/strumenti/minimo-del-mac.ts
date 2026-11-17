// La versione minima di macOS dell'app. La dichiara `shell/tauri.conf.json` (`bundle.macOS.minimumSystemVersion`), Tauri la
// scrive nell'`Info.plist` dell'app (`LSMinimumSystemVersion`), e su un Mac più vecchio macOS rifiuta l'app col suo messaggio
// invece di aprirla sullo schermo bianco. Il valore è una misura fatta nei Mac virtuali, uno per versione di macOS: da 13.3
// (il motore di Safari 16.4) l'interfaccia parte, su 13.2.1 il motore di sistema non legge le sue espressioni regolari; il
// valore predefinito di Tauri (10.13) non è una misura.
//
// La clausola BUILD del Mac (`archivio.ts`) rilegge l'`Info.plist` e lo confronta con la dichiarazione; la prova
// (`minimo-del-mac.test.ts`) tiene la dichiarazione uguale alla misura.
import { readFileSync } from "node:fs";

/** Il minimo misurato: la prima versione di macOS in cui l'interfaccia parte. */
export const MINIMO_MISURATO = "13.3";

/** La configurazione di Tauri dell'app, letta dal disco. */
export function configurazioneDiTauri(): unknown {
  return JSON.parse(readFileSync(new URL("../shell/tauri.conf.json", import.meta.url), "utf8"));
}

/** Il minimo dichiarato nella configurazione di Tauri; `null` se non c'è (Tauri userebbe il suo predefinito). */
export function minimoDichiarato(configurazione: unknown): string | null {
  const valore = (configurazione as { bundle?: { macOS?: { minimumSystemVersion?: unknown } } }).bundle?.macOS?.minimumSystemVersion;
  return typeof valore === "string" ? valore : null;
}

/** Il difetto fra il minimo letto nell'`Info.plist` e quello dichiarato; `null` se sono uguali. */
export function difettoDelMinimo(letto: string, dichiarato: string | null): string | null {
  if (dichiarato === null) return "tauri.conf.json non dichiara bundle.macOS.minimumSystemVersion: l'app avrebbe il minimo predefinito di Tauri";
  if (letto !== dichiarato) return `l'Info.plist dice LSMinimumSystemVersion «${letto}» invece di ${dichiarato} (tauri.conf.json)`;
  return null;
}
