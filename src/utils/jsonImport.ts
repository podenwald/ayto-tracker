import { db, type Participant, type Matchbox, type MatchingNight, type Penalty, type BroadcastNote } from '../lib/db'
import { assertSeasonWritable, clearAllDataForSeason, getActiveSeasonId } from '@/services/seasonService'

// Interface für die JSON-Import-Daten
export interface JsonImportData {
  participants: Participant[]
  matchboxes: (Matchbox | { womanId: string; manId: string; [key: string]: any })[]
  matchingNights: MatchingNight[]
  penalties: Penalty[]
  broadcastNotes?: BroadcastNote[]
}

/**
 * Parst rohes JSON (Array oder Objekt mit participants) zu JsonImportData
 */
export function parseRawJsonToImportData(rawData: unknown): JsonImportData {
  if (Array.isArray(rawData)) {
    console.log(`📥 JSON im Array-Format erkannt (${rawData.length} Teilnehmer)`)
    return {
      participants: rawData as Participant[],
      matchboxes: [],
      matchingNights: [],
      penalties: []
    }
  }
  if (rawData && typeof rawData === 'object' && 'participants' in rawData) {
    console.log('📥 JSON im Objekt-Format erkannt')
    return rawData as JsonImportData
  }
  throw new Error(
    'Ungültiges JSON-Format: Erwartet wird entweder ein Array von Teilnehmern oder ein Objekt mit participants, matchboxes, etc.'
  )
}

export type ImportJsonBundleOptions = {
  /** z. B. Erstimport einer nur-lesenden Katalog-Staffel (kein assertSeasonWritable) */
  skipWritableCheck?: boolean
}

/**
 * Importiert ein JSON-Bündel in eine konkrete Staffel (leert die Staffel zuvor).
 */
export async function importJsonBundleForSeason(
  seasonId: number,
  rawData: unknown,
  options?: ImportJsonBundleOptions
): Promise<void> {
  if (!options?.skipWritableCheck) {
    await assertSeasonWritable(seasonId)
  }

  const jsonData = parseRawJsonToImportData(rawData)
  await clearAllDataForSeason(seasonId)

  await db.transaction('rw', [db.participants, db.matchboxes, db.matchingNights, db.penalties, db.broadcastNotes], async () => {
    if (jsonData.participants && jsonData.participants.length > 0) {
      const normalizedParticipants = jsonData.participants.map((participant: any) => {
          // Gender-Mapping: w/m -> F/M
          let gender = participant.gender
          if (gender === 'w' || gender === 'weiblich' || gender === 'female') {
            gender = 'F'
          } else if (gender === 'm' || gender === 'männlich' || gender === 'male') {
            gender = 'M'
          }
          
          // Status normalisieren (aktiv -> Aktiv, etc.)
          let status = participant.status || 'Aktiv'
          if (typeof status === 'string') {
            const statusLower = status.toLowerCase()
            if (statusLower === 'aktiv' || statusLower === 'active') {
              status = 'Aktiv'
            } else if (statusLower === 'inaktiv' || statusLower === 'inactive') {
              status = 'Inaktiv'
            } else if (statusLower === 'perfekt match' || statusLower === 'perfect match') {
              status = 'Perfekt Match'
            }
          }
          
          // Stelle sicher, dass alle erforderlichen Felder vorhanden sind
          return {
            seasonId,
            name: participant.name || 'Unbekannt',
            knownFrom: participant.knownFrom || '',
            age: participant.age ? parseInt(participant.age.toString(), 10) : undefined,
            status: status,
            active: participant.active !== false, // Default: aktiv
            photoUrl: participant.photoUrl || '',
            source: participant.source || '',
            bio: participant.bio || '',
            gender: gender || 'F', // Default: weiblich falls unbekannt
            socialMediaAccount: participant.socialMediaAccount || '',
            freeProfilePhotoUrl: participant.freeProfilePhotoUrl || '',
            // ID beibehalten, falls vorhanden
            ...(participant.id && { id: participant.id })
          }
        })
        
        console.log(`✅ ${normalizedParticipants.length} Teilnehmer normalisiert und bereit zum Import`)
        await db.participants.bulkPut(normalizedParticipants)
      }
      
      if (jsonData.matchboxes && jsonData.matchboxes.length > 0) {
        // Transformiere Matchbox-Daten: womanId/manId -> woman/man
        const transformedMatchboxes = jsonData.matchboxes.map((matchbox: any) => ({
          ...matchbox,
          seasonId,
          woman: matchbox.womanId || matchbox.woman,
          man: matchbox.manId || matchbox.man,
          // Entferne die alten Felder
          womanId: undefined,
          manId: undefined,
          // Stelle sicher, dass createdAt und updatedAt gesetzt sind
          createdAt: matchbox.createdAt ? new Date(matchbox.createdAt) : new Date(),
          updatedAt: matchbox.updatedAt ? new Date(matchbox.updatedAt) : new Date()
        }))
        await db.matchboxes.bulkPut(transformedMatchboxes)
      }
      
      if (jsonData.matchingNights && jsonData.matchingNights.length > 0) {
        // Transformiere Matching Night-Daten
        const transformedMatchingNights = jsonData.matchingNights.map((matchingNight: any) => ({
          ...matchingNight,
          seasonId,
          // Stelle sicher, dass createdAt gesetzt ist
          createdAt: matchingNight.createdAt ? new Date(matchingNight.createdAt) : new Date()
        }))
        await db.matchingNights.bulkPut(transformedMatchingNights)
      }
      
      if (jsonData.penalties && jsonData.penalties.length > 0) {
        // Transformiere Penalty-Daten
        const transformedPenalties = jsonData.penalties.map((penalty: any) => ({
          ...penalty,
          seasonId,
          // Stelle sicher, dass createdAt gesetzt ist
          createdAt: penalty.createdAt ? new Date(penalty.createdAt) : new Date()
        }))
        await db.penalties.bulkPut(transformedPenalties)
      }
      
      if (jsonData.broadcastNotes && jsonData.broadcastNotes.length > 0) {
        // Transformiere Broadcast Notes-Daten
        const transformedBroadcastNotes = jsonData.broadcastNotes.map((note: any) => ({
          ...note,
          seasonId,
          // Stelle sicher, dass createdAt und updatedAt gesetzt sind
          createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
          updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date()
        }))
        await db.broadcastNotes.bulkPut(transformedBroadcastNotes)
      }
    })

  const [participantsCount, matchboxesCount, matchingNightsCount, penaltiesCount] = await Promise.all([
    db.participants.where('seasonId').equals(seasonId).count(),
    db.matchboxes.where('seasonId').equals(seasonId).count(),
    db.matchingNights.where('seasonId').equals(seasonId).count(),
    db.penalties.where('seasonId').equals(seasonId).count()
  ])

  console.log(`✅ JSON in Staffel ${seasonId} importiert:`)
  console.log(`   📊 ${participantsCount} Teilnehmer, ${matchboxesCount} Matchboxes, ${matchingNightsCount} MN, ${penaltiesCount} Strafen`)
}

