/**
 * Katalog-Staffeln von /seasons.json (Server) – Auswahl & Import in IndexedDB.
 */

import { db, DatabaseUtils } from '@/lib/db'
import type { SeasonKind } from '@/types'
import { importJsonBundleForSeason } from '@/utils/jsonImport'
import {
  clearAllDataForSeason,
  createSeason,
  getActiveSeasonId,
  setActiveSeasonId
} from '@/services/seasonService'

export interface SeasonCatalogEntry {
  /** Eindeutiger Schlüssel = slug in IndexedDB */
  id: string
  title: string
  description?: string
  kind: SeasonKind
  readOnly: boolean
  /** Relativ zur Site-Root, z. B. /json/foo.json */
  dataUrl?: string
}

export interface SeasonCatalogFile {
  version: number
  entries: SeasonCatalogEntry[]
}

function parseJsonFromText<T>(text: string, label: string): T {
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) {
    throw new Error(
      `${label}: Es wurde HTML statt JSON geliefert. Häufig fehlt die Datei im Build oder eine SPA-Weiterleitung liefert index.html (z. B. seasons.json / json-Datei prüfen, Netlify _redirects).`
    )
  }
  try {
    return JSON.parse(text) as T
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`${label}: Ungültiges JSON (${msg})`)
  }
}

/**
 * Erwartet JSON; liefert eine verständliche Meldung, wenn stattdessen HTML (SPA-Fallback) kommt.
 */
async function parseJsonBody<T>(res: Response, label: string): Promise<T> {
  const text = await res.text()
  return parseJsonFromText<T>(text, label)
}

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

export async function fetchSeasonCatalog(): Promise<SeasonCatalogFile | null> {
  let res: Response
  try {
    res = await fetch('/seasons.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const data = await parseJsonBody<SeasonCatalogFile>(res, 'seasons.json')
  if (!data.entries || !Array.isArray(data.entries)) return null
  return data
}

/**
 * Legt die Staffel-Zeile an oder liefert die bestehende (gleicher slug = entry.id).
 */
export async function ensureSeasonRowFromCatalog(entry: SeasonCatalogEntry): Promise<number> {
  const existing = await db.seasons.where('slug').equals(entry.id).first()
  if (existing?.id != null) return existing.id

  const now = new Date()
  return db.seasons.add({
    slug: entry.id,
    title: entry.title,
    kind: entry.kind,
    readOnly: entry.readOnly,
    createdAt: now,
    updatedAt: now
  })
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
