// Il lettore XML del sottoinsieme che i file di Flowgorithm usano: una prova per forma, e le forme che rifiuta.
//
// Che cosa queste prove NON guardano: la traduzione dei file di Flowgorithm (`flowgorithm.test.ts`) e il corpus
// (`casi-flowgorithm.test.ts`).
import { describe, expect, test } from "bun:test";
import { leggiXml, type ElementoXml } from "./xml";

const letto = (t: string): ElementoXml => {
  const l = leggiXml(t);
  if (!l.ok) throw new Error(`riga ${l.riga}: ${l.motivo}`);
  return l.radice;
};
const fermo = (t: string): { riga: number; motivo: string } => {
  const l = leggiXml(t);
  if (l.ok) throw new Error("letto, e doveva fermarsi");
  return { riga: l.riga, motivo: l.motivo };
};
/** L'albero come testo breve: nome, attributi in ordine, figli fra graffe. */
const forma = (e: ElementoXml): string =>
  `${e.nome}${[...e.attributi].map(([k, v]) => ` ${k}=${JSON.stringify(v)}`).join("")}${e.figli.length > 0 ? `{${e.figli.map(forma).join(" ")}}` : ""}`;

describe("le forme che legge", () => {
  test("la dichiarazione, gli elementi annidati, quelli vuoti e la riga di ciascuno", () => {
    const r = letto('<?xml version="1.0"?>\n<a x="1">\n  <b/>\n  <c y="2"></c>\n</a>\n');
    expect(forma(r)).toBe('a x="1"{b c y="2"}');
    expect([r.riga, r.figli[0]!.riga, r.figli[1]!.riga]).toEqual([2, 3, 4]);
  });
  test("gli attributi fra virgolette e fra apici, con gli spazi intorno all'uguale", () => {
    expect(forma(letto(`<a x = "1" y='due "2"' z="l'apice"/>`))).toBe(`a x="1" y="due \\"2\\"" z="l'apice"`);
  });
  test("le cinque entità e i riferimenti decimali ed esadecimali", () => {
    expect(letto('<a v="&amp;&lt;&gt;&quot;&apos; &#233;&#xE8;&#x1F600;&#39;"/>').attributi.get("v")).toBe(`&<>"' éè${String.fromCodePoint(0x1f600)}'`);
  });
  test("una lettera accentata scritta com'è", () => {
    expect(letto('<a v="perché"/>').attributi.get("v")).toBe("perché");
  });
  test("i fine riga di Windows e il BOM in testa", () => {
    const r = letto(`${String.fromCharCode(0xfeff)}<?xml version="1.0"?>\r\n<a>\r\n<b/>\r\n</a>\r\n`);
    expect(forma(r)).toBe("a{b}");
    expect(r.figli[0]!.riga).toBe(3);
  });
  test("un a capo, una tabulazione o un ritorno carrello scritti nel valore valgono uno spazio; scritti come riferimento restano", () => {
    expect(letto(`<a v="x\ny\tz\r\nw" r="a&#10;b"/>`).attributi.get("v")).toBe("x y z w");
    expect(letto(`<a r="a&#10;b"/>`).attributi.get("r")).toBe("a\nb");
  });
  test("i commenti e le istruzioni di elaborazione, prima, dentro e dopo la radice", () => {
    expect(forma(letto("<!-- prima --><?pi x?><a><!-- dentro <b/> --><c/></a><!-- dopo -->\n"))).toBe("a{c}");
  });
});

describe("le forme che rifiuta, col motivo e la riga", () => {
  test("un testo che non è XML", () => {
    expect(fermo("Questo non è un file.\n")).toEqual({ riga: 1, motivo: "il testo non comincia con un elemento" });
  });
  test("un testo vuoto", () => {
    expect(fermo("")).toEqual({ riga: 1, motivo: "il testo non comincia con un elemento" });
  });
  test("un elemento non chiuso, e chiuso con un altro nome", () => {
    expect(fermo("<a>\n<b>\n</a>")).toEqual({ riga: 3, motivo: "«</a>» chiude «<b>», aperto alla riga 2" });
    expect(fermo("<a>\n<b/>\n")).toEqual({ riga: 3, motivo: "il file finisce prima della chiusura di «<a>», aperto alla riga 1" });
  });
  test("un'entità sconosciuta e una «&» da sola", () => {
    expect(fermo('<a v="&nbsp;"/>')).toEqual({ riga: 1, motivo: "l'entità «&nbsp;» non è dell'XML" });
    expect(fermo('<a v="a & b"/>')).toEqual({ riga: 1, motivo: "una «&» che non comincia un'entità" });
  });
  test("un riferimento a un carattere che non esiste", () => {
    expect(fermo('<a v="&#0;"/>')).toEqual({ riga: 1, motivo: "il riferimento «&#0;» non è un carattere" });
    expect(fermo('<a v="&#x110000;"/>')).toEqual({ riga: 1, motivo: "il riferimento «&#x110000;» non è un carattere" });
  });
  test("un attributo doppio, senza virgolette, o con «<» nel valore", () => {
    expect(fermo('<a x="1" x="2"/>')).toEqual({ riga: 1, motivo: "l'attributo «x» è scritto due volte in «<a>»" });
    expect(fermo("<a x=1/>")).toEqual({ riga: 1, motivo: "il valore dell'attributo «x» non è fra virgolette" });
    expect(fermo('<a x="<"/>')).toEqual({ riga: 1, motivo: "una «<» nel valore dell'attributo «x»" });
    expect(fermo('<a x="1/>')).toEqual({ riga: 1, motivo: "il valore dell'attributo «x» non è chiuso" });
  });
  test("del testo fra gli elementi", () => {
    expect(fermo("<a>\n  testo\n</a>")).toEqual({ riga: 2, motivo: "del testo fra gli elementi: «testo»" });
  });
  test("due radici, e qualcosa dopo la radice", () => {
    expect(fermo("<a/>\n<b/>")).toEqual({ riga: 2, motivo: "un secondo elemento dopo la fine di «<a>»" });
    expect(fermo("<a/>\nx")).toEqual({ riga: 2, motivo: "del testo dopo la fine di «<a>»" });
  });
  test("la dichiarazione del tipo di documento e le sezioni CDATA, che i file di Flowgorithm non hanno", () => {
    expect(fermo("<!DOCTYPE a>\n<a/>")).toEqual({ riga: 1, motivo: "la dichiarazione del tipo di documento («<!DOCTYPE») non si legge" });
    expect(fermo("<a><![CDATA[x]]></a>")).toEqual({ riga: 1, motivo: "una sezione «<![CDATA[» non si legge" });
  });
  test("un commento non chiuso", () => {
    expect(fermo("<a>\n<!-- aperto\n")).toEqual({ riga: 2, motivo: "un commento non chiuso" });
  });
  test("un nome che non è un nome", () => {
    expect(fermo("<1a/>")).toEqual({ riga: 1, motivo: "dopo «<» non c'è un nome d'elemento" });
  });
});
