// Le icone della barra, disegnate qui: 18 × 18, un tratto del colore del testo, nessun riempimento.
// Accanto c'è sempre il testo (o il nome accessibile del pulsante), quindi il lettore di schermo le salta.
import type { ReactElement, ReactNode } from "react";
import stili from "./Barra.module.css";

function Icona({ children }: { children: ReactNode }): ReactElement {
  return (
    <svg className={stili.icona} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const icone = {
  /** Un ovale, una freccia e un rombo: un piccolo flowchart. */
  esempio: (
    <Icona>
      <rect x="6" y="1.5" width="6" height="3.5" rx="1.75" />
      <path d="M9 5v2.5M9 7.5l4 3-4 3-4-3zM9 13.5v3" />
    </Icona>
  ),
  /** Un foglio con un «+». */
  nuovo: (
    <Icona>
      <path d="M10.5 2H4.5a1 1 0 00-1 1v12a1 1 0 001 1h9a1 1 0 001-1V6zM10.5 2v4h4M9 8.5v5M6.5 11h5" />
    </Icona>
  ),
  /** Una cartella aperta. */
  apri: (
    <Icona>
      <path d="M2 14.5V3.5a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1V7M2 14.5L4.5 8h12l-2.5 6.5z" />
    </Icona>
  ),
  /** Un dischetto. */
  salva: (
    <Icona>
      <path d="M2.5 3.5a1 1 0 011-1h9l3 3v9a1 1 0 01-1 1h-11a1 1 0 01-1-1zM5.5 2.5v4h6v-4M5 15.5v-5h8v5" />
    </Icona>
  ),
  /** Un dischetto con una matita. */
  salvaConNome: (
    <Icona>
      <path d="M8 15.5H3.5a1 1 0 01-1-1v-11a1 1 0 011-1h9l3 3v3M5.5 2.5v4h6v-4M5 15.5v-5h4M11 16.5l.5-2 4-4 1.5 1.5-4 4z" />
    </Icona>
  ),
  /** Tre libri su un ripiano, l'ultimo inclinato: una libreria. */
  libreria: (
    <Icona>
      <path d="M2 16h14M3.5 15.5V3h3v12.5M7.5 15.5V5h3v10.5M11.5 15.5l1.7-9.8 2.8.5-1.7 9.3" />
    </Icona>
  ),
  /** Una freccia che scende in un vassoio: ciò che entra nel progetto. */
  importa: (
    <Icona>
      <path d="M9 2v9M5.5 7.5L9 11l3.5-3.5M2.5 11.5v3a1 1 0 001 1h11a1 1 0 001-1v-3" />
    </Icona>
  ),
  /** Un foglio con le righe di un modulo. */
  progetto: (
    <Icona>
      <rect x="3" y="2" width="12" height="14" rx="1" />
      <path d="M6 6h6M6 9h6M6 12h3.5" />
    </Icona>
  ),
  /** Una «f» corsiva con un «+»: una funzione nuova. */
  funzione: (
    <Icona>
      <path d="M10 3.5c-1.5-1-3 0-3.3 1.6L5.2 13c-.3 1.6-1.8 2.6-3.2 1.6M4 7.5h5M13 9.5v5M10.5 12h5" />
    </Icona>
  ),
  /** Un elenco di tre righe con il segno del salto: le procedure e le funzioni del progetto. */
  funzioni: (
    <Icona>
      <rect x="2" y="3" width="14" height="12" rx="1" />
      <path d="M4.5 3v12M13.5 3v12M6.5 7h5M6.5 9.5h5M6.5 12h3" />
    </Icona>
  ),
  /** Una tabella. */
  dati: (
    <Icona>
      <rect x="2" y="3" width="14" height="12" rx="1" />
      <path d="M2 7h14M2 11h14M7 3v12" />
    </Icona>
  ),
  /** Una tabella con una riga segnata da una freccia: la tabella di traccia. */
  tabella: (
    <Icona>
      <rect width="11.5" height="13" x="4.5" y="2.5" rx="1" />
      <path d="M4.5 6.5h11.5M4.5 10.5h11.5M8.5 2.5v13M1 8.5l2 0M2 7.5l1 1-1 1" />
    </Icona>
  ),
  /** Due parentesi angolari e una barra: il codice. */
  codice: (
    <Icona>
      <path d="M6 5L2.5 9 6 13M12 5l3.5 4-3.5 4M10.5 3.5l-3 11" />
    </Icona>
  ),
  /** Un foglio con una freccia che esce. */
  esporta: (
    <Icona>
      <path d="M10.5 2H4.5a1 1 0 00-1 1v12a1 1 0 001 1h9a1 1 0 001-1v-3M10.5 2v4h4v1.5M8 10h9M14.5 7.5L17 10l-2.5 2.5" />
    </Icona>
  ),
  riduci: (
    <Icona>
      <circle cx="7.5" cy="7.5" r="5" />
      <path d="M11.2 11.2l4.8 4.8M5 7.5h5" />
    </Icona>
  ),
  cento: (
    <Icona>
      <circle cx="7.5" cy="7.5" r="5" />
      <path d="M11.2 11.2l4.8 4.8M6.5 5.5l1.2-.8v5.6" />
    </Icona>
  ),
  ingrandisci: (
    <Icona>
      <circle cx="7.5" cy="7.5" r="5" />
      <path d="M11.2 11.2l4.8 4.8M5 7.5h5M7.5 5v5" />
    </Icona>
  ),
  /** Quattro angoli intorno a un riquadro. */
  adatta: (
    <Icona>
      <path d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4" />
      <rect x="6" y="6" width="6" height="6" rx="1" />
    </Icona>
  ),
  /** Una freccia che torna indietro piegando. */
  annulla: (
    <Icona>
      <path d="M6 3.5L2.5 7 6 10.5M2.5 7h9a4 4 0 010 8h-4" />
    </Icona>
  ),
  /** La stessa, verso avanti. */
  ripeti: (
    <Icona>
      <path d="M12 3.5l3.5 3.5-3.5 3.5M15.5 7h-9a4 4 0 000 8h4" />
    </Icona>
  ),
  /** Le forbici. */
  taglia: (
    <Icona>
      <circle cx="4.5" cy="13.5" r="2.5" />
      <circle cx="13.5" cy="13.5" r="2.5" />
      <path d="M6.3 11.7L14 2M11.7 11.7L4 2" />
    </Icona>
  ),
  /** Due fogli. */
  copia: (
    <Icona>
      <rect x="6" y="6" width="10" height="10" rx="1" />
      <path d="M12 6V3a1 1 0 00-1-1H3a1 1 0 00-1 1v8a1 1 0 001 1h3" />
    </Icona>
  ),
  /** Un cestino. */
  elimina: (
    <Icona>
      <path d="M2.5 4.5h13M7 4.5V2.5h4v2M4 4.5l1 11h8l1-11M7.5 7.5v5M10.5 7.5v5" />
    </Icona>
  ),
  /** Un triangolo verso destra. */
  esegui: (
    <Icona>
      <path d="M5 3l10 6-10 6z" />
    </Icona>
  ),
  /** Una freccia che scende piegando: un'azione sola. */
  passo: (
    <Icona>
      <path d="M3 4h7a4 4 0 014 4v6M10.5 11l3.5 3.5 3.5-3.5" />
    </Icona>
  ),
  /** Una freccia che scende in un riquadro aperto: dentro la chiamata. */
  entra: (
    <Icona>
      <path d="M9 2v8M5.5 6.5L9 10l3.5-3.5M3 12v4h12v-4" />
    </Icona>
  ),
  /** Una freccia che sale fuori da un riquadro aperto: fuori dalla chiamata. */
  esci: (
    <Icona>
      <path d="M9 11V3M5.5 6.5L9 3l3.5 3.5M3 12v4h12v-4" />
    </Icona>
  ),
  /** Un triangolo verso destra con le scie: l'esecuzione animata. */
  animata: (
    <Icona>
      <path d="M7 3l9 6-9 6zM1.5 6h3M1 9h4M1.5 12h3" />
    </Icona>
  ),
  /** Due barre: l'animata in corso, che un clic mette in pausa. */
  pausaAnimata: (
    <Icona>
      <path d="M6 4v10M12 4v10" />
    </Icona>
  ),
  /** Uno, due e tre segni «›»: le velocità dell'animata. */
  velocitaLenta: (
    <Icona>
      <path d="M7 5l4 4-4 4" />
    </Icona>
  ),
  velocitaMedia: (
    <Icona>
      <path d="M4 5l4 4-4 4M9 5l4 4-4 4" />
    </Icona>
  ),
  velocitaVeloce: (
    <Icona>
      <path d="M2 5l4 4-4 4M7 5l4 4-4 4M12 5l4 4-4 4" />
    </Icona>
  ),
  /** Un quadrato. */
  ferma: (
    <Icona>
      <rect width="10" height="10" x="4" y="4" rx="1" />
    </Icona>
  ),
  /** Il pallino del punto di interruzione. */
  punto: (
    <Icona>
      <circle cx="9" cy="9" r="5" />
    </Icona>
  ),
  /** Il pallino barrato. */
  togliPunti: (
    <Icona>
      <circle cx="9" cy="9" r="5" />
      <path d="M3 15L15 3" />
    </Icona>
  ),
  /** Tre cursori di regolazione. */
  impostazioni: (
    <Icona>
      <path d="M2 4h3.5M8.5 4H16M2 9h8.5M13.5 9H16M2 14h2.5M7.5 14H16" />
      <circle cx="7" cy="4" r="1.5" />
      <circle cx="12" cy="9" r="1.5" />
      <circle cx="6" cy="14" r="1.5" />
    </Icona>
  ),
  /** Un punto di domanda in un cerchio. */
  aiuto: (
    <Icona>
      <circle cx="9" cy="9" r="7" />
      <path d="M7 7.2a2 2 0 113 1.6c-.7.4-1 .8-1 1.6M9 12.6v.6" />
    </Icona>
  ),
  /** Un libro aperto. */
  guida: (
    <Icona>
      <path d="M9 4.5C7.5 3.3 5 3 2 3.2v10.3c3-.2 5.5.1 7 1.3 1.5-1.2 4-1.5 7-1.3V3.2c-3-.2-5.5.1-7 1.3zM9 4.5v10.3" />
    </Icona>
  ),
  /** Una «i» in un cerchio. */
  informazioni: (
    <Icona>
      <circle cx="9" cy="9" r="7" />
      <path d="M9 8v5M9 5.2v.6" />
    </Icona>
  ),
};
