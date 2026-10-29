// Il codice stampato (`core/genera/stampato.ts`): di quale funzione è ogni riga, gli a capo, i fogli del codice.
//
// Gli attesi a mano, scritti PRIMA del codice: le parti del programma `parametro-intero` (due funzioni) in ogni
// linguaggio, lette sul testo generato; gli a capo di cinque righe vere del corpus (dopo uno spazio, dopo una virgola,
// dentro una stringa lunga, una parola senza punti a una larghezza stretta, il rientro profondo), ragionati carattere per
// carattere; i fogli di poche righe.
//
// Il corpus (casi delle tappe 1–4 e dei tipi nuovi: record, matrici, tabelle, con le specie contate), per ogni linguaggio
// letto dal registro che dà il codice: le parti coprono le righe,
// contigue e nell'ordine, unite ridanno `testoDelCodice`; ogni funzione al più in una parte, la coda solo in fondo; ogni
// riga segnata dal generatore sta nella parte della sua funzione; ogni riga che viene da un blocco o dal dato di una
// funzione sta nella parte di quella funzione (rilevatore scritto QUI, dall'albero del progetto); ogni funzione con una
// riga del genere ha righe segnate. Gli a capo a 40, 77 e 109 colonne: i pezzi ricompongono la riga, nessun taglio a
// metà di una parola dove nella larghezza c'è uno spazio o una virgola, mai dentro una stringa se fuori c'è un punto,
// ogni pezzo nella sua larghezza, il seguito al rientro stampato + 4. I fogli a 77 × 48 e 109 × 72, di seguito e con un
// foglio nuovo per parte: nessun foglio oltre le sue righe, nessuna riga divisa se ci sta in un foglio, ogni inizio in
// cima a un foglio, i fogli uniti ridanno tutti i pezzi nell'ordine. I conteggi si stampano.
//
// Controlli positivi, ognuno visto rosso: una riga tolta da una parte, le righe di una funzione senza il segno, un a capo
// che taglia alla larghezza, una riga divisa fra due fogli; l'unione dei rilevatori accesi si stampa per nome.
//
// CHE COSA NON GUARDA:
// - come si stampa (il ↪, la barra grigia, i numeri): è della pagina stampata;
// - la misura in punti e la larghezza vera del carattere: le colonne e le righe le dà chi stampa;
// - il programma di prova di un caso: non si stampa, e i generatori non lo segnano.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { figliDelBlocco, tetti } from "../../core/controllo/controllo";
import { testoDelCodice, type Riga } from "../../core/genera/forma";
import { linguaggi } from "../../core/genera/linguaggi";
import { aCapo, fogliDelCodice, partiDelCodice, rientroDelSeguito, type ParteDelCodice, type RigaStampata } from "../../core/genera/stampato";
import { apri } from "../../core/progetto/formato";
import { usaLeMatrici, usaLeTabelle, type Blocco, type Progetto } from "../../core/progetto/modello";
import { paroleDelloPseudocodice } from "./parole";

const radice = join(import.meta.dir, "..", "..");
const progetto = (file: string): Progetto => {
  const e = apri(readFileSync(join(radice, file), "utf8"));
  if (!e.ok) throw new Error(file);
  return e.progetto;
};
const genera = (id: string, p: Progetto): readonly Riga[] | null => {
  const g = linguaggi.find((v) => v.id === id)!.genera(p, tetti, "it", paroleDelloPseudocodice("it"), undefined);
  return g.generato ? g.righe : null;
};

// ---------------------------------------------------------------------------------------------- attesi a mano

