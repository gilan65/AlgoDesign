// «Dove sei»: in cima alla colonna dell'esecuzione, le procedure e le funzioni attive, dalla radice (il programma
// principale, o la procedura o la funzione eseguita da sola) a quella dell'azione in corso, separate da «›». Ogni nome
// si clicca: mostra la sua scheda col blocco della chiamata (l'ultimo, l'azione in corso). La pila viene dal nucleo
// (`Esecuzione.pila`): qui non si ricalcola nulla.
//
// Con la ricorsione la pila arriva a 500 chiamate, e tutti i nomi riempirebbero la colonna (misurato: 501 nomi alti
// 1195 px, la tabella fuori dalla finestra). Oltre `TUTTI` livelli si vedono il principio e la fine, i primi `PRIMI` e
// gli ultimi `ULTIMI`, e fra loro «…» col numero delle chiamate nascoste, che apre il loro elenco, ognuna col suo livello
// (come gli elementi di un vettore lungo).
import { useRef, useState, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { MenuNelPunto } from "../dati/MenuDellaRiga";
import stili from "./DoveSei.module.css";

export interface LivelloMostrato {
  /** Il nome della procedura o della funzione («Programma principale» per lui). */
  readonly nome: string;
  readonly funzione: string;
  readonly blocco: string;
}

/** Oltre tanti livelli si vedono solo i primi `PRIMI` e gli ultimi `ULTIMI`. */
const TUTTI = 7;
const PRIMI = 2;
const ULTIMI = 3;

export function DoveSei({ livelli, mostra, testi }: { livelli: readonly LivelloMostrato[]; mostra: (livello: number) => void; testi: Dizionario }): ReactElement {
  const [elenco, setElenco] = useState<{ x: number; y: number } | null>(null);
  // Il pulsante che apre l'elenco: Esc ci riporta il fuoco, perché è l'unico modo di riaprirlo.
  const apre = useRef<HTMLButtonElement>(null);
  const corta = livelli.length <= TUTTI;
  const nascosti = corta ? 0 : livelli.length - PRIMI - ULTIMI;
  const nome = (l: LivelloMostrato, i: number) => {
    const ultimo = i === livelli.length - 1;
    return (
      <span key={i} className={stili.livello}>
        {i > 0 && (
          <span className={stili.separatore} aria-hidden="true">
            ›
          </span>
        )}
        <button
          type="button"
          className={stili.nome}
          data-livello={i}
          aria-current={ultimo ? "step" : undefined}
          title={riempi(ultimo ? testi.doveSeiCorrente : testi.doveSeiLivello, { nome: l.nome })}
          onClick={() => mostra(i)}
        >
          {l.nome}
        </button>
      </span>
    );
  };
  return (
    <nav aria-label={testi.doveSei} className={stili.doveSei} data-dove-sei="">
      <span className={stili.titolo}>{testi.doveSei}:</span>
      {corta ? (
        livelli.map(nome)
      ) : (
        <>
          {livelli.slice(0, PRIMI).map(nome)}
          <span className={stili.livello}>
            <span className={stili.separatore} aria-hidden="true">
              ›
            </span>
            <button
              type="button"
              ref={apre}
              className={stili.nascosti}
              data-nascosti={nascosti}
              aria-haspopup="menu"
              title={riempi(testi.doveSeiNascosteSuggerimento, { n: String(nascosti) })}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setElenco({ x: r.left, y: r.bottom });
              }}
            >
              {riempi(testi.doveSeiNascoste, { n: String(nascosti) })}
            </button>
          </span>
          {livelli.slice(-ULTIMI).map((l, k) => nome(l, livelli.length - ULTIMI + k))}
        </>
      )}
      <MenuNelPunto
        dove={elenco}
        nome={testi.doveSeiElenco}
        voci={livelli.slice(PRIMI, PRIMI + nascosti).map((l, k) => ({
          chiave: String(PRIMI + k),
          testo: riempi(testi.doveSeiVoce, { livello: String(PRIMI + k), nome: l.nome }),
          azione: () => {
            setElenco(null);
            mostra(PRIMI + k);
          },
        }))}
        chiudi={(torna) => {
          setElenco(null);
          if (torna) apre.current?.focus();
        }}
      />
    </nav>
  );
}
