/**
 * Ableitungslogik für die Radar-Ansicht der Wahrscheinlichkeits-Ergebnisse (ODI-356).
 * Reine Funktionen ohne React-Abhängigkeit, damit sie unabhängig testbar sind.
 */
import type { Pair, ProbabilityMatrix } from '@/types'

export interface OpenPair {
  woman: string
  man: string
  probability: number
}

export interface PersonRadarEntry {
  name: string
  gender: 'F' | 'M'
  topMatches: Array<{ partnerName: string; probability: number }>
}

function isConfirmed(name: string, fixedPairs: Pair[]): boolean {
  return fixedPairs.some(p => p.woman === name || p.man === name)
}

/** Absteigend nach Wahrscheinlichkeit, bei Gleichstand alphabetisch nach `tieBreakKey` (stabil, kein Flackern). */
function sortByProbabilityDesc<T extends { probability: number }>(
  items: T[],
  tieBreakKey: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    if (b.probability !== a.probability) return b.probability - a.probability
    return tieBreakKey(a).localeCompare(tieBreakKey(b))
  })
}

/**
 * Alle noch offenen (nicht bestätigten) Frau-Mann-Kombinationen, absteigend nach Wahrscheinlichkeit.
 * Bereits bestätigte Perfect Matches (aus fixedPairs) sind komplett ausgeschlossen, auf beiden Seiten.
 */
export function getOpenPairs(
  probabilityMatrix: ProbabilityMatrix,
  fixedPairs: Pair[],
  women: string[],
  men: string[]
): OpenPair[] {
  const openWomen = women.filter(w => !isConfirmed(w, fixedPairs))
  const openMen = men.filter(m => !isConfirmed(m, fixedPairs))

  const pairs: OpenPair[] = []
  for (const woman of openWomen) {
    for (const man of openMen) {
      pairs.push({ woman, man, probability: probabilityMatrix[woman]?.[man] ?? 0 })
    }
  }

  return sortByProbabilityDesc(pairs, p => `${p.woman}-${p.man}`)
}

/**
 * Für jede Person ohne bestätigten Perfect Match: ihre Top-N-Kandidat*innen (nur unter den
 * ebenfalls noch offenen Personen des anderen Geschlechts), absteigend nach Wahrscheinlichkeit.
 */
export function getTopMatchesPerPerson(
  probabilityMatrix: ProbabilityMatrix,
  fixedPairs: Pair[],
  women: string[],
  men: string[],
  topN = 3
): PersonRadarEntry[] {
  const openWomen = women.filter(w => !isConfirmed(w, fixedPairs))
  const openMen = men.filter(m => !isConfirmed(m, fixedPairs))

  const womenEntries: PersonRadarEntry[] = openWomen.map(woman => ({
    name: woman,
    gender: 'F',
    topMatches: sortByProbabilityDesc(
      openMen.map(man => ({ partnerName: man, probability: probabilityMatrix[woman]?.[man] ?? 0 })),
      m => m.partnerName
    ).slice(0, topN)
  }))

  const menEntries: PersonRadarEntry[] = openMen.map(man => ({
    name: man,
    gender: 'M',
    topMatches: sortByProbabilityDesc(
      openWomen.map(woman => ({ partnerName: woman, probability: probabilityMatrix[woman]?.[man] ?? 0 })),
      w => w.partnerName
    ).slice(0, topN)
  }))

  return [...womenEntries, ...menEntries]
}
