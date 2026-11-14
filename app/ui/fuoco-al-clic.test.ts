// Il fuoco al clic (`fuoco-al-clic.ts`) sotto happy-dom, che come il WebKit del Mac non dà il fuoco al clic: dopo il clic,
// col fuoco rimasto al corpo, va alla casella (anche dalla sua etichetta) e al pulsante (anche dalla sua icona); un
// elemento spento e un campo di testo no; un fuoco che un gestore ha messo altrove resta lì; un elemento sparito non lo
// prende. Controllo positivo: senza l'ascoltatore il fuoco resta al corpo.
//
// CHE COSA NON GUARDA: i motori veri (lo provano `e2e/parametri.e2e.ts` nel WebKit, con la riga confermata dall'Invio, e
// `e2e/casi.e2e.ts` in Chromium, con la spunta che non si perde mentre i campi aperti si confermano).
import { afterEach, expect, test } from "bun:test";
import { fuocoAlClic } from "./fuoco-al-clic";

let togli: (() => void) | null = null;
afterEach(() => {
  togli?.();
  togli = null;
  document.body.innerHTML = "";
});

/** Un clic col tasto sinistro, come lo manda il motore (happy-dom non sposta il fuoco), e il giro dopo. */
async function clic(el: Element, tasto = 0): Promise<void> {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: tasto }));
  await new Promise((r) => setTimeout(r, 5));
}
const attivo = () => (document.activeElement === document.body ? "corpo" : (document.activeElement?.id ?? "nessuno"));
const alCorpo = () => (document.activeElement as HTMLElement | null)?.blur();

function pagina(): void {
  document.body.innerHTML = `
    <input id="casella" type="checkbox"><label id="etichetta" for="casella"><span id="dentro">globale</span></label>
    <button id="pulsante" type="button"><span id="icona">x</span></button>
    <button id="spento" type="button" disabled>no</button>
    <input id="testo" type="text">
    <button id="apre" type="button">apre</button><input id="altrove" type="text">
    <button id="sparisce" type="button">sparisce</button>`;
}

test("senza l'ascoltatore il clic non sposta il fuoco (il controllo positivo)", async () => {
  pagina();
  await clic(document.getElementById("casella")!);
  expect(attivo()).toBe("corpo");
});

test("col fuoco al corpo, il clic lo dà alla casella, anche dalla sua etichetta, e al pulsante anche dalla sua icona", async () => {
  pagina();
  togli = fuocoAlClic();
  await clic(document.getElementById("casella")!);
  expect(attivo()).toBe("casella");
  alCorpo();
  await clic(document.getElementById("dentro")!);
  expect(attivo()).toBe("casella");
  alCorpo();
  await clic(document.getElementById("icona")!);
  expect(attivo()).toBe("pulsante");
});

test("un elemento spento e un campo di testo non lo prendono dall'ascoltatore; un tasto diverso dal sinistro nemmeno", async () => {
  pagina();
  togli = fuocoAlClic();
  await clic(document.getElementById("spento")!);
  expect(attivo()).toBe("corpo");
  await clic(document.getElementById("testo")!);
  expect(attivo()).toBe("corpo");
  await clic(document.getElementById("casella")!, 2);
  expect(attivo()).toBe("corpo");
});

test("un fuoco già altrove resta dov'è: quello che un gestore ha messo, e quello che c'era prima del clic", async () => {
  pagina();
  togli = fuocoAlClic();
  document.getElementById("apre")!.addEventListener("click", () => document.getElementById("altrove")!.focus());
  await clic(document.getElementById("apre")!);
  expect(attivo()).toBe("altrove");
  document.getElementById("testo")!.focus();
  await clic(document.getElementById("casella")!);
  expect(attivo()).toBe("testo");
});

test("un elemento tolto dal documento durante il clic non prende il fuoco", async () => {
  pagina();
  togli = fuocoAlClic();
  const sparisce = document.getElementById("sparisce")!;
  sparisce.addEventListener("click", () => sparisce.remove());
  await clic(sparisce);
  expect(attivo()).toBe("corpo");
});

test("tolto, il clic non sposta più il fuoco", async () => {
  pagina();
  togli = fuocoAlClic();
  togli();
  togli = null;
  await clic(document.getElementById("casella")!);
  expect(attivo()).toBe("corpo");
});
