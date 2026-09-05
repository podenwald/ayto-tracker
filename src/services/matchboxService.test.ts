import { describe, expect, it } from 'vitest'
import { MatchboxService } from './matchboxService'
import type { Matchbox } from '@/types'

const now = new Date()

function mb(overrides: Partial<Matchbox>): Matchbox {
  return { seasonId: 1, woman: 'Emma', man: 'Bennett', matchType: 'no-match', createdAt: now, updatedAt: now, ...overrides }
}

describe('MatchboxService.validateMatchbox', () => {
  it('accepts a minimal valid no-match matchbox', () => {
    expect(MatchboxService.validateMatchbox({ woman: 'Emma', man: 'Bennett', matchType: 'no-match' })).toEqual([])
  })

  it('requires woman, man and a valid matchType', () => {
    const errors = MatchboxService.validateMatchbox({})
    expect(errors).toContain('Frau ist erforderlich')
    expect(errors).toContain('Mann ist erforderlich')
    expect(errors).toContain('Match-Typ muss perfect, no-match oder sold sein')
  })

  it('requires a price and buyer for sold matchboxes', () => {
    const errors = MatchboxService.validateMatchbox({ woman: 'Emma', man: 'Bennett', matchType: 'sold' })
    expect(errors).toContain('Betrag ist für verkaufte Matchboxes erforderlich (Plus = Einnahme, Minus = Ausgabe)')
    expect(errors).toContain('Käufer ist für verkaufte Matchboxes erforderlich')
  })

  it('accepts a fully specified sold matchbox', () => {
    const errors = MatchboxService.validateMatchbox({ woman: 'Emma', man: 'Bennett', matchType: 'sold', price: -20, buyer: 'Alex' })
    expect(errors).toEqual([])
  })

  it('requires a doppelmatch partner when isDoppelmatch is set', () => {
    const errors = MatchboxService.validateMatchbox({ woman: 'Emma', man: 'Bennett', matchType: 'perfect', isDoppelmatch: true })
    expect(errors).toContain('Zweite Partner*in ist für ein Doppelmatch erforderlich')
  })

  it('rejects a second doppelmatch in the same season', () => {
    const existing = [mb({ id: 1, matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Zoe' })]
    const errors = MatchboxService.validateMatchbox(
      { woman: 'Julia', man: 'Fabi', matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Marta' },
      existing
    )
    expect(errors).toContain('Es ist bereits ein Doppelmatch für diese Staffel erfasst')
  })

  it('allows editing the existing doppelmatch itself (excludeId)', () => {
    const existing = [mb({ id: 1, matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Zoe' })]
    const errors = MatchboxService.validateMatchbox(
      { woman: 'Emma', man: 'Bennett', matchType: 'perfect', isDoppelmatch: true, doppelmatchPartner: 'Zoe' },
      existing,
      1
    )
    expect(errors).not.toContain('Es ist bereits ein Doppelmatch für diese Staffel erfasst')
  })

  it('rejects an invalid broadcast time', () => {
    const errors = MatchboxService.validateMatchbox({
      woman: 'Emma',
      man: 'Bennett',
      matchType: 'no-match',
      ausstrahlungsdatum: '2026-05-10',
      ausstrahlungszeit: '25:99'
    })
    expect(errors.some(e => e.startsWith('Ungültige Broadcast-Zeit'))).toBe(true)
  })
})
