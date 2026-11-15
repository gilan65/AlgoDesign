# AlgoDesign: guida ai file di Flowgorithm

Questa guida è per chi ha già dei programmi scritti con **Flowgorithm**, un'altra applicazione per i flowchart didattici, e vuole portarli in AlgoDesign: studenti con i propri esercizi, docenti con il materiale di anni di lezioni. AlgoDesign non apre i file di Flowgorithm (`.fprg`) direttamente: li converte lo strumento a riga di comando `algodesign-tools`, con il comando `flowgorithm`, in progetti di AlgoDesign (`.algo`). La guida dice che cosa diventa ogni parte di un programma, che cosa non si converte e perché, e che cosa cambia quando il programma convertito si esegue.

Tutto ciò che la guida dice del comportamento di Flowgorithm è **misurato su Flowgorithm 4.5**, con programmi di prova scritti apposta. Come si usa AlgoDesign è nella guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`); lo strumento e i suoi altri comandi sono nella guida ad `algodesign-tools` (`GUIDA-AD-ALGODESIGN-TOOLS.md`).

## 1. Che cosa fa la conversione

Un file `.fprg` diventa un progetto `.algo` che scrive lo stesso output: lo stesso programma, fatto coi blocchi e coi dati di AlgoDesign. Il programma principale di Flowgorithm (`Main`) diventa il programma principale, le sue procedure e funzioni restano procedure e funzioni, e le dichiarazioni diventano i dati della vista dei dati, ognuno nella procedura o funzione che lo dichiara.

Dove AlgoDesign scrive il programma in un altro modo, con lo stesso risultato, lo strumento lo dice con una riga `TRASFORMAZIONE` (§3 e §5). Se il programma usa qualcosa che AlgoDesign non ha, il file non si converte: una riga `ERRORE` dice perché e in quale riga del file (§4). Il file di Flowgorithm non cambia mai.

Il progetto convertito si apre in AlgoDesign come gli altri: si esegue passo passo con la tabella di traccia, si modifica e si traduce in codice.

## 2. Come si usa il comando

Per Windows lo strumento è un'applicazione a sé, `algodesign-tools.exe`, in un pacchetto a parte, `AlgoDesign-Tools-1.0.0-windows.zip`, accanto a quello di AlgoDesign: si estrae dove si preferisce, nasce la cartella `AlgoDesign-Tools-1.0.0` e non chiede di installare nulla. Si usa da **PowerShell**: in Esplora file, nella cartella dello strumento, si scrive `powershell` nella barra dell'indirizzo e si preme Invio (su Windows 11 va bene anche il tasto destro nella cartella, «Apri nel Terminale»); negli esempi si scrive `.\algodesign-tools` (PowerShell non avvia un'applicazione della cartella senza `.\`). Per Linux lo strumento è `algodesign-tools`, nell'archivio `AlgoDesign-Tools-1.0.0-linux-x64.tar.gz`: si usa dal terminale aperto nella sua cartella, con `./algodesign-tools`. Per il Mac è lo stesso, nell'archivio `AlgoDesign-Tools-1.0.0-macos-universal.zip`, dal Terminale.

```sh
.\algodesign-tools flowgorithm media.fprg
.\algodesign-tools flowgorithm esercizi -o convertiti -r
```

Si dà un file, più file separati da virgole o da spazi, oppure una cartella: si convertono i file `.fprg` che contiene, non quelli delle sottocartelle. Ogni `.algo` prende il nome del suo `.fprg` e va accanto a lui, o nella cartella di `-o`.

| Opzione | Che cosa fa |
|---|---|
| `-o` | la cartella dove scrivere i `.algo`, che deve esserci già; senza, accanto a ciascun `.fprg` |
| `-r` | rinomina un dato dichiarato di nuovo con un altro tipo o un'altra dimensione, o un nome riservato in AlgoDesign; senza, quel file non si converte (§5) |
| `-s` | sostituisce un `.algo` che c'è già; senza, quel file non si converte |
| `-h` | mostra l'aiuto |

Per ogni file lo strumento mostra le sue righe `TRASFORMAZIONE` e poi `SCRITTO` col nome del `.algo` (`SOSTITUITO` con `-s`), oppure una riga `ERRORE`; con più file l'ultima riga è il conto:

```text
TRASFORMAZIONE esercizi\conta.fprg, riga 16: il «per» di i diventa un «mentre» equivalente: il corpo cambia il contatore o il passo non è un numero scritto
SCRITTO convertiti\conta.algo
ERRORE esercizi\onda.fprg, riga 14: La funzione «Sin» di Flowgorithm non ha un equivalente in questa versione di AlgoDesign.
CONVERTITI 1 file su 2
```

Se un file non si converte, gli altri si convertono lo stesso e lo strumento esce con 1 invece di 0. Con `-o`, di due file con lo stesso nome in cartelle diverse si converte solo il primo.

## 3. Che cosa si converte

| In Flowgorithm (nel file) | In AlgoDesign |
|---|---|
| il programma principale (`Main`) | il programma principale |
| una funzione senza tipo di ritorno | una procedura |
| una funzione con un tipo e la variabile del risultato | una funzione, che restituisce quella variabile |
| un parametro semplice | un parametro per valore (in Flowgorithm passa per copia) |
| un vettore passato a una procedura | un parametro per riferimento, *rif* (in Flowgorithm i vettori passano per riferimento); **per uscita**, *out*, se la procedura lo scrive senza leggerlo |
| un vettore passato a una funzione che non lo cambia | un parametro per valore |
| una dichiarazione (`declare`, anche di più nomi) | un dato della vista dei dati (§5): `Integer` intero, `Real` reale, `String` stringa, `Boolean` booleano; un vettore con la sua dimensione |
| un'assegnazione (`assign`) | un'Assegnazione |
| un input (`input`) | una Lettura |
| un output (`output`), con o senza a capo | una Scrittura, con o senza «Va a capo» |
| `if`, `while` | Se, Mentre |
| il ciclo con la condizione in fondo (`do`) | Ripeti: in tutti e due il ciclo continua finché la condizione è vera |
| il ciclo `for` | Per, con la fine inclusa come in Flowgorithm; se il corpo cambia il contatore, o il passo non è un numero scritto, il Mentre equivalente (Flowgorithm li ammette, AlgoDesign no) |
| la chiamata di una procedura (`call`) | la chiamata della procedura |
| un commento | un Commento |
| il nome, gli autori e la descrizione del programma | il nome, l'autore e la descrizione del progetto |

Le espressioni si scrivono con i simboli e le operazioni di AlgoDesign:

- `=`, `<>`, `!=`, `≠`, `&&`, `||`, `!`, `%`, `×`, `÷`, `≤`, `≥` e le altre forme di Flowgorithm diventano `==`, `!=`, `and`, `or`, `not`, `mod`, `*`, `/`, `<=`, `>=`;
- `/` fra due interi in Flowgorithm dà **sempre un reale** (`7 / 2` vale 3.5): il `.algo` scrive `converti_a_reale a / b`;
- un reale dato a un intero, in Flowgorithm, si tronca verso lo zero (3.7 diventa 3, -3.7 diventa -3): il `.algo` scrive `converti_a_intero (…)`, che fa lo stesso;
- `^` si calcola da sinistra (`2 ^ 3 ^ 2` vale 64) e il meno davanti al numero conta di più (`-2 ^ 2` vale 4): il `.algo` scrive le parentesi che servono, `(-2) elevato_a 2`;
- `&` in un output separa i valori della Scrittura; fra due testi diventa `+`;
- `Abs`, `Sqrt`, `Int`, `Len`, `ToChar`, `ToCode` e `Pi` diventano `valore_assoluto`, `radice_quadrata`, `converti_a_intero`, `lunghezza`, `converti_a_carattere`, `converti_a_intero` e `pi_greco`; `Char(s, i)` diventa il carattere `s[i]`, e `Size(v)` la dimensione scritta del vettore;
- i nomi: Flowgorithm non distingue le maiuscole (`Totale` e `totale` sono lo stesso dato), AlgoDesign sì; il `.algo` scrive ogni nome come nella sua dichiarazione.

Una procedura che riceve un vettore lo riceve con la dimensione dei vettori che le passano: se due chiamate le passano vettori di dimensioni diverse, il file non si converte (§4).

## 4. Che cosa non si converte e il messaggio

Un file non si converte quando usa qualcosa che questa versione di AlgoDesign non ha, o che AlgoDesign fa in un altro modo. La riga `ERRORE` dice la riga del file e uno di questi messaggi (gli esempi vengono dai file di prova della conversione):

- una funzione predefinita senza equivalente: `Sin`, `Cos`, `Tan`, `Arcsin`, `Arccos`, `Arctan`, `Ln`, `Log`, `Log10`, `Sgn`, `Random`, `ToString`, `ToInteger`, `ToReal`, `ToFixed` ed `EOF`: «La funzione «Sin» di Flowgorithm non ha un equivalente in questa versione di AlgoDesign.»
- un blocco dei file (Apri file, Chiudi file, Leggi dal file, Scrivi nel file) o della tartaruga (Avanti, Ruota, Pulisci, Penna): «Il blocco «Apri file» di Flowgorithm non ha un equivalente in questa versione di AlgoDesign.»
- `&` che unisce un numero o un booleano a un testo fuori da un output: «In AlgoDesign un numero non si unisce a un testo fuori da un'operazione di scrittura: scrivi le parti nel blocco Scrivi.»
- `mod` con un reale (in Flowgorithm `7.5 mod 2` vale 1.5): «In AlgoDesign il resto si calcola solo fra interi.»
- la dimensione di un vettore scritta con un dato o un calcolo: «In AlgoDesign la dimensione di un vettore è un numero scritto, non un calcolo: il vettore «v» ha «n».»
- una funzione che chiede un valore, scrive o cambia un vettore che riceve (in Flowgorithm può farlo): «La funzione «Doppio» chiede un valore, scrive un testo o cambia un vettore ricevuto: in AlgoDesign lo fa solo una procedura.»
- un intero scritto oltre 2 147 483 647: «Il numero 3000000000 è troppo grande per un intero di AlgoDesign.»
- lo stesso dato dichiarato in due blocchi con un tipo o una dimensione diversi, senza `-r` (§5): «Il dato «y» è dichiarato due volte con un tipo o una dimensione diversi: cambiando il nome il secondo diventa «y_2».»
- un dato dichiarato di nuovo dove il primo è ancora in uso, anche con `-r` (§5): «Il dato «a» è dichiarato di nuovo dove il primo è ancora in uso.»
- un nome riservato in AlgoDesign, o il nome di una procedura o funzione dato a un dato, senza `-r` (§5): «Il nome «length» è riservato in AlgoDesign: cambiando il nome diventa «length_2».»
- un nome con lettere accentate o altri segni: «Il nome «età» non si può usare in AlgoDesign: un nome ha solo lettere senza accento, cifre e trattino basso e non può iniziare con una cifra o con il trattino basso.»
- una procedura o funzione che riceve vettori di dimensioni diverse, o che riceve un vettore e non è mai chiamata: «In AlgoDesign un vettore ricevuto ha una dimensione sola: la procedura o funzione «Mostra» lo riceve con dimensioni diverse, o non è mai chiamata.»
- un programma che, convertito, ha un errore che AlgoDesign segnala, come una funzione che chiama una procedura; la riga del file in questo caso non c'è: «Il programma convertito ha un errore che AlgoDesign segnala: «La funzione chiama una procedura: una funzione calcola e basta.» (blocco b3).»
- un file che non è un file di Flowgorithm, o che contiene un elemento che Flowgorithm non scrive (Flowgorithm lo ignora in silenzio, lo strumento no): «Il file non è un file di Flowgorithm che AlgoDesign sa leggere: l'elemento «<sconosciuto>» della riga 14 non è di Flowgorithm.»

Un file che non si converte si può correggere in Flowgorithm, togliendo ciò che il messaggio dice, e poi convertire di nuovo.

## 5. Le dichiarazioni e `-r`

In Flowgorithm un dato vive dal suo blocco di dichiarazione alla fine del blocco che lo contiene: lo stesso nome si può dichiarare di nuovo in un altro ramo o in un altro ciclo, e ogni giro di un ciclo che contiene una dichiarazione la rifà da capo, senza valore. In AlgoDesign i dati stanno tutti nella vista dei dati della procedura o funzione. La conversione porta lì ogni dichiarazione, e lo strumento lo dice per quelle che stavano dentro un blocco:

```text
TRASFORMAZIONE esercizi\voti.fprg, riga 17: il dato x è dichiarato dentro un blocco: in AlgoDesign diventa un dato della funzione
```

Il programma calcola lo stesso: un programma che in Flowgorithm gira senza errori non legge mai un dato fuori dal suo blocco, né prima di avergli dato un valore.

- Lo **stesso nome con lo stesso tipo e la stessa dimensione**, dichiarato in più blocchi, diventa **un dato solo**.
- Lo **stesso nome con un tipo o una dimensione diversi** non si converte. Con `-r` il secondo prende il primo nome libero col seguito `_2`, e lo strumento lo dice: «il dato y è dichiarato di nuovo con un altro tipo o un'altra dimensione: il secondo diventa y_2».
- Un **nome riservato** in AlgoDesign (come `length`), o il nome di una procedura o funzione dato a un dato, con `-r` diventa allo stesso modo `length_2`: «il nome length è riservato in AlgoDesign: diventa length_2».
- Un nome **dichiarato di nuovo dove il primo è ancora in uso** (nello stesso blocco, o in un blocco dentro quello della prima dichiarazione) non si converte nemmeno con `-r`: anche Flowgorithm lo rifiuta.

## 6. Le differenze da sapere

Il programma convertito scrive lo stesso output di Flowgorithm, con queste differenze, **misurate su Flowgorithm 4.5**:

- **Gli interi.** In Flowgorithm sono a 64 bit (`100000 * 100000` vale 10000000000); in AlgoDesign arrivano fino a 2 147 483 647. Un calcolo che va oltre ferma il programma in AlgoDesign e continua in Flowgorithm.
- **I reali scritti.** Flowgorithm scrive un reale con fino a 15 cifre significative, senza la parte decimale se è zero (2.0 diventa «2», 0.000001 diventa «1E-06»); AlgoDesign con il numero di decimali del progetto, 2 di partenza (2.0 diventa «2.00»).
- **Il resto con un negativo.** In Flowgorithm `mod` con un numero negativo è un errore; in AlgoDesign si calcola, col segno del dividendo (`-7 mod 3` vale -1).
- **Le stringhe** in AlgoDesign hanno al più 255 caratteri, **i vettori** al più 1000 elementi.
- **Le chiamate annidate**: AlgoDesign ferma un programma oltre 500 chiamate ancora aperte; il limite di Flowgorithm non è misurato.
- **La lettura** di un valore (`input`): quali forme di numeri e booleani Flowgorithm accetta non è misurato; in AlgoDesign valgono quelle della guida per lo studente.

## 7. Che cosa non passa nel `.algo`

Un file di Flowgorithm registra, negli attributi `created` ed `edited`, il **nome dell'utente e del computer** su cui è stato creato e modificato, e in `saved` quando. Questi tre attributi **non passano** nel `.algo` e lo strumento non li mostra: un progetto convertito si può dare ad altri senza quei dati. Il nome, gli autori e la descrizione del programma passano (§3).

## 8. Riepilogo

| In Flowgorithm | In AlgoDesign | Vedi |
|---|---|---|
| `Main`, procedure e funzioni | programma principale, procedure, funzioni | §3 |
| dichiarazioni nei blocchi | dati della vista dei dati; con tipi diversi `-r` | §5 |
| vettore passato a una procedura | *rif*, o *out* se è solo scritto | §3 |
| `/` fra interi, reale dato a un intero | `converti_a_reale`, `converti_a_intero` | §3 |
| `^`, `&`, le funzioni predefinite | `elevato_a` con le parentesi, Scrittura o `+`, le operazioni di AlgoDesign | §3 |
| il `for` che cambia il contatore o ha un passo calcolato | il Mentre equivalente | §3 |
| file, tartaruga, `Sin`, `Random`, `mod` fra reali | non si convertono | §4 |
| interi a 64 bit, reali a 15 cifre, `mod` coi negativi | le differenze da sapere | §6 |
| `created`, `edited`, `saved` | non passano | §7 |

## 9. Licenza di questa guida

Questa guida è di Giuseppe Lancellotti ed è rilasciata con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): si può copiare, distribuire e modificare, anche per scopi commerciali, citando l'autore e la licenza. Il testo completo della licenza è nel file `LICENSE-DOCS`.
