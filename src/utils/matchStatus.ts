import type { Gender, Matchbox, Participant } from '@/types'

/**
 * Namen aller Teilnehmer*innen mit einer bestätigten Perfect-Match-Matchbox.
 * Einzige Quelle für den "erledigt"-Status — nicht das persistierte
 * participant.active-Feld, das nach einem JSON-Reimport veralten kann.
 */
export const getConfirmedPerfectMatchNames = (matchboxes: Matchbox[]): Set<string> => {
  const names = new Set<string>()
  matchboxes
    .filter(mb => mb.matchType === 'perfect')
    .forEach(mb => {
      names.add(mb.woman)
      names.add(mb.man)
      if (mb.isDoppelmatch && mb.doppelmatchPartner) {
        names.add(mb.doppelmatchPartner)
      }
    })
  return names
}

/**
 * Zahlenmäßig kleineres Geschlecht im Kandidat*innen-Feld der Staffel.
 * Bestimmt, wessen Perfect Match ein Doppelmatch (zweite Partner*in aus dem
 * größeren Geschlecht) haben darf. null bei Gleichstand.
 */
export const getSmallerGender = (participants: Participant[]): Gender | null => {
  const womenCount = participants.filter(p => p.gender === 'F').length
  const menCount = participants.filter(p => p.gender === 'M').length
  if (womenCount === menCount) return null
  return womenCount < menCount ? 'F' : 'M'
}
