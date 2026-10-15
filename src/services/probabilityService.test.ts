import { describe, expect, it } from 'vitest'
import { calculateProbabilities, generateDataHash } from './probabilityService'
import type { BoxDecision, CeremonyConstraint, ProbabilityInput } from '@/types'

function input(overrides: Partial<ProbabilityInput>): ProbabilityInput {
  return { men: [], women: [], ceremonies: [], boxDecisions: [], ...overrides }
}

/**
 * Naiver Referenz-Algorithmus (bewusst unabhängig von probabilityService.ts, auch wenn er
 * die gleiche Semantik wie die ursprüngliche generate-then-filter-Implementierung abbildet):
 * generiert ALLE möglichen Zuordnungen ohne jedes Pruning und filtert danach stur per
 * String-Vergleich. Dient nur als Test-Orakel für die differenziellen Tests unten.
 */
function bruteForceReference(inp: ProbabilityInput): { matrix: Record<string, Record<string, number>>; total: number } {
  const { men, women, ceremonies, boxDecisions } = inp
  // Modell (ODI-367): größere Seite = genau ein Partner pro Person, jede Person der kleineren
  // Seite mindestens einen. Hier bewusst naiv: ALLE Funktionen Treiber -> Ziel erzeugen, danach
  // stur filtern (Abdeckung, Box-Entscheidungen, Zeremonien).
  const menAreDrivers = men.length >= women.length
  const drivers = menAreDrivers ? men : women
  const targets = menAreDrivers ? women : men
  const valid: Array<Record<string, string>> = []

  const hasPair = (assignment: Record<string, string>, woman: string, man: string) =>
    menAreDrivers ? assignment[man] === woman : assignment[woman] === man

  function backtrack(index: number, assignment: Record<string, string>) {
    if (index === drivers.length) {
      if (!targets.every(t => Object.values(assignment).includes(t))) return
      for (const d of boxDecisions) {
        const present = hasPair(assignment, d.woman, d.man)
        if (d.isPerfectMatch !== present) return
      }
      for (const cer of ceremonies) {
        for (const known of cer.knownPerfectMatches) {
          if (!hasPair(assignment, known.woman, known.man)) return
        }
        const correct = cer.pairs.filter(p => hasPair(assignment, p.woman, p.man)).length
        if (correct !== cer.correctCount) return
      }
      valid.push({ ...assignment })
      return
    }
    for (const target of targets) {
      assignment[drivers[index]] = target
      backtrack(index + 1, assignment)
    }
    delete assignment[drivers[index]]
  }

  backtrack(0, {})

  const matrix: Record<string, Record<string, number>> = {}
  for (const woman of women) {
    matrix[woman] = {}
    for (const man of men) {
      const count = valid.filter(a => hasPair(a, woman, man)).length
      matrix[woman][man] = valid.length > 0 ? count / valid.length : 0
    }
  }

  return { matrix, total: valid.length }
}

describe('calculateProbabilities — reference example (daturkel/ayto README)', () => {
  it('matches the externally published worked example exactly', async () => {
    const boxDecisions: BoxDecision[] = [{ woman: 'Daisy', man: 'Albert', isPerfectMatch: false }]
    const ceremonies: CeremonyConstraint[] = [
      {
        pairs: [
          { woman: 'Emily', man: 'Albert' },
          { woman: 'Daisy', man: 'Bill' },
          { woman: 'Faith', man: 'Carl' }
        ],
        correctCount: 1,
        knownPerfectMatches: []
      }
    ]

    const result = await calculateProbabilities(
      input({ men: ['Albert', 'Bill', 'Carl'], women: ['Daisy', 'Emily', 'Faith'], ceremonies, boxDecisions })
    )

    expect(result.totalValidMatchings).toBe(2)
    expect(result.limitReached).toBe(false)
    expect(result.probabilityMatrix).toEqual({
      Daisy: { Albert: 0, Bill: 0.5, Carl: 0.5 },
      Emily: { Albert: 0.5, Bill: 0, Carl: 0.5 },
      Faith: { Albert: 0.5, Bill: 0.5, Carl: 0 }
    })
  })

  it('has 6 scenarios with no constraints and 4 after just the Truth Booth', async () => {
    const noConstraints = await calculateProbabilities(input({ men: ['Albert', 'Bill', 'Carl'], women: ['Daisy', 'Emily', 'Faith'] }))
    expect(noConstraints.totalValidMatchings).toBe(6)

    const afterTruthBooth = await calculateProbabilities(
      input({
        men: ['Albert', 'Bill', 'Carl'],
        women: ['Daisy', 'Emily', 'Faith'],
        boxDecisions: [{ woman: 'Daisy', man: 'Albert', isPerfectMatch: false }]
      })
    )
    expect(afterTruthBooth.totalValidMatchings).toBe(4)
  })
})

