import { describe, expect, it } from 'vitest'
import { MatchingNightService, type MatchingNightFormInput } from './matchingNightService'
import type { Matchbox, Participant } from '@/types'

const now = new Date()

function participant(name: string, gender: 'F' | 'M'): Participant {
  return { seasonId: 1, name, knownFrom: '', gender }
}

function mb(overrides: Partial<Matchbox>): Matchbox {
  return { seasonId: 1, woman: 'W', man: 'M', matchType: 'perfect', createdAt: now, updatedAt: now, ...overrides }
}

const women = ['Emma', 'Julia', 'Christin', 'Francesca', 'Janice', 'Jenny', 'Joena', 'Marta', 'Michelle', 'Zoe']
const men = ['Bennett', 'Fabi', 'Brian', 'Cansin', 'Daymian', 'Germain', 'Johannes', 'Marwin', 'Raúl', 'Robin']
const participants = [...women.map(n => participant(n, 'F')), ...men.map(n => participant(n, 'M'))]

function completePairs(): Array<{ woman: string; man: string }> {
  return women.map((w, i) => ({ woman: w, man: men[i] }))
}

function baseForm(overrides: Partial<MatchingNightFormInput> = {}): MatchingNightFormInput {
  return {
    matchType: 'normal',
    totalLights: 0,
    pairs: completePairs(),
    ...overrides
  }
}

describe('MatchingNightService.validateMatchingNightForm', () => {
  it('accepts ten complete, correctly-gendered pairs with no perfect matches yet', () => {
    expect(MatchingNightService.validateMatchingNightForm(baseForm(), participants, [])).toBeNull()
  })

  it('requires exactly ten complete pairs', () => {
    const form = baseForm({ pairs: completePairs().slice(0, 5) })
    expect(MatchingNightService.validateMatchingNightForm(form, participants, [])).toMatch('5/10')
  })

  it('rejects a pair with a man in the woman field or vice versa (KRITISCH)', () => {
    const pairs = completePairs()
    pairs[0] = { woman: 'Bennett', man: 'Emma' }
    const form = baseForm({ pairs })
    expect(MatchingNightService.validateMatchingNightForm(form, participants, [])).toMatch('Ungültige Platzierung')
  })

  it('requires totalLights to be at least the number of already-confirmed perfect matches', () => {
    const matchboxes = [mb({ woman: 'Emma', man: 'Bennett', matchType: 'perfect', ausstrahlungsdatum: '2020-01-01', ausstrahlungszeit: '20:00' })]
    const form = baseForm({ totalLights: 0 })
    expect(MatchingNightService.validateMatchingNightForm(form, participants, matchboxes)).toMatch('sichere Lichter')
  })

  it('accepts totalLights that covers the confirmed perfect matches', () => {
    const matchboxes = [mb({ woman: 'Emma', man: 'Bennett', matchType: 'perfect', ausstrahlungsdatum: '2020-01-01', ausstrahlungszeit: '20:00' })]
    const form = baseForm({ totalLights: 1 })
    expect(MatchingNightService.validateMatchingNightForm(form, participants, matchboxes)).toBeNull()
  })

  it('rejects totalLights above 10 for a normal matching night', () => {
    const form = baseForm({ totalLights: 11 })
    expect(MatchingNightService.validateMatchingNightForm(form, participants, [])).toMatch('Maximum 10 Lichter')
  })

  it('requires a price and buyer for a sold matching night, and skips the lights checks', () => {
    const form = baseForm({ matchType: 'sold' })
    const errors = MatchingNightService.validateMatchingNightForm(form, participants, [])
    expect(errors).toMatch('Betrag angegeben werden')
  })

  it('accepts a fully specified sold matching night', () => {
    const form = baseForm({ matchType: 'sold', price: -50, buyer: 'Alex' })
    expect(MatchingNightService.validateMatchingNightForm(form, participants, [])).toBeNull()
  })
})
