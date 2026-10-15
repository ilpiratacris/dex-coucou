# Goo — identità della versione Windows

Decisione dell'utente del 15/10/2026: **Goo** è il nome dell'app; **Morbido**
è il companion. Questa preparazione riguarda la build Windows in `windows/`.

## Asset della nostra versione

- Morbido è l'unico renderer, anche per i profili precedenti: 11 stati,
  7 reazioni, notch, card, desktop, miniature, saluto, file e recap.
- Bocca spessa, occhi pieni senza pupille, palette opaca con gradienti leggeri.
  Lo stato di lavoro usa occhiali da lettura e movimento degli occhi.
- Movimenti autonomi: respiro, elasticità leggera, sguardo e transizioni;
  saluto originale senza mani, guardaroba, capriole o particelle di Mochi.
- Icona originale del viso su una superficie scura, sorgente SVG modificabile
  in `windows/assets/identity/app-icon.svg`, PNG/ICO per app e installer.
- Banca di 29 suoni sintetizzati con attacco morbido e rilascio graduale,
  senza registrazioni o campioni preesistenti. Sorgenti e manifest in
  `windows/scripts/gen-sounds.mjs` e `windows/assets/sounds/`.

Rigenerazione: da `windows/`, `npm run assets`. Il processo crea gli asset;
non compila o pubblica il prodotto e non esegue test.

## Separazione e compatibilità

Il frontend include soltanto il nuovo volto; `src/mochi/outfits.ts` è rimosso.
Vite serve e copia i suoni da `assets/sounds`, senza leggere la banca macOS.
Il pacchetto usa l'icona nuova e il nome Goo, identificatore
`it.cristianocosta.goo`, con avvisi di licenza inclusi nelle risorse.

I nomi tecnici `coucou`, `coucou-hook`, `desktopMochi`, `mochiOutfit`,
alcune chiavi del catalogo e le cartelle `%APPDATA%\\Coucou` /
`%LOCALAPPDATA%\\Coucou` sono mantenuti per compatibilità con il profilo,
gli hook e il launcher già attivi. Il frontend converte i vecchi valori di
`companion` a Morbido; il salvataggio Rust registra `morbido`.
Il nome del prodotto viene applicato ai testi del catalogo prima di inserire
i nomi forniti dall'utente. L'uninstaller preserva il profilo condiviso.

Le sorgenti e i media originali di macOS e Android, così come la documentazione
storica upstream, restano nel checkout sotto i rispettivi avvisi. Non fanno
parte di questa distribuzione Windows. Non distribuire l'intero checkout come
se ogni file fosse un asset originale Goo.

## Licenze e stato

Il codice riutilizzato conserva `LICENSE` e `THIRD_PARTY_NOTICES.md`;
gli asset originali Goo/Morbido hanno un avviso separato in
`windows/assets/LICENSE-own.txt`. `LICENSE-ASSETS.md` resta il documento
upstream sui suoi asset riservati. Le dipendenze mantengono le loro licenze.

**Stato: sviluppo locale.** Nessun installer generato o pubblicato in questo
passaggio; i sorgenti sono versionati su `main`. Test, revisione indipendente Claude,
collaudo visivo, persistenza e verifica finale del contenuto del pacchetto
sono rimandati su richiesta dell'utente. La preparazione non equivale a
una certificazione legale o a un rilascio pronto alla vendita.
