# Changelog

## [1.5.3] - 2026-08-17

### 🐛 Bugfixes
- "Staffel wählen" zeigte weiterhin den veralteten Titel "Upcomming" statt "Live", weil `SeasonPickerDialog.tsx` beim Zusammenführen von lokaler Staffel und Katalog-Eintrag immer den lokal gespeicherten Titel behielt. Titel-Auflösung in `resolveSeasonTitle()` (`seasonCatalogCore.ts`) konsolidiert; `getActiveSeasonSummary()` und `SeasonPickerDialog.tsx` nutzen jetzt beide denselben Helper (Katalog-Titel gewinnt)

### 📊 Daten
- Joena (Too Hot to Handle, Love Island VIP) zum Kandidat*innen-Cast der aktuellen Staffel in `ayto-rsil-2026.json` ergänzt

---

## [1.5.2] - 2026-08-16

### 🐛 Bugfixes
- Admin-Header lief auf schmalen Mobile-Viewports ebenfalls über den Bildschirmrand hinaus (analog zu ODI-322); `minWidth: 0` + `flexShrink: 0` in `AdminLayout.tsx` ergänzt (ODI-323)
- Seiten mit breiten Inhalten (z.B. die Wahrscheinlichkeits-Matrix-Tabelle in `OverviewMUI.tsx`) machten die gesamte Seite breiter als den Viewport, weil die `main`-Content-Box kein `minWidth: 0` hatte und dadurch nicht unter die bevorzugte Breite ihres Inhalts schrumpfen konnte; das ließ den Header beim Scrollen abgeschnitten erscheinen. `minWidth: 0` auf der `main`-Box in `MenuLayout.tsx`/`AdminLayout.tsx` ergänzt
- `position: fixed` durch `position: sticky` für den App-Header ersetzt, da `fixed` in manchen mobilen Emulations-/Rendering-Umgebungen seine Breite gegen einen falschen (zu breiten) Viewport auflöste
- Season-Titel "Upcomming" (Tippfehler) zu "Live" korrigiert

### 🔄 Verbesserungen
- `content-visibility: auto` auf den Kandidaten-Karten im Admin-Panel für flüssigeres Scrollen bei langen Listen

---

## [1.5.1] - 2026-08-14

### 🐛 Bugfixes
- Icon-Reihe im Header (Pokal, Neue Matching Night, Neue Matchbox, Einstellungen) lief auf schmalen Mobile-Viewports über den Bildschirmrand hinaus und wurde abgeschnitten; Titel konnte nicht schrumpfen. Titel bekommt jetzt Ellipsis-Truncation, Icon-Reihe ist `flexShrink: 0` mit angepassten Größen/Abständen auf `xs` (`MenuLayout.tsx`, ODI-322)

---

## [1.5.0] - 2026-07-27

### 🔄 Verbesserungen
- Toter Code entfernt: `StatisticsCards` in `AdminPanelMUI.tsx` nahm Props entgegen, rendert aber immer `null` (ODI-285)
- Direkte Dexie-Zugriffe (`db.*`) in `AdminPanelMUI.tsx`, `OverviewMUI.tsx` und `BroadcastManagement.tsx` durch die jeweiligen Services ersetzt (`ParticipantService`, `MatchboxService`, `MatchingNightService`, `PenaltyService`); neue Service-Methoden für Bulk-Delete/Replace pro Staffel sowie Rename-Kaskade bei Teilnehmer-Umbenennung ergänzt (ODI-278)
- `no-explicit-any`-Typen in den JSON-Import-Funktionen (`AdminPanelMUI.tsx`) und `BroadcastManagement.tsx` durch konkrete Legacy-JSON-Typen ersetzt (ODI-270, erste Tranche)
- Export-Aufbereitung (`exportForDeploy`) in eine reine, DOM-unabhängige Funktion `buildDeploymentExport` ausgelagert (ODI-282)

### 📚 Dokumentation
- `VSERVER_HOSTING_GUIDE.md` und `PWA_HOSTING_GUIDE.md` beschrieben nie umgesetzte Hosting-Wege (eigener VServer, Netlify) widersprüchlich zur echten Lösung; zu `docs/HOSTING_ALTERNATIVES.md` zusammengelegt und klar als verworfene Alternativen markiert. `docs/DEPLOYMENT.md` bleibt alleinige Quelle der Wahrheit (ODI-267)

---

## [1.4.4] - 2026-07-27

