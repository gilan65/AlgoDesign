export const nomeApplicazione = "AlgoDesign";

/** Titolo della finestra: il nome del progetto aperto, se c'è, seguito da quello dell'applicazione. */
export function titoloFinestra(nomeProgetto?: string): string {
  const nome = nomeProgetto?.trim();
  return nome ? `${nome} — ${nomeApplicazione}` : nomeApplicazione;
}
