import type { Matchbox, MatchingNight, Penalty } from '@/types'
import { calculateBudget } from '@/utils/budget'

/** Eine Auszahlungszeile: wer verkauft hat (laut erfasstem Namen beim Verkauf), Betrag, optional Kontext. */
export interface SellerPayoutRow {
  /** Name der verkaufenden Person (aus dem Käufer-Feld beim jeweiligen Verkauf). */
  sellerLabel: string
  /** Gespeicherter Preis (negativ = Abzug vom Gesamtpool). */
  amountEuro: number
  /** Nur zur Zuordnung, z. B. Paar auf der Matchbox – nicht als „Gewinner-Paar“ gemeint. */
  reference?: string
}

export type SeasonFinaleResult =
  | {
      kind: 'all-lights-jackpot'
      /** Aktuelles Budget: Startbudget + Verkäufe - Strafen + Gutschriften (wie Header und Admin, ODI-372). */
      totalPoolEuro: number
      perRecipientEuro: number
      /**
       * Die Personen der 10 Perfect Matches: alle Paare der 10. Matching Night plus die bereits per
       * Matchbox gefundenen Perfect Matches. Doppelmatch-Personen sind nicht dabei (ODI-373).
       */
      recipientNames: string[]
    }
  | {
      kind: 'seller-payouts'
      rows: SellerPayoutRow[]
      /**
       * Summe nur der Abzüge (negative Verkaufspreise = vom Gesamtpool ab).
       * Positive Beträge (Bonus/Einnahmen zum Pool) zählen hier nicht und erscheinen nicht in `rows`.
       */
      totalDeductionsEuro: number
    }

/**
 * Berechnet die Abschluss-Rückmeldung nach der 10. Matching Night.
 * - 10 Lichter: aktuelles Budget (Startbudget + Verkäufe - Strafen + Gutschriften) für die 10 Perfect Matches
 *   (Paare der 10. Matching Night + bereits gefundene), ohne Doppelmatch-Personen.
 * - Sonst: nur Abzüge (negative Preise) in Liste und Summe; Bonus (positive Preise) ausgeschlossen.
 */
export function computeSeasonFinale(
  matchboxes: Matchbox[],
  matchingNights: MatchingNight[],
  tenthNight: MatchingNight,
  penalties: Penalty[],
  startingBudget: number
): SeasonFinaleResult {
  const soldMatchingNights = matchingNights.filter(
    mn => mn.matchType === 'sold' && typeof mn.price === 'number'
  )

  const soldMatchboxes = matchboxes.filter(
    mb => mb.matchType === 'sold' && typeof mb.price === 'number'
  )

  const totalPoolEuro = calculateBudget(matchboxes, matchingNights, penalties, startingBudget).currentBalance

  const isTenLights =
    tenthNight.matchType !== 'sold' && tenthNight.totalLights === 10

  if (isTenLights) {
    // Set behält die Einfügereihenfolge und entfernt Doppelte (gefundene Paare sitzen meist schon in der Night)
    const recipients = new Set<string>()
    for (const pair of tenthNight.pairs) {
      recipients.add(pair.woman)
      recipients.add(pair.man)
    }
    for (const mb of matchboxes) {
      if (mb.matchType === 'perfect') {
        recipients.add(mb.woman)
        recipients.add(mb.man)
      }
    }
    const recipientNames = [...recipients].filter(Boolean)
    return {
      kind: 'all-lights-jackpot',
      totalPoolEuro,
      perRecipientEuro: totalPoolEuro / Math.max(recipientNames.length, 1),
      recipientNames
    }
  }

  // Nur Abzüge vom Pool (in der App: negativer Preis = Ausgabe / vom Budget ab)
  const soldMNdeductions = soldMatchingNights.filter(mn => (mn.price ?? 0) < 0)
  const soldMBdeductions = soldMatchboxes.filter(mb => (mb.price ?? 0) < 0)

  const rows: SellerPayoutRow[] = []

  for (const mb of soldMBdeductions) {
    const seller = mb.buyer?.trim()
    if (!seller) continue
    rows.push({
      sellerLabel: seller,
      amountEuro: mb.price ?? 0,
      reference: `Matchbox (${mb.woman} & ${mb.man})`
    })
  }

  for (const mn of soldMNdeductions) {
    const seller = mn.buyer?.trim()
    if (!seller) continue
    rows.push({
      sellerLabel: seller,
      amountEuro: mn.price ?? 0,
      reference: mn.name?.trim() || 'Matching Night (verkauft)'
    })
  }

  const totalDeductionsEuro =
    soldMBdeductions.reduce((s, mb) => s + Math.abs(mb.price ?? 0), 0) +
    soldMNdeductions.reduce((s, mn) => s + Math.abs(mn.price ?? 0), 0)

  return {
    kind: 'seller-payouts',
    rows,
    totalDeductionsEuro
  }
}
