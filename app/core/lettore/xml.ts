// Il lettore XML del sottoinsieme che i file di Flowgorithm usano: un lettore nostro, perché il nucleo non ha il DOM e
// non prende dipendenze. Dà l'albero degli elementi, coi loro attributi e la riga dove cominciano.
//
// Legge: il BOM in testa; la dichiarazione `<?xml …?>` e le altre istruzioni di elaborazione; i commenti; gli elementi,
// vuoti (`<a/>`) o con figli; gli attributi fra virgolette o fra apici (Flowgorithm 4.5 rifiuta gli apici, misurato:
// qui si leggono come nell'XML), con le entità `&amp; &lt; &gt; &quot; &apos;` e i riferimenti decimali ed
// esadecimali (Flowgorithm 4.5 toglie `&apos;` e non legge gli esadecimali, misurato, e non scrive mai né gli uni
// né gli altri); gli spazi fra gli elementi; i fine riga di Windows, che contano come uno. Nel valore di un attributo un
// a capo o una tabulazione scritti com'è valgono uno spazio (la regola dell'XML); scritti come riferimento restano.
//
// Rifiuta, col motivo e la riga: un testo che non comincia con un elemento; un elemento chiuso con un altro nome o non
// chiuso; un'entità sconosciuta, una `&` da sola, un riferimento che non è un carattere; un attributo doppio, senza
// virgolette, non chiuso o con `<` nel valore; del testo fra gli elementi (i file di Flowgorithm non ne hanno); un
// secondo elemento o del testo dopo la radice; `<!DOCTYPE` e `<![CDATA[`; un commento o un'istruzione non chiusi.
//
// Che cosa NON guarda: i nomi degli elementi e degli attributi (li guarda chi traduce); la codifica dichiarata nella
// dichiarazione (il testo arriva già decodificato); gli spazi dei nomi.

export interface ElementoXml {
  readonly nome: string;
  readonly attributi: ReadonlyMap<string, string>;
  readonly figli: readonly ElementoXml[];
  /** La riga dove comincia l'elemento (la prima è 1). */
  readonly riga: number;
}

export type LetturaXml = { readonly ok: true; readonly radice: ElementoXml } | { readonly ok: false; readonly riga: number; readonly motivo: string };

class Fermo {
  constructor(
    readonly riga: number,
    readonly motivo: string,
  ) {}
}

const entita: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const inizioDiNome = /[A-Za-z_:]/;
const seguitoDiNome = /[\w.:-]/;
const spazio = (c: string | undefined) => c === " " || c === "\t" || c === "\n";

export function leggiXml(testoDaLeggere: string): LetturaXml {
  try {
    return { ok: true, radice: leggi(testoDaLeggere) };
  } catch (e) {
    if (e instanceof Fermo) return { ok: false, riga: e.riga, motivo: e.motivo };
    throw e;
  }
}

