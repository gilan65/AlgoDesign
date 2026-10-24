// La politica di sicurezza dei contenuti del prodotto, letta dalla configurazione di Tauri (`app.security.csp`, la
// fonte sola) e scritta come la manda un server: le direttive separate da «; ». Tauri aggiunge da sé, nel prodotto,
// le impronte dei suoi script; il resto è questo.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function politicaDelProdotto(): string {
  const configurazione = JSON.parse(readFileSync(join(import.meta.dir, "..", "shell", "tauri.conf.json"), "utf8"));
  const csp: unknown = configurazione.app?.security?.csp;
  if (typeof csp === "string") return csp;
  if (csp === null || typeof csp !== "object") throw new Error(`app.security.csp non è una politica: ${JSON.stringify(csp)}`);
  return Object.entries(csp as Record<string, string | string[]>)
    .map(([direttiva, valori]) => `${direttiva} ${Array.isArray(valori) ? valori.join(" ") : valori}`)
    .join("; ");
}
