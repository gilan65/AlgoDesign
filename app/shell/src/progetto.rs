// I file del progetto e gli esempi aggiunti dall'utente. Contratto con l'interfaccia (app/ui/file.ts):
// - `scegli_file_da_aprire` con `filtro` (il nome del tipo di file) e `cartella` → il percorso scelto, o
//   `null` se l'utente rinuncia; `scegli_file_da_salvare` con `proposto` (il nome proposto), `filtro` e
//   `cartella` → `{ percorso, sostituire }` (il percorso scelto che finisce in `.algo`, e se chiedere di
//   sostituire il file che c'è: `da_salvare`), o `null` (le chiavi le appaia con `ui/file.ts` una prova qui
//   sotto); `scegli_file_da_esportare`, con gli stessi argomenti, fa lo stesso con `.csv`, per la tabella di
//   traccia (il testo lo scrive `scrivi_progetto`); `scegli_file_del_codice`, con in più `estensione` (`.txt`,
//   `.py`, `.c` o `.ts`: un'altra non apre la finestra e vale `null`), per il codice generato; `scegli_file_dell_immagine`,
//   con `estensione` `.png` o `.svg`, per il flowchart esportato. Le finestre sono quelle native del sistema (libreria `rfd`), modali sulla
//   finestra dell'app, e i comandi che le aprono girano fuori dal thread della finestra (`#[tauri::command(async)]`):
//   su Linux la finestra di `rfd` aspetta il ciclo di GTK, e chiamata da quel thread lo blocca per sempre (la prova
//   in `main.rs`). Partono da `cartella` (quella del file aperto o dell'ultimo usato, se c'è ancora);
//   altrimenti, nella versione portabile, dalla cartella dell'eseguibile; altrimenti da dove decide il sistema;
// - `leggi_progetto` con `percorso` → il testo; `scrivi_progetto` con `percorso` e `testo`, scrittura
//   atomica; `scrivi_byte` con `percorso` e `byte` (i byte in base64, per il PNG), allo stesso modo. Un errore arriva come `{ genere, dettaglio }`: `non_testo` (il file non è UTF-8) o `sistema`
//   (il messaggio del sistema); gli esempi e i gruppi hanno anche `nome_non_valido` (il nome), `gruppo_con_altro`
//   (ciò che c'è oltre agli esempi), `gruppo_bloccato` (il messaggio del sistema: un file aperto in un altro programma)
//   e `sola_lettura` (il nome dell'esempio). I generi sono in `GENERI`, appaiati con `ui/file.ts` da una prova;
// - `file_dato_all_avvio` → il percorso assoluto del primo argomento della riga di comando, o `null`;
// - gli esempi sono i file `.algo` di una cartella: quella scelta nelle Impostazioni (`scelta`,
//   un percorso, che ogni comando degli esempi riceve) se c'è ancora, altrimenti la predefinita, `esempi`
//   accanto alle preferenze (in `data` nella versione portabile). Ogni sottocartella è un gruppo di esempi, coi
//   suoi file `.algo` (un livello solo: ciò che sta più in fondo non si guarda). `elenca_esempi` con `scelta` →
//   `{ cartella, predefinita, mancante, esiste, file: [{ nome, testo?, errore? }], gruppi: [{ nome, file }] }`: la
//   cartella in uso, la predefinita, se la scelta non c'è più (e si usa la predefinita), se la cartella in uso
//   c'è già (falso: non c'è ancora, e l'interfaccia ci copia gli esempi forniti), i file fuori da ogni gruppo e
//   i gruppi, tutti in ordine di nome. `scrivi_esempio` con `nome`, `testo`, `scelta` e `gruppo` (crea la
//   cartella e il gruppo, scrittura atomica); `togli_esempio` con `nome`, `scelta` e `gruppo` (cancella il file;
//   il gruppo resta, anche vuoto); `togli_gruppo` con `gruppo` e `scelta` (cancella i suoi esempi e la
//   sottocartella, ma solo se dentro non c'è altro: altrimenti non cancella nulla, e l'errore dice che cosa c'è).
//   `nome` è solo il nome di un file `.algo`, `gruppo` (o `null`: fuori da ogni gruppo) solo il nome di una
//   sottocartella, mai un percorso, e nessuno dei due un nome che Windows riserva (`CON`, `NUL`…);
// - le librerie sono i file `.algo` di un'altra cartella, con le stesse regole: quella scelta (`scelta`) se c'è
//   ancora, altrimenti la predefinita, `librerie` accanto agli esempi. `elenca_librerie` con `scelta` risponde come
//   `elenca_esempi`; `scrivi_libreria` con `nome`, `testo`, `scelta` e `gruppo` come `scrivi_esempio`;
// - `scegli_cartella` con `cartella` (da dove parte) → la cartella scelta con la finestra del sistema, o
//   `null` se l'utente rinuncia;
// - `segna_modificato` con `modificato`: finché è vero, la chiusura della finestra si ferma e l'interfaccia
//   riceve l'evento `algodesign-chiusura` (sulla `window` della pagina), per chiedere conferma;
//   `chiudi_finestra` chiude senza chiedere (e azzera «modificato» solo se la finestra si chiude).
// I byte del file non si toccano: il testo arriva e torna com'è (un BOM in testa lo salta il lettore).

use serde::Serialize;
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use crate::scrittura;

#[derive(Serialize, Debug, PartialEq)]
pub struct ErroreDelFile {
    pub genere: &'static str,
    pub dettaglio: String,
}

/// I generi di un errore: l'interfaccia ne dice ognuno con le sue parole (`generiDelFile` in `ui/file.ts`).
pub const GENERI: [&str; 6] = ["non_testo", "sistema", "nome_non_valido", "gruppo_con_altro", "gruppo_bloccato", "sola_lettura"];

fn di_sistema(e: std::io::Error) -> ErroreDelFile {
    ErroreDelFile { genere: "sistema", dettaglio: e.to_string() }
}

pub fn leggi(percorso: &Path) -> Result<String, ErroreDelFile> {
    let byte = fs::read(percorso).map_err(di_sistema)?;
    String::from_utf8(byte).map_err(|e| ErroreDelFile { genere: "non_testo", dettaglio: e.to_string() })
}

/// Scrive il file, salvo un nome che Windows riserva: quello digitato nella finestra del sistema («aux» diventa
/// «aux.algo») non passa dall'avviso del nome, e Windows 11 lo scriverebbe, ma Windows 10 lo porta al dispositivo.
pub fn scrivi(percorso: &Path, testo: &str) -> Result<(), ErroreDelFile> {
    scrivi_i_byte(percorso, testo.as_bytes())
}

/// Come `scrivi`, coi byte com'è (il PNG del flowchart esportato).
pub fn scrivi_i_byte(percorso: &Path, byte: &[u8]) -> Result<(), ErroreDelFile> {
    if let Some(nome) = percorso.file_name().and_then(|n| n.to_str()).filter(|n| nome_riservato(n)) {
        return Err(non_valido(nome));
    }
    scrittura::atomica(percorso, byte).map_err(di_sistema)
}

/// I byte arrivati in base64 dall'interfaccia, scritti com'è; un testo che non è base64 è un errore del sistema, e non
/// si scrive nulla.
pub fn scrivi_da_base64(percorso: &Path, byte: &str) -> Result<(), ErroreDelFile> {
    use base64::Engine;
    let decodificati = base64::engine::general_purpose::STANDARD.decode(byte).map_err(|e| ErroreDelFile { genere: "sistema", dettaglio: e.to_string() })?;
    scrivi_i_byte(percorso, &decodificati)
}

/// Il file da aprire all'avvio: il primo argomento, reso assoluto rispetto alla cartella di partenza
/// (`cartella_di_partenza`). La cartella si chiede solo per un argomento relativo: se non si legge (cancellata, su Linux), un avvio senza argomenti o
/// con un percorso assoluto non ne risente, e un argomento relativo si lascia com'è.
pub fn dall_argomento(argomenti: &[OsString], cartella: impl FnOnce() -> std::io::Result<PathBuf>) -> Option<PathBuf> {
    let primo = PathBuf::from(argomenti.get(1)?);
    if primo.is_absolute() {
        return Some(primo);
    }
    Some(match cartella() {
        Ok(c) => c.join(primo),
        Err(_) => primo,
    })
}

/// La cartella da cui AlgoDesign è stato avviato, contro cui si risolve un argomento relativo. Su Linux l'AppImage porta
/// la cartella di lavoro dentro di sé (`/tmp/.mount_…/usr`) e lascia quella di partenza nella variabile `OWD`: quando c'è
/// ed è un percorso assoluto vale quella; altrimenti la cartella di lavoro.
pub fn cartella_di_partenza(su_linux: bool, variabile: impl Fn(&str) -> Option<OsString>, di_lavoro: impl FnOnce() -> std::io::Result<PathBuf>) -> std::io::Result<PathBuf> {
    match variabile("OWD").map(PathBuf::from) {
        Some(partenza) if su_linux && partenza.is_absolute() => Ok(partenza),
        _ => di_lavoro(),
    }
}

/// Il file dove «Salva con nome» scrive.
#[derive(Serialize, Debug, PartialEq)]
pub struct FileDaSalvare {
    pub percorso: String,
    pub sostituire: bool,
}

/// L'estensione del progetto, e quella della tabella di traccia esportata.
pub const ALGO: &str = ".algo";
pub const CSV: &str = ".csv";
/// Le estensioni del codice generato: pseudocodice, Python, C, TypeScript.
pub const CODICE: [&str; 4] = [".txt", ".py", ".c", ".ts"];
/// Le estensioni del flowchart esportato.
pub const IMMAGINE: [&str; 2] = [".png", ".svg"];

