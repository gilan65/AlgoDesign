// Le operazioni del nucleo delle modifiche. La prima prova è il MODELLO SEMPRE LEGGIBILE: ogni operazione,
// applicata a ogni progetto delle tappe 1, 2 e 3 del corpus (i dati e i casi di ogni funzione) e ad alberi generati a
// seme fisso (anche coi cicli `per` e `per ogni`), dà un progetto che il lettore accetta, senza campi a `undefined`, e
// che salvato e riaperto resta uguale (uguaglianza stretta: `-0` non è `0`). Le premesse (progetti, posti, operazioni
// per genere) si stampano e si asseriscono, e le operazioni costruite si appaiano con ciò che il modulo esporta. Le altre
// prove guardano un'operazione alla volta.
//
// Che cosa NON guarda: che un'operazione faccia la cosa GIUSTA (lo guardano le prove per operazione, qui
// sotto); gli spostamenti di un albero generato verso ogni posto (tre per blocco: in cima, in fondo e,
// se c'è, dentro sé stesso), perché sarebbero il quadrato dei blocchi.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conUnaLetturaNelDatoDiLavoro } from "../casi/casi-di-prova";
import { eseguiCaso } from "../casi/esecutore";
import { tetti } from "../controllo/controllo";
import { alberoGenerato } from "../disegno/alberi-di-prova";
import { Esecuzione } from "../esecuzione/esecuzione";
import { apri, leggi, livelliMassimi, salva } from "../progetto/formato";
import type { Blocco, Progetto } from "../progetto/modello";
import { annulla, applica as applicaPasso, inizia, ripeti } from "./cronologia";
import { primoLibero } from "./identificatori";
import {
  aggiungiCaso,
  aggiungiDato,
  attendiErrore,
  blocchiDelTratto,
  eliminaTratto,
  spostaTratto,
  trattoFra,
  cambiaCaso,
  cambiaComune,
  cambiaDato,
  campi,
  dove,
  duplicaCaso,
  duplicaDato,
  elimina,
  eliminaCaso,
  eliminaDato,
  generiDellaTappa,
  incolla,
  inserisci,
  metadati,
  modificaDato,
  opzioni,
  progettoNuovo,
  regoleCheUsano,
  regoleCheUsanoLaComune,
  rinominaDato,
  scriviAvvisi,
  sposta,
  spostaCaso,
  spostaDato,
  togliErroreAtteso,
  trova,
  vociCheRestano,
  duplicaComune,
  eliminaComune,
  poi,
  rendiComune,
  rendiDellaFunzione,
  spostaComune,
  type Operazione,
  type Posto,
  type Risultato,
} from "./operazioni";
import * as modulo from "./operazioni";

const cartella = join(import.meta.dir, "..", "..", "casi");
const elenco: Record<string, string[]> = JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8"));

