/**
 * Service für Penalty Management
 * 
 * Kapselt alle Business Logic für Penalty-Operationen.
 * Trennt UI von Business Logic.
 */

import { db } from '@/lib/db'
import type { Penalty, PenaltyDTO } from '@/types'
import { assertSeasonWritable, getActiveSeasonId } from '@/services/seasonService'

export class PenaltyService {
  private static async sid(): Promise<number> {
    return getActiveSeasonId()
  }

  /**
   * Lädt alle Penalties der aktiven Staffel aus der Datenbank
   */
  static async getAllPenalties(): Promise<Penalty[]> {
    const seasonId = await this.sid()
    return await db.penalties.where('seasonId').equals(seasonId).toArray()
  }

  /**
   * Lädt Penalties nach Teilnehmer
   */
  static async getPenaltiesByParticipant(participantName: string): Promise<Penalty[]> {
    const seasonId = await this.sid()
    return await db.penalties
      .where('seasonId')
      .equals(seasonId)
      .filter(p => p.participantName === participantName)
      .toArray()
  }

  /**
   * Erstellt eine neue Penalty
   */
  static async createPenalty(penalty: Omit<Penalty, 'id' | 'createdAt' | 'seasonId'>): Promise<number> {
    const seasonId = await this.sid()
    await assertSeasonWritable(seasonId)
    const newPenalty: Omit<Penalty, 'id'> = {
      ...penalty,
      seasonId,
      createdAt: new Date()
    }
    return await db.penalties.add(newPenalty)
  }

  /**
   * Aktualisiert eine Penalty
   */
  static async updatePenalty(id: number, updates: Partial<Penalty>): Promise<void> {
    const seasonId = await this.sid()
    await assertSeasonWritable(seasonId)
    const existing = await db.penalties.get(id)
    if (!existing || existing.seasonId !== seasonId) {
      throw new Error('Strafe gehört nicht zur aktiven Staffel.')
    }
    await db.penalties.update(id, updates)
  }

  /**
   * Löscht eine Penalty
   */
  static async deletePenalty(id: number): Promise<void> {
    const seasonId = await this.sid()
    await assertSeasonWritable(seasonId)
    const existing = await db.penalties.get(id)
    if (!existing || existing.seasonId !== seasonId) {
      throw new Error('Strafe gehört nicht zur aktiven Staffel.')
    }
    await db.penalties.delete(id)
  }

  /**
   * Validiert Penalty-Daten
   */
  static validatePenalty(penalty: Partial<Penalty>): string[] {
    const errors: string[] = []

    if (!penalty.participantName?.trim()) {
      errors.push('Teilnehmer-Name ist erforderlich')
    }

    if (!penalty.reason?.trim()) {
      errors.push('Grund ist erforderlich')
    }

    if (!penalty.amount || penalty.amount <= 0) {
      errors.push('Betrag muss größer als 0 sein')
    }

    if (!penalty.date?.trim()) {
      errors.push('Datum ist erforderlich')
    } else {
      // Validiere Datumsformat
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(penalty.date)) {
        errors.push('Datum muss im Format YYYY-MM-DD sein')
      }
    }

    return errors
  }

  /**
   * Konvertiert DTO zu Domain-Objekt
   */
  static fromDTO(dto: PenaltyDTO): Penalty {
    if (dto.seasonId == null) {
      throw new Error('PenaltyDTO.seasonId ist erforderlich')
    }
    return {
      ...dto,
      seasonId: dto.seasonId,
      createdAt: new Date(dto.createdAt)
    }
  }

  /**
   * Konvertiert Domain-Objekt zu DTO
   */
  static toDTO(penalty: Penalty): PenaltyDTO {
    return {
      ...penalty,
      createdAt: penalty.createdAt.toISOString()
    }
  }

  /**
   * Berechnet die Gesamtsumme aller Penalties für einen Teilnehmer
   */
  static async getTotalPenaltiesForParticipant(participantName: string): Promise<number> {
    const penalties = await this.getPenaltiesByParticipant(participantName)
    return penalties.reduce((total, penalty) => total + penalty.amount, 0)
  }

  /**
   * Berechnet die Gesamtsumme aller Penalties
   */
  static async getTotalPenalties(): Promise<number> {
    const penalties = await this.getAllPenalties()
    return penalties.reduce((total, penalty) => total + penalty.amount, 0)
  }

  /**
   * Lädt Penalties nach Zeitraum
   */
  static async getPenaltiesByDateRange(startDate: string, endDate: string): Promise<Penalty[]> {
    const allPenalties = await this.getAllPenalties()
    return allPenalties.filter(penalty => 
      penalty.date >= startDate && penalty.date <= endDate
    )
  }

  /**
   * Lädt Penalties nach Grund
   */
  static async getPenaltiesByReason(reason: string): Promise<Penalty[]> {
    const seasonId = await this.sid()
    return await db.penalties
      .where('seasonId')
      .equals(seasonId)
      .filter(p => p.reason === reason)
      .toArray()
  }

  /**
   * Berechnet die durchschnittliche Penalty pro Teilnehmer
   */
  static async getAveragePenaltyPerParticipant(): Promise<number> {
    const penalties = await this.getAllPenalties()
    const uniqueParticipants = new Set(penalties.map(p => p.participantName))
    
    if (uniqueParticipants.size === 0) return 0
    
    const totalAmount = penalties.reduce((sum, penalty) => sum + penalty.amount, 0)
    return totalAmount / uniqueParticipants.size
  }
}
