// Le modifiche dei record: gli attesi sono scritti a mano sui progetti del corpus dei tipi, e ogni progetto che esce passa
// dal lettore (lo garantisce `valida`).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../controllo/controllo";
import { apri } from "../progetto/formato";
import type { Blocco, Progetto } from "../progetto/modello";
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
