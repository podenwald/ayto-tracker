# Changelog

## [1.9.2] - 2026-09-06

### 🐛 Bugfixes
- Wahrscheinlichkeits-Tab: Wenn die Voraussetzungen (Kandidat*innen/Matching Nights) noch fehlen, erschien bisher eine generische rote Fehlerbox — obwohl das gar kein Fehler ist, sondern nur fehlende Eingabedaten. Zusätzlich verhindert der bewusste "nur ein automatischer Versuch pro Tab-Aktivierung"-Schutz (`calculationAttemptedRef`), dass nach dem Nachtragen von Daten automatisch neu gerechnet wird. `ProbabilityCalculationStatus` bekommt dafür ein neues `errorType`-Feld (`'missing-data'` vs. `'unexpected'`); bei fehlenden Voraussetzungen wird jetzt eine ruhige Info-Box mit klarem Hinweis angezeigt, dass die Berechnung danach manuell über den Button "Berechnen" gestartet werden muss. Echte, unerwartete Fehler zeigen weiterhin die rote Fehlerbox (ODI-342)

### 📋 Daten
- Neuer Kandidat Laurenz (25, bekannt aus Temptation Island VIP und Ex on the Beach) zum Standard-Datensatz der aktuellen Season hinzugefügt (`public/json/ayto-rsil-2026.json`, id 108) (ODI-343)

---

## [1.9.1] - 2026-09-05

