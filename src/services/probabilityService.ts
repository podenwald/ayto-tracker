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
 * Generierung, Filterung und Zählung laufen in EINEM Durchgang über indexbasierte,
 * typisierte Arrays statt (wie zuvor) in getrennten Schritten über materialisierte
 * JS-Objekt-Arrays (ODI-339). Das vermeidet nicht nur den Objekt-Allokations-Overhead,
 * sondern behebt auch einen echten Korrektheits-Bug: die alte Implementierung musste
 * die Generierung bei MAX_VALID_MATCHINGS abbrechen, bevor überhaupt Constraints
 * angewendet wurden - bei der realen Saison-Größe (11 Frauen/10 Männer = 39.916.800
 * mögliche Zuordnungen) wurde dabei ein durch die feste Tiefensuche-Reihenfolge
 * systematisch verzerrter Teil des Lösungsraums abgeschnitten. Box-Entscheidungen
 * werden jetzt zusätzlich strukturell in die Suche eingebaut (Pruning), wodurch der
 * tatsächlich durchsuchte Raum in der Praxis ohnehin meist deutlich kleiner ist.
 */

import type {
  ProbabilityInput,
  ProbabilityResult,
  Pair,
  ProbabilityMatrix
} from '@/types'

/**
 * Sicherheitslimit für die Anzahl vollständig ausgewerteter Zuordnungen (Blätter der
 * Suche). Bei den real möglichen Besetzungsgrößen dieser Show (bis ~11 Personen pro
 * Seite, max. ~40 Mio. Zuordnungen) wird dieses Limit nie erreicht - es schützt nur
 * vor einer hypothetischen, deutlich größeren Besetzung in einer zukünftigen Staffel.
 */
const SAFETY_LEAF_LIMIT = 200_000_000

/**
 * Callback-Typ für Progress-Updates
 */
export type ProgressCallback = (progress: number, step: string) => void

interface IndexedCeremony {
  /** [womanIdx, manIdx] Paare der Zeremonie-Sitzordnung */
  pairsIdx: Array<[number, number]>
  correctCount: number
  /** [womanIdx, manIdx] Paare, die zum Zeitpunkt der Zeremonie schon als Perfect Match bekannt waren */
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

    const menIdx = new Map(men.map((m, i) => [m, i]))
    const womenIdx = new Map(women.map((w, i) => [w, i]))

    // Jede Frau darf maximal so oft vorkommen, wie es die Geschlechterzahlen erlauben
    // (identisch zur bisherigen Logik: bei mehr Männern als Frauen kann eine Frau
    // mehrfach vorkommen; bei mehr Frauen als Männern bleiben überzählige Frauen ohne
    // Zuordnung). ceil(n/n) = 1, die Formel deckt daher auch den Gleichstand-Fall ab.
    const maxPerWoman = Math.ceil(nMen / nWomen)

    // ** Box-Entscheidungen strukturell in die Suche einbauen (Pruning) **
    const requiredCandidates: number[][] = Array.from({ length: nMen }, () => [])
    const forbiddenWomen: Set<number>[] = Array.from({ length: nMen }, () => new Set())
    for (const decision of boxDecisions) {
      const mi = menIdx.get(decision.man)
      const wi = womenIdx.get(decision.woman)
      if (mi === undefined || wi === undefined) continue
      if (decision.isPerfectMatch) {
        requiredCandidates[mi].push(wi)
      } else {
        forbiddenWomen[mi].add(wi)
      }
    }

    const requiredWoman = new Int16Array(nMen).fill(-1)
    let contradictoryConstraints = false
    for (let mi = 0; mi < nMen; mi++) {
      const uniqueRequired = [...new Set(requiredCandidates[mi])]
      if (uniqueRequired.length > 1) {
        // Ein Mann kann nicht gleichzeitig als Perfect Match mit zwei verschiedenen
        // Frauen bestätigt sein - widersprüchliche Eingabedaten, kein Matching möglich.
        contradictoryConstraints = true
        break
      }
      if (uniqueRequired.length === 1) {
        requiredWoman[mi] = uniqueRequired[0]
        if (forbiddenWomen[mi].has(uniqueRequired[0])) {
          contradictoryConstraints = true
          break
        }
      }
    }

