// I casi d'uso nella finestra, sotto happy-dom: la finestra vera (`Applicazione`), col file dato all'avvio da un guscio
// simulato, e i clic e i tasti come li dà l'utente.
//
// - «Esegui tutti» sul corpus della tappa 1: per ogni caso, l'esito mostrato nella scheda (il segno, le differenze campo
//   per campo, gli avvisi a parte) è quello della riga di comando (`bun run casi`, eseguita come processo a parte: un
//   oracolo fuori dalla finestra), appaiato nei due versi col conteggio esibito. Il controllo positivo: quattro file
//   del corpus con l'atteso alterato (l'output di un carattere, il codice dell'errore, gli avvisi tolti, un errore
//   statico atteso) e uno con un blocco alterato danno lo stesso esito diverso nei due, e la riga di comando lo vede.
// - Il menu della riga (tasto destro) ha le stesse voci sul dato e sul caso, appaiate nei due versi.
// - Un caso si elimina solo dopo la conferma (Canc, il menu, i campi); Annulla lo rimette.
// - I campi del caso: doppio clic, conferma come un passo della cronologia, Annulla lo toglie; un caso scritto con i
//   clic su un progetto senza regole si salva e si riapre identico; un nome già usato non si conferma e lo dice, e
//   quei campi rifiutati, rimasti nell'altra scheda o nel pannello chiuso, tornano in vista con «Salva».
// - Duplica e Sposta, sul caso e sul dato, in Annulla e Ripeti; il dato spostato sposta il suo valore iniziale sotto
//   «Inizio».
// - Una voce destinata a un dato che non c'è è segnata nei campi del caso. Rinominando un dato di lavoro omonimo in due
//   procedure chiamate dal programma, i valori del programma restano e l'avviso dice dove è l'altro dato.
// - La scelta del blocco del valore iniziale di un dato segue il dato quando le righe cambiano posto (spostato, duplicato
//   o cancellato un dato sopra, Annulla), e non passa al dato che prende quella posizione.
// - Dopo una modifica il segno verde si svuota e il rosso diventa giallo, ognuno sul suo caso; Annulla fino al progetto
//   eseguito li riaccende.
// - La casella di ogni caso, quella in testa che li seleziona o li toglie tutti (la sua scritta dice quale dei due),
//   «Esegui i selezionati»: i casi non selezionati tengono il loro segno; la casella in testa (in un verso o nell'altro)
//   e la spunta tolta al caso scelto chiudono l'esito aperto sotto di lui. Una riga è: la casella, il nome, «Esegui» e
//   «Passo passo», il pallino in fondo. La selezione è per nome: Annulla e Ripeti riportano la spunta dei casi che
//   tornano (eliminati, o col nome di prima), e gli altri tengono quella di adesso.
// - Le linguette portano il numero dei dati e dei casi.
// - I casi delle tappe 2 e 3, del programma principale e di ogni procedura o funzione nella sua scheda: «Esegui tutti»
//   campo per campo e «Esegui» di ogni caso nella colonna (il pallino), contro la stessa riga di comando, appaiati nei due
//   versi col conteggio esibito; il controllo positivo con l'atteso di un caso di una funzione alterato.
//
// Che cosa NON guarda:
// - l'aspetto e la finestra che risponde durante «Esegui tutti» (happy-dom non disegna né misura il tempo: lo
//   guardano i motori, `e2e/casi.e2e.ts`);
// - i casi della tappa 4, la ricorsione (li prova «Esegui tutti» contro la riga di comando: `tutti.test.ts`);
// - un parametro nel menu del dato (la tappa 1 non ha funzioni: il rifiuto lo prova il nucleo);
// - il caso eseguito nella colonna, «Attendi questo errore», «Togli l'errore atteso» e «Scrivi gli avvisi» (li prova
//   `colonna.test.tsx`);
// - i limiti delle Impostazioni nei casi: «Esegui tutti» li passa all'esecuzione, ma qui si eseguono coi predefiniti
//   (la prova coi limiti scelti è quella del caso eseguito nella colonna, `colonna.test.tsx`);
// - un lettore di schermo vero: i nomi si leggono dagli attributi.

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { conUnaLetturaNelDatoDiLavoro } from "../../core/casi/casi-di-prova";
import { apri, salva } from "../../core/progetto/formato";
import { testiDeiCodici } from "../../i18n/codici";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Applicazione } from "../Applicazione";
import { scelteIniziali } from "../preferenze";

const misura = (t: string) => [...t].length * 10;
const CARTELLA = new URL("../../casi/tappa-1/", import.meta.url);
const DOPO = ["tappa-2", "tappa-3"].map((t) => new URL(`../../casi/${t}/`, import.meta.url));
const RADICE = fileURLToPath(new URL("../../", import.meta.url));
const corpus = readdirSync(CARTELLA)
  .filter((n) => n.endsWith(".algo"))
  .sort();

/** Il file che il guscio simulato dà all'avvio, e i testi scritti da «Salva». */
let datoAllAvvio = { percorso: "", testo: "" };
const scritti: { percorso: string; testo: string }[] = [];
beforeAll(() => {
  mockIPC((comando, a) => {
    const argomenti = (a ?? {}) as Record<string, unknown>;
    switch (comando) {
      case "file_dato_all_avvio":
        return datoAllAvvio.percorso;
      case "leggi_progetto":
        if (argomenti.percorso !== datoAllAvvio.percorso) throw new Error("file non trovato");
        return datoAllAvvio.testo;
      case "scrivi_progetto":
        scritti.push({ percorso: String(argomenti.percorso), testo: String(argomenti.testo) });
        return null;
      case "elenca_esempi":
      case "elenca_librerie":
        return { cartella: "C:\\esempi", predefinita: "C:\\esempi", mancante: false, esiste: true, file: [], gruppi: [] };
      case "segna_modificato":
        return null;
    }
    throw new Error(`comando non simulato: ${comando}`);
  });
});
afterAll(() => clearMocks());
afterEach(() => cleanup());

/** Un giro dell'interfaccia: i fotogrammi (qui `setImmediate`) e gli aggiornamenti di React. */
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 0)));
const avviso = () => document.querySelector('output[role="status"]')?.textContent ?? "";

async function aspetta(cosa: string, fatto: () => boolean, giri = 20_000): Promise<void> {
  for (let i = 0; i < giri; i++) {
    if (fatto()) return;
    await giro();
  }
  throw new Error(`non arriva: ${cosa} (avviso «${avviso()}»)`);
}

/** La finestra col file aperto all'avvio. */
async function apriLaFinestra(nome: string, testo: string): Promise<void> {
  datoAllAvvio = { percorso: `C:\\corpus\\${nome}`, testo };
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} scelteIniziali={scelteIniziali} />);
  });
  await aspetta(`«${nome}» aperto`, () => avviso() === riempi(testi.apertoIl, { file: nome }));
}

const clic = (e: Element) => act(async () => void fireEvent.click(e));
const tasto = (e: Element, key: string, altro: Partial<KeyboardEventInit> = {}) => act(async () => void fireEvent.keyDown(e, { key, ...altro }));

/** La scheda del pannello con quel nome (il nome dei casi porta il loro numero). */
const linguetta = (nome: string | RegExp) =>
  [...document.querySelectorAll('[role="tab"]')].find((t) => (typeof nome === "string" ? t.textContent === nome : nome.test(t.textContent ?? "")))!;
