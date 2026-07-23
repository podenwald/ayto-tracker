/**
 * Katalog-Staffeln von /seasons.json (Server) – Auswahl & Import in IndexedDB.
 */

import { db, DatabaseUtils } from '@/lib/db'
import { importJsonBundleForSeason, parseRawJsonToImportData } from '@/utils/jsonImport'
import {
  clearAllDataForSeason,
  createSeason,
  getActiveSeasonId,
  setActiveSeasonId
} from '@/services/seasonService'
import {
  fetchSeasonCatalog,
  ensureSeasonRowFromCatalog,
  parseJsonFromText,
  type SeasonCatalogEntry,
  type SeasonCatalogFile
} from '@/services/seasonCatalogCore'

export type { SeasonCatalogEntry, SeasonCatalogFile }
export { fetchSeasonCatalog, ensureSeasonRowFromCatalog, parseJsonFromText }

function catalogBundleMetaKey(catalogEntryId: string): string {
  return `catalogBundleSha256:${catalogEntryId}`
}

async function getSeasonEntityCounts(seasonId: number): Promise<{
  participants: number
  matchingNights: number
  matchboxes: number
  penalties: number
}> {
  const [participants, matchingNights, matchboxes, penalties] = await Promise.all([
    db.participants.where('seasonId').equals(seasonId).count(),
    db.matchingNights.where('seasonId').equals(seasonId).count(),
    db.matchboxes.where('seasonId').equals(seasonId).count(),
    db.penalties.where('seasonId').equals(seasonId).count()
  ])
  return { participants, matchingNights, matchboxes, penalties }
}

function isSeasonSnapshotComplete(
  current: { participants: number; matchingNights: number; matchboxes: number; penalties: number },
  expected: { participants: number; matchingNights: number; matchboxes: number; penalties: number }
): boolean {
  return (
    current.participants === expected.participants &&
    current.matchingNights === expected.matchingNights &&
    current.matchboxes === expected.matchboxes &&
    current.penalties === expected.penalties
  )
}

async function hashJsonPayload(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = (h * 33) ^ text.charCodeAt(i)
  }
  return `djb2:${(h >>> 0).toString(16)}`
}

