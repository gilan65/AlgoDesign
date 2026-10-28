// La stampa senza il disegno della pagina: le scelte della finestra «Stampa», le procedure e funzioni che si stampano, le
// parti che hanno qualcosa da stampare, le sezioni della pagina preparata nell'ordine (una per foglio nuovo, ognuna con
// la sua regola `@page`) e il testo di quelle regole. Le parti escono in quest'ordine: Progetto, Dati, Flowchart, Codice,
// Flowchart e codice affiancati, Casi d'uso; dentro una parte le procedure e funzioni nell'ordine del file (il programma
// principale per primo). Il flowchart di ogni funzione comincia su un foglio nuovo, coi fogli del nucleo
// (`fogliDelDisegno`); i dati e i casi d'uso di più funzioni si seguono sugli stessi fogli, o ognuna da un foglio nuovo
// con la casella «Ogni procedura e funzione in un foglio nuovo».
//
// Il codice: quello del linguaggio scelto, coi fogli di `fogliDelCodice` (a 8 punti, verticali o orizzontali) e i numeri
// veri delle righe del file; di seguito, o ogni parte (`partiDelCodice`) da un foglio nuovo con la stessa casella; con
// «solo quella mostrata» le sole righe di quella funzione (col programma principale anche la testa del file), senza la
// coda delle funzioni di supporto. Gli affiancati valgono solo col flowchart e il codice scelti, e allora escono al loro
// posto: per ogni funzione fogli orizzontali col flowchart a sinistra (i fogli del nucleo sul mezzo foglio) e il codice a
// destra, il più lungo che continua sui fogli dopo con l'altro lato vuoto; in fondo, con tutte le funzioni, la coda
// «Funzioni di supporto» col lato del flowchart vuoto. Un linguaggio che non dà il codice (ciò che manca, gli errori del
// progetto, un costrutto che questa versione non sa controllare) stampa al posto del codice un foglio verticale con la
// frase e l'elenco; negli affiancati, dopo quel foglio, i flowchart come nella loro parte.
//
// Il foglio: A4, coi margini dove stanno l'intestazione (sopra) e il piè di pagina (sotto). Ogni margine è occupato,
// anche da uno spazio che non si vede: il motore aggiunge le sue intestazioni (data, titolo, indirizzo) nei margini che
// la pagina lascia liberi (misurato sulla WebView2 in DataDesign). Le regole si scrivono in un foglio di stile costruito
// dal CSSOM, non in un `<style>`: la politica di sicurezza dei contenuti dell'app (`style-src 'self'`) lo fermerebbe, e i
// fogli uscirebbero tutti verticali e senza intestazioni (misurato in Chromium).
//
// CHE COSA NON FA:
// - disegnare le parti (`PaginaStampata.tsx`) né stampare (`window.print` di chi la mostra);
// - generare il codice, misurare il carattere del codice o scrivere l'elenco di ciò che manca (lo fa chi stampa);
// - misure diverse da A4.
import { puntiDelTesto, puntiPredefiniti, type AreeDelFoglio, type FogliDelDisegno } from "../../core/disegno/fogli";
import type { ModoDiColore } from "../../core/disegno/tavolozza";
import type { GeometriaDelTema } from "../../core/disegno/tema";
import type { Generato } from "../../core/genera/forma";
import type { Linguaggio } from "../../core/genera/linguaggi";
import { fogliDelCodice, partiDelCodice, type RigaStampata } from "../../core/genera/stampato";
import type { CasoDUso, CasoDiUnaFunzione, Funzione, Progetto } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";

/** Le parti della stampa, nell'ordine in cui escono. */
export const partiDellaStampa = ["progetto", "dati", "flowchart", "codice", "affiancati", "casi"] as const;
export type ParteDellaStampa = (typeof partiDellaStampa)[number];

/** Il testo di ogni parte nella finestra; nell'intestazione dei fogli quello di `testaDellaParte`. */
export const testoDellaParte = {
  progetto: "stampaProgetto",
  dati: "stampaDati",
  flowchart: "stampaFlowchart",
  codice: "stampaCodice",
  affiancati: "stampaAffiancati",
  casi: "stampaCasi",
} as const satisfies Record<ParteDellaStampa, keyof Dizionario>;

