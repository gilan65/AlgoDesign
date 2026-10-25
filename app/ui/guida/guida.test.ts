// La guida della finestra «Guida» è quella di `docs/`, nelle due lingue: l'HTML che la build mette nel prodotto (la macro
// di `guide.ts`, lo stesso oggetto che la finestra mostra) si confronta col Markdown letto qui dal disco, parola per
// parola, coi titoli (livello e testo), le voci degli elenchi e le righe delle tabelle. E il controllo dell'insieme dei
// costrutti: ogni costrutto che la guida non usa ferma la conversione, e quindi la build, nominandolo.
//
// Che cosa NON guarda: l'aspetto (lo guardano i motori, `e2e/guida.e2e.ts`) e la forma comune delle due lingue (la guarda
// `strumenti/documenti-in-due-lingue.test.ts`).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { documentiDelPacchetto } from "../../strumenti/elenco-del-pacchetto";
import type { Lingua } from "../../i18n/lingue";
import { GUIDE } from "../finestre/FinestraGuida";
import { convertiLaGuida, ETICHETTE_AMMESSE, testoDi } from "./guida";
import { fileDelleGuide } from "./guide";

const inHtml = (md: string) => Bun.markdown.html(md);
const markdown = (l: Lingua) => readFileSync(new URL(`../../../docs/${fileDelleGuide[l]}`, import.meta.url), "utf8").replaceAll("\r\n", "\n");

/** Il testo del Markdown senza i segni (titoli, elenchi, tabelle, grassetto, corsivo, codice), in parole. Il codice in
 * linea resta com'è: il suo `*` non è un corsivo. */
function paroleDelMarkdown(md: string): string[] {
  const righe = md
    .split("\n")
    .filter((r) => !/^\|[-| :]+\|$/.test(r))
    // Un titolo perde solo i suoi `#`: «## 1. L'idea» tiene il numero, che non è quello di un elenco.
    .map((r) => (/^#{1,6} /.test(r) ? r.replace(/^#{1,6} /, "") : r.replace(/^- /, "").replace(/^\d+\. /, "")));
  const senzaSegni = righe
    .join("\n")
    .split(/(`[^`\n]*`)/)
    // Fuori dal codice tolti i segni del grassetto e del corsivo, non un `*` da solo («n * fatt(n - 1)»).
    .map((pezzo, i) => (i % 2 === 1 ? pezzo.slice(1, -1) : pezzo.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*([^*\s][^*]*?)\*/g, "$1").replace(/\|/g, " ")))
    .join("");
  return senzaSegni.split(/\s+/).filter((p) => p !== "");
}
const paroleDellHtml = (titolo: string, html: string) => `${titolo} ${testoDi(html.replace(/></g, "> <"))}`.split(/\s+/).filter((p) => p !== "");

/** Il primo punto in cui due elenchi di parole si separano, con le parole intorno. */
function primaDifferenza(a: readonly string[], b: readonly string[]): string | null {
  const posti = Array.from({ length: Math.max(a.length, b.length) }, (_, k) => k);
  const i = posti.find((k) => a[k] !== b[k]);
  return i === undefined ? null : `parola ${i}: «${a.slice(Math.max(0, i - 5), i + 5).join(" ")}» contro «${b.slice(Math.max(0, i - 5), i + 5).join(" ")}»`;
}

for (const lingua of ["it", "en"] as const) {
  test(`la guida della finestra in ${lingua} è quella di docs/${fileDelleGuide[lingua]}: titoli, voci, righe e ogni parola`, () => {
    const md = markdown(lingua);
    const guida = GUIDE[lingua];
    // La finestra mostra ciò che la conversione dà oggi sul file di docs/ (la build non è rimasta indietro).
    expect(guida).toEqual(convertiLaGuida(fileDelleGuide[lingua], md, inHtml));
    // I titoli, coi livelli, nell'ordine: il primo è il titolo della finestra, gli altri nel testo.
    const titoliDelMarkdown = [...md.matchAll(/^(#{1,3}) (.*)$/gm)].map((m) => `${m[1]!.length} ${m[2]!.replace(/[*`]/g, "")}`);
    const titoliDellHtml = [`1 ${guida.titolo}`, ...[...guida.html.matchAll(/<h([23])[^>]*>(.*?)<\/h\1>/g)].map((m) => `${m[1]} ${testoDi(m[2]!)}`)];
    expect(titoliDellHtml).toEqual(titoliDelMarkdown);
    expect(guida.capitoli.map((c) => c.titolo)).toEqual(titoliDelMarkdown.filter((t) => t.startsWith("2 ")).map((t) => t.slice(2)));
    // Le voci degli elenchi e le righe delle tabelle (con l'intestazione), contate nei due.
    const voci = md.split("\n").filter((r) => /^(- |\d+\. )/.test(r)).length;
    const righe = md.split("\n").filter((r) => r.startsWith("|") && !/^\|[-| :]+\|$/.test(r)).length;
    expect({ voci: guida.html.match(/<li>/g)?.length, righe: guida.html.match(/<tr>/g)?.length }).toEqual({ voci, righe });
    // Ogni parola, nell'ordine.
    const attese = paroleDelMarkdown(md);
    const viste = paroleDellHtml(guida.titolo, guida.html);
    expect(primaDifferenza(viste, attese)).toBeNull();
    console.log(`guida ${lingua}: ${titoliDelMarkdown.length} titoli (${guida.capitoli.length} capitoli), ${voci} voci, ${righe} righe, ${attese.length} parole`);
  });
}

test("le guide della finestra sono quelle che il pacchetto porta, una per lingua", () => {
  expect(Object.values(fileDelleGuide).sort()).toEqual([...documentiDelPacchetto].sort());
});

test("un costrutto che la guida non usa ferma la conversione e lo nomina; le due guide passano", () => {
  const sonde: Record<string, string> = {
    collegamento: "vedi [qui](http://esempio.it)",
    immagine: "![logo](a.png)",
    "blocco di codice": "```\ncodice\n```",
    "codice rientrato": "testo\n\n    codice rientrato",
    citazione: "> citato",
    linea: "uno\n\n---\n\ndue",
    barrato: "~~via~~",
    casella: "- [ ] da fare",
    "HTML in linea": "un <b>grassetto</b> scritto a mano",
    "blocco HTML": "<div>blocco</div>",
    "a capo forzato": "riga  \nsotto",
    "tabella allineata": "| a | b |\n|:-|-:|\n| 1 | 2 |",
    "titolo di quarto livello": "#### quarto",
  };
  const fermate: string[] = [];
  for (const [nome, sonda] of Object.entries(sonde)) {
    try {
      convertiLaGuida(nome, `# Titolo\n\n${sonda}\n`, inHtml);
    } catch (e) {
      if (String(e).includes("non sa mostrare")) fermate.push(nome);
    }
  }
  expect(fermate).toEqual(Object.keys(sonde));
  // Controllo positivo: l'insieme ammesso è quello delle due guide, e le due guide passano.
  for (const l of ["it", "en"] as const) {
    const usate = new Set([...inHtml(markdown(l)).matchAll(/<([a-z0-9]+)[\s>]/g)].map((m) => m[1]!));
    expect([...usate].sort()).toEqual([...ETICHETTE_AMMESSE].sort());
    expect(() => convertiLaGuida(fileDelleGuide[l], markdown(l), inHtml)).not.toThrow();
  }
});
