// Il nome che l'app propone per un file del progetto, del codice o della tabella, e quando lo dice prima della finestra
// del sistema: le regole dei nomi le prova sulla tabella comune col guscio `esempi.test.ts`.
import { expect, test } from "bun:test";
import { linguaggi } from "../core/genera/linguaggi";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { baseDelNome, baseProposta, esempioValido, motivoDelCambio, nomeCambiato, nomeDiFileValido, nomeRiservato, senzaVietati } from "./nomi";

/** Per ogni nome di progetto: la base proposta, e se il nome cambia. */
const casi: readonly (readonly [string, string, boolean])[] = [
  ["Media dei voti", "Media dei voti", false],
  ["  Media dei voti  ", "Media dei voti", false],
  ["Media: voti?", "Media voti", true],
  ["con", "con (2)", true],
  ["Nul", "Nul (2)", true],
  ["COM1", "COM1 (2)", true],
  ["CON.x", "CON_x", true],
  ["console", "console", false],
  ["..nascosto", "nascosto", true],
  [`Voti${String.fromCharCode(0x7f, 0x85, 0x9f)}`, "Voti", true],
  ["a/b", "ab", true],
  ['"*"', "progetto", true],
  ["", "progetto", false],
  ["   ", "progetto", false],
];

test("il nome proposto toglie i caratteri vietati e invisibili, evita i nomi riservati, e dice quando cambia", () => {
  const visti = casi.map(([progetto]) => {
    const base = baseProposta(progetto, it.ripiegoDelNomeDelFile);
    return [progetto, base, nomeCambiato(progetto, base)] as const;
  });
  expect(visti).toEqual([...casi]);
  // Ogni nome proposto, con ognuna delle estensioni (il progetto, la tabella, il codice di ogni linguaggio del registro),
  // è un nome che Windows ammette e che non è riservato.
  for (const [, base] of casi) for (const estensione of [".algo", ".csv", ...linguaggi.map((v) => v.estensione)]) expect({ file: base + estensione, riservato: nomeRiservato(base + estensione) }).toEqual({ file: base + estensione, riservato: false });
  for (const [, base] of casi) expect({ base, valido: esempioValido(`${base}.algo`) }).toEqual({ base, valido: true });
  // La base per la tabella e per gli esempi non aggiunge «(2)»: la tabella ha davanti «Tabella di», e gli esempi lo
  // aggiungono da sé fra i nomi che ci sono (`nomeLibero`).
  expect(baseDelNome("con", it.ripiegoDelNomeDelFile)).toBe("con");
});

test("il nome scritto nell'avviso segue le regole del guscio, e l'avviso dice perché il nome cambia", () => {
  const buoni = ["con (2)", "Media voti", "progetto", "a.b", "è"];
  const cattivi = ["", " ", " x", "x ", "x.", ".x", "a:b", "a?", `a${String.fromCharCode(0x85)}`, "con", "NUL", "com1", "lpt9"];
  for (const b of buoni) expect({ b, valido: nomeDiFileValido(b, ".py") }).toEqual({ b, valido: true });
  for (const c of cattivi) expect({ c, valido: nomeDiFileValido(c, ".py") }).toEqual({ c, valido: false });
  // Ogni nome proposto passa la regola del campo: l'avviso non si apre con «Continua» spento.
  for (const [progetto] of casi) expect({ progetto, valido: nomeDiFileValido(baseProposta(progetto, en.ripiegoDelNomeDelFile), ".algo") }).toEqual({ progetto, valido: true });
  expect(["con", "CON.x", "con:", "Media: voti?", "a/b"].map(motivoDelCambio)).toEqual(["riservato", "riservato", "riservato", "caratteri", "caratteri"]);
  expect(senzaVietati(' ..Media: "voti"? ')).toBe("Media voti");
  expect(baseProposta("", en.ripiegoDelNomeDelFile)).toBe("project");
});
