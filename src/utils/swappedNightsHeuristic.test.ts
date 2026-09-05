import { describe, expect, it } from 'vitest'
import { findSwappedMatchingNights } from './swappedNightsHeuristic'
import type { MatchingNight, Participant } from '@/types'

const now = new Date()

function participant(name: string, gender: 'F' | 'M'): Participant {
  return { seasonId: 1, name, knownFrom: '', gender }
}

function night(overrides: Partial<MatchingNight>): MatchingNight {
  return { seasonId: 1, name: 'MN', date: '2026-01-01', pairs: [], createdAt: now, ...overrides }
}

const women = [participant('Emma', 'F'), participant('Julia', 'F')]
const men = [participant('Bennett', 'M'), participant('Fabi', 'M')]
const participants = [...women, ...men]

describe('findSwappedMatchingNights', () => {
  it('finds no fix for a correctly assigned matching night', () => {
    const nights = [night({ id: 1, pairs: [{ woman: 'Emma', man: 'Bennett' }, { woman: 'Julia', man: 'Fabi' }] })]
    expect(findSwappedMatchingNights(nights, participants)).toEqual([])
  })

  it('detects a matching night whose woman/man fields are swapped', () => {
    const nights = [night({ id: 1, pairs: [{ woman: 'Bennett', man: 'Emma' }, { woman: 'Fabi', man: 'Julia' }] })]
    const fixes = findSwappedMatchingNights(nights, participants)
    expect(fixes).toHaveLength(1)
    expect(fixes[0].night.id).toBe(1)
    expect(fixes[0].correctedPairs).toEqual([
      { woman: 'Emma', man: 'Bennett' },
      { woman: 'Julia', man: 'Fabi' }
    ])
  })

  it('only reports the actually swapped nights out of several', () => {
    const correct = night({ id: 1, pairs: [{ woman: 'Emma', man: 'Bennett' }] })
    const swapped = night({ id: 2, pairs: [{ woman: 'Bennett', man: 'Emma' }, { woman: 'Fabi', man: 'Julia' }] })
    const fixes = findSwappedMatchingNights([correct, swapped], participants)
    expect(fixes.map(f => f.night.id)).toEqual([2])
  })

  it('returns an empty array when there are no matching nights', () => {
    expect(findSwappedMatchingNights([], participants)).toEqual([])
  })
})
