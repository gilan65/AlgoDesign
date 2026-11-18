// Il lettore dei file di Flowgorithm sui messaggi che il corpus non ha (`casi-flowgorithm.test.ts` dichiara quali): un
// nome che AlgoDesign non ammette, un vettore ricevuto con due dimensioni, il progetto convertito con un errore statico.
// E le forme che il corpus non esercita: la lettura, il passo e il verso di un «per» all'indietro come «mentre».
//
// Che cosa queste prove NON guardano: l'output di Flowgorithm (il corpus, confermato sull'oracolo).
import { describe, expect, test } from "bun:test";
import { eseguiCaso } from "../casi/esecutore";
import { tetti } from "../controllo/controllo";
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

describe("ciò che Flowgorithm non scrive ferma il file, anche dove il corpus non lo mette", () => {
  const nonLeggibile = (t: string, parola: string) => {
    const m = fermo(t);
    expect(m.codice).toBe("file_non_leggibile");
    expect(m.parametri.dettaglio).toContain(parola);
  };
  const se = (dentro: string) => main(dichiara("x", "Integer") + assegna("x", "0") + `<if expression="true">${dentro}</if>` + scrivi("x"));
  test("un blocco dentro «se» fuori dai due rami", () => nonLeggibile(file(se(assegna("x", "1") + "<then/><else/>")), "<assign>"));
  test("due rami «allora» nello stesso «se»", () => nonLeggibile(file(se(`<then>${assegna("x", "1")}</then><then/><else/>`)), "<then>"));
  test("un elemento sconosciuto dentro una funzione", () =>
    nonLeggibile(file('<function name="Main" type="None" variable=""><parameters/><pippo/><body/></function>'), "<pippo>"));
  test("un verso del «per» che non è inc né dec", () =>
    nonLeggibile(file(main(dichiara("i", "Integer") + '<for variable="i" start="3" end="1" direction="giu" step="1">' + scrivi("i") + "</for>")), "giu"));
  test("un vettore dichiarato né sì né no", () => nonLeggibile(file(main('<declare name="v" type="Integer" array="forse" size="3"/>')), "forse"));
  test("un parametro vettore né sì né no", () =>
    nonLeggibile(file(main(""), funzione("P", "None", "", '<parameter name="v" type="Integer" array="forse"/>', "")), "forse"));
  test("un a capo della scrittura né sì né no", () => nonLeggibile(file(main('<output expression="1" newline="forse"/>')), "forse"));
  test("due programmi principali", () => nonLeggibile(file(main(scrivi("1")), main(scrivi("2"))), "Main"));
  test("un file che non è in UTF-8: il carattere sostitutivo della decodifica", () => {
    const sostitutivo = String.fromCharCode(0xfffd);
    nonLeggibile(file(main(scrivi(`"perch${sostitutivo}"`))), "UTF-8");
  });
  test("controllo positivo: le stesse forme scritte come le scrive Flowgorithm si convertono", () => {
    const giusti = [
      file(se(`<then>${assegna("x", "1")}</then><else/>`)),
      file(main(dichiara("i", "Integer") + '<for variable="i" start="3" end="1" direction="DEC" step="1">' + scrivi("i") + "</for>")),
      file(main('<declare name="v" type="Integer" array="TRUE" size="3"/>')),
      file(main('<output expression="1" newline="false"/>')),
      file(main(scrivi('"perché"'))),
    ];
    expect(giusti.map((t) => leggiFlowgorithm(t).ok)).toEqual(giusti.map(() => true));
  });
});

