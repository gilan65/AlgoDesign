// La finestra che risponde, misurata nella pagina: la soglia, un giro di andata e ritorno con la pagina, il fotogramma più
// lungo in un intervallo e un campionatore acceso per tutta una corsa. Per le prove nuove: le tre che hanno la loro copia
// (`casi.e2e.ts`, `esecuzione.e2e.ts`, `programmi-pesanti.e2e.ts`) la tengono fino a chi le tocca.
import type { Page } from "@playwright/test";

/** La soglia della finestra che risponde: dal gesto all'effetto, e il fotogramma più lungo. */
export const SOGLIA_MS = 1_000;

/** Un giro di andata e ritorno con la pagina, in millisecondi. */
export async function risposta(page: Page): Promise<number> {
  const t0 = Date.now();
  await page.evaluate(() => 1);
  return Date.now() - t0;
}

/** Il fotogramma più lungo nei prossimi `ms` millisecondi, misurato nella pagina, e quanti ne arrivano. */
export const fotogrammi = (page: Page, ms: number) =>
  page.evaluate(
    (durata) =>
      new Promise<{ n: number; peggiore: number }>((fatto) => {
        let prima = performance.now();
        let n = 0;
        let peggiore = 0;
        const fine = prima + durata;
        const giro = (t: number) => {
          peggiore = Math.max(peggiore, t - prima);
          prima = t;
          n++;
          if (t < fine) requestAnimationFrame(giro);
          else fatto({ n, peggiore: Math.round(peggiore) });
        };
        requestAnimationFrame(giro);
      }),
    ms,
  );

/** Accende nella pagina un campionatore del fotogramma più lungo, da adesso: lo legge `fotogrammaPeggiore`. */
export const accendiIlCampionatore = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __peggiore: number; __giro?: number };
    w.__peggiore = 0;
    let prima = performance.now();
    const giro = (t: number) => {
      w.__peggiore = Math.max(w.__peggiore, t - prima);
      prima = t;
      w.__giro = requestAnimationFrame(giro);
    };
    w.__giro = requestAnimationFrame(giro);
  });

/** Il fotogramma più lungo da quando il campionatore è acceso; lo spegne. */
export const fotogrammaPeggiore = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __peggiore: number; __giro?: number };
    if (w.__giro !== undefined) cancelAnimationFrame(w.__giro);
    return Math.round(w.__peggiore);
  });
