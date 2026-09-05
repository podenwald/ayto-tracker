import { describe, expect, it } from 'vitest'
import { computeSeasonFinale } from './seasonFinale'
import type { Matchbox, MatchingNight, Participant } from '@/types'

const now = new Date()

function mb(overrides: Partial<Matchbox>): Matchbox {
  return { seasonId: 1, woman: 'W', man: 'M', matchType: 'no-match', createdAt: now, updatedAt: now, ...overrides }
}

function mn(overrides: Partial<MatchingNight>): MatchingNight {
  return { seasonId: 1, name: 'MN', date: '2026-01-01', pairs: [], createdAt: now, ...overrides }
}

function participant(overrides: Partial<Participant>): Participant {
  return { seasonId: 1, name: 'P', knownFrom: '', gender: 'F', ...overrides }
}

describe('computeSeasonFinale', () => {
  it('splits the sold-item pool equally across active participants on an all-lights night', () => {
    const matchboxes = [mb({ matchType: 'sold', price: 100 })]
    const matchingNights = [mn({ matchType: 'sold', price: 50 })]
    const participants = [
      participant({ name: 'A', active: true }),
      participant({ name: 'B', active: true }),
      participant({ name: 'C', active: false })
    ]
    const tenthNight = mn({ totalLights: 10 })

    const result = computeSeasonFinale(matchboxes, matchingNights, participants, tenthNight)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.totalPoolEuro).toBe(150)
      expect(result.perParticipantEuro).toBe(75)
      expect(result.activeParticipantNames).toEqual(['A', 'B'])
    }
  })

  it('avoids dividing by zero when nobody is active', () => {
    const tenthNight = mn({ totalLights: 10 })
    const result = computeSeasonFinale([], [], [], tenthNight)
    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.perParticipantEuro).toBe(0)
    }
  })

  it('lists only deductions (negative prices) as seller payouts on a non-all-lights night', () => {
    const matchboxes = [
      mb({ matchType: 'sold', price: -20, buyer: 'Alex', woman: 'Emma', man: 'Bennett' }),
      mb({ matchType: 'sold', price: 30, buyer: 'Sam' }) // positive price: bonus, excluded
    ]
    const matchingNights = [mn({ matchType: 'sold', price: -10, buyer: 'Chris', name: 'Verkaufte MN' })]
    const tenthNight = mn({ totalLights: 7 })

    const result = computeSeasonFinale(matchboxes, matchingNights, [], tenthNight)

    expect(result.kind).toBe('seller-payouts')
    if (result.kind === 'seller-payouts') {
      expect(result.rows).toEqual([
        { sellerLabel: 'Alex', amountEuro: -20, reference: 'Matchbox (Emma & Bennett)' },
        { sellerLabel: 'Chris', amountEuro: -10, reference: 'Verkaufte MN' }
      ])
      expect(result.totalDeductionsEuro).toBe(30)
    }
  })

  it('treats a sold tenth matching night as not an all-lights jackpot', () => {
    const tenthNight = mn({ matchType: 'sold', totalLights: 10 })
    const result = computeSeasonFinale([], [], [], tenthNight)
    expect(result.kind).toBe('seller-payouts')
  })

  it('skips deduction rows with no recorded buyer', () => {
    const matchboxes = [mb({ matchType: 'sold', price: -20, buyer: '' })]
    const tenthNight = mn({ totalLights: 5 })
    const result = computeSeasonFinale(matchboxes, [], [], tenthNight)
    expect(result.kind).toBe('seller-payouts')
    if (result.kind === 'seller-payouts') {
      expect(result.rows).toEqual([])
      expect(result.totalDeductionsEuro).toBe(20)
    }
  })
})
