# Deployment

Dieses Dokument beschreibt den Deployment-Prozess der Anwendung.

## Deployment-Prozess

Deployment ist vollautomatisch: **jeder Push auf `main` löst einen GitHub-Actions-Workflow aus** (`.github/workflows/main.yml`), der baut und per FTP auf den Netcup-vServer (`hosting119408.a2fac.netcup.net`) hochlädt. Es gibt keinen separaten manuellen Deployment-Schritt mehr.

```bash
npm run deploy   # = npm run build, für lokale Vorschau/Verifikation vor dem Push
```

Es gibt **kein** `npm run export-db` und **kein** `scripts/export-current-db.js` (mehr) im Projekt - Datenexport läuft ausschließlich über das Admin-Panel (siehe unten).

### Admin-Panel Export

Im Admin-Panel gibt es eine „Export für Deployment“-Funktion (`AdminPanelMUI.tsx`), die:

- den aktuellen Datenbankstand als JSON exportiert (inkl. Validierung, dass alle Matching Nights/Matchboxes ein Ausstrahlungsdatum haben)
- eine Datei `ayto-complete-export-YYYY-MM-DD.json` zum Download anbietet
- **nicht automatisch** `index.json` aktualisiert - das ist ein manueller Schritt (siehe unten)

## Dateistruktur

```
public/json/
├── index.json              # Liste der Dateien, die die App lädt (in dieser Reihenfolge)
├── ayto-2026.json          # aktuelle Fallback-/Standarddatei
├── ayto-rsil-2025.json
└── ayto-rsil-2026.json
```

Die Dateinamen sind frei wählbar - `index.json` ist die einzige Quelle der Wahrheit dafür, welche Dateien die App kennt.

## App-Initialisierung

Beim App-Start:

1. Prüft die App, ob bereits Daten in der IndexedDB vorhanden sind
2. Falls keine Daten vorhanden sind, lädt sie die Dateiliste aus `public/json/index.json` (dynamisch per `fetch`, kein Datums-Parsing der Dateinamen)
3. Schlägt das Laden von `index.json` fehl, wird als Fallback fest `/json/ayto-2026.json` geladen (`databaseUpdateService.ts`)
4. Die Daten werden in die IndexedDB importiert

## Verfügbare Skripte

### `scripts/generate-version.cjs`
- Ermittelt Git-Tag/Commit/Build-Zeit, schreibt `src/utils/version.ts`

### `scripts/update-manifest.cjs`
- Schreibt `public/manifest.json` (Version, Daten-Hash der Fallback-Datei, Release-Datum)

Beide laufen automatisch als `prebuild`-Schritt vor jedem `npm run build`.

## Best Practices

1. **Nach Datenänderungen**: Export über das Admin-Panel, Datei nach `public/json/` legen, `index.json` von Hand um den neuen Dateinamen ergänzen, committen und pushen
2. **Vor dem Push**: `npm run build` lokal laufen lassen, um Build-Fehler vorab zu erkennen (der `tsc -b`-Schritt ist das einzige harte Gate, da keine Tests existieren)
3. **Backup**: Alte JSON-Dateien nicht löschen, sondern als Referenz behalten

## Troubleshooting

### Problem: App lädt veraltete Daten
**Lösung**: Prüfen, ob die neue Datei tatsächlich in `public/json/index.json` eingetragen wurde, dann erneut committen/pushen

### Problem: Deploy schlägt in GitHub Actions fehl mit „Dependencies lock file is not found“
**Lösung**: `package-lock.json` muss immer committet bleiben - niemals in `.gitignore` aufnehmen, auch wenn `node_modules`/`dist` das zurecht sind (siehe `CLAUDE.md` im Projekt-Root)

### Problem: Build schlägt fehl
**Lösung**: `npm run build` lokal ausführen und die Konsolen-Ausgabe prüfen

## Sicherheit

- JSON-Dateien enthalten Teilnehmerdaten und werden öffentlich über `dist/` ausgeliefert - keine wirklich sensiblen/privaten Daten (keine Zugangsdaten, keine Nutzerkonten) dort ablegen
- Deploy-Zugangsdaten (`FTP_USERNAME`/`FTP_PASSWORT`) liegen als GitHub-Actions-Secrets vor, nicht im Repository

## Monitoring

Nach dem Push:

1. GitHub-Actions-Run prüfen (`gh run list --branch main` oder in der GitHub-UI) - läuft er auf „success“?
2. App unter https://ayto-tracker.legendforest.de/ neu laden (ggf. Hard-Reload) und Version im Footer/Admin-Panel prüfen
3. `/manifest.json` abrufen und `version`/`dataHash` gegenprüfen

## Versionierung

Die exportierten JSON-Dateien enthalten Versions-Informationen:

```json
{
  "participants": [...],
  "matchingNights": [...],
  "matchboxes": [...],
  "penalties": [...],
  "probabilityCache": [...],
  "broadcastNotes": [...],
  "exportedAt": "2026-07-23T10:30:00.000Z",
  "version": "v1.2.1",
  "deploymentReady": true
}
```

Dies hilft bei der Nachverfolgung und dem Debugging von Datenproblemen.
