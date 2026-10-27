// Il guscio simulato decide «Salva con nome» (e «Esporta la tabella», con «.csv», e «Salva…» del codice generato,
// con l'estensione del linguaggio) come il guscio vero: la stessa tabella di casi che legge `cargo test`
// (`shell/src/salva-con-nome.json`), coi casi della tabella esportata e del codice segnati dalla loro estensione.
// Tutte le righe, anche quelle che `cargo test` salta su un disco che non distingue le maiuscole: qui i nomi si
// confrontano esatti. Le cartelle della tabella non sono file, quindi non fanno chiedere.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { linguaggi } from "../core/genera/linguaggi";
import { estensioniDellImmagine } from "../ui/file";
import { daSalvare, type Estensione } from "./salva-con-nome";

const casi = JSON.parse(readFileSync(new URL("../shell/src/salva-con-nome.json", import.meta.url), "utf8")) as {
  casi: { scelto: string; esistono: string[]; cartelle?: string[]; percorso: string; sostituire: boolean; maiuscoleDistinte?: boolean; estensione?: Estensione }[];
};

test("la tabella ha solo chiavi note, la riga col segno delle maiuscole e quella col file scelto e il finale che esistono", () => {
  // Una chiave scritta male non vale come assente (la rifiuta anche `cargo test`).
  const note = ["scelto", "esistono", "cartelle", "percorso", "sostituire", "maiuscoleDistinte", "estensione"];
  expect(casi.casi.flatMap((c) => Object.keys(c).filter((k) => !note.includes(k)))).toEqual([]);
  expect(casi.casi.filter((c) => c.maiuscoleDistinte).length).toBe(1);
  const specie = casi.casi.filter((c) => !c.maiuscoleDistinte && c.scelto !== c.percorso && c.esistono.includes(c.scelto) && c.esistono.includes(c.percorso));
  expect(specie.length).toBeGreaterThan(0);
});

test("il guscio simulato decide «Salva con nome», «Esporta la tabella» e «Salva…» del codice come il guscio vero, caso per caso", () => {
  const sbagliati = casi.casi.flatMap((c) => {
    const estensione = c.estensione ?? ".algo";
    const visto = daSalvare(`C:\\cartella\\${c.scelto}`, (p) => c.esistono.map((n) => `C:\\cartella\\${n}`).includes(p), estensione);
    const atteso = { percorso: `C:\\cartella\\${c.percorso}`, sostituire: c.sostituire };
    return JSON.stringify(visto) === JSON.stringify(atteso) ? [] : [`${c.scelto} (${estensione}) con ${JSON.stringify(c.esistono)}: ${JSON.stringify(visto)}`];
  });
  expect(sbagliati).toEqual([]);
  // La tabella ha le due risposte (una decisione sempre uguale non passerebbe) e tutte le estensioni: il progetto, la
  // tabella, quella di ogni linguaggio del registro (un linguaggio con un'estensione nuova vuole le sue righe) e quelle
  // del flowchart esportato.
  const chiede = casi.casi.filter((c) => c.sostituire).length;
  expect(chiede > 0 && chiede < casi.casi.length).toBe(true);
  const estensioni = new Set(casi.casi.map((c) => c.estensione ?? ".algo"));
  const attese: Estensione[] = [".algo", ".csv", ...linguaggi.map((v) => v.estensione), ...estensioniDellImmagine];
  expect([...estensioni].sort()).toEqual([...new Set(attese)].sort());
});
