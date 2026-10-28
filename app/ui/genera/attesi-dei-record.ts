// Il codice atteso dei record, scritto a mano prima dei generatori (un atteso ricavato dal generatore darebbe ragione al
// generatore): `tipi/copia-di-un-record` intero nei tre linguaggi e nelle due lingue, `tipi/record-per-riferimento` e
// `tipi/funzione-con-un-record` interi in italiano nel Python e nel C, col programma di prova della funzione, e la
// provenienza delle righe della copia, una per campo. Il record è una classe di dati nel Python e una `struct` col suo
// `typedef` nel C; la copia col nome si scrive campo per campo, ogni riga col suo campo.
import { programma as delC } from "./attesi-del-c";
import { programma as delPython } from "./attesi-del-python";
import type { Atteso } from "./attesi-dello-pseudocodice";

const testo = (...righe: string[]) => righe.join("\n") + "\n";

/** La classe del record `alunno` del corpus. */
const classe = ["@dataclass", "class alunno:", "    nome: str | None = None", "    classe: str | None = None", "    voto: int | None = None"];
/** Il `typedef` del record `alunno` del corpus, con la riga vuota. */
const struttura = ["typedef struct {", "    char nome[4 * 20 + 1];", "    char classe[4 * 3 + 1];", "    int voto;", "} alunno;", ""];

// ------------------------------------------------------------------------------------- copia-di-un-record

export const copiaPseudocodice: Atteso = {
  it: testo(
    "RECORD alunno",
    "    nome: stringa, al più 20 caratteri",
    "    classe: stringa, al più 3 caratteri",
    "    voto: intero",
    "FINE RECORD",
    "",
    "PROGRAMMA copia-di-un-record",
    "",
    "DATI",
    '    a: alunno ← {"Anna", "3A", 7}',
    "    b: alunno",
    "",
    "REGOLE",
    "    b ← a",
    "    b.voto ← 9",
    '    SCRIVI a.voto, " ", b.voto ↵',
    '    a.nome ← "Bruno"',
    '    SCRIVI a.nome, " ", b.nome ↵',
    "FINE",
  ),
  en: testo(
    "RECORD alunno",
    "    nome: string, at most 20 characters",
    "    classe: string, at most 3 characters",
    "    voto: integer",
    "END RECORD",
    "",
    "PROGRAM copia-di-un-record",
    "",
    "DATA",
    '    a: alunno ← {"Anna", "3A", 7}',
    "    b: alunno",
    "",
    "RULES",
    "    b ← a",
    "    b.voto ← 9",
    '    WRITE a.voto, " ", b.voto ↵',
    '    a.nome ← "Bruno"',
    '    WRITE a.nome, " ", b.nome ↵',
    "END",
  ),
};

const copiaMain = [
  "def main() -> None:",
  '    a: alunno = alunno("Anna", "3A", 7)',
  "    b: alunno = alunno()",
  "    b.nome = a.nome",
  "    b.classe = a.classe",
  "    b.voto = a.voto",
  "    b.voto = 9",
  '    print(a.voto, " ", b.voto, sep="")',
  '    a.nome = "Bruno"',
  '    print(a.nome, " ", b.nome, sep="")',
];
export const copiaPython: Atteso = {
  it: delPython("it", "copia-di-un-record", ["sys"], copiaMain, [], [], undefined, classe),
  en: delPython("en", "copia-di-un-record", ["sys"], copiaMain, [], [], undefined, classe),
};

const mainDellaCopia = (prepara: string) => [
  "int main(void) {",
  '    alunno a = {"Anna", "3A", 7};',
  "    alunno b;",
  "",
  `    ${prepara}();`,
  "    strcpy(b.nome, a.nome);",
  "    strcpy(b.classe, a.classe);",
  "    b.voto = a.voto;",
  "    b.voto = 9;",
  '    printf("%d %d\\n", a.voto, b.voto);',
  '    strcpy(a.nome, "Bruno");',
  '    printf("%s %s\\n", a.nome, b.nome);',
  "    return 0;",
  "}",
];
export const copiaC: Atteso = {
  it: delC("it", { nome: "copia-di-un-record", intestazioni: ["stdio.h", "string.h"], reali: false, usate: ["prepara"], record: struttura, principale: mainDellaCopia("prepara_console") }),
  en: delC("en", { nome: "copia-di-un-record", intestazioni: ["stdio.h", "string.h"], reali: false, usate: ["prepara"], record: struttura, principale: mainDellaCopia("prepare_console") }),
};

