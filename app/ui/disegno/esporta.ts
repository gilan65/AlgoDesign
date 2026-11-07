// «Esporta il flowchart…»: la tavolozza della carta, il PNG dall'SVG del nucleo e il nome del file.
//
// La tavolozza è quella del tema CHIARO anche col sistema scuro (un'immagine finisce su una pagina bianca): le variabili
// del tema chiaro stanno in `tema.css` nelle regole di primo livello, fuori da `@media (prefers-color-scheme: dark)`, e si
// leggono da lì, mai da `getComputedStyle` (che col sistema scuro darebbe i colori scuri). Sulla radice valgono, nell'ordine
// del foglio, le regole di `:root`, di `[data-colori]` e dell'insieme scelto (`[data-colori="<insieme>"]`), e sopra di
// loro i colori dei generi scelti nelle Impostazioni, scritti in linea (`ui/colori.ts`); le `var()` si risolvono qui. Lo
// sfondo è bianco, non quello della finestra: l'immagine finisce su una pagina bianca e non deve vedersi come un riquadro.
//
// Il PNG: l'SVG del nucleo in un'immagine `blob:` (la politica di sicurezza dei contenuti ammette `img-src blob:`),
// disegnata su un canvas al doppio della misura del disegno (`fattore`), arrotondata in su al pixel; se il motore non dà il
// PNG a quella misura (un flowchart enorme, oltre l'area del canvas), alla misura piena, a metà, a un quarto
// (`FATTORI_DEL_PNG`), e chi esporta dice la misura uscita.
//
// CHE COSA NON GUARDA:
// - le regole dentro altri `@media` o `@supports` (il tema non ne ha per queste variabili);
// - la specificità: le regole lette hanno tutte un attributo o una pseudo-classe sola, e vince l'ultima;
// - i fogli che non si leggono (di un'altra origine): l'app ha solo i suoi.
import type { Tavolozza, ModoDiColore } from "../../core/disegno/tavolozza";
import type { EstensioneDellImmagine } from "../file";

export type FormatoDellImmagine = "png" | "svg";
export const formatiDellImmagine: readonly FormatoDellImmagine[] = ["png", "svg"];
export const modiDiColore: readonly ModoDiColore[] = ["colori", "grigi", "bianco-e-nero"];
export const estensioneDel = (f: FormatoDellImmagine): EstensioneDellImmagine => (f === "png" ? ".png" : ".svg");

/** Le scelte della finestra, ricordate per la sessione. */
export interface ScelteDellEsportazione {
  readonly formato: FormatoDellImmagine;
  readonly colori: ModoDiColore;
  readonly trasparente: boolean;
}
export const sceltePredefinite: ScelteDellEsportazione = { formato: "png", colori: "colori", trasparente: false };

/** Il PNG è il disegno al doppio della sua misura. */
export const FATTORE_DEL_PNG = 2;

/** Lo sfondo dell'immagine esportata: bianco come la pagina che la ospita, non il grigio chiarissimo della finestra. */
export const SFONDO_DELLA_CARTA = "#ffffff";

/** Una regola di primo livello di un foglio di stile: i selettori e le variabili (`--…`) che dichiara. */
export interface RegolaDelTema {
  readonly selettori: readonly string[];
  readonly variabili: Readonly<Record<string, string>>;
}

/** Le regole di primo livello dei fogli (non quelle dentro un `@media`), nell'ordine dei fogli, con le loro variabili. */
export function regoleDelTema(fogli: Iterable<CSSStyleSheet>): RegolaDelTema[] {
  const fuori: RegolaDelTema[] = [];
  for (const foglio of fogli) {
    let regole: CSSRuleList;
    try {
      regole = foglio.cssRules;
    } catch {
      continue;
    }
    for (const r of regole) {
      // Solo le regole di stile (tipo 1): un `@media` è un'altra regola, e le sue non si guardano.
      if (r.type !== 1) continue;
      const s = (r as CSSStyleRule).style;
      const variabili: Record<string, string> = {};
      for (let i = 0; i < s.length; i++) {
        const nome = s.item(i);
        if (nome.startsWith("--")) variabili[nome] = s.getPropertyValue(nome).trim();
      }
      fuori.push({ selettori: (r as CSSStyleRule).selectorText.split(",").map((x) => x.trim()), variabili });
    }
  }
  return fuori;
}

