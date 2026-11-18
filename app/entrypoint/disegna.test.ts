// `disegna` del punto d'ingresso dà gli stessi byte dell'esportazione dell'app, su ogni funzione di ogni progetto del
// corpus, nelle due lingue, con le scelte predefinite delle Impostazioni e con tutte le altre. Il lato dell'app è composto
// come in «Esporta il flowchart…» (`ui/Applicazione.tsx`, `esportaIlFlowchart`): il disegno della funzione, le opzioni
// dalle scelte, la geometria del tema, la tavolozza della carta dell'insieme, il modo, il carattere, il fondo dei cicli, lo
// sfondo trasparente. La misura del testo è deterministica (la stessa ai due lati), lo stile la cambia.
//
// CHE COSA NON GUARDA:
// - la tavolozza letta dal CSS della pagina: qui è quella del nucleo, che `ui/disegno/esporta.test.ts` confronta con
//   `tema.css`, e le tinte dei generi scelte nelle Impostazioni (che il contratto non ha);
// - la misura del canvas e il file scritto davvero dall'app: li guarda `e2e/esporta.e2e.ts`;
// - i segni dell'esecuzione: il contratto non li disegna.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { confermato } from "../strumenti/corpus";
import { opzioniPredefinite, type MisuraDelTesto } from "../core/disegno/impaginazione";
import { svgDelDisegno } from "../core/disegno/svg";
import { tavolozzeDellaCarta } from "../core/disegno/tavolozze-della-carta";
import { geometriaPredefinita } from "../core/disegno/tema";
import { apri } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { disegnoDellaFunzione, opzioniDelDisegnoDa, type ScelteDelDisegno } from "../ui/disegno/disegno-della-funzione";
import { sceltePredefinite } from "../ui/disegno/esporta";
import { scelteIniziali } from "../ui/preferenze";
import { disegna, type OpzioniDiDisegna } from "./index";

const misura: MisuraDelTesto = (t, stile) => t.length * 7 + (stile === "grassetto" ? t.length : stile === "corsivo" ? t.length / 2 : 0);
const carattere = "system-ui, sans-serif";

const cartella = join(import.meta.dir, "..", "casi");
const progetti: { readonly nome: string; readonly progetto: Progetto }[] = [];
let nonAperti = 0;
for (const d of readdirSync(cartella, { withFileTypes: true }).filter((x) => x.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1)))
  for (const f of readdirSync(join(cartella, d.name)).filter((x) => x.endsWith(".algo")).sort()) {
    const esito = apri(readFileSync(join(cartella, d.name, f), "utf8"));
    if (esito.ok) progetti.push({ nome: `${d.name}/${f}`, progetto: esito.progetto });
    else nonAperti++;
  }

/** L'esportazione dell'app con queste scelte: il disegno e l'SVG come in `esportaIlFlowchart`. */
function comeLApp(p: Progetto, idDellaFunzione: string, lingua: "it" | "en", s: ScelteDelDisegno & { colori: keyof typeof tavolozzeDellaCarta; fondoDeiCicli: boolean }, esporta: { colori: "colori" | "grigi" | "bianco-e-nero"; trasparente: boolean }): string {
  const f = p.functions.find((x) => x.id === idDellaFunzione)!;
  const d = disegnoDellaFunzione(p, f, misura, lingua, opzioniDelDisegnoDa(s));
  return svgDelDisegno(d, { geometria: geometriaPredefinita, tavolozza: tavolozzeDellaCarta[s.colori], modo: esporta.colori, carattere, fondoDeiCicli: s.fondoDeiCicli, trasparente: esporta.trasparente });
}

/** Le scelte diverse dalle predefinite, tutte insieme, e le stesse come opzioni del contratto. */
const altreScelte = {
  ...scelteIniziali,
  condizioni: "su-una-riga",
  valoriIniziali: "nascosti",
  valoreRipetuto: "un-valore",
  cicliPer: "chiuso",
  cicliPerOgni: "parole",
  copiaDeiVettori: "espansa",
  domandaNellaLettura: true,
  colori: "contrasto",
  fondoDeiCicli: true,
} as const;
const altreOpzioni: OpzioniDiDisegna = {
  condizioniLunghe: "su-una-riga",
  valoriIniziali: "nascosti",
  valoreRipetuto: "un-valore",
  per: "chiuso",
  perOgni: "parole",
  copia: "espansa",
  domanda: "nella-lettura",
  colori: "contrasto",
  modo: "grigi",
  fondoDeiCicli: true,
  trasparente: true,
};

