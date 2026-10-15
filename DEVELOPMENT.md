# Goo — sviluppo Windows

I sorgenti della versione personalizzata sono nel ramo `main` del fork
`ilpiratacris/dex-coucou`. La build attiva usa il checkout `windows/` e
`npm.cmd run tauri dev`: Vite ricarica TypeScript/CSS, mentre le modifiche
Rust ricompilano e riavviano l'app.

## Launcher senza console

Prerequisiti: Python su Windows, Node/npm e toolchain Rust/MSVC già configurati
come descritto nel [README Windows](windows/README.md).

Avviare `windows/scripts/dev-launcher.pyw` con `pythonw.exe`. Il launcher
deduplica le proprie istanze con un lock e nasconde anche i processi figli.
Scrive log, PID e lock in `../dev-runtime/`, fuori dalla repository.
Per fermarlo creare il file vuoto `../dev-runtime/stop` e attendere che
`../dev-runtime/launcher.pid` sparisca. Non avviare anche la vecchia copia installata.

Sul PC di sviluppo attuale la voce Windows `GooDevelopment` avvia la copia
operativa esterna `../dev-launcher.pyw`. Il launcher versionato ha lo stesso
comportamento e risolve le cartelle dalla propria posizione. Questo commit
non modifica la voce Windows o il processo già attivo.

Il 15/10/2026 la vecchia voce `Coucou` è stata rimossa e `GooDevelopment`
scritta e riletta tramite WMI `StdRegProv`, dopo una discordanza tra le letture
HKCU del terminale e l'inventario `Win32_StartupCommand`. Verificare sempre
anche il percorso del processo: quello di sviluppo è
`windows/target/debug/coucou.exe`. Il prossimo login Windows resta da osservare.

## Sincronizzazione

Prima di aggiornare controllare `git status` e fare `git fetch origin`.
Conservare le modifiche locali prima di integrare nuove revisioni; non usare
reset o pulizie del checkout per sincronizzarlo. I log e la cache `graft/`
non fanno parte del codice pubblicato. Il grafo si rigenera con `graft build`.

## Stato della versione

Snapshot di sviluppo: Goo, companion Morbido, italiano, chat tramite CLI
autenticati Codex/Claude e volto centrale con attività sotto. Le cartelle
profilo `%APPDATA%\Coucou` e `%LOCALAPPDATA%\Coucou` restano compatibili.
Non è una release collaudata: controlli finali e revisione Claude sono
rinviati per decisione dell'utente. Nessun installer generato.
