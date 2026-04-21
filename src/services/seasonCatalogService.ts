/**
 * Katalog-Staffeln von /seasons.json (Server) – Auswahl & Import in IndexedDB.
 */

import { db, DatabaseUtils } from '@/lib/db'
import { importJsonBundleForSeason } from '@/utils/jsonImport'
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

  const hasData = (await db.participants.where('seasonId').equals(seasonId).count()) > 0
  if (hasData) {
    return
  }

  const text = await fetchCatalogDataText(entry.dataUrl)
  const raw: unknown = parseJsonFromText<unknown>(text, entry.dataUrl)
  await importJsonBundleForSeason(seasonId, raw, {
    skipWritableCheck: entry.readOnly === true
  })
  await DatabaseUtils.setMetaValue(catalogBundleMetaKey(entry.id), await hashJsonPayload(text))
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

  const [participantsCount, matchingNightsCount, matchboxesCount, penaltiesCount] = await Promise.all([
    db.participants.where('seasonId').equals(activeSeasonId).count(),
    db.matchingNights.where('seasonId').equals(activeSeasonId).count(),
    db.matchboxes.where('seasonId').equals(activeSeasonId).count(),
    db.penalties.where('seasonId').equals(activeSeasonId).count()
  ])

  const hasAnyData = participantsCount + matchingNightsCount + matchboxesCount + penaltiesCount > 0

  const text = await fetchCatalogDataText(entry.dataUrl)
  const nextHash = await hashJsonPayload(text)
  const metaKey = catalogBundleMetaKey(entry.id)
  const storedHash = await DatabaseUtils.getMetaValue(metaKey)
  const storedHashStr = typeof storedHash === 'string' ? storedHash : null

  if (entry.readOnly === true) {
    if (storedHashStr === nextHash) {
      return
    }
    const raw: unknown = parseJsonFromText<unknown>(text, entry.dataUrl)
    await importJsonBundleForSeason(activeSeasonId, raw, {
      skipWritableCheck: true
    })
    await DatabaseUtils.setMetaValue(metaKey, nextHash)
    return
  }

  if (hasAnyData) {
    return
  }

  const raw: unknown = parseJsonFromText<unknown>(text, entry.dataUrl)
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
