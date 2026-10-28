// Il controllore dei passi su sequenze di eventi scritte a mano, con profondità maggiore di zero: da ogni
// pausa, dove si ferma ciascun comando. Le sequenze imitano chiamate annidate (una funzione che ne chiama
// un'altra), che la tappa 1 non ha: il controllore guarda solo blocco e profondità.
//
// Un punto su un ciclo `per` o `per ogni`: le fasi degli eventi, scritte a mano.
//
// CHE COSA NON GUARDA: che l'interprete dia le profondità giuste a una chiamata (`interprete.test.ts`, le sequenze
// delle procedure e delle funzioni); il controllore dentro l'esecuzione vera (lo prova `esecuzione.test.ts`, sul
// riferimento e sulle chiamate su tre livelli del corpus).

import { describe, expect, test } from "bun:test";
import { fermati, fermatiSullaRipresa } from "./controllore";
import type { Comando } from "./esecuzione";

// m1 chiama f (f1, f2), che chiama g (g1); poi m2 chiama di nuovo f; poi la fine. Gli eventi si
// indicano con la loro posizione, dalla prima (zero).
const blocchi = ["m1", "f1", "g1", "g1", "f2", "m2", "f1", "g1", "f2", "fine"];
const profondita = [0, 1, 2, 2, 1, 0, 1, 2, 1, 0];
const eventi = blocchi.map((evento, k) => ({ evento, profondita: profondita[k]! }));

/** Da una pausa sull'evento `da` (o prima del primo, con `da` = -1), l'indice dove il comando si ferma; -1 se arriva alla fine. */
function dove(comando: Comando, da: number, punti: ReadonlySet<string> = new Set()): number {
  const partenza = da < 0 ? undefined : eventi[da]!.profondita;
  for (let k = da + 1; k < eventi.length; k++) if (fermati(comando, partenza, punti, eventi[k]!)) return k;
  return -1;
}

describe("da ogni pausa, dove si ferma ogni comando", () => {
  // Scritte a mano, una riga per comando: l'indice di arrivo partendo da -1, 0, 1, … 8.
  const attese: Record<Comando, number[]> = {
    // «dentro» si ferma sempre sull'evento seguente.
    dentro: eventi.map((_, k) => k),
    sopra: [0, 5, 4, 3, 4, 5, 9, 8, 8, 9],
    fuori: [-1, -1, 5, 4, 4, 5, -1, 9, 8, 9],
    continua: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  };
  for (const comando of Object.keys(attese) as Comando[]) {
    test(comando, () => {
      const ottenute = Array.from({ length: 10 }, (_, i) => dove(comando, i - 1));
      expect(ottenute).toEqual(attese[comando]);
    });
  }
});

describe("i punti di interruzione", () => {
  const punti = new Set(["g1", "fine"]);
  test("«continua» si ferma su ogni occorrenza, a ogni profondità", () => {
    const fermate: number[] = [];
    for (let k = dove("continua", -1, punti); k >= 0; k = dove("continua", k, punti)) fermate.push(k);
    expect(fermate).toEqual([2, 3, 7, 9]);
  });
  test("«sopra» e «fuori» si fermano anche su un punto più profondo", () => {
    expect([dove("sopra", 0, punti), dove("fuori", 1, punti), dove("sopra", 6, punti)]).toEqual([2, 2, 7]);
  });
  test("controllo positivo: senza punti gli stessi comandi saltano quei blocchi", () => {
    expect([dove("sopra", 0), dove("fuori", 1), dove("sopra", 6)]).toEqual([5, 5, 8]);
  });
});

test("il valore iniziale di un dato non ha un punto di interruzione: nemmeno un punto sull'id vuoto lo ferma; un passo sì", () => {
  const iniziale = { evento: "", dato: "n", profondita: 0 };
  const conIlVuoto = new Set(["", "n"]);
  expect((["continua", "fuori", "sopra", "dentro"] as const).map((c) => fermati(c, undefined, conIlVuoto, iniziale))).toEqual([false, false, true, true]);
  // Controllo positivo: lo stesso punto ferma un blocco con quell'id.
  expect(fermati("continua", undefined, conIlVuoto, { evento: "", profondita: 0 })).toBe(true);
});