const daFile = (nome: string, tappa = "tappa-1"): Progetto => {
  const a = apri(readFileSync(join(cartella, tappa, `${nome}.algo`), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
// Anche la tappa 4: le operazioni su una funzione che richiama sé stessa (rinominarla, copiarla, eliminarla).
const corpus = ["tappa-1", "tappa-2", "tappa-3", "tappa-4"].flatMap((tappa) =>
  readdirSync(join(cartella, tappa))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => ({ nome: `${tappa}/${f.slice(0, -".algo".length)}`, progetto: daFile(f.slice(0, -".algo".length), tappa) })),
);

const NUMERO_GENERATI = 40;
/** Metà senza cicli (gli alberi di prima, seme per seme), metà coi cicli `per` e `per ogni`. */
const generati = Array.from({ length: NUMERO_GENERATI }, (_, i) => {
  const conICicli = i >= NUMERO_GENERATI / 2;
  const esito = leggi({ format: "algodesign", schema_version: 2, metadata: { name: `generato-${i + 1}` }, functions: [alberoGenerato(1000 + i, conICicli)] });
  if (!esito.ok) throw new Error(`generato ${i + 1}`);
  return { nome: `generato-${i + 1}`, progetto: esito.progetto };
});

const riferimento = daFile("riferimento-media-voti");
const riferimentoDeiCicli = daFile("riferimento-media-voti-per", "tappa-2");
const parolaAlContrario = daFile("parola-al-contrario", "tappa-2");

/** Applica l'operazione al progetto col primo numero libero, come fa la cronologia. */
const applica = (op: Operazione, p: Progetto): Risultato => op(p, primoLibero(p));
const progettoDi = (r: Risultato): Progetto => {
  if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
  return r.progetto;
};

// --------------------------------------------------------- rilevatori indipendenti dalle operazioni

/** I blocchi in ordine di lettura, scritti qui senza gli aiuti del modulo. */
function blocchiDi(p: Progetto): Blocco[] {
  const fuori: Blocco[] = [];
  const visita = (b: Blocco): void => {
    fuori.push(b);
    if (b.kind === "if") [...b.then, ...b.else].forEach(visita);
    if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") b.body.forEach(visita);
  };
  p.functions.forEach((f) => f.body.forEach(visita));
  return fuori;
}

/** Ogni posto: prima, fra e dopo i blocchi di ogni sequenza, rami e corpi vuoti compresi. */
function postiDi(p: Progetto): Posto[] {
  const fuori: Posto[] = [];
  const sequenza = (s: readonly Blocco[], contenitore: string, ramo: Posto["ramo"]) => {
    for (let indice = 0; indice <= s.length; indice++) fuori.push({ contenitore, ramo, indice });
  };
  for (const f of p.functions) sequenza(f.body, f.id, "body");
  for (const b of blocchiDi(p)) {
    if (b.kind === "if") {
      sequenza(b.then, b.id, "then");
      sequenza(b.else, b.id, "else");
    }
    if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") sequenza(b.body, b.id, "body");
  }
  return fuori;
}

/** Il percorso del primo campo a `undefined`, o niente. */
function primoIndefinito(v: unknown, percorso = ""): string | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  for (const [k, x] of Object.entries(v)) {
    if (x === undefined) return `${percorso}.${k}`;
    const dentro = primoIndefinito(x, `${percorso}.${k}`);
    if (dentro !== undefined) return dentro;
  }
  return undefined;
}

/** Il rilevatore del modello sempre leggibile: che cosa non va nel risultato di un'operazione che doveva applicarsi. */
function difetto(r: Risultato): string | undefined {
  if (!r.ok) return `rifiutata: ${JSON.stringify(r.rifiuto)}`;
  const indefinito = primoIndefinito(r.progetto);
  if (indefinito !== undefined) return `undefined in ${indefinito}`;
  const letto = leggi(r.progetto);
  if (!letto.ok) return `il lettore rifiuta: ${JSON.stringify(letto.errori)}`;
  const riaperto = apri(salva(r.progetto));
  if (!riaperto.ok || !Bun.deepEquals(riaperto.progetto, r.progetto, true)) return "salvato e riaperto, è diverso";
  return undefined;
}

// ---------------------------------------------------------------------------------- il modello sempre leggibile

/** Valori di prova per i campi di un blocco del suo genere. */
const campiPer = (b: Blocco) =>
  b.kind === "assignment"
    ? { target: "x", value: "x + 1" }
    : b.kind === "read"
      ? { target: "v[0]" }
      : b.kind === "write"
        ? { values: ['"città 😀"', "x"], newline: false }
        : b.kind === "comment"
          ? { text: "una nota" }
          : b.kind === "for"
            ? { counter: "k", from: "n - 1", to: "0", step: b.step === undefined ? -1 : null }
            : b.kind === "for_each"
              ? { item: "c", source: "parola" }
              : b.kind === "call"
                ? { callee: "una_procedura", arguments: ["x", "v[0] + 1"] }
                : { condition: "x < 10" };

/** Un'operazione della prova: `genere` è il nome nel conteggio, `da` le funzioni esportate che la costruiscono. */
type DiProva = { genere: string; da: readonly (keyof typeof modulo)[]; op: Operazione; rifiuto?: string };

function operazioniPer(p: Progetto, tutti: boolean): DiProva[] {
  const ops: DiProva[] = [];
  const posti = postiDi(p);
  for (const posto of posti) for (const g of generiDellaTappa) ops.push({ genere: `inserisci ${g}`, da: ["inserisci"], op: inserisci(posto, g) });
  const main = p.functions.find((f) => f.kind === "main")!;
  for (const b of blocchiDi(p)) {
    ops.push({ genere: "elimina", da: ["elimina"], op: elimina(b.id) });
    ops.push({ genere: "campi", da: ["campi"], op: campi(b.id, campiPer(b)) });
    ops.push({ genere: "incolla", da: ["incolla"], op: incolla(b, dove(p, b.id)!) });
    const casa = dove(p, b.id)!;
    const funzione = p.functions.find((f) => blocchiDi({ ...p, functions: [f] }).some((x) => x.id === b.id))!;
    const dentro = new Set(blocchiDi({ ...p, functions: [{ ...main, body: [b] }] }).map((x) => x.id));
    const bersagli = tutti ? posti : [posti[0]!, { contenitore: funzione.id, ramo: "body" as const, indice: funzione.body.length }, casa, ...posti.filter((x) => dentro.has(x.contenitore)).slice(0, 1)];
    for (const posto of bersagli) ops.push({ genere: "sposta", da: ["sposta"], op: sposta(b.id, posto), rifiuto: dentro.has(posto.contenitore) ? "dentro_se_stesso" : undefined });
    // Il tratto del blocco e del suo vicino dopo, se c'è: si elimina e si sposta insieme.
    const t = { contenitore: casa.contenitore, ramo: casa.ramo, da: casa.indice, a: casa.indice + 1 };
    const coppia = blocchiDelTratto(p, t);
    if (coppia.length === 2) {
      const dentroIDue = new Set(coppia.flatMap((x) => blocchiDi({ ...p, functions: [{ ...main, body: [x] }] }).map((y) => y.id)));
      ops.push({ genere: "elimina tratto", da: ["eliminaTratto"], op: eliminaTratto(t) });
      for (const posto of bersagli) ops.push({ genere: "sposta tratto", da: ["spostaTratto"], op: spostaTratto(t, posto), rifiuto: dentroIDue.has(posto.contenitore) ? "dentro_se_stesso" : undefined });
    }
  }
  for (const f of p.functions) {
    // Del programma principale senza l'`id`, come fa l'interfaccia; delle altre funzioni col loro.
    const id = f.kind === "main" ? undefined : f.id;
    const parametro = (i: number) => f.data[i]!.parameter !== undefined;
    f.data.forEach((d, i) => {
      const { name: _, ...attributi } = d;
      ops.push({ genere: "modifica dato", da: ["modificaDato"], op: modificaDato(i, { ...attributi, role: d.role === "output" ? undefined : "output", initial: undefined }, id) });
      ops.push({ genere: "rinomina dato", da: ["rinominaDato"], op: rinominaDato(i, `${d.name}_nuovo`, id) });
      ops.push({ genere: "cambia dato", da: ["cambiaDato"], op: cambiaDato(i, { ...d, name: `${d.name}_altro`, constant: undefined, max_length: d.type === "string" ? -0 : undefined }, id) });
      ops.push({ genere: "elimina dato", da: ["eliminaDato"], op: eliminaDato(i, id) });
      ops.push({ genere: "duplica dato", da: ["duplicaDato"], op: duplicaDato(i, id), rifiuto: parametro(i) ? "parametro" : undefined });
      // Un dato di lavoro salta i parametri: al bordo quando, da quella parte, ci sono solo parametri.
      const bordo = (verso: -1 | 1) => !f.data.some((x, j) => (verso < 0 ? j < i : j > i) && x.parameter === undefined);
      for (const verso of [-1, 1] as const)
        ops.push({ genere: "sposta dato", da: ["spostaDato"], op: spostaDato(i, verso, id), rifiuto: parametro(i) ? "parametro" : bordo(verso) ? "al_bordo" : undefined });
    });
    // Le costanti comuni: un dato che lo diventa, poi le operazioni sulla costante comune (qui la sola), poi indietro.
    if (f.data.length > 0 && !parametro(0)) {
      const d = f.data[0]!;
      const comune = rendiComune(0, id);
      const n = (p.shared_constants ?? []).length;
      ops.push({ genere: "rendi comune", da: ["rendiComune"], op: comune });
      ops.push({ genere: "cambia comune", da: ["rendiComune", "cambiaComune", "poi"], op: poi(comune, cambiaComune(n, { ...d, name: `${d.name}_comune` })) });
      ops.push({ genere: "elimina comune", da: ["rendiComune", "eliminaComune", "poi"], op: poi(comune, eliminaComune(n)) });
      ops.push({ genere: "duplica comune", da: ["rendiComune", "duplicaComune", "poi"], op: poi(comune, duplicaComune(n)) });
      ops.push({ genere: "sposta comune", da: ["rendiComune", "spostaComune", "poi"], op: poi(comune, spostaComune(n, 1)), rifiuto: "al_bordo" });
      ops.push({ genere: "rendi della funzione", da: ["rendiComune", "rendiDellaFunzione", "poi"], op: poi(comune, rendiDellaFunzione(n, id)) });
    }
    const casi = f.kind === "main" ? (p.test_cases ?? []) : (f.test_cases ?? []);
    casi.forEach((c, i) => {
      const esito = eseguiCaso(p, c, tetti, id);
      const conErrore = !esito.fuoriTappa && (esito.ottenuto.error !== undefined || esito.ottenuto.static_error !== undefined);
      ops.push({ genere: "cambia caso", da: ["cambiaCaso"], op: cambiaCaso(i, { ...c, description: "un caso", expected: { ...c.expected, output: c.expected.static_error ? "" : `${c.expected.output}·` } }, id) });
      ops.push({ genere: "elimina caso", da: ["eliminaCaso"], op: eliminaCaso(i, id) });
      ops.push({ genere: "duplica caso", da: ["duplicaCaso"], op: duplicaCaso(i, "copia", id) });
      ops.push({ genere: "sposta caso", da: ["spostaCaso"], op: spostaCaso(i, -1, id), rifiuto: i === 0 ? "al_bordo" : undefined });
      ops.push({ genere: "sposta caso", da: ["spostaCaso"], op: spostaCaso(i, 1, id), rifiuto: i === casi.length - 1 ? "al_bordo" : undefined });
      ops.push({ genere: "attendi errore", da: ["attendiErrore"], op: attendiErrore(i, esito, id), rifiuto: esito.fuoriTappa ? "fuori_tappa" : conErrore ? undefined : "nessun_errore" });
      ops.push({ genere: "togli errore", da: ["togliErroreAtteso"], op: togliErroreAtteso(i, id) });
      ops.push({ genere: "scrivi avvisi", da: ["scriviAvvisi"], op: scriviAvvisi(i, esito, id), rifiuto: esito.fuoriTappa ? "fuori_tappa" : undefined });
    });
    // Un caso nuovo: in una funzione eseguita da sola anche con la voce senza testo.
    const voce = f.kind === "main" ? { data: "x", text: "" } : { data: "x" };
    ops.push({ genere: "aggiungi caso", da: ["aggiungiCaso"], op: aggiungiCaso({ name: "un caso nuovo 😀", inputs: [voce], expected: { output: "" } }, id) });
  }
  ops.push({ genere: "aggiungi dato", da: ["aggiungiDato"], op: aggiungiDato({ name: "zeta", type: "integer", size: -0, role: undefined }) });
  ops.push({ genere: "aggiungi dato", da: ["aggiungiDato"], op: aggiungiDato({ name: "parola", type: "string", max_length: 20, initial: '"ciao"' }) });
  ops.push({ genere: "metadati", da: ["metadati"], op: metadati({ name: "un altro nome", author: "", description: undefined, notes: "note" }) });
  ops.push({ genere: "opzioni", da: ["opzioni"], op: opzioni({ real_decimals: -0 }) });
  ops.push({ genere: "opzioni", da: ["opzioni"], op: opzioni({ fill_character: "*", real_decimals: 5 }) });
  ops.push({ genere: "opzioni", da: ["opzioni"], op: opzioni({ fill_character: " ", real_decimals: 2 }) });
  return ops;
}

/** Ciò che il modulo esporta e la prova del modello leggibile non costruisce, col perché: le interrogazioni, gli aiuti, e
 * le operazioni provate altrove. Una funzione esportata nuova deve stare in una delle due parti, o la prova è rossa. */
const fuoriDallaProva: Readonly<Partial<Record<keyof typeof modulo, string>>> = {
  generiDellaTappa: "l'elenco dei generi, non un'operazione: ogni genere entra con «inserisci»",
  valida: "il passaggio dal lettore di ogni operazione",
  trova: "un'interrogazione",
  dove: "un'interrogazione",
  funzioneDi: "un'interrogazione",
  nomeDellaCopia: "un aiuto dei nomi",
  regoleCheUsano: "un'interrogazione",
  regoleCheUsanoLaComune: "un'interrogazione",
  funzioniCheUsano: "un'interrogazione",
  vociCheRestano: "un'interrogazione",
  trattoFra: "un'interrogazione",
  nellaSequenzaDel: "un'interrogazione",
  blocchiDelTratto: "un'interrogazione",
  progettoNuovo: "non parte da un progetto: la sua prova è «progetto nuovo, metadati, opzioni»",
};

test("ogni operazione, su ogni progetto delle tappe 1, 2 e 3 e su alberi generati anche coi cicli, dà un modello che il lettore accetta e che si riapre uguale", () => {
  const difetti: string[] = [];
  const perGenere = new Map<string, number>();
  const costruite = new Set<string>();
  let applicate = 0;
  let rifiutateAtteso = 0;
  let posti = 0;
  for (const { nome, progetto, tutti } of [...corpus.map((c) => ({ ...c, tutti: true })), ...generati.map((g) => ({ ...g, tutti: false }))]) {
    posti += postiDi(progetto).length;
    for (const { genere, da, op, rifiuto } of operazioniPer(progetto, tutti)) {
      perGenere.set(genere, (perGenere.get(genere) ?? 0) + 1);
      for (const x of da) costruite.add(x);
      const r = applica(op, progetto);
      if (rifiuto !== undefined) {
        if (r.ok || r.rifiuto.motivo !== rifiuto) difetti.push(`${nome} ${genere}: atteso il rifiuto ${rifiuto}, ottenuto ${JSON.stringify(r.ok || r.rifiuto)}`);
        else rifiutateAtteso++;
        continue;
      }
      const d = difetto(r);
      if (d !== undefined) difetti.push(`${nome} ${genere}: ${d}`);
      else applicate++;
    }
  }
  const generi = [...perGenere.entries()].map(([g, n]) => `${g} ${n}`).join(", ");
  const conICicli = generati.filter((g) => blocchiDi(g.progetto).some((b) => b.kind === "for" || b.kind === "for_each")).length;
  console.log(
    `modello leggibile: progetti ${corpus.length} del corpus (tappe 1, 2 e 3) + ${generati.length} generati (${conICicli} coi cicli); posti ${posti}; operazioni applicate ${applicate}, rifiutate come atteso ${rifiutateAtteso}, difetti ${difetti.length}; per genere: ${generi}`,
  );
  expect(difetti.slice(0, 10)).toEqual([]);
  // Le premesse: il corpus è quello dell'elenco (i casi `file#caso`, contati per file), 15 dei 20 generati coi cicli
  // ne hanno uno (misurato: gli altri 5 non lo estraggono), e ogni genere di operazione c'è stato.
  expect(corpus.length).toBe(["tappa-1", "tappa-2", "tappa-3", "tappa-4"].reduce((n, t) => n + new Set(elenco[t]!.map((x) => x.split("#")[0])).size, 0));
  expect(generati.length).toBe(NUMERO_GENERATI);
  expect(conICicli).toBe(15);
  expect([...perGenere.keys()].sort()).toEqual(
    [
      ...generiDellaTappa.map((g) => `inserisci ${g}`),
      ...["elimina", "campi", "incolla", "sposta", "elimina tratto", "sposta tratto", "modifica dato", "rinomina dato", "cambia dato", "elimina dato", "aggiungi dato", "duplica dato", "sposta dato"],
      ...["rendi comune", "cambia comune", "elimina comune", "duplica comune", "sposta comune", "rendi della funzione"],
      ...["aggiungi caso", "cambia caso", "elimina caso", "duplica caso", "sposta caso", "attendi errore", "togli errore", "scrivi avvisi", "metadati", "opzioni"],
    ].sort(),
  );
  // Appaiate nei due versi con ciò che il modulo esporta: ogni export è costruito qui, o dichiarato fuori col perché;
  // nessuno dei due elenchi nomina ciò che il modulo non ha.
  const esportati = Object.keys(modulo).sort();
  const dichiarati = [...costruite, ...Object.keys(fuoriDallaProva)];
  expect({ senzaProva: esportati.filter((x) => !dichiarati.includes(x)), senzaExport: dichiarati.filter((x) => !esportati.includes(x)) }).toEqual({ senzaProva: [], senzaExport: [] });
  console.log(`modello leggibile: esportati ${esportati.length}, costruiti qui ${costruite.size}, dichiarati fuori ${Object.keys(fuoriDallaProva).length}`);
  expect(rifiutateAtteso).toBeGreaterThan(0);
  expect(applicate).toBeGreaterThan(posti * generiDellaTappa.length);
  // Il limite di tempo dichiarato: 20,1 s a macchina libera, da 62,8 a 65,3 s sotto carico (i 60 s di prima la facevano
  // fallire senza un difetto); cresce col corpus delle tappe 1, 2 e 3.
}, 180_000);

test("modello leggibile, controllo positivo: il rilevatore vede un campo a undefined, un riempimento vuoto e un -0", () => {
  const p = riferimento;
  const forzato = (progetto: Progetto): Risultato => ({ ok: true, progetto, prossimo: 25 });
  // Un'operazione che scrivesse `undefined` senza passare dal lettore.
  expect(difetto(forzato({ ...p, metadata: { ...p.metadata, author: undefined } }))).toBe("undefined in .metadata.author");
  // Un'operazione che scrivesse `""` nel carattere di riempimento senza passare dal lettore.
  expect(difetto(forzato({ ...p, options: { fill_character: "" } }))).toStartWith("il lettore rifiuta");
  // Un `-0` che il lettore non avesse letto `0`: il testo salvato lo scrive `0`, e la riapertura è diversa.
  const conMenoZero = { ...p, functions: [{ ...p.functions[0]!, data: [...p.functions[0]!.data, { name: "w", type: "integer" as const, size: -0 }] }] };
  expect(difetto(forzato(conMenoZero))).toBe("salvato e riaperto, è diverso");
  // E l'operazione vera col riempimento vuoto non si applica: il lettore la rifiuta.
  expect(difetto(applica(opzioni({ fill_character: "" }), p))).toStartWith("rifiutata");
});

// -------------------------------------------------------------------------------- per operazione

describe("progetto nuovo, metadati, opzioni", () => {
  test("un progetto nuovo ha il programma principale vuoto (f1, fine b1) e il nome obbligatorio", () => {
    const p = progettoDi(progettoNuovo({ name: "primo", author: "" }));
    expect(p).toEqual({ format: "algodesign", schema_version: 2, metadata: { name: "primo" }, functions: [{ id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } }] });
    expect(salva(p)).toBe(`${JSON.stringify(p, null, 2)}\n`);
    const senzaNome = progettoNuovo({ name: "" });
    expect(senzaNome.ok || senzaNome.rifiuto).toEqual({ motivo: "illeggibile", errori: [{ percorso: "metadata.name", motivo: "invalid_value" }] });
  });

  test("metadati: i testi facoltativi vuoti si omettono; opzioni: quelle uguali al predefinito spariscono", () => {
    const p = progettoDi(applica(metadati({ name: "x", author: "", description: "d", notes: undefined }), riferimento));
    expect(p.metadata).toEqual({ name: "x", description: "d" });
    expect(progettoDi(applica(opzioni({ fill_character: " ", real_decimals: 2 }), riferimento)).options).toBeUndefined();
    expect(progettoDi(applica(opzioni({ fill_character: "*" }), riferimento)).options).toEqual({ fill_character: "*" });
    const zero = progettoDi(applica(opzioni({ real_decimals: -0 }), riferimento)).options!.real_decimals!;
    expect(Object.is(zero, 0)).toBe(true);
    for (const o of [{ fill_character: "" }, { fill_character: "ab" }, { real_decimals: 16 }, { real_decimals: 1.5 }]) {
      const r = applica(opzioni(o), riferimento);
      expect({ o, motivo: r.ok ? "applicata" : r.rifiuto.motivo }).toEqual({ o, motivo: "illeggibile" });
    }
  });
});