describe("le parti di un programma con due funzioni (attesi a mano)", () => {
  const p = progetto("casi/tappa-3/parametro-intero.algo");
  // Righe da 1, estremi compresi; `undefined` è la coda. f1 il programma principale, f2 `doppio`.
  const attesi: Record<string, [string | undefined, number, number][]> = {
    // La riga vuota prima di FUNZIONE è fra due funzioni: con quella dopo.
    pseudocodice: [["f1", 1, 7], ["f2", 8, 14]],
    // La testa (commenti, import, righe vuote) con la prima funzione; le due righe vuote prima di `def doppio` con
    // `doppio`; dopo l'ultima funzione la coda (righe vuote e avvio).
    python: [["f1", 1, 11], ["f2", 12, 15], [undefined, 16, 20]],
    // La testa (commento, include, prototipi) con `main`; la riga vuota prima di `doppio` con `doppio`; la coda dalla
    // riga vuota prima delle funzioni di supporto.
    c: [["f1", 1, 25], ["f2", 26, 29], [undefined, 30, 42]],
    // «Accademico» scrive prima le funzioni, poi il programma principale; la riga vuota fra le due con quella dopo.
    accademico: [["f2", 1, 3], ["f1", 4, 5]],
  };
  for (const [id, parti] of Object.entries(attesi))
    test(id, () => {
      const righe = genera(id, p)!;
      expect(partiDelCodice(righe).map((x) => [x.funzione, x.da + 1, x.a])).toEqual(parti);
    });
});

describe("gli a capo di cinque righe vere (attesi a mano)", () => {
  test("dopo uno spazio: la riga d'errore del Python, 78 caratteri a 77 colonne", () => {
    const riga = '    print(f"Errore alla riga {chiamante.f_lineno}: {motivo}", file=sys.stderr)';
    expect(genera("python", progetto("casi/tappa-1/assegnazione-carattere.algo"))!.some((r) => r.testo === riga)).toBe(true);
    // L'ultimo punto fuori dalle stringhe nella larghezza è lo spazio dopo la virgola; `file=sys.stderr)` non ne ha.
    expect(aCapo(riga, 77)).toEqual({ rientro: 4, colonna: 4, pezzi: ['print(f"Errore alla riga {chiamante.f_lineno}: {motivo}", ', "file=sys.stderr)"] });
  });

  test("dopo una virgola: la media del riferimento della tappa 1 in C, rientro 8", () => {
    const riga = '        printf("Media: %.2f su %d voti, insufficienti: %d\\n", media, contati, insufficienti);';
    expect(genera("c", progetto("casi/tappa-1/riferimento-media-voti.algo"))!.some((r) => r.testo === riga)).toBe(true);
    // 69 colonne dopo il rientro: `printf(` 7 e la stringa 45 arrivano a 52; le virgole tagliano a 53, 60 e 69; lo
    // spazio dopo l'ultima virgola taglierebbe a 70, oltre.
    expect(aCapo(riga, 77)).toEqual({ rientro: 8, colonna: 8, pezzi: ['printf("Media: %.2f su %d voti, insufficienti: %d\\n", media, contati,', " insufficienti);"] });
  });

  test("dentro una stringa lunga: il motivo della ricorsione senza uscita in Python, rientro 8", () => {
    const riga = '        fermati("La procedura o la funzione è stata richiamata 10 volte, e nessuna è finita.", 3)';
    expect(genera("python", progetto("casi/tappa-4/ricorsione-senza-uscita.algo"))!.some((r) => r.testo === riga)).toBe(true);
    // Fuori dalla stringa l'unico punto è dopo `",` in fondo, oltre le 69 colonne: si va a capo nella stringa, dopo lo
    // spazio che precede `nessuna` (taglio a 67).
    expect(aCapo(riga, 77)).toEqual({ rientro: 8, colonna: 8, pezzi: ['fermati("La procedura o la funzione è stata richiamata 10 volte, e ', 'nessuna è finita.", 3)'] });
  });

  test("una parola senza punti, a 20 colonne: la console del C", () => {
    const riga = "    SetConsoleOutputCP(65001);";
    expect(genera("c", progetto("casi/tappa-3/parametro-intero.algo"))!.some((r) => r.testo === riga)).toBe(true);
    // Rientro 4 (metà di 20 meno 4 fa 6): 16 colonne, poi il seguito a 8 con 12.
    expect(aCapo(riga, 20)).toEqual({ rientro: 4, colonna: 4, pezzi: ["SetConsoleOutput", "CP(65001);"] });
  });

  test("il rientro profondo: la riga più rientrata del Python di 50 livelli si stampa a metà meno 4", () => {
    const righe = genera("python", progetto("casi/tappa-4/chiamata-al-livello-50.algo"))!;
    const rientro = (t: string) => t.length - t.trimStart().length;
    const riga = righe.reduce((m, r) => (rientro(r.testo) > rientro(m.testo) ? r : m)).testo;
    expect(rientro(riga)).toBe(200);
    expect(aCapo(riga, 77)).toEqual({ rientro: 200, colonna: 34, pezzi: [riga.trimStart()] });
    expect(rientroDelSeguito).toBe(4);
  });

  test("le righe vuote e di soli spazi", () => {
    expect(aCapo("", 77)).toEqual({ rientro: 0, colonna: 0, pezzi: [""] });
    expect(aCapo("        ", 77)).toEqual({ rientro: 8, colonna: 8, pezzi: [""] });
  });

  test("un carattere fra apici: mai tagliato dentro ' ', e '\"' non apre una stringa", () => {
    // 31 colonne dopo il rientro, 20 di larghezza: lo spazio dentro ' ' (il 18°) non è un punto; l'ultimo fuori è quello
    // dopo `==` (il 16°).
    expect(aCapo("    se_vero = (c == ' ') && pronto;", 24)).toEqual({ rientro: 4, colonna: 4, pezzi: ["se_vero = (c == ", "' ') && pronto;"] });
    // `'"'` è un carattere: la stringa vera va dall'8° al 20°, i suoi spazi (12°, 16°) cedono allo spazio dopo `'"',` (7°);
    // il seguito (16 colonne) taglia allo spazio dopo la virgola che chiude la stringa.
    expect(aCapo(`    s('"', "uno due tre", fine);`, 24)).toEqual({ rientro: 4, colonna: 4, pezzi: [`s('"', `, `"uno due tre", `, "fine);"] });
  });
});

