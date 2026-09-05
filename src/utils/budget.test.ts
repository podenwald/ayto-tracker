import { describe, expect, it } from 'vitest'
import { calculateBudget } from './budget'
import type { Matchbox, MatchingNight, Penalty } from '@/types'

const now = new Date()

function mb(overrides: Partial<Matchbox>): Matchbox {
  return { seasonId: 1, woman: 'W', man: 'M', matchType: 'no-match', createdAt: now, updatedAt: now, ...overrides }
}

function mn(overrides: Partial<MatchingNight>): MatchingNight {
  return { seasonId: 1, name: 'MN', date: '2026-01-01', pairs: [], createdAt: now, ...overrides }
}

function penalty(overrides: Partial<Penalty>): Penalty {
  return { seasonId: 1, participantName: 'P', reason: 'r', amount: 0, date: '2026-01-01', createdAt: now, ...overrides }
}

describe('calculateBudget', () => {
  it('starts from the starting budget when nothing else happened', () => {
    const result = calculateBudget([], [], [], 200000)
    expect(result).toEqual({ totalVerkauf: 0, totalPenalties: 0, totalCredits: 0, currentBalance: 200000 })
  })

  it('adds positive sold matchbox/matching night prices to the balance', () => {
    const matchboxes = [mb({ matchType: 'sold', price: 100 })]
    const matchingNights = [mn({ matchType: 'sold', price: 50 })]
    const result = calculateBudget(matchboxes, matchingNights, [], 1000)
    expect(result.totalVerkauf).toBe(150)
    expect(result.currentBalance).toBe(1150)
  })

  it('subtracts negative sold prices (a deduction) from the balance too', () => {
    const matchboxes = [mb({ matchType: 'sold', price: -20 })]
    const result = calculateBudget(matchboxes, [], [], 1000)
    expect(result.totalVerkauf).toBe(-20)
    expect(result.currentBalance).toBe(980)
  })

  it('splits penalties into negative-amount penalties and positive-amount credits', () => {
    const penalties = [penalty({ amount: -50 }), penalty({ amount: 30 })]
    const result = calculateBudget([], [], penalties, 1000)
    expect(result.totalPenalties).toBe(50)
    expect(result.totalCredits).toBe(30)
    expect(result.currentBalance).toBe(1000 - 50 + 30)
  })

  it('ignores non-sold matchboxes/matching nights for the Verkauf total', () => {
    const matchboxes = [mb({ matchType: 'perfect', price: 999 }), mb({ matchType: 'no-match' })]
    const result = calculateBudget(matchboxes, [], [], 1000)
    expect(result.totalVerkauf).toBe(0)
  })

  it('combines all four inputs correctly', () => {
    const matchboxes = [mb({ matchType: 'sold', price: 100 })]
    const matchingNights = [mn({ matchType: 'sold', price: -40 })]
    const penalties = [penalty({ amount: -10 }), penalty({ amount: 5 })]
    const result = calculateBudget(matchboxes, matchingNights, penalties, 500)
    // 500 + (100 - 40) - 10 + 5
    expect(result.currentBalance).toBe(555)
  })
})