async function vaiAiCasi(): Promise<void> {
  const l = linguetta(/^Casi d'uso \(\d+\)$/);
  expect(l, "la scheda dei casi d'uso non c'è").toBeDefined();
  await clic(l);
}
async function vaiAiDati(): Promise<void> {
  await clic(linguetta(/^Dati \(\d+\)$/));
}
const righeDeiCasi = () => [...document.querySelectorAll<HTMLElement>("tr[data-caso]")];
const rigaDelCaso = (i: number) => document.querySelector<HTMLElement>(`tr[data-caso="${i}"]`)!;
const nomeDelCaso = (r: Element) => r.querySelector("[data-nome-caso]")?.textContent ?? "";
const nomiDeiCasi = () => righeDeiCasi().map(nomeDelCaso);
const pulsante = (testo: string, dentro: ParentNode = document) => [...dentro.querySelectorAll("button")].find((b) => b.textContent === testo);

async function eseguiTutti(): Promise<void> {
  const p = pulsante(testi.eseguiTutti);
  expect(p, "«Esegui tutti» non c'è").toBeDefined();
  await clic(p!);
  await aspetta("la fine di «Esegui tutti»", () => document.querySelector("[data-avanzamento]") === null && document.querySelector("[data-riassunto]") !== null);
}

// ------------------------------------------------------------------ l'esito: la finestra contro la riga di comando

/** L'esito di un caso, come la riga di comando lo stampa e come la scheda lo mostra. */
interface Esito {
  readonly esito: "VERDE" | "AVVISI DIVERSI" | "ROSSO";
  readonly campi: Readonly<Record<string, { readonly atteso: string; readonly ottenuto: string }>>;
  readonly avvisi: { readonly attesi: string; readonly ottenuti: string } | null;
}

/** Una stringa JSON che comincia in `s[i]`: il valore e dove finisce. */
function stringaJson(s: string, i: number): { valore: string; fine: number } {
  if (s[i] !== '"') throw new Error(`manca la stringa in «${s}»`);
  let j = i + 1;
  while (s[j] !== '"') j += s[j] === "\\" ? 2 : 1;
  return { valore: JSON.parse(s.slice(i, j + 1)) as string, fine: j + 1 };
}
/** «atteso "…", ottenuto "…"» (e quello che segue): i due valori. */
function coppia(s: string, a: string, b: string): { atteso: string; ottenuto: string } {
  if (!s.startsWith(`${a} `)) throw new Error(`riga inattesa: ${s}`);
  const x = stringaJson(s, a.length + 1);
  const resto = s.slice(x.fine);
  if (!resto.startsWith(`, ${b} `)) throw new Error(`riga inattesa: ${s}`);
  const y = stringaJson(resto, b.length + 3);
  return { atteso: x.valore, ottenuto: y.valore };
}

/** La riga di comando sui file dati (nessuno: il corpus), in un processo a parte: gli esiti per `file#caso`. */
function oracolo(file: readonly string[]): { esiti: Map<string, Esito>; uscita: string } {
  const r = Bun.spawnSync(["bun", "strumenti/casi.ts", ...file], { cwd: RADICE, stdout: "pipe", stderr: "pipe" });
  const uscita = r.stdout.toString();
  if (r.stderr.length > 0) throw new Error(`la riga di comando scrive sull'errore: ${r.stderr.toString()}`);
  const esiti = new Map<string, Esito>();
  let ultimo: { id: string; esito: Esito["esito"]; campi: Record<string, { atteso: string; ottenuto: string }>; avvisi: Esito["avvisi"] } | null = null;
  const chiudi = () => {
    if (ultimo) esiti.set(ultimo.id, { esito: ultimo.esito, campi: ultimo.campi, avvisi: ultimo.avvisi });
    ultimo = null;
  };
  for (const riga of uscita.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    if ((m = /^VERDE (.+#.*)$/.exec(riga))) {
      chiudi();
      ultimo = { id: m[1]!, esito: "VERDE", campi: {}, avvisi: null };
    } else if ((m = /^AVVISI DIVERSI (.+#.*): output ed errori come attesi$/.exec(riga))) {
      chiudi();
      ultimo = { id: m[1]!, esito: "AVVISI DIVERSI", campi: {}, avvisi: null };
    } else if ((m = /^ROSSO (.+#.*) \[[a-z_, ]+\]$/.exec(riga))) {
      chiudi();
      ultimo = { id: m[1]!, esito: "ROSSO", campi: {}, avvisi: null };
    } else if (riga.startsWith("  avvisi: ") && ultimo) {
      const c = coppia(riga.slice("  avvisi: ".length), "attesi", "ottenuti");
      ultimo.avvisi = { attesi: c.atteso, ottenuti: c.ottenuto };
    } else if ((m = /^ {2}(output|error|static_error): (.*)$/.exec(riga)) && ultimo) ultimo.campi[m[1]!] = coppia(m[2]!, "atteso", "ottenuto");
    else chiudi();
  }
  chiudi();
  return { esiti, uscita };
}

/** Il testo mostrato in un riquadro dell'output, senza i segni che non ne fanno parte (gli a capo resi visibili, «(niente)»). */
function testoMostrato(e: Element | null): string {
  if (!e) return "?";
  const copia = e.cloneNode(true) as Element;
  for (const s of copia.querySelectorAll("[data-segno-testo]")) s.remove();
  return copia.textContent ?? "";
}

/** L'esito di ogni caso del file aperto, letto dalla scheda dopo «Esegui tutti»: si sceglie un caso alla volta, e sotto
 * di lui si leggono le differenze. Controlla anche che le parole mostrate per un errore siano quelle del suo codice. */
async function esitiMostrati(file: string, funzione?: string): Promise<Map<string, Esito>> {
  const esiti = new Map<string, Esito>();
  for (let i = 0; i < righeDeiCasi().length; i++) {
    const riga = rigaDelCaso(i);
    await act(async () => void fireEvent.focus(riga));
    await clic(riga);
    const segno = riga.querySelector("[data-esito]")?.getAttribute("data-esito");
    const d = document.querySelector("[data-differenze]");
    const campi: Record<string, { atteso: string; ottenuto: string }> = {};
    for (const c of d?.querySelectorAll("[data-campo]") ?? []) {
      const nome = c.getAttribute("data-campo")!;
      if (nome === "output") campi[nome] = { atteso: testoMostrato(c.querySelector("[data-atteso]")), ottenuto: testoMostrato(c.querySelector("[data-ottenuto]")) };
      else {
        const leggi = (sel: string) => {
          const x = c.querySelector(sel)!;
          const s = x.getAttribute("data-segnalazione")!;
          const codice = s.split("@")[0] as keyof (typeof testiDeiCodici)["it"];
          expect(x.textContent).toEqual(s === "nessuno" ? testi.diffNessuno : expect.stringContaining(testiDeiCodici.it[codice].breve));
          return s;
        };
        campi[nome] = { atteso: leggi("[data-atteso]"), ottenuto: leggi("[data-ottenuto]") };
      }
    }
    const a = d?.querySelector("[data-avvisi]");
    const avvisi = a ? { attesi: a.getAttribute("data-attesi")!, ottenuti: a.getAttribute("data-ottenuti")! } : null;
    const esito = segno === "raggiunto" ? (avvisi ? "AVVISI DIVERSI" : "VERDE") : segno === "non-raggiunto" ? "ROSSO" : `segno ${segno}`;
    esiti.set(`${file}#${funzione === undefined ? "" : `${funzione}/`}${nomeDelCaso(riga)}`, { esito: esito as Esito["esito"], campi, avvisi });
  }
  return esiti;
}

/** I due elenchi appaiati nei due versi: le chiavi mancanti di qua e di là, e i casi diversi. */
function confronta(oracolo: Map<string, Esito>, finestra: Map<string, Esito>): string[] {
  const diversi: string[] = [];
  for (const k of oracolo.keys()) if (!finestra.has(k)) diversi.push(`${k}: solo nella riga di comando`);
  for (const k of finestra.keys()) if (!oracolo.has(k)) diversi.push(`${k}: solo nella finestra`);
  for (const [k, e] of oracolo) {
    const f = finestra.get(k);
    if (f && JSON.stringify(f) !== JSON.stringify(e)) diversi.push(`${k}: riga di comando ${JSON.stringify(e)}, finestra ${JSON.stringify(f)}`);
  }
  return diversi;
}

test("«Esegui tutti» sul corpus: ogni caso con l'esito della riga di comando, campo per campo", async () => {
  const { esiti: attesi, uscita } = oracolo([]);
  // Solo i casi della tappa 1: quelli delle tappe dopo la riga di comando non li esegue.
  const tappa1 = new Map([...attesi].filter(([k]) => k.startsWith("tappa-1/")));
  const visti = new Map<string, Esito>();
  for (const nome of corpus) {
    await apriLaFinestra(nome, readFileSync(new URL(nome, CARTELLA), "utf8"));
    await vaiAiCasi();
    await eseguiTutti();
    for (const [k, e] of await esitiMostrati(`tappa-1/${nome.slice(0, -".algo".length)}`)) visti.set(k, e);
    cleanup();
  }
  const conti = (m: Map<string, Esito>) => [...m.values()].reduce<Record<string, number>>((c, e) => ({ ...c, [e.esito]: (c[e.esito] ?? 0) + 1 }), {});
  console.log(`casi nella finestra ${visti.size}, nella riga di comando ${tappa1.size}; esiti della finestra ${JSON.stringify(conti(visti))}, della riga di comando ${JSON.stringify(conti(tappa1))}`);
  expect(confronta(tappa1, visti)).toEqual([]);
  // Il denominatore: i 57 casi della riga di comando (il riepilogo stampato da lei), e almeno un file con due casi.
  expect(uscita).toContain(`tappa 1: casi dichiarati ${tappa1.size}, eseguiti ${tappa1.size}`);
  expect(tappa1.size).toBeGreaterThan(corpus.length);
}, 600_000);

test("controllo positivo: un atteso alterato dà lo stesso esito diverso nella finestra e nella riga di comando", async () => {
  const cartella = mkdtempSync(join(tmpdir(), "casi-alterati-"));
  type Progetto = { functions: { body: { values: string[] }[] }[]; test_cases: (Record<string, unknown> & { expected: Record<string, unknown> })[] };
  const alterato = (nome: string, cambia: (caso: Progetto["test_cases"][number], progetto: Progetto) => void) => {
    const p = JSON.parse(readFileSync(new URL(nome, CARTELLA), "utf8")) as Progetto;
    cambia(p.test_cases[0]!, p);
    const percorso = join(cartella, nome);
    writeFileSync(percorso, JSON.stringify(p, null, 2));
    return percorso;
  };
  const file = [
    // L'output di un carattere.
    alterato("riferimento-media-voti.algo", (c) => {
      const o = c.expected.output as string;
      c.expected.output = `${o.slice(0, 3)}${o[3] === "x" ? "y" : "x"}${o.slice(4)}`;
    }),
    // Il codice dell'errore atteso (lo stesso blocco).
    alterato("divisione-per-zero.algo", (c) => {
      c.expected.error = { ...(c.expected.error as object), code: "integer_overflow" };
    }),
    // Gli avvisi attesi tolti.
    alterato("divisione-intera-in-reale.algo", (c) => {
      delete c.expected.warnings;
    }),
    // Un errore statico atteso (il progetto non dovrebbe partire, e non scrivere nulla).
    alterato("scrittura-intero.algo", (c) => {
      c.expected = { output: "", static_error: { code: "unknown_name", block: "b1" } };
    }),
    // Un blocco alterato, non l'atteso: il primo valore scritto senza il valore assoluto.
    alterato("valore-assoluto.algo", (_, p) => {
      p.functions[0]!.body[0]!.values[0] = "n";
    }),
  ];
  const { esiti: attesi } = oracolo(file);
  const visti = new Map<string, Esito>();
  for (const percorso of file) {
    const nome = percorso.split(/[\\/]/).at(-1)!;
    await apriLaFinestra(nome, readFileSync(percorso, "utf8"));
    await vaiAiCasi();
    await eseguiTutti();
    for (const [k, e] of await esitiMostrati(percorso)) visti.set(k, e);
    cleanup();
  }
  // La premessa: le alterazioni mordono nella riga di comando (quattro rossi, sull'output, sull'errore, sull'output e
  // l'errore statico, sull'output del blocco alterato, e un caso con gli avvisi diversi).
  expect([...attesi.values()].map((e) => `${e.esito} ${Object.keys(e.campi).join(",")}`)).toEqual(["ROSSO output", "ROSSO error", "AVVISI DIVERSI ", "ROSSO output,static_error", "ROSSO output"]);
  expect(confronta(attesi, visti)).toEqual([]);
}, 120_000);

// I file delle tappe 2 e 3 coi loro casi: quelli del programma principale e, per ogni procedura o funzione che ne ha,
// i suoi (nella sua scheda), anche quelli con una funzione che restituisce una stringa o un vettore.
const tutteLeTappeDopo = DOPO.flatMap((c) =>
  readdirSync(c)
    .filter((n) => n.endsWith(".algo"))
    .sort()
    .map((nome) => {
      const testo = readFileSync(new URL(nome, c), "utf8");
      const p = JSON.parse(testo) as {
        test_cases?: unknown[];
        functions: { id: string; kind: string; name?: string; return_type?: string; return_size?: number; test_cases?: unknown[] }[];
      };
      const funzioni = p.functions.filter((f) => f.kind !== "main" && (f.test_cases?.length ?? 0) > 0).map((f) => ({ id: f.id, nome: f.name! }));
      const casi = (p.test_cases?.length ?? 0) + p.functions.reduce((n, f) => n + (f.test_cases?.length ?? 0), 0);
      return { file: `${c.pathname.split("/").at(-2)}/${nome.slice(0, -".algo".length)}`, nome, testo, delProgramma: (p.test_cases?.length ?? 0) > 0, funzioni, casi };
    }),
);
const dopo = tutteLeTappeDopo;

/** La scheda di una procedura o di una funzione, dall'elenco. */
async function mostraLaFunzione(id: string): Promise<void> {
  await clic(document.querySelector("[data-elenco-funzioni]")!);
  await giro();
  await clic(document.querySelector(`[data-elenco] [data-voce-funzione="${id}"]`)!);
  await giro();
}

/** «Esegui» di ogni caso della scheda nella colonna, uno alla volta: il pallino di ognuno, come esito della riga di comando
 * (raggiunto con o senza avvisi diversi, o rosso). L'esito si aspetta nell'avviso (un caso che attende un errore statico
 * non apre la colonna); ogni volta la colonna si chiude con «Ferma» (Maiusc+F5), che toglie l'avviso. */
async function palliniNellaColonna(file: string, funzione?: string): Promise<Map<string, string>> {
  const pallini = new Map<string, string>();
  for (let i = 0; i < righeDeiCasi().length; i++) {
    await vaiAiCasi();
    const riga = rigaDelCaso(i);
    const nome = nomeDelCaso(riga);
    const inizio = riempi(testi.esitoDelCasoRaggiunto, { nome }).split("»")[0]!;
    await clic(riga.querySelector('[data-esegui-caso="tutto"]')!);
    await aspetta(`l'esito di «${nome}» nella colonna`, () => avviso().startsWith(`${inizio}»`));
    await giro();
    const segno = rigaDelCaso(i).querySelector("[data-esito]")?.getAttribute("data-esito");
    pallini.set(`${file}#${funzione === undefined ? "" : `${funzione}/`}${nome}`, segno ?? "?");
    await act(async () => void fireEvent.keyDown(document.body, { key: "F5", shiftKey: true }));
    await giro();
  }
  return pallini;
}

/** I casi dei file dati nella finestra, con «Esegui tutti» (campo per campo) e con «Esegui» nella colonna (il pallino). */
async function nellaFinestra(file: readonly { file: string; nome: string; testo: string; delProgramma: boolean; funzioni: readonly { id: string; nome: string }[] }[]) {
  const tutti = new Map<string, Esito>();
  const pallini = new Map<string, string>();
  for (const f of file) {
    await apriLaFinestra(f.nome, f.testo);
    const schede = [...(f.delProgramma ? [undefined] : []), ...f.funzioni];
    for (const s of schede) {
      if (s !== undefined) await mostraLaFunzione(s.id);
      await vaiAiCasi();
      await eseguiTutti();
      for (const [k, e] of await esitiMostrati(f.file, s?.nome)) tutti.set(k, e);
      for (const [k, e] of await palliniNellaColonna(f.file, s?.nome)) pallini.set(k, e);
    }
    cleanup();
  }
  return { tutti, pallini };
}
/** L'esito della riga di comando come pallino. */
const comePallino = (e: Esito) => (e.esito === "ROSSO" ? "non-raggiunto" : "raggiunto");
/** I due elenchi di pallini appaiati nei due versi. */
function confrontaIPallini(oracolo: Map<string, Esito>, finestra: Map<string, string>): string[] {
  const diversi: string[] = [];
  for (const k of oracolo.keys()) if (!finestra.has(k)) diversi.push(`${k}: solo nella riga di comando`);
  for (const k of finestra.keys()) if (!oracolo.has(k)) diversi.push(`${k}: solo nella finestra`);
  for (const [k, e] of oracolo) if (finestra.has(k) && finestra.get(k) !== comePallino(e)) diversi.push(`${k}: riga di comando ${comePallino(e)}, finestra ${finestra.get(k)}`);
  return diversi;
}

test("i casi delle tappe 2 e 3, del programma e di ogni procedura o funzione, con l'esito della riga di comando", async () => {
  const { esiti: attesi, uscita } = oracolo([]);
  const delleTappe = new Map([...attesi].filter(([k]) => k.startsWith("tappa-2/") || k.startsWith("tappa-3/")));
  const { tutti, pallini } = await nellaFinestra(dopo);
  const diFunzioni = [...tutti.keys()].filter((k) => k.includes("/", k.indexOf("#"))).length;
  console.log(`tappe 2 e 3: file ${dopo.length}, casi nella finestra ${tutti.size} (di funzioni ${diFunzioni}), pallini nella colonna ${pallini.size}, nella riga di comando ${delleTappe.size}`);
  expect(confronta(delleTappe, tutti)).toEqual([]);
  expect(confrontaIPallini(delleTappe, pallini)).toEqual([]);
  // Il denominatore: i casi che la riga di comando dichiara per le due tappe, e i casi delle funzioni a parte; i file sono
  // tutti quelli delle due tappe, anche i 15 con una funzione che restituisce una stringa o un vettore.
  const dichiarati = (t: number) => Number(new RegExp(`tappa ${t}: casi dichiarati (\\d+), eseguiti \\1`).exec(uscita)?.[1] ?? -1);
  // La riga di comando conta i casi delle funzioni di tutte le tappe: quelli delle altre tappe si tolgono.
  const diUnaFunzione = (k: string) => k.includes("/", k.indexOf("#"));
  const altrove = [...attesi.keys()].filter((k) => !delleTappe.has(k) && diUnaFunzione(k)).length;
  const funzioni = Number(/casi di funzioni (\d+)/.exec(uscita)?.[1] ?? -1) - altrove;
  expect({ casi: delleTappe.size, funzioni: diFunzioni, file: dopo.length }).toEqual({ casi: dichiarati(2) + dichiarati(3), funzioni, file: 68 });
}, 600_000);

test("controllo positivo: l'atteso alterato di un caso di una funzione dà lo stesso rosso nella finestra e nella riga di comando", async () => {
  const cartella = mkdtempSync(join(tmpdir(), "casi-alterati-"));
  const nome = "riferimento-media-voti-funzioni.algo";
  const p = JSON.parse(readFileSync(new URL(nome, DOPO[1]), "utf8")) as { functions: { name?: string; test_cases?: { expected: { output: string } }[] }[] };
  p.functions.find((f) => f.name === "valido")!.test_cases![0]!.expected.output = "→ false\n";
  const percorso = join(cartella, nome);
  writeFileSync(percorso, JSON.stringify(p, null, 2));
  const { esiti: attesi } = oracolo([percorso]);
  const daQui = new Map([...attesi].filter(([k]) => k.includes("#valido/")));
  const { tutti, pallini } = await nellaFinestra([{ file: percorso, nome, testo: readFileSync(percorso, "utf8"), delProgramma: false, funzioni: [{ id: "f3", nome: "valido" }] }]);
  // La premessa: l'alterazione morde nella riga di comando, sul caso alterato e solo lì.
  expect([...daQui].map(([k, e]) => `${k.slice(k.indexOf("#"))} ${e.esito}`)).toEqual(["#valido/voto valido ROSSO", "#valido/voto troppo alto VERDE"]);
  expect(confronta(daQui, tutti)).toEqual([]);
  expect(confrontaIPallini(daQui, pallini)).toEqual([]);
}, 120_000);

// ---------------------------------------------------------------------------- la scheda, i campi, il menu

/** Un progetto con due dati e un caso, senza regole (o con le regole date). */
const conDueCasi = (regole: unknown[] = []) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "due casi" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "n", type: "integer", role: "input" },
          { name: "doppio", type: "integer", role: "output", initial: "0" },
        ],
        body: regole,
        end: { id: "b9" },
      },
    ],
    test_cases: [
      { name: "tre", inputs: [{ data: "n", text: "3" }], expected: { output: "6\n" } },
      { name: "zero", inputs: [{ data: "n", text: "0" }], expected: { output: "0\n" } },
    ],
  });
const regoleDelDoppio = [
  { id: "b1", kind: "read", target: "n" },
  { id: "b2", kind: "assignment", target: "doppio", value: "n * 2" },
  { id: "b3", kind: "write", values: ["doppio"], newline: true },
];

/** Il menu della riga, aperto col tasto destro: il suo nome e le sue voci. */
async function menuDi(riga: Element): Promise<{ nome: string; voci: string[] }> {
  await act(async () => void fireEvent.contextMenu(riga));
  const menu = document.querySelector('[role="menu"]');
  const letto = { nome: menu?.getAttribute("aria-label") ?? "", voci: [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map((v) => v.textContent ?? "") };
  if (menu) await tasto(menu, "Escape");
  return letto;
}

test("il menu della riga ha le stesse voci sul dato e sul caso, appaiate nei due versi", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi());
  const delDato = await menuDi(document.querySelector('[data-dato="dati-0"]')!);
  await vaiAiCasi();
  const delCaso = await menuDi(rigaDelCaso(0));
  console.log(`voci del menu: dato ${delDato.voci.length} (${delDato.voci.join(", ")}), caso ${delCaso.voci.length} (${delCaso.voci.join(", ")})`);
  expect({ dato: delDato.nome, caso: delCaso.nome }).toEqual({ dato: riempi(testi.menuDelDato, { nome: "n" }), caso: riempi(testi.menuDelCaso, { nome: "tre" }) });
  expect(delDato.voci.filter((v) => !delCaso.voci.includes(v))).toEqual([]);
  expect(delCaso.voci.filter((v) => !delDato.voci.includes(v))).toEqual([]);
  // Controllo positivo: le quattro voci ci sono.
  expect(delCaso.voci).toEqual([testi.menuElimina, testi.menuDuplica, testi.menuSu, testi.menuGiu]);
});