describe("i fogli del codice (attesi a mano)", () => {
  const breve = (rs: readonly (readonly RigaStampata[])[]) => rs.map((f) => f.map((r) => `${r.riga}.${r.pezzo}@${r.colonna}:${r.testo}`));
  const lunga = "    SetConsoleOutputCP(65001);";

  test("una riga a capo che ci sta riempie il foglio", () => {
    expect(breve(fogliDelCodice(["uno", lunga, "due", "tre"], { colonne: 20, righe: 3 }))).toEqual([
      ["0.0@0:uno", "1.0@4:SetConsoleOutput", "1.1@8:CP(65001);"],
      ["2.0@0:due", "3.0@0:tre"],
    ]);
  });

  test("una riga a capo che non ci sta passa intera al foglio dopo", () => {
    expect(breve(fogliDelCodice(["uno", "due", lunga, "tre"], { colonne: 20, righe: 3 }))).toEqual([
      ["0.0@0:uno", "1.0@0:due"],
      ["2.0@4:SetConsoleOutput", "2.1@8:CP(65001);", "3.0@0:tre"],
    ]);
  });

  test("un inizio comincia un foglio nuovo", () => {
    expect(breve(fogliDelCodice(["uno", "due", "tre"], { colonne: 20, righe: 3 }, new Set([1])))).toEqual([["0.0@0:uno"], ["1.0@0:due", "2.0@0:tre"]]);
  });

  test("una riga con più pezzi di un foglio comincia su un foglio nuovo e continua", () => {
    // 46 caratteri dopo il rientro: 16, poi 12, 12 e 6.
    const piuLunga = "    SetConsoleOutputCP(65001);SetConsoleCP(65001);";
    expect(breve(fogliDelCodice(["uno", piuLunga, "due"], { colonne: 20, righe: 2 }))).toEqual([
      ["0.0@0:uno"],
      ["1.0@4:SetConsoleOutput", "1.1@8:CP(65001);Se"],
      ["1.2@8:tConsoleCP(6", "1.3@8:5001);"],
      ["2.0@0:due"],
    ]);
  });
});

// ------------------------------------------------------------------------------------------------- il corpus