### 🐛 Bugfixes
- Perfect-Match-Validierung (Duplikat-Check, Betrag/Käufer bei `matchType: 'sold'`) war zwischen Admin (`AdminPanelMUI.tsx`) und Overview (`OverviewMUI.tsx`) unterschiedlich implementiert und ist jetzt in `MatchboxService.validateMatchbox`/`isPerfectMatch` vereinheitlicht.
- `participant.active` wurde beim Anlegen einer Perfect-Match-Matchbox nur auf `false` gesetzt, aber nie zurückgesetzt, wenn die Matchbox später geändert oder gelöscht wurde — Kandidat*innen konnten dadurch dauerhaft fälschlich als "vergeben" markiert bleiben. `MatchboxService` gleicht den Status jetzt bei jedem Create/Update/Delete über `reconcileParticipantActiveStatus` mit den aktuell bestätigten Perfect Matches ab.

### 🔄 Verbesserungen
- Admin-seitige Schreibzugriffe auf Teilnehmer*innen, Matching Nights, Strafen und Matchboxes laufen jetzt über die jeweiligen Services (`ParticipantService`, `MatchingNightService`, `PenaltyService`, `MatchboxService`) statt über den separaten `jsonDataService` — dadurch greift die Season-Zugehörigkeits-Prüfung konsistent für alle Schreibzugriffe (ODI-275, ODI-276).

---

## [1.4.3] - 2026-07-25

### 🛠️ Verbesserungen
- Die Update-Infobox (`UpdateInfoBox.tsx`) zeigt die Release-Notes jetzt als Modal (weiße Karte, zentriert), passend zu Impressum/Datenschutz/Versionsinformationen — statt der bisherigen blauen Inline-Box.

---

## [1.4.2] - 2026-07-25

### 🚀 Neue Features
- "Was ist neu?"-Link im Versionsinformationen-Modal: klappt den letzten Eintrag aus `docs/CHANGELOG-USER.md` direkt inline auf, ohne auf die einmalige Auto-Update-Infobox warten zu müssen.
- "Git Tag" im Versionsinformationen-Modal verlinkt jetzt auf die zugehörige GitHub-Release-Seite.

### 🛠️ Verbesserungen
- Das Versionsinformationen-Modal nutzt jetzt dieselbe Typografie/Optik wie Impressum und Datenschutz, statt einer abweichenden Monospace-Darstellung.

---

## [1.4.1] - 2026-07-25

