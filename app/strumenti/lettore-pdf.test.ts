// Il lettore dei PDF della prova sul prodotto (strumenti/lettore-pdf.ts) su PDF scritti qui nella forma della WebView2:
// uno intero (testo, foglio, margini) e due guasti, che devono tornare con l'errore in `errori`. Ogni lettura gira in un
// processo a parte con un tempo limite: un lettore che non finisce (un ciclo senza fine è sincrono, e il tempo limite di
// `bun test` non lo interrompe) è un rosso che lo dice, non una suite appesa.
//
// NON guarda: i PDF veri della WebView2 (li legge la prova sul prodotto), i flussi `TJ`, i caratteri senza `ToUnicode`.
import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import type { PdfLetto } from "./lettore-pdf";

/** Il tempo limite di una lettura: un PDF di poche righe si legge in millisecondi. */
const limite = 3000;
/** La versione nell'intestazione del PDF (`%PDF-<versione>`), quella che scrive la WebView2. */
const versione = "1.4";

/** Un PDF con una pagina A4, un carattere con la sua mappa (glifo 1 → «A», 2 → «è»; con `unByte`, codici di un byte) e
 * il contenuto dato, compresso. */
function pdf(contenuto: string, unByte = false): Buffer {
  const c = (n: number) => (unByte ? n.toString(16).padStart(2, "0") : n.toString(16).padStart(4, "0"));
  const cmap = `begincmap\n1 beginbfchar\n<${c(1)}> <0041>\nendbfchar\n1 beginbfchar\n<${c(2)}> <00E8>\nendbfchar\nendcmap\n`;
  const flusso = deflateSync(Buffer.from(contenuto, "latin1"));
  const parti: (string | Buffer)[] = [
    `%PDF-${versione}\n`,
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Filter /FlateDecode /Length ${flusso.length} >>\nstream\n`,
    flusso,
    "\nendstream\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /Prova /Encoding /Identity-H /ToUnicode 6 0 R >>\nendobj\n",
    `6 0 obj\n<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream\nendobj\n`,
    "7 0 obj\n<< /Producer (prova) /Title (Flowchart di prova) >>\nendobj\n",
    "%%EOF\n",
  ];
  return Buffer.concat(parti.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : p)));
}

/** Il PDF letto in un processo a parte, o il perché non è tornato entro il limite. */
async function leggiConLimite(contenuto: Buffer): Promise<{ letto: PdfLetto | null; perche: string }> {
  const cartella = mkdtempSync(join(tmpdir(), "lettore-pdf-"));
  try {
    const file = join(cartella, "prova.pdf");
    const script = join(cartella, "leggi.ts");
    writeFileSync(file, contenuto);
    writeFileSync(script, `import { readFileSync } from "node:fs";\nimport { leggiPdf } from ${JSON.stringify(join(import.meta.dir, "lettore-pdf.ts"))};\nconsole.log(JSON.stringify(leggiPdf(readFileSync(process.argv[2]!))));\n`);
    const inizio = performance.now();
    const proc = Bun.spawn({ cmd: [process.execPath, script, file], stdout: "pipe", stderr: "pipe" });
    let scaduto = false;
    const timer = setTimeout(() => {
      scaduto = true;
      proc.kill();
    }, limite);
    const [uscita, errore, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    clearTimeout(timer);
    const ms = Math.round(performance.now() - inizio);
    if (scaduto) return { letto: null, perche: `la lettura non è finita entro ${limite} ms: processo ucciso dopo ${ms} ms` };
    if (codice !== 0) return { letto: null, perche: `la lettura è uscita con ${codice} in ${ms} ms: ${errore.trim().split("\n").slice(0, 3).join(" ")}` };
    return { letto: JSON.parse(uscita) as PdfLetto, perche: `letto in ${ms} ms` };
  } finally {
    rmSync(cartella, { recursive: true, force: true });
  }
}

test("un PDF nella forma della WebView2: testo, foglio e margini dal primo ritaglio", async () => {
  const { letto, perche } = await leggiConLimite(pdf("q 1 0 0 1 0 0 cm 42 42 511 758 re W n BT /F1 12 Tf <00010002> Tj ET Q"));
  console.log(`PDF intero: ${perche}`);
  expect(letto).toEqual({ versione, titolo: "Flowchart di prova", pagine: [{ mediaBox: [0, 0, 595, 842], righe: ["Aè"], margini: { sinistro: 42, destro: 42, alto: 42, basso: 42 } }], errori: [] });
}, 10_000);

test("una stringa esadecimale non chiusa è un errore del PDF, non una lettura che non finisce", async () => {
  const { letto, perche } = await leggiConLimite(pdf("BT /F1 12 Tf <0001"));
  console.log(`stringa esadecimale non chiusa: ${perche}; errori ${JSON.stringify(letto?.errori)}`);
  expect(perche).toStartWith("letto in");
  expect(letto!.errori).toEqual(["pagina 3: stringa esadecimale non chiusa"]);
}, 10_000);

test("un delimitatore fuori posto è un errore del PDF, non un'eccezione", async () => {
  const { letto, perche } = await leggiConLimite(pdf("BT /F1 12 Tf <0001> Tj ) ET"));
  console.log(`delimitatore fuori posto: ${perche}; errori ${JSON.stringify(letto?.errori)}`);
  expect(perche).toStartWith("letto in");
  expect(letto!.errori).toEqual(["pagina 3: «)» fuori posto nel contenuto"]);
}, 10_000);

test("un glifo che la mappa del carattere non ha, e una stringa di byte dispari, sono errori: un testo non letto non è un testo che non c'è", async () => {
  const { letto, perche } = await leggiConLimite(pdf("BT /F1 12 Tf <00010003> Tj <000100> Tj ET"));
  console.log(`glifo senza mappa e byte dispari: ${perche}; errori ${JSON.stringify(letto?.errori)}`);
  expect(perche).toStartWith("letto in");
  expect(letto!.errori).toEqual(["pagina 3: 1 glifi senza la mappa del carattere, 1 stringhe di byte dispari"]);
}, 10_000);

test("un carattere coi codici di un byte (la WebView2 ne scrive, per una parte del testo): il testo letto, nessun errore", async () => {
  const { letto, perche } = await leggiConLimite(pdf("BT /F1 12 Tf <0102> Tj ET", true));
  console.log(`codici di un byte: ${perche}; righe ${JSON.stringify(letto?.pagine[0]?.righe)}`);
  expect({ righe: letto!.pagine[0]!.righe, errori: letto!.errori }).toEqual({ righe: ["Aè"], errori: [] });
}, 10_000);
