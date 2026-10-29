// I file attesi della costruzione dall'interfaccia (scritti a mano) contro i riferimenti del corpus:
// `riferimento-media-voti.algo` contro quello della tappa 1, `riferimento-media-voti-per.algo` contro quello della
// tappa 2 (coi cicli `per`), `riferimento-media-voti-funzioni.algo` contro quello della tappa 3 (le procedure e la
// funzione nascono quando servono: la mappa segue l'ordine in cui la costruzione crea blocchi e fini, e ogni numero da
// `b1` all'ultimo è usato una volta), `copia-di-un-record.algo` contro quello dei record (la fine del riferimento si
// chiama `fine`, e la mappa la nomina), `vettore-di-record.algo` contro quello delle tabelle (lo stesso).
//
// La mappa degli identificatori, dichiarata: un progetto nuovo ha la fine come `b1`; i blocchi creati dopo
// prendono `b2`, `b3`, … nell'ordine di creazione, che è l'ordine del flusso. Nella tappa 1 il blocco `bN` del
// riferimento è `b(N+1)` nell'atteso, per N da 1 a 23, e la fine `b24` è `b1`; nella tappa 2 il riferimento ha dei
// numeri saltati (b6, b15, b21: i blocchi che i cicli `per` hanno tolto), e la mappa è scritta per esteso. Oltre ai
// numeri l'atteso è il riferimento, metadati e caso d'uso compresi: l'interfaccia scrive anche il caso, e il caso non
// cita blocchi (se ne citasse, l'errore atteso avrebbe il numero del riferimento e non quello dei blocchi creati: la
// prova lo dice).
//
// CHE COSA NON GUARDA: che l'interfaccia scriva questi file (lo prova `costruzione.e2e.ts`).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eseguiCaso } from "../../core/casi/esecutore";
import { tetti } from "../../core/controllo/controllo";
import { apri, salva } from "../../core/progetto/formato";
import type { Blocco, Progetto } from "../../core/progetto/modello";

const leggi = (percorso: string): { testo: string; progetto: Progetto } => {
  const testo = readFileSync(fileURLToPath(new URL(percorso, import.meta.url)), "utf8");
  const esito = apri(testo);
  if (!esito.ok) throw new Error(`${percorso} non si apre: ${JSON.stringify(esito.errori)}`);
  return { testo, progetto: esito.progetto };
};

/** Ogni valore di un campo `id` di un blocco (non della funzione) passato dalla mappa. */
function rinumera(v: unknown, mappa: Record<string, string>): unknown {
  if (Array.isArray(v)) return v.map((x) => rinumera(x, mappa));
  if (v === null || typeof v !== "object") return v;
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "id" && typeof x === "string" && (x.startsWith("b") || x in mappa) ? (mappa[x] ?? `NON MAPPATO ${x}`) : rinumera(x, mappa)]));
}

/** Gli identificatori dei blocchi nell'ordine del flusso (ogni blocco, poi il suo contenuto), e la fine. */
function nellOrdine(p: Progetto): string[] {
  const visita = (b: Blocco): string[] => [b.id, ...(b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? (b.body as Blocco[]) : []).flatMap(visita)];
  const f = p.functions[0]!;
  return [...f.body.flatMap(visita), f.end.id];
}