/**
 * Lädt eine spezifische JSON-Datei und importiert die Daten in die Datenbank
 * @param fileName - Der Name der JSON-Datei (z.B. "ayto-complete-export-2025-09-08.json")
 * @param version - Die Version für die neue JSON-Datei (z.B. "0.2.1")
 * @returns Promise<boolean> - true wenn erfolgreich, false bei Fehler
 */
export async function importJsonDataForVersion(fileName: string, version: string): Promise<boolean> {
  try {
    const response = await fetch(`/json/${fileName}?t=${Date.now()}`, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der JSON-Datei ${fileName}: ${response.statusText}`)
    }

    const rawData: unknown = await response.json()
    const seasonId = await getActiveSeasonId()
    await importJsonBundleForSeason(seasonId, rawData)

    console.log(`✅ JSON-Daten erfolgreich für Version ${version} importiert`)
    return true
  } catch (error) {
    console.error('❌ Fehler beim Importieren der JSON-Daten:', error)
    console.error('Fehler-Details:', error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Erstellt eine neue Version mit JSON-Import
 * @param fileName - Der Name der JSON-Datei
 * @param version - Die neue Versionsnummer
 * @returns Promise<boolean> - true wenn erfolgreich
 */
export async function createVersionWithJsonImport(fileName: string, version: string): Promise<boolean> {
  try {
    // 1. JSON-Daten importieren
    const importSuccess = await importJsonDataForVersion(fileName, version)
    
    if (!importSuccess) {
      throw new Error('JSON-Import fehlgeschlagen')
    }
    
    // 2. Version-Info aktualisieren (wird normalerweise vom Build-Script gemacht)
    console.log(`✅ Version ${version} mit JSON-Import aus ${fileName} erfolgreich erstellt`)
    return true
    
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen der Version ${version} mit ${fileName}:`, error)
    return false
  }
}

/**
 * Exportiert den aktuellen Datenbankstand und macht ihn für alle verfügbar
 * @returns Promise<{success: boolean, fileName?: string, error?: string}>
 */
