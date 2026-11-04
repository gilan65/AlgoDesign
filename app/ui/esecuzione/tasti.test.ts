// I tasti dell'esecuzione: quale tasto è quale comando, e che cosa fa ogni tasto in ogni situazione.
// L'atteso è scritto qui, voce per voce, e confrontato con la tabella dell'app nei due versi.
//
// Che cosa NON guarda: che la finestra applichi la tabella (lo provano i motori, `e2e/esecuzione.e2e.ts`, e la
// finestra sotto happy-dom); i campi aperti e le finestre, che la finestra guarda prima della tabella.
import { expect, test } from "bun:test";
import { azioneDelTasto, SITUAZIONI, TASTI, tastoDellEsecuzione, type Azione, type Situazione, type TastoDellEsecuzione } from "./tasti";

const tasto = (key: string, o: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}) => ({
  key,
  ctrlKey: o.ctrl ?? false,
  metaKey: o.meta ?? false,
  shiftKey: o.shift ?? false,
  altKey: o.alt ?? false,
});

test("F5, F10, F11, Maiusc+F11, Maiusc+F5 e F9 sono i tasti dell'esecuzione; con Ctrl, Alt, Cmd o Maiusc (tranne Maiusc+F5 e Maiusc+F11) non lo sono", () => {
  expect(tastoDellEsecuzione(tasto("F5"))).toBe("F5");
  expect(tastoDellEsecuzione(tasto("F11"))).toBe("F11");
  expect(tastoDellEsecuzione(tasto("F11", { shift: true }))).toBe("Maiusc+F11");
  expect(tastoDellEsecuzione(tasto("F10"))).toBe("F10");
  expect(tastoDellEsecuzione(tasto("F5", { shift: true }))).toBe("Maiusc+F5");
  expect(tastoDellEsecuzione(tasto("F9"))).toBe("F9");
  // Controllo positivo dei «no»: Ctrl+F5 ricarica (fermato altrove), Maiusc+F10 apre il menu di un dato.
  for (const t of [tasto("F5", { ctrl: true }), tasto("F5", { alt: true }), tasto("F5", { meta: true }), tasto("F10", { shift: true }), tasto("F9", { shift: true }), tasto("F11", { ctrl: true }), tasto("F11", { alt: true }), tasto("F4"), tasto("r", { ctrl: true })])
    expect(tastoDellEsecuzione(t)).toBeNull();
});

const atteso: Record<Situazione, Record<TastoDellEsecuzione, Azione>> = {
  ferma: { F5: "esegui", F10: "passo", F11: "passo", "Maiusc+F11": "nulla", "Maiusc+F5": "nulla", F9: "punto" },
  "in pausa": { F5: "continua", F10: "un passo", F11: "entra", "Maiusc+F11": "esci", "Maiusc+F5": "ferma", F9: "punto" },
  modificata: { F5: "riesegui", F10: "nulla", F11: "nulla", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  "in corso": { F5: "nulla", F10: "nulla", F11: "nulla", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  chiede: { F5: "nulla", F10: "nulla", F11: "nulla", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
  finita: { F5: "esegui", F10: "passo", F11: "passo", "Maiusc+F11": "nulla", "Maiusc+F5": "ferma", F9: "punto" },
};

test("la tabella tasto → comando coincide con l'atteso in ogni situazione, voce per voce, nei due versi", () => {
  const voci = (t: Record<string, Record<string, string>>) =>
    Object.entries(t)
      .flatMap(([s, r]) => Object.entries(r).map(([k, a]) => `${s} · ${k} → ${a}`))
      .sort();
  const dellApp = SITUAZIONI.flatMap((s) => TASTI.map((k) => `${s} · ${k} → ${azioneDelTasto(s, k)}`)).sort();
  const scritte = voci(atteso);
  // Le voci dell'app che l'atteso non ha, e quelle dell'atteso che l'app non ha, coi conteggi accanto.
  expect({ app: dellApp.length, mancanti: scritte.filter((v) => !dellApp.includes(v)), inPiu: dellApp.filter((v) => !scritte.includes(v)) }).toEqual({ app: 36, mancanti: [], inPiu: [] });
});
