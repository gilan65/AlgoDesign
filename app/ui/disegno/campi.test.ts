import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sottoblocchi } from "../../core/modifica/identificatori";
import { apri } from "../../core/progetto/formato";
import type { Blocco } from "../../core/progetto/modello";
import { nomiDegliOperatori } from "../../i18n/operatori";
import { bozzaDi, campiDaBozza, nellaFormaDelFile, passoDelCampo, stessiCampi } from "./campi";

// I campi di ogni blocco del corpus, mostrati nella lingua dell'interfaccia e riportati alla forma del
// file, tornano uguali a quelli del file: in italiano (dove gli operatori cambiano nome) e in inglese. Ogni blocco
// che l'editor inserisce ha i suoi campi (i due cicli compresi); le chiamate no (sono delle tappe dopo).
//
// Che cosa NON guarda: un testo scritto dall'utente con un operatore inglese in un'interfaccia italiana
// (resta com'è, ed è giusto: è già la forma del file); la sintassi dei testi (è del controllo statico).

const casi = join(import.meta.dir, "..", "..", "casi");
const blocchi: Blocco[] = [];
const visita = (b: Blocco): void => {
  blocchi.push(b);
  sottoblocchi(b).forEach(visita);
};
let file = 0;
for (const tappa of readdirSync(casi).filter((d) => d.startsWith("tappa-")))
  for (const f of readdirSync(join(casi, tappa))) {
    const esito = apri(readFileSync(join(casi, tappa, f), "utf8"));
    if (!esito.ok) throw new Error(`${f} non si apre`);
    file++;
    esito.progetto.functions.forEach((fn) => fn.body.forEach(visita));
  }

test("i campi di ogni blocco del corpus vanno nella lingua dell'interfaccia e tornano alla forma del file", () => {
  const diversi: string[] = [];
  let modificabili = 0;
  let tradotti = 0;
  const cicli = { per: 0, perOgni: 0, conPasso: 0 };
  for (const b of blocchi) {
    const inglese = bozzaDi(b, nomiDegliOperatori.en);
    if (!inglese) continue;
    modificabili++;
    if (b.kind === "for") cicli.per++;
    if (b.kind === "for" && b.step !== undefined) cicli.conPasso++;
    if (b.kind === "for_each") cicli.perOgni++;
    const nelFile = campiDaBozza(inglese, nomiDegliOperatori.en);
    for (const lingua of ["it", "en"] as const) {
      const bozza = bozzaDi(b, nomiDegliOperatori[lingua])!;
      if (JSON.stringify(bozza) !== JSON.stringify(inglese)) tradotti++;
      const ritorno = campiDaBozza(bozza, nomiDegliOperatori[lingua]);
      if (ritorno === undefined || JSON.stringify(ritorno) !== JSON.stringify(nelFile) || !stessiCampi(b, ritorno)) diversi.push(`${lingua} ${b.id} ${JSON.stringify(ritorno)}`);
    }
  }
  const chiamate = blocchi.filter((b) => b.kind === "call").length;
  console.log(
    `campi dei blocchi: file ${file}, blocchi ${blocchi.length}, modificabili ${modificabili} (per ${cicli.per}, di cui col passo ${cicli.conPasso}; per ogni ${cicli.perOgni}), chiamate ${chiamate}, con operatori tradotti ${tradotti}, diversi al ritorno ${diversi.length}`,
  );
  expect(diversi).toEqual([]);
  // Le premesse: il corpus intero, ogni blocco ha i suoi campi (anche i due cicli, col passo e senza, e i salti, che
  // ci sono), e blocchi in cui la lingua cambia davvero il testo.
  expect(file).toBe(145);
  expect([modificabili, chiamate > 0]).toEqual([blocchi.length, true]);
  expect([cicli.per > cicli.conPasso, cicli.conPasso > 0, cicli.perOgni > 0]).toEqual([true, true, true]);
  expect(tradotti).toBeGreaterThan(10);

  // Controllo positivo: senza il nome italiano di `to_real`, il ritorno di un blocco che lo usa è diverso.
  const { to_real: _, ...senza } = nomiDegliOperatori.it;
  const rotti = { ...senza, to_real: "converti_in_reale" };
  const conToReal = blocchi.find((b) => b.kind === "assignment" && b.value.includes("to_real"))!;
  expect(campiDaBozza(bozzaDi(conToReal, nomiDegliOperatori.it)!, rotti)).not.toEqual(bozzaDi(conToReal, nomiDegliOperatori.en));
});

