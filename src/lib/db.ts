import Dexie, { type Table } from 'dexie'
import type { 
  Participant, 
  MatchingNight, 
  Matchbox, 
  Penalty,
  ProbabilityCache,
  BroadcastNote,
  DatabaseCounts,
  Season
} from '@/types'

// Meta Store Interface für Datenbank-Versionierung
export interface DatabaseMeta {
  key: string
  value: string | number
  updatedAt: Date
}

// Re-export types for backward compatibility
export type { 
  Participant, 
  MatchingNight, 
  Matchbox, 
  Penalty,
  ProbabilityCache,
  DatabaseCounts,
  BroadcastNote,
  Season,
  SeasonKind
} from '@/types'

export class AytoDB extends Dexie {
  seasons!: Table<Season, number>
  participants!: Table<Participant, number>
  matchingNights!: Table<MatchingNight, number>
  matchboxes!: Table<Matchbox, number>
  penalties!: Table<Penalty, number>
  probabilityCache!: Table<ProbabilityCache, number>
  broadcastNotes!: Table<BroadcastNote, number>
  meta!: Table<DatabaseMeta, string>

  constructor() {
    super('aytoDB')
    this.version(1).stores({
      participants: '++id, name, gender, status'
    })
    this.version(2).stores({
      participants: '++id, name, gender, status, active'
    }).upgrade(tx => {
      return tx.table('participants').toCollection().modify((p: Participant) => {
        if (p.active === undefined) {
          p.active = (p.status ? String(p.status).toLowerCase() === 'aktiv' : true)
        }
      })
    })
    this.version(3).stores({
      participants: '++id, name, gender, status, active',
      matchingNights: '++id, name, date, pairs, createdAt'
    })
    this.version(4).stores({
      participants: '++id, name, gender, status, active',
      matchingNights: '++id, name, date, pairs, createdAt',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt'
    })
    this.version(5).stores({
      participants: '++id, name, gender, status, active',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt'
    })
    this.version(6).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt'
    })
    this.version(7).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt',
      penalties: '++id, participantName, reason, amount, date, createdAt'
    })
    this.version(8).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt',
      penalties: '++id, participantName, reason, amount, date, createdAt'
    })
    this.version(9).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, participantName, reason, amount, date, createdAt'
    }).upgrade(tx => {
      // Migration: Übertrage Erstellungsdatum in Ausstrahlungsdatum für bestehende Daten
      return Promise.all([
        tx.table('matchingNights').toCollection().modify((matchingNight: MatchingNight) => {
          if (!matchingNight.ausstrahlungsdatum && matchingNight.createdAt) {
            const createdDate = new Date(matchingNight.createdAt)
            matchingNight.ausstrahlungsdatum = createdDate.toISOString().split('T')[0] // YYYY-MM-DD
            matchingNight.ausstrahlungszeit = createdDate.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
          }
        }),
        tx.table('matchboxes').toCollection().modify((matchbox: Matchbox) => {
          if (!matchbox.ausstrahlungsdatum && matchbox.createdAt) {
            const createdDate = new Date(matchbox.createdAt)
            matchbox.ausstrahlungsdatum = createdDate.toISOString().split('T')[0] // YYYY-MM-DD
            matchbox.ausstrahlungszeit = createdDate.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
          }
        })
      ])
    })
    this.version(10).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, participantName, reason, amount, date, createdAt',
      meta: 'key, value, updatedAt'
    })
    // Version 11: Wahrscheinlichkeits-Cache hinzufügen
    this.version(11).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, participantName, reason, amount, date, createdAt',
      probabilityCache: '++id, dataHash, createdAt, updatedAt',
      meta: 'key, value, updatedAt'
    })
    this.version(12).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, woman, man, matchType, price, buyer, soldDate, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, participantName, reason, amount, date, createdAt',
      probabilityCache: '++id, dataHash, createdAt, updatedAt',
      broadcastNotes: '++id, date, notes, createdAt, updatedAt',
      meta: 'key, value, updatedAt'
    })
    this.version(13).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, participantName, reason, amount, date, createdAt',
      probabilityCache: '++id, dataHash, createdAt, updatedAt',
      broadcastNotes: '++id, date, notes, createdAt, updatedAt',
      meta: 'key, value, updatedAt'
    })
    
    // Version 14: App-Version 0.5.9 - Keine Schema-Änderungen, nur Versions-Update
    this.version(14).stores({
      participants: '++id, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, woman, man, matchType, price, buyer, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, participantName, reason, amount, date, createdAt',
      probabilityCache: '++id, dataHash, createdAt, updatedAt',
      broadcastNotes: '++id, date, notes, createdAt, updatedAt',
      meta: 'key, value, updatedAt'
    })

    // Version 15: Staffeln (seasons) + seasonId auf allen Entitätstabellen
    this.version(15).stores({
      seasons: '++id, slug, kind, readOnly, createdAt, updatedAt',
      participants: '++id, seasonId, name, gender, status, active, socialMediaAccount, freeProfilePhotoUrl',
      matchingNights: '++id, seasonId, name, date, pairs, totalLights, createdAt, ausstrahlungsdatum, ausstrahlungszeit',
      matchboxes: '++id, seasonId, woman, man, matchType, price, buyer, createdAt, updatedAt, ausstrahlungsdatum, ausstrahlungszeit',
      penalties: '++id, seasonId, participantName, reason, amount, date, createdAt',
      probabilityCache: '++id, seasonId, dataHash, createdAt, updatedAt',
      broadcastNotes: '++id, seasonId, date, notes, createdAt, updatedAt',
      meta: 'key, value, updatedAt'
    }).upgrade(async tx => {
      const now = new Date()
      const sid = (await tx.table('seasons').add({
        slug: 'legacy',
        title: 'Meine Staffel',
        kind: 'custom',
        readOnly: false,
        createdAt: now,
        updatedAt: now
      })) as number

      await tx.table('meta').put({
        key: 'activeSeasonId',
        value: sid,
        updatedAt: now
      })

      await tx.table('participants').toCollection().modify((p: { seasonId?: number }) => {
        p.seasonId = sid
      })
      await tx.table('matchingNights').toCollection().modify((m: { seasonId?: number }) => {
        m.seasonId = sid
      })
      await tx.table('matchboxes').toCollection().modify((m: { seasonId?: number }) => {
        m.seasonId = sid
      })
      await tx.table('penalties').toCollection().modify((p: { seasonId?: number }) => {
        p.seasonId = sid
      })
      await tx.table('probabilityCache').toCollection().modify((c: { seasonId?: number }) => {
        c.seasonId = sid
      })
      await tx.table('broadcastNotes').toCollection().modify((n: { seasonId?: number }) => {
        n.seasonId = sid
      })
    })
  }
}

