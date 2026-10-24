// Porte del progetto (range 4350-4359, registrate nella mappa globale delle porte), in un posto solo:
// le leggono i server e la configurazione di Playwright. Una porta scritta in due posti diverge, e il
// test che punta dove non risponde nessuno non dice «porta sbagliata»: aspetta e scade.
export const portaSviluppo = 4351;
export const portaAnteprima = 4353;