const coppie = [
  {
    nome: "tappa 1",
    atteso: leggi("./riferimento-media-voti.algo"),
    riferimento: leggi("../../casi/tappa-1/riferimento-media-voti.algo"),
    mappa: { ...Object.fromEntries(Array.from({ length: 23 }, (_, i) => [`b${i + 1}`, `b${i + 2}`])), b24: "b1" } as Record<string, string>,
    blocchi: 23,
  },
  {
    nome: "tappa 2",
    atteso: leggi("./riferimento-media-voti-per.algo"),
    riferimento: leggi("../../casi/tappa-2/riferimento-media-voti-per.algo"),
    mappa: {
      b1: "b2", b2: "b3", b3: "b4", b4: "b5", b5: "b6", b7: "b7", b8: "b8", b9: "b9", b10: "b10", b11: "b11", b12: "b12", b13: "b13", b14: "b14",
      b16: "b15", b17: "b16", b18: "b17", b19: "b18", b20: "b19", b22: "b20", b23: "b21", b24: "b1",
    } as Record<string, string>,
    blocchi: 20,
  },
  {
    nome: "tappa 3",
    atteso: leggi("./riferimento-media-voti-funzioni.algo"),
    riferimento: leggi("../../casi/tappa-3/riferimento-media-voti-funzioni.algo"),
    // Il programma principale: il salto a `leggi_numero` (b2), la procedura nasce lì (la sua fine b3, i suoi blocchi b4–b8);
    // il `per` e la lettura (b9, b10); `valido` nasce prima del rombo che la chiama (la sua fine b11); il resto (b12–b21);
    // `stelle` nasce dal suo salto (b21: la fine b22, i blocchi b23–b26); il ramo Falso (b27).
    mappa: {
      b1: "b2", b2: "b9", b3: "b10", b4: "b12", b5: "b13", b6: "b14", b7: "b15", b8: "b16", b9: "b17", b10: "b18", b11: "b19", b12: "b20", b13: "b21", b14: "b27", b15: "b1",
      b16: "b4", b17: "b5", b18: "b6", b19: "b7", b20: "b8", b21: "b3",
      b22: "b11",
      b23: "b23", b24: "b24", b25: "b25", b26: "b26", b27: "b22",
    } as Record<string, string>,
    blocchi: 27,
  },
  {
    // Il record definito dal menu, i due dati record (uno col valore iniziale), la copia col nome e i campi letti e scritti.
    nome: "record",
    atteso: leggi("./copia-di-un-record.algo"),
    riferimento: leggi("../../casi/tipi/copia-di-un-record.algo"),
    mappa: { b1: "b2", b2: "b3", b3: "b4", b4: "b5", b5: "b6", fine: "b1" } as Record<string, string>,
    blocchi: 5,
  },
  {
    // La tabella con l'elenco per record e la costante comune col record ripetuto, il campo letto dalla console, il «per
    // ogni» sui record (il suo corpo nasce dopo di lui: b4–b6 diventano b5–b7).
    nome: "tabelle",
    atteso: leggi("./vettore-di-record.algo"),
    riferimento: leggi("../../casi/tipi/vettore-di-record.algo"),
    mappa: { b1: "b2", b2: "b3", b3: "b4", b4: "b5", b5: "b6", b6: "b7", b7: "b8", fine: "b1" } as Record<string, string>,
    blocchi: 7,
  },
];

for (const { nome, atteso, riferimento, mappa, blocchi } of coppie) {
  describe(`il file atteso della costruzione dall'interfaccia (${nome})`, () => {
    test("è nella forma che il salvataggio scrive: aperto e salvato resta identico byte per byte", () => {
      expect(salva(atteso.progetto)).toBe(atteso.testo);
    });

    test("è il riferimento a meno della mappa dichiarata degli identificatori, col suo caso d'uso che non cita blocchi", () => {
      const casi = riferimento.progetto.test_cases;
      expect(casi?.length).toBe(1);
      const { error, static_error, warnings } = casi![0]!.expected;
      expect({ error, static_error, warnings }).toEqual({ error: undefined, static_error: undefined, warnings: undefined });
      expect(rinumera(riferimento.progetto, mappa)).toEqual(atteso.progetto);
      expect(atteso.progetto.test_cases).toEqual(casi);
      // Controllo positivo: senza la mappa sono diversi.
      expect(riferimento.progetto).not.toEqual(atteso.progetto);
    });

    test("i numeri dei blocchi seguono l'ordine di creazione: la fine b1, poi b2, b3, …", () => {
      if (atteso.progetto.functions.length === 1) {
        // Una funzione sola: nell'ordine del flusso.
        const ordine = nellOrdine(atteso.progetto);
        expect(ordine).toEqual([...Array.from({ length: blocchi }, (_, i) => `b${i + 2}`), "b1"]);
        expect(ordine).toHaveLength(blocchi + 1);
      }
      // Ogni numero da b1 all'ultimo, una volta: i blocchi e le fini di ogni funzione.
      const visita = (b: Blocco): string[] => [b.id, ...(b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? (b.body as Blocco[]) : []).flatMap(visita)];
      const numeri = atteso.progetto.functions.flatMap((f) => [...f.body.flatMap(visita), f.end.id]).map((id) => Number(id.slice(1)));
      expect(numeri.sort((a, b) => a - b)).toEqual(Array.from({ length: Object.keys(mappa).length }, (_, i) => i + 1));
    });

    test("i suoi casi d'uso sono raggiunti, quello del programma e quelli di ogni procedura e funzione", () => {
      const casi = atteso.progetto.functions.flatMap((f) => (f.kind === "main" ? (atteso.progetto.test_cases ?? []) : (f.test_cases ?? [])).map((caso) => ({ caso, funzione: f.kind === "main" ? undefined : f.id })));
      expect(casi.length).toBe(nome === "tappa 3" ? 4 : 1);
      for (const { caso, funzione } of casi) {
        const esito = eseguiCaso(atteso.progetto, caso, tetti, funzione);
        expect(esito.fuoriTappa).toBe(false);
        if (esito.fuoriTappa) return;
        expect({ caso: caso.name, differenze: esito.differenze }).toEqual({ caso: caso.name, differenze: [] });
      }
    });
  });
}
