# Datenbank-Update-System

## Übersicht

Das benutzer-gesteuerte Datenbank-Update-System ermöglicht es, neue Daten (z.B. wöchentliche Aktualisierungen) zu erkennen und den Nutzern die Kontrolle über den Update-Zeitpunkt zu geben.

## Architektur

### 1. Manifest-basierte Versionierung

**Datei:** `public/manifest.json` (generiert von `scripts/update-manifest.cjs`)
```json
{
  "version": "v1.2.1",
  "released": "2026-07-23T07:21:14.000Z",
  "description": "AYTO-Tracker - Zentrale Version für Code und Daten"
}
```

- `version`: aktueller Git-Tag (nicht `dbVersion` - das Feld heißt tatsächlich `version`)
- `released`: ISO-Datum des Tags
- Das Manifest sagt nur, welche **App-Version** ausgeliefert wird. Ob es neue **Staffel-Daten** gibt, erkennt die App nicht darüber, sondern über einen Inhalts-Hash der Daten-Datei (`dataUrl`) der aktiven Staffel, der pro Staffel in IndexedDB gespeichert wird (`checkForDatabaseUpdate()` in `databaseUpdateService.ts`, ODI-331). Das frühere Manifest-Feld `dataHash` (hashte nur `public/json/ayto-2026.json`) wurde mit ODI-368 entfernt.
- Wird bei jedem `npm run build` automatisch neu generiert (`prebuild`-Skript)

### 2. IndexedDB Meta Store

**Erweiterung:** `src/lib/db.ts`
- `meta`-Store für Versions-Informationen (u. a. `activeSeasonId`)
- Aktuelle Dexie-Schema-Version: 15

### 3. Update-Service

**Datei:** `src/services/databaseUpdateService.ts`
- Lädt und vergleicht Manifest-Versionen
- Lädt die Liste verfügbarer Datendateien dynamisch aus `public/json/index.json` (Fallback: `/json/ayto-2026.json`, falls `index.json` fehlt oder ungültig ist)
- Führt atomare Datenbank-Updates durch

### 4. UI-Komponenten

**Banner:** `src/components/DatabaseUpdateBanner.tsx`
- Zeigt Update-Hinweis an, wenn neue Version verfügbar
- Bietet „Jetzt aktualisieren“ an (die frühere manuelle „Später“/Dismiss-Option wurde in v1.2.1 entfernt)

**Toast:** `src/components/UpdateFeedbackToast.tsx`
- Zeigt Erfolgs- oder Fehlermeldungen an
- Auto-Close nach 5 Sekunden

### 5. Service Worker

**Datei:** generiert von `vite-plugin-pwa` (`registerType: 'autoUpdate'`, siehe `vite.config.ts`)
- Cacht App-Shell-Assets
- Eigenständiger Mechanismus, unabhängig von diesem Daten-Update-System (siehe `CLAUDE.md` im Projekt-Root - zwei parallele Update-Mechanismen)

## Workflow

### App-Start
1. Service Worker wird registriert (PWA-Mechanismus, separat)
2. Datenbank-Update-Service wird initialisiert
3. Versions-Check gegen `/manifest.json` wird durchgeführt
4. Bei neuer Version: Banner wird angezeigt

### Update-Prozess
1. Nutzer klickt „Jetzt aktualisieren“
2. Neue Daten werden aus `public/json/index.json` bzw. den dort gelisteten Dateien geladen
3. IndexedDB wird atomar aktualisiert
4. Meta-Daten werden aktualisiert
5. Erfolgs-Feedback wird angezeigt

### Deployment
1. `npm run build` läuft automatisch beim Push auf `main` (GitHub Actions)
2. `prebuild` führt `scripts/generate-version.cjs` und `scripts/update-manifest.cjs` aus - **nicht** `update-manifest.js` (diese Datei war ein ungenutztes Duplikat und wurde entfernt)
3. `version` und `released` werden im generierten `public/manifest.json` aktualisiert

## Verwendung

### Manuelle Manifest-Aktualisierung

```bash
npm run update-manifest
```

### Manuelle Versions-Prüfung

```typescript
import { checkForDatabaseUpdate } from '@/services/databaseUpdateService'

const updateState = await checkForDatabaseUpdate()
if (updateState.isUpdateAvailable) {
  console.log(`Neue Version ${updateState.latestVersion} verfügbar`)
}
```

### Update durchführen

```typescript
import { performDatabaseUpdate } from '@/services/databaseUpdateService'

const result = await performDatabaseUpdate()
if (result.success) {
  console.log(`Update auf Version ${result.newVersion} erfolgreich`)
}
```

## Best Practices

### 1. Atomic Updates
- Neue Daten werden zuerst in temporäre Struktur geladen
- Alte Daten werden erst nach erfolgreichem Import gelöscht

### 2. Error Handling
- Umfassende Fehlerbehandlung auf allen Ebenen
- Fallback-Strategien bei Netzwerkfehlern (siehe `index.json`-Fallback oben)

## Konfiguration

### Datenquellen

Die tatsächliche Dateiliste steht in `public/json/index.json` und wird dynamisch geladen, aktuell z. B.:
- `ayto-2026.json` (Fallback-Datei)
- `ayto-rsil-2025.json`
- `ayto-rsil-2026.json`

Die früher hier dokumentierten Dateien (`ayto-vip-2025.json`, `ayto-complete-export-*.json`, `ayto-complete-noPicture.json`) existieren nicht mehr im Repository.

### Cache-Einstellungen
- App-Shell: Cache-First-Strategie (PWA-Service-Worker)
- Manifest: Immer frisch laden (`NO_CACHE_HEADERS` in `databaseUpdateService.ts`)

## Troubleshooting

### Update schlägt fehl
1. Netzwerk-Verbindung prüfen
2. Browser-Konsole auf Fehler prüfen
3. `/json/index.json` erreichbar und valide?

### Banner wird nicht angezeigt
1. Manifest-Datei (`/manifest.json`) erreichbar?
2. Hat sich die Daten-Datei der aktiven Staffel (z. B. `/json/ayto-rsil-2026.json`) inhaltlich geändert? Der Hinweis erscheint nur, wenn ihr Inhalts-Hash vom lokal gespeicherten Hash dieser Staffel abweicht - die App-Version im Manifest spielt dafür keine Rolle.

## Erweiterungen

### Zukünftige Features
- [ ] Update-Historie anzeigen
- [ ] Rollback-Funktionalität
