// Besserer Cache-Clear mit mehr Feedback
(async () => {
  try {
    console.log('🔍 Starte Cache-Löschung...');

    const dbRequest = indexedDB.open('aytoDB');

    dbRequest.onerror = () => {
      console.error('❌ Fehler beim Öffnen der Datenbank');
    };

    dbRequest.onsuccess = (event) => {
      const db = event.target.result;
      console.log('✅ Datenbank geöffnet, Version:', db.version);
      console.log('📋 Verfügbare Tabellen:', Array.from(db.objectStoreNames));

      if (!db.objectStoreNames.contains('probabilityCache')) {
        console.warn('⚠️ probabilityCache Tabelle existiert nicht!');
        console.log('💡 Das ist okay - Cache ist leer oder wurde noch nie erstellt');
        return;
      }

      const transaction = db.transaction(['probabilityCache'], 'readwrite');
      const store = transaction.objectStore('probabilityCache');
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        console.log('✅ Cache erfolgreich gelöscht!');

        // Prüfe ob wirklich leer
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          console.log('📊 Einträge im Cache:', countRequest.result);
          alert('✅ Cache gelöscht! Seite wird neu geladen.');
          window.location.reload();
        };
      };

      clearRequest.onerror = () => {
        console.error('❌ Fehler beim Löschen des Caches');
      };
    };
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
})();
