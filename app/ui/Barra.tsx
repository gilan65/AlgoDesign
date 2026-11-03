// La barra della finestra: i comandi in cinque gruppi, in ordine di lavoro (Progetto, Modifica, Esecuzione,
// Viste, Applicazione), tutti ricavati dal catalogo (`comandi.ts`). I comandi rari del progetto stanno in un
// menu a tendina della pagina, «Progetto» (mai il menu del sistema); «Salva» anche fuori, nel gruppo.
// Impostazioni e il menu «Aiuto» (Esempi e le informazioni del prodotto) stanno sempre nella prima riga, a destra e
// staccati: se la finestra è stretta va a capo il resto, a sinistra (una griglia a due colonne). Nella pagina di
// prova dei disegni il menu «Aiuto» non c'è. Il nome dell'app sta nel titolo della finestra; lo zoom e lo stato
// dell'esecuzione nella riga di stato.
//
// Come si presentano i pulsanti è una scelta delle Impostazioni: icona e testo, solo l'icona (il testo resta il
// nome del pulsante), o il testo piccolo sotto l'icona (il predefinito); il nome e il tasto compaiono sempre al
// passaggio del puntatore. La scelta tocca i soli pulsanti della barra, non le voci del menu. Nella pagina di
// prova dei disegni c'è solo il gruppo dell'applicazione.
import { Menu } from "@ark-ui/react/menu";
import { Portal } from "@ark-ui/react/portal";
import { useRef, type FocusEvent, type ReactElement } from "react";
import { flushSync } from "react-dom";
import type { Dizionario } from "../i18n/it";
import stili from "./Barra.module.css";
import { catalogo, delGruppo, suggerimento, tastoDelComando, tastoMostrato, VOCI_DEL_MENU, VOCI_DELL_AIUTO, type Comando, type IdComando } from "./comandi";
import { icone } from "./icone";
import type { ComandiDellaBarra } from "./preferenze";

/** Le azioni dei comandi in questo momento: un comando senza azione non è disponibile. */
export type Azioni = Partial<Record<IdComando, () => void>>;

/** Ciò che un pulsante mostra oltre a nome e disponibilità: un altro testo (Esegui che diventa Continua), lo
 * stato di un interruttore (il punto di interruzione), il pannello che apre (la vista dei dati). */
export interface StatoDelComando {
  readonly testo?: string;
  /** Un suggerimento al passaggio del puntatore più lungo del nome (il nome corto che non basta da solo). */
  readonly suggerimento?: string;
  readonly premuto?: boolean;
  readonly apre?: { readonly aperto: boolean; readonly controlla?: string };
  /** Un'altra icona (l'animata in corso). */
  readonly icona?: keyof typeof icone;
  /** Un comando che sceglie fra più valori (la velocità dell'animata): il pulsante mostra il valore scelto e apre un
   * menu con le voci. */
  readonly scelta?: SceltaDelComando;
}
export type Stati = Partial<Record<IdComando, StatoDelComando>>;

export interface SceltaDelComando {
  readonly valore: string;
  readonly voci: readonly { readonly valore: string; readonly testo: string; readonly icona: keyof typeof icone }[];
  readonly scegli: (valore: string) => void;
}

/** Gli attributi comuni a ogni comando reso: chi è, il suggerimento, il tasto per gli ausili, la disponibilità
 * (`aria-disabled` e non `disabled`, che lo toglierebbe al fuoco), l'azione. */
export function attributi(id: IdComando, nome: string, testi: Dizionario, azione: (() => void) | undefined) {
  return {
    "data-comando": id,
    title: suggerimento(id, nome, testi),
    "aria-keyshortcuts": tastoDelComando(id),
    "aria-disabled": azione === undefined,
    onClick: azione,
  };
}

/** I comandi del gruppo dell'esecuzione nella barra (e nella barretta): Entra ed Esci solo se c'è una chiamata. */
export const comandiDellEsecuzione = (conChiamate: boolean): IdComando[] => delGruppo("esecuzione", "barra").filter((id) => conChiamate || (id !== "entra" && id !== "esci"));

