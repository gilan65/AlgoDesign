// La guida per lo studente nella finestra «Guida»: il Markdown di `docs/` convertito in HTML durante la build (la
// macro di `guide.ts`), così il prodotto non porta né il Markdown né un convertitore. La conversione la fa il
// convertitore di Bun (`Bun.markdown.html`), che gira solo nella build; qui si controlla ciò che ne esce.
//
// La guida usa un insieme piccolo di costrutti: titoli di tre livelli, elenchi puntati e numerati, tabelle, grassetto,
// corsivo e codice in linea. Ogni costrutto fuori dall'insieme (un collegamento, un'immagine, un blocco di codice, una
// citazione, una linea, il barrato, un a capo forzato, l'HTML scritto a mano, una tabella allineata) esce con
// un'etichetta o un attributo che l'insieme non ha, e la conversione si ferma con un errore che lo nomina: la build è
// rossa finché la guida non torna nell'insieme, o la finestra non impara a mostrarlo.
//
// Il titolo del documento (`# …`) non entra nel testo: lo dice già il titolo della finestra. I capitoli (`## …`)
// ricevono un `id` per l'indice.

/** Le etichette che la finestra sa mostrare, senza attributi. */
export const ETICHETTE_AMMESSE: readonly string[] = ["h1", "h2", "h3", "p", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "strong", "em", "code"];

export interface Capitolo {
  readonly id: string;
  readonly titolo: string;
}

export interface GuidaInHtml {
  /** Il titolo del documento, che nella finestra non si ripete. */
  readonly titolo: string;
  readonly html: string;
  readonly capitoli: readonly Capitolo[];
}

/** Il testo di un frammento HTML del convertitore: senza etichette, con le sue entità sciolte. */
export function testoDi(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(lt|gt|quot|#39|amp);/g, (_, e: string) => ({ lt: "<", gt: ">", quot: '"', "#39": "'", amp: "&" })[e]!);
}

/** Converte la guida col convertitore dato (`Bun.markdown.html` nella build) e controlla che ne escano solo le
 * etichette ammesse, senza attributi; altrimenti si ferma col nome del costrutto e il testo intorno. */
export function convertiLaGuida(nome: string, markdown: string, inHtml: (markdown: string) => string): GuidaInHtml {
  const html = inHtml(markdown);
  for (const m of html.matchAll(/<\/?([a-z][a-z\d]*)([^>]*)>/gi)) {
    const [etichetta, nomeDellEtichetta, attributi] = [m[0], m[1]!.toLowerCase(), m[2]!.trim()];
    if (ETICHETTE_AMMESSE.includes(nomeDellEtichetta) && attributi === "") continue;
    const intorno = testoDi(html.slice(Math.max(0, m.index - 60), m.index + etichetta.length + 60)).replace(/\s+/g, " ").trim();
    throw new Error(`${nome}: la finestra «Guida» non sa mostrare ${etichetta} (vicino a «${intorno}»): la guida usa solo titoli, elenchi, tabelle, grassetto, corsivo e codice in linea`);
  }
  const titolo = html.match(/^<h1>(.*?)<\/h1>\n?/);
  if (!titolo) throw new Error(`${nome}: la guida non comincia col suo titolo («# …»)`);
  const capitoli: Capitolo[] = [];
  const corpo = html.slice(titolo[0].length).replace(/<h2>(.*?)<\/h2>/g, (_, dentro: string) => {
    const id = `guida-capitolo-${capitoli.length + 1}`;
    capitoli.push({ id, titolo: testoDi(dentro) });
    return `<h2 id="${id}" tabindex="-1">${dentro}</h2>`;
  });
  return { titolo: testoDi(titolo[1]!), html: corpo, capitoli };
}
