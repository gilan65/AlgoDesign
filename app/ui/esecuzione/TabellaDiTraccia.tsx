// La tabella di traccia nella colonna dell'esecuzione: le righe le dà il nucleo (`TabellaMostrata`, coi testi
// delle celle già scritti, gli stessi del CSV): qui non si ricalcola nulla. La riga corrente è l'ultima, quella coi
// valori di adesso (in pausa su un'azione, i valori dopo quella di prima), evidenziata e detta agli ausili
// (`aria-current`); resta in vista, senza scorrimento animato. Le celle cambiate con l'azione sono segnate, quelle
// senza valore dicono «non inizializzata». Oltre 1000 righe restano la riga 0 e le ultime 1000, e una riga sopra
// la tabella dice quante non ci sono più. Un vettore ha la forma scelta nelle Impostazioni (le colonne dei primi
// dieci e una per gli altri, o in fila in una colonna sola): le celle le scrive il nucleo, e una riga sopra la tabella,
// scritta anche lei dal nucleo, dice che cosa si vede e che cosa ha il CSV. In fila la cella si taglia (ne disegna i
// primi `CARATTERI_IN_FILA`, più di quanti ne mostra la colonna più larga) e il testo intero sta nel suo `title` (il suggerimento del sistema ne mostra l'inizio: misurato, in Chromium i primi 146
// elementi di 1000); l'elemento cambiato è segnato lui, non la cella. Scorrendo di lato restano
// ferme l'intestazione, il numero e la regola (o solo il numero: scelta delle Impostazioni), e coprono ciò che
// scorre sotto.
//
// Con procedure e funzioni l'intestazione ha una riga in più coi gruppi: il programma principale (o la funzione eseguita
// da sola), poi la condizione e lo scritto fuori dai gruppi, poi un gruppo per funzione; il clic sul nome di un gruppo lo
// chiude in una colonna sola («⋯» dove la funzione è attiva, segnata dove un suo dato cambia) e lo riapre, e la scelta
// resta per le esecuzioni dopo. Ogni riga ha lo sfondo del suo livello di chiamata (quattro tinte del tema che si
// ripetono; il livello 0 ha quello della tabella), sotto la cella cambiata e la riga corrente, che restano come sono. La
// ripresa dell'azione di chi chiama, dopo il ritorno da una funzione chiamata nella sua espressione, ripete il numero
// dell'azione: le righe si riconoscono dalla loro chiave.
//
// Le colonne le dispone l'utente (`colonne.ts`): ognuna si allarga e si stringe trascinando il bordo destro della sua
// intestazione, e tranne il numero e la regola si spostano trascinando l'intestazione (le colonne di un vettore
// insieme); dalla tastiera, il menu della colonna (Invio, il tasto Menu o Maiusc+F10 sull'intestazione col fuoco, le
// frecce per passare da una all'altra; il tasto destro col puntatore). Una larghezza scelta sta in una variabile CSS del
// contenitore, letta dalle celle della sua colonna: cambiandola le righe non si ridisegnano. Mentre si trascina, il posto
// si calcola dai bordi delle intestazioni misurati alla presa e dallo scorrimento, mai dal documento a ogni movimento.
//
// Le righe già mostrate non si ridisegnano: il nucleo dà per ognuna sempre lo stesso oggetto, e una riga cambia
// solo quando smette (o comincia) di essere la corrente. Durante «tutto insieme» la tabella resta ferma e si
// aggiorna alla fermata: ridisegnarla a ogni fetta rendeva la corsa 7-10 volte più lenta (misurato). Quante volte si è
// disegnata lo dice `data-ridisegni`, che le prove nei motori contano: un tempo dipende dalla macchina, un conto no.
// Oltre 200 righe si disegnano solo quelle in vista, più un margine sopra e sotto, e al posto delle altre una riga
// vuota alta quanto loro: mille righe disegnate in un colpo alla fine di «tutto insieme» fermavano la finestra più di un secondo
// (misurato: 1,1 s con un vettore in fila, 1,9 s con un vettore di stringhe lunghe in WebKit). Senza un motore che
// disegna (nessuna altezza) le righe si disegnano tutte.
import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type SetStateAction,
} from "react";
import type { RigaMostrata, TabellaMostrata, TestiDellaTraccia, Traccia } from "../../core/esecuzione/traccia";
import type { Dizionario } from "../../i18n/it";
import { dizionari, riempi, type Lingua } from "../../i18n/lingue";
import { MenuNelPunto } from "../dati/MenuDellaRiga";
import { testiDelDisegno } from "../disegno/testi";
import type { ColonneFerme } from "../preferenze";
import {
  colonneMostrate,
  CONDIZIONE,
  conIlGruppoIn,
  conLaRegione,
  gruppiDellaRegione,
  limitata,
  PASSO_DELLA_LARGHEZZA,
  postoDelPuntatore,
  RADICE,
  REGOLA,
  SCRIVE,
  spostato,
  stessoOrdine,
  LARGHEZZA_MASSIMA,
  LARGHEZZA_MINIMA,
  type ColonnaMostrata,
  type Disposizione,
} from "./colonne";
import stili from "./TabellaDiTraccia.module.css";

