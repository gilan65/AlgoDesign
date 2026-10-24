// Il menu in cima allo schermo del Mac: lo fa il guscio (contratto in app/shell/src/menu.rs) coi testi che
// l'interfaccia gli manda nella lingua scelta, all'avvio e a ogni cambio di lingua. Informazioni e Impostazioni
// tornano alla pagina come evento, col nome della voce. Fuori dal Mac (e fuori dal guscio) non si manda nulla.
import { invoke } from "@tauri-apps/api/core";
import type { Dizionario } from "../i18n/it";

// Come in `file.ts`: la finzione di Playwright imposta `__TAURI_INTERNALS__` e non `isTauri`.
const nelGuscio = () => "__TAURI_INTERNALS__" in window;

/** Le voci del menu, coi nomi che il guscio riceve; il testo di ognuna è nel dizionario col prefisso `mac`. */
export const VOCI_DEL_MENU_DEL_MAC = [
  "informazioni",
  "impostazioni",
  "servizi",
  "nascondi",
  "nascondiAltre",
  "mostraTutte",
  "esci",
  "modifica",
  "annulla",
  "ripeti",
  "taglia",
  "copia",
  "incolla",
  "selezionaTutto",
  "finestra",
  "contrai",
  "zoom",
  "chiudi",
] as const;
type Voce = (typeof VOCI_DEL_MENU_DEL_MAC)[number];

/** I testi delle voci nella lingua del dizionario. */
export const vociDelMenu = (testi: Dizionario): Record<Voce, string> =>
  Object.fromEntries(VOCI_DEL_MENU_DEL_MAC.map((v) => [v, testi[`mac${v[0]!.toUpperCase()}${v.slice(1)}` as `mac${Capitalize<Voce>}`]])) as Record<Voce, string>;

export async function impostaMenu(testi: Dizionario): Promise<void> {
  if (nelGuscio()) await invoke("imposta_menu", { voci: vociDelMenu(testi) });
}

/** L'evento che il guscio manda alla pagina quando si sceglie una voce dell'interfaccia (il nome scritto nel guscio
 * lo appaia `menu.test.ts`); `detail` è il nome della voce. */
export const eventoDelMenu = "algodesign-menu";
export const VOCI_DELL_INTERFACCIA = ["informazioni", "impostazioni"] as const;
export type VoceDellInterfaccia = (typeof VOCI_DELL_INTERFACCIA)[number];
