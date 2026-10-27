// La tavolozza del disegno stampato o esportato: i colori del flowchart, dati da chi chiama (l'interfaccia li legge dal
// tema chiaro e dalle Impostazioni: il nucleo non conosce il CSS), e i tre modi di colore. A toni di grigio ogni colore
// diventa il grigio con la stessa luminanza relativa (quella con cui si misura il contrasto: il contrasto fra due colori
// resta quello di prima, a meno dell'arrotondamento a 8 bit); in bianco e nero i riempimenti sono bianchi e tutto il resto
// nero (i tratti, i testi, Vero e Falso, i segni dell'esecuzione).

/** I generi di blocco col loro colore, come le variabili `--blocco-*` del tema. */
export type GenereDelColore = "inizioEFine" | "assegnazione" | "procedura" | "lettura" | "scrittura" | "se" | "cicli" | "commento";

/** I colori del disegno, esadecimali (`#rrggbb` o `#rgb`). */
export interface Tavolozza {
  /** Lo sfondo del disegno: il foglio, l'interno di un'unione e dell'intestazione di un riquadro, il bordo del pallino. */
  readonly sfondo: string;
  readonly testo: string;
  /** Il contorno delle forme e le due righe ai lati della chiamata. */
  readonly bordo: string;
  /** Le linee, le punte, il bordo delle unioni. */
  readonly linea: string;
  /** La linea tratteggiata del riquadro di un ciclo o di una copia. */
  readonly riquadro: string;
  readonly vero: string;
  readonly falso: string;
  readonly forme: Readonly<Record<GenereDelColore, string>>;
  /** Il blocco corrente: l'interno, il bordo (anche la punta, il «↩» e la riga della domanda) e il testo. */
  readonly corrente: string;
  readonly bordoCorrente: string;
  readonly testoCorrente: string;
  /** Il pallino del punto di interruzione e il contorno del suo blocco. */
  readonly punto: string;
}

export type ModoDiColore = "colori" | "grigi" | "bianco-e-nero";

const BIANCO = "#ffffff";
const NERO = "#000000";

/** I tre canali di un colore esadecimale, da 0 a 255. */
function canali(colore: string): [number, number, number] {
  const c = colore.trim().toLowerCase();
  const esteso = /^#[0-9a-f]{3}$/.test(c) ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
  if (!/^#[0-9a-f]{6}$/.test(esteso)) throw new Error(`il colore «${colore}» non è esadecimale`);
  return [1, 3, 5].map((i) => parseInt(esteso.slice(i, i + 2), 16)) as [number, number, number];
}

/** Il grigio con la stessa luminanza relativa (sRGB, coefficienti della WCAG). */
function grigio(colore: string): string {
  const lineare = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = canali(colore).map(lineare) as [number, number, number];
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const codificato = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  const v = Math.round(Math.min(1, Math.max(0, codificato)) * 255).toString(16).padStart(2, "0");
  return `#${v}${v}${v}`;
}

/** Un colore scritto nella forma lunga e minuscola. */
const lungo = (colore: string) => `#${canali(colore).map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** La tavolozza nel modo dato: a colori quella data, a toni di grigio ogni colore il suo grigio, in bianco e nero. */
export function tavolozzaNelModo(t: Tavolozza, modo: ModoDiColore): Tavolozza {
  if (modo === "colori") return t;
  // Anche in bianco e nero un colore che non è esadecimale è un errore: chi chiama ha letto male il tema.
  const sempre = (fisso: string) => (c: string) => (lungo(c) === "" ? c : fisso);
  const [riempimento, tratto] = modo === "grigi" ? [grigio, grigio] : [sempre(BIANCO), sempre(NERO)];
  const forme = Object.fromEntries(Object.entries(t.forme).map(([g, c]) => [g, riempimento(c)])) as unknown as Record<GenereDelColore, string>;
  return {
    sfondo: riempimento(t.sfondo),
    testo: tratto(t.testo),
    bordo: tratto(t.bordo),
    linea: tratto(t.linea),
    riquadro: tratto(t.riquadro),
    vero: tratto(t.vero),
    falso: tratto(t.falso),
    forme,
    corrente: riempimento(t.corrente),
    bordoCorrente: tratto(t.bordoCorrente),
    testoCorrente: tratto(t.testoCorrente),
    punto: tratto(t.punto),
  };
}