/** La finestra di conferma aperta, col suo titolo. */
const conferma = () => document.querySelector('[role="alertdialog"]');

test("un caso si elimina solo dopo la conferma: Canc, il menu e i campi; Annulla lo rimette", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi());
  await vaiAiCasi();
  const vie: [string, () => Promise<void>][] = [
    ["Canc", async () => tasto(rigaDelCaso(0), "Delete")],
    [
      "il menu",
      async () => {
        await act(async () => void fireEvent.contextMenu(rigaDelCaso(0)));
        await clic(pulsante(testi.menuElimina, document.querySelector('[role="menu"]')!)!);
      },
    ],
    [
      "i campi",
      async () => {
        await act(async () => void fireEvent.doubleClick(rigaDelCaso(0)));
        await clic(pulsante(testi.eliminaCaso)!);
      },
    ],
  ];
  for (const [via, fai] of vie) {
    await fai();
    // La finestra c'è, e il caso è ancora lì.
    expect({ via, titolo: conferma()?.textContent?.includes(riempi(testi.eliminaCasoTitolo, { nome: "tre" })), nomi: nomiDeiCasi() }).toEqual({ via, titolo: true, nomi: ["tre", "zero"] });
    await clic(pulsante(testi.eliminaConferma, conferma()!)!);
    expect({ via, nomi: nomiDeiCasi() }).toEqual({ via, nomi: ["zero"] });
    await tasto(document.body, "z", { ctrlKey: true });
    expect({ via, nomi: nomiDeiCasi() }).toEqual({ via, nomi: ["tre", "zero"] });
  }
});

