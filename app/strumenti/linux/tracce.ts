// Le tracce dell'app su Linux, comuni alle due prove sul prodotto: nel container (`prova.ts`, le voci da `docker diff`)
// e sulla macchina Ubuntu della CI (`prova-ci.ts`, le voci da `find -newer`). Una voce del giro che non è nel giro di
// base sta dentro `data/`, fra le ammesse (cache delle librerie di sistema, l'estrazione del runtime di AppImage), in una
// cartella che contiene solo voci giuste, o fuori dall'elenco; i due rilevatori (fuori dall'elenco; con l'identificatore)
// sono indipendenti, quindi una voce può accenderli entrambi.

export type Voce = { tipo: string; percorso: string };

export type Residuo = { inData: Voce[]; ammesse: Voce[]; cartelle: Voce[]; fuori: Voce[]; conIdentificatore: Voce[] };

/** Elenco dichiarato PRIMA della misura: le sole voci ammesse fuori da `data/`, sotto la cartella personale data e in
 * `/tmp`. Sono cache di librerie di sistema, non dell'app, più la cartella in cui il runtime di AppImage si estrae quando
 * si avvia senza FUSE. Una voce che contiene l'identificatore è rossa anche qui. */
export function ammesse(casa: string): [RegExp, string][] {
  const c = casa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    [new RegExp(`^${c}/\\.cache/fontconfig(/|$)`), "cache dei font (fontconfig)"],
    [new RegExp(`^${c}/\\.cache/mesa_shader_cache(_db)?(/|$)`), "cache degli shader (mesa)"],
    [new RegExp(`^${c}/\\.(cache|config)/dconf(/|$)`), "impostazioni di GTK (dconf)"],
    [/^\/tmp\/appimage_extracted_[0-9a-f]+(\/|$)/, "estrazione del runtime di AppImage senza FUSE"],
    // Sulla macchina della CI systemd crea la cartella privata di un servizio che avvia a richiesta (misurato: quello
    // dell'ora di sistema, `systemd-timedated`, durante il giro dell'app); è del sistema, di root, non dell'app.
    [/^\/tmp\/systemd-private-[0-9a-f]+-[^/]+\.service-[^/]+(\/|$)/, "cartella privata di un servizio di systemd"],
  ];
}

/** Le voci di un giro meno quelle della base, divise per specie (vedi in testa). */
export function residuo(voci: readonly Voce[], base: readonly Voce[], dati: string, casa: string, identificatore: string): Residuo {
  const nellaBase = new Set(base.map((v) => v.percorso));
  const nuove = voci.filter((v) => !nellaBase.has(v.percorso));
  const elenco = ammesse(casa);
  const r: Residuo = { inData: [], ammesse: [], cartelle: [], fuori: [], conIdentificatore: [] };
  const fuoriDaData = nuove.filter((v) => v.percorso !== dati && !v.percorso.startsWith(`${dati}/`));
  r.inData = nuove.filter((v) => !fuoriDaData.includes(v));
  r.ammesse = fuoriDaData.filter((v) => elenco.some(([re]) => re.test(v.percorso)));
  // Una cartella è giusta quando ogni voce nuova sotto di lei lo è: le voci di `data/`, le ammesse e le cartelle giuste
  // più profonde, che quindi si guardano prima (dalla più profonda alla più alta: `~/.cache` prima della casa).
  const giuste = new Set([...r.inData, ...r.ammesse].map((v) => v.percorso));
  const daGuardare = fuoriDaData.filter((v) => !r.ammesse.includes(v)).sort((a, b) => b.percorso.split("/").length - a.percorso.split("/").length);
  const cartelle = new Set<string>();
  for (const v of daGuardare) {
    const figlie = nuove.filter((w) => w.percorso.startsWith(`${v.percorso}/`)).map((w) => w.percorso);
    if (figlie.length > 0 && figlie.every((f) => giuste.has(f))) {
      giuste.add(v.percorso);
      cartelle.add(v.percorso);
    }
  }
  for (const v of fuoriDaData) {
    if (r.ammesse.includes(v)) continue;
    if (cartelle.has(v.percorso)) r.cartelle.push(v);
    else r.fuori.push(v);
  }
  r.conIdentificatore = fuoriDaData.filter((v) => v.percorso.toLowerCase().includes(identificatore.toLowerCase()));
  return r;
}

/** Il controllo positivo del giro senza `data/`: le cartelle col nome dell'identificatore sotto la casa, ciascuna vista
 * da ENTRAMBI i rilevatori. Restituisce quelle viste e, vuoto se acceso, che cosa è spento. */
export function controlloPositivo(senza: Residuo, casa: string, identificatore: string): { viste: string[]; spente: string[] } {
  const viste = senza.conIdentificatore.filter((v) => v.percorso.startsWith(`${casa}/`) && v.percorso.endsWith(`/${identificatore}`)).map((v) => v.percorso);
  const fuori = new Set(senza.fuori.map((v) => v.percorso));
  return {
    viste,
    spente: [...(viste.length > 0 ? [] : [`nessuna cartella dell'identificatore sotto ${casa}`]), ...viste.filter((p) => !fuori.has(p)).map((p) => `rilevatore voci fuori dall'elenco cieco su ${p}`)],
  };
}