const file = ["casi/tappa-1", "casi/tappa-2", "casi/tappa-3", "casi/tappa-4", "casi/tipi"].flatMap((c) =>
  readdirSync(join(radice, c))
    .filter((f) => f.endsWith(".algo"))
    .map((f) => `${c}/${f}`),
);
/** I tipi nuovi di un file di `casi/tipi/`: tabella se ne usa una, poi matrice, poi record. */
const specieDi = (f: string, p: Progetto) => (!f.startsWith("casi/tipi/") ? undefined : usaLeTabelle(p) ? "tabella" : usaLeMatrici(p) ? "matrice" : "record");
const progetti = file.flatMap((f) => {
  const e = apri(readFileSync(join(radice, f), "utf8"));
  return e.ok ? [{ file: f, p: e.progetto }] : [];
});

/** Di quale funzione è ogni blocco (con l'inizio e la fine), dall'albero del progetto. */
function funzioneDeiBlocchi(p: Progetto): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of p.functions) {
    m.set(f.id, f.id);
    m.set(f.end.id, f.id);
    const visita = (bs: readonly Blocco[]): void => bs.forEach((b) => (m.set(b.id, f.id), visita(figliDelBlocco(b))));
    visita(f.body);
  }
  return m;
}

/** I difetti delle parti di un codice: copertura, ordine, unione, segni e provenienze. */
function difettiDelleParti(p: Progetto, righe: readonly Riga[], parti: readonly ParteDelCodice[]): string[] {
  const d: string[] = [];
  if (parti.length === 0) return righe.length === 0 ? [] : ["nessuna parte"];
  if (parti[0]!.da !== 0 || parti.at(-1)!.a !== righe.length) d.push("le parti non coprono le righe");
  parti.forEach((x, i) => {
    if (x.a <= x.da) d.push(`parte vuota ${i}`);
    if (i > 0 && parti[i - 1]!.a !== x.da) d.push(`parti non contigue a ${x.da}`);
  });
  if (parti.map((x) => testoDelCodice(righe.slice(x.da, x.a))).join("") !== testoDelCodice(righe)) d.push("l'unione non è il testo");
  const funzioni = parti.map((x) => x.funzione);
  if (new Set(funzioni).size !== funzioni.length) d.push("una funzione in due parti");
  if (funzioni.slice(0, -1).includes(undefined)) d.push("la coda non è in fondo");
  const diChi = (i: number) => parti.find((x) => x.da <= i && i < x.a)?.funzione;
  const blocchi = funzioneDeiBlocchi(p);
  const principale = p.functions.find((f) => f.kind === "main")!;
  const conProvenienza = new Set<string>();
  righe.forEach((r, i) => {
    if (r.nellaFunzione !== undefined && diChi(i) !== r.nellaFunzione) d.push(`riga ${i + 1} segnata ${r.nellaFunzione} e nella parte ${diChi(i)}`);
    const propria = r.blocco !== undefined ? blocchi.get(r.blocco) : r.dato !== undefined ? (r.funzione ?? (principale.data.some((x) => x.name === r.dato) ? principale.id : undefined)) : undefined;
    if (propria === undefined) return;
    conProvenienza.add(propria);
    if (diChi(i) !== propria) d.push(`riga ${i + 1} della funzione ${propria} nella parte ${diChi(i)}`);
  });
  for (const f of conProvenienza) if (!righe.some((r) => r.nellaFunzione === f)) d.push(`la funzione ${f} non ha righe segnate`);
  return d;
}

/** Dove una riga è dentro una stringa fra virgolette doppie (la barra rovesciata salta il carattere dopo) o dentro un
 * carattere fra apici fuori dalle stringhe (`'x'`, `'\x'`): scritto qui, coi caratteri fra apici cercati prima. */
function nelleStringhe(c: readonly string[]): boolean[] {
  const testo = c.join("");
  // Gli inizi dei caratteri fra apici (in punti di codice), per lunghezza: `'x'` 3, `'\x'` 4.
  const apici = new Map<number, number>();
  for (let i = 0; i < c.length; i++)
    if (c[i] === "'" && c[i + 1] !== "'") {
      // Prima la forma con la barra rovesciata: `'\''` è lungo 4, non 3.
      if (c[i + 1] === "\\" && c[i + 3] === "'") apici.set(i, 4);
      else if (c[i + 2] === "'") apici.set(i, 3);
    }
  const fuori: boolean[] = [];
  let dentro = false;
  let salta = false;
  let inApici = 0;
  for (let i = 0; i < c.length; i++) {
    const x = c[i]!;
    if (inApici > 0) {
      fuori.push(true);
      inApici--;
      continue;
    }
    fuori.push(dentro);
    if (salta) salta = false;
    else if (dentro && x === "\\") salta = true;
    else if (x === '"') dentro = !dentro;
    else if (!dentro && apici.has(i)) inApici = apici.get(i)! - 1;
  }
  if (fuori.length !== Array.from(testo).length) throw new Error("nelleStringhe: misura");
  return fuori;
}

