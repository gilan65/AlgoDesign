// Il menu in cima allo schermo del Mac e l'uscita dall'app. Contratto con l'interfaccia (app/ui/menu.ts):
// - `imposta_menu` con `voci` (i testi nella lingua dell'interfaccia, mandati all'avvio e a ogni cambio di lingua)
//   mette il menu dell'app sul Mac: AlgoDesign (Informazioni, Impostazioni…, Servizi, Nascondi, Nascondi altre,
//   Mostra tutte, Esci), Modifica (Annulla, Ripeti, Taglia, Copia, Incolla, Seleziona tutto: senza, nei campi di
//   testo ⌘C e ⌘V non funzionano), Finestra (Contrai, Zoom, Chiudi). Su Windows e Linux non fa nulla. Fino alla
//   prima chiamata resta il menu predefinito di Tauri. Informazioni e Impostazioni arrivano all'interfaccia come
//   evento `algodesign-menu` (sulla `window` della pagina) col nome della voce in `detail`;
// - sul Mac ogni richiesta di uscita dall'app (Cmd+Q ed «Esci», «Esci» dal Dock, la chiusura della sessione, una
//   richiesta da AppleScript) arriva a `applicationShouldTerminate:`. tao non lo gestisce (riceve solo l'uscita già
//   decisa), quindi lo si aggiunge qui al suo delegato: con modifiche non salvate l'uscita si annulla e si chiede la
//   chiusura della finestra, che fa la domanda della X (`progetto::alla_chiusura`), dopo aver riportato l'app e la
//   finestra davanti (l'uscita dal Dock o da AppleScript arriva anche con l'app nascosta o contratta, e la domanda
//   resterebbe dove nessuno la vede). Su Windows e Linux l'uscita è solo la chiusura della finestra.

use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

/// I testi del menu del Mac, nella lingua dell'interfaccia (`menuDelMac` nei dizionari).
#[derive(Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VociDelMenu {
    pub informazioni: String,
    pub impostazioni: String,
    pub servizi: String,
    pub nascondi: String,
    pub nascondi_altre: String,
    pub mostra_tutte: String,
    pub esci: String,
    pub modifica: String,
    pub annulla: String,
    pub ripeti: String,
    pub taglia: String,
    pub copia: String,
    pub incolla: String,
    pub seleziona_tutto: String,
    pub finestra: String,
    pub contrai: String,
    pub zoom: String,
    pub chiudi: String,
}

/// Le voci del menu che fanno qualcosa nell'interfaccia (le altre le fa macOS).
pub const VOCI_DELL_INTERFACCIA: [&str; 2] = ["informazioni", "impostazioni"];

#[tauri::command]
pub fn imposta_menu(app: tauri::AppHandle, voci: VociDelMenu) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    app.set_menu(menu_del_mac(&app, &voci).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    #[cfg(not(target_os = "macos"))]
    let _ = (app, voci);
    Ok(())
}

#[cfg(target_os = "macos")]
fn menu_del_mac(app: &tauri::AppHandle, v: &VociDelMenu) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem as P, Submenu};
    let nessuno: Option<&str> = None;
    // Il primo menu prende il nome dell'app da macOS, qualunque titolo abbia.
    let dell_app = Submenu::with_items(
        app,
        "AlgoDesign",
        true,
        &[
            &MenuItem::with_id(app, VOCI_DELL_INTERFACCIA[0], &v.informazioni, true, nessuno)?,
            &P::separator(app)?,
            &MenuItem::with_id(app, VOCI_DELL_INTERFACCIA[1], &v.impostazioni, true, Some("Cmd+,"))?,
            &P::separator(app)?,
            &P::services(app, Some(&v.servizi))?,
            &P::separator(app)?,
            &P::hide(app, Some(&v.nascondi))?,
            &P::hide_others(app, Some(&v.nascondi_altre))?,
            &P::show_all(app, Some(&v.mostra_tutte))?,
            &P::separator(app)?,
            // La richiesta di uscita di macOS: passa da `applicationShouldTerminate:`.
            &P::quit(app, Some(&v.esci))?,
        ],
    )?;
    let modifica = Submenu::with_items(
        app,
        &v.modifica,
        true,
        &[
            &P::undo(app, Some(&v.annulla))?,
            &P::redo(app, Some(&v.ripeti))?,
            &P::separator(app)?,
            &P::cut(app, Some(&v.taglia))?,
            &P::copy(app, Some(&v.copia))?,
            &P::paste(app, Some(&v.incolla))?,
            &P::select_all(app, Some(&v.seleziona_tutto))?,
        ],
    )?;
    let finestra = Submenu::with_items(
        app,
        &v.finestra,
        true,
        &[
            &P::minimize(app, Some(&v.contrai))?,
            &P::maximize(app, Some(&v.zoom))?,
            &P::separator(app)?,
            // La chiusura della finestra, come la X.
            &P::close_window(app, Some(&v.chiudi))?,
        ],
    )?;
    Menu::with_items(app, &[&dell_app, &modifica, &finestra])
}

