// Le righe con cui la riga di comando dice l'esito di un caso eseguito: le stampano `bun run casi` e il test
// differenziale, che le precede col nome dell'esecutore.
// - `VERDE <chi>`: raggiunto, con gli avvisi attesi;
// - `AVVISI DIVERSI <chi>: output ed errori come attesi`, seguita dalla riga `  avvisi: attesi …, ottenuti …`;
// - `ROSSO <chi> [campi]`: non raggiunto, seguita da una riga per campo con l'atteso e l'ottenuto (un output ottenuto
//   tenuto fino al margine lo dice: «(tagliato a N caratteri)») e, se anche gli avvisi sono diversi, dalla riga degli
//   avvisi.

import type { EsitoDelCaso } from "../core/casi/esito";

export type EsitoEseguito = Extract<EsitoDelCaso, { fuoriTappa: false }>;

export function righeDellEsito(chi: string, esito: EsitoEseguito): { genere: "verde" | "avvisi diversi" | "rosso"; righe: string[] } {
  const avvisi = esito.avvisi ? [`  avvisi: attesi ${JSON.stringify(esito.avvisi.attesi)}, ottenuti ${JSON.stringify(esito.avvisi.ottenuti)}`] : [];
  if (!esito.raggiunto)
    return {
      genere: "rosso",
      righe: [
        `ROSSO ${chi} [${esito.differenze.map((d) => d.campo).join(", ")}]`,
        ...esito.differenze.map((d) => `  ${d.campo}: atteso ${JSON.stringify(d.atteso)}, ottenuto ${JSON.stringify(d.ottenuto)}${d.tagliato ? ` (tagliato a ${d.ottenuto.length} caratteri)` : ""}`),
        ...avvisi,
      ],
    };
  if (esito.avvisi) return { genere: "avvisi diversi", righe: [`AVVISI DIVERSI ${chi}: output ed errori come attesi`, ...avvisi] };
  return { genere: "verde", righe: [`VERDE ${chi}`] };
}
