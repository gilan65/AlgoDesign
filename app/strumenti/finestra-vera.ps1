# La finestra vera dell'app, per la prova sul prodotto (solo Windows): i messaggi di Windows mandati alla
# finestra del processo dato (mai cercata per nome), senza portarla in primo piano.
#
#   finestra-vera.ps1 <pid> tasto <tasto>   WM_KEYDOWN e WM_KEYUP alla finestra d'input di WebView2
#                                           (Chrome_RenderWidgetHostHWND): <tasto> e "f5" o "z"
#   finestra-vera.ps1 <pid> chiudi          WM_CLOSE alla finestra: come il clic sulla X o Alt+F4
#   finestra-vera.ps1 <pid> coperta         se la finestra si vede: le finestre SOPRA di lei (ordine di Windows) che la
#                                           coprono per intero, visibili, non ridotte a icona, non nascoste da DWM e non
#                                           trasparenti al mouse (le sovrimpressioni di sistema)
#   finestra-vera.ps1 <pid> salva <nome>    nella finestra del sistema per salvare un file, aperta dal processo (classe
#                                           #32770, attesa fino a 10 s): <nome> nel campo del nome del file (il campo di
#                                           testo 1001, o quello nella casella 1148, contato una volta se li trovano
#                                           tutti e due) e il clic su "Salva" (il pulsante con l'identificativo 1, IDOK);
#                                           dopo "salvato", una seconda riga "proposto: <nome>" col nome che c'era
#   finestra-vera.ps1 <pid> salva-dai-figli <percorso>
#                                           come "salva", ma la finestra la cerca solo nei processi discendenti del <pid>
#                                           (quella di "Salva come PDF" dell'anteprima di stampa e del runtime WebView2,
#                                           non dell'app: una finestra dell'app per un file non va compilata)
#
# Stampa una riga: "inviato", "chiusura spedita", "libera", "coperta: <finestre>", "ridotta a icona", "salvato"
# oppure "NON inviato: <perche>".
#
# Perche lo z-order e non la pagina: coperta per intero da una finestra ingrandita, la WebView2 dell'app sospende il
# disegno quando sta dietro (misurato: la CHIUSURA e la RICARICA della prova sul prodotto rosse senza difetto), ma
# `document.visibilityState` resta "visible" e i fotogrammi continuano, misurato sotto una finestra ingrandita sopra
# tutte con l'app in primo piano: la pagina non lo sa dire.
# La finestra del processo e la prima visibile nell'ordine di Windows: oggi l'app ne ha una sola (una finestra del
# file nativa aperta, o un'altra finestra dello stesso processo, potrebbe essere scelta al suo posto).
#
# Misurato (WebView2, Tauri 2.12.1): i tasti premuti via CDP arrivano solo alla pagina, non agli acceleratori di
# WebView2 (F5 e Ctrl+R non ricaricavano nemmeno il codice che non li fermava); i messaggi di questo strumento
# invece passano dalla via dei tasti veri (F5 ricaricava quel codice), ma senza i modificatori: Ctrl+R arriva
# alla pagina come una R. I tasti veri col primo piano portano i modificatori, ma il fuoco della tastiera non
# entra sempre nella WebView2 (una lettera persa, una pagina che non risponde): per questo qui non ci sono.
param([Parameter(Mandatory)][int]$processo, [Parameter(Mandatory)][string]$azione, [string]$tasto = "")
# Per "salva" il terzo argomento e il nome del file.

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class FinestraVera {
  public delegate bool Visita(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Visita f, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, Visita f, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct Rett { public int Sinistra, Sopra, Destra, Sotto; }
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rett r);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int n);
  /** Le finestre sopra `h` che la coprono per intero: visibili, non a icona, non nascoste da DWM, non trasparenti. */
  public static List<string> Sopra(IntPtr h) {
    var r = new List<string>();
    Rett a; GetWindowRect(h, out a);
    for (var s = GetWindow(h, 3); s != IntPtr.Zero; s = GetWindow(s, 3)) {
      if (!IsWindowVisible(s) || IsIconic(s)) continue;
      int nascosta; if (DwmGetWindowAttribute(s, 14, out nascosta, 4) == 0 && nascosta != 0) continue;
      if ((GetWindowLong(s, -20) & 0x20) != 0) continue;
      Rett b; GetWindowRect(s, out b);
      if (b.Sinistra <= a.Sinistra && b.Sopra <= a.Sopra && b.Destra >= a.Destra && b.Sotto >= a.Sotto) {
        uint p; GetWindowThreadProcessId(s, out p); var t = new StringBuilder(256); GetWindowText(s, t, 256); var c = new StringBuilder(256); GetClassName(s, c, 256);
        r.Add("PID " + p + " " + c + " \"" + t + "\"");
      }
    }
    return r;
  }
  public static IntPtr DelProcesso(uint pid) {
    IntPtr trovata = IntPtr.Zero;
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p == pid && IsWindowVisible(h)) { trovata = h; return false; } return true; }, IntPtr.Zero);
    return trovata;
  }
  public static List<IntPtr> Figlie(IntPtr padre, string classe) {
    var r = new List<IntPtr>();
    EnumChildWindows(padre, (h, l) => { var s = new StringBuilder(256); GetClassName(h, s, 256); if (s.ToString() == classe) r.Add(h); return true; }, IntPtr.Zero);
    return r;
  }
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, StringBuilder l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  /** La finestra di dialogo del sistema (classe #32770), visibile, di uno dei processi. */
  public static IntPtr DialogoDelProcesso(uint[] pid) {
    IntPtr trovata = IntPtr.Zero;
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); var c = new StringBuilder(256); GetClassName(h, c, 256); if (Array.IndexOf(pid, p) >= 0 && IsWindowVisible(h) && c.ToString() == "#32770") { trovata = h; return false; } return true; }, IntPtr.Zero);
    return trovata;
  }
  /** Classe e identificativo di ogni discendente di `padre`. */
  public static List<string> Tutte(IntPtr padre) {
    var r = new List<string>();
    EnumChildWindows(padre, (h, l) => { var s = new StringBuilder(256); GetClassName(h, s, 256); r.Add(s + "#" + GetDlgCtrlID(h)); return true; }, IntPtr.Zero);
    return r;
  }
  /** Le discendenti di `padre` con quella classe e quell'identificativo. */
  public static List<IntPtr> ConIdentificativo(IntPtr padre, string classe, int id) {
    var r = new List<IntPtr>();
    foreach (var h in Figlie(padre, classe)) if (GetDlgCtrlID(h) == id) r.Add(h);
    return r;
  }
}
'@

