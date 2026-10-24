// Le preferenze dell'utente in `preferenze.json`, scritto da noi e non da un plugin (che scriverebbe
// nel profilo utente anche in modalità portabile). Contratto con l'interfaccia (app/ui/preferenze.ts):
// - `leggi_preferenze` → l'oggetto del file, oppure `null` se non c'è un oggetto leggibile;
// - `scrivi_preferenze` con l'argomento `preferenze`, un oggetto.
// Il guscio non giudica i campi: il file si può modificare a mano, e un campo che l'interfaccia non
// conosce, o di un tipo che non si aspetta, lo scarta l'interfaccia, quel campo solo (un campo rotto non
// deve costare la lingua). Così ogni regola sul valore di una preferenza sta in un posto solo.
// La lingua del primo avvio la decide l'interfaccia: qui non si calcola.

use serde_json::{Map, Value};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

pub type Preferenze = Map<String, Value>;

/// Il percorso di `preferenze.json`, deciso all'avvio (modalità portabile o no).
pub struct FilePreferenze(pub PathBuf);

/// Un file assente è il primo avvio. Il BOM in testa (lo scrivono il Blocco note e molti editor) si salta. Un
/// file illeggibile, non JSON o che non è un oggetto vale come assente, con una riga sullo standard error: l'interfaccia legge prima del primo render, e un errore
/// lascerebbe la finestra bianca. Il file si riscrive al primo cambio di una preferenza.
pub fn leggi(percorso: &Path) -> Option<Preferenze> {
    let testo = match fs::read_to_string(percorso) {
        Ok(testo) => testo,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return None,
        Err(e) => {
            eprintln!("preferenze illeggibili in {}: {e}", percorso.display());
            return None;
        }
    };
    match serde_json::from_str::<Value>(testo.strip_prefix('\u{feff}').unwrap_or(&testo)) {
        Ok(Value::Object(oggetto)) => Some(oggetto),
        Ok(_) => {
            eprintln!("preferenze non valide in {}: non è un oggetto", percorso.display());
            None
        }
        Err(e) => {
            eprintln!("preferenze non valide in {}: {e}", percorso.display());
            None
        }
    }
}

/// Scrittura atomica (`scrittura.rs`), creando la cartella se manca.
pub fn scrivi(percorso: &Path, preferenze: &Preferenze) -> io::Result<()> {
    if let Some(cartella) = percorso.parent() {
        fs::create_dir_all(cartella)?;
    }
    crate::scrittura::atomica(percorso, format!("{}\n", serde_json::to_string_pretty(preferenze)?).as_bytes())
}

#[tauri::command]
pub fn leggi_preferenze(file: tauri::State<'_, FilePreferenze>) -> Option<Preferenze> {
    leggi(&file.0)
}

#[tauri::command]
pub fn scrivi_preferenze(preferenze: Preferenze, file: tauri::State<'_, FilePreferenze>) -> Result<(), String> {
    scrivi(&file.0, &preferenze).map_err(|e| e.to_string())
}

#[cfg(test)]
mod prove {
    use super::*;
    use crate::cartella_di_prova;
    use serde_json::json;

    fn oggetto(v: Value) -> Preferenze {
        match v {
            Value::Object(o) => o,
            _ => unreachable!(),
        }
    }

    #[test]
    fn senza_file_non_ci_sono_preferenze() {
        let base = cartella_di_prova("assente");
        assert_eq!(leggi(&base.join("preferenze.json")), None);
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn un_file_che_non_e_un_oggetto_vale_come_assente() {
        let base = cartella_di_prova("rotto");
        let percorso = base.join("preferenze.json");
        for testo in ["{ rotto", "[1, 2]", "\"it\"", "null", ""] {
            fs::write(&percorso, testo).unwrap();
            assert_eq!(leggi(&percorso), None, "{testo:?}");
        }
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn un_file_col_bom_si_legge() {
        // Il Blocco note di Windows, e molti editor, salvano in UTF-8 col BOM: il file modificato a mano non
        // deve costare tutte le preferenze.
        let base = cartella_di_prova("bom");
        let percorso = base.join("preferenze.json");
        fs::write(&percorso, "\u{feff}{ \"lingua\": \"en\", \"barra\": \"icone\" }").unwrap();
        assert_eq!(leggi(&percorso), Some(oggetto(json!({ "lingua": "en", "barra": "icone" }))));
        // Controllo positivo: il BOM è davvero nei byte del file.
        assert_eq!(&fs::read(&percorso).unwrap()[..3], &[0xef, 0xbb, 0xbf]);
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn i_campi_passano_come_sono_anche_quelli_sconosciuti_o_del_tipo_sbagliato() {
        // Il guscio non scarta nulla: un campo rotto lo scarta l'interfaccia, da solo.
        let base = cartella_di_prova("campi");
        let percorso = base.join("preferenze.json");
        fs::write(&percorso, r#"{ "lingua": 5, "colori": "contrasto", "limiti": { "vettore": "mille" }, "altro": true }"#).unwrap();
        assert_eq!(leggi(&percorso), Some(oggetto(json!({ "lingua": 5, "colori": "contrasto", "limiti": { "vettore": "mille" }, "altro": true }))));
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn la_scrittura_crea_la_cartella_e_si_rilegge() {
        let base = cartella_di_prova("nuova");
        let percorso = base.join("config").join("preferenze.json");
        let tutte = oggetto(json!({ "lingua": "en", "condizioni": "su-una-riga", "colori": "bianco-e-nero", "limiti": { "vettore": 2000 } }));
        scrivi(&percorso, &tutte).unwrap();
        assert_eq!(leggi(&percorso), Some(tutte));
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn la_scrittura_sostituisce_il_file_esistente_senza_lasciare_il_temporaneo() {
        let base = cartella_di_prova("sostituzione");
        let percorso = base.join("preferenze.json");
        scrivi(&percorso, &oggetto(json!({ "lingua": "it" }))).unwrap();
        scrivi(&percorso, &oggetto(json!({ "lingua": "en" }))).unwrap();
        assert_eq!(leggi(&percorso), Some(oggetto(json!({ "lingua": "en" }))));
        let nomi: Vec<_> = fs::read_dir(&base).unwrap().map(|v| v.unwrap().file_name()).collect();
        assert_eq!(nomi, vec!["preferenze.json"]);
        fs::remove_dir_all(&base).unwrap();
    }
}
