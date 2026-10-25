// Le sonde della politica di sicurezza dei contenuti: per ogni direttiva della politica del prodotto (`politica.ts`) una o
// più cose vietate fatte nella pagina, e la violazione che la pagina deve annotare (`securitypolicyviolation`: la
// direttiva effettiva e ciò che è stato fermato). Le usano la prova nell'anteprima del build (`e2e/finestra.e2e.ts`) e la
// prova sul prodotto (`prova-portabile.ts`, sulla WebView2). Le direttive della politica e quelle delle sonde si
// appaiano nei due versi: una direttiva nuova senza sonda è rossa.
//
// `default-src` non ha una violazione sua: si vede da una richiesta che nessuna altra direttiva governa (un video), che
// la pagina annota col nome della direttiva effettiva («media-src»).
//
// Le direttive delle risorse (video, immagine, carattere, oggetto) hanno due sonde: una incorporata (`data:`) e una da un
// indirizzo esterno. Ognuna è fermata da `'self'` e da `'none'`, ma una politica allargata ne lascia passare una sola:
// con `data:` la prima, con un indirizzo o `https:` la seconda, che allora finisce senza violazione.

export interface Sonda {
  readonly nome: string;
  /** La direttiva della politica che la ferma. */
  readonly direttiva: string;
  /** La violazione annotata: direttiva effettiva e ciò che è stato fermato. */
  readonly attesa: string;
}

const altrove = "https://algodesign.invalid/";

export const sonde: readonly Sonda[] = [
  { nome: "un video incorporato", direttiva: "default-src", attesa: "media-src data" },
  { nome: "un video da un indirizzo esterno", direttiva: "default-src", attesa: `media-src ${altrove}` },
  { nome: "uno script scritto nella pagina", direttiva: "script-src", attesa: "script-src-elem inline" },
  { nome: "un testo eseguito come codice", direttiva: "script-src", attesa: "script-src eval" },
  { nome: "uno stile scritto nella pagina", direttiva: "style-src", attesa: "style-src-elem inline" },
  { nome: "un'immagine incorporata", direttiva: "img-src", attesa: "img-src data" },
  { nome: "un'immagine da un indirizzo esterno", direttiva: "img-src", attesa: `img-src ${altrove}` },
  { nome: "un carattere incorporato", direttiva: "font-src", attesa: "font-src data" },
  { nome: "un carattere da un indirizzo esterno", direttiva: "font-src", attesa: `font-src ${altrove}` },
  { nome: "una richiesta a un indirizzo esterno", direttiva: "connect-src", attesa: `connect-src ${altrove}` },
  { nome: "un oggetto incorporato", direttiva: "object-src", attesa: "object-src data" },
  // Per un oggetto la pagina annota l'origine dell'indirizzo, senza la barra finale (misurato in Chromium).
  { nome: "un oggetto da un indirizzo esterno", direttiva: "object-src", attesa: "object-src https://algodesign.invalid" },
  { nome: "un indirizzo di base", direttiva: "base-uri", attesa: `base-uri ${altrove}` },
  // Il metodo GET aggiunge all'indirizzo i campi del modulo (nessuno): resta il «?».
  { nome: "un modulo spedito altrove", direttiva: "form-action", attesa: `form-action ${altrove}?` },
];

/** Le differenze fra le direttive della politica (`direttiva valori; …`) e quelle delle sonde, nei due versi. */
export function direttiveSenzaSonda(politica: string): string[] {
  const dellaPolitica = new Set(politica.split(";").map((d) => d.trim().split(/\s+/)[0]!).filter((d) => d !== ""));
  const delleSonde = new Set(sonde.map((s) => s.direttiva));
  return [...[...dellaPolitica].filter((d) => !delleSonde.has(d)).map((d) => `${d} senza sonda`), ...[...delleSonde].filter((d) => !dellaPolitica.has(d)).map((d) => `sonda di ${d}, che la politica non ha`)];
}

