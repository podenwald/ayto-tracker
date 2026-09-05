import { describe, expect, it } from 'vitest'
import { getAvailableParticipants, getConfirmedPerfectMatchNames, getSmallerGender } from './matchStatus'
import type { Matchbox, Participant } from '@/types'

const now = new Date()

function mb(overrides: Partial<Matchbox>): Matchbox {
  return {
    seasonId: 1,
    woman: 'Woman',
    man: 'Man',
    matchType: 'perfect',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

function participant(overrides: Partial<Participant>): Participant {
  return {
    seasonId: 1,
    name: 'Name',
    knownFrom: '',
    gender: 'F',
    ...overrides
  }
}

describe('getConfirmedPerfectMatchNames', () => {
  it('includes both partners of every perfect matchbox', () => {
    const names = getConfirmedPerfectMatchNames([
      mb({ id: 1, woman: 'Emma', man: 'Bennett', matchType: 'perfect' }),
      mb({ id: 2, woman: 'Julia', man: 'Fabi', matchType: 'no-match' })
    ])
    expect(names).toEqual(new Set(['Emma', 'Bennett']))
  })

  it('includes the doppelmatch partner in addition to the pair', () => {
    const names = getConfirmedPerfectMatchNames([
      mb({ id: 1, woman: 'Marta', man: 'Johannes', matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Zoe' })
    ])
    expect(names).toEqual(new Set(['Marta', 'Johannes', 'Zoe']))
  })

  it('ignores non-perfect matchboxes entirely', () => {
    const names = getConfirmedPerfectMatchNames([
      mb({ id: 1, woman: 'A', man: 'B', matchType: 'no-match' }),
      mb({ id: 2, woman: 'C', man: 'D', matchType: 'sold' })
    ])
    expect(names.size).toBe(0)
  })

  it('returns an empty set for no matchboxes', () => {
    expect(getConfirmedPerfectMatchNames([]).size).toBe(0)
  })
})

describe('getAvailableParticipants', () => {
  const women = [participant({ id: 1, name: 'Emma' }), participant({ id: 2, name: 'Zoe' }), participant({ id: 3, name: 'Julia' })]

  it('excludes participants with a confirmed perfect match', () => {
    const matchboxes = [mb({ id: 10, woman: 'Emma', man: 'Bennett', matchType: 'perfect' })]
    const available = getAvailableParticipants(women, matchboxes)
    expect(available.map(p => p.name)).toEqual(['Zoe', 'Julia'])
  })

  it('excludes the doppelmatch partner too', () => {
    const matchboxes = [mb({ id: 10, woman: 'Emma', man: 'Bennett', matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Zoe' })]
    const available = getAvailableParticipants(women, matchboxes)
    expect(available.map(p => p.name)).toEqual(['Julia'])
  })

  it('keeps the pair belonging to the matchbox being edited selectable (ODI-286)', () => {
    const matchboxes = [mb({ id: 10, woman: 'Emma', man: 'Bennett', matchType: 'perfect' })]
    const available = getAvailableParticipants(women, matchboxes, 10)
    expect(available.map(p => p.name)).toEqual(['Emma', 'Zoe', 'Julia'])
  })

  it('still excludes other confirmed participants while editing a different matchbox', () => {
    const matchboxes = [
      mb({ id: 10, woman: 'Emma', man: 'Bennett', matchType: 'perfect' }),
      mb({ id: 11, woman: 'Zoe', man: 'Cansin', matchType: 'perfect' })
    ]
    const available = getAvailableParticipants(women, matchboxes, 10)
    expect(available.map(p => p.name)).toEqual(['Emma', 'Julia'])
  })
})

describe('getSmallerGender', () => {
  it('returns F when there are fewer women than men', () => {
    const participants = [
      participant({ id: 1, gender: 'F' }),
      participant({ id: 2, gender: 'M' }),
      participant({ id: 3, gender: 'M' })
    ]
    expect(getSmallerGender(participants)).toBe('F')
  })

  it('returns M when there are fewer men than women', () => {
    const participants = [
      participant({ id: 1, gender: 'F' }),
      participant({ id: 2, gender: 'F' }),
      participant({ id: 3, gender: 'M' })
    ]
    expect(getSmallerGender(participants)).toBe('M')
  })

  it('returns null when the counts are equal', () => {
    const participants = [
      participant({ id: 1, gender: 'F' }),
      participant({ id: 2, gender: 'M' })
    ]
    expect(getSmallerGender(participants)).toBeNull()
  })
})