test("la selezione è per nome: un caso eliminato ne esce, Annulla lo riporta intero con la sua spunta, Ripeti lo toglie; gli altri tengono la spunta di adesso; lo stesso con la rinomina", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi());
  await vaiAiCasi();
  const selezionati = (n: number) => pulsante(riempi(testi.eseguiSelezionati, { n: String(n) }));
  const casella = (i: number) => rigaDelCaso(i).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  const stato = () => ({ nomi: nomiDeiCasi(), caselle: righeDeiCasi().map((r) => r.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked) });
  const annulla = async () => {
    await tasto(document.body, "z", { ctrlKey: true });
    await giro();
  };
  const ripeti = async () => {
    await tasto(document.body, "y", { ctrlKey: true });
    await giro();
  };
  await clic(casella(0));
  expect(selezionati(1)?.getAttribute("aria-disabled") ?? null).toBeNull();
  // Il caso intero com'è prima: il nome, i valori e l'output atteso nella sua riga.
  const tre = rigaDelCaso(0).textContent;
  await tasto(rigaDelCaso(0), "Delete");
  await clic(pulsante(testi.eliminaConferma, conferma()!)!);
  await giro();
  expect(nomiDeiCasi()).toEqual(["zero"]);
  // Il nome tolto non resta nella selezione: «Esegui i selezionati (0)», spento.
  expect(selezionati(0)?.getAttribute("aria-disabled")).toBe("true");
  // Una spunta messa dopo l'eliminazione non è un passo: Annulla la lascia.
  await clic(casella(0));
  await annulla();
  expect({ ...stato(), tre: rigaDelCaso(0).textContent === tre }).toEqual({ nomi: ["tre", "zero"], caselle: [true, true], tre: true });
  await clic(casella(1));
  await ripeti();
  expect(stato()).toEqual({ nomi: ["zero"], caselle: [false] });
  await annulla();
  expect(stato()).toEqual({ nomi: ["tre", "zero"], caselle: [true, false] });
  // La rinomina: la spunta segue il nome nuovo; Annulla la riporta al nome di prima, Ripeti a quello nuovo.
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(0)));
  await act(async () => void fireEvent.change(campoDelCaso(testi.casoNome), { target: { value: "tre bis" } }));
  await clic(pulsante(testi.conferma, document.querySelector<HTMLFormElement>("form[data-campi-caso]")!)!);
  await giro();
  expect(stato()).toEqual({ nomi: ["tre bis", "zero"], caselle: [true, false] });
  await annulla();
  expect(stato()).toEqual({ nomi: ["tre", "zero"], caselle: [true, false] });
  await ripeti();
  expect(stato()).toEqual({ nomi: ["tre bis", "zero"], caselle: [true, false] });
});

