// I nomi che il codice generato usa per sé, nelle lingue del codice: le funzioni di supporto (quelle che fanno ciò
// che fa il C, nella lingua dell'interfaccia), i nomi di Python che il programma generato legge (le funzioni
// predefinite, i moduli, `main`) e quelli del C (la libreria, le macro delle intestazioni). Nessun dato può chiamarsi
// così: il controllo statico li aggiunge ai nomi riservati, in tutte le lingue insieme, perché un progetto non cambi
// validità cambiando la lingua.
//
// I nomi scelti per sé dal generatore quando serve un dato in più (l'indice calcolato prima del valore o della
// chiamata, l'indice nascosto di un `per ogni`, con un numero dal secondo livello: `_indice2`; un argomento calcolato
// prima della chiamata, `_valore`; nel C il parametro da cui si copia un vettore o una stringa senza *rif*, `_da_w`)
// cominciano col trattino basso, che nessun
// nome di dato può avere: non si riservano. Nessun nome qui finisce con `_<numero>`,
// la forma del nome della copia di un dato (`voto_2`): copiare un dato non dà mai un nome riservato.
//
// Le funzioni di supporto che corrispondono a un operatore a parola ne portano il nome nella stessa lingua.

export type LinguaDelCodice = "it" | "en";

export const funzioniDiSupporto = [
  "fermati", "leggiRiga", "leggiIntero", "leggiReale", "leggiCarattere", "leggiStringa", "leggiBooleano", "dividi", "mod",
  "elevatoA", "arrotonda", "perDifetto", "perEccesso", "parteIntera", "convertiACarattere", "convertiAVettore",
  "convertiAStringa", "carattereDi", "nellaStringa", "concatenazione", "alPiu", "elementiDiversi", "reale", "booleano",
  "entraNellaRicorsione", "esciDallaRicorsione",
] as const;
export type FunzioneDiSupporto = (typeof funzioniDiSupporto)[number];

export const nomiDelSupporto: Readonly<Record<LinguaDelCodice, Readonly<Record<FunzioneDiSupporto, string>>>> = {
  it: {
    fermati: "fermati",
    leggiRiga: "leggi_riga",
    leggiIntero: "leggi_intero",
    leggiReale: "leggi_reale",
    leggiCarattere: "leggi_carattere",
    leggiStringa: "leggi_stringa",
    leggiBooleano: "leggi_booleano",
    dividi: "dividi",
    mod: "mod",
    elevatoA: "elevato_a",
    arrotonda: "arrotonda",
    perDifetto: "per_difetto",
    perEccesso: "per_eccesso",
    parteIntera: "parte_intera",
    convertiACarattere: "converti_a_carattere",
    convertiAVettore: "converti_a_vettore",
    convertiAStringa: "converti_a_stringa",
    carattereDi: "carattere_di",
    nellaStringa: "nella_stringa",
    concatenazione: "concatena",
    alPiu: "al_piu",
    elementiDiversi: "elementi_diversi",
    reale: "reale",
    booleano: "booleano",
    entraNellaRicorsione: "entra_nella_ricorsione",
    esciDallaRicorsione: "esci_dalla_ricorsione",
  },
  en: {
    fermati: "halt",
    leggiRiga: "read_line",
    leggiIntero: "read_integer",
    leggiReale: "read_real",
    leggiCarattere: "read_character",
    leggiStringa: "read_string",
    leggiBooleano: "read_boolean",
    dividi: "divide",
    mod: "mod",
    elevatoA: "raised_to",
    arrotonda: "round",
    perDifetto: "round_down",
    perEccesso: "round_up",
    parteIntera: "integer_part",
    convertiACarattere: "to_character",
    convertiAVettore: "to_array",
    convertiAStringa: "to_string",
    carattereDi: "character_at",
    nellaStringa: "into_string",
    concatenazione: "concatenate",
    alPiu: "at_most",
    elementiDiversi: "distinct_elements",
    reale: "real",
    booleano: "boolean",
    entraNellaRicorsione: "enter_recursion",
    esciDallaRicorsione: "leave_recursion",
  },
};

/** I due contatori delle funzioni che richiamano sé stesse (le funzioni del giro), a livello di file nel C e di modulo
 * nel Python: le chiamate in corso e lo spazio dei loro dati, in byte. Nel C un nome a livello di file non può
 * cominciare col trattino basso: si riservano. */
