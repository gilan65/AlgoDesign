// Il comando `stampa` di `algodesign-tools`: da un progetto la pagina con due testi di codice affiancati, da aprire nel
// browser e stampare con Ctrl+P. Senza `--linguaggi`, il TypeScript e il suo JavaScript, riga per riga, che hanno le stesse
// righe; con `--linguaggi`, due linguaggi del registro, il primo a sinistra, allineati blocco per blocco.
//
//   bun run tools stampa <progetto.algo> [--linguaggi <primo> <secondo>] [--lingua it|en] [-o cartella]
//
// Scrive `<progetto> (<primo> e <secondo>).html` accanto al progetto o nella cartella di `-o`, e stampa `SCRITTO <file>`;
// un file che c'è già si sostituisce, e stampa `SOSTITUITO <file>`: la pagina si rifà dal progetto. Senza `--linguaggi` scrive
// anche la pagina di prova (`pagina-di-prova.ts`), `<progetto> (prova).html`, col JavaScript da eseguire nel browser: una riga
// per file. I due file si scrivono insieme o per niente: se il secondo non si scrive, il primo torna com'era.
//
// Esce con 1, senza scrivere nulla, su un progetto che non si legge o non è valido, con errori statici (una riga per
// errore), che un linguaggio non sa scrivere (il numero di ciò che manca), una cartella che non c'è, un file che non si
// scrive; con 2, insieme al modo d'uso, su un'opzione sbagliata, un linguaggio che non c'è o scritto due volte. La forma
// senza tipi non è un linguaggio a scelta: si affianca al solo linguaggio di cui è la forma.
//
// CHE COSA NON FA: aprire il browser o stampare; l'elenco di ciò che manca, che è nell'app; i messaggi in inglese: `--lingua`
// è la lingua della pagina e del nome del file.
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { controlla, tetti } from "../core/controllo/controllo";
import type { Generato } from "../core/genera/forma";
import { linguaggi, type FormaSenzaTipi, type Linguaggio, type VoceDelLinguaggio } from "../core/genera/linguaggi";
import { apri } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import { testiDeiCodici } from "../i18n/codici";
import { dizionari, type Lingua } from "../i18n/lingue";
import { paroleDeiLinguaggi } from "../ui/genera/codice";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import { paginaAffiancata, type Allineamento } from "./colonne";
import { paginaDiProva } from "./pagina-di-prova";

/** Ciò che lo strumento legge del registro: una prova gli può dare un registro con una voce in più. */
export type VoceDaAffiancare = Pick<VoceDelLinguaggio, "id" | "genera"> & { readonly formaSenzaTipi?: FormaSenzaTipi };
export type Colonnina = { readonly nome: (lingua: Lingua) => string; readonly italiano: string; readonly genera: VoceDelLinguaggio["genera"] };

/** Il nome di un linguaggio nei dizionari, per identificatore. */
const nomeNelDizionario = (id: string, lingua: Lingua): string => dizionari[lingua][paroleDeiLinguaggi[id as Linguaggio].nome];
/** Il nome della forma senza tipi: è un nome proprio, lo stesso nelle due lingue, e non è nei dizionari perché la forma non ha una linguetta. */
const JAVASCRIPT = "JavaScript";

/** Le due colonne chieste, o il motivo per cui non si può. Con `nomi` assente, il linguaggio che ha la forma senza tipi e la sua forma. */
export function scegliColonne(
  nomi: readonly [string, string] | undefined,
  registro: readonly VoceDaAffiancare[] = linguaggi,
  nomeDi: (id: string, lingua: Lingua) => string = nomeNelDizionario,
): { colonne: readonly [Colonnina, Colonnina]; allineamento: Allineamento } | { motivo: string } {
  const colonna = (v: VoceDaAffiancare): Colonnina => ({ nome: (l) => nomeDi(v.id, l), italiano: nomeDi(v.id, "it"), genera: v.genera });
  if (nomi === undefined) {
    const v = registro.find((x) => x.formaSenzaTipi !== undefined)!;
    return { colonne: [colonna(v), { nome: () => JAVASCRIPT, italiano: JAVASCRIPT, genera: v.formaSenzaTipi!.genera }], allineamento: "per-riga" };
  }
  const validi = registro.map((v) => v.id).join(", ");
  const [primo, secondo] = nomi.map((n) => n.toLowerCase()) as [string, string];
  for (const n of [primo, secondo]) {
    const dellaForma = registro.find((v) => v.formaSenzaTipi !== undefined && (v.formaSenzaTipi.id === n || n === JAVASCRIPT.toLowerCase()));
    if (dellaForma !== undefined && !registro.some((v) => v.id === n)) return { motivo: `${JAVASCRIPT} non è un linguaggio a scelta: si affianca al solo ${nomeDi(dellaForma.id, "it")}, con stampa senza --linguaggi` };
    if (!registro.some((v) => v.id === n)) return { motivo: `il linguaggio ${n} non c'è: sono ${validi}` };
  }
  if (primo === secondo) return { motivo: `${primo} è scritto due volte: scegli due linguaggi diversi fra ${validi}` };
  const voce = (n: string) => registro.find((v) => v.id === n)!;
  return { colonne: [colonna(voce(primo)), colonna(voce(secondo))], allineamento: "per-blocco" };
}