/** Un pulsante di un comando del catalogo: l'icona, il testo e, se chiesto, il tasto scritto piccolo accanto. */
export function PulsanteDelComando({
  id,
  testi,
  azione,
  stato,
  conTasto = false,
  soloIcona = false,
}: {
  id: IdComando;
  testi: Dizionario;
  azione: (() => void) | undefined;
  stato?: StatoDelComando;
  conTasto?: boolean;
  /** Il testo fuori dalla vista anche fuori dalla barra (i comandi piccoli della riga di stato). */
  soloIcona?: boolean;
}): ReactElement {
  const c: Comando = catalogo[id];
  const tasto = tastoDelComando(id);
  const nome = stato?.testo ?? testi[c.testo];
  if (stato?.scelta) return <MenuDiUnaScelta id={id} nome={nome} scelta={stato.scelta} />;
  return (
    <button
      type="button"
      className={stili.pulsante}
      {...attributi(id, nome, testi, azione)}
      {...(stato?.suggerimento !== undefined ? { title: stato.suggerimento } : {})}
      aria-pressed={stato?.premuto}
      aria-expanded={stato?.apre?.aperto}
      aria-controls={stato?.apre?.controlla}
    >
      {icone[stato?.icona ?? c.icona]}
      <span className={soloIcona ? `${stili.testo} ${stili.nascosto}` : stili.testo} data-testo>
        {nome}
      </span>
      {conTasto && tasto !== undefined && (
        <span className={stili.tasto} data-tasto aria-hidden="true">
          {tastoMostrato(tasto, testi)}
        </span>
      )}
    </button>
  );
}

/** Un menu chiuso (che sta sparendo) non tiene il fuoco: lo restituisce a chi lo aveva (vedi il menu «Progetto»). */
export const fuocoAChiLAveva = (e: FocusEvent<HTMLDivElement>) => {
  if (e.target === e.currentTarget && e.currentTarget.dataset.state !== "open") (e.relatedTarget as HTMLElement | null)?.focus({ preventScroll: true });
};

/** Il pulsante di un comando che sceglie fra più valori: l'icona e il testo del valore scelto (il nome del comando
 * resta agli ausili e al passaggio del puntatore), e un menu con una voce per valore, segnata quella scelta. La
 * scelta non apre finestre: vale subito, a menu chiuso. */
