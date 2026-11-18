// I permessi delle voci di un archivio per Linux (`archivio.ts`): le cartelle 0755, i file 0644, l'eseguibile 0755. A sé,
// perché `archivio.ts` esegue all'avvio e una prova non lo può importare.

/** Una voce letta dall'archivio: il nome, il tipo («d» cartella, «f» file, «altro») e i permessi come li scrive Python
 * (`0o755`). */
export type VoceLetta = readonly [nome: string, tipo: string, modo: string];

/** Un nome dello zip del Mac che è un file di attributi del Mac: una sua parte comincia con «._» o è `__MACOSX`. Lo usano
 * il rilevatore dell'archivio e il suo controllo positivo, così non possono divergere. */
export const degliAttributiDelMac = (nome: string): boolean => nome.split("/").some((c) => c.startsWith("._") || c === "__MACOSX");

/** Le voci coi permessi diversi da quelli attesi: cartelle 0755, file 0644, l'eseguibile (per nome) 0755. */
export function permessiDiversi(lette: readonly VoceLetta[], eseguibile: string): string[] {
  return lette
    .filter(([nome, tipo, modo]) => tipo !== "altro" && modo !== (tipo === "d" || nome === eseguibile ? "0o755" : "0o644"))
    .map(([nome, tipo, modo]) => `${nome} (${tipo === "d" ? "cartella" : "file"}) ${modo}`);
}
