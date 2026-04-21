/**
 * Katalog-Lesen & Staffel-Zeilen aus /seasons.json — ohne Abhängigkeit von seasonService
 * (verhindert Zyklen; Default-Aktivierung nutzt dieselbe Logik).
 */

import { db } from '@/lib/db'
import type { SeasonKind } from '@/types'

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

export function parseJsonFromText<T>(text: string, label: string): T {
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

async function parseJsonBody<T>(res: Response, label: string): Promise<T> {
  const text = await res.text()
  return parseJsonFromText<T>(text, label)
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
 * Default laut Katalog-Reihenfolge in seasons.json:
 * erste nicht-schreibgeschützte Staffel, sonst die erste Zeile.
 */
export function pickDefaultCatalogEntry(catalog: SeasonCatalogFile): SeasonCatalogEntry | null {
  if (!catalog.entries?.length) return null
  const writable = catalog.entries.find(e => e.readOnly !== true)
  return writable ?? catalog.entries[0] ?? null
}
