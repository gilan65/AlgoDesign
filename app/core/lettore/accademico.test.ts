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
import type { Blocco, CasoDiUnaFunzione, Progetto } from "../progetto/modello";
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
    expect(rigenerato(l.progetto)).toContain("while finito == 0 and i < 4 do");
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

  test("il return dentro un while: la condizione non si rivaluta dopo il return (finito per primo)", () => {
    const l = letto(
      testo(
        "function f() → integer",
        "    variable v: integer[]",
        "    variable i: integer",
        "    v ← [1, 1, 1]",
        "    i ← 0",
        "    while v[i] ≠ 0 do",
        "        i ← i + 1",
        "        if i == 3 then",
        "            return 1",
        "        end if",
        "    end while",
        "    return 0",
        "end function",
      ),
    );
    expect(rigenerato(l.progetto)).toContain("while finito == 0 and v[i] ≠ 0 do");
    expect(chiama(l.progetto, "f")).toEqual({ output: "→ 1\n", errore: undefined });
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
  test("ciò che il flowchart non ha: un nome col trattino basso, un for che cambia la sua fine", () => {
    expect(errore(testo("variable _x: integer", "_x ← 1", "output(_x)"))).toBe("2: _x: un nome col trattino basso non può essere un dato del flowchart");
    expect(errore(testo("variable n: integer", "n ← 3", "for i in [0 ... n) do", "    n ← n − 1", "end for"))).toBe("3: il ciclo cambia n, che dà la fine dell'intervallo: scrivilo con «while»");
  });
  test("un for con un return dentro che cambia la sua fine o il suo indice: lo stesso arresto che senza il return", () => {
    const conReturn = (cambia: string) =>
      testo("function f(n: integer) → integer", "    for i in [0 ... n) do", `        ${cambia}`, "        if i == 5 then", "            return i", "        end if", "    end for", "    return 0", "end function");
    expect(errore(conReturn("n ← n − 1"))).toBe("2: il ciclo cambia n, che dà la fine dell'intervallo: scrivilo con «while»");
    expect(errore(conReturn("i ← i + 1"))).toBe("2: il ciclo cambia il suo indice i: il flowchart non lo ammette");
  });
  test("una chiamata col nome di un'operazione del flowchart, e un elenco che legge il vettore che lo riceve", () => {
    for (const op of ["length", "round", "absolute_value"])
      expect(errore(testo("variable v: integer[]", "variable n: integer", "v ← [1, 2, 3]", `n ← ${op}(v)`, "output(n)"))).toBe(`4: «${op}» non c'è in «Accademico»: scrivila come una funzione, con un altro nome`);
    expect(errore(testo("variable v: integer[]", "v ← [1, 2]", "output(v[0])", "v ← [v[1], v[0]]", "output(v[0])"))).toBe("4: l'elenco legge v, il vettore che lo riceve: metti prima i valori in un vettore d'appoggio");
  });
  test("la procedura del codice fuori dalle funzioni: il suo nome si controlla solo se quel codice c'è; un dato col suo nome, rinominato a richiesta", () => {
    const soloFunzioni = testo("function somma(a: integer, b: integer) → integer", "    return a + b", "end function");
    expect(leggiAccademico(soloFunzioni, { procedura: "somma" }).ok).toBe(true);
    expect(errore(testo("function somma(a: integer) → integer", "    return a", "end function", "", "output(somma(2))"), { procedura: "somma" })).toBe(
      "0: la procedura del codice fuori dalle funzioni, somma, ha il nome di una procedura o funzione del testo",
    );
    const t = testo("totale ← 0", "output(totale)");
    expect(errore(t, { procedura: "totale" })).toBe("1: il dato totale ha il nome della procedura del codice fuori dalle funzioni (con la rinomina diventa totale_2)");
    const l = letto(t, { procedura: "totale", rinomina: true });
    expect(trasformazioni(l)).toEqual(["nome-in-uso@1"]);
    expect(l.progetto.functions.find((f) => f.name === "totale")!.data.map((d) => d.name)).toEqual(["totale_2"]);
    // Dichiarato, o contatore di un `for`: lo stesso.
    const dichiarato = testo("variable totale: integer", "totale ← 1", "output(totale)");
    expect(errore(dichiarato, { procedura: "totale" })).toBe("1: il dato totale ha il nome della procedura del codice fuori dalle funzioni (con la rinomina diventa totale_2)");
    expect(letto(dichiarato, { procedura: "totale", rinomina: true }).progetto.functions.find((f) => f.name === "totale")!.data.map((d) => d.name)).toEqual(["totale_2"]);
    expect(errore(testo("for totale in [0 ... 3) do", "    output(totale)", "end for"), { procedura: "totale" })).toBe(
      "1: il dato totale ha il nome della procedura del codice fuori dalle funzioni (con la rinomina diventa totale_2)",
    );
  });
  test("la procedura del codice fuori dalle funzioni col nome di una costante comune: fermo", () => {
    expect(errore(testo("variable limite: integer", "limite ← 10", "", "function f(x: integer) → integer", "    return x + limite", "end function", "", "output(f(1))"), { procedura: "limite" })).toBe(
      "0: la procedura del codice fuori dalle funzioni, limite, ha il nome di una costante comune del testo",
    );
  });
  test("il valore che una funzione restituisce in fondo passa dagli stessi controlli: un'operazione del flowchart", () => {
    expect(errore(testo("function f(v: integer[]) → integer", "    return length(v)", "end function"))).toBe("2: «length» non c'è in «Accademico»: scrivila come una funzione, con un altro nome");
  });
  test("un nome che il flowchart riserva: fermo, o rinominato a richiesta", () => {
    const t = testo("variable length: integer", "length ← 2", "output(length)");
    expect(errore(t)).toBe("1: il nome length è riservato nel flowchart (con la rinomina diventa length_2)");
    const l = letto(t, { rinomina: true });
    expect(trasformazioni(l)).toEqual(["nome-riservato@1"]);
    expect(programma(l.progetto)).toBe("2\n");
  });
});

