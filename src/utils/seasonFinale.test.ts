import { describe, expect, it } from 'vitest'
import { computeSeasonFinale } from './seasonFinale'
import type { Matchbox, MatchingNight, Penalty } from '@/types'

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

/** Zehn Paare W0-M0 ... W9-M9 */
const tenPairs = Array.from({ length: 10 }, (_, i) => ({ woman: `W${i}`, man: `M${i}` }))

describe('computeSeasonFinale', () => {
  it('splits the pool (starting budget 0 + sold items) equally across the people of the ten pairs on an all-lights night', () => {
    const matchboxes = [mb({ matchType: 'sold', price: 100 })]
    const matchingNights = [mn({ matchType: 'sold', price: 50 })]
    const tenthNight = mn({ totalLights: 10, pairs: tenPairs })

    const result = computeSeasonFinale(matchboxes, matchingNights, tenthNight, [], 0)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.totalPoolEuro).toBe(150)
      expect(result.recipientNames).toHaveLength(20)
      expect(result.perRecipientEuro).toBe(7.5)
    }
  })

  it('avoids dividing by zero when nobody is seated', () => {
    const tenthNight = mn({ totalLights: 10 })
    const result = computeSeasonFinale([], [], tenthNight, [], 0)
    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.recipientNames).toEqual([])
      expect(result.perRecipientEuro).toBe(0)
    }
  })

  // ODI-373: Geld bekommen die 10 Perfect Matches (Paare der 10. Matching Night + bereits gefundene),
  // Doppelmatch-Personen sitzen dort nicht und bekommen nichts
  it('pays the people of the tenth night, but not a double-match person who is not seated (ODI-373)', () => {
    // Emma sitzt mit Fabi, Laurenz ist der zweite Partner (Doppelmatch) und sitzt nicht
    const pairs = [{ woman: 'Emma', man: 'Fabi' }, ...tenPairs.slice(1)]
    const matchboxes = [
      mb({ woman: 'Emma', man: 'Laurenz', matchType: 'sold', price: -10000 }),
      mb({ woman: 'W1', man: 'M1', matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Janice' })
    ]
    const tenthNight = mn({ totalLights: 10, pairs })

    const result = computeSeasonFinale(matchboxes, [], tenthNight, [], 200000)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.recipientNames).toHaveLength(20)
      expect(result.recipientNames).toContain('Emma')
      expect(result.recipientNames).toContain('Fabi')
      expect(result.recipientNames).not.toContain('Laurenz')
      expect(result.recipientNames).not.toContain('Janice')
      expect(result.totalPoolEuro).toBe(190000)
      expect(result.perRecipientEuro).toBe(9500)
    }
  })

  it('counts a found perfect match once, whether or not it is seated in the tenth night (ODI-373)', () => {
    const matchboxes = [
      mb({ woman: 'W0', man: 'M0', matchType: 'perfect' }), // sitzt in der 10. Night: nicht doppelt zählen
      mb({ woman: 'Marta', man: 'Johannes', matchType: 'perfect' }) // sitzt dort nicht: kommt dazu
    ]
    const tenthNight = mn({ totalLights: 10, pairs: tenPairs })

    const result = computeSeasonFinale(matchboxes, [], tenthNight, [], 0)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.recipientNames).toHaveLength(22)
      expect(result.recipientNames.filter(n => n === 'W0')).toHaveLength(1)
      expect(result.recipientNames).toEqual(expect.arrayContaining(['Marta', 'Johannes']))
    }
  })

  // ODI-372: Gesamtsumme = aktuelles Budget (Startbudget + Verkäufe - Strafen + Gutschriften), nicht nur die Verkäufe
  it('includes the starting budget in the pool, so sold boxes reduce it instead of making it negative (ODI-372)', () => {
    const matchboxes = [
      mb({ matchType: 'sold', price: -10000, buyer: 'Fabi' }),
      mb({ matchType: 'sold', price: -5000, buyer: 'Brian' })
    ]
    const tenthNight = mn({ totalLights: 10, pairs: tenPairs })

    const result = computeSeasonFinale(matchboxes, [], tenthNight, [], 200000)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      expect(result.totalPoolEuro).toBe(185000)
      expect(result.perRecipientEuro).toBe(9250)
    }
  })

  it('subtracts penalties and adds credits like the budget shown in header and admin (ODI-372)', () => {
    const matchboxes = [mb({ matchType: 'sold', price: -1000 })]
    const penalties = [penalty({ amount: -500 }), penalty({ amount: -250 }), penalty({ amount: 100 })]
    const tenthNight = mn({ totalLights: 10, pairs: [tenPairs[0], tenPairs[1]] })

    const result = computeSeasonFinale(matchboxes, [], tenthNight, penalties, 10000)

    expect(result.kind).toBe('all-lights-jackpot')
    if (result.kind === 'all-lights-jackpot') {
      // 10000 - 1000 - 750 + 100, geteilt durch 4 Personen
      expect(result.totalPoolEuro).toBe(8350)
      expect(result.perRecipientEuro).toBe(2087.5)
    }
  })

  it('lists only deductions (negative prices) as seller payouts on a non-all-lights night', () => {
    const matchboxes = [
      mb({ matchType: 'sold', price: -20, buyer: 'Alex', woman: 'Emma', man: 'Bennett' }),
      mb({ matchType: 'sold', price: 30, buyer: 'Sam' }) // positive price: bonus, excluded
    ]
    const matchingNights = [mn({ matchType: 'sold', price: -10, buyer: 'Chris', name: 'Verkaufte MN' })]
    const tenthNight = mn({ totalLights: 7 })

    const result = computeSeasonFinale(matchboxes, matchingNights, tenthNight, [], 0)

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
    const result = computeSeasonFinale([], [], tenthNight, [], 0)
    expect(result.kind).toBe('seller-payouts')
  })

  it('skips deduction rows with no recorded buyer', () => {
    const matchboxes = [mb({ matchType: 'sold', price: -20, buyer: '' })]
    const tenthNight = mn({ totalLights: 5 })
    const result = computeSeasonFinale(matchboxes, [], tenthNight, [], 0)
    expect(result.kind).toBe('seller-payouts')
    if (result.kind === 'seller-payouts') {
      expect(result.rows).toEqual([])
      expect(result.totalDeductionsEuro).toBe(20)
    }
  })
})
