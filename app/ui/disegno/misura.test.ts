// La misura del testo e il suo controllo del carattere, con un canvas finto che imita quattro motori: quello che rilegge
// il carattere come l'ha ricevuto; il WebKit di Safari 16 (macOS 13), che applica il grassetto ma lo toglie da `font`
// quando lo rilegge (misurato: «bold 15px …» riletto «15px …», e la stessa frase larga 255,13 px normale e 271,00 in
// grassetto); uno che non conosce la famiglia e la ignora; uno che ignora il grassetto. I primi due devono misurare, gli
// altri due fermarsi col perché.
import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { misuraDelCanvas } from "./misura";

const FAMIGLIA = 'system-ui, -apple-system, "Segoe UI", sans-serif';

interface Motore {
  /** Che cosa restituisce `font` dopo che gli si è dato `impostato`. */
  legge: (impostato: string) => string;
  /** Il fattore della larghezza di un testo per il carattere in uso (quello che il motore applica davvero). */
  fattore: (impostato: string) => number;
}

const stileDi = (f: string) => (/^(bold|700) /.test(f) ? "grassetto" : f.startsWith("italic ") ? "corsivo" : "normale");
const fattoreVero = (f: string) => ({ normale: 1, grassetto: 271 / 255.13, corsivo: 255.86 / 255.13 })[stileDi(f)];

const motori: Record<string, Motore> = {
  fedele: { legge: (f) => f, fattore: fattoreVero },
  "Safari 16": { legge: (f) => f.replace(/^(bold|700) /, ""), fattore: fattoreVero },
  "famiglia ignorata": { legge: () => "10px sans-serif", fattore: () => 1 },
  "grassetto ignorato": { legge: (f) => f.replace(/^(bold|700) /, ""), fattore: (f) => (stileDi(f) === "grassetto" ? 1 : fattoreVero(f)) },
};

let creati = 0;
// Il canvas finto si toglie dopo ogni prova: tutti i file di `bun test` corrono nello stesso processo, e un
// `createElement` sostituito e lasciato lì passerebbe agli altri file (misurato: 250 prove rosse, la pila esaurita).
let spia: { mockRestore: () => void } | null = null;
function usa(motore: Motore): void {
  const originale = document.createElement.bind(document);
  spia = spyOn(document, "createElement").mockImplementation(((nome: string, opzioni?: ElementCreationOptions) => {
    if (nome !== "canvas") return originale(nome, opzioni);
    creati++;
    let impostato = "10px sans-serif";
    const contesto = {
      get font() {
        return motore.legge(impostato);
      },
      set font(f: string) {
        impostato = f;
      },
      measureText: (t: string) => ({ width: t.length * 7.5 * motore.fattore(impostato) }),
    };
    return { getContext: (tipo: string) => (tipo === "2d" ? contesto : null) } as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
}

beforeEach(() => {
  creati = 0;
  document.documentElement.style.setProperty("--carattere", FAMIGLIA);
});

afterEach(() => {
  spia?.mockRestore();
  spia = null;
  document.documentElement.style.removeProperty("--carattere");
});

test("dopo le prove col canvas finto, createElement è di nuovo quello di happy-dom", () => {
  usa(motori.fedele!);
  spia!.mockRestore();
  spia = null;
  const canvas = document.createElement("canvas");
  expect(canvas instanceof HTMLCanvasElement).toBe(true);
  expect(creati).toBe(0);
});

test("la famiglia del tema arriva al controllo (premessa delle prove sotto)", () => {
  expect(getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim()).toBe(FAMIGLIA);
});

for (const nome of ["fedele", "Safari 16"]) {
  test(`un motore ${nome}: il controllo passa e il grassetto misura più del normale`, () => {
    usa(motori[nome]!);
    const misura = misuraDelCanvas(15);
    expect(creati).toBe(3);
    expect(misura("somma ← 0", "grassetto")).toBeGreaterThan(misura("somma ← 0"));
    expect(misura("somma ← 0", "corsivo")).toBeGreaterThan(misura("somma ← 0"));
  });
}

test("un motore che ignora la famiglia: si ferma col carattere chiesto e quello riletto", () => {
  usa(motori["famiglia ignorata"]!);
  expect(() => misuraDelCanvas(15)).toThrow(`il canvas non accetta il carattere del tema «15px ${FAMIGLIA}» (ha «10px sans-serif»)`);
});

test("un motore che ignora il grassetto: si ferma, perché il grassetto si misurerebbe come il normale", () => {
  usa(motori["grassetto ignorato"]!);
  expect(() => misuraDelCanvas(15)).toThrow(`«bold 15px ${FAMIGLIA}»`);
});
