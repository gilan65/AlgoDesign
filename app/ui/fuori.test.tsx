// La conferma dei campi aperti quando l'utente va altrove (`fuori.ts`) sotto happy-dom: la memoria del clic dentro i
// campi e quella del tasto secondario valgono fino al tasto seguente. Il fuoco che esce verso il corpo della pagina
// (`relatedTarget` nullo, come dall'ultimo controllo col Tab o dopo un clic su un pulsante in WebKit) non conferma
// subito dopo un clic dentro i campi; dopo un tasto sì.
//
// CHE COSA NON GUARDA:
// - i motori veri: il fuoco che esce si imita togliendolo a mano (`blur`); i gesti veri li provano
//   `e2e/lavoro-al-sicuro.e2e.ts` (il fuoco che esce col Tab, il clic dentro i campi, il clic fuori);
// - la barra di scorrimento e il pulsante che conferma lui: li provano i motori.

import { expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { useRef, type ReactElement } from "react";
import { useConfermaFuori } from "./fuori";

function Campi({ conferma }: { conferma: (torna: boolean) => void }): ReactElement {
  const campi = useRef<HTMLDivElement>(null);
  useConfermaFuori(campi, conferma);
  return (
    <div ref={campi}>
      <input data-nome="campo" />
      <button type="button" data-nome="aggiungi">
        Aggiungi un valore
      </button>
    </div>
  );
}

const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));
const elemento = (nome: string) => document.querySelector(`[data-nome="${nome}"]`) as HTMLElement;

/** Il fuoco nel campo, una pressione (dentro i campi, del primo pulsante o di un altro), forse un tasto, poi il fuoco
 * che esce verso il corpo: quante conferme. */
async function conferme(pressione: { button: number }, conTasto: boolean): Promise<number> {
  const viste: boolean[] = [];
  const r = render(<Campi conferma={(torna) => viste.push(torna)} />);
  elemento("campo").focus();
  fireEvent.pointerDown(elemento("aggiungi"), pressione);
  if (conTasto) fireEvent.keyDown(elemento("campo"), { key: "a" });
  elemento("campo").blur();
  await giro();
  r.unmount();
  return viste.length;
}

test("il fuoco che esce verso il corpo non conferma subito dopo un clic dentro i campi, e conferma dopo un tasto", async () => {
  expect(await conferme({ button: 0 }, false)).toBe(0);
  expect(await conferme({ button: 0 }, true)).toBe(1);
});

test("il fuoco che esce verso il corpo non conferma subito dopo una pressione del tasto secondario, e conferma dopo un tasto", async () => {
  expect(await conferme({ button: 2 }, false)).toBe(0);
  expect(await conferme({ button: 2 }, true)).toBe(1);
});
