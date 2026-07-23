import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import { EmojiEvents as TrophyIcon } from '@mui/icons-material'
import type { SeasonFinaleResult } from '@/utils/seasonFinale'

const fmt = (n: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export interface SeasonFinaleDialogProps {
  open: boolean
  onClose: () => void
  result: SeasonFinaleResult | null
  /** z. B. nach Speichern vs. manuell geöffnet */
  subtitle?: string
}

const SeasonFinaleDialog: React.FC<SeasonFinaleDialogProps> = ({
  open,
  onClose,
  result,
  subtitle = '10. Matching Night gespeichert'
}) => {
  if (!result) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.72)' } }
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
        <TrophyIcon color="warning" fontSize="large" />
        <Box>
          <Typography variant="h5" component="span" fontWeight={700}>
            Staffelende
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {result.kind === 'all-lights-jackpot' ? (
          <Box>
            <Typography variant="body1" paragraph sx={{ fontWeight: 600 }}>
              Alle zehn Lichter sind angegangen – die Gesamtsumme geht an alle Teilnehmer*innen.
            </Typography>
            <Typography variant="h6" color="primary.main" gutterBottom>
              Gesamtsumme: {fmt(result.totalPoolEuro)} €
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Aufgeteilt auf {result.activeParticipantNames.length} aktive Teilnehmer*innen: je{' '}
              <strong>{fmt(result.perParticipantEuro)} €</strong>
            </Typography>
            {result.activeParticipantNames.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Teilnehmer*innen
                </Typography>
                <List dense disablePadding>
                  {result.activeParticipantNames.map(name => (
                    <ListItem key={name} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText primary={name} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" paragraph>
              Die Sieger*innen sind diejenigen, die verkauft haben. Hier sind nur{' '}
              <strong>Abzüge vom Gesamtpool</strong> (negative Beträge) aufgeführt.{' '}
              <strong>Bonus-Einnahmen</strong> (positive Beträge zum Pool) erscheinen in dieser Ansicht nicht.
            </Typography>
            {result.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine Abzüge mit Verkäufer*innen-Namen erfasst – oder es liegen nur Bonus-Verkäufe (Plus-Beträge)
                vor, die hier nicht gelistet werden.
              </Typography>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Verkäufer*innen & Abzüge
                </Typography>
                <List dense disablePadding>
                  {result.rows.map((row, i) => (
                    <React.Fragment key={`${row.sellerLabel}-${row.reference ?? ''}-${i}`}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem alignItems="flex-start" disableGutters sx={{ py: 1 }}>
                        <ListItemText
                          primary={row.sellerLabel}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary" display="block">
                                Abzug vom Gesamtpool: {fmt(Math.abs(row.amountEuro))} €
                              </Typography>
                              {row.reference && (
                                <Typography component="span" variant="caption" color="text.secondary" display="block">
                                  {row.reference}
                                </Typography>
                              )}
                            </>
                          }
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Gewinnsumme der Sieger*innen: {' '}
                  <strong>{fmt(result.totalDeductionsEuro)} €</strong>
                </Typography>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="contained" size="large" fullWidth>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SeasonFinaleDialog
