/**
 * Layout-Komponente für die App
 * 
 * Kapselt das gemeinsame Layout und die Versions-Check-Dialog-Logik.
 * Folgt dem Single Responsibility Principle.
 */

import { useVersionCheck } from '@/hooks/useVersionCheck'
import { useDatabaseUpdate } from '@/hooks/useDatabaseUpdate'
import DatabaseUpdateBanner from '@/components/DatabaseUpdateBanner'
import LegalFooter from '@/components/LegalFooter'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Layout-Komponente für die App
 *
 * Verantwortlichkeiten:
 * - Bereitstellung des gemeinsamen Layouts
 * - Tägliche Hintergrundprüfung auf neue App-Version (unbemerkter Auto-Reload)
 * - Integration des Legal Footers
 */
export function AppLayout({ children }: AppLayoutProps) {
  useVersionCheck()
  const { updateState, performUpdate } = useDatabaseUpdate()

  return (
    <>
      {/* Datenbank-Update-Banner */}
      <DatabaseUpdateBanner
        updateState={updateState}
        onUpdate={performUpdate}
      />

      {/* Hauptinhalt */}
      <div>
        {children}
      </div>

      <LegalFooter />
    </>
  )
}