async function fetchCatalogDataText(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Daten konnten nicht geladen werden (${dataUrl}): ${res.status}`)
  }
  return await res.text()
}

/**
 * Katalog-Eintrag aktivieren: Staffel anlegen/öffnen, optional JSON einmalig laden.
 */
export async function activateCatalogEntry(entry: SeasonCatalogEntry): Promise<void> {
  const seasonId = await ensureSeasonRowFromCatalog(entry)
  await setActiveSeasonId(seasonId)

  if (!entry.dataUrl?.trim()) {
    await clearAllDataForSeason(seasonId)
    return
  }

  const counts = await getSeasonEntityCounts(seasonId)
  const hasData = counts.participants + counts.matchingNights + counts.matchboxes + counts.penalties > 0

  const text = await fetchCatalogDataText(entry.dataUrl)
  const nextHash = await hashJsonPayload(text)
  const raw: unknown = parseJsonFromText<unknown>(text, entry.dataUrl)
  const bundle = parseRawJsonToImportData(raw)
  const expectedCounts = {
    participants: bundle.participants.length,
    matchingNights: bundle.matchingNights.length,
    matchboxes: bundle.matchboxes.length,
    penalties: bundle.penalties.length
  }
  const metaKey = catalogBundleMetaKey(entry.id)
  const storedHash = await DatabaseUtils.getMetaValue(metaKey)
  const storedHashStr = typeof storedHash === 'string' ? storedHash : null

  if (entry.readOnly === true) {
    if (storedHashStr === nextHash && isSeasonSnapshotComplete(counts, expectedCounts)) {
      return
    }
    await importJsonBundleForSeason(seasonId, raw, {
      skipWritableCheck: true
    })
    await DatabaseUtils.setMetaValue(metaKey, nextHash)
    return
  }

  if (hasData) {
    return
  }

  await importJsonBundleForSeason(seasonId, raw, {
    skipWritableCheck: false
  })
  await DatabaseUtils.setMetaValue(metaKey, nextHash)
}

/**
 * Stellt beim App-Start sicher, dass die aktuell aktive Katalog-Staffel die passenden JSON-Daten hat.
 * - Nur-Lesen-Katalog: bei geänderter JSON-Datei (SHA-256) erneut importieren.
 * - Bearbeitbare Staffel: nur Erstimport, wenn lokal noch leer (kein Überschreiben von Nutzerdaten).
 */
export async function ensureActiveSeasonCatalogDataLoaded(): Promise<void> {
  const activeSeasonId = await getActiveSeasonId()
  const activeSeason = await db.seasons.get(activeSeasonId)
  if (!activeSeason) return

  const catalog = await fetchSeasonCatalog()
  const entry = catalog?.entries.find(item => item.id === activeSeason.slug)
  if (!entry?.dataUrl?.trim()) return

  const counts = await getSeasonEntityCounts(activeSeasonId)

  const hasAnyData = counts.participants + counts.matchingNights + counts.matchboxes + counts.penalties > 0

  const text = await fetchCatalogDataText(entry.dataUrl)
  const nextHash = await hashJsonPayload(text)
  const raw: unknown = parseJsonFromText<unknown>(text, entry.dataUrl)
  const bundle = parseRawJsonToImportData(raw)
  const expectedCounts = {
    participants: bundle.participants.length,
    matchingNights: bundle.matchingNights.length,
    matchboxes: bundle.matchboxes.length,
    penalties: bundle.penalties.length
  }
  const metaKey = catalogBundleMetaKey(entry.id)
  const storedHash = await DatabaseUtils.getMetaValue(metaKey)
  const storedHashStr = typeof storedHash === 'string' ? storedHash : null

  if (entry.readOnly === true) {
    const isCompleteSnapshot = isSeasonSnapshotComplete(counts, expectedCounts)

    if (storedHashStr === nextHash && isCompleteSnapshot) {
      return
    }
    await importJsonBundleForSeason(activeSeasonId, raw, {
      skipWritableCheck: true
    })
    await DatabaseUtils.setMetaValue(metaKey, nextHash)
    return
  }

  if (hasAnyData) {
    return
  }

  await importJsonBundleForSeason(activeSeasonId, raw, {
    skipWritableCheck: false
  })
  await DatabaseUtils.setMetaValue(metaKey, nextHash)
}

/**
 * Neue leere, bearbeitbare Staffel anlegen und aktivieren.
 */
export async function createAndActivateEmptySeason(title?: string): Promise<number> {
  const id = await createSeason({
    title: title?.trim() || `Neue Staffel ${new Date().toLocaleDateString('de-DE')}`,
    kind: 'custom',
    readOnly: false
  })
  await setActiveSeasonId(id)
  await clearAllDataForSeason(id)
  return id
}

export async function getActiveSeasonSummary(): Promise<{ id: number; title: string; readOnly: boolean } | null> {
  try {
    const sid = await getActiveSeasonId()
    const row = await db.seasons.get(sid)
    if (!row?.id) return null
    let resolvedTitle = row.title

    // Wenn die aktive Staffel im Server-Katalog existiert, nutze konsequent den Katalogtitel.
    // So bleibt die UI-Bezeichnung stabil und folgt seasons.json.
    const catalog = await fetchSeasonCatalog()
    const catalogEntry = catalog?.entries.find(entry => entry.id === row.slug)
    if (catalogEntry?.title?.trim()) {
      resolvedTitle = catalogEntry.title.trim()
    }

    return { id: row.id, title: resolvedTitle, readOnly: row.readOnly === true }
  } catch {
    return null
  }
}
