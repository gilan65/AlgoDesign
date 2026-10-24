// Il nome dell'evento di chiusura è scritto in due lingue: nel guscio (Rust, che lo manda alla pagina) e qui
// nell'interfaccia (che lo ascolta). Questa prova li appaia: il guscio deve mandare esattamente l'evento che
// l'interfaccia ascolta, una volta sola.
//
// CHE COSA NON GUARDA: un evento mandato in un'altra forma (`emit`, `CustomEvent`, `new Event("…")` con le
// virgolette doppie): il rilevatore riconosce una sola forma, `dispatchEvent(new Event('…'))`, e «una volta
// sola» conta le occorrenze di quella forma, non gli invii. Se la forma di oggi cambia, il conteggio va a zero
// e la prova è rossa; un secondo invio in un'altra forma non si vede.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { eventoDiChiusura } from "./file";

test("il guscio manda alla pagina l'evento di chiusura che l'interfaccia ascolta", () => {
  const guscio = readFileSync(new URL("../shell/src/progetto.rs", import.meta.url), "utf8");
  const mandati = [...guscio.matchAll(/dispatchEvent\(new Event\('([^']*)'\)\)/g)].map((m) => m[1]);
  // Controllo positivo nel numero: il rilevatore trova l'unico evento che il guscio manda.
  expect(mandati).toHaveLength(1);
  expect(mandati[0]).toBe(eventoDiChiusura);
});
