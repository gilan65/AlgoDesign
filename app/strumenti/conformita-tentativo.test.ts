// Il tentativo in più del lato di Node nella prova del nucleo: solo sul codice della caduta, una volta sola, e si dice. Un finto
// lato al posto del processo: la stessa funzione decide l'esito vero, e il codice della caduta non si ottiene a comando. A parte
// da `conformita-del-nucleo.test.ts` perché qui il corpus non si legge, e i numeri sono i giri del finto lato.

import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conUnTentativoInPiu } from "./conformita-del-nucleo";

const cartella = mkdtempSync(join(tmpdir(), "conformita-tentativo-"));
afterAll(() => rmSync(cartella, { recursive: true, force: true }));

const CADUTA = -1073740791;
const ERRORE = "Assertion failed: UV_HANDLE_CLOSING\n";
const uscita = join(cartella, "lato.json");

/** Il finto lato: un'uscita per giro, e il file col numero del giro, tranne dove il giro non lo scrive. */
async function prova(uscite: readonly { codice: number; scrive?: false }[]) {
  rmSync(uscita, { force: true });
  let giri = 0;
  const avvisi: string[] = [];
  const giro = async () => {
    const u = uscite[giri++]!;
    if (u.scrive !== false) writeFileSync(uscita, JSON.stringify({ giro: giri }));
    return { codice: u.codice, err: ERRORE };
  };
  const esito = await conUnTentativoInPiu("il lato", giro, uscita, (r) => avvisi.push(r)).then(
    (dati) => ({ dati }),
    (e: Error) => ({ fermo: e.message }),
  );
  return { esito, giri, avvisi };
}

test("nessuna caduta: un giro, nessun avviso", async () => {
  expect(await prova([{ codice: 0 }])).toEqual({ esito: { dati: { giro: 1 } }, giri: 1, avvisi: [] });
});

test("cade una volta: verde al secondo giro, coi dati del secondo e la riga col suo errore intero", async () => {
  expect(await prova([{ codice: CADUTA }, { codice: 0 }])).toEqual({
    esito: { dati: { giro: 2 } },
    giri: 2,
    avvisi: [`il lato: Node è caduto all'uscita (${CADUTA}), secondo e ultimo tentativo; il suo errore: ${JSON.stringify(ERRORE)}`],
  });
  // Lo stesso codice senza segno, come può darlo Bun.
  expect((await prova([{ codice: 3221226505 }, { codice: 0 }])).giri).toBe(2);
});

test("cade due volte: fermo con le sue parole, nessun terzo giro", async () => {
  const due = await prova([{ codice: CADUTA }, { codice: CADUTA }, { codice: 0 }]);
  expect(due.giri).toBe(2);
  expect(due.esito).toEqual({ fermo: `FERMO: il lato: Node è caduto all'uscita due volte di seguito (${CADUTA}), non si è misurato nulla; l'ultimo errore: ${JSON.stringify(ERRORE)}` });
});

test("un'altra uscita: rosso subito, nessun secondo giro, nessun avviso", async () => {
  expect(await prova([{ codice: 1 }, { codice: 0 }])).toEqual({
    esito: { fermo: "FERMO: il lato esce 1 e non si è misurato nulla: Assertion failed: UV_HANDLE_CLOSING" },
    giri: 1,
    avvisi: [],
  });
});

test("il secondo giro non si appoggia al file del primo", async () => {
  // Esce con un'altra uscita: resta rosso.
  expect((await prova([{ codice: CADUTA }, { codice: 1, scrive: false }])).esito).toEqual({ fermo: "FERMO: il lato esce 1 e non si è misurato nulla: Assertion failed: UV_HANDLE_CLOSING" });
  // Esce con 0 senza scrivere: il file del primo è stato tolto, e il fermo lo dice.
  expect((await prova([{ codice: CADUTA }, { codice: 0, scrive: false }])).esito).toEqual({ fermo: "FERMO: il lato esce 0 e non si è misurato nulla: Assertion failed: UV_HANDLE_CLOSING" });
});
