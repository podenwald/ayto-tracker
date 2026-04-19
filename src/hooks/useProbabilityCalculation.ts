/**
 * Hook für Wahrscheinlichkeits-Berechnungen mit Caching
 * 
 * Features:
 * - Lädt Daten aus der Datenbank
 * - Prüft Cache (IndexedDB)
 * - Startet Berechnung im Web Worker
 * - Tracked Progress
 * - Speichert Ergebnisse im Cache
 * 
 * @example
 * ```tsx
 * const { result, status, triggerCalculation } = useProbabilityCalculation()
 * 
 * useEffect(() => {
 *   triggerCalculation()
 * }, [])
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ProbabilityResult,
  ProbabilityInput,
  ProbabilityCalculationStatus,
  Participant,
  MatchingNight,
  Matchbox,
  CeremonyConstraint,
  BoxDecision
} from '@/types'
import { db, DatabaseUtils } from '@/lib/db'
import { generateDataHash } from '@/services/probabilityService'

/**
 * Konvertiert Datenbank-Daten zu ProbabilityInput
 */
function convertToProbabilityInput(
  participants: Participant[],
  matchingNights: MatchingNight[],
  matchboxes: Matchbox[]
): ProbabilityInput {
  // DEBUG: Zeige alle Status-Werte
  console.log('🔍 Status-Analyse:', {
    alleStatus: participants.map(p => ({ 
      name: p.name, 
      status: p.status, 
      statusType: typeof p.status,
      active: p.active 
    })),
    uniqueStatus: [...new Set(participants.map(p => p.status))],
    anzahlProStatus: {
      aktiv: participants.filter(p => p.status === 'aktiv').length,
      Aktiv: participants.filter(p => p.status === 'Aktiv').length,
      'Perfekt Match': participants.filter(p => p.status === 'Perfekt Match').length,
      undefined: participants.filter(p => !p.status).length
    }
  })
  
  // KRITISCH: ALLE Kandidat*innen einbeziehen
  // Status kann sein: "aktiv", "Aktiv", "Perfekt Match", undefined
  // Wir schließen NUR explizit "Inaktiv" aus (oder benutzen das active Flag)
  const allParticipants = participants.filter(p => {
    // Option 1: Status-basiert (case-insensitive, inkl. undefined)
    const statusLower = p.status?.toLowerCase()
    const isNotInactive = statusLower !== 'inaktiv'
    
    // Option 2: Active-Flag-basiert (Fallback wenn status undefined)
    const isActiveByFlag = p.active !== false
    
    // Nehme alle, die entweder einen aktiven Status haben ODER das active Flag true ist
    return isNotInactive || isActiveByFlag
  })
  
  console.log('✅ Nach Filter:', {
    gesamt: participants.length,
    gefiltert: allParticipants.length,
    gefilterteNamen: allParticipants.map(p => p.name)
  })
  
  const men = allParticipants
    .filter(p => p.gender === 'M')
    .map(p => p.name)
  
  const women = allParticipants
    .filter(p => p.gender === 'F')
    .map(p => p.name)
  
  console.log('👥 Alle Kandidat*innen für Berechnung:', {
    männer: men.length,
    frauen: women.length,
    männerNamen: men,
    frauenNamen: women,
    alleStatus: participants.map(p => ({ name: p.name, status: p.status, active: p.active }))
  })
  
  // Verkaufte Matching Nights liefern keine Lichter-Erkenntnis → nicht in die Berechnung einbeziehen
  const matchingNightsSorted = [...matchingNights].sort((a, b) => {
    const dateA = a.ausstrahlungsdatum ? new Date(a.ausstrahlungsdatum).getTime() : new Date(a.createdAt).getTime()
    const dateB = b.ausstrahlungsdatum ? new Date(b.ausstrahlungsdatum).getTime() : new Date(b.createdAt).getTime()
    return dateA - dateB
  })
  const nightsForCalculation = matchingNightsSorted.filter(mn => mn.matchType !== 'sold')
  
  // DEBUG: Welche Kandidat*innen kommen in den Zeremonien vor?
  const participantsInCeremonies = new Set<string>()
  nightsForCalculation.forEach(night => {
    night.pairs.forEach(pair => {
      participantsInCeremonies.add(pair.woman)
      participantsInCeremonies.add(pair.man)
    })
  })
  
  console.log('🎭 Kandidat*innen in Zeremonien:', {
    gesamt: participantsInCeremonies.size,
    namen: Array.from(participantsInCeremonies),
    männerInCeremonies: men.filter(m => participantsInCeremonies.has(m)),
    frauenInCeremonies: women.filter(w => participantsInCeremonies.has(w)),
    männerNICHTInCeremonies: men.filter(m => !participantsInCeremonies.has(m)),
    frauenNICHTInCeremonies: women.filter(w => !participantsInCeremonies.has(w))
  })
  
  // Guard: Keine Kandidat*innen vorhanden
  if (allParticipants.length === 0) {
    console.warn('⚠️ Keine Kandidat*innen vorhanden!')
    return {
      men: [],
      women: [],
      ceremonies: [],
      boxDecisions: []
    }
  }
  
  // KRITISCH: Nur Kandidat*innen aus der LETZTEN Matching Night (mit Lichter-Info, keine verkauften)
  const lastNight = nightsForCalculation[nightsForCalculation.length - 1]
  
  if (!lastNight) {
    console.warn('⚠️ Keine Matching Nights mit Lichter-Info vorhanden!')
    return {
      men: [],
      women: [],
      ceremonies: [],
      boxDecisions: []
    }
  }
  
  const menInLastNight = new Set(lastNight.pairs.map(p => p.man))
  const womenInLastNight = new Set(lastNight.pairs.map(p => p.woman))
  
  const relevantMen = men.filter(m => menInLastNight.has(m))
  const relevantWomen = women.filter(w => womenInLastNight.has(w))
  
  console.log('🎯 Relevante Kandidat*innen für Berechnung (aus letzter Matching Night):', {
    relevantMen: relevantMen.length,
    relevantWomen: relevantWomen.length,
    menNames: relevantMen,
    womenNames: relevantWomen,
    ausgeschlossen: {
      männer: men.filter(m => !relevantMen.includes(m)),
      frauen: women.filter(w => !relevantWomen.includes(w))
    },
    hinweis: 'Ausgeschlossene haben bereits ihr Perfect Match gefunden'
  })
  
  // Konvertiere Matching Nights zu Constraints (nur Nights mit Lichter-Info, keine verkauften)
  const ceremonies: CeremonyConstraint[] = nightsForCalculation.map(night => {
    // Ermittle Perfect Matches die VOR dieser Matching Night bekannt waren
    const nightDate = night.ausstrahlungsdatum 
      ? new Date(`${night.ausstrahlungsdatum}T${night.ausstrahlungszeit || '00:00'}`)
      : new Date(night.createdAt)
    
    const knownPerfectMatches = matchboxes
      .filter(mb => mb.matchType === 'perfect')
      .filter(mb => {
        const boxDate = mb.ausstrahlungsdatum
          ? new Date(`${mb.ausstrahlungsdatum}T${mb.ausstrahlungszeit || '00:00'}`)
          : new Date(mb.createdAt)
        
        // Perfect Match muss VOR der Matching Night bekannt gewesen sein
        return boxDate < nightDate
      })
      .map(mb => ({ woman: mb.woman, man: mb.man }))
    
    // WICHTIG: Verwende die Paare wie sie sind!
    // countCorrectPairs zählt nur die Paare, die in night.pairs vorkommen
    // Das ist automatisch korrekt für jede Zeremonie
    return {
      pairs: night.pairs, // NICHT filtern!
      correctCount: night.totalLights || 0,
      knownPerfectMatches
    }
  })
  
  // Konvertiere Matchboxes zu Decisions
  const boxDecisions: BoxDecision[] = matchboxes
    .filter(mb => mb.matchType === 'perfect' || mb.matchType === 'no-match')
    .map(mb => ({
      woman: mb.woman,
      man: mb.man,
      isPerfectMatch: mb.matchType === 'perfect'
    }))
  
  return {
    men: relevantMen,
    women: relevantWomen,
    ceremonies,
    boxDecisions
  }
}