const campoDelCaso = (nome: string) =>
  [...(document.querySelector<HTMLFormElement>("form[data-campi-caso]")?.querySelectorAll<HTMLInputElement>("input, textarea, select") ?? [])].find((c) => c.getAttribute("aria-label") === nome)!;

/** I campi del caso aperti: il modulo. */
const campi = () => document.querySelector<HTMLFormElement>("form[data-campi-caso]");
const campo = (nome: string) => [...(campi()?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select") ?? [])].find((c) => c.getAttribute("aria-label") === nome)!;
const scrivi = (c: Element, valore: string) => act(async () => void fireEvent.change(c, { target: { value: valore } }));

test("i campi del caso: doppio clic, la conferma è un passo, Annulla e Ripeti; un nome già usato non si conferma", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi());
  await vaiAiCasi();
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(1)));
  expect(campi()?.getAttribute("aria-label")).toBe(riempi(testi.modificaDelCaso, { nome: "zero" }));
  await scrivi(campo(testi.casoNome), "nulla");
  await scrivi(campo(riempi(testi.casoTestoDelValore, { n: "1" })), "00");
  await clic(pulsante(testi.conferma, campi()!)!);
  expect({ aperti: campi() !== null, nomi: nomiDeiCasi(), voci: rigaDelCaso(1).querySelector("[data-voci]")?.textContent }).toEqual({ aperti: false, nomi: ["tre", "nulla"], voci: "n: 00" });
  await tasto(document.body, "z", { ctrlKey: true });
  expect(nomiDeiCasi()).toEqual(["tre", "zero"]);
  await tasto(document.body, "y", { ctrlKey: true });
  expect(nomiDeiCasi()).toEqual(["tre", "nulla"]);
  // Un nome già usato: i campi restano aperti e lo dicono.
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(1)));
  await scrivi(campo(testi.casoNome), "tre");
  expect(campi()?.textContent).toContain("Due casi d'uso hanno lo stesso nome.");
  await clic(pulsante(testi.conferma, campi()!)!);
  expect({ aperti: campi() !== null, nomi: nomiDeiCasi() }).toEqual({ aperti: true, nomi: ["tre", "nulla"] });
});

test("un file con un caso che si chiama come «procedura/caso» si apre; nei campi un nome così non si conferma e lo dicono", async () => {
  const p = JSON.parse(conDueCasi(regoleDelDoppio));
  p.functions.push({ id: "f2", kind: "procedure", name: "p", data: [], body: [], end: { id: "b8" }, test_cases: [{ name: "uno", inputs: [], expected: { output: "" } }] });
  p.test_cases[0].name = "p/uno";
  await apriLaFinestra("si-confonde.algo", JSON.stringify(p));
  await vaiAiCasi();
  expect(nomiDeiCasi()).toEqual(["p/uno", "zero"]);
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(1)));
  await scrivi(campo(testi.casoNome), "p/uno");
  const detto = campi()?.textContent?.includes(testi.casoNomeConfuso) ?? false;
  await clic(pulsante(testi.conferma, campi()!)!);
  expect({ detto, aperti: campi() !== null, nomi: nomiDeiCasi() }).toEqual({ detto: true, aperti: true, nomi: ["p/uno", "zero"] });
});

