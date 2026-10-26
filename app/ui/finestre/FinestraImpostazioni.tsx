// La finestra delle Impostazioni: le preferenze che valgono per l'app (non per il progetto), su sei schede
// (Aspetto, Modifica, Limiti, Percorsi, Tabella di traccia, Console). In «Percorsi» due riquadri, la cartella delle
// librerie e quella degli esempi. In «Aspetto» anche i colori dei singoli generi di blocco (`ColoriDeiBlocchi.tsx`),
// come si disegnano i cicli `per` e `per ogni` e il fondo del loro riquadro. Le scelte si fanno su una copia: valgono, e
// si scrivono nelle preferenze, con «Conferma»; «Annulla» ed Esc le lasciano com'erano. Le scelte fra poche voci sono
// pulsanti di opzione nativi (il Tab li raggiunge nei due motori), un interruttore è una casella nativa (la barretta
// dell'esecuzione); un numero fra un minimo e un massimo (i limiti, i caratteri di una riga della console) è un campo
// dove si scrive col cursore accanto, che lo segue nei due versi, con l'errore sotto il campo mentre si scrive. In
// «Limiti» anche la pila delle chiamate con cui nasce un progetto nuovo (ogni progetto ha la sua, nelle Proprietà).
// In «Console», dopo le righe lunghe, il menu dei linguaggi del codice generato: una riga per linguaggio del registro,
// con la casella che lo accende e i pulsanti ▲ ▼ che lo spostano (il fuoco resta sul pulsante della riga spostata,
// anche in cima o in fondo, dove il pulsante resta raggiungibile e non fa nulla); l'ultimo acceso non si spegne.
// «Conferma» con un numero sbagliato porta alla sua scheda e al campo.
import { Tabs } from "@ark-ui/react/tabs";
import { useId, useRef, useState, type FormEvent, type ReactElement, type ReactNode, type RefObject } from "react";
import { tetti, type Tetti } from "../../core/controllo/controllo";
import { separatoriPredefiniti } from "../../core/esecuzione/traccia";
import type { Dizionario } from "../../i18n/it";
import { nomiLingue, riempi, type Lingua } from "../../i18n/lingue";
import { limitiDellaPila } from "../../core/progetto/modello";
import { paroleDeiLinguaggi, type Linguaggio } from "../genera/codice";
import { caratteriPerRiga, caratteriValidi, intervalli, limiteValido, minimoDel, pilaValida, righeDelMenu, scelteIniziali, voci, type Scelte } from "../preferenze";
import { ColoriDeiBlocchi } from "./ColoriDeiBlocchi";
import { Finestra, Rinuncia, stili } from "./Finestra";

const lingue = Object.keys(nomiLingue) as Lingua[];

/** La cartella degli esempi (o delle librerie) in uso, come la vede la finestra. */
export interface CartellaInUso {
  readonly cartella: string;
  readonly predefinita: string;
  /** La cartella scelta non c'è più: si usa la predefinita. */
  readonly mancante: boolean;
}

type ChiaveDelLimite = keyof Tetti;
const chiavi = Object.keys(tetti) as ChiaveDelLimite[];
const schede = ["aspetto", "modifica", "limiti", "percorsi", "tabella", "console"] as const;
type Scheda = (typeof schede)[number];

/** Il limite scritto nel campo; `null` se non è un intero dell'intervallo. I caratteri di un vettore di stringhe si
 * misurano contro gli elementi scritti nel loro campo (se non sono validi, contro il loro minimo). */
function limiteScritto(chiave: ChiaveDelLimite, testo: string, scritti: Record<ChiaveDelLimite, string>): number | null {
  const n = /^\d+$/.test(testo.trim()) ? Number(testo.trim()) : Number.NaN;
  return limiteValido(chiave, n, elementiScritti(scritti)) ? n : null;
}