describe("blocchi", () => {
  test("inserisci: un blocco vuoto del genere scelto nel posto, con un identificatore nuovo", () => {
    const p = progettoDi(applica(inserisci({ contenitore: "b9", ramo: "else", indice: 1 }, "while"), riferimento));
    expect(trova(p, "b25")).toEqual({ id: "b25", kind: "while", condition: "", body: [] });
    expect(dove(p, "b25")).toEqual({ contenitore: "b9", ramo: "else", indice: 1 });
    for (const posto of [
      { contenitore: "b9", ramo: "else" as const, indice: 2 },
      { contenitore: "b9", ramo: "else" as const, indice: -1 },
      { contenitore: "b9", ramo: "body" as const, indice: 0 },
      { contenitore: "b7", ramo: "then" as const, indice: 0 },
      { contenitore: "b3", ramo: "body" as const, indice: 0 },
      { contenitore: "nessuno", ramo: "body" as const, indice: 0 },
      { contenitore: "f1", ramo: "then" as const, indice: 0 },
    ]) {
      const r = applica(inserisci(posto, "comment"), riferimento);
      expect({ posto, esito: r.ok || r.rifiuto }).toEqual({ posto, esito: { motivo: "posto_inesistente" } });
    }
  });

  test("elimina: il blocco e il suo sottoalbero; il blocco di fine e le funzioni no", () => {
    const p = progettoDi(applica(elimina("b9"), riferimento));
    for (const id of ["b9", "b10", "b11", "b12", "b13", "b14"]) expect(trova(p, id)).toBeUndefined();
    expect(blocchiDi(p).length).toBe(blocchiDi(riferimento).length - 6);
    for (const id of ["b24", "f1", "b99"]) {
      const r = applica(elimina(id), riferimento);
      expect({ id, esito: r.ok || r.rifiuto }).toEqual({ id, esito: { motivo: "blocco_inesistente" } });
    }
  });

  test("sposta: col sottoalbero; rifiutato nel proprio sottoalbero; il posto è contato prima dello spostamento", () => {
    // Il «se» dei voti validi (b9, dentro il ciclo b7) va nel ramo Vero di b16, col suo sottoalbero.
    const p = progettoDi(applica(sposta("b9", { contenitore: "b16", ramo: "then", indice: 0 }), riferimento));
    expect(dove(p, "b9")).toEqual({ contenitore: "b16", ramo: "then", indice: 0 });
    expect(dove(p, "b13")).toEqual({ contenitore: "b12", ramo: "then", indice: 0 });
    expect(trova(p, "b9")).toEqual(trova(riferimento, "b9"));
    // Dentro sé stesso o dentro il proprio sottoalbero: rifiutato (controllo positivo su un albero annidato).
    for (const posto of [
      { contenitore: "b9", ramo: "then" as const, indice: 0 },
      { contenitore: "b12", ramo: "else" as const, indice: 0 },
      { contenitore: "b9", ramo: "else" as const, indice: 1 },
    ]) {
      const r = applica(sposta("b9", posto), riferimento);
      expect({ posto, esito: r.ok || r.rifiuto }).toEqual({ posto, esito: { motivo: "dentro_se_stesso" } });
    }
    const ciclo = applica(sposta("b7", { contenitore: "b12", ramo: "then", indice: 0 }), riferimento);
    expect(ciclo.ok || ciclo.rifiuto).toEqual({ motivo: "dentro_se_stesso" });
    // Nella stessa sequenza: b6 (indice 2) al posto 5 della sequenza principale finisce dopo b16.
    const avanti = progettoDi(applica(sposta("b6", { contenitore: "f1", ramo: "body", indice: 5 }), riferimento));
    expect(avanti.functions[0]!.body.map((b) => b.id)).toEqual(["b1", "b2", "b7", "b16", "b6"]);
    const indietro = progettoDi(applica(sposta("b16", { contenitore: "f1", ramo: "body", indice: 0 }), riferimento));
    expect(indietro.functions[0]!.body.map((b) => b.id)).toEqual(["b16", "b1", "b2", "b6", "b7"]);
    // Subito prima o subito dopo sé stesso: il progetto non cambia, ed è lo stesso oggetto.
    for (const indice of [2, 3]) expect(progettoDi(applica(sposta("b6", { contenitore: "f1", ramo: "body", indice }), riferimento))).toBe(riferimento);
  });

  test("il tratto fra due blocchi: nella sequenza più interna che li ha tutti e due, dai blocchi che li contengono", () => {
    const corpo = { contenitore: "f1", ramo: "body" as const };
    const delCiclo = { contenitore: "b7", ramo: "body" as const };
    expect(trattoFra(riferimento, "b2", "b16")).toEqual({ ...corpo, da: 1, a: 4 });
    expect(trattoFra(riferimento, "b16", "b2")).toEqual({ ...corpo, da: 1, a: 4 });
    expect(trattoFra(riferimento, "b6", "b6")).toEqual({ ...corpo, da: 2, a: 2 });
    // Un blocco dentro il ciclo b7 con un blocco della sequenza principale: il tratto arriva al ciclo.
    expect(trattoFra(riferimento, "b1", "b13")).toEqual({ ...corpo, da: 0, a: 3 });
    expect(trattoFra(riferimento, "b10", "b13")).toEqual({ contenitore: "b9", ramo: "then", da: 0, a: 2 });
    expect(trattoFra(riferimento, "b10", "b8")).toEqual({ ...delCiclo, da: 0, a: 1 });
    // Un blocco dentro l'altro, o nei due rami dello stesso «se»: il blocco esterno solo.
    expect(trattoFra(riferimento, "b13", "b9")).toEqual({ ...delCiclo, da: 1, a: 1 });
    expect(trattoFra(riferimento, "b13", "b14")).toEqual({ ...delCiclo, da: 1, a: 1 });
    // Un blocco che non c'è, o due funzioni diverse: nessun tratto.
    const conUnaProcedura: Progetto = { ...riferimento, functions: [...riferimento.functions, { id: "f2", kind: "procedure", name: "p", data: [], body: [{ id: "b90", kind: "comment", text: "" }], end: { id: "b91" } }] };
    expect(trattoFra(conUnaProcedura, "b1", "b90")).toBeUndefined();
    expect(trattoFra(riferimento, "b1", "b99")).toBeUndefined();
    // Il blocco della sequenza del tratto che contiene un altro blocco.
    expect(modulo.nellaSequenzaDel(riferimento, "b13", { ...delCiclo, da: 0, a: 0 })).toBe("b9");
    expect(modulo.nellaSequenzaDel(riferimento, "b13", { ...corpo, da: 0, a: 0 })).toBe("b7");
    expect(modulo.nellaSequenzaDel(riferimento, "b1", { ...delCiclo, da: 0, a: 0 })).toBeUndefined();
  });

  test("sposta ed elimina un tratto: i blocchi di seguito, col sottoalbero, in un passo che Annulla riporta byte per byte", () => {
    const corpo = { contenitore: "f1", ramo: "body" as const };
    const ids = (p: Progetto) => p.functions[0]!.body.map((b) => b.id);
    // b2 e b6 (indici 1 e 2) in fondo, in cima e nel ramo Vero di b16; il posto è contato prima dello spostamento.
    const tratto = { ...corpo, da: 1, a: 2 };
    expect(ids(progettoDi(applica(spostaTratto(tratto, { ...corpo, indice: 5 }), riferimento)))).toEqual(["b1", "b7", "b16", "b2", "b6"]);
    expect(ids(progettoDi(applica(spostaTratto(tratto, { ...corpo, indice: 0 }), riferimento)))).toEqual(["b2", "b6", "b1", "b7", "b16"]);
    // In avanti ma non in fondo: fra b7 e b16 (il posto dopo il tratto si conta senza i suoi due blocchi).
    expect(ids(progettoDi(applica(spostaTratto(tratto, { ...corpo, indice: 4 }), riferimento)))).toEqual(["b1", "b7", "b2", "b6", "b16"]);
    const nelRamo = progettoDi(applica(spostaTratto(tratto, { contenitore: "b16", ramo: "then", indice: 1 }), riferimento));
    expect((trova(nelRamo, "b16") as Extract<Blocco, { kind: "if" }>).then.map((b) => b.id)).toEqual(["b17", "b2", "b6", "b18", "b19", "b22"]);
    expect(trova(nelRamo, "b2")).toEqual(trova(riferimento, "b2"));
    // Dentro uno dei blocchi (il secondo, il primo) o nel loro sottoalbero: rifiutato.
    const conIlCiclo = { ...corpo, da: 1, a: 3 };
    for (const posto of [
      { contenitore: "b9", ramo: "then" as const, indice: 0 },
      { contenitore: "b4", ramo: "then" as const, indice: 1 },
      { contenitore: "b7", ramo: "body" as const, indice: 0 },
    ]) {
      const r = applica(spostaTratto(conIlCiclo, posto), riferimento);
      expect({ posto, esito: r.ok || r.rifiuto }).toEqual({ posto, esito: { motivo: "dentro_se_stesso" } });
    }
    // Subito prima, fra i due, subito dopo: il progetto non cambia, ed è lo stesso oggetto.
    for (const indice of [1, 2, 3]) expect(progettoDi(applica(spostaTratto(tratto, { ...corpo, indice }), riferimento))).toBe(riferimento);
    // Un tratto che non c'è (fuori dalla sequenza, rovesciato, un ramo che il blocco non ha).
    for (const t of [{ ...corpo, da: 3, a: 5 }, { ...corpo, da: 2, a: 1 }, { contenitore: "b7", ramo: "then" as const, da: 0, a: 0 }]) {
      const r = applica(spostaTratto(t, { ...corpo, indice: 0 }), riferimento);
      expect({ t, esito: r.ok || r.rifiuto }).toEqual({ t, esito: { motivo: "blocco_inesistente" } });
      const e = applica(eliminaTratto(t), riferimento);
      expect({ t, esito: e.ok || e.rifiuto }).toEqual({ t, esito: { motivo: "blocco_inesistente" } });
    }
    // Eliminato: b2, b6 e b7 coi loro sottoalberi.
    const senza = progettoDi(applica(eliminaTratto(conIlCiclo), riferimento));
    expect(ids(senza)).toEqual(["b1", "b16"]);
    expect(blocchiDi(senza).length).toBe(blocchiDi(riferimento).length - 14);
    // Un passo solo nella cronologia, e Annulla riporta il file di prima byte per byte; Ripeti lo rifà.
    for (const op of [spostaTratto(conIlCiclo, { contenitore: "b16", ramo: "else", indice: 1 }), eliminaTratto(conIlCiclo)]) {
      const e = applicaPasso(inizia(riferimento), op);
      if (!e.ok) throw new Error(JSON.stringify(e.rifiuto));
      expect(e.cronologia.passato.length).toBe(1);
      expect(salva(annulla(e.cronologia).presente)).toBe(salva(riferimento));
      expect(salva(ripeti(annulla(e.cronologia)).presente)).toBe(salva(e.cronologia.presente));
    }
  });

  test("incolla: una copia del sottoalbero con identificatori nuovi, anche due volte; l'originale resta", () => {
    const b9 = trova(riferimento, "b9")!;
    const una = progettoDi(applica(incolla(b9, { contenitore: "f1", ramo: "body", indice: 0 }), riferimento));
    const due = progettoDi(applica(incolla(b9, { contenitore: "f1", ramo: "body", indice: 0 }), una));
    const ids = blocchiDi(due).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(blocchiDi(riferimento).length + 12);
    expect(due.functions[0]!.body.slice(0, 2).map((b) => b.id)).toEqual(["b31", "b25"]);
    expect(trova(due, "b9")).toEqual(b9);
    // La copia è uguale all'originale a meno degli identificatori.
    const senzaId = (b: Blocco) => JSON.stringify(b).replace(/"id":"b\d+"/g, '"id":""');
    expect(senzaId(trova(una, "b25")!)).toBe(senzaId(b9));
  });

  test("il tetto dei livelli: incolla, inserisci e sposta non portano un blocco oltre il livello massimo (rifiuto del lettore)", () => {
    // Una catena di cicli fino al livello massimo, e un ciclo da solo nel programma principale.
    let corpo: Blocco[] = [];
    for (let i = livelliMassimi; i >= 1; i--) corpo = [{ id: `w${i}`, kind: "while", condition: "false", body: corpo }];
    const solo: Blocco = { id: "s", kind: "while", condition: "false", body: [] };
    const p: Progetto = { ...riferimento, functions: [{ ...riferimento.functions[0]!, body: [...corpo, solo] }] };
    expect(leggi(p).ok).toBe(true);
    const fondo = { contenitore: `w${livelliMassimi}`, ramo: "body" as const, indice: 0 };
    const giu = { contenitore: `w${livelliMassimi - 1}`, ramo: "body" as const, indice: 0 };
    const troppo = (r: Risultato) => (r.ok ? "accettata" : r.rifiuto.motivo === "illeggibile" ? r.rifiuto.errori.map((e) => e.motivo) : r.rifiuto.motivo);
    expect({
      incollaInFondo: troppo(applica(incolla(solo, fondo), p)),
      inserisciInFondo: troppo(applica(inserisci(fondo, "comment"), p)),
      spostaInFondo: troppo(applica(sposta("s", fondo), p)),
      // Un ciclo con un blocco dentro, incollato un livello sopra il fondo: il suo blocco finirebbe oltre.
      incollaConDentro: troppo(applica(incolla({ ...solo, body: [{ id: "c", kind: "comment", text: "" }] }, giu), p)),
    }).toEqual({ incollaInFondo: ["too_deep"], inserisciInFondo: ["too_deep"], spostaInFondo: ["too_deep"], incollaConDentro: ["too_deep"] });
    // Controllo positivo: un livello sopra, le stesse operazioni si applicano.
    expect([troppo(applica(incolla(solo, giu), p)), troppo(applica(sposta("s", giu), p))]).toEqual(["accettata", "accettata"]);
  });

  test("campi: cambiano solo quelli dati; un campo che il genere non ha è rifiutato dal lettore", () => {
    const p = progettoDi(applica(campi("b14", { values: ['"ignorato"'], newline: false, text: undefined }), riferimento));
    expect(trova(p, "b14")).toEqual({ id: "b14", kind: "write", values: ['"ignorato"'], newline: false });
    const r = applica(campi("b14", { target: "voto" }), riferimento);
    expect(r.ok || r.rifiuto).toEqual({ motivo: "illeggibile", errori: [{ percorso: "functions[0].body[3].body[1].else[0].target", motivo: "unknown_field" }] });
    const vuoti = applica(campi("b14", { values: [] }), riferimento);
    expect(vuoti.ok || vuoti.rifiuto.motivo).toBe("illeggibile");
    expect(applica(campi("b99", { text: "x" }), riferimento)).toEqual({ ok: false, rifiuto: { motivo: "blocco_inesistente" } });
  });

  test("i due cicli: inseriti vuoti, senza passo; il passo scritto si salva, a 1 o tolto non si scrive, e un file col passo 1 resta com'è", () => {
    const principio = { contenitore: "f1", ramo: "body" as const, indice: 0 };
    const conPer = progettoDi(applica(inserisci(principio, "for"), riferimentoDeiCicli));
    expect(trova(conPer, "b25")).toEqual({ id: "b25", kind: "for", counter: "", from: "", to: "", body: [] });
    const conPerOgni = progettoDi(applica(inserisci({ contenitore: "b7", ramo: "body", indice: 2 }, "for_each"), riferimentoDeiCicli));
    expect(trova(conPerOgni, "b25")).toEqual({ id: "b25", kind: "for_each", item: "", source: "", body: [] });
    expect(dove(conPerOgni, "b25")).toEqual({ contenitore: "b7", ramo: "body", indice: 2 });

    // Il passo: scritto, cambiato, riportato a 1 o tolto (`null`); assente dai campi, resta com'è.
    const passo = (p: Progetto) => (trova(p, "b25") as Extract<Blocco, { kind: "for" }>).step;
    const conPasso = progettoDi(applica(campi("b25", { counter: "i", from: "n", to: "1", step: -1 }), conPer));
    expect(trova(conPasso, "b25")).toEqual({ id: "b25", kind: "for", counter: "i", from: "n", to: "1", step: -1, body: [] });
    expect(salva(conPasso)).toContain('"to": "1",\n          "step": -1,\n');
    expect(passo(progettoDi(applica(campi("b25", { step: 2 }), conPasso)))).toBe(2);
    expect(passo(progettoDi(applica(campi("b25", { to: "0" }), conPasso)))).toBe(-1);
    for (const tolto of [1, null]) {
      const p = progettoDi(applica(campi("b25", { step: tolto }), conPasso));
      expect({ tolto, passo: "step" in trova(p, "b25")! }).toEqual({ tolto, passo: false });
    }
    // Un passo zero o fuori dagli interi del C si scrive: è un errore statico, non un file illeggibile.
    expect(passo(progettoDi(applica(campi("b25", { step: 0 }), conPasso)))).toBe(0);
    // Un file scritto a mano col passo 1 si apre e si salva identico.
    const conUno = salva({ ...conPasso, functions: [{ ...conPasso.functions[0]!, body: [{ id: "b25", kind: "for", counter: "i", from: "1", to: "n", step: 1, body: [] }] }] });
    const riaperto = apri(conUno);
    expect(riaperto.ok && salva(riaperto.progetto)).toBe(conUno);
    // E cambiando un altro campo coi campi aperti (che riportano il passo 1 che il blocco ha), il passo resta; tolto
    // (`null`) va via. Controllo positivo: da un altro passo, 1 si toglie (sopra).
    if (!riaperto.ok) throw new Error("il file col passo 1 non si apre");
    expect(passo(progettoDi(applica(campi("b25", { counter: "i", from: "1", to: "m", step: 1 }), riaperto.progetto)))).toBe(1);
    expect("step" in trova(progettoDi(applica(campi("b25", { step: null }), riaperto.progetto)), "b25")!).toBe(false);
    // Elemento e sorgente.
    const p = progettoDi(applica(campi("b25", { item: "c", source: "parola" }), conPerOgni));
    expect(trova(p, "b25")).toEqual({ id: "b25", kind: "for_each", item: "c", source: "parola", body: [] });
    // Un campo che il ciclo non ha è rifiutato dal lettore.
    expect(applica(campi("b25", { condition: "vero" }), conPer)).toMatchObject({ ok: false, rifiuto: { motivo: "illeggibile" } });
    expect(applica(campi("b25", { counter: "i" }), conPerOgni)).toMatchObject({ ok: false, rifiuto: { motivo: "illeggibile" } });
  });
});

