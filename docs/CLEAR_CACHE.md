# Cache löschen für Wahrscheinlichkeits-Berechnung

## Sofort-Lösung im Browser:

1. **Browser-Console öffnen** (`F12` oder `Cmd + Option + I`)

2. **Im Console-Tab folgendes eingeben und Enter drücken:**

```javascript
// IndexedDB Cache löschen
(async () => {
  // Keine feste Versionsnummer angeben - die Datenbank hat aktuell Schema-Version 15
  // und wächst weiter; ein zu niedriger Wert hier löst einen VersionError aus.
  const dbRequest = indexedDB.open('aytoDB');
  dbRequest.onsuccess = async (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('probabilityCache')) {
      console.warn('⚠️ probabilityCache-Tabelle existiert nicht - Cache ist bereits leer.');
      return;
    }
    const transaction = db.transaction(['probabilityCache'], 'readwrite');
    const store = transaction.objectStore('probabilityCache');
    await store.clear();
    console.log('✅ Wahrscheinlichkeits-Cache gelöscht!');
    window.location.reload();
  };
})();
```

> Ausführlichere Variante mit Fehlerbehandlung: siehe [`script_konsole.js`](script_konsole.js) im selben Ordner.

3. **Seite wird automatisch neu geladen**

4. **Gehe zum Wahrscheinlichkeits-Tab und klicke "Neu berechnen"**

---

## Alternative: Admin Panel nutzen

1. Gehe zu: **Admin Panel** (Menü links)
2. Suche nach **"Gefahrenzone"** oder **"Cache"**
3. Klicke auf **"Cache löschen"** oder ähnlich

---

## Nach dem Cache-Löschen:

Du solltest jetzt in der Console sehen:
```
🔍 Probability Calculation Input: { men: [...], women: [...] }
✅ Schritt 1: X Matchings generiert
✅ Schritt 2: Y gültige Matchings nach Zeremonien
...
```

