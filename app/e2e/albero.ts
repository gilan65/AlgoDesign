// L'albero dell'accessibilità del flowchart, letto dal motore (`ariaSnapshot`), e le domande che le prove
// gli fanno: dove sta un blocco, quali pulsanti non hanno nome. È la struttura costruita dal progetto in
// memoria, non dal disegno: dove sta un elemento sullo schermo non entra mai nel confronto. I nomi attesi
// dei blocchi si ricavano qui dal file del riferimento (rilevatore indipendente dal modulo che costruisce
// la struttura).
import type { Locator } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { traduciEspressione } from "../core/disegno/lingua";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Blocco, Funzione } from "../core/progetto/modello";
import { it } from "../i18n/it";
import { nomiDegliOperatori } from "../i18n/operatori";

export const RIFERIMENTO = "riferimento-media-voti";
export const riferimento: Funzione = (() => {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL(`../casi/tappa-1/${RIFERIMENTO}.algo`, import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error("il riferimento non si apre");
  return esito.progetto.functions[0]!;
})();

// ------------------------------------------------------------- i nomi attesi, camminati qui

const espressione = (t: string) => traduciEspressione(t, nomiDegliOperatori.it);
const generi: Record<string, string> = {
  assignment: it.bloccoAssegnazione,
  read: it.bloccoLettura,
  write: it.bloccoScrittura,
  if: it.bloccoSe,
  while: it.bloccoMentre,
  repeat: it.bloccoRipeti,
  comment: it.bloccoCommento,
};
function contenuto(b: Blocco): string {
  if (b.kind === "assignment") return `${espressione(b.target)} ← ${espressione(b.value)}`;
  if (b.kind === "read") return espressione(b.target);
  if (b.kind === "write") return b.values.map(espressione).join(", ");
  if (b.kind === "if" || b.kind === "while" || b.kind === "repeat") return espressione(b.condition);
  if (b.kind === "comment") return b.text;
  return "";
}
export const nomeBlocco = (b: Blocco) => `${generi[b.kind]}: ${contenuto(b)}`;

/** Il pulsante del blocco dell'albero con quel nome: non quello del valore iniziale di un dato, che può avere lo stesso
 * nome (nel riferimento «Assegnazione: i ← 0» è tutti e due). */
export const bloccoDiNome = (flowchart: Locator, nome: string) => flowchart.locator("[data-blocco]").and(flowchart.getByRole("button", { name: nome, exact: true }));

// ------------------------------------------------------------- l'albero letto dal motore

export interface Nodo {
  ruolo: string;
  nome: string;
  figli: Nodo[];
}

/** L'albero dell'accessibilità come testo, senza la selezione (`[pressed]`): la selezione non è del
 * progetto, e Annulla non la ripristina. */
export const stato = async (flowchart: Locator) => (await flowchart.ariaSnapshot()).replace(/ \[pressed(=\w+)?\]/g, "");

/** L'albero dell'accessibilità del flowchart, da `ariaSnapshot` (una riga per nodo, rientrata). */
export async function albero(flowchart: Locator): Promise<Nodo> {
  const testo = await flowchart.ariaSnapshot();
  const radice: Nodo = { ruolo: "radice", nome: "", figli: [] };
  const pila: { rientro: number; nodo: Nodo }[] = [{ rientro: -1, nodo: radice }];
  for (const riga of testo.split("\n")) {
    // Una riga con caratteri speciali è fra apici (`- 'button "Lettura: voto"'`).
    const m = riga.match(/^(\s*)- '?(\w+)(?: "((?:[^"\\]|\\.)*)")?/);
    if (!m) continue;
    const nodo: Nodo = { ruolo: m[2]!, nome: m[3] === undefined ? "" : (JSON.parse(`"${m[3]}"`) as string), figli: [] };
    while (pila.at(-1)!.rientro >= m[1]!.length) pila.pop();
    pila.at(-1)!.nodo.figli.push(nodo);
    pila.push({ rientro: m[1]!.length, nodo });
  }
  return radice;
}

export const eUnPunto = (n: Nodo) => n.ruolo === "button" && / (inserisci al posto|insert at place) \d+ (di|of) \d+$/.test(n.nome);

/** Dove sta il blocco con quel nome: il gruppo che lo contiene e la sua posizione fra i blocchi del gruppo. I valori
 * iniziali dei dati, in testa alla sequenza principale prima del suo primo «+», non sono blocchi dell'albero: non
 * contano. */
export function doveSta(n: Nodo, nome: string): { sequenza: string; indice: number }[] {
  const primoPunto = n.figli.findIndex(eUnPunto);
  const qui = n.figli.slice(Math.max(primoPunto, 0)).filter((f) => f.ruolo === "button" && !eUnPunto(f));
  const propri = qui.flatMap((f, indice) => (f.nome === nome && n.ruolo === "group" ? [{ sequenza: n.nome, indice }] : []));
  return [...propri, ...n.figli.flatMap((f) => doveSta(f, nome))];
}

/** I pulsanti senza nome. */
export function senzaNome(n: Nodo): number {
  return (n.ruolo === "button" && n.nome.trim() === "" ? 1 : 0) + n.figli.reduce((s, f) => s + senzaNome(f), 0);
}
