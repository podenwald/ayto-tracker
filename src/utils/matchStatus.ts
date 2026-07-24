import type { Matchbox } from '@/types'

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
    })
  return names
}
