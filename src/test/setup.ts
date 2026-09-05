// Dexie (genutzt in @/lib/db) instanziiert sich beim Import und erwartet eine
// IndexedDB-Umgebung. In Vitests Node-Umgebung gibt es die nicht nativ -
// fake-indexeddb liefert ein In-Memory-Polyfill, damit Services, die @/lib/db
// importieren, in Tests ohne echten Browser geladen werden können.
import 'fake-indexeddb/auto'
