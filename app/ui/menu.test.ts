// Il menu del Mac è scritto in due lingue: nel guscio (Rust: le voci che riceve, quelle che rimanda alla pagina,
// l'evento) e qui nell'interfaccia. Queste prove li appaiano sugli elementi, nei due versi.
//
// CHE COSA NON GUARDA: il menu vero (lo fa macOS: la prova è sul Mac del servizio di build); i rilevatori leggono
// una sola forma per cosa (i campi `pub nome: String` della struttura, l'elenco fra parentesi quadre della costante,
// `new CustomEvent('…'`), e se la forma cambia il conteggio va a zero e la prova è rossa.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { eventoDelMenu, VOCI_DEL_MENU_DEL_MAC, VOCI_DELL_INTERFACCIA, vociDelMenu } from "./menu";

const guscio = readFileSync(new URL("../shell/src/menu.rs", import.meta.url), "utf8");
const inCammello = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

test("il guscio riceve esattamente le voci che l'interfaccia manda, coi testi della lingua", () => {
  const struttura = /pub struct VociDelMenu \{([^}]*)\}/.exec(guscio)?.[1] ?? "";
  const campi = [...struttura.matchAll(/pub (\w+): String/g)].map((m) => inCammello(m[1]!));
  // Controllo positivo nel numero: il rilevatore trova i campi della struttura.
  expect(campi).toHaveLength(18);
  expect(campi.filter((c) => !(VOCI_DEL_MENU_DEL_MAC as readonly string[]).includes(c))).toEqual([]);
  expect(VOCI_DEL_MENU_DEL_MAC.filter((v) => !campi.includes(v))).toEqual([]);
  expect(vociDelMenu(it).esci).toBe("Esci da AlgoDesign");
  expect(vociDelMenu(en).esci).toBe("Quit AlgoDesign");
  for (const testi of [it, en]) expect(Object.values(vociDelMenu(testi)).filter((t) => t === undefined || t === "")).toEqual([]);
});

test("il guscio rimanda alla pagina, con l'evento che l'interfaccia ascolta, le voci che l'interfaccia sa fare", () => {
  const mandati = [...guscio.matchAll(/new CustomEvent\('([^']*)'/g)].map((m) => m[1]);
  expect(mandati).toEqual([eventoDelMenu]);
  const voci = /VOCI_DELL_INTERFACCIA: \[&str; \d+\] = \[([^\]]*)\]/.exec(guscio)?.[1] ?? "";
  const rimandate = [...voci.matchAll(/"(\w+)"/g)].map((m) => m[1]);
  // Controllo positivo nel numero: due voci, nello stesso ordine.
  expect(rimandate).toEqual([...VOCI_DELL_INTERFACCIA]);
});
