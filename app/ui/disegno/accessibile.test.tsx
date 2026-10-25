// Le prove dello strato delle modifiche sotto happy-dom: la struttura accessibile contro l'albero, e il clic
// su ogni «+» del riferimento contro il MODELLO (il posto in cui il blocco nuovo finisce, letto con `dove`
// sul progetto che l'operazione restituisce).
//
// I rilevatori sono scritti qui, indipendenti dal modulo: i posti si contano camminando l'albero (prima,
// fra e dopo i blocchi di ogni sequenza, rami e corpi vuoti compresi) e i nomi attesi si compongono qui
// dalle voci del dizionario.
//
// I valori iniziali: nella struttura prima del primo punto, coi nomi scritti qui dai valori del corpus; nello strato
// un pulsante per blocco, col nome uguale al testo disegnato, che si sceglie, si apre e non si trascina.
//
// I cicli `per` e `per ogni`: una voce col suo corpo, sul corpus della tappa 2 e su alberi generati coi cicli, nelle
// forme del disegno (i punti del disegno sono quelli dell'albero, nessuno fra i blocchi che il riquadro aggiunge); i
// nomi col genere e il contenuto, scritti qui.
//
// CHE COSA NON GUARDA:
// - il disegno: dove il «+» sta sullo schermo (lo provano l'impaginazione e i motori);
// - l'elenco dei blocchi e i tasti: qui il clic sul «+» arriva fino a chi lo riceve (`attiva`), e
//   l'operazione la applica la prova; il giro completo dall'interfaccia è nei motori (`editor.e2e.ts`);
// - gli operatori a parola tradotti nei nomi: qui l'espressione resta com'è nel file.

import { expect, test } from "bun:test";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alberoGenerato } from "../../core/disegno/alberi-di-prova";
import { impagina, opzioniPredefinite, type TestiDelDisegno } from "../../core/disegno/impaginazione";
import { geometriaPredefinita } from "../../core/disegno/tema";
import { dove, inserisci, type Posto, type Ramo } from "../../core/modifica/operazioni";
import { apri } from "../../core/progetto/formato";
import type { Blocco, Dato, Funzione, Progetto } from "../../core/progetto/modello";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { cicliIt, funzioniIt } from "../../core/esecuzione/testi-di-prova";
import { bloccoNelPosto } from "../modifiche";
import { chiaveDelPosto, strutturaAccessibile, type Voce } from "./accessibile";
import { Flowchart } from "./Flowchart";

const misura = (t: string) => [...t].length * 8;
const testiDelDisegno: TestiDelDisegno = { inizio: "Inizio", fine: "Fine", leggi: "leggi", scrivi: "scrivi", vero: "Vero", falso: "Falso", aCapo: " ↵", ogniElemento: "{valore} in ogni elemento", altri: "… altri {n}", cicli: cicliIt, funzioni: funzioniIt };
const cartella = join(import.meta.dir, "..", "..", "casi", "tappa-1");
const progettoDi = (f: string): Progetto => {
  const e = apri(readFileSync(join(cartella, f), "utf8"));
  if (!e.ok) throw new Error(`${f} non si apre`);
  return e.progetto;
};
const riferimento = progettoDi("riferimento-media-voti.algo");
const principale = (p: Progetto) => p.functions[0]!;

// --------------------------------------------------------------------- il rilevatore indipendente

/** I posti dell'albero, nell'ordine del flusso, con la sequenza che li contiene. */
function postiDellAlbero(f: Funzione): Posto[] {
  const fuori: Posto[] = [];
  const seq = (s: readonly Blocco[], contenitore: string, ramo: Ramo) => {
    s.forEach((b, indice) => {
      fuori.push({ contenitore, ramo, indice });
      if (b.kind === "if") seq(b.then, b.id, "then"), seq(b.else, b.id, "else");
      if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") seq(b.body, b.id, "body");
    });
    fuori.push({ contenitore, ramo, indice: s.length });
  };
  seq(f.body, f.id, "body");
  return fuori;
}

function contaBlocchi(s: readonly Blocco[]): number {
  return s.reduce((n, b) => n + 1 + (b.kind === "if" ? contaBlocchi(b.then) + contaBlocchi(b.else) : "body" in b ? contaBlocchi(b.body) : 0), 0);
}

/** Le voci della struttura, appiattite. */
function voci(v: Voce): Voce[] {
  return v.genere === "sequenza" ? [v, ...v.voci.flatMap(voci)] : [v];
}

