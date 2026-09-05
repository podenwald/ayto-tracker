import { describe, expect, it } from 'vitest'
import {
  createBroadcastDateTime,
  getMatchboxBroadcastDateTime,
  getValidPerfectMatchesBeforeDateTime,
  getValidPerfectMatchesForMatchingNight,
  isPairConfirmedAsPerfectMatch,
  sortBroadcastsChronologically,
  validateBroadcastDateTime
} from './broadcastUtils'
import type { Matchbox, MatchingNight } from '@/types'

const now = new Date()

function mb(overrides: Partial<Matchbox>): Matchbox {
  return { seasonId: 1, woman: 'W', man: 'M', matchType: 'perfect', createdAt: now, updatedAt: now, ...overrides }
}

function mn(overrides: Partial<MatchingNight>): MatchingNight {
  return { seasonId: 1, name: 'MN', date: '2026-01-01', pairs: [], createdAt: now, ...overrides }
}

describe('createBroadcastDateTime', () => {
  it('combines date and time into one Date', () => {
    const date = createBroadcastDateTime({ ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '20:15' })
    expect(date.getHours()).toBe(20)
    expect(date.getMinutes()).toBe(15)
  })

  it('rejects an invalid date format', () => {
    expect(() => createBroadcastDateTime({ ausstrahlungsdatum: '10.05.2026', ausstrahlungszeit: '20:15' })).toThrow()
  })

  it('rejects an invalid time format', () => {
    expect(() => createBroadcastDateTime({ ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '8:15pm' })).toThrow()
  })

  it('rejects an out-of-range time', () => {
    expect(() => createBroadcastDateTime({ ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '25:00' })).toThrow()
  })
})

describe('validateBroadcastDateTime', () => {
  it('is true for valid data and false for invalid data', () => {
    expect(validateBroadcastDateTime({ ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '20:15' })).toBe(true)
    expect(validateBroadcastDateTime({ ausstrahlungsdatum: 'invalid', ausstrahlungszeit: '20:15' })).toBe(false)
  })
})

describe('sortBroadcastsChronologically', () => {
  it('orders items oldest first', () => {
    const a = { ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '20:00', createdAt: now }
    const b = { ausstrahlungsdatum: '2026-05-09', ausstrahlungszeit: '20:00', createdAt: now }
    expect(sortBroadcastsChronologically([a, b])).toEqual([b, a])
  })
})

describe('getMatchboxBroadcastDateTime', () => {
  it('uses the broadcast date/time when present', () => {
    const box = mb({ ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '20:15' })
    const date = getMatchboxBroadcastDateTime(box)
    expect(date.getFullYear()).toBe(2026)
  })

  it('falls back to createdAt when no broadcast time is set', () => {
    const box = mb({ createdAt: now })
    expect(getMatchboxBroadcastDateTime(box)).toBe(now)
  })
})

describe('getValidPerfectMatchesBeforeDateTime', () => {
  it('only includes perfect matchboxes aired before the given date', () => {
    const before = mb({ id: 1, matchType: 'perfect', ausstrahlungsdatum: '2026-05-01', ausstrahlungszeit: '20:00' })
    const after = mb({ id: 2, matchType: 'perfect', ausstrahlungsdatum: '2026-05-20', ausstrahlungszeit: '20:00' })
    const result = getValidPerfectMatchesBeforeDateTime([before, after], new Date('2026-05-10'))
    expect(result.map(m => m.id)).toEqual([1])
  })

  it('excludes non-perfect matchboxes', () => {
    const noMatch = mb({ id: 1, matchType: 'no-match', ausstrahlungsdatum: '2026-05-01', ausstrahlungszeit: '20:00' })
    expect(getValidPerfectMatchesBeforeDateTime([noMatch], new Date('2026-06-01'))).toEqual([])
  })

  it('excludes perfect matchboxes without broadcast data', () => {
    const noBroadcast = mb({ id: 1, matchType: 'perfect' })
    expect(getValidPerfectMatchesBeforeDateTime([noBroadcast], new Date('2026-06-01'))).toEqual([])
  })
})

describe('getValidPerfectMatchesForMatchingNight / isPairConfirmedAsPerfectMatch', () => {
  const earlyMatch = mb({ id: 1, woman: 'Emma', man: 'Bennett', matchType: 'perfect', ausstrahlungsdatum: '2026-05-01', ausstrahlungszeit: '20:00' })
  const lateMatch = mb({ id: 2, woman: 'Julia', man: 'Fabi', matchType: 'perfect', ausstrahlungsdatum: '2026-05-20', ausstrahlungszeit: '20:00' })
  const night = mn({ ausstrahlungsdatum: '2026-05-10', ausstrahlungszeit: '21:00' })

  it('only considers matchboxes aired before the matching night', () => {
    const valid = getValidPerfectMatchesForMatchingNight([earlyMatch, lateMatch], night)
    expect(valid.map(m => m.id)).toEqual([1])
  })

  it('confirms a pair aired before the matching night, in either order', () => {
    expect(isPairConfirmedAsPerfectMatch({ woman: 'Emma', man: 'Bennett' }, night, [earlyMatch, lateMatch])).toBe(true)
    expect(isPairConfirmedAsPerfectMatch({ woman: 'Bennett', man: 'Emma' }, night, [earlyMatch, lateMatch])).toBe(true)
  })

  it('does not confirm a pair aired after the matching night', () => {
    expect(isPairConfirmedAsPerfectMatch({ woman: 'Julia', man: 'Fabi' }, night, [earlyMatch, lateMatch])).toBe(false)
  })
})