/** Le parole della tabella e del suo CSV nella lingua dell'interfaccia; la regola si scrive come nel disegno. */
export function testiDellaTraccia(lingua: Lingua): TestiDellaTraccia {
  const d = dizionari[lingua];
  return {
    ...testiDelDisegno(lingua),
    numero: d.tracciaNumero,
    livello: d.tracciaLivello,
    regola: d.tracciaRegola,
    restituisce: d.tracciaRestituisce,
    ripresa: d.tracciaRipresa,
    restituito: d.tracciaRestituito,
    condizione: d.tracciaCondizione,
    scrive: d.tracciaScrive,
    nonInizializzata: d.tracciaNonInizializzata,
    letto: d.tracciaLetto,
    tipi: { integer: d.tipoIntero, real: d.tipoReale, character: d.tipoCarattere, string: d.tipoStringa, boolean: d.tipoBooleano },
    spiegazione: {
      primiEAltri: (nome, n, primi, colonna) => riempi(d.tracciaVettorePrimiEAltri, { nome, n: n.toLocaleString(lingua), primi: String(primi), colonna }),
      inFila: (nome, n) => riempi(n === 1 ? d.tracciaVettoreInFilaUno : d.tracciaVettoreInFila, { nome, n: n.toLocaleString(lingua) }),
      perRiga: (nome, righe, colonne) => riempi(d.tracciaMatricePerRiga, { nome, righe: righe.toLocaleString(lingua), colonne: colonne.toLocaleString(lingua) }),
      primeEAltre: (nome, righe, colonne, prime, colonna) =>
        riempi(d.tracciaMatricePrimeEAltre, { nome, righe: righe.toLocaleString(lingua), colonne: colonne.toLocaleString(lingua), prime: String(prime), colonna }),
      matriceInFila: (nome, righe, colonne) => riempi(d.tracciaMatriceInFila, { nome, righe: righe.toLocaleString(lingua), colonne: colonne.toLocaleString(lingua) }),
      perRecord: (nome, record) => riempi(d.tracciaTabellaPerRecord, { nome, record: record.toLocaleString(lingua) }),
      primiRecordEAltri: (nome, record, primi, colonna) => riempi(d.tracciaTabellaPrimiRecordEAltri, { nome, record: record.toLocaleString(lingua), primi: String(primi), colonna }),
      perCampo: (nome, record) => riempi(d.tracciaTabellaPerCampo, { nome, record: record.toLocaleString(lingua) }),
      tabellaPrimiEAltri: (nome, record, valori, primi, colonna) =>
        riempi(d.tracciaTabellaPrimiEAltri, { nome, record: record.toLocaleString(lingua), valori: valori.toLocaleString(lingua), primi: String(primi), colonna }),
      csvUguale: d.tracciaCsvUguale,
      csvPerElemento: d.tracciaCsvPerElemento,
    },
  };
}

/** Oltre queste righe la tabella disegna solo quelle in vista. */
const RIGHE_TUTTE = 200;
/** Le righe disegnate oltre quelle in vista, sopra e sotto. */
const MARGINE = 20;
/** L'altezza di una riga prima della prima misura, in px. */
const ALTEZZA_STIMATA = 20;
/** I caratteri di un vettore in fila che la cella disegna: più di quanti ne mostra la colonna più larga
 * (`LARGHEZZA_MASSIMA`, 640 px, circa 130 caratteri), quindi la cella appare uguale a ogni larghezza; il resto lo taglia
 * comunque il CSS, e il testo intero sta nel `title`. Disegnati tutti (8534 caratteri per un vettore di 1000 interi, in
 * ogni riga in vista) fermavano la finestra di WebKitGTK per 1161 ms alla fine della corsa (misurato sulla macchina
 * Linux della CI, senza scheda grafica). */
const CARATTERI_IN_FILA = 200;

/** I pezzi di una cella in fila fino a `CARATTERI_IN_FILA` caratteri, l'ultimo tagliato se serve; un elemento cambiato
 * oltre quel punto non si disegna (la cella non lo mostrerebbe). Si contano i punti di codice: il taglio non spezza un
 * carattere. */
export function pezziDisegnati<P extends { readonly testo: string }>(pezzi: readonly P[]): P[] {
  const disegnati: P[] = [];
  let resto = CARATTERI_IN_FILA;
  for (const p of pezzi) {
    if (resto <= 0) break;
    const caratteri = [...p.testo];
    disegnati.push(caratteri.length <= resto ? p : { ...p, testo: caratteri.slice(0, resto).join("") });
    resto -= caratteri.length;
  }
  return disegnati;
}
/** Di quanto si muove il puntatore prima che la pressione su un'intestazione diventi un trascinamento, in px. */
const SOGLIA_DEL_TRASCINAMENTO = 5;
/** Vicino al bordo dello scorrimento, durante un trascinamento la tabella scorre di tanto a ogni movimento, in px. */
const BORDO_CHE_SCORRE = 24;
const PASSO_DELLO_SCORRIMENTO = 16;

/** La variabile CSS della larghezza di una colonna: la regola, o la cella `n` della riga del nucleo. */
const variabile = (cella: number | "regola") => `--larghezza-${cella}`;

/** La larghezza di una colonna: quella scelta, se c'è, altrimenti quella del contenuto (la regola, al più 13rem). Una
 * cella in fila ha il suo tetto (`--fila`), che la larghezza scelta sostituisce. */