/** Il testo di ogni parte nell'intestazione dei fogli: le parti del codice col nome del linguaggio. */
const testaDellaParte = {
  progetto: "stampaProgetto",
  dati: "stampaDati",
  flowchart: "stampaFlowchart",
  codice: "stampaTestaCodice",
  affiancati: "stampaTestaAffiancati",
  casi: "stampaCasi",
} as const satisfies Record<ParteDellaStampa, keyof Dizionario>;

export interface ScelteDiStampa {
  readonly parti: Readonly<Record<ParteDellaStampa, boolean>>;
  /** Tutte le procedure e funzioni, o solo quella mostrata. */
  readonly tutte: boolean;
  /** «Ogni procedura e funzione in un foglio nuovo» (dati, codice e casi d'uso; vale solo con tutte). */
  readonly foglioNuovo: boolean;
  /** Il linguaggio del codice; `null` quello mostrato nella colonna del codice (anche se quello scelto non è più acceso). */
  readonly linguaggio: Linguaggio | null;
  /** Il codice da solo su fogli orizzontali (gli affiancati lo sono sempre). */
  readonly codiceOrizzontale: boolean;
  /** «Adatta al foglio» e il testo minimo del flowchart, in punti. */
  readonly adatta: boolean;
  readonly punti: number;
  readonly colori: ModoDiColore;
  /** I segni dell'esecuzione sui flowchart (vale solo in pausa). */
  readonly segni: boolean;
  /** Nel piè di pagina. */
  readonly numeri: boolean;
  readonly data: boolean;
}

/** Le scelte della prima stampa della sessione: flowchart e codice affiancati di tutte, a 8 punti, a colori, col piè di
 * pagina intero, nel linguaggio mostrato. */
export const sceltePredefinite: ScelteDiStampa = {
  parti: { progetto: false, dati: false, flowchart: true, codice: true, affiancati: true, casi: false },
  tutte: true,
  foglioNuovo: false,
  linguaggio: null,
  codiceOrizzontale: false,
  adatta: false,
  punti: puntiPredefiniti,
  colori: "colori",
  segni: true,
  numeri: true,
  data: true,
};

/** Le procedure e funzioni che si stampano, nell'ordine del file: tutte, o solo quella mostrata. */
export const funzioniDellaStampa = (p: Progetto, mostrata: string, tutte: boolean): readonly Funzione[] => (tutte ? p.functions : p.functions.filter((f) => f.id === mostrata));

/** I casi d'uso di una funzione: del progetto per il programma principale, suoi per una procedura o funzione. */
export const casiDi = (p: Progetto, f: Funzione): readonly (CasoDUso | CasoDiUnaFunzione)[] => (f.kind === "main" ? (p.test_cases ?? []) : (f.test_cases ?? []));

/** Le costanti comuni stanno coi dati del programma principale. */
export const comuniDi = (p: Progetto, f: Funzione) => (f.kind === "main" ? (p.shared_constants ?? []) : []);

/** Una funzione ha qualcosa da stampare nei dati: dati, parametri o (il programma principale) costanti comuni. */
export const conDati = (p: Progetto, f: Funzione) => f.data.length > 0 || comuniDi(p, f).length > 0;

/** Le parti che hanno qualcosa da stampare per quelle funzioni: le altre sono spente nella finestra. Il progetto col solo
 * nome non fa un foglio. */
export function partiPiene(p: Progetto, funzioni: readonly Funzione[]): Record<ParteDellaStampa, boolean> {
  const m = p.metadata;
  return {
    progetto: [m.author, m.description, m.notes].some((x) => (x ?? "").trim() !== ""),
    dati: funzioni.some((f) => conDati(p, f)),
    flowchart: funzioni.length > 0,
    codice: funzioni.length > 0,
    affiancati: funzioni.length > 0,
    casi: funzioni.some((f) => casiDi(p, f).length > 0),
  };
}

