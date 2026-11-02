import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { dizionari, linguaDelSistema } from "../i18n/lingue";
import { Applicazione } from "./Applicazione";
import { annotaErrore, ascoltaGliErrori } from "./errori-dell-app";
import { ErroreInatteso } from "./ErroreInatteso";
import { leggiPreferenze, preferenzeDa } from "./preferenze";
import "./tema.css";

// Prima di tutto il resto: un errore dell'avvio non deve sfuggire.
ascoltaGliErrori();

const radice = document.getElementById("radice");
if (!radice) throw new Error("manca l'elemento #radice in index.html");

// La preferenza salvata vince; senza, decide la lingua del sistema. Il file si può modificare a mano,
// quindi un campo che l'app non sa leggere vale come assente, lui solo (`preferenzeDa`). Se il guscio non
// risponde, vale come nessuna preferenza: l'app parte lo stesso (la pagina resterebbe bianca), e l'errore va
// nella console.
const lette = await leggiPreferenze().catch((e: unknown) => {
  annotaErrore("preferenze non lette", e);
  return null;
});
const salvate = preferenzeDa(lette);
const linguaIniziale = salvate.lingua ?? linguaDelSistema(navigator.language);

// La lingua del documento PRIMA del primo render: un lettore di schermo sceglie la voce da qui, e
// `index.html` dice `it` a chiunque. I colori del disegno, perché il primo disegno nasca coi suoi.
document.documentElement.lang = linguaIniziale;
document.documentElement.dataset.colori = salvate.scelte.colori;

// La misura del testo del disegno si fa col carattere vero: prima che sia pronto il canvas userebbe un altro.
await document.fonts.ready;

createRoot(radice).render(
  <StrictMode>
    <ErroreInatteso testi={dizionari[linguaIniziale]}>
      <Applicazione linguaIniziale={linguaIniziale} scelteIniziali={salvate.scelte} />
    </ErroreInatteso>
  </StrictMode>,
);
