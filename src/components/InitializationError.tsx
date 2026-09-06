/**
 * Initialisierungsfehler-Komponente
 *
 * Zeigt eine benutzerfreundliche Fehlermeldung an, wenn die App-Initialisierung fehlschlägt.
 */

import { useState } from 'react'
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Collapse
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { getJsonDataSourcesNewestFirst } from '@/services/databaseUpdateService'

interface InitializationErrorProps {
  error: string
  onRetry: () => void
  onReload: () => void
}

/**
 * Initialisierungsfehler-Komponente
 *
 * Verantwortlichkeiten:
 * - Anzeige von Initialisierungsfehlern
 * - Benutzerfreundliche Fehlermeldungen
 * - Handlungsoptionen für den Benutzer
 */
export function InitializationError({ error, onRetry, onReload }: InitializationErrorProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const handleDownloadData = async () => {
    try {
      const sources = await getJsonDataSourcesNewestFirst()
      const dataUrl = sources[0] ?? '/json/ayto2026.json'
      const filename = dataUrl.replace(/^.*\//, '') || 'ayto-data.json'
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      const link = document.createElement('a')
      link.href = '/json/ayto2026.json'
      link.download = 'ayto2026.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClearStorage = () => {
    if (confirm('Möchten Sie wirklich alle gespeicherten Daten löschen? Dies kann nicht rückgängig gemacht werden.')) {
      localStorage.clear()
      sessionStorage.clear()
      if ('indexedDB' in window) {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name)
            }
          })
        })
      }
      onReload()
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 600 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <StorageIcon />
              </Avatar>
              <Typography variant="h6" component="span">
                Initialisierungsfehler
              </Typography>
            </Box>
          }
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Die Anwendung konnte nicht initialisiert werden. Die Seed-Daten konnten nicht geladen werden.
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Mögliche Ursachen</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>Netzwerkverbindung unterbrochen</li>
              <li>JSON-Dateien nicht verfügbar</li>
              <li>Browser-Cache-Probleme</li>
              <li>Service Worker-Konflikte</li>
            </Box>
          </Alert>

          <Button
            size="small"
            startIcon={detailsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            sx={{ textTransform: 'none', color: 'text.secondary', mb: 1 }}
          >
            Technische Details anzeigen
          </Button>
          <Collapse in={detailsExpanded}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                component="pre"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', m: 0 }}
              >
                {error}
              </Typography>
            </Alert>
          </Collapse>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mt: 2 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry}>
              Erneut versuchen
            </Button>
            <Button variant="contained" color="warning" startIcon={<RefreshIcon />} onClick={onReload}>
              Seite neu laden
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadData}>
              Daten herunterladen
            </Button>
            <Button variant="outlined" color="error" onClick={handleClearStorage}>
              Speicher leeren
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 3 }}>
            Falls das Problem weiterhin besteht, versuchen Sie es später erneut oder wenden Sie sich an den Support.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
