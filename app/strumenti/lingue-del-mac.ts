// Le lingue che l'app per il Mac dichiara a macOS. Senza, l'`Info.plist` dice solo `CFBundleDevelopmentRegion` English e
// macOS mostra le sue finestre (aprire, salvare, scegliere una cartella) in inglese anche a chi lo usa in italiano: misurato
// nei Mac virtuali 13.3 e 27, e corretto sul 27 con la sola chiave `CFBundleLocalizations` aggiunta all'app. La chiave sta
// in `shell/Info.plist`, che Tauri fonde in quello dell'app; le lingue sono quelle dell'interfaccia (`i18n/lingue.ts`).
//
// La clausola BUILD del Mac (`archivio.ts`) rilegge l'`Info.plist` dell'app costruita e lo confronta con la dichiarazione;
// la prova (`lingue-del-mac.test.ts`) tiene la dichiarazione uguale alle lingue dell'interfaccia, nei due versi.
import { readFileSync } from "node:fs";

/** Le lingue dichiarate in `shell/Info.plist` sotto `CFBundleLocalizations`, in ordine; `null` se la chiave non c'è. */
export function lingueDichiarate(plist: string): string[] | null {
  const m = /<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(plist);
  if (!m) return null;
  return [...m[1]!.matchAll(/<string>([^<]*)<\/string>/g)].map((s) => s[1]!);
}

/** Il file che Tauri fonde nell'`Info.plist` dell'app, letto dal disco. */
export function infoPlistDaFondere(): string {
  return readFileSync(new URL("../shell/Info.plist", import.meta.url), "utf8");
}

/** Le lingue lette nell'`Info.plist` dell'app con `PlistBuddy -c "Print :CFBundleLocalizations"` (un `Array { … }`). */
export function lingueDiPlistBuddy(uscita: string): string[] {
  return uscita.split(/\r?\n/).map((r) => r.trim()).filter((r) => r.length > 0 && r !== "Array {" && r !== "}");
}

/** Il difetto fra le lingue lette nell'app e quelle dichiarate; `null` se sono le stesse, nello stesso ordine. */
export function difettoDelleLingue(lette: string[], dichiarate: string[] | null): string | null {
  if (dichiarate === null) return "shell/Info.plist non dichiara CFBundleLocalizations: le finestre di macOS sarebbero in inglese";
  if (lette.join(",") !== dichiarate.join(",")) return `l'Info.plist dice CFBundleLocalizations «${lette.join(", ") || "(nessuna)"}» invece di ${dichiarate.join(", ")} (shell/Info.plist)`;
  return null;
}