/** I difetti degli a capo di una riga: ricomposizione, larghezze, tagli a metà parola o nella stringa. */
function difettiDellACapo(testo: string, colonne: number, a: ReturnType<typeof aCapo>): string[] {
  const d: string[] = [];
  if (" ".repeat(a.rientro) + a.pezzi.join("") !== testo) d.push("non ricompone");
  if (a.colonna > a.rientro || a.colonna > Math.max(0, Math.floor(colonne / 2) - rientroDelSeguito)) d.push(`colonna ${a.colonna}`);
  const c = Array.from(testo).slice(a.rientro);
  const stringa = nelleStringhe(c);
  const punto = (k: number) => c[k - 1] === " " || c[k - 1] === ",";
  let da = 0;
  a.pezzi.forEach((pz, i) => {
    const larghezza = colonne - (i === 0 ? a.colonna : a.colonna + rientroDelSeguito);
    const n = Array.from(pz).length;
    if (n > Math.max(1, larghezza)) d.push(`pezzo ${i} di ${n} oltre ${larghezza}`);
    if (i === a.pezzi.length - 1) return;
    const taglio = da + n;
    // Un punto fuori dalle stringhe nella larghezza vince; poi uno nella stringa; senza punti, il taglio alla larghezza.
    const candidati = [];
    for (let k = da + 1; k <= da + larghezza; k++) if (punto(k)) candidati.push(k);
    const fuori = candidati.filter((k) => !stringa[k - 1]);
    if (!punto(taglio) && candidati.length > 0) d.push(`a metà parola al ${taglio} con un punto nella larghezza`);
    else if (punto(taglio) && stringa[taglio - 1] && fuori.length > 0) d.push(`nella stringa al ${taglio} con un punto fuori`);
    else if (taglio !== (fuori.at(-1) ?? candidati.at(-1) ?? da + larghezza)) d.push(`taglio al ${taglio} e non all'ultimo punto`);
    da = taglio;
  });
  return d;
}

/** I difetti dei fogli: righe del foglio, righe divise, inizi, unione. */
function difettiDeiFogli(testi: readonly string[], misure: { colonne: number; righe: number }, inizi: ReadonlySet<number>, fogli: readonly (readonly RigaStampata[])[]): string[] {
  const d: string[] = [];
  const attese = testi.flatMap((t, riga) => {
    const a = aCapo(t, misure.colonne);
    return a.pezzi.map((testo, pezzo) => `${riga}.${pezzo}:${testo}@${pezzo === 0 ? a.colonna : a.colonna + rientroDelSeguito}`);
  });
  if (fogli.flat().map((r) => `${r.riga}.${r.pezzo}:${r.testo}@${r.colonna}`).join("\n") !== attese.join("\n")) d.push("l'unione dei fogli non è il codice");
  fogli.forEach((f, k) => {
    if (f.length === 0 || f.length > misure.righe) d.push(`foglio ${k} con ${f.length} righe`);
    const primo = f[0];
    if (primo !== undefined && primo.pezzo > 0 && aCapo(testi[primo.riga]!, misure.colonne).pezzi.length <= misure.righe) d.push(`riga ${primo.riga} divisa al foglio ${k}`);
    if (primo !== undefined && primo.pezzo === 0 && k > 0 && fogli[k - 1]!.at(-1)!.riga !== primo.riga - 1) d.push(`foglio ${k} non segue`);
  });
  for (const i of inizi) if (i > 0 && i < testi.length && !fogli.some((f) => f[0]?.riga === i && f[0].pezzo === 0)) d.push(`inizio ${i} non in cima`);
  return d;
}

