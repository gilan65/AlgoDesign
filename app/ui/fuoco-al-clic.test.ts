// Il fuoco al clic (`fuoco-al-clic.ts`) sotto happy-dom, che come il WebKit del Mac non dà il fuoco al clic: la casella,
// la sua etichetta, il pulsante; un elemento spento e un campo di testo no; un gestore che porta il fuoco altrove vince.
// Controllo positivo: senza l'ascoltatore il fuoco resta dov'era.
//
// CHE COSA NON GUARDA: i motori veri (lo prova `e2e/parametri.e2e.ts` nel WebKit, con la riga confermata dall'Invio).
import { afterEach, expect, test } from "bun:test";
import { fuocoAlClic } from "./fuoco-al-clic";

let togli: (() => void) | null = null;
afterEach(() => {
  togli?.();
  togli = null;
  document.body.innerHTML = "";
});

/** Un clic col tasto sinistro, come lo manda il motore (happy-dom non sposta il fuoco). */
const clic = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
const attivo = () => (document.activeElement === document.body ? "corpo" : (document.activeElement?.id ?? "nessuno"));

function pagina(): void {
  document.body.innerHTML = `
    <input id="casella" type="checkbox"><label id="etichetta" for="casella"><span id="dentro">globale</span></label>
    <button id="pulsante" type="button"><span id="icona">x</span></button>
    <button id="spento" type="button" disabled>no</button>
    <input id="testo" type="text">
    <button id="apre" type="button">apre</button><input id="altrove" type="text">`;
}

test("senza l'ascoltatore il clic non sposta il fuoco (il controllo positivo)", () => {
  pagina();
  clic(document.getElementById("casella")!);
  expect(attivo()).toBe("corpo");
});

test("il clic dà il fuoco alla casella, anche dalla sua etichetta, e al pulsante anche dalla sua icona", () => {
  pagina();
  togli = fuocoAlClic();
  clic(document.getElementById("casella")!);
  expect(attivo()).toBe("casella");
  document.getElementById("testo")!.focus();
  clic(document.getElementById("dentro")!);
  expect(attivo()).toBe("casella");
  clic(document.getElementById("icona")!);
  expect(attivo()).toBe("pulsante");
});

test("un elemento spento e un campo di testo non lo prendono dall'ascoltatore; un tasto diverso dal sinistro nemmeno", () => {
  pagina();
  togli = fuocoAlClic();
  document.getElementById("pulsante")!.focus();
  clic(document.getElementById("spento")!);
  expect(attivo()).toBe("pulsante");
  clic(document.getElementById("testo")!);
  expect(attivo()).toBe("pulsante");
  document.getElementById("casella")!.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 2 }));
  expect(attivo()).toBe("pulsante");
});

test("un gestore dell'app che porta il fuoco altrove vince: l'ascoltatore viene prima", () => {
  pagina();
  togli = fuocoAlClic();
  document.getElementById("apre")!.addEventListener("click", () => document.getElementById("altrove")!.focus());
  clic(document.getElementById("apre")!);
  expect(attivo()).toBe("altrove");
});

test("tolto, il clic non sposta più il fuoco", () => {
  pagina();
  togli = fuocoAlClic();
  togli();
  togli = null;
  clic(document.getElementById("casella")!);
  expect(attivo()).toBe("corpo");
});