/// Una voce del menu scelta: quelle dell'interfaccia le riceve la pagina.
pub fn alla_voce(app: &tauri::AppHandle, evento: tauri::menu::MenuEvent) {
    let voce = evento.id().as_ref();
    if VOCI_DELL_INTERFACCIA.contains(&voce) {
        if let Some(vista) = app.get_webview_window("principale") {
            let _ = vista.eval(format!("window.dispatchEvent(new CustomEvent('algodesign-menu', {{ detail: '{voce}' }}))"));
        }
    }
}

/// La risposta a una richiesta di uscita dall'app: con modifiche non salvate e la finestra aperta no (si chiede
/// invece la chiusura della finestra, che fa la domanda), altrimenti sì.
pub fn si_esce(modificato: &AtomicBool, chiedi_la_chiusura: Option<impl FnOnce()>) -> bool {
    match chiedi_la_chiusura {
        Some(chiedi) if modificato.load(Ordering::SeqCst) => {
            chiedi();
            false
        }
        _ => true,
    }
}

/// Aggancia la risposta alla richiesta di uscita di macOS (`applicationShouldTerminate:`) al delegato dell'app,
/// che tao crea prima di `setup`.
#[cfg(target_os = "macos")]
pub fn aggancia_l_uscita(app: &tauri::AppHandle) {
    use objc2::runtime::{AnyClass, AnyObject, Imp, Sel};
    use objc2::{class, msg_send, sel};
    use std::sync::OnceLock;

    static APP: OnceLock<tauri::AppHandle> = OnceLock::new();
    // `NSApplicationTerminateReply`.
    const NS_TERMINATE_CANCEL: usize = 0;
    const NS_TERMINATE_NOW: usize = 1;

    extern "C-unwind" fn deve_terminare(_delegato: &AnyObject, _comando: Sel, mittente: *mut AnyObject) -> usize {
        let Some(app) = APP.get() else { return NS_TERMINATE_NOW };
        let finestra = app.get_webview_window("principale");
        let chiedi = finestra.map(|f| {
            move || {
                davanti(mittente);
                let _ = f.unminimize();
                let _ = f.show();
                let _ = f.set_focus();
                drop(f.close())
            }
        });
        if si_esce(&app.state::<crate::progetto::Modificato>().0, chiedi) { NS_TERMINATE_NOW } else { NS_TERMINATE_CANCEL }
    }

    /// L'app (il mittente della richiesta, `NSApplication`) di nuovo visibile e attiva.
    fn davanti(nsapp: *mut AnyObject) {
        // SAFETY: `unhide:` e `activateIgnoringOtherApps:` di `NSApplication`, sul filo principale (la richiesta di
        // uscita arriva lì), con un mittente nullo e un `BOOL`.
        unsafe {
            if let Some(nsapp) = nsapp.as_ref() {
                let _: () = msg_send![nsapp, unhide: std::ptr::null_mut::<AnyObject>()];
                let _: () = msg_send![nsapp, activateIgnoringOtherApps: true];
            }
        }
    }

    let _ = APP.set(app.clone());
    // SAFETY: `sharedApplication` e `delegate` sono messaggi senza effetti; il metodo aggiunto ha la firma di
    // `applicationShouldTerminate:` (`NSUInteger` per un `NSApplication *`), scritta nella codifica «Q@:@».
    unsafe {
        let nsapp: *mut AnyObject = msg_send![class!(NSApplication), sharedApplication];
        let delegato: *mut AnyObject = msg_send![nsapp, delegate];
        let Some(delegato) = delegato.as_ref() else {
            eprintln!("uscita non agganciata: l'app non ha un delegato");
            return;
        };
        let classe = delegato.class() as *const AnyClass as *mut AnyClass;
        let metodo: Imp = std::mem::transmute(deve_terminare as extern "C-unwind" fn(&AnyObject, Sel, *mut AnyObject) -> usize);
        if !objc2::ffi::class_addMethod(classe, sel!(applicationShouldTerminate:), metodo, c"Q@:@".as_ptr()).as_bool() {
            eprintln!("uscita non agganciata: il delegato risponde già a applicationShouldTerminate:");
        }
    }
}

#[cfg(test)]
mod prove {
    use super::*;
    use std::cell::Cell;

