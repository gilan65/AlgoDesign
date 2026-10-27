// Il flowchart in SVG scritto dal nucleo (`svg.ts`), la tavolozza nei tre modi (`tavolozza.ts`) e le regole dei segni
// dell'esecuzione (`segni.ts`), con attesi SCRITTI A MANO prima del codice: un disegno fatto a mano con ogni genere di
// elemento (inizio, assegnazione, condizione con Vero e Falso, chiamata coi lati e i pezzi con lo stile, commento, fine, un
// riquadro con la didascalia, una linea del flusso e una nota, un'unione, un punto di inserimento che NON si disegna) e il
// suo SVG riga per riga; un secondo disegno a mano per i segni (le parti di un ciclo, due valori iniziali con l'`id`
// vuoto, una Lettura con la domanda).
//
// CHE COSA NON GUARDA:
// - che l'SVG sia uguale alla tela della finestra: lo prova `e2e/flowchart-in-svg.e2e.ts` nel motore, coi colori calcolati;
// - un disegno fatto dall'impaginazione: qui i numeri sono scritti a mano (il disegnatore li copia senza conti);
// - come l'SVG si vede in altri programmi.

import { describe, expect, test } from "bun:test";
import type { Disegno, Elemento } from "./impaginazione";
import { segniDelDisegno } from "./segni";
import { svgDelDisegno } from "./svg";
import { tavolozzaNelModo, type Tavolozza } from "./tavolozza";
import { geometriaPredefinita } from "./tema";

// ------------------------------------------------------------------------------------- il disegno a mano

const rettangolo = (x: number, y: number, l: number, a: number) => ({ x, y, larghezza: l, altezza: a });
const vertici = (x: number, y: number, l: number, a: number) => [
  { x, y },
  { x: x + l, y },
  { x: x + l, y: y + a },
  { x, y: y + a },
];

const intestazione: Elemento = { id: "p1", forma: "intestazione", riquadro: rettangolo(25, 131, 70, 18), vertici: vertici(25, 131, 70, 18), testo: "copia", righe: ["copia"], riquadroTesto: rettangolo(30, 130.5, 60, 19) };
const aMano: Disegno = {
  larghezza: 200,
  altezza: 300,
  elementi: [
    { id: "f", forma: "inizio", riquadro: rettangolo(60, 20, 80, 30), vertici: vertici(75, 20, 50, 30), testo: "Inizio", righe: ["Inizio"], riquadroTesto: rettangolo(78, 25.5, 44, 19) },
    { id: "b1", forma: "assegnazione", riquadro: rettangolo(50, 86, 100, 29), vertici: vertici(50, 86, 100, 29), testo: "a ← 1", righe: ["a ← 1"], riquadroTesto: rettangolo(62, 91, 76, 19) },
    { id: "k1", forma: "commento", riquadro: rettangolo(160, 86, 30, 29), vertici: vertici(160, 86, 30, 29), testo: "nota", righe: ["nota"], riquadroTesto: rettangolo(165, 91, 20, 19) },
    {
      id: "c1",
      forma: "condizione",
      riquadro: rettangolo(40, 150, 120, 58),
      vertici: [
        { x: 100, y: 150 },
        { x: 160, y: 179 },
        { x: 100, y: 208 },
        { x: 40, y: 179 },
      ],
      testo: 'a < 2 & b = "x"',
      righe: ['a < 2 & b = "x"'],
      riquadroTesto: rettangolo(62, 169.5, 76, 19),
    },
    {
      id: "b2",
      forma: "chiamata",
      riquadro: rettangolo(30, 240, 140, 29),
      vertici: vertici(30, 240, 140, 29),
      testo: "↪ f(rif x)",
      righe: ["↪ f(rif x)"],
      pezzi: [
        [
          { testo: "↪ ", espressione: false },
          { testo: "f", espressione: false, stile: "grassetto" },
          { testo: "(", espressione: false },
          { testo: "rif", espressione: false, stile: "corsivo" },
          { testo: " x)", espressione: false },
        ],
      ],
      lati: [
        [
          { x: 38, y: 240 },
          { x: 38, y: 269 },
        ],
        [
          { x: 162, y: 240 },
          { x: 162, y: 269 },
        ],
      ],
      riquadroTesto: rettangolo(50, 245, 100, 19),
    },
    { id: "e", forma: "fine", riquadro: rettangolo(70, 276, 60, 20), vertici: vertici(80, 276, 40, 20), testo: "Fine", righe: ["Fine"], riquadroTesto: rettangolo(84, 276.5, 32, 19) },
  ],
  connettori: [
    {
      genere: "flusso",
      punti: [
        { x: 100, y: 50 },
        { x: 100, y: 86 },
      ],
    },
    {
      genere: "nota",
      punti: [
        { x: 150, y: 100 },
        { x: 160, y: 100 },
      ],
    },
  ],
  etichette: [
    { blocco: "c1", valore: "vero", testo: "Vero", riquadro: rettangolo(166, 170, 30, 18) },
    { blocco: "c1", valore: "falso", testo: "Falso", riquadro: rettangolo(4, 170, 30, 18) },
  ],
  ricongiungimenti: [{ centro: { x: 100, y: 225 }, raggio: 5 }],
  punti: [{ x: 100, y: 68, posto: { contenitore: "f", ramo: "body", indice: 0 } }],
  riquadri: [{ blocco: "p1", bordo: rettangolo(20, 140, 160, 90), didascalia: intestazione }],
};

