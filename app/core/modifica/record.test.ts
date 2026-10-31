// Le modifiche dei record: gli attesi sono scritti a mano sui progetti del corpus dei tipi, e ogni progetto che esce passa
// dal lettore (lo garantisce `valida`).

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../controllo/controllo";
import { apri } from "../progetto/formato";
import { usaLeTabelle, type Blocco, type Progetto } from "../progetto/modello";
import { primoLibero } from "./identificatori";
import type { Operazione, Risultato } from "./operazioni";
import { aggiungiRecord, cambiaRecord, duplicaRecord, eliminaRecord, recordNuovo, rinominaICampiNelTesto, spostaRecord, usiDelRecord } from "./record";

const daFile = (nome: string): Progetto => {
  const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", `${nome}.algo`), "utf8"));
  if (!a.ok) throw new Error(`${nome} non si apre`);
  return a.progetto;
};
const applica = (op: Operazione, p: Progetto): Risultato => op(p, primoLibero(p));
const progettoDi = (r: Risultato): Progetto => {
  if (!r.ok) throw new Error(`rifiutata: ${JSON.stringify(r.rifiuto)}`);
  return r.progetto;
};
/** I testi delle regole della funzione principale, in ordine. */
const testi = (p: Progetto, f = 0): string[] => {
  const di = (b: Blocco): string[] => (b.kind === "assignment" ? [b.target, b.value] : b.kind === "write" ? [...b.values] : b.kind === "read" ? [b.target] : []);
  return p.functions[f]!.body.flatMap(di);
};

/** Gli errori statici del progetto (mai fuori tappa: il controllo conosce i record). */
const errori = (p: Progetto) => {
  const c = controlla(p, tetti);
  if (c.fuoriTappa) throw new Error("fuori tappa");
  return c.errori;
};
const copia = daFile("copia-di-un-record");
const nelProgramma = daFile("record-in-un-programma");
const alunno = copia.records![0]!;
const tuttiICampi = [0, 1, 2];

describe("il nome di un campo nelle regole", () => {
  test("cambia la parola del campo dopo il punto di un dato di quel record, e nient'altro", () => {
    const basi = new Set(["a", "b"]);
    const nomi = new Map([["voto", "media"]]);
    expect(rinominaICampiNelTesto("a.voto + b . voto + voto + x.voto", basi, nomi)).toBe("a.media + b . media + voto + x.voto");
    // Un letterale, un nome più lungo, un campo di un campo: restano.
    expect(rinominaICampiNelTesto('"a.voto" + a.voto2 + a.voto', basi, nomi)).toBe('"a.voto" + a.voto2 + a.media');
  });

  test("due campi scambiati di nome si scambiano davvero, in un passo solo", () => {
    const nomi = new Map([["nome", "classe"], ["classe", "nome"]]);
    expect(rinominaICampiNelTesto("a.nome + a.classe", new Set(["a"]), nomi)).toBe("a.classe + a.nome");
  });
});

