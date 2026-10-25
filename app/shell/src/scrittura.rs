// Scrittura atomica di un file, comune alle preferenze, agli esempi e ai file del progetto.

use std::ffi::OsString;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

/// Il numero del prossimo temporaneo di questo processo.
static PROSSIMO: AtomicU64 = AtomicU64::new(0);

/// Un temporaneo accanto al file, col numero del processo e un contatore (`media.algo` → `media.algo.4242-0.tmp`), creato
/// solo se quel nome è libero (`create_new`): un file che c'è già, anche dell'utente o di un'altra istanza dell'app, non
/// si tocca, e si prova il numero dopo.
fn crea_temporaneo(percorso: &Path) -> io::Result<(PathBuf, fs::File)> {
    loop {
        let mut nome = OsString::from(percorso.as_os_str());
        nome.push(format!(".{}-{}.tmp", std::process::id(), PROSSIMO.fetch_add(1, Ordering::Relaxed)));
        let tmp = PathBuf::from(nome);
        match fs::OpenOptions::new().write(true).create_new(true).open(&tmp) {
            Ok(file) => return Ok((tmp, file)),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e),
        }
    }
}

/// Un file temporaneo nella stessa cartella, portato fino al disco e poi rinominato sopra quello vero:
/// chi legge trova il file vecchio o quello nuovo, mai uno scritto a metà. Se qualcosa fallisce, il
/// temporaneo (solo il proprio) si toglie e il file vero resta com'era. La cartella deve esistere.
pub fn atomica(percorso: &Path, contenuto: &[u8]) -> io::Result<()> {
    let (tmp, file) = crea_temporaneo(percorso)?;
    let esito = (|| {
        let mut file = file;
        file.write_all(contenuto)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&tmp, percorso)
    })();
    if esito.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    esito
}

#[cfg(test)]
mod prove {
    use super::*;
    use crate::cartella_di_prova;

    #[test]
    fn la_scrittura_sostituisce_e_non_lascia_il_temporaneo() {
        let base = cartella_di_prova("atomica");
        let percorso = base.join("media voti.algo");
        atomica(&percorso, b"uno").unwrap();
        atomica(&percorso, b"due").unwrap();
        assert_eq!(fs::read(&percorso).unwrap(), b"due");
        let nomi: Vec<_> = fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name()).collect();
        assert_eq!(nomi, vec!["media voti.algo"]);
        fs::remove_dir_all(&base).unwrap();
    }

    /// Un file dell'utente che si chiama come il temporaneo di un tempo (`media.algo.tmp`) non si tronca e non si
    /// consuma: il temporaneo è un file nuovo, creato solo se quel nome è libero.
    #[test]
    fn un_file_dell_utente_col_nome_di_un_temporaneo_resta_intatto() {
        let base = cartella_di_prova("temporaneo-dell-utente");
        let percorso = base.join("media.algo");
        fs::write(base.join("media.algo.tmp"), "dell'utente").unwrap();
        atomica(&percorso, b"nuovo").unwrap();
        assert_eq!(fs::read(&percorso).unwrap(), b"nuovo");
        assert_eq!(fs::read_to_string(base.join("media.algo.tmp")).unwrap(), "dell'utente");
        let mut nomi: Vec<_> = fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name()).collect();
        nomi.sort();
        assert_eq!(nomi, vec!["media.algo", "media.algo.tmp"]);
        fs::remove_dir_all(&base).unwrap();
    }

    /// Anche un file che ha proprio il nome del prossimo temporaneo (di un'altra istanza dell'app, che ha lo stesso numero
    /// di processo dopo un riavvio) resta: si passa al numero dopo.
    #[test]
    fn un_file_col_nome_del_prossimo_temporaneo_resta_intatto() {
        let base = cartella_di_prova("prossimo-temporaneo");
        let percorso = base.join("media.algo");
        let da = PROSSIMO.load(Ordering::Relaxed);
        let occupati: Vec<String> = (da..da + 3).map(|n| format!("media.algo.{}-{n}.tmp", std::process::id())).collect();
        for nome in &occupati {
            fs::write(base.join(nome), "di un altro").unwrap();
        }
        atomica(&percorso, b"nuovo").unwrap();
        assert_eq!(fs::read(&percorso).unwrap(), b"nuovo");
        assert!(occupati.iter().all(|n| fs::read_to_string(base.join(n)).unwrap() == "di un altro"));
        assert_eq!(fs::read_dir(&base).unwrap().count(), occupati.len() + 1);
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn se_la_rinomina_fallisce_il_file_vero_resta_e_il_temporaneo_sparisce() {
        let base = cartella_di_prova("rinomina");
        // Al posto del file c'è una cartella non vuota: la rinomina fallisce.
        let percorso = base.join("progetto.algo");
        fs::create_dir_all(percorso.join("dentro")).unwrap();
        assert!(atomica(&percorso, b"testo").is_err());
        assert!(percorso.join("dentro").is_dir());
        assert_eq!(fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name()).collect::<Vec<_>>(), vec!["progetto.algo"]);
        fs::remove_dir_all(&base).unwrap();
    }
}
