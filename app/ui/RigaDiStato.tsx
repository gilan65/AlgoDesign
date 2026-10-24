// La riga di stato in fondo alla finestra: a sinistra il nome del file del progetto (o «Nessun file») e,
// se il progetto ha modifiche non salvate, «modificato»; poi quanti errori e avvisi ha, secondo il controllo
// statico del nucleo (`controlla`), e su richiesta l'elenco, dove ogni voce porta al suo blocco. È una
// regione col suo nome, diversa dall'avviso della finestra (un `<output>` col ruolo di stato, che dice
// l'esito di un gesto): qui c'è lo stato del progetto, che resta finché il progetto non cambia.
//
// Una voce di un dato porta alla sua riga nella vista dei dati (che si apre, se è chiusa). Una voce di una procedura o di
// una funzione (il suo nome, il suo valore predefinito, ciò che restituisce) porta alla sua scheda.
//
// Sotto una voce, i suoi comandi: «Dai un valore iniziale a …» per un dato letto prima di avere un valore; per un dato
// senza valore passato per riferimento, la correzione che fa passare il parametro per uscita (solo se la procedura non lo
// legge prima di dargli un valore). Si premono col clic o con Invio, e sono spenti mentre il progetto non si modifica.
//
// A destra, ciò che sta succedendo: lo stato dell'esecuzione e lo zoom (meno, la percentuale, più, «Adatta alla
// finestra»), coi comandi del catalogo. La percentuale è la sola della finestra, e un clic torna al 100%. Lo stato
// dell'esecuzione non è una regione che parla da sé: lo stesso evento lo annuncia l'avviso (la pausa, la fine,
// l'errore), o la console (il valore da scrivere); detto due volte, a ogni passo dell'animata lo si sentirebbe doppio.
import { useId, useState, type ReactElement } from "react";
import type { Dizionario } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { attributi, PulsanteDelComando, type Azioni, type Stati } from "./Barra";
import stiliDellaBarra from "./Barra.module.css";
import stili from "./RigaDiStato.module.css";

/** Una voce dell'elenco, coi testi già nella lingua dell'interfaccia. */
export interface VoceDelControllo {
  readonly genere: "errore" | "avviso";
  readonly codice: string;
  /** Il nome del blocco, o del dato con la sua tabella. */
  readonly dove: string;
  /** L'`id` del blocco, se la voce è di un blocco. */
  readonly blocco: string | null;
  /** L'`id` della fine di una funzione, se la voce è di ciò che restituisce: la fine porta il segno come un blocco. */
  readonly fine?: string;
  /** La chiave della riga, se la voce è di un dato. */
  readonly dato: string | null;
  /** L'`id` della funzione del blocco o del dato (della procedura o della funzione stessa, per il suo nome, il valore
   * predefinito e ciò che restituisce); assente per una costante comune. */
  readonly funzione?: string;
  /** Il testo breve del codice (la spiegazione intera sta nei campi del blocco o del dato). */
  readonly breve: string;
  /** I dati che il blocco può leggere prima che abbiano un valore: un comando ciascuno, che apre il loro valore
   * iniziale nella vista dei dati (`chiave` è quella della riga, `funzione` la funzione del dato). */
  readonly senzaValore?: readonly { readonly nome: string; readonly chiave: string; readonly funzione: string }[];
  /** I parametri per riferimento che ricevono un dato senza valore e che la procedura non legge prima di dar loro un
   * valore: un comando ciascuno, che li fa passare per uscita (`funzione` è la procedura, `indice` la posizione nei suoi dati). */
  readonly versoOut?: readonly { readonly nome: string; readonly funzione: string; readonly indice: number }[];
}

