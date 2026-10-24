// La cronologia di «Annulla» e «Ripeti». La prima prova è ANNULLA E RIPETI: una sequenza di operazioni a
// seme fisso sul programma di riferimento, annullata tutta, ripassa per ogni progetto intermedio e torna al
// progetto iniziale; ripetuta tutta, ripassa per gli stessi e arriva al finale (uguaglianza stretta). Il
// controllo positivo è una cronologia che salta un passo.

import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apri } from "../progetto/formato";
import type { Blocco, Progetto } from "../progetto/modello";
import { annulla, applica, inizia, nomiDiPrima, passiDaAnnullare, ripeti, siAnnulla, siRipete, type Cronologia } from "./cronologia";
import {
  aggiungiDato,
  cambiaDato,
  campi,
  duplicaDato,
  spostaDato,
  dove,
  elimina,
  eliminaDato,
  generiDellaTappa,
  incolla,
  inserisci,
  metadati,
  opzioni,
  rinominaDato,
  sposta,
  trova,
  type Operazione,
  type Posto,
} from "./operazioni";

const aperto = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-1", "riferimento-media-voti.algo"), "utf8"));
if (!aperto.ok) throw new Error("riferimento");
const riferimento = aperto.progetto;

/** Generatore a seme fisso (un LCG): la stessa sequenza a ogni corsa. */
function casuale(seme: number) {
  let s = seme >>> 0;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 4294967296) * n);
  };
}

function blocchiDi(p: Progetto): Blocco[] {
  const fuori: Blocco[] = [];
  const visita = (b: Blocco): void => {
    fuori.push(b);
    if (b.kind === "if") [...b.then, ...b.else].forEach(visita);
    if (b.kind === "while" || b.kind === "repeat") b.body.forEach(visita);
  };
  p.functions.forEach((f) => f.body.forEach(visita));
  return fuori;
}

function postiDi(p: Progetto): Posto[] {
  const fuori: Posto[] = [];
  const sequenza = (s: readonly Blocco[], contenitore: string, ramo: Posto["ramo"]) => {
    for (let indice = 0; indice <= s.length; indice++) fuori.push({ contenitore, ramo, indice });
  };
  for (const f of p.functions) sequenza(f.body, f.id, "body");
  for (const b of blocchiDi(p)) {
    if (b.kind === "if") (sequenza(b.then, b.id, "then"), sequenza(b.else, b.id, "else"));
    if (b.kind === "while" || b.kind === "repeat") sequenza(b.body, b.id, "body");
  }
  return fuori;
}

/** Quante volte la sequenza a caso ha scelto il dato per intero (`cambiaDato`): una premessa della prova. */
let datiInteri = 0;

/** Un'operazione a caso sul progetto di adesso. */
function unaACaso(p: Progetto, r: (n: number) => number): Operazione {
  const blocchi = blocchiDi(p);
  const posti = postiDi(p);
  const dati = p.functions[0]!.data;
  const blocco = () => blocchi[r(blocchi.length)]!;
  const posto = () => posti[r(posti.length)]!;
  switch (r(10)) {
    case 0:
    case 1:
      return inserisci(posto(), generiDellaTappa[r(generiDellaTappa.length)]!);
    case 2:
      return blocchi.length > 0 ? elimina(blocco().id) : inserisci(posto(), "comment");
    case 3:
      return blocchi.length > 0 ? sposta(blocco().id, posto()) : inserisci(posto(), "read");
    case 4:
      return blocchi.length > 0 ? incolla(blocco(), posto()) : inserisci(posto(), "write");
    case 5: {
      const b = blocchi.length > 0 ? blocco() : undefined;
      return b?.kind === "comment" ? campi(b.id, { text: `nota ${r(100)}` }) : b !== undefined && "condition" in b ? campi(b.id, { condition: `i < ${r(100)}` }) : aggiungiDato({ name: `d${r(100)}`, type: "integer" });
    }
    case 6:
      return aggiungiDato({ name: `d${r(100)}`, type: "real" });
    case 7: {
      if (dati.length === 0) return aggiungiDato({ name: "x", type: "boolean" });
      const k = r(dati.length);
      // Il dato per intero (come lo conferma la vista dei dati: nome e attributi in un passo), o il solo nome.
      if (r(2) === 0) return rinominaDato(k, `r${r(100)}`);
      datiInteri++;
      return cambiaDato(k, { ...dati[k]!, name: `c${r(100)}`, type: "real", initial: undefined });
    }
    case 8:
      return dati.length > 0 ? eliminaDato(r(dati.length)) : metadati({ name: `nome ${r(100)}` });
    default:
      return r(2) === 0 ? metadati({ name: `nome ${r(100)}`, author: "a" }) : opzioni({ real_decimals: r(16) });
  }
}

