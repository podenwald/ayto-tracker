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
 * Aktualisiert einen Teilnehmer in der JSON-Datenquelle
 */
export async function updateParticipantInJson(participant: Participant): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    await db.participants.put({ ...participant, seasonId })
    
    console.log(`✅ Teilnehmer ${participant.name} in IndexedDB aktualisiert`)
    console.log('📊 Aktuelle Teilnehmer-Daten:', await db.participants.where('seasonId').equals(seasonId).toArray())
    
    return {
      success: true,
      message: `Teilnehmer ${participant.name} erfolgreich aktualisiert`
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Teilnehmers:', error)
    return {
      success: false,
      message: `Fehler beim Aktualisieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Fügt einen neuen Teilnehmer zur JSON-Datenquelle hinzu
 */
export async function addParticipantToJson(participant: Participant): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)

    const existingParticipants = await db.participants.where('seasonId').equals(seasonId).toArray()
    const maxId = Math.max(0, ...existingParticipants.map(p => p.id || 0))
    const newParticipant = {
      ...participant,
      seasonId,
      id: maxId + 1
    }
    
    await db.participants.add(newParticipant)
    
    console.log(`✅ Neuer Teilnehmer ${newParticipant.name} zur IndexedDB hinzugefügt`)
    
    return {
      success: true,
      message: `Teilnehmer ${newParticipant.name} erfolgreich hinzugefügt`
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Teilnehmers:', error)
    return {
      success: false,
      message: `Fehler beim Hinzufügen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Löscht einen Teilnehmer aus der JSON-Datenquelle
 */
export async function deleteParticipantFromJson(participantId: number): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    const participant = await db.participants.get(participantId)
    if (participant && participant.seasonId !== seasonId) {
      return { success: false, message: 'Teilnehmer gehört nicht zur aktiven Staffel.' }
    }
    const participantName = participant?.name || `ID ${participantId}`
    
    await db.participants.delete(participantId)
    
    console.log(`✅ Teilnehmer ${participantName} aus JSON-Datenquelle gelöscht`)
    
    return {
      success: true,
      message: `Teilnehmer ${participantName} erfolgreich gelöscht`
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Teilnehmers:', error)
    return {
      success: false,
      message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
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
 * Aktualisiert eine Matchbox in der JSON-Datenquelle
 */
export async function updateMatchboxInJson(matchbox: Matchbox): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    await db.matchboxes.put({ ...matchbox, seasonId })
    
    console.log(`✅ Matchbox ${matchbox.woman} + ${matchbox.man} in JSON-Datenquelle aktualisiert`)
    console.log('📊 Aktuelle Matchbox-Daten:', await db.matchboxes.where('seasonId').equals(seasonId).toArray())
    
    return {
      success: true,
      message: `Matchbox ${matchbox.woman} + ${matchbox.man} erfolgreich aktualisiert`
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Matchbox:', error)
    return {
      success: false,
      message: `Fehler beim Aktualisieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Löscht eine Matchbox aus der JSON-Datenquelle
 */
export async function deleteMatchboxFromJson(matchboxId: number): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    const matchbox = await db.matchboxes.get(matchboxId)
    if (matchbox && matchbox.seasonId !== seasonId) {
      return { success: false, message: 'Matchbox gehört nicht zur aktiven Staffel.' }
    }
    const matchboxName = matchbox ? `${matchbox.woman} + ${matchbox.man}` : `ID ${matchboxId}`
    
    await db.matchboxes.delete(matchboxId)
    
    console.log(`✅ Matchbox ${matchboxName} aus JSON-Datenquelle gelöscht`)
    
    return {
      success: true,
      message: `Matchbox ${matchboxName} erfolgreich gelöscht`
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Matchbox:', error)
    return {
      success: false,
      message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Aktualisiert eine Matching Night in der JSON-Datenquelle
 */
export async function updateMatchingNightInJson(matchingNight: MatchingNight): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    await db.matchingNights.put({ ...matchingNight, seasonId })
    
    console.log(`✅ Matching Night ${matchingNight.name} in JSON-Datenquelle aktualisiert`)
    
    return {
      success: true,
      message: `Matching Night ${matchingNight.name} erfolgreich aktualisiert`
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Matching Night:', error)
    return {
      success: false,
      message: `Fehler beim Aktualisieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Löscht eine Matching Night aus der JSON-Datenquelle
 */
export async function deleteMatchingNightFromJson(matchingNightId: number): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    const matchingNight = await db.matchingNights.get(matchingNightId)
    if (matchingNight && matchingNight.seasonId !== seasonId) {
      return { success: false, message: 'Matching Night gehört nicht zur aktiven Staffel.' }
    }
    const matchingNightName = matchingNight?.name || `ID ${matchingNightId}`
    
    await db.matchingNights.delete(matchingNightId)
    
    console.log(`✅ Matching Night ${matchingNightName} aus JSON-Datenquelle gelöscht`)
    
    return {
      success: true,
      message: `Matching Night ${matchingNightName} erfolgreich gelöscht`
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Matching Night:', error)
    return {
      success: false,
      message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Aktualisiert eine Strafe in der JSON-Datenquelle
 */
export async function updatePenaltyInJson(penalty: Penalty): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    await db.penalties.put({ ...penalty, seasonId })
    
    console.log(`✅ Strafe für ${penalty.participantName} in JSON-Datenquelle aktualisiert`)
    console.log('📊 Aktuelle Penalty-Daten:', await db.penalties.where('seasonId').equals(seasonId).toArray())
    
    return {
      success: true,
      message: `Strafe für ${penalty.participantName} erfolgreich aktualisiert`
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Strafe:', error)
    return {
      success: false,
      message: `Fehler beim Aktualisieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Fügt eine neue Strafe zur JSON-Datenquelle hinzu
 */
export async function addPenaltyToJson(penalty: Omit<Penalty, 'seasonId' | 'id'>): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    await db.penalties.add({ ...penalty, seasonId })
    
    console.log(`✅ Neue Strafe für ${penalty.participantName} zur JSON-Datenquelle hinzugefügt`)
    
    return {
      success: true,
      message: `Strafe für ${penalty.participantName} erfolgreich hinzugefügt`
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Strafe:', error)
    return {
      success: false,
      message: `Fehler beim Hinzufügen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

/**
 * Löscht eine Strafe aus der JSON-Datenquelle
 */
export async function deletePenaltyFromJson(penaltyId: number): Promise<JsonDataUpdateResult> {
  try {
    const seasonId = await getActiveSeasonId()
    await assertSeasonWritable(seasonId)
    const penalty = await db.penalties.get(penaltyId)
    if (penalty && penalty.seasonId !== seasonId) {
      return { success: false, message: 'Strafe gehört nicht zur aktiven Staffel.' }
    }
    const penaltyName = penalty ? `${penalty.participantName} - ${penalty.reason}` : `ID ${penaltyId}`
    
    await db.penalties.delete(penaltyId)
    
    console.log(`✅ Strafe ${penaltyName} aus JSON-Datenquelle gelöscht`)
    
    return {
      success: true,
      message: `Strafe ${penaltyName} erfolgreich gelöscht`
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Strafe:', error)
    return {
      success: false,
      message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
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