// La chiusura automatica: la regola pura, tasto per tasto (le aperture, la chiusura che si scavalca, ⌫ fra le due, la
// selezione racchiusa, i letterali, le graffe solo nell'elenco), e chi la applica a un campo sotto happy-dom.
//
// CHE COSA NON GUARDA: il cursore e Ctrl+Z in un motore vero (happy-dom non ha il comando di modifica, e qui si prova la
// sua via di ripiego): li prova `e2e/espressioni.e2e.ts` in Chromium.
import { afterEach, expect, test } from "bun:test";
import { applicaLaChiusura, chiusura, contesto, segnoDellElenco, segnoDellEspressione } from "./chiusura";

/** Il testo dopo il tasto, col cursore segnato da `|` (e la selezione fra `⟪` e `⟫` prima); `=` se il tasto fa il solito. */
function dopo(prima: string, tasto: string, elenco = false): string {
  const scelta = prima.indexOf("⟪");
  const inizio = scelta >= 0 ? scelta : prima.indexOf("|");
  const testo = scelta >= 0 ? prima.replace("⟪", "").replace("⟫", "") : prima.replace("|", "");
  const fine = scelta >= 0 ? prima.indexOf("⟫") - 1 : inizio;
  const m = chiusura(testo, inizio, fine, tasto, elenco);
  if (m === undefined) return "=";
  if (m.genere === "salta") return `${testo.slice(0, m.cursore)}|${testo.slice(m.cursore)}`;
  const nuovo = testo.slice(0, m.da) + m.testo + testo.slice(m.a);
  return `${nuovo.slice(0, m.cursore)}|${nuovo.slice(m.cursore)}`;
}

test.each([
  // Le aperture si chiudono davanti alla fine, a uno spazio, a una chiusura, a una virgola.
  ["|", "(", "(|)"],
  ["somma + |", "(", "somma + (|)"],
  ["f(|)", "(", "f((|))"],
  ["v[|]", "[", "v[[|]]"],
  ["f(a|, b)", "(", "f(a(|), b)"],
  ["|", '"', '"|"'],
  ["|", "'", "'|'"],
  ["s + |", '"', 's + "|"'],
  // Davanti a una parola no: si sta per racchiudere ciò che c'è.
  ["|somma", "(", "="],
  ["|somma", '"', "="],
  // Un apice dopo una parola non apre un carattere.
  ["l|", "'", "="],
  // Dentro un letterale una parentesi è un carattere, e un apice in un testo l'apostrofo.
  ['"a|"', "(", "="],
  // Anche dove fuori si chiuderebbe: davanti a uno spazio, alla fine di un testo non chiuso, su una selezione.
  ['"a| b"', "(", "="],
  ['"a|', "(", "="],
  ['"a|', "[", "="],
  ['"⟪ab⟫"', "(", "="],
  ['"l|"', "'", "="],
  ["'|'", '"', "="],
  // La chiusura che c'è già si scavalca, anche quella di un letterale.
  ["(a|)", ")", "(a)|"],
  ["v[i|]", "]", "v[i]|"],
  ['"ciao|"', '"', '"ciao"|'],
  ["'a|'", "'", "'a'|"],
  // Ma non una chiusura che non c'è, né quella dopo una barra rovesciata (è una sequenza di escape).
  ["(a|", ")", "="],
  ["(a| )", ")", "="],
  ['"a\\|"', '"', "="],
  // ⌫ fra un'apertura e la sua chiusura, senza niente in mezzo, toglie la coppia.
  ["(|)", "Backspace", "|"],
  ["somma + [|]", "Backspace", "somma + |"],
  ['"|"', "Backspace", "|"],
  ["(a|)", "Backspace", "="],
  ["(|", "Backspace", "="],
  ['"(|)"', "Backspace", "="],
  // Una selezione si racchiude, anche con le virgolette.
  ["⟪somma⟫ + voto", "(", "(somma)| + voto"],
  ["v + ⟪i⟫", "[", "v + [i]|"],
  ["⟪ciao⟫", '"', '"ciao"|'],
  // Le graffe solo nel campo dell'elenco.
  ["|", "{", "="],
])("«%s» con %s → «%s»", (prima, tasto, atteso) => {
  expect(dopo(prima, tasto)).toBe(atteso);
});

