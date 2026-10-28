// La scelta del bersaglio di uno spostamento, su 763 alberi: il corpus delle tappe 1 e 2, 300 generati a seme fisso
// senza cicli e 100 coi cicli `per` e `per ogni`, due costruiti apposta, e 170 di procedure e funzioni (ogni funzione del
// corpus della tappa 3 e di 15 progetti generati con procedure e funzioni, disegnata con le altre accanto come nell'app:
// coi salti e le intestazioni); quelli coi cicli (corpus della tappa 2 e generati) anche coi cicli chiusi. A quattro
// scale (la minima, 100%, 195%, la massima).
//
// - Il puntatore sul centro di ogni «+», portato sullo schermo con la scala e un angolo del disegno fuori
//   dall'origine (lo scorrimento), riporta a quel «+»; spostato fino quasi al bordo dell'area, ancora a
//   lui; sul centro di ogni blocco, a nessuno.
// - I «+» esclusi per un blocco, e per un tratto di due o tre blocchi vicini, sono esattamente quelli su cui
//   `spostaTratto` del nucleo rifiuta o non cambia nulla: confronto posto per posto, nei due versi (il rilevatore è il
//   nucleo, non questo modulo).
// - La copia che segue il puntatore porta il blocco con tutto il suo contenuto (le forme del sottoalbero, ciascuna per
//   `id`, fase e forma: un ciclo ha più forme col suo `id`, l'intestazione e i blocchi aggiunti dal riquadro; nei due
//   versi) e, con lo scarto, ogni sua forma sta su quella vera; lo stesso per la copia di due o tre blocchi vicini, il cui
//   riquadro della scelta contiene tutte le forme vere e i riquadri dei cicli.
// Controlli positivi: un giudizio che non guarda il sottoalbero, uno che di un tratto spegne solo i «+» del primo blocco,
// una conversione che non divide per la scala, una copia senza scarto fanno rosso coi loro messaggi.
//
// CHE COSA NON GUARDA:
// - il puntatore vero nei motori e il disegno durante il trascinamento (lo prova `e2e/trascina.e2e.ts`
//   su pochi casi);
// - le linee della copia una per una (si contano; le forme si confrontano con quelle vere);
// - la misura vera del testo: qui la misura è quella delle prove dell'impaginazione (per codice);
// - le due forme delle condizioni lunghe: i «+» stanno sulle linee in entrambe (`impaginazione.test.ts`),
//   qui si usa la predefinita; dei cicli, la forma aperta predefinita e quella chiusa (non «a parole»);
// - la copia di un `per ogni` che nel disegno sta dentro un altro `per ogni`: impaginata da sola scrive la posizione
//   del primo livello (`_indice`, non `_indice2`), quindi le sue forme hanno un'altra larghezza (limite dichiarato,
//   le copie saltate si contano).

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alberoGenerato, progettoGenerato } from "../../core/disegno/alberi-di-prova";
import { impagina, opzioniPredefinite, type Disegno, type Elemento, type MisuraDelTesto, type OpzioniDelDisegno, type TestiDelDisegno } from "../../core/disegno/impaginazione";
import { geometriaPredefinita } from "../../core/disegno/tema";
import { blocchiDelTratto, dove, spostaTratto, type Posto, type Tratto } from "../../core/modifica/operazioni";
import { apri } from "../../core/progetto/formato";
import type { Blocco, Funzione, Progetto } from "../../core/progetto/modello";
import { bersaglio, copiaDelBlocco, escluso, latoDellArea, MARGINE_DELLA_SCELTA, nelDisegno, riquadroDellaCopia, soloIlBlocco, sottoalbero, sottoalberoDelTratto, type Coordinate, type Copia } from "./bersaglio";
import { cicliIt, funzioniIt } from "../../core/esecuzione/testi-di-prova";
import { chiaveDelPosto } from "./accessibile";
import { MASSIMA, MINIMA } from "./VistaFlowchart";