/** Gli elementi di un vettore scritti nel loro campo, se sono validi; altrimenti il loro minimo. */
function elementiScritti(scritti: Record<ChiaveDelLimite, string>): number {
  const testo = scritti.elementiDiUnVettore.trim();
  const n = /^\d+$/.test(testo) ? Number(testo) : Number.NaN;
  return limiteValido("elementiDiUnVettore", n) ? n : intervalli.elementiDiUnVettore.minimo;
}

function Opzioni<V extends string>({
  legenda,
  nome,
  valore,
  ammessi,
  testo,
  cambia,
  lang,
  children,
}: {
  legenda: string;
  nome: string;
  valore: V;
  ammessi: readonly V[];
  testo: (v: V) => string;
  cambia: (v: V) => void;
  lang?: (v: V) => string;
  /** Le scelte dello stesso argomento che non sono una di queste (una casella), nello stesso riquadro. */
  children?: ReactNode;
}): ReactElement {
  return (
    <fieldset className={stili.scelta}>
      <legend>{legenda}</legend>
      {ammessi.map((v) => (
        <label key={v} className={stili.opzione} lang={lang?.(v)}>
          <input type="radio" name={nome} value={v} checked={valore === v} onChange={() => cambia(v)} />
          {testo(v)}
        </label>
      ))}
      {children}
    </fieldset>
  );
}

interface Bozza {
  readonly lingua: Lingua;
  readonly scelte: Scelte;
  /** I limiti come sono scritti nei campi. */
  readonly limiti: Record<ChiaveDelLimite, string>;
  /** I caratteri di una riga della console, come sono scritti. */
  readonly caratteri: string;
  /** La pila delle chiamate dei progetti nuovi, come è scritta. */
  readonly pila: string;
  /** Le righe del menu dei linguaggi, accesi e spenti, nell'ordine in cui stanno ora: «Conferma» tiene gli accesi
   * (`scelte.linguaggiDelCodice`) in quest'ordine. */
  readonly righe: readonly Linguaggio[];
}

const scrittiDa = (l: Tetti): Record<ChiaveDelLimite, string> =>
  Object.fromEntries(chiavi.map((k) => [k, String(l[k])])) as Record<ChiaveDelLimite, string>;

