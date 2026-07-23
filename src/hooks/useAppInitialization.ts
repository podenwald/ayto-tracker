/**
 * Custom Hook für die App-Initialisierung
 * 
 * Kapselt die gesamte Bootstrap-Logik und Datenbank-Initialisierung.
 * Folgt dem Single Responsibility Principle.
 */

import { useEffect, useState } from 'react'
import { DatabaseUtils } from '@/lib/db'
import { ensureActiveSeasonCatalogDataLoaded } from '@/services/seasonCatalogService'

interface UseAppInitializationResult {
  isInitializing: boolean
  initError: string | null
}

/**
 * Hook für die App-Initialisierung
 * 
 * Verantwortlichkeiten:
 * - Prüfung, ob Datenbank initialisiert ist
 * - Kein automatisches Laden von Seed-Daten
 */
export function useAppInitialization(): UseAppInitializationResult {
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('🚀 Starte App-Initialisierung...')
        
        // Prüfe nur, ob Datenbank initialisiert ist
        const isEmpty = await DatabaseUtils.isEmpty()
        
        if (isEmpty) {
          console.log('📭 Datenbank ist leer - keine automatische Datenladung')
        } else {
          console.log('✅ Datenbank bereits initialisiert')
        }

        // Sicherstellen, dass bei aktiver Katalog-Staffel die initialen JSON-Daten lokal vorhanden sind.
        // Lädt nur, wenn die aktive Staffel noch keine lokalen Daten enthält.
        await ensureActiveSeasonCatalogDataLoaded()
        
        console.log('✅ App-Initialisierung abgeschlossen')
      } catch (err: unknown) {
        console.error('❌ Bootstrap-Fehler:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Initialisieren'
        setInitError(errorMessage)
      } finally {
        setIsInitializing(false)
      }
    }

    bootstrap()
  }, [])

  return { isInitializing, initError }
}

