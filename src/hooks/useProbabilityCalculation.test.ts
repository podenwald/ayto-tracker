import { describe, expect, it } from 'vitest'
import { convertToProbabilityInput } from './useProbabilityCalculation'
import { calculateProbabilities } from '@/services/probabilityService'
import type { Participant, MatchingNight, Matchbox } from '@/types'

function participant(name: string, gender: 'F' | 'M', overrides: Partial<Participant> = {}): Participant {
  return { id: 1, seasonId: 1, name, knownFrom: '', gender, status: 'Aktiv', active: true, ...overrides }
}

function night(
  id: number,
  pairs: Array<{ woman: string; man: string }>,
  totalLights: number,
  ausstrahlungsdatum: string
): MatchingNight {
  return { id, seasonId: 1, name: `Night ${id}`, date: ausstrahlungsdatum, pairs, totalLights, createdAt: new Date(ausstrahlungsdatum) }
}

function matchbox(woman: string, man: string, matchType: Matchbox['matchType'], overrides: Partial<Matchbox> = {}): Matchbox {
  return { id: 1, seasonId: 1, woman, man, matchType, createdAt: new Date(), updatedAt: new Date(), ...overrides }
}

describe('convertToProbabilityInput', () => {
  it('keeps a participant who simply sat out the most recent Matching Night (ODI regression)', () => {
    // Bug: die Berechnung schloss bisher jede Person aus, die nicht in den Paaren der
    // ZULETZT ausgestrahlten Matching Night vorkam - mit der (falschen) Annahme, sie hätte
    // bereits ihr Perfect Match gefunden. Bei einem Sitzplan mit "Bank"/Pausenrunde trifft
    // das aber nicht zu: die Person ist weiterhin aktiv, hat nur diese eine Night ausgesetzt.
    const participants: Participant[] = [
      participant('Emma', 'F'), participant('Alexandra', 'F'), participant('Janice', 'F'),
      participant('Bennett', 'M'), participant('Brian', 'M'), participant('Fabi', 'M')
    ]
    const nights: MatchingNight[] = [
      night(1, [{ woman: 'Emma', man: 'Fabi' }, { woman: 'Janice', man: 'Bennett' }, { woman: 'Alexandra', man: 'Brian' }], 2, '2026-08-19'),
      // Zweite Night: Janice und Fabi sitzen aus, sind aber NICHT als Perfect Match bestätigt
      night(2, [{ woman: 'Emma', man: 'Bennett' }, { woman: 'Alexandra', man: 'Brian' }], 1, '2026-09-01')
    ]

    const input = convertToProbabilityInput(participants, nights, [])

    expect(input.women).toContain('Janice')
    expect(input.men).toContain('Fabi')
    expect(input.women).toHaveLength(3)
    expect(input.men).toHaveLength(3)
  })

  it('still includes participants with a confirmed Perfect Match (for a complete probability matrix)', () => {
    const participants: Participant[] = [participant('Marta', 'F'), participant('Johannes', 'M')]
    const boxes: Matchbox[] = [matchbox('Marta', 'Johannes', 'perfect')]

    const input = convertToProbabilityInput(participants, [], boxes)

    expect(input.women).toContain('Marta')
    expect(input.men).toContain('Johannes')
  })

  it('excludes a Doppelmatch partner (no own matchbox row, but already "used up") from the pool', () => {
    // Janice hat keine eigene Matchbox-Zeile, ist aber als doppelmatchPartner von
    // Johannes (Marta + Johannes, isDoppelmatch) bereits vergeben - sie darf daher
    // nicht mehr als "noch offen" in men/women auftauchen (Nutzer-Hinweis zu ODI-354).
    const participants: Participant[] = [
      participant('Marta', 'F'), participant('Janice', 'F'), participant('Johannes', 'M')
    ]
    const boxes: Matchbox[] = [
      matchbox('Marta', 'Johannes', 'perfect', { isDoppelmatch: true, doppelmatchPartner: 'Janice' })
    ]

    const input = convertToProbabilityInput(participants, [], boxes)

    expect(input.women).not.toContain('Janice')
    expect(input.women).toContain('Marta')
    expect(input.men).toContain('Johannes')
  })
})