describe("identificatori", () => {
  test("unici, stabili alla modifica, mai un buco riempito, e contano anche i blocchi degli attesi", () => {
    expect(primoLibero(riferimento)).toBe(25);
    const modificato = progettoDi(applica(campi("b10", { value: "somma + 2 * voto" }), riferimento));
    expect(blocchiDi(modificato).map((b) => b.id)).toEqual(blocchiDi(riferimento).map((b) => b.id));
    // Un buco (b5 tolto) non si riempie: il nuovo blocco è b25.
    const buco = progettoDi(applica(elimina("b5"), riferimento));
    expect(primoLibero(buco)).toBe(25);
    expect(trova(progettoDi(applica(inserisci({ contenitore: "f1", ramo: "body", indice: 0 }, "comment"), buco)), "b25")).toBeDefined();
    // Un atteso che nomina b40 sposta il primo libero a b41.
    const caso = riferimento.test_cases![0]!;
    const conAtteso = { ...riferimento, test_cases: [{ ...caso, expected: { output: "", error: { code: "input_exhausted" as const, block: "b40" } } }] };
    expect(primoLibero(conAtteso)).toBe(41);
    // Anche l'atteso di un caso di una procedura o di una funzione: b50 sposta il primo libero a b51.
    const f = riferimento.functions[0]!;
    const conAttesoDellaFunzione = { ...riferimento, functions: [f, { ...f, id: "f9", kind: "procedure" as const, name: "p", body: [], end: { id: "b49" }, test_cases: [{ name: "c", inputs: [], expected: { output: "", error: { code: "input_exhausted" as const, block: "b50" } } }] }] };
    expect(primoLibero(conAttesoDellaFunzione)).toBe(51);
    // Gli identificatori che non hanno la forma b<N> non contano (gli alberi generati usano g<N>).
    expect(primoLibero(generati[0]!.progetto)).toBe(1);
    // Il numero della cronologia, se più avanti, vince: un identificatore annullato non torna.
    const r = inserisci({ contenitore: "f1", ramo: "body", indice: 0 }, "comment")(riferimento, 30);
    expect(r.ok && [r.progetto.functions[0]!.body[0]!.id, r.prossimo]).toEqual(["b30", 31]);
  });
});