export const db = new AytoDB()

/**
 * Utility-Funktionen für die Datenbank
 */
export class DatabaseUtils {
  private static async activeSeasonId(): Promise<number> {
    const { getActiveSeasonId } = await import('@/services/seasonService')
    return getActiveSeasonId()
  }

  /**
   * Zählt alle Einträge der aktiven Staffel
   */
  static async getCounts(): Promise<DatabaseCounts> {
    const sid = await this.activeSeasonId()
    const [participants, matchingNights, matchboxes, penalties] = await Promise.all([
      db.participants.where('seasonId').equals(sid).count(),
      db.matchingNights.where('seasonId').equals(sid).count(),
      db.matchboxes.where('seasonId').equals(sid).count(),
      db.penalties.where('seasonId').equals(sid).count()
    ])

    return {
      participants,
      matchingNights,
      matchboxes,
      penalties
    }
  }

  /**
   * Holt den Wahrscheinlichkeits-Cache für die aktive Staffel und den Data-Hash
   */
  static async getProbabilityCache(dataHash: string): Promise<ProbabilityCache | undefined> {
    const sid = await this.activeSeasonId()
    return await db.probabilityCache
      .where('seasonId')
      .equals(sid)
      .filter(c => c.dataHash === dataHash)
      .first()
  }

  /**
   * Speichert oder aktualisiert den Wahrscheinlichkeits-Cache (pro Staffel)
   */
  static async saveProbabilityCache(cache: ProbabilityCache): Promise<number> {
    const sid = cache.seasonId
    const existing = await db.probabilityCache
      .where('seasonId')
      .equals(sid)
      .filter(c => c.dataHash === cache.dataHash)
      .first()

    if (existing && existing.id) {
      cache.id = existing.id
      cache.updatedAt = new Date()
      await db.probabilityCache.put(cache)
      return existing.id
    }
    cache.createdAt = new Date()
    cache.updatedAt = new Date()
    return await db.probabilityCache.add(cache)
  }

  /**
   * Löscht alle Cache-Einträge der aktiven Staffel
   */
  static async clearProbabilityCache(): Promise<void> {
    const sid = await this.activeSeasonId()
    await db.probabilityCache.where('seasonId').equals(sid).delete()
  }

  /**
   * Broadcast Notes Funktionen (aktive Staffel)
   */
  static async getBroadcastNoteByDate(date: string): Promise<BroadcastNote | undefined> {
    const sid = await this.activeSeasonId()
    return await db.broadcastNotes
      .where('seasonId')
      .equals(sid)
      .filter(n => n.date === date)
      .first()
  }

  static async saveBroadcastNote(note: BroadcastNote): Promise<number> {
    const sid = await this.activeSeasonId()
    const merged: BroadcastNote = { ...note, seasonId: note.seasonId ?? sid }
    const existing = await this.getBroadcastNoteByDate(merged.date)

    if (existing && existing.id) {
      merged.id = existing.id
      merged.updatedAt = new Date()
      await db.broadcastNotes.put(merged)
      return existing.id
    }
    merged.createdAt = new Date()
    merged.updatedAt = new Date()
    return await db.broadcastNotes.add(merged)
  }

