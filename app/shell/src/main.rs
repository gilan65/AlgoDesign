// Guscio desktop di AlgoDesign: crea la finestra e offre all'interfaccia i comandi delle preferenze, dei
// file del progetto, degli esempi e delle librerie. In release niente finestra di console accanto a quella dell'app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod menu;
mod preferenze;
mod progetto;
mod scrittura;

use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// La cartella `data` della modalità portabile, se esiste: accanto all'eseguibile, oppure, sotto
/// AppImage, accanto al file `.AppImage` (l'eseguibile sta nel montaggio in sola lettura).
fn cartella_portabile(eseguibile: &Path, appimage: Option<&Path>) -> Option<PathBuf> {
    let dati = appimage.unwrap_or(eseguibile).parent()?.join("data");
    dati.is_dir().then_some(dati)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            preferenze::leggi_preferenze,
            preferenze::scrivi_preferenze,
            progetto::scegli_file_da_aprire,
            progetto::scegli_file_da_salvare,
            progetto::scegli_file_da_esportare,
            progetto::scegli_file_del_codice,
            progetto::scegli_file_dell_immagine,
            progetto::leggi_progetto,
            progetto::scrivi_progetto,
            progetto::scrivi_byte,
            progetto::file_dato_all_avvio,
            progetto::elenca_esempi,
            progetto::scrivi_esempio,
            progetto::togli_esempio,
            progetto::togli_gruppo,
            progetto::elenca_librerie,
            progetto::scrivi_libreria,
            progetto::scegli_cartella,
            progetto::segna_modificato,
            progetto::chiudi_finestra,
            menu::imposta_menu,
        ])
        .on_window_event(progetto::alla_chiusura)
        .on_menu_event(menu::alla_voce)
        .setup(|app| {
            #[cfg(target_os = "macos")]
            menu::aggancia_l_uscita(app.handle());
            let appimage = if cfg!(target_os = "linux") { std::env::var_os("APPIMAGE").map(PathBuf::from) } else { None };
            let portabile = cartella_portabile(&std::env::current_exe()?, appimage.as_deref());

            // Senza `data`, la cartella di configurazione dell'app; la crea solo la prima scrittura.
            let cartella = match &portabile {
                Some(dati) => dati.clone(),
                None => app.path().app_config_dir()?,
            };
            app.manage(preferenze::FilePreferenze(cartella.join("preferenze.json")));
            // La cartella predefinita degli esempi: `esempi` accanto alle preferenze (in `data` se c'è).
            app.manage(progetto::CartellaEsempi(cartella.join("esempi")));
            // E quella delle librerie, `librerie` accanto agli esempi; la crea solo la prima libreria aggiunta.
            app.manage(progetto::CartellaLibrerie(cartella.join("librerie")));
            let argomenti: Vec<_> = std::env::args_os().collect();
            let partenza = || progetto::cartella_di_partenza(cfg!(target_os = "linux"), |n| std::env::var_os(n), std::env::current_dir);
            app.manage(progetto::FileDatoAllAvvio(progetto::dall_argomento(&argomenti, partenza)));
            app.manage(progetto::Modificato(AtomicBool::new(false)));
            // Nella versione portabile le finestre del file partono, se non sanno da dove, dalla cartella
            // dell'eseguibile (quella che contiene `data`).
            app.manage(progetto::CartellaPortabile(portabile.as_deref().and_then(Path::parent).map(Path::to_path_buf)));

            // La finestra si crea qui e non nella configurazione, perché `data_directory` si decide
            // solo dopo aver guardato se `data` c'è: senza, la WebView scrive nel profilo utente.
            // Ingrandita all'apertura; 1024 x 720 è la misura quando l'utente la riporta a finestra, e sotto
            // 960 x 600 non scende.
            let mut finestra = WebviewWindowBuilder::new(app, "principale", WebviewUrl::default())
                .title("AlgoDesign")
                .inner_size(1024.0, 720.0)
                .min_inner_size(960.0, 600.0)
                .maximized(true);
            if let Some(dati) = &portabile {
                finestra = finestra.data_directory(dati.join("webview"));
            }
            finestra.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("avvio dell'applicazione fallito");
}

/// Una cartella vuota per una prova, sotto la cartella temporanea del sistema.
#[cfg(test)]
fn cartella_di_prova(nome: &str) -> PathBuf {
    let cartella = std::env::temp_dir().join(format!("algodesign-prova-{}-{nome}", std::process::id()));
    let _ = std::fs::remove_dir_all(&cartella);
    std::fs::create_dir_all(&cartella).unwrap();
    cartella
}

#[cfg(test)]
mod prove {
    use super::*;
    use std::fs;

    #[test]
    fn portabile_se_data_sta_accanto_all_eseguibile() {
        let base = cartella_di_prova("accanto");
        fs::create_dir(base.join("data")).unwrap();
        assert_eq!(cartella_portabile(&base.join("algodesign.exe"), None), Some(base.join("data")));
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn non_portabile_senza_data() {
        let base = cartella_di_prova("senza");
        assert_eq!(cartella_portabile(&base.join("algodesign.exe"), None), None);
        // Un file che si chiama `data` non è la cartella.
        fs::write(base.join("data"), "").unwrap();
        assert_eq!(cartella_portabile(&base.join("algodesign.exe"), None), None);
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn sotto_appimage_conta_la_cartella_del_file_appimage() {
        let base = cartella_di_prova("appimage");
        fs::create_dir_all(base.join("chiavetta").join("data")).unwrap();
        fs::create_dir_all(base.join("montaggio")).unwrap();
        let eseguibile = base.join("montaggio").join("algodesign");
        let appimage = base.join("chiavetta").join("AlgoDesign.AppImage");
        assert_eq!(cartella_portabile(&eseguibile, Some(&appimage)), Some(base.join("chiavetta").join("data")));
        // Il montaggio non conta, anche se avesse una `data` sua.
        fs::create_dir(base.join("montaggio").join("data")).unwrap();
        fs::remove_dir_all(base.join("chiavetta").join("data")).unwrap();
        assert_eq!(cartella_portabile(&eseguibile, Some(&appimage)), None);
        fs::remove_dir_all(&base).unwrap();
    }

    use std::collections::{BTreeMap, BTreeSet};

    /// Il testo fra la parentesi (o graffa, o angolare) aperta in `inizio` e quella che la chiude, e dove finisce.
    fn fino_alla_chiusa(t: &str, inizio: usize) -> (&str, usize) {
        let (aperta, chiusa) = match t.as_bytes()[inizio] {
            b'(' => (b'(', b')'),
            b'{' => (b'{', b'}'),
            _ => (b'<', b'>'),
        };
        let mut livello = 0;
        for (i, c) in t.as_bytes().iter().enumerate().skip(inizio) {
            if *c == aperta {
                livello += 1;
            } else if *c == chiusa {
                livello -= 1;
                if livello == 0 {
                    return (&t[inizio + 1..i], i);
                }
            }
        }
        panic!("parentesi non chiusa in {}", &t[inizio..(inizio + 60).min(t.len())]);
    }

    /// Le parti separate dalle virgole che non stanno dentro parentesi, graffe o angolari.
    fn parti(t: &str) -> Vec<&str> {
        let (mut livello, mut da, mut fuori) = (0i32, 0, vec![]);
        for (i, c) in t.char_indices() {
            match c {
                '(' | '{' | '<' => livello += 1,
                ')' | '}' | '>' => livello -= 1,
                ',' if livello == 0 => {
                    fuori.push(t[da..i].trim());
                    da = i + 1;
                }
                _ => {}
            }
        }
        fuori.push(t[da..].trim());
        fuori.into_iter().filter(|p| !p.is_empty()).collect()
    }

    type Comandi = BTreeMap<String, BTreeSet<String>>;

    /// I comandi registrati in `generate_handler!`, per nome.
    fn registrati(main: &str) -> BTreeSet<String> {
        let inizio = main.find("generate_handler![").expect("manca generate_handler!") + "generate_handler!".len();
        let corpo = &main[inizio + 1..inizio + main[inizio..].find(']').unwrap()];
        parti(corpo).iter().map(|p| p.rsplit("::").next().unwrap().to_owned()).collect()
    }

    /// Il nome con cui l'interfaccia manda un argomento: Tauri 2 vuole in camelCase gli argomenti che nel guscio sono
    /// scritti con le parole separate da `_` (`nome_file` arriva da `nomeFile`).
    fn come_lo_manda_l_interfaccia(nome: &str) -> String {
        let mut fuori = String::new();
        let mut maiuscola = false;
        for c in nome.chars() {
            if c == '_' {
                maiuscola = !fuori.is_empty();
            } else if maiuscola {
                fuori.extend(c.to_uppercase());
                maiuscola = false;
            } else {
                fuori.push(c);
            }
        }
        fuori
    }

    /// I comandi definiti con `#[tauri::command]`, coi nomi degli argomenti come li manda l'interfaccia (non quelli che
    /// dà Tauri: lo stato, la finestra).
    fn definiti(sorgenti: &[&str]) -> Comandi {
        let mut fuori = Comandi::new();
        for s in sorgenti {
            // L'attributo a inizio riga, con o senza `(async)`: non quello citato in un commento.
            for (k, _) in s.match_indices("\n#[tauri::command") {
                let dopo = &s[k..];
                let nome_da = dopo.find("pub fn ").unwrap() + "pub fn ".len();
                let aperta = nome_da + dopo[nome_da..].find('(').unwrap();
                let (argomenti, _) = fino_alla_chiusa(dopo, aperta);
                let nomi = parti(argomenti).into_iter().filter(|a| !a.contains("tauri::")).map(|a| come_lo_manda_l_interfaccia(a.split(':').next().unwrap().trim())).collect();
                fuori.insert(dopo[nome_da..aperta].to_owned(), nomi);
            }
        }
        fuori
    }

    /// Le chiamate `invoke("comando", { argomenti })` dell'interfaccia.
    fn chiamati(sorgenti: &[&str]) -> Comandi {
        let mut fuori = Comandi::new();
        for s in sorgenti {
            for (k, _) in s.match_indices("invoke") {
                let mut i = k + "invoke".len();
                if s.as_bytes()[i] == b'<' {
                    i = fino_alla_chiusa(s, i).1 + 1;
                }
                if !s[i..].starts_with("(\"") {
                    continue;
                }
                let (dentro, _) = fino_alla_chiusa(s, i);
                let nome_fine = dentro[1..].find('"').unwrap() + 1;
                let nome = dentro[1..nome_fine].to_owned();
                let resto = dentro[nome_fine + 1..].trim_start_matches(',').trim();
                let argomenti = if resto.starts_with('{') { parti(fino_alla_chiusa(resto, 0).0).into_iter().map(|a| a.split(':').next().unwrap().trim().to_owned()).collect() } else { BTreeSet::new() };
                fuori.insert(nome, argomenti);
            }
        }
        fuori
    }

    /// I comandi del guscio simulato delle prove nel browser (`case "comando":`), con gli argomenti che legge
    /// (`a.argomento`) fino al `case` dopo.
    fn simulati(finzione: &str) -> Comandi {
        let mut fuori = Comandi::new();
        let casi: Vec<usize> = finzione.match_indices("case \"").map(|(k, _)| k).collect();
        for (n, k) in casi.iter().enumerate() {
            let nome_da = k + "case \"".len();
            let nome = &finzione[nome_da..nome_da + finzione[nome_da..].find('"').unwrap()];
            let corpo = &finzione[*k..*casi.get(n + 1).unwrap_or(&finzione.len())];
            // `a.` all'inizio di un nome (non la fine di un altro: «la.», «f.a.»).
            let letti = corpo
                .match_indices("a.")
                .filter(|(j, _)| corpo[..*j].chars().last().is_some_and(|p| !(p.is_alphanumeric() || p == '_' || p == '.')))
                .map(|(j, _)| corpo[j + 2..].chars().take_while(|c| c.is_alphanumeric() || *c == '_').collect())
                .collect();
            fuori.insert(nome.to_owned(), letti);
        }
        fuori
    }

    /// Le differenze fra i quattro elenchi, nei due versi: comandi registrati, definiti, chiamati e simulati; per ogni
    /// comando gli argomenti chiamati e quelli definiti uguali, e quelli che il guscio simulato legge fra i chiamati.
    fn differenze(main: &str, guscio: &[&str], interfaccia: &[&str], finzione: &str) -> Vec<String> {
        let (r, d, c, s) = (registrati(main), definiti(guscio), chiamati(interfaccia), simulati(finzione));
        let nomi = |m: &Comandi| m.keys().cloned().collect::<BTreeSet<_>>();
        let mut fuori = vec![];
        for (chi, altro) in [("definiti", nomi(&d)), ("chiamati", nomi(&c)), ("simulati", nomi(&s))] {
            for n in r.difference(&altro) {
                fuori.push(format!("«{n}» registrato e non {chi}"));
            }
            for n in altro.difference(&r) {
                fuori.push(format!("«{n}» {chi} e non registrato"));
            }
        }
        for (n, argomenti) in &c {
            if let Some(attesi) = d.get(n) {
                if argomenti != attesi {
                    fuori.push(format!("«{n}»: l'interfaccia manda {argomenti:?}, il guscio vuole {attesi:?}"));
                }
            }
            if let Some(letti) = s.get(n) {
                for a in letti.difference(argomenti) {
                    fuori.push(format!("«{n}»: il guscio simulato legge «{a}», che l'interfaccia non manda"));
                }
            }
        }
        fuori
    }

    /// I comandi che il guscio registra, quelli che definisce, quelli che l'interfaccia chiama e quelli che il guscio
    /// simulato delle prove nel browser conosce sono gli stessi, coi nomi degli argomenti appaiati: un comando
    /// dimenticato o un argomento rinominato da un lato solo farebbe passare le prove nel browser su un guscio che
    /// non risponde così.
    #[test]
    fn i_comandi_del_guscio_sono_gli_stessi_che_l_interfaccia_chiama_e_che_il_guscio_simulato_conosce() {
        let main = include_str!("main.rs");
        let guscio = [include_str!("progetto.rs"), include_str!("preferenze.rs"), include_str!("menu.rs")];
        let interfaccia = [include_str!("../../ui/file.ts"), include_str!("../../ui/preferenze.ts"), include_str!("../../ui/menu.ts")];
        let finzione = include_str!("../../e2e/finzione-tauri.ts");
        let (r, d, c, s) = (registrati(main), definiti(&guscio), chiamati(&interfaccia), simulati(finzione));
        let argomenti: usize = c.values().map(BTreeSet::len).sum();
        println!("comandi: registrati {}, definiti {}, chiamati {} (con {argomenti} argomenti), simulati {}", r.len(), d.len(), c.len(), s.len());
        assert_eq!(differenze(main, &guscio, &interfaccia, finzione), Vec::<String>::new());
        // Le premesse: i rilevatori trovano i comandi (ventuno, oggi) e gli argomenti.
        assert_eq!([r.len(), d.len(), c.len(), s.len()], [21; 4]);
        assert!(argomenti >= 20, "{argomenti} argomenti chiamati");
        // Controllo positivo, un rilevatore per volta: un comando tolto dalla registrazione, un argomento rinominato
        // nell'interfaccia, un argomento letto dal guscio simulato che l'interfaccia non manda.
        let senza = main.replacen("progetto::scegli_file_da_esportare,", "", 1);
        let rinominato = interfaccia[0].replacen("{ proposto, filtro, cartella }) : null;\n\n/** Il file dove esportare", "{ proposto, filtro, partenza }) : null;\n\n/** Il file dove esportare", 1);
        let letto = finzione.replacen("f.finestre.esporta = (f.finestre.esporta ?? 0) + 1;", "f.finestre.esporta = (f.finestre.esporta ?? 0) + 1; void a.origine;", 1);
        for (cosa, trovate) in [
            ("comando non registrato", differenze(&senza, &guscio, &interfaccia, finzione)),
            ("argomento rinominato", differenze(main, &guscio, &[&rinominato, interfaccia[1]], finzione)),
            ("argomento in più nel guscio simulato", differenze(main, &guscio, &interfaccia, &letto)),
        ] {
            assert!(!trovate.is_empty(), "controllo positivo spento: {cosa}");
            println!("controllo positivo, {cosa}: {trovate:?}");
        }
        // Oggi ogni argomento ha una parola sola: un comando con un argomento di più parole si confronta col nome che
        // l'interfaccia manda (in camelCase), non con quello scritto nel guscio.
        let due_parole = "\n#[tauri::command]\npub fn prova(finestra: tauri::Window, nome_del_file: String, testo: String) {}";
        assert_eq!(definiti(&[due_parole]), Comandi::from([("prova".to_owned(), BTreeSet::from(["nomeDelFile".to_owned(), "testo".to_owned()]))]));
        // Il rilevatore riconosce anche i comandi che girano fuori dal thread della finestra.
        let fuori = "// `#[tauri::command(async)]` citato non conta\n#[tauri::command(async)]\npub fn prova(finestra: tauri::Window, testo: String) {}";
        assert_eq!(definiti(&[fuori]), Comandi::from([("prova".to_owned(), BTreeSet::from(["testo".to_owned()]))]));
    }

    /// Le funzioni al primo livello di un sorgente: nome, attributo sulla riga sopra (o `""`), se è `async fn`, corpo.
    fn funzioni(s: &str) -> Vec<(String, String, bool, String)> {
        let mut fuori = vec![];
        for (k, _) in s.match_indices('\n') {
            let riga = &s[k + 1..];
            let (asincrona, dopo) = match ["pub async fn ", "async fn ", "pub fn ", "fn "].iter().find(|p| riga.starts_with(**p)) {
                Some(p) => (p.contains("async"), &riga[p.len()..]),
                None => continue,
            };
            let aperta = dopo.find('(').unwrap();
            let nome = dopo[..aperta].split('<').next().unwrap().to_owned();
            let (_, chiusa) = fino_alla_chiusa(dopo, aperta);
            let graffa = chiusa + dopo[chiusa..].find('{').unwrap();
            let (corpo, _) = fino_alla_chiusa(dopo, graffa);
            let sopra = s[..k].rsplit('\n').next().unwrap().trim().to_owned();
            let attributo = if sopra.starts_with("#[tauri::command") { sopra } else { String::new() };
            fuori.push((nome, attributo, asincrona, corpo.to_owned()));
        }
        fuori
    }

    /// I comandi che aprono una finestra del sistema per un file o una cartella (direttamente, o attraverso una funzione
    /// dello stesso sorgente che la apre), e fra questi quelli che girano sul thread della finestra.
    fn finestre_del_file(sorgenti: &[&str]) -> (BTreeSet<String>, Vec<String>) {
        const MOSTRA: [&str; 5] = [".pick_file()", ".pick_files()", ".save_file()", ".pick_folder()", ".pick_folders()"];
        let (mut con_finestra, mut sincroni) = (BTreeSet::new(), vec![]);
        for s in sorgenti {
            let tutte = funzioni(s);
            let mut aprono: BTreeSet<String> = tutte.iter().filter(|f| MOSTRA.iter().any(|m| f.3.contains(m))).map(|f| f.0.clone()).collect();
            loop {
                let prima = aprono.len();
                let nuove: Vec<String> = tutte.iter().filter(|f| aprono.iter().any(|a| f.3.contains(&format!("{a}(")))).map(|f| f.0.clone()).collect();
                aprono.extend(nuove);
                if aprono.len() == prima {
                    break;
                }
            }
            for (nome, attributo, asincrona, _) in &tutte {
                if attributo.is_empty() || !aprono.contains(nome) {
                    continue;
                }
                con_finestra.insert(nome.clone());
                if !asincrona && attributo != "#[tauri::command(async)]" {
                    sincroni.push(nome.clone());
                }
            }
        }
        (con_finestra, sincroni)
    }

    /// Un comando che apre una finestra del sistema per un file o una cartella (libreria `rfd`) gira fuori dal thread
    /// della finestra: `#[tauri::command(async)]`. Tauri esegue un comando sincrono sul thread principale, quello del
    /// ciclo di GTK; con il motore `gtk3` la finestra di `rfd` si mette in coda proprio su quel ciclo e poi lo aspetta,
    /// e su Linux l'app si blocca per sempre (misurato su un desktop GNOME, con «Apri» e con «Salva»). Su Windows non si
    /// vede, perché la finestra di dialogo di COM fa girare i messaggi da sé.
    #[test]
    fn i_comandi_che_aprono_una_finestra_del_file_girano_fuori_dal_thread_della_finestra() {
        let guscio = [include_str!("progetto.rs"), include_str!("preferenze.rs"), include_str!("menu.rs")];
        let (con_finestra, sincroni) = finestre_del_file(&guscio);
        println!("comandi con una finestra del file: {con_finestra:?}; sincroni: {sincroni:?}");
        assert_eq!(sincroni, Vec::<String>::new(), "comandi sincroni che aprono una finestra del file");
        // La premessa: il rilevatore trova i comandi delle finestre, confrontati per nome (anche quelli che la aprono
        // attraverso un'altra funzione, come «Salva con nome»).
        let attesi = ["scegli_cartella", "scegli_file_da_aprire", "scegli_file_da_esportare", "scegli_file_da_salvare", "scegli_file_del_codice", "scegli_file_dell_immagine"];
        assert_eq!(con_finestra, attesi.iter().map(|n| n.to_string()).collect::<BTreeSet<_>>());
        // Controllo positivo, col rilevatore sui due modi: un comando tornato sincrono esce, e uno che apre la finestra
        // attraverso un'altra funzione anche.
        for (nome, intestazione) in [("scegli_cartella", "pub fn scegli_cartella("), ("scegli_file_da_salvare", "pub fn scegli_file_da_salvare(")] {
            let tornato = guscio[0].replacen(&format!("#[tauri::command(async)]\n{intestazione}"), &format!("#[tauri::command]\n{intestazione}"), 1);
            assert_ne!(tornato, guscio[0], "controllo positivo senza effetto: {nome}");
            assert_eq!(finestre_del_file(&[&tornato, guscio[1], guscio[2]]).1, vec![nome.to_owned()]);
        }
    }
}