/** Il valore di un attributo com'è scritto, decodificato: le entità, i riferimenti, gli spazi. */
function decodifica(valore: string, nomeDellAttributo: string, riga: number): string {
  let fuori = "";
  for (let k = 0; k < valore.length; k++) {
    const c = valore[k]!;
    if (c === "<") throw new Fermo(riga, `una «<» nel valore dell'attributo «${nomeDellAttributo}»`);
    if (c === "\n" || c === "\t") {
      fuori += " ";
      continue;
    }
    if (c !== "&") {
      fuori += c;
      continue;
    }
    const fine = valore.indexOf(";", k);
    const corpo = fine < 0 ? "" : valore.slice(k + 1, fine);
    if (!/^(#[0-9]+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*)$/.test(corpo)) throw new Fermo(riga, "una «&» che non comincia un'entità");
    if (corpo.startsWith("#")) {
      const codice = corpo[1] === "x" ? Number.parseInt(corpo.slice(2), 16) : Number.parseInt(corpo.slice(1), 10);
      if (codice === 0 || codice > 0x10ffff || (codice >= 0xd800 && codice <= 0xdfff)) throw new Fermo(riga, `il riferimento «&${corpo};» non è un carattere`);
      fuori += String.fromCodePoint(codice);
    } else {
      const x = entita[corpo];
      if (x === undefined) throw new Fermo(riga, `l'entità «&${corpo};» non è dell'XML`);
      fuori += x;
    }
    k = fine;
  }
  return fuori;
}

function leggi(testoDaLeggere: string): ElementoXml {
  // I fine riga di Windows (e un ritorno carrello da solo) contano come un a capo, come nell'XML.
  const t = (testoDaLeggere.startsWith(String.fromCharCode(0xfeff)) ? testoDaLeggere.slice(1) : testoDaLeggere).replace(/\r\n?/g, "\n");
  let i = 0;
  let riga = 1;
  const avanti = (n: number) => {
    for (let k = 0; k < n; k++) if (t[i++] === "\n") riga++;
  };
  const inizia = (s: string) => t.startsWith(s, i);
  const saltaSpazi = () => {
    while (spazio(t[i])) avanti(1);
  };
  const fino = (chiusura: string, motivo: string) => {
    const r = riga;
    const j = t.indexOf(chiusura, i);
    if (j < 0) throw new Fermo(r, motivo);
    avanti(j + chiusura.length - i);
  };
  /** Spazi, commenti e istruzioni di elaborazione; `<!DOCTYPE` e `<![CDATA[` fermano. */
  const saltaIlResto = () => {
    for (;;) {
      saltaSpazi();
      if (inizia("<!--")) fino("-->", "un commento non chiuso");
      else if (inizia("<?")) fino("?>", "un'istruzione «<?» non chiusa");
      else if (inizia("<!DOCTYPE")) throw new Fermo(riga, "la dichiarazione del tipo di documento («<!DOCTYPE») non si legge");
      else if (inizia("<![CDATA[")) throw new Fermo(riga, "una sezione «<![CDATA[» non si legge");
      else return;
    }
  };
  const nome = (motivo: string): string => {
    if (!inizioDiNome.test(t[i] ?? "")) throw new Fermo(riga, motivo);
    const da = i;
    while (i < t.length && seguitoDiNome.test(t[i]!)) avanti(1);
    return t.slice(da, i);
  };
  const elemento = (): ElementoXml => {
    const r = riga;
    avanti(1); // «<»
    const n = nome("dopo «<» non c'è un nome d'elemento");
    const attributi = new Map<string, string>();
    for (;;) {
      const prima = i;
      saltaSpazi();
      if (inizia("/>")) {
        avanti(2);
        return { nome: n, attributi, figli: [], riga: r };
      }
      if (inizia(">")) {
        avanti(1);
        break;
      }
      if (i >= t.length) throw new Fermo(riga, `il file finisce dentro «<${n}», aperto alla riga ${r}`);
      if (i === prima) throw new Fermo(riga, `manca uno spazio prima di un attributo di «<${n}»`);
      const a = nome(`un attributo di «<${n}» senza nome`);
      saltaSpazi();
      if (t[i] !== "=") throw new Fermo(riga, `l'attributo «${a}» non ha il valore`);
      avanti(1);
      saltaSpazi();
      const virgolette = t[i];
      if (virgolette !== '"' && virgolette !== "'") throw new Fermo(riga, `il valore dell'attributo «${a}» non è fra virgolette`);
      const rigaDelValore = riga;
      const fine = t.indexOf(virgolette, i + 1);
      const crudo = fine < 0 ? "" : t.slice(i + 1, fine);
      // Le virgolette che non si chiudono nella stessa riga e arrivano dentro un altro elemento: il valore non è chiuso.
      if (fine < 0 || /<\s*\/?\s*[A-Za-z]|\/>/.test(crudo)) throw new Fermo(rigaDelValore, `il valore dell'attributo «${a}» non è chiuso`);
      const valore = decodifica(crudo, a, rigaDelValore);
      avanti(fine + 1 - i);
      if (attributi.has(a)) throw new Fermo(r, `l'attributo «${a}» è scritto due volte in «<${n}>»`);
      attributi.set(a, valore);
    }
    // I figli, fino alla chiusura.
    const figli: ElementoXml[] = [];
    for (;;) {
      saltaIlResto();
      if (i >= t.length) throw new Fermo(riga, `il file finisce prima della chiusura di «<${n}>», aperto alla riga ${r}`);
      if (inizia("</")) {
        const rigaDellaChiusura = riga;
        avanti(2);
        const c = nome("dopo «</» non c'è un nome d'elemento");
        saltaSpazi();
        if (t[i] !== ">") throw new Fermo(riga, `la chiusura «</${c}» non finisce con «>»`);
        avanti(1);
        if (c !== n) throw new Fermo(rigaDellaChiusura, `«</${c}>» chiude «<${n}>», aperto alla riga ${r}`);
        return { nome: n, attributi, figli, riga: r };
      }
      if (t[i] === "<") {
        figli.push(elemento());
        continue;
      }
      const j = t.indexOf("<", i);
      const pezzo = t.slice(i, j < 0 ? t.length : j).trim();
      throw new Fermo(riga, `del testo fra gli elementi: «${pezzo.length > 40 ? `${pezzo.slice(0, 40)}…` : pezzo}»`);
    }
  };

  saltaIlResto();
  if (t[i] !== "<" || inizia("</")) throw new Fermo(riga, "il testo non comincia con un elemento");
  const radice = elemento();
  saltaIlResto();
  if (i < t.length) throw new Fermo(riga, t[i] === "<" ? `un secondo elemento dopo la fine di «<${radice.nome}>»` : `del testo dopo la fine di «<${radice.nome}>»`);
  return radice;
}