// ----------------------------------------------------------------------------- la struttura

const corpus = readdirSync(cartella)
  .filter((f) => f.endsWith(".algo"))
  .map((f) => principale(progettoDi(f)));
const generati = Array.from({ length: 40 }, (_, i) => alberoGenerato(1000 + i));

test("su ogni albero (corpus e generati) i punti della struttura sono i posti dell'albero e i punti del disegno, nei due versi", () => {
  let [alberi, posti] = [0, 0];
  const difetti: string[] = [];
  for (const f of [...corpus, ...generati]) {
    const s = voci(strutturaAccessibile(f, it));
    const daStruttura = s.filter((v) => v.genere === "punto").map((v) => chiaveDelPosto(v.posto));
    const daAlbero = postiDellAlbero(f).map(chiaveDelPosto);
    const daDisegno = impagina(f, geometriaPredefinita, misura, testiDelDisegno).punti.map((p) => chiaveDelPosto(p.posto));
    // L'ordine del flusso: per la struttura è quello dell'albero (e quindi della tastiera).
    if (JSON.stringify(daStruttura) !== JSON.stringify(daAlbero)) difetti.push(`${f.id}: struttura e albero in ordine diverso`);
    const mancanti = daAlbero.filter((k) => !daDisegno.includes(k));
    const inPiu = daDisegno.filter((k) => !daAlbero.includes(k));
    if (mancanti.length + inPiu.length > 0) difetti.push(`${f.id}: disegno senza ${mancanti.join(" ")}; disegno in più ${inPiu.join(" ")}`);
    const blocchi = s.filter((v) => v.genere === "blocco");
    if (blocchi.length !== contaBlocchi(f.body)) difetti.push(`${f.id}: ${blocchi.length} blocchi nella struttura, ${contaBlocchi(f.body)} nell'albero`);
    alberi++;
    posti += daAlbero.length;
  }
  console.log(`struttura accessibile: alberi ${alberi} (corpus ${corpus.length}, generati ${generati.length}), posti ${posti}, difetti ${difetti.length}`);
  expect(difetti).toEqual([]);
  expect(corpus.length).toBe(56);
  expect(posti).toBeGreaterThan(alberi * 2);

  // Controllo positivo: un posto tolto dalla struttura, e il rilevatore lo dice.
  const f = principale(riferimento);
  const tolto = postiDellAlbero(f).map(chiaveDelPosto).slice(1);
  expect(postiDellAlbero(f).map(chiaveDelPosto).filter((k) => !tolto.includes(k))).toHaveLength(1);
});

test("i nomi del riferimento: genere e contenuto per i blocchi, sequenza e posto per i punti, in italiano e in inglese", () => {
  const f = principale(riferimento);
  for (const [lingua, testi] of [["it", it], ["en", en]] as const) {
    const s = voci(strutturaAccessibile(f, testi));
    const nomi = s.map((v) => v.nome);
    // Nessuna voce senza nome, e ogni punto e ogni blocco col suo nome solo.
    expect(nomi.filter((n) => n.trim() === "")).toEqual([]);
    const pulsanti = s.filter((v) => v.genere !== "sequenza").map((v) => v.nome);
    expect(new Set(pulsanti).size).toBe(pulsanti.length);
    if (lingua === "it") {
      expect(nomi).toContain("Programma principale: inserisci al posto 1 di 6");
      expect(nomi).toContain("Ripeti: n < 1 or n > 30");
      expect(nomi).toContain("Corpo di «Ripeti: n < 1 or n > 30»: inserisci al posto 2 di 3");
      expect(nomi).toContain("Ramo Vero di «Se: n < 1 or n > 30»: inserisci al posto 1 di 2");
      expect(nomi).toContain("Assegnazione: i ← 0");
      expect(nomi).toContain("Lettura: voto");
    } else {
      expect(nomi).toContain("Main program: insert at place 1 of 6");
      expect(nomi).toContain("Body of “Repeat: n < 1 or n > 30”: insert at place 2 of 3");
    }
  }
  // Un blocco appena inserito, coi campi vuoti, ha comunque un nome.
  const vuoto: Funzione = { ...f, body: [{ id: "b99", kind: "assignment", target: "", value: "" }] };
  expect(voci(strutturaAccessibile(vuoto, it)).map((v) => v.nome)).toContain("Assegnazione: senza testo");
});