describe("le forme di prima", () => {
  const forme = (l: Letto) => l.note.filter((n) => n.specie === "forma").map((n) => `${n.forma}@${n.riga}`);
  const inOrdine = (bs: readonly Blocco[]): Blocco[] => bs.flatMap((b) => [b, ...inOrdine(b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? b.body : [])]);
  const blocchi = (l: Letto, nome?: string) => inOrdine(l.progetto.functions.find((f) => (nome === undefined ? f.kind === "main" : f.name === nome))!.body);
  const commenti = (l: Letto, nome?: string) => blocchi(l, nome).flatMap((b) => (b.kind === "comment" ? [b.text] : []));
  const fermo = (t: string, opzioni: Parameters<typeof leggiAccademico>[1] = {}) => {
    const l = leggiAccademico(t, opzioni);
    if (l.ok) throw new Error("letto senza errori");
    return `${l.riga}: ${l.motivo}`;
  };

  test("l'uguale nelle condizioni di if e while, con la nota e il commento; fuori dalle condizioni resta un errore", () => {
    const l = letto(testo("variable n: integer", "n ← 1", "if n = 1 then", "    output(n)", "end if", "while n = 1 do", "    n ← 2", "end while"));
    expect(forme(l)).toEqual(["uguale@3", "uguale@6"]);
    expect(commenti(l)).toEqual(["Nel testo: if n = 1 then", "Nel testo: while n = 1 do"]);
    expect(blocchi(l).flatMap((b) => (b.kind === "if" || b.kind === "while" ? [b.condition] : []))).toEqual(["n == 1", "n == 1"]);
    expect(programma(l.progetto)).toBe("1\n");
    expect(fermo(testo("variable x: integer", "x = 1"))).toBe("2: l'uguale si scrive «==» (e l'assegnazione «←»)");
  });

  test("i confronti scritti da tastiera: gli stessi segni, senza nota e nel flowchart con le sue regole", () => {
    const l = letto(testo("variable a: integer", "a ← 1", "if a <= 1 then", "    output(1)", "end if", "if a >= 2 then", "    output(2)", "end if", "if a != 3 then", "    output(3)", "end if"));
    expect(forme(l)).toEqual([]);
    expect(commenti(l)).toEqual([]);
    expect(blocchi(l).flatMap((b) => (b.kind === "if" ? [b.condition] : []))).toEqual(["a <= 1", "a >= 2", "a != 3"]);
    expect(programma(l.progetto)).toBe("1\n3\n");
  });

  test("l'intervallo con la virgola", () => {
    const l = letto(testo("for i in [1, 4) do", "    output(i)", "end for"));
    expect(forme(l)).toEqual(["intervallo@1"]);
    expect(commenti(l)).toEqual(["Nel testo: for i in [1, 4) do"]);
    expect(programma(l.progetto)).toBe("1\n2\n3\n");
  });

  test("output senza tonde, con un valore o una stringa; un dato che si chiama output resta un dato", () => {
    const l = letto(testo("variable t: integer", "t ← 7", "output t", 'output "ciao"', "output t + 1"));
    expect(forme(l)).toEqual(["output@3", "output@4", "output@5"]);
    expect(programma(l.progetto)).toBe("7\nciao\n8\n");
    const d = letto(testo("variable output: integer", "output ← 1", "output ← output + 1"));
    expect(forme(d)).toEqual([]);
  });

  test("MOD è un operatore solo dove va un operatore: un dato che si chiama MOD non si tocca", () => {
    const l = letto(testo("variable x: integer", "x ← 5", "if x MOD 2 == 1 then", "    output(x)", "end if"));
    expect(forme(l)).toEqual(["mod@3"]);
    expect(blocchi(l).flatMap((b) => (b.kind === "if" ? [b.condition] : []))).toEqual(["x mod 2 == 1"]);
    const d = letto(testo("variable MOD: integer", "MOD ← 7", "output(MOD + 1)"));
    expect([forme(d), programma(d.progetto)]).toEqual([[], "8\n"]);
    const e = letto(testo("variable MOD: integer", "variable x: integer", "MOD ← 4", "x ← 9 MOD MOD", "output(x)"));
    expect(programma(e.progetto)).toBe("1\n");
  });

  test("procedure: coi parametri o senza tonde, con end procedure; un dato che si chiama procedure resta un dato", () => {
    const l = letto(testo("procedure scrivi_due(n: integer)", "    variable d: integer", "    d ← n × 2", "    output(d)", "end procedure"));
    expect(forme(l)).toEqual(["procedure@1"]);
    expect(trasformazioni(l)).toEqual([]);
    expect(commenti(l, "scrivi_due")).toEqual(["Nel testo: procedure scrivi_due(n: integer)"]);
    expect(chiama(l.progetto, "scrivi_due", ["n", "4"]).output).toBe("8\n");
    const s = letto(testo("procedure SALUTA", "    output(1)", "end procedure"));
    expect(s.progetto.functions.find((f) => f.name === "SALUTA")!.kind).toBe("procedure");
    expect(fermo(testo("procedure p(n: integer)", "    output(n)", "end function"))).toBe("3: «end function» senza il suo «function» (è aperto un «procedure»)");
    expect(fermo(testo("procedure p(n: integer)", "    output(n)"))).toBe("3: manca «end procedure»");
    expect(forme(letto(testo("variable procedure: integer", "procedure ← 1", "output(procedure)")))).toEqual([]);
  });

  test("la lunghezza scritta nel tipo: letta dal testo, anche per un parametro, e senza la nota sulla lunghezza predefinita", () => {
    const l = letto(testo("variable v: integer[14]", "v[0] ← 1", "output(v[0])"));
    expect(l.progetto.functions[0]!.data.find((d) => d.name === "v")!.size).toBe(14);
    expect(l.note.map((n) => `${n.specie}:${n.forma ?? ""}:${n.nome ?? ""}:${n.valore ?? ""}@${n.riga}`)).toEqual(["forma:lunghezza:v:14@1"]);
    expect(commenti(l)).toEqual([]);
    const p = letto(testo("function primo(v: integer[4]) → integer", "    return v[0]", "end function"));
    expect(p.progetto.functions.find((f) => f.name === "primo")!.data.find((d) => d.name === "v")!.size).toBe(4);
    expect(fermo(testo("variable v: integer[3]", "output(1)", "v ← [1, 2]"))).toBe("3: il vettore v è lungo 3, ma l'elenco ha 2 valori");
    expect(fermo(testo("variable n: integer", "variable v: integer[n]"))).toBe("2: manca la quadra che chiude il tipo del vettore");
    const c = leggiAccademico(testo("variable v: integer[1001]", "output(1)"));
    if (!c.ok) throw new Error(c.motivo);
    expect(erroriStatici(c.progetto).map((e) => e.code)).toEqual(["limit_exceeded"]);
  });

  test("una variabile non dichiarata in una funzione: assegnata è un dato della funzione, solo letta è un errore", () => {
    const l = letto(testo("function f(a: integer) → integer", "    b ← a + 1", "    return b", "end function"));
    expect(l.note.map((n) => `${n.specie}:${n.nome}@${n.riga}`)).toEqual(["dato-della-funzione:b@2"]);
    expect(l.progetto.functions.find((f) => f.name === "f")!.data.map((d) => `${d.name}${d.parameter !== undefined ? " par" : ""}`)).toEqual(["a par", "b"]);
    expect(chiama(l.progetto, "f", ["a", "4"]).output).toBe("→ 5\n");
    expect(fermo(testo("function f(a: integer) → integer", "    return a + b", "end function"))).toBe("2: b non è dichiarata");
    const v = letto(testo("function g() → integer", "    w[0] ← 3", "    return w[0]", "end function"), { dimensione: 2 });
    expect(v.progetto.functions.find((f) => f.name === "g")!.data.map((d) => `${d.name}[${d.size}]`)).toEqual(["w[2]"]);
  });

  test("lunghezza e len entrano senza rinomina chiesta, col loro nome e la trasformazione; gli altri nomi riservati fermano ancora", () => {
    const l = letto(testo("function f(lunghezza: integer) → integer", "    return lunghezza + 1", "end function", "", "len ← f(2)", "output(len)"), { procedura: "prova" });
    expect(l.trasformazioni.map((t) => `${t.specie} ${t.nome}→${t.nuovo}@${t.riga}`)).toEqual(["nome-riservato lunghezza→lunghezza_2@1", "nome-riservato len→len_2@5"]);
    expect(chiama(l.progetto, "f", ["lunghezza_2", "4"]).output).toBe("→ 5\n");
    expect(fermo(testo("variable length: integer", "length ← 2", "output(length)"))).toBe("1: il nome length è riservato nel flowchart (con la rinomina diventa length_2)");
  });

  test("max e min: la funzione aggiunta, con la trasformazione; il nome preso; quella dell'autore non si tocca", () => {
    const l = letto(testo("variable a: integer", "a ← max(3, 4)", "output(a)", "output(MIN(3, 4))"));
    expect(l.trasformazioni.map((t) => `${t.specie} ${t.nome}→${t.nuovo}@${t.riga}`)).toEqual(["funzione-aggiunta max→massimo@2", "funzione-aggiunta MIN→minimo@4"]);
    expect(l.progetto.functions.filter((f) => f.kind === "function").map((f) => f.name)).toEqual(["massimo", "minimo"]);
    expect(programma(l.progetto)).toBe("4\n3\n");
    expect(rigenerato(l.progetto)).toContain("a ← massimo(3, 4)");
    const preso = letto(testo("variable massimo: integer", "massimo ← max(1, 2)", "output(massimo)"));
    expect(preso.trasformazioni.map((t) => t.nuovo)).toEqual(["massimo_2"]);
    expect(programma(preso.progetto)).toBe("2\n");
    const autore = letto(testo("function MAX(a: integer) → integer", "    return a", "end function", "", "output(MAX(1))"));
    expect(trasformazioni(autore)).toEqual([]);
    expect(programma(autore.progetto)).toBe("1\n");
  });

  test("max in una libreria che ha già la stessa funzione: riusata; una diversa con quel nome: il primo nome libero", () => {
    const n = progettoNuovo({ name: "prove", library: true });
    if (!n.ok) throw new Error("nuova");
    const prima = aggiungiAllaLibreria(n.progetto, letto(testo("x ← max(1, 2)", "output(x)"), { procedura: "uno" }, n.progetto), false);
    if (!prima.ok) throw new Error("prima");
    expect(prima.aggiunte).toEqual(["massimo", "uno"]);
    const ancora = letto(testo("y ← max(5, 6)", "output(y)"), { procedura: "due" }, prima.progetto);
    expect(ancora.trasformazioni.map((t) => t.nuovo)).toEqual(["massimo"]);
    const r = aggiungiAllaLibreria(prima.progetto, ancora, false);
    if (!r.ok) throw new Error("ancora");
    expect([r.aggiunte, r.identiche]).toEqual([["due"], ["massimo"]]);
    const diversa = aggiungiAllaLibreria(n.progetto, letto(testo("function massimo(a: integer, b: integer) → integer", "    return a", "end function"), {}, n.progetto), false);
    if (!diversa.ok) throw new Error("diversa");
    const altra = letto(testo("z ← max(1, 2)", "output(z)"), { procedura: "tre" }, diversa.progetto);
    expect(altra.trasformazioni.map((t) => t.nuovo)).toEqual(["massimo_2"]);
  });

  test("SCRIVI è una scrittura di tutti i valori senza a capo; una funzione dell'autore che si chiama così non si tocca", () => {
    const l = letto(testo("variable a: integer", "a ← 1", 'SCRIVI("a = ", a, " b = ", 2)', 'SCRIVI("\\n")', 'SCRIVI("fine")'));
    expect(forme(l)).toEqual(["scrivi@3", "scrivi@4", "scrivi@5"]);
    expect(commenti(l)[0]).toBe('Nel testo: SCRIVI("a = ", a, " b = ", 2)');
    expect(programma(l.progetto)).toBe("a = 1 b = 2\nfine");
    const autore = letto(testo("function SCRIVI(n: integer)", "    output(n)", "end function", "", "SCRIVI(3)"));
    expect(forme(autore)).toEqual([]);
    expect(programma(autore.progetto)).toBe("3\n");
  });

  test("ciò che il testo non definisce: una frase col nome; Infinity dice che cosa scrivere, e dichiarato è un nome riservato come gli altri", () => {
    expect(fermo(testo("function f() → integer", "    return chiosco()", "end function"))).toBe("2: «chiosco» non è una procedura o una funzione di questo testo: aggiungila al testo con la sua «function»");
    expect(fermo(testo("chiosco(1)"))).toBe("1: «chiosco» non è una procedura o una funzione di questo testo: aggiungila al testo con la sua «function»");
    const infinito = "«Infinity» non c'è nel flowchart: scrivi al suo posto un numero molto grande rispetto ai valori del programma, per esempio 1000000000 (con il meno davanti per -Infinity)";
    expect(fermo(testo("x ← -Infinity", "output(x)"), { procedura: "prova" })).toBe(`1: ${infinito}`);
    expect(fermo(testo("variable x: integer", "x ← Infinity", "output(x)"))).toBe(`2: ${infinito}`);
    const dichiarato = testo("variable Infinity: integer", "Infinity ← 2", "output(Infinity)");
    expect(fermo(dichiarato)).toBe("1: il nome Infinity è riservato nel flowchart (con la rinomina diventa Infinity_2)");
    expect(programma(letto(dichiarato, { rinomina: true }).progetto)).toBe("2\n");
  });

  test("il vettore che la funzione modifica: per riferimento solo se chiesto, con la nota, anche attraverso un'altra funzione", () => {
    const t = testo("function azzera(a: integer[])", "    a[0] ← 0", "end function", "", "function passa(b: integer[])", "    azzera(b)", "end function", "", "function legge(c: integer[]) → integer", "    return c[0]", "end function", "", "variable v: integer[]", "v ← [5, 6]", "passa(v)", "output(v[0])", "output(legge(v))");
    const senza = letto(t);
    expect(senza.note.filter((n) => n.specie === "riferimento")).toEqual([]);
    expect(programma(senza.progetto)).toBe("5\n5\n");
    const l = letto(t, { vettoriModificati: true });
    const parametri = (nome: string) => l.progetto.functions.find((f) => f.name === nome)!.data[0]!.parameter;
    expect(["azzera", "passa", "legge"].map(parametri)).toEqual(["reference", "reference", "value"]);
    expect(l.note.filter((n) => n.specie === "riferimento").map((n) => `${n.funzione}.${n.nome}@${n.riga}`)).toEqual(["azzera.a@2", "passa.b@6"]);
    expect(programma(l.progetto)).toBe("0\n0\n");
    const conRisultato = letto(testo("function primo(a: integer[]) → integer", "    a[0] ← 9", "    return a[0]", "end function"), { vettoriModificati: true });
    expect(conRisultato.progetto.functions.find((f) => f.name === "primo")!.data[0]!.parameter).toBe("value");
    expect(conRisultato.note.filter((n) => n.specie === "riferimento")).toEqual([]);
  });

  test("la riga vecchia nella linguetta di «Accademico»: sopra quella ufficiale, riletta uguale; gli altri commenti restano omessi", () => {
    const l = letto(testo("variable n: integer", "n ← 1", "if n = 1 then", "    output(n)", "end if"));
    const generato = rigenerato(l.progetto);
    expect(generato).toContain("// Nel testo: if n = 1 then\nif n == 1 then\n");
    const riletto = letto(generato);
    expect(forme(riletto)).toEqual([]);
    expect(commenti(riletto)).toEqual(["Nel testo: if n = 1 then"]);
    expect(rigenerato(riletto.progetto)).toBe(generato);
    const altro: Progetto = { ...l.progetto, functions: l.progetto.functions.map((f) => (f.kind === "main" ? { ...f, body: [{ id: "c9", kind: "comment", text: "una nota mia" }, ...f.body] } : f)) };
    expect(rigenerato(altro)).not.toContain("una nota mia");
    expect(fermo(testo("// una nota", "output(1)"))).toBe("1: «/» non è un valore");
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

  test("la procedura del codice fuori dalle funzioni col nome di una della libreria: fermo", () => {
    const prima = aggiungiAllaLibreria(vuota, letto(conto, {}, vuota), false);
    if (!prima.ok) throw new Error("prima");
    const l = leggiAccademico(testo("output(conto(3))"), { procedura: "conto" }, prima.progetto);
    expect(l.ok ? "" : `${l.riga}: ${l.motivo}`).toBe("0: la procedura del codice fuori dalle funzioni, conto, ha il nome di una procedura o funzione della libreria");
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