const eLaParola: Readonly<Record<Lingua, string>> = { it: "e", en: "and" };

/** Il nome del file della pagina, senza la cartella. */
export const nomeDellaPagina = (progetto: string, colonne: readonly [Colonnina, Colonnina], lingua: Lingua): string => `${progetto} (${colonne[0].nome(lingua)} ${eLaParola[lingua]} ${colonne[1].nome(lingua)}).html`;

/** La pagina di un progetto, o le righe che dicono perché non c'è. */
export function paginaDelProgetto(p: Progetto, colonne: readonly [Colonnina, Colonnina], allineamento: Allineamento, lingua: Lingua, percorso: string): { testo: string } | { errori: readonly string[] } {
  const parole = paroleDelloPseudocodice(lingua);
  const senza = (g: Generato, c: Colonnina): readonly string[] => {
    if (g.generato) return [];
    switch (g.perche) {
      case "errori-statici": {
        const r = controlla(p, tetti);
        return r.fuoriTappa ? [`${percorso}: ha costrutti che questa versione non esegue`] : r.errori.map((e) => `${percorso}: il progetto ha un errore, ${testiDeiCodici.it[e.code as keyof typeof testiDeiCodici.it].breve}`);
      }
      case "non-ci-sta":
        return [`${percorso} non ci sta in «${c.italiano}»: ${g.mancanze.length === 1 ? "manca una cosa" : `mancano ${g.mancanze.length} cose`} (l'elenco è nell'app, nella linguetta «${c.italiano}»)`];
      case "fuori-tappa":
        return [`${percorso}: ha costrutti che questa versione non esegue`];
      case "non-ancora":
        return [`${percorso}: «${c.italiano}» non sa ancora scrivere ${g.costrutto}`];
    }
  };
  const [a, b] = colonne;
  const ga = a.genera(p, tetti, lingua, parole);
  const gb = b.genera(p, tetti, lingua, parole);
  // Due volte lo stesso errore statico, uno per colonna, si dice una volta.
  const errori = [...new Set([...senza(ga, a), ...senza(gb, b)])];
  if (!ga.generato || !gb.generato) return { errori };
  const d = dizionari[lingua];
  const pagina = paginaAffiancata(
    [
      { titolo: a.nome(lingua), righe: ga.righe },
      { titolo: b.nome(lingua), righe: gb.righe },
    ],
    allineamento,
    p.functions.map((f) => f.id),
    { lingua, testa: `${p.metadata.name} · ${a.nome(lingua)} ${eLaParola[lingua]} ${b.nome(lingua)}`, pagina: d.stampaPagina },
  );
  return { testo: pagina.testo };
}

const provaLaParola: Readonly<Record<Lingua, string>> = { it: "prova", en: "test" };

/** Il nome del file della pagina di prova, senza la cartella. */
export const nomeDellaPaginaDiProva = (progetto: string, lingua: Lingua): string => `${progetto} (${provaLaParola[lingua]}).html`;

/** La pagina di prova di un progetto dalla colonna del JavaScript, o niente se non genera: i motivi li dice già l'altra pagina. */
export function paginaDiProvaDelProgetto(p: Progetto, javascript: Colonnina, lingua: Lingua): string | undefined {
  const g = javascript.genera(p, tetti, lingua, paroleDelloPseudocodice(lingua));
  return g.generato ? paginaDiProva(g.righe, { lingua, titolo: `${p.metadata.name} · ${provaLaParola[lingua]}` }) : undefined;
}

/** Scrive i file insieme: se uno non si scrive, quelli già scritti tornano com'erano (o spariscono), e il motivo è l'esito. */
export function scriviInsieme(file: readonly { readonly percorso: string; readonly testo: string }[]): { righe: readonly string[] } | { motivo: string } {
  const fatti: { percorso: string; prima: Buffer | undefined }[] = [];
  const righe: string[] = [];
  for (const { percorso, testo } of file) {
    const cera = existsSync(percorso);
    try {
      const prima = cera ? readFileSync(percorso) : undefined;
      writeFileSync(percorso, testo, "utf8");
      fatti.push({ percorso, prima });
    } catch (e) {
      for (const f of fatti) {
        if (f.prima === undefined) rmSync(f.percorso, { force: true });
        else writeFileSync(f.percorso, f.prima);
      }
      return { motivo: `${percorso} non si scrive: ${(e as Error).message}` };
    }
    righe.push(`${cera ? "SOSTITUITO" : "SCRITTO"} ${percorso}`);
  }
  return { righe };
}