const tema = geometriaPredefinita;
const testi: TestiDelDisegno = { inizio: "Inizio", fine: "Fine", leggi: "leggi", scrivi: "scrivi", vero: "Vero", falso: "Falso", aCapo: " ↵", ogniElemento: "{valore} in ogni elemento", altri: "… altri {n}", cicli: cicliIt, funzioni: funzioniIt };
const misura: MisuraDelTesto = (t) => [...t].reduce((s, c) => s + (c.codePointAt(0)! >= 0x1100 ? 1.2 : 0.62) * tema.carattere, 0);

const corpusDi = (tappa: string) => {
  const cartella = join(import.meta.dir, "..", "..", "casi", tappa);
  return readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((f) => {
      const esito = apri(readFileSync(join(cartella, f), "utf8"));
      if (!esito.ok) throw new Error(`${f} non si apre`);
      return { nome: f, progetto: esito.progetto };
    });
};
/** Un ramo largo accanto a uno stretto, nei due versi (come nelle prove dell'impaginazione). */
function apposta(largoAVero: boolean): Funzione {
  const largo: Blocco[] = [
    { id: "a2", kind: "if", condition: "una condizione piuttosto lunga che allarga il rombo", then: [{ id: "a3", kind: "write", values: ["\"un testo lungo nel ramo interno\""], newline: true }], else: [{ id: "a4", kind: "assignment", target: "x", value: "x + 1000000" }] },
  ];
  const stretto: Blocco[] = [{ id: "a5", kind: "read", target: "n" }];
  return { id: "f1", kind: "main", data: [], body: [{ id: "a1", kind: "if", condition: "n > 0", then: largoAVero ? largo : stretto, else: largoAVero ? stretto : largo }], end: { id: "a6" } };
}
const progettoDi = (...functions: Funzione[]): Progetto => ({ format: "algodesign", schema_version: 2, metadata: { name: "prova" }, functions });
/** Un albero per ogni funzione di un progetto con procedure e funzioni: la sua per prima (le prove disegnano la prima),
 * con le altre accanto, come nell'app (i salti dicono *rif*, i nomi delle funzioni nelle espressioni in grassetto). */
const unoPerFunzione = (nome: string, p: Progetto) =>
  p.functions.map((f) => ({ nome: `${nome}#${f.name ?? "programma"}`, progetto: { ...p, functions: [f, ...p.functions.filter((x) => x !== f)] } }));
const coiCicli = [...corpusDi("tappa-2"), ...Array.from({ length: 100 }, (_, i) => ({ nome: `generato-coi-cicli-${i + 1}`, progetto: progettoDi(alberoGenerato(1000 + i, true)) }))];
const conLeFunzioni = [
  ...corpusDi("tappa-3").flatMap((a) => unoPerFunzione(a.nome, a.progetto)),
  ...Array.from({ length: 15 }, (_, i) => unoPerFunzione(`progetto-${i + 1}`, progettoDi(...progettoGenerato(7000 + i)))).flat(),
];
const chiusi: OpzioniDelDisegno = { ...opzioniPredefinite, per: "chiuso", perOgni: "chiuso" };
const alberi = [
  ...[
    ...corpusDi("tappa-1"),
    ...Array.from({ length: 300 }, (_, i) => ({ nome: `generato-${i + 1}`, progetto: progettoDi(alberoGenerato(1000 + i)) })),
    ...coiCicli,
    { nome: "apposta-largo-a-vero", progetto: progettoDi(apposta(true)) },
    { nome: "apposta-largo-a-falso", progetto: progettoDi(apposta(false)) },
    ...conLeFunzioni,
  ].map((a) => ({ ...a, opzioni: opzioniPredefinite })),
  ...coiCicli.map((a) => ({ ...a, nome: `${a.nome} (chiusi)`, opzioni: chiusi })),
].map((a) => ({ ...a, disegno: impagina(a.progetto.functions[0]!, tema, misura, testi, a.opzioni, [], a.progetto.functions) }));
/** La premessa delle funzioni: alberi con un salto disegnato, e con l'intestazione di una procedura o funzione. */
const coiSalti = alberi.filter((a) => a.disegno.elementi.some((e) => e.forma === "chiamata")).length;
const conIntestazione = alberi.filter((a) => a.progetto.functions[0]!.kind !== "main").length;

