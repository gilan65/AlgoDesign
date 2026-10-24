// I file del progetto e gli esempi aggiunti dall'utente. Contratto con l'interfaccia (app/ui/file.ts):
// - `scegli_file_da_aprire` con `filtro` (il nome del tipo di file) e `cartella` → il percorso scelto, o
//   `null` se l'utente rinuncia; `scegli_file_da_salvare` con `proposto` (il nome proposto), `filtro` e
//   `cartella` → `{ percorso, sostituire }` (il percorso scelto che finisce in `.algo`, e se chiedere di
//   sostituire il file che c'è: `da_salvare`), o `null` (le chiavi le appaia con `ui/file.ts` una prova qui
//   sotto); `scegli_file_da_esportare`, con gli stessi argomenti, fa lo stesso con `.csv`, per la tabella di
//   traccia (il testo lo scrive `scrivi_progetto`); `scegli_file_del_codice`, con in più `estensione` (`.txt`,
//   `.py` o `.c`: un'altra non apre la finestra e vale `null`), per il codice generato. Le finestre sono quelle native del sistema (libreria `rfd`), modali sulla
//   finestra dell'app. Partono da `cartella` (quella del file aperto o dell'ultimo usato, se c'è ancora);
//   altrimenti, nella versione portabile, dalla cartella dell'eseguibile; altrimenti da dove decide il sistema;
// - `leggi_progetto` con `percorso` → il testo; `scrivi_progetto` con `percorso` e `testo`, scrittura
//   atomica. Un errore arriva come `{ genere, dettaglio }`: `non_testo` (il file non è UTF-8) o `sistema`
//   (il messaggio del sistema);
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

fn di_sistema(e: std::io::Error) -> ErroreDelFile {
    ErroreDelFile { genere: "sistema", dettaglio: e.to_string() }
}

pub fn leggi(percorso: &Path) -> Result<String, ErroreDelFile> {
    let byte = fs::read(percorso).map_err(di_sistema)?;
    String::from_utf8(byte).map_err(|e| ErroreDelFile { genere: "non_testo", dettaglio: e.to_string() })
}

pub fn scrivi(percorso: &Path, testo: &str) -> Result<(), ErroreDelFile> {
    scrittura::atomica(percorso, testo.as_bytes()).map_err(di_sistema)
}

