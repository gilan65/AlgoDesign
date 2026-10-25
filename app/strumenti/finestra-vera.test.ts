// Lo strumento della finestra vera (`finestra-vera.ts`): ogni guasto è un esito «NON inviato», che la prova sul prodotto
// confronta col solo esito atteso. Gli interpreti finti sono script eseguiti da Bun al posto della PowerShell: uno che non
// stampa nulla, uno che non risponde in tempo, uno che stampa due righe (il controllo positivo: le righe arrivano). Su
// Windows anche la PowerShell vera con lo script vero, su un processo senza finestra (questo); fuori da Windows la
// PowerShell non c'è, e anche quello è un «NON inviato».
//
// CHE COSA NON GUARDA:
// - il messaggio che Windows rifiuta (`PostMessage` che risponde no, «NON inviato: PostMessage ha rifiutato…»): si
//   provocherebbe solo con una finestra che sparisce fra la ricerca e il messaggio;
// - gli esiti con l'app vera («inviato», «chiusura spedita», «libera», «salvato»): li dà la prova sul prodotto.
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finestraVera } from "./finestra-vera";

const cartella = mkdtempSync(join(tmpdir(), "finestra-vera-"));
afterAll(() => rmSync(cartella, { recursive: true, force: true }));
const script = (nome: string, corpo: string) => {
  const p = join(cartella, nome);
  writeFileSync(p, corpo);
  return p;
};
const bun = { interprete: [process.execPath] };
const riusciti = ["inviato", "chiusura spedita", "libera", "salvato"];

test("uno script che non stampa l'esito dà «senza esito» col suo errore, e uno che non risponde dà «non ha risposto»", async () => {
  const muto = await finestraVera(1, "tasto", "f5", { ...bun, script: script("muto.ts", `console.error("Add-Type: guasto finto"); process.exit(1);`) });
  expect(muto).toEqual({ esito: "NON inviato: PowerShell senza esito (exit 1): Add-Type: guasto finto", righe: [] });
  const lento = await finestraVera(1, "chiudi", undefined, { ...bun, script: script("lento.ts", `await Bun.sleep(3_000);`), limiteMs: 500 });
  expect(lento).toEqual({ esito: "NON inviato: PowerShell non ha risposto in 0.5 s", righe: [] });
  // Controllo positivo: le righe stampate arrivano tutte, e gli argomenti nell'ordine dello script vero.
  const parla = await finestraVera(42, "salva", "C:\\prova\\media.csv", { ...bun, script: script("parla.ts", `console.log("salvato"); console.log("proposto: " + process.argv.slice(2).join(" "));`) });
  expect(parla).toEqual({ esito: "salvato", righe: ["salvato", "proposto: 42 salva C:\\prova\\media.csv"] });
});

test("su un processo senza finestra ogni azione è «NON inviato», mai uno degli esiti riusciti", async () => {
  for (const [azione, argomento] of [["tasto", "f5"], ["chiudi", undefined], ["coperta", undefined]] as const) {
    const { esito } = await finestraVera(process.pid, azione, argomento);
    expect(riusciti).not.toContain(esito);
    expect(esito).toStartWith(process.platform === "win32" ? `NON inviato: nessuna finestra visibile del PID ${process.pid}` : "NON inviato: ");
  }
}, 60_000);
