// I colori dei singoli generi di blocco, scelti nelle Impostazioni sopra l'insieme di colori: ogni genere col colore
// dell'insieme, o con una tinta della tavolozza. Le tinte stanno in `tema.css` (`--tinta-<nome>`, ognuna in chiaro e in
// scuro); un genere scelto riceve la sua variabile (`--blocco-<genere>`) sull'elemento, che vince su quella dell'insieme.
// Una tinta sola per genere vale in chiaro e in scuro: è il tema a dare le due versioni, con il contrasto misurato.
//
// CHE COSA NON GUARDA: il contrasto (lo misura `e2e/colori.e2e.ts` nel motore, su ogni tinta).

/** I generi che hanno un colore loro: le forme del flowchart e il riquadro dei cicli. */
export const generiColorati = ["inizio-e-fine", "assegnazione", "procedura", "lettura", "scrittura", "se", "cicli", "commento", "riquadro"] as const;
export type GenereColorato = (typeof generiColorati)[number];

/** Le tinte dei riempimenti, nove tenui e otto intense: ci sono tutti i colori dei «Tenui» (`tema.css`). */
export const tinteDeiBlocchi = [
  "bianco",
  "grigio",
  "sabbia",
  "verde",
  "acqua",
  "azzurro",
  "viola",
  "malva",
  "arancione",
  "grigio-intenso",
  "sabbia-intenso",
  "verde-intenso",
  "acqua-intenso",
  "azzurro-intenso",
  "viola-intenso",
  "malva-intenso",
  "arancione-intenso",
] as const;
/** Le tinte della linea del riquadro dei cicli (e del suo fondo, quando c'è). */
export const tinteDelRiquadro = ["linea-grigio", "linea-verde", "linea-acqua", "linea-blu", "linea-viola", "linea-rosa", "linea-arancione", "linea-rosso"] as const;
export type Tinta = (typeof tinteDeiBlocchi)[number] | (typeof tinteDelRiquadro)[number];

/** Le tinte che un genere può avere. */
export const tinteDi = (g: GenereColorato): readonly Tinta[] => (g === "riquadro" ? tinteDelRiquadro : tinteDeiBlocchi);

/** I colori scelti: solo i generi che non hanno quello dell'insieme. */
export type ColoriDeiBlocchi = Readonly<Partial<Record<GenereColorato, Tinta>>>;

/** I colori letti dal file delle preferenze: ogni genere per sé, e quello che non si legge (un genere o una tinta che
 * l'app non conosce, la tinta di un altro genere) resta col colore dell'insieme. */
export function coloriDa(valore: unknown): ColoriDeiBlocchi {
  if (typeof valore !== "object" || valore === null || Array.isArray(valore)) return {};
  const v = valore as Record<string, unknown>;
  return Object.fromEntries(
    generiColorati.flatMap((g) => {
      const t = v[g];
      return typeof t === "string" && (tinteDi(g) as readonly string[]).includes(t) ? [[g, t]] : [];
    }),
  );
}

/** Le variabili dei generi scelti, da mettere sull'elemento (la radice del documento, o l'anteprima delle Impostazioni). */
export function variabiliDei(colori: ColoriDeiBlocchi): Record<string, string> {
  return Object.fromEntries(generiColorati.flatMap((g) => (colori[g] === undefined ? [] : [[`--blocco-${g}`, `var(--tinta-${colori[g]})`]])));
}

/** Scrive sulla radice del documento le variabili dei generi scelti, e toglie quelle degli altri. */
export function applicaIColori(radice: HTMLElement, colori: ColoriDeiBlocchi): void {
  const variabili = variabiliDei(colori);
  for (const g of generiColorati) {
    const nome = `--blocco-${g}`;
    if (variabili[nome] === undefined) radice.style.removeProperty(nome);
    else radice.style.setProperty(nome, variabili[nome]);
  }
}
