// Le finestre dell'app non si chiudono col clic fuori (sul velo): ogni `Dialog.Root` dei sorgenti
// dell'interfaccia porta `closeOnInteractOutside={false}`. La prova nel browser guarda le finestre di oggi una
// per una; questa le cerca tutte nei file `.tsx` di `ui/`, così una finestra nuova scritta col suo `Dialog.Root`
// non resta fuori. Il rilevatore legge l'elemento fino al suo `>` seguendo le graffe (gli attributi contengono
// funzioni con `=>`) e guarda gli attributi al primo livello.
//
// CHE COSA NON GUARDA:
// - un `Dialog.Root` importato con un altro nome, o scritto fuori da `ui/`;
// - l'attributo con un valore calcolato (`={chiudi}`): vale solo il letterale `false`;
// - un insieme di attributi sparso (`{...opzioni}`) che porti `closeOnInteractOutside`: il rilevatore guarda che
//   l'attributo ci sia, non l'ordine;
// - con `Dialog.RootProvider` l'opzione sta in `useDialog`: il rilevatore la conta come una finestra senza
//   l'attributo (rossa), che va guardata a mano;
// - una graffa dentro una stringa fra gli attributi (`role="{"`): il lettore la conterebbe;
// - le finestre che non vengono da Ark (oggi nessuna).
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ui = join(import.meta.dir, "..");

function sorgenti(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((v) =>
    v.isDirectory() ? sorgenti(join(cartella, v.name)) : v.name.endsWith(".tsx") ? [join(cartella, v.name)] : [],
  );
}

/** Ogni `<Dialog.Root …>` (o `<Dialog.RootProvider …>`) del sorgente, e se porta `closeOnInteractOutside={false}`
 * fra i suoi attributi. */
function radici(testo: string): boolean[] {
  return [...testo.matchAll(/<Dialog\.Root(Provider)?\b/g)].map((m) => {
    // Gli attributi al primo livello; il contenuto di una graffa resta solo se è una parola (`{false}`).
    let piano = "";
    let dentro = "";
    let profondita = 0;
    for (let i = m.index + m[0].length; i < testo.length; i++) {
      const c = testo[i]!;
      if (profondita === 0 && c === ">") break;
      if (c === "{") profondita++;
      if (profondita === 0) piano += c;
      else dentro += c;
      if (c === "}" && --profondita === 0) {
        piano += /^\{\s*\w+\s*\}$/.test(dentro) ? dentro.replace(/\s/g, "") : "{…}";
        dentro = "";
      }
    }
    return /(^|\s)closeOnInteractOutside=\{false\}(\s|\/|$)/.test(piano);
  });
}

test("ogni finestra dell'interfaccia (ogni Dialog.Root) non si chiude col clic fuori", () => {
  const perFile = sorgenti(ui).map((f) => ({ file: relative(ui, f).replaceAll("\\", "/"), radici: radici(readFileSync(f, "utf8")) }));
  const conRadici = perFile.filter((f) => f.radici.length > 0);
  // Gli elementi, non il numero: i file con le finestre di oggi (un file nuovo con un Dialog.Root va aggiunto qui).
  expect(conRadici.map((f) => `${f.file}: ${f.radici.length}`).sort()).toEqual(["finestre/Finestra.tsx: 1"]);
  expect(conRadici.filter((f) => f.radici.includes(false)).map((f) => f.file)).toEqual([]);
  // Controllo positivo: lo stesso rilevatore, su Finestra.tsx senza l'attributo (o col valore `true`), trova la
  // finestra che si chiude.
  const finestra = readFileSync(join(ui, "finestre", "Finestra.tsx"), "utf8");
  for (const altro of ["", "closeOnInteractOutside={true}"]) {
    const mutata = finestra.replace("closeOnInteractOutside={false}", altro);
    expect(mutata).not.toBe(finestra);
    expect(radici(mutata)).toEqual([false]);
  }
  // E una finestra scritta con `Dialog.RootProvider` (l'opzione in `useDialog`) non sfugge al rilevatore.
  expect(radici("<Dialog.RootProvider value={finestra}>")).toEqual([false]);
});
