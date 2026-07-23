# Wahrscheinlichkeits-Matrix - Spiellogik

> **Status:** Die Berechnung (`probabilityService.ts`, läuft im Web Worker `probabilityWorker.ts`) ist implementiert und funktionsfähig, der Menüpunkt ist im aktuellen UI (Stand v1.2.1) aber deaktiviert. Diese Doku beschreibt die Logik, wie sie im Code vorhanden ist.

## Übersicht

Die Wahrscheinlichkeits-Matrix zeigt für jedes mögliche Paar (Frau × Mann) die Wahrscheinlichkeit an, dass sie ein Perfect Match sind. Die Darstellung erfolgt visuell durch Symbole und zusätzliche Informationen über Matching Nights.

---

## Zell-Struktur

Jede Zelle in der Matrix ist in zwei Bereiche aufgeteilt:

### Oberer Bereich: Symbol
- **💚 (Grünes Herz)**: Bestätigtes Perfect Match (100%)
- **✗ (Rotes Kreuz)**: Definitiv ausgeschlossen (0%)
- **? (Graues Fragezeichen)**: Unbekannte Wahrscheinlichkeit (1-99%)

### Unterer Bereich: Matching Night Informationen
Format: `#N(L)` wobei:
- `N` = Matching Night Nummer
- `L` = Anzahl der Lichter in dieser Night

Beispiel: `#1(4) #5(6)` bedeutet:
- Night 1: 4 Lichter
- Night 5: 6 Lichter

---

## Logik für Symbole

### 💚 Perfect Match (100%)

Ein Paar wird als Perfect Match angezeigt, wenn **eine** der folgenden Bedingungen erfüllt ist:

#### 1. Matchbox-Bestätigung
- Das Paar wurde in einer **Matchbox** als Perfect Match bestätigt (`matchType === 'perfect'`)
- Die Matchbox wurde bereits **ausgestrahlt** (Broadcast-Datum + Zeit ≤ jetzt)
- Matchboxen ohne `ausstrahlungsdatum` oder `ausstrahlungszeit` werden **nicht** berücksichtigt

#### 2. Wahrscheinlichkeitsberechnung
- Die Wahrscheinlichkeitsberechnung ergibt 100%
- Dies bedeutet, dass nach Anwendung aller Constraints (Matching Nights, Matchboxes) nur noch eine gültige Lösung existiert

#### 3. Perfect Light Matching Night
- Das Paar saß in einer Matching Night zusammen, in der **alle Lichter** angegangen sind
- Bedingungen:
  - `totalLights === 10` (maximale Anzahl Paare)
  - `pairs.length === 10` (alle Paare vorhanden)
- Die Matching Night wurde bereits **ausgestrahlt** (Broadcast-Datum + Zeit ≤ jetzt)
- **Wichtig**: Wenn alle Lichter angehen, sind ALLE Paare dieser Night automatisch Perfect Matches

### ✗ Definitiv ausgeschlossen (0%)

Ein Paar wird als definitiv ausgeschlossen angezeigt, wenn **eine** der folgenden Bedingungen erfüllt ist:

#### 1. Matchbox No-Match
- Das Paar wurde in einer **Matchbox** als No-Match bestätigt (`matchType === 'no-match'`)

#### 2. Perfect Match Ausschlusslogik
- **Frau** hat bereits ein Perfect Match mit einem **anderen** Mann
- **Mann** hat bereits ein Perfect Match mit einer **anderen** Frau

Beispiel:
- Wenn Emmy ↔ Chris ein Perfect Match ist, dann sind:
  - Emmy × Alle anderen Männer → ✗
  - Chris × Alle anderen Frauen → ✗

### ? Unbekannte Wahrscheinlichkeit (1-99%)

- Weder als Perfect Match bestätigt noch definitiv ausgeschlossen
- Die genaue Wahrscheinlichkeit wird nicht angezeigt (nur das Symbol)

---

## Matching Night Informationen

### Wann werden Matching Night Daten angezeigt?

Die Matching Night Informationen (`#N(L)`) werden im **unteren Bereich** der Zelle angezeigt, wenn:

1. Das Paar in mindestens einer Matching Night **zusammengesessen** hat
2. Die Matching Night wurde bereits **ausgestrahlt** (Broadcast-Datum + Zeit ≤ jetzt)

### Farbcodierung

- **Grün** (`success.main`): Bei Perfect Matches (💚)
- **Blau** (`info.main`): Bei allen anderen Paaren (✗, ?)

### Trennlinie

Eine horizontale Trennlinie zwischen oberem und unterem Bereich erscheint **nur**, wenn Matching Night Daten vorhanden sind.

---

## Zeitbasierte Logik (Chronologie)

### Ausstrahlungsdaten

Alle zeitbasierten Prüfungen berücksichtigen:
- `ausstrahlungsdatum` (Format: `YYYY-MM-DD`)
- `ausstrahlungszeit` (Format: `HH:MM`)

Falls diese nicht vorhanden sind, wird auf `createdAt` zurückgegriffen (nur für Matching Nights).

### Perfect Match Bestätigung

**Wichtig**: Ein Perfect Match aus einer Matchbox wird erst ab dem Ausstrahlungszeitpunkt berücksichtigt.

Beispiel:
- Matchbox mit Emmy ↔ Chris wird am 15.09.2025 um 20:15 Uhr ausgestrahlt
- Vor diesem Zeitpunkt: Emmy × Chris zeigt ? oder Wahrscheinlichkeit
- Nach diesem Zeitpunkt: Emmy × Chris zeigt 💚

### Matching Night Reihenfolge

Matching Nights werden chronologisch nach `ausstrahlungsdatum` + `ausstrahlungszeit` sortiert:
- Die Nummerierung `#1, #2, #3...` basiert auf dieser chronologischen Reihenfolge
- **Nicht** auf der Reihenfolge der Erstellung

---

## Wahrscheinlichkeitsberechnung

### Input-Daten

Die Berechnung verwendet:

1. **Männer und Frauen**: Liste aller aktiven Teilnehmer
2. **Matching Nights**: Paare und Gesamtlichter jeder Night
3. **Matchboxes**: Perfect Matches und No-Matches

### Algorithmus

1. **Generiere alle möglichen Matchings** (Permutationen)
2. **Filtere nach Matching Night Constraints**:
   - Für jede Night: Zähle korrekte Paare
   - Behalte nur Matchings mit der richtigen Anzahl an Lichtern
3. **Filtere nach Matchbox Constraints**:
   - Perfect Matches müssen enthalten sein
   - No-Matches dürfen nicht enthalten sein
4. **Berechne Wahrscheinlichkeiten**:
   - Für jedes Paar: Häufigkeit in gültigen Matchings / Anzahl gültiger Matchings
5. **Extrahiere fixierte Paare** (Wahrscheinlichkeit = 100%)

### Performance-Limit

- Maximal 10.000.000 gültige Matchings werden berücksichtigt
- Bei Überschreitung wird die Berechnung abgebrochen (Limit erreicht)

### Caching

Berechnungsergebnisse werden in **IndexedDB** gecacht:
- Cache-Key: Hash der Input-Daten (Teilnehmer, Nights, Matchboxes)
- Cache wird automatisch invalidiert bei Datenänderungen
- Manuelles Löschen über "Neu berechnen" Button

---

## Besondere Fälle

### Ungleiche Geschlechterverteilung

Wenn die Anzahl von Männern ≠ Anzahl von Frauen:
- Die kleinere Gruppe kann mehrere Perfect Matches haben
- Beispiel: 12 Männer, 10 Frauen → 2 Frauen haben je 2 Perfect Matches

### Alle Lichter angegangen (Perfect Light)

Wenn in einer Matching Night `totalLights === 10` und `pairs.length === 10`:
- **Alle** 10 Paare dieser Night sind automatisch Perfect Matches
- Diese werden sofort in der Matrix mit 💚 angezeigt
- Keine separate Matchbox-Bestätigung notwendig

### Fehlende Ausstrahlungsdaten

Elemente ohne `ausstrahlungsdatum` oder `ausstrahlungszeit`:
- **Matchboxes**: Werden **nicht** für die Matrix berücksichtigt
- **Matching Nights**: Fallback auf `createdAt` (nur für interne Berechnungen)

