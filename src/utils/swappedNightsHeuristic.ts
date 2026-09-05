import type { MatchingNight, Pair, Participant } from '@/types'

export interface SwappedMatchingNightFix {
  night: MatchingNight
  correctedPairs: Pair[]
}

/**
 * Erkennt Matching Nights, deren Frau/Mann-Felder vertauscht wurden (Mehrheit der im
 * "man"-Feld stehenden Namen ist tatsächlich weiblich), und liefert dafür bereits die
 * korrigierten (zurückgetauschten) Paare mit. Reine Erkennungs-/Reparatur-Logik ohne
 * Datenbank- oder UI-Seiteneffekte (ODI-281).
 */
export function findSwappedMatchingNights(
  matchingNights: MatchingNight[],
  participants: Participant[]
): SwappedMatchingNightFix[] {
  const menNames = participants.filter(p => p.gender === 'M').map(p => p.name)
  const womenNames = participants.filter(p => p.gender === 'F').map(p => p.name)

  const fixes: SwappedMatchingNightFix[] = []

  for (const night of matchingNights) {
    const menInNight = new Set(night.pairs.map(p => p.man))

    const menNamesInMenField = Array.from(menInNight).filter(name => menNames.includes(name))
    const womenNamesInMenField = Array.from(menInNight).filter(name => womenNames.includes(name))

    const isSwapped = womenNamesInMenField.length > menNamesInMenField.length

    if (isSwapped) {
      fixes.push({
        night,
        correctedPairs: night.pairs.map(pair => ({
          woman: pair.man,
          man: pair.woman
        }))
      })
    }
  }

  return fixes
}
