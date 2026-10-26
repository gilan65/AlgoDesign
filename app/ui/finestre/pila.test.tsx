// La pila delle chiamate nella finestra Proprietà: il campo parte dal valore del progetto (500 se il file non lo dice, o
// quello delle Impostazioni per un progetto nuovo), il cursore accanto lo segue nei due versi, e la conferma lo scrive
// nelle opzioni del progetto; fuori dall'intervallo, l'errore sotto il campo e nessuna conferma.

import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { it as testi } from "../../i18n/it";
import { FinestraProgetto, type DatiDelProgetto } from "./FinestraProgetto";

afterEach(cleanup);

/** La finestra aperta con i dati iniziali: le conferme ricevute, il campo della pila e il suo cursore. */
async function apri(iniziali: DatiDelProgetto, nuovo = false) {
  const confermati: DatiDelProgetto[] = [];
  await act(async () => void render(<FinestraProgetto aperta nuovo={nuovo} iniziali={iniziali} testi={testi} conferma={(d) => confermati.push(d)} rinuncia={() => {}} />));
  const campo = document.querySelector<HTMLInputElement>('input[data-campo="pila"]')!;
  const cursore = document.querySelector<HTMLInputElement>(`input[type="range"][aria-label="${testi.progettoPila}"]`)!;
  const conferma = () => act(async () => void fireEvent.submit(campo.form!));
  return { confermati, campo, cursore, conferma };
}

test("un progetto senza il campo mostra 500; il cursore segue il campo e il campo il cursore; la conferma scrive il numero", async () => {
  const f = await apri({ metadati: { name: "Ricorsione" }, opzioni: {} });
  expect([f.campo.value, f.cursore.value, f.cursore.min, f.cursore.max]).toEqual(["500", "500", "5", "500"]);
  await act(async () => void fireEvent.change(f.campo, { target: { value: "37" } }));
  expect(f.cursore.value).toBe("37");
  await act(async () => void fireEvent.change(f.cursore, { target: { value: "10" } }));
  expect(f.campo.value).toBe("10");
  await f.conferma();
  expect(f.confermati.map((d) => d.opzioni.call_stack_limit)).toEqual([10]);
});

test("un progetto nuovo parte dal valore delle Impostazioni", async () => {
  const f = await apri({ metadati: { name: "" }, opzioni: { call_stack_limit: 20 } }, true);
  expect([f.campo.value, f.cursore.value]).toEqual(["20", "20"]);
});

test("fuori da 5…500 l'errore sotto il campo, il fuoco sul campo e nessuna conferma; il cursore al confine più vicino", async () => {
  const f = await apri({ metadati: { name: "Ricorsione" }, opzioni: { call_stack_limit: 50 } });
  for (const [scritto, cursore] of [["4", "5"], ["501", "500"], ["", "500"]] as const) {
    await act(async () => void fireEvent.change(f.campo, { target: { value: scritto } }));
    expect(f.cursore.value).toBe(cursore);
    await f.conferma();
    expect(document.body.textContent).toContain(testi.progettoPilaFuori);
    expect(document.activeElement?.getAttribute("data-campo")).toBe("pila");
  }
  expect(f.confermati).toEqual([]);
});