/** Il comando: `argomenti` senza il suo nome, `comando` come lo scrive chi lo usa. Esce con `process.exit` dove serve. */
export function comandoStampa(argomenti: readonly string[], comando: string): void {
  const modoDUso = `Scrive una pagina HTML con due testi di codice affiancati: si apre nel browser e si stampa con Ctrl+P, su carta o in PDF.
Senza --linguaggi scrive anche la pagina di prova, col JavaScript da eseguire nel browser: input e output nella pagina.

  ${comando} <progetto.algo> [--linguaggi <primo> <secondo>] [--lingua it|en] [-o cartella]
  ${comando} -h

  <progetto.algo>                 il progetto
  --linguaggi <primo> <secondo>   due linguaggi, il primo a sinistra, con le righe allineate blocco per blocco:
                                  ${linguaggi.map((v) => v.id).join(", ")} (senza: TypeScript e JavaScript)
  --lingua it|en                  la lingua del codice e della pagina (senza: it)
  -o cartella                     dove scrivere (senza: accanto al progetto); i file che ci sono già si sostituiscono
  -h                              mostra questo aiuto

Esempio:
  ${comando} esercizio.algo
  ${comando} esercizio.algo --linguaggi pseudocodice c
`;
  const sbagliato = (motivo: string): never => {
    console.error(`${motivo}\n\n${modoDUso}`);
    process.exit(2);
  };
  const ferma = (...righe: readonly string[]): never => {
    for (const r of righe) console.log(`ERRORE ${r}`);
    process.exit(1);
  };
  if (argomenti.includes("-h")) {
    console.log(modoDUso);
    process.exit(0);
  }
  let percorso: string | undefined;
  let nomi: readonly [string, string] | undefined;
  let lingua: Lingua = "it";
  let cartella: string | undefined;
  for (let i = 0; i < argomenti.length; i++) {
    const a = argomenti[i]!;
    const valore = () => {
      const v = argomenti[++i];
      return v === undefined || v.startsWith("-") ? sbagliato(`${a} vuole un valore`) : v;
    };
    if (a === "--linguaggi") {
      const uno = argomenti[i + 1];
      const due = argomenti[i + 2];
      if (uno === undefined || due === undefined || uno.startsWith("-") || due.startsWith("-")) sbagliato("--linguaggi vuole due linguaggi");
      nomi = [uno!, due!];
      i += 2;
    } else if (a === "--lingua") {
      const v = valore();
      if (v !== "it" && v !== "en") sbagliato("--lingua vuole it o en");
      lingua = v as Lingua;
    } else if (a === "-o") cartella = valore();
    else if (a.startsWith("-")) sbagliato(`l'opzione ${a} non c'è`);
    else if (percorso === undefined) percorso = a;
    else sbagliato(`un progetto alla volta: ${a} è in più`);
  }
  if (percorso === undefined) sbagliato("manca il progetto da stampare");
  const file = percorso!;
  const scelta = scegliColonne(nomi);
  if ("motivo" in scelta) return sbagliato(scelta.motivo);
  const dove = cartella ?? dirname(file);
  if (cartella !== undefined && !statSync(cartella, { throwIfNoEntry: false })?.isDirectory()) ferma(`${cartella} non è una cartella`);
  try {
    let testo = "";
    try {
      testo = readFileSync(file, "utf8");
    } catch (e) {
      ferma(`${file} non si legge: ${(e as Error).message}`);
    }
    const a = apri(testo);
    if (!a.ok) return ferma(`${file} non è un file di AlgoDesign valido`);
    const pagina = paginaDelProgetto(a.progetto, scelta.colonne, scelta.allineamento, lingua, file);
    if ("errori" in pagina) return ferma(...pagina.errori);
    const progetto = basename(file, extname(file));
    const daScrivere = [{ percorso: join(dove, nomeDellaPagina(progetto, scelta.colonne, lingua)), testo: pagina.testo }];
    if (nomi === undefined) {
      const prova = paginaDiProvaDelProgetto(a.progetto, scelta.colonne[1], lingua);
      if (prova === undefined) return ferma(`${file}: la pagina di prova non si scrive, il JavaScript non c'è`);
      daScrivere.push({ percorso: join(dove, nomeDellaPaginaDiProva(progetto, lingua)), testo: prova });
    }
    const esito = scriviInsieme(daScrivere);
    if ("motivo" in esito) return ferma(esito.motivo);
    for (const r of esito.righe) console.log(r);
  } catch (e) {
    // Un errore che lo strumento non prevede: il messaggio, non la traccia.
    ferma(`${file}: ${(e as Error).message}`);
  }
}