  static async deleteBroadcastNote(id: number): Promise<void> {
    await db.broadcastNotes.delete(id)
  }

  static async getAllBroadcastNotes(): Promise<BroadcastNote[]> {
    const sid = await this.activeSeasonId()
    return await db.broadcastNotes.where('seasonId').equals(sid).toArray()
  }

  /**
   * Prüft, ob die aktive Staffel keine Teilnehmer-/Spieldaten hat
   */
  static async isEmpty(): Promise<boolean> {
    const counts = await this.getCounts()
    return Object.values(counts).every(count => count === 0)
  }

  /**
   * Leert alle Entitätsdaten der aktiven Staffel (nicht die Staffel-Zeile selbst)
   */
  static async clearAll(): Promise<void> {
    const { clearAllDataForSeason, getActiveSeasonId } = await import('@/services/seasonService')
    const sid = await getActiveSeasonId()
    await clearAllDataForSeason(sid)
  }

  /**
   * Importiert Daten in die aktive Staffel (seasonId wird gesetzt)
   */
  static async importData(data: {
    participants: Participant[]
    matchingNights: MatchingNight[]
    matchboxes: Matchbox[]
    penalties: Penalty[]
    probabilityCache?: ProbabilityCache[]
    broadcastNotes?: BroadcastNote[]
  }): Promise<void> {
    const sid = await this.activeSeasonId()
    const withSid = <T extends { seasonId: number }>(rows: T[]): T[] =>
      rows.map(row => ({ ...row, seasonId: sid }))

    await db.transaction('rw', db.participants, db.matchingNights, db.matchboxes, db.penalties, async () => {
      await Promise.all([
        db.participants.bulkPut(withSid(data.participants)),
        db.matchingNights.bulkPut(withSid(data.matchingNights)),
        db.matchboxes.bulkPut(withSid(data.matchboxes)),
        db.penalties.bulkPut(withSid(data.penalties))
      ])
    })

    if (data.probabilityCache && data.probabilityCache.length > 0) {
      await db.probabilityCache.bulkPut(withSid(data.probabilityCache))
    }

    if (data.broadcastNotes && data.broadcastNotes.length > 0) {
      await db.broadcastNotes.bulkPut(withSid(data.broadcastNotes))
    }
  }

  /**
   * Exportiert alle Daten der aktiven Staffel
   */
  static async exportData(): Promise<{
    participants: Participant[]
    matchingNights: MatchingNight[]
    matchboxes: Matchbox[]
    penalties: Penalty[]
    probabilityCache: ProbabilityCache[]
    broadcastNotes: BroadcastNote[]
  }> {
    const sid = await this.activeSeasonId()
    const [participants, matchingNights, matchboxes, penalties, probabilityCache, broadcastNotes] = await Promise.all([
      db.participants.where('seasonId').equals(sid).toArray(),
      db.matchingNights.where('seasonId').equals(sid).toArray(),
      db.matchboxes.where('seasonId').equals(sid).toArray(),
      db.penalties.where('seasonId').equals(sid).toArray(),
      db.probabilityCache.where('seasonId').equals(sid).toArray(),
      db.broadcastNotes.where('seasonId').equals(sid).toArray()
    ])

    return {
      participants,
      matchingNights,
      matchboxes,
      penalties,
      probabilityCache,
      broadcastNotes
    }
  }

  /**
   * Meta-Daten-Funktionen für Datenbank-Versionierung
   */
  static async getMetaValue(key: string): Promise<string | number | null> {
    const meta = await db.meta.get(key)
    return meta?.value ?? null
  }

  static async setMetaValue(key: string, value: string | number): Promise<void> {
    await db.meta.put({
      key,
      value,
      updatedAt: new Date()
    })
  }

  static async getDbVersion(): Promise<string> {
    const version = await this.getMetaValue('dbVersion')
    return typeof version === 'string' ? version : 'v0.0.0'
  }

  static async setDbVersion(version: string): Promise<void> {
    await this.setMetaValue('dbVersion', version)
  }

  static async getDataHash(): Promise<string> {
    const hash = await this.getMetaValue('dataHash')
    return typeof hash === 'string' ? hash : 'unknown'
  }

  static async setDataHash(hash: string): Promise<void> {
    await this.setMetaValue('dataHash', hash)
  }

  static async getLastUpdateDate(): Promise<string | null> {
    const date = await this.getMetaValue('lastUpdateDate')
    return typeof date === 'string' ? date : null
  }

  static async setLastUpdateDate(date: string): Promise<void> {
    await this.setMetaValue('lastUpdateDate', date)
  }
}


