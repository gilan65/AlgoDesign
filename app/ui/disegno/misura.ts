// La misura del testo per l'impaginazione: `measureText` di un canvas con lo STESSO carattere del testo
// disegnato. Il carattere ha una fonte sola: la famiglia è la variabile `--carattere` del tema (che usa
// anche l'SVG), la dimensione è quella della geometria del tema (che l'SVG scrive sul testo), il peso è
// quello normale in tutti e due; il grassetto e il corsivo (l'intestazione di una procedura o di una funzione, il
// blocco della chiamata) sono quelli che l'SVG dà ai loro pezzi. Va creata dopo `document.fonts.ready` (lo attende
// l'avvio).
import type { MisuraDelTesto, StileDelTesto } from "../../core/disegno/impaginazione";
import { geometriaPredefinita } from "../../core/disegno/tema";

/** Come il canvas scrive lo stile davanti alla dimensione: lo stesso peso e la stessa pendenza del foglio di stile. */
const davanti: Readonly<Record<StileDelTesto | "normale", string>> = { normale: "", grassetto: "bold ", corsivo: "italic " };

export function misuraDelCanvas(dimensione: number = geometriaPredefinita.carattere): MisuraDelTesto {
  const famiglia = getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim();
  const contesti = new Map<StileDelTesto | "normale", CanvasRenderingContext2D>();
  for (const stile of ["normale", "grassetto", "corsivo"] as const) {
    const contesto = document.createElement("canvas").getContext("2d");
    if (!contesto) throw new Error("il canvas non dà un contesto 2d: il testo del disegno non si può misurare");
    const carattere = `${davanti[stile]}${dimensione}px ${famiglia}`;
    contesto.font = carattere;
    // Un carattere che il canvas non sa leggere viene ignorato in silenzio (resta «10px sans-serif»), e la
    // misura sarebbe di un altro carattere; uno stile ignorato misurerebbe il grassetto come il normale.
    const letto = contesto.font;
    const conLoStile = stile === "grassetto" ? [davanti.grassetto, "700 "] : [davanti[stile]];
    if (famiglia === "" || !conLoStile.some((s) => letto.startsWith(`${s}${dimensione}px`)))
      throw new Error(`il canvas non accetta il carattere del tema «${carattere}» (ha «${letto}»)`);
    contesti.set(stile, contesto);
  }
  const misurati = new Map<string, number>();
  return (testo, stile) => {
    const chiave = `${stile ?? ""}|${testo}`;
    let w = misurati.get(chiave);
    if (w === undefined) {
      w = contesti.get(stile ?? "normale")!.measureText(testo).width;
      misurati.set(chiave, w);
    }
    return w;
  };
}
