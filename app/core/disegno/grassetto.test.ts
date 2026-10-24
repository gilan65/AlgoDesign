// Il grassetto ai nomi delle procedure e delle funzioni del progetto dentro le espressioni (`grassettoAlleFunzioni`).
//
// - Per forme, scritte a mano: due chiamate, una dentro l'altra, lo spazio prima della parentesi, un nome che comincia
//   come una funzione, un letterale che contiene una chiamata, il nome senza parentesi, una parte che non è
//   un'espressione o che ha già uno stile, un'espressione che non si legge.
// - Su espressioni GENERATE a seme fisso che si leggono (numeri, nomi, letterali, indici, operatori, parentesi, chiamate
//   annidate con da zero a tre argomenti): il generatore sa dove ha scritto il nome di ogni chiamata, e l'oracolo è
//   quello. Ogni nome di una funzione del progetto seguito dalla parentesi è in grassetto, e nient'altro; il testo unito
//   non cambia. Le premesse (quante chiamate, annidate, due in un'espressione, coi prefissi, nei letterali) si
//   stampano e si asseriscono.
// - Controllo positivo: un rilevatore sbagliato apposta (un'espressione regolare che riconosce i nomi per prefisso e non
//   salta i letterali) fa rosso sullo stesso oracolo.
//
// Che cosa NON guarda: la misura del testo in grassetto e il disegno (`impaginazione.test.ts`, `e2e/disegno.e2e.ts`);
// le espressioni che non si leggono (restano com'erano: una forma sola, qui sotto).

import { expect, test } from "bun:test";
import { grassettoAlleFunzioni, type ParteDelTesto } from "./impaginazione";

const nomi = new Set(["valido", "f", "g"]);
/** Le parti di un'espressione sola, coi tratti in grassetto: `[testo, grassetto?]`. */
const forme = (testo: string, insieme: ReadonlySet<string> = nomi) => grassettoAlleFunzioni([{ testo, espressione: true }], insieme).map((p) => (p.stile === "grassetto" ? `**${p.testo}**` : p.testo)).join("");

test("per forme: due chiamate, annidate, lo spazio, i prefissi, i letterali, senza parentesi, le altre parti", () => {
  expect([
    forme("f(1) + g(2)"),
    forme("f(g(x)) * 2"),
    forme("f (x)"),
    forme("valido_x(1) and valido(2)"),
    forme('"valido(x)" + valido(y)'),
    forme("valido + 1"),
    forme("v[f(1)]"),
    forme("h(1)"),
  ]).toEqual(["**f**(1) + **g**(2)", "**f**(**g**(x)) * 2", "**f** (x)", "valido_x(1) and **valido**(2)", '"valido(x)" + **valido**(y)', "valido + 1", "v[**f**(1)]", "h(1)"]);
  // Una parte che non è un'espressione, o che ha già uno stile, resta com'è; senza nomi, niente grassetto.
  const altre: ParteDelTesto[] = [
    { testo: "f(1)", espressione: false },
    { testo: "f(1)", espressione: true, stile: "corsivo" },
  ];
  expect(grassettoAlleFunzioni(altre, nomi)).toEqual(altre);
  expect(forme("f(1)", new Set())).toBe("f(1)");
  // Un'espressione che non si legge resta intera.
  expect(grassettoAlleFunzioni([{ testo: 'f(1) + "', espressione: true }], nomi)).toEqual([{ testo: 'f(1) + "', espressione: true }]);
});

