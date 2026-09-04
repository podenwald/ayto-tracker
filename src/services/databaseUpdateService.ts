/**
 * Service für benutzer-gesteuerte Datenbank-Updates
 * 
 * Implementiert das PWA + IndexedDB Update-System mit:
 * - Versions-Check über manifest.json
 * - Benutzer-gesteuerte Updates
 * - Atomic Updates für Konsistenz
 * - Service Worker Integration
 */

import { DatabaseUtils, db, type Participant, type MatchingNight, type Matchbox, type Penalty, type Season } from '@/lib/db'
import type { DatabaseImport, ParticipantDTO, MatchingNightDTO, MatchboxDTO, PenaltyDTO } from '@/types'
import { assertSeasonWritable, clearAllDataForSeason, getActiveSeasonId } from '@/services/seasonService'
import {
  fetchSeasonCatalog,
  fetchCatalogDataText,
  hashJsonPayload,
  catalogBundleMetaKey,
  type SeasonCatalogEntry
} from '@/services/seasonCatalogCore'

// Manifest-Interface
export interface DatabaseManifest {
  version: string
  dataHash: string
  released: string
  description?: string
}

// Update-State-Interface
export interface DatabaseUpdateState {
  isUpdateAvailable: boolean
  currentVersion: string
  latestVersion: string
  currentDataHash: string
  latestDataHash: string
  releasedDate: string
  isUpdating: boolean
  updateError: string | null
}

// Update-Result-Interface
export interface DatabaseUpdateResult {
  success: boolean
  newVersion: string
  newDataHash: string
  releasedDate: string
  error?: string
}

/**
 * Lädt das aktuelle Manifest von der Server
 */
