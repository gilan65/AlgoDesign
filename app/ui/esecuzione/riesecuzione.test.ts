// Le parole di ogni motivo: l'elenco del nucleo appaiato con le voci, nei due versi e nelle due lingue, ognuna una frase sola di al più 80 caratteri.
//
// Che cosa NON guarda: che la finestra le mostri (`e2e/riesegui.e2e.ts`, per i motivi che si raggiungono con un gesto).
import { expect, test } from "bun:test";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { paroleDelMotivo } from "./riesecuzione";

const motivi = ["posto_cancellato", "non_parte", "finito_prima", "riga_mancante", "riga_per_un_altro_dato", "riga_non_ammessa", "riga_ora_rifiutata", "riga_ora_valida", "modifica_persa", "modifica_rifiutata"];

test("ogni motivo ha le sue parole, diverse dalle altre, in italiano e in inglese", () => {
  expect(Object.keys(paroleDelMotivo).sort()).toEqual([...motivi].sort());
  for (const lingua of [it, en]) {
    const frasi = Object.values(paroleDelMotivo).map((k) => lingua[k]);
    expect(new Set(frasi).size).toBe(motivi.length);
    for (const f of frasi) {
      expect(f.length).toBeGreaterThan(0);
      expect(f.length).toBeLessThanOrEqual(80);
    }
  }
});