describe('calculateProbabilities — basic properties', () => {
  it('gives a uniform 1/n distribution with equal counts and no constraints', async () => {
    const result = await calculateProbabilities(input({ men: ['A', 'B', 'C'], women: ['X', 'Y', 'Z'] }))
    expect(result.totalValidMatchings).toBe(6) // 3!
    for (const woman of ['X', 'Y', 'Z']) {
      for (const man of ['A', 'B', 'C']) {
        expect(result.probabilityMatrix[woman][man]).toBeCloseTo(1 / 3)
      }
    }
  })

  it('gives every woman exactly one man and every man at least one when there are fewer men than women (ODI-367)', async () => {
    // 2 Männer, 3 Frauen: jede Frau hat genau einen Mann, jeder Mann mindestens eine Frau.
    // Das sind alle surjektiven Zuordnungen der 3 Frauen auf die 2 Männer: 2^3 - 2 = 6.
    const result = await calculateProbabilities(
      input({ men: ['A', 'B'], women: ['X', 'Y', 'Z'] })
    )
    expect(result.totalValidMatchings).toBe(6)
    for (const woman of ['X', 'Y', 'Z']) {
      const rowSum = Object.values(result.probabilityMatrix[woman]).reduce((a, b) => a + b, 0)
      expect(rowSum).toBeCloseTo(1, 10)
      for (const man of ['A', 'B']) {
        expect(result.probabilityMatrix[woman][man]).toBeCloseTo(1 / 2, 10)
      }
    }
  })

  it('lets exactly one woman have two men when there is one more man than women (ODI-367)', async () => {
    // 3 Männer, 2 Frauen: jeder Mann genau eine Frau, jede Frau mindestens einen Mann -
    // also hat genau eine Frau zwei Männer (Doppelmatch). Surjektionen 3 -> 2: 2^3 - 2 = 6.
    const result = await calculateProbabilities(input({ men: ['A', 'B', 'C'], women: ['X', 'Y'] }))
    expect(result.totalValidMatchings).toBe(6)
    for (const man of ['A', 'B', 'C']) {
      const columnSum = result.probabilityMatrix.X[man] + result.probabilityMatrix.Y[man]
      expect(columnSum).toBeCloseTo(1, 10)
      expect(result.probabilityMatrix.X[man]).toBeCloseTo(1 / 2, 10)
    }
    // In der Hälfte der Lösungen hat X zwei Männer, in der anderen Y: jede Zeile = 1,5
    for (const woman of ['X', 'Y']) {
      const rowSum = Object.values(result.probabilityMatrix[woman]).reduce((a, b) => a + b, 0)
      expect(rowSum).toBeCloseTo(1.5, 10)
    }
  })

  it('finds the doubled woman from the constraints alone (ODI-367)', async () => {
    // X-A und Y-B sind bestätigt, C muss bei X oder Y landen -> genau zwei Lösungen,
    // in denen X bzw. Y zwei Männer hat. Nichts muss als Doppelmatch eingetragen werden.
    const result = await calculateProbabilities(
      input({
        men: ['A', 'B', 'C'],
        women: ['X', 'Y'],
        boxDecisions: [
          { woman: 'X', man: 'A', isPerfectMatch: true },
          { woman: 'Y', man: 'B', isPerfectMatch: true }
        ]
      })
    )
    expect(result.totalValidMatchings).toBe(2)
    expect(result.probabilityMatrix.X.C).toBeCloseTo(0.5, 10)
    expect(result.probabilityMatrix.Y.C).toBeCloseTo(0.5, 10)
  })

  it('reports both pairs of a doubled woman as fixed once the constraints pin her down (ODI-367)', async () => {
    const result = await calculateProbabilities(
      input({
        men: ['A', 'B', 'C'],
        women: ['X', 'Y'],
        boxDecisions: [
          { woman: 'X', man: 'A', isPerfectMatch: true },
          { woman: 'Y', man: 'B', isPerfectMatch: true },
          { woman: 'Y', man: 'C', isPerfectMatch: false }
        ]
      })
    )
    expect(result.totalValidMatchings).toBe(1)
    expect(result.fixedPairs).toEqual(
      expect.arrayContaining([
        { woman: 'X', man: 'A' },
        { woman: 'Y', man: 'B' },
        { woman: 'X', man: 'C' }
      ])
    )
    expect(result.fixedPairs).toHaveLength(3)
  })

  it('confirms a pair with probability 1.0 as a fixed pair', async () => {
    const result = await calculateProbabilities(
      input({
        men: ['A', 'B'],
        women: ['X', 'Y'],
        boxDecisions: [{ woman: 'X', man: 'A', isPerfectMatch: true }]
      })
    )
    expect(result.totalValidMatchings).toBe(1)
    expect(result.fixedPairs).toEqual(
      expect.arrayContaining([
        { woman: 'X', man: 'A' },
        { woman: 'Y', man: 'B' }
      ])
    )
  })

  it('returns an all-zero matrix for contradictory box decisions', async () => {
    const result = await calculateProbabilities(
      input({
        men: ['A', 'B'],
        women: ['X', 'Y'],
        boxDecisions: [
          { woman: 'X', man: 'A', isPerfectMatch: true },
          { woman: 'Y', man: 'A', isPerfectMatch: true }
        ]
      })
    )
    expect(result.totalValidMatchings).toBe(0)
    expect(result.probabilityMatrix.X.A).toBe(0)
    expect(result.probabilityMatrix.Y.B).toBe(0)
  })

  it('never reports limitReached for realistic season sizes (10 vs 11)', async () => {
    const men = Array.from({ length: 10 }, (_, i) => `M${i}`)
    const women = Array.from({ length: 11 }, (_, i) => `W${i}`)
    const result = await calculateProbabilities(input({ men, women }))
    // Jede der 11 Frauen genau einen der 10 Männer, jeder Mann mindestens eine Frau:
    // C(11,2) * 10! = 199,584,000 — must be fully, exactly enumerated, no truncation.
    expect(result.totalValidMatchings).toBe(199_584_000)
    expect(result.limitReached).toBe(false)
  }, 120_000)
})