test("i predefiniti del contratto sono le scelte iniziali delle Impostazioni e dell'esportazione", () => {
  expect(opzioniDelDisegnoDa(scelteIniziali)).toEqual(opzioniPredefinite);
  expect({ colori: scelteIniziali.colori, fondoDeiCicli: scelteIniziali.fondoDeiCicli, modo: sceltePredefinite.colori, trasparente: sceltePredefinite.trasparente }).toEqual({
    colori: "tenue",
    fondoDeiCicli: false,
    modo: "colori",
    trasparente: false,
  });
  // Le altre scelte cambiano davvero ogni opzione (altrimenti la seconda metà della prova ripeterebbe la prima).
  const altre = opzioniDelDisegnoDa(altreScelte);
  expect(Object.keys(opzioniPredefinite).filter((k) => altre[k as keyof typeof altre] === opzioniPredefinite[k as keyof typeof opzioniPredefinite])).toEqual([]);
});

test("disegna dà i byte dell'esportazione dell'app su tutto il corpus, nelle due lingue, con le scelte predefinite e con le altre", () => {
  const diversi: string[] = [];
  let funzioni = 0;
  let confronti = 0;
  let cambiatiDalControllo = 0;
  let disegniDiBase = 0;
  for (const { nome, progetto } of progetti)
    for (const f of progetto.functions) {
      funzioni++;
      for (const lingua of ["it", "en"] as const) {
        disegniDiBase++;
        const base = comeLApp(progetto, f.id, lingua, scelteIniziali, sceltePredefinite);
        const coiPredefiniti = disegna(progetto, f.id, lingua, misura, carattere);
        const altre = comeLApp(progetto, f.id, lingua, altreScelte, { colori: "grigi", trasparente: true });
        const conLeAltre = disegna(progetto, f.id, lingua, misura, carattere, altreOpzioni);
        confronti += 2;
        if (coiPredefiniti.svg !== base) diversi.push(`${nome} ${f.id} ${lingua} (predefinite)`);
        if (conLeAltre.svg !== altre) diversi.push(`${nome} ${f.id} ${lingua} (altre)`);
        // Controllo positivo: un'opzione diversa da un lato solo.
        if (disegna(progetto, f.id, lingua, misura, carattere, { colori: "contrasto" }).svg !== base) cambiatiDalControllo++;
      }
    }
  console.log(`disegna: progetti ${progetti.length} (non aperti ${nonAperti}), funzioni ${funzioni}, confronti ${confronti}, diversi ${diversi.length}; controllo positivo: cambiati ${cambiatiDalControllo} su ${disegniDiBase}`);
  expect(diversi).toEqual([]);
  expect(funzioni).toBe(confermato("disegna - funzioni del corpus", funzioni));
  expect(cambiatiDalControllo).toBe(disegniDiBase);
});

test("disegna rifiuta con un'eccezione una funzione, una lingua, un insieme di colori o un modo sconosciuti", () => {
  const { progetto } = progetti[0]!;
  const id = progetto.functions[0]!.id;
  expect(() => disegna(progetto, "nessuna", "it", misura, carattere)).toThrow("funzione sconosciuta: nessuna");
  expect(() => disegna(progetto, id, "fr" as "it", misura, carattere)).toThrow("lingua sconosciuta: fr");
  expect(() => disegna(progetto, id, "it", misura, carattere, { colori: "verde" as "tenue" })).toThrow("insieme di colori sconosciuto: verde");
  expect(() => disegna(progetto, id, "it", misura, carattere, { modo: "grayscale" as "grigi" })).toThrow("modo di colore sconosciuto: grayscale");
  // Controllo positivo: i tre modi veri passano.
  expect((["colori", "grigi", "bianco-e-nero"] as const).map((modo) => typeof disegna(progetto, id, "it", misura, carattere, { modo }).svg)).toEqual(["string", "string", "string"]);
  // L'altezza e la larghezza sono quelle del disegno, e l'SVG le scrive.
  const r = disegna(progetto, id, "it", misura, carattere);
  expect(r.svg).toContain(`width="${r.larghezza}" height="${r.altezza}"`);
});
