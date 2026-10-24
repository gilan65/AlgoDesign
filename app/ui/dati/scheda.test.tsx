// La scheda del dato sotto happy-dom, da sola: le opzioni avanzate restano come le lascia l'utente mentre scrive (svuotare
// la lunghezza massima non le richiude), la natura offre le scelte date (e quella del dato, se manca), la casella
// «globale» c'è solo per una costante, e un parametro non ha i campi del valore iniziale né del ruolo.
//
// Che cosa NON guarda: la scheda dentro la finestra vera, coi passi e le tabelle (`ui/dati/parametri.test.tsx` e
// `e2e/modifica-dati.e2e.ts`).
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import type { Dato } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { bozzaDi, type BozzaDelDato, type Natura } from "./bozza";
import { SchedaDelDato } from "./CampiDelDato";

afterEach(() => cleanup());

function Scheda({ dato, nature, globale = false }: { dato: Dato; nature: readonly Natura[]; globale?: boolean }): ReactElement {
  const [bozza, setBozza] = useState<BozzaDelDato>(bozzaDi(dato, "elenco", globale));
  return (
    <SchedaDelDato nome={dato.name} nature={nature} bozza={bozza} cambia={setBozza} conferma={() => {}} rinuncia={() => {}} elimina={() => {}} segnalazioni={[]} testi={testi} />
  );
}

const campo = (nome: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${nome}"]`);
const scrivi = (e: Element, valore: string) => act(async () => void fireEvent.change(e, { target: { value: valore } }));
const voci = (nome: string) => [...(campo(nome) as HTMLSelectElement).options].map((o) => o.textContent);

test("svuotare la lunghezza massima non richiude le opzioni avanzate", async () => {
  await act(async () => void render(<Scheda dato={{ name: "nome", type: "string", max_length: 20 }} nature={["variabile", "costante"]} />));
  const avanzate = document.querySelector("details")!;
  expect(avanzate.open).toBe(true);
  await scrivi(campo(testi.campoLunghezza)!, "");
  expect(avanzate.open).toBe(true);
  await scrivi(campo(testi.campoLunghezza)!, "3");
  expect(avanzate.open).toBe(true);
  // Controllo positivo: chiuse dall'utente, restano chiuse anche scrivendo.
  await act(async () => {
    avanzate.open = false;
    avanzate.dispatchEvent(new Event("toggle"));
  });
  expect(avanzate.open).toBe(false);
});

test("la natura: le scelte date, quella del dato se manca; la casella «globale» per una costante", async () => {
  await act(async () => void render(<Scheda dato={{ name: "k", type: "integer", constant: true, initial: "1" }} nature={["variabile", "costante", "value"]} />));
  expect(voci(testi.datiNatura)).toEqual([testi.naturaVariabile, testi.naturaCostante, testi.naturaParametroValore]);
  const globale = campo(testi.campoGlobale) as HTMLInputElement;
  expect(globale.checked).toBe(false);
  await act(async () => void fireEvent.click(globale));
  expect((campo(testi.campoGlobale) as HTMLInputElement).checked).toBe(true);
  // Una variabile non ha la casella.
  await scrivi(campo(testi.datiNatura)!, "variabile");
  expect(campo(testi.campoGlobale)?.outerHTML ?? null).toBeNull();
  cleanup();
  // Un parametro per riferimento in una funzione, dove la scelta non c'è: la si vede lo stesso; nessun valore iniziale né ruolo.
  await act(async () => void render(<Scheda dato={{ name: "x", type: "integer", parameter: "reference" }} nature={["value", "variabile", "costante"]} />));
  expect(voci(testi.datiNatura)).toEqual([testi.naturaParametroValore, testi.naturaVariabile, testi.naturaCostante, testi.naturaParametroRiferimento]);
  expect([campo(testi.datiIniziale), campo(testi.datiRuolo), campo(testi.campoGlobale)].map((c) => c?.outerHTML ?? null)).toEqual([null, null, null]);
  // Diventato una variabile, ricompaiono.
  await scrivi(campo(testi.datiNatura)!, "variabile");
  expect([campo(testi.datiIniziale) !== null, campo(testi.datiRuolo) !== null]).toEqual([true, true]);
});

test("una costante comune ha la casella spuntata", async () => {
  await act(async () => void render(<Scheda dato={{ name: "MAX", type: "integer", constant: true, initial: "10" }} nature={["variabile", "costante"]} globale />));
  expect((campo(testi.campoGlobale) as HTMLInputElement).checked).toBe(true);
});