describe('calculateProbabilities — allValidMatchings (ODI-358)', () => {
  it('collects every individual solution when the count is well below the threshold', async () => {
    const result = await calculateProbabilities(input({ men: ['A', 'B', 'C'], women: ['X', 'Y', 'Z'] }))

    expect(result.totalValidMatchings).toBe(6)
    expect(result.allValidMatchings).toHaveLength(6)
    for (const solution of result.allValidMatchings ?? []) {
      expect(solution.pairs).toHaveLength(3)
    }
    // Jede der 6 Permutationen von {A,B,C} auf {X,Y,Z} muss genau einmal vorkommen
    const asStrings = (result.allValidMatchings ?? []).map(s =>
      [...s.pairs].sort((a, b) => a.man.localeCompare(b.man)).map(p => `${p.man}:${p.woman}`).join(',')
    )
    expect(new Set(asStrings).size).toBe(6)
  })

  it('lists a doubled woman in two pairs of the same solution (ODI-367)', async () => {
    const result = await calculateProbabilities(input({ men: ['A', 'B', 'C'], women: ['X', 'Y'] }))

    expect(result.totalValidMatchings).toBe(6)
    expect(result.allValidMatchings).toHaveLength(6)
    for (const solution of result.allValidMatchings ?? []) {
      // Jeder der 3 Männer hat genau eine Frau, genau eine Frau kommt zweimal vor
      expect(solution.pairs).toHaveLength(3)
      const perWoman = ['X', 'Y'].map(w => solution.pairs.filter(p => p.woman === w).length).sort()
      expect(perWoman).toEqual([1, 2])
    }
  })

  it('does not collect the individual solutions once the count exceeds the threshold', async () => {
    // 5! = 120 > FULL_MATCHING_LIST_THRESHOLD (50)
    const men = Array.from({ length: 5 }, (_, i) => `M${i}`)
    const women = Array.from({ length: 5 }, (_, i) => `W${i}`)
    const result = await calculateProbabilities(input({ men, women }))

    expect(result.totalValidMatchings).toBe(120)
    expect(result.allValidMatchings).toBeUndefined()
  })

  it('gibt eine leere Liste zurück, wenn die Constraints widersprüchlich sind (0 Lösungen)', async () => {
    const result = await calculateProbabilities(
      input({
        men: ['A', 'B'],
        women: ['X', 'Y'],
        boxDecisions: [
          { woman: 'X', man: 'A', isPerfectMatch: true },
          { woman: 'Y', man: 'A', isPerfectMatch: true }
        ]
      })
    )

    expect(result.totalValidMatchings).toBe(0)
    expect(result.allValidMatchings).toEqual([])
  })
})