// ------------------------------------------------------------- i cicli

const cartellaDeiCicli = join(import.meta.dir, "..", "..", "casi", "tappa-2");
// In ordine di nome: `readdirSync` dà l'ordine del file system, alfabetico su NTFS e no su ext4.
const deiCicli = readdirSync(cartellaDeiCicli)
  .filter((f) => f.endsWith(".algo"))
  .sort()
  .map((f) => {
    const e = apri(readFileSync(join(cartellaDeiCicli, f), "utf8"));
    if (!e.ok) throw new Error(`${f} non si apre`);
    return principale(e.progetto);
  });
const generatiConICicli = Array.from({ length: 40 }, (_, i) => alberoGenerato(1000 + i, true));
const formeDeiCicli = [
  { per: "aperto", perOgni: "posizione" },
  { per: "chiuso", perOgni: "parole" },
  { per: "aperto", perOgni: "chiuso" },
] as const;

test("i cicli per e per ogni: una voce col suo corpo, coi punti dell'albero e del disegno in ogni forma dei cicli", () => {
  let [alberi, posti, cicli] = [0, 0, 0];
  const difetti: string[] = [];
  for (const f of [...deiCicli, ...generatiConICicli]) {
    const s = voci(strutturaAccessibile(f, it));
    const daStruttura = s.filter((v) => v.genere === "punto").map((v) => chiaveDelPosto(v.posto));
    const daAlbero = postiDellAlbero(f).map(chiaveDelPosto);
    if (JSON.stringify(daStruttura) !== JSON.stringify(daAlbero)) difetti.push(`${f.id}: struttura e albero in ordine diverso`);
    for (const forma of formeDeiCicli) {
      const daDisegno = impagina(f, geometriaPredefinita, misura, testiDelDisegno, { ...opzioniPredefinite, ...forma }).punti.map((p) => chiaveDelPosto(p.posto));
      const mancanti = daAlbero.filter((k) => !daDisegno.includes(k));
      const inPiu = daDisegno.filter((k) => !daAlbero.includes(k));
      if (mancanti.length + inPiu.length > 0) difetti.push(`${f.id} (${forma.per}, ${forma.perOgni}): disegno senza ${mancanti.join(" ")}; disegno in più ${inPiu.join(" ")}`);
    }
    const blocchi = s.filter((v) => v.genere === "blocco");
    if (blocchi.length !== contaBlocchi(f.body)) difetti.push(`${f.id}: ${blocchi.length} blocchi nella struttura, ${contaBlocchi(f.body)} nell'albero`);
    // Ogni ciclo ha il suo corpo come gruppo, subito dopo la sua voce.
    const piatte = voci(strutturaAccessibile(f, it));
    for (const [i, v] of piatte.entries()) {
      if (v.genere !== "blocco" || !(v.nome.startsWith(`${it.bloccoPer}: `) || v.nome.startsWith(`${it.bloccoPerOgni}: `))) continue;
      cicli++;
      const dopo = piatte[i + 1];
      if (dopo?.genere !== "sequenza" || dopo.nome !== riempi(it.sequenzaCorpo, { blocco: v.nome })) difetti.push(`${f.id}: «${v.nome}» senza il suo corpo`);
    }
    alberi++;
    posti += daAlbero.length;
  }
  console.log(`struttura accessibile coi cicli: alberi ${alberi} (corpus ${deiCicli.length}, generati ${generatiConICicli.length}), posti ${posti}, cicli ${cicli}, difetti ${difetti.length}`);
  expect(difetti).toEqual([]);
  expect(deiCicli.length).toBe(15);
  expect(cicli).toBeGreaterThan(40);
});

