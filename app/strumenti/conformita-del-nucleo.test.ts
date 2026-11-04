// La conformità del pacchetto del nucleo per Node: sotto Node dà ciò che i sorgenti del nucleo danno sotto Bun, su tutto il corpus
// di questo momento, per ogni voce del registro e nelle due lingue, rifiuti compresi; e `controlla`, `leggiAccademico` e
// `aggiungiAllaLibreria` su ogni progetto, più i rami che il corpus non esercita, con casi fatti a mano.
//
// I due lati stanno in due processi, e i dati in due file JSON (`conformita-attesi.ts`, `conformita-ottenuto.cjs`); enumerano il
// corpus da soli. La costruzione e i verdetti sono in `conformita-del-nucleo.ts`, dove è scritto anche che cosa non guarda.
//
// I denominatori e gli esiti per motivo non sono scritti qui: `confermato`, da `bun run conferma-corpus`. I rossi si
// confrontano per riga intera, mai per sottostringa: una riga simile a quella giusta è un altro rosso. Ogni mutazione colpisce una
// sola combinazione vera di una copia, e il rosso deve nominare quella e nessun'altra.
//
// Il tempo: costruzione, due lati e una corsa in più col pacchetto alterato, 2,5 secondi tutto il file a macchina libera. Si
// stampa; il limite è suo (`LIMITE`), perché la prima prova li paga tutti e sotto carico i processi di Windows ne vogliono di più.

import { afterAll, expect, test } from "bun:test";
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { linguaggi } from "../core/genera/linguaggi";
import { confermato } from "./corpus";
import {
  caduteAllUscita,
  costruisciIlNucleo,
  esportazioniAttese,
  fileDelNucleo,
  importDel,
  latoAtteso,
  latoOttenuto,
  motiviDi,
  nodeDellaToolchain,
  percorsoVietato,
  postoDelModulo,
  problemiDelPacchetto,
  puntoDIngresso,
  scartiDeiMotivi,
  verdetto,
  vietateNel,
  type Esiti,
} from "./conformita-del-nucleo";
import { lingueDelCodice } from "./esecutori";

const LIMITE = 120_000;
const radice = join(import.meta.dir, "..");
const corpus = join(radice, "casi");
// Due spazi nel nome: il pacchetto e i lati devono reggere un percorso così.
const cartella = mkdtempSync(join(tmpdir(), "conformita  del nucleo-"));
afterAll(() => rmSync(cartella, { recursive: true, force: true }));

/** Il progetto delle combinazioni colpite dalle mutazioni: un nome vero, che ha testi e rifiuti. */
const COLPITO = "tappa-1/arrotonda-meta";

/** Una volta sola, per tutte le prove: chi arriva prima paga. */
let preparati: Promise<{ pacchetto: string; node: string; attesi: Esiti; ottenuto: Esiti; esportazioni: readonly string[]; moduli: readonly string[]; millisecondi: number }> | undefined;
const lati = () =>
  (preparati ??= (async () => {
    const inizio = performance.now();
    const pacchetto = join(cartella, fileDelNucleo);
    const { byte, moduli } = await costruisciIlNucleo(pacchetto);
    const node = nodeDellaToolchain();
    const [attesi, o] = await Promise.all([latoAtteso(corpus, join(cartella, "attesi.json")), latoOttenuto(node, pacchetto, corpus, join(cartella, "ottenuto.json"))]);
    const millisecondi = Math.round(performance.now() - inizio);
    console.log(`pacchetto: ${byte} byte, ${moduli.length} moduli; ${Object.keys(attesi).length} esiti per lato; costruzione e due lati ${millisecondi} ms`);
    return { pacchetto, node, attesi, ottenuto: o.esiti, esportazioni: o.esportazioni, moduli, millisecondi };
  })());

/** I file del corpus, enumerati qui: il riscontro di ciò che i due lati enumerano da soli. */
const fileDelCorpus = (): string[] =>
  readdirSync(corpus, { withFileTypes: true })
    .filter((v) => v.isDirectory())
    .flatMap((v) => readdirSync(join(corpus, v.name)).filter((f) => f.endsWith(".algo")).map((f) => `${v.name}/${f.slice(0, -".algo".length)}`));

test("il pacchetto ha le cinque funzioni, nessun import e ogni modulo al suo posto", async () => {
  const { esportazioni, moduli, pacchetto } = await lati();
  expect([...esportazioni]).toEqual([...esportazioniAttese]);
  expect(problemiDelPacchetto(readFileSync(pacchetto, "utf8"), moduli)).toEqual([]);
  expect(moduli.includes(puntoDIngresso)).toBe(true);
}, LIMITE);