test("i campi rifiutati di un caso tornano in vista: dall'altra scheda e col pannello chiuso, «Salva» riapre la scheda dei casi", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi());
  await vaiAiCasi();
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(1)));
  await scrivi(campo(testi.casoNome), "tre");
  const pannello = () => document.querySelector<HTMLElement>(`section[aria-label="${testi.vistaDati}"]`)!;
  const inVista = () => ({ pannello: !pannello().hidden, casi: linguetta(/^Casi d'uso \(\d+\)$/).getAttribute("aria-selected") === "true", campi: campi() !== null });
  // Sulla scheda dei dati, e poi col pannello chiuso dal pulsante «Dati»: Ctrl+S non salva, e i campi tornano in vista.
  const scrittiPrima = scritti.length;
  await vaiAiDati();
  expect(inVista()).toEqual({ pannello: true, casi: false, campi: true });
  await tasto(document.body, "s", { ctrlKey: true });
  expect({ ...inVista(), avviso: avviso() }).toEqual({ pannello: true, casi: true, campi: true, avviso: testi.modificaRifiutata });
  await clic(document.querySelector(`header button[data-comando="dati"]`)!);
  expect(inVista()).toEqual({ pannello: false, casi: true, campi: true });
  await tasto(document.body, "s", { ctrlKey: true });
  expect(inVista()).toEqual({ pannello: true, casi: true, campi: true });
  expect(scritti.length).toBe(scrittiPrima);
});

test("un caso scritto con i clic su un progetto senza regole si salva e si riapre identico; con le regole è raggiunto", async () => {
  const senzaRegole = JSON.parse(conDueCasi()) as { test_cases?: unknown };
  delete senzaRegole.test_cases;
  await apriLaFinestra("solo-dati.algo", JSON.stringify(senzaRegole));
  await vaiAiCasi();
  await clic(pulsante(testi.aggiungiCaso)!);
  await scrivi(campo(testi.casoNome), "sette");
  await clic(pulsante(testi.casoAggiungiValore, campi()!)!);
  await scrivi(campo(riempi(testi.casoTestoDelValore, { n: "1" })), "7");
  await scrivi(campo(testi.casoOutput), "14\n");
  await clic(pulsante(testi.conferma, campi()!)!);
  scritti.length = 0;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("il salvataggio", () => scritti.length === 1);
  const salvato = JSON.parse(scritti[0]!.testo) as { test_cases: unknown };
  expect(salvato.test_cases).toEqual([{ name: "sette", inputs: [{ data: "n", text: "7" }], expected: { output: "14\n" } }]);
  // Eseguito senza regole: non raggiunto (l'output è vuoto).
  await eseguiTutti();
  expect(rigaDelCaso(0).querySelector("[data-esito]")?.getAttribute("data-esito")).toBe("non-raggiunto");
  cleanup();
  // Riaperto con le regole: lo stesso caso, raggiunto.
  const conRegole = JSON.parse(scritti[0]!.testo) as { functions: { body: unknown[] }[] };
  conRegole.functions[0]!.body = regoleDelDoppio;
  await apriLaFinestra("solo-dati.algo", JSON.stringify(conRegole));
  await vaiAiCasi();
  expect({ nomi: nomiDeiCasi(), voci: rigaDelCaso(0).querySelector("[data-voci]")?.textContent }).toEqual({ nomi: ["sette"], voci: "n: 7" });
  await eseguiTutti();
  expect(rigaDelCaso(0).querySelector("[data-esito]")?.getAttribute("data-esito")).toBe("raggiunto");
});

test("Duplica e Sposta sul caso e sul dato, in Annulla e Ripeti; il dato spostato sposta il suo valore iniziale", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi(regoleDelDoppio));
  const voce = async (riga: Element, nome: string) => {
    await act(async () => void fireEvent.contextMenu(riga));
    await clic(pulsante(nome, document.querySelector('[role="menu"]')!)!);
  };
  // Il caso.
  await vaiAiCasi();
  await voce(rigaDelCaso(0), testi.menuDuplica);
  expect(nomiDeiCasi()).toEqual(["tre", "tre (copia)", "zero"]);
  await voce(rigaDelCaso(2), testi.menuSu);
  expect(nomiDeiCasi()).toEqual(["tre", "zero", "tre (copia)"]);
  await tasto(document.body, "z", { ctrlKey: true });
  expect(nomiDeiCasi()).toEqual(["tre", "tre (copia)", "zero"]);
  await tasto(document.body, "z", { ctrlKey: true });
  expect(nomiDeiCasi()).toEqual(["tre", "zero"]);
  await tasto(document.body, "y", { ctrlKey: true });
  expect(nomiDeiCasi()).toEqual(["tre", "tre (copia)", "zero"]);
  // Il dato.
  await vaiAiDati();
  const nomiDeiDati = () => [...document.querySelectorAll('tr[data-dato^="dati-"] > th')].map((t) => t.textContent);
  const valoriSottoInizio = () => [...document.querySelectorAll("[data-valore-iniziale]")].map((g) => g.getAttribute("data-valore-iniziale"));
  await voce(document.querySelector('[data-dato="dati-1"]')!, testi.menuDuplica);
  expect({ dati: nomiDeiDati(), valori: valoriSottoInizio() }).toEqual({ dati: ["n", "doppio", "doppio_2"], valori: ["doppio", "doppio_2"] });
  await voce(document.querySelector('[data-dato="dati-2"]')!, testi.menuSu);
  await voce(document.querySelector('[data-dato="dati-1"]')!, testi.menuSu);
  expect({ dati: nomiDeiDati(), valori: valoriSottoInizio() }).toEqual({ dati: ["doppio_2", "n", "doppio"], valori: ["doppio_2", "doppio"] });
  await tasto(document.body, "z", { ctrlKey: true });
  expect(nomiDeiDati()).toEqual(["n", "doppio_2", "doppio"]);
  // Al bordo la voce non è disponibile.
  await act(async () => void fireEvent.contextMenu(document.querySelector('[data-dato="dati-0"]')!));
  expect(pulsante(testi.menuSu, document.querySelector('[role="menu"]')!)?.getAttribute("aria-disabled")).toBe("true");
});

test("una voce destinata a un dato che non c'è è segnata nei campi del caso", async () => {
  const p = JSON.parse(conDueCasi()) as { test_cases: { inputs: { data: string }[] }[] };
  p.test_cases[0]!.inputs[0]!.data = "m";
  await apriLaFinestra("voce-senza-dato.algo", JSON.stringify(p));
  await vaiAiCasi();
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(0)));
  const scelta = campo(riempi(testi.casoDatoDelValore, { n: "1" })) as HTMLSelectElement;
  expect({ invalido: scelta.getAttribute("aria-invalid"), mostrato: scelta.selectedOptions[0]?.textContent }).toEqual({ invalido: "true", mostrato: riempi(testi.casoDatoMancante, { dato: "m" }) });
  expect(campi()?.textContent).toContain(riempi(testi.casoDatoMancanteSpiegazione, { n: "1", dato: "m" }));
  // Controllo positivo: la voce del secondo caso va a un dato che c'è, e non è segnata.
  await tasto(campi()!, "Escape");
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(1)));
  expect(campo(riempi(testi.casoDatoDelValore, { n: "1" })).getAttribute("aria-invalid")).toBeNull();
});

/** Le voci di una scelta: per ogni gruppo (il primo senza nome) i suoi valori. */
const gruppiDi = (s: HTMLSelectElement) =>
  [...s.children].reduce<[string, string[]][]>((g, c) => {
    if (c.tagName === "OPTGROUP") g.push([c.getAttribute("label") ?? "", [...c.querySelectorAll("option")].map((o) => o.value)]);
    else if (g.length === 0 || g.at(-1)![0] !== "") g.push(["", [(c as HTMLOptionElement).value]]);
    else g.at(-1)![1].push((c as HTMLOptionElement).value);
    return g;
  }, []);

