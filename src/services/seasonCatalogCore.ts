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

/** Meta-Key, unter dem der zuletzt gesehene Inhalts-Hash eines Katalog-Eintrags gespeichert wird. */
export function catalogBundleMetaKey(catalogEntryId: string): string {
  return `catalogBundleSha256:${catalogEntryId}`
}

/** Stabiler Inhalts-Hash (SHA-256, Fallback djb2 ohne WebCrypto) für Änderungserkennung. */
export async function hashJsonPayload(text: string): Promise<string> {
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

/** Lädt den rohen Text einer Katalog-Datenquelle (`entry.dataUrl`), immer ohne Cache. */
export async function fetchCatalogDataText(dataUrl: string): Promise<string> {
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
 *
 * Check und Add laufen in einer gemeinsamen 'rw'-Transaktion auf `seasons`, damit
 * zwei nahezu gleichzeitige Aufrufe (z. B. "/" und "/admin" in getrennten Tabs beim
 * allerersten Besuch, bevor meta.activeSeasonId gesetzt ist) nicht beide denselben
 * Katalog-Eintrag als zwei separate Staffel-Zeilen anlegen.
 */
export async function ensureSeasonRowFromCatalog(entry: SeasonCatalogEntry): Promise<number> {
  return db.transaction('rw', db.seasons, async () => {
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

/**
 * Einzige Quelle der Wahrheit für den angezeigten Staffel-Titel: Existiert ein
 * Katalog-Eintrag zur lokalen Staffel, gewinnt konsequent dessen Titel (seasons.json
 * bleibt so die maßgebliche Bezeichnung, auch wenn die lokale Zeile einen älteren
 * Titel gespeichert hat). Sonst der lokal gespeicherte Titel.
 */
export function resolveSeasonTitle(localTitle: string, catalogTitle?: string | null): string {
  return catalogTitle?.trim() || localTitle
}