test("i rilevatori del pacchetto si accendono, ciascuno sul suo caso, e il rosso è la riga intera", async () => {
  const { pacchetto, moduli } = await lati();
  const testo = readFileSync(pacchetto, "utf8");
  expect(problemiDelPacchetto(`${testo}\nif (false) require("inesistente");`, moduli)).toEqual(["un import nel pacchetto: inesistente"]);
  expect(problemiDelPacchetto(testo, [...moduli, "ui/prodotto.ts"])).toEqual(["un modulo senza un posto: ui/prodotto.ts"]);
  expect(problemiDelPacchetto(testo, [])).toEqual(["il metafile non ha moduli: il controllo dei moduli non ha visto nulla"]);
  expect(problemiDelPacchetto(`${testo}\n// bun:sqlite`, moduli)).toEqual(["una stringa vietata nel pacchetto: bun:"]);
  expect(vietateNel("in D:/x, con Bun.version")).toEqual(["Bun."]);
  expect(vietateNel(`da ${radice}`)).toContain(radice);
  // Un percorso entra nei byte come letterale di una stringa, con le barre raddoppiate, e il disco può essere scritto minuscolo.
  const barra = String.fromCharCode(92);
  const altroDisco = `D${radice.slice(1)}`;
  expect(vietateNel(`da ${radice.replaceAll(barra, barra + barra)}`).length).toBeGreaterThan(0);
  expect(vietateNel(`da ${radice.toLowerCase()}`).length).toBeGreaterThan(0);
  expect(vietateNel(`da ${altroDisco}`)).toEqual([]);
  expect(percorsoVietato(altroDisco, `da ${altroDisco.replaceAll(barra, barra + barra)}`)).toBe(true);
  expect(percorsoVietato(altroDisco, `da ${altroDisco.toLowerCase()}`)).toBe(true);
  expect(percorsoVietato(altroDisco, "nessun percorso")).toBe(false);
  // Un posto si ha per nome: non basta stare in una cartella ammessa.
  for (const m of ["i18n/codici.ts", "ui/dati/altro.ts", "core/x.test.ts", "node_modules/a/index.ts", "strumenti/corpus.ts"]) expect(postoDelModulo(m)).toBeUndefined();
  for (const m of ["core/progetto/formato.ts", "i18n/it.ts", "ui/dati/righe.ts", puntoDIngresso]) expect(postoDelModulo(m)).toBeDefined();
}, LIMITE);

test("le combinazioni dei due lati sono quelle del corpus e del registro, elemento per elemento, e i denominatori sono i confermati", async () => {
  const { attesi, ottenuto } = await lati();
  const file = fileDelCorpus();
  const previste = file.flatMap((f) => lingueDelCodice.flatMap((l) => linguaggi.map((v) => `genera ${f} ${v.id} ${l}`)));
  const attese = Object.keys(attesi).filter((k) => k.startsWith("genera "));
  expect(attese.filter((k) => !previste.includes(k))).toEqual([]);
  expect(previste.filter((k) => !attese.includes(k))).toEqual([]);
  expect(Object.keys(attesi).filter((k) => k.startsWith("controlla ")).map((k) => k.slice("controlla ".length)).sort()).toEqual([...file].sort());
  const numeri = { file: file.length, combinazioni: attese.length, esiti: Object.keys(attesi).length };
  console.log(`corpus: ${JSON.stringify(numeri)}; dell'ottenuto ${Object.keys(ottenuto).length}`);
  expect(numeri).toEqual(confermato("nucleo per node - file, combinazioni ed esiti", numeri));
}, LIMITE);

test("sotto Node il pacchetto dà ciò che i sorgenti danno sotto Bun, e gli esiti per motivo sono i confermati", async () => {
  const { attesi, ottenuto } = await lati();
  expect(verdetto(attesi, ottenuto)).toEqual([]);
  const motivi = motiviDi(attesi);
  console.log(`esiti per motivo: ${JSON.stringify(motivi)}`);
  expect(scartiDeiMotivi(motivi, confermato("nucleo per node - esiti per motivo", motivi))).toEqual([]);
}, LIMITE);

