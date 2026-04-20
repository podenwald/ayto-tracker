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
  Alert,
  CircularProgress,
  Box,
  Chip
} from '@mui/material'
import {
  Lock as LockIcon
} from '@mui/icons-material'
import { db, type Season } from '@/lib/db'
import { getActiveSeasonId, setActiveSeasonId } from '@/services/seasonService'
import {
  type SeasonCatalogEntry,
  fetchSeasonCatalog,
  activateCatalogEntry
} from '@/services/seasonCatalogService'

export interface SeasonPickerDialogProps {
  open: boolean
  onClose: () => void
  /** Nach Wechsel / neuer Staffel – Daten neu laden */
  onApplied: () => void
}

/** „Meine Staffel“ (slug legacy) nur im Vite-Dev-Server anzeigen, nicht in Production-Builds. */
const SHOW_LEGACY_SEASON_IN_PICKER = import.meta.env.DEV

const SeasonPickerDialog: React.FC<SeasonPickerDialogProps> = ({ open, onClose, onApplied }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localSeasons, setLocalSeasons] = useState<Season[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<SeasonCatalogEntry[]>([])
  const activeLocalSeason = localSeasons.find(s => s.id === activeId) ?? null

  type UnifiedSeasonItem = {
    key: string
    title: string
    subtitle: string
    readOnly: boolean
    localSeason?: Season
    catalogEntry?: SeasonCatalogEntry
    isActive: boolean
  }

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

  const handleActivateUnifiedSeason = async (item: UnifiedSeasonItem) => {
    setLoading(true)
    setError(null)
    try {
      if (item.localSeason?.id != null) {
        if (item.localSeason.id !== activeId) {
          await setActiveSeasonId(item.localSeason.id)
        }
      } else if (item.catalogEntry) {
        await activateCatalogEntry(item.catalogEntry)
      }

      await refreshLocal()
      setActiveId(await getActiveSeasonId())
      onApplied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Staffelwechsel fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const unifiedSeasons: UnifiedSeasonItem[] = (() => {
    const bySlug = new Map<string, UnifiedSeasonItem>()

    for (const s of localSeasons) {
      if (s.slug === 'legacy' && !SHOW_LEGACY_SEASON_IN_PICKER) {
        continue
      }
      bySlug.set(s.slug, {
        key: `local-${s.id ?? s.slug}`,
        title: s.title,
        subtitle: s.slug,
        readOnly: s.readOnly === true,
        localSeason: s,
        isActive: s.id === activeId
      })
    }

    for (const entry of catalog) {
      const existing = bySlug.get(entry.id)
      if (existing) {
        bySlug.set(entry.id, {
          ...existing,
          catalogEntry: entry,
          subtitle: entry.description || existing.subtitle,
          isActive: existing.localSeason?.id === activeId
        })
      } else {
        bySlug.set(entry.id, {
          key: `catalog-${entry.id}`,
          title: entry.title,
          subtitle: entry.description || entry.id,
          readOnly: entry.readOnly === true,
          catalogEntry: entry,
          isActive: activeLocalSeason?.slug === entry.id
        })
      }
    }

    return Array.from(bySlug.values())
  })()

  return (
    <>
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Staffel wählen</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Wähle einfach die Staffel aus, mit der du arbeiten möchtest.
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
          Staffeln
        </Typography>
        <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
          {unifiedSeasons.length === 0 && !loading && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Keine Staffel gefunden.
              </Typography>
            </Box>
          )}
          {unifiedSeasons.map(item => (
            <ListItem
              key={item.key}
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.5 }}>
                  {item.readOnly && (
                    <Chip
                      icon={<LockIcon sx={{ fontSize: '1rem !important' }} />}
                      label="Nur Lesen"
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  )}
                  {item.isActive && (
                    <Chip label="Aktiv" color="primary" size="small" sx={{ flexShrink: 0 }} />
                  )}
                </Box>
              }
            >
              <ListItemButton
                selected={item.isActive}
                onClick={() => void handleActivateUnifiedSeason(item)}
                disabled={loading}
              >
                <ListItemText
                  primary={item.title}
                  secondary={item.subtitle}
                  primaryTypographyProps={{ fontWeight: item.isActive ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}

export default SeasonPickerDialog
