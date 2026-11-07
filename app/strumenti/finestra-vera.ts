// La finestra vera dell'app per la prova sul prodotto (`finestra-vera.ps1`, solo Windows): il messaggio di un tasto o
// della chiusura, i tasti veri col primo piano, lo stato della finestra (coperta o libera), il nome nella finestra del sistema per salvare. L'esito è
// la prima riga stampata dallo script; ogni guasto dello strumento diventa un esito «NON inviato: <perché>», che chi lo
// usa confronta con il solo esito atteso («inviato», «chiusura spedita», «libera», «salvato»): un gesto non eseguito
// non è mai un verde.
import { join } from "node:path";

export type AzioneDellaFinestra = "tasto" | "tasto-vero" | "chiudi" | "coperta" | "salva" | "salva-dai-figli";

export type OpzioniDellaFinestra = {
  /** Dove scrivere il comando e l'uscita (il log della prova). */
  log?: (testo: string) => void;
  /** L'interprete e lo script: predefiniti la PowerShell di Windows e `finestra-vera.ps1` (le prove li cambiano). */
  interprete?: string[];
  script?: string;
  /** Oltre questo tempo l'interprete si ferma, e l'esito lo dice (mai un'attesa senza fine). */
  limiteMs?: number;
};

export const powershell = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File"];

/** Lo script sulla finestra del processo: l'esito (la prima riga) e tutte le righe (dopo «salvato» c'è il nome
 * proposto). */
export async function finestraVera(pid: number, azione: AzioneDellaFinestra, argomento?: string, opzioni: OpzioniDellaFinestra = {}): Promise<{ esito: string; righe: string[] }> {
  const log = opzioni.log ?? (() => undefined);
  const limite = opzioni.limiteMs ?? 30_000;
  const cmd = [...(opzioni.interprete ?? powershell), opzioni.script ?? join(import.meta.dir, "finestra-vera.ps1"), String(pid), azione, ...(argomento === undefined ? [] : [argomento])];
  log(`$ ${cmd.join(" ")}`);
  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
  } catch (e) {
    return { esito: `NON inviato: l'interprete non parte (${String(e)})`, righe: [] };
  }
  const letto = Promise.all([new Response(proc.stdout as ReadableStream).text(), new Response(proc.stderr as ReadableStream).text(), proc.exited]).then(([out, err, codice]) => ({ out, err, codice }));
  const uscita = await Promise.race([letto, Bun.sleep(limite).then(() => null)]);
  if (uscita === null) {
    proc.kill();
    log(`(interprete fermato dopo ${limite / 1000} s)`);
    return { esito: `NON inviato: PowerShell non ha risposto in ${limite / 1000} s`, righe: [] };
  }
  log(`${uscita.out}${uscita.err}(PowerShell: exit ${uscita.codice})`);
  // Una PowerShell che non arriva a stampare l'esito (per esempio `Add-Type` che fallisce): il motivo è il suo errore.
  const righe = uscita.out.trim().split(/\r?\n/);
  const riga = righe[0] ?? "";
  return { esito: riga !== "" ? riga : `NON inviato: PowerShell senza esito (exit ${uscita.codice}): ${uscita.err.trim().split("\n")[0] ?? ""}`, righe: riga !== "" ? righe : [] };
}