/** Le parti che escono, fra quelle scelte e piene: gli affiancati solo col flowchart e il codice, e allora al loro posto. */
export function partiStampate(scelte: Pick<ScelteDiStampa, "parti">, piene: Readonly<Record<ParteDellaStampa, boolean>>): Record<ParteDellaStampa, boolean> {
  const x = Object.fromEntries(partiDellaStampa.map((p) => [p, scelte.parti[p] && piene[p]])) as Record<ParteDellaStampa, boolean>;
  const accanto = x.affiancati && x.flowchart && x.codice;
  return { ...x, flowchart: x.flowchart && !accanto, codice: x.codice && !accanto, affiancati: accanto };
}

/** Le righe del codice di un foglio: i pezzi di `fogliDelCodice`, coi numeri da `primo` + 1, e le colonne dei numeri. */
export interface CodiceDelFoglio {
  readonly righe: readonly RigaStampata[];
  readonly primo: number;
  readonly cifre: number;
}

/** Una sezione della pagina: comincia su un foglio nuovo e ha la sua regola `@page` (il nome), col verso e
 * l'intestazione; le funzioni che contiene; per il flowchart (anche affiancato) quale foglio; per il codice le sue righe,
 * o il segno che il codice non c'è (il foglio dell'elenco). */
export interface Sezione {
  readonly parte: ParteDellaStampa;
  readonly nome: string;
  readonly orizzontale: boolean;
  readonly testa: string;
  readonly destra: string;
  readonly funzioni: readonly Funzione[];
  readonly foglio?: number;
  readonly codice?: CodiceDelFoglio;
  readonly senzaCodice?: true;
}

/** Il nome di una funzione nella stampa: il programma principale col nome della sua scheda. */
export const nomeNellaStampa = (f: Funzione, testi: Dizionario) => (f.kind === "main" ? testi.schedaPrincipale : (f.name ?? ""));

// --- Le misure del foglio. Il foglio A4 coi margini: 22 mm sopra per l'intestazione, 18 sotto per il piè di pagina, 12
// ai lati; negli affiancati 6 mm fra il flowchart e il codice, a metà. Il codice a 8 punti, interlinea 1,3.
const AREA_ORIZZONTALE = { larghezza: 297 - 24, altezza: 210 - 22 - 18 };
const AREA_VERTICALE = { larghezza: 210 - 24, altezza: 297 - 22 - 18 };
export const SOLCO = 6;
const LATO = (AREA_ORIZZONTALE.larghezza - SOLCO) / 2;
export const PUNTI_DEL_CODICE = 8;
export const INTERLINEA_DEL_CODICE = 1.3;

export interface MisureDelCodice {
  readonly colonne: number;
  readonly righe: number;
}

/** Le misure dei fogli del codice di un file di `righe` righe, col passo del carattere (mm per carattere a 8 punti): le
 * colonne dei numeri (le cifre e uno spazio, dove sta anche ↪), e colonne e righe del testo sul foglio verticale,
 * sull'orizzontale e sul mezzo foglio degli affiancati (una colonna e una riga di margine per gli arrotondamenti del
 * motore che stampa: misurato in Chromium alla larghezza della carta, la riga più lunga del riferimento della tappa 3
 * riempie il 96,5% del lato). */
export function misureDelCodice(passo: number, righe: number): { cifre: number; verticale: MisureDelCodice; orizzontale: MisureDelCodice; accanto: MisureDelCodice } {
  const cifre = String(Math.max(1, righe)).length + 1;
  const riga = (PUNTI_DEL_CODICE * INTERLINEA_DEL_CODICE * 25.4) / 72;
  const di = (larghezza: number, altezza: number) => ({ colonne: Math.max(1, Math.floor(larghezza / passo) - cifre - 1), righe: Math.max(1, Math.floor(altezza / riga) - 1) });
  return { cifre, verticale: di(AREA_VERTICALE.larghezza, AREA_VERTICALE.altezza), orizzontale: di(AREA_ORIZZONTALE.larghezza, AREA_ORIZZONTALE.altezza), accanto: di(LATO, AREA_ORIZZONTALE.altezza) };
}

