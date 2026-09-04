import type { Matchbox, MatchingNight, Penalty } from '@/types'

export interface BudgetSummary {
  totalVerkauf: number
  totalPenalties: number
  totalCredits: number
  currentBalance: number
}

/**
 * Budget-/Saldo-Berechnung (Startbudget + Verkäufe - Strafen + Gutschriften),
 * gemeinsam genutzt von Admin und Übersicht (ODI-272).
 */
export const calculateBudget = (
  matchboxes: Matchbox[],
  matchingNights: MatchingNight[],
  penalties: Penalty[],
  startingBudget: number
): BudgetSummary => {
  // Verkäufe: Plus = zum Budget hinzu, Minus = vom Budget ab (Matchbox + Matching Night)
  const soldMatchboxes = matchboxes.filter(mb => mb.matchType === 'sold' && typeof mb.price === 'number')
  const soldMatchingNights = matchingNights.filter(mn => mn.matchType === 'sold' && typeof mn.price === 'number')
  const totalVerkauf =
    soldMatchboxes.reduce((sum, mb) => sum + (mb.price ?? 0), 0) +
    soldMatchingNights.reduce((sum, mn) => sum + (mn.price ?? 0), 0)

  const totalPenalties = penalties
    .filter(penalty => penalty.amount < 0)
    .reduce((sum, penalty) => sum + Math.abs(penalty.amount), 0)
  const totalCredits = penalties
    .filter(penalty => penalty.amount > 0)
    .reduce((sum, penalty) => sum + penalty.amount, 0)

  const currentBalance = startingBudget + totalVerkauf - totalPenalties + totalCredits

  return { totalVerkauf, totalPenalties, totalCredits, currentBalance }
}
