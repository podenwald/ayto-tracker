/**
 * Staffel-Kontext: aktive Staffel, Schreibschutz (readOnly), Hilfen für IndexedDB.
 */

import { db, DatabaseUtils, type Season, type SeasonKind } from '@/lib/db'

export const META_ACTIVE_SEASON_ID = 'activeSeasonId'

export class SeasonReadOnlyError extends Error {
  constructor(message = 'Diese Staffel ist abgeschlossen und kann nicht bearbeitet werden.') {
    super(message)
    this.name = 'SeasonReadOnlyError'
  }
}

export async function listSeasons(): Promise<Season[]> {
  return db.seasons.orderBy('id').toArray()
}

export async function getSeason(seasonId: number): Promise<Season | undefined> {
  return db.seasons.get(seasonId)
}

export async function getActiveSeasonId(): Promise<number> {
  const raw = await DatabaseUtils.getMetaValue(META_ACTIVE_SEASON_ID)
  let id: number | null = null
  if (typeof raw === 'number') id = raw
  else if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (!Number.isNaN(n)) id = n
  }
  if (id != null) {
    const exists = await db.seasons.get(id)
    if (exists) return id
  }
  const first = await db.seasons.orderBy('id').first()
  if (first?.id != null) {
    await DatabaseUtils.setMetaValue(META_ACTIVE_SEASON_ID, first.id)
    return first.id
  }
  throw new Error('Keine Staffel in der Datenbank – Migration erforderlich.')
}

export async function setActiveSeasonId(seasonId: number): Promise<void> {
  const s = await db.seasons.get(seasonId)
  if (!s) throw new Error(`Staffel ${seasonId} existiert nicht.`)
  await DatabaseUtils.setMetaValue(META_ACTIVE_SEASON_ID, seasonId)
}

export async function isSeasonReadOnly(seasonId: number): Promise<boolean> {
  const s = await getSeason(seasonId)
  return s?.readOnly === true
}

export async function assertSeasonWritable(seasonId: number): Promise<void> {
  if (await isSeasonReadOnly(seasonId)) {
    throw new SeasonReadOnlyError()
  }
}

function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48)
  return base || 'staffel'
}

export async function createSeason(params: {
  title: string
  slug?: string
  kind: SeasonKind
  readOnly: boolean
}): Promise<number> {
  const now = new Date()
  let slug = params.slug?.trim() || slugify(params.title)
  const existing = await db.seasons.where('slug').equals(slug).first()
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }
  return db.seasons.add({
    slug,
    title: params.title.trim() || 'Neue Staffel',
    kind: params.kind,
    readOnly: params.readOnly,
    createdAt: now,
    updatedAt: now
  })
}

/**
 * Löscht alle Entitätsdaten einer Staffel (nicht die Staffel-Zeile selbst).
 */
export async function clearAllDataForSeason(seasonId: number): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.participants,
      db.matchingNights,
      db.matchboxes,
      db.penalties,
      db.probabilityCache,
      db.broadcastNotes
    ],
    async () => {
      await Promise.all([
        db.participants.where('seasonId').equals(seasonId).delete(),
        db.matchingNights.where('seasonId').equals(seasonId).delete(),
        db.matchboxes.where('seasonId').equals(seasonId).delete(),
        db.penalties.where('seasonId').equals(seasonId).delete(),
        db.probabilityCache.where('seasonId').equals(seasonId).delete(),
        db.broadcastNotes.where('seasonId').equals(seasonId).delete()
      ])
    }
  )
}