/** Il codice per le parti del codice: il nome del linguaggio, ciò che il generatore dà, le misure e i fogli del flowchart
 * di una funzione sul mezzo foglio degli affiancati. */
export interface CodiceDellaStampa {
  readonly nome: string;
  readonly generato: Generato;
  readonly misure: ReturnType<typeof misureDelCodice>;
  readonly fogliAccanto: (f: Funzione) => Pick<FogliDelDisegno, "fogli">;
}

/** La frase in cima al foglio senza codice: ciò che manca, gli errori (`errori` è quanti), o il costrutto fuori tappa. */
export function fraseSenzaCodice(g: Generato, nome: string, errori: number, testi: Dizionario): string {
  if (g.generato) return "";
  if (g.perche === "non-ci-sta") return riempi(testi.stampaNonCiSta, { linguaggio: nome, quante: quanteCose(g.mancanze.length, testi) });
  if (g.perche === "errori-statici") return riempi(testi.stampaConErrori, { quanti: errori === 1 ? testi.statoErrore : riempi(testi.statoErrori, { n: String(errori) }) });
  return testi.apriFuoriTappa;
}

/** La nota della finestra per un linguaggio che non dà il codice; vuota se lo dà. */
export function notaSenzaCodice(g: Generato, nome: string, testi: Dizionario): string {
  if (g.generato) return "";
  if (g.perche === "non-ci-sta") return riempi(testi.stampaNotaNonCiSta, { linguaggio: nome, quante: quanteCose(g.mancanze.length, testi) });
  if (g.perche === "errori-statici") return testi.stampaNotaConErrori;
  return testi.apriFuoriTappa;
}

const quanteCose = (n: number, testi: Dizionario) => (n === 1 ? testi.mancanzaUna : riempi(testi.mancanzeTante, { n: String(n) }));

/** Le sezioni della pagina, nell'ordine: le parti stampate, dati e casi d'uso di seguito o una funzione per sezione, il
 * flowchart un foglio per sezione (`fogliDi` dà i fogli del nucleo di una funzione), il codice e gli affiancati coi
 * fogli del codice. */
