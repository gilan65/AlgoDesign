import { expect, test } from "bun:test";
import { campoDiTesto, comandoDelFile, comandoDellaCronologia, lasciaLaPagina, nelCampo, ricarica, tastoCheElimina } from "./modifiche";

const tasto = (key: string, o: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}) => ({
  key,
  ctrlKey: o.ctrl ?? false,
  metaKey: o.meta ?? false,
  shiftKey: o.shift ?? false,
  altKey: o.alt ?? false,
});

test("Ctrl+Z annulla; Ctrl+Y e Ctrl+Maiusc+Z ripetono; Cmd vale come Ctrl; il resto non è della cronologia", () => {
  expect(comandoDellaCronologia(tasto("z", { ctrl: true }))).toBe("annulla");
  expect(comandoDellaCronologia(tasto("Z", { ctrl: true, shift: true }))).toBe("ripeti");
  expect(comandoDellaCronologia(tasto("y", { ctrl: true }))).toBe("ripeti");
  expect(comandoDellaCronologia(tasto("z", { meta: true }))).toBe("annulla");
  // Controllo positivo dei «no»: senza Ctrl, con Alt, con un altro tasto.
  expect(comandoDellaCronologia(tasto("z"))).toBeNull();
  expect(comandoDellaCronologia(tasto("z", { ctrl: true, alt: true }))).toBeNull();
  expect(comandoDellaCronologia(tasto("Y", { ctrl: true, shift: true }))).toBeNull();
  expect(comandoDellaCronologia(tasto("c", { ctrl: true }))).toBeNull();
});

test("sul Mac i comandi dei file vogliono Cmd: Ctrl+N e Ctrl+O nei campi sono del sistema", () => {
  for (const t of ["n", "o", "s", "p"]) {
    expect(comandoDelFile(tasto(t, { ctrl: true }), true)).toBeNull();
    expect(comandoDelFile(tasto(t, { meta: true }), true)).not.toBeNull();
  }
  expect(comandoDelFile(tasto("S", { meta: true, shift: true }), true)).toBe("salvaConNome");
  expect(comandoDelFile(tasto("S", { ctrl: true, shift: true }), true)).toBeNull();
});

test("Ctrl+N è Nuovo, Ctrl+O è Apri, Ctrl+S è Salva, Ctrl+Maiusc+S è Salva con nome, Ctrl+P e Ctrl+Maiusc+P sono Stampa; Cmd vale come Ctrl; il resto non è dei file", () => {
  expect(comandoDelFile(tasto("n", { ctrl: true }))).toBe("nuovo");
  expect(comandoDelFile(tasto("o", { ctrl: true }))).toBe("apri");
  expect(comandoDelFile(tasto("s", { ctrl: true }))).toBe("salva");
  expect(comandoDelFile(tasto("S", { ctrl: true, shift: true }))).toBe("salvaConNome");
  expect(comandoDelFile(tasto("O", { meta: true }))).toBe("apri");
  expect(comandoDelFile(tasto("p", { ctrl: true }))).toBe("stampa");
  // Ctrl+Maiusc+P nel motore è la stampa con la finestra del sistema (la pagina così com'è): qui è la stampa dell'app.
  expect(comandoDelFile(tasto("P", { ctrl: true, shift: true }))).toBe("stampa");
  // Controllo positivo dei «no»: senza Ctrl, con Alt (Ctrl+Alt+P è AltGr+P, che su certe tastiere scrive), con Maiusc su N
  // e O, con un altro tasto.
  expect(comandoDelFile(tasto("n"))).toBeNull();
  expect(comandoDelFile(tasto("s", { ctrl: true, alt: true }))).toBeNull();
  expect(comandoDelFile(tasto("p", { ctrl: true, alt: true }))).toBeNull();
  expect(comandoDelFile(tasto("N", { ctrl: true, shift: true }))).toBeNull();
  expect(comandoDelFile(tasto("z", { ctrl: true }))).toBeNull();
});

test("un tasto premuto in un campo di testo o in un elenco a scelta resta del campo; su un pulsante, una casella, un radio no", () => {
  const conTipo = (tipo: string) => Object.assign(document.createElement("input"), { type: tipo });
  expect(nelCampo(document.createElement("input"))).toBe(true);
  expect(nelCampo(document.createElement("textarea"))).toBe(true);
  expect(nelCampo(document.createElement("select"))).toBe(true);
  // Gli input dove non si scrive testo (lì il motore non ha un Annulla), anche quelli che l'app oggi non usa.
  for (const t of ["radio", "checkbox", "button", "submit", "reset", "range", "color", "file"]) expect(nelCampo(conTipo(t))).toBe(false);
  expect(nelCampo(document.createElement("button"))).toBe(false);
  expect(nelCampo(null)).toBe(false);
});