/** Ogni codice del corpus dei linguaggi del registro che lo danno, con le sue parti. */
const codici = linguaggi.flatMap((v) =>
  progetti.flatMap(({ file: f, p }) => {
    const righe = genera(v.id, p);
    return righe === null ? [] : [{ linguaggio: v.id, file: f, p, righe }];
  }),
);

describe("le parti sul corpus, per ogni linguaggio del registro", () => {
  test("ogni riga in una sola parte, l'unione è il testo, i segni e le provenienze rispettati", () => {
    const conteggi: Record<string, { codici: number; righe: number; segnate: number; coda: number; parti: number }> = {};
    const difetti: string[] = [];
    for (const { linguaggio, file: f, p, righe } of codici) {
      const parti = partiDelCodice(righe);
      const c = (conteggi[linguaggio] ??= { codici: 0, righe: 0, segnate: 0, coda: 0, parti: 0 });
      c.codici++;
      c.righe += righe.length;
      c.segnate += righe.filter((r) => r.nellaFunzione !== undefined).length;
      c.coda += parti.filter((x) => x.funzione === undefined).reduce((s, x) => s + x.a - x.da, 0);
      c.parti += parti.length;
      difetti.push(...difettiDelleParti(p, righe, parti).map((x) => `${linguaggio} ${f}: ${x}`));
    }
    console.log(`parti: ${JSON.stringify(conteggi)}`);
    expect(difetti.slice(0, 10)).toEqual([]);
    // Ogni linguaggio del registro dà codice sul corpus e ne segna le righe.
    for (const v of linguaggi) expect(conteggi[v.id]?.segnate ?? 0, v.id).toBeGreaterThan(0);
    // I tipi nuovi: per specie, i linguaggi che ne danno il codice (quelli che non lo danno, come «Accademico», stampano
    // ciò che manca). Ogni specie ha codice, e dagli stessi linguaggi.
    const deiTipi: Record<string, string[]> = {};
    for (const { linguaggio, file: f, p } of codici) {
      const s = specieDi(f, p);
      if (s !== undefined && !(deiTipi[s] ??= []).includes(linguaggio)) deiTipi[s].push(linguaggio);
    }
    console.log(`parti dei tipi nuovi, i linguaggi per specie: ${JSON.stringify(deiTipi)}`);
    expect(Object.keys(deiTipi).sort()).toEqual(["matrice", "record", "tabella"]);
    expect(deiTipi.record!.length).toBeGreaterThan(0);
    expect(deiTipi.matrice).toEqual(deiTipi.record!);
    expect(deiTipi.tabella).toEqual(deiTipi.record!);
  });

  test("controlli positivi: una riga tolta, i segni di una funzione tolti → rosso", () => {
    const { p, righe } = codici.find((x) => x.linguaggio === "python" && x.p.functions.length > 1)!;
    const parti = partiDelCodice(righe);
    const tolta = parti.map((x, i) => (i === 0 ? { ...x, a: x.a - 1 } : x));
    const altra = p.functions.find((f) => f.kind !== "main")!.id;
    const senzaSegni = righe.map((r) => (r.nellaFunzione === altra ? { testo: r.testo, ...(r.blocco ? { blocco: r.blocco } : {}), ...(r.dato ? { dato: r.dato } : {}), ...(r.funzione ? { funzione: r.funzione } : {}) } : r));
    const accesi = {
      "riga tolta": difettiDelleParti(p, righe, tolta).length > 0,
      "segni tolti": difettiDelleParti(p, senzaSegni, partiDelCodice(senzaSegni)).length > 0,
    };
    console.log(`controlli positivi delle parti: ${JSON.stringify(accesi)}`);
    expect(accesi).toEqual({ "riga tolta": true, "segni tolti": true });
  });
});

