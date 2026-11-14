// Il lettore dei file di Flowgorithm sui messaggi che il corpus non ha (`casi-flowgorithm.test.ts` dichiara quali): un
// nome che AlgoDesign non ammette, un vettore ricevuto con due dimensioni, il progetto convertito con un errore statico.
// E le forme che il corpus non esercita: la lettura, il passo e il verso di un «per» all'indietro come «mentre».
//
// Che cosa queste prove NON guardano: l'output di Flowgorithm (il corpus, confermato sull'oracolo).
import { describe, expect, test } from "bun:test";
import type { Blocco } from "../progetto/modello";
import { leggiFlowgorithm, testoDelMessaggio } from "./flowgorithm";

const q = (s: string) => `"${s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}"`;
/** Un file di Flowgorithm con le funzioni date (il testo XML di ciascuna). */
const file = (...funzioni: string[]) => `<?xml version="1.0"?>\n<flowgorithm fileversion="4.2">\n<attributes><attribute name="name" value="prova"/></attributes>\n${funzioni.join("\n")}\n</flowgorithm>\n`;
const funzione = (nome: string, tipo: string, variabile: string, parametri: string, corpo: string) =>
  `<function name=${q(nome)} type=${q(tipo)} variable=${q(variabile)}><parameters>${parametri}</parameters><body>${corpo}</body></function>`;
const main = (corpo: string) => funzione("Main", "None", "", "", corpo);
const dichiara = (n: string, t: string, dimensione?: number) => `<declare name=${q(n)} type=${q(t)} array=${q(dimensione !== undefined ? "True" : "False")} size=${q(String(dimensione ?? ""))}/>`;
const assegna = (v: string, e: string) => `<assign variable=${q(v)} expression=${q(e)}/>`;
const scrivi = (e: string) => `<output expression=${q(e)} newline="True"/>`;
const parametro = (n: string, t: string, vettore = false) => `<parameter name=${q(n)} type=${q(t)} array=${q(vettore ? "True" : "False")}/>`;

const fermo = (t: string) => {
  const c = leggiFlowgorithm(t);
  if (c.ok) throw new Error("convertito, e doveva fermarsi");
  return c.messaggio;
};

describe("i messaggi che il corpus non ha", () => {
  test("un nome con una lettera accentata: nome_non_valido, anche con la rinomina", () => {
    const t = file(main(dichiara("età", "Integer") + assegna("età", "3") + scrivi("età")));
    expect(fermo(t)).toMatchObject({ codice: "nome_non_valido", parametri: { nome: "età" } });
    expect(leggiFlowgorithm(t, { rinomina: true })).toMatchObject({ ok: false, messaggio: { codice: "nome_non_valido" } });
    expect(testoDelMessaggio(fermo(t))).toBe("Il nome «età» non si può usare in AlgoDesign: un nome ha solo lettere senza accento, cifre e trattino basso e non può iniziare con una cifra o con il trattino basso.");
  });
  test("un vettore ricevuto con due dimensioni, e una procedura mai chiamata: dimensioni_diverse_negli_argomenti", () => {
    const mostra = funzione("Mostra", "None", "", parametro("v", "Integer", true), scrivi("v[0]"));
    const dueDimensioni = file(main(dichiara("a", "Integer", 3) + dichiara("b", "Integer", 5) + assegna("a[0]", "1") + assegna("b[0]", "2") + '<call expression="Mostra(a)"/><call expression="Mostra(b)"/>'), mostra);
    expect(fermo(dueDimensioni)).toMatchObject({ codice: "dimensioni_diverse_negli_argomenti", parametri: { nome: "Mostra" } });
    expect(fermo(file(main(scrivi('"x"')), mostra))).toMatchObject({ codice: "dimensioni_diverse_negli_argomenti", parametri: { nome: "Mostra" } });
  });
  test("una funzione che chiama una procedura: il controllo statico la ferma, e il messaggio porta il codice e la causa", () => {
    const m = fermo(file(main(scrivi("F(1)")), funzione("F", "Integer", "r", parametro("x", "Integer"), dichiara("r", "Integer") + '<call expression="P()"/>' + assegna("r", "x")), funzione("P", "None", "", "", "")));
    expect(m.codice).toBe("progetto_con_errori");
    expect(m.parametri.errore).toBe("function_with_effect");
    expect(testoDelMessaggio(m)).toContain("function_with_effect");
    expect(testoDelMessaggio(m, "la frase dell'app")).toContain("«la frase dell'app»");
  });
});

describe("le forme che il corpus non esercita", () => {
  test("la lettura diventa un blocco «leggi»", () => {
    const c = leggiFlowgorithm(file(main(dichiara("n", "Integer") + '<input variable="n"/>' + scrivi("n"))));
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    expect(c.progetto.functions[0]!.body.map((b) => b.kind)).toEqual(["read", "write"]);
  });
  test("un «per» all'indietro col passo da un dato: il «mentre» con «>=» e la sottrazione", () => {
    const c = leggiFlowgorithm(file(main(dichiara("i", "Integer") + dichiara("p", "Integer") + assegna("p", "2") + '<for variable="i" start="6" end="1" direction="dec" step="p">' + scrivi("i") + "</for>")));
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    const corpo = c.progetto.functions[0]!.body;
    const mentre = corpo[2] as Extract<Blocco, { kind: "while" }>;
    expect([corpo[1], mentre.condition, mentre.body.at(-1)]).toMatchObject([{ kind: "assignment", target: "i", value: "6" }, "i >= 1", { kind: "assignment", target: "i", value: "i - p" }]);
    expect(c.trasformazioni).toEqual([{ specie: "per-come-mentre", riga: 4, nome: "i" }]);
  });
});