const stileDella = (cella: number | "regola"): CSSProperties => {
  const v = variabile(cella);
  return {
    width: `var(${v}, auto)`,
    minWidth: `var(${v}, 0px)`,
    maxWidth: `var(${v}, ${cella === "regola" ? "13rem" : "none"})`,
    ...(cella === "regola" ? {} : ({ "--fila": `var(${v}, 26ch)` } as CSSProperties)),
  };
};
const stileDellaRegola = stileDella("regola");

/** Una colonna dopo la regola come la disegnano le righe: la cella della riga del nucleo e lo stile della larghezza; o un
 * gruppo chiuso, in una colonna sola: le sue celle e, se la sua funzione è fra quelle che si possono chiamare, il suo posto
 * fra le attive della riga (la radice è sempre attiva). */
type CellaMostrata =
  | { readonly cella: number; readonly stile: CSSProperties }
  | { readonly chiuso: string; readonly celle: readonly number[]; readonly attiva?: number };

/** Gli sfondi dei livelli di chiamata, che si ripetono: il livello 0 ha lo sfondo della tabella. */
export const SFONDI_DEI_LIVELLI = 4;
export const sfondoDelLivello = (livello: number): number | undefined => (livello === 0 ? undefined : ((livello - 1) % SFONDI_DEI_LIVELLI) + 1);

const Riga = memo(function Riga({
  riga,
  corrente,
  indice,
  celle,
}: {
  riga: RigaMostrata;
  corrente: boolean;
  /** La posizione della riga per gli ausili, quando non si disegnano tutte. */
  indice?: number;
  /** Le colonne dopo la regola, nell'ordine mostrato. */
  celle: readonly CellaMostrata[];
}): ReactElement {
  const n = riga.valori.length;
  return (
    <tr
      data-riga={riga.numero}
      data-livello={riga.livello}
      data-sfondo={sfondoDelLivello(riga.livello)}
      data-ripresa={riga.ripresa ? "" : undefined}
      aria-current={corrente ? "true" : undefined}
      aria-rowindex={indice}
      className={corrente ? stili.corrente : undefined}
    >
      <td className={stili.numero}>{riga.numero}</td>
      <td className={stili.regola} style={stileDellaRegola} title={riga.regola}>
        {riga.regola}
      </td>
      {celle.map((m) => {
        if ("chiuso" in m) {
          // Un gruppo chiuso: «⋯» se la sua funzione è attiva, segnato se un suo valore è cambiato con l'azione.
          const attiva = m.attiva === undefined || riga.attive[m.attiva] === true;
          return (
            <td key={`#chiuso ${m.chiuso}`} className={stili.chiuso} data-chiuso={m.chiuso} data-cambiata={m.celle.some((i) => riga.valori[i]!.cambiata) ? "" : undefined}>
              {attiva ? "⋯" : ""}
            </td>
          );
        }
        const { cella: i, stile } = m;
        if (i === n)
          return (
            <td key={i} className={stili.condizione} style={stile}>
              {riga.condizione}
            </td>
          );
        if (i === n + 1)
          return (
            <td key={i} className={stili.scrive} style={stile}>
              {riga.scrive}
            </td>
          );
        const c = riga.valori[i]!;
        return c.pezzi ? (
          <td
            key={i}
            className={c.nonInizializzata ? `${stili.inFila} ${stili.vuota}` : stili.inFila}
            style={stile}
            title={c.testo}
            data-cambiata={c.cambiata ? "" : undefined}
            data-non-inizializzata={c.nonInizializzata ? "" : undefined}
          >
            <div className={stili.fila}>
              {pezziDisegnati(c.pezzi).map((p, k) =>
                p.cambiato ? (
                  <mark key={k} className={stili.cambiato} data-cambiato="">
                    {p.testo}
                  </mark>
                ) : (
                  p.testo
                ),
              )}
            </div>
          </td>
        ) : (
          <td
            key={i}
            className={c.nonInizializzata ? `${stili.valore} ${stili.vuota}` : stili.valore}
            style={stile}
            data-cambiata={c.cambiata ? "" : undefined}
            data-non-inizializzata={c.nonInizializzata ? "" : undefined}
          >
            {c.testo}
          </td>
        );
      })}
    </tr>
  );
});

/** Al posto delle righe non disegnate: una riga vuota alta quanto loro, che tiene la barra di scorrimento giusta. */
function RigaVuota({ altezza, colonne }: { altezza: number; colonne: number }): ReactElement {
  return (
    <tr aria-hidden="true" className={stili.saltate} style={{ height: altezza }}>
      <td colSpan={colonne} />
    </tr>
  );
}

/** Il trascinamento di un'intestazione, dalla presa: il gruppo, dove è cominciato, e i bordi degli ALTRI gruppi nel
 * sistema della tabella (dal suo bordo sinistro), misurati alla presa col loro scorrimento. */
interface Presa {
  readonly gruppo: string;
  /** I gruppi della sua regione alla presa, e quelli che si vedono (in una regione con un gruppo chiuso, non tutti). */
  readonly regione: readonly string[];
  readonly visibili: readonly string[];
  readonly x: number;
  readonly sinistraDellaTabella: number;
  readonly scorrimento: number;
  /** Dove finiscono le colonne ferme, sullo schermo: lì comincia il bordo che scorre a sinistra. */
  readonly fineDelleFerme: number;
  readonly altri: readonly { readonly gruppo: string; readonly sinistra: number; readonly destra: number }[];
  mosso: boolean;
  /** L'ordine della regione col gruppo nel posto dell'ultimo movimento: il rilascio lo legge qui, perché può arrivare
   * prima che la tabella si ridisegni col segno del posto. */
  ordine: readonly string[] | null;
}