/// Il nome scelto nella finestra del sistema finisce nell'`estensione` (`.algo` per il progetto, `.csv` per la
/// tabella): l'estensione scritta con altre maiuscole si riscrive («media.ALGO» → «media.algo»), e chi non ce l'ha
/// la riceve («esercizio 2.1», e un nome che è solo «.algo»). Si chiede di sostituire solo se così si arriva a un
/// FILE che c'è e che non è lo stesso file scelto, deciso sull'identità (il percorso canonico) e non sul testo:
/// quello scelto la finestra del sistema l'ha già chiesto (Windows), o l'ha chiesto sul nome digitato (GTK), che è
/// un altro file. Su Windows «media.ALGO» e «media.algo» sono lo stesso file: nessuna seconda domanda. Una cartella
/// con quel nome non fa chiedere (la scrittura poi fallisce col suo errore). Casi in `salva-con-nome.json`.
pub fn da_salvare(scelto: PathBuf, estensione: &str) -> (PathBuf, bool) {
    // Un nome che non è UTF-8 (solo su Linux) non si riscrive: riceve l'estensione in fondo.
    let nome = scelto.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let base = nome.len().saturating_sub(estensione.len());
    let con_estensione = base > 0 && nome.is_char_boundary(base) && nome[base..].eq_ignore_ascii_case(estensione);
    let percorso = if con_estensione {
        scelto.with_file_name(format!("{}{estensione}", &nome[..base]))
    } else {
        let mut nome = scelto.clone().into_os_string();
        nome.push(estensione);
        PathBuf::from(nome)
    };
    let sostituire = da_chiedere(&percorso, &scelto, stesso_file);
    (percorso, sostituire)
}

/// Si chiede di sostituire un file che c'è, se non è quello scelto: lo stesso percorso lo è sempre, anche quando
/// l'identità non si legge (`canonicalize` che fallisce su un percorso di rete o per i permessi).
fn da_chiedere(percorso: &Path, scelto: &Path, stesso: impl Fn(&Path, &Path) -> bool) -> bool {
    fs::metadata(percorso).is_ok_and(|m| m.is_file()) && !(percorso == scelto || stesso(percorso, scelto))
}

/// Due percorsi che portano allo stesso file (su Windows anche scritti con altre maiuscole).
fn stesso_file(a: &Path, b: &Path) -> bool {
    matches!((fs::canonicalize(a), fs::canonicalize(b)), (Ok(x), Ok(y)) if x == y)
}

pub struct FileDatoAllAvvio(pub Option<PathBuf>);
/// La cartella dell'eseguibile nella versione portabile (dove sta `data`), da cui partono le finestre del
/// file quando l'interfaccia non ne dà una che esiste.
pub struct CartellaPortabile(pub Option<PathBuf>);

/// Da dove parte una finestra del file: la cartella chiesta, se esiste; altrimenti quella della versione
/// portabile; altrimenti nessuna (decide il sistema).
pub fn partenza(chiesta: Option<&str>, portabile: Option<&Path>) -> Option<PathBuf> {
    chiesta.map(PathBuf::from).filter(|c| c.is_dir()).or_else(|| portabile.map(Path::to_path_buf))
}
pub struct CartellaEsempi(pub PathBuf);
/// La cartella predefinita delle librerie: `librerie` accanto agli esempi.
pub struct CartellaLibrerie(pub PathBuf);
pub struct Modificato(pub AtomicBool);

/// Un file della cartella degli esempi: il testo, o perché non si legge.
#[derive(Serialize, Debug, PartialEq)]
pub struct FileDiEsempio {
    pub nome: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub testo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errore: Option<ErroreDelFile>,
}

