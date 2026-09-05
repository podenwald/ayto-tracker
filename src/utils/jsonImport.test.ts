import { describe, expect, it } from 'vitest'
import { normalizeLegacyParticipant } from './jsonImport'

describe('normalizeLegacyParticipant', () => {
  it('applies sensible defaults for a mostly-empty record', () => {
    const result = normalizeLegacyParticipant({}, 1)
    expect(result).toEqual({
      seasonId: 1,
      name: 'Unbekannt',
      knownFrom: '',
      age: undefined,
      status: 'Aktiv',
      active: true,
      photoUrl: '',
      source: '',
      bio: '',
      gender: 'F',
      socialMediaAccount: '',
      freeProfilePhotoUrl: ''
    })
  })

  it('maps legacy German/English gender values to F/M', () => {
    expect(normalizeLegacyParticipant({ gender: 'weiblich' }, 1).gender).toBe('F')
    expect(normalizeLegacyParticipant({ gender: 'female' }, 1).gender).toBe('F')
    expect(normalizeLegacyParticipant({ gender: 'm' }, 1).gender).toBe('M')
    expect(normalizeLegacyParticipant({ gender: 'männlich' }, 1).gender).toBe('M')
    expect(normalizeLegacyParticipant({ gender: 'male' }, 1).gender).toBe('M')
  })

  it('leaves an already-correct gender untouched', () => {
    expect(normalizeLegacyParticipant({ gender: 'F' }, 1).gender).toBe('F')
    expect(normalizeLegacyParticipant({ gender: 'M' }, 1).gender).toBe('M')
  })

  it('normalizes status case/language variants', () => {
    expect(normalizeLegacyParticipant({ status: 'active' }, 1).status).toBe('Aktiv')
    expect(normalizeLegacyParticipant({ status: 'inactive' }, 1).status).toBe('Inaktiv')
    expect(normalizeLegacyParticipant({ status: 'perfect match' }, 1).status).toBe('Perfekt Match')
  })

  it('treats active as true unless explicitly false', () => {
    expect(normalizeLegacyParticipant({}, 1).active).toBe(true)
    expect(normalizeLegacyParticipant({ active: false }, 1).active).toBe(false)
    expect(normalizeLegacyParticipant({ active: true }, 1).active).toBe(true)
  })

  it('parses a string age into a number', () => {
    expect(normalizeLegacyParticipant({ age: '25' }, 1).age).toBe(25)
    expect(normalizeLegacyParticipant({ age: 30 }, 1).age).toBe(30)
  })

  it('preserves the given name and seasonId', () => {
    const result = normalizeLegacyParticipant({ name: 'Emma' }, 42)
    expect(result.name).toBe('Emma')
    expect(result.seasonId).toBe(42)
  })
})
