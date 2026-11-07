// La misura più grande di un canvas che un motore disegna e da cui dà ancora un PNG: il limite oltre il quale il PNG di un
// flowchart enorme non si fa (`ui/disegno/esporta.ts`, `pngDallSvg`). Una misura, non una prova: dice i numeri, non ferma.
//
// `misuraDelCanvas` corre nella pagina, così com'è (si passa come testo: niente variabili di fuori): il lato del canvas
// quadrato, la larghezza con l'altezza di 64 pixel e l'altezza con la larghezza di 64, cercati raddoppiando da 1024 e poi
// a metà; un canvas vale se il contesto c'è, se il pixel nell'angolo in basso a destra si rilegge col colore scritto e,
// alla misura trovata, se dà il PNG. Si usa:
// - nel WebKit di Playwright per Linux (e negli altri motori di Playwright): `bun ./strumenti/misura-del-canvas.ts
//   --motore <webkit|chromium>`, che scrive una riga `CANVAS: MISURATO | …`;
// - nel WebKitGTK del programma, dalla prova sul prodotto di Linux (`linux/giro.ts`), attraverso WebDriver;
// - nella WebView2 del programma, dalla prova sul prodotto di Windows (`prova-portabile.ts`, nella ESPORTA), via CDP.
//
// Che cosa NON guarda: la memoria (un canvas al limite può far mancare la memoria a una macchina più piccola), il tempo
// della codifica, il WKWebView del Mac (la sua misura si fa sul Mac).

export interface MisuraDelCanvas {
  lato: number;
  larghezza: number;
  altezza: number;
  /** Il PNG del canvas quadrato al lato trovato: i byte, 0 se non lo dà. */
  pngAlLato: number;
  millisecondi: number;
}

export async function misuraDelCanvas(): Promise<MisuraDelCanvas> {
  const inizio = performance.now();
  const disegna = (l: number, a: number): HTMLCanvasElement | null => {
    const c = document.createElement("canvas");
    c.width = l;
    c.height = a;
    if (c.width !== l || c.height !== a) return null;
    const x = c.getContext("2d");
    if (!x) return null;
    x.fillStyle = "#123456";
    x.fillRect(l - 1, a - 1, 1, 1);
    try {
      const p = x.getImageData(l - 1, a - 1, 1, 1).data;
      return p[0] === 0x12 && p[1] === 0x34 && p[2] === 0x56 ? c : null;
    } catch {
      return null;
    }
  };
  const vale = (l: number, a: number) => {
    const c = disegna(l, a);
    if (c === null) return false;
    c.width = 0;
    c.height = 0;
    return true;
  };
  // Il più grande n fra `da` e `fino` per cui `f(n)` vale: raddoppiando finché vale, poi a metà.
  const massimo = (f: (n: number) => boolean, da: number, fino: number) => {
    if (!f(da)) return 0;
    let buono = da;
    let cattivo = 0;
    while (cattivo === 0) {
      const dopo = Math.min(buono * 2, fino);
      if (dopo === buono) return buono;
      if (f(dopo)) buono = dopo;
      else cattivo = dopo;
    }
    while (cattivo - buono > 1) {
      const m = Math.floor((buono + cattivo) / 2);
      if (f(m)) buono = m;
      else cattivo = m;
    }
    return buono;
  };
  const lato = massimo((n) => vale(n, n), 1024, 65536);
  const larghezza = massimo((n) => vale(n, 64), 1024, 1 << 20);
  const altezza = massimo((n) => vale(64, n), 1024, 1 << 20);
  let pngAlLato = 0;
  const c = lato > 0 ? disegna(lato, lato) : null;
  if (c !== null) {
    const b = await new Promise<Blob | null>((fatto) => {
      try {
        c.toBlob(fatto, "image/png");
      } catch {
        fatto(null);
      }
    });
    pngAlLato = b?.size ?? 0;
    c.width = 0;
    c.height = 0;
  }
  return { lato, larghezza, altezza, pngAlLato, millisecondi: Math.round(performance.now() - inizio) };
}

/** La riga del log, uguale per ogni motore. */
export const rigaDellaMisura = (motore: string, m: MisuraDelCanvas) =>
  `CANVAS: MISURATO | ${motore}: quadrato fino a ${m.lato} × ${m.lato} pixel (PNG ${m.pngAlLato > 0 ? `di ${m.pngAlLato} byte` : "NON dato"} a quel lato), largo fino a ${m.larghezza} con 64 di altezza, alto fino a ${m.altezza} con 64 di larghezza (${m.millisecondi} ms)`;

if (import.meta.main) {
  const i = process.argv.indexOf("--motore");
  const motore = i >= 0 ? process.argv[i + 1] : undefined;
  if (motore !== "webkit" && motore !== "chromium") {
    console.error(`uso: misura-del-canvas --motore <webkit|chromium> (ricevuti: ${JSON.stringify(process.argv.slice(2))})`);
    process.exit(2);
  }
  const playwright = await import("@playwright/test");
  const browser = await playwright[motore].launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><title>canvas</title>");
    const m = await page.evaluate(misuraDelCanvas);
    console.log(rigaDellaMisura(`${motore} di Playwright ${browser.version()} su ${process.platform}`, m));
  } finally {
    await browser.close();
  }
}