test("i rami che il corpus non esercita: rifiuti, eccezioni col nome, conflitti, e il file scritto si riapre", async () => {
  const { ottenuto } = await lati();
  const caso = (nome: string) => ottenuto[`caso ${nome}`] as Record<string, unknown>;
  expect(caso("apri rifiuta").ok).toBe(false);
  expect(caso("leggi rifiuta").ok).toBe(false);
  expect(caso("linguaggio sconosciuto")).toEqual({ eccezione: "linguaggio sconosciuto: inesistente" });
  expect(caso("lingua sconosciuta")).toEqual({ eccezione: "lingua sconosciuta: IT" });
  expect((caso("aggiungi a chi non è una libreria").rifiuto as { motivo: string }).motivo).toBe("non_e_una_libreria");
  expect((caso("aggiungi con un nome vuoto").rifiuto as { motivo: string }).motivo).toBe("illeggibile");
  expect(caso("aggiungi a una nuova")).toMatchObject({ ok: true, aggiunte: ["somma"], identiche: [] });
  expect(caso("aggiungi una identica")).toMatchObject({ ok: true, aggiunte: [], identiche: ["somma"] });
  expect((caso("aggiungi un conflitto").conflitti as { nome: string; proposto: string }[]).map((c) => [c.nome, c.proposto])).toEqual([["somma", "somma_2"]]);
  expect(caso("aggiungi una rinominata")).toMatchObject({ ok: true, aggiunte: ["somma_2"] });
  // Le opzioni e la libreria arrivano alla lettura: il nome si legge nel progetto, e un dato col nome di una funzione che solo la libreria ha è un rifiuto.
  expect((caso("leggi con le opzioni").progetto as { metadata: { name: string } }).metadata.name).toBe("esercizio");
  expect(caso("leggi senza la libreria").ok).toBe(true);
  expect(caso("leggi con la libreria").ok).toBe(false);
  // Il `testo` di un'aggiunta è il file da scrivere: la nuova e la rinominata si riaprono da lì, sotto Bun coi sorgenti.
  const { apri } = await import("../core/progetto/formato");
  for (const nome of ["aggiungi a una nuova", "aggiungi una rinominata"]) {
    const riaperto = apri(caso(nome).testo as string);
    expect(riaperto.ok && riaperto.progetto.metadata.library).toBe(true);
  }
}, LIMITE);

test("il testo di un'aggiunta è, byte per byte, il file che scrive lo strumento a riga di comando", async () => {
  const { pacchetto, node } = await lati();
  const dentro = join(cartella, "come lo strumento");
  mkdirSync(dentro);
  const testo = "function somma(a: integer, b: integer) → integer\n    return a + b\nend function\n";
  writeFileSync(join(dentro, "esercizi.txt"), testo);
  const scritto = join(dentro, "esercizi.algo");
  const p = Bun.spawn({ cmd: [process.execPath, "./strumenti/algodesign-tools.ts", "accademico", join(dentro, "esercizi.txt"), "-o", scritto], cwd: radice, stdout: "pipe", stderr: "pipe" });
  expect(await p.exited).toBe(0);
  const script = join(dentro, "aggiungi.cjs");
  writeFileSync(script, `const m = require(process.argv[2]);\nconst l = m.leggiAccademico(process.argv[3]);\nrequire("node:fs").writeFileSync(process.argv[4], m.aggiungiAllaLibreria({ nome: "esercizi" }, l, false).testo);\n`);
  const dalPacchetto = join(dentro, "dal pacchetto.algo");
  const q = Bun.spawn({ cmd: [node, script, pacchetto, testo, dalPacchetto], cwd: dentro, stdout: "pipe", stderr: "pipe" });
  const uscita = await q.exited;
  if (caduteAllUscita(uscita)) throw new Error(`FERMO: Node è caduto all'uscita (${uscita}), non si è misurato nulla: rifalla`);
  expect(uscita).toBe(0);
  expect(readFileSync(dalPacchetto, "utf8")).toBe(readFileSync(scritto, "utf8"));
}, LIMITE);

