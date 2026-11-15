// Il pacchetto del nucleo gira anche in una pagina, senza Node: caricato in un contesto `node:vm` creato vuoto (i soli
// `module` ed `exports`, nessun `process`, `Buffer`, `require`, `global`), apre ogni progetto del corpus, lo controlla, ne
// dà le segnalazioni e ne disegna ogni funzione coi bollini, nelle due lingue, e l'esito, l'elenco e l'SVG sono quelli dei
// sorgenti. Il controllo positivo: lo stesso pacchetto con una riga che usa un globale di Node in
// testa non si carica in quel contesto, con l'errore del nome che manca.
//
// CHE COSA NON GUARDA:
// - il DOM: nel contesto non c'è, e il pacchetto non lo usa (lo vieta la configurazione del nucleo);
// - le funzioni che il contratto non chiama qui (`genera`, `leggiAccademico`, `aggiungiAllaLibreria`): le esegue Node in
//   `conformita-del-nucleo.test.ts`; il codice che generano porta `process` nelle sue stringhe, mai eseguito qui;
// - un globale usato solo in un ramo che i progetti scelti non attraversano.
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";
import { apri as apriNeiSorgenti, controlla as controllaNeiSorgenti, disegna as disegnaNeiSorgenti, segnalazioni as segnalazioniNeiSorgenti, type MisuraDelTesto } from "../entrypoint/index";
import { costruisciIlNucleo, fileDelNucleo } from "./conformita-del-nucleo";
import { confermato } from "./corpus";

const LIMITE = 120_000;
const cartella = mkdtempSync(join(tmpdir(), "nucleo senza node-"));
afterAll(() => rmSync(cartella, { recursive: true, force: true }));

/** Le funzioni del pacchetto caricato in un contesto con i soli `module` ed `exports`. */
function caricaSenzaNode(codice: string): Record<string, (...a: unknown[]) => unknown> {
  const modulo = { exports: {} as Record<string, (...a: unknown[]) => unknown> };
  const contesto = createContext({ module: modulo, exports: modulo.exports });
  runInContext(codice, contesto, { filename: fileDelNucleo });
  return modulo.exports;
}

const misura: MisuraDelTesto = (t, stile) => t.length * 7 + (stile === undefined ? 0 : t.length);

/** Tutti i progetti del corpus, in ordine di nome (`readdirSync` dà l'ordine del file system). */
const casi = join(import.meta.dir, "..", "casi");
const scelti = readdirSync(casi, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .sort((a, b) => (a.name < b.name ? -1 : 1))
  .flatMap((d) => readdirSync(join(casi, d.name)).filter((f) => f.endsWith(".algo")).sort().map((f) => `${d.name}/${f.slice(0, -".algo".length)}`));

let costruito: Promise<string> | undefined;
const pacchetto = () =>
  (costruito ??= (async () => {
    const uscita = join(cartella, fileDelNucleo);
    await costruisciIlNucleo(uscita);
    return readFileSync(uscita, "utf8");
  })());

test("il contesto è davvero senza Node: i globali di Node non ci sono, quelli del linguaggio sì", () => {
  const contesto = createContext({});
  expect(runInContext("[typeof process, typeof Buffer, typeof require, typeof global, typeof module]", contesto)).toEqual(["undefined", "undefined", "undefined", "undefined", "undefined"]);
  expect(runInContext("[typeof Math, typeof Map, typeof TextDecoder === 'function' || typeof TextDecoder === 'undefined']", contesto)).toEqual(["object", "function", true]);
});

test("senza Node il pacchetto apre, controlla e disegna, e l'SVG è quello dei sorgenti", async () => {
  const nucleo = caricaSenzaNode(await pacchetto());
  let funzioni = 0;
  const diversi: string[] = [];
  let controllati = 0;
  for (const nome of scelti) {
    const testo = readFileSync(join(casi, `${nome}.algo`), "utf8");
    const esito = nucleo.apri!(testo) as { ok: boolean; progetto: { functions: { id: string }[] } };
    const atteso = apriNeiSorgenti(testo);
    if (!esito.ok || !atteso.ok) {
      diversi.push(`${nome}: non si apre`);
      continue;
    }
    if (JSON.stringify(nucleo.controlla!(esito.progetto)) === JSON.stringify(controllaNeiSorgenti(atteso.progetto))) controllati++;
    else diversi.push(`${nome}: il controllo è diverso`);
    const errori = controllaNeiSorgenti(atteso.progetto);
    for (const lingua of ["it", "en"] as const)
      if (JSON.stringify(nucleo.segnalazioni!(esito.progetto, lingua)) !== JSON.stringify(segnalazioniNeiSorgenti(atteso.progetto, lingua))) diversi.push(`${nome} ${lingua}: le segnalazioni sono diverse`);
    for (const f of atteso.progetto.functions) {
      funzioni++;
      for (const lingua of ["it", "en"] as const) {
        // Coi bollini: il disegno col controllo dato, come lo dà chi chiama.
        const senzaNode = nucleo.disegna!(esito.progetto, f.id, lingua, misura, "sans-serif", { errori }) as { svg: string };
        if (senzaNode.svg !== disegnaNeiSorgenti(atteso.progetto, f.id, lingua, misura, "sans-serif", { errori }).svg) diversi.push(`${nome} ${f.id} ${lingua}`);
      }
    }
  }
  console.log(`senza Node: ${scelti.length} progetti (controllo uguale in ${controllati}), ${funzioni} funzioni disegnate in due lingue, diversi ${diversi.length}`);
  expect(diversi).toEqual([]);
  expect(controllati).toBe(scelti.length);
  expect(funzioni).toBe(confermato("disegna - funzioni del corpus", funzioni));
}, LIMITE);

test("controllo positivo: una riga con un globale di Node in testa al pacchetto non si carica senza Node", async () => {
  const codice = await pacchetto();
  for (const globale of ["process.env", "Buffer.from", "require", "global.x"]) {
    let errore = "";
    try {
      caricaSenzaNode(`void ${globale};\n${codice}`);
    } catch (e) {
      errore = String(e);
    }
    console.log(`controllo positivo ${globale}: ${errore}`);
    expect(errore).toContain("ReferenceError");
  }
}, LIMITE);
