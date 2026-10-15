# Goo per Windows

![Icona originale Goo](src-tauri/icons/128x128.png)

Goo è la versione personale di sviluppo di Cristiano Costa, derivata dal codice
Coucou. **Morbido** è il suo unico companion: un volto minimale nel notch,
con occhi pieni, bocca spessa, gradienti opachi ed espressioni legate al lavoro.

## Personalizzazioni

- Tutti gli 11 stati e le 7 reazioni usano il renderer Morbido, anche nelle
  miniature, sul desktop, nel saluto, nel caricamento file e nel recap.
- Occhiali da lettura e sguardo in movimento durante il lavoro.
- Icona e banca di 29 suoni originali. Nessun asset Mochi nel frontend distribuito.
- Chat con gli accessi attivi di Codex CLI e Claude Code, tramite abbonamento.
- Notifiche Codex con apertura della conversazione nell'app desktop.
- Area opzionale delle integrazioni nascosta per default; scheda principale
  a larghezza piena. Interruttore nelle impostazioni per mostrarla.
- Traduzione italiana e avvio automatico della copia di sviluppo tramite
  launcher nascosto, senza terminali visibili.

## Sviluppo locale

Prerequisiti: Node/npm, Rust con toolchain MSVC e strumenti di compilazione
Windows, Microsoft Edge WebView2. Le dipendenze sono già presenti nel PC
di sviluppo corrente.

```powershell
npm.cmd ci
npm.cmd run assets
npm.cmd run tauri dev
```

Il launcher versionato è `scripts/dev-launcher.pyw`; avviarlo con `pythonw.exe`
per lavorare senza console visibili. Sul PC corrente l'avvio automatico usa
la copia operativa esterna `../../dev-launcher.pyw`.
La procedura è in [DEVELOPMENT.md](../DEVELOPMENT.md).
TypeScript/CSS si aggiornano via Vite; Rust ricompila e riavvia l'app.
`npm run assets` rigenera le icone e i suoni da sorgenti originali.

## Profilo e integrazioni

Per continuità con il lavoro già configurato, le cartelle tecniche restano
`%APPDATA%\Coucou` e `%LOCALAPPDATA%\Coucou`; restano stabili anche
`coucou-hook.exe` e i nomi dei campi del profilo. Goo mostra Morbido anche
se una vecchia preferenza contiene `mochi`. L'uninstaller conserva i dati
condivisi. Evitare l'avvio contemporaneo della vecchia installazione.

## Identità, documentazione e licenze

- [Identità del fork](../design/IDENTITA-FORK.md)
- [Stati e rappresentazioni Morbido](../design/MORBIDO.md)
- [Novità](../CHANGELOG.md)
- [Codice riutilizzato: MIT](../LICENSE)
- [Avvisi e attribuzioni](../THIRD_PARTY_NOTICES.md)
- [Termini separati degli asset originali](assets/LICENSE-own.txt)
- [Provenienza degli asset](assets/identity/provenance.json)

L'installer configurato ha nome Goo e identità `it.cristianocosta.goo`.
Le vecchie schermate di Mochi sono state rimosse da questa directory.
Le sorgenti native e la documentazione storica macOS/Android rimangono nel
checkout sotto le licenze originali e sono escluse dal pacchetto Windows.

## Stato del progetto

Sviluppo locale, nessuna release generata o pubblicata in questo passaggio.
Test, revisione indipendente, controlli visivi, persistenza e verifica finale
del pacchetto sono rimandati per richiesta dell'utente del 15/10/2026.
I sorgenti sono versionati su `main`. La build Linux condivide parte del codice ma non è stata
collaudata per questa identità.