describe('calculateProbabilities — real-world regression (ODI-354)', () => {
  it('finds at least one valid matching for the reported production dataset, once absentees are no longer wrongly excluded', async () => {
    // Exakt der Datensatz aus dem Nutzer-Export vom 2026-09-18, der zuvor
    // "0 gültige Kombinationen" lieferte: Fabi (ohne Perfect Match, saß in Matching
    // Night #5 nur aus) fiel fälschlich komplett aus der Berechnung heraus. Janice
    // wird weiterhin korrekt ausgeschlossen, da sie als doppelmatchPartner von
    // Johannes bereits "verbraucht" ist.
    const women = ['Emma', 'Alexandra', 'Christin', 'Francesca', 'Janice', 'Jenny', 'Julia', 'Marta', 'Michelle', 'Zoe', 'Joena']
    const men = ['Bennett', 'Brian', 'Cansin', 'Daymian', 'Fabi', 'Germain', 'Marwin', 'Johannes', 'Raúl', 'Robin', 'Laurenz']
    const participants: Participant[] = [
      ...women.map(name => participant(name, 'F')),
      ...men.map(name => participant(name, 'M'))
    ]

    const nights: MatchingNight[] = [
      night(19, [
        { woman: 'Jenny', man: 'Robin' }, { woman: 'Marta', man: 'Johannes' }, { woman: 'Christin', man: 'Brian' },
        { woman: 'Alexandra', man: 'Raúl' }, { woman: 'Janice', man: 'Fabi' }, { woman: 'Julia', man: 'Daymian' },
        { woman: 'Zoe', man: 'Cansin' }, { woman: 'Francesca', man: 'Bennett' }, { woman: 'Emma', man: 'Germain' },
        { woman: 'Michelle', man: 'Marwin' }
      ], 3, '2026-08-19'),
      night(18, [
        { woman: 'Emma', man: 'Germain' }, { woman: 'Alexandra', man: 'Brian' }, { woman: 'Julia', man: 'Fabi' },
        { woman: 'Joena', man: 'Bennett' }, { woman: 'Christin', man: 'Robin' }, { woman: 'Jenny', man: 'Daymian' },
        { woman: 'Michelle', man: 'Marwin' }, { woman: 'Marta', man: 'Raúl' }, { woman: 'Janice', man: 'Johannes' },
        { woman: 'Zoe', man: 'Cansin' }
      ], 3, '2026-08-26'),
      night(20, [
        { woman: 'Michelle', man: 'Raúl' }, { woman: 'Christin', man: 'Robin' }, { woman: 'Alexandra', man: 'Germain' },
        { woman: 'Emma', man: 'Fabi' }, { woman: 'Jenny', man: 'Cansin' }, { woman: 'Zoe', man: 'Daymian' },
        { woman: 'Joena', man: 'Marwin' }, { woman: 'Francesca', man: 'Brian' }, { woman: 'Marta', man: 'Johannes' },
        { woman: 'Julia', man: 'Bennett' }
      ], 3, '2026-09-03'),
      night(612, [
        { woman: 'Francesca', man: 'Raúl' }, { woman: 'Zoe', man: 'Fabi' }, { woman: 'Jenny', man: 'Daymian' },
        { woman: 'Julia', man: 'Cansin' }, { woman: 'Emma', man: 'Marwin' }, { woman: 'Joena', man: 'Robin' },
        { woman: 'Michelle', man: 'Germain' }, { woman: 'Alexandra', man: 'Brian' }, { woman: 'Christin', man: 'Bennett' },
        { woman: 'Marta', man: 'Johannes' }
      ], 4, '2026-09-09'),
      night(613, [
        { woman: 'Zoe', man: 'Laurenz' }, { woman: 'Alexandra', man: 'Brian' }, { woman: 'Emma', man: 'Germain' },
        { woman: 'Francesca', man: 'Marwin' }, { woman: 'Jenny', man: 'Daymian' }, { woman: 'Joena', man: 'Robin' },
        { woman: 'Marta', man: 'Johannes' }, { woman: 'Christin', man: 'Bennett' }, { woman: 'Julia', man: 'Cansin' },
        { woman: 'Michelle', man: 'Raúl' }
      ], 3, '2026-09-16')
    ]

    const boxes: Matchbox[] = [
      matchbox('Christin', 'Marwin', 'no-match', { ausstrahlungsdatum: '2026-08-12' }),
      matchbox('Marta', 'Robin', 'no-match', { ausstrahlungsdatum: '2026-08-19' }),
      matchbox('Julia', 'Daymian', 'no-match', { ausstrahlungsdatum: '2026-08-26' }),
      matchbox('Marta', 'Johannes', 'perfect', { ausstrahlungsdatum: '2026-09-02', isDoppelmatch: true, doppelmatchPartner: 'Janice' }),
      matchbox('Julia', 'Bennett', 'no-match', { ausstrahlungsdatum: '2026-09-09' })
    ]

    const input = convertToProbabilityInput(participants, nights, boxes)
    // Janice ausgeschlossen (Doppelmatch-Partnerin ohne eigene Matchbox-Zeile), Fabi enthalten.
    expect(input.women).toHaveLength(10)
    expect(input.women).not.toContain('Janice')
    expect(input.men).toHaveLength(11)
    expect(input.men).toContain('Fabi')
    // Genau eine Frau (Janice) wurde wegen Doppelmatch entfernt -> genau ein Platzhalter (ODI-355).
    expect(input.placeholderSlots).toBe(1)

    const result = await calculateProbabilities(input)
    expect(result.totalValidMatchings).toBeGreaterThan(0)

    // ODI-355 Regressionsschutz: Ohne den placeholderSlots-Fix konnte JEDE Frau in
    // manchen Lösungen zwei Männer gleichzeitig bekommen (der Männer-Überschuss durch
    // das Ausschließen von Janice wurde fälschlich beliebig verteilt statt über einen
    // internen Platzhalter absorbiert) - die Zeile einer Frau summierte sich dann auf
    // über 100% statt auf exakt 100%.
    for (const woman of input.women) {
      const rowSum = Object.values(result.probabilityMatrix[woman]).reduce((a, b) => a + b, 0)
      expect(rowSum).toBeCloseTo(1, 5)
    }
  }, 30_000)
})