test("F5 (anche con Ctrl) e Ctrl+R (anche con Maiusc, o Cmd) ricaricano; gli altri tasti no", () => {
  for (const t of [tasto("F5"), tasto("F5", { ctrl: true }), tasto("r", { ctrl: true }), tasto("R", { ctrl: true, shift: true }), tasto("r", { meta: true })]) expect(ricarica(t)).toBe(true);
  // Controllo positivo dei «no»: R da sola, con Alt, F4, Ctrl+T.
  for (const t of [tasto("r"), tasto("r", { ctrl: true, alt: true }), tasto("F4"), tasto("t", { ctrl: true })]) expect(ricarica(t)).toBe(false);
});

test("lasciano la pagina i tasti che la ricaricano, «Aggiorna», «Indietro», «Avanti» e Alt+freccia a sinistra e a destra; gli altri no", () => {
  const lasciano = [tasto("F5"), tasto("r", { ctrl: true }), tasto("BrowserRefresh"), tasto("BrowserBack"), tasto("BrowserForward"), tasto("ArrowLeft", { alt: true }), tasto("ArrowRight", { alt: true })];
  for (const t of lasciano) expect({ t, lascia: lasciaLaPagina(t) }).toEqual({ t, lascia: true });
  // Controllo positivo dei «no»: le frecce da sole, con Maiusc (la scelta di più blocchi), con Ctrl+Alt; Alt da solo;
  // Alt+freccia in su e in giù.
  const restano = [tasto("ArrowLeft"), tasto("ArrowRight", { shift: true }), tasto("ArrowLeft", { ctrl: true, alt: true }), tasto("Alt", { alt: true }), tasto("ArrowUp", { alt: true }), tasto("ArrowDown", { alt: true })];
  for (const t of restano) expect({ t, lascia: lasciaLaPagina(t) }).toEqual({ t, lascia: false });
});

test("Ctrl+R ricarica anche con una tastiera non latina: conta il tasto fisico R, non la lettera", () => {
  expect(ricarica({ ...tasto("к", { ctrl: true }), code: "KeyR" })).toBe(true);
  // Controllo positivo dei «no»: lo stesso tasto senza Ctrl, e un'altra lettera non latina col suo tasto fisico.
  expect(ricarica({ ...tasto("к"), code: "KeyR" })).toBe(false);
  expect(ricarica({ ...tasto("т", { ctrl: true }), code: "KeyN" })).toBe(false);
});

test("il menu del motore resta nei campi dove si scrive testo; non su una scelta, una casella o un pulsante", () => {
  const conTipo = (tipo: string) => Object.assign(document.createElement("input"), { type: tipo });
  for (const t of ["text", "number", "search"]) expect(campoDiTesto(conTipo(t))).toBe(true);
  expect(campoDiTesto(document.createElement("textarea"))).toBe(true);
  for (const t of ["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"]) expect(campoDiTesto(conTipo(t))).toBe(false);
  expect(campoDiTesto(document.createElement("select"))).toBe(false);
  expect(campoDiTesto(document.createElement("button"))).toBe(false);
  // Una scelta è un campo per i tasti della cronologia (lì il progetto non si tocca), non per il menu.
  expect(nelCampo(document.createElement("select"))).toBe(true);
});

test("Canc elimina ovunque; ⌫ solo sul Mac, da solo e fuori da un campo di testo", () => {
  const fuori = document.createElement("div");
  const campo = document.createElement("input");
  const su = (bersaglio: EventTarget, key: string, o: Parameters<typeof tasto>[1] = {}) => ({ ...tasto(key, o), target: bersaglio });
  expect([tastoCheElimina(su(fuori, "Delete"), false), tastoCheElimina(su(fuori, "Delete"), true)]).toEqual([true, true]);
  expect(tastoCheElimina(su(fuori, "Backspace"), true)).toBe(true);
  // Controllo positivo dei «no»: ⌫ fuori dal Mac, in un campo di testo, con Cmd (o un altro modificatore).
  expect(tastoCheElimina(su(fuori, "Backspace"), false)).toBe(false);
  expect(tastoCheElimina(su(campo, "Backspace"), true)).toBe(false);
  expect([tastoCheElimina(su(fuori, "Backspace", { meta: true }), true), tastoCheElimina(su(fuori, "Backspace", { shift: true }), true)]).toEqual([false, false]);
});