/// Una sottocartella della cartella degli esempi, coi suoi file.
#[derive(Serialize, Debug, PartialEq)]
pub struct GruppoDiEsempi {
    pub nome: String,
    pub file: Vec<FileDiEsempio>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Esempi {
    pub cartella: String,
    pub predefinita: String,
    pub mancante: bool,
    pub esiste: bool,
    pub file: Vec<FileDiEsempio>,
    pub gruppi: Vec<GruppoDiEsempi>,
}

/// La cartella degli esempi in uso: quella scelta, se è una cartella che c'è; altrimenti la predefinita.
/// Il secondo valore dice che una scelta c'era ma la cartella non c'è più (una chiavetta tolta, una
/// cartella cancellata): la preferenza resta, e torna buona quando la cartella ricompare.
pub fn cartella_in_uso(scelta: Option<&str>, predefinita: &Path) -> (PathBuf, bool) {
    match scelta.filter(|s| !s.is_empty()).map(PathBuf::from) {
        Some(c) if c.is_dir() => (c, false),
        Some(_) => (predefinita.to_path_buf(), true),
        None => (predefinita.to_path_buf(), false),
    }
}

/// I nomi che Windows riserva ai dispositivi: un file o una cartella che si chiama così (con qualunque estensione,
/// e con gli spazi prima del punto) non si crea, o porta al dispositivo. Le cifre in apice di `COM` e `LPT` sono
/// riservate anche loro.
const RISERVATI: [&str; 4] = ["CON", "PRN", "AUX", "NUL"];

/// Il nome è uno di quelli che Windows riserva (vedi `RISERVATI`), a meno delle maiuscole: conta la parte prima del
/// primo punto, senza gli spazi in fondo. Lo stesso predicato sta in `ui/esempi.ts` (`nomeRiservato`).
pub fn nome_riservato(nome: &str) -> bool {
    let base = nome.split('.').next().unwrap_or("").trim_end_matches(' ').to_uppercase();
    if RISERVATI.contains(&base.as_str()) {
        return true;
    }
    let mut c = base.chars();
    let prefisso: String = c.by_ref().take(3).collect();
    let resto: Vec<char> = c.collect();
    (prefisso == "COM" || prefisso == "LPT") && resto.len() == 1 && "0123456789¹²³".contains(resto[0])
}

/// Il nome di un esempio è il nome di un file `.algo` (l'estensione in qualunque maiuscola) nella cartella: niente
/// separatori né `..`, niente caratteri che Windows non ammette in un nome, niente punto in testa (i file nascosti,
/// come `._media.algo` che il Mac scrive su una chiavetta), nessun nome riservato. È la regola dell'elenco e delle
/// scritture: l'app mostra solo gli esempi che sa anche riscrivere e togliere.
pub fn nome_di_esempio_valido(nome: &str) -> bool {
    let fine = nome.len().saturating_sub(ALGO.len());
    let base = if nome.is_char_boundary(fine) && nome[fine..].eq_ignore_ascii_case(ALGO) { &nome[..fine] } else { "" };
    !base.trim().is_empty()
        && !nome.chars().any(|c| c.is_control() || "\\/:*?\"<>|".contains(c))
        && !nome.starts_with('.')
        && !nome.ends_with(' ')
        && !nome_riservato(nome)
}

/// Il nome di un gruppo è il nome di una sottocartella: niente separatori, niente `.` in testa (né `..`, né le
/// cartelle nascoste), niente spazio o punto in fondo (Windows li toglie, e il gruppo diventerebbe un altro),
/// niente caratteri che Windows non ammette, nessun nome riservato.
pub fn nome_di_gruppo_valido(nome: &str) -> bool {
    !nome.trim().is_empty()
        && !nome.chars().any(|c| c.is_control() || "\\/:*?\"<>|".contains(c))
        && !nome.starts_with('.')
        && !nome.ends_with(' ')
        && !nome.ends_with('.')
        && !nome_riservato(nome)
}

/// Le voci di una cartella che soddisfano il filtro, coi nomi in ordine (un nome che non è UTF-8 non si elenca).
fn voci(cartella: &Path, tieni: impl Fn(&fs::DirEntry, &str) -> bool) -> Result<Vec<String>, ErroreDelFile> {
    let mut nomi: Vec<String> = fs::read_dir(cartella)
        .map_err(di_sistema)?
        .filter_map(|v| v.ok())
        .filter_map(|v| v.file_name().into_string().ok().filter(|n| tieni(&v, n)))
        .collect();
    nomi.sort();
    Ok(nomi)
}

/// Gli esempi di una cartella: i file col nome di un esempio (`nome_di_esempio_valido`).
fn esempi_di(cartella: &Path) -> Result<Vec<String>, ErroreDelFile> {
    voci(cartella, |v, n| v.file_type().is_ok_and(|t| t.is_file()) && nome_di_esempio_valido(n))
}

/// Gli esempi di una cartella, in ordine di nome, col testo o perché non si leggono.
fn file_di(cartella: &Path) -> Result<Vec<FileDiEsempio>, ErroreDelFile> {
    let nomi = esempi_di(cartella)?;
    Ok(nomi
        .into_iter()
        .map(|nome| match leggi(&cartella.join(&nome)) {
            Ok(testo) => FileDiEsempio { nome, testo: Some(testo), errore: None },
            Err(e) => FileDiEsempio { nome, testo: None, errore: Some(e) },
        })
        .collect())
}

pub fn elenca(scelta: Option<&str>, predefinita: &Path) -> Result<Esempi, ErroreDelFile> {
    let (in_uso, mancante) = cartella_in_uso(scelta, predefinita);
    let cartella = in_uso.as_path();
    let mostrata = cartella.to_string_lossy().into_owned();
    let predefinita = predefinita.to_string_lossy().into_owned();
    if !cartella.is_dir() {
        return Ok(Esempi { cartella: mostrata, predefinita, mancante, esiste: false, file: vec![], gruppi: vec![] });
    }
    // Una sottocartella col nome che un gruppo non può avere (una nascosta, come `.git`) non è un gruppo.
    let gruppi = voci(cartella, |v, n| v.file_type().is_ok_and(|t| t.is_dir()) && nome_di_gruppo_valido(n))?
        .into_iter()
        .map(|nome| Ok(GruppoDiEsempi { file: file_di(&cartella.join(&nome))?, nome }))
        .collect::<Result<_, ErroreDelFile>>()?;
    Ok(Esempi { cartella: mostrata, predefinita, mancante, esiste: true, file: file_di(cartella)?, gruppi })
}

fn non_valido(nome: &str) -> ErroreDelFile {
    ErroreDelFile { genere: "nome_non_valido", dettaglio: nome.to_owned() }
}

/// Il file di un esempio: nella cartella, o nel suo gruppo; con un nome o un gruppo che uscirebbe dalla cartella,
/// l'errore.
fn percorso_di(cartella: &Path, gruppo: Option<&str>, nome: &str) -> Result<PathBuf, ErroreDelFile> {
    if !nome_di_esempio_valido(nome) {
        return Err(non_valido(nome));
    }
    match gruppo {
        Some(g) if !nome_di_gruppo_valido(g) => Err(non_valido(g)),
        Some(g) => Ok(cartella.join(g).join(nome)),
        None => Ok(cartella.join(nome)),
    }
}

pub fn scrivi_in(cartella: &Path, gruppo: Option<&str>, nome: &str, testo: &str) -> Result<(), ErroreDelFile> {
    let percorso = percorso_di(cartella, gruppo, nome)?;
    fs::create_dir_all(percorso.parent().unwrap_or(cartella)).map_err(di_sistema)?;
    scrivi(&percorso, testo)
}

pub fn togli_da(cartella: &Path, gruppo: Option<&str>, nome: &str) -> Result<(), ErroreDelFile> {
    fs::remove_file(percorso_di(cartella, gruppo, nome)?).map_err(di_sistema)
}

/// I file che il sistema scrive da solo in una cartella aperta nel Finder o in Esplora risorse: non sono dell'utente.
const DEL_SISTEMA: [&str; 3] = [".ds_store", "thumbs.db", "desktop.ini"];

/// Toglie un gruppo: i suoi esempi (e i file che il sistema vi ha scritto da solo), poi la sottocartella. Tutto o
/// niente: se dentro c'è altro (un file che non è un esempio, una cartella più in fondo: l'app cancella solo ciò che
/// mostra), un file in sola lettura, o un file aperto in un altro programma, non cancella nulla. Il file aperto lo dice
/// la sottocartella che non si rinomina (Windows rifiuta di rinominare una cartella con dentro un file aperto senza il
/// permesso di cancellarlo): la si rinomina prima, in un nome nascosto, e solo dopo si cancella. Se una cancellazione
/// fallisce lo stesso (un file aperto proprio in quell'istante), la sottocartella torna al suo nome con ciò che resta.
pub fn togli_gruppo_da(cartella: &Path, gruppo: &str) -> Result<(), ErroreDelFile> {
    if !nome_di_gruppo_valido(gruppo) {
        return Err(non_valido(gruppo));
    }
    let dentro = cartella.join(gruppo);
    let esempi = esempi_di(&dentro)?;
    // I file col prefisso «._» sono gli attributi che il Mac scrive accanto a ogni file su una chiavetta che non li conosce.
    let del_sistema = voci(&dentro, |v, n| v.file_type().is_ok_and(|t| t.is_file()) && (DEL_SISTEMA.contains(&n.to_lowercase().as_str()) || n.starts_with("._")))?;
    let mut altro: Vec<String> = fs::read_dir(&dentro)
        .map_err(di_sistema)?
        .filter_map(|v| v.ok())
        .map(|v| v.file_name().to_string_lossy().into_owned())
        .filter(|n| !esempi.contains(n) && !del_sistema.contains(n))
        .collect();
    altro.sort();
    if !altro.is_empty() {
        return Err(ErroreDelFile { genere: "gruppo_con_altro", dettaglio: altro.join(", ") });
    }
    let da_togliere: Vec<&String> = esempi.iter().chain(&del_sistema).collect();
    if let Some(nome) = da_togliere.iter().find(|n| fs::metadata(dentro.join(n)).is_ok_and(|m| m.permissions().readonly())) {
        return Err(ErroreDelFile { genere: "sola_lettura", dettaglio: (*nome).clone() });
    }
    let via = (0..)
        .map(|n| cartella.join(format!(".{gruppo}.eliminato-{}-{n}", std::process::id())))
        .find(|p| fs::symlink_metadata(p).is_err())
        .expect("un nome libero per la sottocartella da eliminare");
    fs::rename(&dentro, &via).map_err(|e| ErroreDelFile { genere: "gruppo_bloccato", dettaglio: e.to_string() })?;
    // La sola lettura di una cartella (Esplora risorse la mette alle cartelle personalizzate) su Windows ferma solo la
    // sua eliminazione, a file già cancellati: la si toglie prima, e torna se il gruppo resta.
    let permessi = fs::metadata(&via).map_err(di_sistema)?.permissions();
    if permessi.readonly() {
        let mut scrivibile = permessi.clone();
        #[allow(clippy::permissions_set_readonly_false)]
        scrivibile.set_readonly(false);
        fs::set_permissions(&via, scrivibile).map_err(di_sistema)?;
    }
    let tolti = (|| {
        for nome in &da_togliere {
            fs::remove_file(via.join(nome))?;
        }
        fs::remove_dir(&via)
    })();
    tolti.map_err(|e| {
        let _ = fs::set_permissions(&via, permessi);
        let _ = fs::rename(&via, &dentro);
        di_sistema(e)
    })
}

/// L'estensione del filtro, senza il punto e con le due forme di ogni lettera (`algo` → `[aA][lL][gG][oO]`). Il filtro di
/// GTK confronta i nomi tenendo conto delle maiuscole (`*.algo` non mostra «media.ALGO», che AlgoDesign apre); con le
/// due forme il modello di GTK (`*.[aA][lL][gG][oO]`) le prende tutte. Su Windows il filtro non guarda le maiuscole, e
/// le parentesi non si scrivono.
pub fn estensione_senza_maiuscole(estensione: &str) -> String {
    estensione
        .trim_start_matches('.')
        .chars()
        .map(|c| if c.is_ascii_alphabetic() { format!("[{}{}]", c.to_ascii_lowercase(), c.to_ascii_uppercase()) } else { c.to_string() })
        .collect()
}

/// La finestra del file col titolo dell'interfaccia: solo su Linux, dove GTK la intitola in inglese («Open File»); su
/// Windows il sistema le dà già il titolo nella sua lingua.
fn col_titolo(dialogo: rfd::FileDialog, titolo: &str) -> rfd::FileDialog {
    if cfg!(target_os = "linux") {
        dialogo.set_title(titolo)
    } else {
        dialogo
    }
}

fn finestra_del_file(finestra: &tauri::WebviewWindow, titolo: &str, filtro: &str, estensione: &str, cartella: Option<&str>, portabile: &CartellaPortabile) -> rfd::FileDialog {
    let nel_filtro = if cfg!(target_os = "linux") { estensione_senza_maiuscole(estensione) } else { estensione.trim_start_matches('.').to_string() };
    let dialogo = col_titolo(rfd::FileDialog::new(), titolo).add_filter(filtro, &[nel_filtro.as_str()]).set_parent(finestra);
    match partenza(cartella, portabile.0.as_deref()) {
        Some(c) => dialogo.set_directory(c),
        None => dialogo,
    }
}

#[tauri::command(async)]
pub fn scegli_file_da_aprire(finestra: tauri::WebviewWindow, titolo: String, filtro: String, cartella: Option<String>, portabile: tauri::State<'_, CartellaPortabile>) -> Option<String> {
    finestra_del_file(&finestra, &titolo, &filtro, ALGO, cartella.as_deref(), &portabile).pick_file().map(|p| p.to_string_lossy().into_owned())
}

fn scegli_dove_salvare(finestra: &tauri::WebviewWindow, titolo: &str, proposto: String, filtro: &str, estensione: &str, cartella: Option<&str>, portabile: &CartellaPortabile) -> Option<FileDaSalvare> {
    finestra_del_file(finestra, titolo, filtro, estensione, cartella, portabile).set_file_name(proposto).save_file().map(|p| {
        let (percorso, sostituire) = da_salvare(p, estensione);
        FileDaSalvare { percorso: percorso.to_string_lossy().into_owned(), sostituire }
    })
}

#[tauri::command(async)]
pub fn scegli_file_da_salvare(
    finestra: tauri::WebviewWindow,
    titolo: String,
    proposto: String,
    filtro: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    scegli_dove_salvare(&finestra, &titolo, proposto, &filtro, ALGO, cartella.as_deref(), &portabile)
}

/// Dove esportare la tabella di traccia: come «Salva con nome», con `.csv`. Il testo lo scrive `scrivi_progetto`.
#[tauri::command(async)]
pub fn scegli_file_da_esportare(
    finestra: tauri::WebviewWindow,
    titolo: String,
    proposto: String,
    filtro: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    scegli_dove_salvare(&finestra, &titolo, proposto, &filtro, CSV, cartella.as_deref(), &portabile)
}

/// Dove salvare il codice generato: come «Salva con nome», con l'estensione del linguaggio, che deve essere una di
/// `CODICE`. Il testo lo scrive `scrivi_progetto`.
#[tauri::command(async)]
pub fn scegli_file_del_codice(
    finestra: tauri::WebviewWindow,
    titolo: String,
    proposto: String,
    filtro: String,
    estensione: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    let estensione = CODICE.into_iter().find(|e| *e == estensione)?;
    scegli_dove_salvare(&finestra, &titolo, proposto, &filtro, estensione, cartella.as_deref(), &portabile)
}

/// Dove esportare il flowchart: come «Salva con nome», con l'estensione dell'immagine, che deve essere una di
/// `IMMAGINE`. L'SVG lo scrive `scrivi_progetto`, il PNG `scrivi_byte`.
#[tauri::command(async)]
pub fn scegli_file_dell_immagine(
    finestra: tauri::WebviewWindow,
    titolo: String,
    proposto: String,
    filtro: String,
    estensione: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    let estensione = IMMAGINE.into_iter().find(|e| *e == estensione)?;
    scegli_dove_salvare(&finestra, &titolo, proposto, &filtro, estensione, cartella.as_deref(), &portabile)
}

#[tauri::command]
pub fn scrivi_byte(percorso: String, byte: String) -> Result<(), ErroreDelFile> {
    scrivi_da_base64(Path::new(&percorso), &byte)
}

#[tauri::command]
pub fn leggi_progetto(percorso: String) -> Result<String, ErroreDelFile> {
    leggi(Path::new(&percorso))
}

#[tauri::command]
pub fn scrivi_progetto(percorso: String, testo: String) -> Result<(), ErroreDelFile> {
    scrivi(Path::new(&percorso), &testo)
}

#[tauri::command]
pub fn file_dato_all_avvio(file: tauri::State<'_, FileDatoAllAvvio>) -> Option<String> {
    file.0.as_ref().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn elenca_esempi(scelta: Option<String>, cartella: tauri::State<'_, CartellaEsempi>) -> Result<Esempi, ErroreDelFile> {
    elenca(scelta.as_deref(), &cartella.0)
}

#[tauri::command]
pub fn scrivi_esempio(nome: String, testo: String, scelta: Option<String>, gruppo: Option<String>, cartella: tauri::State<'_, CartellaEsempi>) -> Result<(), ErroreDelFile> {
    scrivi_in(&cartella_in_uso(scelta.as_deref(), &cartella.0).0, gruppo.as_deref(), &nome, &testo)
}

#[tauri::command]
pub fn togli_esempio(nome: String, scelta: Option<String>, gruppo: Option<String>, cartella: tauri::State<'_, CartellaEsempi>) -> Result<(), ErroreDelFile> {
    togli_da(&cartella_in_uso(scelta.as_deref(), &cartella.0).0, gruppo.as_deref(), &nome)
}

#[tauri::command]
pub fn togli_gruppo(gruppo: String, scelta: Option<String>, cartella: tauri::State<'_, CartellaEsempi>) -> Result<(), ErroreDelFile> {
    togli_gruppo_da(&cartella_in_uso(scelta.as_deref(), &cartella.0).0, &gruppo)
}

#[tauri::command]
pub fn elenca_librerie(scelta: Option<String>, cartella: tauri::State<'_, CartellaLibrerie>) -> Result<Esempi, ErroreDelFile> {
    elenca(scelta.as_deref(), &cartella.0)
}

#[tauri::command]
pub fn scrivi_libreria(nome: String, testo: String, scelta: Option<String>, gruppo: Option<String>, cartella: tauri::State<'_, CartellaLibrerie>) -> Result<(), ErroreDelFile> {
    scrivi_in(&cartella_in_uso(scelta.as_deref(), &cartella.0).0, gruppo.as_deref(), &nome, &testo)
}

#[tauri::command(async)]
pub fn scegli_cartella(finestra: tauri::WebviewWindow, titolo: String, cartella: Option<String>, portabile: tauri::State<'_, CartellaPortabile>) -> Option<String> {
    let dialogo = col_titolo(rfd::FileDialog::new(), &titolo).set_parent(&finestra);
    let dialogo = match partenza(cartella.as_deref(), portabile.0.as_deref()) {
        Some(c) => dialogo.set_directory(c),
        None => dialogo,
    };
    dialogo.pick_folder().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn segna_modificato(modificato: bool, stato: tauri::State<'_, Modificato>) {
    stato.0.store(modificato, Ordering::SeqCst);
}

#[tauri::command]
pub fn chiudi_finestra(finestra: tauri::WebviewWindow, stato: tauri::State<'_, Modificato>) -> Result<(), String> {
    chiudi_e_azzera(&stato.0, || finestra.destroy().map_err(|e| e.to_string()))
}

/// La finestra si chiude senza chiedere (`destroy` non manda la richiesta di chiusura), e «modificato» si azzera
/// solo se ci riesce: se la chiusura fallisce la finestra resta, e la X dopo deve ancora fermarsi e chiedere.
fn chiudi_e_azzera(modificato: &AtomicBool, distruggi: impl FnOnce() -> Result<(), String>) -> Result<(), String> {
    distruggi()?;
    modificato.store(false, Ordering::SeqCst);
    Ok(())
}

/// La richiesta di chiusura: con modifiche non salvate si ferma e passa la domanda all'interfaccia. Il nome
/// dell'evento è quello che l'interfaccia ascolta (`eventoDiChiusura` in `ui/file.ts`, appaiati da
/// `ui/file.test.ts`).
pub fn alla_chiusura(finestra: &tauri::Window, evento: &tauri::WindowEvent) {
    use tauri::Manager;
    if let tauri::WindowEvent::CloseRequested { api, .. } = evento {
        if finestra.state::<Modificato>().0.load(Ordering::SeqCst) {
            api.prevent_close();
            if let Some(vista) = finestra.app_handle().get_webview_window(finestra.label()) {
                let _ = vista.eval("window.dispatchEvent(new Event('algodesign-chiusura'))");
            }
        }
    }
}

#[cfg(test)]
mod prove {
    use super::*;
    use crate::cartella_di_prova;

    #[test]
    fn l_estensione_del_filtro_ha_le_due_forme_di_ogni_lettera() {
        assert_eq!(estensione_senza_maiuscole(ALGO), "[aA][lL][gG][oO]");
        assert_eq!(estensione_senza_maiuscole(".csv"), "[cC][sS][vV]");
        // Le cifre restano come sono, e senza il punto davanti il risultato è lo stesso.
        assert_eq!(estensione_senza_maiuscole("mp3"), "[mM][pP]3");
        assert_eq!(estensione_senza_maiuscole("algo"), estensione_senza_maiuscole(".algo"));
    }

    #[test]
    fn il_testo_torna_con_gli_stessi_byte() {
        let base = cartella_di_prova("byte");
        let percorso = base.join("con spazi è.algo");
        // Un BOM, caratteri fuori dal piano di base, un a capo di Windows: niente si tocca.
        let testo = "\u{feff}{\r\n  \"name\": \"π 😀\"\n}\n";
        scrivi(&percorso, testo).unwrap();
        assert_eq!(fs::read(&percorso).unwrap(), testo.as_bytes());
        assert_eq!(leggi(&percorso).unwrap(), testo);
        assert_eq!(fs::read_dir(&base).unwrap().count(), 1, "resta un temporaneo accanto al file");
        fs::remove_dir_all(&base).unwrap();
    }

    /// I byte del PNG arrivano in base64 e si scrivono com'è (anche quelli che non sono UTF-8); un testo che non è base64
    /// non scrive nulla, e un nome riservato nemmeno.
    #[test]
    fn i_byte_in_base64_si_scrivono_come_sono() {
        let base = cartella_di_prova("byte-base64");
        // La firma del PNG e due byte che non sono UTF-8, in base64 scritto a mano: «iVBORw0KGgr/AA==».
        let attesi: Vec<u8> = vec![0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00];
        let percorso = base.join("flowchart è.png");
        scrivi_da_base64(&percorso, "iVBORw0KGgr/AA==").unwrap();
        assert_eq!(fs::read(&percorso).unwrap(), attesi);
        let cattivo = scrivi_da_base64(&base.join("rotto.png"), "non è base64!").unwrap_err();
        println!("base64 cattivo: {cattivo:?}");
        assert_eq!(cattivo.genere, "sistema");
        assert_eq!(scrivi_da_base64(&base.join("aux.png"), "iVBORw0KGgr/AA==").unwrap_err(), non_valido("aux.png"));
        // Nella cartella solo il file buono: niente temporanei, niente file del base64 cattivo o del nome riservato.
        let nomi: Vec<String> = fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name().to_string_lossy().into_owned()).collect();
        assert_eq!(nomi, vec!["flowchart è.png".to_owned()]);
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn un_file_che_non_e_utf8_o_che_manca_e_un_errore_col_suo_genere() {
        let base = cartella_di_prova("errori");
        let percorso = base.join("latino.algo");
        fs::write(&percorso, [b'{', 0xe8, b'}']).unwrap();
        assert_eq!(leggi(&percorso).unwrap_err().genere, "non_testo");
        assert_eq!(leggi(&base.join("assente.algo")).unwrap_err().genere, "sistema");
        // In una cartella che non c'è non si scrive (la sceglie la finestra del file, che c'è).
        assert_eq!(scrivi(&base.join("manca").join("x.algo"), "x").unwrap_err().genere, "sistema");
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn il_file_dato_all_avvio_e_il_primo_argomento_reso_assoluto() {
        let cartella = std::env::temp_dir();
        let argomenti = |v: &[&str]| v.iter().map(OsString::from).collect::<Vec<_>>();
        let qui = || Ok(cartella.clone());
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe"]), qui), None);
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe", "media.algo"]), qui), Some(cartella.join("media.algo")));
        let assoluto = cartella.join("altro").join("x.algo");
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe", assoluto.to_str().unwrap()]), qui), Some(assoluto.clone()));
        // La cartella di lavoro che non si legge (cancellata, su Linux) non ferma l'avvio: senza argomenti e con un
        // percorso assoluto non si chiede nemmeno; un argomento relativo resta com'è.
        let illeggibile = || -> std::io::Result<PathBuf> { Err(std::io::Error::other("cartella di lavoro cancellata")) };
        let mai = || -> std::io::Result<PathBuf> { panic!("cartella di lavoro chiesta senza un argomento relativo") };
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe"]), mai), None);
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe", assoluto.to_str().unwrap()]), mai), Some(assoluto));
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe", "media.algo"]), illeggibile), Some(PathBuf::from("media.algo")));
    }

    #[test]
    fn un_argomento_relativo_dall_appimage_si_risolve_dalla_cartella_di_partenza() {
        let partenza = std::env::temp_dir().join("Prova con spazi");
        let dentro = PathBuf::from("/tmp/.mount_AlgoDe/usr");
        let di_lavoro = || Ok(dentro.clone());
        let con_owd = |nome: &str| (nome == "OWD").then(|| partenza.clone().into_os_string());
        let senza = |_: &str| None;
        let argomenti = [OsString::from("AlgoDesign.AppImage"), OsString::from("media voti.algo")];
        // L'AppImage su Linux: la cartella di partenza è `OWD`, non quella di lavoro.
        let cartella = cartella_di_partenza(true, con_owd, di_lavoro).unwrap();
        assert_eq!(cartella, partenza);
        assert_eq!(dall_argomento(&argomenti, || cartella_di_partenza(true, con_owd, di_lavoro)), Some(partenza.join("media voti.algo")));
        // Senza `OWD`, o con un `OWD` relativo, vale la cartella di lavoro.
        assert_eq!(cartella_di_partenza(true, senza, di_lavoro).unwrap(), dentro);
        assert_eq!(cartella_di_partenza(true, |n: &str| (n == "OWD").then(|| OsString::from("relativa")), di_lavoro).unwrap(), dentro);
        // Fuori da Linux `OWD` non conta, anche se c'è.
        assert_eq!(cartella_di_partenza(false, con_owd, di_lavoro).unwrap(), dentro);
    }

    /// «Sostituire?» non si chiede per il file scelto, nemmeno quando la sua identità non si legge.
    #[test]
    fn il_file_scelto_non_fa_chiedere_anche_se_l_identita_non_si_legge() {
        let base = cartella_di_prova("identita");
        let scelto = base.join("media.algo");
        fs::write(&scelto, "c'era").unwrap();
        let mai_lo_stesso = |_: &Path, _: &Path| false;
        assert!(!da_chiedere(&scelto, &scelto, mai_lo_stesso));
        // Controllo positivo: un altro file che c'è fa chiedere, e uno che non c'è no.
        let altro = base.join("media.json");
        assert!(da_chiedere(&scelto, &altro, mai_lo_stesso));
        assert!(!da_chiedere(&base.join("manca.algo"), &altro, mai_lo_stesso));
        fs::remove_dir_all(&base).unwrap();
    }

    /// I file di un elenco: nome, testo, genere dell'errore.
    fn righe(file: &[FileDiEsempio]) -> Vec<(&str, Option<&str>, Option<&str>)> {
        file.iter().map(|f| (f.nome.as_str(), f.testo.as_deref(), f.errore.as_ref().map(|e| e.genere))).collect()
    }

    #[test]
    fn la_cartella_degli_esempi_si_crea_si_elenca_in_ordine_e_si_toglie() {
        let base = cartella_di_prova("esempi");
        let cartella = base.join("esempi");
        let mostrata = cartella.to_string_lossy().into_owned();
        assert_eq!(elenca(None, &cartella).unwrap(), Esempi { cartella: mostrata.clone(), predefinita: mostrata, mancante: false, esiste: false, file: vec![], gruppi: vec![] });
        scrivi_in(&cartella, None, "b media.algo", "due").unwrap();
        scrivi_in(&cartella, None, "a pari.algo", "uno").unwrap();
        // Un file che non è .algo non è un esempio; uno non UTF-8 si elenca con l'errore.
        fs::write(cartella.join("note.txt"), "x").unwrap();
        fs::write(cartella.join("c rotto.algo"), [0xe8]).unwrap();
        let esempi = elenca(None, &cartella).unwrap();
        assert!(esempi.esiste);
        assert_eq!(righe(&esempi.file), vec![("a pari.algo", Some("uno"), None), ("b media.algo", Some("due"), None), ("c rotto.algo", None, Some("non_testo"))]);
        assert_eq!(esempi.gruppi, vec![]);
        togli_da(&cartella, None, "a pari.algo").unwrap();
        assert!(!cartella.join("a pari.algo").exists());
        assert_eq!(togli_da(&cartella, None, "a pari.algo").unwrap_err().genere, "sistema");
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn ogni_sottocartella_e_un_gruppo_coi_suoi_esempi_che_si_scrivono_e_si_tolgono() {
        let base = cartella_di_prova("gruppi");
        let cartella = base.join("esempi");
        // Il gruppo nasce con il primo esempio scritto in lui (e la cartella con lui).
        scrivi_in(&cartella, Some("Primi passi"), "b media.algo", "due").unwrap();
        scrivi_in(&cartella, Some("Primi passi"), "a pari.algo", "uno").unwrap();
        scrivi_in(&cartella, Some("Cicli"), "parola.algo", "tre").unwrap();
        scrivi_in(&cartella, None, "sciolto.algo", "quattro").unwrap();
        // Nel gruppo: un file che non è .algo non è un esempio, e una cartella più in fondo non si guarda.
        fs::write(cartella.join("Cicli").join("note.txt"), "x").unwrap();
        fs::create_dir_all(cartella.join("Cicli").join("più in fondo")).unwrap();
        fs::write(cartella.join("Cicli").join("più in fondo").join("x.algo"), "x").unwrap();
        // Una sottocartella nascosta, e una che si chiama come un esempio, vuota: la prima non è un gruppo, la seconda sì.
        fs::create_dir(cartella.join(".nascosta")).unwrap();
        fs::write(cartella.join(".nascosta").join("y.algo"), "y").unwrap();
        fs::create_dir(cartella.join("altro.algo")).unwrap();
        let esempi = elenca(None, &cartella).unwrap();
        let gruppi: Vec<_> = esempi.gruppi.iter().map(|g| (g.nome.as_str(), righe(&g.file))).collect();
        assert_eq!(
            gruppi,
            vec![
                ("Cicli", vec![("parola.algo", Some("tre"), None)]),
                ("Primi passi", vec![("a pari.algo", Some("uno"), None), ("b media.algo", Some("due"), None)]),
                ("altro.algo", vec![]),
            ]
        );
        assert_eq!(righe(&esempi.file), vec![("sciolto.algo", Some("quattro"), None)]);
        // Togliere l'ultimo esempio di un gruppo lascia il gruppo, vuoto; togliere da un gruppo non tocca gli altri.
        togli_da(&cartella, Some("Cicli"), "parola.algo").unwrap();
        assert!(cartella.join("Cicli").is_dir());
        assert_eq!(togli_da(&cartella, None, "parola.algo").unwrap_err().genere, "sistema");
        assert_eq!(togli_da(&cartella, Some("Primi passi"), "sciolto.algo").unwrap_err().genere, "sistema");
        let esempi = elenca(None, &cartella).unwrap();
        assert_eq!(esempi.gruppi.iter().map(|g| (g.nome.as_str(), g.file.len())).collect::<Vec<_>>(), vec![("Cicli", 0), ("Primi passi", 2), ("altro.algo", 0)]);
        assert!(cartella.join("sciolto.algo").exists());
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn togliere_un_gruppo_cancella_i_suoi_esempi_e_la_sottocartella_solo_se_dentro_non_ce_altro() {
        let base = cartella_di_prova("togli-gruppo");
        let cartella = base.join("esempi");
        scrivi_in(&cartella, Some("Verifica"), "a.algo", "a").unwrap();
        scrivi_in(&cartella, Some("Verifica"), "b.algo", "b").unwrap();
        scrivi_in(&cartella, Some("Altro"), "c.algo", "c").unwrap();
        scrivi_in(&cartella, None, "sciolto.algo", "d").unwrap();
        fs::create_dir(cartella.join("Vuoto")).unwrap();
        // I file che il sistema scrive da solo (il Finder, Esplora risorse) non fermano l'eliminazione, e vanno via col gruppo.
        fs::write(cartella.join("Verifica").join(".DS_Store"), "x").unwrap();
        fs::write(cartella.join("Vuoto").join("Thumbs.db"), "x").unwrap();
        fs::write(cartella.join("Vuoto").join("desktop.ini"), "x").unwrap();
        // Il Mac, su una chiavetta che non conosce i suoi attributi, accanto a ogni file ne scrive uno col prefisso «._».
        fs::write(cartella.join("Verifica").join("._a.algo"), "x").unwrap();
        fs::write(cartella.join("Verifica").join("._.DS_Store"), "x").unwrap();
        togli_gruppo_da(&cartella, "Verifica").unwrap();
        togli_gruppo_da(&cartella, "Vuoto").unwrap();
        assert!(!cartella.join("Verifica").exists() && !cartella.join("Vuoto").exists());
        // Gli altri gruppi e i file fuori dai gruppi restano.
        assert!(cartella.join("Altro").join("c.algo").exists() && cartella.join("sciolto.algo").exists());
        // Un gruppo con altro dentro (un file che non è un esempio, una cartella più in fondo) non si tocca, nemmeno i
        // suoi esempi; l'errore nomina ciò che c'è.
        fs::write(cartella.join("Altro").join("note.txt"), "x").unwrap();
        fs::create_dir(cartella.join("Altro").join("più in fondo")).unwrap();
        let errore = togli_gruppo_da(&cartella, "Altro").unwrap_err();
        println!("{}", errore.dettaglio);
        assert!(errore.dettaglio.contains("note.txt") && errore.dettaglio.contains("più in fondo"), "{}", errore.dettaglio);
        assert!(cartella.join("Altro").join("c.algo").exists());
        // Un gruppo che non c'è è un errore del sistema.
        assert_eq!(togli_gruppo_da(&cartella, "Verifica").unwrap_err().genere, "sistema");
        fs::remove_dir_all(&base).unwrap();
    }

    /// Una regola sola per l'elenco e per le scritture: un esempio elencato si riscrive e si toglie (anche con
    /// l'estensione in maiuscolo), e un nome che l'app non sa gestire (i file nascosti, come quelli che il Mac scrive
    /// accanto a ogni file su una chiavetta exFAT, `._media.algo`) non si elenca e resta com'è.
    #[test]
    fn l_elenco_mostra_solo_gli_esempi_che_si_possono_riscrivere_e_togliere() {
        let base = cartella_di_prova("elenco-e-scritture");
        let cartella = base.join("esempi");
        fs::create_dir_all(cartella.join("Gruppo")).unwrap();
        let mut nascosti = vec!["._media.algo", ".nascosto.algo"];
        // Su Linux un nome può avere i due punti, che Windows non ammette.
        if cfg!(unix) {
            nascosti.push("a:b.algo");
        }
        for nome in ["Prova.ALGO", "media.Algo"].iter().chain(&nascosti) {
            fs::write(cartella.join(nome), "c'era").unwrap();
            fs::write(cartella.join("Gruppo").join(nome), "c'era").unwrap();
        }
        let esempi = elenca(None, &cartella).unwrap();
        let elencati: Vec<&str> = esempi.file.iter().map(|f| f.nome.as_str()).collect();
        let nel_gruppo: Vec<&str> = esempi.gruppi[0].file.iter().map(|f| f.nome.as_str()).collect();
        println!("elencati {elencati:?}, nel gruppo {nel_gruppo:?}, non elencati {nascosti:?}");
        assert_eq!(elencati, vec!["Prova.ALGO", "media.Algo"]);
        assert_eq!(nel_gruppo, elencati);
        for gruppo in [None, Some("Gruppo")] {
            for nome in &elencati {
                scrivi_in(&cartella, gruppo, nome, "nuovo").unwrap();
                togli_da(&cartella, gruppo, nome).unwrap();
            }
        }
        let dentro = |c: &Path| {
            let mut n: Vec<String> = fs::read_dir(c).unwrap().filter_map(|v| v.ok()).filter(|v| v.path().is_file()).map(|v| v.file_name().to_string_lossy().into_owned()).collect();
            n.sort();
            n
        };
        let mut attesi: Vec<String> = nascosti.iter().map(|n| n.to_string()).collect();
        attesi.sort();
        // I nomi non elencati restano, col testo di prima.
        assert_eq!(dentro(&cartella), attesi);
        assert_eq!(dentro(&cartella.join("Gruppo")), attesi);
        assert!(nascosti.iter().all(|n| fs::read_to_string(cartella.join(n)).unwrap() == "c'era"));
        fs::remove_dir_all(&base).unwrap();
    }

    /// «Elimina il gruppo» è tutto o niente: con un esempio in sola lettura non si cancella nulla, e l'errore lo nomina.
    #[test]
    fn un_gruppo_con_un_esempio_in_sola_lettura_resta_intero() {
        let base = cartella_di_prova("gruppo-sola-lettura");
        let cartella = base.join("esempi");
        for nome in ["a.algo", "b.algo", "c.algo"] {
            scrivi_in(&cartella, Some("Verifica"), nome, "x").unwrap();
        }
        let b = cartella.join("Verifica").join("b.algo");
        let mut permessi = fs::metadata(&b).unwrap().permissions();
        permessi.set_readonly(true);
        fs::set_permissions(&b, permessi.clone()).unwrap();
        let errore = togli_gruppo_da(&cartella, "Verifica").unwrap_err();
        let restano: Vec<bool> = ["a.algo", "b.algo", "c.algo"].iter().map(|n| cartella.join("Verifica").join(n).exists()).collect();
        println!("errore {errore:?}, restano {restano:?}");
        assert_eq!(restano, vec![true, true, true]);
        assert_eq!(errore, ErroreDelFile { genere: "sola_lettura", dettaglio: "b.algo".into() });
        // Controllo positivo: tolta la sola lettura, il gruppo va via intero.
        #[allow(clippy::permissions_set_readonly_false)]
        permessi.set_readonly(false);
        fs::set_permissions(&b, permessi).unwrap();
        togli_gruppo_da(&cartella, "Verifica").unwrap();
        assert!(!cartella.join("Verifica").exists());
        fs::remove_dir_all(&base).unwrap();
    }

    /// Un nome che Windows riserva scritto nella finestra del sistema («aux», che diventa «aux.algo») non si scrive:
    /// l'errore del nome, e nessun file (nemmeno il temporaneo) nella cartella. La regola dei nomi vale per ogni scrittura.
    #[test]
    fn un_nome_riservato_scelto_nella_finestra_del_sistema_non_si_scrive() {
        let base = cartella_di_prova("nome-riservato");
        let elenco = || -> Vec<String> { fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name().to_string_lossy().into_owned()).collect() };
        let (percorso, _) = da_salvare(base.join("aux"), ALGO);
        let esito = scrivi(&percorso, "x");
        println!("esito {esito:?}, nella cartella {:?}", elenco());
        assert_eq!(esito, Err(non_valido("aux.algo")));
        assert_eq!(elenco(), Vec::<String>::new());
        // Controllo positivo: un nome libero si scrive.
        let (libero, _) = da_salvare(base.join("aux2"), ALGO);
        scrivi(&libero, "x").unwrap();
        assert_eq!(elenco(), vec!["aux2.algo".to_owned()]);
        fs::remove_dir_all(&base).unwrap();
    }

    /// La sottocartella del gruppo con l'attributo di sola lettura (Esplora risorse lo mette alle cartelle
    /// personalizzate): su Windows non ferma la cancellazione dei file, ma quella della cartella sì. Il gruppo va via
    /// intero, e non resta vuoto col suo nome dopo aver perso gli esempi.
    #[test]
    fn un_gruppo_nella_cartella_in_sola_lettura_va_via_intero() {
        let base = cartella_di_prova("gruppo-cartella-sola-lettura");
        let cartella = base.join("esempi");
        for nome in ["a.algo", "b.algo"] {
            scrivi_in(&cartella, Some("Verifica"), nome, "x").unwrap();
        }
        let dentro = cartella.join("Verifica");
        let mut permessi = fs::metadata(&dentro).unwrap().permissions();
        permessi.set_readonly(true);
        fs::set_permissions(&dentro, permessi).unwrap();
        // Controllo positivo della premessa: la cartella è davvero in sola lettura.
        assert!(fs::metadata(&dentro).unwrap().permissions().readonly());
        let esito = togli_gruppo_da(&cartella, "Verifica");
        let restano: Vec<bool> = ["a.algo", "b.algo"].iter().map(|n| dentro.join(n).exists()).collect();
        println!("esito {esito:?}, la cartella c'è {}, restano {restano:?}", dentro.exists());
        assert_eq!(esito, Ok(()));
        assert!(!dentro.exists());
        assert_eq!(fs::read_dir(&cartella).unwrap().count(), 0, "nessuna cartella nascosta rimasta");
        fs::remove_dir_all(&base).unwrap();
    }

    /// «Elimina il gruppo» è tutto o niente: con un esempio aperto da un altro programma (senza permettere di
    /// cancellarlo) non si cancella nulla.
    #[cfg(windows)]
    #[test]
    fn un_gruppo_con_un_esempio_aperto_in_un_altro_programma_resta_intero() {
        use std::os::windows::fs::OpenOptionsExt;
        let base = cartella_di_prova("gruppo-aperto");
        let cartella = base.join("esempi");
        for nome in ["a.algo", "b.algo", "c.algo"] {
            scrivi_in(&cartella, Some("Verifica"), nome, "x").unwrap();
        }
        // Condiviso solo in lettura (FILE_SHARE_READ): né scrittura né cancellazione, come fa un programma che lo tiene aperto.
        let aperto = fs::OpenOptions::new().read(true).share_mode(1).open(cartella.join("Verifica").join("b.algo")).unwrap();
        let errore = togli_gruppo_da(&cartella, "Verifica").unwrap_err();
        let restano: Vec<bool> = ["a.algo", "b.algo", "c.algo"].iter().map(|n| cartella.join("Verifica").join(n).exists()).collect();
        println!("errore {errore:?}, restano {restano:?}");
        assert_eq!(restano, vec![true, true, true]);
        assert_eq!(errore.genere, "gruppo_bloccato");
        // Nessuna cartella nascosta lasciata accanto ai gruppi.
        assert_eq!(fs::read_dir(&cartella).unwrap().count(), 1);
        // Controllo positivo: chiuso il file, il gruppo va via intero.
        drop(aperto);
        togli_gruppo_da(&cartella, "Verifica").unwrap();
        assert!(!cartella.join("Verifica").exists());
        fs::remove_dir_all(&base).unwrap();
    }

    /// I generi degli errori del guscio sono quelli che l'interfaccia sa dire (`generiDelFile` in `ui/file.ts`), e ogni
    /// genere scritto in questo file è fra quelli: un genere nuovo da un lato solo arriverebbe come «sistema» o non
    /// verrebbe detto.
    #[test]
    fn i_generi_degli_errori_sono_quelli_che_l_interfaccia_sa_dire() {
        let interfaccia = include_str!("../../ui/file.ts");
        let da = interfaccia.find("export const generiDelFile = [").expect("manca generiDelFile in ui/file.ts") + "export const generiDelFile = [".len();
        let corpo = &interfaccia[da..da + interfaccia[da..].find(']').unwrap()];
        let letti: std::collections::BTreeSet<&str> = corpo.split(',').map(|g| g.trim().trim_matches('"')).filter(|g| !g.is_empty()).collect();
        let dichiarati: std::collections::BTreeSet<&str> = GENERI.into_iter().collect();
        let sorgente = include_str!("progetto.rs");
        let scritti: std::collections::BTreeSet<&str> = sorgente.match_indices("genere: \"").map(|(i, _)| &sorgente[i + 9..i + 9 + sorgente[i + 9..].find('"').unwrap()]).collect();
        println!("generi: dell'interfaccia {letti:?}, del guscio {dichiarati:?}, scritti nel guscio {scritti:?}");
        assert_eq!(letti, dichiarati);
        assert!(scritti.is_subset(&dichiarati), "generi scritti e non dichiarati: {:?}", scritti.difference(&dichiarati).collect::<Vec<_>>());
        // Le premesse: i rilevatori trovano i sei generi, e nel guscio almeno i cinque che si scrivono come testo.
        assert_eq!(letti.len(), 6);
        assert!(scritti.len() >= 5, "{scritti:?}");
    }

    /// Gli errori del guscio che l'interfaccia deve dire con parole sue hanno un genere e i dati, non una frase.
    #[test]
    fn gli_errori_dei_nomi_e_dei_gruppi_hanno_il_loro_genere() {
        let base = cartella_di_prova("generi");
        let cartella = base.join("esempi");
        assert_eq!(togli_da(&cartella, None, "a/b.algo").unwrap_err(), ErroreDelFile { genere: "nome_non_valido", dettaglio: "a/b.algo".into() });
        assert_eq!(scrivi_in(&cartella, Some("a?"), "x.algo", "x").unwrap_err(), ErroreDelFile { genere: "nome_non_valido", dettaglio: "a?".into() });
        assert_eq!(togli_gruppo_da(&cartella, "..").unwrap_err(), ErroreDelFile { genere: "nome_non_valido", dettaglio: "..".into() });
        scrivi_in(&cartella, Some("Altro"), "c.algo", "c").unwrap();
        fs::write(cartella.join("Altro").join("note.txt"), "x").unwrap();
        fs::create_dir(cartella.join("Altro").join("più in fondo")).unwrap();
        assert_eq!(togli_gruppo_da(&cartella, "Altro").unwrap_err(), ErroreDelFile { genere: "gruppo_con_altro", dettaglio: "note.txt, più in fondo".into() });
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn la_cartella_scelta_vale_se_esiste_altrimenti_la_predefinita_senza_ricrearla() {
        let base = cartella_di_prova("scelta");
        let predefinita = base.join("esempi");
        let scelta = base.join("miei esempi");
        fs::create_dir(&scelta).unwrap();
        let testo = scelta.to_str().unwrap();
        // Scelta e presente: si usa lei, e una cartella vuota resta vuota.
        let e = elenca(Some(testo), &predefinita).unwrap();
        assert_eq!((e.cartella.as_str(), e.mancante, e.esiste, e.file.len()), (testo, false, true, 0));
        assert_eq!(e.predefinita, predefinita.to_string_lossy());
        scrivi_in(&cartella_in_uso(Some(testo), &predefinita).0, None, "mio.algo", "x").unwrap();
        assert!(scelta.join("mio.algo").exists());
        assert!(!predefinita.exists());
        // Una scelta vuota vale come nessuna scelta.
        assert_eq!(cartella_in_uso(Some(""), &predefinita), (predefinita.clone(), false));
        // Scelta e sparita: la predefinita, col segno; la cartella sparita non si ricrea.
        fs::remove_dir_all(&scelta).unwrap();
        let e = elenca(Some(testo), &predefinita).unwrap();
        assert_eq!((e.cartella, e.mancante, e.esiste), (predefinita.to_string_lossy().into_owned(), true, false));
        scrivi_in(&cartella_in_uso(Some(testo), &predefinita).0, None, "mio.algo", "x").unwrap();
        assert!(predefinita.join("mio.algo").exists());
        assert!(!scelta.exists());
        // Un file al posto della cartella non è una cartella.
        fs::write(base.join("un file"), "").unwrap();
        assert_eq!(cartella_in_uso(base.join("un file").to_str(), &predefinita), (predefinita.clone(), true));
        fs::remove_dir_all(&base).unwrap();
    }

    #[derive(serde::Deserialize)]
    struct Coppia {
        buoni: Vec<String>,
        cattivi: Vec<String>,
    }

    #[derive(serde::Deserialize)]
    struct Riservati {
        si: Vec<String>,
        no: Vec<String>,
    }

    #[derive(serde::Deserialize)]
    struct Nomi {
        esempi: Coppia,
        gruppi: Coppia,
        riservati: Riservati,
    }

    /// Un nome della tabella col carattere di controllo scritto `<U+XXXX>` costruito.
    fn con_i_controlli(nome: &str) -> String {
        let mut fuori = String::new();
        let mut resto = nome;
        while let Some(i) = resto.find("<U+") {
            fuori.push_str(&resto[..i]);
            let codice = u32::from_str_radix(&resto[i + 3..i + 7], 16).expect("<U+XXXX> con quattro cifre esadecimali");
            fuori.push(char::from_u32(codice).unwrap());
            resto = &resto[i + 8..];
        }
        fuori + resto
    }

    /// La tabella dei nomi comune con la prova dell'interfaccia (`ui/esempi.test.ts`).
    fn nomi() -> Nomi {
        let mut n: Nomi = serde_json::from_str(include_str!("nomi.json")).unwrap();
        for lista in [&mut n.esempi.buoni, &mut n.esempi.cattivi, &mut n.gruppi.buoni, &mut n.gruppi.cattivi, &mut n.riservati.si, &mut n.riservati.no] {
            for nome in lista.iter_mut() {
                *nome = con_i_controlli(nome);
            }
        }
        n
    }

    #[test]
    fn i_nomi_riservati_di_windows_sono_quelli_della_tabella_comune() {
        let n = nomi();
        for nome in &n.riservati.si {
            assert!(nome_riservato(nome), "{nome:?}");
        }
        for nome in &n.riservati.no {
            assert!(!nome_riservato(nome), "{nome:?}");
        }
        println!("riservati {}, simili {}", n.riservati.si.len(), n.riservati.no.len());
        // Controllo positivo: i caratteri di controllo della tabella sono costruiti.
        assert!(n.esempi.cattivi.iter().any(|c| c.chars().any(|x| x == '\u{7f}')), "nessun U+007F costruito");
    }

    #[test]
    fn il_nome_di_un_esempio_non_esce_dalla_cartella() {
        // Dalla tabella comune: accanto ai nomi riservati di Windows, quelli che ci assomigliano e non lo sono.
        let n = nomi();
        for buono in &n.esempi.buoni {
            assert!(nome_di_esempio_valido(buono), "{buono:?}");
        }
        for cattivo in &n.esempi.cattivi {
            assert!(!nome_di_esempio_valido(cattivo), "{cattivo:?}");
        }
        println!("esempi buoni {}, cattivi {}", n.esempi.buoni.len(), n.esempi.cattivi.len());
        let base = cartella_di_prova("fuori");
        assert!(scrivi_in(&base.join("esempi"), None, "../fuori.algo", "x").is_err());
        assert!(!base.join("fuori.algo").exists());
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn il_gruppo_di_un_esempio_non_esce_dalla_cartella() {
        let n = nomi();
        for buono in &n.gruppi.buoni {
            assert!(nome_di_gruppo_valido(buono), "{buono:?}");
        }
        let base = cartella_di_prova("gruppo-fuori");
        let cartella = base.join("esempi");
        // Dalla tabella comune, più un percorso assoluto di questa macchina.
        let assoluto = base.join("altrove").to_string_lossy().into_owned();
        let cattivi: Vec<&str> = n.gruppi.cattivi.iter().map(String::as_str).chain([assoluto.as_str()]).collect();
        for &cattivo in &cattivi {
            assert!(!nome_di_gruppo_valido(cattivo), "{cattivo}");
            assert!(scrivi_in(&cartella, Some(cattivo), "x.algo", "x").is_err(), "{cattivo}");
            assert!(togli_da(&cartella, Some(cattivo), "x.algo").is_err(), "{cattivo}");
            assert!(togli_gruppo_da(&cartella, cattivo).is_err(), "{cattivo}");
        }
        // Nessuna scrittura fuori: né accanto alla cartella, né nel percorso assoluto, né dentro (il gruppo vuoto
        // o fatto di soli spazi scriverebbe nella cartella stessa).
        assert!(!base.join("x.algo").exists() && !base.join("altrove").exists() && !cartella.exists());
        // Il nome dell'esempio è controllato anche dentro un gruppo valido.
        assert!(scrivi_in(&cartella, Some("Primi passi"), "../fuori.algo", "x").is_err());
        assert!(!cartella.join("fuori.algo").exists());
        // Controllo positivo: lo stesso esempio, in un gruppo valido, si scrive.
        scrivi_in(&cartella, Some("Primi passi"), "x.algo", "x").unwrap();
        assert!(cartella.join("Primi passi").join("x.algo").exists());
        println!("gruppi rifiutati {} (scrittura e togliere)", cattivi.len());
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn la_finestra_del_file_parte_dalla_cartella_chiesta_se_esiste_poi_da_quella_portabile() {
        let base = cartella_di_prova("partenza");
        let chiesta = base.join("progetti");
        let portabile = base.join("chiavetta");
        fs::create_dir_all(&chiesta).unwrap();
        let testo = chiesta.to_str().unwrap();
        assert_eq!(partenza(Some(testo), Some(&portabile)), Some(chiesta.clone()));
        assert_eq!(partenza(Some(testo), None), Some(chiesta.clone()));
        // Una cartella che non c'è più (la chiavetta con un'altra lettera): quella portabile, o nessuna.
        let sparita = base.join("sparita");
        assert_eq!(partenza(sparita.to_str(), Some(&portabile)), Some(portabile.clone()));
        assert_eq!(partenza(sparita.to_str(), None), None);
        assert_eq!(partenza(None, Some(&portabile)), Some(portabile.clone()));
        assert_eq!(partenza(None, None), None);
        fs::remove_dir_all(&base).unwrap();
    }

    // Una chiave scritta male (`maiuscoleDistinti`, `cartele`) è un errore, non un campo ignorato col suo valore di
    // partenza: una riga che si salta, o una cartella che non c'è, uscirebbe verde senza dire nulla.
    #[derive(serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Caso {
        scelto: String,
        esistono: Vec<String>,
        #[serde(default)]
        cartelle: Vec<String>,
        percorso: String,
        sostituire: bool,
        #[serde(default, rename = "maiuscoleDistinte")]
        maiuscole_distinte: bool,
        /// L'estensione del file: «.csv» per la tabella esportata, quella del codice o dell'immagine; senza, quella del
        /// progetto.
        #[serde(default = "estensione_del_progetto")]
        estensione: String,
    }

    fn estensione_del_progetto() -> String {
        ALGO.to_owned()
    }

    #[derive(serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Casi {
        descrizione: String,
        casi: Vec<Caso>,
    }

    #[test]
    fn la_tabella_di_salva_con_nome_rifiuta_una_chiave_scritta_male() {
        let riga = |chiave: &str| format!(r#"{{ "descrizione": "x", "casi": [{{ "scelto": "a", "esistono": [], "percorso": "a.algo", "sostituire": false, "{chiave}": true }}] }}"#);
        // Controllo positivo: la stessa riga con la chiave giusta si legge.
        assert!(serde_json::from_str::<Casi>(&riga("maiuscoleDistinte")).is_ok());
        let errore = serde_json::from_str::<Casi>(&riga("maiuscoleDistinti")).err().map(|e| e.to_string()).unwrap_or_default();
        assert!(errore.contains("unknown field `maiuscoleDistinti`"), "{errore:?}");
        let fuori = serde_json::from_str::<Casi>(r#"{ "descrizone": "x", "casi": [] }"#).err().map(|e| e.to_string()).unwrap_or_default();
        assert!(fuori.contains("unknown field `descrizone`"), "{fuori:?}");
    }

    #[test]
    fn salva_con_nome_aggiunge_algo_e_chiede_solo_per_un_file_che_il_sistema_non_ha_confermato() {
        let casi: Casi = serde_json::from_str(include_str!("salva-con-nome.json")).unwrap();
        let base = cartella_di_prova("salva-con-nome");
        // Il disco distingue le maiuscole? (Su Windows no: le righe che lo chiedono si saltano, e si contano.)
        fs::write(base.join("Prova"), "").unwrap();
        let distingue = !base.join("prova").exists();
        let mut sbagliati = vec![];
        let mut saltati = 0;
        for (i, c) in casi.casi.iter().enumerate() {
            if c.maiuscole_distinte && !distingue {
                saltati += 1;
                continue;
            }
            let cartella = base.join(i.to_string());
            fs::create_dir_all(&cartella).unwrap();
            for nome in &c.esistono {
                fs::write(cartella.join(nome), "c'era").unwrap();
            }
            for nome in &c.cartelle {
                fs::create_dir_all(cartella.join(nome)).unwrap();
            }
            let visto = da_salvare(cartella.join(&c.scelto), &c.estensione);
            if visto != (cartella.join(&c.percorso), c.sostituire) {
                sbagliati.push(format!("{} ({}) con {:?}: {:?}", c.scelto, c.estensione, c.esistono, visto));
            }
        }
        fs::remove_dir_all(&base).unwrap();
        let tabella = casi.casi.iter().filter(|c| c.estensione == CSV).count();
        let codice = casi.casi.iter().filter(|c| CODICE.contains(&c.estensione.as_str())).count();
        let immagine = casi.casi.iter().filter(|c| IMMAGINE.contains(&c.estensione.as_str())).count();
        println!("casi {} (della tabella esportata {tabella}, del codice {codice}, del flowchart esportato {immagine}), saltati perché il disco non distingue le maiuscole {saltati}", casi.casi.len());
        // La premessa: la tabella ha casi del progetto, della tabella e di ogni estensione del codice e dell'immagine, e
        // nessuna altra.
        assert!(tabella > 0 && tabella < casi.casi.len(), "{tabella} casi «.csv» su {}", casi.casi.len());
        for e in CODICE.into_iter().chain(IMMAGINE) {
            assert!(casi.casi.iter().any(|c| c.estensione == e), "nessun caso «{e}»");
        }
        assert!(casi.casi.iter().all(|c| c.estensione == ALGO || c.estensione == CSV || CODICE.contains(&c.estensione.as_str()) || IMMAGINE.contains(&c.estensione.as_str())));
        assert_eq!(sbagliati, Vec::<String>::new());
        assert!(!casi.descrizione.is_empty());
        // Le righe che un disco senza maiuscole salta: quante sono si scrive qui, non si legge dalla tabella (che
        // altrimenti si confronterebbe con sé stessa: tolta la riga, zero saltate su zero attese).
        let col_segno = casi.casi.iter().filter(|c| c.maiuscole_distinte).count();
        assert_eq!(col_segno, 1, "righe con «maiuscoleDistinte»");
        assert_eq!(saltati, if distingue { 0 } else { col_segno });
        // Su un disco senza maiuscole l'unica riga che distingue il file scelto dal file finale quando esistono tutti e
        // due: senza di lei `stesso_file` sbagliato resterebbe verde su Windows.
        let specie = casi.casi.iter().filter(|c| !c.maiuscole_distinte && c.scelto != c.percorso && c.esistono.contains(&c.scelto) && c.esistono.contains(&c.percorso)).count();
        assert!(specie > 0, "nessuna riga valida su ogni disco col file scelto e quello finale che esistono e sono diversi");
        // La tabella ha le due risposte (una decisione sempre uguale non passerebbe).
        let chiede = casi.casi.iter().filter(|c| c.sostituire).count();
        assert!(chiede > 0 && chiede < casi.casi.len(), "{chiede} su {}", casi.casi.len());
    }

    /// Il file da salvare arriva all'interfaccia con le chiavi che lei legge (`FileDaSalvare` in `ui/file.ts`):
    /// una chiave rinominata qui lascerebbe `sostituire` indefinito e il file sostituito senza domanda. Le chiavi
    /// dell'interfaccia sono le righe `readonly <chiave>:` della sua dichiarazione.
    #[test]
    fn il_file_da_salvare_arriva_allinterfaccia_con_le_chiavi_che_legge() {
        let interfaccia = include_str!("../../ui/file.ts");
        let inizio = interfaccia.find("export interface FileDaSalvare {").expect("manca la dichiarazione di FileDaSalvare in ui/file.ts");
        let corpo = &interfaccia[inizio..];
        let corpo = &corpo[..corpo.find("\n}").expect("la dichiarazione non si chiude")];
        let lette: std::collections::BTreeSet<String> =
            corpo.lines().filter_map(|r| r.trim().strip_prefix("readonly ")?.split(':').next().map(str::to_owned)).collect();
        let mandato = serde_json::to_value(FileDaSalvare { percorso: "x.algo".into(), sostituire: true }).unwrap();
        let mandate: std::collections::BTreeSet<String> = mandato.as_object().unwrap().keys().cloned().collect();
        println!("chiavi lette dall'interfaccia {lette:?}, mandate dal guscio {mandate:?}");
        // Controllo positivo: il rilevatore trova le chiavi dell'interfaccia (due, oggi).
        assert_eq!(lette.len(), 2, "{lette:?}");
        assert_eq!(mandate, lette);
    }

    /// Una chiusura che fallisce lascia la finestra aperta: «modificato» resta, e la X dopo chiede ancora.
    #[test]
    fn una_chiusura_che_fallisce_lascia_modificato_e_una_che_riesce_lo_azzera() {
        let modificato = AtomicBool::new(true);
        assert!(chiudi_e_azzera(&modificato, || Err("la finestra non si chiude".into())).is_err());
        assert!(modificato.load(Ordering::SeqCst), "dopo una chiusura fallita «modificato» è azzerato: la X dopo chiuderebbe senza chiedere");
        // Controllo positivo: una chiusura riuscita lo azzera, e il rilevatore lo vede.
        assert!(chiudi_e_azzera(&modificato, || Ok(())).is_ok());
        assert!(!modificato.load(Ordering::SeqCst), "controllo positivo spento: dopo una chiusura riuscita «modificato» resta");
    }

    /// Il file system del disco che contiene `percorso` («NTFS», «exFAT», «FAT32»).
    #[cfg(windows)]
    fn file_system(percorso: &Path) -> String {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::Storage::FileSystem::{GetVolumeInformationW, GetVolumePathNameW};
        let largo: Vec<u16> = percorso.as_os_str().encode_wide().chain([0]).collect();
        let mut radice = [0u16; 261];
        let mut nome = [0u16; 261];
        // SAFETY: le stringhe finiscono con lo zero e i buffer hanno la lunghezza dichiarata.
        unsafe {
            assert_ne!(GetVolumePathNameW(largo.as_ptr(), radice.as_mut_ptr(), radice.len() as u32), 0, "la radice del disco di {percorso:?}");
            let (n16, n32) = (std::ptr::null_mut(), std::ptr::null_mut());
            assert_ne!(GetVolumeInformationW(radice.as_ptr(), n16, 0, n32, n32, n32, nome.as_mut_ptr(), nome.len() as u32), 0, "il file system di {percorso:?}");
        }
        String::from_utf16_lossy(&nome[..nome.iter().position(|c| *c == 0).unwrap()])
    }

    /// Su Windows «media.ALGO» e «media.algo» sono lo stesso file: il sistema ha già chiesto di sostituirlo, e
    /// l'app non chiede una seconda volta; il file scritto resta uno solo, col testo nuovo. Il nome dopo la rinomina
    /// dipende dal disco: su NTFS è quello nuovo (`media.algo`); su exFAT resta quello vecchio (`media.ALGO`, misurato
    /// sulla chiavetta), e fuori da NTFS si accettano i due (scelta dichiarata: nessuna perdita, cambia solo l'aspetto).
    #[cfg(windows)]
    #[test]
    fn su_windows_lestensione_con_altre_maiuscole_e_lo_stesso_file_nessuna_seconda_domanda() {
        let base = cartella_di_prova("maiuscole");
        let disco = file_system(&base);
        fs::write(base.join("media.ALGO"), "c'era").unwrap();
        let (percorso, sostituire) = da_salvare(base.join("media.ALGO"), ALGO);
        assert_eq!((percorso.clone(), sostituire), (base.join("media.algo"), false));
        scrivi(&percorso, "nuovo").unwrap();
        let nomi: Vec<_> = fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name().to_string_lossy().into_owned()).collect();
        println!("disco {disco}; nomi nella cartella dopo la scrittura atomica: {nomi:?}");
        assert_eq!(leggi(&base.join("media.algo")).unwrap(), "nuovo");
        if disco == "NTFS" {
            assert_eq!(nomi, vec!["media.algo"]);
        } else {
            assert!(nomi == vec!["media.algo"] || nomi == vec!["media.ALGO"], "{nomi:?}");
        }
        fs::remove_dir_all(&base).unwrap();
    }
}