# I processi discendenti del PID (i processi del runtime WebView2 dell'app), letti una volta.
function Discendenti([uint32]$radice) {
  $tutti = @(Get-CimInstance Win32_Process | ForEach-Object { , @([uint32]$_.ProcessId, [uint32]$_.ParentProcessId) })
  $trovati = New-Object System.Collections.Generic.List[uint32]
  $trovati.Add($radice)
  for ($k = 0; $k -lt $trovati.Count; $k++) { foreach ($p in $tutti) { if ($p[1] -eq $trovati[$k] -and -not $trovati.Contains($p[0])) { $trovati.Add($p[0]) } } }
  $trovati.RemoveAt(0)
  return , $trovati.ToArray()
}

if ($azione -eq "salva" -or $azione -eq "salva-dai-figli") {
  if ($tasto -eq "") { "NON inviato: manca il nome del file"; exit 2 }
  $processi = if ($azione -eq "salva") { , @([uint32]$processo) } else { Discendenti $processo }
  if ($processi.Count -eq 0) { "NON inviato: nessun processo discendente del PID $processo"; exit 0 }
  $dialogo = [IntPtr]::Zero
  for ($i = 0; $i -lt 100 -and $dialogo -eq [IntPtr]::Zero; $i++) {
    $dialogo = [FinestraVera]::DialogoDelProcesso([uint32[]]$processi)
    if ($dialogo -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 100 }
  }
  if ($dialogo -eq [IntPtr]::Zero) { "NON inviato: nessuna finestra del sistema per il file (#32770) dei PID $($processi -join ',') in 10 s"; exit 0 }
  # Il campo del nome (si aspetta che la finestra lo costruisca): il campo di testo con l'identificativo 1001 (misurato
  # su Windows 11 10.0.26300: la casella che lo contiene non ha identificativo) o quello dentro la casella 1148 (le
  # finestre di vecchio stampo: misurato sulla stessa versione con una finestra aperta con una funzione di aggancio,
  # ComboBoxEx32#1148 > ComboBox#1148 > Edit#1148, trovato dal solo secondo ramo e compilato). La barra dell'indirizzo
  # ha un altro campo di testo (41477), che non va toccato. Un campo di testo 1001 dentro la casella 1148 entrerebbe
  # dai due rami: si conta una volta (provato facendo cercare al primo ramo l'identificativo 1148). Non misurate: le
  # finestre di Windows 10 e quelle di un'altra lingua del sistema.
  $campi = @()
  for ($i = 0; $i -lt 50 -and $campi.Count -eq 0; $i++) {
    $campi += [FinestraVera]::ConIdentificativo($dialogo, "Edit", 1001)
    foreach ($casella in [FinestraVera]::ConIdentificativo($dialogo, "ComboBox", 1148)) { $campi += [FinestraVera]::Figlie($casella, "Edit") }
    if ($campi.Count -eq 0) { Start-Sleep -Milliseconds 100 }
  }
  # Lo stesso campo trovato dai due rami conta una volta sola.
  $campi = @($campi | Sort-Object { $_.ToInt64() } -Unique)
  if ($campi.Count -ne 1) {
    # Per capire che cosa c'e al suo posto: classe e identificativo di ogni controllo della finestra.
    $tutti = [FinestraVera]::Tutte($dialogo) -join ", "
    "NON inviato: campi del nome del file $($campi.Count) invece di 1; controlli della finestra: $tutti"; exit 0
  }
  # Il nome che l'app ha proposto, prima di scriverci sopra: si stampa nella seconda riga.
  $proposto = New-Object System.Text.StringBuilder 1024
  [void][FinestraVera]::SendMessage($campi[0], 0x000D, [IntPtr]1024, $proposto)
  # Il nome si digita (tutto il testo selezionato, poi un WM_CHAR per carattere), come lo scrive una persona: con le
  # estensioni dei file nascoste (il predefinito di un profilo nuovo) la finestra ignora un testo messo con WM_SETTEXT e
  # salva col nome proposto, anche se il campo, riletto, ha il nome nuovo (misurato su un utente senza diritti e su un
  # banco con le due impostazioni).
  [void][FinestraVera]::SendMessage($campi[0], 0x00B1, [IntPtr]0, [IntPtr](-1))
  foreach ($c in $tasto.ToCharArray()) { [void][FinestraVera]::SendMessage($campi[0], 0x0102, [IntPtr][int]$c, [IntPtr]1) }
  # Il testo si rilegge dal campo: un nome che non c'e non e mai "salvato".
  $letto = New-Object System.Text.StringBuilder 1024
  [void][FinestraVera]::SendMessage($campi[0], 0x000D, [IntPtr]1024, $letto)
  if ($letto.ToString() -ne $tasto) { "NON inviato: il campo del nome contiene `"$($letto.ToString())`""; exit 0 }
  $salva = [FinestraVera]::ConIdentificativo($dialogo, "Button", 1)
  if ($salva.Count -ne 1) { "NON inviato: pulsanti Salva (IDOK) $($salva.Count) invece di 1"; exit 0 }
  if (-not [FinestraVera]::PostMessage($salva[0], 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)) { "NON inviato: PostMessage ha rifiutato il clic su Salva"; exit 0 }
  "salvato"
  "proposto: $($proposto.ToString())"
  exit 0
}

$finestra = [FinestraVera]::DelProcesso([uint32]$processo)
if ($finestra -eq [IntPtr]::Zero) { "NON inviato: nessuna finestra visibile del PID $processo"; exit 0 }
if ($azione -eq "coperta") {
  if ([FinestraVera]::IsIconic($finestra)) { "ridotta a icona"; exit 0 }
  $sopra = [FinestraVera]::Sopra($finestra)
  if ($sopra.Count -eq 0) { "libera" } else { "coperta: " + ($sopra -join "; ") }
  exit 0
}
if ($azione -eq "chiudi") {
  # PostMessage dice se il messaggio e entrato nella coda della finestra: un "no" non e mai "spedita".
  if (-not [FinestraVera]::PostMessage($finestra, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)) { "NON inviato: PostMessage ha rifiutato WM_CLOSE"; exit 0 }
  "chiusura spedita"
  exit 0
}
# Codice virtuale e codice di scansione di ogni tasto.
$codici = @{ f5 = @(0x74, 0x3F); z = @(0x5A, 0x2C) }
if ($azione -ne "tasto" -or -not $codici.ContainsKey($tasto)) { "NON inviato: azione o tasto sconosciuti ($azione $tasto)"; exit 2 }
$ingresso = [FinestraVera]::Figlie($finestra, "Chrome_RenderWidgetHostHWND")
if ($ingresso.Count -ne 1) { "NON inviato: finestre d'input di WebView2 $($ingresso.Count) invece di 1"; exit 0 }
$c = $codici[$tasto]
$giu = [FinestraVera]::PostMessage($ingresso[0], 0x100, [IntPtr]$c[0], [IntPtr](1 -bor ($c[1] -shl 16)))
$su = [FinestraVera]::PostMessage($ingresso[0], 0x101, [IntPtr]$c[0], [IntPtr]((1 -bor ($c[1] -shl 16)) -bor 0xC0000000L))
if (-not ($giu -and $su)) { "NON inviato: PostMessage ha rifiutato il tasto (WM_KEYDOWN $giu, WM_KEYUP $su)"; exit 0 }
"inviato"