test("una mutazione del pacchetto, su una copia, sotto Node: il rosso nomina ciascuna combinazione colpita e nessun'altra", async () => {
  const { pacchetto, node, attesi, ottenuto } = await lati();
  const genere = (prefisso: string) => Object.keys(ottenuto).filter((k) => k.startsWith(prefisso));
  const delleGenera = genere("genera ");
  const conTesto = `genera ${COLPITO} python en`;
  const conRifiuto = delleGenera.find((k) => (attesi[k] as { perche?: string }).perche === "non-ci-sta")!;
  const delControllo = `controlla ${COLPITO}`;
  const lettura = genere("leggi ").find((k) => (attesi[k] as { rigaDelBlocco?: { mappa: unknown[] } }).rigaDelBlocco?.mappa.length)!;
  const aggiunta = genere("aggiungi ")[0]!;
  // Ogni funzione ha il suo contatore, nell'ordine delle chiamate del lato di Node, per colpire una sola combinazione.
  const copia = join(cartella, "alterato.cjs");
  copyFileSync(pacchetto, copia);
  appendFileSync(
    copia,
    `
{ const v = module.exports; const n = { g: 0, c: 0, l: 0, a: 0 };
  module.exports = { ...v,
    genera: (p, l, li) => { const g = v.genera(p, l, li); const i = n.g++;
      if (i === ${delleGenera.indexOf(conTesto)}) return { ...g, testo: (g.testo[0] === "x" ? "y" : "x") + g.testo.slice(1) };
      if (i === ${delleGenera.indexOf(conRifiuto)}) return { ...g, mancanze: g.mancanze.slice(1) };
      return g; },
    controlla: (p) => { const c = v.controlla(p); return n.c++ === ${genere("controlla ").indexOf(delControllo)} ? { ...c, avvisi: [...c.avvisi, { code: "inventato", block: "b0" }] } : c; },
    leggiAccademico: (t, o, b) => { const r = v.leggiAccademico(t, o, b); if (n.l++ !== ${genere("leggi ").indexOf(lettura)}) return r;
      const altra = new Map(r.rigaDelBlocco); const [k, x] = [...altra][0]; altra.set(k, x + 1000); return { ...r, rigaDelBlocco: altra }; },
    aggiungiAllaLibreria: (d, l, r) => { const a = v.aggiungiAllaLibreria(d, l, r); return n.a++ === ${genere("aggiungi ").indexOf(aggiunta)} ? { ...a, testo: a.testo + " " } : a; },
  }; }
`,
  );
  const alterato = await latoOttenuto(node, copia, corpus, join(cartella, "alterato.json"));
  expect(verdetto(attesi, alterato.esiti).sort()).toEqual([conTesto, conRifiuto, delControllo, lettura, aggiunta].map((k) => `diversa: ${k}`).sort());
  // Le mancanze tagliate lasciano il motivo com'è: il rosso viene dall'oggetto intero, non dal conto dei motivi.
  expect((alterato.esiti[conRifiuto] as { perche: string }).perche).toBe("non-ci-sta");
}, LIMITE);

test("un punto d'ingresso che perde le opzioni o la libreria, o che esporta anche un `default`: il rosso nomina quei casi e quell'esportazione, e nient'altro", async () => {
  const { pacchetto, node, attesi } = await lati();
  const copia = (nome: string, leggi: string) => {
    const f = join(cartella, nome);
    copyFileSync(pacchetto, f);
    appendFileSync(f, `\n{ const v = module.exports; module.exports = { ...v, leggiAccademico: ${leggi} }; }\n`);
    return f;
  };
  const senzaOpzioni = await latoOttenuto(node, copia("senza-opzioni.cjs", "(t, o, b) => v.leggiAccademico(t, undefined, b)"), corpus, join(cartella, "senza-opzioni.json"));
  expect(verdetto(attesi, senzaOpzioni.esiti)).toEqual(["diversa: caso leggi con le opzioni"]);
  const senzaLibreria = await latoOttenuto(node, copia("senza-libreria.cjs", "(t, o, b) => v.leggiAccademico(t, o)"), corpus, join(cartella, "senza-libreria.json"));
  expect(verdetto(attesi, senzaLibreria.esiti)).toEqual(["diversa: caso leggi con la libreria"]);
  const conDefault = join(cartella, "con-default.cjs");
  copyFileSync(pacchetto, conDefault);
  appendFileSync(conDefault, "\nmodule.exports = { ...module.exports, default: () => 0 };\n");
  const alterato = await latoOttenuto(node, conDefault, corpus, join(cartella, "con-default.json"));
  expect([...alterato.esportazioni]).toEqual(["aggiungiAllaLibreria", "apri", "controlla", "default", "genera", "leggiAccademico"]);
}, LIMITE);