export async function exportCurrentDatabaseState(): Promise<{success: boolean, fileName?: string, error?: string}> {
  try {
    const sid = await getActiveSeasonId()
    const [participantsData, matchingNightsData, matchboxesData, penaltiesData, broadcastNotesData] = await Promise.all([
      db.participants.where('seasonId').equals(sid).toArray(),
      db.matchingNights.where('seasonId').equals(sid).toArray(),
      db.matchboxes.where('seasonId').equals(sid).toArray(),
      db.penalties.where('seasonId').equals(sid).toArray(),
      db.broadcastNotes.where('seasonId').equals(sid).toArray()
    ])
    
    // Matchbox-Daten für Export verwenden (keine Transformation mehr nötig)
    const transformedMatchboxes = matchboxesData.map(m => ({
      id: m.id,
      seasonId: m.seasonId,
      woman: m.woman,
      man: m.man,
      matchType: m.matchType,
      price: m.price,
      buyer: m.buyer,
      ausstrahlungsdatum: m.ausstrahlungsdatum,
      ausstrahlungszeit: m.ausstrahlungszeit,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }))
    
    // Komplette Datenstruktur erstellen
    const allData: JsonImportData = {
      participants: participantsData,
      matchingNights: matchingNightsData,
      matchboxes: transformedMatchboxes,
      penalties: penaltiesData,
      broadcastNotes: broadcastNotesData
    }
    
    // Dateiname mit aktuellem Datum erstellen
    const today = new Date().toISOString().split('T')[0]
    const fileName = `ayto-complete-export-${today}.json`
    
    // JSON-String erstellen
    const jsonString = JSON.stringify(allData, null, 2)
    
    // Blob erstellen und Download auslösen
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    
    // Index.json aktualisieren (simuliert - in echter App würde das über Server passieren)
    await updateIndexJson(fileName)
    
    const totalItems = participantsData.length + matchingNightsData.length + matchboxesData.length + penaltiesData.length + broadcastNotesData.length
    console.log(`✅ Datenbankstand exportiert: ${fileName}`)
    console.log(`📊 ${participantsData.length} Teilnehmer, ${matchingNightsData.length} Matching Nights, ${matchboxesData.length} Matchboxes, ${penaltiesData.length} Strafen, ${broadcastNotesData.length} Notizen`)
    console.log(`📈 Gesamt: ${totalItems} Einträge`)
    
    return { success: true, fileName }
    
  } catch (error) {
    console.error('❌ Fehler beim Exportieren des Datenbankstands:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    }
  }
}

/**
 * Aktualisiert die index.json mit der neuesten Export-Datei
 * @param fileName - Name der neuen Export-Datei
 */
async function updateIndexJson(fileName: string): Promise<void> {
  try {
    // Lade aktuelle index.json
    const response = await fetch('/json/index.json')
    let currentFiles: string[] = []
    
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        currentFiles = data
      }
    }
    
    // Neue Datei hinzufügen, falls nicht bereits vorhanden
    if (!currentFiles.includes(fileName)) {
      currentFiles.unshift(fileName) // An den Anfang der Liste setzen
      
      // Nur die neuesten 5 Dateien behalten
      currentFiles = currentFiles.slice(0, 5)
      
      console.log(`📝 Index.json würde aktualisiert werden mit:`, currentFiles)
      console.log(`ℹ️ In einer echten App würde hier die index.json auf dem Server aktualisiert werden`)
    }
  } catch (error) {
    console.warn('⚠️ Konnte index.json nicht aktualisieren:', error)
  }
}

/**
 * Lädt verfügbare JSON-Dateien dynamisch
 * @returns Promise<string[]> - Liste der verfügbaren JSON-Dateien
 */
export async function getAvailableJsonFiles(): Promise<string[]> {
  try {
    // Optionales Manifest unter /public/json/index.json verwenden (nur akzeptieren, wenn JSON)
    const manifestResponse = await fetch('/json/index.json', { cache: 'no-store' })
    if (manifestResponse.ok) {
      const manifestType = manifestResponse.headers.get('content-type') || ''
      if (!manifestType.includes('application/json')) {
        console.warn('Manifest /json/index.json hat unerwarteten Content-Type:', manifestType)
      } else {
        const files: unknown = await manifestResponse.json()
      if (Array.isArray(files)) {
        // Nur tatsächlich erreichbare JSON-Dateien zurückgeben (Content-Type prüfen)
        const checks = await Promise.all(files.map(async (name) => {
          try {
            if (typeof name !== 'string') return null
            const url = `/json/${name}`
            const res = await fetch(url, { cache: 'no-store' })
            if (!res.ok) return null
            const type = res.headers.get('content-type') || ''
            return type.includes('application/json') ? name : null
          } catch {
            return null
          }
        }))
        return checks.filter((n): n is string => Boolean(n))
      }
      }
    }

    // Kein Manifest vorhanden oder ungültig → keine Liste anzeigen, um Phantom-Dateien zu vermeiden
    return []
  } catch (error) {
    console.error('Fehler beim Laden der verfügbaren JSON-Dateien:', error)
    return []
  }
}
