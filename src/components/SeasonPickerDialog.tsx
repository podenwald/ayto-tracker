import React, { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Box,
  Chip
} from '@mui/material'
import { Lock as LockIcon, Tv as TvIcon, Add as AddIcon, Cloud as CloudIcon } from '@mui/icons-material'
import { db, type Season } from '@/lib/db'
import { getActiveSeasonId, setActiveSeasonId } from '@/services/seasonService'
import {
  type SeasonCatalogEntry,
  fetchSeasonCatalog,
  activateCatalogEntry,
  createAndActivateEmptySeason
} from '@/services/seasonCatalogService'

export interface SeasonPickerDialogProps {
  open: boolean
  onClose: () => void
  /** Nach Wechsel / neuer Staffel – Daten neu laden */
  onApplied: () => void
}

const SeasonPickerDialog: React.FC<SeasonPickerDialogProps> = ({ open, onClose, onApplied }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localSeasons, setLocalSeasons] = useState<Season[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<SeasonCatalogEntry[]>([])

  const refreshLocal = useCallback(async () => {
    const [rows, aid] = await Promise.all([db.seasons.orderBy('id').toArray(), getActiveSeasonId()])
    setLocalSeasons(rows)
    setActiveId(aid)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setError(null)
      setLoading(true)
      try {
        await refreshLocal()
        const cat = await fetchSeasonCatalog()
        if (!cancelled) {
          setCatalog(cat?.entries ?? [])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, refreshLocal])

  const handleActivateLocal = async (seasonId: number) => {
    if (seasonId === activeId) {
      onClose()
      return
    }
    setLoading(true)
    setError(null)
    try {
      await setActiveSeasonId(seasonId)
      setActiveId(seasonId)
      onApplied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wechsel fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleCatalogEntry = async (entry: SeasonCatalogEntry) => {
    setLoading(true)
    setError(null)
    try {
      await activateCatalogEntry(entry)
      await refreshLocal()
      setActiveId(await getActiveSeasonId())
      onApplied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Katalog-Staffel konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const handleNewSeason = async () => {
    setLoading(true)
    setError(null)
    try {
      await createAndActivateEmptySeason()
      await refreshLocal()
      setActiveId(await getActiveSeasonId())
      onApplied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Neue Staffel fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Staffel wählen</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Du arbeitest immer in einer Staffel lokal im Browser. Abgeschlossene Katalog-Staffeln sind nur zur
          Ansicht; laufende oder eigene Staffeln kannst du bearbeiten.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && !localSeasons.length && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Lokal gespeichert
        </Typography>
        <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
          {localSeasons.length === 0 && !loading && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Keine Staffel gefunden.
              </Typography>
            </Box>
          )}
          {localSeasons.map(s => (
            <ListItemButton
              key={s.id}
              selected={s.id === activeId}
              onClick={() => s.id != null && handleActivateLocal(s.id)}
              disabled={loading}
            >
              <ListItemText
                primary={s.title}
                secondary={s.slug}
                primaryTypographyProps={{ fontWeight: s.id === activeId ? 600 : 400 }}
              />
              {s.readOnly && (
                <Chip icon={<LockIcon sx={{ fontSize: '1rem !important' }} />} label="Nur Lesen" size="small" sx={{ ml: 1 }} />
              )}
              {s.id === activeId && (
                <Chip label="Aktiv" color="primary" size="small" sx={{ ml: 1 }} />
              )}
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          <CloudIcon sx={{ fontSize: '1rem', verticalAlign: 'text-bottom', mr: 0.5 }} />
          Vom Server (seasons.json)
        </Typography>
        {catalog.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Kein Katalog unter /seasons.json – nur lokale Staffeln möglich.
          </Typography>
        )}
        {catalog.length > 0 && (
          <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            {catalog.map(entry => (
              <ListItemButton key={entry.id} onClick={() => handleCatalogEntry(entry)} disabled={loading}>
                <ListItemText
                  primary={entry.title}
                  secondary={entry.description || entry.id}
                  primaryTypographyProps={{ display: 'flex', alignItems: 'center', gap: 1 }}
                />
                {entry.readOnly ? (
                  <Chip icon={<LockIcon sx={{ fontSize: '1rem !important' }} />} label="Abgeschlossen" size="small" />
                ) : (
                  <Chip icon={<TvIcon sx={{ fontSize: '1rem !important' }} />} label="Start" size="small" color="secondary" variant="outlined" />
                )}
              </ListItemButton>
            ))}
          </List>
        )}

        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleNewSeason}
          disabled={loading}
          sx={{ mt: 1 }}
        >
          Neue leere Staffel anlegen
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SeasonPickerDialog