const scale = [MINIMA, 1, 1.25 ** 3, MASSIMA];
/** L'angolo del disegno sullo schermo: fuori dall'origine, come dopo uno scorrimento. */
const origine: Coordinate = { x: 312.5, y: -847.25 };

type Converti = (schermo: Coordinate, origine: Coordinate, scala: number) => Coordinate;

/** Il puntatore portato sullo schermo e riportato nel disegno con `converti`: i «+» scelti sbagliati. */
function scelteSbagliate(converti: Converti): { difetti: string[]; premesse: { punti: number; vicinoAlBordo: number; blocchi: number } } {
  const difetti: string[] = [];
  const premesse = { punti: 0, vicinoAlBordo: 0, blocchi: 0 };
  const nessuno = () => false;
  for (const a of alberi) {
    for (const scala of scale) {
      const sulloSchermo = (q: Coordinate, dx = 0, dy = 0) => ({ x: origine.x + q.x * scala + dx, y: origine.y + q.y * scala + dy });
      const scelto = (schermo: Coordinate) => bersaglio(a.disegno.punti, converti(schermo, origine, scala), scala, nessuno);
      // Quasi al bordo dell'area, in pixel dello schermo.
      const quasi = 0.45 * latoDellArea(scala) * scala;
      for (const p of a.disegno.punti) {
        premesse.punti++;
        const b = scelto(sulloSchermo(p));
        if (b?.punto !== p) difetti.push(`${a.nome} a ${scala.toFixed(3)}: sul centro di ${chiaveDelPosto(p.posto)} → ${b ? chiaveDelPosto(b.punto.posto) : "nessuno"}`);
        for (const [dx, dy] of [[quasi, 0], [-quasi, 0], [0, quasi], [0, -quasi]] as const) {
          premesse.vicinoAlBordo++;
          const v = scelto(sulloSchermo(p, dx, dy));
          if (v?.punto !== p) difetti.push(`${a.nome} a ${scala.toFixed(3)}: vicino al bordo di ${chiaveDelPosto(p.posto)} (${dx}, ${dy}) → ${v ? chiaveDelPosto(v.punto.posto) : "nessuno"}`);
        }
      }
      for (const e of a.disegno.elementi) {
        premesse.blocchi++;
        const centro = { x: e.riquadro.x + e.riquadro.larghezza / 2, y: e.riquadro.y + e.riquadro.altezza / 2 };
        const b = scelto(sulloSchermo(centro));
        if (b !== null) difetti.push(`${a.nome} a ${scala.toFixed(3)}: sul centro del blocco ${e.id} → ${chiaveDelPosto(b.punto.posto)}`);
      }
    }
  }
  return { difetti, premesse };
}

/** Gli `id` dei blocchi di un progetto, in ordine. */
function blocchiDi(p: Progetto): Blocco[] {
  const visita = (s: readonly Blocco[]): Blocco[] => s.flatMap((b) => [b, ...visita(b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? (b.body as Blocco[]) : [])]);
  return visita(p.functions[0]!.body);
}

type Giudizio = (p: Progetto, t: Tratto) => (posto: Posto) => boolean;

/** Per ogni blocco (al più `perAlbero` per albero) e ogni «+»: il giudizio contro l'esito di `spostaTratto`, sul blocco solo
 * e sul tratto dei tre blocchi da lui in giù nella sua sequenza (o dei due, se dopo ne ha uno solo). */