describe("le operazioni sui record", () => {
  test("un record nuovo va in fondo, col nome vuoto e un campo; il controllo lo segnala", () => {
    const p = progettoDi(applica(aggiungiRecord(), copia));
    expect(p.records).toEqual([alunno, recordNuovo]);
    expect(errori(p).some((e) => e.code === "invalid_name" && e.block === "")).toBe(true);
    // Senza record, il campo nasce.
    const { records: _, ...senza } = copia;
    expect(progettoDi(applica(aggiungiRecord(), senza)).records).toEqual([recordNuovo]);
  });

  test("rinominare un campo cambia le regole che lo leggono e lo scrivono, nel programma e nei dati del record", () => {
    const campi = alunno.fields.map((c) => (c.name === "voto" ? { ...c, name: "media" } : c));
    const p = progettoDi(applica(cambiaRecord(0, { ...alunno, fields: campi }, tuttiICampi), copia));
    expect(testi(p)).toEqual(["b", "a", "b.media", "9", "a.media", '" "', "b.media", "a.nome", '"Bruno"', "a.nome", '" "', "b.nome"]);
    expect(errori(p)).toEqual([]);
    // Controllo positivo: senza l'origine il campo è nuovo, e le regole restano (con l'errore del campo che non c'è).
    const nuovo = progettoDi(applica(cambiaRecord(0, { ...alunno, fields: campi }, [0, 1, undefined]), copia));
    expect(testi(nuovo)).toContain("a.voto");
    expect(errori(nuovo).some((e) => e.code === "unknown_record_field")).toBe(true);
  });

  test("anche la costante comune e il parametro del record, e ciò che una funzione restituisce", () => {
    const campi = alunno.fields.map((c) => (c.name === "voto" ? { ...c, name: "media" } : c));
    const p = progettoDi(applica(cambiaRecord(0, { ...alunno, fields: campi }, tuttiICampi), nelProgramma));
    expect(testi(p, 0)).toEqual(["a", "promosso(primo)", "a.nome", '" "', "a.classe", '" "', "a.media", '" "', "primo.media"]);
    expect(testi(p, 1)).toEqual(["x.media", "x.media + 1"]);
    expect(errori(p)).toEqual([]);
  });

  test("rinominare il record cambia il tipo dei dati, delle costanti e dei risultati, mai le regole né un altro record", () => {
    const due = progettoDi(applica(duplicaRecord(0), nelProgramma));
    expect(due.records!.map((r) => r.name)).toEqual(["alunno", "alunno_2"]);
    const p = progettoDi(applica(cambiaRecord(0, { ...alunno, name: "studente" }, tuttiICampi), due));
    expect(p.records!.map((r) => r.name)).toEqual(["studente", "alunno_2"]);
    expect(p.shared_constants![0]!.record).toBe("studente");
    expect(p.functions[0]!.data[0]!.record).toBe("studente");
    expect(p.functions[1]!.return_record).toBe("studente");
    expect(p.functions[1]!.data[0]!.record).toBe("studente");
    expect(testi(p)).toEqual(testi(nelProgramma));
    expect(usiDelRecord(p, "studente")).toBe(4);
    expect(usiDelRecord(p, "alunno_2")).toBe(0);
    // Il nome nuovo già di un altro record: il tipo dei dati resta (il controllo dice il nome doppio).
    const doppio = progettoDi(applica(cambiaRecord(1, { ...alunno, name: "alunno" }, tuttiICampi), due));
    expect(doppio.functions[0]!.data[0]!.record).toBe("alunno");
    expect(errori(doppio).some((e) => e.code === "record_name_in_use")).toBe(true);
  });

  test("eliminare lascia i dati col record che non c'è; spostare scambia, e al bordo si rifiuta", () => {
    const senza = progettoDi(applica(eliminaRecord(0), copia));
    expect(senza.records).toBeUndefined();
    expect(errori(senza).some((e) => e.code === "unknown_record")).toBe(true);
    const due = progettoDi(applica(duplicaRecord(0), copia));
    expect(progettoDi(applica(spostaRecord(0, 1), due)).records!.map((r) => r.name)).toEqual(["alunno_2", "alunno"]);
    const bordo = applica(spostaRecord(0, -1), due);
    expect(bordo.ok ? "" : bordo.rifiuto.motivo).toBe("al_bordo");
    const fuori = applica(eliminaRecord(3), due);
    expect(fuori.ok ? "" : fuori.rifiuto.motivo).toBe("record_inesistente");
  });
});

