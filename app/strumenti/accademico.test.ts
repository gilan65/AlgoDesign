// Lo strumento a riga di comando di «Accademico» come processo, in una cartella temporanea: gli esiti (0, 1 senza
// scrivere nulla, 2 col modo d'uso) e i messaggi dei casi che non dipendono dal lettore: il nome della procedura del
// codice fuori dalle funzioni, il file d'uscita che c'è già e `-s`, `-o` uguale al testo, il testo in UTF-16, l'errore
// che la libreria aveva già, il file che non si scrive.
//
// Che cosa NON guarda: le trasformazioni e gli errori del lettore (`core/lettore/accademico.test.ts`); l'eseguibile a sé
// (si misura alla chiusura, da una cartella con spazi).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const app = join(import.meta.dir, "..");
let cartella = "";
beforeAll(() => {
  cartella = mkdtempSync(join(tmpdir(), "accademico-"));
});
afterAll(() => rmSync(cartella, { recursive: true, force: true }));

const testo = (...righe: string[]) => `${righe.join("\n")}\n`;
const scrivi = (file: string, contenuto: string | Buffer) => {
  const p = join(cartella, file);
  writeFileSync(p, contenuto);
  return p;
};
function lancia(...argomenti: string[]): { esito: number; righe: string[] } {
  const r = Bun.spawnSync(["bun", "./strumenti/accademico.ts", ...argomenti], { cwd: app, stdout: "pipe", stderr: "pipe" });
  return { esito: r.exitCode ?? -1, righe: `${r.stdout}${r.stderr}`.trim().split(/\r?\n/) };
}

test("un testo con le sole funzioni non ha procedura: il nome del file non lo ferma, nemmeno se è quello di una funzione o non è un nome", () => {
  const somma = scrivi("somma.txt", testo("function somma(a: integer, b: integer) → integer", "    return a + b", "end function"));
  expect(lancia(somma)).toEqual({ esito: 0, righe: ["AGGIUNTA somma", `SCRITTO ${join(cartella, "somma.algo")}`] });
  const cifra = scrivi("01-esercizio.txt", testo("function doppio(a: integer) → integer", "    return a × 2", "end function"));
  expect(lancia(cifra).esito).toBe(0);
});

test("la procedura del codice fuori dalle funzioni col nome di una funzione del testo: fermo, e il messaggio dice -n", () => {
  const t = scrivi("conta.txt", testo("function conta(n: integer) → integer", "    return n", "end function", "", "output(conta(2))"));
  expect(lancia(t, "-o", join(cartella, "conta-1.algo"), "-r")).toEqual({
    esito: 1,
    righe: [`ERRORE ${t}: la procedura del codice fuori dalle funzioni, conta, ha il nome di una procedura o funzione del testo: dagliene un altro con -n`],
  });
  expect(existsSync(join(cartella, "conta-1.algo"))).toBe(false);
  expect(lancia(t, "-o", join(cartella, "conta-1.algo"), "-n", "prova").esito).toBe(0);
});

test("un dato col nome della procedura: con -r rinominato, come gli altri", () => {
  const t = scrivi("totale.txt", testo("totale ← 0", "output(totale)"));
  const r = lancia(t, "-r");
  expect(r.esito).toBe(0);
  expect(r.righe[0]).toBe("TRASFORMAZIONE riga 1 (nome-in-uso): il dato totale ha il nome di una procedura o funzione: diventa totale_2");
});

test("il file d'uscita che c'è già: fermo senza scrivere, sostituito con -s; -o uguale al testo, sempre fermo", () => {
  const t = scrivi("uno.txt", testo("variable x: integer", "x ← 1", "output(x)"));
  const uscita = scrivi("uno.algo", "c'era già\n");
  expect(lancia(t)).toEqual({ esito: 1, righe: [`ERRORE ${uscita} c'è già: per aggiungere usa -l ${uscita}, per sostituirlo -s, o scegli un altro file con -o`] });
  expect(readFileSync(uscita, "utf8")).toBe("c'era già\n");
  expect(lancia(t, "-s").esito).toBe(0);
  expect(readFileSync(uscita, "utf8")).toStartWith("{");
  // Con -l, la libreria stessa è l'uscita.
  expect(lancia(scrivi("due.txt", testo("function due() → integer", "    return 2", "end function")), "-l", uscita).esito).toBe(0);
  expect(lancia(t, "-o", t, "-s")).toEqual({ esito: 1, righe: ["ERRORE -o è il testo da leggere: scegli un altro file"] });
});

test("un testo in UTF-8 col BOM si legge; -o uguale al testo anche scritto in un altro modo: fermo", () => {
  const t = scrivi("col-bom.txt", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("variable x: integer\nx ← 1\noutput(x)\n", "utf8")]));
  expect(lancia(t).esito).toBe(0);
  expect(lancia(t, "-o", relative(app, t), "-s")).toEqual({ esito: 1, righe: ["ERRORE -o è il testo da leggere: scegli un altro file"] });
});

test("un testo in UTF-16: fermo, col messaggio", () => {
  const t = scrivi("largo.txt", Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("output(1)\n", "utf16le")]));
  expect(lancia(t)).toEqual({ esito: 1, righe: [`ERRORE ${t} è in UTF-16: salvalo in UTF-8`] });
});

test("un errore che la libreria aveva già si dice con il nome della libreria, non del testo", () => {
  const lib = scrivi(
    "rotta.algo",
    JSON.stringify({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "rotta", library: true },
      functions: [
        { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
        { id: "f2", kind: "procedure", name: "rotta", data: [], body: [{ id: "b2", kind: "assignment", target: "x", value: "1" }], end: { id: "b3" } },
      ],
    }),
  );
  const r = lancia(scrivi("tre.txt", testo("function tre() → integer", "    return 3", "end function")), "-l", lib);
  expect(r.esito).toBe(1);
  expect(r.righe.length).toBeGreaterThan(0);
  for (const riga of r.righe) expect(riga).toMatch(new RegExp(`^ERRORE ${lib.replaceAll("\\", "\\\\")}: la libreria ha già un errore statico \\(\\w+\\) che non viene dal testo: correggilo nell'app, poi riprova$`));
});

test("il file che non si scrive, l'opzione che non c'è, l'aiuto", () => {
  const t = scrivi("quattro.txt", testo("output(4)"));
  const dentro = join(cartella, "manca", "quattro.algo");
  const r = lancia(t, "-o", dentro);
  expect(r.esito).toBe(1);
  expect(r.righe.at(-1)).toStartWith(`ERRORE ${dentro} non si scrive: `);
  expect(lancia(t, "-x").esito).toBe(2);
  const aiuto = lancia("-h");
  expect(aiuto.esito).toBe(0);
  expect(aiuto.righe.filter((x) => /^\s+-[rs] /.test(x)).map((x) => x.trim().slice(0, 2))).toEqual(["-r", "-s"]);
});