export function RigaDiStato({
  file,
  modificato,
  voci,
  fuoriTappa,
  ricorsione,
  testi,
  vai,
  daiUnValore,
  sostituisciConOut,
  esecuzione,
  zoom,
}: {
  /** Il nome del file, senza la cartella; `null` se il progetto non è legato a un file. */
  file: string | null;
  modificato: boolean;
  voci: readonly VoceDelControllo[];
  fuoriTappa: boolean;
  /** I giri della ricorsione in parole, dopo la sintesi: un'informazione, non un errore. */
  ricorsione?: string;
  testi: Dizionario;
  /** Porta al blocco della voce (lo seleziona e gli dà il fuoco), o alla riga del dato. */
  vai: (voce: VoceDelControllo) => void;
  /** Apre il valore iniziale del dato della riga; assente (i comandi spenti) mentre il progetto non si modifica. */
  daiUnValore?: ((chiave: string, funzione: string) => void) | undefined;
  /** Fa passare per uscita il parametro della procedura, e il fuoco va al blocco della voce (il pulsante sparisce con
   * l'errore); assente (i comandi spenti) mentre il progetto non si modifica. */
  sostituisciConOut?: ((funzione: string, indice: number, blocco: string | null) => void) | undefined;
  /** Lo stato dell'esecuzione, in parole. */
  esecuzione: string;
  /** La scala del flowchart e i comandi dello zoom, con ciò che mostrano (dopo «Adatta», un altro nome). */
  zoom: { readonly scala: number; readonly azioni: Azioni; readonly stati?: Stati };
}): ReactElement {
  const [aperto, setAperto] = useState(false);
  const idElenco = useId();
  const errori = voci.filter((v) => v.genere === "errore").length;
  const avvisi = voci.length - errori;
  const conteggio = (n: number, uno: string, molti: string) => (n === 1 ? uno : riempi(molti, { n: String(n) }));
  const sintesi = fuoriTappa
    ? testi.statoFuoriTappa
    : voci.length === 0
      ? testi.statoNessuno
      : [errori > 0 && conteggio(errori, testi.statoErrore, testi.statoErrori), avvisi > 0 && conteggio(avvisi, testi.statoAvviso, testi.statoAvvisi)].filter(Boolean).join(" · ");
  const mostrato = aperto && voci.length > 0;

  return (
    <section aria-label={testi.rigaDiStato} className={stili.riga}>
      <span className={stili.file} data-file>
        {file ?? testi.statoNessunFile}
        {modificato && <span className={stili.modificato}> · {testi.statoModificato}</span>}
      </span>
      <span className={errori > 0 ? `${stili.sintesi} ${stili.conErrori}` : avvisi > 0 ? `${stili.sintesi} ${stili.conAvvisi}` : stili.sintesi}>{sintesi}</span>
      {ricorsione !== undefined && (
        <span className={stili.sintesi} data-ricorsione="">
          {ricorsione}
        </span>
      )}
      {voci.length > 0 && (
        <button type="button" className={stili.comando} aria-expanded={mostrato} aria-controls={idElenco} onClick={() => setAperto((a) => !a)}>
          {mostrato ? testi.statoNascondi : testi.statoMostra}
        </button>
      )}
      <ul id={idElenco} aria-label={testi.elencoDelControllo} className={stili.elenco} hidden={!mostrato}>
        {voci.map((v, i) => {
          const testo = riempi(v.genere === "errore" ? testi.voceErrore : testi.voceAvviso, { dove: v.dove, breve: v.breve });
          const classe = v.genere === "errore" ? stili.errore : stili.avviso;
          return (
            <li key={`${v.codice}-${v.blocco ?? v.dato}-${i}`} className={classe}>
              {v.blocco === null && v.dato === null && v.funzione === undefined ? (
                <span className={stili.voce}>{testo}</span>
              ) : (
                <button type="button" className={stili.voce} onClick={() => vai(v)}>
                  {testo}
                </button>
              )}
              {v.senzaValore?.map((d) => (
                <button key={d.chiave} type="button" className={stili.daiUnValore} data-dai-un-valore={d.chiave} disabled={!daiUnValore} onClick={() => daiUnValore?.(d.chiave, d.funzione)}>
                  {riempi(testi.daiUnValore, { nome: d.nome })}
                </button>
              ))}
              {v.versoOut?.map((d) => (
                <button
                  key={`${d.funzione}-${d.indice}`}
                  type="button"
                  className={stili.daiUnValore}
                  data-verso-out={`${d.funzione}-${d.indice}`}
                  disabled={!sostituisciConOut}
                  onClick={() => sostituisciConOut?.(d.funzione, d.indice, v.blocco)}
                >
                  {riempi(testi.sostituisciConOut, { nome: d.nome })}
                </button>
              ))}
            </li>
          );
        })}
      </ul>
      <span className={stili.destra}>
        <span className={stili.stato} data-stato-esecuzione="">
          {esecuzione}
        </span>
        <span role="group" aria-label={testi.zoom} className={stili.zoom}>
          <PulsanteDelComando id="riduci" testi={testi} azione={zoom.azioni.riduci} soloIcona />
          <button type="button" className={`${stiliDellaBarra.pulsante} ${stili.livello}`} {...attributi("cento", testi.zoomCento, testi, zoom.azioni.cento)}>
            {`${Math.round(zoom.scala * 100)}%`}
          </button>
          <PulsanteDelComando id="ingrandisci" testi={testi} azione={zoom.azioni.ingrandisci} soloIcona />
          <PulsanteDelComando id="adatta" testi={testi} azione={zoom.azioni.adatta} stato={zoom.stati?.adatta} />
        </span>
      </span>
    </section>
  );
}