/// Il file da aprire all'avvio: il primo argomento, reso assoluto rispetto alla cartella di lavoro.
pub fn dall_argomento(argomenti: &[OsString], cartella: &Path) -> Option<PathBuf> {
    let primo = PathBuf::from(argomenti.get(1)?);
    Some(if primo.is_absolute() { primo } else { cartella.join(primo) })
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
/// Le estensioni del codice generato: pseudocodice, Python, C.
pub const CODICE: [&str; 3] = [".txt", ".py", ".c"];

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
    let sostituire = fs::metadata(&percorso).is_ok_and(|m| m.is_file()) && !stesso_file(&percorso, &scelto);
    (percorso, sostituire)
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

/// Il nome di un esempio è il nome di un file `.algo` nella cartella: niente separatori né `..`, niente
/// caratteri che Windows non ammette in un nome, nessun nome riservato.
pub fn nome_di_esempio_valido(nome: &str) -> bool {
    let base = nome.strip_suffix(".algo").unwrap_or("");
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

/// I file `.algo` di una cartella, in ordine di nome, col testo o perché non si leggono.
fn file_di(cartella: &Path) -> Result<Vec<FileDiEsempio>, ErroreDelFile> {
    let nomi = voci(cartella, |v, n| v.file_type().is_ok_and(|t| t.is_file()) && n.to_lowercase().ends_with(".algo"))?;
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

fn non_valido(cosa: &str, nome: &str) -> ErroreDelFile {
    ErroreDelFile { genere: "sistema", dettaglio: format!("nome di {cosa} non valido: {nome:?}") }
}

/// Il file di un esempio: nella cartella, o nel suo gruppo; con un nome o un gruppo che uscirebbe dalla cartella,
/// l'errore.
fn percorso_di(cartella: &Path, gruppo: Option<&str>, nome: &str) -> Result<PathBuf, ErroreDelFile> {
    if !nome_di_esempio_valido(nome) {
        return Err(non_valido("esempio", nome));
    }
    match gruppo {
        Some(g) if !nome_di_gruppo_valido(g) => Err(non_valido("gruppo", g)),
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

/// Toglie un gruppo: i suoi esempi (e i file che il sistema vi ha scritto da solo), poi la sottocartella. Se dentro c'è
/// altro (un file che non è un esempio, una cartella più in fondo) non tocca nulla: l'app cancella solo ciò che mostra.
pub fn togli_gruppo_da(cartella: &Path, gruppo: &str) -> Result<(), ErroreDelFile> {
    if !nome_di_gruppo_valido(gruppo) {
        return Err(non_valido("gruppo", gruppo));
    }
    let dentro = cartella.join(gruppo);
    let esempi = voci(&dentro, |v, n| v.file_type().is_ok_and(|t| t.is_file()) && n.to_lowercase().ends_with(".algo"))?;
    let del_sistema = voci(&dentro, |v, n| v.file_type().is_ok_and(|t| t.is_file()) && DEL_SISTEMA.contains(&n.to_lowercase().as_str()))?;
    let altro: Vec<String> = fs::read_dir(&dentro)
        .map_err(di_sistema)?
        .filter_map(|v| v.ok())
        .map(|v| v.file_name().to_string_lossy().into_owned())
        .filter(|n| !esempi.contains(n) && !del_sistema.contains(n))
        .collect();
    if !altro.is_empty() {
        return Err(ErroreDelFile { genere: "sistema", dettaglio: format!("nel gruppo {gruppo:?} c'è altro oltre agli esempi: {}", altro.join(", ")) });
    }
    for nome in esempi.iter().chain(&del_sistema) {
        fs::remove_file(dentro.join(nome)).map_err(di_sistema)?;
    }
    fs::remove_dir(&dentro).map_err(di_sistema)
}

fn finestra_del_file(finestra: &tauri::WebviewWindow, filtro: &str, estensione: &str, cartella: Option<&str>, portabile: &CartellaPortabile) -> rfd::FileDialog {
    let dialogo = rfd::FileDialog::new().add_filter(filtro, &[estensione.trim_start_matches('.')]).set_parent(finestra);
    match partenza(cartella, portabile.0.as_deref()) {
        Some(c) => dialogo.set_directory(c),
        None => dialogo,
    }
}

#[tauri::command]
pub fn scegli_file_da_aprire(finestra: tauri::WebviewWindow, filtro: String, cartella: Option<String>, portabile: tauri::State<'_, CartellaPortabile>) -> Option<String> {
    finestra_del_file(&finestra, &filtro, ALGO, cartella.as_deref(), &portabile).pick_file().map(|p| p.to_string_lossy().into_owned())
}

fn scegli_dove_salvare(finestra: &tauri::WebviewWindow, proposto: String, filtro: &str, estensione: &str, cartella: Option<&str>, portabile: &CartellaPortabile) -> Option<FileDaSalvare> {
    finestra_del_file(finestra, filtro, estensione, cartella, portabile).set_file_name(proposto).save_file().map(|p| {
        let (percorso, sostituire) = da_salvare(p, estensione);
        FileDaSalvare { percorso: percorso.to_string_lossy().into_owned(), sostituire }
    })
}

#[tauri::command]
pub fn scegli_file_da_salvare(
    finestra: tauri::WebviewWindow,
    proposto: String,
    filtro: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    scegli_dove_salvare(&finestra, proposto, &filtro, ALGO, cartella.as_deref(), &portabile)
}

/// Dove esportare la tabella di traccia: come «Salva con nome», con `.csv`. Il testo lo scrive `scrivi_progetto`.
#[tauri::command]
pub fn scegli_file_da_esportare(
    finestra: tauri::WebviewWindow,
    proposto: String,
    filtro: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    scegli_dove_salvare(&finestra, proposto, &filtro, CSV, cartella.as_deref(), &portabile)
}

/// Dove salvare il codice generato: come «Salva con nome», con l'estensione del linguaggio, che deve essere una di
/// `CODICE`. Il testo lo scrive `scrivi_progetto`.
#[tauri::command]
pub fn scegli_file_del_codice(
    finestra: tauri::WebviewWindow,
    proposto: String,
    filtro: String,
    estensione: String,
    cartella: Option<String>,
    portabile: tauri::State<'_, CartellaPortabile>,
) -> Option<FileDaSalvare> {
    let estensione = CODICE.into_iter().find(|e| *e == estensione)?;
    scegli_dove_salvare(&finestra, proposto, &filtro, estensione, cartella.as_deref(), &portabile)
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

#[tauri::command]
pub fn scegli_cartella(finestra: tauri::WebviewWindow, cartella: Option<String>, portabile: tauri::State<'_, CartellaPortabile>) -> Option<String> {
    let dialogo = rfd::FileDialog::new().set_parent(&finestra);
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
    fn il_testo_torna_con_gli_stessi_byte() {
        let base = cartella_di_prova("byte");
        let percorso = base.join("con spazi è.algo");
        // Un BOM, caratteri fuori dal piano di base, un a capo di Windows: niente si tocca.
        let testo = "\u{feff}{\r\n  \"name\": \"π 😀\"\n}\n";
        scrivi(&percorso, testo).unwrap();
        assert_eq!(fs::read(&percorso).unwrap(), testo.as_bytes());
        assert_eq!(leggi(&percorso).unwrap(), testo);
        assert!(!scrittura::temporaneo(&percorso).exists());
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
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe"]), &cartella), None);
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe", "media.algo"]), &cartella), Some(cartella.join("media.algo")));
        let assoluto = cartella.join("altro").join("x.algo");
        assert_eq!(dall_argomento(&argomenti(&["algodesign.exe", assoluto.to_str().unwrap()]), &cartella), Some(assoluto));
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

    #[test]
    fn il_nome_di_un_esempio_non_esce_dalla_cartella() {
        // Accanto ai nomi riservati di Windows, quelli che ci assomigliano e non lo sono.
        for buono in ["media.algo", "Media dei voti.algo", "è (2).algo", "CONSOLE.algo", "con2.algo", "COM10.algo", "nul (2).algo", "LPT.algo"] {
            assert!(nome_di_esempio_valido(buono), "{buono}");
        }
        for cattivo in ["", ".algo", " .algo", "media", "media.txt", "../media.algo", "a/b.algo", "a\\b.algo", "C:media.algo", "..algo", "a?.algo", "a\u{7}.algo", "CON.algo", "nul.algo", "Aux.algo", "prn.algo", "COM1.algo", "lpt9.algo", "COM¹.algo", "con .algo", "NUL.tar.algo"] {
            assert!(!nome_di_esempio_valido(cattivo), "{cattivo}");
        }
        let base = cartella_di_prova("fuori");
        assert!(scrivi_in(&base.join("esempi"), None, "../fuori.algo", "x").is_err());
        assert!(!base.join("fuori.algo").exists());
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn il_gruppo_di_un_esempio_non_esce_dalla_cartella() {
        for buono in ["Primi passi", "Funzioni e procedure", "I miei esempi (2)", "è"] {
            assert!(nome_di_gruppo_valido(buono), "{buono}");
        }
        let base = cartella_di_prova("gruppo-fuori");
        let cartella = base.join("esempi");
        let assoluto = base.join("altrove").to_string_lossy().into_owned();
        let cattivi = ["", " ", "..", ".", "../fuori", "a/b", "a\\b", "C:", "C:fuori", "/fuori", "\\\\server\\x", "nascosta/..", ".nascosta", "fine.", "fine ", "a?", "a\u{7}", "CON", "nul", "Com3", "LPT1", "aux.txt", assoluto.as_str()];
        for cattivo in cattivi {
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

    #[derive(serde::Deserialize)]
    struct Caso {
        scelto: String,
        esistono: Vec<String>,
        #[serde(default)]
        cartelle: Vec<String>,
        percorso: String,
        sostituire: bool,
        #[serde(default, rename = "maiuscoleDistinte")]
        maiuscole_distinte: bool,
        /// L'estensione del file: «.csv» per la tabella esportata; senza, quella del progetto.
        #[serde(default = "estensione_del_progetto")]
        estensione: String,
    }

    fn estensione_del_progetto() -> String {
        ALGO.to_owned()
    }

    #[derive(serde::Deserialize)]
    struct Casi {
        casi: Vec<Caso>,
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
        println!("casi {} (della tabella esportata {tabella}, del codice {codice}), saltati perché il disco non distingue le maiuscole {saltati}", casi.casi.len());
        // La premessa: la tabella ha casi del progetto, della tabella e di ogni estensione del codice, e nessuna altra.
        assert!(tabella > 0 && tabella < casi.casi.len(), "{tabella} casi «.csv» su {}", casi.casi.len());
        for e in CODICE {
            assert!(casi.casi.iter().any(|c| c.estensione == e), "nessun caso «{e}»");
        }
        assert!(casi.casi.iter().all(|c| c.estensione == ALGO || c.estensione == CSV || CODICE.contains(&c.estensione.as_str())));
        assert_eq!(sbagliati, Vec::<String>::new());
        assert_eq!(saltati, if distingue { 0 } else { casi.casi.iter().filter(|c| c.maiuscole_distinte).count() });
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

    /// Su Windows «media.ALGO» e «media.algo» sono lo stesso file: il sistema ha già chiesto di sostituirlo, e
    /// l'app non chiede una seconda volta; il file scritto resta uno solo.
    #[cfg(windows)]
    #[test]
    fn su_windows_lestensione_con_altre_maiuscole_e_lo_stesso_file_nessuna_seconda_domanda() {
        let base = cartella_di_prova("maiuscole");
        fs::write(base.join("media.ALGO"), "c'era").unwrap();
        let (percorso, sostituire) = da_salvare(base.join("media.ALGO"), ALGO);
        assert_eq!((percorso.clone(), sostituire), (base.join("media.algo"), false));
        scrivi(&percorso, "nuovo").unwrap();
        let nomi: Vec<_> = fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name().to_string_lossy().into_owned()).collect();
        println!("nomi nella cartella dopo la scrittura atomica: {nomi:?}");
        assert_eq!(leggi(&base.join("media.algo")).unwrap(), "nuovo");
        // Misurato solo su NTFS: la rinomina sopra il file vecchio gli dà il nome nuovo, con le maiuscole nuove. Su
        // una chiavetta FAT32 o exFAT non è misurato (il nome può restare quello vecchio: un file solo, nessuna
        // seconda domanda).
        assert_eq!(nomi, vec!["media.algo"]);
        fs::remove_dir_all(&base).unwrap();
    }
}
