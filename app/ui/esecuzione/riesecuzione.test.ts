// Le parole di ogni motivo: l'elenco del nucleo appaiato con le voci, nei due versi e nelle due lingue, ognuna una frase sola di al più 80 caratteri.
//
// Che cosa NON guarda: che la finestra le mostri (`e2e/riesegui.e2e.ts`, per i motivi che si raggiungono con un gesto).
import { expect, test } from "bun:test";
import { en } from "../../i18n/en";
import { it } from "../../i18n/it";
import { paroleDelMotivo, paroleDelRifiuto } from "./riesecuzione";

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

test("ogni rifiuto di un valore scritto a mano ha le sue parole: i modelli col segnaposto che la finestra riempie, al più 80 caratteri", () => {
  const rifiuti = ["non_valido", "troppo_lungo", "costante", "caso", "non_ora", "funzione_non_attiva", "dato_sconosciuto", "elemento_sconosciuto"];
  expect(Object.keys(paroleDelRifiuto).sort()).toEqual([...rifiuti].sort());
  for (const lingua of [it, en]) {
    for (const k of Object.values(paroleDelRifiuto)) expect(lingua[k].length).toBeLessThanOrEqual(80);
    expect(lingua[paroleDelRifiuto.non_valido]).toContain("{testo}");
    for (const m of ["non_valido", "troppo_lungo", "costante", "non_ora"] as const) expect(lingua[paroleDelRifiuto[m]]).toContain("{dato}");
    expect(new Set(["non_valido", "troppo_lungo", "costante", "caso", "non_ora"].map((m) => lingua[paroleDelRifiuto[m as keyof typeof paroleDelRifiuto]])).size).toBe(5);
  }
});
