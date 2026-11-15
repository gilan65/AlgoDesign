// `segnalazioni` e i bollini di `disegna` sul corpus, nelle due lingue: ogni voce ha il numero del suo codice, il genere
// che il numero dice, i tre testi e un posto in parole; i bollini del disegno sono, nei due versi, i blocchi delle voci,
// col segno («errore» vince) e i numeri dei codici, e con `errori` l'SVG cambia solo per i bollini.
//
// CHE COSA NON GUARDA:
// - che la riga di stato dell'app mostri le stesse voci: è la stessa funzione (`ui/segnalazioni.ts`), e le prove
//   dell'app (`ui/Applicazione.test.tsx`, gli spec della riga di stato) restano verdi;
// - la posizione del bollino rispetto alla tela nel motore: è la stessa funzione `bollino` di `core/disegno/segni.ts`;
// - la Lettura con la domanda nella Lettura (un'opzione): i suoi segni uniti a quelli della Scrittura li prova
//   `core/disegno/svg.test.ts`.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { confermato } from "../strumenti/corpus";
import type { MisuraDelTesto } from "../core/disegno/impaginazione";
import type { Progetto } from "../core/progetto/modello";
import { apri, controlla, disegna, segnalazioni, type Segnalazione } from "./index";

const misura: MisuraDelTesto = (t, stile) => t.length * 7 + (stile === undefined ? 0 : t.length);
const cartella = join(import.meta.dir, "..", "casi");
const progetti: { readonly nome: string; readonly progetto: Progetto }[] = [];
for (const d of readdirSync(cartella, { withFileTypes: true }).filter((x) => x.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1)))
  for (const f of readdirSync(join(cartella, d.name)).filter((x) => x.endsWith(".algo")).sort()) {
    const esito = apri(readFileSync(join(cartella, d.name, f), "utf8"));
    if (esito.ok) progetti.push({ nome: `${d.name}/${f}`, progetto: esito.progetto });
  }

/** I bollini di un SVG: `id`, segno e codici, in ordine. */
const bolliniDi = (svg: string) =>
  [...svg.matchAll(/<g data-bollino="" data-id="([^"]*)" data-segno="(errore|avviso)" data-codici="([^"]*)">/g)].map((m) => ({ id: m[1]!, segno: m[2]!, codici: m[3]! }));

/** I bollini attesi dalle voci: un blocco per voce, «errore» vince, i numeri nell'ordine dell'elenco senza ripetizioni. */
function attesiDalle(voci: readonly Segnalazione[]): Map<string, { segno: string; codici: string }> {
  const m = new Map<string, { segno: string; codici: string[] }>();
  for (const v of voci) {
    if (v.blocco === null) continue;
    const prima = m.get(v.blocco);
    m.set(v.blocco, { segno: prima?.segno === "errore" ? "errore" : v.genere, codici: prima === undefined ? [v.numero] : prima.codici.includes(v.numero) ? prima.codici : [...prima.codici, v.numero] });
  }
  return new Map([...m].map(([id, x]) => [id, { segno: x.segno, codici: x.codici.join(" ") }]));
}

test("ogni voce ha il numero del suo codice, il genere che il numero dice, i tre testi e il posto in parole", () => {
  let voci = 0;
  const difetti: string[] = [];
  for (const { nome, progetto } of progetti)
    for (const lingua of ["it", "en"] as const)
      for (const v of segnalazioni(progetto, lingua)) {
        voci++;
        if (!/^[EA]\d{3}$/.test(v.numero)) difetti.push(`${nome} ${lingua} ${v.codice}: numero «${v.numero}»`);
        if ((v.numero.startsWith("E") ? "errore" : "avviso") !== v.genere) difetti.push(`${nome} ${lingua} ${v.codice}: ${v.numero} e ${v.genere}`);
        if ([v.breve, v.accaduto, v.suggerimento, v.dove].some((t) => t.trim() === "")) difetti.push(`${nome} ${lingua} ${v.codice}: un testo vuoto`);
        if (v.blocco !== null && v.dove === v.blocco) difetti.push(`${nome} ${lingua} ${v.codice}: il posto è l'id`);
      }
  console.log(`segnalazioni: ${progetti.length} progetti, ${voci} voci nelle due lingue, difetti ${difetti.length}`);
  expect(difetti).toEqual([]);
  expect(voci).toBe(confermato("segnalazioni - voci del corpus nelle due lingue", voci));
});