### 🐛 Bugfixes (kritisch)
- Wahrscheinlichkeitsberechnung (`probabilityService.ts`) konnte bei der aktuellen Staffel-Größe (11 Frauen/10 Männer = 39.916.800 mögliche Zuordnungen) durch das `MAX_VALID_MATCHINGS`-Limit (10 Mio.) vorzeitig und **systematisch verzerrt** abgeschnitten werden — die Generierung brach durch feste Tiefensuche-Reihenfolge nicht zufällig, sondern einseitig ab, bevor überhaupt Matchbox-/Matching-Night-Constraints angewendet wurden. Gefunden bei Investigation ODI-336, siehe ODI-339.
- Generierung, Filterung und Zählung laufen jetzt in einem Durchgang über indexbasierte, typisierte Arrays statt in getrennten Schritten über materialisierte JS-Objekt-Arrays; Matchbox-Entscheidungen werden zusätzlich strukturell in die Suche eingebaut (Pruning). Für die reale Staffel-Größe wird der komplette Lösungsraum jetzt exakt und ohne Limit durchsucht (getestet: 39.916.800 Zuordnungen in < 2s). Verifiziert per Unit-Tests inkl. exaktem Abgleich mit einem extern veröffentlichten Referenzbeispiel ([daturkel/ayto](https://github.com/daturkel/ayto)) (ODI-339)

---

## [1.9.0] - 2026-09-05

### 🔧 Code-Qualität / Infrastruktur
- Automatisierte Test-Suite eingeführt (Vitest): 56 Tests für die kritische, reine Business-Logik (`matchStatus.ts`, `budget.ts`, `swappedNightsHeuristic.ts`, `broadcastUtils.ts`, `seasonFinale.ts`, `MatchboxService.validateMatchbox`, `MatchingNightService.validateMatchingNightForm`). `fake-indexeddb` als Test-Polyfill ergänzt, damit Dexie-basierte Services ohne echten Browser testbar sind (ODI-268)
- CI-Workflow um Lint- und Test-Schritte erweitert; der Deploy schlägt jetzt fehl, wenn Lint oder Tests nicht bestehen (ODI-269)
- Alle 18 vorbestehenden ESLint-Fehler behoben, die dem neuen CI-Lint-Gate im Weg standen: `any`-Typen in `jsonImport.ts`, `jsonDataService.ts`, `theme/index.ts` und `ImportExport.tsx` durch konkrete (teils lockere Legacy-)Typen ersetzt; `Badge`/`Button`-Varianten-Konstanten in eigene Dateien ausgelagert (React-Fast-Refresh-Regel); zwei bewusst deaktivierte UI-Blöcke (`OverviewMUI.tsx`, `AdminLayout.tsx`) von `{false && ...}` auf benannte Feature-Flag-Konstanten umgestellt; eine irreguläre Unicode-Leerstelle entfernt
- Teilnehmer*innen-JSON-Normalisierung (Gender-Mapping, Status-Normalisierung, Default-Werte) war vierfach fast identisch dupliziert über `jsonImport.ts`, zwei Stellen in `AdminPanelMUI.tsx` und `ImportExport.tsx`. Jetzt eine gemeinsame Funktion `normalizeLegacyParticipant()`, von allen vier Stellen genutzt (ODI-279, Teil 1)
- `PenaltyService.validatePenalty()` existierte bereits, wurde aber nirgends genutzt (der Formular-Handler hatte eine eigene Inline-Validierung) — dabei hatte die vorhandene Validierung sogar einen Bug (verlangte `amount > 0`, obwohl Strafen im Alltag als negativer Betrag erfasst werden). Bug behoben (`amount ungleich 0` statt `> 0`) und jetzt im Admin-Formular verwendet (ODI-279, Teil 2)
- ODI-279 (SettingsManagement entflechten) bewusst nur teilweise umgesetzt: Die ~1800 Zeilen große Komponente enthält ca. 28 Handler; die meisten davon delegieren DB-Zugriffe bereits korrekt an Services und sind reine UI-Orchestrierung (Dialoge, Downloads, Browser-Storage) ohne extrahierbare Business-Logik. Die zwei tatsächlich betroffenen, real duplizierten Fälle (s.o.) wurden behoben; eine vollständige Auftrennung in Hooks bleibt als mögliche Folgearbeit offen, falls gewünscht

---

## [1.8.3] - 2026-09-05

### 🔧 Code-Qualität
- `perfectMatchLights`-Berechnung im Matching-Night-Formular (`OverviewMUI.tsx`) war 5x innerhalb weniger JSX-Zeilen dupliziert (Lichter-Minimum, Fehler-Zustand, Hilfetext, Lichter-Punkte). Jetzt einmal berechnet und überall referenziert (ODI-283)
- Die Staffelende-Trigger-Sequenz (10. Matching Night finden, sortieren, Auswertung berechnen, Overlay öffnen) existierte unabhängig sowohl beim Speichern der 10. Matching Night als auch beim manuellen Öffnen der Staffelend-Auswertung. Jetzt ein gemeinsamer Helper `triggerSeasonFinaleIfComplete()`, den beide Aufrufstellen nutzen (ODI-284)
- Die Vertauschte-Paare-Erkennung/Reparatur in Admin war direkt im Button-Handler mit `alert()`/`window.location.reload()` vermischt. Erkennung + Reparatur sind jetzt als reine Funktion `findSwappedMatchingNights()` (`utils/swappedNightsHeuristic.ts`) ausgelagert, ohne UI-Seiteneffekte; der Handler ruft nur noch diese Funktion auf (ODI-281)
- ODI-280 (Umbenennungs-Kaskade extrahieren) bei Prüfung bereits erledigt vorgefunden: `ParticipantForm`s Submit-Handler ruft bereits ausschließlich `MatchboxService.renameParticipant()`/`MatchingNightService.renameParticipantInPairs()` auf, keine Änderung nötig

---

## [1.8.2] - 2026-09-04

### 🐛 Bugfixes (kritisch)
- Nach einem Staffelwechsel konnten Teilnehmer*innen einer anderen Staffel komplett verschwinden (nicht nur ein Anzeige-Fehler): `importJsonBundleForSeason()` übernahm die `id` aus der Katalog-JSON-Datei 1:1 als Dexie-Primärschlüssel. Da alle Staffeln sich denselben ID-Raum je Tabelle teilen (nur über `seasonId` unterschieden), überschrieb `bulkPut` beim Import einer Staffel mit kollidierenden IDs die Datensätze einer anderen Staffel in-place. Konkret: `ayto-rsil-2025.json` (Teilnehmer*innen-IDs 87–108) überlappte vollständig mit der Live-Staffel (87–107); `ayto-2026.json` und `ayto-rsil-2025.json` überlappten zusätzlich bei Matchboxes und Matching Nights. Sofortmaßnahme: alle drei Katalog-Dateien auf garantiert disjunkte ID-Bereiche je Entität umnummeriert (Live-Staffel unverändert, da aktiv bearbeitet). Root-Cause-Fix (IDs beim Import grundsätzlich verwerfen statt aus der JSON zu übernehmen) folgt nach der Staffel als separates Ticket, da er die "Jetzt aktualisieren"-Merge-Logik (ODI-331) berührt (ODI-287)

---

## [1.8.1] - 2026-09-04

### 🐛 Bugfixes
- Doppelmatch-Informationen (`isDoppelmatch`/`doppelmatchPartner`) gingen beim "Komplettexport" (`utils/deploymentExport.ts`) und beim Anwenden eines Datenbank-Updates (`mapMatchbox()` in `databaseUpdateService.ts`) verloren, weil beide Stellen Matchbox-Objekte per explizitem Feld-Mapping statt per Object-Spread aufgebaut haben. Betroffen war konkret die Doppelmatch-Partnerschaft Marta & Johannes + Zoe, die nach Cache-Löschen/Neuladen verschwand. Beide Mapping-Stellen ergänzt; veröffentlichte Staffel-Daten korrigiert (ODI-335)

---

## [1.8.0] - 2026-09-04

### 🐛 Bugfixes
- Bearbeiten einer bestehenden Matchbox zeigte in der Kandidat*innen-Auswahl fälschlich wieder alle Teilnehmer*innen an, inkl. bereits an anderer Stelle vergebener Perfect-Match-Partner*innen. Neuer gemeinsamer Helper `getAvailableParticipants()` in `matchStatus.ts`, den Admin- und Übersicht-Matchbox-Formular jetzt beide nutzen; beim Bearbeiten bleibt nur das eigene Paar der Matchbox zusätzlich auswählbar (ODI-286, ODI-271)
- Der Status-Punkt (aktiv/vergeben) im Übersicht-Kandidat*innen-Raster (`OverviewMUI.tsx`) folgte dem separat gespeicherten `active`-Feld und konnte dadurch vom (korrekt berechneten) Ausgrauen abweichen. Beide Anzeigen nutzen jetzt dieselbe Perfect-Match-Berechnung (ODI-289)
- `hasConfirmedPerfectMatch`/`getPerfectMatchPartner` in `OverviewMUI.tsx` implementierten die Ausstrahlungszeit-Filterung für Perfect Matches eigenständig erneut, statt den bereits vorhandenen `getValidPerfectMatchesBeforeDateTime()`-Helper zu nutzen (ODI-273)
- Die Matching-Night-Validierung in Admin und Übersicht war unabhängig implementiert: Die "KRITISCH" markierte Geschlechts-Platzierungsprüfung existierte nur in der Übersicht, nicht in Admin, das dadurch ungültige Paare akzeptieren konnte. Neuer gemeinsamer `MatchingNightService.validateMatchingNightForm()`, den beide Formulare jetzt nutzen (ODI-274)
- Die Budget-/Saldo-Berechnung (Startbudget + Verkäufe − Strafen + Gutschriften) war in Admin und Übersicht unabhängig dupliziert, mit Divergenz-Risiko bei künftigen Änderungen. Neuer gemeinsamer Helper `calculateBudget()` in `utils/budget.ts`, den beide Oberflächen jetzt nutzen; der ungenutzte `PenaltyService.getTotalPenalties()` wurde entfernt (ODI-272)
- Der "Kompletter Browser-Reset" in Admin (`clearCache()`) löschte auch die selbst erarbeitete Lösung ("Deine Lösung", `localStorage`-Key `userSolution`), obwohl die Datenbank laut Hinweistext unverändert bleiben sollte. `userSolution` ist jetzt Teil der beim Reset erhaltenen Keys

### ✨ Neue Funktionen
- Admin-Bereich: Matching Nights können jetzt auch direkt im Admin-Panel neu angelegt werden ("Neue Matching Night"), nicht mehr nur im Live-Tracker (ODI-288)

### 📊 Daten
- Aktueller Stand der Staffel aus der Produktion übernommen: Zoe als nicht mehr aktiv markiert; Zeitstempel der Perfect-Match-Matchbox (Marta & Johannes) aktualisiert

---

## [1.7.0] - 2026-09-03

### 🐛 Bugfixes (kritisch)
- Der "Datenbank-Update erforderlich"-Banner löschte beim Bestätigen ("Jetzt aktualisieren") die komplette lokale Staffel und ersetzte sie 1:1 durch die statische JSON-Datei — lokal erfasste Matching Nights und Matchbox-Entscheidungen gingen dabei verloren (trat konkret nach v1.6.0 auf). Zwei Fixes: (1) Der Banner erscheint jetzt nur noch bei echter Inhaltsänderung der aktiven Staffel-Datenquelle, nicht mehr bei jedem Code-Release. (2) Ein bestätigtes Update löscht bei einer schreibbaren (aktiv bearbeiteten) Staffel keine lokalen Daten mehr, sondern ergänzt/aktualisiert nur noch (ODI-331)

### ✨ Neue Funktionen
- `ayto-rsil-2026.json` von einer reinen Teilnehmer*innen-Liste auf das volle Bundle-Format (`participants`, `matchingNights`, `matchboxes`, `penalties`) umgestellt und mit dem aktuellen Live-Stand befüllt (21 Kandidat*innen, 3 Matching Nights, 4 Matchboxes inkl. 1 bestätigtem Perfect Match). Sowohl neue Installationen als auch bereits bestehende (dank des ODI-331-Fixes jetzt sicher, ohne Datenverlust) laden damit den vollständigen aktuellen Stand

---

## [1.6.0] - 2026-09-03

### ✨ Neue Funktionen
- Doppelmatch bei ungleicher Geschlechterzahl: Bei ungleicher Kandidat*innen-Zahl (aktuell real 11 Frauen / 10 Männer) kann eine Person des zahlenmäßig kleineren Geschlechts zwei Perfect-Match-Partner*innen haben. Neues Häkchen + Auswahl der zweiten Partner*in in beiden Matchbox-Formularen (Admin + Live-Tracker), nur sichtbar bei Perfect Match und ungleicher Geschlechterzahl, max. 1 pro Staffel. Beide Personen gelten danach als nicht mehr Teil der Show, Status wird beim Bearbeiten/Löschen korrekt zurückgesetzt (ODI-330)

### 🐛 Bugfixes
- Bereits als Doppelmatch-Partner*in vergebene Personen blieben in der Kandidat*innen-Auswahl für weitere Matchboxes fälschlich als "verfügbar" gelistet

---

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
