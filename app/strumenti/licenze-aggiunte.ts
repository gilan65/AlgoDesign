// I testi di licenza che lo strumento del pacchetto non trova nella cartella di una libreria, presi una volta dal suo
// repository e tenuti in `licenze-aggiunte/` con la fonte; e le librerie che una libreria collega dentro l'eseguibile
// senza esserne l'autore. Una libreria del prodotto senza file di licenza e senza una voce qui fa rosso il pacchetto.

/** Per nome della libreria (crate Rust o pacchetto JavaScript): i file in `licenze-aggiunte/` e da dove vengono. */
export const testiAggiunti: Readonly<Record<string, { file: readonly string[]; fonte: string }>> = {
  "alloc-stdlib": { file: ["alloc-stdlib-LICENSE.txt"], fonte: "https://github.com/dropbox/rust-alloc-no-stdlib/blob/master/LICENSE" },
  "defmt-parser": { file: ["defmt-LICENSE-MIT.txt", "defmt-LICENSE-APACHE.txt"], fonte: "https://github.com/knurling-rs/defmt (LICENSE-MIT, LICENSE-APACHE)" },
  selectors: { file: ["servo-LICENSE.txt"], fonte: "https://github.com/servo/servo/blob/main/LICENSE (la MPL 2.0 del progetto Servo, da cui viene la libreria)" },
  "block2": { file: ["objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-MIT.txt, LICENSE.md)" },
  "objc2": { file: ["objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-encode": { file: ["objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-foundation": { file: ["objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-MIT.txt, LICENSE.md)" },
  "dispatch2": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-app-kit": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-core-foundation": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-core-graphics": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-exception-helper": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-io-surface": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-quartz-core": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "objc2-web-kit": { file: ["objc2-LICENSE-ZLIB.txt", "objc2-LICENSE-APACHE.txt", "objc2-LICENSE-MIT.txt", "objc2-LICENSE.md"], fonte: "https://github.com/madsmtm/objc2 (LICENSE-ZLIB.txt, LICENSE-APACHE.txt, LICENSE-MIT.txt, LICENSE.md)" },
  "dlopen2": { file: ["dlopen2-LICENSE.txt"], fonte: "https://github.com/OpenByteDev/dlopen2/blob/master/LICENSE" },
  "dlopen2_derive": { file: ["dlopen2-LICENSE.txt"], fonte: "https://github.com/OpenByteDev/dlopen2/blob/master/LICENSE" },
  "libappindicator-sys": { file: ["libappindicator-rs-LICENSE-MIT.txt", "libappindicator-rs-LICENSE-APACHE.txt"], fonte: "https://github.com/tauri-apps/libappindicator-rs (LICENSE-MIT, LICENSE-APACHE)" },
  "webview2-com": { file: ["webview2-rs-LICENSE.txt"], fonte: "https://github.com/wravery/webview2-rs/blob/main/LICENSE" },
  "webview2-com-macros": { file: ["webview2-rs-LICENSE.txt"], fonte: "https://github.com/wravery/webview2-rs/blob/main/LICENSE" },
  "webview2-com-sys": { file: ["webview2-rs-LICENSE.txt"], fonte: "https://github.com/wravery/webview2-rs/blob/main/LICENSE" },
};

/** Le librerie che un crate collega dentro l'eseguibile, con la licenza dei loro autori. */
export const collegate: readonly { nome: string; versione: string; licenza: string; repository: string; dentro: string; file: readonly string[] }[] = [
  {
    // `webview2-com-sys` collega la libreria statica che carica WebView2 (`WebView2LoaderStatic.lib`) dell'SDK di
    // Microsoft; la licenza e le note sono le stesse nelle versioni 1.0.3650.58 e 1.0.3912.50 del pacchetto NuGet.
    nome: "WebView2LoaderStatic, dall'SDK Microsoft.Web.WebView2",
    versione: "1.0",
    licenza: "BSD-3-Clause (Microsoft Corporation), con le note dei componenti di terzi",
    repository: "https://www.nuget.org/packages/Microsoft.Web.WebView2",
    dentro: "webview2-com-sys",
    file: ["webview2-sdk-LICENSE.txt", "webview2-sdk-NOTICE.txt"],
  },
];
