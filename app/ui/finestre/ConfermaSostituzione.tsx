// La finestra che chiede se sostituire un file che c'è già, quando «Salva con nome» ci arriva senza che la
// finestra del sistema l'abbia chiesto (il nome scelto era senza «.algo», e l'app glielo ha aggiunto).
// Finestra di allerta; il fuoco parte da «Non sostituire», così un Invio di troppo non perde il file.
import { useRef, type ReactElement } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

export function ConfermaSostituzione({ file, testi, rispondi }: { file: string | null; testi: Dizionario; rispondi: (sostituisci: boolean) => void }): ReactElement {
  const no = useRef<HTMLButtonElement>(null);
  return (
    <Finestra aperta={file !== null} allerta titolo={riempi(testi.sostituireTitolo, { file: file ?? "" })} rinuncia={() => rispondi(false)} iniziale={() => no.current}>
      <Descrizione className={stili.spiegazione}>{testi.sostituireSpiegazione}</Descrizione>
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} onClick={() => rispondi(true)}>
          {testi.sostituireConferma}
        </button>
        <Rinuncia type="button" ref={no} className={stili.comando}>
          {testi.sostituireRinuncia}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