describe('calculateProbabilities — differential tests vs. a naive reference', () => {
  const cases: ProbabilityInput[] = [
    input({ men: ['A', 'B', 'C', 'D'], women: ['W', 'X', 'Y', 'Z'] }),
    input({
      men: ['A', 'B', 'C', 'D'],
      women: ['W', 'X', 'Y', 'Z'],
      boxDecisions: [{ woman: 'W', man: 'A', isPerfectMatch: false }]
    }),
    input({
      men: ['A', 'B', 'C'],
      women: ['W', 'X', 'Y', 'Z'],
      boxDecisions: [{ woman: 'W', man: 'A', isPerfectMatch: true }]
    }),
    input({
      men: ['A', 'B', 'C', 'D'],
      women: ['W', 'X'],
      // 4 men, 2 women -> some women get 2 men (Doppelmatch-style multi-assignment)
    }),
    input({
      men: ['A', 'B', 'C'],
      women: ['W', 'X', 'Y'],
      ceremonies: [
        {
          pairs: [
            { woman: 'W', man: 'A' },
            { woman: 'X', man: 'B' },
            { woman: 'Y', man: 'C' }
          ],
          correctCount: 2,
          knownPerfectMatches: []
        }
      ]
    }),
    // Mehr Männer als Frauen (Doppelmatch einer Frau) mit Zeremonie und Box-Entscheidungen (ODI-367)
    input({
      men: ['A', 'B', 'C', 'D'],
      women: ['W', 'X', 'Y'],
      boxDecisions: [
        { woman: 'W', man: 'A', isPerfectMatch: true },
        { woman: 'X', man: 'B', isPerfectMatch: false }
      ],
      ceremonies: [
        {
          pairs: [
            { woman: 'W', man: 'A' },
            { woman: 'X', man: 'C' },
            { woman: 'Y', man: 'D' }
          ],
          correctCount: 2,
          knownPerfectMatches: [{ woman: 'W', man: 'A' }]
        }
      ]
    }),
    // Mehr Frauen als Männer (Doppelmatch eines Mannes) mit Zeremonie (ODI-367)
    input({
      men: ['A', 'B', 'C'],
      women: ['W', 'X', 'Y', 'Z'],
      boxDecisions: [{ woman: 'Z', man: 'C', isPerfectMatch: false }],
      ceremonies: [
        {
          pairs: [
            { woman: 'W', man: 'A' },
            { woman: 'X', man: 'B' },
            { woman: 'Y', man: 'C' }
          ],
          correctCount: 1,
          knownPerfectMatches: []
        }
      ]
    })
  ]

  it.each(cases.map((c, i) => [i, c] as const))('case %i matches the naive reference exactly', async (_i, testInput) => {
    const reference = bruteForceReference(testInput)
    const actual = await calculateProbabilities(testInput)

    expect(actual.totalValidMatchings).toBe(reference.total)
    for (const woman of testInput.women) {
      for (const man of testInput.men) {
        expect(actual.probabilityMatrix[woman][man]).toBeCloseTo(reference.matrix[woman][man], 10)
      }
    }
  })
})

describe('generateDataHash', () => {
  it('is stable regardless of array order', () => {
    const a = generateDataHash(input({ men: ['A', 'B'], women: ['X', 'Y'] }))
    const b = generateDataHash(input({ men: ['B', 'A'], women: ['Y', 'X'] }))
    expect(a).toBe(b)
  })

  it('changes when the input changes', () => {
    const a = generateDataHash(input({ men: ['A', 'B'], women: ['X', 'Y'] }))
    const b = generateDataHash(
      input({ men: ['A', 'B'], women: ['X', 'Y'], boxDecisions: [{ woman: 'X', man: 'A', isPerfectMatch: true }] })
    )
    expect(a).not.toBe(b)
  })
})