/**
 * Return-Typ des Hooks
 */
interface UseProbabilityCalculationReturn {
  result: ProbabilityResult | null
  status: ProbabilityCalculationStatus
  triggerCalculation: () => Promise<void>
  clearCache: () => Promise<void>
}

/**
 * Hook für Wahrscheinlichkeits-Berechnungen
 */
export function useProbabilityCalculation(): UseProbabilityCalculationReturn {
  const [result, setResult] = useState<ProbabilityResult | null>(null)
  const [status, setStatus] = useState<ProbabilityCalculationStatus>({
    isCalculating: false,
    progress: 0,
    currentStep: 'Bereit'
  })
  
  const workerRef = useRef<Worker | null>(null)
  
  // Cleanup Worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])
  
  /**
   * Startet die Wahrscheinlichkeits-Berechnung
   */
  const triggerCalculation = useCallback(async () => {
    console.log('🚀 triggerCalculation aufgerufen')
    
    try {
      setStatus({
        isCalculating: true,
        progress: 0,
        currentStep: 'Lade Daten...'
      })
      
      console.log('📊 Lade Daten aus Datenbank...')
      
      const { getActiveSeasonId } = await import('@/services/seasonService')
      const seasonId = await getActiveSeasonId()

      // Schritt 1: Daten der aktiven Staffel laden
      const [participants, matchingNights, matchboxes] = await Promise.all([
        db.participants.where('seasonId').equals(seasonId).toArray(),
        db.matchingNights.where('seasonId').equals(seasonId).toArray(),
        db.matchboxes.where('seasonId').equals(seasonId).toArray()
      ])
      
      console.log('✅ Daten geladen:', {
        participants: participants.length,
        matchingNights: matchingNights.length,
        matchboxes: matchboxes.length
      })
      
      // Schritt 2: Zu ProbabilityInput konvertieren
      const input = convertToProbabilityInput(participants, matchingNights, matchboxes)
      
      // Guard: Keine Kandidat*innen
      if (input.men.length === 0 || input.women.length === 0) {
        setResult(null) // Ergebnis zurücksetzen
        setStatus({
          isCalculating: false,
          progress: 0,
          currentStep: 'Keine Daten vorhanden',
          error: participants.length === 0 
            ? 'Keine Kandidat*innen vorhanden. Bitte zuerst Kandidat*innen im Admin-Panel hinzufügen.'
            : matchingNights.length === 0
            ? 'Keine Matching Nights vorhanden. Bitte zuerst Matching Nights hinzufügen.'
            : 'Nicht genügend Kandidat*innen für Berechnung vorhanden.'
        })
        return
      }
      
      // Guard: Keine Matching Nights
      if (input.ceremonies.length === 0) {
        setResult(null) // Ergebnis zurücksetzen
        setStatus({
          isCalculating: false,
          progress: 0,
          currentStep: 'Keine Matching Nights vorhanden',
          error: 'Keine Matching Nights vorhanden. Bitte zuerst Matching Nights hinzufügen.'
        })
        return
      }
      
      // Schritt 3: Hash generieren und Cache prüfen
      const dataHash = generateDataHash(input)
      
      setStatus({
        isCalculating: true,
        progress: 5,
        currentStep: 'Prüfe Cache...'
      })
      
      const cachedResult = await DatabaseUtils.getProbabilityCache(dataHash)
      
      console.log('🔍 Cache-Prüfung:', {
        dataHash,
        cachedResult: cachedResult ? 'GEFUNDEN (wird verwendet)' : 'NICHT GEFUNDEN (neue Berechnung)',
        cachedResultData: cachedResult
      })
      
      if (cachedResult) {
        // Cache-Hit: Verwende gecachtes Ergebnis
        console.log('✅ Verwende Cache-Ergebnis:', cachedResult.result)
        setResult(cachedResult.result)
        setStatus({
          isCalculating: false,
          progress: 100,
          currentStep: 'Aus Cache geladen'
        })
        return
      }
      
      // Schritt 4: Cache-Miss - Starte Web Worker Berechnung
      setStatus({
        isCalculating: true,
        progress: 10,
        currentStep: 'Starte Berechnung...'
      })
      
      // Inline Worker mit dynamischem Import
      // Alternativ: Worker aus separater Datei laden
      const calculationResult = await calculateWithWorker(input, (progress, step) => {
        setStatus({
          isCalculating: true,
          progress,
          currentStep: step
        })
      })
      
      // Schritt 5: Ergebnis im Cache speichern
      await DatabaseUtils.saveProbabilityCache({
        seasonId,
        dataHash,
        result: calculationResult,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      // Schritt 6: State aktualisieren
      setResult(calculationResult)
      setStatus({
        isCalculating: false,
        progress: 100,
        currentStep: 'Berechnung abgeschlossen'
      })
      
    } catch (error) {
      console.error('Fehler bei der Wahrscheinlichkeits-Berechnung:', error)
      setResult(null) // Ergebnis zurücksetzen bei Fehler
      setStatus({
        isCalculating: false,
        progress: 0,
        currentStep: 'Fehler',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Berechnung'
      })
    }
  }, [])
  
  /**
   * Löscht den Cache und setzt das Ergebnis zurück
   */
  const clearCache = useCallback(async () => {
    await DatabaseUtils.clearProbabilityCache()
    setResult(null)
    setStatus({
      isCalculating: false,
      progress: 0,
      currentStep: 'Cache gelöscht'
    })
  }, [])
  
  return {
    result,
    status,
    triggerCalculation,
    clearCache
  }
}

/**
 * Führt die Berechnung im Web Worker aus
 * 
 * Da Vite/Rollup Worker-Imports speziell behandelt, verwenden wir hier
 * eine Fallback-Lösung mit direktem Import des Service
 */
async function calculateWithWorker(
  input: ProbabilityInput,
  onProgress: (progress: number, step: string) => void
): Promise<ProbabilityResult> {
  // Für jetzt: Direkter Import ohne Worker
  // TODO: Worker-Integration mit Vite Plugin
  const { calculateProbabilities } = await import('@/services/probabilityService')
  return calculateProbabilities(input, onProgress)
  
  // Alternative mit Worker (wenn Vite korrekt konfiguriert):
  /*
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('@/workers/probabilityWorker.ts', import.meta.url),
      { type: 'module' }
    )
    
    worker.onmessage = (event) => {
      const message = event.data
      
      switch (message.type) {
        case 'progress':
          onProgress(message.progress, message.step)
          break
        case 'result':
          worker.terminate()
          resolve(message.result)
          break
        case 'error':
          worker.terminate()
          reject(new Error(message.error))
          break
      }
    }
    
    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }
    
    worker.postMessage({ type: 'calculate', input })
  })
  */
}