describe("un vettore che la procedura scrive senza leggerlo è per uscita solo se lo riempie tutto", () => {
  const imposta = funzione("Imposta", "None", "", parametro("w", "Integer", true) + parametro("pos", "Integer"), assegna("w[pos]", "9"));
  const modoDi = (t: string) => {
    const c = leggiFlowgorithm(t);
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    return { modo: c.progetto.functions[1]!.data.find((d) => d.name === "w")!.parameter, trasformazioni: c.trasformazioni.map((x) => x.specie) };
  };
  test("scritto in una parte: per riferimento, senza la riga della trasformazione", () => {
    const pieno = main(dichiara("v", "Integer", 3) + assegna("v[0]", "1") + assegna("v[1]", "2") + assegna("v[2]", "3") + '<call expression="Imposta(v, 1)"/>' + scrivi("v[0]"));
    expect(modoDi(file(pieno, imposta))).toEqual({ modo: "reference", trasformazioni: [] });
  });
  test("scritto in una parte, e chi chiama lo passa senza valori: il file non si converte, col messaggio", () => {
    const vuoto = main(dichiara("v", "Integer", 3) + '<call expression="Imposta(v, 1)"/>');
    expect(fermo(file(vuoto, imposta)).codice).toBe("progetto_con_errori");
  });
  test("il ciclo che lo riempie dentro un «se»: per riferimento", () => {
    const corpo = dichiara("i", "Integer") + `<if expression="true"><then><for variable="i" start="0" end="Size(w) - 1" direction="inc" step="1">${assegna("w[i]", "i")}</for></then><else/></if>`;
    const t = file(main(dichiara("v", "Integer", 3) + assegna("v[0]", "1") + assegna("v[1]", "2") + assegna("v[2]", "3") + '<call expression="R(v)"/>'), funzione("R", "None", "", parametro("w", "Integer", true), corpo));
    const c = leggiFlowgorithm(t);
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    expect(c.progetto.functions[1]!.data.find((d) => d.name === "w")!.parameter).toBe("reference");
  });
  test("controllo positivo: il ciclo da 0 a Size(w) - 1 nel corpo lo riempie tutto, ed è per uscita", () => {
    const corpo = dichiara("i", "Integer") + `<for variable="i" start="0" end="size(w)-1" direction="inc" step="1">${assegna("w[i]", "i * 2")}</for>`;
    const t = file(main(dichiara("v", "Integer", 3) + '<call expression="R(v)"/>' + scrivi("v[2]")), funzione("R", "None", "", parametro("w", "Integer", true), corpo));
    const c = leggiFlowgorithm(t);
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    expect([c.progetto.functions[1]!.data.find((d) => d.name === "w")!.parameter, c.trasformazioni.map((x) => x.specie)]).toEqual(["out", ["vettore-per-uscita"]]);
  });
});

describe("l'estremo reale di un «per»: il contatore si confronta col reale, come in Flowgorithm (misurato su 4.5)", () => {
  const giri = (start: string, end: string, verso: string) => {
    const t = file(main(dichiara("i", "Integer") + `<for variable="i" start=${q(start)} end=${q(end)} direction=${q(verso)} step="1">${scrivi("i")}</for>` + scrivi('"fine"')));
    const c = leggiFlowgorithm(t);
    if (!c.ok) throw new Error(JSON.stringify(c.messaggio));
    const e = eseguiCaso(c.progetto, { name: "prova", inputs: [], expected: { output: "" } }, tetti);
    if (e.fuoriTappa) throw new Error("fuori tappa");
    return e.ottenuto.output;
  };
  // Gli output attesi sono quelli di Flowgorithm 4.5 sugli stessi programmi.
  test("all'indietro fino a 5 / 2: 5, 4, 3", () => expect(giri("5", "5 / 2", "dec")).toBe("5\n4\n3\nfine\n"));
  test("in avanti fino a 0 - 1 / 2: nessun giro", () => expect(giri("0", "0 - 1 / 2", "inc")).toBe("fine\n"));
  test("controllo positivo: in avanti fino a 27 / 10, e un estremo intero, come prima", () => {
    expect(giri("0", "27 / 10", "inc")).toBe("0\n1\n2\nfine\n");
    expect(giri("3", "1", "dec")).toBe("3\n2\n1\nfine\n");
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