function Contenuto({
  testi,
  iniziale,
  esempi,
  librerie,
  scegliCartella,
  conferma,
  primo,
}: {
  testi: Dizionario;
  iniziale: { lingua: Lingua; scelte: Scelte };
  esempi: CartellaInUso | null;
  librerie: CartellaInUso | null;
  scegliCartella: (partenza: string | null) => Promise<string | null>;
  conferma: (lingua: Lingua, scelte: Scelte) => void;
  primo: RefObject<HTMLButtonElement | null>;
}): ReactElement {
  const id = useId();
  const [bozza, setBozza] = useState<Bozza>(() => ({
    ...iniziale,
    limiti: scrittiDa(iniziale.scelte.limiti),
    caratteri: String(iniziale.scelte.caratteriPerRiga),
    pila: String(iniziale.scelte.pilaDeiProgettiNuovi),
    righe: righeDelMenu(iniziale.scelte.linguaggiDelCodice),
  }));
  const [scheda, setScheda] = useState<Scheda>("aspetto");
  const [tentato, setTentato] = useState(false);
  const modulo = useRef<HTMLFormElement>(null);
  const s = bozza.scelte;
  const cambia = (c: Partial<Scelte>) => setBozza((b) => ({ ...b, scelte: { ...b.scelte, ...c } }));
  const nomeScheda: Record<Scheda, string> = {
    aspetto: testi.impostazioniDisegno,
    modifica: testi.impostazioniModifica,
    limiti: testi.impostazioniLimiti,
    percorsi: testi.impostazioniPercorsi,
    tabella: testi.impostazioniTabella,
    console: testi.impostazioniConsole,
  };
  // Il nome di un separatore; quello della lingua dice quale vale, nella lingua scelta qui.
  const segno = (c: string) => (c === ";" ? testi.segnoPuntoEVirgola : c === "," ? testi.segnoVirgola : testi.segnoPunto);
  const dellaLingua = separatoriPredefiniti[bozza.lingua];

  /** Un numero fra un minimo e un massimo: il campo dove si scrive e, accanto, il cursore che lo sceglie (l'uno segue
   * l'altro); sotto, il predefinito, l'errore mentre si scrive e l'avviso. */
  const numero = (v: {
    nome: string;
    etichetta: string;
    testo: string;
    /** Il testo come era all'apertura: finché non cambia, l'errore aspetta «Conferma». */
    dapprima: string;
    minimo: number;
    massimo: number;
    predefinito: number;
    avviso: string | null;
    valido: boolean;
    cambia: (testo: string) => void;
    dati: Record<string, string>;
  }) => {
    const errore = !v.valido && (tentato || v.testo !== v.dapprima) ? riempi(testi.limiteFuori, { minimo: String(v.minimo), massimo: String(v.massimo) }) : null;
    const campo = `${id}-${v.nome}`;
    const descritto = [`${campo}-aiuto`, errore ? `${campo}-errore` : null, v.avviso ? `${campo}-avviso` : null].filter(Boolean).join(" ");
    // Il cursore sta sul numero scritto; con un numero fuori dall'intervallo, al confine più vicino.
    const n = Number(v.testo);
    const cursore = Number.isFinite(n) && v.testo.trim() !== "" ? Math.min(v.massimo, Math.max(v.minimo, Math.round(n))) : v.predefinito;
    return (
      <div className={stili.voce}>
        <label htmlFor={campo}>{v.etichetta}</label>
        <span className={stili.numeroECursore}>
          <input
            id={campo}
            className={`${stili.campo} ${stili.numero}`}
            type="number"
            min={v.minimo}
            max={v.massimo}
            step={1}
            value={v.testo}
            aria-invalid={errore ? true : undefined}
            aria-describedby={descritto}
            {...v.dati}
            onChange={(e) => v.cambia(e.target.value)}
          />
          <input
            className={stili.cursore}
            type="range"
            min={v.minimo}
            max={v.massimo}
            step={1}
            value={cursore}
            aria-label={v.etichetta}
            aria-describedby={`${campo}-aiuto`}
            onChange={(e) => v.cambia(e.target.value)}
          />
        </span>
        <span id={`${campo}-aiuto`} className={stili.aiuto}>
          {riempi(testi.limitePredefinito, { n: String(v.predefinito) })}
        </span>
        {errore && (
          <span id={`${campo}-errore`} className={stili.errore}>
            {errore}
          </span>
        )}
        {v.avviso && (
          <span id={`${campo}-avviso`} className={stili.avvisoDelCampo}>
            {v.avviso}
          </span>
        )}
      </div>
    );
  };

  const limite = (chiave: ChiaveDelLimite, etichetta: string) => {
    const testo = bozza.limiti[chiave];
    const valore = limiteScritto(chiave, testo, bozza.limiti);
    return numero({
      nome: chiave,
      etichetta,
      testo,
      dapprima: scrittiDa(iniziale.scelte.limiti)[chiave],
      minimo: minimoDel(chiave, elementiScritti(bozza.limiti)),
      massimo: intervalli[chiave].massimo,
      predefinito: tetti[chiave],
      avviso: null,
      valido: valore !== null,
      cambia: (t) => setBozza((b) => ({ ...b, limiti: { ...b.limiti, [chiave]: t } })),
      dati: { "data-limite": chiave },
    });
  };
  const caratteriScritti = (testo: string) => (/^\d+$/.test(testo.trim()) && caratteriValidi(Number(testo.trim())) ? Number(testo.trim()) : null);
  const pilaScritta = (testo: string) => (/^\d+$/.test(testo.trim()) && pilaValida(Number(testo.trim())) ? Number(testo.trim()) : null);
  const predefiniti = chiavi.every((k) => limiteScritto(k, bozza.limiti[k], bozza.limiti) === tetti[k]);

  /** Il riquadro di una cartella, degli esempi o delle librerie: la cartella mostrata è quella della copia (scelta ora, o
   * la predefinita); la scelta già in uso porta il segno della cartella che non c'è più. */
  const riquadroDellaCartella = (chiave: "cartellaEsempi" | "cartellaLibrerie", inUso: CartellaInUso | null, legenda: string, spiegazione: string) => {
    const scelta = s[chiave];
    const mostrata = scelta ?? inUso?.predefinita ?? "";
    const mancante = inUso?.mancante === true && scelta !== null && scelta === iniziale.scelte[chiave];
    return (
      <fieldset className={`${stili.scelta} ${stili.cartella}`} data-cartella={chiave}>
        <legend>{legenda}</legend>
        <p className={stili.spiegazione}>{spiegazione}</p>
        {mostrata !== "" && <p className={`${stili.spiegazione} ${stili.percorso}`}>{riempi(testi.esempiCartella, { cartella: mostrata })}</p>}
        {mancante && <p className={stili.avvisoDelCampo}>{riempi(testi.cartellaMancante, { cartella: scelta })}</p>}
        <div className={stili.comandi}>
          <button
            type="button"
            className={stili.comando}
            onClick={() =>
              void scegliCartella(scelta ?? inUso?.cartella ?? null).then((c) => {
                if (c !== null) cambia({ [chiave]: c });
              })
            }
          >
            {testi.cartellaScegli}
          </button>
          <button type="button" className={stili.comando} aria-disabled={scelta === null} onClick={scelta === null ? undefined : () => cambia({ [chiave]: null })}>
            {testi.cartellaPredefinita}
          </button>
        </div>
      </fieldset>
    );
  };

  /** Il menu dei linguaggi: accendere o spegnere un linguaggio, e spostarlo di una riga (il fuoco resta sul pulsante
   * premuto, che segue la sua riga). */
  const accesi = s.linguaggiDelCodice;
  const accendi = (l: Linguaggio, acceso: boolean) => cambia({ linguaggiDelCodice: bozza.righe.filter((x) => (x === l ? acceso : accesi.includes(x))) });
  const sposta = (l: Linguaggio, verso: -1 | 1) => {
    const righe = [...bozza.righe];
    const i = righe.indexOf(l);
    const j = i + verso;
    if (j < 0 || j >= righe.length) return;
    [righe[i], righe[j]] = [righe[j]!, righe[i]!];
    setBozza((b) => ({ ...b, righe, scelte: { ...b.scelte, linguaggiDelCodice: righe.filter((x) => b.scelte.linguaggiDelCodice.includes(x)) } }));
    requestAnimationFrame(() => modulo.current?.querySelector<HTMLElement>(`[data-linguaggio="${l}"] [data-verso="${verso}"]`)?.focus());
  };

  function invia(e: FormEvent): void {
    e.preventDefault();
    setTentato(true);
    const sbagliato = chiavi.find((k) => limiteScritto(k, bozza.limiti[k], bozza.limiti) === null);
    if (sbagliato) {
      setScheda("limiti");
      // Al giro dopo: la scheda dei limiti diventa visibile.
      requestAnimationFrame(() => modulo.current?.querySelector<HTMLElement>(`[data-limite="${sbagliato}"]`)?.focus());
      return;
    }
    const pila = pilaScritta(bozza.pila);
    if (pila === null) {
      setScheda("limiti");
      requestAnimationFrame(() => modulo.current?.querySelector<HTMLElement>("[data-pila]")?.focus());
      return;
    }
    const caratteri = caratteriScritti(bozza.caratteri);
    if (caratteri === null) {
      setScheda("console");
      requestAnimationFrame(() => modulo.current?.querySelector<HTMLElement>("[data-caratteri]")?.focus());
      return;
    }
    const limiti = Object.fromEntries(chiavi.map((k) => [k, limiteScritto(k, bozza.limiti[k], bozza.limiti)!])) as unknown as Tetti;
    conferma(bozza.lingua, { ...s, limiti, caratteriPerRiga: caratteri, pilaDeiProgettiNuovi: pila });
  }

  return (
    <form ref={modulo} className={stili.campi} onSubmit={invia} noValidate>
      <Tabs.Root value={scheda} onValueChange={(d) => setScheda(d.value as Scheda)} className={stili.schede}>
        <Tabs.List className={stili.linguette} aria-label={testi.impostazioniTitolo}>
          {schede.map((k) => (
            <Tabs.Trigger key={k} value={k} className={stili.linguetta} ref={k === "aspetto" ? primo : undefined}>
              {nomeScheda[k]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="aspetto" className={stili.scheda}>
          <Opzioni
            legenda={testi.coloriDelDisegno}
            nome="colori"
            valore={s.colori}
            ammessi={voci.colori}
            testo={(v) => ({ tenue: testi.coloriTenue, contrasto: testi.coloriContrasto, "bianco-e-nero": testi.coloriBiancoNero })[v]}
            cambia={(colori) => cambia({ colori })}
          />
          <ColoriDeiBlocchi testi={testi} insieme={s.colori} colori={s.coloriDeiBlocchi} cambia={(coloriDeiBlocchi) => cambia({ coloriDeiBlocchi })} />
          <Opzioni
            legenda={testi.condizioniLunghe}
            nome="condizioni"
            valore={s.condizioni}
            ammessi={voci.condizioni}
            testo={(v) => (v === "su-due-righe" ? testi.condizioniDueRighe : testi.condizioniUnaRiga)}
            cambia={(condizioni) => cambia({ condizioni })}
          />
          <Opzioni
            legenda={testi.valoriIniziali}
            nome="valoriIniziali"
            valore={s.valoriIniziali}
            ammessi={voci.valoriIniziali}
            testo={(v) => (v === "mostrati" ? testi.valoriMostrati : testi.valoriNascosti)}
            cambia={(valoriIniziali) => cambia({ valoriIniziali })}
          />
          <Opzioni
            legenda={testi.valoreRipetuto}
            nome="valoreRipetuto"
            valore={s.valoreRipetuto}
            ammessi={voci.valoreRipetuto}
            testo={(v) => (v === "elenco" ? testi.ripetutoElenco : testi.ripetutoUnValore)}
            cambia={(valoreRipetuto) => cambia({ valoreRipetuto })}
          />
          <Opzioni
            legenda={testi.cicliPer}
            nome="cicliPer"
            valore={s.cicliPer}
            ammessi={voci.cicliPer}
            testo={(v) => (v === "aperto" ? testi.perAperto : testi.perChiuso)}
            cambia={(cicliPer) => cambia({ cicliPer })}
          />
          <Opzioni
            legenda={testi.cicliPerOgni}
            nome="cicliPerOgni"
            valore={s.cicliPerOgni}
            ammessi={voci.cicliPerOgni}
            testo={(v) => ({ posizione: testi.perOgniPosizione, parole: testi.perOgniParole, chiuso: testi.perOgniChiuso })[v]}
            cambia={(cicliPerOgni) => cambia({ cicliPerOgni })}
          />
          <Opzioni
            legenda={testi.copiaDeiVettori}
            nome="copiaDeiVettori"
            valore={s.copiaDeiVettori}
            ammessi={voci.copiaDeiVettori}
            testo={(v) => (v === "compatta" ? testi.copiaCompatta : testi.copiaEspansa)}
            cambia={(copiaDeiVettori) => cambia({ copiaDeiVettori })}
          />
          <fieldset className={stili.scelta}>
            <legend>{testi.riquadroDeiCicli}</legend>
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.fondoDeiCicli} onChange={(e) => cambia({ fondoDeiCicli: e.target.checked })} />
              {testi.fondoDeiCicli}
            </label>
          </fieldset>
          <fieldset className={stili.scelta}>
            <legend>{testi.sceltaDiPiuBlocchi}</legend>
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.riquadroDellaScelta} onChange={(e) => cambia({ riquadroDellaScelta: e.target.checked })} />
              {testi.riquadroDellaScelta}
            </label>
          </fieldset>
          <fieldset className={stili.scelta}>
            <legend>{testi.bloccoDiLettura}</legend>
            <label className={stili.opzione}>
              <input
                type="checkbox"
                checked={s.domandaNellaLettura}
                aria-describedby={`${id}-domanda`}
                onChange={(e) => cambia({ domandaNellaLettura: e.target.checked })}
              />
              {testi.domandaNellaLettura}
            </label>
            <p id={`${id}-domanda`} className={stili.spiegazione}>
              {testi.domandaNellaLetturaSpiegazione}
            </p>
          </fieldset>
          <Opzioni
            legenda={testi.comandiDellaBarra}
            nome="barra"
            valore={s.barra}
            ammessi={voci.barra}
            testo={(v) => ({ "icone-e-testo": testi.barraIconeTesto, icone: testi.barraSoloIcone, "testo-sotto": testi.barraTestoSotto })[v]}
            cambia={(barra) => cambia({ barra })}
          >
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.esecuzioneFlottante} onChange={(e) => cambia({ esecuzioneFlottante: e.target.checked })} />
              {testi.barrettaScelta}
            </label>
          </Opzioni>
          <Opzioni
            legenda={testi.etichettaLingua}
            nome="lingua"
            valore={bozza.lingua}
            ammessi={lingue}
            testo={(l) => nomiLingue[l]}
            lang={(l) => l}
            cambia={(lingua) => setBozza((b) => ({ ...b, lingua }))}
          />
          <fieldset className={stili.scelta}>
            <legend>{testi.guidaTitolo}</legend>
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.ricercaNellaGuida} onChange={(e) => cambia({ ricercaNellaGuida: e.target.checked })} />
              {testi.ricercaNellaGuida}
            </label>
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.guidaSpostabile} onChange={(e) => cambia({ guidaSpostabile: e.target.checked })} />
              {testi.guidaSpostabile}
            </label>
          </fieldset>
        </Tabs.Content>
        <Tabs.Content value="modifica" className={stili.scheda}>
          <Opzioni
            legenda={testi.modoDeiBlocchi}
            nome="blocchi"
            valore={s.modoDeiBlocchi}
            ammessi={voci.modoDeiBlocchi}
            testo={(v) => (v === "riquadro" ? testi.modoRiquadro : testi.modoPannello)}
            cambia={(modoDeiBlocchi) => cambia({ modoDeiBlocchi })}
          />
          <Opzioni
            legenda={testi.modoDeiDati}
            nome="dati"
            valore={s.modoDeiDati}
            ammessi={voci.modoDeiDati}
            testo={(v) => (v === "scheda" ? testi.modoScheda : testi.modoCelle)}
            cambia={(modoDeiDati) => cambia({ modoDeiDati })}
          />
          <Opzioni
            legenda={testi.confermaDelDato}
            nome="conferma"
            valore={s.conferma}
            ammessi={voci.conferma}
            testo={(v) => (v === "se-usato" ? testi.confermaSeUsato : testi.confermaSempre)}
            cambia={(conferma) => cambia({ conferma })}
          />
          <fieldset className={stili.scelta}>
            <legend>{testi.parentesiEVirgolette}</legend>
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.chiusuraAutomatica} onChange={(e) => cambia({ chiusuraAutomatica: e.target.checked })} />
              {testi.chiusuraAutomatica}
            </label>
          </fieldset>
          <fieldset className={stili.scelta}>
            <legend>{testi.casiDalleEsecuzioni}</legend>
            <label className={stili.opzione}>
              <input type="checkbox" checked={s.offriCasoDallEsecuzione} onChange={(e) => cambia({ offriCasoDallEsecuzione: e.target.checked })} />
              {testi.offriCasoDallEsecuzione}
            </label>
          </fieldset>
        </Tabs.Content>
        <Tabs.Content value="limiti" className={stili.scheda}>
          <p className={stili.spiegazione}>{testi.limitiSpiegazione}</p>
          {limite("elementiDiUnVettore", testi.limiteVettore)}
          {limite("lunghezzaDiUnaStringa", testi.limiteStringa)}
          {limite("caratteriDiUnVettoreDiStringhe", testi.limiteCaratteri)}
          <div className={stili.comandi}>
            <button
              type="button"
              className={stili.comando}
              aria-disabled={predefiniti}
              onClick={predefiniti ? undefined : () => setBozza((b) => ({ ...b, limiti: scrittiDa(tetti) }))}
            >
              {testi.limitiPredefiniti}
            </button>
          </div>
          <p className={stili.spiegazione}>{testi.pilaSpiegazione}</p>
          {numero({
            nome: "pila",
            etichetta: testi.pilaDeiProgettiNuovi,
            testo: bozza.pila,
            dapprima: String(iniziale.scelte.pilaDeiProgettiNuovi),
            minimo: limitiDellaPila.minimo,
            massimo: limitiDellaPila.massimo,
            predefinito: scelteIniziali.pilaDeiProgettiNuovi,
            avviso: null,
            valido: pilaScritta(bozza.pila) !== null,
            cambia: (pila) => setBozza((b) => ({ ...b, pila })),
            dati: { "data-pila": "" },
          })}
        </Tabs.Content>
        <Tabs.Content value="percorsi" className={stili.scheda}>
          {riquadroDellaCartella("cartellaLibrerie", librerie, testi.percorsiLibrerie, testi.librerieSpiegazione)}
          {riquadroDellaCartella("cartellaEsempi", esempi, testi.percorsiEsempi, testi.cartellaSpiegazione)}
        </Tabs.Content>
        <Tabs.Content value="tabella" className={stili.scheda}>
          <Opzioni
            legenda={testi.formaDeiVettori}
            nome="formaDeiVettori"
            valore={s.formaDeiVettori}
            ammessi={voci.formaDeiVettori}
            testo={(v) => (v === "primi-e-altri" ? testi.formaPrimiEAltri : testi.formaInFila)}
            cambia={(formaDeiVettori) => cambia({ formaDeiVettori })}
          />
          <Opzioni
            legenda={testi.colonneFerme}
            nome="colonneFerme"
            valore={s.colonneFerme}
            ammessi={voci.colonneFerme}
            testo={(v) => (v === "numero-e-regola" ? testi.fermeNumeroERegola : testi.fermeNumero)}
            cambia={(colonneFerme) => cambia({ colonneFerme })}
          />
          <p className={stili.spiegazione}>{testi.tabellaSpiegazione}</p>
          <Opzioni
            legenda={testi.formaDelCsv}
            nome="formaDelCsv"
            valore={s.formaDelCsv}
            ammessi={voci.formaDelCsv}
            testo={(v) => (v === "uguale" ? testi.csvUguale : testi.csvPerElemento)}
            cambia={(formaDelCsv) => cambia({ formaDelCsv })}
          />
          <Opzioni
            legenda={testi.separatoreCsv}
            nome="separatoreCsv"
            valore={s.separatoreCsv}
            ammessi={voci.separatoreCsv}
            testo={(v) => (v === "lingua" ? riempi(testi.comeLaLingua, { segno: segno(dellaLingua.campo) }) : segno(v))}
            cambia={(separatoreCsv) => cambia({ separatoreCsv })}
          />
          <Opzioni
            legenda={testi.decimaliCsv}
            nome="decimaliCsv"
            valore={s.decimaliCsv}
            ammessi={voci.decimaliCsv}
            testo={(v) => (v === "lingua" ? riempi(testi.comeLaLingua, { segno: segno(dellaLingua.decimali) }) : segno(v))}
            cambia={(decimaliCsv) => cambia({ decimaliCsv })}
          />
        </Tabs.Content>
        <Tabs.Content value="console" className={stili.scheda}>
          <p className={stili.spiegazione}>{testi.consoleSpiegazione}</p>
          <Opzioni
            legenda={testi.righeLunghe}
            nome="righeLunghe"
            valore={s.righeLunghe}
            ammessi={voci.righeLunghe}
            testo={(v) => (v === "a-capo" ? testi.righeACapo : testi.righeLaFine)}
            cambia={(righeLunghe) => cambia({ righeLunghe })}
          />
          {numero({
            nome: "caratteri",
            etichetta: testi.caratteriPerRiga,
            testo: bozza.caratteri,
            dapprima: String(iniziale.scelte.caratteriPerRiga),
            minimo: caratteriPerRiga.minimo,
            massimo: caratteriPerRiga.massimo,
            predefinito: scelteIniziali.caratteriPerRiga,
            avviso: null,
            valido: caratteriScritti(bozza.caratteri) !== null,
            cambia: (caratteri) => setBozza((b) => ({ ...b, caratteri })),
            dati: { "data-caratteri": "" },
          })}
          <fieldset className={stili.scelta} data-menu-dei-linguaggi="">
            <legend>{testi.linguaggiDelCodice}</legend>
            <p className={stili.spiegazione}>{testi.linguaggiSpiegazione}</p>
            <ul className={stili.menuDeiLinguaggi}>
              {bozza.righe.map((l, i) => {
                const nome = testi[paroleDeiLinguaggi[l].nome];
                const acceso = accesi.includes(l);
                const ultimo = acceso && accesi.length === 1;
                const pulsante = (verso: -1 | 1, fermo: boolean) => (
                  <button
                    type="button"
                    className={stili.comando}
                    data-verso={verso}
                    aria-label={riempi(verso < 0 ? testi.linguaggioSu : testi.linguaggioGiu, { linguaggio: nome })}
                    aria-disabled={fermo}
                    onClick={fermo ? undefined : () => sposta(l, verso)}
                  >
                    {verso < 0 ? "▲" : "▼"}
                  </button>
                );
                return (
                  <li key={l} className={stili.rigaDelMenu} data-linguaggio={l}>
                    <label className={stili.opzione}>
                      <input type="checkbox" checked={acceso} disabled={ultimo} aria-describedby={ultimo ? `${id}-ultimo` : undefined} onChange={(e) => accendi(l, e.target.checked)} />
                      {nome}
                    </label>
                    {pulsante(-1, i === 0)}
                    {pulsante(1, i === bozza.righe.length - 1)}
                  </li>
                );
              })}
            </ul>
            {accesi.length === 1 && (
              <p id={`${id}-ultimo`} className={stili.spiegazione}>
                {testi.almenoUnLinguaggio}
              </p>
            )}
          </fieldset>
        </Tabs.Content>
      </Tabs.Root>
      <div className={stili.comandi}>
        <button type="submit" className={stili.comando}>
          {testi.progettoConferma}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.annullaEsc}
        </Rinuncia>
      </div>
    </form>
  );
}