export const contatoriDellaRicorsione: Readonly<Record<LinguaDelCodice, { readonly chiamate: string; readonly spazio: string }>> = {
  it: { chiamate: "chiamate_in_corso", spazio: "spazio_in_uso" },
  en: { chiamate: "calls_in_progress", spazio: "space_in_use" },
};

/** I nomi di Python che il programma generato legge: le funzioni predefinite, i tipi delle annotazioni, le eccezioni, i
 * moduli e `main`. */
export const nomiDiPython = [
  "main", "print", "int", "float", "str", "bool", "list", "tuple", "set", "abs", "len", "ord", "chr", "sys", "math", "re",
  "UnicodeDecodeError",
] as const;

/** Il nome che il generatore dà all'indice calcolato prima del valore, e all'indice nascosto di un `per ogni`. */
export const nomeDellIndice: Readonly<Record<LinguaDelCodice, string>> = { it: "_indice", en: "_index" };
/** Il nome che il generatore dà a un argomento calcolato prima della riga della chiamata (`_valore`, `_valore2`), e nel C
 * a una parte di un'espressione messa da parte perché un'altra si può fermare. */
export const nomeDelValore: Readonly<Record<LinguaDelCodice, string>> = { it: "_valore", en: "_value" };
/** Nel C, il nome del parametro da cui una funzione copia un vettore o una stringa passati senza *rif* (`_da_w`): il
 * dato `w` è la copia. */
export const prefissoDellaCopia: Readonly<Record<LinguaDelCodice, string>> = { it: "_da_", en: "_from_" };
/** Nel C, il parametro che una funzione del giro riceve per primo: la riga della chiamata (`__LINE__`), che il suo
 * arresto per i tetti della ricorsione scrive. */
export const nomeDellaRiga: Readonly<Record<LinguaDelCodice, string>> = { it: "_riga", en: "_line" };
/** Il nome che il generatore dà al risultato vettore o stringa di una funzione, dentro la funzione e nel programma di
 * prova (`_risultato`), e alla sorgente di un `per ogni` su una funzione, chiamata una volta (`_sorgente`, `_sorgente2`). */
export const nomeDelRisultato: Readonly<Record<LinguaDelCodice, string>> = { it: "_risultato", en: "_result" };
export const nomeDellaSorgente: Readonly<Record<LinguaDelCodice, string>> = { it: "_sorgente", en: "_source" };
/** Nel Python, l'elemento di un vettore di stringhe che passa dal controllo della lunghezza in una lista nuova
 * (`[al_piu(_elemento, 5) for _elemento in nomi()]`). */
export const nomeDellElemento: Readonly<Record<LinguaDelCodice, string>> = { it: "_elemento", en: "_element" };
/** Nel C, la struttura che porta il vettore (`.v`) o la stringa (`.s`) che una funzione restituisce: una per funzione. È
 * un nome di struttura, che nel C sta fra i nomi delle strutture e non si scontra coi nomi dei dati e delle funzioni. */
export const strutturaDelRisultato = (lingua: LinguaDelCodice, funzione: string): string =>
  lingua === "it" ? `struct risultato_${funzione}` : `struct ${funzione}_result`;

/** L'indice di livello `n` (da 1): quello di un `per ogni` dentro `n - 1` altri, o quello calcolato prima del valore
 * dentro `n - 1` cicli `per ogni`. `_indice`, poi `_indice2`, `_indice3`. */
export const indiceDelLivello = (lingua: LinguaDelCodice, n: number): string => (n === 1 ? nomeDellIndice[lingua] : `${nomeDellIndice[lingua]}${n}`);

// Il C ha in più le funzioni del testo in UTF-8 (che nel Python fa il linguaggio), della console e della scrittura di
// un carattere. Una funzione che si ferma riceve la riga del programma: la macro col nome della funzione di supporto
// la chiama con `__LINE__`, e la funzione vera ha il nome col seguito della riga. `concatena` scrive il risultato in
// un'area nuova a ogni chiamata, con la funzione vera dal nome col seguito dell'area.

export const funzioniDelC = ["preparaConsole", "decodifica", "codifica", "quanteCifre", "lunghezza", "concatena", "scriviCarattere"] as const;
export type FunzioneDelC = (typeof funzioniDelC)[number];

export const nomiDelSupportoDelC: Readonly<Record<LinguaDelCodice, Readonly<Record<FunzioneDelC, string>>>> = {
  it: {
    preparaConsole: "prepara_console",
    decodifica: "decodifica",
    codifica: "codifica",
    quanteCifre: "quante_cifre",
    lunghezza: "lunghezza",
    concatena: "concatena",
    scriviCarattere: "scrivi_carattere",
  },
  en: {
    preparaConsole: "prepare_console",
    decodifica: "decode",
    codifica: "encode",
    quanteCifre: "count_digits",
    lunghezza: "length",
    concatena: "concatenate",
    scriviCarattere: "write_character",
  },
};