    #[test]
    fn con_modifiche_non_si_esce_e_si_chiede_la_chiusura_della_finestra() {
        let chiesta = Cell::new(0);
        let modificato = AtomicBool::new(true);
        assert!(!si_esce(&modificato, Some(|| chiesta.set(chiesta.get() + 1))));
        assert_eq!(chiesta.get(), 1);
        // Senza modifiche si esce, e la finestra non si tocca.
        modificato.store(false, Ordering::SeqCst);
        assert!(si_esce(&modificato, Some(|| chiesta.set(chiesta.get() + 1))));
        assert_eq!(chiesta.get(), 1);
        // Senza la finestra (già chiusa) si esce anche con «modificato»: nessuno potrebbe rispondere alla domanda.
        modificato.store(true, Ordering::SeqCst);
        assert!(si_esce(&modificato, None::<fn()>));
    }

    /// Il corpo della funzione `nome` nel sorgente, dalla firma alla graffa che la chiude in colonna 0 (o 4, dentro un'altra).
    fn corpo<'a>(sorgente: &'a str, nome: &str) -> &'a str {
        let da = sorgente.find(&format!("fn {nome}(")).unwrap_or_else(|| panic!("manca fn {nome}"));
        let fine = ["\n}\n", "\n    }\n"].iter().filter_map(|f| sorgente[da..].find(f)).min().unwrap();
        &sorgente[da..da + fine]
    }

    /// I comandi che chiudono passano dalle funzioni provate qui sopra e in `progetto.rs`: `chiudi_finestra` da
    /// `chiudi_e_azzera` (che azzera «modificato» solo a chiusura riuscita), la risposta all'uscita di macOS da `si_esce`
    /// e dalla chiusura della finestra (`close`, che passa dalla domanda della X; `destroy` no), con l'app riportata
    /// davanti prima della domanda. CHE COSA NON GUARDA: è
    /// una prova sul testo del sorgente (il comando vero vuole la finestra di Tauri); l'uscita vera è provata sul Mac del
    /// servizio di build.
    #[test]
    fn i_comandi_che_chiudono_passano_dalle_funzioni_provate() {
        let progetto = include_str!("progetto.rs");
        let menu = include_str!("menu.rs");
        let legami = |progetto: &str, menu: &str| {
            [
                corpo(progetto, "chiudi_finestra").contains("chiudi_e_azzera(&stato.0,"),
                corpo(menu, "deve_terminare").contains("si_esce(&app.state::<crate::progetto::Modificato>().0,"),
                corpo(menu, "deve_terminare").contains("f.close()"),
                corpo(menu, "deve_terminare").contains("davanti(mittente);"),
            ]
        };
        assert_eq!(legami(progetto, menu), [true; 4]);
        // Controllo positivo, un legame per volta: la chiusura scritta senza la funzione provata, `destroy` al posto di
        // `close`.
        let senza = progetto.replacen("chiudi_e_azzera(&stato.0, || finestra.destroy()", "(|| finestra.destroy())(", 1);
        assert_eq!(legami(&senza, menu), [false, true, true, true]);
        let distrutta = menu.replacen("drop(f.close())", "drop(f.destroy())", 1);
        assert_eq!(legami(progetto, &distrutta), [true, true, false, true]);
        let dietro = menu.replacen("davanti(mittente);", "", 1);
        assert_eq!(legami(progetto, &dietro), [true, true, true, false]);
    }

    #[test]
    fn le_voci_arrivano_coi_nomi_dell_interfaccia_e_nessuna_in_piu() {
        let nomi = [
            "informazioni", "impostazioni", "servizi", "nascondi", "nascondiAltre", "mostraTutte", "esci", "modifica", "annulla", "ripeti", "taglia", "copia",
            "incolla", "selezionaTutto", "finestra", "contrai", "zoom", "chiudi",
        ];
        let voci = serde_json::Value::Object(nomi.iter().map(|n| (n.to_string(), serde_json::Value::String(format!("«{n}»")))).collect());
        let lette: VociDelMenu = serde_json::from_value(voci.clone()).unwrap();
        assert_eq!(lette.nascondi_altre, "«nascondiAltre»");
        assert_eq!(lette.seleziona_tutto, "«selezionaTutto»");
        // Controllo positivo: una voce in più, o una che manca, non passa.
        let mut in_piu = voci.clone();
        in_piu["aiuto"] = "Aiuto".into();
        assert!(serde_json::from_value::<VociDelMenu>(in_piu).is_err());
        let mut senza = voci;
        senza.as_object_mut().unwrap().remove("esci");
        assert!(serde_json::from_value::<VociDelMenu>(senza).is_err());
    }
}