/** Le variabili della radice col tema chiaro: le regole che la riguardano nell'ordine, poi quelle scritte in linea. */
function variabiliDellaRadice(regole: readonly RegolaDelTema[], insieme: string, inLinea: Readonly<Record<string, string>>): Map<string, string> {
  const dellaRadice = new Set([":root", "[data-colori]", `[data-colori="${insieme}"]`]);
  const v = new Map<string, string>();
  for (const r of regole) if (r.selettori.some((s) => dellaRadice.has(s))) for (const [k, x] of Object.entries(r.variabili)) v.set(k, x);
  for (const [k, x] of Object.entries(inLinea)) if (x.trim() !== "") v.set(k, x.trim());
  return v;
}

/** Il valore di una variabile con le `var()` risolte (anche col ripiego); un riferimento che non si chiude è un errore. */
function risolvi(v: Map<string, string>, nome: string, profondita = 0): string {
  if (profondita > 10) throw new Error(`la variabile ${nome} rimanda a sé stessa`);
  const valore = v.get(nome);
  if (valore === undefined) throw new Error(`la variabile ${nome} non c'è nel tema chiaro`);
  return valore.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, altra: string, ripiego: string | undefined) =>
    v.has(altra) ? risolvi(v, altra, profondita + 1) : ripiego !== undefined ? ripiego.trim() : risolvi(v, altra, profondita + 1),
  );
}

/** La tavolozza della carta: il tema chiaro dell'insieme scelto, coi colori dei generi scritti in linea; lo sfondo bianco.
 * `normalizza` scrive un colore CSS come `#rrggbb` (nell'app lo fa il canvas: il foglio può averlo scritto corto o col
 * nome). */
export function tavolozzaDellaCarta(regole: readonly RegolaDelTema[], insieme: string, inLinea: Readonly<Record<string, string>>, normalizza: (colore: string) => string = (c) => c): Tavolozza {
  const v = variabiliDellaRadice(regole, insieme, inLinea);
  const c = (nome: string) => normalizza(risolvi(v, nome));
  return {
    sfondo: SFONDO_DELLA_CARTA,
    testo: c("--colore-testo"),
    bordo: c("--disegno-bordo"),
    linea: c("--disegno-linea"),
    riquadro: c("--blocco-riquadro"),
    vero: c("--disegno-vero"),
    falso: c("--disegno-falso"),
    forme: {
      inizioEFine: c("--blocco-inizio-e-fine"),
      assegnazione: c("--blocco-assegnazione"),
      procedura: c("--blocco-procedura"),
      lettura: c("--blocco-lettura"),
      scrittura: c("--blocco-scrittura"),
      se: c("--blocco-se"),
      cicli: c("--blocco-cicli"),
      commento: c("--blocco-commento"),
    },
    corrente: c("--esecuzione-corrente"),
    bordoCorrente: c("--esecuzione-bordo"),
    testoCorrente: c("--esecuzione-testo"),
    punto: c("--esecuzione-punto"),
  };
}

/** La tavolozza della carta per la pagina di adesso: i fogli del documento, l'insieme e i colori in linea della radice. */
export function tavolozzaDellaPagina(documento: Document = document): Tavolozza {
  const radice = documento.documentElement;
  const inLinea: Record<string, string> = {};
  for (let i = 0; i < radice.style.length; i++) {
    const nome = radice.style.item(i);
    if (nome.startsWith("--")) inLinea[nome] = radice.style.getPropertyValue(nome);
  }
  const contesto = documento.createElement("canvas").getContext("2d");
  const normalizza = (colore: string) => {
    if (!contesto) return colore;
    contesto.fillStyle = "#000000";
    contesto.fillStyle = colore;
    return String(contesto.fillStyle);
  };
  return tavolozzaDellaCarta(regoleDelTema(documento.styleSheets), radice.dataset.colori ?? "tenue", inLinea, normalizza);
}