    // ** Zeremonien in Index-Form für schnelle, string-freie Vergleiche **
    const toIdxPairs = (pairs: Pair[]): Array<[number, number]> =>
      pairs
        .map((p): [number, number] | null => {
          const wi = womenIdx.get(p.woman)
          const mi = menIdx.get(p.man)
          return wi !== undefined && mi !== undefined ? [wi, mi] : null
        })
        .filter((p): p is [number, number] => p !== null)

    const ceremoniesIdx: IndexedCeremony[] = ceremonies.map(c => ({
      pairsIdx: toIdxPairs(c.pairs),
      correctCount: c.correctCount,
      knownIdx: toIdxPairs(c.knownPerfectMatches)
    }))

    const pairCounts: Uint32Array[] = Array.from({ length: nWomen }, () => new Uint32Array(nMen))
    let totalValid = 0
    let totalLeaves = 0
    let limitReached = false

    if (!contradictoryConstraints) {
      onProgress?.(10, 'Durchsuche mögliche Zuordnungen...')

      const assignment = new Int16Array(nMen).fill(-1)
      const womanUseCount = new Int16Array(nWomen).fill(0)

      // Grobe Schätzung des Gesamtraums (ohne Pruning) für die Fortschrittsanzeige
      const estimatedTotal = estimateSearchSpaceSize(nMen, nWomen)
      let lastReportedPercent = 10

      const isLeafValid = (): boolean => {
        for (const ceremony of ceremoniesIdx) {
          for (const [wi, mi] of ceremony.knownIdx) {
            if (assignment[mi] !== wi) return false
          }
          let correct = 0
          for (const [wi, mi] of ceremony.pairsIdx) {
            if (assignment[mi] === wi) correct++
          }
          if (correct !== ceremony.correctCount) return false
        }
        return true
      }

      const backtrack = (manIndex: number): void => {
        if (totalLeaves >= SAFETY_LEAF_LIMIT) {
          limitReached = true
          return
        }

        if (manIndex === nMen) {
          totalLeaves++
          if (isLeafValid()) {
            totalValid++
            for (let mi = 0; mi < nMen; mi++) {
              pairCounts[assignment[mi]][mi]++
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

        const required = requiredWoman[manIndex]
        if (required !== -1) {
          if (womanUseCount[required] < maxPerWoman) {
            assignment[manIndex] = required
            womanUseCount[required]++
            backtrack(manIndex + 1)
            womanUseCount[required]--
            assignment[manIndex] = -1
          }
          return
        }

        const forbidden = forbiddenWomen[manIndex]
        for (let wi = 0; wi < nWomen; wi++) {
          if (forbidden.has(wi)) continue
          if (womanUseCount[wi] >= maxPerWoman) continue
          assignment[manIndex] = wi
          womanUseCount[wi]++
          backtrack(manIndex + 1)
          womanUseCount[wi]--
          assignment[manIndex] = -1
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
        probabilityMatrix[woman][men[mi]] =
          totalValid > 0 ? pairCounts[wi][mi] / totalValid : 0
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
      limitReached
    }
  } catch (error) {
    console.error('Fehler bei der Wahrscheinlichkeits-Berechnung:', error)
    throw error
  }
}

/**
 * Grobe Schätzung der Gesamtgröße des Suchraums (ohne Pruning), nur für die
 * Fortschrittsanzeige - muss nicht exakt sein.
 */
function estimateSearchSpaceSize(nMen: number, nWomen: number): number {
  if (nMen === 0) return 1
  const larger = Math.max(nMen, nWomen)
  const smaller = Math.min(nMen, nWomen)
  // Fallende Fakultät: larger! / (larger - smaller)!
  let result = 1
  for (let i = 0; i < smaller; i++) {
    result *= larger - i
  }
  return Math.max(result, 1)
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

  const fullString = `men:${menStr}|women:${womenStr}|ceremonies:${ceremoniesStr}|decisions:${decisionsStr}`

  // Simple hash function (FNV-1a)
  let hash = 2166136261
  for (let i = 0; i < fullString.length; i++) {
    hash ^= fullString.charCodeAt(i)
    hash *= 16777619
  }

  return (hash >>> 0).toString(36)
}
