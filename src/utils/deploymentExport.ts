/**
 * Reine Aufbereitung des Deployment-Exports (DTO-Normalisierung + Vollständigkeits-
 * Validierung der Ausstrahlungsdaten), getrennt vom Download-Trigger (Blob/Anchor) in
 * der Komponente. Enthält keinen DOM-Zugriff und ist dadurch isoliert testbar.
 */

import type {
  BroadcastNote,
  Matchbox,
  MatchingNight,
  MatchingNightMatchType,
  MatchType,
  Pair,
  Participant,
  Penalty,
  ProbabilityCache
} from '@/types'

export interface DeploymentExportInput {
  participants: Participant[]
  matchingNights: MatchingNight[]
  matchboxes: Matchbox[]
  penalties: Penalty[]
  probabilityCache: ProbabilityCache[]
  broadcastNotes: BroadcastNote[]
  version: string
}

export interface DeploymentMatchingNightExport {
  id?: number
  name: string
  date: string
  pairs: Pair[]
  totalLights?: number
  matchType?: MatchingNightMatchType
  price?: number
  buyer?: string
  createdAt: string
  ausstrahlungsdatum?: string
  ausstrahlungszeit?: string
}

export interface DeploymentMatchboxExport {
  id?: number
  woman: string
  man: string
  matchType: MatchType
  price?: number
  buyer?: string
  ausstrahlungsdatum?: string
  ausstrahlungszeit?: string
  createdAt: Date
  updatedAt: Date
}

export interface DeploymentExportData {
  participants: Participant[]
  matchingNights: DeploymentMatchingNightExport[]
  matchboxes: DeploymentMatchboxExport[]
  penalties: Penalty[]
  probabilityCache: ProbabilityCache[]
  broadcastNotes: BroadcastNote[]
  exportedAt: string
  version: string
  deploymentReady: true
}

export interface DeploymentExportValidationError {
  success: false
  invalidMatchingNightsCount: number
  invalidMatchboxesCount: number
}

export interface DeploymentExportSuccess {
  success: true
  data: DeploymentExportData
  fileName: string
}

export type DeploymentExportResult = DeploymentExportSuccess | DeploymentExportValidationError

/**
 * Normalisiert Matching Nights/Matchboxes auf das Export-Format (inkl. verkaufte MN:
 * matchType, price, buyer, date, createdAt) und validiert, dass Ausstrahlungsdaten
 * vollständig sind (verkaufte MN sind davon ausgenommen – oft nur im Ausstrahlungsplan
 * gepflegt). Bei fehlenden Ausstrahlungsdaten wird kein Export-Datensatz erzeugt.
 */
export function buildDeploymentExport(input: DeploymentExportInput): DeploymentExportResult {
  const matchingNightsData: DeploymentMatchingNightExport[] = input.matchingNights.map(m => ({
    id: m.id,
    name: m.name,
    date: m.date,
    pairs: m.pairs,
    totalLights: m.totalLights,
    matchType: m.matchType,
    price: m.price,
    buyer: m.buyer,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    ausstrahlungsdatum: m.ausstrahlungsdatum,
    ausstrahlungszeit: m.ausstrahlungszeit
  }))

  const matchboxesData: DeploymentMatchboxExport[] = input.matchboxes.map(m => ({
    id: m.id,
    woman: m.woman,
    man: m.man,
    matchType: m.matchType,
    price: m.price,
    buyer: m.buyer,
    ausstrahlungsdatum: m.ausstrahlungsdatum,
    ausstrahlungszeit: m.ausstrahlungszeit,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  }))

  const invalidMatchingNights = matchingNightsData.filter(
    m => m.matchType !== 'sold' && (!m.ausstrahlungsdatum || !m.ausstrahlungszeit)
  )
  const invalidMatchboxes = matchboxesData.filter(m => !m.ausstrahlungsdatum || !m.ausstrahlungszeit)

  if (invalidMatchingNights.length > 0 || invalidMatchboxes.length > 0) {
    return {
      success: false,
      invalidMatchingNightsCount: invalidMatchingNights.length,
      invalidMatchboxesCount: invalidMatchboxes.length
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const fileName = `ayto-complete-export-${today}.json`

  const data: DeploymentExportData = {
    participants: input.participants,
    matchingNights: matchingNightsData,
    matchboxes: matchboxesData,
    penalties: input.penalties,
    probabilityCache: input.probabilityCache,
    broadcastNotes: input.broadcastNotes,
    exportedAt: new Date().toISOString(),
    version: input.version,
    deploymentReady: true
  }

  return { success: true, data, fileName }
}