function giudiziSbagliati(giudica: Giudizio, perAlbero: number): { difetti: string[]; premesse: { coppie: number; esclusi: number; rifiutati: number; tratti: number } } {
  const difetti: string[] = [];
  const premesse = { coppie: 0, esclusi: 0, rifiutati: 0, tratti: 0 };
  for (const a of alberi) {
    const blocchi = blocchiDi(a.progetto);
    const scelti = blocchi.length <= perAlbero ? blocchi : Array.from({ length: perAlbero }, (_, i) => blocchi[Math.floor((i * blocchi.length) / perAlbero)]!);
    const tratti = scelti.flatMap((b): Tratto[] => {
      const da = dove(a.progetto, b.id)!;
      const solo = { contenitore: da.contenitore, ramo: da.ramo, da: da.indice, a: da.indice };
      const lungo = { ...solo, a: da.indice + 2 };
      const piu = blocchiDelTratto(a.progetto, lungo).length === 3 ? lungo : blocchiDelTratto(a.progetto, { ...solo, a: da.indice + 1 }).length === 2 ? { ...solo, a: da.indice + 1 } : undefined;
      return piu ? [solo, piu] : [solo];
    });
    premesse.tratti += tratti.filter((t) => t.a > t.da).length;
    for (const t of tratti) {
      const no = giudica(a.progetto, t);
      const nome = `${t.contenitore}/${t.ramo}/${t.da}…${t.a}`;
      for (const p of a.disegno.punti) {
        premesse.coppie++;
        const r = spostaTratto(t, p.posto)(a.progetto, 1_000_000);
        const nonVa = !r.ok || r.progetto === a.progetto;
        if (!r.ok) premesse.rifiutati++;
        if (no(p.posto)) premesse.esclusi++;
        if (no(p.posto) !== nonVa) difetti.push(`${a.nome}: ${nome} su ${chiaveDelPosto(p.posto)}: escluso ${no(p.posto)}, sposta ${r.ok ? (r.progetto === a.progetto ? "senza effetto" : "applicato") : r.rifiuto.motivo}`);
        // Sul centro di un escluso, il bersaglio è lui, spento.
        if (no(p.posto)) {
          const s = bersaglio(a.disegno.punti, p, 1, no);
          if (s?.punto !== p || s.ammesso) difetti.push(`${a.nome}: ${nome} sul centro dell'escluso ${chiaveDelPosto(p.posto)} → ${s ? `${chiaveDelPosto(s.punto.posto)} ammesso ${s.ammesso}` : "nessuno"}`);
        }
      }
    }
  }
  return { difetti, premesse };
}

test("il puntatore sul centro di ogni «+», o vicino al bordo della sua area, sceglie quel «+» a ogni scala; sul centro di un blocco nessuno", () => {
  const { difetti, premesse } = scelteSbagliate(nelDisegno);
  console.log(
    `scelta del bersaglio: alberi ${alberi.length} (di procedure e funzioni ${conLeFunzioni.length}: coi salti ${coiSalti}, con l'intestazione ${conIntestazione}), scale ${scale.length}, «+» ${premesse.punti}, vicino al bordo ${premesse.vicinoAlBordo}, centri dei blocchi ${premesse.blocchi}, difetti ${difetti.length}`,
  );
  expect(difetti.slice(0, 10)).toEqual([]);
  expect({ alberi: alberi.length, conLeFunzioni: conLeFunzioni.length, coiSalti, conIntestazione }).toEqual({ alberi: 763, conLeFunzioni: 175, coiSalti: 66, conIntestazione: 107 });
  expect(premesse.punti).toBeGreaterThan(582 * scale.length * 2);
  // La premessa: i cicli ci sono, col loro riquadro.
  expect(alberi.filter((a) => a.disegno.riquadri.length > 0).length).toBeGreaterThan(100);

  // Controllo positivo: una conversione che non divide per la scala sceglie male (a ogni scala diversa da 1).
  const senzaScala = scelteSbagliate((s, o) => ({ x: s.x - o.x, y: s.y - o.y }));
  console.log(`scelta del bersaglio, controllo positivo (conversione senza la scala): difetti ${senzaScala.difetti.length}`);
  expect(senzaScala.difetti.length).toBeGreaterThan(0);
  expect(senzaScala.difetti[0]).toMatch(/ → /);
}, 60_000);

