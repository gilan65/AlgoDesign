//! La stampa sul Mac, coi margini della pagina. Sul Mac Tauri mette al posto di `window.print()` il suo comando, che
//! chiama la stampa di wry con le opzioni predefinite: margini a zero, e il testo che tocca il bordo del foglio
//! (misurato nei Mac virtuali 13.3 e 27). Il WebKit del Mac non legge i margini delle regole `@page`; questo comando apre
//! lo stesso pannello di macOS (`printOperationWithPrintInfo:` del WKWebView, foglio della finestra), coi margini che
//! l'interfaccia manda in millimetri (`ui/stampa/stampa-del-mac.ts`, da `MARGINI`). Fuori dal Mac l'interfaccia non lo
//! chiama, e il comando risponde con un errore.
//!
//! CHE COSA NON FA: il verso dei fogli e le caselle del margine (intestazione e piè di pagina): il WebKit del Mac non le
//! conosce, e i fogli escono tutti in verticale (misurato nel PDF; il pannello non mostra il verso).

/// Millimetri in punti tipografici (1/72 di pollice), l'unità dei margini di `NSPrintInfo`. Fuori dal Mac la usano solo
/// le prove.
#[cfg(any(target_os = "macos", test))]
pub fn in_punti(millimetri: f64) -> f64 {
    millimetri * 72.0 / 25.4
}

/// Il pannello di stampa di macOS sopra la finestra, coi margini dati in millimetri.
#[tauri::command]
pub fn stampa_del_mac(finestra: tauri::WebviewWindow, sopra: f64, destra: f64, sotto: f64, sinistra: f64) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let margini = [sopra, destra, sotto, sinistra].map(in_punti);
        finestra.with_webview(move |w| apri_il_pannello(w.inner().cast(), w.ns_window().cast(), margini)).map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (finestra, sopra, destra, sotto, sinistra);
        Err("la stampa del guscio c'è solo sul Mac".to_owned())
    }
}

/// Come la stampa di wry (`print_with_options`), coi margini: `NSPrintInfo` condiviso, l'operazione del WKWebView, il
/// pannello come foglio della finestra, senza fermare il filo principale.
#[cfg(target_os = "macos")]
fn apri_il_pannello(webview: *mut objc2::runtime::AnyObject, finestra: *mut objc2::runtime::AnyObject, [sopra, destra, sotto, sinistra]: [f64; 4]) {
    use objc2::runtime::{AnyObject, Sel};
    use objc2::{class, msg_send, sel};
    // SAFETY: messaggi di `NSPrintInfo`, `WKWebView` (macOS 11 e dopo, controllato con `respondsToSelector:`) e
    // `NSPrintOperation`, sul filo principale (`with_webview` ci porta lì), coi tipi della loro firma: `CGFloat` per i
    // margini, `BOOL`, un delegato e un contesto nulli, nessun selettore da chiamare alla fine.
    unsafe {
        let Some(webview) = webview.as_ref() else { return };
        let puo: bool = msg_send![webview, respondsToSelector: sel!(printOperationWithPrintInfo:)];
        if !puo || finestra.is_null() {
            eprintln!("stampa non aperta: il WKWebView non sa stampare o manca la finestra");
            return;
        }
        let info: *mut AnyObject = msg_send![class!(NSPrintInfo), sharedPrintInfo];
        let _: () = msg_send![info, setTopMargin: sopra];
        let _: () = msg_send![info, setRightMargin: destra];
        let _: () = msg_send![info, setBottomMargin: sotto];
        let _: () = msg_send![info, setLeftMargin: sinistra];
        let operazione: *mut AnyObject = msg_send![webview, printOperationWithPrintInfo: info];
        let _: () = msg_send![operazione, setCanSpawnSeparateThread: true];
        let _: () = msg_send![
            operazione,
            runOperationModalForWindow: finestra,
            delegate: std::ptr::null_mut::<AnyObject>(),
            didRunSelector: None::<Sel>,
            contextInfo: std::ptr::null_mut::<std::ffi::c_void>()
        ];
    }
}

#[cfg(test)]
mod prove {
    use super::*;

    #[test]
    fn i_margini_in_punti() {
        assert_eq!(in_punti(25.4), 72.0);
        // I margini della pagina di oggi, 22 12 18 mm.
        let punti = [22.0, 12.0, 18.0].map(|m| (in_punti(m) * 100.0).round() / 100.0);
        assert_eq!(punti, [62.36, 34.02, 51.02]);
    }
}
