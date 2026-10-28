// Salvataggio e riapertura sul corpus: per ogni file di `casi/`, `apri(salva(p))` ha la
// stessa struttura di `p`, e `salva(apri(salva(apri(f))))` ha gli stessi byte di `salva(apri(f))`. I file
// si enumerano dal disco e si appaiano per nome, nei due versi, con l'elenco tracciato `casi/elenco.json`.
// E ogni file è identico byte per byte a ciò che il salvataggio ne scrive: il corpus è nella forma del salvataggio.
// Poi il controllo statico: un file delle tappe che il controllo conosce (1, 2 e 3) ha esattamente l'errore statico e
// gli avvisi che i suoi casi d'uso attendono, quelli del programma e quelli delle sue funzioni; un file delle tappe
// successive è fuori tappa.
// Ogni file di quelle tappe ha almeno un caso d'uso, e l'elenco non ripete una voce (l'appaiamento dei casi col file
// è di `bun run casi`).

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../controllo/controllo";
import { apri, salva } from "./formato";

const cartella = join(import.meta.dir, "..", "..", "casi");
const elenco: Record<string, string[]> = JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8"));

// In ordine di nome: `readdirSync` dà l'ordine del file system, alfabetico su NTFS e no su ext4.
const suDisco = readdirSync(cartella, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .sort((a, b) => (a.name < b.name ? -1 : 1))
  .flatMap((d) =>
    readdirSync(join(cartella, d.name))
      .filter((f) => f.endsWith(".algo"))
      .sort()
      .map((f) => `${d.name}/${f.slice(0, -".algo".length)}`),
  );
// Le voci dell'elenco sono i casi, `file#caso`; i file sono i nomi prima di `#`.
const voci = Object.entries(elenco).flatMap(([tappa, casi]) => casi.map((c) => `${tappa}/${c}`));
const nellElenco = [...new Set(voci.map((v) => v.split("#")[0]!))];

/** I nomi che compaiono più di una volta. */
const ripetuti = (nomi: readonly string[]) => [...new Set(nomi.filter((n, i) => nomi.indexOf(n) !== i))];

test("il corpus su disco è quello dell'elenco tracciato, nei due versi, senza voci ripetute", () => {
  console.log(`corpus: su disco ${suDisco.length}, nell'elenco ${nellElenco.length} file in ${voci.length} casi`);
  expect(suDisco.filter((c) => !nellElenco.includes(c))).toEqual([]);
  expect(nellElenco.filter((c) => !suDisco.includes(c))).toEqual([]);
  expect(ripetuti(voci)).toEqual([]);
  expect(suDisco.length).toBeGreaterThan(0);
  // Controllo positivo: una voce ripetuta passa l'appaiamento dei file nei due versi, e il rilevatore la vede.
  expect(ripetuti([...voci, voci[0]!])).toEqual([voci[0]!]);
});

/** Le tappe i cui file il controllo statico conosce: gli altri sono fuori tappa. */
const controllata = (nome: string) => ["tappa-1/", "tappa-2/", "tappa-3/", "tappa-4/", "tipi/"].some((t) => nome.startsWith(t));

/** I file delle tappe controllate senza casi d'uso: si aprono, e non provano nulla. */
const senzaCasi = (progetti: readonly [string, { test_cases?: readonly unknown[] }][]) =>
  progetti.filter(([nome, p]) => controllata(nome) && (p.test_cases ?? []).length === 0).map(([nome]) => nome);

test("ogni file delle tappe dalla 1 alla 4 ha almeno un caso d'uso", () => {
  const progetti = suDisco.map((c) => {
    const a = apri(readFileSync(join(cartella, `${c}.algo`), "utf8"));
    if (!a.ok) throw new Error(c);
    return [c, a.progetto] as [string, { test_cases?: readonly unknown[] }];
  });
  expect(senzaCasi(progetti)).toEqual([]);
  // Controllo positivo: lo stesso corpus con un file svuotato per ciascuna delle quattro tappe (eccoli), uno senza il
  // campo, e un file di una tappa successiva senza casi, che non conta.
  const primo = progetti.find(([n]) => n.startsWith("tappa-1/"))!;
  const secondo = progetti.find(([n]) => n.startsWith("tappa-2/"))!;
  const terzo = progetti.find(([n]) => n.startsWith("tappa-3/"))!;
  const quarto = progetti.find(([n]) => n.startsWith("tappa-4/"))!;
  const svuotati = new Set([primo[0], secondo[0], terzo[0], quarto[0]]);
  const alterati = progetti.map(([n, p]): [string, { test_cases?: readonly unknown[] }] => (svuotati.has(n) ? [n, { ...p, test_cases: [] }] : [n, p]));
  expect(senzaCasi([...alterati, ["tappa-5/x", { test_cases: [] }]])).toEqual([primo[0], secondo[0], terzo[0], quarto[0]]);
  expect(senzaCasi([["tappa-1/x", {}]])).toEqual(["tappa-1/x"]);
});

test("ogni file del corpus si apre, si salva e si riapre uguale (struttura e byte)", () => {
  const identici: string[] = [];
  for (const caso of suDisco) {
    const sorgente = readFileSync(join(cartella, `${caso}.algo`), "utf8");
    const aperto = apri(sorgente);
    expect({ caso, errori: aperto.ok ? [] : aperto.errori }).toEqual({ caso, errori: [] });
    if (!aperto.ok) continue;
    const salvato = salva(aperto.progetto);
    const riaperto = apri(salvato);
    expect(riaperto.ok && riaperto.progetto).toStrictEqual(aperto.progetto);
    if (!riaperto.ok) continue;
    expect({ caso, byte: salva(riaperto.progetto) }).toEqual({ caso, byte: salvato });
    if (salvato === sorgente) identici.push(caso);
  }
  console.log(`corpus: ${suDisco.length} file aperti, salvati e riaperti; identici byte per byte al sorgente: ${identici.length}`);
  // Ogni file del corpus è scritto come lo scrive il salvataggio: uno scritto a mano con le chiavi in un altro ordine
  // l'interfaccia lo salverebbe diverso, e la prova nel browser che apre e salva ogni file sarebbe rossa solo lì.
  expect(suDisco.filter((c) => !identici.includes(c))).toEqual([]);
  // Controllo positivo: lo stesso file con due chiavi scambiate si apre uguale e si salva diverso.
  const primo = readFileSync(join(cartella, `${suDisco[0]}.algo`), "utf8");
  const scambiato = primo.replace('"format": "algodesign",\n  "schema_version": 2,', '"schema_version": 2,\n  "format": "algodesign",');
  const aperto = apri(scambiato);
  expect([scambiato !== primo, aperto.ok && salva(aperto.progetto) === scambiato]).toEqual([true, false]);
});

test("ogni file del corpus scritto alla versione 1 si apre come alla 2, e salvato è il file della versione 2", () => {
  // Il corpus è passato dalla 1 alla 2 cambiando la sola riga della versione: riscritta 1, è il file di prima.
  const riga = (v: number) => `\n  "schema_version": ${v},\n`;
  let migrati = 0;
  for (const caso of suDisco) {
    const nuovo = readFileSync(join(cartella, `${caso}.algo`), "utf8");
    const vecchio = nuovo.replace(riga(2), riga(1));
    const prima = apri(vecchio);
    const dopo = apri(nuovo);
    expect({ caso, riscritto: vecchio !== nuovo, uguale: prima.ok && dopo.ok && Bun.deepEquals(prima.progetto, dopo.progetto, true) }).toEqual({ caso, riscritto: true, uguale: true });
    expect({ caso, salvato: prima.ok && salva(prima.progetto) === nuovo }).toEqual({ caso, salvato: true });
    migrati++;
  }
  console.log(`migrazione: ${migrati} file del corpus riscritti alla versione 1, aperti uguali e salvati alla 2 su ${suDisco.length}`);
  expect(migrati).toBe(suDisco.length);
});

test("il controllo statico del corpus: tappe dalla 1 alla 4 con l'errore statico e gli avvisi attesi, le altre fuori tappa", () => {
  const ordinati = (a: readonly { code: string; block: string }[]) => [...a].map((x) => `${x.code}@${x.block}`).sort();
  let controllati = 0;
  let fuoriTappa = 0;
  let avvisiAttesi = 0;
  let erroriAttesi = 0;
  for (const caso of suDisco) {
    const aperto = apri(readFileSync(join(cartella, `${caso}.algo`), "utf8"));
    if (!aperto.ok) throw new Error(caso);
    const esito = controlla(aperto.progetto, tetti);
    // I record: un file giusto è dentro la tappa come le altre, uno sbagliato ha il suo errore statico.
    const fuoriAtteso = !controllata(caso);
    if (fuoriAtteso) {
      expect({ caso, fuoriTappa: esito.fuoriTappa }).toEqual({ caso, fuoriTappa: true });
      fuoriTappa++;
      continue;
    }
    // Gli avvisi e l'errore statico sono del progetto: ogni caso d'uso li attende tutti, anche quelli di una funzione.
    const tuttiICasi = [...(aperto.progetto.test_cases ?? []), ...aperto.progetto.functions.flatMap((f) => f.test_cases ?? [])];
    const attesi = [...new Set(tuttiICasi.flatMap((t) => ordinati(t.expected.warnings ?? [])))].sort();
    const errore = tuttiICasi[0]?.expected.static_error;
    avvisiAttesi += attesi.length;
    if (errore) erroriAttesi++;
    expect({ caso, esito: esito.fuoriTappa ? "fuori tappa" : { errori: esito.errori, avvisi: ordinati(esito.avvisi) } }).toEqual({ caso, esito: { errori: errore ? [errore] : [], avvisi: attesi } });
    // E ciascuno: in un file con più casi, uno che non li attende non si nasconde nell'unione.
    for (const t of tuttiICasi)
      expect({ caso: `${caso}#${t.name}`, avvisi: [...ordinati(t.expected.warnings ?? [])].sort(), errore: t.expected.static_error ?? null }).toEqual({
        caso: `${caso}#${t.name}`,
        avvisi: attesi,
        errore: errore ?? null,
      });
    controllati++;
  }
  console.log(
    `controllo statico del corpus: tappe dalla 1 alla 4 e i record ${controllati} controllati (avvisi attesi ${avvisiAttesi}, errori statici attesi ${erroriAttesi}), fuori tappa ${fuoriTappa}, in tutto ${controllati + fuoriTappa} su ${suDisco.length}`,
  );
  expect(controllati + fuoriTappa).toBe(suDisco.length);
  // Controllo positivo del confronto degli avvisi e degli errori: il corpus ne attende.
  expect(avvisiAttesi).toBeGreaterThan(0);
  // Dieci delle tappe, cinque dei record e tre delle matrici.
  expect(erroriAttesi).toBe(18);
});

test("controllo positivo: un file fuori forma canonica si salva diverso dal sorgente, e poi resta fermo", () => {
  // Campi in un altro ordine, rientro di 4 spazi, nessun a capo finale e un'opzione uguale al predefinito.
  const sorgente = JSON.stringify(
    {
      schema_version: 1,
      format: "algodesign",
      options: { real_decimals: 2 },
      metadata: { name: "x" },
      functions: [{ kind: "main", id: "f1", data: [], body: [], end: { id: "b1" } }],
    },
    null,
    4,
  );
  const aperto = apri(sorgente);
  if (!aperto.ok) throw new Error(JSON.stringify(aperto.errori));
  const salvato = salva(aperto.progetto);
  expect(salvato).not.toBe(sorgente);
  expect(salvato.startsWith('{\n  "format": "algodesign",\n  "schema_version": 2,\n  "metadata"')).toBe(true);
  expect(salvato.endsWith("}\n")).toBe(true);
  const riaperto = apri(salvato);
  expect(riaperto.ok && salva(riaperto.progetto)).toBe(salvato);
});