test("i «+» spenti per un blocco, o per un tratto di blocchi vicini, sono esattamente quelli su cui il nucleo lo rifiuta o non cambia nulla", () => {
  const { difetti, premesse } = giudiziSbagliati(escluso, 4);
  console.log(`«+» spenti: coppie tratto e «+» ${premesse.coppie} (tratti di più blocchi ${premesse.tratti}), spenti ${premesse.esclusi}, rifiutati dal nucleo ${premesse.rifiutati}, difetti ${difetti.length}`);
  expect(difetti.slice(0, 10)).toEqual([]);
  expect(premesse.rifiutati).toBeGreaterThan(0);
  expect(premesse.esclusi).toBeGreaterThan(premesse.rifiutati);
  expect(premesse.tratti).toBeGreaterThan(500);

  // Controlli positivi: un giudizio che accetta i «+» del sottoalbero (solo i due accanto spenti), e uno che di un tratto
  // spegne solo i «+» accanto al primo blocco.
  const senzaSottoalbero: Giudizio = (p, t) => {
    const [vero, dentro] = [escluso(p, t), sottoalberoDelTratto(p, t)];
    return (posto) => vero(posto) && !dentro.has(posto.contenitore);
  };
  const rotto = giudiziSbagliati(senzaSottoalbero, 4);
  console.log(`«+» spenti, controllo positivo (sottoalbero accettato): difetti ${rotto.difetti.length}`);
  expect(rotto.difetti.some((d) => d.includes("dentro_se_stesso"))).toBe(true);
  const soloIlPrimo = giudiziSbagliati((p, t) => escluso(p, { ...t, a: t.da }), 4);
  console.log(`«+» spenti, controllo positivo (del tratto solo il primo blocco): difetti ${soloIlPrimo.difetti.length}`);
  expect(soloIlPrimo.difetti.some((d) => d.includes("escluso false, sposta senza effetto"))).toBe(true);
}, 60_000);

/** Una forma per `id`, fase e genere: un ciclo ne ha più d'una col suo `id`. */
const chiaveDellaForma = (e: Elemento) => `${e.id}/${e.fase ?? ""}/${e.forma}`;

/** Gli `id` dei blocchi che stanno dentro un `per ogni`. */
function dentroUnPerOgni(p: Progetto): Set<string> {
  const dentro = new Set<string>();
  const visita = (s: readonly Blocco[], sotto: boolean): void =>
    s.forEach((b) => {
      if (sotto) dentro.add(b.id);
      const figli = b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? (b.body as Blocco[]) : [];
      visita(figli, sotto || b.kind === "for_each");
    });
  visita(p.functions[0]!.body, false);
  return dentro;
}

/** Le forme della copia di ogni blocco (al più `perAlbero` per albero), portate con lo scarto, contro quelle vere. */
function copieSbagliate(scarto: (c: Copia) => Coordinate, perAlbero: number): { difetti: string[]; premesse: { copie: number; cicli: number; salti: number; forme: number; linee: number; dichiarate: number } } {
  const difetti: string[] = [];
  const premesse = { copie: 0, cicli: 0, salti: 0, forme: 0, linee: 0, dichiarate: 0 };
  for (const a of alberi) {
    const f = a.progetto.functions[0]!;
    const blocchi = blocchiDi(a.progetto);
    const scelti = blocchi.length <= perAlbero ? blocchi : Array.from({ length: perAlbero }, (_, i) => blocchi[Math.floor((i * blocchi.length) / perAlbero)]!);
    const sottoUnPerOgni = dentroUnPerOgni(a.progetto);
    for (const b of scelti) {
      // Limite dichiarato: la copia è impaginata da sola, quindi un `per ogni` che nel disegno sta dentro un altro vi
      // scrive la posizione del primo livello (`_indice` invece di `_indice2`), e le forme hanno un'altra larghezza.
      if (a.opzioni.perOgni === "posizione" && sottoUnPerOgni.has(b.id) && blocchiDi({ ...a.progetto, functions: [{ ...f, body: [b] }] }).some((x) => x.kind === "for_each")) {
        premesse.dichiarate++;
        continue;
      }
      const c = copiaDelBlocco(impagina(soloIlBlocco(f, b), tema, misura, testi, a.opzioni, [], a.progetto.functions), b.id, a.disegno);
      if (c === null) {
        difetti.push(`${a.nome}: ${b.id} senza copia`);
        continue;
      }
      premesse.copie++;
      premesse.linee += c.disegno.connettori.length;
      const { x: dx, y: dy } = scarto(c);
      const dentro = sottoalbero(a.progetto, b.id);
      const attesi = a.disegno.elementi.filter((e) => e.dato === undefined && dentro.has(e.id)).map(chiaveDellaForma).sort();
      const visti = c.disegno.elementi.map(chiaveDellaForma).sort();
      if (JSON.stringify(visti) !== JSON.stringify(attesi)) difetti.push(`${a.nome}: ${b.id} copia con ${visti.join(",")} invece di ${attesi.join(",")}`);
      if (b.kind === "for" || b.kind === "for_each") premesse.cicli++;
      if (b.kind === "call") premesse.salti++;
      for (const e of c.disegno.elementi) {
        premesse.forme++;
        const vera = a.disegno.elementi.find((x) => chiaveDellaForma(x) === chiaveDellaForma(e));
        const lontano = !vera || e.vertici.length !== vera.vertici.length || e.vertici.some((v, i) => Math.abs(v.x + dx - vera.vertici[i]!.x) > 0.01 || Math.abs(v.y + dy - vera.vertici[i]!.y) > 0.01);
        if (lontano) difetti.push(`${a.nome}: ${b.id}, la forma di ${e.id} nella copia non sta su quella vera`);
      }
    }
  }
  return { difetti, premesse };
}