/** L'ordine di una regione coi gruppi visibili nel nuovo ordine: quelli nascosti in un gruppo chiuso restano al loro posto. */
const conIVisibili = (regione: readonly string[], visibili: readonly string[], nuovo: readonly string[]): string[] => {
  let k = 0;
  return regione.map((g) => (visibili.includes(g) ? nuovo[k++]! : g));
};

/** Il gruppo che si chiude di una colonna: la radice, una funzione (il suo nome), o nessuno (la condizione e lo scritto, e
 * ogni colonna di una tabella senza procedure né funzioni). */
const bloccoDi = (m: ColonnaMostrata, conGruppi: boolean): string | undefined =>
  !conGruppi ? undefined : (m.funzione ?? (m.gruppo === CONDIZIONE || m.gruppo === SCRIVE ? undefined : RADICE));

/** Ciò che si mostra dopo la regola: una colonna, o un gruppo chiuso in una colonna sola. */
type Voce = { readonly genere: "colonna"; readonly m: ColonnaMostrata } | { readonly genere: "chiuso"; readonly blocco: string; readonly celle: number[] };

export const TabellaDiTraccia = memo(function TabellaDiTraccia({
  tabella,
  traccia,
  versione,
  visibile,
  spiegazione,
  testi,
  lingua,
  ferme,
  disposizione,
  disponi,
}: {
  tabella: TabellaMostrata;
  traccia: Traccia;
  /** Cambia quando cambia la tabella (l'oggetto della traccia resta lo stesso): le azioni cominciate più le righe
   * chiuse, perché alla prima azione compare la riga 0 e alla fine si chiude l'ultima. Durante «tutto insieme» chi
   * chiama passa il valore dell'ultima fermata: la tabella non si ridisegna a ogni fetta. */
  versione: number;
  /** Se la tabella si vede (l'interruttore «Tabella»): nascosta non ha misure, e riaperta si rimisura. */
  visibile: boolean;
  /** La riga che dice che cosa si vede dei vettori e che cosa ha il CSV (del nucleo); nessuna se ogni elemento ha la
   * sua colonna. */
  spiegazione: string | undefined;
  testi: Dizionario;
  lingua: Lingua;
  /** Le colonne che restano ferme scorrendo di lato (scelta delle Impostazioni). */
  ferme: ColonneFerme;
  /** Come l'utente ha disposto le colonne, e come cambiarlo. */
  disposizione: Disposizione;
  disponi: Dispatch<SetStateAction<Disposizione>>;
}): ReactElement {
  const ridisegni = useRef(0);
  ridisegni.current += 1;
  const righe = tabella.righe(traccia);
  // La riga corrente è l'ultima: per la chiave, unica (una ripresa ripete il numero dell'azione).
  const ultima = righe.at(-1)?.chiave;
  const contenitore = useRef<HTMLDivElement>(null);
  // Le misure per disegnare solo le righe in vista: l'altezza di una riga e dell'intestazione, dove si è scorsi e
  // quanto si vede, e se si segue il fondo (`null` prima della prima misura: si segue il fondo).
  const altezzaDellaRiga = useRef(ALTEZZA_STIMATA);
  const altezzaDellIntestazione = useRef(0);
  const [vista, setVista] = useState<{ sopra: number; altezza: number; inFondo: boolean } | null>(null);
  const [senzaDisegno, setSenzaDisegno] = useState(false);
  const inParte = righe.length > RIGHE_TUTTE && !senzaDisegno;
  const prossimoGiro = useRef(0);
  const misuraLaVista = () => {
    const c = contenitore.current;
    if (!c) return;
    const inFondo = c.scrollTop + c.clientHeight >= c.scrollHeight - 2;
    setVista((v) => (v?.sopra === c.scrollTop && v.altezza === c.clientHeight && v.inFondo === inFondo ? v : { sopra: c.scrollTop, altezza: c.clientHeight, inFondo }));
  };
  // La larghezza della colonna dei numeri, dove comincia la regola quando resta ferma anche lei: cresce con le cifre
  // delle righe disegnate, quindi si rimisura dopo ogni disegno (anche scorrendo, quando se ne disegnano solo alcune).
  // Con i gruppi, anche l'altezza della loro riga: la riga dei nomi delle colonne resta ferma sotto di lei.
  useLayoutEffect(() => {
    const c = contenitore.current;
    if (!c || !visibile) return;
    const numero = c.querySelector("th")?.getBoundingClientRect().width;
    const scritto = `${numero}px`;
    if (numero !== undefined && c.style.getPropertyValue("--larghezza-del-numero") !== scritto) c.style.setProperty("--larghezza-del-numero", scritto);
    const gruppi = c.querySelector<HTMLElement>("thead tr[data-gruppi]")?.getBoundingClientRect().height;
    const alta = `${gruppi ?? 0}px`;
    if (c.style.getPropertyValue("--altezza-dei-gruppi") !== alta) c.style.setProperty("--altezza-dei-gruppi", alta);
  });
  // La riga corrente in vista, senza animazione. Da nascosta nulla si misura (tutto varrebbe zero): quando si
  // riapre, la misura si rifà. La corrente è l'ultima: con le righe in parte, a ogni azione si torna a seguire il fondo.
  useLayoutEffect(() => {
    const c = contenitore.current;
    if (!c || !visibile) return;
    if (!inParte) {
      c.querySelector('tr[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
      return;
    }
    if (c.clientHeight === 0) {
      setSenzaDisegno(true);
      return;
    }
    const riga = c.querySelector<HTMLTableRowElement>("tbody tr[data-riga]:not([aria-current])");
    if (riga && riga.offsetHeight > 0) altezzaDellaRiga.current = riga.offsetHeight;
    altezzaDellIntestazione.current = c.querySelector("thead")?.offsetHeight ?? 0;
    c.scrollTop = c.scrollHeight;
    setVista({ sopra: c.scrollTop, altezza: c.clientHeight, inFondo: true });
  }, [ultima, versione, visibile, inParte]);
  // Seguendo il fondo, dopo ogni disegno si resta in fondo: l'altezza stimata delle righe non disegnate non conta i
  // bordi della tabella, e il fondo vero è un po' più giù (misurato: 14 px).
  const seguiIlFondo = inParte && visibile && (vista === null || vista.inFondo);
  useLayoutEffect(() => {
    const c = contenitore.current;
    if (seguiIlFondo && c && c.scrollTop + c.clientHeight < c.scrollHeight - 1) c.scrollTop = c.scrollHeight;
  });
  // Le righe da disegnare, `da` compresa e `a` esclusa: seguendo il fondo le ultime, altrimenti quelle in vista.
  const h = altezzaDellaRiga.current;
  const quante = Math.ceil((vista?.altezza ?? 0) / h) + 2 * MARGINE;
  const [da, a] =
    vista === null || vista.inFondo
      ? [Math.max(0, righe.length - quante), righe.length]
      : [
          Math.max(0, Math.floor((vista.sopra - altezzaDellIntestazione.current) / h) - MARGINE),
          Math.min(righe.length, Math.ceil((vista.sopra + vista.altezza - altezzaDellIntestazione.current) / h) + MARGINE),
        ];

  // ------------------------------------------------------------------ le colonne come le dispone l'utente

  const mostrate = useMemo(() => colonneMostrate(tabella.colonne, disposizione.ordine), [tabella, disposizione.ordine]);
  // Con procedure e funzioni le colonne stanno nei gruppi della radice e delle funzioni, che si chiudono: un gruppo chiuso
  // è una colonna sola. La condizione e lo scritto non sono in un gruppo.
  const conGruppi = tabella.conChiamate;
  const voci = useMemo((): Voce[] => {
    const chiusi = new Set(conGruppi ? disposizione.chiusi : []);
    const v: Voce[] = [];
    for (const m of mostrate) {
      const b = bloccoDi(m, conGruppi);
      const prima = v.at(-1);
      if (b === undefined || !chiusi.has(b)) v.push({ genere: "colonna", m });
      else if (prima?.genere === "chiuso" && prima.blocco === b) prima.celle.push(m.cella);
      else v.push({ genere: "chiuso", blocco: b, celle: [m.cella] });
    }
    return v;
  }, [mostrate, conGruppi, disposizione.chiusi]);
  const celle = useMemo(
    (): CellaMostrata[] =>
      voci.map((v) => {
        if (v.genere === "colonna") return { cella: v.m.cella, stile: stileDella(v.m.cella) };
        const k = tabella.gruppi.findIndex((g, i) => i > 0 && g.nome === v.blocco);
        return { chiuso: v.blocco, celle: v.celle, ...(k > 0 ? { attiva: k - 1 } : {}) };
      }),
    [voci, tabella],
  );
  /** I gruppi della regione di `gruppo` e quelli che si vedono (non in un gruppo chiuso). */
  const regioneDi = (gruppo: string) => {
    const regione = gruppiDellaRegione(mostrate, gruppo);
    const visti = new Set(voci.flatMap((v) => (v.genere === "colonna" ? [v.m.gruppo] : [])));
    return { regione, visibili: regione.filter((g) => visti.has(g)) };
  };
  const apriOChiudi = (blocco: string) => disponi((d) => ({ ...d, chiusi: d.chiusi.includes(blocco) ? d.chiusi.filter((b) => b !== blocco) : [...d.chiusi, blocco] }));
  const nomeDelGruppo = (blocco: string) => (blocco === RADICE ? (tabella.gruppi[0]?.nome ?? testi.schedaPrincipale) : blocco);
  // Le larghezze scelte, come variabili del contenitore.
  const larghezze = useMemo(() => {
    const v: Record<string, string> = {};
    const scelta = (chiave: string) => disposizione.larghezze[chiave];
    if (scelta(REGOLA) !== undefined) v[variabile("regola")] = `${scelta(REGOLA)}px`;
    for (const m of mostrate) if (scelta(m.chiave) !== undefined) v[variabile(m.cella)] = `${scelta(m.chiave)}px`;
    return v as CSSProperties;
  }, [mostrate, disposizione.larghezze]);
  const nomeDella = (chiave: string): string => {
    if (chiave === REGOLA) return testi.tracciaRegola;
    const m = mostrate.find((x) => x.chiave === chiave)!;
    return m.cella < tabella.colonne.length ? tabella.colonne[m.cella]!.nome : m.cella === tabella.colonne.length ? testi.tracciaCondizione : testi.tracciaScrive;
  };
  const intestazione = (chiave: string) => contenitore.current?.querySelector<HTMLElement>(`th[data-colonna="${CSS.escape(chiave)}"]`) ?? null;
  // L'intestazione che il Tab raggiunge (una sola: le frecce passano alle altre), e quella che riprende il fuoco dopo
  // un'azione del menu, quando la colonna si è spostata.
  const [colConIlFuoco, setColConIlFuoco] = useState(REGOLA);
  const riprendi = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (riprendi.current === null) return;
    intestazione(riprendi.current)?.focus();
    riprendi.current = null;
  });
  const conIlFuoco = colConIlFuoco === REGOLA || mostrate.some((m) => m.chiave === colConIlFuoco) ? colConIlFuoco : REGOLA;

  const larghezzaDi = (chiave: string) => disposizione.larghezze[chiave] ?? intestazione(chiave)?.getBoundingClientRect().width ?? LARGHEZZA_MINIMA;
  const cambiaLarghezza = (chiave: string, w: number) => disponi((d) => (d.larghezze[chiave] === limitata(w) ? d : { ...d, larghezze: { ...d.larghezze, [chiave]: limitata(w) } }));
  /** Il gruppo nel posto che ha in `ordine`, l'ordine dei gruppi visibili della sua regione. */
  const spostaIl = (gruppo: string, ordine: readonly string[]) => {
    const { regione, visibili } = regioneDi(gruppo);
    const tutti = conLaRegione(mostrate, gruppo, conIVisibili(regione, visibili, ordine));
    disponi((d) => (stessoOrdine(d.ordine, tutti) ? d : { ...d, ordine: tutti }));
  };

  // Il menu della colonna: dove si apre e di quale colonna.
  const [menu, setMenu] = useState<{ chiave: string; gruppo: string; x: number; y: number } | null>(null);
  const apriIlMenu = (chiave: string, gruppo: string, x: number, y: number) => setMenu({ chiave, gruppo, x, y });
  const vociDelMenu = () => {
    if (!menu) return [];
    const { chiave, gruppo } = menu;
    // Solo fra i gruppi visibili della sua regione.
    const visibili: readonly string[] = chiave === REGOLA ? [] : regioneDi(gruppo).visibili;
    const i = visibili.indexOf(gruppo);
    const poi = (azione: () => void) => () => {
      setMenu(null);
      riprendi.current = chiave;
      azione();
    };
    const w = larghezzaDi(chiave);
    return [
      { chiave: "sinistra", testo: testi.colonnaSinistra, azione: i > 0 ? poi(() => spostaIl(gruppo, spostato(visibili, gruppo, -1))) : undefined },
      { chiave: "destra", testo: testi.colonnaDestra, azione: i >= 0 && i < visibili.length - 1 ? poi(() => spostaIl(gruppo, spostato(visibili, gruppo, 1))) : undefined },
      { chiave: "allarga", testo: testi.colonnaAllarga, azione: w < LARGHEZZA_MASSIMA ? poi(() => cambiaLarghezza(chiave, w + PASSO_DELLA_LARGHEZZA)) : undefined },
      { chiave: "stringi", testo: testi.colonnaStringi, azione: w > LARGHEZZA_MINIMA ? poi(() => cambiaLarghezza(chiave, w - PASSO_DELLA_LARGHEZZA)) : undefined },
    ];
  };

  // Il trascinamento di un'intestazione: il posto dove andrebbe il gruppo, segnato sull'intestazione che lo seguirebbe
  // (o, in fondo, sull'ultima).
  const presa = useRef<Presa | null>(null);
  const [mira, setMira] = useState<{ trascinato: string; ordine: readonly string[]; visibili: readonly string[] } | null>(null);
  function prendi(e: PointerEvent<HTMLElement>, gruppo: string): void {
    const c = contenitore.current;
    const t = c?.querySelector("table");
    if (e.button !== 0 || !c || !t) return;
    const sinistra = t.getBoundingClientRect().left;
    const bordi = new Map<string, { sinistra: number; destra: number }>();
    for (const th of c.querySelectorAll<HTMLElement>("th[data-gruppo]")) {
      const r = th.getBoundingClientRect();
      const g = th.dataset.gruppo!;
      const b = bordi.get(g);
      bordi.set(g, { sinistra: Math.min(b?.sinistra ?? Infinity, r.left - sinistra), destra: Math.max(b?.destra ?? -Infinity, r.right - sinistra) });
    }
    const fineDelleFerme = c.querySelector(ferme === "numero" ? "th" : `th[data-colonna="${REGOLA}"]`)?.getBoundingClientRect().right ?? c.getBoundingClientRect().left;
    // Solo fra i gruppi visibili della sua regione.
    const { regione, visibili } = regioneDi(gruppo);
    presa.current = {
      gruppo,
      regione,
      visibili,
      x: e.clientX,
      sinistraDellaTabella: sinistra,
      scorrimento: c.scrollLeft,
      fineDelleFerme,
      altri: visibili.filter((g) => g !== gruppo).map((g) => ({ gruppo: g, ...bordi.get(g)! })),
      mosso: false,
      ordine: null,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function trascina(e: PointerEvent<HTMLElement>): void {
    const p = presa.current;
    const c = contenitore.current;
    if (!p || !c) return;
    if (!p.mosso && Math.abs(e.clientX - p.x) < SOGLIA_DEL_TRASCINAMENTO) return;
    p.mosso = true;
    const r = c.getBoundingClientRect();
    if (e.clientX > r.right - BORDO_CHE_SCORRE) c.scrollLeft += PASSO_DELLO_SCORRIMENTO;
    else if (e.clientX < p.fineDelleFerme + BORDO_CHE_SCORRE) c.scrollLeft -= PASSO_DELLO_SCORRIMENTO;
    const x = e.clientX - (p.sinistraDellaTabella - (c.scrollLeft - p.scorrimento));
    const posto = postoDelPuntatore(
      p.altri.map((g) => (g.sinistra + g.destra) / 2),
      x,
    );
    const ordine = conIlGruppoIn(p.visibili, p.gruppo, posto);
    p.ordine = ordine;
    setMira((m) => (m?.trascinato === p.gruppo && stessoOrdine(m.ordine, ordine) ? m : { trascinato: p.gruppo, ordine, visibili: p.visibili }));
  }
  function lascia(annulla: boolean): void {
    const p = presa.current;
    presa.current = null;
    if (p?.mosso && p.ordine && !annulla) spostaIl(p.gruppo, p.ordine);
    setMira(null);
  }
  // Dove si segna il posto: sull'intestazione del gruppo che seguirebbe quello trascinato, o in fondo sull'ultima.
  const segno = (() => {
    if (!mira || stessoOrdine(mira.ordine, mira.visibili)) return null;
    const i = mira.ordine.indexOf(mira.trascinato);
    const dopo = mira.ordine[i + 1];
    return dopo !== undefined ? { gruppo: dopo, lato: "prima" as const } : { gruppo: mira.ordine[i - 1]!, lato: "dopo" as const };
  })();

  /** I tasti su un'intestazione: le frecce alla vicina, Invio, il tasto Menu o Maiusc+F10 aprono il menu, Esc lascia
   * un trascinamento. */
  function tasto(e: KeyboardEvent<HTMLElement>, chiave: string, gruppo: string): void {
    const tutte = [...(contenitore.current?.querySelectorAll<HTMLElement>("th[data-colonna]") ?? [])];
    const i = tutte.indexOf(e.currentTarget);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") tutte[i + (e.key === "ArrowLeft" ? -1 : 1)]?.focus();
    else if (e.key === "Enter" || e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      const r = e.currentTarget.getBoundingClientRect();
      apriIlMenu(chiave, gruppo, r.left, r.bottom);
    } else if (e.key === "Escape" && presa.current) lascia(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  /** La maniglia sul bordo destro di un'intestazione: trascinata, cambia la larghezza della colonna. */
  function maniglia(chiave: string): ReactElement {
    return (
      <span
        aria-hidden="true"
        className={stili.maniglia}
        data-maniglia={chiave}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          const da = e.clientX;
          const w = larghezzaDi(chiave);
          const m = e.currentTarget;
          m.setPointerCapture(e.pointerId);
          const muovi = (ev: globalThis.PointerEvent) => cambiaLarghezza(chiave, w + ev.clientX - da);
          const fine = () => {
            m.removeEventListener("pointermove", muovi);
            m.removeEventListener("pointerup", fine);
            m.removeEventListener("pointercancel", fine);
          };
          m.addEventListener("pointermove", muovi);
          m.addEventListener("pointerup", fine);
          m.addEventListener("pointercancel", fine);
        }}
      />
    );
  }

  /** Ciò che un'intestazione col menu ha in comune: il fuoco, i tasti, il tasto destro. */
  const comandi = (chiave: string, gruppo: string) => ({
    "data-colonna": chiave,
    tabIndex: chiave === conIlFuoco ? 0 : -1,
    "aria-haspopup": "menu" as const,
    onFocus: () => setColConIlFuoco(chiave),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => tasto(e, chiave, gruppo),
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      apriIlMenu(chiave, gruppo, e.clientX, e.clientY);
    },
  });

  // Il numero, la regola e le colonne dopo.
  const colonne = celle.length + 2;
  const intestazioneDellaRegola = (righe?: number) => (
    <th scope="col" rowSpan={righe} className={stili.regola} style={stileDellaRegola} {...comandi(REGOLA, REGOLA)}>
      {testi.tracciaRegola}
      {maniglia(REGOLA)}
    </th>
  );
  /** L'intestazione di una colonna: il nome e il tipo, o la condizione e lo scritto; si trascina, ha il menu e la maniglia. */
  const intestazioneDi = (m: ColonnaMostrata, righe?: number) => {
    const valore = m.cella < n ? tabella.colonne[m.cella]! : undefined;
    return (
      <th
        scope="col"
        key={m.chiave}
        rowSpan={righe}
        className={classeDell(m.cella, n)}
        style={stileDella(m.cella)}
        data-gruppo={m.gruppo}
        data-trascinata={mira?.trascinato === m.gruppo && segno !== null ? "" : undefined}
        data-mira={segno?.gruppo === m.gruppo && (segno.lato === "prima" ? mostrate.find((x) => x.gruppo === m.gruppo) === m : mostrate.findLast((x) => x.gruppo === m.gruppo) === m) ? segno.lato : undefined}
        {...comandi(m.chiave, m.gruppo)}
        onPointerDown={(e) => prendi(e, m.gruppo)}
        onPointerMove={trascina}
        onPointerUp={() => lascia(false)}
        onPointerCancel={() => lascia(true)}
      >
        {valore ? (
          <>
            <span data-nome>{valore.nome}</span>
            <span data-tipo className={stili.tipo}>
              {valore.tipo}
            </span>
          </>
        ) : m.cella === n ? (
          testi.tracciaCondizione
        ) : (
          testi.tracciaScrive
        )}
        {maniglia(m.chiave)}
      </th>
    );
  };
  const tolte = traccia.tolte;
  const n = tabella.colonne.length;
  return (
    <div className={stili.tabella} data-ridisegni={ridisegni.current}>
      <h2 className={stili.titolo}>{testi.tabellaDiTraccia}</h2>
      {spiegazione !== undefined && (
        <p className={stili.tolte} data-spiega>
          {spiegazione}
        </p>
      )}
      {tolte > 0 && (
        <p className={stili.tolte} data-tolte>
          {tolte === 1 ? testi.tracciaTolta : riempi(testi.tracciaTolte, { n: tolte.toLocaleString(lingua) })}
        </p>
      )}
      <div
        ref={contenitore}
        className={stili.scorre}
        data-ferme={ferme}
        style={larghezze}
        onScroll={() => {
          if (!inParte) return;
          cancelAnimationFrame(prossimoGiro.current);
          prossimoGiro.current = requestAnimationFrame(misuraLaVista);
        }}
      >
        <table aria-label={testi.tabellaDiTraccia} aria-rowcount={inParte ? righe.length + 1 : undefined} data-traccia>
          <thead>
            {conGruppi && (
              // I gruppi: il nome della radice e di ogni funzione sopra le sue colonne, che col clic si chiudono e si
              // riaprono; la condizione e lo scritto, fuori dai gruppi, occupano le due righe.
              <tr data-gruppi="">
                <th scope="col" rowSpan={2} className={stili.numero}>
                  {testi.tracciaNumero}
                </th>
                {intestazioneDellaRegola(2)}
                {gruppiInFila(voci).map((g) =>
                  g.blocco === undefined ? (
                    g.voci.map((v) => (v.genere === "colonna" ? intestazioneDi(v.m, 2) : null))
                  ) : (
                    <th
                      scope="colgroup"
                      key={`#gruppo ${g.blocco} ${g.voci[0]!.genere === "colonna" ? g.voci[0]!.m.chiave : ""}`}
                      colSpan={g.voci.length}
                      rowSpan={g.voci[0]!.genere === "chiuso" ? 2 : undefined}
                      className={stili.gruppo}
                    >
                      <button type="button" className={stili.nomeDelGruppo} aria-expanded={g.voci[0]!.genere !== "chiuso"} data-gruppo-di={g.blocco} onClick={() => apriOChiudi(g.blocco!)}>
                        <span aria-hidden="true">{g.voci[0]!.genere === "chiuso" ? "▸" : "▾"}</span> {nomeDelGruppo(g.blocco)}
                      </button>
                    </th>
                  ),
                )}
              </tr>
            )}
            <tr>
              {!conGruppi && (
                <>
                  <th scope="col" className={stili.numero}>
                    {testi.tracciaNumero}
                  </th>
                  {intestazioneDellaRegola()}
                </>
              )}
              {voci.map((v) => (v.genere === "colonna" && (!conGruppi || bloccoDi(v.m, conGruppi) !== undefined) ? intestazioneDi(v.m) : null))}
            </tr>
          </thead>
          <tbody>
            {inParte && da > 0 && <RigaVuota altezza={da * altezzaDellaRiga.current} colonne={colonne} />}
            {(inParte ? righe.slice(da, a) : righe).map((r, k) => (
              <Riga key={r.chiave} riga={r} corrente={r.chiave === ultima} indice={inParte ? da + k + 2 : undefined} celle={celle} />
            ))}
            {inParte && a < righe.length && <RigaVuota altezza={(righe.length - a) * altezzaDellaRiga.current} colonne={colonne} />}
          </tbody>
        </table>
      </div>
      <MenuNelPunto
        dove={menu}
        nome={menu ? riempi(testi.colonnaMenu, { nome: nomeDella(menu.chiave) }) : ""}
        voci={vociDelMenu()}
        chiudi={(torna) => {
          if (torna && menu) riprendi.current = menu.chiave;
          setMenu(null);
        }}
      />
    </div>
  );
});

/** Le voci in fila per gruppo: le vicine dello stesso gruppo insieme (la condizione e lo scritto fuori da ogni gruppo). */
function gruppiInFila(voci: readonly Voce[]): { blocco: string | undefined; voci: Voce[] }[] {
  const fila: { blocco: string | undefined; voci: Voce[] }[] = [];
  for (const v of voci) {
    const blocco = v.genere === "chiuso" ? v.blocco : bloccoDi(v.m, true);
    const prima = fila.at(-1);
    // Un gruppo chiuso è sempre un gruppo a sé.
    if (prima !== undefined && blocco !== undefined && prima.blocco === blocco && v.genere === "colonna" && prima.voci[0]!.genere === "colonna") prima.voci.push(v);
    else fila.push({ blocco, voci: [v] });
  }
  return fila;
}

/** La classe dell'intestazione di una colonna dopo la regola: un valore, la condizione, lo scritto. */
const classeDell = (cella: number, n: number) => (cella < n ? stili.valore : cella === n ? stili.condizione : stili.scrive);
