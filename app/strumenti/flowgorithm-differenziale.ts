// Il test differenziale sui progetti convertiti dal corpus dei file di Flowgorithm (`casi-flowgorithm/`): ogni file che
// si converte (senza la rinomina, o con la rinomina quando l'elenco lo dice) diventa un `.algo` con un caso d'uso, che ha
// per atteso l'output confermato su Flowgorithm nella forma di AlgoDesign («algodesign» dell'elenco) e gli avvisi del
// controllo statico; i `.algo` si scrivono in `.collaudo/flowgorithm/` e si danno al differenziale di sempre
// (`strumenti/differenziale.ts`: l'interprete, il Python e il C generati, nelle due lingue del codice).
//
//   bun ./strumenti/flowgorithm-differenziale.ts
//
// Il controllo positivo: i file entrati nel differenziale (la riga `differenziale: file N` che stampa) sono quanti
// l'elenco dice che si convertono, col conteggio confermato da `core/lettore/casi-flowgorithm.test.ts`
// («flowgorithm - esiti sul corpus»: `converte` più `convertonoConLaRinomina`). Esce con 1 se il differenziale esce con
// 1, se un file non si converte, o se il numero dei file non torna.
//
// Che cosa NON guarda: i file che si fermano (non c'è un progetto da eseguire); gli avvisi della compilazione, che il
// differenziale controlla per conto suo.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../core/controllo/controllo";
import { leggiFlowgorithm } from "../core/lettore/flowgorithm";
import { salva } from "../core/progetto/formato";
import { confermato, radiceDellApp } from "./corpus";

type Esito = { esito: "converte"; algodesign: string } | { esito: "si ferma" };
type Voce = Esito & { file: string; rinomina?: Esito };

const cartella = join(radiceDellApp, "casi-flowgorithm");
const uscita = join(radiceDellApp, ".collaudo", "flowgorithm");
const elenco = (JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8")) as { file: Voce[] }).file;
rmSync(uscita, { recursive: true, force: true });
mkdirSync(uscita, { recursive: true });

const scritti: string[] = [];
let problemi = 0;
for (const v of elenco) {
  const rinomina = v.esito !== "converte" && v.rinomina?.esito === "converte";
  const atteso = v.esito === "converte" ? v : rinomina ? (v.rinomina as Extract<Esito, { esito: "converte" }>) : undefined;
  if (atteso === undefined) continue;
  const c = leggiFlowgorithm(readFileSync(join(cartella, v.file), "utf8"), { rinomina });
  if (!c.ok) {
    console.log(`PROBLEMA ${v.file} non si converte: ${JSON.stringify(c.messaggio)}`);
    problemi++;
    continue;
  }
  const controllo = controlla(c.progetto, tetti);
  const avvisi = controllo.fuoriTappa ? [] : controllo.avvisi;
  const progetto = { ...c.progetto, test_cases: [{ name: "oracolo", description: "L'output confermato su Flowgorithm 4.5", inputs: [], expected: { output: atteso.algodesign, ...(avvisi.length > 0 ? { warnings: avvisi } : {}) } }] };
  const percorso = join(uscita, v.file.replace(/\.fprg$/, ".algo"));
  writeFileSync(percorso, salva(progetto));
  scritti.push(percorso);
}
const attesi = confermato("flowgorithm - esiti sul corpus", { converte: 0, convertonoConLaRinomina: 0 } as { converte: number; convertonoConLaRinomina: number });
const quanti = attesi.converte + attesi.convertonoConLaRinomina;
console.log(`FLOWGORITHM: ${scritti.length} .algo scritti in ${uscita}, attesi ${quanti} (confermati: converte ${attesi.converte}, con la rinomina ${attesi.convertonoConLaRinomina}); problemi ${problemi}`);

const p = Bun.spawn({ cmd: [process.execPath, "./strumenti/differenziale.ts", ...scritti], cwd: radiceDellApp, stdout: "pipe", stderr: "inherit" });
const testo = await new Response(p.stdout).text();
process.stdout.write(testo);
const uscitaDelDifferenziale = await p.exited;
const file = Number(/^differenziale: file (\d+),/m.exec(testo)?.[1] ?? "-1");
const verde = uscitaDelDifferenziale === 0 && problemi === 0 && file === quanti && scritti.length === quanti;
console.log(`FLOWGORITHM: ${verde ? "VERDE" : "ROSSO"} | differenziale exit ${uscitaDelDifferenziale}, file nel differenziale ${file}, attesi ${quanti}, problemi ${problemi}`);
process.exit(verde ? 0 : 1);
