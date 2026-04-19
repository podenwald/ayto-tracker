/**
 * Katalog-Staffeln von /seasons.json (Server) – Auswahl & Import in IndexedDB.
 */

import { db } from '@/lib/db'
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

export async function fetchSeasonCatalog(): Promise<SeasonCatalogFile | null> {
  try {
    const res = await fetch('/seasons.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    if (!res.ok) return null
    const data = (await res.json()) as SeasonCatalogFile
    if (!data.entries || !Array.isArray(data.entries)) return null
    return data
  } catch {
    return null
  }
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

  const res = await fetch(entry.dataUrl, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Daten konnten nicht geladen werden (${entry.dataUrl}): ${res.status}`)
  }
  const raw: unknown = await res.json()
  await importJsonBundleForSeason(seasonId, raw, {
    skipWritableCheck: entry.readOnly === true
  })
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
    return { id: row.id, title: row.title, readOnly: row.readOnly === true }
  } catch {
    return null
  }
}