test("una voce può andare al dato di lavoro di una procedura chiamata, che una lettura riceve: la scelta lo offre nel gruppo della procedura, e non è segnato", async () => {
  const base = apri(readFileSync(new URL("lettura-attraverso-riferimento.algo", DOPO[1]), "utf8"));
  if (!base.ok) throw new Error("lettura-attraverso-riferimento");
  await apriLaFinestra("lettura-nel-dato-di-lavoro.algo", salva(conUnaLetturaNelDatoDiLavoro(base.progetto)));
  const vista: Record<string, unknown> = {};
  for (const [scheda, id] of [["programma", undefined], ["chiedi", "f2"]] as const) {
    if (id !== undefined) await mostraLaFunzione(id);
    await vaiAiCasi();
    await act(async () => void fireEvent.doubleClick(rigaDelCaso(0)));
    const scelta = campo(riempi(testi.casoDatoDelValore, { n: "1" })) as HTMLSelectElement;
    vista[scheda] = { invalido: scelta.getAttribute("aria-invalid"), valore: scelta.value, spiegato: campi()?.textContent?.includes("non è fra i dati") ?? null, gruppi: gruppiDi(scelta) };
    await tasto(campi()!, "Escape");
  }
  const diLeggi = riempi(testi.casoDatiDi, { nome: "leggi" });
  expect(vista).toEqual({
    programma: { invalido: null, valore: "riga", spiegato: false, gruppi: [["", ["n"]], [diLeggi, ["riga"]]] },
    chiedi: { invalido: null, valore: "riga", spiegato: false, gruppi: [["", ["numero"]], [diLeggi, ["riga"]]] },
  });
});

/** Il programma chiama `uno` e `due`, che leggono ognuna un suo dato `riga`; il caso dà un valore a ciascuna. */
const DUE_RIGHE = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "due-righe" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [],
      body: [
        { id: "b1", kind: "call", callee: "uno", arguments: [] },
        { id: "b2", kind: "call", callee: "due", arguments: [] },
      ],
      end: { id: "b3" },
    },
    ...[
      ["f2", "uno", 4],
      ["f3", "due", 7],
    ].map(([id, nome, b]) => ({
      id,
      kind: "procedure",
      name: nome,
      data: [{ name: "riga", type: "integer" }],
      body: [
        { id: `b${b}`, kind: "read", target: "riga" },
        { id: `b${Number(b) + 1}`, kind: "write", values: ["riga"], newline: true },
      ],
      end: { id: `b${Number(b) + 2}` },
    })),
  ],
  test_cases: [{ name: "uno e due", inputs: [{ data: "riga", text: "1" }, { data: "riga", text: "2" }], expected: { output: "1\n2\n" } }],
});

test("rinominare un dato di lavoro omonimo in due procedure chiamate: i valori dei casi restano, e l'avviso dice dove è l'altro", async () => {
  await apriLaFinestra("due-righe.algo", DUE_RIGHE);
  await mostraLaFunzione("f2");
  await vaiAiDati();
  await act(async () => void fireEvent.doubleClick(document.querySelector('[data-dato="dati-0"]')!));
  const nome = [...document.querySelectorAll<HTMLInputElement>("input")].find((c) => c.getAttribute("aria-label") === testi.datiNome)!;
  await act(async () => void fireEvent.change(nome, { target: { value: "testo" } }));
  await tasto(nome, "Enter");
  await giro();
  expect(avviso()).toBe(riempi(testi.casoValoriRestano, { nome: "riga", nuovo: "testo", dove: riempi(testi.casoValoriRestanoIn, { nome: "due" }) }));
  // Il file salvato: il dato rinominato, e i due valori del programma che vanno ancora a «riga».
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("il file salvato", () => scritti.length > prima);
  const p = apri(scritti.at(-1)!.testo);
  expect(p.ok && [p.progetto.functions[1]!.data[0]!.name, p.progetto.test_cases![0]!.inputs.map((x) => x.data)]).toEqual(["testo", ["riga", "riga"]]);
});

test("la stessa rinomina confermata senza Invio, salvando o cambiando scheda coi campi aperti: lo stesso avviso, dopo quello del salvataggio", async () => {
  const restano = riempi(testi.casoValoriRestano, { nome: "riga", nuovo: "testo", dove: riempi(testi.casoValoriRestanoIn, { nome: "due" }) });
  const scriviIlNome = async () => {
    await mostraLaFunzione("f2");
    await vaiAiDati();
    await act(async () => void fireEvent.doubleClick(document.querySelector('[data-dato="dati-0"]')!));
    const nome = [...document.querySelectorAll<HTMLInputElement>("input")].find((c) => c.getAttribute("aria-label") === testi.datiNome)!;
    await act(async () => void fireEvent.change(nome, { target: { value: "testo" } }));
  };
  await apriLaFinestra("due-righe.algo", DUE_RIGHE);
  await scriviIlNome();
  const prima = scritti.length;
  await tasto(document.body, "s", { ctrlKey: true });
  await aspetta("il file salvato", () => scritti.length > prima);
  const p = apri(scritti.at(-1)!.testo);
  // Premessa: la rinomina c'è stata, col salvataggio.
  expect(p.ok && p.progetto.functions[1]!.data[0]!.name).toBe("testo");
  expect(avviso()).toBe(`${riempi(testi.salvatoIl, { file: "due-righe.algo" })} ${restano}`);
  cleanup();
  await apriLaFinestra("due-righe.algo", DUE_RIGHE);
  await scriviIlNome();
  await mostraLaFunzione("f3");
  expect(avviso()).toBe(restano);
});

/** Una procedura con due parametri vettore, un numero e due parametri per riferimento, e un caso con le voci di ognuno. */
const conIParametri = (voci: unknown[]) =>
  JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "parametri" },
    functions: [
      { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
      {
        id: "f2",
        kind: "procedure",
        name: "prova",
        data: [
          { name: "v", type: "integer", size: 3, parameter: "value" },
          { name: "w", type: "integer", size: 3, parameter: "value" },
          { name: "k", type: "integer", parameter: "value" },
          { name: "r", type: "integer", parameter: "reference" },
          { name: "s", type: "integer", parameter: "reference" },
        ],
        body: [],
        end: { id: "b2" },
        test_cases: [{ name: "voci", inputs: voci, expected: { output: "" } }],
      },
    ],
  });

test("cambiando il dato di una voce restano «in ogni elemento» e «senza valore» se il dato nuovo li ammette", async () => {
  await apriLaFinestra("parametri.algo", conIParametri([{ data: "v", text: "1", each: true }, { data: "r" }]));
  await mostraLaFunzione("f2");
  await vaiAiCasi();
  await act(async () => void fireEvent.doubleClick(rigaDelCaso(0)));
  const scelta = (n: number) => campo(riempi(testi.casoDatoDelValore, { n: String(n) }));
  const casella = (chiave: string, n: number) => (campo(riempi(chiave, { n: String(n) })) as HTMLInputElement | undefined)?.checked ?? null;
  const caselle = () => ({ ognuno: casella(testi.casoOgniElementoN, 1), senza: casella(testi.casoSenzaValoreN, 2) });
  expect(caselle()).toEqual({ ognuno: true, senza: true });
  await scrivi(scelta(1), "w");
  await scrivi(scelta(2), "s");
  expect(caselle()).toEqual({ ognuno: true, senza: true });
  // Un dato che non li ammette li toglie: un numero non ha elementi, un parametro per valore vuole il valore.
  await scrivi(scelta(1), "k");
  await scrivi(scelta(2), "k");
  expect(caselle()).toEqual({ ognuno: null, senza: null });
});

test("la voce in ogni elemento senza testo si legge tutta nella riga del caso", async () => {
  await apriLaFinestra("parametri.algo", conIParametri([{ data: "v", each: true }]));
  await mostraLaFunzione("f2");
  await vaiAiCasi();
  expect(rigaDelCaso(0).querySelector("[data-voci]")?.textContent).toBe(riempi(testi.casoVoceSenzaValoreOgniElemento, { dato: "v" }));
});

/** Un progetto coi due casi e le regole del doppio, dove il secondo caso attende un output sbagliato (non raggiunto). */
const conUnoSbagliato = () => {
  const p = JSON.parse(conDueCasi(regoleDelDoppio)) as { test_cases: { expected: { output: string } }[] };
  p.test_cases[1]!.expected.output = "1\n";
  return JSON.stringify(p);
};
const segni = () => righeDeiCasi().map((r) => r.querySelector("[data-esito]")?.getAttribute("data-esito"));