/** Gira NELLA PAGINA (si passa a `evaluate`, quindi non usa nulla di questo modulo): fa la cosa vietata della sonda e
 * restituisce la prima violazione annotata («direttiva effettiva» e ciò che è stato fermato, con un indirizzo `data:`
 * ridotto a «data»), o «nessuna violazione» dopo due secondi. Ciò che la sonda aggiunge alla pagina lo toglie. */
export function provaLaSonda(nome: string): Promise<string> {
  const altrove = "https://algodesign.invalid/";
  const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  return new Promise<string>((fatto) => {
    const aggiunti: Element[] = [];
    const fine = (esito: string) => {
      document.removeEventListener("securitypolicyviolation", vista);
      for (const e of aggiunti) e.remove();
      fatto(esito);
    };
    const vista = (e: SecurityPolicyViolationEvent) => fine(`${e.effectiveDirective} ${e.blockedURI.startsWith("data:") ? "data" : e.blockedURI}`);
    document.addEventListener("securitypolicyviolation", vista);
    setTimeout(() => fine("nessuna violazione"), 2_000);
    const metti = <T extends Element>(e: T, dove: Element = document.body): T => {
      aggiunti.push(e);
      dove.append(e);
      return e;
    };
    switch (nome) {
      case "un video incorporato":
      case "un video da un indirizzo esterno": {
        const v = document.createElement("video");
        v.src = nome === "un video incorporato" ? "data:video/mp4;base64,AAAA" : altrove;
        metti(v);
        break;
      }
      case "uno script scritto nella pagina": {
        const s = document.createElement("script");
        s.textContent = "window.__sondaEseguita__ = true;";
        metti(s, document.head);
        break;
      }
      case "un testo eseguito come codice":
        // Al giro dopo, fuori dalla chiamata della prova: `evaluate` passa da `Runtime.evaluate`, che durante la propria
        // chiamata permette `eval` anche contro la politica (misurato: «nessuna violazione» chiamato di qui).
        setTimeout(() => {
          try {
            // Indiretto: la sonda vuole proprio l'esecuzione di un testo, che la politica deve fermare.
            (0, eval)("1");
          } catch {
            // La politica la ferma con un errore, e annota la violazione.
          }
        }, 0);
        break;
      case "uno stile scritto nella pagina": {
        const s = document.createElement("style");
        s.textContent = "body { outline: 1px solid red; }";
        metti(s, document.head);
        break;
      }
      case "un'immagine incorporata":
      case "un'immagine da un indirizzo esterno": {
        const i = document.createElement("img");
        i.src = nome === "un'immagine incorporata" ? pixel : altrove;
        metti(i);
        break;
      }
      case "un carattere incorporato":
      case "un carattere da un indirizzo esterno":
        void new FontFace("sonda", `url(${nome === "un carattere incorporato" ? pixel : altrove})`).load().catch(() => undefined);
        break;
      case "una richiesta a un indirizzo esterno":
        void fetch(altrove).catch(() => undefined);
        break;
      case "un oggetto incorporato":
      case "un oggetto da un indirizzo esterno": {
        const o = document.createElement("object");
        o.data = nome === "un oggetto incorporato" ? "data:text/plain,x" : altrove;
        metti(o);
        break;
      }
      case "un indirizzo di base": {
        const b = document.createElement("base");
        b.href = altrove;
        metti(b, document.head);
        break;
      }
      case "un modulo spedito altrove": {
        // Dentro una cornice nascosta: se la politica non lo fermasse, la pagina dell'app resterebbe dov'è. Il nome prima
        // di entrare nella pagina: dato dopo, sulla WebView2 il modulo non trova la cornice, cerca una finestra nuova che
        // il guscio non apre, e non c'è nessuna violazione da vedere (misurato).
        const cornice = document.createElement("iframe");
        cornice.name = "sonda-del-modulo";
        cornice.hidden = true;
        metti(cornice);
        const modulo = metti(document.createElement("form"));
        modulo.action = altrove;
        modulo.method = "get";
        modulo.target = "sonda-del-modulo";
        modulo.submit();
        break;
      }
      default:
        fine(`sonda sconosciuta: ${nome}`);
    }
  });
}