---

## Teilnehmer-Anzeige

### Header (Männer - oben)

- Avatar (32×32px)
- Name (max. 8 Zeichen)
- ✓ Symbol bei Perfect Match
- Partner-Name bei Perfect Match (max. 6 Zeichen)

### Zeilen (Frauen - links)

- Name (max. 10 Zeichen)
- Avatar (32×32px) - rechts vom Namen
- ✓ Symbol bei Perfect Match
- Partner-Name bei Perfect Match (max. 6 Zeichen)

### Minimale Breite

- Frauen-Spalte: `width: 1%`, `whiteSpace: nowrap` (minimal nötig)
- Rechtsbündig ausgerichtet

---

## Benutzer-Interaktion

### Matrix-Zellen

- **Hover**: Leichte Vergrößerung (`scale(1.02)`)
- **Tooltip**: Zeigt detaillierte Informationen beim Hovern
  - Paar-Namen
  - Wahrscheinlichkeit in Prozent
  - Status (Perfect Match / Ausgeschlossen)
  - Liste aller Matching Nights mit Lichterzahlen

### "Neu berechnen" Button

- Löscht den Cache
- Startet neue Berechnung
- Im Header der Wahrscheinlichkeits-Matrix Card

### Progress Bar

Während der Berechnung:
- Linear Progress Bar (0-100%)
- Aktueller Schritt-Text
- Zeigt: "Prüfe Cache...", "Generiere Matchings...", etc.

### Infobox

Nach erfolgreicher Berechnung:
- Anzahl gültiger Kombinationen
- Berechnungszeit in Sekunden
- "Limit erreicht" Warnung (falls zutreffend)
- Anzahl fixierter Paare

---

## Datenquellen

### IndexedDB Tabellen

1. **`participants`**: Teilnehmer-Stammdaten
2. **`matchboxes`**: Matchbox-Entscheidungen
3. **`matchingNights`**: Matching Night Paare und Lichter
4. **`probabilityCache`**: Gecachte Berechnungsergebnisse

### Import/Export

Alle Daten können über die Admin-Seite:
- Exportiert werden (JSON)
- Importiert werden (JSON)
- Der Probability-Cache wird mit exportiert

---

## Technische Details

### Komponenten

- **Hauptkomponente**: `src/features/overview/OverviewMUI.tsx`
- **Berechnung**: `src/services/probabilityService.ts`
- **Web Worker**: `src/workers/probabilityWorker.ts`
- **Hook**: `src/hooks/useProbabilityCalculation.ts`
- **Utilities**: `src/utils/broadcastUtils.ts`

### Helper-Funktionen in OverviewMUI

1. `hasConfirmedPerfectMatch()` - Prüft ob Teilnehmer ein Perfect Match hat
2. `getPerfectMatchPartner()` - Gibt den Perfect Match Partner zurück
3. `isPairInPerfectLightMatchingNight()` - Prüft Perfect Light Night
4. `isDefinitivelyExcluded()` - Prüft ob Paar ausgeschlossen ist
5. `getAllMatchingNightsTogether()` - Sammelt alle Nights eines Paares

### Farben (MUI Theme)

- `success.main` / `success.dark`: Grün für Perfect Matches
- `error.main`: Rot für ausgeschlossene Matches
- `info.main` / `info.dark`: Blau für Matching Night Info
- `text.secondary`: Grau für unbekannte Wahrscheinlichkeiten
- `divider`: Grau für Rahmen und Trennlinien

---

## Zukünftige Erweiterungen

Mögliche Optimierungen und Features:

1. **Wahrscheinlichkeits-Anzeige**: 1-99% als Zahl statt nur "?" anzeigen
2. **Filter**: Nach Wahrscheinlichkeit oder Status filtern
3. **Sortierung**: Matrix nach verschiedenen Kriterien sortieren
4. **Highlight**: Bestimmte Paare hervorheben
5. **Export**: Matrix als Bild oder PDF exportieren
6. **Simulation**: "Was-wäre-wenn" Szenarien durchspielen

---

**Letzte Aktualisierung**: 2025-10-07
**Version**: 0.5.0

