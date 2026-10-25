import { en } from "./en";
import { it, type Dizionario } from "./it";

export const dizionari = { it, en } satisfies Record<string, Dizionario>;

export type Lingua = keyof typeof dizionari;

/** Ogni lingua si presenta nella propria lingua: questi nomi non si traducono. */
export const nomiLingue: Record<Lingua, string> = { it: "Italiano", en: "English" };

/** La sigla di ogni lingua nella riga di stato, come quella della tastiera nella barra di Windows: non si traduce. */
export const sigleLingue: Record<Lingua, string> = { it: "ITA", en: "ENG" };

export function linguaValida(valore: unknown): valore is Lingua {
  return typeof valore === "string" && Object.hasOwn(dizionari, valore);
}

/** Riempie un modello del dizionario: ogni `{chiave}` col suo valore. */
export function riempi(modello: string, valori: Record<string, string>): string {
  return modello.replace(/\{(\w+)\}/g, (tutto, chiave: string) => valori[chiave] ?? tutto);
}

/** Lingua del primo avvio (senza preferenza salvata): italiano se il sistema è in italiano, altrimenti inglese. */
export function linguaDelSistema(etichetta: string): Lingua {
  return etichetta.toLowerCase().split("-")[0] === "it" ? "it" : "en";
}
