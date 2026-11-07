// Le figure delle guide (`docs/img/`) nel pacchetto di Windows e nell'archivio di Linux: la cartella si copia intera
// accanto alle guide, così i collegamenti `img/…` valgono uguali nel repository e nel pacchetto, e le figure copiate si
// confrontano con quelle citate dai testi Markdown del pacchetto, per elementi e nei due versi: una figura citata e non
// copiata è un'immagine che manca, una copiata e non citata è un file in più.
//
// Che cosa NON guarda: il contenuto delle figure (un'immagine vecchia resta verde), le immagini scritte in HTML
// (`<img>`), e i testi fuori dal primo livello del pacchetto.
import { cpSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cartellaDelleFigure, figureCitate } from "./elenco-del-pacchetto";

/** I file di una cartella e delle sue sottocartelle, coi percorsi relativi a lei e le barre in avanti, in ordine. */
export function fileDi(cartella: string): string[] {
  return readdirSync(cartella, { recursive: true, withFileTypes: true })
    .filter((v) => v.isFile())
    .map((v) => join(v.parentPath, v.name).slice(cartella.length + 1).replaceAll("\\", "/"))
    .sort();
}

/** Le differenze fra le figure citate e quelle che ci sono, in parole; vuote se coincidono. */
export function differenzeDelleFigure(citate: readonly string[], presenti: readonly string[]): string[] {
  return [
    ...citate.filter((c) => !presenti.includes(c)).map((c) => `citata e assente ${c}`),
    ...presenti.filter((p) => !citate.includes(p)).map((p) => `presente e non citata ${p}`),
  ];
}

/** Le figure citate dai testi Markdown al primo livello di una cartella, senza ripetizioni, in ordine. */
export function citateNellaCartella(cartella: string): string[] {
  const testi = readdirSync(cartella).filter((f) => f.endsWith(".md"));
  return [...new Set(testi.flatMap((f) => figureCitate(readFileSync(join(cartella, f), "utf8"))))].sort();
}

/** Copia `docs/img/` del repository nella cartella del pacchetto e confronta le figure copiate con quelle citate. */
export function copiaLeFigure(repository: string, cartella: string): { copiate: number; citate: number; differenze: string[] } {
  const destinazione = join(cartella, cartellaDelleFigure);
  cpSync(join(repository, "docs", cartellaDelleFigure), destinazione, { recursive: true });
  const copiate = fileDi(destinazione).map((f) => `${cartellaDelleFigure}/${f}`);
  const citate = citateNellaCartella(cartella);
  return { copiate: copiate.length, citate: citate.length, differenze: differenzeDelleFigure(citate, copiate) };
}
