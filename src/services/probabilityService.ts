/**
 * Wahrscheinlichkeits-Berechnungs-Service
 *
 * Implementiert den kombinatorischen Algorithmus zur Berechnung
 * von Perfect Match Wahrscheinlichkeiten basierend auf:
 * - Matching Night Ergebnissen (Lichter-Anzahl)
 * - Matchbox-Entscheidungen (Perfect Match / No Match)
 *
 * Folgt dem Constraint-Satisfaction-Problem (CSP) Ansatz: exakte Enumeration aller
 * möglichen Zuordnungen, gefiltert nach den bekannten Constraints, Wahrscheinlichkeit
 * = Anteil der gültigen Zuordnungen, die ein bestimmtes Paar enthalten.
 *
 * Modell (ODI-367): Jede Person hat mindestens einen Partner, die Gesamtzahl der Paare ist
 * minimal (= Größe der größeren Seite). Jede Person der größeren Seite hat daher genau eine
 * Partnerin, jede Person der kleineren Seite mindestens einen Partner. Bei einem Überschuss
 * (Doppelmatch) hat eine Person der kleineren Seite zwei - wer das ist, ergibt sich allein aus
 * den Constraints und muss nicht eingetragen werden. Ausdrücklich eingetragene Doppelmatch-
 * Partner*innen (z.B. Janice) sind bereits vor dem Aufruf aus dem Pool entfernt.
 *
 * Generierung, Filterung und Zählung laufen in EINEM Durchgang über indexbasierte,
 * typisierte Arrays statt (wie zuvor) in getrennten Schritten über materialisierte
 * JS-Objekt-Arrays (ODI-339). Box-Entscheidungen und die Abdeckungs-Regel werden
 * strukturell in die Suche eingebaut (Pruning), wodurch der tatsächlich durchsuchte
 * Raum in der Praxis meist deutlich kleiner ist als der theoretische.
 */

import type {
  ProbabilityInput,
  ProbabilityResult,
  Pair,
  ProbabilityMatrix,
  MatchingSolution
} from '@/types'

/**
 * Sicherheitslimit für die Anzahl vollständig ausgewerteter Zuordnungen (Blätter der
 * Suche). Der größte reale Fall - 11 gegen 10 Personen ganz ohne Constraints - hat
 * 199.584.000 gültige Zuordnungen und bleibt knapp darunter; das Limit schützt vor
 * einer hypothetischen, noch größeren Besetzung in einer zukünftigen Staffel.
 */
const SAFETY_LEAF_LIMIT = 200_000_000

/**
 * Ab wie vielen gültigen Gesamt-Kombinationen die einzelnen Lösungen NICHT mehr
 * gesammelt werden (ODI-358). Bis zu dieser Grenze ist eine vollständige Liste noch
 * übersichtlich und das Sammeln vernachlässigbar billig; darüber wird sie sofort
 * verworfen, um bei großen Suchräumen (Zehntausende+ Kombinationen) keinen unnötigen
 * Speicher-/Zeit-Overhead zu erzeugen - die reine Zählung läuft davon unberührt weiter.
 */
export const FULL_MATCHING_LIST_THRESHOLD = 50

/**
 * Callback-Typ für Progress-Updates
 */
export type ProgressCallback = (progress: number, step: string) => void

interface IndexedCeremony {
  /** [targetIdx, driverIdx] Paare der Zeremonie-Sitzordnung */
  pairsIdx: Array<[number, number]>
  correctCount: number
  /** [targetIdx, driverIdx] Paare, die zum Zeitpunkt der Zeremonie schon als Perfect Match bekannt waren */
  knownIdx: Array<[number, number]>
}

/**
 * Hauptfunktion zur Berechnung der Wahrscheinlichkeiten
 */
