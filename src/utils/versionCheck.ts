import { getDisplayVersion } from './version'

const VERSION_STORAGE_KEY = 'ayto-last-version'
const LAST_POLL_KEY = 'ayto-version-last-poll'

/** Wie oft im Hintergrund auf eine neue Version geprüft wird (einmal täglich) */
const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface VersionCheckResult {
  isNewVersion: boolean
  lastVersion: string | null
  currentVersion: string
}

/**
 * Überprüft, ob sich die (bereits geladene) Version seit dem letzten Besuch geändert hat.
 * Erkennt eine neue Version erst NACH einem Reload, der den neuen Build lädt.
 */
export function checkVersionChange(): VersionCheckResult {
  const currentVersion = getDisplayVersion()
  const lastVersion = localStorage.getItem(VERSION_STORAGE_KEY)
  const isNewVersion = lastVersion !== null && lastVersion !== currentVersion

  return { isNewVersion, lastVersion, currentVersion }
}

/**
 * Speichert die aktuelle Version als letzte bekannte Version.
 * Markiert damit eine erkannte neue Version als "gesehen".
 */
export function saveCurrentVersion(): void {
  localStorage.setItem(VERSION_STORAGE_KEY, getDisplayVersion())
}

/**
 * Initialisiert die Versionsverwaltung beim App-Start (merkt sich die Version beim ersten Besuch)
 */
export function initializeVersionCheck(): VersionCheckResult {
  const result = checkVersionChange()

  if (result.lastVersion === null) {
    saveCurrentVersion()
  }

  return result
}

/** Prüft, ob seit der letzten Hintergrundprüfung genug Zeit vergangen ist (einmal täglich) */
function shouldPollForNewVersion(): boolean {
  const lastPoll = localStorage.getItem(LAST_POLL_KEY)
  if (!lastPoll) return true
  return Date.now() - Number(lastPoll) >= POLL_INTERVAL_MS
}

function markPolled(): void {
  localStorage.setItem(LAST_POLL_KEY, String(Date.now()))
}

/** Fragt die tatsächlich auf dem Server ausgelieferte Version ab (Cache-umgehend) */
async function fetchServerVersion(): Promise<string | null> {
  try {
    const response = await fetch(`/manifest.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return null
    const manifest = await response.json()
    return typeof manifest.version === 'string' ? manifest.version : null
  } catch {
    return null
  }
}

/**
 * Prüft im Hintergrund (höchstens einmal täglich), ob eine neue Version auf dem Server liegt,
 * und lädt die Seite bei Bedarf unbemerkt neu. Das eigentliche "neue Version"-Signal für die UI
 * entsteht danach ganz normal über checkVersionChange() beim nächsten Start mit dem neuen Build.
 */
export async function checkAndApplyBackgroundUpdate(): Promise<void> {
  if (!shouldPollForNewVersion()) return
  markPolled()

  const serverVersion = await fetchServerVersion()
  if (!serverVersion) return

  if (serverVersion !== getDisplayVersion()) {
    window.location.reload()
  }
}
