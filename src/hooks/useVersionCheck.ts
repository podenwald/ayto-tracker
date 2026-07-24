/**
 * Custom Hook für Versions-Check
 *
 * Startet die tägliche Hintergrundprüfung auf eine neue App-Version
 * (unbemerkter Reload bei Bedarf) und initialisiert die Versionsverwaltung.
 * Das "neue Version gesehen"-Signal für die UI (z. B. UpdateInfoBox) wird
 * unabhängig davon direkt über versionCheck.ts ermittelt.
 */

import { useEffect } from 'react'
import { initializeVersionCheck, checkAndApplyBackgroundUpdate } from '@/utils/versionCheck'

/** Intervall, in dem geprüft wird, ob die tägliche Hintergrundprüfung fällig ist */
const POLL_TICK_MS = 60 * 60 * 1000 // stündlich prüfen, ob 24h seit letztem Check vergangen sind

export function useVersionCheck(): void {
  useEffect(() => {
    initializeVersionCheck()

    checkAndApplyBackgroundUpdate()
    const intervalId = window.setInterval(checkAndApplyBackgroundUpdate, POLL_TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [])
}
