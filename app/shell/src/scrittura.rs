// Scrittura atomica di un file, comune alle preferenze, agli esempi e ai file del progetto.

use std::ffi::OsString;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

/// Il temporaneo accanto al file: lo stesso nome con `.tmp` in coda (`media.algo` → `media.algo.tmp`).
pub fn temporaneo(percorso: &Path) -> PathBuf {
    let mut nome = OsString::from(percorso.as_os_str());
    nome.push(".tmp");
    PathBuf::from(nome)
}

/// Un file temporaneo nella stessa cartella, portato fino al disco e poi rinominato sopra quello vero:
/// chi legge trova il file vecchio o quello nuovo, mai uno scritto a metà. Se qualcosa fallisce, il
/// temporaneo si toglie e il file vero resta com'era. La cartella deve esistere.
pub fn atomica(percorso: &Path, contenuto: &[u8]) -> io::Result<()> {
    let tmp = temporaneo(percorso);
    let esito = (|| {
        let mut file = fs::File::create(&tmp)?;
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

    #[test]
    fn se_la_rinomina_fallisce_il_file_vero_resta_e_il_temporaneo_sparisce() {
        let base = cartella_di_prova("rinomina");
        // Al posto del file c'è una cartella non vuota: la rinomina fallisce.
        let percorso = base.join("progetto.algo");
        fs::create_dir_all(percorso.join("dentro")).unwrap();
        assert!(atomica(&percorso, b"testo").is_err());
        assert!(percorso.join("dentro").is_dir());
        assert!(!temporaneo(&percorso).exists());
        fs::remove_dir_all(&base).unwrap();
    }
}