describe("il campo di una tabella e i valori che seguono l'ordine dei campi", () => {
  test("il campo di un record della tabella e del risultato di una funzione del record cambia come `a.voto`", () => {
    const nomi = new Map([["voto", "media"]]);
    expect(rinominaICampiNelTesto("t[i].voto + a.voto + t[t[0].voto].voto", new Set(["t", "a"]), nomi)).toBe("t[i].media + a.media + t[t[0].media].media");
    expect(rinominaICampiNelTesto("f(x)[i].voto + g(f(x).voto).voto", new Set(["f()"]), nomi)).toBe("f(x)[i].media + g(f(x).media).voto");
    // Un'altra tabella, un'altra funzione, il campo di un campo: restano.
    expect(rinominaICampiNelTesto("f(x)[i].voto + u[i].voto + t[i].a.voto", new Set(["t"]), nomi)).toBe("f(x)[i].voto + u[i].voto + t[i].a.voto");
  });

  test("su tutto il corpus dei tipi: ogni campo rinominato lascia le regole senza errori nuovi", () => {
    const cartella = join(import.meta.dir, "..", "..", "casi", "tipi");
    const nomi = readdirSync(cartella).filter((n) => n.endsWith(".algo"));
    let giusti = 0;
    let conTabelle = 0;
    const rotti: string[] = [];
    for (const n of nomi) {
      const p = daFile(n.slice(0, -5));
      if ((p.records ?? []).length === 0 || errori(p).length > 0) continue;
      giusti++;
      if (usaLeTabelle(p)) conTabelle++;
      let q = p;
      p.records!.forEach((r, i) => {
        q = progettoDi(applica(cambiaRecord(i, { ...r, fields: r.fields.map((c) => ({ ...c, name: `${c.name}_x` })) }, r.fields.map((_, k) => k)), q));
      });
      if (errori(q).length > 0) rotti.push(`${n}: ${errori(q).map((e) => e.code).join(", ")}`);
    }
    console.log(`campi rinominati: ${giusti} progetti giusti coi record, ${conTabelle} con le tabelle, su ${nomi.length} file`);
    // Le premesse: il corpus ha progetti giusti con le tabelle, dove il difetto si vede.
    expect(conTabelle).toBeGreaterThan(0);
    expect(rotti).toEqual([]);
  });

  /** `punto{x, y}` in un dato, una tabella, un record ripetuto, una costante comune e il parametro di una funzione coi
   * suoi casi (attesi scritti a mano). */
  const punti = (): Progetto => {
    const a = apri(
      JSON.stringify({
        format: "algodesign",
        schema_version: 2,
        metadata: { name: "punti" },
        records: [{ name: "punto", fields: [{ name: "x", type: "integer" }, { name: "y", type: "integer" }] }],
        shared_constants: [{ name: "Q", type: "record", record: "punto", constant: true, initial: ["5", "6"] }],
        functions: [
          {
            id: "f1",
            kind: "main",
            data: [
              { name: "p", type: "record", record: "punto", initial: ["1", "2"] },
              { name: "t", type: "record", record: "punto", size: 2, initial: [["1", "2"], ["3", "4"]] },
              { name: "u", type: "record", record: "punto", size: 3, initial: { each: ["7", "8"] } },
              { name: "n", type: "integer", initial: "1" },
            ],
            body: [{ id: "b2", kind: "write", values: ["p.x + t[1].y + u[0].x + Q.y + somma(p, t, n)"], newline: true }],
            end: { id: "b3" },
          },
          {
            id: "f2",
            kind: "function",
            name: "somma",
            return_type: "integer",
            data: [
              { name: "a", type: "record", record: "punto", parameter: "value" },
              { name: "s", type: "record", record: "punto", size: 2, parameter: "value" },
              { name: "k", type: "integer", parameter: "value" },
            ],
            body: [],
            end: { id: "b4", return_value: "a.x + a.y + s[1].x + k" },
            test_cases: [
              {
                name: "uno",
                inputs: [
                  { data: "a", text: "1" },
                  { data: "a", text: "2" },
                  { data: "s", text: "3" },
                  { data: "s", text: "4" },
                  { data: "s", text: "5" },
                  { data: "s", text: "6" },
                  { data: "k", text: "9" },
                ],
                expected: { output: "→ 17\n" },
              },
            ],
          },
        ],
      }),
    );
    if (!a.ok) throw new Error("punti non si apre");
    return a.progetto;
  };
  const valori = (p: Progetto) => ({
    dati: p.functions[0]!.data.slice(0, 3).map((d) => d.initial),
    costante: p.shared_constants![0]!.initial,
    voci: p.functions[1]!.test_cases![0]!.inputs.map((v) => (v.text === undefined ? `${v.data}:` : `${v.data}:${v.text}`)),
  });
  const x = { name: "x", type: "integer" } as const;
  const y = { name: "y", type: "integer" } as const;
  const z = { name: "z", type: "integer" } as const;

  test("spostare un campo sposta il suo valore iniziale e la sua voce nei casi", () => {
    const p = punti();
    expect(errori(p)).toEqual([]);
    const q = progettoDi(applica(cambiaRecord(0, { name: "punto", fields: [y, x] }, [1, 0]), p));
    expect(valori(q)).toEqual({
      dati: [["2", "1"], [["2", "1"], ["4", "3"]], { each: ["8", "7"] }],
      costante: ["6", "5"],
      voci: ["a:2", "a:1", "s:4", "s:3", "s:6", "s:5", "k:9"],
    });
    expect(errori(q)).toEqual([]);
  });

  test("un campo aggiunto resta senza valore (il controllo lo segnala), uno tolto porta via il suo", () => {
    const p = punti();
    const conZ = progettoDi(applica(cambiaRecord(0, { name: "punto", fields: [x, z, y] }, [0, undefined, 1]), p));
    expect(valori(conZ)).toEqual({
      dati: [["1", "", "2"], [["1", "", "2"], ["3", "", "4"]], { each: ["7", "", "8"] }],
      costante: ["5", "", "6"],
      voci: ["a:1", "a:", "a:2", "s:3", "s:", "s:4", "s:5", "s:", "s:6", "k:9"],
    });
    expect(errori(conZ).length).toBeGreaterThan(0);
    // Il record rinominato insieme: i dati seguono il nome nuovo e i valori l'ordine nuovo.
    const coppia = progettoDi(applica(cambiaRecord(0, { name: "coppia", fields: [y, x] }, [1, 0]), p));
    expect(coppia.functions[0]!.data.slice(0, 3).map((d) => d.record)).toEqual(["coppia", "coppia", "coppia"]);
    expect(valori(coppia).dati[0]).toEqual(["2", "1"]);
    expect(valori(coppia).voci.slice(0, 2)).toEqual(["a:2", "a:1"]);
    const senzaX = progettoDi(applica(cambiaRecord(0, { name: "punto", fields: [y] }, [1]), p));
    expect(valori(senzaX)).toEqual({
      dati: [["2"], [["2"], ["4"]], { each: ["8"] }],
      costante: ["6"],
      voci: ["a:2", "s:4", "s:6", "k:9"],
    });
  });

  test("le voci di un parametro per riferimento si riordinano, uno per uscita non ne ha; quelle intercalate restano", () => {
    const p = punti();
    const conModi: Progetto = {
      ...p,
      functions: p.functions.map((f, i) =>
        i !== 1
          ? f
          : {
              ...f,
              data: [...f.data, { name: "r", type: "record", record: "punto", parameter: "reference" }, { name: "o", type: "record", record: "punto", parameter: "out" }],
              test_cases: [{ ...f.test_cases![0]!, inputs: [...f.test_cases![0]!.inputs, { data: "r", text: "7" }, { data: "r", text: "8" }] }],
            },
      ),
    };
    expect(valori(progettoDi(applica(cambiaRecord(0, { name: "punto", fields: [y, x] }, [1, 0]), conModi))).voci).toEqual(["a:2", "a:1", "s:4", "s:3", "s:6", "s:5", "k:9", "r:8", "r:7"]);
    // Un caso scritto con le voci del dato intercalate (atteso un errore della lettura) resta com'è.
    const intercalate: Progetto = {
      ...p,
      functions: p.functions.map((f, i) => (i !== 1 ? f : { ...f, test_cases: [{ ...f.test_cases![0]!, inputs: [{ data: "a", text: "1" }, { data: "k", text: "9" }, { data: "a", text: "2" }] }] })),
    };
    expect(valori(progettoDi(applica(cambiaRecord(0, { name: "punto", fields: [y, x] }, [1, 0]), intercalate))).voci).toEqual(["a:1", "k:9", "a:2"]);
  });
});

