/**
 * Komponente für App-Initialisierung
 *
 * Zeigt Loading- und Error-States während der App-Initialisierung.
 * Folgt dem Single Responsibility Principle.
 */

import { Box, CircularProgress, Typography } from '@mui/material'
import { useAppInitialization } from '@/hooks/useAppInitialization'
import { InitializationError } from '@/components/InitializationError'

interface AppInitializationProps {
  children: React.ReactNode
}

/**
 * Wrapper-Komponente für App-Initialisierung
 *
 * Verantwortlichkeiten:
 * - Anzeige des Loading-States
 * - Anzeige von Initialisierungsfehlern
 * - Rendering der App nach erfolgreicher Initialisierung
 */
export function AppInitialization({ children }: AppInitializationProps) {
  const { isInitializing, initError } = useAppInitialization()

  const handleRetry = () => {
    window.location.reload()
  }

  const handleReload = () => {
    window.location.reload()
  }

  if (isInitializing) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 3 }} />
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
            Initialisiere Daten ...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lade Seed-Daten und bereite die Anwendung vor
          </Typography>
        </Box>
      </Box>
    )
  }

  if (initError) {
    return (
      <InitializationError
        error={initError}
        onRetry={handleRetry}
        onReload={handleReload}
      />
    )
  }

  return <>{children}</>
}
