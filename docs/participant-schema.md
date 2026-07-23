# Teilnehmer Datenbank Schema

## 📊 Vollständige Feldliste

### Pflichtfelder
- `name` (string) - Name des Teilnehmers
- `gender` ('F' | 'M') - Geschlecht
- `knownFrom` (string) - Bekannt aus (TV-Shows, etc.)
- `seasonId` (number) - Zugehörige Staffel (seit Multi-Season-Support, Schema-Version 15; nach der Migration bei allen Teilnehmern gesetzt)

### Optionale Basis-Daten
- `id` (number?) - Eindeutige Datenbank-ID
- `age` (number?) - Alter
- `status` (string?) - Status-Text (meist "aktiv")
- `active` (boolean?) - Aktiv/Inaktiv Flag
- `bio` (string?) - Biografie/Beschreibung
- `source` (string?) - Bildquellen-Angabe, wird als kleiner Text unten rechts auf dem Foto eingeblendet (`ParticipantsView.tsx`)

### Media & Fotos
- `photoUrl` (string?) - URL zum offiziellen Profilbild
- `photoBlob` (Blob?) - Lokales Foto als Blob (nur in Browser)
- `freeProfilePhotoUrl` (string?) - URL zu freiem/lizenzfreiem Profilbild
- `freeProfilePhotoAttribution` (string?) - Namensnennung für freies Bild
- `freeProfilePhotoLicense` (string?) - Lizenz des freien Bildes

### Social Media
- `socialMediaAccount` (string?) - Link zu Social Media Account

## 🆕 Free Photo Fields

Diese Felder ermöglichen die Verwendung lizenzfreier Bilder als Alternative zu urheberrechtlich geschützten Bildern:

```json
{
  "freeProfilePhotoUrl": "https://unsplash.com/photos/example-portrait",
  "freeProfilePhotoAttribution": "Photo by Jane Doe on Unsplash",
  "freeProfilePhotoLicense": "Unsplash License"
}
```

**Unterstützte Lizenzen:**
- `CC BY 4.0` - Creative Commons Attribution
- `CC BY-SA 4.0` - Creative Commons Attribution-ShareAlike
- `CC0` - Public Domain
- `Unsplash License` - Unsplash kostenlose Lizenz
- `Pexels License` - Pexels kostenlose Lizenz
- `Pixabay License` - Pixabay kostenlose Lizenz

### Vollständige JSON-Struktur

```json
{
  "seasonId": 1,
  "name": "Max Mustermann",
  "knownFrom": "Love Island Germany (2024)",
  "age": 25,
  "status": "aktiv",
  "active": true,
  "photoUrl": "https://example.com/official-photo.jpg",
  "bio": "Fitness-Coach und Reality TV Star",
  "gender": "M",
  "id": 1,
  "source": "Instagram @max_mustermann",
  "socialMediaAccount": "https://instagram.com/max_mustermann",
  "photoBlob": null,
  "freeProfilePhotoUrl": "https://unsplash.com/photos/fitness-model-portrait",
  "freeProfilePhotoAttribution": "Photo by John Smith on Unsplash",
  "freeProfilePhotoLicense": "Unsplash License"
}
```

## 🗄️ Datenbank Migration

Die `participants`-Tabelle ist Teil des Dexie-Schemas in `src/lib/db.ts`, aktuell Version 15:

```javascript
this.version(15).stores({
  participants: '++id, seasonId, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
  // ... andere Tabellen, alle zusätzlich um seasonId erweitert
})
```

Die Indizes `status`, `active`, `socialMediaAccount` und `freeProfilePhotoUrl` stammen aus früheren Schema-Versionen (6–9); `seasonId` kam mit Version 15 als Teil des Multi-Season-Retrofits hinzu (siehe Architektur-Dokumentation).

## 📝 Verwendung

### Foto-Priorität
1. `photoUrl` - Offizielles Bild (falls verfügbar)
2. `freeProfilePhotoUrl` - Lizenzfreies Bild (als Fallback)
3. Avatar mit Initialen (falls keine Bilder)

### Social Media Integration
```javascript
if (participant.socialMediaAccount) {
  // Zeige Social Media Link an
}
```

### Lizenz-Attribution
```javascript
if (participant.freeProfilePhotoUrl && participant.freeProfilePhotoAttribution) {
  // Zeige Bildnachweis an
}
```
