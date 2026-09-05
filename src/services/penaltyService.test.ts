import { describe, expect, it } from 'vitest'
import { PenaltyService } from './penaltyService'

describe('PenaltyService.validatePenalty', () => {
  it('accepts a valid deduction (negative amount)', () => {
    expect(
      PenaltyService.validatePenalty({ participantName: 'Emma', reason: 'Kamera verdeckt', amount: -50, date: '2026-05-10' })
    ).toEqual([])
  })

  it('accepts a valid credit (positive amount)', () => {
    expect(
      PenaltyService.validatePenalty({ participantName: 'Emma', reason: 'Bonus', amount: 30, date: '2026-05-10' })
    ).toEqual([])
  })

  it('rejects a zero amount', () => {
    const errors = PenaltyService.validatePenalty({ participantName: 'Emma', reason: 'r', amount: 0, date: '2026-05-10' })
    expect(errors.some(e => e.includes('ungleich 0'))).toBe(true)
  })

  it('rejects a missing participant name or reason', () => {
    const errors = PenaltyService.validatePenalty({ amount: -10, date: '2026-05-10' })
    expect(errors).toContain('Teilnehmer-Name ist erforderlich')
    expect(errors).toContain('Grund ist erforderlich')
  })

  it('rejects a missing or malformed date', () => {
    expect(
      PenaltyService.validatePenalty({ participantName: 'Emma', reason: 'r', amount: -10 })
    ).toContain('Datum ist erforderlich')
    expect(
      PenaltyService.validatePenalty({ participantName: 'Emma', reason: 'r', amount: -10, date: '10.05.2026' })
    ).toContain('Datum muss im Format YYYY-MM-DD sein')
  })
})
