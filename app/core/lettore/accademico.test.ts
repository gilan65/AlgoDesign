// Il lettore di «Accademico» su testi scritti qui: le trasformazioni con la riga e il programma che ne esce, eseguito; le
// note; i valori iniziali; gli errori con la riga; l'aggiunta a una libreria, coi nomi in conflitto. L'andata e ritorno
// sul testo del generatore sta in `ui/genera/andata-e-ritorno.test.ts`.
//
// Che cosa queste prove NON guardano: i programmi della guida delle Selezioni scolastiche (si provano solo in locale);
// i messaggi dello strumento a riga di comando.
import { describe, expect, test } from "bun:test";
import { eseguiCaso } from "../casi/esecutore";
import { controlla, tetti } from "../controllo/controllo";
import { accademico } from "../genera/accademico";
import { testoDelCodice } from "../genera/forma";
import { progettoNuovo } from "../modifica/operazioni";
import type { CasoDiUnaFunzione, Progetto } from "../progetto/modello";
import { aggiungiAllaLibreria, leggiAccademico, type Lettura } from "./accademico";

const testo = (...righe: string[]) => righe.join("\n") + "\n";
type Letto = Extract<Lettura, { ok: true }>;
/** Gli errori statici di un progetto, che non deve essere fuori tappa. */
const erroriStatici = (p: Progetto) => {
  const c = controlla(p, tetti);
  if (c.fuoriTappa) throw new Error("fuori tappa");
  return c.errori;
};
const letto = (t: string, opzioni: Parameters<typeof leggiAccademico>[1] = {}, libreria?: Progetto): Letto => {
  const l = leggiAccademico(t, opzioni, libreria);
  if (!l.ok) throw new Error(`riga ${l.riga}: ${l.motivo}`);
  expect(erroriStatici(l.progetto)).toEqual([]);
  return l;
};
const trasformazioni = (l: Letto) => l.trasformazioni.map((t) => `${t.specie}@${t.riga}`);
const rigenerato = (p: Progetto) => {
  const g = accademico(p, tetti, "it");
  if (!g.generato) throw new Error(g.perche);
  return testoDelCodice(g.righe);
};
/** Il risultato di una funzione eseguita da sola coi valori dei parametri, nell'ordine. */
const chiama = (p: Progetto, nome: string, ...voci: [string, string][]) => {
  const f = p.functions.find((g) => g.name === nome)!;
  const caso: CasoDiUnaFunzione = { name: "prova", inputs: voci.map(([data, text]) => ({ data, text })), expected: { output: "" } };
  const e = eseguiCaso(p, caso, tetti, f.id);
  if (e.fuoriTappa) throw new Error("fuori tappa");
  return { output: e.ottenuto.output, errore: e.ottenuto.error?.code };
};
const programma = (p: Progetto) => {
  const e = eseguiCaso(p, { name: "prova", inputs: [], expected: { output: "" } }, tetti);
  if (e.fuoriTappa) throw new Error("fuori tappa");
  return e.ottenuto.output;
};

describe("le trasformazioni", () => {
  test("il return a metà: ciò che segue va nell'altro ramo, il valore nel risultato", () => {
    const l = letto(
      testo(
        "function segno(n: integer) → integer",
        "    if n < 0 then",
        "        return −1",
        "    end if",
        "    if n == 0 then",
        "        return 0",
        "    end if",
        "    return 1",
        "end function",
      ),
    );
    expect(trasformazioni(l)).toEqual(["return@3", "return@6"]);
    expect([chiama(l.progetto, "segno", ["n", "-4"]), chiama(l.progetto, "segno", ["n", "0"]), chiama(l.progetto, "segno", ["n", "9"])].map((x) => x.output)).toEqual(["→ -1\n", "→ 0\n", "→ 1\n"]);
  });

  test("il return dentro un for: un while con l'intero 0/1 che lo ferma, e ciò che segue saltato", () => {
    const l = letto(
      testo(
        "function primo_pari(v: integer[]) → integer",
        "    for i in [0 ... 4) do",
        "        if v[i] mod 2 == 0 then",
        "            return v[i]",
        "        end if",
        "    end for",
        "    return -1",
        "end function",
      ),
      { dimensione: 4 },
    );
    expect(trasformazioni(l)).toEqual(["return@4"]);
    expect(rigenerato(l.progetto)).toContain("while i < 4 and finito == 0 do");
    const v = (...xs: string[]) => xs.map((x) => ["v", x] as [string, string]);
    expect(chiama(l.progetto, "primo_pari", ...v("3", "5", "8", "2")).output).toBe("→ 8\n");
    expect(chiama(l.progetto, "primo_pari", ...v("3", "5", "7", "9")).output).toBe("→ -1\n");
  });

  test("il return vuoto di una procedura, lo scambio con un dato d'appoggio, la dichiarazione dentro un blocco", () => {
    const l = letto(
      testo(
        "function ordina(a: integer, b: integer)",
        "    if a ≤ b then",
        "        output(a)",
        "        output(b)",
        "        return",
        "    end if",
        "    variable c: integer",
        "    c ← 0",
        "    while c < 1 do",
        "        variable d: integer",
        "        d ← 1",
        "        (a, b) ← (b, a)",
        "        c ← c + d",
        "    end while",
        "    output(a)",
        "    output(b)",
        "end function",
      ),
    );
    expect(trasformazioni(l)).toEqual(["return@5", "dichiarazione@7", "dichiarazione@10", "scambio@12"]);
    expect([chiama(l.progetto, "ordina", ["a", "2"], ["b", "7"]), chiama(l.progetto, "ordina", ["a", "7"], ["b", "2"])].map((x) => x.output)).toEqual(["2\n7\n", "2\n7\n"]);
  });

  test("le trasformazioni nella lingua dei nomi aggiunti", () => {
    const l = letto(testo("function m(a: integer, b: integer) → integer", "    if a > b then", "        return a", "    end if", "    return b", "end function"), { lingua: "en" });
    expect(l.progetto.functions[1]!.data.map((d) => d.name)).toEqual(["a", "b", "result"]);
  });
});