describe('calculateProbabilities — real-world regression (ODI-364)', () => {
  it('reduces correctCount for a Matching Night that contains a Doppelmatch-Sitzpaar (Janice-Johannes)', async () => {
    // Bug: Janice+Johannes saßen in Matching Night #2 zusammen - ein garantiert korrektes
    // Paar (Doppelmatch), das aber aus `women`/pairsIdx verschwindet, weil Janice keine eigene
    // Zeile hat. Ohne Korrektur verlangte die Suche fälschlich 3 statt 2 korrekte Paare unter
    // den restlichen 9 getrackten Paaren dieser Night und verwarf dadurch echte Lösungen -
    // die App zeigte nur noch 1 statt der tatsächlich 3 gültigen Kombinationen (u.a. wurde
    // "Julia & Fabi" fälschlich als 100% sicher angezeigt, obwohl auch "Julia & Robin" möglich ist).
    const women = ['Emma', 'Alexandra', 'Christin', 'Francesca', 'Janice', 'Jenny', 'Julia', 'Marta', 'Michelle', 'Zoe', 'Joena']
    const men = ['Bennett', 'Brian', 'Cansin', 'Daymian', 'Fabi', 'Germain', 'Marwin', 'Johannes', 'Raúl', 'Robin', 'Laurenz']
    const participants: Participant[] = [
      ...women.map(name => participant(name, 'F')),
      ...men.map(name => participant(name, 'M'))
    ]

    const nights: MatchingNight[] = [
      night(19, [
        { woman: 'Jenny', man: 'Robin' }, { woman: 'Marta', man: 'Johannes' }, { woman: 'Christin', man: 'Brian' },
        { woman: 'Alexandra', man: 'Raúl' }, { woman: 'Janice', man: 'Fabi' }, { woman: 'Julia', man: 'Daymian' },
        { woman: 'Zoe', man: 'Cansin' }, { woman: 'Francesca', man: 'Bennett' }, { woman: 'Emma', man: 'Germain' },
        { woman: 'Michelle', man: 'Marwin' }
      ], 3, '2026-08-19'),
      night(18, [
        { woman: 'Emma', man: 'Germain' }, { woman: 'Alexandra', man: 'Brian' }, { woman: 'Julia', man: 'Fabi' },
        { woman: 'Joena', man: 'Bennett' }, { woman: 'Christin', man: 'Robin' }, { woman: 'Jenny', man: 'Daymian' },
        { woman: 'Michelle', man: 'Marwin' }, { woman: 'Marta', man: 'Raúl' }, { woman: 'Janice', man: 'Johannes' },
        { woman: 'Zoe', man: 'Cansin' }
      ], 3, '2026-08-26'),
      night(20, [
        { woman: 'Michelle', man: 'Raúl' }, { woman: 'Christin', man: 'Robin' }, { woman: 'Alexandra', man: 'Germain' },
        { woman: 'Emma', man: 'Fabi' }, { woman: 'Jenny', man: 'Cansin' }, { woman: 'Zoe', man: 'Daymian' },
        { woman: 'Joena', man: 'Marwin' }, { woman: 'Francesca', man: 'Brian' }, { woman: 'Marta', man: 'Johannes' },
        { woman: 'Julia', man: 'Bennett' }
      ], 3, '2026-09-03'),
      night(612, [
        { woman: 'Francesca', man: 'Raúl' }, { woman: 'Zoe', man: 'Fabi' }, { woman: 'Jenny', man: 'Daymian' },
        { woman: 'Julia', man: 'Cansin' }, { woman: 'Emma', man: 'Marwin' }, { woman: 'Joena', man: 'Robin' },
        { woman: 'Michelle', man: 'Germain' }, { woman: 'Alexandra', man: 'Brian' }, { woman: 'Christin', man: 'Bennett' },
        { woman: 'Marta', man: 'Johannes' }
      ], 4, '2026-09-09'),
      night(613, [
        { woman: 'Zoe', man: 'Laurenz' }, { woman: 'Alexandra', man: 'Brian' }, { woman: 'Emma', man: 'Germain' },
        { woman: 'Francesca', man: 'Marwin' }, { woman: 'Jenny', man: 'Daymian' }, { woman: 'Joena', man: 'Robin' },
        { woman: 'Marta', man: 'Johannes' }, { woman: 'Christin', man: 'Bennett' }, { woman: 'Julia', man: 'Cansin' },
        { woman: 'Michelle', man: 'Raúl' }
      ], 3, '2026-09-16'),
      night(614, [
        { woman: 'Alexandra', man: 'Brian' }, { woman: 'Joena', man: 'Robin' }, { woman: 'Jenny', man: 'Daymian' },
        { woman: 'Zoe', man: 'Cansin' }, { woman: 'Michelle', man: 'Fabi' }, { woman: 'Emma', man: 'Laurenz' },
        { woman: 'Christin', man: 'Bennett' }, { woman: 'Julia', man: 'Germain' }, { woman: 'Marta', man: 'Johannes' },
        { woman: 'Francesca', man: 'Marwin' }
      ], 5, '2026-09-23')
    ]

    const boxes: Matchbox[] = [
      matchbox('Christin', 'Marwin', 'no-match', { ausstrahlungsdatum: '2026-08-12' }),
      matchbox('Marta', 'Robin', 'no-match', { ausstrahlungsdatum: '2026-08-19' }),
      matchbox('Julia', 'Daymian', 'no-match', { ausstrahlungsdatum: '2026-08-26' }),
      matchbox('Marta', 'Johannes', 'perfect', { ausstrahlungsdatum: '2026-09-02', isDoppelmatch: true, doppelmatchPartner: 'Janice' }),
      matchbox('Julia', 'Bennett', 'no-match', { ausstrahlungsdatum: '2026-09-09' }),
      matchbox('Michelle', 'Raúl', 'no-match', { ausstrahlungsdatum: '2026-09-23' })
    ]

    const input = convertToProbabilityInput(participants, nights, boxes)

    // Die Zeremonie zu Matching Night #2 (id 18) enthält Janice-Johannes -> correctCount muss
    // um 1 reduziert sein (3 Lichter - 1 garantiert korrektes, nicht mehr getracktes Paar = 2).
    const mn2 = input.ceremonies.find(c => c.pairs.some(p => p.woman === 'Janice' && p.man === 'Johannes'))
    expect(mn2?.correctCount).toBe(2)

    const result = await calculateProbabilities(input)
    expect(result.totalValidMatchings).toBe(3)

    // "Julia & Fabi" darf NICHT mehr fälschlich als 100% sicher gelten (ODI-364) - auch
    // "Julia & Robin" muss in mindestens einer der verbleibenden Lösungen möglich sein.
    expect(result.probabilityMatrix.Julia.Fabi).toBeLessThan(1)
    expect(result.probabilityMatrix.Julia.Robin).toBeGreaterThan(0)
  }, 30_000)
})