export function FinestraImpostazioni({
  aperta,
  testi,
  lingua,
  scelte,
  esempi,
  librerie,
  scegliCartella,
  conferma,
  rinuncia,
}: {
  aperta: boolean;
  testi: Dizionario;
  lingua: Lingua;
  scelte: Scelte;
  /** Dove stanno gli esempi e le librerie; `null` fuori dal guscio (le cartelle sono in memoria). */
  esempi: CartellaInUso | null;
  librerie: CartellaInUso | null;
  /** La finestra del sistema per scegliere una cartella, da dove parte; `null` se l'utente rinuncia. */
  scegliCartella: (partenza: string | null) => Promise<string | null>;
  conferma: (lingua: Lingua, scelte: Scelte) => void;
  rinuncia: () => void;
}): ReactElement {
  const primo = useRef<HTMLButtonElement>(null);
  return (
    // Il contenuto si monta a ogni apertura: la copia riparte dalle scelte in uso.
    <Finestra aperta={aperta} titolo={testi.impostazioniTitolo} rinuncia={rinuncia} larga iniziale={() => primo.current}>
      <Contenuto testi={testi} iniziale={{ lingua, scelte }} esempi={esempi} librerie={librerie} scegliCartella={scegliCartella} conferma={conferma} primo={primo} />
    </Finestra>
  );
}
