/**
 * Service für Teilnehmer-Management
 * 
 * Kapselt alle Business Logic für Teilnehmer-Operationen.
 * Trennt UI von Business Logic.
 */

import { db } from '@/lib/db'
import type { Participant, ParticipantDTO } from '@/types'
import { withErrorHandling, validateRequired, validateStringLength, validateNumberRange } from '@/utils/errorHandling'
import { assertSeasonWritable, getActiveSeasonId } from '@/services/seasonService'

export class ParticipantService {
  private static async sid(): Promise<number> {
    return getActiveSeasonId()
  }

  /**
   * Lädt alle Teilnehmer der aktiven Staffel aus der Datenbank
   */
  static async getAllParticipants(): Promise<Participant[]> {
    return await withErrorHandling(
      async () => {
        const seasonId = await this.sid()
        return db.participants.where('seasonId').equals(seasonId).toArray()
      },
      'Fehler beim Laden der Teilnehmer'
    )
  }

  /**
   * Lädt Teilnehmer nach Geschlecht
   */
  static async getParticipantsByGender(gender: 'F' | 'M'): Promise<Participant[]> {
    const seasonId = await this.sid()
    return db.participants
      .where('seasonId')
      .equals(seasonId)
      .filter(p => p.gender === gender)
      .toArray()
  }

  /**
   * Lädt aktive Teilnehmer
   */
  static async getActiveParticipants(): Promise<Participant[]> {
    return await withErrorHandling(
      async () => {
        const seasonId = await this.sid()
        return db.participants
          .where('seasonId')
          .equals(seasonId)
          .filter(p => p.active === true || (p as unknown as { active?: number }).active === 1)
          .toArray()
      },
      'Fehler beim Laden der aktiven Teilnehmer'
    )
  }

  /**
   * Sucht Teilnehmer nach Name oder Show
   */
  static async searchParticipants(query: string): Promise<Participant[]> {
    const allParticipants = await this.getAllParticipants()
    const lowerQuery = query.toLowerCase()
    
    return allParticipants.filter(participant => 
      participant.name.toLowerCase().includes(lowerQuery) ||
      participant.knownFrom.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Erstellt einen neuen Teilnehmer
   */
  static async createParticipant(participant: Omit<Participant, 'id' | 'seasonId'>): Promise<number> {
    const seasonId = await this.sid()
    await assertSeasonWritable(seasonId)
    return db.participants.add({ ...participant, seasonId })
  }

  /**
   * Aktualisiert einen Teilnehmer
   */
  static async updateParticipant(id: number, updates: Partial<Participant>): Promise<void> {
    const seasonId = await this.sid()
    await assertSeasonWritable(seasonId)
    const existing = await db.participants.get(id)
    if (!existing || existing.seasonId !== seasonId) {
      throw new Error('Teilnehmer gehört nicht zur aktiven Staffel.')
    }
    await db.participants.update(id, updates)
  }

  /**
   * Löscht einen Teilnehmer
   */
  static async deleteParticipant(id: number): Promise<void> {
    const seasonId = await this.sid()
    await assertSeasonWritable(seasonId)
    const existing = await db.participants.get(id)
    if (!existing || existing.seasonId !== seasonId) {
      throw new Error('Teilnehmer gehört nicht zur aktiven Staffel.')
    }
    await db.participants.delete(id)
  }

  /**
   * Konvertiert DTO zu Domain-Objekt
   */
  static fromDTO(dto: ParticipantDTO): Participant {
    if (dto.seasonId == null) {
      throw new Error('ParticipantDTO.seasonId ist erforderlich')
    }
    return {
      ...dto,
      seasonId: dto.seasonId,
      status: dto.status as Participant['status'],
      // Zusätzliche Validierung/Transformation falls nötig
    }
  }

  /**
   * Konvertiert Domain-Objekt zu DTO
   */
  static toDTO(participant: Participant): ParticipantDTO {
    return {
      ...participant,
      // Zusätzliche Transformation falls nötig
    }
  }

  /**
   * Validiert Teilnehmer-Daten
   */
  static validateParticipant(participant: Partial<Participant>): string[] {
    const errors: string[] = []

    try {
      validateRequired(participant.name, 'Name')
      if (participant.name) {
        validateStringLength(participant.name, 'Name', 1, 100)
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        errors.push((error as { message: string }).message)
      }
    }

    if (!participant.gender || !['F', 'M'].includes(participant.gender)) {
      errors.push('Geschlecht muss F oder M sein')
    }

    if (participant.age !== undefined) {
      try {
        validateNumberRange(participant.age, 'Alter', 18, 100)
      } catch (error) {
        if (error && typeof error === 'object' && 'message' in error) {
          errors.push((error as { message: string }).message)
        }
      }
    }

    return errors
  }
}
