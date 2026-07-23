## Produktions-Deployment – Leitfaden (Always up-to-date)

Dieser Leitfaden beschreibt, wie bei jedem Deployment sichergestellt wird, dass auf Production immer die aktuellste App-Version und Datengrundlage verfügbar ist.

> **Hinweis:** Diese Datei beschrieb ursprünglich einen Netlify-basierten Deploy. Das Projekt nutzt inzwischen **GitHub Actions + FTP auf einen Netcup-vServer** - der Inhalt wurde entsprechend korrigiert.

### Überblick
- Datenquellen: alle Dateien, die in `public/json/index.json` gelistet sind (aktuell `ayto-2026.json`, `ayto-rsil-2025.json`, `ayto-rsil-2026.json`) - es gibt keine einzelne feste „Primärdatenquelle“ mehr
- `dataHash` im Manifest hasht nur die Fallback-Datei `public/json/ayto-2026.json`, nicht alle Dateien (bekannte Einschränkung)
- Beim Build wird automatisch (`prebuild`):
  1) die App-Version aus dem Git-Tag ermittelt (`scripts/generate-version.cjs`)
  2) das Manifest mit Version und Daten-Hash generiert (`scripts/update-manifest.cjs`)

### Voraussetzungen
- GitHub Actions Workflow `.github/workflows/main.yml`, Trigger: Push auf `main`
- Build-Command im Workflow: `npm ci && npm run build`
- Deploy-Ziel: FTP-Upload von `./dist/` nach `hosting119408.a2fac.netcup.net` (Secrets `FTP_USERNAME`/`FTP_PASSWORT`)

### Standard-Ablauf für ein Release
1. Änderungen auf einem Feature-Branch entwickeln, `npm run build`/`npm run lint` lokal prüfen
2. Branch nach `main` mergen (Fast-Forward oder Merge) und pushen - das **ist** der Deploy-Trigger, kein separater Schritt nötig
3. GitHub-Actions-Run abwarten (`gh run list --branch main` oder in der GitHub-UI), Dauer ca. 1 Minute
4. Nach erfolgreichem Run: Seite unter https://ayto-tracker.legendforest.de/ öffnen und Version prüfen (Footer/Admin-Panel „Versionsinformationen“)

### Durchführungsreihenfolge (Schritt für Schritt)
1) Falls sich Daten geändert haben: IndexedDB → JSON exportieren
   - App öffnen → Admin-Panel → „Export für Deployment“ klicken (lädt vollständige JSON des aktuellen IndexedDB-Stands herunter, Dateiname `ayto-complete-export-YYYY-MM-DD.json`)
   - Datei nach `public/json/` legen und in `public/json/index.json` eintragen
2) Versionsnummer/Branch-Name passend zum geplanten Release wählen (siehe Versionskonvention: Branch-Name trägt die Zielversion, z. B. `feature/mobilFirst-v1.2.1`)
3) Nach `main` mergen und pushen → GitHub Actions baut und deployed automatisch
4) Post-Deploy prüfen:
   - Footer/Admin-Panel zeigt den erwarteten Git-Tag/Commit
   - `/manifest.json` zeigt `version` = Git-Tag und `dataHash` ≠ `unknown`

### Was der Build automatisch macht
- `prebuild` führt aus:
  - `scripts/generate-version.cjs` → ermittelt Git-Tag, Commit, Build-Zeit, Production-Flag, schreibt `src/utils/version.ts`
  - `scripts/update-manifest.cjs` → schreibt `public/manifest.json` mit:
    - `version`: aktueller Git-Tag
    - `dataHash`: Hash von `public/json/ayto-2026.json` (nur diese eine Datei, siehe Überblick)
    - `released`: Datum/Uhrzeit des Tags

### Nach dem Deploy – Checks
- In der App (Footer/Admin-Panel „Versionsinformationen“):
  - Version = erwarteter Git-Tag
  - Commit = 7-stelliger Prefix des letzten Commits
- Manifest unter `/manifest.json`:
  - `version` = Git-Tag
  - `dataHash` ≠ `unknown`
  - `released` plausibel
- GitHub-Actions-Run: Status „success“ (`gh run list --branch main --limit 1`)

### Häufige Probleme und Lösungen
- Problem: Deploy-Workflow schlägt fehl mit „Dependencies lock file is not found“
  - Ursache: `package-lock.json` wurde aus dem Git-Tracking entfernt
  - Lösung: Datei committen, niemals in `.gitignore` aufnehmen (siehe `CLAUDE.md`)
- Problem: Production zeigt alte Version
  - Ursache: Push kam nicht auf `main` an, oder Workflow ist fehlgeschlagen
  - Lösung: `gh run list --branch main` prüfen, ggf. erneut pushen
- Problem: Manifest zeigt `dataHash: "unknown"`
  - Ursache: `public/json/ayto-2026.json` nicht vorhanden
  - Lösung: Datei muss im Repo existieren (aktuell der Fall); ansonsten `scripts/update-manifest.cjs` prüfen
- Problem: App meldet „Keine JSON-Dateien gefunden“
  - Ursache: `public/json/index.json` fehlt, ist leer oder verweist auf nicht existierende Dateien
  - Lösung: `index.json` prüfen, Build erneut ausführen
- Problem: Service Worker zeigt alten Stand
  - Lösung: Seite hart neu laden (Cmd+Shift+R) oder in DevTools → Application → Service Workers → Update/Unregister

### Best Practices
- Branch-Name trägt die Zielversion (siehe Entscheidungs-Doku im Repo), Tag wird beim Release entsprechend gesetzt
- Keine manuellen Änderungen an `dist/` vornehmen – immer über `npm run build`
- Bei Datenänderungen: Export über Admin-Panel, Datei + `index.json`-Eintrag committen
- Nach dem Push immer den GitHub-Actions-Run auf Erfolg prüfen, nicht blind vertrauen

### Kurzanleitung (TL;DR)
1. Merge nach `main`, pushen
2. GitHub-Actions-Run abwarten und auf Erfolg prüfen
3. Prüfen:
   - Footer-Version = erwarteter Tag
   - `/manifest.json` hat korrekte `version` und `dataHash`
   - Seite lädt und zeigt aktuelle Daten