describe("dati", () => {
  test("aggiungi, modifica (il nome resta), elimina; i facoltativi assenti si omettono", () => {
    const p = progettoDi(applica(aggiungiDato({ name: "k", type: "integer", constant: true, initial: "3", role: undefined }), riferimento));
    expect(p.functions[0]!.data.at(-1)).toEqual({ name: "k", type: "integer", constant: true, initial: "3" });
    const m = progettoDi(applica(modificaDato(1, { type: "real", role: undefined, size: 3, initial: { each: "0.0" } }), riferimento));
    expect(m.functions[0]!.data[1]).toEqual({ name: "voto", type: "real", size: 3, initial: { each: "0.0" } });
    const e = progettoDi(applica(eliminaDato(0), riferimento));
    expect(e.functions[0]!.data.map((d) => d.name)).toEqual(["voto", "media", "contati", "insufficienti", "somma", "i", "j"]);
    for (const op of [modificaDato(8, { type: "integer" }), eliminaDato(-1), rinominaDato(99, "x")])
      expect(applica(op, riferimento)).toEqual({ ok: false, rifiuto: { motivo: "dato_inesistente" } });
  });

  test("le regole che usano un dato: blocchi che lo nominano come parola", () => {
    expect(regoleCheUsano(riferimento, "voto")).toBe(5);
    expect(regoleCheUsano(riferimento, "n")).toBe(4);
    expect(regoleCheUsano(riferimento, "nessuno")).toBe(0);
    // Un letterale col nome non è un uso: b5 scrive "Numero non valido…", che non nomina `Numero`.
    expect(regoleCheUsano(riferimento, "Numero")).toBe(0);
    // Con più nomi conta un blocco che ne nomina uno qualunque.
    expect(regoleCheUsano(riferimento, ["nessuno", "voto"])).toBe(5);
    expect(regoleCheUsano(riferimento, [])).toBe(0);
  });

  test("rinomina: il dato, le regole e le voci dei casi d'uso, e il caso d'uso dà lo stesso output", () => {
    const p = progettoDi(applica(rinominaDato(1, "punteggio"), riferimento));
    expect(regoleCheUsano(p, "voto")).toBe(0);
    expect(regoleCheUsano(p, "punteggio")).toBe(5);
    expect(trova(p, "b14")).toEqual({ id: "b14", kind: "write", values: ['"Voto ignorato: "', "punteggio"], newline: true });
    expect(p.test_cases![0]!.inputs.filter((x) => x.data === "punteggio").length).toBe(4);
    expect(eseguiCaso(p, p.test_cases![0]!, tetti)).toMatchObject({ fuoriTappa: false, raggiunto: true, differenze: [] });
    // Controllo positivo: senza aggiornare le regole il caso non passa più.
    const soloIlDato = { ...p, functions: [{ ...p.functions[0]!, body: riferimento.functions[0]!.body }] };
    expect(eseguiCaso(soloIlDato, p.test_cases![0]!, tetti)).toMatchObject({ fuoriTappa: false, raggiunto: false });
  });

  test("i due cicli: le regole che usano un dato contano contatore, inizio, fine, elemento e sorgente; la rinomina li cambia", () => {
    // In «parola al contrario»: `parola` letta (b1), nell'inizio del `per` (b2), scritta (b3), sorgente del `per ogni`
    // (b5); `i` contatore (b2) e indice (b3); `c` elemento (b5) e condizione (b6).
    expect([regoleCheUsano(parolaAlContrario, "parola"), regoleCheUsano(parolaAlContrario, "i"), regoleCheUsano(parolaAlContrario, "c")]).toEqual([4, 2, 2]);
    // E la fine: nel riferimento della tappa 2 `n` è la fine del primo `per`, `contati` quella del secondo.
    expect([regoleCheUsano(riferimentoDeiCicli, "n"), regoleCheUsano(riferimentoDeiCicli, "contati")]).toEqual([4, 5]);
    let p = progettoDi(applica(rinominaDato(0, "testo"), parolaAlContrario));
    p = progettoDi(applica(rinominaDato(2, "k"), p));
    p = progettoDi(applica(rinominaDato(3, "lettera"), p));
    const [, per, , perOgni] = p.functions[0]!.body;
    expect(per).toEqual({ id: "b2", kind: "for", counter: "k", from: "length testo - 1", to: "0", step: -1, body: [{ id: "b3", kind: "write", values: ["testo[k]"], newline: false }] });
    expect(perOgni).toMatchObject({ id: "b5", kind: "for_each", item: "lettera", source: "testo" });
    expect(regoleCheUsano(p, ["parola", "i", "c"])).toBe(0);
    const s = progettoDi(applica(rinominaDato(1, "quante"), riferimentoDeiCicli));
    expect(trova(s, "b19")).toMatchObject({ kind: "for", counter: "j", from: "1", to: "somma / contati" });
    const fine = progettoDi(applica(rinominaDato(0, "quanti"), riferimentoDeiCicli));
    expect(trova(fine, "b7")).toMatchObject({ kind: "for", counter: "i", from: "1", to: "quanti" });
    expect(eseguiCaso(p, p.test_cases![0]!, tetti)).toMatchObject({ fuoriTappa: false, raggiunto: true, differenze: [] });
  });

  test("rinomina: un nome che non si legge come un nome solo, o un nome vecchio ancora usato da un altro dato, non tocca le regole", () => {
    for (const nuovo of ["età", "voto bis", "", "1voto"]) {
      const p = progettoDi(applica(rinominaDato(1, nuovo), riferimento));
      expect({ nuovo, nome: p.functions[0]!.data[1]!.name, regole: regoleCheUsano(p, "voto") }).toEqual({ nuovo, nome: nuovo, regole: 5 });
    }
    const doppio = progettoDi(applica(aggiungiDato({ name: "voto", type: "integer" }), riferimento));
    const p = progettoDi(applica(rinominaDato(1, "punteggio"), doppio));
    expect(regoleCheUsano(p, "voto")).toBe(5);
  });

  test("rinomina col nome di un altro dato, di una costante comune o di una procedura: il dato cambia nome, le regole e le voci no (i due non si fondono)", () => {
    const voci = (p: Progetto, nome: string) => p.test_cases![0]!.inputs.filter((x) => x.data === nome).length;
    const prima = { voto: regoleCheUsano(riferimento, "voto"), media: regoleCheUsano(riferimento, "media"), voci: voci(riferimento, "voto") };
    const conMedia = progettoDi(applica(rinominaDato(1, "media"), riferimento));
    expect({ voto: regoleCheUsano(conMedia, "voto"), media: regoleCheUsano(conMedia, "media"), voci: voci(conMedia, "voto") }).toEqual(prima);
    expect(conMedia.functions[0]!.data[1]!.name).toBe("media");
    const conComune = { ...riferimento, shared_constants: [{ name: "MASSIMO", type: "integer" as const, constant: true, initial: "10" }] };
    expect(regoleCheUsano(progettoDi(applica(rinominaDato(1, "MASSIMO"), conComune)), "voto")).toBe(prima.voto);
    const funzioni = daFile("riferimento-media-voti-funzioni", "tappa-3");
    expect(regoleCheUsano(progettoDi(applica(rinominaDato(0, "stelle"), funzioni)), "n")).toBe(regoleCheUsano(funzioni, "n"));
    // La costante comune col nome di un dato: le regole restano sue.
    const usata = progettoDi(applica(campi("b14", { values: ['"Voto ignorato: "', "MASSIMO"] }), conComune));
    const rinominata = progettoDi(applica(cambiaComune(0, { name: "voto", type: "integer", constant: true, initial: "10" }), usata));
    expect([regoleCheUsanoLaComune(rinominata, "MASSIMO"), regoleCheUsano(rinominata, "voto")]).toEqual([1, regoleCheUsano(usata, "voto")]);
    // Controllo positivo: un nome libero cambia le regole.
    expect(regoleCheUsano(progettoDi(applica(rinominaDato(1, "punteggio"), riferimento)), "voto")).toBe(0);
    expect(regoleCheUsanoLaComune(progettoDi(applica(cambiaComune(0, { name: "LIMITE", type: "integer", constant: true, initial: "10" }), usata)), "LIMITE")).toBe(1);
  });

  test("rinomina e regole che usano un dato contano e cambiano anche i testi che non si lasciano leggere", () => {
    const illeggibile = progettoDi(applica(campi("b14", { values: ['"x"', "n = 5"] }), riferimento));
    expect(regoleCheUsano(illeggibile, "n")).toBe(regoleCheUsano(riferimento, "n") + 1);
    const p = progettoDi(applica(rinominaDato(0, "quanti"), illeggibile));
    expect(trova(p, "b14")).toMatchObject({ values: ['"x"', "quanti = 5"] });
    expect(regoleCheUsano(p, "n")).toBe(0);
  });

  test("rinomina attraverso le funzioni: un dato del programma e il parametro di una funzione con lo stesso nome restano separati", () => {
    const funzioni = daFile("riferimento-media-voti-funzioni", "tappa-3");
    const valido = (p: Progetto) => p.functions.find((f) => f.name === "valido")!;
    const delProgramma = progettoDi(applica(rinominaDato(1, "punteggio"), funzioni));
    expect([valido(delProgramma).data[0]!.name, valido(delProgramma).end.return_value]).toEqual(["voto", "voto >= 1 and voto <= 10"]);
    expect(valido(delProgramma).test_cases).toStrictEqual(valido(funzioni).test_cases);
    expect(delProgramma.test_cases![0]!.inputs.filter((x) => x.data === "punteggio").length).toBe(4);
    const delParametro = progettoDi(applica(rinominaDato(0, "v", "f3"), funzioni));
    expect([valido(delParametro).data[0]!.name, valido(delParametro).end.return_value]).toEqual(["v", "v >= 1 and v <= 10"]);
    expect(valido(delParametro).test_cases!.map((c) => c.inputs.map((x) => x.data))).toEqual([["v"], ["v"]]);
    expect([delParametro.functions[0], delParametro.test_cases]).toStrictEqual([funzioni.functions[0], funzioni.test_cases]);
    // La chiamata `valido(voto)` nel programma non cambia: è del programma, e il nome della funzione non è il dato.
    expect(trova(delParametro, "b4")).toMatchObject({ condition: "valido(voto)" });
  });

  test("rinomina di un dato di lavoro che una lettura riceve: seguono le voci dei casi del programma e delle procedure che la chiamano", () => {
    const p = conUnaLetturaNelDatoDiLavoro(daFile("lettura-attraverso-riferimento", "tappa-3"));
    const id = (q: Progetto, nome: string) => q.functions.find((f) => f.name === nome)!;
    const voci = (q: Progetto) => [q.test_cases![0]!.inputs[0]!.data, id(q, "chiedi").test_cases![0]!.inputs[0]!.data];
    const rinominato = progettoDi(applica(rinominaDato(1, "testo", id(p, "leggi").id), p));
    expect({ dato: id(rinominato, "leggi").data[1]!.name, voci: voci(rinominato) }).toEqual({ dato: "testo", voci: ["testo", "testo"] });
    // I casi restano raggiunti.
    const chiedi = id(rinominato, "chiedi");
    const esiti = [eseguiCaso(rinominato, rinominato.test_cases![0]!, tetti), eseguiCaso(rinominato, chiedi.test_cases![0]!, tetti, chiedi.id)];
    expect(esiti.map((e) => !e.fuoriTappa && e.raggiunto)).toEqual([true, true]);
    // Una radice con un dato suo dello stesso nome che non riceve letture: le voci sono della procedura, e seguono.
    const conRiga = { ...p, functions: p.functions.map((f) => (f.kind === "main" ? { ...f, data: [...f.data, { name: "riga", type: "integer" as const }] } : f)) };
    expect(voci(progettoDi(applica(rinominaDato(1, "testo", id(p, "leggi").id), conRiga)))).toEqual(["testo", "testo"]);
    expect(vociCheRestano(conRiga, 1, id(p, "leggi").id)).toEqual([]);
    // Se il dato della radice riceve una lettura, la voce può essere sua: le voci del programma restano, e si dice.
    const letta = {
      ...conRiga,
      functions: conRiga.functions.map((f) => (f.kind === "main" ? { ...f, body: [{ id: "b90", kind: "read" as const, target: "riga" }, ...f.body] } : f)),
    };
    expect(voci(progettoDi(applica(rinominaDato(1, "testo", id(p, "leggi").id), letta)))).toEqual(["riga", "testo"]);
    expect(vociCheRestano(letta, 1, id(p, "leggi").id)).toEqual([{ radice: null, altre: [null] }]);
  });

  test("rinomina di un dato di lavoro omonimo in due procedure chiamate: le voci del programma restano, e si dice dove sono gli altri", () => {
    // Il programma chiama `uno` e `due`, che leggono ognuna un suo dato `riga` e lo scrivono; il caso dà una voce a testa.
    const procedura = (fid: string, nome: string, b: number) => ({
      id: fid,
      kind: "procedure",
      name: nome,
      data: [{ name: "riga", type: "integer" }],
      body: [
        { id: `b${b}`, kind: "read", target: "riga" },
        { id: `b${b + 1}`, kind: "write", values: ["riga"], newline: true },
      ],
      end: { id: `b${b + 2}` },
      test_cases: [{ name: "sette", inputs: [{ data: "riga", text: "7" }], expected: { output: "7\n" } }],
    });
    const letto = leggi({
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
        procedura("f2", "uno", 4),
        procedura("f3", "due", 7),
      ],
      test_cases: [{ name: "uno e due", inputs: [{ data: "riga", text: "1" }, { data: "riga", text: "2" }], expected: { output: "1\n2\n" } }],
    });
    if (!letto.ok) throw new Error(JSON.stringify(letto.errori));
    const p = letto.progetto;
    const prima = eseguiCaso(p, p.test_cases![0]!, tetti);
    expect(!prima.fuoriTappa && prima.raggiunto).toBe(true);
    const rinominato = progettoDi(applica(rinominaDato(0, "testo", "f2"), p));
    // Le voci del programma restano (prima la seconda diventava «testo» e il caso si fermava su `due`); quelle del caso di
    // `uno`, che è solo suo, seguono; quelle di `due` non lo riguardano.
    expect([rinominato.test_cases![0]!.inputs.map((x) => x.data), rinominato.functions.map((f) => f.test_cases?.[0]?.inputs[0]?.data ?? "")]).toEqual([
      ["riga", "riga"],
      ["", "testo", "riga"],
    ]);
    expect(vociCheRestano(p, 0, "f2")).toEqual([{ radice: null, altre: ["due"] }]);
    // Senza la chiamata di `due` non c'è altro dato: le voci seguono, e nessuna resta.
    const senzaDue = { ...p, functions: p.functions.map((f) => (f.kind === "main" ? { ...f, body: f.body.slice(0, 1) } : f)), test_cases: [{ ...p.test_cases![0]!, inputs: p.test_cases![0]!.inputs.slice(0, 1) }] };
    expect(progettoDi(applica(rinominaDato(0, "testo", "f2"), senzaDue)).test_cases![0]!.inputs.map((x) => x.data)).toEqual(["testo"]);
    expect(vociCheRestano(senzaDue, 0, "f2")).toEqual([]);
  });

  test("il dato per intero: nome e attributi insieme, in un passo, uguale alla rinomina seguita dalla modifica", () => {
    const nuovo = { name: "punteggio", type: "real" as const, initial: "0.0", role: "input" as const };
    const intero = progettoDi(applica(cambiaDato(1, nuovo), riferimento));
    const inDue = progettoDi(applica(modificaDato(1, { type: "real", initial: "0.0", role: "input" }), progettoDi(applica(rinominaDato(1, "punteggio"), riferimento))));
    expect(intero).toStrictEqual(inDue);
    expect(intero.functions[0]!.data[1]).toEqual(nuovo);
    expect(regoleCheUsano(intero, "punteggio")).toBe(5);
    // Senza cambiare il nome, le regole non si toccano.
    const stessoNome = progettoDi(applica(cambiaDato(1, { name: "voto", type: "real" }), riferimento));
    expect(stessoNome.functions[0]!.body).toStrictEqual(riferimento.functions[0]!.body);
    expect(applica(cambiaDato(8, nuovo), riferimento)).toEqual({ ok: false, rifiuto: { motivo: "dato_inesistente" } });
  });

  const nomi = (p: Progetto) => p.functions[0]!.data.map((d) => d.name);

  test("duplica: la copia sotto l'originale, col primo nome libero fra nome_2, nome_3, …, e gli stessi attributi", () => {
    const una = progettoDi(applica(duplicaDato(1), riferimento));
    expect(nomi(una)).toEqual(["n", "voto", "voto_2", "media", "contati", "insufficienti", "somma", "i", "j"]);
    expect(una.functions[0]!.data[2]).toEqual({ ...riferimento.functions[0]!.data[1]!, name: "voto_2" });
    // Le regole e i casi non cambiano.
    expect([una.functions[0]!.body, una.test_cases]).toStrictEqual([riferimento.functions[0]!.body, riferimento.test_cases]);
    const due = progettoDi(applica(duplicaDato(1), una));
    expect(nomi(due)).toEqual(["n", "voto", "voto_3", "voto_2", "media", "contati", "insufficienti", "somma", "i", "j"]);
    // La copia della copia.
    expect(nomi(progettoDi(applica(duplicaDato(3), due))).slice(1, 5)).toEqual(["voto", "voto_3", "voto_2", "voto_2_2"]);
    // Una costante comune col nome candidato lo rende occupato.
    const conCostante = { ...riferimento, shared_constants: [{ name: "voto_2", type: "integer" as const, constant: true, initial: "1" }] };
    expect(nomi(progettoDi(applica(duplicaDato(1), conCostante)))[2]).toBe("voto_3");
    // Un nome di 63 caratteri, il più lungo valido: la copia accorcia il nome perché il suffisso ci stia.
    const lungo = "a".repeat(63);
    const conLungo = progettoDi(applica(aggiungiDato({ name: lungo, type: "integer" }), riferimento));
    expect(nomi(progettoDi(applica(duplicaDato(8), conLungo))).at(-1)).toBe(`${"a".repeat(61)}_2`);
  });

  test("sposta su e giù: l'ordine della vista e del file, e quindi delle azioni dei valori iniziali; ai bordi si rifiuta", () => {
    const giu = progettoDi(applica(spostaDato(3, 1), riferimento));
    expect(nomi(giu)).toEqual(["n", "voto", "media", "insufficienti", "contati", "somma", "i", "j"]);
    expect(progettoDi(applica(spostaDato(4, -1), riferimento))).toStrictEqual(giu);
    // I valori iniziali sono le prime azioni, nell'ordine della vista: ora «insufficienti» prima di «contati».
    const primePause = (p: Progetto) => {
      const e = new Esecuzione(p, tetti);
      return Array.from({ length: 5 }, () => {
        e.comanda("sopra");
        e.fetta(() => 0, Infinity);
        const s = e.stato;
        return s.genere === "pausa" ? s.dato : s.genere;
      });
    };
    expect(primePause(riferimento)).toEqual(["contati", "insufficienti", "somma", "i", "j"]);
    expect(primePause(giu)).toEqual(["insufficienti", "contati", "somma", "i", "j"]);
    expect([applica(spostaDato(0, -1), riferimento), applica(spostaDato(7, 1), riferimento), applica(spostaDato(8, -1), riferimento)]).toEqual([
      { ok: false, rifiuto: { motivo: "al_bordo" } },
      { ok: false, rifiuto: { motivo: "al_bordo" } },
      { ok: false, rifiuto: { motivo: "dato_inesistente" } },
    ]);
  });

  test("un parametro non si duplica né si sposta come un dato, e un dato lo salta", () => {
    const conParametro = progettoDi(applica(aggiungiDato({ name: "q", type: "integer", parameter: "value" }), riferimento));
    const parametro = { ok: false, rifiuto: { motivo: "parametro" } } as const;
    expect([applica(duplicaDato(8), conParametro), applica(spostaDato(8, -1), conParametro), applica(spostaDato(7, 1), conParametro)]).toEqual([
      parametro,
      parametro,
      { ok: false, rifiuto: { motivo: "al_bordo" } },
    ]);
    // Controllo positivo: lo stesso dato senza `parameter` si duplica e si sposta.
    expect([applica(duplicaDato(8), progettoDi(applica(aggiungiDato({ name: "q", type: "integer" }), riferimento))).ok, applica(spostaDato(6, 1), conParametro).ok]).toEqual([true, true]);
  });

  test("Annulla e Ripeti: duplicare e spostare un dato sono un passo ciascuno", () => {
    let c = inizia(riferimento);
    for (const op of [duplicaDato(1), spostaDato(2, 1)]) {
      const r = applicaPasso(c, op);
      if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
      c = r.cronologia;
    }
    expect(nomi(c.presente).slice(0, 4)).toEqual(["n", "voto", "media", "voto_2"]);
    expect(nomi(annulla(c).presente).slice(0, 4)).toEqual(["n", "voto", "voto_2", "media"]);
    expect(annulla(annulla(c)).presente).toBe(riferimento);
    expect(ripeti(ripeti(annulla(annulla(c)))).presente).toStrictEqual(c.presente);
  });
});