describe("gli a capo sul corpus", () => {
  test("i pezzi ricompongono la riga, mai a metà parola dove c'è un punto, il seguito a + 4", () => {
    const conteggi: Record<string, number> = {};
    // Le righe a capo dei tipi nuovi, per specie e linguaggio, alla larghezza del foglio verticale.
    const deiTipi: Record<string, number> = {};
    const difetti: string[] = [];
    for (const colonne of [40, 77, 109])
      for (const { linguaggio, file: f, p, righe } of codici)
        righe.forEach((r, i) => {
          const a = aCapo(r.testo, colonne);
          if (a.pezzi.length > 1) conteggi[`${linguaggio}@${colonne}`] = (conteggi[`${linguaggio}@${colonne}`] ?? 0) + 1;
          const s = specieDi(f, p);
          if (a.pezzi.length > 1 && s !== undefined && colonne === 77) deiTipi[`${s} ${linguaggio}`] = (deiTipi[`${s} ${linguaggio}`] ?? 0) + 1;
          difetti.push(...difettiDellACapo(r.testo, colonne, a).map((x) => `${linguaggio}@${colonne} ${f}:${i + 1}: ${x}`));
        });
    console.log(`righe a capo: ${JSON.stringify(conteggi)}`);
    console.log(`righe a capo dei tipi nuovi a 77 colonne: ${JSON.stringify(deiTipi)}`);
    expect(difetti.slice(0, 10)).toEqual([]);
    expect(conteggi["python@77"]).toBeGreaterThan(0);
    // Ogni specie ha righe lunghe che vanno a capo sul foglio verticale.
    for (const s of ["record", "matrice", "tabella"]) expect(Object.entries(deiTipi).filter(([k]) => k.startsWith(`${s} `)).reduce((n, [, v]) => n + v, 0), s).toBeGreaterThan(0);
  });

  test("controllo positivo: un a capo che taglia alla larghezza → rosso", () => {
    const allaLarghezza = (testo: string, colonne: number) => {
      const a = aCapo(testo, colonne);
      const c = Array.from(testo).slice(a.rientro);
      const pezzi: string[] = [];
      let da = 0;
      let w = colonne - a.colonna;
      while (c.length - da > w) {
        pezzi.push(c.slice(da, da + w).join(""));
        da += w;
        w = colonne - a.colonna - rientroDelSeguito;
      }
      pezzi.push(c.slice(da).join(""));
      return { ...a, pezzi };
    };
    const rossi = codici.flatMap(({ righe }) => righe.filter((r) => difettiDellACapo(r.testo, 77, allaLarghezza(r.testo, 77)).length > 0)).length;
    // E sulle sole righe dei tipi nuovi.
    const rossiDeiTipi = codici.filter(({ file: f, p }) => specieDi(f, p) !== undefined).flatMap(({ righe }) => righe.filter((r) => difettiDellACapo(r.testo, 77, allaLarghezza(r.testo, 77)).length > 0)).length;
    console.log(`controllo positivo degli a capo: ${rossi} righe rosse, dei tipi nuovi ${rossiDeiTipi}`);
    expect(rossi).toBeGreaterThan(0);
    expect(rossiDeiTipi).toBeGreaterThan(0);
  });
});

describe("i fogli sul corpus", () => {
  const misure = [
    { colonne: 77, righe: 48 },
    { colonne: 109, righe: 72 },
  ];
  test("di seguito e con un foglio nuovo per parte", () => {
    let fogli = 0;
    const difetti: string[] = [];
    for (const m of misure)
      for (const { linguaggio, file: f, righe } of codici) {
        const testi = righe.map((r) => r.testo);
        for (const inizi of [new Set<number>(), new Set(partiDelCodice(righe).map((x) => x.da))]) {
          const fs = fogliDelCodice(testi, m, inizi);
          fogli += fs.length;
          difetti.push(...difettiDeiFogli(testi, m, inizi, fs).map((x) => `${linguaggio} ${m.colonne}×${m.righe} ${f}: ${x}`));
        }
      }
    console.log(`fogli del codice: ${fogli}`);
    expect(difetti.slice(0, 10)).toEqual([]);
  });

  test("controllo positivo: una riga divisa fra due fogli → rosso", () => {
    const testi = ["uno", "due", "    SetConsoleOutputCP(65001);", "tre"];
    const m = { colonne: 20, righe: 3 };
    const giusti = fogliDelCodice(testi, m);
    const divisi = [[...giusti[0]!, giusti[1]![0]!], giusti[1]!.slice(1)];
    expect(difettiDeiFogli(testi, m, new Set(), giusti)).toEqual([]);
    expect(difettiDeiFogli(testi, m, new Set(), divisi).length).toBeGreaterThan(0);
  });
});