/** Generatore a seme fisso (mulberry32). */
function casuale(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Generata {
  readonly testo: string;
  /** Dove cominciano i nomi in grassetto attesi (in caratteri: il generatore scrive solo ASCII). */
  readonly grassetti: readonly { readonly da: number; readonly a: number }[];
  readonly premesse: { chiamate: number; annidate: number; prefissi: number; letterali: number; senzaParentesi: number; spazi: number };
}

/** Un'espressione che si legge, col posto di ogni nome di una funzione del progetto chiamata. */
function generata(r: () => number): Generata {
  const intero = (n: number) => Math.floor(r() * n);
  const scegli = <T>(xs: readonly T[]) => xs[intero(xs.length)]!;
  let testo = "";
  const grassetti: { da: number; a: number }[] = [];
  const premesse = { chiamate: 0, annidate: 0, prefissi: 0, letterali: 0, senzaParentesi: 0, spazi: 0 };
  const scrivi = (t: string) => {
    testo += t;
  };
  const espressione = (profondita: number, dentroUnaChiamata: boolean): void => {
    const genere = profondita >= 4 ? intero(3) : intero(8);
    switch (genere) {
      case 0:
        return scrivi(String(intero(1000)));
      case 1: {
        // Un nome: anche quello di una funzione senza parentesi, o uno che comincia come lei.
        const n = scegli(["x", "voto", "valido", "f", "valido_x", "gg", "fx"]);
        if (nomi.has(n)) premesse.senzaParentesi++;
        return scrivi(n);
      }
      case 2: {
        // Un letterale, a volte con una chiamata scritta dentro.
        const t = scegli(['"a"', '"valido(x)"', '"f(1) + g(2)"', '""']);
        if (t.includes("(")) premesse.letterali++;
        return scrivi(t);
      }
      case 3:
      case 4: {
        // Una chiamata: a una funzione del progetto, o a un nome che non lo è (anche per prefisso).
        const n = scegli(["valido", "f", "g", "valido_x", "fg", "h"]);
        const da = testo.length;
        scrivi(n);
        if (nomi.has(n)) {
          grassetti.push({ da, a: da + n.length });
          premesse.chiamate++;
          if (dentroUnaChiamata) premesse.annidate++;
        } else if ([...nomi].some((x) => n.startsWith(x))) premesse.prefissi++;
        if (r() < 0.15) {
          scrivi(" ");
          premesse.spazi++;
        }
        scrivi("(");
        const argomenti = intero(4);
        for (let i = 0; i < argomenti; i++) {
          if (i > 0) scrivi(", ");
          espressione(profondita + 1, true);
        }
        return scrivi(")");
      }
      case 5:
        espressione(profondita + 1, dentroUnaChiamata);
        scrivi(` ${scegli(["+", "-", "*", "and", "or", "<", "==", "mod"])} `);
        return espressione(profondita + 1, dentroUnaChiamata);
      case 6:
        scrivi("(");
        espressione(profondita + 1, dentroUnaChiamata);
        return scrivi(")");
      default:
        scrivi("v[");
        espressione(profondita + 1, dentroUnaChiamata);
        return scrivi("]");
    }
  };
  espressione(0, false);
  return { testo, grassetti, premesse };
}

type Grassetto = (parti: readonly ParteDelTesto[], nomi: ReadonlySet<string>) => ParteDelTesto[];

/** Le espressioni generate passate da `grassetto`, contro l'oracolo del generatore. */
function difettiDi(grassetto: Grassetto, quante: number): { difetti: string[]; premesse: Generata["premesse"] & { espressioni: number; conDueChiamate: number } } {
  const r = casuale(4242);
  const difetti: string[] = [];
  const premesse = { espressioni: 0, conDueChiamate: 0, chiamate: 0, annidate: 0, prefissi: 0, letterali: 0, senzaParentesi: 0, spazi: 0 };
  for (let i = 0; i < quante; i++) {
    const g = generata(r);
    premesse.espressioni++;
    if (g.grassetti.length >= 2) premesse.conDueChiamate++;
    for (const k of Object.keys(g.premesse) as (keyof Generata["premesse"])[]) premesse[k] += g.premesse[k];
    const parti = grassetto([{ testo: g.testo, espressione: true }], nomi);
    const unito = parti.map((p) => p.testo).join("");
    if (unito !== g.testo) difetti.push(`«${g.testo}»: il testo unito è «${unito}»`);
    const visti: string[] = [];
    let k = 0;
    for (const p of parti) {
      if (p.stile === "grassetto") visti.push(`${k}-${k + p.testo.length}`);
      k += p.testo.length;
    }
    const attesi = g.grassetti.map((x) => `${x.da}-${x.a}`);
    if (JSON.stringify(visti) !== JSON.stringify(attesi)) difetti.push(`«${g.testo}»: grassetto su ${visti.join(" ") || "niente"}, atteso su ${attesi.join(" ") || "niente"}`);
  }
  return { difetti, premesse };
}

test("su 3000 espressioni generate che si leggono: in grassetto ogni nome di una funzione chiamata, e nient'altro", () => {
  const { difetti, premesse } = difettiDi(grassettoAlleFunzioni, 3000);
  console.log(`grassetto nelle espressioni: ${JSON.stringify(premesse)}, difetti ${difetti.length}`);
  expect(difetti.slice(0, 10)).toEqual([]);
  // Le premesse: ogni forma della lacuna c'è, molte volte.
  for (const [k, n] of Object.entries(premesse)) expect({ [k]: n > 50 }).toEqual({ [k]: true });

  // Controllo positivo: i nomi per prefisso e i letterali non saltati fanno rosso.
  const perPrefisso: Grassetto = (parti, insieme) =>
    parti.flatMap((p) => {
      const fuori: ParteDelTesto[] = [];
      let k = 0;
      for (const m of p.testo.matchAll(/([A-Za-z_]\w*)\s*\(/g)) {
        const nome = [...insieme].find((n) => m[1]!.startsWith(n));
        if (nome === undefined) continue;
        if (m.index > k) fuori.push({ testo: p.testo.slice(k, m.index), espressione: true });
        fuori.push({ testo: nome, espressione: true, stile: "grassetto" });
        k = m.index + nome.length;
      }
      if (k < p.testo.length) fuori.push({ testo: p.testo.slice(k), espressione: true });
      return fuori;
    });
  const rotto = difettiDi(perPrefisso, 3000);
  console.log(`grassetto nelle espressioni, controllo positivo (per prefisso, letterali compresi): difetti ${rotto.difetti.length}`);
  expect(rotto.difetti.length).toBeGreaterThan(100);
});