/** Le provenienze delle righe che vengono da un blocco, in ordine: il blocco e, per la copia, il campo. */
export const provenienzeDellaCopia = {
  pseudocodice: ["b1", "b2", "b3", "b4", "b5", "fine"],
  python: ["b1/0", "b1/1", "b1/2", "b2", "b3", "b4", "b5"],
  c: ["b1/0", "b1/1", "b1/2", "b2", "b3", "b4", "b5", "fine"],
} as const;

// --------------------------------------------------------------------------------- record-per-riferimento

export const perRiferimentoPython = delPython(
  "it",
  "record-per-riferimento",
  ["sys"],
  [
    "def main() -> None:",
    '    a: alunno = alunno("Anna", "3A", 7)',
    "    c: alunno = alunno()",
    "    s: alunno = alunno()",
    "    a.nome = leggi_stringa(20)",
    "    a = promuovi(a)",
    "    a.voto = raddoppia(a.voto)",
    "    c = crea()",
    "    s.nome = c.nome",
    "    s.classe = c.classe",
    "    s.voto = c.voto",
    "    s = promuovi(s)",
    '    print(a.voto, " ", c.voto, " ", s.voto, " ", a.nome, sep="")',
    "",
    "",
    "def promuovi(r: alunno) -> alunno:",
    "    r.voto = r.voto + 1",
    "    return r",
    "",
    "",
    "def raddoppia(n: int) -> int:",
    "    n = n * 2",
    "    return n",
    "",
    "",
    "def crea() -> alunno:",
    "    r: alunno = alunno()",
    '    r.nome = "Carla"',
    '    r.classe = "2B"',
    "    r.voto = 6",
    "    return r",
  ],
  ["fermati", "leggiRiga", "leggiStringa"],
  [],
  ["main", "promuovi", "raddoppia", "crea"],
  classe,
);

export const perRiferimentoC = delC("it", {
  nome: "record-per-riferimento",
  intestazioni: ["stdio.h", "stdlib.h", "string.h"],
  reali: false,
  usate: ["prepara", "fermati", "leggiRiga", "decodifica", "leggiStringa", "lunghezza"],
  record: struttura,
  prototipi: ["void promuovi(alunno *r);", "void raddoppia(int *n);", "void crea(alunno *r);"],
  principale: [
    "int main(void) {",
    '    alunno a = {"Anna", "3A", 7};',
    "    alunno c;",
    "    alunno s;",
    "",
    "    prepara_console();",
    "    leggi_stringa(a.nome, 20);",
    "    promuovi(&a);",
    "    raddoppia(&a.voto);",
    "    crea(&c);",
    "    strcpy(s.nome, c.nome);",
    "    strcpy(s.classe, c.classe);",
    "    s.voto = c.voto;",
    "    promuovi(&s);",
    '    printf("%d %d %d %s\\n", a.voto, c.voto, s.voto, a.nome);',
    "    return 0;",
    "}",
  ],
  funzioni: [
    ["void promuovi(alunno *r) {", "    r->voto = r->voto + 1;", "}"],
    ["void raddoppia(int *n) {", "    *n = *n * 2;", "}"],
    ["void crea(alunno *r) {", '    strcpy(r->nome, "Carla");', '    strcpy(r->classe, "2B");', "    r->voto = 6;", "}"],
  ],
});

// -------------------------------------------------------------------------------- funzione-con-un-record

const miglioreInPython = [
  "def migliore(p: alunno, q: alunno) -> alunno:",
  "    p = alunno(p.nome, p.classe, p.voto)",
  "    q = alunno(q.nome, q.classe, q.voto)",
  "    r: alunno = alunno()",
  "    if p.voto >= q.voto:",
  "        r.nome = p.nome",
  "        r.classe = p.classe",
  "        r.voto = p.voto",
  "    else:",
  "        r.nome = q.nome",
  "        r.classe = q.classe",
  "        r.voto = q.voto",
  "    return alunno(r.nome, r.classe, r.voto)",
];