test("i nomi dei cicli: il genere e il contenuto dell'intestazione, col passo solo se non è 1, in italiano e in inglese", () => {
  const annidati = deiCicli.find((f) => f.body.some((b) => b.kind === "for" && b.to === "3"))!;
  const contrario = deiCicli.find((f) => f.body.some((b) => b.kind === "for" && b.step === -1))!;
  const nomi = (f: Funzione, testi: typeof it) => voci(strutturaAccessibile(f, testi)).map((v) => v.nome);
  expect(nomi(annidati, it)).toEqual(expect.arrayContaining(["Per: i da 1 a 3", "Per: j da 1 a i", "Per ogni: c in s", "Corpo di «Per: i da 1 a 3»: inserisci al posto 1 di 3"]));
  expect(nomi(annidati, en)).toEqual(expect.arrayContaining(["For: i from 1 to 3", "For each: c in s", "Body of “For: i from 1 to 3”: insert at place 1 of 3"]));
  expect(nomi(contrario, it)).toEqual(expect.arrayContaining(["Per: i da length parola - 1 a 0 passo -1", "Per ogni: c in parola"]));
  expect(nomi(contrario, en)).toEqual(expect.arrayContaining(["For: i from length parola - 1 to 0 step -1"]));
  // Appena inseriti, coi campi vuoti, come l'assegnazione vuota: «senza testo».
  const vuoti: Funzione = {
    ...contrario,
    body: [
      { id: "b98", kind: "for", counter: "", from: "", to: "", body: [] },
      { id: "b99", kind: "for_each", item: "", source: "", body: [] },
    ],
  };
  expect(nomi(vuoti, it)).toEqual(expect.arrayContaining(["Per: senza testo", "Per ogni: senza testo"]));
});

test("il nome di un salto: il genere e la chiamata coi suoi argomenti, in italiano e in inglese", () => {
  const f: Funzione = {
    id: "f1",
    kind: "main",
    data: [],
    body: [
      { id: "b1", kind: "call", callee: "leggi_numero", arguments: ["n"] },
      { id: "b2", kind: "call", callee: "stelle", arguments: ["somma / contati", "not fatto"] },
    ],
    end: { id: "b3" },
  };
  const nomi = (testi: typeof it) => voci(strutturaAccessibile(f, testi)).filter((v) => v.genere === "blocco").map((v) => v.nome);
  expect(nomi(it)).toEqual(["Procedura: leggi_numero(n)", "Procedura: stelle(somma / contati, not fatto)"]);
  expect(nomi(en)).toEqual(["Procedure: leggi_numero(n)", "Procedure: stelle(somma / contati, not fatto)"]);
});

// ------------------------------------------------------------- i valori iniziali

/** Il testo atteso del blocco del valore iniziale, scritto qui per i valori del corpus (un letterale, un elenco di al
 * più dieci, il valore ripetuto come elenco): senza passare dal nucleo. */
function testoAtteso(d: Dato): string {
  const v = d.initial!;
  const valore = typeof v === "string" ? v : Array.isArray(v) ? `{${v.join(", ")}}` : `{${Array<string>(d.size!).fill((v as { each: string }).each).join(", ")}}`;
  return `${d.name} ← ${valore}`;
}
const valoriMostrati = { comuni: [], disegno: testiDelDisegno, ripetuto: "elenco" as const };

test("i valori iniziali nella struttura: prima del primo punto, nell'ordine del disegno, col nome del blocco; nessuno coi valori nascosti", () => {
  const conValori = corpus.filter((f) => f.data.some((d) => d.initial !== undefined));
  const difetti: string[] = [];
  let valori = 0;
  for (const f of conValori) {
    const s = strutturaAccessibile(f, it, (t) => t, valoriMostrati);
    if (s.genere !== "sequenza") throw new Error("la struttura non è una sequenza");
    const primoPunto = s.voci.findIndex((v) => v.genere === "punto");
    const inTesta = s.voci.slice(0, primoPunto);
    const attesi = f.data.filter((d) => d.initial !== undefined).map((d) => `${it.bloccoAssegnazione}: ${testoAtteso(d)}`);
    if (JSON.stringify(inTesta.map((v) => v.nome)) !== JSON.stringify(attesi)) difetti.push(`${f.id}: ${inTesta.map((v) => v.nome).join(" | ")}`);
    if (inTesta.some((v) => v.genere !== "valore")) difetti.push(`${f.id}: in testa una voce che non è un valore iniziale`);
    // Dopo il primo punto, nessun valore iniziale; e la struttura coi valori nascosti è quella di prima.
    if (s.voci.slice(primoPunto).some((v) => v.genere === "valore")) difetti.push(`${f.id}: un valore iniziale dopo il primo punto`);
    if (JSON.stringify(strutturaAccessibile(f, it)) !== JSON.stringify({ ...s, voci: s.voci.slice(primoPunto) })) difetti.push(`${f.id}: il resto della struttura è cambiato`);
    valori += inTesta.length;
  }
  console.log(`valori iniziali nella struttura: file ${conValori.length}, voci ${valori}, difetti ${difetti.length}`);
  expect(difetti).toEqual([]);
  // La premessa: i 32 file della tappa 1 con 53 valori iniziali.
  expect([conValori.length, valori]).toEqual([32, 53]);
});

