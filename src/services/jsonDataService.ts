/**
 * JSON-basierte Datenverwaltung
 * 
 * Dieser Service verwaltet alle Daten direkt über JSON-Dateien
 * und synchronisiert sie mit der IndexedDB für bessere Performance.
 */

import { db } from '@/lib/db'
import type { Participant, MatchingNight, Matchbox, Penalty } from '@/types'
import { getJsonDataSourcesNewestFirst } from '@/services/databaseUpdateService'
import { assertSeasonWritable, clearAllDataForSeason, getActiveSeasonId } from '@/services/seasonService'

export interface JsonDataState {
  participants: Participant[]
  matchingNights: MatchingNight[]
  matchboxes: Matchbox[]
  penalties: Penalty[]
  lastUpdated: string
  version: string
}

export interface JsonDataUpdateResult {
  success: boolean
  message: string
  data?: JsonDataState
}

/**
 * Lädt die aktuellen JSON-Daten vom Server
 */
export async function loadJsonData(): Promise<JsonDataState> {
  try {
    const dataSources = await getJsonDataSourcesNewestFirst()

    let lastError: Error | null = null

    for (const source of dataSources) {
      try {
        console.log(`🔄 Lade JSON-Daten von: ${source}`)

        const response = await fetch(source, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        
        if (response.ok) {
          const data: any = await response.json()
          
          // Validierung der Datenstruktur
          if (data.participants && Array.isArray(data.participants)) {
            console.log(`✅ JSON-Daten erfolgreich geladen von: ${source}`)
            
            // Transformiere Matchbox-Daten falls nötig (womanId/manId -> woman/man)
            // Fallback für alte Dateien, die noch womanId/manId verwenden
            const transformedMatchboxes = data.matchboxes?.map((mb: any) => ({
              ...mb,
              woman: mb.womanId || mb.woman,
              man: mb.manId || mb.man,
              womanId: undefined,
              manId: undefined
            })) || []
            
            return {
              participants: data.participants || [],
              matchingNights: data.matchingNights || [],
              matchboxes: transformedMatchboxes,
              penalties: data.penalties || [],
              lastUpdated: data.exportedAt || new Date().toISOString(),
              version: data.version || 'unknown'
            }
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unbekannter Fehler')
        console.warn(`⚠️ Fehler beim Laden von ${source}:`, error)
      }
    }
    
    throw lastError || new Error('Keine gültigen JSON-Datenquellen gefunden')
  } catch (error) {
    console.error('Fehler beim Laden der JSON-Daten:', error)
    throw new Error(`JSON-Daten konnten nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
  }
}

/**
 * Synchronisiert JSON-Daten mit der IndexedDB
 */
export async function syncJsonToIndexedDB(jsonData: JsonDataState): Promise<void> {
  try {
    console.log('🔄 Synchronisiere JSON-Daten mit IndexedDB...')
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    await clearAllDataForSeason(seasonId)

    await db.transaction('rw', [db.participants, db.matchingNights, db.matchboxes, db.penalties], async () => {
      if (jsonData.participants.length > 0) {
        await db.participants.bulkPut(
          jsonData.participants.map(p => ({ ...p, seasonId }))
        )
      }
      if (jsonData.matchingNights.length > 0) {
        await db.matchingNights.bulkPut(
          jsonData.matchingNights.map(m => ({
            ...m,
            seasonId,
            createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt as unknown as string)
          }))
        )
      }
      if (jsonData.matchboxes.length > 0) {
        await db.matchboxes.bulkPut(
          jsonData.matchboxes.map(m => ({
            ...m,
            seasonId,
            createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt as unknown as string),
            updatedAt: m.updatedAt instanceof Date ? m.updatedAt : new Date(m.updatedAt as unknown as string)
          }))
        )
      }
      if (jsonData.penalties.length > 0) {
        await db.penalties.bulkPut(
          jsonData.penalties.map(p => ({
            ...p,
            seasonId,
            createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt as unknown as string)
          }))
        )
      }
    })
    
    console.log('✅ JSON-Daten erfolgreich mit IndexedDB synchronisiert')
  } catch (error) {
    console.error('Fehler bei der Synchronisation mit IndexedDB:', error)
    throw error
  }
}

/**
 * Lädt JSON-Daten und synchronisiert sie mit der IndexedDB
 */
export async function loadAndSyncJsonData(): Promise<JsonDataState> {
  const jsonData = await loadJsonData()
  await syncJsonToIndexedDB(jsonData)
  return jsonData
}

/**
 * Lädt alle Daten aus der JSON-Datenquelle (für Admin Panel)
 */
export async function loadAllJsonData(): Promise<{
  participants: Participant[]
  matchboxes: Matchbox[]
  matchingNights: MatchingNight[]
  penalties: Penalty[]
}> {
  try {
    // Lade JSON-Daten und synchronisiere mit IndexedDB
    const jsonData = await loadAndSyncJsonData()
    
    return {
      participants: jsonData.participants,
      matchboxes: jsonData.matchboxes,
      matchingNights: jsonData.matchingNights,
      penalties: jsonData.penalties
    }
  } catch (error) {
    console.error('Fehler beim Laden aller JSON-Daten:', error)
    
    // Fallback: Lade aus IndexedDB
    console.log('🔄 Fallback: Lade Daten aus IndexedDB...')
    const seasonId = await getActiveSeasonId()
    const [participants, matchboxes, matchingNights, penalties] = await Promise.all([
      db.participants.where('seasonId').equals(seasonId).toArray(),
      db.matchboxes.where('seasonId').equals(seasonId).toArray(),
      db.matchingNights.where('seasonId').equals(seasonId).toArray(),
      db.penalties.where('seasonId').equals(seasonId).toArray()
    ])
    
    return { participants, matchboxes, matchingNights, penalties }
  }
}

/**
 * Debug-Funktion: Zeigt alle aktuellen Daten an
 * Kann im Browser Console ausgeführt werden: window.debugJsonData()
 */
export async function debugJsonData() {
  try {
    console.log('🔍 === JSON-DATEN DEBUG ===')
    
    const seasonId = await getActiveSeasonId()
    const [participants, matchboxes, matchingNights, penalties] = await Promise.all([
      db.participants.where('seasonId').equals(seasonId).toArray(),
      db.matchboxes.where('seasonId').equals(seasonId).toArray(),
      db.matchingNights.where('seasonId').equals(seasonId).toArray(),
      db.penalties.where('seasonId').equals(seasonId).toArray()
    ])
    
    console.log('👥 Teilnehmer:', participants.length, participants)
    console.log('💝 Matchboxes:', matchboxes.length, matchboxes)
    console.log('🌙 Matching Nights:', matchingNights.length, matchingNights)
    console.log('💰 Strafen:', penalties.length, penalties)
    
    console.log('🔍 === ENDE DEBUG ===')
    
    return { participants, matchboxes, matchingNights, penalties }
  } catch (error) {
    console.error('❌ Debug-Fehler:', error)
  }
}

// Globale Funktion für Browser Console
if (typeof window !== 'undefined') {
  (window as any).debugJsonData = debugJsonData
}