test("un punto di interruzione su un ciclo ferma «continua» a ogni controllo: mai sulla partenza, sull'elemento preso né sull'aumento", () => {
  const punti = new Set(["b1"]);
  // Le fasi degli eventi di un `per` di due giri e di un `per ogni` di un elemento, nell'ordine; a mano dove «continua»
  // si ferma.
  const delPer = (["inizio", "condizione", "passo", "condizione", "passo", "condizione"] as const).map((fase) => fermati("continua", 0, punti, { evento: "b1", fase, profondita: 0 }));
  expect(delPer).toEqual([false, true, false, true, false, true]);
  const delPerOgni = (["inizio", "condizione", "elemento", "passo", "condizione"] as const).map((fase) => fermati("continua", 0, punti, { evento: "b1", fase, profondita: 0 }));
  expect(delPerOgni).toEqual([false, true, false, false, true]);
  // Controllo positivo: un passo si ferma anche sulla partenza, sull'elemento e sull'aumento; senza il punto «continua»
  // nessuna.
  expect((["inizio", "elemento", "passo"] as const).map((fase) => fermati("sopra", 0, punti, { evento: "b1", fase, profondita: 0 }))).toEqual([true, true, true]);
  expect(fermati("continua", 0, new Set(), { evento: "b1", fase: "condizione", profondita: 0 })).toBe(false);
});

// La ripresa dell'azione di chi chiama, dopo il ritorno da una funzione chiamata nella sua espressione: `m1` chiama `f` (f1,
// la fine ff) e poi `g` (g1, la fine gf) nella stessa espressione; dopo ogni ritorno `m1` riprende (R) al livello 0; poi
// `m2` e la fine. Le riprese portano il blocco che riprende, `m1`.
describe("la ripresa dopo un ritorno: una fermata per «dentro», «sopra» e «fuori», mai per «continua» né per un punto", () => {
  const sequenza = [
    { evento: "m1", profondita: 0 },
    { evento: "f1", profondita: 1 },
    { evento: "ff", profondita: 1 },
    { evento: "m1", profondita: 0, ripresa: true },
    { evento: "g1", profondita: 1 },
    { evento: "gf", profondita: 1 },
    { evento: "m1", profondita: 0, ripresa: true },
    { evento: "m2", profondita: 0 },
    { evento: "fine", profondita: 0 },
  ];
  const conLaRipresa = (comando: Comando, da: number, punti: ReadonlySet<string> = new Set()): number => {
    const partenza = da < 0 ? undefined : sequenza[da]!.profondita;
    for (let k = da + 1; k < sequenza.length; k++) {
      const e = sequenza[k]!;
      if (e.ripresa ? fermatiSullaRipresa(comando, partenza, e.profondita) : fermati(comando, partenza, punti, e)) return k;
    }
    return -1;
  };
  // Scritte a mano dalla regola: l'indice di arrivo partendo da -1, 0, 1, … 7.
  const attese: Record<Comando, number[]> = {
    // «dentro» si ferma sempre sull'evento seguente, anche sulle riprese.
    dentro: sequenza.map((_, k) => k),
    sopra: [0, 3, 2, 3, 6, 5, 6, 7, 8],
    fuori: [-1, -1, 3, 3, -1, 6, 6, -1, -1],
    continua: [-1, -1, -1, -1, -1, -1, -1, -1, -1],
  };
  for (const comando of Object.keys(attese) as Comando[])
    test(comando, () => {
      expect(Array.from({ length: 9 }, (_, i) => conLaRipresa(comando, i - 1))).toEqual(attese[comando]);
    });
  test("un punto sul blocco che riprende ferma l'azione, non la sua ripresa", () => {
    const punti = new Set(["m1"]);
    expect([conLaRipresa("continua", -1, punti), conLaRipresa("continua", 0, punti), conLaRipresa("fuori", 1, punti)]).toEqual([0, -1, 3]);
  });
});

describe("un punto di interruzione sulla copia di un record col suo nome", () => {
  // `b ← a` con tre campi (le azioni 1, 2, 3 col campo 0, 1, 2), poi `b2`: atteso scritto a mano, il punto su `b1` ferma
  // «continua» solo sul primo campo, mai sugli altri; «dentro» su ognuno.
  const copia = [
    { evento: "b0", profondita: 0 },
    ...[0, 1, 2].map((campo) => ({ evento: "b1", campo, profondita: 0 })),
    { evento: "b2", profondita: 0 },
  ];
  const fermate = (comando: Comando) => copia.flatMap((e, k) => (fermati(comando, 0, new Set(["b1"]), e) ? [k] : []));
  test("«continua» si ferma prima del primo campo; «dentro» su ogni campo", () => {
    expect({ continua: fermate("continua"), dentro: fermate("dentro") }).toEqual({ continua: [1], dentro: [0, 1, 2, 3, 4] });
  });
});