/** Una tavolozza coi colori tutti diversi: un colore al posto sbagliato si vede. */
const tavolozza: Tavolozza = {
  sfondo: "#fefefe",
  testo: "#111111",
  bordo: "#333333",
  linea: "#555555",
  riquadro: "#777777",
  vero: "#006600",
  falso: "#990000",
  forme: { inizioEFine: "#aaaaaa", assegnazione: "#bb00bb", procedura: "#cc9966", lettura: "#00cc00", scrittura: "#0000ff", se: "#ff8800", cicli: "#ff4400", commento: "#eeeeee" },
  corrente: "#ffff00",
  bordoCorrente: "#dd7700",
  testoCorrente: "#000001",
  punto: "#ff0000",
};
const carattere = 'system-ui, "Segoe UI", sans-serif';
const opzioni = { geometria: geometriaPredefinita, tavolozza, carattere };

/** Le righe di un testo centrato: ogni riga è un `tspan` con la sua posizione, centrato nei due versi. */
const centrato = 'text-anchor="middle" dominant-baseline="central"';
const testo = (colore: string, ...righe: string[]) => `<text data-testo="" fill="${colore}" ${centrato}>${righe.join("")}</text>`;
const riga = (x: number, y: number, contenuto: string) => `<tspan x="${x}" y="${y}" ${centrato}>${contenuto}</tspan>`;

// L'SVG atteso, scritto a mano dai numeri qui sopra.
const atteso = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300" font-family="system-ui, &quot;Segoe UI&quot;, sans-serif" font-size="15" font-weight="normal">`,
  `<defs><marker id="disegno-punta" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555555"/></marker></defs>`,
  `<rect data-fondo="" x="0" y="0" width="200" height="300" fill="#fefefe"/>`,
  `<rect data-riquadro="p1" x="20" y="140" width="160" height="90" fill="none" stroke="#777777" stroke-width="1.25" stroke-dasharray="6 4"/>`,
  `<polyline data-connettore="flusso" points="100,50 100,86" fill="none" stroke="#555555" stroke-width="1.5" marker-end="url(#disegno-punta)"/>`,
  `<polyline data-connettore="nota" points="150,100 160,100" fill="none" stroke="#555555" stroke-width="1.5" stroke-dasharray="3 3"/>`,
  `<g data-forma="intestazione" data-didascalia="p1">`,
  `<polygon points="25,131 95,131 95,149 25,149" fill="#fefefe" stroke="none"/>`,
  testo("#111111", riga(60, 140, "copia")),
  `</g>`,
  `<g data-forma="inizio" data-id="f">`,
  `<rect x="60" y="20" width="80" height="30" rx="15" ry="15" fill="#aaaaaa" stroke="#333333" stroke-width="1.5"/>`,
  testo("#111111", riga(100, 35, "Inizio")),
  `</g>`,
  `<g data-forma="assegnazione" data-id="b1">`,
  `<polygon points="50,86 150,86 150,115 50,115" fill="#bb00bb" stroke="#333333" stroke-width="1.5"/>`,
  testo("#111111", riga(100, 100.5, "a ← 1")),
  `</g>`,
  `<g data-forma="commento" data-id="k1">`,
  `<polygon points="160,86 190,86 190,115 160,115" fill="#eeeeee" stroke="#333333" stroke-width="1.5" stroke-dasharray="4 3"/>`,
  testo("#111111", riga(175, 100.5, "nota")),
  `</g>`,
  `<g data-forma="condizione" data-id="c1">`,
  `<polygon points="100,150 160,179 100,208 40,179" fill="#ff8800" stroke="#333333" stroke-width="1.5"/>`,
  testo("#111111", riga(100, 179, "a &lt; 2 &amp; b = &quot;x&quot;")),
  `</g>`,
  `<g data-forma="chiamata" data-id="b2">`,
  `<polygon points="30,240 170,240 170,269 30,269" fill="#cc9966" stroke="#333333" stroke-width="1.5"/>`,
  testo(
    "#111111",
    riga(
      100,
      254.5,
      `<tspan ${centrato}>↪ </tspan><tspan data-stile="grassetto" font-weight="700" ${centrato}>f</tspan><tspan ${centrato}>(</tspan><tspan data-stile="corsivo" font-style="italic" ${centrato}>rif</tspan><tspan ${centrato}> x)</tspan>`,
    ),
  ),
  `<line data-lato="" x1="38" y1="240" x2="38" y2="269" stroke="#333333" stroke-width="1.5"/>`,
  `<line data-lato="" x1="162" y1="240" x2="162" y2="269" stroke="#333333" stroke-width="1.5"/>`,
  `</g>`,
  `<g data-forma="fine" data-id="e">`,
  `<rect x="70" y="276" width="60" height="20" rx="10" ry="10" fill="#aaaaaa" stroke="#333333" stroke-width="1.5"/>`,
  testo("#111111", riga(100, 286, "Fine")),
  `</g>`,
  `<text data-etichetta="vero" x="166" y="179" fill="#006600" dominant-baseline="central">Vero</text>`,
  `<text data-etichetta="falso" x="4" y="179" fill="#990000" dominant-baseline="central">Falso</text>`,
  `<circle data-unione="" cx="100" cy="225" r="5" fill="#fefefe" stroke="#555555" stroke-width="1.6"/>`,
  `</svg>`,
  ``,
].join("\n");