### 🚀 Neue Features
- Eigenes Favicon und echte PWA-Icons (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png` waren bisher leere 0-Byte-Platzhalter, Favicon war Vites Standard-Logo).
- `docs/CHANGELOG-USER.md`: separater, nutzerfreundlicher Changelog ohne technische Details — `UpdateInfoBox.tsx` liest jetzt daraus statt aus dem technischen `docs/CHANGELOG.md`.

### 🔒 Rechtliches
- Impressum: fehlende Postanschrift ergänzt; veraltete Zitation "§ 55 Abs. 2 RStV" auf "§ 18 Abs. 2 MStV" korrigiert (RStV wurde 2020 vom Medienstaatsvertrag abgelöst).
- Datenschutzerklärung: Hosting-Anbieter (netcup) und Log-Aufbewahrungsdauer (14 Tage) ergänzt, lokale IndexedDB-Datenspeicherung erklärt, Beschwerderecht bei einer Aufsichtsbehörde ergänzt (Art. 13 Abs. 2 lit. d DSGVO), Stand aktualisiert.
- Google Fonts (Inter) werden nicht mehr von Googles Servern geladen, sondern selbst gehostet (`@fontsource/inter`) — vermeidet die unter DSGVO abgemahnte IP-Übertragung an Google. Die ungenutzte Material-Icons-Web-Font wurde entfernt.

### 🐛 Bugfixes
- `/sw.js` und andere Assets wurden vom Hosting ganz ohne `Cache-Control`-Header ausgeliefert, wodurch Browser auf altem Code hängen blieben (u. a. Ursache dafür, dass Updates bisher nur nach manuellem Reload ankamen). Die `_headers`/`_redirects`-Dateien im Projekt sind Netlify-spezifisch und wurden vom tatsächlichen Apache/Plesk-Hosting (netcup) nie ausgewertet. Ersetzt durch eine `.htaccess` mit den nötigen Cache-Control-Headern und SPA-Fallback (`/admin` etc. funktioniert jetzt auch bei direktem Aufruf/Reload).

---

## [1.4.0] - 2026-07-25

### 🚀 Neue Features
- Nutzer*innen werden jetzt automatisch auf neue Versionen hingewiesen, statt es nur nach einem manuellen Reload zufällig zu bemerken: Die App prüft im Hintergrund (höchstens einmal täglich) `/manifest.json` und lädt bei einer neuen Version die Seite unbemerkt neu.
- Nach einem automatischen Update erscheint auf der Startseite einmalig eine Infobox mit dem letzten Eintrag aus `docs/CHANGELOG.md` — schließbar über einen Button.

### 🛠️ Verbesserungen
- Der alte manuelle "Neue Version verfügbar"-Dialog (mit Cache-/Cookie-Löschen-Empfehlung) entfällt, da das Update jetzt automatisch im Hintergrund läuft.

---

## [1.3.0] - 2026-07-24

### 🐛 Bugfixes
- Divergierender Aktiv-/Perfect-Match-Status zwischen Home-, Kandidat*innen- und Admin-Ansicht behoben: Alle drei lasen den Status bisher aus unterschiedlichen Quellen (Home berechnete live aus den Matchbox-Daten, Kandidat*innen- und Admin-Ansicht aus dem persistierten `participant.active`-Feld, das nach einem JSON-Reimport oder einer gelöschten/geänderten Matchbox veralten konnte). Alle drei Views leiten den Status jetzt einheitlich über `getConfirmedPerfectMatchNames()` aus den Matchbox-Daten ab (`src/utils/matchStatus.ts`).

### 🔒 Rechtliches
- Alle direkt verlinkten Kandidat*innen-Fotos (`photoUrl`) aus allen drei Staffeln entfernt (`ayto-2026.json`: kino.de, `ayto-rsil-2025.json`: rnd.de, `ayto-rsil-2026.json`: geplante RTL-Fotos). RTLs Media-Hub-Nutzungsbedingungen erlauben die Nutzung nur registrierten Journalist*innen zur redaktionellen Berichterstattung, zeitlich begrenzt auf das Ausstrahlungsfenster — nicht für einen dauerhaft laufenden Fan-Tracker. Bleibt leer, bis die Nutzungsrechte geklärt sind.

---

## [1.2.1] - 2026-07-23

### 🚀 Neue Features
- Vollbild-MUI-Dialoge auf Mobile statt gequetschter Modals (`SeasonPickerDialog`, Matchbox-/Matching-Night-Dialoge im Admin-Panel)
- Responsive Toolbar-Höhen und Stat-Chips in Admin-/Menü-Layout

### 🛠️ Verbesserungen
- Guard gegen veraltete Staffel-Wechsel-Responses in `OverviewMUI` (verhindert UI-State-Leaks bei schnellem Staffelwechsel)
- `DatabaseUpdateBanner`: manuelle Dismiss-Funktion entfernt

### 🐛 Bugfixes
- TS18048-Build-Fehler bei der Matchbox-Avatar-Vorschau behoben (mögliches `undefined` bei `woman`/`man`)
- `package-lock.json` fälschlich aus Git-Tracking entfernt, CI-Deploy schlug fehl → behoben, Datei bleibt dauerhaft getrackt
- `scripts/update-manifest.cjs` verwies auf eine nicht mehr existierende Datei (`ayto-vip-2025.json`), wodurch `dataHash` im Manifest immer `"unknown"` war → auf die tatsächliche Fallback-Datei `public/json/ayto-2026.json` korrigiert

### 🔧 Sonstiges
- Vollständiger Umstieg der Entwicklungsumgebung von Cursor auf Claude Code (`CLAUDE.md`, `.claude/`-Konfiguration)
- Cursor-Altlasten entfernt (`.cursor/debug.log`, doppelte `update-manifest.js`, toter `useAytoState`-Hook, Synology-Sync-Konflikt-Datei)
- `docs/` durchgetestet und aktualisiert (mehrere seit Monaten veraltete Angaben zu Netlify-Deploy, Datenbank-Version, Manifest-Feldern korrigiert)

---

## [1.2.0] - 2026-04-21
- Konfigurierbare Farben

---

## [1.1.1] - 2026-04-21
- Asset-Referenzen und Versionierung aktualisiert

---

## [1.1.0] - 2026-04-20
- Release v1.1.0 (Finale-Version)

---

## [1.0.4] – [1.0.5] - 2026-03-10
- Neue Matching Nights mit Details in den Daten ergänzt
- Herleitungs-Feature zur Erklärung der Wahrscheinlichkeitsberechnung in `OverviewMUI`

---

## [1.0.1] – [1.0.3] - 2026-02-11
- Matching-Night-Erstellung im Frontend, Menü/Theme/UX-Anpassungen
- Dynamische JSON-Quellen aus `public/json/index.json` mit Fallback (Vorläufer des heutigen `databaseUpdateService.ts`)

---

## [1.0.0] - 2026-02-08
- Erstes Release nach der Umbenennung/dem Versions-Reset unten (`0.0.1`)

---

## [0.0.1] - 2026-01-12

### 🔄 Projektumbenennung
- **Neuer Projektname**: AYTO-Tracker (vorher: AYTO RSIL 2025)
- **Versions-Reset**: Zurücksetzung auf Version 0.0.1
- **Umbenennung**: Alle Referenzen auf den neuen Projektnamen aktualisiert
  - Package-Name: `ayto-tracker`
  - E-Mail-Adressen: `ayto-tracker@patrick-odenwald.de`
  - Service Worker Cache: `ayto-tracker-v1`
  - Export-Dateinamen: `ayto-tracker.json`

---

## [0.5.7] - 2025-10-17

### 🚀 Neue Features
- **Mobile Tooltip-Verbesserungen**
  - Tooltips öffnen sich jetzt beim Antippen von Teilnehmern auf mobilen Geräten
  - Toggle-Funktion: Ein-/Ausschalten per Tap
  - Bessere mobile Benutzerfreundlichkeit

### 🔧 PWA-Verbesserungen
- **Theme Color**: Address Bar wird mit korrekter Farbe angezeigt
- **Apple Touch Icon**: iOS-Homescreen-Support hinzugefügt
- **Maskable Icons**: Android adaptive Icons implementiert
- **Vollständige PWA-Compliance**: Alle Standards erfüllt

### 🛠️ UI/UX-Verbesserungen
- **Z-Index-Fixes**: Update-Banner ist jetzt sichtbar über dem Header
- **VersionCheckDialog**: Korrekte Layering-Hierarchie
- **DatabaseUpdateBanner**: Sichtbarkeit verbessert

### 🔄 Versionierung & Build
- **Build-Datum**: Deutsche Zeit (MEZ) korrekt angezeigt
- **Version-Fix**: Korrekte Version aus package.json gelesen
- **Git-Tag-Integration**: Verbesserte Tag-Erkennung

### 🐛 Bugfixes
- **Perfect Matches**: Korrekte Anzeige in Matching Nights #7, #5 & #4
- **Matchbox-Import**: Datenstruktur-Konsistenz zwischen Export/Import
- **Broadcast-Logik**: Zeitliche Reihenfolge für Perfect Matches korrigiert

### 🎯 Technische Details
- **Git-Tag**: v0.5.7
- **Commit**: d2cffdd
- **Build-Datum**: 2025-10-17T20:27:32.612Z (deutsche Zeit)
- **Environment**: Development/Production korrekt erkannt

---

## [0.3.1] - 2025-09-17

### 🚀 Neue Features
- **Automatische Datenbank-Synchronisation für Deployment**
  - Neues Deployment-System, das sicherstellt, dass der aktuelle Datenbankstand beim Deployment verfügbar ist
  - Automatischer Export der aktuellen Datenbank vor jedem Build
  - Automatische Aktualisierung der `index.json` mit der neuesten Export-Datei

### 🔧 Neue NPM-Scripts
- `npm run deploy` - Komplettes Deployment mit Datenbank-Synchronisation
- `npm run export-db` - Nur Datenbank-Export ohne Build

### 🛠️ Erweiterte Admin-Panel-Funktionen
- Verbesserte "Export für Deployment" Funktion im Admin-Panel
- Detaillierte Export-Informationen und Anweisungen
- Automatische Generierung von Deployment-bereiten JSON-Dateien

### 📁 Neue Scripts
- `scripts/export-current-db.cjs` - Exportiert aktuellen Datenbankstand
- `scripts/deploy-with-db-sync.cjs` - Kompletter Deployment-Prozess
- Erweiterte `scripts/generate-version.cjs` mit DB-Export-Integration

### 📚 Dokumentation
- Vollständige Deployment-Dokumentation in `DEPLOYMENT.md`
- Detaillierte Anweisungen für den neuen Deployment-Prozess
- Troubleshooting-Guide und Best Practices

### 🔄 Verbesserungen
- **App-Initialisierung**: Lädt automatisch die neueste JSON-Datei beim ersten Start
- **Datenbank-Management**: Bessere Synchronisation zwischen IndexedDB und JSON-Exporten
- **Versionierung**: Korrekte Git-Tag-Integration für Versions-Informationen

### 🐛 Bugfixes
- Behebung des Problems, dass neue Benutzer oder nach Cache-Clear veraltete Daten geladen wurden
- Korrekte Sortierung der JSON-Dateien in `index.json` (neueste zuerst)

### 🎯 Technische Details
- **Git-Tag**: v0.3.1
- **Commit**: 9901265
- **Build-Datum**: 2025-09-17T20:13:22.366Z
- **Produktions-Build**: Bereit für Deployment

---

## [0.2.1] - Vorherige Version
- Grundlegende AYTO-Tracker-Funktionalität
- Admin-Panel mit Import/Export-Funktionen
- IndexedDB-Integration
- PWA-Unterstützung
