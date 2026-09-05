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
  const maxPerWoman = Math.ceil(men.length / women.length)
  const valid: Array<Record<string, string>> = []

  function backtrack(menIndex: number, assignment: Record<string, string>, womanUsage: Record<string, number>) {
    if (menIndex === men.length) {
      for (const cer of ceremonies) {
        for (const known of cer.knownPerfectMatches) {
          if (assignment[known.man] !== known.woman) return
        }
        let correct = 0
        for (const pair of cer.pairs) {
          if (assignment[pair.man] === pair.woman) correct++
        }
        if (correct !== cer.correctCount) return
      }
      valid.push({ ...assignment })
      return
    }
    const man = men[menIndex]
    for (const woman of women) {
      const forbidden = boxDecisions.some(d => d.man === man && d.woman === woman && !d.isPerfectMatch)
      if (forbidden) continue
      const requiredElsewhere = boxDecisions.some(
        d => d.man === man && d.isPerfectMatch && d.woman !== woman
      )
      if (requiredElsewhere) continue
      if ((womanUsage[woman] ?? 0) >= maxPerWoman) continue
      assignment[man] = woman
      womanUsage[woman] = (womanUsage[woman] ?? 0) + 1
      backtrack(menIndex + 1, assignment, womanUsage)
      womanUsage[woman]--
      delete assignment[man]
    }
  }

  backtrack(0, {}, {})

  const matrix: Record<string, Record<string, number>> = {}
  for (const woman of women) {
    matrix[woman] = {}
    for (const man of men) {
      const count = valid.filter(a => a[man] === woman).length
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

  it('gives exactly 1/nWomen for every pair when there are fewer men than women (no constraints)', async () => {
    // Matches the real current season shape (fewer men than women): every specific
    // man/woman pair is equally likely regardless of the exact counts.
    const result = await calculateProbabilities(
      input({ men: ['A', 'B'], women: ['X', 'Y', 'Z'] })
    )
    expect(result.totalValidMatchings).toBe(6) // P(3,2) = 3*2
    for (const woman of ['X', 'Y', 'Z']) {
      for (const man of ['A', 'B']) {
        expect(result.probabilityMatrix[woman][man]).toBeCloseTo(1 / 3)
      }
    }
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
    // P(11,10) = 11! = 39,916,800 — must be fully, exactly enumerated, no truncation.
    expect(result.totalValidMatchings).toBe(39_916_800)
    expect(result.limitReached).toBe(false)
  }, 30_000)
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