test.each([
  ["|", "{", "{|}"],
  ["{1, 2|}", "}", "{1, 2}|"],
  ["{|}", "Backspace", "|"],
  ["⟪1, 2⟫", "{", "{1, 2}|"],
  ["{'a', |}", "'", "{'a', '|'}"],
  ['{"}|"}', "}", "="],
])("nell'elenco: «%s» con %s → «%s»", (prima, tasto, atteso) => {
  expect(dopo(prima, tasto, true)).toBe(atteso);
});

test("il contesto: dentro o fuori da un letterale, con le sequenze di escape", () => {
  expect(contesto('"a', 2)).toEqual({ aperto: '"', dopoLaBarra: false });
  expect(contesto('"a"', 3)).toEqual({ aperto: null, dopoLaBarra: false });
  expect(contesto('"a\\', 3)).toEqual({ aperto: '"', dopoLaBarra: true });
  expect(contesto('"a\\"', 4)).toEqual({ aperto: '"', dopoLaBarra: false });
  expect(contesto("'\"'", 2)).toEqual({ aperto: "'", dopoLaBarra: false });
});

afterEach(() => {
  document.body.innerHTML = "";
});

/** Un campo segnato, col valore e il cursore; gli eventi `input` che riceve. */
function campo(valore: string, inizio: number, fine = inizio, segno: Record<string, string> = segnoDellEspressione): { c: HTMLInputElement; input: string[] } {
  const c = document.createElement("input");
  for (const [k, v] of Object.entries(segno)) c.setAttribute(k, v);
  c.value = valore;
  document.body.append(c);
  c.setSelectionRange(inizio, fine);
  const input: string[] = [];
  c.addEventListener("input", () => input.push(c.value));
  return { c, input };
}
const premi = (c: HTMLInputElement, key: string, altro: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...altro });
  const applicata = applicaLaChiusura(Object.defineProperty(e, "target", { value: c }));
  return { applicata, fermato: e.defaultPrevented };
};

test("chi la applica: scrive la coppia, manda l'evento di input e rimette il cursore; ferma il tasto", () => {
  const { c, input } = campo("somma + ", 8);
  expect(premi(c, "(")).toEqual({ applicata: true, fermato: true });
  expect(c.value).toBe("somma + ()");
  expect(input).toEqual(["somma + ()"]);
  expect([c.selectionStart, c.selectionEnd]).toEqual([9, 9]);
  // La chiusura scavalcata: solo il cursore, nessun input.
  expect(premi(c, ")")).toEqual({ applicata: true, fermato: true });
  expect(c.value).toBe("somma + ()");
  expect(input).toHaveLength(1);
  expect(c.selectionStart).toBe(10);
});

test("chi la applica: un tasto che fa il solito passa, un comando (Ctrl senza Alt, Cmd) passa; AltGr (Ctrl+Alt) e Opzione (Alt) scrivono", () => {
  const { c, input } = campo("", 0);
  expect(premi(c, "a")).toEqual({ applicata: false, fermato: false });
  expect(premi(c, "(", { ctrlKey: true })).toEqual({ applicata: false, fermato: false });
  expect(premi(c, "(", { metaKey: true })).toEqual({ applicata: false, fermato: false });
  expect(premi(c, "(", { isComposing: true })).toEqual({ applicata: false, fermato: false });
  expect(input).toEqual([]);
  expect(premi(c, "[", { ctrlKey: true, altKey: true })).toEqual({ applicata: true, fermato: true });
  expect(c.value).toBe("[]");
  const { c: mac } = campo("", 0);
  expect(premi(mac, "[", { altKey: true })).toEqual({ applicata: true, fermato: true });
  expect(mac.value).toBe("[]");
});

test("chi la applica: solo nei campi segnati, e le graffe solo in quello dell'elenco", () => {
  const { c: libero } = campo("", 0, 0, {});
  expect(premi(libero, "(").applicata).toBe(false);
  const { c: espressione } = campo("", 0);
  expect(premi(espressione, "{").applicata).toBe(false);
  const { c: elenco } = campo("", 0, 0, segnoDellElenco);
  expect(premi(elenco, "{").applicata).toBe(true);
  expect(elenco.value).toBe("{}");
});