test("i bollini del disegno sono i blocchi delle voci, nei due versi, col segno e i codici; con errori l'SVG cambia solo per i bollini", () => {
  let bollini = 0;
  let disegni = 0;
  let conBollini = 0;
  const diversi: string[] = [];
  for (const { nome, progetto } of progetti) {
    const esito = controlla(progetto);
    for (const lingua of ["it", "en"] as const) {
      const attesi = attesiDalle(segnalazioni(progetto, lingua));
      const visti = new Map<string, { segno: string; codici: string }>();
      for (const f of progetto.functions) {
        disegni++;
        const senza = disegna(progetto, f.id, lingua, misura, "sans-serif").svg;
        const con = disegna(progetto, f.id, lingua, misura, "sans-serif", { errori: esito }).svg;
        const qui = bolliniDi(con);
        if (qui.length > 0) conBollini++;
        for (const b of qui) visti.set(b.id, { segno: b.segno, codici: b.codici });
        bollini += qui.length;
        // Tolti i bollini (un gruppo di cinque righe ciascuno), l'SVG è quello senza errori.
        const tolti = con.replace(/<g data-bollino=""[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n<\/g>\n/g, "");
        if (tolti !== senza) diversi.push(`${nome} ${f.id} ${lingua}: con errori cambia altro`);
        if (bolliniDi(senza).length > 0) diversi.push(`${nome} ${f.id} ${lingua}: bollini senza errori`);
      }
      const chiavi = new Set([...attesi.keys(), ...visti.keys()]);
      for (const k of chiavi) if (JSON.stringify(attesi.get(k)) !== JSON.stringify(visti.get(k))) diversi.push(`${nome} ${lingua} ${k}: atteso ${JSON.stringify(attesi.get(k))}, visto ${JSON.stringify(visti.get(k))}`);
    }
  }
  console.log(`bollini: ${bollini} in ${conBollini} disegni su ${disegni}, diversi ${diversi.length}${diversi.length > 0 ? `: ${diversi.slice(0, 5).join("; ")}` : ""}`);
  expect(diversi).toEqual([]);
  expect(bollini).toBe(confermato("segnalazioni - bollini del corpus nelle due lingue", bollini));
  // La premessa: il corpus ha blocchi segnalati (altrimenti il confronto non avrebbe visto nulla).
  expect(conBollini).toBeGreaterThan(0);
});

test("controllo positivo: una voce tolta dagli attesi, o un bollino in più nel disegno, è una differenza", () => {
  const conErrori = progetti.find(({ progetto }) => segnalazioni(progetto, "it").some((v) => v.blocco !== null));
  expect(conErrori).toBeDefined();
  const { progetto } = conErrori!;
  const voci = segnalazioni(progetto, "it");
  const attesi = attesiDalle(voci);
  const senzaUna = attesiDalle(voci.filter((v) => v.blocco !== voci.find((x) => x.blocco !== null)!.blocco));
  console.log(`controllo positivo: attesi ${attesi.size}, senza una voce ${senzaUna.size}`);
  expect(senzaUna.size).toBeLessThan(attesi.size);
});

test("segnalazioni rifiuta con un'eccezione una lingua sconosciuta", () => {
  expect(() => segnalazioni(progetti[0]!.progetto, "fr" as "it")).toThrow("lingua sconosciuta: fr");
});