test("il verdetto vede una combinazione tolta da ciascun lato e un carattere degli attesi; la sonda tutta rifiutata accende i motivi", async () => {
  const { attesi, ottenuto } = await lati();
  const senza = (e: Esiti, k: string): Esiti => Object.fromEntries(Object.entries(e).filter(([x]) => x !== k));
  const a = `genera ${COLPITO} typescript it`;
  const o = `genera ${COLPITO} pseudocodice it`;
  expect(verdetto(senza(attesi, a), ottenuto)).toEqual([`solo nell'ottenuto: ${a}`]);
  expect(verdetto(attesi, senza(ottenuto, o))).toEqual([`solo negli attesi: ${o}`]);
  const c = `genera ${COLPITO} c it`;
  const conAltro = { ...attesi, [c]: { ...(attesi[c] as object), testo: `x${(attesi[c] as { testo: string }).testo}` } };
  expect(verdetto(conAltro, ottenuto)).toEqual([`diversa: ${c}`]);
  // Tutto rifiutato allo stesso modo sui due lati: zero differenze, e solo il verdetto dei motivi lo dice.
  const tuttiRifiutati: Esiti = Object.fromEntries(Object.keys(attesi).map((k) => [k, { generato: false, perche: "errori-statici" }]));
  expect(verdetto(tuttiRifiutati, tuttiRifiutati)).toEqual([]);
  const veri = motiviDi(attesi);
  expect(scartiDeiMotivi(motiviDi(tuttiRifiutati), veri)).not.toEqual([]);
  const conUnoInPiu = { ...veri, "genera: testo": veri["genera: testo"]! + 1 };
  expect(scartiDeiMotivi(conUnoInPiu, veri)).toEqual([`motivo genera: testo: ${conUnoInPiu["genera: testo"]} invece di ${veri["genera: testo"]}`]);
}, LIMITE);

test("una mappa entra nel confronto: in JSON puro sarebbe vuota e ogni differenza sparirebbe", async () => {
  const { attesi } = await lati();
  const lettura = Object.keys(attesi).find((k) => k.startsWith("leggi ") && (attesi[k] as { ok?: boolean }).ok === true)!;
  const { mappa } = (attesi[lettura] as { rigaDelBlocco: { mappa: unknown[] } }).rigaDelBlocco;
  expect(mappa.length).toBeGreaterThan(0);
  expect(JSON.stringify(new Map([["b1", 1]]))).toBe("{}");
}, LIMITE);

test("un lato che non si può eseguire è un fermo, non una differenza", async () => {
  const { node } = await lati();
  const inesistente = join(cartella, "non c'è.cjs");
  const esito = await latoOttenuto(node, inesistente, corpus, join(cartella, "mai.json")).then(
    () => "nessun errore",
    (e: Error) => e.message.split(" e non si è misurato nulla")[0],
  );
  expect(esito).toBe("FERMO: il lato dell'ottenuto esce 1");
  // Il codice di Node caduto all'uscita, con e senza segno.
  expect([-1073740791, 3221226505, 1, 0].map(caduteAllUscita)).toEqual([true, true, false, false]);
}, LIMITE);

test("gli attesi non importano il punto d'ingresso né il pacchetto: il parser vede gli import veri, la spia quelli di soli tipi", () => {
  const testo = readFileSync(join(import.meta.dir, "conformita-attesi.ts"), "utf8");
  const ammesso = (p: string) => p.startsWith("node:") || p.startsWith("../core/") || p === "../ui/genera/parole";
  const nonAmmessi = (t: string) => new Bun.Transpiler({ loader: "ts" }).scanImports(t).map((i) => i.path).filter((p) => !ammesso(p));
  const spia = (t: string) => t.match(/entrypoint|algodesign-core|conformita-del-nucleo/g) ?? [];
  expect(new Bun.Transpiler({ loader: "ts" }).scanImports(testo).length).toBeGreaterThan(0);
  expect(nonAmmessi(testo)).toEqual([]);
  expect(spia(testo)).toEqual([]);
  // I controlli positivi, su copie dei suoi byte: qui il fatto cercato è l'assenza, e le sonde sono inventate per forza.
  const sorgente = "../entrypoint/index";
  expect(nonAmmessi(`import { genera as g } from "${sorgente}";\nconsole.log(g);\n${testo}`)).toEqual([sorgente]);
  expect(nonAmmessi(`import { genera as g } from "${sorgente}";\n${testo}`)).toEqual([sorgente]);
  expect(nonAmmessi(`require("../algodesign-core.cjs");\n${testo}`)).toEqual(["../algodesign-core.cjs"]);
  expect(nonAmmessi(`import { aiuto } from "./aiuto";\nconsole.log(aiuto);\n${testo}`)).toEqual(["./aiuto"]);
  const soloTipi = `import type { Esito } from "${sorgente}";\n${testo}`;
  expect(nonAmmessi(soloTipi)).toEqual([]);
  expect(spia(soloTipi)).toEqual(["entrypoint"]);
  // Il lato di Node importa solo `node:`, oltre al pacchetto che riceve: il parser lo vede sul suo testo vero.
  const delNode = importDel(readFileSync(join(import.meta.dir, "conformita-ottenuto.cjs"), "utf8"));
  expect(delNode.filter((p) => !p.startsWith("node:"))).toEqual([]);
  expect(delNode.length).toBeGreaterThan(0);
});