test("si riportano alla forma del file solo le parole che sono operatori: non i letterali, non i nomi che li contengono", () => {
  const it = nomiDegliOperatori.it;
  expect(nellaFormaDelFile('converti_a_reale somma / lunghezza "lunghezza"', it)).toBe('to_real somma / length "lunghezza"');
  expect(nellaFormaDelFile("converti_a_reale_x + pi_greco", it)).toBe("converti_a_reale_x + pi");
  // Un testo che non si lascia dividere in parole resta com'è (l'errore lo dice il controllo).
  expect(nellaFormaDelFile('"senza chiusura lunghezza', it)).toBe('"senza chiusura lunghezza');
});

test("confermare i campi che il blocco ha già non è un cambiamento", () => {
  const b: Blocco = { id: "b1", kind: "write", values: ["a", "b"], newline: true };
  expect(stessiCampi(b, { values: ["a", "b"], newline: true })).toBe(true);
  expect(stessiCampi(b, { values: ["a", "b"], newline: false })).toBe(false);
  expect(stessiCampi(b, { values: ["a"], newline: true })).toBe(false);
  // Il passo: vuoto (`null`) e 1 sono lo stesso `per`, scritto o no nel file.
  const senzaPasso: Blocco = { id: "b2", kind: "for", counter: "i", from: "1", to: "n", body: [] };
  const conUno: Blocco = { ...senzaPasso, step: 1 };
  for (const passo of [null, 1]) expect([stessiCampi(senzaPasso, { counter: "i", step: passo }), stessiCampi(conUno, { counter: "i", step: passo })]).toEqual([true, true]);
  expect(stessiCampi(senzaPasso, { counter: "i", step: -1 })).toBe(false);
  expect(stessiCampi({ ...senzaPasso, step: -1 }, { counter: "i", step: null })).toBe(false);
});

test("ogni campo dei due cicli torna alla forma del file, anche quelli che nel corpus non hanno un operatore a parola", () => {
  // Nel corpus solo l'inizio di un `per` ha un operatore a parola («length»): qui ogni campo ne ha uno.
  const it = nomiDegliOperatori.it;
  const per: Blocco = { id: "b1", kind: "for", counter: "i", from: "length s - 1", to: "length t", step: -1, body: [] };
  const perOgni: Blocco = { id: "b2", kind: "for_each", item: "c", source: "s", body: [] };
  const bozza = bozzaDi(per, it)!;
  expect(bozza.from).not.toBe(per.from);
  expect(bozza.to).not.toBe(per.to);
  expect(campiDaBozza(bozza, it)).toEqual({ counter: "i", from: "length s - 1", to: "length t", step: -1 });
  expect(campiDaBozza(bozzaDi(perOgni, it)!, it)).toEqual({ item: "c", source: "s" });
});

test("il passo scritto nel campo: vuoto è il passo 1, un intero col suo segno è quel numero, altro non si scrive nel file", () => {
  const visti = ["", "  ", "1", "-1", " 3 ", "0", "-0", "99999999999", "1.5", "-", "+2", "n", "1e3", "2 3", "9007199254740993", "01", "010", "-01", "00"].map((t) => [t, passoDelCampo(t)]);
  expect(visti).toEqual([
    ["", null],
    ["  ", null],
    ["1", 1],
    ["-1", -1],
    [" 3 ", 3],
    ["0", 0],
    ["-0", -0],
    ["99999999999", 99999999999],
    ["1.5", undefined],
    ["-", undefined],
    ["+2", undefined],
    ["n", undefined],
    ["1e3", undefined],
    ["2 3", undefined],
    ["9007199254740993", undefined],
    ["01", undefined],
    ["010", undefined],
    ["-01", undefined],
    ["00", undefined],
  ]);
  // Un passo che non si scrive nel file: i campi non si confermano.
  expect(campiDaBozza({ counter: "i", from: "1", to: "n", step: "due" }, nomiDegliOperatori.it)).toBeUndefined();
  expect(campiDaBozza({ counter: "i", from: "1", to: "n", step: "" }, nomiDegliOperatori.it)).toEqual({ counter: "i", from: "1", to: "n", step: null });
});
