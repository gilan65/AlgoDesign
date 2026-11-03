// La ripartenza sul corpus: senza modifiche, da ogni pausa si arriva allo stesso stato; con una riga aggiunta in testa alla funzione della pausa si ritrova
// il punto, e chi non parte lo dice. I conteggi sono confermati.
//
// Che cosa NON guarda: con più di 50 pause se ne guardano la prima, quella di mezzo e l'ultima; un programma con più di 5000 si guarda solo fin lì; le
// modifiche una per una, che sono in `ripartenza.test.ts`.

import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { confermato } from "../../strumenti/corpus";
import { vociDelCorpus } from "../../strumenti/registrazioni-del-corpus";
import { tetti } from "../controllo/controllo";
import { senzaValore } from "../interprete/interprete";
import type { CasoDiUnaFunzione, Funzione, Progetto } from "../progetto/modello";
import { Esecuzione } from "./esecuzione";
import { Ripartenza, type PuntoDellaPausa } from "./ripartenza";
import { puntoDi, senzaOrologio, statoDi, type Es } from "./ripartenza-di-prova";

const cartelleDelCorpus = readdirSync(join(import.meta.dir, "..", "..", "casi"), { withFileTypes: true }).filter((d) => d.isDirectory()).length;

const stessoStato = (a: Es, b: Es): boolean => Bun.deepEquals(statoDi(a), statoDi(b), true);

/** Oltre queste pause se ne guardano tre: ripartire da ognuna costerebbe la somma dei passaggi, per voce. Con 500 la prova durava 617 s, per 4104
 * ripartenze: misurato, con 50 tutte le pause di 215 voci su 251. */
const pauseOgniVolta = 50;
/** I programmi più lunghi (fino a 1,3 milioni di pause) si percorrono fin qui: oltre arrivano al tetto dei passi, e costano tempo e memoria
 * senza provare nulla di nuovo. Percorsi per intero, la prova arrivava a 5,3 GB in 110 s. */
const pauseAlPiu = 5000;

/** Le pause di una voce libera con «dentro»: ogni volta che arriva a una, `sulla` riceve l'esecuzione e il numero della pausa. */
function percorri(v: ReturnType<typeof vociDelCorpus>[number], sulla?: (es: Es, n: number) => void, tabella = false, finoA = Infinity): { readonly pause: number; readonly es: Es } {
  const es: Es = new Esecuzione<CasoDiUnaFunzione>(v.progetto, tetti, { tabella, ...(v.funzione ? { funzione: v.funzione } : {}) });
  const voci = v.caso?.inputs ?? [];
  let k = 0;
  let pause = 0;
  for (;;) {
    const s = es.stato;
    if (s.genere === "pausa") {
      sulla?.(es, pause);
      pause++;
      if (pause >= finoA) return { pause, es };
    }
    if (s.genere === "pronta" || s.genere === "pausa") es.comanda("dentro");
    else if (s.genere === "in corso") es.fetta(senzaOrologio, 0);
    else if (s.genere === "chiede") {
      const voce = voci[k++];
      if (voce === undefined || voce.data !== s.dato) return { pause, es };
      try {
        const testo = voce.text ?? senzaValore;
        es.inserisci(voce.each === true ? { ognuno: testo } : testo);
      } catch {
        return { pause, es };
      }
    } else return { pause, es };
  }
}

test("il corpus, senza modifiche: da ogni pausa si riparte e si arriva allo stesso stato", () => {
  const diverse: string[] = [];
  const conti = { cartelle: cartelleDelCorpus, voci: 0, conPause: 0, ripartenze: 0, voltePiuDiUna: 0 };
  for (const v of vociDelCorpus()) {
    conti.voci++;
    const quante = percorri(v, undefined, false, pauseAlPiu + 1).pause;
    if (quante === 0) continue;
    conti.conPause++;
    const scelte = quante <= pauseOgniVolta ? undefined : quante <= pauseAlPiu ? new Set([0, Math.floor(quante / 2), quante - 1]) : new Set([0, Math.floor(pauseAlPiu / 2), pauseAlPiu - 1]);
    percorri(
      v,
      (es, n) => {
        if (scelte !== undefined && !scelte.has(n)) return;
        conti.ripartenze++;
        const punto = puntoDi(es);
        if (punto.occorrenza > 1) conti.voltePiuDiUna++;
        const r = new Ripartenza<CasoDiUnaFunzione>(v.progetto, tetti, { ...(v.funzione ? { funzione: v.funzione } : {}) }, es.righeDate, punto);
        r.fetta(senzaOrologio, Infinity);
        const { esecuzione: nuova, esito } = r;
        if (esito?.ritrovato !== true || esito.righeAvanzate !== 0) diverse.push(`${v.id} pausa ${n}: ${JSON.stringify(esito)}`);
        else if (!stessoStato(nuova, es)) diverse.push(`${v.id} pausa ${n}: stato diverso`);
      },
      true,
      quante <= pauseAlPiu ? Infinity : pauseAlPiu,
    );
  }
  console.log(`ripartenza sul corpus: ${JSON.stringify(conti)}; diverse ${diverse.length}`);
  expect(diverse).toEqual([]);
  expect(Boolean(conti.ripartenze && conti.voltePiuDiUna)).toBe(true);
  expect(conti).toEqual(confermato("ripartenza - pause del corpus riprese", conti));
}, 120_000);

