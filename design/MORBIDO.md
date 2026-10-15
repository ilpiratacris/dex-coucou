# Morbido — companion Windows

Implementazione in sviluppo della prova 3 scelta dall'utente. Palette opaca
avorio/menta/carbone, gradienti leggeri, occhi pieni senza pupille, niente
guance rosa, testa o corpo. Bocca con tratto spesso e terminali arrotondati.

## Selezione

Morbido è l'unico companion della versione Windows **Goo**, nome scelto
dall'utente il 15/10/2026. Impostazioni → Generali mostra il personaggio attivo.
Profili precedenti e valori sconosciuti selezionano Morbido; il salvataggio
registra `companion: "morbido"`. Il guardaroba originale è sostituito da una
scheda informativa del companion; i vecchi valori degli abiti sono ignorati
dal renderer. Gli occhiali da lettura sono un accessorio originale di stato.

## Stati e segni

| Stato del codice | Rappresentazione |
|---|---|
| idle | Occhi verticali e sorriso a U |
| working | Occhiali da lettura, occhi che scorrono e bocca concentrata |
| thinking | Bocca raccolta e tre punti che pulsano |
| searching | Sguardo in ricerca e piccola lente |
| approval | Occhi aperti, bocca sorpresa e pausa cerchiata |
| question | Occhi aperti, bocca sorpresa e punto interrogativo |
| error | Occhi contrariati, sopracciglia inclinate, bocca triste ed esclamativo |
| finished | Occhi felici, sorriso ampio e due scintille |
| ratelimit | Occhi stanchi, bocca triste e clessidra |
| sleeping | Occhi chiusi, bocca rilassata e Z che fluttua |
| dizzy | Occhi ondulati, bocca sorpresa e piccolo segno orbitante |

Restano gestite le sette reazioni del motore: affetto, sorpresa, orgoglio,
occhiolino, sbadiglio, felicità e fastidio; tutti i 13 tipi di occhi esistenti.
Gli accessori esprimono stati, senza sostituire i testi o i pulsanti dell'app.

## Superfici

- Notch compatto: solo occhi; gli occhiali accompagnano lo stato di lavoro.
- Schermata principale espansa: superficie unica con volto grande al centro,
  occhi distribuiti in larghezza e bocca sotto. Nome, conteggio e attività
  scorrono nella fascia inferiore centrata. Il notch misura 640 × 250 px;
  sotto la barra superiore, 128 px sono riservati al volto. Anche la vista
  senza attività usa questa disposizione. Il puntamento segue il nuovo centro.
  L'area opzionale delle integrazioni resta nella fascia inferiore, se attiva.
- Viste operative (chat, decisioni, dettagli e caricamento): mantengono lo spazio
  del personaggio previsto dai relativi controlli.
- Desktop: volto su una piccola superficie scura opaca.
- Miniature: occhi semplificati; accessori di lavoro adattati alle dimensioni.
- Saluto: renderer condiviso nelle pose e nel ritorno al notch compatto.
- File: superficie e tessera documento originali, con fessura della bocca
  compatibile con il controller del caricamento.
- Recap: usa lo stesso BotEngine, inclusa l'immagine condivisibile.

Il renderer centrale è `windows/src/mochi/morbido.ts`; il motore passa anche
il tempo di animazione e mantiene attivo il disegno per lettura e segni mobili.
Il motore e il saluto hanno movimenti propri: elasticità leggera, respiro,
scorrimento degli occhi e transizioni senza mani o capriole di Mochi.
Icona e 29 suoni sono originali; provenienza in `windows/assets/identity/`.
Questa modifica riguarda la build Windows; i renderer nativi macOS e Android
non sono stati adattati. Vedi [Identità Goo](IDENTITA-FORK.md).

## Anteprima di sviluppo

Con Vite attivo: `http://127.0.0.1:1420/dev/morbido-preview.html`.
La tavola usa i renderer del codice e dati sintetici. Non è una pagina inclusa
nella build di produzione. Le pose del caricamento e del saluto sono esempi
di fotogrammi; la fluidità va valutata nella finestra dell'app.

## Stato del collaudo

Prima dell'ultimo affinamento: TypeScript e build Vite riusciti, quattro test
del companion e 37 test Rust delle impostazioni superati. Un controllo i18n
più ampio segnala tre vecchie chiavi API inutilizzate. Durante lo sviluppo
è stato corretto il placeholder italiano del nome del file.

Su richiesta esplicita dell'utente del 15/10/2026, controlli ulteriori e
revisione Claude sono rimandati al termine dello sviluppo. Occhiali,
accessori, nuovo spessore, motore indipendente, icone, suoni e layout espanso non ancora
collaudati. Le verifiche precedenti non certificano questa revisione.
Persistenza e accettazione visiva nella finestra Windows ancora da verificare.
