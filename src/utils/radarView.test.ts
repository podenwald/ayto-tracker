import { describe, expect, it } from 'vitest'
import { getOpenPairs, getTopMatchesPerPerson } from './radarView'
import type { Pair, ProbabilityMatrix } from '@/types'

describe('getOpenPairs', () => {
  it('sortiert absteigend nach Wahrscheinlichkeit', () => {
    const matrix: ProbabilityMatrix = {
      Anna: { Ben: 0.2, Carl: 0.8 },
      Doro: { Ben: 0.8, Carl: 0.2 }
    }
    const result = getOpenPairs(matrix, [], ['Anna', 'Doro'], ['Ben', 'Carl'])

    expect(result).toEqual([
      { woman: 'Anna', man: 'Carl', probability: 0.8 },
      { woman: 'Doro', man: 'Ben', probability: 0.8 },
      { woman: 'Anna', man: 'Ben', probability: 0.2 },
      { woman: 'Doro', man: 'Carl', probability: 0.2 }
    ])
  })

  it('bricht Gleichstände stabil alphabetisch (Frau, dann Mann)', () => {
    const matrix: ProbabilityMatrix = {
      Anna: { Ben: 0.5, Carl: 0.5 },
      Doro: { Ben: 0.5, Carl: 0.5 }
    }
    const result = getOpenPairs(matrix, [], ['Doro', 'Anna'], ['Carl', 'Ben'])

    expect(result.map(p => `${p.woman}-${p.man}`)).toEqual([
      'Anna-Ben',
      'Anna-Carl',
      'Doro-Ben',
      'Doro-Carl'
    ])
  })

  it('schließt Personen mit bestätigtem Perfect Match komplett aus (beide Seiten)', () => {
    const matrix: ProbabilityMatrix = {
      Anna: { Ben: 0, Carl: 1 },
      Doro: { Ben: 1, Carl: 0 }
    }
    const fixedPairs: Pair[] = [{ woman: 'Anna', man: 'Carl' }]

    const result = getOpenPairs(matrix, fixedPairs, ['Anna', 'Doro'], ['Ben', 'Carl'])

    expect(result).toEqual([{ woman: 'Doro', man: 'Ben', probability: 1 }])
  })

  it('gibt eine leere Liste zurück, wenn alle Matches bereits bestätigt sind', () => {
    const matrix: ProbabilityMatrix = { Anna: { Ben: 1 } }
    const fixedPairs: Pair[] = [{ woman: 'Anna', man: 'Ben' }]

    expect(getOpenPairs(matrix, fixedPairs, ['Anna'], ['Ben'])).toEqual([])
  })
})

describe('getTopMatchesPerPerson', () => {
  it('liefert für jede offene Person ihre Top-N-Kandidat*innen absteigend sortiert', () => {
    const matrix: ProbabilityMatrix = {
      Anna: { Ben: 0.1, Carl: 0.6, David: 0.3 }
    }
    const result = getTopMatchesPerPerson(matrix, [], ['Anna'], ['Ben', 'Carl', 'David'], 2)

    const anna = result.find(r => r.name === 'Anna')
    expect(anna?.topMatches).toEqual([
      { partnerName: 'Carl', probability: 0.6 },
      { partnerName: 'David', probability: 0.3 }
    ])
  })

  it('bestätigte Personen tauchen weder als eigener Eintrag noch als Kandidat*in bei anderen auf', () => {
    const matrix: ProbabilityMatrix = {
      Anna: { Ben: 0, Carl: 1 },
      Doro: { Ben: 1, Carl: 0 }
    }
    const fixedPairs: Pair[] = [{ woman: 'Anna', man: 'Carl' }]

    const result = getTopMatchesPerPerson(matrix, fixedPairs, ['Anna', 'Doro'], ['Ben', 'Carl'])

    expect(result.map(r => r.name)).toEqual(['Doro', 'Ben'])
    expect(result.find(r => r.name === 'Doro')?.topMatches).toEqual([
      { partnerName: 'Ben', probability: 1 }
    ])
    expect(result.find(r => r.name === 'Ben')?.topMatches).toEqual([
      { partnerName: 'Doro', probability: 1 }
    ])
  })

  it('gibt eine leere Liste zurück, wenn alle Matches bereits bestätigt sind', () => {
    const matrix: ProbabilityMatrix = { Anna: { Ben: 1 } }
    const fixedPairs: Pair[] = [{ woman: 'Anna', man: 'Ben' }]

    expect(getTopMatchesPerPerson(matrix, fixedPairs, ['Anna'], ['Ben'])).toEqual([])
  })
})