/** Una riga in testa alla funzione della pausa: una Scrittura, oppure un'assegnazione a un dato nuovo, che una funzione ammette. */
function conAggiunta(p: Progetto, funzione: string | undefined, genere: "scrittura" | "assegnazione"): Progetto {
  const trasforma = (f: Funzione): Funzione => {
    if (funzione === undefined ? f.kind !== "main" : f.id !== funzione) return f;
    const aggiunta = genere === "scrittura" ? { id: "zz1", kind: "write", values: ['"x"'], newline: false } : { id: "zz1", kind: "assignment", target: "zz_nuovo", value: "1" };
    return { ...f, data: genere === "scrittura" ? f.data : [...f.data, { name: "zz_nuovo", type: "integer", role: "work" }], body: [aggiunta, ...f.body] } as unknown as Funzione;
  };
  return { ...p, functions: p.functions.map(trasforma) };
}

test("il corpus, con una riga aggiunta in testa alla funzione della pausa: ritrovato, e chi non parte lo dice", () => {
  const conti = { cartelle: cartelleDelCorpus, pauseProvate: 0, scrittura: {} as Record<string, number>, assegnazione: {} as Record<string, number>, nonPartePerEffetto: 0, stessoNumeroDiAzione: 0 };
  const inattesi: string[] = [];
  const tieni = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);
  for (const v of vociDelCorpus()) {
    const quante = percorri(v, undefined, false, pauseAlPiu + 1).pause;
    if (quante === 0 || quante > pauseAlPiu) continue;
    const mezzo = Math.floor(quante / 2);
    let fine: { readonly punto: PuntoDellaPausa; readonly funzione: string | undefined; readonly righe: Es["righeDate"]; readonly passi: number } | undefined;
    percorri(v, (es, n) => {
      if (n !== mezzo) return;
      const s = es.stato;
      if (s.genere !== "pausa") return;
      fine = { punto: puntoDi(es), funzione: s.funzione, righe: es.righeDate, passi: es.passi };
    });
    if (fine === undefined) continue;
    conti.pauseProvate++;
    const { punto, funzione, righe, passi } = fine;
    const prova = (genere: "scrittura" | "assegnazione") => {
      const r = new Ripartenza<CasoDiUnaFunzione>(conAggiunta(v.progetto, funzione, genere), tetti, { tabella: false, ...(v.funzione ? { funzione: v.funzione } : {}) }, righe, punto);
      r.fetta(senzaOrologio, Infinity);
      return r;
    };
    const conScrittura = prova("scrittura");
    const motivoS = conScrittura.esito?.ritrovato ? "ritrovato" : (conScrittura.esito?.motivo ?? "nessuno");
    tieni(conti.scrittura, motivoS);
    if (conScrittura.esito?.ritrovato && conScrittura.esecuzione.passi === passi) conti.stessoNumeroDiAzione++;
    const st = conScrittura.esecuzione.stato;
    if (st.genere === "non parte" && !st.controllo.fuoriTappa && st.controllo.errori.some((e) => e.code === "function_with_effect")) conti.nonPartePerEffetto++;
    const conAssegnazione = prova("assegnazione");
    const motivoA = conAssegnazione.esito?.ritrovato ? "ritrovato" : (conAssegnazione.esito?.motivo ?? "nessuno");
    tieni(conti.assegnazione, motivoA);
    if (motivoA !== "ritrovato") inattesi.push(`${v.id}: ${motivoA}`);
  }
  console.log(`ripartenza, modifiche sul corpus: ${JSON.stringify(conti)}; inattesi ${JSON.stringify(inattesi)}`);
  expect(Boolean(conti.pauseProvate && conti.scrittura.ritrovato && conti.nonPartePerEffetto)).toBe(true);
  expect(conti).toEqual(confermato("ripartenza - modifiche sul corpus", conti));
}, 60_000);
