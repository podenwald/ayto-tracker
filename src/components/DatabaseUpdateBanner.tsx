/**
 * Banner-Komponente für Datenbank-Updates
 * 
 * Zeigt einen benutzer-freundlichen Hinweis an, wenn neue Daten verfügbar sind.
 * Implementiert das benutzer-gesteuerte Update-System.
 */

import { useState } from 'react'
import SyncIcon from '@mui/icons-material/Sync'
import type { DatabaseUpdateState, DatabaseUpdateResult } from '@/services/databaseUpdateService'
import UpdateFeedbackToast from './UpdateFeedbackToast'

interface DatabaseUpdateBannerProps {
  updateState: DatabaseUpdateState
  onUpdate: () => Promise<DatabaseUpdateResult>
}

export default function DatabaseUpdateBanner({
  updateState,
  onUpdate
}: DatabaseUpdateBannerProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateResult, setUpdateResult] = useState<DatabaseUpdateResult | null>(null)

  const handleUpdate = async () => {
    try {
      setIsUpdating(true)
      setUpdateResult(null)
      
      const result = await onUpdate()
      setUpdateResult(result)
      
    } catch (error) {
      console.error('Fehler beim Update:', error)
      setUpdateResult({
        success: false,
        newVersion: 'unknown',
        newDataHash: 'unknown',
        releasedDate: '',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToastClose = () => {
    setUpdateResult(null)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Nur anzeigen, wenn Update verfügbar ist
  if (!updateState.isUpdateAvailable) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="db-update-overlay-card"
        style={{
          width: 'min(680px, calc(100vw - 32px))',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          borderRadius: '14px',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255,255,255,0.18)',
          padding: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <SyncIcon sx={{ fontSize: 22, color: 'white' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              Datenbank-Update erforderlich
            </div>
            <div style={{ fontSize: '13px', opacity: 0.95, lineHeight: 1.45 }}>
              DB-Version {updateState.latestVersion} ist verfügbar
              {updateState.releasedDate && (
                <> • Veröffentlicht am {formatDate(updateState.releasedDate)}</>
              )}
            </div>
          </div>
        </div>

        <div className="db-update-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleUpdate}
            disabled={isUpdating || updateState.isUpdating}
            className="db-update-cta-button"
            style={{
              background: isUpdating || updateState.isUpdating ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.18)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isUpdating || updateState.isUpdating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '160px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isUpdating && !updateState.isUpdating) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isUpdating && !updateState.isUpdating) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'
              }
            }}
          >
            {isUpdating || updateState.isUpdating ? (
              <>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                Aktualisiere...
              </>
            ) : (
              <>Jetzt aktualisieren</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .db-update-overlay-card {
            padding: 16px !important;
            border-radius: 12px !important;
          }

          .db-update-actions {
            justify-content: stretch !important;
          }

          .db-update-cta-button {
            width: 100% !important;
            min-width: 0 !important;
            padding: 12px 16px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
      
      {/* Feedback Toast */}
      <UpdateFeedbackToast
        result={updateResult}
        onClose={handleToastClose}
      />
    </div>
  )
}