export async function fetchDatabaseManifest(): Promise<DatabaseManifest> {
  try {
    const response = await fetch('/manifest.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const manifest: DatabaseManifest = await response.json()
    
    // Validierung
    if (!manifest.version || !manifest.dataHash || !manifest.released) {
      throw new Error('Ungültiges Manifest-Format')
    }
    
    return manifest
  } catch (error) {
    console.error('Fehler beim Laden des Manifests:', error)
    throw new Error(`Manifest konnte nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
  }
}

/**
 * Löst die aktive Staffel + ihren Katalog-Eintrag auf (gemeinsame Grundlage für
 * Update-Check und Update-Ausführung - beide müssen dieselbe Datenquelle meinen).
 */
async function resolveActiveSeasonCatalogEntry(): Promise<{
  seasonId: number
  season: Season
  entry: SeasonCatalogEntry & { dataUrl: string }
} | null> {
  const seasonId = await getActiveSeasonId()
  const season = await db.seasons.get(seasonId)
  if (!season) return null

  const catalog = await fetchSeasonCatalog()
  const entry = catalog?.entries.find(item => item.id === season.slug)
  if (!entry?.dataUrl?.trim()) return null

  return { seasonId, season, entry: entry as SeasonCatalogEntry & { dataUrl: string } }
}

/**
 * Prüft, ob für die AKTIVE Staffel ein Datenbank-Update verfügbar ist.
 *
 * Basiert bewusst NICHT auf der App-Code-Version (die ändert sich bei jedem Release,
 * auch ohne Datenbezug) und NICHT auf manifest.json's dataHash (der wird nur aus einer
 * fest hinterlegten Fallback-Datei berechnet, nicht aus der Datenquelle der aktiven
 * Staffel) - sondern auf einem Inhalts-Hash der tatsächlichen `dataUrl` der aktiven
 * Staffel, pro Staffel gespeichert (derselbe Meta-Key wie in seasonCatalogService.ts,
 * damit beide Mechanismen konsistent bleiben). Siehe ODI-331.
 */
export async function checkForDatabaseUpdate(): Promise<DatabaseUpdateState> {
  try {
    const active = await resolveActiveSeasonCatalogEntry()
    if (!active) {
      return {
        isUpdateAvailable: false,
        currentVersion: 'unknown',
        latestVersion: 'unknown',
        currentDataHash: 'unknown',
        latestDataHash: 'unknown',
        releasedDate: '',
        isUpdating: false,
        updateError: null
      }
    }

    const [manifest, text] = await Promise.all([
      fetchDatabaseManifest().catch(() => null),
      fetchCatalogDataText(active.entry.dataUrl)
    ])

    const latestDataHash = await hashJsonPayload(text)
    const metaKey = catalogBundleMetaKey(active.entry.id)
    const storedHash = await DatabaseUtils.getMetaValue(metaKey)
    const currentDataHash = typeof storedHash === 'string' ? storedHash : null

    if (currentDataHash === null) {
      // Noch nie getrackter Altbestand (z. B. Staffel von vor diesem Fix) - Baseline
      // setzen statt sofort "Update verfügbar" zu melden, sonst würde jede bestehende
      // Installation beim ersten Check nach dem Deploy fälschlich einen Hinweis sehen.
      await DatabaseUtils.setMetaValue(metaKey, latestDataHash)
      return {
        isUpdateAvailable: false,
        currentVersion: manifest?.version ?? 'unknown',
        latestVersion: manifest?.version ?? 'unknown',
        currentDataHash: latestDataHash,
        latestDataHash,
        releasedDate: manifest?.released ?? '',
        isUpdating: false,
        updateError: null
      }
    }

    return {
      isUpdateAvailable: currentDataHash !== latestDataHash,
      currentVersion: manifest?.version ?? 'unknown',
      latestVersion: manifest?.version ?? 'unknown',
      currentDataHash,
      latestDataHash,
      releasedDate: manifest?.released ?? '',
      isUpdating: false,
      updateError: null
    }
  } catch (error) {
    console.error('Fehler beim Versions-Check:', error)
    return {
      isUpdateAvailable: false,
      currentVersion: 'unknown',
      latestVersion: 'unknown',
      currentDataHash: 'unknown',
      latestDataHash: 'unknown',
      releasedDate: '',
      isUpdating: false,
      updateError: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

const NO_CACHE_HEADERS = {
  cache: 'no-cache' as RequestCache,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

/**
 * Lädt die Liste der JSON-Dateien aus public/json/index.json (dynamisch).
 * Fallback auf feste Liste, wenn index.json fehlt oder fehlschlägt.
 */
export async function getJsonDataSources(): Promise<string[]> {
  try {
    const response = await fetch('/json/index.json', NO_CACHE_HEADERS)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const list = await response.json()
    if (!Array.isArray(list) || list.length === 0) throw new Error('Leere oder ungültige index.json')
    return list.map((name: string) => `/json/${name.replace(/^\/json\//, '')}`)
  } catch (error) {
    console.warn('⚠️ index.json nicht geladen, nutze Fallback:', error)
    return ['/json/ayto-2026.json']
  }
}

/**
 * Ermittelt für jede URL das Änderungsdatum per HTTP HEAD (Last-Modified oder Date)
 * und gibt die URLs sortiert zurück (neueste zuerst).
 * Bei Fehlern oder fehlendem Header: ursprüngliche Reihenfolge beibehalten.
 */
export async function getJsonDataSourcesNewestFirst(): Promise<string[]> {
  const sources = await getJsonDataSources()
  if (sources.length <= 1) return sources

  const withDate = await Promise.all(
    sources.map(async (url): Promise<{ url: string; date: number }> => {
      try {
        const res = await fetch(url, { method: 'HEAD', ...NO_CACHE_HEADERS })
        const lastMod = res.headers.get('last-modified')
        const dateStr = res.headers.get('date')
        const date = lastMod || dateStr
        const ts = date ? new Date(date).getTime() : 0
        return { url, date: ts }
      } catch {
        return { url, date: 0 }
      }
    })
  )

  withDate.sort((a, b) => b.date - a.date)
  return withDate.map((x) => x.url)
}

/**
 * Führt ein Update der Datenbank für die AKTIVE Staffel durch.
 *
 * Löst die Datenquelle über den Katalog-Eintrag der aktiven Staffel auf (gleiche
 * Zuordnung wie ensureActiveSeasonCatalogDataLoaded()), NICHT durch Scannen aller
 * Dateien in public/json/ nach "neuestem" Last-Modified-Datum. Letzteres ignorierte
 * komplett, welche Staffel aktiv ist, und konnte dadurch die aktive Staffel mit den
 * Teilnehmern einer völlig anderen Staffel überschreiben (siehe CLAUDE.md/ADRs).
 *
 * WICHTIG (ODI-331): Bei einer schreibbaren (aktiv bearbeiteten) Staffel wird NICHT
 * mehr vorher gelöscht - nur noch ergänzt/aktualisiert (bulkPut = Upsert je ID). Ein
 * vorheriges clearAllDataForSeason() hat hier bereits lokal erfasste Matching Nights
 * und Matchbox-Entscheidungen gelöscht, sobald jemand "Jetzt aktualisieren" klickte,
 * selbst wenn die JSON-Datei diese Informationen gar nicht enthielt. Nur bei
 * schreibgeschützten (abgeschlossenen) Staffeln wird weiterhin vollständig ersetzt,
 * da dort niemand mehr aktiv Daten pflegt.
 */
export async function performDatabaseUpdate(): Promise<DatabaseUpdateResult> {
  try {
    console.log('🔄 Starte Datenbank-Update...')

    const active = await resolveActiveSeasonCatalogEntry()
    if (!active) {
      throw new Error('Keine Datenquelle für die aktive Staffel im Katalog gefunden')
    }

    const [manifest, text] = await Promise.all([
      fetchDatabaseManifest().catch(() => null),
      fetchCatalogDataText(active.entry.dataUrl)
    ])

    const raw: unknown = JSON.parse(text)
    // Katalog-Datendateien liegen wahlweise als reines Teilnehmer-Array oder als
    // Objekt mit participants/matchingNights/... vor (siehe parseRawJsonToImportData
    // in jsonImport.ts, die denselben Katalog-Dateien beim regulären Staffel-Import
    // begegnet).
    const newData: DatabaseImport = Array.isArray(raw)
      ? { participants: raw as ParticipantDTO[], matchingNights: [], matchboxes: [], penalties: [] }
      : (raw as DatabaseImport)
    if (!newData.participants || !Array.isArray(newData.participants)) {
      throw new Error(`Ungültige Datenstruktur von ${active.entry.dataUrl}`)
    }

    console.log(`📥 Neue Daten geladen (Staffel "${active.season.title}")`)

    const seasonId = active.seasonId
    await assertSeasonWritable(seasonId)

    const isReadOnlySeason = active.season.readOnly === true
    if (isReadOnlySeason) {
      await clearAllDataForSeason(seasonId)
    }

    // 2. Update nur für die aktive Staffel
    await db.transaction('rw', [db.participants, db.matchingNights, db.matchboxes, db.penalties, db.meta], async () => {
      // DTO -> Domain Mapping mit Typ-Konvertierungen
      const mapParticipant = (p: ParticipantDTO): Participant => ({
        id: p.id,
        seasonId,
        name: p.name,
        knownFrom: p.knownFrom,
        age: p.age,
        status: p.status === 'Aktiv' || p.status === 'Inaktiv' ? p.status : undefined,
        active: p.active,
        photoUrl: p.photoUrl,
        bio: p.bio,
        gender: p.gender,
        photoBlob: p.photoBlob,
        socialMediaAccount: p.socialMediaAccount,
        freeProfilePhotoUrl: p.freeProfilePhotoUrl,
        freeProfilePhotoAttribution: p.freeProfilePhotoAttribution,
        freeProfilePhotoLicense: p.freeProfilePhotoLicense
      })

      const mapMatchingNight = (m: MatchingNightDTO): MatchingNight => ({
        id: m.id,
        seasonId,
        name: m.name,
        date: m.date,
        pairs: m.pairs,
        totalLights: m.totalLights,
        matchType: m.matchType,
        price: m.price,
        buyer: m.buyer,
        createdAt: new Date(m.createdAt),
        ausstrahlungsdatum: m.ausstrahlungsdatum,
        ausstrahlungszeit: m.ausstrahlungszeit
      })

      const mapMatchbox = (m: MatchboxDTO): Matchbox => ({
        id: m.id,
        seasonId,
        woman: m.woman,
        man: m.man,
        matchType: m.matchType,
        price: m.price,
        buyer: m.buyer,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
        ausstrahlungsdatum: m.ausstrahlungsdatum,
        ausstrahlungszeit: m.ausstrahlungszeit,
        isDoppelmatch: m.isDoppelmatch,
        doppelmatchPartner: m.doppelmatchPartner
      })

      const mapPenalty = (p: PenaltyDTO): Penalty => ({
        id: p.id,
        seasonId,
        participantName: p.participantName,
        reason: p.reason,
        amount: p.amount,
        date: p.date,
        description: p.description,
        createdAt: new Date(p.createdAt)
      })

      const participantsMapped = newData.participants.map(mapParticipant)
      const matchingNightsMapped = newData.matchingNights.map(mapMatchingNight)
      const matchboxesMapped = newData.matchboxes.map(mapMatchbox)
      const penaltiesMapped = newData.penalties.map(mapPenalty)

      // Neue Daten einfügen (upsert)
      await Promise.all([
        db.participants.bulkPut(participantsMapped),
        db.matchingNights.bulkPut(matchingNightsMapped),
        db.matchboxes.bulkPut(matchboxesMapped),
        db.penalties.bulkPut(penaltiesMapped)
      ])
      
      // Meta-Daten aktualisieren: Inhalts-Hash pro Staffel (Grundlage für den nächsten
      // checkForDatabaseUpdate()-Vergleich) sowie die App-weiten Anzeige-Felder.
      const latestDataHash = await hashJsonPayload(text)
      await Promise.all([
        DatabaseUtils.setMetaValue(catalogBundleMetaKey(active.entry.id), latestDataHash),
        manifest ? DatabaseUtils.setDbVersion(manifest.version) : Promise.resolve(),
        manifest ? DatabaseUtils.setDataHash(manifest.dataHash) : Promise.resolve(),
        DatabaseUtils.setLastUpdateDate(manifest?.released ?? new Date().toISOString())
      ])
    })

    console.log(`✅ Staffel "${active.season.title}" erfolgreich aktualisiert${isReadOnlySeason ? ' (ersetzt)' : ' (ergänzt)'}`)

    return {
      success: true,
      newVersion: manifest?.version ?? 'unknown',
      newDataHash: manifest?.dataHash ?? 'unknown',
      releasedDate: manifest?.released ?? ''
    }
  } catch (error) {
    console.error('❌ Fehler beim Datenbank-Update:', error)
    return {
      success: false,
      newVersion: 'unknown',
      newDataHash: 'unknown',
      releasedDate: '',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

// Cache für bereits geladene Daten
// Verwende window-Objekt für Persistenz bei Hot Reloads
declare global {
  interface Window {
    __aytoDataPreloaded?: boolean
    __aytoServiceInitialized?: boolean
    __aytoInitializationPromise?: Promise<void>
  }
}

let isDataPreloaded = window.__aytoDataPreloaded || false

/**
 * Service Worker Integration: Lädt Daten im Hintergrund vor
 */
export async function preloadDatabaseData(): Promise<void> {
  // Vermeide doppelte Ausführung
  if (isDataPreloaded) {
    return
  }
  
  try {
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cache = await caches.open('ayto-db-cache')
      
      // Manifest cachen
      await cache.add('/manifest.json')

      // Datenquellen dynamisch aus index.json, dann cachen
      const dataSources = await getJsonDataSources()
      await cache.add('/json/index.json')

      for (const source of dataSources) {
        try {
          await cache.add(source)
        } catch (error) {
          console.warn(`⚠️ Konnte ${source} nicht cachen:`, error)
        }
      }
      
      isDataPreloaded = true
      window.__aytoDataPreloaded = true
      console.log('✅ Datenbank-Daten im Hintergrund geladen')
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Vorladen der Daten:', error)
  }
}

// Singleton-Pattern für Service-Initialisierung

let isServiceInitialized = window.__aytoServiceInitialized || false
let initializationPromise: Promise<void> | null = window.__aytoInitializationPromise || null

/**
 * Initialisiert den Datenbank-Update-Service (Singleton)
 */
export async function initializeDatabaseUpdateService(): Promise<void> {
  // Wenn bereits initialisiert, nichts tun
  if (isServiceInitialized) {
    return
  }
  
  // Wenn Initialisierung läuft, warte auf das bestehende Promise
  if (initializationPromise) {
    return initializationPromise
  }
  
  // Neue Initialisierung starten
  initializationPromise = performInitialization()
  
  try {
    await initializationPromise
    isServiceInitialized = true
    window.__aytoServiceInitialized = true
    window.__aytoInitializationPromise = initializationPromise
  } catch (error) {
    // Bei Fehler, Initialisierung zurücksetzen
    initializationPromise = null
    window.__aytoInitializationPromise = undefined
    throw error
  }
}

async function performInitialization(): Promise<void> {
  try {
    console.log('🔄 Initialisiere Datenbank-Update-Service...')
    
    // Service Worker für Hintergrund-Downloads registrieren
    if ('serviceWorker' in navigator) {
      try {
        // Prüfe ob wir in der Entwicklungsumgebung sind
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        
        if (isDevelopment) {
          // In der Entwicklung: Service Worker deaktivieren um Message-Channel-Fehler zu vermeiden
          console.log('🔧 Entwicklungsumgebung erkannt - Service Worker deaktiviert')
          
          // Bestehende Service Worker deaktivieren
          try {
            const registrations = await navigator.serviceWorker.getRegistrations()
            for (const registration of registrations) {
              await registration.unregister()
              console.log('🗑️ Bestehender Service Worker deaktiviert')
            }
          } catch (unregisterError) {
            console.warn('⚠️ Fehler beim Deaktivieren bestehender Service Worker:', unregisterError)
          }
        } else {
          // In der Produktion: Service Worker registrieren
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('✅ Service Worker registriert:', registration)
        }
      } catch (swError) {
        console.warn('⚠️ Service Worker Registrierung fehlgeschlagen:', swError)
        // Service Worker Fehler sollten die App nicht blockieren
      }
    }
    
    // Daten im Hintergrund vorladen
    await preloadDatabaseData()
    
    console.log('✅ Datenbank-Update-Service initialisiert')
  } catch (error) {
    console.warn('⚠️ Fehler bei der Initialisierung des Update-Services:', error)
    throw error
  }
}