function MenuDiUnaScelta({ id, nome, scelta }: { id: IdComando; nome: string; scelta: SceltaDelComando }): ReactElement {
  const c: Comando = catalogo[id];
  const scelto = scelta.voci.find((v) => v.valore === scelta.valore);
  return (
    <Menu.Root lazyMount unmountOnExit>
      <Menu.Trigger className={`${stili.pulsante} ${stili.apreMenu}`} data-comando={id} title={nome} aria-label={`${nome}: ${scelto?.testo ?? ""}`}>
        {icone[scelto?.icona ?? c.icona]}
        <span className={stili.testo} data-testo>
          {scelto?.testo}
        </span>
        <span className={stili.freccia} aria-hidden="true">
          ▾
        </span>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner className={stili.posizione}>
          <Menu.Content className={stili.tendina} onFocus={fuocoAChiLAveva}>
            <Menu.RadioItemGroup value={scelta.valore} onValueChange={(d) => scelta.scegli(d.value)}>
              {scelta.voci.map((v) => (
                <Menu.RadioItem key={v.valore} value={v.valore} className={stili.voce} data-valore={v.valore}>
                  <span className={stili.spunta} aria-hidden="true">
                    {v.valore === scelta.valore ? "✓" : ""}
                  </span>
                  {icone[v.icona]}
                  <Menu.ItemText className={stili.testoDellaVoce}>{v.testo}</Menu.ItemText>
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

/** I menu della barra: il pulsante (testo e icona) e le voci. */
const MENU = {
  progetto: { testo: "menuProgetto", icona: "progetto", voci: VOCI_DEL_MENU },
  aiuto: { testo: "menuAiuto", icona: "aiuto", voci: VOCI_DELL_AIUTO },
} as const;

/** Un menu della barra, «Progetto» o «Aiuto»: un pulsante che apre l'elenco delle voci, coi tasti accanto. Una voce non disponibile si
 * raggiunge con le frecce (non è `disabled`, che Ark salterebbe) e non fa nulla né chiude il menu. L'azione
 * parte a menu chiuso, col fuoco rimesso sul suo pulsante: una finestra aperta dalla voce lo trova lì e lì lo
 * riporta quando si chiude. Ark rimette il fuoco in un microtask dopo la scelta: l'azione va nel microtask dopo
 * il suo (prima, il fuoco di Ark ruberebbe quello della finestra appena aperta; in un giro successivo, le
 * lettere scritte subito dopo Invio andrebbero perse). Il
 * menu chiuso non lascia nulla nel documento (i tasti della finestra tacciono finché un menu è aperto).
 *
 * Un menu chiuso (che sta sparendo) non tiene il fuoco: lo restituisce a chi lo aveva. Ark, a ogni freccia, rimette
 * il fuoco nel menu al fotogramma dopo; se intanto il menu si è chiuso, il fuoco andava al menu che sparisce e poi
 * al corpo della pagina: dopo Esc (misurato nei due motori, 4 volte su 16 con la freccia ed Esc nello stesso
 * fotogramma) e dopo una voce, che apre una finestra (in WebKit sotto carico la prima lettera scritta nella
 * finestra andava persa, 1 volta su 10). */
function MenuDeiComandi({ menu, testi, azioni, stati }: { menu: keyof typeof MENU; testi: Dizionario; azioni: Azioni; stati: Stati }): ReactElement {
  const pulsante = useRef<HTMLButtonElement>(null);
  const { testo, icona, voci } = MENU[menu];
  return (
    <Menu.Root
      lazyMount
      unmountOnExit
      onSelect={(d) => {
        const azione = azioni[d.value as IdComando];
        if (azione)
          queueMicrotask(() =>
            queueMicrotask(() => {
              pulsante.current?.focus({ preventScroll: true });
              // Disegnata subito: fuori da un evento React rimanderebbe il disegno a un giro dopo, e in WebKit una
              // lettera scritta subito dopo Invio andava al pulsante (1 volta su 10).
              flushSync(azione);
            }),
          );
      }}
    >
      <Menu.Trigger ref={pulsante} className={`${stili.pulsante} ${stili.apreMenu}`} data-menu={menu} title={testi[testo]}>
        {icone[icona]}
        <span className={stili.testo} data-testo>
          {testi[testo]}
        </span>
        <span className={stili.freccia} aria-hidden="true">
          ▾
        </span>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner className={stili.posizione}>
          <Menu.Content className={stili.tendina} onFocus={fuocoAChiLAveva}>
            {voci.map((v, i) => {
              if (v === "—") return <Menu.Separator key={`linea-${i}`} className={stili.linea} />;
              const c: Comando = catalogo[v];
              const tasto = tastoDelComando(v);
              const disponibile = azioni[v] !== undefined;
              return (
                <Menu.Item
                  key={v}
                  value={v}
                  className={stili.voce}
                  data-comando={v}
                  aria-disabled={!disponibile}
                  aria-keyshortcuts={tasto}
                  closeOnSelect={disponibile}
                >
                  {icone[c.icona]}
                  <span className={stili.testoDellaVoce} data-testo>
                    {stati[v]?.testo ?? testi[c.testo]}
                  </span>
                  {tasto !== undefined && (
                    <span className={stili.tasto} data-tasto aria-hidden="true">
                      {tastoMostrato(tasto, testi)}
                    </span>
                  )}
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export function Barra({
  testi,
  presentazione,
  azioni,
  stati = {},
  completa = true,
  flottante = false,
  velata = false,
  conChiamate = false,
}: {
  testi: Dizionario;
  presentazione: ComandiDellaBarra;
  azioni: Azioni;
  stati?: Stati;
  /** `false` nella pagina di prova dei disegni: solo i comandi dell'applicazione che ci sono. */
  completa?: boolean;
  /** I comandi dell'esecuzione stanno nella barretta: qui restano quelli per cominciare e i punti. */
  flottante?: boolean;
  /** La barretta c'è: il gruppo dell'esecuzione resta al suo posto, ma non si vede. */
  velata?: boolean;
  /** Il progetto ha procedure o funzioni: c'è una chiamata in cui entrare, e i comandi per farlo. */
  conChiamate?: boolean;
}): ReactElement {
  const pulsante = (id: IdComando, conTasto = false) => <PulsanteDelComando key={id} id={id} testi={testi} azione={azioni[id]} stato={stati[id]} conTasto={conTasto} />;
  const esecuzione = comandiDellEsecuzione(conChiamate).filter((id) => !flottante || id !== "ferma");
  const applicazione = delGruppo("applicazione", "barra").filter((id) => completa || azioni[id] !== undefined);
  return (
    <header className={stili.barra} data-presentazione={presentazione}>
      {completa && (
        <div className={stili.gruppi} data-gruppi>
          <div role="group" aria-label={testi.menuProgetto} className={stili.gruppo} data-gruppo="progetto">
            <MenuDeiComandi menu="progetto" testi={testi} azioni={azioni} stati={stati} />
            {delGruppo("progetto", "barra").map((id) => pulsante(id))}
          </div>
          <div role="group" aria-label={testi.modifica} className={stili.gruppo} data-gruppo="modifica">
            {delGruppo("modifica", "barra").map((id) => pulsante(id))}
          </div>
          <div role="group" aria-label={testi.esecuzione} className={velata ? `${stili.gruppo} ${stili.velato}` : stili.gruppo} data-gruppo="esecuzione">
            {esecuzione.map((id) => pulsante(id, true))}
          </div>
          <div role="group" aria-label={testi.gruppoViste} className={`${stili.gruppo} ${stili.spinta}`} data-gruppo="viste">
            {delGruppo("viste", "barra").map((id) => pulsante(id))}
          </div>
        </div>
      )}
      <div role="group" aria-label={testi.gruppoApplicazione} className={`${stili.gruppo} ${stili.applicazione}`} data-gruppo="applicazione">
        {applicazione.map((id) => pulsante(id))}
        {completa && <MenuDeiComandi menu="aiuto" testi={testi} azioni={azioni} stati={stati} />}
      </div>
    </header>
  );
}