/** Le funzioni di supporto che nel C ricevono la riga del programma (si possono fermare e sono chiamate dalle funzioni
 * del programma). */
export const conLaRigaNelC: readonly FunzioneDiSupporto[] = [
  "leggiIntero", "leggiReale", "leggiCarattere", "leggiStringa", "leggiBooleano", "carattereDi", "convertiACarattere",
  "convertiAVettore", "convertiAStringa", "nellaStringa", "alPiu", "elementiDiversi",
];
export const seguitoDellaRiga: Readonly<Record<LinguaDelCodice, string>> = { it: "_alla_riga", en: "_with_line" };
export const seguitoDellArea: Readonly<Record<LinguaDelCodice, string>> = { it: "_in", en: "_into" };

/** I nomi della libreria del C che il programma generato legge, e le parole del C23 (il gcc 15 compila in C23 se non
 * gli si dice altro). */
export const nomiDelC = [
  "main", "printf", "fprintf", "fwrite", "getchar", "setvbuf", "exit", "strtoll", "strtod", "strcpy", "strcat", "strcmp",
  "strlen", "memmove", "memcpy", "pow", "sqrt", "fabs", "abs", "round", "floor", "ceil", "trunc", "isinf", "SetConsoleOutputCP",
  "SetConsoleCP", "alignas", "alignof", "bool", "constexpr", "false", "nullptr", "static_assert", "thread_local", "true",
  "typeof", "typeof_unqual",
] as const;

/** Le macro senza parametri che le intestazioni del programma generato definiscono con `-std=c11` (misurate con gcc 15.3
 * di MSYS, clang 23 di llvm-mingw e gcc 13.3 di Linux, nomi senza trattino basso iniziale): un dato con uno di questi
 * nomi romperebbe il C. */
export const macroDelleIntestazioni: readonly string[] = (
  "AIO_LISTIO_MAX AIO_MAX AIO_PRIO_DELTA_MAX ARG_MAX BUFSIZ CHAR_BIT CHAR_MAX CHAR_MIN CHILD_MAX DEFAULT_LOCALE " +
  "DELAYTIMER_MAX DUMMYSTRUCTNAME DUMMYSTRUCTNAME1 DUMMYSTRUCTNAME2 DUMMYSTRUCTNAME3 DUMMYSTRUCTNAME4 DUMMYSTRUCTNAME5 " +
  "DUMMYUNIONNAME DUMMYUNIONNAME1 DUMMYUNIONNAME2 DUMMYUNIONNAME3 DUMMYUNIONNAME4 DUMMYUNIONNAME5 DUMMYUNIONNAME6 " +
  "DUMMYUNIONNAME7 DUMMYUNIONNAME8 DUMMYUNIONNAME9 EDOM EOF ERANGE EXIT_FAILURE EXIT_SUCCESS FILENAME_MAX FILESIZEBITS " +
  "FOPEN_MAX FP_ILOGB0 FP_ILOGBNAN FP_INFINITE FP_NAN FP_NORMAL FP_SUBNORMAL FP_ZERO F_OK HOST_NAME_MAX HUGE HUGE_VAL " +
  "HUGE_VALF HUGE_VALL INFINITY INT_MAX INT_MIN LINK_MAX LLONG_MAX LLONG_MIN LOGIN_NAME_MAX LONG_LONG_MAX LONG_LONG_MIN " +
  "LONG_MAX LONG_MIN L_tmpnam L_tmpnam_s MATH_ERREXCEPT MATH_ERRNO MAX_CANON MAX_INPUT MB_CUR_MAX MB_LEN_MAX MQ_OPEN_MAX " +
  "MQ_PRIO_MAX NAME_MAX NAN NL_ARGMAX NL_NMAX NULL OPEN_MAX O_ACCMODE O_APPEND O_BINARY O_CREAT O_EXCL O_NOINHERIT " +
  "O_RANDOM O_RAW O_RDONLY O_RDWR O_SEQUENTIAL O_TEMPORARY O_TEXT O_TRUNC O_WRONLY PAGESIZE PATH_MAX PIPE_BUF " +
  "PTHREAD_DESTRUCTOR_ITERATIONS PTHREAD_KEYS_MAX PTHREAD_STACK_MIN P_tmpdir RAND_MAX RTSIG_MAX R_OK SCHAR_MAX SCHAR_MIN " +
  "SEEK_CUR SEEK_END SEEK_SET SEM_VALUE_MAX SHRT_MAX SHRT_MIN SIGQUEUE_MAX SIZE_MAX SSIZE_MAX STDERR_FILENO STDIN_FILENO " +
  "STDOUT_FILENO STREAM_MAX SYMLINK_MAX SYMLOOP_MAX SYS_OPEN TIMER_MAX TMP_MAX TMP_MAX_S TTY_NAME_MAX UCHAR_MAX UINT_MAX " +
  "ULLONG_MAX ULONG_LONG_MAX ULONG_MAX UNALIGNED USE___UUIDOF USHRT_MAX WAIT_ANY WAIT_MYPGRP WCONTINUED WEOF WNOHANG " +
  "WSTOPSIG WUNTRACED W_OK XATTR_LIST_MAX XATTR_NAME_MAX XATTR_SIZE_MAX X_OK bool environ errno false math_errhandling " +
  "matherr onexit_t pclose popen stderr stdin stdout sys_errlist sys_nerr true wcswcs wpopen"
).split(" ");