export async function calculateProbabilities(
  input: ProbabilityInput,
  onProgress?: ProgressCallback
): Promise<ProbabilityResult> {
  const startTime = performance.now()

  try {
    const { men, women, ceremonies, boxDecisions } = input
    const nMen = men.length
    const nWomen = women.length

    onProgress?.(5, 'Bereite Berechnung vor...')

    // "Treiber" ist die größere Seite (bei Gleichstand die Männer): jeder Treiber bekommt
    // genau eine Partnerin aus der Gegenseite ("Ziel"), jedes Ziel muss mindestens einen
    // Treiber bekommen.
    const menAreDrivers = nMen >= nWomen
    const drivers = menAreDrivers ? men : women
    const targets = menAreDrivers ? women : men
    const nDrivers = drivers.length
    const nTargets = targets.length

    const driverIdx = new Map(drivers.map((d, i) => [d, i]))
    const targetIdx = new Map(targets.map((t, i) => [t, i]))

    // ** Box-Entscheidungen strukturell in die Suche einbauen (Pruning) **
    const requiredCandidates: number[][] = Array.from({ length: nDrivers }, () => [])
    const forbiddenTargets: Set<number>[] = Array.from({ length: nDrivers }, () => new Set())
    for (const decision of boxDecisions) {
      const di = driverIdx.get(menAreDrivers ? decision.man : decision.woman)
      const ti = targetIdx.get(menAreDrivers ? decision.woman : decision.man)
      if (di === undefined || ti === undefined) continue
      if (decision.isPerfectMatch) {
        requiredCandidates[di].push(ti)
      } else {
        forbiddenTargets[di].add(ti)
      }
    }

    const requiredTarget = new Int16Array(nDrivers).fill(-1)
    let contradictoryConstraints = false
    for (let di = 0; di < nDrivers; di++) {
      const uniqueRequired = [...new Set(requiredCandidates[di])]
      if (uniqueRequired.length > 1) {
        // Ein Treiber hat genau eine Partnerin und kann nicht gleichzeitig als Perfect Match
        // mit zwei verschiedenen Personen bestätigt sein - widersprüchliche Eingabedaten.
        contradictoryConstraints = true
        break
      }
      if (uniqueRequired.length === 1) {
        requiredTarget[di] = uniqueRequired[0]
        if (forbiddenTargets[di].has(uniqueRequired[0])) {
          contradictoryConstraints = true
          break
        }
      }
    }

    // ** Zeremonien in Index-Form für schnelle, string-freie Vergleiche **
    const toIdxPairs = (pairs: Pair[]): Array<[number, number]> =>
      pairs
        .map((p): [number, number] | null => {
          const di = driverIdx.get(menAreDrivers ? p.man : p.woman)
          const ti = targetIdx.get(menAreDrivers ? p.woman : p.man)
          return di !== undefined && ti !== undefined ? [ti, di] : null
        })
        .filter((p): p is [number, number] => p !== null)

    const ceremoniesIdx: IndexedCeremony[] = ceremonies.map(c => ({
      pairsIdx: toIdxPairs(c.pairs),
      correctCount: c.correctCount,
      knownIdx: toIdxPairs(c.knownPerfectMatches)
    }))

    const pairCounts: Uint32Array[] = Array.from({ length: nTargets }, () => new Uint32Array(nDrivers))
    let totalValid = 0
    let totalLeaves = 0
    let limitReached = false
    // Wird auf null gesetzt, sobald mehr als FULL_MATCHING_LIST_THRESHOLD gültige
    // Lösungen gefunden wurden - ab dann lohnt sich das Sammeln nicht mehr (ODI-358)
    let collectedMatchings: MatchingSolution[] | null = []

    if (!contradictoryConstraints) {
      onProgress?.(10, 'Durchsuche mögliche Zuordnungen...')

      const assignment = new Int16Array(nDrivers).fill(-1)
      const targetUseCount = new Int16Array(nTargets).fill(0)
      let uncoveredTargets = nTargets

      // Grobe Schätzung des Gesamtraums (ohne Pruning) für die Fortschrittsanzeige
      const estimatedTotal = countSurjections(nDrivers, nTargets)
      let lastReportedPercent = 10

      const isLeafValid = (): boolean => {
        for (const ceremony of ceremoniesIdx) {
          for (const [ti, di] of ceremony.knownIdx) {
            if (assignment[di] !== ti) return false
          }
          let correct = 0
          for (const [ti, di] of ceremony.pairsIdx) {
            if (assignment[di] === ti) correct++
          }
          if (correct !== ceremony.correctCount) return false
        }
        return true
      }

      const backtrack = (di: number): void => {
        if (totalLeaves >= SAFETY_LEAF_LIMIT) {
          limitReached = true
          return
        }

        // Abdeckung: sind weniger Treiber übrig als noch Ziele ohne Partner, kann am Ende
        // keine Person der Gegenseite leer ausgehen - dieser Ast kann keine Lösung enthalten.
        if (nDrivers - di < uncoveredTargets) return

        if (di === nDrivers) {
          totalLeaves++
          if (isLeafValid()) {
            totalValid++
            for (let d = 0; d < nDrivers; d++) {
              pairCounts[assignment[d]][d]++
            }
            if (collectedMatchings !== null) {
              if (collectedMatchings.length >= FULL_MATCHING_LIST_THRESHOLD) {
                collectedMatchings = null
              } else {
                const pairs: Pair[] = []
                for (let d = 0; d < nDrivers; d++) {
                  const target = targets[assignment[d]]
                  pairs.push(menAreDrivers ? { woman: target, man: drivers[d] } : { woman: drivers[d], man: target })
                }
                collectedMatchings.push({ pairs })
              }
            }
          }
          if (totalLeaves % 500_000 === 0) {
            const percent = Math.min(89, 10 + Math.round((totalLeaves / estimatedTotal) * 79))
            if (percent > lastReportedPercent) {
              lastReportedPercent = percent
              onProgress?.(percent, `${totalLeaves.toLocaleString()} Zuordnungen geprüft...`)
            }
          }
          return
        }

        const required = requiredTarget[di]
        const forbidden = forbiddenTargets[di]
        const first = required !== -1 ? required : 0
        const last = required !== -1 ? required + 1 : nTargets
        for (let ti = first; ti < last; ti++) {
          if (required === -1 && forbidden.has(ti)) continue
          assignment[di] = ti
          if (targetUseCount[ti] === 0) uncoveredTargets--
          targetUseCount[ti]++
          backtrack(di + 1)
          targetUseCount[ti]--
          if (targetUseCount[ti] === 0) uncoveredTargets++
          assignment[di] = -1
        }
      }

      backtrack(0)
    }

    onProgress?.(95, 'Berechne Wahrscheinlichkeiten...')

    const probabilityMatrix: ProbabilityMatrix = {}
    for (let wi = 0; wi < nWomen; wi++) {
      const woman = women[wi]
      probabilityMatrix[woman] = {}
      for (let mi = 0; mi < nMen; mi++) {
        const count = menAreDrivers ? pairCounts[wi][mi] : pairCounts[mi][wi]
        probabilityMatrix[woman][men[mi]] = totalValid > 0 ? count / totalValid : 0
      }
    }

    const fixedPairs = extractFixedPairs(probabilityMatrix)

    const calculationTime = performance.now() - startTime
    onProgress?.(100, 'Berechnung abgeschlossen')

    return {
      probabilityMatrix,
      fixedPairs,
      totalValidMatchings: totalValid,
      calculationTime,
      limitReached,
      allValidMatchings: collectedMatchings ?? undefined
    }
  } catch (error) {
    console.error('Fehler bei der Wahrscheinlichkeits-Berechnung:', error)
    throw error
  }
}