describe("il codice esterno, le note, i valori iniziali", () => {
  test("come procedura: i nomi mai dichiarati diventano parametri nell'ordine del primo uso, vettori se indicizzati", () => {
    const l = letto(testo("variable s: int", "s ← 0", "for i in [0 ... n) do", "    s ← s + v[i]", "end for", "output(s)"), { procedura: "somma", dimensione: 3 });
    const f = l.progetto.functions.find((g) => g.name === "somma")!;
    expect(f.kind).toBe("procedure");
    expect(f.data.map((d) => `${d.name}${d.size !== undefined ? `[${d.size}]` : ""}${d.parameter !== undefined ? " par" : ""}`)).toEqual(["n par", "v[3] par", "s", "i"]);
    expect(l.note.map((n) => `${n.specie}@${n.riga}`)).toEqual(["int@1", "procedura@1", "parametro@3", "parametro@4", "dimensione@4"]);
    expect(trasformazioni(l)).toEqual([]);
    expect(chiama(l.progetto, "somma", ["n", "3"], ["v", "1"], ["v", "2"], ["v", "4"]).output).toBe("7\n");
  });

  test("come programma principale, i valori iniziali sono il prefisso nell'ordine dei dati: rigenerato identico", () => {
    const t = testo("variable a: integer", "variable b: integer", "variable v: integer[]", "b ← 1", "a ← 2", "output(a + b)");
    const l = letto(t);
    expect(l.progetto.functions[0]!.data.map((d) => `${d.name}=${JSON.stringify(d.initial)}`)).toEqual(["a=undefined", 'b="1"', "v=undefined"]);
    expect(rigenerato(l.progetto)).toBe(t);
    expect(programma(l.progetto)).toBe("3\n");
  });

  test("un elenco fuori dai valori iniziali: un'assegnazione per elemento, e la lunghezza del vettore", () => {
    const l = letto(testo("variable a: integer", "variable v: integer[]", "a ← 2", "output(a)", "v ← [3, 5 / a, −4]", "output(v[1] + v[2])"));
    expect(trasformazioni(l)).toEqual(["elenco@5"]);
    expect(l.progetto.functions[0]!.data.find((d) => d.name === "v")!.size).toBe(3);
    expect(programma(l.progetto)).toBe("2\n-2\n");
  });

  test("le costanti comuni prima delle funzioni", () => {
    const l = letto(testo("variable TRE: integer", "TRE ← 3", "", "function tre_volte(x: integer) → integer", "    return TRE × x", "end function", "", "output(tre_volte(5))"));
    expect(l.progetto.shared_constants).toEqual([{ name: "TRE", type: "integer", constant: true, initial: "3" }]);
    expect(programma(l.progetto)).toBe("15\n");
  });
});

