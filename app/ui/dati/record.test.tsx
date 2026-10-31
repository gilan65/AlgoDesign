// I record nella vista dei dati, sotto happy-dom: la bozza di un record e il ritorno al modello (le origini dei campi
// che fanno di un nome cambiato una rinomina), il dato di tipo record nella sua bozza e nella sua riga, il tipo che offre
// i record del progetto dopo i cinque, la tabella «Record» con le righe e la scheda coi campi.
//
// Che cosa NON guarda: le operazioni del nucleo (`core/modifica/record.test.ts`), la tabella dentro la finestra vera coi
// passi, il menu e la conferma (`e2e/costruzione.e2e.ts`, che costruisce un programma coi record solo coi clic).
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState, type ReactElement } from "react";
import { risultatoDi } from "../../core/disegno/impaginazione";
import { apri } from "../../core/progetto/formato";
import type { Dato, DefinizioneDelRecord } from "../../core/progetto/modello";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { bozzaDi, datoDaBozza, type BozzaDelDato } from "./bozza";
import { SchedaDelDato } from "./CampiDelDato";
import { bozzaDelRecord, campoNuovo, recordDaBozza, spostaCampo, type BozzaDelRecord } from "./record";
import { tipoDelDato } from "./righe";
import { TabellaDeiRecord, type ModificaDeiRecord } from "./TabellaDeiRecord";

afterEach(() => cleanup());

const alunno: DefinizioneDelRecord = {
  name: "alunno",
  fields: [
    { name: "nome", type: "string", max_length: 20 },
    { name: "classe", type: "string", max_length: 3 },
    { name: "voto", type: "integer" },
  ],
};

test("la bozza di un record torna il record, coi campi spostati, aggiunti e tolti e le loro origini", () => {
  const b = bozzaDelRecord(alunno);
  expect(recordDaBozza(b)).toEqual({ record: alunno, origini: [0, 1, 2] });
  // Il voto in cima, un campo nuovo in fondo, la classe tolta, la lunghezza di un intero ignorata.
  const su = spostaCampo(spostaCampo(b, 2, -1), 1, -1);
  expect(su.campi.map((c) => c.nome)).toEqual(["voto", "nome", "classe"]);
  const fatta: BozzaDelRecord = { ...su, campi: [...su.campi.filter((c) => c.nome !== "classe"), { ...campoNuovo, nome: "media", tipo: "real", lunghezza: "5" }] };
  expect(recordDaBozza(fatta)).toEqual({
    record: { name: "alunno", fields: [{ name: "voto", type: "integer" }, { name: "nome", type: "string", max_length: 20 }, { name: "media", type: "real" }] },
    origini: [2, 0, undefined],
  });
  // Al bordo lo spostamento non cambia nulla.
  expect(spostaCampo(b, 0, -1)).toBe(b);
});

test("un dato di tipo record: la bozza tiene il nome del record e il valore fra graffe, e torna il dato; la riga dice il record", () => {
  const a: Dato = { name: "a", type: "record", record: "alunno", initial: ['"Anna"', '"3A"', "7"] };
  const b = bozzaDi(a, "un-valore");
  expect([b.tipo, b.record, b.iniziale]).toEqual(["record", "alunno", '{"Anna", "3A", 7}']);
  expect(datoDaBozza(b)).toEqual(a);
  // Senza graffe vale lo stesso; vuoto, nessun valore.
  expect(datoDaBozza({ ...b, iniziale: '"Bruno", "3B", 8' }).initial).toEqual(['"Bruno"', '"3B"', "8"]);
  expect(datoDaBozza({ ...b, iniziale: "" }).initial).toBeUndefined();
  expect(tipoDelDato(a, testi)).toBe("alunno");
  // Controllo positivo: un intero resta un letterale solo.
  expect(datoDaBozza({ ...bozzaDi({ name: "n", type: "integer" }, "elenco"), iniziale: "1, 2" }).initial).toBe("1, 2");
});

test("il risultato di una funzione che restituisce un record o una tabella dice il record, come un dato di quel tipo", () => {
  const p = apri(readFileSync(new URL("../../casi/tipi/tabella-come-parametro.algo", import.meta.url), "utf8"));
  if (!p.ok) throw new Error("tabella-come-parametro non si apre");
  const di = (nome: string) => tipoDelDato(risultatoDi(p.progetto.functions.find((f) => f.name === nome)!), testi);
  expect([di("migliore"), di("alzata")]).toEqual([tipoDelDato({ name: "x", type: "record", record: "alunno" }, testi), tipoDelDato({ name: "x", type: "record", record: "alunno", size: 3 }, testi)]);
  expect(di("migliore")).toBe("alunno");
});