/**
 * Anzahl der Zuordnungen von nDrivers Treibern auf nTargets Ziele, bei denen jedes Ziel
 * mindestens einen Treiber bekommt (Inklusion-Exklusion) - nur für die Fortschrittsanzeige.
 */
function countSurjections(nDrivers: number, nTargets: number): number {
  if (nTargets === 0) return 1
  let total = 0
  let binomial = 1
  for (let j = 0; j <= nTargets; j++) {
    total += (j % 2 === 0 ? 1 : -1) * binomial * Math.pow(nTargets - j, nDrivers)
    binomial = (binomial * (nTargets - j)) / (j + 1)
  }
  return Math.max(Math.round(total), 1)
}

/**
 * Extrahiert fixierte Paare (Wahrscheinlichkeit = 1.0)
 */
function extractFixedPairs(matrix: ProbabilityMatrix): Pair[] {
  const fixedPairs: Pair[] = []

  for (const woman in matrix) {
    for (const man in matrix[woman]) {
      if (matrix[woman][man] === 1.0) {
        fixedPairs.push({ woman, man })
      }
    }
  }

  return fixedPairs
}

/**
 * Version des Berechnungsmodells - Teil des Daten-Hashs, damit Ergebnisse eines früheren
 * Modells (andere Bedeutung von "gültige Zuordnung") nie aus dem Cache wiederverwendet werden.
 */
const MODEL_VERSION = 'cover-v2'

/**
 * Generiert einen Hash aus den Input-Daten für Caching
 */
export function generateDataHash(input: ProbabilityInput): string {
  const menStr = [...input.men].sort().join(',')
  const womenStr = [...input.women].sort().join(',')

  const ceremoniesStr = input.ceremonies
    .map(c => {
      const pairsStr = c.pairs
        .map(p => `${p.woman}:${p.man}`)
        .sort()
        .join('|')
      return `${pairsStr}=${c.correctCount}`
    })
    .sort()
    .join(';')

  const decisionsStr = input.boxDecisions
    .map(d => `${d.woman}:${d.man}=${d.isPerfectMatch ? '1' : '0'}`)
    .sort()
    .join(';')

  const fullString = `model:${MODEL_VERSION}|men:${menStr}|women:${womenStr}|ceremonies:${ceremoniesStr}|decisions:${decisionsStr}`

  // Simple hash function (FNV-1a)
  let hash = 2166136261
  for (let i = 0; i < fullString.length; i++) {
    hash ^= fullString.charCodeAt(i)
    hash *= 16777619
  }

  return (hash >>> 0).toString(36)
}