export function sezioniDellaStampa(
  p: Progetto,
  funzioni: readonly Funzione[],
  scelte: ScelteDiStampa,
  fogliDi: (f: Funzione) => Pick<FogliDelDisegno, "orizzontale" | "fogli">,
  testi: Dizionario,
  codice: CodiceDellaStampa,
): Sezione[] {
  const stampate = partiStampate(scelte, partiPiene(p, funzioni));
  const progetto = p.metadata.name;
  const testa = (parte: ParteDellaStampa, chi?: Funzione | string) =>
    [progetto, riempi(testi[testaDellaParte[parte]], { linguaggio: codice.nome }), ...(chi === undefined ? [] : [typeof chi === "string" ? chi : nomeNellaStampa(chi, testi)])].join(" · ");
  const foglioDi = (i: number, n: number) => (n > 1 ? riempi(testi.stampaFoglioDi, { n: String(i + 1), m: String(n) }) : "");
  const divise = scelte.foglioNuovo && scelte.tutte;
  const fuori: Omit<Sezione, "nome">[] = [];
  const flowchart = () => {
    for (const f of funzioni) {
      const g = fogliDi(f);
      const n = g.fogli.length;
      g.fogli.forEach((_, i) =>
        fuori.push({ parte: "flowchart", orizzontale: g.orizzontale, testa: testa("flowchart", f), destra: n > 1 ? riempi(testi.stampaFoglio, { n: String(i + 1), m: String(n) }) : "", funzioni: [f], foglio: i }),
      );
    }
  };
  // Le parti del codice: per funzione (nell'ordine del progetto), e la coda (solo con tutte le funzioni).
  const g = codice.generato;
  const righe = g.generato ? g.righe.map((r) => r.testo) : [];
  const parti = g.generato ? partiDelCodice(g.righe) : [];
  const parteDi = (f: Funzione) => parti.find((x) => x.funzione === f.id);
  const coda = scelte.tutte ? parti.find((x) => x.funzione === undefined) : undefined;
  const fogli = (da: number, a: number, misure: MisureDelCodice) => fogliDelCodice(righe.slice(da, a), misure).map((r) => ({ righe: r, primo: da, cifre: codice.misure.cifre }));
  for (const parte of partiDellaStampa) {
    if (!stampate[parte]) continue;
    if (parte === "progetto") fuori.push({ parte, orizzontale: false, testa: testa(parte), destra: "", funzioni: [] });
    else if (parte === "flowchart") flowchart();
    else if ((parte === "codice" || parte === "affiancati") && !g.generato) {
      fuori.push({ parte, orizzontale: false, testa: testa(parte), destra: "", funzioni: [], senzaCodice: true });
      if (parte === "affiancati") flowchart();
    } else if (parte === "codice") {
      const orizzontale = scelte.codiceOrizzontale;
      const misure = orizzontale ? codice.misure.orizzontale : codice.misure.verticale;
      if (divise)
        for (const x of parti) {
          const chi = x.funzione === undefined ? testi.stampaSupporto : p.functions.find((f) => f.id === x.funzione);
          const fs = fogli(x.da, x.a, misure);
          fs.forEach((c, i) => fuori.push({ parte, orizzontale, testa: testa(parte, chi), destra: foglioDi(i, fs.length), funzioni: typeof chi === "object" && chi ? [chi] : [], codice: c }));
        }
      else {
        // Di seguito: tutto il file, o le righe di quella mostrata.
        const x = scelte.tutte ? { da: 0, a: righe.length } : parteDi(funzioni[0]!);
        if (x) for (const c of fogli(x.da, x.a, misure)) fuori.push({ parte, orizzontale, testa: testa(parte), destra: "", funzioni: [...funzioni], codice: c });
      }
    } else if (parte === "affiancati") {
      for (const f of funzioni) {
        const disegno = codice.fogliAccanto(f).fogli;
        const x = parteDi(f);
        const fs = x ? fogli(x.da, x.a, codice.misure.accanto) : [];
        const n = Math.max(disegno.length, fs.length);
        for (let i = 0; i < n; i++)
          fuori.push({ parte, orizzontale: true, testa: testa(parte, f), destra: foglioDi(i, n), funzioni: [f], ...(i < disegno.length ? { foglio: i } : {}), ...(fs[i] ? { codice: fs[i] } : {}) });
      }
      if (coda) {
        const fs = fogli(coda.da, coda.a, codice.misure.accanto);
        fs.forEach((c, i) => fuori.push({ parte, orizzontale: true, testa: testa(parte, testi.stampaSupporto), destra: foglioDi(i, fs.length), funzioni: [], codice: c }));
      }
    } else {
      const conQualcosa = funzioni.filter((f) => (parte === "dati" ? conDati(p, f) : casiDi(p, f).length > 0));
      if (divise) for (const f of conQualcosa) fuori.push({ parte, orizzontale: false, testa: testa(parte, f), destra: "", funzioni: [f] });
      else fuori.push({ parte, orizzontale: false, testa: testa(parte), destra: "", funzioni: conQualcosa });
    }
  }
  return fuori.map((s, k) => ({ ...s, nome: `stampa-${k}` }));
}

// L'area utile del flowchart in pixel CSS (le unità del disegno alla scala 1): sul foglio intero, e sul mezzo foglio
// degli affiancati (lo stesso nei due versi: il foglio è orizzontale).
const px = (mm: number) => (mm * 96) / 25.4;
export const MARGINI = "22mm 12mm 18mm";
export const areeDellaStampa: AreeDelFoglio = {
  orizzontale: { larghezza: px(AREA_ORIZZONTALE.larghezza), altezza: px(AREA_ORIZZONTALE.altezza) },
  verticale: { larghezza: px(AREA_VERTICALE.larghezza), altezza: px(AREA_VERTICALE.altezza) },
};
const mezzo = { larghezza: px(LATO), altezza: px(AREA_ORIZZONTALE.altezza) };
export const areeAccanto: AreeDelFoglio = { orizzontale: mezzo, verticale: mezzo };