function Scheda({ dato, records }: { dato: Dato; records: readonly string[] }): ReactElement {
  const [bozza, setBozza] = useState<BozzaDelDato>(bozzaDi(dato, "elenco"));
  return (
    <>
      <SchedaDelDato nome={dato.name} nature={["variabile", "costante"]} records={records} bozza={bozza} cambia={setBozza} conferma={() => {}} rinuncia={() => {}} elimina={() => {}} segnalazioni={[]} testi={testi} />
      <output data-tipo={`${bozza.tipo}/${bozza.record}`} />
    </>
  );
}

test("il tipo offre i cinque, poi i record del progetto; scegliere un record lo scrive nella bozza", async () => {
  await act(async () => void render(<Scheda dato={{ name: "a", type: "integer" }} records={["alunno", "classe"]} />));
  const tipo = document.querySelector<HTMLSelectElement>(`[aria-label="${testi.datiTipo}"]`)!;
  expect([...tipo.options].map((o) => o.textContent)).toEqual([testi.tipoIntero, testi.tipoReale, testi.tipoCarattere, testi.tipoStringa, testi.tipoBooleano, "──────", "alunno", "classe"]);
  await act(async () => void fireEvent.change(tipo, { target: { value: "record:classe" } }));
  expect(document.querySelector("output")!.dataset.tipo).toBe("record/classe");
  cleanup();
  // Un record che il progetto non ha si vede lo stesso (il controllo dice l'errore); senza record, nessun separatore.
  await act(async () => void render(<Scheda dato={{ name: "a", type: "record", record: "perso" }} records={[]} />));
  expect([...document.querySelector<HTMLSelectElement>(`[aria-label="${testi.datiTipo}"]`)!.options].slice(5).map((o) => o.textContent)).toEqual(["──────", "perso"]);
  cleanup();
  await act(async () => void render(<Scheda dato={{ name: "a", type: "integer" }} records={[]} />));
  expect(document.querySelector<HTMLSelectElement>(`[aria-label="${testi.datiTipo}"]`)!.options.length).toBe(5);
});

function Tabella({ cambiate }: { cambiate: BozzaDelRecord[] }): ReactElement {
  const [inModifica, setInModifica] = useState<ModificaDeiRecord["inModifica"]>(null);
  const modifica: ModificaDeiRecord = {
    inModifica,
    apri: (indice) => setInModifica({ indice, bozza: bozzaDelRecord(alunno) }),
    cambia: (bozza) => {
      cambiate.push(bozza);
      setInModifica((m) => (m ? { ...m, bozza } : m));
    },
    conferma: () => {},
    rinuncia: () => setInModifica(null),
    elimina: () => {},
    duplica: () => {},
    sposta: () => {},
    candidato: [],
  };
  return <TabellaDeiRecord records={[alunno]} segni={new Map([[0, [{ genere: "errore", codice: "invalid_record", breve: "il record", accaduto: "", suggerimento: "" }]]])} testi={testi} modifica={modifica} />;
}

test("la tabella «Record»: una riga per record coi campi in fila e il segno dell'errore; la scheda coi campi del record", async () => {
  const cambiate: BozzaDelRecord[] = [];
  await act(async () => void render(<Tabella cambiate={cambiate} />));
  const riga = document.querySelector<HTMLElement>('[data-record="record-0"]')!;
  expect([...riga.children].map((c) => c.textContent)).toEqual(["alunno", "nome, classe, voto"]);
  expect(riga.getAttribute("aria-invalid")).toBe("true");
  expect(document.querySelector("caption")!.textContent).toBe(testi.recordTitolo);
  await act(async () => void fireEvent.doubleClick(riga));
  const scheda = document.querySelector(`form[aria-label="${riempi(testi.modificaDelRecord, { nome: "alunno" })}"]`)!;
  expect(scheda).not.toBeNull();
  const campo = (n: number, che: "recordNomeDelCampo" | "recordTipoDelCampo" | "recordLunghezzaDelCampo") => scheda.querySelector<HTMLInputElement>(`[aria-label="${riempi(testi[che], { n: String(n) })}"]`);
  expect([1, 2, 3].map((n) => campo(n, "recordNomeDelCampo")?.value)).toEqual(["nome", "classe", "voto"]);
  // La lunghezza solo per una stringa.
  expect([1, 2, 3].map((n) => campo(n, "recordLunghezzaDelCampo")?.value ?? null)).toEqual(["20", "3", null]);
  // «Aggiungi un campo» mette in fondo un campo senza nome, intero.
  const aggiungi = [...scheda.querySelectorAll("button")].find((b) => b.textContent === testi.recordAggiungiCampo)!;
  await act(async () => void fireEvent.click(aggiungi));
  expect(cambiate.at(-1)!.campi.at(-1)).toEqual(campoNuovo);
  expect(campo(4, "recordNomeDelCampo")?.value).toBe("");
});