test("nello strato ogni valore iniziale è un pulsante sul suo blocco, col nome del testo disegnato; si sceglie e si apre, e non si trascina", async () => {
  const f = principale(riferimento);
  const disegno = impagina(f, geometriaPredefinita, misura, testiDelDisegno);
  const scelti: string[] = [];
  const aperti: string[] = [];
  const presi: string[] = [];
  await act(async () => {
    render(
      <Flowchart
        disegno={disegno}
        nome="riferimento"
        interazione={{
          struttura: strutturaAccessibile(f, it, (t) => t, valoriMostrati),
          selezionati: new Set(),
          scegli: () => {},
          attiva: () => {},
          perSpostare: (id) => {
            presi.push(id);
            return { id, escluso: () => false, dentro: new Set(), copia: null };
          },
          sposta: () => {},
          spostando: null,
          apri: () => {},
          valoreScelto: "dati-5",
          scegliValore: (k) => scelti.push(k),
          apriValore: (k) => aperti.push(k),
          segnati: new Map(),
          correnteValore: "i",
        }}
      />,
    );
  });
  const flowchart = screen.getByRole("group", { name: "riferimento" });
  const voci = [...flowchart.querySelectorAll("[data-iniziale]")];
  const disegnati = [...flowchart.querySelectorAll("[data-valore-iniziale] text")].map((t) => t.textContent);
  // Il nome di ogni voce è il testo del blocco disegnato nella stessa posizione: una fonte sola.
  expect(voci.map((v) => v.getAttribute("aria-label"))).toEqual(disegnati.map((t) => `${it.bloccoAssegnazione}: ${t}`));
  expect(voci.map((v) => [v.getAttribute("data-iniziale"), v.getAttribute("data-iniziale-di"), v.getAttribute("role")])).toEqual([
    ["dati-3", "contati", "button"],
    ["dati-4", "insufficienti", "button"],
    ["dati-5", "somma", "button"],
    ["dati-6", "i", "button"],
    ["dati-7", "j", "button"],
  ]);
  // Il valore scelto è premuto; la pausa sul valore iniziale di «i» è la sua voce, e una sola.
  expect(voci.map((v) => v.getAttribute("aria-pressed"))).toEqual(["false", "false", "true", "false", "false"]);
  expect([...flowchart.querySelectorAll('[aria-current="step"]')].map((v) => v.getAttribute("data-iniziale-di"))).toEqual(["i"]);
  // La voce sta sulla forma del suo blocco.
  const forme = [...flowchart.querySelectorAll("[data-valore-iniziale] polygon")].map((p) => p.getAttribute("points"));
  expect(voci.map((v) => v.querySelector("polygon")?.getAttribute("points"))).toEqual(forme);
  // Clic, doppio clic, e il puntatore premuto e mosso (col tasto premuto anche nel movimento, `buttons`: senza, il
  // disegno lo tratta come un trascinamento rimasto da un rilascio fuori, e lo annulla): si sceglie, si apre, non si trascina.
  await act(async () => {
    fireEvent.click(voci[1]!);
    fireEvent.doubleClick(voci[3]!);
    fireEvent.pointerDown(voci[0]!, { button: 0, isPrimary: true, pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(flowchart, { pointerId: 1, buttons: 1, clientX: 80, clientY: 80 });
    fireEvent.pointerUp(flowchart, { pointerId: 1, clientX: 80, clientY: 80 });
  });
  expect(scelti).toEqual(["dati-4"]);
  expect(aperti).toEqual(["dati-6"]);
  expect(presi).toEqual([]);
  // Controllo positivo: lo stesso gesto su un blocco dell'albero comincia uno spostamento.
  const blocco = flowchart.querySelector('[data-blocco="b1"]')!;
  await act(async () => {
    fireEvent.pointerDown(blocco, { button: 0, isPrimary: true, pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(flowchart, { pointerId: 2, buttons: 1, clientX: 80, clientY: 80 });
    fireEvent.pointerUp(flowchart, { pointerId: 2, clientX: 80, clientY: 80 });
  });
  expect(presi).toEqual(["b1"]);
});

test("un blocco scritto a mano con l'identificatore che un'altra voce userebbe come chiave: ogni voce resta sua", async () => {
  // Il formato accetta ogni `id`: qui quello che la voce del valore iniziale di «contati» (`dati-3`) aveva come chiave.
  const testo = JSON.stringify(principale(riferimento)).replaceAll('"b1"', '"v-dati-3"');
  const f = JSON.parse(testo) as Funzione;
  const disegno = impagina(f, geometriaPredefinita, misura, testiDelDisegno);
  const errori: string[] = [];
  const prima = console.error;
  console.error = (...a: unknown[]) => void errori.push(a.map(String).join(" "));
  try {
    await act(async () => {
      render(
        <Flowchart
          disegno={disegno}
          nome="a mano"
          interazione={{
            struttura: strutturaAccessibile(f, it, (t) => t, valoriMostrati),
            selezionati: new Set(),
            scegli: () => {},
            attiva: () => {},
            perSpostare: (id) => ({ id, escluso: () => false, dentro: new Set(), copia: null }),
            sposta: () => {},
            spostando: null,
            apri: () => {},
            segnati: new Map(),
          }}
        />,
      );
    });
  } finally {
    console.error = prima;
  }
  const flowchart = screen.getByRole("group", { name: "a mano" });
  expect(errori.filter((e) => e.includes("same key"))).toEqual([]);
  expect([flowchart.querySelectorAll('[data-iniziale="dati-3"]').length, flowchart.querySelectorAll('[data-blocco="v-dati-3"]').length]).toEqual([1, 1]);
});

// ------------------------------------------------------------- il clic su ogni «+» nel modello

test("il clic su ogni «+» del riferimento inserisce nel contenitore e nella posizione attesi, letti dall'albero", async () => {
  const f = principale(riferimento);
  const attesi = postiDellAlbero(f);
  const disegno = impagina(f, geometriaPredefinita, misura, testiDelDisegno);
  let ricevuto: Posto | null = null;
  await act(async () => {
    render(
      <Flowchart
        disegno={disegno}
        nome="riferimento"
        interazione={{
          struttura: strutturaAccessibile(f, it),
          selezionati: new Set(),
          scegli: () => {},
          attiva: (posto) => (ricevuto = posto),
          perSpostare: (id) => ({ id, escluso: () => false, dentro: new Set(), copia: null }),
          sposta: () => {},
          spostando: null,
          apri: () => {},
          segnati: new Map(),
        }}
      />,
    );
  });
  const flowchart = screen.getByRole("group", { name: "riferimento" });
  const punti = within(flowchart)
    .getAllByRole("button")
    .filter((b) => b.hasAttribute("data-punto"));
  // Premessa: tanti «+» quanti posti, nell'ordine del flusso.
  expect(punti.length).toBe(attesi.length);

  /** Il posto in cui finisce un blocco inserito col «+» numero `i`, letto dal progetto che ne esce. */
  const esito = async (i: number): Promise<Posto | undefined> => {
    ricevuto = null;
    await act(async () => {
      fireEvent.pointerDown(punti[i]!);
      fireEvent.click(punti[i]!);
    });
    if (ricevuto === null) return undefined;
    const r = inserisci(ricevuto, "assignment")(riferimento, 1000);
    if (!r.ok) return undefined;
    const nuovo = bloccoNelPosto(r.progetto, ricevuto);
    return nuovo ? dove(r.progetto, nuovo.id) : undefined;
  };
  const sbagliati: string[] = [];
  for (const [i, atteso] of attesi.entries()) {
    const visto = await esito(i);
    if (JSON.stringify(visto) !== JSON.stringify(atteso)) sbagliati.push(`${chiaveDelPosto(atteso)} → ${visto ? chiaveDelPosto(visto) : "nulla"}`);
  }
  console.log(`clic sui «+» del riferimento (modello): punti ${punti.length}, posti dell'albero ${attesi.length}, sbagliati ${sbagliati.length}`);
  expect(sbagliati).toEqual([]);

  // Controllo positivo: il «+» accanto (quello dopo) inserisce in un altro posto, e il rilevatore lo vede.
  const accanto = await esito(1);
  expect(JSON.stringify(accanto)).not.toBe(JSON.stringify(attesi[0]));
  // E un clic che finisce su un «+» senza esserci cominciato (l'elenco chiuso da una scelta) non lo attiva.
  ricevuto = null;
  await act(async () => {
    fireEvent.click(punti[0]!);
  });
  expect(ricevuto).toBeNull();
});
