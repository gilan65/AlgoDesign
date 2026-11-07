// I permessi delle voci di un archivio per Linux (`archivio.ts`): le cartelle 0755, i file 0644, l'eseguibile 0755. A sé,
// perché `archivio.ts` esegue all'avvio e una prova non lo può importare.

/** Una voce letta dall'archivio: il nome, il tipo («d» cartella, «f» file, «altro») e i permessi come li scrive Python
 * (`0o755`). */
export type VoceLetta = readonly [nome: string, tipo: string, modo: string];

/** Le voci coi permessi diversi da quelli attesi: cartelle 0755, file 0644, l'eseguibile (per nome) 0755. */
export function permessiDiversi(lette: readonly VoceLetta[], eseguibile: string): string[] {
  return lette
    .filter(([nome, tipo, modo]) => tipo !== "altro" && modo !== (tipo === "d" || nome === eseguibile ? "0o755" : "0o644"))
    .map(([nome, tipo, modo]) => `${nome} (${tipo === "d" ? "cartella" : "file"}) ${modo}`);
}