/** I nomi che le intestazioni del programma generato dichiarano a livello di file (funzioni, variabili e tipi della
 * libreria, macro con parametri), misurati con `-std=c11` sui tre compilatori (gcc 15.3 di MSYS, clang 23 di
 * llvm-mingw, gcc 13.3 di Linux: un nome che fa fallire `static const int NOME = 1;` dopo le intestazioni, o una macro
 * con parametri). Una costante comune o una procedura col nome di una di queste non compila; un dato dentro una funzione
 * sì (copre il nome della libreria, e il codice generato non la usa): il controllo statico li riserva solo per i nomi a
 * livello di file. */
export const nomiDelleIntestazioni: readonly string[] = (
  "FILE FP_INFINITE FP_NAN FP_NORMAL FP_SUBNORMAL FP_ZERO LC_ID LPLC_ID WCOREDUMP WEXITSTATUS WIFCONTINUED " +
  "WIFEXITED WIFSIGNALED WIFSTOPPED WTERMSIG abort abs access acos acosf acosh acoshf acoshl acosl aligned_alloc " +
  "alloca asin asinf asinh asinhf asinhl asinl at_quick_exit atan atan2 atan2f atan2l atanf atanh atanhf atanhl " +
  "atanl atexit atof atoi atol atoll bsearch bsearch_s calloc cbrt cbrtf cbrtl ceil ceilf ceill chdir chmod chsize " +
  "clearerr clearerr_s close copysign copysignf copysignl cos cosf cosh coshf coshl cosl creat creat64 div div_t " +
  "double_t dup dup2 ecvt eof erf erfc erfcf erfcl erff erfl errno_t exit exp exp2 exp2f exp2l expf expl expm1 " +
  "expm1f expm1l fabs fabsf fabsl fclose fcloseall fcvt fdim fdimf fdiml fdopen feof ferror fflush fgetc fgetchar " +
  "fgetpos fgetpos64 fgets fgetwc fgetws filelength fileno float_t floor floorf floorl flushall fma fmaf fmal fmax " +
  "fmaxf fmaxl fmin fminf fminl fmod fmodf fmodl fopen fopen64 fopen_s fpclassify fpos_t fprintf fprintf_s fpurge " +
  "fputc fputchar fputs fputwc fputws fread fread_s free freopen freopen64 freopen_s frexp frexpf frexpl fscanf " +
  "fscanf_s fseek fseeko fseeko64 fsetpos fsetpos64 ftell ftello ftello64 fwprintf fwprintf_s fwrite fwscanf " +
  "fwscanf_s gamma gammaf gcvt getc getchar getcwd getdelim getenv getenv_s getline getprogname gets gets_s getw " +
  "getwc getwchar hypot hypotf hypotl ilogb ilogbf ilogbl infinity infinityf intptr_t isatty isfinite isgreater " +
  "isgreaterequal isinf isless islessequal islessgreater isnan isnormal isunordered itoa labs ldexp ldexpf ldexpl " +
  "ldiv ldiv_t lgamma lgammaf lgammal llabs lldiv lldiv_t llrint llrintf llrintl llround llroundf llroundl locking " +
  "log log10 log10f log10l log1p log1pf log1pl log2 log2f log2l logb logbf logbl logf logl lrint lrintf lrintl " +
  "lround lroundf lroundl lseek lseek64 ltoa malloc max_align_t mblen mbstate_t mbstowcs mbstowcs_s mbtowc memalign " +
  "memccpy memchr memcmp memcpy memcpy_s memicmp memmove memmove_s mempcpy memset mkdir mkdtemp mkstemp mktemp modf " +
  "modff modfl nan nanf nanl nearbyint nearbyintf nearbyintl nextafter nextafterf nextafterl nexttoward nexttowardf " +
  "nexttowardl off32_t off64_t off_t offsetof onexit open open64 perror pow powf powl printf printf_s " +
  "pthreadlocinfo pthreadmbcinfo ptrdiff_t putc putchar putenv puts putw putwc putwchar qsort qsort_s quick_exit " +
  "rand read realloc remainder remainderf remainderl remove remquo remquof remquol rename rewind rint rintf rintl " +
  "rmdir rmtmp round roundf roundl rsize_t scalbln scalblnf scalblnl scalbn scalbnf scalbnl scanf scanf_s setbuf " +
  "setmode setprogname setvbuf signbit signgam sin sincos sincosf sincosl sinf sinh sinhf sinhl sinl size_t " +
  "snprintf snwprintf sopen sprintf sprintf_s sqrt sqrtf sqrtl srand sscanf sscanf_s ssize_t stderr stdin stdout " +
  "strcasecmp strcat strcat_s strchr strcmp strcmpi strcoll strcpy strcpy_s strcspn strdup strerror strerror_s " +
  "stricmp strlen strlwr strlwr_l strncasecmp strncat strncat_s strncmp strncpy strncpy_s strnicmp strnlen " +
  "strnlen_s strnset strpbrk strrchr strrev strset strspn strstr strtod strtof strtok strtok_r strtok_s strtol " +
  "strtold strtoll strtosigno strtoul strtoull strupr strxfrm swab swprintf swprintf_s swscanf swscanf_s system tan " +
  "tanf tanh tanhf tanhl tanl tell tempnam tgamma tgammaf tgammal time_t tmpfile tmpfile64 tmpfile_s tmpnam " +
  "tmpnam_s trunc truncf truncl uintptr_t ultoa umask ungetc ungetwc unlink va_list vfprintf vfprintf_s vfscanf " +
  "vfscanf_s vfwprintf vfwprintf_s vfwscanf vfwscanf_s vprintf vprintf_s vscanf vscanf_s vsnprintf vsnprintf_s " +
  "vsnwprintf vsprintf vsprintf_s vsscanf vsscanf_s vswprintf vswprintf_s vswscanf vswscanf_s vwprintf vwprintf_s " +
  "vwscanf vwscanf_s wchar_t wcscat wcscat_s wcschr wcscmp wcscoll wcscpy wcscpy_s wcscspn wcsdup wcsicmp wcsicoll " +
  "wcslen wcslwr wcsncat wcsncat_s wcsncmp wcsncpy wcsncpy_s wcsnicmp wcsnlen wcsnlen_s wcsnset wcspbrk wcsrchr " +
  "wcsrev wcsset wcsspn wcsstr wcstod wcstof wcstok wcstok_s wcstol wcstold wcstombs wcstombs_s wcstoul wcsupr " +
  "wcsxfrm wctomb wctomb_s wctype_t wint_t wprintf wprintf_s write wscanf wscanf_s"
).split(" ");

/** I nomi che il C generato usa per sé, nelle due lingue: le funzioni di supporto (comuni col Python e sue), quelle
 * vere dietro le macro, la libreria, le macro delle intestazioni. */
const nomiDelCGenerato = (Object.keys(nomiDelSupporto) as LinguaDelCodice[]).flatMap((l) => [
  ...Object.values(nomiDelSupportoDelC[l]),
  ...conLaRigaNelC.map((f) => nomiDelSupporto[l][f] + seguitoDellaRiga[l]),
  nomiDelSupportoDelC[l].concatena + seguitoDellArea[l],
]);

/** Tutti i nomi che il codice generato usa per sé, in ogni lingua: riservati. */
export const nomiRiservatiDeiGeneratori: readonly string[] = [
  ...new Set([
    ...Object.values(nomiDelSupporto).flatMap((n) => Object.values(n)),
    ...Object.values(contatoriDellaRicorsione).flatMap((n) => Object.values(n)),
    ...nomiDiPython,
    ...nomiDelCGenerato,
    ...nomiDelC,
    ...macroDelleIntestazioni,
  ]),
];