describe("gli errori, con la riga", () => {
  const errore = (t: string, opzioni: Parameters<typeof leggiAccademico>[1] = {}) => {
    const l = leggiAccademico(t, opzioni);
    if (l.ok) throw new Error("letto senza errori");
    return `${l.riga}: ${l.motivo}`;
  };
  test("il testo che non si legge", () => {
    expect(errore(testo("variable x: integer", "x = 1"))).toBe("2: l'uguale si scrive «==» (e l'assegnazione «←»)");
    expect(errore(testo("variable x: integer", "x ← 1", "while x < 3 do", "    x ← x + 1"))).toBe("5: manca «end while»");
    expect(errore(testo("variable x: integer", "if x > 0 then", "end while"))).toBe("3: «end while» senza il suo «while» (è aperto un «if»)");
    expect(errore(testo("output(y)"))).toBe("1: y non è dichiarata");
  });
  test("ciò che il flowchart non ha: un nome col trattino basso, min e max, un for che cambia la sua fine", () => {
    expect(errore(testo("variable _x: integer", "_x ← 1", "output(_x)"))).toBe("2: _x: un nome col trattino basso non può essere un dato del flowchart");
    expect(errore(testo("variable a: integer", "a ← min(3, 4)"))).toBe("2: «min» non c'è nel flowchart: scrivila come una funzione");
    expect(errore(testo("variable n: integer", "n ← 3", "for i in [0 ... n) do", "    n ← n − 1", "end for"))).toBe("3: il ciclo cambia n, che dà la fine dell'intervallo: scrivilo con «while»");
  });
  test("un nome che il flowchart riserva: fermo, o rinominato a richiesta", () => {
    const t = testo("variable length: integer", "length ← 2", "output(length)");
    expect(errore(t)).toBe("1: il nome length è riservato nel flowchart (con la rinomina diventa length_2)");
    const l = letto(t, { rinomina: true });
    expect(trasformazioni(l)).toEqual(["nome-riservato@1"]);
    expect(programma(l.progetto)).toBe("2\n");
  });
});

describe("l'aggiunta a una libreria", () => {
  const vuota = (() => {
    const n = progettoNuovo({ name: "prove", library: true });
    if (!n.ok) throw new Error("nuova");
    return n.progetto;
  })();
  const conto = testo("function conto(n: integer) → integer", "    if n == 0 then", "        return 0", "    end if", "    return 1 + conto(n − 1)", "end function");

  test("ciò che c'è già identico non entra, e ciò che c'era non cambia", () => {
    const prima = aggiungiAllaLibreria(vuota, letto(conto, {}, vuota), false);
    if (!prima.ok) throw new Error("prima");
    expect(prima.aggiunte).toEqual(["conto"]);
    const ancora = aggiungiAllaLibreria(prima.progetto, letto(conto, {}, prima.progetto), false);
    if (!ancora.ok) throw new Error("ancora");
    expect([ancora.aggiunte, ancora.identiche]).toEqual([[], ["conto"]]);
    expect(ancora.progetto).toEqual(prima.progetto);
  });

  test("un nome già nella libreria ferma; con la rinomina prende `_2`, anche nella chiamata a sé stessa", () => {
    const prima = aggiungiAllaLibreria(vuota, letto(conto, {}, vuota), false);
    if (!prima.ok) throw new Error("prima");
    const altro = letto(testo("function conto(n: integer) → integer", "    return 2 × n", "end function", "", "function doppio_conto(n: integer) → integer", "    return conto(n) + conto(n)", "end function"), {}, prima.progetto);
    expect(aggiungiAllaLibreria(prima.progetto, altro, false)).toEqual({ ok: false, conflitti: [{ nome: "conto", riga: 1, proposto: "conto_2" }] });
    const r = aggiungiAllaLibreria(prima.progetto, altro, true);
    if (!r.ok) throw new Error("rinomina");
    expect(r.rinominate.map((t) => `${t.specie}@${t.riga} ${t.nome}→${t.nuovo}`)).toEqual(["nome-in-uso@1 conto→conto_2"]);
    expect(r.progetto.functions.slice(0, 2)).toEqual([...prima.progetto.functions]);
    expect(r.progetto.functions.find((f) => f.name === "doppio_conto")!.end.return_value).toBe("conto_2(n) + conto_2(n)");
    expect(erroriStatici(r.progetto)).toEqual([]);
  });

  test("un dato col nome di una funzione della libreria: fermo, o rinominato a richiesta", () => {
    const prima = aggiungiAllaLibreria(vuota, letto(conto, {}, vuota), false);
    if (!prima.ok) throw new Error("prima");
    const t = testo("function uno() → integer", "    variable conto: integer", "    conto ← 1", "    return conto", "end function");
    const l = leggiAccademico(t, {}, prima.progetto);
    expect(l.ok ? "" : `${l.riga}: ${l.motivo}`).toBe("2: il dato conto ha il nome di una funzione della libreria (con la rinomina diventa conto_2)");
    expect(trasformazioni(letto(t, { rinomina: true }, prima.progetto))).toEqual(["nome-in-uso@2"]);
  });
});