// ------------------------------------------------------------------------------- i casi d'uso

describe("casi d'uso", () => {
  const lettura = daFile("lettura-intero");
  const nomiDeiCasi = (p: Progetto) => (p.test_cases ?? []).map((c) => c.name);
  const zero = { name: "zero", inputs: [{ data: "n", text: "0" }], expected: { output: "0\n" } };

  test("un nome che si confonde nella riga di comando non si dà a un caso, né del programma né della funzione; il file che lo ha già si apre e il caso si cambia nel resto", () => {
    const delP = (name: string) => ({ name, inputs: [], expected: { output: "" } });
    const conP = (casiDelProgramma: readonly string[], casiDiP: readonly string[]) => {
      const a = leggi({
        format: "algodesign",
        schema_version: 2,
        metadata: { name: "prova" },
        functions: [
          { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
          { id: "f2", kind: "procedure", name: "p", data: [], body: [], end: { id: "b2" }, ...(casiDiP.length > 0 ? { test_cases: casiDiP.map(delP) } : {}) },
        ],
        ...(casiDelProgramma.length > 0 ? { test_cases: casiDelProgramma.map(delP) } : {}),
      });
      if (!a.ok) throw new Error(JSON.stringify(a.errori));
      return a.progetto;
    };
    const motivo = (r: Risultato) => (r.ok ? "applicata" : r.rifiuto.motivo);
    const giaConfuso = conP(["p/uno"], ["uno"]);
    expect({
      aggiunto: motivo(applica(aggiungiCaso(delP("p/uno")), conP([], ["uno"]))),
      rinominato: motivo(applica(cambiaCaso(0, delP("p/uno")), conP(["a"], ["uno"]))),
      dellaFunzione: motivo(applica(cambiaCaso(0, delP("uno"), "f2"), conP(["p/uno"], ["due"]))),
      aggiuntoAllaFunzione: motivo(applica(aggiungiCaso(delP("uno"), "f2"), conP(["p/uno"], []))),
      duplicato: motivo(applica(duplicaCaso(0, "copia"), conP(["p/uno"], ["uno (copia)", "uno"]))),
      // Il file che lo ha già: il caso si cambia lasciandogli il nome, e un altro nome che non si confonde va.
      stessoNome: motivo(applica(cambiaCaso(0, { ...delP("p/uno"), description: "di prima" }), giaConfuso)),
      altroNome: motivo(applica(cambiaCaso(0, delP("p/due")), giaConfuso)),
      unaBarraSola: motivo(applica(aggiungiCaso(delP("voti 6/7")), conP([], ["uno"]))),
    }).toEqual({
      aggiunto: "nome_del_caso_confuso",
      rinominato: "nome_del_caso_confuso",
      dellaFunzione: "nome_del_caso_confuso",
      aggiuntoAllaFunzione: "nome_del_caso_confuso",
      duplicato: "nome_del_caso_confuso",
      stessoNome: "applicata",
      altroNome: "applicata",
      unaBarraSola: "applicata",
    });
  });

  test("aggiungi in fondo, cambia, elimina; un nome già usato lo rifiuta il lettore; senza casi il campo non c'è", () => {
    const tre = progettoDi(applica(aggiungiCaso(zero), lettura));
    expect(nomiDeiCasi(tre)).toEqual(["lettura-intero", "negativo", "zero"]);
    expect(tre.test_cases![2]).toEqual(zero);
    expect(applica(aggiungiCaso({ ...zero, name: "negativo" }), lettura)).toEqual({
      ok: false,
      rifiuto: { motivo: "illeggibile", errori: [{ percorso: "test_cases[2].name", motivo: "duplicate_test_case_name" }] },
    });
    const cambiato = progettoDi(applica(cambiaCaso(1, { ...zero, name: "negativo", description: "" }), lettura));
    expect(cambiato.test_cases![1]).toEqual({ ...zero, name: "negativo" });
    const uno = progettoDi(applica(eliminaCaso(0), lettura));
    expect(nomiDeiCasi(uno)).toEqual(["negativo"]);
    const nessuno = progettoDi(applica(eliminaCaso(0), uno));
    expect("test_cases" in nessuno).toBe(false);
    // Un caso aggiunto a un progetto senza casi.
    expect(nomiDeiCasi(progettoDi(applica(aggiungiCaso(zero), nessuno)))).toEqual(["zero"]);
    for (const op of [cambiaCaso(2, zero), eliminaCaso(-1), duplicaCaso(2, "copia"), spostaCaso(9, 1), togliErroreAtteso(2)])
      expect(applica(op, lettura)).toEqual({ ok: false, rifiuto: { motivo: "caso_inesistente" } });
  });

  test("duplica: la copia sotto l'originale, «… (copia)», poi «… (copia 2)»: nomi unici", () => {
    const una = progettoDi(applica(duplicaCaso(0, "copia"), lettura));
    expect(nomiDeiCasi(una)).toEqual(["lettura-intero", "lettura-intero (copia)", "negativo"]);
    expect(una.test_cases![1]).toEqual({ ...lettura.test_cases![0]!, name: "lettura-intero (copia)" });
    const due = progettoDi(applica(duplicaCaso(0, "copia"), una));
    expect(nomiDeiCasi(due)).toEqual(["lettura-intero", "lettura-intero (copia 2)", "lettura-intero (copia)", "negativo"]);
    // La parola della copia la dà chi chiama, nella sua lingua.
    expect(nomiDeiCasi(progettoDi(applica(duplicaCaso(1, "copy"), lettura)))[2]).toBe("negativo (copy)");
  });

  test("sposta su e giù: l'ordine dell'elenco e del file; ai bordi si rifiuta", () => {
    expect(nomiDeiCasi(progettoDi(applica(spostaCaso(1, -1), lettura)))).toEqual(["negativo", "lettura-intero"]);
    expect(progettoDi(applica(spostaCaso(0, 1), lettura))).toStrictEqual(progettoDi(applica(spostaCaso(1, -1), lettura)));
    expect([applica(spostaCaso(0, -1), lettura), applica(spostaCaso(1, 1), lettura)]).toEqual([
      { ok: false, rifiuto: { motivo: "al_bordo" } },
      { ok: false, rifiuto: { motivo: "al_bordo" } },
    ]);
  });

  test("attendi l'errore: dall'esito, il genere e il blocco dell'errore ottenuto; poi il caso è raggiunto; toglilo", () => {
    const divisione = daFile("divisione-per-zero");
    const senzaErrore = progettoDi(applica(cambiaCaso(0, { ...divisione.test_cases![0]!, expected: { output: "" } }), divisione));
    const esito = eseguiCaso(senzaErrore, senzaErrore.test_cases![0]!, tetti);
    expect(esito).toMatchObject({ raggiunto: false });
    const atteso = progettoDi(applica(attendiErrore(0, esito), senzaErrore));
    expect(atteso.test_cases![0]!.expected).toEqual({ output: "", error: { code: "division_by_zero", block: "b1" } });
    expect(eseguiCaso(atteso, atteso.test_cases![0]!, tetti)).toMatchObject({ raggiunto: true });
    expect(progettoDi(applica(togliErroreAtteso(0), atteso)).test_cases![0]!.expected).toEqual({ output: "" });
    // Un caso raggiunto senza errore, o un progetto fuori tappa: non c'è un errore da attendere.
    const raggiunto = eseguiCaso(divisione, divisione.test_cases![0]!, tetti);
    const giusto = eseguiCaso(lettura, lettura.test_cases![0]!, tetti);
    // L'errore della memoria finita non si attende: dipende dalla macchina e dal motore.
    if (giusto.fuoriTappa) throw new Error("premessa: il caso di lettura è della tappa");
    const memoria = { ...giusto, ottenuto: { ...giusto.ottenuto, error: { code: "out_of_memory" as const, block: "b1" } } };
    expect([applica(attendiErrore(0, giusto), lettura), applica(attendiErrore(0, { fuoriTappa: true }), lettura), applica(attendiErrore(0, memoria), lettura)]).toEqual([
      { ok: false, rifiuto: { motivo: "nessun_errore" } },
      { ok: false, rifiuto: { motivo: "fuori_tappa" } },
      { ok: false, rifiuto: { motivo: "non_deterministico" } },
    ]);
    expect(raggiunto).toMatchObject({ raggiunto: true });
  });

  test("attendi l'errore statico: l'output atteso diventa vuoto (il progetto non parte), e l'errore di prima si toglie", () => {
    const p = progettoDi(applica(campi("b2", { values: ["y"] }), lettura));
    const caso = { ...p.test_cases![0]!, expected: { output: "42\n", error: { code: "input_exhausted" as const, block: "b1" } } };
    const conErrore = progettoDi(applica(cambiaCaso(0, caso), p));
    const esito = eseguiCaso(conErrore, conErrore.test_cases![0]!, tetti);
    const atteso = progettoDi(applica(attendiErrore(0, esito), conErrore));
    expect(atteso.test_cases![0]!.expected).toEqual({ output: "", static_error: { code: "unknown_name", block: "b2" } });
    expect(eseguiCaso(atteso, atteso.test_cases![0]!, tetti)).toMatchObject({ raggiunto: true });
  });

  test("scrivi gli avvisi: gli ottenuti nell'atteso, anche nessuno; poi il caso non ha avvisi diversi", () => {
    const divisione = daFile("divisione-intera-in-reale");
    const { warnings: _, ...senzaAvvisi } = divisione.test_cases![0]!.expected;
    const taciuto = progettoDi(applica(cambiaCaso(0, { ...divisione.test_cases![0]!, expected: senzaAvvisi }), divisione));
    const esito = eseguiCaso(taciuto, taciuto.test_cases![0]!, tetti);
    expect(esito).toMatchObject({ raggiunto: true, avvisi: { attesi: "nessuno", ottenuti: "integer_division_to_real@b1" } });
    const scritti = progettoDi(applica(scriviAvvisi(0, esito), taciuto));
    expect(scritti.test_cases![0]!.expected).toEqual({ output: "3.00\n", warnings: [{ code: "integer_division_to_real", block: "b1" }] });
    expect(eseguiCaso(scritti, scritti.test_cases![0]!, tetti)).toEqual({ ...eseguiCaso(divisione, divisione.test_cases![0]!, tetti) });
    expect(eseguiCaso(scritti, scritti.test_cases![0]!, tetti)).not.toHaveProperty("avvisi");
    // Un avviso atteso che il progetto non ha: scrivere gli ottenuti toglie il campo.
    const inPiu = progettoDi(applica(cambiaCaso(0, { ...lettura.test_cases![0]!, expected: { output: "42\n", warnings: [{ code: "real_equality", block: "b1" }] } }), lettura));
    const via = progettoDi(applica(scriviAvvisi(0, eseguiCaso(inPiu, inPiu.test_cases![0]!, tetti)), inPiu));
    expect(via.test_cases![0]!.expected).toEqual({ output: "42\n" });
    expect(applica(scriviAvvisi(0, { fuoriTappa: true }), lettura)).toEqual({ ok: false, rifiuto: { motivo: "fuori_tappa" } });
  });

  test("Annulla e Ripeti: ogni operazione dei casi è un passo", () => {
    let c = inizia(lettura);
    const passi = [duplicaCaso(0, "copia"), spostaCaso(0, 1), aggiungiCaso(zero), eliminaCaso(2)];
    const presenti: Progetto[] = [c.presente];
    for (const op of passi) {
      const r = applicaPasso(c, op);
      if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
      c = r.cronologia;
      presenti.push(c.presente);
    }
    expect(nomiDeiCasi(c.presente)).toEqual(["lettura-intero (copia)", "lettura-intero", "zero"]);
    for (let k = passi.length - 1; k >= 0; k--) {
      c = annulla(c);
      expect(c.presente).toBe(presenti[k]!);
    }
    expect(c.presente).toBe(lettura);
    for (let k = 1; k <= passi.length; k++) {
      c = ripeti(c);
      expect(c.presente).toBe(presenti[k]!);
    }
  });
});
