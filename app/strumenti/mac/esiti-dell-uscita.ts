// Il controllo degli esiti della prova dell'uscita sul Mac (`prova-uscita.sh`): ogni riga «caso: esito (attesa: …)» col
// suo atteso, e i casi tutti: un caso che non è partito non ha la riga, e il conteggio lo dice.
// Uso: `bun ./strumenti/mac/esiti-dell-uscita.ts <esiti.txt>`: esce 0 se è verde, 1 se è rosso, 2 per un uso sbagliato.
//
// Che cosa NON guarda: che i gesti siano arrivati a ciò che dovevano toccare (lo prova «Don't save», che esce solo da una
// domanda in primo piano); le fotografie, che si guardano.

import { readFileSync } from "node:fs";

/** I casi della prova, tutti, col loro atteso: dieci gesti, quattro «Don't save» dopo il menu, AppleScript, l'app nascosta e
 * ⌘W, le due barre dei menu, copia e incolla in un campo. L'atteso che lo script scrive accanto all'esito deve essere questo:
 * uno cambiato nello script (per un refuso, o per far tacere un rosso) è rosso. */
export const attesiDellUscita: Readonly<Record<string, string>> = {
  "senza-modifiche": "morta",
  "barra-inglese": "Apple, AlgoDesign, Edit, Window",
  cmdq: "viva",
  "cmdq-esc": "viva",
  "cmdq-di-nuovo": "viva",
  "cmdq-non-salvare": "morta",
  menu: "viva",
  "menu-non-salvare": "morta",
  applescript: "viva",
  "applescript-non-salvare": "morta",
  nascosta: "viva",
  "nascosta-non-salvare": "morta",
  cmdw: "viva",
  "cmdw-non-salvare": "morta",
  campi: "«abcabc»",
  "barra-italiana": "Apple, AlgoDesign, Modifica, Finestra",
};
export const casiDellUscita: readonly string[] = Object.keys(attesiDellUscita);

export type EsitoDellUscita = { rossi: string[]; visti: number };

/** Il confronto, sul testo di `esiti.txt`. Un caso che non è partito ha la riga «caso: NON PARTITA» senza atteso. */
export function controllaGliEsiti(testo: string): EsitoDellUscita {
  const rossi: string[] = [];
  const visti = new Set<string>();
  for (const riga of testo.split("\n").map((r) => r.trim()).filter((r) => r !== "")) {
    const m = /^([^:]+): (.*) \(attes[ao]: (.*)\)$/u.exec(riga);
    if (m === null) {
      rossi.push(`riga senza atteso: «${riga}»`);
      continue;
    }
    const [, caso, esito, atteso] = m as unknown as [string, string, string, string];
    if (!casiDellUscita.includes(caso)) rossi.push(`caso che l'elenco non conosce: «${caso}»`);
    else if (atteso !== attesiDellUscita[caso]) rossi.push(`${caso}: lo script si aspetta «${atteso}» invece di «${attesiDellUscita[caso]}»`);
    if (visti.has(caso)) rossi.push(`caso ripetuto: «${caso}»`);
    visti.add(caso);
    if (esito !== atteso) rossi.push(`${caso}: ${esito} invece di ${atteso}`);
  }
  for (const caso of casiDellUscita) if (!visti.has(caso)) rossi.push(`manca il caso «${caso}»`);
  return { rossi, visti: visti.size };
}

if (import.meta.main) {
  const file = process.argv[2];
  if (file === undefined || process.argv.length !== 3) {
    console.error("uso: esiti-dell-uscita <esiti.txt>");
    process.exit(2);
  }
  const { rossi, visti } = controllaGliEsiti(readFileSync(file, "utf8"));
  for (const r of rossi) console.log(`ROSSO: ${r}`);
  console.log(`${visti} casi visti su ${casiDellUscita.length}, ${rossi.length} rossi`);
  process.exit(rossi.length === 0 ? 0 : 1);
}