test("la copia che segue il puntatore porta il blocco con tutto il suo contenuto, forma per forma sopra quella vera", () => {
  const { difetti, premesse } = copieSbagliate((c) => ({ x: c.dx, y: c.dy }), 4);
  console.log(
    `copia del blocco: copie ${premesse.copie} (di un ciclo ${premesse.cicli}, di un salto ${premesse.salti}), forme ${premesse.forme}, linee ${premesse.linee}, difetti ${difetti.length}; non confrontate per il limite dichiarato (un «per ogni» dentro un altro) ${premesse.dichiarate}`,
  );
  expect(difetti.slice(0, 10)).toEqual([]);
  expect(premesse.forme).toBeGreaterThan(premesse.copie);
  expect(premesse.linee).toBeGreaterThan(0);
  expect(premesse.cicli).toBeGreaterThan(100);
  expect(premesse.salti).toBeGreaterThan(0);

  // Controllo positivo: senza lo scarto le forme non stanno su quelle vere.
  const senzaScarto = copieSbagliate(() => ({ x: 0, y: 0 }), 4);
  console.log(`copia del blocco, controllo positivo (senza lo scarto): difetti ${senzaScarto.difetti.length}`);
  expect(senzaScarto.difetti.some((d) => d.includes("non sta su quella vera"))).toBe(true);
}, 60_000);

/** Le copie dei tratti di due o tre blocchi vicini (al più `perAlbero` per albero), portate con lo scarto: le forme di ogni
 * blocco e del suo contenuto sopra quelle vere, e il riquadro della scelta, portato con `scarto`, che le contiene tutte. */