/** Applica N passi a caso che cambiano il progetto; restituisce la cronologia e i progetti attraversati. */
function sequenza(n: number, seme: number): { cronologia: Cronologia; stati: Progetto[]; rifiutate: number; ferme: number } {
  const r = casuale(seme);
  let c = inizia(riferimento);
  const stati = [c.presente];
  let rifiutate = 0;
  let ferme = 0;
  while (stati.length <= n) {
    const esito = applica(c, unaACaso(c.presente, r));
    if (!esito.ok) {
      rifiutate++;
      continue;
    }
    if (esito.cronologia.presente === c.presente) ferme++;
    else stati.push(esito.cronologia.presente);
    c = esito.cronologia;
  }
  return { cronologia: c, stati, rifiutate, ferme };
}

/** Il rilevatore di annulla e ripeti: annulla tutto e ripeti tutto, confrontando ogni progetto attraversato. */
function difformi(c: Cronologia, stati: readonly Progetto[]): string[] {
  const fuori: string[] = [];
  const uguale = (a: Progetto, b: Progetto) => Bun.deepEquals(a, b, true);
  let x = c;
  for (let k = stati.length - 2; k >= 0; k--) {
    x = annulla(x);
    if (!uguale(x.presente, stati[k]!)) fuori.push(`annullato fino al passo ${k}: diverso`);
  }
  if (siAnnulla(x)) fuori.push("dopo l'ultimo annulla resta un passo");
  for (let k = 1; k < stati.length; k++) {
    x = ripeti(x);
    if (!uguale(x.presente, stati[k]!)) fuori.push(`ripetuto fino al passo ${k}: diverso`);
  }
  if (siRipete(x)) fuori.push("dopo l'ultimo ripeti resta un passo");
  return fuori;
}

test("una sequenza di operazioni annullata tutta torna al progetto iniziale, ripetuta tutta al finale", () => {
  const N = 60;
  datiInteri = 0;
  const { cronologia, stati, rifiutate, ferme } = sequenza(N, 7);
  console.log(`annulla e ripeti: passi ${stati.length - 1} (operazioni rifiutate ${rifiutate}, senza effetto ${ferme}, dati per intero ${datiInteri}); blocchi alla fine ${blocchiDi(cronologia.presente).length}, all'inizio ${blocchiDi(riferimento).length}`);
  expect(stati.length - 1).toBe(N);
  expect(datiInteri).toBeGreaterThan(0);
  expect(cronologia.passato.length).toBe(N);
  expect(difformi(cronologia, stati)).toEqual([]);
  // Il progetto iniziale e quello finale sono diversi: altrimenti la prova non distinguerebbe nulla.
  expect(Bun.deepEquals(stati[0], stati.at(-1), true)).toBe(false);

  // Controllo positivo: un passo che non entra nella cronologia (il presente cambiato senza il passato).
  const r = casuale(11);
  let rotta = cronologia;
  let saltato: Progetto | undefined;
  while (saltato === undefined) {
    const op = unaACaso(rotta.presente, r)(rotta.presente, rotta.prossimo);
    if (op.ok && op.progetto !== rotta.presente) saltato = op.progetto;
  }
  rotta = { ...rotta, presente: saltato };
  const visti = difformi(rotta, [...stati, saltato]);
  console.log(`annulla e ripeti, controllo positivo (un passo saltato): ${visti.length} difformità, la prima «${visti[0]}»`);
  expect(visti.length).toBeGreaterThan(0);
});

test("un'operazione rifiutata o senza effetto non è un passo; una modifica dopo «Annulla» toglie i passi da ripetere", () => {
  const c = inizia(riferimento);
  const rifiutata = applica(c, sposta("b9", { contenitore: "b12", ramo: "then", indice: 0 }));
  expect(rifiutata).toEqual({ ok: false, rifiuto: { motivo: "dentro_se_stesso" } });
  const ferma = applica(c, sposta("b6", { contenitore: "f1", ramo: "body", indice: 2 }));
  expect(ferma.ok && [ferma.cronologia.presente === c.presente, ferma.cronologia.passato.length]).toEqual([true, 0]);
  const uno = applica(c, elimina("b1"));
  if (!uno.ok) throw new Error("elimina");
  const indietro = annulla(uno.cronologia);
  expect(siRipete(indietro)).toBe(true);
  const altro = applica(indietro, elimina("b6"));
  expect(altro.ok && [altro.cronologia.passato.length, siRipete(altro.cronologia)]).toEqual([1, false]);
  // Senza passi, annulla e ripeti lasciano la cronologia com'è.
  expect(annulla(c)).toBe(c);
  expect(ripeti(c)).toBe(c);
});

