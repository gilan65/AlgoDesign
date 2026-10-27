// Il codice generato, nella colonna a destra del flowchart: le linguette dei linguaggi accesi nel menu delle
// Impostazioni, nel suo ordine, «Copia» e «Salva…», e sotto il codice del linguaggio scelto coi numeri di riga. Il codice e le righe da evidenziare
// li dà la finestra: qui non si genera e non si cerca nulla. Le righe evidenziate sono quelle del blocco corrente (o
// dell'errore che ha fermato l'esecuzione), e a ogni fermata si portano in vista, tutte se ci stanno. Agli ausili sono
// `aria-current="true"`, come la riga corrente della tabella: «step» resta del solo blocco corrente nel flowchart. Con
// procedure e funzioni anche le righe delle chiamate in corso ai livelli di sopra, ognuna con lo sfondo del livello che
// apre (quello delle sue righe nella tabella di traccia). Un progetto che non si scrive nel linguaggio scelto mostra, al
// posto del codice, l'elenco di tutto ciò che manca, una voce per cosa col suo posto sotto: il clic la mostra nel programma.
import { Tabs } from "@ark-ui/react/tabs";
import { memo, useEffect, useRef, type ReactElement } from "react";
import type { Generato } from "../../core/genera/forma";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { paroleDeiLinguaggi, type Linguaggio } from "./codice";
import stili from "./PannelloDelCodice.module.css";

/** Le righe da evidenziare (numeri da 0) e perché: il blocco corrente, o quello dell'errore; il passo dell'esecuzione
 * dice quando portarle in vista (a ogni fermata, non a ogni disegno: in pausa l'utente può scorrere altrove). Le righe
 * delle chiamate in corso, dalla radice in giù, con lo sfondo del livello che ciascuna apre. */
export interface RigheEvidenziate {
  readonly righe: readonly number[];
  readonly genere: "corrente" | "errore";
  readonly passo: number;
  readonly chiamate: readonly { readonly righe: readonly number[]; readonly sfondo: number }[];
}

/** Si ridisegna solo quando cambiano i suoi dati: durante «tutto insieme» la finestra si ridisegna a ogni fetta, il codice
 * no (con un ciclo lungo, 166 righe a ogni fotogramma). Chi lo monta gli dà funzioni che non cambiano. Quante volte si è
 * disegnato lo dice `data-ridisegni`, che le prove nei motori contano (un tempo dipende dalla macchina, un conto no). */
export const PannelloDelCodice = memo(function PannelloDelCodice({
  testi,
  linguaggi,
  linguaggio,
  scegli,
  codice,
  evidenziate,
  copia,
  salva,
  mancanze,
  mostra,
}: {
  testi: Dizionario;
  /** I linguaggi del menu, accesi e nel loro ordine (almeno uno); `linguaggio` è uno di loro. */
  linguaggi: readonly Linguaggio[];
  linguaggio: Linguaggio;
  scegli: (l: Linguaggio) => void;
  codice: Generato;
  evidenziate: RigheEvidenziate | null;
  /** Senza codice (un progetto con errori) i due comandi non sono disponibili. */
  copia: () => void;
  salva: () => void;
  /** Con un progetto che non si scrive nel linguaggio, ciò che manca, nell'ordine del nucleo: la frase e il posto. */
  mancanze: readonly { readonly breve: string; readonly posto: string }[];
  /** Il clic su una voce di ciò che manca, col suo numero: la finestra mostra il posto. */
  mostra: (indice: number) => void;
}): ReactElement {
  const area = useRef<HTMLPreElement>(null);
  const ridisegni = useRef(0);
  ridisegni.current += 1;
  const prima = evidenziate?.righe[0];
  const ultima = evidenziate?.righe.at(-1);
  useEffect(() => {
    // Tutte le righe del blocco, se ci stanno: prima l'ultima, poi la prima (che vince, se non ci stanno).
    const inVista = (n: number | undefined) => n !== undefined && area.current?.querySelector(`[data-riga="${n}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    inVista(ultima);
    inVista(prima);
  }, [prima, ultima, evidenziate?.passo, evidenziate?.genere, linguaggio, codice]);
  const segnate = new Set(evidenziate?.righe);
  // La riga di una chiamata con lo sfondo della chiamata più vicina all'azione, se due la evidenziano.
  const chiamate = new Map((evidenziate?.chiamate ?? []).flatMap((c) => c.righe.map((r) => [r, c.sfondo] as const)));
  const disponibili = codice.generato;
  return (
    <section className={stili.pannello} aria-label={testi.codiceGenerato} data-ridisegni={ridisegni.current}>
      <Tabs.Root value={linguaggio} onValueChange={(d) => scegli(d.value as Linguaggio)} className={stili.pannello}>
        <div className={stili.testa}>
          <Tabs.List className={stili.linguette} aria-label={testi.codiceGenerato}>
            {linguaggi.map((id) => (
              <Tabs.Trigger key={id} value={id} className={stili.linguetta}>
                {testi[paroleDeiLinguaggi[id].nome]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <span className={stili.spazio} />
          <button type="button" className={stili.comando} aria-disabled={!disponibili} onClick={disponibili ? copia : undefined}>
            {testi.codiceCopia}
          </button>
          <button type="button" className={stili.comando} aria-disabled={!disponibili} onClick={disponibili ? salva : undefined}>
            {testi.codiceSalva}
          </button>
        </div>
        {linguaggi.map((id) => (
          <Tabs.Content key={id} value={id} className={stili.scheda}>
            {id !== linguaggio ? null : codice.generato ? (
              <pre ref={area} className={stili.codice} tabIndex={0} aria-label={testi[paroleDeiLinguaggi[id].nome]}>
                <div className={stili.righe}>
                  {codice.righe.map((r, i) => (
                    <div
                      key={i}
                      className={stili.riga}
                      data-riga={i}
                      {...(segnate.has(i) ? { "data-evidenziata": evidenziate!.genere, "aria-current": "true" as const } : chiamate.has(i) ? { "data-chiamata": chiamate.get(i) } : {})}
                    >
                      <span className={stili.numero} aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>{r.testo === "" ? " " : r.testo}</span>
                    </div>
                  ))}
                </div>
              </pre>
            ) : codice.perche === "non-ci-sta" ? (
              <div className={stili.mancanze} role="group" aria-label={testi[paroleDeiLinguaggi[id].nome]}>
                <p className={stili.introduzione}>
                  {riempi(testi.codiceNonCiSta, {
                    linguaggio: testi[paroleDeiLinguaggi[id].nome],
                    quante: mancanze.length === 1 ? testi.mancanzaUna : riempi(testi.mancanzeTante, { n: String(mancanze.length) }),
                  })}
                </p>
                <ul className={stili.elenco}>
                  {mancanze.map((m, i) => (
                    <li key={i}>
                      <button type="button" className={stili.mancanza} data-mancanza={i} onClick={() => mostra(i)}>
                        {m.breve}
                        <span className={stili.posto}>{m.posto}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={stili.nonGenerato}>{codice.perche === "errori-statici" ? testi.codiceConErrori : testi.apriFuoriTappa}</p>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  );
});