function trattiSbagliati(scarto: (c: Copia) => Coordinate, perAlbero: number): { difetti: string[]; premesse: { tratti: number; forme: number; cicli: number; dichiarati: number } } {
  const difetti: string[] = [];
  const premesse = { tratti: 0, forme: 0, cicli: 0, dichiarati: 0 };
  for (const a of alberi) {
    const f = a.progetto.functions[0]!;
    const sottoUnPerOgni = dentroUnPerOgni(a.progetto);
    const conUnVicino = blocchiDi(a.progetto).filter((b) => {
      const da = dove(a.progetto, b.id)!;
      return blocchiDelTratto(a.progetto, { contenitore: da.contenitore, ramo: da.ramo, da: da.indice, a: da.indice + 1 }).length === 2;
    });
    const scelti = conUnVicino.length <= perAlbero ? conUnVicino : Array.from({ length: perAlbero }, (_, i) => conUnVicino[Math.floor((i * conUnVicino.length) / perAlbero)]!);
    for (const b of scelti) {
      const da = dove(a.progetto, b.id)!;
      const lungo = { contenitore: da.contenitore, ramo: da.ramo, da: da.indice, a: da.indice + 2 };
      const t = blocchiDelTratto(a.progetto, lungo).length === 3 ? lungo : { ...lungo, a: da.indice + 1 };
      const blocchi = blocchiDelTratto(a.progetto, t);
      const dentro = sottoalberoDelTratto(a.progetto, t);
      // Il limite dichiarato della copia di un blocco solo (un «per ogni» dentro un altro, impaginato da solo).
      if (a.opzioni.perOgni === "posizione" && blocchiDi({ ...a.progetto, functions: [{ ...f, body: [...blocchi] }] }).some((x) => x.kind === "for_each" && sottoUnPerOgni.has(x.id))) {
        premesse.dichiarati++;
        continue;
      }
      const c = copiaDelBlocco(impagina(soloIlBlocco(f, blocchi), tema, misura, testi, a.opzioni, [], a.progetto.functions), b.id, a.disegno);
      const nome = `${a.nome}: ${t.contenitore}/${t.ramo}/${t.da}…${t.a}`;
      if (c === null) {
        difetti.push(`${nome} senza copia`);
        continue;
      }
      premesse.tratti++;
      if (blocchi.some((x) => x.kind === "while" || x.kind === "repeat" || x.kind === "for" || x.kind === "for_each")) premesse.cicli++;
      const attesi = a.disegno.elementi.filter((e) => e.dato === undefined && dentro.has(e.id)).map(chiaveDellaForma).sort();
      const visti = c.disegno.elementi.map(chiaveDellaForma).sort();
      if (JSON.stringify(visti) !== JSON.stringify(attesi)) difetti.push(`${nome} copia con ${visti.join(",")} invece di ${attesi.join(",")}`);
      const { x: dx, y: dy } = scarto(c);
      for (const e of c.disegno.elementi) {
        premesse.forme++;
        const vera = a.disegno.elementi.find((x) => chiaveDellaForma(x) === chiaveDellaForma(e));
        if (!vera || e.vertici.some((v, i) => Math.abs(v.x + dx - vera.vertici[i]!.x) > 0.01 || Math.abs(v.y + dy - vera.vertici[i]!.y) > 0.01)) difetti.push(`${nome}, la forma di ${e.id} nella copia non sta su quella vera`);
      }
      const r = riquadroDellaCopia({ ...c, dx, dy });
      const fuori = (q: { x: number; y: number; larghezza: number; altezza: number }) =>
        r === null || q.x < r.x + MARGINE_DELLA_SCELTA - 0.01 || q.y < r.y + MARGINE_DELLA_SCELTA - 0.01 || q.x + q.larghezza > r.x + r.larghezza - MARGINE_DELLA_SCELTA + 0.01 || q.y + q.altezza > r.y + r.altezza - MARGINE_DELLA_SCELTA + 0.01;
      for (const e of a.disegno.elementi.filter((x) => x.dato === undefined && dentro.has(x.id))) if (fuori(e.riquadro)) difetti.push(`${nome}, la forma di ${e.id} esce dal riquadro della scelta`);
      for (const q of a.disegno.riquadri.filter((x) => dentro.has(x.blocco))) if (fuori(q.bordo)) difetti.push(`${nome}, il riquadro del ciclo ${q.blocco} esce dal riquadro della scelta`);
    }
  }
  return { difetti, premesse };
}

test("la copia di più blocchi vicini porta tutti i blocchi col loro contenuto, forma per forma sopra quella vera, e il riquadro della scelta li contiene", () => {
  const { difetti, premesse } = trattiSbagliati((c) => ({ x: c.dx, y: c.dy }), 4);
  console.log(
    `copia di un tratto: tratti ${premesse.tratti} (con un ciclo ${premesse.cicli}), forme ${premesse.forme}, difetti ${difetti.length}; non confrontati per il limite dichiarato ${premesse.dichiarati}`,
  );
  expect(difetti.slice(0, 10)).toEqual([]);
  expect(premesse.tratti).toBeGreaterThan(1000);
  expect(premesse.cicli).toBeGreaterThan(100);
  expect(premesse.forme).toBeGreaterThan(premesse.tratti * 2);

  // Controllo positivo: senza lo scarto né le forme né il riquadro stanno sul disegno vero.
  const senzaScarto = trattiSbagliati(() => ({ x: 0, y: 0 }), 4);
  console.log(`copia di un tratto, controllo positivo (senza lo scarto): difetti ${senzaScarto.difetti.length}`);
  expect(senzaScarto.difetti.some((d) => d.includes("non sta su quella vera"))).toBe(true);
  expect(senzaScarto.difetti.some((d) => d.includes("esce dal riquadro della scelta"))).toBe(true);
}, 60_000);
