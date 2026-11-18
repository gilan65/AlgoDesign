// Le regole CSS dell'interfaccia che un WebKit vecchio scarta per intero, e che quindi vogliono un ripiego accanto.
// `content` col testo alternativo dopo la barra (`content: "?" / ""`) il WebKit di Safari 16 (macOS 13, il minimo del
// Mac) non lo conosce: la dichiarazione è scartata e il segno non c'è. Il ripiego è la stessa `content` senza la barra
// subito prima, nella stessa regola: chi conosce la barra usa l'ultima, chi non la conosce si ferma alla prima.
//
// CHE COSA NON GUARDA: le altre proprietà nuove (si misurano nei Mac virtuali, `docs` di lavoro), il CSS dentro i
// componenti (lo stile in linea dei `.tsx`), i fogli della stampa del nucleo.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** Le `content` con la barra senza il ripiego subito prima, in un pezzo di CSS: il testo della dichiarazione. */
function senzaRipiego(css: string): string[] {
  const mancano: string[] = [];
  for (const regola of css.replace(/\/\*[\s\S]*?\*\//g, "").split("}")) {
    const corpo = regola.slice(regola.indexOf("{") + 1);
    const dichiarazioni = corpo.split(";").map((d) => d.trim()).filter((d) => d.length > 0);
    dichiarazioni.forEach((d, i) => {
      if (!/^content\s*:/.test(d) || !/"\s*\/\s*"/.test(d)) return;
      const prima = dichiarazioni[i - 1];
      if (prima === undefined || !/^content\s*:/.test(prima) || /"\s*\/\s*"/.test(prima)) mancano.push(d);
    });
  }
  return mancano;
}

/** I file `.css` sotto la cartella dell'interfaccia, dal disco. */
function fileCss(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) return fileCss(percorso);
    return voce.name.endsWith(".css") ? [percorso] : [];
  });
}

test("il rilevatore: la barra senza ripiego si vede, col ripiego no, e un commento non conta", () => {
  expect(senzaRipiego(`a::before { content: "?" / ""; color: red; }`)).toEqual([`content: "?" / ""`]);
  expect(senzaRipiego(`a::before { content: "?"; content: "?" / ""; }`)).toEqual([]);
  // Il ripiego in un'altra regola non vale.
  expect(senzaRipiego(`a { content: "?"; } b { content: "?" / ""; }`)).toEqual([`content: "?" / ""`]);
  // Un ripiego che ha anch'esso la barra non è un ripiego.
  expect(senzaRipiego(`a { content: "!" / ""; content: "?" / ""; }`)).toHaveLength(2);
  expect(senzaRipiego(`/* content: "?" / ""; */ a { color: red; }`)).toEqual([]);
});

test("ogni `content` col testo alternativo nell'interfaccia ha il ripiego senza barra subito prima", () => {
  const cartella = import.meta.dir;
  const fogli = fileCss(cartella);
  const conBarra = fogli.filter((f) => /content\s*:[^;]*"\s*\/\s*"/.test(readFileSync(f, "utf8")));
  // Il denominatore e il controllo positivo: i fogli letti, e almeno uno che usa la barra (oggi la vista dei dati).
  console.log(`fogli css: ${fogli.length}; con la barra: ${conBarra.map((f) => relative(cartella, f)).join(", ") || "nessuno"}`);
  expect(fogli.length).toBeGreaterThan(0);
  expect(conBarra.map((f) => relative(cartella, f).replaceAll("\\", "/"))).toContain("dati/VistaDati.module.css");
  const mancano = conBarra.flatMap((f) => senzaRipiego(readFileSync(f, "utf8")).map((d) => `${relative(cartella, f)}: ${d}`));
  expect(mancano).toEqual([]);
});
