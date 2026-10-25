import { expect, test } from "bun:test";
import { livelliMassimi, motivi } from "../core/progetto/formato";
import { testiDeiMotivi } from "./motivi";

// Il tipo vuole ogni motivo; qui l'appaiamento a esecuzione, sugli elementi e nei due versi, col conteggio
// accanto (un nome scritto male non cambierebbe il numero).
test("ogni motivo d'apertura ha un testo italiano e uno inglese, e nessun testo è senza motivo", () => {
  const appaia = (chiavi: readonly string[]) => ({ senzaTesto: motivi.filter((m) => !chiavi.includes(m)), senzaMotivo: chiavi.filter((c) => !(motivi as readonly string[]).includes(c)) });
  for (const lingua of ["it", "en"] as const) {
    const chiavi = Object.keys(testiDeiMotivi[lingua]);
    console.log(`motivi d'apertura: ${motivi.length}; testi in «${lingua}»: ${chiavi.length}`);
    expect(appaia(chiavi)).toEqual({ senzaTesto: [], senzaMotivo: [] });
    for (const m of motivi) expect(testiDeiMotivi[lingua][m].trim().length).toBeGreaterThan(10);
  }
  for (const m of motivi) expect(testiDeiMotivi.it[m]).not.toBe(testiDeiMotivi.en[m]);
  expect(motivi.length).toBe(14);
  // Il testo del tetto dei livelli dice il numero del lettore.
  for (const lingua of ["it", "en"] as const) expect(testiDeiMotivi[lingua].too_deep).toContain(` ${livelliMassimi} `);
  // Controllo positivo: una chiave tolta e una battuta male si vedono, ognuna nel suo verso.
  const rotte = Object.keys(testiDeiMotivi.it).filter((k) => k !== "duplicate_key").concat("duplicate_keys");
  expect(appaia(rotte)).toEqual({ senzaTesto: ["duplicate_key"], senzaMotivo: ["duplicate_keys"] });
});
