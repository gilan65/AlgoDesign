// Il `Disegno` del nucleo rifatto in una prova con la misura del testo del motore, comune agli spec che confrontano
// l'SVG del nucleo con ciò che il motore mostra (`flowchart-in-svg.e2e.ts`, `esporta.e2e.ts`, e la prova sul prodotto
// nella lingua dell'app): l'impaginazione chiede le stringhe, la pagina le misura col canvas e col carattere del tema
// (come `ui/disegno/misura.ts`), e si rifà in passate finché non ne manca nessuna.
import type { Page } from "@playwright/test";
import { impagina, opzioniPredefinite, type Disegno, type MisuraDelTesto, type OpzioniDelDisegno, type StileDelTesto } from "../core/disegno/impaginazione";
import { geometriaPredefinita as tema } from "../core/disegno/tema";
import type { Dato, DefinizioneDelRecord, Funzione } from "../core/progetto/modello";
import type { Lingua } from "../i18n/lingue";
import { testiDelDisegno } from "../ui/disegno/testi";

/** `records`, i record del progetto: senza, la copia di un record o di una tabella si disegna come un'assegnazione. */
export async function disegnoNelMotore(
  page: Page,
  funzione: Funzione,
  comuni: readonly Dato[],
  funzioni: readonly Funzione[],
  opzioni: OpzioniDelDisegno = opzioniPredefinite,
  lingua: Lingua = "it",
  records: readonly DefinizioneDelRecord[] = [],
): Promise<Disegno> {
  const note = new Map<string, number>();
  for (let passata = 0; passata < 10; passata++) {
    const mancanti = new Map<string, readonly [string, StileDelTesto | undefined]>();
    const misura: MisuraDelTesto = (t, s) => {
      const k = `${s ?? ""}|${t}`;
      const w = note.get(k);
      if (w === undefined) mancanti.set(k, [t, s]);
      return w ?? 0;
    };
    const d = impagina(funzione, tema, misura, testiDelDisegno(lingua), opzioni, comuni, funzioni, records);
    if (mancanti.size === 0) return d;
    const larghezze = await page.evaluate(
      ({ richieste, dimensione }) => {
        const famiglia = getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim();
        const davanti: Record<string, string> = { normale: "", grassetto: "bold ", corsivo: "italic " };
        const contesto = document.createElement("canvas").getContext("2d")!;
        return richieste.map(([t, s]) => {
          contesto.font = `${davanti[s ?? "normale"]}${dimensione}px ${famiglia}`;
          return contesto.measureText(t).width;
        });
      },
      { richieste: [...mancanti.values()], dimensione: tema.carattere },
    );
    [...mancanti.keys()].forEach((k, i) => note.set(k, larghezze[i]!));
  }
  throw new Error("la misura del testo non si ferma in 10 passate");
}