test("un identificatore annullato non torna: il numero libero non va mai indietro", () => {
  const c = inizia(riferimento);
  expect(c.prossimo).toBe(25);
  const posto = { contenitore: "f1", ramo: "body" as const, indice: 0 };
  const primo = applica(c, inserisci(posto, "comment"));
  if (!primo.ok) throw new Error("inserisci");
  expect(trova(primo.cronologia.presente, "b25")).toBeDefined();
  const indietro = annulla(primo.cronologia);
  expect(trova(indietro.presente, "b25")).toBeUndefined();
  const secondo = applica(indietro, inserisci(posto, "comment"));
  if (!secondo.ok) throw new Error("inserisci");
  expect(trova(secondo.cronologia.presente, "b25")).toBeUndefined();
  expect(dove(secondo.cronologia.presente, "b26")).toEqual(posto);
  // Un blocco cancellato e ripristinato con «Annulla» ritrova il suo identificatore.
  const via = applica(c, elimina("b9"));
  if (!via.ok) throw new Error("elimina");
  expect(trova(annulla(via.cronologia).presente, "b9")).toEqual(trova(riferimento, "b9"));
});

test("i nomi di prima di un dato: si risale la cronologia anche oltre un dato aggiunto o tolto, e ci si ferma dove il dato nasce", () => {
  const passi = (operazioni: readonly Operazione[]) =>
    operazioni.reduce((c, op) => {
      const e = applica(c, op);
      if (!e.ok) throw new Error("passo rifiutato");
      return e.cronologia;
    }, inizia(riferimento));
  // «contati» (posizione 3) rinominato due volte, poi un dato aggiunto in fondo e il primo tolto: ora sta in posizione 2.
  const c = passi([rinominaDato(3, "conta ti"), rinominaDato(3, ""), aggiungiDato({ name: "k", type: "integer" }), eliminaDato(0)]);
  expect(c.presente.functions[0]!.data[2]!.name).toBe("");
  expect(nomiDiPrima(c, 2)).toEqual(["conta ti", "contati"]);
  // Il dato aggiunto nasce in un passo: nessun nome di prima; un dato mai rinominato nemmeno.
  expect(nomiDiPrima(c, 7)).toEqual([]);
  expect(nomiDiPrima(c, 0)).toEqual([]);
  expect(nomiDiPrima(inizia(riferimento), 3)).toEqual([]);
  expect(nomiDiPrima(c, 99)).toEqual([]);
  // Controllo positivo dello spostamento: la posizione 2 senza tener conto del dato tolto sarebbe stata «media».
  expect(c.passato.at(-1)!.functions[0]!.data[2]!.name).toBe("media");
});

test("i nomi di prima di un dato spostato su o giù, e oltre un dato duplicato sopra di lui", () => {
  const passi = (operazioni: readonly Operazione[]) =>
    operazioni.reduce((c, op) => {
      const e = applica(c, op);
      if (!e.ok) throw new Error("passo rifiutato");
      return e.cronologia;
    }, inizia(riferimento));
  // «contati» (posizione 3) rinominato, spostato su (in posizione 2) e poi, duplicato «voto» sopra, in posizione 3.
  const c = passi([rinominaDato(3, "conta ti"), spostaDato(3, -1), duplicaDato(1)]);
  expect(c.presente.functions[0]!.data.map((d) => d.name).slice(0, 5)).toEqual(["n", "voto", "voto_2", "conta ti", "media"]);
  expect(nomiDiPrima(c, 3)).toEqual(["contati"]);
  // «media», scavalcato dallo spostamento, non ha avuto altri nomi; la copia nasce col duplicato.
  expect(nomiDiPrima(c, 4)).toEqual([]);
  expect(nomiDiPrima(c, 2)).toEqual([]);
  // E giù: «voto» spostato sotto «media».
  const giu = passi([rinominaDato(1, "punti"), spostaDato(1, 1)]);
  expect(nomiDiPrima(giu, 2)).toEqual(["voto"]);
  expect(nomiDiPrima(giu, 1)).toEqual([]);
});

test(`i passi da annullare sono al più ${passiDaAnnullare}: oltre si dimentica il più vecchio`, () => {
  let c = inizia(riferimento);
  const stati = [c.presente];
  for (let i = 0; i < passiDaAnnullare + 5; i++) {
    const e = applica(c, inserisci({ contenitore: "f1", ramo: "body", indice: 0 }, "comment"));
    if (!e.ok) throw new Error("inserisci");
    c = e.cronologia;
    stati.push(c.presente);
  }
  expect(c.passato.length).toBe(passiDaAnnullare);
  let x = c;
  while (siAnnulla(x)) x = annulla(x);
  expect(x.presente).toBe(stati[5]!);
});