/** Un testo come stringa CSS. */
export const stringaCss = (t: string) => `"${t.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", " ")}"`;
/** Uno spazio che non si vede: occupa un margine. */
export const SPAZIO = stringaCss(String.fromCharCode(0xa0));
const CARATTERE = "font: 8.5pt system-ui, -apple-system, \"Segoe UI\", sans-serif; color: #444444;";

/** Le regole dei fogli: per ogni sezione la misura, i margini, l'intestazione nel margine sopra e il piè di pagina scelto
 * nel margine sotto (il numero col contatore dei fogli); i sei riquadri sempre occupati. Una regola per riga. In stampa
 * si vede solo la pagina preparata, su carta bianca: anche ciò che sta nel `body` fuori da `#radice` si nasconde (la guida,
 * che resta aperta mentre si lavora, si stamperebbe sopra ogni foglio). */
export function regoleDeiFogli(sezioni: readonly Sezione[], testi: Dizionario, scelte: Pick<ScelteDiStampa, "numeri" | "data">, data: string): string {
  const [prima, mezzo, dopo] = testi.stampaPagina.split(/\{n\}|\{m\}/) as [string, string, string];
  const sopra = "vertical-align: bottom; padding-bottom: 1.5mm; margin-bottom: 6mm; border-bottom: 0.5pt solid #999999;";
  const sotto = "vertical-align: top; margin-top: 6mm;";
  const piede = [
    `@bottom-left { content: ${scelte.data ? stringaCss(data) : SPAZIO}; ${CARATTERE} ${sotto} }`,
    `@bottom-center { content: ${SPAZIO}; ${sotto} }`,
    `@bottom-right { content: ${scelte.numeri ? `${stringaCss(prima)} counter(page) ${stringaCss(mezzo)} counter(pages) ${stringaCss(dopo)}` : SPAZIO}; ${CARATTERE} ${sotto} }`,
  ].join(" ");
  return [
    ...sezioni.map(
      (s) =>
        `@page ${s.nome} { size: A4 ${s.orizzontale ? "landscape" : "portrait"}; margin: ${MARGINI}; ` +
        `@top-left { content: ${stringaCss(s.testa)}; ${CARATTERE} ${sopra} } @top-center { content: ${SPAZIO}; ${sopra} } ` +
        `@top-right { content: ${s.destra === "" ? SPAZIO : stringaCss(s.destra)}; ${CARATTERE} ${sopra} } ${piede} }`,
    ),
    "@media print { html, body { background: #ffffff; } body > :not([data-stampa]) { display: none; } }",
  ].join("\n");
}

/** I flowchart che ai punti scelti non stanno in larghezza ed escono più piccoli, coi punti veri; nessuno con «Adatta al
 * foglio». */
export function flowchartRistretti(funzioni: readonly Funzione[], scelte: Pick<ScelteDiStampa, "adatta" | "punti">, fogliDi: (f: Funzione) => Pick<FogliDelDisegno, "ristretto" | "scala">, geometria: GeometriaDelTema): { funzione: Funzione; punti: number }[] {
  if (scelte.adatta) return [];
  return funzioni.flatMap((f) => {
    const g = fogliDi(f);
    return g.ristretto ? [{ funzione: f, punti: puntiDelTesto(g.scala, geometria) }] : [];
  });
}

/** La nota dei flowchart ristretti, nella lingua; vuota se nessuno. I punti con un decimale. */
export function notaDeiRistretti(ristretti: readonly { funzione: Funzione; punti: number }[], punti: number, testi: Dizionario, lingua: string): string {
  const reali = (x: number) => x.toLocaleString(lingua, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (ristretti.length === 0) return "";
  if (ristretti.length === 1) return riempi(testi.stampaRistretto, { punti: String(punti), nome: nomeNellaStampa(ristretti[0]!.funzione, testi), reali: reali(ristretti[0]!.punti) });
  return riempi(testi.stampaRistretti, { punti: String(punti), elenco: ristretti.map((r) => riempi(testi.stampaVoceRistretta, { nome: nomeNellaStampa(r.funzione, testi), reali: reali(r.punti) })).join(", ") });
}
