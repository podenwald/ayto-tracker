import React, { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
  Box,
  Chip,
  TextField,
  Stack
} from '@mui/material'
import {
  Lock as LockIcon,
  Tv as TvIcon,
  Add as AddIcon,
  Cloud as CloudIcon,
  DeleteOutline as DeleteOutlineIcon,
  EditOutlined as EditOutlinedIcon
} from '@mui/icons-material'
import { db, type Season } from '@/lib/db'
import { deleteSeasonCompletely, getActiveSeasonId, setActiveSeasonId, updateSeasonTitle } from '@/services/seasonService'
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
  const [newSeasonTitle, setNewSeasonTitle] = useState('')
  /** Staffel, die gerade umbenannt wird (zweiter Dialog) */
  const [renameTarget, setRenameTarget] = useState<Season | null>(null)
  const [renameTitleDraft, setRenameTitleDraft] = useState('')

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

  useEffect(() => {
    if (open) setNewSeasonTitle('')
  }, [open])

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

  const handleOpenRename = (s: Season, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (s.readOnly || s.id == null) return
    setRenameTarget(s)
    setRenameTitleDraft(s.title)
  }

  const handleSaveRename = async () => {
    if (renameTarget?.id == null) return
    const t = renameTitleDraft.trim()
    if (!t) {
      setError('Bitte einen Namen eingeben.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await updateSeasonTitle(renameTarget.id, t)
      setRenameTarget(null)
      await refreshLocal()
      onApplied()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Umbenennen fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSeason = async (s: Season, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (s.id == null || localSeasons.length <= 1) return
    const ok = window.confirm(
      `Staffel „${s.title}“ samt allen zugehörigen Daten unwiderruflich löschen?\n\nDies betrifft nur dieses Gerät / diesen Browser.`
    )
    if (!ok) return
    setLoading(true)
    setError(null)
    try {
      await deleteSeasonCompletely(s.id)
      await refreshLocal()
      setActiveId(await getActiveSeasonId())
      onApplied()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleNewSeason = async () => {
    const title = newSeasonTitle.trim()
    if (!title) {
      setError('Bitte einen Namen für die neue Staffel eingeben.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createAndActivateEmptySeason(title)
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
    <>
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
            <ListItem
              key={s.id}
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.5 }}>
                  <Tooltip
                    title={s.readOnly ? 'Abgeschlossene Staffeln können nicht umbenannt werden' : 'Namen bearbeiten'}
                  >
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Staffel ${s.title} umbenennen`}
                        disabled={loading || s.readOnly === true}
                        onClick={e => handleOpenRename(s, e)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      localSeasons.length <= 1
                        ? 'Mindestens eine Staffel muss erhalten bleiben'
                        : 'Staffel löschen'
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Staffel ${s.title} löschen`}
                        disabled={loading || localSeasons.length <= 1}
                        onClick={e => handleDeleteSeason(s, e)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {s.readOnly && (
                    <Chip
                      icon={<LockIcon sx={{ fontSize: '1rem !important' }} />}
                      label="Nur Lesen"
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  )}
                  {s.id === activeId && (
                    <Chip label="Aktiv" color="primary" size="small" sx={{ flexShrink: 0 }} />
                  )}
                </Box>
              }
            >
              <ListItemButton
                selected={s.id === activeId}
                onClick={() => s.id != null && handleActivateLocal(s.id)}
                disabled={loading}
              >
                <ListItemText
                  primary={s.title}
                  secondary={s.slug}
                  primaryTypographyProps={{ fontWeight: s.id === activeId ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          <CloudIcon sx={{ fontSize: '1rem', verticalAlign: 'text-bottom', mr: 0.5 }} />
          auf dem Server gespeichert
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

        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            label="Name der neuen Staffel"
            value={newSeasonTitle}
            onChange={e => setNewSeasonTitle(e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            placeholder="z. B. AYTO 2027"
            onKeyDown={e => {
              if (e.key === 'Enter' && newSeasonTitle.trim() && !loading) {
                e.preventDefault()
                void handleNewSeason()
              }
            }}
            autoComplete="off"
          />
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleNewSeason}
            disabled={loading || !newSeasonTitle.trim()}
          >
            Neue leere Staffel anlegen
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={renameTarget !== null}
      onClose={() => !loading && setRenameTarget(null)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Staffel umbenennen</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={renameTitleDraft}
          onChange={e => setRenameTitleDraft(e.target.value)}
          disabled={loading}
          onKeyDown={e => {
            if (e.key === 'Enter' && renameTitleDraft.trim() && !loading) {
              e.preventDefault()
              void handleSaveRename()
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRenameTarget(null)} disabled={loading}>
          Abbrechen
        </Button>
        <Button onClick={() => void handleSaveRename()} variant="contained" disabled={loading || !renameTitleDraft.trim()}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}

export default SeasonPickerDialog