test("i segni dopo una modifica: il verde si svuota, il rosso diventa giallo; Annulla fino al progetto eseguito li riaccende", async () => {
  await apriLaFinestra("due-casi.algo", conUnoSbagliato());
  await vaiAiCasi();
  expect(segni()).toEqual(["mai", "mai"]);
  await eseguiTutti();
  expect({ segni: segni(), riassunto: document.querySelector("[data-riassunto]")?.textContent }).toEqual({ segni: ["raggiunto", "non-raggiunto"], riassunto: riempi(testi.casiRaggiuntoUno, { totale: "2" }) });
  // Una modifica qualunque del progetto (qui l'ordine dei casi): ogni caso tiene il suo segno, spostato con lui.
  await act(async () => void fireEvent.contextMenu(rigaDelCaso(1)));
  await clic(pulsante(testi.menuSu, document.querySelector('[role="menu"]')!)!);
  expect({ nomi: nomiDeiCasi(), segni: segni() }).toEqual({ nomi: ["zero", "tre"], segni: ["da-rieseguire", "raggiunto-prima"] });
  await tasto(document.body, "z", { ctrlKey: true });
  expect(segni()).toEqual(["raggiunto", "non-raggiunto"]);
});

test("la casella di ogni caso, quella che li seleziona tutti, «Esegui i selezionati»: gli altri tengono il loro segno", async () => {
  await apriLaFinestra("due-casi.algo", conUnoSbagliato());
  await vaiAiCasi();
  const caselle = () => righeDeiCasi().map((r) => r.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  const tutte = document.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!;
  // La scritta della casella in testa, la sua etichetta: dice che cosa fa un clic.
  const scritta = () => tutte.closest("label")?.textContent;
  const selezionati = (n: number) => pulsante(riempi(testi.eseguiSelezionati, { n: String(n) }));
  // Nessuno selezionato: il comando c'è, non disponibile.
  expect({ tutte: tutte.checked, scritta: scritta(), caselle: caselle().map((c) => c.checked), comando: selezionati(0)?.getAttribute("aria-disabled") }).toEqual({
    tutte: false,
    scritta: testi.selezionaTutti,
    caselle: [false, false],
    comando: "true",
  });
  // L'ordine di una riga: la casella, il nome, «Esegui» e «Passo passo», il pallino in fondo.
  expect([...rigaDelCaso(0).children].map((c) => (c.querySelector('input[type="checkbox"]') ? "casella" : c.hasAttribute("data-esito") ? "pallino" : c.querySelector("[data-nome-caso]") ? "nome" : c.querySelector("[data-esegui-caso]") ? "comandi" : "?"))).toEqual(["casella", "nome", "comandi", "pallino"]);
  await clic(caselle()[1]!);
  expect({ indeterminata: tutte.indeterminate, comando: selezionati(1)?.getAttribute("aria-disabled") ?? null }).toEqual({ indeterminata: true, comando: null });
  await clic(selezionati(1)!);
  await aspetta("la fine dei selezionati", () => document.querySelector("[data-avanzamento]") === null && document.querySelector("[data-riassunto]") !== null);
  expect(segni()).toEqual(["mai", "non-raggiunto"]);
  // L'annuncio conta i casi di questa corsa: uno, non raggiunto (prima contava tutti: «0 raggiunti su 2»).
  expect(avviso()).toBe(riempi(testi.annuncioCasi, { esito: riempi(testi.casiRaggiunti, { n: "0", totale: "1" }) }));
  // Tutti selezionati dalla casella in testa, poi eseguiti: anche il primo ha il suo segno.
  await clic(tutte);
  expect({ caselle: caselle().map((c) => c.checked), scritta: scritta() }).toEqual({ caselle: [true, true], scritta: testi.deselezionaTutti });
  await clic(selezionati(2)!);
  await aspetta("la fine dei selezionati", () => document.querySelector("[data-avanzamento]") === null && segni()[0] !== "mai");
  expect(segni()).toEqual(["raggiunto", "non-raggiunto"]);
  // Sotto il caso scelto, il suo esito; la casella in testa li toglie tutti, e il riquadro dell'esito si chiude.
  await clic(rigaDelCaso(1));
  expect(document.querySelector("[data-differenze]")?.getAttribute("data-esito")).toBe("non-raggiunto");
  await clic(tutte);
  expect({ caselle: caselle().map((c) => c.checked), esito: document.querySelector("[data-differenze]")?.getAttribute("data-esito") ?? null }).toEqual({ caselle: [false, false], esito: null });
  // Anche selezionandoli tutti il riquadro dell'esito si chiude.
  await clic(rigaDelCaso(1));
  expect(document.querySelector("[data-differenze]") !== null).toBe(true);
  await clic(tutte);
  expect({ caselle: caselle().map((c) => c.checked), esito: document.querySelector("[data-differenze]")?.getAttribute("data-esito") ?? null }).toEqual({ caselle: [true, true], esito: null });
  // Togliere la spunta al caso di cui si guarda l'esito lo chiude; spuntare o togliere un altro caso no.
  await clic(rigaDelCaso(1));
  await clic(caselle()[0]!);
  expect({ caselle: caselle().map((c) => c.checked), esito: document.querySelector("[data-differenze]")?.getAttribute("data-esito") }).toEqual({ caselle: [false, true], esito: "non-raggiunto" });
  await clic(caselle()[1]!);
  expect({ caselle: caselle().map((c) => c.checked), esito: document.querySelector("[data-differenze]")?.getAttribute("data-esito") ?? null }).toEqual({ caselle: [false, false], esito: null });
});

test("le linguette portano il numero dei dati e dei casi", async () => {
  await apriLaFinestra("due-casi.algo", conDueCasi());
  expect([...document.querySelectorAll('[role="tab"]')].map((l) => l.textContent)).toEqual([riempi(testi.schedaDati, { n: "2" }), riempi(testi.schedaCasi, { n: "2" })]);
});

test("la scelta del blocco di un valore iniziale segue il suo dato: spostato, duplicato, un dato cancellato sopra, Annulla", async () => {
  const nome = "riferimento-media-voti.algo";
  await apriLaFinestra(nome, readFileSync(new URL(nome, CARTELLA), "utf8"));
  const scelto = () => [...document.querySelectorAll('[data-iniziale][aria-pressed="true"]')].map((g) => g.getAttribute("data-iniziale-di"));
  const rigaDi = (dato: string) => document.querySelector(`[data-dato="${document.querySelector(`[data-iniziale-di="${dato}"]`)!.getAttribute("data-iniziale")}"]`)!;
  const voce = async (riga: Element, testo: string) => {
    await act(async () => void fireEvent.contextMenu(riga));
    await clic(pulsante(testo, document.querySelector('[role="menu"]')!)!);
  };
  const visti: Record<string, unknown> = {};
  await clic(document.querySelector('[data-iniziale-di="somma"]')!);
  visti.prima = scelto();
  await voce(rigaDi("somma"), testi.menuSu);
  visti.spostato = scelto();
  // Duplicato un dato sopra: le righe sotto scendono di un posto.
  await voce(document.querySelector('[data-dato="dati-0"]')!, testi.menuDuplica);
  visti.duplicatoSopra = scelto();
  // Cancellato il dato sopra (la copia appena fatta, che nessuna regola usa).
  await tasto(document.querySelector('[data-dato="dati-1"]')!, "Delete");
  if (conferma()) await clic(pulsante(testi.eliminaConferma, conferma()!)!);
  visti.cancellatoSopra = scelto();
  await tasto(document.body, "z", { ctrlKey: true });
  visti.annullato = scelto();
  expect(visti).toEqual({ prima: ["somma"], spostato: ["somma"], duplicatoSopra: ["somma"], cancellatoSopra: ["somma"], annullato: ["somma"] });
});
