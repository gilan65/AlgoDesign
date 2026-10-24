// La piattaforma, per ciò che l'interfaccia fa diverso sul Mac: i tasti scritti coi simboli del Mac e col Cmd (⌘)
// al posto di Ctrl, ⌫ che elimina (la tastiera del Mac non ha Canc), il menu in cima allo schermo. Una sola fonte: il
// motore. Quello del Mac (il WebKit di macOS) si presenta come «Macintosh»; WebView2 dice «Windows», WebKitGTK
// «Linux». Le prove la cambiano col motore (`userAgent` di Playwright) o, sotto happy-dom, con `navigator.userAgent`.
export const sulMac = (): boolean => navigator.userAgent.includes("Macintosh");
