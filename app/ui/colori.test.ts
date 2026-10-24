// I colori dei singoli generi di blocco: la lettura dal file delle preferenze (ogni genere per sé), le variabili che
// ricevono gli elementi, la radice che le prende e le lascia; e i tre elenchi che devono dire la stessa cosa (le tinte e
// i generi di `colori.ts`, le variabili di `tema.css`, le classi del flowchart), confrontati elemento per elemento nei due
// versi.
//
// CHE COSA NON GUARDA: i colori calcolati dal motore e il loro contrasto (`e2e/colori.e2e.ts`), la finestra delle
// Impostazioni (`ui/finestre/ColoriDeiBlocchi.test.tsx`).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applicaIColori, coloriDa, generiColorati, tinteDeiBlocchi, tinteDelRiquadro, variabiliDei } from "./colori";

test("dal file: ogni genere con la sua tinta resta, ogni altro genere prende il colore dell'insieme, lui solo", () => {
  expect(coloriDa({ se: "verde", cicli: "arancione-intenso", riquadro: "linea-blu" })).toEqual({ se: "verde", cicli: "arancione-intenso", riquadro: "linea-blu" });
  const misto = {
    se: "verde",
    // Una tinta che non c'è, una del riquadro su un blocco e una dei blocchi sul riquadro, un tipo sbagliato.
    cicli: "giallo",
    lettura: "linea-verde",
    riquadro: "verde",
    commento: 3,
    scrittura: null,
    // Un genere che non c'è.
    salto: "verde",
  };
  expect(coloriDa(misto)).toEqual({ se: "verde" });
  for (const file of [null, undefined, "verde", 3, ["se"], true]) expect(coloriDa(file)).toEqual({});
});

test("le variabili: solo i generi scelti, ognuno con la sua tinta del tema", () => {
  expect(variabiliDei({})).toEqual({});
  expect(variabiliDei({ procedura: "sabbia", riquadro: "linea-rosso" })).toEqual({ "--blocco-procedura": "var(--tinta-sabbia)", "--blocco-riquadro": "var(--tinta-linea-rosso)" });
});

test("la radice prende le variabili dei generi scelti e lascia quelle di un genere tornato all'insieme", () => {
  const radice = document.createElement("div");
  radice.style.setProperty("--colore-sfondo", "#123456");
  applicaIColori(radice, { se: "verde", cicli: "viola-intenso" });
  expect(radice.style.getPropertyValue("--blocco-se")).toBe("var(--tinta-verde)");
  expect(radice.style.getPropertyValue("--blocco-cicli")).toBe("var(--tinta-viola-intenso)");
  applicaIColori(radice, { cicli: "malva" });
  expect(radice.style.getPropertyValue("--blocco-se")).toBe("");
  expect(radice.style.getPropertyValue("--blocco-cicli")).toBe("var(--tinta-malva)");
  applicaIColori(radice, {});
  expect(radice.style.getPropertyValue("--blocco-cicli")).toBe("");
  // Le altre proprietà dell'elemento restano.
  expect(radice.style.getPropertyValue("--colore-sfondo")).toBe("#123456");
});

const tema = readFileSync(join(import.meta.dir, "tema.css"), "utf8");
const flowchart = readFileSync(join(import.meta.dir, "disegno", "Flowchart.module.css"), "utf8");
/** I nomi dichiarati con un prefisso in un pezzo di CSS, ognuno quante volte. */
const dichiarate = (css: string, prefisso: string) => {
  const conti = new Map<string, number>();
  for (const m of css.matchAll(new RegExp(`--${prefisso}-([a-z-]+):`, "g"))) conti.set(m[1]!, (conti.get(m[1]!) ?? 0) + 1);
  return conti;
};
/** Due elenchi della stessa superficie: ciò che manca nell'uno e nell'altro, coi conteggi. */
const appaia = (codice: readonly string[], css: Iterable<string>) => {
  const nelCss = [...css];
  return { senzaCss: codice.filter((n) => !nelCss.includes(n)), senzaCodice: nelCss.filter((n) => !codice.includes(n)), codice: codice.length, css: nelCss.length };
};

test("ogni tinta dell'elenco ha il suo colore in chiaro e in scuro nel tema, e il tema non ne ha altre", () => {
  const tinte = dichiarate(tema, "tinta");
  const elenco = [...tinteDeiBlocchi, ...tinteDelRiquadro];
  const esito = appaia(elenco, tinte.keys());
  console.log(`tinte: nell'elenco ${esito.codice}, nel tema ${esito.css}`);
  expect(esito).toEqual({ senzaCss: [], senzaCodice: [], codice: 25, css: 25 });
  // Una in chiaro e una in scuro.
  expect([...tinte.values()].every((n) => n === 2)).toBe(true);
});

test("ogni genere ha la sua variabile nel tema e la sua classe nel flowchart, e i sei insiemi danno un colore a ogni genere di blocco", () => {
  const blocchi = appaia(generiColorati, dichiarate(tema, "blocco").keys());
  const usate = appaia(generiColorati, new Set([...flowchart.matchAll(/var\(--blocco-([a-z-]+)\)/g)].map((m) => m[1]!)));
  console.log(`generi: ${generiColorati.length}; variabili nel tema ${blocchi.css}, usate dal flowchart ${usate.css}`);
  expect(blocchi).toEqual({ senzaCss: [], senzaCodice: [], codice: 9, css: 9 });
  expect(usate).toEqual({ senzaCss: [], senzaCodice: [], codice: 9, css: 9 });
  // Ogni genere di blocco (non il riquadro, che ha il colore dei bordi) ha un colore in Tenui, Contrasto forte e Bianco e
  // nero, in chiaro e in scuro.
  const disegno = dichiarate(tema, "disegno");
  for (const g of generiColorati.filter((g) => g !== "riquadro")) expect(disegno.get(g), g).toBe(6);
});
