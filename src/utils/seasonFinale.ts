import type { Matchbox, MatchingNight, Participant } from '@/types'

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
      /** Summe aus verkauften Matchboxes und verkauften Matching Nights (wie Budget-Berechnung). */
      totalPoolEuro: number
      perParticipantEuro: number
      activeParticipantNames: string[]
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
 * - 10 Lichter: Gesamtsumme (alle Verkäufe inkl. Bonus) für alle Aktiven.
 * - Sonst: nur Abzüge (negative Preise) in Liste und Summe; Bonus (positive Preise) ausgeschlossen.
 */
export function computeSeasonFinale(
  matchboxes: Matchbox[],
  matchingNights: MatchingNight[],
  participants: Participant[],
  tenthNight: MatchingNight
): SeasonFinaleResult {
  const soldMatchingNights = matchingNights.filter(
    mn => mn.matchType === 'sold' && typeof mn.price === 'number'
  )
  const totalSoldMN = soldMatchingNights.reduce((s, mn) => s + (mn.price ?? 0), 0)

  const soldMatchboxes = matchboxes.filter(
    mb => mb.matchType === 'sold' && typeof mb.price === 'number'
  )
  const totalSoldMB = soldMatchboxes.reduce((s, mb) => s + (mb.price ?? 0), 0)

  const totalPoolEuro = totalSoldMB + totalSoldMN

  const isTenLights =
    tenthNight.matchType !== 'sold' && tenthNight.totalLights === 10

  if (isTenLights) {
    const active = participants.filter(p => p.active !== false)
    const n = Math.max(active.length, 1)
    return {
      kind: 'all-lights-jackpot',
      totalPoolEuro,
      perParticipantEuro: totalPoolEuro / n,
      activeParticipantNames: active.map(p => p.name).filter(Boolean) as string[]
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