export const funzionePython = delPython(
  "it",
  "funzione-con-un-record",
  ["sys"],
  [
    "def main() -> None:",
    '    a: alunno = alunno("Anna", "3A", 7)',
    '    b: alunno = alunno("Bruno", "3B", 9)',
    "    m: alunno = alunno()",
    '    print(migliore(a, b).nome, " ", migliore(a, b).voto, sep="")',
    "    m = migliore(a, b)",
    "    m.voto = 10",
    "    b.voto = 1",
    '    print(b.voto, " ", m.voto, sep="")',
    "",
    "",
    ...miglioreInPython,
  ],
  [],
  [],
  undefined,
  classe,
);

/** Il programma di prova del caso «da-sola» di `migliore`: i campi letti in ordine, la funzione chiamata una volta, una
 * riga per campo del risultato. */
export const provaDellaFunzionePython = delPython(
  "it",
  "funzione-con-un-record",
  ["re", "sys"],
  [
    "def main() -> None:",
    "    p: alunno = alunno(leggi_stringa(20), leggi_stringa(3), leggi_intero())",
    "    q: alunno = alunno(leggi_stringa(20), leggi_stringa(3), leggi_intero())",
    "    _risultato = migliore(p, q)",
    '    print("→ .nome = ", _risultato.nome, sep="")',
    '    print("→ .classe = ", _risultato.classe, sep="")',
    '    print("→ .voto = ", _risultato.voto, sep="")',
    "",
    "",
    ...miglioreInPython,
  ],
  ["fermati", "leggiRiga", "leggiIntero", "leggiStringa"],
  [],
  ["main", "migliore"],
  classe,
);

const miglioreInC = [
  "alunno migliore(alunno p, alunno q) {",
  "    alunno r;",
  "",
  "    if (p.voto >= q.voto) {",
  "        strcpy(r.nome, p.nome);",
  "        strcpy(r.classe, p.classe);",
  "        r.voto = p.voto;",
  "    } else {",
  "        strcpy(r.nome, q.nome);",
  "        strcpy(r.classe, q.classe);",
  "        r.voto = q.voto;",
  "    }",
  "    return r;",
  "}",
];

export const funzioneC = delC("it", {
  nome: "funzione-con-un-record",
  intestazioni: ["stdio.h", "string.h"],
  reali: false,
  usate: ["prepara"],
  record: struttura,
  prototipi: ["alunno migliore(alunno p, alunno q);"],
  principale: [
    "int main(void) {",
    '    alunno a = {"Anna", "3A", 7};',
    '    alunno b = {"Bruno", "3B", 9};',
    "    alunno m;",
    "",
    "    prepara_console();",
    '    printf("%s %d\\n", migliore(a, b).nome, migliore(a, b).voto);',
    "    m = migliore(a, b);",
    "    m.voto = 10;",
    "    b.voto = 1;",
    '    printf("%d %d\\n", b.voto, m.voto);',
    "    return 0;",
    "}",
  ],
  funzioni: [miglioreInC],
});

export const provaDellaFunzioneC = delC("it", {
  nome: "funzione-con-un-record",
  intestazioni: ["limits.h", "stdio.h", "stdlib.h", "string.h"],
  reali: false,
  usate: ["prepara", "fermati", "leggiRiga", "decodifica", "leggiIntero", "quanteCifre", "leggiStringa", "lunghezza"],
  record: struttura,
  prototipi: ["alunno migliore(alunno p, alunno q);"],
  principale: [
    "int main(void) {",
    "    alunno p;",
    "    alunno q;",
    "    alunno _risultato;",
    "",
    "    prepara_console();",
    "    leggi_stringa(p.nome, 20);",
    "    leggi_stringa(p.classe, 3);",
    "    p.voto = leggi_intero();",
    "    leggi_stringa(q.nome, 20);",
    "    leggi_stringa(q.classe, 3);",
    "    q.voto = leggi_intero();",
    "    _risultato = migliore(p, q);",
    '    printf("→ .nome = %s\\n", _risultato.nome);',
    '    printf("→ .classe = %s\\n", _risultato.classe);',
    '    printf("→ .voto = %d\\n", _risultato.voto);',
    "    return 0;",
    "}",
  ],
  funzioni: [miglioreInC],
});
