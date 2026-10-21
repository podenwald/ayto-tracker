import { describe, expect, it } from 'vitest'
import { computeSeasonFinale } from './seasonFinale'
import type { Matchbox, MatchingNight, Participant, Penalty } from '@/types'

const now = new Date()

function mb(overrides: Partial<Matchbox>): Matchbox {
  return { seasonId: 1, woman: 'W', man: 'M', matchType: 'no-match', createdAt: now, updatedAt: now, ...overrides }
}

function mn(overrides: Partial<MatchingNight>): MatchingNight {
  return { seasonId: 1, name: 'MN', date: '2026-01-01', pairs: [], createdAt: now, ...overrides }
}

function penalty(overrides: Partial<Penalty>): Penalty {
  return { seasonId: 1, participantName: 'P', reason: 'Test', amount: 0, date: '2026-01-01', createdAt: now, ...overrides }
}

function participant(overrides: Partial<Participant>): Participant {
  return { seasonId: 1, name: 'P', knownFrom: '', gender: 'F', ...overrides }
}

describe('computeSeasonFinale', () => {
  it('splits the pool (starting budget 0 + sold items) equally across all participants on an all-lights night, incl. inactive ones (ODI-373)', () => {
    const matchboxes = [mb({ matchType: 'sold', price: 100 })]
    const matchingNights = [mn({ matchType: 'sold', price: 50 })]
    const participants = [
      participant({ name: 'A', active: true }),
      participant({ name: 'B', active: true }),
      participant({ name: 'C', active: false })
    ]
    const tenthNight = mn({ totalLights: 10 })

    const result = computeSeasonFinale(matchboxes, matchingNights, participants, tenthNight, [], 0)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.totalPoolEuro).toBe(150)
      expect(result.perParticipantEuro).toBe(50)
      expect(result.participantNames).toEqual(['A', 'B', 'C'])
    }
  })

  it('avoids dividing by zero when nobody is active', () => {
    const tenthNight = mn({ totalLights: 10 })
    const result = computeSeasonFinale([], [], [], tenthNight, [], 0)
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

    const result = computeSeasonFinale(matchboxes, matchingNights, [], tenthNight, [], 0)

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
    const result = computeSeasonFinale([], [], [], tenthNight, [], 0)
    expect(result.kind).toBe('seller-payouts')
  })

  it('skips deduction rows with no recorded buyer', () => {
    const matchboxes = [mb({ matchType: 'sold', price: -20, buyer: '' })]
    const tenthNight = mn({ totalLights: 5 })
    const result = computeSeasonFinale(matchboxes, [], [], tenthNight, [], 0)
    expect(result.kind).toBe('seller-payouts')
    if (result.kind === 'seller-payouts') {
      expect(result.rows).toEqual([])
      expect(result.totalDeductionsEuro).toBe(20)
    }
  })

  // ODI-372: Gesamtsumme = aktuelles Budget (Startbudget + Verkäufe - Strafen + Gutschriften), nicht nur die Verkäufe
  it('includes the starting budget in the pool, so sold boxes reduce it instead of making it negative (ODI-372)', () => {
    const matchboxes = [
      mb({ matchType: 'sold', price: -10000, buyer: 'Fabi' }),
      mb({ matchType: 'sold', price: -5000, buyer: 'Brian' })
    ]
    // 17 aktiv + 5 ausgezogen (Perfect Match / Doppelmatch): alle 22 bekommen Geld (ODI-373)
    const participants = Array.from({ length: 22 }, (_, i) => participant({ name: `P${i}`, active: i < 17 }))
    const tenthNight = mn({ totalLights: 10 })

    const result = computeSeasonFinale(matchboxes, [], participants, tenthNight, [], 200000)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.totalPoolEuro).toBe(185000)
      expect(result.perParticipantEuro).toBeCloseTo(8409.09, 2)
    }
  })

  it('subtracts penalties and adds credits like the budget shown in header and admin (ODI-372)', () => {
    const matchboxes = [mb({ matchType: 'sold', price: -1000 })]
    const penalties = [penalty({ amount: -500 }), penalty({ amount: -250 }), penalty({ amount: 100 })]
    const participants = [participant({ name: 'A', active: true }), participant({ name: 'B', active: true })]
    const tenthNight = mn({ totalLights: 10 })

    const result = computeSeasonFinale(matchboxes, [], participants, tenthNight, penalties, 10000)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      // 10000 - 1000 - 750 + 100
      expect(result.totalPoolEuro).toBe(8350)
      expect(result.perParticipantEuro).toBe(4175)
    }
  })
})
