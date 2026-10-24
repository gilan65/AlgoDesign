// Le informazioni del prodotto mostrate nella finestra «Informazioni su AlgoDesign»: versione e data della versione
// vengono da `package.json`, la fonte sola. La configurazione di Tauri legge la versione da lì (e la scrive nelle
// proprietà dell'eseguibile); `shell/Cargo.toml` ne tiene una copia, che `prodotto.test.ts` appaia con le altre.
import pacchetto from "../package.json";
import type { Lingua } from "../i18n/lingue";

export const versione: string = pacchetto.version;
/** La data della versione, scritta `AAAA-MM-GG`: cambia insieme alla versione. */
export const dataDellaVersione: string = pacchetto.dataDiRilascio;

/** Una versione di prova ha un suffisso dopo i tre numeri (`0.5.0-beta.1`); una versione definitiva no (`1.0.0`). */
export function versioneDiProva(v: string): boolean {
  return /^\d+\.\d+\.\d+-/.test(v);
}

/** La data come si legge nella lingua dell'interfaccia: «20 ottobre 2026», «20 October 2026». */
export function dataMostrata(data: string, lingua: Lingua): string {
  const giorno = new Date(`${data}T00:00:00Z`);
  return new Intl.DateTimeFormat(lingua === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(giorno);
}