describe("il disegno in SVG, contro l'atteso scritto a mano", () => {
  test("a colori: ogni elemento coi suoi numeri e coi colori della tavolozza; il punto di inserimento non si disegna", () => {
    expect(svgDelDisegno(aMano, opzioni)).toBe(atteso);
  });

  test("in bianco e nero: lo stesso SVG coi riempimenti bianchi e tutto il resto nero (sostituzioni scritte a mano)", () => {
    const aBiancoENero: [string, string][] = [
      ["#fefefe", "#ffffff"],
      ["#111111", "#000000"],
      ["#333333", "#000000"],
      ["#555555", "#000000"],
      ["#777777", "#000000"],
      ["#006600", "#000000"],
      ["#990000", "#000000"],
      ["#aaaaaa", "#ffffff"],
      ["#bb00bb", "#ffffff"],
      ["#cc9966", "#ffffff"],
      ["#ff8800", "#ffffff"],
      ["#eeeeee", "#ffffff"],
    ];
    const attesoBN = aBiancoENero.reduce((s, [da, a]) => s.replaceAll(da, a), atteso);
    const ottenuto = svgDelDisegno(aMano, { ...opzioni, modo: "bianco-e-nero" });
    expect(ottenuto).toBe(attesoBN);
    const colori = new Set(ottenuto.match(/#[0-9a-f]{6}/g));
    expect([...colori].sort()).toEqual(["#000000", "#ffffff"]);
  });

  test("a toni di grigio: lo stesso SVG coi colori della tavolozza nel modo, ognuno grigio", () => {
    const grigi = tavolozzaNelModo(tavolozza, "grigi");
    const ottenuto = svgDelDisegno(aMano, { ...opzioni, modo: "grigi" });
    expect(ottenuto).toBe(svgDelDisegno(aMano, { ...opzioni, tavolozza: grigi }));
    for (const c of new Set(ottenuto.match(/#[0-9a-f]{6}/g))) expect({ c, grigio: c.slice(1, 3) === c.slice(3, 5) && c.slice(3, 5) === c.slice(5, 7) }).toEqual({ c, grigio: true });
  });

  test("il fondo dei cicli: un velo del colore del riquadro al 5%, solo sul riquadro più esterno; mai in bianco e nero", () => {
    const dentro = { blocco: "p2", bordo: rettangolo(30, 150, 100, 50) };
    const conDue = { ...aMano, riquadri: [...aMano.riquadri, dentro] };
    const svg = svgDelDisegno(conDue, { ...opzioni, fondoDeiCicli: true });
    expect(svg).toContain(`<rect data-riquadro="p1" x="20" y="140" width="160" height="90" fill="#777777" fill-opacity="0.05" stroke="#777777" stroke-width="1.25" stroke-dasharray="6 4"/>`);
    expect(svg).toContain(`<rect data-riquadro="p2" x="30" y="150" width="100" height="50" fill="none" stroke="#777777" stroke-width="1.25" stroke-dasharray="6 4"/>`);
    expect(svgDelDisegno(conDue, { ...opzioni, fondoDeiCicli: true, modo: "bianco-e-nero" })).not.toContain("fill-opacity");
  });

  test("il carattere e l'identificatore della punta li dà chi chiama", () => {
    const svg = svgDelDisegno(aMano, { ...opzioni, carattere: "Arial", id: "foglio-3" });
    expect(svg).toContain(`font-family="Arial"`);
    expect(svg).toContain(`<marker id="foglio-3-punta"`);
    expect(svg).toContain(`marker-end="url(#foglio-3-punta)"`);
  });
});

describe("la tavolozza nei tre modi", () => {
  test("a toni di grigio: il grigio della stessa luminanza relativa (valori calcolati a mano: rosso #7f7f7f, verde #dcdcdc)", () => {
    const di = (colore: string) => tavolozzaNelModo({ ...tavolozza, testo: colore }, "grigi").testo;
    expect(di("#ff0000")).toBe("#7f7f7f");
    expect(di("#00ff00")).toBe("#dcdcdc");
    expect(di("#ffffff")).toBe("#ffffff");
    expect(di("#000000")).toBe("#000000");
    expect(di("#FFF")).toBe("#ffffff");
  });

  test("a toni di grigio il contrasto non cambia: ogni colore della tavolozza ha la luminanza di prima (entro l'arrotondamento a 8 bit)", () => {
    const lineare = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminanza = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => lineare(parseInt(h.slice(i, i + 2), 16) / 255));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const colori = (t: Tavolozza) => [t.sfondo, t.testo, t.bordo, t.linea, t.riquadro, t.vero, t.falso, ...Object.values(t.forme), t.corrente, t.bordoCorrente, t.testoCorrente, t.punto];
    const prima = colori(tavolozza);
    const dopo = colori(tavolozzaNelModo(tavolozza, "grigi"));
    // 7 colori del disegno, 8 delle forme, 4 dell'esecuzione.
    expect(dopo.length).toBe(19);
    dopo.forEach((g, i) => expect(Math.abs(luminanza(g) - luminanza(prima[i]!))).toBeLessThan(0.005));
  });

  test("in bianco e nero: i riempimenti (sfondo, forme, blocco corrente) bianchi, tutto il resto nero", () => {
    const t = tavolozzaNelModo(tavolozza, "bianco-e-nero");
    expect([t.sfondo, ...Object.values(t.forme), t.corrente]).toEqual(Array(10).fill("#ffffff"));
    expect([t.testo, t.bordo, t.linea, t.riquadro, t.vero, t.falso, t.bordoCorrente, t.testoCorrente, t.punto]).toEqual(Array(9).fill("#000000"));
  });

  test("a colori la tavolozza resta quella data; un colore che non è un esadecimale è un errore", () => {
    expect(tavolozzaNelModo(tavolozza, "colori")).toEqual(tavolozza);
    expect(() => tavolozzaNelModo({ ...tavolozza, testo: "rgb(1, 2, 3)" }, "grigi")).toThrow();
  });
});

// ------------------------------------------------------------------------------------- i segni dell'esecuzione

const assegnazione = (id: string, y: number, extra: Partial<Elemento> = {}): Elemento => ({
  id,
  forma: "assegnazione",
  riquadro: rettangolo(50, y, 100, 29),
  vertici: vertici(50, y, 100, 29),
  testo: id,
  righe: [id],
  riquadroTesto: rettangolo(62, y + 5, 76, 19),
  ...extra,
});
const conSegni: Disegno = {
  larghezza: 200,
  altezza: 400,
  elementi: [
    assegnazione("", 20, { dato: "n", testo: "n ← 0", righe: ["n ← 0"] }),
    assegnazione("", 70, { dato: "m", testo: "m ← 0", righe: ["m ← 0"] }),
    { ...assegnazione("p1", 120), forma: "intestazione" },
    { ...assegnazione("p1", 160, { fase: "condizione", ciclo: true }), forma: "condizione" },
    assegnazione("b1", 200),
    {
      id: "L1",
      scrittura: "s1",
      forma: "lettura",
      riquadro: rettangolo(30, 290, 140, 48),
      vertici: vertici(30, 290, 140, 48),
      testo: "Quanti? leggi n",
      righe: ["Quanti?", "leggi n"],
      riquadroTesto: rettangolo(50, 300, 100, 38),
    },
  ],
  connettori: [],
  etichette: [],
  ricongiungimenti: [],
  punti: [],
  riquadri: [],
};
const [valoreN, valoreM, intestazioneP, faseP, b1, lettura] = conSegni.elementi as [Elemento, Elemento, Elemento, Elemento, Elemento, Elemento];
/** Gli elementi con quel segno, coi loro nomi scritti a mano. */
const nomi = new Map<Elemento, string>([
  [valoreN, "valore n"],
  [valoreM, "valore m"],
  [intestazioneP, "intestazione p1"],
  [faseP, "p1 condizione"],
  [b1, "b1"],
  [lettura, "L1"],
]);
const con = (esecuzione: Parameters<typeof segniDelDisegno>[1], segno: "corrente" | "punto") => {
  const di = segniDelDisegno(conSegni.elementi, esecuzione);
  return conSegni.elementi.filter((e) => di(e)[segno]).map((e) => nomi.get(e));
};

describe("le regole dei segni dell'esecuzione", () => {
  test("in un ciclo aperto il blocco corrente è la parte della fase; i punti sui blocchi dell'albero, MAI sui valori iniziali (id vuoto)", () => {
    const esecuzione = { corrente: "p1", faseCorrente: "condizione" as const, interruzioni: new Set(["b1", "", "s1"]) };
    expect(con(esecuzione, "corrente")).toEqual(["p1 condizione"]);
    expect(con(esecuzione, "punto")).toEqual(["b1", "L1"]);
  });

  test("una fase che il disegno non ha (il ciclo chiuso): il blocco corrente è l'intestazione", () => {
    expect(con({ corrente: "p1", faseCorrente: "passo" }, "corrente")).toEqual(["intestazione p1"]);
  });

  test("il valore iniziale corrente si riconosce dal nome del dato, non dall'id vuoto", () => {
    expect(con({ correnteValore: "m" }, "corrente")).toEqual(["valore m"]);
    expect(con({ corrente: "" }, "corrente")).toEqual([]);
  });

  test("la Lettura con la domanda: corrente sulla domanda (riga 0) e sulla Lettura (riga 1)", () => {
    expect(segniDelDisegno(conSegni.elementi, { corrente: "s1" })(lettura)).toEqual({ corrente: true, punto: false, riga: 0 });
    expect(segniDelDisegno(conSegni.elementi, { corrente: "L1" })(lettura)).toEqual({ corrente: true, punto: false, riga: 1 });
  });

  test("senza esecuzione nessun segno, nemmeno coi punti", () => {
    const di = segniDelDisegno(conSegni.elementi, undefined);
    expect(conSegni.elementi.map((e) => di(e))).toEqual(Array(6).fill({ corrente: false, punto: false, riga: undefined }));
  });

  test("nell'SVG: il blocco corrente col suo contorno, il punto, il «↩» della ripresa (posizioni scritte a mano)", () => {
    const svg = svgDelDisegno(conSegni, { ...opzioni, segni: { corrente: "b1", ripresa: true, interruzioni: new Set(["b1"]) } });
    expect(svg).toContain(
      [
        `<g data-forma="assegnazione" data-id="b1">`,
        `<polygon points="50,200 150,200 150,229 50,229" fill="#ffff00" stroke="#dd7700" stroke-width="4"/>`,
        testo("#000001", riga(100, 214.5, "b1")),
        `</g>`,
      ].join("\n"),
    );
    expect(svg).toContain(`<circle data-interruzione="b1" cx="37" cy="209" r="6" fill="#ff0000" stroke="#fefefe" stroke-width="1.5"/>\n<text data-segno-ripresa="" x="76" y="249" font-size="20" font-weight="700" fill="#dd7700">↩</text>`);
    expect(svg).not.toContain("data-freccia");
  });

  test("nell'SVG: la punta del blocco corrente e la riga della Lettura cerchiata; il punto col contorno rosso (posizioni a mano)", () => {
    const svg = svgDelDisegno(conSegni, { ...opzioni, segni: { corrente: "L1", interruzioni: new Set(["b1"]) } });
    expect(svg).toContain(`<polygon points="50,200 150,200 150,229 50,229" fill="#bb00bb" stroke="#ff0000" stroke-width="2"/>`);
    expect(svg).toContain(`<rect data-riga-corrente="1" x="46" y="319" width="108" height="19" rx="3" fill="none" stroke="#dd7700" stroke-width="2"/>\n<path data-freccia="" d="M92,276 L108,276 L100,290 z" fill="#dd7700"/>`);
  });

  test("nell'SVG senza segni: nessun segno dell'esecuzione", () => {
    const svg = svgDelDisegno(conSegni, opzioni);
    for (const segno of ["data-interruzione", "data-freccia", "data-segno-ripresa", "data-riga-corrente", "#ffff00", "#dd7700"]) expect({ segno, c: svg.includes(segno) }).toEqual({ segno, c: false });
  });
});
