// La macro della build che legge le due guide per lo studente da `docs/` e le converte in HTML (`guida.ts`). Si
// importa con `with { type: "macro" }`: gira mentre Bun impacchetta (la build, il server di sviluppo, `bun test`), e
// nel codice resta solo ciò che restituisce. Il Markdown e il convertitore non entrano nel prodotto.
//
// Gira dentro Bun, non nella pagina: legge i file e chiama il convertitore attraverso `import.meta`, coi tipi scritti
// qui, perché l'interfaccia si controlla senza i tipi di Bun.
import type { Lingua } from "../../i18n/lingue";
import { convertiLaGuida, type GuidaInHtml } from "./guida";

/** I file delle guide in `docs/`, uno per lingua dell'interfaccia (il pacchetto li porta tutti e due). */
export const fileDelleGuide: Readonly<Record<Lingua, string>> = { it: "GUIDA-PER-LO-STUDENTE.md", en: "STUDENT-GUIDE.md" };

type DentroBun = {
  require(modulo: "node:fs"): { readFileSync(percorso: URL, codifica: "utf8"): string };
};
type Convertitore = { Bun: { markdown: { html(markdown: string): string } } };

export function guide(): Record<Lingua, GuidaInHtml> {
  const fs = (import.meta as unknown as DentroBun).require("node:fs");
  const inHtml = (markdown: string) => (globalThis as unknown as Convertitore).Bun.markdown.html(markdown);
  const leggi = (nome: string) => fs.readFileSync(new URL(`../../../docs/${nome}`, import.meta.url), "utf8");
  return {
    it: convertiLaGuida(fileDelleGuide.it, leggi(fileDelleGuide.it), inHtml),
    en: convertiLaGuida(fileDelleGuide.en, leggi(fileDelleGuide.en), inHtml),
  };
}