/** Il nome del file (senza l'estensione): quello del progetto e, per una procedura o una funzione, il suo nome fra
 * parentesi («media (leggi_numero)»); il programma principale col solo nome del progetto. */
export const nomeDellImmagine = (base: string, funzione: string | null) => (funzione === null ? base : `${base} (${funzione})`);

/** La misura in pixel del PNG di un disegno largo `larghezza` e alto `altezza`. */
export const misuraDelPng = (larghezza: number, altezza: number, fattore = FATTORE_DEL_PNG) => ({ larghezza: Math.ceil(larghezza * fattore), altezza: Math.ceil(altezza * fattore) });

/** I fattori del ripiego, nell'ordine: il doppio, poi la misura piena, la metà, un quarto. Il canvas del motore non dà il
 * PNG oltre un'area (misurata: 16384 × 16384 pixel in Chromium, nella WebView2 e nel WebKitGTK; il lato fino a 65535 in
 * Chromium e nella WebView2): un flowchart che al doppio non ci entra esce più piccolo, invece dell'errore. Non dipende
 * dai limiti misurati, che sul Mac non lo sono: si prova, e si scende. */
export const FATTORI_DEL_PNG: readonly number[] = [FATTORE_DEL_PNG, 1, 0.5, 0.25];

/** Il primo fattore per cui `prova` dà un risultato, col risultato; `null` se nessuno lo dà. */
export async function primoFattore<T>(fattori: readonly number[], prova: (fattore: number) => Promise<T | null>): Promise<{ fattore: number; risultato: T } | null> {
  for (const fattore of fattori) {
    const risultato = await prova(fattore);
    if (risultato !== null) return { fattore, risultato };
  }
  return null;
}

/** Il PNG dell'SVG e la misura in pixel con cui è uscito. */
export interface PngDellSvg {
  byte: Uint8Array;
  fattore: number;
  larghezza: number;
  altezza: number;
}

/** I byte del PNG dell'SVG: l'immagine `blob:` disegnata sul canvas `fattore` volte più grande (il primo dei `fattori` per
 * cui il motore dà il PNG); `sfondo` riempie prima il canvas (il pixel in più dell'arrotondamento), `null` lo lascia
 * trasparente. Nessun fattore: l'errore. */
export async function pngDallSvg(svg: string, larghezza: number, altezza: number, sfondo: string | null, fattori: readonly number[] = FATTORI_DEL_PNG): Promise<PngDellSvg> {
  const indirizzo = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const immagine = new Image();
    immagine.src = indirizzo;
    await immagine.decode();
    const trovato = await primoFattore(fattori, async (fattore) => {
      const misura = misuraDelPng(larghezza, altezza, fattore);
      const canvas = document.createElement("canvas");
      canvas.width = misura.larghezza;
      canvas.height = misura.altezza;
      // Oltre il limite il motore può non tenere la misura, non dare il contesto o non dare il PNG.
      if (canvas.width !== misura.larghezza || canvas.height !== misura.altezza) return null;
      const contesto = canvas.getContext("2d");
      if (!contesto) return null;
      if (sfondo !== null) {
        contesto.fillStyle = sfondo;
        contesto.fillRect(0, 0, misura.larghezza, misura.altezza);
      }
      contesto.drawImage(immagine, 0, 0, larghezza * fattore, altezza * fattore);
      const png = await new Promise<Blob | null>((fatto) => canvas.toBlob(fatto, "image/png"));
      canvas.width = 0;
      canvas.height = 0;
      return png && png.size > 0 ? { byte: new Uint8Array(await png.arrayBuffer()), ...misura } : null;
    });
    if (!trovato) throw new Error(`il canvas non dà il PNG nemmeno a ${fattori.at(-1)} volte la misura del disegno`);
    return { fattore: trovato.fattore, ...trovato.risultato };
  } finally {
    URL.revokeObjectURL(indirizzo);
  }
}

/** I byte in base64, come li vuole il comando del guscio. */
export function inBase64(byte: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < byte.length; i += 0x8000) binario += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(binario);
}