describe("gli errori dei record nell'esito del controllo", () => {
  test("arrivano record per record, con la posizione, il codice e la causa: la riga e la riga di stato li leggono da lì", () => {
    // Il secondo record ha un campo doppio, il terzo nessun campo; il primo è giusto.
    const p = progettoDi(applica(aggiungiRecord({ name: "vuoto", fields: [] }), progettoDi(applica(aggiungiRecord({ name: "doppio", fields: [{ name: "x", type: "integer" }, { name: "x", type: "real" }] }), copia))));
    const c = controlla(p, tetti);
    if (c.fuoriTappa) throw new Error("fuori tappa");
    expect((c.record ?? []).map((s) => [s.indice, s.code, s.fermata?.causa])).toEqual([
      [1, "invalid_record", "campo_doppio"],
      [2, "invalid_record", "senza_campi"],
    ]);
    // Gli stessi errori stanno anche fra quelli del progetto, col blocco vuoto (la forma dell'atteso di un caso).
    expect(c.errori.filter((e) => e.block === "").map((e) => e.code)).toEqual(["invalid_record", "invalid_record"]);
    // Controllo positivo: il progetto giusto non ne ha.
    const giusto = controlla(copia, tetti);
    expect(giusto.fuoriTappa ? null : giusto.record).toEqual([]);
  });
});
